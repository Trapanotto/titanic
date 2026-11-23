// People – where they walk. Areas (open decks, public rooms, corridors, machinery spaces) come from the world's
// layout data once it exists; inside each area straight lanes along x and z are searched on a 0.25 m grid and
// kept only where a person fits (world.collide), the deck is flat (world.groundAt, no stairs / ramps) and, for
// open decks, the point is outside the deck houses. Each lane stores per sample whether one may step aside.
import { DECK_Y, OPEN_DECKS, isInterior, deckPlanHalfWidth } from '../core/constants.js';

const STEP = 0.25;      // sample step along a lane
const GAP = 0.5;        // lane spacing (perpendicular)
const R_CHECK = 0.32;   // clearance radius checked (the test uses 0.25)

/** Population mix per area kind: [type, weight]. */
const MIX = {
  first: [['gent1', 0.37], ['lady1', 0.37], ['steward', 0.12], ['boy', 0.06], ['girl', 0.06], ['officer', 0.02]],
  second: [['man2', 0.4], ['woman2', 0.38], ['steward', 0.08], ['boy', 0.07], ['girl', 0.07]],
  third: [['man3', 0.44], ['woman3', 0.36], ['boy', 0.1], ['girl', 0.1]],
  crew: [['steward', 0.4], ['seaman', 0.4], ['stoker', 0.2]],
  saloon1: [['gent1', 0.35], ['lady1', 0.35], ['steward', 0.3]],
  saloon2: [['man2', 0.35], ['woman2', 0.35], ['steward', 0.3]],
  bridge: [['officer', 0.75], ['seaman', 0.25]],
  officers: [['officer', 0.5], ['seaman', 0.3], ['gent1', 0.2]],
  boat1: [['gent1', 0.38], ['lady1', 0.38], ['boy', 0.06], ['girl', 0.06], ['officer', 0.06], ['seaman', 0.06]],
  boat2: [['man2', 0.38], ['woman2', 0.38], ['boy', 0.08], ['girl', 0.08], ['seaman', 0.08]],
  fore: [['seaman', 0.85], ['officer', 0.15]],
  poop: [['man3', 0.42], ['woman3', 0.34], ['boy', 0.08], ['girl', 0.08], ['seaman', 0.08]],
  boiler: [['stoker', 0.88], ['officer', 0.12]],
  scotland: [['stoker', 0.3], ['steward', 0.3], ['seaman', 0.3], ['man3', 0.1]],
};

/** Class of an interior room from its record (cls, name, deck, position). */
function roomClass(r) {
  const n = r.name || '';
  if (/Scotland Road/.test(n)) return 'scotland';
  if (r.deck === 'tank') return /Kessel|Maschinen|Turbinen|Feuermann/.test(n) ? 'boiler' : null;
  if (r.type === 'bridge') return 'bridge';
  if (r.cls === 'first' || r.cls === 'second' || r.cls === 'third') return r.cls;
  if (/1\. Klasse|Park Lane|Große Treppe|Parlour|Restaurant|Café/.test(n)) return 'first';
  if (/2\. Klasse/.test(n)) return 'second';
  if (/3\. Klasse/.test(n)) return 'third';
  if (/Mannschaft|Heizer|Personal|Steward|Offizier|Proviant|Arbeitsgang|Ingenieur|Matrosen|Bug|Heck|Schott|Rudermaschine/.test(n)) return 'crew';
  const x = (r.x0 + r.x1) / 2, d = r.deck;
  if (d === 'A' || d === 'B') return x > -38 ? 'first' : 'second';
  if (x > 64 || x < -96) return 'third';
  if (x < -36) return 'second';
  if (d === 'C' || d === 'D' || d === 'E') return 'first';
  return null;
}

