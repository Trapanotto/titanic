// Interior kit – prop core: builder (PB), registry, template baking, placement and shared sub-assemblies
// (turned legs, drawers, panelled doors, knobs, cushions, bedding, place settings, small lamps).
// Every prop: function(opts) -> THREE.Group, origin at floor level in the centre of its footprint, FRONT FACING +x.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mats as M } from '../core/materials.js';
import { tiledBoxGeometry } from '../core/geo.js';
import { kitMats as K, AT } from './batch.js';
import * as G from './geom.js';
import { TIER } from '../core/tier.js';

/** fine modelling level 0..3 (docs/CONTRACT.md "Detail levels"); read at build time only */
export const FINE = () => TIER.fine ?? 3;

const geo = new Map();
export function cached(key, make) { let g = geo.get(key); if (!g) geo.set(key, (g = make())); return g; }
/** Deck streaming: forget the cached part geometries and prop templates (rebuilt on demand, frees memory). */
export function flushKitCaches() { geo.clear(); templates.clear(); }
const r3 = (v) => Math.round(v * 1000);
/** global detail factor for round parts (segments of lathes, lofts, cushions, cylinders); 1 = as authored */
export const DETAIL = { q: 0.5 };
const S = (n, min) => Math.min(n, Math.max(min, Math.round(n * DETAIL.q)));
/** segment floor by radius: big round parts stay smooth, small ones get cheap */
const MINSEG = (r) => (r > 0.3 ? 16 : r > 0.15 ? 12 : r > 0.07 ? 8 : r > 0.03 ? 6 : 5);
export const TAU = Math.PI * 2;

/** frame moulding profiles (rows for G.frameMould) by moulding width b */
export const MOULD = {
  bead: (b) => [{ o: 0, y: 0 }, { o: -b * 0.5, y: b * 0.55 }, { o: -b, y: 0 }],
  bolection: (b) => [{ o: 0, y: 0 }, { o: -b * 0.2, y: b * 0.5 }, { o: -b * 0.45, y: b * 0.8 }, { o: -b * 0.75, y: b * 0.45 }, { o: -b, y: 0 }],
  frame: (b) => [{ o: 0, y: 0 }, { o: 0, y: b * 0.5 }, { o: -b * 0.3, y: b * 0.8 }, { o: -b * 0.65, y: b * 0.55 }, { o: -b, y: b * 0.3 }, { o: -b, y: 0 }],
};
/** slab edge profiles (rows for G.mouldedSlab) by slab thickness t; o = 0 is the nominal outline */
export const EDGE = {
  thumb: (t) => [{ o: -0.006, y: 0 }, { o: 0, y: t * 0.35 }, { o: 0, y: t * 0.65 }, { o: -0.006, y: t }],
  ovolo: (t) => [{ o: -0.012, y: 0 }, { o: -0.004, y: t * 0.2 }, { o: 0, y: t * 0.45 }, { o: -0.002, y: t * 0.8 }, { o: -0.008, y: t }],
  ogee: (t) => [{ o: -0.016, y: 0 }, { o: -0.012, y: t * 0.15 }, { o: -0.004, y: t * 0.3 }, { o: 0, y: t * 0.55 }, { o: 0, y: t * 0.75 }, { o: -0.003, y: t * 0.9 }, { o: -0.009, y: t }],
  // crown moulding of a carcass top: widest at the top, coved back below
  crown: (t) => [{ o: -0.03, y: 0 }, { o: -0.026, y: t * 0.2 }, { o: -0.018, y: t * 0.35 }, { o: -0.008, y: t * 0.55 }, { o: -0.002, y: t * 0.72 }, { o: 0, y: t * 0.8 }, { o: 0, y: t }],
  // plinth / skirting: widest at the bottom
  plinth: (t) => [{ o: 0, y: 0 }, { o: 0, y: t * 0.55 }, { o: -0.006, y: t * 0.7 }, { o: -0.014, y: t * 0.85 }, { o: -0.018, y: t }],
};

