// RMS Titanic – application bootstrap: renderer, module loading, render loop.
import { params, flag, caps, guard } from './core/boot-tier.js';
import * as THREE from 'three';
import { World, yieldTask } from './core/world.js';
import { MODULES } from './modules.js';
import { SHIP, DECK_Y } from './core/constants.js';
import { Player } from './app/player.js';
import { Controls } from './app/controls.js';
import { UI } from './app/ui.js';
import { PostPipeline, QUALITY_LEVELS } from './app/post.js';
import { TIER, lowerTier } from './core/tier.js';
import { DeckStreamer } from './app/stream.js';
import { MirrorView } from './app/mirrors.js';
import { Sound } from './app/audio.js';
import { Interact } from './app/interact.js';
import { ENGINE } from './core/engine.js';
import { texturesReady } from './core/materials.js';

const DEG = Math.PI / 180;

/** Reload one tier lower (after a lost context or an out-of-memory failure); at most once per tier and session. */
function fallbackTier(why) {
  const lower = lowerTier(TIER.name);
  let tried = '';
  try { tried = sessionStorage.getItem('titanicTierDrop') || ''; } catch { /* storage blocked */ }
  if (lower === TIER.name || tried.split(',').includes(TIER.name)) return false;
  try { sessionStorage.setItem('titanicTierDrop', (tried ? tried + ',' : '') + TIER.name); } catch { return false; }
  console.warn(`[app] ${why} – neuer Versuch mit Stufe "${lower}"`);
  const u = new URL(location.href);
  u.searchParams.set('tier', lower);
  location.replace(u.toString());
  return true;
}
const isOOM = (e) => e instanceof RangeError || /allocation|out of memory|memory/i.test(String(e?.message || e));
const MEMORY_FAIL = 'Dieses Gerät hat nicht genug Arbeits- oder Grafikspeicher für den Rundgang – auch in der einfachsten '
  + 'Darstellung nicht. Bitte schließe andere Tabs und Apps und lade die Seite neu, oder verwende einen Computer.';

const canvas = document.getElementById('view');
const scene = new THREE.Scene();
const world = new World(scene);
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / Math.max(1, window.innerHeight), 0.2, 6000); // near 0.2: high depth precision (less z-fighting), still inside the player's 0.3 m radius
world.camera = camera;
world.renderer = null;

const player = new Player(world, camera);
const ui = new UI({ world, scene, player, noLock: flag('nolock') });
const controls = new Controls(player, canvas, {
  noLock: flag('nolock'),
  isBlocked: () => ui.isBlocked(),
  onAction: (name, e, arg) => ui.action(name, e, arg),
  onLockChange: (locked) => ui.onLockChange(locked),
});
ui.controls = controls;

const debug = (window.__titanic = { world, scene, camera, renderer: null, player, ui, controls, errors: [], ready: false, frame: null, params, tier: TIER });
world.tier = TIER;
try { world.doorSaved = new Set(JSON.parse(localStorage.getItem('titanic.tueren') || '[]')); } catch { world.doorSaved = new Set(); }
world.dropRadius = TIER.dropRadius;
if (flag('profile')) { world._profile = new Map(); world._props = []; }
world.insideExtFar = TIER.insideExtFar || 0;
world.dropTinyInstances = !TIER.tinyInstances;
ui.tier = TIER;

// ------------------------------------------------------------------ renderer

// Quality: ?q=low|med|high (or niedrig|mittel|hoch), key G cycles. Default 'hoch' on desktop, 'mittel' on touch devices.
const Q_ALIAS = { low: 'niedrig', med: 'mittel', medium: 'mittel', mid: 'mittel', high: 'hoch', niedrig: 'niedrig', mittel: 'mittel', hoch: 'hoch' };
const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
Q_ALIAS.mobil = Q_ALIAS.mobile = 'mobil';
const qWanted = Q_ALIAS[(params.get('q') || '').toLowerCase()];
const quality0 = qWanted && (TIER.qualities.includes(qWanted) || params.get('q')) ? qWanted : TIER.quality;
world.quality = quality0;

