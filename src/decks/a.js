// A deck ("Promenade Deck") – inside of the A-deck house (x -66..70, |z| <= 10.3); the promenade around it is exterior.
// Bow → stern: first-class staterooms A1–A37 around the funnel-1 casing, forward Grand Staircase with the three lifts,
// cabins beside the funnel-2 casing, Reading & Writing Room, Lounge (funnel 3), aft Grand Staircase, bar pantry and
// lavatories around funnel 4, Smoking Room around the engine casing, Verandah Cafés with the second-class staircase
// between them, and the aft second-class entrance with pantries and stores.
import { DECK_Y } from '../core/constants.js';
import { buildDeckShell, createDeckPlan } from '../interior/kit.js';
import { sidesBut, deckMats } from './boat-util.js';
import {
  furnishHallFwd, furnishLounge, furnishReading, furnishSmoking, furnishVerandah, furnishHallAft, furnishSecondStair,
  furnishSecondHall, furnishBarPantry, furnishVerandahPantry, ceilingDetailsA,
} from './a-hero.js';

const deck = 'A';

export async function build(world) {
  const Y = DECK_Y[deck], DM = deckMats();
  buildDeckShell(world, deck);
  const plan = createDeckPlan(world, deck, { wall: 'whitePanel', floor: null });

  const G1 = '1. Klasse', G2 = '2. Klasse', GS = 'Service';
  const room = (id, name, x0, x1, z0, z1, o = {}) => plan.room({ id: 'A-' + id, name, x0, x1, z0, z1, ...o });
  const gang = (id, name, x0, x1, z0, z1, o = {}) => plan.corridor({ id: 'A-' + id, name, x0, x1, z0, z1, ...o });
  const dP = (at, o = {}) => ({ side: 'port', at, ...o }), dS = (at, o = {}) => ({ side: 'stbd', at, ...o });
  const dA = (at, o = {}) => ({ side: 'aft', at, ...o }), dF = (at, o = {}) => ({ side: 'fwd', at, ...o });
  const SVC = { type: 'service', wall: 'paintWhite', lamp: 'bulkhead' };
  const WET = { type: 'bath', wall: 'tile', floor: 'tile' };

  const AA = -65.95, AF = 69.95;      // room limits at the house end walls (kit walls hidden behind the exterior walls)
  const C = 3;                        // casing half width
  const SC0 = 5.4, SC1 = 7.0;         // forward side corridors (1st class), |z|
  const MC = 0.8;                     // forward centre corridor half width
  const K0 = 4.8;                     // outer edge of the corridors beside the funnel-2 casing
  const XH0 = 37.5, XH1 = 47.5;       // forward Grand Staircase hall (keep-out 37.5..46.5 + lifts 45.5..47.5)
  const XQ0 = 59.5, XQ1 = 61.1;       // forward cross corridor (just forward of the funnel-1 casing)

  // ============================================================ forward staterooms x 47.5..70
  for (const s of [-1, 1]) {
    const stb = s > 0, sd = stb ? 'stbd' : 'bb', odd = stb ? 1 : 0;
    gang('gang-vorn-' + sd, stb ? 'Gang Steuerbord (vorn)' : 'Gang Backbord (vorn)', XH1, AF, stb ? SC0 : -SC1, stb ? SC1 : -SC0, { teleport: { group: G1 } });
    // window cabins A1–A14 (odd starboard, even port), numbered from the bow
    plan.cabinRow({
      x0: XH1, x1: AF, z0: stb ? SC1 : -99, z1: stb ? 99 : -SC1, count: 7, corridorSide: stb ? 'port' : 'stbd', type: 'first',
      numbering: { deckLetter: 'A', start: 13 + 1 - odd, step: -2 }, wall: stb ? 'whiteGold' : 'damaskBlue', group: G1,
    });
    // inside cabins forward of the cross corridor
    plan.cabinRow({
      x0: XQ1, x1: AF, z0: stb ? MC : -SC0, z1: stb ? SC0 : -MC, count: 3, corridorSide: stb ? 'port' : 'stbd', type: 'first',
      numbering: { deckLetter: 'A', start: 19 + 1 - odd, step: -2 }, wall: stb ? 'damaskGreen' : 'damaskRed', floor: 'carpetBlue', group: G1,
    });
    // inside suite aft of the funnel-1 casing, behind the lifts
    const n = stb ? 21 : 22;
    room('A' + n, `Kabine A ${n}`, XH1, 52.5, stb ? 0 : -SC0, stb ? SC0 : 0, {
      type: 'cabin', cls: 'first', wall: 'damaskGold', floor: 'carpetRed', furnish: 'cabinFirstSuite',
      doors: [{ side: stb ? 'stbd' : 'port', at: 50.0, label: 'A' + n }],
    });
  }
  // service rooms along the funnel-1 casing
  room('bad-1', 'Bad (Steuerbord vorn)', 52.5, 54.83, C, SC0, { ...WET, furnish: 'bathroom', doors: [dS(53.4)] });
  room('wc-1', 'WC Damen', 54.83, 57.17, C, SC0, { ...WET, furnish: 'wc', doors: [dS(56.0)] });
  room('bad-2', 'Bad (Steuerbord achtern)', 57.17, XQ0, C, SC0, { ...WET, furnish: 'bathroom', doors: [dS(58.6)] });
  room('anrichte-vorn', 'Anrichte der Stewards (vorn)', 52.5, 56, -SC0, -C, { ...SVC, floor: 'tile', furnish: 'pantry', doors: [dP(55.0)] });
  room('bad-3', 'Bad (Backbord)', 56, 57.75, -SC0, -C, { ...WET, furnish: 'bathroom', doors: [dP(56.9)] });
  room('wc-2', 'WC Herren', 57.75, XQ0, -SC0, -C, { ...WET, furnish: 'wc', doors: [dP(58.6)] });
  gang('quergang-vorn', 'Quergang (vorn)', XQ0, XQ1, -SC0, SC0, { teleport: { group: G1 } });
  gang('mittelgang-vorn', 'Mittelgang (vorn)', XQ1, AF, -MC, MC, { teleport: { group: G1, yaw: 0 } });

  // ============================================================ forward Grand Staircase x 37.5..47.5
  room('treppe-vorn', 'Große Treppe – A-Deck', XH0, XH1, -99, 99, {
    type: 'lobby', cls: 'first', stairs: true, wall: { base: 'oakPanel', cornice: 'gold' }, floor: 'linoCream', lamp: 'bowl', furnish: furnishHallFwd,
    doors: [dF(-6.2, { w: 1.2, leaf: false }), dF(6.2, { w: 1.2, leaf: false }), dA(-3.9, { w: 1.2, leaf: false }), dA(3.9, { w: 1.2, leaf: false })],
    teleport: { name: 'Große Treppe – A-Deck', group: G1, x: 45.0, z: 0, yaw: Math.PI },
    info: { title: 'Die Aufzüge auf dem A-Deck', x: 45, z: 3.3, radius: 3, text: 'Direkt vor der Großen Treppe lagen drei elektrische Aufzüge der Ersten Klasse, die vom A-Deck bis hinunter zum E-Deck fuhren. Die Kabinen waren mit Mahagoni getäfelt und mit Sitzbänken ausgestattet; ein Liftboy bediente sie. Das A-Deck war ihre oberste Haltestelle.' },
  });

  // ============================================================ funnel-2 casing x 30.5..37.5: corridors and cabins
  gang('gang-lounge', 'Gang zur Lounge (Steuerbord)', 19, XH0, C, K0, { teleport: { group: G1, yaw: Math.PI } });
  gang('gang-lese', 'Gang zum Lesezimmer (Backbord)', 30.5, XH0, -K0, -C, {});
  plan.cabinRow({ x0: 30.5, x1: XH0, z0: K0, z1: 99, count: 2, corridorSide: 'port', type: 'first', numbering: { deckLetter: 'A', start: 33, step: -2 }, wall: 'whiteGold', group: G1 });
  room('A34', 'Kabine A 34', 34, XH0, -99, -K0, { type: 'cabin', cls: 'first', wall: 'damaskGreen', floor: 'carpetRed', furnish: 'cabinFirst', doors: [dS(36.8, { label: 'A34' })] });
  room('A36', 'Kabine A 36 (Thomas Andrews)', 30.5, 34, -99, -K0, {
    type: 'cabin', cls: 'first', wall: 'whiteGold', floor: 'carpetRed', furnish: { preset: 'cabinFirst', beds: 1 }, doors: [dS(31.2, { label: 'A36' })],
    teleport: { name: 'Kabine A36 (Thomas Andrews)', group: G1 },
    info: { title: 'Kabine A36 – Thomas Andrews', text: 'In dieser Kabine reiste Thomas Andrews, der Chefkonstrukteur der Werft Harland & Wolff. Er notierte während der Reise Verbesserungen bis hin zu Kleiderhaken. Nach der Kollision erkannte er als Erster, dass das Schiff sinken würde; zuletzt wurde er im Rauchsalon der Ersten Klasse gesehen.' },
  });

  // ============================================================ x 19..30.5: Reading & Writing Room, starboard strip
  room('lesezimmer', 'Lese- und Schreibzimmer', 19, 30.5, -99, C, {
    type: 'public', cls: 'first', wall: { base: 'whitePanel', cornice: 'paintWhite', dado: 'paintWhite' }, floor: DM.carpetRose, lamp: false, furnish: furnishReading,
    doors: [dS(21.0, { w: 1.2 }), dS(28.6, { w: 1.2 }), dF(-3.9, { w: 1.0 }), dA(-1.5, { w: 1.2 })],
    teleport: { name: 'Lese- und Schreibzimmer', group: G1, x: 21.0, z: 2.1, yaw: Math.PI / 2 },
    info: { title: 'Das Lese- und Schreibzimmer', text: 'Der helle, in weißem georgianischem Stil getäfelte Raum war vor allem für die Damen der Ersten Klasse gedacht, die sich nach dem Essen zum Lesen und Briefeschreiben zurückzogen. Ein großes Erkerfenster öffnete sich zur Promenade. Weil der Raum wenig genutzt wurde, verkleinerte man ihn beim Schwesterschiff Britannic.' },
  });
  room('stewardraum', 'Stewardsraum (Lounge)', 19, 20.9, K0, 99, { ...SVC, floor: 'linoRed', furnish: { preset: 'store', shelves: 2 }, doors: [dP(19.95)] });
  gang('vorraum-stb', 'Vorraum Steuerbord (Promenadeneingang)', 20.9, 23.1, K0, 99, {});
  plan.cabinRow({ x0: 23.1, x1: 30.5, z0: K0, z1: 99, count: 2, corridorSide: 'port', type: 'first', numbering: { deckLetter: 'A', start: 37, step: -2 }, wall: 'damaskBlue', group: G1 });

  // ============================================================ Lounge x 2..19 (funnel-3 casing 8.5..15.5)
  room('lounge', 'Gesellschaftssalon (Lounge)', 2, 19, -99, 99, {
    type: 'public', cls: 'first', casing: true, wall: { base: 'oakPanel', cornice: 'gold', dado: 'gold' }, floor: 'carpetGreen', lamp: false, furnish: furnishLounge,
    doors: [dA(-4.5, { w: 1.6, leaf: false }), dA(4.5, { w: 1.6, leaf: false }), dF(3.9, { w: 1.2, leaf: false })],
    teleport: { name: 'Gesellschaftssalon (Lounge)', group: G1, x: 3.0, z: 6.4, yaw: -0.4 },
    info: { title: 'Die Lounge der Ersten Klasse', x: 5.5, z: 3.0, radius: 6, text: 'Die Lounge war im Stil Ludwigs XV. nach Vorbildern aus dem Schloss Versailles eingerichtet: geschnitzte Eichenholzvertäfelung, ein großer Kamin mit einer Statue der Artemis von Versailles, ein prachtvoller Kronleuchter und eine Bücherei, aus der Bücher entliehen werden konnten. Hier spielte man Karten, las und trank Tee; die Bordkapelle gab nachmittags Konzerte.' },
  });

  // ============================================================ aft Grand Staircase x -6.5..2
  room('treppe-achtern', 'Große Treppe (achtern) – A-Deck', -6.5, 2, -99, 99, {
    type: 'lobby', cls: 'first', stairs: true, wall: { base: 'oakPanel', cornice: 'gold' }, floor: 'linoCream', lamp: 'bowl', furnish: furnishHallAft,
    doors: [dA(-3.8, { w: 1.1, leaf: false }), dA(3.8, { w: 1.1, leaf: false })],
    teleport: { name: 'Große Treppe (achtern) – A-Deck', group: G1, x: 0.9, z: 0, yaw: Math.PI },
    info: { title: 'Hintere Treppe auf dem A-Deck', x: -3, z: 3.4, radius: 3.5, text: 'Die hintere Große Treppe lag zwischen Lounge und Rauchsalon. Von hier betraten die Herren nach dem Dinner den Rauchsalon, während sich die Damen in der Lounge oder im Lesezimmer aufhielten. Seitliche Türen führten direkt auf die Promenade des A-Decks.' },
  });

  // ============================================================ funnel-4 casing x -13.5..-6.5
  gang('gang-f4-bb', 'Gang Backbord (Schornstein 4)', -13.5, -6.5, -4.6, -C, {});
  gang('gang-f4-stb', 'Gang Steuerbord (Schornstein 4)', -13.5, -6.5, C, 4.6, { teleport: { name: 'Gang zum Rauchsalon', group: G1, yaw: Math.PI } });
  room('bar-rauch', 'Bar des Rauchsalons', -13.5, -6.5, -99, -4.6, {
    ...SVC, cls: 'first', wall: 'mahogany', floor: 'tile', lamp: 'bowl', furnish: furnishBarPantry, doors: [dA(-7.4, { style: 'mahogany' }), dS(-8.2)],
  });
  room('wc-rauch', 'Herrentoilette', -13.5, -10, 4.6, 99, { ...WET, furnish: 'wc', doors: [dP(-11.8)] });
  room('anrichte-lounge', 'Anrichte der Lounge', -10, -6.5, 4.6, 99, { ...SVC, floor: 'tile', furnish: 'pantry', doors: [dF(6.0)] });

  // ============================================================ Smoking Room x -36..-13.5 (engine casing -36..-24)
  room('rauchsalon', 'Rauchsalon 1. Klasse', -36, -13.5, -99, 99, {
    type: 'public', cls: 'first', casing: true, wall: { base: 'mahogany', cornice: 'woodDark', dado: 'woodDark' }, floor: DM.linoSmoke, lamp: false, furnish: furnishSmoking,
    doors: [dF(-3.8, { w: 1.1, style: 'mahogany' }), dF(3.8, { w: 1.1, style: 'mahogany' })],
    teleport: { name: 'Rauchsalon 1. Klasse', group: G1, x: -14.4, z: 2.4, yaw: Math.PI },
    info: { title: 'Der Rauchsalon der Ersten Klasse', x: -18, z: 3.5, radius: 6, text: 'Der Rauchsalon war den Herren vorbehalten. Die Wände waren im georgianischen Stil mit Mahagoni getäfelt und mit Perlmutt eingelegt, die Fenster aus Bleiglas zeigten Häfen, Schiffe und Wappen und wurden von hinten beleuchtet. In grünen Ledersesseln wurde geraucht, getrunken und Karten gespielt.' },
  });

  // ============================================================ Verandah Cafés + second-class staircase x -47.5..-36
  for (const s of [-1, 1]) {
    const stb = s > 0;
    room(stb ? 'verandah-stb' : 'verandah-bb', stb ? 'Verandah-Café und Palmenhof (Steuerbord)' : 'Verandah-Café und Palmenhof (Backbord)', -47.5, -36, stb ? C : -99, stb ? 99 : -C, {
      type: 'public', cls: 'first', wall: { base: 'whitePanel', cornice: 'paintWhite' }, floor: DM.tileCheck, lamp: false, furnish: furnishVerandah,
      doors: [dF(s * 6.5, stb ? { w: 2.5, leaf: false, style: 'mahogany' } : { w: 1.2, style: 'mahogany' })], // starboard: revolving door
      teleport: { name: stb ? 'Verandah-Café (Steuerbord)' : 'Verandah-Café (Backbord)', group: G1, x: -37.0, z: s * (stb ? 4.5 : 5.4), yaw: Math.PI },
      info: stb
        ? { title: 'Verandah-Café und Palmenhof', text: 'Die beiden Verandah-Cafés am achteren Ende des A-Decks sollten an eine sonnige Terrasse erinnern: weiß lackierte Spaliere mit Efeu, Korbstühle, Palmen und große Fenster. Das Café an Backbord war für Nichtraucher gedacht, das an Steuerbord schloss an den Rauchsalon an. Vor allem Familien mit Kindern hielten sich hier gern auf.' }
        : undefined,
    });
  }
  room('treppe-2kl', 'Treppenhaus 2. Klasse – A-Deck', -47.5, -36, -C, C, {
    type: 'lobby', cls: 'second', stairs: true, wall: 'oak', floor: 'linoBlue', lamp: false, furnish: furnishSecondStair,
    doors: [dA(0, { w: 1.0, style: 'oak' })],
    teleport: { name: 'Treppenhaus 2. Klasse – A-Deck', group: G2, x: -37.0, z: -2.2, yaw: Math.PI },
    info: { title: 'Treppenhaus der Zweiten Klasse', x: -39, z: 2.3, radius: 2.5, text: 'Das Treppenhaus der Zweiten Klasse führte vom F-Deck bis hinauf zum Bootsdeck. Auf dem A-Deck, das der Ersten Klasse gehörte, lag es abgeschlossen zwischen den beiden Verandah-Cafés; nur eine schlichte Tür führte zu den achteren Diensträumen.' },
  });

  // ============================================================ aft x -66..-47.5: second-class entrance, pantries, stores
  room('halle-2kl', 'Eingangshalle 2. Klasse (achtern)', AA, -60, -5.5, 5.5, {
    type: 'lobby', cls: 'second', walls: sidesBut('aft'), wall: 'oak', floor: 'linoBlue', lamp: 'dome', furnish: furnishSecondHall,
    teleport: { name: 'Eingangshalle 2. Klasse (achtern)', group: G2, x: -62.5, z: 0, yaw: 0 },
  });
  plan.opening(-60, -1, -60, 1);
  gang('gang-2kl', 'Gang 2. Klasse (achtern)', -60, -47.5, -1, 1, { wall: 'whitePanel', floor: 'linoBlue', teleport: { group: G2, yaw: 0 } });
  for (const s of [-1, 1]) {
    const stb = s > 0, sd = stb ? 'stb' : 'bb', zr = stb ? [1, 99] : [-99, -1], cd = stb ? 'port' : 'stbd';
    room('anrichte-verandah-' + sd, stb ? 'Bar-Anrichte Verandah-Café (Steuerbord)' : 'Anrichte Verandah-Café (Backbord)', -52, -47.5, zr[0], zr[1], {
      ...SVC, floor: 'tile', furnish: furnishVerandahPantry, doors: [{ side: cd, at: -49.75 }, dF(s * 6.0)],
    });
    room('vorrat-' + sd, stb ? 'Vorratsraum (Steuerbord)' : 'Vorratsraum (Backbord)', -56, -52, zr[0], zr[1], { ...SVC, floor: 'linoRed', furnish: 'store', doors: [{ side: cd, at: -54 }] });
    room(stb ? 'waesche' : 'wc-2kl', stb ? 'Wäschekammer' : 'Toiletten 2. Klasse', -60, -56, zr[0], zr[1], stb
      ? { ...SVC, floor: 'linoRed', furnish: 'linen', doors: [{ side: cd, at: -58 }] }
      : { ...WET, furnish: 'wc', doors: [{ side: cd, at: -58 }] });
    room('lager-achtern-' + sd, stb ? 'Lagerraum (Steuerbord achtern)' : 'Lagerraum (Backbord achtern)', AA, -60, stb ? 5.5 : -99, stb ? 99 : -5.5, {
      ...SVC, walls: sidesBut('aft'), floor: 'linoRed', furnish: 'store', doors: [{ side: stb ? 'port' : 'stbd', at: -62.0 }],
    });
  }

  ceilingDetailsA(plan);
  const res = plan.finish();
  if (res.problems.length) console.warn(`[A] ${res.problems.length} kit problem(s)`);
  world.addInfo({
    title: 'Die Kabinen des A-Decks', x: 64, y: Y + 1.5, z: 6.2, radius: 3,
    text: 'Das A-Deck trug vorn rund 36 Erste-Klasse-Kabinen mit den Nummern A1 bis A37, teils mit Fenstern zur geschlossenen Promenade, teils als Innenkabinen. Bäder und Toiletten lagen um den ersten Schornsteinschacht. Die gläserne Verkleidung der vorderen Promenade war ein Merkmal, das die Titanic von ihrem Schwesterschiff Olympic unterschied.',
  });
  return {};
}
