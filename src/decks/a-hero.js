// A deck – hand-detailed public rooms: forward Grand Staircase with the lifts, Lounge (Louis XV), Reading & Writing Room
// (Georgian, white), Smoking Room (Georgian, mahogany), Verandah Cafés / Palm Courts, aft Grand Staircase, second-class
// landing and entrance, bar pantry. Repeated furniture (chairs, tables, ornaments) is instanced.
import * as THREE from 'three';
import { STAIRS } from '../core/constants.js';
import { mats } from '../core/materials.js';
import {
  imperialPlan, fireplace, bookcase, settee, sofa, armchair, tableRound, pottedPalm, column, liftCage, writingDesk, chairDining, trellis,
  bench, backBar, barCounter, shelves, sink, clockWall, PRESETS, kitMats, def, matOf, faceDir, mirrorWall, ceilingRose, chandelier, picture,
  bookPile, newspaper, coatHooks, pilaster,
} from '../interior/kit.js';
import { tuftBack, cushion, turnedLeg, papers, SHAPES, PLATE, rngOf } from '../interior/props-core.js';
import { AT } from '../interior/batch.js';
import * as G from '../interior/geom.js';
import {
  detailer, wput, iput, fput, beginInst, reserve, reserveExtDoors, group, wx, wz, aWindows, extDoorSpans, deckMats, statue, ROT, PR,
  drapes, hangLamp,
} from './boat-util.js';

const HW = 10.15; // inner face of the A-deck house side walls
const K = kitMats;

// ============================================================================================== custom props

/** Georgian leather club armchair, deep-buttoned back and seat, rolled arms, turned feet on brass castors */
export const clubChair = def('abClubChair', [0.82, 0.82, 0.92], (p, o) => {
  const f = matOf(o.mat ?? 'leatherGreen'), wd = mats.woodDark;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { p.lathe(wd, [[0, 0.03], [0.024, 0.03], [0.032, 0.06], [0.034, 0.1], [0, 0.1]], sx * 0.3, 0, sz * 0.31, 8); p.c(mats.brass, 0.018, 0.03, sx * 0.3, 0, sz * 0.31, 6); }
  p.bb(f, 0.74, 0.25, 0.66, 0.02, 0.1, 0, 0.05);
  cushion(p, f, 0.52, 0.12, 0.5, 0.08, 0.34, 0);
  p.bb(f, 0.2, 0.56, 0.8, -0.31, 0.3, 0, 0.05);
  tuftBack(p, f, 0.5, 0.42, -0.205, 0.6, 0, 3, 3, 0.018, 0.034).rotation.z = 0.08;
  p.loft(f, [[-0.36, 0.86, -0.36], [-0.375, 0.89, 0], [-0.36, 0.86, 0.36]], 0.065, 8);
  for (const s of [-1, 1]) {
    p.bb(f, 0.7, 0.34, 0.14, 0.02, 0.28, s * 0.335, 0.04);
    p.loft(f, [[-0.32, 0.62, s * 0.34], [0.05, 0.635, s * 0.345], [0.37, 0.61, s * 0.34]], [[0.085, 0.07], [0.09, 0.075], [0.085, 0.07]], 8);
    p.latheX(f, [[0, 0], [0.075, 0], [0.08, 0.015], [0, 0.02]], 0.37, 0.6, s * 0.34, 10);
    p.b(mats.brass, 0.006, 0.012, 0.13, 0.372, 0.3, s * 0.335); // brass nailed edge on the arm front
  }
});
/** buttoned leather Chesterfield settee (arms and back at the same height) */
export const chesterfield = def('abChesterfield', (o) => [o.w ?? 1.6, 0.86, 0.8], (p, o) => {
  const f = matOf(o.mat ?? 'leatherGreen'), w = o.w ?? 1.6, wd = mats.woodDark;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.lathe(wd, [[0, 0], [0.03, 0], [0.04, 0.04], [0.03, 0.08], [0, 0.08]], sx * 0.33, 0, sz * (w / 2 - 0.1), 8);
  p.bb(f, 0.8, 0.26, w, 0.0, 0.08, 0, 0.05);
  const n = w > 1.4 ? 3 : 2, cw = (w - 0.36) / n;
  for (let i = 0; i < n; i++) cushion(p, f, 0.58, 0.12, cw - 0.01, 0.07, 0.33, -w / 2 + 0.18 + cw * (i + 0.5));
  p.bb(f, 0.2, 0.44, w, -0.3, 0.34, 0, 0.04);
  tuftBack(p, f, w - 0.36, 0.38, -0.195, 0.56, 0, Math.round(w * 5), 3, 0.018, 0.03);
  p.loft(f, [[-0.33, 0.77, -w / 2 + 0.05], [-0.34, 0.785, 0], [-0.33, 0.77, w / 2 - 0.05]], 0.07, 8);
  for (const s of [-1, 1]) {
    p.bb(f, 0.8, 0.4, 0.16, 0, 0.34, s * (w / 2 - 0.08), 0.04);
    p.loft(f, [[-0.36, 0.75, s * (w / 2 - 0.07)], [0.05, 0.77, s * (w / 2 - 0.065)], [0.4, 0.75, s * (w / 2 - 0.07)]], [[0.085, 0.07], [0.09, 0.075], [0.085, 0.07]], 8);
    const t = tuftBack(p, f, 0.6, 0.3, 0, 0.56, s * (w / 2 - 0.16), 4, 2, 0.014, 0.02); t.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2;
  }
});

const TUMBLER = SHAPES.TUMBLER;
function ashtray(p, x, y, z) { p.lathe(mats.brass, [[0, 0], [0.06, 0], [0.066, 0.016], [0.058, 0.024], [0.05, 0.012], [0, 0.01]], x, y, z, 12); p.cx(mats.leather, 0.008, 0.11, x + 0.03, y + 0.022, z + 0.02, 6).rotation.y = 0.5; }
function tumbler(p, x, y, z, full = true) { p.lathe(mats.glass, TUMBLER, x, y, z, 8); if (full) p.alathe(AT.amber, [[0, 0.006], [0.028, 0.006], [0.03, 0.045], [0, 0.045]], x, y, z, 8); }
function cards(p, r, x, y, z, n, spread = 0.025, a0 = 0) { for (let i = 0; i < n; i++) { const m = p.ab(AT.china, 0.088, 0.002, 0.062, x + (r() - 0.5) * 0.02, y + i * 0.0021, z + (i - n / 2) * spread); m.rotation.y = a0 + (i - n / 2) * 0.18 + (r() - 0.5) * 0.2; } }

