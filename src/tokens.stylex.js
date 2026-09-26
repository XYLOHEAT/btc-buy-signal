/* Design tokens (ADR-021). Colors are CSS variables with literal names (--bg, --z-good, ...): the base CSS in
   index.html and the chart canvas (tok() in app.js) read them by name, and themes swap them on <html>.
   Spacing, type and breakpoints are compile-time constants.
   Text colors stay >= 4.5:1 on --bg and --surface in both themes; --faint is the floor. */
import * as stylex from "@stylexjs/stylex";

export const light = stylex.defineConsts({
  bg: "#f3f3f0", surface: "#fafaf8", ink: "#171715", muted: "#5f5f5a", faint: "#6e6e69",
  line: "rgba(20,20,16,.14)", lineSoft: "rgba(20,20,16,.07)", btc: "#c96b08", hatch: "rgba(255,255,255,.42)",
  zGood: "#1c7a47", zOk: "#5a7711", zNeutral: "#926500", zWarn: "#ae5318", zBad: "#bb2f24",
});
/* dark zone ramp: OKLCH L .71-.80, C .10-.11, calm rather than neon (ADR-016) */
export const dark = stylex.defineConsts({
  bg: "#0e0f12", surface: "#16181c", ink: "#e9e7e1", muted: "#9b988f", faint: "#85827b",
  line: "rgba(255,255,255,.13)", lineSoft: "rgba(255,255,255,.06)", btc: "#f7931a", hatch: "rgba(14,15,18,.4)",
  zGood: "#75c59b", zOk: "#abca84", zNeutral: "#dbb970", zWarn: "#dc9a6c", zBad: "#de857e",
});

/* the page follows the OS until the reader picks a theme (styles.js: lightTheme / darkTheme on <html>) */
const OS_DARK = "@media (prefers-color-scheme: dark)";
export const color = stylex.defineVars({
  "--bg": { default: light.bg, [OS_DARK]: dark.bg },
  "--surface": { default: light.surface, [OS_DARK]: dark.surface },
  "--ink": { default: light.ink, [OS_DARK]: dark.ink },
  "--muted": { default: light.muted, [OS_DARK]: dark.muted },
  "--faint": { default: light.faint, [OS_DARK]: dark.faint },
  "--line": { default: light.line, [OS_DARK]: dark.line },
  "--line-soft": { default: light.lineSoft, [OS_DARK]: dark.lineSoft },
  "--btc": { default: light.btc, [OS_DARK]: dark.btc },
  "--hatch": { default: light.hatch, [OS_DARK]: dark.hatch },
  "--z-good": { default: light.zGood, [OS_DARK]: dark.zGood },
  "--z-ok": { default: light.zOk, [OS_DARK]: dark.zOk },
  "--z-neutral": { default: light.zNeutral, [OS_DARK]: dark.zNeutral },
  "--z-warn": { default: light.zWarn, [OS_DARK]: dark.zWarn },
  "--z-bad": { default: light.zBad, [OS_DARK]: dark.zBad },
});

/* type scale: fixed rem steps (ADR-013). 13px is the floor: Thai vowel and tone marks need it */
export const text = stylex.defineConsts({
  caption: ".8125rem", // 13: notes, meta, table heads, badges
  ui: ".875rem",       // 14: controls, statuses, table cells, labels
  body: "1rem",        // 16: sentences, names, values
  subhead: "1.25rem",  // 20: section headings, masthead
  title: "1.5rem",     // 24: verdict, index values
  display: "3.75rem",  // 60: the score
});

/* spacing: 4pt scale in rem, so it grows with the reader's font size. Nothing off-scale */
export const space = stylex.defineConsts({
  xs: ".25rem", sm: ".5rem", md: ".75rem", lg: "1rem", xl: "1.5rem", x2: "2rem", x3: "3rem", x4: "4rem",
});

/* Breakpoints in em (40em = 640px, 60em = 960px at the default size): a larger default font gets the layout of a
   narrower screen (ADR-018). Sections answer to their column through container queries, thresholds in rem. */
export const mq = stylex.defineConsts({
  narrow: "@media (max-width: 22.5em)",   // 360px phones: smaller ring and masthead
  phone: "@media (max-width: 39.99em)",
  tablet: "@media (min-width: 40em)",     // one wider column: tablet, landscape phone
  desktop: "@media (min-width: 60em)",    // two columns
  hover: "@media (hover: hover)",
  reduce: "@media (prefers-reduced-motion: reduce)",
  colaWide: "@container cola (min-width: 36rem)",      // ring beside the verdict text
  colbTwoUp: "@container colb (min-width: 34rem)",     // index rows two-up
  colbStack: "@container colb (max-width: 17rem)",     // tables stack: the 4-column min-content + room
  colbQuarters: "@container colb (max-width: 16rem)",  // heatmap labels quarters only
});
