// Tank top (machinery level) – low-level helpers: template batches for InstancedMesh / moving parts, smooth tubes,
// caged lamps, pipe railings, steel stair flights, landings and catwalk plates.
import * as THREE from 'three';
import { mats } from '../core/materials.js';
import { DECK_Y, ZONE_LEN, SLAB, hullHalfWidth } from '../core/constants.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Batch, LINING_INSET } from '../interior/kit.js';

export const DECK = 'tank';
export const Y = DECK_Y.tank;                         // tank top floor
export const CEIL = DECK_Y.F - SLAB;                  // underside of F deck (machinery spaces)
export const LOW = DECK_Y.orlop - SLAB;               // underside of the orlop deck (fore and aft of the machinery)

/** Inner face of the hull plating at station x and height y (ignores the stepped lining colliders). */
export const hullIn = (x, y) => Math.max(0, hullHalfWidth(x, y) - LINING_INSET);
/** Half width usable at floor level (the lining colliders stand here). */
export const floorHW = (x) => hullIn(x, Y);

/** Batch that ignores zones: one geometry per material (templates for InstancedMesh and animated parts). */
export class TBatch extends Batch {
  constructor() { super(null, DECK, 0); }
  _bucket(mat) {
    let b = this.buckets.get(mat.uuid);
    if (!b) this.buckets.set(mat.uuid, (b = { mat, zi: 0, pos: [], nor: [], uv: [], idx: [] }));
    return b;
  }
  /** → [{geo, mat}] and reset */
  parts() {
    const out = [];
    for (const b of this.buckets.values()) {
      if (!b.idx.length) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(b.nor, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
      g.setIndex(b.idx);
      g.computeBoundingSphere();
      out.push({ geo: g, mat: b.mat });
    }
    this.buckets.clear();
    return out;
  }
  /** Group of meshes (one per material), flagged noMerge (for animated parts). */
  group() {
    const g = new THREE.Group();
    for (const p of this.parts()) g.add(new THREE.Mesh(p.geo, p.mat));
    g.userData.noMerge = true;
    return g;
  }
}

const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);
const UP = new THREE.Vector3(0, 1, 0);

/** Collects instances of templates ({id, parts}) per culling zone and creates one InstancedMesh per zone and part. */
export class Instancer {
  constructor(world) { this.world = world; this.map = new Map(); this.count = 0; }
  add(tpl, x, y, z, rotY = 0) {
    const zi = Math.floor(x / ZONE_LEN), k = tpl.id + '|' + zi;
    let e = this.map.get(k);
    if (!e) this.map.set(k, (e = { tpl, zi, list: [] }));
    _q.setFromAxisAngle(UP, rotY);
    e.list.push(new THREE.Matrix4().compose(_v.set(x, y, z), _q, _s));
    this.count++;
  }
  flush() {
    for (const e of this.map.values()) {
      const zone = this.world.zone(DECK, e.zi * ZONE_LEN + 1);
      for (const p of e.tpl.parts) {
        const im = new THREE.InstancedMesh(p.geo, p.mat, e.list.length);
        e.list.forEach((m, i) => im.setMatrixAt(i, m));
        im.instanceMatrix.needsUpdate = true;
        im.computeBoundingSphere();
        im.receiveShadow = true;
        im.userData.noMerge = true;
        zone.add(im);
      }
    }
    this.map.clear();
  }
}

// ------------------------------------------------------------------------------------------------ geometry stamping

const _sp = new THREE.Vector3(), _sn = new THREE.Vector3(), _snm = new THREE.Matrix3();
/**
 * Push a THREE.BufferGeometry, transformed by m4, into a Batch / TBatch bucket. uv: 'world' (metres, box-projected – for
 * tiled textures) or 'geo' (keep the geometry's own uv – dials, unit textures).
 */
