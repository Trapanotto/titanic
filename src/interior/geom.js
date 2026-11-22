// Interior kit – geometry generators for detailed props and architecture. Every generator returns a BufferGeometry with
// position / normal / uv (uv in metres unless stated), built once and cached by the caller (props.js `cached`).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const TAU = Math.PI * 2;

/** Box-projected UVs in metres (dominant normal axis). Works on indexed and non-indexed geometry. */
export function metreUV(g, s = 1) {
  if (!g.attributes.normal) g.computeVertexNormals();
  const p = g.attributes.position, n = g.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u, v;
    if (ay >= ax && ay >= az) { u = p.getX(i); v = p.getZ(i); } else if (ax > az) { u = p.getZ(i); v = p.getY(i); } else { u = p.getX(i); v = p.getY(i); }
    uv[i * 2] = u * s; uv[i * 2 + 1] = v * s;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

/** Non-indexed geometry from convex polygons (flat normals). `centre`: polygons are oriented to face away from it (convex solids); else use the given winding. */
export function polysGeo(polys, centre = null) {
  const pos = [], nor = [];
  for (const pts of polys) {
    const a = pts[0];
    let nx = 0, ny = 0, nz = 0;
    for (let i = 1; i < pts.length - 1; i++) {
      const b = pts[i], c = pts[i + 1];
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      nx += uy * vz - uz * vy; ny += uz * vx - ux * vz; nz += ux * vy - uy * vx;
    }
    const l = Math.hypot(nx, ny, nz); if (l < 1e-12) continue;
    nx /= l; ny /= l; nz /= l;
    let flip = false;
    if (centre) {
      let cx = 0, cy = 0, cz = 0; for (const q of pts) { cx += q[0]; cy += q[1]; cz += q[2]; }
      cx /= pts.length; cy /= pts.length; cz /= pts.length;
      if ((cx - centre[0]) * nx + (cy - centre[1]) * ny + (cz - centre[2]) * nz < 0) { flip = true; nx = -nx; ny = -ny; nz = -nz; }
    }
    for (let i = 1; i < pts.length - 1; i++) {
      const tri = flip ? [pts[0], pts[i + 1], pts[i]] : [pts[0], pts[i], pts[i + 1]];
      for (const q of tri) { pos.push(q[0], q[1], q[2]); nor.push(nx, ny, nz); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return metreUV(g);
}

/** Box (centred) with all 12 edges chamfered by b – 44 triangles, crisp highlights on the edges. */
export function bevelBox(sx, sy, sz, b = 0.01) {
  const hx = sx / 2, hy = sy / 2, hz = sz / 2;
  b = Math.min(b, hx * 0.45, hy * 0.45, hz * 0.45);
  if (b <= 1e-5) return polysGeo(boxPolys(hx, hy, hz), [0, 0, 0]);
  const V = (i, j, k, t) => [i * (t === 0 ? hx : hx - b), j * (t === 1 ? hy : hy - b), k * (t === 2 ? hz : hz - b)];
  const S = [-1, 1], polys = [];
  for (const s of S) {
    polys.push([V(s, -1, -1, 0), V(s, 1, -1, 0), V(s, 1, 1, 0), V(s, -1, 1, 0)]);
    polys.push([V(-1, s, -1, 1), V(1, s, -1, 1), V(1, s, 1, 1), V(-1, s, 1, 1)]);
    polys.push([V(-1, -1, s, 2), V(1, -1, s, 2), V(1, 1, s, 2), V(-1, 1, s, 2)]);
  }
  for (const i of S) for (const j of S) {
    polys.push([V(i, j, -1, 0), V(i, j, -1, 1), V(i, j, 1, 1), V(i, j, 1, 0)]); // x-y edges along z
    polys.push([V(i, -1, j, 0), V(i, -1, j, 2), V(i, 1, j, 2), V(i, 1, j, 0)]); // x-z edges along y
    polys.push([V(-1, i, j, 1), V(-1, i, j, 2), V(1, i, j, 2), V(1, i, j, 1)]); // y-z edges along x
  }
  for (const i of S) for (const j of S) for (const k of S) polys.push([V(i, j, k, 0), V(i, j, k, 1), V(i, j, k, 2)]);
  return polysGeo(polys, [0, 0, 0]);
}
function boxPolys(hx, hy, hz) {
  const out = [];
  for (const s of [-1, 1]) {
    out.push([[s * hx, -hy, -hz], [s * hx, hy, -hz], [s * hx, hy, hz], [s * hx, -hy, hz]]);
    out.push([[-hx, s * hy, -hz], [hx, s * hy, -hz], [hx, s * hy, hz], [-hx, s * hy, hz]]);
    out.push([[-hx, -hy, s * hz], [hx, -hy, s * hz], [hx, hy, s * hz], [-hx, hy, s * hz]]);
  }
  return out;
}

/** Frustum: bottom rect sx0×sz0 at y=0, top rect sx1×sz1 at y=h (tapered legs, plinths, raised panels). faces: skip 'bottom'/'top' with opts. */
export function frustum(sx0, sz0, sx1, sz1, h, { bottom = true, top = true, dx = 0, dz = 0 } = {}) {
  const a = (x, z) => [x * sx0 / 2, 0, z * sz0 / 2], c = (x, z) => [dx + x * sx1 / 2, h, dz + z * sz1 / 2];
  const polys = [
    [a(1, -1), a(1, 1), c(1, 1), c(1, -1)], [a(-1, -1), a(-1, 1), c(-1, 1), c(-1, -1)],
    [a(-1, 1), a(1, 1), c(1, 1), c(-1, 1)], [a(-1, -1), a(1, -1), c(1, -1), c(-1, -1)],
  ];
  if (top) polys.push([c(-1, -1), c(1, -1), c(1, 1), c(-1, 1)]);
  if (bottom) polys.push([a(-1, -1), a(1, -1), a(1, 1), a(-1, 1)]);
  return polysGeo(polys, [dx / 2, h / 2, dz / 2]);
}

/** Raised-and-fielded panel facing +x: base w (z) × h (y) in the plane x = 0, field raised to x = t, bevel width e. 10 triangles. */
export function fielded(w, h, t = 0.012, e = 0.035) {
  const hw = w / 2, hh = h / 2, iw = Math.max(0.005, hw - e), ih = Math.max(0.005, hh - e);
  const B = (z, y) => [0, y, z], F = (z, y) => [t, y, z];
  return polysGeo([
    [F(-iw, -ih), F(iw, -ih), F(iw, ih), F(-iw, ih)],
    [B(-hw, -hh), B(hw, -hh), F(iw, -ih), F(-iw, -ih)], [B(-hw, hh), B(hw, hh), F(iw, ih), F(-iw, ih)],
    [B(-hw, -hh), B(-hw, hh), F(-iw, ih), F(-iw, -ih)], [B(hw, -hh), B(hw, hh), F(iw, ih), F(iw, -ih)],
  ], [-1, 0, 0]);
}

/** Lathe around +y. profile: [[r, y], ...] from bottom to top (r = 0 closes an end). */
export function lathe(profile, seg = 16, phiStart = 0, phiLength = TAU, orient = true) {
  // a profile running downwards (hanging fixtures) would face inwards: reverse it (orient = false keeps inner surfaces)
  const n = profile.length;
  if (orient && n > 2) {
    const closed = profile[0][0] < 1e-6 && profile[n - 1][0] < 1e-6;
    let area = 0; for (let i = 0; i < n; i++) { const [a, b] = profile[i], [c, d] = profile[(i + 1) % n]; area += a * d - c * b; }
    if (closed && area < 0) profile = [...profile].reverse();
  }
  const pts = profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 0), y));
  const g = new THREE.LatheGeometry(pts, seg, phiStart, phiLength); // bottom→top profile faces outwards
  return metreUV(g);
}

/**
 * Revolve with modulation: perimeter loop (unit circle by default, or any closed loop of {x, z, nx, nz}) swept through rows
 * {o: offset along the outward normal, y, m: wave amplitude}. wave = sin(k·angle + ph). Used for drapes, pleated shades,
 * cut-glass bowls, fluted shafts, barrels. capTop/capBottom close the ends with a fan.
 */
export function revolve(rows, { seg = 24, k = 0, ph = 0, perim = null, capTop = false, capBottom = false, wave = null } = {}) {
  const P = perim ?? Array.from({ length: seg }, (_, i) => { const a = (i / seg) * TAU; return { x: 0, z: 0, nx: Math.cos(a), nz: -Math.sin(a), a }; });
  const n = P.length, pos = [], idx = [];
  const W = wave ?? ((p, i) => Math.sin(k * (p.a ?? (i / n) * TAU) + ph));
  for (const r of rows) for (let i = 0; i < n; i++) { const p = P[i], o = r.o + (r.m ?? 0) * W(p, i); pos.push(p.x + p.nx * o, r.y, p.z + p.nz * o); }
  for (let j = 0; j < rows.length - 1; j++) for (let i = 0; i < n; i++) {
    const a = j * n + i, b = j * n + ((i + 1) % n), c = (j + 1) * n + i, d = (j + 1) * n + ((i + 1) % n);
    idx.push(a, b, d, a, d, c);
  }
  const cap = (row, up) => {
    const base = pos.length / 3; let cx = 0, cz = 0; for (const p of P) { cx += p.x; cz += p.z; }
    pos.push(cx / n, rows[row].y, cz / n);
    for (let i = 0; i < n; i++) { const a = row * n + i, b = row * n + ((i + 1) % n); if (up) idx.push(base, a, b); else idx.push(base, b, a); }
  };
  if (capTop) cap(rows.length - 1, true);
  if (capBottom) cap(0, false);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  // orientation: rows bottom→top with outward normals gives CCW when viewed from outside for (a, b, d); verify by sign
  g.computeVertexNormals();
  return metreUV(g);
}
/** Closed rounded-rectangle loop (w along x, d along z, corner radius rc) for revolve(): {x,z,nx,nz,a(arc fraction·2π)}. */
export function rectLoop(w, d, rc = 0.03, n = 3, step = 0) {
  const out = [], hw = Math.max(0, w / 2 - rc), hd = Math.max(0, d / 2 - rc);
  const C = [[hw, -hd], [-hw, -hd], [-hw, hd], [hw, hd]]; // corner centres in the same rotational sense as revolve's circle
  for (let q = 0; q < 4; q++) {
    for (let i = 0; i <= n; i++) {
      const a = (q + i / n) * (Math.PI / 2), nx = Math.cos(a), nz = -Math.sin(a);
      out.push({ x: C[q][0] + nx * rc, z: C[q][1] + nz * rc, nx, nz });
    }
    if (step > 0) { // subdivide the straight edge to the next corner
      const a = ((q + 1) * Math.PI) / 2, nx = Math.cos(a), nz = -Math.sin(a), A = C[q], B = C[(q + 1) % 4];
      const L = Math.hypot(B[0] - A[0], B[1] - A[1]), m = Math.floor(L / step);
      for (let k = 1; k < m; k++) { const t = k / m; out.push({ x: A[0] + (B[0] - A[0]) * t + nx * rc, z: A[1] + (B[1] - A[1]) * t + nz * rc, nx, nz }); }
    }
  }
  let L = 0; const s = [0];
  for (let i = 1; i < out.length; i++) { L += Math.hypot(out[i].x - out[i - 1].x, out[i].z - out[i - 1].z); s.push(L); }
  L += Math.hypot(out[0].x - out[out.length - 1].x, out[0].z - out[out.length - 1].z);
  out.forEach((p, i) => { p.a = (s[i] / L) * TAU; });
  return out;
}

/** Superquadric cushion / mattress / pillow / sack: size sx × sy × sz, bottom at y = 0. e1 vertical, e2 horizontal roundness (0.1 boxy … 1 round). */
export function pillow(sx, sy, sz, e1 = 0.4, e2 = 0.25, nu = 6, nv = 16, sag = 0) {
  const pos = [], idx = [];
  const f = (w, e) => Math.sign(w) * Math.pow(Math.abs(w), e);
  for (let i = 0; i <= nu; i++) {
    const u = -Math.PI / 2 + (i / nu) * Math.PI, cu = Math.cos(u), su = Math.sin(u);
    for (let j = 0; j < nv; j++) {
      const v = -Math.PI + (j / nv) * TAU + Math.PI / nv, cv = Math.cos(v), sv = Math.sin(v);
      const x = (sx / 2) * f(cu, e1) * f(cv, e2), z = (sz / 2) * f(cu, e1) * f(sv, e2);
      let y = (sy / 2) * f(su, e1) + sy / 2;
      if (sag && y > sy * 0.5) y -= sag * (1 - Math.min(1, (x * x) / ((sx * sx) / 4) + (z * z) / ((sz * sz) / 4)));
      pos.push(x, y, z);
    }
  }
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    const a = i * nv + j, b = i * nv + ((j + 1) % nv), c = (i + 1) * nv + j, d = (i + 1) * nv + ((j + 1) % nv);
    idx.push(a, d, b, a, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return metreUV(g);
}

/**
 * Button-tufted (chesterfield) surface facing +x: w (z) × h (y), buttons on a diamond lattice nz × ny, pulled back by
 * `depth`, puffed out by `puff`; edges at x = 0. res = grid steps between two buttons.
 */
export function tufted(w, h, nz = 4, ny = 3, depth = 0.02, puff = 0.035, res = 3) {
  const gz = nz * res * 2, gy = ny * res * 2, pos = [], idx = [];
  const btn = [];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nz + (j % 2 ? 0 : -1) + 1; i++) {
    const z = -w / 2 + (w / nz) * (i + (j % 2 ? 0.5 : 0) + (j % 2 ? 0 : 0.5)), y = -h / 2 + (h / ny) * (j + 0.5);
    if (Math.abs(z) < w / 2 - 0.02) btn.push([z, y]);
  }
  const rad = Math.min(w / nz, h / ny) * 0.32;
  for (let j = 0; j <= gy; j++) for (let i = 0; i <= gz; i++) {
    const z = -w / 2 + (w * i) / gz, y = -h / 2 + (h * j) / gy;
    const ez = Math.min(1, (w / 2 - Math.abs(z)) / (w * 0.12)), ey = Math.min(1, (h / 2 - Math.abs(y)) / (h * 0.12));
    let x = puff * Math.sqrt(Math.max(0, ez * ey));
    for (const [bz, by] of btn) { const d2 = ((z - bz) ** 2 + (y - by) ** 2) / (rad * rad); if (d2 < 9) x -= depth * Math.exp(-d2 * 1.6) * Math.min(ez, ey); }
    pos.push(Math.max(0, x), y, z);
  }
  for (let j = 0; j < gy; j++) for (let i = 0; i < gz; i++) {
    const a = j * (gz + 1) + i, b = a + 1, c = a + gz + 1, d = c + 1;
    idx.push(a, d, b, a, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.userData.buttons = btn;
  return metreUV(g);
}

/**
 * Loft: sweep a circle / ellipse along a polyline with per-point radius. radii: number | [r...] | [[rx, ry]...].
 * caps: close both ends. Good for cabriole legs, arms, fronds, scroll bars, figures.
 */
export function loft(points, radii, seg = 8, caps = true, twistUp = [0, 1, 0]) {
  const P = points.map((p) => new THREE.Vector3(...p)), n = P.length;
  const R = (i) => { const r = Array.isArray(radii) ? radii[i] : radii; return Array.isArray(r) ? r : [r, r]; };
  const T = [], N = [], B = [];
  for (let i = 0; i < n; i++) {
    const t = new THREE.Vector3().subVectors(P[Math.min(n - 1, i + 1)], P[Math.max(0, i - 1)]).normalize();
    T.push(t);
  }
  let nrm = new THREE.Vector3(...twistUp);
  if (Math.abs(nrm.dot(T[0])) > 0.9) nrm = new THREE.Vector3(1, 0, 0);
  if (Math.abs(nrm.dot(T[0])) > 0.9) nrm = new THREE.Vector3(0, 0, 1);
  for (let i = 0; i < n; i++) {
    nrm = nrm.clone().sub(T[i].clone().multiplyScalar(nrm.dot(T[i]))).normalize();
    N.push(nrm); B.push(new THREE.Vector3().crossVectors(T[i], nrm).normalize());
  }
  const pos = [], nor = [], uv = [], idx = [];
  for (let i = 0; i < n; i++) {
    const [rx, ry] = R(i);
    for (let j = 0; j <= seg; j++) {
      const a = (j / seg) * TAU, c = Math.cos(a), s = Math.sin(a);
      const d = N[i].clone().multiplyScalar(c * rx).add(B[i].clone().multiplyScalar(s * ry));
      pos.push(P[i].x + d.x, P[i].y + d.y, P[i].z + d.z);
      const dn = N[i].clone().multiplyScalar(c / Math.max(rx, 1e-5)).add(B[i].clone().multiplyScalar(s / Math.max(ry, 1e-5))).normalize();
      nor.push(dn.x, dn.y, dn.z); uv.push(j / seg, i / (n - 1));
    }
  }
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < seg; j++) {
    const a = i * (seg + 1) + j, b = a + 1, c = a + seg + 1, d = c + 1;
    idx.push(a, d, c, a, b, d);
  }
  if (caps) for (const [i, dir] of [[0, -1], [n - 1, 1]]) {
    if (Math.max(...R(i)) < 1e-4) continue;
    const base = pos.length / 3;
    pos.push(P[i].x, P[i].y, P[i].z); nor.push(T[i].x * dir, T[i].y * dir, T[i].z * dir); uv.push(0.5, 0.5);
    for (let j = 0; j <= seg; j++) { const k = i * (seg + 1) + j; pos.push(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]); nor.push(T[i].x * dir, T[i].y * dir, T[i].z * dir); uv.push(0.5, 0.5); }
    for (let j = 0; j < seg; j++) { if (dir > 0) idx.push(base, base + 1 + j, base + 2 + j); else idx.push(base, base + 2 + j, base + 1 + j); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/**
 * Hanging curtain / drape (two-sided sheet) in the yz plane: width w along z, from y = 0 down to y = −h, `folds` waves of
 * amplitude amp along x; `tie` (0..1) gathers the lower part towards z = tieZ (tied-back curtain).
 */
export function curtain(w, h, folds = 4, amp = 0.025, tie = 0, tieZ = 0, nz = 0, ny = 6) {
  nz = nz || Math.max(8, folds * 4);
  const pos = [], idx = [], rows = ny + 1, cols = nz + 1;
  for (const side of [1, -1]) {
    const base = pos.length / 3;
    for (let j = 0; j < rows; j++) {
      const t = j / ny, y = -h * t, g = tie * Math.sin(Math.min(1, t * 1.6) * Math.PI * 0.5) * (t < 0.7 ? 1 : 1 - (t - 0.7) * 1.2);
      for (let i = 0; i < cols; i++) {
        const s = i / nz, z0 = -w / 2 + w * s, z = z0 + (tieZ - z0) * g, A = amp * (1 + g), k = (folds * Math.PI * 2) / Math.max(0.05, w * (1 - g));
        const x = A * Math.sin(s * folds * Math.PI * 2), dx = A * k * Math.cos(s * folds * Math.PI * 2), l = Math.hypot(1, dx);
        pos.push(x + (side * 0.003) / l, y, z - (side * 0.003 * dx) / l);
      }
    }
    for (let j = 0; j < ny; j++) for (let i = 0; i < nz; i++) {
      const a = base + j * cols + i, b = a + 1, c = a + cols, d = c + 1;
      if (side > 0) idx.push(a, d, c, a, b, d); else idx.push(a, c, d, a, d, b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return metreUV(g);
}

/**
 * Closed curved wall (barrel chair back, curved screen): radius r (outer), thickness t, from angle a0 over al (angle as in
 * lathe: point = (sin a·r, y, cos a·r)), bottom y0, height h(u) with u = 0..1 along the arc. Outer, inner, top, bottom, ends.
 */
export function arcWall(r, t, a0, al, y0, h, seg = 16) {
  const H = typeof h === 'function' ? h : () => h, polys = [];
  const P = (rr, u, y) => { const a = a0 + al * u; return [Math.sin(a) * rr, y, Math.cos(a) * rr]; };
  for (let i = 0; i < seg; i++) {
    const u0 = i / seg, u1 = (i + 1) / seg, h0 = y0 + H(u0), h1 = y0 + H(u1);
    polys.push([P(r, u0, y0), P(r, u1, y0), P(r, u1, h1), P(r, u0, h0)]);                  // outer
    polys.push([P(r - t, u0, y0), P(r - t, u0, h0), P(r - t, u1, h1), P(r - t, u1, y0)]);  // inner
    polys.push([P(r, u0, h0), P(r, u1, h1), P(r - t, u1, h1), P(r - t, u0, h0)]);          // top
    polys.push([P(r, u0, y0), P(r - t, u0, y0), P(r - t, u1, y0), P(r, u1, y0)]);          // bottom
  }
  polys.push([P(r, 0, y0), P(r, 0, y0 + H(0)), P(r - t, 0, y0 + H(0)), P(r - t, 0, y0)]);
  polys.push([P(r, 1, y0), P(r - t, 1, y0), P(r - t, 1, y0 + H(1)), P(r, 1, y0 + H(1))]);
  const g = polysGeo(polys, null); // windings above are outward by construction
  // smooth the outer / inner normals radially (flat facets otherwise)
  const p = g.attributes.position, n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), rr = Math.hypot(x, z), nx = n.getX(i), nz = n.getZ(i), ny = n.getY(i);
    if (Math.abs(ny) > 0.5 || rr < 1e-6) continue;
    const ox = x / rr, oz = z / rr, d = nx * ox + nz * oz;
    if (Math.abs(d) > 0.9) n.setXYZ(i, Math.sign(d) * ox, 0, Math.sign(d) * oz);
  }
  return g;
}

/** Palm frond along +x (rachis arching up then drooping), two rows of leaflets; for double-sided materials. */
export function frond(len = 0.9, n = 12, rise = 0.25, droop = 0.55, seed = 1) {
  let s = seed; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const pos = [];
  const P = (t) => [t * len, rise * Math.sin(t * Math.PI * 0.6) - droop * t * t, 0];
  const tri = (a, b, c) => pos.push(...a, ...b, ...c);
  for (let i = 0; i < 10; i++) { // rachis as a thin ribbon
    const a = P(i / 10), b = P((i + 1) / 10), w = 0.008 * (1 - i / 12);
    tri([a[0], a[1], -w], [b[0], b[1], -w], [b[0], b[1], w]); tri([a[0], a[1], -w], [b[0], b[1], w], [a[0], a[1], w]);
  }
  for (let i = 1; i <= n; i++) {
    const t = 0.12 + (0.86 * i) / n, base = P(t), L = (0.06 + 0.28 * Math.sin(Math.PI * Math.min(1, t * 1.1))) * (0.85 + rnd() * 0.3);
    for (const sd of [-1, 1]) {
      const tip = [base[0] + L * 0.45, base[1] - L * (0.35 + 0.3 * t), base[2] + sd * L * 0.85], mid = [(base[0] + tip[0]) / 2 + 0.01, (base[1] + tip[1]) / 2 + 0.015, (base[2] + tip[2]) / 2];
      const w = 0.018 + 0.01 * (1 - t);
      tri(base, [mid[0] - w, mid[1], mid[2]], tip); tri(base, tip, [mid[0] + w, mid[1], mid[2]]);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return metreUV(g);
}

/** Heap (coal, sand): w (z) × d (x) footprint, height h, lumpy surface; bottom at y = 0, open bottom. */
export function heap(w, d, h, nx = 10, nz = 14, seed = 3) {
  let s = seed; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const pos = [], idx = [], peaks = [[0, 0, 1], [-d * 0.1, -w * 0.26, 0.7], [d * 0.05, w * 0.27, 0.62]];
  for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) {
    const x = -d / 2 + (d * i) / nx, z = -w / 2 + (w * j) / nz;
    let y = 0;
    for (const [px, pz, k] of peaks) { const r = Math.hypot((x - px) / (d * 0.5), (z - pz) / (w * 0.36)); y = Math.max(y, h * k * Math.max(0, 1 - r) ** 1.2); }
    if (i === 0 || j === 0 || i === nx || j === nz) y = 0; else if (y > 0) y += (rnd() - 0.5) * 0.06;
    pos.push(x, Math.max(0, y), z);
  }
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { const a = i * (nz + 1) + j, b = a + 1, c = a + nz + 1, e = c + 1; idx.push(a, b, e, a, e, c); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return metreUV(g);
}

/** Smooth tube through points (Catmull-Rom). */
export function tube(points, r, tseg = 16, rseg = 8, closed = false) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), closed, 'centripetal');
  return new THREE.TubeGeometry(curve, tseg, r, rseg, closed);
}

/** Extruded 2D outline (points [[a, b], …] in the shape plane) – extruded along +z by depth, centred; optional bevel. */
export function extrude(outline, depth, bevel = 0, curveSeg = 6) {
  const s = outline instanceof THREE.Shape ? outline : new THREE.Shape(outline.map(([a, b]) => new THREE.Vector2(a, b)));
  const g = new THREE.ExtrudeGeometry(s, {
    depth: Math.max(1e-4, depth - 2 * bevel), bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelOffset: -bevel, bevelSegments: 1, curveSegments: curveSeg,
  });
  g.translate(0, 0, -depth / 2 + bevel);
  g.computeVertexNormals();
  return metreUV(g);
}

/**
 * Flat dial / clock face disc of radius r with 0..1 texture UVs, facing `face` ('x' | '-x' | 'z' | '-z' | 'y'). Seen from
 * in front of the face the texture is upright (+v = world +y; for 'y': +v = −x) and unmirrored (+u = viewer's right).
 * (Cylinder caps and lathes map their UVs along z / around the axis: dials drawn with them come out sideways or mirrored.)
 */
export function dialDisc(r, seg = 24, face = 'x') {
  const g = new THREE.CircleGeometry(r, seg); // faces +z, u → +x, v → +y
  if (face === 'x') g.rotateY(Math.PI / 2);
  else if (face === '-x') g.rotateY(-Math.PI / 2);
  else if (face === '-z') g.rotateY(Math.PI);
  else if (face === 'y') { g.rotateZ(Math.PI / 2); g.rotateX(-Math.PI / 2); }
  return g;
}

/** RoundedBoxGeometry (centred) with metre UVs. */
export function roundBox(sx, sy, sz, r = 0.02, seg = 1) { return metreUV(new RoundedBoxGeometry(sx, sy, sz, seg, r)); }

/** Set all UVs of a geometry to the centre of atlas cell `i` (8 × 8 palette, see batch.js ATLAS). */
export function atlasCell(g, i) {
  const u = ((i % 8) + 0.5) / 8, v = 1 - (Math.floor(i / 8) + 0.5) / 8, n = g.attributes.position.count, a = new Float32Array(n * 2);
  for (let k = 0; k < n; k++) { a[k * 2] = u; a[k * 2 + 1] = v; }
  g.setAttribute('uv', new THREE.BufferAttribute(a, 2));
  return g;
}
/** Map a BoxGeometry's per-face 0..1 UVs into atlas cell i (keeps the in-cell pattern, e.g. gilt bands on book spines). */
export function atlasBox(sx, sy, sz, i) {
  const g = new THREE.BoxGeometry(sx, sy, sz), uv = g.attributes.uv, cu = i % 8, cv = Math.floor(i / 8);
  for (let k = 0; k < uv.count; k++) uv.setXY(k, (cu + 0.08 + 0.84 * uv.getX(k)) / 8, 1 - (cv + 1) / 8 + (0.04 + 0.92 * uv.getY(k)) / 8);
  return g;
}

/** Merge geometries (all non-indexed position/normal/uv) into one. */
export function mergeAll(list) {
  let n = 0; const gs = list.map((g) => { const q = g.index ? g.toNonIndexed() : g; n += q.attributes.position.count; return q; });
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2);
  let o = 0;
  for (const g of gs) {
    if (!g.attributes.normal) g.computeVertexNormals();
    P.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3);
    if (g.attributes.uv) U.set(g.attributes.uv.array, o * 2);
    o += g.attributes.position.count;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(N, 3)); g.setAttribute('uv', new THREE.BufferAttribute(U, 2));
  return g;
}
