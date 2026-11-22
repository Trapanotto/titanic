// Decks B and C – custom props of the hero rooms (built with the kit's prop builder; front faces +x, origin on the floor
// in the centre of the footprint unless noted). Names are prefixed "bc".
import * as THREE from 'three';
import { mats as M } from '../core/materials.js';
import { def, kitMats as K, matOf } from '../interior/kit.js';
import { AT } from '../interior/batch.js';
import * as G from '../interior/geom.js';
import { turnedLeg, cabriole, cushion, drawer, cabDoor, knob, mattress, pillowAt, blanket, rngOf, papers, bookRow } from '../interior/props-core.js';
import { BM } from './bc-util.js';

const sphere = (r, a = 8, b = 6) => new THREE.SphereGeometry(r, a, b);
/** build into a sub-group (for tilted assemblies) */
function sub(p, fn, pos = [0, 0, 0], rot = [0, 0, 0]) {
  const g = new THREE.Group(), old = p.g; g.position.set(...pos); g.rotation.set(...rot); old.add(g); p.g = g; fn(); p.g = old;
}

// ============================================================ à la carte restaurant

/** Louis XVI dining chair: fluted tapering legs, gilt frame, oval medallion back, pink silk (≈ 550 triangles) */
export const bcChairLXVI = def('bcChairLXVI', [0.48, 0.5, 0.98], (p, o) => {
  const g = M.gold, f = o.seat ? matOf(o.seat) : BM().pinkSilk;
  const leg = [[0, 0], [0.014, 0], [0.019, 0.03], [0.014, 0.05], [0.021, 0.36], [0.028, 0.385], [0, 0.4]];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.lathe(g, leg, sx * 0.19, 0, sz * 0.19, 6);
  p.bb(g, 0.45, 0.055, 0.45, 0, 0.38, 0, 0.01);
  p.pil(f, 0.42, 0.06, 0.41, 0.01, 0.415, 0, 0.35, 0.2, 2, 8, 0.004);
  for (const sz of [-1, 1]) p.bb(g, 0.034, 0.52, 0.034, -0.205, 0.43, sz * 0.165, 0.006);
  const sh = new THREE.Shape(); sh.absellipse(0, 0.72, 0.175, 0.205, 0, Math.PI * 2, false, 0);
  const ho = new THREE.Path(); ho.absellipse(0, 0.72, 0.145, 0.172, 0, Math.PI * 2, true, 0); sh.holes.push(ho);
  p.extX(g, sh, 0.028, -0.21, 0, 0);
  p.pil(f, 0.03, 0.34, 0.29, -0.212, 0.55, 0, 0.85, 0.85, 2, 10);
  p.lathe(g, [[0, 0], [0.018, 0], [0.024, 0.02], [0, 0.045]], -0.21, 0.92, 0, 5);
});

/** crystal table lamp with a pleated pink silk shade */
export const bcPinkLamp = def('bcPinkLamp', [0.24, 0.24, 0.36], (p) => {
  p.lathe(M.gold, [[0, 0], [0.06, 0], [0.06, 0.012], [0.03, 0.026], [0, 0.03]], 0, 0, 0, 10);
  p.lathe(K.crystal, [[0, 0.026], [0.03, 0.03], [0.036, 0.06], [0.02, 0.1], [0.034, 0.14], [0.016, 0.19], [0.011, 0.25], [0, 0.26]], 0, 0, 0, 8);
  p.rev(BM().pinkShade, [{ o: 0.115, y: 0.19, m: 0.006 }, { o: 0.1, y: 0.21, m: 0.006 }, { o: 0.062, y: 0.32, m: 0.004 }, { o: 0.056, y: 0.325 }], { seg: 24, k: 12, capTop: true }, 0, 0, 0);
  p.t(M.gold, 0.112, 0.004, 0, 0.19, 0, 'y', 16, 3);
});

