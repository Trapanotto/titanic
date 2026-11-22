// B deck ("Bridge Deck") – hand-detailed hero rooms and custom geometry. Used by b.js.
import * as THREE from 'three';
import { mats } from '../core/materials.js';
import {
  addStyle, kitMats, matOf, PRESETS,
  armchair, backBar, barCounter, barrel, bench, bookcase, chairDining, clockWall, column, fireplace, liftCage, locker,
  mirrorWall, pilaster, pottedPalm, sconce, servingCounter, settee, shelves, sofa, stool, tableRect, tableRound, trellis,
  writingDesk, heater,
} from '../interior/kit.js';

// rotations: prop front facing +x / -x / +z / -z
export const PX = 0, NX = Math.PI, PZ = -Math.PI / 2, NZ = Math.PI / 2;

// ---------------------------------------------------------------- styles + the two extra materials of this deck
addStyle('ritz', { wall: 'mahogany', wainscot: 'woodDark', dado: 'gold', skirt: 'woodDark', cornice: 'gold', door: 'mahogany', lamp: 'cut' });
addStyle('tudor', { wall: 'paintCream', skirt: 'woodDark', cornice: 'woodDark', dado: 'woodDark', door: 'oak', lamp: 'bowl' });
addStyle('adam', { wall: 'paintCream', wainscot: 'whitePanel', dado: 'gold', skirt: 'paintWhite', cornice: 'gold', door: 'white', lamp: 'cut' });
addStyle('cafe', { wall: 'paintCream', skirt: 'woodDark', cornice: 'paintWhite', door: 'white', lamp: 'bowl' });

// pink silk lamp shades of the à la carte restaurant (one shared material + geometry)
const pinkShade = new THREE.MeshStandardMaterial({ color: 0xf3b3b0, emissive: 0xff8f8a, emissiveIntensity: 0.85, roughness: 0.8, side: THREE.DoubleSide });
pinkShade.name = 'b-pinkShade';
let shadeGeo = null;

/** Window centres (x) of the B-deck side walls between x0 and x1 (exterior run x -70..40, pitch 2.75, 1.15 m wide). */
export function sideWindows(x0, x1) {
  const out = [];
  for (let i = 0; i < 40; i++) { const c = -68.625 + 2.75 * i; if (c > x0 + 0.62 && c < x1 - 0.62) out.push(c); }
  return out;
}
/** |z| of the inner face of the exterior side wall at x */
const wallFace = (plan, x) => plan.halfWidth(x) + 0.05;

const wallLight = (plan, x, z, rot, plain = false) => plan.prop(sconce(plain ? { plain: true } : {}), x, z, rot, { y: plan.y + 1.85 });

/** round table with chairs around it (world coordinates) */
function tableGroup(plan, x, z, o = {}) {
  const r = o.r ?? 0.45, d = o.d ?? r + 0.5, n = o.n ?? 4;
  plan.prop(o.table ?? tableRound({ r, mat: o.mat ?? 'mahogany', cloth: o.cloth, set: o.set }), x, z, 0, { collide: true });
  const seats = o.seats ?? Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2 + (o.phase ?? 0); return [Math.cos(a), Math.sin(a)]; });
  for (const [dx, dz] of seats) plan.prop(o.chair ? o.chair() : armchair({ kind: 'uph', mat: o.cover ?? 'fabricGreen' }), x + dx * d, z + dz * d, Math.atan2(dz, -dx), { collide: false });
}

/** small table lamp with a pink silk shade (Ritz restaurant) */
function pinkLamp(plan, x, z, yTop) {
  const b = plan.batch;
  b.box(mats.brass, x - 0.05, yTop, z - 0.05, x + 0.05, yTop + 0.015, z + 0.05, 'xXzZY');
  b.box(mats.brass, x - 0.012, yTop + 0.015, z - 0.012, x + 0.012, yTop + 0.22, z + 0.012, 'xXzZ');
  shadeGeo ??= new THREE.CylinderGeometry(0.055, 0.11, 0.13, 8, 1, true);
  const m = new THREE.Mesh(shadeGeo, pinkShade);
  m.position.set(x, yTop + 0.25, z);
  plan.zone(x).add(m);
}

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

