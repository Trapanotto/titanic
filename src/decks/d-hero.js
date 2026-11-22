// D deck – hero rooms besides the dining saloons: 1st class Reception Room with the forward Grand Staircase landing and
// the lift shafts, the gangway vestibules, the main galley and its service rooms.
import * as THREE from 'three';
import { mats } from '../core/materials.js';
import {
  kitMats, matOf, pipe, armchair, tableRound, pottedPalm, piano, stool, sconce, column, pilaster, liftCage, clockWall, settee,
  range, oven, servingCounter, kettle, butcherBlock, sink, workbench, shelves, sackPile, barrel, crate, tableRect, basinSmall,
  chairDining, bench, locker, mirrorWall,
} from '../interior/kit.js';
import { InstField, leadedWindow, coffers, wctx, seatGroup, tapestryMat } from './d-util.js';

const NX = Math.PI;

// ================================================================= reception room

export const RECEPTION = { x0: 30.5, x1: 47.5, liftX0: 45.5, liftX1: 47.5 };

/** Three decorative lift shafts with ornate gates on the aft face (x = liftX0), white Jacobean surround. */
function liftShafts(plan, w, Y, h) {
  const b = plan.batch, { liftX0: a, liftX1: c } = RECEPTION, gold = mats.gold, white = mats.paintWhite;
  for (const z of [-1.6, 0, 1.6]) plan.prop(liftCage(), (a + c) / 2 + 0.1, z, NX, { collide: false });
  // surround: panelled sides, header with gilt strip, pilasters between the gates
  for (const s of [-1, 1]) b.box(mats.whitePanel, a, Y, s * 2.45 - 0.04, c - 0.05, Y + h, s * 2.45 + 0.04, 'xzZ');
  b.box(white, a - 0.08, Y + 2.3, -2.45, a, Y + h, 2.45, 'xyzZ');
  b.box(gold, a - 0.09, Y + 2.3, -2.45, a - 0.08, Y + 2.34, 2.45, 'xyY');
  for (const z of [-2.4, -0.8, 0.8, 2.4]) plan.prop(pilaster({ h: 2.3, w: 0.16, mat: 'paintWhite', capital: 'gold' }), a - 0.04, z, NX);
  // ornate wrought-iron gates (closed) in front of every cage
  for (const z of [-1.6, 0, 1.6]) {
    b.wallZ(kitMats.ironwork, a - 0.02, z - 0.7, z + 0.7, Y + 0.05, Y + 2.2, -1);
    b.box(mats.brass, a - 0.05, Y + 2.2, z - 0.72, a - 0.01, Y + 2.25, z + 0.72, 'xyY');
    const s = sconce(); s.position.set(a - 0.1, Y + 2.45, z); s.rotation.y = NX; plan.zone(a).add(s);
  }
  w.reserve((a + c) / 2, 0, c - a, 4.98, h);
}

