// People – passengers and crew of April 1912 walking about the ship.
//
// Figures: rigid body parts (parts.js) posed procedurally (anim.js), drawn with one InstancedMesh per part type and
// a single material; per-person colours come from a palette texture (one row per person, see figures.js), looked up
// in the vertex shader by the vertex's slot and the instance's person id. Draw calls: one per part type
// (16 on phones, 23 otherwise), independent of the number of people.
//
// Behaviour: once the ship's layout exists (the deck modules run after this module), lanes are searched in the open
// decks, public rooms, corridors and machinery spaces (routes.js, time-sliced, nearest areas first). People walk back
// and forth along their lane, pause, look around, face the sea at the rail, step aside or wait for others and the
// player. Only people near the player are simulated; the nearest are drawn (instance pool per tier, hysteresis).
// Interior people are shown only while their deck zone is loaded and visible.
import * as THREE from 'three';
import { TIER } from '../core/tier.js';
import { ZONE_LEN, deckAtY, DECK_ORDER } from '../core/constants.js';
import { buildParts, NSLOT } from './parts.js';
import { makePerson, makeCaptain, partNames, MI_KEYS, rng } from './figures.js';
import { posePerson } from './anim.js';
import { partFor } from './parts.js';
import { defineAreas, searchLanes, lanePoint, sideOk } from './routes.js';

const MAX_AGENTS = 900;
const PAIRED = new Set(['uArm', 'fArm', 'thigh', 'shin', 'foot']);
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const WALK = 0, PAUSE = 1;

// one material for every figure (created once)
let MAT = null;
const PAL = { value: null };
function material() {
  if (MAT) return MAT;
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uPal = PAL;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float slot;\nattribute float pid;\nuniform highp sampler2D uPal;\nvarying vec4 vPal;')
      .replace('#include <color_vertex>', '#include <color_vertex>\n\tvPal = texelFetch( uPal, ivec2( int( slot + 0.5 ), int( pid + 0.5 ) ), 0 );');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec4 vPal;')
      .replace('#include <color_fragment>', '#include <color_fragment>\n\tdiffuseColor.rgb *= vPal.rgb;')
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = abs( vPal.a );')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = vPal.a < 0.0 ? 1.0 : 0.0;');
  };
  m.customProgramCacheKey = () => 'titanicPeople1';
  MAT = m;
  return m;
}

export async function build(world) {
  const fine = Math.max(0, Math.min(3, TIER.fine ?? 3));
  const CAP = [8, 16, 40, 80][fine];
  const RANGE = [25, 35, 45, 45][fine];
  const mat = material();
  // palette: NSLOT colours per person (linear rgb, alpha = roughness, negative = metal)
  const palData = new Float32Array(NSLOT * 4 * MAX_AGENTS);
  const palTex = new THREE.DataTexture(palData, NSLOT, MAX_AGENTS, THREE.RGBAFormat, THREE.FloatType);
  palTex.minFilter = palTex.magFilter = THREE.NearestFilter;
  palTex.generateMipmaps = false;
  palTex.needsUpdate = true;
  PAL.value = palTex;

  // ---- instanced part meshes
  const geos = buildParts(fine);
  const group = new THREE.Group();
  group.name = 'people';
  const meshes = [], meshIdx = {}, caps = [], cnt = [], pids = [];
  for (const [name, gb] of Object.entries(geos)) {
    const g = gb.toGeometry();
    const cap = CAP * (PAIRED.has(name) ? 2 : 1);
    const pid = new THREE.InstancedBufferAttribute(new Float32Array(cap), 1);
    pid.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('pid', pid);
    const mesh = new THREE.InstancedMesh(g, mat, cap);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.count = 0;
    mesh.visible = false;
    mesh.frustumCulled = false; // culled by our own distance selection
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    mesh.name = 'people:' + name;
    mesh.userData.noMerge = true;
    mesh.raycast = () => {};
    meshIdx[name] = meshes.length;
    meshes.push(mesh); caps.push(cap); cnt.push(0); pids.push(pid);
    group.add(mesh);
  }
  world.scene.add(group);

  const crowd = new Crowd(world, { fine, CAP, RANGE, meshes, meshIdx, caps, cnt, pids, palData, palTex });
  world.people = crowd; // for debugging / tests
  let night = !!world.state?.night;
  world.onTimeChange?.((n) => { night = !!n; crowd.night = night; });
  crowd.night = night;
  return { update: (dt, t) => crowd.update(dt, t) };
}