/** WebGL 2 test on a throw-away canvas (the real one must be created by three.js with its own attributes). */
function hasWebGL2() {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch { return false; }
}
const NO_WEBGL2 = 'Dein Browser oder deine Grafikkarte unterstützt WebGL 2 nicht – der Rundgang kann deshalb nicht angezeigt werden. '
  + 'Bitte verwende eine aktuelle Version von Chrome, Edge, Firefox oder Safari (ab Version 15) und prüfe, ob die '
  + 'Hardwarebeschleunigung in den Browser-Einstellungen eingeschaltet ist.';

let renderer = null, post = null;
try {
  if (!caps && !hasWebGL2()) throw new Error('no webgl2');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: TIER.antialias, powerPreference: TIER.power || 'default', stencil: true }); // stencil: phones then give a 24-bit depth buffer instead of 16 bit (z-fighting)
  ui.renderer = renderer;
  guard.beat(TIER.name);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, TIER.maxPixelRatio, coarse ? 1.5 : 2)); // phones: cap the pixel ratio
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = TIER.sunShadow > 0 || TIER.lampShadows > 0;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  world.renderer = renderer;
  debug.renderer = renderer;
  try {
    post = new PostPipeline(renderer, scene, camera, quality0);
    post.onQuality((q) => { world.quality = q; });
    world.post = post;
    debug.post = post;
  } catch (e) {
    console.error('[app] Nachbearbeitung nicht verfügbar', e);
    post = null;
  }
} catch (e) {
  console.error('[app] WebGL konnte nicht gestartet werden', e);
  renderer = null;
  ui.loadingFatal('WebGL 2 wird von diesem Browser oder Gerät leider nicht unterstützt.');
  ui.showError('WebGL 2 nicht verfügbar', NO_WEBGL2, true);
}

function resize() {
  const w = window.innerWidth, h = Math.max(1, window.innerHeight);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  if (post) post.resize(); else renderer?.setSize(w, h, false);
}
window.addEventListener('resize', resize);

// ------------------------------------------------------------------ loop

const updates = [];
let time = 0, last = 0, raf = 0, running = false, contextLost = false, loopErrors = 0;
let streamer = null;
let mirrorView = null;
try { if (renderer) mirrorView = debug.mirrors = new MirrorView(world, scene, TIER); } catch (e) { console.warn('[app] Spiegel', e); }

debug.engine = ENGINE;
const sound = (ui.sound = debug.sound = new Sound(world, player));
let interact = null;
try { interact = ui.interact = debug.interact = new Interact(world, scene, sound, (t, s) => ui.toast(t, s)); interact.fixtures.read = (t, x) => ui.showText(t, x); } catch (e) { console.warn('[app] Bedienpunkte', e); }

function step(dt) {
  time += dt;
  debug.time = time;
  controls.apply();
  player.update(dt);
  // Near plane by situation: the depth buffer resolves 1/near times finer. Indoors things come close (0.15 m); on
  // the open decks a little more room is safe; flying away from the ship the near plane follows the distance, so
  // window frames, doors and rivets seen from afar no longer flicker (z-fighting).
  {
    const p = camera.position, st = world.state;
    let near = 0.18;
    if (!st.inside) {
      near = 0.22;
      if (player.mode === 'fly') {
        const dx = Math.max(0, Math.abs(p.x) - 137), dz = Math.max(0, Math.abs(p.z) - 15.5), dy = Math.max(0, p.y - 64, 9.5 - p.y);
        near = Math.min(25, Math.max(0.22, 0.3 * Math.hypot(dx, dy, dz)), Math.max(0.22, 0.5 * Math.abs(p.y - 10.5))); // (never cuts into the sea below)
      }
    }
    if (Math.abs(near - camera.near) > camera.near * 0.04) { camera.near = near; camera.updateProjectionMatrix(); }
  }
  world.updateVisibility(camera.position, undefined, player.mode === 'walk' ? player.pos.y : undefined);
  try {
    world.update(dt, time);
    for (let i = 0; i < updates.length; i++) updates[i](dt, time);
    streamer?.update(dt, time, camera.position);
  } catch (e) {
    if (loopErrors++ < 5) console.error('[app] Fehler in einem update()', e);
  }
  interact?.update(dt, player);
  sound.update(dt);
  ui.update(dt, time);
  if (!contextLost) { mirrorView?.update(camera); if (post) post.render(dt); else renderer.render(scene, camera); }
}

