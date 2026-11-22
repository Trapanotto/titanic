// Tank top – reciprocating engine room (two four-cylinder triple-expansion engines with animated cranks, connecting
// rods and crossheads, galleries, starting platform), turbine room (Parsons low-pressure turbine, condensers,
// change-over valves), electric engine room (four 400 kW engine-dynamo sets, main switchboard) and the spinning
// propeller shafts with their plummer blocks.
import * as THREE from 'three';
import { mats } from '../core/materials.js';
import { kitMats, telegraph, switchboard, machineBlock, tankV, tankH, stool, place, ladder } from '../interior/kit.js';
import {
  DECK, Y, CEIL, LOW, TBatch, tube, tubeBetween, pipeRun, cageLamp, railX, railZ, railXs, plate, flight, floorHW,
} from './tank-lib.js';

export const ER = { x0: -44, x1: -22 };
export const TR = { x0: -58, x1: -44 };
export const DY = { x0: -68, x1: -58 };
export const EZ = 5.0;                         // engine / wing shaft centre lines (±z)
export const SHAFT_Y = Y + 1.3;                // shaft axis height
const EX0 = -42.5, EX1 = -23.5;                // engine length
const CR = 0.95, CL = 3.2;                     // crank radius, connecting rod length
const CYL0 = Y + 6.1, CYL1 = Y + 8.6;          // cylinder body
const UNITS = [{ x: -26.1, r: 0.72 }, { x: -30.8, r: 1.05 }, { x: -35.3, r: 1.25 }, { x: -39.9, r: 1.25 }]; // HP, IP, LP, LP
export const LEVEL_U = Y + 10 * (2 / 3), LEVEL_M = Y + 10 / 3; // gallery levels (= landings of the access stair)
const W_ENG = (2 * Math.PI * 20) / 60;         // 20 rpm
const W_TURB = (2 * Math.PI * 44) / 60;        // centre shaft

function addMesh(world, parts, x, cfg) {
  const g = new THREE.Group();
  for (const p of parts) g.add(new THREE.Mesh(p.geo, p.mat));
  g.userData.noMerge = true;
  world.zone(DECK, x).add(g);
  if (cfg) cfg(g);
  return g;
}

// ------------------------------------------------------------------------------------------------ engine room

