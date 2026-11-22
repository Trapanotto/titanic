import * as THREE from 'three';
import { DECK_Y, SHIP, hullHalfWidth as hw, deckPlanHalfWidth as plan } from '../core/constants.js';
import { mats } from '../core/materials.js';
import { stations, HULL_TOPS, X, BULWARK_H, hullEdge } from './structure-layout.js';
import { rivetGeo, latheGeo } from './inst.js';
import { strokeText } from './structure-font.js';

const C = DECK_Y.C, B = DECK_Y.B;
const Y_RED = 11.3, Y_STRIPE0 = 19.25, Y_STRIPE1 = 19.5;

// ---------------- shell plating layout ----------------
// Strake boundaries (y). In-and-out plating: odd strakes are "outer" strakes standing proud by LAP.
export const STRAKES = [0, 1.3, 2.7, 4.3, 5.9, 7.5, 9.1, 10.7, 12.2, 14.35, 16.95, 19.75, 21.9, 30];
export const LAP = 0.025;
const strakeIndex = (y) => { for (let k = 0; k < STRAKES.length - 1; k++) if (y < STRAKES[k + 1]) return k; return STRAKES.length - 2; };
const isOut = (k) => k % 2 === 1;
/** Outward offset of the plating surface at height y (0 or LAP). */
export const shellOff = (y) => (isOut(strakeIndex(y)) ? LAP : 0);
const PLATE_LEN = 9.14; // 30 ft plates
const MAT_BANDS = [[-1, Y_RED, 'hullRed'], [Y_RED, Y_STRIPE0, 'hullBlack'], [Y_STRIPE0, Y_STRIPE1, 'hullStripe'], [Y_STRIPE1, 99, 'hullWhite']];
const matAt = (y) => mats[MAT_BANDS.find((b) => y >= b[0] && y < b[1])[2]];

/** Outward unit normal of the hull surface (s = +1 starboard, -1 port). */
export function hullNormal(x, y, s) {
  const h = 0.05;
  const fx = (hw(x + h, y) - hw(x - h, y)) / (2 * h);
  let fy = 0;
  if (y < C) { const ya = Math.max(0, y - h), yb = Math.min(C, y + h); fy = (hw(x, yb) - hw(x, ya)) / (yb - ya); }
  const l = Math.hypot(fx, fy, 1);
  return [-fx / l, -fy / l, s / l];
}

/** Point on the hull surface, optionally pushed `out` metres along the normal. */
export function hullPoint(x, y, s, out = 0) {
  const w = hw(x, y);
  if (!out) return [x, y, s * w];
  const n = hullNormal(x, y, s);
  return [x + n[0] * out, y + n[1] * out, s * w + n[2] * out];
}
/** Point on the painted plating surface (includes the strake offset). */
export const platePoint = (x, y, s, out = 0) => hullPoint(x, y, s, out + shellOff(y));

/** Surface mapping for Batch.plate / Batch.ring on hull side s, `base` = extra offset. */
const hullS = (s, base = 0) => (u, v, o) => hullPoint(u, v, s, o + base);
const hullN = (s) => (u, v) => hullNormal(u, v, s);

function hullStations() {
  const cuts = [SHIP.sternX, X.poop, X.wellA, -70, 40, X.wellF, X.fc, SHIP.bowX];
  const xs = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const mid = cuts[i] >= -70 && cuts[i + 1] <= 40;
    const part = stations(cuts[i], cuts[i + 1], mid ? 2.0 : 1.0, 0.15);
    if (i) part.shift();
    xs.push(...part);
  }
  return xs;
}

