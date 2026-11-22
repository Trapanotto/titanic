// Shared helpers for the lower decks F, G and orlop: room shortcuts, cabin generators (rows and "alley clusters"),
// a small custom-prop builder, an InstancedMesh collector and the few module-level materials of these decks.
import * as THREE from 'three';
import { ZONE_LEN, DECK_Y, ceilingY } from '../core/constants.js';
import { mats, canvasTexture } from '../core/materials.js';
import { tiledBoxGeometry } from '../core/geo.js';
import { minHalfWidth, _bakeTemplate, matOf } from '../interior/kit.js';

// ---------------------------------------------------------------- module-level materials (created once)

function std(o) { return new THREE.MeshStandardMaterial(o); }

const moorishTex = canvasTexture(256, 1.2, (ctx, s) => {
  ctx.fillStyle = '#5e1414'; ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = '#d8b04a'; ctx.lineWidth = 5;
  ctx.strokeRect(4, 4, s - 8, s - 8);
  // eight-pointed star (two overlapping squares) and small rosettes
  const c = s / 2, r = s * 0.3;
  for (const a0 of [0, Math.PI / 4]) {
    ctx.beginPath();
    for (let i = 0; i < 4; i++) { const a = a0 + (i * Math.PI) / 2; ctx.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r); }
    ctx.closePath(); ctx.stroke();
  }
  ctx.fillStyle = '#1f5a5a'; ctx.beginPath(); ctx.arc(c, c, s * 0.09, 0, 7); ctx.fill();
  ctx.fillStyle = '#d8b04a';
  for (const [x, y] of [[0, 0], [s, 0], [0, s], [s, s]]) { ctx.beginPath(); ctx.arc(x, y, s * 0.1, 0, 7); ctx.fill(); }
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; ctx.beginPath(); ctx.moveTo(c, c); ctx.lineTo(c + Math.cos(a) * r * 0.75, c + Math.sin(a) * r * 0.75); ctx.stroke(); }
}, 611);
/** deep-red ceiling with gilt Moorish star pattern (Turkish bath cooling room) */
export const moorishCeiling = std({ map: moorishTex, roughness: 0.6, metalness: 0.15 });
moorishCeiling.name = 'fg_moorishCeiling';

const latticeTex = canvasTexture(256, 0.6, (ctx, s) => {
  ctx.clearRect(0, 0, s, s);
  ctx.fillStyle = '#4a2c16';
  const n = 8, q = s / n;
  for (let i = 0; i <= n; i++) { ctx.fillRect(i * q - 4, 0, 8, s); ctx.fillRect(0, i * q - 4, s, 8); }
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = (i + 0.5) * q, y = (j + 0.5) * q;
    ctx.beginPath(); ctx.arc(x, y, q * 0.2, 0, 7); ctx.fill();
    ctx.fillRect(x - 2, y - q / 2, 4, q); ctx.fillRect(x - q / 2, y - 2, q, 4);
  }
}, 613);
/** carved teak lattice (mashrabiya) with transparent holes */
export const teakLattice = std({ map: latticeTex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6 });
teakLattice.name = 'fg_teakLattice';

