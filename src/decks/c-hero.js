// C deck ("Shelter Deck") – hand-detailed hero rooms and custom geometry. Used by c.js.
import { mats } from '../core/materials.js';
import {
  matOf, PRESETS, pipe,
  armchair, backBar, barrel, bench, bookcase, chairDining, column, desk, fireplace, gauge, liftCage, locker, machineBlock,
  mirrorWall, clockWall, piano, pilaster, pottedPalm, safe, sconce, servingCounter, settee, shelves, sofa, stool, tableRect,
  tableRound, tankH, valve, workbench, writingDesk, chest, switchboard,
} from '../interior/kit.js';

// rotations: prop front facing +x / -x / +z / -z
const PX = 0, NX = Math.PI, PZ = -Math.PI / 2, NZ = Math.PI / 2;

/**
 * Fills a gap in a fore-aft wall (z = const, xa..xb) with a parapet + head and either glazing, a brass grille or nothing
 * (serving hatch). neg / pos = wall materials on the -z / +z face; shelf = counter overhang on both sides.
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
    for (let x = a + 0.12; x < c - 0.05; x += 0.11) b.box(mats.brass, x - 0.008, Y + sill, z - 0.008, x + 0.008, Y + head, z + 0.008, 'xXzZ');
    for (const yy of [sill + 0.32, head - 0.12]) b.box(mats.brass, a, Y + yy, z - 0.012, c, Y + yy + 0.025, z + 0.012, 'yYzZ');
  }
  plan.world.addCollider(xa, Y, z - T - shelf, xb, Y + sill, z + T + shelf);
  plan.world.addCollider(xa, Y, z - T, xb, top, z + T);
}

/** framed poster / notice on a wall. Wall plane x = const (nx = ±1) or z = const (nz = ±1); (x, z) = point on the wall face. */
export function poster(plan, x, z, nx, nz, w = 0.5, h = 0.7, yc = 1.6, mat = 'paper') {
  const b = plan.batch, y0 = plan.y + yc - h / 2, y1 = y0 + h;
  if (nx) { b.box(mats.woodDark, x, y0, z - w / 2, x + nx * 0.02, y1, z + w / 2); b.box(matOf(mat), x, y0 + 0.04, z - w / 2 + 0.04, x + nx * 0.026, y1 - 0.04, z + w / 2 - 0.04); }
  else { b.box(mats.woodDark, x - w / 2, y0, z, x + w / 2, y1, z + nz * 0.02); b.box(matOf(mat), x - w / 2 + 0.04, y0 + 0.04, z, x + w / 2 - 0.04, y1 - 0.04, z + nz * 0.026); }
}

const wallLight = (plan, x, z, rot, plain = false) => plan.prop(sconce(plain ? { plain: true } : {}), x, z, rot, { y: plan.y + 1.85 });

/** table with armchairs around it (world coordinates) */
function group(plan, x, z, o = {}) {
  const cover = o.cover ?? 'fabricGreen', mat = o.mat ?? 'mahogany', d = (o.r ?? 0.45) + 0.55;
  plan.prop(tableRound({ r: o.r ?? 0.45, mat }), x, z, 0, { collide: true });
  const seats = o.seats ?? [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dx, dz] of seats) plan.prop(armchair({ kind: 'uph', mat: cover }), x + dx * d, z + dz * d, Math.atan2(dz, -dx), { collide: false });
}

// ---------------------------------------------------------------- forward Grand Staircase landing

