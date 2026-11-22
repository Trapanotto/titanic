// Shared helpers of the deck modules 'boat' and 'A': world-coordinate detailing on top of the interior kit (mouldings,
// raised-and-fielded boiserie, arched window surrounds, moulded ceilings), an InstancedMesh collector for repeated
// furniture, exterior window spans, the picture / special materials of both decks and a few shared custom props.
import * as THREE from 'three';
import { mats, canvasTexture } from '../core/materials.js';
import { EXT_DOORS, A_HOUSE, BOAT_HOUSES, ZONE_LEN } from '../core/constants.js';
import { matOf, faceDir, armchair, chairDining, tableRound, tableRect, pilaster, sconce, def } from '../interior/kit.js';
import * as G from '../interior/geom.js';

/** rotY that makes a prop's front (+x) face the given ship direction */
export const ROT = { fwd: 0, aft: Math.PI, port: Math.PI / 2, stbd: -Math.PI / 2 };
const DIRV = { fwd: [1, 0], aft: [-1, 0], port: [0, -1], stbd: [0, 1] };
const SIDES = ['fwd', 'aft', 'port', 'stbd'];
/** all wall sides except the given ones (walls owned by the exterior module are never duplicated) */
export const sidesBut = (...omit) => SIDES.filter((s) => !omit.includes(s));

/** wall face descriptors: line along x at z = c (normal n = ±1 along z) / line along z at x = c (normal along x) */
export const wx = (c, n) => ({ axis: 'x', c, n });
export const wz = (c, n) => ({ axis: 'z', c, n });

/** moulding profiles [out, up] (same family as the kit's) */
export const PR = {
  skirt: [[0, 0], [0.018, 0], [0.018, 0.13], [0.012, 0.14], [0.012, 0.155], [0.005, 0.17], [0, 0.175]],
  dado: [[0, 0], [0.006, 0.004], [0.014, 0.012], [0.018, 0.026], [0.014, 0.04], [0.006, 0.05], [0, 0.056]],
  picture: [[0, 0], [0.01, 0.004], [0.016, 0.016], [0.01, 0.028], [0, 0.034]],
  cornice: [[0, 0], [0.012, 0], [0.014, 0.016], [0.03, 0.026], [0.03, 0.05], [0.05, 0.06], [0.072, 0.09], [0.086, 0.12], [0.1, 0.13], [0.1, 0.16]],
  bolection: [[0, 0], [0.01, 0.006], [0.014, 0.018], [0.006, 0.028], [0, 0.03]],
  arch: [[0, 0], [0.014, 0], [0.02, 0.02], [0.018, 0.05], [0.026, 0.07], [0.014, 0.09], [0, 0.09]],
  bead: [[0, 0], [0.012, 0.004], [0.016, 0.016], [0, 0.03]],
  cove: [[0, 0], [0.02, 0.018], [0.038, 0.042], [0.05, 0.06]],
  lead: [[0, 0], [0.006, 0.002], [0.006, 0.01], [0, 0.012]],
};

// ------------------------------------------------------------------ exterior windows (same rule as the exterior module)

function windowsAlong(L, { pitch, w, margin = 0.6, clear = 1.4 }, doors) {
  const n = Math.max(0, Math.floor((L - 2 * margin + (pitch - w)) / pitch));
  const start = (L - (n * pitch - (pitch - w))) / 2, out = [];
  for (let i = 0; i < n; i++) {
    const a = start + i * pitch, b = a + w;
    if (doors.some((d) => b > d[0] - clear && a < d[1] + clear)) continue;
    out.push([a, b]);
  }
  return out;
}
const sideDoors = (deck, z) => EXT_DOORS.filter((d) => d.deck === deck && d.axis === 'x' && Math.abs(d.z - z) < 0.02).map((d) => [d.x - d.w / 2, d.x + d.w / 2]);

/** World x spans [x0, x1] of the window openings in the A-deck house side wall (s = -1 port, +1 starboard), sill 0.9, top 2.25. */
export function aWindows(s) {
  const z = s * A_HOUSE.hw, doors = sideDoors('A', z).map(([a, b]) => [a - A_HOUSE.x0, b - A_HOUSE.x0]);
  return windowsAlong(A_HOUSE.x1 - A_HOUSE.x0, { pitch: 2.6, w: 1.3 }, doors).map(([a, b]) => [a + A_HOUSE.x0, b + A_HOUSE.x0]);
}
/** Door spans (world x) of the EXT_DOORS in a house side wall. */
export function extDoorSpans(deck, s, hw) { return sideDoors(deck, s * hw); }
/** Window spans (world x) in a boat-deck house side wall, sill 1.0, top 2.15. */
export function boatWindows(id, s) {
  const h = BOAT_HOUSES.find((q) => q.id === id), z = s * h.hw;
  const len = id === 'fwd' ? 66 - h.x0 - 0.4 : h.x1 - h.x0;
  const doors = sideDoors('boat', z).map(([a, b]) => [a - h.x0, b - h.x0]);
  return windowsAlong(len, { pitch: 2.4, w: 0.95 }, doors).map(([a, b]) => [a + h.x0, b + h.x0]);
}
/** sub-intervals of [a, e] not covered by skip intervals, at least `min` long */
export function runs(a, e, skip = [], min = 0.05) {
  const out = []; let cur = a;
  for (const [u, v] of [...skip].sort((p, q) => p[0] - q[0])) {
    if (v <= cur || u >= e) continue;
    if (u - cur >= min) out.push([cur, Math.min(u, e)]);
    cur = Math.max(cur, v);
  }
  if (e - cur >= min) out.push([cur, e]);
  return out;
}

// ------------------------------------------------------------------ instancing of repeated furniture

/** Collects placed props per zone and replaces them by one InstancedMesh per (geometry, material, zone) on flush(). */
export class Instancer {
  constructor(world, deck) { this.world = world; this.deck = deck; this.sets = new Map(); this.n = 0; }
  /** take a prop group that was already placed (position / rotation / scale set, parent = zone) */
  take(prop) {
    prop.updateMatrix();
    const zi = Math.floor(prop.position.x / ZONE_LEN);
    for (const m of prop.children) {
      if (!m.isMesh) continue;
      const k = m.geometry.uuid + '|' + m.material.uuid + '|' + zi;
      let s = this.sets.get(k); if (!s) this.sets.set(k, (s = { geo: m.geometry, mat: m.material, zi, list: [] }));
      s.list.push(prop.matrix.clone().multiply(m.matrix));
    }
    prop.removeFromParent();
    this.n++;
  }
  flush() {
    for (const s of this.sets.values()) {
      const im = new THREE.InstancedMesh(s.geo, s.mat, s.list.length);
      s.list.forEach((M, i) => im.setMatrixAt(i, M));
      im.instanceMatrix.needsUpdate = true; im.computeBoundingBox(); im.computeBoundingSphere();
      im.receiveShadow = true;
      this.world.zone(this.deck, s.zi * ZONE_LEN + 1).add(im);
    }
    this.sets.clear();
  }
}
/** start instancing for a furnish context (props placed with iput / group go into ctx.inst) */
export function beginInst(ctx) { ctx.inst = new Instancer(ctx.world ?? ctx.plan.world, ctx.deck ?? ctx.plan.deck); return ctx.inst; }

// ------------------------------------------------------------------ furnishing in world coordinates (with the kit's checks)

