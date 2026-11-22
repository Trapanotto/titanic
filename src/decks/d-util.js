// D deck – shared helpers for the hero rooms: instanced furniture fields, leaded windows, coffered ceilings,
// world-coordinate furnishing on top of the kit's FurnishCtx. Materials are created once at module level.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mats, canvasTexture } from '../core/materials.js';
import { ZONE_LEN } from '../core/constants.js';
import { kitMats, rectMinus } from '../interior/kit.js';

// ---------------------------------------------------------------- module-level materials (created once)

const leadTex = canvasTexture(256, 1, (ctx, s) => {
  ctx.fillStyle = '#efe6c4'; ctx.fillRect(0, 0, s, s);
  // diamond leading
  ctx.strokeStyle = 'rgba(60,55,45,0.85)'; ctx.lineWidth = 3;
  const q = s / 6;
  for (let i = -6; i <= 12; i++) { ctx.beginPath(); ctx.moveTo(i * q, 0); ctx.lineTo(i * q + s / 2, s); ctx.moveTo(i * q, 0); ctx.lineTo(i * q - s / 2, s); ctx.stroke(); }
  // coloured cartouche in the middle
  ctx.fillStyle = 'rgba(190,150,60,0.75)'; ctx.beginPath(); ctx.ellipse(s / 2, s / 2, s * 0.16, s * 0.24, 0, 0, 6.3); ctx.fill();
  ctx.fillStyle = 'rgba(120,40,40,0.7)'; ctx.beginPath(); ctx.ellipse(s / 2, s / 2, s * 0.08, s * 0.13, 0, 0, 6.3); ctx.fill();
  ctx.strokeStyle = 'rgba(60,55,45,0.9)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(s / 2, s / 2, s * 0.16, s * 0.24, 0, 0, 6.3); ctx.stroke();
  ctx.lineWidth = 8; ctx.strokeRect(4, 4, s - 8, s - 8);
}, 301);
leadTex.repeat.set(1, 1);
/** Leaded glass of the inner windows of the saloon and reception room (softly lit from behind, day and night). */
export const leadGlass = new THREE.MeshStandardMaterial({ map: leadTex, emissive: 0xfff1cf, emissiveMap: leadTex, emissiveIntensity: 0.7, roughness: 0.3 });
leadGlass.name = 'd_leadGlass';

const tapTex = canvasTexture(512, 1, (ctx, s, r) => {
  // stylised Aubusson hunting tapestry ("Chasse de Guise"): forest, riders, hounds, flower border
  ctx.fillStyle = '#5d6b4a'; ctx.fillRect(0, 0, s, s);
  ctx.fillStyle = '#8a9a78'; ctx.fillRect(0, 0, s, s * 0.42);
  for (let i = 0; i < 40; i++) { ctx.fillStyle = ['#3d5234', '#4f6a3e', '#2f4630', '#6b7d4a'][i % 4]; ctx.beginPath(); ctx.ellipse(r() * s, s * (0.2 + r() * 0.35), 26 + r() * 40, 34 + r() * 50, 0, 0, 6.3); ctx.fill(); }
  for (let i = 0; i < 9; i++) { ctx.fillStyle = '#4a3524'; ctx.fillRect(s * (0.08 + i * 0.105), s * 0.3, 7, s * 0.4); }
  ctx.fillStyle = '#77804f'; ctx.fillRect(0, s * 0.68, s, s * 0.32);
  const rider = (x, c) => {
    ctx.fillStyle = '#6a4a2e'; ctx.beginPath(); ctx.ellipse(x, s * 0.66, 46, 20, 0, 0, 6.3); ctx.fill(); // horse
    ctx.fillRect(x - 34, s * 0.66, 8, 40); ctx.fillRect(x + 26, s * 0.66, 8, 40); ctx.beginPath(); ctx.ellipse(x + 48, s * 0.61, 16, 9, -0.6, 0, 6.3); ctx.fill();
    ctx.fillStyle = c; ctx.fillRect(x - 9, s * 0.54, 18, 34); ctx.fillStyle = '#e2c7a0'; ctx.beginPath(); ctx.arc(x, s * 0.52, 9, 0, 6.3); ctx.fill();
  };
  rider(s * 0.3, '#8a2f2a'); rider(s * 0.62, '#2f4a7a');
  ctx.fillStyle = '#d9cfae'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(s * (0.42 + i * 0.1), s * 0.8, 16, 7, 0, 0, 6.3); ctx.fill(); } // hounds
  ctx.strokeStyle = '#7a2d26'; ctx.lineWidth = 34; ctx.strokeRect(17, 17, s - 34, s - 34);
  for (let i = 0; i < 44; i++) { ctx.fillStyle = i % 2 ? '#d9b253' : '#cfd3b0'; const t = i / 44, p = t * 4, e = Math.floor(p), f = p - e; const x = e === 0 ? f : e === 1 ? 1 : e === 2 ? 1 - f : 0, y = e === 0 ? 0 : e === 1 ? f : e === 2 ? 1 : 1 - f; ctx.beginPath(); ctx.arc(17 + x * (s - 34), 17 + y * (s - 34), 8, 0, 6.3); ctx.fill(); }
}, 303);
tapTex.repeat.set(1, 1);
export const tapestryMat = new THREE.MeshStandardMaterial({ map: tapTex, roughness: 1 });
tapestryMat.name = 'd_tapestry';

