// C deck ("Shelter Deck") – hand-detailed hero rooms and custom geometry. Used by c.js.
// Second-class library (Adam style) and its enclosed promenades, Purser's and Enquiry Office, third-class general room
// and smoking room under the poop, barber shop, Straus / Astor suites, steering gear, windlass room, crew messes.
import { mats } from '../core/materials.js';
import { STAIRS } from '../core/constants.js';
import {
  addStyle, matOf, PRESETS, pipe, imperialPlan, deckHalfWidth, faceDir,
  armchair, backBar, barberChair, barrel, bench, bookcase, chairDining, chest, clockWall, coatHooks, column, desk, gauge, liftCage,
  machineBlock, mirrorWall, notice, piano, picture, pilaster, pottedPalm, safe, sconce, servingCounter, settee, shelves, sofa, stool,
  tableRect, tableRound, tankH, valve, washbasinMarble, workbench, writingDesk, fireplace, bookPile, newspaper, carafe, switchboard, messTable, locker,
} from '../interior/kit.js';
import { BM, Deco, roomFaces, PRF } from './bc-util.js';
import {
  fineLv, Rivets, cgMug, cgTeapot, cgLedger, cgCounterSet, cgBottles, cgBarberKit, cgCards, cgGlass, cgDraughts, cgMessCentre, cgFireBuckets,
  cgMenuBoard, cgJugBasin, cgTowelHooks, cgBarberPole, cgMopBucket, hangFree,
} from './f-util.js';
import { workTable, utensilRail, instrumentStand } from './d-hero.js';
import {
  bcBigSafe, bcCurtains, bcKeyBoard, bcPigeon, bcPoster, bcSlatBench, bcSlatTable, bcSpittoon, bcSteerEngine, bcTelemotor, bcVitrine, bcWreath,
} from './bc-props.js';

// rotations: prop front facing +x / -x / +z / -z
const PX = 0, NX = Math.PI, PZ = -Math.PI / 2, NZ = Math.PI / 2;

addStyle('libAdam', { wall: BM().sycamore, wainscot: 'mahogany', door: 'mahogany', frame: 'mahogany', lamp: 'bowl' });
addStyle('third3', { wall: 'paintWhite', door: 'pine', frame: 'paintWhite', lamp: 'dome' });
addStyle('third3oak', { wall: 'oak', door: 'oak', frame: 'oak', lamp: 'dome' });

/** ctx.put with a world position and a world facing ('fwd' | 'aft' | 'port' | 'stbd') */
const DIRV = { fwd: [1, 0], aft: [-1, 0], port: [0, -1], stbd: [0, 1] };
function wput(ctx, prop, x, z, dir = 'fwd', opts) {
  const dx = x - ctx.o[0], dz = z - ctx.o[1], u = dx * ctx.U[0] + dz * ctx.U[1], v = dx * ctx.V[0] + dz * ctx.V[1];
  const w = DIRV[dir], du = w[0] * ctx.U[0] + w[1] * ctx.U[1], dv = w[0] * ctx.V[0] + w[1] * ctx.V[1];
  return ctx.put(prop, u, v, dv > 0.5 ? 'in' : dv < -0.5 ? 'out' : du > 0.5 ? 'right' : 'left', opts);
}

/**
 * Fills a gap in a fore-aft wall (z = const, xa..xb) with a parapet + head and either glazing, a brass grille with arched
 * pass windows or nothing (serving hatch). neg / pos = wall materials on the -z / +z face; shelf = counter overhang.
 */
export function bay(plan, xa, xb, z, o = {}) {
  const { sill = 1.05, head = 2.1, neg = 'whitePanel', pos = 'whitePanel', frame = 'oak', glass = false, grille = false, shelf = 0 } = o;
  const b = plan.batch, Y = plan.y, top = Y + plan.h, T = 0.05, F = matOf(frame);
  plan.opening(xa, z, xb, z);
  const a = xa + 0.05, c = xb - 0.05;
  for (const [y0, y1] of [[Y, Y + sill], [Y + head, top]]) { b.wallX(matOf(neg), z - T, a, c, y0, y1, -1); b.wallX(matOf(pos), z + T, a, c, y0, y1, 1); }
  b.box(F, xa, Y, z - 0.07, xa + 0.08, top, z + 0.07, 'xXzZ'); b.box(F, xb - 0.08, Y, z - 0.07, xb, top, z + 0.07, 'xXzZ');
  b.box(F, a, Y + sill - 0.05, z - 0.08 - shelf, c, Y + sill, z + 0.08 + shelf);
  b.box(F, a, Y + head, z - 0.075, c, Y + head + 0.06, z + 0.075);
  if (glass) {
    const n = Math.max(1, Math.round((c - a) / 0.9));
    for (let i = 1; i < n; i++) { const x = a + ((c - a) * i) / n; b.box(F, x - 0.02, Y + sill, z - 0.03, x + 0.02, Y + head, z + 0.03, 'xXzZ'); }
    b.box(F, a, Y + head - 0.38, z - 0.025, c, Y + head - 0.34, z + 0.025, 'yYzZ');
    b.wallX(mats.glass, z + 0.002, a, c, Y + sill, Y + head, 1); b.wallX(mats.glass, z - 0.002, a, c, Y + sill, Y + head, -1);
  }
  if (grille) {
    // brass grille with arched pass windows (one per ~1.4 m), brass edge on the counter shelf, rails top and middle
    const n = Math.max(1, Math.round((c - a) / 1.4)), wins = Array.from({ length: n }, (_, i) => a + ((c - a) * (i + 0.5)) / n), hw = 0.24, ya = Y + sill + 0.4;
    for (let x = a + 0.06; x < c - 0.03; x += 0.07) {
      const w = wins.find((q) => Math.abs(x - q) < hw);
      const y0 = w === undefined ? Y + sill : ya + Math.sqrt(Math.max(0, hw * hw - (x - w) ** 2)) * 0.85;
      b.box(mats.brass, x - 0.007, y0, z - 0.007, x + 0.007, Y + head, z + 0.007, 'xXzZ');
    }
    for (const w of wins) {
      for (let k = 0; k < 8; k++) {
        const a0 = Math.PI * (k / 8), a1 = Math.PI * ((k + 1) / 8);
        b.bar(mats.brass, [w - Math.cos(a0) * hw, ya + Math.sin(a0) * hw * 0.85, z], [w - Math.cos(a1) * hw, ya + Math.sin(a1) * hw * 0.85, z], 0.03, 0.02);
      }
      for (const sd of [-1, 1]) b.box(mats.brass, w + sd * hw - 0.012, Y + sill, z - 0.012, w + sd * hw + 0.012, ya, z + 0.012, 'xXzZ');
    }
    for (const yy of [head - 0.1, sill + 0.86]) b.box(mats.brass, a, Y + yy, z - 0.014, c, Y + yy + 0.03, z + 0.014, 'yYzZ');
    b.box(mats.brass, a, Y + sill - 0.012, z - 0.09 - shelf, c, Y + sill + 0.004, z - 0.08 - shelf, 'zyY'); b.box(mats.brass, a, Y + sill - 0.012, z + 0.08 + shelf, c, Y + sill + 0.004, z + 0.09 + shelf, 'ZyY');
  }
  plan.world.addCollider(xa, Y, z - T - shelf, xb, Y + sill, z + T + shelf);
  plan.world.addCollider(xa, Y, z - T, xb, top, z + T);
}

