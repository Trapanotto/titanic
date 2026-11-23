// B deck ("Bridge Deck") – hand-detailed hero rooms and custom geometry. Used by b.js.
// À la carte restaurant + reception rooms (Louis XVI, walnut and gilt), Café Parisien (trellis and ivy), the two Parlour
// Suites (sitting rooms, period bedrooms, marble baths, Tudor private promenades), second-class smoking room.
import { mats } from '../core/materials.js';
import { STAIRS } from '../core/constants.js';
import {
  addStyle, kitMats, matOf, imperialPlan, faceDir,
  armchair, backBar, barCounter, barrel, bathtub, bedFirst, bench, bookcase, chairDining, clockWall, column, dressingTable, fireplace,
  heater, liftCage, locker, mirrorWall, picture, piano, pilaster, pottedPalm, sconce, settee, shelves, sofa, stool, tableRect,
  tableRound, towels, trellis, wardrobe, wc, writingDesk, carafe, bookPile, newspaper, PRESETS, trunk,
} from '../interior/kit.js';
import { BM, Deco, roomFaces, sideWindows as sideWin, BWIN } from './bc-util.js';
import {
  bcBasket, bcBayTree, bcBuffet, bcCardTable, bcCello, bcChairLXVI, bcCurtains, bcGarland, bcIvy, bcLounger, bcMusicStand,
  bcPinkLamp, bcSleighBed, bcSpittoon, bcVanity, bcWreath,
  bcUrn, bcScuttle, bcVase, bcMenu, bcCooler, bcCoffee, bcFernStand, bcNewsRack, bcSmokerSet,
} from './bc-props.js';
import { TIER } from '../core/tier.js';
import { festoon, modillion, ornRun } from './boat-util.js';

/** fine-detail gate (docs/CONTRACT.md "Detail levels") */
const fine = (n) => TIER.fine >= n;

// rotations: prop front facing +x / -x / +z / -z
export const PX = 0, NX = Math.PI, PZ = -Math.PI / 2, NZ = Math.PI / 2;
export const sideWindows = sideWin;

// ---------------------------------------------------------------- styles. Hand-detailed rooms model their own mouldings,
// so these styles only give the flat wall colour behind the panelling, the doors and the lamps.
addStyle('ritz', { wall: BM().walnut, door: 'oak', frame: BM().walnut, lamp: 'cut' });
addStyle('tudor', { wall: 'paintCream', door: 'oak', frame: 'woodDark', lamp: 'bowl' });
addStyle('lxvi', { wall: 'paintWhite', door: 'white', frame: 'paintWhite', lamp: 'chandelier' });
addStyle('adam', { wall: 'paintCream', door: 'white', frame: 'paintWhite', lamp: 'chandelier' });
addStyle('cafe', { wall: 'paintCream', door: 'white', frame: 'paintWhite', lamp: 'bowl' });
addStyle('empireB', { wall: 'damaskGreen', door: 'mahogany', frame: 'mahogany', lamp: 'bowl' });
addStyle('qanneB', { wall: BM().walnut, door: 'oak', frame: BM().walnut, lamp: 'bowl' });
addStyle('lxvB', { wall: 'damaskBlue', door: 'white', frame: 'paintWhite', lamp: 'bowl' });
addStyle('renB', { wall: 'woodDark', door: 'oak', frame: 'woodDark', lamp: 'bowl' });
addStyle('marbleB', { wall: 'marble', door: 'mahogany', frame: 'mahogany', lamp: 'bowl' });
addStyle('oakLXVI', { wall: 'oak', door: 'oak', frame: 'oak', lamp: 'bowl' });

/**
 * Modillion cornice under the Deco cornice of face `face`, left out at the pilasters (pil), at full-height holes and at the
 * extra skip intervals; instanced. mat = bracket wood, leaf = carved leaf material (level 3).
 */
function modDeco(d, face, pil = [], o = {}) {
  if (!face || face.e - face.a < 0.6) return;
  const skip = [...pil.map((q) => [q - 0.25, q + 0.25]), ...face.holes.filter((h) => !h.p && (h.y1 ?? 0) > d.H - 0.35).map((h) => [h.s - 0.05, h.e + 0.05]), ...(o.skip ?? [])];
  ornRun(face.F, face.a + 0.12, face.e - 0.12, 0.3, () => modillion({ mat: o.mat ?? 'oak', leaf: TIER.fine >= 3 ? o.leaf : undefined }), (pr, x, z, r, y) => d.inst.add(pr, x, y, z, r), d.Y + d.H - 0.17, 0, skip);
}
/** carved festoon on the frieze above a tall panel (panelRun orn), skipped near (x, z) points listed in `avoid` */
function festDeco(d, mat, avoid = []) {
  return (F, a, pw) => {
    if (pw < 0.4) return;
    const [x, z] = d.xz(F, a, 0.012);
    if (avoid.some(([ax, az]) => Math.hypot(x - ax, z - az) < 1.0)) return;
    d.inst.add(festoon({ w: Math.round(Math.min(0.55, pw - 0.12) * 20) / 20, mat, drop: 0.06 }), x, d.Y + d.H - 0.21, z, d.rot(F));
  };
}
/** |z| of the inner face of the exterior side wall at x */
const wallFace = (plan, x) => plan.halfWidth(x) + 0.05;
const wallLight = (plan, x, z, rot, plain = false) => plan.prop(sconce(plain ? { plain: true } : {}), x, z, rot, { y: plan.y + 1.85 });
const winHoles = (wins) => wins.map((c) => ({ s: c - 0.68, e: c + 0.68, y0: 0.85, y1: 2.4 }));

/** round table with chairs around it (world coordinates) */
function tableGroup(plan, x, z, o = {}) {
  const r = o.r ?? 0.45, d = o.d ?? r + 0.5, n = o.n ?? 4;
  plan.prop(o.table ?? tableRound({ r, mat: o.mat ?? 'mahogany', cloth: o.cloth, set: o.set }), x, z, 0, { collide: true });
  const seats = o.seats ?? Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2 + (o.phase ?? 0); return [Math.cos(a), Math.sin(a)]; });
  for (const [dx, dz] of seats) plan.prop(o.chair ? o.chair() : armchair({ kind: 'uph', mat: o.cover ?? 'fabricGreen' }), x + dx * d, z + dz * d, Math.atan2(dz, -dx), { collide: false });
}

/** pier positions for pilasters along a face: every ~pitch, at least 0.3 m clear of every full-height hole */
function piers(face, pitch = 2.6, extra = []) {
  const out = [], L = face.e - face.a, n = Math.max(1, Math.round(L / pitch));
  for (let i = 0; i <= n; i++) {
    const a = face.a + 0.22 + ((L - 0.44) * i) / n;
    if ([...face.holes, ...extra].some((h) => (h.y0 ?? 0) < 1.5 && a > h.s - 0.32 && a < h.e + 0.32)) continue;
    out.push(a);
  }
  return out;
}
/** panelled walls of a room: every face of f with options o (per-side overrides in o.side[name]); pilasters at piers */
function panelRoom(d, f, o, sides = ['fwd', 'aft', 'port', 'stbd']) {
  const res = {};
  for (const s of sides) {
    const face = f[s], so = { ...o, ...(o.side?.[s] ?? {}) };
    if (!face || face.e - face.a < 0.3) continue;
    const pil = so.pilasters === false ? [] : (so.pil ?? piers(face, so.pilPitch ?? 2.6));
    const holes = [...face.holes, ...pil.map((a) => ({ s: a - 0.2, e: a + 0.2, p: true }))];
    d.panelRun(face.F, face.a, face.e, holes, so);
    if (pil.length && so.pilMat) d.pilasters(face.F, pil, { mat: so.pilMat, capital: so.capital ?? 'gold', w: 0.28 });
    res[s] = pil;
  }
  return res;
}

