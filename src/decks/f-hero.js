// F deck hero rooms: swimming bath, Turkish bath (cooling room + bath rooms), third-class dining saloons,
// machinery access lobbies. All furnish functions get the kit's FurnishCtx.
import { mats } from '../core/materials.js';
import {
  kitMats, pipe, showerBath, bench, coolingCouch, tableRect, chairDining, servingCounter, shelves, locker, gauge, valve,
  basinSmall, desk, chairDining as chair, mirrorWall, clockWall, tableRound, pottedPalm, heater, deckHalfWidth, wardrobe,
} from '../interior/kit.js';
import { defProp, Instancer, moorishCeiling, teakLattice, ceilingPipes, poster } from './f-util.js';

// ---------------------------------------------------------------- custom props

/** hanging bronze Moorish lantern, origin at the ceiling */
export const lantern = defProp('fgLantern', [0.4, 0.4, 1.0], (p) => {
  p.c(mats.iron, 0.012, 0.45, 0, -0.45, 0, 4);
  p.c(kitMats.bronze, 0.2, 0.07, 0, -0.52, 0, 8, 0.1);
  p.c(mats.lampGlow, 0.13, 0.3, 0, -0.82, 0, 8);
  for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; p.b(kitMats.bronze, 0.025, 0.32, 0.025, Math.cos(a) * 0.14, -0.83, Math.sin(a) * 0.14); }
  p.c(kitMats.bronze, 0.04, 0.14, 0, -0.97, 0, 8, 0.16);
});
/** marble drinking fountain with gilt spout against a wall (front +x) */
const fountain = defProp('fgFountain', [0.95, 0.5, 1.75], (p) => {
  p.b(mats.marble, 0.08, 1.75, 0.95, -0.21, 0, 0);
  p.b(kitMats.tileBlue, 0.01, 0.9, 0.7, -0.165, 0.75, 0);
  p.cx(mats.marble, 0.35, 0.08, -0.21, 1.75, 0, 12);
  p.b(mats.marble, 0.28, 0.7, 0.3, -0.04, 0, 0);
  p.c(mats.marble, 0.2, 0.16, 0.02, 0.7, 0, 10, 0.3);
  p.c(kitMats.water, 0.25, 0.01, 0.02, 0.84, 0, 10);
  p.b(mats.gold, 0.2, 0.035, 0.035, -0.1, 1.08, 0); p.s(mats.gold, 0.06, -0.16, 1.1, 0, 1, 1, 1, true);
  p.b(mats.gold, 0.02, 0.02, 0.6, -0.165, 1.65, 0);
});
/** octagonal inlaid "Damascus" side table */
const damascusTable = defProp('fgDamascus', [0.64, 0.64, 0.56], (p) => {
  p.c(mats.woodDark, 0.32, 0.04, 0, 0.52, 0, 8); p.c(mats.porcelain, 0.2, 0.005, 0, 0.56, 0, 8); p.c(mats.gold, 0.3, 0.004, 0, 0.559, 0, 8, 0.29);
  p.c(mats.woodDark, 0.22, 0.5, 0, 0.02, 0, 8, 0.27);
  for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4 + Math.PI / 8; p.b(teakLattice, 0.01, 0.34, 0.16, Math.cos(a) * 0.26, 0.1, Math.sin(a) * 0.26).rotation.y = -a; }
  p.c(mats.brass, 0.06, 0.06, 0.08, 0.56, 0.05, 8);
});
/** coffee service tray on a stand */
const brassTray = defProp('fgTray', [0.55, 0.55, 0.62], (p) => {
  p.c(mats.brass, 0.27, 0.025, 0, 0.58, 0, 12); for (let i = 0; i < 3; i++) { const a = (i * 2 * Math.PI) / 3; p.b(mats.woodDark, 0.03, 0.58, 0.03, Math.cos(a) * 0.18, 0, Math.sin(a) * 0.18); }
  p.c(mats.copper, 0.05, 0.14, 0.05, 0.605, 0.04, 8, 0.03); p.c(mats.porcelain, 0.03, 0.04, -0.08, 0.605, -0.06, 6);
});
/** electric light bath cabinet: the bather sat inside with only the head outside */
const lightBath = defProp('fgLightBath', [1.0, 1.1, 1.55], (p) => {
  p.b(mats.woodDark, 1.1, 1.3, 1.0); p.b(mats.woodDark, 1.14, 0.06, 1.04, 0, 1.3, 0);
  p.b(mats.lampGlow, 0.01, 0.5, 0.7, 0.555, 0.45, 0); p.b(mats.brass, 0.02, 0.56, 0.76, 0.552, 0.42, 0);
  p.c(mats.linen, 0.14, 0.04, 0.2, 1.36, 0, 10); p.b(kitMats.switchboard, 0.04, 0.4, 0.3, -0.57, 0.8, 0.3);
  for (const z of [-0.3, 0, 0.3]) p.c(mats.brass, 0.03, 0.05, 0.3, 1.36, z, 6);
});
/** marble massage / shampooing slab */
const marbleSlab = defProp('fgSlab', [0.8, 2.0, 0.75], (p) => {
  p.b(mats.marble, 2.0, 0.12, 0.8, 0, 0.63, 0); p.b(mats.marble, 1.7, 0.63, 0.6, 0, 0, 0); p.b(mats.linen, 0.5, 0.06, 0.6, -0.7, 0.75, 0);
});

