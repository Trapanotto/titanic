// Headless smoke test for scene modules (no browser needed).
// usage: node tools/smoke.mjs src/exterior/index.js [src/decks/a.js ...] [--bake] [--all] [--tier=mobile|low|mid|high]
// Builds the given modules into a fresh World and prints statistics + sanity checks.
import { pathToFileURL } from 'node:url';
import path from 'node:path';

function fakeCtx(canvas) {
  const fn = () => proxy;
  const target = { canvas };
  const proxy = new Proxy(target, {
    get(t, p) {
      if (p in t) return t[p];
      if (p === 'measureText') return () => ({ width: 10 });
      if (p === 'getImageData' || p === 'createImageData') return (a, b, w, h) => ({ data: new Uint8ClampedArray(4 * (w || a) * (h || b)), width: w || a, height: h || b });
      return fn;
    },
    set(t, p, v) { t[p] = v; return true; },
  });
  return proxy;
}
function fakeCanvas() {
  const c = { width: 300, height: 150, style: {}, addEventListener() {}, removeEventListener() {} };
  c.getContext = () => fakeCtx(c);
  return c;
}
globalThis.document = {
  createElement: () => fakeCanvas(),
  createElementNS: () => fakeCanvas(),
  addEventListener() {}, removeEventListener() {}, body: { appendChild() {}, style: {} },
};
globalThis.window = globalThis;
globalThis.addEventListener ??= () => {};
globalThis.requestAnimationFrame ??= (f) => setTimeout(() => f(performance.now()), 16);

const THREE = await import('three');
// device tier (default: high) – must be set before any module reads TIER
const tierArg = process.argv.find((a) => a.startsWith('--tier='));
const { TIER, setTier } = await import('../src/core/tier.js');
if (tierArg) setTier(tierArg.slice(7), 'smoke');
const detailArg = process.argv.find((a) => a.startsWith('--detail='));
(await import('../src/interior/props-core.js')).DETAIL.q = detailArg ? +detailArg.slice(9) : TIER.detail;
const { World } = await import('../src/core/world.js');
const C = await import('../src/core/constants.js');

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
let files = args.filter((a) => !a.startsWith('--'));
if (flags.has('--all')) {
  const { MODULES } = await import('../src/modules.js');
  files = null;
  var loaders = MODULES;
}

const scene = new THREE.Scene();
const world = new World(scene);
world.camera = new THREE.PerspectiveCamera(70, 1.6, 0.1, 5000);
world.renderer = null; // modules must tolerate a missing renderer in this test
world.tier = TIER;
world.dropRadius = TIER.dropRadius;
world.dropTinyInstances = !TIER.tinyInstances;
console.log(`[smoke] tier ${TIER.name}, detail ${TIER.detail}, fine ${TIER.fine}`);

function stats(root) {
  let meshes = 0, tris = 0, inst = 0, lights = 0;
  const materials = new Set();
  root.traverse((o) => {
    if (o.isLight) lights++;
    if (!o.isMesh && !o.isPoints && !o.isLine) return;
    meshes++;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) materials.add(m);
    const g = o.geometry; if (!g?.attributes?.position) return;
    const n = (g.index ? g.index.count : g.attributes.position.count) / 3;
    tris += n * (o.isInstancedMesh ? o.count : 1);
    if (o.isInstancedMesh) inst++;
  });
  return { meshes, instanced: inst, triangles: Math.round(tris), materials: materials.size, lights };
}

let failed = false;
const updaters = [];
const list = files ? files.map((f) => ({ id: f, load: () => import(pathToFileURL(path.resolve(f)).href) })) : loaders;
for (const m of list) {
  const before = stats(scene), c0 = world.colliderCount, f0 = world.floors.length, r0 = world.ramps.length;
  const t0 = performance.now();
  try {
    const mod = await m.load();
    const res = await mod.build(world);
    if (res?.update) updaters.push(res.update);
    const after = stats(scene);
    console.log(`\n[${m.id}] ok in ${(performance.now() - t0).toFixed(0)} ms`);
    console.log(`  +meshes ${after.meshes - before.meshes}  +triangles ${after.triangles - before.triangles}  +colliders ${world.colliderCount - c0}  +floors ${world.floors.length - f0}  +ramps ${world.ramps.length - r0}`);
  } catch (e) {
    failed = true;
    console.error(`\n[${m.id}] FAILED:`, e);
  }
}

try { for (const u of updaters) { u(0.016, 0.016); u(0.016, 0.032); } world.update(0.016, 0.05); world.setNight(true); world.setNight(false); }
catch (e) { failed = true; console.error('update()/setNight FAILED:', e); }

// sanity: every teleport must stand on ground and not inside a collider
for (const t of world.teleports) {
  const g = world.groundAt(t.x, t.z, t.y + 0.2);
  const c = world.collide(t.x, t.z, t.y);
  const moved = Math.hypot(c.x - t.x, c.z - t.z);
  if (g === null || Math.abs(g - t.y) > 0.3) { failed = true; console.error(`  teleport "${t.name}" has no ground (ground=${g}, y=${t.y})`); }
  if (moved > 0.05) { failed = true; console.error(`  teleport "${t.name}" is inside a collider (pushed ${moved.toFixed(2)} m)`); }
}

// per-zone statistics
const perDeck = {};
for (const g of world.zones.values()) { const s = stats(g); const d = (perDeck[g.userData.deck] ??= { zones: 0, meshes: 0, triangles: 0 }); d.zones++; d.meshes += s.meshes; d.triangles += s.triangles; }
console.log('\ninterior per deck:', perDeck);
console.log('total:', stats(scene), { colliders: world.colliderCount, floors: world.floors.length, ramps: world.ramps.length, teleports: world.teleports.length, infos: world.infos.length, lamps: world.lamps.length });
if (stats(world.interior).lights) { failed = true; console.error('lights are not allowed inside interior zones'); }

if (flags.has('--bake')) {
  const t0 = performance.now();
  await world.bake();
  console.log(`after bake (${(performance.now() - t0).toFixed(0)} ms):`, stats(scene));
}
globalThis.__world = world; globalThis.__C = C;
process.exit(failed ? 1 : 0);