function buildEngine(world, b, s, anim) {
  const E = s * EZ, yc = SHAFT_Y;
  // bedplate: side girders + transverse bearing blocks
  for (const side of [-1, 1]) b.box(mats.iron, EX0, Y, E + side * 1.4 - 0.4, EX1, Y + 0.95, E + side * 1.4 + 0.4);
  const bearings = [EX1 - 0.35, (UNITS[0].x + UNITS[1].x) / 2, (UNITS[1].x + UNITS[2].x) / 2, (UNITS[2].x + UNITS[3].x) / 2, EX0 + 0.35];
  for (const x of bearings) {
    b.box(mats.iron, x - 0.38, Y, E - 1.4, x + 0.38, yc - 0.3, E + 1.4);
    b.box(mats.steelDark, x - 0.33, yc + 0.32, E - 0.6, x + 0.33, yc + 0.55, E + 0.6);
    for (const dz of [-0.48, 0.48]) tube(b, mats.brass, 'y', [x, E + dz], 0.05, yc + 0.55, yc + 0.72, { seg: 6 });
    tube(b, mats.chrome, 'x', [yc, E], 0.36, x - 0.5, x + 0.5, { seg: 14, caps: false }); // main journal
    tube(b, mats.brass, 'y', [x + 0.2, E], 0.06, yc + 0.55, yc + 0.85, { seg: 6 });      // oil cup
  }
  // columns (A-frames), guides, entablature
  for (const u of UNITS) {
    for (const side of [-1, 1]) {
      for (const dx of [-1, 1]) {
        tubeBetween(b, mats.steelDark, [u.x + dx * 1.05, Y + 0.95, E + side * 1.85], [u.x + dx * 0.55, Y + 5.85, E + side * 1.2], 0.17, { seg: 6, flat: true });
      }
      b.box(mats.steelDark, u.x - 0.95, Y + 3.4, E + side * 1.42 - 0.08, u.x + 0.95, Y + 3.6, E + side * 1.42 + 0.08); // stay
      // crosshead guides
      b.box(mats.chrome, u.x - 0.32, Y + 3.7, E + side * 0.32 - 0.05, u.x + 0.32, Y + 5.85, E + side * 0.32 + 0.05);
      b.box(mats.steelDark, u.x - 0.45, Y + 3.6, E + side * 0.4, u.x + 0.45, Y + 5.85, E + side * 0.46);
      b.box(mats.steelDark, u.x - 0.08, Y + 4.6, E + side * 0.46, u.x + 0.08, Y + 4.8, E + side * 1.35);
    }
    // stuffing box under the cylinder
    tube(b, mats.brass, 'y', [u.x, E], 0.26, Y + 5.75, CYL0, { seg: 12 });
  }
  b.box(mats.steelDark, EX0 + 0.2, Y + 5.85, E - 1.45, EX1 - 0.2, CYL0, E + 1.45);
  // cylinders: lagging, brass bands, covers, relief valves, valve chests
  UNITS.forEach((u, i) => {
    const r = u.r + 0.08;
    tube(b, mats.paintGrey, 'y', [u.x, E], r, CYL0, CYL1, { seg: 24, caps: false });
    for (const y of [CYL0 + 0.12, (CYL0 + CYL1) / 2, CYL1 - 0.12]) tube(b, mats.brass, 'y', [u.x, E], r + 0.02, y - 0.05, y + 0.05, { seg: 24, caps: false });
    tube(b, mats.steelDark, 'y', [u.x, E], r + 0.1, CYL0 - 0.1, CYL0 + 0.02, { seg: 24 });
    tube(b, mats.steelDark, 'y', [u.x, E], r + 0.1, CYL1, CYL1 + 0.15, { seg: 24 });
    tube(b, mats.steelDark, 'y', [u.x, E], r * 0.8, CYL1 + 0.15, CYL1 + 0.32, { seg: 16, r1: 0.3 });
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; b.box(mats.brass, u.x + Math.cos(a) * (r + 0.04) - 0.03, CYL1 + 0.15, E + Math.sin(a) * (r + 0.04) - 0.03, u.x + Math.cos(a) * (r + 0.04) + 0.03, CYL1 + 0.21, E + Math.sin(a) * (r + 0.04) + 0.03); }
    tube(b, mats.brass, 'y', [u.x + r * 0.5, E + r * 0.5], 0.07, CYL1 + 0.15, CYL1 + 0.45, { seg: 6 });
    const vx = u.x + u.r + 0.55;
    tube(b, mats.paintGrey, 'y', [vx, E], 0.38, Y + 5.95, Y + 8.4, { seg: 14 });
    tube(b, mats.brass, 'y', [vx, E], 0.4, Y + 8.1, Y + 8.18, { seg: 14, caps: false });
    tube(b, mats.chrome, 'y', [vx, E], 0.06, Y + 4.4, Y + 5.95, { seg: 6, caps: false }); // valve spindle guide
    // indicator cocks and lubricators
    b.box(mats.brass, u.x - 0.08, CYL0 + 0.6, E - s * (r + 0.02) - 0.05, u.x + 0.08, CYL0 + 0.85, E - s * (r + 0.02) + 0.05);
    if (i < 3) pipeRun(b, mats.paintGrey, [[vx, Y + 8.4, E], [vx, Y + 8.85, E], [UNITS[i + 1].x + UNITS[i + 1].r + 0.55, Y + 8.85, E], [UNITS[i + 1].x + UNITS[i + 1].r + 0.55, Y + 8.4, E]], 0.26, { seg: 10 });
  });
  // reversing engine and hand wheel at the forward end
  tube(b, mats.steelDark, 'y', [EX1 + 0.25, E - s * 1.6], 0.28, Y, Y + 2.2, { seg: 10 });
  b.ring(mats.rust, [EX1 + 0.56, Y + 1.4, E - s * 1.6], [1, 0, 0], 0.36, 0.41, 14);
  b.box(mats.iron, EX1 + 0.25, Y + 1.37, E - s * 1.6 - 0.03, EX1 + 0.56, Y + 1.43, E - s * 1.6 + 0.03);
  world.addCollider(EX1, Y, E - s * 1.6 - 0.3, EX1 + 0.55, Y + 2.2, E - s * 1.6 + 0.3);
  // turning gear + thrust block aft
  b.box(mats.iron, -43.9, Y, E - 0.95, -42.6, yc + 0.6, E + 0.95);
  for (let k = 0; k < 6; k++) b.box(mats.steelDark, -43.8 + k * 0.2, yc + 0.6, E - 0.7, -43.7 + k * 0.2, yc + 0.75, E + 0.7);
  tube(b, mats.brass, 'y', [-43.25, E + 0.6], 0.07, yc + 0.6, yc + 0.95, { seg: 6 });
  b.box(mats.iron, EX0 - 0.15, Y, Math.min(E + s * 1.9, E + s * 2.2), EX0 + 0.6, Y + 1.5, Math.max(E + s * 1.9, E + s * 2.2));
  // colliders (stacked so that the galleries can run close to the engine)
  world.addCollider(-43.9, Y, E - 2.2, EX1, Y + 2.0, E + 2.2);
  world.addCollider(EX0, Y + 2.0, E - 1.9, EX1, Y + 6.0, E + 1.9);
  world.addCollider(EX0, Y + 6.0, E - 1.45, EX1, Y + 9.3, E + 1.45);

  // ---- moving parts (one set per crank)
  const crankT = new TBatch();
  for (const dx of [-0.42, 0.42]) crankT.box(mats.steel, dx - 0.11, -0.5, -0.48, dx + 0.11, CR + 0.38, 0.48);
  tube(crankT, mats.chrome, 'x', [CR, 0], 0.27, -0.31, 0.31, { seg: 12, caps: false });
  tube(crankT, mats.chrome, 'x', [0, 0], 0.34, -0.31, 0.31, { seg: 12, caps: false });
  const crankParts = crankT.parts();
  const rodT = new TBatch();
  tube(rodT, mats.chrome, 'y', [0, 0], 0.15, -CL / 2 + 0.25, CL / 2 - 0.2, { seg: 8, r1: 0.11, caps: false });
  rodT.box(mats.steel, -0.3, -CL / 2 - 0.3, -0.32, 0.3, -CL / 2 + 0.3, 0.32);
  rodT.box(mats.brass, -0.31, -CL / 2 - 0.04, -0.33, 0.31, -CL / 2 + 0.04, 0.33);
  rodT.box(mats.steel, -0.2, CL / 2 - 0.22, -0.22, 0.2, CL / 2 + 0.12, 0.22);
  const rodParts = rodT.parts();
  const xhT = new TBatch();
  xhT.box(mats.steel, -0.3, -0.25, -0.27, 0.3, 0.25, 0.27);
  for (const dz of [-1, 1]) xhT.box(mats.brass, -0.3, -0.3, dz * 0.27 - (dz > 0 ? 0 : 0.0), 0.3, 0.3, dz * 0.27 + dz * 0.04);
  tube(xhT, mats.chrome, 'y', [0, 0], 0.11, 0.25, 2.65, { seg: 8, caps: false });
  const xhParts = xhT.parts();
  const vrT = new TBatch();
  tube(vrT, mats.chrome, 'y', [0, 0], 0.05, 0, 1.5, { seg: 6, caps: false });
  vrT.box(mats.steel, -0.08, -0.1, -0.08, 0.08, 0.1, 0.08);
  const vrParts = vrT.parts();

  UNITS.forEach((u, i) => {
    const phase = (i * Math.PI) / 2 + (s > 0 ? Math.PI / 4 : 0);
    const crank = addMesh(world, crankParts, u.x, (g) => g.position.set(u.x, yc, E));
    const rod = addMesh(world, rodParts, u.x);
    const xh = addMesh(world, xhParts, u.x);
    const vx = u.x + u.r + 0.55;
    const vr = addMesh(world, vrParts, vx);
    anim.push((t) => {
      const th = t * W_ENG + phase, sn = Math.sin(th), cs = Math.cos(th);
      crank.rotation.x = th;
      const py = yc + CR * cs, pz = E + CR * sn;
      const yx = py + Math.sqrt(CL * CL - CR * CR * sn * sn);
      rod.position.set(u.x, (py + yx) / 2, (pz + E) / 2);
      rod.rotation.x = Math.atan2(E - pz, yx - py);
      xh.position.set(u.x, yx, E);
      vr.position.set(vx, Y + 3.1 + 0.22 * Math.cos(th + Math.PI / 2), E);
    });
  });
}

