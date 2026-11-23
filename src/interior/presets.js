// Interior kit – furnishing presets. Each preset is fn(ctx) with ctx = FurnishCtx (rooms.js):
// local frame u (along the door wall, door in the low-u half) × v (into the room), ctx.W × ctx.D metres.
// Use ctx.fit(prop, ['wall:snug', ...]) / ctx.put(prop, u, v, dir); both refuse spots that are blocked.
import * as THREE from 'three';
import * as P from './props.js';
import { mats as M } from '../core/materials.js';

const COVERS = ['fabricGold', 'fabricRed', 'fabricBlue', 'fabricGreen'];
const SIDE_HI = ['right:hi', 'left:hi', 'far:hi', 'far:lo'];

// ---------------------------------------------------------------- lived-in clutter (kit fine detail)
// Everything here is merged into the deck batch (no extra meshes, no colliders), drawn from ctx.crng (deterministic per
// room, independent of the furniture layout) and gated by ctx.fine (TIER.fine, -1 = off). Positions are relative to a
// furniture record saved after ctx.fit()/put(): dx along its front, dz along its width, y above the floor.

/** run fn with ctx.last temporarily set to the saved furniture record L */
function on(ctx, L, fn) { if (!L) return false; const keep = ctx.last; ctx.last = L; try { return fn() !== false; } finally { ctx.last = keep; } }
/** record of the prop placed by the last successful fit/put (null if it failed) */
const got = (ctx, ok) => (ok ? ctx.last : null);
/** floor spot (square of size e) relative to ctx.last: free of walls, doors, furniture and earlier clutter? reserves it */
function spot(ctx, dx, dz, e) {
  const p = ctx.rel(dx, dz, 0), u = (p[0] - ctx.o[0]) * ctx.U[0] + (p[2] - ctx.o[1]) * ctx.U[1], v = (p[0] - ctx.o[0]) * ctx.V[0] + (p[2] - ctx.o[1]) * ctx.V[1];
  if (!ctx.free(u, v, e, e)) return false;
  const q = ctx._rect(u, v, e, e); q.h = 0.4; ctx.occupied.push(q);
  return true;
}
/** reserve a floor spot w × d (h tall) against a wall with fit(); the record is ctx.last afterwards (geometry drawn by the caller) */
function slot(ctx, w, d, h, prefs) {
  const g = new THREE.Group(); g.userData.fp = { w, d, h };
  return ctx.fit(g, prefs, { collide: false, merge: true, clutter: true, gap: 0.03 }) ? ctx.last : null;
}
/** a prop (suitcase, kit bag …) merged on the floor against a wall */
function floorProp(ctx, prop, prefs) { return ctx.fit(prop, prefs, { collide: false, merge: true, clutter: true, gap: 0.03 }) ? ctx.last : null; }
/** heights of the sleeping surfaces (top of blanket / cover) */
const BED_TOP = 0.522, BERTH_TOP = [0.5, 1.5], BUNK_TOP = [0.46, 1.36];
/** batched box relative to ctx.last (inside ctx.bits) */
const bx = (b, R, mat, dx0, dz0, dx1, dz1, y0, y1, faces = 'xXYzZ') => { const p = R(dx0, dz0, y0), q = R(dx1, dz1, y1); b.box(mat, p[0], p[1], p[2], q[0], q[1], q[2], faces); };
const cyl = (b, R, mat, dx, dz, y0, y1, r, n = 6, caps = true) => b.prism(mat, R(dx, dz, y0), R(dx, dz, y1), r, n, caps);

