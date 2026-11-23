// People – small mesh builder for the figure parts: ring stacks (lathe / loft with superellipse cross sections),
// ellipsoids, surface patches with thickness. Every vertex carries a palette slot (see SLOT in parts.js); normals
// are smooth inside a piece, creases are made by starting a new row or piece. Output: BufferGeometry with
// position / normal / slot.
import * as THREE from 'three';

const TAU = Math.PI * 2;
const se = (c, p) => (p === 2 ? c : Math.sign(c) * Math.pow(Math.abs(c), 2 / p));

export class Geo {
  constructor() { this.P = []; this.N = []; this.S = []; this.I = []; }
  get nv() { return this.P.length / 3; }
  v(x, y, z, s) { this.P.push(x, y, z); this.N.push(0, 0, 0); this.S.push(s); return this.P.length / 3 - 1; }
  t(a, b, c) { this.I.push(a, b, c); }

  /** Smooth normals for vertices v0.. and triangles t0.. (area weighted); twins: rows that must share normals. */
  _smooth(v0, t0, twins = [], poles = [], orient = null) {
    const P = this.P, N = this.N, I = this.I;
    if (orient) {
      // make the piece face outwards (away from orient(x, y, z) -> [cx, cy, cz])
      let s = 0;
      for (let k = t0; k < I.length; k += 3) {
        const a = I[k] * 3, b = I[k + 1] * 3, c = I[k + 2] * 3;
        const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2];
        const wx = P[c] - P[a], wy = P[c + 1] - P[a + 1], wz = P[c + 2] - P[a + 2];
        const nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
        const mx = (P[a] + P[b] + P[c]) / 3, my = (P[a + 1] + P[b + 1] + P[c + 1]) / 3, mz = (P[a + 2] + P[b + 2] + P[c + 2]) / 3;
        const o = orient(mx, my, mz);
        s += nx * (mx - o[0]) + ny * (my - o[1]) + nz * (mz - o[2]);
      }
      if (s < 0) for (let k = t0; k < I.length; k += 3) { const q = I[k + 1]; I[k + 1] = I[k + 2]; I[k + 2] = q; }
    }
    for (let k = t0; k < I.length; k += 3) {
      const a = I[k] * 3, b = I[k + 1] * 3, c = I[k + 2] * 3;
      const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2];
      const wx = P[c] - P[a], wy = P[c + 1] - P[a + 1], wz = P[c + 2] - P[a + 2];
      const nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
      for (const q of [a, b, c]) { N[q] += nx; N[q + 1] += ny; N[q + 2] += nz; }
    }
    const avg = (list) => {
      let x = 0, y = 0, z = 0;
      for (const i of list) { x += N[i * 3]; y += N[i * 3 + 1]; z += N[i * 3 + 2]; }
      for (const i of list) { N[i * 3] = x; N[i * 3 + 1] = y; N[i * 3 + 2] = z; }
    };
    for (const [ra, rb, n] of twins) for (let i = 0; i < n; i++) avg([ra + i, rb + i]);
    for (const [r, n] of poles) { const l = []; for (let i = 0; i < n; i++) l.push(r + i); avg(l); }
    for (let i = v0 * 3; i < N.length; i += 3) {
      const l = Math.hypot(N[i], N[i + 1], N[i + 2]);
      if (l < 1e-12) { N[i] = 0; N[i + 1] = 1; N[i + 2] = 0; } else { N[i] /= l; N[i + 1] /= l; N[i + 2] /= l; }
    }
  }

  /**
   * Stack of rings along an axis ('y': rings in the xz plane, 'x': rings in the yz plane).
   * ring: { t (position along the axis), cu, cv (centre), ru, rv (radii; u = x for axis y, y for axis x; v = z),
   *         slot, p (superellipse exponent, 2 = ellipse), crease (sharp edge below this ring) }
   * opts: seg, arc [a0, a1] (open shell), mod(j, a, ring) -> radial offset, along(j, a, ring) -> offset along the axis,
   *       slotFn(j, a, ring) -> slot | undefined, capB / capT (flat caps), clampU [min, max], inward (flip faces).
   * Angle a = 0 points to +u (front for axis y), a = π/2 to +v.
   */
  rings(rings, o = {}) {
    if (this.f !== undefined) rings = rings.filter((r) => (r.l || 0) <= this.f); // rings marked l: n only from detail level n
    const seg = o.seg || 8, axis = o.axis || 'y', arc = o.arc || null;
    const nA = arc ? seg + 1 : seg;
    const v0 = this.nv, t0 = this.I.length;
    const twins = [], poles = [];
    const ang = (i) => (arc ? arc[0] + ((arc[1] - arc[0]) * i) / seg : (i / seg) * TAU);
    const pt = (j, r, a) => {
      const p = r.p ?? o.p ?? 2, d = o.mod ? o.mod(j, a, r) : 0;
      let u = (r.cu || 0) + (r.ru + (r.ru > 0 ? d : 0)) * se(Math.cos(a), p);
      const w = (r.cv || 0) + (r.rv + (r.rv > 0 ? d : 0)) * se(Math.sin(a), p);
      if (o.clampU) u = Math.min(o.clampU[1], Math.max(o.clampU[0], u));
      const t = r.t + (o.along ? o.along(j, a, r) : 0);
      return axis === 'y' ? [u, t, w] : [t, u, w];
    };
    const row = (j, slotOverride) => {
      const r = rings[j], base = this.nv;
      for (let i = 0; i < nA; i++) {
        const a = ang(i), q = pt(j, r, a);
        let s = slotOverride ?? r.slot ?? 0;
        if (slotOverride === undefined && o.slotFn) { const f = o.slotFn(j, a, r, q); if (f !== undefined) s = f; }
        this.v(q[0], q[1], q[2], s);
      }
      if (r.ru === 0 && r.rv === 0) poles.push([base, nA]);
      return base;
    };
    const up = rings.map((_, j) => row(j));
    for (let j = 0; j < rings.length - 1; j++) {
      const B = up[j], r1 = rings[j + 1];
      let T = up[j + 1];
      const s0 = rings[j].slot ?? 0, s1 = r1.slot ?? 0;
      if (s0 !== s1 || r1.crease) {
        T = row(j + 1, s0);
        if (!r1.crease) twins.push([T, up[j + 1], nA]);
      }
      for (let i = 0; i < seg; i++) {
        const i1 = arc ? i + 1 : (i + 1) % seg;
        const a = B + i, b = B + i1, c = T + i, d = T + i1;
        this.t(a, c, b); this.t(b, c, d);
      }
    }
    const centre = (x, y, z) => {
      const t = axis === 'y' ? y : x;
      // centre of the nearest ring along the axis
      let best = rings[0], bd = Infinity;
      for (const r of rings) { const dd = Math.abs(r.t - t); if (dd < bd) { bd = dd; best = r; } }
      return axis === 'y' ? [best.cu || 0, y, best.cv || 0] : [x, best.cu || 0, best.cv || 0];
    };
    this._smooth(v0, t0, twins, poles, o.orient === false ? null : centre);
    if (o.inward) this.flip(v0, t0);
    if (o.capB || o.capT) for (const [j, on] of [[0, o.capB], [rings.length - 1, o.capT]]) {
      if (!on) continue;
      const r = rings[j], cv0 = this.nv, ct0 = this.I.length;
      const c = axis === 'y' ? [r.cu || 0, r.t, r.cv || 0] : [r.t, r.cu || 0, r.cv || 0];
      const m = this.v(c[0], c[1], c[2], r.slot ?? 0);
      const b = row(j, r.slot ?? 0);
      for (let i = 0; i < seg; i++) this.t(m, b + i, b + (arc ? i + 1 : (i + 1) % seg));
      const dir = j === 0 ? -1 : 1;
      this._smooth(cv0, ct0, [], [], (x, y, z) => (axis === 'y' ? [x, y - dir, z] : [x - dir, y, z]));
      for (let i = cv0 * 3; i < this.N.length; i += 3) { if (axis === 'y') { this.N[i] = 0; this.N[i + 1] = dir; this.N[i + 2] = 0; } else { this.N[i] = dir; this.N[i + 1] = 0; this.N[i + 2] = 0; } }
    }
    return this;
  }

  /** Ellipsoid (rings along y), optional per-vertex slot / radial modulation. */
  ellipsoid(cx, cy, cz, rx, ry, rz, slot, seg = 8, nr = 0, o = {}) {
    nr = nr || Math.max(3, Math.round(seg / 2));
    const rings = [];
    for (let k = 0; k <= nr; k++) {
      const ph = -Math.PI / 2 + (Math.PI * k) / nr, c = Math.cos(ph);
      rings.push({ t: cy + ry * Math.sin(ph), cu: cx, cv: cz, ru: k === 0 || k === nr ? 0 : rx * c, rv: k === 0 || k === nr ? 0 : rz * c, slot });
    }
    return this.rings(rings, { seg, ...o });
  }

  /**
   * Surface patch with thickness: f(u, v, off) -> [x, y, z] for u, v in [0, 1]; top at offset `top`, walls down to
   * `bot`. slotFn(u, v) -> slot. Smooth top, separate walls (crease at the edge).
   */
  patch(nu, nv, f, slot, { top = 0.006, bot = 0, slotFn = null, walls = true, orient = null } = {}) {
    const v0 = this.nv, t0 = this.I.length, W = nu + 1;
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
      const q = f(i / nu, j / nv, top);
      this.v(q[0], q[1], q[2], slotFn ? slotFn(i / nu, j / nv) : slot);
    }
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const a = v0 + j * W + i, b = a + 1, c = a + W, d = c + 1;
      this.t(a, c, b); this.t(b, c, d);
    }
    this._smooth(v0, t0, [], [], orient);
    if (!walls) return this;
    // walls along the boundary (u = 0, u = 1, v = 0, v = 1)
    const edge = (pts) => {
      const w0 = this.nv, wt0 = this.I.length;
      for (const [u, v] of pts) {
        const a = f(u, v, top), b = f(u, v, bot), s = slotFn ? slotFn(u, v) : slot;
        this.v(a[0], a[1], a[2], s); this.v(b[0], b[1], b[2], s);
      }
      for (let k = 0; k < pts.length - 1; k++) { const a = w0 + k * 2; this.t(a, a + 1, a + 2); this.t(a + 2, a + 1, a + 3); }
      this._smooth(w0, wt0, [], [], (x, y, z) => {
        // walls face away from the patch centre
        const c = f(0.5, 0.5, bot);
        return c;
      });
    };
    const L = [];
    for (let i = 0; i <= nu; i++) L.push([i / nu, 0]);
    edge(L);
    L.length = 0; for (let i = 0; i <= nu; i++) L.push([i / nu, 1]); edge(L);
    L.length = 0; for (let j = 0; j <= nv; j++) L.push([0, j / nv]); edge(L);
    L.length = 0; for (let j = 0; j <= nv; j++) L.push([1, j / nv]); edge(L);
    return this;
  }

  flip(v0, t0) {
    const I = this.I, N = this.N;
    for (let k = t0; k < I.length; k += 3) { const q = I[k + 1]; I[k + 1] = I[k + 2]; I[k + 2] = q; }
    for (let i = v0 * 3; i < N.length; i++) N[i] = -N[i];
  }

  /** Apply a THREE.Matrix4 to everything added by fn(). */
  xf(m, fn) {
    const v0 = this.nv;
    fn(this);
    const nm = new THREE.Matrix3().getNormalMatrix(m), e = m.elements, n = nm.elements, P = this.P, N = this.N;
    for (let i = v0 * 3; i < P.length; i += 3) {
      const x = P[i], y = P[i + 1], z = P[i + 2];
      P[i] = e[0] * x + e[4] * y + e[8] * z + e[12]; P[i + 1] = e[1] * x + e[5] * y + e[9] * z + e[13]; P[i + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
      const a = N[i], b = N[i + 1], c = N[i + 2];
      const nx = n[0] * a + n[3] * b + n[6] * c, ny = n[1] * a + n[4] * b + n[7] * c, nz = n[2] * a + n[5] * b + n[8] * c, l = Math.hypot(nx, ny, nz) || 1;
      N[i] = nx / l; N[i + 1] = ny / l; N[i + 2] = nz / l;
    }
    return this;
  }

  get tris() { return this.I.length / 3; }

  toGeometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.P, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.N, 3));
    g.setAttribute('slot', new THREE.Float32BufferAttribute(this.S, 1));
    g.setIndex(this.nv < 65536 ? new THREE.Uint16BufferAttribute(this.I, 1) : new THREE.Uint32BufferAttribute(this.I, 1));
    g.computeBoundingSphere();
    return g;
  }
}

/** THREE.Matrix4 from translation + Euler (XYZ order, radians). */
export function mat(tx = 0, ty = 0, tz = 0, rx = 0, ry = 0, rz = 0, s = 1) {
  const m = new THREE.Matrix4();
  m.compose(new THREE.Vector3(tx, ty, tz), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), new THREE.Vector3(s, s, s));
  return m;
}
