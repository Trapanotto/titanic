// Decks B and C – shared helpers of the hero rooms: the few module-level materials of these decks, an instancer for
// repeated furniture, and world-coordinate architectural detailing (panelled wall runs with fielded panels, bolection
// mouldings, dado / skirting / cornice sweeps, mirrors, window architraves; moulded ceilings with ribs and beads).
import * as THREE from 'three';
import { mats, canvasTexture } from '../core/materials.js';
import { ZONE_LEN } from '../core/constants.js';
import { matOf, faceDir, deckHalfWidth, pilaster, ceilingRose, kitMats } from '../interior/kit.js';

// ------------------------------------------------------------------ materials (created once, lazily)

const _m = {};
function tex(size, metres, draw, seed) { return canvasTexture(size, metres, draw, seed); }
/** pinkSilk, pinkShade, roseCarpet, sycamore, posters, walnut */
export function BM() {
  if (_m.ready) return _m;
  _m.ready = true;
  _m.pinkSilk = mats.fabricRed.clone(); _m.pinkSilk.color.setHex(0xe7aaa8); if (_m.pinkSilk.sheenColor) _m.pinkSilk.sheenColor.setHex(0xffd6d0); _m.pinkSilk.name = 'bc_pinkSilk';
  _m.pinkShade = new THREE.MeshStandardMaterial({ color: 0xf3b3b0, emissive: 0xff8f8a, emissiveIntensity: 0.85, roughness: 0.8, side: THREE.DoubleSide }); _m.pinkShade.name = 'b-pinkShade';
  _m.walnut = mats.oak.clone(); _m.walnut.color.setHex(0xf2dcc0); _m.walnut.name = 'bc_walnut';
  _m.sycamore = mats.pine.clone(); _m.sycamore.color.setHex(0xfff4e2); _m.sycamore.name = 'bc_sycamore';
  // Axminster "Rose du Barry": rose ground, trellis of pale garlands, small rose sprigs
  _m.roseCarpet = new THREE.MeshStandardMaterial({ roughness: 1, name: 'bc_roseCarpet', map: tex(512, 1.6, (c, s, r) => {
    c.fillStyle = '#b5636a'; c.fillRect(0, 0, s, s);
    for (let i = 0; i < 4000; i++) { c.fillStyle = `rgba(${90 + r() * 60},30,40,0.08)`; c.fillRect(r() * s, r() * s, 2, 2); }
    c.strokeStyle = 'rgba(245,215,200,0.55)'; c.lineWidth = s * 0.012;
    for (const [x, y] of [[0, 0], [s, 0], [0, s], [s, s], [s / 2, s / 2]]) { c.beginPath(); c.ellipse(x, y, s * 0.22, s * 0.22, 0, 0, 6.3); c.stroke(); }
    const sprig = (x, y, k) => {
      c.fillStyle = '#5f7a4a'; for (let i = 0; i < 4; i++) { const a = i * 1.57 + k; c.beginPath(); c.ellipse(x + Math.cos(a) * s * 0.035, y + Math.sin(a) * s * 0.035, s * 0.02, s * 0.009, a, 0, 6.3); c.fill(); }
      c.fillStyle = '#f2c9c4'; c.beginPath(); c.arc(x, y, s * 0.025, 0, 6.3); c.fill();
      c.fillStyle = '#d98c92'; c.beginPath(); c.arc(x, y, s * 0.013, 0, 6.3); c.fill();
    };
    for (const [x, y] of [[s / 2, 0], [0, s / 2], [s / 2, s], [s, s / 2], [s / 4, s / 4], [3 * s / 4, 3 * s / 4], [s / 4, 3 * s / 4], [3 * s / 4, s / 4]]) sprig(x, y, x * 0.01);
  }, 211) });
  // four posters of the third-class rooms (2 × 2 cells)
  const pt = tex(512, 1, (c, s) => {
    const q = s / 2;
    const cell = (x, y, bg, fg, lines) => {
      c.fillStyle = bg; c.fillRect(x, y, q, q); c.strokeStyle = fg; c.lineWidth = 4; c.strokeRect(x + 8, y + 8, q - 16, q - 16);
      c.fillStyle = fg; c.textAlign = 'center';
      lines.forEach(([t, sz, yy]) => { c.font = `bold ${sz}px Georgia, serif`; c.fillText(t, x + q / 2, y + q * yy); });
    };
    cell(0, 0, '#e9dcc0', '#1b2a4a', [['WHITE STAR LINE', 22, 0.14], ['OLYMPIC', 26, 0.8], ['TITANIC', 26, 0.9]]);
    c.fillStyle = '#1b1b1b'; c.fillRect(q * 0.12, q * 0.52, q * 0.76, q * 0.1); c.fillStyle = '#c9a24a'; for (let i = 0; i < 4; i++) c.fillRect(q * (0.3 + i * 0.12), q * 0.32, q * 0.07, q * 0.2);
    c.fillStyle = '#2f4f63'; c.fillRect(q * 0.05, q * 0.62, q * 0.9, q * 0.08);
    cell(q, 0, '#c43a2a', '#f4ecd8', [['CANADA', 40, 0.25], ['FREE FARMS', 22, 0.45], ['160 ACRES', 22, 0.58], ['FOR EVERY SETTLER', 16, 0.72]]);
    cell(0, q, '#f2ecd8', '#222', [['NOTICE', 30, 0.16], ['SAILINGS', 18, 0.3], ['SOUTHAMPTON – NEW YORK', 14, 0.42], ['EVERY WEDNESDAY', 14, 0.52], ['QUEENSTOWN', 14, 0.62], ['CHERBOURG', 14, 0.72]]);
    c.fillStyle = 'rgba(0,0,0,0.5)'; for (let i = 0; i < 4; i++) c.fillRect(q * 0.2, q * (1.78 + i * 0.04), q * 0.6, 2);
    cell(q, q, '#1d3c5a', '#f0e4c0', [['AMERICAN LINE', 20, 0.16], ['TO', 18, 0.5], ['NEW YORK', 30, 0.62], ['& BOSTON', 18, 0.76]]);
  }, 213);
  pt.repeat.set(1, 1);
  _m.posters = new THREE.MeshStandardMaterial({ map: pt, roughness: 0.85, name: 'bc_posters' });
  // register by name so kit props can take them as option strings (prop templates are keyed by their options)
  for (const k of ['pinkSilk', 'pinkShade', 'walnut', 'sycamore', 'roseCarpet', 'posters']) kitMats['bc_' + k] = _m[k];
  return _m;
}