export function stamp(b, mat, geo, m4, uv = 'world', zx) {
  const P = geo.attributes.position, N = geo.attributes.normal, U = geo.attributes.uv, I = geo.index;
  if (zx === undefined) zx = m4.elements[12];
  const bk = b._bucket(mat, zx), base = bk.pos.length / 3;
  _snm.getNormalMatrix(m4);
  const flip = m4.determinant() < 0;
  for (let i = 0; i < P.count; i++) {
    _sp.fromBufferAttribute(P, i).applyMatrix4(m4);
    _sn.fromBufferAttribute(N, i).applyMatrix3(_snm).normalize();
    bk.pos.push(_sp.x, _sp.y, _sp.z); bk.nor.push(_sn.x, _sn.y, _sn.z);
    if (uv === 'geo' && U) bk.uv.push(U.getX(i), U.getY(i));
    else {
      const ax = Math.abs(_sn.x), ay = Math.abs(_sn.y), az = Math.abs(_sn.z);
      if (ay >= ax && ay >= az) bk.uv.push(_sp.x, _sp.z); else if (ax > az) bk.uv.push(_sp.z, _sp.y); else bk.uv.push(_sp.x, _sp.y);
    }
  }
  const n = I ? I.count : P.count;
  for (let t = 0; t < n; t += 3) {
    const a = I ? I.getX(t) : t, c1 = I ? I.getX(t + 1) : t + 1, c2 = I ? I.getX(t + 2) : t + 2;
    if (flip) bk.idx.push(base + a, base + c2, base + c1); else bk.idx.push(base + a, base + c1, base + c2);
  }
  b.tris += n / 3;
}
const _e = new THREE.Euler(), _mq = new THREE.Quaternion(), _ms = new THREE.Vector3(), _mp = new THREE.Vector3();
/** Matrix: translate (x,y,z), rotate Euler (rx, ry, rz, order 'YXZ'), scale (sx, sy, sz). */
export function M4(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  _e.set(rx, ry, rz, 'YXZ'); _mq.setFromEuler(_e);
  return new THREE.Matrix4().compose(_mp.set(x, y, z), _mq, _ms.set(sx, sy, sz));
}
/** Matrix that maps local +y onto the unit direction d, placed at p. */
export function M4dir(p, d, s = 1) {
  _mq.setFromUnitVectors(UP, _mp.set(d[0], d[1], d[2]).normalize());
  return new THREE.Matrix4().compose(new THREE.Vector3(p[0], p[1], p[2]), _mq, _ms.set(s, s, s));
}
const GC = new Map();
/** cached geometry */
export function gcache(key, make) { let g = GC.get(key); if (!g) GC.set(key, (g = make())); return g; }
/** Lathe around local y: prof [[r, y], ...] (bottom → top for an outward-facing solid). */
export function latheGeo(prof, seg = 16) {
  return gcache('L' + seg + JSON.stringify(prof), () => {
    const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(Math.max(r, 1e-4), y)), seg);
    g.computeVertexNormals();
    return g;
  });
}
/** lathe stamped with its axis along local direction: 'x' | 'y' | 'z' (profile y runs along +axis), centred at p */
export function latheAt(b, mat, prof, axis, p, seg = 16) {
  const g = latheGeo(prof, seg);
  const m = axis === 'x' ? M4(p[0], p[1], p[2], 0, 0, -Math.PI / 2) : axis === 'z' ? M4(p[0], p[1], p[2], Math.PI / 2, 0, 0) : axis === '-x' ? M4(p[0], p[1], p[2], 0, 0, Math.PI / 2) : M4(p[0], p[1], p[2]);
  stamp(b, mat, g, m);
}
/** hexagonal nut + washer with its axis along d at p (lying on a surface whose normal is d) */
export function nut(b, p, d, r = 0.03, mat = mats.iron) {
  stamp(b, mat, gcache('nut' + r, () => { const g = new THREE.CylinderGeometry(r, r, r * 1.1, 6); g.translate(0, r * 0.75, 0); return g; }), M4dir(p, d));
  stamp(b, mat, gcache('wash' + r, () => { const g = new THREE.CylinderGeometry(r, r * 1.45, r * 0.4, 6, 1, true); return g; }), M4dir(p, d));
}
const RIVET = new THREE.ConeGeometry(0.017, 0.013, 5, 1); RIVET.translate(0, 0.004, 0); RIVET.computeVertexNormals();
/** rivet head (cone) at p, outward direction d */
export function rivet(b, p, d, mat = mats.steelDark, s = 1) { stamp(b, mat, RIVET, M4dir(p, d, s)); }
/** rivet row along a straight line p→q on a surface with normal d, pitch */
export function rivetLine(b, p, q, d, pitch = 0.1, mat = mats.steelDark, s = 1) {
  const L = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]), n = Math.max(1, Math.round(L / pitch));
  for (let i = 0; i <= n; i++) { const t = i / n; rivet(b, [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t], d, mat, s); }
}
/** rivets on a circle around the x axis at x, centre (cy, cz), radius r, angles a0..a1 from the top (towards +z) */
export function rivetArcX(b, x, cy, cz, r, a0, a1, pitch = 0.1, mat = mats.steelDark) {
  const n = Math.max(1, Math.round(((a1 - a0) * r) / pitch));
  for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n, c = Math.cos(a), s = Math.sin(a); rivet(b, [x, cy + r * c, cz + r * s], [0, c, s], mat); }
}

