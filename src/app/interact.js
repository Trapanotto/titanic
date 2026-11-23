// Things that can be operated with E: the engine-order telegraphs and the wheel on the bridge, the ship's bell, the
// whistle pull and the Morse key in the Marconi room. The moving parts on the bridge (telegraph handles and pointers,
// the wheel, the whistle pull) are separate meshes owned by this file – their props are baked without them.
import * as THREE from 'three';
import { DECK_Y } from '../core/constants.js';
import { mats } from '../core/materials.js';
import { ENGINE, ORDERS, stepEngine } from '../core/engine.js';
import { leafMatrix } from '../core/doors.js';

const LIFT_DECKS = ['E', 'D', 'C', 'B', 'A'];
const LIFT_NAMES = { A: 'A-Deck', B: 'B-Deck', C: 'C-Deck', D: 'D-Deck', E: 'E-Deck' };
const DOOR_CELL = 4;
const _m = new THREE.Matrix4();

const YB = DECK_Y.boat;
const TELE = { x: 72.25, z: 1.5, y: YB + 0.045, yc: 1.1, R: 0.21 };   // boat-hero.js: main telegraphs at z = ±1.5
const WHEEL = { x: 70.0, z: 0, y: YB + 0.045, wx: 0.16, wy: 0.98 };   // props-tech.js: shipsWheel
const PULL = { x: 72.62, z: -5.0, y: YB + 1.32 };
const RUDDER = ['mittschiffs', 'hart Steuerbord', 'mittschiffs', 'hart Backbord'];
const RUDDER_TURNS = [0, -2.5, 0, 2.5];

/** angle of a dial sector (clockwise from the top, as on the dial texture in boat-util.js: 8 sectors over 306°) */
const dialAngle = (i) => -Math.PI * 0.85 + ((i + 0.5) / 8) * Math.PI * 1.7;

export class Interact {
  constructor(world, scene, sound, toast) {
    this.world = world;
    this.sound = sound;
    this.toast = toast;
    this.items = [];
    this.nearest = -1;
    this._timer = 0;
    this._levers = [];
    this._rudder = 0;
    this._wheelAng = 0;
    this._pull = 0;
    this._swing = new Set();   // doors in motion
    this._doorGrid = null;
    this.door = null;          // door in reach
    this._liftDir = 1;
    this._ride = null;
    this.root = new THREE.Group();
    this.root.name = 'bridgeLive';
    this.root.userData.noMerge = true;
    scene.add(this.root);
    this._buildBridge();
    this._register();
  }

  _mesh(geo, mat, parent, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.userData.noMerge = true;
    parent.add(m);
    return m;
  }

