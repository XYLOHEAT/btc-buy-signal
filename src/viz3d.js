/* 3D views (ADR-022, ADR-023): the halving spiral, and fields of bars (the monthly score in relief, the six indices
   over time). One bundle with three.js inside; app.js injects it when the first 3D view is wanted, and owns the data,
   the words, the colors and the DOM. This file only draws, and only on demand (drag, arrow keys, a view change, a
   resize, the theme or the language), never in a loop.
   window.BTC3D = { helix(o), bars(o) }: each returns its API, or null when there is no WebGL. */
import { WebGLRenderer, Scene, PerspectiveCamera, BufferGeometry, Float32BufferAttribute, LineBasicMaterial,
  LineSegments, Color, Vector2, Vector3, Object3D, SRGBColorSpace, InstancedMesh, BoxGeometry, MeshLambertMaterial,
  AmbientLight, DirectionalLight, Raycaster } from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";

const TAU = 2 * Math.PI;
const ease = (k) => 1 - Math.pow(1 - k, 4); // ease-out-quart

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
const paint = (m, css) => { const [c, a] = parse(css); m.color.copy(c); m.opacity = a; };
const colors = (pal) => { const c = {}; for (const k in pal) c[k] = parse(pal[k])[0]; return c; };
const segs = (list) => new BufferGeometry().setAttribute("position", new Float32BufferAttribute(list, 3));

/* One canvas: the renderer; a camera orbiting the centre at a fixed distance, so turning never zooms (fit(half
   vertical fov, half horizontal fov, canvas width) -> distance); drag and arrow keys; named views [elevation, turn]; HTML labels
   pinned to 3D points (crisp text in the page's font); a tooltip. The content fills `scene` and sets
   `pick(x, y, ndcX, ndcY) -> {i, p} | null`; `before()` runs ahead of each frame */
