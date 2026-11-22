// G deck hero rooms and service-room furnishing: squash court, post office, cold stores (meat hanging room etc.).
import { mats } from '../core/materials.js';
import {
  kitMats, pipe, squashMarkings, bench, locker, tableRect, stool, sackPile, desk, chairDining, safe, shelves, crate, crateStack,
  barrel, trunk, luggagePile, suitcase, tankV, clockWall, mirrorWall, basinSmall, sack,
} from '../interior/kit.js';
import { defProp, meatMat, fatMat, iceMat, corkMat } from './f-util.js';

// ---------------------------------------------------------------- custom props

/** oak sorting frame with pigeon-holes above a counter */
export const pigeonHoles = defProp('fgPigeon', (o) => [o.w ?? 1.5, 0.42, 1.95], (p, o) => {
  const w = o.w ?? 1.5, cols = Math.max(3, Math.round(w / 0.25)), rows = 7, y0 = 0.82, hh = 1.1;
  p.b(mats.oak, 0.42, 0.78, w); p.b(mats.oak, 0.46, 0.04, w + 0.02, 0.02, 0.78, 0);
  p.b(mats.oak, 0.02, hh, w, -0.2, y0, 0);
  for (let i = 0; i <= cols; i++) p.b(mats.oak, 0.34, hh, 0.015, -0.03, y0, -w / 2 + (i * w) / cols);
  for (let j = 0; j <= rows; j++) p.b(mats.oak, 0.34, 0.015, w, -0.03, y0 + (j * hh) / rows, 0);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) if ((i * 7 + j * 3) % 4 !== 0) p.b(mats.paper, 0.22, 0.05 + ((i + j) % 3) * 0.02, w / cols - 0.05, -0.08, y0 + (j * hh) / rows + 0.016, -w / 2 + ((i + 0.5) * w) / cols);
  p.b(mats.woodDark, 0.02, 0.05, w, 0.14, y0 + hh, 0);
});
/** meat rail with sides of beef and mutton on hooks (front +x) */
export const meatRail = defProp('fgMeatRail', (o) => [o.w ?? 2.4, 0.6, 2.3], (p, o) => {
  const w = o.w ?? 2.4, n = Math.max(2, Math.round(w / 0.6));
  p.b(mats.steel, 0.06, 0.06, w, 0, 2.22, 0); for (const s of [-1, 1]) p.b(mats.steel, 0.05, 0.12, 0.05, 0, 2.28, s * (w / 2 - 0.05));
  for (let i = 0; i < n; i++) {
    const z = -w / 2 + ((i + 0.5) * w) / n, big = i % 3 !== 1;
    p.b(mats.chrome, 0.015, 0.22, 0.015, 0, 2.0, z);
    if (big) { p.s(meatMat, 0.2, 0, 1.45, z, 1, 2.6, 0.7); p.s(fatMat, 0.17, 0.05, 1.45, z, 0.6, 2.3, 0.62); p.s(meatMat, 0.1, 0, 0.88, z, 0.8, 1.4, 0.8, true); }
    else { p.s(meatMat, 0.16, 0, 1.6, z, 1, 1.9, 0.7); p.s(fatMat, 0.13, 0.04, 1.6, z, 0.6, 1.7, 0.6, true); }
  }
});
/** stacked blocks of ice */
export const iceStack = defProp('fgIce', [1.2, 1.0, 1.2], (p) => {
  for (let j = 0; j < 3; j++) for (let i = 0; i < 2; i++) p.b(iceMat, 0.48, 0.38, 0.55, (i - 0.5) * 0.5, j * 0.4, (j % 2 ? 0.28 : -0.28));
  p.b(corkMat, 1.0, 0.02, 1.2, 0, 1.2, 0);
});
/** milk churn */
export const churn = defProp('fgChurn', [0.36, 0.36, 0.7], (p) => {
  p.c(mats.chrome, 0.17, 0.48, 0, 0, 0, 10); p.c(mats.chrome, 0.17, 0.12, 0, 0.48, 0, 10, 0.08); p.c(mats.chrome, 0.08, 0.08, 0, 0.6, 0, 10); p.c(mats.brass, 0.09, 0.03, 0, 0.67, 0, 10);
});
/** wine rack with bottles lying in a diamond lattice */
export const wineRack = defProp('fgWineRack', (o) => [o.w ?? 1.5, 0.45, 1.9], (p, o) => {
  const w = o.w ?? 1.5;
  p.b(mats.woodDark, 0.45, 1.9, 0.05, 0, 0, -w / 2 + 0.025); p.b(mats.woodDark, 0.45, 1.9, 0.05, 0, 0, w / 2 - 0.025);
  for (let j = 0; j < 5; j++) { p.b(mats.woodDark, 0.45, 0.03, w, 0, 0.05 + j * 0.45, 0); p.b(kitMats.bottles, 0.4, 0.34, w - 0.1, 0, 0.08 + j * 0.45, 0); }
});

// ---------------------------------------------------------------- furnish functions

