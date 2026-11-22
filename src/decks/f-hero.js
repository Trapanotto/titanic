// F deck hero rooms: swimming bath, Turkish bath (cooling room + bath rooms), third-class dining saloons,
// machinery access lobbies. All furnish functions get the kit's FurnishCtx.
import * as THREE from 'three';
import { mats } from '../core/materials.js';
import {
  kitMats, pipe, showerBath, bench, coolingCouch, servingCounter, shelves, locker, gauge, valve, def,
  basinSmall, desk, chairDining as chair, mirrorWall, clockWall, pottedPalm, deckHalfWidth, wardrobe, coatHooks, towels,
} from '../interior/kit.js';
import { Instancer, moorishCeiling, teakLattice, ceilingPipes, poster, iznikMat, tileBorderMat, depthMat } from './f-util.js';

const TAU = Math.PI * 2;
function rngOf(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// ---------------------------------------------------------------- custom props (kit builder, front faces +x)

/** hanging pierced-bronze Arab lantern with chain and finial, origin at the ceiling */
export const lantern = def('fhLantern', [0.42, 0.42, 1.05], (p) => {
  for (let i = 0; i < 4; i++) p.t(kitMats.bronze, 0.03, 0.007, 0, -0.04 - i * 0.05, 0, i % 2 ? 'x' : 'z', 8, 3);
  p.lathe(kitMats.bronze, [[0, 0], [0.06, 0], [0.05, 0.02], [0, 0.03]], 0, -0.03, 0, 10);
  // dome cap with crescent finial, onion body of ribs round a glowing glass, star-pierced drum, pendant finial
  p.lathe(kitMats.bronze, [[0, -0.4], [0.17, -0.38], [0.19, -0.34], [0.14, -0.28], [0.06, -0.24], [0.03, -0.21], [0, -0.2]], 0, 0, 0, 14);
  p.lathe(mats.lampGlow, [[0, -0.82], [0.08, -0.8], [0.15, -0.7], [0.17, -0.58], [0.15, -0.46], [0.1, -0.4], [0, -0.39]], 0, 0, 0, 12);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU, c = Math.cos(a), s = Math.sin(a);
    p.loft(kitMats.bronze, [[c * 0.1, -0.395, s * 0.1], [c * 0.165, -0.46, s * 0.165], [c * 0.185, -0.58, s * 0.185], [c * 0.165, -0.71, s * 0.165], [c * 0.09, -0.81, s * 0.09]], [0.012, 0.012, 0.012, 0.012, 0.012], 4, false);
  }
  for (const y of [-0.46, -0.7]) p.t(kitMats.bronze, y > -0.5 ? 0.16 : 0.165, 0.01, 0, y, 0, 'y', 16, 3);
  p.lathe(kitMats.bronze, [[0, -1.02], [0.02, -0.99], [0.05, -0.92], [0.07, -0.86], [0.08, -0.82], [0, -0.81]], 0, 0, 0, 10);
  p.lathe(mats.gold, [[0, -1.05], [0.012, -1.04], [0.01, -1.02], [0, -1.01]], 0, 0, 0, 6);
});
/** marble drinking fountain in a horseshoe-arched niche, tiled back, bronze spout and cups (front +x, wall at -x) */
const fountain = def('fhFountain', [1.1, 0.55, 2.1], (p) => {
  const arch = [];
  for (let i = 0; i <= 12; i++) { const a = -0.25 + ((Math.PI + 0.5) * i) / 12; arch.push([Math.cos(a) * 0.36, 1.45 + Math.sin(a) * 0.36]); }
  const frame = new THREE.Shape([[-0.55, 0], [0.55, 0], [0.55, 2.1], [-0.55, 2.1]].map(([a, b]) => new THREE.Vector2(a, b)));
  const hole = new THREE.Path(); hole.moveTo(-0.35, 0.72); hole.lineTo(0.35, 0.72);
  for (const [a, b] of arch) hole.lineTo(a, b);
  hole.lineTo(-0.35, 0.72); frame.holes.push(hole);
  p.extX(mats.marble, frame, 0.12, -0.2, 0, 0, 0.01);
  p.b(iznikMat, 0.01, 1.1, 0.72, -0.255, 0.72, 0);
  p.bb(mats.marble, 0.2, 0.06, 1.2, -0.17, 2.1, 0, 0.01);
  p.bb(mats.gold, 0.02, 0.03, 1.12, -0.13, 2.03, 0, 0.004);
  // basin on a fluted pedestal, bronze spout, cups on chains
  p.lathe(mats.marble, [[0, 0], [0.18, 0], [0.16, 0.05], [0.1, 0.12], [0.09, 0.6], [0.13, 0.66], [0.3, 0.72], [0.33, 0.8], [0.3, 0.82], [0.27, 0.76], [0, 0.74]], 0.08, 0, 0, 20);
  p.c(kitMats.water, 0.27, 0.005, 0.08, 0.79, 0, 20);
  p.lathe(kitMats.bronze, [[0, 0], [0.04, 0], [0.035, 0.05], [0, 0.06]], -0.25, 1.12, 0, 8).rotation.z = -Math.PI / 2;
  p.loft(kitMats.bronze, [[-0.2, 1.12, 0], [-0.08, 1.14, 0], [0.02, 1.08, 0], [0.04, 1.02, 0]], [0.022, 0.02, 0.016, 0.012], 6);
  for (const s of [-1, 1]) { p.lathe(kitMats.bronze, [[0, 0], [0.035, 0], [0.04, 0.06], [0, 0.055]], 0.25, 0.82, s * 0.15, 8); p.loft(kitMats.bronze, [[-0.25, 1.0, s * 0.3], [0.1, 0.9, s * 0.25], [0.24, 0.86, s * 0.16]], 0.004, 3, false); }
  for (const s of [-1, 1]) p.lathe(mats.marble, [[0, 0], [0.05, 0], [0.04, 0.05], [0.04, 1.35], [0.06, 1.4], [0.06, 1.45], [0, 1.45]], -0.1, 0.0, s * 0.45, 10);
});
/** octagonal "Damascus" coffee table: inlaid top (gilt ring, mother-of-pearl star), cusped-arch pierced sides */
const damascusTable = def('fhDamascus', [0.62, 0.62, 0.56], (p) => {
  p.c(mats.woodDark, 0.31, 0.035, 0, 0.52, 0, 8); p.c(mats.porcelain, 0.16, 0.004, 0, 0.555, 0, 8); p.c(mats.gold, 0.27, 0.003, 0, 0.5545, 0, 8, 0.27);
  p.c(mats.woodDark, 0.285, 0.05, 0, 0.47, 0, 8);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 + Math.PI / 8, c = Math.cos(a), s = Math.sin(a);
    p.b(teakLattice, 0.01, 0.3, 0.2, c * 0.255, 0.16, s * 0.255).rotation.y = -a;
    p.b(mats.woodDark, 0.04, 0.47, 0.04, Math.cos(a + Math.PI / 8) * 0.27, 0, Math.sin(a + Math.PI / 8) * 0.27);
  }
  p.c(mats.woodDark, 0.27, 0.04, 0, 0.12, 0, 8);
  p.lathe(mats.brass, [[0, 0], [0.05, 0], [0.06, 0.03], [0.03, 0.09], [0.012, 0.13], [0.03, 0.15], [0, 0.17]], 0.1, 0.555, 0.05, 10); // dallah coffee pot
  p.lathe(mats.porcelain, [[0, 0], [0.022, 0], [0.03, 0.04], [0.027, 0.04], [0, 0.005]], -0.08, 0.555, -0.06, 8);
});
/** brass coffee tray on a folding stand */
const brassTray = def('fhTray', [0.56, 0.56, 0.6], (p) => {
  p.lathe(mats.brass, [[0, 0], [0.26, 0], [0.275, 0.025], [0.27, 0.03], [0.255, 0.008], [0, 0.008]], 0, 0.56, 0, 18);
  for (const s of [-1, 1]) for (const t of [-1, 1]) p.loft(mats.woodDark, [[s * 0.16, 0, t * 0.16], [-s * 0.16, 0.56, t * 0.16]], 0.014, 4);
  p.lathe(mats.copper, [[0, 0], [0.05, 0], [0.06, 0.04], [0.03, 0.12], [0.015, 0.15], [0.03, 0.17], [0, 0.18]], 0.05, 0.568, 0.04, 10);
  for (const [x, z] of [[-0.1, -0.08], [-0.12, 0.06], [0.1, -0.12]]) p.lathe(mats.porcelain, [[0, 0], [0.02, 0], [0.028, 0.035], [0.025, 0.035], [0, 0.005]], x, 0.568, z, 8);
});
/** canvas folding chair (teak X-frame, striped canvas sling, arms) */
const foldingChair = def('fhFolding', [0.56, 0.7, 0.85], (p) => {
  for (const s of [-1, 1]) {
    p.loft(mats.oak, [[0.28, 0, s * 0.25], [-0.25, 0.42, s * 0.25]], 0.016, 4);
    p.loft(mats.oak, [[-0.28, 0, s * 0.25], [0.18, 0.42, s * 0.25]], 0.016, 4);
    p.loft(mats.oak, [[-0.27, 0.42, s * 0.27], [-0.32, 0.85, s * 0.27]], 0.017, 4);
    p.loft(mats.oak, [[0.22, 0.55, s * 0.28], [-0.3, 0.6, s * 0.28]], 0.015, 4);
    p.loft(mats.oak, [[0.2, 0.42, s * 0.28], [0.22, 0.55, s * 0.28]], 0.013, 4);
  }
  for (const [x, y] of [[0.2, 0.42], [-0.25, 0.42], [-0.32, 0.85], [0.28, 0.02], [-0.28, 0.02]]) p.cz(mats.oak, 0.014, 0.52, x, y, 0, 5);
  p.loft(mats.canvas, [[0.2, 0.42, 0], [0.0, 0.34, 0], [-0.22, 0.4, 0], [-0.3, 0.8, 0]], [0.002, 0.002, 0.002, 0.002], 4, false).scale.z = 1;
  p.b(mats.canvas, 0.44, 0.006, 0.48, -0.02, 0.36, 0).rotation.z = 0.08;
  p.b(mats.canvas, 0.006, 0.4, 0.48, -0.28, 0.42, 0).rotation.z = 0.12;
  p.b(mats.fabricRed, 0.007, 0.4, 0.1, -0.276, 0.42, 0).rotation.z = 0.12;
});
/** needle (spray) shower: brass ring cage with vertical pipes, overhead rose, valve wheels, marble tray (front +x) */
const needleShower = def('fhNeedle', [1.0, 1.0, 2.25], (p) => {
  p.bb(mats.marble, 1.0, 0.08, 1.0, 0, 0, 0, 0.01); p.c(mats.chrome, 0.04, 0.005, 0, 0.08, 0, 8);
  for (let k = 0; k < 6; k++) { const y = 0.45 + k * 0.25; p.t(mats.brass, 0.38, 0.016, 0, y, 0, 'y', 22, 4); }
  for (let i = 0; i < 6; i++) { const a = Math.PI * 0.25 + (i / 5) * Math.PI * 1.5; p.c(mats.brass, 0.018, 1.6, Math.cos(a) * 0.38, 0.12, Math.sin(a) * 0.38, 6); }
  p.c(mats.brass, 0.025, 0.95, -0.38, 1.3, 0, 6); p.cx(mats.brass, 0.02, 0.4, -0.18, 2.22, 0, 6);
  p.lathe(mats.brass, [[0, 0], [0.14, 0], [0.12, 0.04], [0.03, 0.08], [0, 0.09]], 0.02, 2.1, 0, 14);
  for (const z of [-0.2, 0.2]) { p.t(mats.brass, 0.07, 0.01, -0.44, 1.3, z, 'x', 12, 3); p.cx(mats.brass, 0.012, 0.08, -0.44, 1.3, z, 6); }
  p.b(mats.brass, 0.1, 0.12, 0.6, -0.44, 1.25, 0);
});
/** marble shampooing slab with bevelled top, pillow block, drain channel and linen */
const marbleSlab = def('fhSlab', [0.8, 2.0, 0.78], (p) => {
  p.bb(mats.marble, 0.72, 0.62, 1.8, 0, 0, 0, 0.02);
  p.bb(mats.marble, 0.82, 0.1, 2.02, 0, 0.62, 0, 0.02);
  p.bb(mats.marble, 0.5, 0.08, 0.28, 0, 0.72, -0.82, 0.03);
  p.b(mats.iron, 0.08, 0.005, 0.08, 0, 0.72, 0.9);
  p.bb(mats.linen, 0.6, 0.02, 0.5, 0.02, 0.72, 0.4, 0.008);
  p.b(kitMats.tileBlue, 0.74, 0.08, 1.82, 0, 0, 0);
  p.g.rotation.y = Math.PI / 2;   // built along z: the footprint is [w 0.8 along the wall, d 2.0 out] → pillow end at the wall
});
/** electric light-bath cabinet: oak cabinet with mirrored inside and rows of lamps, door ajar, collar for the head */
const lightBath = def('fhLightBath', [1.05, 1.15, 1.6], (p) => {
  const W = 1.0, D = 1.1, H = 1.3;
  p.bb(mats.oak, D, 0.06, W, 0, 0, 0, 0.01);
  p.bb(mats.oak, D, 0.06, W, 0, H, 0, 0.01);
  for (const s of [-1, 1]) p.bb(mats.oak, D, H, 0.05, 0, 0.06, s * (W / 2 - 0.025), 0.008);
  p.bb(mats.oak, 0.05, H, W, -D / 2 + 0.025, 0.06, 0, 0.008);
  for (const s of [-1, 1]) for (let k = 0; k < 4; k++) for (let j = 0; j < 4; j++) p.s(mats.lampGlow, 0.03, -0.35 + k * 0.2, 0.3 + j * 0.25, s * (W / 2 - 0.06), 1, 1, 0.6);
  for (const s of [-1, 1]) p.b(mats.mirror, D - 0.1, H - 0.1, 0.005, 0, 0.1, s * (W / 2 - 0.052));
  // door (front, hinged at -z, ajar) with fielded panels and brass handle
  const da = 0.75, dw = W * 0.95, ux = Math.sin(da), uz = Math.cos(da), nx = Math.cos(da), nz = -Math.sin(da); // along the leaf / outward normal
  const door = p.bb(mats.oak, 0.04, H, dw, 0, 0.06, 0, 0.008); door.position.set(D / 2 + 0.02 + ux * dw / 2, 0.06 + H / 2, -W / 2 + uz * dw / 2); door.rotation.y = da;
  p.fp(mats.oak, 0.3, 0.5, D / 2 + 0.02 + ux * dw * 0.6 + nx * 0.02, 0.5, -W / 2 + uz * dw * 0.6 + nz * 0.02, 0.01, 0.03).rotation.y = da;
  p.c(mats.brass, 0.012, 0.1, D / 2 + 0.02 + ux * dw * 0.92 + nx * 0.03, 0.7, -W / 2 + uz * dw * 0.92 + nz * 0.03, 6);
  // seat, head collar of linen, switches
  p.bb(mats.oak, 0.5, 0.05, W - 0.1, -D / 2 + 0.3, 0.42, 0, 0.008);
  p.t(mats.linen, 0.12, 0.04, 0, H + 0.08, 0, 'y', 14, 5);
  p.b(kitMats.switchboard, 0.04, 0.35, 0.3, -D / 2 - 0.02, 0.7, 0.25);
  for (const z of [0.18, 0.32]) p.cx(mats.brass, 0.015, 0.04, -D / 2 - 0.05, 0.85, z, 6);
});
/** teak lounger (slatted) for the hot rooms */
const lounger = def('fhLounger', [0.7, 1.9, 0.75], (p) => {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.bb(mats.oak, 0.05, 0.32, 0.05, sx * 0.28, 0, sz * 0.85, 0.008);
  for (const s of [-1, 1]) p.bb(mats.oak, 0.04, 0.06, 1.85, s * 0.3, 0.3, 0, 0.006);
  for (let i = 0; i < 14; i++) p.bb(mats.oak, 0.62, 0.025, 0.08, 0, 0.36, -0.82 + i * 0.1, 0.005);
  for (let i = 0; i < 5; i++) { const m = p.bb(mats.oak, 0.62, 0.025, 0.08, 0, 0.44 + i * 0.094, -0.865 - i * 0.034, 0.005); m.rotation.x = 1.22; }
  for (const s of [-1, 1]) p.loft(mats.oak, [[s * 0.3, 0.33, -0.83], [s * 0.3, 0.86, -1.02]], 0.02, 4);
  p.bb(mats.linen, 0.55, 0.03, 1.2, 0, 0.385, 0.15, 0.01);
  p.g.rotation.y = Math.PI / 2;   // built along z: turn it so that its length runs out from the wall (head end at the wall)
});
/** wall thermometer on a carved board (origin = mounting point, faces +x) */
const thermometer = def('fhThermo', [0.12, 0.03, 0.45], (p) => {
  p.bb(mats.oak, 0.02, 0.45, 0.12, 0.01, -0.22, 0, 0.004);
  p.b(mats.glass, 0.012, 0.36, 0.014, 0.025, -0.18, 0); p.b(mats.navRed, 0.006, 0.22, 0.006, 0.028, -0.17, 0); p.s(mats.navRed, 0.012, 0.028, -0.18, 0);
});
/** third-class slat-back dining chair (pine, varnished), ~200 triangles */
const chair3 = def('fhChair3', [0.44, 0.46, 0.9], (p) => {
  const w = mats.oak;
  for (const sz of [-1, 1]) {
    p.c(w, 0.016, 0.43, 0.17, 0, sz * 0.18, 6, 0.019);
    p.fr(w, 0.032, 0.032, 0.03, 0.03, 0.9, -0.19, 0, sz * 0.18).rotation.z = 0.07;
    p.b(w, 0.33, 0.02, 0.018, 0, 0.14, sz * 0.18);
  }
  p.b(w, 0.018, 0.02, 0.34, 0.17, 0.2, 0); p.b(w, 0.018, 0.02, 0.34, -0.17, 0.2, 0);
  p.bb(w, 0.42, 0.035, 0.42, 0, 0.415, 0, 0.008);
  for (const y of [0.56, 0.68, 0.8]) p.bb(w, 0.018, 0.07, 0.36, -0.215 - (y - 0.45) * 0.07, y, 0, 0.004);
});
/** long third-class table: pine trestles, white cloth, enamel plates, mugs, cutlery, cruet, water jug, bread (front +x) */
const table3 = def('fhTable3', (o) => [o.w ?? 2.9, o.d ?? 0.85, 0.78], (p, o) => {
  const w = o.w ?? 2.9, d = o.d ?? 0.85, r = rngOf(o.v ?? 1), ty = 0.762;
  for (const s of [-1, 1]) {
    const z = s * (w / 2 - 0.3);
    p.bb(mats.pine, d - 0.25, 0.06, 0.06, 0, 0, z, 0.008);
    p.bb(mats.pine, 0.08, 0.63, 0.06, 0, 0.06, z, 0.008);
    p.bb(mats.pine, d - 0.18, 0.06, 0.07, 0, 0.66, z, 0.008);
  }
  p.bb(mats.pine, 0.06, 0.06, w - 0.6, 0, 0.3, 0, 0.008);
  p.bb(mats.pine, d, 0.035, w, 0, 0.715, 0, 0.008);
  // cloth: top + hanging skirts all round
  p.b(mats.linen, d + 0.04, 0.012, w + 0.04, 0, 0.75, 0);
  for (const s of [-1, 1]) { p.b(mats.linen, 0.006, 0.2, w + 0.04, s * (d / 2 + 0.023), 0.562, 0); p.b(mats.linen, d + 0.04, 0.2, 0.006, 0, 0.562, s * (w / 2 + 0.023)); }
  const n = Math.max(1, Math.round(w / 0.58));
  for (let i = 0; i < n; i++) for (const s of [-1, 1]) {
    const z = -w / 2 + (w / n) * (i + 0.5) + (r() - 0.5) * 0.04, x = s * (d / 2 - 0.16);
    if (r() < 0.12) continue; // an empty place
    p.lathe(mats.porcelain, [[0, 0], [0.07, 0], [0.11, 0.014], [0, 0.008]], x, ty, z, 8);
    const mx = x - s * 0.15, mz = z + 0.16;
    p.c(mats.porcelain, 0.038, 0.09, mx, ty, mz, 6);
    p.b(mats.porcelain, 0.012, 0.05, 0.03, mx, ty + 0.02, mz + 0.045);
    for (const dz of [-0.14, 0.14]) p.b(mats.chrome, 0.17, 0.004, 0.014, x, ty, z + dz);
    if (r() < 0.25) p.b(mats.paper, 0.1, 0.03, 0.08, x + s * 0.02, ty + 0.012, z).rotation.y = r();
  }
  // centre line: cruets, water jugs, bread plates, salt cellars
  for (let k = 0; k < Math.max(1, Math.round(w / 1.4)); k++) {
    const z = -w / 2 + (w / Math.round(w / 1.4)) * (k + 0.5);
    p.lathe(mats.porcelain, [[0, 0], [0.06, 0], [0.08, 0.05], [0.07, 0.16], [0.05, 0.22], [0.065, 0.25], [0, 0.24]], 0, ty, z - 0.2, 10);
    p.lathe(mats.porcelain, [[0, 0], [0.12, 0], [0.13, 0.015], [0, 0.01]], 0, ty, z + 0.2, 10);
    for (let j = 0; j < 3; j++) p.bb(mats.paper, 0.08, 0.035, 0.12, (j - 1) * 0.06, ty + 0.012, z + 0.2, 0.012);
    p.lathe(mats.chrome, [[0, 0], [0.04, 0], [0.005, 0.01], [0.004, 0.12], [0.012, 0.13], [0, 0.14]], 0, ty, z, 8);
    for (const dz of [-0.03, 0.03]) p.lathe(mats.glass, [[0, 0], [0.015, 0], [0.016, 0.06], [0.006, 0.08], [0, 0.085]], 0.02, ty + 0.01, z + dz, 6);
  }
});
/** copper water / tea urn with brass tap on a stand */
const urn = def('fhUrn', [0.4, 0.4, 0.62], (p) => {
  for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU; p.c(mats.brass, 0.012, 0.08, Math.cos(a) * 0.13, 0, Math.sin(a) * 0.13, 5); }
  p.lathe(mats.copper, [[0, 0.06], [0.15, 0.07], [0.17, 0.14], [0.17, 0.42], [0.15, 0.47], [0.1, 0.5], [0.11, 0.52], [0, 0.52]], 0, 0, 0, 16);
  p.lathe(mats.brass, [[0, 0], [0.03, 0], [0.025, 0.04], [0.012, 0.06], [0, 0.07]], 0, 0.52, 0, 8);
  for (const y of [0.2, 0.36]) p.t(mats.brass, 0.172, 0.008, 0, y, 0, 'y', 16, 3);
  p.cx(mats.brass, 0.018, 0.12, 0.2, 0.16, 0, 6); p.b(mats.brass, 0.02, 0.05, 0.02, 0.25, 0.12, 0); p.b(kitMats.ebony, 0.06, 0.015, 0.02, 0.22, 0.2, 0);
  for (const s of [-1, 1]) p.t(mats.brass, 0.05, 0.008, 0, 0.44, s * 0.17, 'z', 10, 3);
});
/** cork-and-canvas life ring on a wall hook (origin = mounting point, faces +x) */
const lifeRing = def('fhLifeRing', [0.75, 0.12, 0.8], (p) => {
  p.t(mats.paintWhite, 0.3, 0.065, 0.07, -0.36, 0, 'x', 20, 8);
  for (let k = 0; k < 4; k++) { const m = p.t(mats.fabricRed, 0.3, 0.068, 0.07, -0.36, 0, 'x', 5, 8); m.rotation.set(0, Math.PI / 2, (k * Math.PI) / 2); m.geometry = new THREE.TorusGeometry(0.3, 0.068, 8, 4, Math.PI / 6); }
  p.t(mats.rope, 0.36, 0.008, 0.08, -0.36, 0, 'x', 20, 3);
  p.b(mats.brass, 0.05, 0.05, 0.08, 0.025, -0.05, 0);
});

