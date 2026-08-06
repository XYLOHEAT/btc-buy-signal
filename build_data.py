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

# ---- extend history past Coin Metrics' end (upstream stalled 2026-05; ADR-011) ----
# Price from Binance daily klines; realized cap from bitcoin-data realized-price
# history; supply/issuance carried forward (same assumption as the client's
# append-today row). Gap closes itself automatically if Coin Metrics resumes.
def daily_closes(start_ms):
    """date -> close. Binance first; Kraken fallback (Binance geo-blocks US runners)."""
    try:
        url = ("https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d"
               f"&startTime={start_ms}&limit=1000")
        return {datetime.datetime.fromtimestamp(k[0] / 1000, datetime.timezone.utc)
                .strftime("%Y-%m-%d"): float(k[4]) for k in json.loads(fetch(url))}
    except Exception:
        url = ("https://api.kraken.com/0/public/OHLC?pair=XBTUSD&interval=1440"
               f"&since={start_ms // 1000}")
        j = json.loads(fetch(url))
        rows = next(iter(j.get("result", {}).values()), [])
        return {datetime.datetime.fromtimestamp(k[0], datetime.timezone.utc)
                .strftime("%Y-%m-%d"): float(k[4]) for k in rows if isinstance(k, list)}

def bd_history(ep):
    try:
        out = {}
        for row in json.loads(fetch(BD + ep, timeout=40)):
            d = row.get("d") or row.get("theDay")
            if not (isinstance(d, str) and DATE_RE.match(d)):
                continue
            v = next((x for k, x in row.items()
                      if k not in ("d", "unixTs", "theDay") and isinstance(x, (int, float))), None)
            if v is not None:
                out[d] = float(v)
        return out
    except Exception:
        return {}

today = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")
try:
    if date and date[-1] < today:
        last = date[-1]
        start_ms = int(datetime.datetime.strptime(last, "%Y-%m-%d")
                       .replace(tzinfo=datetime.timezone.utc).timestamp() * 1000) + 86_400_000
        px = daily_closes(start_ms)
        rp = bd_history("realized-price")
        S = supply[-1]
        iN = next((v for v in reversed(issNtv) if v is not None), 450.0)
        last_rp = None
        for d0 in sorted(px):
            if d0 <= last or d0 >= today:  # today comes from the client's live-price row
                continue
            p = px[d0]
            S = S + iN  # ponytail: linear supply carry (~0.05%/mo error), fine for MVRV-Z
            last_rp = rp.get(d0, last_rp)
            mc = p * S
            date.append(d0); price.append(rnd(p, 2)); mcap.append(rnd(mc, 0))
            mvrv.append(rnd(mc / (last_rp * S), 5) if last_rp else None)
            issUsd.append(rnd(iN * p, 0)); issNtv.append(rnd(iN, 4)); supply.append(rnd(S, 2))
except Exception as e:
    print("history extension skipped:", e)  # degrade to plain Coin Metrics history

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
