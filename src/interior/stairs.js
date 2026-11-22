// Interior kit – all STAIRS of the ship (scene module) + floor-hole / keep-out helpers for deck layouts.
import * as THREE from 'three';
import { mats } from '../core/materials.js';
import { DECK_Y, STAIRS, MACHINERY_ACCESS, SLAB, ceilingY } from '../core/constants.js';
import { Batch, kitMats, overlap } from './batch.js';
import { def, place } from './props-core.js';
import { ceilingLight, ceilingRose } from './props-decor.js';

const RISER = 0.18;
const RAIL_H = 0.92;
const T = 0.04; // half thickness of closure walls

/** The +x end of each MACHINERY_ACCESS opening is the open (step-off) end; the other three sides get a railing. */
export const MACHINERY_ACCESS_OPEN_END = '+x';

let _flights = null;
/** All flights of all stairs with their geometry (see constants.js for the convention). */
export function stairFlights() {
  if (_flights) return _flights;
  _flights = [];
  for (const st of STAIRS) {
    for (let k = 0; k < st.decks.length - 1; k++) {
      const even = k % 2 === 0;
      _flights.push({
        st, k, from: st.decks[k], to: st.decks[k + 1], y0: DECK_Y[st.decks[k]], y1: DECK_Y[st.decks[k + 1]],
        xb: even ? st.x0 : st.x1, xt: even ? st.x1 : st.x0, dir: even ? 1 : -1, side: even ? -1 : 1,
        z0: even ? st.zc - st.lane : st.zc, z1: even ? st.zc : st.zc + st.lane,
        zo: even ? st.zc - st.lane : st.zc + st.lane, zc: st.zc, last: k === st.decks.length - 2,
      });
    }
  }
  return _flights;
}

/** Openings in the FLOOR of `deck`: lane rectangle of every flight arriving from below (+ machinery access on F). */
export function stairHoles(deck) {
  const out = stairFlights().filter((f) => f.to === deck).map((f) => ({ id: f.st.id, x0: f.st.x0, x1: f.st.x1, z0: f.z0, z1: f.z1 }));
  if (deck === 'F') for (const m of MACHINERY_ACCESS) out.push({ id: m.id, x0: m.x0, x1: m.x1, z0: m.z0, z1: m.z1 });
  return out;
}
/** Lane rectangles occupied by the (enclosed) flights that RISE from `deck`. */
export function stairSolids(deck) {
  return stairFlights().filter((f) => f.from === deck).map((f) => ({ id: f.st.id, x0: f.st.x0, x1: f.st.x1, z0: f.z0, z1: f.z1 }));
}
/** Rectangles deck layouts must keep free of walls and furniture (both lanes, +2 m in x, +0.3 m in z). */
export function stairKeepouts(deck) {
  const out = STAIRS.filter((s) => s.decks.includes(deck)).map((s) => ({ id: s.id, x0: s.x0 - 2, x1: s.x1 + 2, z0: s.zc - s.lane - 0.3, z1: s.zc + s.lane + 0.3 }));
  if (deck === 'F') for (const m of MACHINERY_ACCESS) out.push({ id: m.id, x0: m.x0 - 0.4, x1: m.x1 + 1.6, z0: m.z0 - 0.4, z1: m.z1 + 0.4 });
  return out;
}
/** Landing points (free floor at both ends of each stair) on a deck: [{id,x,z}]. */
export function stairLandings(deck) {
  return STAIRS.filter((s) => s.decks.includes(deck)).flatMap((s) => [{ id: s.id, x: s.x0 - 1, z: s.zc }, { id: s.id, x: s.x1 + 1, z: s.zc }]);
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
    for (const hh of [RAIL_H, 0.48]) b.prism(S.rail, [xa, ya + hh, zz], [xe, ye + hh, zz], hh === RAIL_H ? 0.022 : 0.017, 6);
    const n = Math.max(1, Math.round(L / 1.2));
    for (let i = 0; i <= n; i++) { const t = i / n, x = xa + dx * t, y = ya + dy * t; b.prism(S.rail, [x, y, zz], [x, y + RAIL_H, zz], 0.018, 6); if (i > 0 && i < n) place(zone, knuckle(), x, y + RAIL_H - 0.03, zz, 0); }
    return;
  }
  const l = Math.hypot(dx, dy);
  b.sweep(S.rail, RAIL[S.newel === 'grand' ? 'grand' : 'oak'], [xa, ya + RAIL_H, zz], [dx / l, dy / l, 0], [0, 0, 1], [0, 1, 0], l, [true, true]);
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
    for (const hh of [RAIL_H, 0.48]) b.prism(S.rail, [xx, yf + hh, za], [xx, yf + hh, ze], hh === RAIL_H ? 0.022 : 0.017, 6);
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