/** framed poster / notice on a wall. Wall plane x = const (nx = ±1) or z = const (nz = ±1); (x, z) = point on the wall face. */
export function poster(plan, x, z, nx, nz, w = 0.5, h = 0.7, yc = 1.6, v = 0) {
  plan.prop(bcPoster({ w, h, v }), x, z, faceDir(nx, nz), { y: plan.y + yc, collide: false });
}

const wallLight = (plan, x, z, rot, plain = false) => plan.prop(sconce(plain ? { plain: true } : {}), x, z, rot, { y: plan.y + 1.85 });

/** table with armchairs around it (world coordinates) */
function group(plan, x, z, o = {}) {
  const cover = o.cover ?? 'fabricGreen', mat = o.mat ?? 'mahogany', d = (o.r ?? 0.45) + 0.55;
  plan.prop(tableRound({ r: o.r ?? 0.45, mat, items: o.items }), x, z, 0, { collide: true });
  const seats = o.seats ?? [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dx, dz] of seats) plan.prop(armchair({ kind: 'uph', mat: cover }), x + dx * d, z + dz * d, Math.atan2(dz, -dx), { collide: false });
}

// ---------------------------------------------------------------- forward Grand Staircase landing (unchanged – rebuilt by the staircase work)

export function grandLobby(plan, L) {
  const Y = plan.y, h = plan.h, b = plan.batch, w = plan.world;
  for (const z of [-1.6, 0, 1.6]) plan.prop(liftCage(), 46.3, z, NX);
  b.box(mats.oakPanel, 47.1, Y, -2.45, 47.92, Y + h, 2.45, 'xzZ');
  b.box(mats.oak, 45.46, Y + 2.4, -2.45, 47.1, Y + h, 2.45, 'xyzZ');
  for (const z of [-2.45, 2.45]) b.box(mats.oakPanel, 45.5, Y, z - 0.03, 47.1, Y + 2.4, z + 0.03, 'xzZ');
  for (const z of [-2.4, -0.8, 0.8, 2.4]) plan.prop(pilaster({ h: 2.4, w: 0.16, mat: 'oak', capital: 'gold' }), 45.46, z, NX);
  b.box(mats.gold, 45.44, Y + 2.38, -2.45, 45.47, Y + 2.42, 2.45, 'xyY');
  w.addCollider(45.5, Y, -2.48, 47.92, Y + h, 2.48);
  const sp = imperialPlan(STAIRS.find((q) => q.id === 'grandFwd'));
  for (const x of [sp.x0 + 0.7, sp.xf + 0.45]) for (const s of [-1, 1]) plan.prop(column({ h, r: 0.16, mat: 'oak', capital: 'gold' }), x, s * (sp.hw + 0.6), 0, { collide: true });
  for (const s of [-1, 1]) {
    for (const z of [3.4, 6.9]) { plan.prop(pilaster({ h, mat: 'oak', capital: 'gold' }), L.x0 + 0.09, s * z, PX); plan.prop(pilaster({ h, mat: 'oak', capital: 'gold' }), L.x1 - 0.09, s * z, NX); }
    wallLight(plan, L.x0 + 0.06, s * 5.15, PX); wallLight(plan, L.x1 - 0.06, s * 5.15, NX);
    plan.prop(pottedPalm(), L.x0 + 0.65, s * 6.2, 0, { collide: false }); plan.prop(pottedPalm(), L.x1 - 0.65, s * 6.2, 0, { collide: false });
  }
  plan.prop(clockWall(), L.x1 - 0.06, 5.15, NX, { y: Y + 2.25 });
  group(plan, 40.6, -5.3, { seats: [[-1, 0], [1, 0], [0, -1]] });
  group(plan, 40.6, 5.3, { seats: [[-1, 0], [1, 0], [0, 1]], cover: 'fabricRed' });
  for (const s of [-1, 1]) plan.prop(settee({ mat: s < 0 ? 'fabricGreen' : 'fabricRed' }), 44.0, s * 4.2, s < 0 ? PZ : NZ, { collide: true });
}

/** small seating corners of the aft Grand Staircase lobby */
export function aftLobby(plan, L) {
  const sp = imperialPlan(STAIRS.find((q) => q.id === 'grandAft'));
  for (const s of [-1, 1]) plan.prop(column({ h: plan.h, r: 0.15, mat: 'oak', capital: 'gold' }), sp.xf + 0.45, s * (sp.hw + 0.55), 0, { collide: true });
  for (const s of [-1, 1]) {
    group(plan, -2.6, s * 5.4, { seats: [[-1, 0], [1, 0]], cover: s < 0 ? 'fabricGold' : 'fabricBlue', r: 0.4 });
    plan.prop(pottedPalm(), L.x1 - 0.65, s * 6.3, 0, { collide: false });
    wallLight(plan, L.x1 - 0.06, s * 5.2, NX);
    for (const z of [3.4, 6.9]) plan.prop(pilaster({ h: plan.h, mat: 'oak', capital: 'gold' }), L.x1 - 0.09, s * z, NX);
  }
}

// ---------------------------------------------------------------- Purser's Office and Enquiry Office

