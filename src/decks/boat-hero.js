// Boat deck – hand-detailed rooms: bridge, wheelhouse, chart room, captain's and officers' quarters, Marconi rooms (operating
// room, silent room with the 5 kW rotary spark set, operators' cabin), gymnasium, Grand Staircase landings, service rooms.
import * as THREE from 'three';
import {
  shipsWheel, clockWall, gauge, chartTable, shelves, desk, chairDining, sofa, armchair, tableRound, tableRect,
  bookcase, heater, bedFirst, wardrobe, washbasinMarble, chest, marconiSet, machineBlock, switchboard, tankV, tankH, valve,
  locker, washstand, trunk, rowingMachine, electricHorse, electricCamel, cycleMachine, punchBag, bench, mirrorWall, pottedPalm,
  settee, servingCounter, pipe, matOf, sconce, def, kitMats, berthSecond, coatHooks, picture, faceDir,
} from '../interior/kit.js';
import { mats } from '../core/materials.js';
import { drawer, mattress, pillowAt, blanket, papers, bookRow, knob, rngOf } from '../interior/props-core.js';
import { AT } from '../interior/batch.js';
import { detailer, wput, iput, reserve, reserveExtDoors, wx, wz, boatWindows, extDoorSpans, deckMats, PR, modillion, ornRun, beginInst, runs } from './boat-util.js';
import { bcBeadRow } from './bc-props.js';
import { TIER } from '../core/tier.js';

/** fine-detail gate (docs/CONTRACT.md "Detail levels") */
const fine = (n) => TIER.fine >= n;

const FW = 7.35; // inner face of the forward house side walls
const K = kitMats, B = mats.brass, TEAK = mats.oak;

/**
 * Flat dial disc whose texture reads upright and unmirrored from the front (cylinder caps carry their UVs along z / x and
 * show lettering sideways or upside down). face: 'z' (+z), '-z', 'x' (+x), 'y-x' (lying, texture top towards −x).
 */
export function dialGeo(r, seg, face) {
  const g = new THREE.CircleGeometry(r, seg);
  if (face === 'x') g.rotateY(Math.PI / 2);
  else if (face === '-z') g.rotateY(Math.PI);
  else if (face === 'y-x') { g.rotateX(-Math.PI / 2); g.rotateY(Math.PI / 2); }
  return g;
}

// ============================================================================================== custom props (front +x)