/** Builder used inside prop definitions. Sizes: sx (depth, local x), sy (height), sz (width, local z); y = bottom. */
export class PB {
  constructor() { this.g = new THREE.Group(); }
  _add(geometry, mat, x, y, z) { const m = new THREE.Mesh(geometry, mat); m.position.set(x, y, z); this.g.add(m); return m; }
  /** raw geometry at x,y,z (no offset) */
  add(geometry, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) { const m = this._add(geometry, mat, x, y, z); m.rotation.set(rx, ry, rz); return m; }
  b(mat, sx, sy, sz, x = 0, y = 0, z = 0) { return this._add(tiledBoxGeometry(sx, sy, sz), mat, x, y + sy / 2, z); }
  /** chamfered box, bottom at y */
  bb(mat, sx, sy, sz, x = 0, y = 0, z = 0, bev = 0.008) {
    return this._add(cached(`bb${r3(sx)}_${r3(sy)}_${r3(sz)}_${r3(bev)}`, () => G.bevelBox(sx, sy, sz, bev)), mat, x, y + sy / 2, z);
  }
  /** vertical cylinder, bottom at y */
  c(mat, r, h, x = 0, y = 0, z = 0, seg = 8, rTop = r) {
    seg = S(seg, MINSEG(Math.max(r, rTop)));
    return this._add(cached(`c${r3(r)}_${r3(rTop)}_${r3(h)}_${seg}`, () => new THREE.CylinderGeometry(rTop, r, h, seg)), mat, x, y + h / 2, z);
  }
  /** horizontal cylinder along x, centred */
  cx(mat, r, len, x = 0, y = 0, z = 0, seg = 8) { const m = this.c(mat, r, len, x, y - len / 2, z, seg); m.rotation.z = Math.PI / 2; return m; }
  /** horizontal cylinder along z, centred */
  cz(mat, r, len, x = 0, y = 0, z = 0, seg = 8) { const m = this.c(mat, r, len, x, y - len / 2, z, seg); m.rotation.x = Math.PI / 2; return m; }
  /** sphere / ellipsoid centred at x,y,z */
  s(mat, r, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, lo = true) {
    const m = this._add(cached(lo ? 'slo' : 'shi', () => (lo ? new THREE.SphereGeometry(1, 6, 4) : new THREE.SphereGeometry(1, 14, 10))), mat, x, y, z);
    m.scale.set(r * sx, r * sy, r * sz); return m;
  }
  /** torus; axis = normal of the ring plane */
  t(mat, R, r, x = 0, y = 0, z = 0, axis = 'x', seg = 16, rs = 6) {
    seg = S(seg, Math.max(8, MINSEG(R))); rs = S(rs, 3);
    const m = this._add(cached(`t${r3(R)}_${r3(r)}_${seg}_${rs}`, () => new THREE.TorusGeometry(R, r, rs, seg)), mat, x, y, z);
    if (axis === 'x') m.rotation.y = Math.PI / 2; else if (axis === 'y') m.rotation.x = Math.PI / 2;
    return m;
  }
  /** lathe profile [[r, y], ...] (bottom→top) placed with its axis at x,z, base at y */
  lathe(mat, profile, x = 0, y = 0, z = 0, seg = 16) {
    seg = S(seg, MINSEG(Math.max(...profile.map((q) => q[0]))));
    return this._add(cached('l' + seg + JSON.stringify(profile.map(([a, b]) => [r3(a), r3(b)])), () => G.lathe(profile, seg)), mat, x, y, z);
  }
  /** lathe lying along x (axis = local x), profile y → along +x from x */
  latheX(mat, profile, x = 0, y = 0, z = 0, seg = 16, dir = 1) { const m = this.lathe(mat, profile, x, y, z, seg); m.rotation.z = -dir * Math.PI / 2; return m; }
  latheZ(mat, profile, x = 0, y = 0, z = 0, seg = 16, dir = 1) { const m = this.lathe(mat, profile, x, y, z, seg); m.rotation.x = dir * Math.PI / 2; return m; }
  /** superquadric cushion, bottom at y */
  pil(mat, sx, sy, sz, x = 0, y = 0, z = 0, e1 = 0.4, e2 = 0.25, nu = 5, nv = 14, sag = 0) {
    nv = S(nv, 8);
    return this._add(cached(`p${r3(sx)}_${r3(sy)}_${r3(sz)}_${r3(e1)}_${r3(e2)}_${nu}_${nv}_${r3(sag)}`, () => G.pillow(sx, sy, sz, e1, e2, nu, nv, sag)), mat, x, y, z);
  }
  /** frustum (tapered block), bottom at y */
  fr(mat, sx0, sz0, sx1, sz1, h, x = 0, y = 0, z = 0, o = {}) {
    return this._add(cached(`f${r3(sx0)}_${r3(sz0)}_${r3(sx1)}_${r3(sz1)}_${r3(h)}_${!!o.bottom}_${o.top !== false}_${r3(o.dx ?? 0)}_${r3(o.dz ?? 0)}`, () => G.frustum(sx0, sz0, sx1, sz1, h, { bottom: !!o.bottom, top: o.top !== false, dx: o.dx ?? 0, dz: o.dz ?? 0 })), mat, x, y, z);
  }
  /** raised & fielded panel facing +x, centre (y, z) at x */
  fp(mat, w, h, x, y, z, t = 0.012, e = 0.035) { return this._add(cached(`fp${r3(w)}_${r3(h)}_${r3(t)}_${r3(e)}`, () => G.fielded(w, h, t, e)), mat, x, y, z); }
  /** moulded frame facing +x: outer w (z) × h (y), moulding width bw, back plane at x, centre (y, z); kind: MOULD key */
  mf(mat, w, h, x, y, z, bw = 0.02, kind = 'bead') {
    return this._add(cached(`mf${r3(w)}_${r3(h)}_${r3(bw)}_${kind}`, () => G.frameMould(w, h, MOULD[kind](bw))), mat, x, y, z);
  }
  /** slab d (x) × w (z) × t with a moulded edge (EDGE key), bottom at y; rc corner radius, n corner steps */
  ms(mat, d, t, w, x = 0, y = 0, z = 0, kind = 'ovolo', rc = 0.01, n = 1) {
    return this._add(cached(`ms${r3(d)}_${r3(t)}_${r3(w)}_${kind}_${r3(rc)}_${n}`, () => G.mouldedSlab(d, w, EDGE[kind](t), { rc, n, bottom: true })), mat, x, y, z);
  }
  loft(mat, pts, radii, seg = 8, caps = true) { return this._add(G.loft(pts, radii, S(seg, 3), caps), mat, 0, 0, 0); }
  tube(mat, pts, r, tseg = 16, rseg = 6, closed = false) { return this._add(G.tube(pts, r, S(tseg, 6), S(rseg, 3), closed), mat, 0, 0, 0); }
  /** extruded outline in the yz plane (a = z, b = y), thickness along x, centred at x */
  extX(mat, outline, depth, x = 0, y = 0, z = 0, bevel = 0) { const m = this._add(G.extrude(outline, depth, bevel), mat, x, y, z); m.rotation.y = Math.PI / 2; return m; }
  /** extruded outline in the xy plane (a = x, b = y), thickness along z */
  extZ(mat, outline, depth, x = 0, y = 0, z = 0, bevel = 0) { return this._add(G.extrude(outline, depth, bevel), mat, x, y, z); }
  /** extruded outline in the xz plane (a = x, b = −z), thickness along y, bottom at y */
  extY(mat, outline, depth, x = 0, y = 0, z = 0, bevel = 0) { const m = this._add(G.extrude(outline, depth, bevel), mat, x, y + depth / 2, z); m.rotation.x = -Math.PI / 2; return m; }
  rev(mat, rows, o, x = 0, y = 0, z = 0) { if (!o.wave && !o.perim) o = { ...o, seg: S(o.seg ?? 24, Math.max(8, MINSEG(Math.max(...rows.map((q) => q.o))))) }; return this._add(G.revolve(rows, o), mat, x, y, z); }
  /** dial / clock face disc (centre x,y,z) facing 'x' | '-x' | 'z' | '-z', texture upright and unmirrored from the front */
  dial(mat, r, x = 0, y = 0, z = 0, face = 'x', seg = 24) {
    seg = S(seg, MINSEG(r));
    return this._add(cached(`dial${r3(r)}_${seg}_${face}`, () => G.dialDisc(r, seg, face)), mat, x, y, z);
  }
  /** atlas-coloured box (bottom at y) */
  ab(cell, sx, sy, sz, x = 0, y = 0, z = 0, band = false) {
    return this._add(cached(`ab${r3(sx)}_${r3(sy)}_${r3(sz)}_${cell}_${band}`, () => (band ? G.atlasBox(sx, sy, sz, cell) : G.atlasCell(new THREE.BoxGeometry(sx, sy, sz), cell))), K.atlas, x, y + sy / 2, z);
  }
  /** atlas-coloured lathe */
  alathe(cell, profile, x = 0, y = 0, z = 0, seg = 10) {
    seg = S(seg, MINSEG(Math.max(...profile.map((q) => q[0]))));
    return this._add(cached(`al${cell}_${seg}` + JSON.stringify(profile.map(([a, b]) => [r3(a), r3(b)])), () => G.atlasCell(G.lathe(profile, seg), cell)), K.atlas, x, y, z);
  }
  /** atlas-coloured geometry */
  ag(cell, geometry, x = 0, y = 0, z = 0) { return this._add(G.atlasCell(geometry, cell), K.atlas, x, y, z); }
}