/** Accumulates smooth-shaded shell grids per material. */
class Shell {
  constructor() { this.b = new Map(); }
  _buf(mat) { let b = this.b.get(mat); if (!b) this.b.set(mat, (b = { p: [], n: [], u: [], i: [] })); return b; }
  /** Grid over stations xs and heights ys at strake offset `off`, both sides. */
  grid(mat, xs, ys, off) {
    const b = this._buf(mat), R = ys.length;
    for (const s of [1, -1]) {
      const base = b.p.length / 3;
      for (const x of xs) for (const y of ys) {
        const n = hullNormal(x, y, s), w = hw(x, y);
        b.p.push(x + n[0] * off, y + n[1] * off, s * w + n[2] * off); b.n.push(n[0], n[1], n[2]); b.u.push(x, y);
      }
      for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < R - 1; j++) {
        const a = base + i * R + j, c1 = base + (i + 1) * R + j, c = c1 + 1, d = a + 1;
        if (s > 0) b.i.push(a, c1, c, a, c, d); else b.i.push(a, c, c1, a, d, c);
      }
    }
  }
  /** Step face (strake lap) at height y between offsets o0..o1, facing up (dir 1) or down (dir -1). */
  lip(mat, xs, y, o0, o1, dir) {
    const b = this._buf(mat);
    for (const s of [1, -1]) {
      const base = b.p.length / 3;
      for (const x of xs) {
        const n = hullNormal(x, y, s), w = hw(x, y);
        // tangent along y on the surface
        const dy = 0.05, w2 = hw(x, Math.min(C, y + dy)), w1 = hw(x, Math.max(0, y - dy));
        let tx = 0, ty = 1, tz = s * (y < C ? (w2 - w1) / (Math.min(C, y + dy) - Math.max(0, y - dy)) : 0);
        const tl = Math.hypot(tx, ty, tz); tx /= tl; ty /= tl; tz /= tl;
        for (const o of [o0, o1]) { b.p.push(x + n[0] * o, y + n[1] * o, s * w + n[2] * o); b.n.push(tx * dir, ty * dir, tz * dir); b.u.push(x, y + o); }
      }
      for (let i = 0; i < xs.length - 1; i++) {
        const a = base + i * 2, c1 = a + 2;
        // quad a(o0,x_i) c1(o0,x_i+1) c1+1(o1,x_i+1) a+1(o1,x_i)
        const flip = (s > 0) === (dir > 0);
        if (!flip) b.i.push(a, c1, c1 + 1, a, c1 + 1, a + 1); else b.i.push(a, c1 + 1, c1, a, a + 1, c1 + 1);
      }
    }
  }
  flush(group) {
    for (const [mat, b] of this.b) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(b.n, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(b.u, 2));
      g.setIndex(b.i);
      const m = new THREE.Mesh(g, mat);
      m.castShadow = true; m.receiveShadow = true; m.name = 'hullShell:' + mat.name;
      group.add(m);
    }
  }
}

function buildShell(group, xsAll) {
  const shell = new Shell();
  const rowsIn = (ya, yb) => {
    const out = [ya];
    const cuts = MAT_BANDS.map((b) => b[1]).filter((y) => y > ya + 1e-6 && y < yb - 1e-6);
    const pts = [ya, ...cuts, yb];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], step = a < 3 ? 0.45 : (b <= SHIP.waterline ? 1.8 : 0.9), n = Math.max(1, Math.ceil((b - a) / step - 1e-6));
      for (let k = 1; k <= n; k++) out.push(a + ((b - a) * k) / n);
    }
    return out;
  };
  for (const [x0, x1, top] of HULL_TOPS) {
    const xs = xsAll.filter((x) => x >= x0 - 1e-6 && x <= x1 + 1e-6);
    for (let k = 0; k < STRAKES.length - 1; k++) {
      const ya = STRAKES[k], yb = Math.min(STRAKES[k + 1], top);
      if (ya >= top - 1e-6) break;
      const ys = rowsIn(ya, yb), off = isOut(k) ? LAP : 0;
      // split by material
      let start = 0;
      for (let j = 1; j < ys.length; j++) {
        const boundary = j === ys.length - 1 || MAT_BANDS.some((b) => Math.abs(b[1] - ys[j]) < 1e-6);
        if (!boundary) continue;
        shell.grid(matAt((ys[start] + ys[j]) / 2), xs, ys.slice(start, j + 1), off);
        start = j;
      }
      // lap step at the upper boundary of this strake
      if (STRAKES[k + 1] < top - 1e-6) shell.lip(matAt(STRAKES[k + 1]), xs, STRAKES[k + 1], -0.004, LAP, isOut(k) ? 1 : -1);
    }
  }
  shell.flush(group);
}

