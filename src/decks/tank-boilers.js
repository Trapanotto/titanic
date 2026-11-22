// Tank top – boiler rooms 6 … 1: 24 double-ended and 5 single-ended Scotch boilers. Shells and ends are templates
// (InstancedMesh, one per zone and material): riveted shell plates with butt straps and rivet rows, saddles, dished end
// plates with stay nuts, three corrugated furnaces per end with cast fire doors (hinges, latch, air slide; some open with
// a glowing fire bed and flames), ash-pit doors, smokebox with strap-hinged doors, uptakes, water-gauge glasses with
// brass cocks, pressure gauges, main stop valve with lagged branch, safety valves, manhole. Static per room: breeching
// with flanges and rivets, lagged header and steam mains, bunkers with chutes and coal, tool racks, ash ejectors,
// stoking indicators, caged lamps, ladders and gratings, watertight door gearing.
import * as THREE from 'three';
import { mats } from '../core/materials.js';
import { kitMats, coalPile, wheelbarrow, ladder, place } from '../interior/kit.js';
import {
  DECK, Y, CEIL, TBatch, tube, tubeBetween, pipeRun, cageLamp, floorHW, hullIn,
  stamp, M4, M4dir, gcache, latheAt, nut, rivet, rivetLine, rivetArcX, gratingMat,
} from './tank-lib.js';

const R = 2.4;                 // boiler radius (diameter 4.8 m)
const YC = 2.65;               // boiler axis above the tank top
const LDE = 6.1, LSE = 3.6;    // boiler lengths
const PITCH = 4.92;            // boiler spacing across the ship
const FY = 1.45;               // furnace centre above the floor plates
const FZ = [-1.4, 0, 1.4];     // furnace positions across a boiler end
const BUNKER = 1.3;            // depth of the transverse bunkers
const BTOP = Y + 7.6;          // top of the bunkers
const MAIN_Y = Y + 8.4;        // steam mains
const HEADER = 6.9;            // transverse steam header above each boiler row (relative to the tank top)
const HX = -0.45;              // x offset of the lagged branch / header from the boiler centre
const SB = { x1: 0.62, y0: 2.25, y1: 4.75, hw: 1.78 }; // smokebox (front of the end plate)

/** Boiler rooms (No. 6 = foremost). xc = centre of the boiler row. */
export const BOILER_ROOMS = [
  { n: 6, x0: 50.15, x1: 66, cnt: 4, de: true, xc: 58.075, trunk: { to: 58.075 } },
  { n: 5, x0: 34.3, x1: 50.15, cnt: 5, de: true, xc: 42.225, trunk: { to: 52.5, z0: -2.8, z1: 2.8 } },
  { n: 4, x0: 18.0, x1: 34.3, cnt: 5, de: true, xc: 26.65, trunk: { to: 34, z0: -2.8, z1: 2.8 }, stairAft: true },
  { n: 3, x0: 3.35, x1: 18.0, cnt: 5, de: true, xc: 10.675, trunk: { to: 26.65, z0: 0.2, z1: 2.8 } },
  { n: 2, x0: -11.3, x1: 3.35, cnt: 5, de: true, xc: -3.975, trunk: { to: 12, z0: -2.8, z1: -0.2 } },
  { n: 1, x0: -22, x1: -11.3, cnt: 5, de: false, xc: -18.8, trunk: { to: -3.975, z0: -2.8, z1: -0.2 } },
];
export const boilerZs = (cnt) => Array.from({ length: cnt }, (_, i) => (i - (cnt - 1) / 2) * PITCH);
/** x of the front (and back) planes of a room's boilers */
export function boilerEnds(r) {
  return r.de ? { fwd: r.xc + LDE / 2, aft: r.xc - LDE / 2 } : { fwd: r.xc + LSE / 2, aft: r.xc - LSE / 2 };
}

// ------------------------------------------------------------------------------------------------ small geometry

const BX = (sx, sy, sz) => gcache(`bx${sx}_${sy}_${sz}`, () => new THREE.BoxGeometry(sx, sy, sz));
const CYL = (r0, r1, h, s = 8, open = false) => gcache(`cy${r0}_${r1}_${h}_${s}_${open}`, () => new THREE.CylinderGeometry(r1, r0, h, s, 1, open));
const TOR = (Rr, r, s = 16, rs = 4, arc = Math.PI * 2) => gcache(`to${Rr}_${r}_${s}_${rs}_${arc}`, () => new THREE.TorusGeometry(Rr, r, rs, s, arc));
const box = (b, mat, sx, sy, sz, x, y, z, rx = 0, ry = 0, rz = 0) => stamp(b, mat, BX(sx, sy, sz), M4(x, y, z, rx, ry, rz));
const LUMP = [new THREE.OctahedronGeometry(1, 0), new THREE.TetrahedronGeometry(1.2, 0), new THREE.IcosahedronGeometry(0.9, 0)];
function rnd(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
/** handwheel (rim, 4 spokes, hub) with its axis along y at p (rx/rz tilt) */
function handwheel(b, mat, x, y, z, r, d = [0, 1, 0]) {
  const base = M4dir([x, y, z], d), L = (m) => new THREE.Matrix4().multiplyMatrices(base, m);
  stamp(b, mat, TOR(r, r * 0.09, 18, 4), L(M4(0, 0, 0, Math.PI / 2, 0, 0)));
  for (let k = 0; k < 2; k++) stamp(b, mat, BX(2 * r, r * 0.08, r * 0.08), L(M4(0, 0, 0, 0, (k * Math.PI) / 2, 0)));
  stamp(b, mats.iron, CYL(r * 0.18, r * 0.18, r * 0.25, 8), base);
}
/** lagged pipe (canvas lagging with iron bands) p→q */
function lagged(b, p, q, r, bands = 0.5) {
  tubeBetween(b, mats.canvas, p, q, r, { seg: 10, caps: false });
  const L = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]), n = Math.floor(L / bands);
  for (let i = 1; i <= n; i++) {
    const t = (i - 0.5) / n, c = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t], d = [(q[0] - p[0]) / L * 0.018, (q[1] - p[1]) / L * 0.018, (q[2] - p[2]) / L * 0.018];
    tubeBetween(b, mats.iron, [c[0] - d[0], c[1] - d[1], c[2] - d[2]], [c[0] + d[0], c[1] + d[1], c[2] + d[2]], r + 0.006, { seg: 10, caps: false });
  }
}
/** bolted pipe flange pair at c, axis d (unit) */
function flange(b, c, d, r) {
  const e = [d[0] * 0.025, d[1] * 0.025, d[2] * 0.025];
  tubeBetween(b, mats.iron, [c[0] - e[0], c[1] - e[1], c[2] - e[2]], [c[0] + e[0], c[1] + e[1], c[2] + e[2]], r, { seg: 12 });
}

/** dish of the end plate: offset along the boiler axis at radius r */
const dishT = (r) => (r < 2.1 ? 0.06 : 0.06 - 0.03 * Math.min(1, (r - 2.1) / 0.28));
/** dished end plate at x = x0 facing dir (±1): flanged knuckle ring + flat plate (with the three furnace mouths cut out on the front) */
function endPlate(b, x0, dir, mouths = false) {
  latheAt(b, mats.steelDark, [[R + 0.012, -0.2], [R + 0.014, -0.03], [R - 0.03, 0.012], [R - 0.12, 0.035], [2.1, 0.055], [2.0, 0.06]], dir > 0 ? 'x' : '-x', [x0, YC, 0], 40);
  // flat plate as horizontal strips (exact chords), square openings behind the furnace fronts
  const xf = x0 + dir * 0.062, RP = 2.02, NS = 36, y0 = YC - RP, yb0 = FY - 0.12, yb1 = FY + 0.32;
  const cuts = mouths ? FZ.map((zf) => [zf - 0.26, zf + 0.26]) : [];
  const ys = []; for (let i = 0; i <= NS; i++) ys.push(y0 + (2 * RP * i) / NS);
  if (mouths) { ys.push(yb0, yb1); ys.sort((p, q) => p - q); }
  for (let i = 0; i < ys.length - 1; i++) {
    const ya = ys[i], yc = ys[i + 1]; if (yc - ya < 1e-4) continue;
    const wa = Math.sqrt(Math.max(0, RP * RP - (ya - YC) ** 2)), wc = Math.sqrt(Math.max(0, RP * RP - (yc - YC) ** 2));
    const inBand = mouths && ya >= yb0 - 1e-6 && yc <= yb1 + 1e-6;
    const segs = inBand ? [[-9, cuts[0][0]], [cuts[0][1], cuts[1][0]], [cuts[1][1], cuts[2][0]], [cuts[2][1], 9]] : [[-9, 9]];
    for (const [za, zb] of segs) {
      const A = [Math.max(za, -wa), Math.min(zb, wa)], C = [Math.max(za, -wc), Math.min(zb, wc)];
      if (A[1] < A[0]) A[1] = A[0] = (A[0] + A[1]) / 2; if (C[1] < C[0]) C[1] = C[0] = (C[0] + C[1]) / 2;
      if (A[1] - A[0] < 1e-4 && C[1] - C[0] < 1e-4) continue;
      b.poly(mats.steelDark, [[xf, ya, A[0]], [xf, ya, A[1]], [xf, yc, C[1]], [xf, yc, C[0]]].filter((q, k, arr) => k === 0 || Math.abs(q[2] - arr[k - 1][2]) + Math.abs(q[1] - arr[k - 1][1]) > 1e-6), [dir, 0, 0]);
    }
  }
}