/** mahogany card table with raised rim and baize; v = items (0 game, 1 patience, 2 drinks, 3 cleared) */
export const cardTable = def('abCardTable', [0.86, 0.86, 0.78], (p, o) => {
  const m = mats.mahogany, v = o.v ?? 0, r = rngOf(17 + v);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) turnedLeg(p, m, 0.7, sx * 0.36, sz * 0.36, 0.03, 0, 8);
  for (const s of [-1, 1]) { p.bb(m, 0.022, 0.1, 0.72, s * 0.38, 0.6, 0, 0.005); p.bb(m, 0.72, 0.1, 0.022, 0, 0.6, s * 0.38, 0.005); }
  p.bb(m, 0.86, 0.03, 0.86, 0, 0.7, 0, 0.01);
  p.ab(AT.felt, 0.74, 0.004, 0.74, 0, 0.728, 0);
  for (const s of [-1, 1]) { p.bb(m, 0.86, 0.024, 0.05, 0, 0.728, s * 0.405, 0.006); p.bb(m, 0.05, 0.024, 0.76, s * 0.405, 0.728, 0, 0.006); }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.c(mats.woodDark, 0.045, 0.002, sx * 0.28, 0.731, sz * 0.28, 10); // guinea wells
  const y = 0.733;
  if (v === 0) { for (let k = 0; k < 4; k++) { const a = (k * Math.PI) / 2; cards(p, r, Math.cos(a) * 0.26, y, Math.sin(a) * 0.26, 4, 0.02, a); } cards(p, r, 0, y, 0, 4, 0.03, 0.4); ashtray(p, 0.28, y, -0.28); tumbler(p, -0.28, y, 0.28); }
  else if (v === 1) { cards(p, r, -0.15, y, -0.1, 7, 0.07, 0); cards(p, r, 0.1, y, 0.15, 5, 0.05, 1.2); p.ab(AT.label, 0.09, 0.03, 0.065, 0.25, y, -0.25); papers(p, -0.2, y, 0.22, 0.3, 1); }
  else if (v === 2) { ashtray(p, 0, y, 0); tumbler(p, 0.2, y, -0.15); tumbler(p, -0.18, y, 0.2, false); p.ab(AT.yellow, 0.05, 0.015, 0.035, 0.12, y, 0.12); }
  else { p.ab(AT.china, 0.088, 0.03, 0.062, 0.05, y, -0.05); ashtray(p, -0.2, y, 0.18); }
});
/** round tripod smoking table; v = items (0 drinks + ashtray, 1 newspaper, 2 decanter, 3 cigar box) */
export const smokeTable = def('abSmokeTable', [0.76, 0.76, 0.76], (p, o) => {
  const m = mats.mahogany, R = 0.38, v = o.v ?? 0;
  p.lathe(m, [[0, 0.71], [R - 0.02, 0.71], [R, 0.725], [R - 0.004, 0.742], [R - 0.02, 0.75], [0, 0.75]], 0, 0, 0, 20);
  p.lathe(m, [[0, 0.1], [0.06, 0.1], [0.04, 0.2], [0.06, 0.34], [0.035, 0.48], [0.035, 0.62], [0.08, 0.68], [0.1, 0.71], [0, 0.71]], 0, 0, 0, 10);
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); p.loft(m, [[c * 0.03, 0.2, s * 0.03], [c * 0.13, 0.13, s * 0.13], [c * 0.25, 0.04, s * 0.25], [c * 0.29, 0.02, s * 0.29]], [[0.03, 0.04], [0.025, 0.035], [0.02, 0.025], [0.022, 0.02]], 5); }
  const y = 0.75;
  if (v === 0) { ashtray(p, 0.12, y, -0.1); tumbler(p, -0.12, y, 0.1); tumbler(p, -0.05, y, -0.2); }
  else if (v === 1) { papers(p, 0, y, 0, 0.6, 2); ashtray(p, 0.2, y, 0.15); }
  else if (v === 2) { p.lathe(mats.glass, SHAPES.CARAFE, 0, y, 0, 10); p.alathe(AT.amber, [[0, 0.004], [0.058, 0.004], [0.066, 0.08], [0, 0.08]], 0, y, 0, 10); tumbler(p, 0.17, y, 0.1); tumbler(p, -0.15, y, 0.12); }
  else { p.bb(mats.woodDark, 0.16, 0.06, 0.24, 0, y, 0, 0.006); p.ab(AT.gilt, 0.1, 0.002, 0.16, 0, y + 0.06, 0); ashtray(p, -0.2, y, -0.1); }
});
/** tea table (Lounge): round, tea service or books; v 0..3 */
export const teaTable = def('abTeaTable', [0.84, 0.84, 0.76], (p, o) => {
  const m = mats.oak, R = 0.42, v = o.v ?? 0;
  p.lathe(m, [[0, 0.71], [R - 0.02, 0.71], [R, 0.724], [R - 0.005, 0.742], [0, 0.75]], 0, 0, 0, 20);
  p.lathe(m, [[0, 0.62], [0.36, 0.62], [0.36, 0.71], [0, 0.71]], 0, 0, 0, 16);
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4, c = Math.cos(a), s = Math.sin(a); p.loft(mats.woodDark, [[c * 0.3, 0.64, s * 0.3], [c * 0.34, 0.45, s * 0.34], [c * 0.29, 0.2, s * 0.29], [c * 0.33, 0.03, s * 0.33]], [0.026, 0.022, 0.02, 0.024], 5); p.lathe(mats.gold, [[0, 0], [0.03, 0], [0.03, 0.02], [0, 0.03]], c * 0.33, 0, s * 0.33, 6); }
  const y = 0.75;
  if (v === 0 || v === 2) {
    p.lathe(mats.porcelain, [[0, 0], [0.05, 0], [0.075, 0.05], [0.07, 0.1], [0.04, 0.13], [0.02, 0.14], [0, 0.15]], 0, y, 0, 12); // teapot
    p.loft(mats.porcelain, [[0.06, y + 0.06, 0], [0.11, y + 0.1, 0], [0.13, y + 0.13, 0]], [0.014, 0.01, 0.008], 5);
    p.t(mats.porcelain, 0.04, 0.008, -0.08, y + 0.08, 0, 'z', 8, 3);
    for (let k = 0; k < (v === 0 ? 3 : 2); k++) { const a = 1 + k * 1.7, x = Math.cos(a) * 0.26, z = Math.sin(a) * 0.26; p.lathe(mats.porcelain, [[0, 0], [0.06, 0], [0.065, 0.01], [0, 0.008]], x, y, z, 10); p.lathe(mats.porcelain, SHAPES.CUP, x, y + 0.008, z, 8); }
    if (v === 0) { p.lathe(mats.chrome, [[0, 0], [0.02, 0], [0.008, 0.02], [0.008, 0.28], [0.015, 0.3], [0, 0.31]], -0.2, y, -0.18, 8); for (const [hh, rr] of [[0.06, 0.1], [0.17, 0.08]]) { p.lathe(mats.porcelain, [[0, 0], [rr, 0], [rr, 0.005], [0, 0.005]], -0.2, y + hh, -0.18, 12); for (let k = 0; k < 4; k++) p.ab(k % 2 ? AT.pink : AT.straw, 0.03, 0.02, 0.03, -0.2 + Math.cos(k * 1.6) * rr * 0.5, y + hh + 0.005, -0.18 + Math.sin(k * 1.6) * rr * 0.5); } }
  } else if (v === 1) { papers(p, 0.05, y, -0.05, 0.4, 2); p.ab(AT.bookA + 3, 0.15, 0.03, 0.22, -0.18, y, 0.15, true); }
  else { p.lathe(mats.glass, [[0, 0], [0.04, 0], [0.05, 0.05], [0.025, 0.14], [0.03, 0.18], [0, 0.17]], 0, y, 0, 8); for (let i = 0; i < 7; i++) { const a = i * 0.9; p.ag(i % 2 ? AT.flowerRed : AT.pink, new THREE.SphereGeometry(0.03, 6, 4), Math.cos(a) * 0.04, y + 0.2 + (i % 3) * 0.02, Math.sin(a) * 0.04); } }
});
/** café table with a small lace cloth (Verandah): cane top on a white pedestal; v 0..2 items */
export const cafeTable = def('abCafeTable', [0.72, 0.72, 0.76], (p, o) => {
  const v = o.v ?? 0, R = 0.36;
  p.lathe(K.cane, [[0, 0.71], [R, 0.71], [R + 0.01, 0.73], [R, 0.745], [0, 0.745]], 0, 0, 0, 20);
  p.lathe(mats.wicker, [[0, 0], [0.24, 0], [0.24, 0.02], [0.22, 0.05], [0.06, 0.12], [0.05, 0.6], [0.12, 0.68], [0.3, 0.71], [0, 0.71]], 0, 0, 0, 14);
  p.rev(mats.linen, [{ o: 0.27, y: 0.746, m: 0.012 }, { o: 0.25, y: 0.748, m: 0.006 }, { o: 0.0, y: 0.75 }], { seg: 32, k: 12, capTop: true }, 0, 0, 0);
  const y = 0.75;
  p.lathe(mats.glass, [[0, 0], [0.025, 0], [0.03, 0.04], [0.012, 0.12], [0.016, 0.14], [0, 0.13]], 0, y, 0, 8);
  for (let i = 0; i < 5; i++) { const a = i * 1.26 + v; p.ag(i % 2 ? AT.flowerYellow : AT.flowerWhite, new THREE.SphereGeometry(0.022, 6, 4), Math.cos(a) * 0.028, y + 0.15 + (i % 2) * 0.015, Math.sin(a) * 0.028); }
  for (let k = 0; k < (v === 0 ? 2 : v === 1 ? 1 : 0); k++) { const a = 0.6 + k * 3.0, x = Math.cos(a) * 0.22, z = Math.sin(a) * 0.22; p.lathe(mats.porcelain, [[0, 0], [0.06, 0], [0.065, 0.01], [0, 0.008]], x, y, z, 10); p.lathe(mats.porcelain, SHAPES.CUP, x, y + 0.008, z, 8); }
  if (v === 2) { p.lathe(mats.porcelain, PLATE, 0.18, y, -0.1, 12); p.ab(AT.tea, 0.06, 0.03, 0.06, 0.18, y + 0.012, -0.1); }
});
/** gilt rocaille cartouche (Louis XV boiserie) – wall mounted, origin = centre on the wall, front +x */
export const rocaille = def('abRocaille', [0.34, 0.04, 0.2], (p) => {
  const g = mats.gold, sh = [];
  for (let i = 0; i <= 20; i++) { const a = (Math.PI * i) / 20, rr = 0.065 * (1 + 0.2 * Math.abs(Math.sin(a * 5))); sh.push([Math.cos(a) * rr * 1.2, Math.sin(a) * rr]); }
  p.extX(g, sh, 0.01, 0.006, -0.03, 0, 0.002);
  for (const s of [-1, 1]) {
    const pts = []; for (let k = 0; k <= 10; k++) { const a = k * 0.62, rad = 0.05 * (1 - k / 14); pts.push([0.012, -0.02 + Math.sin(a) * rad, s * (0.11 + Math.cos(a) * rad)]); }
    p.tube(g, pts, 0.006, 12, 4);
    p.tube(g, [[0.01, -0.035, s * 0.02], [0.012, -0.06, s * 0.07], [0.012, -0.05, s * 0.12]], 0.005, 6, 3);
  }
  p.extX(g, [[-0.025, 0], [0.025, 0], [0.012, -0.05], [0, -0.08], [-0.012, -0.05]], 0.008, 0.006, -0.035, 0, 0.002);
});
/** moulded lyre in a laurel wreath (Lounge ceiling) – origin at the ceiling */
export const lyre = def('abLyre', [0.6, 0.6, 0.04], (p) => {
  const g = mats.gold, y = -0.014;
  p.t(mats.plaster, 0.25, 0.012, 0, -0.008, 0, 'y', 28, 4);
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; p.s(mats.plaster, 0.03, Math.cos(a) * 0.25, -0.01, Math.sin(a) * 0.25, 1, 0.4, 0.5).rotation.y = -a + 0.6; }
  for (const s of [-1, 1]) p.tube(g, [[-0.13, y, s * 0.03], [-0.08, y, s * 0.11], [0.02, y, s * 0.12], [0.1, y, s * 0.07], [0.15, y, s * 0.1], [0.165, y, s * 0.14]], 0.011, 12, 4);
  p.cz(g, 0.009, 0.26, 0.12, y, 0, 6);
  p.bb(g, 0.04, 0.014, 0.09, -0.15, y - 0.007, 0, 0.004);
  for (let k = 0; k < 5; k++) p.b(g, 0.25, 0.003, 0.004, -0.01, y, (k - 2) * 0.022);
});
/** two-tier crystal electrolier (Lounge) – origin at the ceiling */
export const electrolier = def('abElectrolier', [1.4, 1.4, 1.1], (p) => {
  const g = mats.gold, cr = K.crystal;
  p.lathe(g, [[0, 0], [0.22, 0], [0.2, -0.015], [0.14, -0.03], [0.07, -0.05], [0, -0.06]], 0, 0, 0, 20);
  p.lathe(g, [[0.015, -0.05], [0.015, -0.25], [0.04, -0.28], [0.018, -0.32], [0.018, -0.48], [0.05, -0.52], [0.03, -0.56], [0.09, -0.6], [0.12, -0.63], [0, -0.65]].reverse(), 0, 0, 0, 12); // stem (profile bottom → top: faces outwards)
  p.rev(K.cutGlass, [{ o: 0.0, y: -0.98 }, { o: 0.1, y: -0.95, m: 0.006 }, { o: 0.2, y: -0.86, m: 0.01 }, { o: 0.26, y: -0.74, m: 0.008 }, { o: 0.27, y: -0.66, m: 0.004 }], { seg: 32, k: 16, capBottom: true, capTop: true }, 0, 0, 0);
  p.t(g, 0.27, 0.012, 0, -0.66, 0, 'y', 32, 4);
  const drop = (x, y, z, s = 1) => p.lathe(cr, [[0, 0], [0.012 * s, -0.012 * s], [0, -0.035 * s]], x, y, z, 4);
  for (const [n, R, yy, ph] of [[8, 0.6, -0.62, 0], [8, 0.4, -0.42, Math.PI / 8]]) {
    const tips = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + ph, c = Math.cos(a), s = -Math.sin(a);
      p.loft(g, [[c * 0.06, yy - 0.1, s * 0.06], [c * R * 0.45, yy - 0.16, s * R * 0.45], [c * R * 0.85, yy - 0.12, s * R * 0.85], [c * R, yy - 0.04, s * R]], 0.012, 6);
      p.lathe(g, [[0, 0], [0.035, 0], [0.04, 0.012], [0.015, 0.02], [0, 0.03]], c * R, yy - 0.04, s * R, 10);
      p.lathe(mats.lampGlow, [[0, 0], [0.022, 0], [0.055, 0.07], [0.058, 0.11], [0.04, 0.12], [0, 0.12]], c * R, yy - 0.01, s * R, 12);
      drop(c * R, yy - 0.06, s * R, 1.4);
      tips.push([c * R, yy - 0.08, s * R]);
    }
    for (let i = 0; i < n; i++) { // festoons of crystal drops between the arms, strung on a thin crystal chain
      const A = tips[i], B = tips[(i + 1) % n], at = (t) => [A[0] + (B[0] - A[0]) * t, A[1] - 0.09 * Math.sin(Math.PI * t), A[2] + (B[2] - A[2]) * t];
      p.tube(cr, [0, 0.2, 0.4, 0.6, 0.8, 1].map(at), 0.003, 5, 3);
      for (let k = 1; k < 5; k++) drop(...at(k / 5));
    }
  }
  // strands of touching drops hanging from the rim of the cut-glass bowl
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; for (let k = 0; k < 4; k++) drop(Math.cos(a) * 0.272, -0.668 - k * 0.035, Math.sin(a) * 0.272); }
  p.lathe(cr, [[0, 0], [0.03, -0.03], [0, -0.11]], 0, -0.98, 0, 8);
});
/** ivy cluster hanging from a trellis top – origin = mounting point, front +x */
export const ivy = def('abIvy', (o) => [0.4, 0.1, o.h ?? 0.9], (p, o) => {
  const r = rngOf(o.v ?? 3), h = o.h ?? 0.9, polys = [];
  for (let vn = 0; vn < 3; vn++) {
    let z = (r() - 0.5) * 0.3, y = 0;
    while (y > -h) {
      y -= 0.05 + r() * 0.04; z += (r() - 0.5) * 0.08;
      for (let l = 0; l < 2; l++) {
        const s = 0.03 + r() * 0.025, a = r() * 6.28, cx = 0.03 + r() * 0.04, cy = y + Math.sin(a) * 0.025, cz = z + Math.cos(a) * 0.03, tw = (r() - 0.5) * 0.6;
        const P = (u, v) => [cx + u * tw * 0.3 + 0.01 * v, cy + v * s, cz + u * s];
        polys.push([P(0, -1), P(0.9, 0.1), P(0.5, 0.8)], [P(0, -1), P(0.5, 0.8), P(0, 0.45)], [P(0, -1), P(0, 0.45), P(-0.5, 0.8)], [P(0, -1), P(-0.5, 0.8), P(-0.9, 0.1)]);
      }
    }
  }
  p.add(G.polysGeo(polys), K.ivy);
});

