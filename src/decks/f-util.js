// Shared helpers for the lower decks F, G and orlop: room shortcuts, cabin generators (rows and "alley clusters"),
// a small custom-prop builder, an InstancedMesh collector and the few module-level materials of these decks.
import * as THREE from 'three';
import { ZONE_LEN, DECK_Y, ceilingY } from '../core/constants.js';
import { mats, canvasTexture } from '../core/materials.js';
import { tiledBoxGeometry } from '../core/geo.js';
import { minHalfWidth, _bakeTemplate, matOf, def, kitMats, bunkThird, bunkCrew, locker, bench, coatHooks } from '../interior/kit.js';
import { AT } from '../interior/batch.js';
import * as G from '../interior/geom.js';
import { TIER } from '../core/tier.js';

/** Level of fine detail for decks C–G (TIER.fine 0..3, read at build time; see docs/CONTRACT.md "Detail levels"). */
export const fineLv = () => TIER.fine;

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

// ---------------------------------------------------------------- small clutter shared by decks C–G (kit props, front +x)
// Every prop is one cached template; placed props are merged per zone. Origins: floor / surface level unless noted.

const M = mats, K = kitMats;
function rngLocal(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
/** enamelled tin mug (white, blue rim) */
export const cgMug = def('cgMug', [0.1, 0.08, 0.1], (p, o) => {
  const m = matOf(o.mat, M.porcelain);
  p.lathe(m, [[0, 0], [0.036, 0], [0.039, 0.085], [0.035, 0.085], [0.032, 0.008], [0, 0.008]], 0, 0, 0, 8);
  p.alathe(AT.cobalt, [[0.0392, 0.078], [0.0396, 0.086], [0.035, 0.086]], 0, 0, 0, 8);
  p.t(m, 0.02, 0.005, 0, 0.045, 0.048, 'x', 8, 3);
});
/** glass of beer (o.empty: just the glass) */
export const cgGlass = def('cgGlass', [0.08, 0.08, 0.13], (p, o) => {
  p.lathe(M.glass, [[0, 0], [0.032, 0], [0.038, 0.13], [0.035, 0.13], [0.028, 0.01], [0, 0.01]], 0, 0, 0, 6);
  if (!o.empty) p.alathe(AT.amber, [[0, 0.012], [0.029, 0.012], [0.034, 0.1], [0, 0.1]], 0, 0, 0, 6);
});
/** brown-glazed teapot */
export const cgTeapot = def('cgTeapot', [0.26, 0.18, 0.18], (p) => {
  p.alathe(AT.tea, [[0, 0], [0.055, 0], [0.08, 0.035], [0.085, 0.075], [0.07, 0.115], [0.04, 0.13], [0, 0.132]], 0, 0, 0, 10);
  p.alathe(AT.tea, [[0, 0], [0.018, 0], [0.01, 0.018], [0, 0.024]], 0, 0.128, 0, 6);
  p.ag(AT.tea, G.loft([[0.07, 0.04, 0], [0.105, 0.075, 0], [0.125, 0.11, 0]], [0.018, 0.012, 0.009], 5, true));
  p.ag(AT.tea, new THREE.TorusGeometry(0.035, 0.008, 3, 8), -0.085, 0.075, 0);
});
/** ledger (closed, lying) or open on its spine (o.open); o.v colour */
export const cgLedger = def('cgLedger', [0.32, 0.46, 0.05], (p, o) => {
  const c = [AT.bookA, AT.bookB, 2, 3, 13][(o.v ?? 0) % 5];
  if (!o.open) { p.ab(c, 0.3, 0.045, 0.22, 0, 0, 0); p.ab(AT.paper, 0.29, 0.035, 0.012, 0.004, 0.005, 0.104); return; }
  p.ab(c, 0.32, 0.006, 0.46, 0, 0, 0);
  for (const s of [-1, 1]) { const m = p.ab(AT.paper, 0.3, 0.014, 0.21, 0, 0.006, s * 0.108); m.rotation.x = s * 0.05; }
  p.cz(K.ebony, 0.004, 0.15, 0.08, 0.026, 0.12, 5).rotation.y = 0.4;
});
/** counter kit: brass bell, telegram / form pads, rubber stamps in a rack, ink pad, pen tray (w along z ≈ 0.9) */
export const cgCounterSet = def('cgCounterSet', [0.3, 0.9, 0.12], (p) => {
  p.lathe(M.brass, [[0, 0], [0.045, 0], [0.045, 0.008], [0.04, 0.012], [0.039, 0.03], [0.026, 0.048], [0.008, 0.054], [0.008, 0.062], [0, 0.064]], 0.02, 0, 0.36, 8);
  for (let i = 0; i < 2; i++) { const m = p.ab(AT.paper, 0.15, 0.012, 0.21, -0.02 + i * 0.01, i * 0.012, 0.1 + i * 0.01); m.rotation.y = 0.12 * i; }
  p.ab(AT.labelBlue, 0.15, 0.004, 0.21, -0.02, 0.024, 0.1);
  p.bb(M.oak, 0.1, 0.02, 0.24, -0.06, 0, -0.18, 0.004);
  for (let i = 0; i < 4; i++) { p.alathe(AT.ebony, [[0, 0], [0.012, 0], [0.008, 0.03], [0.01, 0.05], [0.016, 0.062], [0, 0.068]], -0.06, 0.02, -0.27 + i * 0.06, 6); p.ab(AT.black, 0.03, 0.006, 0.04, -0.06, 0.014, -0.27 + i * 0.06); }
  p.bb(M.steel, 0.09, 0.012, 0.13, 0.06, 0, -0.18, 0.003); p.ab(AT.navy, 0.075, 0.002, 0.11, 0.06, 0.012, -0.18);
  p.bb(M.brass, 0.06, 0.01, 0.2, 0.08, 0, 0.12, 0.003); p.cz(K.ebony, 0.004, 0.15, 0.08, 0.016, 0.12, 5);
});
/** row of bottles (v 0 barber tonics, 1 medicine, 2 bar) standing along z */
export const cgBottles = def('cgBottles', [0.12, 0.45, 0.3], (p, o) => {
  const v = o.v ?? 0, n = o.n ?? 4, r = rngLocal(31 + v * 7 + n);
  const cells = [[AT.blueGlass, AT.amber, AT.clearGlass, AT.rose, AT.bottleGreen], [AT.amber, AT.blueGlass, AT.amber, AT.clearGlass, AT.bottleGreen], [AT.bottleGreen, AT.claret, AT.amber, AT.clearGlass, AT.bottleGreen]][v % 3];
  for (let i = 0; i < n; i++) {
    const z = -0.18 + (0.36 * i) / Math.max(1, n - 1), h = (v === 1 ? 0.1 : 0.16) + r() * 0.08, rb = v === 1 ? 0.022 : 0.028;
    p.alathe(cells[i % cells.length], [[0, 0], [rb, 0], [rb, h * 0.62], [rb * 0.4, h * 0.82], [rb * 0.4, h], [0, h]], (r() - 0.5) * 0.03, 0, z, 6);
    if (v !== 2) p.alathe(v === 1 ? AT.black : AT.brassRim, [[0, 0], [rb * 0.45, 0], [rb * 0.45, 0.02], [0, 0.02]], 0, h, z, 5);
  }
});
/** shaving kit for the top of a marble basin (same origin and facing as washbasinMarble, w 0.8): mug, brush, razor,
 *  towel, tonic bottles on the glass shelf in front of the mirror, razor strop hanging at the side */
export const cgBarberKit = def('cgBarberKit', [0.4, 0.4, 1.2], (p) => {
  const ty = 0.871;
  p.lathe(M.porcelain, [[0, 0], [0.04, 0], [0.042, 0.09], [0.038, 0.09], [0.035, 0.01], [0, 0.01]], -0.15, ty, 0.3, 8);
  p.alathe(AT.ivory, [[0, 0], [0.03, 0], [0, 0.04]], -0.15, ty + 0.08, 0.3, 6);
  p.lathe(M.woodDark, [[0, 0], [0.018, 0], [0.014, 0.05], [0.02, 0.07], [0, 0.07]], -0.06, ty, 0.33, 6);
  p.alathe(AT.ivory, [[0, 0], [0.02, 0], [0.026, 0.04], [0, 0.055]], -0.06, ty + 0.07, 0.33, 6);
  p.ab(AT.ebony, 0.13, 0.012, 0.022, 0.12, ty, 0.33).rotation.y = 0.5;
  p.bb(M.linen, 0.2, 0.02, 0.14, 0.12, ty, -0.31, 0.006);
  for (let i = 0; i < 3; i++) { const h = 0.13 + (i % 2) * 0.04; p.alathe([AT.blueGlass, AT.amber, AT.rose][i], [[0, 0], [0.024, 0], [0.024, h * 0.6], [0.01, h * 0.82], [0.01, h], [0, h]], -0.17, 1.108, -0.15 + i * 0.15, 6); }
  p.bb(M.leather, 0.006, 0.42, 0.05, -0.236, 0.46, 0.43, 0.002);
  p.b(M.brass, 0.02, 0.02, 0.06, -0.24, 0.88, 0.43);
});
/** card game on a table: four hands, a pile, pipe and ashtray, two beer glasses (fp 0.6 × 0.9) */
export const cgCards = def('cgCards', [0.6, 0.9, 0.16], (p, o) => {
  const r = rngLocal(5 + (o.v ?? 0));
  for (const [x, z, a] of [[0.2, 0, 0], [-0.2, 0, Math.PI], [0, 0.32, -Math.PI / 2], [0, -0.32, Math.PI / 2]]) {
    for (let k = 0; k < 4; k++) { const m = p.ab(AT.china, 0.055, 0.002, 0.085, x, k * 0.0015, z); m.rotation.y = a + (k - 1.5) * 0.25 + (r() - 0.5) * 0.1; }
  }
  for (let k = 0; k < 5; k++) { const m = p.ab(k % 2 ? AT.red : AT.china, 0.055, 0.003, 0.085, 0.02, 0.0005 + k * 0.003, -0.05); m.rotation.y = r() * 3; }
  p.lathe(M.brass, [[0, 0], [0.05, 0], [0.055, 0.015], [0.04, 0.012], [0, 0.006]], -0.08, 0, 0.12, 8);
  p.alathe(AT.ebony, [[0, 0], [0.012, 0], [0.014, 0.035], [0, 0.03]], -0.1, 0.01, 0.13, 5);
  p.ab(AT.ebony, 0.09, 0.008, 0.01, -0.05, 0.03, 0.135).rotation.y = 0.4;
  if (o.beer !== false) for (const [x, z] of [[0.16, 0.2], [-0.15, -0.22]]) { p.lathe(M.glass, [[0, 0], [0.032, 0], [0.038, 0.13], [0.035, 0.13], [0.028, 0.01], [0, 0.01]], x, 0, z, 6); p.alathe(AT.amber, [[0, 0.012], [0.03, 0.012], [0.034, 0.1], [0, 0.1]], x, 0, z, 6); }
});
/** draughts board with pieces in play */
export const cgDraughts = def('cgDraughts', [0.4, 0.4, 0.03], (p) => {
  p.ab(AT.ebony, 0.36, 0.015, 0.36, 0, 0, 0); p.ab(AT.ivory, 0.32, 0.002, 0.32, 0, 0.015, 0);
  const r = rngLocal(9);
  for (let i = 0; i < 14; i++) { const x = (Math.floor(r() * 8) - 3.5) * 0.04, z = (Math.floor(r() * 8) - 3.5) * 0.04; p.ag(i % 2 ? AT.red : AT.black, new THREE.CylinderGeometry(0.016, 0.016, 0.008, 6), x, 0.021, z); }
});
/** centre line of a 2.4 m mess table (between the place settings): teapot, loaf on a board, jam jar, salt and pepper */
export const cgMessCentre = def('cgMessCentre', [0.3, 1.5, 0.15], (p) => {
  const tp = cgTeapot(); for (const m of tp.children) p.add(m.geometry, m.material, 0, 0, -0.46);
  p.bb(M.oak, 0.18, 0.02, 0.28, 0, 0, 0.14, 0.004);
  p.ag(AT.ochre, G.pillow(0.12, 0.09, 0.2, 0.5, 0.6, 3, 8), 0, 0.02, 0.14);
  p.lathe(M.glass, [[0, 0], [0.03, 0], [0.032, 0.07], [0, 0.07]], 0, 0, 0.76, 6); p.alathe(AT.claret, [[0, 0.004], [0.028, 0.004], [0.028, 0.055], [0, 0.055]], 0, 0, 0.76, 6);
  for (const x of [-0.035, 0.035]) p.lathe(M.chrome, [[0, 0], [0.014, 0], [0.016, 0.05], [0.008, 0.06], [0, 0.062]], x, 0, 0.66, 6);
});
/** pair of boots (black, o.brown = brown leather) */
export const cgBoots = def('cgBoots', [0.3, 0.28, 0.32], (p, o) => {
  const m = o.brown ? M.leather : M.rubber;
  for (const s of [-1, 1]) { p.pil(m, 0.27, 0.09, 0.1, 0.03, 0, s * 0.07, 0.4, 0.5, 3, 8); p.c(m, 0.045, 0.22, -0.05, 0.06, s * 0.07, 6, 0.05); }
});
/** canvas kit bag lying on the floor */
export const cgKitBag = def('cgKitBag', [0.75, 0.36, 0.34], (p) => {
  const b = p.pil(M.canvas, 0.34, 0.32, 0.7, 0, 0, 0, 0.6, 0.6, 3, 10); b.rotation.y = Math.PI / 2;
  p.t(M.rope, 0.11, 0.01, 0.33, 0.16, 0, 'x', 8, 3);
  p.ab(AT.khaki, 0.3, 0.004, 0.08, 0, 0.318, 0);
});
/** towel hanging over the lee board / side rail of a berth (rail top at o.y, front of the rail at local x ≈ 0) */
export const cgTowelDrape = def('cgTowelDrape', [0.1, 0.3, 0.5], (p, o) => {
  const y = o.y ?? 0.45;
  p.bb(M.linen, 0.07, 0.012, 0.26, -0.035, y, 0, 0.004);
  p.bb(M.linen, 0.012, 0.26, 0.26, -0.012, y - 0.25, 0, 0.004);
});
/** rack of four red fire buckets (wall prop: origin = mounting point, faces +x) */
export const cgFireBuckets = def('cgFireBuckets', [1.0, 0.25, 0.55], (p) => {
  p.bb(K.fireRed, 0.025, 0.12, 1.0, 0.0125, 0.0, 0, 0.004);
  p.ab(AT.whitePaint, 0.002, 0.06, 0.3, 0.026, 0.03, 0);
  for (let i = 0; i < 4; i++) {
    const z = -0.375 + i * 0.25;
    p.b(M.iron, 0.05, 0.012, 0.012, 0.035, 0.07, z);
    p.lathe(K.fireRed, [[0, 0], [0.085, 0], [0.11, 0.26], [0.1, 0.25], [0, 0.25]], 0.12, -0.25, z, 8);
    p.b(M.iron, 0.012, 0.012, 0.2, 0.12, 0.005, z);
  }
});
/** galvanised bucket with a mop standing in it */
export const cgMopBucket = def('cgMopBucket', [0.4, 0.4, 1.3], (p) => {
  p.lathe(M.steel, [[0, 0], [0.13, 0], [0.16, 0.3], [0.155, 0.3], [0.125, 0.012], [0, 0.012]], 0, 0, 0, 10);
  p.t(M.iron, 0.16, 0.006, 0, 0.3, 0, 'y', 10, 3);
  p.c(K.water, 0.14, 0.004, 0, 0.2, 0, 10);
  p.loft(M.pine, [[0.02, 0.1, 0], [-0.06, 1.28, 0.02]], 0.014, 5);
  p.pil(M.canvas, 0.18, 0.16, 0.18, 0.02, 0.1, 0, 0.8, 0.8, 3, 8);
});
/** wooden plate rack with plates standing on edge (wall prop: origin = mounting point at its centre, faces +x) */
export const cgPlateRack = def('cgPlateRack', (o) => [o.w ?? 1.2, 0.3, 0.75], (p, o) => {
  const w = o.w ?? 1.2, wood = matOf(o.mat, M.pine), rows = o.rows ?? 2;
  for (const s of [-1, 1]) p.bb(wood, 0.28, 0.75, 0.03, 0.14, -0.375, s * (w / 2 - 0.015), 0.004);
  const prof = [[0, 0], [0.122, 0.014], [0, 0.008]];
  for (let k = 0; k < rows; k++) {
    const y = -0.34 + k * 0.36;
    p.b(wood, 0.24, 0.02, w - 0.06, 0.14, y, 0);
    for (const x of [0.05, 0.22]) p.cz(wood, 0.008, w - 0.06, x, y + 0.2, 0, 5);
    const n = Math.floor((w - 0.16) / 0.055);
    for (let i = 0; i < n; i++) {
      const z = -w / 2 + 0.08 + i * 0.055, pl = (i + k) % 3 ? p.lathe(M.porcelain, prof, 0.135, y + 0.14, z, 8) : p.alathe(AT.china, prof, 0.135, y + 0.14, z, 8); pl.rotation.x = Math.PI / 2;
    }
  }
});
/** set of copper saucepans with long iron handles (stand on a range top / shelf, along z) */
export const cgCopperPans = def('cgCopperPans', [0.4, 0.95, 0.22], (p, o) => {
  const r = rngLocal(11 + (o.v ?? 0));
  for (let i = 0; i < 3; i++) {
    const z = -0.32 + i * 0.32, rr = 0.1 + r() * 0.04, h = 0.1 + r() * 0.08;
    p.lathe(M.copper, [[0, 0], [rr, 0], [rr + 0.006, h], [rr, h], [rr - 0.006, 0.01], [0, 0.01]], 0, 0, z, 10);
    if (i !== 1) p.lathe(M.copper, [[0, 0], [rr + 0.01, 0], [rr * 0.6, 0.03], [0.015, 0.04], [0.02, 0.06], [0, 0.062]], 0, h, z, 10);
    p.b(M.iron, 0.2, 0.015, 0.02, -rr - 0.1, h - 0.03, z);
  }
});
/** framed bill of fare / notice board (wall prop: origin = centre, faces +x) */
export const cgMenuBoard = def('cgMenuBoard', [0.5, 0.04, 0.7], (p, o) => {
  const fr = matOf(o.mat, M.woodDark);
  for (const [sy, sz, y, z] of [[0.04, 0.5, -0.35, 0], [0.04, 0.5, 0.31, 0], [0.62, 0.04, -0.31, -0.23], [0.62, 0.04, -0.31, 0.23]]) p.b(fr, 0.03, sy, sz, 0.015, y, z);
  const g = new THREE.PlaneGeometry(0.42, 0.56); g.rotateY(Math.PI / 2); p.add(g, K.notice, 0.012, 0, 0);
  p.b(M.brass, 0.006, 0.035, 0.24, 0.03, 0.36, 0);
});
/** enamel jug standing in its basin */
export const cgJugBasin = def('cgJugBasin', [0.42, 0.42, 0.3], (p) => {
  p.lathe(M.porcelain, [[0, 0], [0.11, 0], [0.19, 0.07], [0.2, 0.085], [0.19, 0.085], [0.1, 0.012], [0, 0.012]], 0, 0, 0, 12);
  p.alathe(AT.cobalt, [[0.2, 0.085], [0.203, 0.09], [0.19, 0.088]], 0, 0, 0, 12);
  p.lathe(M.porcelain, [[0, 0], [0.06, 0], [0.085, 0.08], [0.07, 0.17], [0.055, 0.22], [0.07, 0.26], [0, 0.255]], 0, 0.012, 0, 10);
  p.t(M.porcelain, 0.05, 0.008, -0.085, 0.16, 0, 'z', 8, 3);
});
/** bundles of letters tied with string (lying on a table, fp 0.5 × 0.4) */
export const cgLetters = def('cgLetters', [0.5, 0.4, 0.12], (p, o) => {
  const r = rngLocal(3 + (o.v ?? 0));
  for (let i = 0; i < 5; i++) {
    const x = (r() - 0.5) * 0.3, z = (r() - 0.5) * 0.2, h = 0.03 + r() * 0.05, y = i > 3 ? 0.06 : 0, a = r() * 0.6 - 0.3;
    p.ab(r() < 0.3 ? AT.label : AT.paper, 0.15, h, 0.1, x, y, z).rotation.y = a;
    p.ab(AT.straw, 0.152, 0.004, 0.012, x, y + h, z).rotation.y = a;
  }
});
/** towel rail with towels and bathing costumes (wall prop: origin = mounting point, faces +x) */
export const cgTowelHooks = def('cgTowelHooks', (o) => [o.w ?? 0.8, 0.12, 0.7], (p, o) => {
  const w = o.w ?? 0.8, n = Math.max(2, Math.round(w / 0.28)), r = rngLocal(7 + n + (o.v ?? 0));
  p.bb(matOf(o.mat, M.mahogany), 0.025, 0.09, w, 0.0125, -0.045, 0, 0.005);
  for (let i = 0; i < n; i++) {
    const z = -w / 2 + (w * (i + 0.5)) / n, k = r();
    p.b(M.brass, 0.06, 0.012, 0.012, 0.05, -0.01, z);
    if (k < 0.55) p.bb(M.linen, 0.03, 0.5, 0.2, 0.07, -0.52, z, 0.008);
    else if (k < 0.8) p.ag(AT.navy, G.pillow(0.04, 0.55, 0.22, 0.4, 0.3, 3, 6), 0.07, -0.56, z);
  }
});
/** barber's pole on a wall bracket (wall prop: origin = mounting point, faces +x) */
export const cgBarberPole = def('cgBarberPole', [0.22, 0.24, 0.95], (p) => {
  p.bb(M.brass, 0.02, 0.12, 0.08, 0.01, -0.06, 0, 0.004);
  p.b(M.brass, 0.13, 0.025, 0.025, 0.08, -0.02, 0);
  const cols = [K.fireRed, M.paintWhite, M.fabricBlue, M.paintWhite];
  for (let i = 0; i < 12; i++) p.c(cols[i % 4], 0.04, 0.05, 0.16, -0.36 + i * 0.05, 0, 6);
  for (const y of [-0.4, 0.24]) p.c(M.brass, 0.05, 0.04, 0.16, y, 0, 6);
  p.s(M.gold, 0.045, 0.16, 0.31, 0, 1, 1, 1); p.s(M.gold, 0.03, 0.16, -0.43, 0, 1, 1, 1);
});

/** Hang a wall prop on a wall of a FurnishCtx where the floor in front of it is free (tries positions ts × wall length). */
export function hangFree(ctx, prop, walls, hgt, ts = [0.5, 0.3, 0.7, 0.2, 0.8], depth = 0.3) {
  const fp = prop.userData.fp ?? { w: 0.5 };
  for (const wall of [].concat(walls)) {
    if (wall === ctx.hull) continue;
    const side = wall === 'left' || wall === 'right', len = side ? ctx.D : ctx.W;
    for (const t of ts) {
      const q = len * t;
      if (q - fp.w / 2 < 0.15 || q + fp.w / 2 > len - 0.15) continue;
      const [u, v] = wall === 'left' ? [depth / 2 + 0.01, q] : wall === 'right' ? [ctx.W - depth / 2 - 0.01, q] : wall === 'near' ? [q, depth / 2 + 0.01] : [q, ctx.D - depth / 2 - 0.01];
      if (!ctx.free(u, v, side ? depth : fp.w, side ? fp.w : depth)) continue;
      if (ctx.mount(prop, wall, q, hgt)) { ctx.occupied.push(ctx._rect(u, v, side ? depth : fp.w, side ? fp.w : depth)); return true; }
    }
  }
  return false;
}

/**
 * The kit's dormitory (rows of two-tier bunks, lockers, a bench) with the men's belongings: boots under the berths, kit bags
 * on the upper berths, coats on hooks (from fine 1), mugs on the bench (fine 2). Same layout as PRESETS.dormitory.
 */
export function dormitoryPlus(ctx) {
  const fl = fineLv(), pine = !!ctx.opts.pine, make = pine ? () => bunkThird() : () => bunkCrew(), L = 2.0, w = 0.75;
  const nv = Math.floor((ctx.D - 0.9) / L), v0 = 0.9 + (ctx.D - 0.9 - nv * L) / 2, rows = [];
  const inner = Math.max(0, Math.floor((ctx.W - 2 * w - 1.0) / (2 * w + 2.0 + 1e-6)));
  rows.push([w / 2 + 0.03, 'right'], [ctx.W - w / 2 - 0.03, 'left']);
  for (let k = 0; k < inner; k++) { const c = ((k + 1) * ctx.W) / (inner + 1); rows.push([c - w / 2 - 0.01, 'left'], [c + w / 2 + 0.01, 'right']); }
  let n = 0;
  for (const [u, dir] of rows) for (let j = 0; j < nv; j++) {
    if (!ctx.put(make(), u, v0 + (j + 0.5) * L, dir) || fl < 0) continue;
    const k = (n++ * 7 + j * 3 + Math.round(u * 5)) % 6;
    if (k < 3) ctx.attach(cgBoots({ brown: k === 1 }), 0.12, k === 2 ? 0.45 : -0.35, { y: 0.001, turn: (k - 1) * 0.3 });
    if (fl >= 1 && (k === 3 || k === 0)) ctx.attach(cgKitBag(), 0.0, 0.5, { y: 1.37, turn: k ? 0.1 : -0.15 });
    if (fl >= 2 && (k === 1 || k === 4)) ctx.attach(cgTowelDrape({ y: pine ? 0.45 : 0.36 }), 0.395, k === 1 ? 0.25 : -0.5, { y: 0.001 });
  }
  ctx.fit(locker({ n: 3 }), ['near:hi', 'near:mid', 'far:mid']);
  const bn = ctx.fit(bench({ w: 1.6, back: false }), ['near:mid', 'far:lo'], { collide: false });
  if (fl < 1) return;
  if (bn && fl >= 2) for (const dz of [-0.45, 0.2]) ctx.attach(cgMug(), 0.02, dz, { y: 0.435, turn: dz * 3 });
  for (let i = 0; i < 2; i++) hangFree(ctx, coatHooks({ n: 3, v: i + Math.round(ctx.W) }), ['near', 'far', 'left', 'right'], 1.75, [0.5, 0.25, 0.75], 0.4);
}

// ---------------------------------------------------------------- instanced rivet heads (flattened octahedra, 8 triangles)

const _rivGeo = new THREE.SphereGeometry(1, 4, 2);
/** Collects rivet heads per (zone, material) into InstancedMeshes. add(mat, x, y, z, axis) with axis = surface normal axis. */
export class Rivets {
  constructor(world, deck, r = 0.011) { this.world = world; this.deck = deck; this.r = r; this.sets = new Map(); this.n = 0; }
  add(mat, x, y, z, axis = 'y') {
    const zi = Math.floor(x / ZONE_LEN), k = zi + '|' + mat.uuid;
    let s = this.sets.get(k); if (!s) this.sets.set(k, (s = { zi, mat, list: [] }));
    s.list.push(x, y, z, axis === 'x' ? 0 : axis === 'y' ? 1 : 2); this.n++;
  }
  /** a row of rivets from p to q (pitch in m) */
  row(mat, p, q, pitch, axis) {
    const L = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]), n = Math.max(1, Math.floor(L / pitch));
    for (let i = 0; i <= n; i++) { const t = i / n; this.add(mat, p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t, axis); }
  }
  tris() { return this.n * 8; }
  flush() {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), sc = new THREE.Vector3();
    for (const s of this.sets.values()) {
      const c = s.list.length / 4, im = new THREE.InstancedMesh(_rivGeo, s.mat, c), r = this.r;
      for (let i = 0; i < c; i++) {
        const a = s.list[i * 4 + 3];
        pos.set(s.list[i * 4], s.list[i * 4 + 1], s.list[i * 4 + 2]); sc.set(a === 0 ? r * 0.45 : r, a === 1 ? r * 0.45 : r, a === 2 ? r * 0.45 : r);
        m.compose(pos, q, sc); im.setMatrixAt(i, m);
      }
      im.instanceMatrix.needsUpdate = true; im.computeBoundingBox(); im.computeBoundingSphere();
      im.userData.noMerge = true;
      this.world.zone(this.deck, s.zi * ZONE_LEN + 1).add(im);
    }
    this.sets.clear();
  }
}