export function grandLobby(plan, L) {
  const Y = plan.y, h = plan.h, b = plan.batch, w = plan.world;
  // three electric lifts forward of the stairs (decorative closed shafts)
  for (const z of [-1.6, 0, 1.6]) plan.prop(liftCage(), 46.3, z, NX);
  b.box(mats.oakPanel, 47.1, Y, -2.45, 47.92, Y + h, 2.45, 'xzZ');
  b.box(mats.oak, 45.46, Y + 2.4, -2.45, 47.1, Y + h, 2.45, 'xyzZ');
  for (const z of [-2.45, 2.45]) b.box(mats.oakPanel, 45.5, Y, z - 0.03, 47.1, Y + 2.4, z + 0.03, 'xzZ');
  for (const z of [-2.4, -0.8, 0.8, 2.4]) plan.prop(pilaster({ h: 2.4, w: 0.16, mat: 'oak', capital: 'gold' }), 45.46, z, NX);
  b.box(mats.gold, 45.44, Y + 2.38, -2.45, 45.47, Y + 2.42, 2.45, 'xyY');
  w.addCollider(45.5, Y, -2.48, 47.92, Y + h, 2.48);
  // oak columns around the stair well
  for (const x of [39.3, 44.7]) for (const s of [-1, 1]) plan.prop(column({ h, r: 0.16, mat: 'oak', capital: 'gold' }), x, s * 3.35, 0, { collide: true });
  // pilasters + sconces on the end walls
  for (const s of [-1, 1]) {
    for (const z of [3.4, 6.9]) { plan.prop(pilaster({ h, mat: 'oak', capital: 'gold' }), L.x0 + 0.09, s * z, PX); plan.prop(pilaster({ h, mat: 'oak', capital: 'gold' }), L.x1 - 0.09, s * z, NX); }
    wallLight(plan, L.x0 + 0.06, s * 5.15, PX); wallLight(plan, L.x1 - 0.06, s * 5.15, NX);
    plan.prop(pottedPalm(), L.x0 + 0.65, s * 6.2, 0, { collide: false }); plan.prop(pottedPalm(), L.x1 - 0.65, s * 6.2, 0, { collide: false });
  }
  plan.prop(clockWall(), L.x1 - 0.06, 5.15, NX, { y: Y + 2.25 });
  // seating: port side in front of the staterooms, starboard a waiting group opposite the purser's counter
  group(plan, 41.2, -5.3, { seats: [[-1, 0], [1, 0], [0, -1]] });
  plan.prop(sofa({ mat: 'fabricGreen', w: 1.8 }), 41.2, -3.45, NZ, { collide: true });
  group(plan, 40.6, 4.7, { seats: [[-1, 0], [1, 0], [0, -1]], cover: 'fabricRed' });
  plan.prop(settee({ mat: 'fabricRed' }), 44.4, 3.3, PZ, { collide: true });
}

/** small seating corners of the aft Grand Staircase lobby */
export function aftLobby(plan, L) {
  for (const s of [-1, 1]) {
    group(plan, -2.6, s * 5.4, { seats: [[-1, 0], [1, 0]], cover: s < 0 ? 'fabricGold' : 'fabricBlue', r: 0.4 });
    plan.prop(pottedPalm(), L.x1 - 0.65, s * 6.3, 0, { collide: false });
    wallLight(plan, L.x1 - 0.06, s * 5.2, NX);
    for (const z of [3.4, 6.9]) plan.prop(pilaster({ h: plan.h, mat: 'oak', capital: 'gold' }), L.x1 - 0.09, s * z, NX);
  }
}

// ---------------------------------------------------------------- purser / enquiry office

export function purserOffice(ctx) {
  PRESETS.office(ctx);
  ctx.fit(safe(), ['far:lo', 'right:hi', 'left:hi']);
  ctx.fit(locker({ n: 2, mat: 'oak' }), ['right:mid', 'left:mid']);
  ctx.fit(chest(), ['far:mid', 'right:lo']);
}
export function enquiryOffice(ctx) {
  // the counter with its grille is on the lobby side ('port' wall of the room); clerks' desks behind it
  ctx.fit(shelves({ kind: 'empty', w: 1.5, mat: 'oak' }), ['far:lo', 'far:hi']);
  ctx.fit(shelves({ kind: 'empty', w: 1.5, mat: 'oak' }), ['far:hi', 'far:mid']);
  if (ctx.put(desk({ w: 1.2, mat: 'oak' }), ctx.W / 2 + 0.6, ctx.D / 2, 'in')) ctx.put(chairDining({ cls: 'plain' }), ctx.W / 2 + 0.6, ctx.D / 2 - 0.7, 'in', { collide: false });
  ctx.fit(safe(), ['right:hi', 'left:hi']);
}