/** pair of shoes (toes along +dx) standing on y */
function shoes(ctx, dx, dz, y = 0, mat = M.leather, tall = false) {
  ctx.bits((b, R) => {
    for (const s of [-1, 1]) {
      const z = dz + s * 0.065;
      bx(b, R, mat, dx - 0.13, z - 0.043, dx + 0.13, z + 0.043, y, y + 0.03);
      bx(b, R, mat, dx - 0.125, z - 0.038, dx + (tall ? -0.01 : 0.04), z + 0.038, y + 0.03, y + (tall ? 0.36 : 0.085));
    }
  });
}
/** soap in a dish, tooth mug, bottles, a brush – on a surface at height y around (dx, dz); n = number of bottles */
function toiletries(ctx, dx, dz, y, n = 2, dir = 1) {
  ctx.bits((b, R) => {
    bx(b, R, M.porcelain, dx - 0.045, dz - 0.03, dx + 0.045, dz + 0.03, y, y + 0.01);
    bx(b, R, M.paintCream, dx - 0.03, dz - 0.02, dx + 0.03, dz + 0.02, y + 0.01, y + 0.028);
    const z1 = dz + dir * 0.075;
    if (n > 0) cyl(b, R, M.porcelain, dx - 0.01, z1, y, y + 0.09, 0.03, 7);
    for (let i = 1; i < n; i++) { const z = dz + dir * (0.075 + i * 0.05), h = 0.1 + 0.03 * (i % 2); cyl(b, R, M.glass, dx - 0.04, z, y, y + h, 0.02); cyl(b, R, M.brass, dx - 0.04, z, y + h, y + h + 0.018, 0.009, 5); }
  });
}
/** hairbrush, comb, hand mirror and scent bottles on a dressing table top (y) */
function vanity(ctx, dx, y) {
  ctx.bits((b, R) => {
    bx(b, R, M.woodDark, dx - 0.025, -0.28, dx + 0.025, -0.12, y, y + 0.022); bx(b, R, M.linen, dx - 0.022, -0.26, dx + 0.022, -0.14, y + 0.022, y + 0.035);
    bx(b, R, M.woodDark, dx + 0.04, -0.27, dx + 0.055, -0.15, y, y + 0.006);
    bx(b, R, M.chrome, dx - 0.04, 0.1, dx + 0.04, 0.3, y, y + 0.01);
    for (const [z, h] of [[0.18, 0.11], [0.24, 0.08]]) { cyl(b, R, M.glass, dx + 0.07, z, y, y + h, 0.025); cyl(b, R, M.glass, dx + 0.07, z, y + h, y + h + 0.025, 0.012, 5); }
  });
}
/** neatly folded clothes / blanket bundle on a surface (y) */
function folded(ctx, dx, dz, y, mat, n = 2) {
  ctx.bits((b, R) => { for (let i = 0; i < n; i++) bx(b, R, i % 2 ? M.linen : mat, dx - 0.15 + i * 0.01, dz - 0.18 + i * 0.015, dx + 0.15 - i * 0.012, dz + 0.17 - i * 0.01, y + i * 0.04, y + (i + 1) * 0.04); });
}
/** canvas kit bag standing upright on the floor */
function kitBag(ctx, dx, dz) {
  ctx.bits((b, R) => { cyl(b, R, M.canvas, dx, dz, 0, 0.58, 0.15, 8); cyl(b, R, M.rope, dx, dz, 0.46, 0.49, 0.152, 8, false); cyl(b, R, M.canvas, dx, dz, 0.58, 0.64, 0.06, 6); });
}
/** zinc bucket, optional mop or broom leaning against the wall behind (slot frame: wall at dx = -d/2) */
function bucket(ctx, dx, dz) {
  ctx.bits((b, R) => {
    cyl(b, R, M.steel, dx, dz, 0, 0.28, 0.13, 8, false); b.disc(M.steelDark, R(dx, dz, 0.24), [0, 1, 0], 0.125, 8);
    b.bar(M.iron, R(dx, dz - 0.13, 0.3), R(dx, dz + 0.13, 0.3), 0.008, 0.008);
  });
}
function broom(ctx, dz, d, mop = false) {
  ctx.bits((b, R) => {
    const foot = -d / 2 + 0.2, top = -d / 2 + 0.035;
    b.prism(M.pine, R(foot, dz, 0.07), R(top, dz, 1.3), 0.014, 5, true);
    if (mop) { bx(b, R, M.linen, foot - 0.07, dz - 0.07, foot + 0.07, dz + 0.07, 0, 0.09); }
    else { bx(b, R, M.woodDark, foot - 0.04, dz - 0.14, foot + 0.04, dz + 0.14, 0.05, 0.09); bx(b, R, M.wicker, foot - 0.035, dz - 0.13, foot + 0.035, dz + 0.13, 0, 0.05); }
  });
}
/** enamel mugs and tin plates along a mess table (width w, top y) */
function messGear(ctx, w, y, c) {
  ctx.bits((b, R) => {
    const n = Math.max(1, Math.round(w / 0.6));
    for (let i = 0; i < n; i++) {
      if (c() < 0.35) continue;
      const z = -w / 2 + (w / n) * (i + 0.5), s = c() < 0.5 ? -1 : 1;
      b.disc(M.steel, R(s * 0.22, z, y + 0.006), [0, 1, 0], 0.1, 8);
      cyl(b, R, M.porcelain, s * 0.12, z + 0.16, y, y + 0.085, 0.035, 7);
      bx(b, R, M.porcelain, s * 0.12 - 0.006, z + 0.195, s * 0.12 + 0.006, z + 0.215, y + 0.02, y + 0.07);
    }
  });
}

/** hang a wall prop (pictures, hooks) on a wall where the floor in front is free; tries a few positions */
function hang(ctx, prop, walls, hgt, depth = 0.25, merge = false) {
  const fp = prop.userData.fp ?? { w: 0.5 };
  for (const wall of [].concat(walls)) {
    if (wall === ctx.hull) continue;
    const side = wall === 'left' || wall === 'right', len = side ? ctx.D : ctx.W;
    for (const t of [0.5, 0.3, 0.7, 0.18, 0.82]) {
      const p = len * t;
      if (p - fp.w / 2 < 0.15 || p + fp.w / 2 > len - 0.15) continue;
      const [u, v] = wall === 'left' ? [depth / 2 + 0.01, p] : wall === 'right' ? [ctx.W - depth / 2 - 0.01, p] : wall === 'near' ? [p, depth / 2 + 0.01] : [p, ctx.D - depth / 2 - 0.01];
      if (!ctx.free(u, v, side ? depth : fp.w, side ? fp.w : depth)) continue;
      if (ctx.mount(prop, wall, p, hgt, { merge })) return true;
    }
  }
  return false;
}
/** picture above the prop placed last against a wall (beds, sofas, desks) */
function pictureAbove(ctx, prop, hgt) {
  const L = ctx.last;
  if (!L?.wall || L.wall === ctx.hull) return false;
  return ctx.mount(prop, L.wall, L.pos, hgt);
}

/** chairs around a table at local (u,v); sides: list of [du, dv, dir] */
function chairs(ctx, make, u, v, list) { for (const [du, dv, dir] of list) ctx.put(make(), u + du, v + dv, dir, { collide: false }); }

function cabinFirst(ctx) {
  const r = ctx.rng, o = ctx.opts, cover = ctx.pick(COVERS), big = ctx.W * ctx.D > 13.5, style = r() < 0.5 ? 'brass' : 'mahogany';
  const beds = o.beds ?? (big ? 2 : 1);
  const wide = beds === 1 && ctx.W > 3.2, R = {};
  if (ctx.fit(P.bedFirst({ style, cover, wide }), SIDE_HI)) {
    const d = ctx.drng; R.bed = ctx.last;
    if (d() < 0.75) ctx.attach(P.slippers({ v: Math.floor(d() * 2) }), (wide ? 0.7 : 0.5) + 0.18, -0.5, { turn: -Math.PI / 2 });
    pictureAbove(ctx, P.picture({ w: 0.6, h: 0.45, v: Math.floor(d() * 4) }), 1.62);
  }
  if (beds > 1) R.bed2 = got(ctx, ctx.fit(P.bedFirst({ style, cover }), ['left:hi', 'right:hi', 'far:lo', 'far:hi']));
  const life = ctx.drng() < 0.85;
  if (ctx.fit(P.wardrobe({ mirror: true, open: r() < 0.2, life }), ['left:lo', 'right:lo', 'near:hi', 'far:lo'])) { R.wardrobe = ctx.last; R.life = life; }
  R.basin = got(ctx, ctx.fit(P.washbasinMarble(), ['far:mid', 'left:mid', 'right:mid', 'near:hi']));
  if (ctx.W * ctx.D > 9 && ctx.fit(P.dressingTable(), ['near:hi', 'far:mid', 'right:lo', 'left:mid'])) R.dressing = ctx.last;
  if (big) ctx.fit(P.sofa({ mat: cover, w: 1.6 }), ['near:hi', 'left:mid', 'right:mid', 'far:mid']);
  ctx.fit(P.armchair({ kind: 'uph', mat: cover }), ['far:lo', 'near:hi', 'left:mid', 'right:lo']);
  ctx.fit(P.heater(), ['near:hi', 'far:lo', 'left:lo'], { collide: false });
  if (r() < 0.55) { const bigT = r() < 0.4; if (ctx.fit(P.trunk({ big: bigT }), ['right:lo', 'left:mid', 'far:mid'])) R.trunk = ctx.last; }
  if (big && ctx.put(P.tableRound({ r: 0.35 }), ctx.W / 2, ctx.D / 2, 'in')) ctx.attach(ctx.drng() < 0.5 ? P.newspaper() : P.bookPile({ v: Math.floor(ctx.drng() * 3) }), 0.05, 0.02, { y: 0.75, turn: ctx.drng() * 1.5 });
  if (ctx.drng() < 0.5) hang(ctx, P.picture({ w: 0.45, h: 0.35, v: Math.floor(ctx.drng() * 4) }), ['far', 'left', 'right'], 1.65, 0.6);
  clutterFirst(ctx, R);
}

