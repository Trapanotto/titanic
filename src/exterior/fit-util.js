import * as THREE from 'three';
import { mats } from '../core/materials.js';
import { DECK_Y, BOAT_HOUSES, BOAT_LOW_ROOFS, hullHalfWidth } from '../core/constants.js';

// Shared helpers for the exterior fittings (funnels, masts, boats, deck gear).

export const BY = DECK_Y.boat;
export const RY = DECK_Y.roof;
export const LOW_ROOF_Y = DECK_Y.boat + 1.4;

/** 1 px rigging lines that stay visible from far away (drawn in addition to thin prisms). */
export const lineMat = new THREE.LineBasicMaterial({ color: 0x24262a, transparent: true, opacity: 0.55 });
lineMat.name = 'fitRigLine';

const _up = new THREE.Vector3(0, 1, 0);
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3(), _u = new THREE.Vector3(), _v = new THREE.Vector3();

const cylCache = new Map();
/** Unit cylinder (bottom radius 1, top radius `ratio`, height 1), cached. */
export function cylGeo(seg = 8, ratio = 1, open = false) {
  const k = seg + '_' + Math.round(ratio * 200) + '_' + (open ? 1 : 0);
  let g = cylCache.get(k);
  if (!g) cylCache.set(k, (g = new THREE.CylinderGeometry(ratio, 1, 1, seg, 1, open)));
  return g;
}

/** Cylinder from a to b, radius r at a and r2 at b. Shares cached unit geometry. */
export function cyl(mat, ax, ay, az, bx, by, bz, r = 0.05, seg = 8, r2 = r, cast = false, open = false) {
  _a.set(ax, ay, az); _b.set(bx, by, bz);
  const len = _a.distanceTo(_b);
  const m = new THREE.Mesh(cylGeo(seg, r2 / r, open), mat);
  m.scale.set(r, len, r);
  m.position.copy(_a).add(_b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(_up, _b.sub(_a).normalize());
  m.castShadow = cast; m.receiveShadow = true;
  return m;
}
/** Vertical cylinder standing on y0. */
export function vcyl(mat, x, y0, z, h, r, seg = 8, r2 = r, cast = false) {
  return cyl(mat, x, y0, z, x, y0 + h, z, r, seg, r2, cast);
}

const sphCache = new Map();
/** Open unit cylinder seen from the INSIDE (reversed winding, inward normals). */
let _inCyl = null;
export function innerCylGeo(seg = 16) {
  if (_inCyl && _inCyl.seg === seg) return _inCyl.g;
  const g = new THREE.CylinderGeometry(1, 1, 1, seg, 1, true);
  const idx = g.index.array;
  for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
  const n = g.attributes.normal.array;
  for (let i = 0; i < n.length; i++) n[i] = -n[i];
  _inCyl = { seg, g };
  return g;
}

export function ball(mat, x, y, z, r, ws = 8, hs = 6, sy = 1) {
  const k = ws + '_' + hs;
  let g = sphCache.get(k);
  if (!g) sphCache.set(k, (g = new THREE.SphereGeometry(1, ws, hs)));
  const m = new THREE.Mesh(g, mat);
  m.position.set(x, y, z); m.scale.set(r, r * sy, r);
  m.receiveShadow = true;
  return m;
}

export function mk(geo, mat, x = 0, y = 0, z = 0, cast = false) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = cast; m.receiveShadow = true;
  return m;
}

/** Height of the surface one stands on / puts roof gear on at (x, z) in the boat-deck area. */
export function roofAt(x, z) {
  const az = Math.abs(z);
  for (const h of BOAT_HOUSES) if (x > h.x0 && x < h.x1 && az < h.hw) return RY;
  for (const h of BOAT_LOW_ROOFS) if (x > h.x0 && x < h.x1 && az < h.hw) return LOW_ROOF_Y;
  return BY;
}

/** Half width of the deck edge (outer hull surface) and its slope d(hw)/dx at station x for a deck above C. */
export function edge(x) { return hullHalfWidth(x, DECK_Y.boat); }
export function edgeSlope(x) { return (edge(x + 0.25) - edge(x - 0.25)) / 0.5; }

/**
 * Collects thin wires/ropes as 3-sided prisms in ONE geometry (+ optional 1px line segments).
 */
