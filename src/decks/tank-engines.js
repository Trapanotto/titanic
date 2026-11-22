// Tank top – reciprocating engine room (two four-cylinder triple-expansion engines with animated cranks, connecting
// rods and crossheads, galleries, starting platform), turbine room (Parsons low-pressure turbine, condensers,
// change-over valves), electric engine room (four 400 kW engine-dynamo sets, main switchboard) and the spinning
// propeller shafts with their plummer blocks.
import * as THREE from 'three';
import { mats } from '../core/materials.js';
import { kitMats, telegraph, switchboard, machineBlock, tankV, tankH, stool, place, ladder } from '../interior/kit.js';
import {
  DECK, Y, CEIL, LOW, TBatch, tube, tubeBetween, pipeRun, cageLamp, railX, railZ, railXs, plate, flight, floorHW,
  stamp, M4, M4dir, gcache, latheAt, nut, rivetLine, rivetArcX,
} from './tank-lib.js';
import { handwheel, lagged, flange } from './tank-boilers.js';

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
  // bedplate: box girders with holding-down bolts, transverse bearing housings with caps, studs and oil boxes
  for (const side of [-1, 1]) {
    const zg = E + side * 1.4;
    b.box(mats.iron, EX0, Y, zg - 0.4, EX1, Y + 0.95, zg + 0.4);
    b.box(mats.iron, EX0, Y, zg - 0.55, EX1, Y + 0.1, zg + 0.55);
    for (let x = EX0 + 0.3; x < EX1 - 0.1; x += 0.6) for (const dz of [-0.48, 0.48]) nut(b, [x, Y + 0.1, zg + dz], [0, 1, 0], 0.035);
    for (let x = EX0 + 0.6; x < EX1 - 0.3; x += 1.2) b.box(mats.iron, x - 0.03, Y + 0.1, Math.min(zg + side * 0.4, zg + side * 0.52), x + 0.03, Y + 0.85, Math.max(zg + side * 0.4, zg + side * 0.52));
  }
  const bearings = [EX1 - 0.35, (UNITS[0].x + UNITS[1].x) / 2, (UNITS[1].x + UNITS[2].x) / 2, (UNITS[2].x + UNITS[3].x) / 2, EX0 + 0.35];
  for (const x of bearings) {
    b.box(mats.iron, x - 0.38, Y, E - 1.4, x + 0.38, yc - 0.3, E + 1.4);
    b.box(mats.steelDark, x - 0.33, yc + 0.32, E - 0.6, x + 0.33, yc + 0.55, E + 0.6);
    for (const dz of [-0.48, 0.48]) { tube(b, mats.brass, 'y', [x, E + dz], 0.05, yc + 0.55, yc + 0.72, { seg: 6 }); nut(b, [x, yc + 0.72, E + dz], [0, 1, 0], 0.05); }
    tube(b, mats.chrome, 'x', [yc, E], 0.36, x - 0.4, x + 0.4, { seg: 16 }); // main journal
    b.box(mats.brass, x + 0.1, yc + 0.55, E - 0.12, x + 0.3, yc + 0.72, E + 0.12);  // oil box
    tube(b, mats.copper, 'y', [x + 0.2, E + 0.2], 0.008, yc + 0.72, CYL0 - 0.1, { seg: 4, caps: false });
  }
  // cast A-frame columns: tapered round legs with flanged feet and heads, bolted; cross stays; guides; entablature
  for (const u of UNITS) {
    for (const side of [-1, 1]) {
      for (const dx of [-1, 1]) {
        const p = [u.x + dx * 1.05, Y + 0.95, E + side * 1.85], q = [u.x + dx * 0.55, Y + 5.85, E + side * 1.2];
        tubeBetween(b, mats.steelDark, p, q, 0.2, { r1: 0.15, seg: 12 });
        for (let k = 1; k <= 3; k++) { const t = k / 4, c = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t]; tubeBetween(b, mats.steelDark, [c[0], c[1] - 0.04, c[2]], [c[0], c[1] + 0.04, c[2]], 0.2 - 0.05 * t + 0.03, { seg: 12 }); }
        b.box(mats.steelDark, p[0] - 0.3, p[1], p[2] - 0.3, p[0] + 0.3, p[1] + 0.08, p[2] + 0.3);
        b.box(mats.steelDark, q[0] - 0.26, q[1] - 0.08, q[2] - 0.26, q[0] + 0.26, q[1], q[2] + 0.26);
        for (const [ex, ez] of [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]]) { nut(b, [p[0] + ex, p[1] + 0.08, p[2] + ez], [0, 1, 0], 0.03); nut(b, [q[0] + ex * 0.9, q[1] - 0.08, q[2] + ez * 0.9], [0, -1, 0], 0.03); }
      }
      b.box(mats.steelDark, u.x - 0.95, Y + 3.4, E + side * 1.42 - 0.08, u.x + 0.95, Y + 3.6, E + side * 1.42 + 0.08); // stay
      // crosshead guides with bolted backing bars
      b.box(mats.chrome, u.x - 0.32, Y + 3.15, E + side * 0.32 - 0.05, u.x + 0.32, Y + 5.85, E + side * 0.32 + 0.05);
      b.box(mats.steelDark, u.x - 0.45, Y + 3.15, E + side * 0.4, u.x + 0.45, Y + 5.85, E + side * 0.46);
      for (let y = Y + 3.3; y < Y + 5.8; y += 0.35) for (const dx of [-0.38, 0.38]) nut(b, [u.x + dx, y, E + side * 0.46], [0, 0, side], 0.022);
      b.box(mats.steelDark, u.x - 0.08, Y + 4.6, E + side * 0.46, u.x + 0.08, Y + 4.8, E + side * 1.35);
    }
    // piston-rod stuffing box (gland with studs) under the cylinder
    latheAt(b, mats.brass, [[0, 0], [0.2, 0], [0.2, 0.12], [0.26, 0.14], [0.26, 0.2], [0.17, 0.22], [0.17, 0.35], [0, 0.35]], 'y', [u.x, Y + 5.5, E], 14);
    for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + 0.4; nut(b, [u.x + Math.cos(a) * 0.22, Y + 5.7, E + Math.sin(a) * 0.22], [0, 1, 0], 0.025); }
  }
  b.box(mats.steelDark, EX0 + 0.2, Y + 5.85, E - 1.45, EX1 - 0.2, CYL0, E + 1.45);
  for (const side of [-1, 1]) rivetLine(b, [EX0 + 0.3, Y + 5.97, E + side * 1.452], [EX1 - 0.3, Y + 5.97, E + side * 1.452], [0, 0, side], 0.2, mats.steelDark);
  // cylinders: lagging, brass bands, flanged covers with stud rings, relief valves, drain cocks, lubricators, valve chests
  UNITS.forEach((u, i) => {
    const r = u.r + 0.08;
    tube(b, mats.paintGrey, 'y', [u.x, E], r, CYL0, CYL1, { seg: 28, caps: false });
    for (const y of [CYL0 + 0.12, (CYL0 + CYL1) / 2, CYL1 - 0.12]) tube(b, mats.brass, 'y', [u.x, E], r + 0.02, y - 0.05, y + 0.05, { seg: 28 });
    tube(b, mats.steelDark, 'y', [u.x, E], r + 0.1, CYL0 - 0.1, CYL0 + 0.02, { seg: 28 });
    tube(b, mats.steelDark, 'y', [u.x, E], r + 0.1, CYL1, CYL1 + 0.15, { seg: 28 });
    latheAt(b, mats.steelDark, [[r + 0.02, 0], [r * 0.85, 0.08], [r * 0.55, 0.2], [0.32, 0.26], [0.3, 0.32], [0, 0.33]], 'y', [u.x, CYL1 + 0.15, E], 24);
    const nStud = Math.round(r * 16);
    for (let k = 0; k < nStud; k++) { const a = (k / nStud) * Math.PI * 2; nut(b, [u.x + Math.cos(a) * (r + 0.05), CYL1 + 0.15, E + Math.sin(a) * (r + 0.05)], [0, 1, 0], 0.03); }
    for (const a of [0.8, 2.4]) { // spring-loaded relief valves on the cover
      const px = u.x + Math.cos(a) * r * 0.62, pz = E + Math.sin(a) * r * 0.62;
      latheAt(b, mats.brass, [[0, 0], [0.08, 0], [0.08, 0.05], [0.05, 0.07], [0.05, 0.3], [0.07, 0.32], [0.03, 0.4], [0, 0.42]], 'y', [px, CYL1 + 0.2, pz], 10);
    }
    tube(b, mats.brass, 'y', [u.x, E], 0.09, CYL1 + 0.46, CYL1 + 0.56, { seg: 10 }); // lifting eye boss
    for (const side of [-1, 1]) { // drain cocks with levers and pipes down to the bilge
      const dz = E + side * (r + 0.16);
      b.box(mats.brass, u.x - 0.06, CYL0 + 0.05, dz - 0.05, u.x + 0.06, CYL0 + 0.15, dz + 0.05);
      b.bar(mats.iron, [u.x, CYL0 + 0.15, dz], [u.x + 0.25, CYL0 + 0.18, dz], 0.02, 0.02);
      tube(b, mats.copper, 'y', [u.x, dz], 0.018, Y + 1.0, CYL0 + 0.05, { seg: 5, caps: false });
    }
    // lubricator box with sight-feed drip pipes to guides and crosshead
    const lz = E - s * 1.15;
    b.box(mats.brass, u.x - 0.25, CYL0, lz - 0.1, u.x + 0.25, CYL0 + 0.25, lz + 0.1);
    for (const dx of [-0.18, -0.06, 0.06, 0.18]) tubeBetween(b, mats.copper, [u.x + dx, CYL0, lz], [u.x + dx * 1.4, Y + 4.0, E - s * 0.48], 0.007, { seg: 4, caps: false });
    const vx = u.x + u.r + 0.55;
    tube(b, mats.paintGrey, 'y', [vx, E], 0.38, Y + 5.95, Y + 8.4, { seg: 16 });
    tube(b, mats.brass, 'y', [vx, E], 0.4, Y + 8.1, Y + 8.18, { seg: 16 });
    tube(b, mats.steelDark, 'y', [vx, E], 0.46, Y + 8.33, Y + 8.4, { seg: 16 });
    for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; nut(b, [vx + Math.cos(a) * 0.42, Y + 8.4, E + Math.sin(a) * 0.42], [0, 1, 0], 0.025); }
    tube(b, mats.chrome, 'y', [vx, E], 0.06, Y + 4.4, Y + 5.95, { seg: 6, caps: false }); // valve spindle guide
    latheAt(b, mats.brass, [[0, 0], [0.12, 0], [0.12, 0.1], [0.08, 0.12], [0.08, 0.2], [0, 0.2]], 'y', [vx, Y + 5.75, E], 10); // valve-rod gland
    // indicator cocks
    b.box(mats.brass, u.x - 0.08, CYL0 + 0.6, E - s * (r + 0.02) - 0.05, u.x + 0.08, CYL0 + 0.85, E - s * (r + 0.02) + 0.05);
    if (i < 3) {
      const nx = UNITS[i + 1].x + UNITS[i + 1].r + 0.55;
      lagged(b, [vx, Y + 8.85, E], [nx, Y + 8.85, E], 0.3, 0.6);
      for (const x of [vx, nx]) { lagged(b, [x, Y + 8.4, E], [x, Y + 8.85, E], 0.3, 0.6); flange(b, [x, Y + 8.85, E], [1, 0, 0], 0.38); }
    }
  });
  // Stephenson link motion: reversing shaft with arms and suspension links over the eccentrics of each unit
  const rsZ = E - s * 0.95, rsY = Y + 3.55;
  tube(b, mats.chrome, 'x', [rsY, rsZ], 0.07, EX0 + 0.3, EX1 - 0.2, { seg: 10 });
  for (const u of UNITS) {
    const vx = u.x + u.r + 0.55;
    b.box(mats.steelDark, vx - 0.05, rsY - 0.05, Math.min(rsZ, E), vx + 0.05, rsY + 0.05, Math.max(rsZ, E));
    for (const dz of [-0.4, 0.4]) b.box(mats.steelDark, vx - 0.03, Y + 3.0, E + dz - 0.03, vx + 0.03, rsY, E + dz + 0.03);
    for (const dx of [-0.3, 0.3]) b.box(mats.iron, vx + dx - 0.12, rsY - 0.2, rsZ - 0.12, vx + dx + 0.12, rsY - 0.08, rsZ + 0.12);
  }
  // reversing engine (steam cylinder + hydraulic control cylinder) with hand wheel at the forward end
  const rz = E - s * 1.6;
  latheAt(b, mats.steelDark, [[0, 0], [0.34, 0], [0.34, 0.08], [0.28, 0.1], [0.28, 1.9], [0.34, 1.92], [0.34, 2.0], [0, 2.02]], 'y', [EX1 + 0.25, Y, rz], 14);
  latheAt(b, mats.paintGrey, [[0, 0], [0.2, 0], [0.2, 1.2], [0, 1.22]], 'y', [EX1 + 0.25, Y + 2.02, rz], 12);
  tube(b, mats.chrome, 'y', [EX1 + 0.25, rz], 0.04, Y + 3.22, rsY, { seg: 6, caps: false });
  handwheel(b, mats.rust, EX1 + 0.64, Y + 1.4, rz, 0.4, [1, 0, 0]);
  tube(b, mats.iron, 'x', [Y + 1.4, rz], 0.04, EX1 + 0.25, EX1 + 0.64, { seg: 6 });
  world.addCollider(EX1, Y, rz - 0.35, EX1 + 0.55, Y + 2.2, rz + 0.35);
  // thrust block with horseshoe collars, turning gear (worm wheel on the shaft, worm and small engine) aft
  b.box(mats.iron, -43.9, Y, E - 0.95, -42.6, yc - 0.45, E + 0.95);
  for (const side of [-1, 1]) b.box(mats.iron, -43.9, yc - 0.45, Math.min(E + side * 0.95, E + side * 0.73), -42.6, yc + 0.45, Math.max(E + side * 0.95, E + side * 0.73));
  for (let k = 0; k < 6; k++) {
    const x = -43.75 + k * 0.2;
    b.box(mats.steelDark, x - 0.04, yc - 0.45, E - 0.73, x + 0.04, yc + 0.62, E + 0.73);
    for (const dz of [-0.62, 0.62]) nut(b, [x, yc + 0.62, E + dz], [0, 1, 0], 0.03);
  }
  b.box(mats.brass, -43.85, yc + 0.62, E - 0.15, -42.65, yc + 0.68, E + 0.15);
  for (const dz of [-0.5, 0.5]) tube(b, mats.copper, 'x', [yc + 0.5, E + dz], 0.025, -43.9, -42.6, { seg: 5 });
  tube(b, mats.iron, 'x', [yc, E], 0.82, -42.45, -42.15, { seg: 24 });
  for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2; b.box(mats.iron, -42.45, yc + Math.cos(a) * 0.84 - 0.03, E + Math.sin(a) * 0.84 - 0.03, -42.15, yc + Math.cos(a) * 0.84 + 0.03, E + Math.sin(a) * 0.84 + 0.03); }
  tube(b, mats.steelDark, 'z', [-42.3, yc + 0.95], 0.11, Math.min(E - s * 0.2, E - s * 1.3), Math.max(E - s * 0.2, E - s * 1.3), { seg: 10 });
  b.box(mats.paintGrey, -42.7, yc + 0.7, Math.min(E - s * 1.3, E - s * 1.9), -41.9, yc + 1.3, Math.max(E - s * 1.3, E - s * 1.9));
  b.box(mats.iron, EX0 - 0.15, Y, Math.min(E + s * 1.9, E + s * 2.2), EX0 + 0.6, Y + 1.5, Math.max(E + s * 1.9, E + s * 2.2));
  // colliders (stacked so that the galleries can run close to the engine)
  world.addCollider(-43.9, Y, E - 2.2, EX1, Y + 2.0, E + 2.2);
  world.addCollider(EX0, Y + 2.0, E - 1.9, EX1, Y + 6.0, E + 1.9);
  world.addCollider(EX0, Y + 6.0, E - 1.45, EX1, Y + 9.3, E + 1.45);

  tube(b, mats.chrome, 'x', [yc, E], 0.3, EX0 + 0.1, EX1 - 0.1, { seg: 14 }); // crankshaft through the main bearings (the cranks turn on it)
  // ---- moving parts (one set per crank): built-up crank with webs and balance weights, eccentric sheaves, rods
  const crankT = new TBatch();
  for (const dx of [-0.42, 0.42]) {
    crankT.box(mats.steel, dx - 0.11, -0.42, -0.42, dx + 0.11, CR + 0.27, 0.42);
    stamp(crankT, mats.steel, gcache('cwt', () => {
      const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.absarc(0, 0, 0.85, -Math.PI / 2 - Math.PI * 0.3, -Math.PI / 2 + Math.PI * 0.3, false); sh.lineTo(0, 0);
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.24, bevelEnabled: false, curveSegments: 10 }); g.translate(0, 0, -0.12); g.rotateY(Math.PI / 2); return g;
    }), M4(dx, 0, 0));
    for (const y of [CR, 0]) for (const dz of [-0.28, 0.28]) crankT.box(mats.iron, dx - 0.115, y - 0.03, dz - 0.03, dx + 0.115, y + 0.03, dz + 0.03);
  }
  tube(crankT, mats.chrome, 'x', [CR, 0], 0.27, -0.31, 0.31, { seg: 14, caps: false });
  tube(crankT, mats.chrome, 'x', [0, 0], 0.34, -0.53, 0.53, { seg: 14, caps: false });
  const crankParts = crankT.parts();
  const ECC = 0.13, EPH = [0, Math.PI * 0.85];
  const eccT = new TBatch();   // two sheaves keyed to the shaft at the valve-chest station
  EPH.forEach((ph, k) => tube(eccT, mats.steel, 'x', [ECC * Math.cos(ph), ECC * Math.sin(ph)], 0.48, (k ? 0.14 : -0.14) - 0.06, (k ? 0.14 : -0.14) + 0.06, { seg: 18 }));
  tube(eccT, mats.chrome, 'x', [0, 0], 0.3, -0.25, 0.25, { seg: 12, caps: false });
  const eccParts = eccT.parts();
  const rodT = new TBatch();
  tube(rodT, mats.chrome, 'y', [0, 0], 0.15, -CL / 2 + 0.25, CL / 2 - 0.45, { seg: 10, r1: 0.11, caps: false });
  rodT.box(mats.steel, -0.3, -CL / 2 - 0.3, -0.32, 0.3, -CL / 2 + 0.3, 0.32);   // big end with brasses and bolts
  rodT.box(mats.brass, -0.31, -CL / 2 - 0.04, -0.33, 0.31, -CL / 2 + 0.04, 0.33);
  for (const dx of [-0.24, 0.24]) for (const dz of [-0.26, 0.26]) tube(rodT, mats.iron, 'y', [dx, dz], 0.04, -CL / 2 - 0.33, -CL / 2 + 0.36, { seg: 6 });
  rodT.box(mats.steel, -0.2, CL / 2 - 0.5, -0.24, 0.2, CL / 2 - 0.35, 0.24);       // forked small end
  for (const dz of [-0.17, 0.17]) rodT.box(mats.steel, -0.2, CL / 2 - 0.35, dz - 0.06, 0.2, CL / 2 + 0.14, dz + 0.06);
  tube(rodT, mats.brass, 'z', [0, CL / 2], 0.09, -0.24, 0.24, { seg: 10 });
  const rodParts = rodT.parts();
  const xhT = new TBatch();
  xhT.box(mats.steel, -0.3, -0.18, -0.1, 0.3, 0.25, 0.1);
  for (const dz of [-1, 1]) { xhT.box(mats.brass, -0.3, -0.3, dz * 0.225, 0.3, 0.3, dz * 0.27); xhT.box(mats.steel, -0.3, -0.25, Math.min(dz * 0.1, dz * 0.225), 0.3, 0.25, Math.max(dz * 0.1, dz * 0.225)); }
  tube(xhT, mats.chrome, 'y', [0, 0], 0.11, 0.25, 2.65, { seg: 10, caps: false });
  tube(xhT, mats.steel, 'y', [0, 0], 0.16, 0.25, 0.42, { seg: 10 });
  const xhParts = xhT.parts();
  const vrT = new TBatch();     // valve rod, die block and the curved expansion link
  tube(vrT, mats.chrome, 'y', [0, 0], 0.05, 0, 1.5, { seg: 6, caps: false });
  vrT.box(mats.steel, -0.08, -0.1, -0.08, 0.08, 0.1, 0.08);
  for (let k = 0; k < 6; k++) { const a0 = -0.42 + k * 0.14, za = Math.sin(a0), zb = Math.sin(a0 + 0.14), ya = 1 - Math.cos(a0), yb = 1 - Math.cos(a0 + 0.14); for (const dx of [-0.07, 0.07]) vrT.bar(mats.steel, [dx, ya - 0.06, za], [dx, yb - 0.06, zb], 0.04, 0.12); }
  const vrParts = vrT.parts();
  const erT = new TBatch();     // eccentric rod (unit length along +y, scaled to the distance) and its strap round the sheave
  tube(erT, mats.steel, 'y', [0, 0], 0.035, 0.3, 1, { seg: 6, caps: false });
  const erParts = erT.parts();
  const esT = new TBatch();
  tube(esT, mats.steel, 'x', [0, 0], 0.55, -0.05, 0.05, { seg: 18 });
  const esParts = esT.parts();

  UNITS.forEach((u, i) => {
    const phase = (i * Math.PI) / 2 + (s > 0 ? Math.PI / 4 : 0);
    const crank = addMesh(world, crankParts, u.x, (g) => g.position.set(u.x, yc, E));
    const rod = addMesh(world, rodParts, u.x);
    const xh = addMesh(world, xhParts, u.x);
    const vx = u.x + u.r + 0.55;
    const vr = addMesh(world, vrParts, vx);
    const ecc = addMesh(world, eccParts, vx, (g) => g.position.set(vx, yc, E));
    const er = [0, 1].map(() => addMesh(world, erParts, vx)), es = [0, 1].map(() => addMesh(world, esParts, vx));
    anim.push((t) => {
      const th = t * W_ENG + phase, sn = Math.sin(th), cs = Math.cos(th);
      crank.rotation.x = th; ecc.rotation.x = th;
      const py = yc + CR * cs, pz = E + CR * sn;
      const yx = py + Math.sqrt(CL * CL - CR * CR * sn * sn);
      rod.position.set(u.x, (py + yx) / 2, (pz + E) / 2);
      rod.rotation.x = Math.atan2(E - pz, yx - py);
      xh.position.set(u.x, yx, E);
      const vy = Y + 3.1 + 0.22 * Math.cos(th + Math.PI / 2);
      vr.position.set(vx, vy, E);
      for (let k = 0; k < 2; k++) {
        // sheave centre in world: rotation.x of (0, cos ph, sin ph)·ECC by th
        const a = th + EPH[k], ey = yc + ECC * Math.cos(a), ez = E + ECC * Math.sin(a);
        const ly = vy + 0.03, lz = E + (k ? 0.4 : -0.4), dy = ly - ey, dz = lz - ez;
        const m = er[k], L = Math.sqrt(dy * dy + dz * dz); m.position.set(vx + (k ? 0.14 : -0.14), ey, ez); m.scale.set(1, L, 1); m.rotation.x = Math.atan2(dz, dy);
        es[k].position.set(vx + (k ? 0.14 : -0.14), ey, ez);
      }
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
    handwheel(b, mats.rust, -30.4, yp + 1.35, s * 2.2, 0.36, [0, 0, -s]); tube(b, mats.iron, 'z', [-30.4, yp + 1.35], 0.03, Math.min(s * 2.2, s * 2.38), Math.max(s * 2.2, s * 2.38), { seg: 6 });
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
  for (const [x, z] of [[-26.6, -11.6], [-24.4, -11.6], [-26.6, 11.9], [-24.4, 11.9]]) { pumpSet(b, x, z, z > 0 ? -1 : 1, 'z'); world.addCollider(x - 0.75, Y, z - 0.6, x + 0.75, Y + 2.6, z + 0.6); }
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

const TORG = (R, r) => gcache(`tor${R}_${r}`, () => new THREE.TorusGeometry(R, r, 4, 12));
let PUMP = null;
/** Vertical steam-driven pump (Weir pattern): bedplate, pump barrel, A-frame, steam cylinder, crank and flywheel. Front +x */
function pumpTemplate() {
  const t = new TBatch();
  t.box(mats.iron, -0.55, 0, -0.65, 0.55, 0.12, 0.65);
  for (const dx of [-0.45, 0.45]) for (const dz of [-0.55, 0.55]) nut(t, [dx, 0.12, dz], [0, 1, 0], 0.025);
  latheAt(t, mats.paintGrey, [[0, 0], [0.3, 0], [0.3, 0.06], [0.24, 0.08], [0.24, 0.9], [0.3, 0.92], [0.3, 0.98], [0, 1.0]], 'y', [0, 0.12, -0.25], 16);
  latheAt(t, mats.paintGrey, [[0, 0], [0.2, 0], [0.2, 0.75], [0, 0.77]], 'y', [0, 0.12, 0.3], 12); // air vessel
  for (const dz of [-0.45, 0.0]) tubeBetween(t, mats.steelDark, [0, 1.1, dz], [0, 1.85, dz], 0.06, { seg: 8 });
  latheAt(t, mats.steelDark, [[0, 0], [0.26, 0], [0.26, 0.06], [0.22, 0.08], [0.22, 0.55], [0.26, 0.57], [0.26, 0.63], [0, 0.65]], 'y', [0, 1.85, -0.25], 16);
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; nut(t, [Math.cos(a) * 0.24, 2.5, -0.25 + Math.sin(a) * 0.24], [0, 1, 0], 0.02); }
  t.box(mats.brass, -0.1, 2.0, -0.02, 0.1, 2.3, 0.12);   // valve chest / lubricator
  tube(t, mats.chrome, 'y', [0, -0.25], 0.035, 1.1, 1.85, { seg: 6 });
  // crankshaft across, flywheel with spokes on the +z side
  tube(t, mats.chrome, 'z', [0.0, 1.45], 0.04, -0.25, 0.62, { seg: 8 });
  tube(t, mats.iron, 'z', [0.0, 1.45], 0.5, 0.52, 0.6, { seg: 24 });
  tube(t, mats.iron, 'z', [0.0, 1.45], 0.08, 0.5, 0.62, { seg: 10 });
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI; stamp(t, mats.iron, gcache('spk', () => new THREE.BoxGeometry(0.04, 0.9, 0.035)), M4(0, 1.45, 0.56, 0, 0, a)); }
  dialAt(t, 0.32, 0.9, -0.25, 0.08);
  return t.parts();
}
function dialAt(t, x, y, z, r) { t.ring(mats.brass, [x + 0.01, y, z], [1, 0, 0], r, r + 0.025, 14); t.disc(kitMats.gaugeFace, [x + 0.012, y, z], [1, 0, 0], r, 14, true); }
function stampParts(b, parts, m) { for (const pt of parts) stamp(b, pt.mat, pt.geo, m, 'geo'); }
/** pump set at (x, z); dir ±1 = faces +x / -x ('z' axis: faces ±z) */
function pumpSet(b, x, z, dir, axis = 'x') {
  PUMP ??= pumpTemplate();
  const ry = axis === 'x' ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? -Math.PI / 2 : Math.PI / 2);
  stampParts(b, PUMP, M4(x, Y, z, 0, ry, 0));
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
      for (let x = xb + 0.2; x < xa - 0.1; x += 0.3) { nut(b, [x, yc + 0.08, s * (r + 0.1)], [0, 1, 0], 0.035); nut(b, [x, yc - 0.08, s * (r + 0.1)], [0, -1, 0], 0.035); }
    }
    for (const x of [xa, xb]) for (let k = 0; k < 28; k++) { const a = (k / 28) * Math.PI * 2; nut(b, [x + 0.09, yc + Math.cos(a) * (r + 0.02), Math.sin(a) * (r + 0.02)], [1, 0, 0], 0.03); }
    for (const dx of [0.35, -0.35]) { // lifting lugs (eye plates) on the top half
      const lx = (xa + xb) / 2 + dx * (xa - xb) / 2;
      b.box(mats.steelDark, lx - 0.04, yc + r - 0.05, -0.16, lx + 0.04, yc + r + 0.22, 0.16);
      stamp(b, mats.steelDark, TORG(0.09, 0.03), M4(lx, yc + r + 0.2, 0, 0, Math.PI / 2, 0));
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
    b.box(mats.steelDark, -54.6, Y + 2.9, s > 0 ? 1.9 : -8.5, -51.2, Y + 4.9, s > 0 ? 8.5 : -1.9);
    for (const x of [-54.0, -52.9, -51.8]) {
      b.box(mats.iron, x - 0.05, Y + 2.86, s > 0 ? 2.0 : -8.5, x + 0.05, Y + 4.94, s > 0 ? 8.5 : -2.0);
      for (const dx of [-0.08, 0.08]) rivetLine(b, [x + dx, Y + 4.902, s > 0 ? 2.1 : -8.4], [x + dx, Y + 4.902, s > 0 ? 8.4 : -2.1], [0, 1, 0], 0.15, mats.steelDark);
    }
    // main condensers
    const cz = s * 10.0, cy = Y + 2.1;
    tube(b, mats.steelDark, 'x', [cy, cz], 1.65, -56.4, -47.4, { seg: 28, caps: false });
    for (const x of [-56.4, -47.4]) tube(b, mats.iron, 'x', [cy, cz], 1.75, x - 0.1, x + 0.1, { seg: 28 });
    for (const [x0, d] of [[-47.3, 1], [-56.5, -1]]) {
      tube(b, mats.paintGrey, 'x', [cy, cz], 1.62, Math.min(x0, x0 + d * 0.35), Math.max(x0, x0 + d * 0.35), { seg: 28, caps: false }); // water box
      latheAt(b, mats.steelDark, [[1.72, 0], [1.72, 0.06], [1.5, 0.12], [1.0, 0.2], [0, 0.24]], d > 0 ? 'x' : '-x', [x0 + d * 0.35, cy, cz], 28);
      for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2; nut(b, [x0 + d * 0.41, cy + Math.cos(a) * 1.62, cz + Math.sin(a) * 1.62], [d, 0, 0], 0.035); }
      for (const dz of [-0.5, 0.5]) { b.box(mats.brass, Math.min(x0 + d * 0.55, x0 + d * 0.63), cy + 0.2 - 0.03, cz + dz - 0.2, Math.max(x0 + d * 0.55, x0 + d * 0.63), cy + 0.2 + 0.03, cz + dz + 0.2); }
      b.ring(mats.brass, [x0 + d * 0.58, cy - 0.6, cz], [d, 0, 0], 0.16, 0.2, 14); b.disc(kitMats.gaugeFace, [x0 + d * 0.585, cy - 0.6, cz], [d, 0, 0], 0.16, 14, true);
    }
    for (let x = -55.6; x < -47.6; x += 1.6) { tube(b, mats.iron, 'x', [cy, cz], 1.67, x - 0.04, x + 0.04, { seg: 28, caps: false }); rivetArcX(b, x, cy, cz, 1.68, -1.6, 1.6, 0.14, mats.iron); }
    for (const x of [-55.4, -51.9, -48.4]) b.box(mats.iron, x - 0.25, Y, cz - 1.3, x + 0.25, cy - 1.0, cz + 1.3);
    pipeRun(b, mats.copper, [[-46.8, cy - 0.6, cz], [-46.3, cy - 0.6, cz], [-46.3, Y + 0.4, cz], [-46.3, Y + 0.4, s * (floorHW(-46) - 0.3)]], 0.32, { seg: 10 });
    pipeRun(b, mats.copper, [[-57.0, cy + 0.6, cz], [-57.4, cy + 0.6, cz], [-57.4, cy + 0.6, s * (floorHW(-57) - 0.3)]], 0.32, { seg: 10 });
    world.addCollider(-57.2, Y, cz - 1.8, -46.6, cy + 1.8, cz + 1.8);
    // air pumps, circulating pumps, evaporators, feed heaters (outboard)
    const zone = world.zone(DECK, -50);
    pumpSet(b, -57.0, s * 12.0, 1); world.addCollider(-57.6, Y, s * 12.0 - 0.75, -56.4, Y + 2.6, s * 12.0 + 0.75);
    pumpSet(b, -45.2, s * 11.0, -1); world.addCollider(-45.8, Y, s * 11.0 - 0.75, -44.6, Y + 2.6, s * 11.0 + 0.75);
    place(zone, tankV({ r: 0.75, h: 3.2, mat: 'steelDark' }), -53.8, Y, s * 12.5, 0, { collide: true, world });
    place(zone, tankV({ r: 0.75, h: 3.2, mat: 'steelDark' }), -51.6, Y, s * 12.5, 0, { collide: true, world });
    place(zone, tankH({ r: 0.55, l: 2.6 }), -49.0, Y, s * 12.6, Math.PI / 2, { collide: true, world });
  }
  for (let x = -56; x < -45; x += 4) for (const z of [-8, 0, 8]) cageLamp(b, world, x, CEIL - 0.8, z + (z === 0 ? 3.6 : 0), { hang: CEIL, intensity: 1.1 });
  for (const s of [-1, 1]) for (const x of [-56.5, -48.5]) cageLamp(b, world, x, Y + 3.0, s * 4.5, { hang: CEIL, intensity: 0.8 });
}