// ================================================================ forward Grand Staircase landing (x 37.5..48)

export function grandLobby(plan, L) {
  const Y = plan.y, top = Y + plan.h, b = plan.batch, w = plan.world;
  const FX = 45.55; // face of the lift shaft front (shafts x 45.5..47.5 + back to the lobby wall at 48)
  // three electric lifts, cages seen through ornate wrought-iron gates
  for (const z of [-1.6, 0, 1.6]) {
    plan.prop(liftCage(), 46.45, z, NX);
    b.wallZ(kitMats.ironwork, FX - 0.012, z - 0.68, z + 0.68, Y + 0.03, Y + 2.24, -1);
    b.box(mats.brass, FX - 0.035, Y + 2.24, z - 0.7, FX, Y + 2.29, z + 0.7);
    b.box(mats.brass, FX - 0.035, Y, z - 0.7, FX, Y + 0.03, z + 0.7);
    // floor indicator dial above each gate
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
  // oak columns at the corners of the stair well
  for (const x of [39.6, 44.2]) for (const s of [-1, 1]) plan.prop(column({ h: plan.h, r: 0.16, mat: 'oak', capital: 'gold' }), x, s * 3.05, 0, { collide: true });
  for (const s of [-1, 1]) {
    // seating either side of the stairs, clear of the corridor lanes (|z| 6.2..7.8) and the landing at the forward end
    tableGroup(plan, 40.6, s * 4.45, { r: 0.4, mat: 'oak', cover: s < 0 ? 'fabricGreen' : 'fabricRed', seats: [[-1, 0], [1, 0], [0, s]] });
    tableGroup(plan, 43.3, s * 4.45, { r: 0.4, mat: 'oak', cover: s < 0 ? 'fabricGreen' : 'fabricRed', seats: [[-1, 0], [0, s]] });
    // pilasters and sconces on the aft wall (funnel casing behind)
    for (const z of [3.4, 6.0]) plan.prop(pilaster({ h: plan.h, mat: 'oak', capital: 'gold' }), L.x0 + 0.09, s * z, PX);
    wallLight(plan, L.x0 + 0.06, s * 4.7, PX);
    plan.prop(pottedPalm(), 47.3, s * 3.2, 0, { collide: false });
    wallLight(plan, L.x1 - 0.06, s * 4.6, NX);
  }
}

/** entrance vestibule beside the forward staircase, s = +1 starboard / -1 port. Gangway door in the ship's side. */
export function vestibule(plan, R, s) {
  const Y = plan.y, b = plan.batch, xd0 = 41.8, xd1 = 42.95, zf = s * wallFace(plan, 42.4);
  // double gangway door (closed at sea) with mahogany frame, raised panels and brass fittings – between two windows
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
  // furniture: settee on the aft wall, a waiting group forward, palms, sconces
  plan.prop(settee({ mat: s > 0 ? 'fabricRed' : 'fabricGreen' }), R.x0 + 0.36, s * 10.9, PX, { collide: true });
  tableGroup(plan, R.x1 - 1.1, s * 10.9, { r: 0.4, mat: 'oak', cover: s > 0 ? 'fabricRed' : 'fabricGreen', seats: [[0, -1], [0, 1]] });
  plan.prop(pottedPalm(), R.x0 + 0.6, s * 13.2, 0, { collide: false });
  plan.prop(pottedPalm(), R.x1 - 0.6, s * 13.2, 0, { collide: false });
  wallLight(plan, R.x0 + 0.06, s * 9.0, PX); wallLight(plan, R.x1 - 0.06, s * 9.0, NX); wallLight(plan, R.x1 - 0.06, s * 12.8, NX);
  plan.prop(mirrorWall({ w: 0.9, h: 1.2 }), R.x0 + 0.06, s * 12.6, PX, { y: Y + 1.75 });
}

// ================================================================ parlour suites

export function suiteSitting(ctx) {
  const o = ctx.room.fo ?? {}, cover = o.cover ?? 'fabricGold', mat = o.wood ?? 'mahogany';
  const fp = ctx.fit(fireplace({ mat: o.fire ?? 'marble' }), ['left:hi', 'right:hi', 'left:mid', 'right:mid', 'near:hi'], { gap: 0 });
  ctx.fit(sofa({ mat: cover, w: 1.9 }), ['far:lo', 'far:hi', 'near:hi']);
  const u = ctx.W / 2 + 0.2, v = ctx.D / 2 + 0.1;
  if (ctx.put(tableRound({ r: 0.45, mat, lamp: true }), u, v, 'in')) {
    ctx.put(armchair({ kind: 'uph', mat: cover }), u - 1.0, v, 'right', { collide: false });
    ctx.put(armchair({ kind: 'uph', mat: cover }), u + 1.0, v, 'left', { collide: false });
  }
  ctx.fit(writingDesk({ mat }), ['near:hi', 'right:lo', 'left:lo', 'far:hi']);
  ctx.fit(bookcase({ mat, w: 1.0 }), ['right:mid', 'left:mid', 'near:mid', 'far:mid']);
  ctx.fit(pottedPalm(), ['far:hi', 'far:lo', 'near:hi'], { collide: false });
  ctx.mount(sconce(), 'far', ctx.W * 0.2, 1.85); ctx.mount(sconce(), 'far', ctx.W * 0.8, 1.85);
  ctx.mount(sconce(), 'near', ctx.W * 0.75, 1.85);
  ctx.mount(mirrorWall({ w: 0.8, h: 1.0 }), 'near', ctx.W * 0.5, 2.05);
  if (fp) ctx.glow(ctx.W / 2, ctx.D / 2, 0.5);
  // gilt ceiling rose + panel mouldings (Louis XVI / Adam)
  const b = ctx.plan.batch, top = ctx.y + ctx.h, c = ctx.at(ctx.W / 2, ctx.D / 2), r = ctx.room.safe;
  b.ring(mats.gold, [c.x, top - 0.008, c.z], [0, -1, 0], 0.32, 0.38, 14);
  b.ring(mats.gold, [c.x, top - 0.008, c.z], [0, -1, 0], 0.6, 0.64, 16);
  for (const [x0, x1, z0, z1] of [[r.x0 + 0.35, r.x1 - 0.35, r.z0 + 0.35, r.z0 + 0.39], [r.x0 + 0.35, r.x1 - 0.35, r.z1 - 0.39, r.z1 - 0.35],
    [r.x0 + 0.35, r.x0 + 0.39, r.z0 + 0.35, r.z1 - 0.35], [r.x1 - 0.39, r.x1 - 0.35, r.z0 + 0.35, r.z1 - 0.35]]) b.box(mats.gold, x0, top - 0.02, z0, x1, top - 0.005, z1, 'y');
}

export function suiteBedroom(ctx) {
  const o = ctx.room.fo ?? {};
  ctx.opts = { cover: o.cover ?? 'fabricBlue', mat: o.wood ?? 'mahogany', fireplace: false };
  PRESETS.cabinFirstSuite(ctx);
  ctx.fit(armchair({ kind: 'uph', mat: o.cover ?? 'fabricBlue' }), ['far:lo', 'near:hi', 'left:mid', 'right:mid'], { collide: false });
  ctx.fit(heater(), ['near:hi', 'left:lo', 'right:lo'], { collide: false });
  ctx.mount(sconce(), 'far', ctx.W * 0.25, 1.8); ctx.mount(sconce(), 'far', ctx.W * 0.75, 1.8);
}

/** private promenade of a parlour suite: Tudor half-timbering, wicker furniture, palms. doorXs = doors in the inboard wall. */
export function privatePromenade(plan, R, s, doorXs) {
  const Y = plan.y, top = Y + plan.h, b = plan.batch, D = mats.woodDark;
  const zi = s > 0 ? R.z0 : R.z1;           // inboard wall line
  const f0 = zi + s * 0.05, f1 = zi + s * 0.085; // timbers on its promenade face
  const nearDoor = (x, m = 0.62) => doorXs.some((d) => Math.abs(x - d) < m);
  // posts
  const posts = [];
  for (let x = R.x0 + 0.08; x <= R.x1 - 0.08 + 1e-6; x += 1.0) if (!nearDoor(x)) posts.push(x);
  for (const d of doorXs) posts.push(d - 0.53, d + 0.53);
  posts.sort((p, q) => p - q);
  for (const x of posts) b.box(D, x - 0.06, Y, Math.min(f0, f1), x + 0.06, top - 0.1, Math.max(f0, f1), 'xXzZ');
  // rails (interrupted at the doors) and braces in the panels between posts
  const segs = [];
  let a = R.x0 + 0.02;
  for (const d of [...doorXs].sort((p, q) => p - q)) { segs.push([a, d - 0.53]); a = d + 0.53; }
  segs.push([a, R.x1 - 0.02]);
  for (const [s0, s1] of segs) {
    if (s1 - s0 < 0.1) continue;
    for (const y of [0.92, 2.12]) b.box(D, s0, Y + y, Math.min(f0, f1), s1, Y + y + 0.1, Math.max(f0, f1), 'xXyYzZ');
  }
  const zc = (f0 + f1) / 2;
  for (let i = 0; i < posts.length - 1; i++) {
    const xa = posts[i] + 0.06, xb = posts[i + 1] - 0.06;
    if (xb - xa < 0.5 || nearDoor((xa + xb) / 2, 0.75)) continue;
    if (i % 2 === 0) b.bar(D, [xa, Y + 1.02, zc], [xb, Y + 2.02, zc], 0.035, 0.09); else b.bar(D, [xb, Y + 1.02, zc], [xa, Y + 2.02, zc], 0.035, 0.09);
  }
  // timber posts on the ship's side between the windows, ceiling beams across
  const wins = sideWindows(R.x0, R.x1);
  for (let i = 0; i < wins.length - 1; i++) {
    const x = (wins[i] + wins[i + 1]) / 2, zf = s * wallFace(plan, x);
    b.box(D, x - 0.08, Y, zf - s * 0.06, x + 0.08, top - 0.1, zf, 'xX' + (s > 0 ? 'z' : 'Z'));
  }
  for (let x = R.x0 + 0.8; x < R.x1 - 0.4; x += 1.6) {
    const zf = s * wallFace(plan, x);
    b.box(D, x - 0.08, top - 0.17, Math.min(zi, zf), x + 0.08, top, Math.max(zi, zf), 'xXy');
  }
  b.box(D, R.x0, top - 0.1, Math.min(f0, f1), R.x1, top, Math.max(f0, f1) + s * 0.02, 'y' + (s > 0 ? 'Z' : 'z'));
  // wicker groups in front of the windows, palms between the doors
  const zw = s * (wallFace(plan, (R.x0 + R.x1) / 2) - 0.62);
  wins.forEach((xw, i) => {
    if (xw < R.x0 + 0.9 || xw > R.x1 - 0.9) return;
    if (i % 2 === 0) {
      plan.prop(tableRound({ r: 0.3, mat: 'wicker' }), xw, zw, 0, { collide: true });
      plan.prop(armchair({ kind: 'wicker' }), xw - 0.68, zw, PX, { collide: false });
      plan.prop(armchair({ kind: 'wicker' }), xw + 0.68, zw, NX, { collide: false });
    } else {
      plan.prop(armchair({ kind: 'wicker' }), xw - 0.4, zw, s > 0 ? NZ + 0.35 : PZ - 0.35, { collide: false });
      plan.prop(armchair({ kind: 'wicker' }), xw + 0.4, zw, s > 0 ? NZ - 0.35 : PZ + 0.35, { collide: false });
    }
  });
  for (let x = R.x0 + 0.6; x < R.x1 - 0.5; x += 2.9) if (!nearDoor(x, 0.9)) plan.prop(pottedPalm(), x, zi + s * 0.55, 0, { collide: false });
  plan.prop(pottedPalm(), R.x1 - 0.55, zw, 0, { collide: false });
}

// ================================================================ à la carte restaurant ("The Ritz")

export function restaurant(plan, R) {
  const Y = plan.y, top = Y + plan.h, b = plan.batch, yT = Y + 0.78;
  const chair = () => chairDining({ cls: 'first', mat: 'mahogany', seat: 'fabricRed' });
  // window bays on the port side: curtains, gilt pelmets, tables for two
  for (const xw of sideWindows(R.x0, R.x1)) {
    const zf = -wallFace(plan, xw);
    for (const sx of [-1, 1]) b.box(mats.fabricRed, xw + sx * 0.58, Y + 0.1, zf, xw + sx * 0.8, Y + 2.32, zf + 0.07, sx < 0 ? 'xXZ' : 'xXZ');
    b.box(mats.gold, xw - 0.86, Y + 2.3, zf, xw + 0.86, Y + 2.46, zf + 0.12, 'xXyZ');
    const zt = zf + 0.85;
    plan.prop(tableRect({ w: 0.7, d: 0.7, cloth: true, set: true }), xw, zt, 0, { collide: true });
    plan.prop(chair(), xw - 0.58, zt, PX, { collide: false }); plan.prop(chair(), xw + 0.58, zt, NX, { collide: false });
    pinkLamp(plan, xw, zt, yT);
  }
  // pilasters between the windows and on the inboard (café) wall
  const wins = sideWindows(R.x0, R.x1);
  for (let i = 0; i < wins.length - 1; i++) { const x = (wins[i] + wins[i + 1]) / 2; plan.prop(pilaster({ h: plan.h, w: 0.3, mat: 'mahogany', capital: 'gold' }), x, -wallFace(plan, x) + 0.04, PZ); }
  for (const x of [-22.9, -20.6, -16.9, -14.6]) plan.prop(pilaster({ h: plan.h, w: 0.3, mat: 'mahogany', capital: 'gold' }), x, R.z1 - 0.09, NZ);
  // fluted walnut columns with gilt capitals
  for (const x of [-20.4, -17.1]) for (const z of [-8.0, -3.9, 0.3, 4.6]) {
    plan.prop(column({ h: plan.h, r: 0.17, mat: 'mahogany', capital: 'gold' }), x, z, 0, { collide: true });
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2, px = x + Math.cos(a) * 0.165, pz = z + Math.sin(a) * 0.165; b.box(mats.woodDark, px - 0.018, Y + 0.3, pz - 0.018, px + 0.018, top - 0.32, pz + 0.018, 'xXzZ'); }
    b.box(mats.gold, x - 0.19, Y + 0.95, z - 0.19, x + 0.19, Y + 1.0, z + 0.19, 'xXzZ');
  }
  // tables for 4 and two big round tables for 8, all with cloth, silver and pink-shaded lamps
  const four = [[-22, -10.2], [-18.75, -10.2], [-15.5, -10.2], [-22, -6.0], [-18.75, -6.0], [-15.5, -6.0], [-22, -1.8], [-15.5, -1.8], [-22, 2.4], [-15.5, 2.4], [-22, 6.8]];
  for (const [x, z] of four) {
    tableGroup(plan, x, z, { r: 0.5, d: 0.95, table: tableRound({ r: 0.5, cloth: true, set: 4 }), chair, phase: 0 });
    pinkLamp(plan, x, z, yT);
  }
  for (const z of [-1.8, 2.4]) {
    tableGroup(plan, -18.75, z, { r: 0.8, d: 1.3, n: 8, phase: Math.PI / 8, table: tableRound({ r: 0.8, cloth: true, set: 8 }), chair });
    for (const dz of [-0.3, 0.3]) pinkLamp(plan, -18.75, z + dz, yT);
  }
  // sideboards with marble tops on the end walls (casings behind)
  plan.prop(servingCounter({ w: 2.0, d: 0.6, mat: 'mahogany', top: 'marble', items: true }), R.x0 + 0.36, 0, PX, { collide: true });
  plan.prop(servingCounter({ w: 2.0, d: 0.6, mat: 'mahogany', top: 'marble', items: true }), R.x1 - 0.36, 0, NX, { collide: true });
  for (const z of [-2.2, 2.2]) { wallLight(plan, R.x0 + 0.06, z, PX); wallLight(plan, R.x1 - 0.06, z, NX); }
  plan.prop(mirrorWall({ w: 1.4, h: 0.9 }), R.x0 + 0.06, 0, PX, { y: Y + 1.95 });
  plan.prop(clockWall(), R.x1 - 0.06, 0, NX, { y: Y + 2.15 });
  // Louis XVI ceiling: gilt mouldings in a grid of panels
  const s = { x0: R.x0 + 0.1, x1: R.x1 - 0.1, z0: -plan.halfWidth(R.x0) + 0.1, z1: R.z1 - 0.1 };
  for (let x = s.x0 + 0.15; x <= s.x1; x += (s.x1 - s.x0 - 0.3) / 4) b.box(mats.gold, x - 0.03, top - 0.03, s.z0, x + 0.03, top - 0.004, s.z1, 'y');
  for (let z = s.z0 + 0.15; z <= s.z1; z += (s.z1 - s.z0 - 0.3) / 7) b.box(mats.gold, s.x0, top - 0.03, z - 0.03, s.x1, top - 0.004, z + 0.03, 'y');
}