/** All areas people may use (needs world.rooms). */
export function defineAreas(world) {
  const A = [];
  const ext = (name, deck, y, x0, x1, mix, dens, z0 = -16, z1 = 16) => A.push({ name, deck, y, x0, x1, z0, z1, ext: true, mix, dens, kind: 'open' });
  const O = OPEN_DECKS;
  ext('Bootsdeck vorn', 'boat', O.boat.y, 48, O.boat.x1, MIX.officers, 1 / 14);
  ext('Bootsdeck 1. Klasse', 'boat', O.boat.y, -22, 48, MIX.boat1, 1 / 10);
  ext('Bootsdeck 2. Klasse', 'boat', O.boat.y, O.boat.x0, -22, MIX.boat2, 1 / 10);
  ext('A-Deck Promenade', 'A', O.aProm.y, O.aProm.x0, O.aProm.x1, MIX.first, 1 / 11);
  ext('B-Deck achtern', 'B', O.bAft.y, O.bAft.x0, O.bAft.x1, MIX.second, 1 / 9);
  ext('Back', 'B', O.forecastle.y, O.forecastle.x0, O.forecastle.x1, MIX.fore, 1 / 14);
  ext('Poopdeck', 'B', O.poop.y, O.poop.x0, O.poop.x1, MIX.poop, 1 / 9);
  ext('Vorderes Welldeck', 'C', O.wellFwd.y, O.wellFwd.x0, O.wellFwd.x1, MIX.third, 1 / 8);
  ext('Hinteres Welldeck', 'C', O.wellAft.y, O.wellAft.x0, O.wellAft.x1, MIX.third, 1 / 8);
  const PUBLIC = new Set(['public', 'saloon', 'restaurant', 'cafe', 'lobby', 'promenade', 'corridor', 'gym', 'bridge', 'machinery', 'tunnel']);
  for (const r of world.rooms || []) {
    if (!PUBLIC.has(r.type) || r.noAccess) continue;
    const s = r.safe || r;
    if (s.x1 - s.x0 < 1.0 || s.z1 - s.z0 < 0.8) continue;
    let cls = roomClass(r);
    if (!cls) continue;
    if (r.type === 'machinery' && r.deck !== 'tank') continue;
    const big = (s.x1 - s.x0) * (s.z1 - s.z0) > 60;
    if ((r.type === 'saloon' || r.type === 'restaurant' || /Speisesaal/.test(r.name || '')) && (cls === 'first' || cls === 'second')) cls = cls === 'first' ? 'saloon1' : 'saloon2';
    const dens = r.type === 'corridor' ? 1 / 16 : r.deck === 'tank' ? 1 / 12 : big ? 1 / 10 : 1 / 13;
    A.push({ name: r.name, deck: r.deck, y: DECK_Y[r.deck], x0: s.x0, x1: s.x1, z0: s.z0, z1: s.z1, ext: false, mix: MIX[cls] || MIX.crew, dens, kind: r.type });
  }
  return A;
}

/**
 * Generator: search the lanes of one area. Yields regularly (time slicing). Result in area.lanes:
 * { axis: 'x'|'z', c (perpendicular coordinate), a0, a1 (range along the axis), y, n (samples), side: Uint8Array
 *   (bit 0: may step +0.45 perpendicular, bit 1: may step -0.45), deck, ext, rail (outboard side sign or 0) }
 */
