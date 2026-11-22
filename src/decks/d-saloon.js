// D deck – the two dining saloons (hero rooms). Chairs, table cloths, plates and table lamps are InstancedMeshes.
import { mats } from '../core/materials.js';
import { piano, servingCounter, column, pottedPalm, sconce, mirrorWall, pilaster } from '../interior/kit.js';
import {
  InstField, chairGeos, swivelGeos, unitCloth, unitLeg, plateGeo, lampGeos, leadedWindow, coffers, hullWainscot, wctx,
} from './d-util.js';

const DIRV = { fwd: [1, 0], aft: [-1, 0], port: [0, -1], stbd: [0, 1] };
const rotOf = (dx, dz) => Math.atan2(-dz, dx);

/** One cloth-covered table with legs, chairs, plates (and a lamp) – everything instanced. seats: [[dx, dz], ...] */
function table(f, Y, x, z, lx, lz, seats, { chair = 'chair', lamp = true, off = 0.3 } = {}) {
  f.add('cloth', x, Y + 0.635, z, 0, lx + 0.06, 0.27, lz + 0.06);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) f.add('leg', x + sx * (lx / 2 - 0.1), Y, z + sz * (lz / 2 - 0.1), 0, 0.06, 0.5, 0.06);
  for (const [dx, dz] of seats) {
    // chair sits outside the table edge and faces the table
    const ax = Math.abs(dx) > lx / 2 - 1e-6, cx = x + dx + (ax ? Math.sign(dx) * off : 0), cz = z + dz + (ax ? 0 : Math.sign(dz) * off);
    const fx = ax ? -Math.sign(dx) : 0, fz = ax ? 0 : -Math.sign(dz);
    f.add(chair + 'F', cx, Y, cz, rotOf(fx, fz)); f.add(chair + 'P', cx, Y, cz, rotOf(fx, fz));
    f.add('plate', x + dx - (ax ? Math.sign(dx) * 0.2 : 0), Y + 0.774, z + dz - (ax ? 0 : Math.sign(dz) * 0.2));
  }
  if (lamp) { f.add('lampS', x, Y + 0.77, z); f.add('lampB', x, Y + 0.77, z); }
}

// ================================================================= 1st class dining saloon

export const DINING1 = { x0: -6.5, x1: 30.5, bay: 10.9 };
const BAY_X = [0, 5.4, 10.8, 16.2, 21.6, 27];

/** Bay partitions (kit walls) – call before plan.finish(). */
export function dining1Walls(plan) {
  for (const x of BAY_X) for (const s of [-1, 1]) plan.wall(x, s * DINING1.bay, x, s * 99, { wall: 'whitePanel' });
}