const posterTex = canvasTexture(256, 1, (ctx, s) => {
  ctx.fillStyle = '#efe4c8'; ctx.fillRect(0, 0, s, s);
  ctx.fillStyle = '#1d2d4f'; ctx.fillRect(0, 0, s, s * 0.22);
  ctx.fillStyle = '#c8202a'; ctx.beginPath(); // White Star pennant
  ctx.moveTo(s * 0.08, s * 0.05); ctx.lineTo(s * 0.34, s * 0.11); ctx.lineTo(s * 0.08, s * 0.17); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(s * 0.16, s * 0.11, s * 0.03, 0, 7); ctx.fill();
  ctx.fillStyle = '#f1e9d2'; ctx.font = `bold ${Math.round(s * 0.085)}px serif`; ctx.fillText('WHITE STAR LINE', s * 0.38, s * 0.14);
  // sea + ship silhouette with four buff funnels
  ctx.fillStyle = '#7fa6c4'; ctx.fillRect(s * 0.06, s * 0.28, s * 0.88, s * 0.42);
  ctx.fillStyle = '#2d5878'; ctx.fillRect(s * 0.06, s * 0.58, s * 0.88, s * 0.12);
  ctx.fillStyle = '#16181c'; ctx.beginPath(); ctx.moveTo(s * 0.1, s * 0.5); ctx.lineTo(s * 0.9, s * 0.5); ctx.lineTo(s * 0.84, s * 0.6); ctx.lineTo(s * 0.14, s * 0.6); ctx.fill();
  ctx.fillStyle = '#f2f0ea'; ctx.fillRect(s * 0.22, s * 0.45, s * 0.56, s * 0.05);
  ctx.fillStyle = '#d9a05b'; for (let i = 0; i < 4; i++) ctx.fillRect(s * (0.3 + i * 0.12), s * 0.34, s * 0.05, s * 0.11);
  ctx.fillStyle = '#1d2d4f'; ctx.font = `bold ${Math.round(s * 0.07)}px serif`;
  ctx.fillText('SOUTHAMPTON – NEW YORK', s * 0.08, s * 0.82);
  ctx.font = `${Math.round(s * 0.05)}px serif`; ctx.fillText('via Cherbourg & Queenstown', s * 0.2, s * 0.92);
}, 617);
/** White Star Line sailing poster (UV 0..1) */
export const posterMat = std({ map: posterTex, roughness: 0.8 });
posterMat.name = 'fg_poster';