/** Louis XVI buffet with marble top, fruit stands, silver cloches, candelabrum and a champagne cooler; fp w × 0.6 */
export const bcBuffet = def('bcBuffet', (o) => [o.w ?? 2.4, 0.6, 1.25], (p, o) => {
  const w = o.w ?? 2.4, m = matOf(o.mat ?? 'oak'), g = M.gold, ch = M.chrome, r = rngOf(17);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.lathe(g, [[0, 0], [0.03, 0], [0.04, 0.04], [0.025, 0.08], [0.035, 0.12], [0, 0.13]], sx * 0.22, 0, sz * (w / 2 - 0.08), 8);
  p.bb(m, 0.52, 0.7, w - 0.04, -0.02, 0.12, 0, 0.01);
  const n = Math.max(2, Math.round(w / 0.8)), dw = (w - 0.2) / n;
  for (let i = 0; i < n; i++) {
    const z = -w / 2 + 0.1 + dw * (i + 0.5);
    cabDoor(p, m, dw - 0.04, 0.46, 0.25, 0.16, z, { knobAt: (i % 2 ? -1 : 1) * (dw / 2 - 0.08) });
    drawer(p, m, dw - 0.04, 0.13, 0.262, 0.72, z, 2, true);
  }
  for (let i = 0; i <= n; i++) { const z = -w / 2 + 0.1 + dw * i; p.b(g, 0.012, 0.6, 0.03, 0.245, 0.17, z); p.lathe(g, [[0, 0], [0.02, 0], [0, 0.02]], 0.25, 0.79, z, 6); }
  p.b(g, 0.01, 0.025, w - 0.06, 0.25, 0.8, 0);
  p.bb(M.marble, 0.6, 0.035, w + 0.04, 0, 0.82, 0, 0.01);
  const y = 0.855;
  // fruit stands
  for (const s of [-1, 1]) {
    const z = s * w * 0.32;
    p.lathe(ch, [[0, 0], [0.08, 0], [0.06, 0.02], [0.015, 0.04], [0.012, 0.2], [0.03, 0.22], [0.17, 0.25], [0.18, 0.265], [0, 0.24]], 0, y, z, 16);
    const cells = [AT.flowerRed, AT.flowerYellow, AT.leafLight, AT.ochre, AT.rose];
    for (let i = 0; i < 9; i++) { const a = i * 0.7, rr = i < 6 ? 0.1 : 0.04; p.ag(cells[i % 5], sphere(0.042, 7, 5), Math.cos(a) * rr * 0.8, y + 0.29 + (i < 6 ? 0 : 0.06), z + Math.sin(a) * rr); }
    for (let i = 0; i < 12; i++) p.ag(AT.claret, sphere(0.016, 5, 4), 0.13 + (r() - 0.5) * 0.03, y + 0.26 - i * 0.012, z + s * 0.1 + (r() - 0.5) * 0.05);
  }
  // cloches, plates, candelabrum, champagne cooler
  for (const s of [-1, 1]) {
    p.lathe(ch, [[0, 0], [0.16, 0], [0.16, 0.006], [0.14, 0.04], [0.1, 0.1], [0.04, 0.13], [0, 0.135]], 0.05, y, s * w * 0.13, 14);
    p.lathe(ch, [[0, 0], [0.012, 0], [0.02, 0.02], [0, 0.035]], 0.05, y + 0.135, s * w * 0.13, 6);
  }
  for (let i = 0; i < 6; i++) p.lathe(M.porcelain, [[0, 0], [0.11, 0], [0.12, 0.012], [0, 0.01]], -0.14, y + i * 0.013, w * 0.45 - 0.08, 12);
  p.lathe(ch, [[0, 0], [0.07, 0], [0.05, 0.02], [0.014, 0.05], [0.012, 0.36], [0, 0.37]], -0.16, y, 0, 10);
  for (const s of [-1, 1]) {
    p.loft(ch, [[-0.16, y + 0.3, 0], [-0.16, y + 0.28, s * 0.08], [-0.16, y + 0.33, s * 0.15]], 0.008, 4, false);
    p.lathe(ch, [[0, 0], [0.025, 0], [0.012, 0.02], [0, 0.02]], -0.16, y + 0.33, s * 0.15, 6); p.ab(AT.ivory, 0.02, 0.12, 0.02, -0.16, y + 0.35, s * 0.15);
  }
  p.ab(AT.ivory, 0.02, 0.12, 0.02, -0.16, y + 0.37, 0);
  p.lathe(ch, [[0, 0], [0.08, 0], [0.09, 0.2], [0.095, 0.21], [0, 0.2]], -0.08, y, -w * 0.45 + 0.12, 12);
  p.alathe(AT.bottleGreen, [[0, 0], [0.04, 0], [0.04, 0.18], [0.015, 0.24], [0.012, 0.3], [0, 0.3]], -0.08, y + 0.04, -w * 0.45 + 0.12, 8);
});

/** pair of tied-back silk curtains with swagged valance and gilt pelmet; origin on the wall below the window centre */
export const bcCurtains = def('bcCurtains', (o) => [(o.w ?? 1.15) + 1.3, 0.16, o.h ?? 2.45], (p, o) => {
  const w = o.w ?? 1.15, h = o.h ?? 2.45, f = o.mat ? matOf(o.mat) : BM().pinkSilk, cw = 0.62, frame = o.frame ? matOf(o.frame) : M.gold;
  for (const s of [-1, 1]) {
    p.add(G.curtain(cw, h - 0.04, 4, 0.03, 0.45, s * 0.18), f, 0.07, h - 0.02, s * (w / 2 + 0.12));
    p.t(frame, 0.05, 0.008, 0.1, 1.05, s * (w / 2 + 0.3), 'x', 10, 3);
    p.lathe(frame, [[0, 0], [0.025, 0.02], [0.02, 0.08], [0, 0.1]], 0.1, 0.92, s * (w / 2 + 0.36), 6);
  }
  const W = w + 1.2, sw = [];
  for (let i = 0; i <= 10; i++) { const t = i / 10; sw.push([0.12, h - 0.1 - 0.2 * Math.sin(Math.PI * t), -W / 2 + W * t]); }
  p.loft(f, sw, sw.map((_, i) => 0.03 + 0.05 * Math.sin((Math.PI * i) / 10)), 6);
  for (const s of [-1, 1]) p.pil(f, 0.06, 0.55, 0.2, 0.1, h - 0.62, s * (W / 2 - 0.08), 0.5, 0.6, 2, 8);
  p.bb(frame, 0.07, 0.12, W + 0.06, 0.05, h - 0.02, 0, 0.01);
  p.cz(M.brass, 0.012, W, 0.08, h - 0.06, 0, 6);
});

