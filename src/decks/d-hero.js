// D deck – hero rooms besides the dining saloons: 1st class Reception Room with the forward Grand Staircase landing and
// the lift shafts, the gangway vestibules, the main galley and its service rooms, the ship's hospital.
import * as THREE from 'three';
import { mats } from '../core/materials.js';
import { DECK_Y, STAIRS } from '../core/constants.js';
import { AT } from '../interior/batch.js';
import {
  imperialPlan, def, place,
  kitMats, matOf, pipe, pottedPalm, piano, stool, sconce, column, pilaster, liftCage, clockWall, settee, newspaper, bookPile,
  range, oven, servingCounter, kettle, butcherBlock, sink, shelves, sackPile, barrel, crate, tableRect, basinSmall,
  chairDining, bench, locker, mirrorWall,
} from '../interior/kit.js';
import { InstField, G, boxG, rng, rotOf, leadedWindow, wctx, tapestryMat, panelRun, strapCeiling, ceilingOrnaments, addMesh, corbel } from './d-util.js';
import { vase } from './d-saloon.js';
import { fineLv, cgPlateRack, cgJugBasin, cgBottles, cgMenuBoard, cgMopBucket, hangFree as hangFreeD } from './f-util.js';

const NX = Math.PI, TAU = Math.PI * 2, M = mats, K = kitMats;
const atl = (g, c) => G.atlasCell(g, c);

// ================================================================= reception room furniture

/** barrel-backed wicker (cane) armchair: woven tub base with plaited bands, wrap-round back rising from scrolled arm
 *  ends to a high back, rolled rim, loose seat cushion. front +x */
export const wickerChair = def('dWickerChair', [0.7, 0.68, 0.92], (p, o) => {
  const cane = K.cane, wk = M.wicker;
  p.add(G.lathe([[0.25, 0], [0.275, 0.05], [0.29, 0.2], [0.295, 0.36], [0.285, 0.4]], 14), cane);
  p.add(G.lathe([[0.285, 0.4], [0, 0.4]], 14), cane);
  for (const [y, R] of [[0.035, 0.262], [0.2, 0.292], [0.385, 0.292]]) { const t = p.add(new THREE.TorusGeometry(R, 0.016, 3, 14), wk, 0, y, 0); t.rotation.x = Math.PI / 2; }
  const a0 = Math.PI / 2 + 0.75, al = TAU - 1.5, hb = (u) => 0.2 + 0.36 * Math.pow(Math.sin(Math.PI * u), 1.3);
  p.add(G.arcWall(0.315, 0.035, a0, al, 0.38, hb, 14), cane);
  const rim = []; for (let i = 0; i <= 12; i++) { const u = i / 12, a = a0 + al * u; rim.push([Math.sin(a) * 0.298, 0.38 + hb(u), Math.cos(a) * 0.298]); }
  p.add(G.tube(rim, 0.026, 14, 4), wk);
  for (const u of [0, 1]) { const a = a0 + al * u, t = p.add(new THREE.TorusGeometry(0.03, 0.012, 3, 8), wk, Math.sin(a) * 0.3, 0.55, Math.cos(a) * 0.3); t.rotation.y = a; }
  p.add(G.pillow(0.5, 0.09, 0.5, 0.35, 0.7, 3, 10), matOf(o.mat, M.fabricGreen), 0.02, 0.4, 0);
});

/** round wicker table: cane top with plaited rim, four splayed legs, lower ring shelf */
export const wickerTable = def('dWickerTable', [0.8, 0.8, 0.7], (p) => {
  p.add(G.lathe([[0.4, 0.66], [0.4, 0.69], [0, 0.69]], 18), K.cane);
  const t = p.add(new THREE.TorusGeometry(0.4, 0.02, 3, 18), M.wicker, 0, 0.675, 0); t.rotation.x = Math.PI / 2;
  p.add(G.lathe([[0.36, 0.56], [0.36, 0.66]], 18), K.cane);
  for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + Math.PI / 4, c = Math.cos(a), s = Math.sin(a); p.add(G.loft([[c * 0.32, 0.6, s * 0.32], [c * 0.3, 0.3, s * 0.3], [c * 0.34, 0, s * 0.34]], 0.02, 5, false), M.wicker); }
  const r = p.add(new THREE.TorusGeometry(0.3, 0.014, 3, 16), M.wicker, 0, 0.18, 0); r.rotation.x = Math.PI / 2;
  p.add(G.lathe([[0.3, 0.18], [0, 0.18]], 16), K.cane);
});

/** Chesterfield settee: deep-buttoned back and arms of equal height, rolled arms, loose seat cushions, bun feet */
export const chesterfield = def('dChesterfield', (o) => [o.w ?? 1.9, 0.86, 0.78], (p, o) => {
  const w = o.w ?? 1.9, f = matOf(o.mat, M.leather), d = 0.86;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.add(G.lathe([[0.03, 0], [0.04, 0.02], [0.045, 0.05], [0.035, 0.08], [0, 0.085]], 8), M.woodDark, sx * (d / 2 - 0.08), 0, sz * (w / 2 - 0.08));
  p.bb(f, d, 0.3, w, 0, 0.08, 0, 0.03);
  const n = w > 1.6 ? 3 : 2, cw = (w - 0.4) / n;
  for (let i = 0; i < n; i++) p.add(G.pillow(0.62, 0.12, cw - 0.01, 0.3, 0.2, 3, 10, 0.008), f, 0.08, 0.37, -w / 2 + 0.2 + cw * (i + 0.5));
  p.bb(f, 0.22, 0.42, w, -d / 2 + 0.11, 0.36, 0, 0.03);
  p.add(G.tufted(w - 0.36, 0.34, Math.max(4, Math.round(w * 3)), 2, 0.016, 0.03, 2), f, -d / 2 + 0.22, 0.6, 0);
  p.add(G.loft([[-d / 2 + 0.12, 0.76, -w / 2 + 0.1], [-d / 2 + 0.12, 0.77, 0], [-d / 2 + 0.12, 0.76, w / 2 - 0.1]], 0.075, 8), f);
  for (const s of [-1, 1]) {
    p.bb(f, d - 0.05, 0.38, 0.17, 0.02, 0.36, s * (w / 2 - 0.085), 0.03);
    p.add(G.loft([[-d / 2 + 0.1, 0.74, s * (w / 2 - 0.09)], [0, 0.75, s * (w / 2 - 0.1)], [d / 2 - 0.03, 0.74, s * (w / 2 - 0.09)]], [[0.1, 0.085], [0.1, 0.09], [0.1, 0.085]], 8), f);
    const t = p.add(G.tufted(d - 0.22, 0.26, 3, 1, 0.012, 0.022, 2), f, 0.04, 0.58, s * (w / 2 - 0.17)); t.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2;
  }
});

