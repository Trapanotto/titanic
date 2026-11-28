// The people of the night of 14 April (the film, app/sinking.js): passengers and crew on the open decks, the band on
// the boat deck, the people in the lifeboats, those who fell or were swept into the sea.
//
// One low figure (coat, trousers or long skirt, hat, life jacket), drawn instanced; the limbs are animated in the
// vertex shader (walking, running, waving, holding on, sitting, rowing, swimming, playing the violin or cello), so
// hundreds of people cost one draw call. Where they stand is worked out here on the CPU.
//
// Frames: people on board live in ship coordinates (the scene root: they tilt with the ship, and after the break those
// on the stern section are drawn by its own pass); those in the sea live in the outside group (world coordinates).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { DECK_Y, SHIP, BOAT_HOUSES, BOAT_LOW_ROOFS, deckPlanHalfWidth } from '../core/constants.js';
import { TIER } from '../core/tier.js';
import { shipLampPatch } from '../core/materials.js';

const WL = SHIP.waterline, D2R = Math.PI / 180;
export const FIG = { idle: 0, walk: 1, wave: 2, cling: 3, seat: 4, swim: 5, violin: 6, cello: 7, fall: 8, row: 9, bass: 10 };

// ------------------------------------------------------------------ the figure

let _geo = null;
function figureGeometry() {
  if (_geo) return _geo;
  const parts = [];
  const C = (h) => new THREE.Color(h), TINT = C(0xffffff), SKIN = C(0xd8b49a), DARK = C(0x18171a), HAT = C(0x221e1c), JACKET = C(0xb9b3a2);
  const add = (g0, part, col, tint) => {
    const g = g0.index ? g0.toNonIndexed() : g0;
    g.deleteAttribute('uv');
    const n = g.attributes.position.count, c = new Float32Array(n * 3), p = new Float32Array(n).fill(part), t = new Float32Array(n).fill(tint);
    for (let i = 0; i < n; i++) { c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b; }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    g.setAttribute('aPart', new THREE.BufferAttribute(p, 1));
    g.setAttribute('aTint', new THREE.BufferAttribute(t, 1));
    parts.push(g);
  };
  const box = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
  // round parts, flattened front to back (the figure faces +x): sx scales the depth
  const cyl = (r0, r1, h, seg, y, sx = 1, x = 0, z = 0) => new THREE.CylinderGeometry(r0, r1, h, seg, 1).scale(sx, 1, 1).translate(x, y, z);
  const ball = (r, w, hh, x, y, z, sx = 1, sy = 1, sz = 1, cap = Math.PI) => new THREE.SphereGeometry(r, w, hh, 0, Math.PI * 2, 0, cap).scale(sx, sy, sz).translate(x, y, z);
  const SHIRT = C(0xe8e4da), HAIR = C(0x2a1d14);
  for (const s of [-1, 1]) {
    const L = s < 0 ? 2 : 3, A = s < 0 ? 4 : 5;
    add(cyl(0.072, 0.056, 0.8, 6, 0.46, 0.9, 0, s * 0.1), L, DARK, 0);                  // trouser legs
    add(box(0.25, 0.07, 0.1, 0.05, 0.035, s * 0.1), L, C(0x0c0b0b), 0);                // shoes
    add(cyl(0.058, 0.048, 0.34, 6, 1.25, 1, 0, s * 0.265), A, TINT, 1);                // upper arm (sleeve)
    add(cyl(0.048, 0.042, 0.3, 6, 0.93, 1, 0, s * 0.265), A, TINT, 1);                 // forearm
    add(ball(0.045, 5, 4, 0, 0.75, s * 0.265, 0.8, 1.3, 0.9), A, SKIN, 0);             // hand
  }
  add(cyl(0.235, 0.2, 0.58, 8, 1.15, 0.6), 0, TINT, 1);                                // body: broad shoulders, the waist
  add(ball(0.235, 8, 3, 0, 1.42, 0, 0.6, 0.35, 1, Math.PI / 2), 0, TINT, 1);           // round of the shoulders
  add(cyl(0.2, 0.25, 0.36, 8, 0.7, 0.62), 0, TINT, 1);                                 // skirts of the coat
  add(box(0.02, 0.2, 0.1, 0.135, 1.33, 0), 0, SHIRT, 0);                               // shirt front, collar
  add(cyl(0.048, 0.054, 0.1, 6, 1.5), 1, SKIN, 0);                                     // neck
  add(ball(0.1, 8, 6, 0.012, 1.62, 0, 1, 1.15, 0.9), 1, SKIN, 0);                      // head
  add(ball(0.104, 8, 3, -0.008, 1.64, 0, 1, 1.1, 0.92, Math.PI * 0.55), 1, HAIR, 0);   // hair
  add(ball(0.11, 7, 3, 0, 1.69, 0, 1, 1, 0.95, Math.PI / 2), 6, HAT, 0);               // men: bowler or cap
  add(cyl(0.165, 0.165, 0.016, 10, 1.69, 1), 6, HAT, 0);
  add(cyl(0.2, 0.36, 0.92, 10, 0.48, 0.8), 8, TINT, 1);                                // women: long skirt
  add(ball(0.11, 7, 4, -0.07, 1.64, 0, 0.8, 0.8, 0.8), 9, HAIR, 0);                    // and their hair up
  add(cyl(0.25, 0.25, 0.022, 12, 1.73, 1), 9, HAT, 0);                                 // a broad hat
  add(cyl(0.1, 0.12, 0.08, 7, 1.78, 1), 9, HAT, 0);
  add(box(0.08, 0.44, 0.38, 0.15, 1.2, 0), 7, JACKET, 0);                              // cork life jacket, front and back
  add(box(0.08, 0.44, 0.38, -0.15, 1.2, 0), 7, JACKET, 0);
  add(box(0.3, 0.06, 0.12, 0, 1.44, -0.13), 7, JACKET, 0);
  add(box(0.3, 0.06, 0.12, 0, 1.44, 0.13), 7, JACKET, 0);
  _geo = mergeGeometries(parts, false);
  for (const g of parts) g.dispose();
  _geo.computeBoundingSphere();
  return _geo;
}

