// G deck hero rooms and service-room furnishing: squash court, post office, cold stores (meat hanging room etc.),
// first-class baggage room. Shared with the orlop deck (baggage, produce, dairy, wine, dry stores).
import * as THREE from 'three';
import { mats } from '../core/materials.js';
import {
  kitMats, pipe, squashMarkings, bench, locker, tableRect, stool, sackPile, desk, chairDining, safe, shelves, crate, crateStack,
  barrel, trunk, luggagePile, suitcase, tankV, clockWall, mirrorWall, basinSmall, sack, def, workbench, hatBox, notice,
} from '../interior/kit.js';
import { meatMat, fatMat, iceMat, corkMat } from './f-util.js';
import { gratingMat } from './tank-lib.js';

function rng(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// ---------------------------------------------------------------- custom props (kit builder, front +x)

/** oak sorting frame with pigeon-holes above a counter, brass label strips, letters and bundles in the holes */
export const pigeonHoles = def('ghPigeon', (o) => [o.w ?? 1.5, 0.42, 1.95], (p, o) => {
  const w = o.w ?? 1.5, cols = Math.max(3, Math.round(w / 0.25)), rows = 7, y0 = 0.82, hh = 1.1, r = rng(Math.round(w * 100));
  p.bb(mats.oak, 0.42, 0.78, w, 0, 0, 0, 0.008); p.bb(mats.oak, 0.46, 0.04, w + 0.02, 0.02, 0.78, 0, 0.006);
  p.b(mats.oak, 0.02, hh, w, -0.2, y0, 0);
  for (let i = 0; i <= cols; i++) p.b(mats.oak, 0.34, hh, 0.015, -0.03, y0, -w / 2 + (i * w) / cols);
  for (let j = 0; j <= rows; j++) p.b(mats.oak, 0.34, 0.015, w, -0.03, y0 + (j * hh) / rows, 0);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const zc = -w / 2 + ((i + 0.5) * w) / cols, yb = y0 + (j * hh) / rows + 0.016;
    p.b(mats.brass, 0.004, 0.018, w / cols - 0.06, 0.142, yb - 0.006, zc);
    if (r() < 0.75) p.b(mats.paper, 0.22, 0.04 + r() * 0.06, w / cols - 0.05 - r() * 0.04, -0.06, yb, zc);
    if (r() < 0.2) p.b(mats.fabricRed, 0.01, 0.06, w / cols - 0.06, 0.06, yb, zc);
  }
  p.bb(mats.woodDark, 0.04, 0.06, w + 0.04, 0.14, y0 + hh, 0, 0.006);
  p.b(mats.paper, 0.3, 0.004, 0.22, 0.05, 0.82, w * 0.2).rotation.y = 0.3;
});
/** side of beef: flattened lathe body with fat cover, shank with bone end, S-hook (origin = rail level, hangs down) */
const beefSide = def('ghBeef', [0.45, 0.4, 1.6], (p, o) => {
  const big = o.big !== false, k = big ? 1 : 0.72;
  const prof = [[0, -1.42 * k], [0.05, -1.4 * k], [0.12 * k, -1.25 * k], [0.2 * k, -1.0 * k], [0.24 * k, -0.7 * k], [0.22 * k, -0.45 * k], [0.12 * k, -0.33 * k], [0.06, -0.3 * k], [0, -0.28 * k]];
  p.lathe(meatMat, prof, 0, 0, 0, 12).scale.set(1, 1, 0.5);
  p.lathe(fatMat, prof.map(([r, y]) => [r * 0.96, y]), -0.03, 0, 0, 12).scale.set(1.04, 0.98, 0.55);
  p.s(mats.porcelain, 0.035, 0, -0.27 * k, 0, 1.2, 0.8, 1);
  p.t(mats.chrome, 0.04, 0.007, 0, -0.035, 0, 'z', 8, 3); p.t(mats.chrome, 0.04, 0.007, 0, -0.2, 0, 'z', 8, 3);
  p.c(mats.chrome, 0.007, 0.1, 0, -0.16, 0, 4);
});
/** overhead meat rail (along local z, width w) with hanging sides of beef and mutton (origin floor) */
export const meatRail = def('ghMeatRail', (o) => [o.w ?? 2.4, 0.6, 2.3], (p, o) => {
  const w = o.w ?? 2.4, n = Math.max(2, Math.round(w / 0.55)), r = rng(Math.round(w * 37));
  p.b(mats.steel, 0.05, 0.08, w, 0, 2.2, 0); for (const s of [-1, 1]) { p.b(mats.steel, 0.05, 0.12, 0.05, 0, 2.28, s * (w / 2 - 0.05)); }
  for (let i = 0; i < n; i++) {
    const z = -w / 2 + ((i + 0.5) * w) / n + (r() - 0.5) * 0.08, big = i % 3 !== 1;
    p.cz(mats.steelDark, 0.03, 0.04, 0.0, 2.22, z, 8);
    const g = beefSide({ big });
    for (const m of g.children) { const mm = p.add(m.geometry, m.material, 0, 2.2, z); mm.rotation.y = (r() - 0.5) * 0.6; }
  }
});
/** stacked blocks of ice under cork */
export const iceStack = def('ghIce', [1.2, 1.0, 1.2], (p) => {
  for (let j = 0; j < 3; j++) for (let i = 0; i < 2; i++) p.bb(iceMat, 0.48, 0.38, 0.55, (i - 0.5) * 0.5, j * 0.38, (j % 2 ? 0.1 : -0.1), 0.02);
  p.b(corkMat, 1.0, 0.02, 0.75, 0, 1.14, 0);
});
/** fish box: wooden box, bed of crushed ice, fish (origin floor) */
const fishBox = def('ghFish', [0.9, 0.6, 0.32], (p, o) => {
  const r = rng(o.v ?? 1);
  p.bb(mats.pine, 0.6, 0.04, 0.9, 0, 0, 0, 0.005);
  for (const s of [-1, 1]) { p.b(mats.pine, 0.6, 0.18, 0.02, 0, 0.04, s * 0.44); p.b(mats.pine, 0.02, 0.18, 0.9, s * 0.29, 0.04, 0); }
  p.b(iceMat, 0.56, 0.1, 0.86, 0, 0.04, 0);
  for (let i = 0; i < 7; i++) {
    const x = (r() - 0.5) * 0.3, z = (r() - 0.5) * 0.36, a = r() * 0.6 - 0.3;
    p.s(mats.chrome, 0.06, x, 0.17, z, 0.9, 0.45, 3.2, false).rotation.y = a;
    const tl = p.fr(mats.paintGrey, 0.005, 0.08, 0.005, 0.005, 0.07, x + Math.sin(a) * 0.16, 0.17, z + Math.cos(a) * 0.16, { bottom: true });
    tl.rotation.set(Math.PI / 2, a, 0, 'YXZ');
  }
});
/** milk churn */
export const churn = def('ghChurn', [0.36, 0.36, 0.72], (p) => {
  p.lathe(mats.chrome, [[0, 0], [0.16, 0], [0.17, 0.02], [0.17, 0.44], [0.12, 0.54], [0.085, 0.58], [0.085, 0.64], [0.1, 0.66], [0.1, 0.7], [0, 0.71]], 0, 0, 0, 14);
  for (const y of [0.05, 0.42]) p.t(mats.chrome, 0.172, 0.01, 0, y, 0, 'y', 14, 3);
  for (const s of [-1, 1]) p.t(mats.chrome, 0.05, 0.008, 0, 0.5, s * 0.15, 'z', 10, 3);
  p.b(mats.brass, 0.04, 0.05, 0.08, 0.16, 0.25, 0);
});
/** wine rack with bottles lying in a diamond lattice */
export const wineRack = def('ghWineRack', (o) => [o.w ?? 1.5, 0.45, 1.9], (p, o) => {
  const w = o.w ?? 1.5;
  p.b(mats.woodDark, 0.45, 1.9, 0.05, 0, 0, -w / 2 + 0.025); p.b(mats.woodDark, 0.45, 1.9, 0.05, 0, 0, w / 2 - 0.025);
  for (let j = 0; j < 5; j++) { p.b(mats.woodDark, 0.45, 0.03, w, 0, 0.05 + j * 0.45, 0); p.b(kitMats.bottles, 0.4, 0.34, w - 0.1, 0, 0.08 + j * 0.45, 0); }
});
/** fruit crate with apples / oranges showing (atlas colours) */
const fruitCrate = def('ghFruit', [0.6, 0.45, 0.36], (p, o) => {
  const r = rng(o.v ?? 1), cell = [50, 55, 52][(o.v ?? 1) % 3];
  for (let k = 0; k < 4; k++) p.bb(kitMats.stencil, 0.45, 0.07, 0.02, 0, 0.02 + k * 0.08, -0.29, 0.003);
  for (let k = 0; k < 4; k++) p.bb(kitMats.stencil, 0.45, 0.07, 0.02, 0, 0.02 + k * 0.08, 0.29, 0.003);
  for (const s of [-1, 1]) p.bb(mats.pine, 0.02, 0.32, 0.6, s * 0.215, 0.02, 0, 0.003);
  p.b(mats.pine, 0.45, 0.02, 0.6, 0, 0, 0);
  p.b(mats.pine, 0.41, 0.01, 0.56, 0, 0.29, 0);
  const sph = new THREE.SphereGeometry(0.04, 6, 4);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 6; j++) p.ag(cell, sph, -0.15 + i * 0.1 + (r() - 0.5) * 0.02, 0.33 + r() * 0.02, -0.25 + j * 0.1);
  p.b(mats.paper, 0.003, 0.06, 0.12, 0.226, 0.15, 0);
});
/** canvas mail bag with stencilled marks and tied neck */
const mailBag = def('ghMailBag', [0.55, 0.45, 0.8], (p, o) => {
  const bag = p.pil(mats.canvas, 0.42, 0.62, 0.5, 0, 0, 0, 0.55, 0.35, 4, 12, 0.02);
  if (o.lie) { bag.rotation.z = Math.PI / 2; bag.position.set(0.31, 0.21, 0); }
  if (!o.lie) {
    p.lathe(mats.canvas, [[0.12, 0], [0.06, 0.05], [0.04, 0.12], [0.09, 0.18], [0, 0.2]], 0, 0.56, 0, 8);
    p.t(mats.rope, 0.05, 0.012, 0, 0.62, 0, 'y', 8, 3);
    p.b(kitMats.stencil, 0.005, 0.22, 0.3, 0.205, 0.22, 0);
    p.b(mats.brass, 0.02, 0.05, 0.03, 0.05, 0.58, 0.06);
  }
});
/** pile of mail bags */
const bagPile = def('ghBagPile', [1.4, 1.1, 0.95], (p, o) => {
  const r = rng(o.v ?? 2);
  // bottom layer lying (0.42 high), two more lying on top of them, a standing one at the side
  for (const [x, y, z, lie] of [[-0.25, 0, -0.35, true], [-0.25, 0, 0.3, true], [0.25, 0, -0.05, true], [0.3, 0, -0.6, false], [-0.15, 0.4, -0.05, true], [0.1, 0.4, 0.3, true]]) {
    const g = mailBag({ lie }), a = (r() - 0.5) * 1.2 + (y > 0 ? 1.4 : 0);
    for (const m of g.children) p.add(m.geometry, m.material, x, y, z, 0, a, 0);
  }
});
/** sealing-wax bench: spirit lamp, sticks of red wax, brass seals, string, registered envelopes, letter scale */
const waxBench = def('ghWaxBench', [1.6, 0.7, 1.05], (p) => {
  p.bb(mats.oak, 0.7, 0.05, 1.6, 0, 0.84, 0, 0.008);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.bb(mats.oak, 0.06, 0.84, 0.06, sx * 0.3, 0, sz * 0.74, 0.006);
  p.bb(mats.oak, 0.56, 0.03, 1.44, 0, 0.25, 0, 0.005);
  const ty = 0.89;
  p.lathe(mats.brass, [[0, 0], [0.05, 0], [0.04, 0.02], [0.03, 0.06], [0.01, 0.08], [0, 0.085]], 0.15, ty, -0.6, 10); p.s(mats.lampGlow, 0.012, 0.15, ty + 0.1, -0.6, 1, 2.2, 1);
  for (let i = 0; i < 4; i++) p.cz(kitMats.fireRed, 0.008, 0.14, 0.18 + i * 0.02, ty + 0.008, -0.4, 6);
  for (let i = 0; i < 3; i++) { p.lathe(mats.brass, [[0, 0], [0.018, 0], [0.012, 0.03], [0.008, 0.07], [0.016, 0.09], [0, 0.1]], -0.1 + i * 0.06, ty, -0.45, 8); }
  p.s(mats.rope, 0.05, -0.2, ty + 0.04, -0.2, 1, 0.8, 1);
  for (let i = 0; i < 5; i++) { const m = p.b(mats.paper, 0.16, 0.004, 0.24, 0.05 + (i % 2) * 0.03, ty + i * 0.004, 0.0 + i * 0.03); m.rotation.y = i * 0.2; }
  for (let i = 0; i < 3; i++) p.c(kitMats.fireRed, 0.012, 0.004, 0.08 + i * 0.03, ty + 0.022, 0.05 + i * 0.05, 8);
  // letter scale: brass pan on a column with sliding weight beam
  p.bb(mats.brass, 0.18, 0.02, 0.28, 0, ty, 0.5, 0.004); p.c(mats.brass, 0.012, 0.18, 0, ty + 0.02, 0.5, 6);
  p.lathe(mats.brass, [[0, 0], [0.09, 0], [0.1, 0.02], [0, 0.015]], 0, ty + 0.2, 0.5, 12);
  p.b(mats.brass, 0.02, 0.02, 0.3, 0, ty + 0.15, 0.52);
  for (let i = 0; i < 4; i++) p.c(mats.brass, 0.015 + i * 0.004, 0.02 + i * 0.006, -0.18, ty, 0.42 + i * 0.05, 8);
});
/** platform weighing machine (beam scale) for mail bags */
const platformScale = def('ghScale', [0.8, 0.8, 1.35], (p) => {
  p.bb(mats.iron, 0.78, 0.12, 0.78, 0, 0, 0, 0.01); p.b(mats.steelFloor, 0.7, 0.01, 0.7, 0, 0.12, 0);
  p.bb(mats.paintGreen, 0.12, 1.1, 0.12, -0.33, 0.12, 0, 0.01);
  p.b(mats.brass, 0.04, 0.03, 0.6, -0.33, 1.15, 0.2); p.b(mats.brass, 0.06, 0.08, 0.04, -0.33, 1.11, 0.32);
  p.lathe(mats.brass, [[0, 0], [0.04, 0], [0.04, 0.03], [0, 0.03]], -0.33, 1.0, 0.45, 8); p.c(mats.brass, 0.004, 0.13, -0.33, 1.03, 0.45, 4);
  for (let i = 0; i < 3; i++) p.c(mats.iron, 0.04 - i * 0.008, 0.02, -0.25, 0.13 + i * 0.02, -0.25, 8);
});

