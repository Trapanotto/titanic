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
const _q2 = new THREE.Quaternion(), _Zax = new THREE.Vector3(0, 0, 1);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _v = new THREE.Vector3();

// ------------------------------------------------------------------ the shots
// t: start in real seconds (approach and collision), m: start in minutes after 23:40; dur in the same unit.
// cam / look: world points (c.S = a point of the ship, moving with it; c.W = a fixed point in the sea).
// up 'ship': the camera stands on deck and tilts with her; otherwise the horizon stays level.
const SHOTS = [
  // ---- the approach (real seconds)
  { name: 'Nacht', t: 0, dur: 6.5, fov: (k) => 50 - 8 * k, sway: 0.3,
    cam: (c, k) => c.S(175 - 50 * ease(k), 44 - 18 * ease(k), 62 - 22 * ease(k)),
    look: (c, k) => c.S(50 - 10 * k, 18, 0) },
  { name: 'Bugwelle', t: 6.5, dur: 3.5, fov: 60, up: 'ship', sway: 0.05, roll: 0.06, cap: '23:39 · «Eisberg genau voraus!»',
    cam: (c, k) => c.S(116 - 4 * k, 17, 13.5),
    look: (c, k) => c.S(136, 15, 0).lerp(c.berg(6), 0.15 + 0.25 * k) },
  // on the open bridge wing: the officer of the watch, the berg ahead
  { name: 'Brücke', t: 10, dur: 3.5, fov: (k) => 38 - 6 * ease(k), up: 'ship', sway: 0.03,
    cam: (c, k) => c.S(66.6 - 0.3 * k, 31.3, 12.3),
    look: (c, k) => c.berg(12 - 3 * k) },
  { name: 'Schrammen', t: 13.5, dur: 6, fov: 58, up: 'ship', sway: 0.04, shake: 0.08,
    cam: (c, k) => c.S(112 - 2 * k, 24.6, 7.4),
    look: (c) => c.touch() },
  { name: 'Riss', t: 19.5, dur: 3.6, fov: 30, sway: 0.06, under: true, glowAt: [88, 6, 8.5],
    cam: (c, k) => c.S(95 - 1.5 * k, 5, 9),
    look: (c, k) => c.S(85 - k, 6, 5.5) },
  // inside: the sea bursting through the plating into boiler room 6, the stokers running for the door
  // the ship stopped, steam roaring from the funnels, seen low from the sea at the bow
  { name: 'Dampf', t: 23.1, dur: 5.9, fov: (k) => 34 - 6 * ease(k), sway: 0.25,
    cam: (c, k) => c.W(185 - 6 * k, WL + 2.5, 62),
    look: (c) => c.S(55, 36, 0) },
  // ---- the night (minutes after 23:40; 2 minutes of the night pass in a second)
  { name: 'Eis an Deck', m: 0.3, dur: 5.7, fov: 50, up: 'ship', sway: 0.04,
    cam: (c, k) => c.S(99.5 - k, 27.8 - 2.8 * ease(k), -5.5),
    look: (c, k) => c.S(85, 20.2, 2 + k) },
  // the Marconi room: the operator at the key, the call for help going out
  { name: 'Funkraum', m: 6, dur: 4.5, fov: 45, up: 'ship', sway: 0.02, inside: true, expo: 0.2, fill: 30, fillCol: 0xffcf8a, fillUp: 0.6, cap: '00:15 · Der Funker sendet CQD', morse: true,
    cam: (c, k) => c.S(50.0 + 0.2 * k, 30.0, 0.4),
    look: (c) => c.S(52, 29.5, 1.5) },
  { name: 'Weite', m: 10.5, dur: 3.5, fov: 36, sway: 0.3,
    cam: (c, k) => c.orbit(0.6 + 0.9 * ease(k), 230 - 40 * k, 55 - 20 * k),
    look: (c) => c.S(10, 16, 0) },
  { name: 'Schwimmwesten', m: 14, dur: 4, fov: 50, up: 'ship', sway: 0.05,
    cam: (c, k) => c.S(14 + 14 * ease(k), 30.0, 11.2),
    look: (c) => c.S(48, 28.9, 8.4) },
  { name: 'Kapelle', m: 18, dur: 7, fov: (k) => 48 - 8 * ease(k), cap: 'Die Bordkapelle spielt Ragtime', up: 'ship', sway: 0.03, band: true,
    cam: (c, k) => c.S(57.5 - 2.5 * ease(k), 31.2, 8.9 + 0.8 * k),
    look: (c) => c.S(47.8, 29.6, 9.3) },
  { name: 'Kran', m: 25, dur: 6, fov: 54, up: 'ship', sway: 0.05,
    cam: (c, k) => c.S(0, 30 + 22 * ease(k), 13 + 4 * ease(k)),
    look: (c, k) => c.S(20 - 10 * k, 28.5, 4) },
  { name: 'Bug vom Meer', m: 31, dur: 6, fov: (k) => 30 - 4 * k, sway: 0.25,
    cam: (c, k) => c.W(185 - 12 * k, WL + 2, 70),
    look: (c) => c.S(95, 14, 0) },
  { name: 'Überflug', m: 37, dur: 7, fov: 46, sway: 0.2, roll: 0.08,
    cam: (c, k) => c.S(-150 + 260 * ease(k), 70 - 10 * k, -40),
    look: (c, k) => c.S(-100 + 220 * ease(k), 20, 0) },
  { name: 'Beladen', m: 44, dur: 5, fov: 54, up: 'ship', sway: 0.05, cap: 'Frauen und Kinder zuerst',
    cam: (c, k) => c.S(25 + 3 * k, 34.2, 5),
    look: (c) => c.S(33.5, 28.4, 12.4) },
  // the family the film follows: at the rail by boat 7, in the light of a deck lamp
  { name: 'Abschied', m: 49, dur: 6, fov: 34, up: 'ship', sway: 0.02, fill: 60, fillCol: 0xffd2a0, fillUp: 0.4,
    cam: (c, k) => c.S(36.6 - 0.3 * k, 29.8, 8.6),
    look: (c) => c.S(34.4, 29.6, 9.75) },
  { name: 'Boot 7', m: 55, dur: 8, fov: 46, sway: 0.12, cap: '00:45 · Das erste Rettungsboot',
    cam: (c, k) => c.S(14 + 8 * k, 15 - k, 44),
    look: (c, k) => c.S(34, 21 - 5 * ease(k), 13) },
  { name: 'Kapelle von hinten', m: 63, dur: 4, fov: 42, up: 'ship', sway: 0.03, band: true,
    cam: (c, k) => c.S(43.6 - 1.2 * k, 30.8, 10.3),
    look: (c) => c.S(53, 29.8, 8.6) },
  // from beside the boat going down: the father at the rail above, waving
  // over the father's shoulder at the rail, down to the boat going away below: the red coat
  // over the father's shoulder at the rail, down to the boat going away below: the red coat
  // from the sea, on a long lens: the father at the rail, waving
  { name: 'Vater', m: 67, dur: 5, fov: 12, sway: 0.05, shake: 0.02, expo: 0.9,
    cam: (c, k) => c.S(31, 14.5, 30),
    look: (c) => c.S(33.5, 30.6, 13.4) },
  { name: 'Rakete', m: 72, dur: 8, fov: 48, up: 'ship', sway: 0.05, cap: 'Notraketen',
    cam: (c, k) => c.S(30.5, 29.9, 11.0),
    look: (c, k) => c.S(70, 60 + 40 * smooth(k * 1.4), 4) },
  { name: 'Im Boot', m: 80, dur: 12, fov: (k) => 40 - 16 * ease(k), sway: 0.4,
    cam: (c) => c.boatIn(1.2, 2),
    look: (c, k) => c.S(10, 22 + 4 * k, 0) },
  { name: 'Panik', m: 98, dur: 7, fov: 52, up: 'ship', sway: 0.06, shake: 0.05,
    cam: (c, k) => c.S(5 - 28 * ease(k), 30.0, 10.5),
    look: (c, k) => c.S(25 - 28 * ease(k), 29.2, 9) },
  { name: 'Mutter', near: 0.05, m: 105, dur: 8, fov: 30, sway: 0.2, fill: 6, fillCol: 0xffb070, fillUp: 0.2, expo: 1.25,
    cam: (c) => c.inBoat(7, -0.9, 1.5, 0.35),
    look: (c) => c.inBoat(7, -2.6, 1.62, 0.1) },
  { name: 'Schlagseite', m: 113, dur: 6, fov: 48, up: 'ship', sway: 0.04, roll: 0.18,
    cam: (c, k) => c.S(20 + 4 * k, 28.9, -11),
    look: (c) => c.S(75, 27.5, -9) },
  // under water at the bow: the lit portholes of the flooded forward decks
  { name: 'Unter dem Bug', m: 119, dur: 6, fov: 56, sway: 0.15, under: true,
    cam: (c, k) => c.S(113 - 4 * k, 12.5 - k, 21),
    look: (c, k) => c.S(99 - 3 * k, 15.5, 9) },
  { name: 'Choral', m: 125, dur: 8, cap: 'Nearer, My God, to Thee', fov: (k) => 44 - 14 * ease(k), up: 'ship', sway: 0.03, band: true,
    cam: (c, k) => c.S(53.6 - 1.4 * k, 29.5, 11.3),
    look: (c) => c.S(47.4, 29.4, 9.0) },
  { name: 'Wasserlinie', m: 133, dur: 6, fov: (k) => 10 - 1.5 * k, sway: 0.1,
    cam: (c, k) => c.W(190 - 5 * k, WL + 1.2, 50),
    look: (c, k) => c.S(68 - 6 * k, 21, 0) },
  { name: 'Brückennock', m: 139, dur: 6, fov: 50, up: 'ship', sway: 0.05, roll: 0.1,
    cam: (c, k) => c.S(71.5, 31.8 + 0.5 * k, 12.4),
    look: (c) => c.S(30, 28, 6) },
  { name: 'Flucht', m: 145, dur: 4, fov: 50, up: 'ship', sway: 0.06, shake: 0.05,
    cam: (c, k) => c.S(-20 - 25 * ease(k), 31.5, 13.5),
    look: (c, k) => c.S(-10 - 25 * ease(k), 29, 6) },
  { name: 'Heck', m: 149, dur: 3, fov: 54, up: 'ship', sway: 0.05, shake: 0.03,
    cam: (c, k) => c.S(-103.5 - 1.5 * k, 24.4, 5.5),
    look: (c) => c.S(-126, 24.2, -1.5) },
  { name: 'Wasser an Deck', m: 152, dur: 2.6, fov: 34, up: 'ship', sway: 0.04, shake: 0.03, cap: '02:15',
    cam: (c, k) => c.S(52 + 2 * k, 28.8, 9.5),
    look: (c) => c.S(78, 27.6, 7) },
  { name: 'Schornstein', m: 154.6, dur: 1.8, fov: 60, up: 'ship', sway: 0.06, shake: 0.06,
    cam: (c, k) => c.S(40 - k, 30.0, 10.4),
    look: (c, k) => c.S(56, 42 - 10 * k, 5) },
  { name: 'Lichter', m: 156.4, dur: 0.6, fov: 34, sway: 0.3,
    cam: (c) => c.boat(1.4, 1),
    look: (c) => c.S(0, 20, 0) },
  { name: 'Bruch', m: 157, dur: 1.6, fov: (k) => 26 - 3 * k, sway: 0.12, fixed: true, shake: 0.12, expo: 1.1,
    cam: (c, k) => c.at('brk', () => c.S(-2, 0, 0).setY(13).add(_v.set(0, 0, 62))).clone(),
    look: (c, k) => c.at('brkL', () => c.S(-14, 21, 0)).clone().add(_v.set(0, 2 * k, 0)) },
  { name: 'Heck steigt', m: 158.6, dur: 0.35, fov: 40, sway: 0.15, expo: 1.5, fill: 30000, fillUp: 40,
    cam: (c, k) => c.W(-60 + 3 * k, 11.5, 70),
    look: (c) => c.S(-110, 40, 0) },
  // close: the stern standing up, people holding on to the rails, falling
  { name: 'Absturz', m: 158.95, dur: 0.6, fov: 30, sway: 0.2, fixed: true, fill: 9000, fillUp: 60, cold: true,
    cam: (c, k) => c.at('fallC', () => c.S(-112, 24, 0).add(_v.set(46, 0, 40)).setY(WL + 1.5)).clone().add(_v.set(0, 1.5 * k, 0)),
    look: (c) => c.S(-112, 27, 0) },
  { name: 'Danach', m: 159.55, dur: 1.0, fov: 40, sway: 0.3,
    cam: (c, k) => c.W(26 - 4 * k, WL + 0.6, 30),
    look: (c) => c.W(c.s.P0.x - 20, WL + 0.5, 0) },
  // the people in the water, the cries; one boat goes back with a lantern
  { name: 'Im Wasser', m: 160.55, dur: 5.45, fov: 40, sway: 0.3, cap: '02:20', fill: 260, fillCol: 0xffc890,
    cam: (c, k) => c.sea().clone().add(_v.set(7 - 2 * k, 0.3, 8 - k)),
    look: (c) => c.sea().clone().add(_v.set(0, 0.3, 0)) },
  { name: 'Zurück', m: 166, dur: 6, fov: 44, sway: 0.3,
    cam: (c, k) => c.sea().clone().add(_v.set(-9 + 2 * k, 1.3, -10)),
    look: (c) => c.backBoat().clone().add(_v.set(0, 1, 0)) },
  // first light
  { name: 'Morgengrauen', near: 0.1, m: 268, dur: 6, fov: 38, sway: 0.3,
    cam: (c) => c.inBoat(7, 0, 0, 0).add(_v.set(3, 0.9, 9)),
    look: (c) => c.inBoat(7, 0, 1.2, 0) },
  // the film ends on her face: the Carpathia behind her
  { name: 'Gerettet', near: 0.05, m: 274, dur: 7, fov: 32, sway: 0.15, fill: 6, fillCol: 0xffc9a0, fillUp: 0.3,
    cam: (c) => c.inBoat(7, 1.8, 1.5, 0.6),
    look: (c) => c.inBoat(7, -2.6, 1.7, 0.1) },
];