/** bronze cherub holding a torch lamp (newel of the A-deck grand staircase) – origin = top of the newel */
const cherubLamp = def('cherubLamp', [0.3, 0.3, 0.95], (p) => {
  const B = kitMats.bronze;
  p.lathe(B, [[0, 0], [0.1, 0], [0.1, 0.02], [0.08, 0.04], [0.07, 0.07], [0.09, 0.09], [0, 0.09]], 0, 0, 0, 16);
  // legs (one forward), torso, head with curls, arms – the raised right arm holds the torch
  p.loft(B, [[-0.03, 0.09, 0.03], [-0.035, 0.16, 0.035], [-0.02, 0.22, 0.03], [-0.01, 0.28, 0.025]], [0.022, 0.026, 0.03, 0.034], 8);
  p.loft(B, [[0.05, 0.1, -0.03], [0.04, 0.15, -0.035], [0.0, 0.2, -0.03], [-0.01, 0.27, -0.025]], [0.02, 0.025, 0.03, 0.034], 8);
  p.pil(B, 0.13, 0.16, 0.12, -0.01, 0.25, 0, 0.7, 0.8, 5, 12);
  p.pil(B, 0.1, 0.07, 0.11, 0.0, 0.38, 0, 0.8, 0.8, 4, 10);
  p.s(B, 0.062, 0.0, 0.47, 0, 1, 1.05, 1, false);
  for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; p.s(B, 0.022, Math.cos(a) * 0.045 - 0.01, 0.5 + Math.sin(a * 2) * 0.01, Math.sin(a) * 0.045, 1, 1, 1); }
  p.loft(B, [[0.0, 0.42, -0.055], [0.04, 0.5, -0.07], [0.07, 0.6, -0.06], [0.09, 0.68, -0.04]], [0.022, 0.02, 0.018, 0.016], 7);
  p.loft(B, [[0.0, 0.42, 0.055], [0.05, 0.38, 0.08], [0.09, 0.34, 0.07]], [0.022, 0.019, 0.016], 7);
  // wings (feathered, extruded) on the back
  for (const s of [-1, 1]) {
    const w = p.extZ(B, [[0, 0], [0.05, 0.03], [0.1, 0.1], [0.13, 0.19], [0.1, 0.16], [0.08, 0.17], [0.06, 0.13], [0.04, 0.13], [0.02, 0.08]], 0.012, -0.05, 0.36, s * 0.04, 0.004);
    w.rotation.set(0, Math.PI + s * 0.5, 0.2);
  }
  // torch with glass flame
  p.lathe(mats.gold, [[0, 0], [0.012, 0], [0.01, 0.14], [0.03, 0.17], [0.035, 0.19], [0, 0.19]], 0.09, 0.66, -0.04, 10);
  p.lathe(mats.lampGlow, [[0, 0], [0.03, 0], [0.042, 0.04], [0.035, 0.09], [0.015, 0.13], [0, 0.15]], 0.09, 0.85, -0.04, 12);
});

