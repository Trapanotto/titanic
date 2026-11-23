// Interior kit – all STAIRS of the ship (scene module) + floor-hole / keep-out helpers for deck layouts.
import * as THREE from 'three';
import { mats } from '../core/materials.js';
import { DECK_Y, STAIRS, MACHINERY_ACCESS, SLAB, ceilingY } from '../core/constants.js';
import { Batch, kitMats, overlap } from './batch.js';
import { def, place } from './props-core.js';
import { ceilingLight, ceilingRose, chandelier, pilaster, sconce } from './props-decor.js';

const RISER = 0.18;
const RAIL_H = 0.92;
const T = 0.04; // half thickness of closure walls

/** The +x end of each MACHINERY_ACCESS opening is the open (step-off) end; the other three sides get a railing. */
export const MACHINERY_ACCESS_OPEN_END = '+x';

/** Width of the panelled wall / gallery band along the long sides of an imperial well (inside `lane`). */
export const IMP_BAND = 0.08;
export const isImperial = (st) => st.type === 'imperial';
/**
 * Plan geometry of an imperial (split) staircase, see constants.js: back = aft face of the pier, x0 = landing back
 * wall, xl = front edge of the half-landing, xf = foot / arrival line, hw = outer half width (= keep-out), hwi = inner
 * half width of the well (= floor hole), cw = half width of the central flight, side flights cw + gap .. hwi.
 */
export function imperialPlan(st) {
  return { back: st.back, x0: st.x0, xl: st.x0 + st.landing, xf: st.x1, hw: st.lane, hwi: st.lane - IMP_BAND, cw: st.cw, g: st.gap, gc: st.cw + st.gap / 2, zc: st.zc };
}

let _flights = null;
/**
 * All flights of all stairs with their geometry (see constants.js for the convention). Scissor stairs: one entry per
 * flight. Imperial stairs: one entry per deck interval (`type: 'imperial'`, central flight + landing + two side flights,
 * fields of imperialPlan() plus y0, ym = half-landing height, y1).
 */
export function stairFlights() {
  if (_flights) return _flights;
  _flights = [];
  for (const st of STAIRS) {
    for (let k = 0; k < st.decks.length - 1; k++) {
      const base = { st, k, from: st.decks[k], to: st.decks[k + 1], y0: DECK_Y[st.decks[k]], y1: DECK_Y[st.decks[k + 1]], first: k === 0, last: k === st.decks.length - 2 };
      if (isImperial(st)) { _flights.push({ ...base, type: 'imperial', ym: (base.y0 + base.y1) / 2, ...imperialPlan(st) }); continue; }
      const even = k % 2 === 0;
      _flights.push({
        ...base, type: 'scissor',
        xb: even ? st.x0 : st.x1, xt: even ? st.x1 : st.x0, dir: even ? 1 : -1, side: even ? -1 : 1,
        z0: even ? st.zc - st.lane : st.zc, z1: even ? st.zc : st.zc + st.lane,
        zo: even ? st.zc - st.lane : st.zc + st.lane, zc: st.zc,
      });
    }
  }
  return _flights;
}

/** well rectangle (floor hole) of an imperial interval */
const wellRect = (f) => ({ id: f.st.id, x0: f.x0, x1: f.xf, z0: f.zc - f.hwi, z1: f.zc + f.hwi });

/** Openings in the FLOOR of `deck`: lane rectangle of every flight arriving from below / imperial well (+ machinery access on F). */
export function stairHoles(deck) {
  const out = stairFlights().filter((f) => f.to === deck).map((f) => (f.type === 'imperial' ? wellRect(f) : { id: f.st.id, x0: f.st.x0, x1: f.st.x1, z0: f.z0, z1: f.z1 }));
  if (deck === 'F') for (const m of MACHINERY_ACCESS) out.push({ id: m.id, x0: m.x0, x1: m.x1, z0: m.z0, z1: m.z1 });
  return out;
}
/** Rectangles occupied by the flights that RISE from `deck` (scissor: the enclosed lane; imperial: the whole well). */
export function stairSolids(deck) {
  return stairFlights().filter((f) => f.from === deck).map((f) => (f.type === 'imperial' ? wellRect(f) : { id: f.st.id, x0: f.st.x0, x1: f.st.x1, z0: f.z0, z1: f.z1 }));
}
/** Rectangles deck layouts must keep free of walls and furniture (scissor: both lanes, +2 m in x, +0.3 m in z; imperial: `keep`). */
export function stairKeepouts(deck) {
  const out = STAIRS.filter((s) => s.decks.includes(deck)).map((s) => (isImperial(s)
    ? { id: s.id, x0: s.keep.x0, x1: s.keep.x1, z0: s.zc - s.keep.hw, z1: s.zc + s.keep.hw }
    : { id: s.id, x0: s.x0 - 2, x1: s.x1 + 2, z0: s.zc - s.lane - 0.3, z1: s.zc + s.lane + 0.3 }));
  if (deck === 'F') for (const m of MACHINERY_ACCESS) out.push({ id: m.id, x0: m.x0 - 0.4, x1: m.x1 + 1.6, z0: m.z0 - 0.4, z1: m.z1 + 0.4 });
  return out;
}
/** Landing points (free floor at both ends of each scissor stair, in front of the foot of an imperial one) on a deck: [{id,x,z}]. */
export function stairLandings(deck) {
  return STAIRS.filter((s) => s.decks.includes(deck)).flatMap((s) => (isImperial(s)
    ? [{ id: s.id, x: s.x1 + 1.0, z: s.zc }]
    : [{ id: s.id, x: s.x0 - 1, z: s.zc }, { id: s.id, x: s.x1 + 1, z: s.zc }]));
}
/** true if `rect` {x0,x1,z0,z1} does not touch a stair keep-out of `deck`; otherwise warns (with `label`) and returns false. */
export function assertClear(deck, rect, label = 'rect') {
  const hit = stairKeepouts(deck).find((k) => overlap(k, rect));
  if (hit) console.warn(`[kit ${deck}] ${label} overlaps the keep-out of stair "${hit.id}" (x ${hit.x0}..${hit.x1}, z ${hit.z0.toFixed(1)}..${hit.z1.toFixed(1)})`);
  return !hit;
}



// ------------------------------------------------------------------------------------------------ detailed parts

const STYLE = {
  grand: { tread: mats.oak, riser: mats.woodDark, nosing: mats.brass, wall: mats.oakPanel, panel: mats.oak, rail: mats.oak, infill: 'iron', newel: 'grand', cap: mats.gold, cl: 0.25 },
  oak: { tread: mats.oak, riser: mats.oak, nosing: mats.brass, wall: mats.oakPanel, panel: mats.oak, rail: mats.oak, infill: 'baluster', newel: 'oak', cap: null, cl: 0.14 },
  steel: { tread: mats.steelFloor, riser: mats.steelDark, nosing: null, wall: mats.steel, panel: null, rail: mats.iron, infill: 'pipe', newel: 'pipe', cap: null, cl: 0.1 },
};
const NOSE = [[0, -0.032], [0.016, -0.03], [0.026, -0.02], [0.028, -0.006], [0.02, 0.002], [0, 0.003]];
// handrail cross sections (closed loops, clockwise in [out, up] so the sweep normals face outwards)
const RAIL = {
  grand: [[0.05, 0], [0.05, 0.03], [0.036, 0.055], [0.012, 0.068], [-0.012, 0.068], [-0.036, 0.055], [-0.05, 0.03], [-0.05, 0], [0.05, 0]],
  oak: [[0.035, 0], [0.035, 0.028], [0.02, 0.05], [-0.02, 0.05], [-0.035, 0.028], [-0.035, 0], [0.035, 0]],
};

/** wrought-iron balustrade panel with C-scrolls, oval and gilt rosettes; unit square (x 0..1 along, y 0..1 up) – placed with a shear matrix */
const ironPanel = def('stairIron', [1, 0.04, 1], (p) => {
  const I = mats.iron, Gd = mats.gold, r = 0.009;
  p.b(I, 1, 0.025, 0.014, 0.5, 0, 0); p.b(I, 1, 0.025, 0.014, 0.5, 0.975, 0);
  p.b(I, 0.02, 1, 0.014, 0.01, 0, 0); p.b(I, 0.02, 1, 0.014, 0.99, 0, 0);
  for (const [cx, sg] of [[0.24, 1], [0.76, -1]]) {
    for (const [cy, sy] of [[0.3, 1], [0.7, -1]]) {
      const pts = []; for (let i = 0; i <= 14; i++) { const t = i / 14, a = sg * sy * (t * Math.PI * 2.6) + (sy > 0 ? -Math.PI / 2 : Math.PI / 2), rr = 0.2 - 0.15 * t; pts.push([cx + Math.cos(a) * rr * 1.05, cy + Math.sin(a) * rr, 0]); }
      p.tube(I, pts, r, 16, 4);
      p.rev(Gd, [{ o: 0.0, y: -0.006 }, { o: 0.035, y: 0.0, m: 0.012 }, { o: 0.0, y: 0.008 }], { seg: 12, k: 5 }, cx, cy, 0).rotation.x = Math.PI / 2;
    }
  }
  const ov = []; for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; ov.push([0.5 + Math.cos(a) * 0.075, 0.5 + Math.sin(a) * 0.36, 0]); }
  p.tube(I, ov, r, 16, 4, true);
  p.rev(Gd, [{ o: 0.0, y: -0.008 }, { o: 0.05, y: 0.0, m: 0.015 }, { o: 0.0, y: 0.01 }], { seg: 12, k: 6 }, 0.5, 0.5, 0).rotation.x = Math.PI / 2;
  for (const y of [0.12, 0.88]) p.b(Gd, 0.04, 0.04, 0.02, 0.5, y - 0.02, 0);
});