const U = { uT: { value: 0 } };
const HEAD = /* glsl */ `
attribute float aPart;
attribute float aTint;
attribute vec4 aAnim;
uniform float uT;
mat3 figRZ(float a) { float c = cos(a), s = sin(a); return mat3(c, s, 0.0, -s, c, 0.0, 0.0, 0.0, 1.0); }
mat3 figRX(float a) { float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
`;
// limbs: legs swing about the hip (z axis), arms swing (z) and rise sideways (x) about the shoulder
const POSE = /* glsl */ `
  float fP = aPart, fM = aAnim.y, fPh = aAnim.x + uT * aAnim.z;
  float fBare = step(3.5, aAnim.w), fW2 = aAnim.w - 4.0 * fBare, fWoman = step(1.5, fW2), fJacket = step(0.5, fW2 - 2.0 * fWoman);
  mat3 fR = mat3(1.0);
  vec3 fPiv = vec3(0.0);
  bool fHide = (fP > 5.5 && fP < 6.5 && (fWoman > 0.5 || fBare > 0.5)) || (fP > 8.5 && fWoman < 0.5) || (fP > 7.5 && fP < 8.5 && fWoman < 0.5) || (fP > 6.5 && fP < 7.5 && fJacket < 0.5);
  bool fSeat = (fM > 3.5 && fM < 4.5) || (fM > 6.5 && fM < 7.5) || (fM > 8.5 && fM < 9.5);
  if (fP > 1.5 && fP < 3.5) {
    float s = fP < 2.5 ? -1.0 : 1.0, a = 0.0;
    fPiv = vec3(0.0, 0.86, s * 0.1);
    if (fM > 0.5 && fM < 1.5) a = sin(fPh + (s > 0.0 ? 3.1416 : 0.0)) * clamp(aAnim.z * 0.075, 0.25, 0.85);
    else if (fSeat) a = 1.45;
    else if (fM > 7.5 && fM < 8.5) a = sin(fPh * 1.3 + s) * 0.7;
    else if (fM > 4.5 && fM < 5.5) a = sin(fPh + s * 1.6) * 0.35;
    else if (fM > 2.5 && fM < 3.5) a = 0.25 * s;
    fR = figRZ(a);
  } else if (fP > 3.5 && fP < 5.5) {
    float s = fP < 4.5 ? -1.0 : 1.0, a = 0.0, b = 0.0;
    fPiv = vec3(0.0, 1.43, s * 0.27);
    if (fM < 0.5) a = 0.06 * sin(fPh * 0.4 + s);
    else if (fM < 1.5) a = -sin(fPh + (s > 0.0 ? 3.1416 : 0.0)) * clamp(aAnim.z * 0.085, 0.2, 0.95);
    else if (fM < 2.5) { if (s > 0.0) b = -s * (2.55 + 0.4 * sin(fPh * 1.7)); else { a = 0.4; b = -s * (1.2 + 0.5 * sin(fPh * 1.7 + 1.0)); } }
    else if (fM < 3.5) { a = 2.7 + 0.08 * sin(fPh); b = -s * 0.25; }
    else if (fM < 4.5) a = 0.35;
    else if (fM < 5.5) { b = -s * (1.25 + 0.35 * sin(fPh)); a = 0.3 * sin(fPh + s); }
    else if (fM < 6.5) { if (s < 0.0) { a = 1.25; b = -s * 0.9; } else { a = 1.0 + 0.2 * sin(fPh); b = -s * (0.5 + 0.45 * sin(fPh)); } }
    else if (fM < 7.5) { a = 0.95; if (s > 0.0) b = -s * (0.35 + 0.35 * sin(fPh)); }
    else if (fM < 8.5) { a = 2.3 + 0.7 * sin(fPh * 2.1 + s); b = -s * 0.9; }
    else if (fM < 9.5) a = 1.15 + 0.5 * sin(fPh);
    else { a = 0.8; if (s > 0.0) b = -s * (0.3 + 0.3 * sin(fPh)); }
    fR = figRZ(a) * figRX(b);
  }
  if (fHide) { fR = mat3(0.0); fPiv = vec3(0.0, 1.1, 0.0); }
`;