/** teak deck grating (lattice of slats on battens) */
export const grating = def('abGrating', (o) => [o.w ?? 1.2, o.d ?? 1.2, 0.045], (p, o) => {
  const w = o.w ?? 1.2, d = o.d ?? 1.2;
  for (const x of [-d / 2 + 0.05, 0, d / 2 - 0.05]) p.b(TEAK, 0.05, 0.02, w, x, 0, 0);
  for (let z = -w / 2 + 0.03; z <= w / 2 - 0.02; z += 0.075) p.b(TEAK, d, 0.022, 0.04, 0, 0.02, z);
  for (const s of [-1, 1]) { p.bb(TEAK, d, 0.04, 0.05, 0, 0.002, s * (w / 2 - 0.025), 0.006); p.bb(TEAK, 0.05, 0.04, w, s * (d / 2 - 0.025), 0.002, 0, 0.006); }
});
/** engine-order telegraph with lettered dials (dock: docking / steering telegraph, smaller, single handle) */
export const telegraph2 = def('abTelegraph', (o) => [0.5, 0.45, o.dock ? 1.15 : 1.3], (p, o) => {
  const M = deckMats(), face = o.dock ? M.dockFace : M.telegraphFace, R = o.dock ? 0.16 : 0.21, yc = o.dock ? 0.98 : 1.1;
  p.lathe(B, [[0, 0], [0.17, 0], [0.17, 0.03], [0.12, 0.06], [0.08, 0.1], [0.065, 0.2], [0.055, yc - 0.3], [0.07, yc - 0.24], [0.09, yc - 0.2], [0, yc - 0.2]], 0, 0, 0, 16);
  p.rev(B, [{ o: 0.06, y: 0.25, m: 0.004 }, { o: 0.056, y: yc - 0.35, m: 0.004 }], { seg: 32, k: 16 }, 0, 0, 0);
  p.cz(B, R + 0.03, 0.18, 0, yc, 0, 28);
  for (const s of [-1, 1]) {
    p.add(dialGeo(R, 28, s > 0 ? 'z' : '-z'), face, 0, yc, s * 0.0925);
    p.t(B, R + 0.01, 0.014, 0, yc, s * 0.09, 'z', 28, 4);
    p.latheZ(mats.glass, [[0, 0], [R, 0], [R * 0.6, 0.02], [0, 0.025]], 0, yc, s * 0.094, 20, s);
    p.b(mats.iron, 0.012, R * 0.8, 0.004, 0, yc, s * 0.097).rotation.z = -0.5; // pointer
    if (!o.dock || s > 0) {
      const h = p.b(B, 0.03, 0.4, 0.02, 0.08, yc - 0.15, s * 0.125); h.rotation.z = -0.45;
      p.lathe(K.ebony, [[0, 0], [0.025, 0], [0.03, 0.04], [0.02, 0.09], [0, 0.1]], 0.18, yc + 0.2, s * 0.125, 10).rotation.z = -0.45;
    }
  }
  p.lathe(B, [[0, 0], [0.06, 0], [0.05, 0.04], [0, 0.06]], 0, yc + R + 0.02, 0, 12);
});
/** binnacle: teak pedestal, brass hood with compass card under glass, correcting spheres, Flinders bar, oil lamp */
export const binnacle2 = def('abBinnacle', [0.75, 0.55, 1.45], (p) => {
  const M = deckMats();
  p.lathe(mats.woodDark, [[0, 0], [0.25, 0], [0.25, 0.05], [0.19, 0.1], [0.15, 0.2], [0.14, 0.78], [0.18, 0.9], [0.19, 0.98], [0, 0.98]], 0, 0, 0, 16);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; p.b(B, 0.012, 0.6, 0.012, Math.cos(a) * 0.15, 0.2, Math.sin(a) * 0.15); }
  p.lathe(B, [[0, 0.98], [0.2, 0.98], [0.2, 1.08], [0.19, 1.1], [0, 1.1]], 0, 0, 0, 20);
  p.add(dialGeo(0.16, 28, 'y-x'), M.compassFace, 0, 1.104, 0); // N towards the helmsman's far side
  p.lathe(mats.glass, [[0.19, 1.1], [0.18, 1.15], [0.12, 1.2], [0, 1.21]], 0, 0, 0, 20);
  p.lathe(B, [[0, 1.26], [0.12, 1.24], [0.2, 1.17], [0.21, 1.13], [0.205, 1.13], [0.19, 1.16], [0.12, 1.22], [0, 1.24]].reverse(), 0, 0, 0, 20);
  p.lathe(B, [[0, 1.24], [0.04, 1.25], [0.04, 1.4], [0.06, 1.42], [0, 1.45]], -0.1, 0, 0, 10);
  for (const s of [-1, 1]) { p.b(B, 0.05, 0.03, 0.2, 0, 1.0, s * 0.27); p.s(mats.iron, 0.095, 0, 1.06, s * 0.36, 1, 1, 1, false); p.c(B, 0.02, 0.04, 0, 0.98, s * 0.36, 8); }
  p.c(B, 0.045, 0.42, 0.21, 0.5, 0, 10); p.lathe(B, [[0, 0], [0.05, 0], [0.04, 0.04], [0, 0.05]], 0.21, 0.92, 0, 8); // Flinders bar
  p.bb(B, 0.06, 0.1, 0.08, -0.22, 1.02, 0, 0.01); p.b(mats.lampGlow, 0.01, 0.05, 0.05, -0.19, 1.04, 0); // lamp
});
/** brass voice pipes rising from the deck with bell mouths and hinged whistle caps */
export const voicePipes = def('abVoicePipes', (o) => [0.3 * (o.n ?? 2), 0.3, 1.45], (p, o) => {
  const n = o.n ?? 2;
  for (let i = 0; i < n; i++) {
    const z = (i - (n - 1) / 2) * 0.24, h = 1.25 + (i % 2) * 0.12;
    p.c(B, 0.032, h - 0.12, -0.05, 0, z, 10);
    p.tube(B, [[-0.05, h - 0.14, z], [-0.04, h - 0.04, z], [0.02, h, z], [0.08, h, z]], 0.032, 8, 8);
    p.latheX(B, [[0, 0], [0.034, 0], [0.05, 0.05], [0.07, 0.08], [0.066, 0.085], [0, 0.07]], 0.08, h, z, 12);
    p.latheX(B, [[0, 0], [0.07, 0], [0.07, 0.012], [0, 0.03]], 0.165, h + 0.03, z, 12).rotation.z = -Math.PI / 2 + 0.9;
    p.lathe(B, [[0, 0], [0.06, 0], [0.05, 0.02], [0, 0.02]], -0.05, 0, z, 10);
  }
});
/** wall telephone (mahogany case, twin bells, handset on its hook, crank) – origin = mounting point */
export const phone = def('abPhone', [0.26, 0.14, 0.42], (p) => {
  p.bb(mats.mahogany, 0.1, 0.36, 0.22, 0.05, -0.2, 0, 0.01);
  for (const s of [-1, 1]) p.lathe(B, [[0, 0], [0.045, 0], [0.045, 0.006], [0.03, 0.03], [0, 0.04]], 0.07, 0.06, s * 0.05, 12).rotation.z = -Math.PI / 2;
  p.lathe(K.ebony, [[0, 0], [0.03, 0], [0.028, 0.02], [0.012, 0.04], [0, 0.05]], 0.1, -0.05, 0, 10).rotation.z = -Math.PI / 2; // mouthpiece
  p.lathe(K.ebony, [[0, 0], [0.022, 0], [0.018, 0.14], [0.03, 0.16], [0.03, 0.2], [0, 0.2]], 0.08, -0.28, -0.14, 10);
  p.b(B, 0.03, 0.02, 0.04, 0.06, -0.07, -0.12);
  // magneto crank on the right-hand side of the case: axle out of the side, arm, ebony handle
  p.cz(B, 0.008, 0.05, 0.05, -0.12, 0.13, 6); p.b(B, 0.012, 0.08, 0.01, 0.05, -0.2, 0.158); p.latheZ(K.ebony, [[0, 0], [0.012, 0], [0.012, 0.04], [0, 0.04]], 0.05, -0.19, 0.163, 8);
  p.b(mats.paper, 0.004, 0.07, 0.1, 0.101, -0.19, 0.0); // instruction card on the case front
});
/** ship's bell on a bracket – origin = mounting point */
export const bell = def('abBell', [0.3, 0.3, 0.45], (p) => {
  p.bb(B, 0.03, 0.12, 0.08, 0.015, -0.06, 0, 0.004);
  p.b(B, 0.2, 0.025, 0.03, 0.11, 0.0, 0);
  p.lathe(B, [[0, 0], [0.11, 0], [0.105, 0.02], [0.08, 0.1], [0.07, 0.17], [0.05, 0.2], [0, 0.21]], 0.18, -0.22, 0, 18);
  p.lathe(B, [[0, 0], [0.1, 0], [0.075, 0.1], [0.065, 0.17], [0, 0.19]], 0.18, -0.21, 0, 18);
  p.tube(mats.rope, [[0.18, -0.2, 0], [0.18, -0.3, 0.01], [0.17, -0.4, 0.02]], 0.008, 6, 4);
});
/** chronometer in its brass-bound mahogany box, lid open, dial under glass */
export const chrono = def('abChrono', [0.22, 0.22, 0.24], (p) => {
  p.bb(mats.mahogany, 0.2, 0.14, 0.2, 0, 0, 0, 0.006);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.b(B, 0.03, 0.14, 0.03, sx * 0.09, 0, sz * 0.09);
  p.c(B, 0.07, 0.012, 0, 0.14, 0, 16); p.add(dialGeo(0.06, 16, 'y-x'), K.clockFace, 0, 0.153, 0); p.lathe(mats.glass, [[0, 0], [0.065, 0], [0.04, 0.01], [0, 0.012]], 0, 0.156, 0, 12);
  const lid = p.bb(mats.mahogany, 0.012, 0.18, 0.2, -0.1, 0.14, 0, 0.004); lid.rotation.z = 0.25;
});
/** marine barometer (carved case, dial, thermometer) – wall mounted */
export const barometer = def('abBarometer', [0.3, 0.08, 0.9], (p) => {
  p.extX(mats.mahogany, [[-0.13, -0.45], [0.13, -0.45], [0.13, 0.08], [0.15, 0.2], [0.1, 0.32], [0, 0.36], [-0.1, 0.32], [-0.15, 0.2], [-0.13, 0.08]], 0.03, 0.015, 0, 0, 0.005);
  p.add(dialGeo(0.12, 24, 'x'), K.gaugeFace, 0.032, 0.18, 0); p.t(B, 0.125, 0.01, 0.034, 0.18, 0, 'x', 24, 4);
  p.b(mats.glass, 0.006, 0.36, 0.03, 0.033, -0.35, 0); p.b(mats.paper, 0.004, 0.34, 0.06, 0.031, -0.34, 0); p.c(mats.navRed, 0.004, 0.2, 0.038, -0.34, 0, 6);
});
/** signal-flag locker: pigeon holes with rolled flags */
export const flagLocker = def('abFlagLocker', [1.5, 0.5, 1.3], (p) => {
  const m = TEAK, cols = 6, rows = 5, w = 1.5, h = 1.2;
  p.bb(m, 0.5, 0.06, w, 0, 0, 0, 0.008);
  p.b(m, 0.02, h, w, -0.24, 0.06, 0);
  for (let i = 0; i <= cols; i++) p.b(m, 0.48, h, 0.02, 0, 0.06, -w / 2 + 0.01 + (i * (w - 0.02)) / cols);
  for (let j = 0; j <= rows; j++) p.b(m, 0.48, 0.02, w, 0, 0.06 + (j * (h - 0.02)) / rows, 0);
  const cells = [AT.red, AT.yellow, AT.navy, AT.whitePaint, AT.black, AT.labelBlue, AT.redPaint, AT.flowerYellow];
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const z = -w / 2 + ((i + 0.5) * w) / cols, y = 0.08 + (j * (h - 0.02)) / rows;
    for (let k = 0; k < 2; k++) p.alathe(cells[(i * 3 + j * 5 + k) % cells.length], [[0, 0], [0.05, 0], [0.05, 0.3], [0, 0.3]], -0.06, y + 0.06, z + (k - 0.5) * 0.11, 8).rotation.z = -Math.PI / 2; // rolled flags, ends just proud of the front
  }
  p.bb(m, 0.54, 0.04, w + 0.04, 0, h + 0.06, 0, 0.01);
});
/** wall clock with a chosen face (Marconi clock with the silence periods) – origin = mounting point */
export const clock2 = def('abClock', [0.4, 0.08, 0.4], (p, o) => {
  const face = deckMats()[o.face ?? 'marconiClock'];
  p.t(mats.woodDark, 0.18, 0.025, 0.02, 0, 0, 'x', 28, 6);
  p.cx(mats.woodDark, 0.18, 0.03, 0.015, 0, 0, 24);
  p.add(dialGeo(0.16, 28, 'x'), face, 0.031, 0, 0);
  p.t(B, 0.165, 0.01, 0.036, 0, 0, 'x', 28, 4);
  p.latheX(mats.glass, [[0, 0], [0.16, 0], [0.12, 0.012], [0, 0.016]], 0.036, 0, 0, 20);
});
/** pneumatic tube receiver to the enquiry office (brass tube up through the deck head, receiving cup, canister) */
export const pneumatic = def('abPneumatic', [0.3, 0.2, 2.6], (p) => {
  p.c(B, 0.035, 2.6, -0.04, 0, 0, 10);
  p.lathe(B, [[0, 0.9], [0.09, 0.9], [0.1, 0.95], [0.07, 1.05], [0.04, 1.12], [0, 1.12]], -0.04, 0, 0, 12);
  p.c(mats.leather, 0.03, 0.2, 0.06, 0.92, 0.06, 10).rotation.z = 0.2;
  p.lathe(B, [[0, 0], [0.04, 0], [0.04, 0.03], [0, 0.03]], -0.04, 1.4, 0, 10);
  p.cx(B, 0.012, 0.12, 0.03, 1.42, 0, 6);
});
/** motor-generator (rotary converter) on its bedplate (silent room) */
export const motorGen = def('abMotorGen', [1.6, 0.75, 0.75], (p) => {
  const g = mats.paintGreen;
  p.bb(mats.iron, 0.7, 0.1, 1.6, 0, 0, 0, 0.01);
  for (const [z, r, l] of [[-0.42, 0.24, 0.55], [0.38, 0.27, 0.6]]) {
    p.cz(g, r, l, 0, 0.42, z, 24);
    for (const s of [-1, 1]) p.latheZ(g, [[0, 0], [r * 0.95, 0], [r * 0.8, 0.06], [0.08, 0.1], [0, 0.11]], 0, 0.42, z + s * l / 2, 20, s);
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; p.b(mats.iron, 0.03, 0.03, l - 0.06, Math.cos(a) * (r + 0.005), 0.42 + Math.sin(a) * (r + 0.005) - 0.015, z); }
    p.bb(g, 0.4, 0.14, l * 0.7, 0, 0.1, z, 0.01);
    p.bb(mats.iron, 0.14, 0.1, 0.18, 0.18, 0.62, z, 0.01);
  }
  p.cz(mats.chrome, 0.04, 0.3, 0, 0.42, -0.02, 10); p.cz(mats.iron, 0.09, 0.08, 0, 0.42, -0.04, 16);
});
/** rotary spark discharger: studded disc in a glazed case on an iron stand */
export const discharger = def('abDischarger', [0.7, 0.6, 1.3], (p) => {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.b(mats.iron, 0.04, 0.6, 0.04, sx * 0.25, 0, sz * 0.3);
  p.bb(mats.iron, 0.6, 0.04, 0.7, 0, 0.6, 0, 0.006);
  p.bb(mats.iron, 0.04, 0.6, 0.66, -0.26, 0.64, 0, 0.006);
  for (const s of [-1, 1]) p.bb(mats.iron, 0.52, 0.6, 0.03, 0, 0.64, s * 0.33, 0.006);
  p.bb(mats.iron, 0.55, 0.04, 0.7, 0, 1.24, 0, 0.006);
  p.b(mats.glass, 0.01, 0.56, 0.62, 0.27, 0.66, 0);
  p.cx(B, 0.22, 0.02, 0, 0.94, 0, 28);
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; p.cx(mats.copper, 0.012, 0.07, 0, 0.94 + Math.sin(a) * 0.23, Math.cos(a) * 0.23, 6); }
  p.cx(mats.iron, 0.04, 0.3, -0.12, 0.94, 0, 10);
  for (const s of [-1, 1]) p.lathe(mats.porcelain, [[0, 0], [0.03, 0], [0.02, 0.03], [0.03, 0.06], [0.02, 0.09], [0, 0.1]], 0.1, 1.28, s * 0.2, 8);
});
/** condenser rack (Leyden-jar battery in an oak frame) */
export const condensers = def('abCondensers', [1.2, 0.5, 1.3], (p) => {
  const m = TEAK;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.b(m, 0.05, 1.3, 0.05, sx * 0.22, 0, sz * 0.57);
  for (const y of [0.05, 0.62]) p.bb(m, 0.48, 0.03, 1.18, 0, y, 0, 0.006);
  for (const y of [0.08, 0.65]) for (let i = 0; i < 6; i++) for (const x of [-0.1, 0.11]) {
    const z = -0.47 + i * 0.19;
    p.lathe(mats.glass, [[0, 0], [0.07, 0], [0.07, 0.4], [0.06, 0.42], [0, 0.42]], x, y, z, 10);
    p.lathe(mats.copper, [[0.072, 0], [0.072, 0.3], [0, 0.3], [0, 0]], x, y, z, 10);
    p.c(B, 0.006, 0.16, x, y + 0.42, z, 6); p.s(B, 0.018, x, y + 0.58, z);
  }
  p.cz(mats.copper, 0.008, 1.1, 0.11, 1.25, 0, 6); p.cz(mats.copper, 0.008, 1.1, -0.1, 1.25, 0, 6);
});
/** induction coil / oscillation transformer with porcelain insulators */
export const inductionCoil = def('abInductionCoil', [0.8, 0.5, 0.9], (p) => {
  p.bb(mats.woodDark, 0.5, 0.5, 0.8, 0, 0, 0, 0.01);
  p.cz(mats.copper, 0.16, 0.5, 0, 0.7, 0, 20);
  for (let i = 0; i < 8; i++) p.t(mats.copper, 0.165, 0.008, 0, 0.7, -0.22 + i * 0.063, 'z', 20, 3);
  for (const s of [-1, 1]) { p.bb(K.ebony, 0.36, 0.38, 0.04, 0, 0.5, s * 0.28, 0.006); p.lathe(mats.porcelain, [[0, 0], [0.035, 0], [0.025, 0.04], [0.035, 0.08], [0.025, 0.12], [0, 0.13]], 0, 0.88, s * 0.28, 8); }
});
/** wall bars (gymnasium) */
export const wallBars = def('abWallBars', (o) => [o.w ?? 0.9, 0.16, 2.4], (p, o) => {
  const w = o.w ?? 0.9;
  for (const s of [-1, 1]) p.bb(mats.pine, 0.1, 2.4, 0.06, 0.05, 0, s * (w / 2 - 0.03), 0.01);
  for (let y = 0.15; y < 2.35; y += 0.15) p.cz(TEAK, 0.017, w - 0.1, 0.07, y, 0, 8);
});
/** dumbbell rack with Indian clubs and a medicine ball */
export const dumbbells = def('abDumbbells', [1.2, 0.45, 0.9], (p) => {
  for (const s of [-1, 1]) p.extZ(TEAK, [[-0.2, 0], [0.2, 0], [0.12, 0.8], [-0.12, 0.8]], 0.05, 0, 0, s * 0.55, 0.005);
  for (const [y, x] of [[0.35, 0.08], [0.6, 0.0]]) p.bb(TEAK, 0.18, 0.03, 1.1, x, y, 0, 0.006);
  for (let i = 0; i < 5; i++) for (const [y, x, r] of [[0.38, 0.08, 0.05 + i * 0.008], [0.63, 0.0, 0.035 + i * 0.005]]) {
    const z = -0.42 + i * 0.21;
    for (const s of [-1, 1]) p.s(mats.iron, r, x, y + r, z + s * 0.06, 1, 1, 1, false);
    p.cz(mats.iron, 0.012, 0.12, x, y + r, z, 6);
  }
  for (let i = 0; i < 4; i++) p.lathe(TEAK, [[0, 0], [0.045, 0], [0.05, 0.12], [0.03, 0.3], [0.014, 0.42], [0.022, 0.46], [0, 0.47]], 0.3, 0, -0.45 + i * 0.12, 10);
  p.s(mats.leather, 0.13, 0.32, 0.13, 0.35, 1, 1, 1, false);
});
/** wall pulley weight machine – origin = mounting point at floor level on the wall */
export const pulleyMachine = def('abPulley', [0.55, 0.3, 2.2], (p) => {
  for (const s of [-1, 1]) p.b(mats.iron, 0.04, 2.1, 0.03, 0.04, 0.05, s * 0.12);
  p.bb(TEAK, 0.06, 0.1, 0.5, 0.03, 0, 0, 0.006); p.bb(TEAK, 0.06, 0.1, 0.5, 0.03, 2.08, 0, 0.006);
  for (let i = 0; i < 6; i++) p.bb(mats.iron, 0.08, 0.035, 0.2, 0.05, 0.1 + i * 0.037, 0, 0.004);
  p.cx(B, 0.05, 0.03, 0.08, 2.0, 0, 12); p.cx(B, 0.04, 0.03, 0.12, 1.6, 0.0, 12);
  p.tube(mats.rope, [[0.06, 0.32, 0], [0.07, 1.9, 0], [0.12, 2.0, 0], [0.16, 1.6, 0], [0.24, 1.1, 0]], 0.007, 10, 4);
  p.lathe(TEAK, [[0, 0], [0.018, 0], [0.018, 0.14], [0, 0.14]], 0.24, 1.0, 0, 8).rotation.x = Math.PI / 2;
});
/** officer's mahogany bunk with drawers under, made up with a White Star counterpane */
export const officerBunk = def('abOfficerBunk', [2.0, 0.85, 1.0], (p) => {
  const m = mats.mahogany;
  p.bb(m, 0.85, 0.42, 2.0, 0, 0, 0, 0.01);
  for (const z of [-0.5, 0.5]) drawer(p, m, 0.9, 0.3, 0.425, 0.22, z, 2, true);
  p.bb(m, 0.05, 0.6, 2.0, -0.4, 0.42, 0, 0.008);
  for (const s of [-1, 1]) p.bb(m, 0.85, 0.5, 0.05, 0, 0.42, s * 0.975, 0.008);
  p.bb(m, 0.06, 0.06, 1.9, 0.41, 0.56, 0, 0.01); // bunk board
  mattress(p, 0.74, 1.88, 0.14, -0.02, 0.44, 0);
  pillowAt(p, 0.5, 0.36, 0.1, -0.05, 0.58, -0.72);
  blanket(p, K.blanketWS, 0.76, -0.02, 0.58, -0.45, 0.95, 0.12);
});
/** sextant in its open mahogany box */
export const sextantBox = def('abSextant', [0.3, 0.28, 0.14], (p) => {
  p.bb(mats.mahogany, 0.26, 0.1, 0.3, 0, 0, 0, 0.005);
  p.ab(AT.felt, 0.22, 0.004, 0.26, 0, 0.1, 0);
  const lid = p.bb(mats.mahogany, 0.015, 0.26, 0.3, -0.13, 0.1, 0, 0.004); lid.rotation.z = 0.35;
  const g = p.loft(B, [[-0.08, 0.11, -0.1], [0.0, 0.11, -0.12], [0.08, 0.11, -0.08], [0.1, 0.11, 0.0], [0.08, 0.11, 0.08], [0.0, 0.11, 0.12], [-0.08, 0.11, 0.1]], 0.006, 4, false); void g;
  p.b(B, 0.18, 0.008, 0.01, 0.0, 0.11, 0); p.cx(mats.iron, 0.015, 0.1, 0.0, 0.125, 0.06, 8);
});

