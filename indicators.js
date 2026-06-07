/* BTC valuation indicators — client-side port of indicators.py.
   Pure functions; works in the browser and in Node (for tests).
   Data source: Coin Metrics community CSV. Live price: Binance (UI layer). */

const GENESIS_MS = Date.parse("2009-01-03T00:00:00Z");
const DAY = 86400000;

const SRC_COLS = [
  "time", "PriceUSD", "CapMrktCurUSD", "CapMVRVCur",
  "IssTotUSD", "IssTotNtv", "SplyCur",
];

/* ---------- parsing ---------- */
function parseCSV(text) {
  const lines = text.split("\n");
  const header = lines[0].split(",");
  const ix = {};
  for (const c of SRC_COLS) ix[c] = header.indexOf(c);

  const d = { date: [], price: [], mcap: [], mvrv: [], issUsd: [], issNtv: [], supply: [] };
  const num = (s) => { const v = parseFloat(s); return Number.isFinite(v) ? v : NaN; };

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    if (!row) continue;
    const f = row.split(",");
    const price = num(f[ix.PriceUSD]);
    const mcap = num(f[ix.CapMrktCurUSD]);
    if (!Number.isFinite(price) || !Number.isFinite(mcap)) continue; // need price+mcap
    d.date.push(f[ix.time]);
    d.price.push(price);
    d.mcap.push(mcap);
    d.mvrv.push(num(f[ix.CapMVRVCur]));
    d.issUsd.push(num(f[ix.IssTotUSD]));
    d.issNtv.push(num(f[ix.IssTotNtv]));
    d.supply.push(num(f[ix.SplyCur]));
  }
  return d;
}

/* Append a synthetic 'today' row from a live price (mirrors indicators.append_today).
   On-chain quantities are carried from the last fully-populated row. */
function appendToday(d, price, today) {
  const out = {};
  for (const k of Object.keys(d)) out[k] = d[k].slice();
  // last row with full on-chain data for carry-forward
  let k = out.date.length - 1;
  while (k >= 0 && !(Number.isFinite(out.supply[k]) && Number.isFinite(out.mvrv[k]) && Number.isFinite(out.issNtv[k]))) k--;
  if (k < 0) return out;

  const realizedCap = out.mcap[k] / out.mvrv[k];
  const supply = out.supply[k];
  const issNtv = out.issNtv[k];
  const mcap = price * supply;
  const date = today || new Date().toISOString().slice(0, 10);

  out.date.push(date);
  out.price.push(price);
  out.mcap.push(mcap);
  out.mvrv.push(mcap / realizedCap);
  out.issUsd.push(issNtv * price);
  out.issNtv.push(issNtv);
  out.supply.push(supply);
  return out;
}

/* ---------- rolling helpers (match pandas: full window of finite values) ---------- */
function sma(arr, win) {
  const n = arr.length, out = new Array(n).fill(NaN);
  let sum = 0, finite = 0;
  for (let i = 0; i < n; i++) {
    const v = arr[i];
    if (Number.isFinite(v)) { sum += v; finite++; }
    if (i >= win) { const old = arr[i - win]; if (Number.isFinite(old)) { sum -= old; finite--; } }
    if (i >= win - 1 && finite === win) out[i] = sum / win;
  }
  return out;
}

// expanding sample std (ddof=1), Welford — matches pandas expanding(min_periods=2).std()
function expandingStd(arr) {
  const n = arr.length, out = new Array(n).fill(NaN);
  let count = 0, mean = 0, M2 = 0;
  for (let i = 0; i < n; i++) {
    const v = arr[i];
    if (Number.isFinite(v)) {
      count++; const delta = v - mean; mean += delta / count; M2 += delta * (v - mean);
    }
    if (count >= 2) out[i] = Math.sqrt(M2 / (count - 1));
  }
  return out;
}