// ------------------------------------------------------------------------------------------------ shell template

function saddle(b, x) {
  const sh = gcache('saddle', () => {
    const s = new THREE.Shape(); s.moveTo(-1.95, 0.1); s.lineTo(1.95, 0.1);
    for (let i = 0; i <= 16; i++) { const z = 1.95 - (3.9 * i) / 16; s.lineTo(z, YC - Math.sqrt(R * R - z * z) - 0.004); }
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: false, curveSegments: 4 }); g.translate(0, 0, -0.015); g.rotateY(Math.PI / 2); return g;
  });
  stamp(b, mats.iron, sh, M4(x, 0, 0));
  box(b, mats.iron, 0.36, 0.1, 4.3, x, 0.05, 0);
  for (const z of [-1.8, -0.9, 0.9, 1.8]) {
    const yt = YC - Math.sqrt(R * R - z * z);
    box(b, mats.iron, 0.3, yt - 0.1, 0.02, x, 0.1 + (yt - 0.1) / 2, z);
  }
  for (const z of [-2.0, -1.35, 1.35, 2.0]) for (const dx of [-0.12, 0.12]) nut(b, [x + dx, 0.1, z], [0, 1, 0], 0.025);
  // curved top flange (angle) along the shell
  for (let i = 0; i < 10; i++) {
    const a0 = -0.95 + (1.9 * i) / 10, a1 = a0 + 0.19, am = (a0 + a1) / 2, rr = R + 0.01;
    box(b, mats.iron, 0.22, 0.02, rr * 0.19, x, YC - rr * Math.cos(am), rr * Math.sin(am), -am);
  }
}

function shellTemplate(len, se) {
  const b = new TBatch(), h = len / 2, top = YC + R, VIS = 1.8;
  tube(b, mats.steelDark, 'x', [YC, 0], R, -h + 0.06, h - 0.06, { seg: 40, caps: false });
  if (se) { endPlate(b, -h, -1); for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; nut(b, [-h - 0.06, YC + Math.cos(a) * 1.2, Math.sin(a) * 1.2], [-1, 0, 0], 0.035); } }
  const nr = se ? 2 : 3, rl = len / nr;
  // circumferential butt straps with double rows of rivets either side of the joint
  for (let k = 1; k < nr; k++) {
    const x = -h + k * rl;
    tube(b, mats.steelDark, 'x', [YC, 0], R + 0.018, x - 0.17, x + 0.17, { seg: 40, caps: false });
    for (const s of [-1, 1]) b.ring(mats.steelDark, [x + s * 0.17, YC, 0], [s, 0, 0], R, R + 0.018, 40);
    for (const dx of [-0.125, -0.06, 0.06, 0.125]) rivetArcX(b, x + dx, YC, 0, R + 0.018, -VIS, VIS, 0.13);
  }
  for (const s of [-1, 1]) rivetArcX(b, s * (h - 0.11), YC, 0, R, -VIS, VIS, 0.12);
  // longitudinal butt straps (staggered), riveted
  for (let k = 0; k < nr; k++) {
    const xa = -h + k * rl + (k ? 0.17 : 0.14), xb = -h + (k + 1) * rl - (k < nr - 1 ? 0.17 : 0.14), a = (k % 2 ? 1 : -1) * 0.62;
    const c = Math.cos(a), s = Math.sin(a), rr = R + 0.008;
    box(b, mats.steelDark, xb - xa, 0.02, 0.36, (xa + xb) / 2, YC + rr * c, rr * s, a);
    for (const o of [-0.13, -0.07, 0.07, 0.13]) {
      const y = YC + (rr + 0.01) * c - o * s, z = (rr + 0.01) * s + o * c;
      rivetLine(b, [xa + 0.04, y, z], [xb - 0.04, y, z], [0, c, s], 0.1);
    }
  }
  for (const x of se ? [-h + 0.5, h - 0.5] : [-h + 0.6, 0, h - 0.6]) saddle(b, x);

  // main stop valve (cast chest, bolted flange, bonnet, spindle, handwheel) and lagged branch to the header
  const vy = top - 0.08;
  latheAt(b, mats.iron, [[0, 0], [0.27, 0], [0.27, 0.06], [0.2, 0.08], [0.24, 0.2], [0.24, 0.36], [0.2, 0.44], [0.26, 0.46], [0.26, 0.52], [0.12, 0.54], [0.1, 0.74], [0.13, 0.77], [0.13, 0.82], [0, 0.84]], 'y', [0, vy, 0], 16);
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; nut(b, [Math.cos(a) * 0.23, vy + 0.06, Math.sin(a) * 0.23], [0, 1, 0], 0.022); nut(b, [Math.cos(a) * 0.22, vy + 0.52, Math.sin(a) * 0.22], [0, 1, 0], 0.02); }
  tube(b, mats.chrome, 'y', [0, 0], 0.022, vy + 0.84, vy + 1.06, { seg: 6 });
  handwheel(b, mats.rust, 0, vy + 1.06, 0, 0.26);
  tube(b, mats.iron, 'x', [vy + 0.28, 0], 0.13, HX + 0.05, -0.2, { seg: 12 });
  flange(b, [-0.24, vy + 0.28, 0], [1, 0, 0], 0.22);
  lagged(b, [-0.27, vy + 0.28, 0], [HX + 0.17, vy + 0.28, 0], 0.17);
  latheAt(b, mats.iron, [[0.17, 0], [0.2, 0.02], [0.2, 0.36], [0.17, 0.38]], 'y', [HX, vy + 0.1, 0], 12); // elbow casing
  lagged(b, [HX, vy + 0.48, 0], [HX, HEADER - 0.2, 0], 0.17, 0.45);
  // twin spring safety valves (Cockburn) on a cast chest, easing lever, waste-steam pipe
  const sx = se ? 0.9 : 1.6;
  box(b, mats.iron, 0.86, 0.06, 0.66, sx, top - 0.03, 0);
  box(b, mats.steelDark, 0.7, 0.36, 0.5, sx, top + 0.18, 0);
  for (const dz of [-0.13, 0.13]) {
    latheAt(b, mats.brass, [[0, 0], [0.1, 0], [0.1, 0.05], [0.075, 0.07], [0.075, 0.42], [0.1, 0.44], [0.1, 0.5], [0.04, 0.53], [0.03, 0.66], [0, 0.67]], 'y', [sx + 0.12, top + 0.36, dz], 12);
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; nut(b, [sx + 0.12 + Math.cos(a) * 0.085, top + 0.36, dz + Math.sin(a) * 0.085], [0, 1, 0], 0.015); }
  }
  box(b, mats.iron, 0.04, 0.04, 0.6, sx + 0.12, top + 1.0, 0);
  box(b, mats.iron, 0.5, 0.03, 0.03, sx - 0.12, top + 1.0, 0.28, 0, 0, -0.25);
  tube(b, mats.steelDark, 'y', [sx - 0.18, 0], 0.11, top + 0.36, 7.25, { seg: 10, caps: false });
  flange(b, [sx - 0.18, top + 0.45, 0], [0, 1, 0], 0.17);
  // manhole on top: compensating ring, oval cover, two dogs
  const mx = se ? -0.9 : -1.6;
  stamp(b, mats.iron, latheGeoC([[0.36, 0], [0.38, 0.02], [0.38, 0.1], [0.3, 0.11], [0.3, 0.13], [0, 0.14]]), M4(mx, top - 0.05, 0, 0, 0, 0, 1.25, 1, 0.85));
  for (const dz of [-0.12, 0.12]) { box(b, mats.iron, 0.6, 0.05, 0.06, mx, top + 0.12, dz); nut(b, [mx, top + 0.145, dz], [0, 1, 0], 0.03); }
  // auxiliary stop valve
  if (!se) {
    latheAt(b, mats.iron, [[0, 0], [0.15, 0], [0.15, 0.04], [0.12, 0.05], [0.14, 0.18], [0.11, 0.26], [0.07, 0.3], [0.06, 0.45], [0, 0.46]], 'y', [-2.45, top - 0.06, 0.55], 12);
    handwheel(b, mats.rust, -2.45, top + 0.48, 0.55, 0.16);
  }
  // feed check valves on both sides of the front quarter
  for (const s of [-1, 1]) {
    const a = s * 0.95, c = Math.cos(a), sn = Math.sin(a), fx = h - 0.95, p = [fx, YC + (R + 0.02) * c, (R + 0.02) * sn];
    stamp(b, mats.iron, latheGeoC([[0, 0], [0.12, 0], [0.12, 0.04], [0.09, 0.06], [0.1, 0.2], [0.06, 0.26], [0.05, 0.36], [0, 0.37]]), M4(p[0], p[1], p[2], a, 0, 0));
    handwheel(b, mats.rust, p[0], p[1] + c * 0.38, p[2] + sn * 0.38, 0.12, [0, c, sn]);
    tubeBetween(b, mats.copper, [fx + 0.12, p[1] + c * 0.15, p[2] + sn * 0.15], [h + 0.25, p[1] + c * 0.15, p[2] + sn * 0.15], 0.04, { seg: 8 });
  }
  return { id: se ? 'shellSE' : 'shellDE', parts: b.parts() };
}
function latheGeoC(prof, seg = 16) {
  return gcache('LC' + seg + JSON.stringify(prof), () => { const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(Math.max(r, 1e-4), y)), seg); g.computeVertexNormals(); return g; });
}