/** ctx.put with world position and world facing ('fwd' | 'aft' | 'port' | 'stbd'); returns true if placed. */
export function wput(ctx, prop, x, z, dir = 'fwd', opts) {
  const dx = x - ctx.o[0], dz = z - ctx.o[1];
  const u = dx * ctx.U[0] + dz * ctx.U[1], v = dx * ctx.V[0] + dz * ctx.V[1];
  const w = DIRV[dir], du = w[0] * ctx.U[0] + w[1] * ctx.U[1], dv = w[0] * ctx.V[0] + w[1] * ctx.V[1];
  const ld = dv > 0.5 ? 'in' : dv < -0.5 ? 'out' : du > 0.5 ? 'right' : 'left';
  const ok = ctx.put(prop, u, v, ld, opts);
  if (!ok && globalThis.DECK_DEBUG) console.log(`[wput] ${ctx.room.id}: ${prop.userData.prop} at ${x.toFixed(2)}, ${z.toFixed(2)} refused`);
  if (ok && opts?.turn) prop.rotation.y += opts.turn;
  return ok;
}
/** wput + hand the prop to the context's instancer (if any) */
export function iput(ctx, prop, x, z, dir = 'fwd', opts) {
  const ok = wput(ctx, prop, x, z, dir, opts);
  if (ok && ctx.inst) ctx.inst.take(prop);
  return ok;
}
/** free placement (world x, z, rotY) after a free-square test of size sq; instanced when ctx.inst */
export function fput(ctx, prop, x, z, rotY, sq = 0.6, collide = false) {
  const dx = x - ctx.o[0], dz = z - ctx.o[1];
  const u = dx * ctx.U[0] + dz * ctx.U[1], v = dx * ctx.V[0] + dz * ctx.V[1];
  if (sq > 0 && !ctx.free(u, v, sq, sq)) return false;
  ctx.plan.prop(prop, x, z, rotY, { collide });
  if (sq > 0) ctx.occupied.push({ x0: x - sq / 2, x1: x + sq / 2, z0: z - sq / 2, z1: z + sq / 2 });
  if (ctx.inst) ctx.inst.take(prop);
  return true;
}
/** mark a world rectangle as occupied for the kit's placement checks */
export function reserve(ctx, x0, z0, x1, z1) { ctx.occupied.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1) }); }
/** keep 1.6 m in front of every exterior door of this deck that opens into the room free */
export function reserveExtDoors(ctx) {
  const r = ctx.room;
  for (const d of EXT_DOORS) {
    if (d.deck !== ctx.deck) continue;
    if (d.axis === 'x') {
      if (d.x < r.x0 || d.x > r.x1 || (d.z > 0 ? r.z1 < d.z - 3 : r.z0 > d.z + 3)) continue;
      const s = Math.sign(d.z);
      reserve(ctx, d.x - d.w / 2 - 0.35, d.z, d.x + d.w / 2 + 0.35, d.z - s * 1.9);
    } else {
      if (d.z < r.z0 || d.z > r.z1 || Math.abs(d.x - r.x0) > 0.5) continue;
      reserve(ctx, d.x, d.z - d.w / 2 - 0.35, d.x + 1.9, d.z + d.w / 2 + 0.35);
    }
  }
}
/**
 * Table with chairs around it through the kit's checks (instanced when ctx.inst).
 * o: { r, n, kind, mat, tmat, dist, a0, rect, w, d, dining, lamp, table (prop), chair (fn(i) → prop), jitter }
 */
export function group(ctx, x, z, o = {}) {
  const r = o.r ?? 0.45;
  const table = o.table ?? (o.rect ? tableRect({ w: o.w ?? 1.0, d: o.d ?? 0.8, mat: o.tmat ?? 'mahogany', cloth: o.cloth }) : tableRound({ r, mat: o.tmat ?? 'mahogany', lamp: o.lamp, cloth: o.cloth }));
  if (!iput(ctx, table, x, z, o.tdir ?? 'fwd', o.tcollide === undefined ? undefined : { collide: o.tcollide })) return false;
  const n = o.n ?? 4, dist = o.dist ?? (o.rect ? Math.max(o.w ?? 1.0, o.d ?? 0.8) / 2 + 0.45 : r + 0.55), rnd = ctx.drng;
  for (let i = 0; i < n; i++) {
    const a = (o.a0 ?? 0) + (i * Math.PI * 2) / n, cx = Math.cos(a), cz = Math.sin(a);
    const chair = o.chair ? o.chair(i) : o.dining ? chairDining({ cls: 'first', seat: o.mat }) : armchair({ kind: o.kind ?? 'uph', mat: o.mat });
    const j = (o.jitter ?? 0.12) * (rnd() - 0.5) * 2, jd = (o.jitter ?? 0.12) * 0.3 * (rnd() - 0.5);
    fput(ctx, chair, x + cx * (dist + jd), z + cz * (dist + jd), faceDir(-cx, -cz) + j, o.sq ?? 0.55);
  }
  return true;
}

// ------------------------------------------------------------------ world-coordinate detailing (no checks – walls, ceilings)

