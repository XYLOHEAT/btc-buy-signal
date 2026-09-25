# Architecture Decision Record

One file, one entry per decision. Newest last. Status: accepted unless noted.

<!-- ponytail: single file instead of one-file-per-ADR; split if this passes ~20 entries -->

## ADR-001 — Static client-side app, no backend
**Context:** Personal dashboard, single user, all inputs are public data.
**Decision:** Pure static site on GitHub Pages. All compute in the browser.
**Consequences:** No server cost, no auth, no secrets to leak. Ceiling: no alerts/notifications, no private data, no server-side scheduling (the daily job lives in GitHub Actions instead).

## ADR-002 — Vanilla JS, no framework or build step
**Context:** ~1.5k lines of UI, one page.
**Decision:** Plain HTML/CSS/JS. Chart.js from CDN is the only runtime dependency.
**Consequences:** Deploy = `git push`, no toolchain to maintain or patch. Ceiling: no components/JSX; if the page grows past a few thousand lines this stops being comfortable.

## ADR-003 — Index selection and weighting
**Context:** Dozens of candidate on-chain/valuation indices.
**Decision:** Six indices only. Tier S weighted ×2 (Ahr999, MVRV Z-Score, 200W MA Multiple — price ÷ 200-week MA; called "Heatmap" until 2026-09, but the real heatmap colors by the MA's monthly % change), Tier A ×1 (Pi Cycle Top, Mayer, Puell). Stock-to-Flow deliberately excluded.
**Consequences:** Score is explainable and each input is defensible. S2F is excluded because the model broke down after 2021 — including it would import a known-invalid signal.

## ADR-004 — `data.json` built daily by GitHub Actions
**Context:** Browser originally fetched a 2.4 MB Coin Metrics CSV per load, plus bitcoin-data.com per load. bitcoin-data.com free tier allows **10 requests/hour per IP** — normal use exhausted it.
**Decision:** `build_data.py` (stdlib only) runs daily in Actions, bakes history + fresh MVRV-Z/Puell/NUPL/realized-price into a ~400 KB `data.json`, commits it. Browser reads only `data.json` + Binance for live price.
**Consequences:** Rate limit structurally impossible to hit; 6× smaller payload; the same file can feed other consumers. Cost: on-chain values are up to 24h stale (acceptable — these metrics move slowly), and the repo carries a daily data commit.
**Update 2026-09:** bitcoin-data.com's free tier now serves data **delayed 7 days** (`"delayed": true`; real-time needs a paid plan). Fresh on-chain values are therefore ~7–8 days old; the UI's stale badge threshold moved from 7 to 10 days so it only fires when the pipeline actually breaks. `fresh.mvrv`/`fresh.puell` no longer override today's row: our own series (live price + newest realized cap) is fresher and uses the same method as the history and backtest. Cross-check (2026-09): our MVRV-Z matches bitcoin-data's to a mean |diff| of 0.01 (2022-09→2026-05) and Puell has zero median bias; bitcoin-data's recent values are labelled one day later than Coin Metrics', so same-date comparisons can look ~0.14 apart on big-move days. NUPL is shown as 1 − realized price / live price, which is exactly bitcoin-data's formula at today's price.

## ADR-005 — Coin Metrics community data, non-commercial only
**Context:** Free on-chain history is licensed **CC BY-NC 4.0**.
**Decision:** Use it, with attribution in the footer and README, and keep the project non-commercial.
**Consequences:** Zero data cost. Hard constraint: no ads, no paid tier, no donations, no commercial trading product built on this data without swapping the source or licensing it.

## ADR-006 — "Accumulation", not "buy signal"
**Context:** The original UI said STRONG BUY, which reads as a trade instruction.
**Decision:** Frame everything as accumulation/DCA guidance: zone labels, a DCA stance (0.25–2.5× normal), and an explicit invalidation condition.
**Consequences:** Matches what the score can actually support (slow valuation, not entry timing) and lowers the chance of the tool being read as advice.

## ADR-007 — Flat-editorial design over the original dark-glass build
**Context:** The first build was dark + aurora mesh + glassmorphism + neon glow — the saturated AI-generated look, flagged by three independent design reviews.
**Decision:** Rebuild as flat editorial: ink + a single BTC-orange accent, mono numerals, hairline data rows, motion only where it conveys state. Kept the coin mascot as the one piece of personality.
**Consequences:** Reads as a tool rather than a template, and is cheaper to render on mobile. The old page was deleted (see ADR-009).

## ADR-008 — Strict CSP, so app logic lives in `app.js`
**Context:** All JS was inline, which forces `script-src 'unsafe-inline'` and makes CSP mostly decorative.
**Decision:** Move logic to `app.js`; CSP is `script-src 'self' https://cdn.jsdelivr.net` with SRI on Chart.js. Handlers assigned as `.onclick` properties, never inline attributes.
**Consequences:** Injected inline script is blocked by the browser, not merely escaped. `style-src` keeps `'unsafe-inline'` (inline `style=` attributes) — accepted, since style injection is cosmetic.

## ADR-009 — Deleted `aurora.html`
**Context:** The archived first design was still served, without CSP, SRI, or output escaping.
**Decision:** Delete it. The design lives in git history (`git show cec76c0:index.html`).
**Consequences:** No unhardened page on the live origin. Recovering the old look costs one git command.

## ADR-010 — No bot protection, stay on GitHub Pages
**Context:** Considered moving to Cloudflare for WAF/Bot Fight Mode/Turnstile.
**Decision:** Skip it.
**Consequences:** Nothing to protect — no login, no user data, no per-request cost, and the data is already public. Challenges would only degrade real users. Revisit if a backend, accounts, or metered costs ever appear.

## ADR-011 — Self-healing data + workflow keepalive
**Context:** Coin Metrics community CSV silently stopped updating (2026-05-23); heatmap/charts lost 2.5 months. Separately, GitHub disables scheduled workflows after 60 days without user commits — bot commits don't count.
**Decision:** `build_data.py` extends history past Coin Metrics' end using Binance daily klines (price) + bitcoin-data realized-price history (realized cap), carrying supply/issuance forward. `data.yml` gets a keepalive step that re-enables both scheduled workflows via the API every run.
**Consequences:** The site keeps itself current with no manual attention, even if Coin Metrics never resumes (gap closes automatically if it does). Filled rows approximate supply linearly (~0.05%/mo error) — fine for MVRV-Z. Issuance for filled days is the 90-day mean of real days (fixed 2026-09: carrying the last single day, 512.5 BTC vs ~447 avg, had inflated Puell ~9%). Workflow failures still email the owner by default.

## ADR-012 — Self-hosted fonts, deferred Chart.js
**Context:** Lighthouse (2026-09, mobile): Google Fonts CSS and a synchronous Chart.js blocked the first render (~0.8 s + ~1.4 s est.), and Chart.js per-point animations were most of the Total Blocking Time. Google Fonts also sent every visitor's IP to Google and needed two extra CSP origins.
**Decision:** Serve the same variable woff2 subsets Google Fonts serves (latin, latin-ext, thai) from `fonts/` with their OFL licences, declared in `index.html`; CSP `font-src 'self'`. Load Chart.js with `defer` and draw charts on its load event; `animation:false`.
**Consequences:** No render-blocking third-party requests; no font requests leave the site; offline PWA keeps its fonts. Cost: ~230 KB of font files in the repo, updated by hand if a font changes (re-fetch the Google CSS with a modern User-Agent, keep the three subsets). Charts appear without the draw-in animation.

## ADR-013 — One typeface, fixed type scale
**Context:** The 2026-09 design critique (impeccable, 24/40) found 49% of text nodes under 12px across 17 sizes, a monospace face on 73% of text (the "terminal-editorial" look PRODUCT.md rejects), uppercase tracked labels over every section, a display face (Bricolage Grotesque) on data values, Thai falling back to a system font inside mono text, and buttons silently rendering in Arial because they didn't inherit the font.
**Decision:** Anuphan alone (Thai + Latin, variable 400–700; its digits are already tabular) on six rem tokens: 13 / 14 / 16 / 20 / 24 / 60px. Section labels become `<h2>` headings in sentence case, with any " · " suffix rendered as a quiet subtitle. No uppercase transforms or letter-spacing on text that may contain Thai; `button{font:inherit}`. Bricolage Grotesque and JetBrains Mono removed.
**Consequences:** Hierarchy comes from size, weight and color instead of case and tracking; Thai renders in one face everywhere; ~150 KB less font in the repo (~108 KB less per first visit). The page is longer on phones because nothing is 9–11px any more. Adding a size means adding a token, not a one-off px value.
