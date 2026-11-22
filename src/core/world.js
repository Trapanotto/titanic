import * as THREE from 'three';
import { DECK_Y, DECK_ORDER, ZONE_LEN, deckAboveY, isInterior, deckAtY, ceilingY, STAIRS, MACHINERY_ACCESS } from './constants.js';

const CELL = 4;
const key = (cx, cz) => cx * 4096 + cz;

// ---- visibility / chunking parameters ----
// 1 m grid over the whole ship (plan view): room clusters for the bake, visible area mask for the culling
const GX0 = -140, GZ0 = -16, GW = 280, GH = 32;
const OCC = 2;                      // occluder grid cell (m)
const OW = GW / OCC, OH = GH / OCC;
const RAYS = 720;                   // 0.5° – a 0.9 m door at 100 m is still hit by a ray
const RAY_MAX = 110;
const BIG_ROOM = 100;               // m² – larger rooms get their own chunks
const REST_X = 12;                  // everything else: 12 m cells (half zones) per ship side
const LOD_SMALL = { r: 0.2, d: 60 }; // objects with bounding radius < r are not drawn beyond d (m) from their chunk box
const LOD_TINY = { r: 0.08, d: 30 };
const TINY_INST = { r: 0.06, d: 60 }; // exterior instanced details (rivets) beyond d from their slice
const EXT_TAGS = new Set(['environment', 'exterior', 'fittings']); // colliders of these modules never occlude (windows)
const EMPTY = [];