/** Detail helper for hero rooms. `ctx` is the kit's FurnishCtx (or anything with .plan). */
export function detailer(ctx) {
  const plan = ctx.plan, world = ctx.world ?? plan.world, b = plan.batch, Y = plan.y, H = plan.h;
  const UP = [0, 1, 0];
  const frame = (w) => (w.axis === 'x' ? { A: [1, 0, 0], O: [0, 0, w.n] } : { A: [0, 0, 1], O: [w.n, 0, 0] });
  const pt = (w, a, y, off = 0) => (w.axis === 'x' ? [a, Y + y, w.c + w.n * off] : [w.c + w.n * off, Y + y, a]);
  const d = {
    plan, world, b, Y, H, top: Y + H, pt, frame,
    /** floor prop at world x,z (no checks); collider like the kit unless given */
    put(prop, x, z, rot = 0, collide) {
      const fp = prop.userData.fp;
      const c = collide ?? !!(fp && fp.h > 0.45 && Math.min(fp.w, fp.d) >= 0.4 && Math.max(fp.w, fp.d) >= 0.75);
      plan.prop(prop, x, z, rot, { collide: c });
      if (ctx.occupied && fp) {
        const cs = Math.abs(Math.cos(rot)), sn = Math.abs(Math.sin(rot)), ex = (fp.d * cs + fp.w * sn) / 2, ez = (fp.d * sn + fp.w * cs) / 2;
        ctx.occupied.push({ x0: x - ex, x1: x + ex, z0: z - ez, z1: z + ez });
      }
      return prop;
    },
    /** wall / ceiling mounted prop at height h above the floor */
    mount(prop, x, z, rot, h) { plan.prop(prop, x, z, rot, { y: Y + h, collide: false }); return prop; },
    /** box in world x/z, heights above the floor */
    box(mat, x0, z0, x1, z1, y0, y1, collide = false, faces) {
      b.box(matOf(mat), x0, Y + y0, z0, x1, Y + y1, z1, faces);
      if (collide) world.addCollider(Math.min(x0, x1), Y + y0, Math.min(z0, z1), Math.max(x0, x1), Y + y1, Math.max(z0, z1));
    },
    /** box standing `off`..`off + t` in front of a wall face, from a..e along the wall */
    wbox(mat, w, a, e, y0, y1, t = 0.03, off = 0) {
      const c0 = w.c + w.n * off, c1 = w.c + w.n * (off + t);
      if (w.axis === 'x') b.box(matOf(mat), a, Y + y0, c0, e, Y + y1, c1); else b.box(matOf(mat), c0, Y + y0, a, c1, Y + y1, e);
    },
    /** flat picture on a wall face (single quad facing into the room), texture u runs left→right as seen by the viewer */
    wquad(mat, w, a, e, y0, y1, off = 0.03) {
      const c = w.c + w.n * off, m = matOf(mat), uv = [[0, 0], [1, 0], [1, 1], [0, 1]];
      if (w.axis === 'x') {
        const [p, q] = w.n > 0 ? [a, e] : [e, a];
        b.poly(m, [[p, Y + y0, c], [q, Y + y0, c], [q, Y + y1, c], [p, Y + y1, c]], [0, 0, w.n], uv);
      } else {
        const [p, q] = w.n > 0 ? [e, a] : [a, e];
        b.poly(m, [[c, Y + y0, p], [c, Y + y0, q], [c, Y + y1, q], [c, Y + y1, p]], [w.n, 0, 0], uv);
      }
    },
    /** rotation of a wall-mounted prop on wall face w (front pointing into the room) */
    wrot(w) { return w.axis === 'x' ? faceDir(0, w.n) : faceDir(w.n, 0); },
    /** wall prop (sconce, clock, mirror, gauge) at position p along wall w, height h */
    wmount(prop, w, p, h, off = 0.005) {
      const c = w.c + w.n * off;
      return d.mount(prop, w.axis === 'x' ? p : c, w.axis === 'x' ? c : p, d.wrot(w), h);
    },
    /** sconces along a wall, with lamp registration every second one */
    sconces(w, list, h = 1.85, off = 0.005) {
      list.forEach((p, i) => {
        d.wmount(sconce(), w, p, h, off);
        if (i % 2 === 0) world.addLamp({ x: w.axis === 'x' ? p : w.c + w.n * 0.3, y: Y + h, z: w.axis === 'x' ? w.c + w.n * 0.3 : p, intensity: 0.5 });
      });
    },
    /** pilasters at the given positions along wall w */
    pilasters(w, list, o = {}) {
      for (const p of list) {
        const c = w.c + w.n * (0.04 + (o.off ?? 0));
        plan.prop(pilaster({ h: o.h ?? H, w: o.w ?? 0.32, mat: o.mat ?? 'oak', capital: o.capital ?? 'gold' }), w.axis === 'x' ? p : c, w.axis === 'x' ? c : p, d.wrot(w), { collide: false });
      }
    },
    /** continuous strip (cornice bead, dado rail, wainscot) along a wall, interrupted by skip intervals */
    strip(mat, w, a, e, y0, y1, t = 0.03, skip = [], off = 0) {
      for (const [p, q] of runs(a, e, skip)) d.wbox(mat, w, p, q, y0, y1, t, off);
    },
    // ---------------------------------------------------------- mouldings
    /** horizontal moulding along wall w from a..e at height y (profile [out, up]) */
    mould(mat, w, a, e, y, prof, off = 0, caps = [true, true]) {
      if (e - a < 0.01) return;
      const { A, O } = frame(w);
      b.sweep(matOf(mat), prof, pt(w, a, y, off), A, O, UP, e - a, caps);
    },
    mouldRun(mat, w, a, e, y, prof, skip = [], off = 0) { for (const [p, q] of runs(a, e, skip)) d.mould(mat, w, p, q, y, prof, off); },
    /** moulding along a polyline [[a, y], ...] in the wall plane; clockwise paths (a to the right, y up) put the profile outside */
    path(mat, w, pts, prof, off = 0, closed = false) {
      const { A: Aw, O } = frame(w), m = matOf(mat), n = pts.length;
      for (let i = 0; i < (closed ? n : n - 1); i++) {
        const [a0, y0] = pts[i], [a1, y1] = pts[(i + 1) % n], l = Math.hypot(a1 - a0, y1 - y0);
        if (l < 1e-4) continue;
        const da = (a1 - a0) / l, dy = (y1 - y0) / l;
        const A = [Aw[0] * da, dy, Aw[2] * da], U = [-Aw[0] * dy, da, -Aw[2] * dy];
        b.sweep(m, prof, pt(w, a0, y0, off), A, O, U, l + 0.004, [false, false]);
      }
    },
    /** raised and fielded panel centred at (a, y) on wall w */
    fpanel(mat, w, a, y, pw, ph, t = 0.012, e = 0.04, off = 0) {
      const { A, O } = frame(w);
      b.fielded(matOf(mat), pt(w, a, y, off), A, O, UP, pw, ph, t, Math.min(e, pw * 0.25, ph * 0.25));
    },
    /** rectangle loop (clockwise) for path() */
    rectLoop(a0, a1, y0, y1) { return [[a0, y0], [a0, y1], [a1, y1], [a1, y0]]; },
    /** panel outline with an arched (segmental) top */
    archLoop(a0, a1, y0, y1, rise = 0.12, n = 8) {
      const pts = [[a0, y0], [a0, y1 - rise]];
      for (let k = 0; k <= n; k++) { const t = k / n; pts.push([a0 + (a1 - a0) * t, y1 - rise + rise * Math.sin(Math.PI * t)]); }
      pts.push([a1, y1 - rise], [a1, y0]);
      return pts;
    },
    /**
     * Boiserie along wall w from a..e: lower dado panels, tall raised and fielded upper panels with bolection mouldings
     * (optionally with arched heads), frieze tablets, frieze moulding. o: { mat, frame, stile, pitch, skip, skipHigh,
     * clad (base material: covers a face that is not a kit wall + skirting / dado rail / cornice), cladSkip, arch,
     * orn: (a, y0, y1, pw, off) => {…}, lower: true, frieze: true, upper: [y0, y1] }
     */
    dress(w, a, e, o = {}) {
      const st = o.stile ?? 0.1, pitch = o.pitch ?? 0.9, mat = o.mat ?? 'oak', fr = o.frame, off = o.off ?? (o.clad ? 0.012 : 0);
      const skip = o.skip ?? [];
      if (o.skipLow && o.lower !== false) { // lower row laid out separately (e.g. under windows)
        d.dress(w, a, e, { ...o, clad: null, skip: o.skipLow, skipLow: null, upper: null, uOnly: false, frieze: false, onlyLower: true, off });
      }
      if (o.clad) {
        const cs = o.cladSkip ?? skip;
        d.strip(o.clad, w, a, e, 0, H, 0.012, cs);
        const rail = o.rail ?? fr ?? o.clad;
        d.mouldRun(o.skirt ?? rail, w, a, e, 0, PR.skirt, cs, off);
        d.mouldRun(rail, w, a, e, 0.86, PR.dado, cs, off);
        d.mouldRun(o.cornice ?? rail, w, a, e, H - 0.16, PR.cornice, o.skipHigh ?? [], off);
      }
      const [u0, u1] = o.upper ?? [1.02, H - 0.66];
      for (const [p, q] of runs(a, e, skip, 0.3)) {
        const L = q - p, n = Math.max(1, Math.round(L / pitch)), pw = (L - (n + 1) * st) / n;
        if (pw < 0.12) continue;
        for (let i = 0; i < n; i++) {
          const ac = p + st + pw / 2 + i * (pw + st);
          if (o.lower !== false && (o.onlyLower || !o.skipLow)) { d.fpanel(mat, w, ac, 0.48, pw, 0.5, 0.01, 0.035, off); if (fr) d.path(fr, w, d.rectLoop(ac - pw / 2, ac + pw / 2, 0.23, 0.73), PR.bead, off, true); }
          if (o.onlyLower) continue;
          if (o.arch) d.fpanel(mat, w, ac, (u0 + u1 - 0.12) / 2, pw, u1 - u0 - 0.12, 0.012, 0.045, off);
          else d.fpanel(mat, w, ac, (u0 + u1) / 2, pw, u1 - u0, 0.012, 0.045, off);
          if (fr) d.path(fr, w, o.arch ? d.archLoop(ac - pw / 2, ac + pw / 2, u0, u1, Math.min(0.16, pw * 0.3)) : d.rectLoop(ac - pw / 2, ac + pw / 2, u0, u1), PR.bolection, off, true);
          if (o.orn) o.orn(ac, u0, u1, pw, off);
          if (o.frieze !== false) d.fpanel(mat, w, ac, H - 0.33, pw, 0.2, 0.008, 0.03, off);
        }
      }
      if (o.frieze !== false && !o.onlyLower) d.mouldRun(fr ?? mat, w, a, e, H - 0.5, PR.picture, o.skipHigh ?? [], off);
    },
    /**
     * Arched window surround in an exterior wall opening p..q: arched (stained) glass pane with lead cames, spandrels,
     * moulded architrave with keystone and imposts, sill board. o: { sill, head, glass, spandrel, frame, key, lead, off }
     */
    archWindow(w, p, q, o = {}) {
      const sill = o.sill ?? 0.9, head = o.head ?? 2.25, Wd = q - p, r = Wd / 2, m = (p + q) / 2, ys = head - r, N = 12;
      const { O } = frame(w), arc = [];
      for (let k = 0; k <= N; k++) { const th = Math.PI - (Math.PI * k) / N; arc.push([m + r * Math.cos(th), ys + r * Math.sin(th)]); }
      if (o.glass) {
        const g2 = [[p, sill], [q, sill], [q, ys], ...arc.slice().reverse().slice(1, -1), [p, ys]];
        b.poly(matOf(o.glass), g2.map(([a, y]) => pt(w, a, y, -0.035)), O, g2.map(([a, y]) => [(a - p) / Wd, (y - sill) / (head - sill)]));
      }
      const sp = matOf(o.spandrel ?? 'woodDark');
      for (const half of [0, 1]) { // spandrels: fan from the top corners to the arc
        const cn = half ? [q, head] : [p, head], seg = half ? arc.slice(N / 2) : arc.slice(0, N / 2 + 1);
        for (let k = 0; k < seg.length - 1; k++) b.poly(sp, [pt(w, cn[0], cn[1], -0.004), pt(w, seg[k][0], seg[k][1], -0.004), pt(w, seg[k + 1][0], seg[k + 1][1], -0.004)], O);
      }
      if (o.lead !== false && o.glass) {
        const lm = o.lead ?? mats.iron;
        for (const f of [1 / 3, 2 / 3]) d.path(lm, w, [[p + Wd * f, sill], [p + Wd * f, ys + r * Math.sin(Math.acos((p + Wd * f - m) / r)) - 0.01]], PR.lead, -0.032);
        for (const y of [sill + (ys - sill) * 0.36, sill + (ys - sill) * 0.72, ys]) d.path(lm, w, [[p, y], [q, y]], PR.lead, -0.032);
        d.path(lm, w, arc.map(([a, y]) => [m + (a - m) * 0.55, ys + (y - ys) * 0.55]), PR.lead, -0.032);
      }
      const fm = o.frame ?? 'woodDark';
      d.path(fm, w, [[p, sill], ...arc, [q, sill]], PR.arch, o.off ?? 0.03);
      d.wbox(o.key ?? fm, w, m - 0.07, m + 0.07, head - 0.05, head + 0.13, 0.05, o.off ?? 0.03);
      for (const a of [p, q]) d.wbox(fm, w, a - 0.11, a + 0.11, ys - 0.06, ys, 0.06, o.off ?? 0.03);
      d.wbox(fm, w, p - 0.12, q + 0.12, sill - 0.05, sill, 0.09, 0);
    },
    /**
     * Moulded ceiling: beams in both directions (bottom beads, coves at the ceiling), callback per coffer.
     * o: { mat, bead, depth, w, pitchX, pitchZ, skip: [rects], cell(cx, cz, i, j) }
     */
    ceiling(x0, x1, z0, z1, o = {}) {
      const mat = matOf(o.mat ?? 'plaster'), dp = o.depth ?? 0.14, bw = o.w ?? 0.24, top = Y + H, bead = o.bead ? matOf(o.bead) : null;
      const nx = Math.max(1, Math.round((x1 - x0) / (o.pitchX ?? 3))), nz = Math.max(1, Math.round((z1 - z0) / (o.pitchZ ?? 3)));
      const skip = o.skip ?? [];
      const hit = (r) => skip.some((s) => r.x0 < s.x1 && r.x1 > s.x0 && r.z0 < s.z1 && r.z1 > s.z0);
      const beam = (alongX, c, a0, a1) => {
        for (const [p, q] of runs(a0, a1, skip.filter((s) => (alongX ? c > s.z0 - bw && c < s.z1 + bw : c > s.x0 - bw && c < s.x1 + bw)).map((s) => (alongX ? [s.x0, s.x1] : [s.z0, s.z1])), 0.2)) {
          if (alongX) b.box(mat, p, top - dp, c - bw / 2, q, top, c + bw / 2, 'zZy'); else b.box(mat, c - bw / 2, top - dp, p, c + bw / 2, top, q, 'xXy');
          for (const s of [-1, 1]) {
            const O = alongX ? [0, 0, s] : [s, 0, 0], A = alongX ? [1, 0, 0] : [0, 0, 1], P0 = (y) => (alongX ? [p, y, c + s * bw / 2] : [c + s * bw / 2, y, p]);
            b.sweep(mat, PR.cove, P0(top - 0.06), A, O, UP, q - p, [false, false]);
            b.sweep(bead ?? mat, PR.bead, P0(top - dp), A, O, UP, q - p, [false, false]);
          }
          if (bead) { if (alongX) b.flat(bead, p, q, c - 0.025, c + 0.025, top - dp - 0.003, true); else b.flat(bead, c - 0.025, c + 0.025, p, q, top - dp - 0.003, true); }
        }
      };
      for (let i = 0; i <= nx; i++) beam(false, x0 + ((x1 - x0) * i) / nx, z0, z1);
      for (let j = 0; j <= nz; j++) beam(true, z0 + ((z1 - z0) * j) / nz, x0, x1);
      if (o.cell) for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
        const cx = x0 + ((x1 - x0) * (i + 0.5)) / nx, cz = z0 + ((z1 - z0) * (j + 0.5)) / nz;
        if (!hit({ x0: cx - 0.3, x1: cx + 0.3, z0: cz - 0.3, z1: cz + 0.3 })) o.cell(cx, cz, i, j);
      }
    },
    /** flat floor band (border / inlay) 8 mm above the deck */
    band(mat, x0, x1, z0, z1, y = 0.009) { b.flat(matOf(mat), x0, x1, z0, z1, Y + y); },
    lamp(x, z, style = 'bowl', o) { plan.lamp(x, z, style, o); },
    glow(x, z, h, color = 0xff8a3a, intensity = 0.8) { world.addLamp({ x, y: Y + h, z, color, intensity }); },
    /** legacy helpers kept for the simpler rooms */
    panels(w, a, e, o = {}) { d.dress(w, a, e, { mat: o.mat === 'oakPanel' ? 'oak' : o.mat, frame: o.frame, pitch: o.pitch ?? 1.1, skip: o.skip, lower: false, frieze: false, upper: [o.y0 ?? 1.02, o.y1 ?? H - 0.3] }); },
    lineExterior(w, a, e, o = {}) {
      const wins = (o.wins ?? []).filter(([p, q]) => q > a && p < e), doors = (o.doors ?? []).filter(([p, q]) => q > a && p < e);
      const sill = o.sill ?? 0.9, head = o.head ?? 2.25, t = o.t ?? 0.03;
      const holes = [...wins.map(([p, q]) => [p - 0.06, q + 0.06]), ...doors.map(([p, q]) => [p - 0.07, q + 0.07])];
      const dh = doors.map(([p, q]) => [p - 0.07, q + 0.07]);
      d.strip(o.wainscot ?? o.wall, w, a, e, 0, sill - 0.02, t, dh);
      d.strip(o.wall, w, a, e, sill - 0.02, head + 0.02, t, holes);
      d.strip(o.wall, w, a, e, head + 0.02, H, t, doors.map(([p, q]) => [p - 0.07, q + 0.07]).filter(() => (o.doorH ?? 2.1) > H - 0.05));
      d.mouldRun(o.skirt ?? o.dado ?? o.wall, w, a, e, 0, PR.skirt, dh, t);
      if (o.dado) d.mouldRun(o.dado, w, a, e, sill - 0.04, PR.dado, dh, t);
      if (o.cornice) d.mould(o.cornice, w, a, e, H - 0.16, PR.cornice, t);
      if (o.panels) d.dress(w, a, e, { mat: o.panels.mat === 'oakPanel' ? 'oak' : o.panels.mat, frame: o.panels.frame, pitch: o.panels.pitch ?? 0.9, skip: holes, upper: [0.12, sill - 0.14], lower: false, frieze: false });
      if (o.reveal) for (const [p, q] of wins) {
        d.wbox(o.reveal, w, p - 0.06, p, sill, head, t + 0.02); d.wbox(o.reveal, w, q, q + 0.06, sill, head, t + 0.02);
        d.wbox(o.reveal, w, p - 0.06, q + 0.06, sill - 0.05, sill, t + 0.06); d.wbox(o.reveal, w, p - 0.06, q + 0.06, head, head + 0.05, t + 0.02);
      }
    },
    /** legacy coffer (simple beams) */
    coffer(x0, x1, z0, z1, o = {}) { d.ceiling(x0, x1, z0, z1, { ...o, pitchX: o.pitchX ?? 3.3, pitchZ: o.pitchZ ?? 3.3 }); },
  };
  return d;
}

