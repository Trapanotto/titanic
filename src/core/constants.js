// RMS Titanic – shared dimensions and layout contract.
// Units: metres. Axes: +x = bow (forward), +y = up, +z = starboard.
// Origin: midship, keel, centreline.

export const SHIP = {
  length: 269.0,
  halfBeam: 14.1,
  bowX: 134.5,
  sternX: -134.5,
  waterline: 10.5, // y of the sea surface
};

// y of the walkable floor surface of every deck
export const DECK_Y = {
  tank: 1.6, // Tank Top (boiler rooms, engines, holds)
  orlop: 6.4,
  G: 9.0,
  F: 11.6,
  E: 14.2,
  D: 16.9,
  C: 19.7,
  B: 22.5,
  A: 25.3,
  boat: 28.2,
  roof: 31.0, // roof of the boat-deck houses
};
export const DECK_ORDER = ['tank', 'orlop', 'G', 'F', 'E', 'D', 'C', 'B', 'A', 'boat'];
export const DECK_NAMES = {
  tank: 'Tank Top (Maschinen)', orlop: 'Orlop-Deck', G: 'G-Deck', F: 'F-Deck', E: 'E-Deck',
  D: 'D-Deck', C: 'C-Deck', B: 'B-Deck', A: 'A-Deck', boat: 'Bootsdeck',
};
export const SLAB = 0.2; // deck slab thickness

/** y of the floor above `deck` (i.e. top of the slab that forms its ceiling). */
export function deckAboveY(deck) {
  if (deck === 'tank') return DECK_Y.F; // machinery spaces are full height up to F deck (midship)
  const i = DECK_ORDER.indexOf(deck);
  return i === DECK_ORDER.length - 1 ? DECK_Y.roof : DECK_Y[DECK_ORDER[i + 1]];
}
/** y of the underside of the ceiling of `deck`. */
export function ceilingY(deck) { return deckAboveY(deck) - SLAB; }

// x-segments in which the INTERIOR of each deck exists.
export const DECK_SEGMENTS = {
  tank: [[-104, 108]],            // machinery -58..66, shaft tunnel aft, cargo holds forward (full height to F only in -58..66)
  orlop: [[-112, -58], [66, 112]], // does not exist over the machinery spaces
  G: [[-116, -58], [66, 116]],     // does not exist over the machinery spaces
  F: [[-120, 120]],
  E: [[-124, 124]],
  D: [[-126, 126]],
  C: [[-134, -106], [-90, 78], [94, 133]], // under poop | main | under forecastle (well decks are open air)
  B: [[-72, 78]],                  // full-beam enclosed superstructure
  A: [[-66, 70]],                  // deckhouse, half width 10.3, promenade around it
  boat: [[-16, 18], [28, 73], [-48, -38]], // deck houses, see BOAT_HOUSES
};
export const MACHINERY_X = [-58, 66]; // tank-top spaces here are open up to the underside of F deck

// Open-air decks (built by the exterior module, incl. planking, railings, floors)
export const OPEN_DECKS = {
  boat: { y: DECK_Y.boat, x0: -72, x1: 74 },          // full beam
  aProm: { y: DECK_Y.A, x0: -76, x1: 76 },            // promenade around the A-deck house, under the boat deck
  bAft: { y: DECK_Y.B, x0: -90, x1: -72 },            // open aft end of B deck (2nd class)
  forecastle: { y: DECK_Y.B, x0: 94, x1: 134.5 },
  poop: { y: DECK_Y.B, x0: -134.5, x1: -106 },
  wellFwd: { y: DECK_Y.C, x0: 78, x1: 94 },
  wellAft: { y: DECK_Y.C, x0: -106, x1: -90 },
};

export const A_HOUSE = { x0: -66, x1: 70, hw: 10.3 }; // A-deck deckhouse (walls by exterior module)
export const B_HOUSE = { x0: -72, x1: 78 };           // B deck enclosure, walls at hull side (exterior module)
// Boat-deck houses (outer walls + roofs by exterior module, insides by deck module 'boat')
export const BOAT_HOUSES = [
  { id: 'fwd', x0: 28, x1: 73, hw: 7.5 },   // bridge/wheelhouse 66..73, officers, Marconi room, fwd grand staircase 38..46, gymnasium (stbd, 28..38)
  { id: 'mid', x0: -16, x1: 18, hw: 7.0 },  // funnel 3/4 casings, aft grand staircase entrance -6..2
  { id: 'aft', x0: -48, x1: -38, hw: 5.0 }, // 2nd class entrance
];
export const BOAT_LOW_ROOFS = [ // solid raised roofs on the boat deck, 1.4 m high, not enterable
  { x0: 19.5, x1: 26.5, hw: 6 }, { x0: -34, x1: -18, hw: 6 },
];