/** modillion cornice under the kit cornice along wall w (a..e), left out at the pilasters pil and skip intervals; instanced */
function modRunB(ctx, d, w, a, e, pil = [], skip = [], off = 0) {
  const I = ctx.inst;
  ornRun(w, a + 0.12, e - 0.12, 0.3, () => modillion({ mat: 'oak', leaf: fine(3) ? 'gold' : undefined }), (pr, x, z, r, y) => { ctx.plan.prop(pr, x, z, r, { y, collide: false }); I?.take(pr); }, d.Y + d.H - 0.16, off, [...pil.map((q) => [q - 0.25, q + 0.25]), ...skip]);
}
/** officer's uniform cap (navy cloth, black patent peak, gilt White Star badge) lying on its side */
const officerCap = def('abOfficerCap', [0.28, 0.26, 0.12], (p) => {
  p.lathe(mats.fabricBlue, [[0, 0], [0.1, 0], [0.11, 0.05], [0.13, 0.08], [0.12, 0.1], [0, 0.105]], 0, 0, 0, 12);
  p.b(mats.rubber, 0.012, 0.018, 0.2, 0.1, 0.0, 0).rotation.z = 0.4;
  p.extY(mats.rubber, [[0.06, -0.09], [0.15, -0.06], [0.17, 0], [0.15, 0.06], [0.06, 0.09]], 0.008, 0, 0.0, 0);
  p.s(mats.gold, 0.018, 0.112, 0.045, 0, 0.4, 1, 1.4);
});
/** closed log book (lying) */
const bookRowLog = def('abLogBook', [0.3, 0.24, 0.05], (p) => { p.bb(mats.leather, 0.3, 0.04, 0.22, 0, 0, 0, 0.004); p.b(mats.paper, 0.29, 0.032, 0.2, 0.004, 0.004, 0.004); p.ab(AT.gilt, 0.1, 0.002, 0.04, 0, 0.04, 0); });
/** officer's binoculars (lying) */
export const binoculars = def('abBinoculars', [0.14, 0.18, 0.06], (p) => {
  for (const s of [-1, 1]) {
    p.latheX(K.ebony, [[0, 0], [0.026, 0], [0.026, 0.03], [0.022, 0.05], [0.022, 0.1], [0.028, 0.11], [0.028, 0.13], [0, 0.13]], -0.065, 0.028, s * 0.034, 10);
    p.latheX(B, [[0.022, 0], [0.024, 0], [0.024, 0.012], [0.022, 0.012]], 0.052, 0.028, s * 0.034, 10);
  }
  p.b(B, 0.03, 0.012, 0.04, 0.0, 0.045, 0); p.tube(mats.leather, [[-0.05, 0.05, -0.06], [-0.04, 0.012, -0.09], [0.03, 0.004, -0.08], [0.06, 0.01, -0.05]], 0.004, 6, 3);
});
/** brass megaphone hanging on a hook – origin = hook on the wall */
export const megaphone = def('abMegaphone', [0.24, 0.24, 0.62], (p) => {
  p.b(B, 0.04, 0.012, 0.012, 0.02, -0.006, 0);
  const m = p.lathe(B, [[0.02, 0], [0.024, 0.01], [0.03, 0.1], [0.06, 0.3], [0.1, 0.48], [0.108, 0.5], [0.1, 0.5], [0.054, 0.3], [0.022, 0.1], [0.016, 0.01], [0.02, 0]], 0.1, -0.56, 0, 14); void m;
  p.t(B, 0.018, 0.004, 0.06, -0.03, 0, 'z', 8, 3);
});
/** pendulum clinometer (heel indicator): brass arc scale on a mahogany board – wall mounted, origin = centre */
export const clinometer = def('abClinometer', [0.44, 0.06, 0.3], (p) => {
  p.bb(mats.mahogany, 0.02, 0.28, 0.44, 0.01, -0.14, 0, 0.004);
  const arc = []; for (let i = 0; i <= 12; i++) { const a = -0.9 + (1.8 * i) / 12; arc.push([0.024, 0.1 - Math.cos(a) * 0.19, Math.sin(a) * 0.19]); }
  p.tube(B, arc, 0.006, 12, 4);
  for (let i = 0; i <= 8; i++) { const a = -0.8 + (1.6 * i) / 8, t = p.b(i === 4 ? mats.hullRed : mats.iron, 0.004, 0.025, 0.004, 0.024, 0.1 - Math.cos(a) * 0.175 - 0.0125, Math.sin(a) * 0.175); t.rotation.x = a; }
  p.s(B, 0.012, 0.026, 0.1, 0, 1, 1, 1); const pd = p.b(mats.iron, 0.004, 0.2, 0.006, 0.028, -0.09, 0.0); pd.rotation.x = 0.08;
  p.latheX(mats.glass, [[0, 0], [0.2, 0], [0.18, 0.01], [0, 0.012]], 0.03, -0.02, 0, 16).scale.set(1, 0.6, 1);
});
/** course board: mahogany board with slotted brass figure plates (course to steer) – wall mounted, origin = centre */
export const courseBoard = def('abCourseBoard', [0.5, 0.05, 0.3], (p) => {
  p.bb(mats.mahogany, 0.022, 0.3, 0.5, 0.011, -0.15, 0, 0.005);
  p.ab(AT.gilt, 0.004, 0.035, 0.36, 0.024, 0.08, 0);
  for (let i = 0; i < 3; i++) { p.bb(B, 0.008, 0.1, 0.1, 0.026, -0.08, -0.13 + i * 0.13, 0.002); p.ab(AT.black, 0.003, 0.06, 0.04, 0.031, -0.06, -0.13 + i * 0.13); }
});
/** wall rack with rolled charts – wall mounted, origin = centre */
export const chartRack = def('abChartRack', (o) => [o.w ?? 0.9, 0.3, 0.4], (p, o) => {
  const w = o.w ?? 0.9, r = rngOf(23);
  for (const s of [-1, 1]) p.extZ(TEAK, [[0, 0.2], [0.26, 0.2], [0.26, 0.17], [0.06, -0.18], [0, -0.18]], 0.025, 0, 0, s * (w / 2 - 0.0125), 0.003);
  for (const [x, y] of [[0.08, 0.12], [0.16, 0.12], [0.24, 0.12], [0.06, 0.0], [0.13, 0.0], [0.07, -0.1]]) {
    const len = w - 0.1 - r() * 0.1;
    p.alathe(r() < 0.6 ? AT.paper : AT.chalk, [[0, 0], [0.032, 0], [0.032, len], [0, len]], x, y + 0.035, -len / 2, 8).rotation.x = Math.PI / 2;
  }
  for (const y of [0.12, 0.0, -0.1]) p.b(TEAK, 0.27 - (0.12 - y), 0.012, w - 0.05, (0.27 - (0.12 - y)) / 2, y, 0);
});
/** headphone set lying on a desk */
export const headphones = def('abHeadphones', [0.2, 0.22, 0.08], (p) => {
  for (const s of [-1, 1]) p.lathe(K.ebony, [[0, 0], [0.032, 0], [0.034, 0.016], [0.026, 0.024], [0, 0.026]], 0, 0, s * 0.08, 10);
  p.tube(mats.chrome, [[0, 0.022, -0.08], [0.06, 0.03, -0.05], [0.08, 0.034, 0], [0.06, 0.03, 0.05], [0, 0.022, 0.08]], 0.004, 8, 3);
  p.tube(mats.rope, [[0, 0.01, 0.1], [-0.05, 0.004, 0.14], [-0.12, 0.004, 0.1]], 0.003, 6, 3);
});
/** message spike with impaled Marconigram forms, and a stack of blank forms */
export const msgSpike = def('abMsgSpike', [0.2, 0.3, 0.2], (p) => {
  p.lathe(B, [[0, 0], [0.04, 0], [0.04, 0.012], [0.006, 0.02], [0.003, 0.18], [0, 0.19]], 0, 0, 0, 8);
  for (let i = 0; i < 6; i++) { const m = p.ab(i % 3 ? AT.paper : AT.label, 0.13, 0.002, 0.1, 0, 0.03 + i * 0.006, 0); m.rotation.y = i * 0.5; }
});
/** leather medicine ball and a pair of Indian clubs lying on the floor */
export const gymSmall = def('abGymSmall', [0.6, 0.5, 0.3], (p) => {
  p.s(mats.leather, 0.15, 0.1, 0.15, 0.1, 1, 0.95, 1, false);
  for (const s of [-1, 1]) p.latheX(TEAK, [[0, 0], [0.022, 0], [0.018, 0.04], [0.016, 0.12], [0.04, 0.28], [0.045, 0.36], [0.03, 0.42], [0, 0.43]], -0.25, 0.046, -0.12 + s * 0.06, 10).rotation.y = s * 0.15;
});