/** carved oak newel post with panelled shaft, moulded capital and pineapple finial (grand), plain post with ball (oak) */
const newelProp = def('stairNewel', (o) => [o.kind === 'grand' ? 0.24 : 0.16, o.kind === 'grand' ? 0.24 : 0.16, 1.35], (p, o) => {
  const W = mats.oak;
  if (o.kind === 'grand') {
    p.bb(W, 0.24, 0.16, 0.24, 0, 0, 0, 0.012); p.bb(W, 0.2, 0.05, 0.2, 0, 0.16, 0, 0.01);
    p.bb(W, 0.17, 0.78, 0.17, 0, 0.21, 0, 0.012);
    for (let k = 0; k < 4; k++) { const f = p.fp(W, 0.11, 0.6, 0, 0.6, 0, 0.008, 0.025); const a = (k * Math.PI) / 2; f.position.set(Math.cos(a) * 0.085, 0.6, -Math.sin(a) * 0.085); f.rotation.y = a; }
    p.bb(W, 0.21, 0.04, 0.21, 0, 0.99, 0, 0.01); p.bb(W, 0.24, 0.05, 0.24, 0, 1.03, 0, 0.014);
    for (let k = 0; k < 4; k++) { const a = (k * Math.PI) / 2; p.t(mats.gold, 0.03, 0.007, Math.cos(a) * 0.088, 0.9, -Math.sin(a) * 0.088, k % 2 ? 'x' : 'z', 10, 3); }
    // pineapple finial: faceted body via a fluted revolve
    if (o.finial === false) return;
    p.lathe(W, [[0, 1.08], [0.06, 1.08], [0.035, 1.11], [0.03, 1.13]], 0, 0, 0, 12);
    p.rev(W, [{ o: 0.03, y: 1.13, m: 0 }, { o: 0.055, y: 1.17, m: 0.006 }, { o: 0.06, y: 1.21, m: 0.008 }, { o: 0.045, y: 1.26, m: 0.006 }, { o: 0.015, y: 1.29, m: 0 }], { seg: 24, k: 12 }, 0, 0, 0);
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2, lf = p.extZ(mats.gold, [[-0.012, 0], [0.012, 0], [0.006, 0.07], [0, 0.09], [-0.006, 0.07]], 0.006, 0, 0, 0, 0); lf.position.set(Math.cos(a) * 0.012, 1.285, -Math.sin(a) * 0.012); lf.rotation.set(0, a + Math.PI / 2, 0); lf.rotateX(-0.45); }
  } else {
    p.bb(W, 0.15, 0.12, 0.15, 0, 0, 0, 0.01); p.bb(W, 0.11, 0.86, 0.11, 0, 0.12, 0, 0.012);
    for (let k = 0; k < 4; k++) { const f = p.fp(W, 0.07, 0.5, 0, 0.5, 0, 0.006, 0.02); const a = (k * Math.PI) / 2; f.position.set(Math.cos(a) * 0.055, 0.5, -Math.sin(a) * 0.055); f.rotation.y = a; }
    p.bb(W, 0.15, 0.05, 0.15, 0, 0.98, 0, 0.012);
    p.lathe(W, [[0, 1.03], [0.04, 1.03], [0.025, 1.05], [0.055, 1.1], [0.05, 1.14], [0.02, 1.17], [0, 1.17]], 0, 0, 0, 12);
  }
});
/** turned oak baluster of height h */
const baluster = def('stairBaluster', (o) => [0.05, 0.05, o.h ?? 0.75], (p, o) => {
  const h = o.h ?? 0.75;
  p.lathe(mats.oak, [[0, 0], [0.022, 0], [0.014, 0.08], [0.026, h * 0.4], [0.012, h * 0.62], [0.012, h - 0.08], [0.02, h - 0.05], [0, h]], 0, 0, 0, 6);
});
/** ball knuckle on a pipe stanchion */
const knuckle = def('stairKnuckle', [0.06, 0.06, 0.06], (p) => { p.lathe(mats.iron, [[0, 0], [0.022, 0.004], [0.03, 0.03], [0.022, 0.056], [0, 0.06]], 0, 0, 0, 8); });

/** sheared placement of a unit template: local x → (dx, dy) in the vertical plane z = zz (axis x), local y → h */
function shear(zone, tpl, x, y, z, dx, dy, h) {
  tpl.matrixAutoUpdate = false;
  tpl.matrix.set(dx, 0, 0, x, dy, h, 0, y, 0, 0, 1, z, 0, 0, 0, 1);
  zone.add(tpl);
  return tpl;
}
/** same for a plane x = const running along z */
function shearZ(zone, tpl, x, y, z, dz, dy, h) {
  tpl.matrixAutoUpdate = false;
  tpl.matrix.set(0, 0, 1, x, dy, h, 0, y, dz, 0, 0, z, 0, 0, 0, 1);
  zone.add(tpl);
  return tpl;
}

function newel(world, deck, S, x, z, y, cherub = false) {
  if (S.newel === 'pipe') {
    const b = new Batch(world, deck); b.prism(mats.iron, [x, y, z], [x, y + RAIL_H + 0.02, z], 0.03, 8); b.flush();
    place(world.zone(deck, x), knuckle(), x, y + RAIL_H, z, 0);
    return;
  }
  place(world.zone(deck, x), newelProp(cherub ? { kind: S.newel, finial: false } : { kind: S.newel }), x, y, z, 0);
}

/**
 * Railing in the plane z = zz from (xa, ya) to (xe, ye) (base line = string / floor), handrail at +RAIL_H.
 * Sloped flights: handrail (+ balusters / pipe stanchions); their iron panels are placed by buildFlight.
 * Level railings round a hole (`cut` given): the infill only runs xa..cut, beyond it the handrail of the flight below rises.
 */
function railX(world, deck, b, S, xa, ya, xe, ye, zz, cut = null) {
  const zone = world.zone(deck, (xa + xe) / 2), dx = xe - xa, dy = ye - ya, L = Math.abs(dx), level = Math.abs(dy) < 1e-6;
  const xc = cut ?? xe;
  if (S.infill === 'pipe') {
    for (const hh of [RAIL_H, 0.48]) b.prism(S.rail, [xa, ya + hh, zz], [xe, ye + hh, zz], hh === RAIL_H ? 0.022 : 0.017, 6, true); // capped pipe ends
    const n = Math.max(1, Math.round(L / 1.2));
    for (let i = 0; i <= n; i++) { const t = i / n, x = xa + dx * t, y = ya + dy * t; b.prism(S.rail, [x, y, zz], [x, y + RAIL_H, zz], 0.018, 6); if (i > 0 && i < n) place(zone, knuckle(), x, y + RAIL_H - 0.03, zz, 0); }
    return;
  }
  const l = Math.hypot(dx, dy);
  b.sweep(S.rail, RAIL[S.newel === 'grand' ? 'grand' : 'oak'], [xa, ya + RAIL_H, zz], [dx / l, dy / l, 0], [0, 0, 1], [0, 1, 0], l, [true, true]);
  if (level) for (const [x, s] of [[xa, -Math.sign(dx)], [xc, Math.sign(dx)]]) b.wallZ(S.rail, x, zz - 0.05, zz + 0.05, ya, ya + 0.05, s); // ends of the base rail
  if (!level) {
    if (S.infill === 'baluster') {
      const n = Math.max(1, Math.round(L / 0.14)), h = Math.round((RAIL_H - S.cl - 0.035) * 20) / 20;
      for (let i = 1; i < n; i++) { const t = i / n; place(zone, baluster({ h }), xa + dx * t, ya + dy * t + S.cl + 0.035, zz, 0); }
    }
    return;
  }
  const Lc = Math.abs(xc - xa);
  if (Lc < 0.05) return;
  b.bar(S.rail, [xa, ya, zz], [xc, ya, zz], S.infill === 'iron' ? 0.1 : 0.08, 0.05);
  if (S.infill === 'iron') {
    const n = Math.max(1, Math.round(Lc / 0.8)), d = (xc - xa) / n;
    for (let i = 0; i < n; i++) shear(zone, ironPanel(), xa + d * i, ya + 0.05, zz, d, 0, RAIL_H - 0.055);
  } else {
    const n = Math.max(1, Math.round(Lc / 0.14)), h = Math.round((RAIL_H - 0.05) * 20) / 20;
    for (let i = 1; i < n; i++) place(zone, baluster({ h }), xa + ((xc - xa) * i) / n, ya + 0.05, zz, 0);
  }
}function railZ(world, deck, b, S, xx, za, ze, yf) {
  const zone = world.zone(deck, xx), L = Math.abs(ze - za);
  if (S.infill === 'pipe') {
    for (const hh of [RAIL_H, 0.48]) b.prism(S.rail, [xx, yf + hh, za], [xx, yf + hh, ze], hh === RAIL_H ? 0.022 : 0.017, 6, true);
    return;
  }
  b.sweep(S.rail, RAIL[S.newel === 'grand' ? 'grand' : 'oak'], [xx, yf + RAIL_H, za], [0, 0, Math.sign(ze - za)], [-Math.sign(ze - za), 0, 0], [0, 1, 0], L, [true, true]);
  b.bar(S.rail, [xx, yf, za], [xx, yf, ze], S.infill === 'iron' ? 0.1 : 0.08, 0.05);
  if (S.infill === 'iron') {
    const n = Math.max(1, Math.round(L / 0.8)), d = (ze - za) / n;
    for (let i = 0; i < n; i++) shearZ(zone, ironPanel(), xx, yf + 0.05, za + d * i, d, 0, RAIL_H - 0.055);
  } else {
    const n = Math.max(1, Math.round(L / 0.13));
    for (let i = 1; i < n; i++) place(zone, baluster({ h: Math.round((RAIL_H - 0.06) * 20) / 20 }), xx, yf + 0.05, za + ((ze - za) * i) / n, 0);
  }
}