  _buildBridge() {
    const brass = mats.brass, wood = mats.woodDark, iron = mats.iron;
    // --- telegraphs: per dial face a handle (through the centre, grip beyond the rim) and a pointer on the dial
    const arm = new THREE.BoxGeometry(0.03, TELE.R + 0.16, 0.018); arm.translate(0, (TELE.R + 0.16) / 2, 0);
    const grip = new THREE.CylinderGeometry(0.022, 0.028, 0.11, 10); grip.translate(0, TELE.R + 0.2, 0);
    const ptr = new THREE.BoxGeometry(0.012, TELE.R * 0.8, 0.004); ptr.translate(0, TELE.R * 0.4, 0);
    for (const s of [-1, 1]) {
      const g = new THREE.Group();
      g.position.set(TELE.x, TELE.y, s * TELE.z);
      g.rotation.y = Math.PI; // the telegraphs face aft
      this.root.add(g);
      for (const f of [-1, 1]) {
        const lever = new THREE.Group();
        lever.position.set(0, TELE.yc, f * 0.125);
        this._mesh(arm, brass, lever); this._mesh(grip, wood, lever);
        const p = this._mesh(ptr, iron, g, 0, TELE.yc, f * 0.097);
        g.add(lever);
        this._levers.push({ lever, p, f, a: 0 });
      }
    }
    // --- the wheel on the bridge: rim, brass band, eight turned spokes with handles
    const w = (this.wheel = new THREE.Group());
    w.position.set(WHEEL.x + WHEEL.wx, WHEEL.y + WHEEL.wy, WHEEL.z);
    this.root.add(w);
    const rim = new THREE.TorusGeometry(0.42, 0.026, 7, 40); rim.rotateY(Math.PI / 2);
    const band = new THREE.TorusGeometry(0.4, 0.008, 4, 40); band.rotateY(Math.PI / 2); band.translate(0.02, 0, 0);
    this._mesh(rim, wood, w); this._mesh(band, brass, w);
    const spoke = new THREE.LatheGeometry([[0.02, 0], [0.014, 0.1], [0.022, 0.2], [0.015, 0.3], [0.02, 0.4], [0.014, 0.42], [0.03, 0.47], [0.032, 0.53], [0.02, 0.6], [0.001, 0.62]].map(([r, y]) => new THREE.Vector2(r, y)), 8);
    for (let i = 0; i < 8; i++) this._mesh(spoke, wood, w).rotation.x = (i / 8) * Math.PI * 2;
    // --- whistle pull on the bridge front
    const pull = (this.pull = new THREE.Group());
    pull.position.set(PULL.x, PULL.y, PULL.z);
    this.root.add(pull);
    const bar = new THREE.CylinderGeometry(0.012, 0.012, 0.3, 8); bar.translate(0, -0.15, 0);
    const knob = new THREE.SphereGeometry(0.035, 10, 8); knob.translate(0, -0.32, 0);
    this._mesh(bar, brass, pull); this._mesh(knob, wood, pull);
    const plate = new THREE.BoxGeometry(0.03, 0.1, 0.1);
    this._mesh(plate, brass, this.root, PULL.x + 0.02, PULL.y + 0.03, PULL.z);
    pull.rotation.z = 0.5;
    this._setLevers(true);
  }

  _setLevers(now) {
    const a = dialAngle(ORDERS[ENGINE.order].dial);
    // the two handles are one piece on a common shaft; each pointer follows its own dial
    for (const L of this._levers) { L.target = -a; if (now) { L.a = L.target; L.lever.rotation.z = L.a; L.p.rotation.z = L.f * L.a; } }
  }

  _register() {
    const add = (x, y, z, r, label, act) => this.items.push({ x, y, z, r, label, act });
    const next = () => ORDERS[(ENGINE.order + 1) % ORDERS.length];
    for (const s of [-1, 1]) add(TELE.x, YB, s * TELE.z, 1.5, () => 'Maschinentelegraf: ' + next().name, () => {
      ENGINE.order = (ENGINE.order + 1) % ORDERS.length;
      this._setLevers(false);
      this.sound.telegraphBell();
      this.toast('Maschinentelegraf: ' + ORDERS[ENGINE.order].name, 3);
    });
    add(WHEEL.x - 0.5, YB, WHEEL.z, 1.3, () => 'Steuerrad: ' + RUDDER[(this._rudder + 1) % 4], () => {
      this._rudder = (this._rudder + 1) % 4;
      this.sound.wheelClicks(12);
      this.toast('Ruder ' + RUDDER[this._rudder], 2.5);
    });
    add(PULL.x - 0.5, YB, PULL.z, 1.4, () => 'Dampfpfeife ziehen', () => { this._pull = 1; this.sound.whistle(); });
    add(66.6, YB, 6.4, 1.6, () => 'Glocke läuten', () => this.sound.bell(2));
    // the same order from the manoeuvring platform between the engines
    add(-31.5, DECK_Y.tank, 1.0, 1.6, () => 'Maschinentelegraf: ' + next().name, () => this.items[0].act());
    // telephones on the wheelhouse wall
    for (const z of [-3.4, 3.4]) add(66.6, YB, z, 1.1, () => 'Telefon zum Krähennest abnehmen', () => {
      this.sound.bell(3);
      this.toast('„Eisberg direkt voraus!“ – Meldung des Ausgucks Frederick Fleet an die Brücke, 14. April 1912, 23:40 Uhr', 7);
    });
    // first-class lifts: gates on the aft side of the three shafts, E to A deck
    for (const deck of LIFT_DECKS) for (const z of [-1.6, 0, 1.6]) {
      add(44.9, DECK_Y[deck], z, 0.85, () => 'Aufzug zum ' + LIFT_NAMES[this._liftTarget(deck)], () => this._rideLift(deck, z, this._player));
    }
    add(52.6, YB, 0.75, 1.6, () => 'Morsetaste: CQD senden', () => {
      this.sound.morse('CQD CQD DE MGY');
      this.toast('– · – ·   – – · –   – · ·   „CQD CQD DE MGY“: Notruf der Titanic (Rufzeichen MGY)', 6);
    });
  }

