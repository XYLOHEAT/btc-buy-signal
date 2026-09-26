# AGENTS.md — btc-buy-signal

Handoff notes for any coding agent (Codex, Claude Code, etc.) working in this repo.
Human-facing overview: [README.md](README.md). Why things are the way they are: [docs/adr.md](docs/adr.md) — **read it before changing architecture**.
Design context (users, personality, anti-references, principles): [PRODUCT.md](PRODUCT.md) — **read it before changing anything visual**.

## What this is

Static, client-side BTC accumulation dashboard. No backend, no build step, no package manager.
Live: https://xyloheat.github.io/btc-buy-signal/ (GitHub Pages serves this repo root on `main`).

**Deploy = `git push` to `main`.** There is no staging. Verify locally first.

## Files

| File | Role |
|---|---|
| `index.html` | Markup + all CSS + CSP meta. No inline JS (CSP forbids it — see ADR-008). |
| `app.js` | UI: i18n strings (`T`), render, charts, heatmap, DCA sim, backtest, theme/lang toggles. |
| `indicators.js` | Pure compute. No DOM. Also loadable in Node (`module.exports`) — that's how you test it. |
| `build_data.py` | Stdlib-only. Builds `data.json`. Run daily by `.github/workflows/data.yml`. |
| `sw.js` | Service worker. Network-first for HTML + data (concurrent requests for one URL share a fetch — Chrome ignores the `data.json` preload under a SW), cache-first for static. |
| `data.json` | Generated. **Never hand-edit** — the daily Action overwrites it. |
| `fonts/` | Self-hosted woff2 subsets of **Anuphan**, the only typeface (Thai + Latin, tabular digits) + its OFL licence. `@font-face` rules sit at the top of `index.html`'s `<style>` (ADR-012). |
| `docs/adr.md` | 12 decisions with context + consequences. |

## Data flow

```
Coin Metrics CSV ─┐
Kraken/Binance   ─┼─► build_data.py (daily, GitHub Action) ─► data.json ─┐
bitcoin-data.com ─┘                                                      ├─► browser
                                          Binance live price ────────────┘
```

Browser reads `data.json` (CSV fallback) + one live price call. It never calls bitcoin-data.com — that free API allows **10 req/hour per IP** and per-page-load calls exhausted it (ADR-004).

## Local dev

```bash
python3 -m http.server 8777    # fetch() needs http://, not file://
python3 build_data.py          # rebuild data.json (hits live APIs)
```

Service worker caches aggressively. When a change doesn't appear, unregister it in DevTools → Application → Service Workers, or bump `CACHE` in `sw.js`.

## Testing

`indicators.js` runs in Node, so compute changes get a real check:

```bash
node -e '
const fs=require("fs"), I=require("./indicators.js");
const j=JSON.parse(fs.readFileSync("data.json","utf8"));
const fix=a=>a.map(v=>v===null?NaN:v);
const RAW={date:j.date,price:fix(j.price),mcap:fix(j.mcap),mvrv:fix(j.mvrv),
           issUsd:fix(j.issUsd),issNtv:fix(j.issNtv),supply:fix(j.supply)};
const c=I.computeAll(RAW), sc=I.scoreSeries(c);
console.log("last:", c.date.at(-1), "score:", sc.at(-1).toFixed(1));
console.log(I.snapshot(c).label);
'
```

Always run this after touching `indicators.js`. Compare the score before and after — a silent change there is invisible in the UI but wrong everywhere.

## Common edits

**Change an index's thresholds or weight** → `indicators.js`, the `INDICES` array (~line 152). Each entry has `weight`, `score(v)`, `status(v)`, `bands`. Changing a weight changes the headline score, the backtest, and the DCA sim — re-run the Node check and sanity-check the new score.

**Add a new index** → add a compute column in `computeAll()`, then an `INDICES` entry, then TH+EN strings in `app.js` `T` (`status`, `metric`, `read`). The UI loops over `INDICES`, so cards, tooltips and chart tabs appear automatically.

**Edit any visible text** → `app.js`, the `T` object (line 6). Zone names are one vocabulary (`T.*.zone`, ADR-014): valuation words, never stance words; actions go in `T.*.dca`/`act`. No em dashes in copy. `T.th` and `T.en` are parallel; **add to both or the other language silently breaks**. Static labels are wired in `applyStaticLang()` (line 166); dynamic ones inside `render()` (line 189).

**Add a new data metric from bitcoin-data.com** → `build_data.py`, add a `bd_last("<endpoint>")` call into the `fresh` dict, then read `FRESH.<key>` in `app.js`. Keep the Action's total bitcoin-data calls in single digits.