// ---------------------------------------------------------------- furnish functions

/** Squash Racquet Court: maple floor, white walls with red lines (front wall = forward), tin, caged lamps, spectators' rail */
export function squashCourt(ctx) {
  const { world, deck, plan } = ctx, r = ctx.room, s = r.safe, b = plan.batch, Y = ctx.y, top = Y + ctx.h;
  squashMarkings(world, deck, s.x0, s.x1, s.z0, s.z1, { front: 'fwd', h: ctx.h });
  // service boxes, maple floor boards (thin seams), board ("tin") at the bottom of the front wall
  const xs = s.x1 - (s.x1 - s.x0) * 0.56, red = mats.fabricRed;
  for (const z of [s.z0 + 1.6, s.z1 - 1.6]) b.flat(red, xs - 1.6, xs, z - 0.025, z + 0.025, Y + 0.012);
  for (const z of [s.z0 + 0.025, s.z1 - 0.025]) b.flat(red, xs - 1.6, xs - 1.55, Math.min(z, z + Math.sign(-z) * 1.6), Math.max(z, z + Math.sign(-z) * 1.6), Y + 0.012);
  for (let z = s.z0 + 0.075; z < s.z1; z += 0.075) b.box(mats.woodDark, s.x0, Y + 0.006, z - 0.002, s.x1, Y + 0.0075, z + 0.002, 'Y');
  b.box(mats.paintWhite, s.x1 - 0.05, Y, s.z0, s.x1, Y + 0.48, s.z1, 'xY');
  b.box(mats.iron, s.x1 - 0.06, Y + 0.44, s.z0, s.x1 - 0.05, Y + 0.48, s.z1, 'xY');
  // dark scuff marks of the balls on the front and side walls
  const rr = rng(77);
  for (let i = 0; i < 40; i++) { const z = s.z0 + 0.4 + rr() * (s.z1 - s.z0 - 0.8), y = Y + 0.55 + rr() * 1.5, q = 0.03 + rr() * 0.03; b.box(mats.rubber, s.x1 - 0.002, y, z, s.x1, y + q, z + q, 'x'); }
  for (let i = 0; i < 16; i++) { const x = s.x0 + 2 + rr() * (s.x1 - s.x0 - 2.5), y = Y + 0.4 + rr() * 1.2, q = 0.03; const z = rr() < 0.5 ? s.z0 : s.z1; b.box(mats.rubber, x, y, Math.min(z, z + (z < 0 ? 0.002 : -0.002)), x + q, y + q, Math.max(z, z + (z < 0 ? 0.002 : -0.002)), z < 0 ? 'Z' : 'z'); }
  // spectators' brass rail and lamp guards high on the back wall, scoreboard, bench, racquets, ball box
  b.bar(mats.brass, [s.x0 + 0.12, top - 0.55, s.z0 + 0.3], [s.x0 + 0.12, top - 0.55, s.z1 - 0.3], 0.04, 0.04);
  for (let z = s.z0 + 0.3; z <= s.z1 - 0.29; z += (s.z1 - s.z0 - 0.6) / 4) { b.bar(mats.brass, [s.x0, top - 0.55, z], [s.x0 + 0.12, top - 0.55, z], 0.03, 0.03); }
  b.box(kitMats.slate, s.x0, Y + 1.5, s.z0 + 0.6, s.x0 + 0.03, Y + 2.0, s.z0 + 1.4, 'X');
  b.box(mats.oak, s.x0, Y + 1.48, s.z0 + 0.58, s.x0 + 0.04, Y + 2.02, s.z0 + 1.42, 'yY');
  for (let i = 0; i < 4; i++) b.box(mats.paper, s.x0 + 0.031, Y + 1.62 + (i % 2) * 0.18, s.z0 + 0.75 + Math.floor(i / 2) * 0.4, s.x0 + 0.033, Y + 1.72 + (i % 2) * 0.18, s.z0 + 0.85 + Math.floor(i / 2) * 0.4, 'X');
  ctx.fit(bench({ w: 1.6, back: false, mat: 'oak' }), ['near:hi', 'near:lo'], { collide: false });
  for (let k = 0; k < 3; k++) {
    const z = s.z1 - 0.4 - k * 0.14;
    b.box(mats.oak, s.x0 + 0.02, Y + 0.45, z, s.x0 + 0.04, Y + 1.0, z + 0.025, 'xXzZ');
    b.box(mats.oak, s.x0 + 0.015, Y + 1.0, z - 0.07, s.x0 + 0.045, Y + 1.28, z + 0.095, 'X');
    b.box(mats.linen, s.x0 + 0.046, Y + 1.03, z - 0.05, s.x0 + 0.047, Y + 1.25, z + 0.075, 'X');
  }
  b.box(mats.oak, s.x0 + 0.05, Y, s.z1 - 1.3, s.x0 + 0.35, Y + 0.25, s.z1 - 0.95);
  for (let i = 0; i < 4; i++) b.box(mats.rubber, s.x0 + 0.1 + (i % 2) * 0.1, Y + 0.25, s.z1 - 1.25 + Math.floor(i / 2) * 0.12, s.x0 + 0.14 + (i % 2) * 0.1, Y + 0.29, s.z1 - 1.21 + Math.floor(i / 2) * 0.12);
}
export function squashChanging(ctx) {
  ctx.fit(locker({ n: 3, mat: 'oak' }), ['far:mid', 'left:hi']); ctx.fit(bench({ w: 1.6, back: false, mat: 'oak' }), ['left:mid', 'right:mid'], { collide: false });
  ctx.fit(basinSmall(), ['right:lo', 'near:hi'], { collide: false }); ctx.mount(mirrorWall({ w: 0.5, h: 0.7 }), 'far', ctx.W * 0.25, 1.6);
}
/** sea post office: pigeon-hole frames, sorting tables with letters, stencilled mail bags, sealing-wax bench, scales,
 *  registered-mail cage, safe */