/** 1st class: shoes put out under the bed, carafe and toiletries on the washbasin, brushes and scent on the dressing
 * table, a newspaper on the bed, hat box, clothes on hooks, a suitcase */
function clutterFirst(ctx, R) {
  const f = ctx.fine ?? -1, c = ctx.crng;
  if (f < 0) return;
  for (const bed of [R.bed, R.bed2]) on(ctx, bed, () => { if (c() < 0.8) shoes(ctx, bed.fp.d / 2 - 0.16, 0.5 + c() * 0.2, 0, c() < 0.5 ? M.leather : M.woodDark); });
  if (f < 1) return;
  on(ctx, R.basin, () => { ctx.stow(P.carafe(), 0.02, 0.29, { y: 0.87 }); if (f >= 2) toiletries(ctx, 0.04, -0.25, 0.87, 1 + Math.floor(c() * 2), -1); });
  if (c() < 0.5) on(ctx, R.bed, () => ctx.stow(P.newspaper(), -0.08, 0.55, { y: BED_TOP, turn: 0.3 + c() }));
  if (f < 2) return;
  on(ctx, R.dressing, () => vanity(ctx, 0.12, 0.755));
  if (R.trunk && c() < 0.7) on(ctx, R.trunk, () => ctx.stow(P.hatBox({ v: Math.floor(c() * 2) }), 0, -0.1, { y: R.trunk.fp.h + 0.008, turn: c() }));
  else if (R.wardrobe && !R.life && ctx.h > 2.5) on(ctx, R.wardrobe, () => ctx.stow(P.hatBox({ v: 1 }), -0.04, 0, { y: 2.02 }));
  if (c() < 0.6) hang(ctx, P.coatHooks({ n: 2, v: Math.floor(c() * 3) }), ['near', 'left', 'right', 'far'], 1.75, 0.45, true);
  if (f < 3) return;
  if (c() < 0.7) floorProp(ctx, P.suitcase(), ['far:hi', 'left:mid', 'right:mid', 'near:hi']);
  on(ctx, R.bed, () => { if (c() < 0.5) folded(ctx, -0.05, 0.72, BED_TOP, M.fabricBlue, 1); else ctx.stow(P.bookPile({ v: Math.floor(c() * 3) }), 0.1, -0.2, { y: BED_TOP, turn: c() }); });
}

function cabinFirstSuite(ctx) {
  const r = ctx.rng, cover = ctx.pick(COVERS), mat = ctx.pick(['mahogany', 'oak']), R = {}, dbl = ctx.W > 4;
  R.bed = got(ctx, ctx.fit(P.bedFirst({ canopy: true, cover, wide: true }), SIDE_HI));
  if (ctx.opts.fireplace !== false && ctx.W > 3.4 && ctx.fit(P.fireplace({ mat }), ['left:mid', 'far:mid', 'right:mid'], { gap: 0 })) { /* glow added below */ }
  ctx.fit(P.wardrobe({ mirror: true, mat }), ['left:lo', 'near:hi', 'right:lo', 'far:lo']);
  R.dressing = got(ctx, ctx.fit(P.dressingTable({ mat }), ['far:mid', 'near:hi', 'left:mid', 'right:mid']));
  R.basin = got(ctx, ctx.fit(P.washbasinMarble({ double: dbl }), ['far:lo', 'near:hi', 'left:mid', 'right:mid']));
  ctx.fit(P.sofa({ mat: cover }), ['near:hi', 'left:mid', 'right:mid', 'far:mid']);
  ctx.fit(P.writingDesk({ mat }), ['right:lo', 'left:mid', 'far:mid']);
  if (ctx.put(P.tableRound({ r: 0.45, mat }), ctx.W / 2, ctx.D / 2, 'in')) {
    ctx.attach(P.bookPile({ v: 1 }), -0.1, 0.12, { y: 0.75, turn: 0.4 }); ctx.attach(P.carafe(), 0.15, -0.15, { y: 0.75 });
    chairs(ctx, () => P.armchair({ kind: 'uph', mat: cover }), ctx.W / 2, ctx.D / 2, [[-0.95, 0, 'right'], [0.95, 0, 'left']]);
  }
  for (let i = 0; i < 2; i++) hang(ctx, P.picture({ w: 0.7, h: 0.5, v: (i + Math.floor(ctx.drng() * 4)) % 4 }), ['far', 'left', 'right', 'near'], 1.7, 0.6);
  if (r() < 0.7) R.trunk = got(ctx, ctx.fit(P.trunk({ big: true }), ['right:mid', 'left:mid', 'far:mid']));
  ctx.fit(P.heater(), ['near:hi', 'far:lo'], { collide: false });
  // clutter: shoes, towels and toiletries, dressing-table set, hat box on the trunk, luggage
  const f = ctx.fine ?? -1, c = ctx.crng;
  if (f < 0) return;
  on(ctx, R.bed, () => shoes(ctx, 0.7 - 0.16, 0.55, 0, M.leather));
  if (f < 1) return;
  on(ctx, R.basin, () => { if (dbl) ctx.stow(P.towels(), 0.03, 0, { y: 0.87 }); else ctx.stow(P.carafe(), 0.02, 0.29, { y: 0.87 }); });
  if (f < 2) return;
  on(ctx, R.basin, () => toiletries(ctx, 0.04, dbl ? 0.6 : -0.25, 0.87, 2, dbl ? 1 : -1));
  on(ctx, R.dressing, () => vanity(ctx, 0.12, 0.755));
  on(ctx, R.trunk, () => ctx.stow(P.hatBox({ v: Math.floor(c() * 2) }), 0, 0.15, { y: 0.658, turn: c() }));
  if (f < 3) return;
  floorProp(ctx, P.suitcase(), ['far:hi', 'left:hi', 'right:hi', 'near:hi']);
  on(ctx, R.bed, () => folded(ctx, -0.1, 0.72, BED_TOP, M.fabricGold, 1));
}