// ============================================================================================== helpers

/** line both exterior side walls between x0..x1 */
function lineSides(d, x0, x1, o) {
  for (const s of [-1, 1]) d.lineExterior(wx(s * HW, -s), x0, x1, { ...o, wins: aWindows(s), doors: extDoorSpans('A', s, 10.3) });
}
/** panels on a wall face over several intervals */
function panelRuns(d, w, runs, o) { for (const [a, b] of runs) if (b - a > 0.3) d.panels(w, a, b, o); }
const winsIn = (s, a, e) => aWindows(s).filter(([p, q]) => q > a && p < e);
const doorSkip = (list, m = 0.16) => list.map(([c, w]) => [c - w / 2 - m, c + w / 2 + m]);
/** mother-of-pearl inlay on a panel (diamond, stringing, dots) */
function inlay(d, w, M) {
  return (ac, u0, u1, pw, off) => {
    const yc = (u0 + u1) / 2, o2 = off + 0.0135, { O } = d.frame(w);
    d.b.poly(M.pearl, [d.pt(w, ac - 0.07, yc, o2), d.pt(w, ac, yc - 0.15, o2), d.pt(w, ac + 0.07, yc, o2), d.pt(w, ac, yc + 0.15, o2)], O);
    for (const yy of [u0 + 0.14, u1 - 0.14]) d.b.disc(M.pearl, d.pt(w, ac, yy, o2), O, 0.022, 8);
    d.path(M.pearl, w, d.rectLoop(ac - pw / 2 + 0.07, ac + pw / 2 - 0.07, u0 + 0.07, u1 - 0.07), [[0, 0], [0.0015, 0], [0.0015, 0.006], [0, 0.006]], off + 0.012, true);
  };
}
/** gilt rocaille at the head of each Lounge panel */
function rocailles(d, ctx, w) {
  return (ac, u0, u1, pw, off) => {
    const c = w.c + w.n * (off + 0.013), x = w.axis === 'x' ? ac : c, z = w.axis === 'x' ? c : ac;
    const pr = rocaille(); ctx.plan.prop(pr, x, z, d.wrot(w), { y: d.Y + u1 - 0.17, collide: false }); ctx.inst?.take(pr);
  };
}
/** gilt picture frame (moulded) round a flat painting on a wall */
function framed(d, w, mat, a0, a1, y0, y1, off, fm = 'gold') {
  d.wquad(mat, w, a0, a1, y0, y1, off + 0.004);
  d.path(fm, w, d.rectLoop(a0, a1, y0, y1), [[0, 0], [0.02, 0.004], [0.034, 0.02], [0.03, 0.045], [0.04, 0.06], [0.016, 0.075], [0, 0.08]], off, true);
}