/** furnish function of the Reception Room (x 30.5..47.5, full width; funnel-2 casing and the Grand Staircase inside). */
export function furnishReception(ctx) {
  const plan = ctx.plan, Y = ctx.y, h = ctx.h, b = plan.batch, w = wctx(ctx), { x0, x1 } = RECEPTION;
  liftShafts(plan, w, Y, h);
  const cas = plan.casings.find((c) => c.x1 > x0 && c.x0 < x1), stair = plan.keepouts.find((k) => k.id === 'grandFwd');

  // Aubusson tapestry on the forward face of the funnel casing, opposite the foot of the staircase
  const tx = cas.x1 + 0.012, ty0 = Y + 0.45, ty1 = Y + 2.35, tz = 2.35;
  b.poly(tapestryMat, [[tx, ty0, tz], [tx, ty0, -tz], [tx, ty1, -tz], [tx, ty1, tz]], [1, 0, 0], [[0, 0], [1, 0], [1, 1], [0, 1]]);
  for (const [za, zb, ya, yb] of [[-tz - 0.08, tz + 0.08, ty0 - 0.08, ty0], [-tz - 0.08, tz + 0.08, ty1, ty1 + 0.08], [-tz - 0.08, -tz, ty0, ty1], [tz, tz + 0.08, ty0, ty1]]) {
    b.box(mats.gold, cas.x1, ya, za, cas.x1 + 0.035, yb, zb, 'Xyz' + 'YZ');
  }
  // white Jacobean carved panelling on the casing sides: pilasters and sconces
  for (const s of [-1, 1]) {
    for (const x of [31.4, 34, 36.6]) w.mount(pilaster({ h, w: 0.24, mat: 'paintWhite', capital: 'paintWhite' }), x, s * (cas.z1 + 0.04), s > 0 ? 'stbd' : 'port', 0);
    for (const x of [32.7, 35.3]) w.mount(sconce(), x, s * (cas.z1 + 0.01), s > 0 ? 'stbd' : 'port', 1.85);
  }
  // white columns around the stair well, moulded ceiling, large leaded windows on both sides
  for (const x of [stair.x0 + 1.8, stair.x1 - 1.8]) for (const s of [-1, 1]) w.put(column({ h, r: 0.14, mat: 'paintWhite', capital: 'gold' }), x, s * 3.35, 'fwd', { collide: true });
  coffers(plan, x0 + 0.05, x1 - 0.05, -13.85, 13.85, { px: 2.83, pz: 2.8, avoid: [cas, stair, { x0: RECEPTION.liftX0 - 0.1, x1: x1, z0: -2.5, z1: 2.5 }] });
  for (let x = 31.05; x < x1 - 1; x += 2.7) for (const s of [-1, 1]) leadedWindow(plan, x, s, { w: 2.0, y0: 0.7, y1: 2.3 });
  for (let x = 32.4; x < x1 - 1; x += 2.7) for (const s of [-1, 1]) w.mount(sconce(), x, s * (plan.halfWidth(x) - 0.01), s > 0 ? 'port' : 'stbd', 1.9);

  // Steinway grand piano at the port side, palms
  w.put(piano({ grand: true, mat: 'woodDark' }), 33.6, -12.0, 'stbd');
  w.put(stool(), 33.6, -10.6, 'port', { collide: false });
  for (const [x, z] of [[31.1, -13.2], [31.1, 13.2], [46.8, -5.5], [46.8, 5.5], [37.95, -3.7], [37.95, 3.7]]) w.put(pottedPalm(), x, z, 'fwd', { collide: false });

  // wicker chairs around small tables
  let groups = 0;
  const tbl = () => tableRound({ r: 0.38, mat: 'wicker' }), chair = () => armchair({ kind: 'wicker' });
  for (const x of [32.4, 35.0, 37.6, 40.2, 42.8, 45.3]) {
    for (const s of [-1, 1]) for (const z of [5.0, 7.7, 10.4, 12.7]) {
      const zz = s * z, sides = z > 12 ? ['fwd', 'aft', s > 0 ? 'port' : 'stbd'] : ['fwd', 'aft', 'port', 'stbd'];
      if (seatGroup(w, tbl(), chair, x, zz, 0.78, sides)) groups++;
    }
  }
  return { groups };
}