// ------------------------------------------------------------------------------------------------ dynamo room

/** One engine-dynamo set along +x at z = 0 (x in world, y relative to the tank top): vertical two-crank enclosed engine
 *  on a bedplate, multipolar dynamo (yoke, pole pieces, laminated armature, commutator, brush rocker), outboard bearing. */
function dynamoSetTemplate() {
  const t = new TBatch(), cy = 1.25;
  t.box(mats.iron, -67.4, 0, -0.9, -61.0, 0.3, 0.9);
  for (let x = -67.2; x < -61.1; x += 0.6) for (const dz of [-0.8, 0.8]) nut(t, [x, 0.3, dz], [0, 1, 0], 0.025);
  // enclosed crank case with inspection doors, two cylinders on cast columns, covers with studs, valve chest, governor
  t.box(mats.paintGreen, -67.2, 0.3, -0.7, -64.9, 1.5, 0.7);
  for (const dx of [-0.6, 0.6]) for (const s of [-1, 1]) {
    t.box(mats.paintGreen, -66.05 + dx - 0.35, 0.5, s * 0.7, -66.05 + dx + 0.35, 1.3, s * 0.72);
    for (const y of [0.55, 1.25]) for (const ddx of [-0.3, 0.3]) nut(t, [-66.05 + dx + ddx, y, s * 0.72], [0, 0, s], 0.018);
    t.box(mats.brass, -66.05 + dx - 0.05, 0.85, s * 0.72, -66.05 + dx + 0.05, 0.95, s * 0.74);
  }
  for (const dx of [-0.6, 0.6]) {
    for (const dz of [-0.55, 0.55]) tubeBetween(t, mats.steelDark, [-66.05 + dx, 1.5, dz], [-66.05 + dx * 0.8, 2.4, dz * 0.7], 0.06, { seg: 8 });
    latheAt(t, mats.paintGreen, [[0, 0], [0.46, 0], [0.46, 0.06], [0.42, 0.08], [0.42, 0.85], [0.46, 0.87], [0.46, 0.92], [0.3, 0.98], [0, 1.0]], 'y', [-66.05 + dx, 2.36, 0], 18);
    for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; nut(t, [-66.05 + dx + Math.cos(a) * 0.43, 3.28, Math.sin(a) * 0.43], [0, 1, 0], 0.02); }
    t.box(mats.brass, -66.05 + dx - 0.12, 2.6, -0.48, -66.05 + dx + 0.12, 2.9, -0.44);
  }
  t.box(mats.paintGreen, -66.7, 2.5, -0.62, -65.4, 3.2, -0.42);
  latheAt(t, mats.brass, [[0, 0], [0.05, 0], [0.05, 0.25], [0.12, 0.3], [0.03, 0.42], [0, 0.45]], 'y', [-64.98, 1.5, 0.45], 10); // governor
  for (const s of [-1, 1]) stamp(t, mats.brass, gcache('gball', () => new THREE.SphereGeometry(0.045, 8, 6)), M4(-64.98, 1.8, 0.45 + s * 0.1));
  // dynamo: field yoke (ring) with bolted feet, pole pieces visible at the open ends, armature, commutator, brush gear
  latheAt(t, mats.paintGreen, [[0.62, 0], [0.9, 0], [0.92, 0.05], [0.92, 1.55], [0.9, 1.6], [0.62, 1.6], [0.62, 1.55], [0.86, 1.52], [0.86, 0.08], [0.62, 0.05]], 'x', [-64.2, cy, 0], 32);
  for (const x of [-64.15, -62.65]) { tube(t, mats.brass, 'x', [cy, 0], 0.94, x, x + 0.05, { seg: 32, caps: false }); t.ring(mats.brass, [x, cy, 0], [-1, 0, 0], 0.88, 0.94, 32); t.ring(mats.brass, [x + 0.05, cy, 0], [1, 0, 0], 0.88, 0.94, 32); }
  for (const s of [-1, 1]) t.box(mats.paintGreen, -64.1, 0.3, s * 0.55, -62.7, cy - 0.6, s * 0.9);
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 + Math.PI / 8; stamp(t, mats.steelDark, gcache('pole', () => new THREE.BoxGeometry(1.5, 0.22, 0.34)), M4(-63.4, cy + Math.cos(a) * 0.72, Math.sin(a) * 0.72, a, 0, 0)); stamp(t, mats.copper, gcache('coil', () => new THREE.BoxGeometry(1.3, 0.1, 0.42)), M4(-63.4, cy + Math.cos(a) * 0.8, Math.sin(a) * 0.8, a, 0, 0)); }
  tube(t, mats.steelDark, 'x', [cy, 0], 0.56, -64.15, -62.65, { seg: 24 });
  for (let x = -64.1; x < -62.7; x += 0.08) tube(t, mats.iron, 'x', [cy, 0], 0.565, x, x + 0.012, { seg: 24, caps: false });
  tube(t, mats.copper, 'x', [cy, 0], 0.4, -62.6, -62.05, { seg: 24 });       // commutator
  for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2; t.box(mats.rubber, -62.6, cy + Math.cos(a) * 0.401 - 0.006, Math.sin(a) * 0.401 - 0.006, -62.05, cy + Math.cos(a) * 0.401 + 0.006, Math.sin(a) * 0.401 + 0.006); }
  stamp(t, mats.brass, gcache('rocker', () => new THREE.TorusGeometry(0.62, 0.03, 5, 28)), M4(-62.3, cy, 0, 0, Math.PI / 2, 0));
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a);
    stamp(t, mats.brass, gcache('barm', () => { const g = new THREE.CylinderGeometry(0.018, 0.018, 0.2, 6); g.translate(0, 0.1, 0); return g; }), M4dir([-62.3, cy + c * 0.42, sn * 0.42], [0, c, sn]));
    stamp(t, mats.rubber, gcache('brush', () => new THREE.BoxGeometry(0.3, 0.06, 0.05)), M4(-62.35, cy + c * 0.43, sn * 0.43, a, 0, 0));
  }
  // outboard bearing pedestal with oil ring cover
  t.box(mats.iron, -61.6, 0.3, -0.38, -61.0, cy - 0.15, 0.38);
  latheAt(t, mats.iron, [[0, 0], [0.24, 0], [0.24, 0.5], [0, 0.52]], 'x', [-61.55, cy, 0], 14);
  t.box(mats.brass, -61.45, cy + 0.22, -0.08, -61.15, cy + 0.3, 0.08);
  tube(t, mats.chrome, 'x', [cy, 0], 0.1, -64.9, -60.95, { seg: 10 });
  // terminal box and maker's plate
  t.box(kitMats.slate, -63.6, cy + 0.9, -0.25, -63.0, cy + 1.05, 0.25);
  t.box(mats.brass, -63.55, cy + 0.6, 0.9, -63.05, cy + 0.75, 0.93);
  return t.parts();
}
let DYN = null;