/* ---------- compute all indicator series ---------- */
function computeAll(d) {
  const n = d.price.length;
  const price = d.price;
  const c = { date: d.date, price };

  c.ma200 = sma(price, 200);
  c.ma111 = sma(price, 111);
  c.ma350x2 = sma(price, 350).map((v) => v * 2);
  c.ma200w = sma(price, 1400);

  c.mayer = price.map((p, i) => p / c.ma200[i]);
  c.wma_mult = price.map((p, i) => p / c.ma200w[i]);
  c.pi_ratio = c.ma111.map((v, i) => v / c.ma350x2[i]);

  const realized = d.mcap.map((m, i) => m / d.mvrv[i]);
  const std = expandingStd(d.mcap);
  c.mvrv_z = d.mcap.map((m, i) => (m - realized[i]) / std[i]);

  c.puell = (() => { const ma = sma(d.issUsd, 365); return d.issUsd.map((v, i) => v / ma[i]); })();

  const logSma = sma(price.map(Math.log), 200);
  c.ahr999 = price.map((p, i) => {
    const dca = Math.exp(logSma[i]);
    const age = (Date.parse(d.date[i] + "T00:00:00Z") - GENESIS_MS) / DAY;
    const fitted = Math.pow(10, 5.84 * Math.log10(age) - 17.01);
    return (p / dca) * (p / fitted);
  });
  return c;
}

/* ---------- scoring (identical thresholds to indicators.py) ---------- */
const clamp = (x, lo, hi) => Math.min(Math.max(x, lo), hi);
function lin(x, lo, hi, slo, shi) {
  if (hi === lo) return slo;
  return slo + clamp((x - lo) / (hi - lo), 0, 1) * (shi - slo);
}
const scoreAhr = (a) => a <= 0.45 ? 100 : a <= 1.2 ? lin(a, 0.45, 1.2, 100, 50) : a <= 4 ? lin(a, 1.2, 4, 50, 0) : 0;
const scoreMvrvZ = (z) => lin(z, 0, 7, 100, 0);
const scoreMayer = (m) => m <= 0.8 ? 100 : lin(m, 0.8, 2.4, 100, 0);
const scoreWma = (x) => x <= 1 ? 100 : lin(x, 1, 3, 100, 0);
const scorePuell = (p) => p <= 0.5 ? 100 : lin(p, 0.5, 4, 100, 0);
const scorePi = (r) => lin(r, 0.6, 1.0, 100, 0);

const ZONES = [
  [75, "STRONG BUY", "ซื้อแรง", "#34d399"],
  [55, "ACCUMULATE", "ทยอยสะสม / DCA", "#a3e635"],
  [40, "NEUTRAL", "เป็นกลาง", "#fbbf24"],
  [25, "CAUTION", "ระวัง", "#fb923c"],
  [0, "EXPENSIVE", "แพง / โซนขาย", "#f87171"],
];
function zoneOf(score) {
  for (const z of ZONES) if (score >= z[0]) return { label: z[1], th: z[2], color: z[3] };
  return { label: ZONES[ZONES.length - 1][1], th: "", color: "#f87171" };
}

