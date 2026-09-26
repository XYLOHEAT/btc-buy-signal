# AGENTS.md — btc-buy-signal

Handoff notes for any coding agent (Codex, Claude Code, etc.) working in this repo.
Human-facing overview: [README.md](README.md). Why things are the way they are: [docs/adr.md](docs/adr.md) — **read it before changing architecture**.
Design context (users, personality, anti-references, principles): [PRODUCT.md](PRODUCT.md) — **read it before changing anything visual**.

## What this is

Static, client-side BTC accumulation dashboard. No backend. One build step (ADR-021): `npm run build` compiles the StyleX UI in `src/` into `app.js` and the CSS block in `index.html`; both outputs are committed and served as they are.
Live: https://xyloheat.github.io/btc-buy-signal/ (GitHub Pages serves this repo root on `main`).

**Deploy = `npm run build`, commit, `git push` to `main`.** There is no staging. Verify locally first.

## Files

| File | Role |
|---|---|
| `index.html` | Shell: meta + CSP, `@font-face`, base element CSS, the generated StyleX block `<style id="stylex">` (never hand-edit), the empty `#app` root. No inline JS (CSP forbids it, ADR-008). |
| `src/app.js` | UI source: i18n strings (`T`), the page markup (`shell()`), render, charts, heatmap, DCA sim, backtest, theme/lang toggles. |
| `src/styles.js` | StyleX styles: one `sx.*` role per element, plus `lightTheme` / `darkTheme`. |
| `src/tokens.stylex.js` | Tokens: colors (CSS variables `--bg`, `--ink`, `--z-good` …), type scale, spacing, breakpoints and container queries. |
| `app.js` | **Generated** by `build.mjs`: the minified bundle of `src/` (a classic script, same CSP). Never hand-edit. |
| `build.mjs`, `package.json` | esbuild + `@stylexjs/unplugin` (dev dependencies). `npm run build` / `npm run watch`. |
| `indicators.js` | Pure compute. No DOM. Also loadable in Node (`module.exports`) — that's how you test it. |
| `build_data.py` | Stdlib-only. Builds `data.json`. Run daily by `.github/workflows/data.yml`. |
| `sw.js` | Service worker. Network-first for HTML + data (concurrent requests for one URL share a fetch — Chrome ignores the `data.json` preload under a SW; on a slow network the cached copy answers after 4 s), cache-first for static. The live price (Binance/CoinGecko) bypasses it, so a cached price is never shown as live. |
| `data.json` | Generated. **Never hand-edit** — the daily Action overwrites it. Format v2 (ADR-019): `start`, `price`, `mvrv`, `issNtv`, `supply0`, `fresh`; `Indicators.fromJSON()` rebuilds dates, supply, market cap and USD issuance (it also reads v1 files). |
| `fonts/` | Self-hosted woff2 subsets of **Anuphan**, the only typeface (Thai + Latin, tabular digits) + its OFL licence. `@font-face` rules sit at the top of `index.html`'s base `<style>` (ADR-012). |
| `docs/adr.md` | Every architecture/design decision with context + consequences. |

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
npm ci                         # once: esbuild + StyleX, dev only (just the StyleX runtime, a few KB, ends up in app.js)
npm run watch                  # rebuild app.js + index.html's StyleX block on every change in src/
python3 -m http.server 8777    # fetch() needs http://, not file://
python3 build_data.py          # rebuild data.json (hits live APIs)
```

Service worker caches aggressively, and a rebuilt `app.js` keeps its `?v=`. When a change doesn't appear, unregister the worker in DevTools → Application → Service Workers; before shipping, bump `app.js?v=` in `index.html` and `sw.js` and `CACHE` in `sw.js`.

## Testing

`indicators.js` runs in Node, so compute changes get a real check:

```bash
node -e '
const fs=require("fs"), I=require("./indicators.js");
const RAW=I.fromJSON(JSON.parse(fs.readFileSync("data.json","utf8")));
const c=I.computeAll(RAW), sc=I.scoreSeries(c);
console.log("last:", c.date.at(-1), "score:", sc.at(-1).toFixed(1));
console.log(I.snapshot(c).label);
'
```

Always run this after touching `indicators.js`. Compare the score before and after — a silent change there is invisible in the UI but wrong everywhere.

## Common edits

**Change an index's thresholds or weight** → `indicators.js`, the `INDICES` array (~line 166). Each entry has `weight`, `fmt(v)`, `score(v)` and `bands` (`{y, z: "good"|"bad", label}`: chart and sparkline reference lines, colored by the zone token); its words live in `src/app.js` `T` (`status`, `metric`, `read`). Changing a weight changes the headline score, the backtest, and the DCA sim — re-run the Node check and sanity-check the new score.

**Add a new index** → add a compute column in `computeAll()`, then an `INDICES` entry, then TH+EN strings in `src/app.js` `T` (`status`, `metric`, `read`). The UI loops over `INDICES`, so cards, tooltips and chart tabs appear automatically.

**Edit any visible text** → `src/app.js`, the `T` object (line 12). Zone names are one vocabulary (`T.*.zone`, ADR-014): valuation words, never stance words; actions go in `T.*.dca`/`act`. No em dashes in copy. `T.th` and `T.en` are parallel; **add to both or the other language silently breaks**. Static labels are wired in `applyStaticLang()` (line 209); dynamic ones inside `render()` (line 238). Then `npm run build`.

**Add a new data metric from bitcoin-data.com** → `build_data.py`, add a `bd_last("<endpoint>")` call into the `fresh` dict, then read `FRESH.<key>` in `src/app.js`. Keep the Action's total bitcoin-data calls in single digits.

**Styling** → StyleX (ADR-021), then `npm run build`. `src/tokens.stylex.js`: colors are CSS variables with literal names (`--bg`, `--ink`, `--z-good` …) whose defaults follow the OS theme; a chosen theme puts `lightTheme` / `darkTheme` (`src/styles.js`) on `<html>`. Type is `text.*`, spacing `space.*`, breakpoints and container queries `mq.*`. `src/styles.js` holds one `sx.*` role per element; markup picks roles with `x(sx.a, sx.b)` in `src/app.js`, and static markup lives in `shell()`. State comes from the element itself (`:is([aria-pressed=true])`, `[aria-expanded]`, `[aria-disabled]`, `:empty`, `:lang(en)`) or from `#app[data-phase]` through `:where([data-phase=loading] *)`; there are no descendant selectors. StyleX 0.19 gotchas: multi-value `border*` and `background` shorthands are **silently dropped** (use longhands or the `RULE_TOP` / `SOFT_BOTTOM` / `FRAME` spreads); values must be static (constants and object spreads work, helper functions don't); `stylex.when.*` only compiles when written inline in `create()`, so this repo uses plain `:where()` strings. `index.html`'s base `<style>` keeps only what StyleX can't express: `@font-face` and element defaults (`body`, `button`, `h1`/`h2`, `a`, `[hidden]`, `:focus-visible`). Layout (ADR-018): phone base, one wider column from `@media (min-width:40em)` (tablet, landscape phone), two columns from `@media (min-width:60em)`; breakpoints and layout widths are em/rem so a larger default font gets the narrower layout. Sections adapt to their column with container queries (`cola`, `colb`): verdict ring beside its text at `cola ≥ 36rem`, index rows two-up at `colb ≥ 34rem`, tables stack below `colb 17rem`, heatmap labels quarters below `colb 16rem`. Test at 320, 375, 412, 768, 812×375, 1024, 1280 and at 200% text (`html{font-size:200%}`): nothing may scroll sideways and every button stays ≥ 44px. Type is one family (Anuphan) on a fixed rem scale: `--text-caption` 13px (the floor; Thai marks need it), `--text-ui` 14, `--text-body` 16, `--text-subhead` 20, `--text-title` 24, `--text-display` 60. No new sizes, no uppercase text-transform, no letter-spacing on anything that can contain Thai (ADR-013). Spacing uses the 4pt rem tokens `--space-xs` 4 · `sm` 8 · `md` 12 · `lg` 16 · `xl` 24 · `2xl` 32 · `3xl` 48 · `4xl` 64; no off-scale margins or paddings (px is only for borders, 44px targets and chart heights; the ring is rem so it grows with text). Sections sit 48px apart; data tables share `.tbl`; option rows (range, horizon, DCA start) share one left-aligned style. Text colors must stay **≥ 4.5:1** against `--bg` and `--surface` in both themes (`--faint` is the floor). BTC orange marks selection, focus and the brand ring only: never small text, never badges. Zone colors mark valuation state (ring, zone name, index scores, backtest and similar-period outcomes), never big figures; index status words and the 24h price change stay neutral (ADR-020). Charts and sparklines read the CSS tokens (`tok()` at draw time, `var()` in markup): **no hex colors in `src/app.js`** (palette values live only in `tokens.stylex.js`), and `indicators.js` bands carry a zone key (`z`), not a color.