function cabinSecond(ctx) {
  const r = ctx.rng, o = ctx.opts, berths = o.berths ?? ctx.room.berths ?? (ctx.W >= 2.75 ? 4 : 2), cover = ctx.pick(['fabricGreen', 'fabricRed', 'fabricBlue']);
  const R = {};
  R.berth = got(ctx, ctx.fit(P.berthSecond({ cover }), SIDE_HI));
  if (berths > 2) R.berth2 = got(ctx, ctx.fit(P.berthSecond({ cover }), ['left:hi', 'right:hi', 'far:lo']));
  else R.settee = got(ctx, ctx.fit(P.settee({ mat: cover, w: Math.min(1.85, ctx.D - 1.0) }), ['left:hi', 'right:hi', 'far:mid']));
  R.wash = got(ctx, ctx.fit(P.washstand(), ['far:mid', 'left:lo', 'right:lo', 'near:hi']));
  ctx.fit(P.wardrobe({ w: 0.7, life: ctx.drng() < 0.85 }), ['near:hi', 'left:lo', 'right:lo']);
  hang(ctx, P.coatHooks({ n: 2, v: Math.floor(ctx.drng() * 3) }), ['near', 'left', 'right'], 1.72, 0.45);
  if (r() < 0.5) { const tr = r() < 0.5; R.trunk = got(ctx, ctx.fit(tr ? P.trunk() : P.suitcase(), ['far:lo', 'far:hi', 'left:mid'], { collide: false })); if (!tr) R.trunk = null; }
  // clutter: shoes in front of the berth, soap and tooth mug, clothes and a book on the berths, luggage
  const f = ctx.fine ?? -1, c = ctx.crng;
  if (f < 0) return;
  on(ctx, R.berth, () => { if (c() < 0.75 && spot(ctx, 0.56, 0.45, 0.3)) shoes(ctx, 0.56, 0.45, 0, c() < 0.6 ? M.leather : M.woodDark); });
  if (f < 1) return;
  on(ctx, R.wash, () => toiletries(ctx, 0.1, 0.245, 0.81, 0, 1));
  on(ctx, R.wash, () => ctx.bits((b, R2) => { cyl(b, R2, M.porcelain, 0.08, -0.245, 0.81, 0.9, 0.03, 7); }));
  on(ctx, R.berth, () => folded(ctx, -0.08, 0.62, BERTH_TOP[0], c() < 0.5 ? M.fabricBlue : M.linen, 1 + Math.floor(c() * 2)));
  if (f < 2) return;
  on(ctx, R.berth2 ?? R.berth, () => { if (c() < 0.6) ctx.stow(P.bookPile({ v: Math.floor(c() * 3) }), -0.05, -0.2, { y: (R.berth2 ? BERTH_TOP[0] : BERTH_TOP[1]), turn: c() }); });
  on(ctx, R.settee, () => { if (c() < 0.6) ctx.stow(P.newspaper(), 0.02, (c() - 0.5) * 0.6, { y: 0.47, turn: c() }); });
  if (R.trunk) on(ctx, R.trunk, () => { if (c() < 0.5) ctx.stow(P.hatBox({ v: Math.floor(c() * 2) }), 0, 0.1, { y: 0.508, turn: c() }); });
  else if (c() < 0.6) floorProp(ctx, P.suitcase(), ['far:lo', 'far:hi', 'left:mid', 'right:mid']);
  if (f < 3) return;
  on(ctx, R.berth2, () => { if (c() < 0.7 && spot(ctx, 0.56, 0.4, 0.3)) shoes(ctx, 0.56, 0.4, 0, M.leather); });
  on(ctx, R.berth, () => folded(ctx, -0.08, 0.62, BERTH_TOP[1], M.linen, 1));
}

function cabinThird(ctx) {
  const o = ctx.opts, a = ctx.W * ctx.D, berths = o.berths ?? ctx.room.berths ?? (a < 5.6 ? 2 : a < 9 ? 4 : 6);
  const prefs = [['right:hi', 'left:hi', 'far:hi'], ['left:hi', 'right:hi', 'far:lo'], ['far:mid', 'right:lo', 'left:lo'], ['right:lo', 'left:lo']];
  const bunks = [];
  for (let i = 0; i < Math.ceil(berths / 2); i++) if (ctx.fit(P.bunkThird(), prefs[Math.min(i, 3)])) bunks.push(ctx.last);
  ctx.fit(P.basinSmall(), ['far:mid', 'near:hi', 'left:lo', 'right:lo'], { collide: false });
  if (ctx.rng() < 0.4) ctx.fit(P.suitcase(), ['far:lo', 'far:hi', 'near:hi'], { collide: false });
  if (ctx.drng() < 0.7) hang(ctx, P.coatHooks({ n: 2, v: Math.floor(ctx.drng() * 3), mat: 'pine' }), ['near', 'far', 'left'], 1.75, 0.4);
  // clutter: boots in front of the bunks, life jackets and bundles on the bunks, a carpet bag, extra clothes on hooks
  const f = ctx.fine ?? -1, c = ctx.crng;
  if (f < 0) return;
  on(ctx, bunks[0], () => { if (c() < 0.7) shoes(ctx, 0.2, 0.4, 0, M.leather); }); // under the lower bunk
  if (f < 1) return;
  for (let i = 0; i < bunks.length; i++) on(ctx, bunks[i], () => {
    if (i === 0 || f >= 3) ctx.stow(P.lifeJacket({ n: 1 }), -0.02, 0.62, { y: BUNK_TOP[1], turn: 0.1 });
    if (i === 0 || f >= 2) folded(ctx, -0.06, 0.55, BUNK_TOP[0], [M.blanket, M.fabricRed, M.canvas][Math.floor(c() * 3)], 1 + Math.floor(c() * 2));
  });
  if (f < 2) return;
  if (c() < 0.6 && slot(ctx, 0.5, 0.3, 0.35, ['far:lo', 'far:hi', 'near:hi', 'left:mid'])) ctx.bits((b, R) => { bx(b, R, M.fabricRed, -0.1, -0.2, 0.1, 0.2, 0, 0.3); b.bar(M.leather, R(0, -0.12, 0.3), R(0, 0.12, 0.3), 0.02, 0.05); }); // carpet bag
  on(ctx, bunks[1], () => { if (c() < 0.6) shoes(ctx, 0.2, -0.35, 0, M.woodDark); });
  if (f < 3) return;
  if (c() < 0.5) hang(ctx, P.coatHooks({ n: 1, v: Math.floor(c() * 3), mat: 'pine' }), ['far', 'left', 'right'], 1.7, 0.35, true);
}

