// Machinery that can be worked with E: the fire doors of the boilers (open, fire the furnace, shut), the main
// switch on the switchboard, a wireless message of one's own, the order to close every watertight door, the windlass.
// The boiler fronts are baked instances; an opened door and the fire behind it are drawn on top (as in fixtures.js).
import * as THREE from 'three';
import { mats } from '../core/materials.js';
import { DECK_Y } from '../core/constants.js';

const FY = 1.45, FZ = [-1.4, 0, 1.4]; // decks/tank-boilers.js: furnace centre above the plates, positions across a boiler end
const MAX_OPEN = 6;

export class Technik {
  constructor(world, scene, sound, toast, addItem, toggleDoor) {
    this.world = world; this.sound = sound; this.toast = toast; this.addItem = addItem; this.toggleDoor = toggleDoor;
    this.root = new THREE.Group();
    this.root.name = 'technik';
    scene.add(this.root);
    this.furn = new Map();   // use -> { st, g, door, glow, t, lamp }
    this.coal = [];          // lumps on their way into a furnace
    this.count = { furnace: 0 };
    this.fireM = new THREE.MeshBasicMaterial({ color: 0xff7a22 });
    this.box = new THREE.BoxGeometry(1, 1, 1);
    this.lump = new THREE.DodecahedronGeometry(0.05, 0);
    this.time = 0;
    this._static();
  }

  _static() {
    const YB = DECK_Y.boat;
    // Marconi room: a message of the visitor's own
    this.addItem({ x: 52.6, y: YB, z: -0.9, r: 0.8, label: () => 'Eigenen Funkspruch senden', act: () => {
      let txt = '';
      try { txt = (window.prompt('Funkspruch (Buchstaben und Ziffern, höchstens 40 Zeichen):', 'MGY GUTE REISE') || '').toUpperCase().replace(/[^A-Z0-9 ]/g, '').slice(0, 40).trim(); } catch { /* no dialogs here */ }
      if (!txt) return;
      this.sound.morse(txt);
      this.toast(`„${txt}“ geht über die Antenne hinaus.`, 5);
    } });
    // bridge: the order for every deck (the doors above the tank top were closed by hand)
    this.addItem({ x: 66.6, y: YB, z: -4.0, r: 0.7, label: () => (this._allShut ? 'Befehl: alle Schotttüren öffnen' : 'Befehl: alle Schotttüren schließen'), act: () => {
      this._allShut = !this._allShut;
      let n = 0;
      for (const d of this.world.doors.values()) if (d.kind === 'wt' && d.open === this._allShut) { this.toggleDoor(d); n++; }
      this.sound.alarm();
      this.toast(this._allShut ? `${n} wasserdichte Türen auf allen Decks werden geschlossen – oben von Hand durch die Stewards.` : `${n} wasserdichte Türen werden wieder geöffnet.`, 5);
    } });
    // dynamo room: the main switch
    this.addItem({ x: -60, y: DECK_Y.tank, z: 11, r: 1.8, label: () => (this._dark ? 'Hauptschalter: Licht einschalten' : 'Hauptschalter: Licht ausschalten'), act: () => {
      this._dark = !this._dark;
      for (const L of this.world.lamps) if ((L.color ?? 0xffd9a0) !== 0xff7a30) L.off = this._dark; // the furnaces keep glowing
      this.sound.click(); this.sound.thud();
      this.toast(this._dark ? 'Die Dynamos sind abgeschaltet: Im ganzen Schiff gehen die Lampen aus.' : 'Das Licht brennt wieder.', 4);
    } });
    // forecastle: the windlass
    this.addItem({ x: 110.5, y: DECK_Y.B, z: 0, r: 2.2, low: true, label: () => 'Ankerspill laufen lassen', act: () => { this.sound.chain(6); this.toast('Die Ankerkette rasselt durch die Klüse.', 3.5); } });
  }

  item(u) {
    if (u.kind === 'furnace') {
      this.count.furnace++;
      const dir = u.rot ? -1 : 1;
      return {
        x: u.bx + dir * 1.35, y: u.y, z: u.z, r: 0.95,
        label: () => { const st = this._state(u); return st === 0 ? 'Feuertür öffnen' : st === 1 ? 'Kohle nachlegen' : 'Feuertür schließen'; },
        act: () => this.workFurnace(u),
      };
    }
    return null;
  }

  _state(u) { const F = this.furn.get(u); return F ? F.st : u.open0 ? 1 : 0; }

