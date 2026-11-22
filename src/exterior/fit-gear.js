import * as THREE from 'three';
import { mats } from '../core/materials.js';
import { box } from '../core/geo.js';
import { DECK_Y, BOAT_HOUSES, BOAT_LOW_ROOFS, A_HOUSE } from '../core/constants.js';
import { BY, RY, LOW_ROOF_Y, cyl, vcyl, ball, mk, gridGeo, edge, edgeSlope, roofAt } from './fit-util.js';
import { Inst, merge, boxG, cylG, sphG, latheGeo } from './inst.js';
import { Batch } from './structure-batch.js';
import { strokeText } from './structure-font.js';

// Deck gear of the boat deck, house roofs and A-deck promenade:
// ventilators, fan housings, tanks, skylights, compass platform, benches, deck chairs, life rings, lamps.

const TAU = Math.PI * 2;

// ---------- cowl ventilator (bent cowl: lathe swept round a quarter bend, flared bell mouth, red inside) ----------
let COWL = null;
function cowlGeos() {
  if (COWL) return COWL;
  const Rb = 1.25, K = 14, N = 20;
  const flare = (f) => 1 + 0.78 * Math.pow(f, 1.8);
  const ring = (i, j, k = 1) => {
    const f = i / K, ph = f * Math.PI / 2, rr = flare(f) * k, al = (j / N) * TAU;
    const c = Math.cos(al) * rr, s = Math.sin(al) * rr;
    return [Rb * (1 - Math.cos(ph)) + c * Math.cos(ph), Rb * Math.sin(ph) - c * Math.sin(ph), s];
  };
  const outer = gridGeo(K + 1, N + 1, (i, j) => ring(i, j));
  const inner = gridGeo(K - 3, N + 1, (i, j) => ring(i + 4, j, 0.96), true);
  // rolled lip round the mouth
  const lip = gridGeo(6, N + 1, (i, j) => {
    const a = (i / 5) * Math.PI, f = 1, ph = Math.PI / 2, rr = flare(f) + 0.04 - 0.04 * Math.cos(a), al = (j / N) * TAU, dx = 0.05 * Math.sin(a);
    const c = Math.cos(al) * rr, s = Math.sin(al) * rr;
    return [Rb * (1 - Math.cos(ph)) + c * Math.cos(ph) + dx, Rb * Math.sin(ph) - c * Math.sin(ph), s];
  });
  const f4 = 4 / K, ph4 = f4 * Math.PI / 2;
  const mouth = new THREE.CircleGeometry(flare(f4) * 0.96, N).rotateY(Math.PI / 2).rotateZ(Math.PI / 2 - ph4).translate(Rb * (1 - Math.cos(ph4)), Rb * Math.sin(ph4), 0);
  COWL = { outer: merge([outer, lip]), inner, mouth };
  return COWL;
}
export function cowl(parent, x, y, z, r, h, yaw = 0, mat = mats.paintWhite) {
  const G = cowlGeos();
  parent.add(vcyl(mat, x, y - 0.04, z, h + 0.04, r, 16));
  parent.add(vcyl(mat, x, y - 0.04, z, 0.14, r * 1.35, 16, r * 1.2));                     // deck collar
  parent.add(vcyl(mat, x, y + h * 0.55 - 0.03, z, 0.06, r * 1.06, 16));                    // band
  parent.add(vcyl(mat, x, y + h - 0.12, z, 0.12, r * 1.1, 16));                            // swivel joint
  const head = mk(G.outer, mat, x, y + h, z, true); head.scale.setScalar(r); head.rotation.y = yaw; parent.add(head);
  for (const [g, m] of [[G.inner, mats.hullRed], [G.mouth, mats.iron]]) { const q = mk(g, m, x, y + h, z); q.scale.setScalar(r); q.rotation.y = yaw; parent.add(q); }
  // turning handles (bent bars on both sides)
  for (const s of [-1, 1]) {
    const hz = z + s * (r + 0.1), hy = y + h * 0.55;
    parent.add(cyl(mats.iron, x - 0.12, hy, z + s * r, x - 0.12, hy, hz, 0.014, 4));
    parent.add(cyl(mats.iron, x + 0.12, hy, z + s * r, x + 0.12, hy, hz, 0.014, 4));
    parent.add(cyl(mats.iron, x - 0.12, hy, hz, x + 0.12, hy, hz, 0.016, 5));
  }
}