/** blue-and-white porcelain jardinière on a carved stand (holds a palm placed 0.18 m higher) */
export const jardiniere = def('dJardiniere', [0.7, 0.7, 0.66], (p) => {
  for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU; p.add(G.loft([[Math.cos(a) * 0.2, 0.17, Math.sin(a) * 0.2], [Math.cos(a) * 0.26, 0.08, Math.sin(a) * 0.26], [Math.cos(a) * 0.24, 0, Math.sin(a) * 0.24]], 0.025, 5, true), M.mahogany); }
  p.add(G.lathe([[0.24, 0.15], [0.25, 0.17], [0, 0.17]], 12), M.mahogany);
  p.add(G.lathe([[0.16, 0.17], [0.27, 0.24], [0.33, 0.36], [0.33, 0.48], [0.3, 0.58], [0.34, 0.64], [0.345, 0.65], [0.3, 0.632], [0.285, 0.595]], 18), M.porcelain); // the inner lip covers the top of the flared rim
  p.add(atl(G.lathe([[0.333, 0.37], [0.333, 0.47]], 18), AT.cobalt), K.atlas);
  p.add(atl(G.lathe([[0.31, 0.585], [0.335, 0.62]], 18), AT.cobalt), K.atlas);
  p.add(atl(G.lathe([[0.305, 0.59], [0, 0.59]], 12), AT.soil), K.atlas); // soil reaches the wall (no gap under the lip)
});

/** bronze electrolier: rose, stem with collar, four scrolled arms with tulip shades, pendant finial (origin at the ceiling) */
export const bronzeLight = def('dBronzeLight', [0.8, 0.8, 0.7], (p) => {
  const br = K.bronze;
  p.add(G.lathe([[0, -0.06], [0.06, -0.05], [0.13, -0.02], [0.14, 0]], 12), br);
  p.add(G.lathe([[0.012, -0.05], [0.012, -0.32], [0.04, -0.36], [0.05, -0.42], [0.03, -0.47], [0, -0.5]].reverse(), 10), br);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + Math.PI / 4, c = Math.cos(a), s = -Math.sin(a);
    p.add(G.loft([[c * 0.04, -0.4, s * 0.04], [c * 0.16, -0.45, s * 0.16], [c * 0.27, -0.4, s * 0.27], [c * 0.3, -0.33, s * 0.3]], 0.01, 5, false), br);
    p.add(G.lathe([[0, 0], [0.025, 0], [0.065, 0.06], [0.07, 0.11], [0, 0.11]], 10), M.lampGlow, c * 0.3, -0.45, s * 0.3);
    p.add(G.lathe([[0, 0], [0.028, 0], [0.03, 0.02], [0, 0.02]], 8), br, c * 0.3, -0.34, s * 0.3);
  }
});