  // ------------------------------------------------------------------ doors

  /** door in reach: close by, and looked at unless the visitor stands right in front of it */
  _findDoor(p) {
    const doors = this.world.doors;
    if (!doors?.size) return null;
    if (!this._doorGrid || this._doorGrid.n !== doors.size) {
      const g = (this._doorGrid = new Map());
      g.n = doors.size;
      for (const d of doors.values()) { const k = Math.floor(d.x / DOOR_CELL) * 4096 + Math.floor(d.z / DOOR_CELL); let a = g.get(k); if (!a) g.set(k, (a = [])); a.push(d); }
    }
    const fx = Math.cos(p.yaw), fz = -Math.sin(p.yaw), x = p.pos.x, z = p.pos.z, y = p.pos.y;
    let best = null, bd = 1.7 * 1.7;
    for (let cx = Math.floor((x - 1.7) / DOOR_CELL); cx <= Math.floor((x + 1.7) / DOOR_CELL); cx++) for (let cz = Math.floor((z - 1.7) / DOOR_CELL); cz <= Math.floor((z + 1.7) / DOOR_CELL); cz++) {
      const a = this._doorGrid.get(cx * 4096 + cz);
      if (!a) continue;
      for (const d of a) {
        if (Math.abs(d.y - y) > 1) continue;
        const dx = d.x - x, dz = d.z - z, d2 = dx * dx + dz * dz;
        if (d2 >= bd) continue;
        const dist = Math.sqrt(d2);
        if (dist > 0.75 && (dx * fx + dz * fz) / dist < 0.72) continue;
        bd = d2; best = d;
      }
    }
    return best;
  }

  _inDoorway(d, pos) {
    const b = d.col, r = 0.34;
    return pos.x > b.x0 - r && pos.x < b.x1 + r && pos.z > b.z0 - r && pos.z < b.z1 + r && Math.abs(pos.y - d.y) < 1;
  }

  toggleDoor(d, pos) {
    if (d.open && this._inDoorway(d, pos)) { this.toast('Du stehst in der Tür', 1.5); return; }
    d.open = !d.open;
    if (d.open) d.col.y1 = -1e9; // passable as soon as it starts to swing
    // the leaves are instances in the meshes of their zone
    d._ims = d.leaves.map((L, li) => {
      const zg = this.world.zone(d.deck, L.X ? L.e : L.c), tag = d.key + '#' + li, out = [];
      for (const c of zg.children) { const i = c.userData.leafOf ? c.userData.leafOf.indexOf(tag) : -1; if (i >= 0) out.push([c, i]); }
      return out;
    });
    this._swing.add(d);
    this.sound.door(d.open);
  }

  _swingDoors(dt, pos) {
    for (const d of this._swing) {
      const to = d.open ? 1 : 0, step = dt / 0.55;
      d.t = to > d.t ? Math.min(1, d.t + step) : Math.max(0, d.t - step);
      const e = d.t * d.t * (3 - 2 * d.t);
      d.leaves.forEach((L, li) => {
        leafMatrix(L, d.y, e, _m);
        for (const [im, i] of d._ims[li]) { im.setMatrixAt(i, _m); im.instanceMatrix.needsUpdate = true; }
      });
      if (d.t !== to) continue;
      if (!d.open) {
        if (this._inDoorway(d, pos)) { d.open = true; continue; } // somebody stepped in: swing open again
        d.col.y1 = d.col.top;
      }
      d._ims = null;
      this._swing.delete(d);
    }
  }