const iznikTex = canvasTexture(256, 0.6, (ctx, s) => {
  // 4 × 4 glazed tiles (15 cm): turquoise ground, cobalt and white arabesque quatrefoils, green leaves, thin joints
  const q = s / 4;
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
    const x = i * q, y = j * q, c = q / 2;
    ctx.fillStyle = '#2f8f8a'; ctx.fillRect(x, y, q, q);
    ctx.fillStyle = '#1b3f8a';
    for (const [dx, dy] of [[0, 0], [q, 0], [0, q], [q, q]]) { ctx.beginPath(); ctx.arc(x + dx, y + dy, q * 0.28, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#eef3ec'; ctx.beginPath();
    for (let k = 0; k < 4; k++) { const a = (k * Math.PI) / 2; ctx.ellipse(x + c + Math.cos(a) * q * 0.16, y + c + Math.sin(a) * q * 0.16, q * 0.14, q * 0.09, a, 0, 7); }
    ctx.fill();
    ctx.fillStyle = '#c8303a'; ctx.beginPath(); ctx.arc(x + c, y + c, q * 0.07, 0, 7); ctx.fill();
    ctx.fillStyle = '#3d8a3a'; for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + (k * Math.PI) / 2; ctx.beginPath(); ctx.ellipse(x + c + Math.cos(a) * q * 0.3, y + c + Math.sin(a) * q * 0.3, q * 0.08, q * 0.035, a, 0, 7); ctx.fill(); }
    ctx.strokeStyle = 'rgba(230,230,220,0.9)'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, q - 2, q - 2);
  }
}, 619);
/** glazed blue-green Iznik-style wall tiles (Turkish bath) */
export const iznikMat = std({ map: iznikTex, roughness: 0.18, metalness: 0.05 });
iznikMat.name = 'fg_iznik';
const borderTex = canvasTexture(128, 0.3, (ctx, s) => {
  ctx.fillStyle = '#123a6e'; ctx.fillRect(0, 0, s, s);
  ctx.fillStyle = '#e9e2c6'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo((i * s) / 4, s * 0.5); ctx.lineTo(((i + 0.5) * s) / 4, s * 0.15); ctx.lineTo(((i + 1) * s) / 4, s * 0.5); ctx.lineTo(((i + 0.5) * s) / 4, s * 0.85); ctx.fill(); }
  ctx.fillStyle = '#b8902f'; ctx.fillRect(0, 0, s, s * 0.08); ctx.fillRect(0, s * 0.92, s, s * 0.08);
}, 621);
/** cobalt border tiles with cream lozenges (frames the Iznik panels) */
export const tileBorderMat = std({ map: borderTex, roughness: 0.2 });
tileBorderMat.name = 'fg_tileBorder';
const depthTex = canvasTexture(128, 1, (ctx, s) => {
  ctx.fillStyle = '#f4f2ea'; ctx.fillRect(0, 0, s, s);
  ctx.fillStyle = '#1d2d4f'; ctx.font = `bold ${Math.round(s * 0.36)}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('3 FT', s / 4, s / 4); ctx.fillText('4 FT', (3 * s) / 4, s / 4); ctx.fillText('5 FT', s / 4, (3 * s) / 4); ctx.fillText('6 FT', (3 * s) / 4, (3 * s) / 4);
}, 623);
depthTex.repeat.set(1, 1);
/** enamel depth marks (2 × 2 cells: 3 FT, 4 FT, 5 FT, 6 FT) – unit UVs */
export const depthMat = std({ map: depthTex, roughness: 0.3 });
depthMat.name = 'fg_depth';

export const meatMat = std({ color: 0xa8474a, roughness: 0.7 });
meatMat.name = 'fg_meat';
export const fatMat = std({ color: 0xe8d7c0, roughness: 0.8 });
fatMat.name = 'fg_fat';
export const iceMat = std({ color: 0xcfe6ee, roughness: 0.15, metalness: 0.05, transparent: true, opacity: 0.85 });
iceMat.name = 'fg_ice';
export const carPaint = std({ color: 0x3b1418, roughness: 0.25, metalness: 0.35 });
carPaint.name = 'fg_carPaint';
export const corkMat = std({ color: 0x9a7650, roughness: 1 });
corkMat.name = 'fg_cork';

// ---------------------------------------------------------------- custom props

const r3 = (v) => Math.round(v * 1000);
const cylCache = new Map();
const cyl = (rb, rt, h, seg) => { const k = `${r3(rb)}_${r3(rt)}_${r3(h)}_${seg}`; let g = cylCache.get(k); if (!g) cylCache.set(k, (g = new THREE.CylinderGeometry(rt, rb, h, seg))); return g; };
const sph = new THREE.SphereGeometry(1, 8, 6), sphLo = new THREE.SphereGeometry(1, 6, 4);
const torCache = new Map();

/** Tiny builder for custom props (front faces +x, origin on the floor). All sizes: sx = local x (depth), sy, sz = local z (width). */
export class PropBuilder {
  constructor() { this.g = new THREE.Group(); }
  _m(geo, mat, x, y, z) { const m = new THREE.Mesh(geo, matOf(mat)); m.position.set(x, y, z); this.g.add(m); return m; }
  /** box, bottom at y */
  b(mat, sx, sy, sz, x = 0, y = 0, z = 0) { return this._m(tiledBoxGeometry(sx, sy, sz), mat, x, y + sy / 2, z); }
  /** vertical cylinder, bottom at y */
  c(mat, r, h, x = 0, y = 0, z = 0, seg = 8, rTop = r) { return this._m(cyl(r, rTop, h, seg), mat, x, y + h / 2, z); }
  /** horizontal cylinder along z, centred at (x, y, z) */
  cz(mat, r, len, x, y, z, seg = 10) { const m = this._m(cyl(r, r, len, seg), mat, x, y, z); m.rotation.x = Math.PI / 2; return m; }
  /** horizontal cylinder along x, centred */
  cx(mat, r, len, x, y, z, seg = 10) { const m = this._m(cyl(r, r, len, seg), mat, x, y, z); m.rotation.z = Math.PI / 2; return m; }
  /** ellipsoid centred */
  s(mat, r, x, y, z, sx = 1, sy = 1, sz = 1, lo = false) { const m = this._m(lo ? sphLo : sph, mat, x, y, z); m.scale.set(r * sx, r * sy, r * sz); return m; }
  /** torus with ring plane normal to axis ('x' | 'y' | 'z') */
  t(mat, R, r, x, y, z, axis = 'x', seg = 12) {
    const k = `${r3(R)}_${r3(r)}_${seg}`; let g = torCache.get(k); if (!g) torCache.set(k, (g = new THREE.TorusGeometry(R, r, 5, seg)));
    const m = this._m(g, mat, x, y, z);
    if (axis === 'x') m.rotation.y = Math.PI / 2; else if (axis === 'y') m.rotation.x = Math.PI / 2;
    return m;
  }
}

const templates = new Map();
/** Defines a custom prop: returns make(opts) → Group with userData.fp like the kit props (usable with ctx.put / ctx.fit / plan.prop). */
export function defProp(name, fp, build) {
  return (o = {}) => {
    const key = name + '|' + JSON.stringify(o);
    let t = templates.get(key);
    if (!t) { const pb = new PropBuilder(); build(pb, o); t = { parts: _bakeTemplate(pb.g), fp: typeof fp === 'function' ? fp(o) : fp }; templates.set(key, t); }
    const g = new THREE.Group();
    for (const p of t.parts) g.add(new THREE.Mesh(p.geo, p.mat));
    g.userData.fp = { w: t.fp[0], d: t.fp[1], h: t.fp[2] };
    g.userData.prop = name;
    return g;
  };
}

// ---------------------------------------------------------------- instancing

/** Collects instances of kit / custom props per zone and creates one InstancedMesh per (part, zone) on flush(). */
export class Instancer {
  constructor(world, deck) { this.world = world; this.deck = deck; this.sets = new Map(); this.n = 0; }
  /** prop: a Group returned by a prop function (only its child meshes are used) */
  add(prop, x, y, z, rotY = 0) {
    const zi = Math.floor(x / ZONE_LEN);
    for (const m of prop.children) {
      if (!m.isMesh) continue;
      const k = m.geometry.uuid + '|' + m.material.uuid + '|' + zi;
      let s = this.sets.get(k); if (!s) this.sets.set(k, (s = { geo: m.geometry, mat: m.material, zi, list: [] }));
      s.list.push([x, y, z, rotY]);
    }
    this.n++;
  }
  flush() {
    const M = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);
    for (const s of this.sets.values()) {
      const im = new THREE.InstancedMesh(s.geo, s.mat, s.list.length);
      s.list.forEach((a, i) => { p.set(a[0], a[1], a[2]); q.setFromAxisAngle(up, a[3]); M.compose(p, q, one); im.setMatrixAt(i, M); });
      im.instanceMatrix.needsUpdate = true; im.computeBoundingBox(); im.computeBoundingSphere();
      im.receiveShadow = true; im.userData.noMerge = true;
      this.world.zone(this.deck, s.zi * ZONE_LEN + 1).add(im);
    }
    this.sets.clear();
  }
}

// ---------------------------------------------------------------- plan shortcuts and cabin generators

export const CLS = {
  third: { wall: 'paintWhite', floor: 'linoRed', furnish: 'cabinThird', door: 'pine', label: 'Kabine 3. Klasse', group: '3. Klasse' },
  second: { wall: 'whitePanel', floor: 'linoBlue', furnish: 'cabinSecond', door: 'oak', label: 'Kabine 2. Klasse', group: '2. Klasse' },
  crew: { wall: 'paintWhite', floor: 'linoRed', furnish: 'cabinCrew', door: 'white', label: 'Kabine', group: 'Besatzung' },
};

/**
 * Shortcuts bound to a plan. `L` = deck letter used for cabin numbers (plates "F12" etc.).
 * Returns { room, gang, dP, dS, dA, dF, cabin, row, side }.
 */
export function shortcuts(plan, L) {
  const pre = L + '-';
  const room = (id, name, x0, x1, z0, z1, furnish, doors = [], o = {}) => plan.room({ id: pre + id, name, x0, x1, z0, z1, furnish, doors, ...o });
  const gang = (id, name, x0, x1, z0, z1, o = {}) => plan.corridor({ id: pre + id, name, x0, x1, z0, z1, ...o });
  const dP = (at, o = {}) => ({ side: 'port', at, ...o }), dS = (at, o = {}) => ({ side: 'stbd', at, ...o });
  const dA = (at, o = {}) => ({ side: 'aft', at, ...o }), dF = (at, o = {}) => ({ side: 'fwd', at, ...o });
  const counter = { n: 1, alley: 0 };

  /** one numbered cabin; door = { side, at } */
  const cabin = (x0, x1, z0, z1, cls, door, o = {}) => {
    const c = CLS[cls], n = counter.n, label = `${L}${n}`;
    const r = plan.room({
      id: label, name: `${o.name ?? c.label} ${L} ${n}`, type: 'cabin', cls, quiet: true, x0, x1, z0, z1,
      wall: o.wall ?? c.wall, floor: o.floor ?? c.floor, furnish: o.furnish ?? c.furnish, berths: o.berths, lamp: o.lamp,
      doors: [{ w: 0.9, style: o.door ?? c.door, label, ...door }], group: o.group ?? c.group,
    });
    if (r) counter.n++;
    return r;
  };

  /** cabins along x between x0..x1, corridor at |z| = zIn on side s (+1 stbd / -1 port), cabins outboard of it up to the hull */
  const row = (x0, x1, zIn, s, cls, o = {}) => {
    const zOut = o.zOut ?? 99, n = Math.max(1, Math.round((x1 - x0) / (o.pitch ?? (cls === 'second' ? 2.8 : 2.4)))), w = (x1 - x0) / n, out = [];
    const [z0, z1] = s > 0 ? [zIn, zOut] : [-zOut, -zIn];
    for (let i = 0; i < n; i++) {
      const lo = x0 + i * w, hi = lo + w, at = i % 2 ? hi - 0.2 - 0.45 : lo + 0.2 + 0.45;
      out.push(cabin(lo, hi, z0, z1, cls, { side: (s > 0) === !o.flip ? 'port' : 'stbd', at: Math.min(hi - 0.51, Math.max(lo + 0.51, at)), hinge: i % 2 ? 'hi' : 'lo' }, o));
    }
    return out;
  };

  /**
   * Fills x0..x1 outboard of a corridor (edge |z| = zIn, side s) up to the hull. Deep areas get "alley clusters":
   * a short transverse alley (1.2 m) from the corridor to the ship's side with two cabins on each side of it.
   */
  const side = (x0, x1, zIn, s, cls, o = {}) => {
    const deck = plan.deck, depth = minHalfWidth(deck, x0, x1) - zIn;
    if (depth < (o.minDepth ?? 5.0)) return row(x0, x1, zIn, s, cls, o);
    const n = Math.max(1, Math.round((x1 - x0) / (o.cluster ?? (cls === 'second' ? 7 : 5.6)))), cw = (x1 - x0) / n, out = [];
    const Z = (a, b) => (s > 0 ? [a, b] : [-b, -a]);
    for (let k = 0; k < n; k++) {
      const xa = x0 + k * cw, xb = xa + cw, al0 = (xa + xb) / 2 - 0.6, al1 = al0 + 1.2;
      const zo = minHalfWidth(deck, xa, xb), zm = zIn + (zo - zIn) / 2;
      gang(`alley-${++counter.alley}`, o.alleyName ?? 'Quergang', al0, al1, ...Z(zIn, 99), { wall: o.alleyWall ?? CLS[cls].wall, lamp: 'bulkhead' });
      const atI = s * (zIn + (zm - zIn) / 2), atO = s * (zm + (zo - zm) / 2);
      out.push(cabin(xa, al0, ...Z(zIn, zm), cls, { side: 'fwd', at: atI }, o));
      out.push(cabin(xa, al0, ...Z(zm, 99), cls, { side: 'fwd', at: atO }, o));
      out.push(cabin(al1, xb, ...Z(zIn, zm), cls, { side: 'aft', at: atI }, o));
      out.push(cabin(al1, xb, ...Z(zm, 99), cls, { side: 'aft', at: atO }, o));
    }
    return out;
  };
  return { room, gang, dP, dS, dA, dF, cabin, row, side, counter };
}

// ---------------------------------------------------------------- misc geometry helpers

/** Exposed pipe runs under the ceiling of a room (x along the room), added to the zone of each run. */
export function ceilingPipes(world, deck, pipeFn, x0, x1, zs, mat = 'steelDark', r = 0.06) {
  const y = ceilingY(deck) - 0.22;
  for (const z of zs) {
    for (let a = x0; a < x1 - 0.1; a += ZONE_LEN) {
      const b = Math.min(x1, a + ZONE_LEN);
      pipeFn(world.zone(deck, (a + b) / 2), mat, [[a, y, z], [b, y, z]], r);
    }
    pipeHangers(world, deck, x0, x1, y, z, r, ceilingY(deck));
  }
}
const _hgGeo = new Map();
/** Hangers for a pipe along x (axis height y, radius r) up to the ceiling `top`: drop rod + strap round the pipe every 2.4 m. */
export function pipeHangers(world, deck, x0, x1, y, z, r, top) {
  const iron = matOf('iron'), k = `${Math.round(r * 1000)}_${Math.round((top - y) * 1000)}`;
  let g = _hgGeo.get(k);
  if (!g) _hgGeo.set(k, (g = { rod: tiledBoxGeometry(0.02, top - y - r + 0.01, 0.02), strap: tiledBoxGeometry(0.03, 0.012, 2 * r + 0.02), side: tiledBoxGeometry(0.03, 2 * r, 0.01) }));
  for (let x = x0 + 0.6; x < x1 - 0.3; x += 2.4) {
    const zone = world.zone(deck, x);
    const add = (geo, yy, zz) => { const m = new THREE.Mesh(geo, iron); m.position.set(x, yy, zz); zone.add(m); };
    add(g.rod, (y + r + top) / 2, z);
    add(g.strap, y - r - 0.006, z);
    for (const s of [-1, 1]) add(g.side, y, z + s * (r + 0.005));
  }
}

/** flat poster quad on a wall plane: axis 'x' → wall at z = c (facing n = ±1 in z), along x; 'z' → wall at x = c facing ±x. */
export function poster(batch, axis, c, along, y0, w, h, n) {
  const a = along - w / 2, b = along + w / 2, uvs = [[0, 0], [1, 0], [1, 1], [0, 1]], f = c + n * 0.016, e = c + n * 0.012;
  if (axis === 'x') {
    const pts = n > 0 ? [[a, y0, f], [b, y0, f], [b, y0 + h, f], [a, y0 + h, f]] : [[b, y0, f], [a, y0, f], [a, y0 + h, f], [b, y0 + h, f]];
    batch.poly(posterMat, pts, [0, 0, n], uvs);
    batch.box(mats.woodDark, a - 0.03, y0 - 0.03, Math.min(c, e), b + 0.03, y0 + h + 0.03, Math.max(c, e), n > 0 ? 'ZxXyY' : 'zxXyY');
  } else {
    const pts = n > 0 ? [[f, y0, b], [f, y0, a], [f, y0 + h, a], [f, y0 + h, b]] : [[f, y0, a], [f, y0, b], [f, y0 + h, b], [f, y0 + h, a]];
    batch.poly(posterMat, pts, [n, 0, 0], uvs);
    batch.box(mats.woodDark, Math.min(c, e), y0 - 0.03, a - 0.03, Math.max(c, e), y0 + h + 0.03, b + 0.03, n > 0 ? 'XzZyY' : 'xzZyY');
  }
}

export const floorY = (deck) => DECK_Y[deck];
