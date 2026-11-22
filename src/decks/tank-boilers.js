// Tank top – boiler rooms 6 … 1: 24 double-ended and 5 single-ended Scotch boilers (InstancedMesh), furnaces with
// glowing fire doors, smokeboxes, uptakes, collecting flues and trunks to the funnel casings, bunkers with coal
// spilling from the bunker doors, stokehold gear, steam mains, ventilation trunks, telegraphs, lamps.
import { mats } from '../core/materials.js';
import { kitMats, coalPile, wheelbarrow, ladder, place } from '../interior/kit.js';
import {
  DECK, Y, CEIL, TBatch, Instancer, tube, tubeBetween, pipeRun, cageLamp, floorHW, hullIn,
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

// ------------------------------------------------------------------------------------------------ templates

function shellTemplate(len, se) {
  const b = new TBatch(), h = len / 2;
  tube(b, mats.steelDark, 'x', [YC, 0], R, -h, h, { seg: 28, caps: se ? 'lo' : false });
  for (const x of [-h + 0.06, -h / 3, h / 3, h - 0.06]) tube(b, mats.iron, 'x', [YC, 0], R + 0.025, x - 0.05, x + 0.05, { seg: 28, caps: false });
  b.box(mats.iron, -h, YC + R - 0.02, -0.08, h, YC + R + 0.03, 0.08, 'xXYzZ'); // longitudinal butt strap
  // cradles
  for (const x of se ? [-h + 0.5, h - 0.5] : [-h + 0.6, 0, h - 0.6]) {
    b.box(mats.iron, x - 0.18, 0, -1.9, x + 0.18, 0.9, 1.9, 'xXzZY');
    b.box(mats.iron, x - 0.25, 0, -2.1, x + 0.25, 0.12, 2.1, 'xXzZY');
  }
  // main stop valve with handwheel, branch pipe to the steam header above
  const top = YC + R;
  tube(b, mats.steelDark, 'y', [0, 0], 0.2, top - 0.1, top + 0.45, { seg: 10 });
  tube(b, mats.iron, 'y', [0, 0], 0.28, top + 0.45, top + 0.55, { seg: 10 });
  tube(b, mats.steelDark, 'y', [0, 0], 0.13, top + 0.55, HEADER - 0.1, { seg: 8, caps: false });
  b.box(mats.iron, -0.02, top + 0.55, -0.02, 0.02, top + 0.95, 0.02, 'xXzZ');
  b.ring(mats.rust, [0, top + 0.95, 0], [0, 1, 0], 0.24, 0.29, 10);
  // safety valves (twin) and manhole cover
  const sx = se ? 0.9 : 1.6;
  b.box(mats.steelDark, sx - 0.35, top - 0.1, -0.3, sx + 0.35, top + 0.35, 0.3);
  for (const z of [-0.15, 0.15]) tube(b, mats.brass, 'y', [sx, z], 0.09, top + 0.35, top + 0.75, { seg: 8 });
  tube(b, mats.steelDark, 'y', [sx, 0], 0.08, top + 0.35, top + 2.2, { seg: 6, caps: false }); // waste steam pipe
  b.box(mats.iron, -sx - 0.32, top - 0.05, -0.22, -sx + 0.32, top + 0.1, 0.22);
  for (const z of [-0.14, 0.14]) b.box(mats.brass, -sx - 0.05, top + 0.1, z - 0.03, -sx + 0.05, top + 0.16, z + 0.03);
  return { id: se ? 'shellSE' : 'shellDE', parts: b.parts() };
}

/** Boiler end facing +x (origin: centre of the front plate at floor level). open: indices of open fire doors. */
function endTemplate(id, open) {
  const b = new TBatch(), n = [1, 0, 0];
  b.disc(mats.steelDark, [0.006, YC, 0], n, R, 28);
  b.ring(mats.iron, [0.012, YC, 0], n, R - 0.1, R + 0.02, 28);
  // furnaces
  FZ.forEach((z, i) => {
    b.ring(mats.iron, [0.02, FY, z], n, 0.42, 0.57, 14);
    b.ring(mats.brass, [0.03, FY, z], n, 0.57, 0.6, 14);
    if (open.includes(i)) {
      tube(b, mats.iron, 'x', [FY, z], 0.42, -0.55, 0.02, { seg: 12, caps: false });
      b.disc(mats.fire, [-0.5, FY, z], n, 0.42, 12);
      b.box(mats.fire, -0.5, FY - 0.42, z - 0.3, 0.0, FY - 0.3, z + 0.3, 'Y'); // glowing fire bed
      b.box(mats.steelDark, 0.03, FY - 0.26, z - 0.36, 0.66, FY + 0.22, z - 0.3); // door swung open
      b.box(mats.brass, 0.5, FY - 0.03, z - 0.42, 0.6, FY + 0.03, z - 0.36);
    } else {
      b.box(mats.steelDark, 0.02, FY - 0.26, z - 0.32, 0.09, FY + 0.22, z + 0.32);
      b.box(mats.iron, 0.09, FY - 0.2, z - 0.25, 0.11, FY + 0.16, z + 0.25, 'XyYzZ');
      b.box(mats.fire, 0.111, FY - 0.17, z - 0.18, 0.113, FY - 0.13, z + 0.18, 'X'); // air slits glowing
      b.box(mats.brass, 0.11, FY - 0.02, z + 0.12, 0.17, FY + 0.03, z + 0.28);
    }
    // ash pit damper
    b.box(mats.iron, 0.02, 0.25, z - 0.36, 0.07, 0.68, z + 0.36);
    b.box(mats.brass, 0.07, 0.44, z - 0.08, 0.12, 0.48, z + 0.08);
  });
  // smokebox with two doors, hinges and dogs
  b.box(mats.steelDark, 0, 3.0, -1.95, 0.7, 5.2, 1.95, 'XyYzZ');
  for (const s of [-1, 1]) {
    b.box(mats.steel, 0.7, 3.15, s > 0 ? 0.04 : -1.82, 0.74, 5.05, s > 0 ? 1.82 : -0.04);
    for (const y of [3.45, 4.75]) b.box(mats.iron, 0.7, y, s * 1.82 - 0.06, 0.78, y + 0.14, s * 1.82 + 0.06);
    b.box(mats.brass, 0.74, 4.05, s * 0.12 - 0.03, 0.8, 4.15, s * 0.3);
  }
  b.box(mats.iron, 0.7, 2.98, -2.0, 0.78, 3.06, 2.0); // smokebox sill
  // uptake: vertical part + slanted part towards the collecting flue over the boiler
  b.box(mats.steelDark, 0, 5.2, -1.3, 0.7, 6.4, 1.3, 'XzZ');
  const lo = [[0, 6.4], [0.7, 6.4]], hi = [[-1.55, 7.45], [-0.85, 7.45]];
  for (const s of [-1, 1]) b.poly(mats.steelDark, [[lo[0][0], 6.4, s * 1.3], [lo[1][0], 6.4, s * 1.3], [hi[1][0], 7.45, s * 1.3], [hi[0][0], 7.45, s * 1.3]], [0, 0, s]);
  b.poly(mats.steelDark, [[0.7, 6.4, -1.3], [0.7, 6.4, 1.3], [-0.85, 7.45, 1.3], [-0.85, 7.45, -1.3]], [0.56, 0.83, 0]);
  b.box(mats.iron, 0.7, 5.75, -1.34, 0.76, 5.85, 1.34); // band
  // pressure gauge on the uptake front, water gauge glasses, feed check valves, maker's plate
  b.box(mats.iron, 0.7, 5.3, -0.05, 0.78, 5.45, 0.05);
  b.ring(mats.brass, [0.8, 5.62, 0], n, 0.17, 0.21, 14);
  b.disc(kitMats.gaugeFace, [0.795, 5.62, 0], n, 0.17, 14, true);
  for (const s of [-1, 1]) {
    const z = s * 2.12;
    b.box(mats.brass, 0.02, 2.2, z - 0.06, 0.16, 2.3, z + 0.06);
    b.box(mats.brass, 0.02, 2.92, z - 0.06, 0.16, 3.02, z + 0.06);
    tube(b, kitMats.portGlass, 'y', [0.1, z], 0.03, 2.3, 2.92, { seg: 6, caps: false });
    tube(b, mats.brass, 'y', [0.1, z + s * 0.06], 0.012, 2.3, 2.92, { seg: 4, caps: false });
    b.box(mats.brass, 0.02, 3.35, s * 2.0 - 0.1, 0.2, 3.5, s * 2.0 + 0.1);
  }
  b.box(mats.brass, 0.74, 4.5, -0.55, 0.75, 4.7, -0.2, 'X');
  return { id, parts: b.parts() };
}

/** small shovel standing upright (origin on the floor) */
function shovelTemplate() {
  const b = new TBatch();
  b.box(mats.steelDark, -0.02, 0.0, -0.14, 0.02, 0.38, 0.14);
  tube(b, mats.oak, 'y', [0, 0], 0.02, 0.38, 1.3, { seg: 5, caps: false });
  b.box(mats.oak, -0.02, 1.28, -0.08, 0.02, 1.34, 0.08);
  return { id: 'shovel', parts: b.parts() };
}
/** slice bar / rake leaning against a wall (lies in the x-y plane, foot at origin, leaning towards -x) */
function rakeTemplate() {
  const b = new TBatch();
  tubeBetween(b, mats.iron, [0, 0.05, 0], [-0.45, 2.3, 0], 0.018, { seg: 5, caps: false });
  b.box(mats.iron, -0.04, 0, -0.12, 0.04, 0.08, 0.12);
  return { id: 'rake', parts: b.parts() };
}

let T = null;
function templates() {
  if (T) return T;
  T = {
    shellDE: shellTemplate(LDE, false), shellSE: shellTemplate(LSE, true),
    ends: [endTemplate('end0', []), endTemplate('end1', [1]), endTemplate('end2', [0]), endTemplate('end3', [0, 2])],
    shovel: shovelTemplate(), rake: rakeTemplate(),
  };
  return T;
}

// ------------------------------------------------------------------------------------------------ build

/**
 * Builds all six boiler rooms into batch `b` (static geometry) and instancer `inst`.
 * Returns info for the main module (lamp count, room data).
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
        world.addCollider(Math.min(x, x + dir * 0.8), Y + 2.95, z - 2.0, Math.max(x, x + dir * 0.8), Y + 6.4, z + 2.0); // smokebox (high)
        if (k) glow(x, z + (k === 3 ? 0 : k === 1 ? 0 : -1.4) * (rot ? -1 : 1), dir);
      }
    }
    // ---- collecting flue over the boiler row and trunk to the funnel casing
    const cx0 = r.de ? r.xc - 1.9 : r.xc - 0.9, cx1 = r.de ? r.xc + 1.9 : r.xc + 1.3;
    const cz = zo + 1.6, cy0 = Y + 7.2, cy1 = Y + 9.2;
    b.box(mats.steelDark, cx0, cy0, -cz, cx1, cy1, cz);
    for (let x = cx0 + 0.6; x < cx1 - 0.3; x += 1.2) b.box(mats.iron, x - 0.04, cy0 - 0.02, -cz - 0.03, x + 0.04, cy1 + 0.02, cz + 0.03, 'xXyzZ');
    const tr = r.trunk;
    if (tr.to === r.xc) b.box(mats.steelDark, cx0 + 0.3, cy1, -2.8, cx1 - 0.3, CEIL, 2.8, 'xXzZ');
    else {
      const xa = Math.min(r.xc, tr.to), xb = Math.max(r.xc, tr.to), ty0 = Y + 8.0;
      b.box(mats.steelDark, xa, ty0, tr.z0, xb, CEIL, tr.z1, 'xXyzZ');
      for (let x = xa + 1; x < xb - 0.2; x += 2.0) b.box(mats.iron, x - 0.04, ty0 - 0.03, tr.z0 - 0.03, x + 0.04, CEIL, tr.z1 + 0.03, 'xXyzZ');
    }
    // ---- steam: header under the collecting flue, branches to the mains along the sides
    const hx = r.xc, hy = Y + HEADER;
    for (const s of [-1, 1]) {
      const zm = s * mainZ(hx), zr = s * Math.min(zo + 2.0, Math.abs(zm) - 0.3);
      pipeRun(b, mats.steelDark, [[hx, hy, 0], [hx, hy, zr], [hx, MAIN_Y, zr], [hx, MAIN_Y, zm]], 0.13, { seg: 8 });
    }
    // ---- bunkers
    buildBunkers(world, b, r, zo, E, t, inst);
    // ---- stokehold furniture, lamps, ladders, vents, telegraphs
    stokeholds(world, b, r, zo, E, t, inst);
  }
  // ---- steam mains along both sides (from boiler room 6 to the engine room bulkhead)
  for (const s of [-1, 1]) {
    const pts = [];
    for (let x = 64.4; x > -22; x -= 3) pts.push([x, MAIN_Y, s * mainZ(x)]);
    pts.push([-22, MAIN_Y, s * mainZ(-22)]);
    pipeRun(b, mats.paintWhite, pts, 0.24, { seg: 10, flange: mats.iron });
    for (const p of pts) b.box(mats.iron, p[0] - 0.05, p[1] + 0.24, p[2] - 0.05, p[0] + 0.05, CEIL, p[2] + 0.05, 'xXzZ'); // hangers
  }
}

/** z of the steam main at station x (close to the ship's side) */
export function mainZ(x) { return Math.min(12.6, hullIn(x, MAIN_Y) - 0.7); }

function buildBunkers(world, b, r, zo, E, t, inst) {
  const parts = [];
  // transverse bunkers at both ends of the room (stokehold face towards the boilers)
  if (r.de || true) parts.push({ x0: r.x1 - BUNKER, x1: r.x1, face: -1 });
  if (r.de) parts.push({ x0: r.x0, x1: r.x0 + BUNKER, face: 1, stbdOnly: !!r.stairAft });
  for (const p of parts) {
    for (const s of [-1, 1]) {
      if (p.stbdOnly && s < 0) continue;
      const hw = Math.min(floorHW(p.x0), floorHW(p.x1));
      const za = 1.0, zb = hw;
      const z0 = s < 0 ? -zb : za, z1 = s < 0 ? -za : zb;
      bunkerBox(world, b, p.x0, p.x1, z0, z1, p.face, s, r, inst);
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
      }
    }
  }
  if (r.stairAft) { // small port wing bunker beside the access stair (outboard of its upper landing)
    const xa = r.x0 + 0.05, xb = r.x0 + 2.4, hw = floorHW(xa);
    b.box(mats.steel, xa, Y, -hw, xb, BTOP, -10.6, 'XZY');
    world.addCollider(xa, Y, -hw, xb, BTOP, -10.6);
  }
}

