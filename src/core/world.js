import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { DECK_Y, DECK_ORDER, ZONE_LEN, deckAboveY, isInterior, deckAtY } from './constants.js';

const CELL = 4;
const key = (cx, cz) => cx * 4096 + cz;

/**
 * Shared scene registry: culling zones, collision, floors, ramps, teleports, info points, lamps.
 * See docs/CONTRACT.md.
 */
export class World {
  constructor(scene) {
    this.scene = scene;
    this.exterior = new THREE.Group(); this.exterior.name = 'exterior';
    this.interior = new THREE.Group(); this.interior.name = 'interior';
    scene.add(this.exterior, this.interior);
    this.zones = new Map();
    this._bakeGroups = [];
    this._grid = new Map();
    this._stamp = 0;
    this.colliderCount = 0;
    this.ramps = [];
    this.floors = [];
    this.teleports = [];
    this.infos = [];
    this.lamps = [];
    this.updaters = [];
    this._timeListeners = [];
    this.state = { night: false, inside: false, deck: 'boat', mode: 'walk' };
  }

  // ---------- scene graph ----------

  /** Group for interior content of `deck` around station x. Culled automatically, merged by bake(). */
  zone(deck, x) {
    if (!(deck in DECK_Y)) throw new Error('unknown deck ' + deck);
    const i = Math.floor(x / ZONE_LEN);
    const id = deck + ':' + i;
    let g = this.zones.get(id);
    if (!g) {
      g = new THREE.Group();
      g.name = 'zone ' + id;
      g.userData = { deck, x0: i * ZONE_LEN, x1: (i + 1) * ZONE_LEN, yMin: DECK_Y[deck] - 0.3, yMax: deckAboveY(deck) };
      this.zones.set(id, g);
      this.interior.add(g);
    }
    return g;
  }

  /** Register an exterior group whose static meshes should be merged by bake(). */
  markForBake(group) { this._bakeGroups.push(group); return group; }

  /** Show only the interior zones near the camera. Call every frame. */
  updateVisibility(p) {
    const nearShip = Math.abs(p.z) < 45;
    for (const g of this.zones.values()) {
      const u = g.userData;
      // own + adjacent decks over a long range; two decks up/down only close by (seen through stairwells,
      // otherwise one looks through the hole into empty sky)
      const near = p.y > u.yMin - 3.3 && p.y < u.yMax + 3.3 && p.x > u.x0 - 70 && p.x < u.x1 + 70;
      const shaft = p.y > u.yMin - 9.2 && p.y < u.yMax + 9.2 && p.x > u.x0 - 14 && p.x < u.x1 + 14;
      g.visible = nearShip && (near || shaft);
    }
    this.state.inside = isInterior(p.x, p.y - 1.2, p.z);
    this.state.deck = deckAtY(p.y - 1.6);
  }

  // ---------- collision ----------

  /** Axis-aligned solid box (world coordinates). */
  addCollider(x0, y0, z0, x1, y1, z1) {
    const b = {
      x0: Math.min(x0, x1), x1: Math.max(x0, x1), y0: Math.min(y0, y1), y1: Math.max(y0, y1),
      z0: Math.min(z0, z1), z1: Math.max(z0, z1), s: 0,
    };
    for (let cx = Math.floor(b.x0 / CELL); cx <= Math.floor(b.x1 / CELL); cx++) {
      for (let cz = Math.floor(b.z0 / CELL); cz <= Math.floor(b.z1 / CELL); cz++) {
        const k = key(cx, cz);
        let a = this._grid.get(k);
        if (!a) this._grid.set(k, (a = []));
        a.push(b);
      }
    }
    this.colliderCount++;
    return b;
  }

  /** Collider from the world-space bounding box of an object (call after it is positioned and added). */
  addColliderFor(object, pad = 0) {
    object.updateWorldMatrix(true, true);
    const bb = new THREE.Box3().setFromObject(object);
    return this.addCollider(bb.min.x - pad, bb.min.y, bb.min.z - pad, bb.max.x + pad, bb.max.y, bb.max.z + pad);
  }