export class Director {
  constructor(sink) {
    this.s = sink;
    this.shots = SHOTS; // (for tests: the contact sheets)
    this.i = -1;
    this.memo = {};
    this.pos = new THREE.Vector3(); this.look = new THREE.Vector3();
    const s = sink, d = this;
    let c0 = null;
    // helpers for the shots
    this.c = c0 = {
      s,
      get B() { return s.berg; },
      W: (x, y, z) => new THREE.Vector3(x, y, z),
      S: (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(s.broken && x < 1 ? s.TB : s.TA),
      berg: (dy) => new THREE.Vector3(s.berg.x, WL + dy, s.berg.z),
      orbit: (a, r, y) => new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r),
      boat: (h, j = 0) => {
        const S = s.away[Math.min(j, s.away.length - 1)];
        if (!S) return new THREE.Vector3(60, WL + h, 165);
        S.L.boat.updateWorldMatrix(true, false);
        return new THREE.Vector3(-1.2, 0.4 + h, 0).applyMatrix4(S.L.boat.matrix); // (a rowing boat hangs in the world group)
      },
      at: (key, fn) => (d.memo[key] ||= fn()),
      touch: () => { const T0 = s.touch || { x: 90, y: WL + 2 }; const x = Math.max(-120, Math.min(120, T0.x)); return c0.S(x, T0.y, hullHalfWidth(x, T0.y)); },
      inBoat: (no, x, y, z) => {
        const S = s.away.find((q) => q.no === no) || [...(s.interact.boats.live.values())].find((q) => q.no === no);
        if (!S) return new THREE.Vector3(33, WL + 2, 20);
        S.L.boat.updateWorldMatrix(true, false);
        return new THREE.Vector3(x, y, z).applyMatrix4(S.L.boat.matrixWorld).applyMatrix4(s.TA); // (scene = ship frame -> world)
      },
      boatIn: (h, j = 0) => {
        const S = s.away[Math.min(j, s.away.length - 1)];
        if (!S) return new THREE.Vector3(60, WL + h, 165);
        S.L.boat.updateWorldMatrix(true, false);
        return new THREE.Vector3(-3.2, 0.4 + h, 0.3).applyMatrix4(S.L.boat.matrix); // (low in the stern, heads in front)
      },
      cx: () => s.contactX ?? 140,                                     // where the spur grinds along the hull now
      hu: (x) => hullHalfWidth(Math.max(-130, Math.min(128, x)), WL - 6), // hull half-width 6 m below the water
      sea: () => (d.memo.sea ||= (() => { const v = new THREE.Vector3(); s.crowd?.seaCentre(v); v.y = WL; return v; })()),
      backBoat: () => (s.back ? s.back.S.L.boat.position : d.c.sea()),
      carp: () => s.carpathia.position,
    };
  }

