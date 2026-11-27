import * as THREE from 'three';
import { applyNightToMaterials, mats, lightingUniforms } from '../core/materials.js';
import { MACHINERY_X, DECK_Y, deckAboveY, deckAtY } from '../core/constants.js';
import { bakeLampVolume, createHalos, isExteriorLamp } from './shiplights.js';
import { createSky, createInteriorEnvMaterial } from './sky.js';
import { createOcean } from './ocean.js';
import { createSmoke } from './smoke.js';
import { createIceberg } from './iceberg.js';
import { createDust, DUST_LIGHTS } from './dust.js';
import { TIER } from '../core/tier.js';

// ENVIRONMENT & LIGHTING
// sky dome + stars, ocean + bow spray, sun / star light with camera-following shadows, interior lighting
// (pool of real lamp lights following world.lamps, low warm ambient, image-based "room" environment),
// furnace flicker, dust motes, funnel smoke, iceberg, and the per-situation colour grade / haze / bloom /
// AO / sun-shaft parameters of the post pipeline (world.post). Day/night: world.onTimeChange (2 s cross-fade),
// inside/outside: world.state.inside (0.6 s cross-fade). The number of lights never changes after build.

// ---- tunables -------------------------------------------------------------------------------
const SUN_DIR = new THREE.Vector3(0.5, 0.5, 0.72).normalize();   // afternoon sun, ~30 deg high, off the starboard bow
const STAR_DIR = new THREE.Vector3(0.18, 1.0, 0.12).normalize(); // diffuse star light from above
const SUN_COLOR = new THREE.Color(0xfff0dc);
const STAR_COLOR = new THREE.Color(0x7f96c8);
const SUN_INTENSITY = 3.3, STAR_INTENSITY = 0.22;
const HEMI_DAY = 0.5, HEMI_NIGHT = 0.5;
const ENV_DAY = 0.95, ENV_NIGHT = 0.8, ENV_INSIDE = 0.26, ENV_MACHINE = 0.2;
const FOG_DAY = 0.00016, FOG_NIGHT = 0.0004;
const AMB_FIRST = 0.05, AMB_OTHER = 0.045, AMB_MACHINE = 0.035;
const SHADOW_HALF = 55, SHADOW_DIST = 260, SHADOW_STEP = 9; // the map follows the camera in 9 m steps (3 m meant a full shadow pass every second or two of walking)
const LAMP_EVERY = 0.12;
// plain lamp lights + shadow-casting lamp lights (fixed counts, by device tier: 12 + 2 on desktop, 4 + 0 on phones; TIER.lamps is the total)
const SH_POOL = Math.max(0, TIER.lampShadows ?? 2), POOL = Math.max(1, (TIER.lamps ?? 12) - SH_POOL);
const LAMP_DAY_OUT = 0.6, LAMP_NIGHT_OUT = 14, LAMP_INSIDE = 9, LAMP_MACHINE = 1.35, VOL_NIGHT = 13;
const RANGE_INSIDE = 9, RANGE_OUT = 15, RANGE_MACHINE = 13;
const SH_RANGE = 9, SH_NEAR = 0.3, SH_EVERY = 0.1, SH_MAP = { niedrig: 256, mittel: 512, hoch: 512 };
const OTHER_ROOM = 5;   // squared-distance penalty of lamps outside the camera's room
const BUCKET = 8, BUCKET_X0 = -168, BUCKETS = 42, LAMP_SEARCH = 30;
// share of the sky light that reaches into the interior, per deck (windows / skylights / open doors)
const DAYLIGHT = { boat: 0.55, A: 0.45, B: 0.35, C: 0.16, D: 0.07, E: 0.03, F: 0.02, G: 0.015, orlop: 0.01, tank: 0.01 };

const smooth = (x) => x * x * (3 - 2 * x);
const lerp = (a, b, t) => a + (b - a) * t;
const approach = (v, target, step) => (v < target ? Math.min(target, v + step) : Math.max(target, v - step));
const C = (r, g, b) => new THREE.Color(r, g, b);
const WEATHER = {
  klar:   { fog: 1.0, sun: 1.0,  tint: C(0.60, 0.69, 0.79) },
  diesig: { fog: 3.2, sun: 0.85, tint: C(0.66, 0.72, 0.78) },
  nebel:  { fog: 9.0, sun: 0.55, tint: C(0.70, 0.75, 0.80) },
};