// ---------------------------------------------------------------- helpers

const hull = (deck, x) => deckHalfWidth(deck, x) - 0.01;

/** strips of a horizontal face from x0..x1, z0..(hull or z1) at height y */
function flatToHull(b, mat, deck, x0, x1, z0, z1, y, down = true) {
  const n = Math.max(1, Math.ceil((x1 - x0) / 1.0));
  for (let i = 0; i < n; i++) {
    const a = x0 + ((x1 - x0) * i) / n, c = x0 + ((x1 - x0) * (i + 1)) / n, h = Math.min(hull(deck, a), hull(deck, c));
    const za = Math.max(z0, -h), zb = Math.min(z1, h);
    if (zb > za + 0.01) b.flat(mat, a, c, za, zb, y, down);
  }
}

// ---------------------------------------------------------------- swimming bath

export function swimmingBath(ctx) {
  const { plan, world, deck } = ctx, b = plan.batch, Y = ctx.y, top = Y + ctx.h, r = ctx.room, s = r.safe;
  const X0 = 53.4, X1 = 62.4, Z0 = 4.7, Z1 = 8.7, H = 1.0, R = 0.3, tile = mats.tileWhite, blue = kitMats.tileBlue;
  // raised tiled coaming with marble cap, blue-tiled inner faces and bottom, water surface
  b.box(tile, X0, Y, Z0, X1, Y + H, Z0 + R, 'xXzZ'); b.box(tile, X0, Y, Z1 - R, X1, Y + H, Z1, 'xXzZ');
  b.box(tile, X0, Y, Z0 + R, X0 + R, Y + H, Z1 - R, 'xX'); b.box(tile, X1 - R, Y, Z0 + R, X1, Y + H, Z1 - R, 'xX');
  b.box(mats.marble, X0 - 0.04, Y + H, Z0 - 0.04, X1 + 0.04, Y + H + 0.05, Z0 + R, 'xXyYzZ');
  b.box(mats.marble, X0 - 0.04, Y + H, Z1 - R, X1 + 0.04, Y + H + 0.05, Z1 + 0.04, 'xXyYzZ');
  b.box(mats.marble, X0 - 0.04, Y + H, Z0 + R, X0 + R, Y + H + 0.05, Z1 - R, 'xyY'); b.box(mats.marble, X1 - R, Y + H, Z0 + R, X1 + 0.04, Y + H + 0.05, Z1 - R, 'XyY');
  b.wallX(blue, Z0 + R + 0.002, X0 + R, X1 - R, Y, Y + H, 1); b.wallX(blue, Z1 - R - 0.002, X0 + R, X1 - R, Y, Y + H, -1);
  b.wallZ(blue, X0 + R + 0.002, Z0 + R, Z1 - R, Y, Y + H, 1); b.wallZ(blue, X1 - R - 0.002, Z0 + R, Z1 - R, Y, Y + H, -1);
  b.flat(blue, X0 + R, X1 - R, Z0 + R, Z1 - R, Y + 0.02); b.flat(kitMats.water, X0 + R, X1 - R, Z0 + R, Z1 - R, Y + H - 0.16);
  // lane rope / depth line on the bottom and brass ladder at the deep (forward) end
  b.flat(mats.iron, X0 + R + 0.2, X1 - R - 0.2, (Z0 + Z1) / 2 - 0.05, (Z0 + Z1) / 2 + 0.05, Y + 0.025);
  for (const z of [6.3, 7.1]) { b.post(mats.brass, X1 - R - 0.12, z, Y + 0.1, Y + H + 0.55, 0.035); b.bar(mats.brass, [X1 - R - 0.12, Y + H + 0.5, z], [X1 - 0.05, Y + H + 0.5, z], 0.035, 0.035); }
  for (let k = 1; k <= 3; k++) b.bar(mats.brass, [X1 - R - 0.12, Y + k * 0.25, 6.3], [X1 - R - 0.12, Y + k * 0.25, 7.1], 0.03, 0.03);
  // three steps up to the coaming at the after end, three steps down inside
  for (let k = 0; k < 3; k++) {
    b.box(tile, X0 - 0.9 + k * 0.3, Y, 6.0, X0 + (k === 2 ? 0 : -0.6 + k * 0.3), Y + 0.25 * (k + 1), 7.4, 'xXyYzZ');
    b.box(mats.deckWood, X0 - 0.9 + k * 0.3, Y + 0.25 * (k + 1), 6.0, X0 - 0.6 + k * 0.3, Y + 0.25 * (k + 1) + 0.02, 7.4, 'xXYzZ');
    b.box(blue, X0 + R, Y, 6.0, X0 + R + 0.9 - k * 0.3, Y + 0.25 * (k + 1), 7.4, 'XYzZ');
  }
  world.addCollider(X0 - 0.95, Y, Z0, X1 + 0.04, Y + H + 0.05, Z1);
  ctx.occupied.push({ x0: X0 - 1.0, x1: X1 + 0.1, z0: Z0 - 0.1, z1: Z1 + 0.1 });

  // changing cubicles along the ship's side (mahogany partitions, half-drawn curtains, bench)
  const CF = 10.9, cx0 = 50.6, n = 12, cw = 1.2;
  for (let i = 0; i <= n; i++) {
    const x = cx0 + i * cw, zh = hull(deck, x);
    b.box(mats.mahogany, x - 0.02, Y + 0.12, CF, x + 0.02, Y + 2.05, zh, 'xXyYz');
    world.addCollider(x - 0.03, Y, CF, x + 0.03, Y + 2.05, zh);
    if (i < n) {
      const xa = x + 0.02, xc = x + cw - 0.02, zb = Math.min(hull(deck, xa), hull(deck, xc));
      b.bar(mats.brass, [xa, Y + 2.05, CF + 0.03], [xc, Y + 2.05, CF + 0.03], 0.025, 0.025);
      b.box(mats.canvas, xa, Y + 0.3, CF, xa + 0.42 + (i % 3) * 0.1, Y + 2.02, CF + 0.02, 'zZxX');
      b.box(mats.pine, xa, Y + 0.42, zb - 0.42, xc, Y + 0.47, zb, 'yYzxX');
      b.box(mats.brass, x + cw / 2 - 0.15, Y + 1.7, zb - 0.04, x + cw / 2 + 0.15, Y + 1.73, zb, 'yYz');
    }
  }
  b.box(mats.mahogany, cx0, Y + 2.05, CF - 0.02, cx0 + n * cw, Y + 2.15, CF + 0.04, 'xXyYzZ');
  ctx.occupied.push({ x0: cx0 - 0.1, x1: cx0 + n * cw + 0.1, z0: CF - 0.1, z1: 99 });
  // showers and benches at the after bulkhead, slatted floor mats beside the pool
  plan.prop(showerBath(), s.x0 + 0.47, 9.3, 0, { collide: true }); plan.prop(showerBath(), s.x0 + 0.47, 10.25, 0, { collide: true });
  ctx.occupied.push({ x0: s.x0, x1: s.x0 + 1, z0: 8.8, z1: 10.75 });
  plan.prop(bench({ w: 1.6, back: false, mat: 'pine' }), s.x0 + 0.3, 4.4, Math.PI * 0, { collide: false });
  for (const x of [56.2, 59.6]) b.box(mats.deckWood, x - 1.3, Y + 0.005, Z1 + 0.25, x + 1.3, Y + 0.03, Z1 + 1.15, 'yY');
  for (const x of [56, 60]) plan.prop(bench({ w: 1.8, back: true, mat: 'oak' }), x, s.z0 + 0.3, -Math.PI / 2, { collide: false });
  // exposed steel deck beams and a longitudinal girder, lifebuoy-coloured depth signs on the coaming
  for (let x = 51.2; x < s.x1; x += 2.4) b.box(mats.iron, x - 0.08, top - 0.32, s.z0, x + 0.08, top - 0.14, hull(deck, x), 'xXyzZ');
  b.box(mats.iron, s.x0, top - 0.36, 6.65, s.x1, top - 0.14, 6.79, 'xXyzZ');
  for (const x of [X0 + 0.6, X1 - 0.6]) b.box(mats.paintWhite, x - 0.18, Y + 0.55, Z0 - 0.012, x + 0.18, Y + 0.85, Z0, 'z');
  for (const x of [X0 + 0.6, X1 - 0.6]) b.box(mats.fabricRed, x - 0.14, Y + 0.6, Z0 - 0.014, x + 0.14, Y + 0.64, Z0 - 0.012, 'z');
  // extra lamps over the water
  for (const x of [55, 58, 61]) plan.lamp(x, 6.7, 'bowl');
}