export class Wires {
  constructor(material = mats.iron, lines = true) { this.material = material; this.lines = lines; this.pos = []; this.lpos = []; }
  seg(ax, ay, az, bx, by, bz, r = 0.02) {
    _a.set(ax, ay, az); _b.set(bx, by, bz);
    _d.subVectors(_b, _a);
    if (_d.lengthSq() < 1e-8) return this;
    _d.normalize();
    _u.set(0, 1, 0); if (Math.abs(_d.y) > 0.9) _u.set(1, 0, 0);
    _u.cross(_d).normalize(); _v.crossVectors(_d, _u);
    const p = this.pos, o = [];
    for (let k = 0; k < 3; k++) {
      const an = (k * Math.PI * 2) / 3, c = Math.cos(an) * r, s = Math.sin(an) * r;
      o.push(_u.x * c + _v.x * s, _u.y * c + _v.y * s, _u.z * c + _v.z * s);
    }
    for (let k = 0; k < 3; k++) {
      const k2 = (k + 1) % 3;
      const a0x = ax + o[k * 3], a0y = ay + o[k * 3 + 1], a0z = az + o[k * 3 + 2];
      const a1x = ax + o[k2 * 3], a1y = ay + o[k2 * 3 + 1], a1z = az + o[k2 * 3 + 2];
      const b0x = bx + o[k * 3], b0y = by + o[k * 3 + 1], b0z = bz + o[k * 3 + 2];
      const b1x = bx + o[k2 * 3], b1y = by + o[k2 * 3 + 1], b1z = bz + o[k2 * 3 + 2];
      p.push(a0x, a0y, a0z, a1x, a1y, a1z, b1x, b1y, b1z, a0x, a0y, a0z, b1x, b1y, b1z, b0x, b0y, b0z);
    }
    if (this.lines) this.lpos.push(ax, ay, az, bx, by, bz);
    return this;
  }
  /** Hanging wire with a parabolic sag (metres at mid span). */
  sag(ax, ay, az, bx, by, bz, sag = 0.5, n = 8, r = 0.02) {
    let px = ax, py = ay, pz = az;
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      const x = ax + (bx - ax) * t, y = ay + (by - ay) * t - 4 * sag * t * (1 - t), z = az + (bz - az) * t;
      this.seg(px, py, pz, x, y, z, r);
      px = x; py = y; pz = z;
    }
    return this;
  }
  /** Position on a sagging wire. */
  static sagPoint(ax, ay, az, bx, by, bz, sag, t) {
    return [ax + (bx - ax) * t, ay + (by - ay) * t - 4 * sag * t * (1 - t), az + (bz - az) * t];
  }
  build(name = 'wires') {
    const g = new THREE.Group(); g.name = name;
    if (this.pos.length) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
      geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, this.material);
      m.receiveShadow = false;
      g.add(m);
    }
    if (this.lines && this.lpos.length) {
      const lg = new THREE.BufferGeometry();
      lg.setAttribute('position', new THREE.Float32BufferAttribute(this.lpos, 3));
      g.add(new THREE.LineSegments(lg, lineMat));
    }
    return g;
  }
}

/** Geometry from a rows x cols grid of points; fn(i, j) -> [x, y, z]. flip reverses the winding. */
export function gridGeo(rows, cols, fn, flip = false) {
  const pos = new Float32Array(rows * cols * 3), uv = new Float32Array(rows * cols * 2), idx = [];
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
    const p = fn(i, j), k = i * cols + j;
    pos[k * 3] = p[0]; pos[k * 3 + 1] = p[1]; pos[k * 3 + 2] = p[2];
    uv[k * 2] = i / (rows - 1); uv[k * 2 + 1] = j / (cols - 1);
  }
  for (let i = 0; i < rows - 1; i++) for (let j = 0; j < cols - 1; j++) {
    const a = i * cols + j, b = a + 1, c = a + cols, d = c + 1;
    if (flip) idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Lathe mesh from [r, y] pairs. */
export function lathe(mat, pts, seg = 12, x = 0, y = 0, z = 0, cast = false) {
  const g = new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), seg);
  return mk(g, mat, x, y, z, cast);
}

/** Simple rotated box (not cached by geo.js when rotated – uses geo.js cache through `boxFn`). */
export function place(mesh, parent, rx = 0, ry = 0, rz = 0) {
  mesh.rotation.set(rx, ry, rz);
  parent.add(mesh);
  return mesh;
}