// ================================================================ hatch (bar), forward staircase hall, vestibules

/**
 * Fills a gap in a fore-aft wall (z = const, xa..xb) with a parapet, head and either glazing or nothing (serving hatch).
 * neg / pos = wall styles' materials on the -z / +z face; shelf = counter overhang on both sides.
 */
export function hatch(plan, xa, xb, z, o = {}) {
  const { sill = 1.0, head = 2.05, neg = 'whitePanel', pos = 'whitePanel', frame = 'oak', shelf = 0.12 } = o;
  const b = plan.batch, Y = plan.y, top = Y + plan.h, T = 0.05, F = matOf(frame);
  plan.opening(xa, z, xb, z);
  const a = xa + 0.05, c = xb - 0.05;
  for (const [y0, y1] of [[Y, Y + sill], [Y + head, top]]) { b.wallX(matOf(neg), z - T, a, c, y0, y1, -1); b.wallX(matOf(pos), z + T, a, c, y0, y1, 1); }
  b.box(F, xa, Y, z - 0.07, xa + 0.08, top, z + 0.07, 'xXzZ'); b.box(F, xb - 0.08, Y, z - 0.07, xb, top, z + 0.07, 'xXzZ');
  b.box(F, a, Y + sill - 0.05, z - 0.08 - shelf, c, Y + sill, z + 0.08 + shelf);
  b.box(F, a, Y + head, z - 0.075, c, Y + head + 0.06, z + 0.075);
  plan.world.addCollider(xa, Y, z - T - shelf, xb, Y + sill, z + T + shelf);
}

export function grandLobby(plan, L) {
  const Y = plan.y, top = Y + plan.h, b = plan.batch, w = plan.world;
  const FX = 45.55; // face of the lift shaft front (shafts x 45.5..47.5 + back to the lobby wall at 48)
  for (const z of [-1.6, 0, 1.6]) {
    plan.prop(liftCage(), 46.45, z, NX);
    b.wallZ(kitMats.ironwork, FX - 0.012, z - 0.68, z + 0.68, Y + 0.03, Y + 2.24, -1);
    b.box(mats.brass, FX - 0.035, Y + 2.24, z - 0.7, FX, Y + 2.29, z + 0.7);
    b.box(mats.brass, FX - 0.035, Y, z - 0.7, FX, Y + 0.03, z + 0.7);
    b.disc(mats.brass, [FX - 0.09, Y + 2.46, z], [-1, 0, 0], 0.17, 12);
    b.disc(kitMats.clockFace, [FX - 0.095, Y + 2.46, z], [-1, 0, 0], 0.12, 12);
  }
  for (const z of [-2.4, -0.8, 0.8, 2.4]) {
    b.box(mats.oak, FX - 0.08, Y, z - 0.08, FX, top, z + 0.08, 'xzZ');
    b.box(mats.gold, FX - 0.1, Y + 2.1, z - 0.1, FX, Y + 2.22, z + 0.1, 'xzZY');
    b.box(mats.oak, FX - 0.1, Y, z - 0.1, FX, Y + 0.16, z + 0.1, 'xzZY');
  }
  b.box(mats.oak, FX - 0.07, Y + 2.29, -2.48, FX, top, 2.48, 'xyzZ');
  b.box(mats.gold, FX - 0.08, Y + 2.29, -2.48, FX - 0.07, Y + 2.33, 2.48, 'xyY');
  for (const s of [-1, 1]) b.box(mats.oakPanel, FX, Y, s * 2.44, 47.95, top, s * 2.5, s < 0 ? 'z' : 'Z');
  w.addCollider(FX - 0.02, Y, -2.52, 48, top, 2.52);
  const sp = imperialPlan(STAIRS.find((q) => q.id === 'grandFwd'));
  for (const x of [sp.x0 + 0.7, sp.xf + 0.45]) for (const s of [-1, 1]) plan.prop(column({ h: plan.h, r: 0.16, mat: 'oak', capital: 'gold' }), x, s * (sp.hw + 0.6), 0, { collide: true });
  for (const s of [-1, 1]) {
    tableGroup(plan, 40.6, s * 4.45, { r: 0.4, mat: 'oak', cover: s < 0 ? 'fabricGreen' : 'fabricRed', seats: [[-1, 0], [1, 0], [0, s]] });
    tableGroup(plan, 43.3, s * 4.45, { r: 0.4, mat: 'oak', cover: s < 0 ? 'fabricGreen' : 'fabricRed', seats: [[-1, 0], [0, s]] });
    if (fine(1)) plan.prop(bcVase({ v: s > 0 ? 0 : 1 }), 40.6, s * 4.45, 0, { y: Y + 0.75, collide: false });
    if (fine(2)) plan.prop(newspaper(), 43.3, s * 4.45, 0.5 * s, { y: Y + 0.75, collide: false });
    for (const z of [3.4, 6.0]) plan.prop(pilaster({ h: plan.h, mat: 'oak', capital: 'gold' }), L.x0 + 0.09, s * z, PX);
    wallLight(plan, L.x0 + 0.06, s * 4.7, PX);
    plan.prop(pottedPalm(), 47.3, s * 3.2, 0, { collide: false });
    wallLight(plan, L.x1 - 0.06, s * 4.6, NX);
  }
}

