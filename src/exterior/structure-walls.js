import * as THREE from 'three';
import { DECK_Y, SLAB, A_HOUSE, B_HOUSE, BOAT_HOUSES, BOAT_LOW_ROOFS, EXT_DOORS, deckPlanHalfWidth as plan } from '../core/constants.js';
import { mats } from '../core/materials.js';
import { T_WALL, bw, X, stations, segCollider } from './structure-layout.js';
import { deckRegion } from './structure-decks.js';
import { rivetGeo, merge, boxG, cylG, sphG } from './inst.js';

const { A, B, C, boat, roof } = DECK_Y;

// ---------------- shared small fittings (instanced) ----------------
let LAMP = null;
/** Caged bulkhead lamp: local y up, local z = out of the wall. */
export function lampGeos() {
  if (LAMP) return LAMP;
  const brass = [boxG(0.16, 0.2, 0.03, 0, 0, 0.015), cylG([0, 0, 0.03], [0, 0, 0.12], 0.06, 10), cylG([0, 0.1, 0.12], [0, 0.14, 0.12], 0.075, 10, 0.05)];
  for (let k = 0; k < 4; k++) { // cage wires
    const a = (k / 4) * Math.PI * 2 + 0.4, x = Math.cos(a) * 0.082, z = 0.12 + Math.sin(a) * 0.082;
    brass.push(cylG([x, -0.08, z], [x, 0.1, z], 0.007, 4));
  }
  brass.push(cylG([0, -0.1, 0.12], [0, -0.075, 0.12], 0.05, 8));
  LAMP = { brass: merge(brass), glow: sphG(0.068, 0, 0.0, 0.12, 10, 8, 1.25) };
  return LAMP;
}

/**
 * Straight wall slab with real openings.
 * o.a, o.b: [x,z] end points of the OUTER face line; o.inward: [x,z] rough direction of the inside.
 * o.openings: [{u0,u1,v0,v1,kind}] in metres along a->b / above y0; kind 'door' | 'window' | 'open'.
 * Windows: optional `transom`, `arch` (corner radius), `panes` (vertical divisions).
 * Door openings get no collider; a door leaf is drawn standing open, flat against the outside.
 * o.inst: instancing collector for rivets / lamps; o.detail: plating straps, base angle, door boards.
 * Returns {P, L, H, piers, n} for decorators (P(u, v, w): wall-local -> world, w < 0 is outside).
 */
export function wallRun(world, batch, o) {
  let { a, b } = o;
  const { inward, y0, y1, t = T_WALL, matOut = mats.hullWhite, matIn = mats.paintWhite, collide = true, frameMat = mats.woodDark, doorMat = mats.mahogany, inst = null, detail = true } = o;
  const sillMat = o.sillMat || (frameMat === mats.woodDark ? mats.woodDark : matOut);
  let openings = o.openings || [];
  let dx = b[0] - a[0], dz = b[1] - a[1];
  const L = Math.hypot(dx, dz);
  if (L < 1e-4) return null;
  let ux = dx / L, uz = dz / L, wx = -uz, wz = ux;
  if (wx * inward[0] + wz * inward[1] < 0) {
    a = o.b; b = o.a; ux = -ux; uz = -uz; wx = -wx; wz = -wz;
    openings = openings.map((p) => ({ ...p, u0: L - p.u1, u1: L - p.u0 }));
  }
  openings = openings.filter((p) => p.u1 > 0.01 && p.u0 < L - 0.01).sort((p, q) => p.u0 - q.u0);
  const H = y1 - y0;
  const P = (u, v, w) => [a[0] + ux * u + wx * w, y0 + v, a[1] + uz * u + wz * w];
  const piece = (u0, u1, v0, v1, skip, w0 = 0, w1 = t, mat = matIn, mOut = matOut) => {
    if (u1 - u0 < 1e-4 || v1 - v0 < 1e-4) return;
    batch.obox(mat, P(u0, v0, w0), [ux * (u1 - u0), 0, uz * (u1 - u0)], [0, v1 - v0, 0], [wx * (w1 - w0), 0, wz * (w1 - w0)], { skip, m: { nz: mOut } });
  };
  const fpiece = (u0, u1, v0, v1, w0, w1, mat, skip = '') => piece(u0, u1, v0, v1, skip, w0, w1, mat, mat);
  const outN = [-wx, 0, -wz];
  let cur = 0;
  const solids = [];
  let solidStart = 0;
  for (const op of openings) {
    const u0 = Math.max(0, op.u0), u1 = Math.min(L, op.u1), v0 = Math.max(0, op.v0), v1 = Math.min(H, op.v1);
    piece(cur, u0, 0, H, '');
    piece(u0, u1, 0, v0, 'px nx');
    piece(u0, u1, v1, H, 'px nx');
    cur = u1;
    const cast = batch.cast;
    batch.cast = false; // frames, leaves and fittings only receive shadows
    if (op.kind === 'window') {
      windowDetail(batch, P, fpiece, piece, { u0, u1, v0, v1, t, op, frameMat, sillMat, matOut, matIn, outN, H });
    } else if (op.kind === 'door') {
      solids.push([solidStart, u0]); solidStart = u1;
      doorDetail(batch, inst, P, fpiece, { u0, u1, v1, t, L, H, op, frameMat, doorMat, matOut, outN, ux, uz, wx, wz, detail, openings });
    }
    batch.cast = cast;
  }
  piece(cur, L, 0, H, '');
  solids.push([solidStart, L]);
  if (collide) {
    for (const [s0, s1] of solids) {
      if (s1 - s0 < 1e-3) continue;
      const p0 = P(s0, 0, 0), p1 = P(s1, 0, 0);
      const axis = Math.abs(ux) < 1e-6 || Math.abs(uz) < 1e-6;
      if (axis) {
        const q = P(s1, 0, t);
        world.addCollider(Math.min(p0[0], q[0]), y0, Math.min(p0[2], q[2]), Math.max(p0[0], q[0]), y1, Math.max(p0[2], q[2]));
        void p1;
      } else {
        // oblique: centre line of the slab, padded by half the thickness
        const c0 = P(s0, 0, t / 2), c1 = P(s1, 0, t / 2);
        segCollider(world, [c0[0], c0[2]], [c1[0], c1[2]], y0, y1, t / 2, 0.7);
      }
    }
  }
  // piers: solid intervals between all openings (for straps and decorators)
  const piers = [];
  { let c = 0; for (const op of openings) { if (op.u0 - c > 0.05) piers.push([c, Math.max(c, op.u0)]); c = Math.max(c, op.u1); } if (L - c > 0.05) piers.push([c, L]); }
  if (detail) { const cast = batch.cast; batch.cast = false; plating(batch, inst, P, fpiece, { L, H, openings, piers, matOut, outN }); batch.cast = cast; }
  return { P, L, H, piers, openings, outN, fpiece };
}