  // ------------------------------------------------------------------ lifts (1st class, E to A deck)

  _liftTarget(deck) {
    const i = LIFT_DECKS.indexOf(deck);
    if (i + this._liftDir < 0 || i + this._liftDir >= LIFT_DECKS.length) this._liftDir = -this._liftDir;
    return LIFT_DECKS[i + this._liftDir];
  }

  _rideLift(from, z, player) {
    if (this._ride) return;
    const to = this._liftTarget(from);
    let veil = this._veil;
    if (!veil) {
      veil = this._veil = document.createElement('div');
      veil.className = 'lift-veil';
      (document.getElementById('ui') || document.body).append(veil);
    }
    veil.textContent = `Aufzug · ${LIFT_NAMES[from]} → ${LIFT_NAMES[to]}`;
    veil.classList.add('show');
    this.sound.lift(2.4);
    this._ride = { t: 0, to, z, player, moved: false };
  }

  _stepRide(dt) {
    const r = this._ride;
    if (!r) return;
    r.t += dt;
    if (!r.moved && r.t > 1.3) {
      r.moved = true;
      r.player.teleport({ deck: r.to, x: 44.7, y: DECK_Y[r.to], z: r.z, yaw: Math.PI });
    }
    if (r.t > 2.6) { this._veil.classList.remove('show'); this._ride = null; this.toast(LIFT_NAMES[r.to], 2); }
  }

  label(i) { return i === 'door' ? (this.door?.open ? 'Tür schließen' : 'Tür öffnen') : this.items[i]?.label() || ''; }

  run(i = this.nearest) {
    if (i === 'door') { if (this.door) this.toggleDoor(this.door, this._pos); return true; }
    const it = this.items[i];
    if (!it) return false;
    it.act();
    return true;
  }

  update(dt, player) {
    const feet = player.pos, mode = player.mode;
    this._pos = feet; this._player = player;
    stepEngine(dt);
    if (this._swing.size) this._swingDoors(dt, feet);
    this._stepRide(dt);
    // moving parts (only near the bridge)
    const nearBridge = Math.abs(feet.x - 70) < 60 && feet.y > DECK_Y.A - 2;
    this.root.visible = nearBridge;
    if (nearBridge) {
      const k = 1 - Math.exp(-dt * 6);
      for (const L of this._levers) if (L.a !== L.target) {
        L.a += (L.target - L.a) * k;
        if (Math.abs(L.target - L.a) < 0.002) L.a = L.target;
        L.lever.rotation.z = L.a; L.p.rotation.z = L.f * L.a;
      }
      const wt = RUDDER_TURNS[this._rudder] * Math.PI * 2;
      if (this._wheelAng !== wt) {
        const d = wt - this._wheelAng, stepA = Math.sign(d) * Math.min(Math.abs(d), dt * 7);
        this._wheelAng += stepA;
        this.wheel.rotation.x = this._wheelAng;
      }
      if (this._pull > 0) { this._pull = Math.max(0, this._pull - dt / 3.2); this.pull.rotation.z = 0.5 + (this._pull > 0 ? 0.55 : 0); }
    }
    // which thing is in reach
    this._timer -= dt;
    if (this._timer > 0) return;
    this._timer = 0.15;
    let best = -1, bd = Infinity;
    if (mode === 'walk') for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i];
      if (Math.abs(it.y - feet.y) > 1.2) continue;
      const dx = it.x - feet.x, dz = it.z - feet.z, d = dx * dx + dz * dz;
      if (d < it.r * it.r && d < bd) { bd = d; best = i; }
    }
    this.door = best < 0 && mode === 'walk' && !this._ride ? this._findDoor(player) : null;
    this.nearest = best >= 0 ? best : this.door ? 'door' : -1;
  }
}