/** Gangway entrance vestibule (x 47.5..52 at the ship's side). Side s = −1 port / +1 starboard. */
export function furnishVestibule(s) {
  return (ctx) => {
    const plan = ctx.plan, Y = ctx.y, b = plan.batch, w = wctx(ctx), x0 = 47.5, x1 = 52, xc = (x0 + x1) / 2;
    const zh = s * (plan.halfWidth(xc) - 0.02);
    // closed double gangway door in the shell plating (decorative)
    b.box(mats.oak, xc - 0.95, Y, zh, xc + 0.95, Y + 2.3, zh - s * 0.06, s > 0 ? 'xXyYz' : 'xXyYZ');
    b.box(mats.mahogany, xc - 0.8, Y, zh - s * 0.06, xc + 0.8, Y + 2.15, zh - s * 0.1, s > 0 ? 'xXYz' : 'xXYZ');
    b.box(mats.brass, xc - 0.02, Y + 1.0, zh - s * 0.1, xc + 0.02, Y + 1.25, zh - s * 0.13, s > 0 ? 'xXyYz' : 'xXyYZ');
    // folded wrought-iron gates either side of the opening into the reception room
    const gz = s * 11;
    for (const d of [-1, 1]) b.wallZ(kitMats.ironwork, x0 + 0.07, gz + d * 0.95, gz + d * 1.75, Y + 0.02, Y + 2.1, 1);
    for (const d of [-1, 1]) b.box(mats.iron, x0 + 0.05, Y, gz + d * 0.92 - 0.02, x0 + 0.09, Y + 2.15, gz + d * 0.92 + 0.02, 'xXzZY');
    w.put(settee({ mat: 'fabricGreen' }), x1 - 0.36, s * 10.9, 'aft');
    w.put(pottedPalm(), x1 - 0.55, s * 8.9, 'fwd', { collide: false });
    w.mount(clockWall(), xc, s * 8.36, s > 0 ? 'stbd' : 'port', 2.15);
    for (const dx of [-1.4, 1.4]) w.mount(sconce(), xc + dx, zh - s * 0.01, s > 0 ? 'port' : 'stbd', 2.0);
  };
}

// ================================================================= galley and service rooms

let potGeo = null;
/** furnish function of the main galley (x −24..−16, |z| ≤ 12.4): coal-fired ranges along the centre line. */
export function furnishGalley(ctx) {
  const plan = ctx.plan, Y = ctx.y, h = ctx.h, b = plan.batch, w = wctx(ctx);
  const XC = -20, steel = mats.steelDark, iron = mats.iron;
  // two rows of ranges back to back, a cross passage on the centre line
  const zs = [-9.6, -7.2, -4.8, -2.4, 2.4, 4.8, 7.2, 9.6];
  for (const z of zs) { w.put(range({ w: 2.4 }), XC + 0.48, z, 'fwd'); w.put(range({ w: 2.4 }), XC - 0.48, z, 'aft'); }
  for (const s of [-1, 1]) {
    // canopy hood over each half, flues to the uptake
    b.box(steel, XC - 1.25, Y + 2.05, s * 1.1, XC + 1.25, Y + 2.3, s * 10.9);
    b.box(steel, XC - 0.4, Y + 2.3, s * 1.4, XC + 0.4, Y + h, s * 10.6, 'xXzZ');
    // coal bunker boxes at the ends of the ranges
    for (const dx of [-0.5, 0.5]) { b.box(iron, XC + dx - 0.3, Y, s * 11.0, XC + dx + 0.3, Y + 0.42, s * 11.6); b.box(mats.coal, XC + dx - 0.27, Y + 0.42, s * 11.03, XC + dx + 0.27, Y + 0.44, s * 11.57, 'Y'); }
  }
  // bain-marie / hot plates along the forward wall (pantry side), ovens, stock kettles and work tables aft
  for (const s of [-1, 1]) {
    w.put(servingCounter({ w: 2.0, d: 0.7, mat: 'steel', top: 'steel', items: true }), -16.42, s * 3.7, 'aft');
    w.put(servingCounter({ w: 2.0, d: 0.7, mat: 'steel', top: 'steel', items: true }), -16.42, s * 10.4, 'aft');
    w.put(oven({ w: 1.4 }), -23.48, s * 0.75, 'fwd');
    w.put(kettle(), -23.5, s * 2.05, 'fwd');
    w.put(workbench({ w: 1.8 }), -23.62, s * 7.6, 'fwd');
    w.put(butcherBlock(), -22.2, s * 7.6, 'fwd');
    w.put(sink({ w: 1.2 }), -17.4, s * 12.05, s > 0 ? 'port' : 'stbd');
    w.put(sink({ w: 1.2 }), -22.8, s * 12.05, s > 0 ? 'port' : 'stbd');
    w.put(kettle(), -18.3, s * 11.8, 'fwd');
  }
  // pot racks over both aisles with hanging copper pans (instanced)
  potGeo ??= (() => { const g = new THREE.CylinderGeometry(0.13, 0.11, 0.17, 8, 1, false); g.translate(0, -0.085, 0); return g; })();
  const f = new InstField(ctx.world, plan.deck).define('pot', potGeo, mats.copper);
  for (const xr of [-17.75, -22.25]) {
    for (const s of [-1, 1]) {
      const za = s * 1.3, zb = s * 10.6;
      b.bar(iron, [xr, Y + 2.3, za], [xr, Y + 2.3, zb], 0.04, 0.04);
      for (const z of [za, (za + zb) / 2, zb]) b.box(iron, xr - 0.015, Y + 2.3, z - 0.015, xr + 0.015, Y + h, z + 0.015, 'xXzZ');
      for (let z = Math.min(za, zb) + 0.3; z < Math.max(za, zb) - 0.2; z += 0.42) f.add('pot', xr, Y + 2.26 - ((Math.round(z * 10) % 3) * 0.05), z, 0, 1 + (Math.round(z * 7) % 3) * 0.15, 1, 1 + (Math.round(z * 7) % 3) * 0.15);
    }
  }
  f.flush();
  // a pipe for the steam to the bain-marie
  pipe(plan.zone(-16.3), 'copper', [[-16.15, Y + 2.35, -12], [-16.15, Y + 2.35, 12]], 0.035);
}