// ---------------------------------------------------------------- helpers

const hull = (deck, x) => deckHalfWidth(deck, x) - 0.01;

/** strips of a horizontal face from x0..x1, z0..(hull or z1) at height y */
function flatToHull(b, mat, deck, x0, x1, z0, z1, y, down = true) {
  const n = Math.max(1, Math.ceil((x1 - x0) / 1.0));
  for (let i = 0; i < n; i++) {
    const a = x0 + ((x1 - x0) * i) / n, c = x0 + ((x1 - x0) * (i + 1)) / n, h = Math.min(hull(deck, a), hull(deck, c));
    const za = Math.max(z0, -h), zb = Math.min(z1, h);
    if (zb > za + 0.01) b.flat(mat, a, c, za, zb, y, down);
  }
}
/** doors (along-coordinate intervals) on a side of the room, incl. neighbours' doors in shared walls */
function doorGaps(r, side, extra = []) {
  return [...(r.doorsAll ?? []).filter((d) => d.side === side).map((d) => [d.at - (d.w ?? 0.9) / 2 - 0.15, d.at + (d.w ?? 0.9) / 2 + 0.15]), ...extra];
}
/**
 * Iznik tile panels on a wall: along a (x for walls at z = c, z for walls at x = c), normal n (±1), from a0..a1,
 * y0..y1; panels ~1.2 m framed by cobalt border tiles, separated by carved teak pilaster strips; gaps skipped.
 */
