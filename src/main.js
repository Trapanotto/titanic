// RMS Titanic – application bootstrap: renderer, module loading, render loop.
import * as THREE from 'three';
import { World } from './core/world.js';
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

let renderer = null, post = null;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
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
  ui.loadingFatal('WebGL wird von diesem Browser oder Gerät leider nicht unterstützt.');
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

function frame(now) {
  raf = requestAnimationFrame(frame);
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  step(dt);
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
canvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  contextLost = true;
  stop();
  ui.toast('Grafikkontext verloren – wird wiederhergestellt …', 30);
});
canvas.addEventListener('webglcontextrestored', () => {
  contextLost = false;
  ui.toast('Grafikkontext wiederhergestellt', 2);
  start();
});

// G: cycle the graphics quality (niedrig -> mittel -> hoch)
const Q_LABEL = { niedrig: 'niedrig (ohne Nachbearbeitung)', mittel: 'mittel', hoch: 'hoch' };
window.addEventListener('keydown', (e) => {
  if (e.code !== 'KeyG' || e.repeat || e.ctrlKey || e.altKey || e.metaKey || !post) return;
  const tag = e.target?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  const q = QUALITY_LEVELS[(QUALITY_LEVELS.indexOf(post.quality) + 1) % QUALITY_LEVELS.length];
  post.setQuality(q);
  ui.toast?.(`Grafikqualität: ${Q_LABEL[q]}`, 1.8);
});
debug.setQuality = (q) => { post?.setQuality(Q_ALIAS[q] || q); return post?.quality; };

/** Manual stepping for automated tests (works even when the tab is hidden): __titanic.frame(1/60, 10). */
debug.frame = (dt = 1 / 60, count = 1) => { if (renderer) for (let i = 0; i < count; i++) step(Math.min(0.05, dt)); };

// ------------------------------------------------------------------ build

/** Let the browser repaint (falls back to a timer when the tab is hidden and rAF is paused). */
function nextPaint() {
  return new Promise((resolve) => {
    let done = false;
    const go = () => { if (!done) { done = true; resolve(); } };
    requestAnimationFrame(() => setTimeout(go, 0));
    setTimeout(go, 80);
  });
}

async function buildModules() {
  const only = params.get('only')?.split(',').map((s) => s.trim()).filter(Boolean);
  const list = only?.length ? MODULES.filter((m) => only.includes(m.id)) : MODULES;
  const total = list.length + 1.5;
  for (let i = 0; i < list.length; i++) {
    const m = list[i];
    ui.setProgress(i / total, m.label + ' …');
    await nextPaint();
    try {
      const mod = await m.load();
      const res = await mod.build(world);
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
    await world.bake((p) => ui.setProgress((list.length + p) / total));
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
    // first frame under the loading screen: compiles shaders, uploads textures
    world.updateVisibility(camera.position);
    if (post) post.render(0); else renderer.render(scene, camera);
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