/** Bakery: bread ovens along the far wall, dough troughs, flour sacks. */
export function furnishBakery(ctx) {
  ctx.fit(oven({ w: 1.4 }), ['far:lo', 'far:hi']); ctx.fit(oven({ w: 1.4 }), ['far:hi', 'far:mid']); ctx.fit(oven({ w: 1.4 }), ['far:mid']);
  ctx.fit(workbench({ w: 1.8 }), ['left:hi', 'right:hi']); ctx.fit(workbench({ w: 1.8 }), ['right:hi', 'left:mid']);
  ctx.fit(sackPile({ mat: 'canvas' }), ['right:lo', 'left:lo'], { collide: false });
  ctx.fit(shelves({ kind: 'stores', w: 1.2 }), ['near:hi', 'left:lo']);
  ctx.fit(barrel(), ['left:lo', 'right:mid'], { collide: false });
}
/** Pastry kitchen: marble-topped tables, shelves, small oven. */
export function furnishPastry(ctx) {
  ctx.fit(oven({ w: 1.4 }), ['far:mid', 'far:lo']);
  ctx.put(tableRect({ w: 2.0, d: 0.9, mat: 'marble' }), ctx.W / 2, ctx.D / 2, 'in');
  ctx.fit(shelves({ kind: 'crockery', w: 1.5 }), ['left:hi', 'right:hi']); ctx.fit(shelves({ kind: 'stores', w: 1.2 }), ['right:mid', 'left:mid']);
  ctx.fit(workbench({ w: 1.6 }), ['near:hi', 'right:lo']);
}
/** Butcher's shop: chopping blocks, meat hooks, ice chest. */
export function furnishButcher(ctx) {
  ctx.put(butcherBlock(), ctx.W / 2 - 0.6, ctx.D / 2, 'in'); ctx.put(butcherBlock(), ctx.W / 2 + 0.6, ctx.D / 2 + 0.2, 'in');
  ctx.fit(workbench({ w: 1.8 }), ['far:lo', 'far:hi']); ctx.fit(locker({ n: 3, mat: 'steel' }), ['far:hi', 'right:hi']);
  ctx.fit(shelves({ kind: 'stores', w: 1.2 }), ['left:hi', 'right:mid']);
  // meat rail with hooks along the far wall
  const a = ctx.at(0.3, ctx.D - 0.35), c = ctx.at(ctx.W - 0.3, ctx.D - 0.35), Y = ctx.y;
  ctx.plan.batch.bar(mats.chrome, [a.x, Y + 2.2, a.z], [c.x, Y + 2.2, c.z], 0.03, 0.03);
  for (let t = 0.1; t < 0.95; t += 0.12) { const x = a.x + (c.x - a.x) * t, z = a.z + (c.z - a.z) * t; ctx.plan.batch.box(mats.chrome, x - 0.01, Y + 2.0, z - 0.01, x + 0.01, Y + 2.2, z + 0.01, 'xXzZ'); }
}
/** Vegetable kitchen: sinks, tables, sacks and barrels. */
export function furnishVeg(ctx) {
  ctx.fit(sink({ w: 1.2 }), ['far:lo', 'far:hi']); ctx.fit(sink({ w: 1.2 }), ['far:hi', 'far:mid']);
  ctx.fit(workbench({ w: 1.8 }), ['left:hi', 'right:hi']);
  ctx.fit(sackPile(), ['right:lo', 'left:lo'], { collide: false });
  ctx.fit(barrel(), ['left:lo', 'right:mid'], { collide: false }); ctx.fit(crate(), ['right:mid', 'near:hi'], { collide: false });
}
/** Scullery: rows of sinks, plate racks. */
export function furnishScullery(ctx) {
  for (let i = 0; i < 4; i++) ctx.fit(sink({ w: 1.2 }), ['far:lo', 'far:hi', 'left:hi', 'right:hi']);
  ctx.fit(shelves({ kind: 'crockery', w: 1.5 }), ['left:hi', 'right:hi', 'left:lo']); ctx.fit(shelves({ kind: 'crockery', w: 1.5 }), ['right:hi', 'right:lo']);
  ctx.fit(workbench({ w: 1.6 }), ['near:hi', 'right:mid']);
}
/** Operating room of the hospital. */
export function furnishSurgery(ctx) {
  ctx.put(tableRect({ w: 1.9, d: 0.7, mat: 'paintWhite', cloth: true }), ctx.W / 2, ctx.D / 2 + 0.2, 'right');
  ctx.fit(shelves({ kind: 'bottles', w: 1.2, mat: 'paintWhite' }), ['far:lo', 'far:hi']); ctx.fit(shelves({ kind: 'linen', w: 1.2, mat: 'paintWhite' }), ['far:hi', 'right:hi']);
  ctx.fit(basinSmall(), ['left:hi', 'right:mid'], { collide: false }); ctx.fit(basinSmall(), ['left:mid', 'right:lo'], { collide: false });
  ctx.fit(locker({ n: 2, mat: 'paintWhite' }), ['right:hi', 'left:lo']);
  ctx.put(chairDining({ cls: 'plain' }), ctx.W / 2 - 1.3, ctx.D / 2 + 0.2, 'right', { collide: false });
  const p = ctx.at(ctx.W / 2, ctx.D / 2 + 0.2); ctx.world.addLamp({ x: p.x, y: ctx.y + 2.3, z: p.z, color: 0xffffff, intensity: 1.1 });
}
/** Doctor's consulting room / dispensary. */
export function furnishDispensary(ctx) {
  ctx.fit(shelves({ kind: 'bottles', w: 1.5, mat: 'paintWhite' }), ['far:lo', 'far:hi']); ctx.fit(shelves({ kind: 'bottles', w: 1.5, mat: 'paintWhite' }), ['far:hi', 'left:hi']);
  ctx.fit(workbench({ w: 1.6 }), ['left:hi', 'right:hi']);
  ctx.fit(basinSmall(), ['right:mid', 'left:mid'], { collide: false });
  if (ctx.put(tableRect({ w: 1.1, d: 0.7, mat: 'oak' }), ctx.W / 2, ctx.D / 2, 'in')) ctx.put(chairDining({ cls: 'plain' }), ctx.W / 2, ctx.D / 2 - 0.65, 'in', { collide: false });
  ctx.mount(mirrorWall({ w: 0.6, h: 0.8 }), 'right', ctx.D / 2, 1.5);
}
/** Simple wash room: basins along the far wall, a shower, a bench. */
export function washroom(ctx) {
  const n = Math.max(1, Math.floor((ctx.W - 0.3) / 0.75));
  for (let i = 0; i < n; i++) ctx.put(basinSmall(), ((i + 0.5) * ctx.W) / n, ctx.D - 0.22, 'out', { collide: false });
  ctx.fit(bench({ w: Math.min(1.6, Math.max(0.8, ctx.D - 1.4)), back: false }), ['right:hi', 'left:hi'], { collide: false });
}
export { matOf };