// ---------------------------------------------------------------- suites

export function suiteSitting(ctx) {
  const cover = ctx.room.id === 'C55' ? 'fabricRed' : 'fabricGold', mat = 'mahogany';
  const fp = ctx.fit(fireplace({ mat }), ['right:mid', 'left:mid'], { gap: 0 });
  ctx.fit(sofa({ mat: cover, w: 1.9 }), ['far:mid', 'far:lo', 'far:hi']);
  const u = ctx.W / 2, v = ctx.D / 2 + 0.35;
  if (ctx.put(tableRound({ r: 0.5, mat, lamp: true }), u, v, 'in')) {
    ctx.put(armchair({ kind: 'uph', mat: cover }), u - 1.05, v, 'right', { collide: false });
    ctx.put(armchair({ kind: 'uph', mat: cover }), u + 1.05, v, 'left', { collide: false });
    ctx.put(armchair({ kind: 'uph', mat: cover }), u, v - 1.05, 'in', { collide: false });
  }
  if (ctx.fit(writingDesk({ mat }), ['near:hi', 'left:lo', 'right:lo'])) { /* chair is optional */ }
  ctx.fit(bookcase({ mat, w: 1.0 }), ['left:hi', 'right:hi', 'near:mid']);
  ctx.fit(pottedPalm(), ['far:lo', 'far:hi'], { collide: false });
  ctx.mount(sconce(), 'far', ctx.W * 0.22, 1.85); ctx.mount(sconce(), 'far', ctx.W * 0.78, 1.85);
  ctx.mount(mirrorWall({ w: 0.7, h: 1.0 }), 'near', ctx.W - 0.9, 2.05);
  if (fp) ctx.glow(ctx.W / 2, ctx.D / 2, 0.5);
}

// ---------------------------------------------------------------- barber shop

export function barberShop(ctx) {
  PRESETS.barber(ctx);
  ctx.fit(servingCounter({ w: 1.8, d: 0.5, mat: 'mahogany', top: 'marble', items: true }), ['near:hi', 'right:lo', 'left:hi']);
  ctx.fit(shelves({ kind: 'bottles', w: 1.2, mat: 'mahogany' }), ['right:lo', 'left:lo', 'near:mid']);
  ctx.fit(stool({ mat: 'mahogany' }), ['near:mid'], { collide: false });
  // souvenirs hanging from the ceiling: pennants, dolls, small flags
  const b = ctx.plan.batch, top = ctx.y + ctx.h, r = ctx.rng;
  const cols = ['fabricRed', 'fabricBlue', 'fabricGold', 'paper', 'fabricGreen', 'linen'];
  ctx.grid(0.8, 0.9, (u, v, i, j) => {
    const p = ctx.at(u + (r() - 0.5) * 0.3, v + (r() - 0.5) * 0.3), len = 0.22 + r() * 0.2, k = (i * 3 + j) % 4, m = matOf(cols[(i + 2 * j) % cols.length]);
    b.box(mats.rope, p.x - 0.004, top - len, p.z - 0.004, p.x + 0.004, top, p.z + 0.004, 'xXzZ');
    if (k === 0) b.box(m, p.x - 0.12, top - len - 0.17, p.z - 0.005, p.x + 0.12, top - len, p.z + 0.005);            // pennant
    else if (k === 1) b.box(m, p.x - 0.005, top - len - 0.15, p.z - 0.1, p.x + 0.005, top - len, p.z + 0.1);          // flag
    else if (k === 2) { b.box(m, p.x - 0.04, top - len - 0.16, p.z - 0.03, p.x + 0.04, top - len - 0.05, p.z + 0.03); b.box(mats.porcelain, p.x - 0.028, top - len - 0.05, p.z - 0.028, p.x + 0.028, top - len, p.z + 0.028); } // doll
    else b.box(mats.brass, p.x - 0.05, top - len - 0.07, p.z - 0.05, p.x + 0.05, top - len, p.z + 0.05);                // trinket box
  }, 0.5);
}

// ---------------------------------------------------------------- 2nd class library + promenades

