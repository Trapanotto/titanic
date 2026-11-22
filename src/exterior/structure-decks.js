import * as THREE from 'three';
import { DECK_Y, SHIP, SLAB, A_HOUSE, BOAT_HOUSES, deckPlanHalfWidth as plan } from '../core/constants.js';
import { mats } from '../core/materials.js';
import {
  T_WALL, BULWARK_H, BULWARK_T, RAIL_H, bw, hullEdge, X, EXT_STAIRS, stairById,
  stations, segCollider, edgeColliders, splitLine,
} from './structure-layout.js';
import { latheGeo, unitCyl, merge, cylG, torusG } from './inst.js';

const { A, B, C, boat } = DECK_Y;
const INF = 1e9;

let INST = null; // instancing collector of the structure build (set by buildDecks)

/**
 * Horizontal deck surface between x0..x1, |z| <= edge(x), minus rectangular holes {x0,x1,z0,z1}.
 * Emits planking quads (facing up, or down for ceilings) and optionally registers the walkable floors.
 */
export function deckRegion(world, batch, { y, x0, x1, edge, holes = [], mat = mats.deckWood, floor = true, down = false, visual = true, step = 4, fx0 = x0, fx1 = x1 }) {
  const cuts = new Set([x0, x1]);
  for (const h of holes) { if (h.x0 > x0 && h.x0 < x1) cuts.add(h.x0); if (h.x1 > x0 && h.x1 < x1) cuts.add(h.x1); }
  const xs = [...cuts].sort((a, b) => a - b);
  for (let k = 0; k < xs.length - 1; k++) {
    const xa = xs[k], xb = xs[k + 1], xm = (xa + xb) / 2;
    let iv = [[-INF, INF]];
    for (const h of holes) {
      if (h.x0 > xm || h.x1 < xm) continue;
      const next = [];
      for (const [lo, hi] of iv) {
        if (h.z1 <= lo || h.z0 >= hi) { next.push([lo, hi]); continue; }
        if (h.z0 > lo) next.push([lo, h.z0]);
        if (h.z1 < hi) next.push([h.z1, hi]);
      }
      iv = next;
    }
    for (const [lo, hi] of iv) {
      if (floor) {
        world.addFloor({ y, x0: k === 0 ? fx0 : xa, x1: k === xs.length - 2 ? fx1 : xb, z0: lo === -INF ? -99 : lo, z1: hi === INF ? 99 : hi, clip: edge });
      }
      if (!visual) continue;
      const sub = stations(xa, xb, step, 0.25, edge);
      for (let i = 0; i < sub.length - 1; i++) {
        const a = sub[i], b = sub[i + 1], ea = edge(a), eb = edge(b);
        const la = Math.max(lo, -ea), lb = Math.max(lo, -eb), ha = Math.min(hi, ea), hb = Math.min(hi, eb);
        if (ha - la < 1e-4 && hb - lb < 1e-4) continue;
        if (!down) batch.quad(mat, [a, y, Math.max(ha, la)], [b, y, Math.max(hb, lb)], [b, y, lb], [a, y, la]);
        else batch.quad(mat, [a, y, la], [b, y, lb], [b, y, Math.max(hb, lb)], [a, y, Math.max(ha, la)]);
      }
    }
  }
}

/** Waterway (steel gutter) + teak margin plank along a deck edge z = ±edge(x), with scupper gratings. */
function waterway(batch, x0, x1, y, edge, { margin = true, scuppers = true } = {}) {
  const xs = stations(x0, x1, 2, 0.12, edge);
  for (const s of [1, -1]) {
    for (let i = 0; i < xs.length - 1; i++) {
      const a = xs[i], b = xs[i + 1], ea = edge(a), eb = edge(b);
      if (ea < 0.6 && eb < 0.6) continue;
      const Z = (e, d) => s * Math.max(0, e - d);
      // waterway: sloping steel strip
      batch.oquad(mats.paintGrey, [a, y + 0.012, Z(ea, 0)], [b, y + 0.012, Z(eb, 0)], [b, y + 0.008, Z(eb, 0.32)], [a, y + 0.008, Z(ea, 0.32)], [0, 1, 0]);
      if (margin) {
        batch.oquad(mats.woodDark, [a, y + 0.009, Z(ea, 0.32)], [b, y + 0.009, Z(eb, 0.32)], [b, y + 0.009, Z(eb, 0.56)], [a, y + 0.009, Z(ea, 0.56)], [0, 1, 0]);
        batch.oquad(mats.iron, [a, y + 0.0095, Z(ea, 0.56)], [b, y + 0.0095, Z(eb, 0.56)], [b, y + 0.0095, Z(eb, 0.572)], [a, y + 0.0095, Z(ea, 0.572)], [0, 1, 0]);
      }
    }
    if (scuppers) for (let x = x0 + 2.5; x < x1 - 1; x += 6.5) {
      const e = edge(x); if (e < 1) continue;
      batch.box(mats.iron, x - 0.18, y + 0.012, Math.min(s * (e - 0.05), s * (e - 0.2)), x + 0.18, y + 0.016, Math.max(s * (e - 0.05), s * (e - 0.2)), { skip: 'ny' });
    }
  }
}