function buildFlight(world, f, bl, bu) {
  const S = STYLE[f.st.style] || STYLE.steel;
  const { xb, xt, dir, y0, y1, z0, z1, zo, zc, side } = f;
  const rise = y1 - y0, run = Math.abs(xt - xb);
  const N = Math.round(rise / RISER), r = rise / N, g = run / (N - 1);
  const xmin = Math.min(xb, xt), xmax = Math.max(xb, xt);

  // steps: tread, moulded nosing, riser, brass edge strip (grand / oak) or chequer plate with angle nosing (steel)
  for (let i = 0; i < N - 1; i++) {
    const xa = xb + dir * i * g, xe = xa + dir * g, yt = y0 + (i + 1) * r;
    bl.flat(S.tread, xa, xe, z0, z1, yt);
    bl.wallZ(S.riser, xa, z0, z1, yt - r, yt, -dir);
    if (S.nosing) {
      bl.sweep(S.tread, NOSE, [xa, yt, z0], [0, 0, 1], [-dir, 0, 0], [0, 1, 0], z1 - z0, [true, true]);
      bl.box(S.nosing, Math.min(xa, xa + dir * 0.045), yt + 0.003, z0 + 0.03, Math.max(xa, xa + dir * 0.045), yt + 0.007, z1 - 0.03, 'xXYzZ');
      if (f.st.style === 'grand') bl.flat(mats.carpetRed, xa + dir * 0.06, xe - dir * 0.02, z0 + 0.25, z1 - 0.25, yt + 0.004);
    } else {
      bl.box(mats.steelDark, Math.min(xa, xa + dir * 0.05), yt - 0.05, z0, Math.max(xa, xa + dir * 0.05), yt + 0.004, z1, 'xXYzZ');
    }
  }
  bl.wallZ(S.riser, xt, z0, z1, y1 - r, y1, -dir);
  world.addRamp({ x0: xb, x1: xt, z0, z1, y0, y1, axis: 'x' });

  // side closures (panelled spandrels) below the pitch line + balustrades on the outer side and the centre spine
  const xqOf = (h) => xb + (xt - xb) * ((rise - h) / rise); // x where pitch + h reaches y1
  const pitchY = (x) => y0 + rise * ((x - xb) / (xt - xb));
  for (const zz of [zo, zc]) {
    const centre = zz === zc;
    const clip = centre && !f.last; // the next flight's closure starts at y1 on the centre line
    for (const s of [-1, 1]) {
      const z = zz + s * T;
      if (clip) bl.poly(S.wall, [[xb, y0, z], [xt, y0, z], [xt, y1, z], [xqOf(S.cl), y1, z], [xb, y0 + S.cl, z]], [0, 0, s]);
      else bl.poly(S.wall, [[xb, y0, z], [xt, y0, z], [xt, y1 + S.cl, z], [xb, y0 + S.cl, z]], [0, 0, s]);
      if (S.panel) { // raised panels stepping up under the pitch line
        const n = Math.max(1, Math.round(run / 0.75)), pw = run / n;
        for (let i = 0; i < n; i++) {
          const xa = xmin + pw * i + 0.07, xe = xmin + pw * (i + 1) - 0.07, xl = dir > 0 ? xa : xe;
          let top = pitchY(xl) + S.cl - 0.1; if (clip) top = Math.min(top, y1 - 0.1);
          const bot = y0 + 0.12;
          if (top - bot > 0.18) bl.fielded(S.panel, [(xa + xe) / 2, (top + bot) / 2, z], [1, 0, 0], [0, 0, s], [0, 1, 0], xe - xa, top - bot, 0.012, 0.045);
        }
      }
    }
    // string along the pitch and the balustrade
    const zone = world.zone(f.from, (xb + xt) / 2);
    if (S.infill !== 'pipe') bl.bar(S.rail, [xb, y0 + S.cl, zz], [xt, y1 + S.cl, zz], 0.1, 0.035);
    if (S.infill === 'iron') {
      const n = Math.max(1, Math.round(run / 0.8)), sdx = (xt - xb) / n, sdy = rise / n;
      for (let i = 0; i < n; i++) shear(zone, ironPanel(), xb + sdx * i, y0 + sdy * i + S.cl + 0.035, zz, sdx, sdy, RAIL_H - S.cl - 0.04);
    }
    railX(world, f.from, bl, S, xb, y0, xt, y1, zz);
    if (S.infill === 'pipe') bl.bar(S.rail, [xb, y0 + 0.08, zz], [xt, y1 + 0.08, zz], 0.06, 0.1);
    // colliders: closure + balustrade + railing of the hole in the upper deck
    world.addCollider(xmin, y0, zz - 0.05, xmax, y1 + 1.0, zz + 0.05);
    // slab rim of the hole; grand: moulded entablature with gilt bead under the rim
    bl.wallX(S.wall, zz, xb, xt, y1 - SLAB, y1, centre ? side : -side);
    if (S.newel === 'grand') {
      const o = centre ? side : -side;
      bl.sweep(mats.oak, [[0, -0.12], [0.06, -0.12], [0.06, -0.08], [0.04, -0.05], [0.02, -0.01], [0, 0]], [xmin, y1 - SLAB, zz + o * 0.001], [1, 0, 0], [0, 0, o], [0, 1, 0], xmax - xmin, [true, true]);
      bl.box(mats.gold, xmin, y1 - SLAB - 0.135, Math.min(zz, zz + o * 0.065), xmax, y1 - SLAB - 0.12, Math.max(zz, zz + o * 0.065), 'xXyzZ');
    }
  }
  bl.wallZ(S.wall, xb, z0, z1, y1 - SLAB, y1, dir);

  // closed high end below the top landing
  bl.wallZ(S.wall, xt, z0 - T, z1 + T, y0, y1 - SLAB, dir);
  world.addCollider(xt - dir * 0.1, y0, z0, xt, y1 - SLAB - 0.05, z1);

  // newels
  newel(world, f.from, S, xb, zo, y0); newel(world, f.from, S, xb, zc, y0, f.st.style === 'grand' && f.from === 'A');
  newel(world, f.to, S, xt, zo, y1); newel(world, f.to, S, xb, zo, y1);
  if (f.last) newel(world, f.to, S, xt, zc, y1);

  // railing around the hole on the upper deck: outer long side, low end, (centre on the top deck)
  railX(world, f.to, bu, S, xb, y1, xt, y1, zo, xqOf(RAIL_H));
  if (f.last) railX(world, f.to, bu, S, xb, y1, xt, y1, zc, xqOf(RAIL_H));
  railZ(world, f.to, bu, S, xb, z0, z1, y1);
  world.addCollider(xb, y1, z0, xb + dir * 0.1, y1 + 1.0, z1);
}

function fixture(world, deck, x, z, cy, grand) {
  place(world.zone(deck, x), ceilingLight({ style: grand ? 'bowl' : 'dome' }), x, cy, z, 0);
  if (grand) place(world.zone(deck, x), ceilingRose({ r: 0.36 }), x, cy, z, 0);
  world.addLamp({ x, y: cy - 0.3, z, intensity: grand ? 1.3 : 1 });
}


// ------------------------------------------------------------------------------------------------ figures and art

/** soften a relief part: squash it towards the wall plane x = 0 (relief depth factor k) */
const flat = (m, k) => { m.position.x *= k; m.scale.x *= k; return m; };

/**
 * Bronze cherub (putto) holding a torch lamp on the newel at the foot of the central flight – origin = top of the newel,
 * faces +x. Figure ≈ 0.76 m from plinth to the top of the curls, torch flame at ≈ 1.25 m.
 */