function tilePanels(b, axis, c, n, a0, a1, y0, y1, gaps = []) {
  const segs = [];
  let s0 = a0;
  for (const [g0, g1] of [...gaps].sort((p, q) => p[0] - q[0])) { if (g1 <= a0 || g0 >= a1) continue; if (g0 - s0 > 0.4) segs.push([s0, g0]); s0 = Math.max(s0, g1); }
  if (a1 - s0 > 0.4) segs.push([s0, a1]);
  const q = (a, y, o) => (axis === 'x' ? [a, y, c + n * o] : [c + n * o, y, a]);
  const quad = (mat, a, b2, ya, yb, o) => b.poly(mat, [q(a, ya, o), q(b2, ya, o), q(b2, yb, o), q(a, yb, o)], axis === 'x' ? [0, 0, n] : [n, 0, 0]);
  const strip = (mat, a, b2, ya, yb, o0, o1) => {
    const lo = Math.min(c + n * o0, c + n * o1), hi = Math.max(c + n * o0, c + n * o1);
    if (axis === 'x') b.box(mat, a, ya, lo, b2, yb, hi, n > 0 ? 'ZxXyY' : 'zxXyY'); else b.box(mat, lo, ya, a, hi, yb, b2, n > 0 ? 'XzZyY' : 'xzZyY');
  };
  for (const [sa, sb] of segs) {
    const np = Math.max(1, Math.round((sb - sa) / 1.25)), pw = (sb - sa) / np;
    for (let i = 0; i < np; i++) {
      const pa = sa + i * pw, pb = pa + pw;
      quad(iznikMat, pa + 0.08, pb - 0.08, y0 + 0.12, y1 - 0.12, 0.012);
      quad(tileBorderMat, pa + 0.06, pb - 0.06, y0 + 0.02, y0 + 0.12, 0.012); quad(tileBorderMat, pa + 0.06, pb - 0.06, y1 - 0.12, y1 - 0.02, 0.012);
      quad(tileBorderMat, pa + 0.06, pa + 0.08, y0 + 0.12, y1 - 0.12, 0.012); quad(tileBorderMat, pb - 0.08, pb - 0.06, y0 + 0.12, y1 - 0.12, 0.012);
      strip(mats.woodDark, pa - 0.06, pa + 0.06, y0 - 0.02, y1 + 0.05, 0, 0.05);   // carved teak pilaster strip
      strip(mats.gold, pa - 0.03, pa + 0.03, y1 + 0.05, y1 + 0.13, 0, 0.06);        // gilt capital
    }
    strip(mats.woodDark, sb - 0.06, sb + 0.06, y0 - 0.02, y1 + 0.05, 0, 0.05);
    strip(mats.woodDark, sa - 0.06, sb + 0.06, y1 - 0.02, y1 + 0.05, 0, 0.07);      // teak capping rail
    strip(kitMats.tileBlue, sa, sb, 0, y0 - 0.02, 0, 0.01);                          // plain tiled dado
    strip(mats.marble, sa, sb, 0, 0.12, 0, 0.025);                                   // marble skirting
  }
}

