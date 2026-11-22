// Shared helpers of the deck modules 'boat' and 'A': world-coordinate detailing on top of the interior kit,
// exterior window spans (to line the exterior walls of hero rooms), a few picture materials and a statue.
import * as THREE from 'three';
import { mats, canvasTexture } from '../core/materials.js';
import { EXT_DOORS, A_HOUSE, BOAT_HOUSES } from '../core/constants.js';
import { matOf, faceDir, armchair, chairDining, tableRound, tableRect, pilaster, sconce } from '../interior/kit.js';

/** rotY that makes a prop's front (+x) face the given ship direction */
export const ROT = { fwd: 0, aft: Math.PI, port: Math.PI / 2, stbd: -Math.PI / 2 };
const DIRV = { fwd: [1, 0], aft: [-1, 0], port: [0, -1], stbd: [0, 1] };
const SIDES = ['fwd', 'aft', 'port', 'stbd'];
/** all wall sides except the given ones (walls owned by the exterior module are never duplicated) */
export const sidesBut = (...omit) => SIDES.filter((s) => !omit.includes(s));

/** wall face descriptors: line along x at z = c (normal n = ±1 along z) / line along z at x = c (normal along x) */
export const wx = (c, n) => ({ axis: 'x', c, n });
export const wz = (c, n) => ({ axis: 'z', c, n });

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

// ------------------------------------------------------------------ furnishing in world coordinates (with the kit's checks)

