// Floating brass "i" tokens for world.infos + proximity detection.
import * as THREE from 'three';
import { DECK_Y, deckAtY } from '../core/constants.js';

const VIEW_DIST = 40;
const STORE_KEY = 'titanic.entdeckt.v1';

function tokenTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(52, 46, 6, 64, 64, 64);
  grad.addColorStop(0, '#fff0b8'); grad.addColorStop(0.55, '#d8ae52'); grad.addColorStop(1, '#8a6420');
  g.fillStyle = grad; g.beginPath(); g.arc(64, 64, 62, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#5c400f'; g.lineWidth = 5; g.beginPath(); g.arc(64, 64, 52, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#3a2708'; g.font = 'italic bold 84px Georgia, "Times New Roman", serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('i', 64, 70);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class InfoPoints {
  constructor(world, scene) {
    this.world = world;
    this.scene = scene;
    this.items = [];       // { info, x, y (marker height), z, found }
    this.mesh = null;
    this.nearest = -1;     // index of the info the player can read right now
    this.foundCount = 0;
    this._visible = [];    // indices currently instanced
    this._timer = 1;
    this._m = new THREE.Matrix4();
    this._seen = new Set();
    try { for (const k of JSON.parse(localStorage.getItem(STORE_KEY) || '[]')) this._seen.add(k); } catch { /* private mode */ }
  }

  /** Build markers for everything registered so far (call after the modules are built). */
  build() {
    const infos = this.world.infos;
    this.items.length = 0;
    this.foundCount = 0;
    for (const info of infos) {
      // infos may be registered at floor level or at the object itself: lift floor-level ones to chest height
      const floor = DECK_Y[deckAtY(info.y)];
      const h = info.y - floor;
      const y = h >= 0 && h < 0.6 ? info.y + 1.45 : info.y;
      const found = this._seen.has(info.title);
      if (found) this.foundCount++;
      this.items.push({ info, x: info.x, y, z: info.z, found });
    }
    if (this.mesh) { this.scene.remove(this.mesh); this.mesh.dispose(); this.mesh = null; }
    if (!this.items.length) return;
    const geo = new THREE.CylinderGeometry(0.11, 0.11, 0.022, 20);
    geo.rotateX(Math.PI / 2); // faces look along z
    const face = new THREE.MeshBasicMaterial({ map: tokenTexture() });
    const rim = new THREE.MeshBasicMaterial({ color: 0xb08a38 });
    const mesh = new THREE.InstancedMesh(geo, [rim, face, face], this.items.length);
    mesh.name = 'infoMarkers';
    mesh.count = 0;
    mesh.frustumCulled = false;
    mesh.userData.noMerge = true;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const white = new THREE.Color(1, 1, 1);
    for (let i = 0; i < this.items.length; i++) mesh.setColorAt(i, white);
    this.mesh = mesh;
    this.scene.add(mesh);
  }

  /** @param feet player's feet position, t time in seconds */
  update(dt, t, feet, mode) {
    if (!this.mesh) return;
    this._timer += dt;
    if (this._timer >= 0.25) { this._timer = 0; this._scan(feet, mode); }
    // face the viewer + bob the visible tokens
    const vis = this._visible, m = this._m.elements, arr = this.mesh.instanceMatrix.array, items = this.items;
    for (let k = 0; k < vis.length; k++) {
      const it = items[vis[k]];
      // billboard: the token always faces the viewer squarely (no spin, so the "i" is never seen at an angle)
      const a = Math.atan2(feet.x - it.x, feet.z - it.z), c = Math.cos(a), s = Math.sin(a);
      const sc = it.found ? 0.7 : 1;
      m[0] = c * sc; m[1] = 0; m[2] = -s * sc; m[3] = 0;
      m[4] = 0; m[5] = sc; m[6] = 0; m[7] = 0;
      m[8] = s * sc; m[9] = 0; m[10] = c * sc; m[11] = 0;
      m[12] = it.x; m[13] = it.y + Math.sin(t * 1.8 + it.z) * 0.04; m[14] = it.z; m[15] = 1;
      arr.set(m, k * 16);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  _scan(feet, mode) {
    const items = this.items, vis = this._visible;
    const chest = feet.y + 1.4;
    let best = -1, bestD = Infinity, n = 0, colorDirty = false;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const dx = it.x - feet.x, dz = it.z - feet.z, dy = it.y - chest;
      const d2 = dx * dx + dz * dz;
      if (d2 > VIEW_DIST * VIEW_DIST || Math.abs(dy) > 25) continue;
      if (vis[n] !== i || it.dirty) {
        vis[n] = i;
        const c = this.mesh.instanceColor.array;
        const v = it.found ? 0.55 : 1;
        c[n * 3] = v; c[n * 3 + 1] = v; c[n * 3 + 2] = v;
        it.dirty = false;
        colorDirty = true;
      }
      n++;
      const r = it.info.radius;
      if (mode === 'walk' && d2 < r * r && Math.abs(dy) < 2.4 && d2 < bestD) { bestD = d2; best = i; }
    }
    vis.length = n;
    this.mesh.count = n;
    if (colorDirty) this.mesh.instanceColor.needsUpdate = true;
    this.nearest = best;
  }

  /** Mark as read; returns true if it was new. */
  markFound(i) {
    const it = this.items[i];
    if (!it || it.found) return false;
    it.found = true; it.dirty = true;
    this.foundCount++;
    this._seen.add(it.info.title);
    try { localStorage.setItem(STORE_KEY, JSON.stringify([...this._seen])); } catch { /* ignore */ }
    return true;
  }
}