// ---------------------------------------------------------------- swimming bath

/** animated water surface (noMerge, ~250 vertices, no allocations per frame) */
function waterSurface(world, deck, x0, x1, z0, z1, y) {
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, 24, 10); g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, kitMats.water); m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); m.userData.noMerge = true; m.renderOrder = 2;
  world.zone(deck, (x0 + x1) / 2).add(m);
  const P = g.attributes.position, base = Float32Array.from(P.array);
  world.onUpdate((dt, t) => {
    for (let i = 0; i < P.count; i++) { const x = base[i * 3], z = base[i * 3 + 2]; P.array[i * 3 + 1] = 0.012 * Math.sin(x * 2.1 + t * 1.3) * Math.cos(z * 2.7 - t * 0.9) + 0.006 * Math.sin((x + z) * 4.3 + t * 2.1); }
    P.needsUpdate = true; g.computeVertexNormals();
  });
}

export function swimmingBath(ctx) {
  const { plan, world, deck } = ctx, b = plan.batch, Y = ctx.y, top = Y + ctx.h, r = ctx.room, s = r.safe;
  const X0 = 53.4, X1 = 62.4, Z0 = 4.7, Z1 = 8.7, H = 1.0, R = 0.3, tile = mats.tileWhite, blue = kitMats.tileBlue, WL = Y + H - 0.16;
  // raised tiled coaming with marble cap, scum channel (gutter) round the inside, blue-tiled inner faces and bottom
  b.box(tile, X0, Y, Z0, X1, Y + H, Z0 + R, 'xXzZ'); b.box(tile, X0, Y, Z1 - R, X1, Y + H, Z1, 'xXzZ');
  b.box(tile, X0, Y, Z0 + R, X0 + R, Y + H, Z1 - R, 'xX'); b.box(tile, X1 - R, Y, Z0 + R, X1, Y + H, Z1 - R, 'xX');
  b.box(mats.marble, X0 - 0.04, Y + H, Z0 - 0.04, X1 + 0.04, Y + H + 0.05, Z0 + R, 'xXyYzZ');
  b.box(mats.marble, X0 - 0.04, Y + H, Z1 - R, X1 + 0.04, Y + H + 0.05, Z1 + 0.04, 'xXyYzZ');
  b.box(mats.marble, X0 - 0.04, Y + H, Z0 + R, X0 + R, Y + H + 0.05, Z1 - R, 'xyY'); b.box(mats.marble, X1 - R, Y + H, Z0 + R, X1 + 0.04, Y + H + 0.05, Z1 - R, 'XyY');
  b.wallX(blue, Z0 + R + 0.002, X0 + R, X1 - R, Y, Y + H - 0.22, 1); b.wallX(blue, Z1 - R - 0.002, X0 + R, X1 - R, Y, Y + H - 0.22, -1);
  b.wallZ(blue, X0 + R + 0.002, Z0 + R, Z1 - R, Y, Y + H - 0.22, 1); b.wallZ(blue, X1 - R - 0.002, Z0 + R, Z1 - R, Y, Y + H - 0.22, -1);
  // scum channel: a recessed white-tiled trough with a rounded lip just above the water line
  const g0 = Y + H - 0.22, i0 = R + 0.002;
  for (const [ax, cc, a0, a1, n] of [['x', Z0 + i0, X0 + R, X1 - R, 1], ['x', Z1 - i0, X0 + R, X1 - R, -1], ['z', X0 + i0, Z0 + R, Z1 - R, 1], ['z', X1 - i0, Z0 + R, Z1 - R, -1]]) {
    if (ax === 'x') { b.box(tile, a0, g0, Math.min(cc, cc + n * 0.09), a1, g0 + 0.04, Math.max(cc, cc + n * 0.09), 'yY' + (n > 0 ? 'Z' : 'z')); b.box(mats.porcelain, a0, g0 + 0.04, Math.min(cc + n * 0.06, cc + n * 0.1), a1, g0 + 0.08, Math.max(cc + n * 0.06, cc + n * 0.1), 'yY' + (n > 0 ? 'Z' : 'z')); b.wallX(mats.rubber, cc + n * 0.003, a0, a1, g0 + 0.04, g0 + 0.2, n); }
    else { b.box(tile, Math.min(cc, cc + n * 0.09), g0, a0, Math.max(cc, cc + n * 0.09), g0 + 0.04, a1, 'yY' + (n > 0 ? 'X' : 'x')); b.box(mats.porcelain, Math.min(cc + n * 0.06, cc + n * 0.1), g0 + 0.04, a0, Math.max(cc + n * 0.06, cc + n * 0.1), g0 + 0.08, a1, 'yY' + (n > 0 ? 'X' : 'x')); b.wallZ(mats.rubber, cc + n * 0.003, a0, a1, g0 + 0.04, g0 + 0.2, n); }
  }
  b.wallX(tile, Z0 + R + 0.003, X0 + R, X1 - R, g0 + 0.2, Y + H, 1); b.wallX(tile, Z1 - R - 0.003, X0 + R, X1 - R, g0 + 0.2, Y + H, -1);
  b.wallZ(tile, X0 + R + 0.003, Z0 + R, Z1 - R, g0 + 0.2, Y + H, 1); b.wallZ(tile, X1 - R - 0.003, Z0 + R, Z1 - R, g0 + 0.2, Y + H, -1);
  b.flat(blue, X0 + R, X1 - R, Z0 + R, Z1 - R, Y + 0.02);
  waterSurface(world, deck, X0 + R + 0.1, X1 - R - 0.1, Z0 + R + 0.1, Z1 - R - 0.1, WL);
  // lane line on the bottom, depth marks on the coaming (enamel plates) and on the pool wall
  b.flat(mats.iron, X0 + R + 0.2, X1 - R - 0.2, (Z0 + Z1) / 2 - 0.05, (Z0 + Z1) / 2 + 0.05, Y + 0.025);
  const dm = (x, cell, z, n) => { const u0 = (cell % 2) * 0.5, v0 = cell < 2 ? 0.5 : 0; b.poly(depthMat, [[x - 0.14, Y + 0.6, z], [x + 0.14, Y + 0.6, z], [x + 0.14, Y + 0.88, z], [x - 0.14, Y + 0.88, z]], [0, 0, n], n < 0 ? [[u0, v0], [u0 + 0.5, v0], [u0 + 0.5, v0 + 0.5], [u0, v0 + 0.5]] : [[u0 + 0.5, v0], [u0, v0], [u0, v0 + 0.5], [u0 + 0.5, v0 + 0.5]]); };
  [[X0 + 0.9, 0], [X0 + 3.6, 1], [X1 - 3.6, 2], [X1 - 0.9, 3]].forEach(([x, c]) => { dm(x, c, Z0 - 0.004, -1); dm(x, c, Z1 + 0.004, 1); });
  // brass ladder at the deep (forward) end
  for (const z of [6.3, 7.1]) { b.post(mats.brass, X1 - R - 0.12, z, Y + 0.1, Y + H + 0.55, 0.035); b.bar(mats.brass, [X1 - R - 0.12, Y + H + 0.5, z], [X1 - 0.05, Y + H + 0.5, z], 0.035, 0.035); }
  for (let k = 1; k <= 3; k++) b.bar(mats.brass, [X1 - R - 0.12, Y + k * 0.25, 6.3], [X1 - R - 0.12, Y + k * 0.25, 7.1], 0.03, 0.03);
  // marble steps up to the coaming at the after end with brass hand rails, steps down inside
  for (let k = 0; k < 3; k++) {
    b.box(mats.marble, X0 - 0.9 + k * 0.3, Y, 6.0, X0 + (k === 2 ? 0 : -0.6 + k * 0.3), Y + 0.25 * (k + 1), 7.4, 'xXyYzZ');
    b.box(mats.marble, X0 - 0.92 + k * 0.3, Y + 0.25 * (k + 1) - 0.03, 5.98, X0 - 0.86 + k * 0.3, Y + 0.25 * (k + 1), 7.42, 'xXyYzZ');
    b.box(blue, X0 + R, Y, 6.0, X0 + R + 0.9 - k * 0.3, Y + 0.25 * (k + 1), 7.4, 'XYzZ');
  }
  for (const z of [5.95, 7.45]) {
    b.bar(mats.brass, [X0 - 0.85, Y + 1.0, z], [X0 + 0.05, Y + 1.75, z], 0.04, 0.04);
    for (const x of [X0 - 0.85, X0 - 0.4, X0 + 0.05]) b.post(mats.brass, x, z, Y + 0.25 + (x - X0 + 0.9) * 0.83, Y + 1.0 + (x - X0 + 0.85) * 0.83, 0.03);
  }
  world.addCollider(X0 - 0.95, Y, Z0, X1 + 0.04, Y + H + 0.05, Z1);
  ctx.occupied.push({ x0: X0 - 1.0, x1: X1 + 0.1, z0: Z0 - 0.1, z1: Z1 + 0.1 });

  // changing cubicles along the ship's side: mahogany partitions, louvred half doors, curtain rails, benches, hooks
  const CF = 10.9, cx0 = 50.6, n = 12, cw = 1.2;
  for (let i = 0; i <= n; i++) {
    const x = cx0 + i * cw, zh = hull(deck, x);
    b.box(mats.mahogany, x - 0.02, Y + 0.12, CF, x + 0.02, Y + 2.05, zh, 'xXyYz');
    b.box(mats.mahogany, x - 0.035, Y, CF - 0.02, x + 0.035, Y + 2.1, CF + 0.05, 'xXyYzZ');
    world.addCollider(x - 0.03, Y, CF, x + 0.03, Y + 2.05, zh);
    if (i < n) {
      const xa = x + 0.035, xc = x + cw - 0.035, zb = Math.min(hull(deck, xa), hull(deck, xc));
      b.bar(mats.brass, [xa, Y + 2.05, CF + 0.03], [xc, Y + 2.05, CF + 0.03], 0.025, 0.025);
      const open = (i * 7) % 5;
      if (open < 2) { // louvred half door standing ajar
        const dw = cw - 0.08, ang = 0.5 + open * 0.5, hx = xa, ex = hx + Math.cos(ang) * dw, ez = CF - Math.sin(ang) * dw;
        b.poly(kitMats.louvre, [[hx, Y + 0.35, CF], [ex, Y + 0.35, ez], [ex, Y + 1.75, ez], [hx, Y + 1.75, CF]], [-Math.sin(ang), 0, -Math.cos(ang)]);
        b.poly(mats.mahogany, [[hx, Y + 0.35, CF + 0.01], [ex, Y + 0.35, ez + 0.01], [ex, Y + 1.75, ez + 0.01], [hx, Y + 1.75, CF + 0.01]], [Math.sin(ang), 0, Math.cos(ang)]);
      } else { // curtain partly drawn
        const cwid = 0.35 + ((i * 3) % 4) * 0.15;
        b.box(mats.canvas, xa, Y + 0.3, CF + 0.01, xa + cwid, Y + 2.02, CF + 0.03, 'zZxX');
        for (let k = 0; k < Math.round(cwid / 0.08); k++) b.box(mats.canvas, xa + k * 0.08 + 0.02, Y + 0.3, CF - 0.005, xa + k * 0.08 + 0.05, Y + 2.02, CF + 0.01, 'z');
        b.box(mats.mahogany, xa, Y + 0.12, CF - 0.01, xc, Y + 0.32, CF + 0.02, 'zZyY');
      }
      b.box(mats.pine, xa, Y + 0.42, zb - 0.42, xc, Y + 0.47, zb, 'yYzxX');
      b.box(mats.brass, x + cw / 2 - 0.15, Y + 1.7, zb - 0.04, x + cw / 2 + 0.15, Y + 1.73, zb, 'yYz');
      if (i % 3 === 1) b.box(mats.linen, x + cw / 2 - 0.1, Y + 1.25, zb - 0.06, x + cw / 2 + 0.1, Y + 1.72, zb - 0.03, 'zxXy');
    }
  }
  b.box(mats.mahogany, cx0, Y + 2.05, CF - 0.02, cx0 + n * cw, Y + 2.15, CF + 0.04, 'xXyYzZ');
  ctx.occupied.push({ x0: cx0 - 0.1, x1: cx0 + n * cw + 0.1, z0: CF - 0.1, z1: 99 });
  // showers and benches at the after bulkhead, teak gratings on the wet floor, towels
  plan.prop(showerBath(), s.x0 + 0.47, 9.3, 0, { collide: true }); plan.prop(showerBath(), s.x0 + 0.47, 10.25, 0, { collide: true });
  ctx.occupied.push({ x0: s.x0, x1: s.x0 + 1, z0: 8.8, z1: 10.75 });
  plan.prop(bench({ w: 1.6, back: false, mat: 'pine' }), s.x0 + 0.3, 4.4, 0, { collide: false });
  plan.prop(towels({ n: 3 }), s.x0 + 0.3, 3.9, 0, { y: Y + 0.45 });
  for (const [x, za, zb] of [[56.2, Z1 + 0.25, Z1 + 1.15], [59.6, Z1 + 0.25, Z1 + 1.15], [51.4, 8.9, 10.7]]) {
    const xa = x - (x < 52 ? 0.5 : 1.3), xb = x + (x < 52 ? 0.5 : 1.3);
    for (let k = 0; (k + 0.5) * 0.08 < xb - xa; k++) b.box(mats.deckWood, xa + k * 0.08, Y + 0.005, za, xa + k * 0.08 + 0.055, Y + 0.035, zb, 'yYxX');
    for (const z of [za + 0.05, zb - 0.05]) b.box(mats.deckWood, xa, Y, z - 0.03, xb, Y + 0.012, z + 0.03, 'Y');
  }
  for (const x of [56, 60]) plan.prop(bench({ w: 1.8, back: true, mat: 'oak' }), x, s.z0 + 0.3, -Math.PI / 2, { collide: false });
  // tiled walls with a dado line (blue band) on the inner walls
  for (const [ax, c, nn, a0, a1, gaps] of [['x', s.z0 + 0.003, 1, s.x0, s.x1, [[61.6 - 0.85, 61.6 + 0.85], [64.2 - 0.85, 64.2 + 0.85]]], ['z', s.x0 + 0.003, 1, s.z0, CF - 0.1, []], ['z', s.x1 - 0.003, -1, s.z0, CF - 0.1, doorGaps(r, 'fwd')]]) {
    const segs = []; let p0 = a0; for (const [g0, g1] of gaps.sort((p, q) => p[0] - q[0])) { if (g0 > p0) segs.push([p0, g0]); p0 = Math.max(p0, g1); } if (a1 > p0) segs.push([p0, a1]);
    for (const [sa, sb] of segs) {
      if (ax === 'x') { b.wallX(tile, c, sa, sb, Y, Y + 1.5, nn); b.wallX(blue, c + nn * 0.001, sa, sb, Y + 1.5, Y + 1.62, nn); b.box(mats.marble, sa, Y, Math.min(c, c + nn * 0.02), sb, Y + 0.15, Math.max(c, c + nn * 0.02), nn > 0 ? 'ZY' : 'zY'); }
      else { b.wallZ(tile, c, sa, sb, Y, Y + 1.5, nn); b.wallZ(blue, c + nn * 0.001, sa, sb, Y + 1.5, Y + 1.62, nn); b.box(mats.marble, Math.min(c, c + nn * 0.02), Y, sa, Math.max(c, c + nn * 0.02), Y + 0.15, sb, nn > 0 ? 'XY' : 'xY'); }
    }
  }
  // life rings and a clock on the inner wall, notice of bathing hours
  for (const x of [52.4, 63.3]) plan.prop(lifeRing(), x, s.z0 + 0.01, -Math.PI / 2, { y: Y + 2.0 });
  plan.prop(clockWall(), 58, s.z0 + 0.01, -Math.PI / 2, { y: Y + 2.05 });
  // exposed steel deck beams with riveted flanges and a longitudinal girder; pillars to the coaming corners
  for (let x = 51.2; x < s.x1; x += 2.4) {
    const zh = hull(deck, x);
    b.box(mats.paintWhite, x - 0.08, top - 0.32, s.z0, x + 0.08, top - 0.28, zh, 'xXyzZ');
    b.box(mats.paintWhite, x - 0.012, top - 0.28, s.z0, x + 0.012, top - 0.02, zh, 'xX');
    for (let z = s.z0 + 0.15; z < zh - 0.1; z += 0.15) for (const dx of [-0.05, 0.05]) b.box(mats.paintWhite, x + dx - 0.008, top - 0.335, z - 0.008, x + dx + 0.008, top - 0.32, z + 0.008, 'xXzZy');
  }
  b.box(mats.paintWhite, s.x0, top - 0.36, 6.65, s.x1, top - 0.32, 6.79, 'xXyzZ');
  b.box(mats.paintWhite, s.x0, top - 0.32, 6.71, s.x1, top - 0.02, 6.73, 'zZ');
  // lamps over the water
  for (const x of [55, 58, 61]) plan.lamp(x, 6.7, 'bowl');
}