export function* searchLanes(world, area) {
  const y = area.y;
  // restrict to the hull
  const hwMax = 14.3;
  const z0 = Math.max(area.z0, -hwMax), z1 = Math.min(area.z1, hwMax);
  const x0 = area.x0, x1 = area.x1;
  // ramps near the area (stairs are avoided)
  const ramps = world.ramps.filter((r) => r.maxX > x0 - 1 && r.minX < x1 + 1 && r.maxZ > z0 - 1 && r.minZ < z1 + 1 && Math.min(r.y0, r.y1) < y + 1.5 && Math.max(r.y0, r.y1) > y - 1.5);
  const nx = Math.max(0, Math.floor((x1 - x0 - 0.5) / STEP) + 1), nz = Math.max(0, Math.floor((z1 - z0 - 0.5) / STEP) + 1);
  if (!nx || !nz) { area.lanes = []; return; }
  const gx0 = x0 + 0.25, gz0 = z0 + 0.25;
  // free grid on a 0.25 m lattice
  const free = new Uint8Array(nx * nz);
  let k = 0;
  for (let i = 0; i < nx; i++) {
    const x = gx0 + i * STEP;
    for (let j = 0; j < nz; j++) {
      const z = gz0 + j * STEP;
      free[i * nz + j] = isFree(world, area, ramps, x, z, y) ? 1 : 0;
      if (++k % 300 === 0) yield;
    }
  }
  const F = (i, j) => i >= 0 && j >= 0 && i < nx && j < nz && free[i * nz + j] === 1;
  const lanes = [];
  const minLen = area.ext ? 3.5 : 2.5;
  const gs = Math.round(GAP / STEP); // grid cells per lane gap
  // lanes along x (every 0.5 m in z) and along z (every 0.5 m in x)
  for (const axis of ['x', 'z']) {
    const nP = axis === 'x' ? nz : nx, nA = axis === 'x' ? nx : nz;
    for (let pj = 1; pj < nP - 1; pj += 2) {
      let start = -1;
      for (let ai = 0; ai <= nA; ai++) {
        const ok = ai < nA && (axis === 'x' ? F(ai, pj) : F(pj, ai));
        if (ok && start < 0) start = ai;
        if (!ok && start >= 0) {
          const len = (ai - 1 - start) * STEP;
          if (len >= minLen) {
            const n = ai - start, side = new Uint8Array(n);
            for (let q = 0; q < n; q++) {
              const a = start + q;
              const plus = axis === 'x' ? F(a, pj + gs) && F(a, pj + 1) : F(pj + gs, a) && F(pj + 1, a);
              const minus = axis === 'x' ? F(a, pj - gs) && F(a, pj - 1) : F(pj - gs, a) && F(pj - 1, a);
              side[q] = (plus ? 1 : 0) | (minus ? 2 : 0);
            }
            const c = axis === 'x' ? gz0 + pj * STEP : gx0 + pj * STEP;
            const a0 = (axis === 'x' ? gx0 : gz0) + start * STEP;
            lanes.push({ axis, c, a0, a1: a0 + (n - 1) * STEP, n, side, y, deck: area.deck, ext: area.ext, len: (n - 1) * STEP });
          }
          start = -1;
        }
      }
      yield;
    }
  }
  // keep long lanes, spaced apart
  lanes.sort((a, b) => b.len - a.len);
  const kept = [];
  const cap = area.ext ? 10 : 6;
  for (const L of lanes) {
    if (kept.length >= cap) break;
    let clash = false;
    for (const K of kept) {
      if (K.axis !== L.axis || Math.abs(K.c - L.c) > 1.6) continue;
      const ov = Math.min(K.a1, L.a1) - Math.max(K.a0, L.a0);
      if (ov > 0.3 * L.len) { clash = true; break; }
    }
    // z lanes only where they add something (short cross lanes in long areas are mostly in the way)
    if (!clash && L.axis === 'z' && L.len < 4 && area.x1 - area.x0 > 3 * (area.z1 - area.z0)) clash = true;
    if (!clash) kept.push(L);
  }
  for (const L of kept) {
    // rail side: lanes near the ship's side face outboard when resting
    const x = L.axis === 'x' ? (L.a0 + L.a1) / 2 : L.c, z = L.axis === 'x' ? L.c : (L.a0 + L.a1) / 2;
    L.rail = L.ext && L.axis === 'x' && Math.abs(z) > deckPlanHalfWidth(x) - 2.6 ? Math.sign(z) : 0;
  }
  area.lanes = kept;
  area.dropped = lanes.length - kept.length;
}

function isFree(world, area, ramps, x, z, y) {
  for (const r of ramps) if (x > r.minX - 0.6 && x < r.maxX + 0.6 && z > r.minZ - 0.6 && z < r.maxZ + 0.6) return false;
  if (area.ext && isInterior(x, y + 1.0, z)) return false;
  const g = world.groundAt(x, z, y + 0.3);
  if (g === null || Math.abs(g - y) > 0.01) return false;
  for (let s = 0; s < 4; s++) {
    const gx = x + (s === 0 ? 0.3 : s === 1 ? -0.3 : 0), gz = z + (s === 2 ? 0.3 : s === 3 ? -0.3 : 0);
    const h = world.groundAt(gx, gz, y + 0.3);
    if (h === null || Math.abs(h - y) > 0.01) return false;
  }
  // several radii / step heights: a resolution that happens to land on the start point is not mistaken for free
  for (let k = 0; k < 3; k++) {
    const c = k === 0 ? world.collide(x, z, y, R_CHECK, 1.85, 0.12) : k === 1 ? world.collide(x, z, y, 0.25) : world.collide(x, z, y, 0.28, 1.8, 0.25);
    if (Math.abs(c.x - x) > 0.002 || Math.abs(c.z - z) > 0.002) return false;
  }
  return true;
}

/** Lane point: s along the lane, l perpendicular offset -> world x, z. */
export function lanePoint(L, s, l, out) {
  if (L.axis === 'x') { out.x = s; out.z = L.c + l; } else { out.x = L.c + l; out.z = s; }
  return out;
}
/** May one stand at perpendicular offset l at lane position s? (|l| <= 0.45, from the side bits) */
export function sideOk(L, s, l) {
  if (Math.abs(l) < 0.02) return true;
  const i0 = Math.max(0, Math.min(L.n - 1, Math.floor((s - L.a0) / STEP))), i1 = Math.min(L.n - 1, i0 + 1);
  const bit = l > 0 ? 1 : 2;
  return (L.side[i0] & bit) !== 0 && (L.side[i1] & bit) !== 0;
}