/** Half-round moulding along the hull (profile with 4 facets) on top of the plating. */
function hullStrip(batch, mat, x0, x1, yc, h, out) {
  const xs = stations(x0, x1, 2.0, 0.15);
  const prof = [[-0.5, 0], [-0.42, 0.55], [-0.2, 0.92], [0.1, 1], [0.35, 0.8], [0.5, 0]];
  for (const s of [1, -1]) for (let i = 0; i < xs.length - 1; i++) {
    const a = xs[i], b = xs[i + 1];
    for (let k = 0; k < prof.length - 1; k++) {
      const [v0, o0] = prof[k], [v1, o1] = prof[k + 1];
      const p = [hullPoint(a, yc + v0 * h, s, LAP + o0 * out), hullPoint(b, yc + v0 * h, s, LAP + o0 * out), hullPoint(b, yc + v1 * h, s, LAP + o1 * out), hullPoint(a, yc + v1 * h, s, LAP + o1 * out)];
      const n = hullNormal((a + b) / 2, yc, s), dv = (o1 - o0) * out, dy = (v1 - v0) * h;
      batch.oquad(mat, p[0], p[1], p[2], p[3], [n[0] * dy - 0 * dv, n[1] * dy - dv, n[2] * dy]);
    }
  }
}

// ---------------- shell doors / coaling ports ----------------
const DOORS_D = [38, 34, -52];
const DOORS_E = [60, 20, -30, -62];
const COAL_X = [-27.4, -13.4, 0.6, 14.6, 28.6, 42.6];

function hingeAt(inst, x, y, s, base, len) {
  const n = hullNormal(x, y, s), p = hullPoint(x, y, s, base + 0.05);
  inst.between(HINGE_G(), mats.steelDark, [p[0], p[1] - len / 2, p[2]], [p[0], p[1] + len / 2, p[2]], 1);
  void n;
}
let _hinge = null;
const HINGE_G = () => (_hinge ||= new THREE.CylinderGeometry(0.035, 0.035, 1, 8, 1).translate(0, 0.5, 0));

/** Gangway / shell door: frame with rivets, leaves with flush plates and hinges, brass handle. */
function shellDoor(batch, inst, xc, y0, w, h, s, leaves = 2) {
  const base = LAP + 0.004, S = hullS(s, base), N = hullN(s), m = mats.hullBlack;
  const x0 = xc - w / 2, x1 = xc + w / 2, y1 = y0 + h, f = 0.09;
  // frame (raised doubling around the opening)
  batch.plate(m, S, N, x0 - f, x1 + f, y1, y1 + f, 0, 0.03);
  batch.plate(m, S, N, x0 - f, x1 + f, y0 - f, y0, 0, 0.03);
  batch.plate(m, S, N, x0 - f, x0, y0, y1, 0, 0.03);
  batch.plate(m, S, N, x1, x1 + f, y0, y1, 0, 0.03);
  // dark joint around the leaves
  batch.plate(mats.iron, S, N, x0, x1, y0, y1, 0, 0.004, false);
  const lw = leaves === 2 ? w / 2 : w;
  for (let l = 0; l < leaves; l++) {
    const a = x0 + l * lw + 0.012, b = x0 + (l + 1) * lw - 0.012;
    batch.plate(m, S, N, a, b, y0 + 0.012, y1 - 0.012, 0, 0.012);
    // horizontal stiffener lines on the leaf
    for (const t of [0.33, 0.66]) batch.plate(m, S, N, a + 0.05, b - 0.05, y0 + h * t - 0.015, y0 + h * t + 0.015, 0.012, 0.022);
    // hinges on the outer edge
    const hx = l === 0 ? a + 0.02 : b - 0.02;
    for (const t of [0.15, 0.5, 0.85]) {
      hingeAt(inst, hx, y0 + h * t, s, base, 0.18);
      batch.plate(mats.steelDark, S, N, Math.min(hx, hx + (l === 0 ? 0.25 : -0.25)), Math.max(hx, hx + (l === 0 ? 0.25 : -0.25)), y0 + h * t - 0.03, y0 + h * t + 0.03, 0.012, 0.03);
    }
  }
  // handle
  const hx = leaves === 2 ? xc + 0.1 : x1 - 0.18;
  batch.plate(mats.brass, S, N, hx - 0.025, hx + 0.025, y0 + h * 0.47, y0 + h * 0.56, 0.012, 0.05);
  // rivets round the frame
  const R = rivetGeo(0.011), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), nv = new THREE.Vector3();
  const rv = (x, y) => { const n = hullNormal(x, y, s), p = hullPoint(x, y, s, base + 0.03); q.setFromUnitVectors(up, nv.set(n[0], n[1], n[2])); inst.at(R, m, p[0], p[1], p[2], q); };
  for (let x = x0 - f / 2; x <= x1 + f / 2 + 1e-6; x += 0.11) { rv(x, y1 + f / 2); rv(x, y0 - f / 2); }
  for (let y = y0; y <= y1 + 1e-6; y += 0.11) { rv(x0 - f / 2, y); rv(x1 + f / 2, y); }
}