export function postOffice(ctx) {
  const { plan, world } = ctx, b = plan.batch, Y = ctx.y;
  for (const w of ['far', 'left']) for (let k = 0; k < 6; k++) if (!ctx.fit(pigeonHoles({ w: 1.5 }), [w + ':lo'])) break;
  // registered-mail cage in the right-hand far corner: steel frame, wire-mesh panels, door ajar, shelves with bags
  const cw = Math.min(2.4, ctx.W * 0.3), cd = Math.min(2.2, ctx.D * 0.45), u0 = ctx.W - cw, v0 = ctx.D - cd;
  if (ctx.free(u0 + cw / 2, v0 + cd / 2, cw, cd)) {
    const A = ctx.at(u0, v0), B = ctx.at(ctx.W, v0), C = ctx.at(u0, ctx.D);
    const panel = (p, q, gap) => {
      const L = Math.hypot(q.x - p.x, q.z - p.z), n = Math.max(1, Math.round(L / 0.8));
      for (let i = 0; i < n; i++) {
        const t0 = i / n, t1 = (i + 1) / n, a = [p.x + (q.x - p.x) * t0, p.z + (q.z - p.z) * t0], c = [p.x + (q.x - p.x) * t1, p.z + (q.z - p.z) * t1];
        if (gap && i === 0) continue;
        b.poly(gratingMat, [[a[0], Y + 0.1, a[1]], [c[0], Y + 0.1, c[1]], [c[0], Y + 2.1, c[1]], [a[0], Y + 2.1, a[1]]], [-(c[1] - a[1]), 0, c[0] - a[0]]);
        b.box(mats.steelDark, a[0] - 0.02, Y, a[1] - 0.02, a[0] + 0.02, Y + 2.15, a[1] + 0.02);
      }
      b.box(mats.steelDark, Math.min(p.x, q.x) - 0.02, Y + 2.1, Math.min(p.z, q.z) - 0.02, Math.max(p.x, q.x) + 0.02, Y + 2.15, Math.max(p.z, q.z) + 0.02);
      b.box(mats.steelDark, Math.min(p.x, q.x) - 0.02, Y + 0.05, Math.min(p.z, q.z) - 0.02, Math.max(p.x, q.x) + 0.02, Y + 0.1, Math.max(p.z, q.z) + 0.02);
      world.addCollider(Math.min(p.x, q.x) - 0.04, Y, Math.min(p.z, q.z) - 0.04, Math.max(p.x, q.x) + 0.04, Y + 2.15, Math.max(p.z, q.z) + 0.04);
    };
    panel(A, B, true); panel(A, C, false);
    b.box(mats.brass, A.x - 0.05, Y + 1.0, A.z - 0.05, A.x + 0.05, Y + 1.1, A.z + 0.05);
    ctx.occupied.push(ctx._rect(u0 + cw / 2, v0 + cd / 2, cw + 0.2, cd + 0.2));
    const inner = ctx.at(u0 + cw * 0.55, v0 + cd * 0.6);
    plan.prop(bagPile({ v: 5 }), inner.x, inner.z, ctx.rot('out'));
    plan.prop(safe(), ctx.at(ctx.W - 0.4, ctx.D - 0.4).x, ctx.at(ctx.W - 0.4, ctx.D - 0.4).z, ctx.rot('left'));
  }
  ctx.grid(2.6, 2.0, (u, v, i) => {
    if (!ctx.put(tableRect({ w: 1.8, d: 0.8, mat: 'oak', items: i % 2 === 0 }), u, v, 'in')) return;
    ctx.put(stool({ mat: 'oak', seat: 'oak' }), u - 0.5, v - 0.62, 'in', { collide: false }); ctx.put(stool({ mat: 'oak', seat: 'oak' }), u + 0.5, v + 0.62, 'out', { collide: false });
    if (i % 2 === 0) ctx.put(bagPile({ v: i + 1 }), u + 1.25, v, 'in');
  }, 0.9);
  ctx.fit(waxBench(), ['near:hi', 'right:lo', 'left:hi']);
  ctx.fit(platformScale(), ['near:mid', 'right:mid']);
  ctx.fit(desk({ w: 1.2, mat: 'oak' }), ['near:hi', 'right:hi']);
  for (const p of ['near:mid', 'left:mid', 'right:lo']) ctx.fit(bagPile({ v: p.length }), [p]);
  ctx.mount(clockWall(), 'near', ctx.W * 0.6, 2.0);
  ctx.mount(notice(), 'near', ctx.W * 0.45, 1.5);
}
/** first-class baggage room: racks stacked with trunks and hat boxes, luggage piles on the floor */
export function baggageRoom(ctx) {
  const r = rng(Math.round(ctx.room.x0 * 13));
  for (const w of ['far', 'left', 'right']) for (let k = 0; k < 5; k++) {
    if (!ctx.fit(shelves({ kind: 'empty', w: 1.5, mat: 'pine' }), [w + ':lo'])) break;
    // trunks and boxes on the rack shelves
    for (const [y, dz] of [[0.02, -0.38], [0.02, 0.38], [0.95, 0], [0.95, -0.45]]) {
      if (r() < 0.25) continue;
      const it = r() < 0.6 ? trunk({ big: false, mat: r() < 0.5 ? 'leather' : 'canvas' }) : r() < 0.5 ? suitcase() : hatBox({ v: Math.floor(r() * 4) });
      ctx.attach(it, -0.02, dz, { y: y + (y > 0.5 ? 0.0 : 0.0), turn: Math.PI / 2 * (r() < 0.3 ? 1 : 0) });
    }
  }
  ctx.grid(2.0, 2.0, (u, v, i, j) => { if ((i + j) % 3 === 2) ctx.put(trunk({ big: true }), u, v, 'in'); else ctx.put(luggagePile({ v: i + j * 3 }), u, v, (i + j) % 2 ? 'in' : 'right'); }, 1.0);
  for (const p of ['near:hi', 'far:lo']) ctx.fit(suitcase(), [p], { collide: false });
}

