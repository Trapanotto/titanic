// The night of 14 April as a film (app/sinking.js): a director that cuts between camera set-ups and moves the camera
// along each shot, and the wreckage – the torn edges of the hull where it broke, flying plates and timber, sparks,
// spray where things hit the sea, ice breaking off the berg along the starboard side.
//
// Frames: the ship is static in its own coordinates and the outside world is drawn through the inverse of its
// transform TA (see sinking.js). The director thinks in the world (a camera on the sea keeps the horizon level, one on
// deck tilts with the ship) and converts every shot into ship coordinates. Debris and spray live in the outside group
// (world coordinates); the torn edges belong to the two halves of the ship and are drawn after them (renderScene).
import * as THREE from 'three';
import { DECK_Y, SHIP, FUNNELS, hullHalfWidth } from '../core/constants.js';
import { TIER } from '../core/tier.js';

const WL = SHIP.waterline;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (t) => { t = clamp01(t); return t * t * (3 - 2 * t); };
const ease = (t) => { t = clamp01(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _v = new THREE.Vector3();

// ------------------------------------------------------------------ the shots
// t: start in real seconds (approach and collision), m: start in minutes after 23:40; dur in the same unit.
// cam / look: world points (c.S = a point of the ship, moving with it; c.W = a fixed point in the sea).
// up 'ship': the camera stands on deck and tilts with her; otherwise the horizon stays level.
const SHOTS = [
  { name: 'Krähennest', t: 0, dur: 6, fov: 46, up: 'ship', sway: 0.04,
    cam: (c, k) => c.S(99.5, 39.6 - k * 0.3, 0.6),
    look: (c, k) => c.S(420, 24, 0).lerp(c.berg(10), smooth(k * 1.4)) },
  { name: 'Vom Meer', t: 6, dur: 9, fov: 42, sway: 0.25,
    cam: (c, k) => c.W(c.B.x + 36 - k * 8, WL + 5.5, -62 + k * 6),
    look: (c, k) => c.S(126, 16, 0).lerp(c.berg(8), 0.35 - 0.2 * k) },
  { name: 'Kollision', t: 15, dur: 8, fov: 50, up: 'ship', sway: 0.05,
    cam: (c, k) => c.S(64 - k * 6, 47, -22),
    look: (c, k) => c.S(96 - k * 26, 13, 17) },
  { name: 'Vorschiff', m: 0.15, dur: 20, fov: 52, up: 'ship', sway: 0.03,
    cam: (c, k) => c.S(68 + k * 3, 36.5 - k * 1.5, 10.5 - k * 2),
    look: (c, k) => c.S(88, 20, 4 - k) },
  { name: 'Weite', m: 20, dur: 30, fov: 38, sway: 0.3,
    cam: (c, k) => c.orbit(0.75 + 0.75 * ease(k), 250 - 30 * k, 44 - 14 * k),
    look: (c) => c.S(5, 16, 0) },
  { name: 'Boot 7', m: 50, dur: 24, fov: 46, sway: 0.12,
    cam: (c, k) => c.S(14 + 8 * k, 15 - k, 44),
    look: (c, k) => c.S(34, 21 - 5 * ease(k), 13) },
  { name: 'Raketen', m: 74, dur: 14, fov: 52, sway: 0.25,
    cam: (c, k) => c.W(150 - 30 * k, WL + 4, 250 - 10 * k),
    look: (c, k) => c.S(55, 85 + 10 * k, 0) },
  { name: 'Aus dem Boot', m: 88, dur: 22, fov: 44, sway: 0.35, boat: true,
    cam: (c) => c.boat(1.6),
    look: (c) => c.S(10, 17, 0) },
  { name: 'Von oben', m: 110, dur: 22, fov: 40, sway: 0.2,
    cam: (c, k) => c.orbit(-0.7 + 1.1 * ease(k), 235 - 30 * k, 95 - 35 * k),
    look: (c) => c.S(25, 10, 0) },
  { name: 'Bootsdeck', m: 132, dur: 18, fov: 56, up: 'ship', sway: 0.04,
    cam: (c, k) => c.S(14 + 6 * k, 30.2, 9.2),
    look: (c, k) => c.S(80, 27 - 3 * k, 2) },
  { name: 'Backbord', m: 150, dur: 4.6, fov: 36, sway: 0.25,
    cam: (c, k) => c.W(-40 + 25 * k, WL + 3.2, -235),
    look: (c) => c.S(0, 18, 0) },
  { name: 'Schornstein', m: 154.6, dur: 2.4, fov: 44, sway: 0.2, fixed: true,
    cam: (c, k) => c.at('fun', () => c.S(FUNNELS[0].x, 32, 0).add(_v.set(46, 0, 70))).clone().setY(WL + 5 + 2 * k),
    look: (c) => c.S(FUNNELS[0].x - 2, 40, 6) },
  { name: 'Bruch', m: 157, dur: 1.6, fov: 42, sway: 0.15, fixed: true,
    cam: (c, k) => c.at('brk', () => c.S(-12, 0, 0).setY(WL + 9).add(_v.set(0, 0, 88))).clone().add(_v.set(-6 * k, -2 * k, 0)),
    look: (c, k) => c.at('brkL', () => c.S(2, 0, 0).setY(WL + 8)).clone().add(_v.set(0, 6 * k, 0)) },
  { name: 'Heck', m: 158.6, dur: 1.6, fov: 46, sway: 0.15,
    cam: (c, k) => c.W(-40 + 12 * k, WL + 2.2, 150),
    look: (c, k) => c.W(c.s.P0.x, 36 - 12 * k, 0) },
  { name: 'Danach', m: 160.2, dur: 6, fov: 50, sway: 0.35, boat: true,
    cam: (c) => c.boat(1.5),
    look: (c, k) => c.W(0, WL + 2 + 60 * ease(k), 0) },
];

export class Director {
  constructor(sink) {
    this.s = sink;
    this.i = -1;
    this.memo = {};
    this.pos = new THREE.Vector3(); this.look = new THREE.Vector3();
    const s = sink, d = this;
    // helpers for the shots
    this.c = {
      s,
      get B() { return s.berg; },
      W: (x, y, z) => new THREE.Vector3(x, y, z),
      S: (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(s.broken && x < 1 ? s.TB : s.TA),
      berg: (dy) => new THREE.Vector3(s.berg.x, WL + dy, s.berg.z),
      orbit: (a, r, y) => new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r),
      boat: (h) => {
        const S = s.away[0];
        if (!S) return new THREE.Vector3(60, WL + h, 165);
        S.L.boat.updateWorldMatrix(true, false);
        return new THREE.Vector3(-1.2, 0.4 + h, 0).applyMatrix4(S.L.boat.matrix); // (a rowing boat hangs in the world group)
      },
      at: (key, fn) => (d.memo[key] ||= fn()),
    };
  }

  /** the shot for this moment */
  _pick() {
    const s = this.s;
    let i = 0;
    for (let j = 0; j < SHOTS.length; j++) { const h = SHOTS[j]; if (h.t !== undefined ? s.t >= h.t : s.m >= h.m) i = j; }
    return i;
  }

  /** set the camera (ship coordinates) for this frame; returns true on a cut */
  apply(cam, dt) {
    const s = this.s, i = this._pick(), h = SHOTS[i], cut = i !== this.i;
    if (cut) { this.i = i; this.shotT = 0; }
    this.shotT += dt;
    const k = h.t !== undefined ? (s.t - h.t) / h.dur : (s.m - h.m) / h.dur;
    const pos = h.cam(this.c, clamp01(k)), look = h.look(this.c, clamp01(k));
    // a hand on the camera: slow drift, never a jitter
    const T = s.t, a = h.sway ?? 0.05;
    pos.x += Math.sin(T * 0.37 + i) * a; pos.y += Math.sin(T * 0.53 + 2 * i) * a * 0.6; pos.z += Math.sin(T * 0.29 + 3 * i) * a;
    look.x += Math.sin(T * 0.21 + i) * a * 2; look.y += Math.sin(T * 0.31) * a;
    const up = h.up === 'ship' ? _s.set(0, 1, 0).transformDirection(s.TA) : _s.set(0, 1, 0);
    _m.lookAt(pos, look, up);
    _q.setFromRotationMatrix(_m);
    cam.position.copy(pos).applyMatrix4(s.TAi);
    cam.quaternion.copy(s.qAi).multiply(_q);
    // lens: the shot's field of view is meant for a 16:9 picture; narrower screens (phones upright) see as wide
    const asp = Math.max(0.3, cam.aspect || 1.78), fh = 2 * Math.atan(Math.tan((h.fov * Math.PI) / 360) * 1.78);
    const fov = asp >= 1.78 ? h.fov : Math.min(100, (2 * Math.atan(Math.tan(fh / 2) / asp) * 180) / Math.PI);
    if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
    // near plane: as close as anything gets in this shot
    const dist = pos.distanceTo(look);
    s.world.cineNear = h.up === 'ship' ? 0.3 : Math.min(4, Math.max(0.5, dist * 0.012));
    this.pos.copy(pos); this.look.copy(look);
    return cut;
  }
}

// ------------------------------------------------------------------ wreckage

/** a pool of points: spray (white) or sparks (glowing) */
class Particles {
  constructor(n, { color, size, additive, gravity, drag, life }) {
    this.n = n; this.g = gravity; this.drag = drag; this.life = life;
    this.p = new Float32Array(n * 3).fill(-1e4); this.v = new Float32Array(n * 3); this.t = new Float32Array(n);
    this.next = 0;
    const geo = new THREE.BufferGeometry();
    this.attr = new THREE.BufferAttribute(this.p, 3);
    this.attr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.attr);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    this.mat = new THREE.PointsMaterial({ color, size, sizeAttenuation: true, transparent: true, opacity: additive ? 1 : 0.8, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, fog: !additive });
    this.mesh = new THREE.Points(geo, this.mat);
    this.mesh.frustumCulled = false;
    this.alive = 0;
  }

  /** count particles at p (world), speed, upward bias, horizontal direction (optional) */
  emit(p, count, speed, up = 1, dir = null, spread = 1) {
    for (let k = 0; k < count; k++) {
      const i = this.next; this.next = (this.next + 1) % this.n;
      const a = Math.random() * Math.PI * 2, u = Math.random();
      let vx = Math.cos(a) * spread, vz = Math.sin(a) * spread, vy = up * (0.4 + u);
      if (dir) { vx += dir.x; vz += dir.z; vy += dir.y; }
      const sp = speed * (0.3 + Math.random() * 0.9);
      this.p[i * 3] = p.x + (Math.random() - 0.5) * 1.5; this.p[i * 3 + 1] = p.y; this.p[i * 3 + 2] = p.z + (Math.random() - 0.5) * 1.5;
      this.v[i * 3] = vx * sp; this.v[i * 3 + 1] = vy * sp; this.v[i * 3 + 2] = vz * sp;
      this.t[i] = this.life * (0.5 + Math.random() * 0.7);
    }
    this.alive = this.n;
  }

  update(dt) {
    if (!this.alive) return;
    let any = 0;
    const p = this.p, v = this.v, f = Math.exp(-dt * this.drag);
    for (let i = 0; i < this.n; i++) {
      if (this.t[i] <= 0) continue;
      this.t[i] -= dt;
      const j = i * 3;
      v[j] *= f; v[j + 2] *= f; v[j + 1] = v[j + 1] * f - this.g * dt;
      p[j] += v[j] * dt; p[j + 1] += v[j + 1] * dt; p[j + 2] += v[j + 2] * dt;
      if (this.t[i] <= 0 || p[j + 1] < WL - 0.3) { this.t[i] = 0; p[j + 1] = -1e4; } else any = 1;
    }
    this.attr.needsUpdate = true;
    if (!any) this.alive = 0;
  }
}

const STEEL = new THREE.Color(0x2c2b2a), HULL = new THREE.Color(0x151515), WOOD = new THREE.Color(0x7a5a3a), WHITE = new THREE.Color(0xcfcabc);
const ICE = new THREE.Color(0xbcd6ea), RED = new THREE.Color(0x5e2216);

export class Wreckage {
  constructor(sink) {
    this.s = sink;
    const fine = TIER.fine ?? 2;
    this.n = fine >= 2 ? 260 : 130;
    // flying pieces: plates of the hull, timber of the decks, ice (one instanced box)
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75, metalness: 0.25 });
    mat.name = 'debris';
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, this.n);
    this.mesh.name = 'debris';
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.pieces = [];
    for (let i = 0; i < this.n; i++) {
      this.pieces.push({ on: false, p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Vector3(), w: new THREE.Vector3(), sc: new THREE.Vector3(1, 1, 1), float: false, wet: false });
      this.mesh.setMatrixAt(i, _m.makeScale(0, 0, 0));
      this.mesh.setColorAt(i, STEEL);
    }
    this.next = 0;
    this.spray = new Particles(fine >= 2 ? 1400 : 700, { color: 0xc8d6e2, size: 0.55, additive: false, gravity: 9.8, drag: 0.6, life: 2.4 });
    this.sparks = new Particles(fine >= 2 ? 500 : 250, { color: 0xffa040, size: 0.3, additive: true, gravity: 9.8, drag: 0.4, life: 1.4 });
    // the glow of the tearing steel (present from the start: a light added later would recompile every shader)
    this.glow = new THREE.PointLight(0xff8a3a, 0, 140, 1.5);
    this.glowT = 0;
    sink.outside.add(this.mesh, this.spray.mesh, this.sparks.mesh);
    sink.scene.add(this.glow); // (in ship coordinates: it lights the hull in every pass)
    // the torn edges of the two halves (drawn after them, without the cut: renderScene in sinking.js)
    this.fxBow = new THREE.Scene(); this.fxStern = new THREE.Scene();
    const em = new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true, side: THREE.DoubleSide });
    em.name = 'tornEdge';
    this.edgeMat = em;
    this.fxBow.add(new THREE.Mesh(tornEdge(sink.XB, -1, 7), em));
    this.fxStern.add(new THREE.Mesh(tornEdge(sink.XB, 1, 19), em));
    for (const sc of [this.fxBow, this.fxStern]) sc.add(new THREE.HemisphereLight(0x8a9ab8, 0x0a0c10, 1.1));
  }

  /** one piece: p world, v world velocity, kind 'steel' | 'wood' | 'ice' | 'hull', size */
  piece(p, v, kind, size) {
    const P = this.pieces[this.next], i = this.next;
    this.next = (this.next + 1) % this.n;
    P.on = true; P.wet = false; P.p.copy(p); P.v.copy(v);
    P.r.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    P.w.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(8);
    P.float = kind === 'wood' || kind === 'ice';
    if (kind === 'wood') P.sc.set(size * (0.6 + Math.random()), size * 0.12, size * (0.25 + Math.random() * 0.3));
    else if (kind === 'ice') P.sc.set(size, size * (0.5 + Math.random() * 0.5), size * (0.6 + Math.random() * 0.5));
    else P.sc.set(size * (0.7 + Math.random() * 0.8), size * 0.04 + 0.02, size * (0.5 + Math.random() * 0.6));
    this.mesh.setColorAt(i, kind === 'wood' ? WOOD : kind === 'ice' ? ICE : kind === 'hull' ? (Math.random() < 0.3 ? RED : HULL) : Math.random() < 0.2 ? WHITE : STEEL);
    this.mesh.instanceColor.needsUpdate = true;
  }

  // ---------------------------------------------------------------- events

  /** ice breaking off the berg where it grinds along the starboard side (world point of contact) */
  ice(p) {
    if (Math.random() < 0.5) this.piece(_v.set(p.x, p.y + Math.random() * 6, p.z), _s.set(-2 + Math.random() * 3, 1 + Math.random() * 2, 1 + Math.random() * 2.5), 'ice', 0.4 + Math.random() * 0.9);
    this.spray.emit(_v.set(p.x, WL + 0.2, p.z), 3, 5, 1.2, null, 0.6);
  }

  /** the forward funnel hits the sea */
  funnel(p) {
    this.spray.emit(p, 420, 11, 1.6, null, 1.1);
    for (let k = 0; k < 14; k++) this.piece(_v.copy(p).add(_s.set((Math.random() - 0.5) * 8, 2 + Math.random() * 3, (Math.random() - 0.5) * 8)), _s.set((Math.random() - 0.5) * 6, 4 + Math.random() * 6, (Math.random() - 0.5) * 6), 'steel', 0.8 + Math.random() * 1.5);
  }

  /** the hull breaks: plates and timber burst out of the cut, sparks, the sea boils at the waterline */
  breakUp() {
    const s = this.s, n = Math.round(this.n * 0.45);
    for (let k = 0; k < n; k++) {
      const y = Math.random() * (DECK_Y.boat + 1), hw = hullHalfWidth(s.XB, Math.min(y, DECK_Y.C)) || 10, z = (Math.random() * 2 - 1) * hw;
      const p = _v.set(s.XB + (Math.random() - 0.5) * 3, y, z).applyMatrix4(s.TA);
      const out = _s.set((Math.random() - 0.5) * 6, 3 + Math.random() * 9, Math.sign(z || 1) * (2 + Math.random() * 7));
      this.piece(p, out, y > DECK_Y.B ? 'wood' : Math.abs(z) > hw - 1.5 ? 'hull' : 'steel', 0.6 + Math.random() * 2.2);
    }
    this.glow.position.set(s.XB, DECK_Y.D, 0);
    this.glowT = 3;
    for (let k = 0; k < 8; k++) {
      const y = 4 + Math.random() * 22, p = _v.set(s.XB, y, (Math.random() - 0.5) * 22).applyMatrix4(s.TA);
      this.sparks.emit(p, Math.round(this.sparks.n / 10), 9, 1.3, null, 1);
    }
    for (const sd of [-1, 1]) for (let x = -30; x <= 30; x += 3) {
      const p = _v.set(s.XB + x, WL, sd * 14.5).applyMatrix4(s.TA); p.y = WL + 0.2;
      this.spray.emit(p, 18, 9, 1.5, null, 0.9);
    }
  }

  /** the stern falls back onto the sea */
  slam() {
    const s = this.s;
    for (const sd of [-1, 1]) for (let x = -120; x <= -5; x += 4) {
      const p = _v.set(x, WL, sd * (hullHalfWidth(x, WL) + 0.5)).applyMatrix4(s.TB); p.y = WL + 0.2;
      this.spray.emit(p, 14, 12, 1.6, null, 0.8);
    }
  }

  /** deck chairs, gratings, coal, fittings sliding off the rising stern */
  slide() {
    const s = this.s, x = -128 + Math.random() * 115, deck = Math.random() < 0.55 ? DECK_Y.boat : Math.random() < 0.5 ? DECK_Y.A : DECK_Y.B;
    const z = (Math.random() * 2 - 1) * (Math.max(2, hullHalfWidth(x, DECK_Y.C) - 1));
    const p = _v.set(x, deck + 0.6, z).applyMatrix4(s.TB);
    this.piece(p, _s.set((Math.random() - 0.5) * 2, -1 - Math.random() * 2, Math.sign(z) * Math.random() * 2), Math.random() < 0.7 ? 'wood' : 'steel', 0.6 + Math.random() * 1.2);
  }

  // ---------------------------------------------------------------- per frame (real seconds)

  update(dt) {
    const m = this.mesh;
    let dirty = false;
    for (let i = 0; i < this.n; i++) {
      const P = this.pieces[i];
      if (!P.on) continue;
      dirty = true;
      if (P.p.y < WL) {
        if (!P.wet) { P.wet = true; this.spray.emit(_v.set(P.p.x, WL + 0.1, P.p.z), Math.min(40, 6 + Math.round(P.sc.x * 6)), Math.min(8, 2 + Math.abs(P.v.y) * 0.4), 1.4, null, 0.7); }
        const f = Math.exp(-dt * 2.5);
        P.v.multiplyScalar(f);
        P.w.multiplyScalar(f);
        if (P.float) P.v.y += (Math.min(4, (WL - 0.05 - P.p.y) * 14) - 0) * dt;
        else P.v.y = Math.max(P.v.y - 2 * dt, -1.6);
        if (!P.float && P.p.y < WL - 40) { P.on = false; m.setMatrixAt(i, _m.makeScale(0, 0, 0)); continue; }
      } else P.v.y -= 9.8 * dt;
      if (P.float && P.wet && P.p.y > WL - 0.6) { P.v.y *= Math.exp(-dt * 4); P.w.multiplyScalar(Math.exp(-dt * 3)); } // riding the swell
      P.p.addScaledVector(P.v, dt);
      P.r.addScaledVector(P.w, dt);
      _q.setFromEuler(_e.set(P.r.x, P.r.y, P.r.z));
      m.setMatrixAt(i, _m.compose(P.p, _q, P.sc));
    }
    if (dirty) m.instanceMatrix.needsUpdate = true;
    this.spray.update(dt);
    this.sparks.update(dt);
    if (this.glowT > 0) {
      this.glowT = Math.max(0, this.glowT - dt);
      const k = this.glowT / 3;
      this.glow.intensity = 2600 * k * k * (0.7 + 0.3 * Math.random());
    } else this.glow.intensity = 0;
  }
}