/** entrance vestibule beside the forward staircase, s = +1 starboard / -1 port. Gangway door in the ship's side. */
export function vestibule(plan, R, s) {
  const Y = plan.y, b = plan.batch, xd0 = 41.8, xd1 = 42.95, zf = s * wallFace(plan, 42.4);
  const zin = zf - s * 0.055, zout = zf - s * 0.005;
  b.box(mats.mahogany, xd0 - 0.08, Y, zin - s * 0.02, xd0, Y + 2.25, zout, 'xXyY' + (s > 0 ? 'z' : 'Z'));
  b.box(mats.mahogany, xd1, Y, zin - s * 0.02, xd1 + 0.08, Y + 2.25, zout, 'xXyY' + (s > 0 ? 'z' : 'Z'));
  b.box(mats.mahogany, xd0, Y + 2.15, zin - s * 0.02, xd1, Y + 2.25, zout, 'xXyY' + (s > 0 ? 'z' : 'Z'));
  const xm = (xd0 + xd1) / 2;
  for (const [a, c] of [[xd0, xm - 0.005], [xm + 0.005, xd1]]) {
    b.box(mats.oak, a, Y, zin, c, Y + 2.15, zout, s > 0 ? 'xXzY' : 'xXZY');
    for (const [y0, y1] of [[0.18, 0.95], [1.1, 1.95]]) b.box(mats.mahogany, a + 0.07, Y + y0, zin - s * 0.012, c - 0.07, Y + y1, zin, s > 0 ? 'xXyYz' : 'xXyYZ');
  }
  for (const x of [xm - 0.06, xm + 0.06]) b.box(mats.brass, x - 0.015, Y + 1.0, zin - s * 0.06, x + 0.015, Y + 1.2, zin, 'xXyYzZ');
  b.box(mats.brass, xd0 + 0.05, Y + 2.0, zin - s * 0.03, xd1 - 0.05, Y + 2.08, zin, 'xXyYzZ');
  plan.world.addCollider(xd0 - 0.08, Y, zin - s * 0.08, xd1 + 0.08, Y + 2.25, zout);
  plan.prop(settee({ mat: s > 0 ? 'fabricRed' : 'fabricGreen' }), R.x0 + 0.36, s * 10.9, PX, { collide: true });
  tableGroup(plan, R.x1 - 1.1, s * 10.9, { r: 0.4, mat: 'oak', cover: s > 0 ? 'fabricRed' : 'fabricGreen', seats: [[0, -1], [0, 1]] });
  plan.prop(pottedPalm(), R.x0 + 0.6, s * 13.2, 0, { collide: false });
  plan.prop(pottedPalm(), R.x1 - 0.6, s * 13.2, 0, { collide: false });
  wallLight(plan, R.x0 + 0.06, s * 9.0, PX); wallLight(plan, R.x1 - 0.06, s * 9.0, NX); wallLight(plan, R.x1 - 0.06, s * 12.8, NX);
  plan.prop(mirrorWall({ w: 0.9, h: 1.2 }), R.x0 + 0.06, s * 12.6, PX, { y: Y + 1.75 });
}

// ================================================================ Louis XVI treatment (restaurant + reception rooms)

/** walnut panelling with gilt bolections, wreaths, mirrors on the inboard wall, plaster cornice; returns pier positions */
function ritzWalls(d, f, o = {}) {
  const B = BM(), wreath = bcWreath();
  const fest = fine(2) ? festDeco(d, 'gold') : null;
  const orn = (F, a, pw, yTop) => { if (pw < 0.45) return; const [x, z] = d.xz(F, a, 0.016); d.inst.add(wreath, x, d.Y + yTop - 0.2, z, d.rot(F)); fest?.(F, a, pw, yTop); };
  return panelRoom(d, f, {
    wood: B.walnut, rail: B.walnut, gilt: 'gold', frieze: B.walnut, cornice: 'plaster', pitch: 0.82, orn, pilMat: 'bc_walnut', capital: 'gold', ...o,
  }, o.sides);
}
/** window architraves + silk curtains on the hull face */
function curtainWindows(d, face, wins, o = {}) {
  for (const c of wins) {
    d.windowFrame(face.F, c - BWIN.w / 2, c + BWIN.w / 2, BWIN.sill, BWIN.head, o.frame ?? 'gold', o.sill ?? BM().walnut);
    const [x, z] = d.xz(face.F, c, 0.0);
    d.plan.prop(bcCurtains({ w: BWIN.w, h: 2.4, mat: o.mat, frame: o.pelmet }), x, z, d.rot(face.F), { y: d.Y, collide: false });
  }
}

// ================================================================ à la carte restaurant ("The Ritz")