// ---------------------------------------------------------------- geometry helpers

const FACES = ['X', 'x', 'Y', 'y', 'Z', 'z'];
/** Box geometry (size sx,sy,sz centred at x,y,z) without the faces listed in `skip` ('X','x','Y','y','Z','z'). */
export function boxG(sx, sy, sz, x = 0, y = 0, z = 0, skip = '') {
  const g = new THREE.BoxGeometry(sx, sy, sz), idx = Array.from(g.index.array), keep = [];
  for (let f = 0; f < 6; f++) if (!skip.includes(FACES[f])) keep.push(...idx.slice(f * 6, f * 6 + 6));
  g.setIndex(keep); g.clearGroups(); g.translate(x, y, z);
  return g;
}
export const merge = (list) => mergeGeometries(list, false);

/** Collects instances per (kind, zone) and creates one InstancedMesh each on flush(). Front of every kind faces +x. */
export class InstField {
  constructor(world, deck) { this.world = world; this.deck = deck; this.defs = new Map(); this.sets = new Map(); this.count = {}; }
  define(name, geo, mat) { this.defs.set(name, { geo, mat }); return this; }
  add(name, x, y, z, rotY = 0, sx = 1, sy = 1, sz = 1) {
    const zi = Math.floor(x / ZONE_LEN), k = name + '|' + zi;
    let s = this.sets.get(k); if (!s) this.sets.set(k, (s = { name, zi, list: [] }));
    s.list.push([x, y, z, rotY, sx, sy, sz]);
    this.count[name] = (this.count[name] ?? 0) + 1;
  }
  flush() {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    for (const s of this.sets.values()) {
      const d = this.defs.get(s.name), im = new THREE.InstancedMesh(d.geo, d.mat, s.list.length);
      s.list.forEach((a, i) => { p.set(a[0], a[1], a[2]); q.setFromAxisAngle(up, a[3]); sc.set(a[4], a[5], a[6]); m.compose(p, q, sc); im.setMatrixAt(i, m); });
      im.instanceMatrix.needsUpdate = true;
      im.computeBoundingBox(); im.computeBoundingSphere();
      im.receiveShadow = true; im.userData.noMerge = true;
      this.world.zone(this.deck, s.zi * ZONE_LEN + 1).add(im);
    }
    this.sets.clear();
  }
}

