// Example deck module (NOT listed in src/modules.js): a believable 60 m piece of E deck built with the interior kit.
// Run:  node tools/smoke.mjs src/interior/stairs.js src/decks/_example.js --bake
//       node src/interior/check.mjs E src/decks/_example.js
import { buildDeckShell, bulkhead, createDeckPlan, armchair, pottedPalm, tableRound } from '../interior/kit.js';

export async function build(world) {
  const deck = 'E', X0 = 37.5, X1 = 94;

  // 1. shell: floor (with stair holes), ceiling, hull lining + portholes, casing of funnel 1
  buildDeckShell(world, deck, { x0: X0, x1: X1, ends: { aft: true, fwd: true } });

  // 2. rooms
  const plan = createDeckPlan(world, deck, { wall: 'whitePanel', floor: 'linoCream' });
  const CZ = 6.8, CW = 1.6;            // corridors: inner edge at |z| = 6.8, 1.6 m wide
  const AFT = 46.5, FWD = 80;          // cabin area between the stair lobby and the firemen's quarters

  // stair lobby around the forward grand staircase (E deck is its lowest level)
  plan.room({
    id: 'E-lobby', name: 'Treppenhalle E-Deck', type: 'lobby', stairs: true, x0: X0, x1: AFT, z0: -10, z1: 10,
    wall: 'oakPanel', floor: 'linoCream', lamp: 'bowl',
    doors: [{ side: 'fwd', at: -(CZ + CW / 2), w: 1.3, leaf: false }, { side: 'fwd', at: CZ + CW / 2, w: 1.3, leaf: false }],
    teleport: { group: '1. Klasse' },
    info: { title: 'Große Treppe – E-Deck', text: 'Hier endet die vordere Große Treppe der Ersten Klasse. Von dieser Halle führen die Gänge zu den Kabinen des E-Decks; drei Aufzüge verbanden sie mit den oberen Decks.' },
    furnish: (ctx) => {            // hand-placed details in a kit room: a small seating group in the corner
      ctx.put(tableRound({ r: 0.4, mat: 'oak' }), 1.6, ctx.D - 1.6, 'in');
      ctx.put(armchair({ kind: 'uph', mat: 'fabricGreen' }), 0.6, ctx.D - 1.6, 'right');
      ctx.put(armchair({ kind: 'uph', mat: 'fabricGreen' }), 1.6, ctx.D - 0.6, 'out');
      ctx.put(pottedPalm(), ctx.W - 0.6, ctx.D - 0.6, 'in', { collide: false });
    },
  });
  // rooms beside the lobby, entered from it (the door is declared by the small room; the lobby wall gets the opening)
  plan.room({ id: 'E-purser', name: 'Zahlmeisterbüro', x0: X0, x1: AFT, z0: -99, z1: -10, wall: 'oakDado', floor: 'carpetGreen', furnish: 'office', doors: [{ side: 'stbd', at: 44 }] });
  plan.room({ id: 'E-linen', name: 'Wäschekammer', x0: X0, x1: AFT, z0: 10, z1: 99, wall: 'paintWhite', floor: 'linoRed', furnish: 'linen', doors: [{ side: 'port', at: 44 }] });

  // two longitudinal corridors and a cross passage
  for (const s of [-1, 1]) {
    plan.corridor({ id: s < 0 ? 'E-gang-bb' : 'E-gang-stb', name: s < 0 ? 'Gang Backbord' : 'Gang Steuerbord', x0: AFT, x1: FWD, z0: s < 0 ? -CZ - CW : CZ, z1: s < 0 ? -CZ : CZ + CW, handrail: true });
  }
  plan.corridor({ id: 'E-quergang', name: 'Quergang', x0: 66, x1: 67.4, z0: -CZ, z1: CZ });

  // hull-side first-class cabins: specified beyond the hull, clipped automatically (they get shallower towards the bow)
  plan.cabinRow({ x0: AFT, x1: FWD, z0: -99, z1: -CZ - CW, count: 10, corridorSide: 'stbd', type: 'first', numbering: { deckLetter: 'E', start: 1, step: 2 } });
  plan.cabinRow({ x0: AFT, x1: FWD, z0: CZ + CW, z1: 99, count: 10, corridorSide: 'port', type: 'first', numbering: { deckLetter: 'E', start: 2, step: 2 }, wall: 'damaskGreen' });

  // inner cabin rows (interrupted by the cross passage)
  plan.cabinRow({ x0: AFT, x1: 66, z0: -CZ, z1: -3.4, count: 7, corridorSide: 'port', type: 'second', numbering: { deckLetter: 'E', start: 101, step: 2 } });
  plan.cabinRow({ x0: 67.4, x1: FWD, z0: -CZ, z1: -3.4, count: 4, corridorSide: 'port', type: 'second', numbering: { deckLetter: 'E', start: 115, step: 2 }, berths: 4 });
  plan.cabinRow({ x0: AFT, x1: 66, z0: 3.4, z1: CZ, count: 8, corridorSide: 'stbd', type: 'third', numbering: { deckLetter: 'E', start: 102, step: 2 } });
  plan.cabinRow({ x0: 67.4, x1: FWD, z0: 3.4, z1: CZ, count: 5, corridorSide: 'stbd', type: 'crew', numbering: { deckLetter: 'E', start: 118, step: 2 } });

  // centre strip: pantry (aft of the funnel casing 52.5..59.5), bathroom block, stewards' mess
  plan.room({ id: 'E-pantry', name: 'Anrichte', x0: AFT, x1: 52.4, z0: -3.4, z1: 3.4, wall: 'paintWhite', floor: 'tile', furnish: 'pantry', doors: [{ side: 'aft', at: 3.05 }] });
  plan.room({ id: 'E-bad-1', name: 'Bad', x0: 59.6, x1: 66, z0: -3.4, z1: -1, wall: 'tile', floor: 'tile', furnish: { preset: 'bathroom', shower: true }, doors: [{ side: 'fwd', at: -2.2 }] });
  plan.room({ id: 'E-wc-1', name: 'WC', x0: 59.6, x1: 66, z0: -1, z1: 1, wall: 'tile', floor: 'tile', furnish: 'wc', doors: [{ side: 'fwd', at: 0 }] });
  plan.room({ id: 'E-bad-2', name: 'Bad', x0: 59.6, x1: 66, z0: 1, z1: 3.4, wall: 'tile', floor: 'tile', furnish: 'bathroom', doors: [{ side: 'fwd', at: 2.2 }] });
  plan.room({ id: 'E-messe', name: 'Stewardmesse', x0: 67.4, x1: FWD, z0: -3.4, z1: 3.4, wall: 'pine', floor: 'linoRed', furnish: 'mess', doors: [{ side: 'aft', at: 0 }] });

  // firemen's quarters forward of a watertight bulkhead (walls: none – bulkhead, hull lining and end bulkhead enclose it)
  bulkhead(world, deck, FWD, { doors: [{ z: -(CZ + CW / 2) }, { z: CZ + CW / 2 }] });
  plan.room({ id: 'E-heizer', name: 'Heizerlogis', type: 'crew', x0: FWD, x1: X1, z0: -99, z1: 99, walls: 'none', facing: 'aft', floor: 'linoRed', lamp: 'bulkhead', furnish: 'dormitory', teleport: { group: 'Besatzung' } });

  const res = plan.finish();
  console.info(`[example E] ${res.rooms.length} rooms, ${res.walls} wall pieces, ${res.doors} doors, ${res.problems.length} problems`);
  return {};
}
