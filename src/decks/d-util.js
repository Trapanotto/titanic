// D deck – shared helpers for the hero rooms: instanced furniture fields, Jacobean panelling runs, strapwork ceilings,
// leaded windows with curtains, world-coordinate furnishing on top of the kit's FurnishCtx.
// Materials are created once at module level; everything else uses mats.* / kitMats.*.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mats, canvasTexture } from '../core/materials.js';
import { ZONE_LEN } from '../core/constants.js';
import { kitMats, rectMinus } from '../interior/kit.js';
import * as G from '../interior/geom.js';

// ---------------------------------------------------------------- module-level materials (created once)

const leadTex = canvasTexture(256, 1, (ctx, s) => {
  // pale amber cathedral glass with diamond quarries and a small heraldic roundel
  const g = ctx.createLinearGradient(0, 0, 0, s); g.addColorStop(0, '#f6eccb'); g.addColorStop(1, '#e8d7a8');
  ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  const q = s / 6;
  for (let i = 0; i < 6; i++) for (let j = 0; j < 12; j++) { ctx.fillStyle = (i + j) % 3 ? 'rgba(255,250,230,0.25)' : 'rgba(210,180,120,0.18)'; ctx.fillRect(i * q, j * (s / 12), q, s / 12); }
  ctx.strokeStyle = 'rgba(55,50,42,0.9)'; ctx.lineWidth = 3;
  for (let i = -6; i <= 12; i++) { ctx.beginPath(); ctx.moveTo(i * q, 0); ctx.lineTo(i * q + s / 2, s); ctx.moveTo(i * q, 0); ctx.lineTo(i * q - s / 2, s); ctx.stroke(); }
  ctx.fillStyle = 'rgba(190,150,60,0.8)'; ctx.beginPath(); ctx.ellipse(s / 2, s / 2, s * 0.16, s * 0.2, 0, 0, 6.3); ctx.fill();
  ctx.fillStyle = 'rgba(130,40,40,0.75)'; ctx.beginPath(); ctx.ellipse(s / 2, s / 2, s * 0.08, s * 0.11, 0, 0, 6.3); ctx.fill();
  ctx.fillStyle = 'rgba(60,90,140,0.6)'; for (const a of [0, 1, 2, 3]) { ctx.beginPath(); ctx.arc(s / 2 + Math.cos(a * 1.57) * s * 0.16, s / 2 + Math.sin(a * 1.57) * s * 0.2, s * 0.03, 0, 6.3); ctx.fill(); }
  ctx.strokeStyle = 'rgba(55,50,42,0.95)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(s / 2, s / 2, s * 0.16, s * 0.2, 0, 0, 6.3); ctx.stroke();
  ctx.lineWidth = 8; ctx.strokeRect(4, 4, s - 8, s - 8);
}, 301);
leadTex.repeat.set(1, 1);
/** Leaded glass of the inner windows of the saloon and reception room (softly lit from behind, day and night). */
export const leadGlass = new THREE.MeshStandardMaterial({ map: leadTex, emissive: 0xfff1cf, emissiveMap: leadTex, emissiveIntensity: 0.75, roughness: 0.3 });
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
export { G };
/** small deterministic RNG */
export function rng(seed) { let a = (seed * 2654435761) >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const triCount = (g) => (g.index ? g.index.count : g.attributes.position.count) / 3;
/** triangles of a kit prop group */
export const propTris = (grp) => { let n = 0; grp.traverse((o) => { if (o.isMesh) n += triCount(o.geometry); }); return n; };

/** Collects instances per (kind, zone) and creates one InstancedMesh each on flush(). Front of every kind faces +x. */
export class InstField {
  constructor(world, deck) { this.world = world; this.deck = deck; this.defs = new Map(); this.sets = new Map(); this.count = {}; this.props = new Map(); }
  define(name, geo, mat) { this.defs.set(name, { geo, mat }); return this; }
  /** define every material part of a kit prop (def()) as its own instanced kind `name#i` */
  defineProp(name, grp) {
    const parts = [];
    grp.traverse((o) => { if (o.isMesh) parts.push(o); });
    this.props.set(name, parts.map((m, i) => { this.define(name + '#' + i, m.geometry, m.material); return name + '#' + i; }));
    return this;
  }
  addProp(name, x, y, z, rotY = 0, s = 1) { for (const k of this.props.get(name)) this.add(k, x, y, z, rotY, s, s, s); }
  add(name, x, y, z, rotY = 0, sx = 1, sy = 1, sz = 1) {
    const zi = Math.floor(x / ZONE_LEN), k = name + '|' + zi;
    let s = this.sets.get(k); if (!s) this.sets.set(k, (s = { name, zi, list: [] }));
    s.list.push([x, y, z, rotY, sx, sy, sz]);
    this.count[name] = (this.count[name] ?? 0) + 1;
  }
  /** triangles of everything added so far */
  tris() { let n = 0; for (const s of this.sets.values()) n += triCount(this.defs.get(s.name).geo) * s.list.length; return n; }
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

/** static mesh (shared geometry) placed in the zone of x; merged by the zone bake */
export function addMesh(plan, geo, mat, x, y, z, rotY = 0) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = rotY; m.receiveShadow = true; plan.zone(x).add(m); return m;
}

// ---------------------------------------------------------------- Jacobean panelling

const PROF = {
  bolection: [[0, 0], [0.014, 0.01], [0, 0.026]],
  rail: [[0, 0], [0.018, 0], [0.026, 0.012], [0.026, 0.03], [0.014, 0.042], [0, 0.046]],
  rib: [[0, -0.028], [0.016, -0.018], [0.022, 0], [0.016, 0.018], [0, 0.028]],
  frieze: [[0, 0], [0.012, 0], [0.012, 0.02], [0.02, 0.028], [0.02, 0.04], [0, 0.044]],
};
export { PROF };

/**
 * Jacobean panelling on a wall face. P = point of the face at floor level where the run starts, A = unit direction along
 * the face, O = unit normal into the room, len = run length. gaps = [[a0, a1], …] along-coordinates kept free (doors,
 * windows, furniture backs). Rows: dado panels, two rows of near-square upper panels with bolection frames and an applied
 * lozenge, a short frieze of carved panels. Optional plain backing (hides the painted-panel texture of flat kit walls),
 * dado rail and pilaster strips every `strips` metres.
 */
export function panelRun(b, { P, A, O, len, Y, TOP, mat = mats.paintWhite, frame = null, back = mats.paintWhite, gaps = [], pitch = 0.5,
  lower = true, upper = true, frieze = true, lozenge = true, rail = false, y1 = null, minLen = 0.3, backBands = null } = {}) {
  frame ??= mat;
  const U = [0, 1, 0], Q = (a, y, o = 0) => [P[0] + A[0] * a + O[0] * o, y, P[2] + A[2] * a + O[2] * o];
  const mA = [-A[0], 0, -A[2]], top = y1 ?? TOP, bands = backBands ?? [[Y + 0.13, top - 0.13]];
  // free intervals
  let iv = [[0, len]];
  for (const [g0, g1] of gaps) { const n = []; for (const [s, e] of iv) { if (g1 <= s || g0 >= e) n.push([s, e]); else { if (g0 > s) n.push([s, g0]); if (g1 < e) n.push([g1, e]); } } iv = n; }
  let tris = b.tris;
  for (const [s, e] of iv) {
    const L = e - s; if (L < minLen) continue;
    if (back) for (const [ya, yb] of bands) { const p = Q(s, 0, 0.003), q = Q(e, 0, 0.003); b.poly(back, [[p[0], ya, p[2]], [q[0], ya, q[2]], [q[0], yb, q[2]], [p[0], yb, p[2]]], O); }
    const rows = [];
    if (lower) rows.push([Y + 0.19, Y + 0.79, 'low']);
    if (upper && top - Y > 2.0) { const hu = (top - 0.46 - (Y + 0.99) - 0.07) / 2; rows.push([Y + 0.99, Y + 0.99 + hu, 'up'], [Y + 1.06 + hu, top - 0.46, 'up']); }
    if (frieze && top - Y > 2.0) rows.push([top - 0.39, top - 0.19, 'fr']);
    for (const [r0, r1, kind] of rows) {
      if (r1 > top - 0.12) continue;
      const st = 0.075, n = Math.max(1, Math.round((L - st) / (kind === 'fr' ? pitch * 0.75 : pitch))), pw = (L - (n + 1) * st) / n, ph = r1 - r0;
      if (pw < 0.12) continue;
      for (let i = 0; i < n; i++) {
        const a = s + st + pw / 2 + i * (pw + st), yc = (r0 + r1) / 2;
        b.fielded(mat, Q(a, yc, 0.003), A, O, U, pw, ph, kind === 'fr' ? 0.008 : 0.012, Math.min(kind === 'fr' ? 0.03 : 0.05, pw * 0.2, ph * 0.2));
        if (kind === 'up') { // bolection frame
          b.sweep(frame, PROF.bolection, Q(a - pw / 2, r0, 0.003), A, O, [0, -1, 0], pw, [true, true]);
          b.sweep(frame, PROF.bolection, Q(a - pw / 2, r1, 0.003), A, O, U, pw, [true, true]);
          b.sweep(frame, PROF.bolection, Q(a - pw / 2, r0, 0.003), U, O, mA, ph, [false, false]);
          b.sweep(frame, PROF.bolection, Q(a + pw / 2, r0, 0.003), U, O, A, ph, [false, false]);
        }
        if (lozenge && kind === 'up') { // applied lozenge boss (Jacobean)
          const d = Math.min(pw, ph) * 0.3, c = Q(a, yc, 0.018), t = Q(a, yc, 0.032);
          const pts = [Q(a - d, yc, 0.018), [c[0], yc - d * 1.2, c[2]], Q(a + d, yc, 0.018), [c[0], yc + d * 1.2, c[2]]];
          for (let k = 0; k < 4; k++) b.poly(frame, [pts[k], pts[(k + 1) % 4], t], O);
        }
        if (kind === 'fr') { // carved strap: small raised oval boss + scroll bars
          const c = Q(a, (r0 + r1) / 2, 0.02), t = Q(a, (r0 + r1) / 2, 0.03), r = Math.min(ph * 0.28, 0.04);
          const pts = []; for (let k = 0; k < 6; k++) { const an = (k / 6) * Math.PI * 2; pts.push([c[0] + A[0] * Math.cos(an) * r * 1.8, c[1] + Math.sin(an) * r, c[2] + A[2] * Math.cos(an) * r * 1.8]); }
          for (let k = 0; k < 6; k++) b.poly(frame, [pts[k], pts[(k + 1) % 6], t], O);
        }
      }
    }
    if (rail) b.sweep(frame, PROF.rail, Q(s, Y + 0.84), A, O, U, L, [true, true]);
  }
  return b.tris - tris;
}

// ---------------------------------------------------------------- strapwork ceiling

/** moulded beam on the ceiling along a line (horizontal), width w, depth d */
export function beam(b, mat, p, q, top, w = 0.3, d = 0.2) {
  const dx = q[0] - p[0], dz = q[1] - p[1], L = Math.hypot(dx, dz); if (L < 0.05) return;
  const A = [dx / L, 0, dz / L], U = [-A[2], 0, A[0]], hw = w / 2;
  const prof = [[0, -hw], [0.03, -hw], [0.045, -hw + 0.015], [0.06, -hw + 0.015], [0.1, -hw + 0.035], [d - 0.035, -hw + 0.04], [d - 0.02, -hw + 0.06], [d, -hw + 0.065],
    [d, hw - 0.065], [d - 0.02, hw - 0.06], [d - 0.035, hw - 0.04], [0.1, hw - 0.035], [0.06, hw - 0.015], [0.045, hw - 0.015], [0.03, hw], [0, hw]];
  b.sweep(mat, prof, [p[0], top, p[1]], A, [0, -1, 0], U, L, [true, true]);
}

/**
 * Jacobean strapwork ceiling: moulded beams on the lines xs (running athwartships) and zs (fore and aft), and in every
 * coffer between them a lattice of square units with a diamond strap in each, a rosette in the centre and small pendants
 * at the lattice crossings (instanced, kinds 'rose' / 'drop' / 'boss' must be defined on `f`). avoid = rectangles kept free.
 */
export function strapCeiling(plan, f, { x0, x1, z0, z1, xs, zs, avoid = [], mat = mats.paintWhite, unit = 1.35, beamW = 0.3, beamD = 0.2, ribs = true }) {
  const b = plan.batch, top = plan.y + plan.h - 0.004, t0 = b.tris;
  const hit = (r) => avoid.some((a) => r.x0 < a.x1 && r.x1 > a.x0 && r.z0 < a.z1 && r.z1 > a.z0);
  const holes = avoid.map((a) => ({ x0: a.x0 - 0.02, x1: a.x1 + 0.02, z0: a.z0 - 0.02, z1: a.z1 + 0.02 }));
  // beams (split around avoided rectangles)
  for (const x of xs) for (const q of rectMinus({ x0: x - beamW / 2, x1: x + beamW / 2, z0, z1 }, holes)) if (q.z1 - q.z0 > 0.3) beam(b, mat, [x, q.z0], [x, q.z1], top, beamW, beamD);
  for (const z of zs) for (const q of rectMinus({ x0, x1, z0: z - beamW / 2, z1: z + beamW / 2 }, holes)) if (q.x1 - q.x0 > 0.3) beam(b, mat, [q.x0, z], [q.x1, z], top, beamW, beamD);
  const X = [x0, ...xs, x1], Z = [z0, ...zs, z1];
  for (const x of xs) for (const z of zs) if (!hit({ x0: x - 0.2, x1: x + 0.2, z0: z - 0.2, z1: z + 0.2 })) f.add('boss', x, top - beamD, z);
  if (!ribs) return b.tris - t0;
  const rib = (p, q) => { const dx = q[0] - p[0], dz = q[1] - p[1], L = Math.hypot(dx, dz); const A = [dx / L, 0, dz / L]; b.sweep(mat, PROF.rib, [p[0], top, p[1]], A, [0, -1, 0], [-A[2], 0, A[0]], L, [false, false]); };
  for (let i = 0; i < X.length - 1; i++) for (let j = 0; j < Z.length - 1; j++) {
    const ca = X[i] + (i > 0 ? beamW / 2 : 0.02), cb = X[i + 1] - (i < X.length - 2 ? beamW / 2 : 0.02);
    const da = Z[j] + (j > 0 ? beamW / 2 : 0.02), db = Z[j + 1] - (j < Z.length - 2 ? beamW / 2 : 0.02);
    if (cb - ca < 0.6 || db - da < 0.6) continue;
    const nu = Math.max(1, Math.round((cb - ca) / unit)), nv = Math.max(1, Math.round((db - da) / unit)), su = (cb - ca) / nu, sv = (db - da) / nv;
    for (let u = 0; u < nu; u++) for (let v = 0; v < nv; v++) {
      const ux0 = ca + u * su, uz0 = da + v * sv, cell = { x0: ux0, x1: ux0 + su, z0: uz0, z1: uz0 + sv };
      if (hit(cell)) continue;
      const mx = ux0 + su / 2, mz = uz0 + sv / 2;
      // lattice edges (each unit draws its +u / +v edge unless on the coffer border), diamond strap, rosette
      if (u < nu - 1 && !hit({ ...cell, x0: cell.x1 - 0.01, x1: cell.x1 + 0.01 })) rib([ux0 + su, uz0], [ux0 + su, uz0 + sv]);
      if (v < nv - 1 && !hit({ ...cell, z0: cell.z1 - 0.01, z1: cell.z1 + 0.01 })) rib([ux0, uz0 + sv], [ux0 + su, uz0 + sv]);
      const D = [[mx, uz0], [ux0 + su, mz], [mx, uz0 + sv], [ux0, mz]];
      for (let k = 0; k < 4; k++) rib(D[k], D[(k + 1) % 4]);
      f.add('rose', mx, top, mz, ((u + v) % 2) * 0.4);
      if (u < nu - 1 && v < nv - 1) f.add('drop', ux0 + su, top, uz0 + sv);
    }
  }
  return b.tris - t0;
}

/** instanced ceiling ornaments for strapCeiling: plaster rosette, small pendant drop, beam-crossing boss */
export function ceilingOrnaments(f, mat = mats.paintWhite, gilt = null) {
  const rose = G.revolve([{ o: 0.03, y: -0.045, m: 0 }, { o: 0.13, y: -0.03, m: 0.028 }, { o: 0.2, y: 0 }], { seg: 10, k: 5, capBottom: true });
  const drop = G.lathe([[0, -0.13], [0.032, -0.08], [0.025, -0.05], [0.045, 0]], 5);
  const boss = G.lathe([[0, 0], [0.16, 0], [0.15, -0.03], [0.08, -0.06], [0.06, -0.1], [0.07, -0.15], [0.03, -0.21], [0, -0.25]], 8);
  f.define('rose', rose, mat).define('drop', drop, gilt ?? mat).define('boss', boss, gilt ?? mat);
}

// ---------------------------------------------------------------- windows

const curtainCache = new Map();
function curtainGeo(w, h, tieDir) {
  const k = `${w}|${h}|${tieDir}`;
  let g = curtainCache.get(k);
  if (!g) { g = G.curtain(w, h, 3, 0.028, 0.45, tieDir * w * 0.55, 10, 5); g.rotateY(Math.PI / 2); curtainCache.set(k, g); }
  return g;
}

/**
 * Inner leaded window in front of the hull lining at station x on side `s` (−1 port / +1 starboard), w × (y0..y1) m above
 * the floor, lit from behind: moulded architrave, deep reveal, mullions and transom, sill, pelmet with tied-back curtains.
 */
export function leadedWindow(plan, x, s, { w = 1.7, y0 = 0.85, y1 = 2.2, inset = 0.16, frame = mats.paintWhite, curtain = mats.fabricGreen, pelmet = null } = {}) {
  const b = plan.batch, Y = plan.y, z = s * (Math.min(plan.halfWidth(x - w / 2), plan.halfWidth(x + w / 2)) - inset);
  const xa = x - w / 2, xb = x + w / 2, n = Math.max(2, Math.round(w / 0.6)), zg = z + s * 0.05; // glass sits 5 cm behind the frame face
  const ya = Y + y0, yb = Y + y1, yt = ya + (yb - ya) * 0.72, f = s > 0 ? 'xXyYz' : 'xXyYZ', O = [0, 0, -s];
  // reveal (lining of the opening) and glass panes
  b.box(frame, xa, ya, zg, xb, ya + 0.0001, z, 'Y'); b.box(frame, xa, yb - 0.0001, zg, xb, yb, z, 'y');
  b.wallZ(frame, xa, Math.min(z, zg), Math.max(z, zg), ya, yb, 1); b.wallZ(frame, xb, Math.min(z, zg), Math.max(z, zg), ya, yb, -1);
  for (let i = 0; i < n; i++) {
    const a = xa + (w * i) / n, c = xa + (w * (i + 1)) / n;
    b.poly(leadGlass, [[a, ya, zg], [c, ya, zg], [c, yt, zg], [a, yt, zg]], O, [[0, 0], [1, 0], [1, 1], [0, 1]]);
    b.poly(leadGlass, [[a, yt, zg], [c, yt, zg], [c, yb, zg], [a, yb, zg]], O, [[0.1, 0.2], [0.9, 0.2], [0.9, 0.75], [0.1, 0.75]]);
  }
  // mullions + transom (stone-like white bars)
  for (let i = 1; i < n; i++) { const a = xa + (w * i) / n; b.box(frame, a - 0.025, ya, zg - s * 0.03, a + 0.025, yb, zg, f); }
  b.box(frame, xa, yt - 0.025, zg - s * 0.03, xb, yt + 0.025, zg, f);
  // moulded architrave on the face
  const P = (xx, yy) => [xx, yy, z];
  b.sweep(frame, PR_ARCH, P(xa, ya), [1, 0, 0], O, [0, -1, 0], w, [false, false]);
  b.sweep(frame, PR_ARCH, P(xa, yb), [1, 0, 0], O, [0, 1, 0], w, [false, false]);
  b.sweep(frame, PR_ARCH, P(xa, ya), [0, 1, 0], O, [-1, 0, 0], yb - ya, [false, false]);
  b.sweep(frame, PR_ARCH, P(xb, ya), [0, 1, 0], O, [1, 0, 0], yb - ya, [false, false]);
  // sill with apron
  b.box(frame, xa - 0.12, ya - 0.05, z, xb + 0.12, ya, z - s * 0.11, f);
  b.box(frame, xa - 0.06, ya - 0.17, z, xb + 0.06, ya - 0.05, z - s * 0.025, f);
  // pelmet and curtains
  if (curtain) {
    const pz = z - s * 0.13, py = yb + 0.2;
    b.box(pelmet ?? frame, xa - 0.42, py - 0.17, z - s * 0.02, xb + 0.42, py, pz - s * 0.02, s > 0 ? 'xXyYz' : 'xXyYZ');
    b.box(mats.gold, xa - 0.425, py - 0.18, pz - s * 0.015, xb + 0.425, py - 0.165, pz - s * 0.03, s > 0 ? 'xXyYz' : 'xXyYZ');
    const h = py - 0.15 - (Y + 0.12), cw = 0.5;
    for (const side of [-1, 1]) {
      const cx = side < 0 ? xa - 0.08 : xb + 0.08, hx = cx + side * 0.3;
      addMesh(plan, curtainGeo(cw, h, side), curtain, cx, py - 0.15, pz + s * 0.05);
      b.box(mats.gold, hx - 0.02, Y + 1.0, z - s * 0.01, hx + 0.02, Y + 1.04, pz, f); // tie-back hook
    }
  }
}
const PR_ARCH = [[0, 0], [0.018, 0], [0.022, 0.015], [0.03, 0.03], [0.03, 0.06], [0.018, 0.075], [0, 0.085]];

/** Moulded ceiling: beams (w × d) hanging from the ceiling on a grid, interrupted at `avoid` rectangles. */
export function coffers(plan, x0, x1, z0, z1, { px = 2.7, pz = 2.8, w = 0.18, d = 0.1, mat = mats.paintWhite, avoid = [], phaseX = 0 } = {}) {
  const b = plan.batch, top = plan.y + plan.h, holes = avoid.map((a) => ({ x0: a.x0 - 0.05, x1: a.x1 + 0.05, z0: a.z0 - 0.05, z1: a.z1 + 0.05 }));
  const strip = (r) => { for (const q of rectMinus(r, holes)) if (q.x1 - q.x0 > 0.05 && q.z1 - q.z0 > 0.05) b.box(mat, q.x0, top - d, q.z0, q.x1, top, q.z1, 'xXyzZ'); };
  const nx = Math.max(1, Math.round((x1 - x0) / px)), nz = Math.max(1, Math.round((z1 - z0) / pz));
  for (let i = 0; i <= nx; i++) { const x = Math.min(x1 - w / 2, Math.max(x0 + w / 2, x0 + phaseX + ((x1 - x0) * i) / nx)); strip({ x0: x - w / 2, x1: x + w / 2, z0, z1 }); }
  for (let j = 1; j < nz; j++) { const z = z0 + ((z1 - z0) * j) / nz; strip({ x0, x1, z0: z - w / 2, z1: z + w / 2 }); }
}

// ---------------------------------------------------------------- world-coordinate furnishing

const DIR = { fwd: [1, 0], aft: [-1, 0], port: [0, -1], stbd: [0, 1] };
export const rotOf = (dx, dz) => Math.atan2(-dz, dx);
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
    /** wall prop (sconce, mirror, clock, pilaster) at world position, front pointing `dir` */
    mount(prop, x, z, dir, hgt = 1.7) { prop.position.set(x, ctx.y + hgt, z); const [dx, dz] = DIR[dir]; prop.rotation.y = Math.atan2(-dz, dx); ctx.plan.zone(x).add(prop); return prop; },
    /** doors of the room on a side: [[a0, a1], …] along the wall (world coordinate), widened by m */
    doorGaps(side, m = 0.2) { return (ctx._doors ?? []).filter((d) => d.side === side).map((d) => [d.at - d.w / 2 - m, d.at + d.w / 2 + m]); },
  };
}

/** A round table with n wicker / upholstered armchairs around it (world coordinates). */
export function seatGroup(w, table, chair, x, z, r = 0.85, sides = ['fwd', 'aft', 'port', 'stbd'], jitter = null) {
  if (!w.put(table, x, z, 'fwd')) return false;
  for (const s of sides) {
    const [dx, dz] = DIR[s], j = jitter ? jitter() : 0;
    w.put(chair(), x + dx * (r + Math.abs(j) * 0.2), z + dz * (r + Math.abs(j) * 0.2), s === 'fwd' ? 'aft' : s === 'aft' ? 'fwd' : s === 'port' ? 'stbd' : 'port', { collide: false });
  }
  return true;
}
export { kitMats };