export const FUNNELS = [56, 34, 12, -10].map((x) => ({ x, a: 3.75, b: 2.9, height: 19, rake: 0.165 }));
export const MASTS = [{ x: 97, baseY: DECK_Y.B, topY: 62 }, { x: -80, baseY: DECK_Y.B, topY: 58 }];

// Solid vertical casings (funnel uptakes / engine casing) that pass through decks F..A.
// Interior deck shells build their walls; nothing may be placed inside.
export const CASINGS = [
  ...[56, 34, 12, -10].map((x, i) => ({ id: 'funnel' + (i + 1), x0: x - 3.5, x1: x + 3.5, hw: 3 })),
  { id: 'engine', x0: -36, x1: -24, hw: 3 },
];

// Interior staircases. Built generically by src/interior (kit). Flight k connects decks[k] -> decks[k+1].
// Even flights use the port lane (z in [zc-lane, zc]) and climb towards +x (bottom at x0, top at x1),
// odd flights use the starboard lane (z in [zc, zc+lane]) and climb towards -x (bottom at x1, top at x0).
// Deck modules must keep the rectangle expanded by 2 m in x free of walls ("stair lobby").
export const STAIRS = [
  { id: 'grandFwd', name: 'Große Treppe (vorn)', x0: 39.5, x1: 44.5, zc: 0, lane: 2.4, decks: ['E', 'D', 'C', 'B', 'A', 'boat'], style: 'grand' },
  { id: 'grandAft', name: 'Große Treppe (achtern)', x0: -5, x1: 0, zc: 0, lane: 2.0, decks: ['C', 'B', 'A', 'boat'], style: 'grand' },
  { id: 'second', name: 'Treppenhaus 2. Klasse', x0: -45.5, x1: -40.5, zc: 0, lane: 1.6, decks: ['F', 'E', 'D', 'C', 'B', 'A', 'boat'], style: 'oak' },
  { id: 'secondAft', name: 'Hinteres Treppenhaus 2. Klasse', x0: -66, x1: -61, zc: 0, lane: 1.5, decks: ['F', 'E', 'D', 'C', 'B'], style: 'oak' },
  { id: 'thirdFwd', name: 'Treppe 3. Klasse (vorn)', x0: 97, x1: 102, zc: 0, lane: 1.3, decks: ['G', 'F', 'E', 'D', 'C'], style: 'steel' },
  { id: 'thirdAft', name: 'Treppe 3. Klasse (achtern)', x0: -114, x1: -109, zc: 0, lane: 1.3, decks: ['G', 'F', 'E', 'D', 'C'], style: 'steel' },
  { id: 'holdFwd', name: 'Niedergang Laderaum vorn', x0: 70, x1: 74.5, zc: 0, lane: 1.1, decks: ['orlop', 'G'], style: 'steel' },
  { id: 'holdAft', name: 'Niedergang Laderaum achtern', x0: -76.5, x1: -72, zc: 0, lane: 1.1, decks: ['orlop', 'G'], style: 'steel' },
];
// Openings in the F-deck floor for the machinery access stairs (stairs/catwalks built by the 'tank' module).
export const MACHINERY_ACCESS = [
  { id: 'engineAccess', x0: -34, x1: -29, z0: 8, z1: 10.5 },
  { id: 'boilerAccess', x0: 20, x1: 25, z0: -10.5, z1: -8 },
];