export function restaurant(ctx, R) {
  const plan = ctx.plan, d = new Deco(plan), B = BM(), Y = plan.y;
  const wins = sideWindows(R.x0, R.x1);
  const f = roomFaces(ctx, { port: winHoles(wins), fwd: [{ s: -2.35, e: 0.55, y0: 0.9, y1: 2.2, p: true }] });
  const pl = ritzWalls(d, f, { side: { stbd: { mirror: [3, 1] }, aft: { mirror: [4, 2] }, port: { pil: [wins[0] - 1.375, ...wins.slice(1).map((c, i) => (c + wins[i]) / 2), wins.at(-1) + 1.375].filter((a) => a > f.x0 + 0.3 && a < f.x1 - 0.3) } } });
  curtainWindows(d, f.port, wins);
  if (fine(1)) for (const sd of ['fwd', 'aft', 'port', 'stbd']) modDeco(d, f[sd], pl[sd] ?? [], { mat: 'bc_walnut', leaf: 'gold', skip: sd === 'port' ? wins.map((c) => [c - 1.25, c + 1.25]) : [] });
  // gilt sconces on the piers of the inboard and end walls
  let k = 0;
  for (const s of ['stbd', 'aft', 'fwd']) for (const a of pl[s] ?? []) { if (a - f[s].a < 0.45 || f[s].e - a < 0.45) continue; d.mount(sconce(), f[s].F, a, 1.78, 0.058); /* on the pilaster face, not on corner piers */ if (k++ % 2 === 0) { const [x, z] = d.xz(f[s].F, a, 0.35); d.lamp(x, 1.8, z, 0xffd9a8, 0.35); } }

  // moulded ceiling: beams on the column lines, gilt-beaded panels, flower-basket medallions, cut-glass fixtures
  const xs = [-20.4, -17.1], zs = [-8.0, -3.9, 0.3, 4.6], top = plan.y + plan.h;
  const basket = bcBasket();
  d.coffers(f.x0, f.x1, f.z0, f.z1, xs, zs, { w: 0.34, depth: 0.12, mat: 'plaster', bead: 'gold', cb: (cx, cz, w, dd) => {
    plan.lamp(cx, cz, 'cut');
    const alongZ = dd > w, L = Math.max(w, dd);
    for (const s of [-1, 1]) d.inst.add(basket, cx + (alongZ ? 0 : s * L * 0.27), top, cz + (alongZ ? s * L * 0.27 : 0), alongZ ? Math.PI / 2 : 0);
  } });
  // fluted walnut columns with gilt capitals and garlands
  const garland = bcGarland({ r: 0.17 });
  for (const x of xs) for (const z of zs) {
    plan.prop(column({ h: plan.h - 0.12, r: 0.17, mat: 'bc_walnut', capital: 'gold' }), x, z, 0, { collide: true });
    d.inst.add(garland, x, Y + plan.h - 0.12 - 0.42, z, 0);
  }

  // tables for 2 – 8 with cloths, silver, glass and pink-shaded crystal lamps; gilt Louis XVI chairs (instanced)
  const chair = bcChairLXVI({}), lamp = bcPinkLamp();
  const T2 = tableRect({ w: 0.75, d: 0.75, cloth: true, set: true }), T4 = tableRound({ r: 0.5, cloth: true, set: 4 });
  const T6 = tableRect({ w: 1.86, d: 0.9, cloth: true, set: true }), T8 = tableRound({ r: 0.8, cloth: true, set: 8 });
  let lit = 0;
  const menu = fine(1) ? bcMenu() : null, cooler = fine(2) ? bcCooler() : null;
  const table = (t, x, z, seats, lampAt = [0.12, 0.12], menuAt = [0, -0.16], coolAt = null) => {
    d.ip(t, x, z, 0); d.fpCollider(t.userData.fp, x, z, 0, 0.78);
    for (const [dx, dz] of seats) d.ip(chair, x + dx, z + dz, faceDir(-dx, -dz));
    d.ip(lamp, x + lampAt[0], z + lampAt[1], 0, 0.756);
    if (menu && menuAt) d.ip(menu, x + menuAt[0], z + menuAt[1], Math.PI / 2, 0.756);
    if (cooler && coolAt) d.ip(cooler, x + coolAt[0], z + coolAt[1], 0.4, 0.756);
    if (lit++ % 3 === 0) d.lamp(x, 1.1, z, 0xffb4a4, 0.3);
  };
  const diag = (r) => [[r, r], [-r, r], [r, -r], [-r, -r]].map(([a, b]) => [a * 0.7071, b * 0.7071]);
  for (const c of wins) table(T2, c, f.z0 + 0.82, [[-0.6, 0], [0.6, 0]], [0, -0.2], [0, 0.22]);
  for (const [x, z] of [[-22.2, -10.6], [-15.3, -10.6], [-22.2, -6.0], [-18.75, -6.0], [-15.3, -6.0], [-22.2, 2.6], [-15.3, 2.6], [-21.9, 7.3]]) table(T4, x, z, diag(1.0));
  table(T6, -18.75, -10.3, [-0.62, 0, 0.62].flatMap((z) => [[-0.82, z], [0.82, z]]), [0, 0.32], [0, -0.62], [0, 0.62]);
  for (const z of [-1.8, 2.45]) table(T8, -18.75, z, Array.from({ length: 8 }, (_, i) => { const a = ((i + 0.5) / 8) * Math.PI * 2; return [Math.cos(a) * 1.04, Math.sin(a) * 1.04]; }), [0.22, 0], [0, -0.24], [-0.26, 0.05]);

  // the raised bandstand on the aft wall (between the doors to the galley and the pantry)
  const bx0 = f.x0, bx1 = f.x0 + 1.6, bz0 = -3.8, bz1 = 0.8, ph = 0.22, b = d.b;
  b.box(B.walnut, bx0, Y, bz0, bx1, Y + ph, bz1, 'XYzZ');
  b.box(mats.gold, bx1, Y + ph - 0.05, bz0, bx1 + 0.012, Y + ph - 0.025, bz1, 'XyYzZ');
  b.box(matOf('carpetRed'), bx0, Y + ph, bz0, bx1 - 0.04, Y + ph + 0.006, bz1, 'Y');
  for (let z = bz0 + 0.05; z <= bz1 - 0.04; z += 0.46) b.box(mats.brass, bx1 - 0.06, Y + ph, z - 0.015, bx1 - 0.03, Y + ph + 0.72, z + 0.015, 'xXzZ');
  b.prism(mats.brass, [bx1 - 0.045, Y + ph + 0.74, bz0 + 0.03], [bx1 - 0.045, Y + ph + 0.74, bz1 - 0.03], 0.022, 8, true);
  for (const z of [bz0 + 0.03, bz1 - 0.03]) b.prism(mats.brass, [bx0 + 0.05, Y + ph + 0.74, z], [bx1 - 0.045, Y + ph + 0.74, z], 0.02, 8, true);
  d.collider(bx0, bz0, bx1, bz1, 1.0);
  const yp = ph;
  plan.prop(piano(), bx0 + 0.36, -2.85, PX, { y: Y + yp });
  plan.prop(stool({ mat: 'bc_walnut' }), bx0 + 0.95, -2.75, PX, { y: Y + yp });
  for (const z of [-1.55, -0.35]) { plan.prop(bcChairLXVI({}), bx0 + 0.55, z, PX, { y: Y + yp }); plan.prop(bcMusicStand(), bx0 + 1.15, z + 0.05, NX, { y: Y + yp }); }
  plan.prop(bcCello(), bx0 + 0.28, 0.45, PX, { y: Y + yp });
  d.lamp(bx1 + 0.3, 1.9, -1.5, 0xffd9a0, 0.4);

  // the buffet: marble-topped walnut sideboard with fruit and silver under a gilt mirror
  const bw = 2.6;
  plan.prop(bcBuffet({ w: bw, mat: 'bc_walnut' }), f.x1 - 0.31, -0.9, NX, { collide: true });
  plan.prop(mirrorWall({ w: 1.9, h: 1.0 }), f.x1 - 0.005, -0.9, NX, { y: Y + 1.72 });
  plan.prop(pottedPalm(), f.x1 - 0.5, 1.15 + 0.4, 0, { collide: false });
  plan.prop(pottedPalm(), f.x0 + 0.5, -4.6, 0, { collide: false });
  plan.prop(clockWall(), f.x0 + 0.01, 1.9, PX, { y: Y + 2.0 });
  d.flush();
}

// ================================================================ restaurant reception rooms (either side of funnel casing 4)

export function reception(ctx, R, s) {
  const plan = ctx.plan, d = new Deco(plan), Y = plan.y, B = BM(), cover = s < 0 ? 'fabricGold' : 'bc_pinkSilk';
  const wins = sideWindows(R.x0, R.x1);
  const open = s < 0 ? { s: -7.85, e: -2.9, y0: 0, y1: 3 } : { s: 2.9, e: 7.85, y0: 0, y1: 3 };
  const f = roomFaces(ctx, { [s < 0 ? 'port' : 'stbd']: winHoles(wins), fwd: [open] });
  const pl = ritzWalls(d, f, { side: { [s < 0 ? 'stbd' : 'port']: { mirror: [2, 1] } } });
  curtainWindows(d, s < 0 ? f.port : f.stbd, wins);
  if (fine(1)) for (const sd of ['fwd', 'aft', 'port', 'stbd']) modDeco(d, f[sd], pl[sd] ?? [], { mat: 'bc_walnut', leaf: 'gold', skip: sd === (s < 0 ? 'port' : 'stbd') ? wins.map((c) => [c - 1.25, c + 1.25]) : [] });
  // ceiling: one beam across, gilt-beaded panels, medallions round the fixtures
  const top = Y + plan.h;
  d.coffers(f.x0, f.x1, f.z0, f.z1, [-10.0], [], { w: 0.3, depth: 0.1, mat: 'plaster', bead: 'gold', cb: (cx, cz, w, dd) => { plan.lamp(cx, cz, 'cut'); for (const k of [-1, 1]) d.inst.add(bcBasket(), cx, top, cz + k * dd * 0.3, Math.PI / 2); } });
  // settees and bergère groups
  const zo = s * (wallFace(plan, R.x0) - 0.4);
  plan.prop(settee({ mat: cover, w: 1.85 }), -9.5, zo + s * 0.05, s > 0 ? NZ : PZ, { collide: true });
  tableGroup(plan, -9.5, s * 11.55, { r: 0.45, mat: 'bc_walnut', cover, seats: [[-1, 0], [1, 0], [0, -s]] });
  if (s < 0) { tableGroup(plan, -12.2, -4.35, { r: 0.4, mat: 'bc_walnut', cover, seats: [[1, 0], [0, -1]] }); plan.prop(settee({ mat: cover }), f.x0 + 0.36, -12.2, PX, { collide: true }); }
  else plan.prop(settee({ mat: cover }), R.x1 - 0.36, 10.85, NX, { collide: true });
  plan.prop(pottedPalm(), R.x1 - 0.55, s * 13.2, 0, { collide: false });
  plan.prop(pottedPalm(), R.x0 + 0.55, s * 13.4, 0, { collide: false });
  plan.prop(pottedPalm(), R.x1 - 0.55, s * 3.55, 0, { collide: false });
  for (const z of s < 0 ? [-11.0, -5.0] : [8.6, 13.0]) { wallLight(plan, f.x0 + 0.01, z, PX); d.lamp(f.x0 + 0.4, 1.8, z, 0xffd9a8, 0.3); }
  plan.prop(mirrorWall({ w: 1.0, h: 1.2 }), f.x1 - 0.005, s * 12.6, NX, { y: Y + 1.75 });
  d.flush();
}

