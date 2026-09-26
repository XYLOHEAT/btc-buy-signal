#!/usr/bin/env python3
"""Build slim data.json for the BTC Accumulation dashboard.

Run daily by GitHub Actions. Pure stdlib (no pip install needed).
- RAW on-chain history from Coin Metrics community CSV, written as data.json v2: only what the
  client can't derive (price, MVRV, daily issuance; dates, supply, market cap and USD issuance are
  rebuilt by indicators.js fromJSON). ADR-019.
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
date, price, mvrv, issNtv, supply = [], [], [], [], []  # full precision; rounded once, at write
for row in rows:
    t = (row.get("time") or "").strip()
    p, mc = num(row.get("PriceUSD")), num(row.get("CapMrktCurUSD"))
    if p is None or mc is None or not DATE_RE.match(t):
        continue
    date.append(t); price.append(p)
    mvrv.append(num(row.get("CapMVRVCur")))
    issNtv.append(num(row.get("IssTotNtv")))
    supply.append(num(row.get("SplyCur")))

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
        # daily issuance for filled days = 90-day mean of real days. A single day swings ±15% with
        # block luck: the last Coin Metrics day alone (512.5 vs ~447 avg) inflated Puell ~9%.
        recent = [v for v in issNtv[-90:] if v is not None]
        iN = sum(recent) / len(recent) if recent else 450.0
        last_rp = None
        for d0 in sorted(px):
            if d0 <= last or d0 >= today:  # today comes from the client's live-price row
                continue
            p = px[d0]
            S = S + iN  # ponytail: linear supply carry (~0.05%/mo error), fine for MVRV-Z
            last_rp = rp.get(d0, last_rp)
            date.append(d0); price.append(p)
            mvrv.append(p / last_rp if last_rp else None)  # market cap / realized cap, both x supply
            issNtv.append(iN); supply.append(S)
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

# ---- write v2: only what the client can't derive (ADR-019) ----
def j_num(v):  # integral values as ints: "86197", not "86197.0"
    return None if v is None else (int(v) if float(v).is_integer() else v)

def sig(v, n=5):
    return None if v is None else float(f"{v:.{n}g}")

def px_out(v):  # 5 significant digits (relative error <= 5e-5); whole dollars from $10,000
    return None if v is None else (round(v) if v >= 10000 else sig(v))

days = [datetime.date.fromisoformat(d) for d in date]
consecutive = all((b - a).days == 1 for a, b in zip(days, days[1:]))
out = {"v": 2,
       "generated": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%MZ"),
       **({"start": date[0]} if consecutive else {"date": date}),  # a gap keeps explicit dates
       "price": [j_num(px_out(v)) for v in price],
       "mvrv": [j_num(sig(v)) for v in mvrv],  # 5 significant digits: MVRV-Z moves < 1e-4
       "issNtv": [j_num(rnd(v, 3)) for v in issNtv],  # exact: block rewards are multiples of 1/8 BTC
       "supply0": j_num(rnd(supply[0], 2)),
       "fresh": fresh}

with open("data.json", "w") as f:
    json.dump(out, f, separators=(",", ":"))
print("rows:", len(date), "| fresh:", fresh, "| bytes:",
      len(json.dumps(out, separators=(",", ":"))))