/** vestibule of the swimming bath: benches, mirror, towel shelves */
export function bathVestibule(ctx) {
  ctx.fit(shelves({ kind: 'linen', w: 1.5 }), ['far:lo', 'left:hi', 'right:hi']);
  ctx.fit(bench({ w: 1.6, mat: 'mahogany', iron: false }), ['left:mid', 'right:mid', 'far:hi'], { collide: false });
  ctx.fit(bench({ w: 1.6, mat: 'mahogany', iron: false }), ['right:mid', 'left:hi'], { collide: false });
  ctx.mount(mirrorWall({ w: 0.8, h: 1.0, frame: 'mahogany' }), 'far', ctx.W * 0.7, 1.6);
  ctx.mount(clockWall(), 'left', ctx.D * 0.5, 2.0);
  if (ctx.fit(coatHooks({ n: 4, v: 2, mat: 'brass' }), ['near:hi'])) void 0;
}

// ---------------------------------------------------------------- Turkish bath

/** the Cooling Room (hero): crimson coffered ceiling with gilt beams and bosses, Iznik tile panels with teak pilasters,
 *  carved teak screens before the portholes, marble fountain, bronze lanterns, couches, Damascus tables, folding chairs */
export function coolingRoom(ctx) {
  const { plan, world, deck } = ctx, b = plan.batch, Y = ctx.y, top = Y + ctx.h, r = ctx.room, s = r.safe;
  const fc = top - 0.16;   // false ceiling below the shell beams
  flatToHull(b, moorishCeiling, deck, s.x0 - 0.05, s.x1 + 0.05, s.z0 - 0.05, 99, fc, true);
  // gilt transverse beams with carved soffits and two longitudinal ones, gilt bosses at the crossings, gilt cornice
  const bx = []; for (let x = s.x0 + 1.2; x < s.x1 - 0.5; x += 1.55) bx.push(x);
  for (const x of bx) {
    b.box(mats.gold, x - 0.08, fc - 0.17, s.z0, x + 0.08, fc, hull(deck, x), 'xXyzZ');
    b.box(kitMats.fireRed, x - 0.05, fc - 0.175, s.z0, x + 0.05, fc - 0.17, hull(deck, x), 'y');
  }
  for (const z of [6.4, 10.2]) b.box(mats.gold, s.x0, fc - 0.13, z - 0.06, s.x1, fc, z + 0.06, 'xXyzZ');
  for (const x of bx) for (const z of [6.4, 10.2]) if (z < hull(deck, x) - 0.2) plan.prop(boss(), x, z, 0, { y: fc - 0.17 });
  b.box(mats.gold, s.x0, fc - 0.1, s.z0, s.x1, fc, s.z0 + 0.05, 'yZ');
  // Moorish frieze round the inner walls
  b.wallZ(moorishCeiling, s.x0 + 0.002, s.z0, hull(deck, s.x0), fc - 0.45, fc - 0.1, 1);
  b.wallZ(moorishCeiling, s.x1 - 0.002, s.z0, hull(deck, s.x1), fc - 0.45, fc - 0.1, -1);
  b.wallX(moorishCeiling, s.z0 + 0.002, s.x0, s.x1, fc - 0.45, fc - 0.1, 1);
  // Iznik tile panels between carved teak pilasters on the three inner walls
  const yT = Y + 1.85;
  tilePanels(b, 'z', s.x0 + 0.003, 1, s.z0 + 0.1, hull(deck, s.x0) - 0.15, Y + 0.85, yT, doorGaps(r, 'aft', [[7.65 - 0.65, 7.65 + 0.65]]));
  tilePanels(b, 'z', s.x1 - 0.003, -1, s.z0 + 0.1, hull(deck, s.x1) - 0.15, Y + 0.85, yT, doorGaps(r, 'fwd'));
  tilePanels(b, 'x', s.z0 + 0.003, 1, s.x0 + 0.1, s.x1 - 0.1, Y + 0.85, yT, doorGaps(r, 'port', [[47 - 0.85, 47 + 0.85]]));
  // ship's side: Iznik dado, carved teak screens in front of the portholes under cusped arches, gilt rail
  for (let x = s.x0; x < s.x1 - 0.01; x += 1.25) {
    const xb = Math.min(s.x1, x + 1.25), zh = Math.min(hull(deck, x), hull(deck, xb)) - 0.03;
    b.wallX(iznikMat, zh, x, xb, Y + 0.12, Y + 0.93, -1);
    b.wallX(tileBorderMat, zh - 0.001, x, xb, Y + 0.82, Y + 0.93, -1);
    b.box(mats.marble, x, Y, zh - 0.025, xb, Y + 0.12, zh, 'zY');
    b.wallX(teakLattice, zh - 0.06, x + 0.06, xb - 0.06, Y + 0.95, fc - 0.48, -1);
    b.box(mats.woodDark, x, Y + 0.95, zh - 0.1, x + 0.06, fc - 0.45, zh, 'xXz');
    b.box(mats.gold, x, Y + 0.93, zh - 0.1, xb, Y + 0.98, zh, 'yYz');
    b.box(mats.woodDark, x, fc - 0.5, zh - 0.1, xb, fc - 0.45, zh, 'yz');
    // cusped (multifoil) arch head of each screen
    const xm = (x + xb) / 2, aw = (xb - x) / 2 - 0.06, ay = fc - 0.95;
    for (let k = 0; k < 7; k++) {
      const a0 = (k / 7) * Math.PI, a1 = ((k + 1) / 7) * Math.PI, rr = (i) => aw * (1 - 0.08 * Math.abs(Math.sin(i * 3.5)));
      b.poly(mats.woodDark, [[xm - Math.cos(a0) * rr(a0), ay + Math.sin(a0) * rr(a0) * 0.9, zh - 0.065], [xm - Math.cos(a1) * rr(a1), ay + Math.sin(a1) * rr(a1) * 0.9, zh - 0.065], [xm - Math.cos(a1) * aw * 1.1, Math.min(fc - 0.5, ay + Math.sin(a1) * aw * 1.1), zh - 0.065], [xm - Math.cos(a0) * aw * 1.1, Math.min(fc - 0.5, ay + Math.sin(a0) * aw * 1.1), zh - 0.065]], [0, 0, -1]);
    }
  }
  // free-standing carved teak screen with Moorish arch dividing the alcove of the fountain
  const xs = s.x1 - 2.2;
  for (const [za, zb] of [[s.z0 + 2.6, s.z0 + 3.6], [s.z0 + 5.4, s.z0 + 6.4]]) {
    b.wallZ(teakLattice, xs, za, zb, Y + 0.3, Y + 2.1, 1); b.wallZ(teakLattice, xs + 0.001, za, zb, Y + 0.3, Y + 2.1, -1);
    b.box(mats.woodDark, xs - 0.05, Y, za - 0.06, xs + 0.05, Y + 2.2, za, 'xXzZY'); b.box(mats.woodDark, xs - 0.05, Y, zb, xs + 0.05, Y + 2.2, zb + 0.06, 'xXzZY');
    b.box(mats.woodDark, xs - 0.05, Y, za, xs + 0.05, Y + 0.3, zb, 'xXY'); b.box(mats.gold, xs - 0.06, Y + 2.1, za - 0.06, xs + 0.06, Y + 2.2, zb + 0.06, 'xXyY');
    world.addCollider(xs - 0.06, Y, za - 0.06, xs + 0.06, Y + 2.2, zb + 0.06);
    ctx.occupied.push({ x0: xs - 0.4, x1: xs + 0.4, z0: za - 0.1, z1: zb + 0.1 });
  }
  // horseshoe arch over the alcove opening
  const zc = s.z0 + 4.5, ar = 0.9;
  for (let k = 0; k < 12; k++) {
    const a0 = -0.3 + ((Math.PI + 0.6) * k) / 12, a1 = -0.3 + ((Math.PI + 0.6) * (k + 1)) / 12, ya = Y + 1.85;
    for (const sx of [-1, 1]) b.poly(mats.woodDark, [[xs + sx * 0.05, ya + Math.sin(a0) * ar, zc + Math.cos(a0) * ar], [xs + sx * 0.05, ya + Math.sin(a1) * ar, zc + Math.cos(a1) * ar], [xs + sx * 0.05, Math.min(Y + 2.95, ya + Math.sin(a1) * (ar + 0.18)), zc + Math.cos(a1) * (ar + 0.18)], [xs + sx * 0.05, Math.min(Y + 2.95, ya + Math.sin(a0) * (ar + 0.18)), zc + Math.cos(a0) * (ar + 0.18)]], [sx, 0, 0]);
  }
  b.box(mats.gold, xs - 0.06, Y + 2.15, s.z0 + 3.6, xs + 0.06, Y + 2.22, s.z0 + 5.4, 'xXyY');
  // marble drinking fountain in the alcove (forward wall)
  plan.prop(fountain(), s.x1 - 0.28, zc, Math.PI, { collide: true });
  ctx.occupied.push({ x0: s.x1 - 0.7, x1: s.x1, z0: zc - 0.65, z1: zc + 0.65 });
  // mosaic border round the tiled floor
  for (const [x0, x1, z0, z1] of [[s.x0 + 0.1, s.x1 - 0.1, s.z0 + 0.1, s.z0 + 0.35], [s.x0 + 0.1, s.x0 + 0.35, s.z0 + 0.1, hull(deck, s.x0) - 0.2], [s.x1 - 0.35, s.x1 - 0.1, s.z0 + 0.1, hull(deck, s.x1) - 0.2]]) b.flat(tileBorderMat, x0, x1, z0, z1, Y + 0.004);
  // couches along the walls, Damascus tables, coffee trays, folding chairs, palms
  for (const w of ['left', 'right', 'near', 'far']) for (let k = 0; k < 6; k++) if (!ctx.fit(coolingCouch({ mat: (k + w.length) % 2 ? 'fabricRed' : 'fabricGold' }), [w + ':lo'])) break;
  ctx.grid(2.6, 2.6, (u, v, i, j) => {
    if (!ctx.put(damascusTable(), u, v, 'in')) return;
    if ((i + j) % 2 === 0) { ctx.put(coolingCouch({ mat: 'fabricRed' }), u, v + 0.85, 'out'); ctx.put(coolingCouch({ mat: 'fabricGold' }), u, v - 0.85, 'in'); }
    else { ctx.put(foldingChair(), u + 0.75, v + 0.1, 'left', { collide: false }); ctx.put(foldingChair(), u - 0.75, v - 0.1, 'right', { collide: false }); ctx.put(brassTray(), u, v + 0.75, 'out', { collide: false }); }
  }, 1.4);
  for (const p of ['near:hi', 'far:lo']) ctx.fit(pottedPalm(), [p], { collide: false });
  // bronze lanterns
  for (const x of [s.x0 + 2.4, (s.x0 + s.x1) / 2, s.x1 - 3.2]) for (const z of [5.0, 8.4, 11.6]) {
    if (z > hull(deck, x) - 0.6) continue;
    plan.prop(lantern(), x, z, 0, { y: fc - 0.17 });
    world.addLamp({ x, y: fc - 0.8, z, color: 0xffb060, intensity: 0.8 });
  }
}
/** gilt ceiling boss (origin at its top) */
const boss = def('fhBoss', [0.3, 0.3, 0.12], (p) => {
  p.lathe(mats.gold, [[0, 0], [0.13, 0], [0.14, -0.02], [0.1, -0.05], [0.06, -0.06], [0.05, -0.09], [0.02, -0.12], [0, -0.125]], 0, 0, 0, 12);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; p.s(mats.gold, 0.035, Math.cos(a) * 0.1, -0.035, Math.sin(a) * 0.1, 1, 0.5, 1); }
});