/** tea service on a silver tray: pot, two cups on saucers, sugar bowl */
export const teaSet = def('dTeaSet', [0.4, 0.3, 0.2], (p, o) => {
  p.add(G.lathe([[0, 0], [0.17, 0], [0.18, 0.012], [0.17, 0.014], [0, 0.004]], 14), M.chrome);
  p.add(G.lathe([[0, 0], [0.05, 0], [0.065, 0.05], [0.055, 0.1], [0.025, 0.12], [0.03, 0.13], [0, 0.145]], 10), M.chrome, -0.05, 0.012, 0.04);
  p.add(G.loft([[0.0, 0.07, 0.04], [0.04, 0.1, 0.04], [0.07, 0.12, 0.04]], 0.008, 4, false), M.chrome);
  const cups = o.v === 1 ? [[0.08, -0.07]] : [[0.08, -0.07], [0.07, 0.09]];
  for (const [x, z] of cups) {
    p.add(G.lathe([[0, 0], [0.06, 0.004], [0.07, 0.012], [0, 0.008]], 10), M.porcelain, x, 0.012, z);
    p.add(G.lathe([[0, 0.008], [0.025, 0.008], [0.04, 0.03], [0.045, 0.06], [0.04, 0.06], [0, 0.03]], 10), M.porcelain, x, 0.012, z);
    p.add(atl(G.lathe([[0.0455, 0.05], [0.0455, 0.058]], 10), AT.cobalt), K.atlas, x, 0.012, z);
  }
  p.add(G.lathe([[0, 0], [0.03, 0], [0.04, 0.04], [0, 0.04]], 8), M.porcelain, -0.08, 0.012, -0.09);
});

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
  const plan = ctx.plan, world = ctx.world, Y = ctx.y, h = ctx.h, TOP = Y + h, b = plan.batch, w = wctx(ctx), { x0, x1 } = RECEPTION;
  const HW = plan.halfWidth((x0 + x1) / 2), D = rng(1209), t0 = b.tris;
  liftShafts(plan, w, Y, h);
  const cas = plan.casings.find((c) => c.x1 > x0 && c.x0 < x1), stair = plan.keepouts.find((k) => k.id === 'grandFwd');
  const sp = imperialPlan(STAIRS.find((q) => q.id === 'grandFwd')), ym = (DECK_Y.D + DECK_Y.C) / 2; // half-landing D → C

  // Aubusson tapestry on the back wall of the half-landing above the Reception Room, seen across the stair well
  const tx = sp.x0 + 0.014, ty0 = ym + 0.98, ty1 = ym + 2.22, tz = 0.95;
  b.poly(tapestryMat, [[tx, ty0, tz], [tx, ty0, -tz], [tx, ty1, -tz], [tx, ty1, tz]], [1, 0, 0], [[0, 0], [1, 0], [1, 1], [0, 1]]);
  for (const [za, zb, ya, yb] of [[-tz - 0.08, tz + 0.08, ty0 - 0.08, ty0], [-tz - 0.08, tz + 0.08, ty1, ty1 + 0.08], [-tz - 0.08, -tz, ty0, ty1], [tz, tz + 0.08, ty0, ty1]]) {
    b.box(mats.gold, sp.x0, ya, za, sp.x0 + 0.045, yb, zb, 'Xyz' + 'YZ');
  }

  // ---------------------------------------------------------------- white Jacobean panelling (carved in low relief)
  const PX = [31.4, 34, 36.6]; // pilasters on the casing sides
  const run = (P, A, O, len, gaps, o = {}) => panelRun(b, { P, A, O, len, Y, TOP, gaps, rail: true, ...o });
  for (const s of [-1, 1]) {
    run([s > 0 ? cas.x0 : cas.x1, Y, s * cas.z1], [s, 0, 0], [0, 0, s], cas.x1 - cas.x0, PX.map((x) => { const a = s > 0 ? x - cas.x0 : cas.x1 - x; return [a - 0.17, a + 0.17]; }));
    for (const x of PX) w.mount(pilaster({ h, w: 0.24, mat: 'paintWhite', capital: 'paintWhite' }), x, s * (cas.z1 + 0.04), s > 0 ? 'stbd' : 'port', 0);
    for (const x of [32.7, 35.3]) w.mount(sconce(), x, s * (cas.z1 + 0.03), s > 0 ? 'stbd' : 'port', 1.85);
  }
  const aftG = w.doorGaps('aft', 0.16).map(([a, c]) => [a, c]);
  for (const s of [-1, 1]) {
    // aft wall (x 30.5) beside the casing, forward wall (x 47.5) beside the lifts
    const za = s * (cas.z1 + 0.02), zb = s * HW;
    run([x0 + 0.05, Y, za], [0, 0, s], [1, 0, 0], HW - cas.z1 - 0.02, aftG.map(([a, c]) => (s > 0 ? [a - za, c - za] : [za - c, za - a])));
    const fz = s * 2.55, fg = w.doorGaps('fwd', 0.16);
    run([x1 - 0.05, Y, fz], [0, 0, s], [-1, 0, 0], HW - 2.55, fg.map(([a, c]) => (s > 0 ? [a - fz, c - fz] : [fz - c, fz - a])));
    void zb;
    // hull: dado panels full length, upper panels between the leaded windows
    const P = [x0 + 0.05, Y, s * (HW - 0.004)], L = x1 - x0 - 0.1;
    const wins = []; for (let x = 31.05; x < x1 - 1; x += 2.7) wins.push(x);
    run(P, [1, 0, 0], [0, 0, -s], L, [], { upper: false, frieze: false, rail: true, backBands: [[Y + 0.13, Y + 0.99]] });
    run(P, [1, 0, 0], [0, 0, -s], L, wins.map((x) => [x - x0 - 0.05 - 1.38, x - x0 - 0.05 + 1.38]), { lower: false, rail: false, backBands: [[Y + 0.99, TOP - 0.13]] });
    for (const x of wins) leadedWindow(plan, x, s, { w: 2.0, y0: 0.95, y1: 2.2, curtain: M.fabricGold });
  }
  // strapwork ceiling with beams over the column lines, kept clear of casing, stair well and lifts
  const f = new InstField(world, plan.deck);
  ceilingOrnaments(f, M.paintWhite, M.gold);
  strapCeiling(plan, f, { x0: x0 + 0.05, x1: x1 - 0.05, z0: -HW, z1: HW, xs: [34.0, 39.0, 42.65], zs: [-8.4, -3.3, 3.3, 8.4], unit: 1.3, beamW: 0.28, beamD: 0.18,
    avoid: [{ x0: cas.x0 - 0.05, x1: cas.x1 + 0.05, z0: cas.z0 - 0.05, z1: cas.z1 + 0.05 }, { x0: stair.x0 - 0.1, x1: stair.x1, z0: -3.1, z1: 3.1 }, { x0: RECEPTION.liftX0 - 0.15, x1, z0: -2.6, z1: 2.6 }] });
  const fl = fineLv();
  if (fl >= 1) { // carved consoles under the beam ends at the end walls
    const yb = TOP - 0.004 - 0.18;
    for (const z of [-8.4, -3.3, 3.3, 8.4]) { if (Math.abs(z) > 3) corbel(b, M.paintWhite, x0 + 0.05, z, [1, 0], yb, 0.2, 0.24, 0.2); if (Math.abs(z) > 2.7) corbel(b, M.paintWhite, x1 - 0.05, z, [-1, 0], yb, 0.2, 0.24, 0.2); }
  }
  // bronze electroliers between the kit chandeliers
  for (const x of [36.2, 41.8]) for (const s of [-1, 1]) { const l = bronzeLight(); l.position.set(x, TOP, s * 8.4); plan.zone(x).add(l); world.addLamp({ x, y: TOP - 0.5, z: s * 8.4, color: 0xffd9a0, intensity: 0.6 }); }
  const archTris = b.tris - t0;

  // white columns round the stair well (colonnade beside the landing bay, framing the foot, beside the lifts)
  for (const x of [sp.x0 + 0.7, sp.xf + 0.45, stair.x1 - 1.55]) for (const s of [-1, 1]) w.put(column({ h, r: 0.14, mat: 'paintWhite', capital: 'gold' }), x, s * (sp.hw + 0.6), 'fwd', { collide: true });

  // Steinway grand piano at the port side, palms in jardinières
  w.put(piano({ grand: true, mat: 'woodDark' }), 33.6, -12.0, 'stbd');
  world.addUse('piano', 33.6, Y, -10.7);
  w.put(stool(), 33.6, -10.6, 'port', { collide: false });
  for (const [x, z] of [[31.1, -13.0], [31.1, 13.0], [46.8, -5.5], [46.8, 5.5], [37.95, -3.7], [37.95, 3.7]]) {
    if (w.put(jardiniere(), x, z, 'fwd', { collide: true })) { const pl = pottedPalm(); place(plan.zone(x), pl, x, Y + 0.2, z, D() * TAU); }
  }
  // Chesterfield settees against the casing, facing outboard
  for (const s of [-1, 1]) for (const x of [33.65, 35.95]) w.put(chesterfield({ w: 1.9 }), x, s * (cas.z1 + 0.5), s > 0 ? 'stbd' : 'port');

  // wicker chairs round wicker tables; chairs at seeded angles / distances, tea, papers, books on the tables
  let groups = 0;
  const covers = ['fabricGreen', 'fabricGold', 'fabricRed'];
  for (const x of [32.4, 35.0, 37.6, 40.2, 42.8, 45.3]) {
    for (const s of [-1, 1]) for (const z of [5.4, 8.0, 10.6, 12.8]) {
      const zz = s * z;
      if (!w.free(x, zz, 2.0, z > 12 ? 1.4 : 2.0)) continue;
      if (!w.put(wickerTable(), x, zz, 'fwd')) continue;
      groups++;
      const cover = covers[Math.floor(D() * 3)], sides = z > 12 ? [0, Math.PI, s > 0 ? Math.PI / 2 : -Math.PI / 2] : [0, Math.PI / 2, Math.PI, -Math.PI / 2];
      for (const a0 of sides) {
        const a = a0 + (D() - 0.5) * 0.5, r = 0.74 + D() * 0.14, cx = x + Math.cos(a) * r, cz = zz - Math.sin(a) * r;
        if (Math.abs(cz) > HW - 0.4) continue;
        place(plan.zone(cx), wickerChair({ mat: cover }), cx, Y, cz, a + Math.PI + (D() - 0.5) * 0.35);
      }
      const q = D();
      if (q < 0.45) place(plan.zone(x), teaSet({ v: q < 0.2 ? 1 : 0 }), x + 0.05, Y + 0.69, zz, D() * TAU);
      else if (q < 0.75) place(plan.zone(x), newspaper(), x, Y + 0.69, zz, D() * TAU);
      else if (q < 0.9) place(plan.zone(x), bookPile({ v: Math.floor(D() * 3) }), x, Y + 0.69, zz, D() * TAU);
      else if (fl >= 0) place(plan.zone(x), vase({ v: groups % 3 }), x, Y + 0.69, zz, groups * 1.7);
    }
  }
  f.flush();
  (world._dStats ??= {}).reception = { groups, archTris };
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