  /**
   * Resolve a vertical cylinder (feet at y) against the colliders. Returns corrected {x, z}.
   * Obstacles lower than `step` above the feet are ignored.
   */
  collide(x, z, y, radius = 0.3, height = 1.7, step = 0.45) {
    for (let iter = 0; iter < 3; iter++) {
      let moved = false;
      const stamp = ++this._stamp;
      for (let cx = Math.floor((x - radius) / CELL); cx <= Math.floor((x + radius) / CELL); cx++) {
        for (let cz = Math.floor((z - radius) / CELL); cz <= Math.floor((z + radius) / CELL); cz++) {
          const a = this._grid.get(key(cx, cz));
          if (!a) continue;
          for (const b of a) {
            if (b.s === stamp) continue;
            b.s = stamp;
            if (b.y1 < y + step || b.y0 > y + height) continue;
            const px = Math.max(b.x0, Math.min(x, b.x1));
            const pz = Math.max(b.z0, Math.min(z, b.z1));
            let dx = x - px, dz = z - pz;
            const d2 = dx * dx + dz * dz;
            if (d2 >= radius * radius) continue;
            if (d2 > 1e-10) {
              const d = Math.sqrt(d2), push = radius - d;
              x += (dx / d) * push; z += (dz / d) * push;
            } else {
              // centre inside the box: leave through the nearest face
              const l = x - b.x0, r = b.x1 - x, f = z - b.z0, k = b.z1 - z;
              const m = Math.min(l, r, f, k);
              if (m === l) x = b.x0 - radius; else if (m === r) x = b.x1 + radius;
              else if (m === f) z = b.z0 - radius; else z = b.z1 + radius;
            }
            moved = true;
          }
        }
      }
      if (!moved) break;
    }
    return { x, z };
  }

  // ---------- ground ----------

  /**
   * Walkable horizontal surface. If `clip` (a function x -> half width) is given, the floor additionally
   * only exists where |z| <= clip(x) (use it for hull-shaped decks).
   */
  addFloor({ y, x0, x1, z0 = -99, z1 = 99, clip = null }) {
    this.floors.push({ y, x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), clip });
  }

  /**
   * Sloped walkable surface (stairs). axis 'x': height is y0 at x0 and y1 at x1. axis 'z': y0 at z0, y1 at z1.
   * x0/x1 (or z0/z1) may be given in any order, they define the slope direction.
   */
  addRamp({ x0, x1, z0, z1, y0, y1, axis = 'x' }) {
    this.ramps.push({ x0, x1, z0, z1, y0, y1, axis, minX: Math.min(x0, x1), maxX: Math.max(x0, x1), minZ: Math.min(z0, z1), maxZ: Math.max(z0, z1) });
  }

  /** Ground height below a walker whose feet are at y, or null if there is nothing to stand on. */
  groundAt(x, z, y) {
    let best = null;
    for (const f of this.floors) {
      if (x < f.x0 || x > f.x1 || z < f.z0 || z > f.z1 || f.y > y + 0.6) continue;
      if (f.clip && Math.abs(z) > f.clip(x)) continue;
      if (best === null || f.y > best) best = f.y;
    }
    for (const r of this.ramps) {
      if (x < r.minX || x > r.maxX || z < r.minZ || z > r.maxZ) continue;
      const t = r.axis === 'x' ? (x - r.x0) / (r.x1 - r.x0) : (z - r.z0) / (r.z1 - r.z0);
      const h = r.y0 + (r.y1 - r.y0) * t;
      if (Math.abs(h - y) > 0.75) continue;
      if (best === null || h > best) best = h;
    }
    return best;
  }

  // ---------- gameplay registries ----------

  /** Named place for the deck-plan teleport. y = floor height, yaw in radians (0 = looking towards +x / bow). */
  addTeleport({ name, deck, x, y = DECK_Y[deck], z = 0, yaw = 0, group = '' }) {
    this.teleports.push({ name, deck, x, y, z, yaw, group });
  }
  /** Historical info point (German text). Shown when the player is within `radius`. */
  addInfo({ title, text, x, y, z, radius = 4 }) { this.infos.push({ title, text, x, y, z, radius }); }
  /** Light fixture position. The environment module moves a small pool of real point lights to the nearest lamps. */
  addLamp({ x, y, z, color = 0xffd9a0, intensity = 1 }) { this.lamps.push({ x, y, z, color, intensity }); }
  /** Per-frame callback fn(dt, time). */
  onUpdate(fn) { this.updaters.push(fn); }
  onTimeChange(fn) { this._timeListeners.push(fn); fn(this.state.night); }
  setNight(night) { this.state.night = !!night; for (const fn of this._timeListeners) fn(this.state.night); }
  update(dt, t) { for (const fn of this.updaters) fn(dt, t); }

  // ---------- static batching ----------

  /** Merge static meshes per zone and material. Call once after all modules are built. */
  async bake(onProgress) {
    const groups = [...this.zones.values(), ...this._bakeGroups];
    let before = 0, after = 0;
    for (let i = 0; i < groups.length; i++) {
      const r = bakeGroup(groups[i]);
      before += r.before; after += r.after;
      if (i % 3 === 0) { onProgress?.(i / groups.length); await new Promise((res) => setTimeout(res)); }
    }
    onProgress?.(1);
    console.info(`[world] bake: ${before} meshes -> ${after}`);
  }
}