// Automatic quality fallback: if the frame time stays above ~25 ms for a few seconds, step the preset down (toast);
// step up again at most once, and never after the user chose a preset with G.
const autoQ = { on: !flag('noauto'), manual: false, ema: 1 / 60, slow: 0, fast: 0, ups: 0, downs: 0, cool: 5 };
function autoQuality(raw) {
  const a = autoQ;
  if (!a.on || !post || ui.modal || streamer?.busy) return;
  // frames > 100 ms are hitches (uploads, GC) or a throttled / hidden window – not a slow GPU: ignore them
  if (raw > 0.1) return;
  a.ema += (raw - a.ema) * 0.05;
  // weak tiers: dynamic resolution between the tier's minimum and the preset's pixel ratio (hysteresis)
  if (TIER.minPixelRatio < 1) {
    a.drsSlow = a.ema > 0.024 ? (a.drsSlow || 0) + raw : 0;
    a.drsFast = a.ema < 0.014 ? (a.drsFast || 0) + raw : 0;
    const sc = post.resScale ?? 1;
    if (a.drsSlow > 1.5 && sc > TIER.minPixelRatio + 0.01) { post.setResolutionScale(Math.max(TIER.minPixelRatio, sc - 0.1)); a.drsSlow = 0; a.ema = 1 / 60; }
    else if (a.drsFast > 4 && sc < 0.999) { post.setResolutionScale(Math.min(1, sc + 0.1)); a.drsFast = 0; }
  }
  if (a.manual) return;
  if (a.cool > 0) { a.cool -= raw; a.slow = a.fast = 0; return; }
  a.slow = a.ema > 0.025 ? a.slow + raw : 0;
  a.fast = a.ema < 0.012 ? a.fast + raw : 0;
  const i = QUALITY_LEVELS.indexOf(post.quality);
  let q = null;
  // A change of preset rebuilds the render targets and recompiles every shader (a hitch of a second or more): it is
  // the last resort – first the resolution goes down (above), and the preset is never raised again by itself.
  const atMin = (post.resScale ?? 1) <= (TIER.minPixelRatio < 1 ? TIER.minPixelRatio + 0.01 : 1);
  if (a.slow > 6 && atMin && i > 0) { q = QUALITY_LEVELS[i - 1]; a.downs++; }
  if (!q || !TIER.qualities.includes(q)) return;
  post.setQuality(q);
  a.cool = 6; a.slow = a.fast = 0; a.ema = 1 / 60;
  ui.toast(`Grafikqualität automatisch auf „${q}“ ${QUALITY_LEVELS.indexOf(q) > i ? 'erhöht' : 'gesenkt'} (G zum Ändern)`, 3.5);
}
debug.autoQuality = autoQ;

// Frame limit: never more than ~60–72 pictures per second, whatever the display runs at (120/144/240 Hz laptops would
// otherwise keep the GPU at full load and heat for nothing).
const MIN_FRAME_MS = 13.5;
function frame(now) {
  raf = requestAnimationFrame(frame);
  if (now - last < MIN_FRAME_MS) return;
  guard.beat(TIER.name);
  const raw = Math.max(0, (now - last) / 1000);
  const dt = Math.min(0.05, raw);
  last = now;
  // after the start: upload the remaining baked chunks in ~3 ms slices (frees their CPU copies)
  if (!contextLost) { try { world.uploadStep(renderer, 3); } catch (e) { if (loopErrors++ < 5) console.error('[app] upload', e); } }
  if (streamer?.blocking) return; // the player's deck is being built behind the veil
  step(dt);
  autoQuality(raw);
}

function start() {
  if (running || !renderer || contextLost || document.hidden || !debug.ready) return;
  running = true;
  last = performance.now();
  raf = requestAnimationFrame(frame);
}
function stop() {
  running = false;
  cancelAnimationFrame(raf);
  guard.clear(); // a paused or closed page is not a crash
}
window.addEventListener('pagehide', () => guard.clear());

document.addEventListener('visibilitychange', () => { if (document.hidden) { stop(); controls.clearKeys(); } else start(); });
let hideLost = null;
canvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  contextLost = true;
  stop();
  controls.clearKeys();
  // most often the GPU ran out of memory: start again one tier lower (once per tier and session)
  if (fallbackTier('WebGL-Kontext verloren')) return;
  hideLost = ui.showError('Grafik unterbrochen',
    'Die Verbindung zur Grafikkarte ist verloren gegangen (zum Beispiel durch einen Treiber-Neustart oder Speichermangel). '
    + 'Es wird versucht, sie wiederherzustellen – falls das Bild nicht zurückkommt, lade die Seite bitte neu.', true);
});
canvas.addEventListener('webglcontextrestored', () => {
  // the baked geometry lives only on the GPU (its CPU copy is released after the upload): start afresh
  location.reload();
});