class Crowd {
  constructor(world, o) {
    Object.assign(this, o);
    this.world = world;
    this.agents = [];
    this.lanes = [];
    this.stats = { areas: 0, lanesKept: 0, lanesDropped: 0, initMs: 0, updateMs: 0, drawn: 0, active: 0 };
    this.ready = false;
    this._gen = null;
    this._wait = 0;
    this._sel = 0;
    this.active = [];
    this.drawn = [];
    this._cand = [];
    this._pt = { x: 0, z: 0 };
    this.night = false;
    this._zones = null;
    const self = this;
    this.writer = {
      pid: 0,
      put(m, M, sx, sy, sz) {
        const c = self.cnt[m];
        if (c >= self.caps[m]) return;
        const a = self.meshes[m].instanceMatrix.array, o = c * 16;
        a[o] = M[0] * sx; a[o + 1] = M[1] * sx; a[o + 2] = M[2] * sx; a[o + 3] = 0;
        a[o + 4] = M[4] * sy; a[o + 5] = M[5] * sy; a[o + 6] = M[6] * sy; a[o + 7] = 0;
        a[o + 8] = M[8] * sz; a[o + 9] = M[9] * sz; a[o + 10] = M[10] * sz; a[o + 11] = 0;
        a[o + 12] = M[12]; a[o + 13] = M[13]; a[o + 14] = M[14]; a[o + 15] = 1;
        self.pids[m].array[c] = this.pid;
        self.cnt[m] = c + 1;
      },
    };
  }

  // ------------------------------------------------------------ lazy set-up (time-sliced)

  *_init() {
    const w = this.world, t0 = now();
    const areas = defineAreas(w);
    const cam = w.camera?.position;
    if (cam) areas.sort((a, b) => dist2(a, cam) - dist2(b, cam));
    this.stats.areas = areas.length;
    // zone lookup per deck (no string keys per frame)
    this._zones = {};
    for (const d of DECK_ORDER) this._zones[d] = [];
    for (const g of w.zones.values()) {
      const u = g.userData, i = Math.floor((u.x0 + 1) / ZONE_LEN) + 8;
      if (this._zones[u.deck] && i >= 0) this._zones[u.deck][i] = g;
    }
    let ai = 0, captain = false;
    for (const area of areas) {
      ai++;
      yield* searchLanes(w, area);
      this.stats.lanesKept += area.lanes.length;
      this.stats.lanesDropped += area.dropped || 0;
      let li = 0;
      for (const L of area.lanes) {
        li++;
        L.id = this.lanes.length;
        this.lanes.push(L);
        const r = rng(ai * 7919 + li * 131 + 17);
        const want = L.len * area.dens;
        let n = Math.floor(want) + (r() < want - Math.floor(want) ? 1 : 0);
        if (L.len > 6 && n === 0) n = 1;
        n = Math.min(n, Math.max(1, Math.floor(L.len / 2.2)));
        for (let k = 0; k < n && this.agents.length < MAX_AGENTS; k++) {
          let type = pickType(area.mix, r());
          let p = makePerson(type, ai * 100003 + li * 1009 + k * 13 + 1);
          if (area.kind === 'bridge' && !captain && type === 'officer') { captain = true; makeCaptain(p); }
          this._spawn(p, L, area, r);
        }
        yield;
      }
    }
    this.stats.initMs = Math.round(now() - t0);
    this.ready = true;
  }