/** Squash Racquet Court: maple floor, white walls with red lines (front wall = forward), caged lamps */
export function squashCourt(ctx) {
  const { world, deck, plan } = ctx, r = ctx.room, s = r.safe, b = plan.batch, Y = ctx.y;
  squashMarkings(world, deck, s.x0, s.x1, s.z0, s.z1, { front: 'fwd', h: ctx.h });
  // service boxes and the board ("tin") at the bottom of the front wall
  const xs = s.x1 - (s.x1 - s.x0) * 0.56, red = mats.fabricRed;
  for (const z of [s.z0 + 1.6, s.z1 - 1.6]) b.flat(red, xs - 1.6, xs, z - 0.025, z + 0.025, Y + 0.012);
  b.box(mats.paintWhite, s.x1 - 0.05, Y, s.z0, s.x1, Y + 0.48, s.z1, 'xY');
  // dark scuff marks of the balls on the front wall, a bench and racquets by the door
  for (let i = 0; i < 18; i++) { const z = s.z0 + 0.5 + ((i * 37) % 50) / 50 * (s.z1 - s.z0 - 1), y = Y + 0.7 + ((i * 13) % 17) / 17 * 1.3; b.box(mats.rubber, s.x1 - 0.002, y, z, s.x1, y + 0.05, z + 0.05, 'x'); }
  ctx.fit(bench({ w: 1.6, back: false, mat: 'oak' }), ['near:hi', 'near:lo'], { collide: false });
  for (let k = 0; k < 3; k++) b.box(mats.oak, s.x0 + 0.02, Y + 0.5, s.z1 - 0.4 - k * 0.12, s.x0 + 0.04, Y + 1.2, s.z1 - 0.37 - k * 0.12, 'X');
}
export function squashChanging(ctx) {
  ctx.fit(locker({ n: 3, mat: 'oak' }), ['far:mid', 'left:hi']); ctx.fit(bench({ w: 1.6, back: false, mat: 'oak' }), ['left:mid', 'right:mid'], { collide: false });
  ctx.fit(basinSmall(), ['right:lo', 'near:hi'], { collide: false }); ctx.mount(mirrorWall({ w: 0.5, h: 0.7 }), 'far', ctx.W * 0.25, 1.6);
}
/** sea post office: pigeon-holes, sorting tables, mail bags, registered-mail safe */
export function postOffice(ctx) {
  for (const w of ['far', 'left', 'right']) for (let k = 0; k < 6; k++) if (!ctx.fit(pigeonHoles({ w: 1.5 }), [w + ':lo'])) break;
  ctx.grid(2.6, 2.0, (u, v, i) => {
    if (!ctx.put(tableRect({ w: 1.8, d: 0.8, mat: 'oak' }), u, v, 'in')) return;
    ctx.put(stool({ mat: 'oak', seat: 'oak' }), u - 0.5, v - 0.62, 'in', { collide: false }); ctx.put(stool({ mat: 'oak', seat: 'oak' }), u + 0.5, v + 0.62, 'out', { collide: false });
    if (i % 2 === 0) ctx.put(sackPile(), u + 1.25, v, 'in');
  }, 0.9);
  ctx.fit(safe(), ['near:hi', 'left:hi']); ctx.fit(desk({ w: 1.2, mat: 'oak' }), ['near:hi', 'right:hi']);
  for (const p of ['near:mid', 'left:mid', 'right:mid']) ctx.fit(sackPile(), [p]);
  ctx.mount(clockWall(), 'near', ctx.W * 0.6, 2.0);
}
/** first-class baggage room: racks with trunks, luggage piles */
export function baggageRoom(ctx) {
  for (const w of ['far', 'left', 'right']) for (let k = 0; k < 5; k++) if (!ctx.fit(shelves({ kind: 'empty', w: 1.5, mat: 'pine' }), [w + ':lo'])) break;
  ctx.grid(2.0, 2.0, (u, v, i, j) => { if ((i + j) % 3 === 2) ctx.put(trunk({ big: true }), u, v, 'in'); else ctx.put(luggagePile({ v: i + j * 3 }), u, v, (i + j) % 2 ? 'in' : 'right'); }, 1.0);
  for (const p of ['near:hi', 'far:lo']) ctx.fit(suitcase(), [p], { collide: false });
}

/** cooling grid (brine pipes) on the walls of a cold room */
function coolingGrid(ctx, walls = ['far']) {
  const { plan } = ctx, top = ctx.y + ctx.h;
  for (const w of walls) {
    const [ua, va, ub, vb] = w === 'far' ? [0.15, ctx.D - 0.08, ctx.W - 0.15, ctx.D - 0.08] : w === 'left' ? [0.08, 0.4, 0.08, ctx.D - 0.3] : [ctx.W - 0.08, 0.4, ctx.W - 0.08, ctx.D - 0.3];
    const a = ctx.at(ua, va), c = ctx.at(ub, vb);
    for (const h of [0.35, 0.3]) pipe(plan.zone(a.x), 'paintWhite', [[a.x, top - h, a.z], [c.x, top - h, c.z]], 0.035);
  }
}
const COLD = (inner) => (ctx) => { coolingGrid(ctx, ['far', 'left']); inner(ctx); };

export const meatRoom = COLD((ctx) => {
  ctx.grid(1.0, 0.9, (u, v) => ctx.put(meatRail({ w: Math.min(2.4, ctx.D - 1.2) }), u, v, 'right'), 0.5);
  ctx.fit(butcherTable(), ['near:hi', 'right:lo']);
});
function butcherTable() { return tableRect({ w: 1.2, d: 0.7, mat: 'oak' }); }
export const fishRoom = COLD((ctx) => {
  for (const w of ['far', 'right']) for (let k = 0; k < 4; k++) if (!ctx.fit(shelves({ kind: 'stores', w: 1.5, mat: 'paintWhite' }), [w + ':lo'])) break;
  ctx.grid(1.2, 1.2, (u, v, i) => ctx.put(i % 2 ? crate({ s: 0.7 }) : iceStack(), u, v, 'in'), 0.8);
});
export const produceRoom = (kind) => COLD((ctx) => {
  ctx.grid(1.05, 1.05, (u, v, i, j) => {
    const k = (i * 3 + j * 5) % 4;
    if (kind === 'fruit') ctx.put(k === 3 ? crateStack({ v: i }) : crate({ s: 0.75 }), u, v, 'in');
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
export { tankV, sack, chairDining };