// ---------------- portholes ----------------
let PH = null;
function portholeGeos() {
  if (PH) return PH;
  PH = {
    // brass rim: flange on the plating, raised lip, bore going in towards the glass
    rim: latheGeo('portRim', [[0.312, 0.0], [0.3, 0.018], [0.265, 0.046], [0.225, 0.054], [0.2, 0.035], [0.2, -0.005]], 12),
    glass: new THREE.CircleGeometry(0.2, 12).rotateX(-Math.PI / 2).translate(0, 0.004, 0),
    // eyebrow (rigol) above the porthole: arc in the local x/z plane, local z = up
    rigol: (() => {
      const pos = [], seg = 10, R0 = 0.34, R1 = 0.4, H = 0.035;
      const P = (t, r, h) => [Math.cos(t) * r, h, Math.sin(t) * r];
      for (let i = 0; i < seg; i++) {
        const t0 = 0.35 + (i / seg) * (Math.PI - 0.7), t1 = 0.35 + ((i + 1) / seg) * (Math.PI - 0.7);
        const a = P(t0, R0, 0), b = P(t1, R0, 0), c = P(t1, (R0 + R1) / 2, H), d = P(t0, (R0 + R1) / 2, H), e = P(t1, R1, 0), f = P(t0, R1, 0);
        pos.push(...a, ...c, ...b, ...a, ...d, ...c, ...d, ...e, ...c, ...d, ...f, ...e);
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
      g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
      return g;
    })(),
  };
  return PH;
}

function collectPortholes(ports) {
  const near = (x, list, r) => list.some((d) => Math.abs(x - d) < r);
  const rows = [
    { deck: 'F', ranges: [[-116, 116]] },
    { deck: 'E', ranges: [[-121, 121]], doors: DOORS_E },
    { deck: 'D', ranges: [[-124, 110.5], [124, 126]], doors: DOORS_D },
    { deck: 'C', ranges: [[-131, X.poop - 1.6], [X.wellA + 1.4, X.wellF - 1.4], [X.fc + 1.6, 127]] },
  ];
  rows.forEach((row, ri) => {
    const y = DECK_Y[row.deck] + 1.45;
    if (y < SHIP.waterline + 1) return;
    for (const [a, b] of row.ranges) {
      let i = 0;
      for (let x = a; x <= b; x += 2.8, i++) {
        if ((i * 7 + ri * 3) % 13 === 5) continue;
        if (row.doors && near(x, row.doors, 1.6)) continue;
        if (hw(x, y) < 1.2) continue;
        if (Math.abs(x - 127.2) < 1.2 && Math.abs(y - 20.9) < 1.0) continue; // would sit inside the hawse-pipe bolster
        for (const s of [1, -1]) ports.push({ p: platePoint(x, y, s), n: hullNormal(x, y, s), mat: matAt(y) });
      }
    }
  });
}

/** Instanced portholes from the collected list [{p, n, mat?}]: brass rim with depth, recessed glass, eyebrow. */
export function buildPortholes(inst, ports) {
  const G = portholeGeos();
  const up = [0, 1, 0];
  for (const o of ports) {
    const n = o.n, l = Math.hypot(n[0], n[1], n[2]), Y = [n[0] / l, n[1] / l, n[2] / l];
    // Z = world up projected into the plate, X = Y x Z
    const d = up[0] * Y[0] + up[1] * Y[1] + up[2] * Y[2];
    let Z = [up[0] - d * Y[0], up[1] - d * Y[1], up[2] - d * Y[2]];
    const zl = Math.hypot(...Z); Z = Z.map((v) => v / zl);
    const Xv = [Y[1] * Z[2] - Y[2] * Z[1], Y[2] * Z[0] - Y[0] * Z[2], Y[0] * Z[1] - Y[1] * Z[0]];
    inst.basis(G.rim, mats.brass, o.p, Xv, Y, Z);
    inst.basis(G.glass, mats.windowLit, o.p, Xv, Y, Z);
    inst.basis(G.rigol, o.mat || mats.hullWhite, o.p, Xv, Y, Z);
  }
}

// ---------------- details ----------------
function rivets(inst, xsRanges) {
  const R = rivetGeo(0.012);
  const q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), nv = new THREE.Vector3();
  const put = (x, y, s, mat) => {
    const n = hullNormal(x, y, s), p = hullPoint(x, y, s, shellOff(y) + 0.001);
    q.setFromUnitVectors(up, nv.set(n[0], n[1], n[2]));
    inst.at(R, mat, p[0], p[1], p[2], q);
  };
  let count = 0;
  for (const [x0, x1, top] of HULL_TOPS) {
    for (let k = 1; k < STRAKES.length - 1; k++) {
      const yb = STRAKES[k];
      if (yb < 11.5 || yb >= top - 0.05) continue;
      // rows on the outer strake beside the lap
      const outBelow = isOut(k - 1), sgn = outBelow ? -1 : 1;
      for (const [dy, ph] of [[0.045, 0], [0.105, 0.06]]) {
        const y = yb + sgn * dy, mat = matAt(y);
        for (let x = x0 + 0.05 + ph * 1.33; x < x1 - 0.05; x += 0.16) {
          if (hw(x, y) < 0.6) continue;
          for (const s of [1, -1]) { put(x, y, s, mat); count++; }
        }
      }
    }
    // sheer: top edge of the plating
    {
      const y = top - 0.06, mat = matAt(y);
      for (let x = x0 + 0.05; x < x1 - 0.05; x += 0.16) { if (hw(x, y) < 0.6) continue; for (const s of [1, -1]) { put(x, y, s, mat); count++; } }
    }
    // plate butts (staggered) with a narrow strap line
    for (let k = 7; k < STRAKES.length - 1; k++) {
      const ya = STRAKES[k], yb = Math.min(STRAKES[k + 1], top);
      if (ya >= top - 0.1) continue;
      const ph = ((k * 3) % 5) * (PLATE_LEN / 5);
      for (let xb = -135 + ph; xb < 135; xb += PLATE_LEN) {
        if (xb < x0 + 0.3 || xb > x1 - 0.3) continue;
        if (hw(xb, (ya + yb) / 2) < 1.0) continue;
        for (let y = ya + 0.08; y < yb - 0.06; y += 0.12) {
          const mat = matAt(y);
          if (y < 10.9) continue;
          for (const dx of [-0.05, 0.05]) for (const s of [1, -1]) { put(xb + dx, y, s, mat); count++; }
        }
      }
    }
  }
  return count;
}