/** Yield to the event loop without timer throttling (background tabs clamp setTimeout to >= 1 s). */
const _node = typeof setImmediate === 'function';
const _mc = !_node && typeof MessageChannel !== 'undefined' ? new MessageChannel() : null;
const _mcQueue = [];
if (_mc) _mc.port1.onmessage = () => _mcQueue.shift()?.();
export function yieldTask() {
  if (_node) return new Promise((r) => setImmediate(r));
  if (!_mc) return new Promise((r) => setTimeout(r, 0));
  return new Promise((r) => { _mcQueue.push(r); _mc.port2.postMessage(0); });
}

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
    this._colliders = [];
    this._stamp = 0;
    this.colliderCount = 0;
    this.colliderTag = null;      // set by the app to the id of the module being built
    this.ramps = [];
    this.floors = [];
    this.teleports = [];
    this.infos = [];
    this.lamps = [];
    this.updaters = [];
    this._timeListeners = [];
    this.state = { night: false, inside: false, deck: 'boat', mode: 'walk' };
    /** false: draw every chunk of the zones in range (old behaviour, for comparisons) */
    this.culling = true;
    this.chunks = [];             // interior chunks (baked meshes + static instanced meshes with a world box)
    this.extChunks = [];          // exterior chunks (LOD / far detail)
    this.stats = { zones: 0, chunks: 0, chunksTotal: 0, rays: 0, maskMs: 0, evicted: 0 };
    this._own = null;
    this._clusterGrids = new Map();
    this._evictTimer = 0;
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

  /**
   * Show only what can be seen from the camera position p. Call every frame.
   * Zones: own + adjacent decks over a long range, two decks up/down close by (stairwells). Inside the ship the
   * baked chunks of those zones are additionally tested against the area visible from the camera (2D rays at eye
   * height against the full-height interior walls) – walls occlude everything behind them.
   */
  updateVisibility(p, now = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000) {
    const st = this.state;
    st.inside = isInterior(p.x, p.y - 1.2, p.z);
    st.deck = deckAtY(p.y - 1.6);
    const nearShip = Math.abs(p.z) < 45;
    // Occlusion by the interior walls – inside, and also on the open decks (exterior walls never occlude, so the
    // rooms seen through windows stay visible). Outside, the adjacent deck keeps the plain distance rule (views
    // over the rail into the windows below).
    const onShip = Math.abs(p.z) < -GZ0 - 0.5 && p.x > GX0 + 1 && p.x < GX0 + GW - 1 && p.y < DECK_Y.roof + 4;
    const occl = this.culling !== false && onShip && this.chunks.length > 0;
    const inside = st.inside, lodOn = this.culling !== false;
    let open = EMPTY;
    this._frame = (this._frame || 0) + 1;
    if (occl) { this._own = this._castMask(this._own, p.x, p.z, p.y); open = this._activeOpenings(p); } else if (this._own) this._own.valid = false;
    // Below C deck the hull is closed (portholes only): nothing of the exterior can be seen, except when standing in
    // a stairwell that leads up to C deck or higher (looking up it: well-deck doors, the glass domes).
    let ext = true;
    if (occl && inside && p.y < DECK_Y.C - 0.3) {
      ext = false;
      for (const o of this._openings) {
        if (o.hi > DECK_Y.C && p.y >= o.lo && p.x > o.x0 - 3 && p.x < o.x1 + 3 && p.z > o.z0 - 3 && p.z < o.z1 + 3) { ext = true; break; }
      }
    }
    this.exterior.visible = ext;
    let nz = 0, nc = 0;
    for (const g of this.zones.values()) {
      const u = g.userData;
      const near = p.y > u.yMin - 3.3 && p.y < u.yMax + 3.3 && p.x > u.x0 - 70 && p.x < u.x1 + 70;
      const shaft = p.y > u.yMin - 9.2 && p.y < u.yMax + 9.2 && p.x > u.x0 - 14 && p.x < u.x1 + 14;
      const vis = nearShip && (near || shaft);
      g.visible = vis;
      const list = u.chunks || EMPTY;
      if (!vis) continue;
      nz++;
      const own = p.y >= u.yMin && p.y <= u.yMax;
      // outside near the rail: the adjacent deck as before (looking over the side into the windows below)
      const keep = !own && !inside && near && Math.abs(p.z) > 9.5;
      // outside, elsewhere: the adjacent deck as seen through its windows (exterior walls never occlude)
      const win = !own && !inside && near;
      let dm = null, wm = null;
      for (let i = 0; i < list.length; i++) {
        const c = list[i];
        let v = true;
        if (occl && !keep) {
          if (own) v = this._maskHit(c, 1, this._own);
          else if (shaft && seenThroughOpening(c, open)) {
            // through a stairwell: the walls of that deck occlude as seen from the camera's plan position
            dm ??= this._deckMask(u.deck, p, open);
            v = this._maskHit(c, 1, dm);
          } else v = false;
          if (!v && win) { wm ??= this._deckMask(u.deck, p, null); v = this._maskHit(c, 1, wm); }
        }
        if (v) nc++;
        showCluster(c, v, p, now, lodOn);
      }
    }
    for (let i = 0; i < this.extChunks.length; i++) {
      const c = this.extChunks[i];
      if (c.lod) showCluster(c, true, p, now, lodOn);
      else if (c.far) c.mesh.visible = !(lodOn && distXYZ(c, p) > c.far);
    }
    const S = this.stats;
    S.zones = nz; S.chunks = nc; S.chunksTotal = this.chunks.length; S.exterior = ext; S.openings = open.length;
  }

  /**
   * Upload the baked chunks to the GPU in small idle slices after the start (the compact CPU arrays are released on
   * upload, so the JS heap shrinks to the live data). Call once per frame; returns true while work is left.
   * Uploads go through a 1×1 render target with a plain override material, so nothing is drawn on screen.
   */
  uploadStep(renderer, budgetMs = 3) {
    if (!renderer || this._uploadDone) return false;
    let U = this._upload;
    if (!U) {
      const list = [];
      for (const g of [this.interior, this.exterior]) g.traverse((o) => { if (o.name === 'baked' && o.geometry?.index?.array) list.push(o); });
      U = this._upload = {
        list, i: 0, scene: new THREE.Scene(), cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1),
        rt: new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false }), mat: new THREE.MeshBasicMaterial(),
      };
      U.scene.overrideMaterial = U.mat;
      U.scene.matrixWorldAutoUpdate = false;
    }
    const t0 = now(), prev = renderer.getRenderTarget(), shadow = renderer.shadowMap.autoUpdate;
    renderer.shadowMap.autoUpdate = false;
    renderer.setRenderTarget(U.rt);
    try {
      while (U.i < U.list.length && now() - t0 < budgetMs) {
        const batch = [];
        for (let k = 0; k < 24 && U.i < U.list.length; k++) {
          const m = U.list[U.i++];
          if (!m.geometry.index.array) continue; // already uploaded by a normal frame
          batch.push([m, m.parent, m.visible, m.frustumCulled]);
        }
        if (!batch.length) continue;
        for (const [m] of batch) { U.scene.children.push(m); m.visible = true; m.frustumCulled = false; }
        renderer.render(U.scene, U.cam);
        U.scene.children.length = 0;
        for (const [m, , v, fc] of batch) { m.visible = v; m.frustumCulled = fc; }
      }
    } finally {
      renderer.setRenderTarget(prev);
      renderer.shadowMap.autoUpdate = shadow;
    }
    if (U.i >= U.list.length) { this._uploadDone = true; U.rt.dispose(); U.mat.dispose(); this._upload = null; }
    return !this._uploadDone;
  }

  /** Mask of another deck (seen through a stairwell), from the camera's plan position at that deck's eye height. */
  _deckMask(deck, p, open) {
    this._dmasks ??= new Map();
    const k = deck + (open ? ':o' : ':w');
    let M = this._dmasks.get(k);
    if (M && M.frame === this._frame) return M;
    // sight lines reach that deck only through the openings: rays start where they enter one of them
    const y = DECK_Y[deck] + 1.2, rects = open ? open.filter((o) => y >= o.lo && y <= o.hi) : null;
    M = this._castMask(M, p.x, p.z, DECK_Y[deck] + 1.65, rects);
    M.frame = this._frame;
    this._dmasks.set(k, M);
    return M;
  }

  /**
   * Area visible from (x, z) at eye height `eye`: 2D rays (0.5° apart) against the thin floor-to-ceiling interior
   * walls that span that height, marked into a 1 m grid + summed-area table. Recomputed only when the point moved.
   */
  _castMask(V, ox, oz, eye, rects = null) {
    if (!V) V = { stamp: new Uint32Array(GW * GH), cur: 0, sat: new Int32Array((GW + 1) * (GH + 1)), x: NaN, z: NaN, eye: NaN, occN: -1, valid: false, ok: null };
    if (!this._occ || this._occ.n !== this.colliderCount) this._buildOccluders();
    const O = this._occ;
    const dx = ox - V.x, dz = oz - V.z;
    const rk = rects ? rects.length : -1;
    if (V.valid && V.occN === O.n && V.rk === rk && dx * dx + dz * dz < 0.04 && Math.abs(eye - V.eye) < 0.15) return V;
    V.rk = rk;
    const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
    V.x = ox; V.z = oz; V.eye = eye; V.valid = true; V.occN = O.n;
    const occ = O.occ, n = occ.length / 6, cells = O.cells;
    if (!V.ok || V.ok.length !== n) V.ok = new Uint8Array(n);
    const ok = V.ok;
    for (let i = 0; i < n; i++) ok[i] = occ[i * 6 + 4] <= eye - 1.0 && occ[i * 6 + 5] >= eye + 0.5 ? 1 : 0;
    const S = V.stamp, cur = ++V.cur;
    // the camera's neighbourhood is always visible
    if (!rects) for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) mark(S, cur, ox + a, oz + b);
    for (let r = 0; r < RAYS; r++) {
      const ang = (r / RAYS) * Math.PI * 2, rx = Math.cos(ang), rz = Math.sin(ang);
      const irx = 1 / (Math.abs(rx) < 1e-9 ? 1e-9 : rx), irz = 1 / (Math.abs(rz) < 1e-9 ? 1e-9 : rz);
      let t0r = 0;
      if (rects) { // entry into the nearest opening (0 if the camera stands in it)
        t0r = Infinity;
        for (const o of rects) {
          const a1 = (o.x0 - ox) * irx, a2 = (o.x1 - ox) * irx, b1 = (o.z0 - oz) * irz, b2 = (o.z1 - oz) * irz;
          const tn = Math.max(Math.min(a1, a2), Math.min(b1, b2), 0), tf = Math.min(Math.max(a1, a2), Math.max(b1, b2));
          if (tn <= tf && tn < t0r) t0r = tn;
        }
        if (t0r >= RAY_MAX) continue;
      }
      const px = ox + rx * t0r, pz = oz + rz * t0r;
      let cx = Math.floor((px - GX0) / OCC), cz = Math.floor((pz - GZ0) / OCC);
      const sx = rx > 0 ? 1 : -1, sz = rz > 0 ? 1 : -1;
      let tmx = ((cx + (rx > 0 ? 1 : 0)) * OCC + GX0 - ox) * irx, tmz = ((cz + (rz > 0 ? 1 : 0)) * OCC + GZ0 - oz) * irz;
      const tdx = OCC * Math.abs(irx), tdz = OCC * Math.abs(irz);
      let tHit = RAY_MAX;
      while (cx >= 0 && cx < OW && cz >= 0 && cz < OH) {
        const tExit = Math.min(tmx, tmz);
        const list = cells[cx * OH + cz];
        if (list) {
          for (let k = 0; k < list.length; k++) {
            const i = list[k];
            if (!ok[i]) continue;
            const o = i * 6;
            const t1 = (occ[o] - ox) * irx, t2 = (occ[o + 2] - ox) * irx, t3 = (occ[o + 1] - oz) * irz, t4 = (occ[o + 3] - oz) * irz;
            const tn = Math.max(Math.min(t1, t2), Math.min(t3, t4)), tf = Math.min(Math.max(t1, t2), Math.max(t3, t4));
            if (tn <= tf && tn > t0r && tn < tHit) tHit = tn;
          }
        }
        if (tHit <= tExit || tExit >= RAY_MAX) break;
        if (tmx < tmz) { tmx += tdx; cx += sx; } else { tmz += tdz; cz += sz; }
      }
      const end = Math.min(RAY_MAX, tHit + 0.4);
      for (let t = t0r + 0.25; t <= end; t += 0.5) mark(S, cur, ox + rx * t, oz + rz * t);
      mark(S, cur, ox + rx * end, oz + rz * end);
    }
    // summed-area table of the mask -> O(1) box queries
    const sat = V.sat, W1 = GW + 1;
    for (let z = 0; z < GH; z++) {
      let row = 0;
      for (let x = 0; x < GW; x++) {
        row += S[z * GW + x] === cur ? 1 : 0;
        sat[(z + 1) * W1 + x + 1] = sat[z * W1 + x + 1] + row;
      }
    }
    this.stats.rays++;
    if (t0) this.stats.maskMs = performance.now() - t0;
    return V;
  }

  /**
   * Vertical openings (stairwells, machinery hatches) that start/end at the camera's level and lie in the visible
   * area: the decks above/below are only seen through them.
   */
  _activeOpenings(p) {
    if (!this._openings) {
      this._openings = [];
      for (const s of STAIRS) {
        const k = s.keep || {}, hw = Math.max(s.lane || 0, k.hw || 0) + 0.6;
        this._openings.push({
          x0: Math.min(s.x0, k.x0 ?? s.x0, s.back ?? s.x0) - 2, x1: Math.max(s.x1, k.x1 ?? s.x1) + 2, z0: (s.zc || 0) - hw, z1: (s.zc || 0) + hw,
          lo: DECK_Y[s.decks[0]] - 0.3, hi: deckAboveY(s.decks[s.decks.length - 1]) + 0.3,
        });
      }
      for (const m of MACHINERY_ACCESS || []) this._openings.push({ x0: m.x0 - 1, x1: m.x1 + 1, z0: m.z0 - 1, z1: m.z1 + 1, lo: DECK_Y.tank - 0.3, hi: deckAboveY('F') + 0.3 });
      this._openOut = [];
    }
    const out = this._openOut;
    out.length = 0;
    for (const o of this._openings) if (p.y >= o.lo && p.y <= o.hi && this._maskHit(o, 1, this._own)) out.push(o);
    return out;
  }

  /** Thin, long, floor-to-ceiling interior walls (kit wall pieces, bulkheads) go into a 2 m grid. */
  _buildOccluders() {
    const list = [];
    const floors = DECK_ORDER.map((d) => [DECK_Y[d], ceilingY(d)]);
    for (const b of this._colliders) {
      if (EXT_TAGS.has(b.tag)) continue;
      const w = b.x1 - b.x0, d = b.z1 - b.z0;
      if (Math.min(w, d) > 0.45 || Math.max(w, d) < 1.2) continue;
      if (!floors.some(([f, c]) => Math.abs(b.y0 - f) < 0.06 && b.y1 >= c - 0.12)) continue;
      list.push(b);
    }
    const occ = new Float32Array(list.length * 6), cells = new Array(OW * OH);
    list.forEach((b, i) => {
      const e = 0.02; // close hairline joints between wall pieces
      occ.set([b.x0 - e, b.z0 - e, b.x1 + e, b.z1 + e, b.y0, b.y1], i * 6);
      const ax = Math.max(0, Math.floor((b.x0 - e - GX0) / OCC)), bx = Math.min(OW - 1, Math.floor((b.x1 + e - GX0) / OCC));
      const az = Math.max(0, Math.floor((b.z0 - e - GZ0) / OCC)), bz = Math.min(OH - 1, Math.floor((b.z1 + e - GZ0) / OCC));
      for (let x = ax; x <= bx; x++) for (let z = az; z <= bz; z++) (cells[x * OH + z] ??= []).push(i);
    });
    this._occ = { occ, cells, n: this.colliderCount, count: list.length };
  }

  /** Does the (padded) plan box of chunk c touch the visible area of mask V? */
  _maskHit(c, pad, V) {
    if (!V || !V.valid) return true;
    const x0 = clampI(Math.floor(c.x0 - pad - GX0), 0, GW - 1), x1 = clampI(Math.floor(c.x1 + pad - GX0), 0, GW - 1);
    const z0 = clampI(Math.floor(c.z0 - pad - GZ0), 0, GH - 1), z1 = clampI(Math.floor(c.z1 + pad - GZ0), 0, GH - 1);
    const s = V.sat, W1 = GW + 1;
    return s[(z1 + 1) * W1 + x1 + 1] - s[z0 * W1 + x1 + 1] - s[(z1 + 1) * W1 + x0] + s[z0 * W1 + x0] > 0;
  }

  // ---------- collision ----------

  /** Axis-aligned solid box (world coordinates). */
  addCollider(x0, y0, z0, x1, y1, z1) {
    const b = {
      x0: Math.min(x0, x1), x1: Math.max(x0, x1), y0: Math.min(y0, y1), y1: Math.max(y0, y1),
      z0: Math.min(z0, z1), z1: Math.max(z0, z1), s: 0, tag: this.colliderTag,
    };
    for (let cx = Math.floor(b.x0 / CELL); cx <= Math.floor(b.x1 / CELL); cx++) {
      for (let cz = Math.floor(b.z0 / CELL); cz <= Math.floor(b.z1 / CELL); cz++) {
        const k = key(cx, cz);
        let a = this._grid.get(k);
        if (!a) this._grid.set(k, (a = []));
        a.push(b);
      }
    }
    this._colliders.push(b);
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

  /**
   * Merge static meshes per zone, material and room cluster (exterior: per material and 32 m slice) into compact,
   * indexed chunks (Int16 positions with a per-chunk offset/scale, Int8 normals, Float32 uv in metres).
   * Call once after all modules are built. Time-sliced: keeps the loading screen alive.
   */
  async bake(onProgress) {
    const groups = [...this.zones.values(), ...this._bakeGroups];
    let before = 0, after = 0, tris = 0, bytes = 0, slice = now();
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      const r = bakeGroup(this, g, this.zones.get(g.name.slice(5)) === g);
      before += r.before; after += r.after; tris += r.tris; bytes += r.bytes;
      if (now() - slice > 30) { onProgress?.(i / groups.length); await yieldTask(); slice = now(); }
    }
    registerExteriorInstances(this);
    this._clusterGrids.clear();
    onProgress?.(1);
    console.info(`[world] bake: ${before} meshes -> ${after} chunks, ${(tris / 1e6).toFixed(2)} M triangles, ${(bytes / 1048576).toFixed(0)} MB vertex data`);
  }

  /** Cluster id grid (1 m cells) of a deck from world.rooms: large rooms get their own id, the rest 0. */
  _clusterGrid(deck) {
    let G = this._clusterGrids.get(deck);
    if (G) return G;
    G = new Int32Array(GW * GH);
    for (let x = 0; x < GW; x++) for (let z = 0; z < GH; z++) G[z * GW + x] = -1000 - (Math.floor((x + GX0) / REST_X) * 2 + (z + GZ0 >= 0 ? 1 : 0));
    const rooms = (this.rooms || []).filter((r) => r.deck === deck && r.x1 > r.x0 && r.z1 > r.z0)
      .map((r, i) => ({ r, i, a: (r.x1 - r.x0) * (Math.min(r.z1, 14.1) - Math.max(r.z0, -14.1)) })).sort((a, b) => b.a - a.a);
    for (const { r, i, a } of rooms) {
      if (a < BIG_ROOM) continue;
      const id = 1 + i;
      const ax = clampI(Math.round(r.x0 - GX0), 0, GW), bx = clampI(Math.round(r.x1 - GX0), 0, GW);
      const az = clampI(Math.round(r.z0 - GZ0), 0, GH), bz = clampI(Math.round(r.z1 - GZ0), 0, GH);
      for (let x = ax; x < bx; x++) for (let z = az; z < bz; z++) G[z * GW + x] = id;
    }
    this._clusterGrids.set(deck, G);
    return G;
  }
}