/** Marble main switchboard (front +x, along z): iron frame, marble panels, ammeters / voltmeters, knife switches,
 *  breakers, field regulators, copper bus bars, brass hand rail. */
function marbleBoardTemplate(w) {
  const t = new TBatch(), n = Math.max(2, Math.round(w / 0.75)), pw = w / n, H = 2.3;
  t.box(mats.iron, -0.15, 0, -w / 2, 0, 0.12, w / 2);
  t.box(mats.iron, -0.15, H - 0.08, -w / 2, 0, H, w / 2);
  for (let i = 0; i <= n; i++) t.box(mats.iron, -0.15, 0, -w / 2 + i * pw - 0.03, 0.01, H, -w / 2 + i * pw + 0.03);
  for (let i = 0; i < n; i++) {
    const z = -w / 2 + (i + 0.5) * pw;
    t.box(mats.marble, -0.06, 0.15, z - pw / 2 + 0.03, 0, H - 0.1, z + pw / 2 - 0.03, 'X');
    for (const [dz, y] of [[-0.17, 1.95], [0.17, 1.95]]) { t.ring(mats.brass, [0.025, y, z + dz], [1, 0, 0], 0.11, 0.135, 18); tube(t, mats.brass, 'x', [y, z + dz], 0.135, 0, 0.025, { seg: 18, caps: false }); t.disc(kitMats.gaugeFace, [0.027, y, z + dz], [1, 0, 0], 0.11, 18, true); }
    // knife switches (two blades on porcelain bases, ebony handles), the middle one thrown
    for (let k = 0; k < 3; k++) {
      const y = 1.45 - k * 0.32, thrown = k === 1 && i % 2 === 0;
      for (const dz of [-0.07, 0.07]) {
        t.box(mats.porcelain, 0, y - 0.15, z + dz - 0.03, 0.03, y - 0.09, z + dz + 0.03); t.box(mats.porcelain, 0, y + 0.06, z + dz - 0.03, 0.03, y + 0.12, z + dz + 0.03);
        for (const ddz of [-0.012, 0.012]) t.box(mats.copper, 0.03, y + 0.07, z + dz + ddz - 0.004, 0.07, y + 0.11, z + dz + ddz + 0.004);
        stamp(t, mats.copper, gcache('blade', () => { const g = new THREE.BoxGeometry(0.012, 0.22, 0.016); g.translate(0, 0.11, 0); return g; }), M4(0.05, y - 0.12, z + dz, 0, 0, thrown ? -1.2 : 0));
      }
      const hy = thrown ? y - 0.12 + Math.cos(1.2) * 0.22 : y + 0.1, hx = thrown ? 0.05 + Math.sin(1.2) * 0.22 : 0.05;
      tube(t, kitMats.ebony, 'z', [hx, hy], 0.014, z - 0.12, z + 0.12, { seg: 6 });
    }
    // circuit breaker and field regulator hand wheel
    t.box(mats.iron, 0, 0.55, z - 0.12, 0.08, 0.75, z + 0.12); t.box(mats.copper, 0.08, 0.62, z - 0.03, 0.12, 0.68, z + 0.03);
    stamp(t, mats.brass, gcache('fr', () => new THREE.TorusGeometry(0.08, 0.008, 4, 14)), M4(0.06, 0.35, z, 0, Math.PI / 2, 0));
    tube(t, mats.brass, 'x', [0.35, z], 0.012, 0, 0.06, { seg: 5 });
  }
  // bus bars behind the top, brass hand rail on stanchions
  for (let k = 0; k < 3; k++) t.box(mats.copper, -0.13, H - 0.25 - k * 0.06, -w / 2, -0.11, H - 0.22 - k * 0.06, w / 2);
  tube(t, mats.brass, 'z', [0.32, 0.95], 0.02, -w / 2, w / 2, { seg: 8 });
  for (const zz of [-w / 2 + 0.05, w / 2 - 0.05]) { tubeBetween(t, mats.brass, [0.04, 0.95, zz], [0.32, 0.95, zz], 0.018, { seg: 6 }); }
  return t.parts();
}
const BOARDS = new Map();
function marbleBoard(b, x, z, w, rotY) {
  if (!BOARDS.has(w)) BOARDS.set(w, marbleBoardTemplate(w));
  stampParts(b, BOARDS.get(w), M4(x, Y, z, 0, rotY, 0));
}