**Section anchors in `src/app.js`**: `T` 12 · `getRaw` 147 · `load` 160 · `applyStaticLang` 209 · `render` 238 · `skSave` 271 · `renderRows` 276 · `buildOpts` 303 · `renderDca` 316 · `renderCycle` 325 · `renderHeatmap` 336 · `renderBacktest` 361 · `drawChart` 396 · `shell` 429.

## Hard constraints — do not break these

1. **No inline `<script>` and no `onclick=` attributes.** CSP is `script-src 'self' https://cdn.jsdelivr.net`. Attach handlers as `.onclick = fn` in `src/app.js`. Inline script silently fails to execute.
2. **Escape anything from data into `innerHTML`.** Use the existing `esc()` in `src/app.js`. Dates are validated ISO-only in `build_data.py` as the first layer.
3. **Pin GitHub Actions to a commit SHA**, never a tag. Get one with `gh api repos/<owner>/<repo>/commits/<tag> --jq .sha`.
4. **Bump the CDN's SRI hash** if you change the Chart.js version: `curl -s <url> | openssl dgst -sha384 -binary | openssl base64 -A`.
5. **Non-commercial only.** Coin Metrics data is CC BY-NC 4.0 — no ads, no paid tier, no donations (ADR-005).
6. **No new runtime dependencies** without a reason that survives ADR-002. Chart.js from the CDN and the StyleX runtime (a few KB, bundled into `app.js`) are the only ones; esbuild and the StyleX compiler are dev dependencies.
7. **No third-party fonts or stylesheets.** Fonts are self-hosted in `fonts/` and CSP is `font-src 'self'`. Re-adding Google Fonts brings back ~0.8 s of render-blocking and sends every visitor's IP to Google (ADR-012).
8. **Commit the build.** GitHub Pages serves the folder as committed: after any change to `src/`, run `npm run build` and commit `app.js` + `index.html` with it (the Build check workflow fails otherwise). Never edit `app.js` or the `<style id="stylex">` block by hand.

