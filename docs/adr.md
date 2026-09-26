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
**Consequences:** Deploy = `git push`, no toolchain to maintain or patch. Ceiling: no components/JSX; if the page grows past a few thousand lines this stops being comfortable. *Superseded in part by ADR-021: styles are StyleX, so the UI now has one build step (still no framework).*

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

## ADR-014 — Zone names describe valuation; one vocabulary
**Context:** The page named the same five score bands two ways: stance labels ("STRONG ACCUMULATE", "Accumulate", "Neutral", "Caution", "Expensive") and valuation words ("very cheap", "fairly cheap", "mid", …), and the big green "STRONG ACCUMULATE" read as a buy instruction. The critique also found the verdict is "strong" on 54% of days since 2014, and the backtest put CAUTION's +72% (185 days) above ACCUMULATE's −4%.
**Decision:** Zones are named by what the score measures: ถูกมาก / ถูก / กลาง ๆ / ค่อนข้างแพง / แพง, EN Very cheap / Cheap / Fair / Pricey / Expensive, everywhere (verdict, strip, backtest, heatmap). The action lives only in "What to do". Under the verdict, a percentile ("cheaper than 72% of days since 2014"). Backtest defaults to 1 year and greys any level with fewer than 3 non-overlapping periods (n / horizon < 3). Internal keys (`STRONG BUY`…) are unchanged in `indicators.js`.
**Consequences:** Newcomers read the verdict without jargon, and the page no longer shouts "buy". Thai mode is Thai throughout except index names, brands and a few domain terms shown with a Thai gloss. Supersedes the naming half of ADR-006; the accumulation framing of the actions stands.