/** gilt garland swags round a column shaft (origin on the column axis; place at the swag height) */
export const bcGarland = def('bcGarland', (o) => { const d = 2 * (o.r ?? 0.17) + 0.1; return [d, d, 0.3]; }, (p, o) => {
  const R = (o.r ?? 0.17) + 0.02, n = 4;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2 + Math.PI / 4, pts = [];
    for (let k = 0; k <= 6; k++) { const a = a0 + ((Math.PI * 2) / n) * (k / 6), sag = 0.12 * Math.sin((Math.PI * k) / 6); pts.push([Math.cos(a) * (R + sag * 0.3), -sag, Math.sin(a) * (R + sag * 0.3)]); }
    p.loft(M.gold, pts, pts.map((_, k) => 0.012 + 0.012 * Math.sin((Math.PI * k) / 6)), 5);
    p.lathe(M.gold, [[0, 0], [0.025, 0.01], [0.012, 0.03], [0, 0.035]], Math.cos(a0) * R, -0.02, Math.sin(a0) * R, 6);
    p.loft(M.gold, [[Math.cos(a0) * R, -0.02, Math.sin(a0) * R], [Math.cos(a0) * (R + 0.01), -0.16, Math.sin(a0) * (R + 0.01)]], [0.014, 0.008], 4);
  }
});

/** ceiling medallion: plaster oval, gilt bead, flower basket in relief (origin at the ceiling) */
export const bcBasket = def('bcBasket', [0.9, 0.6, 0.12], (p) => {
  const pl = p.lathe(M.plaster, [[0, -0.03], [0.3, -0.025], [0.42, -0.012], [0.45, 0]], 0, 0, 0, 20); pl.scale.set(1, 1, 0.66);
  const t = p.t(M.gold, 0.4, 0.008, 0, -0.016, 0, 'y', 24, 3); t.scale.set(1, 0.66, 1);
  const bk = p.lathe(M.gold, [[0, -0.03], [0.1, -0.035], [0.13, -0.06], [0.12, -0.08], [0, -0.075]], 0.06, 0, 0, 12); bk.scale.set(1, 1, 0.75);
  p.loft(M.gold, [[0.06, -0.08, -0.12], [-0.06, -0.08, 0], [0.06, -0.08, 0.12]], 0.008, 4, false);
  const cells = [AT.pink, AT.flowerWhite, AT.rose, AT.flowerYellow, AT.pink, AT.flowerRed];
  for (let i = 0; i < 11; i++) { const a = (i / 11) * Math.PI - Math.PI / 2; p.ag(cells[i % 6], sphere(0.032, 7, 5), -0.06 + Math.cos(a) * 0.05, -0.07, Math.sin(a) * 0.13); }
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const l = p.extY(M.gold, [[0, 0], [0.025, 0.03], [0, 0.09], [-0.025, 0.03]], 0.006, Math.cos(a) * 0.3, -0.03, Math.sin(a) * 0.2); l.rotation.set(-Math.PI / 2, a + Math.PI / 2, 0); }
});

/** gilt bronze laurel wreath with ribbon tails – wall mounted, origin = centre, faces +x */
export const bcWreath = def('bcWreath', [0.34, 0.04, 0.4], (p) => {
  p.t(M.gold, 0.085, 0.012, 0.015, 0, 0, 'x', 16, 4);
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; p.s(M.gold, 0.022, 0.02, Math.sin(a) * 0.085, Math.cos(a) * 0.085, 0.5, 1.4, 0.7); }
  for (const s of [-1, 1]) {
    p.loft(M.gold, [[0.012, 0.1, 0], [0.014, 0.13, s * 0.05], [0.012, 0.12, s * 0.09]], 0.012, 4);
    p.loft(M.gold, [[0.012, -0.08, s * 0.02], [0.014, -0.16, s * 0.07], [0.012, -0.24, s * 0.06], [0.012, -0.3, s * 0.1]], [0.012, 0.01, 0.009, 0.006], 4);
  }
});
/** climbing ivy along a beam: vine with leaves, length len along local z (origin under the beam, hangs down) */
export const bcIvy = def('bcIvy', (o) => [o.len ?? 2.4, 0.3, 0.35], (p, o) => {
  const L = o.len ?? 2.4, r = rngOf(Math.round(L * 37) + (o.v ?? 0)), pts = [], leaves = [];
  for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push([(r() - 0.5) * 0.04, -0.03 - 0.1 * Math.sin(Math.PI * t * 2) ** 2, -L / 2 + L * t]); }
  p.loft(M.woodDark, pts, 0.008, 4, false);
  for (let i = 0; i < Math.round(L * 22); i++) {
    const t = r(), z = -L / 2 + L * t, y = -0.03 - 0.1 * Math.sin(Math.PI * t * 2) ** 2 - r() * 0.22 * (r() < 0.3 ? 1 : 0.3), x = (r() - 0.5) * 0.22, s = 0.03 + r() * 0.025, a = r() * 6.28;
    const c = Math.cos(a) * s, d = Math.sin(a) * s;
    leaves.push([[x, y + s, z], [x + c, y - s * 0.4, z + d], [x - c, y - s * 0.4, z - d]]);
  }
  p.add(G.polysGeo(leaves), K.ivy);
});

