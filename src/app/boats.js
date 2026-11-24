// Lifeboats that can be worked with E: swing the boat out on its Welin davits, lower it to the water, haul it up
// and stow it again. The stations are baked into the exterior like everything else; a station that is being worked
// is switched off there (its clusters: c.off) and replaced by a working copy (exterior/fit-boats.js liveStation),
// which is removed again when the boat is back in its chocks.
import * as THREE from 'three';
import { mats } from '../core/materials.js';
import { DECK_Y, SHIP } from '../core/constants.js';
import { liveStation, DAVIT_PIVOT } from '../exterior/fit-boats.js';

const SWING = 1.04;                                   // rad the arms turn outboard
const Y_SWING = 1.15;                                 // keel above the deck while the boat passes over the rail
const Y_WATER = SHIP.waterline - 0.35 - DECK_Y.boat;  // keel in the water, relative to the boat deck
const MAX_LIVE = 3;
const _up = new THREE.Vector3(0, 1, 0), _a = new THREE.Vector3(), _b = new THREE.Vector3();

export class Boats {
  constructor(world, scene, sound, toast) {
    this.world = world; this.sound = sound; this.toast = toast;
    this.root = new THREE.Group();
    this.root.name = 'boatsLive';
    scene.add(this.root);
    this.live = new Map(); // use -> state
    this.rope = new THREE.CylinderGeometry(1, 1, 1, 5);
    this.time = 0;
    this.rider = null; // { u, S, player, back: {x, z} } while the visitor is in a boat
    this.test = typeof location !== 'undefined' && /[?&]selftest=/.test(location.search);
    try { this.saved = this.test ? {} : JSON.parse(localStorage.getItem('titanic.boote') || '{}') || {}; } catch { this.saved = {}; }
  }

  _save() {
    if (this.test) return;
    const st = { ...this.saved };
    for (const [u, S] of this.live) if (!S.q.length && (S.phase === 'down' || (S.phase === 'out' && !S.L.out))) st[u.id] = S.phase;
    try { localStorage.setItem('titanic.boote', JSON.stringify(st)); } catch { /* private mode */ }
  }

  /** two places to stand at a station: aft the davits are worked, forward one gets into the boat hanging outboard */
  items(u) {
    // as it was left on the last visit
    const was = this.saved[u.id];
    if (was === 'out' || was === 'down') {
      delete this.saved[u.id];
      const S = this._start(u);
      if (S) { S.phase = was; S.a = 1; S.y = was === 'down' ? Y_WATER : S.L.out ? S.L.by0 : Y_SWING; this._pose(S); }
    }
    const s = u.spec, inb = 2.6;
    const label = () => {
      const S = this.live.get(u), ph = S ? S.phase : s.out ? 'out' : 'stowed';
      if (S?.q.length) return 'Rettungsboot … (in Bewegung)';
      return ph === 'stowed' ? 'Rettungsboot ausschwenken' : ph === 'out' ? 'Rettungsboot fieren' : 'Rettungsboot aufholen';
    };
    const canBoard = () => { const S = this.live.get(u); return (S ? S.phase : s.out ? 'out' : 'stowed') === 'out' && !S?.q.length; };
    const fwd = { x: u.x + 2.4, y: u.y, z: u.z - s.side * inb, r: 1.9 };
    return [
      { x: u.x - 2.4, y: u.y, z: u.z - s.side * inb, r: 1.9, label, act: () => this.work(u) },
      { ...fwd, label: () => (canBoard() ? 'Ins Boot einsteigen' : label()), act: () => (canBoard() ? this.board(u, fwd) : this.work(u)) },
    ];
  }

  /** get into the boat hanging outboard; from then on E works the falls, F gets out */
  board(u, back) {
    const S = this.live.get(u) || this._start(u);
    if (!S || !this._player) return;
    this.rider = { u, S, player: this._player, back };
    const q = this._player.pos; this._player.setFlyPose(q.x, q.y + 1.7, q.z); // carried by the boat from the next frame on (walking again = F = getting out)
    this.toast('Im Boot. E: fieren · F: aussteigen', 3.5);
  }
  riderLabel() {
    const S = this.rider?.S;
    if (!S) return '';
    if (S.q.length) return 'Im Rettungsboot … (in Bewegung)';
    return S.phase === 'down' ? 'Boot aufholen lassen' : 'Fieren lassen (F: aussteigen)';
  }
  riderAct() { if (this.rider) this.work(this.rider.u); }
  _stepOff() {
    const R = this.rider;
    if (!R) return;
    this.rider = null;
    const s = R.u.spec;
    if (R.S.y > 0) R.player.teleport({ deck: 'boat', x: R.back.x, y: DECK_Y.boat, z: R.back.z, yaw: s.side > 0 ? -Math.PI / 2 : Math.PI / 2 });
    else { const p = R.player.pos; R.player.setFlyPose(p.x, p.y + 1.7, p.z); this.toast('Aus dem Boot – Flugmodus (F zum Landen an Deck)', 3); } // let go lower down: flying on from there
  }