function cabinCrew(ctx) {
  const o = ctx.opts, a = ctx.W * ctx.D, berths = o.berths ?? ctx.room.berths ?? (a < 6 ? 2 : 4);
  const prefs = [['right:hi', 'left:hi', 'far:hi'], ['left:hi', 'right:hi', 'far:lo'], ['far:mid', 'right:lo'], ['left:lo']];
  const bunks = [], R = {};
  for (let i = 0; i < Math.ceil(berths / 2); i++) if (ctx.fit(P.bunkCrew(o.single ? { tiers: 1 } : {}), prefs[Math.min(i, 3)])) bunks.push(ctx.last);
  if (ctx.fit(P.locker({ n: Math.min(3, Math.max(1, Math.ceil(berths / 2))) }), ['near:hi', 'left:lo', 'right:lo', 'far:mid']) && ctx.drng() < 0.8) ctx.attach(P.lifeJacket({ n: 1 + Math.floor(ctx.drng() * 2) }), -0.02, 0, { y: 1.8 });
  if (o.officer) { R.desk = got(ctx, ctx.fit(P.desk({ w: 1.1 }), ['far:mid', 'left:lo', 'right:lo'])); R.wash = got(ctx, ctx.fit(P.washstand(), ['far:lo', 'near:hi'])); }
  else R.stool = got(ctx, ctx.fit(P.stool({ mat: 'pine', seat: 'pine' }), ['far:mid', 'left:lo'], { collide: false }));
  // clutter: sea boots, kit bag, folded jersey, towel, enamel mug, oilskin on a hook
  const f = ctx.fine ?? -1, c = ctx.crng, top = o.single ? [0.46] : BUNK_TOP;
  if (f < 0) return;
  on(ctx, bunks[0], () => { if (c() < 0.8) shoes(ctx, 0.2, 0.45, 0, M.leather); }); // under the lower bunk
  if (f < 1) return;
  if (c() < 0.7 && slot(ctx, 0.62, 0.34, 0.65, ['far:lo', 'far:hi', 'near:hi', 'left:mid', 'right:mid'])) { kitBag(ctx, 0, -0.14); if (c() < 0.7) shoes(ctx, 0, 0.17, 0, M.rubber, true); }
  on(ctx, bunks[0], () => folded(ctx, -0.06, 0.55, top[0], c() < 0.5 ? M.fabricBlue : M.blanket, 1));
  if (f < 2) return;
  on(ctx, R.stool, () => ctx.bits((b, R2) => { cyl(b, R2, M.porcelain, 0, 0, 0.47, 0.56, 0.035, 7); bx(b, R2, M.porcelain, -0.006, 0.035, 0.006, 0.055, 0.49, 0.54); }));
  on(ctx, R.wash, () => toiletries(ctx, 0.1, 0.245, 0.81, 0, 1));
  on(ctx, R.desk, () => { if (c() < 0.7) ctx.stow(P.bookPile({ v: Math.floor(c() * 3) }), 0.12, -0.35, { y: 0.773, turn: c() * 0.5 }); });
  for (let i = 1; i < bunks.length; i++) on(ctx, bunks[i], () => { if (c() < 0.6) folded(ctx, -0.06, 0.55, top[0], M.fabricBlue, 1); });
  if (c() < 0.6) hang(ctx, P.coatHooks({ n: 1, v: Math.floor(c() * 3), mat: 'pine' }), ['far', 'left', 'right', 'near'], 1.7, 0.35, true);
  if (f < 3) return;
  for (let i = 1; i < bunks.length; i++) on(ctx, bunks[i], () => { if (c() < 0.6) shoes(ctx, 0.2, 0.45, 0, M.leather); });
  if (!o.single) on(ctx, bunks[0], () => { if (c() < 0.5) ctx.stow(P.newspaper(), -0.05, 0.4, { y: top[1], turn: c() }); });
}

function dormitory(ctx) {
  const make = ctx.opts.pine ? () => P.bunkThird() : () => P.bunkCrew(), L = 2.0, w = 0.75;
  const nv = Math.floor((ctx.D - 0.9) / L), v0 = 0.9 + (ctx.D - 0.9 - nv * L) / 2;
  const rows = [], bunks = [];
  // rows of bunks parallel to the side walls: one against each wall, double rows in between (aisles ≥ 1.0 m)
  const inner = Math.max(0, Math.floor((ctx.W - 2 * w - 1.0) / (2 * w + 2.0 + 1e-6)));
  rows.push([w / 2 + 0.03, 'right'], [ctx.W - w / 2 - 0.03, 'left']);
  for (let k = 0; k < inner; k++) { const c = ((k + 1) * ctx.W) / (inner + 1); rows.push([c - w / 2 - 0.01, 'left'], [c + w / 2 + 0.01, 'right']); }
  for (const [u, dir] of rows) for (let j = 0; j < nv; j++) if (ctx.put(make(), u, v0 + (j + 0.5) * L, dir)) bunks.push(ctx.last);
  ctx.fit(P.locker({ n: 3 }), ['near:hi', 'near:mid', 'far:mid']);
  ctx.fit(P.bench({ w: 1.6, back: false }), ['near:mid', 'far:lo'], { collide: false });
  // clutter: bundles and life jackets on some bunks, boots in the aisles next to the bunks
  const f = ctx.fine ?? -1, c = ctx.crng;
  if (f < 1) return;
  const share = f >= 3 ? 0.7 : f >= 2 ? 0.45 : 0.2;
  for (const bk of bunks) on(ctx, bk, () => {
    if (c() < share) folded(ctx, -0.06, 0.55, BUNK_TOP[c() < 0.5 ? 0 : 1], [M.blanket, M.canvas, M.fabricBlue][Math.floor(c() * 3)], 1);
    if (f >= 2 && c() < share * 0.6) ctx.stow(P.lifeJacket({ n: 1 }), -0.02, 0.62, { y: BUNK_TOP[1], turn: 0.1 });
    if (f >= 2 && c() < share * 0.5) shoes(ctx, 0.2, 0.5, 0, ctx.opts.pine ? M.leather : M.woodDark); // under the lower bunk
  });
}

