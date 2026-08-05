# ₿ Bitcoin Accumulation Signal

On-chain valuation dashboard that answers one question: **is now a good time to accumulate BTC?**
Static, client-side, no backend. **Live: https://xyloheat.github.io/btc-buy-signal/**

Combines 6 valuation/on-chain indices into one 0–100 accumulation score
(Tier S ×2: Ahr999, MVRV Z-Score, 200W MA Heatmap · Tier A: Pi Cycle, Mayer, Puell).
Reframed as *accumulation/DCA guidance*, not a buy signal. Not financial advice.

## Features
- Weighted score + zone, 3-layer Value / Risk / Action, plain-language "what this means" + DCA stance + invalidation
- **Backtest** (forward returns by zone), **DCA simulator** (signal-scaled vs flat), **cycle compare**, monthly **heatmap**, halving markers
- Per-metric tooltips with score reading · light/dark toggle · TH/EN toggle (persisted)
- **PWA** (installable, offline) · mobile-first + desktop two-column

## How it works
- `index.html` UI/CSS · `app.js` render/i18n · `indicators.js` pure compute (also runs in Node) · `sw.js` service worker
- `build_data.py` (stdlib) builds `data.json` daily via GitHub Action — bakes Coin Metrics history + fresh MVRV-Z / Puell / NUPL / realized price from bitcoin-data.com (keeps the browser off bitcoin-data's 10 req/hr limit)
- Browser reads `data.json` (CSV fallback) + live price from Binance (CoinGecko fallback)

## Security
Strict CSP (`script-src 'self'`, no `unsafe-inline`) · SRI on Chart.js · all GitHub Actions pinned to commit SHA · CodeQL on every push (0 alerts) · no secrets / user data / backend.

## Run locally
```bash
python3 -m http.server 8777   # fetch needs http://, not file://
```

## Data licence
On-chain history from Coin Metrics community data — **CC BY-NC 4.0** (attribution + non-commercial). Personal/non-commercial use only.

## Decisions
See [docs/adr.md](docs/adr.md) — why static, why `data.json`, why the design/security choices.