  _start(u) {
    if (this.live.size >= MAX_LIVE) { this.toast('Erst ein anderes Boot wieder einholen.', 2.5); return null; }
    const L = liveStation({ ...u.spec, covered: false }), S = { u, L, phase: u.spec.out ? 'out' : 'stowed', y: L.by0, a: 0, q: [], t: 0, falls: [], screws: [] };
    const line = (r) => { const m = new THREE.Mesh(this.rope, mats.rope); m.scale.set(r, 1, r); L.g.add(m); return m; };
    for (let i = 0; i < 2; i++) { S.falls.push(line(0.02)); if (!L.out) { const m = new THREE.Mesh(this.rope, mats.iron); m.scale.set(0.03, 1, 0.03); L.g.add(m); S.screws.push(m); } }
    S.clusters = this.world.extAll.filter((c) => c.ec === u.id);
    for (const c of S.clusters) c.off = true;
    this.root.add(L.g);
    this.live.set(u, S);
    this._pose(S);
    return S;
  }

  /** E at a station: the next step of the drill */
  work(u) {
    let S = this.live.get(u);
    if (S?.q.length) return;
    if (!S && !(S = this._start(u))) return;
    const step = (v, to, dur) => S.q.push({ v, from: null, to, dur, t: 0 });
    if (S.phase === 'stowed') { step('y', Y_SWING, 2.5); step('a', 1, 6); S.next = 'out'; this.sound.davit(8.5); this.toast('Die Davits schwenken das Boot über die Reling.', 3); }
    else if (S.phase === 'out') { step('y', Y_WATER, 18); S.next = 'down'; this.sound.davit(18); this.toast('Fieren! Das Boot geht zu Wasser.', 3); }
    else {
      step('y', S.L.out ? S.L.by0 : Y_SWING, 18);
      S.q.push({ fn: () => { if (this.rider?.S === S) { this._stepOff(); this.toast('Wieder an Deck.', 2); } } }); // level with the deck: out of the boat
      if (!S.L.out) { step('a', 0, 6); step('y', S.L.by0, 2.5); }
      S.next = 'home'; this.sound.davit(S.L.out ? 18 : 26.5); this.toast('Das Boot wird aufgeholt.', 3);
    }
  }

  /** put a station back as it was built, at once (tests) */
  reset(u) {
    const S = this.live.get(u);
    if (!S) return;
    if (this.rider?.S === S) { S.y = 1; this._stepOff(); }
    for (const c of S.clusters) c.off = false;
    this.root.remove(S.L.g);
    this.live.delete(u);
  }

  _stick(m, ax, ay, az, bx, by, bz) {
    _a.set(ax, ay, az); _b.set(bx, by, bz);
    const len = Math.max(0.001, _a.distanceTo(_b));
    m.position.copy(_a).add(_b).multiplyScalar(0.5);
    m.scale.y = len;
    m.quaternion.setFromUnitVectors(_up, _b.sub(_a).divideScalar(len));
  }

  _pose(S) {
    const L = S.L, th = L.out ? 0 : S.a * SWING, c = Math.cos(th), s = Math.sin(th), [py, pz] = DAVIT_PIVOT;
    const rot = (y, z) => [py + (y - py) * c - (z - pz) * s, pz + (y - py) * s + (z - pz) * c]; // a point of the arm, turned
    const afloat = S.phase === 'down' && !S.q.length;
    const bob = afloat ? Math.sin(this.time * 1.3 + S.u.id) * 0.07 : 0;
    const head = rot(L.head[1], L.head[2]), zb = L.out ? L.bz0 : head[1] + 0.14;
    L.boat.position.set(0, S.y + bob, zb);
    L.boat.rotation.x = afloat ? Math.sin(this.time * 0.9 + S.u.id * 2) * 0.03 : 0;
    const blk = rot(L.uby, L.head[2]), nut = rot(L.sp1[1], L.sp1[2]);
    L.arms.forEach((arm, i) => {
      const sg = i ? 1 : -1;
      arm.rotation.x = th;
      this._stick(S.falls[i], sg * L.xd, blk[0], blk[1], sg * L.xh, S.y + bob + L.hookY, zb);
      if (S.screws[i]) this._stick(S.screws[i], sg * L.xd, L.sp0[1], L.sp0[2], sg * L.xd, nut[0], nut[1]);
    });
  }

  update(dt, player) {
    this.time += dt;
    this._player = player;
    if (this.rider && player.mode !== 'fly') this._stepOff(); // F: out of the boat
    this.world.streamHold = !!this.rider;
    for (const [u, S] of this.live) {
      const st = S.q[0];
      if (st) this.world.shadowBusy = 1; // its shadow on the ship's side follows (environment: sun shadow refresh)
      if (st?.fn) { S.q.shift(); st.fn(); }
      else if (st) {
        if (st.from === null) st.from = S[st.v];
        st.t = Math.min(1, st.t + dt / st.dur);
        const e = st.t * st.t * (3 - 2 * st.t);
        S[st.v] = st.from + (st.to - st.from) * e;
        if (st.t >= 1) {
          S.q.shift();
          if (!S.q.length) {
            S.phase = S.next === 'home' ? (S.L.out ? 'out' : 'stowed') : S.next;
            if (S.phase === 'down') { this.sound.splash(); this.toast('Das Boot schwimmt.', 2.5); }
            this._saveSoon = true;
            if (S.next === 'home') { for (const c of S.clusters) c.off = false; this.root.remove(S.L.g); this.live.delete(u); continue; } // back in the baked ship
          }
        }
      }
      this._pose(S);
    }
    if (this._saveSoon) { this._saveSoon = false; this._save(); }
    const R = this.rider;
    if (R) {
      // standing on the bottom boards amidships, free to look around
      R.S.L.g.updateMatrixWorld(true);
      _a.set(0.5, 1.82, 0).applyMatrix4(R.S.L.boat.matrixWorld);
      R.player.setFlyPose(_a.x, _a.y, _a.z);
    }
  }
}