// ================================================================ restaurant reception rooms (either side of funnel casing 4)

export function reception(plan, R, s) {
  const Y = plan.y, cover = s < 0 ? 'fabricGold' : 'fabricRed', zo = s * (wallFace(plan, R.x0) - 0.4);
  plan.prop(settee({ mat: cover, w: 1.85 }), -9.5, zo + s * 0.05, s > 0 ? NZ : PZ, { collide: true });
  tableGroup(plan, -9.5, s * 11.55, { r: 0.45, mat: 'mahogany', cover, seats: [[-1, 0], [1, 0], [0, -s]] });
  if (s < 0) tableGroup(plan, -12.2, -4.35, { r: 0.4, mat: 'mahogany', cover, seats: [[1, 0], [0, -1]] });
  else plan.prop(settee({ mat: cover }), R.x1 - 0.36, 10.85, NX, { collide: true });
  plan.prop(pottedPalm(), R.x1 - 0.55, s * 13.2, 0, { collide: false });
  plan.prop(pottedPalm(), R.x0 + 0.55, s * 13.2, 0, { collide: false });
  plan.prop(pottedPalm(), R.x1 - 0.55, s * 3.55, 0, { collide: false });
  for (const z of s < 0 ? [-11.6, -5.0] : [8.6, 13.3]) wallLight(plan, R.x0 + 0.06, z, PX);
  wallLight(plan, R.x1 - 0.06, s * 9.0, NX);
  plan.prop(mirrorWall({ w: 1.0, h: 1.2 }), R.x1 - 0.06, s * 12.6, NX, { y: Y + 1.75 });
}