/** counter desk behind a grille window in the lobby wall (x range of the window), with ledgers and telegram forms */
function counterBehind(ctx, xa, xb) {
  const zw = ctx.room.z0 + 0.05, x = (xa + xb) / 2, w = Math.round((xb - xa - 0.1) * 10) / 10;
  if (!wput(ctx, servingCounter({ w, d: 0.5, mat: 'mahogany', top: 'mahogany' }), x, zw + 0.27, 'port', { force: true, collide: true })) return;
  ctx.attach(bookPile({ v: 0 }), 0.05, -w * 0.3, { y: 0.93, turn: 0.2 });
  ctx.attach(newspaper(), 0.02, w * 0.25, { y: 0.93, turn: -0.3 });
  ctx.attach(carafe(), -0.12, 0.0, { y: 0.93 });
  if (fineLv() >= 0 && w > 2) { ctx.attach(cgCounterSet(), 0.0, -0.5, { y: 0.925 }); ctx.attach(cgLedger({ open: true, v: 1 }), -0.04, 1.4, { y: 0.925, turn: 0.1 }); }
  for (const dx of w > 2 ? [-w * 0.25, w * 0.25] : [0]) wput(ctx, stool({ mat: 'oak', seat: 'leather' }), x + dx, zw + 0.85, 'port', { collide: false });
}
export function purserOffice(ctx) {
  counterBehind(ctx, 41.0, 42.4);
  ctx.fit(bcBigSafe(), ['far:lo', 'far:hi', 'left:hi']);
  ctx.fit(bcBigSafe(), ['far:hi', 'right:hi', 'left:mid']);
  if (ctx.fit(desk({ w: 1.3, mat: 'oak' }), ['left:mid', 'right:mid', 'far:mid'])) { ctx.attach(chairDining({ cls: 'plain', mat: 'oak' }), 0.6, 0, { turn: Math.PI }); deskLedgers(ctx); }
  ctx.fit(bcPigeon({ w: 1.2 }), ['right:hi', 'left:hi', 'far:mid']);
  ctx.fit(safe(), ['right:mid', 'left:lo']);
  ctx.mount(bcKeyBoard(), 'left', ctx.D * 0.55, 1.75) || ctx.mount(bcKeyBoard(), 'right', ctx.D * 0.55, 1.75);
  ctx.mount(clockWall(), 'far', ctx.W * 0.5, 2.15);
  officeDeco(ctx, [41.0, 42.4]);
}
/** two ledgers stacked at the corner of the desk placed last (desk top 0.773 m) */
function deskLedgers(ctx, k = 2) {
  if (fineLv() < 0) return;
  ctx.attach(cgLedger({ v: k }), 0.15, -0.42, { y: 0.773 }); ctx.attach(cgLedger({ v: k + 1 }), 0.15, -0.42, { y: 0.818, turn: 0.12 });
}
/** offices behind the grille: fielded oak panels on the wainscot, moulded ceiling with beads (and beams from fine 2) */
function officeDeco(ctx, [xa, xb]) {
  const f = fineLv(); if (f < 1) return;
  const d = new Deco(ctx.plan), F = roomFaces(ctx, { port: [{ s: xa - 0.06, e: xb + 0.06, y0: 0, y1: 2.3 }] });
  for (const side of ['fwd', 'aft', 'port']) { const q = F[side]; if (!q.hull) d.panelRun(q.F, q.a, q.e, q.holes, { wood: mats.oak, rail: mats.oak, upper: false, cornice: false, topRail: false, skirt: false, dado: 0.86, lowPitch: 0.62 }); }
  if (f >= 2) d.coffers(F.x0, F.x1, F.z0, F.z1, [(F.x0 + F.x1) / 2], [(F.z0 + F.z1) / 2], { w: 0.16, depth: 0.07, mat: 'oak', bead: 'gold' });
  else d.beadRect(F.x0 + 0.25, F.x1 - 0.25, F.z0 + 0.25, F.z1 - 0.25, 'gold');
  d.flush();
}
export function enquiryOffice(ctx) {
  counterBehind(ctx, 43.0, 46.6);
  ctx.fit(bcPigeon({ w: 1.5 }), ['far:lo', 'far:hi']);
  ctx.fit(shelves({ kind: 'empty', w: 1.2, mat: 'mahogany' }), ['far:hi', 'far:mid']);
  if (ctx.fit(desk({ w: 1.2, mat: 'oak' }), ['right:mid', 'left:mid'])) { ctx.attach(chairDining({ cls: 'plain', mat: 'oak' }), 0.6, 0, { turn: Math.PI }); deskLedgers(ctx, 0); }
  ctx.fit(safe(), ['right:hi', 'left:hi']);
  ctx.mount(bcKeyBoard(), 'left', ctx.D * 0.6, 1.75);
  ctx.mount(notice(), 'far', ctx.W * 0.8, 1.6);
  officeDeco(ctx, [43.0, 46.6]);
}

// ---------------------------------------------------------------- suites (Straus / Astor)

export function suiteSitting(ctx) {
  const cover = ctx.room.id === 'C55' ? 'fabricRed' : 'fabricGold', mat = 'mahogany';
  const fp = ctx.fit(fireplace({ mat }), ['right:mid', 'left:mid'], { gap: 0 });
  ctx.fit(sofa({ mat: cover, w: 1.9 }), ['far:mid', 'far:lo', 'far:hi']);
  const u = ctx.W / 2, v = ctx.D / 2 + 0.35;
  if (ctx.put(tableRound({ r: 0.5, mat, lamp: true }), u, v, 'in')) {
    ctx.attach(bookPile({ v: 1 }), 0.25, 0.2, { y: 0.75, turn: 0.4 });
    ctx.put(armchair({ kind: 'uph', mat: cover }), u - 1.05, v, 'right', { collide: false });
    ctx.put(armchair({ kind: 'uph', mat: cover }), u + 1.05, v, 'left', { collide: false });
    ctx.put(armchair({ kind: 'uph', mat: cover }), u, v - 1.05, 'in', { collide: false });
  }
  if (ctx.fit(writingDesk({ mat }), ['near:hi', 'left:lo', 'right:lo'])) ctx.attach(chairDining({ cls: 'first', mat: 'woodDark', seat: cover }), 0.55, 0, { turn: Math.PI });
  ctx.fit(bookcase({ mat, w: 1.0 }), ['left:hi', 'right:hi', 'near:mid']);
  ctx.fit(pottedPalm(), ['far:lo', 'far:hi'], { collide: false });
  ctx.mount(sconce(), 'far', ctx.W * 0.22, 1.85); ctx.mount(sconce(), 'far', ctx.W * 0.78, 1.85);
  ctx.mount(mirrorWall({ w: 0.7, h: 1.0 }), 'near', ctx.W - 0.9, 2.05);
  ctx.mount(picture({ w: 0.8, h: 0.55, v: 3 }), 'far', ctx.W * 0.5, 1.75);
  if (fp) ctx.glow(ctx.W / 2, ctx.D / 2, 0.5);
  // white panelled wainscot under the silk, gilt wreaths, moulded ceiling
  const d = new Deco(ctx.plan), f = roomFaces(ctx), wr = bcWreath();
  for (const s of ['fwd', 'aft', 'port', 'stbd']) {
    const face = f[s]; if (face.hull) continue;
    d.panelRun(face.F, face.a, face.e, face.holes, { wood: mats.paintWhite, rail: mats.paintWhite, upper: false, topRail: false, cornice: 'gold', corniceProf: undefined, pitch: 0.7, orn: null });
    for (const [a, e] of d.segs(face.a, face.e, face.holes, 1.5, 2.2)) if (e - a > 1.2) d.mount(wr, face.F, (a + e) / 2, 2.15, 0.005);
  }
  d.beadRect(f.x0 + 0.3, f.x1 - 0.3, f.z0 + 0.3, f.z1 - 0.3, 'gold'); d.beadRect(f.x0 + 0.45, f.x1 - 0.45, f.z0 + 0.45, f.z1 - 0.45, 'plaster');
  d.flush();
}

