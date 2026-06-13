#!/usr/bin/env python3
"""Build slim data.json for the BTC Accumulation dashboard.

Run daily by GitHub Actions. Pure stdlib (no pip install needed).
- RAW on-chain history from Coin Metrics community CSV (7 fields, rounded).
- Fresh current metrics from bitcoin-data.com (MVRV-Z, Puell, NUPL, realized price)
  fetched ONCE per run (well under the 10 req/hour free limit; the web no longer
  hits bitcoin-data per page load, which is what blew the limit).
"""
import csv, io, json, re, urllib.request, datetime

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")  # only ISO dates reach the client (anti-XSS)

CSV_URL = "https://raw.githubusercontent.com/coinmetrics/data/master/csv/btc.csv"
BD = "https://bitcoin-data.com/v1/"

def fetch(url, timeout=40):
    req = urllib.request.Request(url, headers={"User-Agent": "btc-accum-build"})
    return urllib.request.urlopen(req, timeout=timeout).read().decode()

def rnd(v, nd):
    return None if v is None else round(v, nd)

def num(s):
    try:
        return float(s)
    except (TypeError, ValueError):
        return None

# ---- RAW history ----
rows = list(csv.DictReader(io.StringIO(fetch(CSV_URL))))
date, price, mcap, mvrv, issUsd, issNtv, supply = [], [], [], [], [], [], []
for row in rows:
    t = (row.get("time") or "").strip()
    p, mc = num(row.get("PriceUSD")), num(row.get("CapMrktCurUSD"))
    if p is None or mc is None or not DATE_RE.match(t):
        continue
    date.append(t)
    price.append(rnd(p, 2)); mcap.append(rnd(mc, 0))
    mvrv.append(rnd(num(row.get("CapMVRVCur")), 5))
    issUsd.append(rnd(num(row.get("IssTotUSD")), 0))
    issNtv.append(rnd(num(row.get("IssTotNtv")), 4))
    supply.append(rnd(num(row.get("SplyCur")), 2))

# ---- fresh current metrics (bitcoin-data.com) ----
def bd_last(ep):
    """Return (value, date) generically; tolerant of field-name + rate limits."""
    try:
        j = json.loads(fetch(BD + ep + "/last", timeout=20))
        if not isinstance(j, dict) or "error" in j:
            return None, None
        d = j.get("d") or j.get("theDay")
        if not (isinstance(d, str) and DATE_RE.match(d)):
            d = None  # reject non-ISO dates so nothing odd reaches the client
        val = next((v for k, v in j.items()
                    if k not in ("d", "unixTs", "theDay") and isinstance(v, (int, float))), None)
        return val, d
    except Exception:
        return None, None

mvrvV, d1 = bd_last("mvrv-zscore")
puellV, d2 = bd_last("puell-multiple")
nuplV, d3 = bd_last("nupl")
rpV, d4 = bd_last("realized-price")
fresh = {"date": d1 or d2 or d3 or d4, "mvrv": mvrvV, "puell": puellV,
         "nupl": nuplV, "realizedPrice": rpV}

out = {"generated": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%MZ"),
       "date": date, "price": price, "mcap": mcap, "mvrv": mvrv,
       "issUsd": issUsd, "issNtv": issNtv, "supply": supply, "fresh": fresh}

with open("data.json", "w") as f:
    json.dump(out, f, separators=(",", ":"))
print("rows:", len(date), "| fresh:", fresh, "| bytes:",
      len(json.dumps(out, separators=(",", ":"))))