  /** the shot for this moment */
  _pick() {
    const s = this.s;
    let i = 0;
    for (let j = 0; j < SHOTS.length; j++) { const h = SHOTS[j]; if (h.need && !s[h.need]) continue; if (h.t !== undefined ? s.t >= h.t : s.m >= h.m) i = j; }
    return i;
  }

  /** set the camera (ship coordinates) for this frame; returns true on a cut */
  apply(cam, dt) {
    const s = this.s, i = this._pick(), h = SHOTS[i], cut = i !== this.i;
    if (cut) { this.i = i; this.shotT = 0; if (h.cap) s.caption?.(h.cap); if (h.morse) s.sound.morse?.('CQD CQD MGY'); }
    this.shotT += dt;
    const k = h.t !== undefined ? (s.t - h.t) / h.dur : (s.m - h.m) / h.dur;
    const kk = clamp01(k), pos = h.cam(this.c, kk), look = h.look(this.c, kk);
    // a hand-held camera in the rough moments: a quick, small unrest
    if (h.shake) { const T2 = s.t, a2 = h.shake; pos.x += (Math.sin(T2 * 7.3) + Math.sin(T2 * 11.9)) * a2 * 0.5; pos.y += (Math.sin(T2 * 8.7 + 1) + Math.sin(T2 * 13.1)) * a2 * 0.5; look.y += Math.sin(T2 * 6.1 + 2) * a2 * 2; look.x += Math.sin(T2 * 5.3) * a2 * 2; }
    // a hand on the camera: slow drift, never a jitter
    const T = s.t, a = h.sway ?? 0.05;
    pos.x += Math.sin(T * 0.37 + i) * a; pos.y += Math.sin(T * 0.53 + 2 * i) * a * 0.6; pos.z += Math.sin(T * 0.29 + 3 * i) * a;
    look.x += Math.sin(T * 0.21 + i) * a * 2; look.y += Math.sin(T * 0.31) * a;
    const up = h.up === 'ship' ? _s.set(0, 1, 0).transformDirection(s.TA) : _s.set(0, 1, 0);
    _m.lookAt(pos, look, up);
    _q.setFromRotationMatrix(_m);
    if (h.roll) _q.multiply(_q2.setFromAxisAngle(_Zax, h.roll * (0.7 + 0.3 * Math.sin(s.t * 0.4)))); // (a tilted horizon)
    cam.position.copy(pos).applyMatrix4(s.TAi);
    cam.quaternion.copy(s.qAi).multiply(_q);
    // lens: the shot's field of view is meant for a 16:9 picture; narrower screens (phones upright) see as wide
    const f0 = typeof h.fov === 'function' ? h.fov(kk) : h.fov;
    const asp = Math.max(0.3, cam.aspect || 1.78), fh = 2 * Math.atan(Math.tan((f0 * Math.PI) / 360) * 1.78);
    const fov = asp >= 1.78 ? f0 : Math.min(100, (2 * Math.atan(Math.tan(fh / 2) / asp) * 180) / Math.PI);
    if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
    // near plane: as close as anything gets in this shot
    const dist = pos.distanceTo(look);
    s.world.cineNear = h.near ?? (h.up === 'ship' ? 0.3 : Math.min(4, Math.max(0.5, dist * 0.012)));
    this.pos.copy(pos); this.look.copy(look);
    this.under = !!h.under;
    this.shot = h;
    return cut;
  }
}