/** music stand */
export const bcMusicStand = def('bcMusicStand', [0.45, 0.45, 1.2], (p) => {
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; p.loft(M.iron, [[0, 0.3, 0], [Math.cos(a) * 0.22, 0.0, Math.sin(a) * 0.22]], 0.008, 4); }
  p.c(M.iron, 0.01, 0.85, 0, 0.3, 0, 6);
  const d = p.bb(M.iron, 0.012, 0.32, 0.45, 0, 0.95, 0, 0.003); d.rotation.z = 0.35;
  p.bb(M.iron, 0.05, 0.012, 0.45, 0.06, 0.93, 0, 0.003);
  const s = p.ab(AT.paper, 0.004, 0.28, 0.36, 0.02, 0.97, 0); s.rotation.z = 0.35;
});
/** cello leaning slightly on its end pin */
export const bcCello = def('bcCello', [0.45, 0.4, 1.25], (p) => {
  sub(p, () => {
    const body = []; for (let i = 0; i <= 24; i++) { const t = i / 24, y = 0.08 + 0.72 * t, wv = 0.21 - 0.05 * Math.sin(Math.PI * 2 * t) * (t > 0.3 && t < 0.7 ? 1 : 0.4) - 0.04 * t; body.push([wv, y]); }
    const out = [...body, ...body.slice().reverse().map(([a, b]) => [-a, b])];
    p.extZ(M.mahogany, out, 0.2, 0, 0, 0, 0.02);
    p.b(K.ebony, 0.04, 0.5, 0.012, 0, 0.78, 0.1);
    p.b(M.woodDark, 0.05, 0.42, 0.045, 0, 0.8, 0.0);
    p.t(M.woodDark, 0.035, 0.012, 0, 1.24, 0, 'z', 8, 4);
    p.b(K.ebony, 0.06, 0.04, 0.03, 0, 0.32, 0.105);
    p.c(M.chrome, 0.006, 0.1, 0, 0, 0, 5);
    for (const s of [-1, 1]) p.b(K.ebony, 0.02, 0.06, 0.012, s * 0.06, 0.48, 0.102);
  }, [0, 0, 0], [0, 0, -0.18]);
});

/** Versailles planter with a clipped bay tree (Café Parisien) */
export const bcBayTree = def('bcBayTree', [0.62, 0.62, 1.75], (p) => {
  p.bb(M.paintWhite, 0.5, 0.5, 0.5, 0, 0.06, 0, 0.012);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { p.bb(M.paintGreen, 0.06, 0.6, 0.06, sx * 0.25, 0, sz * 0.25, 0.008); p.lathe(M.gold, [[0, 0], [0.03, 0], [0.035, 0.03], [0, 0.07]], sx * 0.25, 0.6, sz * 0.25, 8); }
  for (const s of [-1, 1]) { p.b(M.paintGreen, 0.012, 0.36, 0.36, s * 0.252, 0.14, 0); p.b(M.paintGreen, 0.36, 0.36, 0.012, 0, 0.14, s * 0.252); }
  p.ag(AT.soil, G.lathe([[0, 0], [0.24, 0], [0, 0.02]], 10), 0, 0.56, 0);
  p.c(M.woodDark, 0.025, 0.7, 0, 0.56, 0, 6, 0.018);
  p.s(M.plant, 0.36, 0, 1.36, 0, 1, 0.95, 1, false);
  p.s(K.ivy, 0.3, 0.06, 1.42, 0.05, 1, 0.9, 1, false);
});

/** card table with green baize, cards, ashtray and glasses */
export const bcCardTable = def('bcCardTable', [0.86, 0.86, 0.8], (p, o) => {
  const m = matOf(o.mat ?? 'oak'), r = rngOf(o.v ?? 3);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) turnedLeg(p, m, 0.7, sx * 0.36, sz * 0.36, 0.028, 0, 8);
  for (const s of [-1, 1]) { p.bb(m, 0.022, 0.09, 0.72, s * 0.37, 0.61, 0, 0.004); p.bb(m, 0.72, 0.09, 0.022, 0, 0.61, s * 0.37, 0.004); }
  p.bb(m, 0.86, 0.035, 0.86, 0, 0.7, 0, 0.01);
  p.ab(AT.felt, 0.72, 0.004, 0.72, 0, 0.735, 0);
  for (let i = 0; i < 4; i++) { const c = p.ab(i % 2 ? AT.china : AT.red, 0.09, 0.006 + 0.004 * i, 0.065, (r() - 0.5) * 0.4, 0.739, (r() - 0.5) * 0.4); c.rotation.y = r() * 3; }
  p.lathe(M.glass, [[0, 0], [0.06, 0], [0.065, 0.025], [0.045, 0.02], [0, 0.012]], 0.2, 0.739, -0.22, 10);
  p.lathe(M.glass, [[0, 0], [0.032, 0], [0.036, 0.09], [0.03, 0.008], [0, 0.008]], -0.25, 0.739, 0.25, 8);
  p.ag(AT.amber, G.lathe([[0, 0], [0.03, 0], [0.03, 0.035], [0, 0.035]], 8), -0.25, 0.75, 0.25);
});

export const bcSpittoon = def('bcSpittoon', [0.3, 0.3, 0.16], (p) => {
  p.lathe(M.brass, [[0, 0], [0.1, 0], [0.13, 0.05], [0.12, 0.1], [0.07, 0.12], [0.1, 0.15], [0.09, 0.155], [0.05, 0.125], [0, 0.11]], 0, 0, 0, 14);
});

/** wicker chaise longue (feet towards +x) */
export const bcLounger = def('bcLounger', [0.66, 1.75, 0.9], (p, o) => {
  const c = K.cane, wk = M.wicker, f = matOf(o.mat ?? 'fabricGreen');
  for (const s of [-1, 1]) { p.loft(wk, [[0.82, 0.04, s * 0.3], [0.2, 0.06, s * 0.3], [-0.5, 0.08, s * 0.3], [-0.78, 0.06, s * 0.3]], 0.025, 5); p.c(wk, 0.02, 0.3, 0.75, 0, s * 0.28, 6); p.c(wk, 0.02, 0.3, -0.75, 0, s * 0.28, 6); }
  p.bb(c, 1.0, 0.1, 0.6, 0.3, 0.24, 0, 0.02);
  const bk = p.bb(c, 0.06, 0.62, 0.6, -0.42, 0.26, 0, 0.02); bk.rotation.z = 0.55; bk.position.x = -0.32;
  const cu = p.pil(f, 0.95, 0.08, 0.5, 0.3, 0.33, 0, 0.4, 0.3, 2, 8); void cu;
  const pb = p.pil(f, 0.06, 0.5, 0.5, -0.36, 0.42, 0, 0.5, 0.3, 2, 8); pb.rotation.z = 0.55;
  for (const s of [-1, 1]) { p.bb(c, 0.6, 0.06, 0.06, -0.3, 0.5, s * 0.31, 0.015); p.c(wk, 0.018, 0.22, -0.05, 0.3, s * 0.31, 6); }
  p.pil(M.linen, 0.25, 0.08, 0.3, -0.38, 0.62, 0, 0.6, 0.5, 2, 8).rotation.z = 0.55;
});