// open-mesh grating (alpha tested) for gallery floors and stokehold platforms
const gratTex = (() => {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  x.clearRect(0, 0, 128, 128); x.fillStyle = '#4a4c4f';
  for (let i = 0; i < 128; i += 16) { x.fillRect(i, 0, 5, 128); }
  for (let j = 0; j < 128; j += 32) { x.fillRect(0, j, 128, 4); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  t.repeat.set(1 / 0.4, 1 / 0.4);
  return t;
})();
/** open-mesh steel grating (module-level material, created once) */
export const gratingMat = new THREE.MeshStandardMaterial({ map: gratTex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.55, metalness: 0.7, color: 0x9a9c9e });
gratingMat.name = 'tank_grating';

// ------------------------------------------------------------------------------------------------ tubes

function basis(d) {
  const a = Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  let u = [d[1] * a[2] - d[2] * a[1], d[2] * a[0] - d[0] * a[2], d[0] * a[1] - d[1] * a[0]];
  const ul = Math.hypot(...u); u = u.map((v) => v / ul);
  const v = [d[1] * u[2] - d[2] * u[1], d[2] * u[0] - d[0] * u[2], d[0] * u[1] - d[1] * u[0]];
  return [u, v];
}

/**
 * Tube / frustum from point p to point q (smooth normals). opts: { seg = 12, r1 = r0, caps = true|'lo'|'hi'|false, flat }
 * Works on Batch and TBatch.
 */
export function tubeBetween(b, mat, p, q, r0, opts = {}) {
  const seg = opts.seg ?? 12, r1 = opts.r1 ?? r0, caps = opts.caps ?? true;
  const d0 = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], len = Math.hypot(...d0);
  if (len < 1e-5) return;
  const d = d0.map((v) => v / len), [u, v] = basis(d), ph = opts.phase ?? Math.PI / seg;
  const ring = (c, r, a) => { const ca = Math.cos(a), sa = Math.sin(a); return [c[0] + r * (u[0] * ca + v[0] * sa), c[1] + r * (u[1] * ca + v[1] * sa), c[2] + r * (u[2] * ca + v[2] * sa)]; };
  const nrm = (a) => { const ca = Math.cos(a), sa = Math.sin(a); return [u[0] * ca + v[0] * sa, u[1] * ca + v[1] * sa, u[2] * ca + v[2] * sa]; };
  if (opts.flat) {
    for (let i = 0; i < seg; i++) {
      const a0 = ph + (i / seg) * Math.PI * 2, a1 = ph + ((i + 1) / seg) * Math.PI * 2;
      b.poly(mat, [ring(p, r0, a0), ring(q, r1, a0), ring(q, r1, a1), ring(p, r0, a1)], nrm((a0 + a1) / 2), undefined, (p[0] + q[0]) / 2);
    }
  } else {
    const bk = b._bucket(mat, (p[0] + q[0]) / 2), base = bk.pos.length / 3, circ = Math.PI * (r0 + r1);
    for (let i = 0; i <= seg; i++) {
      const a = ph + (i / seg) * Math.PI * 2, n = nrm(a);
      for (const [c, r, t] of [[p, r0, 0], [q, r1, len]]) {
        const pt = ring(c, r, a);
        bk.pos.push(pt[0], pt[1], pt[2]); bk.nor.push(n[0], n[1], n[2]); bk.uv.push((i / seg) * circ, t);
      }
    }
    // winding: check the first triangle against the outward normal
    const P0 = ring(p, r0, ph), P1 = ring(q, r1, ph), P2 = ring(q, r1, ph + (Math.PI * 2) / seg), n0 = nrm(ph + Math.PI / seg);
    const e1 = [P1[0] - P0[0], P1[1] - P0[1], P1[2] - P0[2]], e2 = [P2[0] - P0[0], P2[1] - P0[1], P2[2] - P0[2]];
    const cr = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const flip = cr[0] * n0[0] + cr[1] * n0[1] + cr[2] * n0[2] < 0;
    for (let i = 0; i < seg; i++) {
      const a = base + i * 2, bq = a + 1, c = a + 3, dd = a + 2; // a: p_i, bq: q_i, c: q_i+1, dd: p_i+1
      if (!flip) bk.idx.push(a, bq, c, a, c, dd); else bk.idx.push(a, c, bq, a, dd, c);
    }
    b.tris += seg * 2;
  }
  if (caps) {
    const lo = [], hi = [];
    for (let i = 0; i < seg; i++) { const a = ph + (i / seg) * Math.PI * 2; lo.push(ring(p, r0, a)); hi.push(ring(q, r1, a)); }
    if ((caps === true || caps === 'lo') && r0 > 1e-4) b.poly(mat, lo, d.map((x) => -x), undefined, p[0]);
    if ((caps === true || caps === 'hi') && r1 > 1e-4) b.poly(mat, hi, d, undefined, q[0]);
  }
}