// ------------------------------------------------------------------ helpers

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const clampI = (v, a, b) => (v < a ? a : v > b ? b : v);
function mark(S, cur, x, z) {
  const cx = Math.floor(x - GX0), cz = Math.floor(z - GZ0);
  if (cx >= 0 && cx < GW && cz >= 0 && cz < GH) S[cz * GW + cx] = cur;
}
function distXZ(c, p) {
  const dx = Math.max(c.x0 - p.x, 0, p.x - c.x1), dz = Math.max(c.z0 - p.z, 0, p.z - c.z1);
  return Math.sqrt(dx * dx + dz * dz);
}
/** Other-level chunk: candidate if it lies within 24 m of an active opening that reaches its height. */
function seenThroughOpening(c, open) {
  for (let i = 0; i < open.length; i++) {
    const o = open[i];
    if (c.y1 < o.lo || c.y0 > o.hi) continue;
    const dx = Math.max(o.x0 - c.x1, 0, c.x0 - o.x1), dz = Math.max(o.z0 - c.z1, 0, c.z0 - o.z1);
    if (dx * dx + dz * dz <= 576) return true;
  }
  return false;
}
function distXYZ(c, p) {
  const dx = Math.max(c.x0 - p.x, 0, p.x - c.x1), dy = Math.max(c.y0 - p.y, 0, p.y - c.y1), dz = Math.max(c.z0 - p.z, 0, p.z - c.z1);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
/**
 * Show / hide one cluster (all its batch instances). Distance LOD: the instances holding the small / tiny objects of
 * a cluster are dropped beyond LOD_SMALL.d / LOD_TINY.d from the cluster box.
 */
function showCluster(c, v, p, now, lodOn) {
  if (v && c.lod) {
    const d = lodOn ? distXYZ(c, p) : 0, L = c.lod;
    const n = d > LOD_SMALL.d ? L[0] : d > LOD_TINY.d ? L[1] : L[2];
    if (n !== c.n) { c.n = n; c.mesh.geometry.drawRange.count = n; }
    if (!n) v = false;
  }
  c.mesh.visible = v;
  if (v) { c.seen = now; c.live = true; }
}

const _m = new THREE.Matrix4(), _nm = new THREE.Matrix3(), _v = new THREE.Vector3(), _box = new THREE.Box3();

let _bucketN = 0;
/** One merge bucket: material + shadow flags + render order + cluster + LOD bin. */
function newBucket(o, cid) {
  return { n: ++_bucketN, material: o.material, cast: o.castShadow, receive: o.receiveShadow, order: o.renderOrder, cid, nv: 0, vtx: new Float32Array(256 * 8), ix: [new IGrow(), new IGrow(), new IGrow()] };
}

function bakeGroup(world, root, isZone) {
  root.updateWorldMatrix(true, true);
  const rootM = root.matrixWorld, identity = isIdentity(rootM);
  const inv = new THREE.Matrix4().copy(rootM).invert();
  const grid = isZone ? world._clusterGrid(root.userData.deck) : null;
  const originals = [];
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || o.children.length) return;
    if (Array.isArray(o.material) || !o.geometry?.attributes?.position) return;
    for (let p = o; p && p !== root; p = p.parent) if (p.userData.noMerge || !p.visible) return;
    if (o.geometry.morphAttributes && Object.keys(o.geometry.morphAttributes).length) return;
    originals.push(o);
  });
  const res = { before: originals.length, after: 0, tris: 0, bytes: 0 };
  const byMat = new Map(); // material key -> { list: [bucket], map: Map(cid*4+bin -> bucket) }
  for (let si = 0; si < originals.length; si++) {
    const o = originals[si];
    let g = o.geometry;
    if (!g.attributes.normal) { g = g.clone(); g.computeVertexNormals(); }
    const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv, I = g.index;
    const nv = P.count;
    if (!nv) continue;
    _m.multiplyMatrices(inv, o.matrixWorld);
    _nm.getNormalMatrix(_m);
    const flip = _m.determinant() < 0;
    if (!g.boundingSphere) g.computeBoundingSphere();
    const rad = g.boundingSphere.radius * _m.getMaxScaleOnAxis();
    const bin = rad < LOD_TINY.r ? 2 : rad < LOD_SMALL.r ? 1 : 0;
    // transform once into root space
    const tp = new Float32Array(nv * 3), tn = new Float32Array(nv * 3), tu = new Float32Array(nv * 2);
    const e = _m.elements, ne = _nm.elements;
    const plain = (x) => x && !x.isInterleavedBufferAttribute && !x.normalized && x.array instanceof Float32Array;
    const pA = plain(P) && P.itemSize === 3 ? P.array : null, nA = plain(N) && N.itemSize === 3 ? N.array : null;
    const uA = U && plain(U) && U.itemSize === 2 ? U.array : null;
    for (let i = 0, j = 0; i < nv; i++, j += 3) {
      let x, y, z;
      if (pA) { x = pA[j]; y = pA[j + 1]; z = pA[j + 2]; } else { x = P.getX(i); y = P.getY(i); z = P.getZ(i); }
      const w = 1 / (e[3] * x + e[7] * y + e[11] * z + e[15]);
      tp[j] = (e[0] * x + e[4] * y + e[8] * z + e[12]) * w; tp[j + 1] = (e[1] * x + e[5] * y + e[9] * z + e[13]) * w; tp[j + 2] = (e[2] * x + e[6] * y + e[10] * z + e[14]) * w;
      if (nA) { x = nA[j]; y = nA[j + 1]; z = nA[j + 2]; } else { x = N.getX(i); y = N.getY(i); z = N.getZ(i); }
      const nx = ne[0] * x + ne[3] * y + ne[6] * z, ny = ne[1] * x + ne[4] * y + ne[7] * z, nz = ne[2] * x + ne[5] * y + ne[8] * z;
      const l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      tn[j] = nx / l; tn[j + 1] = ny / l; tn[j + 2] = nz / l;
      if (uA) { tu[i * 2] = uA[i * 2]; tu[i * 2 + 1] = uA[i * 2 + 1]; } else if (U) { tu[i * 2] = U.getX(i); tu[i * 2 + 1] = U.getY(i); }
    }
    const mk = o.material.uuid + (o.castShadow ? 'c' : '') + (o.receiveShadow ? 'r' : '') + '|' + o.renderOrder;
    let M = byMat.get(mk);
    if (!M) byMat.set(mk, (M = { list: [], map: new Map() }));
    // vertex -> (bucket, index) of its last use; a vertex shared by two buckets is simply duplicated
    const rb = new Int32Array(nv), rk = new Int32Array(nv);
    const ia = I ? I.array : null;
    const nt = I ? Math.floor(I.count / 3) : Math.floor(nv / 3);
    let lastC = NaN, lastB = null;
    for (let t = 0; t < nt; t++) {
      let a = ia ? ia[t * 3] : t * 3, b = ia ? ia[t * 3 + 1] : t * 3 + 1, c = ia ? ia[t * 3 + 2] : t * 3 + 2;
      if (flip) { const s = b; b = c; c = s; }
      let cx = (tp[a * 3] + tp[b * 3] + tp[c * 3]) / 3, cz = (tp[a * 3 + 2] + tp[b * 3 + 2] + tp[c * 3 + 2]) / 3;
      if (!identity) { _v.set(cx, (tp[a * 3 + 1] + tp[b * 3 + 1] + tp[c * 3 + 1]) / 3, cz).applyMatrix4(rootM); cx = _v.x; cz = _v.z; }
      let cid;
      if (grid) cid = grid[clampI(Math.floor(cz - GZ0) | 0, 0, GH - 1) * GW + clampI(Math.floor(cx - GX0) | 0, 0, GW - 1)];
      else cid = 0; // exterior: one chunk per group and material (slicing costs more draw calls than it saves)
      let B;
      if (cid === lastC) B = lastB;
      else {
        B = M.map.get(cid);
        if (!B) { M.map.set(cid, (B = newBucket(o, cid))); M.list.push(B); }
        lastC = cid; lastB = B;
      }
      B.ix[bin].push3(vert(B, a, tp, tn, tu, rb, rk), vert(B, b, tp, tn, tu, rb, rk), vert(B, c, tp, tn, tu, rb, rk));
    }
  }
  for (const o of originals) o.parent.remove(o);

  // one mesh per material and cluster; small / tiny objects at the end of the index buffer (distance LOD = drawRange)
  const chunks = isZone ? (root.userData.chunks ??= []) : null;
  for (const M of byMat.values()) {
    for (const B of M.list) {
      const r = compactGeometry(B, res);
      if (!r) continue;
      const mesh = new THREE.Mesh(r.geo, r.material);
      mesh.position.set(r.cx, r.cy, r.cz);
      mesh.scale.setScalar(r.q);
      mesh.castShadow = r.cast; mesh.receiveShadow = r.receive; mesh.renderOrder = r.order;
      mesh.name = 'baked';
      root.add(mesh);
      mesh.updateMatrixWorld(true);
      _box.copy(r.geo.boundingBox).applyMatrix4(mesh.matrixWorld);
      const lod = r.lod[0] < r.lod[2] ? r.lod : null;
      const C = { mesh, zone: root, x0: _box.min.x, x1: _box.max.x, y0: _box.min.y, y1: _box.max.y, z0: _box.min.z, z1: _box.max.z, lod, n: -1 };
      if (isZone) { chunks.push(C); world.chunks.push(C); } else if (lod) world.extChunks.push(C);
      res.after++;
    }
  }
  // everything that stays separate (noMerge / animated parts, engines …) goes into a wrapper group that is culled
  // by its box like a chunk – the object's own `visible` stays under the control of its module
  if (isZone) {
    const loose = root.children.filter((o) => o.name !== 'baked' && !(o.isInstancedMesh && !o.userData.noMerge) && !o.isLight);
    for (const o of loose) {
      o.updateMatrixWorld(true);
      _box.setFromObject(o, true);
      if (_box.isEmpty()) continue;
      _box.expandByScalar(1);
      const w = new THREE.Group();
      w.name = 'loose';
      root.add(w);
      w.add(o);
      const ch = { mesh: w, zone: root, x0: _box.min.x, x1: _box.max.x, y0: _box.min.y, y1: _box.max.y, z0: _box.min.z, z1: _box.max.z };
      chunks.push(ch); world.chunks.push(ch);
    }
  }
  // static instanced meshes of a zone (dining chairs …) are culled like clusters
  if (isZone) {
    for (const o of root.children) {
      if (!o.isInstancedMesh || o.userData.noMerge) continue;
      o.updateMatrixWorld(true);
      if (!o.boundingBox) o.computeBoundingBox();
      _box.copy(o.boundingBox).applyMatrix4(o.matrixWorld);
      if (_box.isEmpty()) continue;
      const ch = { mesh: o, zone: root, x0: _box.min.x, x1: _box.max.x, y0: _box.min.y, y1: _box.max.y, z0: _box.min.z, z1: _box.max.z };
      chunks.push(ch); world.chunks.push(ch);
    }
  }
  return res;
}

