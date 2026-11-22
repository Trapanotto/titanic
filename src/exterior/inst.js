import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Instancing collector for everything that repeats (rivets, portholes, stanchions, window frames, chairs …):
// add(geo, mat, matrix) many times, build(parent) creates one InstancedMesh per geometry/material/shadow flag.

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
const _X = new THREE.Vector3(), _Y = new THREE.Vector3(), _Z = new THREE.Vector3();

export class Inst {
  constructor() { this.buckets = new Map(); }

  /** Add one instance with a world (parent-space) matrix. */
  add(geo, mat, m, cast = false) {
    const k = geo.uuid + '|' + mat.uuid + (cast ? 'c' : '');
    let b = this.buckets.get(k);
    if (!b) this.buckets.set(k, (b = { geo, mat, cast, a: [] }));
    const e = m.elements;
    for (let i = 0; i < 16; i++) b.a.push(e[i]);
  }

  /** Position + optional quaternion + scale (number or [x,y,z]). */
  at(geo, mat, x, y, z, q = null, s = 1, cast = false) {
    _p.set(x, y, z);
    if (q) _q.copy(q); else _q.identity();
    if (Array.isArray(s)) _s.set(s[0], s[1], s[2]); else _s.set(s, s, s);
    this.add(geo, mat, _m.compose(_p, _q, _s), cast);
  }

  /** Position + yaw (rotation about y) + scale. */
  yaw(geo, mat, x, y, z, yaw = 0, s = 1, cast = false) {
    _q.setFromAxisAngle(_Y.set(0, 1, 0), yaw);
    this.at(geo, mat, x, y, z, _q, s, cast);
  }

  /** Local frame given by axes (local x -> X, local y -> Y (e.g. surface normal), local z -> Z). */
  basis(geo, mat, p, X, Y, Z, s = 1, cast = false) {
    _X.set(X[0], X[1], X[2]); _Y.set(Y[0], Y[1], Y[2]); _Z.set(Z[0], Z[1], Z[2]);
    _m.makeBasis(_X, _Y, _Z);
    if (Array.isArray(s)) _m.scale(_s.set(s[0], s[1], s[2])); else if (s !== 1) _m.scale(_s.set(s, s, s));
    _m.setPosition(p[0], p[1], p[2]);
    this.add(geo, mat, _m, cast);
  }

  /** Stretch a unit geometry (y from 0 to 1) between two points; r = radial scale. */
  between(geo, mat, a, b, r = 1, cast = false) {
    _Y.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const L = _Y.length();
    if (L < 1e-6) return;
    _Y.divideScalar(L);
    if (Math.abs(_Y.y) < 0.95) _X.set(0, 1, 0).cross(_Y).normalize(); else _X.set(1, 0, 0).cross(_Y).normalize();
    _Z.crossVectors(_X, _Y);
    _m.makeBasis(_X.multiplyScalar(r), _Y.multiplyScalar(L), _Z.multiplyScalar(r));
    _m.setPosition(a[0], a[1], a[2]);
    this.add(geo, mat, _m, cast);
  }

  get count() { let n = 0; for (const b of this.buckets.values()) n += b.a.length / 16; return n; }

  build(parent, name = 'inst') {
    for (const b of this.buckets.values()) {
      const n = b.a.length / 16;
      if (!n) continue;
      const im = new THREE.InstancedMesh(b.geo, b.mat, n);
      im.instanceMatrix.array.set(b.a);
      im.instanceMatrix.needsUpdate = true;
      im.computeBoundingSphere();
      im.castShadow = b.cast; im.receiveShadow = true;
      im.name = name + ':' + (b.mat.name || 'mat');
      parent.add(im);
    }
    this.buckets.clear();
  }
}

// ---------------- cached geometries ----------------
const cache = new Map();
function cached(key, fn) { let g = cache.get(key); if (!g) cache.set(key, (g = fn())); return g; }