/** Axis-aligned tube. axis 'x': c = [y, z]; 'y': c = [x, z]; 'z': c = [x, y]; from a0 to a1 along the axis. */
export function tube(b, mat, axis, c, r, a0, a1, opts = {}) {
  const P = (a) => (axis === 'x' ? [a, c[0], c[1]] : axis === 'y' ? [c[0], a, c[1]] : [c[0], c[1], a]);
  tubeBetween(b, mat, P(a0), P(a1), r, opts);
}

/** Pipe through world points with flanges at the bends. */
export function pipeRun(b, mat, pts, r, opts = {}) {
  const seg = opts.seg ?? 8;
  for (let i = 0; i < pts.length - 1; i++) tubeBetween(b, mat, pts[i], pts[i + 1], r, { seg, caps: false });
  const fm = opts.flange === undefined ? mats.iron : opts.flange;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], c = pts[Math.min(pts.length - 1, i + 1)];
    const d = [c[0] - a[0], c[1] - a[1], c[2] - a[2]], l = Math.hypot(...d) || 1, h = r * 0.35;
    const p = pts[i], dn = d.map((v) => (v / l) * h);
    if (fm) tubeBetween(b, fm, [p[0] - dn[0], p[1] - dn[1], p[2] - dn[2]], [p[0] + dn[0], p[1] + dn[1], p[2] + dn[2]], r * 1.35, { seg, flat: true });
  }
}

/** Vertical cylinder standing on y0 (smooth). */
export function column(b, mat, x, z, y0, y1, r, opts = {}) { tube(b, mat, 'y', [x, z], r, y0, y1, opts); }

// ------------------------------------------------------------------------------------------------ lamps