/* ---------- declarative registry (single source of truth) ---------- */
const f2 = (v) => v.toFixed(2);
const INDICES = [
  { key: "ahr999", title: "Ahr999", tier: "S", weight: 2, color: "#c084fc",
    fmt: (v) => v.toFixed(3), score: scoreAhr,
    status: (v) => v < 0.45 ? "ถูกมาก" : v <= 1.2 ? "DCA zone" : "แพง",
    rule: "<0.45 ซื้อ · 0.45–1.2 DCA · >1.2 แพง",
    bands: [{ y: 0.45, color: "#34d399", label: "0.45" }, { y: 1.2, color: "#f87171", label: "1.2" }] },
  { key: "mvrv_z", title: "MVRV Z-Score", tier: "S", weight: 2, color: "#22d3ee",
    fmt: f2, score: scoreMvrvZ,
    status: (v) => v < 0.1 ? "bottom" : v < 5 ? "กลาง" : "top zone",
    rule: "<0 bottom · >7 top",
    bands: [{ y: 0.1, color: "#34d399", label: "bottom" }, { y: 7, color: "#f87171", label: "top" }] },
  { key: "wma_mult", title: "200W MA Heatmap", tier: "S", weight: 2, color: "#60a5fa",
    fmt: (v) => v.toFixed(2) + "×", score: scoreWma,
    status: (v) => v <= 1.05 ? "แตะ 200WMA!" : v < 3 ? "ปกติ" : "ร้อน",
    rule: "≈1 = แตะ 200WMA (cycle bottom)",
    bands: [{ y: 1, color: "#34d399", label: "200WMA" }] },
  { key: "pi_ratio", title: "Pi Cycle Top", tier: "A", weight: 1, color: "#fbbf24",
    fmt: f2, score: scorePi,
    status: (v) => v < 0.7 ? "ไกล top" : v >= 0.95 ? "ใกล้ top!" : "กลาง",
    rule: "111DMA ÷ 2×350DMA · ≥1 = top",
    bands: [{ y: 1, color: "#f87171", label: "top trigger" }] },
  { key: "mayer", title: "Mayer Multiple", tier: "A", weight: 1, color: "#34d399",
    fmt: f2, score: scoreMayer,
    status: (v) => v < 1 ? "ถูก" : v < 2.4 ? "ปกติ" : "ร้อน",
    rule: "price ÷ 200DMA · <1 ถูก · >2.4 ร้อน",
    bands: [{ y: 1, color: "#34d399", label: "1.0" }, { y: 2.4, color: "#f87171", label: "2.4" }] },
  { key: "puell", title: "Puell Multiple", tier: "A", weight: 1, color: "#f0abfc",
    fmt: f2, score: scorePuell,
    status: (v) => v < 0.5 ? "miner bottom" : v < 4 ? "ปกติ" : "top",
    rule: "<0.5 bottom · >4 top",
    bands: [{ y: 0.5, color: "#34d399", label: "0.5" }, { y: 4, color: "#f87171", label: "4" }] },
];

function snapshot(c) {
  const keys = INDICES.map((s) => s.key);
  let i = c.price.length - 1;
  while (i >= 0 && !keys.every((k) => Number.isFinite(c[k][i]))) i--;
  const values = {}, scores = {};
  for (const s of INDICES) { values[s.key] = c[s.key][i]; scores[s.key] = s.score(values[s.key]); }
  const totalW = INDICES.reduce((a, s) => a + s.weight, 0);
  const overall = INDICES.reduce((a, s) => a + scores[s.key] * s.weight, 0) / totalW;
  return { idx: i, date: c.date[i], price: c.price[i], values, scores, overall, ...zoneOf(overall) };
}

/* overall weighted buy-score for every day (NaN until all indices available) */
function scoreSeries(c) {
  const keys = INDICES.map((s) => s.key), tw = INDICES.reduce((a, s) => a + s.weight, 0);
  const out = new Array(c.price.length).fill(NaN);
  for (let i = 0; i < c.price.length; i++)
    if (keys.every((k) => Number.isFinite(c[k][i])))
      out[i] = INDICES.reduce((a, s) => a + s.score(c[s.key][i]) * s.weight, 0) / tw;
  return out;
}

const BT_BANDS = [[75, "STRONG BUY"], [55, "ACCUMULATE"], [40, "NEUTRAL"], [25, "CAUTION"], [0, "EXPENSIVE"]];

/* forward-return backtest: for each past day bucket by score zone, measure price
   change `horizon` days later. Returns per-zone {n, median, win%}. */
function backtest(c, scores, horizon) {
  const agg = {}; BT_BANDS.forEach((b) => (agg[b[1]] = []));
  const N = c.price.length;
  for (let i = 0; i < N - horizon; i++) {
    const s = scores[i];
    if (!Number.isFinite(s)) continue;
    const p0 = c.price[i], p1 = c.price[i + horizon];
    if (!(p0 > 0) || !(p1 > 0)) continue;
    agg[BT_BANDS.find((b) => s >= b[0])[1]].push(p1 / p0 - 1);
  }
  return BT_BANDS.map((b) => {
    const r = agg[b[1]].sort((x, y) => x - y), n = r.length;
    return { zone: b[1], n, median: n ? r[Math.floor(n / 2)] : NaN, win: n ? r.filter((x) => x > 0).length / n : NaN };
  });
}

const Indicators = { parseCSV, appendToday, computeAll, snapshot, scoreSeries, backtest, INDICES, zoneOf, sma };
if (typeof module !== "undefined" && module.exports) module.exports = Indicators;
if (typeof window !== "undefined") window.Indicators = Indicators;