// ---------------------------------------------------------------- barber shop

export function barberShop(ctx) {
  // two barber chairs facing marble basins and mirrors on the long wall
  const wall = ctx.hull === 'right' ? 'left' : 'right', uw = wall === 'right' ? ctx.W : 0, dir = wall === 'right' ? 'right' : 'left', sg = wall === 'right' ? -1 : 1;
  for (const v of [1.9, 4.1]) {
    if (!ctx.put(washbasinMarble({ mirror: true }), uw + sg * 0.26, v, dir, { force: false })) continue;
    if (fineLv() >= 0) ctx.attach(cgBarberKit(), 0, 0, { y: 0.001 });
    ctx.put(barberChair(), uw + sg * (0.52 + 0.62), v, dir, { collide: false });
    ctx.mount(sconce({ plain: true }), wall, v - 0.55, 1.9);
  }
  ctx.fit(bcVitrine({ w: 1.3 }), ['far:lo', 'far:hi', 'far:mid']);
  ctx.fit(shelves({ kind: 'bottles', w: 1.0, mat: 'mahogany' }), [wall === 'right' ? 'left:hi' : 'right:hi', 'near:hi']);
  if (ctx.fit(bench({ w: 1.4, mat: 'mahogany', iron: false }), [wall === 'right' ? 'left:mid' : 'right:mid', 'near:hi'], { collide: false }) && fineLv() >= 1) ctx.mount(cgTowelHooks({ w: 1.0 }), ctx.last.wall, ctx.last.pos, 1.78);
  ctx.fit(bcVitrine({ w: 1.0, v: 9 }), [wall === 'right' ? 'left:lo' : 'right:lo']);
  // souvenirs hanging from the ceiling: pennants, dolls, small flags, cap ribbons
  const b = ctx.plan.batch, top = ctx.y + ctx.h, r = ctx.drng;
  const cols = ['fabricRed', 'fabricBlue', 'fabricGold', 'paper', 'fabricGreen', 'linen'];
  ctx.grid(0.55, 0.6, (u, v, i, j) => {
    const p = ctx.at(u + (r() - 0.5) * 0.2, v + (r() - 0.5) * 0.2), len = 0.18 + r() * 0.2, k = (i * 3 + j) % 5, m = matOf(cols[(i + 2 * j) % cols.length]);
    b.box(mats.rope, p.x - 0.003, top - len, p.z - 0.003, p.x + 0.003, top, p.z + 0.003, 'xXzZ');
    const y = top - len;
    if (k === 0) for (const sd of [-1, 1]) b.poly(m, [[p.x - 0.13, y, p.z + sd * 0.003], [p.x + 0.13, y, p.z + sd * 0.003], [p.x, y - 0.22, p.z + sd * 0.003]], [0, 0, sd]);
    else if (k === 1) b.box(m, p.x - 0.004, y - 0.14, p.z - 0.1, p.x + 0.004, y, p.z + 0.1);
    else if (k === 2) { b.box(m, p.x - 0.045, y - 0.17, p.z - 0.035, p.x + 0.045, y - 0.05, p.z + 0.035); b.box(mats.porcelain, p.x - 0.03, y - 0.05, p.z - 0.03, p.x + 0.03, y, p.z + 0.03); b.box(m, p.x - 0.02, y - 0.25, p.z - 0.03, p.x + 0.02, y - 0.17, p.z + 0.03); }
    else if (k === 3) b.box(mats.brass, p.x - 0.05, y - 0.07, p.z - 0.05, p.x + 0.05, y, p.z + 0.05);
    else b.box(m, p.x - 0.11, y - 0.04, p.z - 0.004, p.x + 0.11, y, p.z + 0.004);
  }, 0.35);
}

// ---------------------------------------------------------------- 2nd class library + promenades