export function library(plan, R, WZ, bays) {
  const Y = plan.y, h = plan.h;
  // sycamore panelling: glazed bays towards the enclosed promenades
  for (const s of [-1, 1]) for (const [xa, xb] of bays) bay(plan, xa, xb, s * WZ, { sill: 1.12, head: 2.2, neg: s < 0 ? 'whitePanel' : 'mahogany', pos: s < 0 ? 'mahogany' : 'whitePanel', frame: 'mahogany', glass: true });
  // the big bookcase (aft wall) and a second one opposite
  for (const z of [-1.45, 0, 1.45]) { plan.prop(bookcase({ w: 1.4, mat: 'mahogany' }), R.x0 + 0.27, z, PX, { collide: true }); plan.prop(bookcase({ w: 1.4, mat: 'mahogany' }), R.x1 - 0.27, z, NX, { collide: true }); }
  // columns
  for (const x of [R.x0 + 3.0, (R.x0 + R.x1) / 2, R.x1 - 3.0]) for (const s of [-1, 1]) plan.prop(column({ h, r: 0.14, mat: 'pine', capital: 'mahogany' }), x, s * 3.4, 0, { collide: true });
  for (const s of [-1, 1]) {
    // writing tables in the window bays
    for (const [xa, xb] of bays) {
      const x = (xa + xb) / 2;
      plan.prop(writingDesk({ mat: 'mahogany' }), x, s * (WZ - 0.4), s < 0 ? PZ : NZ, { collide: true });
      plan.prop(chairDining({ cls: 'second', mat: 'mahogany' }), x, s * (WZ - 1.1), s < 0 ? NZ : PZ, { collide: false });
    }
    for (let i = 0; i < bays.length - 1; i++) wallLight(plan, (bays[i][1] + bays[i + 1][0]) / 2, s * (WZ - 0.06), s < 0 ? PZ : NZ);
    plan.prop(pottedPalm(), R.x1 - 0.7, s * (WZ - 0.7), 0, { collide: false });
    // upholstered groups
    for (const x of [R.x0 + 2.6, (R.x0 + R.x1) / 2, R.x1 - 2.6]) group(plan, x, s * 6.7, { cover: s < 0 ? 'fabricGreen' : 'fabricRed', r: 0.5 });
    wallLight(plan, R.x0 + 0.06, s * 6.5, PX); wallLight(plan, R.x1 - 0.06, s * 7.6, NX);
  }
  // centre: reading tables
  for (const x of [R.x0 + 3.0, R.x1 - 3.0]) {
    plan.prop(tableRect({ w: 1.8, d: 0.9, mat: 'mahogany', lamp: true }), x, 0, 0, { collide: true });
    for (const dz of [-0.45, 0.45]) { plan.prop(chairDining({ cls: 'second', mat: 'mahogany' }), x - 0.8, dz, PX, { collide: false }); plan.prop(chairDining({ cls: 'second', mat: 'mahogany' }), x + 0.8, dz, NX, { collide: false }); }
  }
  plan.prop(clockWall(), R.x1 - 0.06, 2.75, NX, { y: Y + 2.2 });
}

export function promenade(plan, x0, x1, s, hw) {
  // benches along the ship's side, looking inboard; skip the ends (doors)
  for (let x = x0 + 2.4; x < x1 - 1.5; x += 4.05) plan.prop(bench({ w: 1.8, mat: 'oak' }), x, s * (hw - 0.32), s > 0 ? NZ : PZ, { collide: true });
}

// ---------------------------------------------------------------- 3rd class general room / smoking room

/**
 * 3rd class saloons under the poop. s = +1 starboard (general room), -1 port (smoking room).
 * R = room rect (x0 aft, x1 = well-deck bulkhead, whose inner face is 0.15 m aft of x1), zi = |z| of the inner wall,
 * doorX = x of the entrance door in the inner wall (kept free), hatch = [xa, xb] of the bar hatch in the inner wall (smoking room).
 */