/**
 * Caged bulkhead lamp. dir: '+x'|'-x'|'+z'|'-z' = direction it faces (mounted on a wall behind it), or null = pendant
 * hanging from `hang` (y of the ceiling). Registers world.addLamp.
 */
const LAMP_GLOBE = latheGeo([[0, -0.11], [0.05, -0.1], [0.075, -0.06], [0.08, -0.01], [0.07, 0.04], [0.05, 0.075], [0, 0.08]], 10);
const LAMP_GUARD = (() => {
  const parts = [];
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2, pts = [[0.06, 0.09], [0.1, 0.04], [0.105, -0.04], [0.085, -0.1], [0.03, -0.135]].map(([r, y]) => new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
    parts.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 6, 0.006, 3, false));
  }
  for (const [r, y] of [[0.103, 0.0], [0.09, -0.08]]) { const t = new THREE.TorusGeometry(r, 0.006, 3, 14); t.rotateX(Math.PI / 2); t.translate(0, y, 0); parts.push(t); }
  const base = new THREE.CylinderGeometry(0.07, 0.085, 0.05, 10); base.translate(0, 0.11, 0); parts.push(base);
  const cap = new THREE.CylinderGeometry(0.015, 0.03, 0.03, 6); cap.translate(0, -0.14, 0); parts.push(cap);
  return mergeGeometries(parts.map((g) => g.toNonIndexed()), false);
})();
export function cageLamp(b, world, x, y, z, opts = {}) {
  const dir = opts.dir ?? null, s = 0.09;
  stamp(b, mats.lampGlow, LAMP_GLOBE, M4(x, y, z));
  stamp(b, mats.iron, LAMP_GUARD, M4(x, y, z));
  if (dir) {
    const sx = dir === '+x' ? -1 : dir === '-x' ? 1 : 0, sz = dir === '+z' ? -1 : dir === '-z' ? 1 : 0, l = 0.2;
    b.box(mats.iron, Math.min(x, x + sx * l) - 0.025, y + 0.02, Math.min(z, z + sz * l) - 0.025, Math.max(x, x + sx * l) + 0.025, y + 0.07, Math.max(z, z + sz * l) + 0.025);
    b.box(mats.iron, x + sx * l - 0.06 - (sx ? 0 : 0), y - 0.06, z + sz * l - 0.06, x + sx * l + 0.06, y + 0.12, z + sz * l + 0.06);
  } else if (opts.hang && opts.hang - (y + s + 0.05) > 0.05) {
    b.box(mats.iron, x - 0.012, y + s + 0.05, z - 0.012, x + 0.012, opts.hang, z + 0.012, 'xXzZ');
  }
  world.addLamp({ x, y: y - 0.15, z, color: opts.color ?? 0xffd39a, intensity: opts.intensity ?? 1 });
}

// ------------------------------------------------------------------------------------------------ rails, plates, stairs