// ------------------------------------------------------------------------------------------------ end template

/** cast fire door in its own frame: hinge axis at origin (vertical), door extends towards +z, front faces +x */
function fireDoor(b, m) {
  const P = (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(m).toArray();
  const add = (mat, geo, x, y, z, rx = 0, ry = 0, rz = 0) => stamp(b, mat, geo, new THREE.Matrix4().multiplyMatrices(m, M4(x, y, z, rx, ry, rz)));
  add(mats.iron, BX(0.05, 0.38, 0.46), 0.025, 0, 0.25);
  for (const [sy, sz, y, z] of [[0.04, 0.46, 0.17, 0.25], [0.04, 0.46, -0.17, 0.25], [0.3, 0.04, 0, 0.04], [0.3, 0.04, 0, 0.46]]) add(mats.iron, BX(0.025, sy, sz), 0.062, y, z);
  // air slide with slots and knob
  add(mats.steelDark, BX(0.012, 0.1, 0.3), 0.056, 0.06, 0.25);
  for (let k = 0; k < 6; k++) add(mats.fire, BX(0.004, 0.06, 0.016), 0.063, 0.06, 0.13 + k * 0.048);
  add(mats.brass, CYL(0.014, 0.014, 0.04, 6), 0.08, 0.06, 0.4, 0, 0, Math.PI / 2);
  add(mats.iron, CYL(0.035, 0.035, 0.01, 8), 0.056, -0.08, 0.25, 0, 0, Math.PI / 2); // peep hole cover
  // hinges (straps + knuckles) and latch handle
  for (const y of [-0.12, 0.12]) { add(mats.iron, BX(0.015, 0.05, 0.22), 0.062, y, 0.1); add(mats.iron, CYL(0.028, 0.028, 0.07, 8), 0.0, y, 0); }
  add(mats.iron, BX(0.03, 0.03, 0.16), 0.09, -0.01, 0.47, 0, 0.15, 0);
  add(mats.brass, CYL(0.018, 0.018, 0.08, 6), 0.11, -0.01, 0.55, Math.PI / 2, 0, 0);
  void P;
}

function endTemplate(id, open, o = {}) {
  const b = new TBatch(), n = [1, 0, 0];
  endPlate(b, 0, 1, true);
  // stay nuts over the free areas of the end plate
  for (let z = -2.25; z <= 2.26; z += 0.3) for (let y = 0.45; y < 5.0; y += 0.3) {
    const r = Math.hypot(z, y - YC);
    if (r > R - 0.2 || FZ.some((f) => Math.hypot(z - f, y - FY) < 0.72)) continue;
    if (y > 2.12 && Math.abs(z) < 1.95) continue;
    if (Math.abs(z) > 1.85 && y > 2.6 && y < 4.0) continue;
    nut(b, [dishT(r), y, z], n, 0.032);
  }
  // furnaces
  FZ.forEach((zf, i) => {
    const isOpen = open.includes(i);
    b.ring(mats.iron, [0.078, FY, zf], n, 0.555, 0.62, 20);
    // furnace front casting with the fire-door opening
    const cast = gcache('cast', () => {
      const s = new THREE.Shape(); s.absarc(0, 0, 0.56, 0, Math.PI * 2, false);
      const hpath = new THREE.Path(); hpath.moveTo(-0.22, -0.07); hpath.lineTo(-0.22, 0.27); hpath.lineTo(0.22, 0.27); hpath.lineTo(0.22, -0.07); hpath.lineTo(-0.22, -0.07); s.holes.push(hpath);
      const g = new THREE.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: false, curveSegments: 20 }); g.rotateY(Math.PI / 2); return g;
    });
    stamp(b, mats.iron, cast, M4(0.04, FY, zf));
    for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2 + 0.3; nut(b, [0.1, FY + Math.sin(a) * 0.49, zf + Math.cos(a) * 0.49], n, 0.02); }
    box(b, mats.iron, 0.12, 0.03, 0.5, 0.15, FY - 0.09, zf);                       // dead plate lip
    // ash-pit door with air slide
    box(b, mats.iron, 0.03, 0.2, 0.52, 0.115, FY - 0.32, zf);
    box(b, mats.steelDark, 0.01, 0.08, 0.36, 0.135, FY - 0.32, zf);
    for (let k = 0; k < 5; k++) box(b, mats.iron, 0.004, 0.06, 0.02, 0.141, FY - 0.32, zf - 0.13 + k * 0.065);
    box(b, mats.brass, 0.05, 0.025, 0.025, 0.155, FY - 0.32, zf + 0.22);
    const hinge = new THREE.Vector3(0.105, FY + 0.1, zf - 0.24);
    if (isOpen) {
      fireDoor(b, M4(hinge.x, hinge.y, hinge.z, 0, 1.85, 0));
      // corrugated furnace tube seen through the door (inward faces), fire bed, lumps, flames, back glow
      latheAt(b, mats.rust, [[0.5, 0.06], [0.5, -1.15]], 'x', [0, FY, zf], 16);
      for (let k = 0; k < 5; k++) stamp(b, mats.rust, TOR(0.49, 0.028, 16, 4), M4(-0.12 - k * 0.2, FY, zf, 0, Math.PI / 2, 0));
      stamp(b, mats.fire, gcache('bed', () => new THREE.SphereGeometry(1, 10, 6)), M4(-0.6, FY - 0.2, zf, 0, 0, 0, 0.6, 0.16, 0.4));
      const r = rnd(i * 31 + id.length * 7);
      for (let k = 0; k < 9; k++) stamp(b, mats.fire, LUMP[k % 3], M4(-0.15 - r() * 0.9, FY - 0.06 + r() * 0.05, zf + (r() - 0.5) * 0.6, r() * 3, r() * 3, 0, 0.035 + r() * 0.03));
      for (let k = 0; k < 5; k++) {
        const fx = -0.25 - r() * 0.7, fz = zf + (r() - 0.5) * 0.45, hh = 0.2 + r() * 0.18;
        stamp(b, mats.fire, gcache('flame', () => { const g = new THREE.ConeGeometry(0.07, 1, 5, 1); g.translate(0, 0.5, 0); return g; }), M4(fx, FY - 0.08, fz, (r() - 0.5) * 0.4, r() * 3, 0.35 + r() * 0.3, 1, hh, 1));
      }
      b.disc(mats.fire, [-1.14, FY, zf], n, 0.53, 16);
    } else {
      fireDoor(b, M4(hinge.x, hinge.y, hinge.z));
      box(b, mats.fire, 0.004, 0.012, 0.36, 0.111, FY - 0.075, zf); // glow under the door
    }
  });
  // smokebox: casing, three doors with strap hinges and dogs (variant: middle door open, tube plate visible)
  const { x1: sx1, y0: sy0, y1: sy1, hw } = SB, ym = (sy0 + sy1) / 2;
  b.box(mats.steelDark, 0, sy0, -hw, sx1, sy1, hw, 'XzZyY');
  b.box(mats.iron, sx1, sy0 - 0.04, -hw - 0.04, sx1 + 0.05, sy0 + 0.06, hw + 0.04);
  rivetLine(b, [sx1 + 0.05, sy0 + 0.01, -hw + 0.05], [sx1 + 0.05, sy0 + 0.01, hw - 0.05], n, 0.12);
  [-1.17, 0, 1.17].forEach((dz, k) => {
    const za = dz - 0.55, dm = M4(sx1 + 0.005, sy0 + 0.15, za);
    const openD = o.smoke && k === 1;
    const m = openD ? new THREE.Matrix4().multiplyMatrices(dm, M4(0, 0, 0, 0, 1.9, 0)) : dm;
    const D = (mat, sx, sy, sz, x, y, z) => stamp(b, mat, BX(sx, sy, sz), new THREE.Matrix4().multiplyMatrices(m, M4(x, y, z)));
    D(mats.steelDark, 0.03, 2.05, 1.08, 0.015, 1.025, 0.56);
    for (const y of [0.05, 2.0]) D(mats.iron, 0.02, 0.06, 1.08, 0.04, y, 0.56);
    for (const y of [0.3, 1.02, 1.75]) { D(mats.iron, 0.02, 0.07, 0.62, 0.045, y, 0.3); D(mats.iron, 0.06, 0.12, 0.06, 0.02, y, 0.0); }
    for (const y of [0.55, 1.5]) { D(mats.iron, 0.05, 0.08, 0.1, 0.05, y, 1.04); D(mats.brass, 0.1, 0.025, 0.025, 0.09, y, 1.04); }
    if (openD) {
      // tube plate with the tube ends of the middle nest
      b.box(mats.iron, 0.04, sy0 + 0.1, dz - 0.52, 0.06, sy1 - 0.1, dz + 0.52, 'X');
      for (let iz = 0; iz < 7; iz++) for (let iy = 0; iy < 11; iy++) b.disc(mats.rubber, [0.062, sy0 + 0.25 + iy * 0.19, dz - 0.42 + iz * 0.14], n, 0.045, 6);
    }
  });
  b.box(mats.brass, sx1 + 0.03, sy0 + 0.3, -1.55, sx1 + 0.04, sy0 + 0.5, -1.0, 'X');   // maker's plate
  // uptake hood, vertical uptake with riveted bands, slanted part to the breeching, damper quadrant
  b.poly(mats.steelDark, [[sx1, sy1, -hw], [sx1, sy1, hw], [sx1, 5.15, 1.3], [sx1, 5.15, -1.3]], n);
  for (const s of [-1, 1]) b.poly(mats.steelDark, [[0, sy1, s * hw], [sx1, sy1, s * hw], [sx1, 5.15, s * 1.3], [0, 5.15, s * 1.3]], [0, 0.77, s * 0.64]);
  b.box(mats.steelDark, 0, 5.15, -1.3, sx1, 6.4, 1.3, 'XzZx');
  for (const y of [5.15, 5.8, 6.4]) {
    b.box(mats.iron, -0.02, y - 0.04, -1.34, sx1 + 0.04, y + 0.04, 1.34, 'XzZ');
    rivetLine(b, [sx1 + 0.04, y, -1.25], [sx1 + 0.04, y, 1.25], n, 0.12, mats.iron);
  }
  const hi = [[-1.55, 7.45], [-0.85, 7.45]];
  for (const s of [-1, 1]) b.poly(mats.steelDark, [[0, 6.4, s * 1.3], [sx1, 6.4, s * 1.3], [hi[1][0], 7.45, s * 1.3], [hi[0][0], 7.45, s * 1.3]], [0, 0, s]);
  b.poly(mats.steelDark, [[sx1, 6.4, -1.3], [sx1, 6.4, 1.3], [hi[1][0], 7.45, 1.3], [hi[1][0], 7.45, -1.3]], [0.56, 0.83, 0]);
  b.poly(mats.steelDark, [[0, 6.4, -1.3], [0, 6.4, 1.3], [hi[0][0], 7.45, 1.3], [hi[0][0], 7.45, -1.3]], [-0.56, -0.83, 0]);
  box(b, mats.iron, 0.03, 0.3, 0.3, sx1 + 0.02, 5.5, 1.0); box(b, mats.iron, 0.03, 0.42, 0.04, sx1 + 0.05, 5.42, 1.0, 0.5, 0, 0);
  // pressure gauge on the smokebox front with siphon
  b.ring(mats.brass, [sx1 + 0.07, 4.53, 0], n, 0.165, 0.2, 20);
  tube(b, mats.brass, 'x', [4.53, 0], 0.2, sx1, sx1 + 0.065, { seg: 20, caps: false });
  b.disc(kitMats.gaugeFace, [sx1 + 0.072, 4.53, 0], n, 0.165, 20, true);
  tube(b, mats.copper, 'y', [sx1 + 0.03, 0.26], 0.012, 4.55, 4.85, { seg: 5, caps: false });
  // water-gauge glasses with brass cocks, guard rods, drain cock and pipe
  for (const s of [-1, 1]) {
    const z = s * 2.03;
    for (const y of [3.0, 3.75]) { box(b, mats.iron, 0.08, 0.12, 0.12, 0.08, y, z); box(b, mats.brass, 0.1, 0.11, 0.09, 0.17, y, z); box(b, mats.brass, 0.025, 0.025, 0.14, 0.21, y + (y > 3.2 ? 0.07 : -0.07), z + s * 0.05, 0, 0, 0); }
    tube(b, kitMats.portGlass, 'y', [0.17, z], 0.022, 3.06, 3.69, { seg: 8, caps: false });
    for (const dz of [-0.04, 0.04]) tube(b, mats.brass, 'y', [0.2, z + dz], 0.006, 3.06, 3.69, { seg: 4, caps: false });
    box(b, mats.brass, 0.07, 0.08, 0.06, 0.17, 2.88, z); box(b, mats.brass, 0.02, 0.02, 0.12, 0.2, 2.88, z - s * 0.05);
    tube(b, mats.copper, 'y', [0.17, z], 0.01, 2.2, 2.84, { seg: 5, caps: false });
  }
  // ash, clinker and a fire rake left in front of the furnaces
  if (o.ash) {
    const r = rnd(id.length * 13 + 5);
    for (const zf of [FZ[0], FZ[2]]) {
      stamp(b, mats.paintGrey, gcache('ash', () => new THREE.SphereGeometry(1, 9, 4, 0, Math.PI * 2, 0, Math.PI / 2)), M4(0.75, 0, zf + 0.1, 0, r(), 0, 0.38, 0.11, 0.3));
      for (let k = 0; k < 5; k++) stamp(b, k % 2 ? mats.rust : mats.iron, LUMP[k % 3], M4(0.55 + r() * 0.5, 0.03, zf + (r() - 0.5) * 0.6, r() * 3, r() * 3, 0, 0.04 + r() * 0.03, 0.03, 0.05));
    }
  }
  return { id, parts: b.parts() };
}