/** Low-poly dining chair split into frame + upholstery (front faces +x, origin on the floor). */
export function chairGeos() {
  const frame = merge([
    boxG(0.04, 0.43, 0.04, 0.19, 0.215, 0.19, 'Yy'), boxG(0.04, 0.43, 0.04, 0.19, 0.215, -0.19, 'Yy'),
    boxG(0.04, 0.96, 0.04, -0.2, 0.48, 0.19, 'y'), boxG(0.04, 0.96, 0.04, -0.2, 0.48, -0.19, 'y'),
    boxG(0.44, 0.05, 0.44, 0, 0.43, 0, 'y'), boxG(0.03, 0.06, 0.36, -0.2, 0.92, 0, ''),
  ]);
  const pad = merge([boxG(0.4, 0.04, 0.4, 0.01, 0.475, 0, 'y'), boxG(0.035, 0.34, 0.34, -0.2, 0.71, 0, '')]);
  return { frame, pad };
}
/** Floor-fixed swivel chair of the 2nd class saloon (iron pedestal, mahogany seat) + red leather pads. */
export function swivelGeos() {
  const frame = merge([
    boxG(0.3, 0.03, 0.3, 0, 0.015, 0, 'y'), boxG(0.07, 0.4, 0.07, 0, 0.23, 0, 'Yy'),
    boxG(0.44, 0.05, 0.44, 0, 0.445, 0, ''), boxG(0.04, 0.44, 0.42, -0.21, 0.69, 0, 'y'),
  ]);
  const pad = merge([boxG(0.38, 0.04, 0.38, 0.01, 0.49, 0, 'y'), boxG(0.03, 0.28, 0.32, -0.18, 0.72, 0, 'xy')]);
  return { frame, pad };
}
export const unitCloth = () => boxG(1, 1, 1, 0, 0, 0, 'y');
export const unitLeg = () => boxG(1, 1, 1, 0, 0.5, 0, 'Yy');
export function plateGeo() { const g = new THREE.CircleGeometry(0.12, 8); g.rotateX(-Math.PI / 2); return g; }
export function lampGeos() {
  const shade = new THREE.CylinderGeometry(0.045, 0.1, 0.11, 6, 1, true); shade.translate(0, 0.235, 0);
  const stem = merge([boxG(0.025, 0.2, 0.025, 0, 0.1, 0, 'Yy'), boxG(0.09, 0.02, 0.09, 0, 0.01, 0, 'y')]);
  return { shade, stem };
}

// ---------------------------------------------------------------- room decoration

/**
 * Inner leaded window in front of the hull lining at station x on side `s` (−1 port / +1 starboard).
 * w × (y0..y1) m, lit from behind. ~40 triangles.
 */
export function leadedWindow(plan, x, s, { w = 1.7, y0 = 0.85, y1 = 2.2, inset = 0.07, frame = mats.paintWhite } = {}) {
  const b = plan.batch, Y = plan.y, z = s * (Math.min(plan.halfWidth(x - w / 2), plan.halfWidth(x + w / 2)) - inset);
  const xa = x - w / 2, xb = x + w / 2, n = Math.max(1, Math.round(w / 0.85)), zi = z - s * 0.012;
  b.box(frame, xa - 0.07, Y + y0 - 0.07, z, xb + 0.07, Y + y1 + 0.07, z - s * 0.01, s > 0 ? 'z' : 'Z');
  for (let i = 0; i < n; i++) {
    const a = xa + (w * i) / n + 0.03, c = xa + (w * (i + 1)) / n - 0.03;
    b.poly(leadGlass, [[a, Y + y0, zi], [c, Y + y0, zi], [c, Y + y1, zi], [a, Y + y1, zi]], [0, 0, -s], [[0, 0], [1, 0], [1, 1], [0, 1]]);
  }
  // moulded frame: sill + head + jambs
  const f = s > 0 ? 'xXyYz' : 'xXyYZ';
  b.box(frame, xa - 0.1, Y + y0 - 0.1, z, xb + 0.1, Y + y0 - 0.03, z - s * 0.07, f);
  b.box(frame, xa - 0.1, Y + y1 + 0.03, z, xb + 0.1, Y + y1 + 0.12, z - s * 0.06, f);
  for (const xx of [xa - 0.07, xb + 0.01]) b.box(frame, xx, Y + y0 - 0.03, z, xx + 0.06, Y + y1 + 0.03, z - s * 0.04, f);
}

/** Moulded ceiling: beams (w × d) hanging from the ceiling on a grid, interrupted at `avoid` rectangles. */
export function coffers(plan, x0, x1, z0, z1, { px = 2.7, pz = 2.8, w = 0.18, d = 0.1, mat = mats.paintWhite, avoid = [], phaseX = 0 } = {}) {
  const b = plan.batch, top = plan.y + plan.h, holes = avoid.map((a) => ({ x0: a.x0 - 0.05, x1: a.x1 + 0.05, z0: a.z0 - 0.05, z1: a.z1 + 0.05 }));
  const strip = (r) => { for (const q of rectMinus(r, holes)) if (q.x1 - q.x0 > 0.05 && q.z1 - q.z0 > 0.05) b.box(mat, q.x0, top - d, q.z0, q.x1, top, q.z1, 'xXyzZ'); };
  const nx = Math.max(1, Math.round((x1 - x0) / px)), nz = Math.max(1, Math.round((z1 - z0) / pz));
  for (let i = 0; i <= nx; i++) { const x = Math.min(x1 - w / 2, Math.max(x0 + w / 2, x0 + phaseX + ((x1 - x0) * i) / nx)); strip({ x0: x - w / 2, x1: x + w / 2, z0, z1 }); }
  for (let j = 1; j < nz; j++) { const z = z0 + ((z1 - z0) * j) / nz; strip({ x0, x1, z0: z - w / 2, z1: z + w / 2 }); }
}