  _spawn(p, L, area, r) {
    const id = this.agents.length;
    const nm = partNames(p, this.fine, partFor);
    const mi = {};
    for (const k of MI_KEYS) { const n = nm[k]; mi[k] = n && this.meshIdx[n] !== undefined ? this.meshIdx[n] : -1; }
    this.palData.set(p.pal, id * NSLOT * 4);
    this.palTex.needsUpdate = true;
    const a = {
      id, p, mi, L, s: L.a0 + r() * (L.a1 - L.a0), dir: r() < 0.5 ? 1 : -1, lat: 0, latBase: 0, latT: 0,
      v: 0, mode: r() < 0.5 ? PAUSE : WALK, timer: r() * 6, target: 0, yaw: 0, yawT: 0, phase: r(), wk: 0, strideK: 1,
      shiftPh: r() * 6.28, look: 0, lookT: 0, lookP: 0, lookTimer: r() * 3, pose: p.pose, seed: r() * 100, cane: p.cane,
      x: 0, y: L.y, z: 0, drawn: false, act: false, block: 0, linger: 0, rest: 0,
      loiter: r() < (area.ext ? 0.35 : 0.25), nightOff: !(p.cls === 'crew') && r() < (area.ext ? 0.8 : 0.35), rnd: rng(id * 31 + 7),
      rail: L.rail,
    };
    if (p.cls === 'crew' && L.ext) a.nightOff = r() < 0.3;
    const base = (r() - 0.5) * 0.5;
    a.latBase = sideOk(L, a.s, base) ? base : 0;
    a.lat = a.latT = a.latBase;
    a.target = this._newTarget(a);
    a.yaw = a.yawT = laneYaw(L, a.dir);
    if (a.mode === PAUSE) this._restYaw(a);
    a.yaw = a.yawT;
    lanePoint(L, a.s, a.lat, a);
    this.agents.push(a);
  }

  _newTarget(a) {
    const L = a.L, r = a.rnd;
    let t = L.a0 + r() * (L.a1 - L.a0);
    if (Math.abs(t - a.s) < 2.5) t = a.s + (t >= a.s ? 2.5 : -2.5);
    t = Math.max(L.a0, Math.min(L.a1, t));
    a.dir = t >= a.s ? 1 : -1;
    return t;
  }

  /** Standing still: face the sea at the rail, else somewhere around the lane direction. */
  _restYaw(a) {
    const r = a.rnd;
    if (a.rail && r() < 0.65) a.yawT = a.rail > 0 ? -Math.PI / 2 + (r() - 0.5) * 0.5 : Math.PI / 2 + (r() - 0.5) * 0.5;
    else a.yawT = laneYaw(a.L, a.dir) + (r() - 0.5) * 2.4;
  }

  // ------------------------------------------------------------ per frame

  update(dt, t) {
    const w = this.world;
    if (!w.camera) return;
    dt = Math.min(Math.max(dt || 0, 0), 0.1);
    const t0 = now();
    if (!this.ready) {
      const has = (w.rooms?.length || 0) > 0;
      this._wait += dt;
      if (!this._gen && (has || this._wait > 4)) this._gen = this._init();
      if (this._gen) {
        const budget = this.fine === 0 ? 2 : 3;
        while (now() - t0 < budget) { if (this._gen.next().done) { this._gen = null; break; } }
      }
    }
    if (!this.agents.length) { this._flush(); return; }
    this._sel -= dt;
    if (this._sel <= 0) { this._sel = 0.25; this._select(); }
    const act = this.active, cam = w.camera.position, feet = cam.y - 1.62;
    this._hash();
    for (let i = 0; i < act.length; i++) this._step(act[i], dt, t, cam, feet);
    // draw
    for (let m = 0; m < this.cnt.length; m++) this.cnt[m] = 0;
    const dr = this.drawn;
    let n = 0;
    for (let i = 0; i < dr.length; i++) {
      const a = dr[i];
      if (!a.L.ext && !this._zoneOk(a)) continue;
      this.writer.pid = a.id;
      posePerson(a, t, this.writer);
      n++;
    }
    this.stats.drawn = n;
    this._flush();
    this.stats.updateMs = now() - t0;
  }