// ---- colour grade / post presets per situation -------------------------------------------------
function grade(o) {
  return {
    exposure: 1, contrast: 1.05, saturation: 1, vignette: 0.25, grain: 0.003,
    lift: C(0, 0, 0), gain: C(1, 1, 1), bloom: 0.1, bloomThreshold: 1.8, bloomKnee: 0.7,
    haze: 0, hazeMax: 0.3, hazeColor: C(0, 0, 0), aoStrength: 0.8, aoRadius: 0.7, aoIntensity: 1.2, rays: 0,
    aeKey: -2, aeMin: 1, aeMax: 1, aeStrength: 0, ...o,
  };
}
// auto exposure per situation (log2 scene luminance that needs no correction, correction limits, strength):
// small white cabins / corridors are exposed down so the paint keeps its relief, dark machinery spaces up
const AE_ROOM = { aeKey: -2.6, aeMin: 0.55, aeMax: 1.6, aeStrength: 0.55 };
const AE_MACHINE = { aeKey: -3.8, aeMin: 0.7, aeMax: 2.6, aeStrength: 0.65 };
const GRADES = {
  day: grade({ exposure: 1.0, contrast: 1.07, saturation: 1.03, vignette: 0.2, grain: 0.002, lift: C(0.0, 0.004, 0.012), gain: C(0.985, 1.0, 1.025), bloom: 0.08, bloomThreshold: 2.4, aoStrength: 0.65, aoRadius: 1.1, aoIntensity: 1.0, rays: 0.32 }),
  night: grade({ exposure: 1.55, contrast: 1.12, saturation: 0.92, vignette: 0.38, grain: 0.005, lift: C(0.0, 0.005, 0.016), gain: C(1.02, 0.99, 0.95), bloom: 0.2, bloomThreshold: 1.0, bloomKnee: 0.6, aoStrength: 0.6, aoRadius: 0.9 }),
  first: grade({ exposure: 1.3, contrast: 1.07, saturation: 1.02, vignette: 0.3, grain: 0.003, lift: C(0.012, 0.006, 0.0), gain: C(1.03, 0.995, 0.93), bloom: 0.14, bloomThreshold: 1.5, haze: 0.022, hazeMax: 0.22, hazeColor: C(0.11, 0.075, 0.042), aoStrength: 0.72, aoRadius: 0.95, aoIntensity: 1.15, ...AE_ROOM }),
  other: grade({ exposure: 1.25, contrast: 1.06, saturation: 0.9, vignette: 0.32, grain: 0.004, lift: C(0.004, 0.006, 0.007), gain: C(1.0, 1.0, 0.96), bloom: 0.12, bloomThreshold: 1.5, haze: 0.014, hazeMax: 0.18, hazeColor: C(0.07, 0.062, 0.05), aoStrength: 0.72, aoRadius: 0.85, aoIntensity: 1.15, ...AE_ROOM }),
  machine: grade({ exposure: 1.55, contrast: 1.1, saturation: 0.9, vignette: 0.38, grain: 0.006, lift: C(0.008, 0.008, 0.008), gain: C(1.02, 1.0, 0.95), bloom: 0.18, bloomThreshold: 1.3, haze: 0.022, hazeMax: 0.3, hazeColor: C(0.05, 0.044, 0.036), aoStrength: 0.70, aoRadius: 0.9, aoIntensity: 1.10, ...AE_MACHINE }),
  boiler: grade({ exposure: 1.6, contrast: 1.12, saturation: 0.98, vignette: 0.4, grain: 0.007, lift: C(0.016, 0.008, 0.002), gain: C(1.07, 0.96, 0.84), bloom: 0.24, bloomThreshold: 1.2, haze: 0.035, hazeMax: 0.38, hazeColor: C(0.085, 0.04, 0.015), aoStrength: 0.70, aoRadius: 0.9, aoIntensity: 1.10, ...AE_MACHINE }),
};
const NUM_KEYS = ['exposure', 'contrast', 'saturation', 'vignette', 'grain', 'bloom', 'bloomThreshold', 'bloomKnee', 'haze', 'hazeMax', 'aoStrength', 'aoRadius', 'aoIntensity', 'rays', 'aeKey', 'aeMin', 'aeMax', 'aeStrength'];
const COL_KEYS = ['lift', 'gain', 'hazeColor'];