/** steel-topped kitchen work table with lower shelf, oak chopping board, cook's knives, a mixing bowl */
export const workTable = def('dWorkTable', (o) => [o.w ?? 1.8, 0.75, 0.95], (p, o) => {
  const w = o.w ?? 1.8, d = 0.75, r = rng(Math.round(w * 10) + (o.v ?? 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.add(G.lathe([[0.03, 0], [0.025, 0.03], [0.022, 0.86], [0, 0.86]], 6), M.iron, sx * (d / 2 - 0.06), 0, sz * (w / 2 - 0.06));
  p.add(boxG(d - 0.08, 0.025, w - 0.08, 0, 0.2, 0, ''), M.pine);
  p.bb(M.pine, d, 0.06, w, 0, 0.84, 0, 0.006);
  p.bb(M.steel, d + 0.02, 0.02, w + 0.02, 0, 0.9, 0, 0.005);
  p.bb(M.oak, 0.38, 0.03, 0.55, 0.05, 0.92, -w * 0.2 + r() * 0.1, 0.006);
  for (let i = 0; i < 2; i++) { const k = p.add(boxG(0.006, 0.004, 0.3, 0, 0.002, 0, 'y'), M.chrome, 0.12 + i * 0.07, 0.95, -w * 0.2 + 0.05); k.rotation.y = 0.2 + i * 0.3; const hd = p.add(boxG(0.022, 0.02, 0.11, 0, 0.01, 0, 'y'), M.woodDark, 0.12 + i * 0.07 + 0.03, 0.952, -w * 0.2 + 0.23); hd.rotation.y = 0.2 + i * 0.3; }
  p.add(G.lathe([[0, 0], [0.08, 0], [0.16, 0.1], [0.155, 0.105], [0.075, 0.008], [0, 0.008]], 14), M.porcelain, -0.1, 0.92, w * 0.22);
  for (let i = 0; i < 3; i++) p.add(G.lathe([[0, 0], [0.1, 0], [0.11, 0.08], [0.105, 0.08], [0, 0.005]], 10), M.copper, (i - 1) * 0.2, 0.225, w * (0.2 - i * 0.18));
});
/** bain-marie: steel water bath on legs with hot pots and lids, draw-off cock */
export const bainMarie = def('dBainMarie', (o) => [o.w ?? 1.6, 0.75, 1.15], (p, o) => {
  const w = o.w ?? 1.6, d = 0.72;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.add(G.lathe([[0.03, 0], [0.025, 0.04], [0.025, 0.5], [0, 0.5]], 6), M.iron, sx * (d / 2 - 0.05), 0, sz * (w / 2 - 0.05));
  p.bb(M.steel, d, 0.38, w, 0, 0.5, 0, 0.01);
  p.bb(M.steelDark, d + 0.03, 0.03, w + 0.03, 0, 0.88, 0, 0.006);
  p.cz(M.brass, 0.012, w - 0.1, d / 2 + 0.03, 0.78, 0, 6);
  for (const s of [-1, 1]) p.b(M.brass, 0.035, 0.02, 0.02, d / 2 + 0.015, 0.77, s * (w / 2 - 0.1)); // rail brackets
  p.add(G.lathe([[0.02, 0], [0.02, 0.06], [0, 0.07]], 6), M.brass, d / 2, 0.55, w * 0.35).rotation.z = -Math.PI / 2; // draw-off cock out of the bath
  const n = Math.max(2, Math.round(w / 0.4));
  for (let i = 0; i < n; i++) {
    const z = -w / 2 + (w * (i + 0.5)) / n, big = i % 2 === 0;
    p.add(G.lathe([[0.13, 0.86], [0.14, 0.86], [0.14, 1.06], [0.15, 1.07]], 12), i % 3 === 1 ? M.copper : M.steel, 0, 0, z);
    p.add(G.lathe([[0.15, 1.07], [0.1, 1.1], [0.02, 1.11], [0.025, 1.14], [0, 1.15]], 12), i % 3 === 1 ? M.copper : M.steel, 0, 0, z); void big; // lid on the rim
  }
});
/** steam-heated plate warmer: steel cupboard with two doors, hot-plate top, stacks of plates */
export const plateWarmer = def('dPlateWarmer', (o) => [o.w ?? 1.2, 0.7, 1.25], (p, o) => {
  const w = o.w ?? 1.2, d = 0.68;
  p.b(M.iron, d - 0.04, 0.08, w - 0.04, -0.01, 0, 0);
  p.bb(M.steel, d, 0.82, w, 0, 0.08, 0, 0.01);
  for (const s of [-1, 1]) { p.fp(M.steelDark, w / 2 - 0.08, 0.62, d / 2, 0.48, s * w / 4, 0.006, 0.03); p.cz(M.brass, 0.01, 0.12, d / 2 + 0.02, 0.62, s * 0.08, 6); }
  for (let i = 0; i < 3; i++) p.c(M.iron, 0.015, 0.012, d / 2 + 0.01, 0.12 + i * 0.012, (i - 1) * 0.2, 6);
  p.bb(M.steelDark, d + 0.03, 0.03, w + 0.03, 0, 0.9, 0, 0.006);
  for (const z of [-w * 0.25, w * 0.22]) { p.lathe(M.porcelain, [[0, 0], [0.11, 0], [0.122, 0.22], [0, 0.22]], 0, 0.93, z, 12); }
});
/** utensil rail with hanging ladles, skimmers, sieves and copper saucepans (along z) */
export const utensilRail = def('dUtensilRail', (o) => [o.w ?? 1.6, 0.2, 0.7], (p, o) => {
  const w = o.w ?? 1.6, r = rng(Math.round(w * 37));
  p.cz(M.iron, 0.012, w, 0, 0.68, 0, 6);
  for (const s of [-1, 1]) p.b(M.iron, 0.04, 0.03, 0.015, -0.015, 0.665, s * (w / 2 - 0.05)); // wall brackets (the rail stands 2 cm off the wall)
  for (let z = -w / 2 + 0.12; z < w / 2 - 0.08; z += 0.15) {
    const k = Math.floor(r() * 4), L = 0.3 + r() * 0.12;
    p.cz(M.iron, 0.004, 0.04, 0, 0.665, z, 4);
    p.c(k === 3 ? M.copper : M.chrome, 0.006, L + 0.025, 0, 0.64 - L, z, 4); // handle up to the S-hook
    if (k === 0) p.add(G.lathe([[0, 0], [0.04, 0.005], [0.045, 0.04], [0.04, 0.04], [0, 0.01]], 8), M.chrome, 0, 0.6 - L, z);
    else if (k === 1) p.add(G.lathe([[0.05, 0.005], [0.055, 0.01], [0, 0.0]], 8), M.chrome, 0, 0.62 - L, z);
    else if (k === 2) p.add(G.lathe([[0, 0], [0.06, 0.03], [0.065, 0.035], [0, 0.035]], 8), K.ironwork, 0, 0.6 - L, z);
    else p.add(G.lathe([[0, 0], [0.09, 0], [0.095, 0.08], [0.09, 0.08], [0, 0.006]], 10), M.copper, 0.0, 0.5 - L, z + 0.0);
  }
});
/** bread rack: tiers of slatted shelves with loaves and rolls */
export const breadRack = def('dBreadRack', [1.4, 0.55, 1.85], (p) => {
  const w = 1.4, d = 0.5, r = rng(51);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.bb(M.pine, 0.04, 1.85, 0.04, sx * (d / 2 - 0.02), 0, sz * (w / 2 - 0.02), 0.004);
  for (let k = 0; k < 5; k++) {
    const y = 0.15 + k * 0.38;
    for (let i = 0; i < 4; i++) p.add(boxG(0.08, 0.015, w - 0.06, -d / 2 + 0.07 + i * 0.12, y, 0, ''), M.pine);
    for (let z = -w / 2 + 0.14; z < w / 2 - 0.1; z += 0.2 + r() * 0.05) {
      if (k === 4 && r() < 0.5) continue;
      p.add(atl(G.pillow(0.22, 0.1, 0.16, 0.5, 0.7, 3, 8), r() < 0.5 ? AT.ochre : AT.straw), K.atlas, (r() - 0.5) * 0.15, y + 0.015, z);
    }
  }
});
/** dough trough: oak tub on splayed legs with a sloping lid propped open */
export const doughTrough = def('dDoughTrough', [1.8, 0.7, 0.95], (p) => {
  const w = 1.8;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.add(G.frustum(0.06, 0.06, 0.07, 0.07, 0.55), M.oak, sx * 0.22, 0, sz * (w / 2 - 0.12));
  // tub filled with dough to just under the rim (an open frustum would show its inside-out walls), raised rim boards
  p.add(G.frustum(0.5, w - 0.1, 0.66, w - 0.02, 0.33, { bottom: true, top: true }), M.oak, 0, 0.55, 0);
  for (const s of [-1, 1]) { p.add(boxG(0.68, 0.04, 0.025, 0, 0.9, s * (w / 2 - 0.0125), ''), M.oak); p.add(boxG(0.025, 0.04, w, s * 0.3275, 0.9, 0, ''), M.oak); }
  p.add(atl(G.pillow(0.6, 0.07, w - 0.08, 0.5, 0.5, 3, 10), AT.ivory), K.atlas, 0, 0.86, 0);
  // half lid propped open, hinged on the back rim board, leaning slightly back
  const lid = p.add(boxG(0.66, 0.03, w * 0.48, 0.33, 0.015, 0, ''), M.oak, -0.315, 0.92, w * 0.24); lid.rotation.z = Math.PI / 2 + 0.05;
});

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
    for (let z = 1.6; z < 10.6; z += 1.2) b.box(iron, XC - 1.27, Y + 2.04, s * z - 0.02, XC + 1.27, Y + 2.31, s * z + 0.02, 'xXyzZ'); // hood stiffeners
    // coal bunker boxes at the ends of the ranges
    for (const dx of [-0.5, 0.5]) { b.box(iron, XC + dx - 0.3, Y, s * 11.0, XC + dx + 0.3, Y + 0.42, s * 11.6); b.box(mats.coal, XC + dx - 0.27, Y + 0.42, s * 11.03, XC + dx + 0.27, Y + 0.44, s * 11.57, 'xXzZY'); }
  }
  // forward (pantry) side: hot presses, bains-marie and plate warmers; aft: ovens, stock kettles, work tables, blocks
  for (const s of [-1, 1]) {
    w.put(servingCounter({ w: 2.0, d: 0.7, mat: 'steel', top: 'steel', items: true }), -16.42, s * 3.7, 'aft');
    w.put(servingCounter({ w: 2.0, d: 0.7, mat: 'steel', top: 'steel', items: true }), -16.42, s * 10.4, 'aft');
    w.put(bainMarie({ w: 1.5 }), -16.43, s * 7.05, 'aft');
    w.put(plateWarmer({ w: 1.1 }), -16.4, s * 5.47, 'aft');
    w.put(oven({ w: 1.4 }), -23.48, s * 0.75, 'fwd');
    w.put(kettle(), -23.5, s * 2.05, 'fwd');
    w.put(workTable({ w: 1.8, v: s }), -23.6, s * 7.6, 'fwd');
    w.put(workTable({ w: 1.6, v: 2 + s }), -23.6, s * 4.4, 'fwd');
    w.put(butcherBlock(), -22.2, s * 7.6, 'fwd');
    for (const x of [-17.4, -22.8]) if (w.put(sink({ w: 1.2 }), x, s * 12.05, s > 0 ? 'port' : 'stbd') && fineLv() >= 1) ctx.attach(cgPlateRack({ w: 1.2 }), -0.295, 0, { y: 1.85 });
    w.put(kettle(), -18.3, s * 11.8, 'fwd');
    // utensil rails on the bulkheads above the work tables
    for (const z of [4.4, 7.6]) w.mount(utensilRail({ w: 1.6 }), -23.93, s * z, 'fwd', 1.3);
  }
  // pot racks over both aisles with hanging copper pans (instanced)
  potGeo ??= (() => { const g = new THREE.CylinderGeometry(0.13, 0.11, 0.17, 8, 1, false); g.translate(0, -0.085, 0); return g; })();
  const f = new InstField(ctx.world, plan.deck).define('pot', potGeo, mats.copper);
  for (const xr of [-17.75, -22.25]) {
    for (const s of [-1, 1]) {
      const za = s * 1.3, zb = s * 10.6;
      b.bar(iron, [xr, Y + 2.3, za], [xr, Y + 2.3, zb], 0.04, 0.04);
      for (const z of [za, (za + zb) / 2, zb]) b.box(iron, xr - 0.015, Y + 2.3, z - 0.015, xr + 0.015, Y + h, z + 0.015, 'xXzZ');
      for (let z = Math.min(za, zb) + 0.3; z < Math.max(za, zb) - 0.2; z += 0.42) f.add('pot', xr, Y + 2.3, z, 0, 1 + (Math.round(z * 7) % 3) * 0.15, 1, 1 + (Math.round(z * 7) % 3) * 0.15);
    }
  }
  f.flush();
  // floor drains (cast-iron gratings) along both aisles, steam pipe to the bains-marie
  for (const x of [-17.1, -22.9]) for (let z = -10.8; z <= 10.8; z += 2.4) {
    b.box(mats.iron, x - 0.18, Y + 0.004, z - 0.18, x + 0.18, Y + 0.012, z + 0.18, 'Y');
    for (let k = -2; k <= 2; k++) b.box(mats.coal, x - 0.14, Y + 0.0125, z + k * 0.06 - 0.012, x + 0.14, Y + 0.013, z + k * 0.06 + 0.012, 'Y');
  }
  pipe(plan.zone(-16.3), 'copper', [[-16.15, Y + 2.35, -12.3], [-16.15, Y + 2.35, 12.3]], 0.035);
  for (let z = -10.8; z <= 10.8; z += 2.4) b.box(iron, -16.17, Y + 2.35, z - 0.015, -16.13, Y + h, z + 0.015, 'xXzZ'); // pipe hangers
}