/** vestibule of the swimming bath: benches, mirror, towel shelves */
export function bathVestibule(ctx) {
  ctx.fit(shelves({ kind: 'linen', w: 1.5 }), ['far:lo', 'left:hi', 'right:hi']);
  ctx.fit(bench({ w: 1.6, mat: 'mahogany', iron: false }), ['left:mid', 'right:mid', 'far:hi'], { collide: false });
  ctx.fit(bench({ w: 1.6, mat: 'mahogany', iron: false }), ['right:mid', 'left:hi'], { collide: false });
  ctx.mount(mirrorWall({ w: 0.8, h: 1.0, frame: 'mahogany' }), 'far', ctx.W * 0.7, 1.6);
  ctx.mount(clockWall(), 'left', ctx.D * 0.5, 2.0);
}

// ---------------------------------------------------------------- Turkish bath

/** the Cooling Room (hero): Moorish red-and-gold ceiling with gilt beams, blue-green tiles, teak screens, bronze lanterns */
export function coolingRoom(ctx) {
  const { plan, world, deck } = ctx, b = plan.batch, Y = ctx.y, top = Y + ctx.h, r = ctx.room, s = r.safe;
  const fc = top - 0.16;   // false ceiling below the shell beams
  flatToHull(b, moorishCeiling, deck, s.x0 - 0.05, s.x1 + 0.05, s.z0 - 0.05, 99, fc, true);
  // gilt transverse beams and two longitudinal ones, gilt cornice
  for (let x = s.x0 + 1.2; x < s.x1 - 0.5; x += 1.55) b.box(mats.gold, x - 0.08, fc - 0.17, s.z0, x + 0.08, fc, hull(deck, x), 'xXyzZ');
  for (const z of [6.4, 10.2]) b.box(mats.gold, s.x0, fc - 0.13, z - 0.06, s.x1, fc, z + 0.06, 'xXyzZ');
  b.box(mats.gold, s.x0, fc - 0.1, s.z0, s.x1, fc, s.z0 + 0.05, 'yZ');
  // Moorish frieze around the inner walls
  b.wallZ(moorishCeiling, s.x0 + 0.002, s.z0, hull(deck, s.x0), fc - 0.45, fc - 0.1, 1);
  b.wallZ(moorishCeiling, s.x1 - 0.002, s.z0, hull(deck, s.x1), fc - 0.45, fc - 0.1, -1);
  b.wallX(moorishCeiling, s.z0 + 0.002, s.x0, s.x1, fc - 0.45, fc - 0.1, 1);
  // ship's side: tiled dado, carved teak screens in front of the portholes, gilt rail
  for (let x = s.x0; x < s.x1 - 0.01; x += 1.25) {
    const xb = Math.min(s.x1, x + 1.25), zh = Math.min(hull(deck, x), hull(deck, xb)) - 0.03;
    b.wallX(kitMats.tileBlue, zh, x, xb, Y, Y + 0.95, -1);
    b.wallX(teakLattice, zh - 0.06, x + 0.06, xb - 0.06, Y + 0.95, fc - 0.48, -1);
    b.box(mats.woodDark, x, Y + 0.95, zh - 0.1, x + 0.06, fc - 0.45, zh, 'xXz');
    b.box(mats.gold, x, Y + 0.93, zh - 0.1, xb, Y + 0.98, zh, 'yYz');
    b.box(mats.woodDark, x, fc - 0.5, zh - 0.1, xb, fc - 0.45, zh, 'yz');
  }
  // free-standing carved teak screen with Moorish arch dividing the alcove of the fountain
  const xs = s.x1 - 2.2;
  for (const [za, zb] of [[s.z0 + 2.6, s.z0 + 3.6], [s.z0 + 5.4, s.z0 + 6.4]]) {
    b.wallZ(teakLattice, xs, za, zb, Y + 0.3, Y + 2.1, 1); b.wallZ(teakLattice, xs + 0.001, za, zb, Y + 0.3, Y + 2.1, -1);
    b.box(mats.woodDark, xs - 0.05, Y, za - 0.06, xs + 0.05, Y + 2.2, za, 'xXzZY'); b.box(mats.woodDark, xs - 0.05, Y, zb, xs + 0.05, Y + 2.2, zb + 0.06, 'xXzZY');
    b.box(mats.woodDark, xs - 0.05, Y, za, xs + 0.05, Y + 0.3, zb, 'xXY'); b.box(mats.gold, xs - 0.06, Y + 2.1, za - 0.06, xs + 0.06, Y + 2.2, zb + 0.06, 'xXyY');
    world.addCollider(xs - 0.06, Y, za - 0.06, xs + 0.06, Y + 2.2, zb + 0.06);
    ctx.occupied.push({ x0: xs - 0.4, x1: xs + 0.4, z0: za - 0.1, z1: zb + 0.1 });
  }
  b.box(mats.gold, xs - 0.06, Y + 2.15, s.z0 + 3.6, xs + 0.06, Y + 2.22, s.z0 + 5.4, 'xXyY');
  // marble drinking fountain in the alcove (forward wall)
  plan.prop(fountain(), s.x1 - 0.27, s.z0 + 4.5, Math.PI, { collide: true });
  ctx.occupied.push({ x0: s.x1 - 0.6, x1: s.x1, z0: s.z0 + 3.9, z1: s.z0 + 5.1 });
  // couches along the walls, Damascus tables, coffee trays, palms
  for (const w of ['left', 'right', 'near', 'far']) for (let k = 0; k < 6; k++) if (!ctx.fit(coolingCouch({ mat: (k + w.length) % 2 ? 'fabricRed' : 'fabricGold' }), [w + ':lo'])) break;
  ctx.grid(2.6, 2.6, (u, v, i, j) => {
    if (!ctx.put(damascusTable(), u, v, 'in')) return;
    if ((i + j) % 2 === 0) { ctx.put(coolingCouch({ mat: 'fabricRed' }), u, v + 0.85, 'out'); ctx.put(coolingCouch({ mat: 'fabricGold' }), u, v - 0.85, 'in'); }
    else ctx.put(brassTray(), u + 0.8, v, 'in', { collide: false });
  }, 1.4);
  for (const p of ['near:hi', 'far:lo']) ctx.fit(pottedPalm(), [p], { collide: false });
  // bronze lanterns
  for (const x of [s.x0 + 2.4, (s.x0 + s.x1) / 2, s.x1 - 3.2]) for (const z of [5.0, 8.4, 11.6]) {
    if (z > hull(deck, x) - 0.6) continue;
    plan.prop(lantern(), x, z, 0, { y: fc });
    world.addLamp({ x, y: fc - 0.8, z, color: 0xffb060, intensity: 0.8 });
  }
}