/** ctx.put with world position and world facing ('fwd' | 'aft' | 'port' | 'stbd'); returns true if placed. */
export function wput(ctx, prop, x, z, dir = 'fwd', opts) {
  const dx = x - ctx.o[0], dz = z - ctx.o[1];
  const u = dx * ctx.U[0] + dz * ctx.U[1], v = dx * ctx.V[0] + dz * ctx.V[1];
  const w = DIRV[dir], du = w[0] * ctx.U[0] + w[1] * ctx.U[1], dv = w[0] * ctx.V[0] + w[1] * ctx.V[1];
  const ld = dv > 0.5 ? 'in' : dv < -0.5 ? 'out' : du > 0.5 ? 'right' : 'left';
  const ok = ctx.put(prop, u, v, ld, opts);
  if (!ok && globalThis.DECK_DEBUG) console.log(`[wput] ${ctx.room.id}: ${prop.userData.prop} at ${x.toFixed(2)}, ${z.toFixed(2)} refused`);
  return ok;
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
/** table with chairs around it through the kit's checks. o: { r, n, kind, mat, tmat, dist, a0, rect, w, d, dining, lamp } */
export function group(ctx, x, z, o = {}) {
  const r = o.r ?? 0.45;
  const table = o.rect ? tableRect({ w: o.w ?? 1.0, d: o.d ?? 0.8, mat: o.tmat ?? 'mahogany', cloth: o.cloth }) : tableRound({ r, mat: o.tmat ?? 'mahogany', lamp: o.lamp, cloth: o.cloth });
  if (!wput(ctx, table, x, z, 'fwd')) return false;
  const n = o.n ?? 4, dist = o.dist ?? (o.rect ? Math.max(o.w ?? 1.0, o.d ?? 0.8) / 2 + 0.45 : r + 0.55);
  for (let i = 0; i < n; i++) {
    const a = (o.a0 ?? 0) + (i * Math.PI * 2) / n, cx = Math.round(Math.cos(a) * 1e6) / 1e6, cz = Math.round(Math.sin(a) * 1e6) / 1e6;
    const chair = o.dining ? chairDining({ cls: 'first', seat: o.mat }) : armchair({ kind: o.kind ?? 'uph', mat: o.mat });
    const px = x + cx * dist, pz = z + cz * dist;
    const dir = Math.abs(cx) > Math.abs(cz) ? (cx > 0 ? 'aft' : 'fwd') : (cz > 0 ? 'port' : 'stbd');
    if (Math.abs(cx) > 0.2 && Math.abs(cz) > 0.2) { // diagonal: free rotation, checked with a small square
      const dx = px - ctx.o[0], dz = pz - ctx.o[1];
      const u = dx * ctx.U[0] + dz * ctx.U[1], v = dx * ctx.V[0] + dz * ctx.V[1];
      if (!ctx.free(u, v, 0.6, 0.6)) continue;
      const ch = o.dining ? chairDining({ cls: 'first', seat: o.mat }) : armchair({ kind: o.kind ?? 'uph', mat: o.mat });
      ctx.plan.prop(ch, px, pz, faceDir(-cx, -cz), { collide: false });
      ctx.occupied.push({ x0: px - 0.3, x1: px + 0.3, z0: pz - 0.3, z1: pz + 0.3 });
    } else wput(ctx, chair, px, pz, dir, { collide: false });
  }
  return true;
}

// ------------------------------------------------------------------ world-coordinate detailing (no checks – walls, ceilings)

/** Detail helper for hero rooms. `ctx` is the kit's FurnishCtx (or anything with .plan). */
export function detailer(ctx) {
  const plan = ctx.plan, world = ctx.world ?? plan.world, b = plan.batch, Y = plan.y, H = plan.h;
  const d = {
    plan, world, b, Y, H, top: Y + H,
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
    sconces(w, list, h = 1.85) {
      list.forEach((p, i) => {
        d.wmount(sconce(), w, p, h);
        if (i % 2 === 0) world.addLamp({ x: w.axis === 'x' ? p : w.c + w.n * 0.3, y: Y + h, z: w.axis === 'x' ? w.c + w.n * 0.3 : p, intensity: 0.5 });
      });
    },
    /** pilasters at the given positions along wall w */
    pilasters(w, list, o = {}) {
      for (const p of list) {
        const c = w.c + w.n * 0.04;
        plan.prop(pilaster({ h: o.h ?? H, w: o.w ?? 0.32, mat: o.mat ?? 'oak', capital: o.capital ?? 'gold' }), w.axis === 'x' ? p : c, w.axis === 'x' ? c : p, d.wrot(w), { collide: false });
      }
    },
    /**
     * Row of raised panels along a wall from a..e (skipping the intervals in o.skip), optional ornament on each panel.
     * o: { mat, orn, y0, y1, pitch, gap, t, skip: [[s, e], ...], inlay, frame }
     */
    panels(w, a, e, o = {}) {
      const n = Math.max(1, Math.round((e - a) / (o.pitch ?? 1.3))), p = (e - a) / n, gap = o.gap ?? 0.14, t = o.t ?? 0.025;
      const y0 = o.y0 ?? 1.08, y1 = o.y1 ?? H - 0.28;
      for (let i = 0; i < n; i++) {
        const s = a + i * p + gap / 2, q = a + (i + 1) * p - gap / 2, m = (s + q) / 2;
        if ((o.skip ?? []).some(([u, v]) => q > u - 0.02 && s < v + 0.02)) continue;
        d.wbox(o.mat ?? 'oakPanel', w, s, q, y0, y1, t);
        if (o.frame) { d.wbox(o.frame, w, s, q, y1 - 0.03, y1, 0.012, t); d.wbox(o.frame, w, s, q, y0, y0 + 0.03, 0.012, t); d.wbox(o.frame, w, s, s + 0.03, y0, y1, 0.012, t); d.wbox(o.frame, w, q - 0.03, q, y0, y1, 0.012, t); }
        if (o.orn) { d.wbox(o.orn, w, m - 0.16, m + 0.16, y1 - 0.2, y1 - 0.13, 0.012, t); d.wbox(o.orn, w, m - 0.05, m + 0.05, y1 - 0.27, y1 - 0.06, 0.012, t); }
        if (o.inlay) { d.wbox(o.inlay, w, m - 0.05, m + 0.05, (y0 + y1) / 2 - 0.16, (y0 + y1) / 2 + 0.16, 0.01, t); d.wbox(o.inlay, w, m - 0.16, m + 0.16, (y0 + y1) / 2 - 0.05, (y0 + y1) / 2 + 0.05, 0.01, t); }
      }
    },
    /** continuous strip (cornice bead, dado rail, wainscot) along a wall, interrupted by skip intervals */
    strip(mat, w, a, e, y0, y1, t = 0.03, skip = []) {
      let cur = a;
      for (const [u, v] of [...skip].sort((p, q) => p[0] - q[0])) {
        if (v <= cur || u >= e) continue;
        if (u - cur > 0.05) d.wbox(mat, w, cur, Math.min(u, e), y0, y1, t);
        cur = Math.max(cur, v);
      }
      if (e - cur > 0.05) d.wbox(mat, w, cur, e, y0, y1, t);
    },
    /**
     * Line an exterior wall (owned by the exterior module) between a..e: wainscot below the sill, lining between the
     * windows, frieze above, cornice; window and door intervals stay open. o: { wall, wainscot, cornice, sill, head, wins, doors, t, panels }
     */
    lineExterior(w, a, e, o = {}) {
      const wins = (o.wins ?? []).filter(([p, q]) => q > a && p < e), doors = (o.doors ?? []).filter(([p, q]) => q > a && p < e);
      const sill = o.sill ?? 0.9, head = o.head ?? 2.25, t = o.t ?? 0.03;
      const holes = [...wins.map(([p, q]) => [p - 0.06, q + 0.06]), ...doors.map(([p, q]) => [p - 0.07, q + 0.07])];
      d.strip(o.wainscot ?? o.wall, w, a, e, 0, sill - 0.02, t, doors.map(([p, q]) => [p - 0.07, q + 0.07]));
      d.strip(o.wall, w, a, e, sill - 0.02, head + 0.02, t, holes);
      d.strip(o.wall, w, a, e, head + 0.02, H, t);
      if (o.cornice) d.strip(o.cornice, w, a, e, H - 0.12, H, t + 0.025);
      if (o.dado) d.strip(o.dado, w, a, e, sill - 0.06, sill, t + 0.02, doors.map(([p, q]) => [p - 0.07, q + 0.07]));
      if (o.panels) d.panels(w, a, e, { ...o.panels, skip: [...holes, ...(o.panels.skip ?? [])], t: 0.02 + (o.panels.t ?? 0.02), y0: o.panels.y0 ?? 0.12, y1: o.panels.y1 ?? sill - 0.14 });
      // window reveals (frame strips around each opening)
      if (o.reveal) for (const [p, q] of wins) {
        d.wbox(o.reveal, w, p - 0.06, p, sill, head, t + 0.02); d.wbox(o.reveal, w, q, q + 0.06, sill, head, t + 0.02);
        d.wbox(o.reveal, w, p - 0.06, q + 0.06, sill - 0.05, sill, t + 0.06); d.wbox(o.reveal, w, p - 0.06, q + 0.06, head, head + 0.05, t + 0.02);
      }
    },
    /** coffered ceiling: beams along both axes below the ceiling, optional bead below */
    coffer(x0, x1, z0, z1, o = {}) {
      const mat = matOf(o.mat ?? 'plaster'), dp = o.depth ?? 0.12, bw = o.w ?? 0.22, top = Y + H;
      const nx = Math.max(1, Math.round((x1 - x0) / (o.pitchX ?? 3.3))), nz = Math.max(1, Math.round((z1 - z0) / (o.pitchZ ?? 3.3)));
      const skip = o.skip ?? [];
      const cut = (r) => !skip.some((s) => r.x0 < s.x1 && r.x1 > s.x0 && r.z0 < s.z1 && r.z1 > s.z0);
      for (let i = 0; i <= nx; i++) {
        const x = x0 + ((x1 - x0) * i) / nx;
        if (!cut({ x0: x - bw / 2, x1: x + bw / 2, z0, z1 })) continue;
        b.box(mat, x - bw / 2, top - dp, z0, x + bw / 2, top, z1, 'xXy');
        if (o.bead) b.flat(matOf(o.bead), x - 0.03, x + 0.03, z0, z1, top - dp - 0.003, true);
      }
      for (let j = 0; j <= nz; j++) {
        const z = z0 + ((z1 - z0) * j) / nz;
        if (!cut({ x0, x1, z0: z - bw / 2, z1: z + bw / 2 })) continue;
        b.box(mat, x0, top - dp, z - bw / 2, x1, top, z + bw / 2, 'zZy');
        if (o.bead) b.flat(matOf(o.bead), x0, x1, z - 0.03, z + 0.03, top - dp - 0.003, true);
      }
    },
    lamp(x, z, style = 'bowl', o) { plan.lamp(x, z, style, o); },
    glow(x, z, h, color = 0xff8a3a, intensity = 0.8) { world.addLamp({ x, y: Y + h, z, color, intensity }); },
  };
  return d;
}

// ------------------------------------------------------------------ materials (created once, lazily)

const _m = {};
function std(o) { return new THREE.MeshStandardMaterial(o); }
function lcg(seed) { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }

/** Picture / special materials shared by both decks: worldMap, plymouth, stained, chart, ivyPanel */
export function deckMats() {
  if (_m.ready) return _m;
  _m.ready = true;
  const tex = (size, draw, seed) => { const t = canvasTexture(size, 1, draw, seed); t.repeat.set(1, 1); return t; };
  // White Star Line route map in the gymnasium
  _m.worldMap = std({ map: tex(512, (c, s) => {
    const r = lcg(5);
    c.fillStyle = '#d9ccA4'; c.fillRect(0, 0, s, s);
    c.fillStyle = '#9fb7b8'; c.fillRect(s * 0.04, s * 0.18, s * 0.92, s * 0.64);
    c.fillStyle = '#cdb98a';
    const blob = (x, y, rx, ry) => { c.beginPath(); for (let i = 0; i <= 18; i++) { const a = (i / 18) * Math.PI * 2, k = 0.75 + r() * 0.35; c.lineTo(s * (x + Math.cos(a) * rx * k), s * (y + Math.sin(a) * ry * k)); } c.fill(); };
    blob(0.2, 0.36, 0.13, 0.12); blob(0.27, 0.62, 0.07, 0.14); blob(0.52, 0.33, 0.07, 0.09); blob(0.54, 0.58, 0.08, 0.15); blob(0.74, 0.37, 0.17, 0.12); blob(0.86, 0.7, 0.06, 0.05);
    c.strokeStyle = '#a3241c'; c.lineWidth = 3; c.setLineDash([8, 5]);
    for (const [a, b2] of [[[0.5, 0.31], [0.29, 0.4]], [[0.5, 0.31], [0.56, 0.75]], [[0.5, 0.31], [0.86, 0.69]], [[0.29, 0.4], [0.31, 0.5]]]) { c.beginPath(); c.moveTo(a[0] * s, a[1] * s); c.quadraticCurveTo((a[0] + b2[0]) / 2 * s, (Math.min(a[1], b2[1]) - 0.05) * s, b2[0] * s, b2[1] * s); c.stroke(); }
    c.setLineDash([]); c.strokeStyle = '#5b4a2a'; c.lineWidth = 10; c.strokeRect(5, 5, s - 10, s - 10);
    c.fillStyle = '#3a2c18'; c.font = `bold ${Math.round(s * 0.06)}px Georgia, serif`; c.textAlign = 'center'; c.fillText('WHITE STAR LINE', s / 2, s * 0.12);
    c.font = `${Math.round(s * 0.035)}px Georgia, serif`; c.fillText('ROYAL & UNITED STATES MAIL STEAMERS', s / 2, s * 0.9);
  }, 5), roughness: 0.8 });
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
    c.strokeStyle = '#6b4a1e'; c.lineWidth = 26; c.strokeRect(13, 13, s - 26, s - 26); c.strokeStyle = '#d9b45a'; c.lineWidth = 6; c.strokeRect(26, 26, s - 52, s - 52);
  }, 9), roughness: 0.7 });
  // leaded stained glass (smoking room windows), lit from behind
  const sg = tex(256, (c, s) => {
    const r = lcg(13), cols = ['#b8862e', '#3f6e4a', '#a03a2c', '#d8c48a', '#3a5a8a', '#e6d9b0'];
    c.fillStyle = '#d8c48a'; c.fillRect(0, 0, s, s);
    const n = 4, q = s / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { c.fillStyle = cols[Math.floor(r() * cols.length)]; c.fillRect(i * q, j * q, q, q); }
    c.fillStyle = '#e8dcae'; c.beginPath(); c.arc(s / 2, s / 2, s * 0.3, 0, 6.3); c.fill();
    c.fillStyle = '#a03a2c'; c.beginPath(); c.arc(s / 2, s / 2, s * 0.13, 0, 6.3); c.fill();
    c.strokeStyle = '#1c1a16'; c.lineWidth = 5;
    for (let i = 0; i <= n; i++) { c.beginPath(); c.moveTo(i * q, 0); c.lineTo(i * q, s); c.stroke(); c.beginPath(); c.moveTo(0, i * q); c.lineTo(s, i * q); c.stroke(); }
    c.beginPath(); c.arc(s / 2, s / 2, s * 0.3, 0, 6.3); c.stroke(); c.beginPath(); c.arc(s / 2, s / 2, s * 0.13, 0, 6.3); c.stroke();
  }, 13);
  _m.stained = std({ map: sg, emissive: 0xffffff, emissiveMap: sg, emissiveIntensity: 0.55, roughness: 0.3 });
  // nautical chart (chart room / wheelhouse table top, framed on walls)
  _m.chart = std({ map: tex(256, (c, s) => {
    const r = lcg(21);
    c.fillStyle = '#e9e1c6'; c.fillRect(0, 0, s, s);
    c.strokeStyle = 'rgba(70,90,110,0.5)'; c.lineWidth = 1;
    for (let i = 0; i < s; i += 32) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, s); c.stroke(); c.beginPath(); c.moveTo(0, i); c.lineTo(s, i); c.stroke(); }
    c.fillStyle = '#d8c79a'; c.beginPath(); c.moveTo(0, s * 0.7); for (let i = 0; i <= 10; i++) c.lineTo(i * s / 10, s * (0.7 + r() * 0.12)); c.lineTo(s, s); c.lineTo(0, s); c.fill();
    c.strokeStyle = '#8a2a20'; c.lineWidth = 2; c.beginPath(); c.moveTo(s * 0.9, s * 0.15); c.lineTo(s * 0.1, s * 0.55); c.stroke();
    c.fillStyle = '#3a4a5a'; for (let i = 0; i < 40; i++) c.fillRect(r() * s, r() * s * 0.65, 2, 2);
  }, 21), roughness: 0.9 });
  return _m;
}