## ADR-015 — The verdict column says each thing once
**Context:** After ADR-014 the left column still stated the verdict six ways (ring, zone, zone strip, "Value" card, "Valuation" row, summary sentence), the price twice, the short-term trend three times, and gave two differently-worded actions (the card was trend-aware, the sentence wasn't). The index breakdown, the actual evidence, started about 1,240 px down on a phone.
**Decision:** Verdict = ring + zone + percentile + price/freshness. Then one plan (`<dl class="plan">`): the action (score sets how much; a weak short-term trend appends "spread buys over time") and the invalidation, then the disclaimer. Then three facts (short-term trend, market cost basis, NUPL). Removed: zone strip, the three cards, the price/valuation rows, the summary sentence, index score bars. Backtest, DCA and similar-period method notes sit behind a native `<details>` ("How it's calculated"); the heatmap legend stays visible because the cells can't be read without it.
**Consequences:** Index breakdown starts at ~960 px on a phone; on a 1280×800 desktop the whole verdict column fits without scrolling. Nothing the user needs to decide was removed: every number still appears exactly once. The removed `transition: width` bars also clear a detector finding.

## ADR-016 — No mascot; calm color and motion
**Context:** PRODUCT.md (2026-09) set the personality to professional, precise, understated and listed cartoon mascots and crypto neon as anti-references. The smiling coin sat on the score ring, spun on the loading screen and was the favicon and app icon (ADR-007 had kept it as "the one piece of personality"). Dark mode used stock Tailwind 400 colors (OKLCH chroma .15–.19) that turned the heatmap into a neon block; the score counted up for a second and the ring took 1.1 s to fill.
**Decision:** The owner chose to remove the coin entirely. The mark is now the score ring itself (orange arc, three-quarters full, on ink) for favicon, app icons and `icon.svg`. Dark zone colors come from one OKLCH ramp at L .71–.80, C .10–.11 (`ZHEX` mirrors the CSS tokens). The score number is ink; zone color marks state only (ring, zone name, statuses). No count-up; the ring fills in .6 s (ease-out-quart). Very cheap days are shown by coloring the price line itself, not by a dot series. Weight badges are neutral; orange is reserved for selection, focus and the mark.
**Consequences:** Supersedes the mascot part of ADR-007. The page reads as a tool at first glance, and the dark theme no longer glows. Loading still shows a full-screen text overlay until harden replaces it with a skeleton.

## ADR-017 — Harden: skeleton loading, errors in place, deadlines, accessible data
**Context:** The 2026-09 audit (15/20) found a full-screen overlay that hid the whole page until every request finished and replaced it with a dead error screen on failure; fetches with no timeout (a blocked exchange held up the first render indefinitely); the service worker serving a cached exchange price that the page labelled "live" when offline; a chart and a heatmap that screen readers couldn't read and that relied on color alone; 20 option buttons with no selected state for assistive tech, rebuilt on every click (keyboard focus lost); a refresh button that could run twice and swallowed errors.
**Decision:** The shell renders immediately with measured placeholders (`.is-loading`, `.sk` slots with `--h`; index rows print "–"). First load, refresh and retry share one guarded `load()`; every fetch goes through `get()` with a deadline. A data failure shows an error box with a retry inside the verdict and keeps the live price. The live price bypasses the service worker; HTML and `data.json` fall back to the cache after 4 s on a slow network. Option rows are `aria-pressed` toggles updated in place; the chart canvas carries a text summary (range, first/last, low/high with dates), shown as text if Chart.js fails; the heatmap grid is `aria-hidden` next to a visually hidden table, with hatching on pricey/expensive months and a dot for halvings instead of the unreadable ⛏; one `role="status"` region announces loading and the result.
**Consequences:** First-load CLS measured ~0.01 (text reflows inside centered lines only). Offline, the page says the live price is unavailable instead of showing an old one. Cost: placeholder heights are constants; a layout or copy change in a data section means re-measuring them (AGENTS.md says how). The heatmap legend is now swatches with zone names rather than a sentence.

## ADR-018 — Adapt: columns decide, not the window; em breakpoints; large text
**Context:** The audit found the page broke at 200% text (the masthead controls ran off-screen, the score overflowed its ring, the four-column tables and the heatmap's month labels overlapped), range and horizon buttons were 28 px wide, and tablets got the 460 px phone column with wide empty margins. The desktop index rows squeezed into two 208 px columns at 1024 px.
**Decision:** Sections respond to their column through container queries (`cola`, `colb`, thresholds in rem, so they also react to text size): the ring sits beside the verdict text when the column is ≥ 36rem, index rows go two-up at ≥ 34rem, tables stack into label/value lines below 17rem, the heatmap labels quarters below 16rem. A tablet/landscape tier (≥ 40em) widens the single column to 45rem. Breakpoints are em and layout widths rem, identical at the default size. The ring is rem-sized and the score is capped by it (`31cqi`); masthead controls wrap under the title; option buttons get 44 px targets with the underline kept to the label; hover styles only apply where hover exists; gutters respect the notch in landscape; chart text scales with the root size. Skeleton heights are remembered per device (ADR-017 follow-up), since wrapping differs at every width.
**Consequences:** No horizontal scroll and no target under 44 px at 320–1920 px, at 100% and 200% text. Tablets and landscape phones show the verdict and the action in one screen; the 1024 px desktop lists index rows in one column. Cost: layout rules live in two places (media queries for the page, container queries for sections) and the first visit on an unusual width can still shift slightly until the next load.

## ADR-019 — data.json v2: store only what can't be derived
**Context:** `data.json` was 421 KB (145 KB gzipped on GitHub Pages, which serves gzip, not brotli): about half of a first visit and the one file re-downloaded after every daily update. Measured in the browser, compute was never the cost (all indices ~4 ms, full render ~19 ms on a Mac). Three of the seven arrays were products of the others (market cap = price × supply, USD issuance = issuance × price, verified to 5e-5), dates were consecutive, and the rounding was fixed-decimal: prices under $1 were cut to cents (2010's $0.0858 stored as 0.09) while market caps carried a useless ".0".
**Decision:** Format v2 keeps `price` (5 significant digits, whole dollars from $10,000), `mvrv` (5 significant digits), `issNtv` (3 decimals, exact for block rewards) plus `start` and `supply0`; `Indicators.fromJSON()` rebuilds dates, supply (running sum of issuance), market cap and USD issuance, and still reads v1 files. A gap in the dates makes the builder write explicit dates again.
**Consequences:** 115 KB raw, 43 KB gzipped (−70%). Scores move at most 0.004 points over 2014–2026-05 (backtest counts and medians unchanged); in the 2026 bitcoin-data extension up to 0.06, from that source's own revisions. Derived supply differs from Coin Metrics' by at most 2e-5 (burned and unclaimed coins), which cancels out of MVRV-Z because realized cap is derived from the same market cap. Decoding costs ~7 ms on a Mac, mostly generating date strings. Any outside reader of the old arrays must switch to v2.

## ADR-020 — Polish: tokens are the only color source; color means valuation
**Context:** The final pass found drift the earlier passes left: `app.js` mirrored 24 hex values of the CSS tokens (`ZHEX`, tick, legend, tooltip and line colors), the halving label (2.1:1 light, 3.5:1 dark) and the 200-day line (2.1:1) failed contrast, index reference lines and sparkline bands still used stock Tailwind 400 hex from `indicators.js`, and `indicators.js` carried dead zone data (stance words "ซื้อแรง", "โซนขาย", neon hex, per-index colors, old status strings). Status words such as "Mid" and "Normal" were painted the green of "cheap", the 24h price change was red/green like a trading app, the browser bar ignored the theme toggle, tooltips showed unitless numbers and every threshold line, table rules broke at column gaps, and a ⛏ glyph labelled the halvings.
**Decision:** Canvas colors come from `tok()` (computed CSS variables) at draw time and inline SVG uses `var()`; `ZHEX`, `inkHex`, `btcHex` are gone. Bands are `{y, z, label}` with numeric labels. Zone color marks valuation and outcomes only; status words and the day's price change are neutral. Tooltips format with the tab's unit (`$`, score, index) and skip reference lines; negatives use a true minus sign everywhere. Halving lines show the year, with a "halving" legend entry. `theme-color` follows a chosen theme. Table spacing lives inside cells.
**Consequences:** A token change now reaches the charts with no second edit, and every canvas text passes AA. Fewer colored words on the page; the colors that remain always mean "cheap/expensive" or "better/worse outcome".

## ADR-021 — StyleX for all component styles; one build step
**Context:** The owner chose to move the styles to StyleX once the design pipeline (typeset through polish) had settled the look. Until then the page had no build step (ADR-002): one hand-written `<style>` of ~170 rules leaning on descendant selectors, and `app.js` served as written. StyleX compiles styles authored in JS into atomic CSS, so it needs a compiler.
**Decision:** `src/` is the source: `tokens.stylex.js` (colors as CSS variables with their existing names, so the canvas `tok()` and the base CSS keep working; type, spacing and breakpoints as constants), `styles.js` (one `sx.*` role per element; chosen themes via `createTheme`), `app.js` (the UI, now also building the page markup in `shell()`). `build.mjs` runs esbuild with `@stylexjs/unplugin`: `/app.js` becomes a minified IIFE (still a classic script under the same CSP) and the generated CSS is inlined into `index.html`'s `<style id="stylex">`, so the page still renders from one HTML request. The outputs are committed: Pages serves the folder as it is and the daily data job needs no build; a Build check workflow fails when they are stale (the build is deterministic, byte for byte). Element states moved from descendant selectors onto the element (`[aria-pressed]`, `[aria-expanded]`, `:empty`, `:lang()`), and the loading skeleton reads `#app[data-phase]` through `:where([data-phase=…] *)`.
**Consequences:** Supersedes ADR-002's "no build step": changing the UI needs Node (`npm ci`, `npm run build`). Checked against the pre-StyleX build in a same-origin iframe harness: 108 elements identical in position, size, color, type, spacing and borders at 320–1280 px, in TH and EN, light and dark (OS and chosen), at 200% text, and in the loading and failed states. Transfer is about the same (app.js +3.2 KB gzipped, index.html −1.8 KB). Styles are local to their role, tokens are typed constants, and specificity can't drift. Costs: StyleX 0.19 silently drops multi-value border and background shorthands (spelled out as longhand spreads), `stylex.when` must stay inline in `create()`, and a commit of `src/` without a rebuild would ship stale files (the workflow flags it). One latent bug surfaced and stays out: the "live" dot in the price line never rendered (its selector never matched), and its green would now break ADR-020, so it was removed rather than shown.