function bathroom(ctx) {
  ctx.doorDepth = Math.min(ctx.doorDepth, 0.6);
  const a = ctx.W * ctx.D;
  const tub = got(ctx, ctx.fit(P.bathtub({ wood: ctx.cls === 'first' || ctx.opts.wood }), ['right:hi', 'left:hi', 'far:mid']));
  const marble = a > 5, basin = got(ctx, ctx.fit(marble ? P.washbasinMarble({ mirror: true }) : P.basinSmall(), ['far:lo', 'left:mid', 'near:hi', 'right:lo'], { collide: false }));
  if (ctx.opts.wc ?? a > 4.5) ctx.fit(P.wc(), ['left:hi', 'far:lo', 'near:hi'], { collide: false });
  if (ctx.opts.shower) ctx.fit(P.showerBath(), ['far:lo', 'left:hi', 'right:lo']);
  // clutter: bath mat in front of the tub, towels and soap on the marble basin
  const f = ctx.fine ?? -1;
  if (f < 1) return;
  on(ctx, tub, () => { if (spot(ctx, tub.fp.d / 2 + 0.25, 0, 0.45)) ctx.lbox(M.linen, tub.fp.d / 2 + 0.07, -0.3, tub.fp.d / 2 + 0.43, 0.3, 0, 0.012); });
  if (f < 2 || !marble) return;
  on(ctx, basin, () => { ctx.stow(P.towels(), 0.0, 0.29, { y: 0.87 }); toiletries(ctx, 0.04, -0.25, 0.87, 1, -1); });
}

function wcRoom(ctx) {
  ctx.doorDepth = 0.35;
  if (ctx.W < 1.7) { ctx.fit(P.wc(), ['far:mid'], { collide: false }); return; }
  const n = Math.max(1, Math.floor(ctx.W / 0.95)), pitch = ctx.W / n;
  for (let i = 0; i < n; i++) {
    if (!ctx.put(P.wc(), (i + 0.5) * pitch, ctx.D - 0.4, 'out', { collide: false })) continue;
    if (i > 0) ctx.box('paintWhite', i * pitch - 0.015, ctx.D - 1.15, i * pitch + 0.015, ctx.D, 0.15, 1.9);
  }
  if (ctx.D > 2.6) { const m = Math.floor((ctx.D - 1.6) / 0.7); for (let i = 0; i < m; i++) ctx.put(P.urinal(), ctx.W - 0.2, 0.6 + i * 0.7, 'left', { collide: false }); }
  ctx.fit(P.basinSmall(), ['left:lo', 'near:hi'], { collide: false });
}

function wallRun(ctx, make, walls, max = 99) {
  // fill walls with as many items as fit
  let n = 0;
  for (const w of walls) { for (let k = 0; k < 12 && n < max; k++) { if (!ctx.fit(make(n), [w + ':lo'])) break; n++; } }
  return n;
}

/** service rooms: zinc bucket with a mop or a broom in a free corner (fine ≥ lvl) */
function cleaning(ctx, lvl = 1, prefs = ['near:hi', 'left:lo', 'right:lo', 'far:hi', 'far:lo']) {
  const f = ctx.fine ?? -1, c = ctx.crng;
  if (f < lvl) return;
  if (slot(ctx, 0.62, 0.32, 1.3, prefs)) { bucket(ctx, 0, -0.15); broom(ctx, 0.17, 0.32, c() < 0.5); }
  if (f >= lvl + 2 && slot(ctx, 0.32, 0.32, 1.3, prefs)) broom(ctx, 0, 0.32, false);
}

function pantry(ctx) {
  wallRun(ctx, () => P.shelves({ kind: 'crockery', w: 1.5 }), ['far'], 4);
  ctx.fit(P.servingCounter({ w: Math.min(2.4, Math.max(1.2, ctx.D - 1.4)), items: true }), ['right:hi', 'left:hi']);
  const sink = got(ctx, ctx.fit(P.sink({ w: 1.0 }), ['left:hi', 'right:lo', 'near:hi']));
  cleaning(ctx, 1);
  if ((ctx.fine ?? -1) >= 2) on(ctx, sink, () => ctx.bits((b, R) => { // tea towel over the front edge, soap
    bx(b, R, M.linen, 0.3, 0.3, 0.31, 0.46, 0.66, 0.9); bx(b, R, M.linen, 0.22, 0.3, 0.31, 0.46, 0.895, 0.905);
    bx(b, R, M.paintCream, -0.05, 0.25, 0.03, 0.31, 0.895, 0.915);
  }));
}

function store(ctx) {
  const r = ctx.rng;
  wallRun(ctx, () => P.shelves({ kind: 'stores', w: 1.5 }), ['far', 'right'], ctx.opts.shelves ?? 6);
  for (let i = 0; i < Math.min(6, Math.floor((ctx.W * ctx.D) / 5)); i++) {
    const k = r();
    ctx.fit(k < 0.3 ? P.barrel() : k < 0.6 ? P.crate({ s: 0.7 }) : k < 0.8 ? P.sackPile() : P.crate({ s: 0.9 }), ['left:hi', 'left:lo', 'near:hi', 'far:lo']);
  }
  cleaning(ctx, 2);
}