// ============================================================================================== bridge & navigation

export function furnishBridge(ctx) {
  const d = detailer(ctx), H = d.H, Y = d.Y;
  reserveExtDoors(ctx);
  // gratings under the helmsman and the telegraphs
  for (const [x, z, w, dd] of [[70.0, 0, 1.4, 1.5], [72.2, -2.45, 2.6, 0.7], [72.2, 2.45, 2.6, 0.7]]) ctx.plan.prop(grating({ w, d: dd }), x, z, 0, { collide: false });
  wput(ctx, shipsWheel(), 70.0, 0, 'fwd', { y: 0.045 });
  wput(ctx, binnacle2(), 71.35, 0, 'aft');
  for (const s of [-1, 1]) {
    wput(ctx, telegraph2({}), 72.25, s * 1.5, 'aft', { y: 0.045 });          // main engine-order telegraphs
    wput(ctx, telegraph2({ dock: true }), 72.25, s * 3.4, 'aft', { y: 0.045 }); // docking / steering telegraphs
    wput(ctx, telegraph2({}), 71.9, s * 6.4, 'aft');                         // wing telegraphs at the open sides
    d.put(voicePipes({ n: 2 }), 72.4, s * 4.5, Math.PI, false);
  }
  // teak bulwark capping, brass hand rail; window frames with wind screens above the front bulwark
  d.box('woodDark', 72.62, -FW + 0.05, 72.85, FW - 0.05, 0.95, 1.0);
  d.box('brass', 72.55, -FW + 0.1, 72.6, FW - 0.1, 0.9, 0.94);
  for (let z = -FW + 0.4; z < FW - 0.3; z += 1.6) d.box('brass', 72.57, z - 0.012, 72.64, z + 0.012, 0.92, 0.95); // rail brackets under the capping
  const n = 16;
  for (let i = 0; i <= n; i++) { const z = -FW + 0.1 + ((2 * FW - 0.2) * i) / n; d.box('woodDark', 72.7, z - 0.035, 72.8, z + 0.035, 1.0, 2.2); }
  d.box('woodDark', 72.68, -FW + 0.05, 72.82, FW - 0.05, 2.2, 2.3);
  for (let i = 0; i < n; i++) {
    const z0 = -FW + 0.1 + ((2 * FW - 0.2) * i) / n + 0.035, z1 = -FW + 0.1 + ((2 * FW - 0.2) * (i + 1)) / n - 0.035, open = i % 3 === 1;
    if (open) { d.b.poly(mats.glass, [[72.75, Y + 2.2, z0], [72.75, Y + 2.2, z1], [72.45, Y + 2.0, z1], [72.45, Y + 2.0, z0]], [-1, -1, 0]); } // window hinged up
    else d.box(mats.glass, 72.74, z0, 72.76, z1, 1.25, 2.2);
    d.b.poly(mats.glass, [[72.85, Y + 1.0, z0], [72.85, Y + 1.0, z1], [73.0, Y + 1.25, z1], [73.0, Y + 1.25, z0]], [-1, 1, 0]); // wind deflector
    d.box('woodDark', 72.74, z0, 72.8, z1, 1.2, 1.25);
  }
  // telephones to the crow's nest / engine room / forecastle, bell, clock, rudder indicator on the wheelhouse wall
  const aw = wz(66.05, 1);
  for (const z of [-3.4, 3.4, -6.6]) d.wmount(phone(), aw, z, 1.75, 0.0);
  d.wmount(bell(), aw, 6.4, 2.3, 0.0);
  d.wmount(clockWall(), aw, 0.6, 2.2);
  d.wmount(gauge({ r: 0.14 }), aw, -0.6, 2.2);
  d.wmount(barometer(), aw, 2.2, 1.6);
  for (const s of [-1, 1]) d.lamp(69.5, s * 3.5, 'bulkhead');
  if (fine(1)) { // binoculars on the bulwark capping, megaphone on the wheelhouse front
    for (const [z, r] of [[-1.3, 0.3], [4.1, -0.2]]) d.mount(binoculars(), 72.74, z, Math.PI / 2 + r, 1.0);
    if (fine(2)) d.wmount(megaphone(), aw, -4.2, 2.05, 0.0);
  }
}

