// Orlop deck: William Carter's 1912 Renault Type CE Coupé de Ville and its shipping crate, cargo-hold furnishing
// that keeps walking lanes free, mail-room furnishing.
import { mats } from '../core/materials.js';
import { PRESETS, overlap, sackPile, shelves, tableRect, safe, crate, stool, trunk } from '../interior/kit.js';
import { defProp, carPaint } from './f-util.js';

/** low-poly Renault Type CE Coupé de Ville (1912): sloping bonnet with dashboard radiator, open chauffeur's seat, closed coupé body */
export const renault = defProp('fgRenault', [1.8, 4.55, 2.1], (p) => {
  // wheels with wooden artillery spokes, axles, chassis
  for (const x of [1.45, -1.35]) for (const z of [-0.74, 0.74]) {
    p.cz(mats.rubber, 0.45, 0.12, x, 0.45, z, 16); p.cz(mats.woodDark, 0.34, 0.13, x, 0.45, z, 12); p.cz(mats.brass, 0.08, 0.17, x, 0.45, z, 8);
    for (let k = 0; k < 3; k++) p.b(mats.oak, 0.05, 0.66, 0.06, x, 0.12, z).rotation.z = (k * Math.PI) / 3;
  }
  for (const x of [1.45, -1.35]) p.cz(mats.iron, 0.03, 1.4, x, 0.45, 0, 6);
  for (const z of [-0.48, 0.48]) p.b(mats.iron, 4.1, 0.12, 0.07, 0.05, 0.48, z);
  // mudguards and running boards
  for (const z of [-0.76, 0.76]) {
    p.b(mats.iron, 0.95, 0.03, 0.24, 1.45, 0.95, z); p.b(mats.iron, 0.4, 0.03, 0.24, 1.98, 0.8, z).rotation.z = -0.6;
    p.b(mats.iron, 0.95, 0.03, 0.24, -1.35, 0.95, z); p.b(mats.iron, 0.4, 0.03, 0.24, -1.88, 0.8, z).rotation.z = 0.6;
    p.b(mats.woodDark, 2.0, 0.04, 0.26, 0.05, 0.6, z * 1.08); p.b(mats.brass, 2.0, 0.01, 0.02, 0.05, 0.64, z * 1.2);
  }
  // Renault "coal-scuttle" bonnet sloping down to the front, radiator behind it at the dashboard
  p.b(carPaint, 1.05, 0.38, 0.86, 1.6, 0.62, 0); p.b(carPaint, 1.1, 0.04, 0.88, 1.6, 0.98, 0).rotation.z = -0.2;
  for (const z of [-0.44, 0.44]) for (let k = 0; k < 6; k++) p.b(mats.iron, 0.04, 0.2, 0.01, 1.25 + k * 0.12, 0.72, z);
  p.b(mats.brass, 0.1, 0.62, 1.0, 1.02, 0.6, 0); p.b(mats.iron, 0.02, 0.5, 0.86, 1.075, 0.66, 0);
  p.b(mats.brass, 0.06, 0.06, 0.06, 1.02, 1.24, 0);
  for (const z of [-0.42, 0.42]) { p.cx(mats.brass, 0.11, 0.22, 2.2, 1.02, z, 10); p.cx(mats.mirror, 0.09, 0.02, 2.32, 1.02, z, 10); p.b(mats.iron, 0.05, 0.3, 0.03, 2.1, 0.62, z); }
  p.cx(mats.brass, 0.04, 0.4, 2.0, 0.62, 0, 6);
  // open chauffeur's compartment: low side panels, leather bench, wheel, levers, horn
  for (const z of [-0.7, 0.7]) p.b(carPaint, 0.85, 0.42, 0.05, 0.55, 0.62, z);
  p.b(mats.woodDark, 0.85, 0.03, 1.4, 0.55, 0.62, 0);
  p.b(mats.leather, 0.5, 0.2, 1.3, 0.48, 0.65, 0); p.b(mats.leather, 0.12, 0.42, 1.36, 0.22, 0.85, 0);
  p.b(mats.woodDark, 0.06, 0.38, 1.36, 0.98, 0.66, 0);
  p.c(mats.iron, 0.022, 0.62, 0.84, 0.72, -0.32, 6).rotation.z = 0.55;
  p.t(mats.woodDark, 0.19, 0.016, 0.7, 1.28, -0.32, 'y', 14).rotation.y = 0;
  for (const z of [0.5, 0.58]) p.c(mats.brass, 0.012, 0.45, 0.85, 0.62, z, 4);
  p.cx(mats.brass, 0.03, 0.5, 1.2, 1.2, 0.5, 6); p.s(mats.rubber, 0.06, 0.92, 1.2, 0.5, 1, 1, 1, true);
  p.t(mats.rubber, 0.42, 0.06, 0.6, 0.98, 0.84, 'z', 16);
  // enclosed coupé body for the owner: lower body, glazed upper part, roof, coach lamps, door handles
  p.b(carPaint, 2.1, 0.58, 1.5, -0.85, 0.62, 0);
  p.b(mats.leather, 0.55, 0.62, 1.52, -1.6, 1.2, 0);
  p.b(mats.glass, 1.4, 0.54, 1.46, -0.6, 1.22, 0);
  for (const x of [-1.32, -0.6, 0.15]) for (const z of [-0.74, 0.74]) p.b(carPaint, 0.08, 0.56, 0.04, x, 1.2, z);
  for (const z of [-0.74, 0.74]) p.b(carPaint, 1.45, 0.06, 0.04, -0.6, 1.2, z);
  p.b(carPaint, 0.06, 0.56, 1.5, 0.17, 1.2, 0);
  p.b(mats.leather, 2.25, 0.1, 1.6, -0.82, 1.76, 0); p.b(mats.brass, 1.6, 0.03, 1.4, -0.85, 1.86, 0);
  p.b(mats.fabricRed, 0.5, 0.42, 1.36, -1.48, 0.86, 0);
  for (const z of [-0.8, 0.8]) { p.c(mats.brass, 0.06, 0.24, 0.24, 1.32, z, 8); p.b(mats.lampGlow, 0.02, 0.1, 0.06, 0.3, 1.38, z); p.b(mats.brass, 0.1, 0.02, 0.02, -0.5, 1.0, z * 0.95); }
  p.b(mats.gold, 2.1, 0.02, 0.01, -0.85, 1.05, -0.755); p.b(mats.gold, 2.1, 0.02, 0.01, -0.85, 1.05, 0.755);
  p.b(mats.iron, 0.3, 0.3, 0.9, -2.1, 0.62, 0);
});