/** brine coils on the walls (serpentine of pipes with frosted U-bends) and on the ceiling of a cold room */
function coolingGrid(ctx, walls = ['far']) {
  const { plan } = ctx, b = plan.batch, top = ctx.y + ctx.h;
  const frost = mats.paintWhite;
  for (const w of walls) {
    const [ua, va, ub, vb] = w === 'far' ? [0.2, ctx.D - 0.08, ctx.W - 0.2, ctx.D - 0.08] : w === 'left' ? [0.08, 0.5, 0.08, ctx.D - 0.3] : [ctx.W - 0.08, 0.5, ctx.W - 0.08, ctx.D - 0.3];
    const a = ctx.at(ua, va), c = ctx.at(ub, vb), zone = plan.zone(a.x);
    const ys = [0.35, 0.5, 0.65, 0.8].map((h) => top - h);
    for (const y of ys) pipe(zone, frost, [[a.x, y, a.z], [c.x, y, c.z]], 0.03);
    for (let i = 0; i < ys.length - 1; i++) { const e = i % 2 ? a : c; pipe(zone, frost, [[e.x, ys[i], e.z], [e.x, ys[i + 1], e.z]], 0.03); }
    for (let t = 0.15; t < 1; t += 0.35) { const p = { x: a.x + (c.x - a.x) * t, z: a.z + (c.z - a.z) * t }; b.box(mats.iron, p.x - 0.02, ys[3] - 0.05, p.z - 0.02, p.x + 0.02, top, p.z + 0.02, 'xXzZ'); }
  }
  // ceiling grid
  const n = Math.max(2, Math.floor((ctx.W - 0.6) / 0.6));
  for (let i = 0; i <= n; i++) { const u = 0.3 + ((ctx.W - 0.6) * i) / n, p = ctx.at(u, 0.6), q = ctx.at(u, ctx.D - 0.4); pipe(plan.zone(p.x), frost, [[p.x, top - 0.18, p.z], [q.x, top - 0.18, q.z]], 0.025); }
}
const COLD = (inner) => (ctx) => { coolingGrid(ctx, ['far', 'left']); inner(ctx); };