/** Window: architrave, recessed sash with glazing bars, projecting sill, drip moulding; optional arched head. */
function windowDetail(batch, P, fpiece, piece, { u0, u1, v0, v1, t, op, frameMat, sillMat, matOut, matIn, outN, H }) {
  const wm = t * 0.55, r = Math.min(op.arch || 0, (u1 - u0) / 2 - 0.05, (v1 - v0) / 2);
  // glass (behind the sash)
  if (r > 0) {
    const seg = 5, pts = [];
    pts.push([u0, v0], [u1, v0], [u1, v1 - r]);
    for (let i = 1; i <= seg; i++) { const a = (i / seg) * Math.PI / 2; pts.push([u1 - r + Math.cos(a) * r, v1 - r + Math.sin(a) * r]); }
    for (let i = 1; i <= seg; i++) { const a = Math.PI / 2 + (i / seg) * Math.PI / 2; pts.push([u0 + r + Math.cos(a) * r, v1 - r + Math.sin(a) * r]); }
    const c = [(u0 + u1) / 2, (v0 + v1) / 2];
    for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; batch.otri(mats.glass, P(c[0], c[1], wm), P(p[0], p[1], wm), P(q[0], q[1], wm), outN); }
    // corner fillers (wall material) + soffit, and the arched architrave
    for (const [cu, sgn] of [[u0 + r, -1], [u1 - r, 1]]) {
      const cv = v1 - r, corner = [cu + sgn * r, v1];
      for (let i = 0; i < seg; i++) {
        const a0 = Math.PI / 2 - sgn * 0 + (sgn > 0 ? -1 : 1) * 0, A0 = sgn > 0 ? (i / seg) * Math.PI / 2 : Math.PI - (i / seg) * Math.PI / 2;
        const A1 = sgn > 0 ? ((i + 1) / seg) * Math.PI / 2 : Math.PI - ((i + 1) / seg) * Math.PI / 2;
        void a0;
        const p = [cu + Math.cos(A0) * r, cv + Math.sin(A0) * r], q = [cu + Math.cos(A1) * r, cv + Math.sin(A1) * r];
        batch.otri(matOut, P(corner[0], corner[1], 0), P(p[0], p[1], 0), P(q[0], q[1], 0), outN);
        batch.otri(matIn, P(corner[0], corner[1], t), P(p[0], p[1], t), P(q[0], q[1], t), [-outN[0], 0, -outN[2]]);
        const mid = [(p[0] + q[0]) / 2 - cu, (p[1] + q[1]) / 2 - cv];
        const toC = P(cu - mid[0], cv - mid[1], 0), at = P(cu + mid[0], cv + mid[1], 0);
        batch.oquad(matIn, P(p[0], p[1], 0), P(q[0], q[1], 0), P(q[0], q[1], t), P(p[0], p[1], t), [toC[0] - at[0], toC[1] - at[1], toC[2] - at[2]]);
        // architrave + sash along the arc
        const fa = 0.065;
        const pa = [cu + Math.cos(A0) * (r + fa / 2), cv + Math.sin(A0) * (r + fa / 2)], qa = [cu + Math.cos(A1) * (r + fa / 2), cv + Math.sin(A1) * (r + fa / 2)];
        batch.beam(frameMat, P(pa[0], pa[1], -0.015), P(qa[0], qa[1], -0.015), 0.04, fa);
        const ps = [cu + Math.cos(A0) * (r - 0.025), cv + Math.sin(A0) * (r - 0.025)], qs = [cu + Math.cos(A1) * (r - 0.025), cv + Math.sin(A1) * (r - 0.025)];
        batch.beam(frameMat, P(ps[0], ps[1], wm), P(qs[0], qs[1], wm), 0.06, 0.05);
      }
    }
  } else {
    batch.oquad(mats.glass, P(u0, v0, wm), P(u1, v0, wm), P(u1, v1, wm), P(u0, v1, wm), outN);
  }
  const fa = 0.065, fs = 0.05;
  // architrave (proud of the wall)
  fpiece(u0 + r - (r ? 0 : fa), u1 - r + (r ? 0 : fa), v1, v1 + fa, -0.035, 0.005, frameMat);
  fpiece(u0 - fa, u0, v0 - 0.01, v1 - r, -0.035, 0.005, frameMat);
  fpiece(u1, u1 + fa, v0 - 0.01, v1 - r, -0.035, 0.005, frameMat);
  // sash inside the opening
  fpiece(u0 + r, u1 - r, v1 - fs, v1, wm - 0.03, wm + 0.03, frameMat);
  fpiece(u0, u1, v0, v0 + fs, wm - 0.03, wm + 0.03, frameMat);
  fpiece(u0, u0 + fs, v0 + fs, v1 - Math.max(r, fs), wm - 0.03, wm + 0.03, frameMat);
  fpiece(u1 - fs, u1, v0 + fs, v1 - Math.max(r, fs), wm - 0.03, wm + 0.03, frameMat);
  // glazing bars
  const panes = op.panes || (u1 - u0 > 1.0 ? 2 : 1);
  for (let k = 1; k < panes; k++) { const m = u0 + ((u1 - u0) * k) / panes; fpiece(m - 0.022, m + 0.022, v0 + fs, v1 - (r ? 0.02 : fs), wm - 0.025, wm + 0.025, frameMat); }
  if (op.transom) { const tv = v0 + (v1 - v0) * 0.68; fpiece(u0 + fs, u1 - fs, tv - 0.022, tv + 0.022, wm - 0.025, wm + 0.025, frameMat); }
  if (op.bars) for (let k = 1; k < op.bars; k++) { const tv = v0 + ((v1 - v0) * k) / op.bars; fpiece(u0 + fs, u1 - fs, tv - 0.012, tv + 0.012, wm - 0.02, wm + 0.02, frameMat); }
  // sill (projecting, with a lip) and drip moulding
  fpiece(u0 - 0.1, u1 + 0.1, v0 - 0.055, v0, -0.075, wm - 0.03, sillMat);
  fpiece(u0 - 0.1, u1 + 0.1, v0 - 0.075, v0 - 0.055, -0.075, -0.05, sillMat);
  if (v1 + fa + 0.06 < H) {
    fpiece(u0 - fa - 0.04, u1 + fa + 0.04, v1 + fa, v1 + fa + 0.035, -0.07, 0.005, matOut === mats.hullWhite ? mats.paintWhite : matOut);
    fpiece(u0 - fa - 0.04, u1 + fa + 0.04, v1 + fa - 0.02, v1 + fa, -0.07, -0.05, matOut === mats.hullWhite ? mats.paintWhite : matOut);
  }
  void piece;
}

