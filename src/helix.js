/* Halving helix (ADR-022): every day of BTC's price wound around a vertical axis, one turn per halving cycle,
   so the same stage of every cycle lines up. Angle = where in its cycle the day falls (0 at the halving,
   clockwise from above), distance from the axis = price on a log scale, height = time, color = the score's zone.
   Its own bundle (/helix.js, three.js inside), loaded by app.js only when the section nears the viewport.
   app.js owns the data, the words and the DOM; this file only draws, and only on demand (drag, arrow keys,
   a view change, a resize, the theme or the language), never in a loop.
   window.BTCHelix(o) -> { view, setTheme, setText }, or null when there is no WebGL. */
import { WebGLRenderer, Scene, PerspectiveCamera, BufferGeometry, Float32BufferAttribute, LineBasicMaterial,
  LineSegments, Color, Vector3, SRGBColorSpace } from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";

const TAU = 2 * Math.PI, PITCH = 2;                    // PITCH: height of one turn
const rad = (p) => 0.9 + 0.8 * (Math.log10(p) + 1.5);  // price -> distance from the axis: $0.03 at 0.9, each x10 +0.8
const RINGS = [1, 100, 1e4, 1e6];                      // price rings on the floor
const SPOKES = [0, 0.25, 0.5, 0.75];                   // the halving, then about +1, +2, +3 years
// the named views: [camera elevation, turn] in radians. From above the halving sits at 12 o'clock, like a clock face
const VIEW = { tilt: [0.62, 0.6], top: [1.52, 0], side: [0.08, 0.6] };
const ease = (k) => 1 - Math.pow(1 - k, 4);            // ease-out-quart

/* a CSS color -> [Color, alpha]. The tokens arrive minified (#rrggbbaa), which THREE.Color can't read;
   the 2D canvas normalizes any color to "#rrggbb" or "rgba(r, g, b, a)" */
const norm = document.createElement("canvas").getContext("2d");
function parse(css) {
  norm.fillStyle = "#000"; norm.fillStyle = css;
  const s = norm.fillStyle;
  if (s[0] === "#") return [new Color(s), 1];
  const [r, g, b, a] = s.match(/[\d.]+/g).map(Number);
  return [new Color().setRGB(r / 255, g / 255, b / 255, SRGBColorSpace), a];
}

/* o: { canvas, layer, tip, cls: {label, year, now, dot}, turn[] (cycle + fraction per day), p[] (price),
   z[] (zone key per day), marks[] (first day of each halving cycle), view, palette, grid, text, tipText(i) } */