/** Stair tower under MACHINERY_ACCESS 'engineAccess' (starboard) + engine galleries on two levels. */
function buildEngineAccessAndGalleries(world, b) {
  const yF = Y + 10, yU = LEVEL_U, yM = LEVEL_M;
  const XA = -34, XB = -29, A0 = 8.1, A1 = 10.4, B0 = 10.5, B1 = 12.9, MID = 10.45;
  // tower
  flight(b, world, { axis: 'x', a0: XB, a1: XA, y0: yF, y1: yU, c0: A0, c1: MID, rails: [true, true] });
  plate(b, world, -35.5, XA, A0, B1, yU);
  railZ(b, world, A0, B1, -35.5, yU); railX(b, world, -35.5, XA, B1, yU);
  flight(b, world, { axis: 'x', a0: XA, a1: XB, y0: yU, y1: yM, c0: MID, c1: B1, rails: [true, true] });
  plate(b, world, XB, -27.5, A0, B1, yM);
  railZ(b, world, A0, B1, -27.5, yM); railX(b, world, XB, -27.5, B1, yM);
  flight(b, world, { axis: 'x', a0: XB, a1: XA, y0: yM, y1: Y, c0: A0, c1: MID, rails: [true, true], under: true });
  for (const x of [-35.45, -27.55]) for (const z of [A0 + 0.05, B1 - 0.05]) b.box(mats.steelDark, x - 0.06, Y, z - 0.06, x + 0.06, x < -30 ? yU : yM, z + 0.06, 'xXzZ'); // tower posts
  b.box(mats.steelDark, -34.06, Y, B1 - 0.11, -33.94, yU, B1 + 0.01, 'xXzZ'); b.box(mats.steelDark, -29.06, Y, B1 - 0.11, -28.94, yM, B1 + 0.01, 'xXzZ');

  // upper level: outboard galleries, centre gallery, cross bridges at both ends
  const XL = -43.94, XR = -22.06;
  for (const s of [-1, 1]) {
    plate(b, world, XL, XR, s > 0 ? 6.5 : -8.1, s > 0 ? 8.1 : -6.5, yU);
    for (const [za, zb] of [[3.4, 6.5]]) {
      plate(b, world, -23.4, XR, s > 0 ? za : -zb, s > 0 ? zb : -za, yU);
      plate(b, world, XL, -42.6, s > 0 ? za : -zb, s > 0 ? zb : -za, yU);
      railZ(b, world, s > 0 ? za : -zb, s > 0 ? zb : -za, -23.4, yU);
      railZ(b, world, s > 0 ? za : -zb, s > 0 ? zb : -za, -42.6, yU);
    }
    railX(b, world, -42.6, -23.4, s * 6.5, yU);
    railX(b, world, -42.6, -23.4, s * 3.4, yU);
  }
  plate(b, world, XL, XR, -3.4, 3.4, yU);
  railXs(b, world, [[XL, -35.5], [XB, XR]], 8.1, yU);
  railXs(b, world, [[XL, -35.0], [-33.8, XR]], -8.1, yU);
  // port: landing at the top of the upper stair
  plate(b, world, -35.0, -33.8, -9.2, -8.1, yU);
  railX(b, world, -35.0, -33.8, -9.2, yU); railZ(b, world, -9.2, -8.1, -35.0, yU);

  // middle level (crosshead platforms) along the outboard sides of both engines
  for (const s of [-1, 1]) {
    plate(b, world, -42.6, -24.0, s > 0 ? 6.95 : -8.1, s > 0 ? 8.1 : -6.95, yM);
    railX(b, world, -42.6, -24.0, s * 6.98, yM, { collide: false, toe: false });
    railZ(b, world, s > 0 ? 6.95 : -8.1, s > 0 ? 8.1 : -6.95, -42.6, yM);
    railZ(b, world, s > 0 ? 6.95 : -8.1, s > 0 ? 8.1 : -6.95, -24.0, yM);
  }
  railXs(b, world, [[-42.6, XA], [-27.5, -24.0]], 8.1, yM);
  railXs(b, world, [[-42.6, -30.4], [-27.4, -24.0]], -8.1, yM);
  plate(b, world, -30.4, -27.4, -9.2, -8.1, yM);
  railX(b, world, -30.4, -27.4, -9.2, yM);
  // port stairs: floor → middle level → upper level
  flight(b, world, { axis: 'x', a0: -24.0, a1: -27.4, y0: Y, y1: yM, c0: -9.2, c1: -8.2, rails: [true, true], under: true });
  flight(b, world, { axis: 'x', a0: -30.4, a1: -33.8, y0: yM, y1: yU, c0: -9.2, c1: -8.2, rails: [true, true] });
  // gallery hangers / stanchions
  const inTower = (x, s) => s > 0 && x > -35.7 && x < -27.3;
  for (let x = -42.2; x < -23; x += 3.1) for (const s of [-1, 1]) {
    if (!inTower(x, s)) {
      b.box(mats.steelDark, x - 0.05, yM, s * 8.05 - 0.05, x + 0.05, yU - 0.06, s * 8.05 + 0.05, 'xXzZ');
      b.box(mats.steelDark, x - 0.05, yU, s * 8.05 - 0.05, x + 0.05, CEIL, s * 8.05 + 0.05, 'xXzZ');
    }
    b.box(mats.steelDark, x - 0.05, yU, s * 3.42 - 0.05, x + 0.05, CEIL, s * 3.42 + 0.05, 'xXzZ');
  }
  // lamps on the galleries
  for (let x = -41; x < -24; x += 4.5) for (const s of [-1, 1]) {
    if (!inTower(x, s)) cageLamp(b, world, x, yU + 2.3, s * 8.05, { hang: CEIL, intensity: 0.8 });
    cageLamp(b, world, x + 1.5, yM + 2.3, s * 8.0, { hang: yU - 0.2, intensity: 0.7 });
  }
}

