// RMS Titanic – application bootstrap: renderer, module loading, render loop.
import * as THREE from 'three';
import { World, yieldTask } from './core/world.js';
import { MODULES } from './modules.js';
import { SHIP, DECK_Y } from './core/constants.js';
import { Player } from './app/player.js';
import { Controls } from './app/controls.js';
import { UI } from './app/ui.js';
import { PostPipeline, QUALITY_LEVELS } from './app/post.js';

const params = new URLSearchParams(location.search);
const flag = (name) => { const v = params.get(name); return v !== null && v !== '0' && v !== 'false'; };
const DEG = Math.PI / 180;

const canvas = document.getElementById('view');
const scene = new THREE.Scene();
const world = new World(scene);
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / Math.max(1, window.innerHeight), 0.08, 6000);
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

const debug = (window.__titanic = { world, scene, camera, renderer: null, player, ui, controls, errors: [], ready: false, frame: null, params });

// ------------------------------------------------------------------ renderer

// Quality: ?q=low|med|high (or niedrig|mittel|hoch), key G cycles. Default 'hoch' on desktop, 'mittel' on touch devices.
const Q_ALIAS = { low: 'niedrig', med: 'mittel', medium: 'mittel', mid: 'mittel', high: 'hoch', niedrig: 'niedrig', mittel: 'mittel', hoch: 'hoch' };
const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
const quality0 = Q_ALIAS[(params.get('q') || '').toLowerCase()] || (coarse ? 'mittel' : 'hoch');
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
  if (!hasWebGL2()) throw new Error('no webgl2');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  ui.renderer = renderer;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2)); // phones: cap the pixel ratio
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
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

function step(dt) {
  time += dt;
  controls.apply();
  player.update(dt);
  world.updateVisibility(camera.position);
  try {
    world.update(dt, time);
    for (let i = 0; i < updates.length; i++) updates[i](dt, time);
  } catch (e) {
    if (loopErrors++ < 5) console.error('[app] Fehler in einem update()', e);
  }
  ui.update(dt, time);
  if (!contextLost) { if (post) post.render(dt); else renderer.render(scene, camera); }
}

// Automatic quality fallback: if the frame time stays above ~25 ms for a few seconds, step the preset down (toast);
// step up again at most once, and never after the user chose a preset with G.
const autoQ = { on: !flag('noauto'), manual: false, ema: 1 / 60, slow: 0, fast: 0, ups: 0, downs: 0, cool: 5 };
function autoQuality(raw) {
  const a = autoQ;
  if (!a.on || a.manual || !post || ui.modal) return;
  // frames > 100 ms are hitches (uploads, GC) or a throttled / hidden window – not a slow GPU: ignore them
  if (raw > 0.1) return;
  a.ema += (raw - a.ema) * 0.05;
  if (a.cool > 0) { a.cool -= raw; a.slow = a.fast = 0; return; }
  a.slow = a.ema > 0.025 ? a.slow + raw : 0;
  a.fast = a.ema < 0.012 ? a.fast + raw : 0;
  const i = QUALITY_LEVELS.indexOf(post.quality);
  let q = null;
  if (a.slow > 3 && i > 0) { q = QUALITY_LEVELS[i - 1]; a.downs++; }
  else if (a.fast > 30 && a.downs > 0 && a.ups < 1 && i < QUALITY_LEVELS.length - 1) { q = QUALITY_LEVELS[i + 1]; a.ups++; }
  if (!q) return;
  post.setQuality(q);
  a.cool = 6; a.slow = a.fast = 0; a.ema = 1 / 60;
  ui.toast(`Grafikqualität automatisch auf „${q}“ ${QUALITY_LEVELS.indexOf(q) > i ? 'erhöht' : 'gesenkt'} (G zum Ändern)`, 3.5);
}
debug.autoQuality = autoQ;

function frame(now) {
  raf = requestAnimationFrame(frame);
  const raw = Math.max(0, (now - last) / 1000);
  const dt = Math.min(0.05, raw);
  last = now;
  // after the start: upload the remaining baked chunks in ~3 ms slices (frees their CPU copies)
  if (!contextLost) { try { world.uploadStep(renderer, 3); } catch (e) { if (loopErrors++ < 5) console.error('[app] upload', e); } }
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
}

document.addEventListener('visibilitychange', () => { if (document.hidden) { stop(); controls.clearKeys(); } else start(); });
let hideLost = null;
canvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  contextLost = true;
  stop();
  controls.clearKeys();
  hideLost = ui.showError('Grafik unterbrochen',
    'Die Verbindung zur Grafikkarte ist verloren gegangen (zum Beispiel durch einen Treiber-Neustart oder Speichermangel). '
    + 'Es wird versucht, sie wiederherzustellen – falls das Bild nicht zurückkommt, lade die Seite bitte neu.', true);
});
canvas.addEventListener('webglcontextrestored', () => {
  // the baked geometry lives only on the GPU (its CPU copy is released after the upload): start afresh
  location.reload();
});