function mount(o) {
  let renderer;
  try { renderer = new WebGLRenderer({ canvas: o.canvas, antialias: true, alpha: true }); }
  catch (e) { return null; } // no WebGL: app.js says so and keeps the summary
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new Scene(), camera = new PerspectiveCamera(24, 1, 0.1, 300), cv = o.canvas;

  /* ---- the helix, centred on its own height ---- */
  const n = o.turn.length, pos = new Float32Array(n * 3);
  const y0 = o.turn[0] * PITCH, y1 = o.turn[n - 1] * PITCH, top = (y1 - y0) / 2, floor = -top - 0.35;
  for (let i = 0; i < n; i++) {
    const th = o.turn[i] * TAU, r = rad(o.p[i]);
    pos.set([r * Math.sin(th), o.turn[i] * PITCH - (y0 + y1) / 2, -r * Math.cos(th)], i * 3);
  }
  const lineGeo = new LineGeometry();
  lineGeo.setPositions(pos);
  const lineMat = new LineMaterial({ vertexColors: true, linewidth: 2 }); // px
  scene.add(new Line2(lineGeo, lineMat));

  /* ---- the floor: price rings, cycle spokes; and the axis, where time runs up ---- */
  const R = rad(RINGS[RINGS.length - 1]) + 0.3, at = (r, f) => [r * Math.sin(f * TAU), floor, -r * Math.cos(f * TAU)];
  const soft = [], strong = [0, floor, 0, 0, top + 0.3, 0];
  for (const p of RINGS) for (let k = 0; k < 96; k++) soft.push(...at(rad(p), k / 96), ...at(rad(p), (k + 1) / 96));
  for (const f of SPOKES) (f ? soft : strong).push(...at(0.5, f), ...at(R, f));
  const segs = (list) => new BufferGeometry().setAttribute("position", new Float32BufferAttribute(list, 3));
  const softMat = new LineBasicMaterial({ transparent: true }), strongMat = new LineBasicMaterial({ transparent: true });
  scene.add(new LineSegments(segs(soft), softMat), new LineSegments(segs(strong), strongMat));

  /* ---- HTML labels pinned to 3D points (crisp text, the page's font). Each shows from a camera elevation up:
     price rings once the floor isn't edge-on, the cycle spokes only from above, where they don't cross the helix ---- */
  const labels = [], v = new Vector3();
  const add = (tag, cls) => { const el = document.createElement(tag); el.className = cls; o.layer.appendChild(el); return el; };
  const label = (xyz, cls, minEl, shift = " translate(-50%,-50%)") => { const L = { p: new Vector3(...xyz), el: add("span", cls), minEl, shift }; labels.push(L); return L; };
  const ringL = RINGS.map(() => label([0, 0, 0], o.cls.label, 0.2)); // placed per view, see render()
  // spoke names float at the helix's top: from above, perspective pushes the newest turn out past the floor's edge
  const spokeL = SPOKES.map((f) => { const L = label(at(R + 0.45, f), o.cls.label, 1); L.p.y = top + 0.3; return L; });
  const yearL = o.marks.map((i) => label(pos.subarray(i * 3, i * 3 + 3), o.cls.year, 0));
  const nowL = label(pos.subarray(n * 3 - 3), o.cls.now, 0, " translate(.75rem,-50%)");
  const nowDot = add("i", o.cls.dot), tipDot = add("i", o.cls.dot);

  /* ---- camera: orbits the centre at a fixed distance that fits the whole cylinder, so turning never zooms ---- */
  let [el, az] = VIEW[o.view] || VIEW.tilt, w = 0, h = 0, raf = 0, screen = null;
  const fit = Math.hypot(R + 0.8, top + 0.6);
  const toScreen = (p) => {
    v.copy(p).project(camera);
    return v.z < 1 && Math.abs(v.x) <= 1.05 && Math.abs(v.y) <= 1.05 && [((v.x + 1) / 2) * w, ((1 - v.y) / 2) * h];
  };
  const put = (e, xy, shift = "") => { e.hidden = !xy; if (xy) e.style.transform = `translate(${xy[0]}px,${xy[1]}px)${shift}`; };
  const hideTip = () => { o.tip.hidden = tipDot.hidden = true; };
  const render = () => {
    if (!w) return;
    const half = Math.atan(Math.tan((camera.fov * Math.PI) / 360) * Math.min(1, camera.aspect)), d = (1.04 * fit) / Math.sin(half);
    camera.position.set(d * Math.cos(el) * Math.sin(az), d * Math.sin(el), d * Math.cos(el) * Math.cos(az));
    camera.lookAt(0, -1.2 * Math.sin(2 * el), 0); // ponytail: aim a little low when tilted, where perspective enlarges the near floor
    renderer.render(scene, camera);
    screen = null; hideTip();
    const side = (Math.PI / 2 - az + 0.35) / TAU; // price labels: the floor's front right, as seen now
    ringL.forEach((L, i) => L.p.set(...at(rad(RINGS[i]), side)));
    for (const L of labels) put(L.el, el >= L.minEl && toScreen(L.p), L.shift);
    put(nowDot, toScreen(nowL.p));
  };

  /* ---- pointing at the line: the nearest day on screen within 16px ---- */
  const pick = (x, y) => {
    if (!screen) {
      screen = new Float32Array(n * 2);
      for (let i = 0; i < n; i++) { v.fromArray(pos, i * 3).project(camera); screen[i * 2] = ((v.x + 1) / 2) * w; screen[i * 2 + 1] = ((1 - v.y) / 2) * h; }
    }
    let best = -1, bd = 256;
    for (let i = 0; i < n; i++) { const dx = screen[i * 2] - x, dy = screen[i * 2 + 1] - y, dd = dx * dx + dy * dy; if (dd < bd) { bd = dd; best = i; } }
    if (best < 0) return hideTip();
    const sx = screen[best * 2], sy = screen[best * 2 + 1], t = o.tip;
    t.textContent = o.tipText(best); t.hidden = tipDot.hidden = false;
    const tw = t.offsetWidth, th = t.offsetHeight;
    put(t, [Math.max(0, Math.min(w - tw, sx - tw / 2)), sy - th - 12 < 0 ? sy + 12 : sy - th - 12]);
    put(tipDot, [sx, sy]);
  };

  /* ---- drag to turn. Touch turns sideways only, so a vertical swipe still scrolls the page (touch-action: pan-y) ---- */
  let drag = null;
  const local = (ev) => { const b = cv.getBoundingClientRect(); return [ev.clientX - b.left, ev.clientY - b.top]; };
  const clampEl = (e) => Math.min(VIEW.top[0], Math.max(VIEW.side[0], e));
  cv.addEventListener("pointerdown", (ev) => {
    drag = { x: ev.clientX, y: ev.clientY, az, el, moved: false, touch: ev.pointerType === "touch" };
    cv.setPointerCapture(ev.pointerId);
  });
  cv.addEventListener("pointermove", (ev) => {
    if (!drag) return pick(...local(ev));
    const dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
    if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 5) return;
    drag.moved = true; cancelAnimationFrame(raf);
    az = drag.az - dx * 0.008;
    if (!drag.touch) el = clampEl(drag.el + dy * 0.006);
    render();
  });
  cv.addEventListener("pointerup", (ev) => { if (drag && !drag.moved) pick(...local(ev)); drag = null; }); // a tap shows the day
  cv.addEventListener("pointercancel", () => { drag = null; });
  cv.addEventListener("pointerleave", (ev) => { if (!drag && ev.pointerType !== "touch") hideTip(); }); // touch "leaves" right after a tap
  cv.addEventListener("keydown", (ev) => {
    const k = { ArrowLeft: [0.2, 0], ArrowRight: [-0.2, 0], ArrowUp: [0, 0.15], ArrowDown: [0, -0.15] }[ev.key];
    if (!k) return;
    ev.preventDefault(); cancelAnimationFrame(raf);
    az += k[0]; el = clampEl(el + k[1]); render();
  });
  new ResizeObserver(() => {
    w = cv.clientWidth; h = cv.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); lineMat.resolution.set(w, h);
    render();
  }).observe(cv);

  const api = {
    /* a named view: "tilt", "top" (the cycles stacked: compare them), "side" (a timeline). It turns the short way
       round; instant under reduced motion */
    view(name) {
      const [toEl, toAz] = VIEW[name] || VIEW.tilt, e0 = el, a0 = az, da = ((((toAz - az) % TAU) + TAU + Math.PI) % TAU) - Math.PI, t0 = performance.now();
      cancelAnimationFrame(raf);
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) { el = toEl; az = toAz; return render(); }
      const tick = (now) => { const k = Math.min(1, (now - t0) / 700), e = ease(k); el = e0 + (toEl - e0) * e; az = a0 + da * e; render(); if (k < 1) raf = requestAnimationFrame(tick); };
      raf = requestAnimationFrame(tick);
    },
    /* palette: zone key -> CSS color for the line ("none": days without a score); grid: { soft, strong } CSS colors */
    setTheme(palette, grid) {
      const c = {}, cols = new Float32Array(n * 3);
      for (const k in palette) c[k] = parse(palette[k])[0];
      for (let i = 0; i < n; i++) { const col = c[o.z[i]] || c.none; cols.set([col.r, col.g, col.b], i * 3); }
      lineGeo.setColors(cols);
      for (const [m, css] of [[softMat, grid.soft], [strongMat, grid.strong]]) { const [col, a] = parse(css); m.color.copy(col); m.opacity = a; }
      render();
    },
    /* words: { rings: [4], spokes: [4], years: [one per mark], now } */
    setText(t) {
      ringL.forEach((L, i) => (L.el.textContent = t.rings[i]));
      spokeL.forEach((L, i) => (L.el.textContent = t.spokes[i]));
      yearL.forEach((L, i) => (L.el.textContent = t.years[i]));
      nowL.el.textContent = t.now;
      render();
    },
  };
  api.setTheme(o.palette, o.grid); api.setText(o.text);
  cv.dataset.ready = ""; // styles.js fades the canvas in
  return api;
}

window.BTCHelix = mount;