// ------------------------------------------------------------------ materials (created once, lazily)

const _m = {};
function std(o, name) { const m = new THREE.MeshStandardMaterial(o); m.name = 'ab_' + name; return m; }
function lcg(seed) { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }
const tex = (size, draw, seed, metres = 1) => { const t = canvasTexture(size, metres, draw, seed); return t; };
function dialText(c, s, items, r0, col = '#1a1a1a', font = 0.05) {
  c.save(); c.translate(s / 2, s / 2); c.fillStyle = col; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `bold ${Math.round(s * font)}px Georgia, serif`;
  for (const [txt, a] of items) { c.save(); c.rotate(a); c.translate(0, -r0 * s); c.fillText(txt, 0, 0); c.restore(); }
  c.restore();
}

/** Picture / special materials shared by both decks (named ab_*) */
export function deckMats() {
  if (_m.ready) return _m;
  _m.ready = true;
  // White Star Line route map in the gymnasium (illuminated from behind)
  const wm = tex(512, (c, s) => {
    const r = lcg(5);
    c.fillStyle = '#d9cca4'; c.fillRect(0, 0, s, s);
    c.fillStyle = '#9fb7b8'; c.fillRect(s * 0.04, s * 0.18, s * 0.92, s * 0.64);
    c.fillStyle = '#cdb98a';
    const blob = (x, y, rx, ry) => { c.beginPath(); for (let i = 0; i <= 18; i++) { const a = (i / 18) * Math.PI * 2, k = 0.75 + r() * 0.35; c.lineTo(s * (x + Math.cos(a) * rx * k), s * (y + Math.sin(a) * ry * k)); } c.fill(); };
    blob(0.2, 0.36, 0.13, 0.12); blob(0.27, 0.62, 0.07, 0.14); blob(0.52, 0.33, 0.07, 0.09); blob(0.54, 0.58, 0.08, 0.15); blob(0.74, 0.37, 0.17, 0.12); blob(0.86, 0.7, 0.06, 0.05);
    c.strokeStyle = '#a3241c'; c.lineWidth = 3; c.setLineDash([8, 5]);
    for (const [a, b2] of [[[0.5, 0.31], [0.29, 0.4]], [[0.5, 0.31], [0.56, 0.75]], [[0.5, 0.31], [0.86, 0.69]], [[0.29, 0.4], [0.31, 0.5]]]) { c.beginPath(); c.moveTo(a[0] * s, a[1] * s); c.quadraticCurveTo((a[0] + b2[0]) / 2 * s, (Math.min(a[1], b2[1]) - 0.05) * s, b2[0] * s, b2[1] * s); c.stroke(); }
    c.setLineDash([]); c.strokeStyle = '#5b4a2a'; c.lineWidth = 10; c.strokeRect(5, 5, s - 10, s - 10);
    c.fillStyle = '#3a2c18'; c.font = `bold ${Math.round(s * 0.06)}px Georgia, serif`; c.textAlign = 'center'; c.fillText('WHITE STAR LINE', s / 2, s * 0.12);
    c.font = `${Math.round(s * 0.035)}px Georgia, serif`; c.fillText('ROYAL & UNITED STATES MAIL STEAMERS', s / 2, s * 0.9);
  }, 5);
  _m.worldMap = std({ map: wm, emissive: 0xffffff, emissiveMap: wm, emissiveIntensity: 0.35, roughness: 0.8 }, 'worldMap');
  // cross-section of the ship (gymnasium poster)
  _m.shipSection = std({ map: tex(512, (c, s) => {
    c.fillStyle = '#e8dfc4'; c.fillRect(0, 0, s, s);
    c.fillStyle = '#1e1e22'; c.beginPath(); c.moveTo(s * 0.04, s * 0.5); c.lineTo(s * 0.96, s * 0.5); c.lineTo(s * 0.92, s * 0.72); c.quadraticCurveTo(s * 0.5, s * 0.76, s * 0.1, s * 0.7); c.closePath(); c.fill();
    c.fillStyle = '#7a2a22'; c.fillRect(s * 0.1, s * 0.66, s * 0.82, s * 0.05);
    c.fillStyle = '#f2efe6'; c.fillRect(s * 0.2, s * 0.4, s * 0.62, s * 0.1);
    c.fillStyle = '#c8822e'; for (let i = 0; i < 4; i++) { c.fillRect(s * (0.3 + i * 0.13), s * 0.22, s * 0.05, s * 0.18); c.fillStyle = '#1a1a1a'; c.fillRect(s * (0.3 + i * 0.13), s * 0.22, s * 0.05, s * 0.03); c.fillStyle = '#c8822e'; }
    c.strokeStyle = '#d8cfb0'; c.lineWidth = 2; for (let i = 1; i < 7; i++) { c.beginPath(); c.moveTo(s * 0.08, s * (0.5 + i * 0.03)); c.lineTo(s * 0.93, s * (0.5 + i * 0.03)); c.stroke(); }
    for (let i = 1; i < 16; i++) { c.beginPath(); c.moveTo(s * (0.08 + i * 0.053), s * 0.5); c.lineTo(s * (0.08 + i * 0.053), s * 0.7); c.stroke(); }
    c.fillStyle = '#2a2018'; c.font = `bold ${Math.round(s * 0.05)}px Georgia, serif`; c.textAlign = 'center'; c.fillText('R.M.S. "TITANIC"', s / 2, s * 0.12); c.font = `${Math.round(s * 0.03)}px Georgia, serif`; c.fillText('46,328 TONS · 882 FT 9 IN', s / 2, s * 0.88);
    c.strokeStyle = '#5b4a2a'; c.lineWidth = 10; c.strokeRect(5, 5, s - 10, s - 10);
  }, 7), roughness: 0.8 }, 'shipSection');
  // "Plymouth Harbour" by Norman Wilkinson (smoking room) – an evocative stand-in
  _m.plymouth = std({ map: tex(512, (c, s) => {
    const r = lcg(9);
    const g = c.createLinearGradient(0, 0, 0, s * 0.55); g.addColorStop(0, '#c9a46a'); g.addColorStop(1, '#efd7a5');
    c.fillStyle = g; c.fillRect(0, 0, s, s * 0.55);
    c.fillStyle = '#5d6f6a'; c.fillRect(0, s * 0.55, s, s * 0.45);
    for (let i = 0; i < 260; i++) { c.fillStyle = `rgba(${200 + r() * 55},${180 + r() * 50},${120 + r() * 40},${0.15 + r() * 0.25})`; c.fillRect(r() * s, s * (0.56 + r() * 0.44), 6 + r() * 30, 2); }
    c.fillStyle = '#4d5b45'; c.beginPath(); c.moveTo(0, s * 0.55); c.lineTo(s * 0.2, s * 0.44); c.lineTo(s * 0.45, s * 0.5); c.lineTo(s * 0.7, s * 0.46); c.lineTo(s, s * 0.52); c.lineTo(s, s * 0.56); c.lineTo(0, s * 0.56); c.fill();
    const ship = (x, y, k) => { c.fillStyle = '#2b2620'; c.fillRect(x - 40 * k, y, 80 * k, 10 * k); c.fillRect(x - 3 * k, y - 70 * k, 4 * k, 70 * k); c.fillStyle = '#eadcbc'; for (let j = 0; j < 3; j++) c.fillRect(x - 25 * k + j * 2, y - 65 * k + j * 22 * k, 50 * k - j * 4, 16 * k); };
    ship(s * 0.3, s * 0.68, 1.1); ship(s * 0.72, s * 0.62, 0.7); ship(s * 0.55, s * 0.58, 0.45);
  }, 9), roughness: 0.7 }, 'plymouth');
  // painted, leaded stained glass (smoking room windows), lit from behind: border, ship medallion, crest
  const sg = tex(256, (c, s) => {
    const r = lcg(13), cols = ['#b8862e', '#3f6e4a', '#a03a2c', '#d8c48a', '#3a5a8a', '#e6d9b0'];
    c.fillStyle = '#e4d6a6'; c.fillRect(0, 0, s, s);
    const q = s / 10;
    for (let i = 0; i < 10; i++) for (const [x, y] of [[i * q, 0], [i * q, s - q], [0, i * q], [s - q, i * q]]) { c.fillStyle = cols[Math.floor(r() * cols.length)]; c.fillRect(x, y, q, q); }
    for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(255,250,220,${0.1 + r() * 0.2})`; c.fillRect(q + r() * (s - 3 * q), q + r() * (s - 3 * q), q * 0.8, q * 0.8); }
    c.fillStyle = '#3a5a8a'; c.beginPath(); c.ellipse(s / 2, s * 0.45, s * 0.24, s * 0.2, 0, 0, 7); c.fill();
    c.fillStyle = '#7fa3c8'; c.fillRect(s * 0.27, s * 0.45, s * 0.46, s * 0.12);
    c.fillStyle = '#2a2420'; c.fillRect(s * 0.36, s * 0.42, s * 0.28, s * 0.04); c.fillStyle = '#e8dcb0'; c.fillRect(s * 0.42, s * 0.32, s * 0.03, s * 0.1); c.fillRect(s * 0.52, s * 0.3, s * 0.03, s * 0.12);
    c.fillStyle = '#a03a2c'; c.beginPath(); c.moveTo(s * 0.42, s * 0.7); c.lineTo(s * 0.58, s * 0.7); c.lineTo(s * 0.58, s * 0.8); c.quadraticCurveTo(s * 0.5, s * 0.88, s * 0.42, s * 0.8); c.fill();
    c.fillStyle = '#d9b253'; c.fillRect(s * 0.47, s * 0.72, s * 0.06, s * 0.08);
    c.strokeStyle = '#1c1a16'; c.lineWidth = 3; c.strokeRect(q, q, s - 2 * q, s - 2 * q);
    c.beginPath(); c.ellipse(s / 2, s * 0.45, s * 0.24, s * 0.2, 0, 0, 7); c.stroke();
  }, 13);
  sg.repeat.set(1, 1);
  _m.stained = std({ map: sg, emissive: 0xffffff, emissiveMap: sg, emissiveIntensity: 0.6, roughness: 0.3 }, 'stained');
  // nautical chart (chart room / wheelhouse table top, framed on walls)
  _m.chart = std({ map: tex(256, (c, s) => {
    const r = lcg(21);
    c.fillStyle = '#e9e1c6'; c.fillRect(0, 0, s, s);
    c.strokeStyle = 'rgba(70,90,110,0.5)'; c.lineWidth = 1;
    for (let i = 0; i < s; i += 32) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, s); c.stroke(); c.beginPath(); c.moveTo(0, i); c.lineTo(s, i); c.stroke(); }
    c.fillStyle = '#d8c79a'; c.beginPath(); c.moveTo(0, s * 0.7); for (let i = 0; i <= 10; i++) c.lineTo(i * s / 10, s * (0.7 + r() * 0.12)); c.lineTo(s, s); c.lineTo(0, s); c.fill();
    c.strokeStyle = '#8a2a20'; c.lineWidth = 2; c.beginPath(); c.moveTo(s * 0.9, s * 0.15); c.lineTo(s * 0.1, s * 0.55); c.stroke();
    c.fillStyle = '#3a4a5a'; for (let i = 0; i < 40; i++) c.fillRect(r() * s, r() * s * 0.65, 2, 2);
  }, 21), roughness: 0.9 }, 'chart');
  // red and blue linoleum tiles of the smoking room (0.3 m tiles, metres UV)
  _m.linoSmoke = mats.linoRed.clone(); _m.linoSmoke.name = 'ab_linoSmoke';
  _m.linoSmoke.map = tex(256, (c, s) => {
    const r = lcg(31), q = s / 4;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const red = (i + j) % 2 === 0; c.fillStyle = red ? `rgb(${120 + r() * 14},${36 + r() * 8},${32})` : `rgb(${38},${52 + r() * 8},${96 + r() * 14})`; c.fillRect(i * q, j * q, q, q); c.fillStyle = red ? '#d6c49a' : '#c9b480'; c.fillRect(i * q + q * 0.42, j * q + q * 0.42, q * 0.16, q * 0.16); }
    c.strokeStyle = 'rgba(20,10,8,0.6)'; c.lineWidth = 1.5; for (let i = 0; i <= 4; i++) { c.beginPath(); c.moveTo(i * q, 0); c.lineTo(i * q, s); c.moveTo(0, i * q); c.lineTo(s, i * q); c.stroke(); }
  }, 31, 1.2);
  // black and white chequered tiles (Verandah Café)
  _m.tileCheck = mats.tileWhite.clone(); _m.tileCheck.name = 'ab_tileCheck';
  _m.tileCheck.map = tex(256, (c, s) => {
    const q = s / 4;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { c.fillStyle = (i + j) % 2 ? '#1e1e20' : '#ecebe4'; c.fillRect(i * q, j * q, q, q); }
    c.strokeStyle = 'rgba(120,120,120,0.6)'; c.lineWidth = 1; for (let i = 0; i <= 4; i++) { c.beginPath(); c.moveTo(i * q, 0); c.lineTo(i * q, s); c.moveTo(0, i * q); c.lineTo(s, i * q); c.stroke(); }
  }, 33, 1.0);
  // rose carpet (Reading & Writing Room)
  _m.carpetRose = mats.carpetRed.clone(); _m.carpetRose.name = 'ab_carpetRose';
  _m.carpetRose.map = tex(256, (c, s) => {
    const r = lcg(35);
    c.fillStyle = '#b77a7c'; c.fillRect(0, 0, s, s);
    for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(${150 + r() * 60},${90 + r() * 40},${95 + r() * 40},0.25)`; c.fillRect(r() * s, r() * s, 2, 2); }
    c.strokeStyle = '#d9b2a6'; c.lineWidth = 3;
    for (const [x, y] of [[0.25, 0.25], [0.75, 0.75], [0.25, 0.75], [0.75, 0.25]]) { c.beginPath(); c.ellipse(x * s, y * s, s * 0.1, s * 0.06, Math.PI / 4, 0, 7); c.stroke(); c.fillStyle = '#8e4f55'; c.beginPath(); c.arc(x * s, y * s, s * 0.025, 0, 7); c.fill(); }
  }, 35, 1.0);
  _m.carpetRose.sheenColor?.setHex(0xd8a0a0);
  _m.fabricRose = mats.fabricRed.clone(); _m.fabricRose.name = 'ab_fabricRose'; _m.fabricRose.color.setHex(0xb0767a); _m.fabricRose.sheenColor?.setHex(0xe0b0b0);
  _m.silk = mats.fabricGold.clone(); _m.silk.name = 'ab_silk'; _m.silk.color.setHex(0xd8c59a); _m.silk.side = THREE.DoubleSide;
  _m.drapeRed = mats.fabricRed.clone(); _m.drapeRed.name = 'ab_drapeRed'; _m.drapeRed.side = THREE.DoubleSide;
  _m.drapeGreen = mats.fabricGreen.clone(); _m.drapeGreen.name = 'ab_drapeGreen'; _m.drapeGreen.side = THREE.DoubleSide;
  _m.drapeRose = _m.fabricRose.clone(); _m.drapeRose.name = 'ab_drapeRose'; _m.drapeRose.side = THREE.DoubleSide;
  _m.pearl = std({ color: 0xf1ece2, roughness: 0.18, metalness: 0.25, emissive: 0x302c26, emissiveIntensity: 0.4 }, 'pearl');
  // engine-order telegraph dial (lettered sectors), docking telegraph, compass card, Marconi clock with silence periods
  const telegraphDial = (orders, bg, seed) => tex(256, (c, s) => {
    c.fillStyle = '#f2ecd8'; c.beginPath(); c.arc(s / 2, s / 2, s * 0.49, 0, 7); c.fill();
    const n = orders.length;
    for (let i = 0; i < n; i++) {
      const a0 = -Math.PI * 0.85 + (i / n) * Math.PI * 1.7, a1 = a0 + Math.PI * 1.7 / n;
      c.fillStyle = i % 2 ? '#f2ecd8' : bg; c.beginPath(); c.moveTo(s / 2, s / 2); c.arc(s / 2, s / 2, s * 0.47, a0 - Math.PI / 2, a1 - Math.PI / 2); c.fill();
    }
    dialText(c, s, orders.map((t, i) => [t, -Math.PI * 0.85 + ((i + 0.5) / n) * Math.PI * 1.7]), 0.36, '#1a1a1a', 0.055);
    c.fillStyle = '#1a1a1a'; c.font = `bold ${Math.round(s * 0.05)}px Georgia, serif`; c.textAlign = 'center'; c.fillText('AHEAD', s * 0.3, s * 0.82); c.fillText('ASTERN', s * 0.7, s * 0.82);
    c.fillStyle = '#b08a3a'; c.beginPath(); c.arc(s / 2, s / 2, s * 0.06, 0, 7); c.fill();
  }, seed);
  _m.telegraphFace = std({ map: telegraphDial(['FULL', 'HALF', 'SLOW', 'STAND BY', 'STOP', 'SLOW', 'HALF', 'FULL'], '#d8c79a', 41), roughness: 0.4 }, 'telegraphFace');
  _m.dockFace = std({ map: telegraphDial(['ALL FAST', 'HEAVE IN', 'STOP', 'SLACK', 'LET GO'], '#c9d4c8', 43), roughness: 0.4 }, 'dockFace');
  _m.compassFace = std({ map: tex(256, (c, s) => {
    c.fillStyle = '#efe6cc'; c.beginPath(); c.arc(s / 2, s / 2, s * 0.49, 0, 7); c.fill();
    c.save(); c.translate(s / 2, s / 2);
    for (let i = 0; i < 32; i++) { c.rotate(Math.PI / 16); c.fillStyle = i % 4 === 3 ? '#1a1a1a' : i % 2 ? '#7a2a22' : '#3a3a3a'; c.beginPath(); c.moveTo(0, 0); c.lineTo(s * 0.025, -s * (i % 4 === 3 ? 0.18 : 0.26)); c.lineTo(0, -s * (i % 4 === 3 ? 0.42 : 0.3)); c.lineTo(-s * 0.025, -s * 0.2); c.fill(); }
    c.restore();
    dialText(c, s, [['N', 0], ['E', Math.PI / 2], ['S', Math.PI], ['W', -Math.PI / 2]], 0.44, '#1a1a1a', 0.07);
  }, 45), roughness: 0.4 }, 'compassFace');
  _m.marconiClock = std({ map: tex(256, (c, s) => {
    c.fillStyle = '#f1ead6'; c.beginPath(); c.arc(s / 2, s / 2, s * 0.49, 0, 7); c.fill();
    c.fillStyle = '#c0362c';
    for (const m0 of [15, 45]) { const a0 = (m0 / 60) * Math.PI * 2 - Math.PI / 2, a1 = ((m0 + 3) / 60) * Math.PI * 2 - Math.PI / 2; c.beginPath(); c.moveTo(s / 2, s / 2); c.arc(s / 2, s / 2, s * 0.46, a0, a1); c.fill(); }
    c.fillStyle = '#f1ead6'; c.beginPath(); c.arc(s / 2, s / 2, s * 0.3, 0, 7); c.fill();
    dialText(c, s, Array.from({ length: 12 }, (_, i) => [String(i || 12), (i / 12) * Math.PI * 2]), 0.38, '#1a1a1a', 0.07);
    c.strokeStyle = '#1a1a1a'; c.lineWidth = 5; c.beginPath(); c.moveTo(s / 2, s / 2); c.lineTo(s * 0.62, s * 0.35); c.stroke(); c.lineWidth = 3; c.beginPath(); c.moveTo(s / 2, s / 2); c.lineTo(s * 0.5, s * 0.14); c.stroke();
  }, 47), roughness: 0.4 }, 'marconiClock');
  return _m;
}