function stage(o, fit, views, aim = () => 0) {
  let renderer;
  try { renderer = new WebGLRenderer({ canvas: o.canvas, antialias: true, alpha: true }); }
  catch (e) { return null; } // no WebGL: app.js says so
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const cv = o.canvas, camera = new PerspectiveCamera(24, 1, 0.1, 500), v = new Vector3();
  const S = { scene: new Scene(), camera, mats: [], labels: [], pick: () => null, before: () => {} };
  let [el, az] = views[o.view] || Object.values(views)[0], w = 0, h = 0, raf = 0, drag = null;
  const clampEl = (e) => Math.min(1.52, Math.max(0.08, e));

  const add = (cls) => { const e = document.createElement("span"); e.className = cls; o.layer.appendChild(e); return e; };
  /* a label pinned to a 3D point, shown while the camera's elevation is within [min, max]. Labels sharing a `group`
     skip any that would overlap the last one shown, so years, months and names thin out on small screens */
  S.label = (xyz, cls, { min = 0, max = 2, shift = " translate(-50%,-50%)", group } = {}) => {
    const L = { p: new Vector3(...xyz), el: add(cls), min, max, shift, group };
    S.labels.push(L);
    return L;
  };
  S.measure = () => { for (const L of S.labels) L.el.hidden = false; for (const L of S.labels) { L.w = L.el.offsetWidth; L.h = L.el.offsetHeight; } };
  S.project = (p) => {
    v.copy(p).project(camera);
    return v.z < 1 && Math.abs(v.x) <= 1.05 && Math.abs(v.y) <= 1.05 && [((v.x + 1) / 2) * w, ((1 - v.y) / 2) * h];
  };
  const put = (e, xy, shift = "") => { e.hidden = !xy; if (xy) e.style.transform = `translate(${xy[0]}px,${xy[1]}px)${shift}`; };
  const tipDot = add(o.cls.dot), hideTip = () => { o.tip.hidden = tipDot.hidden = true; };
  S.tip = (i, p) => {
    const xy = S.project(p), t = o.tip;
    if (!xy) return hideTip();
    t.textContent = o.tipText(i); t.hidden = tipDot.hidden = false;
    const tw = t.offsetWidth, th = t.offsetHeight;
    put(t, [Math.max(0, Math.min(w - tw, xy[0] - tw / 2)), xy[1] - th - 12 < 0 ? xy[1] + 12 : xy[1] - th - 12]);
    put(tipDot, xy);
  };

  S.render = () => {
    if (!w) return;
    const hv = (camera.fov * Math.PI) / 360, d = fit(hv, Math.atan(Math.tan(hv) * camera.aspect), w);
    camera.position.set(d * Math.cos(el) * Math.sin(az), d * Math.sin(el), d * Math.cos(el) * Math.cos(az));
    camera.lookAt(0, aim(el), 0);
    S.before(el, az);
    renderer.render(S.scene, camera);
    hideTip();
    const last = {};
    for (const L of S.labels) {
      let xy = el >= L.min && el <= L.max && S.project(L.p);
      const q = xy && L.group && last[L.group];
      if (q && Math.abs(q[0] - xy[0]) < (q[2] + L.w) / 2 + 6 && Math.abs(q[1] - xy[1]) < (q[3] + L.h) / 2) xy = false;
      if (xy && L.group) last[L.group] = [xy[0], xy[1], L.w, L.h];
      put(L.el, xy, L.shift);
    }
  };

  /* point or tap: the tooltip. Drag to turn; touch turns sideways only, so a vertical swipe still scrolls the page
     (touch-action: pan-y) */
  const point = (ev) => {
    const b = cv.getBoundingClientRect(), x = ev.clientX - b.left, y = ev.clientY - b.top, r = S.pick(x, y, (x / w) * 2 - 1, 1 - (y / h) * 2);
    r ? S.tip(r.i, r.p) : hideTip();
  };
  cv.addEventListener("pointerdown", (ev) => {
    drag = { x: ev.clientX, y: ev.clientY, az, el, moved: false, touch: ev.pointerType === "touch" };
    cv.setPointerCapture(ev.pointerId);
  });
  cv.addEventListener("pointermove", (ev) => {
    if (!drag) return point(ev);
    const dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
    if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 5) return;
    drag.moved = true; cancelAnimationFrame(raf);
    az = drag.az - dx * 0.008;
    if (!drag.touch) el = clampEl(drag.el + dy * 0.006);
    S.render();
  });
  cv.addEventListener("pointerup", (ev) => { if (drag && !drag.moved) point(ev); drag = null; }); // a tap shows the value
  cv.addEventListener("pointercancel", () => { drag = null; });
  cv.addEventListener("pointerleave", (ev) => { if (!drag && ev.pointerType !== "touch") hideTip(); }); // touch "leaves" right after a tap
  cv.addEventListener("keydown", (ev) => {
    const k = { ArrowLeft: [0.2, 0], ArrowRight: [-0.2, 0], ArrowUp: [0, 0.15], ArrowDown: [0, -0.15] }[ev.key];
    if (!k) return;
    ev.preventDefault(); cancelAnimationFrame(raf);
    az += k[0]; el = clampEl(el + k[1]); S.render();
  });
  new ResizeObserver(() => {
    w = cv.clientWidth; h = cv.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    for (const m of S.mats) m.resolution.set(w, h);
    S.render();
  }).observe(cv);

  /* turn to [elevation, turn] the short way round, then done(); instant under reduced motion */
  S.go = ([toEl, toAz], done = () => {}) => {
    const e0 = el, a0 = az, da = ((((toAz - az) % TAU) + TAU + Math.PI) % TAU) - Math.PI, t0 = performance.now();
    cancelAnimationFrame(raf);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { el = toEl; az = a0 + da; S.render(); return done(); }
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / 700), e = ease(k);
      el = e0 + (toEl - e0) * e; az = a0 + da * e; S.render();
      k < 1 ? (raf = requestAnimationFrame(tick)) : done();
    };
    raf = requestAnimationFrame(tick);
  };
  S.view = (name) => S.go(views[name] || Object.values(views)[0]);
  S.ready = () => { cv.dataset.ready = ""; }; // styles.js fades the canvas in
  return S;
}