/** hot / temperate room: Iznik panels, teak loungers, steam heating pipes behind a grille, thermometer */
export function hotRoom(ctx) {
  const { plan } = ctx, b = plan.batch, r = ctx.room, s = r.safe, Y = ctx.y;
  for (let k = 0; k < 4; k++) if (!ctx.fit(lounger(), ['left:lo', 'right:lo', 'far:lo'])) break;
  const nPipes = 4;
  for (let i = 0; i < nPipes; i++) ctx.box('copper', 0.05, ctx.D - 0.3 - i * 0.07, ctx.W - 0.05, ctx.D - 0.25 - i * 0.07, 0.12 + i * 0.06, 0.16 + i * 0.06);
  ctx.box('louvre', 0.05, ctx.D - 0.04, ctx.W - 0.05, ctx.D - 0.02, 0.05, 0.45);
  tilePanels(b, 'x', s.z0 + 0.003, 1, s.x0 + 0.1, s.x1 - 0.1, Y + 0.85, Y + 1.85, doorGaps(r, 'port'));
  ctx.mount(thermometer(), 'left', ctx.D * 0.5, 1.6);
  ctx.put(towels({ n: 2 }), 0.5, ctx.D * 0.5, 'in', { collide: false, y: 0.0 });
}
/** steam room: tiered marble benches, perforated steam pipe, tiled walls */
export function steamRoom(ctx) {
  const { plan } = ctx, b = plan.batch, r = ctx.room, s = r.safe, Y = ctx.y;
  ctx.box('marble', 0.05, ctx.D - 0.7, ctx.W - 0.05, ctx.D - 0.05, 0, 0.45, true);
  ctx.box('marble', 0.05, ctx.D - 0.35, ctx.W - 0.05, ctx.D - 0.05, 0.45, 0.9, false);
  ctx.box('marble', 0.05, 1.2, 0.5, ctx.D - 0.75, 0, 0.45, true);
  ctx.box('copper', 0.6, ctx.D - 0.75, ctx.W - 0.6, ctx.D - 0.7, 0.05, 0.12);
  for (let k = 0; k < 8; k++) ctx.box('brass', 0.7 + k * ((ctx.W - 1.4) / 8), ctx.D - 0.77, 0.73 + k * ((ctx.W - 1.4) / 8), ctx.D - 0.75, 0.08, 0.1);
  tilePanels(b, 'x', s.z0 + 0.003, 1, s.x0 + 0.1, s.x1 - 0.1, Y + 0.95, Y + 1.95, doorGaps(r, 'port'));
  ctx.mount(thermometer(), 'left', ctx.D * 0.35, 1.6);
}
/** shampooing room: marble slab, needle shower, basin, towels */
export function shampooRoom(ctx) {
  ctx.fit(marbleSlab(), ['far:mid', 'left:hi', 'right:hi']);
  ctx.fit(needleShower(), ['left:hi', 'right:hi', 'far:lo']);
  ctx.fit(basinSmall(), ['right:lo', 'left:lo', 'near:hi'], { collide: false });
  if (ctx.last) ctx.attach(towels({ n: 2 }), 0.05, 0.3, { y: 0.95 });
}
export function electricBath(ctx) {
  ctx.fit(lightBath(), ['far:mid', 'left:hi', 'right:hi']);
  ctx.fit(chair({ cls: 'plain', mat: 'oak' }), ['left:mid', 'right:mid'], { collide: false });
  ctx.fit(shelves({ kind: 'linen', w: 1.0 }), ['right:lo', 'left:lo', 'near:hi']);
  ctx.mount(thermometer(), 'left', ctx.D * 0.3, 1.5);
}
/** entrance of the Turkish bath: ticket desk, benches, clock */
export function bathEntrance(ctx) {
  if (ctx.fit(desk({ w: 1.4, mat: 'mahogany' }), ['far:hi', 'right:hi'])) ctx.fit(chair({ cls: 'plain', mat: 'mahogany' }), ['far:lo'], { collide: false });
  ctx.fit(bench({ w: 1.8, mat: 'mahogany', iron: false }), ['left:mid', 'right:mid'], { collide: false });
  ctx.fit(shelves({ kind: 'linen', w: 1.5 }), ['right:hi', 'left:hi']);
  ctx.mount(clockWall(), 'far', ctx.W / 2, 2.0);
}