// ============================================================ suites

/** Empire "lit en bateau" in mahogany with gilt mounts – long axis along z like the kit beds (fp w = length) */
export const bcSleighBed = def('bcSleighBed', [2.15, 1.45, 1.1], (p, o) => {
  const m = M.mahogany, g = M.gold, cover = matOf(o.cover ?? 'fabricGreen');
  const scroll = (hgt) => [[-0.07, 0], [0.07, 0], [0.07, hgt - 0.18], [0.12, hgt - 0.1], [0.14, hgt - 0.03], [0.1, hgt], [0.04, hgt - 0.02], [0.0, hgt - 0.08], [-0.03, hgt - 0.18], [-0.07, hgt - 0.24]];
  p.extX(m, scroll(1.05), 1.4, 0, 0.06, -1.0, 0.012);
  p.extX(m, scroll(0.8).map(([a, b]) => [-a, b]), 1.4, 0, 0.06, 1.0, 0.012);
  for (const s of [-1, 1]) {
    p.bb(m, 0.06, 0.32, 1.95, s * 0.69, 0.12, 0, 0.012);
    p.b(g, 0.008, 0.03, 1.6, s * 0.725, 0.3, 0);
    for (const z of [-0.98, 0.98]) { p.t(g, 0.06, 0.008, s * 0.71, z > 0 ? 0.5 : 0.62, z, 'x', 12, 3); p.lathe(g, [[0, 0], [0.04, 0], [0.05, 0.03], [0, 0.06]], s * 0.62, 0, z, 8); }
    p.lathe(g, [[0, 0], [0.02, 0], [0.03, 0.02], [0, 0.04]], s * 0.72, 0.4, 0, 6);
  }
  mattress(p, 1.3, 1.95, 0.2, 0, 0.34, 0);
  for (const s of [-1, 1]) pillowAt(p, 0.55, 0.38, 0.13, s * 0.31, 0.54, -0.74);
  blanket(p, cover, 1.36, 0, 0.54, -0.42, 0.98);
});

/** marble-topped bath vanity with two basins, mirror and brass taps (fp w × 0.55) */
export const bcVanity = def('bcVanity', (o) => [o.w ?? 1.4, 0.55, 2.0], (p, o) => {
  const w = o.w ?? 1.4;
  for (const s of [-1, 1]) p.lathe(M.chrome, [[0, 0], [0.03, 0], [0.022, 0.05], [0.02, 0.75], [0.03, 0.8], [0, 0.82]], 0.18, 0, s * (w / 2 - 0.1), 8);
  p.bb(M.marble, 0.55, 0.06, w, 0, 0.8, 0, 0.012);
  p.bb(M.marble, 0.03, 0.3, w, -0.26, 0.86, 0, 0.008);
  for (const s of [-1, 1]) {
    const z = s * w * 0.25;
    p.lathe(M.porcelain, [[0, 0.62], [0.16, 0.66], [0.2, 0.8], [0.17, 0.8], [0.12, 0.7], [0, 0.69]], 0.03, 0, z, 14);
    for (const t of [-1, 1]) { p.lathe(M.chrome, [[0, 0], [0.012, 0], [0.012, 0.08], [0.03, 0.09], [0, 0.1]], -0.17, 0.86, z + t * 0.07, 6); }
    p.loft(M.chrome, [[-0.2, 0.92, z], [-0.12, 0.96, z], [-0.08, 0.92, z]], 0.01, 5);
  }
  p.bb(M.gold, 0.03, 0.9, w * 0.85, -0.26, 1.06, 0, 0.008); p.b(M.mirror, 0.006, 0.8, w * 0.85 - 0.1, -0.245, 1.11, 0);
  for (let i = 0; i < 2; i++) p.bb(M.linen, 0.04, 0.3, 0.25, 0.29, 0.5, (i ? 1 : -1) * (w / 2 - 0.15), 0.01);
  p.cz(M.chrome, 0.008, w, 0.3, 0.8, 0, 6);
});

// ============================================================ third class