// ---------- railing parts (instanced) ----------
const stanchionCache = new Map();
/** Turned stanchion with ball joints at the rail heights (lathe, local y up from the deck). */
function stanchionGeo(h, rails) {
  const k = Math.round(h * 100) + '_' + rails;
  let g = stanchionCache.get(k);
  if (g) return g;
  const prof = [[0.05, 0], [0.045, 0.02], [0.026, 0.045], [0.02, 0.11]];
  for (let r = 1; r <= rails; r++) {
    const ry = (h - 0.05) * (r / (rails + 1)) + 0.03;
    prof.push([0.02, ry - 0.045], [0.034, ry], [0.02, ry + 0.045]);
  }
  prof.push([0.02, h - 0.1], [0.04, h - 0.05], [0.04, h - 0.035]);
  g = latheGeo('stanchion' + k, prof, 6);
  stanchionCache.set(k, g);
  return g;
}

/** Profiled teak top rail between a and b (plan points) at height y. */
function topRail(batch, a, b, y) {
  const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz);
  if (L < 1e-4) return;
  const sx = -dz / L, sz = dx / L; // side
  const prof = [[-0.045, -0.035], [-0.045, -0.005], [-0.035, 0.012], [-0.015, 0.022], [0.015, 0.022], [0.035, 0.012], [0.045, -0.005], [0.045, -0.035]];
  for (let k = 0; k < prof.length; k++) {
    const p = prof[k], q = prof[(k + 1) % prof.length];
    const P = (e, pp) => [e[0] + sx * pp[0], y + pp[1], e[1] + sz * pp[0]];
    const mid = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    batch.oquad(mats.woodDark, P(a, p), P(b, p), P(b, q), P(a, q), [sx * mid[0], mid[1] + 0.005, sz * mid[0]]);
  }
}

/** Open railing along a plan polyline: turned stanchions with ball joints, round bars, teak top rail, one collider per segment. */
export function railRun(world, batch, pts, y, { h = RAIL_H, collide = true, post = 1.5, rails = 3, dodger = false } = {}) {
  const geo = stanchionGeo(h, rails);
  let acc = 0;
  for (let k = 0; k < pts.length - 1; k++) {
    const a = pts[k], b = pts[k + 1];
    const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz);
    if (L < 0.02) continue;
    const n = Math.max(1, Math.round(L / post));
    for (let i = 0; i <= n; i++) {
      if (i === 0 && k > 0) continue;
      const px = a[0] + (dx * i) / n, pz = a[1] + (dz * i) / n;
      if (INST) INST.at(geo, mats.paintWhite, px, y, pz);
      else batch.box(mats.paintWhite, px - 0.022, y, pz - 0.022, px + 0.022, y + h - 0.02, pz + 0.022, { skip: 'ny py' });
    }
    for (let r = 1; r <= rails; r++) {
      const ry = y + (h - 0.05) * (r / (rails + 1)) + 0.03;
      batch.cyl(mats.paintWhite, [a[0], ry, a[1]], [b[0], ry, b[1]], 0.012, 6);
    }
    topRail(batch, a, b, y + h);
    // scarph joints of the teak rail (brass clips)
    for (let s = (6 - (acc % 6)); s < L; s += 6) {
      const px = a[0] + (dx * s) / L, pz = a[1] + (dz * s) / L;
      batch.box(mats.brass, px - 0.03, y + h + 0.018, pz - 0.03, px + 0.03, y + h + 0.026, pz + 0.03, { skip: 'ny' });
    }
    acc += L;
    if (dodger) {
      // canvas dodger laced between the lowest rail and the top rail
      const y0 = y + 0.12, y1 = y + h - 0.06, sx = -dz / L * 0.012, sz = dx / L * 0.012;
      batch.oquad(mats.canvas, [a[0] + sx, y0, a[1] + sz], [b[0] + sx, y0, b[1] + sz], [b[0] + sx, y1, b[1] + sz], [a[0] + sx, y1, a[1] + sz], [sx, 0, sz]);
      batch.oquad(mats.canvas, [a[0] - sx, y0, a[1] - sz], [b[0] - sx, y0, b[1] - sz], [b[0] - sx, y1, b[1] - sz], [a[0] - sx, y1, a[1] - sz], [-sx, 0, -sz]);
      for (let s = 0.15; s < L; s += 0.3) { const px = a[0] + (dx * s) / L, pz = a[1] + (dz * s) / L; batch.cyl(mats.rope, [px, y1 - 0.02, pz], [px, y + h - 0.02, pz], 0.005, 3); }
    }
    if (collide) segCollider(world, a, b, y, y + h + 0.05, 0.06);
  }
}