let _mat = null;
function crowdMaterial() {
  if (_mat) return _mat;
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.88, metalness: 0 });
  m.name = 'crowd';
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uT = U.uT;
    sh.vertexShader = HEAD + sh.vertexShader
      .replace('#include <beginnormal_vertex>', POSE + '\n  vec3 objectNormal = fHide ? normal : fR * normal;\n  #ifdef USE_TANGENT\n  vec3 objectTangent = vec3( tangent.xyz );\n  #endif')
      .replace('#include <begin_vertex>', 'vec3 transformed = fPiv + fR * (position - fPiv);')
      .replace('#include <color_vertex>', '#if defined( USE_COLOR ) && defined( USE_INSTANCING_COLOR )\n  vColor = color * mix(vec3(1.0), instanceColor.rgb, aTint);\n#elif defined( USE_COLOR )\n  vColor = color;\n#endif');
    shipLampPatch(sh);
  };
  m.customProgramCacheKey = () => 'crowd1';
  _mat = m;
  return m;
}

// colours of coats and dresses (dark serge, tweed, a few light evening dresses), the crew in white jackets
const COATS = [0x1d2030, 0x2a2622, 0x34302a, 0x1a1a1a, 0x3d3a36, 0x2b3140, 0x4a3a2a, 0x23262b];
const DRESSES = [0x2c2a3c, 0x5a2530, 0x8c8478, 0x3a4458, 0x6e665a, 0xb8ae9a, 0x2a2a2a, 0x51463e];
const CREW = 0xbfbcb0, BAND = 0x1c2620, MOTHER = 0x8a1e1a, CHILD = 0x55708e;

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _sc = new THREE.Vector3(1, 1, 1), _c = new THREE.Color();
const _Y = new THREE.Vector3(0, 1, 0), _Z = new THREE.Vector3(0, 0, 1), _X = new THREE.Vector3(1, 0, 0);

/** an instanced set of figures under one parent */
class Pool {
  constructor(n, parent, name) {
    const base = figureGeometry(), g = new THREE.BufferGeometry();
    for (const k of Object.keys(base.attributes)) g.setAttribute(k, base.attributes[k]);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    this.anim = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4);
    this.anim.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('aAnim', this.anim);
    this.mesh = new THREE.InstancedMesh(g, crowdMaterial(), n);
    this.mesh.name = name;
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.userData.noMerge = true;
    _m.makeScale(0, 0, 0);
    for (let i = 0; i < n; i++) { this.mesh.setMatrixAt(i, _m); this.mesh.setColorAt(i, _c.set(0x222222)); }
    this.n = n;
    parent.add(this.mesh);
  }
  /** pose i: position, facing (yaw), lean forward, and an extra rotation q (or null) applied outside */
  put(i, x, y, z, yaw, lean, qOut, size = 1) {
    _q.setFromAxisAngle(_Y, yaw);
    if (lean) _q.multiply(_q2.setFromAxisAngle(_Z, -lean));
    if (qOut) _q.premultiply(qOut);
    this.mesh.setMatrixAt(i, _m.compose(_v.set(x, y, z), _q, _sc.set(size, size, size)));
    _sc.set(1, 1, 1);
  }
  hide(i) { this.mesh.setMatrixAt(i, _m.makeScale(0, 0, 0)); }
  look(i, mode, rate, flags, phase) {
    const a = this.anim.array, j = i * 4;
    if (phase !== undefined) a[j] = phase;
    a[j + 1] = mode; a[j + 2] = rate; a[j + 3] = flags;
    this.anim.needsUpdate = true;
  }
  colour(i, hex) { this.mesh.setColorAt(i, _c.set(hex)); this.mesh.instanceColor.needsUpdate = true; }
  dirty() { this.mesh.instanceMatrix.needsUpdate = true; }
}

// ------------------------------------------------------------------ where one can stand

/** height of the open deck people stand on at ship x */
function deckY(x) { return x > 94 ? DECK_Y.B : x > 78 ? DECK_Y.C : x > 74 ? DECK_Y.B : x > -72 ? DECK_Y.boat : x > -90 ? DECK_Y.B : x > -106 ? DECK_Y.C : DECK_Y.B; }
const STATIONS_X = [62.8, 53.0, 43.1, 33.2, -30.1, -40.0, -49.9, -59.8];
/** keep a point out of the deck houses, inside the rails, clear of the boats in their davits */
function clampOpen(x, z) {
  x = Math.max(-128, Math.min(124, x));
  const edge = Math.max(1.5, deckPlanHalfWidth(x) - 0.9);
  let lim = edge;
  if (x > -72 && x < 74) for (const sx of STATIONS_X) if (Math.abs(x - sx) < 5) lim = Math.min(lim, 10.1);
  z = Math.max(-lim, Math.min(lim, z));
  if (x > 44.6 && x < 57.8 && z > 7 && z < 11.2) x = x < 48 ? 44.6 : 57.8; // (the band's place, and room to film them from forward)
  if (x > -72 && x < 74) {
    for (const H of BOAT_HOUSES) if (x > H.x0 - 0.4 && x < H.x1 + 0.4 && Math.abs(z) < H.hw + 0.45) z = Math.sign(z || 1) * (H.hw + 0.45);
    for (const H of BOAT_LOW_ROOFS) if (x > H.x0 - 0.4 && x < H.x1 + 0.4 && Math.abs(z) < H.hw + 0.45) z = Math.sign(z || 1) * (H.hw + 0.45);
  }
  return Math.max(-lim, Math.min(lim, z));
}

