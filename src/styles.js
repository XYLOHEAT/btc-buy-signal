/* All component styles (ADR-021). One object per element role; state comes from the element itself
   (aria-pressed, aria-expanded, aria-disabled, :empty, :lang) or from #app's phase via a marker, so the
   markup in app.js only picks roles. Rhythm: sections 48px apart, 12px from a heading to its content. */
import * as stylex from "@stylexjs/stylex";
import { color, light, dark, text, space, mq } from "./tokens.stylex.js";

/* a reader-chosen theme overrides the OS default on <html> */
export const lightTheme = stylex.createTheme(color, {
  "--bg": light.bg, "--surface": light.surface, "--ink": light.ink, "--muted": light.muted, "--faint": light.faint,
  "--line": light.line, "--line-soft": light.lineSoft, "--btc": light.btc, "--hatch": light.hatch,
  "--z-good": light.zGood, "--z-ok": light.zOk, "--z-neutral": light.zNeutral, "--z-warn": light.zWarn, "--z-bad": light.zBad,
});
export const darkTheme = stylex.createTheme(color, {
  "--bg": dark.bg, "--surface": dark.surface, "--ink": dark.ink, "--muted": dark.muted, "--faint": dark.faint,
  "--line": dark.line, "--line-soft": dark.lineSoft, "--btc": dark.btc, "--hatch": dark.hatch,
  "--z-good": dark.zGood, "--z-ok": dark.zOk, "--z-neutral": dark.zNeutral, "--z-warn": dark.zWarn, "--z-bad": dark.zBad,
});

/* #app carries data-phase="loading|failed|ready" (app.js): the skeleton shows while loading, freezes and dims
   on failure, and is gone once the data lands. Slots only draw it while :empty. Plain :where() ancestor
   selectors, not stylex.when (whose calls must sit inline in create() to compile away) */
const busy = ":where([data-phase=loading] *, [data-phase=failed] *)";
const loading = ":where([data-phase=loading] *)";
const failed = ":where([data-phase=failed] *)";
const pulse = stylex.keyframes({ to: { opacity: 0.4 } });
const PRESSED = ":is([aria-pressed=true])";
const HOVER = { default: null, [mq.hover]: "var(--ink)" }; // touch leaves :hover stuck after a tap
/* hairlines, spelled out: StyleX 0.19 silently drops multi-value border and background shorthands */
const RULE_TOP = { borderTopWidth: 1, borderTopStyle: "solid", borderTopColor: "var(--line)" };        // section rule
const RULE_BOTTOM = { borderBottomWidth: 1, borderBottomStyle: "solid", borderBottomColor: "var(--line)" };
const SOFT_BOTTOM = { borderBottomWidth: 1, borderBottomStyle: "solid", borderBottomColor: "var(--line-soft)" }; // row rule
const FRAME = { borderWidth: 1, borderStyle: "solid", borderColor: "var(--line)" };
const FRAME_SOFT = { borderWidth: 1, borderStyle: "solid", borderColor: "var(--line-soft)" };