// ------------------------------------------------------------------ instancing

/** Collects instances of kit / custom props per zone and creates one InstancedMesh per (part, zone) on flush(). */
export class Inst {
  constructor(world, deck) { this.world = world; this.deck = deck; this.sets = new Map(); this.n = 0; }
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
      im.receiveShadow = true;
      this.world.zone(this.deck, s.zi * ZONE_LEN + 1).add(im);
    }
    this.sets.clear();
  }
}

// ------------------------------------------------------------------ moulding profiles [out, up]

export const PRF = {
  skirt: [[0, 0], [0.02, 0], [0.02, 0.12], [0.014, 0.13], [0.014, 0.145], [0.006, 0.158], [0, 0.164]],
  dado: [[0, 0], [0.008, 0.004], [0.016, 0.014], [0.022, 0.03], [0.016, 0.044], [0.008, 0.054], [0, 0.06]],
  rail: [[0, 0], [0.01, 0.004], [0.014, 0.016], [0.008, 0.026], [0, 0.03]],
  cornice: [[0, 0], [0.014, 0], [0.016, 0.018], [0.034, 0.03], [0.034, 0.055], [0.056, 0.066], [0.08, 0.098], [0.096, 0.13], [0.112, 0.14], [0.112, 0.17]],
  corniceSm: [[0, 0], [0.01, 0], [0.012, 0.012], [0.024, 0.02], [0.04, 0.042], [0.056, 0.07], [0.066, 0.094], [0.076, 0.104], [0.076, 0.12]],
  bolection: [[0, 0], [0.01, 0.006], [0.013, 0.016], [0, 0.026]],
  bead: [[0, 0], [0.006, 0.006], [0, 0.012]],
  arch: [[0, 0], [0.012, 0], [0.02, 0.02], [0.018, 0.05], [0.024, 0.07], [0.012, 0.085], [0, 0.085]],
};