export function thirdSaloon(plan, R, s, zi, smoking, doorX, hatch) {
  const b = plan.batch, Y = plan.y, wood = smoking ? 'oak' : 'pine', fwdX = R.x1 - 0.15;
  const fits = (x, zEdge) => zEdge + 0.3 < plan.halfWidth(x);
  // benches along the forward (well-deck) bulkhead, under the portholes
  for (const z of [zi + 1.2, zi + 3.1, zi + 5.0]) if (fits(fwdX - 0.5, z + 0.9)) plan.prop(bench({ w: 1.8, mat: smoking ? 'oak' : 'pine', iron: false }), fwdX - 0.3, s * z, NX, { collide: true });
  if (!smoking) {
    // upright piano against the aft wall
    plan.prop(piano(), R.x0 + 0.38, s * (zi + 1.0), PX, { collide: true });
    plan.prop(stool({ mat: 'oak' }), R.x0 + 1.05, s * (zi + 1.0), 0, { collide: false });
    // teak tables with fixed benches on both sides (teak = 'oak' material)
    for (const x of [R.x0 + 3.4, R.x0 + 6.2, R.x0 + 9.0, R.x0 + 11.8]) for (const z of [zi + 1.9, zi + 4.1]) {
      if (!fits(x - 1.0, z + 0.9) || Math.abs(x - doorX) < 2.0) continue;
      plan.prop(tableRect({ w: 1.8, d: 0.75, mat: 'oak' }), x, s * z, 0, { collide: true });
      plan.prop(bench({ w: 1.8, mat: 'oak', iron: false }), x - 0.72, s * z, PX, { collide: true });
      plan.prop(bench({ w: 1.8, mat: 'oak', iron: false }), x + 0.72, s * z, NX, { collide: true });
    }
    // White Star Line sailing posters and notices
    poster(plan, R.x0 + 0.05, s * (zi + 2.6), 1, 0, 0.55, 0.8, 1.75);
    poster(plan, fwdX - 0.01, s * (zi + 2.15), -1, 0, 0.5, 0.7, 1.75, 'paper');
    for (const x of [R.x0 + 3.0, R.x0 + 7.6, R.x0 + 11.0]) poster(plan, x, s * (zi + 0.05), 0, s, 0.8, 0.55, 1.7);
    wallLight(plan, R.x0 + 0.06, s * (zi + 3.6), PX, true);
    plan.prop(clockWall(), fwdX - 0.01, s * (zi + 4.05), NX, { y: Y + 2.15 });
  } else {
    // small oak tables with chairs, brass spittoons on the floor
    for (const x of [R.x0 + 2.8, R.x0 + 5.4, R.x0 + 8.0, R.x0 + 10.6]) for (const z of [zi + 2.0, zi + 4.4]) {
      if (!fits(x - 0.8, z + 0.8) || Math.abs(x - doorX) < 1.7) continue;
      if (hatch && x - 1.2 < hatch[1] && z < zi + 2.5) continue;
      plan.prop(tableRect({ w: 0.9, d: 0.9, mat: 'oak' }), x, s * z, 0, { collide: true });
      for (const [dx, dz] of [[-0.75, 0], [0.75, 0], [0, -0.75], [0, 0.75]]) plan.prop(chairDining({ cls: 'plain', mat: 'oak' }), x + dx, s * z + dz, Math.atan2(dz, -dx), { collide: false });
      const sx = x + 0.9, sz = s * (z + 0.9);
      b.box(mats.brass, sx - 0.11, Y, sz - 0.11, sx + 0.11, Y + 0.1, sz + 0.11, 'xXzZ'); b.box(mats.brass, sx - 0.14, Y + 0.1, sz - 0.14, sx + 0.14, Y + 0.13, sz + 0.14); b.box(mats.iron, sx - 0.08, Y + 0.131, sz - 0.08, sx + 0.08, Y + 0.132, sz + 0.08, 'Y');
    }
    // benches along the aft wall
    for (const z of [zi + 2.4, zi + 4.3]) if (fits(R.x0 + 0.5, z + 0.9)) plan.prop(bench({ w: 1.8, mat: 'oak', iron: false }), R.x0 + 0.3, s * z, PX, { collide: true });
    wallLight(plan, R.x0 + 0.06, s * (zi + 1.2), PX, true); wallLight(plan, fwdX - 0.01, s * (zi + 2.15), NX, true);
    poster(plan, R.x0 + 7.0, s * (zi + 0.05), 0, s, 0.5, 0.7, 1.75);
    plan.prop(clockWall(), R.x0 + 4.0, s * (zi + 0.06), s > 0 ? PZ : NZ,{ y: Y + 2.1 });
  }
}