// G: cycle the graphics quality (niedrig -> mittel -> hoch)
const Q_LABEL = { niedrig: 'niedrig (ohne Nachbearbeitung)', mittel: 'mittel', hoch: 'hoch' };
window.addEventListener('keydown', (e) => {
  if (e.code !== 'KeyG' || e.repeat || e.ctrlKey || e.altKey || e.metaKey || !post) return;
  const tag = e.target?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  const q = QUALITY_LEVELS[(QUALITY_LEVELS.indexOf(post.quality) + 1) % QUALITY_LEVELS.length];
  autoQ.manual = true; // the user decides from now on
  post.setQuality(q);
  ui.toast?.(`Grafikqualität: ${Q_LABEL[q]}`, 1.8);
});
ui.qualityName = () => post?.quality || '';
debug.setQuality = (q) => { post?.setQuality(Q_ALIAS[q] || q); return post?.quality; };

/** Manual stepping for automated tests (works even when the tab is hidden): __titanic.frame(1/60, 10). */
debug.frame = (dt = 1 / 60, count = 1) => { if (renderer) for (let i = 0; i < count; i++) step(Math.min(0.05, dt)); };

// ------------------------------------------------------------------ build

/**
 * Let the browser repaint the loading screen. In a hidden tab rAF is paused and timers are clamped to >= 1 s, so
 * there it only yields to the event loop (MessageChannel, not throttled) – loading continues at full speed.
 */
function nextPaint() {
  if (document.hidden) return yieldTask();
  return new Promise((resolve) => {
    let done = false;
    const go = () => { if (!done) { done = true; resolve(); } };
    requestAnimationFrame(() => yieldTask().then(go));
    setTimeout(go, 100);
  });
}

async function buildModules() {
  const only = params.get('only')?.split(',').map((s) => s.trim()).filter(Boolean);
  const list = only?.length ? MODULES.filter((m) => only.includes(m.id)) : MODULES;
  const total = list.length + 1.5;
  const heap = () => (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : -1);
  debug.timings = [];
  for (let i = 0; i < list.length; i++) {
    const m = list[i];
    ui.setProgress(i / total, m.label + ' …');
    await nextPaint();
    try {
      world.colliderTag = m.id; // exterior colliders (windows!) never occlude the interior
      const t0 = performance.now();
      const mod = await m.load();
      const t1 = performance.now();
      const res = await mod.build(world);
      debug.timings.push({ id: m.id, load: Math.round(t1 - t0), build: Math.round(performance.now() - t1), heap: heap(), at: Math.round(performance.now()) });
      if (typeof res?.update === 'function') updates.push(res.update);
    } catch (e) {
      console.error(`[app] Modul "${m.id}" konnte nicht gebaut werden:`, e);
      debug.errors.push({ id: m.id, error: e });
      ui.loadingWarn(`⚠ ${m.label} (${m.id}): ${e?.message || e}`);
    }
  }
  ui.setProgress(list.length / total, 'Das Schiff wird zusammengesetzt …');
  await nextPaint();
  try {
    const t0 = performance.now();
    await world.bake((p) => ui.setProgress((list.length + p) / total));
    debug.timings.push({ id: 'bake', build: Math.round(performance.now() - t0), heap: heap(), at: Math.round(performance.now()) });
  } catch (e) {
    console.error('[app] bake fehlgeschlagen:', e);
    debug.errors.push({ id: 'bake', error: e });
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
    if (t) player.teleport(t);
    else { player.setFlyPose(60, 45, 60); player.lookAt(0, 20, 0); }
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
  ui.setProgress(1, 'Leinen los!');
  await nextPaint();
  try {
    world.onAfterBake?.(); // environment: exterior lamp volume, lamp-shadow casters
  } catch (e) {
    console.error('[app] onAfterBake fehlgeschlagen:', e);
  }
  try {
    // first frame under the loading screen: compiles shaders, uploads textures; then compile the programs of every
    // object (also the culled interior zones), so that walking around never stalls on a shader compile
    const t0 = performance.now();
    world.updateVisibility(camera.position);
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
  start();
}

main().catch((e) => {
  console.error('[app] Start fehlgeschlagen:', e);
  ui.loadingFatal('Beim Start ist ein Fehler aufgetreten – Details in der Konsole.');
});