/** a bowed string instrument, 1.35 m high standing on its end pin (scaled down for a violin): two bouts, waist, neck */
function instrumentGeometry() {
  const parts = [];
  const sph = (sx, sy, sz, y) => new THREE.SphereGeometry(1, 10, 6).scale(sx, sy, sz).translate(0, y, 0);
  parts.push(sph(0.26, 0.26, 0.09, 0.36), sph(0.2, 0.2, 0.085, 0.72), new THREE.BoxGeometry(0.17, 0.2, 0.15).translate(0, 0.54, 0));
  parts.push(new THREE.BoxGeometry(0.05, 0.5, 0.045).translate(0, 1.1, 0.02), new THREE.BoxGeometry(0.06, 0.1, 0.06).translate(0, 1.38, 0.02));
  parts.push(new THREE.CylinderGeometry(0.008, 0.012, 0.12, 4).translate(0, 0.06, 0));
  const flat = parts.map((p) => { const q = p.index ? p.toNonIndexed() : p; q.deleteAttribute('uv'); return q; });
  const g = mergeGeometries(flat, false);
  g.computeVertexNormals();
  return g;
}

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

// ------------------------------------------------------------------ the crowd

export class Crowd {
  constructor(sink) {
    this.s = sink;
    const f = TIER.fine ?? 2;
    const N = [240, 380, 560, 800][f] ?? 560;
    this.N = N;
    this.deck = new Pool(N + 18, sink.scene, 'crowdDeck');
    this.sea = new Pool(N + 8, sink.outside, 'crowdSea');
    this.boatPools = [];
    this.P = [];
    for (let i = 0; i < N; i++) {
      const woman = Math.random() < 0.38, crew = !woman && Math.random() < 0.1, third = Math.random() < 0.42;
      const P = {
        i, woman, crew, third, x: 0, y: 0, z: 0, tx: 0, tz: 0, v: 1, yaw: 0, mode: FIG.idle, rate: 0.5,
        jacket: false, state: 0, retarget: 0, cling: Math.random() < 0.55, phase: Math.random() * 20,
        // when they come out on deck (minutes after 23:40): a few are out already, the rest come up as they are woken
        m0: Math.random() < 0.06 ? -1 : 5 + Math.pow(Math.random(), 1.4) * 90, sea: -1,
      };
      if (third && P.m0 > 0) P.m0 = 18 + Math.pow(Math.random(), 1.2) * 95; // (steerage came up later, many through the aft well deck)
      this.deck.colour(i, crew ? CREW : woman ? pick(DRESSES) : pick(COATS));
      this.P.push(P);
    }
    // the ice on the forward well deck: a handful of steerage passengers came out to play with it
    for (let k = 0; k < 10; k++) { const P = this.P[k]; P.third = true; P.m0 = -1; P.ice = true; P.woman = false; }
    this.seaN = 0;
    this.sw = [];         // in the sea: { p, v, fall, t0, alive, still }
    this._band();
    // the stokers in boiler room 6, where the sea came in: they ran for it as the watertight doors came down
    this.stokers = [];
    for (let k = 0; k < 6; k++) {
      const i = N + 8 + k;
      this.deck.colour(i, 0x2d2a26);
      this.stokers.push({ i, x: 62 + Math.random() * 3.4, z: -1 + Math.random() * 8, v: 3.0 + Math.random() * 1.2, yaw: 0 });
    }
    // one family the film follows: the mother (red coat) and her child go into boat 7, the father stays at the rail
    this.family = { mother: N + 14, child: N + 15, father: N + 16 };
    this.deck.colour(N + 14, MOTHER); this.deck.colour(N + 15, CHILD); this.deck.colour(N + 16, 0x1e2230);
    this.deck.look(N + 14, FIG.idle, 0.8, 3, 1); this.deck.look(N + 15, FIG.idle, 1, 4 + 1, 2); this.deck.look(N + 16, FIG.idle, 0.8, 1, 3);
    // the wireless operator at his set in the Marconi room
    this.operator = N + 17;
    this.deck.colour(N + 17, 0x1b1f2a);
    this.deck.look(N + 17, FIG.cello, 5, 4, 0);
    this.frontX = 200;
    this.tick = 0;
  }