function linen(ctx) {
  wallRun(ctx, () => P.shelves({ kind: 'linen', w: 1.5 }), ['far', 'right', 'left']);
  const t = ctx.W > 2.4 ? got(ctx, ctx.fit(P.tableRect({ w: 1.2, d: 0.7, mat: 'pine' }), ['near:hi'])) : null;
  const f = ctx.fine ?? -1;
  if (f >= 1) on(ctx, t, () => { ctx.stow(P.towels({ n: 3 }), 0, -0.3, { y: 0.75 }); if (f >= 2) ctx.stow(P.towels({ n: 2 }), 0.02, 0.25, { y: 0.75, turn: 0.1 }); });
  cleaning(ctx, 2);
}

function office(ctx) {
  const mat = ctx.opts.mat ?? 'oak';
  let desk = null;
  if (ctx.put(P.desk({ mat }), Math.max(1.0, ctx.W / 2), Math.max(1.3, ctx.D - 1.3), 'out')) { desk = ctx.last; ctx.put(P.chairDining({ cls: 'plain' }), Math.max(1.0, ctx.W / 2), Math.max(1.3, ctx.D - 1.3) + 0.75, 'out', { collide: false }); }
  else desk = got(ctx, ctx.fit(P.desk({ mat, w: 1.1 }), ['far:mid', 'right:hi', 'left:hi']));
  ctx.fit(P.bookcase({ mat, w: 1.2 }), ['right:lo', 'left:hi', 'far:lo']);
  ctx.fit(P.safe(), ['far:hi', 'left:hi', 'right:hi']);
  ctx.fit(P.chairDining({ cls: 'plain' }), ['near:hi', 'left:lo'], { collide: false });
  const f = ctx.fine ?? -1, c = ctx.crng;
  if (f >= 2) on(ctx, desk, () => ctx.stow(P.bookPile({ v: Math.floor(c() * 3) }), 0.12, -(desk.fp.w / 2 - 0.25), { y: 0.773, turn: c() * 0.4 }));
}

function mess(ctx) {
  const tables = [], set = ctx.opts.set;
  const n = ctx.grid(2.2, 3.0, (u, v) => { if (ctx.put(P.messTable({ w: 2.4, set }), u, v, 'right')) tables.push(ctx.last); }, 0.5);
  if (!n) ctx.grid(3.0, 2.2, (u, v) => { if (ctx.put(P.messTable({ w: 2.4 }), u, v, 'in')) tables.push(ctx.last); }, 0.3);
  ctx.fit(P.locker({ n: 3 }), ['far:hi', 'near:hi']);
  // clutter: enamel mugs and tin plates left on the tables (not where a full setting is laid)
  const f = ctx.fine ?? -1, c = ctx.crng;
  if (f >= 1 && !(n && set)) for (const t of tables) on(ctx, t, () => { if (f >= 2 || c() < 0.5) messGear(ctx, 2.4, 0.765, c); });
  cleaning(ctx, 2);
}

function seatingGroups(ctx, club) {
  const r = ctx.rng, cover = ctx.opts.cover ?? ctx.pick(club ? ['leather', 'leatherGreen'] : COVERS), mat = ctx.opts.mat ?? (club ? 'mahogany' : 'oak');
  const chair = () => P.armchair({ kind: club ? 'club' : (ctx.opts.wicker ? 'wicker' : 'uph'), mat: cover });
  ctx.grid(3.2, 3.2, (u, v, i, j) => {
    if (!ctx.put(P.tableRound({ r: club ? 0.4 : 0.45, mat, items: ctx.drng() < 0.35 }), u, v, 'in')) return;
    const k = (i + j) % 3;
    if (k === 0 && !ctx.opts.wicker) { ctx.put(P.sofa({ mat: cover, w: 1.6 }), u, v + 1.1, 'out'); chairs(ctx, chair, u, v, [[-1.05, 0, 'right'], [1.05, 0, 'left']]); }
    else chairs(ctx, chair, u, v, [[-1.0, 0, 'right'], [1.0, 0, 'left'], [0, 1.0, 'out'], ...(r() < 0.6 ? [[0, -1.0, 'in']] : [])]);
  }, 0.7);
}

function lounge(ctx) {
  const mat = ctx.opts.mat ?? 'oak';
  if (ctx.opts.fireplace !== false && ctx.W >= 4 && ctx.fit(P.fireplace({ mat }), ['far:mid', 'left:mid', 'right:mid'], { gap: 0 })) { /* decorative */ }
  if (ctx.W * ctx.D > 40) ctx.fit(P.bookcase({ mat, w: 1.6 }), ['left:mid', 'right:mid', 'far:lo']);
  if (ctx.opts.piano ?? ctx.W * ctx.D > 70) ctx.fit(P.piano({ grand: ctx.W * ctx.D > 150 }), ['near:hi', 'far:hi', 'right:hi']);
  if (ctx.W * ctx.D > 30) for (const p of ['far:lo', 'far:hi', 'near:hi']) ctx.fit(P.pottedPalm(), [p], { collide: false });
  seatingGroups(ctx, false);
}

function smoking(ctx) {
  if (ctx.opts.fireplace !== false && ctx.W >= 4) ctx.fit(P.fireplace({ mat: 'mahogany' }), ['far:mid', 'left:mid', 'right:mid'], { gap: 0 });
  seatingGroups(ctx, true);
}

function writing(ctx) {
  wallRun(ctx, () => P.writingDesk(), ['left', 'right', 'far'], ctx.opts.desks ?? 8);
  for (let i = 0; i < 2; i++) hang(ctx, P.picture({ w: 0.8, h: 0.6, v: i + 1 }), ['near', 'far'], 1.8, 0.7);
  ctx.grid(3.0, 3.0, (u, v) => { if (ctx.put(P.tableRound({ r: 0.4 }), u, v, 'in')) chairs(ctx, () => P.armchair({ kind: 'uph', mat: 'fabricGreen' }), u, v, [[-0.95, 0, 'right'], [0.95, 0, 'left']]); }, 1.2);
}