/** "Honour and Glory crowning Time": carved relief panel w × h with clock, two winged figures, laurel, carved frame; faces +x */
const honourGlory = def('honourGlory', (o) => [o.w ?? 2, 0.2, o.h ?? 1.3], (p, o) => {
  const w = o.w ?? 2, h = o.h ?? 1.3, W = mats.oak, Dk = mats.woodDark;
  p.b(W, 0.03, h, w, 0.015, 0, 0);
  // carved frame (moulded) and broken pediment
  for (const [y, sy] of [[0, 0.07], [h - 0.07, 0.07]]) p.bb(W, 0.06, sy, w + 0.14, 0.03, y, 0, 0.015);
  for (const s of [-1, 1]) p.bb(W, 0.06, h, 0.07, 0.03, 0, s * (w / 2 + 0.035), 0.015);
  p.extX(W, [[-w / 2 - 0.07, 0], [w / 2 + 0.07, 0], [w / 2 + 0.07, 0.05], [0.25, 0.22], [0.18, 0.18], [w / 2 - 0.05, 0.05], [-w / 2 + 0.05, 0.05], [-0.18, 0.18], [-0.25, 0.22], [-w / 2 - 0.07, 0.05]], 0.08, 0.04, h, 0, 0.008);
  // clock: carved case, dial, hands
  const cy = h * 0.55;
  p.latheX(W, [[0, 0], [0.24, 0], [0.25, 0.02], [0.22, 0.05], [0.2, 0.06], [0, 0.06]], 0.03, cy, 0, 24);
  p.latheX(mats.gold, [[0.17, 0], [0.19, 0.005], [0.18, 0.015], [0.16, 0.012]], 0.09, cy, 0, 24);
  p.cx(kitMats.clockFace, 0.165, 0.006, 0.093, cy, 0, 24);
  const hand = (len, a, t) => { const m = p.b(Dk, 0.004, len, t, 0.1, 0, 0); m.position.set(0.1, cy + (Math.cos(a) * len) / 2, (-Math.sin(a) * len) / 2); m.rotation.x = -a; };
  hand(0.11, -0.9, 0.012); hand(0.14, 0.75, 0.008);
  // two winged robed figures (layered relief): robes, heads, wings, raised arms holding a wreath over the clock
  for (const s of [-1, 1]) {
    const zc = s * w * 0.27;
    p.extX(Dk, [[-0.13, 0.08], [0.13, 0.08], [0.1, 0.35], [0.07, 0.6], [0.04, 0.72], [-0.04, 0.72], [-0.07, 0.6], [-0.1, 0.35]].map(([a, b]) => [a * -s, b * h / 1.3]), 0.05, 0.05, 0, zc, 0.012);
    p.extX(W, [[-0.1, 0.12], [0.1, 0.12], [0.08, 0.38], [0.05, 0.6], [-0.05, 0.6], [-0.08, 0.38]].map(([a, b]) => [a * -s, b * h / 1.3]), 0.03, 0.08, 0, zc, 0.008);
    p.s(W, 0.06, 0.08, 0.8 * h / 1.3, zc, 0.8, 1.1, 0.9, false);
    const wing = p.extX(W, [[0, 0], [0.12, 0.08], [0.22, 0.25], [0.26, 0.42], [0.2, 0.36], [0.17, 0.4], [0.13, 0.32], [0.09, 0.33], [0.05, 0.22]].map(([a, b]) => [a * s, b]), 0.025, 0.045, 0.55 * h / 1.3, zc + s * 0.06, 0.006);
    void wing;
    p.loft(W, [[0.09, 0.62 * h / 1.3, zc - s * 0.04], [0.1, 0.75 * h / 1.3, zc - s * 0.14], [0.1, 0.85 * h / 1.3, zc - s * 0.25]], 0.024, 6);
  }
  // laurel wreath over the clock and garland below
  for (let i = 0; i <= 12; i++) { const a = Math.PI * (0.15 + (0.7 * i) / 12), lf = p.extX(mats.gold, [[-0.012, 0], [0.012, 0], [0.006, 0.05], [0, 0.06], [-0.006, 0.05]], 0.006, 0.1, cy + Math.sin(a) * 0.3, Math.cos(a) * 0.3, 0); lf.rotation.x = a - Math.PI / 2; }
  for (let i = 0; i <= 10; i++) { const t = i / 10, z = -w * 0.3 + w * 0.6 * t, y = 0.14 + 0.06 * Math.sin(Math.PI * t); p.s(W, 0.028, 0.06, y, z, 1, 0.8, 1); }
});

/** Scene module: builds every staircase. */
export async function build(world) {
  if (world._kitStairs) return {};
  world._kitStairs = true;
  const batches = new Map();
  const B = (deck) => { let b = batches.get(deck); if (!b) batches.set(deck, (b = new Batch(world, deck))); return b; };

  for (const f of stairFlights()) buildFlight(world, f, B(f.from), B(f.to));

  for (const st of STAIRS) {
    const grand = st.style === 'grand';
    for (const deck of st.decks) {
      const cy = ceilingY(deck);
      fixture(world, deck, st.x0 - 1, st.zc, cy, grand);
      fixture(world, deck, st.x1 + 1, st.zc, cy, grand);
    }
    if (grand && st.decks.includes('A')) {
      const f = stairFlights().find((q) => q.st === st && q.from === 'A');
      if (f) {
        place(world.zone('A', f.xb), cherubLamp(), f.xb, f.y0 + 1.08, f.zc, f.dir > 0 ? 0 : Math.PI);
        world.addLamp({ x: f.xb, y: f.y0 + 2.2, z: f.zc, intensity: 0.9 });
        if (st.id === 'grandFwd') {
          // "Honour and Glory crowning Time": carved panel with clock on the wall that closes the top flight
          const x = f.xt + f.dir * 0.02, zm = (f.z0 + f.z1) / 2, w = Math.min(2.0, f.st.lane - 0.3);
          place(world.zone('A', x), honourGlory({ w, h: 1.3 }), x, f.y0 + 0.9, zm, f.dir > 0 ? 0 : Math.PI);
          world.addInfo({
            title: 'Ehre und Ruhm krönen die Zeit', x: f.xt + f.dir * 1.5, y: f.y0 + 1.5, z: zm, radius: 3.5,
            text: 'Die geschnitzte Eichenholztafel mit der Uhr war das Herzstück der vorderen Großen Treppe. Zwei allegorische Figuren – Ehre und Ruhm – flankieren das Zifferblatt. Die Treppe verband sechs Decks vom Bootsdeck bis hinunter zum E-Deck und wurde von einer Glaskuppel überspannt.',
          });
        }
      }
    }
  }

  // machinery access openings in the F-deck floor: railing on three sides (open at the +x end), slab rims
  const bf = B('F'), yf = DECK_Y.F, S = STYLE.steel;
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

  for (const b of batches.values()) b.flush();
  return {};
}