// ------------------------------------------------------------------ wreckage

let _dot = null;
/** a soft round dot for every particle (square points look like pixels) */
function dot() {
  if (_dot) return _dot;
  const n = 32, d = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const r = Math.hypot(x + 0.5 - n / 2, y + 0.5 - n / 2) / (n / 2), a = Math.max(0, 1 - r) ** 1.6;
    const i = (y * n + x) * 4; d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = Math.round(a * 255);
  }
  _dot = new THREE.DataTexture(d, n, n, THREE.RGBAFormat);
  _dot.needsUpdate = true; _dot.magFilter = _dot.minFilter = THREE.LinearFilter;
  return _dot;
}

/** a pool of points: spray (white) or sparks (glowing) */
class Particles {
  constructor(n, { color, size, additive, gravity, drag, life, rise = false, opacity, floor = WL - 0.3 }) {
    this.floor = floor;
    this.n = n; this.g = gravity; this.drag = drag; this.life = life; this.rise = rise;
    this.p = new Float32Array(n * 3).fill(-1e4); this.v = new Float32Array(n * 3); this.t = new Float32Array(n);
    this.next = 0;
    const geo = new THREE.BufferGeometry();
    this.attr = new THREE.BufferAttribute(this.p, 3);
    this.attr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.attr);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    this.mat = new THREE.PointsMaterial({ color, size, map: dot(), alphaTest: 0.02, sizeAttenuation: true, transparent: true, opacity: opacity ?? (additive ? 1 : 0.8), depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, fog: !additive });
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
      const jit = this.rise ? 0.6 : 1.5;
      this.p[i * 3] = p.x + (Math.random() - 0.5) * jit; this.p[i * 3 + 1] = p.y + (Math.random() - 0.5) * jit; this.p[i * 3 + 2] = p.z + (Math.random() - 0.5) * jit;
      this.v[i * 3] = vx * sp; this.v[i * 3 + 1] = vy * sp; this.v[i * 3 + 2] = vz * sp;
      this.t[i] = this.life * (0.5 + Math.random() * 0.7);
    }
    this.alive = this.n;
  }

  /** count particles flying out from p in every direction (a rocket's stars) */
  burst(p, count, speed) {
    for (let k = 0; k < count; k++) {
      const i = this.next; this.next = (this.next + 1) % this.n;
      const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u), sp = speed * (0.75 + Math.random() * 0.4);
      this.p[i * 3] = p.x; this.p[i * 3 + 1] = p.y; this.p[i * 3 + 2] = p.z;
      this.v[i * 3] = r * Math.cos(a) * sp; this.v[i * 3 + 1] = u * sp + 2; this.v[i * 3 + 2] = r * Math.sin(a) * sp;
      this.t[i] = this.life * (0.6 + Math.random() * 0.5);
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
      if (this.t[i] <= 0 || (this.rise ? p[j + 1] > WL - 0.15 : p[j + 1] < this.floor)) { this.t[i] = 0; p[j + 1] = -1e4; } else any = 1;
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
    const im = new THREE.MeshStandardMaterial({ color: 0xc4e0ee, roughness: 0.3, metalness: 0, flatShading: true, emissive: 0x0a1c26 });
    im.name = 'iceDebris';
    this.iceMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.62, 0), im, this.n);
    this.iceMesh.name = 'iceDebris';
    this.iceMesh.frustumCulled = false;
    this.iceMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.pieces = [];
    for (let i = 0; i < this.n; i++) {
      this.pieces.push({ on: false, p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Vector3(), w: new THREE.Vector3(), sc: new THREE.Vector3(1, 1, 1), float: false, wet: false });
      this.mesh.setMatrixAt(i, _m.makeScale(0, 0, 0));
      this.iceMesh.setMatrixAt(i, _m);
      this.mesh.setColorAt(i, STEEL);
    }
    this.next = 0;
    this.spray = new Particles(fine >= 2 ? 1400 : 700, { color: 0xc8d6e2, size: 0.55, additive: false, gravity: 9.8, drag: 0.6, life: 2.4 });
    this.sparks = new Particles(fine >= 2 ? 500 : 250, { color: 0xffa040, size: 0.3, additive: true, gravity: 9.8, drag: 0.4, life: 1.4 });
    // the glow of the tearing steel (present from the start: a light added later would recompile every shader)
    this.glow = new THREE.PointLight(0xff8a3a, 0, 140, 1.5);
    this.glowT = 0;
    this.bubbles = new Particles(fine >= 2 ? 1600 : 700, { color: 0xd8f0ff, size: 0.16, additive: true, gravity: -2.2, drag: 1.6, life: 4, rise: true, opacity: 0.55 });
    // specks drifting in the water (only seen under water): give the murk depth and the camera motion a reference
    const ns = fine >= 2 ? 900 : 400, sp = new Float32Array(ns * 3);
    for (let i = 0; i < ns * 3; i++) sp[i] = Math.random();
    this.snowBase = sp;
    const sg = new THREE.BufferGeometry();
    this.snowAttr = new THREE.BufferAttribute(new Float32Array(ns * 3), 3);
    sg.setAttribute('position', this.snowAttr);
    sg.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    this.snow = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0x9fc4cc, size: 0.08, map: dot(), sizeAttenuation: true, transparent: true, opacity: 0.7, depthWrite: false }));
    this.snow.frustumCulled = false;
    this.snow.visible = false;
    // distress rockets: the stars of the burst, the trail going up; the flash lights the whole ship for a moment
    this.stars = new Particles(fine >= 2 ? 2400 : 1200, { color: 0xfff2d8, size: 2.6, additive: true, gravity: 3.2, drag: 1.1, life: 4.6 });
    this.trail = new Particles(fine >= 2 ? 900 : 450, { color: 0xffd9a0, size: 0.9, additive: true, gravity: 3, drag: 0.6, life: 1.3 });
    this.flash = new THREE.PointLight(0xfff0dc, 0, 0, 2);
    // the sea bursting in through the plating (inside the hull, under the waterline)
    this.jets = new Particles(fine >= 2 ? 1600 : 800, { color: 0xc8dce4, size: 0.3, additive: false, gravity: 9.8, drag: 0.4, life: 0.9, floor: -50, opacity: 0.75 });
    this.flashT = 0;
    sink.outside.add(this.mesh, this.iceMesh, this.spray.mesh, this.sparks.mesh, this.bubbles.mesh, this.snow, this.stars.mesh, this.trail.mesh);
    sink.scene.add(this.jets.mesh); // (inside the hull: drawn with the ship, the outside world is hidden there)
    sink.scene.add(this.glow, this.flash); // (in ship coordinates: they light the hull in every pass)
    // the surface of the sea seen from below: a rippling mirror, brighter straight up (Snell's window)
    this.surf = underSurface();
    sink.outside.add(this.surf);
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
    P.on = true; P.wet = p.y < WL; P.p.copy(p); P.v.copy(v); P.age = 0; // (born under water: no splash)
    P.r.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    P.w.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(8);
    P.float = kind === 'wood' || kind === 'ice';
    P.ice = kind === 'ice';
    // (a piece lives in one of the two meshes: hide it in the other)
    (P.ice ? this.mesh : this.iceMesh).setMatrixAt(i, _m.makeScale(0, 0, 0));
    if (kind === 'wood') P.sc.set(size * (0.6 + Math.random()), size * 0.12, size * (0.25 + Math.random() * 0.3));
    else if (kind === 'ice') P.sc.set(size * (0.8 + Math.random() * 0.5), size * (0.5 + Math.random() * 0.5), size * (0.6 + Math.random() * 0.6));
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

  /** steel and air where the spur cuts the plating (world point of contact, under water) */
  grind(p) {
    this.bubbles.emit(p, 26, 3.2, 1.2, _s.set(1.2, 0.2, 0.8), 1.1);
    if (Math.random() < 0.35) this.piece(_v.copy(p), _s.set(1 + Math.random() * 3, -0.5 - Math.random(), 1 + Math.random() * 2), 'hull', 0.25 + Math.random() * 0.6);
    if (Math.random() < 0.25) this.piece(_v.copy(p).add(_s.set(0, 0, 1.5)), _s.set(Math.random() * 2, 0.5, 2), 'ice', 0.5 + Math.random() * 0.8);
  }

  /** the sea forcing its way into an opened compartment: streaks of air drawn into the rent */
  inflow(p) {
    this.bubbles.emit(p, 10, 2.6, 0.15, _s.set(0, 0.05, -1.8), 0.5);
  }

  /** whole blocks of ice break off the berg's shoulder and come down beside the ship */
  calve(B, hull) {
    for (let k = 0; k < 7; k++) {
      const p = _v.set(B.x - 10 + Math.random() * 25, WL + 14 + Math.random() * 10, hull + 5 + Math.random() * 8);
      this.piece(p, _s.set(-1 - Math.random() * 2, Math.random() * 2, -2 - Math.random() * 3), 'ice', 1.6 + Math.random() * 2.2);
    }
  }

  /** the specks: wrapped round the camera (world point) */
  drift(cam, on, t) {
    this.snow.visible = on;
    if (!on) return;
    const b = this.snowBase, a = this.snowAttr.array, S = 28;
    for (let i = 0; i < a.length; i += 3) {
      const wrap = (u, c, off) => { const v = u * S + off; return c + ((((v - c) % S) + S * 1.5) % S) - S / 2; };
      a[i] = wrap(b[i], cam.x, Math.sin(t * 0.1 + i) * 0.3);
      a[i + 1] = Math.min(WL - 0.3, wrap(b[i + 1], cam.y, t * 0.05));
      a[i + 2] = wrap(b[i + 2], cam.z, 0);
    }
    this.snowAttr.needsUpdate = true;
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
    this.glowT = 6;
    for (let k = 0; k < 14; k++) {
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
      // what floats drifts away astern in a minute or so (the ship had way on her still): gone from the pictures
      P.age += dt;
      if (P.float && P.age > 45) { P.on = false; (P.ice ? this.iceMesh : m).setMatrixAt(i, _m.makeScale(0, 0, 0)); continue; }
      if (P.p.y < WL) {
        if (!P.wet) { P.wet = true; this.spray.emit(_v.set(P.p.x, WL + 0.1, P.p.z), Math.min(40, 6 + Math.round(P.sc.x * 6)), Math.min(8, 2 + Math.abs(P.v.y) * 0.4), 1.4, null, 0.7); }
        const f = Math.exp(-dt * 2.5);
        P.v.multiplyScalar(f);
        P.w.multiplyScalar(f);
        if (P.float) P.v.y += (Math.min(4, (WL - 0.05 - P.p.y) * 14) - 0) * dt;
        else P.v.y = Math.max(P.v.y - 2 * dt, -1.6);
        if (!P.float && P.p.y < WL - 40) { P.on = false; (P.ice ? this.iceMesh : m).setMatrixAt(i, _m.makeScale(0, 0, 0)); continue; }
      } else P.v.y -= 9.8 * dt;
      if (P.float && P.wet && P.p.y > WL - 0.6) { P.v.y *= Math.exp(-dt * 4); P.w.multiplyScalar(Math.exp(-dt * 3)); } // riding the swell
      P.p.addScaledVector(P.v, dt);
      P.r.addScaledVector(P.w, dt);
      _q.setFromEuler(_e.set(P.r.x, P.r.y, P.r.z));
      (P.ice ? this.iceMesh : m).setMatrixAt(i, _m.compose(P.p, _q, P.sc));
    }
    if (dirty) { m.instanceMatrix.needsUpdate = true; this.iceMesh.instanceMatrix.needsUpdate = true; }
    this.spray.update(dt);
    this.sparks.update(dt);
    this.bubbles.update(dt);
    this.stars.update(dt);
    this.trail.update(dt);
    this.jets.update(dt);
    if (this.flashT > 0) {
      this.flashT = Math.max(0, this.flashT - dt);
      const k = this.flashT / 3.2;
      this.flash.intensity = 90000 * k * k * (0.85 + 0.15 * Math.random());
    } else this.flash.intensity = 0;
    if (this.glowT > 0) {
      this.glowT = Math.max(0, this.glowT - dt);
      const k = this.glowT / 6;
      this.glow.intensity = 7000 * k * k * (0.7 + 0.3 * Math.random());
    } else if (!this.fill) this.glow.intensity = 0;
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

// ------------------------------------------------------------------ the damage the ice did

// the openings along the starboard bow (ship x of their forward end, length m, height of the middle above the keel):
// not one long gash but a row of sprung seams and torn plates over about 90 m, 4 to 7 m below the waterline
const RENTS = [[124, 2.6, 5.6], [119.5, 4.5, 4.8], [112, 2.2, 5.4], [106.5, 7.5, 4.6], [96.5, 3.8, 5.2], [90, 6, 4.4], [81.5, 2.8, 5.0], [76, 5.5, 4.2], [67.5, 4, 4.8], [61, 3, 4.5]];

export class HullDamage {
  constructor(sink) {
    this.s = sink;
    this.g = new THREE.Group();
    this.g.name = 'hullDamage';
    sink.shipLive.add(this.g);
    const hole = new THREE.MeshBasicMaterial({ color: 0x020304, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    hole.name = 'rent';
    const plate = new THREE.MeshStandardMaterial({ color: 0x6a2a1c, roughness: 0.6, metalness: 0.35, side: THREE.DoubleSide, flatShading: true });
    plate.name = 'rentPlate';
    const bright = new THREE.MeshStandardMaterial({ color: 0x8c8780, roughness: 0.35, metalness: 0.8, side: THREE.DoubleSide, flatShading: true }); // torn edges: bare steel
    bright.name = 'rentSteel';
    // the torn plates: crumpled, curled outward, ragged at the free edge (hinged at the lower edge)
    const plateGeos = [0, 1, 2, 3].map((v) => crumpled(v));
    let sd = 4711;
    const rnd = () => ((sd = (Math.imul(sd, 1664525) + 1013904223) >>> 0) / 4294967296);
    this.rents = RENTS.map(([x0, len, yc]) => {
      const grp = new THREE.Group();
      grp.visible = false;
      // the black gap: a ragged strip following the curve of the plating
      const pos = [], n = Math.max(3, Math.round(len / 0.35));
      const hgt = [];
      for (let i = 0; i <= n; i++) { const u = i / n; hgt.push((0.15 + 0.85 * Math.sin(u * Math.PI) ** 0.6) * (0.6 + 0.8 * rnd())); }
      for (let i = 0; i < n; i++) {
        const xa = x0 - (len * i) / n, xb = x0 - (len * (i + 1)) / n;
        const pt = (x, y) => [x, y, hullHalfWidth(x, y) + 0.04];
        const a0 = pt(xa, yc - hgt[i]), a1 = pt(xa, yc + hgt[i]), b0 = pt(xb, yc - hgt[i + 1]), b1 = pt(xb, yc + hgt[i + 1]);
        pos.push(...a0, ...b0, ...b1, ...a0, ...b1, ...a1);
      }
      const hg = new THREE.BufferGeometry();
      hg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      const holeMesh = new THREE.Mesh(hg, hole);
      grp.add(holeMesh);
      // the plates on either side, torn and bent outward by the ice (hinged at the edge of the gap)
      const flaps = [];
      for (let i = 0; i < n; i += 1 + Math.floor(rnd() * 2)) {
        const x = x0 - (len * (i + 0.5)) / n, up = rnd() < 0.55 ? 1 : -1, y = yc + up * hgt[i];
        const m = new THREE.Mesh(plateGeos[Math.floor(rnd() * 4)], rnd() < 0.25 ? bright : plate);
        const w = 0.7 + rnd() * 1.1, h = 0.6 + rnd() * 1.1;
        m.scale.set(w, h, 1);
        m.position.set(x, y, hullHalfWidth(x, y) + 0.05);
        m.rotation.set(0, Math.atan2(hullHalfWidth(x - 1, y) - hullHalfWidth(x + 1, y), 2) * 0.5, up > 0 ? 0 : Math.PI); // (along the flare of the bow)
        m.userData = { up, a: 0.35 + rnd() * 0.9, tw: (rnd() - 0.5) * 0.5 };
        grp.add(m);
        flaps.push(m);
      }
      this.g.add(grp);
      return { x0, len, yc, grp, holeMesh, flaps, k: 0, open: false, t: 0 };
    });
  }

  /** contactX: ship x where the spur cuts now; returns the rents that opened this frame */
  update(dt, contactX) {
    const opened = [];
    for (const R of this.rents) {
      if (!R.open && contactX <= R.x0 + 0.5) { R.open = true; R.grp.visible = true; opened.push(R); }
      if (!R.open || R.k >= 1) continue;
      // the rent runs aft with the ice; the plates spring out
      R.t += dt;
      R.k = Math.min(1, R.t / Math.max(0.3, R.len / 11));
      const e = 1 - (1 - R.k) ** 3;
      R.holeMesh.scale.set(1, 1, 1);
      R.holeMesh.position.x = 0;
      R.grp.scale.x = 1;
      for (const m of R.flaps) {
        const u = m.userData, on = (R.x0 - m.position.x) / R.len <= R.k + 0.05;
        m.visible = on;
        // rotate about the hinge: outward (+z) and twisted
        const a = u.a * e;
        m.rotation.x = u.up > 0 ? a : -a;
        m.rotation.z = (u.up > 0 ? 0 : Math.PI) + u.tw * e;
      }
    }
    return opened;
  }

  /** a point in the mouth of an open rent (ship coordinates), for the inflow */
  mouth(R, out) {
    const x = R.x0 - Math.random() * R.len * R.k;
    return out.set(x, R.yc + (Math.random() - 0.5) * 0.6, hullHalfWidth(x, R.yc) + 0.3);
  }
}

/** a torn plate (1 x 1, hinged at y 0): crumpled, curling outward towards its free edge, the edge itself ragged */
function crumpled(seed) {
  let sd = 977 + seed * 131;
  const rnd = () => ((sd = (Math.imul(sd, 1664525) + 1013904223) >>> 0) / 4294967296);
  const g = new THREE.PlaneGeometry(1, 1, 6, 6).translate(0, 0.5, 0), P = g.attributes.position;
  const ph = [rnd() * 6, rnd() * 6, rnd() * 6];
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i);
    let z = 0.32 * y * y + 0.05 * Math.sin(x * 9 + ph[0]) * y + 0.06 * Math.sin(y * 11 + x * 4 + ph[1]) * y + (rnd() - 0.5) * 0.05 * y;
    let yy = y;
    if (y > 0.99) yy = y - rnd() * 0.45;                       // ragged free edge
    if (Math.abs(x) > 0.49 && y > 0.3) yy -= rnd() * 0.15;
    z += 0.08 * Math.sin(x * 3.1 + ph[2]) * y;
    P.setXYZ(i, x * (1 - 0.15 * y * rnd()), yy, z);
  }
  g.deleteAttribute('uv');
  g.computeVertexNormals();
  return g;
}

/** the underside of the sea surface: rippling, dark, brighter in the circle straight above the camera */
function underSurface() {
  const m = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uCam: { value: new THREE.Vector3() }, uCol: { value: new THREE.Color(0x0a3442) }, uLit: { value: 0 } },
    side: THREE.DoubleSide, depthWrite: false, transparent: true,
    vertexShader: `varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `
      uniform float uT, uLit; uniform vec3 uCam, uCol; varying vec3 vW;
      float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      void main() {
        vec3 d = vW - uCam; float r = length(d.xz), dep = max(0.5, uCam.y < vW.y ? vW.y - uCam.y : 0.5);
        float ang = atan(r, dep);                                        // angle off the vertical
        float win = 1.0 - smoothstep(0.72, 0.86, ang);                   // Snell's window (48.6 deg)
        vec2 p = vW.xz * 0.35;
        float rip = n(p + vec2(uT * 0.25, uT * 0.18)) * 0.6 + n(p * 2.3 - vec2(uT * 0.4, -uT * 0.2)) * 0.4;
        float caus = pow(1.0 - abs(rip * 2.0 - 1.0), 6.0);
        vec3 col = uCol * (0.8 + 0.5 * rip) + vec3(0.02, 0.045, 0.05) * win * (0.5 + 0.8 * caus) + vec3(0.3, 0.25, 0.18) * uLit * win * caus;
        float far = 1.0 - exp(-length(d) * 0.026);                       // into the murk
        gl_FragColor = vec4(mix(col, uCol, far), 1.0);
      }`,
  });
  m.name = 'underSurface';
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(400, 400, 1, 1).rotateX(-Math.PI / 2), m);
  mesh.name = 'underSurface';
  mesh.frustumCulled = false;
  mesh.visible = false;
  mesh.renderOrder = 1;
  return mesh;
}