const RAIL = 0.95;
/** Pipe railing along x at z, floor y (posts, mid and top rail) + collider. */
export function railX(b, world, x0, x1, z, y, opts = {}) {
  if (x1 - x0 < 0.05) return;
  const m = opts.mat ?? mats.iron;
  b.bar(m, [x0, y + RAIL - 0.04, z], [x1, y + RAIL - 0.04, z], 0.045, 0.045);
  b.bar(m, [x0, y + 0.48, z], [x1, y + 0.48, z], 0.035, 0.035);
  const n = Math.max(1, Math.round((x1 - x0) / 1.25));
  for (let i = 0; i <= n; i++) b.post(m, x0 + ((x1 - x0) * i) / n, z, y, y + RAIL, 0.04);
  if (opts.toe !== false) b.box(mats.steelDark, x0, y, z - 0.01, x1, y + 0.1, z + 0.01, 'zZY');
  if (opts.collide !== false) world.addCollider(x0, y, z - 0.05, x1, y + 1.0, z + 0.05);
}
/** Pipe railing along z at x. */
export function railZ(b, world, z0, z1, x, y, opts = {}) {
  if (z1 - z0 < 0.05) return;
  const m = opts.mat ?? mats.iron;
  b.bar(m, [x, y + RAIL - 0.04, z0], [x, y + RAIL - 0.04, z1], 0.045, 0.045);
  b.bar(m, [x, y + 0.48, z0], [x, y + 0.48, z1], 0.035, 0.035);
  const n = Math.max(1, Math.round((z1 - z0) / 1.25));
  for (let i = 0; i <= n; i++) b.post(m, x, z0 + ((z1 - z0) * i) / n, y, y + RAIL, 0.04);
  if (opts.toe !== false) b.box(mats.steelDark, x - 0.01, y, z0, x + 0.01, y + 0.1, z1, 'xXY');
  if (opts.collide !== false) world.addCollider(x - 0.05, y, z0, x + 0.05, y + 1.0, z1);
}
/** Railing along a line with gaps: segs = [[a0,a1],...] are the railed parts. */
export function railXs(b, world, segs, z, y, o) { for (const [a, c] of segs) railX(b, world, a, c, z, y, o); }
export function railZs(b, world, segs, x, y, o) { for (const [a, c] of segs) railZ(b, world, a, c, x, y, o); }

/** Walkable steel plate / grating (top at y) + addFloor. */
export function plate(b, world, x0, x1, z0, z1, y, opts = {}) {
  const t = opts.t ?? 0.06, grate = opts.grating !== false && !opts.mat;
  if (grate) {
    // open-mesh grating in a flat-bar frame, bearer bars every 0.6 m underneath
    b.box(gratingMat, x0, y - 0.004, z0, x1, y - 0.002, z1, 'Y');
    // flat-bar frame (four bars, closed, so that it also reads from below)
    for (const [a0, a1, c0, c1] of [[x0, x1, z0, z0 + 0.012], [x0, x1, z1 - 0.012, z1], [x0, x0 + 0.012, z0, z1], [x1 - 0.012, x1, z0, z1]]) b.box(mats.steelDark, a0, y - t, c0, a1, y - 0.005, c1);
    const alongX = x1 - x0 >= z1 - z0;
    if (alongX) for (let x = x0 + 0.6; x < x1 - 0.1; x += 0.6) b.box(mats.steelDark, x - 0.012, y - t, z0, x + 0.012, y - 0.005, z1, 'xXy');
    else for (let z = z0 + 0.6; z < z1 - 0.1; z += 0.6) b.box(mats.steelDark, x0, y - t, z - 0.012, x1, y - 0.005, z + 0.012, 'zZy');
  } else {
    b.box(opts.mat ?? mats.steelFloor, x0, y - t, z0, x1, y, z1, 'Y');
    b.box(mats.steelDark, x0, y - t, z0, x1, y, z1, 'xXzZy');
  }
  // supporting angle bars under the edges
  b.box(mats.steelDark, x0, y - t - 0.14, z0, x1, y - t, z0 + 0.08, 'xXzZy');
  b.box(mats.steelDark, x0, y - t - 0.14, z1 - 0.08, x1, y - t, z1, 'xXzZy');
  if (opts.walk !== false) world.addFloor({ y, x0, x1, z0, z1 });
}

/**
 * Steel stair flight with open treads, stringers, handrails, ramp and rail colliders.
 * axis 'x': runs from a0 (height y0) to a1 (height y1) along x, lane c0..c1 in z. axis 'z': along z, lane in x.
 * rails: [atC0, atC1] (booleans, or 'visual' = rail without collider). under: block the low-headroom part beneath.
 */