const cherubLamp = def('cherubLamp2', [0.36, 0.36, 1.3], (p) => {
  const B = kitMats.bronze;
  // ---- carved pedestal: moulded foot, gadrooned drum, leaf collar, cushion top
  p.lathe(B, [[0, 0], [0.118, 0], [0.118, 0.018], [0.108, 0.026], [0.1, 0.03], [0, 0.03]], 0, 0, 0, 24);
  p.rev(B, [{ o: 0.095, y: 0.028, m: 0 }, { o: 0.092, y: 0.04, m: 0.006 }, { o: 0.082, y: 0.075, m: 0.008 }, { o: 0.07, y: 0.105, m: 0.005 }, { o: 0.066, y: 0.115, m: 0 }], { seg: 32, k: 16 }, 0, 0, 0);
  for (let i = 0; i < 8; i++) { // acanthus collar
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8, lf = p.extZ(B, [[-0.022, 0], [0.022, 0], [0.016, 0.03], [0.006, 0.042], [0, 0.05], [-0.006, 0.042], [-0.016, 0.03]], 0.006, 0, 0, 0, 0);
    lf.position.set(Math.cos(a) * 0.066, 0.1, -Math.sin(a) * 0.066); lf.rotation.set(0, a + Math.PI / 2, 0); lf.rotateX(-0.45);
  }
  p.lathe(B, [[0, 0.112], [0.07, 0.112], [0.085, 0.122], [0.092, 0.135], [0.088, 0.148], [0.075, 0.155], [0, 0.155]], 0, 0, 0, 24);
  const y0 = 0.155; // top of the pedestal
  // ---- legs in contrapposto: weight on the right leg (+z), the left leg (−z) relaxed and a little forward
  p.loft(B, [[0.002, y0 + 0.03, 0.036], [0.008, y0 + 0.1, 0.038], [0.014, y0 + 0.18, 0.041], [0.008, y0 + 0.25, 0.043], [0.0, y0 + 0.33, 0.045]], [0.021, 0.031, 0.029, 0.04, 0.051], 16);
  p.loft(B, [[0.05, y0 + 0.05, -0.042], [0.05, y0 + 0.11, -0.044], [0.048, y0 + 0.19, -0.046], [0.03, y0 + 0.26, -0.046], [0.004, y0 + 0.33, -0.044]], [0.02, 0.03, 0.028, 0.039, 0.05], 16);
  p.s(B, 0.036, 0.026, y0 + 0.016, 0.036, 1.35, 0.5, 0.62, false);            // right foot flat on the pedestal
  const ft = p.s(B, 0.034, 0.072, y0 + 0.028, -0.044, 1.35, 0.5, 0.6, false); ft.rotation.z = -0.45; // left foot, heel raised
  // ---- torso: slender child, slight belly, shoulders, back and seat
  p.loft(B, [[0.0, y0 + 0.3, 0], [0.006, y0 + 0.36, 0], [0.01, y0 + 0.41, 0], [0.006, y0 + 0.47, 0], [0.0, y0 + 0.52, 0], [-0.004, y0 + 0.555, 0]],
    [[0.056, 0.084], [0.061, 0.076], [0.062, 0.072], [0.058, 0.078], [0.05, 0.092], [0.03, 0.05]], 16);
  for (const z of [-0.034, 0.034]) p.s(B, 0.04, -0.028, y0 + 0.32, z, 1, 1.05, 0.9, false); // seat
  for (const z of [-0.07, 0.07]) p.s(B, 0.034, -0.003, y0 + 0.515, z, 0.9, 0.85, 1, false); // shoulders
  p.loft(B, [[-0.004, y0 + 0.54, 0], [0.0, y0 + 0.6, 0]], [[0.024, 0.024], [0.025, 0.025]], 12);   // neck
  // ---- head: oval skull, chubby cheeks, chin, little nose, a cap of small curls (face left free)
  const hx = 0.006, hy = y0 + 0.665;
  p.s(B, 0.07, hx, hy, 0, 0.95, 1.08, 0.9, false);
  for (const z of [-0.028, 0.028]) p.s(B, 0.024, hx + 0.045, hy - 0.025, z, 0.8, 0.9, 0.9, false);
  p.s(B, 0.02, hx + 0.05, hy - 0.052, 0, 0.8, 0.8, 1, false);
  p.s(B, 0.011, hx + 0.069, hy - 0.006, 0, 1, 0.9, 0.8, false);
  for (const [e, n, r0] of [[0.25, 9, 0.019], [0.75, 9, 0.02], [1.2, 6, 0.019]]) {
    for (let i = 0; i < n; i++) {
      const a = e > 1 ? (i / n) * Math.PI * 2 : Math.PI * 0.32 + (i / (n - 1)) * Math.PI * 1.36; // lower rows: round the back, not over the face
      const cx = Math.cos(a) * Math.cos(e), cz = Math.sin(a) * Math.cos(e), cy = Math.sin(e);
      p.s(B, r0, hx + cx * 0.064, hy + 0.012 + cy * 0.072, cz * 0.06, 1, 1, 1);
    }
  }
  // ---- arms: the left arm (−z) raised high holding the torch, the right arm lowered, hand on the hip holding the drapery
  p.loft(B, [[0.0, y0 + 0.52, -0.075], [0.012, y0 + 0.6, -0.11], [0.03, y0 + 0.68, -0.12], [0.04, y0 + 0.76, -0.108], [0.044, y0 + 0.81, -0.1]], [0.032, 0.028, 0.024, 0.021, 0.018], 14);
  p.s(B, 0.024, 0.046, y0 + 0.825, -0.1, 1, 1.15, 0.9, false); // fist round the torch
  p.loft(B, [[0.0, y0 + 0.515, 0.076], [0.004, y0 + 0.46, 0.1], [0.016, y0 + 0.4, 0.104], [0.04, y0 + 0.355, 0.084]], [0.031, 0.027, 0.023, 0.018], 14);
  p.s(B, 0.021, 0.05, y0 + 0.345, 0.07, 1, 0.8, 1.1, false);
  // ---- drapery: cloth gathered in the right hand, across the hips, falling behind the left leg
  p.loft(B, [[0.05, y0 + 0.34, 0.072], [0.055, y0 + 0.3, 0.03], [0.05, y0 + 0.29, -0.02], [0.028, y0 + 0.31, -0.06], [-0.02, y0 + 0.33, -0.065], [-0.05, y0 + 0.24, -0.04], [-0.05, y0 + 0.12, -0.03]],
    [[0.02, 0.012], [0.026, 0.012], [0.028, 0.012], [0.026, 0.012], [0.026, 0.012], [0.03, 0.012], [0.024, 0.01]], 10);
  // ---- feathered wings from the shoulder blades, swept back and up (two layers: flight feathers, coverts)
  const WING = [[0, 0], [-0.02, 0.06], [-0.055, 0.12], [-0.1, 0.17], [-0.15, 0.2], [-0.2, 0.215], [-0.215, 0.2], [-0.212, 0.18], [-0.2, 0.165], [-0.205, 0.15], [-0.2, 0.13], [-0.185, 0.115], [-0.188, 0.1], [-0.18, 0.082], [-0.162, 0.07],
    [-0.16, 0.055], [-0.148, 0.04], [-0.13, 0.032], [-0.125, 0.015], [-0.11, 0.003], [-0.092, 0.0], [-0.083, -0.018], [-0.066, -0.026], [-0.05, -0.022], [-0.038, -0.035], [-0.022, -0.03], [-0.012, -0.012]]; // rounded feather tips
  for (const s of [-1, 1]) {
    for (const [sc, dx, dy] of [[1, 0, 0], [0.62, 0.008, 0.03]]) {
      const w = p.extZ(B, WING.map(([a, b]) => [a * sc * 1.15, b * sc * 1.15]), 0.012, -0.04 + dx, y0 + 0.43 + dy, s * (0.03 + dx), 0.003);
      w.rotation.set(0.1 * s, s * 0.95, 0, 'YXZ');
    }
  }
  // ---- torch: fluted gilt holder through the raised fist, cup, flame-shaped cut-glass shade
  p.lathe(mats.gold, [[0, 0], [0.012, 0], [0.012, 0.03], [0.01, 0.06], [0.011, 0.15], [0.016, 0.16], [0.026, 0.18], [0.04, 0.2], [0.046, 0.215], [0.04, 0.22], [0, 0.22]], 0.046, y0 + 0.74, -0.1, 12);
  p.rev(kitMats.cutGlass, [{ o: 0.03, y: y0 + 0.955, m: 0 }, { o: 0.05, y: y0 + 0.985, m: 0.004 }, { o: 0.056, y: y0 + 1.02, m: 0.005 }, { o: 0.046, y: y0 + 1.06, m: 0.004 }, { o: 0.028, y: y0 + 1.1, m: 0.003 }, { o: 0.01, y: y0 + 1.13, m: 0.001 }, { o: 0.0, y: y0 + 1.15, m: 0 }], { seg: 16, k: 6, ph: 0.4, capBottom: true }, 0.046, 0, -0.1);
});