export function barPantry(ctx) {
  // long narrow pantry behind the serving hatch of the smoking room
  ctx.fit(backBar({ w: Math.min(2.4, ctx.W - 2.2) }), ['far:hi', 'far:mid'], { gap: 0 });
  ctx.fit(barrel(), ['far:lo', 'left:hi']); ctx.fit(barrel(), ['far:lo', 'left:hi', 'left:mid']);
}

// ---------------------------------------------------------------- steering gear

export function steeringGear(plan, R) {
  const Y = plan.y, h = plan.h, b = plan.batch, w = plan.world, S = mats.steelDark, I = mats.iron;
  const cx = R.x0 + 2.5, Rq = 2.6, A = (50 * Math.PI) / 180, yq = Y + 0.72;
  // rudder stock + head
  plan.prop(column({ h, r: 0.3, mat: 'steelDark' }), cx, 0, 0, { collide: true });
  b.box(I, cx - 0.5, yq - 0.12, -0.5, cx + 0.5, yq + 0.3, 0.5);
  // quadrant: three arms + toothed rim
  const N = 14, pt = (r, a) => [cx + Math.cos(a) * r, Math.sin(a) * r];
  for (const a of [-A, 0, A]) { const p = pt(0.3, a), q = pt(Rq - 0.1, a); b.bar(S, [p[0], yq, p[1]], [q[0], yq, q[1]], 0.22, 0.16); }
  for (let i = 0; i < N; i++) {
    const a0 = -A + (2 * A * i) / N, a1 = -A + (2 * A * (i + 1)) / N, am = (a0 + a1) / 2;
    const i0 = pt(Rq - 0.3, a0), i1 = pt(Rq - 0.3, a1), o0 = pt(Rq, a0), o1 = pt(Rq, a1);
    b.poly(S, [[i0[0], yq + 0.2, i0[1]], [o0[0], yq + 0.2, o0[1]], [o1[0], yq + 0.2, o1[1]], [i1[0], yq + 0.2, i1[1]]], [0, 1, 0]);
    b.poly(S, [[i0[0], yq - 0.02, i0[1]], [o0[0], yq - 0.02, o0[1]], [o1[0], yq - 0.02, o1[1]], [i1[0], yq - 0.02, i1[1]]], [0, -1, 0]);
    b.poly(S, [[o0[0], yq - 0.02, o0[1]], [o1[0], yq - 0.02, o1[1]], [o1[0], yq + 0.2, o1[1]], [o0[0], yq + 0.2, o0[1]]], [Math.cos(am), 0, Math.sin(am)]);
    b.poly(S, [[i0[0], yq - 0.02, i0[1]], [i1[0], yq - 0.02, i1[1]], [i1[0], yq + 0.2, i1[1]], [i0[0], yq + 0.2, i0[1]]], [-Math.cos(am), 0, -Math.sin(am)]);
    const t = pt(Rq + 0.05, am); b.box(mats.brass, t[0] - 0.05, yq, t[1] - 0.05, t[0] + 0.05, yq + 0.18, t[1] + 0.05);
  }
  w.addCollider(cx - 0.5, Y, -Rq * Math.sin(A), cx + Rq + 0.1, Y + 1.0, Rq * Math.sin(A));
  // two three-cylinder steering engines with pinion shaft
  const ex = cx + Rq + 0.95;
  for (const s of [-1, 1]) {
    plan.prop(machineBlock({ kind: 'engine', w: 1.9, d: 1.0, h: 1.5 }), ex, s * 2.75, 0, { collide: true });
    plan.prop(valve({ r: 0.14 }), ex - 0.62, s * 2.75, 0, { y: Y + 0.9 });
    b.box(mats.brass, cx + Rq + 0.02, yq - 0.05, s * 1.2 - 0.14, cx + Rq + 0.3, yq + 0.25, s * 1.2 + 0.14);
    pipe(plan.zone(ex), 'copper', [[ex + 0.4, Y + 1.2, s * 3.3], [ex + 0.4, Y + h - 0.15, s * 3.3], [R.x1 - 0.2, Y + h - 0.15, s * 3.3]], 0.045);
    plan.prop(gauge(), R.x1 - 0.06, s * 3.6, NX, { y: Y + 1.6 });
  }
  b.bar(I, [cx + Rq + 0.16, yq + 0.02, -2.7], [cx + Rq + 0.16, yq + 0.02, 2.7], 0.1, 0.1);
  w.addCollider(cx + Rq, Y, -1.8, cx + Rq + 0.32, Y + 1.0, 1.8);
  // telemotor receiver, hydraulic tank, workbench, spare gear
  plan.prop(machineBlock({ kind: 'pump', w: 1.0, d: 0.7, h: 1.2 }), R.x1 - 0.55, -1.4, NX, { collide: true });
  plan.prop(switchboard({ w: 1.6 }), R.x1 - 0.25, -4.6, NX, { collide: true });
  plan.prop(workbench({ w: 1.6 }), R.x1 - 0.45, 5.1, NX, { collide: true });
  plan.prop(tankH({ r: 0.4, l: 1.6 }), cx + 0.6, -4.0, NZ, { collide: true });
  plan.prop(chest(), cx + 0.6, 4.1, PZ, { collide: true });
  plan.prop(gauge(), R.x1 - 0.06, -0.2, NX, { y: Y + 1.7 });
}