// ============================================================================================== forward Grand Staircase

function liftShafts(ctx, d) {
  const x0 = 45.5, x1 = 47.45, H = d.H, Y = d.Y;
  for (const s of [-1, 1]) d.box('oakPanel', x0, s * 2.4, x1, s * 2.48, 0, H);
  for (const z of [-2.4, -0.8, 0.8, 2.4]) { d.box('oak', x0 - 0.09, z - 0.09, x0 + 0.02, z + 0.09, 0, H); d.box('gold', x0 - 0.1, z - 0.1, x0 + 0.03, z + 0.1, 2.05, 2.12); }
  d.box('oak', x0 - 0.07, -2.48, x0 + 0.02, 2.48, 2.12, H);
  d.box('gold', x0 - 0.085, -2.48, x0 - 0.07, 2.48, 2.5, 2.54);
  for (const zc of [-1.6, 0, 1.6]) {
    d.wquad(K.ironwork, wz(x0, -1), zc - 0.71, zc + 0.71, 0.05, 2.05, 0.012);
    d.box('brass', x0 - 0.05, zc - 0.71, x0 - 0.01, zc + 0.71, 1.0, 1.04);
    d.b.disc(K.clockFace, [x0 - 0.075, Y + 2.31, zc], [-1, 0, 0], 0.09, 12, true);
    d.b.ring(K.bronze ?? K.plate, [x0 - 0.08, Y + 2.31, zc], [-1, 0, 0], 0.09, 0.12, 12);
    ctx.plan.prop(liftCage(), 46.45, zc, Math.PI, { collide: false });
  }
  d.world.addCollider(x0 - 0.1, Y, -2.5, 47.5, Y + H, 2.5);
  ctx.occupied.push({ x0: 45.3, x1: 47.5, z0: -2.6, z1: 2.6 });
}

export function furnishHallFwd(ctx) {
  const d = detailer(ctx), H = d.H;
  reserveExtDoors(ctx);
  liftShafts(ctx, d);
  lineSides(d, 37.55, 47.45, { wall: 'oakPanel', wainscot: 'oak', cornice: 'gold', dado: 'oak', reveal: 'oak', panels: { mat: 'oakPanel', pitch: 1.0 } });
  const P = { mat: 'oakPanel', orn: 'gold', pitch: 1.1, y0: 0.95, y1: H - 0.3 };
  const aw = wz(37.55, 1), fw = wz(47.45, -1);
  panelRuns(d, aw, [[-10.1, -4.55], [4.55, 10.1]], P);
  d.pilasters(aw, [-9.95, -7.4, -4.75, -3.05, 3.05, 4.75, 7.4, 9.95], { h: H, w: 0.3 });
  d.sconces(aw, [-8.6, -6.1, 6.1, 8.6], 1.9);
  panelRuns(d, fw, [[-10.1, -6.95], [-5.45, -2.6], [2.6, 5.45], [6.95, 10.1]], P);
  d.pilasters(fw, [-9.95, -7.05, -5.35, -2.55, 2.55, 5.35, 7.05, 9.95], { h: H, w: 0.3 });
  d.sconces(fw, [-8.5, -4.0, 4.0, 8.5], 1.9);
  for (const s of [-1, 1]) {
    group(ctx, 39.6, s * 6.4, { r: 0.4, n: 4, kind: 'wicker', tmat: 'oak', a0: Math.PI / 4 });
    group(ctx, 44.6, s * 6.4, { r: 0.4, n: 4, kind: 'uph', mat: 'fabricGreen', tmat: 'oak', a0: Math.PI / 4 });
    for (const x of [39.4, 44.6]) wput(ctx, settee({ mat: 'fabricGreen', w: 1.7 }), x, s * 9.75, s < 0 ? 'stbd' : 'port');
    wput(ctx, pottedPalm(), 38.0, s * 9.6, 'fwd', { collide: false });
    wput(ctx, pottedPalm(), 47.0, s * 9.6, 'aft', { collide: false });
    d.coffer(37.6, 47.4, s < 0 ? -10.1 : 3.0, s < 0 ? -3.0 : 10.1, { bead: 'gold', pitchX: 2.45, pitchZ: 2.35 });
  }
  const sp = imperialPlan(STAIRS.find((q) => q.id === 'grandFwd'));
  for (const x of [sp.x0 + 0.7, sp.xf + 0.45]) for (const s of [-1, 1]) d.put(column({ h: H, r: 0.16, mat: 'oak', capital: 'gold' }), x, s * (sp.hw + 0.6), 0, true);
}

// ============================================================================================== Lounge (Louis XV)