/** furnish function of the 1st class dining saloon (room x −6..30, full width, contains the funnel-3 casing). */
export function furnishDining1(ctx) {
  const plan = ctx.plan, world = ctx.world, Y = ctx.y, w = wctx(ctx), { x0, x1 } = DINING1;
  const f = new InstField(world, plan.deck);
  const cg = chairGeos(), lg = lampGeos();
  f.define('chairF', cg.frame, mats.oak).define('chairP', cg.pad, mats.leatherGreen)
    .define('cloth', unitCloth(), mats.linen).define('leg', unitLeg(), mats.oak).define('plate', plateGeo(), mats.porcelain)
    .define('lampS', lg.shade, mats.lampGlow).define('lampB', lg.stem, mats.brass);

  // --- architecture: leaded windows over every porthole, pillars, pilasters at the bay partitions, moulded ceiling
  for (let x = -4.05; x < x1 - 1; x += 2.7) for (const s of [-1, 1]) leadedWindow(plan, x, s);
  const casing = plan.casings.filter((c) => c.x1 > x0 && c.x0 < x1);
  coffers(plan, x0 + 0.05, x1 - 0.05, -13.85, 13.85, { px: 2.7, pz: 2.77, avoid: casing });
  const col = () => column({ h: ctx.h, r: 0.13, mat: 'paintWhite', capital: 'paintWhite' });
  for (const x of BAY_X) for (const z of [-5.35, 5.35]) w.put(col(), x, z, 'fwd', { collide: true });
  for (const x of BAY_X) for (const s of [-1, 1]) w.mount(pilaster({ h: ctx.h, w: 0.3, mat: 'paintWhite' }), x, s * (DINING1.bay - 0.06), s > 0 ? 'port' : 'stbd', 0);

  // --- sideboards, piano, palms
  const side = () => servingCounter({ w: 2.4, d: 0.6, mat: 'oak', top: 'oak', items: true });
  w.put(side(), x1 - 0.4, 0, 'aft'); w.put(side(), x1 - 0.4, -11.9, 'aft'); w.put(side(), x1 - 0.4, 11.9, 'aft');
  w.put(piano({ mat: 'oak' }), x0 + 0.42, 0, 'fwd');
  w.put(side(), x0 + 0.4, -8.2, 'fwd'); w.put(side(), x0 + 0.4, 8.2, 'fwd');
  for (const c of casing) {
    w.put(side(), c.x0 - 0.38, 0, 'aft'); w.put(side(), c.x1 + 0.38, 0, 'fwd');
    for (const s of [-1, 1]) {
      w.mount(mirrorWall({ w: 1.6, h: 1.2, frame: 'gold' }), (c.x0 + c.x1) / 2, s * (c.z1 + 0.012), s > 0 ? 'stbd' : 'port', 2.15);
      for (const dx of [-2.2, 2.2]) w.mount(sconce(), (c.x0 + c.x1) / 2 + dx, s * (c.z1 + 0.012), s > 0 ? 'stbd' : 'port', 1.9);
    }
  }
  for (const [x, z] of [[x0 + 0.6, -3.2], [x0 + 0.6, 3.2], [x1 - 0.6, -3.4], [x1 - 0.6, 3.4]]) w.put(pottedPalm(), x, z, 'fwd', { collide: false });

  // --- tables: 13 × 8 grid in the nave + one large table in every window bay
  let tables = 0, seats = 0;
  const kinds = {
    long: { lx: 2.0, lz: 0.95, ex: 2.1, ez: 2.02, seats: [[-0.65, -0.475], [0, -0.475], [0.65, -0.475], [-0.65, 0.475], [0, 0.475], [0.65, 0.475]] },
    square: { lx: 1.0, lz: 1.0, ex: 2.06, ez: 2.06, seats: [[-0.5, 0], [0.5, 0], [0, -0.5], [0, 0.5]] },
    two: { lx: 0.75, lz: 0.75, ex: 0.85, ez: 1.82, seats: [[0, -0.375], [0, 0.375]] },
    bay: { lx: 2.2, lz: 1.0, ex: 3.3, ez: 2.06, seats: [[-0.7, -0.5], [0, -0.5], [0.7, -0.5], [-0.7, 0.5], [0, 0.5], [0.7, 0.5], [-1.1, 0], [1.1, 0]] },
  };
  const tryTable = (x, z, order) => {
    for (const k of order) {
      const t = kinds[k];
      if (!w.free(x, z, t.ex, t.ez)) continue;
      table(f, Y, x, z, t.lx, t.lz, t.seats);
      w.reserve(x, z, t.ex, t.ez); world.addCollider(x - t.lx / 2, Y, z - t.lz / 2, x + t.lx / 2, Y + 0.8, z + t.lz / 2);
      tables++; seats += t.seats.length;
      return true;
    }
    return false;
  };
  const rows = [-9.3, -6.75, -4.05, -1.4, 1.4, 4.05, 6.75, 9.3], NX = 13, xa = x0 + 1.6, xb = x1 - 1.8;
  for (let i = 0; i < NX; i++) {
    const x = xa + ((xb - xa) * i) / (NX - 1);
    rows.forEach((z, j) => {
      const k = (i * 7 + j * 3) % 5;
      tryTable(x, z, k < 2 ? ['long', 'square', 'two'] : k < 4 ? ['square', 'two'] : ['two']);
    });
  }
  const bays = [x0, ...BAY_X, x1];
  for (let i = 0; i < bays.length - 1; i++) {
    const a = bays[i], b = bays[i + 1];
    for (const s of [-1, 1]) { if (b - a > 4.5) tryTable((a + b) / 2, s * 12.45, ['bay', 'long', 'square']); else tryTable((a + b) / 2 - 0.3, s * 12.45, ['square', 'two']); }
  }
  f.flush();
  return { tables, seats };
}