/** Mushroom vent: pipe, domed cap with a drip lip, gauze band. */
export function mushroom(parent, x, y, z, r = 0.22, h = 0.9, mat = mats.paintWhite) {
  parent.add(vcyl(mat, x, y - 0.03, z, h, r, 14));
  parent.add(vcyl(mat, x, y - 0.03, z, 0.08, r * 1.3, 14));
  parent.add(vcyl(mats.iron, x, y + h - 0.03, z, 0.1, r * 1.02, 14));
  const cap = mk(latheGeo('mush', [[0.5, 0.02], [0.9, 0.0], [0.98, 0.02], [0.95, 0.1], [0.8, 0.2], [0.5, 0.27], [0.001, 0.3]], 14), mat, x, y + h + 0.04, z);
  cap.scale.set(r * 1.9, 0.6, r * 1.9);
  parent.add(cap);
}

// ---------- Sirocco fan housing ----------
function sirocco(parent, x, y, z, s, yawQuarter = false) {
  const g = new THREE.Group(); g.position.set(x, y, z); if (yawQuarter) g.rotation.y = Math.PI / 2;
  parent.add(g);
  const W = mats.paintWhite;
  g.add(box(mats.steelDark, 2.0, 0.1, 1.9, 0, 0.05, 0));
  g.add(cyl(W, 0, 1.0, -0.33, 0, 1.0, 0.33, 0.86, 24));                       // scroll casing
  for (const fz of [-0.34, 0.34]) g.add(cyl(W, 0, 1.0, fz - 0.03, 0, 1.0, fz + 0.03, 0.91, 24)); // rim flanges
  g.add(box(W, 0.9, 0.85, 0.66, 0.5, 1.55, 0));                                // tangential discharge
  g.add(box(W, 0.9, 0.5, 0.66, 0.5, 0.35, 0));
  g.add(box(W, 1.0, 0.08, 0.76, 0.5, 1.98, 0));
  // louvres on the discharge trunk
  for (let k = 0; k < 6; k++) { const b = box(W, 0.04, 0.08, 0.6, 0.97, 1.25 + k * 0.1, 0); b.rotation.z = -0.5; g.add(b); }
  g.add(cyl(W, 0, 1.0, s * 0.33, 0, 1.0, s * 0.62, 0.5, 16, 0.62)); // inlet bell
  g.add(cyl(mats.iron, 0, 1.0, s * 0.6, 0, 1.0, s * 0.63, 0.56, 16));
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI; g.add(cyl(mats.iron, Math.cos(a) * 0.55, 1.0 + Math.sin(a) * 0.55, s * 0.64, -Math.cos(a) * 0.55, 1.0 - Math.sin(a) * 0.55, s * 0.64, 0.01, 3)); } // guard
  g.add(cyl(mats.steelDark, 0, 1.0, -s * 0.33, 0, 1.0, -s * 0.95, 0.3, 14));      // electric motor
  for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; g.add(cyl(mats.steelDark, Math.cos(a) * 0.31, 1.0 + Math.sin(a) * 0.31, -s * 0.4, Math.cos(a) * 0.31, 1.0 + Math.sin(a) * 0.31, -s * 0.9, 0.02, 3)); } // cooling ribs
  g.add(cyl(mats.steelDark, 0, 1.0, -s * 0.95, 0, 1.0, -s * 1.02, 0.2, 12));
  g.add(box(mats.steelDark, 0.5, 0.7, 0.5, 0, 0.4, -s * 0.66));
  g.add(box(mats.brass, 0.18, 0.1, 0.01, 0.2, 0.55, -s * 0.915));                 // maker's plate
  for (const sx of [-0.55, 0.55]) g.add(box(W, 0.08, 0.6, 0.7, sx, 0.3, 0));
}