/** one robed, winged allegorical figure in high relief (Honour s = −1 with book and stylus, Glory s = +1 with palm) */
function reliefFigure(p, s, fz, y0, hold, K = 0.55) {
  // modelled in the round about x = xc and flattened towards the panel (x *= K); s = side (+z = Glory), −s points at the clock
  const W = mats.oak, xc = 0.17, parts = [];
  const P = (dx, y, dz) => [xc + dx, y0 + y, fz + s * dz];
  // long gown: fluted skirt flaring to the ground (deep vertical folds), slim waist
  const skirt = p.rev(W, [{ o: 0.19, y: 0, m: 0.02 }, { o: 0.165, y: 0.2, m: 0.017 }, { o: 0.13, y: 0.42, m: 0.012 }, { o: 0.088, y: 0.6, m: 0.006 }, { o: 0.07, y: 0.67, m: 0.002 }], { seg: 28, k: 7, ph: 0.6 }, xc, y0, fz);
  skirt.scale.x = 0.7; parts.push(skirt);
  parts.push(p.s(W, 0.03, xc + 0.11, y0 + 0.02, fz - s * 0.05, 1.6, 0.6, 0.9)); // toe of a sandal under the hem
  // bodice with bust, shoulders, neck
  parts.push(p.loft(W, [P(0, 0.64, 0), P(0.005, 0.7, -0.005), P(0.01, 0.77, -0.01), P(0.0, 0.84, -0.01), P(-0.01, 0.875, -0.01)], [[0.058, 0.072], [0.062, 0.07], [0.07, 0.082], [0.06, 0.098], [0.035, 0.05]], 14));
  for (const d of [-1, 1]) parts.push(p.s(W, 0.032, xc + 0.05, y0 + 0.765, fz + d * 0.036, 0.9, 0.85, 1));
  parts.push(p.loft(W, [P(-0.006, 0.86, -0.012), P(0.0, 0.925, -0.018)], [[0.025, 0.025], [0.026, 0.026]], 10));
  // head turned a little towards the clock: face, nose, hair drawn back into a knot, fillet
  parts.push(p.s(W, 0.062, xc + 0.006, y0 + 0.985, fz - s * 0.02, 0.95, 1.18, 0.88, false));
  parts.push(p.s(W, 0.011, xc + 0.066, y0 + 0.98, fz - s * 0.03, 1, 1.2, 0.8));
  parts.push(p.s(W, 0.066, xc - 0.014, y0 + 1.005, fz - s * 0.01, 0.95, 1.05, 0.95, false));
  parts.push(p.s(W, 0.04, xc - 0.062, y0 + 1.01, fz + s * 0.012, 0.9, 1, 1.05));
  // himation: mantle from the outer shoulder diagonally across the body, gathered at the inner hip and falling in a fold
  parts.push(p.loft(W, [P(0.0, 0.86, 0.075), P(0.07, 0.76, 0.03), P(0.095, 0.62, -0.035), P(0.1, 0.5, -0.08), P(0.11, 0.3, -0.1), P(0.12, 0.08, -0.095)],
    [[0.03, 0.018], [0.04, 0.02], [0.045, 0.022], [0.04, 0.024], [0.036, 0.022], [0.03, 0.02]], 10));
  // the inner arm reaches up and holds the laurel wreath over the clock
  parts.push(p.loft(W, [P(0.0, 0.83, -0.075), P(0.03, 0.92, -0.15), P(0.045, 0.99, -0.22), P(0.05, 1.04, -0.28), P(0.05, 1.06, -0.3)], [0.03, 0.026, 0.022, 0.02, 0.018], 10));
  parts.push(p.s(W, 0.02, xc + 0.05, y0 + 1.065, fz - s * 0.31, 1, 1, 1));
  parts.push(p.loft(W, [P(0.01, 0.84, -0.09), P(0.05, 0.82, -0.13), P(0.06, 0.88, -0.17)], [[0.045, 0.012], [0.035, 0.01], [0.012, 0.006]], 8)); // loose sleeve
  // the outer arm: Honour holds an open book, Glory lowers a palm branch
  if (hold === 'book') {
    parts.push(p.loft(W, [P(0.0, 0.83, 0.078), P(0.03, 0.74, 0.1), P(0.09, 0.68, 0.06), P(0.12, 0.665, 0.02)], [0.028, 0.024, 0.021, 0.018], 10));
    for (const d of [-1, 1]) { const pg = p.b(W, 0.015, 0.012, 0.11, xc + 0.15, y0 + 0.66, fz + d * 0.05); pg.rotation.x = d * 0.25; parts.push(pg); } // open pages
    parts.push(p.b(mats.gold, 0.012, 0.01, 0.2, xc + 0.15, y0 + 0.652, fz));
  } else {
    parts.push(p.loft(W, [P(0.0, 0.83, 0.078), P(0.02, 0.72, 0.11), P(0.06, 0.62, 0.12), P(0.08, 0.58, 0.115)], [0.028, 0.024, 0.021, 0.018], 10));
    parts.push(p.loft(W, [P(0.08, 0.62, 0.115), P(0.09, 0.45, 0.15), P(0.1, 0.25, 0.18), P(0.1, 0.1, 0.2)], 0.009, 6));
    for (let i = 0; i < 9; i++) { const t = i / 8, yy = y0 + 0.5 - t * 0.36; for (const d of [-1, 1]) { const lf = p.extX(W, [[0, 0], [0.012, 0.005], [0.07, 0.02], [0.012, 0.012]], 0.008, (xc + 0.1) * K, yy, fz + s * (0.15 + t * 0.045)); lf.rotation.x = d * 0.6 + Math.PI; parts.push(lf); } } // palm leaflets on the flattened stem
  }
  // large feathered wings rising from the shoulders, spreading away from the clock (flight feathers + coverts)
  const WING = [[0, 0], [0.02, 0.14], [0.05, 0.28], [0.09, 0.42], [0.14, 0.53], [0.19, 0.58], [0.225, 0.55], [0.235, 0.51], [0.26, 0.49], [0.265, 0.45], [0.29, 0.42], [0.29, 0.38], [0.305, 0.34], [0.3, 0.3], [0.31, 0.26],
    [0.295, 0.22], [0.3, 0.18], [0.28, 0.15], [0.275, 0.11], [0.25, 0.085], [0.24, 0.05], [0.21, 0.035], [0.19, 0.0], [0.16, -0.005], [0.135, -0.035], [0.1, -0.03], [0.075, -0.05], [0.045, -0.03], [0.02, -0.03]].map(([a, b]) => [a * 0.93, b]);
  for (const [sc, dx, dy] of [[1, 0, 0], [0.62, 0.025, 0.06]]) {
    parts.push(p.extX(W, WING.map(([a, b]) => [-s * a * sc, b * sc]), 0.028, 0.05 + dx, y0 + 0.78 + dy, fz + s * 0.05, 0.008)); // (extX: outline a → world −z)
  }
  for (const m of parts) if (Math.abs(m.rotation.y) < 1e-6) flat(m, K); // extruded parts are thin already
}

/**
 * "Honour and Glory crowning Time" (Charles Wilson's carved panel on the landing between A deck and the boat deck):
 * oak relief w × h with carved frame and pediment, the clock in the centre and two winged figures crowning it with a
 * laurel wreath. Origin = bottom centre on the wall, faces +x. figures:false → carved clock panel with garlands only.
 */
const honourGlory = def('honourGlory2', (o) => [o.w ?? 1.6, 0.3, (o.h ?? 1.5) + 0.3], (p, o) => {
  const w = o.w ?? 1.6, h = o.h ?? 1.5, W = mats.oak, Dk = mats.woodDark, Gd = mats.gold;
  p.b(Dk, 0.03, h, w, 0.015, 0, 0);
  p.bb(W, 0.08, 0.09, w + 0.2, 0.04, -0.03, 0, 0.015);
  p.bb(W, 0.07, 0.08, w + 0.16, 0.035, h - 0.06, 0, 0.012);
  for (const s of [-1, 1]) {
    p.bb(W, 0.08, h, 0.09, 0.04, 0, s * (w / 2 + 0.045), 0.012);
    for (let i = 0; i < 6; i++) p.s(Gd, 0.018, 0.085, 0.15 + (i * (h - 0.3)) / 5, s * (w / 2 + 0.045), 0.6, 1, 1); // gilt bead on the stiles
  }
  for (const y of [0.06, h - 0.075]) p.b(Gd, 0.06, 0.014, w, 0.035, y, 0);
  for (const s of [-1, 1]) p.b(Gd, 0.06, h - 0.12, 0.014, 0.035, 0.06, s * (w / 2 - 0.007));
  // broken scroll pediment with a gilt cartouche
  p.extX(W, [[-w / 2 - 0.1, 0], [w / 2 + 0.1, 0], [w / 2 + 0.1, 0.06], [0.3, 0.26], [0.2, 0.22], [w / 2 - 0.06, 0.06], [-w / 2 + 0.06, 0.06], [-0.2, 0.22], [-0.3, 0.26], [-w / 2 - 0.1, 0.06]], 0.09, 0.045, h + 0.02, 0, 0.01);
  for (const s of [-1, 1]) p.t(W, 0.05, 0.016, 0.09, h + 0.24, s * 0.26, 'x', 12, 4);
  p.s(Gd, 0.075, 0.09, h + 0.2, 0, 0.45, 1.15, 0.85, false);
  // the clock: carved case, gilt bezel, dial, hands
  const cy = h * (o.figures === false ? 0.55 : 0.52), R = 0.2;
  p.latheX(W, [[0, 0], [R + 0.08, 0], [R + 0.09, 0.03], [R + 0.06, 0.08], [R + 0.03, 0.09], [0, 0.09]], 0.03, cy, 0, 28);
  p.latheX(Gd, [[R - 0.01, 0], [R + 0.025, 0.01], [R + 0.015, 0.025], [R - 0.02, 0.02], [R - 0.01, 0]], 0.12, cy, 0, 28); // closed bezel ring
  p.cx(Dk, R, 0.006, 0.123, cy, 0, 28); p.dial(kitMats.clockFace, R - 0.003, 0.1265, cy, 0, 'x', 28);
  const hand = (len, a, t) => { const m = p.b(Dk, 0.005, len, t, 0.13, 0, 0); m.position.set(0.13, cy + (Math.cos(a) * len) / 2, (-Math.sin(a) * len) / 2); m.rotation.x = -a; };
  hand(0.12, -0.9, 0.014); hand(0.16, 0.75, 0.009);
  // laurel wreath crowning the clock, garland swag below
  const wy = cy + R + 0.17;
  p.t(Gd, 0.12, 0.016, 0.1, wy, 0, 'x', 20, 5);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2, lf = p.extX(Gd, [[-0.014, 0], [0.014, 0], [0.007, 0.05], [0, 0.06], [-0.007, 0.05]], 0.008, 0.11, wy + Math.sin(a) * 0.12, Math.cos(a) * 0.12, 0);
    lf.rotation.x = a - Math.PI / 2 + 0.6;
  }
  for (let i = 0; i <= 10; i++) { const t = i / 10; p.s(W, 0.03, 0.07, cy - R - 0.17 - 0.07 * Math.sin(Math.PI * t), -0.25 + 0.5 * t, 0.9, 0.8, 1, false); }
  if (o.figures === false) {
    for (const s of [-1, 1]) for (let i = 0; i < 7; i++) p.s(W, 0.035, 0.07, cy - 0.3 + i * 0.1, s * (R + 0.2 + Math.sin(i) * 0.02), 0.8, 1.2, 0.9, false);
    return;
  }
  reliefFigure(p, -1, -w * 0.28, 0.1, 'book');
  reliefFigure(p, 1, w * 0.28, 0.1, 'palm');
});

