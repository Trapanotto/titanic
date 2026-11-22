// Interior kit – prop core: builder (PB), registry, template baking, placement and shared sub-assemblies
// (turned legs, drawers, panelled doors, knobs, cushions, bedding, place settings, small lamps).
// Every prop: function(opts) -> THREE.Group, origin at floor level in the centre of its footprint, FRONT FACING +x.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mats as M } from '../core/materials.js';
import { tiledBoxGeometry } from '../core/geo.js';
import { kitMats as K, AT } from './batch.js';
import * as G from './geom.js';

const geo = new Map();
export function cached(key, make) { let g = geo.get(key); if (!g) geo.set(key, (g = make())); return g; }
const r3 = (v) => Math.round(v * 1000);
/** global detail factor for round parts (segments of lathes, lofts, cushions, cylinders); 1 = as authored */
export const DETAIL = { q: 0.5 };
const S = (n, min) => Math.min(n, Math.max(min, Math.round(n * DETAIL.q)));
/** segment floor by radius: big round parts stay smooth, small ones get cheap */
const MINSEG = (r) => (r > 0.3 ? 16 : r > 0.15 ? 12 : r > 0.07 ? 8 : r > 0.03 ? 6 : 5);
export const TAU = Math.PI * 2;

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
  loft(mat, pts, radii, seg = 8, caps = true) { return this._add(G.loft(pts, radii, S(seg, 3), caps), mat, 0, 0, 0); }
  tube(mat, pts, r, tseg = 16, rseg = 6, closed = false) { return this._add(G.tube(pts, r, S(tseg, 6), S(rseg, 3), closed), mat, 0, 0, 0); }
  /** extruded outline in the yz plane (a = z, b = y), thickness along x, centred at x */
  extX(mat, outline, depth, x = 0, y = 0, z = 0, bevel = 0) { const m = this._add(G.extrude(outline, depth, bevel), mat, x, y, z); m.rotation.y = Math.PI / 2; return m; }
  /** extruded outline in the xy plane (a = x, b = y), thickness along z */
  extZ(mat, outline, depth, x = 0, y = 0, z = 0, bevel = 0) { return this._add(G.extrude(outline, depth, bevel), mat, x, y, z); }
  /** extruded outline in the xz plane (a = x, b = −z), thickness along y, bottom at y */
  extY(mat, outline, depth, x = 0, y = 0, z = 0, bevel = 0) { const m = this._add(G.extrude(outline, depth, bevel), mat, x, y + depth / 2, z); m.rotation.x = -Math.PI / 2; return m; }
  rev(mat, rows, o, x = 0, y = 0, z = 0) { if (!o.wave && !o.perim) o = { ...o, seg: S(o.seg ?? 24, Math.max(8, MINSEG(Math.max(...rows.map((q) => q.o))))) }; return this._add(G.revolve(rows, o), mat, x, y, z); }
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

/** Define a prop: fp = [w, d, h] or fn(opts) → [w, d, h]; build(p: PB, opts). */
export function def(name, fp, build) {
  const fn = (o = {}) => {
    const key = name + '|' + JSON.stringify(o, (k, v) => (v && v.isMaterial ? v.name || v.uuid : v));
    let t = templates.get(key);
    if (!t) {
      const p = new PB();
      build(p, o);
      t = { parts: bakeTemplate(p.g), fp: typeof fp === 'function' ? fp(o) : fp };
      templates.set(key, t);
    }
    const g = new THREE.Group();
    for (const part of t.parts) g.add(new THREE.Mesh(part.geo, part.mat));
    g.userData.fp = { w: t.fp[0], d: t.fp[1], h: t.fp[2] };
    g.userData.prop = name;
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
  p.lathe(mat, [[0, 0], [r * 0.75, 0], [r * 0.5, h * 0.08], [r * 0.5, h * 0.42], [r * 0.85, h * 0.56], [r * 0.6, h * 0.66], [r, h * 0.78], [r, h], [0, h]], x, y, z, seg);
}
/** tapered square leg */
export function taperLeg(p, mat, h, x, z, top = 0.045, bot = 0.03, y = 0) { p.fr(mat, bot, bot, top, top, h, x, y, z); }
/** cabriole leg: knee pointing to (kx, kz) (unit), foot on y */
export function cabriole(p, mat, h, x, z, kx, kz, r = 0.028, y = 0, seg = 5) {
  const k = (t, o) => [x + kx * o, y + h * t, z + kz * o];
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
  p.b(mat, 0.022, h - 0.008, w - 0.008, x - 0.011, y - h / 2 + 0.004, z);
  if (handles === 2) { bail(p, x, y + 0.01, z - w * 0.27); bail(p, x, y + 0.01, z + w * 0.27); } else if (handles === 1) knob(p, x, y, z);
  if (key) keyplate(p, x, y + (h > 0.12 ? 0.0 : 0.005), z);
}
/** panelled cabinet door facing +x: frame + raised field (+ optional mirror instead of field) */
export function cabDoor(p, mat, w, h, x, y0, z, { mirror = false, panels = 1, knobAt = null, glass = false } = {}) {
  p.b(mat, 0.022, h, w, x - 0.011, y0, z);
  const fh = (h - 0.12 - (panels - 1) * 0.08) / panels;
  for (let i = 0; i < panels; i++) {
    const yc = y0 + 0.06 + fh / 2 + i * (fh + 0.08);
    if (mirror && i === panels - 1) { p.bb(M.gold, 0.006, fh + 0.02, w - 0.1, x + 0.001, yc - fh / 2 - 0.01, z, 0.003); p.b(M.mirror, 0.004, fh - 0.02, w - 0.14, x + 0.005, yc - fh / 2 + 0.01, z); }
    else if (glass) { p.b(M.glass, 0.004, fh, w - 0.12, x - 0.004, yc - fh / 2, z); }
    else p.fp(mat, w - 0.12, fh, x, yc, z, 0.01, Math.min(0.04, w * 0.12));
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
export function pillowAt(p, w, l, h, x, y, z, mat = M.linen) { p.pil(mat, w, h, l, x, y, z, 0.6, 0.45, 3, 10); }
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
export function cushion(p, mat, sx, sy, sz, x, y, z) { p.pil(mat, sx, sy, sz, x, y, z, 0.35, 0.18, 3, 12, 0.008); }
/** vertical tufted back facing +x, centre at (x, y, z) */
export function tuftBack(p, mat, w, h, x, y, z, nz = 4, ny = 2, depth = 0.016, puff = 0.03) {
  const g = cached(`tb${r3(w)}_${r3(h)}_${nz}_${ny}_${r3(depth)}_${r3(puff)}`, () => G.tufted(w, h, nz, ny, depth, puff, w > 1 ? 1.5 : 2));
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
/** newspaper / letters on a surface */
export function papers(p, x, y, z, a = 0, n = 2) {
  for (let i = 0; i < n; i++) { const m = p.ab(AT.paper, 0.28 - i * 0.04, 0.004, 0.36 - i * 0.05, x + i * 0.02, y + i * 0.004, z - i * 0.03); m.rotation.y = a + i * 0.25; }
}
