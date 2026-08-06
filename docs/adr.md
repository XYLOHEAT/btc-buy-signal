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
**Decision:** Six indices only. Tier S weighted ×2 (Ahr999, MVRV Z-Score, 200W MA Heatmap), Tier A ×1 (Pi Cycle Top, Mayer, Puell). Stock-to-Flow deliberately excluded.
**Consequences:** Score is explainable and each input is defensible. S2F is excluded because the model broke down after 2021 — including it would import a known-invalid signal.

## ADR-004 — `data.json` built daily by GitHub Actions
**Context:** Browser originally fetched a 2.4 MB Coin Metrics CSV per load, plus bitcoin-data.com per load. bitcoin-data.com free tier allows **10 requests/hour per IP** — normal use exhausted it.
**Decision:** `build_data.py` (stdlib only) runs daily in Actions, bakes history + fresh MVRV-Z/Puell/NUPL/realized-price into a ~400 KB `data.json`, commits it. Browser reads only `data.json` + Binance for live price.
**Consequences:** Rate limit structurally impossible to hit; 6× smaller payload; the same file can feed other consumers. Cost: on-chain values are up to 24h stale (acceptable — these metrics move slowly), and the repo carries a daily data commit.

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
**Consequences:** The site keeps itself current with no manual attention, even if Coin Metrics never resumes (gap closes automatically if it does). Filled rows approximate supply linearly (~0.05%/mo error) — fine for MVRV-Z. Workflow failures still email the owner by default.