export function library(ctx, R, WZ, bays) {
  const plan = ctx.plan, d = new Deco(plan), Y = plan.y, h = plan.h, B = BM();
  // glazed bays towards the enclosed promenades
  for (const s of [-1, 1]) for (const [xa, xb] of bays) bay(plan, xa, xb, s * WZ, { sill: 1.12, head: 2.2, neg: s < 0 ? 'whitePanel' : B.sycamore, pos: s < 0 ? B.sycamore : 'whitePanel', frame: 'mahogany', glass: true });
  // sycamore panelling over a carved mahogany dado, white Adam cornice
  const bayHoles = bays.map(([xa, xb]) => ({ s: xa - 0.05, e: xb + 0.05, y0: 1.06, y1: 2.3 }));
  const f = roomFaces(ctx, { port: bayHoles, stbd: bayHoles });
  for (const s of ['fwd', 'aft', 'port', 'stbd']) d.panelRun(f[s].F, f[s].a, f[s].e, f[s].holes, { wood: B.sycamore, lowWood: mats.mahogany, rail: mats.mahogany, gilt: 'paintWhite', cornice: 'paintWhite', frieze: B.sycamore, pitch: 0.7 });
  // silk curtains at the bays
  for (const s of [-1, 1]) for (const [xa, xb] of bays) plan.prop(bcCurtains({ w: xb - xa - 0.9, h: 2.36, mat: 'fabricGreen', frame: 'mahogany' }), (xa + xb) / 2, s * (WZ - 0.05), s < 0 ? PZ : NZ, { y: Y, collide: false });
  // the big glazed bookcase on the aft wall (three sections under one cornice and pediment) and a second one forward
  for (const [xw, rot, n] of [[R.x0 + 0.27, PX, 1], [R.x1 - 0.27, NX, -1]]) {
    for (const z of n > 0 ? [-1.45, 0, 1.45] : [0]) plan.prop(bookcase({ w: 1.4, mat: 'mahogany', seed: Math.round(z * 10 + xw) }), xw, z, rot, { collide: true });
    const F = { axis: 'z', c: xw - n * 0.27, n };
    const hwb = n > 0 ? 2.2 : 0.75; d.box(F, 'mahogany', -hwb, hwb, 2.05, 2.12, 0.46); d.sweep(F, 'mahogany', [[0, 0], [0.47, 0], [0.5, 0.03], [0.5, 0.06], [0, 0.06]], -hwb - 0.05, hwb + 0.05, 2.12);
    d.b.poly(matOf('mahogany'), [d.P(F, -0.7, 2.18, 0.45), d.P(F, 0.7, 2.18, 0.45), d.P(F, 0, 2.4, 0.45)], d.O(F));
    d.mount(bcWreath(), F, 0, 2.27, 0.46);
  }
  // fluted sycamore columns (and from fine level 2 matching pilasters on the end walls under the beam lines)
  const xs = [R.x0 + 3.0, (R.x0 + R.x1) / 2, R.x1 - 3.0];
  if (fineLv() >= 2) for (const [xw, rot] of [[R.x0 + 0.05, PX], [R.x1 - 0.05, NX]]) for (const z of [-3.4, 3.4]) plan.prop(pilaster({ h: h - 0.18, w: 0.28, mat: 'bc_sycamore', capital: 'paintWhite' }), xw + (rot === PX ? 0.04 : -0.04), z, rot, { collide: false });
  for (const x of xs) for (const s of [-1, 1]) plan.prop(column({ h: h - 0.1, r: 0.14, mat: 'bc_sycamore', capital: 'paintWhite' }), x, s * 3.4, 0, { collide: true });
  // ceiling: beams on the column lines, beaded panels, lamps
  const fl = fineLv();
  d.coffers(f.x0, f.x1, f.z0, f.z1, xs, [-3.4, 3.4], { w: 0.26, depth: 0.1, mat: 'plaster', bead: 'paintWhite', cb: (cx, cz, w, dd) => { if (w * dd > 4) plan.lamp(cx, cz, 'bowl'); else if (fl >= 1) d.rose(cx, cz, 0.2); } });
  if (fl >= 2) { // dentil course under the Adam cornice
    const yc = h - PRF.cornice.at(-1)[1];
    for (const sd of ['fwd', 'aft', 'port', 'stbd']) for (const [a, e] of d.segs(f[sd].a, f[sd].e, f[sd].holes, yc - 0.06, yc)) for (let q = a + 0.04; q < e - 0.07; q += 0.075) d.box(f[sd].F, 'paintWhite', q, q + 0.04, yc - 0.05, yc, 0.032);
  }
  // mahogany chairs with tapestry seats (instanced), writing tables in the bays, settees, reading tables
  const ch = chairDining({ cls: 'second', mat: 'mahogany', seat: 'fabricGold' });
  for (const s of [-1, 1]) {
    for (const [xa, xb] of bays) {
      const x = (xa + xb) / 2;
      plan.prop(writingDesk({ mat: 'mahogany' }), x, s * (WZ - 0.4), s < 0 ? PZ : NZ, { collide: true });
      d.ip(ch, x, s * (WZ - 1.05), s < 0 ? NZ : PZ);
    }
    for (let i = 0; i < bays.length - 1; i++) wallLight(plan, (bays[i][1] + bays[i + 1][0]) / 2, s * (WZ - 0.06), s < 0 ? PZ : NZ);
    plan.prop(pottedPalm(), R.x1 - 0.7, s * (WZ - 0.7), 0, { collide: false });
    for (const x of [R.x0 + 2.6, R.x1 - 2.6]) {
      group(plan, x, s * 6.7, { cover: s < 0 ? 'fabricGreen' : 'fabricRed', r: 0.5, items: true });
      if (fl >= 1) plan.prop(bookPile({ v: x > R.x0 + 5 ? 2 : 0 }), x - 0.2, s * 6.75 + 0.12, 0.7, { y: Y + 0.75, collide: false });
    }
    const xm = (R.x0 + R.x1) / 2;
    plan.prop(tableRound({ r: 0.45, mat: 'mahogany', items: true }), xm, s * 6.6, 0, { collide: true });
    plan.prop(settee({ mat: 'fabricGreen' }), xm, s * 5.55, s < 0 ? NZ : PZ, { collide: true });
    for (const dx of [-1, 1]) plan.prop(armchair({ kind: 'uph', mat: 'fabricGreen' }), xm + dx * 1.0, s * 6.75, dx < 0 ? PX : NX, { collide: false });
    wallLight(plan, R.x0 + 0.06, s * 6.5, PX); wallLight(plan, R.x1 - 0.06, s * 7.6, NX);
  }
  for (const x of [R.x0 + 3.0, R.x1 - 3.0]) {
    plan.prop(tableRect({ w: 1.8, d: 0.9, mat: 'mahogany', lamp: true, items: true }), x, 0, 0, { collide: true });
    for (const dz of [-0.45, 0.45]) { d.ip(ch, x - 0.8, dz, PX); d.ip(ch, x + 0.8, dz, NX); }
  }
  plan.prop(clockWall(), R.x1 - 0.06, 2.75, NX, { y: Y + 2.2 });
  d.flush();
}

export function promenade(plan, x0, x1, s, hw) {
  // teak benches along the ship's side, looking inboard; palms between; skip the ends (doors)
  for (let x = x0 + 2.4; x < x1 - 1.5; x += 4.05) {
    plan.prop(bcSlatBench({ w: 1.8 }), x, s * (hw - 0.32), s > 0 ? NZ : PZ, { collide: true });
  }
}

// ---------------------------------------------------------------- 3rd class general room / smoking room

/**
 * 3rd class saloons under the poop. s = +1 starboard (general room), -1 port (smoking room).
 * R = room rect (x0 aft, x1 = well-deck bulkhead, whose inner face is 0.15 m aft of x1), zi = |z| of the inner wall,
 * doorX = x of the entrance door in the inner wall (kept free), hatch = [xa, xb] of the bar hatch in the inner wall (smoking room).
 */