/** slatted teak bench on cast-iron standards bolted to the deck */
export const bcSlatBench = def('bcSlatBench', (o) => [o.w ?? 2.0, 0.55, o.back === false ? 0.45 : 0.9], (p, o) => {
  const w = o.w ?? 2.0, t = matOf(o.mat ?? 'oak'), back = o.back !== false;
  for (let i = 0; i < 5; i++) p.b(t, 0.07, 0.03, w, 0.17 - i * 0.085, 0.41, 0);
  if (back) for (let i = 0; i < 3; i++) { const s = p.b(t, 0.022, 0.07, w, -0.2 - i * 0.015, 0.56 + i * 0.1, 0); s.rotation.z = 0.15; }
  const n = Math.max(2, Math.round(w / 1.0) + 1);
  for (let i = 0; i < n; i++) {
    const z = -w / 2 + 0.08 + (i * (w - 0.16)) / (n - 1);
    // cast-iron standard: front leg, rear leg rising into the back post, seat bracket (simple polygons, no self-intersection)
    p.extZ(M.iron, [[0.22, 0], [0.13, 0], [0.12, 0.25], [0.15, 0.39], [0.19, 0.39], [0.17, 0.25]], 0.04, 0, 0, z, 0);
    p.extZ(M.iron, back ? [[-0.23, 0], [-0.14, 0], [-0.13, 0.25], [-0.17, 0.39], [-0.22, 0.88], [-0.27, 0.88], [-0.22, 0.39], [-0.19, 0.25]]
      : [[-0.23, 0], [-0.14, 0], [-0.13, 0.25], [-0.15, 0.39], [-0.19, 0.39], [-0.19, 0.25]], 0.04, 0, 0, z, 0);
    p.b(M.iron, 0.42, 0.03, 0.04, 0, 0.37, z);
    for (const x of [-0.19, 0.19]) { p.b(M.iron, 0.09, 0.012, 0.08, x, 0, z); p.b(M.steelDark, 0.02, 0.014, 0.02, x, 0.012, z); }
  }
});
/** teak table with cast-iron standards bolted to the deck */
export const bcSlatTable = def('bcSlatTable', (o) => [o.w ?? 2.0, 0.75, 0.77], (p, o) => {
  const w = o.w ?? 2.0, t = matOf(o.mat ?? 'oak');
  for (let i = 0; i < 4; i++) p.bb(t, 0.178, 0.04, w, -0.27 + i * 0.18, 0.72, 0, 0.006);
  p.b(t, 0.6, 0.05, w - 0.5, 0, 0.67, 0);
  for (const s of [-1, 1]) {
    const z = s * (w / 2 - 0.3);
    p.extZ(M.iron, [[-0.3, 0], [0.3, 0], [0.3, 0.025], [0.07, 0.06], [0.04, 0.6], [0.3, 0.66], [0.3, 0.69], [-0.3, 0.69], [-0.3, 0.66], [-0.04, 0.6], [-0.07, 0.06], [-0.3, 0.025]], 0.05, 0, 0, z, 0.004);
    for (const x of [-0.26, 0.26]) p.c(M.steelDark, 0.014, 0.03, x, 0.02, z, 6);
  }
});

/** framed poster (v = 0..3) – origin = centre on the wall, faces +x */
export const bcPoster = def('bcPoster', (o) => [o.w ?? 0.55, 0.04, o.h ?? 0.7], (p, o) => {
  const w = o.w ?? 0.55, h = o.h ?? 0.7, v = (o.v ?? 0) % 4;
  for (const [sy, sz, y, z] of [[0.03, w, -h / 2, 0], [0.03, w, h / 2 - 0.03, 0], [h - 0.06, 0.03, -h / 2 + 0.03, -w / 2 + 0.015], [h - 0.06, 0.03, -h / 2 + 0.03, w / 2 - 0.015]]) p.b(M.woodDark, 0.025, sy, sz, 0.0125, y, z);
  const g = new THREE.PlaneGeometry(w - 0.06, h - 0.06); g.rotateY(Math.PI / 2);
  const u0 = (v % 2) * 0.5, v0 = v < 2 ? 0.5 : 0, uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * 0.5, v0 + uv.getY(i) * 0.5);
  p.add(g, BM().posters, 0.012, 0, 0);
});

// ============================================================ offices / barber

/** purser's / enquiry counter: panelled mahogany front, brass grille with two arched pass windows (fp w × 0.7) */
export const bcCounter = def('bcCounter', (o) => [o.w ?? 2.4, 0.7, 2.15], (p, o) => {
  const w = o.w ?? 2.4, m = M.mahogany, br = M.brass;
  p.bb(m, 0.55, 1.0, w, 0, 0.0, 0, 0.01);
  const n = Math.max(2, Math.round(w / 0.6)), pw = (w - 0.1) / n;
  for (let i = 0; i < n; i++) p.fp(m, pw - 0.08, 0.62, 0.278, 0.5, -w / 2 + 0.05 + pw * (i + 0.5), 0.012, 0.04);
  p.bb(m, 0.7, 0.045, w + 0.04, 0, 1.0, 0, 0.012);
  p.b(br, 0.01, 0.02, w, 0.35, 1.0, 0);
  // grille
  const gy = 1.045, gh = 1.0, win = [-w * 0.25, w * 0.25];
  p.b(br, 0.04, 0.04, w, 0, gy, 0); p.b(br, 0.04, 0.05, w, 0, gy + gh, 0); p.b(br, 0.03, 0.03, w, 0, gy + 0.62, 0);
  for (let z = -w / 2 + 0.04; z <= w / 2 - 0.03; z += 0.065) {
    const inWin = win.some((c) => Math.abs(z - c) < 0.24);
    if (inWin) { p.c(br, 0.006, gh - 0.62, 0, gy + 0.62, z, 5); continue; }
    p.c(br, 0.006, gh, 0, gy, z, 5);
  }
  for (const c of win) {
    const pts = []; for (let k = 0; k <= 8; k++) { const a = Math.PI * (k / 8); pts.push([0, gy + 0.42 + Math.sin(a) * 0.2, c - Math.cos(a) * 0.24]); }
    p.loft(br, pts, 0.012, 5);
    for (const s of [-1, 1]) p.c(br, 0.012, 0.42, 0, gy, c + s * 0.24, 6);
    p.bb(m, 0.36, 0.02, 0.44, 0.1, gy, c, 0.004);
    p.lathe(br, [[0, 0], [0.04, 0], [0.04, 0.01], [0.012, 0.03], [0.02, 0.05], [0, 0.055]], 0.25, gy, c + 0.15, 10);
  }
  p.ab(AT.gilt, 0.01, 0.07, 0.5, 0.02, gy + gh - 0.1, 0);
  // ledgers, telegram forms, inkwell, pen
  p.bb(M.leather, 0.3, 0.05, 0.4, 0.2, gy, -w * 0.25 + 0.0, 0.01); p.b(M.paper, 0.27, 0.01, 0.37, 0.2, gy + 0.05, -w * 0.25);
  papers(p, 0.2, gy, w * 0.25 - 0.05, 0.2, 3);
  p.lathe(M.glass, [[0, 0], [0.03, 0], [0.032, 0.04], [0.012, 0.05], [0, 0.05]], 0.25, gy, w * 0.25 + 0.2, 8);
  p.c(K.ebony, 0.004, 0.16, 0.24, gy + 0.01, w * 0.25 + 0.12, 5).rotation.x = 1.3;
});