  // ---------------------------------------------------------------- the band (8 men on the boat deck, starboard side)
  _band() {
    const s = this.s, base = this.N;
    const spots = [[46.2, 8.4, 'violin'], [47.3, 8.9, 'violin'], [48.4, 8.6, 'violin'], [49.4, 9.1, 'violin'], [45.6, 9.7, 'violin'],
      [47.0, 10.3, 'cello'], [48.6, 10.4, 'cello'], [50.2, 9.9, 'bass']];
    const mat = new THREE.MeshStandardMaterial({ color: 0x5a2e14, roughness: 0.45, metalness: 0.05 });
    mat.name = 'instrument';
    mat.onBeforeCompile = shipLampPatch;
    mat.customProgramCacheKey = () => 'instrument1';
    this.inst = new THREE.InstancedMesh(instrumentGeometry(), mat, 16);
    this.inst.name = 'instruments';
    this.inst.frustumCulled = false;
    s.scene.add(this.inst);
    this.band = spots.map(([x, z, kind], k) => {
      const i = base + k, yaw = Math.atan2(-(8.7 - z), 57 - x); // facing forward, towards the passengers gathered by the staircase entrance
      const seat = kind === 'cello';
      const mode = kind === 'violin' ? FIG.violin : kind === 'cello' ? FIG.cello : FIG.bass;
      this.deck.colour(i, BAND);
      this.deck.look(i, mode, 3.2 + Math.random() * 0.6, 0, Math.random() * 6);
      return { i, x, z, yaw, kind, seat, on: true, k };
    });
    this._bandPose();
  }

  _bandPose() {
    for (const B of this.band) {
      if (!B.on) { this.deck.hide(B.i); this.inst.setMatrixAt(B.k, _m.makeScale(0, 0, 0)); this.inst.setMatrixAt(B.k + 8, _m.makeScale(0, 0, 0)); continue; }
      const y0 = DECK_Y.boat - (B.seat ? 0.36 : 0);
      this.deck.put(B.i, B.x, y0, B.z, B.yaw, 0, this._qComp(B.x, 0.6));
      // the instrument in the musician's frame (figure faces +x)
      // [x, y, z in the musician's frame, size, tilt about the figure's x, then about z]
      const off = B.kind === 'violin' ? [0.05, 1.38, -0.1, 0.44, -0.35, -1.25] : B.kind === 'cello' ? [0.42, 0.38, 0, 0.92, 0, 0.25] : [0.34, 0.02, 0, 1.38, 0, 0.15];
      _q.setFromAxisAngle(_Y, B.yaw).multiply(_q2.setFromAxisAngle(_X, off[4])).multiply(new THREE.Quaternion().setFromAxisAngle(_Z, off[5]));
      const qc = this._qComp(B.x, 0.6);
      _v.set(off[0], off[1], off[2]).applyAxisAngle(_Y, B.yaw);
      if (qc) { _v.applyQuaternion(qc); _q.premultiply(qc); }
      _v.x += B.x; _v.y += y0; _v.z += B.z;
      this.inst.setMatrixAt(B.k, _m.compose(_v, _q, _sc.set(off[3], off[3], off[3])));
      // the chair of a cellist
      if (B.seat) this.inst.setMatrixAt(B.k + 8, _m.compose(_v.set(B.x - 0.05, DECK_Y.boat, B.z), _q.setFromAxisAngle(_Y, B.yaw), _sc.set(0.36, 0.36, 0.36)));
      else this.inst.setMatrixAt(B.k + 8, _m.makeScale(0, 0, 0));
      _sc.set(1, 1, 1);
    }
    this.inst.instanceMatrix.needsUpdate = true;
  }

  /** a figure on the ship stays more or less upright in the world while the deck tilts (k: how much) */
  _qComp(x, k) {
    const s = this.s, st = s.broken && x < s.XB;
    const trim = (st ? s.tb : s.ta) || 0, list = (st ? s.lb : s.la) || 0;
    if (!trim && !list) return null;
    _e.set(list * D2R * k, 0, trim * D2R * k, 'ZXY');
    return (this._qc ||= new THREE.Quaternion()).setFromEuler(_e);
  }

  // ---------------------------------------------------------------- choosing where to go
  _target(P, m) {
    const s = this.s, xf = this.frontX - 6;
    let x, z, mode = FIG.idle, run = false;
    const side = Math.random() < 0.5 ? -1 : 1;
    if (P.ice && m < 26) { x = rnd(80, 92); z = rnd(-6, 6); }
    else if (m < 45) {
      if (P.third) { x = rnd(-128, -92); z = rnd(-8, 8); }
      else { x = pick([rnd(28, 70), rnd(-48, 20)]); z = side * rnd(7.5, 10); }
    } else if (m < 128) {
      // round the boats being got ready and loaded; women and children first
      const live = s.stations?.filter((st) => st.launch > m - 6 && st.launch < m + 26) ?? [];
      const st = live.length && Math.random() < 0.8 ? pick(live) : null;
      if (st && !(P.third && m < 90 && st.u.spec.x > 0)) { x = st.u.spec.x + rnd(-5, 5); z = st.u.spec.side * rnd(8.2, 10); if (st.lowered && m - st.launch < 14 && Math.random() < 0.5) mode = FIG.wave; }
      else if (P.third) { x = rnd(-125, -60); z = rnd(-9, 9); }
      else { x = rnd(-60, 70); z = side * rnd(8, 12.6); }
      run = Math.random() < 0.15 + (m - 45) / 150;
    } else if (m < 141) {
      x = rnd(-70, Math.min(40, xf)); z = side * rnd(6, 12.6);
      if (Math.random() < 0.5) x = rnd(-126, -95);
      run = Math.random() < 0.6;
      if (Math.random() < 0.25) mode = FIG.wave;
    } else {
      // everyone aft: the poop deck, the docking bridge, the aft well deck
      x = Math.random() < 0.7 ? rnd(-128, -100) : rnd(-98, -72);
      z = rnd(-10, 10);
      run = true;
      mode = P.cling ? FIG.cling : Math.random() < 0.3 ? FIG.wave : FIG.idle;
    }
    x = Math.min(x, xf);
    if (P.ice && m < 26) x = Math.max(x, 79);
    P.tx = x; P.tz = clampOpen(x, z);
    P.v = run ? (m >= 141 ? rnd(3.6, 5.6) : rnd(2.6, 4.6)) : rnd(0.8, 1.6);
    P.endMode = mode;
    P.retarget = rnd(3, 9) * (m > 140 ? 0.5 : m > 95 ? 0.6 : 1);
    if (P.ice) P.retarget = rnd(1.5, 4);
  }

