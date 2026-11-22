import * as THREE from 'three';

// Geometry accumulator: everything static of the exterior structure is written as quads/triangles into one
// buffer per material (+ shadow flag) and turned into a handful of meshes by flush(). UVs are in metres.

const FACES = {
  px: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]],
  nx: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]],
  py: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]],
  ny: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]],
  pz: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]],
  nz: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]],
};
const FACE_KEYS = Object.keys(FACES);
const ORDER = [0, 1, 2, 0, 2, 3];

export class Batch {
  constructor() { this.bufs = new Map(); this.cast = false; }

  _buf(mat) {
    const k = mat.uuid + (this.cast ? 'c' : '');
    let b = this.bufs.get(k);
    if (!b) this.bufs.set(k, (b = { mat, cast: this.cast, p: [], n: [], u: [] }));
    return b;
  }

  _emit(mat, P, idx, nx, ny, nz, normals) {
    const B = this._buf(mat);
    const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
    const mode = ay >= 0.7 ? 0 : (az >= ax ? 1 : 2);
    for (const i of idx) {
      const p = P[i];
      B.p.push(p[0], p[1], p[2]);
      if (normals) B.n.push(normals[i][0], normals[i][1], normals[i][2]); else B.n.push(nx, ny, nz);
      if (mode === 0) B.u.push(p[0], p[2]); else if (mode === 1) B.u.push(p[0], p[1]); else B.u.push(p[2], p[1]);
    }
  }