/** Gate posts at a railing gap with a chain hanging down unhooked from one of them. */
function gapGate(batch, p, q, y) {
  for (const e of [p, q]) {
    batch.cyl(mats.paintWhite, [e[0], y, e[1]], [e[0], y + RAIL_H + 0.06, e[1]], 0.035, 8, true);
    batch.cyl(mats.brass, [e[0], y + RAIL_H + 0.06, e[1]], [e[0], y + RAIL_H + 0.12, e[1]], 0.045, 8, true, 0.02);
  }
  // chain: links hanging from p
  if (!INST) return;
  const g = linkGeo();
  for (const hy of [0.55, 0.95]) {
    let yy = y + hy;
    for (let i = 0; i < 9; i++) {
      INST.at(g, mats.iron, p[0], yy - 0.03, p[1], i % 2 ? Q90 : null);
      yy -= 0.045;
    }
  }
}
let _link = null;
const Q90 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
function linkGeo() { return (_link ||= torusG(0.018, 0.005, 4, 8).scale(1, 1.6, 1)); }

/** Solid hull bulwark (inner face, teak capping rail, plate stays with flanges) between xa and xb on both sides + colliders. */
function bulwark(world, batch, xa, xb, y) {
  const top = y + BULWARK_H;
  const xs = stations(xa, xb, 1.5, 0.3);
  for (const s of [1, -1]) {
    for (let i = 0; i < xs.length - 1; i++) {
      const a = xs[i], b = xs[i + 1], pa = plan(a), pb = plan(b), ia = hullEdge(a), ib = hullEdge(b);
      if (pa < 1e-4 && pb < 1e-4) continue;
      const q = (p0, p1, p2, p3, m) => (s > 0 ? batch.quad(m, p0, p1, p2, p3) : batch.quad(m, p3, p2, p1, p0));
      // inner face (looks inboard)
      q([b, y, s * ib], [a, y, s * ia], [a, top, s * ia], [b, top, s * ib], mats.paintWhite);
      // capping rail: outer lip, rounded top, inner lip, underside
      const oa = pa + 0.04, ob = pb + 0.04, ja = Math.max(0, ia - 0.05), jb = Math.max(0, ib - 0.05), t0 = top - 0.03, t1 = top + 0.05;
      const ma = (oa + ja) / 2, mb = (ob + jb) / 2;
      q([a, t0, s * oa], [b, t0, s * ob], [b, t1 - 0.015, s * ob], [a, t1 - 0.015, s * oa], mats.woodDark);
      q([a, t1 - 0.015, s * oa], [b, t1 - 0.015, s * ob], [b, t1 + 0.012, s * mb], [a, t1 + 0.012, s * ma], mats.woodDark);
      q([a, t1 + 0.012, s * ma], [b, t1 + 0.012, s * mb], [b, t1 - 0.015, s * jb], [a, t1 - 0.015, s * ja], mats.woodDark);
      q([b, t0, s * jb], [a, t0, s * ja], [a, t1 - 0.015, s * ja], [b, t1 - 0.015, s * jb], mats.woodDark);
      q([a, t0, s * ja], [b, t0, s * jb], [b, t0, s * ob], [a, t0, s * oa], mats.woodDark);
      // gunwale angle bar along the inner face top
      q([b, top - 0.12, s * (ib - 0.002)], [a, top - 0.12, s * (ia - 0.002)], [a, top - 0.04, s * (ia - 0.002)], [b, top - 0.04, s * (ib - 0.002)], mats.paintWhite);
      q([a, top - 0.12, s * ia], [b, top - 0.12, s * ib], [b, top - 0.12, s * (ib - 0.07)], [a, top - 0.12, s * (ia - 0.07)], mats.paintWhite);
      // stay (bracket plate with a flanged free edge) at the station
      if (ia > 1.2 && b - a > 0.7) {
        const d = 0.006, hb = top - 0.15, wb = 0.34;
        for (const dd of [-d, d]) {
          batch.otri(mats.paintWhite, [a + dd, y, s * ia], [a + dd, hb, s * ia], [a + dd, y, s * (ia - wb)], [Math.sign(dd), 0, 0]);
        }
        const fl = 0.035;
        batch.oquad(mats.paintWhite, [a - fl, hb, s * ia], [a + fl, hb, s * ia], [a + fl, y, s * (ia - wb)], [a - fl, y, s * (ia - wb)], [0, 0.5, -s]);
        batch.box(mats.paintWhite, a - 0.05, y, Math.min(s * (ia - wb - 0.04), s * (ia - 0.0)), a + 0.05, y + 0.012, Math.max(s * (ia - wb - 0.04), s * ia), { skip: 'ny' });
      }
    }
    // end caps of the plating
    for (const x of [xa, xb]) {
      const p = plan(x), i = hullEdge(x);
      if (p < 0.2) continue;
      batch.quad(mats.paintWhite, [x, y, s * i], [x, y, s * p], [x, top, s * p], [x, top, s * i]);
      batch.quad(mats.paintWhite, [x, y, s * p], [x, y, s * i], [x, top, s * i], [x, top, s * p]);
    }
  }
  edgeColliders(world, xa, xb, y, top + 0.1, BULWARK_T);
  waterway(batch, xa, xb, y, (x) => hullEdge(x));
}

