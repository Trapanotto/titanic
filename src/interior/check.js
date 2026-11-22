// Interior kit – reachability check (flood fill of the walkable space of one deck).
import { DECK_Y, EXT_DOORS, deckHasInterior } from '../core/constants.js';
import { deckRanges } from './batch.js';
import { stairLandings } from './stairs.js';

/**
 * Flood-fills the walkable floor of `deck` on a grid (default 0.4 m) starting at the stair landings and the exterior
 * doors of that deck, using world.groundAt / world.collide, and reports the rooms of world.rooms that were not reached.
 * opts: { step = 0.4, radius = 0.2, seeds: [{x, z}] }
 * Returns { deck, rooms, cells, seeds, unreachable: [room...], reached(x, z) }.
 */
export function checkReachability(world, deck, opts = {}) {
  const step = opts.step ?? 0.4, rad = opts.radius ?? 0.2, Y = DECK_Y[deck];
  const ranges = deckRanges(deck);
  const xmin = Math.min(...ranges.map((r) => r[0])) - 3, xmax = Math.max(...ranges.map((r) => r[1])) + 3, zmin = -15.2;
  const nx = Math.ceil((xmax - xmin) / step) + 1, nz = Math.ceil(30.4 / step) + 1;
  const state = new Uint8Array(nx * nz); // 0 unknown, 1 walkable, 2 blocked, 3 reached
  const free = (x, z) => {
    const g = world.groundAt(x, z, Y + 0.3);
    if (g === null || Math.abs(g - Y) > 0.3) return false;
    const c = world.collide(x, z, Y, rad);
    return Math.abs(c.x - x) + Math.abs(c.z - z) < 1e-6;
  };
  const X = (i) => xmin + i * step, Z = (j) => zmin + j * step;
  const walk = (i, j) => { if (i < 0 || j < 0 || i >= nx || j >= nz) return false; const k = i * nz + j; if (!state[k]) state[k] = free(X(i), Z(j)) ? 1 : 2; return state[k] !== 2; };

  const seeds = [...stairLandings(deck), ...(opts.seeds ?? [])];
  for (const d of EXT_DOORS.filter((q) => q.deck === deck)) {
    if (d.axis === 'x') seeds.push({ x: d.x, z: d.z - Math.sign(d.z) * 0.9 });
    else seeds.push({ x: d.x + (deckHasInterior(deck, d.x + 1) ? 0.9 : -0.9), z: d.z });
  }
  const queue = [];
  let used = 0;
  for (const s of seeds) {
    const i0 = Math.round((s.x - xmin) / step), j0 = Math.round((s.z - zmin) / step);
    let found = false;
    for (let r = 0; r <= 3 && !found; r++) for (let di = -r; di <= r && !found; di++) for (let dj = -r; dj <= r && !found; dj++) {
      if (walk(i0 + di, j0 + dj)) { queue.push([i0 + di, j0 + dj]); found = true; }
    }
    if (found) used++;
  }
  let cells = 0;
  while (queue.length) {
    const [i, j] = queue.pop(), k = i * nz + j;
    if (state[k] === 3) continue;
    state[k] = 3; cells++;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = i + di, b = j + dj;
      if (!walk(a, b) || state[a * nz + b] === 3) continue;
      if (!free(X(i) + (di * step) / 2, Z(j) + (dj * step) / 2)) continue;
      queue.push([a, b]);
    }
  }
  const reached = (x, z) => { const i = Math.round((x - xmin) / step), j = Math.round((z - zmin) / step); return i >= 0 && j >= 0 && i < nx && j < nz && state[i * nz + j] === 3; };
  const rooms = (world.rooms ?? []).filter((r) => r.deck === deck);
  const unreachable = [];
  for (const r of rooms) {
    if (r.noAccess) continue;
    let ok = false;
    for (let i = Math.ceil((r.x0 + 0.1 - xmin) / step); !ok && X(i) <= r.x1 - 0.1; i++) {
      for (let j = Math.ceil((r.z0 + 0.1 - zmin) / step); !ok && Z(j) <= r.z1 - 0.1; j++) ok = i >= 0 && j >= 0 && i < nx && j < nz && state[i * nz + j] === 3;
    }
    if (!ok) unreachable.push(r);
  }
  return { deck, rooms: rooms.length, cells, seeds: used, unreachable, reached };
}