export function furnishWheelhouse(ctx) {
  const d = detailer(ctx), H = d.H;
  ctx.plan.prop(grating({ w: 1.4, d: 1.6 }), 64.5, 0, 0, { collide: false });
  wput(ctx, shipsWheel(), 64.6, 0, 'fwd', { y: 0.045 });
  wput(ctx, binnacle2(), 65.55, 0, 'aft');
  wput(ctx, telegraph2({}), 65.4, 1.9, 'aft');
  d.put(voicePipes({ n: 3 }), 65.75, -1.0, Math.PI, false);
  wput(ctx, tableRect({ w: 1.0, d: 0.6, mat: 'oak' }), 62.0, 2.0, 'stbd');
  const fw = wz(65.95, -1), aw = wz(61.45, 1);
  d.wmount(gauge({ r: 0.16 }), fw, 0, 2.15);            // rudder indicator above the helmsman
  d.wmount(clockWall(), fw, 1.4, 2.1);
  d.wmount(phone(), aw, -1.2, 1.7);
  d.dress(fw, -2.55, 2.55, { mat: 'oak', frame: 'woodDark', pitch: 0.85, skip: [[-2.4, -1.2]], upper: [1.0, H - 0.6], frieze: false });
  d.wquad(deckMats().chart, fw, 0.75, 1.15, 1.25, 1.75, 0.03); d.wbox('woodDark', fw, 0.72, 1.18, 1.22, 1.78, 0.012);
  // telemotor column (hydraulic transmitter) next to the wheel
  d.b.prism(mats.brass, [64.35, d.Y, 0.85], [64.35, d.Y + 0.95, 0.85], 0.08, 12, true);
  d.b.prism(mats.brass, [64.35, d.Y + 0.95, 0.85], [64.35, d.Y + 1.02, 0.85], 0.11, 12, true);
  d.b.disc(K.gaugeFace, [64.35, d.Y + 1.022, 0.85], [0, 1, 0], 0.09, 16, true);
  d.world.addCollider(64.25, d.Y, 0.75, 64.45, d.Y + 1.05, 0.95);
  if (fine(1)) { d.wmount(clinometer(), fw, -0.75, 2.12, 0.0); d.wmount(courseBoard(), aw, 0.7, 1.65, 0.0); }
}

export function furnishChartRoom(ctx) {
  const d = detailer(ctx), M = deckMats();
  ctx.put(chartTable(), ctx.W / 2, ctx.D / 2, 'in');
  ctx.attach(chrono(), 0.1, 0.55, { y: 0.94 });
  if (fine(2)) { ctx.attach(bookRowLog(), -0.28, 0.62, { y: 0.944, turn: 0.15 }); ctx.attach(binoculars(), -0.32, -0.15, { y: 0.944, turn: 1.2 }); }
  ctx.fit(flagLocker(), ['far:mid', 'left:mid', 'right:mid']);
  if (ctx.fit(desk({ w: 1.2, mat: 'oak' }), ['right:hi', 'left:hi', 'far:lo'])) for (let k = 0; k < 3; k++) ctx.attach(chrono(), -0.12, -0.35 + k * 0.25, { y: 0.775 });
  ctx.fit(chairDining({ cls: 'plain' }), ['near:hi'], { collide: false });
  ctx.fit(shelves({ kind: 'empty', mat: 'oak', w: 1.0 }), ['left:lo', 'right:lo', 'near:lo']);
  // framed charts on the inboard wall, barometer, chronometer clock
  d.wquad(M.chart, wx(-2.65, -1), 62.2, 63.2, 1.2, 1.9);
  d.wbox('oak', wx(-2.65, -1), 62.15, 63.25, 1.15, 1.95, 0.015);
  d.wmount(barometer(), wx(-2.65, -1), 64.2, 1.6);
  d.wmount(clockWall(), wz(61.45, 1), -6.0, 1.9);
  if (fine(2)) d.wmount(chartRack({ w: 0.9 }), wx(-2.65, -1), 65.3, 2.2, 0.0);
}

export function furnishCaptainSitting(ctx) {
  const d = detailer(ctx);
  if (ctx.fit(desk({ w: 1.4, mat: 'mahogany' }), ['far:mid', 'right:mid', 'left:mid'])) { ctx.attach(sextantBox(), -0.1, 0.4, { y: 0.775 }); ctx.attach(chrono(), -0.15, -0.5, { y: 0.775 }); }
  ctx.fit(sofa({ mat: 'leather', w: 1.8 }), ['right:hi', 'left:hi', 'far:hi']);
  ctx.fit(bookcase({ mat: 'mahogany', w: 1.2, seed: 5 }), ['left:hi', 'right:lo', 'far:lo']);
  if (ctx.put(tableRound({ r: 0.4, mat: 'mahogany', items: true }), ctx.W / 2, ctx.D / 2 + 0.2, 'in')) {
    ctx.put(armchair({ kind: 'club', mat: 'leather' }), ctx.W / 2 - 0.95, ctx.D / 2 + 0.2, 'right', { collide: false });
    ctx.put(armchair({ kind: 'club', mat: 'leather' }), ctx.W / 2 + 0.95, ctx.D / 2 + 0.2, 'left', { collide: false });
  }
  ctx.fit(heater(), ['near:hi', 'far:lo'], { collide: false });
  d.wmount(clockWall(), wz(61.45, 1), 6.0, 2.0);
  d.wmount(barometer(), wz(61.45, 1), 4.6, 1.5);
  d.wmount(picture({ w: 0.7, h: 0.5, v: 0 }), wz(65.95, -1), 4.0, 1.7);
}