export const meatRoom = COLD((ctx) => {
  ctx.grid(1.0, 0.9, (u, v) => ctx.put(meatRail({ w: Math.min(2.4, ctx.D - 1.2) }), u, v, 'right'), 0.5);
  ctx.fit(butcherTable(), ['near:hi', 'right:lo']);
});
function butcherTable() { return tableRect({ w: 1.2, d: 0.7, mat: 'oak' }); }
export const fishRoom = COLD((ctx) => {
  for (const w of ['far', 'right']) for (let k = 0; k < 4; k++) if (!ctx.fit(shelves({ kind: 'stores', w: 1.5, mat: 'paintWhite' }), [w + ':lo'])) break;
  ctx.grid(1.2, 1.0, (u, v, i) => ctx.put(i % 3 === 2 ? iceStack() : fishBox({ v: i + 1 }), u, v, 'in'), 0.8);
});
export const produceRoom = (kind) => COLD((ctx) => {
  ctx.grid(1.05, 1.05, (u, v, i, j) => {
    const k = (i * 3 + j * 5) % 4;
    if (kind === 'fruit') ctx.put(k === 3 ? crateStack({ v: i }) : fruitCrate({ v: i + j }), u, v, 'in');
    else ctx.put(k < 2 ? sackPile({ mat: 'canvas' }) : crate({ s: 0.8 }), u, v, k % 2 ? 'in' : 'right');
  }, 0.75);
  ctx.fit(shelves({ kind: 'stores', w: 1.5 }), ['far:lo', 'far:hi']);
});
export const dairyRoom = COLD((ctx) => {
  for (let k = 0; k < 4; k++) if (!ctx.fit(shelves({ kind: 'stores', w: 1.5, mat: 'paintWhite' }), ['far:lo', 'left:lo', 'right:lo'])) break;
  ctx.grid(0.55, 0.55, (u, v, i, j) => { if ((i + j) % 3) ctx.put(churn(), u, v, 'in'); }, 0.9);
});
export const iceRoom = COLD((ctx) => { ctx.grid(1.3, 1.15, (u, v) => ctx.put(iceStack(), u, v, 'in'), 0.6); });
export function mineralRoom(ctx) {
  ctx.grid(1.0, 1.0, (u, v, i, j) => ctx.put((i + j) % 4 === 0 ? crateStack({ v: j }) : crate({ s: 0.7 }), u, v, 'in'), 0.7);
  ctx.fit(shelves({ kind: 'bottles', w: 1.5 }), ['far:lo', 'far:hi']);
}
export function wineCellar(ctx) {
  for (const w of ['far', 'left', 'right']) for (let k = 0; k < 6; k++) if (!ctx.fit(wineRack({ w: 1.5 }), [w + ':lo'])) break;
  ctx.grid(1.4, 1.4, (u, v, i, j) => { if ((i + j) % 2) ctx.put(barrel(), u, v, 'in'); else ctx.put(crate({ s: 0.7 }), u, v, 'in'); }, 1.4);
}
export function beerStore(ctx) {
  ctx.grid(0.75, 0.75, (u, v, i, j) => { if ((i + 2 * j) % 5) ctx.put(barrel(), u, v, 'in'); }, 0.8);
  ctx.fit(shelves({ kind: 'bottles', w: 1.5 }), ['far:lo']);
}
export function dryStore(ctx) {
  for (let k = 0; k < 4; k++) if (!ctx.fit(shelves({ kind: 'stores', w: 1.5 }), ['far:lo', 'right:lo'])) break;
  ctx.grid(1.6, 1.3, (u, v, i) => ctx.put(i % 3 ? sackPile() : barrel(), u, v, 'in'), 0.8);
}
export { tankV, sack, chairDining, mailBag, bagPile, workbench };