// ================================================================ aft Grand Staircase lobby

export function aftLobby(plan, L) {
  const sp = imperialPlan(STAIRS.find((q) => q.id === 'grandAft'));
  for (const s of [-1, 1]) {
    tableGroup(plan, -4.1, s * 4.45, { r: 0.4, mat: 'oak', cover: s < 0 ? 'fabricGold' : 'fabricBlue', seats: [[-1, 0], [1, 0], [0, s]] });
    if (fine(1)) plan.prop(bcVase({ v: s > 0 ? 2 : 3 }), -4.1, s * 4.45, 0, { y: plan.y + 0.75, collide: false });
    plan.prop(pottedPalm(), 1.5, s * 3.1, 0, { collide: false });
    for (const z of [3.4]) plan.prop(pilaster({ h: plan.h, mat: 'oak', capital: 'gold' }), L.x1 - 0.09, s * z, NX);
    wallLight(plan, L.x0 + 0.06, s * 2.65, PX);
    plan.prop(column({ h: plan.h, r: 0.15, mat: 'oak', capital: 'gold' }), sp.xf + 0.45, s * (sp.hw + 0.55), 0, { collide: true });
  }
  plan.prop(clockWall(), L.x1 - 0.06, 0, NX, { y: plan.y + 2.1 });
}

// ================================================================ Café Parisien (starboard, x -36..-13.5)

export function cafe(ctx, R) {
  const plan = ctx.plan, d = new Deco(plan), Y = plan.y, top = Y + plan.h, W = mats.paintWhite;
  const wins = sideWindows(R.x0, R.x1);
  const f = roomFaces(ctx, { stbd: winHoles(wins) });
  // white boarded dado, trellis with ivy above it on every wall, white cornice
  panelRoom(d, f, { wood: W, rail: W, upper: false, topRail: false, cornice: W, corniceProf: undefined, pilasters: false, lowPitch: 0.9 });
  const trel = (face, holes) => {
    for (const [s, t] of d.segs(face.a, face.e, holes, 1.0, 2.3)) {
      const L = t - s - 0.1; if (L < 0.5) continue;
      const n = Math.ceil(L / 2.0), w = L / n;
      for (let i = 0; i < n; i++) { const [x, z] = d.xz(face.F, s + 0.05 + w * (i + 0.5), 0.035); plan.prop(trellis({ w: w - 0.04, h: 1.38 }), x, z, d.rot(face.F), { y: Y + 0.95, collide: false }); }
    }
  };
  for (const s of ['port', 'aft', 'fwd', 'stbd']) trel(f[s], f[s].holes);
  curtainWindows(d, f.stbd, wins, { mat: 'linen', frame: 'paintWhite', pelmet: 'paintWhite', sill: W });
  // trellised ceiling: white beams over the window piers, slats between, ivy along the beams
  const beams = [f.x0 + 0.06, ...wins.slice(0, -1).map((c, i) => (c + wins[i + 1]) / 2), f.x1 - 0.06].filter((x, i, a) => i === 0 || x - a[i - 1] > 0.8);
  const span = f.z1 - f.z0;
  for (const x of beams) { d.rib('z', x, f.z0, f.z1, 0.12, 0.12, W); d.inst.add(bcIvy({ len: Math.round((span - 0.4) * 10) / 10, v: Math.round(x) & 3 }), x, top - 0.12, (f.z0 + f.z1) / 2, 0); }
  for (let z = f.z0 + 0.55; z < f.z1 - 0.3; z += 0.6) d.rib('x', z, f.x0, f.x1, 0.045, 0.06, W);
  for (let x = f.x0 + 0.5; x < f.x1 - 0.3; x += 0.6) d.rib('z', x, f.z0, f.z1, 0.03, 0.04, W);
  // window row: round and square tables with white cloths, cane chairs facing each other
  const chair = armchair({ kind: 'wicker', mat: 'fabricGreen' }), zw = f.z1 - 0.95;
  const TR = tableRound({ r: 0.38, cloth: true, set: 2 }), TS = tableRect({ w: 0.72, d: 0.72, cloth: true, set: true });
  const cm = fine(1) ? bcMenu() : null;
  wins.forEach((c, i) => {
    const t = i % 2 ? TS : TR; d.ip(t, c, zw, 0); d.fpCollider(t.userData.fp, c, zw, 0, 0.78);
    if (cm) d.ip(cm, c + (i % 2 ? 0.0 : 0.16), zw + (i % 2 ? 0.2 : 0.0), 0, 0.756);
    d.ip(chair, c - 0.72, zw, PX); d.ip(chair, c + 0.72, zw, NX);
  });
  // inner row along the trellis
  [-34.2, -31.5, -29.3, -24.6, -22.0, -16.0].forEach((x, i) => {
    const t = i % 2 ? TR : TS; d.ip(t, x, 9.75, 0); d.fpCollider(t.userData.fp, x, 9.75, 0, 0.78);
    d.ip(chair, x - 0.72, 9.75, PX); d.ip(chair, x + 0.72, 9.75, NX); d.ip(chair, x, 10.47, NZ);
  });
  // sideboard buffet at the aft end, bay trees, palms
  plan.prop(bcBuffet({ w: 1.6, mat: 'paintWhite' }), f.x0 + 0.31, 9.35, PX, { collide: true });
  for (const [x, z] of [[f.x0 + 0.45, 13.4], [f.x1 - 0.45, 13.4], [-26.0, 13.45], [-20.5, 13.45]]) plan.prop(bcBayTree(), x, z, 0, { collide: false });
  for (const [x, z] of [[f.x1 - 0.55, 9.0], [-27.9, 9.0], [-19.9, 9.0]]) plan.prop(pottedPalm(), x, z, 0, { collide: false });
  if (fine(2)) for (const [x, v] of [[-26.6, 2], [-18.3, 4]]) plan.prop(bcFernStand({ mat: 'paintWhite', v }), x, 9.12, 0, { collide: false });
  d.flush();
}

// ================================================================ parlour suites

const SUITE_STYLE = {
  lxvi: { wood: mats.paintWhite, rail: mats.paintWhite, gilt: 'gold', cornice: 'paintWhite', frieze: mats.paintWhite, pilMat: 'paintWhite', pitch: 0.75 },
  adam: { wood: mats.paintCream, rail: mats.paintWhite, gilt: 'paintWhite', lowGilt: 'paintWhite', cornice: 'paintWhite', frieze: mats.paintWhite, pilMat: 'paintWhite', capital: 'paintWhite', pitch: 0.7 },
};