// ================================================================ aft Grand Staircase lobby

export function aftLobby(plan, L) {
  for (const s of [-1, 1]) {
    tableGroup(plan, -4.1, s * 4.45, { r: 0.4, mat: 'oak', cover: s < 0 ? 'fabricGold' : 'fabricBlue', seats: [[-1, 0], [1, 0], [0, s]] });
    plan.prop(pottedPalm(), 1.5, s * 3.1, 0, { collide: false });
    for (const z of [3.4]) plan.prop(pilaster({ h: plan.h, mat: 'oak', capital: 'gold' }), L.x1 - 0.09, s * z, NX);
    wallLight(plan, L.x0 + 0.06, s * 2.65, PX);
  }
  plan.prop(clockWall(), L.x0 + 0.06, 0, PX, { y: plan.y + 2.1 });
}

// ================================================================ Café Parisien (starboard, x -36..-13.5)

export function cafe(plan, R, doors) {
  const Y = plan.y, top = Y + plan.h, b = plan.batch;
  const busy = (x, list, m) => list.some((d) => Math.abs(x - d.at) < d.w / 2 + m);
  // trellis with climbing ivy on the inboard wall and both end walls
  const zt = R.z0 + 0.065;
  for (let x = R.x0 + 1.1; x < R.x1 - 1.0; x += 2.06) if (!busy(x, doors.port, 1.05)) plan.prop(trellis({ w: 2.0, h: 2.35 }), x, zt, PZ, { y: Y + 0.05 });
  for (const [xx, rot, list] of [[R.x0 + 0.065, PX, doors.aft], [R.x1 - 0.065, NX, doors.fwd]]) {
    for (let z = R.z0 + 1.1; z < plan.halfWidth(xx) - 0.9; z += 2.06) if (!busy(z, list, 1.05)) plan.prop(trellis({ w: 2.0, h: 2.35 }), xx, z, rot, { y: Y + 0.05 });
  }
  // trellis beams on the ceiling
  for (let x = R.x0 + 0.5; x < R.x1; x += 1.2) b.box(mats.paintWhite, x - 0.03, top - 0.07, R.z0 + 0.05, x + 0.03, top, wallFace(plan, x), 'xXy');
  for (const z of [9.6, 11.0, 12.4]) b.box(mats.paintWhite, R.x0 + 0.05, top - 0.1, z - 0.03, R.x1 - 0.05, top - 0.07, z + 0.03, 'zZy');
  // wicker tables in front of the big windows and along the trellis
  const zw = wallFace(plan, -25) - 0.95;
  for (const xw of sideWindows(R.x0 + 0.4, R.x1 - 1.2)) {
    plan.prop(tableRound({ r: 0.35, mat: 'wicker', cloth: false, set: 2 }), xw, zw, 0, { collide: true });
    plan.prop(armchair({ kind: 'wicker' }), xw - 0.72, zw, PX, { collide: false });
    plan.prop(armchair({ kind: 'wicker' }), xw + 0.72, zw, NX, { collide: false });
  }
  for (const x of [-34.2, -31.5, -29.3, -24.6, -22.0, -16.0]) {
    plan.prop(tableRound({ r: 0.35, mat: 'wicker', set: 3 }), x, 9.75, 0, { collide: true });
    plan.prop(armchair({ kind: 'wicker' }), x - 0.72, 9.75, PX, { collide: false });
    plan.prop(armchair({ kind: 'wicker' }), x + 0.72, 9.75, NX, { collide: false });
    plan.prop(armchair({ kind: 'wicker' }), x, 10.47, NZ, { collide: false });
  }
  for (const [x, z] of [[R.x0 + 0.55, 9.0], [R.x1 - 0.55, 9.0], [R.x1 - 0.55, 13.2], [-20.5, 13.25], [-26.0, 13.25], [-31.5, 13.25]]) plan.prop(pottedPalm(), x, z, 0, { collide: false });
}