/** Door: frame, threshold, open leaf with panels / kick plate / hinges / handle, name board, lamp, bell push. */
function doorDetail(batch, inst, P, fpiece, { u0, u1, v1, t, L, H, op, frameMat, doorMat, matOut, outN, detail, openings }) {
  const steel = doorMat === mats.paintWhite;
  const w = u1 - u0, lw = w - 0.06;
  let l0 = u1 + 0.03;
  if (l0 + lw > L - 0.05) l0 = u0 - 0.03 - lw;
  const right = l0 > u0;
  if (!op.noLeaf) {
    // leaf standing open against the outside of the wall (outer face at w = -0.075)
    fpiece(l0, l0 + lw, 0.03, v1 - 0.02, -0.075, -0.02, doorMat);
    const pm = steel ? mats.paintWhite : doorMat, fr = steel ? mats.paintWhite : frameMat;
    if (steel) {
      // pressed stiffeners + dogs
      for (const v of [0.45, 1.05, 1.65]) fpiece(l0 + 0.08, l0 + lw - 0.08, v - 0.03, v + 0.03, -0.095, -0.075, pm);
      for (const v of [0.5, 1.6]) fpiece(right ? l0 + lw - 0.1 : l0 + 0.04, right ? l0 + lw - 0.04 : l0 + 0.1, v - 0.04, v + 0.04, -0.11, -0.075, mats.iron);
    } else {
      // raised lower panels, lock rail, upper glazed panel with bars
      fpiece(l0 + 0.1, l0 + lw / 2 - 0.04, 0.32, 0.98, -0.088, -0.075, pm);
      fpiece(l0 + lw / 2 + 0.04, l0 + lw - 0.1, 0.32, 0.98, -0.088, -0.075, pm);
      fpiece(l0 + 0.06, l0 + lw - 0.06, 1.06, 1.1, -0.09, -0.075, fr);
      fpiece(l0 + 0.12, l0 + lw - 0.12, 1.2, v1 - 0.2, -0.078, -0.075, mats.windowLit);
      fpiece(l0 + lw / 2 - 0.015, l0 + lw / 2 + 0.015, 1.2, v1 - 0.2, -0.09, -0.075, fr);
      for (const v of [1.2 + (v1 - 1.4) / 3, 1.2 + (2 * (v1 - 1.4)) / 3]) fpiece(l0 + 0.12, l0 + lw - 0.12, v - 0.012, v + 0.012, -0.088, -0.075, fr);
      fpiece(l0 + 0.1, l0 + lw - 0.1, 1.17, 1.2, -0.09, -0.075, fr);
      fpiece(l0 + 0.1, l0 + lw - 0.1, v1 - 0.2, v1 - 0.17, -0.09, -0.075, fr);
      // brass kick plate
      fpiece(l0 + 0.02, l0 + lw - 0.02, 0.04, 0.24, -0.08, -0.075, mats.brass);
    }
    // handle (on the free edge) + hinges (on the edge at the opening)
    const hk = right ? l0 + lw - 0.12 : l0 + 0.06;
    fpiece(hk, hk + 0.06, 0.95, 1.1, -0.085, -0.075, mats.brass);
    fpiece(hk + 0.015, hk + 0.045, 1.0, 1.04, -0.13, -0.085, mats.brass);
    const he = right ? l0 - 0.005 : l0 + lw - 0.025;
    for (const v of [0.25, 1.05, 1.85]) fpiece(he, he + 0.03, v - 0.08, v + 0.08, -0.1, -0.02, mats.brass);
  }
  // frame around the opening (through the wall) + architrave outside
  const f = 0.05;
  fpiece(u0, u0 + f, 0, v1, -0.02, t + 0.02, frameMat);
  fpiece(u1 - f, u1, 0, v1, -0.02, t + 0.02, frameMat);
  fpiece(u0 + f, u1 - f, v1 - f, v1, -0.02, t + 0.02, frameMat, 'px nx');
  fpiece(u0 - 0.06, u0, 0, v1 + 0.06, -0.04, 0.0, frameMat);
  fpiece(u1, u1 + 0.06, 0, v1 + 0.06, -0.04, 0.0, frameMat);
  fpiece(u0, u1, v1, v1 + 0.06, -0.04, 0.0, frameMat);
  // threshold / coaming with brass nosing (low enough to step over)
  fpiece(u0, u1, 0, 0.05, -0.07, t + 0.05, steel ? mats.steelDark : mats.woodDark);
  fpiece(u0, u1, 0.05, 0.062, -0.075, -0.035, mats.brass);
  if (!detail) return;
  // name board above the door (teak with a gilt bead)
  if (H - v1 > 0.42) {
    const b0 = v1 + 0.12, b1 = Math.min(H - 0.06, v1 + 0.34);
    fpiece(u0 - 0.02, u1 + 0.02, b0, b1, -0.035, 0, mats.woodDark);
    fpiece(u0 + 0.02, u1 - 0.02, b0 + 0.03, b0 + 0.045, -0.042, -0.035, mats.gold);
    fpiece(u0 + 0.02, u1 - 0.02, b1 - 0.045, b1 - 0.03, -0.042, -0.035, mats.gold);
    fpiece(u0 + 0.15, u1 - 0.15, (b0 + b1) / 2 - 0.02, (b0 + b1) / 2 + 0.02, -0.04, -0.035, mats.gold);
  }
  // lamp + bell push on the side away from the leaf
  if (inst) {
    const lu = right ? u0 - 0.42 : u1 + 0.42;
    const free = (a, b) => a > 0.05 && b < L - 0.05 && !openings.some((p) => b > p.u0 - 0.05 && a < p.u1 + 0.05);
    if (H > 2.35 && free(lu - 0.1, lu + 0.1)) {
      const G = lampGeos(), p = P(lu, Math.min(H - 0.25, 2.12), 0), up = [0, 1, 0], X = [outN[2], 0, -outN[0]];
      inst.basis(G.brass, mats.brass, p, X, up, outN);
      inst.basis(G.glow, mats.lampGlow, p, X, up, outN);
    }
    if (free(lu - 0.06, lu + 0.06)) fpiece(lu - 0.05, lu + 0.05, 1.3, 1.44, -0.03, 0, mats.brass);
  }
}