  _spawn(P, m) {
    // up from the companionways: the house ends on the boat deck, the stairs aft
    if (P.ice) { P.x = rnd(80, 92); P.z = rnd(-6, 6); }
    else if (P.third) { P.x = pick([rnd(-122, -100), rnd(-96, -92)]); P.z = rnd(-6, 6); }
    else { const H = pick(BOAT_HOUSES); P.x = Math.random() < 0.5 ? H.x0 - 0.8 : H.x1 + 0.8; P.z = (Math.random() < 0.5 ? -1 : 1) * rnd(2, 6); }
    P.x = Math.min(P.x, this.frontX - 8);
    P.z = clampOpen(P.x, P.z);
    P.y = deckY(P.x);
    P.state = 1;
    P.jacket = m > 30 ? Math.random() < 0.8 : m > 15 ? Math.random() < 0.4 : false;
    if (P.ice) P.jacket = false;
    this._target(P, m);
  }

  // ---------------------------------------------------------------- into the sea
  _toSea(P, wp, fall) {
    P.state = 2;
    this.deck.hide(P.i);
    const i = this.seaN % this.sea.n;
    this.seaN++;
    const W = this.sw[i] || (this.sw[i] = { p: new THREE.Vector3(), v: new THREE.Vector3(), spin: new THREE.Vector3(), r: new THREE.Vector3() });
    W.p.copy(wp); W.alive = true; W.fall = fall; W.t = 0; W.m0 = this.s.m; W.yaw = Math.random() * 6.28; W.from = P;
    W.v.set(rnd(-1.5, 1.5), fall ? rnd(-1, 2) : 0, rnd(-1.5, 1.5));
    W.spin.set(rnd(-2, 2), rnd(-1, 1), rnd(-2, 2)); W.r.set(0, 0, 0);
    _c.copy(this.deck.mesh.instanceColor ? new THREE.Color().fromArray(this.deck.mesh.instanceColor.array, P.i * 3) : _c.set(0x222222));
    this.sea.mesh.setColorAt(i, _c); this.sea.mesh.instanceColor.needsUpdate = true;
    const flags = (P.jacket ? 1 : 0) + (P.woman ? 2 : 0);
    this.sea.look(i, fall ? FIG.fall : FIG.swim, fall ? 5 : rnd(2, 3.5), flags, Math.random() * 9);
    if (!fall) W.p.y = WL - 1.12;
  }

  /** a boat goes back for the people in the water: those within r (world x/z) of p are pulled in (at most max); returns how many */
  rescue(p, r, max = 1e9) {
    let n = 0;
    for (let i = 0; i < this.sw.length && n < max; i++) {
      const W = this.sw[i];
      if (!W?.alive || W.fall) continue;
      if (Math.hypot(W.p.x - p.x, W.p.z - p.z) < r) { W.alive = false; this.sea.hide(i); n++; }
    }
    if (n) this.sea.dirty();
    return n;
  }

  /** a point near the people in the water (for the boat that goes back) */
  seaCentre(out) {
    let n = 0; out.set(0, WL, 0);
    for (const W of this.sw) if (W?.alive && !W.fall) { out.x += W.p.x; out.z += W.p.z; n++; }
    if (n) { out.x /= n; out.z /= n; }
    return n;
  }