/** hot / temperate room: teak loungers and steam heating pipes */
export function hotRoom(ctx) {
  const n = ctx.W > 2.6 ? 2 : 1;
  for (let k = 0; k < 4; k++) if (!ctx.fit(coolingCouch({ mat: 'pine' }), ['left:lo', 'right:lo', 'far:lo'])) break;
  ctx.fit(heater(), ['far:mid', 'near:hi'], { collide: false });
  for (let i = 0; i < n; i++) ctx.box('copper', 0.05, ctx.D - 0.25 - i * 0.12, ctx.W - 0.05, ctx.D - 0.17 - i * 0.12, 0.25 + i * 0.12, 0.33 + i * 0.12);
}
/** steam room: tiered marble benches */
export function steamRoom(ctx) {
  ctx.box('marble', 0.05, ctx.D - 0.7, ctx.W - 0.05, ctx.D - 0.05, 0, 0.45, true);
  ctx.box('marble', 0.05, ctx.D - 0.35, ctx.W - 0.05, ctx.D - 0.05, 0.45, 0.9, false);
  ctx.box('marble', 0.05, 1.2, 0.5, ctx.D - 0.75, 0, 0.45, true);
  ctx.box('copper', 0.6, ctx.D - 0.75, ctx.W - 0.6, ctx.D - 0.7, 0.05, 0.12);
}
export function shampooRoom(ctx) {
  ctx.fit(marbleSlab(), ['far:mid', 'left:hi', 'right:hi']);
  ctx.fit(showerBath(), ['left:hi', 'right:hi', 'far:lo']);
  ctx.fit(basinSmall(), ['right:lo', 'left:lo', 'near:hi'], { collide: false });
}
export function electricBath(ctx) {
  ctx.fit(lightBath(), ['far:mid', 'left:hi', 'right:hi']);
  ctx.fit(chair({ cls: 'plain', mat: 'oak' }), ['left:mid', 'right:mid'], { collide: false });
  ctx.fit(shelves({ kind: 'linen', w: 1.0 }), ['right:lo', 'left:lo', 'near:hi']);
}
/** entrance of the Turkish bath: ticket desk, benches, clock */
export function bathEntrance(ctx) {
  if (ctx.fit(desk({ w: 1.4, mat: 'mahogany' }), ['far:hi', 'right:hi'])) ctx.fit(chair({ cls: 'plain', mat: 'mahogany' }), ['far:lo'], { collide: false });
  ctx.fit(bench({ w: 1.8, mat: 'mahogany', iron: false }), ['left:mid', 'right:mid'], { collide: false });
  ctx.fit(shelves({ kind: 'linen', w: 1.5 }), ['right:hi', 'left:hi']);
  ctx.mount(clockWall(), 'far', ctx.W / 2, 2.0);
}