function buttStraps(batch, top, x0, x1) {
  for (let k = 7; k < STRAKES.length - 1; k++) {
    const ya = STRAKES[k], yb = Math.min(STRAKES[k + 1], top);
    if (ya >= top - 0.1) continue;
    const ph = ((k * 3) % 5) * (PLATE_LEN / 5);
    for (let xb = -135 + ph; xb < 135; xb += PLATE_LEN) {
      if (xb < x0 + 0.3 || xb > x1 - 0.3 || hw(xb, (ya + yb) / 2) < 1.0) continue;
      for (const s of [1, -1]) {
        const off = isOut(k) ? LAP : 0, S = hullS(s, off), N = hullN(s);
        // split at material boundaries
        const cuts = [ya, ...MAT_BANDS.map((b) => b[1]).filter((y) => y > ya && y < yb), yb];
        for (let i = 0; i < cuts.length - 1; i++) batch.plate(matAt((cuts[i] + cuts[i + 1]) / 2), S, N, xb - 0.012, xb + 0.012, cuts[i], cuts[i + 1], 0, 0.005, false);
      }
    }
  }
}

/** x of the stern contour for half breadth z at height y. */
function sternX(z, y) {
  let a = SHIP.sternX, b = -120;
  for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (hw(m, y) < z) a = m; else b = m; }
  return (a + b) / 2;
}