  workFurnace(u) {
    let F = this.furn.get(u);
    if (!F) {
      F = { st: u.open0 ? 1 : 0, t: 0, flare: 0 };
      if (!u.open0) {
        const g = new THREE.Group(), zf = FZ[u.fi];
        g.position.set(u.bx, u.y, u.bz); g.rotation.y = u.rot || 0;
        // the fire seen through the door opening (in front of the baked, closed door) and the door swung open
        const glow = new THREE.Mesh(this.box, this.fireM); glow.scale.set(0.004, 0.3, 0.38); glow.position.set(0.19, FY + 0.1, zf);
        const dark = new THREE.Mesh(this.box, mats.iron); dark.scale.set(0.006, 0.4, 0.48); dark.position.set(0.185, FY + 0.1, zf);
        const door = new THREE.Group(); door.position.set(0.19, FY + 0.1, zf - 0.24);
        // the leaf as cast (decks/tank-boilers.js fireDoor): frame ribs, air slide with its slots, knob, peep-hole cover, latch
        const part = (mat, sx, sy, sz, x, y, z) => { const m = new THREE.Mesh(this.box, mat); m.scale.set(sx, sy, sz); m.position.set(x, y, z); door.add(m); return m; };
        part(mats.iron, 0.05, 0.38, 0.46, 0.025, 0, 0.25);
        for (const [sy, sz, y, z] of [[0.04, 0.46, 0.17, 0.25], [0.04, 0.46, -0.17, 0.25], [0.3, 0.04, 0, 0.04], [0.3, 0.04, 0, 0.46]]) part(mats.iron, 0.025, sy, sz, 0.062, y, z);
        part(mats.steelDark, 0.012, 0.1, 0.3, 0.056, 0.06, 0.25);
        for (let k = 0; k < 6; k++) part(this.fireM, 0.004, 0.06, 0.016, 0.063, 0.06, 0.13 + k * 0.048);
        part(mats.brass, 0.04, 0.028, 0.028, 0.08, 0.06, 0.4);
        part(mats.iron, 0.01, 0.07, 0.07, 0.056, -0.08, 0.25);
        for (const y of [-0.12, 0.12]) part(mats.iron, 0.015, 0.05, 0.22, 0.062, y, 0.1);
        part(mats.iron, 0.03, 0.03, 0.16, 0.09, -0.01, 0.47);
        part(mats.brass, 0.036, 0.036, 0.08, 0.11, -0.01, 0.55);
        g.add(dark, glow, door);
        this.root.add(g);
        F.g = g; F.door = door;
        const dir = u.rot ? -1 : 1;
        F.lamp = { x: u.bx + dir * 1.1, y: u.y + 1.3, z: u.z, color: 0xff7a30, intensity: 1.1, off: true };
        this.world.lamps.push(F.lamp);
      }
      this.furn.set(u, F);
    }
    if (F.st === 0) {
      F.st = 1; if (F.lamp) F.lamp.off = false;
      this.sound.clang();
      const open = [...this.furn.values()].filter((x) => x.g && x.st > 0);
      if (open.length > MAX_OPEN) { open[0].st = 0; open[0].lamp.off = true; }
    } else if (F.st === 1) {
      F.st = u.open0 ? 1 : 2; F.flare = 1;
      this.sound.shovel();
      const dir = u.rot ? -1 : 1, zs = u.z;
      for (let k = 0; k < 6; k++) {
        const m = new THREE.Mesh(this.lump, mats.coal || mats.iron);
        this.root.add(m);
        this.coal.push({ m, t: -k * 0.05, a: [u.bx + dir * 1.25, u.y + 0.95, zs + (Math.random() - 0.5) * 0.3], b: [u.bx + dir * 0.02, u.y + FY + 0.03, zs + (Math.random() - 0.5) * 0.25] });
      }
      this.toast('Eine Schaufel Kohle aufs Feuer – es lodert auf.', 2.5);
    } else {
      F.st = 0; if (F.lamp) F.lamp.off = true;
      this.sound.clang();
    }
  }

  update(dt) {
    this.time += dt;
    let flare = 0;
    for (const F of this.furn.values()) {
      if (F.flare > 0) F.flare = Math.max(0, F.flare - dt / 3);
      flare = Math.max(flare, F.flare);
      if (F.lamp) F.lamp.intensity = 1.1 + F.flare * 1.6;
      if (!F.g) continue;
      const target = F.st > 0 ? 1 : 0;
      if (F.t !== target) { F.t = target > F.t ? Math.min(1, F.t + dt * 3) : Math.max(0, F.t - dt * 3); F.door.rotation.y = 1.85 * F.t; }
      F.g.visible = F.t > 0;
    }
    const k = 0.75 + 0.18 * Math.sin(this.time * 11) + 0.1 * Math.sin(this.time * 23.7) + flare * 0.9;
    this.fireM.color.setRGB(Math.min(1.6, k * 1.25), 0.42 * k, 0.1 * k);
    for (let i = this.coal.length - 1; i >= 0; i--) {
      const c = this.coal[i];
      c.t += dt / 0.45;
      const t = Math.max(0, Math.min(1, c.t));
      c.m.visible = c.t > 0;
      c.m.position.set(c.a[0] + (c.b[0] - c.a[0]) * t, c.a[1] + (c.b[1] - c.a[1]) * t + 0.5 * 4 * t * (1 - t), c.a[2] + (c.b[2] - c.a[2]) * t);
      c.m.rotation.x += dt * 9; c.m.rotation.z += dt * 7;
      if (c.t >= 1) { this.root.remove(c.m); this.coal.splice(i, 1); }
    }
  }
}