function startingPlatform(world, b) {
  const x0 = -34.5, x1 = -28.5, yp = Y + 0.25;
  b.box(mats.steelFloor, x0, Y, -2.3, x1, yp, 2.3, 'YxXzZ');
  world.addFloor({ y: yp, x0, x1, z0: -2.3, z1: 2.3 });
  const zone = world.zone(DECK, -31);
  for (const s of [-1, 1]) {
    // gauge boards along both sides
    b.box(mats.steelDark, x0 + 0.5, yp, s * 2.42 - 0.05, x1 - 0.5, yp + 3.0, s * 2.42 + 0.05);
    world.addCollider(x0 + 0.5, yp, s * 2.42 - 0.08, x1 - 0.5, yp + 3.0, s * 2.42 + 0.08);
    for (const tx of [-29.2, -33.8]) world.addCollider(tx - 0.25, yp, s * 1.55 - 0.22, tx + 0.25, yp + 1.3, s * 1.55 + 0.22);
    b.box(mats.woodDark, x0 + 0.4, yp + 0.95, s * 2.32 - 0.1, x1 - 0.4, yp + 1.02, s * 2.32 + 0.12); // desk ledge
    for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) {
      const x = x0 + 1.0 + i * 0.8, y = yp + 1.7 + j * 0.65, n = [0, 0, -s];
      b.ring(mats.brass, [x, y, s * 2.36], n, 0.14, 0.18, 12);
      b.disc(j === 1 && i === 2 ? kitMats.clockFace : kitMats.gaugeFace, [x, y, s * 2.365], n, 0.14, 12, true);
    }
    // revolution counters, engine telegraph receivers and the reversing levers
    b.box(mats.brass, x0 + 4.4, yp + 2.6, s * 2.3, x0 + 5.2, yp + 2.85, s * 2.37);
    place(zone, telegraph(), -29.2, yp, s * 1.55, Math.PI, { collide: false });
    place(zone, telegraph(), -33.8, yp, s * 1.55, 0, { collide: false });
    for (const dx of [0, 0.35]) { tubeBetween(b, mats.chrome, [-31.6 + dx, yp, s * 2.2], [-31.5 + dx, yp + 1.25, s * 2.05], 0.03, { seg: 5 }); b.box(mats.brass, -31.56 + dx, yp + 1.2, s * 2.01, -31.44 + dx, yp + 1.33, s * 2.09); }
    b.ring(mats.rust, [-30.4, yp + 1.35, s * 2.25], [0, 0, -s], 0.35, 0.4, 14);
    // speaking tubes from the bridge
    pipeRun(b, mats.brass, [[-32.8, yp + 1.6, s * 2.3], [-32.8, CEIL, s * 2.3]], 0.04, { seg: 6, flange: null });
    b.ring(mats.brass, [-32.8, yp + 1.6, s * 2.25], [0, 0, -s], 0.02, 0.09, 8);
  }
  place(zone, stool(), -31.5, yp, 1.2, 0, { collide: false });
  // engineers' log desk at the forward end (beside the aisle)
  b.box(mats.oak, x1 + 0.1, Y, -2.3, x1 + 0.8, Y + 0.95, -1.4);
  b.box(mats.paper, x1 + 0.2, Y + 0.95, -2.2, x1 + 0.6, Y + 0.96, -1.8, 'Y');
  world.addCollider(x1 + 0.1, Y, -2.3, x1 + 0.8, Y + 0.95, -1.4);
  for (const z of [-1.8, 1.8]) cageLamp(b, world, -31.5, Y + 4.2, z, { hang: LEVEL_U - 0.1, intensity: 1.2 });
}