/** key board: mahogany board with rows of hooks, keys and numbered tags – wall mounted, origin = centre, faces +x */
export const bcKeyBoard = def('bcKeyBoard', [1.1, 0.06, 0.8], (p) => {
  const r = rngOf(9);
  p.bb(M.mahogany, 0.025, 0.8, 1.1, 0.0125, -0.4, 0, 0.006);
  p.bb(M.mahogany, 0.04, 0.05, 1.14, 0.02, 0.37, 0, 0.008);
  for (let j = 0; j < 5; j++) for (let i = 0; i < 12; i++) {
    const z = -0.5 + i * 0.091, y = 0.28 - j * 0.15;
    p.b(M.brass, 0.03, 0.006, 0.006, 0.04, y, z);
    if (r() < 0.75) { p.b(M.brass, 0.004, 0.05, 0.012, 0.05, y - 0.055, z); p.ab(AT.label, 0.003, 0.04, 0.028, 0.055, y - 0.1, z); }
  }
});

/** tall pigeonhole rack for telegrams and letters over a cupboard (fp w × 0.4) */
export const bcPigeon = def('bcPigeon', (o) => [o.w ?? 1.2, 0.4, 2.05], (p, o) => {
  const w = o.w ?? 1.2, m = M.mahogany, r = rngOf(31);
  p.bb(m, 0.4, 0.9, w, 0, 0, 0, 0.01);
  cabDoor(p, m, w / 2 - 0.03, 0.78, 0.2, 0.06, -w / 4, { knobAt: w / 4 - 0.08 }); cabDoor(p, m, w / 2 - 0.03, 0.78, 0.2, 0.06, w / 4, { knobAt: -w / 4 + 0.08 });
  p.bb(m, 0.42, 0.03, w + 0.02, 0, 0.9, 0, 0.008);
  p.b(m, 0.3, 1.05, w, -0.05, 0.93, 0);
  const cols = Math.round(w / 0.15), rows = 6;
  for (let i = 0; i <= cols; i++) p.b(m, 0.3, 1.05, 0.012, 0.0, 0.93, -w / 2 + (w * i) / cols);
  for (let j = 0; j <= rows; j++) p.b(m, 0.3, 0.012, w, 0.0, 0.93 + (1.04 * j) / rows, 0);
  p.b(M.woodDark, 0.005, 1.04, w, -0.15, 0.93, 0);
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) if (r() < 0.6) p.ab(r() < 0.5 ? AT.paper : AT.label, 0.2, 0.04 + r() * 0.08, (w / cols) * 0.7, 0.02, 0.945 + (1.04 * j) / rows, -w / 2 + (w * (i + 0.5)) / cols);
  p.bb(m, 0.36, 0.06, w + 0.06, 0.0, 1.98, 0, 0.01);
});

/** large strong-room safe with brass handwheel */
export const bcBigSafe = def('bcBigSafe', [0.95, 0.75, 1.65], (p) => {
  p.bb(M.iron, 0.75, 0.1, 0.95, 0, 0, 0, 0.01);
  p.bb(M.paintGreen, 0.7, 1.5, 0.9, 0, 0.1, 0, 0.03);
  for (const s of [-1, 1]) { p.bb(M.paintGreen, 0.04, 1.36, 0.4, 0.36, 0.17, s * 0.215, 0.012); p.b(M.gold, 0.004, 1.3, 0.004, 0.382, 0.2, s * 0.215 + s * 0.17); }
  for (const s of [-1, 1]) for (const y of [0.35, 1.25]) p.c(M.brass, 0.02, 0.12, 0.38, y, s * 0.44, 6);
  for (const s of [-1, 1]) {
    const z = s * 0.215;
    p.t(M.brass, 0.09, 0.012, 0.42, 0.85, z, 'x', 14, 4);
    for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2; p.loft(M.brass, [[0.42, 0.85, z], [0.42, 0.85 + Math.sin(a) * 0.09, z + Math.cos(a) * 0.09]], 0.008, 4); }
    p.cx(M.brass, 0.03, 0.05, 0.41, 0.85, z, 8);
    p.b(M.brass, 0.006, 0.07, 0.04, 0.385, 0.6, z);
  }
  p.ab(AT.gilt, 0.004, 0.05, 0.6, 0.383, 1.45, 0);
});