// ------------------------------------------------------------------------------------------------ stokehold templates

/** shovel standing upright against a wall (blade on the floor, origin on the floor) */
function shovelTemplate() {
  const b = new TBatch();
  box(b, mats.steelDark, 0.012, 0.36, 0.28, 0, 0.18, 0, 0, 0, -0.12);
  for (const s of [-1, 1]) box(b, mats.steelDark, 0.06, 0.34, 0.01, 0.02, 0.18, s * 0.14, 0, 0, -0.12);
  tube(b, mats.oak, 'y', [-0.03, 0], 0.02, 0.33, 1.25, { seg: 6, caps: false });
  stamp(b, mats.oak, TOR(0.06, 0.012, 8, 4, Math.PI), M4(-0.03, 1.25, 0));
  box(b, mats.oak, 0.024, 0.024, 0.12, -0.03, 1.31, 0);
  return { id: 'shovel', parts: b.parts() };
}
/** rack on a bunker face (front +x, along z ±1.5): slice bars, rakes and prickers lying on brackets */
function toolRackTemplate() {
  const b = new TBatch();
  for (const z of [-1.3, 0, 1.3]) for (const y of [1.85, 2.3]) { box(b, mats.iron, 0.2, 0.03, 0.03, 0.1, y, z); box(b, mats.iron, 0.03, 0.08, 0.03, 0.19, y + 0.04, z); box(b, mats.iron, 0.04, 0.16, 0.04, 0.01, y, z); }
  const tools = [[0.08, 1.88, 0], [0.14, 1.88, 1], [0.08, 2.33, 2], [0.14, 2.33, 0]];
  for (const [x, y, k] of tools) {
    tube(b, mats.iron, 'z', [x, y + 0.016], 0.016, -1.6, 1.6, { seg: 6, caps: false });
    if (k === 0) { box(b, mats.iron, 0.012, 0.05, 0.22, x, y + 0.016, 1.7); stamp(b, mats.iron, TOR(0.06, 0.012, 10, 4), M4(x, y + 0.016, -1.66, 0, Math.PI / 2, 0)); }
    else if (k === 1) { box(b, mats.iron, 0.03, 0.2, 0.03, x, y - 0.06, 1.6); box(b, mats.iron, 0.03, 0.04, 0.3, x, y - 0.16, 1.6, 0, Math.PI / 2, 0); }
    else { box(b, mats.iron, 0.02, 0.12, 0.02, x, y - 0.04, 1.62); }
  }
  return { id: 'toolRack', parts: b.parts() };
}
/** See's ash ejector: hopper with hinged lid on a pedestal, valve, discharge pipe up to the ship's side (front +x) */
function ashEjectorTemplate() {
  const b = new TBatch();
  box(b, mats.iron, 0.5, 0.4, 0.5, 0, 0.2, 0);
  stamp(b, mats.steelDark, gcache('hop', () => { const g = new THREE.CylinderGeometry(0.5, 0.25, 0.55, 4, 1, true); g.rotateY(Math.PI / 4); return g; }), M4(0, 0.67, 0));
  b.box(mats.iron, -0.36, 0.93, -0.36, 0.36, 0.97, 0.36, 'yYzZxX');
  box(b, mats.steelDark, 0.7, 0.03, 0.7, -0.38, 1.25, 0, 0, 0, 1.2);
  latheAt(b, mats.iron, [[0, 0], [0.12, 0], [0.12, 0.3], [0, 0.32]], 'x', [0.2, 0.25, 0], 10);
  handwheel(b, mats.rust, 0.42, 0.25, 0, 0.13, [1, 0, 0]);
  tube(b, mats.steelDark, 'y', [-0.3, 0], 0.09, 0.25, 3.4, { seg: 10, caps: false });
  tubeBetween(b, mats.steelDark, [0, 0.25, 0], [-0.3, 0.25, 0], 0.09, { seg: 10, caps: false });
  for (const y of [1.2, 2.3, 3.3]) flange(b, [-0.3, y, 0], [0, 1, 0], 0.14);
  return { id: 'ashEjector', parts: b.parts() };
}
/** cluster of loose coal lumps (origin floor centre, ~1.2 × 0.8 m) */
function lumpsTemplate(seed) {
  const b = new TBatch(), r = rnd(seed);
  for (let k = 0; k < 38; k++) {
    const x = (r() - 0.5) * 0.9, z = (r() - 0.5) * 1.3, s = 0.025 + r() ** 2 * 0.07;
    stamp(b, mats.coal, LUMP[k % 3], M4(x, s * 0.55, z, r() * 6, r() * 6, r() * 6, s * (0.8 + r() * 0.5), s * (0.6 + r() * 0.4), s * (0.8 + r() * 0.5)));
  }
  return { id: 'lumps' + seed, parts: b.parts() };
}