function releaseArray() { this.array = null; }

/** Growable Uint32 list. */
class IGrow {
  constructor() { this.a = new Uint32Array(768); this.n = 0; }
  push3(x, y, z) {
    if (this.n + 3 > this.a.length) { const b = new Uint32Array(this.a.length * 2); b.set(this.a); this.a = b; }
    const a = this.a; a[this.n++] = x; a[this.n++] = y; a[this.n++] = z;
  }
}

/** Index of source vertex v in bucket B (interleaved x y z nx ny nz u v), appended on first use. */
function vert(B, v, tp, tn, tu, rb, rk) {
  if (rb[v] === B.n) return rk[v];
  const k = B.nv++;
  rb[v] = B.n; rk[v] = k;
  if (B.nv * 8 > B.vtx.length) { const g = new Float32Array(B.vtx.length * 2); g.set(B.vtx); B.vtx = g; }
  const o = k * 8, j = v * 3, A = B.vtx;
  A[o] = tp[j]; A[o + 1] = tp[j + 1]; A[o + 2] = tp[j + 2];
  A[o + 3] = tn[j]; A[o + 4] = tn[j + 1]; A[o + 5] = tn[j + 2];
  A[o + 6] = tu[v * 2]; A[o + 7] = tu[v * 2 + 1];
  return k;
}