  /** Triangle a,b,c counter-clockwise seen from its front. */
  tri(mat, a, b, c, normals = null) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz);
    if (l < 1e-10) return;
    nx /= l; ny /= l; nz /= l;
    this._emit(mat, [a, b, c], [0, 1, 2], nx, ny, nz, normals);
  }

  /** Quad a,b,c,d counter-clockwise seen from its front. Optional per-vertex normals. */
  quad(mat, a, b, c, d, normals = null) {
    const P = [a, b, c, d];
    let nx = 0, ny = 0, nz = 0;
    for (let i = 0; i < 4; i++) {
      const p = P[i], q = P[(i + 1) % 4];
      nx += (p[1] - q[1]) * (p[2] + q[2]); ny += (p[2] - q[2]) * (p[0] + q[0]); nz += (p[0] - q[0]) * (p[1] + q[1]);
    }
    const l = Math.hypot(nx, ny, nz);
    if (l < 1e-10) return;
    nx /= l; ny /= l; nz /= l;
    this._emit(mat, P, ORDER, nx, ny, nz, normals);
  }

  /** Quad whose front faces along `hint` (winding chosen automatically). */
  oquad(mat, a, b, c, d, hint) {
    const nx = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]);
    const ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
    const nz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    if (nx * hint[0] + ny * hint[1] + nz * hint[2] >= 0) this.quad(mat, a, b, c, d); else this.quad(mat, d, c, b, a);
  }

  /** Triangle whose front faces along `hint`. */
  otri(mat, a, b, c, hint) {
    const nx = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]);
    const ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
    const nz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    if (nx * hint[0] + ny * hint[1] + nz * hint[2] >= 0) this.tri(mat, a, b, c); else this.tri(mat, a, c, b);
  }

  /**
   * Raised "plate" on a curved surface. S(u, v, out) -> [x,y,z] maps surface coordinates to space, N(u,v) -> outward normal.
   * Emits the front face (at out1) and the four sides (out0..out1) of the rectangle u0..u1 / v0..v1.
   */
  plate(mat, S, N, u0, u1, v0, v1, out0, out1, sides = true) {
    const n = N((u0 + u1) / 2, (v0 + v1) / 2);
    this.oquad(mat, S(u0, v0, out1), S(u1, v0, out1), S(u1, v1, out1), S(u0, v1, out1), n);
    if (!sides) return;
    const c = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
    const mu = (u0 + u1) / 2, mv = (v0 + v1) / 2;
    for (let i = 0; i < 4; i++) {
      const [a, b] = [c[i], c[(i + 1) % 4]];
      const pa = S(a[0], a[1], out0), pb = S(b[0], b[1], out0), qb = S(b[0], b[1], out1), qa = S(a[0], a[1], out1);
      const m = S((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, out1), cc = S(mu, mv, out1);
      this.oquad(mat, pa, pb, qb, qa, [m[0] - cc[0], m[1] - cc[1], m[2] - cc[2]]);
    }
  }

  /**
   * Profiled ring (cast lip, porthole-like rim) on a surface: S(u, v, out), centre (cu, cv), radii ru, rv,
   * profile [[scale, out], ...] from the outside inwards. Inner end is closed with `holeMat` at the last profile point.
   */
  ring(mat, S, N, cu, cv, ru, rv, profile, seg = 16, holeMat = null) {
    const P = (i, k) => { const t = (i / seg) * Math.PI * 2, [sc, o] = profile[k]; return S(cu + Math.cos(t) * ru * sc, cv + Math.sin(t) * rv * sc, o); };
    const n = N(cu, cv);
    const c = S(cu, cv, 0);
    for (let k = 0; k < profile.length - 1; k++) for (let i = 0; i < seg; i++) {
      const a = P(i, k), b = P(i + 1, k), d = P(i, k + 1), e = P(i + 1, k + 1);
      // hint: average of outward normal and radial direction, depending on profile slope
      const m = [(a[0] + b[0]) / 2 - c[0], (a[1] + b[1]) / 2 - c[1], (a[2] + b[2]) / 2 - c[2]];
      const ds = profile[k + 1][0] - profile[k][0], dout = profile[k + 1][1] - profile[k][1];
      // tangent of the profile in (radial, normal) space is (ds, dout); its outward perpendicular is (dout, -ds) -> radial*dout + normal*(-ds)
      const ml = Math.hypot(m[0], m[1], m[2]) || 1;
      const hint = [m[0] / ml * dout * 10 - n[0] * ds * 10, m[1] / ml * dout * 10 - n[1] * ds * 10, m[2] / ml * dout * 10 - n[2] * ds * 10];
      if (Math.abs(ds) < 1e-6 && Math.abs(dout) < 1e-6) continue;
      this.oquad(mat, a, b, e, d, hint);
    }
    if (holeMat) {
      const k = profile.length - 1, cc = S(cu, cv, profile[k][1]);
      for (let i = 0; i < seg; i++) this.otri(holeMat, cc, P(i, k), P(i + 1, k), n);
    }
  }

  /**
   * Oriented box: corner o, edge vectors U, V, W (right-handed, like x,y,z).
   * opts.skip: string with face keys to omit ('px nx py ny pz nz'), opts.m: {faceKey: material} overrides.
   */
  obox(mat, o, U, V, W, opts = null) {
    const skip = opts?.skip || '', m = opts?.m;
    const c = (i, j, k) => [o[0] + i * U[0] + j * V[0] + k * W[0], o[1] + i * U[1] + j * V[1] + k * W[1], o[2] + i * U[2] + j * V[2] + k * W[2]];
    for (const f of FACE_KEYS) {
      if (skip.includes(f)) continue;
      const q = FACES[f];
      this.quad((m && m[f]) || mat, c(...q[0]), c(...q[1]), c(...q[2]), c(...q[3]));
    }
  }

  /** Axis-aligned box from two corners. */
  box(mat, x0, y0, z0, x1, y1, z1, opts = null) {
    const ax = Math.min(x0, x1), ay = Math.min(y0, y1), az = Math.min(z0, z1);
    this.obox(mat, [ax, ay, az], [Math.abs(x1 - x0), 0, 0], [0, Math.abs(y1 - y0), 0], [0, 0, Math.abs(z1 - z0)], opts);
  }

  /** Rectangular bar between two points; w = horizontal width, h = height of the section. */
  beam(mat, a, b, w, h, opts = null) {
    let ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const L = Math.hypot(ux, uy, uz);
    if (L < 1e-6) return;
    ux /= L; uy /= L; uz /= L;
    // side = U x up
    let sx = -uz, sy = 0, sz = ux;
    let sl = Math.hypot(sx, sz);
    if (sl < 1e-5) { sx = 1; sz = 0; sl = 1; }
    sx /= sl; sz /= sl;
    // V = S x U (up-ish), W = U x V
    const vx = sy * uz - sz * uy, vy = sz * ux - sx * uz, vz = sx * uy - sy * ux;
    const wx = uy * vz - uz * vy, wy = uz * vx - ux * vz, wz = ux * vy - uy * vx;
    const o = [a[0] - vx * h / 2 - wx * w / 2, a[1] - vy * h / 2 - wy * w / 2, a[2] - vz * h / 2 - wz * w / 2];
    this.obox(mat, o, [ux * L, uy * L, uz * L], [vx * h, vy * h, vz * h], [wx * w, wy * w, wz * w], opts);
  }

  /** Cylinder between two points (smooth normals). */
  cyl(mat, a, b, r, seg = 6, caps = false, r2 = r) {
    let ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const L = Math.hypot(ux, uy, uz);
    if (L < 1e-6) return;
    ux /= L; uy /= L; uz /= L;
    let sx, sy, sz;
    if (Math.abs(uy) > 0.99) { sx = 1; sy = 0; sz = 0; } else { sx = -uz; sy = 0; sz = ux; const l = Math.hypot(sx, sz); sx /= l; sz /= l; }
    const tx = uy * sz - uz * sy, ty = uz * sx - ux * sz, tz = ux * sy - uy * sx;
    const ring = [];
    for (let i = 0; i <= seg; i++) {
      const t = (i / seg) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
      ring.push([c * sx + s * tx, c * sy + s * ty, c * sz + s * tz]);
    }
    for (let i = 0; i < seg; i++) {
      const n0 = ring[i], n1 = ring[i + 1];
      const p0 = [a[0] + n0[0] * r, a[1] + n0[1] * r, a[2] + n0[2] * r], p1 = [a[0] + n1[0] * r, a[1] + n1[1] * r, a[2] + n1[2] * r];
      const q0 = [b[0] + n0[0] * r2, b[1] + n0[1] * r2, b[2] + n0[2] * r2], q1 = [b[0] + n1[0] * r2, b[1] + n1[1] * r2, b[2] + n1[2] * r2];
      // orientation: make the quad face outwards
      const A = [p0, q0, q1, p1], N = [n0, n0, n1, n1];
      const ex = q0[0] - p0[0], ey = q0[1] - p0[1], ez = q0[2] - p0[2], fx = p1[0] - p0[0], fy = p1[1] - p0[1], fz = p1[2] - p0[2];
      const cx = ey * fz - ez * fy, cy = ez * fx - ex * fz, cz = ex * fy - ey * fx;
      if (cx * n0[0] + cy * n0[1] + cz * n0[2] >= 0) this.quad(mat, A[0], A[1], A[2], A[3], N);
      else this.quad(mat, A[3], A[2], A[1], A[0], [N[3], N[2], N[1], N[0]]);
      if (caps) {
        const up = [ux, uy, uz], dn = [-ux, -uy, -uz];
        const fa = [a, p0, p1], fb = [b, q1, q0];
        for (const [T, n] of [[fa, dn], [fb, up]]) {
          const e1 = [T[1][0] - T[0][0], T[1][1] - T[0][1], T[1][2] - T[0][2]], e2 = [T[2][0] - T[0][0], T[2][1] - T[0][1], T[2][2] - T[0][2]];
          const d = (e1[1] * e2[2] - e1[2] * e2[1]) * n[0] + (e1[2] * e2[0] - e1[0] * e2[2]) * n[1] + (e1[0] * e2[1] - e1[1] * e2[0]) * n[2];
          if (d >= 0) this.tri(mat, T[0], T[1], T[2]); else this.tri(mat, T[0], T[2], T[1]);
        }
      }
    }
  }

  /** Create one mesh per material/shadow flag in `group`. */
  flush(group) {
    for (const b of this.bufs.values()) {
      if (!b.p.length) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(b.p), 3));
      g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(b.n), 3));
      g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(b.u), 2));
      g.computeBoundingSphere();
      const mesh = new THREE.Mesh(g, b.mat);
      mesh.castShadow = b.cast; mesh.receiveShadow = true;
      mesh.name = 'structure:' + (b.mat.name || 'mat');
      group.add(mesh);
    }
    this.bufs.clear();
  }
}