// ---------- skylights ----------
const triGeoCache = new Map();
function gableGeo(w, r) {
  const k = Math.round(w * 100) + '_' + Math.round(r * 100);
  let g = triGeoCache.get(k);
  if (!g) {
    g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -w, 0, 0, w, 0, r, 0, 0, 0, w, 0, 0, -w, 0, r, 0], 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute([1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(12), 2));
    triGeoCache.set(k, g);
  }
  return g;
}
/** Ridge skylight with glazed, barred leaves on a coaming. */
function skylight(parent, x0, x1, z0, z1, y, { coam = 0.4, rise = 0.5, bars = 0.9 } = {}) {
  const xc = (x0 + x1) / 2, zc = (z0 + z1) / 2, w = (z1 - z0) / 2, len = x1 - x0;
  const W = mats.paintWhite;
  parent.add(box(W, len, coam, 0.08, xc, y + coam / 2, z0 + 0.04));
  parent.add(box(W, len, coam, 0.08, xc, y + coam / 2, z1 - 0.04));
  parent.add(box(W, 0.08, coam, 2 * w, x0 + 0.04, y + coam / 2, zc));
  parent.add(box(W, 0.08, coam, 2 * w, x1 - 0.04, y + coam / 2, zc));
  parent.add(box(mats.woodDark, len + 0.06, 0.05, 2 * w + 0.06, xc, y + coam - 0.02, zc));
  parent.add(box(mats.windowLit, len - 0.16, 0.04, 2 * w - 0.16, xc, y + coam - 0.1, zc));
  const l = Math.hypot(w, rise), an = Math.atan2(rise, w);
  for (const s of [-1, 1]) {
    const p = box(mats.glass, len - 0.06, 0.02, l, xc, y + coam + rise / 2, zc + (s * w) / 2); p.rotation.x = s * an; parent.add(p);
    const n = Math.max(1, Math.round(len / bars));
    for (let k = 0; k <= n; k++) {
      const b = box(W, 0.06, 0.05, l + 0.04, x0 + 0.03 + ((len - 0.06) * k) / n, y + coam + rise / 2 + 0.01, zc + (s * w) / 2); b.rotation.x = s * an; parent.add(b);
      // glazing bars between the main bars
      if (k < n) { const bb = box(W, 0.025, 0.03, l, x0 + 0.03 + ((len - 0.06) * (k + 0.5)) / n, y + coam + rise / 2 + 0.01, zc + (s * w) / 2); bb.rotation.x = s * an; parent.add(bb); }
    }
    // brass guard rods over the glass
    for (const f of [0.3, 0.65]) parent.add(cyl(mats.brass, x0, y + coam + rise * (1 - f) + 0.05, zc + s * w * f, x1, y + coam + rise * (1 - f) + 0.05, zc + s * w * f, 0.012, 4));
    // stays / opening gear
    parent.add(cyl(mats.brass, xc, y + coam, zc + s * (w - 0.1), xc, y + coam + rise * 0.5, zc + s * (w * 0.5), 0.01, 3));
  }
  parent.add(box(W, len + 0.06, 0.07, 0.1, xc, y + coam + rise + 0.01, zc));
  for (const x of [x0 + 0.01, x1 - 0.01]) parent.add(mk(gableGeo(w, rise), W, x, y + coam, zc));
}

// ---------- benches (teak slats on cast-iron ends) ----------
let BENCH = null;
function benchGeos() {
  if (BENCH) return BENCH;
  const wood = [], iron = [];
  for (let k = 0; k < 5; k++) wood.push(boxG(1.8, 0.028, 0.085, 0, 0.43, 0.2 - k * 0.1));
  for (let k = 0; k < 4; k++) { const b = boxG(1.8, 0.085, 0.026, 0, 0, 0); b.rotateX(0.22); b.translate(0, 0.53 + k * 0.11, -0.25 - k * 0.026); wood.push(b); }
  // cast-iron end frame: scroll profile with arm rest, extruded
  const sh = new THREE.Shape();
  sh.moveTo(0.24, 0); sh.lineTo(0.3, 0); sh.quadraticCurveTo(0.22, 0.2, 0.24, 0.41); sh.lineTo(0.22, 0.6); sh.quadraticCurveTo(0.28, 0.66, 0.2, 0.68);
  sh.quadraticCurveTo(0.0, 0.64, -0.12, 0.6); sh.lineTo(-0.2, 0.62); sh.quadraticCurveTo(-0.34, 0.9, -0.3, 0.98); sh.lineTo(-0.36, 0.98);
  sh.quadraticCurveTo(-0.38, 0.7, -0.26, 0.42); sh.quadraticCurveTo(-0.34, 0.2, -0.36, 0); sh.lineTo(-0.29, 0); sh.quadraticCurveTo(-0.24, 0.2, -0.2, 0.4);
  sh.lineTo(0.18, 0.4); sh.quadraticCurveTo(0.2, 0.2, 0.24, 0);
  const hole = new THREE.Path(); hole.absellipse(0.0, 0.52, 0.09, 0.06, 0, TAU, true); sh.holes.push(hole);
  for (const dx of [-0.86, 0.86]) {
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.035, bevelEnabled: false, curveSegments: 4 });
    g.rotateY(Math.PI / 2); g.translate(dx - 0.0175, 0, 0);
    iron.push(g);
  }
  iron.push(boxG(0.05, 0.03, 0.42, 0, 0.405, -0.02)); // centre bearer
  iron.push(boxG(0.04, 0.43, 0.04, 0, 0.2, 0.18));
  BENCH = { wood: merge(wood), iron: merge(iron) };
  return BENCH;
}
/** Teak deck bench, 1.8 m long along x. `s` = side the sitter faces (+1 = towards +z). */
export function bench(world, parent, x, y, z, s) {
  const G = benchGeos();
  for (const [g, m] of [[G.wood, mats.oak], [G.iron, mats.iron]]) { const b = mk(g, m, x, y, z); b.rotation.y = s > 0 ? 0 : Math.PI; parent.add(b); }
  world.addCollider(x - 0.92, y, z - s * 0.34, x + 0.92, y + 0.9, z + s * 0.3);
}