/** wall face: axis 'x' = wall running along x at z = c; 'z' = wall along z at x = c; n = ±1 normal into the room */
export const fx = (axis, c, n) => ({ axis, c, n });

// ------------------------------------------------------------------ detailing in world coordinates (heights relative to the floor)

export class Deco {
  constructor(plan) {
    this.plan = plan; this.world = plan.world; this.b = plan.batch; this.Y = plan.y; this.H = plan.h; this.top = plan.y + plan.h;
    this.inst = new Inst(plan.world, plan.deck);
  }
  P(F, a, y, off = 0) { return F.axis === 'x' ? [a, this.Y + y, F.c + F.n * off] : [F.c + F.n * off, this.Y + y, a]; }
  A(F) { return F.axis === 'x' ? [1, 0, 0] : [0, 0, 1]; }
  O(F) { return F.axis === 'x' ? [0, 0, F.n] : [F.n, 0, 0]; }
  rot(F) { return F.axis === 'x' ? faceDir(0, F.n) : faceDir(F.n, 0); }
  /** world x, z of a point on / in front of a face */
  xz(F, a, off = 0) { const p = this.P(F, a, 0, off); return [p[0], p[2]]; }
  sweep(F, mat, prof, a0, a1, y, caps = [true, true], off = 0) {
    if (a1 - a0 < 0.01) return;
    this.b.sweep(matOf(mat), prof, this.P(F, a0, y, off), this.A(F), this.O(F), [0, 1, 0], a1 - a0, caps);
  }
  /** box standing off..off+t in front of the face, a0..a1 along it, heights y0..y1 */
  box(F, mat, a0, a1, y0, y1, t = 0.02, off = 0, faces) {
    const p = this.P(F, a0, y0, off), q = this.P(F, a1, y1, off + t);
    const front = F.axis === 'x' ? (F.n > 0 ? 'Z' : 'z') : (F.n > 0 ? 'X' : 'x');
    this.b.box(matOf(mat), p[0], p[1], p[2], q[0], q[1], q[2], faces ?? front + (F.axis === 'x' ? 'xX' : 'zZ') + 'yY');
  }
  fielded(F, mat, a, yc, w, h, t = 0.012, e = 0.04, off = 0) { this.b.fielded(matOf(mat), this.P(F, a, yc, off), this.A(F), this.O(F), [0, 1, 0], w, h, t, Math.min(e, w * 0.22, h * 0.22)); }
  bolection(F, mat, a0, a1, y0, y1, off = 0) {
    const A = this.A(F), O = this.O(F), U = [0, 1, 0], mA = [-A[0], 0, -A[2]], M = matOf(mat), b = this.b;
    b.sweep(M, PRF.bolection, this.P(F, a0, y0, off), A, O, [0, -1, 0], a1 - a0, [true, true]);
    b.sweep(M, PRF.bolection, this.P(F, a0, y1, off), A, O, U, a1 - a0, [true, true]);
    b.sweep(M, PRF.bolection, this.P(F, a0, y0, off), U, O, mA, y1 - y0, [true, true]);
    b.sweep(M, PRF.bolection, this.P(F, a1, y0, off), U, O, A, y1 - y0, [true, true]);
  }
  /** intervals of [a, e] not covered by holes that overlap the height band y0..y1 (holes: {s, e, y0, y1, p}) */
  segs(a, e, holes, y0, y1, panelsOnly = false) {
    let res = [[a, e]];
    for (const h of holes) {
      if (h.p && !panelsOnly) continue;
      if ((h.y1 ?? 99) <= y0 || (h.y0 ?? 0) >= y1) continue;
      res = res.flatMap(([s, t]) => (h.e <= s || h.s >= t ? [[s, t]] : [[s, Math.min(t, h.s)], [Math.max(s, h.e), t]].filter(([p, q]) => q - p > 0.02)));
    }
    return res;
  }
  /**
   * Panelled wall run along face F from a..e. o: { wood, rail, gilt, lowGilt, cornice, corniceProf, frieze, dado (0.86),
   * top (upper panel top, default H − 0.45), pitch (0.8), lower (true), mirror: [k, phase], orn(F, a, w, yTop), skirt }
   */
  panelRun(F, a, e, holes = [], o = {}) {
    const H = this.H, d = o.dado ?? 0.86, top = o.top ?? H - 0.45, wood = o.wood, rail = o.rail ?? wood;
    if (o.skirt !== false) for (const [s, t] of this.segs(a, e, holes, 0.02, 0.15)) this.sweep(F, o.skirt ?? rail, PRF.skirt, s, t, 0);
    const row = (s, t, y0, y1, pitch, tall) => {
      const len = t - s - 0.14; if (len < 0.18 || y1 - y0 < 0.12) return;
      const n = Math.max(1, Math.round(len / pitch)), gap = 0.1, pw = (len - (n - 1) * gap) / n;
      for (let i = 0; i < n; i++) {
        const ac = s + 0.07 + pw / 2 + i * (pw + gap), a0 = ac - pw / 2, a1 = ac + pw / 2;
        if (tall && o.mirror && i % o.mirror[0] === o.mirror[1] && n > 1) {
          this.box(F, mats.mirror, a0 + 0.05, a1 - 0.05, y0 + 0.05, y1 - 0.05, 0.006);
          this.box(F, o.gilt ?? rail, a0, a1, y0, y0 + 0.05, 0.018); this.box(F, o.gilt ?? rail, a0, a1, y1 - 0.05, y1, 0.018);
          this.box(F, o.gilt ?? rail, a0, a0 + 0.05, y0 + 0.05, y1 - 0.05, 0.018); this.box(F, o.gilt ?? rail, a1 - 0.05, a1, y0 + 0.05, y1 - 0.05, 0.018);
        } else {
          this.fielded(F, tall ? wood : (o.lowWood ?? wood), ac, (y0 + y1) / 2, pw, y1 - y0, 0.014, 0.05);
          if (tall ? o.gilt : o.lowGilt) this.bolection(F, tall ? o.gilt : o.lowGilt, a0, a1, y0, y1);
        }
        if (tall && o.orn) o.orn(F, ac, pw, y1);
      }
    };
    if (o.lower !== false) {
      if (o.lowWood) for (const [s, t] of this.segs(a, e, holes, 0.02, d - 0.02)) this.box(F, o.lowWood, s, t, 0.0, d, 0.004);
      for (const [s, t] of this.segs(a, e, holes, 0.18, d - 0.06, true)) row(s, t, 0.2, d - 0.08, o.lowPitch ?? (o.pitch ?? 0.8) * 1.4, false);
      for (const [s, t] of this.segs(a, e, holes, d, d + 0.06)) this.sweep(F, rail, PRF.dado, s, t, d);
    }
    if (o.upper !== false) for (const [s, t] of this.segs(a, e, holes, d + 0.12, top, true)) row(s, t, d + 0.14, top, o.pitch ?? 0.8, true);
    if (o.frieze) for (const [s, t] of this.segs(a, e, holes, top + 0.06, H - 0.18)) this.box(F, o.frieze, s, t, top + 0.08, H - 0.2, 0.01);
    if (o.topRail !== false) for (const [s, t] of this.segs(a, e, holes, top + 0.02, top + 0.06)) this.sweep(F, o.gilt ?? rail, PRF.rail, s, t, top + 0.03);
    if (o.cornice !== false) this.sweep(F, o.cornice ?? rail, o.corniceProf ?? PRF.cornice, a, e, H - (o.corniceProf ?? PRF.cornice).at(-1)[1]);
  }
  /** pilasters (kit prop) at positions along a face */
  pilasters(F, list, o = {}) {
    for (const a of list) { const [x, z] = this.xz(F, a, 0.04); this.plan.prop(pilaster({ h: o.h ?? this.H - 0.17, w: o.w ?? 0.3, mat: o.mat ?? 'oak', capital: o.capital ?? 'gold' }), x, z, this.rot(F), { collide: false }); }
  }
  /** wall prop (origin = mounting point) at a along face F, height h */
  mount(prop, F, a, h, off = 0.005) { const [x, z] = this.xz(F, a, off); this.plan.prop(prop, x, z, this.rot(F), { y: this.Y + h, collide: false }); return prop; }
  /** architrave round a window opening a0..a1, y0..y1 (moulded frame on the face, sill board) */
  windowFrame(F, a0, a1, y0, y1, mat, sill = mat) {
    const A = this.A(F), O = this.O(F), U = [0, 1, 0], mA = [-A[0], 0, -A[2]], M = matOf(mat), b = this.b;
    b.sweep(M, PRF.arch, this.P(F, a0, y0 - 0.02), U, O, mA, y1 - y0 + 0.1, [true, true]);
    b.sweep(M, PRF.arch, this.P(F, a1, y0 - 0.02), U, O, A, y1 - y0 + 0.1, [true, true]);
    b.sweep(M, PRF.arch, this.P(F, a0 - 0.085, y1), A, O, U, a1 - a0 + 0.17, [true, true]);
    this.box(F, sill, a0 - 0.1, a1 + 0.1, y0 - 0.05, y0, 0.07);
    this.box(F, sill, a0 - 0.06, a1 + 0.06, y0 - 0.16, y0 - 0.05, 0.03);
  }
  // ---------------------------------------------------------------- ceilings
  /** moulded rib under the ceiling along x (axis 'x', at z = c) or along z (at x = c) from a0..a1, width w, depth dp */
  rib(axis, c, a0, a1, w = 0.2, dp = 0.08, mat = 'plaster') {
    const prof = [[0, 0], [dp * 0.55, 0], [dp * 0.8, w * 0.12], [dp, w * 0.3], [dp, w * 0.7], [dp * 0.8, w * 0.88], [dp * 0.55, w], [0, w]];
    if (axis === 'x') this.b.sweep(matOf(mat), prof, [a0, this.top, c - w / 2], [1, 0, 0], [0, -1, 0], [0, 0, 1], a1 - a0, [true, true]);
    else this.b.sweep(matOf(mat), prof, [c - w / 2, this.top, a0], [0, 0, 1], [0, -1, 0], [1, 0, 0], a1 - a0, [true, true]);
  }
  /** flat bead rectangle on the ceiling (gilt fillet) at depth dz below the ceiling */
  beadRect(x0, x1, z0, z1, mat = 'gold', dz = 0) {
    const M = matOf(mat), y = this.top - dz, pr = [[0, 0], [0.008, 0.008], [0, 0.016]];
    this.b.sweep(M, pr, [x0, y, z0 - 0.008], [1, 0, 0], [0, -1, 0], [0, 0, 1], x1 - x0, [true, true]);
    this.b.sweep(M, pr, [x0, y, z1 - 0.008], [1, 0, 0], [0, -1, 0], [0, 0, 1], x1 - x0, [true, true]);
    this.b.sweep(M, pr, [x0 - 0.008, y, z0], [0, 0, 1], [0, -1, 0], [1, 0, 0], z1 - z0, [true, true]);
    this.b.sweep(M, pr, [x1 - 0.008, y, z0], [0, 0, 1], [0, -1, 0], [1, 0, 0], z1 - z0, [true, true]);
  }
  /** grid of ribs at xs (running along z, z0..z1) and zs (running along x, x0..x1); bead frames + cb(cx, cz, w, d) per panel */
  coffers(x0, x1, z0, z1, xs, zs, o = {}) {
    const w = o.w ?? 0.22, dp = o.depth ?? 0.08, mat = o.mat ?? 'plaster';
    for (const x of xs) this.rib('z', x, z0, z1, w, dp, mat);
    for (const z of zs) this.rib('x', z, x0, x1, w, dp, mat);
    const X = [x0, ...xs, x1], Z = [z0, ...zs, z1];
    for (let i = 0; i < X.length - 1; i++) for (let j = 0; j < Z.length - 1; j++) {
      const a = X[i] + (i ? w / 2 : 0), c = X[i + 1] - (i < X.length - 2 ? w / 2 : 0), p = Z[j] + (j ? w / 2 : 0), q = Z[j + 1] - (j < Z.length - 2 ? w / 2 : 0);
      if (c - a < 0.4 || q - p < 0.4) continue;
      if (o.bead) this.beadRect(a + 0.12, c - 0.12, p + 0.12, q - 0.12, o.bead);
      if (o.cb) o.cb((a + c) / 2, (p + q) / 2, c - a, q - p, i, j);
    }
  }
  rose(x, z, r = 0.3) { this.plan.prop(ceilingRose({ r }), x, z, 0, { y: this.top, collide: false }); }
  /** prop hanging from / fixed to the ceiling (origin at the ceiling) */
  ceil(prop, x, z, rot = 0) { this.plan.prop(prop, x, z, rot, { y: this.top, collide: false }); }
  /** floor prop (no checks), optional collider from its footprint */
  put(prop, x, z, rot = 0, collide = false, y = 0) { this.plan.prop(prop, x, z, rot, { collide, y: this.Y + y }); return prop; }
  /** instanced floor prop; collider optional ([x0, z0, x1, z1, h]) */
  ip(prop, x, z, rot = 0, y = 0) { this.inst.add(prop, x, this.Y + y, z, rot); }
  collider(x0, z0, x1, z1, h = 1.0, y0 = 0) { this.world.addCollider(Math.min(x0, x1), this.Y + y0, Math.min(z0, z1), Math.max(x0, x1), this.Y + h, Math.max(z0, z1)); }
  /** collider from a prop footprint centred at x, z with rotation rot (axis aligned only) */
  fpCollider(fp, x, z, rot, h) {
    const c = Math.abs(Math.cos(rot)), s = Math.abs(Math.sin(rot)), ex = (fp.d * c + fp.w * s) / 2, ez = (fp.d * s + fp.w * c) / 2;
    this.collider(x - ex, z - ez, x + ex, z + ez, h ?? Math.max(0.5, Math.min(fp.h, 2)));
  }
  lamp(x, y, z, color = 0xffd9a0, intensity = 0.6) { this.world.addLamp({ x, y: this.Y + y, z, color, intensity }); }
  flush() { this.inst.flush(); }
}