/** gilt newel lamp with three cut-glass tulips (newel caps at the foot of the central flights) – origin = newel top */
const newelLamp = def('newelLamp', [0.32, 0.32, 0.75], (p) => {
  const G = mats.gold;
  p.lathe(kitMats.bronze, [[0, 0], [0.09, 0], [0.09, 0.02], [0.05, 0.05], [0.03, 0.1], [0.025, 0.36], [0.04, 0.39], [0.025, 0.42], [0, 0.42]], 0, 0, 0, 16);
  for (let i = 0; i < 2; i++) {
    const a = i * Math.PI + Math.PI / 2, c = Math.cos(a), s = -Math.sin(a);
    p.loft(G, [[0, 0.36, 0], [c * 0.07, 0.4, s * 0.07], [c * 0.13, 0.43, s * 0.13], [c * 0.14, 0.47, s * 0.14]], 0.01, 6);
    p.rev(kitMats.cutGlass, [{ o: 0.015, y: 0.47, m: 0 }, { o: 0.05, y: 0.52, m: 0.006 }, { o: 0.055, y: 0.58, m: 0.006 }, { o: 0.035, y: 0.6, m: 0 }], { seg: 12, k: 6, capBottom: true, capTop: true }, c * 0.14, 0, s * 0.14);
  }
  p.rev(kitMats.cutGlass, [{ o: 0.015, y: 0.42, m: 0 }, { o: 0.06, y: 0.5, m: 0.007 }, { o: 0.065, y: 0.6, m: 0.007 }, { o: 0.04, y: 0.66, m: 0 }], { seg: 14, k: 7, capBottom: true, capTop: true }, 0, 0, 0);
  p.lathe(G, [[0, 0], [0.02, 0], [0.01, 0.06], [0, 0.07]], 0, 0.66, 0, 8);
});

/** gilt-framed oil painting on a wall x = const facing +x. cell: quadrant of kitMats.paintings (0 sea, 1 landscape, 2 portrait, 3 still life) */
function painting(b, x, yc, zc, w, h, cell = 0) {
  const u0 = (cell % 2) * 0.5, v0 = cell < 2 ? 0.5 : 0, F = 0.09;
  b.poly(kitMats.paintings, [[x + 0.035, yc - h / 2, zc + w / 2], [x + 0.035, yc - h / 2, zc - w / 2], [x + 0.035, yc + h / 2, zc - w / 2], [x + 0.035, yc + h / 2, zc + w / 2]], [1, 0, 0],
    [[u0, v0], [u0 + 0.5, v0], [u0 + 0.5, v0 + 0.5], [u0, v0 + 0.5]]);
  const G = mats.gold;
  for (const s of [-1, 1]) {
    b.box(G, x, yc + s * (h / 2) - (s < 0 ? F : 0), zc - w / 2 - F, x + 0.06, yc + s * (h / 2) + (s > 0 ? F : 0), zc + w / 2 + F, 'XyYzZ');
    b.box(G, x, yc - h / 2, zc + s * (w / 2) - (s < 0 ? F : 0), x + 0.06, yc + h / 2, zc + s * (w / 2) + (s > 0 ? F : 0), 'XzZ');
  }
  b.box(G, x + 0.06, yc - h / 2 - 0.02, zc - w / 2 - 0.02, x + 0.075, yc - h / 2, zc + w / 2 + 0.02, 'XyY');
  b.box(G, x + 0.06, yc + h / 2, zc - w / 2 - 0.02, x + 0.075, yc + h / 2 + 0.02, zc + w / 2 + 0.02, 'XyY');
}

// ------------------------------------------------------------------------------------------------ imperial stairs

const D_SOFF = 0.32; // depth of a flight below its pitch line (strings / soffit)
const LAND_T = 0.3;  // thickness of a half-landing
const BEAM = 0.36;   // depth of the moulded downstand beams round the well openings (below the upper floor)
const ENTAB = [[0, -0.12], [0.06, -0.12], [0.06, -0.08], [0.04, -0.05], [0.02, -0.01], [0, 0]];
const DADO = [[0, 0], [0.025, 0.005], [0.03, 0.02], [0.018, 0.035], [0, 0.04]];

/** treads, risers, moulded nosings with brass strips, red runner with brass stair rods: from (xb, y0) to (xt, y1) */
function stepRun(b, S, xb, xt, z0, z1, y0, y1) {
  const dir = Math.sign(xt - xb), rise = y1 - y0, run = Math.abs(xt - xb);
  const N = Math.max(2, Math.round(rise / 0.175)), r = rise / N, g = run / (N - 1);
  const c0 = z0 + 0.24, c1 = z1 - 0.24;
  for (let i = 0; i < N; i++) {
    const xa = xb + dir * i * g, xe = xa + dir * g, yt = y0 + (i + 1) * r;
    b.wallZ(S.riser, xa, z0, z1, yt - r, yt, -dir);
    b.wallZ(mats.carpetRed, xa - dir * 0.004, c0, c1, yt - r, yt - 0.03, -dir);
    b.prism(mats.brass, [xa - dir * 0.014, yt - r + 0.016, c0 - 0.03], [xa - dir * 0.014, yt - r + 0.016, c1 + 0.03], 0.008, 5);
    if (i === N - 1) break; // the last riser rises onto the landing / deck
    b.flat(S.tread, xa, xe, z0, z1, yt);
    b.sweep(S.tread, NOSE, [xa, yt, z0], [0, 0, 1], [-dir, 0, 0], [0, 1, 0], z1 - z0, [true, true]);
    b.box(S.nosing, Math.min(xa, xa + dir * 0.045), yt + 0.003, z0 + 0.03, Math.max(xa, xa + dir * 0.045), yt + 0.007, z1 - 0.03, 'xXYzZ');
    b.flat(mats.carpetRed, xa + dir * 0.05, xe - dir * 0.01, c0, c1, yt + 0.004);
  }
}

/** oak string board 0.06 thick centred on z = zs along a flight, moulded with a gilt bead; clipFoot: sits on the floor at xb */
function stringBoard(b, S, xb, xt, y0, y1, zs, clipFoot = false) {
  const dir = Math.sign(xt - xb), k = (y1 - y0) / Math.abs(xt - xb), cl = S.cl;
  const xs = clipFoot ? xb + dir * (D_SOFF / k) : xb, ys = clipFoot ? y0 : y0 - D_SOFF;
  const outline = [[xb, y0 + cl], [xt, y1 + cl], [xt, y1 - D_SOFF], [xs, ys], ...(clipFoot ? [[xb, y0]] : [])];
  for (const s of [-1, 1]) b.poly(S.rail, outline.map(([x, y]) => [x, y, zs + s * 0.03]), [0, 0, s]);
  b.poly(S.rail, [[xs, ys, zs - 0.03], [xt, y1 - D_SOFF, zs - 0.03], [xt, y1 - D_SOFF, zs + 0.03], [xs, ys, zs + 0.03]], [dir * (y1 - y0), -Math.abs(xt - xb), 0]);
  b.wallZ(S.rail, xb, zs - 0.03, zs + 0.03, clipFoot ? y0 : y0 - D_SOFF, y0 + cl, -dir); // end grain at the foot / head
  b.wallZ(S.rail, xt, zs - 0.03, zs + 0.03, y1 - D_SOFF, y1 + cl, dir);
  const xg = clipFoot ? xb + dir * (0.16 / k) : xb, yg = clipFoot ? y0 : y0 - 0.16;
  for (const s of [-1, 1]) b.bar(mats.gold, [xg, yg, zs + s * 0.034], [xt, y1 - 0.16, zs + s * 0.034], 0.008, 0.018);
}

/** plaster soffit under a flight between two strings, with two oak ribs */
function soffit(b, xb, xt, y0, y1, z0, z1) {
  const dir = Math.sign(xt - xb), run = Math.abs(xt - xb), rise = y1 - y0, yb = y0 - D_SOFF + 0.05, ye = y1 - D_SOFF + 0.05;
  b.poly(mats.plaster, [[xb, yb, z0], [xt, ye, z0], [xt, ye, z1], [xb, yb, z1]], [dir * rise, -run, 0]);
  for (const z of [z0 + (z1 - z0) / 3, z0 + (2 * (z1 - z0)) / 3]) b.bar(mats.oak, [xb, yb - 0.035, z], [xt, ye - 0.035, z], 0.05, 0.035);
}

/** balustrade along a flight: capping on the string, sheared iron scroll panels, moulded handrail */
function slopeBalustrade(world, deck, b, S, xb, y0, xt, y1, zz) {
  const zone = world.zone(deck, (xb + xt) / 2), run = Math.abs(xt - xb), rise = y1 - y0, dir = Math.sign(xt - xb);
  b.bar(S.rail, [xb, y0 + S.cl, zz], [xt, y1 + S.cl, zz], 0.1, 0.035);
  b.wallZ(S.rail, xb, zz - 0.05, zz + 0.05, y0 + S.cl, y0 + S.cl + 0.035, -dir); b.wallZ(S.rail, xt, zz - 0.05, zz + 0.05, y1 + S.cl, y1 + S.cl + 0.035, dir);
  const n = Math.max(1, Math.round(run / 0.75)), sdx = (xt - xb) / n, sdy = rise / n;
  for (let i = 0; i < n; i++) shear(zone, ironPanel(), xb + sdx * i, y0 + sdy * i + S.cl + 0.035, zz, sdx, sdy, RAIL_H - S.cl - 0.04);
  railX(world, deck, b, S, xb, y0, xt, y1, zz);
}