const _det = new THREE.Matrix4();
function bakeTemplate(root) {
  root.updateMatrixWorld(true);
  const by = new Map();
  root.traverse((o) => {
    if (!o.isMesh) return;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.clearGroups();
    g.applyMatrix4(o.matrixWorld);
    if (_det.copy(o.matrixWorld).determinant() < 0) { // mirrored: flip winding
      for (const a of Object.values(g.attributes)) {
        const arr = a.array, n = a.itemSize;
        for (let i = 0; i < arr.length; i += 3 * n) for (let k = 0; k < n; k++) { const t = arr[i + k]; arr[i + k] = arr[i + 2 * n + k]; arr[i + 2 * n + k] = t; }
      }
    }
    let a = by.get(o.material); if (!a) by.set(o.material, (a = []));
    a.push(g);
  });
  const parts = [];
  for (const [mat, list] of by) parts.push({ mat, geo: list.length === 1 ? list[0] : mergeGeometries(list, false) });
  return parts;
}
export { bakeTemplate as _bakeTemplate };

/** Registry of all props by name. */
export const PROPS = {};
const templates = new Map();

// Cache key for prop options. NOT JSON.stringify: that calls toJSON() on materials/textures first, which
// serialises whole images (seconds per call).
function optKey(v) {
  if (v === null || v === undefined) return '';
  const t = typeof v;
  if (t === 'number' || t === 'boolean') return String(v);
  if (t === 'string') return JSON.stringify(v);
  if (t === 'function') return 'fn';
  if (v.uuid) return '#' + (v.name || v.uuid);
  if (Array.isArray(v)) return '[' + v.map(optKey).join(',') + ']';
  return '{' + Object.keys(v).map((k) => k + ':' + optKey(v[k])).join(',') + '}';
}

/** Optional usage hook for tools (prop statistics, tools/ scripts): use(name, key, opts, template). Null in the app. */
export const PROP_HOOK = { use: null };

/** Define a prop: fp = [w, d, h] or fn(opts) → [w, d, h]; build(p: PB, opts). */
export function def(name, fp, build) {
  const fn = (o = {}) => {
    const key = name + '|' + optKey(o);
    let t = templates.get(key);
    if (!t) {
      const p = new PB();
      build(p, o);
      t = { parts: bakeTemplate(p.g), fp: typeof fp === 'function' ? fp(o) : fp };
      templates.set(key, t);
    }
    if (PROP_HOOK.use) PROP_HOOK.use(name, key, o, t);
    const g = new THREE.Group();
    for (const part of t.parts) g.add(new THREE.Mesh(part.geo, part.mat));
    g.userData.fp = { w: t.fp[0], d: t.fp[1], h: t.fp[2] };
    g.userData.prop = name;
    g.userData.po = o; // the options it was built with (fixtures that can be operated: app/fixtures.js)
    return g;
  };
  fn.fp = (o = {}) => { const a = typeof fp === 'function' ? fp(o) : fp; return { w: a[0], d: a[1], h: a[2] }; };
  PROPS[name] = fn;
  return fn;
}