## Workflows

- `.github/workflows/data.yml` — daily `data.json` rebuild + a keepalive step that re-enables both cron workflows (GitHub disables schedules after 60 days without a *human* commit; bot commits don't count — ADR-011).
- `.github/workflows/codeql.yml` — CodeQL on push/PR/weekly (the generated `app.js` is ignored; `src/` is analysed). Keep it at zero alerts.
- `.github/workflows/build.yml` — rebuilds from `src/` and fails if the committed `app.js` / `index.html` differ (the build is byte-for-byte deterministic).

Trigger manually: `gh workflow run data.yml`.

## Gotchas

- **`data.json` holds only what can't be derived** (ADR-019, ~43 KB gzipped). A new history column goes in `build_data.py`'s `out` and `fromJSON()`; never add a column the client can compute (market cap, USD issuance, supply and dates are all rebuilt). Round at write time, to significant digits, and check the score before and after with the Node snippet above.
- **`data.json` merge conflicts** are routine — the Action commits it daily. After a local rebuild: `git checkout --ours data.json && git add data.json` during a rebase.
- **Binance returns HTTP 451 on GitHub runners** (US geo-block). `build_data.py` falls back to Kraken OHLC. Locally Binance works, so a build that passes on your machine can still fail in CI — check the Action run.
- **Coin Metrics history can silently stall** (it froze for 2.5 months in 2026). `build_data.py` extends past its end automatically; if months go missing on the heatmap, check `data.json`'s last `date` first. Filled days use the **90-day mean** daily issuance — never a single day's value (one day can be ±15% off with block luck; the last Coin Metrics day was 512.5 BTC vs ~447 avg and inflated Puell ~9%).
- **Cross-checking against bitcoin-data.com**: their recent values are labelled one day later than Coin Metrics' (their day D ≈ our D−1). Align by a day before comparing, or a big price day looks like a formula bug.
- Service worker caching is the usual reason a change "didn't deploy".
- **bitcoin-data.com's free tier is delayed 7 days** (since 2026-09; responses carry `"delayed": true`). An on-chain date 7–8 days old is normal; the ⚠ stale badge only shows past 10 days. Because of that delay, `fresh.mvrv`/`fresh.puell` are **not** applied to the score — today's values come from our own series at the live price. `fresh.date` drives the on-chain date line; `fresh.realizedPrice` drives the realized price and NUPL (computed as 1 − realized / live price).
- **Keep Chart.js `animation:false`.** Per-point animations made every draw ~15× slower (47 ms → 3 ms on a Mac, roughly 4× worse on a phone) — that was most of Lighthouse's Total Blocking Time, and it hit every chart-tab click too.
- **Chart.js is `defer`red** (`<script id="chartjs">`); init listens for that tag's `load`/`error` and redraws. If it fails, the chart box shows the chart as a sentence (the same summary the canvas carries as its `aria-label`); the rest of the page is unaffected.
- **Loading = skeleton, not an overlay** (ADR-017). `#app` carries `data-phase="loading|failed|ready"`; the shell shows at once and every empty slot marked `data-sk` reserves `--h`. After each render `skSave()` stores every slot's real height per language and window width (`localStorage` `sk:<lang>:<width>`, in rem) and `skLoad()` applies it on the next load, so repeat visits match exactly on any device. The `--h` values (`sx.h*` in `src/styles.js`) are first-visit defaults measured at 375, 768 and 1280 px in TH and EN; re-measure them if a section's layout or copy length changes. Index rows are their own skeleton (`renderRows()` with no `SNAP` prints the real rows with "–").
- **One load path**: first load, ↻ refresh and the error box's retry all go through `load()`, guarded against double runs. Every fetch has a deadline (`get()`: price 4 s per source, `data.json` 15 s, CSV 30 s). A data failure shows an error box with retry inside the verdict and keeps the live price; it never blanks the page.
- **Option rows** (chart, range, backtest horizon, DCA start) are `aria-pressed` toggle buttons in labelled `role="group"`s, built once per language by `buildOpts()`. Clicks update them in place; rebuilding on click drops keyboard focus.
- **The heatmap grid is `aria-hidden`**; screen readers get the same months from the visually hidden `#hmTbl`. Keep both in `renderHeatmap()`. The table sits in an `sx.sr` wrapper because a table won't shrink to 1 px and would widen the page. `indicators.js`/`app.js` stay plain (non-module) scripts at the end of `<body>` so the saved theme applies as early as possible — deferring them adds a wrong-theme flash for users with a manual theme.
- **Lighthouse**: run it in an Incognito window. Extensions inject scripts that show up as unused JS, long tasks and console errors that aren't ours. GitHub Pages' 10-minute cache headers can't be changed — the service worker covers repeat visits.