export function thirdSaloon(ctx, R, s, zi, smoking, doorX, hatch) {
  const plan = ctx.plan, d = new Deco(plan), b = plan.batch, Y = plan.y, top = Y + plan.h, fwdX = R.x1 - 0.15;
  const hw = (x) => deckHalfWidth('C', x), W = smoking ? mats.oak : mats.paintWhite;
  const span = (x, m = 0) => (s > 0 ? [zi + 0.05, hw(x) - m] : [-hw(x) + m, -(zi + 0.05)]);
  // panelling: white-enamelled pine (general room) / oak (smoking room) on the inner wall, aft wall and forward bulkhead
  const holes = [{ s: doorX - 0.72, e: doorX + 0.72, y0: 0, y1: 2.12 }, ...(hatch ? [{ s: hatch[0] - 0.1, e: hatch[1] + 0.1, y0: 0, y1: 2.12 }] : [])];
  const po = { wood: W, rail: smoking ? mats.oak : mats.pine, cornice: W, corniceProf: undefined, pitch: 0.6, topRail: true, top: plan.h - 0.5 };
  d.panelRun({ axis: 'x', c: s * (zi + 0.05), n: s }, R.x0 + 0.05, fwdX, holes, po);
  const sa = span(R.x0 + 0.2, 0.05); d.panelRun({ axis: 'z', c: R.x0 + 0.05, n: 1 }, sa[0], sa[1], [], po);
  const sf = span(fwdX - 0.3, 0.05); d.panelRun({ axis: 'z', c: fwdX, n: -1 }, sf[0], sf[1], [], { ...po, upper: false });
  // deck beams (steel, painted white) across the room, a longitudinal girder on steel stanchions
  const fl = fineLv(), rv = fl >= 2 ? new Rivets(plan.world, plan.deck) : null;
  for (let x = R.x0 + 1.2; x < fwdX - 0.3; x += 2.4) {
    const [z0, z1] = span(x);
    b.box(mats.paintWhite, x - 0.045, top - 0.24, z0, x + 0.045, top, z1, 'xXy');
    b.box(mats.paintWhite, x - 0.09, top - 0.26, z0, x + 0.09, top - 0.24, z1, 'xXyY');
    if (fl >= 1) for (const [ze, dz] of [[z0, 1], [z1, -1]]) { // knee brackets where the beam meets the frames / inner wall
      const tri = [[top - 0.26, ze], [top - 0.62, ze], [top - 0.26, ze + dz * 0.38]];
      for (const sx of [-1, 1]) b.poly(mats.paintWhite, tri.map(([y, z]) => [x + sx * 0.006, y, z]), [sx, 0, 0]);
      b.poly(mats.paintWhite, [[x - 0.006, top - 0.62, ze], [x + 0.006, top - 0.62, ze], [x + 0.006, top - 0.26, ze + dz * 0.38], [x - 0.006, top - 0.26, ze + dz * 0.38]], [0, -1, dz * 0.9]);
    }
    if (rv) for (const dx of [-0.06, 0.06]) rv.row(mats.paintWhite, [x + dx, top - 0.262, z0 + 0.1], [x + dx, top - 0.262, z1 - 0.1], 0.16, 'y');
  }
  const zg = s * (zi + 3.9), xsT = [-119.6, -116.7, -113.8, -110.9];
  let gx = R.x0 + 0.05; while (hw(gx) < zi + 4.05) gx += 0.25;
  b.box(mats.paintWhite, gx, top - 0.3, zg - 0.05, fwdX, top, zg + 0.05, 'xzZy'); b.box(mats.paintWhite, gx, top - 0.32, zg - 0.1, fwdX, top - 0.3, zg + 0.1, 'xzZyY');
  for (let i = 0; i < xsT.length - 1; i++) {
    const x = (xsT[i] + xsT[i + 1]) / 2;
    b.prism(mats.paintWhite, [x, Y + 0.1, zg], [x, top - 0.32, zg], 0.06, 10);
    b.box(mats.paintWhite, x - 0.12, Y, zg - 0.12, x + 0.12, Y + 0.1, zg + 0.12, 'xXzZY'); b.box(mats.paintWhite, x - 0.1, top - 0.4, zg - 0.1, x + 0.1, top - 0.32, zg + 0.1, 'xXzZy');
    d.collider(x - 0.13, zg - 0.13, x + 0.13, zg + 0.13, 2.4);
  }
  // teak tables with slatted benches, bolted to the deck (long side across the room)
  const z0 = zi + 1.25;
  for (const x of xsT) {
    const zEnd = Math.min(z0 + 2.0, hw(x - 0.98) - 0.12, zi + 3.9 - 0.4), tw = Math.floor((zEnd - z0) * 10) / 10;
    if (tw < 1.2) continue;
    const zc = s * (z0 + tw / 2);
    plan.prop(bcSlatTable({ w: tw }), x, zc, 0, { collide: true });
    plan.prop(bcSlatBench({ w: tw }), x - 0.7, zc, PX, { collide: true });
    plan.prop(bcSlatBench({ w: tw }), x + 0.7, zc, NX, { collide: true });
    if (smoking) { plan.prop(bcSpittoon(), x - 1.2, s * (z0 - 0.35), 0, { collide: false }); }
    else if (x !== xsT[1]) plan.prop(newspaper(), x + 0.1, zc - s * 0.3, 0.4, { y: Y + 0.77, collide: false });
    if (fl >= 0) { // a game of cards / draughts, mugs of tea or beer glasses
      const k = xsT.indexOf(x);
      if (smoking && k % 2 === 0) plan.prop(cgCards({ v: k }), x, zc + s * 0.25, 0, { y: Y + 0.76, collide: false });
      else if (!smoking && k === 1) plan.prop(cgDraughts(), x, zc + s * 0.1, 0.1, { y: Y + 0.76, collide: false });
      if (fl >= 1) for (const [dx, dz] of [[-0.24, -0.55], [0.22, 0.6], [-0.2, 0.75]]) if (Math.abs(dz) < tw / 2 - 0.1) plan.prop(smoking ? cgGlass() : cgMug(), x + dx, zc + s * dz, 1.3 * dz, { y: Y + 0.76, collide: false });
    }
  }
  if (fl >= 2) { // tongue-and-groove boarding with a capping rail on the lining of the ship's side
    const wood = smoking ? mats.oak : mats.pine;
    for (let x = R.x0 + 0.1; x < fwdX - 0.1; x += 1.0) {
      const xb = Math.min(fwdX - 0.1, x + 1.0), z = s * (Math.min(hw(x), hw(xb)) - 0.015), t = (a, c) => [Math.min(a, c), Math.max(a, c)];
      const [za, zb] = t(z, z - s * 0.012), [ga, gb] = t(z - s * 0.012, z - s * 0.016), [ra, rb] = t(z, z - s * 0.04);
      b.box(wood, x, Y, za, xb, Y + 1.05, zb, s > 0 ? 'zY' : 'ZY');
      for (let k = 1; k < 10; k++) b.box(mats.woodDark, x + k * 0.1 - 0.004, Y + 0.12, ga, x + k * 0.1 + 0.004, Y + 1.0, gb, s > 0 ? 'z' : 'Z');
      b.box(wood, x, Y + 1.05, ra, xb, Y + 1.1, rb, s > 0 ? 'zyY' : 'ZyY');
    }
  }
  // benches along the forward (well-deck) bulkhead, under the portholes
  for (const z of [zi + 1.2, zi + 3.1]) if (z + 1.1 < hw(fwdX - 0.6)) plan.prop(bcSlatBench({ w: 1.8, back: true }), fwdX - 0.3, s * (z + 0.3), NX, { collide: true });
  if (!smoking) {
    plan.prop(piano(), R.x0 + 0.38, s * (zi + 0.95), PX, { collide: true });
    plan.world.addUse('piano', R.x0 + 1.0, plan.y, s * (zi + 0.95));
    plan.prop(stool({ mat: 'oak' }), R.x0 + 1.05, s * (zi + 0.95), 0, { collide: false });
    poster(plan, R.x0 + 0.06, s * (zi + 2.6), 1, 0, 0.55, 0.75, 1.65, 0);
    poster(plan, fwdX - 0.02, s * (zi + 2.15), -1, 0, 0.5, 0.7, 1.75, 2);
    [R.x0 + 3.0, R.x0 + 7.6, R.x0 + 11.6].forEach((x, i) => poster(plan, x, s * (zi + 0.07), 0, s, 0.55, 0.75, 1.65, [1, 3, 0][i]));
    wallLight(plan, R.x0 + 0.06, s * (zi + 3.6), PX, true);
    plan.prop(clockWall(), fwdX - 0.02, s * (zi + 4.05), NX, { y: Y + 2.1 });
  } else {
    for (const x of [-117.8, -112.0]) plan.prop(bcSpittoon(), x, s * (z0 + 2.4), 0, { collide: false });
    poster(plan, R.x0 + 7.0, s * (zi + 0.07), 0, s, 0.5, 0.7, 1.7, 2);
    poster(plan, R.x0 + 9.6, s * (zi + 0.07), 0, s, 0.55, 0.75, 1.65, 3);
    plan.prop(notice(), R.x0 + 0.06, s * (zi + 2.0), PX, { y: Y + 1.6, collide: false });
    plan.prop(notice(), fwdX - 0.02, s * (zi + 2.2), NX, { y: Y + 1.6, collide: false });
    wallLight(plan, R.x0 + 0.06, s * (zi + 1.2), PX, true); wallLight(plan, fwdX - 0.01, s * (zi + 2.15), NX, true);
    plan.prop(clockWall(), R.x0 + 4.0, s * (zi + 0.07), s > 0 ? PZ : NZ, { y: Y + 2.1 });
  }
  if (rv) { for (const dz of [-0.07, 0.07]) rv.row(mats.paintWhite, [gx + 0.1, top - 0.322, zg + dz], [fwdX - 0.1, top - 0.322, zg + dz], 0.16, 'y'); rv.flush(); }
  d.flush();
}