/** Plating straps with rivets on the outer face, base angle along the deck. */
function plating(batch, inst, P, fpiece, { L, H, openings, piers, matOut, outN }) {
  const doors = openings.filter((p) => p.kind === 'door' || p.kind === 'open');
  // base angle (skips door openings)
  let c = 0;
  for (const d of [...doors, { u0: L, u1: L }]) { if (d.u0 - c > 0.05) fpiece(c, d.u0, 0, 0.09, -0.018, 0, matOut, 'px nx'); c = Math.max(c, d.u1); }
  if (!inst || H < 1.0) return;
  const R = rivetGeo(0.01), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(outN[0], outN[1], outN[2]));
  const strap = (uc, va, vb) => {
    fpiece(uc - 0.045, uc + 0.045, va, vb, -0.006, 0, matOut);
    for (const du of [-0.025, 0.025]) for (let v = va + 0.06; v < vb - 0.04; v += 0.15) { const p = P(uc + du, v + (du > 0 ? 0.075 : 0), -0.006); inst.at(R, matOut, p[0], p[1], p[2], q); }
  };
  for (const [p0, p1] of piers) {
    const len = p1 - p0;
    if (len < 0.35) continue;
    // straps at pier centres; on long blank stretches every ~1.9 m
    const n = Math.max(1, Math.round(len / 1.9));
    for (let k = 0; k < n; k++) {
      const uc = p0 + (len * (k + 0.5)) / n;
      if (uc < 0.15 || uc > L - 0.15) continue;
      strap(uc, 0.1, H - 0.04);
    }
  }
}

/** Evenly spaced windows along a wall of length L, leaving the doors (and their leaves) free. */
export function windowsAlong(L, { pitch, w, sill, h, margin = 0.6, doors = [], kind = 'window', transom = false, u0 = 0, clear = 1.4, arch = 0, panes = 0, bars = 0 }) {
  const out = doors.map((d) => ({ ...d, kind: 'door' }));
  const n = Math.max(0, Math.floor((L - 2 * margin + (pitch - w)) / pitch));
  const start = (L - (n * pitch - (pitch - w))) / 2;
  for (let i = 0; i < n; i++) {
    const a = u0 + start + i * pitch, b = a + w;
    if (doors.some((d) => b > d.u0 - clear && a < d.u1 + clear)) continue;
    out.push({ u0: a, u1: b, v0: sill, v1: sill + h, kind, transom, arch, panes, bars });
  }
  return out;
}

/** EXT_DOORS lying in a wall: axis 'x' wall at z = c (u measured from x = origin) or axis 'z' wall at x = c (u from z = origin). */
function doorsIn(deck, axis, c, origin, lo = -1e9, hi = 1e9) {
  return EXT_DOORS
    .filter((d) => d.deck === deck && d.axis === axis && Math.abs((axis === 'x' ? d.z : d.x) - c) < 0.02)
    .map((d) => ({ pos: axis === 'x' ? d.x : d.z, d }))
    .filter(({ pos }) => pos > lo && pos < hi)
    .map(({ pos, d }) => ({ u0: pos - d.w / 2 - origin, u1: pos + d.w / 2 - origin, v0: 0, v1: d.h, pos, kind: 'door' }));
}

/** Rectangular deckhouse: four walls with windows + EXT_DOORS. Returns the wall infos. */
function house(world, batch, inst, { deck, x0, x1, hw, y0, y1, side, end, sideExtra = null, frontWin = null, matOut = mats.paintWhite }) {
  const walls = [];
  for (const s of [1, -1]) {
    const z = s * hw;
    const doors = doorsIn(deck, 'x', z, x0, x0, x1);
    if (sideExtra) for (const d of doors) if (d.pos > x0 + sideExtra.len) d.noLeaf = true;
    let ops = windowsAlong(sideExtra ? sideExtra.len : x1 - x0, { ...side, doors });
    if (sideExtra) ops = ops.concat(sideExtra.ops);
    walls.push({ side: s, info: wallRun(world, batch, { a: [x0, z], b: [x1, z], inward: [0, -s], y0, y1, openings: ops, matOut, inst }) });
  }
  const zi = hw - T_WALL;
  for (const [x, inx, spec] of [[x0, 1, end], [x1, -1, frontWin || end]]) {
    const doors = doorsIn(deck, 'z', x, -zi, -zi, zi);
    walls.push({ end: inx, info: wallRun(world, batch, { a: [x, -zi], b: [x, zi], inward: [inx, 0], y0, y1, openings: windowsAlong(2 * zi, { ...spec, doors }), matOut, inst }) });
  }
  return walls;
}

/** Flat roof slab with optional rectangular holes (for skylights / domes), fascia, gutters. */
function roofSlab(world, batch, x0, x1, hw, y, holes = []) {
  const o = 0.25, e = () => hw + o;
  batch.cast = true;
  deckRegion(world, batch, { y, x0: x0 - o, x1: x1 + o, edge: e, holes, mat: mats.canvas, floor: false });
  deckRegion(world, batch, { y: y - SLAB + 0.03, x0: x0 - o, x1: x1 + o, edge: e, holes, mat: mats.paintWhite, floor: false, down: true });
  batch.cast = false;
  // fascia with a moulded edge
  const f = 0.04, yb = y - SLAB, yt = y + 0.04;
  batch.box(mats.paintWhite, x0 - o - f, yb, -hw - o - f, x1 + o + f, yt, -hw - o, { skip: 'pz' });
  batch.box(mats.paintWhite, x0 - o - f, yb, hw + o, x1 + o + f, yt, hw + o + f, { skip: 'nz' });
  batch.box(mats.paintWhite, x0 - o - f, yb, -hw - o, x0 - o, yt, hw + o, { skip: 'px' });
  batch.box(mats.paintWhite, x1 + o, yb, -hw - o, x1 + o + f, yt, hw + o, { skip: 'nx' });
  // rain gutters along the sides + waterway strip on the roof edge
  for (const s of [1, -1]) {
    batch.cyl(mats.paintWhite, [x0 - o, yb + 0.03, s * (hw + o + 0.08)], [x1 + o, yb + 0.03, s * (hw + o + 0.08)], 0.05, 8);
    batch.box(mats.paintWhite, x0 - o, y, Math.min(s * (hw + o - 0.12), s * (hw + o)), x1 + o, y + 0.035, Math.max(s * (hw + o - 0.12), s * (hw + o)), { skip: 'ny' });
    // downpipes at the corners
    for (const x of [x0 + 0.35, x1 - 0.35]) {
      const z = s * (hw + 0.07);
      batch.cyl(mats.paintWhite, [x, boat + 0.08, z], [x, yb + 0.03, z], 0.035, 8, true);
      batch.cyl(mats.paintWhite, [x, yb + 0.03, z], [x, yb + 0.03, s * (hw + o + 0.08)], 0.035, 6);
      batch.cyl(mats.paintWhite, [x, boat + 0.08, z], [x + (x < (x0 + x1) / 2 ? -0.18 : 0.18), boat + 0.02, z], 0.04, 6, true);
      for (const v of [0.6, 1.5, 2.3]) batch.box(mats.steelDark, x - 0.05, boat + v, Math.min(z, s * hw), x + 0.05, boat + v + 0.03, Math.max(z, s * hw));
    }
  }
  batch.cast = true;
  for (const h of holes) {
    // coaming around the opening
    const c = 0.08, ct = y + 0.35, cb = y - SLAB + 0.03;
    batch.box(mats.paintWhite, h.x0 - c, cb, h.z0 - c, h.x1 + c, ct, h.z0);
    batch.box(mats.paintWhite, h.x0 - c, cb, h.z1, h.x1 + c, ct, h.z1 + c);
    batch.box(mats.paintWhite, h.x0 - c, cb, h.z0, h.x0, ct, h.z1);
    batch.box(mats.paintWhite, h.x1, cb, h.z0, h.x1 + c, ct, h.z1);
    batch.box(mats.woodDark, h.x0 - c - 0.02, ct, h.z0 - c - 0.02, h.x1 + c + 0.02, ct + 0.05, h.z1 + c + 0.02, { skip: 'ny' });
  }
  batch.cast = false;
}