// Doors between open decks and interiors. `axis` = direction the wall runs along. Opening is w x h, sill at deck level.
export const EXT_DOORS = [
  // boat deck houses (wall at z = ±hw)
  ...[-1, 1].flatMap((s) => [
    { deck: 'boat', x: 42, z: 7.5 * s, axis: 'x' },   // fwd grand staircase entrance
    { deck: 'boat', x: 69, z: 7.5 * s, axis: 'x' },   // bridge wings
    { deck: 'boat', x: -2, z: 7.0 * s, axis: 'x' },   // aft grand staircase entrance
    { deck: 'boat', x: -43, z: 5.0 * s, axis: 'x' },  // 2nd class entrance
    { deck: 'A', x: 42, z: 10.3 * s, axis: 'x' },
    { deck: 'A', x: 22, z: 10.3 * s, axis: 'x' },
    { deck: 'A', x: -2, z: 10.3 * s, axis: 'x' },
    { deck: 'A', x: -43, z: 10.3 * s, axis: 'x' },
    { deck: 'A', x: -66, z: 4 * s, axis: 'z' },       // aft end wall of the A house
    { deck: 'B', x: -72, z: 5 * s, axis: 'z' },       // aft end of B enclosure -> open B deck aft
    { deck: 'C', x: 78, z: 6 * s, axis: 'z' },        // fwd well deck -> main C deck
    { deck: 'C', x: 94, z: 4 * s, axis: 'z' },        // fwd well deck -> under forecastle
    { deck: 'C', x: -90, z: 6 * s, axis: 'z' },       // aft well deck -> main C deck
    { deck: 'C', x: -106, z: 5 * s, axis: 'z' },      // aft well deck -> under poop
  ]),
  { deck: 'boat', x: 33, z: 7.5, axis: 'x' },         // gymnasium (starboard)
  { deck: 'boat', x: 50, z: -7.5, axis: 'x' },        // officers' quarters (port)
].map((d) => ({ w: 1.2, h: 2.1, ...d }));

export const ZONE_LEN = 24; // interior culling zone length along x

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Half breadth of the hull at main-deck level (plan view). */
export function deckPlanHalfWidth(x) {
  const B = SHIP.halfBeam;
  if (x >= SHIP.bowX || x <= SHIP.sternX) return 0;
  if (x > 40) return B * (1 - Math.pow((x - 40) / (SHIP.bowX - 40), 1.9));
  if (x < -70) return B * Math.sqrt(Math.max(0, 1 - Math.pow((-70 - x) / (-SHIP.sternX - 70), 3)));
  return B;
}

/** Half breadth of the hull's OUTER surface at station x and height y (keel = 0). Constant above C deck. */
export function hullHalfWidth(x, y) {
  const plan = deckPlanHalfWidth(x);
  if (plan <= 0) return 0;
  const yn = clamp(y / DECK_Y.C, 0, 1);
  let e = 0;
  if (x > 40) e = 0.8 * (x - 40) / (SHIP.bowX - 40);
  else if (x < -70) e = 0.95 * (-70 - x) / (-SHIP.sternX - 70);
  let hw = plan * (1 - e * Math.pow(1 - yn, 1.5));
  const r = 2.6; // bilge radius
  if (y < r) {
    const d = r - Math.max(y, 0);
    hw -= (r - Math.sqrt(Math.max(0, r * r - d * d))) * (hw / SHIP.halfBeam);
  }
  return Math.max(0, hw);
}

/** True if x lies inside one of the interior segments of the deck. */
export function deckHasInterior(deck, x) {
  return DECK_SEGMENTS[deck].some(([a, b]) => x >= a && x <= b);
}

/** Which deck does height y belong to (feet position)? */
export function deckAtY(y) {
  let best = 'tank';
  for (const d of DECK_ORDER) if (y >= DECK_Y[d] - 0.6) best = d;
  return best;
}

/** Rough test whether a point is under a roof (used for lighting / audio). */
export function isInterior(x, y, z) {
  const az = Math.abs(z);
  if (y < DECK_Y.C - 0.3) return az < hullHalfWidth(x, y) && Math.abs(x) < SHIP.bowX;
  if (y < DECK_Y.B - 0.3) return deckHasInterior('C', x) && az < hullHalfWidth(x, y);
  if (y < DECK_Y.A - 0.3) return x > B_HOUSE.x0 && x < B_HOUSE.x1 && az < hullHalfWidth(x, y);
  if (y < DECK_Y.boat - 0.3) return x > A_HOUSE.x0 && x < A_HOUSE.x1 && az < A_HOUSE.hw;
  if (y < DECK_Y.roof - 0.2) return BOAT_HOUSES.some((h) => x > h.x0 && x < h.x1 && az < h.hw);
  return false;
}