// G: cycle the graphics quality (niedrig -> mittel -> hoch)
const Q_LABEL = { mobil: 'mobil (sparsam)', niedrig: 'niedrig (ohne Nachbearbeitung)', mittel: 'mittel', hoch: 'hoch' };
window.addEventListener('keydown', (e) => {
  if (e.code !== 'KeyG' || e.repeat || e.ctrlKey || e.altKey || e.metaKey || !post) return;
  const tag = e.target?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  const L = TIER.qualities;
  const q = L[(L.indexOf(post.quality) + 1) % L.length];
  autoQ.manual = true; // the user decides from now on
  post.setQuality(q);
  ui.toast?.(`Grafikqualität: ${Q_LABEL[q]}`, 1.8);
});
ui.qualityName = () => post?.quality || '';
debug.setQuality = (q) => { post?.setQuality(Q_ALIAS[q] || q); return post?.quality; };

/** Manual stepping for automated tests (works even when the tab is hidden): __titanic.frame(1/60, 10). */
debug.frame = (dt = 1 / 60, count = 1) => { if (renderer) for (let i = 0; i < count; i++) { if (streamer?.blocking) break; step(Math.min(0.05, dt)); } };

// ------------------------------------------------------------------ build

/**
 * Let the browser repaint the loading screen. In a hidden tab rAF is paused and timers are clamped to >= 1 s, so
 * there it only yields to the event loop (MessageChannel, not throttled) – loading continues at full speed.
 */
let lastPaintAt = 0;
function nextPaint(force = false) {
  guard.beat(TIER.name); // loading counts as running: a crash while the ship is built lowers the tier as well
  const t = performance.now();
  if (document.hidden || (!force && t - lastPaintAt < 80)) return yieldTask();
  lastPaintAt = t;
  return new Promise((resolve) => {
    let done = false;
    const go = () => { if (!done) { done = true; resolve(); } };
    requestAnimationFrame(() => yieldTask().then(go));
    setTimeout(go, 100);
  });
}

const STREAMABLE = (m) => !['environment', 'exterior', 'fittings'].includes(m.id);