/** Exterior stair along x for side s (+1 starboard / -1 port): ramp, treads with brass nosings, stringers, handrails, colliders. */
function stair(world, batch, st, s) {
  const { xb, xt, yb, yt } = st;
  const z0 = Math.min(s * st.zi, s * st.zo), z1 = Math.max(s * st.zi, s * st.zo);
  world.addRamp({ x0: xb, x1: xt, z0, z1, y0: yb, y1: yt, axis: 'x' });
  const dir = Math.sign(xt - xb), run = Math.abs(xt - xb), rise = yt - yb;
  const N = Math.round(rise / 0.2), dr = rise / N, dx = run / N;
  const len = Math.hypot(run, rise);
  for (let i = 0; i < N; i++) {
    const ua = (i + 0.5) * dx, ub = Math.min((i + 1.5) * dx, run), yy = yb + (i + 1) * dr;
    const xa = xb + dir * ua, xc = xb + dir * ub;
    // teak tread (two boards) + brass nosing + riser plate
    batch.box(mats.woodDark, Math.min(xa, xc) - 0.02, yy - 0.04, z0 + 0.05, Math.max(xa, xc) + 0.02, yy, (z0 + z1) / 2 - 0.004);
    batch.box(mats.woodDark, Math.min(xa, xc) - 0.02, yy - 0.04, (z0 + z1) / 2 + 0.004, Math.max(xa, xc) + 0.02, yy, z1 - 0.05);
    batch.box(mats.brass, xa - dir * 0.035 - 0.012, yy - 0.045, z0 + 0.05, xa - dir * 0.035 + 0.012, yy + 0.004, z1 - 0.05);
    batch.box(mats.paintWhite, xa - 0.012, yy - dr, z0 + 0.05, xa + 0.012, yy - 0.04, z1 - 0.05, { skip: 'py ny' });
  }
  for (const z of [z0 + 0.025, z1 - 0.025]) {
    // stringer: channel section (web + flanges)
    batch.beam(mats.paintWhite, [xb, yb + 0.02, z], [xt, yt + 0.02, z], 0.012, 0.32);
    const zf = z + (z < (z0 + z1) / 2 ? -0.03 : 0.03);
    batch.beam(mats.paintWhite, [xb, yb + 0.17, zf], [xt, yt + 0.17, zf], 0.07, 0.015);
    batch.beam(mats.paintWhite, [xb, yb - 0.13, zf], [xt, yt - 0.13, zf], 0.07, 0.015);
    // hand rail on turned stanchions + intermediate bar
    batch.cyl(mats.woodDark, [xb - dir * 0.05, yb + 0.98, z], [xt, yt + 0.98, z], 0.03, 8, true);
    batch.cyl(mats.paintWhite, [xb, yb + 0.55, z], [xt, yt + 0.55, z], 0.013, 6);
    const g = stanchionGeo(0.95, 1);
    for (let k = 0; k <= 4; k++) {
      const x = xb + ((xt - xb) * k) / 4, y = yb + (rise * k) / 4;
      if (INST) INST.at(g, mats.paintWhite, x, y + 0.05, z); else batch.cyl(mats.paintWhite, [x, y + 0.1, z], [x, y + 0.98, z], 0.02, 5);
    }
    // newel knob at the foot
    batch.cyl(mats.brass, [xb - dir * 0.05, yb + 0.94, z], [xb - dir * 0.05, yb + 1.04, z], 0.04, 8, true);
    void len;
  }
  const xa = Math.min(xb, xt), xc = Math.max(xb, xt);
  world.addCollider(xa, yb, z0 - 0.06, xc, yt + 1.1, z0);
  world.addCollider(xa, yb, z1, xc, yt + 1.1, z1 + 0.06);
  // closed back under the top end (no walking under the stair)
  world.addCollider(Math.min(xt, xt - dir * 0.3), yb, z0, Math.max(xt, xt - dir * 0.3), yt - 0.3, z1);
  batch.box(mats.paintWhite, Math.min(xt, xt - dir * 0.04), yb, z0, Math.max(xt, xt - dir * 0.04), yt - 0.25, z1);
}