// ------------------------------------------------------------------ shared custom props

/** draped curtains (pair, tied back) under a carved pelmet – origin = centre of the top on the wall, front +x. o: { w, h, mat, pelmet } */
export const drapes = def('abDrapes', (o) => [o.w ?? 1.8, 0.2, o.h ?? 2.3], (p, o) => {
  const w = o.w ?? 1.8, h = o.h ?? 2.3, m = deckMats()[o.mat ?? 'drapeRed'] ?? matOf(o.mat), pm = matOf(o.pelmet ?? 'gold');
  const half = w * 0.36;
  for (const s of [-1, 1]) {
    const g = G.curtain(half, h - 0.06, 5, 0.03, 0.55, s * half * 0.32, 0, 8);
    p.add(g, m, 0.1, -0.06, s * (w / 2 - half / 2));
    p.lathe(pm, [[0, 0], [0.025, 0], [0.03, 0.04], [0.012, 0.09], [0.025, 0.14], [0, 0.16]], 0.13, -h * 0.62, s * (w / 2 - half * 0.3), 8);
  }
  p.cz(mats.brass, 0.014, w + 0.1, 0.09, -0.03, 0, 8);
  for (const s of [-1, 1]) p.s(mats.brass, 0.028, 0.09, -0.03, s * (w / 2 + 0.06));
  // pelmet with swagged valance
  p.bb(pm, 0.12, 0.08, w + 0.16, 0.06, -0.08, 0, 0.01);
  const sw = []; for (let i = 0; i <= 16; i++) { const t = i / 16; sw.push([0.14, -0.1 - 0.1 * Math.abs(Math.sin(t * Math.PI * 3)), -w / 2 + w * t]); }
  p.loft(m, sw, sw.map(() => [0.02, 0.05]), 6);
});