function dining(ctx) {
  const cls = ctx.opts.cls ?? ctx.cls ?? 'first';
  if (cls === 'third') { ctx.grid(2.3, 3.4, (u, v) => ctx.put(P.messTable({ w: 3.0, set: true, mat: 'pine' }), u, v, 'right'), 0.6); return; }
  if (cls === 'second') {
    ctx.grid(2.5, 3.6, (u, v) => {
      if (!ctx.put(P.tableRect({ w: 3.0, d: 0.9, cloth: true, set: true }), u, v, 'right')) return;
      for (let k = 0; k < 5; k++) for (const s of [-1, 1]) ctx.put(P.swivelChair(), u + s * 0.78, v - 1.24 + k * 0.62, s > 0 ? 'left' : 'right', { collide: false });
    }, 0.6);
    return;
  }
  const chair = () => P.chairDining({ cls: 'first' });
  ctx.grid(2.9, 2.9, (u, v, i, j) => {
    if ((i + j) % 2) {
      if (!ctx.put(P.tableRound({ r: 0.6, cloth: true, set: 4, lamp: true }), u, v, 'in')) return;
      chairs(ctx, chair, u, v, [[-0.95, 0, 'right'], [0.95, 0, 'left'], [0, 0.95, 'out'], [0, -0.95, 'in']]);
    } else {
      if (!ctx.put(P.tableRect({ w: 1.6, d: 0.9, cloth: true, set: true, lamp: true }), u, v, 'in')) return;
      chairs(ctx, chair, u, v, [[-0.4, 0.8, 'out'], [0.4, 0.8, 'out'], [-0.4, -0.8, 'in'], [0.4, -0.8, 'in'], [-1.15, 0, 'right'], [1.15, 0, 'left']]);
    }
  }, 0.6);
}

function galley(ctx) {
  const n = wallRun(ctx, (i) => (i % 3 === 2 ? P.kettle() : P.range({ w: 2.4 })), ['far'], ctx.opts.ranges ?? 6);
  if (!n) ctx.fit(P.range({ w: 1.6 }), ['far:mid', 'left:hi', 'right:hi']);
  ctx.fit(P.sink({ w: 1.4 }), ['left:hi', 'right:hi']); ctx.fit(P.shelves({ kind: 'crockery', w: 1.5 }), ['right:hi', 'left:hi']);
  ctx.fit(P.butcherBlock(), ['left:mid', 'right:mid']);
  if (ctx.opts.oven ?? ctx.W * ctx.D > 60) ctx.fit(P.oven(), ['left:lo', 'right:lo', 'near:hi']);
  if (ctx.D > 5) ctx.grid(3.2, 2.6, (u, v, i, j, nu, nv) => { if (j < nv - 1 || nv === 1) ctx.put(P.servingCounter({ w: 2.2, d: 0.9, items: true }), u, v - (nv === 1 ? 0.6 : 0), 'out'); }, 1.3);
  cleaning(ctx, 1);
}

function hold(ctx) {
  const r = ctx.rng, aisle = ctx.W > 6;
  ctx.grid(2.3, 2.3, (u, v) => {
    if (aisle && Math.abs(u - ctx.W / 2) < 1.2) return;
    const k = r(), yaw = ctx.pick(['in', 'out', 'left', 'right']);
    if (k < 0.2) return;
    if (k < 0.5) ctx.put(P.crateStack({ v: Math.floor(r() * 6) }), u, v, yaw);
    else if (k < 0.65) { ctx.put(P.barrel(), u - 0.4, v - 0.35, yaw); ctx.put(P.barrel(), u + 0.35, v - 0.3, yaw); ctx.put(P.barrel(), u, v + 0.4, yaw); }
    else if (k < 0.8) ctx.put(P.luggagePile({ v: Math.floor(r() * 6) }), u, v, yaw);
    else if (k < 0.9) ctx.put(P.sackPile(), u, v, yaw);
    else { ctx.put(P.crate({ s: 1.0 }), u - 0.3, v, yaw); ctx.put(P.trunk({ big: true }), u + 0.6, v + 0.3, yaw); }
  }, 0.5);
}

function mail(ctx) {
  wallRun(ctx, () => P.shelves({ kind: 'empty', w: 1.5, mat: 'oak' }), ['far'], 5);
  ctx.put(P.tableRect({ w: Math.min(2.4, ctx.W - 2), d: 0.9, mat: 'oak' }), ctx.W / 2, ctx.D / 2, 'in');
  for (const p of ['left:hi', 'left:mid', 'right:hi', 'right:mid', 'near:hi']) ctx.fit(P.sackPile(), [p]);
}

function barber(ctx) {
  const n = Math.max(1, Math.min(3, Math.floor((ctx.W - 0.6) / 1.4)));
  for (let i = 0; i < n; i++) { const u = ((i + 0.5) * ctx.W) / n; if (ctx.put(P.barberChair(), u, ctx.D - 1.2, 'out')) ctx.mount(P.mirrorWall({ w: 0.7, h: 0.9, frame: 'mahogany' }), 'far', u, 2.0); }
  ctx.fit(P.bench({ w: Math.min(2.2, ctx.D - 1.2), mat: 'mahogany', iron: false }), ['left:lo', 'right:lo', 'near:hi']);
  ctx.fit(P.washbasinMarble({ mirror: false }), ['right:hi', 'left:hi'], { collide: false });
}

function hospital(ctx) {
  wallRun(ctx, () => P.bunkCrew({ tiers: 1, cover: 'linen' }), ['left', 'right'], ctx.opts.beds ?? 8);
  ctx.fit(P.basinSmall(), ['far:mid', 'near:hi'], { collide: false }); ctx.fit(P.locker({ mat: 'paintWhite' }), ['far:lo', 'near:hi']);
}

function turkish(ctx) {
  wallRun(ctx, () => P.coolingCouch({ mat: ctx.pick(['fabricRed', 'fabricGold']) }), ['left', 'right'], ctx.opts.couches ?? 8);
  ctx.grid(3, 3, (u, v) => ctx.put(P.tableRound({ r: 0.3, mat: 'woodDark' }), u, v, 'in'), 1.3);
}

function bar(ctx) {
  const w = Math.min(4, ctx.W - 1.2);
  if (w < 1.5) return;
  ctx.fit(P.backBar({ w }), ['far:mid'], { gap: 0 });
  ctx.put(P.barCounter({ w }), ctx.W / 2, ctx.D - 1.5, 'out');
}

/** name → fn(ctx). Add your own with PRESETS.myPreset = (ctx) => {...}. */
export const PRESETS = {
  empty() {}, cabinFirst, cabinFirstSuite, cabinSecond, cabinThird, cabinCrew, dormitory, bathroom, wc: wcRoom, pantry, store, linen, office,
  mess, lounge, smoking, writing, dining, galley, hold, mail, barber, hospital, turkish, bar,
};