function buildNames(batch) {
  const mat = mats.hullStripe;
  // bows: "TITANIC", reading from aft to forward on starboard, forward to aft on port
  for (const s of [1, -1]) {
    const S = (u, v, o) => { const x = s > 0 ? 112.6 + u : 122.4 - u; return platePoint(x, v, s, o + 0.004); };
    const N = (u, v) => { const x = s > 0 ? 112.6 + u : 122.4 - u; return hullNormal(x, v, s); };
    strokeText(batch, mat, 'TITANIC', { S, N, u0: 0, v0: 17.6, h: 1.0, track: 0.22, width: 9.8, depth: 0.025, stroke: 0.13 });
  }
  // stern: "TITANIC" over "LIVERPOOL", wrapped round the rounded stern
  const SS = (u, v, o) => {
    const z = u, az = Math.abs(z);
    const x = az < 1e-4 ? SHIP.sternX : sternX(az, v);
    const n = az < 1e-4 ? [-1, 0, 0] : hullNormal(x, v, Math.sign(z));
    const oo = o + 0.004 + shellOff(v);
    return [x + n[0] * oo, v + n[1] * oo, z + n[2] * oo];
  };
  const SN = (u, v) => { const az = Math.abs(u); if (az < 1e-4) return [-1, 0, 0]; return hullNormal(sternX(az, v), v, Math.sign(u)); };
  strokeText(batch, mat, 'TITANIC', { S: SS, N: SN, u0: -3.6, v0: 18.25, h: 0.78, track: 0.18, width: 7.2, depth: 0.025, stroke: 0.1 });
  strokeText(batch, mat, 'LIVERPOOL', { S: SS, N: SN, u0: -3.0, v0: 17.25, h: 0.58, track: 0.14, width: 6.0, depth: 0.02, stroke: 0.08 });
}

