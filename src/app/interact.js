// Things that can be operated with E: the engine-order telegraphs and the wheel on the bridge, the ship's bell, the
// whistle pull and the Morse key in the Marconi room. The moving parts on the bridge (telegraph handles and pointers,
// the wheel, the whistle pull) are separate meshes owned by this file – their props are baked without them.
import * as THREE from 'three';
import { DECK_Y } from '../core/constants.js';
import { mats } from '../core/materials.js';
import { ENGINE, ORDERS, stepEngine } from '../core/engine.js';

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
    add(52.6, YB, 0.75, 1.6, () => 'Morsetaste: CQD senden', () => {
      this.sound.morse('CQD CQD DE MGY');
      this.toast('– · – ·   – – · –   – · ·   „CQD CQD DE MGY“: Notruf der Titanic (Rufzeichen MGY)', 6);
    });
  }

  label(i) { return this.items[i]?.label() || ''; }

  run(i = this.nearest) {
    const it = this.items[i];
    if (!it) return false;
    it.act();
    return true;
  }

  /** @param feet player's feet position */
  update(dt, feet, mode) {
    stepEngine(dt);
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
    this._timer = 0.2;
    let best = -1, bd = Infinity;
    if (mode === 'walk') for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i];
      if (Math.abs(it.y - feet.y) > 1.2) continue;
      const dx = it.x - feet.x, dz = it.z - feet.z, d = dx * dx + dz * dz;
      if (d < it.r * it.r && d < bd) { bd = d; best = i; }
    }
    this.nearest = best;
  }
}