/** panelled oak wall face in the plane z = zz (facing nz) or x = xx (facing nx) with dado rail, fielded panels and cornice */
function panelWall(b, plane, a0, a1, y0, y1, n, o = {}) {
  const P = (a, y, off = 0) => (plane.axis === 'z' ? [a, y, plane.c + n * off] : [plane.c + n * off, y, a]);
  const A = plane.axis === 'z' ? [1, 0, 0] : [0, 0, 1], O = plane.axis === 'z' ? [0, 0, n] : [n, 0, 0];
  const L = a1 - a0;
  if (L < 0.05 || y1 - y0 < 0.1) return;
  b.poly(mats.oakPanel, [P(a0, y0), P(a1, y0), P(a1, y1), P(a0, y1)], O);
  const dado = Math.min(0.9, (y1 - y0) * 0.4);
  b.sweep(mats.oak, DADO, P(a0, y0 + dado), A, O, [0, 1, 0], L, [true, true]);
  { const p = P(a0, y0), q = P(a1, y0 + 0.14, 0.02); b.box(mats.oak, Math.min(p[0], q[0]), p[1], Math.min(p[2], q[2]), Math.max(p[0], q[0]), q[1], Math.max(p[2], q[2]), plane.axis === 'z' ? (n < 0 ? 'xXYz' : 'xXYZ') : (n < 0 ? 'zZYx' : 'zZYX')); } // skirting
  const nb = Math.max(1, Math.round(L / (o.pitch ?? 0.85))), pw = L / nb;
  const skip = o.skip ?? [];
  for (let i = 0; i < nb; i++) {
    const am = a0 + pw * (i + 0.5);
    if (pw - 0.14 > 0.15 && dado - 0.3 > 0.15) b.fielded(mats.oak, P(am, y0 + 0.14 + (dado - 0.2) / 2, 0.002), A, O, [0, 1, 0], pw - 0.14, dado - 0.3, 0.012, 0.04);
    const u0 = y0 + dado + 0.15, u1 = Math.min(y1 - 0.25, y0 + dado + 1.6);
    if (u1 - u0 > 0.3 && !skip.some(([s, e]) => am > s && am < e)) b.fielded(mats.oak, P(am, (u0 + u1) / 2, 0.002), A, O, [0, 1, 0], pw - 0.16, u1 - u0, 0.012, 0.05);
  }
  if (o.cornice !== false) {
    b.sweep(mats.oak, ENTAB.map(([u, v]) => [u * 0.8, v + 0.12]), P(a0, y1 - 0.12), A, O, [0, 1, 0], L, [true, true]);
    b.sweep(mats.gold, [[0, 0], [0.052, 0], [0.052, 0.012], [0, 0.012]], P(a0, y1 - 0.135), A, O, [0, 1, 0], L, [true, true]);
  }
}

/** which work of art hangs on the back wall of a half-landing */
function landingArt(f) {
  if (f.last) return f.st.id === 'grandFwd' ? 'honour' : 'clock';
  if (f.st.id === 'grandFwd' && f.from === 'D') return null; // the Aubusson tapestry of the Reception Room (d-hero.js)
  return 'painting';
}
/** decks on which a bronze cherub stands on the port newel at the foot of the central flight */
const cherubOn = (st, deck) => deck === 'A' || (st.id === 'grandFwd' && deck === 'D');