function engineRoomExtras(world, b) {
  // steam from the mains to the HP valve chests, exhaust from the LP cylinders to the change-over valves
  for (const s of [-1, 1]) {
    const hpv = UNITS[0].x + UNITS[0].r + 0.55;
    pipeRun(b, mats.paintWhite, [[-22, Y + 8.4, s * 12.6], [-22.6, Y + 8.4, s * 12.6], [-22.6, Y + 9.3, s * 12.6], [-22.6, Y + 9.3, s * EZ], [hpv, Y + 9.3, s * EZ], [hpv, Y + 8.4, s * EZ]], 0.24, { seg: 10 });
    b.box(mats.steelDark, -22.95, Y + 8.95, s * 10.5 - 0.35, -22.25, Y + 9.65, s * 10.5 + 0.35); // main stop valve
    b.box(mats.iron, -23.4, Y + 9.27, s * 10.5 - 0.02, -22.95, Y + 9.33, s * 10.5 + 0.02);
    b.ring(mats.rust, [-23.4, Y + 9.3, s * 10.5], [-1, 0, 0], 0.3, 0.35, 14);
    const lp = UNITS[3];
    pipeRun(b, mats.paintGrey, [[lp.x, CYL1 + 0.1, s * (EZ - 0.6)], [lp.x - 1.6, Y + 9.15, s * 4.4], [-44.6, Y + 9.15, s * 3.4], [-45.8, Y + 5.6, s * 2.6]], 0.5, { seg: 12 });
    // auxiliary condensers, feed and bilge pumps along the sides
    tube(b, mats.steelDark, 'x', [Y + 1.6, s * 11.2], 1.0, -43.6, -37.4, { seg: 18 });
    for (const x of [-43.6, -37.4]) tube(b, mats.iron, 'x', [Y + 1.6, s * 11.2], 1.08, x - 0.08, x + 0.08, { seg: 18 });
    for (const x of [-42.6, -38.4]) b.box(mats.iron, x - 0.2, Y, s * 11.2 - 0.9, x + 0.2, Y + 0.9, s * 11.2 + 0.9);
    world.addCollider(-43.7, Y, s * 11.2 - 1.05, -37.3, Y + 2.7, s * 11.2 + 1.05);
  }
  const zone = world.zone(DECK, -25);
  for (const [x, z] of [[-26.6, -11.6], [-24.4, -11.6], [-26.6, 11.9], [-24.4, 11.9]]) place(zone, machineBlock({ kind: 'pump', w: 1.6, d: 1.1, h: 2.2 }), x, Y, z, Math.PI / 2, { collide: true, world });
  place(world.zone(DECK, -36), tankV({ r: 0.6, h: 2.6 }), -36.2, Y, -12.4, 0, { collide: true, world });
  // gauge board on the forward bulkhead + clock
  for (let i = 0; i < 8; i++) {
    const z = -2.6 + i * 0.75, n = [-1, 0, 0];
    b.ring(mats.brass, [-22.08, Y + 3.2, z], n, 0.15, 0.19, 12);
    b.disc(i === 4 ? kitMats.clockFace : kitMats.gaugeFace, [-22.085, Y + 3.2, z], n, 0.15, 12, true);
  }
  b.box(mats.woodDark, -22.12, Y + 2.8, -3.0, -22.05, Y + 3.6, 3.0, 'x');
  // ceiling lamps
  for (let x = -41; x < -23; x += 4.5) for (const z of [-11, 0, 11]) cageLamp(b, world, x, CEIL - 0.6, z, { hang: CEIL, intensity: 1.2 });
  for (const z of [-1.5, 1.5]) for (const x of [-40, -36, -26.5]) cageLamp(b, world, x, Y + 4.4, z, { hang: LEVEL_U - 0.1, intensity: 0.9 });
}

// ------------------------------------------------------------------------------------------------ turbine room

