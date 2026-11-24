// Furniture that can be operated with E: wardrobe doors, the taps of wash basins and sinks, bath tubs and the flush of
// the water closets. The furniture itself is baked into the deck geometry and cannot move; what moves or appears
// (door leaves swung open with the inside of the wardrobe, the jet of water, the water in the tub) is drawn by this
// file on top of it, only for the few things in use. The fixtures are registered by the bake (world.addUse).
import * as THREE from 'three';
import { mats } from '../core/materials.js';
import { DECK_Y, DECK_ORDER, deckAboveY } from '../core/constants.js';
import { matOf } from '../interior/batch.js';

const MAX_OPEN = 8;      // wardrobes standing open at once (the oldest closes itself)
const MAX_RUN = 6;       // taps running at once
const FAR = 30;          // overlays farther away than this are not drawn

/** tip of the spout in the prop's own coordinates and the height where the jet ends: [x, y, z, yEnd] */
const TAPS = {
  washbasinMarble: (o) => [-0.07, 0.94, o.double ? -0.38 : 0, 0.77],
  basinSmall: () => [-0.06, 0.9, 0.1, 0.8],
  washstand: () => [-0.01, 0.875, 0, 0.73],
  sink: (o) => [-0.155, 0.945, -(o.w ?? 1.2) * 0.18 + 0.12, 0.66],
  bcVanity: (o) => [-0.08, 0.962, -(o.w ?? 1.4) * 0.25, 0.89],
};
/** the drawer that opens: [width, height, x of the front, y of its centre, z] in the prop's own coordinates */
const DRAWERS = {
  chest: () => [0.82, 0.255, 0.243, 0.675, 0],
  dressingTable: () => [0.36, 0.1, 0.235, 0.66, 0],
  writingDesk: () => [0.5, 0.09, 0.285, 0.66, 0],
};
const CABIN = new Set(['cabin', 'suite']);
const floorOf = (y) => { let f = -Infinity; for (const d of DECK_ORDER) if (DECK_Y[d] <= y + 0.05 && DECK_Y[d] > f) f = DECK_Y[d]; return f; };
const TUB = { lo: 0.2, hi: 0.5, spout: [0, 0.66, -0.68], rate: 0.042 };