**Styling** → `index.html` `<style>`. CSS variables at `:root`; dark mode overrides under `.dk` and the `prefers-color-scheme` block. Desktop two-column layout lives in the `@media (min-width:960px)` block. Type is one family (Anuphan) on a fixed rem scale: `--text-caption` 13px (the floor; Thai marks need it), `--text-ui` 14, `--text-body` 16, `--text-subhead` 20, `--text-title` 24, `--text-display` 60. No new sizes, no uppercase text-transform, no letter-spacing on anything that can contain Thai (ADR-013). Text colors must stay **≥ 4.5:1** against `--bg` and `--surface` in both themes (`--faint` is the floor; use `--btc-text`, not `--btc`, for small orange text). Chart colors are hard-coded hex in `app.js` (`ZHEX`, `drawChart` ticks) — keep them in sync with the CSS variables.

**Section anchors in `app.js`**: `getRaw` 124 · `applyStaticLang` 166 · `render` 189 · `renderDca` 244 · `renderCycle` 257 · `renderHeatmap` 267 · `renderBacktest` 295 · `drawChart` 328.

## Hard constraints — do not break these

1. **No inline `<script>` and no `onclick=` attributes.** CSP is `script-src 'self' https://cdn.jsdelivr.net`. Attach handlers as `.onclick = fn` in `app.js`. Inline script silently fails to execute.
2. **Escape anything from data into `innerHTML`.** Use the existing `esc()` in `app.js`. Dates are validated ISO-only in `build_data.py` as the first layer.
3. **Pin GitHub Actions to a commit SHA**, never a tag. Get one with `gh api repos/<owner>/<repo>/commits/<tag> --jq .sha`.
4. **Bump the CDN's SRI hash** if you change the Chart.js version: `curl -s <url> | openssl dgst -sha384 -binary | openssl base64 -A`.
5. **Non-commercial only.** Coin Metrics data is CC BY-NC 4.0 — no ads, no paid tier, no donations (ADR-005).
6. **No new runtime dependencies** without a reason that survives ADR-002. Chart.js from CDN is the only one.
7. **No third-party fonts or stylesheets.** Fonts are self-hosted in `fonts/` and CSP is `font-src 'self'`. Re-adding Google Fonts brings back ~0.8 s of render-blocking and sends every visitor's IP to Google (ADR-012).

## Workflows

- `.github/workflows/data.yml` — daily `data.json` rebuild + a keepalive step that re-enables both cron workflows (GitHub disables schedules after 60 days without a *human* commit; bot commits don't count — ADR-011).
- `.github/workflows/codeql.yml` — CodeQL on push/PR/weekly. Keep it at zero alerts.

Trigger manually: `gh workflow run data.yml`.

## Gotchas

- **`data.json` merge conflicts** are routine — the Action commits it daily. After a local rebuild: `git checkout --ours data.json && git add data.json` during a rebase.
- **Binance returns HTTP 451 on GitHub runners** (US geo-block). `build_data.py` falls back to Kraken OHLC. Locally Binance works, so a build that passes on your machine can still fail in CI — check the Action run.
- **Coin Metrics history can silently stall** (it froze for 2.5 months in 2026). `build_data.py` extends past its end automatically; if months go missing on the heatmap, check `data.json`'s last `date` first. Filled days use the **90-day mean** daily issuance — never a single day's value (one day can be ±15% off with block luck; the last Coin Metrics day was 512.5 BTC vs ~447 avg and inflated Puell ~9%).
- **Cross-checking against bitcoin-data.com**: their recent values are labelled one day later than Coin Metrics' (their day D ≈ our D−1). Align by a day before comparing, or a big price day looks like a formula bug.
- Service worker caching is the usual reason a change "didn't deploy".
- **bitcoin-data.com's free tier is delayed 7 days** (since 2026-09; responses carry `"delayed": true`). An on-chain date 7–8 days old is normal; the ⚠ stale badge only shows past 10 days. Because of that delay, `fresh.mvrv`/`fresh.puell` are **not** applied to the score — today's values come from our own series at the live price. `fresh.date` drives the on-chain date line; `fresh.realizedPrice` drives the realized price and NUPL (computed as 1 − realized / live price).
- **Keep Chart.js `animation:false`.** Per-point animations made every draw ~15× slower (47 ms → 3 ms on a Mac, roughly 4× worse on a phone) — that was most of Lighthouse's Total Blocking Time, and it hit every chart-tab click too.
- **Chart.js is `defer`red** (`<script id="chartjs">`); `drawChart()` waits for that tag's `load` event, so a CDN failure leaves the page working, just without the chart. `indicators.js`/`app.js` stay plain scripts at the end of `<body>` so the saved theme applies as early as possible — deferring them adds a wrong-theme flash for users with a manual theme.
- **Lighthouse**: run it in an Incognito window. Extensions inject scripts that show up as unused JS, long tasks and console errors that aren't ours. GitHub Pages' 10-minute cache headers can't be changed — the service worker covers repeat visits.