export function flight(b, world, { axis = 'x', a0, a1, y0, y1, c0, c1, rails = [true, true], under = false, floorY = Y }) {
  const lowA = y0 < y1 ? a0 : a1, highA = y0 < y1 ? a1 : a0, yl = Math.min(y0, y1), yh = Math.max(y0, y1);
  const rise = yh - yl, run = Math.abs(highA - lowA), N = Math.max(2, Math.round(rise / 0.2)), sgn = Math.sign(highA - lowA);
  const P = (a, y, c) => (axis === 'x' ? [a, y, c] : [c, y, a]);
  const boxA = (m, aa, ab, ya, yb, ca, cb, f) => { if (axis === 'x') b.box(m, aa, ya, ca, ab, yb, cb, f); else b.box(m, ca, ya, aa, cb, yb, ab, f); };
  const cm = (c0 + c1) / 2;
  for (let i = 1; i < N; i++) {
    const ac = lowA + (sgn * run * i) / N, ha = run / N / 2 + 0.02, yt = yl + (rise * i) / N;
    boxA(mats.steelFloor, Math.min(ac - ha, ac + ha), Math.max(ac - ha, ac + ha), yt - 0.035, yt, c0 + 0.04, c1 - 0.04, 'Yy' + (axis === 'x' ? 'xX' : 'zZ'));
    boxA(mats.steelDark, Math.min(ac + sgn * ha - sgn * 0.04, ac + sgn * ha), Math.max(ac + sgn * ha - sgn * 0.04, ac + sgn * ha), yt - 0.09, yt, c0 + 0.04, c1 - 0.04, axis === 'x' ? 'xXy' : 'zZy'); // nosing
  }
  // stringers (plates on edge) and handrails
  for (const [ci, c] of [[0, c0], [1, c1]]) {
    const off = ci === 0 ? 0.03 : -0.03, cc = c + off;
    const pts = [P(lowA, yl - 0.32, cc), P(highA, yh - 0.32, cc), P(highA, yh + 0.02, cc), P(lowA, yl + 0.02, cc)];
    const n = axis === 'x' ? [0, 0, ci === 0 ? -1 : 1] : [ci === 0 ? -1 : 1, 0, 0];
    b.poly(mats.steelDark, pts, n); b.poly(mats.steelDark, pts, n.map((v) => -v));
    const r = rails[ci];
    if (!r) continue;
    const rc = c + (ci === 0 ? 0.02 : -0.02);
    b.bar(mats.iron, P(lowA, yl + RAIL - 0.04, rc), P(highA, yh + RAIL - 0.04, rc), 0.045, 0.045);
    b.bar(mats.iron, P(lowA, yl + 0.5, rc), P(highA, yh + 0.5, rc), 0.035, 0.035);
    for (let k = 0; k <= 3; k++) { const a = lowA + (sgn * run * k) / 3, yy = yl + (rise * k) / 3; b.post(mats.iron, ...(axis === 'x' ? [a, rc] : [rc, a]), yy, yy + RAIL, 0.04); }
    if (r !== 'visual') {
      const amin = Math.min(lowA, highA), amax = Math.max(lowA, highA);
      if (axis === 'x') world.addCollider(amin, yl, c - 0.05, amax, yh + 1.0, c + 0.05); else world.addCollider(c - 0.05, yl, amin, c + 0.05, yh + 1.0, amax);
    }
  }
  if (axis === 'x') world.addRamp({ x0: a0, x1: a1, z0: c0, z1: c1, y0, y1, axis: 'x' });
  else world.addRamp({ x0: c0, x1: c1, z0: a0, z1: a1, y0, y1, axis: 'z' });
  // block the space under the low end of a flight that starts on the floor
  if (under && Math.abs(yl - floorY) < 0.05) {
    const slope = rise / run, s0 = 0.5 / slope, s1 = Math.min(run, 2.1 / slope);
    for (let s = s0; s < s1 - 1e-3; s += 0.4) {
      const e = Math.min(s1, s + 0.4), yTop = yl + slope * s - 0.05;
      const aa = lowA + sgn * s, ab = lowA + sgn * e;
      if (axis === 'x') world.addCollider(Math.min(aa, ab), floorY, c0, Math.max(aa, ab), yTop, c1);
      else world.addCollider(c0, floorY, Math.min(aa, ab), c1, yTop, Math.max(aa, ab));
    }
  }
}