function buildImperial(world, st, B) {
  const S = STYLE.grand, P = imperialPlan(st), ivs = stairFlights().filter((f) => f.st === st);
  const { back, x0, xl, xf, hw, hwi, cw, g, gc, zc } = P;
  const yLow = DECK_Y[st.decks[0]], top = st.decks[st.decks.length - 1], yTop = DECK_Y[top], yCeil = ceilingY(top);

  for (const f of ivs) {
    const bl = B(f.from), bu = B(f.to), { y0, ym, y1 } = f;
    const yNext = f.last ? yCeil : ivs[f.k + 1].ym - LAND_T;

    // ---- central flight (foot at xf on the lower deck, climbing aft to the landing)
    stepRun(bl, S, xf, xl, zc - cw, zc + cw, y0, ym);
    for (const s of [-1, 1]) {
      const zs = zc + s * (cw - 0.03);
      stringBoard(bl, S, xf, xl, y0, ym, zs, f.first);
      slopeBalustrade(world, f.from, bl, S, xf, y0, xl, ym, zs);
    }
    if (!f.first) soffit(bl, xf, xl, y0, ym, zc - cw + 0.06, zc + cw - 0.06); // (lowest deck: inside the closet)
    world.addRamp({ x0: xf, x1: xl, z0: zc - cw, z1: zc + cw, y0, y1: ym, axis: 'x' });

    // ---- half-landing: oak floor with carpet field, plaster soffit with gilt frame, moulded front edge
    bl.flat(S.tread, x0, xl, zc - hwi, zc + hwi, ym);
    bl.flat(mats.carpetRed, x0 + 0.3, xl - 0.15, zc - hwi + 0.3, zc + hwi - 0.3, ym + 0.004);
    bl.box(mats.brass, xl - 0.15, ym, zc - hwi + 0.3, xl - 0.12, ym + 0.008, zc + hwi - 0.3, 'XYx');
    bl.flat(mats.plaster, x0, xl, zc - hwi, zc + hwi, ym - LAND_T, true);
    bl.wallZ(S.rail, xl, zc - hwi, zc + hwi, ym - LAND_T, ym, 1);
    bl.sweep(mats.oak, ENTAB, [xl, ym - LAND_T, zc - hwi], [0, 0, 1], [1, 0, 0], [0, 1, 0], 2 * hwi, [true, true]);
    bl.wallZ(S.rail, xl, zc - hwi, zc + hwi, ym - LAND_T - 0.12, ym - LAND_T, -1); // back of the moulding
    for (const [a, c, d, e] of [[x0 + 0.25, xl - 0.25, zc - hwi + 0.25, zc - hwi + 0.29], [x0 + 0.25, xl - 0.25, zc + hwi - 0.29, zc + hwi - 0.25], [x0 + 0.25, x0 + 0.29, zc - hwi + 0.25, zc + hwi - 0.25], [xl - 0.29, xl - 0.25, zc - hwi + 0.25, zc + hwi - 0.25]]) {
      bl.box(mats.gold, a, ym - LAND_T - 0.02, d, c, ym - LAND_T, e, 'xXyzZ');
    }
    world.addFloor({ y: ym, x0, x1: xl, z0: zc - hwi, z1: zc + hwi });

    // ---- side flights (landing → upper deck, towards +x)
    for (const s of [-1, 1]) {
      const za = zc + s * (cw + g), zb = zc + s * hwi, z0 = Math.min(za, zb), z1 = Math.max(za, zb);
      stepRun(bl, S, xl, xf, z0, z1, ym, y1);
      for (const zs of [za + s * 0.03, zb - s * 0.03]) {
        stringBoard(bl, S, xl, xf, ym, y1, zs);
        slopeBalustrade(world, f.from, bl, S, xl, ym, xf, y1, zs);
      }
      soffit(bl, xl, xf, ym, y1, z0 + 0.06, z1 - 0.06);
      world.addRamp({ x0: xl, x1: xf, z0, z1, y0: ym, y1, axis: 'x' });
    }

    // ---- walls of the landing bay: back wall (pier front) with art, inner faces of the side walls
    panelWall(bl, { axis: 'x', c: x0 }, zc - hwi, zc + hwi, ym, yNext, 1, { pitch: 0.9, skip: [[zc - 1.0, zc + 1.0]] });
    for (const s of [-1, 1]) panelWall(bl, { axis: 'z', c: zc + s * hwi }, x0, xl, ym, yNext, -s, { pitch: 0.9 });
    const zone = world.zone(f.from, x0), hP = Math.min(2.5, yNext - ym - 0.05);
    for (const s of [-1, 1]) {
      place(zone, pilaster({ h: Math.round(hP * 20) / 20, w: 0.26, mat: 'oak', capital: 'gold' }), x0 + 0.04, ym, zc + s * (hwi - 0.2), 0);
      const sc = sconce(); sc.position.set(x0 + 0.01, ym + 1.9, zc + s * (hwi - 0.75)); zone.add(sc);
    }
    world.addLamp({ x: x0 + 0.7, y: ym + 2.0, z: zc, intensity: 0.9 });
    const art = landingArt(f), wArt = Math.min(1.6, 2 * hwi - 1.9);
    if (art === 'honour' || art === 'clock') {
      place(zone, honourGlory({ w: Math.round(wArt * 20) / 20, h: 1.5, figures: art === 'honour' }), x0 + 0.005, ym + 0.62, zc, 0);
      if (art === 'honour') {
        world.addInfo({
          title: 'Ehre und Ruhm krönen die Zeit', x: xl + 0.6, y: ym + 1.5, z: zc, radius: 3.2,
          text: 'Auf dem Zwischenpodest zwischen A-Deck und Bootsdeck hing die von Charles Wilson geschnitzte Eichentafel „Honour and Glory crowning Time“: Zwei geflügelte Frauengestalten – die Ehre mit einem Buch, der Ruhm mit einem Palmzweig – krönen die Uhr mit einem Lorbeerkranz. Von hier teilt sich die Treppe in zwei Seitenläufe, die zum Bootsdeck unter die Glaskuppel führen.',
        });
      }
    } else if (art === 'painting') {
      painting(bl, x0, ym + 1.45, zc, Math.min(1.5, wArt), 1.0, f.k % 2);
    }

    // ---- rim of the well in the upper deck: moulded oak downstand beams (closed on both faces: the well side carries
    //      an entablature, the hall side a gilt bead), gallery balustrade on the long sides
    const yb = y1 - BEAM;
    for (const s of [-1, 1]) {
      const zi = zc + s * hwi, zo = zc + s * hw;
      bu.box(S.wall, xl, yb, Math.min(zi, zo), xf + 0.1, y1, Math.max(zi, zo), 'zZy');
      bu.sweep(mats.oak, ENTAB, [xl, yb + 0.12, zi], [1, 0, 0], [0, 0, -s], [0, 1, 0], xf - xl, [true, true]);
      bu.box(mats.gold, xl, yb + 0.1, Math.min(zo, zo + s * 0.012), xf + 0.1, yb + 0.115, Math.max(zo, zo + s * 0.012), 'yYzZX');
      railX(world, f.to, bu, S, xl, y1, xf, y1, zc + s * (hwi + 0.04));
    }
    // forward beam across the well (its aft face stops below the top risers of the side flights)
    bu.box(S.wall, xf, yb, zc - hw, xf + 0.1, y1, zc + hw, 'Xy');
    bu.wallZ(S.wall, xf, zc - cw - g, zc + cw + g, yb, y1, -1);
    for (const s of [-1, 1]) bu.wallZ(S.wall, xf, Math.min(zc + s * (cw + g), zc + s * hwi), Math.max(zc + s * (cw + g), zc + s * hwi), yb, y1 - 0.185, -1);
    bu.sweep(mats.oak, ENTAB, [xf + 0.1, yb + 0.12, zc - hw], [0, 0, 1], [1, 0, 0], [0, 1, 0], 2 * hw, [true, true]);
    bu.box(mats.gold, xf + 0.1, yb + 0.1, zc - hw, xf + 0.112, yb + 0.115, zc + hw, 'XyY');
    newel(world, f.from, S, xl, zc - gc, ym); newel(world, f.from, S, xl, zc + gc, ym);

    // ---- the lowest deck: panelled closet under the first landing and the side flights (arched doors facing the hall)
    if (f.first) {
      for (const s of [-1, 1]) {
        const za = zc + s * cw, zb = zc + s * hwi, yt = y1 - D_SOFF;
        bl.wallZ(S.wall, xf, Math.min(za, zb), Math.max(za, zb), y0, yt, 1);
        const zm = (za + zb) / 2, dw = Math.min(0.8, Math.abs(zb - za) - 0.3);
        bl.fielded(mats.oak, [xf + 0.002, y0 + 0.95, zm], [0, 0, 1], [1, 0, 0], [0, 1, 0], dw, 1.7, 0.014, 0.05);
        const arc = []; for (let i = 0; i <= 8; i++) { const a = Math.PI * (i / 8); arc.push([xf + 0.03, y0 + 1.8 + Math.sin(a) * dw * 0.5, zm - Math.cos(a) * dw * 0.5]); }
        for (let i = 0; i < 8; i++) bl.prism(mats.oak, arc[i], arc[i + 1], 0.03, 5);
        for (const e of [-1, 1]) bl.box(mats.oak, xf, y0, zm + e * dw * 0.5 - 0.04, xf + 0.05, y0 + 1.8, zm + e * dw * 0.5 + 0.04, 'XzZ');
        bl.box(mats.brass, xf + 0.03, y0 + 1.0, zm - s * (dw * 0.5 - 0.1) - 0.015, xf + 0.07, y0 + 1.12, zm - s * (dw * 0.5 - 0.1) + 0.015);
        if (yt - y0 > 2.25) bl.fielded(mats.oak, [xf + 0.002, (y0 + 2.12 + yt) / 2, zm], [0, 0, 1], [1, 0, 0], [0, 1, 0], dw, yt - y0 - 2.22, 0.01, 0.04);
        world.addCollider(xf - 0.06, y0, Math.min(za, zb), xf, y0 + 2.0, Math.max(za, zb));
        // inner wall of the closet (seen through the central balustrade) and the front of the wall band
        const zi = zc + s * (cw + g);
        bl.poly(S.wall, [[xl, y0, zi], [xf, y0, zi], [xf, y1 - D_SOFF, zi], [xl, ym - D_SOFF, zi]], [0, 0, -s]);
        bl.wallZ(S.wall, xf, Math.min(zc + s * hwi, zc + s * hw), Math.max(zc + s * hwi, zc + s * hw), y0, y1 + S.cl, 1);
        // outer spandrel under the side flight, up to its string
        const zo = zc + s * hw;
        bl.poly(S.wall, [[xl, y0, zo], [xf, y0, zo], [xf, y1 + S.cl, zo], [xl, ym + S.cl, zo]], [0, 0, s]);
        bl.bar(S.rail, [xl, ym + S.cl, zc + s * (hw - IMP_BAND / 2)], [xf, y1 + S.cl, zc + s * (hw - IMP_BAND / 2)], IMP_BAND + 0.02, 0.03);
        const n = 3, pw = (xf - xl) / n;
        for (let i = 0; i < n; i++) {
          const xa = xl + pw * i + 0.07, xe = xl + pw * (i + 1) - 0.07, topY = ym + ((xa - xl) / (xf - xl)) * (y1 - ym) + S.cl - 0.12;
          if (topY - (y0 + 0.14) > 0.3) bl.fielded(mats.oak, [(xa + xe) / 2, (topY + y0 + 0.14) / 2, zo + s * 0.002], [1, 0, 0], [0, 0, s], [0, 1, 0], xe - xa, topY - y0 - 0.14, 0.012, 0.045);
        }
      }
    }
  }

  // ---- per deck: outer faces of the landing bay walls / pier, newels at the foot line, ceiling lamp in front of the foot
  for (const deck of st.decks) {
    const Y = DECK_Y[deck], yc = ceilingY(deck), b = B(deck), rises = ivs.some((f) => f.from === deck), zone = world.zone(deck, xf);
    for (const s of [-1, 1]) {
      panelWall(b, { axis: 'z', c: zc + s * hw }, back, xl, Y, yc, s, { pitch: 0.95 });
      b.wallZ(S.rail, xl, Math.min(zc + s * hwi, zc + s * hw), Math.max(zc + s * hwi, zc + s * hw), Y, yc, 1);
      place(zone, pilaster({ h: Math.round((yc - Y) * 20) / 20, w: 0.2, mat: 'oak', capital: 'gold' }), xl - 0.1, Y, zc + s * (hw + 0.04), s > 0 ? -Math.PI / 2 : Math.PI / 2);
      // newels: outer corner of the gallery, gap newel between the central and the side flight
      newel(world, deck, S, xf, zc + s * (hwi + 0.04), Y);
      const lamp = rises && !(s < 0 && cherubOn(st, deck));
      newel(world, deck, S, xf, zc + s * gc, Y, lamp || (rises && cherubOn(st, deck)));
      if (rises && s < 0 && cherubOn(st, deck)) {
        place(zone, cherubLamp(), xf, Y + 1.08, zc - gc, 0);
        world.addLamp({ x: xf, y: Y + 2.3, z: zc - gc, intensity: 0.9 });
      } else if (lamp) {
        place(zone, newelLamp(), xf, Y + 1.08, zc + s * gc, 0);
        world.addLamp({ x: xf, y: Y + 1.7, z: zc + s * gc, intensity: 0.5 });
      }
    }
    if (deck !== top) fixture(world, deck, xf + 1.3, zc, yc, true);
  }
  // the top deck: balustrade across the head of the central flight, chandelier under the dome
  const bt = B(top);
  railZ(world, top, bt, S, xf + 0.04, zc - gc, zc + gc, yTop);
  world.addCollider(xf - 0.04, yTop, zc - gc, xf + 0.08, yTop + 1.1, zc + gc);
  const xc = xf - 0.65, yh = yCeil + 0.1, chain = yCeil + 1.6;
  bt.prism(mats.gold, [xc, chain, zc], [xc, yh, zc], 0.014, 6);
  const ch = place(world.zone(top, xc), chandelier({ arms: 8 }), xc, yh, zc, 0); ch.scale.setScalar(1.5);
  world.addLamp({ x: xc, y: yh - 1.0, z: zc, intensity: 1.4 });

  // ---- colliders: pier, wall / gallery bands along both long sides, slots between the central and the side flights
  world.addCollider(back, yLow, zc - hw, x0, yCeil, zc + hw);
  for (const s of [-1, 1]) {
    world.addCollider(back, yLow, zc + s * hwi, xf, yTop + 1.1, zc + s * hw);
    world.addCollider(xl, yLow, zc + s * cw, xf, yTop + 1.1, zc + s * (cw + g));
  }
}

/** Scene module: builds every staircase. */
export async function build(world) {
  if (world._kitStairs) return {};
  world._kitStairs = true;
  const batches = new Map();
  const B = (deck) => { let b = batches.get(deck); if (!b) batches.set(deck, (b = new Batch(world, deck))); return b; };

  await world.tick();
  for (const f of stairFlights()) if (f.type === 'scissor') buildFlight(world, f, B(f.from), B(f.to));

  await world.tick();
  for (const st of STAIRS) {
    if (isImperial(st)) { buildImperial(world, st, B); continue; }
    const grand = st.style === 'grand';
    for (const deck of st.decks) {
      const cy = ceilingY(deck);
      fixture(world, deck, st.x0 - 1, st.zc, cy, grand);
      fixture(world, deck, st.x1 + 1, st.zc, cy, grand);
    }
  }

  // machinery access openings in the F-deck floor: railing on three sides (open at the +x end), slab rims
  const bf = B('F'), yf = DECK_Y.F, S = STYLE.steel;
  await world.tick();
  for (const m of MACHINERY_ACCESS) {
    for (const z of [m.z0, m.z1]) {
      railX(world, 'F', bf, S, m.x0, yf, m.x1, yf, z);
      world.addCollider(m.x0, yf, z - 0.05, m.x1, yf + 1.0, z + 0.05);
      bf.wallX(mats.steel, z, m.x0, m.x1, yf - SLAB, yf, z === m.z0 ? 1 : -1);
    }
    railZ(world, 'F', bf, S, m.x0, m.z0, m.z1, yf);
    bf.post(S.rail, m.x0, m.z0, yf, yf + RAIL_H, 0.05); bf.post(S.rail, m.x0, m.z1, yf, yf + RAIL_H, 0.05);
    world.addCollider(m.x0 - 0.05, yf, m.z0, m.x0 + 0.05, yf + 1.0, m.z1);
    bf.wallZ(mats.steel, m.x0, m.z0, m.z1, yf - SLAB, yf, 1); bf.wallZ(mats.steel, m.x1, m.z0, m.z1, yf - SLAB, yf, -1);
  }

  await world.tick();
  for (const b of batches.values()) b.flush();
  return {};
}