/** Glass dome (ellipsoidal cap) with an iron frame: main ribs, purlins, curb ring, lantern + finial. */
function dome(batch, cx, cz, rx, rz, h, y) {
  const seg = 32, rings = 7;
  const P = (i, k, g = 1) => {
    const t = (i / seg) * Math.PI * 2, e = (k / rings) * Math.PI / 2;
    return [cx + Math.cos(t) * Math.cos(e) * rx * g, y + Math.sin(e) * h * g, cz + Math.sin(t) * Math.cos(e) * rz * g];
  };
  for (let i = 0; i < seg; i++) for (let k = 0; k < rings; k++) {
    const a = P(i, k), b = P(i + 1, k), c = P(i + 1, k + 1), d = P(i, k + 1);
    if (k === rings - 1) batch.tri(mats.glass, a, d, b); else batch.quad(mats.glass, a, d, c, b);
    const main = i % 4 === 0;
    batch.cyl(mats.iron, P(i, k, 1.005), P(i, k + 1, 1.005), main ? 0.03 : 0.016, main ? 6 : 4);
    if (k > 0) batch.cyl(mats.iron, P(i, k, 1.005), P(i + 1, k, 1.005), k % 2 ? 0.014 : 0.02, 4);
  }
  // curb ring + ornamental cresting
  for (let i = 0; i < seg; i++) {
    batch.cyl(mats.iron, P(i, 0, 1.01), P(i + 1, 0, 1.01), 0.05, 6);
    const p = P(i + 0.5, 0, 1.03);
    batch.cyl(mats.iron, p, [p[0], p[1] + 0.12, p[2]], 0.012, 4);
  }
  // lantern + finial
  const top = y + h;
  batch.cyl(mats.iron, [cx, top - 0.05, cz], [cx, top + 0.18, cz], 0.32, 12, true, 0.26);
  for (let k = 0; k < 8; k++) { const t = (k / 8) * Math.PI * 2; batch.cyl(mats.iron, [cx + Math.cos(t) * 0.27, top + 0.18, cz + Math.sin(t) * 0.27], [cx + Math.cos(t) * 0.2, top + 0.42, cz + Math.sin(t) * 0.2], 0.015, 4); }
  batch.cyl(mats.glass, [cx, top + 0.18, cz], [cx, top + 0.42, cz], 0.26, 8, false, 0.2);
  batch.cyl(mats.iron, [cx, top + 0.42, cz], [cx, top + 0.5, cz], 0.24, 10, true, 0.04);
  batch.cyl(mats.brass, [cx, top + 0.48, cz], [cx, top + 0.82, cz], 0.045, 6, true, 0.012);
  batch.cyl(mats.brass, [cx, top + 0.6, cz], [cx, top + 0.66, cz], 0.07, 8, true);
}

/** Small raised ridge skylight with glazing bars and guard rods. */
function skylight(batch, x0, x1, z0, z1, y) {
  const zm = (z0 + z1) / 2, cy = y + 0.38, ry = y + 0.62;
  batch.box(mats.paintWhite, x0, y, z0, x1, cy, z1, { skip: 'ny py' });
  batch.box(mats.woodDark, x0 - 0.03, cy, z0 - 0.03, x1 + 0.03, cy + 0.04, z1 + 0.03, { skip: 'ny' });
  for (const [ze, s] of [[z0, -1], [z1, 1]]) {
    const a = [x0 + 0.02, cy + 0.04, ze], b = [x1 - 0.02, cy + 0.04, ze], c = [x1 - 0.02, ry, zm], d = [x0 + 0.02, ry, zm];
    batch.oquad(mats.windowLit, a, b, c, d, [0, 1, s]);
    const n = Math.max(2, Math.round((x1 - x0) / 0.35));
    for (let k = 0; k <= n; k++) { const x = x0 + 0.03 + ((x1 - x0 - 0.06) * k) / n; batch.beam(mats.paintWhite, [x, cy + 0.06, ze + (zm - ze) * 0.02], [x, ry + 0.01, zm], 0.035, 0.03); }
    for (const f of [0.35, 0.7]) batch.cyl(mats.brass, [x0, cy + 0.04 + (ry - cy) * f + 0.06, ze + (zm - ze) * f], [x1, cy + 0.04 + (ry - cy) * f + 0.06, ze + (zm - ze) * f], 0.012, 4);
  }
  batch.box(mats.paintWhite, x0 - 0.02, ry - 0.02, zm - 0.05, x1 + 0.02, ry + 0.05, zm + 0.05);
  for (const x of [x0, x1]) batch.otri(mats.paintWhite, [x, cy + 0.04, z0], [x, cy + 0.04, z1], [x, ry, zm], [x < (x0 + x1) / 2 ? -1 : 1, 0, 0]);
}

/** Louvred vent panel on a wall (wall-local u0..u1 / v0..v1). */
function louvre(fpiece, u0, u1, v0, v1, mat) {
  fpiece(u0, u1, v0, v1, -0.03, 0, mat);
  const n = Math.max(3, Math.round((v1 - v0) / 0.07));
  for (let k = 0; k < n; k++) { const v = v0 + 0.03 + ((v1 - v0 - 0.06) * (k + 0.5)) / n; fpiece(u0 + 0.03, u1 - 0.03, v - 0.012, v + 0.012, -0.07, -0.03, mat); }
}