// ================================================================ 2nd class smoking room (x -59..-47.5)

export function smokingRoom(plan, R) {
  const Y = plan.y;
  const groups = [];
  for (const x of [-56.6, -53.25, -49.9]) for (const z of [-5.6, -1.9, 1.9, 5.6, 9.2, 12.2]) if (!(x === -49.9 && z === 12.2)) groups.push([x, z]);
  groups.forEach(([x, z], i) => {
    const card = i % 5 === 2;
    plan.prop(card ? tableRect({ w: 0.9, d: 0.9, mat: 'oak' }) : tableRound({ r: 0.4, mat: 'oak' }), x, z, 0, { collide: true });
    for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) plan.prop(card ? chairDining({ cls: 'second', mat: 'oak', seat: 'leatherGreen' }) : armchair({ kind: 'club', mat: 'leatherGreen' }), x + dx * (card ? 0.75 : 0.95), z + dz * (card ? 0.75 : 0.95), Math.atan2(dz, -dx), { collide: false });
  });
  // oak pilasters and sconces on the end walls, clock above the staircase door
  for (const z of [-4.0, 4.0, 8.0]) { plan.prop(pilaster({ h: plan.h, mat: 'oak' }), R.x0 + 0.09, z, PX); plan.prop(pilaster({ h: plan.h, mat: 'oak' }), R.x1 - 0.09, z, NX); }
  for (const z of [-6.0, 6.0, 10.2]) { wallLight(plan, R.x0 + 0.06, z, PX, true); wallLight(plan, R.x1 - 0.06, z, NX, true); }
  plan.prop(clockWall(), R.x1 - 0.06, 0, NX, { y: Y + 2.2 });
  plan.prop(pottedPalm(), R.x0 + 0.55, 13.2, 0, { collide: false });
}

/** bar of the smoking room; the counter stands behind the serving hatch in the near (starboard) wall. */
export function barRoom(ctx, hatchX) {
  // local u of the hatch centre
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
  // folded deck chairs stacked against a wall
  for (let i = 0; i < 4; i++) ctx.fit(bench({ w: 1.5, back: false, mat: 'oak' }), ['far:lo', 'far:hi', 'right:mid', 'left:mid'], { collide: true });
}

export function stairBench(plan, x, z, rot) { plan.prop(bench({ w: 1.8, mat: 'oak' }), x, z, rot, { collide: true }); }