let T = null;
function templates() {
  if (T) return T;
  T = {
    shellDE: shellTemplate(LDE, false), shellSE: shellTemplate(LSE, true),
    ends: [endTemplate('end0', []), endTemplate('end1', [1], { ash: true }), endTemplate('end2', [0]), endTemplate('end3', [0, 2], { ash: true, smoke: true })],
    shovel: shovelTemplate(), rack: toolRackTemplate(), ejector: ashEjectorTemplate(), lumps: [lumpsTemplate(3), lumpsTemplate(7), lumpsTemplate(11)],
  };
  return T;
}

// ------------------------------------------------------------------------------------------------ build

/**
 * Builds all six boiler rooms into batch `b` (static geometry) and instancer `inst`.
 */
export function buildBoilerRooms(world, b, inst) {
  const t = templates();
  let endNo = 0;
  const glow = (x, z, dir) => world.addLamp({ x: x + dir * 1.1, y: Y + 1.3, z, color: 0xff7a30, intensity: 0.9 });

  for (const r of BOILER_ROOMS) {
    const zs = boilerZs(r.cnt), zo = zs[zs.length - 1], E = boilerEnds(r);
    const len = r.de ? LDE : LSE;
    // ---- boilers
    for (const z of zs) {
      inst.add(r.de ? t.shellDE : t.shellSE, r.xc, Y, z, 0);
      world.addCollider(r.xc - len / 2, Y, z - R, r.xc + len / 2, Y + YC + R, z + R);
      const ends = r.de ? [[E.fwd, 0], [E.aft, Math.PI]] : [[E.fwd, 0]];
      for (const [x, rot] of ends) {
        const v = (endNo * 7 + r.n * 3) % 5, k = v === 0 || v === 3 ? 0 : v === 1 ? 1 : v === 2 ? 2 : 3;
        endNo++;
        inst.add(t.ends[k], x, Y, z, rot);
        const dir = rot ? -1 : 1;
        world.addCollider(Math.min(x, x + dir * 0.8), Y + 2.2, z - 2.0, Math.max(x, x + dir * 0.8), Y + 6.4, z + 2.0); // smokebox (high)
        if (k) for (const fi of k === 1 ? [1] : k === 2 ? [0] : [0, 2]) glow(x, z + FZ[fi] * (rot ? -1 : 1), dir);
      }
    }
    // ---- breeching (collecting flue) over the boiler row with flanged, riveted sections; trunk to the funnel casing
    const cx0 = r.de ? r.xc - 1.9 : r.xc - 0.9, cx1 = r.de ? r.xc + 1.9 : r.xc + 1.3;
    const cz = zo + 1.6, cy0 = Y + 7.2, cy1 = Y + 9.2;
    b.box(mats.steelDark, cx0, cy0, -cz, cx1, cy1, cz);
    for (let x = cx0 + 0.6; x < cx1 - 0.3; x += 1.2) {
      b.box(mats.iron, x - 0.04, cy0 - 0.03, -cz - 0.04, x + 0.04, cy1 + 0.03, cz + 0.04, 'xXyzZ');
      for (const s of [-1, 1]) rivetLine(b, [x + s * 0.07, cy0 + 0.1, -cz - 0.002], [x + s * 0.07, cy1 - 0.1, -cz - 0.002], [0, 0, -1], 0.14);
      for (const s of [-1, 1]) rivetLine(b, [x + s * 0.07, cy0 + 0.1, cz + 0.002], [x + s * 0.07, cy1 - 0.1, cz + 0.002], [0, 0, 1], 0.14);
      for (const s of [-1, 1]) rivetLine(b, [x + s * 0.07, cy0 - 0.002, -cz + 0.1], [x + s * 0.07, cy0 - 0.002, cz - 0.1], [0, -1, 0], 0.16);
    }
    for (const zz of [-cz, cz]) for (let k = 0; k < Math.max(1, Math.floor(r.cnt / 2)); k++) { // cleaning doors
      const dz = Math.sign(zz) * 0.02, xd = r.xc + (k - 0.5) * 1.2;
      b.box(mats.iron, xd - 0.3, cy0 + 0.5, zz, xd + 0.3, cy0 + 1.1, zz + dz);
      for (const y of [cy0 + 0.6, cy0 + 1.0]) b.box(mats.brass, xd + 0.22, y - 0.02, zz + dz, xd + 0.28, y + 0.02, zz + 3 * dz);
    }
    const tr = r.trunk;
    if (tr.to === r.xc) b.box(mats.steelDark, cx0 + 0.3, cy1, -2.8, cx1 - 0.3, CEIL, 2.8, 'xXzZ');
    else {
      const xa = Math.min(r.xc, tr.to), xb = Math.max(r.xc, tr.to), ty0 = Y + 8.0;
      b.box(mats.steelDark, xa, ty0, tr.z0, xb, CEIL, tr.z1, 'xXyzZ');
      for (let x = xa + 1; x < xb - 0.2; x += 2.0) b.box(mats.iron, x - 0.04, ty0 - 0.03, tr.z0 - 0.03, x + 0.04, CEIL, tr.z1 + 0.03, 'xXyzZ');
    }
    // ---- steam: lagged header under the breeching (fed by the branches of the boilers), lagged pipes to the mains
    const hx = r.xc + HX, hy = Y + HEADER;
    lagged(b, [hx, hy, -zo - 0.4], [hx, hy, zo + 0.4], 0.2, 0.6);
    for (const z of zs) flange(b, [hx, hy, z + 0.6], [0, 0, 1], 0.26);
    for (const s of [-1, 1]) {
      const zm = s * mainZ(hx), zr = s * Math.min(zo + 2.0, Math.abs(zm) - 0.3);
      lagged(b, [hx, hy, s * (zo + 0.4)], [hx, hy, zr], 0.2, 0.6);
      lagged(b, [hx, hy, zr], [hx, MAIN_Y, zr], 0.2, 0.6);
      lagged(b, [hx, MAIN_Y, zr], [hx, MAIN_Y, zm], 0.2, 0.6);
      for (const p of [[hx, hy, zr], [hx, MAIN_Y, zr]]) latheAt(b, mats.iron, [[0.21, -0.25], [0.24, -0.22], [0.24, 0.22], [0.21, 0.25]], 'y', p, 12);
    }
    // ---- feed main across each stokehold with drops to the boiler fronts
    // ---- bunkers
    buildBunkers(world, b, r, zo, E, t, inst);
    // ---- stokehold furniture, lamps, ladders, vents, telegraphs
    stokeholds(world, b, r, zo, E, t, inst);
  }
  // ---- lagged steam mains along both sides (from boiler room 6 to the engine room bulkhead), banded, with hangers
  for (const s of [-1, 1]) {
    const pts = [];
    for (let x = 64.4; x > -22; x -= 3) pts.push([x, MAIN_Y, s * mainZ(x)]);
    pts.push([-22, MAIN_Y, s * mainZ(-22)]);
    for (let i = 0; i < pts.length - 1; i++) lagged(b, pts[i], pts[i + 1], 0.24, 0.75);
    for (const p of pts) {
      flange(b, p, [1, 0, 0], 0.32);
      for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; nut(b, [p[0] + 0.03, p[1] + Math.sin(a) * 0.28, p[2] + Math.cos(a) * 0.28], [1, 0, 0], 0.018); }
      b.box(mats.iron, p[0] - 0.03, p[1] + 0.24, p[2] - 0.03, p[0] + 0.03, CEIL, p[2] + 0.03, 'xXzZ'); // hanger rod
      b.box(mats.iron, p[0] - 0.05, p[1] - 0.29, p[2] - 0.3, p[0] + 0.05, p[1] - 0.25, p[2] + 0.3);   // stirrup
      for (const zz of [-0.28, 0.28]) b.box(mats.iron, p[0] - 0.02, p[1] - 0.27, p[2] + zz - 0.02, p[0] + 0.02, p[1] + 0.3, p[2] + zz + 0.02, 'xXzZ');
    }
  }
}