// ---------------------------------------------------------------- third-class dining saloon

const CHAIR = chair3();
const TABLES = [0, 1, 2].map((v) => table3({ w: 2.9, d: 0.85, v: v + 1 }));
const URN = urn();
/** Long clothed tables with simple settings and slat-back chairs (both InstancedMesh), sideboards with crockery and
 *  urns, pine dado, coat hooks, posters, exposed beams and pipes. */
export function thirdDining(inst, o = {}) {
  return (ctx) => {
    const { plan, world, deck } = ctx, b = plan.batch, Y = ctx.y, r = ctx.room, s = r.safe;
    // sideboards along the walls first, with water urns
    for (const w of ['left', 'right']) for (let k = 0; k < 2; k++) {
      if (!ctx.fit(servingCounter({ w: 2.2, d: 0.6, mat: 'pine', top: 'oak', items: true }), [w + (k ? ':hi' : ':lo')])) continue;
      const L = ctx.last; inst.add(URN, L.x + Math.cos(ctx.rot(L.dir)) * -0.05, Y + 0.925, L.z - Math.sin(ctx.rot(L.dir)) * -0.05 + 0, ctx.rot(L.dir));
    }
    ctx.fit(shelves({ kind: 'crockery', w: 1.5, mat: 'pine' }), ['far:mid', 'far:lo']);
    const TL = 2.9, TD = 0.85;
    let chairs = 0, tables = 0;
    const rr = rngOf(Math.round(r.x0 * 7 + 3));
    ctx.grid(TL + 1.3, 2.45, (u, v) => {
      if (!ctx.free(u, v, TL + 0.2, TD + 1.15)) return;
      const q = ctx._rect(u, v, TL, TD), p = ctx.at(u, v), rot = ctx.rot('in');
      inst.add(TABLES[tables % 3], p.x, Y, p.z, rot); tables++;
      world.addCollider(q.x0, Y, q.z0, q.x1, Y + 0.78, q.z1);
      for (let k = 0; k < 5; k++) for (const sgn of [-1, 1]) {
        const c = ctx.at(u - 1.16 + k * 0.58 + (rr() - 0.5) * 0.06, v + sgn * (0.66 + rr() * 0.08));
        inst.add(CHAIR, c.x, Y, c.z, ctx.rot(sgn > 0 ? 'out' : 'in') + (rr() - 0.5) * 0.25); chairs++;
      }
      ctx.occupied.push(ctx._rect(u, v, TL + 0.2, TD + 1.15));
    }, 0.8);
    r.seats = chairs;
    // White Star posters on the transverse walls, coat hooks and pine dado along the ship's side, exposed pipes
    const doorsAt = (side) => (r.doorsAll ?? []).filter((d) => d.side === side).map((d) => d.at);
    for (const [side, x, n] of [['aft', r.x0 + 0.05, 1], ['fwd', r.x1 - 0.05, -1]]) {
      const ds = doorsAt(side), zl = Math.max(s.z0, -hull(deck, x)) + 1, zr = Math.min(s.z1, hull(deck, x)) - 1;
      for (let z = zl; z <= zr; z += 3.1) if (!ds.some((d) => Math.abs(d - z) < 1.4) && !(Math.abs(z) < 3.4 && o.casingWalls?.includes(side))) poster(b, 'z', x, z, Y + 1.25, 0.6, 0.8, n);
    }
    for (const sg of [-1, 1]) {
      const zw = sg * (hull(deck, (s.x0 + s.x1) / 2) - 0.02);
      if (zw < s.z0 || zw > s.z1 + 0.05) continue;
      // varnished pine dado (tongue and groove boards) with capping rail on the hull lining
      for (let x = s.x0 + 0.1; x < s.x1 - 0.1; x += 1.0) {
        const xb = Math.min(s.x1 - 0.1, x + 1.0), z = sg * (Math.min(hull(deck, x), hull(deck, xb)) - 0.015);
        b.box(mats.pine, x, Y, Math.min(z, z - sg * 0.012), xb, Y + 1.05, Math.max(z, z - sg * 0.012), sg > 0 ? 'zY' : 'ZY');
        for (let k = 1; k < 10; k++) b.box(mats.woodDark, x + k * 0.1 - 0.004, Y + 0.12, Math.min(z - sg * 0.012, z - sg * 0.016), x + k * 0.1 + 0.004, Y + 1.0, Math.max(z - sg * 0.012, z - sg * 0.016), sg > 0 ? 'z' : 'Z');
        b.box(mats.pine, x, Y + 1.05, Math.min(z, z - sg * 0.04), xb, Y + 1.1, Math.max(z, z - sg * 0.04), sg > 0 ? 'zyY' : 'ZyY');
      }
      b.box(mats.woodDark, s.x0 + 0.5, Y + 1.62, zw - (sg > 0 ? 0.05 : 0), s.x1 - 0.5, Y + 1.72, zw + (sg < 0 ? 0.05 : 0), sg > 0 ? 'zyY' : 'ZyY');
      for (let x = s.x0 + 0.7; x < s.x1 - 0.5; x += 0.45) b.box(mats.brass, x - 0.012, Y + 1.6, zw - sg * 0.12, x + 0.012, Y + 1.66, zw, 'xXyYzZ');
      // a few coats and caps hanging on the hooks
      for (let x = s.x0 + 1.6; x < s.x1 - 1; x += 3.7 + rr() * 2) b.box(rr() < 0.5 ? mats.fabricBlue : mats.leather, x - 0.18, Y + 0.95, Math.min(zw - sg * 0.13, zw - sg * 0.03), x + 0.18, Y + 1.62, Math.max(zw - sg * 0.13, zw - sg * 0.03), 'xXyYzZ');
    }
    ceilingPipes(world, deck, pipe, s.x0, s.x1, o.pipes ?? [-1.8, 4.2, 9.0], 'steelDark', 0.07);
    ceilingPipes(world, deck, pipe, s.x0, s.x1, [12.6], 'paintWhite', 0.05);
  };
}