/** Rivet head: low 3-sided pyramid (local y = out of the plate), radius r. */
export function rivetGeo(r = 0.012) {
  return cached('rivet' + r, () => {
    const h = r * 0.55, p = [];
    const c = [0, 1, 2].map((i) => { const a = (i / 3) * Math.PI * 2; return [Math.cos(a) * r, 0, -Math.sin(a) * r]; });
    for (let i = 0; i < 3; i++) { const a = c[i], b = c[(i + 1) % 3]; p.push(...a, ...b, 0, h, 0); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.computeVertexNormals();
    // soften: blend the face normals with the up axis
    const n = g.attributes.normal;
    for (let i = 0; i < n.count; i++) { const x = n.getX(i) * 0.6, y = n.getY(i) + 0.4, z = n.getZ(i) * 0.6, l = Math.hypot(x, y, z); n.setXYZ(i, x / l, y / l, z / l); }
    g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(18), 2));
    return g;
  });
}

/** Lathe around the y axis from [r, y] pairs (cached by key). */
export function latheGeo(key, pts, seg = 12, phiStart = 0, phiLen = Math.PI * 2) {
  return cached('lathe' + key + '_' + seg, () => new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), seg, phiStart, phiLen));
}

/** Unit box centred at the origin. */
export function unitBox() { return cached('ubox', () => new THREE.BoxGeometry(1, 1, 1)); }
/** Unit box sitting on y = 0 (y 0..1). */
export function unitBoxY() { return cached('uboxY', () => new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0)); }
/** Unit cylinder y 0..1, radius 1. */
export function unitCyl(seg = 8, open = false) { return cached('ucyl' + seg + open, () => new THREE.CylinderGeometry(1, 1, 1, seg, 1, open).translate(0, 0.5, 0)); }
/** Unit sphere. */
export function unitSphere(w = 8, h = 6) { return cached('usph' + w + '_' + h, () => new THREE.SphereGeometry(1, w, h)); }

/** Merge geometries (converted to non-indexed, only position/normal/uv kept). */
export function merge(geos) {
  const list = geos.map((g) => {
    let q = g.index ? g.toNonIndexed() : g.clone();
    for (const k of Object.keys(q.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') q.deleteAttribute(k);
    if (!q.attributes.normal) q.computeVertexNormals();
    if (!q.attributes.uv) q.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(q.attributes.position.count * 2), 2));
    return q;
  });
  return mergeGeometries(list, false);
}

/** Box geometry placed by centre (for building merged prop geometries). */
export function boxG(w, h, d, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rx) g.rotateX(rx); if (ry) g.rotateY(ry); if (rz) g.rotateZ(rz);
  return g.translate(x, y, z);
}
/** Cylinder geometry between two points (for merged prop geometries). */
export function cylG(a, b, r, seg = 8, r2 = r, open = false) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const L = A.distanceTo(B);
  const g = new THREE.CylinderGeometry(r2, r, L, seg, 1, open);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  g.applyQuaternion(q);
  const c = A.add(B).multiplyScalar(0.5);
  return g.translate(c.x, c.y, c.z);
}
/** Rigging fittings for Inst.between (local y 0..1 = along the wire). */
export const bottleScrewGeo = () => cached('bscrew', () => merge([cylG([0.035, 0.1, 0], [0.035, 0.9, 0], 0.012, 5), cylG([-0.035, 0.1, 0], [-0.035, 0.9, 0], 0.012, 5), cylG([0, 0, 0], [0, 0.13, 0], 0.04, 8), cylG([0, 0.87, 0], [0, 1, 0], 0.04, 8)]));
export const rodGeo = () => cached('rod', () => cylG([0, 0, 0], [0, 1, 0], 0.022, 6));
export const shackleGeo = () => cached('shackle', () => merge([cylG([0.03, 0, 0], [0.03, 0.8, 0], 0.01, 5), cylG([-0.03, 0, 0], [-0.03, 0.8, 0], 0.01, 5), new THREE.TorusGeometry(0.03, 0.01, 4, 8, Math.PI).scale(1, 6, 1).translate(0, 0.8, 0), cylG([-0.045, 0, 0], [0.045, 0, 0], 0.012, 5)]));

export function sphG(r, x, y, z, w = 8, h = 6, sy = 1) { const g = new THREE.SphereGeometry(r, w, h); if (sy !== 1) g.scale(1, sy, 1); return g.translate(x, y, z); }
export function torusG(R, r, rs, ts, arc = Math.PI * 2) { return new THREE.TorusGeometry(R, r, rs, ts, arc); }