/**
 * Put a prop into a parent group at world position (x, y, z), rotated by rotY (radians, 0 = facing +x, PI/2 = facing -z).
 * opts.collide + opts.world → registers an AABB collider from the footprint.
 */
export function place(parent, prop, x, y, z, rotY = 0, opts = {}) {
  prop.position.set(x, y, z);
  prop.rotation.y = rotY;
  parent.add(prop);
  if (opts.collide && opts.world && prop.userData.fp) {
    const { w, d, h } = prop.userData.fp, c = Math.abs(Math.cos(rotY)), s = Math.abs(Math.sin(rotY));
    const ex = (d * c + w * s) / 2, ez = (d * s + w * c) / 2;
    opts.world.addCollider(x - ex, y, z - ez, x + ex, y + Math.max(h, 0.5), z + ez);
  }
  return prop;
}
/** Rotation that makes a prop face the world direction (dx, dz). */
export const faceDir = (dx, dz) => Math.atan2(-dz, dx);

/** small deterministic RNG for template variation */
export function rngOf(seed) { let a = (seed * 2654435761) >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ============================================================ shared sub-assemblies

/** turned leg (lathe): r = max radius, base on y */
export function turnedLeg(p, mat, h, x, z, r = 0.025, y = 0, seg = 8) {
  // fine ≥ 2: foot bead, vase, collar rings and a block-like top instead of the plain baluster
  const prof = FINE() >= 2
    ? [[0, 0], [r * 0.72, 0], [r * 0.8, h * 0.03], [r * 0.48, h * 0.08], [r * 0.5, h * 0.36], [r * 0.64, h * 0.44], [r * 0.5, h * 0.5], [r * 0.9, h * 0.56], [r * 0.62, h * 0.63], [r * 0.95, h * 0.74], [r, h * 0.78], [r, h], [0, h]]
    : [[0, 0], [r * 0.75, 0], [r * 0.5, h * 0.08], [r * 0.5, h * 0.42], [r * 0.85, h * 0.56], [r * 0.6, h * 0.66], [r, h * 0.78], [r, h], [0, h]];
  p.lathe(mat, prof, x, y, z, seg);
}
/** tapered square leg (fine ≥ 2: with a spade foot) */
export function taperLeg(p, mat, h, x, z, top = 0.045, bot = 0.03, y = 0) {
  if (FINE() >= 2) {
    const fh = Math.min(0.06, h * 0.09);
    p.fr(mat, bot * 1.12, bot * 1.12, bot * 1.3, bot * 1.3, fh, x, y, z);
    p.fr(mat, bot, bot, top, top, h - fh, x, y + fh, z, { bottom: false });
  } else p.fr(mat, bot, bot, top, top, h, x, y, z);
}
/** cabriole leg: knee pointing to (kx, kz) (unit), foot on y (fine ≥ 2: pad foot, fuller knee) */
export function cabriole(p, mat, h, x, z, kx, kz, r = 0.028, y = 0, seg = 5) {
  const k = (t, o) => [x + kx * o, y + h * t, z + kz * o];
  if (FINE() >= 2) {
    p.loft(mat, [k(0, 0.03), k(0.04, 0.03), k(0.1, 0.02), k(0.45, -0.012), k(0.72, 0.008), k(0.86, 0.024), k(1, 0.025)],
      [r * 1.05, r * 0.9, r * 0.5, r * 0.55, r * 0.85, r * 1.05, r * 0.95], seg + 2);
    return;
  }
  p.loft(mat, [k(0, 0.025), k(0.1, 0.02), k(0.45, -0.012), k(0.8, 0.02), k(1, 0.025)],
    [r * 0.8, r * 0.55, r * 0.55, r * 1.0, r * 0.95], seg);
}
/** brass bail handle on a drawer front facing +x at (x, y, z) */
export function bail(p, x, y, z, w = 0.09, mat = M.brass) {
  p.b(mat, 0.005, 0.026, w * 0.3, x + 0.0025, y - 0.006, z - w / 2 + w * 0.15);
  p.b(mat, 0.005, 0.026, w * 0.3, x + 0.0025, y - 0.006, z + w / 2 - w * 0.15);
  p.loft(mat, [[x + 0.006, y + 0.004, z - w * 0.38], [x + 0.02, y - 0.018, z - w * 0.2], [x + 0.02, y - 0.018, z + w * 0.2], [x + 0.006, y + 0.004, z + w * 0.38]], 0.0035, 4, false);
}
/** brass knob (on a front facing +x) */
export function knob(p, x, y, z, r = 0.014, mat = M.brass) { p.latheX(mat, [[0, 0], [r * 0.5, 0], [r, r * 1.5], [0, r * 2.3]], x, y, z, 6); }
/** keyhole escutcheon */
export function keyplate(p, x, y, z, mat = M.brass) { p.b(mat, 0.004, 0.034, 0.018, x + 0.002, y - 0.017, z); }
/** drawer front facing +x, centre (y, z) at front plane x */
export function drawer(p, mat, w, h, x, y, z, handles = 2, key = true) {
  const f = FINE();
  if (f >= 1) p.bb(mat, 0.022, h - 0.008, w - 0.008, x - 0.011, y - h / 2 + 0.004, z, 0.004);
  else p.b(mat, 0.022, h - 0.008, w - 0.008, x - 0.011, y - h / 2 + 0.004, z);
  if (f >= 3 && w > 0.2) p.mf(mat, w - 0.02, h - 0.02, x, y, z, 0.008, 'bead'); // cock bead round the front
  if (handles === 2) { bail(p, x, y + 0.01, z - w * 0.27); bail(p, x, y + 0.01, z + w * 0.27); } else if (handles === 1) knob(p, x, y, z);
  if (key) keyplate(p, x, y + (h > 0.12 ? 0.0 : 0.005), z);
}
/** panelled cabinet door facing +x: frame + raised field (+ optional mirror instead of field) */
export function cabDoor(p, mat, w, h, x, y0, z, { mirror = false, panels = 1, knobAt = null, glass = false } = {}) {
  const f = FINE();
  if (f >= 1) p.bb(mat, 0.022, h, w, x - 0.011, y0, z, 0.004); else p.b(mat, 0.022, h, w, x - 0.011, y0, z);
  const fh = (h - 0.12 - (panels - 1) * 0.08) / panels;
  for (let i = 0; i < panels; i++) {
    const yc = y0 + 0.06 + fh / 2 + i * (fh + 0.08);
    if (mirror && i === panels - 1) { p.bb(M.gold, 0.006, fh + 0.02, w - 0.1, x + 0.001, yc - fh / 2 - 0.01, z, 0.003); p.b(M.mirror, 0.004, fh - 0.02, w - 0.14, x + 0.005, yc - fh / 2 + 0.01, z); }
    else if (glass) { p.b(M.glass, 0.004, fh, w - 0.12, x - 0.004, yc - fh / 2, z); }
    else {
      p.fp(mat, w - 0.12, fh, x, yc, z, 0.01, Math.min(0.04, w * 0.12));
      // applied moulding framing the raised field
      if (f >= 2 && w > 0.2) p.mf(mat, w - 0.11, fh + 0.01, x, yc, z, 0.014, f >= 3 ? 'bolection' : 'bead');
    }
  }
  if (knobAt !== null) { knob(p, x + 0.004, y0 + h * 0.5, z + knobAt, 0.011); keyplate(p, x + 0.004, y0 + h * 0.5 - 0.05, z + knobAt); }
}
/** carved bracket / moulded cornice along z on a carcass top (front at x) */
export function cornice(p, mat, w, x, y, z = 0, d = 0.05, h = 0.07) {
  p.extX(mat, [[-w / 2, 0], [w / 2, 0], [w / 2, h * 0.3], [w / 2 + d * 0.3, h * 0.45], [w / 2 + d * 0.6, h * 0.8], [w / 2 + d, h], [-w / 2 - d, h], [-w / 2 - d * 0.6, h * 0.8], [-w / 2 - d * 0.3, h * 0.45], [-w / 2, h * 0.3]], d * 2, x, y, z);
}

/** horizontal slab d (x) × t (y) × w (z), bottom at y, with elliptical holes [[cx, cz, rx, rz], ...] (sunk basins) */
export function slabWithHoles(p, mat, d, t, w, x, y, z, holes, bevel = 0.006) {
  const s = new THREE.Shape([new THREE.Vector2(-d / 2, -w / 2), new THREE.Vector2(d / 2, -w / 2), new THREE.Vector2(d / 2, w / 2), new THREE.Vector2(-d / 2, w / 2)]);
  for (const [hx, hz, rx, rz] of holes) s.holes.push(new THREE.Path().absellipse(hx, -hz, rx, rz, 0, Math.PI * 2, true, 0));
  const m = p.add(G.extrude(s, t, bevel, 12), mat, x, y + t / 2, z); m.rotation.x = -Math.PI / 2;
  return m;
}
/** mattress (piped, slightly puffed) bottom at y, length along z */
export function mattress(p, w, l, h, x, y, z, mat = M.linen) { p.pil(mat, w, h, l, x, y, z, 0.22, 0.12, 3, 14, 0.006); }
/** pillow bottom at y */
export function pillowAt(p, w, l, h, x, y, z, mat = M.linen) { p.pil(mat, w, h, l, x, y - h * 0.3, z, 0.6, 0.45, 3, 10, h * 0.18); } // sunk into the mattress by a third: its rounded underside otherwise leaves a gap all round (looked as if it floated) // head dent (no extra triangles)
/**
 * Blanket over a mattress (top at y): covers the foot end from zFoot to zFold (z along the bed), hangs over the sides by
 * `drop`, turned-down sheet at the fold.
 */
export function blanket(p, mat, w, x, y, zFold, zFoot, drop = 0.13, sheet = M.linen) {
  const L = Math.abs(zFoot - zFold), zc = (zFold + zFoot) / 2;
  const g = cached(`bl${r3(w)}_${r3(L)}_${r3(drop)}`, () => G.revolve([{ o: 0.026, y: -drop, m: 0.008 }, { o: 0.016, y: -0.02, m: 0.003 }, { o: -0.006, y: 0.018 }, { o: -0.03, y: 0.022 }], { perim: G.rectLoop(w, L, 0.04, 1, 0.3), capTop: true, k: 7 }));
  p.add(g, mat, x, y, zc);
  // turned-down sheet: rolled edge across the width at the fold
  const s = Math.sign(zFoot - zFold);
  p.loft(sheet, [[x - w / 2 - 0.02, y + 0.012, zFold - s * 0.01], [x + w / 2 + 0.02, y + 0.012, zFold - s * 0.01]], 0.02, 6);
  p.b(sheet, w + 0.03, 0.008, 0.16, x, y + 0.012, zFold - s * 0.08);
}
/** chair / sofa cushion (bottom at y) */
export function cushion(p, mat, sx, sy, sz, x, y, z, pipe = null) {
  p.pil(mat, sx, sy, sz, x, y, z, 0.35, 0.18, 3, 12, 0.008);
  if (FINE() >= 2) piping(p, pipe ?? mat, sx, sz, x, y + sy * 0.5, z, Math.min(sx, sz) * 0.09);
}
/** piping cord (welt) round a cushion / seat edge: rounded rectangle d (x) × w (z) at height y */
export function piping(p, mat, d, w, x, y, z, rc = 0.03, r = 0.006) {
  const g = cached(`pipe${r3(d)}_${r3(w)}_${r3(rc)}_${r3(r)}`, () => G.revolve([{ o: -r * 0.4, y: -r }, { o: r * 0.6, y: 0 }, { o: -r * 0.4, y: r }], { perim: G.rectLoop(d, w, rc, 2) }));
  return p.add(g, mat, x, y, z);
}
/** vertical tufted back facing +x, centre at (x, y, z) (fine 3: finer surface and covered buttons) */
export function tuftBack(p, mat, w, h, x, y, z, nz = 4, ny = 2, depth = 0.016, puff = 0.03) {
  const f = FINE(), res = (w > 1 ? 1.5 : 2) + (f >= 3 ? 1 : 0);
  // one geometry (buttons merged in), so callers can still rotate the returned mesh
  const g = cached(`tb${r3(w)}_${r3(h)}_${nz}_${ny}_${r3(depth)}_${r3(puff)}_${res}_${f >= 3}`, () => {
    const t = G.tufted(w, h, nz, ny, depth, puff, res);
    if (f < 3) return t;
    const parts = [t];
    for (const [bz, by] of t.userData.buttons) {
      const ez = Math.min(1, (w / 2 - Math.abs(bz)) / (w * 0.12)), ey = Math.min(1, (h / 2 - Math.abs(by)) / (h * 0.12));
      const bx = Math.max(0, puff * Math.sqrt(Math.max(0, ez * ey)) - depth * Math.min(ez, ey));
      parts.push(G.lathe([[0, 0], [0.008, 0.001], [0.006, 0.005], [0, 0.006]], 5).rotateZ(-Math.PI / 2).translate(bx - 0.002, by, bz));
    }
    return G.mergeAll(parts);
  });
  return p.add(g, mat, x, y, z);
}
/** horizontal tufted seat top (facing +y), centre (x, y, z), w along z, d along x */
export function tuftSeat(p, mat, d, w, x, y, z, nz = 3, nx = 2, depth = 0.014, puff = 0.028) {
  const g = cached(`ts${r3(w)}_${r3(d)}_${nz}_${nx}_${r3(depth)}_${r3(puff)}`, () => G.tufted(w, d, nz, nx, depth, puff, 3));
  p.add(g, mat, x, y, z, 0, 0, Math.PI / 2);
}

/** dinner plate etc. (lathe) */
export const PLATE = [[0, 0], [0.06, 0], [0.065, 0.004], [0.1, 0.008], [0.118, 0.016], [0.112, 0.017], [0.095, 0.011], [0.06, 0.007], [0, 0.007]];
const GLASS = [[0, 0], [0.032, 0], [0.033, 0.004], [0.006, 0.01], [0.005, 0.07], [0.03, 0.09], [0.036, 0.135], [0.033, 0.135], [0.026, 0.095], [0, 0.085]];
const TUMBLER = [[0, 0], [0.032, 0], [0.036, 0.1], [0.033, 0.1], [0.029, 0.006], [0, 0.006]];
const CARAFE = [[0, 0], [0.06, 0], [0.072, 0.05], [0.07, 0.11], [0.03, 0.17], [0.022, 0.23], [0.028, 0.245], [0.018, 0.245], [0, 0.2]];
const CUP = [[0, 0], [0.03, 0], [0.04, 0.02], [0.044, 0.065], [0.041, 0.065], [0.036, 0.02], [0, 0.012]];
export const SHAPES = { GLASS, TUMBLER, CARAFE, CUP };

/** one place setting at (x, z) on a table top y, facing direction angle a (towards the diner) */
export function placeSetting(p, x, y, z, a, rich = true) {
  // local frame: +dx towards the table centre (away from the diner), dz to the diner's left/right
  const ca = Math.cos(a), sa = Math.sin(a), L = (dx, dz) => [x + dx * ca - dz * sa, z + dx * sa + dz * ca];
  p.lathe(M.porcelain, PLATE_LO, x, y, z, 10);
  for (const [dz, len] of [[-0.15, 0.19], [0.14, 0.2], [0.158, 0.18]]) {
    const [cx, cz] = L(0, dz), m = p.b(M.chrome, len, 0.004, 0.014, cx, y, cz); m.rotation.y = -a;
  }
  const [gx, gz] = L(rich ? 0.13 : 0.12, 0.15); p.lathe(M.glass, rich ? GLASS_LO : TUMBLER_LO, gx, y, gz, 6);
  // folded napkin (mitre) on the plate
  const [nx, nz] = L(0, 0), n = p.extZ(M.linen, [[-0.05, 0], [0.05, 0], [0.03, 0.06], [0, 0.11], [-0.03, 0.06]], 0.03, nx, y + 0.012, nz, 0);
  n.rotation.y = -a + Math.PI / 2;
}
const PLATE_LO = [[0, 0], [0.065, 0], [0.1, 0.008], [0.118, 0.016], [0.095, 0.011], [0, 0.007]];
const GLASS_LO = [[0, 0], [0.032, 0], [0.006, 0.01], [0.005, 0.07], [0.03, 0.09], [0.036, 0.135], [0.026, 0.1], [0, 0.088]];
const TUMBLER_LO = [[0, 0], [0.032, 0], [0.036, 0.1], [0.03, 0.006], [0, 0.006]];
/** small electric table lamp with silk shade */
export function tableLampOn(p, x, y, z, shade = M.lampGlow) {
  p.lathe(M.brass, [[0, 0], [0.055, 0], [0.04, 0.016], [0.01, 0.04], [0.015, 0.07], [0.008, 0.09], [0.008, 0.2], [0, 0.2]], x, y, z, 10);
  p.rev(shade, [{ o: 0.095, y: 0, m: 0.004 }, { o: 0.05, y: 0.11, m: 0.003 }, { o: 0.045, y: 0.115 }], { seg: 16, k: 8, capTop: true }, x, y + 0.15, z);
  if (FINE() >= 2) { // gilt shade rim and a small finial on the shade top
    p.t(M.brass, 0.096, 0.003, x, y + 0.151, z, 'y', 16, 3);
    p.lathe(M.brass, [[0, 0], [0.01, 0], [0.012, 0.01], [0.004, 0.02], [0, 0.028]], x, y + 0.264, z, 6);
  }
}
/** folded towel hanging over a rail (along z) at x, y */
export function towelOn(p, x, y, z, w = 0.3, drop = 0.22) {
  p.bb(M.linen, 0.04, drop, w, x, y - drop, z, 0.01);
  p.cz(M.linen, 0.022, w, x, y, z, 8);
}
/** books on a shelf: row of spines along z from z0 to z1, standing on y, front face at x (spines face +x), depth d */
export function bookRow(p, x, y, z0, z1, d = 0.2, hmax = 0.26, seed = 1, lean = true) {
  const r = rngOf(seed);
  let z = z0 + 0.005;
  while (z < z1 - 0.02) {
    const t = 0.02 + r() * 0.035, h = hmax * (0.72 + r() * 0.28), dd = d * (0.8 + r() * 0.2);
    if (z + t > z1) break;
    if (r() < 0.06 && lean && z + h * 0.7 < z1) { // a leaning book
      const m = p.ab(Math.floor(r() * 16), dd, h, t, x - dd / 2, y, z + t / 2 + 0.06, true); m.rotation.x = 0.35; m.position.z += 0.0; z += h * 0.4 + t; continue;
    }
    p.ab(Math.floor(r() * 16), dd, h, t, x - dd / 2, y, z + t / 2, true);
    z += t + 0.001;
    if (r() < 0.05) z += 0.05 + r() * 0.08;
  }
}
// ------------------------------------------------------------ small clutter (all standing on y, centred at x, z)

const SAUCER = [[0, 0], [0.04, 0], [0.068, 0.008], [0.074, 0.013], [0.066, 0.012], [0.04, 0.006], [0, 0.006]];
/** cup on its saucer; handle towards angle a (0 = +x, π/2 = −z) */
export function cupSaucer(p, x, y, z, a = 0, mat = M.porcelain) {
  p.lathe(mat, SAUCER, x, y, z, 10);
  p.lathe(mat, SHAPES.CUP, x, y + 0.006, z, 8);
  const h = p.t(mat, 0.017, 0.0045, x + Math.cos(a) * 0.047, y + 0.046, z - Math.sin(a) * 0.047, 'z', 10, 3); h.rotation.y = a;
}
/** teapot (s = scale; spout towards +x) */
export function teapotOn(p, x, y, z, mat = M.porcelain, s = 1) {
  p.lathe(mat, [[0, 0], [0.045 * s, 0], [0.068 * s, 0.025 * s], [0.075 * s, 0.055 * s], [0.066 * s, 0.09 * s], [0.04 * s, 0.11 * s], [0, 0.112 * s]], x, y, z, 10);
  p.lathe(mat, [[0, 0], [0.012 * s, 0], [0.016 * s, 0.012 * s], [0.005 * s, 0.022 * s], [0, 0.03 * s]], x, y + 0.108 * s, z, 6);
  p.loft(mat, [[x + 0.058 * s, y + 0.035 * s, z], [x + 0.09 * s, y + 0.06 * s, z], [x + 0.112 * s, y + 0.1 * s, z]], [0.016 * s, 0.009 * s, 0.006 * s], 5);
  p.t(mat, 0.03 * s, 0.006 * s, x - 0.074 * s, y + 0.065 * s, z, 'z', 10, 3);
}
/** jug / creamer (spout towards +x) */
export function jugOn(p, x, y, z, mat = M.porcelain, s = 1) {
  p.lathe(mat, [[0, 0], [0.03 * s, 0], [0.036 * s, 0.03 * s], [0.03 * s, 0.07 * s], [0.034 * s, 0.09 * s], [0.03 * s, 0.09 * s], [0, 0.012 * s]], x, y, z, 8);
  p.loft(mat, [[x + 0.026 * s, y + 0.082 * s, z], [x + 0.045 * s, y + 0.092 * s, z]], [0.008 * s, 0.004 * s], 4);
  p.t(mat, 0.022 * s, 0.004 * s, x - 0.036 * s, y + 0.055 * s, z, 'z', 8, 3);
}
const FLW = [AT.flowerRed, AT.pink, AT.flowerYellow, AT.flowerWhite, AT.rose];
/** vase (v: colour) with a posy of flowers (flowers = 0: empty vase) */
export function vaseOn(p, x, y, z, v = 0, h = 0.2, flowers = 5) {
  const cell = [AT.cobalt, AT.china, AT.milk, AT.blueGlass, AT.clearGlass][v % 5];
  p.alathe(cell, [[0, 0], [0.032, 0], [0.036, 0.008], [0.05, h * 0.35], [0.046, h * 0.6], [0.024, h * 0.86], [0.022, h * 0.92], [0.034, h], [0.028, h], [0, h * 0.9]], x, y, z, 8);
  if (!flowers) return;
  const r = rngOf(v * 7 + flowers);
  for (let i = 0; i < flowers; i++) {
    const a = (i / flowers) * TAU + r() * 0.5, d = i === 0 ? 0 : 0.035 + r() * 0.035, fy = y + h + 0.07 + (i === 0 ? 0.05 : r() * 0.04);
    const fx = x + Math.cos(a) * d, fz = z - Math.sin(a) * d;
    p.loft(M.plant, [[x + Math.cos(a) * 0.006, y + h * 0.8, z - Math.sin(a) * 0.006], [fx, fy - 0.012, fz]], 0.0025, 3, false);
    const c = FLW[(v + i) % FLW.length];
    p.add(cached(`flw${c}`, () => G.atlasCell(new THREE.SphereGeometry(0.022, 6, 4), c)), K.atlas, fx, fy, fz).scale.set(1, 0.7, 1);
  }
  for (let i = 0; i < 3; i++) { // a few leaves hanging over the rim
    const a = (i / 3) * TAU + 0.4, lx = x + Math.cos(a) * 0.05, lz = z - Math.sin(a) * 0.05;
    p.loft(M.plant, [[x + Math.cos(a) * 0.02, y + h, z - Math.sin(a) * 0.02], [lx, y + h + 0.02, lz], [x + Math.cos(a) * 0.075, y + h - 0.03, z - Math.sin(a) * 0.075]], [[0.003, 0.012], [0.004, 0.016], [0.001, 0.004]], 3, false);
  }
}
/** soap bar (on a dish / basin rim) */
export function soapOn(p, x, y, z, a = 0) { p.pil(M.paintCream, 0.07, 0.022, 0.045, x, y, z, 0.5, 0.3, 2, 8).rotation.y = a; }
/** tooth-brush mug with a brush */
export function toothMug(p, x, y, z) {
  p.lathe(M.porcelain, [[0, 0], [0.03, 0], [0.033, 0.09], [0.03, 0.09], [0.027, 0.008], [0, 0.008]], x, y, z, 8);
  const b = p.bb(M.paintCream, 0.012, 0.16, 0.008, x + 0.012, y + 0.01, z, 0.002); b.rotation.z = -0.2;
}
/** hair brush lying on a surface, handle towards angle a */
export function hairBrush(p, x, y, z, a = 0, mat = M.woodDark) {
  const m1 = p.pil(mat, 0.13, 0.025, 0.06, x, y, z, 0.4, 0.45, 2, 8); m1.rotation.y = a;
  const m2 = p.bb(mat, 0.1, 0.016, 0.026, x + Math.cos(a) * 0.1, y + 0.004, z - Math.sin(a) * 0.1, 0.006); m2.rotation.y = a;
}
/** hand mirror lying face up (silver / brass back), handle towards angle a */
export function handMirror(p, x, y, z, a = 0, mat = M.chrome) {
  p.lathe(mat, [[0, 0], [0.065, 0], [0.068, 0.008], [0.06, 0.012], [0, 0.012]], x, y, z, 12);
  p.dial(M.mirror, 0.058, x, y + 0.0125, z, 'y', 12);
  const h = p.bb(mat, 0.11, 0.012, 0.022, x + Math.cos(a) * 0.12, y, z - Math.sin(a) * 0.12, 0.005); h.rotation.y = a;
}
/** folded blanket(s): n layers d (x) × w (z), each th thick, bottom at y */
export function foldedBlanket(p, mat, d, w, n, x, y, z, th = 0.035, rot = 0) {
  for (let i = 0; i < n; i++) p.pil(mat, d - i * 0.01, th, w - i * 0.008, x, y + i * th * 0.9, z, 0.3, 0.12, 2, 8).rotation.y = rot + (i % 2 ? 0.03 : -0.02);
}

/** newspaper / letters on a surface */
export function papers(p, x, y, z, a = 0, n = 2) {
  for (let i = 0; i < n; i++) { const m = p.ab(AT.paper, 0.28 - i * 0.04, 0.004, 0.36 - i * 0.05, x + i * 0.02, y + i * 0.004, z - i * 0.03); m.rotation.y = a + i * 0.25; }
}