/** z of the steam main at station x (close to the ship's side) */
export function mainZ(x) { return Math.min(12.6, hullIn(x, MAIN_Y) - 0.7); }

function buildBunkers(world, b, r, zo, E, t, inst) {
  const parts = [];
  parts.push({ x0: r.x1 - BUNKER, x1: r.x1, face: -1 });
  if (r.de) parts.push({ x0: r.x0, x1: r.x0 + BUNKER, face: 1, stbdOnly: !!r.stairAft });
  for (const p of parts) {
    for (const s of [-1, 1]) {
      if (p.stbdOnly && s < 0) continue;
      const hw = Math.min(floorHW(p.x0), floorHW(p.x1));
      const za = 1.0, zb = hw;
      const z0 = s < 0 ? -zb : za, z1 = s < 0 ? -za : zb;
      bunkerBox(world, b, p.x0, p.x1, z0, z1, p.face, s, r, inst, t);
    }
    // wing bunkers along the ship's sides in the stokehold corners
    const end = p.face < 0 ? E.fwd : E.aft;
    const wa = p.face < 0 ? end + 1.9 : p.x1, wb = p.face < 0 ? p.x0 : end - 1.9;
    if (wb - wa > 0.6) {
      for (const s of [-1, 1]) {
        if (p.stbdOnly && s < 0) continue;
        const zw = zo + R + 0.3, hw = Math.min(floorHW(wa), floorHW(wb));
        if (hw - zw < 0.5) continue;
        const z0 = s < 0 ? -hw : zw, z1 = s < 0 ? -zw : hw;
        b.box(mats.steel, wa, Y, z0, wb, BTOP, z1, (s < 0 ? 'Z' : 'z') + (p.face < 0 ? 'x' : 'X') + 'Y');
        world.addCollider(wa, Y, z0, wb, BTOP, z1);
        b.box(mats.iron, wa, BTOP - 0.1, s < 0 ? -zw - 0.04 : zw - 0.04, wb, BTOP, s < 0 ? -zw + 0.04 : zw + 0.04);
        for (let y = Y + 1.2; y < BTOP - 0.3; y += 1.6) rivetLine(b, [wa + 0.05, y, s < 0 ? -zw - 0.003 : zw + 0.003], [wb - 0.05, y, s < 0 ? -zw - 0.003 : zw + 0.003], [0, 0, -s], 0.12, mats.steel);
      }
    }
  }
  if (r.stairAft) { // small port wing bunker beside the access stair (outboard of its upper landing)
    const xa = r.x0 + 0.05, xb = r.x0 + 2.4, hw = floorHW(xa);
    b.box(mats.steel, xa, Y, -hw, xb, BTOP, -10.6, 'XZY');
    world.addCollider(xa, Y, -hw, xb, BTOP, -10.6);
  }
}