export const sx = stylex.create({
  /* ---------- page ---------- */
  // gutter per breakpoint; env() keeps content out of the notch and rounded corners in landscape
  wrap: {
    "--gutter": { default: space.lg, [mq.tablet]: space.x2, [mq.desktop]: space.x3 },
    maxWidth: { default: "28.75rem", [mq.tablet]: "45rem", [mq.desktop]: "73.75rem" },
    marginInline: "auto",
    paddingTop: `max(env(safe-area-inset-top), ${space.lg})`,
    paddingRight: "max(var(--gutter), env(safe-area-inset-right))",
    paddingBottom: `calc(env(safe-area-inset-bottom) + ${space.x3})`,
    paddingLeft: "max(var(--gutter), env(safe-area-inset-left))",
  },
  cols: {
    display: { default: "block", [mq.desktop]: "grid" },
    gridTemplateColumns: { default: null, [mq.desktop]: "25rem minmax(0, 1fr)" },
    columnGap: { default: null, [mq.desktop]: space.x4 },
    alignItems: { default: null, [mq.desktop]: "start" },
    marginTop: { default: null, [mq.desktop]: space.xs },
  },
  // sections adapt to their column, not the window; on desktop the verdict column stays in view
  colA: {
    containerType: "inline-size", containerName: "cola",
    position: { default: null, [mq.desktop]: "sticky" },
    top: { default: null, [mq.desktop]: space.lg },
    maxHeight: { default: null, [mq.desktop]: `calc(100dvh - 2 * ${space.lg})` },
    overflowY: { default: null, [mq.desktop]: "auto" },
    scrollbarWidth: { default: null, [mq.desktop]: "none" },
    paddingRight: { default: null, [mq.desktop]: space.xs },
    "::-webkit-scrollbar": { display: "none" },
  },
  colB: { containerType: "inline-size", containerName: "colb" },
  sr: { position: "absolute", width: 1, height: 1, margin: -1, padding: 0, borderWidth: 0, overflow: "hidden", clipPath: "inset(50%)", whiteSpace: "nowrap" },

  /* ---------- masthead ---------- */
  mast: { display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: space.md, paddingBottom: space.md, borderBottomWidth: 1.5, borderBottomStyle: "solid", borderBottomColor: "var(--ink)" },
  ttl: { flex: "1 1 8rem" }, // in rem: at large text sizes the controls wrap below the title instead of off-screen
  h1: { fontSize: { default: text.subhead, [mq.narrow]: "1.125rem" }, fontWeight: 700, lineHeight: 1.25 },
  sub: { fontSize: text.caption, color: "var(--muted)", lineHeight: 1.4, marginTop: space.xs },
  ctrls: { display: "flex", gap: space.sm, flex: "0 0 auto", marginLeft: "auto" },
  // quieter than the content: a hairline, not an ink frame
  cbtn: {
    fontSize: text.ui, fontWeight: 600, color: "var(--ink)", backgroundColor: "transparent",
    borderWidth: 1, borderStyle: "solid",
    borderColor: { default: "var(--line)", ":hover": HOVER, ":active": "var(--ink)" },
    paddingBlock: 0, paddingInline: space.sm, minHeight: 44, minWidth: 44, display: "grid", placeItems: "center",
    cursor: { default: "pointer", ":is([aria-disabled=true])": "progress" },
    opacity: { default: null, ":is([aria-disabled=true])": 0.4 },
    transition: "border-color .18s",
  },
  icon: { width: "1.2em", height: "1.2em", display: "block" }, // 17px at the default size, grows with text

  /* ---------- verdict ---------- */
  // wide column (tablet, landscape phone): the ring sits beside the verdict text, so the plan starts higher
  verdict: {
    paddingBlock: space.lg, ...RULE_BOTTOM,
    textAlign: { default: "center", [mq.colaWide]: "left" },
    display: { default: "block", [mq.colaWide]: "flex" },
    alignItems: { default: null, [mq.colaWide]: "center" },
    gap: { default: null, [mq.colaWide]: space.x2 },
  },
  gauge: {
    position: "relative", aspectRatio: 1, containerType: "inline-size",
    width: { default: "min(12.25rem, 100%)", [mq.narrow]: "min(10.75rem, 100%)" }, // rem: grows with the text
    marginInline: { default: "auto", [mq.colaWide]: 0 },
    flex: { default: null, [mq.colaWide]: "0 0 auto" },
  },
  gaugeSvg: { transform: "rotate(-90deg)", display: "block", width: "100%", height: "100%" },
  track: { fill: "none", stroke: "var(--line-soft)", strokeWidth: 7 },
  arc: { fill: "none", strokeWidth: 7, strokeLinecap: "butt", transition: { default: "stroke-dashoffset .6s cubic-bezier(.25,1,.5,1)", [mq.reduce]: "none" } },
  ctr: { position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" },
  // the display size, capped by the ring; the dashes before data are placeholders, not values
  score: {
    fontWeight: 700, lineHeight: 1, letterSpacing: "-.02em",
    fontSize: stylex.firstThatWorks("min(3.75rem, 31cqi)", text.display),
    color: { default: null, [busy]: "var(--faint)" },
  },
  scoreMax: { fontSize: text.ui, fontWeight: 600, color: "var(--faint)", letterSpacing: 0 },
  vtext: { flex: { default: null, [mq.colaWide]: 1 } },
  zone: {
    fontWeight: 700, fontSize: text.title, lineHeight: 1.25,
    marginTop: { default: space.md, [mq.colaWide]: 0 },
    color: { default: null, [busy]: "var(--faint)" },
  },
  zoneTh: { color: "var(--muted)", marginTop: space.xs, textWrap: "balance" },
  tape: { fontWeight: 600, marginTop: space.md, display: "flex", alignItems: "center", justifyContent: { default: "center", [mq.colaWide]: "flex-start" }, gap: space.md, flexWrap: "wrap" },
  chg: { color: "var(--muted)" }, // the sign says the direction; red/green for a day's move is trading-app noise
  asof: { fontSize: text.caption, color: "var(--faint)", marginTop: space.sm, lineHeight: 1.55 },
  stale: { color: "var(--z-warn)", fontWeight: 600 },
  // load failure: sits in the verdict, where the answer would be. Full hairline border, no side stripe
  alert: { display: "flex", alignItems: "center", gap: space.md, marginTop: space.lg, padding: space.md, ...FRAME, backgroundColor: "var(--surface)", textAlign: "left" },
  alertP: { flex: 1, margin: 0, fontSize: text.ui, fontWeight: 600, lineHeight: 1.5, color: "var(--z-bad)" },
  alertSmall: { display: "block", marginTop: space.xs, fontSize: text.caption, fontWeight: 400, color: "var(--faint)", overflowWrap: "anywhere" },
  retry: { paddingInline: space.md, whiteSpace: "nowrap" },

  /* ---------- the plan and its facts: tight inside, one step of air between them ---------- */
  plan: { marginTop: space.lg, display: "grid", gap: space.md },
  planDt: { fontSize: text.caption, fontWeight: 600, color: "var(--muted)" },
  planDd: { marginTop: space.xs, lineHeight: 1.55, maxWidth: "65ch", textWrap: "pretty" },
  planAct: { fontWeight: 600 }, // what to do: the one line to act on
  disc: { marginTop: space.md, marginBottom: 0, marginInline: 0, fontSize: text.caption, color: "var(--muted)" },
  facts: { marginTop: space.xl, ...RULE_TOP },
  fact: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: space.md, paddingBlock: space.sm, ...SOFT_BOTTOM },
  factDt: { fontSize: text.ui, color: "var(--muted)" },
  factDd: { fontWeight: 600, textAlign: "right" },

  /* ---------- section headings: real <h2>s; text after " · " becomes a quiet subtitle ---------- */
  lbl: { fontSize: text.subhead, fontWeight: 700, lineHeight: 1.3, color: "var(--ink)", marginTop: space.x3, marginBottom: space.md },
  lblFirst: { marginTop: { default: space.x3, [mq.desktop]: space.xl } },
  lblSub: { display: "block", fontSize: text.ui, fontWeight: 400, color: "var(--muted)", lineHeight: 1.45, marginTop: space.xs },

  /* ---------- index rows: name and value share the top line; weight, status and info sit under them ---------- */
  rows: {
    ...RULE_TOP,
    display: { default: "block", [mq.colbTwoUp]: "grid" }, // two-up once the column can hold two
    gridTemplateColumns: { default: null, [mq.colbTwoUp]: "1fr 1fr" },
    columnGap: { default: null, [mq.colbTwoUp]: space.x3 },
  },
  row: {
    display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gridTemplateAreas: '"nm val" "meta meta" "spark spark" "info info"',
    columnGap: space.md, paddingTop: space.lg, paddingBottom: space.md, ...SOFT_BOTTOM, alignItems: "baseline",
  },
  nm: { gridArea: "nm", fontWeight: 600, lineHeight: 1.3 },
  val: { gridArea: "val", fontWeight: 700, fontSize: text.title, lineHeight: 1.2, textAlign: "right", color: { default: null, [busy]: "var(--faint)" } },
  meta: { gridArea: "meta", display: "flex", alignItems: "center", gap: space.sm, marginTop: space.xs },
  tier: { fontSize: text.caption, fontWeight: 600, lineHeight: 1.3, paddingBlock: 0, paddingInline: space.xs, ...FRAME, color: "var(--muted)" },
  st: { fontSize: text.ui, color: "var(--muted)" }, // status words stay neutral; the score carries the zone color
  // 44px target around a small glyph; negative margins keep the line height; the focus ring stays inside it
  infoBtn: {
    margin: "-12px -12px -12px auto", width: 44, height: 44, display: "grid", placeItems: "center", lineHeight: 1,
    color: { default: "var(--faint)", ":is([aria-expanded=true])": "var(--ink)", ":hover": HOVER },
    backgroundColor: "transparent", borderStyle: "none", cursor: "pointer",
    outlineOffset: { default: null, ":focus-visible": "-6px" },
  },
  sparkwrap: { gridArea: "spark", display: "flex", alignItems: "center", gap: space.md, marginTop: space.sm },
  spark: { flex: 1, height: 28, display: "block" },
  sc: { fontSize: text.ui, fontWeight: 600, color: "var(--faint)", minWidth: 52, textAlign: "right" },
  info: { gridArea: "info", fontSize: text.ui, color: "var(--muted)", lineHeight: 1.6, textWrap: "pretty", marginTop: space.sm, backgroundColor: "var(--surface)", padding: space.md, ...FRAME_SOFT },
  rd: { display: "block", marginTop: space.sm, paddingTop: space.sm, borderTopWidth: 1, borderTopStyle: "dashed", borderTopColor: "var(--line-soft)", fontSize: text.caption, color: "var(--faint)" },

  /* ---------- chart: tabs wrap instead of scrolling sideways, so every chart stays visible ---------- */
  tabs: { display: "flex", flexWrap: "wrap", columnGap: space.xs, ...RULE_BOTTOM },
  tab: {
    fontSize: text.ui, fontWeight: 600, backgroundColor: "transparent", borderStyle: "none", cursor: "pointer", whiteSpace: "nowrap", minHeight: 44,
    color: { default: "var(--muted)", [PRESSED]: "var(--ink)", ":hover": HOVER },
    borderBottomStyle: "solid", borderBottomWidth: 2, borderBottomColor: { default: "transparent", [PRESSED]: "var(--btc)" },
    paddingBlock: space.md, paddingInline: space.sm, transition: "color .18s, border-color .18s",
  },
  chartBox: { position: "relative", height: { default: 230, [mq.tablet]: 300, [mq.desktop]: 340 }, marginTop: space.md },
  chartFail: { position: "absolute", inset: 0, display: "grid", placeItems: "center", margin: 0, padding: space.lg, ...FRAME_SOFT, fontSize: text.ui, lineHeight: 1.6, color: "var(--muted)", textAlign: "center" },

  /* ---------- option rows (chart range, backtest horizon, DCA start): one style, left-aligned. Padding makes
     every target at least 44px wide; the negative margin lines the first label up with the text edge ---------- */
  opts: { display: "flex", flexWrap: "wrap", marginLeft: `calc(-1 * ${space.md})` },
  ranges: { marginTop: space.sm },
  btH: { marginBottom: space.sm },
  opt: {
    position: "relative", fontSize: text.ui, fontWeight: 600, backgroundColor: "transparent", borderStyle: "none", cursor: "pointer",
    color: { default: "var(--faint)", [PRESSED]: "var(--ink)", ":hover": HOVER },
    paddingBlock: space.sm, paddingInline: space.md, minWidth: 44, minHeight: 44, transition: "color .18s",
    // the underline stays the width of the label
    "::after": { content: { default: null, [PRESSED]: '""' }, position: "absolute", left: space.md, right: space.md, bottom: 0, borderBottomWidth: 1.5, borderBottomStyle: "solid", borderBottomColor: "var(--ink)" },
  },

  /* ---------- backtest ---------- */
  btHead: { lineHeight: 1.55, marginBottom: space.md },
  btNote: { color: "var(--faint)", fontSize: text.caption },
  btRows: { ...RULE_TOP, maxWidth: { default: null, [mq.desktop]: "40rem" } },
  btRow: {
    display: "grid", gridTemplateColumns: "1fr auto auto", rowGap: space.sm, columnGap: space.md, alignItems: "baseline",
    paddingBlock: space.md, ...SOFT_BOTTOM, fontSize: text.ui,
  },
  btRowOn: { marginInline: `calc(-1 * ${space.sm})`, paddingInline: space.sm, backgroundColor: "var(--line-soft)" },
  btZ: { fontWeight: 600 },
  btM: { fontWeight: 700, fontSize: text.body, textAlign: "right" },
  btMThin: { fontWeight: 600 }, // too few non-overlapping periods: shown, not emphasised
  btW: { fontSize: text.caption, color: "var(--muted)", textAlign: "right", minWidth: 74 },
  method: { marginTop: space.xs },
  summary: { cursor: "pointer", fontSize: text.ui, color: { default: "var(--muted)", ":hover": HOVER }, paddingBlock: space.md, width: "fit-content" },
  note: { fontSize: text.caption, color: "var(--faint)", lineHeight: 1.6, maxWidth: "65ch", textWrap: "pretty" },

  /* ---------- data tables (DCA simulator, similar periods). Spacing lives inside the cells so row rules run
     unbroken. Below 17rem of column (small phones at large text) each row stacks: the label, then one line
     per value with its column name ---------- */
  tbl: {
    display: "grid", gridTemplateColumns: { default: "auto repeat(3, minmax(0, 1fr))", [mq.colbStack]: "minmax(0, 1fr)" },
    ...RULE_TOP, fontSize: text.ui, maxWidth: { default: null, [mq.desktop]: "40rem" },
  },
  cell: { paddingBlock: space.md, ...SOFT_BOTTOM },
  th: { fontSize: text.caption, fontWeight: 600, color: "var(--muted)", display: { default: null, [mq.colbStack]: "none" } },
  thNum: { textAlign: "right", paddingLeft: { default: space.md, [mq.colbStack]: 0 } },
  tr: { fontWeight: 600, paddingBottom: { default: space.md, [mq.colbStack]: 0 }, borderBottomStyle: { default: "solid", [mq.colbStack]: "none" } }, // stacked: the label heads its values
  num: {
    textAlign: "right", fontWeight: 600,
    paddingLeft: { default: space.md, [mq.colbStack]: 0 },
    display: { default: null, [mq.colbStack]: "flex" },
    justifyContent: { default: null, [mq.colbStack]: "space-between" },
    gap: { default: null, [mq.colbStack]: space.md },
    "::before": { content: { default: null, [mq.colbStack]: "attr(data-l)" }, fontWeight: 400, color: "var(--muted)", textAlign: "left" },
  },
  win: { color: "var(--z-good)" },
  empty: { gridColumn: "1 / -1", fontWeight: 400, color: "var(--muted)" },

  /* ---------- heatmap: 2px cell gutters; rows as tall as the cells so the year labels line up ---------- */
  hm: {
    "--c": { default: ".9375rem", [mq.tablet]: "1.1875rem" },
    display: "grid", gridTemplateColumns: "auto repeat(12, minmax(0, 1fr))", gap: 2, marginTop: space.md,
  },
  hmY: { fontSize: text.caption, lineHeight: "var(--c)", color: "var(--faint)", paddingRight: space.sm, textAlign: "right" },
  hmH: { fontSize: text.caption, color: "var(--faint)", textAlign: "center", paddingBottom: space.xs },
  hmHMinor: { visibility: { default: null, [mq.colbQuarters]: "hidden" } }, // 12 numbers don't fit: label quarters (1 4 7 10)
  hmM: { height: "var(--c)", borderRadius: 1, backgroundColor: "var(--line-soft)", position: "relative" },
  // not color alone: pricey/expensive cells are hatched, halving months carry a dot (the key shows both)
  hot: { backgroundImage: "repeating-linear-gradient(135deg, var(--hatch) 0 1.5px, transparent 1.5px 4.5px)" },
  hv: { "::after": { content: '""', position: "absolute", top: "50%", left: "50%", width: 5, height: 5, margin: "-2.5px 0 0 -2.5px", borderRadius: "50%", backgroundColor: "var(--bg)" } },
  hmKey: { "--c": ".9375rem", display: "flex", flexWrap: "wrap", rowGap: space.xs, columnGap: space.lg, marginTop: space.md, fontSize: text.caption, color: "var(--muted)" },
  keyItem: { display: "inline-flex", alignItems: "center", gap: space.sm },
  swatch: { position: "relative", flex: "0 0 auto", width: "var(--c)", height: "var(--c)", borderRadius: 1 }, // swatch = cell size

  foot: { marginTop: space.x3, paddingTop: space.lg, ...RULE_TOP, fontSize: text.caption, lineHeight: 1.7, color: "var(--muted)", textWrap: "pretty" },

  /* ---------- loading: the shell shows at once and each empty data slot holds its size (--h), so nothing
     jumps when data lands. Text slots show faint lines, tables their rulings, one slow pulse says "working" ---------- */
  sk: {
    minHeight: { default: null, [busy]: { default: null, ":empty": "var(--h)" } },
    animationName: { default: null, [loading]: { default: null, ":empty": { default: pulse, [mq.reduce]: "none" } } },
    animationDuration: "1.2s", animationTimingFunction: "ease-in-out", animationIterationCount: "infinite", animationDirection: "alternate",
    opacity: { default: null, [failed]: { default: null, ":empty": 0.5 } },
  },
  skText: { backgroundImage: { default: null, [busy]: { default: null, ":empty": "repeating-linear-gradient(transparent 0 .3lh, var(--line-soft) .3lh .8lh, transparent .8lh 1lh)" } } },
  skBar: { backgroundSize: "12rem 100%", backgroundRepeat: "no-repeat", backgroundPosition: { default: "top", [mq.colaWide]: "left top" } }, // verdict lines: short, centred like the text
  skRule: { backgroundImage: { default: null, [busy]: { default: null, ":empty": "repeating-linear-gradient(transparent 0 calc(var(--p) - 1px), var(--line-soft) calc(var(--p) - 1px) var(--p))" } } },
  skHm: { backgroundImage: { default: null, [busy]: { default: null, ":empty": "repeating-linear-gradient(var(--line-soft) 0 var(--c), transparent var(--c) calc(var(--c) + 2px))" } } },
  skChart: {
    backgroundImage: { default: null, [busy]: "repeating-linear-gradient(transparent 0 calc(25% - 1px), var(--line-soft) calc(25% - 1px) 25%)" },
    animationName: { default: null, [loading]: { default: pulse, [mq.reduce]: "none" } },
    animationDuration: "1.2s", animationTimingFunction: "ease-in-out", animationIterationCount: "infinite", animationDirection: "alternate",
    opacity: { default: null, [failed]: 0.5 },
  },
  sparkPh: {
    backgroundColor: "var(--line-soft)",
    animationName: { default: null, [loading]: { default: pulse, [mq.reduce]: "none" } },
    animationDuration: "1.2s", animationTimingFunction: "ease-in-out", animationIterationCount: "infinite", animationDirection: "alternate",
    opacity: { default: null, [failed]: 0.5 },
  },
  /* first-visit placeholder heights, measured with real data at 375 / 768 / 1280px in TH and EN; after one load
     app.js remembers this device's real heights (skSave) and sets them inline, which wins. --p: table row pitch */
  hZoneth: { "--h": { default: "1lh", [mq.phone]: { default: null, ":lang(en)": "2lh" } } },
  hAsof: { "--h": "2lh" },
  hDca: { "--h": { default: "2lh", [mq.phone]: { default: null, ":lang(en)": "3lh" }, [mq.tablet]: { default: null, ":lang(th)": "1lh" }, [mq.desktop]: { default: null, ":lang(th)": "2lh" } } },
  hInval: { "--h": { default: "3lh", [mq.tablet]: "2lh", [mq.desktop]: { default: "2lh", ":lang(en)": "3lh" } } },
  hBthead: { "--h": { default: "3lh", [mq.tablet]: "2lh" } },
  hBt: { "--h": "15.9rem", "--p": "3.18rem" },
  hDcaGrid: { "--h": { default: "8.85rem", [mq.phone]: { default: null, ":lang(en)": "10.15rem" } }, "--p": "2.95rem" },
  hCyc: { "--h": { default: "11.8rem", [mq.phone]: { default: null, ":lang(en)": "13.1rem" } }, "--p": "2.95rem" },
  hHm: { "--h": { default: "15.4rem", [mq.tablet]: "18.6rem" } },
});