export function barPantry(ctx) {
  ctx.fit(backBar({ w: Math.min(2.4, ctx.W - 2.2) }), ['far:hi', 'far:mid'], { gap: 0 });
  ctx.fit(barrel(), ['far:lo', 'left:hi']); ctx.fit(barrel(), ['far:lo', 'left:hi', 'left:mid']);
}

// ---------------------------------------------------------------- steering gear

export function steeringGear(plan, R) {
  const Y = plan.y, h = plan.h, b = plan.batch, w = plan.world, S = mats.steelDark, I = mats.iron;
  const cx = R.x0 + 2.5, Rq = 2.6, A = (50 * Math.PI) / 180, yq = Y + 0.72;
  // rudder stock + crosshead
  plan.prop(column({ h, r: 0.3, mat: 'steelDark' }), cx, 0, 0, { collide: true });
  b.box(I, cx - 0.5, yq - 0.12, -0.5, cx + 0.5, yq + 0.3, 0.5);
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; b.prism(mats.brass, [cx + Math.cos(a) * 0.42, yq + 0.3, Math.sin(a) * 0.42], [cx + Math.cos(a) * 0.42, yq + 0.36, Math.sin(a) * 0.42], 0.03, 6, true); }
  // quadrant: three arms, rim with toothed rack, buffer springs on the arms
  const N = 14, pt = (r, a) => [cx + Math.cos(a) * r, Math.sin(a) * r];
  for (const a of [-A, 0, A]) { const p = pt(0.3, a), q = pt(Rq - 0.1, a); b.bar(S, [p[0], yq, p[1]], [q[0], yq, q[1]], 0.22, 0.16); }
  for (let i = 0; i < N; i++) {
    const a0 = -A + (2 * A * i) / N, a1 = -A + (2 * A * (i + 1)) / N, am = (a0 + a1) / 2;
    const i0 = pt(Rq - 0.3, a0), i1 = pt(Rq - 0.3, a1), o0 = pt(Rq, a0), o1 = pt(Rq, a1);
    b.poly(S, [[i0[0], yq + 0.2, i0[1]], [o0[0], yq + 0.2, o0[1]], [o1[0], yq + 0.2, o1[1]], [i1[0], yq + 0.2, i1[1]]], [0, 1, 0]);
    b.poly(S, [[i0[0], yq - 0.02, i0[1]], [o0[0], yq - 0.02, o0[1]], [o1[0], yq - 0.02, o1[1]], [i1[0], yq - 0.02, i1[1]]], [0, -1, 0]);
    b.poly(S, [[o0[0], yq - 0.02, o0[1]], [o1[0], yq - 0.02, o1[1]], [o1[0], yq + 0.2, o1[1]], [o0[0], yq + 0.2, o0[1]]], [Math.cos(am), 0, Math.sin(am)]);
    b.poly(S, [[i0[0], yq - 0.02, i0[1]], [i1[0], yq - 0.02, i1[1]], [i1[0], yq + 0.2, i1[1]], [i0[0], yq + 0.2, i0[1]]], [-Math.cos(am), 0, -Math.sin(am)]);
    for (const f of [0.25, 0.75]) { const ta = a0 + (a1 - a0) * f, t = pt(Rq + 0.04, ta); b.box(I, t[0] - 0.035, yq, t[1] - 0.035, t[0] + 0.035, yq + 0.18, t[1] + 0.035, 'xXzZY'); }
  }
  for (const a of [-A / 2, A / 2]) for (let k = 0; k < 9; k++) { const p = pt(1.1 + k * 0.08, a); b.prism(mats.copper, [p[0], yq + 0.16, p[1] - 0.1], [p[0], yq + 0.16, p[1] + 0.1], 0.06, 8); }
  w.addCollider(cx - 0.5, Y, -Rq * Math.sin(A), cx + Rq + 0.1, Y + 1.0, Rq * Math.sin(A));
  // two steering engines (one in service, one stand-by) driving the rack through pinions
  const ex = cx + Rq + 0.95;
  for (const s of [-1, 1]) {
    plan.prop(bcSteerEngine(), ex, s * 2.75, s > 0 ? NX : PX, { collide: true });
    pipe(plan.zone(ex), 'copper', [[ex + 0.4, Y + 1.2, s * 3.3], [ex + 0.4, Y + h - 0.15, s * 3.3], [R.x1 - 0.2, Y + h - 0.15, s * 3.3]], 0.045);
    plan.prop(gauge(), R.x1 - 0.06, s * 3.6, NX, { y: Y + 1.6 });
  }
  b.bar(I, [cx + Rq + 0.16, yq + 0.02, -2.0], [cx + Rq + 0.16, yq + 0.02, 2.0], 0.1, 0.1);
  w.addCollider(cx + Rq, Y, -1.8, cx + Rq + 0.32, Y + 1.0, 1.8);
  // telemotor receiver, hydraulic tank, switchboard, workbench, spare tiller on brackets, spare gear
  plan.prop(bcTelemotor(), R.x1 - 0.45, -1.4, NX, { collide: true });
  pipe(plan.zone(R.x1), 'copper', [[R.x1 - 0.65, Y + 1.28, -1.3], [R.x1 - 0.65, Y + h, -1.3]], 0.025); // from the receiver's pipe up into the deck head
  plan.prop(switchboard({ w: 1.6 }), R.x1 - 0.25, -4.6, NX, { collide: true });
  plan.prop(workbench({ w: 1.6 }), R.x1 - 0.45, 5.1, NX, { collide: true });
  plan.prop(tankH({ r: 0.4, l: 1.6 }), cx + 0.6, -4.0, NZ, { collide: true });
  plan.prop(chest(), cx + 0.6, 4.1, PZ, { collide: true });
  plan.prop(gauge(), R.x1 - 0.06, -0.2, NX, { y: Y + 1.7 });
  const tz = 6.3, tx0 = R.x1 - 4.6, tx1 = R.x1 - 1.4;
  b.box(S, tx0, Y + 1.9, tz - 0.08, tx1, Y + 2.06, tz + 0.08);
  b.box(S, tx0 - 0.3, Y + 1.85, tz - 0.16, tx0, Y + 2.11, tz + 0.16);
  for (const x of [tx0 + 0.4, tx1 - 0.4]) b.box(I, x - 0.04, Y + 1.7, tz - 0.04, x + 0.04, Y + 1.9, tz + 0.25);
}