export function furnishCaptainBed(ctx) {
  ctx.fit(bedFirst({ style: 'mahogany', cover: 'fabricBlue' }), ['far:mid', 'right:hi', 'left:hi']);
  ctx.fit(wardrobe({ mirror: true, mat: 'mahogany' }), ['left:hi', 'right:hi', 'near:hi']);
  ctx.fit(washbasinMarble(), ['right:lo', 'left:lo', 'near:hi']);
  ctx.fit(chest(), ['left:lo', 'right:mid', 'far:lo']);
  ctx.mount(coatHooks({ n: 2, v: 1, mat: 'mahogany' }), ctx.door && ctx.door.u > ctx.W / 2 ? 'left' : 'right', 0.5, 1.75);
}

/** officers' cabins: mahogany bunk with drawers, desk with sextant box, washstand, uniforms on hooks */
export function furnishOfficer(ctx) {
  if (ctx.fit(officerBunk(), ['far:mid', 'right:hi', 'left:hi']) && fine(1)) ctx.attach(officerCap(), 0.05, 0.5, { y: 0.6, turn: 0.4 }); // uniform cap left on the bunk
  if (ctx.fit(desk({ w: 1.0, mat: 'mahogany' }), ['right:mid', 'left:mid', 'right:hi', 'left:hi'])) {
    ctx.attach(sextantBox(), -0.12, 0.25, { y: 0.775, turn: 0.2 });
    const L = ctx.last;
    ctx.put(chairDining({ cls: 'plain', mat: 'mahogany' }), L.u + (L.dir === 'right' ? 0.6 : L.dir === 'left' ? -0.6 : 0), L.v + (L.dir === 'in' ? 0.6 : 0), L.dir === 'right' ? 'left' : L.dir === 'left' ? 'right' : 'out', { collide: false });
  }
  ctx.fit(washstand({ items: true }), ['near:hi', 'left:lo', 'right:lo']);
  ctx.fit(locker({ n: 1, mat: 'mahogany' }), ['left:lo', 'right:lo', 'near:hi']);
  const wall = ctx.door && ctx.door.u < ctx.W / 2 ? 'right' : 'left';
  ctx.mount(coatHooks({ n: 2, v: 2, mat: 'mahogany' }), wall, 0.45, 1.75);
  ctx.mount(clockWall(), 'far', ctx.W / 2, 1.85);
}

// ============================================================================================== Marconi rooms

export function furnishMarconi(ctx) {
  const d = detailer(ctx);
  wput(ctx, marconiSet(), 52.05, 0.75, 'aft');
  for (const z of [0.3, 1.25]) wput(ctx, chairDining({ cls: 'plain', mat: 'oak' }), 51.25, z, 'fwd', { collide: false, turn: z > 1 ? 0.2 : -0.15 });
  if (wput(ctx, desk({ w: 1.2, mat: 'oak' }), 50.8, 2.6, 'port')) { // message pads, forms, pencil, headphones spare
    const z = d.Y + 0.775;
    for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.012, 0.21), mats.paper); m.position.set(50.45 + i * 0.18, z + 0.006, 2.45); m.rotation.y = (i - 1) * 0.15; ctx.plan.zone(50).add(m); }
  }
  wput(ctx, chairDining({ cls: 'plain', mat: 'oak' }), 50.8, 1.95, 'stbd', { collide: false });
  wput(ctx, shelves({ kind: 'empty', w: 1.0, mat: 'oak' }), 52.2, -1.9, 'aft');
  const fw = wz(52.45, -1), aw = wz(49.05, 1);
  d.wmount(clock2({ face: 'marconiClock' }), fw, -0.5, 2.15);  // ship's time, with the silence periods
  d.wmount(clockWall(), fw, 2.3, 2.15);                         // New York time
  d.wmount(pneumatic(), wx(-2.95, 1), 49.4, 0.0, 0.0);           // pneumatic tube to the enquiry office
  d.wmount(phone(), aw, -1.6, 1.6);
  d.box('woodDark', 49.15, 2.2, 49.7, 2.9, 0, 0.5, true);       // accumulator box
  for (let i = 0; i < 4; i++) d.box(K.ebony, 49.2 + i * 0.12, 2.3, 49.28 + i * 0.12, 2.38, 0.5, 0.56);
  d.wmount(picture({ w: 0.5, h: 0.35, v: 2, frame: 'oak' }), fw, 1.2, 1.7);
  if (fine(1)) { // aerial lead-in from the deck head (porcelain insulator) down to the tuner on the set
    const z0 = 1.45, x0 = 52.3;
    pipe(ctx.plan.zone(52), mats.copper, [[x0, d.Y + d.H, z0], [x0, d.Y + 1.7, z0], [52.385, d.Y + 1.45, z0 - 0.15]], 0.008); // to the terminal on top of the slate panel
    d.b.prism(mats.porcelain, [x0, d.Y + d.H - 0.2, z0], [x0, d.Y + d.H, z0], 0.045, 8);
    for (let k = 0; k < 3; k++) d.b.prism(mats.porcelain, [x0, d.Y + d.H - 0.06 - k * 0.06, z0], [x0, d.Y + d.H - 0.035 - k * 0.06, z0], 0.06, 8, true);
  }
  if (fine(2)) { d.mount(headphones(), 51.25, 2.36, 0.4, 0.775); d.mount(msgSpike(), 50.27, 2.62, 0.0, 0.775); }
}

export function furnishSilentRoom(ctx) {
  const d = detailer(ctx);
  ctx.fit(motorGen(), ['far:mid', 'left:hi', 'right:hi']);
  ctx.fit(switchboard({ w: 1.0 }), ['left:hi', 'right:hi', 'far:lo'], { gap: 0 });
  ctx.fit(condensers(), ['right:lo', 'left:lo', 'far:hi']);
  ctx.fit(discharger(), ['right:hi', 'left:mid', 'near:hi']);
  ctx.fit(inductionCoil(), ['near:hi', 'left:lo', 'far:lo']);
  // aerial lead-in through the deck head, copper connections
  const z = ctx.plan.zone(48);
  pipe(z, mats.copper, [[47.6, d.Y + d.H, -2.6], [47.6, d.Y + 2.3, -2.6], [48.4, d.Y + 2.3, -2.6]], 0.02);
  d.b.prism(mats.porcelain, [47.6, d.Y + d.H - 0.25, -2.6], [47.6, d.Y + d.H, -2.6], 0.06, 8);
}

export function furnishOperators(ctx) {
  ctx.fit(berthSecond({ upper: true, cover: 'blanket' }), ['far:mid', 'right:hi', 'left:hi']);
  ctx.fit(locker({ n: 2 }), ['left:hi', 'right:hi', 'near:hi']);
  ctx.fit(washstand({ items: true }), ['right:lo', 'left:lo', 'near:hi']);
  ctx.fit(trunk(), ['left:lo', 'right:mid'], { collide: false });
  ctx.mount(coatHooks({ n: 2, v: 0 }), 'near', ctx.W - 0.4, 1.75);
}

// ============================================================================================== gymnasium