/* The halving spiral (ADR-022): every priced day wound around a vertical axis, one turn per halving cycle, so the
   same stage of every cycle lines up. o.turn = cycle + fraction per day, o.p = price, o.z = zone key, o.marks = first
   day of each halving cycle. Angle = how far into its cycle (0 at the halving, clockwise from above), distance from
   the axis = log price, height = time */
function helix(o) {
  const PITCH = 2, rad = (p) => 0.9 + 0.8 * (Math.log10(p) + 1.5); // price -> radius: $0.03 at 0.9, each x10 +0.8
  const RINGS = [1, 100, 1e4, 1e6], SPOKES = [0, 0.25, 0.5, 0.75]; // price rings; the halving, then about +1, +2, +3 years
  const n = o.turn.length, pos = new Float32Array(n * 3);
  const y0 = o.turn[0] * PITCH, y1 = o.turn[n - 1] * PITCH, top = (y1 - y0) / 2, floor = -top - 0.35, R = rad(RINGS[3]) + 0.3;
  // from above the halving sits at 12 o'clock, like a clock face; tilted, aim a little low, where perspective enlarges the near floor
  const VIEWS = { tilt: [0.62, 0.6], top: [1.52, 0], side: [0.08, 0.6] }, r0 = Math.hypot(R + 0.8, top + 0.6);
  const S = stage(o, (hv, hh) => (1.04 * r0) / Math.sin(Math.min(hv, hh)), VIEWS, (el) => -1.2 * Math.sin(2 * el));
  if (!S) return null;
  for (let i = 0; i < n; i++) {
    const th = o.turn[i] * TAU, r = rad(o.p[i]);
    pos.set([r * Math.sin(th), o.turn[i] * PITCH - (y0 + y1) / 2, -r * Math.cos(th)], i * 3);
  }
  const lineGeo = new LineGeometry().setPositions(pos), lineMat = new LineMaterial({ vertexColors: true, linewidth: 2 }); // px
  // a chosen stretch (app.js: a similar period, a heatmap month), over everything, in the selection color
  const selMat = new LineMaterial({ linewidth: 4, depthTest: false });
  let sel = null;
  S.mats.push(lineMat, selMat);
  S.scene.add(new Line2(lineGeo, lineMat));

  /* the floor: price rings, cycle spokes; and the axis, where time runs up */
  const at = (r, f, y = floor) => [r * Math.sin(f * TAU), y, -r * Math.cos(f * TAU)];
  const soft = [], strong = [0, floor, 0, 0, top + 0.3, 0];
  for (const p of RINGS) for (let k = 0; k < 96; k++) soft.push(...at(rad(p), k / 96), ...at(rad(p), (k + 1) / 96));
  for (const f of SPOKES) (f ? soft : strong).push(...at(0.5, f), ...at(R, f));
  const softMat = new LineBasicMaterial({ transparent: true }), strongMat = new LineBasicMaterial({ transparent: true });
  S.scene.add(new LineSegments(segs(soft), softMat), new LineSegments(segs(strong), strongMat));

  /* labels: price rings on the floor's front right as seen now; spoke names only from above, level with the top of the
     helix (perspective pushes the newest turn out past the floor's edge); each halving; today */
  const ringL = RINGS.map(() => S.label([0, 0, 0], o.cls.label, { min: 0.2 }));
  const spokeL = SPOKES.map((f) => S.label(at(R + 0.45, f, top + 0.3), o.cls.label, { min: 1 }));
  const yearL = o.marks.map((i) => S.label(pos.subarray(i * 3, i * 3 + 3), o.cls.strong));
  S.label(pos.subarray(n * 3 - 3), o.cls.dot, { shift: "" });
  const nowL = S.label(pos.subarray(n * 3 - 3), o.cls.now, { shift: " translate(.75rem,-50%)" });

  /* pointing: the nearest day on screen within 16px (screen positions cached until the next frame) */
  let screen = null;
  const p3 = (i) => new Vector3().fromArray(pos, i * 3);
  S.before = (el, az) => {
    screen = null;
    const f = (Math.PI / 2 - az + 0.35) / TAU;
    ringL.forEach((L, i) => L.p.set(...at(rad(RINGS[i]), f)));
  };
  S.pick = (x, y) => {
    if (!screen) screen = Array.from({ length: n }, (_, i) => S.project(p3(i)));
    let best = -1, bd = 256;
    for (let i = 0; i < n; i++) { const s = screen[i]; if (!s) continue; const dd = (s[0] - x) ** 2 + (s[1] - y) ** 2; if (dd < bd) { bd = dd; best = i; } }
    return best < 0 ? null : { i: best, p: p3(best) };
  };

  const api = {
    /* "tilt", "top" (the cycles stacked: compare them), "side" (a timeline) */
    view: S.view,
    /* light days i0..i1 and turn them to face the camera, then show the middle day */
    focus(i0, i1) {
      if (sel) { S.scene.remove(sel); sel.geometry.dispose(); }
      sel = new Line2(new LineGeometry().setPositions(pos.subarray(i0 * 3, (i1 + 1) * 3)), selMat);
      sel.renderOrder = 1;
      S.scene.add(sel);
      const mid = (i0 + i1) >> 1;
      S.go([VIEWS.tilt[0], Math.PI - o.turn[mid] * TAU], () => S.tip(mid, p3(mid)));
    },
    /* palette: zone key -> CSS color ("none": days without a score, "sel": the chosen stretch); grid: { soft, strong } */
    setTheme(pal, grid) {
      const c = colors(pal), cols = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { const col = c[o.z[i]] || c.none; cols.set([col.r, col.g, col.b], i * 3); }
      lineGeo.setColors(cols);
      selMat.color.copy(c.sel);
      paint(softMat, grid.soft); paint(strongMat, grid.strong);
      S.render();
    },
    /* words: { rings: [4], spokes: [4], years: [one per mark], now } */
    setText(t) {
      ringL.forEach((L, i) => (L.el.textContent = t.rings[i]));
      spokeL.forEach((L, i) => (L.el.textContent = t.spokes[i]));
      yearL.forEach((L, i) => (L.el.textContent = t.years[i]));
      nowL.el.textContent = t.now;
      S.render();
    },
  };
  api.setTheme(o.palette, o.grid); api.setText(o.text); S.ready();
  return api;
}