// ---------- deck chairs (instanced, slatted, with leg rest) ----------
function chairGeos() {
  const parts = [], sling = [], rug = [];
  const b = (arr, w, h, d, x, y, z, rx = 0) => { arr.push(boxG(w, h, d, 0, 0, 0, rx).translate(x, y, z)); };
  const A = 0.957;
  for (const s of [-1, 1]) {
    b(parts, 0.04, 0.045, 0.72, s * 0.27, 0.36, 0.62);                       // seat rail
    b(parts, 0.04, 0.045, 0.62, s * 0.27, 0.3, 1.25, -0.25);                   // leg rest rail
    b(parts, 0.04, 0.36, 0.04, s * 0.27, 0.18, 0.3);
    b(parts, 0.04, 0.34, 0.04, s * 0.27, 0.15, 1.5);
    b(parts, 0.04, 0.045, 0.78, s * 0.27, 0.645, 0.085, A);                    // back rail
    b(parts, 0.05, 0.03, 0.6, s * 0.3, 0.58, 0.48);                           // arm rest
    b(parts, 0.035, 0.22, 0.035, s * 0.3, 0.47, 0.72);
  }
  b(parts, 0.58, 0.04, 0.04, 0, 0.955, -0.135);
  b(parts, 0.58, 0.04, 0.04, 0, 0.27, 1.52);
  for (let k = 0; k < 5; k++) b(sling, 0.5, 0.016, 0.085, 0, 0.385, 0.3 + k * 0.11);             // seat slats
  for (let k = 0; k < 6; k++) { const t = (k + 0.5) / 6; b(sling, 0.5, 0.016, 0.1, 0, 0.36 + 0.58 * t, 0.29 - 0.42 * t, A); } // back slats
  for (let k = 0; k < 4; k++) b(sling, 0.5, 0.016, 0.1, 0, 0.34 - k * 0.03, 0.98 + k * 0.13, -0.25);  // leg rest slats
  // folded steamer rug draped over the leg rest
  const r = boxG(0.5, 0.05, 0.42, 0, 0, 0, -0.2).translate(0, 0.36, 1.08);
  rug.push(r, boxG(0.52, 0.16, 0.035, 0, 0.29, 1.3), boxG(0.06, 0.03, 0.42, 0.2, 0.395, 1.08, -0.2));
  return { wood: merge(parts), sling: merge(sling), rug: merge(rug) };
}

// ---------- life ring with "S.S. TITANIC" and its holder ----------
let RING = null;
function ringGeos() {
  if (RING) return RING;
  const R = 0.29, r = 0.065;
  const bt = new Batch();
  // text over the upper half of the front face, u = arc length, v = radial offset
  const S = (u, v, o) => { const th = Math.PI / 2 - u / R, rr = R + v; const zf = Math.sqrt(Math.max(0, r * r - v * v)); return [Math.cos(th) * rr, Math.sin(th) * rr, zf + o]; };
  const N = (u, v) => { const th = Math.PI / 2 - u / R; const zf = Math.sqrt(Math.max(0, r * r - v * v)); return [Math.cos(th) * v, Math.sin(th) * v, zf]; };
  strokeText(bt, mats.iron, 'S.S. TITANIC', { S, N, u0: -0.43, v0: -0.03, h: 0.06, track: 0.12, width: 0.86, depth: 0.004, stroke: 0.011, sides: false });
  const grp = new THREE.Group(); bt.flush(grp);
  RING = {
    ring: new THREE.TorusGeometry(R, r, 8, 24),
    band: new THREE.TorusGeometry(R + 0.001, r + 0.003, 8, 4, 0.3),
    text: grp.children[0].geometry,
    holder: merge([boxG(0.5, 0.06, 0.03, 0, 0.3, -0.09), cylG([-0.18, 0.3, -0.08], [-0.18, 0.25, 0.0], 0.012, 4), cylG([0.18, 0.3, -0.08], [0.18, 0.25, 0.0], 0.012, 4), boxG(0.05, 0.62, 0.03, 0, 0, -0.09)]),
  };
  return RING;
}
export function lifeRing(parent, x, y, z, yaw = 0) {
  const G = ringGeos();
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = yaw + (z > 0 ? Math.PI : 0); parent.add(g); // lettering faces inboard
  g.add(mk(G.ring, mats.paintWhite));
  for (let k = 0; k < 4; k++) { const b = mk(G.band, mats.fabricRed); b.rotation.z = k * (Math.PI / 2) + 0.62 - 0.15; g.add(b); }
  g.add(mk(G.text, mats.iron));
  g.add(mk(G.holder, mats.woodDark));
  // rope becket round the ring
  for (let k = 0; k < 4; k++) { const b = mk(BECKET(), mats.rope); b.rotation.z = k * Math.PI / 2 + Math.PI / 4; g.add(b); }
}
let _becket = null;
function BECKET() { return (_becket ||= new THREE.TorusGeometry(0.36, 0.008, 3, 10, 0.9).rotateZ(-0.45)); }