  /** Spatial hash of the simulated people (3 m cells per deck level) for the look-ahead. */
  _hash() {
    const act = this.active, H = this._head || (this._head = new Int32Array(HASH)), N = this._next && this._next.length >= act.length ? this._next : (this._next = new Int32Array(MAX_AGENTS));
    H.fill(-1);
    for (let i = 0; i < act.length; i++) {
      const a = act[i], k = hkey(Math.floor(a.x / 3), Math.floor(a.z / 3), a.y);
      N[i] = H[k]; H[k] = i;
    }
  }

  _flush() {
    for (let m = 0; m < this.meshes.length; m++) {
      const mesh = this.meshes[m], c = this.cnt[m];
      if (mesh.count !== c) mesh.count = c;
      mesh.visible = c > 0;
      if (c > 0) {
        mesh.instanceMatrix.clearUpdateRanges(); mesh.instanceMatrix.addUpdateRange(0, c * 16); mesh.instanceMatrix.needsUpdate = true;
        const p = this.pids[m]; p.clearUpdateRanges(); p.addUpdateRange(0, c); p.needsUpdate = true;
      }
    }
  }

  _zoneOk(a) {
    const zs = this._zones[a.L.deck];
    const g = zs && zs[Math.floor((a.x + 1e-6) / ZONE_LEN) + 8];
    if (!g || !g.visible) return false;
    const u = g.userData;
    if (u.loading) return false;
    return u.chunks ? u.chunks.length > 0 : g.children.length > 0;
  }

  /** Which people are simulated (near) and drawn (nearest, eligible). */
  _select() {
    const w = this.world, cam = w.camera.position, st = w.state || {};
    const camDeck = deckAtY(cam.y - 1.6), inside = !!st.inside, extVis = w.exterior ? w.exterior.visible !== false : true;
    const R = this.RANGE, R2 = (R + 12) * (R + 12);
    const act = this.active, cand = this._cand;
    act.length = 0; cand.length = 0;
    for (const a of this.agents) {
      a.act = false;
      if (this.night && a.nightOff) { a.drawn = false; continue; }
      const dx = a.x - cam.x, dz = a.z - cam.z, dy = (a.y + 1) - cam.y;
      const d2 = dx * dx + dz * dz + dy * dy * 4;
      if (d2 > R2) { a.drawn = false; continue; }
      a.act = true; act.push(a);
      let ok;
      if (a.L.ext) ok = extVis && (!inside || a.L.deck === camDeck);
      else ok = a.L.deck === camDeck && this._zoneOk(a);
      const d = Math.sqrt(d2);
      if (!ok || d > (a.drawn ? R * 1.1 : R)) { a.drawn = false; continue; }
      a._score = d - (a.drawn ? 5 : 0);
      cand.push(a);
    }
    // nearest CAP (insertion into a sorted prefix; candidates are few)
    const dr = this.drawn;
    dr.length = 0;
    for (const a of cand) {
      if (dr.length < this.CAP) dr.push(a);
      else if (a._score < dr[dr.length - 1]._score) dr[dr.length - 1] = a;
      else continue;
      for (let i = dr.length - 1; i > 0 && dr[i]._score < dr[i - 1]._score; i--) { const q = dr[i]; dr[i] = dr[i - 1]; dr[i - 1] = q; }
    }
    for (const a of cand) a.drawn = false;
    for (const a of dr) a.drawn = true;
    this.stats.active = act.length;
  }