// ---------------------------------------------------------------- windlass machinery (under the forecastle)

export function windlassRoom(plan, R) {
  const Y = plan.y, h = plan.h, b = plan.batch, w = plan.world;
  const ex = R.x0 + 3.0;
  for (const s of [-1, 1]) {
    plan.prop(machineBlock({ kind: 'engine', w: 1.6, d: 1.1, h: 1.5 }), ex, s * 2.0, 0, { collide: true });
    plan.prop(valve({ r: 0.13 }), ex - 0.68, s * 2.0, 0, { y: Y + 0.95 });
    // vertical spindle up to the windlass on the forecastle deck, bevel gear casing
    plan.prop(column({ h, r: 0.11, mat: 'steelDark' }), ex + 1.25, s * 2.0, 0, { collide: true });
    b.box(mats.iron, ex + 0.55, Y, s * 2.0 - 0.35, ex + 1.6, Y + 0.55, s * 2.0 + 0.35);
    // chain pipe (spurling pipe) leading the anchor cable down to the chain locker
    plan.prop(column({ h, r: 0.24, mat: 'steelDark' }), R.x0 + 6.2, s * 1.35, 0, { collide: true });
    b.box(mats.rust, R.x0 + 5.85, Y, s * 1.35 - 0.35, R.x0 + 6.55, Y + 0.08, s * 1.35 + 0.35);
    pipe(plan.zone(ex), 'copper', [[R.x0 + 0.15, Y + h - 0.2, s * 2.6], [ex, Y + h - 0.2, s * 2.6], [ex, Y + 1.45, s * 2.6]], 0.05);
    pipe(plan.zone(ex), 'steelDark', [[ex - 0.3, Y + 0.3, s * 2.9], [R.x0 + 0.15, Y + 0.3, s * 2.9]], 0.07);
    plan.prop(gauge(), R.x0 + 0.06, s * 1.4, PX, { y: Y + 1.65 });
  }
  w.addCollider(ex + 0.55, Y, -2.35, ex + 1.6, Y + 0.55, -1.65); w.addCollider(ex + 0.55, Y, 1.65, ex + 1.6, Y + 0.55, 2.35);
}

export function carpenter(ctx) {
  ctx.fit(workbench({ w: Math.min(1.8, ctx.W - 1.4) }), ['far:mid', 'right:hi', 'left:hi']);
  PRESETS.store(ctx);
}