// ---------- lamps ----------
/** Bulkhead lamp on a wall; `nz` = direction the lamp sticks out (±1 along z). */
export function wallLamp(world, parent, x, y, z, nz, register = true) {
  parent.add(box(mats.brass, 0.14, 0.14, 0.05, x, y, z + nz * 0.025));
  parent.add(cyl(mats.brass, x, y, z, x, y, z + nz * 0.16, 0.035, 6));
  parent.add(ball(mats.lampGlow, x, y - 0.03, z + nz * 0.19, 0.085, 8, 6));
  parent.add(vcyl(mats.brass, x, y + 0.04, z + nz * 0.19, 0.04, 0.06, 6, 0.03));
  if (register) world.addLamp({ x, y: y - 0.05, z: z + nz * 0.3, intensity: 1 });
}
/** Deckhead lamp hanging under a ceiling at height y (brass rose, globe in a wire cage). */
export function ceilingLamp(world, parent, x, y, z, register = true) {
  parent.add(vcyl(mats.brass, x, y - 0.04, z, 0.04, 0.12, 10, 0.1));
  parent.add(vcyl(mats.brass, x, y - 0.08, z, 0.04, 0.03, 6));
  parent.add(ball(mats.lampGlow, x, y - 0.17, z, 0.09, 10, 8, 1.1));
  for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU + 0.785; parent.add(cyl(mats.brass, x + Math.cos(a) * 0.1, y - 0.08, z + Math.sin(a) * 0.1, x + Math.cos(a) * 0.07, y - 0.28, z + Math.sin(a) * 0.07, 0.006, 3)); }
  if (register) world.addLamp({ x, y: y - 0.25, z, intensity: 1 });
}

/** Wooden sand box with lid and handles (fire precaution). */
function sandBox(parent, x, y, z, yaw) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = yaw; parent.add(g);
  g.add(box(mats.oak, 0.6, 0.36, 0.4, 0, 0.18, 0));
  g.add(box(mats.oak, 0.64, 0.04, 0.44, 0, 0.38, 0));
  for (const s of [-1, 1]) g.add(box(mats.brass, 0.02, 0.03, 0.14, s * 0.31, 0.28, 0));
  g.add(box(mats.paintWhite, 0.3, 0.08, 0.005, 0, 0.22, 0.2025));
}

/** Vertical iron ladder (stiles + rungs) against a wall facing nx (along x), from y0 to y1. */
function wallLadder(parent, x, z, y0, y1, nx) {
  for (const dz of [-0.2, 0.2]) parent.add(cyl(mats.paintWhite, x + nx * 0.14, y0, z + dz, x + nx * 0.14, y1 + 0.9, z + dz, 0.02, 6));
  for (let y = y0 + 0.3; y < y1 + 0.05; y += 0.3) parent.add(cyl(mats.paintWhite, x + nx * 0.14, y, z - 0.2, x + nx * 0.14, y, z + 0.2, 0.012, 5));
  for (const y of [y0 + 0.6, y1 - 0.4]) for (const dz of [-0.2, 0.2]) parent.add(cyl(mats.paintWhite, x, y, z + dz, x + nx * 0.14, y, z + dz, 0.012, 4));
}

