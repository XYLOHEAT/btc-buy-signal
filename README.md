# ₿ BTC Buy Signal — mobile web

Aurora dark-glass dashboard. Tier S/A index combo → single buy score. Mobile-first.
Pure client-side: fetches data + live price in the browser, computes in JS. No server.

- **`index.html`** — UI (Aurora theme, cute reactive coin, Chart.js)
- **`indicators.js`** — compute port of the Python `indicators.py` (verified identical)

## Data
- on-chain history: Coin Metrics community CSV (free)
- live price + 24h change: Binance (CoinGecko fallback)

Indices: Ahr999, MVRV Z-Score, 200W MA Heatmap (Tier S, ×2 weight) · Pi Cycle Top, Mayer, Puell (Tier A).
Score 0 = แพง/ขาย, 100 = ซื้อแรง.

## รัน local
เปิด `index.html` ผ่าน static server (fetch ต้องการ http ไม่ใช่ file://):
```bash
python3 -m http.server 8777 --directory .
# http://localhost:8777
```

## Host (GitHub Pages)
push repo นี้ public → Settings → Pages → branch `main` / root. URL: `https://<user>.github.io/btc-buy-signal/`

ไม่ใช่คำแนะนำลงทุน — เครื่องมือช่วยตัดสินใจเท่านั้น.