// ---------------------------------------------------------------- windlass machinery (under the forecastle)

export function windlassRoom(plan, R) {
  const Y = plan.y, h = plan.h, b = plan.batch, w = plan.world;
  const ex = R.x0 + 3.0;
  for (const s of [-1, 1]) {
    plan.prop(bcSteerEngine(), ex, s * 2.0, s > 0 ? NX : PX, { collide: true });
    plan.prop(column({ h, r: 0.11, mat: 'steelDark' }), ex + 1.25, s * 2.0, 0, { collide: true });
    b.box(mats.iron, ex + 0.95, Y, s * 2.0 - 0.3, ex + 1.55, Y + 0.55, s * 2.0 + 0.3);
    plan.prop(column({ h, r: 0.24, mat: 'steelDark' }), R.x0 + 6.2, s * 1.35, 0, { collide: true });
    b.box(mats.rust, R.x0 + 5.85, Y, s * 1.35 - 0.35, R.x0 + 6.55, Y + 0.08, s * 1.35 + 0.35);
    pipe(plan.zone(ex), 'copper', [[R.x0 + 0.03, Y + h - 0.2, s * 2.9], [ex, Y + h - 0.2, s * 2.9], [ex, Y + 1.45, s * 2.9]], 0.05);
    for (const x of [R.x0 + 0.8, (R.x0 + ex) / 2 + 0.4]) plan.batch.box(mats.iron, x - 0.02, Y + h - 0.2, s * 2.9 - 0.02, x + 0.02, Y + h, s * 2.9 + 0.02, 'xXzZ'); // pipe hangers
    pipe(plan.zone(ex), 'steelDark', [[ex - 0.3, Y + 0.3, s * 3.1], [R.x0 + 0.03, Y + 0.3, s * 3.1]], 0.07);
    plan.prop(gauge(), R.x0 + 0.06, s * 1.4, PX, { y: Y + 1.65 });
  }
  w.addCollider(ex + 0.95, Y, -2.3, ex + 1.55, Y + 0.55, -1.7); w.addCollider(ex + 0.95, Y, 1.7, ex + 1.55, Y + 0.55, 2.3);
}

/** crew galley under the forecastle: the kit's galley, a work table with a utensil rail, a bill of fare */
export function crewGalley(ctx) {
  ctx.opts = { ranges: 1 };
  PRESETS.galley(ctx);
  const fl = fineLv(); if (fl < 0) return;
  if (ctx.fit(workTable({ w: 1.4, v: 4 }), ['left:mid', 'right:mid', 'near:hi', 'far:hi']) && fl >= 1) ctx.mount(utensilRail({ w: 1.4 }), ctx.last.wall, ctx.last.pos, 1.3);
  hangFree(ctx, cgMenuBoard(), ['near', 'left', 'right'], 1.55);
  if (fl >= 1) ctx.fit(cgMopBucket(), ['near:lo', 'left:lo', 'right:lo'], { collide: false });
}

/** ship's surgeon: treatment table with jug, basin and medicine bottles, instrument stand */
export function surgeryExtras(ctx) {
  const fl = fineLv(); if (fl < 0) return;
  if (fl >= 1) ctx.fit(instrumentStand(), ['far:lo', 'right:lo', 'left:lo'], { collide: false });
}
export function carpenter(ctx) {
  ctx.fit(workbench({ w: Math.min(1.8, ctx.W - 1.4) }), ['far:mid', 'right:hi', 'left:hi']);
  PRESETS.store(ctx);
}

/** crew mess: mess tables with benches, lockers, coat hooks, notices, clock */
export function crewMess(ctx) {
  ctx.opts = { set: true };
  const fl = fineLv();
  if (fl < 0) PRESETS.mess(ctx);
  else { // the kit's mess layout, with teapot, bread, jam and cruets laid out on every table
    const n = ctx.grid(2.2, 3.0, (u, v) => { if (ctx.put(messTable({ w: 2.4, set: true }), u, v, 'right')) ctx.attach(cgMessCentre(), 0, 0, { y: 0.765 }); }, 0.5);
    if (!n) ctx.grid(3.0, 2.2, (u, v) => ctx.put(messTable({ w: 2.4 }), u, v, 'in'), 0.3);
    ctx.fit(locker({ n: 3 }), ['far:hi', 'near:hi']);
    if (fl >= 1) { hangFree(ctx, cgMenuBoard(), ['near', 'far', 'left', 'right'], 1.55); ctx.fit(cgMopBucket(), ['near:lo', 'far:lo'], { collide: false }); }
  }
  ctx.mount(coatHooks({ n: 4, v: 1 }), 'near', ctx.W * 0.75, 1.7);
  ctx.mount(notice(), 'far', ctx.W * 0.3, 1.6);
  ctx.mount(clockWall(), 'far', ctx.W * 0.6, 2.05);
  ctx.fit(shelves({ kind: 'crockery', w: 1.2, mat: 'pine' }), ['left:hi', 'right:hi', 'near:hi']);
}
void valve; void machineBlock; void desk; void sofa;