export function furnishLounge(ctx) {
  const d = detailer(ctx), H = d.H, Y = d.Y, M = deckMats(), I = beginInst(ctx), rnd = ctx.drng;
  const X0 = 2.05, X1 = 18.95;
  // --- boiserie: carved English oak, arched panel heads with gilt rocaille, bolection mouldings with gilt beads
  const B = (w, extra = {}) => ({ mat: 'oak', frame: 'gold', pitch: 0.85, arch: true, orn: rocailles(d, ctx, w), ...extra });
  for (const s of [-1, 1]) {
    const w = wx(s * HW, -s), wins = winsIn(s, X0, X1);
    d.lineExterior(w, X0, X1, { wall: 'oak', wainscot: 'oak', dado: 'gold', wins, doors: [] });
    d.dress(w, X0, X1, B(w, { off: 0.03, skip: wins.map(([p, q]) => [p - 0.42, q + 0.42]), skipLow: wins.map(([p, q]) => [p - 0.12, q + 0.12]), skipHigh: wins.map(([p, q]) => [p - 0.42, q + 0.42]) }));
    d.mould('oak', w, X0, X1, H - 0.16, PR.cornice, 0.03);
    for (const [p, q] of wins) {
      d.archWindow(w, p, q, { frame: 'oak', spandrel: 'oak', key: 'gold', off: 0.03 });
      d.pilasters(w, [p - 0.3, q + 0.3], { h: H, w: 0.24, mat: 'oak', off: 0.03 });
      d.wmount(drapes({ w: 2.0, h: 2.42, mat: 'silk', pelmet: 'gold' }), w, (p + q) / 2, 2.6, 0.03);
    }
  }
  const aw = wz(X0, 1), fw = wz(X1, -1);
  d.dress(aw, -10.1, 10.1, B(aw, { skip: [...doorSkip([[-4.5, 1.6], [4.5, 1.6]], 0.3), [-1.05, 1.05]] }));
  d.dress(fw, -10.1, 10.1, B(fw, { skip: doorSkip([[-1.5, 1.2], [3.9, 1.2]], 0.3) }));
  d.pilasters(aw, [-9.95, -5.65, -3.35, 3.35, 5.65, 9.95], { h: H, w: 0.3, mat: 'oak' });
  d.pilasters(fw, [-9.95, -2.45, -0.55, 3.05, 4.75, 9.95], { h: H, w: 0.3, mat: 'oak' });
  // great pier mirror on the aft wall between the doors, carved and gilt, above a console
  d.wmount(mirrorWall({ w: 1.5, h: 1.75, frame: 'gold' }), aw, 0, 1.75, 0.01);
  const rc = rocaille(); d.wmount(rc, aw, 0, 2.66, 0.04); rc.scale.setScalar(1.6);
  d.sconces(aw, [-1.0, 1.0, -7.8, 7.8], 1.95, 0.02);
  d.sconces(fw, [-6.2, 6.2, 1.2], 1.95, 0.02);
  // casing: the grey-marble fireplace with the Artemis of Versailles (aft face), the lending library (forward face)
  const ca = wz(8.5, -1), cf = wz(15.5, 1);
  d.dress(ca, -3.02, 3.02, B(ca, { clad: 'oak', skip: [[-1.25, 1.25]], cladSkip: [] }));
  wput(ctx, fireplace({ mat: 'marble', mirror: false, clock: false }), 8.29, 0, 'aft');
  d.glow(7.9, 0, 0.4, 0xff8a3a, 0.8);
  d.wbox('oak', ca, -1.2, 1.2, 1.31, H - 0.18, 0.09, 0.012);
  framed(d, ca, mats.mirror, -0.62, 0.62, 1.42, 2.28, 0.102);
  d.pilasters(ca, [-1.05, 1.05], { h: H, w: 0.22, mat: 'oak', off: 0.1 });
  const rc2 = rocaille(); d.wmount(rc2, ca, 0, 2.38, 0.105); rc2.scale.setScalar(1.3);
  statue(ctx.plan.zone(8), 8.24, Y + 1.295, 0, ROT.aft, 0.62);
  for (const z of [-1.3, 1.3]) wput(ctx, bookcase({ mat: 'oak', w: 1.6, seed: z > 0 ? 7 : 3 }), 15.7, z, 'fwd');
  d.dress(cf, -3.02, 3.02, B(cf, { clad: 'oak', cladSkip: [], skip: [[-2.15, 2.15]] }));
  for (const s of [-1, 1]) {
    const cs = wx(s * 3, s);
    d.dress(cs, 8.45, 15.55, B(cs, { clad: 'oak', cladSkip: [], skip: [[8.4, 8.85], [11.75, 12.25], [15.15, 15.6]] }));
    d.pilasters(cs, [8.65, 12, 15.35], { h: H, w: 0.3, mat: 'oak', off: 0.012 });
    d.sconces(cs, [10.3, 13.7], 1.95, 0.02);
  }
  // --- furniture: hearth group, bergères round tea tables, card tables, settees
  wput(ctx, sofa({ mat: 'fabricGold', w: 1.8 }), 5.65, 0, 'aft');
  wput(ctx, teaTable({ v: 0 }), 6.95, 0, 'fwd');
  for (const s of [-1, 1]) { const a = armchair({ kind: 'uph', mat: 'fabricGreen' }); fput(ctx, a, 7.1, s * 1.3, faceDir(-0.3, -s), 0.7); }
  iput(ctx, settee({ mat: 'fabricGreen', w: 1.85 }), 2.45, 0, 'fwd');
  const covers = ['fabricGreen', 'fabricGold', 'fabricGreen'];
  let i = 0;
  for (const s of [-1, 1]) {
    for (const [x, z] of [[4.4, 2.8], [4.6, 7.5], [7.3, 5.2], [10.2, 5.3], [13.4, 5.3], [10.2, 8.3], [13.4, 8.3], [17.3, 5.6], [16.9, 8.4]]) {
      const card = i % 4 === 3;
      if (card) group(ctx, x, s * z, { table: cardTable({ v: i % 3 }), n: 4, dist: 0.88, a0: 0, chair: () => armchair({ kind: 'uph', mat: 'fabricGreen' }), sq: 0.6 });
      else group(ctx, x, s * z, { table: teaTable({ v: i % 4 === 1 ? 1 : i % 4 === 2 ? 3 : 2 }), n: i % 3 === 0 ? 3 : 4, dist: 0.95, a0: s * 0.3 + rnd() * 0.4, chair: () => armchair({ kind: 'uph', mat: covers[i % 3] }), sq: 0.6 });
      i++;
    }
  }
  group(ctx, 17.4, 1.6, { table: cardTable({ v: 1 }), n: 4, dist: 0.88, chair: () => armchair({ kind: 'uph', mat: 'fabricGold' }), sq: 0.6 });
  group(ctx, 17.2, -3.3, { table: teaTable({ v: 2 }), n: 3, dist: 0.95, a0: 0.5, chair: () => armchair({ kind: 'uph', mat: 'fabricGreen' }), sq: 0.6 });
  for (const s of [-1, 1]) { wput(ctx, pottedPalm(), 2.6, s * 9.55, 'fwd', { collide: false }); wput(ctx, pottedPalm(), 18.4, s * 9.55, 'aft', { collide: false }); }
  // --- ceiling: moulded panels with gilt beads, lyres in laurel wreaths (music motifs), the great electrolier
  d.ceiling(X0 + 0.05, X1 - 0.05, -10.1, 10.1, {
    bead: 'gold', pitchX: 2.8, pitchZ: 2.9, depth: 0.16, skip: [{ x0: 8.45, x1: 15.55, z0: -3.05, z1: 3.05 }],
    cell: (cx, cz, i, j) => {
      if (i === 1 && j === 3) return; // the electrolier
      if ((i === 3 && (j === 1 || j === 5)) || (i === 5 && j === 3)) { d.lamp(cx, cz, 'chandelier'); return; }
      if ((i === 0 || i === 5) && (j === 0 || j === 6)) { d.lamp(cx, cz, 'bowl'); return; }
      const l = lyre(); d.mount(l, cx, cz, Math.abs(cz) > 4 ? Math.PI / 2 : 0, H - 0.002); I.take(l);
    },
  });
  d.mount(electrolier(), 6.3, 0, 0, H);
  d.mount(ceilingRose({ r: 0.55 }), 6.3, 0, 0, H);
  d.world.addLamp({ x: 6.3, y: Y + H - 0.8, z: 0, intensity: 1.6 });
  I.flush();
}


// ============================================================================================== Reading & Writing Room