function buildTurbineRoom(world, b) {
  const yc = SHAFT_Y;
  const secs = [[-46.5, -49.5, 1.6], [-49.5, -52.5, 1.85], [-52.5, -55.0, 2.1]];
  for (const [xa, xb, r] of secs) {
    tube(b, mats.steelDark, 'x', [yc, 0], r, xb, xa, { seg: 32, caps: false });
    for (const x of [xa, xb]) tube(b, mats.iron, 'x', [yc, 0], r + 0.08, x - 0.09, x + 0.09, { seg: 32 });
    for (const s of [-1, 1]) {
      b.box(mats.iron, xb, yc - 0.08, s * r - (s > 0 ? 0 : 0.2), xa, yc + 0.08, s * r + (s > 0 ? 0.2 : 0)); // horizontal joint flange
      for (let x = xb + 0.2; x < xa - 0.1; x += 0.4) b.box(mats.brass, x - 0.035, yc + 0.08, s * (r + 0.1) - 0.035, x + 0.035, yc + 0.14, s * (r + 0.1) + 0.035);
    }
  }
  tube(b, mats.steelDark, 'x', [yc, 0], 1.6, -46.5, -45.85, { seg: 32, r1: 0.75 });
  tube(b, mats.steelDark, 'x', [yc, 0], 2.1, -55.0, -55.7, { seg: 32, r1: 0.8 });
  for (const x of [-45.4, -56.1]) { // bearing pedestals
    b.box(mats.iron, x - 0.45, Y, -0.9, x + 0.45, yc + 0.55, 0.9);
    b.box(mats.steelDark, x - 0.4, yc + 0.55, -0.6, x + 0.4, yc + 0.8, 0.6);
    tube(b, mats.brass, 'y', [x, 0.4], 0.06, yc + 0.8, yc + 1.1, { seg: 6 });
  }
  tube(b, mats.chrome, 'x', [yc, 0], 0.32, -45.85, -44.9, { seg: 12, caps: false });
  world.addCollider(-56.6, Y, -2.3, -44.9, yc + 2.2, 2.3);
  // inlet branches and change-over valves
  for (const s of [-1, 1]) {
    b.box(mats.steelDark, -46.4, Y + 4.9, s * 2.6 - 0.55, -45.2, Y + 6.1, s * 2.6 + 0.55);
    tube(b, mats.steelDark, 'y', [-45.8, s * 2.6], 0.18, Y + 6.1, Y + 6.9, { seg: 8 });
    b.ring(mats.rust, [-45.8, Y + 6.95, s * 2.6], [0, 1, 0], 0.5, 0.56, 16);
    b.box(mats.iron, -46.35, Y + 6.93, s * 2.6 - 0.02, -45.25, Y + 6.97, s * 2.6 + 0.02);
    pipeRun(b, mats.paintGrey, [[-46.2, Y + 5.2, s * 2.3], [-47.4, yc + 1.75, s * 1.0], [-47.4, yc + 1.45, s * 0.9]], 0.42, { seg: 12 });
    pipeRun(b, mats.paintGrey, [[-45.4, Y + 5.0, s * 3.1], [-45.4, Y + 4.4, s * 6.5], [-47.2, Y + 4.4, s * 8.6]], 0.36, { seg: 12 }); // bypass to the condenser
    // exhaust trunk from the turbine to the condensers
    b.box(mats.steelDark, -54.6, Y + 2.9, s > 0 ? 1.9 : -8.5, -51.2, Y + 4.9, s > 0 ? 8.5 : -1.9, 'xXyY' + (s > 0 ? 'Z' : 'z'));
    for (const x of [-54.0, -52.9, -51.8]) b.box(mats.iron, x - 0.05, Y + 2.86, s > 0 ? 2.0 : -8.5, x + 0.05, Y + 4.94, s > 0 ? 8.5 : -2.0, 'xXyY');
    // main condensers
    const cz = s * 10.0, cy = Y + 2.1;
    tube(b, mats.steelDark, 'x', [cy, cz], 1.65, -56.4, -47.4, { seg: 28, caps: false });
    for (const x of [-56.4, -47.4]) tube(b, mats.iron, 'x', [cy, cz], 1.75, x - 0.1, x + 0.1, { seg: 28 });
    tube(b, mats.steelDark, 'x', [cy, cz], 1.6, -47.3, -46.7, { seg: 24, r1: 0.6 });
    tube(b, mats.steelDark, 'x', [cy, cz], 1.6, -56.5, -57.1, { seg: 24, r1: 0.6 });
    for (let x = -55.6; x < -47.6; x += 1.6) tube(b, mats.iron, 'x', [cy, cz], 1.67, x - 0.04, x + 0.04, { seg: 28, caps: false });
    for (const x of [-55.4, -51.9, -48.4]) b.box(mats.iron, x - 0.25, Y, cz - 1.3, x + 0.25, cy - 1.0, cz + 1.3);
    pipeRun(b, mats.copper, [[-46.9, cy - 0.6, cz], [-46.3, cy - 0.6, cz], [-46.3, Y + 0.4, cz], [-46.3, Y + 0.4, s * (floorHW(-46) - 0.3)]], 0.32, { seg: 10 });
    pipeRun(b, mats.copper, [[-56.9, cy + 0.6, cz], [-57.4, cy + 0.6, cz], [-57.4, cy + 0.6, s * (floorHW(-57) - 0.3)]], 0.32, { seg: 10 });
    world.addCollider(-57.2, Y, cz - 1.8, -46.6, cy + 1.8, cz + 1.8);
    // air pumps, circulating pumps, evaporators, feed heaters (outboard)
    const zone = world.zone(DECK, -50);
    place(zone, machineBlock({ kind: 'pump', w: 1.4, d: 1.2, h: 2.6 }), -57.0, Y, s * 12.0, 0, { collide: true, world });
    place(zone, machineBlock({ kind: 'pump', w: 1.4, d: 1.2, h: 2.6 }), -45.2, Y, s * 11.0, Math.PI, { collide: true, world });
    place(zone, tankV({ r: 0.75, h: 3.2, mat: 'steelDark' }), -53.8, Y, s * 12.5, 0, { collide: true, world });
    place(zone, tankV({ r: 0.75, h: 3.2, mat: 'steelDark' }), -51.6, Y, s * 12.5, 0, { collide: true, world });
    place(zone, tankH({ r: 0.55, l: 2.6 }), -49.0, Y, s * 12.6, Math.PI / 2, { collide: true, world });
  }
  for (let x = -56; x < -45; x += 4) for (const z of [-8, 0, 8]) cageLamp(b, world, x, CEIL - 0.8, z + (z === 0 ? 3.6 : 0), { hang: CEIL, intensity: 1.1 });
  for (const s of [-1, 1]) for (const x of [-56.5, -48.5]) cageLamp(b, world, x, Y + 3.0, s * 4.5, { hang: CEIL, intensity: 0.8 });
}