const _m = new THREE.Matrix4();
function releaseArray() { this.array = null; }

function bakeGroup(root) {
  root.updateWorldMatrix(true, true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map();
  const originals = [];
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || o.children.length) return;
    if (Array.isArray(o.material) || !o.geometry?.attributes?.position) return;
    for (let p = o; p && p !== root; p = p.parent) if (p.userData.noMerge || !p.visible) return;
    if (o.geometry.morphAttributes && Object.keys(o.geometry.morphAttributes).length) return;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.clearGroups();
    _m.multiplyMatrices(inv, o.matrixWorld);
    g.applyMatrix4(_m);
    if (_m.determinant() < 0) { // mirrored: flip winding
      for (const a of Object.values(g.attributes)) {
        const arr = a.array, n = a.itemSize;
        for (let i = 0; i < arr.length; i += 3 * n) for (let k = 0; k < n; k++) { const t = arr[i + k]; arr[i + k] = arr[i + 2 * n + k]; arr[i + 2 * n + k] = t; }
      }
    }
    const k = o.material.uuid + (o.castShadow ? 'c' : '') + (o.receiveShadow ? 'r' : '') + '|' + o.renderOrder;
    let b = buckets.get(k);
    if (!b) buckets.set(k, (b = { material: o.material, cast: o.castShadow, receive: o.receiveShadow, order: o.renderOrder, geos: [] }));
    b.geos.push(g);
    originals.push(o);
  });
  if (originals.length < 2) return { before: originals.length, after: originals.length };
  for (const o of originals) o.parent.remove(o);
  for (const b of buckets.values()) {
    const merged = b.geos.length === 1 ? b.geos[0] : mergeGeometries(b.geos, false);
    if (b.geos.length > 1) for (const g of b.geos) g.dispose();
    // baked geometry is never read on the CPU again: drop the arrays once they are on the GPU (saves > 1 GB of heap)
    merged.computeBoundingSphere();
    merged.computeBoundingBox();
    if (typeof document !== 'undefined' && document.body?.isConnected) {
      for (const a of Object.values(merged.attributes)) a.onUpload(releaseArray);
    }
    const mesh = new THREE.Mesh(merged, b.material);
    mesh.castShadow = b.cast; mesh.receiveShadow = b.receive; mesh.renderOrder = b.order;
    mesh.name = 'baked';
    root.add(mesh);
  }
  return { before: originals.length, after: buckets.size };
}

export { DECK_Y, DECK_ORDER };
