// Reachability runner:  node src/interior/check.mjs <deck[,deck...]> <module files...>
// Builds src/interior/stairs.js + the given scene modules headlessly, then flood-fills every given deck and
// lists kit warnings and rooms that cannot be reached from the stair landings / exterior doors.
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

function fakeCtx(canvas) {
  const fn = () => proxy;
  const proxy = new Proxy({ canvas }, {
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
function fakeCanvas() { const c = { width: 300, height: 150, style: {}, addEventListener() {}, removeEventListener() {} }; c.getContext = () => fakeCtx(c); return c; }
globalThis.document = { createElement: () => fakeCanvas(), createElementNS: () => fakeCanvas(), addEventListener() {}, removeEventListener() {}, body: { appendChild() {}, style: {} } };
globalThis.window = globalThis;
globalThis.addEventListener ??= () => {};
globalThis.requestAnimationFrame ??= (f) => setTimeout(() => f(performance.now()), 16);

const here = path.dirname(fileURLToPath(import.meta.url));
const imp = (f) => import(pathToFileURL(path.resolve(f)).href);
const THREE = await import('three');
const { World } = await imp(path.join(here, '../core/world.js'));
const { checkReachability } = await imp(path.join(here, 'check.js'));

const [deckArg, ...files] = process.argv.slice(2);
if (!deckArg) { console.error('usage: node src/interior/check.mjs <deck[,deck...]> <module files...>'); process.exit(2); }
const world = new World(new THREE.Scene());
world.camera = new THREE.PerspectiveCamera(70, 1.6, 0.1, 5000);
world.renderer = null;
const warn = console.warn; let warnings = 0;
console.warn = (...a) => { warnings++; warn(...a); };
for (const f of [path.join(here, 'stairs.js'), ...files]) await (await imp(f)).build(world);

let bad = 0;
for (const deck of deckArg.split(',')) {
  const r = checkReachability(world, deck);
  console.log(`\ndeck ${deck}: ${r.rooms} rooms, ${r.cells} reachable cells (${(r.cells * 0.16).toFixed(0)} m2), ${r.seeds} seeds`);
  for (const u of r.unreachable) { bad++; console.log(`  UNREACHABLE  ${u.id}  "${u.name}"  x ${u.x0.toFixed(1)}..${u.x1.toFixed(1)}  z ${u.z0.toFixed(1)}..${u.z1.toFixed(1)}`); }
  if (!r.unreachable.length) console.log('  all rooms reachable');
}
console.log(`\n${warnings} kit warning(s), ${bad} unreachable room(s)`);
process.exit(bad ? 1 : 0);