export function furnishGym(ctx) {
  const d = detailer(ctx), M = deckMats(), H = d.H;
  reserveExtDoors(ctx);
  // pine panelling of the exterior walls (starboard side and aft end), windows left open
  const sw = wx(FW, -1);
  d.lineExterior(sw, 28.15, 37.45, { wall: 'pine', wainscot: 'pine', cornice: 'oak', dado: 'oak', sill: 1.0, head: 2.15, wins: boatWindows('fwd', 1), doors: extDoorSpans('boat', 1, 7.5), reveal: 'oak', panels: { mat: 'pine', pitch: 0.9, frame: 'oak' } });
  d.lineExterior(wz(28.15, 1), 3.05, FW, { wall: 'pine', wainscot: 'pine', cornice: 'oak', dado: 'oak', sill: 1.0, head: 2.15, wins: [[2.825, 3.775], [5.025, 5.975]], reveal: 'oak' });
  // inboard wall (against the casing and the stores): raised pine panels
  const pw = wx(3.05, 1);
  d.dress(pw, 28.3, 37.3, { mat: 'pine', frame: 'oak', pitch: 0.95, upper: [1.02, H - 0.6], frieze: false, skip: [[28.8, 30.0], [33.9, 35.6]] });
  // cycle racing machines under the big distance dial, electric horses and camel
  wput(ctx, cycleMachine(), 29.0, 3.85, 'stbd');
  wput(ctx, cycleMachine(), 29.8, 3.85, 'stbd');
  d.wbox('paintWhite', pw, 28.85, 29.95, 1.55, 2.55, 0.02);
  d.b.disc(matOf('gaugeFace'), [29.4, d.Y + 2.05, 3.05 + 0.035], [0, 0, 1], 0.42, 24, true);
  d.b.ring(mats.brass, [29.4, d.Y + 2.05, 3.05 + 0.04], [0, 0, 1], 0.42, 0.48, 24);
  { // graduations of the distance dial
    const cx = 29.4, cy = d.Y + 2.05, zt = 3.05 + 0.037;
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2, L = i % 5 ? 0.035 : 0.07, w = i % 5 ? 0.004 : 0.008, r1 = 0.405, r0 = r1 - L, ca = Math.cos(a), sa = Math.sin(a);
      d.b.poly(mats.iron, [[cx + ca * r0 + sa * w, cy + sa * r0 - ca * w, zt], [cx + ca * r1 + sa * w, cy + sa * r1 - ca * w, zt], [cx + ca * r1 - sa * w, cy + sa * r1 + ca * w, zt], [cx + ca * r0 - sa * w, cy + sa * r0 + ca * w, zt]], [0, 0, 1]);
    }
    if (fine(1)) for (const [a, m] of [[0.4, mats.hullRed], [2.2, mats.fabricBlue]]) d.b.prism(m, [29.4 + Math.cos(a) * 0.3, d.Y + 2.05 + Math.sin(a) * 0.3, 3.112], [29.4 + Math.cos(a) * 0.37, d.Y + 2.05 + Math.sin(a) * 0.37, 3.112], 0.012, 5, true);
    if (fine(1)) d.b.prism(mats.brass, [29.4, d.Y + 2.05, 3.1], [29.4, d.Y + 2.05, 3.13], 0.03, 10, true);
  }
  for (const a of [0.4, 2.2]) d.b.poly(mats.iron, [[29.4, d.Y + 2.05, 3.1], [29.4 + Math.cos(a) * 0.36, d.Y + 2.05 + Math.sin(a) * 0.36, 3.1], [29.4 + Math.cos(a + 0.06) * 0.05, d.Y + 2.05 + Math.sin(a + 0.06) * 0.05, 3.1]], [0, 0, 1]);
  wput(ctx, electricHorse(), 31.0, 3.7, 'stbd');
  wput(ctx, electricHorse(), 31.9, 3.7, 'stbd');
  wput(ctx, electricCamel(), 32.9, 3.7, 'stbd');
  // pulley weight machines, wall bars, punching bag, dumbbells
  for (const x of [34.3, 35.2]) d.wmount(pulleyMachine(), pw, x, 0.0, 0.0);
  ctx.occupied.push({ x0: 33.95, x1: 35.55, z0: 3, z1: 3.5 });
  wput(ctx, punchBag(), 36.7, 3.6, 'stbd');
  // wall bars on the inboard wall between the pulley machines and the punching bag (they used to stand across a doorway)
  d.wmount(wallBars({ w: 0.8 }), pw, 36.0, 0.0, 0.0); reserve(ctx, 35.58, 3.0, 36.42, 3.3);
  wput(ctx, dumbbells(), 36.95, 5.1, 'aft', { collide: true });
  // rowing machines and a bench along the windows
  wput(ctx, rowingMachine(), 29.7, 6.85, 'fwd');
  wput(ctx, rowingMachine(), 35.3, 6.85, 'fwd');
  wput(ctx, bench({ w: 1.15, mat: 'oak', iron: true }), 31.45, 7.0, 'port', { collide: false });
  // illuminated White Star route map and the ship's cross-section on the forward wall, clock and mirror
  const fw = wz(37.45, -1);
  d.wquad(M.worldMap, fw, 3.25, 5.25, 1.0, 2.3, 0.035);
  d.path('oak', fw, d.rectLoop(3.25, 5.25, 1.0, 2.3), PR.arch, 0.02, true);
  d.glow(37.0, 4.25, 1.7, 0xffe2b0, 0.4);
  const aw = wz(28.15, 1);
  d.wquad(M.shipSection, aw, 4.6, 6.4, 1.0, 2.1, 0.035);
  d.path('oak', aw, d.rectLoop(4.6, 6.4, 1.0, 2.1), PR.arch, 0.02, true);
  d.wmount(clockWall(), aw, 3.8, 2.25);
  d.wmount(mirrorWall({ w: 0.6, h: 1.4, frame: 'oak' }), fw, 5.85, 1.95);
  for (const x of [30.4, 33.8, 36.6]) d.wmount(sconce({ plain: true }), sw, x, 2.3, 0.03);
  if (fine(1)) { // leather exercise mat on the floor between the bench and the rowing machine (flat: walked over)
    d.box('leather', 30.3, 5.05, 32.0, 5.95, 0, 0.03);
    if (fine(2)) d.mount(gymSmall(), 31.55, 5.32, 0.2, 0.03);
  }
}

// ============================================================================================== Grand Staircase (forward) – top landing

export function furnishLandingFwd(ctx) {
  const d = detailer(ctx), H = d.H;
  const aw = wz(37.55, 1);
  for (const s of [-1, 1]) {
    d.panels(aw, s < 0 ? -4.5 : 2.75, s < 0 ? -2.75 : 4.5, { mat: 'oakPanel', pitch: 1.1, y0: 0.95, y1: H - 0.3 });
    d.strip('oak', aw, s < 0 ? -4.55 : 2.7, s < 0 ? -2.7 : 4.55, 0.88, 0.95, 0.05);
  }
  d.pilasters(aw, [-4.45, -2.88, 2.88, 4.45], { h: H, w: 0.3 });
  d.sconces(aw, [-3.65, 3.65], 1.9);
  const fw = wz(46.45, -1);
  d.panels(fw, -3.0, 3.0, { mat: 'oakPanel', pitch: 1.2, y0: 0.95, y1: H - 0.3 });
  d.pilasters(fw, [-2.95, 0, 2.95], { h: H, w: 0.28 });
  d.sconces(fw, [-1.5, 1.5], 1.9);
  for (const s of [-1, 1]) {
    wput(ctx, pottedPalm(), 38.0, s * 4.1, 'fwd', { collide: false });
    d.lamp(38.6, s * 3.75, 'bowl'); d.lamp(45.6, s * 3.75, 'bowl');
  }
  if (fine(1)) {
    beginInst(ctx);
    for (const s of [-1, 1]) modRunB(ctx, d, aw, s < 0 ? -4.55 : 2.7, s < 0 ? -2.7 : 4.55, [-4.45, -2.88, 2.88, 4.45]);
    modRunB(ctx, d, fw, -3.0, 3.0, [-2.95, 0, 2.95]);
    ctx.inst.flush(); ctx.inst = null;
  }
}

export function furnishVestibule(ctx) {
  const d = detailer(ctx), r = ctx.room, s = r.z0 < 0 ? -1 : 1;
  reserveExtDoors(ctx);
  d.lineExterior(wx(s * FW, -s), 37.55, 46.45, { wall: 'oakPanel', wainscot: 'oak', cornice: 'gold', dado: 'oak', sill: 1.0, head: 2.15, wins: boatWindows('fwd', s), doors: extDoorSpans('boat', s, 7.5), reveal: 'oak' });
  for (const x of [39.6, 44.4]) wput(ctx, settee({ mat: 'fabricGreen', w: 1.6 }), x, s * 6.95, s < 0 ? 'stbd' : 'port', { collide: true });
  wput(ctx, pottedPalm(), 45.95, s * 6.85, 'aft', { collide: false });
  d.sconces(wx(s * FW, -s), [40.9, 43.1], 2.2);
  if (fine(1)) { beginInst(ctx); modRunB(ctx, d, wx(s * FW, -s), 37.55, 46.45, [], [], 0.03); ctx.inst.flush(); ctx.inst = null; }
}

export function furnishMess(ctx) {
  const d = detailer(ctx);
  if (ctx.put(tableRect({ w: 3.0, d: 1.0, cloth: true, set: true }), ctx.W / 2, ctx.D / 2, 'right')) {
    for (const s of [-1, 1]) for (let k = 0; k < 4; k++) ctx.put(chairDining({ cls: 'first', seat: 'leather' }), ctx.W / 2 + s * 0.8, ctx.D / 2 - 1.1 + k * 0.73, s < 0 ? 'right' : 'left', { collide: false });
  }
  ctx.fit(servingCounter({ w: 1.6, mat: 'mahogany' }), ['far:mid', 'left:mid', 'right:mid']);
  ctx.fit(sofa({ mat: 'leatherGreen', w: 1.6 }), ['right:hi', 'left:hi', 'far:lo']);
  ctx.fit(bookcase({ mat: 'oak', w: 1.0 }), ['left:hi', 'right:lo']);
  d.wmount(clockWall(), wz(37.45, -1), -4.0, 2.1);
}