export function furnishReading(ctx) {
  const d = detailer(ctx), H = d.H, M = deckMats(), I = beginInst(ctx), rnd = ctx.drng;
  reserveExtDoors(ctx);
  const W = 'paintWhite', B = { mat: W, frame: W, pitch: 0.85, stile: 0.11 };
  // port side (exterior): white panelling, the bow window over the two aft windows
  const pw = wx(-HW, 1), wins = winsIn(-1, 19.05, 30.45), doors = extDoorSpans('A', -1, 10.3);
  d.lineExterior(pw, 19.05, 30.45, { wall: W, wainscot: W, dado: W, cornice: W, wins, doors });
  const holes = [...wins, ...doors].map(([p, q]) => [p - 0.12, q + 0.12]);
  d.dress(pw, 19.05, 30.45, { ...B, off: 0.03, skip: [[25.3, 30.45], ...holes], skipLow: holes, skipHigh: [[25.3, 30.45], ...holes] });
  const aw = wz(19.05, 1), fw = wz(30.45, -1), sw = wx(2.95, -1);
  d.dress(aw, -10.1, 2.95, { ...B, skip: doorSkip([[-1.5, 1.2]], 0.25) });
  d.dress(fw, -10.1, 2.95, { ...B, skip: [...doorSkip([[-3.9, 1.0]], 0.25), [-1.2, 1.2]] });
  d.dress(sw, 19.1, 30.4, { ...B, skip: doorSkip([[21.0, 1.2], [28.6, 1.2]], 0.25) });
  d.pilasters(aw, [-9.95, -6.2, -2.4, 2.8], { h: H, w: 0.26, mat: W, capital: W });
  d.pilasters(sw, [19.25, 24.8, 30.25], { h: H, w: 0.26, mat: W, capital: W });
  // bow window: Ionic column and moulded beam frame the bay; silk drapes, cushioned window seat with bolsters
  d.put(column({ h: H, r: 0.12, mat: W, capital: W }), 25.4, -8.85, 0, true);
  d.box(W, 25.4, -HW, 30.45, -8.75, H - 0.3, H);
  d.mould(W, wx(-8.75, 1), 25.4, 30.4, H - 0.36, PR.cornice.map(([o, u]) => [o * 0.5, u * 0.4]));
  for (const [p, q] of wins.filter(([p]) => p > 25)) {
    d.archWindow(pw, p, q, { frame: W, spandrel: W, key: W, off: 0.03 });
    d.wmount(drapes({ w: 2.05, h: 2.35, mat: 'drapeRose', pelmet: W }), pw, (p + q) / 2, H - 0.32, 0.03);
  }
  d.box(W, 25.65, -HW, 30.3, -9.6, 0, 0.4, true);
  d.box(M.fabricRose, 25.7, -HW + 0.02, 30.25, -9.62, 0.4, 0.47); // seat cushion
  for (const x of [25.8, 30.15]) d.b.prism(M.fabricRose, [x, d.Y + 0.53, -10.1], [x, d.Y + 0.53, -9.65], 0.07, 10, true);
  for (let k = 0; k < 4; k++) { const c = new THREE.Mesh(G.pillow(0.14, 0.32, 0.36, 0.5, 0.35, 3, 10), M.fabricRose); c.position.set(26.6 + k * 1.05, d.Y + 0.47, -10.0); c.rotation.set(0.25, 0, 0.05 * k); ctx.plan.zone(27).add(c); }
  // fireplace with overmantel mirror on the forward wall
  wput(ctx, fireplace({ mat: 'marble', mirror: true, clock: true }), 30.24, 0, 'aft');
  d.glow(30.0, 0, 0.4, 0xff8a3a, 0.7);
  wput(ctx, tableRound({ r: 0.33, mat: 'mahogany', items: true }), 28.7, 0, 'fwd');
  for (const s of [-1, 1]) fput(ctx, armchair({ kind: 'uph', mat: M.fabricRose }), 28.75, s * 1.05, faceDir(0.35, -s), 0.7);
  // writing desks (blotters, inkwells, letter racks, shaded lamps) along the aft and inboard walls
  for (const z of [-9.25, -7.95, -6.65, -5.35, -4.05]) if (wput(ctx, writingDesk(), 19.37, z, 'fwd')) iput(ctx, chairDining({ cls: 'first', seat: M.fabricRose }), 20.05, z, 'aft', { collide: false, turn: (rnd() - 0.5) * 0.3 });
  for (const x of [22.7, 23.9, 25.9, 27.1]) if (wput(ctx, writingDesk(), x, 2.63, 'port')) iput(ctx, chairDining({ cls: 'first', seat: M.fabricRose }), x, 1.95, 'stbd', { collide: false, turn: (rnd() - 0.5) * 0.3 });
  for (const [x, z] of [[19.4, -6.6], [19.4, -4.0], [24.8, 2.4]]) d.glow(x + 0.3, z, 1.0, 0xffd9a0, 0.35);
  for (const [x, z, v] of [[22.6, -6.1, 1], [26.6, -6.0, 0], [22.6, -2.4, 2], [26.2, -2.6, 1]]) group(ctx, x, z, { r: 0.4, table: tableRound({ r: 0.4, mat: 'mahogany', items: v === 1 }), n: 3, dist: 0.95, a0: 0.5 + v, chair: () => armchair({ kind: 'uph', mat: M.fabricRose }), sq: 0.6 });
  wput(ctx, sofa({ mat: M.fabricRose, w: 1.7 }), 21.0, -9.7, 'stbd');
  wput(ctx, bookcase({ mat: 'mahogany', w: 1.4, seed: 11 }), 30.25, -6.6, 'aft');
  for (const [x, z] of [[19.6, 2.4], [30.0, 2.45], [19.6, -9.6], [25.0, -9.4]]) wput(ctx, pottedPalm(), x, z, 'fwd', { collide: false });
  // ceiling: delicate white mouldings, roses, bowl lights; chandelier in the middle
  d.ceiling(19.1, 30.4, -10.1, 2.9, { mat: 'plaster', pitchX: 2.85, pitchZ: 3.25, depth: 0.1, w: 0.18, cell: (cx, cz, i, j) => { if ((i + j) % 2 === 0) d.lamp(cx, cz, 'bowl'); else d.mount(ceilingRose({ r: 0.32 }), cx, cz, 0, H); } });
  I.flush();
}

// ============================================================================================== Smoking Room (Georgian)

/**
 * revolving door between the Smoking Room and the starboard Verandah Café (wings book-folded for passage). The drum stands
 * in the 2.5 × 2.0 m opening of the aft wall, centred on the wall plane: everything stays below the lintel (y 2.0) and
 * 1 cm inside the jambs, so neither the drum nor its canopy passes through the wall or the architraves.
 */
function revolvingDoor(ctx, d, x, z) {
  const zone = ctx.plan.zone(x), R = 1.24, RC = 1.25, Y = d.Y;
  const add = (geo, mat, y = 0, ry = 0) => { const m = new THREE.Mesh(geo, matOf(mat)); m.position.set(x, Y + y, z); m.rotation.y = ry; zone.add(m); };
  for (const a0 of [-0.7, Math.PI - 0.7]) {
    add(G.arcWall(R, 0.05, a0, 1.4, 0, 0.8, 12), 'mahogany');
    add(G.arcWall(R - 0.015, 0.012, a0, 1.4, 0.8, 0.98, 12), mats.glass);
    add(G.arcWall(R, 0.05, a0, 1.4, 1.78, 0.09, 12), 'mahogany');
    for (const t of [0, 0.5, 1]) { const a = a0 + 1.4 * t; d.box('mahogany', x + Math.sin(a) * (R - 0.025) - 0.03, z + Math.cos(a) * (R - 0.025) - 0.03, x + Math.sin(a) * (R - 0.025) + 0.03, z + Math.cos(a) * (R - 0.025) + 0.03, 0.8, 1.78); }
    add(G.arcWall(R + 0.004, 0.012, a0, 1.4, 0.77, 0.03, 12), 'brass');
    const zs = Math.cos(a0 + 0.7) > 0 ? 1 : -1;
    d.world.addCollider(x - 0.82, Y, z + zs * (RC * Math.cos(0.7) - 0.02) - (zs < 0 ? 0.35 : 0), x + 0.82, Y + 2.3, z + zs * (RC * Math.cos(0.7) - 0.02) + (zs > 0 ? 0.35 : 0));
  }
  add(G.lathe([[0, 1.885], [R, 1.885], [R, 1.94], [R - 0.03, 1.968], [R - 0.09, 1.99], [0, 1.99]], 32), 'mahogany'); // canopy just under the lintel
  add(G.lathe([[0, 0], [R, 0], [R, 0.012], [0, 0.012]], 32), 'brass');
  add(G.lathe([[0, 1.868], [R + 0.004, 1.868], [R + 0.004, 1.886], [0, 1.886]], 32), 'gold');
  // book-folded wings in the centre plane, brass centre post
  d.box('mahogany', x - R + 0.06, z - 0.035, x + R - 0.06, z + 0.035, 0.03, 1.868);
  d.world.addCollider(x - RC + 0.06, Y + 0.03, z - 0.035, x + RC - 0.06, Y + 2.18, z + 0.035);
  d.box(mats.glass, x - R + 0.14, z - 0.04, x + R - 0.14, z + 0.04, 0.9, 1.75);
  d.box('brass', x - R + 0.06, z - 0.04, x + R - 0.06, z + 0.04, 0.95, 1.0);
  add(G.lathe([[0, 0], [0.05, 0], [0.04, 0.04], [0.035, 1.87], [0, 1.87]], 12), 'brass');
}