export function buildGear(world, parent) {
  const root = new THREE.Group(); root.name = 'deckGear';
  parent.add(root);
  world.markForBake(root);
  const [fwdH, midH, aftH] = BOAT_HOUSES;
  const [low1, low2] = BOAT_LOW_ROOFS;
  const inst = new Inst();

  // ================= ventilators on the house roofs =================
  const roofCowls = [
    // [x, z, r, h, yaw(0 = mouth forward)]
    [61.6, 1.9, 0.42, 1.9, 0], [49.4, 2.3, 0.36, 1.5, 0],
    [38.3, 4.9, 0.36, 1.5, 0], [29.4, 2.6, 0.36, 1.5, 0],
    [17.0, 4.5, 0.36, 1.6, 0], [6.1, 4.5, 0.36, 1.5, 0],
    [-5.6, 5.1, 0.34, 1.4, 0], [-14.9, 2.4, 0.36, 1.6, 0],
    [-46.3, 2.6, 0.3, 1.2, 0],
    [-20.2, 4.5, 0.5, 2.3, 0], [-31.5, 4.7, 0.34, 1.3, 0],
  ];
  for (const [x, z, r, h, yaw] of roofCowls) for (const s of [-1, 1]) cowl(root, x, roofAt(x, s * z), s * z, r, h, yaw + s * 0.25);
  // mushroom vents scattered over the roofs
  for (const [x, z] of [[66, 5.5], [58.5, 6.2], [45, 5.8], [40.5, 6.3], [36, 6.2], [31, 6.4], [14.5, 6], [9, 6.1], [-2, 6], [-8, 6.1], [-12, 6.2], [-40.5, 3.8], [-45, 4.1], [21, 5.2], [25.6, 5.2], [-27, 5.1], [-23, 5.2], [70.5, 5.5]]) {
    for (const s of [-1, 1]) mushroom(root, x, roofAt(x, s * z), s * z, 0.2, 0.75);
  }
  // two tall cowls on the open second-class part of the boat deck
  for (const s of [-1, 1]) {
    cowl(root, -54.5, BY, s * 2.3, 0.46, 2.3, s * 0.3);
    world.addCollider(-55.1, BY, s * 2.3 - 0.6, -53.9, BY + 2.2, s * 2.3 + 0.6);
  }

  // ================= Sirocco fans =================
  for (const [x, z] of [[52.6, 5.7], [30.4, 5.7], [4.6, 5.4], [-13.3, 5.5]]) for (const s of [-1, 1]) sirocco(root, x, roofAt(x, s * z), s * z, s);
  sirocco(root, -36.2, BY, 0, 1, true); // large engine-room fan abaft the engine casing (on deck, between house and raised roof)
  world.addCollider(-37.2, BY, -1.1, -35.2, BY + 2.1, 1.1);

  // ================= tanks =================
  for (const s of [-1, 1]) {
    // cylindrical fresh-water gravity tanks on the raised roof between funnels 2 and 3
    const z = s * 4.7, y = LOW_ROOF_Y;
    root.add(cyl(mats.paintWhite, 21.4, y + 0.85, z, 24.6, y + 0.85, z, 0.72, 20, 0.72, true));
    for (const x of [21.38, 24.62]) { const e = ball(mats.paintWhite, x, y + 0.85, z, 0.72, 14, 8); e.scale.set(0.25, 0.72, 0.72); root.add(e); }
    for (const x of [21.9, 22.95, 24.0]) root.add(cyl(mats.paintWhite, x - 0.04, y + 0.85, z, x + 0.04, y + 0.85, z, 0.735, 20)); // riveted bands
    for (const x of [22, 24]) root.add(box(mats.steelDark, 0.2, 0.5, 1.3, x, y + 0.25, z));
    root.add(vcyl(mats.paintWhite, 23, y + 1.5, z, 0.2, 0.22, 10));
    root.add(cyl(mats.steelDark, 21.6, y + 0.4, z, 21.6, y + 0.02, z, 0.05, 6));                 // outlet pipe
    root.add(cyl(mats.brass, 24.62, y + 0.6, z + 0.1 * s, 24.75, y + 0.6, z + 0.1 * s, 0.03, 6)); // gauge cock
    // rectangular riveted tank on the roof of the after first-class entrance
    root.add(box(mats.paintWhite, 1.8, 1.1, 1.5, -0.6, RY + 0.65, s * 5.4, { cast: true }));
    root.add(box(mats.paintWhite, 1.9, 0.06, 1.6, -0.6, RY + 1.22, s * 5.4));
    for (const yy of [0.45, 0.85]) root.add(box(mats.paintWhite, 1.84, 0.05, 1.54, -0.6, RY + yy, s * 5.4));
    for (const dx of [-0.6, 0.6]) root.add(box(mats.steelDark, 0.12, 0.12, 1.5, -0.6 + dx, RY + 0.06, s * 5.4));
    root.add(box(mats.paintWhite, 0.4, 0.06, 0.4, -0.6, RY + 1.28, s * 5.4)); // manhole
  }

  // ================= skylights & domes =================
  skylight(root, -33.6, -24.4, -2.5, 2.5, LOW_ROOF_Y, { coam: 0.55, rise: 0.8, bars: 0.92 });
  skylight(root, -22.6, -20.4, -1.1, 1.1, LOW_ROOF_Y, { coam: 0.35, rise: 0.35 });
  for (const s of [-1, 1]) for (const x of [20.6, 25.4]) skylight(root, x - 0.6, x + 0.6, s * 2.9 - 0.5, s * 2.9 + 0.5, LOW_ROOF_Y, { coam: 0.3, rise: 0.25, bars: 0.6 });
  skylight(root, 64.2, 65.6, -1.0, 1.0, RY, { coam: 0.3, rise: 0.3 });
  skylight(root, 5.5, 7.2, -0.9, 0.9, RY, { coam: 0.3, rise: 0.3 });

  // ================= compass platform =================
  {
    const cx = (low1.x0 + low1.x1) / 2, y0 = LOW_ROOF_Y, yp = y0 + 2.1, hw = 1.5;
    const W = mats.paintWhite;
    root.add(box(mats.deckWood, 2 * hw, 0.07, 2 * hw, cx, yp - 0.035, 0, { cast: true }));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      root.add(box(W, 0.12, 2.05, 0.12, cx + sx * (hw - 0.1), y0 + 1.02, sz * (hw - 0.1)));
      root.add(vcyl(mats.brass, cx + sx * (hw - 0.06), yp, sz * (hw - 0.06), 1.05, 0.022, 8));
      root.add(ball(mats.brass, cx + sx * (hw - 0.06), yp + 1.07, sz * (hw - 0.06), 0.04, 8, 6));
    }
    for (const s of [-1, 1]) {
      root.add(cyl(W, cx - hw + 0.1, y0 + 0.1, s * (hw - 0.1), cx + hw - 0.1, yp - 0.2, s * (hw - 0.1), 0.035, 5));
      root.add(cyl(W, cx + hw - 0.1, y0 + 0.1, s * (hw - 0.1), cx - hw + 0.1, yp - 0.2, s * (hw - 0.1), 0.035, 5));
      root.add(cyl(W, cx + s * (hw - 0.1), y0 + 0.1, -hw + 0.1, cx + s * (hw - 0.1), yp - 0.2, hw - 0.1, 0.035, 5));
      root.add(box(W, 2 * hw, 0.14, 0.08, cx, yp - 0.14, s * (hw - 0.1)));
      root.add(box(W, 0.08, 0.14, 2 * hw, cx + s * (hw - 0.1), yp - 0.14, 0));
      for (const h of [0.55, 1.05]) {
        root.add(cyl(mats.brass, cx - hw + 0.06, yp + h, s * (hw - 0.06), cx + hw - 0.06, yp + h, s * (hw - 0.06), 0.02, 6));
        root.add(cyl(mats.brass, cx + hw - 0.06, yp + h, -hw + 0.06, cx + hw - 0.06, yp + h, hw - 0.06, 0.02, 6));
        root.add(cyl(mats.brass, cx - hw + 0.06, yp + h, s * 0.45, cx - hw + 0.06, yp + h, s * (hw - 0.06), 0.02, 6));
      }
      root.add(cyl(W, cx - hw - 0.02, y0, s * 0.3, cx - hw - 0.02, yp + 0.9, s * 0.3, 0.03, 6)); // ladder stiles
    }
    for (let y = y0 + 0.3; y < yp; y += 0.3) root.add(box(mats.woodDark, 0.06, 0.035, 0.6, cx - hw - 0.02, y, 0));
    // standard compass binnacle with quadrant spheres, Flinders bar, hood and lamp
    root.add(mk(latheGeo('binnacle', [[0.26, 0], [0.28, 0.05], [0.2, 0.12], [0.18, 0.5], [0.2, 0.85], [0.24, 0.92], [0.24, 1.0]], 14), mats.mahogany, cx, yp, 0));
    root.add(vcyl(mats.brass, cx, yp + 1.0, 0, 0.1, 0.23, 14));
    root.add(ball(mats.brass, cx, yp + 1.1, 0, 0.22, 14, 8, 0.9));
    root.add(vcyl(mats.brass, cx, yp + 1.28, 0, 0.08, 0.05, 8));
    root.add(box(mats.windowLit, 0.12, 0.08, 0.01, cx - 0.21, yp + 1.12, 0));
    for (const s of [-1, 1]) {
      root.add(ball(mats.iron, cx, yp + 0.98, s * 0.36, 0.095, 10, 8));
      root.add(box(mats.brass, 0.05, 0.04, 0.2, cx, yp + 0.98, s * 0.26));
    }
    root.add(vcyl(mats.brass, cx + 0.3, yp + 0.55, 0, 0.5, 0.035, 8));
    root.add(vcyl(mats.brass, cx + 0.3, yp + 1.05, 0, 0.06, 0.05, 8));
    world.addInfo({
      title: 'Kompassplattform',
      text: 'Auf dem erhöhten Dach zwischen dem zweiten und dritten Schornstein stand – möglichst weit entfernt von störendem Eisen – der Regelkompass des Schiffes auf einer hölzernen Plattform. Mit ihm wurden die Steuerkompasse auf der Brücke regelmäßig verglichen, zuletzt am Abend des 14. April 1912.',
      x: cx + 3.5, y: BY + 1.2, z: -9.2, radius: 3.5,
    });
  }

  // ================= benches =================
  const A = DECK_Y.A;
  for (const s of [-1, 1]) {
    for (const x of [46.2, (s > 0 ? 37.5 : 36.5), (s > 0 ? 53.0 : 54.2)]) bench(world, root, x, BY, s * (fwdH.hw + 0.5), s);
    for (const x of [-12.5, -7.0, 4.5, 10.0, 15.2]) bench(world, root, x, BY, s * (midH.hw + 0.5), s);
    for (const x of [-46.3, -39.7]) bench(world, root, x, BY, s * (aftH.hw + 0.5), s);
    bench(world, root, -66.5, BY, s * 3.2, s);
    for (const x of [-60.5, -52, -47.5, -22.5, 24.8, 40, 56.5, 62.5]) bench(world, root, x, A, s * (A_HOUSE.hw + 0.52), s);
  }

  // ================= deck chairs =================
  {
    const rows = [];
    const row = (y, x0, x1, zHead, s, block = true) => {
      for (let x = x0; x <= x1 + 1e-6; x += 0.86) rows.push([x, y, zHead, s]);
      if (block) world.addCollider(x0 - 0.36, y, s * (zHead - 0.1), x1 + 0.36, y + 0.85, s * (zHead + 1.0));
    };
    const za = A_HOUSE.hw + 0.42;
    row(A, 27, 38.2, za, 1); row(A, 44.6, 51.5, za, 1); row(A, -19.5, -5.5, za, 1); row(A, -39.5, -26, za, 1);
    row(A, 3, 18.5, za, -1); row(A, 27, 38.2, za, -1); row(A, -19.5, -5.5, za, -1); row(A, -39.5, -27, za, -1);
    for (const s of [1, -1]) { row(BY, low2.x0 + 1, low2.x1 - 1.4, low2.hw + 0.4, s); row(BY, low1.x0 + 0.5, low1.x1 - 0.5, low1.hw + 0.4, s); }
    const G = chairGeos();
    const o = new THREE.Object3D();
    rows.forEach(([x, y, zHead, s], i) => {
      const jit = Math.sin(i * 12.9898) * 0.5;
      o.position.set(x + jit * 0.05, y, s * zHead);
      o.rotation.set(0, (s > 0 ? 0 : Math.PI) + jit * 0.06, 0);
      o.updateMatrix();
      inst.add(G.wood, mats.oak, o.matrix); inst.add(G.sling, mats.wicker, o.matrix);
      if (i % 3 === 1) inst.add(G.rug, i % 2 ? mats.blanket : mats.fabricGreen, o.matrix);
    });
  }

  // ================= life rings on the railings, sand boxes, roof ladders =================
  for (const s of [-1, 1]) {
    for (const x of [-66.2, -22.6, -14, -5, 4, 13, 22, 72.5]) lifeRing(root, x, BY + 0.72, s * (edge(x) - 0.36), -s * Math.atan(edgeSlope(x)));
    for (const x of [101, 113]) lifeRing(root, x, DECK_Y.B + 0.72, s * (edge(x) - 0.2), -s * Math.atan(edgeSlope(x)));
    for (const x of [-75, -86, -113, -127]) lifeRing(root, x, DECK_Y.B + 0.72, s * (edge(x) - 0.2), -s * Math.atan(edgeSlope(x)));
    // sand boxes against the house ends (below 0.45 m: no obstacle)
    sandBox(root, midH.x0 - 0.3, BY, s * 5.8, Math.PI / 2);
    sandBox(root, fwdH.x0 - 0.3, BY, s * 6.3, Math.PI / 2);
    sandBox(root, aftH.x1 + 0.3, BY, s * 3.9, -Math.PI / 2);
  }
  // iron ladders up the after ends of the boat-deck houses (starboard corners)
  wallLadder(root, midH.x0, midH.hw - 0.5, BY, RY, -1);
  wallLadder(root, fwdH.x0, fwdH.hw - 0.5, BY, RY, -1);
  wallLadder(root, aftH.x0, aftH.hw - 0.45, BY, RY, -1);

  inst.build(root, 'gear');
  return {};
}

export { merge, sphG };