// ---------------------------------------------------------------- third-class dining saloon

const CHAIR = chairDining({ cls: 'plain', mat: 'oak' });
/** Long tables with separate wooden chairs (chairs as InstancedMesh), sideboards, posters, coat hooks, pipes. */
export function thirdDining(inst, o = {}) {
  return (ctx) => {
    const { plan, world, deck } = ctx, b = plan.batch, Y = ctx.y, r = ctx.room, s = r.safe;
    // sideboards along the walls first
    for (const w of ['left', 'right']) for (let k = 0; k < 2; k++) ctx.fit(servingCounter({ w: 2.2, d: 0.6, mat: 'pine', top: 'oak', items: true }), [w + (k ? ':hi' : ':lo')]);
    ctx.fit(shelves({ kind: 'crockery', w: 1.5, mat: 'pine' }), ['far:mid', 'far:lo']);
    const TL = 2.9, TD = 0.85;
    let chairs = 0;
    ctx.grid(TL + 1.3, 2.45, (u, v) => {
      if (!ctx.free(u, v, TL + 0.2, TD + 1.15)) return;
      if (!ctx.put(tableRect({ w: TL, d: TD, mat: 'oak', set: true }), u, v, 'in')) return;
      for (let k = 0; k < 5; k++) for (const sgn of [-1, 1]) {
        const p = ctx.at(u - 1.16 + k * 0.58, v + sgn * 0.68);
        inst.add(CHAIR, p.x, Y, p.z, ctx.rot(sgn > 0 ? 'out' : 'in')); chairs++;
      }
      ctx.occupied.push(ctx._rect(u, v, TL + 0.2, TD + 1.15));
    }, 0.8);
    r.seats = chairs;
    // White Star posters on the transverse walls, coat hooks along the ship's side, exposed pipes
    const doorsAt = (side) => (r.doorsAll ?? []).filter((d) => d.side === side).map((d) => d.at);
    for (const [side, x, n] of [['aft', r.x0 + 0.05, 1], ['fwd', r.x1 - 0.05, -1]]) {
      const ds = doorsAt(side), zl = Math.max(s.z0, -hull(deck, x)) + 1, zr = Math.min(s.z1, hull(deck, x)) - 1;
      for (let z = zl; z <= zr; z += 3.1) if (!ds.some((d) => Math.abs(d - z) < 1.4) && !(Math.abs(z) < 3.4 && o.casingWalls?.includes(side))) poster(b, 'z', x, z, Y + 1.25, 0.6, 0.8, n);
    }
    for (const sg of [-1, 1]) {
      const zw = sg * (hull(deck, (s.x0 + s.x1) / 2) - 0.02);
      if (zw < s.z0 || zw > s.z1 + 0.05) continue;
      b.box(mats.woodDark, s.x0 + 0.5, Y + 1.62, zw - (sg > 0 ? 0.05 : 0), s.x1 - 0.5, Y + 1.72, zw + (sg < 0 ? 0.05 : 0), sg > 0 ? 'zyY' : 'ZyY');
      for (let x = s.x0 + 0.7; x < s.x1 - 0.5; x += 0.45) b.box(mats.brass, x - 0.012, Y + 1.6, zw - sg * 0.12, x + 0.012, Y + 1.66, zw, 'xXyYzZ');
    }
    ceilingPipes(world, deck, pipe, s.x0, s.x1, o.pipes ?? [-1.8, 4.2, 9.0], 'steelDark', 0.07);
    ceilingPipes(world, deck, pipe, s.x0, s.x1, [12.6], 'paintWhite', 0.05);
  };
}