/** Decorate the outer face of a deckhouse side wall: hand rail, louvres, fire hose box, electrical boxes. */
function decorate(batch, info, { rail = true, seed = 1 }) {
  if (!info) return;
  const cast = batch.cast; batch.cast = false;
  decorateInner(batch, info, rail, seed);
  batch.cast = cast;
}
function decorateInner(batch, info, rail, seed) {
  const { P, L, piers, openings, fpiece } = info;
  const doors = openings.filter((p) => p.kind !== 'window');
  if (rail) {
    // teak hand rail on brass brackets below the window sills (gaps at doors)
    let c = 0.25;
    for (const d of [...doors, { u0: L - 0.25, u1: L }]) {
      const a = c, b = d.u0 - 0.15;
      if (b - a > 0.4) {
        batch.cyl(mats.woodDark, P(a, 0.86, -0.085), P(b, 0.86, -0.085), 0.024, 6, true);
        const n = Math.max(1, Math.round((b - a) / 1.3));
        for (let k = 0; k <= n; k++) { const u = a + 0.08 + ((b - a - 0.16) * k) / n; batch.cyl(mats.brass, P(u, 0.84, 0), P(u, 0.84, -0.075), 0.011, 4); batch.cyl(mats.brass, P(u, 0.84, -0.075), P(u, 0.86, -0.085), 0.013, 4); }
      }
      c = d.u1 + 0.15;
    }
  }
  let k = seed;
  for (const [p0, p1] of piers) {
    const len = p1 - p0;
    if (len < 0.9 || p0 < 0.3 || p1 > L - 0.3) continue;
    k++;
    const uc = (p0 + p1) / 2;
    if (k % 4 === 0) louvre(fpiece, uc - 0.3, uc + 0.3, 0.2, 0.62, mats.paintWhite);
    else if (k % 7 === 2) { // fire hose box
      fpiece(uc - 0.28, uc + 0.28, 1.05, 1.75, -0.2, 0, mats.paintWhite);
      fpiece(uc - 0.24, uc + 0.24, 1.09, 1.71, -0.215, -0.2, mats.hullRed);
      fpiece(uc + 0.14, uc + 0.18, 1.36, 1.44, -0.24, -0.215, mats.brass);
    } else if (k % 7 === 5) { // junction / bell box with conduit
      fpiece(uc - 0.09, uc + 0.09, 1.6, 1.82, -0.08, 0, mats.steelDark);
      batch.cyl(mats.steelDark, P(uc, 1.82, -0.04), P(uc, info.H - 0.05, -0.04), 0.014, 4);
    }
  }
}