// ---------------------------------------------------------------- machinery access lobbies (steel)

export function machineLobby(ctx) {
  for (const p of ['near:hi', 'left:lo', 'right:lo', 'far:lo']) ctx.fit(locker({ n: 4, mat: 'steelDark' }), [p]);
  ctx.fit(bench({ w: 1.6, back: false, iron: true }), ['left:mid', 'right:mid', 'far:mid'], { collide: false });
  ctx.fit(wardrobe({ w: 1.0, mat: 'steelDark' }), ['far:hi', 'right:hi']);
  ctx.mount(gauge({ r: 0.14 }), 'near', ctx.W * 0.75, 1.7); ctx.mount(clockWall(), 'near', ctx.W * 0.6, 1.9);
  ctx.put(valve(), 0.25, ctx.D - 0.25, 'in', { collide: false });
  const { plan } = ctx, r = ctx.room, s = r.safe, y = ctx.y + ctx.h - 0.3;
  pipe(plan.zone((s.x0 + s.x1) / 2), 'steelDark', [[s.x0 + 0.15, y, s.z0 + 0.15], [s.x1 - 0.15, y, s.z0 + 0.15]], 0.08);
  pipe(plan.zone((s.x0 + s.x1) / 2), 'copper', [[s.x0 + 0.15, y - 0.2, s.z1 - 0.15], [s.x1 - 0.15, y - 0.2, s.z1 - 0.15]], 0.05);
}

export { Instancer };