/** Pantry of the dining saloons: the kit's pantry with plate racks over the counter and the sink, copper pans, notices. */
export function furnishPantry(ctx) {
  const fl = fineLv();
  for (let k = 0; k < 4; k++) if (!ctx.fit(shelves({ kind: 'crockery', w: 1.5 }), ['far:lo'])) break;
  const cw = Math.min(2.4, Math.max(1.2, ctx.D - 1.4));
  if (ctx.fit(servingCounter({ w: cw, items: true }), ['right:hi', 'left:hi']) && fl >= 1) {
    ctx.attach(cgPlateRack({ w: Math.min(1.6, cw) }), -0.365, 0, { y: 1.8 });
  }
  if (ctx.fit(sink({ w: 1.0 }), ['left:hi', 'right:lo', 'near:hi']) && fl >= 1) ctx.attach(cgPlateRack({ w: 1.0 }), -0.295, 0, { y: 1.85 });
  if (fl >= 0) { hangFreeD(ctx, cgMenuBoard(), ['near', 'left', 'right'], 1.55); if (fl >= 1) ctx.fit(cgMopBucket(), ['near:lo', 'left:lo', 'right:lo'], { collide: false }); }
}
/** Bakery: bread ovens along the far wall, dough troughs, bread racks, flour sacks. */
export function furnishBakery(ctx) {
  ctx.fit(oven({ w: 1.4 }), ['far:lo', 'far:hi']); ctx.fit(oven({ w: 1.4 }), ['far:hi', 'far:mid']);
  ctx.fit(doughTrough(), ['left:hi', 'right:hi']);
  ctx.fit(breadRack(), ['right:hi', 'left:mid', 'right:mid']);
  ctx.fit(workTable({ w: 1.8, v: 7 }), ['right:mid', 'left:mid', 'near:hi']);
  ctx.fit(sackPile({ mat: 'canvas' }), ['right:lo', 'left:lo'], { collide: false });
  ctx.fit(barrel(), ['left:lo', 'right:mid'], { collide: false });
}
/** Pastry kitchen: marble-topped tables, shelves, small oven. */
export function furnishPastry(ctx) {
  ctx.fit(oven({ w: 1.4 }), ['far:mid', 'far:lo']);
  ctx.put(tableRect({ w: 2.0, d: 0.9, mat: 'marble' }), ctx.W / 2, ctx.D / 2, 'in');
  ctx.fit(shelves({ kind: 'crockery', w: 1.5 }), ['left:hi', 'right:hi']); ctx.fit(breadRack(), ['right:mid', 'left:mid']);
  ctx.fit(workTable({ w: 1.6, v: 9 }), ['near:hi', 'right:lo']);
}
/** Butcher's shop: chopping blocks, meat rail with hooks and joints, ice chest. */
export function furnishButcher(ctx) {
  ctx.put(butcherBlock(), ctx.W / 2 - 0.6, ctx.D / 2, 'in'); ctx.put(butcherBlock(), ctx.W / 2 + 0.6, ctx.D / 2 + 0.2, 'in');
  ctx.fit(workTable({ w: 1.8, v: 11 }), ['far:lo', 'far:hi']); ctx.fit(locker({ n: 3, mat: 'steel' }), ['far:hi', 'right:hi']);
  ctx.fit(shelves({ kind: 'stores', w: 1.2 }), ['left:hi', 'right:mid']);
  // meat rail with hooks along the far wall, some joints hanging on them
  const a = ctx.at(0.3, ctx.D - 0.35), c = ctx.at(ctx.W - 0.3, ctx.D - 0.35), Y = ctx.y, b = ctx.plan.batch, r = rng(77);
  b.bar(mats.chrome, [a.x, Y + 2.2, a.z], [c.x, Y + 2.2, c.z], 0.03, 0.03);
  for (let t = 0.1; t < 0.95; t += 0.12) {
    const x = a.x + (c.x - a.x) * t, z = a.z + (c.z - a.z) * t;
    b.box(mats.chrome, x - 0.01, Y + 2.0, z - 0.01, x + 0.01, Y + 2.2, z + 0.01, 'xXzZ');
    if (r() < 0.55) addMesh(ctx.plan, JOINT(), K.atlas, x, Y + 2.0, z, r() * TAU);
  }
}
let jointGeo = null;
const JOINT = () => (jointGeo ??= atl(G.lathe([[0, 0], [0.05, -0.04], [0.11, -0.2], [0.12, -0.38], [0.08, -0.52], [0, -0.56]].reverse(), 8), AT.rose));
/** Vegetable kitchen: sinks, tables, sacks and barrels. */
export function furnishVeg(ctx) {
  ctx.fit(sink({ w: 1.2 }), ['far:lo', 'far:hi']); ctx.fit(sink({ w: 1.2 }), ['far:hi', 'far:mid']);
  ctx.fit(workTable({ w: 1.8, v: 13 }), ['left:hi', 'right:hi']);
  ctx.fit(sackPile(), ['right:lo', 'left:lo'], { collide: false });
  ctx.fit(barrel(), ['left:lo', 'right:mid'], { collide: false }); ctx.fit(crate(), ['right:mid', 'near:hi'], { collide: false });
}
/** Scullery: rows of sinks, plate racks. */
export function furnishScullery(ctx) {
  for (let i = 0; i < 4; i++) ctx.fit(sink({ w: 1.2 }), ['far:lo', 'far:hi', 'left:hi', 'right:hi']);
  ctx.fit(shelves({ kind: 'crockery', w: 1.5 }), ['left:hi', 'right:hi', 'left:lo']); ctx.fit(shelves({ kind: 'crockery', w: 1.5 }), ['right:hi', 'right:lo']);
  ctx.fit(workTable({ w: 1.6, v: 15 }), ['near:hi', 'right:mid']);
}