// ------------------------------------------------------------------------------------------------ dynamo room

function buildDynamoRoom(world, b, anim) {
  const zone = world.zone(DECK, -63);
  const fwT = new TBatch();
  tube(fwT, mats.iron, 'x', [0, 0], 0.62, -0.08, 0.08, { seg: 16 });
  tube(fwT, mats.iron, 'x', [0, 0], 0.66, -0.1, 0.1, { seg: 16, caps: false });
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; fwT.box(mats.rust, -0.11, Math.cos(a) * 0.62 - 0.04, Math.sin(a) * 0.62 - 0.04, 0.11, Math.cos(a) * 0.62 + 0.04, Math.sin(a) * 0.62 + 0.04); }
  const fw = fwT.parts();
  for (const s of [-1, 1]) for (const zc of [7.7, 10.6]) {
    const z = s * zc;
    b.box(mats.iron, -67.4, Y, z - 0.9, -61.0, Y + 0.3, z + 0.9);
    // vertical two-cylinder steam engine
    b.box(mats.paintGreen, -67.2, Y + 0.3, z - 0.7, -64.9, Y + 1.5, z + 0.7);
    for (const dx of [-0.6, 0.6]) {
      for (const dz of [-0.55, 0.55]) tubeBetween(b, mats.steelDark, [-66.05 + dx, Y + 1.5, z + dz], [-66.05 + dx * 0.8, Y + 2.4, z + dz * 0.7], 0.06, { seg: 5, flat: true });
      tube(b, mats.paintGreen, 'y', [-66.05 + dx, z], 0.42, Y + 2.4, Y + 3.3, { seg: 14 });
      tube(b, mats.brass, 'y', [-66.05 + dx, z], 0.44, Y + 3.3, Y + 3.38, { seg: 14 });
    }
    b.box(mats.paintGreen, -66.7, Y + 2.5, z - 0.55, -65.4, Y + 3.2, z - 0.4);
    pipeRun(b, mats.paintWhite, [[-66.05, Y + 3.38, z], [-66.05, LOW - 0.4, z], [-60, LOW - 0.4, z]], 0.1, { seg: 8 });
    // dynamo
    tube(b, mats.paintGreen, 'x', [Y + 1.25, z], 0.88, -64.3, -62.2, { seg: 24 });
    tube(b, mats.brass, 'x', [Y + 1.25, z], 0.9, -64.25, -64.1, { seg: 24, caps: false });
    tube(b, mats.copper, 'x', [Y + 1.25, z], 0.46, -62.2, -61.6, { seg: 16 });
    for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + 0.4; b.box(mats.brass, -62.05, Y + 1.25 + Math.cos(a) * 0.5 - 0.05, z + Math.sin(a) * 0.5 - 0.05, -61.75, Y + 1.25 + Math.cos(a) * 0.5 + 0.05, z + Math.sin(a) * 0.5 + 0.05); }
    b.box(mats.iron, -61.5, Y + 0.3, z - 0.35, -61.1, Y + 1.5, z + 0.35);
    tube(b, mats.chrome, 'x', [Y + 1.25, z], 0.1, -64.9, -61.1, { seg: 8, caps: false });
    b.box(mats.brass, -63.6, Y + 2.1, z - 0.15, -63.0, Y + 2.18, z + 0.15); // maker's plate
    world.addCollider(-67.4, Y, z - 0.95, -61.0, Y + 3.4, z + 0.95);
    const g = addMesh(world, fw, -64.6, (m) => m.position.set(-64.6, Y + 1.25, z));
    anim.push((t) => { g.rotation.x = t * 6.5; });
    // cables to the switchboard
    pipeRun(b, mats.rubber, [[-62.6, Y + 2.1, z], [-62.6, LOW - 0.25, z], [-58.4, LOW - 0.25, z]], 0.05, { seg: 6, flange: null });
  }
  // main switchboard on the forward bulkhead (starboard) and the auxiliary board (port)
  place(zone, switchboard({ w: 3 }), -58.25, Y, 10.2, Math.PI, { collide: true, world });
  place(zone, switchboard({ w: 2.2 }), -58.25, Y, 12.5, Math.PI, { collide: true, world });
  place(zone, switchboard({ w: 3 }), -58.25, Y, -10.2, Math.PI, { collide: true, world });
  b.box(mats.woodDark, -59.9, Y, 9.0, -59.3, Y + 0.95, 10.4); // engineer's desk
  b.box(mats.paper, -59.8, Y + 0.95, 9.4, -59.4, Y + 0.96, 9.9, 'Y');
  world.addCollider(-59.9, Y, 9.0, -59.3, Y + 0.95, 10.4);
  place(zone, stool(), -60.3, Y, 9.7, 0, { collide: false });
  // step-over bridges across the wing shafts
  const yb = Y + 2.0;
  for (const s of [-1, 1]) {
    const lo = s * 2.15, hi = s * 4.2, hi2 = s * 5.8, lo2 = s * 7.85;
    flight(b, world, { axis: 'z', a0: lo, a1: hi, y0: Y, y1: yb, c0: -60.6, c1: -59.6, under: true });
    plate(b, world, -60.6, -59.6, Math.min(hi, hi2), Math.max(hi, hi2), yb);
    railZ(b, world, Math.min(hi, hi2), Math.max(hi, hi2), -60.6, yb); railZ(b, world, Math.min(hi, hi2), Math.max(hi, hi2), -59.6, yb);
    flight(b, world, { axis: 'z', a0: hi2, a1: lo2, y0: yb, y1: Y, c0: -60.6, c1: -59.6, under: true });
  }
}