/** hanging lantern on a chain (Verandah Café) – origin at the ceiling */
export const hangLamp = def('abHangLamp', [0.3, 0.3, 0.9], (p) => {
  p.lathe(mats.brass, [[0, 0], [0.07, 0], [0.06, -0.02], [0.015, -0.04], [0, -0.04]], 0, 0, 0, 10);
  for (let i = 0; i < 7; i++) p.t(mats.brass, 0.018, 0.004, 0, -0.06 - i * 0.04, 0, i % 2 ? 'x' : 'z', 8, 3); // chain down to the cap
  p.lathe(mats.brass, [[0, -0.3], [0.12, -0.3], [0.13, -0.32], [0.04, -0.36], [0, -0.37]].reverse(), 0, 0, 0, 12);
  p.rev(mats.lampGlow, [{ o: 0.09, y: -0.62 }, { o: 0.12, y: -0.5, m: 0.004 }, { o: 0.11, y: -0.38 }], { seg: 12, k: 6, capBottom: true, capTop: true }, 0, 0, 0);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; p.loft(mats.brass, [[Math.cos(a) * 0.115, -0.325, Math.sin(a) * 0.115], [Math.cos(a) * 0.11, -0.38, Math.sin(a) * 0.11], [Math.cos(a) * 0.125, -0.5, Math.sin(a) * 0.125], [Math.cos(a) * 0.095, -0.62, Math.sin(a) * 0.095]], 0.006, 3, false); }
  p.lathe(mats.brass, [[0, -0.7], [0.03, -0.66], [0.1, -0.63], [0.1, -0.61], [0, -0.61]], 0, 0, 0, 12);
});