// ---------------------------------------------------------------- machinery access lobbies (steel)

export function machineLobby(ctx) {
  for (const p of ['near:hi', 'left:lo', 'right:lo', 'far:lo']) ctx.fit(locker({ n: 4, mat: 'steelDark' }), [p]);
  ctx.fit(bench({ w: 1.6, back: false, iron: true }), ['left:mid', 'right:mid', 'far:mid'], { collide: false });
  ctx.fit(wardrobe({ w: 1.0, mat: 'steelDark' }), ['far:hi', 'right:hi']);
  ctx.mount(gauge({ r: 0.14 }), 'near', ctx.W * 0.75, 1.7); ctx.mount(clockWall(), 'near', ctx.W * 0.6, 1.9);
  ctx.put(valve(), 0.25, ctx.D - 0.25, 'in', { collide: false });
  const { world, deck, plan } = ctx, r = ctx.room, s = r.safe, y = ctx.y + ctx.h - 0.3;
  pipe(plan.zone((s.x0 + s.x1) / 2), 'steelDark', [[s.x0 + 0.15, y, s.z0 + 0.15], [s.x1 - 0.15, y, s.z0 + 0.15]], 0.08);
  pipe(plan.zone((s.x0 + s.x1) / 2), 'copper', [[s.x0 + 0.15, y - 0.2, s.z1 - 0.15], [s.x1 - 0.15, y - 0.2, s.z1 - 0.15]], 0.05);
}