// ------------------------------------------------------------------------------------------------ shafts

/** Rotating shafts (wing shafts from the thrust blocks, centre shaft from the turbine) with plummer blocks. */
function buildShafts(world, b, anim) {
  const yc = SHAFT_Y;
  const lines = [
    { z: -EZ, x0: -104, x1: -42.6, w: W_ENG, plummers: [-47, -51.5, -55.5, -62.8, -72, -78, -84, -90, -96, -101.5] },
    { z: EZ, x0: -104, x1: -42.6, w: -W_ENG, plummers: [-47, -51.5, -55.5, -62.8, -72, -78, -84, -90, -96, -101.5] },
    { z: 0, x0: -104, x1: -56.1, w: W_TURB, plummers: [-62.8, -72, -78, -84, -90, -96, -101.5] },
  ];
  for (const L of lines) {
    const cuts = [L.x0, -96, -72, -48, L.x1].filter((x, i, a) => x >= L.x0 && x <= L.x1 && a.indexOf(x) === i).sort((p, q) => p - q);
    for (let i = 0; i < cuts.length - 1; i++) {
      const xa = cuts[i], xb = cuts[i + 1], tb = new TBatch();
      tube(tb, mats.steel, 'x', [0, 0], 0.3, xa, xb, { seg: 8, flat: true, caps: false });
      for (let x = Math.ceil((xa + 1) / 6) * 6; x < xb - 0.5; x += 6) {
        tube(tb, mats.steel, 'x', [0, 0], 0.55, x - 0.12, x + 0.12, { seg: 12, flat: true });
        for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; for (const dx of [-0.15, 0.15]) tb.box(mats.iron, x + dx - 0.04, Math.cos(a) * 0.42 - 0.04, Math.sin(a) * 0.42 - 0.04, x + dx + 0.04, Math.cos(a) * 0.42 + 0.04, Math.sin(a) * 0.42 + 0.04); }
      }
      const g = addMesh(world, tb.parts(), (xa + xb) / 2, (m) => m.position.set(0, yc, L.z));
      anim.push((t) => { g.rotation.x = t * L.w; });
      world.addCollider(xa, yc - 0.32, L.z - 0.32, xb, yc + 0.32, L.z + 0.32);
    }
    for (const x of L.plummers) {
      b.box(mats.iron, x - 0.35, Y, L.z - 0.5, x + 0.35, yc - 0.32, L.z + 0.5);
      b.box(mats.steelDark, x - 0.3, yc - 0.32, L.z - 0.48, x + 0.3, yc + 0.46, L.z + 0.48);
      b.box(mats.iron, x - 0.32, yc + 0.46, L.z - 0.3, x + 0.32, yc + 0.56, L.z + 0.3);
      tube(b, mats.brass, 'y', [x, L.z + 0.2], 0.06, yc + 0.56, yc + 0.8, { seg: 6 });
      world.addCollider(x - 0.35, Y, L.z - 0.5, x + 0.35, yc + 0.56, L.z + 0.5);
    }
    // glands where the shafts pass through the bulkheads
    for (const x of [-44, -58, -68]) if (x > L.x0 && x < L.x1) tube(b, mats.brass, 'x', [yc, L.z], 0.45, x - 0.12, x + 0.12, { seg: 14 });
  }
}

/** Builds engine room, turbine room, dynamo room and shafts. Returns per-frame animators. */
export function buildEngineSpaces(world, b) {
  const anim = [];
  for (const s of [-1, 1]) buildEngine(world, b, s, anim);
  buildEngineAccessAndGalleries(world, b);
  startingPlatform(world, b);
  engineRoomExtras(world, b);
  buildTurbineRoom(world, b);
  buildDynamoRoom(world, b, anim);
  buildShafts(world, b, anim);
  return anim;
}