// ============================================================================================== middle house

export function furnishLandingAft(ctx) {
  const d = detailer(ctx), H = d.H;
  reserveExtDoors(ctx);
  for (const s of [-1, 1]) {
    const aw = wz(-6.45, 1);
    d.panels(aw, s < 0 ? -3.0 : 3.0, s * 4.4, { mat: 'oakPanel', pitch: 1.4, y0: 0.95, y1: H - 0.3 });
    d.panels(aw, s < 0 ? -3.0 : 2.3, s < 0 ? -2.3 : 3.0, { mat: 'oakPanel', pitch: 0.7, y0: 0.95, y1: H - 0.3 });
    d.lamp(1.0, s * 4.6, 'bowl'); d.lamp(-5.6, s * 4.6, 'bowl');
    wput(ctx, pottedPalm(), 1.4, s * 6.3, 'aft', { collide: false });
    wput(ctx, armchair({ kind: 'uph', mat: 'fabricGreen' }), -5.85, s * 6.25, 'fwd', { collide: false });
    d.lineExterior(wx(s * 6.85, -s), -6.45, 1.95, { wall: 'oakPanel', wainscot: 'oak', cornice: 'gold', sill: 1.0, head: 2.15, wins: boatWindows('mid', s), doors: extDoorSpans('boat', s, 7.0) });
  }
  d.pilasters(wz(-6.45, 1), [-3.0, 3.0], { h: H, w: 0.3 });
  d.sconces(wz(-6.45, 1), [-3.7, 3.7], 1.9);
}

export function furnishTankRoom(ctx) {
  const d = detailer(ctx);
  ctx.fit(tankH({ r: 0.75, l: 3.2, mat: 'steelDark' }), ['far:mid', 'left:mid']);
  ctx.fit(tankH({ r: 0.6, l: 2.2, mat: 'steelDark' }), ['left:hi', 'right:hi', 'far:lo']);
  ctx.fit(valve({ mat: 'brass' }), ['right:lo', 'near:hi'], { collide: false });
  pipe(ctx.plan.zone(-13), mats.copper, [[-15.6, d.Y + 2.4, -4.0], [-11.3, d.Y + 2.4, -4.0], [-11.3, d.Y + 0.3, -4.0]], 0.05);
}

export function furnishFanRoom(ctx) {
  const d = detailer(ctx);
  ctx.fit(machineBlock({ w: 1.6, d: 1.2, h: 1.5, kind: 'pump', mat: 'paintGrey' }), ['far:lo', 'far:hi']);
  ctx.fit(machineBlock({ w: 1.6, d: 1.2, h: 1.5, kind: 'pump', mat: 'paintGrey' }), ['far:hi', 'right:hi']);
  ctx.fit(switchboard({ w: 1.2 }), ['left:hi', 'right:lo'], { gap: 0 });
  for (const x of [11.0, 14.6]) { d.box('steelDark', x - 0.45, 3.3, x + 0.45, 4.2, 1.9, d.H); d.box('steelDark', x - 0.5, 3.25, x + 0.5, 4.25, 1.86, 1.9); } // trunks from the deck head, flanged
}

export function furnishLiftMachinery(ctx) {
  const d = detailer(ctx);
  ctx.fit(machineBlock({ w: 1.3, d: 1.0, h: 1.3, kind: 'dynamo', mat: 'paintGreen' }), ['far:mid', 'left:hi']);
  ctx.fit(switchboard({ w: 1.0 }), ['right:hi', 'left:lo'], { gap: 0 });
  // rope sheave hung from the deck head: grooved wheel on an axle between two hanger plates
  d.b.prism(mats.iron, [-39.23, d.Y + 1.9, -3.4], [-39.17, d.Y + 1.9, -3.4], 0.32, 12, true);
  d.b.prism(mats.steelDark, [-39.3, d.Y + 1.9, -3.4], [-39.1, d.Y + 1.9, -3.4], 0.03, 8, true);
  for (const x of [-39.3, -39.12]) d.box('iron', x, -3.46, x + 0.02, -3.34, 1.84, d.H);
}

// ============================================================================================== aft house (2nd class)

export function furnishSecondEntrance(ctx) {
  const d = detailer(ctx);
  d.wmount(clockWall(), wz(-38.15, -1), 0, 2.2);
  for (const s of [-1, 1]) d.lamp(-43, s * 1.9, 'dome');
}

export function furnishSecondVestibule(ctx) {
  const d = detailer(ctx), s = ctx.room.z0 < 0 ? -1 : 1;
  reserveExtDoors(ctx);
  wput(ctx, bench({ w: 1.6, mat: 'oak', iron: false }), -46.4, s * 4.45, s < 0 ? 'stbd' : 'port', { collide: true });
  wput(ctx, bench({ w: 1.6, mat: 'oak', iron: false }), -47.55, s * 3.3, 'fwd', { collide: true });
  d.lineExterior(wx(s * 4.85, -s), -47.85, -41.55, { wall: 'oak', wainscot: 'oak', sill: 1.0, head: 2.15, wins: boatWindows('aft', s), doors: extDoorSpans('boat', s, 5.0) });
}

// ============================================================================================== ceilings

/** Gilt frames around the two dome openings in the ceiling (the domes themselves belong to the exterior). */
export function ceilingDetails(plan, { domeF, domeA }) {
  const b = plan.batch, top = plan.y + plan.h, g = matOf('gold'), o = matOf('oak');
  for (const h of [domeF, domeA]) {
    const e = 0.18;
    b.box(o, h.x0 - e, top - 0.1, h.z0 - e, h.x1 + e, top, h.z0, 'xXzZy');
    b.box(o, h.x0 - e, top - 0.1, h.z1, h.x1 + e, top, h.z1 + e, 'xXzZy');
    b.box(o, h.x0 - e, top - 0.1, h.z0, h.x0, top, h.z1, 'xXzZy');
    b.box(o, h.x1, top - 0.1, h.z0, h.x1 + e, top, h.z1, 'xXzZy');
    const E = e + 0.05;
    for (const [x0, x1, z0, z1] of [[h.x0 - E, h.x1 + E, h.z0 - E, h.z0 - e + 0.04], [h.x0 - E, h.x1 + E, h.z1 + e - 0.04, h.z1 + E], [h.x0 - E, h.x0 - e + 0.04, h.z0 - e, h.z1 + e], [h.x1 + e - 0.04, h.x1 + E, h.z0 - e, h.z1 + e]]) {
      b.box(g, x0, top - 0.13, z0, x1, top - 0.1, z1, 'xXzZy');
    }
    for (const [x0, x1, z0, z1] of [[h.x0, h.x1, h.z0 - 0.01, h.z0], [h.x0, h.x1, h.z1, h.z1 + 0.01], [h.x0 - 0.01, h.x0, h.z0, h.z1], [h.x1, h.x1 + 0.01, h.z0, h.z1]]) b.box(g, x0, top, z0, x1, top + 0.05, z1, 'xXzZ');
    if (fine(1)) { // moulded oak cove round the outer edge of the frame
      const C = [[0, 0], [0.02, -0.004], [0.034, -0.02], [0.04, -0.045], [0.03, -0.06], [0, -0.065]];
      for (const [p0, A, O, L] of [[[h.x0 - E, top - 0.13, h.z0 - E], [1, 0, 0], [0, 0, -1], h.x1 - h.x0 + 2 * E], [[h.x0 - E, top - 0.13, h.z1 + E], [1, 0, 0], [0, 0, 1], h.x1 - h.x0 + 2 * E],
        [[h.x0 - E, top - 0.13, h.z0 - E], [0, 0, 1], [-1, 0, 0], h.z1 - h.z0 + 2 * E], [[h.x1 + E, top - 0.13, h.z0 - E], [0, 0, 1], [1, 0, 0], h.z1 - h.z0 + 2 * E]]) b.sweep(o, C, p0, A, O, [0, 1, 0], L, [false, false]);
    }
    if (fine(2)) { // gilt bead row under the inner edge of the frame
      const zone = plan.world.zone(plan.deck, (h.x0 + h.x1) / 2), nx = Math.floor((h.x1 - h.x0 + 2 * e) / 0.1), nz = Math.floor((h.z1 - h.z0 + 2 * e) / 0.1);
      for (const s of [-1, 1]) {
        const bx = bcBeadRow({ n: nx }); bx.position.set((h.x0 + h.x1) / 2, top - 0.125, s < 0 ? h.z0 - 0.07 : h.z1 + 0.07); bx.rotation.y = Math.PI / 2; zone.add(bx);
        const bz = bcBeadRow({ n: nz }); bz.position.set(s < 0 ? h.x0 - 0.07 : h.x1 + 0.07, top - 0.125, (h.z0 + h.z1) / 2); zone.add(bz);
      }
    }
  }
}
void iput; void faceDir; void knob; void papers; void bookRow; void heater;