// ================================================================= 2nd class dining saloon

export const DINING2 = { x0: -59, x1: -36 };

/** Oak screens beside the 2nd class staircase – call before plan.finish(). */
export function dining2Walls(plan) {
  const k = plan.keepouts.find((q) => q.id === 'second');
  if (!k) return;
  for (const s of [-1, 1]) plan.wall(k.x0 + 2, s * (k.z1 + 0.06), k.x1 - 2, s * (k.z1 + 0.06), { wall: 'oakPanel' });
}

/** furnish function of the 2nd class dining saloon (room x −59..−36, full width, wraps the 'second' staircase). */
export function furnishDining2(ctx) {
  const plan = ctx.plan, world = ctx.world, Y = ctx.y, w = wctx(ctx), { x0, x1 } = DINING2;
  const f = new InstField(world, plan.deck);
  const sg = swivelGeos();
  f.define('swivelF', sg.frame, mats.mahogany).define('swivelP', sg.pad, mats.fabricRed)
    .define('cloth', unitCloth(), mats.linen).define('leg', unitLeg(), mats.mahogany).define('plate', plateGeo(), mats.porcelain);

  hullWainscot(plan, x0 + 0.05, x1 - 0.05, mats.oakPanel);
  coffers(plan, x0 + 0.05, x1 - 0.05, -13.85, 13.85, { px: 2.45, pz: 4.6, mat: mats.oak, w: 0.14, d: 0.08, avoid: plan.keepouts.filter((q) => q.id === 'second').map((q) => ({ ...q, z0: q.z0 - 0.2, z1: q.z1 + 0.2 })) });

  // piano and sideboards on the forward wall, pillars along the centre aisle
  w.put(piano({ mat: 'mahogany' }), x1 - 0.42, 0, 'aft');
  for (const z of [-4.6, 4.6]) w.put(servingCounter({ w: 2.2, d: 0.6, mat: 'oak', top: 'oak', items: true }), x1 - 0.4, z, 'aft');
  for (const z of [-11.6, 11.6]) w.put(servingCounter({ w: 2.0, d: 0.6, mat: 'oak', top: 'oak', items: true }), x0 + 0.4, z, 'fwd');
  for (const z of [-6, 6]) w.mount(sconce({ plain: true }), x0 + 0.06, z, 'fwd', 1.9);

  // long tables athwartships on both sides of the centre aisle, fixed swivel chairs every 0.62 m
  let tables = 0, seats = 0;
  const longTable = (x, zc, len) => {
    if (!w.free(x, zc, 1.9, len + 0.1)) return;
    const n = Math.floor((len - 0.1) / 0.62), list = [];
    for (let i = 0; i < n; i++) { const dz = -((n - 1) * 0.62) / 2 + i * 0.62; list.push([-0.45, dz], [0.45, dz]); }
    table(f, Y, x, zc, 0.9, len, list, { chair: 'swivel', lamp: false, off: 0.33 });
    w.reserve(x, zc, 1.9, len + 0.1); world.addCollider(x - 0.45, Y, zc - len / 2, x + 0.45, Y + 0.8, zc + len / 2);
    tables++; seats += list.length;
  };
  const NX = 9, xa = x0 + 2.1, xb = x1 - 1.6;
  for (let i = 0; i < NX; i++) {
    const x = xa + ((xb - xa) * i) / (NX - 1);
    for (const s of [-1, 1]) { longTable(x, s * 5.6, 5.0); longTable(x, s * 11.35, 3.7); }
  }
  f.flush();
  return { tables, seats };
}