  _step(a, dt, t, cam, feet) {
    const L = a.L, p = a.p, r = a.rnd;
    let vDes = 0;
    a.shiftPh += dt * 0.55;
    // what is in front (others, the player)
    let lookPlayer = false;
    if (a.mode === WALK) {
      const fx = L.axis === 'x' ? a.dir : 0, fz = L.axis === 'x' ? 0 : a.dir; // walking direction
      const rx = -fz, rz = fx;                                                  // its right
      let fMin = 9, oncoming = false, bv = 0, bl = 0;
      const act = this.active, H = this._head, N = this._next;
      const cx0 = Math.floor(a.x / 3), cz0 = Math.floor(a.z / 3);
      for (let q = 0; q < 9; q++) for (let i = H[hkey(cx0 + (q % 3) - 1, cz0 + ((q / 3) | 0) - 1, a.y)]; i >= 0; i = N[i]) {
        const b = act[i];
        if (b === a || Math.abs(b.y - a.y) > 0.5) continue;
        const dx = b.x - a.x, dz = b.z - a.z;
        if (dx * dx + dz * dz > 6.5) continue;
        const f = dx * fx + dz * fz, l = dx * rx + dz * rz;
        if (f < 0.05 || f > 2.3 || Math.abs(l) > 0.66 || f >= fMin) continue;
        fMin = f; bl = l;
        const bfx = b.L.axis === 'x' ? b.dir : 0, bfz = b.L.axis === 'x' ? 0 : b.dir;
        oncoming = b.mode !== WALK || bfx * fx + bfz * fz < 0.3;
        bv = b.mode === WALK ? b.v : 0;
      }
      let player = false;
      if (Math.abs(feet - a.y) < 1.0) {
        const dx = cam.x - a.x, dz = cam.z - a.z, f = dx * fx + dz * fz, l = dx * rx + dz * rz;
        if (f > 0.05 && f < 2.6 && Math.abs(l) < 0.75 && f < fMin) { fMin = f; bl = l; oncoming = true; bv = 0; player = true; }
        if (dx * dx + dz * dz < 16) lookPlayer = true;
      }
      vDes = p.speed * (a.loiter ? 0.85 : 1);
      const rs = L.axis === 'x' ? a.dir : -a.dir; // lane offset sign of "right"
      if (fMin < 9) {
        if (oncoming) {
          // pass on the right (or the left if the right side is blocked); else slow down and wait
          const side = bl > 0.15 ? -1 : 1;
          const want = rs * side * 0.42;
          if (sideOk(L, a.s, want) && sideOk(L, a.s + a.dir * 1.2, want)) a.latT = want;
          else if (sideOk(L, a.s, -want) && sideOk(L, a.s + a.dir * 1.2, -want)) a.latT = -want;
          else vDes = fMin < (player ? 1.4 : 1.0) ? 0 : vDes * 0.35;
          if (fMin < (player ? 1.1 : 0.75)) vDes = 0;
        } else {
          if (fMin < 1.4) vDes = Math.min(vDes, bv * 0.95);
          if (fMin < 0.8) vDes = 0;
        }
        a.linger = 1.5;
      } else if ((a.linger -= dt) <= 0) a.latT = a.latBase;
      if (vDes < 0.05) {
        a.block += dt;
        if (a.block > 2.5 + (a.id % 5) * 0.4) { a.block = 0; a.target = this._newTarget(a); a.dir = a.target >= a.s ? 1 : -1; a.target = a.dir > 0 ? Math.max(a.target, a.s + 2) : Math.min(a.target, a.s - 2); a.target = Math.max(L.a0, Math.min(L.a1, a.target)); }
      } else a.block = 0;
      a.yawT = laneYaw(L, a.dir);
      // turn on the spot first
      const dy = angDiff(a.yawT, a.yaw);
      if (Math.abs(dy) > 0.7) vDes = 0;
    } else {
      a.timer -= dt;
      if (Math.abs(feet - a.y) < 1.0) { const dx = cam.x - a.x, dz = cam.z - a.z; if (dx * dx + dz * dz < 12) lookPlayer = true; }
      if (a.timer <= 0) { a.mode = WALK; a.target = this._newTarget(a); }
    }
    // speed, position
    const acc = vDes > a.v ? 1.6 : 3.5;
    a.v += Math.max(-acc * dt, Math.min(acc * dt, vDes - a.v));
    if (a.v < 0.001) a.v = 0;
    if (a.mode === WALK && a.v > 0) {
      const ns = Math.max(L.a0, Math.min(L.a1, a.s + a.dir * a.v * dt));
      if (sideOk(L, ns, a.lat)) a.s = ns; else a.latT = 0; // first back to the lane's centre line
      if ((a.target - a.s) * a.dir <= 0.02 || a.s <= L.a0 || a.s >= L.a1) {
        a.mode = PAUSE;
        a.timer = a.loiter ? 12 + r() * 40 : 1.5 + r() * 6;
        this._restYaw(a);
      }
      a.phase = (a.phase + (a.v * dt) / Math.max(0.3, p.stride * p.s * a.strideK)) % 1;
    }
    // lateral offset (only where it is free)
    if (Math.abs(a.latT - a.lat) > 1e-3) {
      const step = Math.sign(a.latT - a.lat) * Math.min(Math.abs(a.latT - a.lat), 0.6 * dt);
      const nl = a.lat + step;
      if (Math.abs(nl) < Math.abs(a.lat) || sideOk(L, a.s, nl)) a.lat = nl;
    }
    if (!sideOk(L, a.s, a.lat)) a.lat = Math.sign(a.lat) * Math.max(0, Math.abs(a.lat) - 0.6 * dt);
    // heading
    const dyw = angDiff(a.yawT, a.yaw), turn = 2.6 * dt;
    a.yaw += Math.abs(dyw) < turn ? dyw : Math.sign(dyw) * turn;
    // walk blend, stride
    const vn = a.v / Math.max(0.3, p.speed);
    a.strideK = 0.55 + 0.45 * Math.min(1.2, vn);
    const wkT = Math.min(1, a.v / 0.45);
    a.wk += (wkT - a.wk) * Math.min(1, dt * 6);
    // turning on the spot: small steps
    if (a.mode === WALK && a.v < 0.05 && Math.abs(dyw) > 0.2) { a.phase = (a.phase + dt * 0.9) % 1; a.wk = Math.max(a.wk, 0.18); a.strideK = 0.4; }
    // head: look around / at the player
    a.lookTimer -= dt;
    if (a.lookTimer <= 0) { a.lookTimer = 1.5 + r() * 4; a.lookT = a.mode === WALK ? (r() - 0.5) * 0.6 : (r() - 0.5) * 1.6; a.lookPT = (r() - 0.6) * 0.15; }
    let lt = a.lookT;
    if (lookPlayer) {
      const want = Math.atan2(-(cam.z - a.z), cam.x - a.x);
      const d = angDiff(want, a.yaw);
      if (Math.abs(d) < 1.4) lt = d * 0.85;
    }
    const ld = lt - a.look;
    a.look += Math.sign(ld) * Math.min(Math.abs(ld), 1.6 * dt);
    a.lookP += ((a.lookPT || 0) - a.lookP) * Math.min(1, dt * 2);
    lanePoint(L, a.s, a.lat, a);
  }
}

// ------------------------------------------------------------ helpers

const HASH = 2048;
function hkey(cx, cz, y) { return ((Math.imul(cx, 73856093) ^ Math.imul(cz, 19349663) ^ Math.imul(Math.round(y), 83492791)) >>> 0) & (HASH - 1); }
function laneYaw(L, dir) { return L.axis === 'x' ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? -Math.PI / 2 : Math.PI / 2); }
function angDiff(a, b) { let d = (a - b) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; }
function dist2(area, p) {
  const x = Math.max(area.x0, Math.min(area.x1, p.x)), z = Math.max(area.z0, Math.min(area.z1, p.z));
  return (x - p.x) ** 2 + (z - p.z) ** 2 + ((area.y - p.y) * 3) ** 2;
}
function pickType(mix, u) {
  let s = 0;
  for (const [, w] of mix) s += w;
  let acc = 0;
  for (const [t, w] of mix) { acc += w / s; if (u <= acc) return t; }
  return mix[mix.length - 1][0];
}