export function furnishSmoking(ctx) {
  const d = detailer(ctx), H = d.H, M = deckMats(), I = beginInst(ctx), rnd = ctx.drng;
  const X0 = -35.95, X1 = -13.55, MAH = 'mahogany', FR = 'woodDark';
  const B = (w, extra = {}) => ({ mat: MAH, frame: FR, pitch: 0.78, stile: 0.11, orn: inlay(d, w, M), ...extra });
  // --- side walls: mahogany boiserie with mother-of-pearl inlay; stained-glass windows in arched recesses between pilasters
  for (const s of [-1, 1]) {
    const w = wx(s * HW, -s), wins = winsIn(s, X0, X1);
    d.lineExterior(w, X0, X1, { wall: MAH, wainscot: MAH, dado: FR, wins, doors: [] });
    d.dress(w, X0, X1, B(w, { off: 0.03, skip: wins.map(([p, q]) => [p - 0.36, q + 0.36]), skipLow: wins.map(([p, q]) => [p - 0.12, q + 0.12]), skipHigh: wins.map(([p, q]) => [p - 0.36, q + 0.36]) }));
    d.mould(FR, w, X0, X1, H - 0.16, PR.cornice, 0.03);
    for (const [p, q] of wins) {
      d.archWindow(w, p, q, { glass: M.stained, frame: FR, spandrel: MAH, key: 'gold', off: 0.03 });
      d.pilasters(w, [p - 0.24, q + 0.24], { h: H, w: 0.22, mat: MAH, capital: 'gold', off: 0.03 });
    }
  }
  // --- engine casing: carved overmantel with "Plymouth Harbour" over the marble fireplace (the only coal fire)
  const cf = wz(-24, 1);
  d.dress(cf, -3.02, 3.02, B(cf, { clad: MAH, skip: [[-1.45, 1.45]], cladSkip: [] }));
  wput(ctx, fireplace({ mat: 'marble', mirror: false, clock: true }), -23.79, 0, 'fwd');
  d.glow(-23.5, 0, 0.4, 0xff8a3a, 1.0);
  d.wbox(MAH, cf, -1.32, 1.32, 1.31, H - 0.14, 0.09, 0.012);
  framed(d, cf, M.plymouth, -0.9, 0.9, 1.5, 2.36, 0.102);
  for (const a of [-1.17, 1.17]) d.mount(column({ h: H - 1.31, r: 0.06, mat: MAH, capital: 'gold' }), -23.8, a, 0, 1.31);
  d.wbox(FR, cf, -1.4, 1.4, H - 0.22, H - 0.14, 0.09, 0.1);
  for (const s of [-1, 1]) {
    const cs = wx(s * 3, s);
    d.dress(cs, X0, -23.95, B(cs, { clad: MAH, cladSkip: [], skip: [[-33.0, -32.6], [-29.2, -28.8], [-25.4, -25.0], [-24.4, -23.9]] }));
    d.pilasters(cs, [-35.8, -32.8, -29.0, -25.2, -24.2], { h: H, w: 0.3, mat: MAH, off: 0.012 });
    d.sconces(cs, [-34.3, -30.9, -27.1], 1.9, 0.02);
  }
  // --- end walls (kit walls): aft wall with the doors to the Verandah Cafés, forward wall with the lobby doors and bar
  const aw = wz(X0, 1), fw = wz(X1, -1);
  for (const s of [-1, 1]) d.dress(aw, s < 0 ? -10.1 : 3.05, s < 0 ? -3.05 : 10.1, B(aw, { skip: doorSkip([[s * 6.5, s > 0 ? 2.5 : 1.2]], s > 0 ? 0.08 : 0.22) }));
  d.dress(fw, -10.1, 10.1, B(fw, { skip: doorSkip([[-3.8, 1.1], [3.8, 1.1], [-7.4, 0.9]], 0.22) }));
  d.pilasters(fw, [-9.95, -5.6, -2.0, 2.0, 5.6, 9.95], { h: H, w: 0.3, mat: MAH });
  d.sconces(fw, [-1.0, 1.0, -9.0], 1.9);
  d.sconces(aw, [-9.0, -4.0, 4.4, 9.2], 1.9);
  revolvingDoor(ctx, d, -36, 6.5);
  reserve(ctx, -36, 5.1, -34.6, 7.9);
  // bar counter with bottles in the starboard forward corner (serving the room from the bar pantry)
  wput(ctx, backBar({ w: 2.4 }), -13.76, 7.2, 'aft');
  wput(ctx, barCounter({ w: 2.4 }), -15.05, 7.2, 'aft');
  d.lamp(-14.4, 7.2, 'bowl');
  // --- seating: Chesterfields under the windows with tables and club chairs, groups round the casing, card tables
  const chair = () => clubChair({ mat: 'leatherGreen' });
  for (const s of [-1, 1]) {
    for (const [p, q] of winsIn(s, X0, X1)) {
      const xm = (p + q) / 2;
      if (!iput(ctx, chesterfield({ w: 1.55 }), xm, s * (HW - 0.47), s > 0 ? 'port' : 'stbd')) continue;
      iput(ctx, smokeTable({ v: Math.floor(rnd() * 4) }), xm + (rnd() - 0.5) * 0.15, s * (HW - 1.35), 'fwd', { turn: rnd() * 2 });
      for (const dx of [-0.46, 0.46]) fput(ctx, chair(), xm + dx, s * (HW - 2.15), faceDir(-dx * 0.4, s) + (rnd() - 0.5) * 0.3, 0.7);
    }
    for (const x of [-33.4, -30.2, -27.0]) group(ctx, x, s * 4.75, { table: smokeTable({ v: Math.floor(rnd() * 4) }), n: 3, dist: 0.92, a0: s > 0 ? Math.PI / 2 : -Math.PI / 2, chair, sq: 0.7 });
  }
  // hearth group facing the fire
  iput(ctx, smokeTable({ v: 2 }), -22.25, 0, 'fwd');
  for (const s of [-1, 1]) fput(ctx, chair(), -22.35, s * 1.0, faceDir(-0.45, -s), 0.75);
  iput(ctx, chesterfield({ w: 1.8 }), -20.75, 0, 'aft');
  for (const [x, z, card] of [[-19.3, 2.5, true], [-19.3, 5.2, false], [-16.4, 2.4, false], [-16.4, 5.1, true], [-19.3, -2.5, false], [-19.3, -5.2, true], [-16.4, -2.4, true], [-16.4, -5.1, false]]) {
    const v = Math.floor(rnd() * 4);
    if (card) group(ctx, x, z, { table: cardTable({ v }), n: 4, dist: 0.95, a0: 0, chair, sq: 0.7, jitter: 0.08 });
    else group(ctx, x, z, { table: smokeTable({ v }), n: 4, dist: 0.95, a0: Math.PI / 4, chair, sq: 0.7 });
  }
  // --- ceiling: moulded beams with gilt beads, cut-glass lights and roses
  d.ceiling(X0 + 0.05, X1 - 0.05, -10.1, 10.1, {
    bead: 'gold', pitchX: 2.6, pitchZ: 2.9, depth: 0.15, skip: [{ x0: -36, x1: -23.95, z0: -3.05, z1: 3.05 }],
    cell: (cx, cz, i, j) => { if ((i + j) % 2 === 0) d.lamp(cx, cz, 'bowl'); else d.mount(ceilingRose({ r: 0.3 }), cx, cz, 0, H); },
  });
  d.world.addInfo({
    title: 'Gemälde „Plymouth Harbour“', x: -22.5, y: d.Y + 1.5, z: 0, radius: 2.5,
    text: 'Über dem Kamin des Rauchsalons hing das Ölgemälde „Plymouth Harbour“ (auch „The Approach to the New World“) des Marinemalers Norman Wilkinson. Auf der Olympic hing an gleicher Stelle sein Bild „Der Hafen von Plymouth“; das Original der Titanic ging mit dem Schiff unter. Der Kamin war der einzige echte, mit Kohle beheizte Kamin an Bord.',
  });
  I.flush();
}

// ============================================================================================== Verandah Cafés / Palm Courts

