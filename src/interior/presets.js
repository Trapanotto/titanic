// Interior kit – furnishing presets. Each preset is fn(ctx) with ctx = FurnishCtx (rooms.js):
// local frame u (along the door wall, door in the low-u half) × v (into the room), ctx.W × ctx.D metres.
// Use ctx.fit(prop, ['wall:snug', ...]) / ctx.put(prop, u, v, dir); both refuse spots that are blocked.
import * as P from './props.js';

const COVERS = ['fabricGold', 'fabricRed', 'fabricBlue', 'fabricGreen'];
const SIDE_HI = ['right:hi', 'left:hi', 'far:hi', 'far:lo'];

/** hang a wall prop (pictures, hooks) on a wall where the floor in front is free; tries a few positions */
function hang(ctx, prop, walls, hgt, depth = 0.25) {
  const fp = prop.userData.fp ?? { w: 0.5 };
  for (const wall of [].concat(walls)) {
    if (wall === ctx.hull) continue;
    const side = wall === 'left' || wall === 'right', len = side ? ctx.D : ctx.W;
    for (const t of [0.5, 0.3, 0.7, 0.18, 0.82]) {
      const p = len * t;
      if (p - fp.w / 2 < 0.15 || p + fp.w / 2 > len - 0.15) continue;
      const [u, v] = wall === 'left' ? [depth / 2 + 0.01, p] : wall === 'right' ? [ctx.W - depth / 2 - 0.01, p] : wall === 'near' ? [p, depth / 2 + 0.01] : [p, ctx.D - depth / 2 - 0.01];
      if (!ctx.free(u, v, side ? depth : fp.w, side ? fp.w : depth)) continue;
      if (ctx.mount(prop, wall, p, hgt)) return true;
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
  const wide = beds === 1 && ctx.W > 3.2;
  if (ctx.fit(P.bedFirst({ style, cover, wide }), SIDE_HI)) {
    const d = ctx.drng;
    if (d() < 0.75) ctx.attach(P.slippers({ v: Math.floor(d() * 2) }), (wide ? 0.7 : 0.5) + 0.18, -0.5, { turn: -Math.PI / 2 });
    pictureAbove(ctx, P.picture({ w: 0.6, h: 0.45, v: Math.floor(d() * 4) }), 1.62);
  }
  if (beds > 1) ctx.fit(P.bedFirst({ style, cover }), ['left:hi', 'right:hi', 'far:lo', 'far:hi']);
  if (ctx.fit(P.wardrobe({ mirror: true, open: r() < 0.2, life: ctx.drng() < 0.85 }), ['left:lo', 'right:lo', 'near:hi', 'far:lo'])) { /* life jackets on top */ }
  ctx.fit(P.washbasinMarble(), ['far:mid', 'left:mid', 'right:mid', 'near:hi']);
  if (ctx.W * ctx.D > 9 && ctx.fit(P.dressingTable(), ['near:hi', 'far:mid', 'right:lo', 'left:mid'])) { /* stool in front is optional */ }
  if (big) ctx.fit(P.sofa({ mat: cover, w: 1.6 }), ['near:hi', 'left:mid', 'right:mid', 'far:mid']);
  ctx.fit(P.armchair({ kind: 'uph', mat: cover }), ['far:lo', 'near:hi', 'left:mid', 'right:lo']);
  ctx.fit(P.heater(), ['near:hi', 'far:lo', 'left:lo'], { collide: false });
  if (r() < 0.55) ctx.fit(P.trunk({ big: r() < 0.4 }), ['right:lo', 'left:mid', 'far:mid']);
  if (big && ctx.put(P.tableRound({ r: 0.35 }), ctx.W / 2, ctx.D / 2, 'in')) ctx.attach(ctx.drng() < 0.5 ? P.newspaper() : P.bookPile({ v: Math.floor(ctx.drng() * 3) }), 0.05, 0.02, { y: 0.75, turn: ctx.drng() * 1.5 });
  if (ctx.drng() < 0.5) hang(ctx, P.picture({ w: 0.45, h: 0.35, v: Math.floor(ctx.drng() * 4) }), ['far', 'left', 'right'], 1.65, 0.6);
}

function cabinFirstSuite(ctx) {
  const r = ctx.rng, cover = ctx.pick(COVERS), mat = ctx.pick(['mahogany', 'oak']);
  ctx.fit(P.bedFirst({ canopy: true, cover, wide: true }), SIDE_HI);
  if (ctx.opts.fireplace !== false && ctx.W > 3.4 && ctx.fit(P.fireplace({ mat }), ['left:mid', 'far:mid', 'right:mid'], { gap: 0 })) { /* glow added below */ }
  ctx.fit(P.wardrobe({ mirror: true, mat }), ['left:lo', 'near:hi', 'right:lo', 'far:lo']);
  ctx.fit(P.dressingTable({ mat }), ['far:mid', 'near:hi', 'left:mid', 'right:mid']);
  ctx.fit(P.washbasinMarble({ double: ctx.W > 4 }), ['far:lo', 'near:hi', 'left:mid', 'right:mid']);
  ctx.fit(P.sofa({ mat: cover }), ['near:hi', 'left:mid', 'right:mid', 'far:mid']);
  ctx.fit(P.writingDesk({ mat }), ['right:lo', 'left:mid', 'far:mid']);
  if (ctx.put(P.tableRound({ r: 0.45, mat }), ctx.W / 2, ctx.D / 2, 'in')) {
    ctx.attach(P.bookPile({ v: 1 }), -0.1, 0.12, { y: 0.75, turn: 0.4 }); ctx.attach(P.carafe(), 0.15, -0.15, { y: 0.75 });
    chairs(ctx, () => P.armchair({ kind: 'uph', mat: cover }), ctx.W / 2, ctx.D / 2, [[-0.95, 0, 'right'], [0.95, 0, 'left']]);
  }
  for (let i = 0; i < 2; i++) hang(ctx, P.picture({ w: 0.7, h: 0.5, v: (i + Math.floor(ctx.drng() * 4)) % 4 }), ['far', 'left', 'right', 'near'], 1.7, 0.6);
  if (r() < 0.7) ctx.fit(P.trunk({ big: true }), ['right:mid', 'left:mid', 'far:mid']);
  ctx.fit(P.heater(), ['near:hi', 'far:lo'], { collide: false });
}

function cabinSecond(ctx) {
  const r = ctx.rng, o = ctx.opts, berths = o.berths ?? ctx.room.berths ?? (ctx.W >= 2.75 ? 4 : 2), cover = ctx.pick(['fabricGreen', 'fabricRed', 'fabricBlue']);
  ctx.fit(P.berthSecond({ cover }), SIDE_HI);
  if (berths > 2) ctx.fit(P.berthSecond({ cover }), ['left:hi', 'right:hi', 'far:lo']);
  else ctx.fit(P.settee({ mat: cover, w: Math.min(1.85, ctx.D - 1.0) }), ['left:hi', 'right:hi', 'far:mid']);
  ctx.fit(P.washstand(), ['far:mid', 'left:lo', 'right:lo', 'near:hi']);
  ctx.fit(P.wardrobe({ w: 0.7, life: ctx.drng() < 0.85 }), ['near:hi', 'left:lo', 'right:lo']);
  hang(ctx, P.coatHooks({ n: 2, v: Math.floor(ctx.drng() * 3) }), ['near', 'left', 'right'], 1.72, 0.45);
  if (r() < 0.5) ctx.fit(r() < 0.5 ? P.trunk() : P.suitcase(), ['far:lo', 'far:hi', 'left:mid'], { collide: false });
}

function cabinThird(ctx) {
  const o = ctx.opts, a = ctx.W * ctx.D, berths = o.berths ?? ctx.room.berths ?? (a < 5.6 ? 2 : a < 9 ? 4 : 6);
  const prefs = [['right:hi', 'left:hi', 'far:hi'], ['left:hi', 'right:hi', 'far:lo'], ['far:mid', 'right:lo', 'left:lo'], ['right:lo', 'left:lo']];
  for (let i = 0; i < Math.ceil(berths / 2); i++) ctx.fit(P.bunkThird(), prefs[Math.min(i, 3)]);
  ctx.fit(P.basinSmall(), ['far:mid', 'near:hi', 'left:lo', 'right:lo'], { collide: false });
  if (ctx.rng() < 0.4) ctx.fit(P.suitcase(), ['far:lo', 'far:hi', 'near:hi'], { collide: false });
  if (ctx.drng() < 0.7) hang(ctx, P.coatHooks({ n: 2, v: Math.floor(ctx.drng() * 3), mat: 'pine' }), ['near', 'far', 'left'], 1.75, 0.4);
}

function cabinCrew(ctx) {
  const o = ctx.opts, a = ctx.W * ctx.D, berths = o.berths ?? ctx.room.berths ?? (a < 6 ? 2 : 4);
  const prefs = [['right:hi', 'left:hi', 'far:hi'], ['left:hi', 'right:hi', 'far:lo'], ['far:mid', 'right:lo'], ['left:lo']];
  for (let i = 0; i < Math.ceil(berths / 2); i++) ctx.fit(P.bunkCrew(o.single ? { tiers: 1 } : {}), prefs[Math.min(i, 3)]);
  if (ctx.fit(P.locker({ n: Math.min(3, Math.max(1, Math.ceil(berths / 2))) }), ['near:hi', 'left:lo', 'right:lo', 'far:mid']) && ctx.drng() < 0.8) ctx.attach(P.lifeJacket({ n: 1 + Math.floor(ctx.drng() * 2) }), -0.02, 0, { y: 1.8 });
  if (o.officer) { ctx.fit(P.desk({ w: 1.1 }), ['far:mid', 'left:lo', 'right:lo']); ctx.fit(P.washstand(), ['far:lo', 'near:hi']); }
  else ctx.fit(P.stool({ mat: 'pine', seat: 'pine' }), ['far:mid', 'left:lo'], { collide: false });
}

function dormitory(ctx) {
  const make = ctx.opts.pine ? () => P.bunkThird() : () => P.bunkCrew(), L = 2.0, w = 0.75;
  const nv = Math.floor((ctx.D - 0.9) / L), v0 = 0.9 + (ctx.D - 0.9 - nv * L) / 2;
  const rows = [];
  // rows of bunks parallel to the side walls: one against each wall, double rows in between (aisles ≥ 1.0 m)
  const inner = Math.max(0, Math.floor((ctx.W - 2 * w - 1.0) / (2 * w + 2.0 + 1e-6)));
  rows.push([w / 2 + 0.03, 'right'], [ctx.W - w / 2 - 0.03, 'left']);
  for (let k = 0; k < inner; k++) { const c = ((k + 1) * ctx.W) / (inner + 1); rows.push([c - w / 2 - 0.01, 'left'], [c + w / 2 + 0.01, 'right']); }
  for (const [u, dir] of rows) for (let j = 0; j < nv; j++) ctx.put(make(), u, v0 + (j + 0.5) * L, dir);
  ctx.fit(P.locker({ n: 3 }), ['near:hi', 'near:mid', 'far:mid']);
  ctx.fit(P.bench({ w: 1.6, back: false }), ['near:mid', 'far:lo'], { collide: false });
}

function bathroom(ctx) {
  ctx.doorDepth = Math.min(ctx.doorDepth, 0.6);
  const a = ctx.W * ctx.D;
  ctx.fit(P.bathtub({ wood: ctx.cls === 'first' || ctx.opts.wood }), ['right:hi', 'left:hi', 'far:mid']);
  ctx.fit(a > 5 ? P.washbasinMarble({ mirror: true }) : P.basinSmall(), ['far:lo', 'left:mid', 'near:hi', 'right:lo'], { collide: false });
  if (ctx.opts.wc ?? a > 4.5) ctx.fit(P.wc(), ['left:hi', 'far:lo', 'near:hi'], { collide: false });
  if (ctx.opts.shower) ctx.fit(P.showerBath(), ['far:lo', 'left:hi', 'right:lo']);
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

function pantry(ctx) {
  wallRun(ctx, () => P.shelves({ kind: 'crockery', w: 1.5 }), ['far'], 4);
  ctx.fit(P.servingCounter({ w: Math.min(2.4, Math.max(1.2, ctx.D - 1.4)), items: true }), ['right:hi', 'left:hi']);
  ctx.fit(P.sink({ w: 1.0 }), ['left:hi', 'right:lo', 'near:hi']);
}

function store(ctx) {
  const r = ctx.rng;
  wallRun(ctx, () => P.shelves({ kind: 'stores', w: 1.5 }), ['far', 'right'], ctx.opts.shelves ?? 6);
  for (let i = 0; i < Math.min(6, Math.floor((ctx.W * ctx.D) / 5)); i++) {
    const k = r();
    ctx.fit(k < 0.3 ? P.barrel() : k < 0.6 ? P.crate({ s: 0.7 }) : k < 0.8 ? P.sackPile() : P.crate({ s: 0.9 }), ['left:hi', 'left:lo', 'near:hi', 'far:lo']);
  }
}

function linen(ctx) { wallRun(ctx, () => P.shelves({ kind: 'linen', w: 1.5 }), ['far', 'right', 'left']); if (ctx.W > 2.4) ctx.fit(P.tableRect({ w: 1.2, d: 0.7, mat: 'pine' }), ['near:hi']); }

function office(ctx) {
  const mat = ctx.opts.mat ?? 'oak';
  if (ctx.put(P.desk({ mat }), Math.max(1.0, ctx.W / 2), Math.max(1.3, ctx.D - 1.3), 'out')) ctx.put(P.chairDining({ cls: 'plain' }), Math.max(1.0, ctx.W / 2), Math.max(1.3, ctx.D - 1.3) + 0.75, 'out', { collide: false });
  else ctx.fit(P.desk({ mat, w: 1.1 }), ['far:mid', 'right:hi', 'left:hi']);
  ctx.fit(P.bookcase({ mat, w: 1.2 }), ['right:lo', 'left:hi', 'far:lo']);
  ctx.fit(P.safe(), ['far:hi', 'left:hi', 'right:hi']);
  ctx.fit(P.chairDining({ cls: 'plain' }), ['near:hi', 'left:lo'], { collide: false });
}

function mess(ctx) {
  const n = ctx.grid(2.2, 3.0, (u, v) => ctx.put(P.messTable({ w: 2.4, set: ctx.opts.set }), u, v, 'right'), 0.5);
  if (!n) ctx.grid(3.0, 2.2, (u, v) => ctx.put(P.messTable({ w: 2.4 }), u, v, 'in'), 0.3);
  ctx.fit(P.locker({ n: 3 }), ['far:hi', 'near:hi']);
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