// ================================================================= hospital

/** iron hospital bed: tubular head and foot ends with vertical rails and brass knobs, castors, mattress, pillow, sheet
 *  and grey blanket turned down, a temperature chart on the foot rail. length along x, head at −x. */
export const hospBed = def('dHospBed', [0.95, 2.05, 1.15], (p, o) => {
  const L = 2.0, W = 0.92, wh = M.paintWhite;
  for (const [x, hgt] of [[-L / 2, 1.12], [L / 2, 0.88]]) {
    for (const s of [-1, 1]) {
      p.add(G.lathe([[0.02, 0], [0.02, hgt], [0, hgt + 0.005]], 6), wh, x, 0.04, s * W / 2);
      p.add(G.lathe([[0, 0], [0.028, 0.01], [0.022, 0.04], [0, 0.05]], 6), M.brass, x, hgt + 0.04, s * W / 2);
      p.add(G.lathe([[0.03, 0], [0.03, 0.04], [0, 0.04]], 6), M.rubber, x, 0, s * W / 2);
    }
    p.cz(wh, 0.014, W, x, hgt - 0.02, 0, 6); p.cz(wh, 0.012, W, x, 0.38, 0, 6);
    for (let i = 1; i < 6; i++) p.c(wh, 0.007, hgt - 0.42, x, 0.4, -W / 2 + (W * i) / 6, 4);
  }
  for (const s of [-1, 1]) p.cx(wh, 0.014, L, 0, 0.42, s * W / 2, 6);
  p.add(boxG(L - 0.04, 0.02, W - 0.04, 0, 0.43, 0, 'y'), M.iron);
  p.add(G.pillow(L - 0.06, 0.13, W - 0.06, 0.22, 0.12, 3, 12, 0.006), M.linen, 0, 0.44, 0);
  p.add(G.pillow(0.36, 0.12, W - 0.2, 0.6, 0.45, 3, 10), M.linen, -L / 2 + 0.25, 0.56, 0);
  p.add(G.revolve([{ o: 0.03, y: 0.42, m: 0.008 }, { o: 0.02, y: 0.56, m: 0.003 }, { o: -0.01, y: 0.585 }, { o: -0.04, y: 0.59 }], { perim: G.rectLoop(L * 0.62, W, 0.04, 1, 0.25), k: 10, capTop: true }), M.canvas, L * 0.19, 0, 0);
  p.cz(M.linen, 0.02, W + 0.04, -L * 0.12, 0.59, 0, 6);
  p.ab(AT.paper, 0.004, 0.28, 0.2, L / 2 + 0.03, 0.55, 0);
});
/** white medicine cabinet: glazed upper doors with bottles behind, drawers and cupboard below */
export const medCabinet = def('dMedCabinet', (o) => [o.w ?? 1.2, 0.45, 2.0], (p, o) => {
  const w = o.w ?? 1.2, d = 0.43, wh = M.paintWhite, r = rng(Math.round(w * 13));
  p.bb(wh, d, 0.9, w, 0, 0, 0, 0.008);
  for (let i = 0; i < 2; i++) { const z = (i - 0.5) * (w / 2); p.fp(wh, w / 2 - 0.06, 0.16, d / 2, 0.78, z, 0.006, 0.025); p.fp(wh, w / 2 - 0.06, 0.5, d / 2, 0.38, z, 0.008, 0.04); p.c(M.brass, 0.01, 0.02, d / 2 + 0.01, 0.78, z, 6).rotation.z = Math.PI / 2; }
  p.bb(M.marble, d + 0.02, 0.03, w + 0.02, 0, 0.9, 0, 0.006);
  p.b(wh, d - 0.1, 1.05, w, -0.05, 0.93, 0);
  for (const s of [-1, 1]) p.b(wh, 0.03, 1.05, 0.04, d / 2 - 0.1, 0.93, s * (w / 2 - 0.02));
  p.b(wh, 0.03, 0.04, w, d / 2 - 0.1, 1.94, 0); p.b(wh, 0.03, 0.03, 0.03, d / 2 - 0.1, 0.93, 0);
  for (const y of [1.25, 1.6]) p.b(M.glass, d - 0.14, 0.008, w - 0.06, -0.06, y, 0);
  for (const y of [0.93, 1.258, 1.608]) for (let z = -w / 2 + 0.08; z < w / 2 - 0.06; z += 0.075 + r() * 0.03) {
    const hb = 0.12 + r() * 0.1, cell = [AT.amber, AT.blueGlass, AT.clearGlass, AT.bottleGreen, AT.amber][Math.floor(r() * 5)];
    p.add(atl(G.lathe([[0.028, 0], [0.03, hb * 0.7], [0.012, hb * 0.85], [0.012, hb], [0, hb]], 6), cell), K.atlas, -0.05 + (r() - 0.5) * 0.08, y, z);
  }
  p.b(M.glass, 0.004, 0.98, w - 0.06, d / 2 - 0.1, 0.96, 0);
  p.bb(wh, d - 0.06, 0.05, w + 0.04, -0.03, 1.98, 0, 0.008);
});
/** operating table: cast-iron pedestal, hydraulic column, padded top with head rest, chrome side rails */
export const opTable = def('dOpTable', [0.62, 1.95, 0.95], (p) => {
  p.add(G.lathe([[0.32, 0], [0.32, 0.03], [0.2, 0.06], [0.1, 0.12], [0.08, 0.2], [0, 0.2]], 14), M.iron);
  p.add(G.lathe([[0.07, 0.2], [0.07, 0.6], [0.11, 0.65], [0, 0.66]], 12), M.chrome);
  p.bb(M.iron, 1.5, 0.08, 0.5, 0.1, 0.66, 0, 0.01);
  p.add(G.pillow(1.48, 0.07, 0.5, 0.2, 0.15, 3, 10), M.rubber, 0.1, 0.73, 0);
  p.bb(M.iron, 0.24, 0.05, 0.34, -0.76, 0.68, 0, 0.008); // head-rest plate hinged to the end of the top
  const hr = p.add(G.pillow(0.3, 0.06, 0.32, 0.4, 0.3, 3, 8), M.rubber, -0.78, 0.72, 0); hr.rotation.z = -0.1;
  for (const s of [-1, 1]) { p.cx(M.chrome, 0.01, 1.4, 0.1, 0.72, s * 0.27, 6); for (const x of [-0.5, 0.7]) p.b(M.chrome, 0.02, 0.03, 0.03, x, 0.7, s * 0.255); }
  // hydraulic foot pump: lever out of the column, pedal
  p.cx(M.chrome, 0.012, 0.36, 0.25, 0.24, 0, 6); p.add(G.lathe([[0.03, 0], [0.03, 0.02], [0, 0.03]], 8), M.chrome, 0.44, 0.23, 0);
  p.add(G.lathe([[0.06, 0], [0.06, 0.04], [0, 0.04]], 10), M.chrome, 0.3, 0.06, 0.22).rotation.x = Math.PI / 2;
});
/** instrument stand: chrome tripod, tray with instruments, bowl, gauze */
export const instrumentStand = def('dInstrStand', [0.6, 0.45, 0.95], (p) => {
  for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU; p.add(G.loft([[0, 0.3, 0], [Math.cos(a) * 0.22, 0, Math.sin(a) * 0.22]], 0.01, 4, false), M.chrome); }
  p.add(G.lathe([[0.012, 0.3], [0.012, 0.86], [0, 0.87]], 6), M.chrome);
  p.bb(M.chrome, 0.38, 0.03, 0.55, 0, 0.86, 0, 0.004);
  for (let i = 0; i < 6; i++) { const m = p.add(boxG(0.16, 0.006, 0.012, 0, 0.003, 0, 'y'), M.chrome, -0.05 + (i % 2) * 0.1, 0.89, -0.2 + i * 0.07); m.rotation.y = (i - 2.5) * 0.08; }
  p.add(G.lathe([[0, 0], [0.05, 0], [0.09, 0.05], [0.085, 0.05], [0, 0.006]], 10), M.porcelain, 0.08, 0.89, 0.18);
  p.bb(M.linen, 0.1, 0.03, 0.14, -0.1, 0.89, 0.18, 0.006);
});
/** bedside cupboard: white enamelled, door and drawer, glass and carafe on the top */
export const bedside = def('dBedside', [0.42, 0.4, 0.8], (p) => {
  p.b(M.paintWhite, 0.36, 0.04, 0.38, -0.01, 0, 0); // recessed plinth
  p.bb(M.paintWhite, 0.4, 0.72, 0.42, 0, 0.04, 0, 0.008);
  p.fp(M.paintWhite, 0.34, 0.12, 0.2, 0.66, 0, 0.006, 0.02); p.fp(M.paintWhite, 0.34, 0.42, 0.2, 0.32, 0, 0.008, 0.03);
  p.c(M.brass, 0.01, 0.02, 0.21, 0.66, 0, 6).rotation.z = Math.PI / 2;
  p.bb(M.marble, 0.42, 0.025, 0.44, 0, 0.76, 0, 0.005);
  p.add(G.lathe([[0.05, 0], [0.06, 0.05], [0.058, 0.1], [0.026, 0.16], [0.02, 0.21], [0.025, 0.22]], 8), M.glass, -0.05, 0.785, -0.08);
  p.add(G.lathe([[0.03, 0], [0.034, 0.1]], 6), M.glass, 0.06, 0.785, 0.1);
});
/** folding three-leaf ward screen with linen panels */
export const wardScreen = def('dWardScreen', [1.6, 0.4, 1.7], (p) => {
  // centre leaf flat, the side leaves hinged at its edges and folded forward by 0.5 rad (frames meet at the hinge posts)
  for (let i = 0; i < 3; i++) {
    const a = (i - 1) * 0.5, side = i - 1, cx = -0.1 + Math.abs(side) * 0.24 * Math.sin(0.5), cz = side * (0.24 + 0.24 * Math.cos(0.5));
    const g = p.add(boxG(0.012, 1.4, 0.48, 0, 0.9, 0, ''), M.linen, cx, 0, cz); g.rotation.y = a;
    for (const s of [-1, 1]) p.add(G.lathe([[0.012, 0], [0.012, 1.7], [0, 1.71]], 5), M.paintWhite, cx + Math.sin(a) * s * 0.24, 0, cz + Math.cos(a) * s * 0.24);
  }
});