function buildDynamoRoom(world, b, anim) {
  const zone = world.zone(DECK, -63);
  DYN ??= dynamoSetTemplate();
  const fwT = new TBatch();
  tube(fwT, mats.iron, 'x', [0, 0], 0.62, -0.08, 0.08, { seg: 20 });
  tube(fwT, mats.iron, 'x', [0, 0], 0.66, -0.1, 0.1, { seg: 20, caps: false });
  tube(fwT, mats.iron, 'x', [0, 0], 0.12, -0.14, 0.14, { seg: 10 });
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; fwT.box(mats.rust, -0.11, Math.cos(a) * 0.62 - 0.04, Math.sin(a) * 0.62 - 0.04, 0.11, Math.cos(a) * 0.62 + 0.04, Math.sin(a) * 0.62 + 0.04); }
  const fw = fwT.parts();
  for (const s of [-1, 1]) for (const zc of [7.7, 10.6]) {
    const z = s * zc;
    stampParts(b, DYN, M4(0, Y, z));
    pipeRun(b, mats.paintWhite, [[-66.05, Y + 3.38, z], [-66.05, LOW - 0.4, z], [-60, LOW - 0.4, z]], 0.1, { seg: 8 });
    world.addCollider(-67.4, Y, z - 0.95, -61.0, Y + 3.4, z + 0.95);
    const g = addMesh(world, fw, -64.6, (m) => m.position.set(-64.6, Y + 1.25, z));
    anim.push((t) => { g.rotation.x = t * 6.5; });
    // cables to the switchboard
    pipeRun(b, mats.rubber, [[-63.3, Y + 2.3, z], [-63.3, LOW - 0.25, z], [-58.4, LOW - 0.25, z]], 0.05, { seg: 6, flange: null });
  }
  // marble main switchboard on the forward bulkhead (starboard), auxiliary boards
  marbleBoard(b, -58.08, 10.2, 3.0, Math.PI); world.addCollider(-58.45, Y, 8.7, -58.0, Y + 2.3, 11.7);
  marbleBoard(b, -58.08, 12.5, 1.5, Math.PI); world.addCollider(-58.45, Y, 11.75, -58.0, Y + 2.3, 13.25);
  marbleBoard(b, -58.08, -10.2, 3.0, Math.PI); world.addCollider(-58.45, Y, -11.7, -58.0, Y + 2.3, -8.7);
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
      tube(tb, mats.steel, 'x', [0, 0], 0.3, xa, xb, { seg: 12 });
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
      for (const dz of [-0.4, 0.4]) { nut(b, [x - 0.2, yc + 0.46, L.z + dz], [0, 1, 0], 0.035); nut(b, [x + 0.2, yc + 0.46, L.z + dz], [0, 1, 0], 0.035); }
      for (const dz of [-0.42, 0.42]) for (const dx of [-0.25, 0.25]) nut(b, [x + dx, Y + 0.05, L.z + dz], [0, 1, 0], 0.03);
      // oil box with hinged brass lid, sight-feed drip cup, drain pipe and the drip tray under the bearing
      b.box(mats.brass, x - 0.14, yc + 0.56, L.z - 0.2, x + 0.14, yc + 0.72, L.z + 0.2);
      b.box(mats.brass, x - 0.15, yc + 0.72, L.z - 0.21, x + 0.15, yc + 0.74, L.z + 0.21);
      latheAt(b, mats.glass, [[0, 0], [0.035, 0], [0.035, 0.08], [0, 0.08]], 'y', [x + 0.24, yc + 0.56, L.z], 8);
      latheAt(b, mats.brass, [[0, 0], [0.04, 0], [0.04, 0.02], [0.02, 0.03], [0, 0.03]], 'y', [x + 0.24, yc + 0.64, L.z], 8);
      tube(b, mats.copper, 'y', [x - 0.3, L.z - 0.45], 0.01, Y + 0.1, yc + 0.2, { seg: 4, caps: false });
      b.box(mats.iron, x - 0.45, Y, L.z - 0.6, x + 0.45, Y + 0.04, L.z + 0.6, 'yYxXzZ');
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