/** the opened shipping crate the car travelled in (front +x = open end) */
export const carCrate = defProp('fgCarCrate', [2.1, 4.9, 2.25], (p) => {
  p.b(mats.pine, 4.9, 0.14, 2.1); for (const z of [-0.8, 0, 0.8]) p.b(mats.oak, 4.9, 0.1, 0.12, 0, -0.0, z);
  for (const s of [-1, 1]) {
    for (let k = 0; k < 5; k++) p.b(mats.pine, 4.9, 0.3, 0.03, 0, 0.18 + k * 0.42, s * 1.035);
    for (const x of [-2.4, -0.8, 0.8, 2.4]) p.b(mats.oak, 0.1, 2.1, 0.05, x, 0.14, s * 1.07);
  }
  for (let k = 0; k < 7; k++) p.b(mats.pine, 0.03, 2.1, 0.28, -2.435, 0.14, -0.9 + k * 0.3);
  p.b(mats.pine, 4.9, 0.03, 2.1, 0, 2.22, 0);
  p.b(mats.paper, 0.01, 0.4, 0.7, -2.46, 1.3, 0);
});

/** cargo-hold preset that keeps the given walking lanes (world rectangles) free */
export function cargoHold(lanes, extra) {
  return (ctx) => {
    const free0 = ctx.free.bind(ctx);
    ctx.free = (u, v, eu, ev) => free0(u, v, eu, ev) && !lanes.some((l) => overlap(l, ctx._rect(u, v, eu, ev), 0.01));
    if (extra) extra(ctx);
    PRESETS.hold(ctx);
  };
}

/** Renault hero placement inside hold No. 2 */
export function renaultHold(lanes) {
  return cargoHold(lanes, (ctx) => {
    const { plan, world } = ctx, Y = ctx.y, x = 88.6, z = 2.5;
    plan.prop(renault(), x, z, 0.08, { collide: true });
    ctx.occupied.push({ x0: x - 2.5, x1: x + 2.5, z0: z - 1.2, z1: z + 1.2 });
    plan.prop(carCrate(), 88.4, -3.3, 0, { collide: false });
    for (const [x0, z0, x1, z1] of [[85.95, -4.4, 90.85, -4.3], [85.95, -2.3, 90.85, -2.2], [85.95, -4.4, 86.05, -2.2]]) world.addCollider(x0, Y, z0, x1, Y + 2.25, z1);
    ctx.occupied.push({ x0: 85.9, x1: 90.9, z0: -4.45, z1: -2.15 });
    // chocks, lashing ropes, spare can, the lid of the crate leaning against the hull
    for (const dx of [1.45, -1.35]) for (const dz of [-0.95, 0.95]) plan.batch.box(mats.oak, x + dx - 0.25, Y, z + dz - 0.08, x + dx + 0.25, Y + 0.12, z + dz + 0.08);
    plan.prop(crate({ s: 0.6 }), 91.8, 3.9, 0.3, { collide: false });
    world.addLamp({ x, y: Y + 2.1, z, color: 0xffe2b0, intensity: 1.2 });
  });
}

/** registered-mail hold: stacks of mail bags, a sorting table, the safe for registered letters */
export function mailHold(ctx) {
  ctx.fit(shelves({ kind: 'empty', w: 1.5, mat: 'oak' }), ['far:lo', 'far:hi']);
  ctx.fit(safe(), ['near:hi', 'left:hi']);
  if (ctx.put(tableRect({ w: 1.6, d: 0.8, mat: 'oak' }), 1.4, Math.min(2.0, ctx.D / 2), 'in')) ctx.put(stool({ mat: 'oak', seat: 'oak' }), 1.4, Math.min(2.0, ctx.D / 2) - 0.65, 'in', { collide: false });
  ctx.grid(1.6, 1.25, (u, v, i, j) => { if (!((i === 0 && j < 2))) ctx.put(sackPile(), u, v, (i + j) % 2 ? 'in' : 'right'); }, 0.7);
  ctx.fit(trunk({ big: true }), ['right:lo', 'left:lo']);
}
