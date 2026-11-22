import * as THREE from 'three';
import { mats } from '../core/materials.js';
import { BY, RY, mk, Wires, gridGeo, edge, edgeSlope } from './fit-util.js';
import { merge, boxG, cylG, sphG } from './inst.js';

// Lifeboats: 14 standard boats (30 ft), 2 emergency cutters (25 ft) and 4 Engelhardt collapsibles under Welin davits.

const TYPES = {
  std: { L: 9.14, B: 2.77, D: 1.22 },
  cutter: { L: 7.68, B: 2.2, D: 0.95 },
  coll: { L: 8.36, B: 2.44, D: 0.5 },
};
const NS = 32, NJ = 9;

// Collision volumes of the boat stations (boat + davits) as built by the previous, simpler model.
// Kept verbatim so the walkable area of the boat deck is unchanged. [x0, x1, z0, z1, y1], y0 = boat deck.
const STATION_COLLIDERS = {
  '62.8:1': [58.315, 67.342, 8.86, 15.842, 32.204], '62.8:-1': [58.315, 67.342, -15.842, -8.86, 32.204],
  '53:1': [47.791, 58.256, 10.043, 13.676, 32.044], '53:-1': [47.791, 58.256, -13.676, -10.043, 32.044],
  '43.1:1': [37.875, 48.349, 10.504, 13.805, 32.044], '43.1:-1': [37.875, 48.349, -13.805, -10.504, 32.044],
  '33.2:1': [27.97, 38.445, 10.595, 13.76, 32.044], '33.2:-1': [27.97, 38.445, -13.76, -10.585, 32.044],
  '-30.1:1': [-35.33, -24.855, 10.585, 13.76, 32.044], '-30.1:-1': [-35.33, -24.855, -13.76, -10.585, 32.044],
  '-40:1': [-45.23, -34.755, 10.585, 13.76, 32.044], '-40:-1': [-45.23, -34.755, -13.76, -10.585, 32.044],
  '-49.9:1': [-55.13, -44.655, 10.585, 13.76, 32.044], '-49.9:-1': [-55.13, -44.655, -13.76, -10.585, 32.044],
  '-59.8:1': [-65.03, -54.555, 10.585, 13.76, 32.044], '-59.8:-1': [-65.03, -54.555, -13.76, -10.585, 32.044],
};

/** Section of the boat: t in [-1,1] along the length (+1 = bow), u in [0,1] keel -> gunwale. Returns [x, y, z, halfBeam, yGunwale]. */
function sect(T, t, u) {
  const at = Math.abs(t);
  const hb = (T.B / 2) * Math.pow(Math.max(0, 1 - Math.pow(at, 2.3)), 0.62);
  const yk = T.D * 0.2 * Math.pow(at, 5);
  const yg = T.D * (1 + 0.17 * t * t);
  return [(t * T.L) / 2, yk + (yg - yk) * Math.pow(u, 1.55), hb * Math.pow(Math.sin((u * Math.PI) / 2), 0.72), hb, yg];
}