/**
 * The four inner wall faces of a room with their door holes: { fwd, aft, port, stbd } → { F, a, e, holes, hull }.
 * B deck: the exterior wall's inner face is deckHalfWidth + 0.05; below: the hull lining at deckHalfWidth.
 */
export function roomFaces(ctx, extra = {}) {
  const r = ctx.room, deck = ctx.deck, off = deck === 'B' ? 0.05 : 0;
  const hw = Math.min(deckHalfWidth(deck, r.x0 + 0.2), deckHalfWidth(deck, r.x1 - 0.2), deckHalfWidth(deck, (r.x0 + r.x1) / 2)) + off;
  const zP = Math.max(r.z0 + 0.05, -hw), zS = Math.min(r.z1 - 0.05, hw), xA = r.x0 + 0.05, xF = r.x1 - 0.05;
  const holes = (side) => [...(ctx.room.doorsAll ?? []).filter((d) => d.side === side).map((d) => ({ s: d.at - d.w / 2 - 0.1, e: d.at + d.w / 2 + 0.1, y0: 0, y1: 2.12 })), ...(extra[side] ?? [])];
  return {
    aft: { F: fx('z', xA, 1), a: zP, e: zS, holes: holes('aft') },
    fwd: { F: fx('z', xF, -1), a: zP, e: zS, holes: holes('fwd') },
    port: { F: fx('x', zP, 1), a: xA, e: xF, holes: holes('port'), hull: r.z0 + 0.05 < -hw },
    stbd: { F: fx('x', zS, -1), a: xA, e: xF, holes: holes('stbd'), hull: r.z1 - 0.05 > hw },
    x0: xA, x1: xF, z0: zP, z1: zS,
  };
}

/** Window centres (x) of the B-deck side walls between x0 and x1 (exterior run x -70..40, pitch 2.75, 1.15 m wide, sill 0.95, head 2.25). */
export function sideWindows(x0, x1) {
  const out = [];
  for (let i = 0; i < 40; i++) { const c = -68.625 + 2.75 * i; if (c > x0 + 0.62 && c < x1 - 0.62) out.push(c); }
  return out;
}
export const BWIN = { w: 1.15, sill: 0.95, head: 2.25 };