/** Wainscot strip in front of the hull lining (rooms whose panelling differs from the deck's lining). */
export function hullWainscot(plan, x0, x1, mat, { h = 1.15, rail = mats.oak } = {}) {
  const b = plan.batch, Y = plan.y;
  for (const s of [-1, 1]) {
    for (let x = x0; x < x1 - 1e-6; x += 2) {
      const xe = Math.min(x1, x + 2), z = s * (Math.min(plan.halfWidth(x), plan.halfWidth(xe)) - 0.015);
      b.wallX(mat, z, x, xe, Y, Y + h, -s);
      b.box(rail, x, Y + h, z, xe, Y + h + 0.06, z - s * 0.03, s > 0 ? 'xXyYz' : 'xXyYZ');
    }
  }
}

// ---------------------------------------------------------------- world-coordinate furnishing

const DIR = { fwd: [1, 0], aft: [-1, 0], port: [0, -1], stbd: [0, 1] };
/**
 * Wraps a FurnishCtx so props can be placed in WORLD coordinates with world directions ('fwd'|'aft'|'port'|'stbd' =
 * where the front of the prop points). All kit checks (doors, casings, stair keep-outs, other props) stay active.
 */
export function wctx(ctx) {
  const { U, V, o } = ctx;
  const loc = (x, z) => [(x - o[0]) * U[0] + (z - o[1]) * U[1], (x - o[0]) * V[0] + (z - o[1]) * V[1]];
  const dirName = (d) => { const [dx, dz] = DIR[d] ?? DIR.fwd, du = dx * U[0] + dz * U[1], dv = dx * V[0] + dz * V[1]; return Math.abs(du) > 0.5 ? (du > 0 ? 'right' : 'left') : (dv > 0 ? 'in' : 'out'); };
  const ext = (ex, ez) => (Math.abs(U[0]) > 0.5 ? [ex, ez] : [ez, ex]);
  return {
    ctx,
    put(prop, x, z, dir = 'fwd', opts) { const [u, v] = loc(x, z); return ctx.put(prop, u, v, dirName(dir), opts); },
    /** is the world rectangle centre (x,z), size ex × ez free? */
    free(x, z, ex, ez) { const [u, v] = loc(x, z), [eu, ev] = ext(ex, ez); return ctx.free(u, v, eu, ev); },
    /** reserve a world rectangle (optionally with a collider of height h) */
    reserve(x, z, ex, ez, h = 0) {
      const q = { x0: x - ex / 2, x1: x + ex / 2, z0: z - ez / 2, z1: z + ez / 2 };
      ctx.occupied.push(q);
      if (h > 0) ctx.world.addCollider(q.x0, ctx.y, q.z0, q.x1, ctx.y + h, q.z1);
    },
    /** wall prop (sconce, mirror, clock) at world position, front pointing `dir` */
    mount(prop, x, z, dir, hgt = 1.7) { prop.position.set(x, ctx.y + hgt, z); const [dx, dz] = DIR[dir]; prop.rotation.y = Math.atan2(-dz, dx); ctx.plan.zone(x).add(prop); },
  };
}

/** A round table with n wicker / upholstered armchairs around it (world coordinates). */
export function seatGroup(w, table, chair, x, z, r = 0.85, sides = ['fwd', 'aft', 'port', 'stbd']) {
  if (!w.put(table, x, z, 'fwd')) return false;
  for (const s of sides) {
    const [dx, dz] = DIR[s];
    w.put(chair(), x + dx * r, z + dz * r, s === 'fwd' ? 'aft' : s === 'aft' ? 'fwd' : s === 'port' ? 'stbd' : 'port', { collide: false });
  }
  return true;
}
export { kitMats };
