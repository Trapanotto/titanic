import { DECK_Y, SHIP, deckPlanHalfWidth as plan } from '../core/constants.js';

// Shared layout of the exterior structure (everything that is NOT already fixed in core/constants.js).

export const T_WALL = 0.15;     // superstructure wall thickness (outer face on the nominal line, wall grows inwards)
export const BULWARK_H = 1.1;   // solid bulwarks at forecastle / well decks / poop
export const BULWARK_T = 0.12;
export const RAIL_H = 1.05;

/** Half width of the boat deck edge, of the A-deck promenade screen / railing line. */
export const bw = (x) => Math.max(0, plan(x) - 0.2);
/** Inner face of the hull bulwark. */
export const hullEdge = (x) => Math.max(0, plan(x) - BULWARK_T);

export const X = {
  fc: 94, wellF: 78, bFwd: 78, bAft: -72, wellA: -90, poop: -106,
  aAft: -76, aFwd: 78, boatAft: -72, boatFwd: 74, screenAft: 10,
};

/** Top of the hull side plating per x-range. */
export const HULL_TOPS = [
  [SHIP.sternX, X.poop, DECK_Y.B + BULWARK_H],
  [X.poop, X.wellA, DECK_Y.C + BULWARK_H],
  [X.wellA, X.wellF, DECK_Y.B],
  [X.wellF, X.fc, DECK_Y.C + BULWARK_H],
  [X.fc, SHIP.bowX, DECK_Y.B + BULWARK_H],
];

/**
 * Exterior stairs (each exists mirrored port + starboard). Bottom at xb (height yb), top at xt (height yt),
 * occupying |z| in [zi, zo]. The railing of the upper deck has a gap exactly at [zi, zo].
 */
export const EXT_STAIRS = [
  { id: 'wellFwd-forecastle', xb: 90.2, xt: X.fc, zi: 6.0, zo: 7.5, yb: DECK_Y.C, yt: DECK_Y.B },
  { id: 'wellAft-poop', xb: -102.2, xt: X.poop, zi: 8.0, zo: 9.5, yb: DECK_Y.C, yt: DECK_Y.B },
  { id: 'wellAft-bAft', xb: -93.8, xt: X.wellA, zi: 9.0, zo: 10.5, yb: DECK_Y.C, yt: DECK_Y.B },
  { id: 'bAft-A', xb: -80, xt: X.aAft, zi: 8.0, zo: 9.5, yb: DECK_Y.B, yt: DECK_Y.A },
  { id: 'A-boat', xb: -72, xt: -68, zi: 12.3, zo: 13.75, yb: DECK_Y.A, yt: DECK_Y.boat },
];
export const stairById = (id) => EXT_STAIRS.find((s) => s.id === id);

/** Station list from x0 to x1 with steps <= maxStep, refined where f changes by more than maxDz per step. */
export function stations(x0, x1, maxStep, maxDz = 0.3, f = plan) {
  const out = [x0];
  let x = x0;
  while (x < x1 - 1e-6) {
    let step = Math.min(maxStep, x1 - x);
    while (step > 0.02 && Math.abs(f(x + step) - f(x)) > maxDz) step /= 2;
    x += step;
    if (x1 - x < 1e-4) x = x1;
    out.push(x);
  }
  return out;
}

/** Axis-aligned collider(s) along the plan segment a->b ([x,z]), padded; long oblique segments are subdivided. */
export function segCollider(world, a, b, y0, y1, pad = 0.06, maxLen = 0.8) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const L = Math.hypot(dx, dz);
  const n = (Math.abs(dx) < 1e-6 || Math.abs(dz) < 1e-6) ? 1 : Math.max(1, Math.ceil(L / maxLen));
  for (let i = 0; i < n; i++) {
    const ax = a[0] + (dx * i) / n, az = a[1] + (dz * i) / n, bx = a[0] + (dx * (i + 1)) / n, bz = a[1] + (dz * (i + 1)) / n;
    world.addCollider(Math.min(ax, bx) - pad, y0, Math.min(az, bz) - pad, Math.max(ax, bx) + pad, y1, Math.max(az, bz) + pad);
  }
}

/** Colliders that follow the hull side between xa and xb (both sides), from `inset` inside the hull line outwards. */
export function edgeColliders(world, xa, xb, y0, y1, inset = BULWARK_T) {
  const xs = stations(xa, xb, 2, 0.4);
  for (let i = 0; i < xs.length - 1; i++) {
    const p0 = plan(xs[i]), p1 = plan(xs[i + 1]);
    const lo = Math.min(p0, p1) - inset - 0.02, hi = Math.max(p0, p1) + 0.25;
    world.addCollider(xs[i], y0, lo, xs[i + 1], y1, hi);
    world.addCollider(xs[i], y0, -hi, xs[i + 1], y1, -lo);
  }
}

/** Split [z0,z1] into the intervals that remain after removing the gaps [[a,b],...]. */
export function splitLine(z0, z1, gaps) {
  const g = gaps.map(([a, b]) => [Math.min(a, b), Math.max(a, b)]).sort((p, q) => p[0] - q[0]);
  const out = [];
  let c = z0;
  for (const [a, b] of g) { if (a > c) out.push([c, Math.min(a, z1)]); c = Math.max(c, b); }
  if (c < z1) out.push([c, z1]);
  return out;
}