function trellisRun(d, ctx, w, a, e, rot, rnd) {
  const n = Math.max(1, Math.ceil((e - a) / 2.0)), p = (e - a) / n;
  for (let i = 0; i < n; i++) {
    const m = a + (i + 0.5) * p, c = w.c + w.n * 0.04, x = w.axis === 'x' ? m : c, z = w.axis === 'x' ? c : m;
    d.plan.prop(trellis({ w: Math.round((p - 0.08) * 100) / 100, h: 2.45 }), x, z, rot, { collide: false });
    for (let k = 0; k < 2; k++) { // climbing ivy clusters hanging from the trellis head
      const am = m + (k - 0.5) * p * 0.5 + (rnd() - 0.5) * 0.3, cc = w.c + w.n * 0.075;
      const iv = ivy({ v: (k + i) % 4, h: 0.6 + ((i + k) % 3) * 0.3 });
      d.plan.prop(iv, w.axis === 'x' ? am : cc, w.axis === 'x' ? cc : am, rot, { y: d.Y + 2.45, collide: false });
      ctx.inst.take(iv);
    }
  }
}

export function furnishVerandah(ctx) {
  const d = detailer(ctx), s = ctx.room.z0 < 0 ? -1 : 1, H = d.H, I = beginInst(ctx), rnd = ctx.drng;
  reserveExtDoors(ctx);
  const out = wx(s * HW, -s), inn = wx(s * 3.05, s), aw = wz(-47.45, 1), fw = wz(-36.05, -1);
  const wins = winsIn(s, -47.45, -36.05), dsp = extDoorSpans('A', s, 10.3);
  const open = [...wins, ...dsp].filter(([p, q]) => q > -47.45 && p < -36.05).sort((p, q) => p[0] - q[0]);
  d.lineExterior(out, -47.45, -36.05, { wall: 'paintWhite', wainscot: 'whitePanel', cornice: 'paintWhite', dado: 'paintWhite', wins, doors: dsp });
  for (const [p, q] of wins) if (q < -36.1) d.archWindow(out, p, q, { frame: 'paintWhite', spandrel: 'paintGreen', key: 'paintWhite', off: 0.03 });
  const gaps = []; let cur = -47.4;
  for (const [p, q] of open) { if (p - 0.32 - cur > 0.5) gaps.push([cur, p - 0.32]); cur = Math.max(cur, q + 0.32); }
  if (-36.1 - cur > 0.5) gaps.push([cur, -36.1]);
  for (const [p, q] of gaps) trellisRun(d, ctx, out, p, q, d.wrot(out), rnd);
  trellisRun(d, ctx, inn, -47.4, -36.1, d.wrot(inn), rnd);
  const zr = (a, b) => (s > 0 ? [a, b] : [-b, -a]);
  for (const [a, b] of [zr(3.1, 5.35), zr(6.65, 10.1)]) trellisRun(d, ctx, aw, a, b, d.wrot(aw), rnd);
  for (const [a, b] of s > 0 ? [zr(3.1, 5.1), zr(7.9, 10.1)] : [zr(3.1, 5.85), zr(7.15, 10.1)]) trellisRun(d, ctx, fw, a, b, d.wrot(fw), rnd);
  if (s > 0) reserve(ctx, -37.4, 5.1, -36, 7.9);
  // cane chairs round café tables with little lace cloths; palms in brass tubs, flower boxes
  let i = 0;
  for (const x of [-45.6, -42.8, -39.9, -37.7]) for (const z of [4.7, 7.6]) {
    group(ctx, x, s * z, { table: cafeTable({ v: i % 3 }), n: i % 2 ? 3 : 4, dist: 0.85, a0: 0.4 + rnd(), chair: () => armchair({ kind: 'wicker', mat: 'fabricGreen' }), sq: 0.55, jitter: 0.25 });
    i++;
  }
  for (const [x, z] of [[-47.0, 9.6], [-36.6, 9.6], [-47.0, 3.55], [-41.3, 9.6]]) wput(ctx, pottedPalm(), x, s * z, 'fwd', { collide: false });
  // trellis canopy ribs under the ceiling and hanging lanterns
  for (const x of [-45.0, -41.7, -38.4]) { d.box('trellis', x - 0.03, s * 3.1, x + 0.03, s * 10.1, H - 0.2, H - 0.02); d.box('paintWhite', x - 0.04, s * 3.1, x + 0.04, s * 10.1, H - 0.24, H - 0.2); }
  for (const x of [-46.2, -43.3, -40.3, -37.6]) for (const z of [4.9, 8.0]) { d.mount(hangLamp(), x, s * z, 0, H); if (z < 6) d.world.addLamp({ x, y: d.Y + H - 0.55, z: s * z, intensity: 0.6 }); }
  I.flush();
}

// ============================================================================================== aft Grand Staircase, second class

export function furnishHallAft(ctx) {
  const d = detailer(ctx), H = d.H;
  reserveExtDoors(ctx);
  const P = { mat: 'oakPanel', orn: 'gold', pitch: 1.1, y0: 0.95, y1: H - 0.3 };
  lineSides(d, -6.45, 1.95, { wall: 'oakPanel', wainscot: 'oak', cornice: 'gold', dado: 'oak', reveal: 'oak' });
  const aw = wz(-6.45, 1), fw = wz(1.95, -1);
  panelRuns(d, aw, [[-10.1, -4.45], [-2.95, -2.35], [2.35, 2.95], [4.45, 5.3], [6.7, 10.1]], P);
  d.pilasters(aw, [-9.95, -4.5, -3.1, 3.1, 4.5, 9.95], { h: H, w: 0.3 });
  panelRuns(d, fw, [[-10.1, -5.4], [-3.6, 3.6], [5.4, 10.1]], P);
  d.pilasters(fw, [-9.95, -5.4, -3.6, 3.6, 5.4, 9.95], { h: H, w: 0.3 });
  d.sconces(aw, [-7.3, 8.4], 1.9);
  d.sconces(fw, [-1.5, 1.5], 1.9);
  d.wmount(clockWall(), fw, 0, 2.2, 0.06);
  const sp = imperialPlan(STAIRS.find((q) => q.id === 'grandAft'));
  for (const s of [-1, 1]) d.put(column({ h: H, r: 0.15, mat: 'oak', capital: 'gold' }), sp.xf + 0.45, s * (sp.hw + 0.55), 0, true);
  for (const s of [-1, 1]) {
    group(ctx, -4.6, s * 7.2, { r: 0.4, n: 3, kind: 'uph', mat: 'fabricGreen', tmat: 'oak', a0: s > 0 ? Math.PI : 0 });
    group(ctx, 0.3, s * 7.2, { r: 0.4, n: 3, kind: 'wicker', tmat: 'oak', a0: s > 0 ? Math.PI : 0 });
    wput(ctx, pottedPalm(), 1.4, s * 9.6, 'aft', { collide: false });
    wput(ctx, pottedPalm(), -5.9, s * 9.6, 'fwd', { collide: false });
  }
}

export function furnishSecondStair(ctx) {
  const d = detailer(ctx);
  for (const s of [-1, 1]) wput(ctx, bench({ w: 1.2, mat: 'oak', iron: false }), -36.35, s * 2.1, 'aft');
  d.lamp(-37.2, 0, 'dome');
  d.panels(wz(-36.05, -1), -2.9, 2.9, { mat: 'oakPanel', pitch: 1.0, y0: 0.95, y1: d.H - 0.3 });
}

export function furnishSecondHall(ctx) {
  const d = detailer(ctx);
  reserveExtDoors(ctx);
  for (const s of [-1, 1]) wput(ctx, bench({ w: 1.6, mat: 'oak', iron: false }), -60.35, s * 3.3, 'aft');
  d.wmount(clockWall(), wz(-60.05, -1), 0, 2.3);
}

export function furnishBarPantry(ctx) {
  wput(ctx, backBar({ w: 3 }), -10.0, -9.88, 'stbd');
  wput(ctx, barCounter({ w: 3 }), -10.0, -8.3, 'stbd');
  wput(ctx, shelves({ kind: 'bottles', w: 1.5 }), -6.8, -6.6, 'aft');
  ctx.fit(sink({ w: 1.0 }), ['left:hi', 'right:hi', 'far:hi']);
}

export function furnishVerandahPantry(ctx) {
  PRESETS.pantry(ctx);
  ctx.fit(shelves({ kind: 'bottles', w: 1.2 }), ['left:mid', 'right:mid', 'near:hi']);
}

export function ceilingDetailsA() { /* all ceiling details are part of the hero rooms */ }
void bookPile; void newspaper; void coatHooks; void pilaster; void chandelier; void sofa;