export function suiteSitting(ctx) {
  const o = ctx.room.fo ?? {}, cover = o.cover ?? 'fabricGold', mat = o.wood ?? 'mahogany';
  const fp = ctx.fit(fireplace({ mat: o.fire ?? 'marble' }), ['left:hi', 'right:hi', 'left:mid', 'right:mid', 'near:hi'], { gap: 0 });
  const fpAt = fp && ctx.last ? [ctx.last.x, ctx.last.z] : null;
  if (fp && fine(1)) { for (const s of [-1, 1]) ctx.attach(bcUrn(), -0.02, s * 0.62, { y: 1.295 }); }
  if (fp && fine(2)) ctx.attach(bcScuttle(), 0.2, -0.7, { y: 0.04 });
  ctx.fit(sofa({ mat: cover, w: 1.9 }), ['far:lo', 'far:hi', 'near:hi']);
  const u = ctx.W / 2 + 0.2, v = ctx.D / 2 + 0.1;
  if (ctx.put(tableRound({ r: 0.45, mat, lamp: true }), u, v, 'in')) {
    ctx.attach(bookPile({ v: 2 }), 0.2, -0.15, { y: 0.75, turn: 0.5 });
    ctx.put(armchair({ kind: 'uph', mat: cover }), u - 1.0, v, 'right', { collide: false });
    ctx.put(armchair({ kind: 'uph', mat: cover }), u + 1.0, v, 'left', { collide: false });
  }
  if (ctx.fit(writingDesk({ mat }), ['near:hi', 'right:lo', 'left:lo', 'far:hi'])) ctx.attach(chairDining({ cls: 'first', mat: 'woodDark', seat: cover }), 0.55, 0, { turn: Math.PI });
  ctx.fit(bookcase({ mat, w: 1.0 }), ['right:mid', 'left:mid', 'near:mid', 'far:mid']);
  ctx.fit(pottedPalm(), ['far:hi', 'far:lo', 'near:hi'], { collide: false });
  ctx.mount(sconce(), 'far', ctx.W * 0.2, 1.85); ctx.mount(sconce(), 'far', ctx.W * 0.8, 1.85);
  ctx.mount(sconce(), 'near', ctx.W * 0.75, 1.85);
  ctx.mount(picture({ w: 0.8, h: 0.6, v: 1 }), 'near', ctx.W * 0.45, 1.75);
  if (fp) ctx.glow(ctx.W / 2, ctx.D / 2, 0.5);
  // panelled walls, moulded ceiling with a gilt oval and rose
  const d = new Deco(ctx.plan), f = roomFaces(ctx), sty = SUITE_STYLE[o.sty ?? 'lxvi'];
  panelRoom(d, f, { ...sty, pilPitch: 2.0, orn: fine(2) ? festDeco(d, sty.gilt === 'gold' ? 'gold' : 'paintWhite', fpAt ? [fpAt] : []) : undefined });
  const c = ctx.at(ctx.W / 2, ctx.D / 2), r = { x0: f.x0, x1: f.x1, z0: f.z0, z1: f.z1 };
  d.beadRect(r.x0 + 0.3, r.x1 - 0.3, r.z0 + 0.3, r.z1 - 0.3, 'gold'); d.beadRect(r.x0 + 0.42, r.x1 - 0.42, r.z0 + 0.42, r.z1 - 0.42, 'plaster');
  d.rib('x', r.z0 + 0.15, r.x0, r.x1, 0.3, 0.05, 'plaster'); d.rib('x', r.z1 - 0.15, r.x0, r.x1, 0.3, 0.05, 'plaster');
  void c; d.flush();
}

/** bedrooms of the parlour suites, each in its own period style (room.fo.sty) */
const BED_STYLE = {
  empire: { panel: { wood: mats.mahogany, rail: mats.mahogany, lowGilt: 'gold', upper: false, cornice: 'gold', pilMat: 'mahogany', topRail: false }, bed: (c) => bcSleighBed({ cover: c }), mat: 'mahogany', wreaths: true },
  qanne: { panel: () => ({ wood: BM().walnut, rail: BM().walnut, cornice: BM().walnut, frieze: BM().walnut, pilasters: false, pitch: 0.7 }), bed: (c) => bedFirst({ style: 'mahogany', wide: true, cover: c }), mat: 'oak' },
  lxv: { panel: { wood: mats.paintWhite, rail: mats.paintWhite, gilt: 'gold', cornice: 'gold', pilasters: false, pitch: 0.65 }, bed: (c) => bedFirst({ canopy: true, wide: true, cover: c }), mat: 'mahogany' },
  renaiss: { panel: () => ({ wood: mats.woodDark, rail: mats.woodDark, gilt: 'gold', frieze: kitMats.damaskRed, cornice: mats.woodDark, pilMat: 'woodDark', pitch: 0.6 }), bed: (c) => bedFirst({ style: 'brass', wide: true, cover: c }), mat: 'oak' },
};
export function suiteBedroom(ctx) {
  const o = ctx.room.fo ?? {}, st = BED_STYLE[o.sty ?? 'lxv'], cover = o.cover ?? 'fabricBlue', mat = st.mat;
  if (ctx.fit(st.bed(cover), ['right:hi', 'left:hi', 'far:mid', 'far:hi']) && ctx.last.wall) ctx.mount(picture({ w: 0.7, h: 0.5, v: 2 }), ctx.last.wall, ctx.last.pos, 1.62);
  ctx.fit(wardrobe({ mirror: true, mat }), ['left:lo', 'near:hi', 'right:lo', 'far:lo']);
  if (ctx.fit(dressingTable({ mat }), ['far:mid', 'near:hi', 'left:mid', 'right:mid'])) ctx.attach(stool({ mat, seat: cover }), 0.45, 0, {});
  ctx.fit(armchair({ kind: 'uph', mat: cover }), ['far:lo', 'near:hi', 'left:mid', 'right:mid'], { collide: false });
  if (ctx.put(tableRound({ r: 0.35, mat }), ctx.W / 2, ctx.D / 2, 'in')) { ctx.attach(carafe(), 0.1, 0.08, { y: 0.75 }); ctx.attach(newspaper(), -0.08, -0.1, { y: 0.75, turn: 0.6 }); }
  ctx.fit(trunk({ big: true }), ['near:lo', 'right:mid', 'left:mid', 'far:hi'], { collide: false });
  ctx.fit(heater(), ['near:hi', 'left:lo', 'right:lo'], { collide: false });
  ctx.mount(sconce(), 'far', ctx.W * 0.25, 1.8); ctx.mount(sconce(), 'far', ctx.W * 0.75, 1.8);
  const d = new Deco(ctx.plan), f = roomFaces(ctx), pn = typeof st.panel === 'function' ? st.panel() : st.panel;
  const pil = panelRoom(d, f, { pilPitch: 1.8, ...pn });
  // wreaths on the pilaster faces (front at 0.058 off the wall); not on the corner piers, where two would collide
  if (st.wreaths) for (const side of ['fwd', 'aft', 'port', 'stbd']) for (const a of pil[side] ?? []) if (a - f[side].a > 0.45 && f[side].e - a > 0.45) d.mount(bcWreath(), f[side].F, a, 1.85, 0.056);
  d.beadRect(f.x0 + 0.35, f.x1 - 0.35, f.z0 + 0.35, f.z1 - 0.35, pn.gilt ?? pn.rail);
  d.flush();
}