/* A field of bars (ADR-023), rows × columns: o.v[row * columns + column] = 0..100 (NaN: no bar), o.z = zone key per
   cell, o.marks = cells with a dot on top, o.size = [width, depth] in world units, o.fill = the share of its cell a
   bar covers [across, deep], o.height = the height of a 100 (default 3). Row 0 is at the back: the top row, seen from
   above, as on the page. A post at the back right corner gives the height scale; row and column labels thin out when
   they would collide */
function bars(o) {
  const R = o.rows.length, C = o.cols.length, [W, D] = o.size, H = o.height || 3, Y = -H / 2, cw = W / C, rd = D / R;
  const xAt = (c) => -W / 2 + (c + 0.5) * cw, zAt = (r) => -D / 2 + (r + 0.5) * rd, hAt = (k) => Math.max(0.03, (o.v[k] / 100) * H);
  // the distance fits the field's width across, less 70px a side for the row names and the scale, and vertically its
  // tallest silhouette over the named views
  const tall = Math.max(...Object.values(o.views).map(([e]) => (D / 2) * Math.sin(e) + (H / 2) * Math.cos(e))) + 0.8;
  const S = stage(o, (hv, hh, w) => 1.08 * Math.max(W / 2 / (Math.tan(hh) * Math.max(0.4, 1 - 140 / w)), tall / Math.tan(hv)) + D / 2, o.views);
  if (!S) return null;

  const cells = [];
  for (let k = 0; k < R * C; k++) if (Number.isFinite(o.v[k])) cells.push(k);
  const mesh = new InstancedMesh(new BoxGeometry(1, 1, 1), new MeshLambertMaterial(), cells.length), m = new Object3D();
  cells.forEach((k, i) => {
    const hk = hAt(k);
    m.position.set(xAt(k % C), Y + hk / 2, zAt(Math.floor(k / C)));
    m.scale.set(cw * o.fill[0], hk, rd * o.fill[1]);
    m.updateMatrix(); mesh.setMatrixAt(i, m.matrix);
  });
  // lit from above and a little in front: tops keep the token color (ambient + sun ≈ π), sides fall to about 70%
  const sun = new DirectionalLight(0xffffff, 0.36 * Math.PI);
  sun.position.set(0.3, 1, 0.6);
  const frame = [-W / 2, Y, -D / 2, W / 2, Y, -D / 2, W / 2, Y, -D / 2, W / 2, Y, D / 2, W / 2, Y, D / 2, -W / 2, Y, D / 2, -W / 2, Y, D / 2, -W / 2, Y, -D / 2];
  const post = [W / 2, Y, -D / 2, W / 2, Y + H, -D / 2];
  for (const f of [0.5, 1]) post.push(W / 2, Y + f * H, -D / 2, W / 2 - 0.35, Y + f * H, -D / 2);
  const softMat = new LineBasicMaterial({ transparent: true }), strongMat = new LineBasicMaterial({ transparent: true });
  S.scene.add(mesh, new AmbientLight(0xffffff, 0.68 * Math.PI), sun, new LineSegments(segs(frame), softMat), new LineSegments(segs(post), strongMat));

  // row names clear of the row behind, whose bars rise above this row's floor
  o.rows.forEach((t, r) => { S.label([-W / 2 - 1.3, Y, zAt(r)], o.cls.label, { shift: " translate(-100%,-50%)", group: "rows" }).el.textContent = t; });
  o.cols.forEach((t, c) => { if (t) S.label([xAt(c), Y, D / 2 + 0.55], o.cls.label, { group: "cols" }).el.textContent = t; });
  // from above the post is a point; on a short post "100" wins
  [[1, "100"], [0.5, "50"]].forEach(([f, t]) => { S.label([W / 2, Y + f * H, -D / 2], o.cls.label, { max: 1.2, shift: " translate(.4rem,-50%)", group: "scale" }).el.textContent = t; });
  for (const k of o.marks) S.label([xAt(k % C), Y + hAt(k) + 0.02, zAt(Math.floor(k / C))], o.cls.mark, { shift: "" });
  S.measure();

  const ray = new Raycaster(), ndc = new Vector2();
  S.pick = (x, y, nx, ny) => {
    ray.setFromCamera(ndc.set(nx, ny), S.camera);
    const hit = ray.intersectObject(mesh)[0];
    if (!hit) return null;
    const k = cells[hit.instanceId];
    return { i: k, p: new Vector3(xAt(k % C), Y + hAt(k), zAt(Math.floor(k / C))) };
  };

  const api = {
    view: S.view,
    /* palette: zone key -> CSS color ("none": no score); grid: { soft, strong } */
    setTheme(pal, grid) {
      const c = colors(pal);
      cells.forEach((k, i) => mesh.setColorAt(i, c[o.z[k]] || c.none));
      mesh.instanceColor.needsUpdate = true;
      paint(softMat, grid.soft); paint(strongMat, grid.strong);
      S.render();
    },
  };
  api.setTheme(o.palette, o.grid); S.ready();
  return api;
}

window.BTC3D = { helix, bars };