/** Sweep a circle-ish section along a polyline with a radius function (tapered tube). */
function sweep(pts, rFn, rs = 6) {
  const pos = [], idx = [];
  const P = pts.map((p) => new THREE.Vector3(...p));
  const n = P.length;
  const T = new THREE.Vector3(), N = new THREE.Vector3(), Bv = new THREE.Vector3(), up = new THREE.Vector3(1, 0, 0);
  for (let i = 0; i < n; i++) {
    T.subVectors(P[Math.min(n - 1, i + 1)], P[Math.max(0, i - 1)]).normalize();
    N.crossVectors(up, T); if (N.lengthSq() < 1e-6) N.set(0, 0, 1); N.normalize(); Bv.crossVectors(T, N);
    const r = rFn(i / (n - 1));
    for (let k = 0; k <= rs; k++) {
      const a = (k / rs) * Math.PI * 2;
      pos.push(P[i].x + (N.x * Math.cos(a) + Bv.x * Math.sin(a)) * r, P[i].y + (N.y * Math.cos(a) + Bv.y * Math.sin(a)) * r, P[i].z + (N.z * Math.cos(a) + Bv.z * Math.sin(a)) * r);
    }
  }
  for (let i = 0; i < n - 1; i++) for (let k = 0; k < rs; k++) {
    const a = i * (rs + 1) + k, b = a + rs + 1;
    idx.push(a, a + 1, b, a + 1, b + 1, b); // outward-facing (T x dRing points inwards, so a, a+1, b)
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

const geoCache = new Map();
/** Merged geometries per material for one boat type ({mat: geometry}). Keel at local y = 0. */
function boatGeos(type, covered) {
  const key = type + (covered ? 'c' : 'o');
  let G = geoCache.get(key);
  if (G) return G;
  const T = TYPES[type];
  const tOf = (i) => -1 + (2 * i) / NS;
  const parts = { paintWhite: [], oak: [], pine: [], canvas: [], rope: [], brass: [], iron: [], woodDark: [] };
  const LAPW = 0.022;
  for (const sg of [1, -1]) {
    const flip = sg < 0;
    // clinker strakes: lower edge of each strake lapped outside the one below + the visible step
    for (let j = 0; j < NJ; j++) {
      const lap = (t, c) => (c === 0 && j > 0 ? LAPW * (1 - Math.pow(Math.abs(t), 6)) : 0);
      parts.paintWhite.push(gridGeo(NS + 1, 2, (i, c) => {
        const t = tOf(i), p = sect(T, t, (j + c) / NJ), l = lap(t, c);
        return [p[0], p[1] - l * 0.4, sg * (p[2] + l)];
      }, flip));
      if (j > 0) parts.paintWhite.push(gridGeo(NS + 1, 2, (i, c) => {
        const t = tOf(i), p = sect(T, t, j / NJ), l = c === 0 ? lap(t, 0) : 0;
        return [p[0], p[1] - (c === 0 ? l * 0.4 : 0) + (c === 0 ? 0 : 0.002), sg * (p[2] + l)];
      }, !flip));
    }
    // gunwale (teak) and rubbing strake
    parts.oak.push(gridGeo(NS + 1, 5, (i, c) => {
      const p = sect(T, tOf(i), 1);
      const o = [[-0.09, 0.045], [0.035, 0.045], [0.035, -0.06], [-0.02, -0.06], [-0.09, 0.045]][c]; // closed section
      return [p[0], p[4] + o[0], sg * Math.max(0, p[3] + o[1])];
    }, flip));
    parts.oak.push(gridGeo(NS - 1, 4, (i, c) => {
      const t = tOf(i + 1) * 0.97, p = sect(T, t, 0.86);
      const o = [[-0.035, 0.0], [-0.015, 0.035], [0.015, 0.035], [0.035, 0.0]][c];
      return [p[0], p[1] + o[0], sg * (p[2] + LAPW + o[1])];
    }, flip));
    if (!covered) {
      parts.pine.push(gridGeo(NS + 1, NJ + 1, (i, j) => {
        const p = sect(T, tOf(i), j / NJ); // runs right into the stem and stern post (no open hull ends)
        return [p[0], p[1] + 0.035, sg * p[2] * 0.955];
      }, !flip));
    } else {
      // canvas cover: tented over a ridge spar, skirt laced below the gunwale
      parts.canvas.push(gridGeo(NS + 1, 6, (i, c) => {
        const t = tOf(i), p = sect(T, t, 1), cr = Math.sqrt(Math.max(0, 1 - t * t));
        const q = [[-0.24, 1, 0.05], [0.045, 1, 0.05], [0.045 + 0.16 * cr, 0.62, 0], [0.045 + 0.27 * cr, 0.3, 0], [0.045 + 0.33 * cr, 0.07, 0], [0.045 + 0.35 * cr, 0, 0]][c];
        return [p[0] * 1.004, p[4] + q[0], sg * (p[3] * q[1] + q[2])];
      }, flip));
    }
  }
  // keel, stem and stern posts following the end profile
  parts.paintWhite.push(boxG(T.L * 0.92, 0.1, 0.075, 0, -0.03, 0));
  for (const e of [1, -1]) {
    const pts = [];
    for (let k = 0; k <= 8; k++) { const p = sect(T, e, k / 8); pts.push([p[0] + e * 0.02, p[1], 0]); }
    pts.push([pts[8][0] + e * 0.03, pts[8][1] + 0.12, 0]);
    for (let k = 0; k < pts.length - 1; k++) parts.paintWhite.push(cylG(pts[k], pts[k + 1], 0.045, 5));
  }
  // grab lines looped along the sides
  {
    const w = new Wires(mats.rope, false);
    for (const sg of [1, -1]) for (let k = 0; k < 11; k++) {
      const t0 = -0.84 + k * 0.153, t1 = t0 + 0.153;
      const a = sect(T, t0, 0.8), b = sect(T, t1, 0.8);
      w.sag(a[0], a[1], sg * (a[2] + 0.05), b[0], b[1], sg * (b[2] + 0.05), 0.15, 5, 0.012);
      const c = sect(T, t0, 0.97); // becket through the gunwale
      parts.iron.push(cylG([a[0], a[1] + 0.01, sg * (a[2] + 0.05)], [c[0], c[4] - 0.04, sg * (c[3] + 0.03)], 0.012, 4));
    }
    parts.rope.push(w.build().children[0].geometry);
  }
  // brass number plates at the bows
  for (const sg of [1, -1]) {
    const p = sect(T, 0.8, 0.86), n = boxG(0.3, 0.12, 0.012);
    n.rotateY(sg * -0.3); n.translate(p[0], p[1], sg * (p[2] + LAPW + 0.008));
    parts.brass.push(n);
  }
  // rudder hung on the stern post with tiller
  {
    const x = -T.L / 2 - 0.06;
    const sh = new THREE.Shape(); sh.moveTo(0, 0.1); sh.lineTo(-0.42, 0.06); sh.quadraticCurveTo(-0.5, 0.4, -0.38, T.D * 0.85); sh.lineTo(0, T.D * 1.0); sh.closePath();
    const rg = new THREE.ExtrudeGeometry(sh, { depth: 0.04, bevelEnabled: false, curveSegments: 4 }); rg.translate(x, 0, -0.02);
    parts.oak.push(rg);
    for (const v of [0.3, 0.75]) parts.iron.push(boxG(0.1, 0.04, 0.08, x + 0.02, T.D * v, 0));
    parts.oak.push(cylG([x - 0.02, T.D * 1.02, 0], [-T.L / 2 + 0.75, T.D * 1.1, 0], 0.022, 5));
  }
  if (!covered) {
    // bottom boards with slats, thwarts with knees, side benches, oars, mast + furled sail, breakers
    for (let k = -3; k <= 3; k++) parts.pine.push(boxG(T.L * 0.62, 0.025, 0.08, 0, T.D * 0.2, k * 0.12));
    for (const x of [-T.L * 0.3, 0, T.L * 0.3]) parts.oak.push(boxG(0.05, 0.03, T.B * 0.32, x, T.D * 0.2 - 0.025, 0));
    const nT = type === 'cutter' ? 4 : 5;
    for (let k = 0; k < nT; k++) {
      const t = -0.62 + (1.24 * k) / (nT - 1), p = sect(T, t, 0.74);
      parts.oak.push(boxG(0.26, 0.045, 2 * p[2] * 0.95, p[0], T.D * 0.68, 0));
      parts.oak.push(boxG(0.06, T.D * 0.48, 0.06, p[0], T.D * 0.44, 0));
      for (const sg of [1, -1]) { // hanging knees
        const kz = sg * p[2] * 0.9;
        parts.oak.push(cylG([p[0], T.D * 0.66, kz - sg * 0.18], [p[0], T.D * 0.92, kz], 0.025, 4));
      }
    }
    for (const sg of [-1, 1]) {
      parts.oak.push(boxG(T.L * 0.5, 0.035, 0.26, 0, T.D * 0.68, sg * (T.B / 2 - 0.3)));
      for (let k = 0; k < 3; k++) {
        const z = sg * (0.18 + k * 0.13);
        parts.pine.push(cylG([-T.L * 0.26, T.D * 0.72, z], [T.L * 0.16, T.D * 0.74, z], 0.026, 5));
        const bl = boxG(0.75, 0.018, 0.14, T.L * 0.16 + 0.37, T.D * 0.74, z); parts.pine.push(bl);
        parts.woodDark.push(cylG([-T.L * 0.26 - 0.25, T.D * 0.715, z], [-T.L * 0.26, T.D * 0.72, z], 0.03, 5));
      }
      // rowlock sockets on the gunwale
      for (const t of [-0.45, -0.1, 0.25]) { const p = sect(T, t, 1); parts.brass.push(cylG([p[0], p[4] + 0.04, sg * p[3]], [p[0], p[4] + 0.1, sg * p[3]], 0.025, 5)); }
    }
    parts.pine.push(cylG([-T.L * 0.3, T.D * 0.78, 0], [T.L * 0.3, T.D * 0.8, 0], 0.055, 6));
    parts.canvas.push(cylG([-T.L * 0.26, T.D * 0.88, 0.04], [T.L * 0.2, T.D * 0.9, 0.04], 0.1, 7, 0.08));
    for (let k = 0; k < 5; k++) { const x = -T.L * 0.22 + k * T.L * 0.1; parts.rope.push(cylG([x, T.D * 0.88, 0.04], [x + 0.02, T.D * 0.88, 0.04], 0.106, 6)); }
    parts.pine.push(boxG(0.4, 0.3, 0.3, T.L * 0.36, T.D * 0.36, 0));
    parts.oak.push(new THREE.LatheGeometry([[0.12, 0], [0.15, 0.08], [0.16, 0.2], [0.15, 0.32], [0.12, 0.4]].map(([r, y]) => new THREE.Vector2(r, y)), 8).rotateZ(Math.PI / 2).translate(T.L * 0.3 + 0.2, T.D * 0.42, 0.3));
  } else {
    // ridge spar under the cover + lashings over it to the gunwale cleats
    const w = new Wires(mats.rope, false);
    for (let k = 0; k < 9; k++) {
      const t = -0.8 + k * 0.2, i = (t + 1) * NS / 2;
      for (const sg of [1, -1]) {
        let prev = null;
        for (let c = 0; c < 6; c++) {
          const p = sect(T, t, 1), cr = Math.sqrt(Math.max(0, 1 - t * t));
          const q = [[-0.24, 1, 0.05], [0.045, 1, 0.05], [0.045 + 0.16 * cr, 0.62, 0], [0.045 + 0.27 * cr, 0.3, 0], [0.045 + 0.33 * cr, 0.07, 0], [0.045 + 0.35 * cr, 0, 0]][c];
          const pt = [p[0] * 1.004, p[4] + q[0] + 0.012, sg * (p[3] * q[1] + q[2] + 0.012 * (c < 2 ? 1 : 0))];
          if (prev) w.seg(prev[0], prev[1], prev[2], pt[0], pt[1], pt[2], 0.009);
          prev = pt;
        }
      }
      void i;
    }
    parts.rope.push(w.build().children[0].geometry);
  }
  G = { T };
  for (const [k, list] of Object.entries(parts)) if (list.length) G[k] = merge(list);
  geoCache.set(key, G);
  return G;
}

/** A boat with its keel at local y = 0. */
function makeBoat(type, covered) {
  const G = boatGeos(type, covered);
  const g = new THREE.Group();
  for (const k of Object.keys(mats)) if (G[k]) g.add(mk(G[k], mats[k], 0, 0, 0, k === 'paintWhite' || k === 'canvas'));
  return g;
}

// ---------- Welin quadrant davit ----------
const davitCache = new Map();
function davitGeos(out) {
  let D = davitCache.get(out);
  if (D) return D;
  const W = [], I = [], S = [], R = [], Br = [];
  // base: deck plate, two cheek plates with a curved head, bolts
  W.push(boxG(0.46, 0.06, 1.45, 0, 0.03, 1.0));
  const cheek = new THREE.Shape();
  cheek.moveTo(0.3, 0); cheek.lineTo(1.65, 0); cheek.lineTo(1.65, 0.18); cheek.quadraticCurveTo(1.55, 0.62, 1.22, 0.74); cheek.quadraticCurveTo(0.8, 0.8, 0.45, 0.5); cheek.closePath();
  const hole = new THREE.Path(); hole.absarc(1.15, 0.32, 0.14, 0, Math.PI * 2, true); cheek.holes.push(hole);
  for (const s of [-1, 1]) {
    const cg = new THREE.ExtrudeGeometry(cheek, { depth: 0.045, bevelEnabled: false, curveSegments: 6 });
    cg.rotateY(-Math.PI / 2); cg.translate(s * 0.16 + (s > 0 ? 0.0225 : 0.0225), 0, 0);
    W.push(cg);
  }
  for (let k = 0; k < 6; k++) S.push(cylG([k % 2 ? 0.17 : -0.17, 0.06, 0.4 + (k >> 1) * 0.5], [k % 2 ? 0.17 : -0.17, 0.09, 0.4 + (k >> 1) * 0.5], 0.025, 6));
  // toothed quadrant (gear sector) rolling on the rack of the base
  const qa0 = out ? -0.15 : 0.55;
  const quad = new THREE.CylinderGeometry(0.62, 0.62, 0.07, 14, 1, false, qa0, Math.PI / 2);
  quad.rotateZ(Math.PI / 2); quad.translate(0, 0.42, 0.98);
  W.push(quad);
  for (let k = 0; k <= 12; k++) {
    const a = qa0 + (k / 12) * (Math.PI / 2), r = 0.65;
    const tooth = boxG(0.08, 0.06, 0.05, 0, 0, 0); tooth.rotateX(Math.PI / 2 - a); tooth.translate(0, 0.42 + Math.sin(a) * r, 0.98 + Math.cos(a) * r);
    I.push(tooth);
  }
  I.push(boxG(0.1, 0.04, 1.1, 0, 0.1, 1.0)); // rack
  I.push(cylG([-0.22, 0.42, 1.22], [0.22, 0.42, 1.22], 0.055, 8));            // pivot pin
  // arm: tapered, curved
  const armPts = out
    ? [[0, 0.42, 1.22], [0, 1.0, 1.32], [0, 1.6, 1.48], [0, 2.2, 1.75], [0, 2.75, 2.15], [0, 3.2, 2.6], [0, 3.55, 3.0], [0, 3.8, 3.3], [0, 3.9, 3.45]]
    : [[0, 0.42, 1.22], [0, 1.0, 1.28], [0, 1.6, 1.27], [0, 2.2, 1.17], [0, 2.75, 0.92], [0, 3.2, 0.6], [0, 3.55, 0.22], [0, 3.72, -0.02], [0, 3.74, -0.14]];
  W.push(sweep(armPts, (f) => 0.1 - 0.04 * f, 8));
  const head = armPts[armPts.length - 1];
  // arm head: cap, span-wire eye, guy eyes
  W.push(sphG(0.075, head[0], head[1], head[2], 8, 6));
  I.push(new THREE.TorusGeometry(0.05, 0.012, 4, 8).rotateY(Math.PI / 2).translate(head[0], head[1] + 0.08, head[2]));
  // screw spindle with nut, bearing and crank handle
  const sp0 = [0, 0.62, 0.34], sp1 = out ? [0, 1.5, 1.42] : [0, 1.75, 1.2];
  I.push(cylG(sp0, sp1, 0.03, 6));
  for (let k = 1; k < 10; k++) { const f = k / 10; I.push(cylG([0, sp0[1] + (sp1[1] - sp0[1]) * f, sp0[2] + (sp1[2] - sp0[2]) * f], [0, sp0[1] + (sp1[1] - sp0[1]) * (f + 0.02), sp0[2] + (sp1[2] - sp0[2]) * (f + 0.02)], 0.04, 6)); }
  S.push(boxG(0.16, 0.16, 0.2, sp1[0], sp1[1], sp1[2]));
  W.push(boxG(0.3, 0.45, 0.12, 0, 0.28, 0.4));
  S.push(boxG(0.14, 0.14, 0.12, 0, 0.6, 0.34));
  I.push(cylG([0, 0.58, 0.3], [0, 0.58, 0.2], 0.02, 6));
  I.push(cylG([-0.3, 0.58, 0.2], [0.3, 0.58, 0.2], 0.018, 5));
  I.push(cylG([0.3, 0.58, 0.2], [0.3, 0.58, 0.05], 0.016, 5));
  Br.push(cylG([0.3, 0.58, 0.05], [0.3, 0.58, -0.08], 0.025, 6));
  // cleat for the hauling part + fall reel on the base
  I.push(boxG(0.06, 0.06, 0.4, 0.22, 0.42, 0.62)); I.push(boxG(0.05, 0.12, 0.05, 0.22, 0.36, 0.55)); I.push(boxG(0.05, 0.12, 0.05, 0.22, 0.36, 0.7));
  for (let k = 0; k < 3; k++) R.push(new THREE.TorusGeometry(0.21 - k * 0.02, 0.035, 5, 12).rotateX(Math.PI / 2).translate(0, 0.08 + k * 0.06, out ? -0.25 : 0.25));
  // upper (double) block with hook at the arm head
  const by = head[1] - 0.42;
  for (const s of [-1, 1]) W.push(boxG(0.025, 0.3, 0.17, s * 0.06, by, head[2]));
  I.push(cylG([-0.05, by, head[2]], [0.05, by, head[2]], 0.08, 10));
  I.push(cylG([0, by + 0.15, head[2]], [0, head[1] - 0.06, head[2]], 0.02, 5));
  D = { paintWhite: merge(W), iron: merge(I), steelDark: merge(S), rope: merge(R), brass: merge(Br), head, by };
  davitCache.set(out, D);
  return D;
}
function addDavit(g, xd, out) {
  const D = davitGeos(out);
  for (const k of ['paintWhite', 'iron', 'steelDark', 'rope', 'brass']) {
    const m = mk(D[k], mats[k], xd, 0, 0, k === 'paintWhite');
    if (k !== 'paintWhite') m.castShadow = false;
    g.add(m);
  }
  return [xd, D.head[1], D.head[2], D.by];
}

let lowerBlockGeo = null;
function lowerBlock() {
  if (lowerBlockGeo) return lowerBlockGeo;
  lowerBlockGeo = {
    oak: merge([boxG(0.025, 0.26, 0.15, -0.045, 0, 0), boxG(0.025, 0.26, 0.15, 0.045, 0, 0)]),
    iron: merge([cylG([-0.035, 0.02, 0], [0.035, 0.02, 0], 0.07, 10), cylG([0, -0.13, 0], [0, -0.28, 0], 0.018, 5), new THREE.TorusGeometry(0.06, 0.016, 4, 10, Math.PI * 1.4).translate(0, -0.34, 0)]),
  };
  return lowerBlockGeo;
}

export function buildBoats(world, parent) {
  const root = new THREE.Group(); root.name = 'lifeboats';
  parent.add(root);
  world.markForBake(root);
  const ropes = new Wires(mats.rope, false);
  const _v = new THREE.Vector3();

  const station = ({ x, side, type = 'std', out = false, covered = true, collapsible = false }) => {
    const T = TYPES[type];
    const g = new THREE.Group();
    const zc = edge(x) - 2.06;                       // local z = +2.06 is the hull side, +1.8 the railing
    g.position.set(x, BY, side * zc);
    g.rotation.y = -side * Math.atan(edgeSlope(x));
    if (side < 0) g.scale.z = -1;
    root.add(g);
    g.updateMatrix();
    const R = (ax, ay, az, bx, by, bz, r = 0.012) => {
      _v.set(ax, ay, az).applyMatrix4(g.matrix); const a0 = _v.x, a1 = _v.y, a2 = _v.z;
      _v.set(bx, by, bz).applyMatrix4(g.matrix);
      ropes.seg(a0, a1, a2, _v.x, _v.y, _v.z, r);
    };
    const boat = makeBoat(type, covered);
    const bz = out ? 3.3 : 0, by = out ? 0.3 : 0.6;
    boat.position.set(0, by, bz);
    g.add(boat);
    const xd = T.L / 2 + 0.34, xh = T.L / 2 - 0.55, yh = by + T.D * 1.08;
    const LB = lowerBlock();
    for (const s of [-1, 1]) {
      const [hx, hy, hz, uby] = addDavit(g, s * xd, out);
      // falls: double upper block, lower block with hook in the boat's lifting eye, four parts of rope
      for (const [k, m] of [['oak', mats.oak], ['iron', mats.iron]]) g.add(mk(LB[k], m, s * xh, yh + 0.42, bz));
      g.add(mk(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 6), mats.iron, s * xh, yh + 0.0, bz));
      for (const o of [-0.075, -0.025, 0.025, 0.075]) R(hx + o * 0.5, uby - 0.12, hz + o, s * xh + o * 0.5, yh + 0.55, bz + o * 0.6);
      R(hx, hy - 0.15, hz, hx, uby + 0.15, hz);
      // hauling part down the arm to the cleat on the davit base
      R(hx + s * 0.04, uby, hz - 0.08, hx + s * 0.06, 1.4, out ? 1.5 : 1.2, 0.012);
      R(hx + s * 0.06, 1.4, out ? 1.5 : 1.2, s * xd + 0.22, 0.46, 0.62, 0.012);
    }
    const hy0 = out ? 3.98 : 3.82;
    R(-xd, hy0, out ? 3.45 : -0.14, xd, hy0, out ? 3.45 : -0.14, 0.014);       // span between the davit heads
    for (const fx of [-0.33, -0.11, 0.11, 0.33]) { // life lines with knots
      R(fx * T.L, hy0, out ? 3.45 : -0.14, fx * T.L, by + T.D + 0.5, bz, 0.01);
      for (let k = 1; k < 5; k++) { const f = k / 5, y = hy0 + (by + T.D + 0.5 - hy0) * f, z = (out ? 3.45 : -0.14) + (bz - (out ? 3.45 : -0.14)) * f; g.add(mk(KNOT(), mats.rope, fx * T.L, y, z)); }
    }
    if (!out) {
      // chocks (with hinged side wedges) + gripes
      for (const s of [-1, 1]) {
        const cx = s * T.L * 0.27;
        g.add(mk(CHOCK(), mats.pine, cx, 0, 0));
        if (covered) {
          const top = by + T.D * 1.02 + 0.36;
          R(cx, 0.15, -1.0, cx, by + T.D + 0.02, -T.B / 2 - 0.06, 0.014);
          R(cx, by + T.D + 0.02, -T.B / 2 - 0.06, cx, top, 0, 0.014);
          R(cx, top, 0, cx, by + T.D + 0.02, T.B / 2 + 0.06, 0.014);
          R(cx, by + T.D + 0.02, T.B / 2 + 0.06, cx, 0.15, 1.0, 0.014);
          g.add(mk(SLIP(), mats.iron, cx, 0.15, 1.0));
        }
      }
    } else {
      // gripes holding the swung-out cutter against the ship's side, boom spars
      for (const s of [-1, 1]) {
        R(s * T.L * 0.3, 1.1, 1.72, s * T.L * 0.3, by + T.D, bz - T.B / 2 + 0.05, 0.014);
        g.add(mk(new THREE.CylinderGeometry(0.06, 0.06, 1.4, 6).rotateX(Math.PI / 2), mats.woodDark, s * T.L * 0.3, by + T.D * 0.6, bz - T.B / 2 - 0.55));
      }
    }
    if (collapsible) {
      // Engelhardt collapsible stowed on deck inboard of the davits
      const Cc = TYPES.coll;
      const cb = makeBoat('coll', true);
      cb.position.set(0, 0.2, -0.62);
      g.add(cb);
      for (const s of [-1, 1]) g.add(mk(new THREE.BoxGeometry(0.22, 0.2, Cc.B * 0.8), mats.pine, s * Cc.L * 0.28, 0.1, -0.62));
    }
    const c = STATION_COLLIDERS[x + ':' + side];
    world.addCollider(c[0], BY, c[2], c[1], c[4], c[3]);
    return g;
  };

  // forward group: emergency cutters 1/2 (swung out) + boats 3..8; odd = starboard
  const fwd = [62.8, 53.0, 43.1, 33.2];
  const aft = [-30.1, -40.0, -49.9, -59.8];
  for (const side of [1, -1]) {
    station({ x: fwd[0], side, type: 'cutter', out: true, covered: false, collapsible: true });
    station({ x: fwd[1], side });
    station({ x: fwd[2], side });
    station({ x: fwd[3], side, covered: side < 0 });   // boat 7 (starboard) uncovered
    aft.forEach((x) => station({ x, side }));
  }
  // collapsibles A (starboard) and B (port) on the roof of the officers' quarters beside funnel No. 1
  for (const side of [1, -1]) {
    const cb = makeBoat('coll', true);
    cb.position.set(62.2, RY + 0.22, side * 4.9);
    root.add(cb);
    for (const s of [-1, 1]) root.add(mk(new THREE.BoxGeometry(0.22, 0.24, 2.0), mats.pine, 62.2 + s * 2.3, RY + 0.12, side * 4.9));
  }
  root.add(ropes.build('boatFalls'));

  world.addInfo({
    title: 'Rettungsboote',
    text: 'Die Titanic führte 20 Rettungsboote mit: 14 hölzerne Standardboote, zwei Notkutter und vier Engelhardt-Faltboote – zusammen Platz für 1 178 Menschen. An Bord waren jedoch rund 2 200 Personen. Das genügte den damals gültigen Vorschriften sogar reichlich, denn diese bemaßen die Bootszahl nach der Tonnage und nicht nach der Zahl der Menschen. Die neuartigen Welin-Davits hätten bis zu 64 Boote tragen können.',
    x: 55, y: BY + 1.2, z: 9.0, radius: 4,
  });
  world.addInfo({
    title: 'Achtere Rettungsboote',
    text: 'Die Boote 9 bis 16 hingen am achteren Ende des Bootsdecks, ungerade Nummern an Steuerbord, gerade an Backbord. Viele Boote wurden in der Unglücksnacht nur teilweise besetzt gefiert, weil man den Davits und den Booten die volle Last nicht zutraute. Insgesamt überlebten nur rund 710 Menschen.',
    x: -46, y: BY + 1.2, z: -8.6, radius: 5,
  });
  return {};
}

let _knot = null, _chock = null, _slip = null;
function KNOT() { return (_knot ||= new THREE.SphereGeometry(0.03, 5, 3)); }
function SLIP() { return (_slip ||= merge([boxG(0.12, 0.03, 0.2, 0, 0, 0), cylG([0, 0, 0], [0, 0.12, -0.04], 0.015, 4)])); }
function CHOCK() {
  if (_chock) return _chock;
  const p = [boxG(0.24, 0.6, 0.5, 0, 0.3, 0), boxG(0.24, 0.12, 2.1, 0, 0.06, 0)];
  for (const zs of [-1, 1]) { const w = boxG(0.24, 0.42, 0.3, 0, 0, 0); w.rotateX(-zs * 0.55); w.translate(0, 0.5, zs * 0.78); p.push(w); }
  return (_chock = merge(p));
}