/** Ward of the hospital: iron beds with lockers along the hull side, cabinet, table and chair, screen. */
export function furnishWard(ctx, nBeds = 4) {
  const plan = ctx.plan, w = wctx(ctx), s = ctx.room.safe, Y = ctx.y, r = rng(ctx.room.id.length * 31);
  const n = nBeds, zb = s.z1 - 1.06, xs = [];
  const pitch = Math.min(1.55, (s.x1 - s.x0 - 0.4) / n);
  for (let i = 0; i < n; i++) xs.push(s.x0 + 0.2 + pitch * (i + 0.5));
  let beds = 0;
  for (const x of xs) {
    if (!w.put(hospBed(), x, zb, 'port')) continue; beds++;
    const lx = x + pitch / 2;
    if (lx < s.x1 - 0.3 && w.free(lx, s.z1 - 0.25, 0.4, 0.42)) { w.put(bedside(), lx, s.z1 - 0.24, 'port', { collide: false }); }
    if (r() < 0.6) place(plan.zone(x), bookPile({ v: Math.floor(r() * 3) }), x + 0.25, Y + 0.6, zb + 0.3, r() * TAU);
  }
  ctx.fit(medCabinet({ w: 1.2 }), ['left:mid', 'right:mid', 'far:lo']);
  if (ctx.put(tableRect({ w: 1.0, d: 0.6, mat: 'paintWhite', cloth: true }), ctx.W / 2 + 0.6, 1.4, 'in')) {
    if (fineLv() >= 0) { ctx.attach(cgJugBasin(), 0.02, -0.25, { y: 0.755 }); ctx.attach(cgBottles({ v: 1, n: 3 }), -0.12, 0.25, { y: 0.755 }); }
    ctx.put(chairDining({ cls: 'plain', mat: 'paintWhite' }), ctx.W / 2 + 0.6, 0.85, 'in', { collide: false });
  }
  ctx.fit(wardScreen(), ['right:lo', 'left:lo'], { collide: false });
  return { beds };
}
/** Operating room of the hospital. */
export function furnishSurgery(ctx) {
  ctx.put(opTable(), ctx.W / 2, ctx.D / 2 + 0.1, 'right');
  ctx.put(instrumentStand(), ctx.W / 2 + 1.25, ctx.D / 2 + 0.1, 'left', { collide: false });
  ctx.fit(medCabinet({ w: 1.2 }), ['far:lo', 'far:hi']); ctx.fit(shelves({ kind: 'linen', w: 1.2, mat: 'paintWhite' }), ['far:hi', 'right:hi']);
  ctx.fit(basinSmall(), ['left:hi', 'right:mid'], { collide: false }); ctx.fit(basinSmall(), ['left:mid', 'right:lo'], { collide: false });
  ctx.put(stool({ mat: 'paintWhite', seat: 'rubber' }), ctx.W / 2 - 0.4, ctx.D / 2 - 0.55, 'in', { collide: false });
  // operating lamp: big enamelled reflector over the table
  const p = ctx.at(ctx.W / 2, ctx.D / 2 + 0.1), l = new THREE.Group();
  l.add(new THREE.Mesh(G.lathe([[0, 0], [0.012, 0], [0.012, -0.55], [0, -0.56]], 6), M.chrome));
  l.add(new THREE.Mesh(G.lathe([[0.05, -0.55], [0.2, -0.62], [0.34, -0.74]], 16), M.paintWhite)); l.add(new THREE.Mesh(G.lathe([[0.34, -0.745], [0.2, -0.625], [0.05, -0.555]], 16), M.paintWhite));
  l.add(new THREE.Mesh(G.lathe([[0, -0.6], [0.09, -0.62], [0.06, -0.69], [0, -0.7]].reverse(), 10), M.lampGlow));
  l.position.set(p.x, ctx.y + ctx.h, p.z); ctx.plan.zone(p.x).add(l);
  ctx.world.addLamp({ x: p.x, y: ctx.y + 1.85, z: p.z, color: 0xffffff, intensity: 1.1 });
}
/** Doctor's consulting room / dispensary. */
export function furnishDispensary(ctx) {
  ctx.fit(medCabinet({ w: 1.5 }), ['far:lo', 'far:hi']); ctx.fit(medCabinet({ w: 1.2 }), ['far:hi', 'left:hi']);
  ctx.fit(workTable({ w: 1.6, v: 21 }), ['left:hi', 'right:hi']);
  ctx.fit(basinSmall(), ['right:mid', 'left:mid'], { collide: false });
  if (ctx.put(tableRect({ w: 1.1, d: 0.7, mat: 'oak', items: true }), ctx.W / 2, ctx.D / 2, 'in')) ctx.put(chairDining({ cls: 'plain' }), ctx.W / 2, ctx.D / 2 - 0.65, 'in', { collide: false });
  ctx.mount(mirrorWall({ w: 0.6, h: 0.8 }), 'right', ctx.D / 2, 1.5);
}
/** Simple wash room: basins along the far wall, a shower, a bench. */
export function washroom(ctx) {
  const n = Math.max(1, Math.floor((ctx.W - 0.3) / 0.75));
  for (let i = 0; i < n; i++) ctx.put(basinSmall(), ((i + 0.5) * ctx.W) / n, ctx.D - 0.22, 'out', { collide: false });
  ctx.fit(bench({ w: Math.min(1.6, Math.max(0.8, ctx.D - 1.4)), back: false }), ['right:hi', 'left:hi'], { collide: false });
}
export { matOf };