export function buildWalls(world, batch, inst, ports) {
  batch.cast = true;

  // ================= well-deck bulkheads (C floor -> B floor) =================
  const bulkhead = (x, inx, topY) => {
    const e = plan(x) - 0.02;
    const doors = doorsIn('C', 'z', x, -e);
    const info = wallRun(world, batch, { a: [x, -e], b: [x, e], inward: [inx, 0], y0: C, y1: topY, openings: doors, matOut: mats.hullWhite, doorMat: mats.paintWhite, frameMat: mats.paintGrey, inst });
    // a few portholes between / outboard of the doors
    const dz = doors.map((d) => (d.u0 + d.u1) / 2 - e);
    for (let z = -Math.floor((e - 1.2) / 2.2) * 2.2; z <= e - 1.2; z += 2.2) {
      if (dz.some((c) => Math.abs(z - c) < 2.3)) continue;
      ports.push({ p: [x, C + 1.6, z], n: [-inx, 0, 0], mat: mats.hullWhite });
    }
    decorate(batch, info, { rail: false, seed: Math.round(x) });
  };
  bulkhead(X.wellF, -1, B - 0.02);
  bulkhead(X.fc, 1, B - 0.02);
  bulkhead(X.wellA, 1, B - 0.02);
  bulkhead(X.poop, -1, B - 0.02);

  // ================= B-deck enclosure =================
  const bTop = A - 0.02;
  const bWin = { pitch: 2.75, w: 1.15, sill: 0.95, h: 1.3, transom: true };
  const bxs = [B_HOUSE.x0, -70, 40, ...stations(40, B_HOUSE.x1, 2.375).slice(1)];
  for (const s of [1, -1]) for (let i = 0; i < bxs.length - 1; i++) {
    const xa = bxs[i], xb = bxs[i + 1], pa = [xa, s * plan(xa)], pb = [xb, s * plan(xb)];
    const L = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]);
    const ops = L > 6 ? windowsAlong(L, bWin) : (L > 2.2 ? [{ u0: L / 2 - 0.55, u1: L / 2 + 0.55, v0: 0.95, v1: 2.25, kind: 'window', transom: true }] : []);
    wallRun(world, batch, { a: pa, b: pb, inward: [0, -s], y0: B, y1: bTop, openings: ops, inst });
  }
  { // aft end wall with the doors to the open B deck
    const e = plan(B_HOUSE.x0) - T_WALL;
    const info = wallRun(world, batch, { a: [B_HOUSE.x0, -e], b: [B_HOUSE.x0, e], inward: [1, 0], y0: B, y1: bTop, openings: windowsAlong(2 * e, { ...bWin, pitch: 3.2, doors: doorsIn('B', 'z', B_HOUSE.x0, -e) }), inst });
    decorate(batch, info, { rail: true, seed: 3 });
    // forward end wall, carried up as the bulwark of the A deck's forward end
    const f = plan(B_HOUSE.x1) - 0.02;
    wallRun(world, batch, { a: [B_HOUSE.x1, -f], b: [B_HOUSE.x1, f], inward: [-1, 0], y0: B - 0.02, y1: A + 1.2, openings: windowsAlong(2 * f, { pitch: 2.4, w: 1.1, sill: 0.97, h: 1.3, transom: true }), inst });
    batch.box(mats.woodDark, B_HOUSE.x1 - T_WALL - 0.03, A + 1.2, -f, B_HOUSE.x1 + 0.03, A + 1.25, f);
  }

  // ================= A-deck house =================
  const aTop = boat - SLAB;
  const aWalls = house(world, batch, inst, {
    deck: 'A', x0: A_HOUSE.x0, x1: A_HOUSE.x1, hw: A_HOUSE.hw, y0: A, y1: aTop,
    side: { pitch: 2.6, w: 1.3, sill: 0.9, h: 1.35, transom: true },
    end: { pitch: 2.6, w: 1.3, sill: 0.9, h: 1.35, transom: true },
  });
  aWalls.forEach((w, i) => decorate(batch, w.info, { rail: false, seed: 10 + i }));

  // promenade: forward part enclosed by a steel screen with large windows (Titanic only), then bulwark to the fore end
  const scr = [X.screenAft, 40, ...stations(40, X.boatFwd, 2.125).slice(1)];
  for (const s of [1, -1]) {
    for (let i = 0; i < scr.length - 1; i++) {
      const xa = scr[i], xb = scr[i + 1], pa = [xa, s * bw(xa)], pb = [xb, s * bw(xb)];
      const L = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]);
      const ops = L > 6 ? windowsAlong(L, { pitch: 2.5, w: 1.7, sill: 1.05, h: 1.3, margin: 0.4, arch: 0.32, panes: 1 }) : [{ u0: L / 2 - 0.75, u1: L / 2 + 0.75, v0: 1.05, v1: 2.35, kind: 'window', arch: 0.32, panes: 1 }];
      wallRun(world, batch, { a: pa, b: pb, inward: [0, -s], y0: A, y1: aTop, t: 0.1, openings: ops, matOut: mats.hullWhite, frameMat: mats.paintWhite, inst });
      // painted covering strip over the deck edge outboard of the screen
      const ea = plan(xa) - 0.02, eb = plan(xb) - 0.02;
      batch.oquad(mats.hullWhite, [xa, A + 0.012, pa[1]], [xb, A + 0.012, pb[1]], [xb, A + 0.012, s * eb], [xa, A + 0.012, s * ea], [0, 1, 0]);
    }
    const bx = stations(X.boatFwd, X.aFwd, 2);
    for (let i = 0; i < bx.length - 1; i++) {
      const pa = [bx[i], s * bw(bx[i])], pb = [bx[i + 1], s * bw(bx[i + 1])];
      wallRun(world, batch, { a: pa, b: pb, inward: [0, -s], y0: A, y1: A + 1.2, t: 0.1, inst });
      batch.beam(mats.woodDark, [pa[0], A + 1.225, pa[1] - s * 0.05], [pb[0], A + 1.225, pb[1] - s * 0.05], 0.16, 0.05);
    }
  }

  // ================= boat-deck houses =================
  const hTop = roof - SLAB;
  const sideWin = { pitch: 2.4, w: 0.95, sill: 1.0, h: 1.15 };
  const endWin = { pitch: 2.2, w: 0.95, sill: 1.0, h: 1.15 };
  for (const h of BOAT_HOUSES) {
    const spec = { deck: 'boat', x0: h.x0, x1: h.x1, hw: h.hw, y0: boat, y1: hTop, side: sideWin, end: endWin };
    if (h.id === 'fwd') {
      // navigating bridge 66..73: open (unglazed) sides, wheelhouse front with a row of large windows
      const bx = 66 - h.x0;
      spec.sideExtra = { len: bx - 0.4, ops: [
        { u0: bx + 0.3, u1: bx + 2.15, v0: 1.05, v1: 2.3, kind: 'open' },
        { u0: bx + 3.85, u1: h.x1 - h.x0 - 0.35, v0: 1.05, v1: 2.3, kind: 'open' },
      ] };
      spec.frontWin = { pitch: 1.58, w: 1.3, sill: 1.0, h: 1.3, margin: 0.3, panes: 3, transom: true };
    }
    const walls = house(world, batch, inst, spec);
    walls.forEach((w, i) => decorate(batch, w.info, { rail: w.side !== undefined || h.id !== 'fwd', seed: i + h.x0 }));
  }
  // roofs + skylights / domes
  const fwd = BOAT_HOUSES.find((h) => h.id === 'fwd'), mid = BOAT_HOUSES.find((h) => h.id === 'mid'), aft = BOAT_HOUSES.find((h) => h.id === 'aft');
  const domeF = { x0: 39.2, x1: 44.8, z0: -3.2, z1: 3.2 }, domeA = { x0: -5.0, x1: 0.2, z0: -2.8, z1: 2.8 };
  roofSlab(world, batch, fwd.x0, fwd.x1, fwd.hw, roof, [domeF]);
  roofSlab(world, batch, mid.x0, mid.x1, mid.hw, roof, [domeA]);
  roofSlab(world, batch, aft.x0, aft.x1, aft.hw, roof);
  dome(batch, 42, 0, 2.8, 3.2, 1.5, roof + 0.4);
  dome(batch, -2.4, 0, 2.6, 2.8, 1.3, roof + 0.4);
  skylight(batch, 60, 63, -1.2, 1.2, roof);
  skylight(batch, 47.5, 50, 3.5, 5.5, roof);
  skylight(batch, -45, -41, -1, 1, roof);
  // wheelhouse roof edge: teak rim
  batch.box(mats.woodDark, fwd.x1 + 0.25, roof + 0.04, -fwd.hw - 0.25, fwd.x1 + 0.3, roof + 0.1, fwd.hw + 0.25);
  // roof canvas seams (battens) and expansion joints across the boat deck
  for (const h of BOAT_HOUSES) for (let x = h.x0 + 0.9; x < h.x1 - 0.5; x += 1.8) {
    const holes = [domeF, domeA].filter((d) => x > d.x0 - 0.1 && x < d.x1 + 0.1);
    const zs = holes.length ? [[-h.hw - 0.2, holes[0].z0 - 0.1], [holes[0].z1 + 0.1, h.hw + 0.2]] : [[-h.hw - 0.2, h.hw + 0.2]];
    for (const [za, zb] of zs) batch.box(mats.canvas, x - 0.02, roof, za, x + 0.02, roof + 0.012, zb, { skip: 'ny' });
  }
  for (const xj of [49.3, -27.3]) {
    for (const s of [1, -1]) {
      const zi = xj > 0 ? fwd.hw : 6.0, zo = bw(xj) - 0.1;
      batch.box(mats.brass, xj - 0.05, boat, Math.min(s * zi, s * zo), xj + 0.05, boat + 0.008, Math.max(s * zi, s * zo), { skip: 'ny' });
      batch.box(mats.brass, xj - 0.05, A, Math.min(s * A_HOUSE.hw, s * (bw(xj) - 0.1)), xj + 0.05, A + 0.008, Math.max(s * A_HOUSE.hw, s * (bw(xj) - 0.1)), { skip: 'ny' });
    }
  }

  // low raised roofs (solid)
  for (const r of BOAT_LOW_ROOFS) {
    const top = boat + 1.4;
    batch.box(mats.paintWhite, r.x0, boat, -r.hw, r.x1, top, r.hw, { skip: 'ny', m: { py: mats.canvas } });
    batch.box(mats.paintWhite, r.x0 - 0.06, top - 0.08, -r.hw - 0.06, r.x1 + 0.06, top + 0.02, r.hw + 0.06, { m: { py: mats.canvas } });
    batch.box(mats.woodDark, r.x0 - 0.08, top + 0.02, -r.hw - 0.08, r.x1 + 0.08, top + 0.06, r.hw + 0.08, { skip: 'ny', m: { py: mats.canvas } });
    world.addCollider(r.x0, boat, -r.hw, r.x1, top, r.hw);
    // side lights of the raised roof (framed, with glazing bars)
    for (const s of [1, -1]) for (let x = r.x0 + 0.8; x < r.x1 - 1.2; x += 1.5) {
      const z = s * (r.hw + 0.005);
      const q = [[x, boat + 0.55, z], [x + 0.9, boat + 0.55, z], [x + 0.9, boat + 1.05, z], [x, boat + 1.05, z]];
      if (s > 0) batch.quad(mats.windowLit, q[0], q[1], q[2], q[3]); else batch.quad(mats.windowLit, q[3], q[2], q[1], q[0]);
      const zf = s * (r.hw + 0.03);
      batch.box(mats.woodDark, x - 0.05, boat + 0.5, Math.min(z, zf), x + 0.95, boat + 0.55, Math.max(z, zf));
      batch.box(mats.woodDark, x - 0.05, boat + 1.05, Math.min(z, zf), x + 0.95, boat + 1.1, Math.max(z, zf));
      for (const xx of [x - 0.05, x + 0.43, x + 0.9]) batch.box(mats.woodDark, xx, boat + 0.55, Math.min(z, zf), xx + 0.05, boat + 1.05, Math.max(z, zf));
    }
    skylight(batch, (r.x0 + r.x1) / 2 - 1.2, (r.x0 + r.x1) / 2 + 1.2, -1, 1, top + 0.02);
  }

  // ================= bridge: front bulwark of the boat deck + wind dodger + wing cabs + side lights =================
  {
    const e = bw(X.boatFwd);
    wallRun(world, batch, { a: [X.boatFwd, -e], b: [X.boatFwd, e], inward: [-1, 0], y0: boat - SLAB, y1: boat + 1.25, t: 0.1, matOut: mats.hullWhite, inst });
    batch.box(mats.woodDark, X.boatFwd - 0.13, boat + 1.25, -e, X.boatFwd + 0.03, boat + 1.3, e);
    // canvas wind dodger on iron brackets above the bridge front, sloping forward
    for (let z = -e + 0.2; z <= e - 0.2 + 1e-6; z += (2 * e - 0.4) / 18) batch.cyl(mats.iron, [X.boatFwd - 0.05, boat + 1.3, z], [X.boatFwd + 0.12, boat + 1.72, z], 0.014, 4);
    for (const s of [1, -1]) batch.oquad(mats.canvas, [X.boatFwd - 0.03, boat + 1.32, 0], [X.boatFwd - 0.03, boat + 1.32, s * (e - 0.2)], [X.boatFwd + 0.13, boat + 1.7, s * (e - 0.2)], [X.boatFwd + 0.13, boat + 1.7, 0], [1, 0.3, 0]);
    for (const s of [1, -1]) batch.oquad(mats.canvas, [X.boatFwd - 0.04, boat + 1.32, 0], [X.boatFwd - 0.04, boat + 1.32, s * (e - 0.2)], [X.boatFwd + 0.12, boat + 1.7, s * (e - 0.2)], [X.boatFwd + 0.12, boat + 1.7, 0], [-1, -0.3, 0]);
    batch.cyl(mats.iron, [X.boatFwd + 0.13, boat + 1.72, -e + 0.2], [X.boatFwd + 0.13, boat + 1.72, e - 0.2], 0.012, 4);
    for (const s of [1, -1]) {
      const zo = s * (bw(69) - 0.32), zi = s * (bw(69) - 2.0), xa = 67.6, xb = 70.4, top = boat + 2.25;
      const win = (L) => [{ u0: 0.3, u1: L - 0.3, v0: 1.0, v1: 1.95, kind: 'window', panes: 2 }];
      const cab = { y0: boat, y1: top, t: 0.08, matOut: mats.paintWhite, frameMat: mats.woodDark, inst };
      wallRun(world, batch, { ...cab, a: [xa, zo], b: [xb, zo], inward: [0, -s], openings: win(xb - xa) });
      wallRun(world, batch, { ...cab, a: [xb, Math.min(zi, zo)], b: [xb, Math.max(zi, zo)], inward: [-1, 0], openings: win(Math.abs(zo - zi)) });
      wallRun(world, batch, { ...cab, a: [xa, Math.min(zi, zo)], b: [xa, Math.max(zi, zo)], inward: [1, 0], openings: win(Math.abs(zo - zi)) });
      batch.box(mats.paintWhite, xa - 0.12, top, Math.min(zi, zo) - 0.12, xb + 0.12, top + 0.07, Math.max(zi, zo) + 0.12, { m: { py: mats.canvas } });
      batch.box(mats.woodDark, xa - 0.14, top + 0.07, Math.min(zi, zo) - 0.14, xb + 0.14, top + 0.11, Math.max(zi, zo) + 0.14, { skip: 'ny', m: { py: mats.canvas } });
      // side light: screened lamp box on the outboard face of the cab (red to port, green to starboard)
      const zl = zo + s * 0.02, ly = boat + 1.55;
      batch.box(mats.paintWhite, 68.3, ly - 0.42, Math.min(zl, zl + s * 0.75), 70.3, ly - 0.36, Math.max(zl, zl + s * 0.75));          // shelf
      batch.box(mats.paintWhite, 68.3, ly - 0.36, Math.min(zl + s * 0.7, zl + s * 0.75), 70.3, ly + 0.45, Math.max(zl + s * 0.7, zl + s * 0.75)); // screen board (outboard)
      batch.box(mats.brass, 69.95, ly - 0.36, Math.min(zl + s * 0.2, zl + s * 0.6), 70.25, ly + 0.15, Math.max(zl + s * 0.2, zl + s * 0.6));      // lamp housing
      batch.box(s > 0 ? mats.navGreen : mats.navRed, 70.25, ly - 0.25, Math.min(zl + s * 0.25, zl + s * 0.55), 70.29, ly + 0.05, Math.max(zl + s * 0.25, zl + s * 0.55));
      batch.cyl(mats.brass, [70.1, ly + 0.15, zl + s * 0.4], [70.1, ly + 0.35, zl + s * 0.4], 0.05, 6, true, 0.02);
      // lamp on the cab roof
      batch.cyl(mats.brass, [69, top + 0.11, (zi + zo) / 2], [69, top + 0.35, (zi + zo) / 2], 0.09, 8, true, 0.06);
      batch.cyl(mats.lampGlow, [69, top + 0.17, (zi + zo) / 2], [69, top + 0.3, (zi + zo) / 2], 0.075, 8);
    }
  }
  batch.cast = false;

  // ================= bulkhead lamps (positions for the light pool + caged fixtures) =================
  const G = lampGeos();
  const lamp = (x, y, z, nx, nz) => {
    const p = [x - nx * 0.06, y - 0.02, z - nz * 0.06], n = [nx, 0, nz], X = [nz, 0, -nx];
    inst.basis(G.brass, mats.brass, p, X, [0, 1, 0], n);
    inst.basis(G.glow, mats.lampGlow, p, X, [0, 1, 0], n);
    world.addLamp({ x: x + nx * 0.3, y, z: z + nz * 0.3 });
  };
  for (const [x, nx] of [[X.wellF, 1], [X.fc, -1], [X.wellA, -1], [X.poop, 1]]) for (const z of [-1.5, 1.5]) lamp(x + nx * 0.06, C + 2.35, z, nx, 0);
  for (const z of [-2.2, 2.2]) lamp(B_HOUSE.x0 - 0.06, B + 2.3, z, -1, 0);
  for (const h of BOAT_HOUSES) for (const s of [1, -1]) for (let x = h.x0 + 3; x < Math.min(h.x1, 64); x += 9.5) lamp(x, boat + 2.35, s * (h.hw + 0.06), 0, s);
}