function isIdentity(m) {
  const e = m.elements, I = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  for (let i = 0; i < 16; i++) if (Math.abs(e[i] - I[i]) > 1e-9) return false;
  return true;
}

/**
 * Compact indexed geometry of one bucket: Int16 positions relative to a centre in units of a power-of-two quantum q
 * (identical vertices of neighbouring chunks with the same quantum land on the same grid point), Int8 normals,
 * Float32 uv (metres, may exceed 0..1).
 */
function compactGeometry(B, res) {
  const nv = B.nv, I0 = B.ix[0].n, I1 = B.ix[1].n, nIdx = I0 + I1 + B.ix[2].n;
  if (!nv || !nIdx) return null;
  const A = B.vtx;
  let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
  for (let i = 0, o = 0; i < nv; i++, o += 8) {
    const x = A[o], y = A[o + 1], z = A[o + 2];
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; if (z < z0) z0 = z; if (z > z1) z1 = z;
  }
  if (!(x1 >= x0) || !(y1 >= y0) || !(z1 >= z0)) return null; // only NaN positions
  const half = Math.max(x1 - x0, y1 - y0, z1 - z0, 1e-3) / 2;
  const q = Math.max(2 ** Math.ceil(Math.log2(half / 32000)), 2 ** -16), iq = 1 / q;
  const cx = Math.round((x0 + x1) / 2 * iq), cy = Math.round((y0 + y1) / 2 * iq), cz = Math.round((z0 + z1) / 2 * iq);
  const pa = new Int16Array(nv * 4), na = new Int8Array(nv * 4), ua = new Float32Array(nv * 2);
  for (let i = 0, o = 0; i < nv; i++, o += 8) {
    const p = i * 4;
    pa[p] = Math.round(A[o] * iq) - cx || 0; pa[p + 1] = Math.round(A[o + 1] * iq) - cy || 0; pa[p + 2] = Math.round(A[o + 2] * iq) - cz || 0;
    na[p] = Math.round(A[o + 3] * 127) || 0; na[p + 1] = Math.round(A[o + 4] * 127) || 0; na[p + 2] = Math.round(A[o + 5] * 127) || 0;
    ua[i * 2] = A[o + 6]; ua[i * 2 + 1] = A[o + 7];
  }
  const ia = nv < 65536 ? new Uint16Array(nIdx) : new Uint32Array(nIdx);
  ia.set(B.ix[0].a.subarray(0, I0), 0); ia.set(B.ix[1].a.subarray(0, I1), I0); ia.set(B.ix[2].a.subarray(0, B.ix[2].n), I0 + I1);
  const lod = [I0, I0 + I1, nIdx];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pa, 4));
  geo.setAttribute('normal', new THREE.BufferAttribute(na, 4, true));
  geo.setAttribute('uv', new THREE.BufferAttribute(ua, 2));
  geo.setIndex(new THREE.BufferAttribute(ia, 1));
  // bounds in the quantised local frame (no pass over the attributes)
  geo.boundingBox = new THREE.Box3(new THREE.Vector3(Math.floor(x0 * iq) - cx - 1, Math.floor(y0 * iq) - cy - 1, Math.floor(z0 * iq) - cz - 1),
    new THREE.Vector3(Math.ceil(x1 * iq) - cx + 1, Math.ceil(y1 * iq) - cy + 1, Math.ceil(z1 * iq) - cz + 1));
  geo.boundingSphere = geo.boundingBox.getBoundingSphere(new THREE.Sphere());
  // never read on the CPU again: free the arrays once they are on the GPU (see World.uploadStep)
  for (const a of [geo.attributes.position, geo.attributes.normal, geo.attributes.uv, geo.index]) a.onUpload(releaseArray);
  res.tris += nIdx / 3;
  res.bytes += pa.byteLength + na.byteLength + ua.byteLength + ia.byteLength;
  const out = { geo, q, cx: cx * q, cy: cy * q, cz: cz * q, lod, material: B.material, cast: B.cast, receive: B.receive, order: B.order };
  B.vtx = B.ix = null;
  return out;
}


/** Exterior instanced details made of tiny instances (rivet heads) are hidden beyond TINY_INST.d from their box. */
function registerExteriorInstances(world) {
  world.exterior.traverse((o) => {
    if (!o.isInstancedMesh || o.userData.noMerge) return;
    const g = o.geometry;
    if (!g.boundingSphere) g.computeBoundingSphere();
    const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    let maxScale = 0;
    for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m); m.decompose(p, q, s); maxScale = Math.max(maxScale, s.x, s.y, s.z); }
    if (g.boundingSphere.radius * maxScale >= TINY_INST.r) return;
    o.updateWorldMatrix(true, false);
    o.computeBoundingBox();
    _box.copy(o.boundingBox).applyMatrix4(o.matrixWorld);
    world.extChunks.push({ mesh: o, x0: _box.min.x, x1: _box.max.x, y0: _box.min.y, y1: _box.max.y, z0: _box.min.z, z1: _box.max.z, lod: null, far: TINY_INST.d });
  });
}


export { DECK_Y, DECK_ORDER };