/** glazed mahogany showcase with souvenirs (barber shop) – fp w × 0.55 */
export const bcVitrine = def('bcVitrine', (o) => [o.w ?? 1.4, 0.55, 1.0], (p, o) => {
  const w = o.w ?? 1.4, m = M.mahogany, r = rngOf(o.v ?? 5);
  p.bb(m, 0.55, 0.62, w, 0, 0, 0, 0.01);
  for (let i = 0; i < 2; i++) drawer(p, m, w / 2 - 0.06, 0.18, 0.276, 0.45, (i ? 1 : -1) * w / 4, 2, true);
  p.bb(m, 0.57, 0.03, w + 0.02, 0, 0.62, 0, 0.006);
  for (const s of [-1, 1]) for (const sx of [-1, 1]) p.b(m, 0.03, 0.34, 0.03, sx * 0.26, 0.65, s * (w / 2 - 0.015));
  p.b(m, 0.55, 0.03, w, 0, 0.99, 0);
  p.b(M.glass, 0.5, 0.005, w - 0.06, 0, 0.985, 0); p.b(M.glass, 0.005, 0.32, w - 0.06, 0.27, 0.66, 0);
  const cells = [AT.paper, AT.labelRed, AT.labelBlue, AT.yellow, AT.china, AT.navy, AT.label];
  for (let i = 0; i < 14; i++) { const b = p.ab(cells[i % cells.length], 0.08 + r() * 0.06, 0.015 + r() * 0.08, 0.06 + r() * 0.08, (r() - 0.5) * 0.36, 0.65, (r() - 0.5) * (w - 0.2)); b.rotation.y = r(); }
  for (let i = 0; i < 3; i++) { const z = -w / 3 + (i * w) / 3; p.ag(AT.skin, sphere(0.025), 0.05, 0.82, z); p.ag(i % 2 ? AT.navy : AT.red, G.lathe([[0, 0], [0.04, 0], [0.025, 0.12], [0, 0.13]], 8), 0.05, 0.65, z); }
});

// ============================================================ steering gear

/** spur gear in the yz plane (axis along x), radius r, teeth n, thickness t */
function gear(p, mat, r, n, t, x, y, z) {
  const pts = [];
  for (let i = 0; i < n; i++) for (const [f, rr] of [[0, r - 0.03], [0.25, r], [0.5, r], [0.75, r - 0.03]]) { const a = ((i + f) / n) * Math.PI * 2; pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
  p.extX(mat, pts, t, x, y, z, 0);
  p.cx(mat, r * 0.35, t + 0.06, x, y, z, 12);
}

/** steam steering engine: bedplate, two inclined cylinders, crankshaft, pinion and worm (front +x, pinion end +z) */
export const bcSteerEngine = def('bcSteerEngine', [1.9, 1.1, 1.55], (p) => {
  const I = M.iron, S = M.steelDark, Br = M.brass;
  p.bb(I, 1.0, 0.25, 1.8, 0, 0, 0, 0.02);
  for (const z of [-0.45, 0.25]) {
    p.bb(S, 0.5, 0.45, 0.4, -0.05, 0.25, z, 0.02);
    p.lathe(I, [[0, 0], [0.2, 0], [0.2, 0.05], [0.17, 0.06], [0.17, 0.5], [0.2, 0.52], [0.2, 0.56], [0.08, 0.58], [0, 0.58]], -0.05, 0.7, z, 16);
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; p.c(Br, 0.012, 0.03, -0.05 + Math.cos(a) * 0.185, 1.26, z + Math.sin(a) * 0.185, 5); }
    p.c(M.chrome, 0.03, 0.2, -0.05, 0.5, z, 8);
  }
  p.bb(S, 0.3, 0.6, 0.3, 0.3, 0.7, -0.1, 0.015);
  p.lathe(Br, [[0, 0], [0.06, 0], [0.06, 0.02], [0.02, 0.04], [0, 0.05]], 0.48, 1.0, -0.1, 10).rotation.z = -Math.PI / 2;
  p.cz(M.chrome, 0.05, 1.7, -0.05, 0.4, 0.0, 10);
  gear(p, S, 0.3, 18, 0.1, -0.05, 0.4, 0.82);
  p.t(Br, 0.2, 0.018, 0.48, 0.95, -0.1, 'x', 14, 4);
  for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2; p.loft(Br, [[0.48, 0.95, -0.1], [0.48, 0.95 + Math.sin(a) * 0.2, -0.1 + Math.cos(a) * 0.2]], 0.01, 4); }
});

/** hydraulic telemotor receiver with two cylinders, pipes and a gauge */
export const bcTelemotor = def('bcTelemotor', [1.0, 0.6, 1.3], (p) => {
  p.bb(M.iron, 0.55, 0.08, 1.0, 0, 0, 0, 0.01);
  p.bb(M.paintGrey, 0.4, 0.6, 0.5, 0, 0.08, 0, 0.02);
  for (const s of [-1, 1]) { p.cz(M.steelDark, 0.09, 0.32, 0, 0.9, s * 0.3, 12); p.cz(M.steelDark, 0.11, 0.04, 0, 0.9, s * 0.15, 12); p.cz(M.steelDark, 0.11, 0.04, 0, 0.9, s * 0.45, 12); }
  p.cz(M.chrome, 0.025, 1.0, 0, 0.9, 0, 8);
  p.bb(M.steelDark, 0.25, 0.25, 0.3, 0, 0.68, 0, 0.02);
  for (const s of [-1, 1]) p.loft(M.copper, [[0.1, 0.8, s * 0.1], [0.2, 1.0, s * 0.1], [0.2, 1.3, s * 0.1]], 0.02, 6, false);
  p.c(M.brass, 0.08, 0.04, 0.22, 1.05, 0, 12).rotation.z = Math.PI / 2;
  p.cx(K.gaugeFace, 0.065, 0.01, 0.245, 1.05, 0, 12);
});