async function buildModules() {
  const only = params.get('only')?.split(',').map((s) => s.trim()).filter(Boolean);
  const list = only?.length ? MODULES.filter((m) => only.includes(m.id)) : MODULES;
  const total = list.length + 1.5;
  const heap = () => (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : -1);
  debug.timings = [];
  debug.heapPeak = 0;
  const peak = () => { const h = heap(); if (h > debug.heapPeak) debug.heapPeak = h; return h; };
  // geometry detail of the interior kit (round parts) per tier – before the first deck is built
  const kit = await import('./interior/props-core.js');
  const rooms = await import('./interior/rooms.js');
  kit.DETAIL.q = TIER.detail;
  const flush = () => { kit.flushKitCaches(); rooms.flushRoomCaches(); };
  const fixed = TIER.streaming ? list.filter((m) => !STREAMABLE(m)) : list;
  const streamed = TIER.streaming ? list.filter(STREAMABLE) : [];
  const fixedLoads = fixed.map((m) => m.load());
  if (TIER.name !== 'mobile') for (const m of streamed) m.load();
  let done = 0;
  const fail = (m, e) => {
    console.error(`[app] Modul "${m.id}" konnte nicht gebaut werden:`, e);
    debug.errors.push({ id: m.id, error: e });
    if (isOOM(e)) throw e;
    ui.loadingWarn(`⚠ ${m.label} (${m.id}): ${e?.message || e}`);
  };
  for (let idx = 0; idx < fixed.length; idx++) {
    const m = fixed[idx];
    ui.setProgress(done / total, m.label + ' …');
    await nextPaint();
    try {
      world.colliderTag = m.id; // exterior colliders (windows!) never occlude the interior
      const t0 = performance.now();
      const mod = await fixedLoads[idx];
      const t1 = performance.now();
      const res = await mod.build(world);
      debug.timings.push({ id: m.id, load: Math.round(t1 - t0), build: Math.round(performance.now() - t1), heap: peak(), at: Math.round(performance.now()) });
      if (typeof res?.update === 'function') updates.push(res.update);
    } catch (e) { fail(m, e); }
    done++;
  }
  if (streamed.length) {
    // dry pass: every deck once for the logical data; its geometry is dropped right away (programs are compiled)
    streamer = debug.streamer = new DeckStreamer(world, TIER, { flush, onError: (e) => { if (isOOM(e)) fallbackTier('Speichermangel beim Nachladen'); } });
    // programs of a deck are compiled (in parallel, off the main thread where supported) before it is shown
    streamer.compileZones = async (zones) => {
      if (!renderer?.compileAsync) return;
      const tmp = new THREE.Scene();
      for (const g of zones) for (const c of g.children) tmp.children.push(c);
      try { await renderer.compileAsync(tmp, camera, scene); } catch { /* compiled on first use */ }
      tmp.children.length = 0;
    };
    const fine0 = TIER.fine, detail0 = kit.DETAIL.q;
    TIER.fine = 0;
    kit.DETAIL.q = 0.25;
    try {
      await streamer.dryPass(streamed, async (m, phase) => {
        if (phase === 'start') { ui.setProgress(done / total, m.label + ' …'); await nextPaint(); return; }
        debug.timings.push({ id: m.id, build: m.buildMs, heap: peak(), at: Math.round(performance.now()) });
        done++;
        // on low-memory tiers give GC a brief breather between dry-pass decks; on desktop yield immediately
        if (!document.hidden) {
          if (TIER.name === 'mobile' || TIER.name === 'low') await new Promise((r) => setTimeout(r, 10));
          else await yieldTask();
        }
      });
    } catch (e) { fail({ id: 'stream', label: 'Decks' }, e); }
    finally {
      TIER.fine = fine0;
      kit.DETAIL.q = detail0;
      flush();
    }
  }
  ui.setProgress(done / total, 'Das Schiff wird zusammengesetzt …');
  await nextPaint();
  try {
    const t0 = performance.now();
    await world.bake((p) => ui.setProgress((done + p) / total));
    debug.timings.push({ id: 'bake', build: Math.round(performance.now() - t0), heap: peak(), at: Math.round(performance.now()) });
  } catch (e) {
    console.error('[app] bake fehlgeschlagen:', e);
    debug.errors.push({ id: 'bake', error: e });
    if (isOOM(e)) throw e;
    ui.loadingWarn(`⚠ Zusammensetzen: ${e?.message || e}`);
  }
}

/** Only when no module provided any light (e.g. stubs): make the scene visible at all. */
function addFallbackEnvironment() {
  let hasLight = false;
  scene.traverse((o) => { if (o.isLight) hasLight = true; });
  if (hasLight) return;
  console.warn('[app] keine Lichtquelle in der Szene – Notbeleuchtung und Hilfsgitter werden eingefügt');
  const g = new THREE.Group();
  g.name = 'fallbackEnvironment';
  g.add(new THREE.HemisphereLight(0xdfeaff, 0x3a3f4a, 2.2));
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshBasicMaterial({ color: 0x1d4468 }));
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = SHIP.waterline;
  const grid = new THREE.GridHelper(300, 30, 0xc9a24a, 0x54657a);
  grid.position.y = SHIP.waterline + 0.02;
  const axes = new THREE.AxesHelper(20);
  axes.position.y = DECK_Y.roof + 2;
  g.add(sea, grid, axes);
  scene.add(g);
  if (!scene.background) scene.background = new THREE.Color(0x8fb4d6);
}