  // ---------------------------------------------------------------- the people in a lifeboat (boat group, boat-local)
  boatLoad(boat, count, rowers = 4, family = false) {
    const n = Math.max(rowers + 1, Math.min(44, count));
    const pool = new Pool(n + 6, boat, 'crowdBoat');
    const seats = [];
    for (let r = 0; r < 11; r++) for (let c = 0; c < 4; c++) seats.push([-3.6 + r * 0.72, -0.84 + c * 0.56]);
    seats.sort(() => Math.random() - 0.5);
    for (let k = 0; k < n; k++) {
      const row = k < rowers, woman = !row && Math.random() < 0.7;
      let x, z, mode, yaw;
      if (row) { x = -1.6 + (k >> 1) * 1.2; z = (k & 1 ? 1 : -1) * 0.55; mode = FIG.row; yaw = Math.PI; }
      else if (k === rowers) { x = -4.0; z = 0; mode = FIG.idle; yaw = 0; } // at the tiller
      else { const S = seats[k]; x = S[0]; z = S[1]; mode = FIG.seat; yaw = Math.random() < 0.5 ? 0 : Math.PI; }
      const y = mode === FIG.idle ? 0.25 : 0.04;
      pool.put(k, x, y, z, yaw + rnd(-0.3, 0.3), 0, null);
      pool.colour(k, row ? CREW : woman ? pick(DRESSES) : pick(COATS));
      pool.look(k, mode, row ? 2.2 : 0.6, 1 + (woman ? 2 : 0), Math.random() * 6);
    }
    for (let k = n; k < n + 6; k++) pool.hide(k);
    if (family) {
      // the mother and her child, near the stern of the boat (they are found again at dawn)
      const k = rowers + 1;
      pool.put(k, -2.6, 0.04, 0.42, Math.PI, 0, null); pool.colour(k, MOTHER); pool.look(k, FIG.seat, 0.6, 3, 0);
      pool.put(k + 1, -2.6, 0.3, -0.12, Math.PI, 0, null, 0.62); pool.colour(k + 1, CHILD); pool.look(k + 1, FIG.seat, 0.6, 5, 0);
      this.familyBoarded = true;
    }
    pool.dirty();
    const B = { pool, n, free: n, boat };
    this.boatPools.push(B);
    return B;
  }

  /** one more person pulled into a boat */
  boatAdd(B) {
    if (B.free >= B.pool.n) return;
    const k = B.free++, x = rnd(-3, 3), z = rnd(-0.8, 0.8);
    B.pool.put(k, x, 0.04, z, Math.random() * 6.28, 0, null);
    B.pool.colour(k, pick(COATS));
    B.pool.look(k, FIG.seat, 0.4, 1, 0);
    B.pool.dirty();
  }