/**
 * The torn edge of one half where the hull broke at x: ragged plates of the shell (black topsides, red below the
 * waterline) and of every deck, reaching into the gap (dir -1: the bow's edge reaching aft, +1: the stern's reaching
 * forward), peeled outward and drooping – the plating did not part along a straight line.
 */
function tornEdge(x, dir, seed) {
  let sd = seed * 7919;
  const rnd = () => ((sd = (Math.imul(sd, 1664525) + 1013904223) >>> 0) / 4294967296);
  const pos = [], col = [];
  const tri = (a, b, c, cl) => { pos.push(...a, ...b, ...c); for (let k = 0; k < 3; k++) col.push(cl.r, cl.g, cl.b); };
  const plate = (p0, p1, len0, len1, nrm, droop, cl) => {
    // base p0-p1 on the cut; the far edge ragged: three points at different lengths, bent along nrm
    const mid = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2], lm = (len0 + len1) / 2 * (0.6 + rnd() * 1.2);
    const far = (p, L, b) => [x + dir * L, p[1] + nrm[1] * L * b - droop * L, p[2] + nrm[2] * L * b];
    const b0 = rnd() * 0.5, b1 = rnd() * 0.5, bm = rnd() * 0.6;
    const q0 = far(p0, len0, b0), q1 = far(p1, len1, b1), qm = far(mid, lm, bm);
    const a0 = [x, p0[1], p0[2]], a1 = [x, p1[1], p1[2]];
    tri(a0, a1, qm, cl); tri(a0, qm, q0, cl); tri(a1, q1, qm, cl);
  };
  const hullCol = (y) => (y < 9.2 ? RED : y < DECK_Y.C + 1.5 ? HULL : WHITE);
  // the shell: up both sides from the bilge, and across the bottom
  const top = DECK_Y.A + 0.4;
  for (const side of [-1, 1]) {
    for (let y = 0.6; y < top; y += 0.9 + rnd() * 0.5) {
      const y1 = Math.min(top, y + 0.9 + rnd() * 0.6);
      if (rnd() < 0.12) continue; // a plate gone altogether
      const z0 = side * hullHalfWidth(x, y), z1 = side * hullHalfWidth(x, y1);
      plate([x, y, z0], [x, y1, z1], 0.3 + rnd() * 3.5, 0.3 + rnd() * 3.5, [0, 0, side], 0.05, hullCol((y + y1) / 2));
    }
  }
  const hb = hullHalfWidth(x, 0.6);
  for (let z = -hb; z < hb; z += 1.1 + rnd() * 0.6) {
    const z1 = Math.min(hb, z + 1.2 + rnd() * 0.5);
    if (rnd() < 0.1) continue;
    plate([x, 0.4, z], [x, 0.4, z1], 0.4 + rnd() * 3, 0.4 + rnd() * 3, [0, -1, 0], 0, RED);
  }
  // the decks: plating and planking torn off ragged, hanging down into the gap
  for (const k of ['tank', 'orlop', 'G', 'F', 'E', 'D', 'C', 'B', 'A', 'boat']) {
    const y = DECK_Y[k] - 0.05, hw = (hullHalfWidth(x, Math.min(y, DECK_Y.C)) || 12) - 0.3, cl = k === 'boat' || k === 'A' ? WOOD : STEEL;
    for (let z = -hw; z < hw; z += 0.9 + rnd() * 0.9) {
      const z1 = Math.min(hw, z + 0.9 + rnd() * 0.8);
      if (rnd() < 0.2) continue;
      plate([x, y, z], [x, y, z1], 0.2 + rnd() * 2.6, 0.2 + rnd() * 2.6, [0, 0, 0], 0.15 + rnd() * 0.5, cl);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}