/** Roman-numeral draught marks (feet) at the stem and stern. */
function draughtMarks(batch) {
  const ROMAN = (n) => { const r = []; for (const [v, t] of [[40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]) while (n >= v) { r.push(t); n -= v; } return r.join(''); };
  for (const xc of [131.2, -131.6]) {
    for (const s of [1, -1]) {
      const S = (u, v, o) => hullPoint(xc + u * s, v, s, o + shellOff(v) + 0.003);
      const N = (u, v) => hullNormal(xc + u * s, v, s);
      for (let ft = 26; ft <= 40; ft += 2) {
        const y = ft * 0.3048;
        const txt = ROMAN(ft);
        strokeText(batch, mats.paintWhite, txt, { S, N, u0: -0.4, v0: y, h: 0.1524, track: 0.04, width: 0.8, depth: 0.012, stroke: 0.03, roman: true });
      }
    }
  }
}

export function buildHull(world, group, batch, inst, ports) {
  const xs = hullStations();
  buildShell(group, xs);

  // flat bottom
  batch.cast = false;
  for (let i = 0; i < xs.length - 1; i++) {
    const a = xs[i], b = xs[i + 1], wa = hw(a, 0), wb = hw(b, 0);
    batch.quad(mats.hullRed, [a, 0, -wa], [b, 0, -wb], [b, 0, wb], [a, 0, wa]);
  }

  // rivets + butt straps
  rivets(inst, HULL_TOPS);
  for (const [x0, x1, top] of HULL_TOPS) buttStraps(batch, top, x0, x1);

  // mouldings: C-deck sheer line, B-deck line along the superstructure, rubbing strake on E deck
  hullStrip(batch, mats.hullWhite, -133.5, 133.5, C + 0.02, 0.16, 0.06);
  hullStrip(batch, mats.hullWhite, X.wellA, X.wellF, B - 0.07, 0.14, 0.05);
  hullStrip(batch, mats.hullBlack, -120, 118, 14.1, 0.14, 0.05);
  // capping moulding along the top of the bulwark plating (forecastle, wells, poop)
  for (const [x0, x1, top] of HULL_TOPS) if (top > C + 0.5 && top !== B) hullStrip(batch, mats.hullWhite, Math.max(x0, -133.8), Math.min(x1, 133.8), top - 0.09, 0.12, 0.04);
  // boot-topping: crisp fillet at the waterline paint edge
  hullStrip(batch, mats.hullBlack, -126, 126, Y_RED + 0.03, 0.06, 0.012);

  // shell (gangway) doors on D and E deck, coaling ports on F deck level
  for (const s of [1, -1]) {
    for (const x of DOORS_D) shellDoor(batch, inst, x, DECK_Y.D + 0.05, 1.7, 2.05, s);
    for (const x of DOORS_E) shellDoor(batch, inst, x, DECK_Y.E + 0.05, 1.3, 1.95, s, 1);
    for (const x of COAL_X) shellDoor(batch, inst, x, 12.62, 0.72, 0.86, s, 1);
  }

  // hawse pipes: doubling plate (bolster) + cast lip + dark bore
  for (const s of [1, -1]) {
    const cx = 127.2, cy = 20.9, S = hullS(s, shellOff(cy) + 0.004), N = hullN(s);
    batch.ring(mats.hullBlack, S, N, cx, cy, 1.0, 0.78, [[1, 0], [0.98, 0.03], [0.9, 0.04], [0.82, 0.04]], 20);
    batch.ring(mats.iron, S, N, cx, cy, 0.6, 0.44, [[1.37, 0.04], [1.3, 0.11], [1.12, 0.16], [0.98, 0.15], [0.9, 0.09], [0.86, -0.35]], 20, mats.iron);
    // anchor bed: chafing plates below the hawse where the flukes rest
    batch.plate(mats.steelDark, S, N, 125.6, 127.9, 17.15, 17.35, 0, 0.04);
    batch.plate(mats.steelDark, S, N, 126.35, 127.15, 17.35, 19.9, 0, 0.025);
  }

  // stem bar (keel to the forecastle rail) and keel bar
  batch.cyl(mats.hullBlack, [SHIP.bowX + 0.02, C - 0.5, 0], [SHIP.bowX + 0.02, B + BULWARK_H + 0.02, 0], 0.11, 10, true);
  batch.cyl(mats.hullRed, [SHIP.bowX + 0.02, 0, 0], [SHIP.bowX + 0.02, Y_RED, 0], 0.11, 10);
  batch.cyl(mats.hullBlack, [SHIP.bowX + 0.02, Y_RED, 0], [SHIP.bowX + 0.02, C - 0.5, 0], 0.11, 10);
  batch.box(mats.hullRed, -128, -0.18, -0.22, 132, 0.0, 0.22, { skip: 'py' });
  // stern post bar closing the centreline seam of the rounded stern
  for (const [y0, y1, m] of [[Y_RED - 1.5, Y_RED, mats.hullRed], [Y_RED, 17.1, mats.hullBlack], [19.15, Y_STRIPE1, mats.hullBlack], [Y_STRIPE1, B + BULWARK_H, mats.hullWhite]]) {
    batch.cyl(m, [SHIP.sternX - 0.015, y0, 0], [SHIP.sternX - 0.015, y1, 0], 0.05, 8, y1 > B);
  }

  // bilge keels (about 90 m long, at the turn of the bilge, 45 deg outwards)
  for (const s of [1, -1]) {
    const xs2 = stations(-46, 46, 2.0);
    for (let i = 0; i < xs2.length - 1; i++) {
      const a = xs2[i], b = xs2[i + 1];
      const dep = (x) => 0.62 * Math.min(1, (46 - Math.abs(x)) / 8);
      const yb = 0.85;
      const base = (x) => hullPoint(x, yb, s, 0), tip = (x) => { const p = base(x), d = dep(x); return [p[0], p[1] - d * 0.71, p[2] + s * d * 0.71]; };
      const t = 0.025;
      const off = (p, k) => [p[0], p[1] + k * t, p[2] + s * k * t];
      batch.oquad(mats.hullRed, off(base(a), 1), off(base(b), 1), off(tip(b), 1), off(tip(a), 1), [0, 0.7, s * 0.7]);
      batch.oquad(mats.hullRed, off(base(a), -1), off(base(b), -1), off(tip(b), -1), off(tip(a), -1), [0, -0.7, -s * 0.7]);
      batch.oquad(mats.hullRed, off(tip(a), 1), off(tip(b), 1), off(tip(b), -1), off(tip(a), -1), [0, -0.7, s * 0.7]);
    }
  }

  // draught marks + names
  draughtMarks(batch);
  buildNames(batch);

  // mooring pipes through the bulwarks (forecastle + poop), oval cast frames inside and out
  for (const s of [1, -1]) {
    for (const x of [122.5, 115, 106, 100.5, -110, -120.5, -130.5]) {
      const y = B + 0.52;
      if (hw(x, y) < 1.5) continue;
      batch.ring(mats.iron, hullS(s, shellOff(y)), hullN(s), x, y, 0.34, 0.22, [[1.3, 0], [1.2, 0.07], [1.05, 0.09], [0.92, 0.04], [0.9, -0.1]], 16, mats.iron);
      // inner face of the bulwark (vertical, inboard)
      const Si = (u, v, o) => [u, v, s * (hullEdge(u) - 0.001 - o)], Ni = () => [0, 0, -s];
      batch.ring(mats.iron, Si, Ni, x, y, 0.34, 0.22, [[1.3, 0], [1.2, 0.07], [1.05, 0.09], [0.92, 0.04], [0.9, -0.1]], 16, mats.iron);
    }
  }

  // freeing ports (hinged flaps) and scuppers in the well-deck bulwarks; overboard discharges on the hull
  for (const s of [1, -1]) {
    for (const x of [80.5, 85.5, 90.8, -92.5, -97.5, -102.5]) {
      const y0 = C + 0.04, y1 = C + 0.42, S = hullS(s, shellOff(y0)), N = hullN(s);
      batch.plate(mats.iron, S, N, x - 0.5, x + 0.5, y0, y1, 0, 0.003, false);
      batch.plate(mats.hullWhite, S, N, x - 0.47, x + 0.47, y0 + 0.02, y1 - 0.03, 0.003, 0.018);
      batch.cyl(mats.steelDark, hullPoint(x - 0.5, y1 + 0.02, s, shellOff(y1) + 0.03), hullPoint(x + 0.5, y1 + 0.02, s, shellOff(y1) + 0.03), 0.025, 6);
      const Si = (u, v, o) => [u, v, s * (hullEdge(u) - 0.001 - o)], Ni = () => [0, 0, -s];
      batch.plate(mats.iron, Si, Ni, x - 0.5, x + 0.5, y0 - 0.04, y1, 0, 0.003, false);
      batch.plate(mats.paintWhite, Si, Ni, x - 0.47, x + 0.47, y0, y1 - 0.03, 0.003, 0.015);
    }
    for (let x = -118; x <= 118; x += 11.7) {
      const y = 12.0;
      if (COAL_X.some((c) => Math.abs(c - x) < 1.2) || DOORS_E.some((c) => Math.abs(c - x) < 1.2)) continue;
      batch.ring(mats.hullBlack, hullS(s, shellOff(y)), hullN(s), x, y, 0.12, 0.09, [[1.6, 0], [1.4, 0.05], [1.1, 0.06], [0.95, 0.02], [0.9, -0.1]], 10, mats.iron);
    }
  }

  collectPortholes(ports);
}