export class Fixtures {
  constructor(world, scene, sound, toast, addItem) {
    this.world = world; this.sound = sound; this.toast = toast; this.addItem = addItem;
    this.root = new THREE.Group();
    this.root.name = 'fixtures';
    scene.add(this.root);
    this.open = [];          // wardrobes: { u, g, L, R, t, target }
    this.taps = [];          // { u, mesh }
    this.tubs = new Map();   // u -> { g, water, jet, level, target }
    this.drawers = [];       // { u, g, t, target }
    this.ports = [];         // { u, g, leaf, t, target }
    this.switches = [];      // light switches and bell pushes of the cabins: { x, y, z, nx, nz, bell }
    this.dark = new Set();   // rooms with the light switched off
    this.count = { wardrobe: 0, tap: 0, tub: 0, wc: 0, drawer: 0, porthole: 0, light: 0, bell: 0 };
    const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...o });
    this.M = {
      dark: std(0x17100b), coats: [std(0x1c2433), std(0x4a4640), std(0x4b4030), std(0x2a1f1a)],
      jet: new THREE.MeshBasicMaterial({ color: 0xcfe6f2, transparent: true, opacity: 0.55, depthWrite: false }),
      glass: new THREE.MeshStandardMaterial({ color: 0xbcd4dc, roughness: 0.05, transparent: true, opacity: 0.28 }), linen: std(0xe9e4d6),
      water: new THREE.MeshStandardMaterial({ color: 0x9fc4cf, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.72 }),
    };
    this.G = { jet: new THREE.CylinderGeometry(0.005, 0.007, 1, 6).translate(0, -0.5, 0), box: new THREE.BoxGeometry(1, 1, 1), knob: new THREE.SphereGeometry(0.014, 8, 6) };
  }

  /** the thing to operate for a registered fixture (app/interact.js), or null */
  item(u) {
    const o = u.o || {}, fp = u.fp || { w: 1, d: 0.5, h: 1 }, c = Math.cos(u.rot || 0), s = Math.sin(u.rot || 0);
    const at = (lx, lz) => ({ x: u.x + c * lx + s * lz, y: u.y, z: u.z - s * lx + c * lz });
    if (u.kind === 'wardrobe') {
      if (o.open) return null; // modelled standing ajar already
      this.count.wardrobe++;
      return { ...at(fp.d / 2 + 0.3, 0), r: 0.85, label: () => (this._wardrobe(u)?.target ? 'Schrank schließen' : 'Schrank öffnen'), act: () => this.toggleWardrobe(u) };
    }
    if (TAPS[u.kind]) {
      this.count.tap++;
      const tp = TAPS[u.kind](o);
      return { ...at(fp.d / 2 + 0.3, tp[2]), r: 0.8, label: () => (this.taps.some((t) => t.u === u) ? 'Wasserhahn zudrehen' : 'Wasserhahn aufdrehen'), act: () => this.toggleTap(u) };
    }
    if (u.kind === 'bathtub') {
      this.count.tub++;
      return { ...at(0, 0), r: 1.25, label: () => (this.tubs.get(u)?.target > TUB.lo ? 'Badewasser ablassen' : 'Badewasser einlassen'), act: () => this.toggleTub(u) };
    }
    if (DRAWERS[u.kind]) {
      this.count.drawer++;
      return { ...at(fp.d / 2 + 0.35, DRAWERS[u.kind](o)[4]), r: 0.8, label: () => (this.drawers.find((d) => d.u === u)?.target ? 'Schublade schließen' : 'Schublade öffnen'), act: () => this.toggleDrawer(u) };
    }
    if (u.kind === 'porthole') {
      this.count.porthole++;
      return { ...at(0.55, 0), y: floorOf(u.y), r: 0.95, label: () => (this.ports.find((d) => d.u === u)?.target ? 'Bullauge schließen' : 'Bullauge öffnen'), act: () => this.togglePort(u) };
    }
    if (u.kind === 'wc') {
      this.count.wc++;
      return { ...at(fp.d / 2 + 0.2, 0), r: 0.75, label: () => 'Spülung ziehen', act: () => { this.sound.flush(); } };
    }
    return null;
  }

  _group(u) {
    const g = new THREE.Group();
    g.position.set(u.x, u.y, u.z);
    g.rotation.y = u.rot || 0;
    this.root.add(g);
    return g;
  }
  _box(parent, mat, sx, sy, sz, x, y, z) {
    const m = new THREE.Mesh(this.G.box, mat);
    m.scale.set(sx, sy, sz); m.position.set(x, y, z);
    parent.add(m);
    return m;
  }

  // ------------------------------------------------------------------ wardrobes

  _wardrobe(u) { return this.open.find((w) => w.u === u); }

  toggleWardrobe(u) {
    let W = this._wardrobe(u);
    if (!W) {
      const o = u.o || {}, w = o.w ?? 1.1, fx = 0.267, dw = w / 2 - 0.025, dh = 1.68, y0 = 0.14;
      const wood = matOf(o.mat, mats.mahogany), g = this._group(u);
      // the inside: dark back, shelf, brass rail and a few clothes (they also hide the knobs of the baked doors)
      this._box(g, this.M.dark, 0.004, dh - 0.02, w - 0.07, fx + 0.018, y0 + dh / 2, 0);
      this._box(g, mats.woodDark, 0.008, 0.022, w - 0.07, fx + 0.022, 1.66, 0);
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, w - 0.1, 6).rotateX(Math.PI / 2), mats.brass);
      rail.position.set(fx + 0.034, 1.58, 0); g.add(rail);
      [-0.3, -0.1, 0.02, 0.18, 0.33].forEach((k, i) => this._box(g, this.M.coats[i % 4], 0.045, 0.78 + (i % 2) * 0.12, 0.15, fx + 0.042, 1.56 - (0.78 + (i % 2) * 0.12) / 2, k * (w / 1.1)));
      const leaf = (s) => {
        const p = new THREE.Group();
        p.position.set(fx + 0.014, 0, s * (w / 2 - 0.012));
        this._box(p, wood, 0.022, dh, dw, 0, y0 + dh / 2, -s * dw / 2);
        const k = new THREE.Mesh(this.G.knob, mats.brass); k.position.set(0.02, y0 + dh * 0.52, -s * (dw - 0.05)); p.add(k);
        g.add(p);
        return p;
      };
      W = { u, g, L: leaf(-1), R: leaf(1), t: 0, target: 0 };
      this.open.push(W);
      if (this.open.filter((x) => x.target).length >= MAX_OPEN) this.open.find((x) => x.target).target = 0;
    }
    W.target = W.target ? 0 : 1;
    this.sound.cupboard(W.target === 1);
  }

  // ------------------------------------------------------------------ drawers, portholes

  toggleDrawer(u) {
    let D = this.drawers.find((d) => d.u === u);
    if (!D) {
      const [w, h, x, y, z] = DRAWERS[u.kind](u.o || {}), wood = matOf((u.o || {}).mat, mats.mahogany), g = this._group(u), dr = new THREE.Group(), dep = 0.26;
      dr.position.set(x + 0.03, y, z);
      // the drawer itself (it covers the baked front and its handles): body, front, linen inside, knobs
      this._box(dr, wood, dep, h - 0.03, w - 0.03, -dep / 2, -0.008, 0);
      this._box(dr, wood, 0.02, h - 0.008, w - 0.008, 0.01, 0, 0);
      this._box(dr, this.M.dark, dep - 0.03, 0.004, w - 0.06, -dep / 2 - 0.004, h / 2 - 0.021, 0);
      this._box(dr, this.M.linen, dep - 0.09, 0.012, w * 0.42, -dep / 2 - 0.004, h / 2 - 0.024, -w * 0.2);
      this._box(dr, this.M.coats[0], dep - 0.11, 0.012, w * 0.3, -dep / 2 - 0.004, h / 2 - 0.024, w * 0.22);
      for (const s of w > 0.45 ? [-1, 1] : [0]) { const k = new THREE.Mesh(this.G.knob, mats.brass); k.position.set(0.03, 0, s * w * 0.27); dr.add(k); }
      g.add(dr);
      D = { u, g, dr, x0: x + 0.03, t: 0, target: 0 };
      this.drawers.push(D);
      if (this.drawers.filter((d) => d.target).length >= MAX_OPEN) this.drawers.find((d) => d.target).target = 0;
    }
    D.target = D.target ? 0 : 1;
    this.sound.drawer(D.target === 1);
  }

  togglePort(u) {
    let P = this.ports.find((d) => d.u === u);
    if (!P) {
      const r = (u.o || {}).r ?? 0.2, g = this._group(u), leaf = new THREE.Group(), off = r + 0.055;
      leaf.position.set(0.045, 0, off);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r + 0.018, 0.017, 8, 20).rotateY(Math.PI / 2), mats.brass);
      const pane = new THREE.Mesh(new THREE.CircleGeometry(r + 0.01, 20).rotateY(Math.PI / 2), this.M.glass);
      pane.material.side = THREE.DoubleSide;
      ring.position.z = pane.position.z = -off;
      leaf.add(ring, pane);
      g.add(leaf);
      P = { u, g, leaf, t: 0, target: 0 };
      this.ports.push(P);
      if (this.ports.filter((d) => d.target).length >= MAX_OPEN) this.ports.find((d) => d.target).target = 0;
    }
    P.target = P.target ? 0 : 1;
    this.sound.cupboard(P.target === 1);
    if (P.target) this.toast('Frische Seeluft …', 2);
  }

  // ------------------------------------------------------------------ cabins: light switch and bell push by the door

  /** once the rooms and doors are known: a switch beside the first door of every cabin, a bell push on the other side */
  _cabins() {
    const W = this.world, done = new Set();
    for (const d of W.doors.values()) {
      if (d.kind || !d.leaves?.length) continue;
      const X = d.leaves[0].X, T2 = d.leaves[0].T2 ?? 0.05;
      for (const n of [-1, 1]) {
        const px = d.x + (X ? 0 : n * 0.5), pz = d.z + (X ? n * 0.5 : 0);
        const room = W.rooms.find((r) => r.deck === d.deck && CABIN.has(r.type) && px > r.x0 && px < r.x1 && pz > r.z0 && pz < r.z1);
        if (!room || done.has(room)) continue;
        done.add(room);
        const z0 = Math.max(room.z0, -14.2), z1 = Math.min(room.z1, 14.2);
        const inside = (a) => (X ? a > room.x0 + 0.2 && a < room.x1 - 0.2 : a > z0 + 0.2 && a < z1 - 0.2);
        const along = X ? d.x : d.z, mid = X ? (room.x0 + room.x1) / 2 : (z0 + z1) / 2, side = mid >= along ? 1 : -1;
        const put = (s, bell, more = 0) => {
          const a = along + s * (d.w / 2 + 0.28 + more);
          if (!inside(a)) return false;
          const wall = (X ? d.z : d.x) + n * (T2 + 0.012);
          const sw = { x: X ? a : wall, y: d.y, z: X ? wall : a, nx: X ? 0 : n, nz: X ? n : 0, bell, room };
          this.switches.push(sw);
          const it = { x: sw.x + sw.nx * 0.35, y: d.y, z: sw.z + sw.nz * 0.35, r: 0.42 };
          if (bell) { this.count.bell++; it.label = () => 'Nach dem Steward klingeln'; it.act = () => { this.sound.bellPush(); this.toast('Es klingelt in der Pantry – der Steward ist unterwegs.', 3); }; }
          else { this.count.light++; it.label = () => (this.dark.has(room) ? 'Licht einschalten' : 'Licht ausschalten'); it.act = () => this.toggleLight(room); }
          this.addItem(it);
          return true;
        };
        const lit = put(side, false) ? side : put(-side, false) ? -side : 0;
        // the bell push on the other side of the door, or a little farther along the same wall
        if (lit && (room.cls === 'first' || room.cls === 'second')) { if (!put(-lit, true)) put(lit, true, 0.5); }
      }
    }
    // the plates: brass with one push (those near the visitor are drawn)
    this.plates = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.085, 0.006), mats.brass, 24);
    this.pushes = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.011, 0.011, 0.012, 10).rotateX(Math.PI / 2), mats.porcelain || mats.paintWhite, 24);
    for (const m of [this.plates, this.pushes]) { m.count = 0; m.frustumCulled = false; this.root.add(m); }
  }

  toggleLight(room) {
    const off = !this.dark.has(room);
    if (off) this.dark.add(room); else this.dark.delete(room);
    const y0 = DECK_Y[room.deck] - 0.2, y1 = deckAboveY(room.deck) + 0.1;
    let n = 0;
    for (const L of this.world.lamps) if (L.y > y0 && L.y < y1 && L.x > room.x0 && L.x < room.x1 && L.z > room.z0 && L.z < room.z1) { L.off = off; n++; }
    this.sound.click();
    this.toast(n ? (off ? 'Licht aus' : 'Licht an') : 'In dieser Kabine brennt keine Lampe.', 1.5);
  }

  _plates(p) {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);
    let k = 0;
    for (const s of this.switches) {
      if (k >= 24 || Math.abs(s.y - p.y) > 1.5 || Math.abs(s.x - p.x) > 9 || Math.abs(s.z - p.z) > 9) continue;
      q.setFromAxisAngle(up, Math.atan2(s.nx, s.nz));
      this.plates.setMatrixAt(k, m.compose(v.set(s.x, s.y + 1.32, s.z), q, one));
      this.pushes.setMatrixAt(k, m.compose(v.set(s.x + s.nx * 0.006, s.y + 1.32 + (s.bell ? 0 : 0.012), s.z + s.nz * 0.006), q, one));
      k++;
    }
    this.plates.count = this.pushes.count = k;
    this.plates.instanceMatrix.needsUpdate = this.pushes.instanceMatrix.needsUpdate = true;
  }

  // ------------------------------------------------------------------ taps

  toggleTap(u) {
    const i = this.taps.findIndex((t) => t.u === u);
    if (i >= 0) { this._stopTap(i); this.sound.tap(false); return; }
    const [x, y, z, y1] = TAPS[u.kind](u.o || {}), g = this._group(u);
    const jet = new THREE.Mesh(this.G.jet, this.M.jet);
    jet.position.set(x, y, z); jet.scale.y = y - y1;
    g.add(jet);
    this.taps.push({ u, g });
    if (this.taps.length > MAX_RUN) this._stopTap(0);
    this.sound.tap(true);
  }
  _stopTap(i) { const t = this.taps[i]; this.root.remove(t.g); this.taps.splice(i, 1); }

  // ------------------------------------------------------------------ bath tubs

  toggleTub(u) {
    let T = this.tubs.get(u);
    if (!T) {
      const g = this._group(u), sh = new THREE.Shape(), hw = 0.27, hl = 0.74, r = 0.24;
      sh.moveTo(-hw + r, -hl); sh.lineTo(hw - r, -hl); sh.quadraticCurveTo(hw, -hl, hw, -hl + r); sh.lineTo(hw, hl - r); sh.quadraticCurveTo(hw, hl, hw - r, hl);
      sh.lineTo(-hw + r, hl); sh.quadraticCurveTo(-hw, hl, -hw, hl - r); sh.lineTo(-hw, -hl + r); sh.quadraticCurveTo(-hw, -hl, -hw + r, -hl);
      const water = new THREE.Mesh(new THREE.ShapeGeometry(sh, 6).rotateX(-Math.PI / 2), this.M.water);
      const jet = new THREE.Mesh(this.G.jet, this.M.jet);
      jet.position.set(...TUB.spout); jet.scale.set(1.8, 1, 1.8);
      g.add(water, jet);
      T = { g, water, jet, level: TUB.lo, target: TUB.lo };
      this.tubs.set(u, T);
    }
    T.target = T.target > TUB.lo ? TUB.lo : TUB.hi;
    this.sound.tap(T.target > TUB.lo);
    this.toast(T.target > TUB.lo ? 'Das Bad läuft ein …' : 'Das Wasser läuft ab …', 2.5);
  }

  // ------------------------------------------------------------------ per frame

  update(dt, p) {
    let noise = 0;
    const near = (u, d = FAR) => Math.abs(u.y - p.y) < 3 && Math.abs(u.x - p.x) < d && Math.abs(u.z - p.z) < d;
    const loud = (u, k = 1) => { if (Math.abs(u.y - p.y) < 2.5) { const d = Math.hypot(u.x - p.x, u.z - p.z); noise = Math.max(noise, k * Math.max(0, 1 - d / 9)); } };
    for (let i = this.open.length - 1; i >= 0; i--) {
      const W = this.open[i];
      if (W.t !== W.target) { W.t = W.target > W.t ? Math.min(1, W.t + dt * 2.2) : Math.max(0, W.t - dt * 2.2); const a = 1.85 * (W.t * W.t * (3 - 2 * W.t)); W.L.rotation.y = a; W.R.rotation.y = -a; }
      if (W.t === 0 && W.target === 0) { this.root.remove(W.g); this.open.splice(i, 1); continue; } // closed: the baked doors again
      W.g.visible = near(W.u);
    }
    for (const list of [this.drawers, this.ports]) for (let i = list.length - 1; i >= 0; i--) {
      const D = list[i];
      if (D.t !== D.target) {
        D.t = D.target > D.t ? Math.min(1, D.t + dt * 2.6) : Math.max(0, D.t - dt * 2.6);
        const e = D.t * D.t * (3 - 2 * D.t);
        if (D.dr) D.dr.position.x = D.x0 + 0.26 * e; else D.leaf.rotation.y = -1.75 * e;
      }
      if (D.t === 0 && D.target === 0) { this.root.remove(D.g); list.splice(i, 1); continue; }
      D.g.visible = near(D.u);
    }
    if (!this.plates && this.world.doors.size > 100 && this.world.rooms?.length) this._cabins();
    if (this.plates && (!this._pp || Math.abs(p.x - this._pp.x) + Math.abs(p.y - this._pp.y) + Math.abs(p.z - this._pp.z) > 1.5)) { this._pp = { x: p.x, y: p.y, z: p.z }; this._plates(p); }
    for (const t of this.taps) { t.g.visible = near(t.u); loud(t.u); }
    for (const [u, T] of this.tubs) {
      const filling = T.target > T.level, draining = T.target < T.level;
      if (filling) T.level = Math.min(T.target, T.level + dt * TUB.rate); else if (draining) T.level = Math.max(T.target, T.level - dt * TUB.rate * 1.6);
      if (T.level <= TUB.lo && T.target <= TUB.lo) { this.root.remove(T.g); this.tubs.delete(u); continue; }
      const k = (T.level - TUB.lo) / (TUB.hi - TUB.lo), s = 0.8 + 0.2 * k; // the tub widens upwards
      T.water.position.y = T.level; T.water.scale.set(s, 1, 0.9 + 0.1 * k);
      T.jet.visible = filling; T.jet.scale.y = Math.max(0.01, TUB.spout[1] - T.level);
      T.g.visible = near(u);
      if (filling) loud(u, 1); else if (draining) loud(u, 0.45);
    }
    this.sound.water(noise);
  }
}