/** marble bathroom of a parlour suite */
export function suiteBath(ctx) {
  ctx.fit(bathtub({ wood: true }), ['far:mid', 'right:hi', 'left:hi']);
  if (ctx.fit(bcVanity({ w: 1.3 }), ['right:mid', 'left:mid', 'near:hi'])) { /* towels on the rail */ }
  ctx.fit(wc({ cistern: true }), ['left:hi', 'right:hi', 'near:hi']);
  ctx.fit(towels({ n: 3 }), ['near:hi', 'left:mid'], { collide: false });
  ctx.fit(chairDining({ cls: 'plain', mat: 'mahogany' }), ['near:hi', 'right:lo', 'left:lo'], { collide: false });
  ctx.fit(heater(), ['left:lo', 'right:lo'], { collide: false });
  const d = new Deco(ctx.plan), f = roomFaces(ctx);
  panelRoom(d, f, { wood: mats.marble, rail: mats.mahogany, cornice: mats.paintWhite, pilasters: false, pitch: 0.6, dado: 1.1, frieze: mats.marble });
  d.flush();
}

/** private promenade of a parlour suite: Tudor half-timbering, wicker loungers, palms. doorXs = doors in the inboard wall. */
export function privatePromenade(ctx, R, s, doorXs) {
  const plan = ctx.plan, d = new Deco(plan), Y = plan.y, top = Y + plan.h, b = plan.batch, D = mats.woodDark;
  const zi = s > 0 ? R.z0 : R.z1, f0 = zi + s * 0.05, zf = s * wallFace(plan, (R.x0 + R.x1) / 2);
  const Fi = { axis: 'x', c: f0, n: s }, Fo = { axis: 'x', c: zf, n: -s };
  const nearDoor = (x, m = 0.62) => doorXs.some((q) => Math.abs(x - q) < m);
  const tb = (F, a0, a1, y0, y1, t = 0.04) => d.box(F, D, a0, a1, y0, y1, t);
  // inboard wall: oak sill plate, studs, mid rail, curved braces, head plate; door cases
  tb(Fi, R.x0, R.x1, 0, 0.14, 0.05);
  const posts = [];
  for (let x = R.x0 + 0.1; x <= R.x1 - 0.1 + 1e-6; x += 0.8) if (!nearDoor(x)) posts.push(x);
  for (const q of doorXs) posts.push(q - 0.53, q + 0.53);
  posts.sort((p, q) => p - q);
  for (const x of posts) tb(Fi, x - 0.065, x + 0.065, 0.14, plan.h - 0.2, 0.05);
  const segs = []; let a = R.x0 + 0.02;
  for (const q of [...doorXs].sort((p, q2) => p - q2)) { segs.push([a, q - 0.6]); a = q + 0.6; }
  segs.push([a, R.x1 - 0.02]);
  for (const [s0, s1] of segs) if (s1 - s0 > 0.1) { tb(Fi, s0, s1, 0.9, 1.0, 0.045); tb(Fi, s0, s1, 2.12, 2.2, 0.045); }
  for (const q of doorXs) { tb(Fi, q - 0.6, q + 0.6, 2.12, 2.28, 0.06); }
  tb(Fi, R.x0, R.x1, plan.h - 0.2, plan.h, 0.07);
  for (let i = 0; i < posts.length - 1; i++) {
    const xa = posts[i] + 0.065, xb = posts[i + 1] - 0.065, xm = (xa + xb) / 2;
    if (xb - xa < 0.4 || nearDoor(xm, 0.8)) continue;
    const zc = f0 + s * 0.022, k = i % 2 ? 1 : -1;
    // curved brace in the upper panel, short struts in the lower one
    const pts = []; for (let j = 0; j <= 5; j++) { const t = j / 5; pts.push([xm + k * (-0.5 + t) * (xb - xa), Y + 1.0 + 1.12 * t, zc]); }
    for (let j = 0; j < 5; j++) b.bar(D, [pts[j][0], pts[j][1] - 0.04, pts[j][2] - 0.02], [pts[j + 1][0], pts[j + 1][1] - 0.04, pts[j + 1][2] - 0.02], 0.04, 0.1);
    b.bar(D, [xa, Y + 0.14 + 0.38, zc - 0.02], [xb, Y + 0.14 + 0.38, zc - 0.02], 0.04, 0.06);
  }
  // outboard wall: oak posts between the windows, window frames with mullion and transom, sill
  const wins = sideWindows(R.x0, R.x1);
  for (let i = 0; i <= wins.length; i++) {
    const x = i === 0 ? R.x0 + 0.08 : i === wins.length ? R.x1 - 0.08 : (wins[i - 1] + wins[i]) / 2;
    tb(Fo, x - 0.08, x + 0.08, 0, plan.h - 0.2, 0.06);
  }
  for (const c of wins) {
    tb(Fo, c - 0.64, c + 0.64, BWIN.sill - 0.06, BWIN.sill, 0.09); tb(Fo, c - 0.64, c + 0.64, BWIN.head, BWIN.head + 0.08, 0.05);
    tb(Fo, c - 0.64, c - 0.575, BWIN.sill, BWIN.head, 0.05); tb(Fo, c + 0.575, c + 0.64, BWIN.sill, BWIN.head, 0.05);
    tb(Fo, c - 0.02, c + 0.02, BWIN.sill, BWIN.head, 0.03); tb(Fo, c - 0.575, c + 0.575, BWIN.head - 0.36, BWIN.head - 0.33, 0.03);
  }
  tb(Fo, R.x0, R.x1, 0, 0.14, 0.05); tb(Fo, R.x0, R.x1, plan.h - 0.2, plan.h, 0.07);
  // ceiling beams with curved brackets
  for (let x = R.x0 + 0.8; x < R.x1 - 0.4; x += 1.6) {
    b.box(D, x - 0.08, top - 0.18, Math.min(f0, zf), x + 0.08, top, Math.max(f0, zf), 'xXy');
  }
  b.box(D, R.x0, top - 0.12, (f0 + zf) / 2 - 0.07, R.x1, top, (f0 + zf) / 2 + 0.07, 'zZy');
  // wicker loungers along the windows, tables with chairs, palms and bay trees
  const zl = zf - s * 0.45, lounger = bcLounger({ mat: s > 0 ? 'fabricGreen' : 'fabricRed' });
  wins.forEach((c, i) => {
    if (c < R.x0 + 1.1 || c > R.x1 - 1.1) return;
    if (i % 2 === 0) { plan.prop(lounger, c, zl, NX, { collide: true }); plan.prop(tableRound({ r: 0.28, mat: 'wicker' }), c - 1.2, zl - s * 0.05, 0, { collide: true }); }
    else {
      plan.prop(tableRound({ r: 0.32, mat: 'wicker', items: true }), c, zl - s * 0.15, 0, { collide: true });
      plan.prop(armchair({ kind: 'wicker' }), c - 0.7, zl - s * 0.15, PX, { collide: false });
      plan.prop(armchair({ kind: 'wicker' }), c + 0.7, zl - s * 0.15, NX, { collide: false });
    }
  });
  for (let x = R.x0 + 0.6; x < R.x1 - 0.5; x += 2.9) if (!nearDoor(x, 0.9)) plan.prop(pottedPalm(), x, zi + s * 0.5, 0, { collide: false });
  plan.prop(bcBayTree(), R.x1 - 0.5, zl, 0, { collide: false });
  plan.prop(bcBayTree(), R.x0 + 0.5, zl, 0, { collide: false });
  if (fine(2)) {
    for (let x = R.x0 + 2.05; x < R.x1 - 0.8; x += 2.9) if (!nearDoor(x, 0.95)) plan.prop(bcFernStand({ mat: 'wicker', v: Math.round(x) }), x, zi + s * 0.62, 0, { collide: false });
    wins.forEach((c, i) => { if (i % 2 === 0 && c >= R.x0 + 1.1 && c <= R.x1 - 1.1) plan.prop(bcCoffee(), c - 1.2, zl - s * 0.05, 0.6, { y: Y + 0.75, collide: false }); });
  }
  d.flush();
}