// ------------------------------------------------------------------ statue (marble figure on a plinth)

const _geo = {};
/** Classical marble figure ("Artemis") with origin at its feet; scale = height in metres. Added to the given group. */
export function statue(parent, x, y, z, rotY = 0, scale = 0.9, mat = mats.marble) {
  const sph = (_geo.sph ??= new THREE.SphereGeometry(1, 8, 6)), cyl = (_geo.cyl ??= new THREE.CylinderGeometry(1, 1, 1, 8));
  const g = new THREE.Group(), k = scale / 1.0;
  const add = (geo, sx, sy, sz, px, py, pz, rz = 0, rx = 0) => { const m = new THREE.Mesh(geo, mat); m.scale.set(sx * k, sy * k, sz * k); m.position.set(px * k, py * k, pz * k); m.rotation.set(rx, 0, rz); g.add(m); };
  add(cyl, 0.16, 0.05, 0.16, 0, 0.025, 0);                // base
  add(cyl, 0.11, 0.45, 0.09, 0, 0.28, 0);                 // drapery (skirt)
  add(sph, 0.08, 0.15, 0.065, 0, 0.6, 0);                 // torso
  add(sph, 0.045, 0.055, 0.045, 0, 0.8, 0);               // head
  add(cyl, 0.018, 0.25, 0.018, 0.02, 0.62, 0.1, 0.9);     // arm reaching back (quiver)
  add(cyl, 0.018, 0.22, 0.018, 0.03, 0.55, -0.1, -0.4);   // arm with the hind
  add(sph, 0.09, 0.05, 0.04, -0.05, 0.3, -0.13);          // hind
  g.position.set(x, y, z); g.rotation.y = rotY;
  parent.add(g);
  return g;
}