export async function build(world) {
  const scene = world.scene;
  const renderer = world.renderer || null;

  const shared = { uNight: { value: 0 }, uSunDir: { value: SUN_DIR.clone() }, uTime: { value: 0 } };

  // ---------- sky, ocean, smoke, iceberg, dust ----------
  const sky = createSky(shared);
  const ocean = createOcean(shared);
  const smoke = createSmoke(shared, world);
  const berg = createIceberg();
  const dust = createDust(shared);
  const root = new THREE.Group();
  root.name = 'environment';
  root.userData.noMerge = true;
  root.add(sky.dome, sky.stars, ocean.mesh, ocean.spray, smoke.points, berg.mesh, dust.points);
  scene.add(root);

  // ---------- fog / background ----------
  const fogDay = new THREE.Color(0.60, 0.69, 0.79), fogNight = new THREE.Color(0.0035, 0.0055, 0.010);
  const fogDayCur = fogDay.clone();
  const fog = new THREE.FogExp2(fogDayCur.clone(), FOG_DAY);
  scene.fog = fog;
  const background = fogDay.clone();
  scene.background = background;

  // ---------- lights (the number of lights never changes after build) ----------
  const sun = new THREE.DirectionalLight(SUN_COLOR.clone(), SUN_INTENSITY);
  sun.name = 'sun';
  sun.castShadow = true;
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const bigShadow = renderer && renderer.capabilities.maxTextureSize >= 8192 && !coarse;
  let mapSize = 0;
  const sc = sun.shadow.camera;
  function setShadowSize(q) {
    if (!TIER.sunShadow) { sun.castShadow = false; return; }
    const want = q === 'hoch' && bigShadow ? Math.min(4096, TIER.sunShadow) : Math.min(2048, TIER.sunShadow);
    if (want === mapSize) return;
    mapSize = want;
    sun.shadow.mapSize.set(want, want);
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
    sun.shadow.needsUpdate = true;
    lastTx = NaN;
  }
  sc.left = -SHADOW_HALF; sc.right = SHADOW_HALF; sc.top = SHADOW_HALF; sc.bottom = -SHADOW_HALF;
  sc.near = 20; sc.far = SHADOW_DIST * 2;
  sc.updateProjectionMatrix();
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.06;
  sun.shadow.radius = 2.5;
  sun.shadow.autoUpdate = false;   // the ship is static: re-render only when the frustum moves (+ a slow refresh)
  sun.shadow.needsUpdate = true;
  sun.position.copy(SUN_DIR).multiplyScalar(SHADOW_DIST);
  scene.add(sun, sun.target);

  const hemiDaySky = new THREE.Color(0xa9c6f0), hemiDayGround = new THREE.Color(0x4a4840);
  // night: star light from above, warm bounce of the ship's own deck lighting from below
  const hemiNightSky = new THREE.Color(0x1c2a52), hemiNightGround = new THREE.Color(0x2a1d12);
  const hemi = new THREE.HemisphereLight(hemiDaySky.clone(), hemiDayGround.clone(), HEMI_DAY);
  hemi.name = 'skyLight';
  const ambWarm = new THREE.Color(0xffc68c), ambMachine = new THREE.Color(0xff9a52), ambOther = new THREE.Color(0xffd8b0);
  const interiorAmbient = new THREE.AmbientLight(ambWarm.clone(), 0); // electric light, ~2700 K
  interiorAmbient.name = 'interiorAmbient';
  scene.add(hemi, interiorAmbient);

  // pool of lamp lights, physically based inverse-square falloff with a soft range cut-off. The first SH_POOL lights
  // cast (cube-map) shadows: they take the strongest lamps of the camera's own room; their shadow maps are only
  // re-rendered when they move to another lamp, with only the zone meshes around them as casters.
  const slots = [];
  for (let i = 0; i < SH_POOL + POOL; i++) {
    const shadow = i < SH_POOL;
    const light = new THREE.PointLight(0xffd9a0, 0, RANGE_INSIDE, 2);
    light.name = (shadow ? 'lampShadow' : 'lampPool') + i;
    light.castShadow = shadow;
    if (shadow) {
      const s = light.shadow;
      s.mapSize.set(SH_MAP[world.quality] || 512, SH_MAP[world.quality] || 512);
      s.camera.near = SH_NEAR; s.camera.far = SH_RANGE;
      s.bias = -0.0015; s.normalBias = 0.045; s.radius = 2.5;
      s.autoUpdate = false; s.needsUpdate = false;
    }
    light.position.set(0, -50, 0);
    scene.add(light);
    slots.push({ light, shadow, lamp: -1, k: 0, want: false, base: 1, flick: 0, seed: i * 1.731, room: 1, roomT: 1, dirty: false });
  }
  const shSlots = slots.slice(0, SH_POOL), plainSlots = slots.slice(SH_POOL);

  // exterior lamps at night: baked volume + glow sprites (see shiplights.js)
  const halos = createHalos();
  scene.add(halos.points);

  // ---------- PBR environment maps ----------
  let envDay = null, envNight = null, envInside = null, envMachine = null;
  if (renderer) {
    try {
      const pmrem = new THREE.PMREMGenerator(renderer);
      const envScene = new THREE.Scene();
      const geo = new THREE.SphereGeometry(20, 48, 24);
      const ball = new THREE.Mesh(geo, sky.material);
      ball.frustumCulled = false;
      envScene.add(ball);
      sky.uniforms.uEnv.value = 1;
      shared.uNight.value = 0;
      envDay = pmrem.fromScene(envScene, 0.02, 0.1, 100).texture;
      const all = TIER.envMaps !== 'min'; // phones: one outside + one inside map
      shared.uNight.value = 1;
      envNight = all ? pmrem.fromScene(envScene, 0.02, 0.1, 100).texture : envDay;
      const insideMat = createInteriorEnvMaterial(0);
      ball.material = insideMat;
      envInside = pmrem.fromScene(envScene, 0.03, 0.1, 100).texture;
      insideMat.uniforms.uKind.value = 1;
      envMachine = all ? pmrem.fromScene(envScene, 0.03, 0.1, 100).texture : envInside;
      sky.uniforms.uEnv.value = 0;
      shared.uNight.value = 0;
      pmrem.dispose(); geo.dispose(); insideMat.dispose();
      scene.environment = envDay;
      scene.environmentIntensity = ENV_DAY;
    } catch (e) {
      sky.uniforms.uEnv.value = 0;
      shared.uNight.value = 0;
      envDay = envNight = envInside = envMachine = null;
      console.warn('[environment] PMREM failed', e);
    }
  }

  // ---------- state ----------
  let time = 0;
  let nightTarget = world.state.night ? 1 : 0, nightLin = nightTarget, first = true;
  let insideLin = world.state.inside ? 1 : 0;
  let daylight = 1, machineLin = 0, firstLin = 0, fireLin = 0;
  let weatherTarget = world.state.weather || 'klar';
  let fogScale = WEATHER[weatherTarget]?.fog ?? 1.0;
  let sunWeather = WEATHER[weatherTarget]?.sun ?? 1.0;
  if (WEATHER[weatherTarget]) fogDayCur.copy(WEATHER[weatherTarget].tint);
  world.onTimeChange((night) => {
    nightTarget = night ? 1 : 0;
    if (first) { first = false; nightLin = nightTarget; }
    applyNightToMaterials(!!night);
  });
  world.onWeatherChange((m) => { if (WEATHER[m]) weatherTarget = m; });

  // grade state (current values, blended towards the situation targets)
  const cur = grade({});
  for (const k of NUM_KEYS) cur[k] = GRADES.day[k];
  for (const k of COL_KEYS) cur[k].copy(GRADES.day[k]);
  const tgt = grade({});
  let gradeInit = false;

  // ---------- shadow frustum following the camera ----------
  const right = new THREE.Vector3(), upv = new THREE.Vector3(), dir = new THREE.Vector3(), tgtV = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);
  let lastTx = NaN, lastTz = NaN, lastDir = -1, shadowTimer = 0, shadowStale = true;
  setShadowSize(world.quality || 'hoch');
  function updateSun(cam, n, ins, dt, hold) {
    const dirKey = n < 0.5 ? 0 : 1;
    const tx = Math.round(cam.x / SHADOW_STEP) * SHADOW_STEP, tz = Math.round(cam.z / SHADOW_STEP) * SHADOW_STEP;
    let need = false;
    if (tx !== lastTx || tz !== lastTz || dirKey !== lastDir) {
      lastTx = tx; lastTz = tz; lastDir = dirKey;
      dir.copy(dirKey ? STAR_DIR : SUN_DIR);
      right.crossVectors(UP, dir).normalize();
      upv.crossVectors(dir, right).normalize();
      tgtV.set(tx, Math.min(Math.max(cam.y, 12), 34), tz);
      // snap to shadow-map texels in light space so the shadow edges do not crawl
      const texel = (2 * SHADOW_HALF) / mapSize;
      const px = Math.round(tgtV.dot(right) / texel) * texel, py = Math.round(tgtV.dot(upv) / texel) * texel, pd = tgtV.dot(dir);
      tgtV.set(0, 0, 0).addScaledVector(right, px).addScaledVector(upv, py).addScaledVector(dir, pd);
      sun.target.position.copy(tgtV);
      sun.position.copy(tgtV).addScaledVector(dir, SHADOW_DIST);
      sun.color.copy(dirKey ? STAR_COLOR : SUN_COLOR);
      need = true;
    }
    // something big is moving outside (a lifeboat on its falls): refresh twice a second while it does
    const busy = world.shadowBusy > 0;
    if (busy) { world.shadowBusy -= dt; shadowTimer = Math.min(shadowTimer, 0.5); }
    shadowTimer -= dt;
    if (shadowTimer <= 0) need = true;
    // deep inside the hull the sun does not matter: skip the shadow-map pass, refresh once when it does again
    const skip = ins > 0.98 && daylight < 0.25;
    if (skip || hold) { if (need) shadowStale = true; }
    else if (need || shadowStale) { sun.shadow.needsUpdate = true; shadowTimer = busy ? 0.5 : dirKey ? 15 : 12; shadowStale = false; } // slow refresh (was twice a second: a periodic hitch on desktops)
    const dayK = Math.max(0, 1 - 2 * n), nightK = Math.max(0, 2 * n - 1);
    sun.intensity = (SUN_INTENSITY * dayK * sunWeather + STAR_INTENSITY * nightK) * lerp(1, daylight * 0.5, ins);
    return SUN_INTENSITY * dayK * sunWeather;
  }

  // ---------- lamp pool ----------
  let lampCount = -1;
  let bucketStart = new Int32Array(BUCKETS + 1), bucketItems = new Int32Array(0);
  let lampRoom = new Int32Array(0), lampExt = new Uint8Array(0);
  const NB = POOL + SH_POOL;
  const bestI = new Int32Array(NB), bestD = new Float32Array(NB), taken = new Uint8Array(NB);
  const pending = new Int32Array(NB), shWant = new Int32Array(SH_POOL), shPending = new Int32Array(SH_POOL);
  let nBest = 0, nPending = 0, nShWant = 0, nShPending = 0, lampTimer = 0, camRoom = -1, camDeck = 'boat';
  const bucketOf = (x) => Math.max(0, Math.min(BUCKETS - 1, Math.floor((x - BUCKET_X0) / BUCKET)));
  const tmpC = new THREE.Color(), tmpC2 = new THREE.Color();
  const inMachinery = (x, y) => x > MACHINERY_X[0] && x < MACHINERY_X[1] && y < DECK_Y.F;

  // rooms (world.rooms, filled by the interior kit) per deck, for "which room is this point in"
  let roomsByDeck = null, roomCount = -1;
  function indexRooms() {
    const rooms = world.rooms || [];
    roomCount = rooms.length;
    roomsByDeck = {};
    rooms.forEach((r, i) => { (roomsByDeck[r.deck] ||= []).push(i); });
  }
  function roomOf(deck, x, z) {
    const list = roomsByDeck?.[deck];
    if (!list) return -1;
    const rooms = world.rooms;
    let best = -1, bestA = Infinity;
    for (const i of list) {
      const r = rooms[i];
      if (x < r.x0 - 0.05 || x > r.x1 + 0.05 || z < r.z0 - 0.05 || z > r.z1 + 0.05) continue;
      const a = (r.x1 - r.x0) * (Math.min(r.z1, 30) - Math.max(r.z0, -30));
      if (a < bestA) { bestA = a; best = i; }
    }
    return best;
  }
  const lampDeck = (L) => (inMachinery(L.x, L.y) ? 'tank' : deckAtY(L.y - 0.5));

  let otherK = 0.5;
  function indexLamps() { // only when the number of lamps / rooms changed
    const lamps = world.lamps;
    lampCount = lamps.length;
    if ((world.rooms?.length ?? 0) !== roomCount) indexRooms();
    bucketStart.fill(0);
    if (bucketItems.length < lampCount) bucketItems = new Int32Array(lampCount + 256);
    for (let i = 0; i < lampCount; i++) bucketStart[bucketOf(lamps[i].x) + 1]++;
    for (let b = 0; b < BUCKETS; b++) bucketStart[b + 1] += bucketStart[b];
    const cursor = bucketStart.slice(0, BUCKETS);
    for (let i = 0; i < lampCount; i++) bucketItems[cursor[bucketOf(lamps[i].x)]++] = i;
    lampRoom = new Int32Array(lampCount); lampExt = new Uint8Array(lampCount);
    for (let i = 0; i < lampCount; i++) {
      const L = lamps[i];
      lampExt[i] = isExteriorLamp(L) ? 1 : 0;
      lampRoom[i] = lampExt[i] ? -2 : roomOf(lampDeck(L), L.x, L.z);
    }
    for (const s of slots) if (s.lamp >= lampCount) { s.lamp = -1; s.want = false; }
  }

  function selectLamps(cam, n, ins) {
    const lamps = world.lamps;
    if (lamps.length !== lampCount || (world.rooms?.length ?? 0) !== roomCount) indexLamps();
    nBest = 0;
    // only lamps of the camera's own deck: lamps under the floor / above the ceiling would leak
    camDeck = inMachinery(cam.x, cam.y - 1.2) ? 'tank' : (world.state.deck in DECK_Y ? world.state.deck : 'boat');
    camRoom = ins > 0.5 ? roomOf(camDeck, cam.x, cam.z) : -1;
    const y0 = DECK_Y[camDeck] - 0.25, y1 = deckAboveY(camDeck) + 0.1;
    const vK = camDeck === 'tank' ? 1.5 : 4;            // other heights count several times as far (tall machinery spaces less)
    const skipExt = n > 0.5;                            // at night the exterior lamps come from the baked volume
    let roomOff = false, roomOn = false;
    const j0 = bucketStart[bucketOf(cam.x - LAMP_SEARCH)], j1 = bucketStart[bucketOf(cam.x + LAMP_SEARCH) + 1];
    for (let j = j0; j < j1; j++) {
      const idx = bucketItems[j], L = lamps[idx];
      if (L.y < y0 || L.y > y1) continue;
      if (skipExt && lampExt[idx]) continue;
      if (L.off) { if (camRoom >= 0 && lampRoom[idx] === camRoom) roomOff = true; continue; } // switched off by the visitor (app/fixtures.js)
      if (camRoom >= 0 && lampRoom[idx] === camRoom) roomOn = true;
      const dx = L.x - cam.x, dy = (L.y - cam.y) * vK, dz = L.z - cam.z;
      let d = dx * dx + dy * dy + dz * dz;
      if (camRoom >= 0 && lampRoom[idx] !== camRoom) d *= OTHER_ROOM;
      if (d > 1500) continue;
      if (nBest < NB || d < bestD[nBest - 1]) {
        let p = nBest < NB ? nBest++ : NB - 1;
        while (p > 0 && bestD[p - 1] > d) { bestD[p] = bestD[p - 1]; bestI[p] = bestI[p - 1]; p--; }
        bestD[p] = d; bestI[p] = idx;
      }
    }
    // shadow lights: the nearest lamps of the camera's own room (indoors only)
    nShWant = 0;
    if (ins > 0.5) {
      for (let q = 0; q < nBest && nShWant < SH_POOL; q++) {
        const idx = bestI[q];
        if (bestD[q] > 64 || lampExt[idx]) continue;
        if (camRoom >= 0 && lampRoom[idx] !== camRoom) continue;
        shWant[nShWant++] = idx;
      }
    }
    const isSh = (idx) => { for (let q = 0; q < nShWant; q++) if (shWant[q] === idx) return true; return false; };
    // shadow slots keep their lamp if still wanted
    nShPending = 0;
    for (const s of shSlots) s.want = s.lamp >= 0 && isSh(s.lamp);
    for (let q = 0; q < nShWant; q++) if (!shSlots.some((s) => s.want && s.lamp === shWant[q])) shPending[nShPending++] = shWant[q];
    // plain slots: everything else (a lamp owned by a shadow slot is not lit twice)
    const shOwned = (idx) => shSlots.some((s) => s.lamp === idx && (s.want || s.k > 0));
    taken.fill(0);
    for (const s of plainSlots) {
      s.want = false;
      if (s.lamp < 0) continue;
      for (let q = 0; q < nBest; q++) if (bestI[q] === s.lamp && !isSh(s.lamp)) { s.want = true; taken[q] = 1; break; }
    }
    nPending = 0;
    for (let q = 0; q < nBest && nPending < POOL; q++) if (!taken[q] && !isSh(bestI[q]) && !shOwned(bestI[q])) pending[nPending++] = bestI[q];
    // the visitor's room with its lamps switched off: what comes in from the lamps of the other rooms is little
    otherK = roomOff && !roomOn ? 0.07 : 0.5;
    for (const s of slots) if (s.lamp >= 0) s.roomT = camRoom < 0 || lampRoom[s.lamp] === camRoom ? 1 : otherK;
  }

  function assign(s, idx) {
    const L = world.lamps[idx];
    if (!L) { s.lamp = -1; return; }
    s.lamp = idx; s.want = true;
    // keep the point light well below the fixture / ceiling (no burnt hot spots on the ceiling)
    const drop = lampExt[idx] ? 0.22 : 0.4;
    s.light.position.set(L.x, L.y - drop, L.z);
    tmpC.set(L.color ?? 0xffd9a0);
    s.light.color.copy(tmpC);
    // fire / furnace glows flicker strongly, a few electric lamps very slightly
    s.flick = tmpC.r > 0.9 && tmpC.b < 0.4 ? 1 : ((idx * 2654435761) >>> 0) % 11 === 0 ? 0.12 : 0;
    s.base = Number.isFinite(L.intensity) ? L.intensity : 1;
    if (s.flick === 1) s.base *= 1.6;
    s.roomT = camRoom < 0 || lampRoom[idx] === camRoom ? 1 : otherK;
    s.room = s.roomT;
    if (s.shadow) s.dirty = true;
  }

  function updateLamps(cam, dt, n, ins) {
    lampTimer -= dt;
    if (lampTimer <= 0) { lampTimer = LAMP_EVERY; selectLamps(cam, n, ins); }
    const mach = machineLin;
    const scale = lerp(lerp(LAMP_DAY_OUT, LAMP_NIGHT_OUT, n), LAMP_INSIDE * lerp(1, LAMP_MACHINE, mach), ins);
    const range = lerp(RANGE_OUT, lerp(RANGE_INSIDE, RANGE_MACHINE, mach), ins);
    let next = 0, shNext = 0;
    for (const s of slots) {
      if (s.want) {
        s.k = Math.min(1, s.k + dt * 3);
      } else {
        s.k = Math.max(0, s.k - dt * 4);
        if (s.k === 0) {
          if (s.shadow) { if (shNext < nShPending) assign(s, shPending[shNext++]); else s.lamp = -1; }
          else if (next < nPending) assign(s, pending[next++]);
          else s.lamp = -1;
        }
      }
      s.room = approach(s.room, s.roomT, dt * 1.5);
      let f = 1;
      if (s.flick > 0) {
        const t = time * (s.flick === 1 ? 9 : 23) + s.seed * 10;
        const w = Math.sin(t) * 0.5 + Math.sin(t * 2.31 + 1.7) * 0.3 + Math.sin(t * 5.13 + 0.4) * 0.2;
        f = 1 - s.flick * 0.28 * (0.5 + 0.5 * w);
      }
      s.light.intensity = s.lamp < 0 ? 0 : smooth(s.k) * s.base * scale * f * s.room;
      s.light.distance = s.shadow ? Math.min(range, SH_RANGE) : range;
    }
    if (next > 0) { for (let q = next; q < nPending; q++) pending[q - next] = pending[q]; nPending -= next; }
    if (shNext > 0) { for (let q = shNext; q < nShPending; q++) shPending[q - shNext] = shPending[q]; nShPending -= shNext; }
  }

  // ---------- shadow casters for the lamp shadows ----------
  // The static scene is baked per zone. Only zone meshes near a shadow light cast into its cube map; the exterior
  // casters (hull, superstructure) are switched off in the frames where a lamp shadow map is rendered, and the sun
  // shadow is never rendered in the same frame.
  const dueOne = [null];
  let castersReady = false, extCasters = [], zoneCasters = new Map(), activeZones = new Set(), mode = 'sun', shTimer = 0;
  const NO_CAST = new Set(['glass', 'lampGlow', 'fire', 'navRed', 'navGreen', 'windowLit']);
  function prepareCasters() {
    castersReady = true;
    extCasters = [];
    const walk = (o) => {
      if (o === world.interior) return;
      if ((o.isMesh || o.isPoints) && o.castShadow) extCasters.push(o);
      for (const c of o.children) walk(c);
    };
    walk(scene);
    for (const g of world.zones.values()) castersOf(g);
  }
  /** Lamp-shadow casters of a zone (recomputed when the deck streamer re-bakes or empties the zone). */
  function castersOf(g) {
    let e = zoneCasters.get(g);
    const ver = g.userData.ver || 0;
    if (e && e.ver === ver) return e.list;
    const list = [];
    g.traverse((o) => {
      if (!o.isMesh) return;
      o.receiveShadow = true;
      o.castShadow = false;
      const m = o.material;
      if (Array.isArray(m) || !m || m.transparent || NO_CAST.has(m.name) || !(m.isMeshStandardMaterial || m.isMeshLambertMaterial || m.isMeshPhongMaterial)) return;
      list.push(o);
    });
    zoneCasters.set(g, (e = { ver, list }));
    return list;
  }
  // streamed zones: interior meshes never cast the sun shadow, they only receive
  world.onZoneChange?.((g) => {
    if (!castersReady) return;
    castersOf(g);
    if (activeZones.has(g)) activeZones.delete(g);
    // lamp shadow maps rendered while the zone was missing / being built: render them again
    for (const s of shSlots) if (s.lamp >= 0) s.dirty = true;
  });
  function setMode(m, lights) {
    if (m === 'sun') {
      for (const o of extCasters) o.castShadow = true;
      for (const g of activeZones) for (const o of castersOf(g)) o.castShadow = false;
      activeZones.clear();
    } else {
      for (const o of extCasters) o.castShadow = false;
      const want = new Set();
      for (const s of lights) {
        const p = s.light.position;
        for (const g of world.zones.values()) {
          const u = g.userData;
          if (p.x + SH_RANGE < u.x0 || p.x - SH_RANGE > u.x1 || p.y + SH_RANGE < u.yMin || p.y - SH_RANGE > u.yMax + 0.4) continue;
          want.add(g);
        }
      }
      for (const g of activeZones) if (!want.has(g)) for (const o of castersOf(g)) o.castShadow = false;
      for (const g of want) if (!activeZones.has(g)) for (const o of castersOf(g)) o.castShadow = true;
      activeZones = want;
    }
    mode = m;
  }
  /** Returns true if lamp shadow maps are rendered this frame (the sun shadow must then wait). */
  function updateLampShadows(dt) {
    if (!castersReady) return false;
    if (mode !== 'sun') setMode('sun');
    shTimer -= dt;
    if (shTimer > 0) return false;
    // one cube map per frame (a second one that is due follows in the next frame): halves the refresh spike
    let pick = null, more = false;
    for (const s of shSlots) if (s.dirty && s.lamp >= 0) { if (!pick) pick = s; else more = true; }
    if (!pick) return false;
    dueOne[0] = pick;
    setMode('lamp', dueOne);
    pick.dirty = false; pick.light.shadow.needsUpdate = true;
    shTimer = more ? 0 : SH_EVERY;
    return true;
  }

  // ---------- situation ----------
  const sit = { machine: 0, firstCls: 0 };
  function situation(cam) {
    const d = world.state.deck;
    sit.machine = inMachinery(cam.x, cam.y - 1.2) ? 1 : 0;
    sit.firstCls = !sit.machine && (d === 'boat' || d === 'A' || d === 'B' || d === 'C' || d === 'D') && cam.x > -38 ? 1 : 0;
    return sit;
  }

  function blendGrade(dt, n, ins) {
    // target = mix(outside(day/night), inside(first/other/machine), ins)
    const out = n;
    for (const k of NUM_KEYS) {
      const o = lerp(GRADES.day[k], GRADES.night[k], out);
      let i = lerp(GRADES.other[k], GRADES.first[k], firstLin);
      i = lerp(i, lerp(GRADES.machine[k], GRADES.boiler[k], fireLin), machineLin);
      tgt[k] = lerp(o, i, ins);
    }
    for (const k of COL_KEYS) {
      tmpC.copy(GRADES.day[k]).lerp(GRADES.night[k], out);
      tmpC2.copy(GRADES.machine[k]).lerp(GRADES.boiler[k], fireLin);
      tgt[k].copy(GRADES.other[k]).lerp(GRADES.first[k], firstLin).lerp(tmpC2, machineLin);
      tgt[k].lerpColors(tmpC, tgt[k], ins);
    }
    // inside at night the windows are black: a touch more exposure
    tgt.exposure *= 1 + 0.08 * n * ins;
    const a = gradeInit ? 1 - Math.exp(-dt * 3) : 1;
    gradeInit = true;
    for (const k of NUM_KEYS) cur[k] = lerp(cur[k], tgt[k], a);
    for (const k of COL_KEYS) cur[k].lerp(tgt[k], a);
    const P = world.post?.params;
    if (P) {
      for (const k of NUM_KEYS) P[k] = cur[k];
      for (const k of COL_KEYS) P[k].copy(cur[k]);
      P.sunDir.copy(SUN_DIR);
      P.sunColor.setRGB(1.0, 0.86, 0.66).multiplyScalar(1 - n);
      P.rays *= (1 - ins) * (1 - n);
    } else if (renderer) {
      renderer.toneMappingExposure = cur.exposure;
    }
  }

  // ---------- per frame ----------
  const camPos = new THREE.Vector3(0, 40, 0);
  const size = new THREE.Vector2();
  let lastQuality = world.quality;
  function update(dt) {
    dt = Math.min(Math.max(dt || 0, 0), 0.1);
    time += dt;
    const cam = world.camera;
    if (cam) camPos.copy(cam.position);
    if (world.quality !== lastQuality) {
      lastQuality = world.quality;
      setShadowSize(lastQuality);
      const ms = SH_MAP[lastQuality] || 512;
      for (const s of shSlots) {
        if (s.light.shadow.mapSize.x === ms) continue;
        s.light.shadow.mapSize.set(ms, ms);
        if (s.light.shadow.map) { s.light.shadow.map.dispose(); s.light.shadow.map = null; }
        s.dirty = true;
      }
    }

    nightLin = approach(nightLin, nightTarget, dt / 2.0);
    insideLin = approach(insideLin, world.state.inside ? 1 : 0, dt / 0.6);
    const n = smooth(nightLin), ins = smooth(insideLin);
    situation(camPos);
    machineLin = approach(machineLin, sit.machine, dt / 1.2);
    firstLin = approach(firstLin, sit.firstCls, dt / 1.2);
    daylight = approach(daylight, DAYLIGHT[world.state.deck] ?? 0.05, dt / 1.0);

    shared.uTime.value = time;
    shared.uNight.value = n;

    // pixel scale for point sprites
    let h = 900;
    if (renderer) h = renderer.getDrawingBufferSize(size).y;
    const fov = cam && cam.isPerspectiveCamera ? cam.fov : 70;
    const pxScale = h / (2 * Math.tan((fov * Math.PI) / 360));

    // lights
    updateLamps(camPos, dt, n, ins);
    const lampShadowFrame = updateLampShadows(dt);
    const sunI = updateSun(camPos, n, ins, dt, lampShadowFrame);
    const dayIn = lerp(1, daylight, ins);
    // the ship's own exterior lighting at night (baked lamp volume, window glow, lamp sprites)
    lightingUniforms.uShipVolK.value = VOL_NIGHT * n;
    lightingUniforms.uWinGlow.value = n * (1 - ins);
    lightingUniforms.uShipAmb.value.setRGB(0.046, 0.036, 0.026).multiplyScalar(n * (1 - ins));
    // world.updateVisibility hides the exterior where nothing of the outside can be seen (closed hull below C deck):
    // then sky, sea, smoke, iceberg and the lamp sprites cannot be seen either
    const out = world.exterior.visible !== false;
    halos.points.visible = out && n > 0.01;
    halos.material.uniforms.uK.value = n * 6;
    halos.material.uniforms.uScale.value = pxScale;
    hemi.color.lerpColors(hemiDaySky, hemiNightSky, n);
    hemi.groundColor.lerpColors(hemiDayGround, hemiNightGround, n);
    hemi.intensity = lerp(HEMI_DAY, HEMI_NIGHT, n) * dayIn;
    const amb = lerp(lerp(AMB_OTHER, AMB_FIRST, firstLin), AMB_MACHINE, machineLin);
    interiorAmbient.color.copy(ambOther).lerp(ambWarm, firstLin).lerp(ambMachine, machineLin);
    interiorAmbient.intensity = amb * ins;
    let fireI = 0, allI = 1e-3;
    for (const s of slots) { allI += s.light.intensity; if (s.flick === 1) fireI += s.light.intensity; }
    fireLin = approach(fireLin, Math.min(1, (fireI / allI) * 2.5), dt / 1.5);
    mats.fire.emissiveIntensity = 2.6 + 0.6 * Math.sin(time * 7.3) * Math.sin(time * 3.1 + 1.2) + 0.3 * Math.sin(time * 17.0);

    // sky / ocean / smoke / iceberg / dust
    sky.follow(camPos);
    sky.dome.visible = out;
    sky.stars.visible = out && n > 0.002;
    ocean.mesh.visible = out;
    ocean.spray.visible = smoke.points.visible = out && TIER.particles !== false;
    if (renderer) sky.starUniforms.uPx.value = renderer.getPixelRatio();
    ocean.update(camPos, time, n, sunI, pxScale);
    smoke.update(dt, n, cam);
    berg.update(n);
    if (!out) berg.mesh.visible = false;
    dust.points.visible = TIER.particles !== false && ins > 0.01;
    if (dust.points.visible) {
      const U = dust.uniforms;
      U.uCam.value.copy(camPos);
      U.uScale.value = pxScale;
      U.uAmount.value = ins * lerp(0.035, 0.09, machineLin);
      for (let i = 0; i < DUST_LIGHTS; i++) {
        const s = slots[i % slots.length];
        U.uL.value[i].set(s.light.position.x, s.light.position.y, s.light.position.z, s.light.intensity);
        U.uLC.value[i].copy(s.light.color);
      }
    }

    // fog / background / environment map
    const wCfg = WEATHER[weatherTarget] || WEATHER.klar;
    const wk = dt > 0 ? Math.min(1, dt / 1.8) : 1;
    fogScale += (wCfg.fog - fogScale) * wk;
    sunWeather += (wCfg.sun - sunWeather) * wk;
    fogDayCur.lerp(wCfg.tint, wk);
    fog.color.lerpColors(fogDayCur, fogNight, n);
    fog.density = lerp(FOG_DAY, FOG_NIGHT, n) * fogScale;
    background.copy(fog.color);
    if (envDay) {
      const inEnv = insideLin > 0.5;
      const envIn = machineLin > 0.5 ? envMachine : envInside;
      scene.environment = inEnv ? envIn : (nightLin < 0.5 ? envDay : envNight);
      const dipInside = Math.abs(2 * insideLin - 1);
      const dipNight = inEnv ? 1 : Math.abs(2 * nightLin - 1);
      const dipMachine = inEnv ? Math.abs(2 * machineLin - 1) : 1;
      const inI = lerp(ENV_INSIDE, ENV_MACHINE, machineLin) * (1 + 0.6 * daylight * (1 - n));
      scene.environmentIntensity = (inEnv ? inI : (nightLin < 0.5 ? ENV_DAY : ENV_NIGHT)) * dipInside * dipNight * dipMachine;
    }

    // rooms with lots of daylight (boat deck / A deck) keep part of the cool exterior grade
    blendGrade(dt, n, ins * (1 - 0.75 * daylight * (1 - n)));
  }

  // once every module is built and baked (called by the app before the first frame)
  world.onAfterBake = () => {
    try {
      const t0 = performance.now();
      world.exterior.updateMatrixWorld(true);
      const nLamps = TIER.lampVolume === false ? 0 : bakeLampVolume(world.lamps);
      halos.rebuild(world);
      prepareCasters();
      lampCount = -1; // re-index lamps (rooms are known now)
      console.info(`[environment] ${nLamps} exterior lamps baked, casters prepared in ${(performance.now() - t0).toFixed(0)} ms`);
    } catch (e) {
      console.warn('[environment] after-bake setup failed', e);
    }
  };

  update(0);
  return { update };
}