// ================================================================ 2nd class smoking room (x -59..-47.5)

export function smokingRoom(ctx, R) {
  const plan = ctx.plan, d = new Deco(plan), Y = plan.y, top = Y + plan.h, O = mats.oak;
  const wins = sideWindows(R.x0, R.x1);
  const f = roomFaces(ctx, { stbd: winHoles(wins), port: [{ s: -52.7, e: -50.5, y0: 0, y1: 2.2 }] });
  const pl = panelRoom(d, f, { wood: O, rail: O, frieze: O, cornice: 'plaster', pitch: 0.7, pilMat: 'oak', capital: 'oak', lowGilt: null });
  curtainWindows(d, f.stbd, wins, { mat: 'fabricGreen', frame: O, pelmet: 'oak', sill: O });
  if (fine(1)) for (const sd of ['fwd', 'aft', 'port', 'stbd']) modDeco(d, f[sd], pl[sd] ?? [], { mat: 'oak', skip: sd === 'stbd' ? wins.map((c) => [c - 1.25, c + 1.25]) : [] });
  // plaster ceiling with oak-cased beams and roses
  d.coffers(f.x0, f.x1, f.z0, f.z1, [-55.2, -51.4], [-3.7, 1.0, 5.7, 10.2], { w: 0.26, depth: 0.12, mat: O, bead: 'plaster', cb: (cx, cz) => plan.lamp(cx, cz, 'bowl') });
  // club chairs in dark green morocco round oak tables, card tables, leather settees along the windows (instanced chairs)
  const club = armchair({ kind: 'club', mat: 'leatherGreen' }), cardChair = chairDining({ cls: 'second', mat: 'oak', seat: 'leatherGreen' }), spit = bcSpittoon();
  const RT = tableRound({ r: 0.4, mat: 'oak' });
  let i = 0;
  for (const x of [-56.6, -53.25, -49.9]) for (const z of [-5.4, -1.8, 1.8, 5.4, 9.0]) {
    const card = i++ % 4 === 1, t = card ? bcCardTable({ v: i }) : RT;
    d.ip(t, x, z, card ? 0.0 : 0); d.fpCollider(t.userData.fp, x, z, 0, 0.78);
    for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) d.ip(card ? cardChair : club, x + dx * (card ? 0.7 : 0.92), z + dz * (card ? 0.7 : 0.92), faceDir(-dx, -dz));
    if (i % 3 === 0) d.ip(spit, x + 0.75, z + 0.75, 0);
    if (!card && fine(1)) d.ip(bcSmokerSet({ v: i % 4 }), x, z, (i * 1.3) % 6.28, 0.75);
  }
  const settee2 = sofa({ mat: 'leatherGreen', w: 1.8 }), zs = f.z1 - 0.42;
  for (const c of wins) { d.put(settee2, c, zs, NZ, true); d.put(tableRound({ r: 0.3, mat: 'oak' }), c, zs - 0.85, 0, true); }
  plan.prop(clockWall(), f.x1 - 0.005, 5.6, NX, { y: Y + 2.0 });
  for (const [x, z, rot] of [[f.x0 + 0.005, 5.6, PX], [f.x0 + 0.005, -5.0, PX], [f.x1 - 0.005, -5.0, NX]]) plan.prop(picture({ w: 0.9, h: 0.6, v: 0 }), x, z, rot, { y: Y + 1.7 });
  plan.prop(pottedPalm(), f.x0 + 0.5, 13.3, 0, { collide: false });
  if (fine(2)) d.put(bcNewsRack(), f.x0 + 0.21, 2.3, PX, true);
  void top; d.flush();
}

/** bar of the smoking room; the counter stands behind the serving hatch in the near (starboard) wall. */
export function barRoom(ctx, hatchX) {
  const p0 = ctx.at(0, 0), p1 = ctx.at(1, 0), u = (hatchX - p0.x) / (p1.x - p0.x);
  ctx.put(barCounter({ w: 1.9 }), u, 0.36, 'out', { force: true, collide: true });
  ctx.put(stool({ mat: 'oak' }), u, 1.1, 'in', { collide: false });
  ctx.fit(backBar({ w: Math.min(2.6, ctx.W - 1.2) }), ['far:mid', 'far:hi'], { gap: 0 });
  ctx.fit(shelves({ kind: 'bottles', w: 1.2, mat: 'oak' }), ['left:hi', 'right:hi', 'left:mid']);
  ctx.fit(shelves({ kind: 'crockery', w: 1.2, mat: 'oak' }), ['right:hi', 'left:hi', 'right:mid']);
  ctx.fit(barrel(), ['far:lo', 'left:mid']); ctx.fit(barrel(), ['far:lo', 'right:mid', 'left:mid']);
}

export function lockerRoom(ctx) {
  for (const pref of [['far:lo', 'far:hi'], ['far:hi', 'far:mid'], ['left:hi', 'left:mid'], ['right:hi', 'right:mid'], ['left:mid'], ['right:mid']]) ctx.fit(locker({ n: 3 }), pref);
  ctx.put(bench({ w: 1.6, back: false }), ctx.W / 2, ctx.D / 2, 'in', { collide: false });
}

export function deckStewards(ctx) {
  PRESETS.linen(ctx);
  ctx.fit(shelves({ kind: 'linen', w: 1.5 }), ['left:hi', 'right:hi', 'far:hi']);
  ctx.fit(chairDining({ cls: 'plain' }), ['near:hi', 'right:lo'], { collide: false });
  for (let i = 0; i < 4; i++) ctx.fit(bench({ w: 1.5, back: false, mat: 'oak' }), ['far:lo', 'far:hi', 'right:mid', 'left:mid'], { collide: true });
}

export function stairBench(plan, x, z, rot) { plan.prop(bench({ w: 1.8, mat: 'oak' }), x, z, rot, { collide: true }); }