function bunkerBox(world, b, x0, x1, z0, z1, face, s, r, inst, t) {
  const xf = face > 0 ? x1 : x0; // stokehold face
  b.box(mats.steel, x0, Y, z0, x1, BTOP, z1, (face > 0 ? 'X' : 'x') + (s > 0 ? 'z' : 'Z') + 'Y');
  world.addCollider(x0, Y, z0, x1, BTOP, z1);
  // bulb-angle stiffeners with rivets, plate seams, top angle
  for (let z = z0 + 0.6; z < z1 - 0.3; z += 1.2) {
    b.box(mats.steelDark, xf, Y, z - 0.04, xf + face * 0.07, BTOP, z + 0.04, (face > 0 ? 'X' : 'x') + 'zZ');
    b.box(mats.steelDark, xf + face * 0.07, Y, z - 0.03, xf + face * 0.1, BTOP, z + 0.03, (face > 0 ? 'X' : 'x') + 'zZ');
  }
  for (const y of [Y + 2.45, Y + 5.0]) rivetLine(b, [xf + face * 0.003, y, z0 + 0.1], [xf + face * 0.003, y, z1 - 0.1], [face, 0, 0], 0.11, mats.steel);
  b.box(mats.iron, Math.min(xf, xf + face * 0.08), BTOP - 0.12, z0, Math.max(xf, xf + face * 0.08), BTOP, z1);
  // bunker doors (sliding coal doors at floor level) with chutes; some raised with coal spilling out
  const doorZs = [s * 2.6, s * 6.4, s * 10.2].filter((z) => z - 0.5 > z0 + 0.05 && z + 0.5 < z1 - 0.05);
  const zone = world.zone(DECK, xf);
  doorZs.forEach((z, i) => {
    const open = (r.n + i + (s > 0 ? 1 : 0)) % 3 !== 0;
    const xo = xf + face * 0.02;
    // guides and frame
    for (const dz of [-0.5, 0.42]) b.box(mats.iron, Math.min(xf, xo + face * 0.06), Y, z + dz, Math.max(xf, xo + face * 0.06), Y + 2.1, z + dz + 0.08);
    b.box(mats.iron, Math.min(xf, xo + face * 0.06), Y + 0.95, z - 0.5, Math.max(xf, xo + face * 0.06), Y + 1.05, z + 0.5);
    b.box(mats.iron, Math.min(xf, xo + face * 0.08), Y + 2.1, z - 0.55, Math.max(xf, xo + face * 0.08), Y + 2.2, z + 0.55);
    if (open) {
      b.box(mats.coal, Math.min(xf, xo), Y, z - 0.42, Math.max(xf, xo), Y + 0.95, z + 0.42, face > 0 ? 'X' : 'x');
      b.box(mats.steelDark, Math.min(xo + face * 0.06, xo + face * 0.1), Y + 1.05, z - 0.46, Math.max(xo + face * 0.06, xo + face * 0.1), Y + 2.0, z + 0.46); // door raised
      // chute lip and cheeks
      const xc = xf + face * 0.5;
      b.poly(mats.steelDark, [[xf, Y + 0.32, z - 0.45], [xf, Y + 0.32, z + 0.45], [xc, Y + 0.08, z + 0.5], [xc, Y + 0.08, z - 0.5]], [face * 0.45, 0.9, 0]);
      for (const dz of [-0.48, 0.48]) for (const sg of [-1, 1]) b.poly(mats.steelDark, [[xf, Y + 0.32, z + dz], [xc, Y + 0.08, z + dz], [xc, Y + 0.3, z + dz], [xf, Y + 0.75, z + dz]], [0, 0, sg]);
      place(zone, coalPile({ w: 1.5, d: 1.1, h: 0.42 }), xf + face * 0.85, Y, z, face > 0 ? 0 : Math.PI);
      inst.add(t.lumps[(i + r.n) % 3], xf + face * 1.55, Y, z + 0.3, (i * 1.3 + r.n) % 6);
    } else {
      b.box(mats.steelDark, Math.min(xo + face * 0.06, xo + face * 0.1), Y + 0.04, z - 0.46, Math.max(xo + face * 0.06, xo + face * 0.1), Y + 0.98, z + 0.46);
      for (const y of [Y + 0.3, Y + 0.7]) b.box(mats.iron, Math.min(xo + face * 0.1, xo + face * 0.12), y, z - 0.44, Math.max(xo + face * 0.1, xo + face * 0.12), y + 0.05, z + 0.44);
    }
    b.box(mats.brass, Math.min(xo + face * 0.1, xo + face * 0.14), Y + 0.7, z - 0.04, Math.max(xo + face * 0.1, xo + face * 0.14), Y + 0.8, z + 0.04);
    // chain and hand wheel of the door gear
    tube(b, mats.iron, 'y', [xf + face * 0.14, z + 0.6], 0.012, Y + 1.0, Y + 2.15, { seg: 4, caps: false });
    handwheel(b, mats.rust, xf + face * 0.16, Y + 1.25, z + 0.6, 0.12, [face, 0, 0]);
  });
}

/** watertight door gearing on the +x face of a machinery bulkhead (door at z = 0, w = 1.0, h = 1.9) */
export function wtGear(world, b, x) {
  const e = x + 0.09, yt = Y + 1.9, top = yt + 0.15 + 1.9;
  // cross-head over the guides, rack on the door plate, gear box, vertical shaft to the deck above
  b.box(mats.steelDark, e, top, -0.72, e + 0.14, top + 0.2, 0.66);
  for (let y = yt + 0.25; y < top - 0.1; y += 0.07) b.box(mats.iron, e + 0.05, y, -0.04, e + 0.09, y + 0.035, 0.04);
  b.box(mats.iron, e + 0.04, yt + 0.2, -0.06, e + 0.05, top, 0.06);
  b.box(mats.steelDark, e, top + 0.2, -0.25, e + 0.3, top + 0.55, 0.25);
  tube(b, mats.iron, 'z', [e + 0.2, top + 0.38], 0.15, -0.3, -0.24, { seg: 14 });
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; b.box(mats.iron, e + 0.2 + Math.cos(a) * 0.155 - 0.012, top + 0.38 + Math.sin(a) * 0.155 - 0.012, -0.31, e + 0.2 + Math.cos(a) * 0.155 + 0.012, top + 0.38 + Math.sin(a) * 0.155 + 0.012, -0.23); }
  tube(b, mats.chrome, 'y', [e + 0.15, 0], 0.035, top + 0.55, CEIL, { seg: 8, caps: false });
  for (let y = top + 1.5; y < CEIL - 0.3; y += 1.8) b.box(mats.iron, e, y - 0.04, -0.06, e + 0.22, y + 0.04, 0.06);
  // hydraulic cataract cylinder with piston rod, release magnet, float box, instruction plate
  tube(b, mats.paintGrey, 'y', [e + 0.12, -0.95], 0.1, Y + 2.3, Y + 3.5, { seg: 12 });
  for (const y of [Y + 2.3, Y + 3.5]) tube(b, mats.iron, 'y', [e + 0.12, -0.95], 0.13, y - 0.03, y + 0.03, { seg: 12 });
  tube(b, mats.chrome, 'y', [e + 0.12, -0.95], 0.02, Y + 3.5, top + 0.1, { seg: 6, caps: false });
  b.box(mats.steelDark, e, Y + 2.7, 0.75, e + 0.18, Y + 3.15, 1.05);
  b.box(mats.brass, e + 0.18, Y + 2.85, 0.8, e + 0.19, Y + 3.0, 1.0, 'X');
  tube(b, mats.iron, 'y', [e + 0.09, 0.9], 0.025, Y + 3.15, CEIL, { seg: 6, caps: false });
  b.box(mats.paintGrey, e, Y + 0.12, 0.75, e + 0.3, Y + 0.45, 1.05);
  b.box(kitMats.notice, e + 0.001, Y + 1.5, 0.75, e + 0.003, Y + 1.8, 0.98, 'X');
}