// ------------------------------------------------------------------ statue (Artemis of Versailles, marble, on a socle)

const _geo = {};
/** Draped classical figure ("Artemis of Versailles") with origin at its feet; scale = height in metres. */
export function statue(parent, x, y, z, rotY = 0, scale = 0.9, mat = mats.marble) {
  const k = scale / 1.0, g = new THREE.Group();
  const body = (_geo.body ??= G.lathe([[0, 0], [0.1, 0], [0.1, 0.05], [0.075, 0.06], [0.085, 0.2], [0.075, 0.38], [0.06, 0.48], [0.075, 0.58], [0.07, 0.66], [0.04, 0.72], [0.022, 0.75], [0, 0.76]], 14));
  const head = (_geo.head ??= new THREE.SphereGeometry(0.045, 12, 8)), sph = (_geo.sph ??= new THREE.SphereGeometry(1, 8, 6));
  const limb = (pts, r) => G.loft(pts, r, 6);
  const add = (geo, px = 0, py = 0, pz = 0, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.scale.set(sx, sy, sz); g.add(m); return m; };
  add(body, 0, 0, 0, 1, 1, 0.82);
  add(head, 0.005, 0.8, 0); add(sph, -0.012, 0.83, 0, 0.04, 0.03, 0.035); // hair knot
  add((_geo.armR ??= limb([[0, 0.7, 0.07], [-0.03, 0.8, 0.09], [-0.05, 0.88, 0.08]], [0.02, 0.018, 0.015])));   // right arm reaching for the quiver
  add((_geo.armL ??= limb([[0, 0.7, -0.07], [0.04, 0.6, -0.1], [0.06, 0.52, -0.12]], [0.02, 0.018, 0.015]))); // left arm on the hind
  add((_geo.quiver ??= G.lathe([[0, 0], [0.018, 0], [0.02, 0.2], [0, 0.21]], 8)), -0.06, 0.62, 0.03).rotation.set(0.3, 0, 0.25);
  add((_geo.hind ??= G.loft([[-0.06, 0.32, -0.14], [0.02, 0.33, -0.14], [0.08, 0.38, -0.14], [0.1, 0.46, -0.13]], [[0.04, 0.05], [0.05, 0.06], [0.04, 0.04], [0.02, 0.02]], 8)));
  add(sph, 0.02, 0.4, 0.02, 0.09, 0.03, 0.09); // drapery fold over the hip
  for (const s of [-1, 1]) add((_geo.leg ??= G.lathe([[0, 0], [0.02, 0], [0.016, 0.1], [0, 0.12]], 6)), 0.03, 0.05, s * 0.035);
  const socle = (_geo.socle ??= G.lathe([[0, 0], [0.13, 0], [0.13, 0.02], [0.11, 0.03], [0.1, 0.09], [0.115, 0.1], [0, 0.1]], 16));
  add(socle, 0, -0.1, 0).material = mats.marble;
  g.children.forEach((m) => { m.position.multiplyScalar(k); m.scale.multiplyScalar(k); });
  g.position.set(x, y + 0.1 * k, z); g.rotation.y = rotY;
  parent.add(g);
  return g;
}