/** Railing across the ship at station x with gaps for stairs (gate posts + hanging chains at the gaps). */
function crossRail(world, batch, x, y, e, gaps, opts = {}) {
  const g = gaps.flatMap(([a, b]) => [[a, b], [-b, -a]]);
  for (const [a, b] of splitLine(-e, e, g)) railRun(world, batch, [[x, a], [x, b]], y, opts);
  for (const [a, b] of g) gapGate(batch, [x, a], [x, b], y);
}

export const boatHoleRects = () => BOAT_HOUSES.map((h) => ({ x0: h.x0 + 0.2, x1: h.x1 - 0.2, z0: -(h.hw - 0.2), z1: h.hw - 0.2 }));

export function buildDecks(world, batch, inst) {
  INST = inst || null;
  batch.cast = true; // decks and their undersides throw shadows on the decks below
  const sFc = stairById('wellFwd-forecastle'), sPoop = stairById('wellAft-poop'), sBaft = stairById('wellAft-bAft');
  const sA = stairById('bAft-A'), sBoat = stairById('A-boat');
  const hullIn = (x) => Math.max(0, plan(x) - 0.02);

  // ---------- planking + floors ----------
  deckRegion(world, batch, { y: B, x0: X.fc, x1: SHIP.bowX, edge: hullEdge });
  deckRegion(world, batch, { y: B, x0: SHIP.sternX, x1: X.poop, edge: hullEdge });
  deckRegion(world, batch, { y: C, x0: X.wellF, x1: X.fc, edge: hullEdge, fx0: X.wellF - 0.2, fx1: X.fc + 0.2 });
  deckRegion(world, batch, { y: C, x0: X.poop, x1: X.wellA, edge: hullEdge, fx0: X.poop - 0.2, fx1: X.wellA + 0.2 });
  deckRegion(world, batch, { y: B, x0: X.wellA, x1: X.bAft, edge: hullIn, fx1: X.bAft + 0.2 });

  const aHole = { x0: A_HOUSE.x0 + 0.2, x1: A_HOUSE.x1 - 0.2, z0: -(A_HOUSE.hw - 0.2), z1: A_HOUSE.hw - 0.2 };
  deckRegion(world, batch, { y: A, x0: X.aAft, x1: X.aFwd, edge: hullIn, holes: [aHole] });

  const notches = [1, -1].map((s) => ({ x0: sBoat.xb, x1: sBoat.xt, z0: Math.min(s * sBoat.zi, s * 13.78), z1: Math.max(s * sBoat.zi, s * 13.78) }));
  deckRegion(world, batch, { y: boat, x0: X.boatAft, x1: X.boatFwd, edge: bw, holes: [...boatHoleRects(), ...notches] });

  // ---------- undersides / slab edges ----------
  const under = boat - SLAB;
  const aOuter = { x0: A_HOUSE.x0, x1: A_HOUSE.x1, z0: -A_HOUSE.hw, z1: A_HOUSE.hw };
  deckRegion(world, batch, { y: under, x0: X.boatAft, x1: X.boatFwd, edge: bw, holes: [aOuter, ...notches], mat: mats.paintWhite, floor: false, down: true });
  deckRegion(world, batch, { y: A - SLAB, x0: X.aAft, x1: X.bAft, edge: plan, mat: mats.paintWhite, floor: false, down: true });
  batch.cast = false;
  // boat deck fascia (sides) and aft edge, with a moulded drip strip
  const fx = [...stations(sBoat.xt, 40, 6, 0.3, bw), ...stations(40, X.boatFwd, 2, 0.3, bw).slice(1)];
  for (const s of [1, -1]) for (let i = 0; i < fx.length - 1; i++) {
    const a = fx[i], b = fx[i + 1], p0 = [a, under, s * bw(a)], p1 = [b, under, s * bw(b)], p2 = [b, boat, s * bw(b)], p3 = [a, boat, s * bw(a)];
    if (s > 0) batch.quad(mats.paintWhite, p0, p1, p2, p3); else batch.quad(mats.paintWhite, p3, p2, p1, p0);
    batch.oquad(mats.paintWhite, [a, boat - 0.06, s * (bw(a) + 0.035)], [b, boat - 0.06, s * (bw(b) + 0.035)], [b, boat - 0.02, s * (bw(b) + 0.035)], [a, boat - 0.02, s * (bw(a) + 0.035)], [0, 0, s]);
    batch.oquad(mats.paintWhite, [a, boat - 0.06, s * bw(a)], [b, boat - 0.06, s * bw(b)], [b, boat - 0.06, s * (bw(b) + 0.035)], [a, boat - 0.06, s * (bw(a) + 0.035)], [0, -1, 0]);
  }
  batch.box(mats.paintWhite, X.boatAft - 0.02, under, -sBoat.zi, X.boatAft, boat, sBoat.zi, { skip: 'px py' });
  for (const s of [1, -1]) {
    const zi = s * sBoat.zi, ze = s * bw(sBoat.xt);
    batch.box(mats.paintWhite, sBoat.xb, under, Math.min(zi, zi - s * 0.02), sBoat.xt, boat, Math.max(zi, zi - s * 0.02), { skip: 'py' });
    batch.box(mats.paintWhite, sBoat.xt, under, Math.min(zi, ze), sBoat.xt + 0.02, boat, Math.max(zi, ze), { skip: 'py px' });
    // ledge that carries the railing outboard of the stair
    batch.box(mats.paintWhite, sBoat.xb, under, Math.min(s * 13.78, s * bw(-70)), sBoat.xt, boat, Math.max(s * 13.78, s * bw(-70)), { skip: 'py' });
  }
  // A deck overhang aft (x -76..-72): edge fascia
  const pa = plan(X.aAft);
  batch.box(mats.paintWhite, X.aAft - 0.02, A - SLAB, -pa, X.aAft, A, pa, { skip: 'px py' });
  for (const s of [1, -1]) batch.box(mats.paintWhite, X.aAft, A - SLAB, Math.min(s * pa, s * (pa + 0.02)), X.bAft, A, Math.max(s * pa, s * (pa + 0.02)), { skip: 'py' });

  // promenade ceiling beams (with flanges) + columns of the open (aft) promenade
  for (let x = X.boatAft + 2; x < X.boatFwd - 0.5; x += 2) {
    const e = bw(x) - 0.1;
    const inHouse = x > A_HOUSE.x0 && x < A_HOUSE.x1;
    const inNotch = x > sBoat.xb && x < sBoat.xt;
    const eo = inNotch ? sBoat.zi : e;
    const spans = inHouse ? [[A_HOUSE.hw, eo], [-eo, -A_HOUSE.hw]] : [[-eo, eo]];
    for (const [za, zb] of spans) {
      batch.box(mats.paintWhite, x - 0.012, under - 0.16, Math.min(za, zb), x + 0.012, under, Math.max(za, zb), { skip: 'py' });
      batch.box(mats.paintWhite, x - 0.05, under - 0.175, Math.min(za, zb), x + 0.05, under - 0.16, Math.max(za, zb));
    }
  }
  for (const s of [1, -1]) {
    // longitudinal edge girder
    const gx = [...stations(sBoat.xt, 40, 10, 0.3, bw), ...stations(40, X.boatFwd, 2, 0.3, bw).slice(1)];
    for (let i = 0; i < gx.length - 1; i++) batch.beam(mats.paintWhite, [gx[i], under - 0.1, s * (bw(gx[i]) - 0.08)], [gx[i + 1], under - 0.1, s * (bw(gx[i + 1]) - 0.08)], 0.1, 0.2, { skip: 'px nx py' });
    for (let x = X.boatAft + 0.1; x < X.screenAft - 1; x += 3.0) {
      if (x > sBoat.xb + 0.5 && x < sBoat.xt + 0.2) continue;
      const z = s * (bw(x) - 0.02);
      // cast column: base, fluted shaft, capital with brackets
      batch.cyl(mats.paintWhite, [x, A, z], [x, under, z], 0.06, 10);
      batch.cyl(mats.paintWhite, [x, A, z], [x, A + 0.12, z], 0.09, 10, false, 0.07);
      batch.box(mats.paintWhite, x - 0.1, A, z - 0.1, x + 0.1, A + 0.06, z + 0.1, { skip: 'ny' });
      batch.cyl(mats.paintWhite, [x, under - 0.3, z], [x, under - 0.2, z], 0.065, 10, false, 0.095);
      batch.box(mats.paintWhite, x - 0.1, under - 0.2, z - 0.1, x + 0.1, under, z + 0.1, { skip: 'py' });
      batch.beam(mats.paintWhite, [x, under - 0.55, z], [x, under - 0.12, z - s * 0.45], 0.03, 0.05);
    }
  }

  // promenade ceiling lamps (brass rose + glass globe + cage)
  for (let x = A_HOUSE.x0 + 5; x < A_HOUSE.x1; x += 10) for (const s of [1, -1]) {
    const z = s * (A_HOUSE.hw + 1.7);
    batch.cyl(mats.brass, [x, under, z], [x, under - 0.04, z], 0.15, 12, true, 0.13);
    batch.cyl(mats.brass, [x, under - 0.04, z], [x, under - 0.09, z], 0.03, 6);
    batch.cyl(mats.lampGlow, [x, under - 0.09, z], [x, under - 0.25, z], 0.1, 10, true, 0.07);
    for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + 0.785; batch.cyl(mats.brass, [x + Math.cos(a) * 0.105, under - 0.09, z + Math.sin(a) * 0.105], [x + Math.cos(a) * 0.075, under - 0.26, z + Math.sin(a) * 0.075], 0.006, 3); }
    world.addLamp({ x, y: under - 0.2, z });
  }

  // ---------- bulwarks ----------
  batch.cast = true;
  bulwark(world, batch, X.fc, SHIP.bowX, B);
  bulwark(world, batch, X.wellF, X.fc, C);
  bulwark(world, batch, X.poop, X.wellA, C);
  bulwark(world, batch, SHIP.sternX, X.poop, B);
  batch.cast = false;
  // waterways along the open decks with railings
  waterway(batch, X.wellA, X.bAft, B, hullIn, { margin: true });
  waterway(batch, X.aAft, X.screenAft, A, (x) => bw(x) + 0.15, { scuppers: true });
  waterway(batch, sBoat.xt + 0.05, X.boatFwd - 0.1, boat, (x) => bw(x) - 0.03, { scuppers: false });

  // ---------- railings ----------
  crossRail(world, batch, X.fc, B, hullEdge(X.fc), [[sFc.zi, sFc.zo]]);
  crossRail(world, batch, X.poop, B, hullEdge(X.poop), [[sPoop.zi, sPoop.zo]], { dodger: true });
  crossRail(world, batch, X.wellA, B, hullEdge(X.wellA), [[sBaft.zi, sBaft.zo]]);
  crossRail(world, batch, X.aAft, A, bw(X.aAft), [[sA.zi, sA.zo]]);
  railRun(world, batch, [[X.boatAft, -sBoat.zi], [X.boatAft, sBoat.zi]], boat, { dodger: true });
  for (const s of [1, -1]) {
    // open aft B deck sides
    railRun(world, batch, stations(X.wellA, X.bAft, 2).map((x) => [x, s * hullEdge(x)]), B);
    // A deck sides, open part of the promenade
    railRun(world, batch, [...stations(X.aAft, -70, 2), X.screenAft].map((x) => [x, s * bw(x)]), A);
    // boat deck sides
    const bx = [...stations(X.boatAft, -70, 2), ...stations(40, X.boatFwd, 2)];
    railRun(world, batch, bx.map((x) => [x, s * (bw(x) - 0.06)]), boat);
    // rail on the inboard side of the stair well in the boat deck (collider comes from the stair)
    railRun(world, batch, [[sBoat.xb, s * (sBoat.zi - 0.03)], [sBoat.xt, s * (sBoat.zi - 0.03)]], boat, { collide: false });
  }

  // ---------- stairs ----------
  for (const st of EXT_STAIRS) for (const s of [1, -1]) stair(world, batch, st, s);

  // ---------- awning stanchions on the bulwarks with side spars and furled awnings ----------
  const awning = (xa, xb, y) => {
    for (const s of [1, -1]) {
      const xs = [];
      for (let x = xa; x <= xb + 1e-6; x += (xb - xa) / Math.max(1, Math.round((xb - xa) / 3.2))) xs.push(x);
      const top = y + BULWARK_H + 1.45;
      const zAt = (x) => s * (hullEdge(x) + 0.03);
      for (const x of xs) {
        batch.cyl(mats.paintWhite, [x, y + BULWARK_H - 0.3, zAt(x) - s * 0.05], [x, top, zAt(x)], 0.03, 6, true);
        batch.box(mats.iron, x - 0.05, y + BULWARK_H - 0.32, Math.min(zAt(x), zAt(x) - s * 0.1), x + 0.05, y + BULWARK_H - 0.22, Math.max(zAt(x), zAt(x) - s * 0.1));
        batch.cyl(mats.brass, [x, top, zAt(x)], [x, top + 0.05, zAt(x)], 0.035, 6, true);
      }
      for (let i = 0; i < xs.length - 1; i++) {
        const a = xs[i], b = xs[i + 1];
        batch.cyl(mats.woodDark, [a, top - 0.04, zAt(a)], [b, top - 0.04, zAt(b)], 0.025, 6);
        batch.cyl(mats.canvas, [a, top - 0.15, zAt(a) - s * 0.04], [b, top - 0.15, zAt(b) - s * 0.04], 0.09, 8);
        for (const f of [0.25, 0.5, 0.75]) { const x = a + (b - a) * f, z = zAt(a) + (zAt(b) - zAt(a)) * f; batch.cyl(mats.rope, [x, top - 0.02, z], [x, top - 0.26, z - s * 0.04], 0.012, 4); }
      }
    }
  };
  awning(SHIP.sternX + 4.5, X.poop - 1.5, B);
  awning(X.poop + 1.5, X.wellA - 1.5, C);
  awning(X.wellF + 1.5, X.fc - 1.5, C);

  // ---------- deck sockets (awning stanchions) along the open decks ----------
  if (INST) {
    const sock = unitCyl(10);
    const put = (x, y, z) => INST.at(sock, mats.brass, x, y - 0.002, z, null, [0.045, 0.008, 0.045]);
    for (const s of [1, -1]) {
      for (let x = X.poop - 2; x > SHIP.sternX + 5; x -= 3.2) put(x, B, s * (hullEdge(x) - 0.75));
      for (let x = X.wellA - 1.5; x > X.bAft + 0.5; x -= 3.2) put(x, B, s * (hullEdge(x) - 0.75));
      for (let x = X.wellF + 1.5; x < X.fc - 0.5; x += 3.2) put(x, C, s * (hullEdge(x) - 0.75));
      for (let x = X.poop + 1.5; x < X.wellA - 0.5; x += 3.2) put(x, C, s * (hullEdge(x) - 0.75));
    }
  }
}

export { T_WALL, merge, cylG };