function bunkerBox(world, b, x0, x1, z0, z1, face, s, r, inst) {
  const xf = face > 0 ? x1 : x0; // stokehold face
  b.box(mats.steel, x0, Y, z0, x1, BTOP, z1, (face > 0 ? 'X' : 'x') + (s > 0 ? 'z' : 'Z') + 'Y');
  world.addCollider(x0, Y, z0, x1, BTOP, z1);
  // stiffeners
  for (let z = z0 + 0.6; z < z1 - 0.3; z += 1.2) b.box(mats.steelDark, xf + face * 0.0, Y, z - 0.04, xf + face * 0.07, BTOP, z + 0.04, (face > 0 ? 'X' : 'x') + 'zZ');
  b.box(mats.iron, Math.min(xf, xf + face * 0.08), BTOP - 0.12, z0, Math.max(xf, xf + face * 0.08), BTOP, z1);
  // bunker doors (sliding coal doors at floor level), some open with coal spilling out
  const doorZs = [s * 2.6, s * 6.4, s * 10.2].filter((z) => z - 0.5 > z0 + 0.05 && z + 0.5 < z1 - 0.05);
  doorZs.forEach((z, i) => {
    const open = (r.n + i + (s > 0 ? 1 : 0)) % 3 !== 0;
    const xo = xf + face * 0.02;
    b.box(mats.iron, Math.min(xf, xo + face * 0.06), Y, z - 0.5, Math.max(xf, xo + face * 0.06), Y + 1.05, z - 0.42);
    b.box(mats.iron, Math.min(xf, xo + face * 0.06), Y, z + 0.42, Math.max(xf, xo + face * 0.06), Y + 1.05, z + 0.5);
    b.box(mats.iron, Math.min(xf, xo + face * 0.06), Y + 0.95, z - 0.5, Math.max(xf, xo + face * 0.06), Y + 1.05, z + 0.5);
    if (open) {
      b.box(mats.coal, Math.min(xf, xo), Y, z - 0.42, Math.max(xf, xo), Y + 0.95, z + 0.42, face > 0 ? 'X' : 'x');
      b.box(mats.steelDark, Math.min(xo + face * 0.06, xo + face * 0.1), Y + 1.05, z - 0.46, Math.max(xo + face * 0.06, xo + face * 0.1), Y + 2.0, z + 0.46); // door raised
      place(world.zone(DECK, xf), coalPile({ w: 1.5, d: 1.1, h: 0.42 }), xf + face * 0.6, Y, z, face > 0 ? 0 : Math.PI);
    } else {
      b.box(mats.steelDark, Math.min(xo + face * 0.06, xo + face * 0.1), Y + 0.04, z - 0.46, Math.max(xo + face * 0.06, xo + face * 0.1), Y + 0.98, z + 0.46);
    }
    b.box(mats.brass, Math.min(xo + face * 0.1, xo + face * 0.14), Y + 0.7, z - 0.04, Math.max(xo + face * 0.1, xo + face * 0.14), Y + 0.8, z + 0.04);
  });
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
    // shovels against the bunker face, rakes leaning, wheelbarrows, small coal heaps in front of the furnaces
    for (const z of [-7.5, -1.8, 3.9, 8.6]) {
      if (Math.abs(z) > zo + 1 || (noPort && z < 0)) continue;
      inst.add(t.shovel, wallX - h.dir * 0.12, Y, z, 0);
      inst.add(t.shovel, wallX - h.dir * 0.12, Y, z + 0.32, 0.3);
      inst.add(t.rake, wallX - h.dir * 0.5, Y, z + 0.8, h.dir > 0 ? Math.PI : 0);
    }
    const wbz = ((r.n + hi) % 2 ? 1 : -1) * 4.4;
    place(zone(xm), wheelbarrow(), xm, Y, wbz, h.dir > 0 ? 0.4 : Math.PI - 0.4, { collide: true, world });
    for (const z of [-zo, 0.5, zo * 0.5].slice(0, r.n % 2 ? 3 : 2)) {
      place(zone(xm), coalPile({ w: 1.4, d: 0.9, h: 0.35 }), h.end + h.dir * 1.5, Y, z + 0.7, h.dir > 0 ? 0 : Math.PI);
    }
    // water bucket + ash heap
    tube(b, mats.steelDark, 'y', [xm + 0.4, -zo + 0.8], 0.17, Y, Y + 0.32, { seg: 8, caps: 'lo' });
    b.disc(kitMats.water, [xm + 0.4, Y + 0.28, -zo + 0.8], [0, 1, 0], 0.16, 8);
    // stokehold telegraph (indicator for the firemen) on the bunker face next to the watertight door
    const tx = wallX - h.dir * 0.08, tz = 1.6;
    b.box(mats.steelDark, Math.min(tx, wallX), Y + 1.9, tz - 0.25, Math.max(tx, wallX), Y + 2.6, tz + 0.25);
    b.disc(kitMats.gaugeFace, [tx - h.dir * 0.005, Y + 2.3, tz], [-h.dir, 0, 0], 0.2, 14, true);
    b.box(mats.navRed, Math.min(tx, tx - h.dir * 0.05), Y + 2.65, tz - 0.18, Math.max(tx, tx - h.dir * 0.05), Y + 2.73, tz - 0.1);
    b.box(mats.navGreen, Math.min(tx, tx - h.dir * 0.05), Y + 2.65, tz + 0.1, Math.max(tx, tx - h.dir * 0.05), Y + 2.73, tz + 0.18);
    b.box(mats.brass, Math.min(tx, tx - h.dir * 0.08), Y + 2.8, tz - 0.08, Math.max(tx, tx - h.dir * 0.08), Y + 2.9, tz + 0.08); // alarm bell
    // escape ladder up the bunker face (to the gratings under the casing)
    const lz = ps * (zo - 1.2);
    place(zone(wallX), ladder({ h: 7.4 }), wallX - h.dir * 0.08, Y, lz, h.dir > 0 ? Math.PI : 0);
    b.box(mats.steelFloor, Math.min(wallX, wallX - h.dir * 0.9), BTOP - 0.05, lz - 0.6, Math.max(wallX, wallX - h.dir * 0.9), BTOP, lz + 0.6);
    // ventilation trunk with bell mouth descending into the stokehold
    const vx = xm, vz = (hi % 2 ? 1 : -1) * Math.min(zo + 0.6, floorHW(xm) - 1.2);
    b.box(mats.paintWhite, vx - 0.45, Y + 5.2, vz - 0.45, vx + 0.45, CEIL, vz + 0.45, 'xXzZ');
    tubeBetween(b, mats.paintWhite, [vx, Y + 5.2, vz], [vx, Y + 4.6, vz], 0.5, { r1: 0.85, seg: 12, caps: false });
    tube(b, mats.iron, 'y', [vx, vz], 0.87, Y + 4.55, Y + 4.62, { seg: 12, caps: false });
    // lamps: caged lamps on the bunker face + pendants over the stokehold
    for (const z of [-zo, -zo / 2, zo / 2, zo]) {
      const zz = z + (z > 0 ? -0.6 : 0.6);
      if (noPort && z < 0) cageLamp(b, world, wallX + 0.9, Y + 6.0, zz, { hang: CEIL, intensity: 0.9 });
      else cageLamp(b, world, wallX - h.dir * 0.25, Y + 3.6, zz, { dir: h.dir > 0 ? '-x' : '+x', intensity: 0.9 });
    }
    for (const z of [-zo * 0.75, 0, zo * 0.75]) cageLamp(b, world, xm, Y + 6.3, z + 0.3, { hang: CEIL, intensity: 1.1 });
    // pressure gauge board on the bunker face
    for (let i = 0; i < 3; i++) {
      const gz = ps * (2.3 + i * 0.5);
      b.ring(mats.brass, [wallX - h.dir * 0.03, Y + 2.35, gz], [-h.dir, 0, 0], 0.13, 0.16, 12);
      b.disc(kitMats.gaugeFace, [wallX - h.dir * 0.025, Y + 2.35, gz], [-h.dir, 0, 0], 0.13, 12, true);
    }
  });
  // lamps along the side walkways beside the boilers
  const E2 = boilerEnds(r);
  for (const s of [-1, 1]) cageLamp(b, world, (E2.fwd + E2.aft) / 2, Y + 3.2, s * (floorHW(r.xc) - 0.12), { dir: s > 0 ? '-z' : '+z', intensity: 0.7 });
}