function placePlayer() {
  const tps = world.teleports;
  const yaw = params.has('yaw') ? parseFloat(params.get('yaw')) * DEG : undefined;
  const pitch = params.has('pitch') ? parseFloat(params.get('pitch')) * DEG : undefined;
  const pos = params.get('pos')?.split(',').map(Number);
  let placed = false;
  if (pos && pos.length === 3 && pos.every(Number.isFinite)) {
    player.setFlyPose(pos[0], pos[1], pos[2], yaw ?? 0, pitch ?? 0);
    placed = true;
  } else if (params.has('tp')) {
    const q = params.get('tp').trim();
    const t = /^\d+$/.test(q) ? tps[+q] : tps.find((x) => x.name.toLowerCase().includes(q.toLowerCase()));
    if (t) { player.teleport(t); placed = true; } else console.warn(`[app] Teleport "${q}" nicht gefunden`);
  }
  if (!placed) {
    const t = tps.find((x) => x.name.includes('Bootsdeck')) || tps[0];
    if (t) {
      // not on top of an info point: step along the deck until the nearest marker is out of reach of the E bar
      const clear = (x) => world.infos.every((i) => Math.hypot(i.x - x, i.z - t.z) > 4.5 || Math.abs(i.y - DECK_Y[t.deck] - 1.4) > 3);
      const dx = [0, -5, 5, -7, 7, -9, 9, -12, 12].find((d) => clear(t.x + d)) ?? 0;
      player.teleport(dx ? { ...t, x: t.x + dx } : t);
    } else { player.setFlyPose(60, 45, 60); player.lookAt(0, 20, 0); }
  }
  if (placed && !pos) {
    if (yaw !== undefined && Number.isFinite(yaw)) player.yaw = yaw;
    if (pitch !== undefined && Number.isFinite(pitch)) player.pitch = pitch;
  }
  if (flag('fly') && player.mode === 'walk') player.toggleFly();
  player.applyCamera();
}

async function main() {
  if (!renderer) return;
  await buildModules();
  addFallbackEnvironment();
  if (flag('night')) world.setNight(true);
  placePlayer();
  if (streamer) {
    // only the player's own deck before going interactive; neighbours follow in idle time
    ui.setProgress(0.97, 'Das Deck wird eingerichtet …');
    await nextPaint(true);
    const t0 = performance.now();
    // only the own deck before going interactive (time to interactive); stairwell views and neighbours follow right
    // after the start in idle slices
    const { own } = streamer.wanted(camera.position, new Set(), 0);
    await streamer.load(streamer.zonesByDeck[own] || [], { rush: true });
    debug.timings.push({ id: 'deck ' + own, build: Math.round(performance.now() - t0), heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : -1 });
  }
  ui.setProgress(1, 'Leinen los!');
  await nextPaint(true);
  try { // the procedural textures are generated in a worker while the ship is built
    const t0 = performance.now();
    await texturesReady();
    debug.timings?.push({ id: 'texWait', build: Math.round(performance.now() - t0), tex: Math.round(window.__titanicTexMs || 0) });
  } catch (e) { console.warn('[app] Texturen', e); }
  try {
    world.onAfterBake?.(); // environment: exterior lamp volume, lamp-shadow casters
  } catch (e) {
    console.error('[app] onAfterBake fehlgeschlagen:', e);
  }
  try {
    // first frame under the loading screen: compiles shaders, uploads textures; then compile the programs of every
    // object (also the culled interior zones), so that walking around never stalls on a shader compile
    const t0 = performance.now();
    world.updateVisibility(camera.position, undefined, player.mode === 'walk' ? player.pos.y : undefined);
    // compile in parallel (KHR_parallel_shader_compile) while the loading screen keeps animating
    try {
      if (renderer.compileAsync) await renderer.compileAsync(scene, camera);
      else renderer.compile(scene, camera);
    } catch (e) { console.warn('[app] compile', e); }
    if (post) post.render(0); else renderer.render(scene, camera);
    debug.timings?.push({ id: 'firstFrame', build: Math.round(performance.now() - t0), at: Math.round(performance.now()) });
    debug.readyAt = Math.round(performance.now());
  } catch (e) {
    console.error('[app] erster Frame fehlgeschlagen:', e);
  }
  debug.ready = true;
  ui.ready();
  if (params.has('selftest')) import('./app/selftest.js').then((m) => m.run(debug)).catch((e) => console.error('[selftest]', e));
  if (guard.crashed) ui.toast?.('Der letzte Besuch wurde unerwartet beendet – die Grafik läuft jetzt eine Stufe einfacher.', 7);
  start();
}

main().catch((e) => {
  console.error('[app] Start fehlgeschlagen:', e);
  if (isOOM(e) && fallbackTier('Speichermangel beim Aufbau')) return;
  if (isOOM(e)) { ui.loadingFatal('Nicht genug Speicher.'); ui.showError('Nicht genug Speicher', MEMORY_FAIL, true); return; }
  ui.loadingFatal('Beim Start ist ein Fehler aufgetreten – Details in der Konsole.');
});