  // ---------------------------------------------------------------- per frame
  update(dt, m) {
    const s = this.s;
    U.uT.value += dt;
    // the front of the water along the deck: nobody goes forward of it
    let xf = 200;
    for (let x = 124; x > -130; x -= 4) {
      const T = s.broken && x < s.XB ? s.TB : s.TA;
      if (_v.set(x, deckY(x), 0).applyMatrix4(T).y < WL + 1.2) xf = x; else break;
    }
    this.frontX = xf < 200 ? xf : 200;
    const steep = s.broken ? (s.tb || 0) : 0;
    for (const P of this.P) {
      if (P.state === 2) continue;
      if (P.state === 0) { if (m >= P.m0 && !(s.broken)) this._spawn(P, m); else continue; }
      // walk towards the target, keep clear of the houses, the deck height follows (stairs)
      P.retarget -= dt;
      if (P.retarget <= 0 && !(steep > 20)) this._target(P, m);
      const dx = P.tx - P.x, dz = P.tz - P.z, d = Math.hypot(dx, dz);
      let moving = false;
      if (d > 0.35 && !(steep > 18)) {
        const st = Math.min(d, P.v * dt);
        P.x += (dx / d) * st; P.z += (dz / d) * st;
        P.z = clampOpen(P.x, P.z);
        P.yaw = Math.atan2(-dz, dx);
        moving = true;
      } else if (P.endMode === FIG.wave || P.endMode === FIG.idle) {
        // turn outboard to watch the boats (or the water coming)
        const want = Math.atan2(-Math.sign(P.z || 1), 0);
        P.yaw += Math.sin(want - P.yaw) * Math.min(1, dt * 2);
      }
      const yd = deckY(P.x);
      P.y += Math.max(-dt * 5, Math.min(dt * 5, yd - P.y));
      const mode = moving ? FIG.walk : steep > 18 ? (P.cling ? FIG.cling : FIG.idle) : (P.endMode ?? FIG.idle);
      const rate = moving ? P.v * 4.4 : mode === FIG.wave ? 3 : 1;
      const flags = (P.jacket ? 1 : 0) + (P.woman ? 2 : 0);
      if (mode !== P.mode || rate !== P.rate) { P.mode = mode; P.rate = rate; this.deck.look(P.i, mode, rate, flags); }
      const lean = moving ? Math.min(0.22, P.v * 0.045) : 0;
      this.deck.put(P.i, P.x, P.y, P.z, P.yaw, lean, this._qComp(P.x, P.mode === FIG.cling ? 0.35 : 0.85));
      // the sea reaches them, or (the stern rising) they lose their hold and fall
      const T = s.broken && P.x < s.XB ? s.TB : s.TA;
      _v.set(P.x, P.y + 0.3, P.z).applyMatrix4(T);
      if (_v.y < WL + 0.1) { _v.y = WL; this._toSea(P, _v, false); continue; }
      if (steep > 24) {
        const k = (steep - 24) / 60, rate = P.cling ? 0.05 + 0.2 * k : 0.3 + 1.2 * k;
        if (Math.random() < dt * rate) this._toSea(P, _v, true);
      }
    }
    // the stokers: at work until the sea bursts in, then away aft through the door before it closes
    const st = s.t;
    for (const K of this.stokers) {
      if (st > 34) { this.deck.hide(K.i); continue; }
      const run = st > 23.6;
      if (run) { const dx = 63.6 - K.x, dz = -8.5 - K.z, d = Math.hypot(dx, dz); if (d > 0.3) { K.x += (dx / d) * K.v * dt; K.z += (dz / d) * K.v * dt; K.yaw = Math.atan2(-dz, dx); } else K.gone = true; }
      if (K.gone) { this.deck.hide(K.i); continue; }
      this.deck.look(K.i, run ? FIG.walk : FIG.idle, run ? K.v * 4.4 : 1, 4);
      this.deck.put(K.i, K.x, DECK_Y.tank, K.z, run ? K.yaw : 0.4, run ? 0.18 : 0.3, null);
    }
    this.deck.dirty();
    // the family by boat 7: together at the rail, then mother and child are in the boat and the father stays, waving
    {
      const F = this.family, by = DECK_Y.boat, yaw = -Math.PI / 2; // (facing outboard, starboard)
      const on = m >= 40 && !F.gone;
      if (on && !this.familyBoarded) {
        this.deck.put(F.mother, 34.3, by, 9.75, yaw + 0.5, 0, this._qComp(34, 0.85));
        this.deck.put(F.child, 34.95, by, 9.7, yaw - 0.3, 0, this._qComp(34, 0.85), 0.62);
      } else { this.deck.hide(F.mother); this.deck.hide(F.child); }
      if (on) {
        const waving = this.familyBoarded && m < 80;
        if (waving !== F.waving) { F.waving = waving; this.deck.look(F.father, waving ? FIG.wave : FIG.idle, waving ? 3 : 0.8, 1); }
        this.deck.put(F.father, 33.5, by, 9.9, yaw + (this.familyBoarded ? 0 : 0.6), 0, this._qComp(33, 0.85));
        _v.set(33.5, by + 0.3, 9.9).applyMatrix4(s.TA);
        if (_v.y < WL + 0.1) { F.gone = true; this.deck.hide(F.father); this._toSea({ i: F.father, jacket: true, woman: false }, _v.setY(WL), false); }
      } else if (!F.gone) this.deck.hide(F.father);
      // the operator: at the key until the captain released him (about 02:17)
      if (m < 137) this.deck.put(this.operator, 51.3, by - 0.36, 0.75, 0, 0.12, this._qComp(51, 0.85));
      else this.deck.hide(this.operator);
    }
    // the band plays on until the sea comes over the boat deck forward
    let bandOn = false;
    for (const B of this.band) {
      if (B.on) {
        _v.set(B.x, DECK_Y.boat + 0.5, B.z).applyMatrix4(s.TA);
        if (_v.y < WL + 0.1) { B.on = false; this._toSea({ i: B.i, jacket: false, woman: false }, _v.setY(WL), false); }
        else bandOn = true;
      }
    }
    this.bandOn = bandOn;
    if (bandOn || !this._bandOff) { this._bandPose(); this._bandOff = !bandOn; }
    // in the sea: falling, then in the water – swimming, then still
    let any = false;
    for (let i = 0; i < this.sw.length; i++) {
      const W = this.sw[i];
      if (!W?.alive) continue;
      any = true;
      W.t += dt;
      if (W.fall) {
        W.v.y -= 9.8 * dt;
        W.p.addScaledVector(W.v, dt);
        W.r.addScaledVector(W.spin, dt);
        if (W.p.y < WL) {
          W.fall = false; W.p.y = WL - 1.12; W.v.multiplyScalar(0.1); W.v.y = 0; W.m0 = m;
          s.wreck?.spray.emit(_v.set(W.p.x, WL + 0.1, W.p.z), 10, 4, 1.4, null, 0.6);
          this.sea.look(i, FIG.swim, rnd(2, 3.5), this.sea.anim.array[i * 4 + 3]);
        }
        _e.set(W.r.x, W.r.y + W.yaw, W.r.z);
        _q.setFromEuler(_e);
        this.sea.mesh.setMatrixAt(i, _m.compose(W.p, _q, _sc));
        continue;
      }
      // the swell, a slow drift outward; after a while (the cold) they stop swimming
      W.p.x += W.v.x * dt * 0.3; W.p.z += W.v.z * dt * 0.3;
      const y = WL - 1.12 + Math.sin(U.uT.value * 1.1 + i) * 0.06;
      if (!W.still && m - W.m0 > 9 && Math.random() < dt * 0.05) { W.still = true; this.sea.look(i, FIG.idle, 0.3, this.sea.anim.array[i * 4 + 3]); }
      this.sea.put(i, W.p.x, y - (W.still ? 0.12 : 0), W.p.z, W.yaw + Math.sin(U.uT.value * 0.3 + i) * 0.2, W.still ? 0.5 : 0.25, null);
    }
    if (any) this.sea.dirty();
  }
}