function stokeholds(world, b, r, zo, E, t, inst) {
  const holds = [];
  holds.push({ xa: E.fwd + 0.75, xb: r.x1 - BUNKER, dir: 1, end: E.fwd });
  if (r.de) holds.push({ xa: r.x0 + (r.stairAft ? 2.45 : BUNKER), xb: E.aft - 0.75, dir: -1, end: E.aft });
  const zone = (x) => world.zone(DECK, x);
  holds.forEach((h, hi) => {
    const xm = (h.xa + h.xb) / 2, wallX = h.dir > 0 ? h.xb : h.xa; // bunker face
    const noPort = !!(r.stairAft && h.dir < 0);                        // access stair instead of a port bunker
    const ps = noPort ? 1 : -1;
    const rot = h.dir > 0 ? Math.PI : 0;                                // templates facing away from the bunker face
    // floor-plate seams of the stokehold
    for (let z = -zo - 1.8; z <= zo + 1.8; z += 1.22) b.box(mats.steelDark, h.xa, Y, z - 0.006, h.xb, Y + 0.004, z + 0.006, 'Y');
    // ash ejector against the bunker face, outboard
    const ez = ps * Math.min(zo + 1.2, floorHW(wallX) - 1.2);
    inst.add(t.ejector, wallX - h.dir * 0.32, Y, ez, rot);
    world.addCollider(wallX - h.dir * 0.75, Y, ez - 0.42, wallX - h.dir * 0.02, Y + 1.3, ez + 0.42);
    // shovels against the bunker face, tool racks with slice bars and rakes
    for (const z of [-7.5, -1.8, 3.9, 8.6]) {
      if (Math.abs(z) > zo + 1 || (noPort && z < 0) || Math.abs(z - ez) < 1.0) continue;
      inst.add(t.shovel, wallX - h.dir * 0.1, Y, z, rot);
      inst.add(t.shovel, wallX - h.dir * 0.1, Y, z + 0.34, rot + 0.25);
    }
    for (const z of [-4.6, 4.6]) if (!(noPort && z < 0) && Math.abs(z) < zo + 1.5) inst.add(t.rack, wallX - h.dir * 0.002, Y, z, rot);
    const wbz = ((r.n + hi) % 2 ? 1 : -1) * 4.4;
    place(zone(xm), wheelbarrow(), xm, Y, wbz, h.dir > 0 ? 0.4 : Math.PI - 0.4, { collide: true, world });
    const lr = rnd(r.n * 17 + hi * 5);
    for (const z of [-zo, 0.5, zo * 0.5].slice(0, r.n % 2 ? 3 : 2)) {
      place(zone(xm), coalPile({ w: 1.4, d: 0.9, h: 0.35 }), h.end + h.dir * 1.5, Y, z + 0.7, h.dir > 0 ? 0 : Math.PI);
      inst.add(t.lumps[Math.floor(lr() * 3)], h.end + h.dir * (1.05 + lr() * 0.3), Y, z + 0.7 + (lr() - 0.5) * 1.6, lr() * 6);
    }
    // water bucket
    tube(b, mats.steelDark, 'y', [xm + 0.4, -zo + 0.8], 0.17, Y, Y + 0.32, { seg: 10, caps: 'lo' });
    b.disc(kitMats.water, [xm + 0.4, Y + 0.28, -zo + 0.8], [0, 1, 0], 0.16, 10);
    stamp(b, mats.iron, TOR(0.16, 0.008, 8, 3, Math.PI), M4(xm + 0.4, Y + 0.32, -zo + 0.8, 0, 0.3, 0));
    // stoking indicator (dial in a cast case, red / green lamps, alarm bell, conduit) next to the watertight door
    const tx = wallX - h.dir * 0.12, tz = 1.6, n = [-h.dir, 0, 0];
    b.box(mats.steelDark, Math.min(tx, wallX), Y + 1.9, tz - 0.27, Math.max(tx, wallX), Y + 2.62, tz + 0.27);
    b.ring(mats.brass, [tx - h.dir * 0.004, Y + 2.3, tz], n, 0.19, 0.225, 20);
    b.disc(kitMats.gaugeFace, [tx - h.dir * 0.003, Y + 2.3, tz], n, 0.19, 20, true);
    for (const [m, dz] of [[mats.navRed, -0.14], [mats.navGreen, 0.14]]) { b.disc(m, [tx - h.dir * 0.03, Y + 2.68, tz + dz], n, 0.04, 8); tube(b, mats.brass, 'x', [Y + 2.68, tz + dz], 0.048, Math.min(tx, tx - h.dir * 0.03), Math.max(tx, tx - h.dir * 0.03), { seg: 8, caps: false }); }
    latheAt(b, mats.brass, [[0, 0], [0.09, 0], [0.08, 0.05], [0.05, 0.09], [0, 0.1]], h.dir > 0 ? '-x' : 'x', [tx, Y + 2.88, tz], 10);
    tube(b, mats.iron, 'y', [tx + h.dir * 0.03, tz + 0.2], 0.018, Y + 2.62, BTOP, { seg: 5, caps: false });
    // escape ladder up the bunker face to a grating platform with railing
    const lz = ps * (zo - 1.2);
    place(zone(wallX), ladder({ h: 7.4 }), wallX - h.dir * 0.08, Y, lz, h.dir > 0 ? Math.PI : 0);
    const gx0 = Math.min(wallX, wallX - h.dir * 0.9), gx1 = Math.max(wallX, wallX - h.dir * 0.9);
    b.box(gratingMat, gx0, BTOP - 0.03, lz - 0.6, gx1, BTOP - 0.028, lz + 0.6, 'Y');
    b.box(mats.steelDark, gx0, BTOP - 0.08, lz - 0.6, gx1, BTOP, lz + 0.6, 'xXzZ');
    const ex = wallX - h.dir * 0.9;
    for (const z of [lz - 0.6, lz + 0.6]) { b.post(mats.iron, ex, z, BTOP, BTOP + 0.95, 0.035); b.bar(mats.iron, [wallX, BTOP + 0.92, z], [ex, BTOP + 0.92, z], 0.035, 0.035); }
    b.bar(mats.iron, [ex, BTOP + 0.92, lz - 0.6], [ex, BTOP + 0.92, lz + 0.6], 0.035, 0.035);
    // ventilation trunk with bell mouth descending into the stokehold
    const vx = xm, vz = (hi % 2 ? 1 : -1) * Math.min(zo + 0.6, floorHW(xm) - 1.2);
    b.box(mats.paintWhite, vx - 0.45, Y + 5.2, vz - 0.45, vx + 0.45, CEIL, vz + 0.45, 'xXzZ');
    tubeBetween(b, mats.paintWhite, [vx, Y + 5.2, vz], [vx, Y + 4.6, vz], 0.5, { r1: 0.85, seg: 14, caps: false });
    tube(b, mats.iron, 'y', [vx, vz], 0.87, Y + 4.55, Y + 4.62, { seg: 14, caps: false });
    for (let y = Y + 5.6; y < CEIL - 0.2; y += 1.2) b.box(mats.iron, vx - 0.47, y, vz - 0.47, vx + 0.47, y + 0.05, vz + 0.47, 'xXzZ');
    // lamps: caged lamps on the bunker face + pendants over the stokehold
    for (const z of [-zo, -zo / 2, zo / 2, zo]) {
      const zz = z + (z > 0 ? -0.6 : 0.6);
      if (noPort && z < 0) cageLamp(b, world, wallX + 0.9, Y + 6.0, zz, { hang: CEIL, intensity: 0.9 });
      else cageLamp(b, world, wallX - h.dir * 0.25, Y + 3.6, zz, { dir: h.dir > 0 ? '-x' : '+x', intensity: 0.9 });
    }
    for (const z of [-zo * 0.75, 0, zo * 0.75]) cageLamp(b, world, xm, Y + 6.3, z + 0.3, { hang: CEIL, intensity: 1.1 });
    // pressure gauge board on the bunker face (boiler pressure, vacuum, feed)
    b.box(mats.woodDark, Math.min(wallX, wallX - h.dir * 0.03), Y + 2.05, ps * 2.05, Math.max(wallX, wallX - h.dir * 0.03), Y + 2.65, ps * 3.55);
    for (let i = 0; i < 3; i++) {
      const gz = ps * (2.3 + i * 0.5);
      b.ring(mats.brass, [wallX - h.dir * 0.05, Y + 2.35, gz], n, 0.13, 0.16, 16);
      tube(b, mats.brass, 'x', [Y + 2.35, gz], 0.16, Math.min(wallX - h.dir * 0.03, wallX - h.dir * 0.05), Math.max(wallX - h.dir * 0.03, wallX - h.dir * 0.05), { seg: 16, caps: false });
      b.disc(kitMats.gaugeFace, [wallX - h.dir * 0.052, Y + 2.35, gz], n, 0.13, 16, true);
      tube(b, mats.copper, 'y', [wallX - h.dir * 0.05, gz], 0.008, Y + 2.51, Y + 3.3, { seg: 4, caps: false });
    }
  });
  // lamps along the side walkways beside the boilers
  const E2 = boilerEnds(r);
  for (const s of [-1, 1]) cageLamp(b, world, (E2.fwd + E2.aft) / 2, Y + 3.2, s * (floorHW(r.xc) - 0.12), { dir: s > 0 ? '-z' : '+z', intensity: 0.7 });
}

export { handwheel, lagged, flange, BX, CYL, TOR, box as tbox, rnd, LUMP };
