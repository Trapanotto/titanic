// E deck ("Upper Deck") – complete layout, bow → stern.
// Port: "Scotland Road" (crew working alleyway) with the crew quarters outboard. Starboard: "Park Lane" with the
// first-class staterooms, aft of it second class. Forward and aft ends: third class and crew. Eleven watertight
// bulkheads with doors where they cross the corridors.
import { DECK_Y } from '../core/constants.js';
import { buildDeckShell, bulkhead, createDeckPlan, basinSmall, bench, showerBath, trunk, piano, locker, bunkCrew, workbench, shelves, PRESETS } from '../interior/kit.js';
import { scotlandRoadDetails, grandLobbyDetails, musiciansExtras } from './e-details.js';
import { dormitoryPlus, fineLv } from './f-util.js';
import { crewMess } from './c-hero.js';

const deck = 'E';
// longitudinal lines (wall centre lines, z)
const SR0 = -8.9, SR1 = -6.5, SRC = (SR0 + SR1) / 2;   // Scotland Road, 2.4 m wide
const PL0 = 7.2, PL1 = 9.0, PLC = (PL0 + PL1) / 2;     // Park Lane / second-class corridor, 1.8 m
const TP0 = -7.7, TP1 = SR1, TPC = (TP0 + TP1) / 2;    // third-class corridor aft, port (continues Scotland Road)
const CH = 3;                                          // casings |z| <= 3
const ST = -2;                                         // port edge of the centre strip between the casings
const FC0 = 4.6, FC1 = 5.8, FCC = 5.2;                 // third-class corridors forward (x 66..90)
const AC0 = 5.0, AC1 = 6.2, ACC = 5.6;                 // third-class corridors aft (x -120..-100)
const BULKHEADS = [108, 90, 66, 50, 28, 6, -16, -38, -58, -80, -100];

// simple wash room: row of basins, shower, bench
function washroom(ctx) {
  const n = Math.max(1, Math.floor((ctx.W - 0.3) / 0.75));
  for (let i = 0; i < n; i++) ctx.put(basinSmall(), ((i + 0.5) * ctx.W) / n, ctx.D - 0.22, 'out', { collide: false });
  ctx.fit(showerBath(), ['left:lo', 'right:lo', 'left:hi']);
  ctx.fit(bench({ w: Math.min(1.6, ctx.D - 1.4), back: false }), ['right:hi', 'left:hi'], { collide: false });
}
// engineers' mess: the kit's mess, laid for a meal (teapots, bread) from fine level 0
function engMess(ctx) { if (fineLv() < 0) { ctx.opts = { set: true }; PRESETS.mess(ctx); } else crewMess(ctx); }
// the bandsmen's cabin: bunks, lockers, instrument trunks and an upright piano
function musicians(ctx) {
  ctx.fit(bunkCrew(), ['right:hi']); ctx.fit(bunkCrew(), ['left:hi']); ctx.fit(bunkCrew(), ['far:mid']); ctx.fit(bunkCrew(), ['far:lo', 'far:hi']);
  ctx.fit(piano(), ['near:hi', 'left:lo', 'right:lo']);
  ctx.fit(locker({ n: 3 }), ['left:lo', 'right:lo', 'near:hi']);
  ctx.fit(trunk({ big: true }), ['right:lo', 'left:lo', 'far:hi']); ctx.fit(trunk(), ['right:mid', 'left:mid'], { collide: false });
  musiciansExtras(ctx);
}

export async function build(world) {
  const Y = DECK_Y[deck];
  await world.tick();
  buildDeckShell(world, deck);
  const plan = createDeckPlan(world, deck, { wall: 'paintWhite' });

  const CREW = { type: 'crew', wall: 'paintWhite', lamp: 'bulkhead', group: 'Besatzung' };
  const SVC = { type: 'service', wall: 'paintWhite', lamp: 'bulkhead' };
  const WET = { type: 'bath', wall: 'tile', floor: 'tile' };
  const room = (id, name, x0, x1, z0, z1, furnish, doors, o = {}) => plan.room({ id: 'E-' + id, name, x0, x1, z0, z1, furnish, doors, ...o });
  const gang = (id, name, x0, x1, z0, z1, o = {}) => plan.corridor({ id: 'E-' + id, name, x0, x1, z0, z1, ...o });
  const dP = (at, o = {}) => ({ side: 'port', at, ...o }), dS = (at, o = {}) => ({ side: 'stbd', at, ...o });
  const dA = (at, o = {}) => ({ side: 'aft', at, ...o }), dF = (at, o = {}) => ({ side: 'fwd', at, ...o });
  // cabin numbering bow → stern (rows are built with rising x, therefore numbered downwards)
  const ctr = { out: 2, in: 1, tfp: 201, tfs: 202, tap: 301, tas: 302 };
  const row = (key, spec) => {
    const start = ctr[key] + (spec.count - 1) * 2;
    ctr[key] += spec.count * 2;
    return plan.cabinRow({ ...spec, numbering: { deckLetter: 'E', start, step: -2 } });
  };

  await world.tick();
  // ============================================================== watertight bulkheads
  const wtDoors = {
    108: [0], 90: [0], 66: [-FCC], 50: [SRC, PLC], 28: [SRC, PLC], 6: [SRC, PLC], '-16': [SRC, PLC], '-38': [SRC, PLC], '-58': [SRC, PLC],
    '-80': [TPC, PLC], '-100': [TPC, PLC],
  };
  // thinner than the room walls, so the cabin panelling hides the steel everywhere except in the corridors
  await world.tick();
  for (const x of BULKHEADS) bulkhead(world, deck, x, { thickness: 0.06, doors: wtDoors[x].map((z) => ({ z, w: 1.0 })) });

  await world.tick();
  // ============================================================== x 108..124  bow: seamen, stores
  gang('gang-bug', 'Mannschaftsgang im Vorschiff', 108, 118, -0.7, 0.7, { lamp: 'bulkhead' });
  await world.tick();
  room('matrosen-bb', 'Matrosenlogis (Backbord)', 108, 113, -99, -0.7, { preset: 'cabinCrew', berths: 8 }, [dS(110.5)], { ...CREW, teleport: { name: 'Matrosenlogis', group: 'Besatzung' },
    info: { title: 'Matrosenlogis', text: 'Im Vorschiff des E-Decks lagen Unterkünfte der Decksmannschaft. Die Vollmatrosen schliefen in eisernen Doppelkojen und hatten nur einen schmalen Spind für ihre Habe. Von hier waren es nur wenige Schritte über die Treppen hinauf zum Vordeck und zur Back.' } });
  await world.tick();
  room('matrosen-stb', 'Matrosenlogis (Steuerbord)', 108, 113, 0.7, 99, { preset: 'cabinCrew', berths: 8 }, [dP(110.5)], CREW);
  await world.tick();
  room('wc-bug', 'WC der Decksmannschaft', 113, 118, -99, -0.7, 'wc', [dS(115.5)], { ...CREW, floor: 'tile' });
  await world.tick();
  room('wasch-bug', 'Waschraum der Decksmannschaft', 113, 118, 0.7, 99, washroom, [dP(115.5)], { ...CREW, floor: 'tile' });
  await world.tick();
  room('store-bug', 'Bootsmannsstore', 118, 124, -99, 99, 'store', [dA(0, { w: 1.0, style: 'steel' })], { ...SVC, walls: ['aft'], teleport: { name: 'Bootsmannsstore (Bug)', group: 'Besatzung' } });

  await world.tick();
  // ============================================================== x 90..108  firemen, trimmers, stair 'thirdFwd'
  room('treppe-3v', 'Treppenhaus 3. Klasse (vorn)', 95, 104, -CH, CH, 'empty', [dA(0, { w: 1.1, leaf: false }), dF(0, { w: 1.1, leaf: false })], {
    type: 'lobby', stairs: true, wall: 'paintWhite', lamp: 'bulkhead', teleport: { name: 'Treppe 3. Klasse vorn – E-Deck', group: '3. Klasse', x: 95.9, z: -2.2, yaw: 0 } });
  await world.tick();
  gang('gang-heizer-a', 'Gang vor dem Schott (Heizerlogis)', 90, 95, -0.7, 0.7, { lamp: 'bulkhead' });
  await world.tick();
  gang('gang-heizer-f', 'Gang zum Matrosenlogis', 104, 108, -0.7, 0.7, { lamp: 'bulkhead' });
  await world.tick();
  room('trimmer', 'Schlafsaal der Trimmer', 90, 95, -99, -0.7, dormitoryPlus, [dS(92.5)], CREW);
  await world.tick();
  room('schmierer', 'Schlafsaal der Schmierer', 90, 95, 0.7, 99, dormitoryPlus, [dP(92.5)], CREW);
  await world.tick();
  room('heizer-bb', 'Schlafsaal der Heizer (Backbord)', 95, 104, -99, -CH, dormitoryPlus, [dS(96.1)], { ...CREW, teleport: { name: 'Heizerlogis', group: 'Besatzung' },
    info: { title: 'Heizer und Trimmer', text: 'Im Bug wohnten die Heizer, Trimmer und Schmierer – zusammen über 280 Mann, die in Wachen von vier Stunden die 29 Kessel versorgten. Zwei Wendeltreppen führten von ihren Unterkünften hinab in einen Tunnel, durch den sie die Kesselräume erreichten, ohne Passagierbereiche zu betreten. Die Trimmer schaufelten täglich rund 600 Tonnen Kohle aus den Bunkern vor die Feuer.' } });
  await world.tick();
  room('heizer-stb', 'Schlafsaal der Heizer (Steuerbord)', 95, 104, CH, 99, dormitoryPlus, [dP(96.1)], CREW);
  await world.tick();
  room('wc-heizer', 'WC der Heizer', 104, 108, -99, -0.7, 'wc', [dS(106)], { ...CREW, floor: 'tile' });
  await world.tick();
  room('wasch-heizer', 'Waschraum der Heizer', 104, 108, 0.7, 99, washroom, [dP(106)], { ...CREW, floor: 'tile' });

  await world.tick();
  // ============================================================== x 66..90  third class forward (single men)
  const T3 = { type: 'third', door: 'pine' };
  await world.tick();
  gang('quer-3v', 'Quergang 3. Klasse (vorn)', 88.8, 90, -99, 99, {});
  await world.tick();
  gang('gang-3v-bb', 'Gang 3. Klasse vorn (Backbord)', 66, 88.8, -FC1, -FC0, { handrail: true,
    teleport: { name: 'Kabinen 3. Klasse (vorn)', group: '3. Klasse', x: 86, z: -FCC, yaw: Math.PI },
    info: { title: 'Kabinen der 3. Klasse im Vorschiff', x: 80, z: -FCC, radius: 5, text: 'Im Vorschiff brachte die White Star Line die allein reisenden Männer der Dritten Klasse unter, streng getrennt von den Frauen und Familien im Heck. Statt der sonst üblichen Massenschlafsäle gab es Kabinen mit zwei bis sechs Kojen, weiß gestrichenem Kiefernholz und einem Waschbecken. Für die mehr als 700 Passagiere der Dritten Klasse standen allerdings nur zwei Badewannen zur Verfügung.' } });
  await world.tick();
  gang('gang-3v-stb', 'Gang 3. Klasse vorn (Steuerbord)', 66, 88.8, FC0, FC1, { handrail: true });
  await world.tick();
  row('tfp', { x0: 66, x1: 88.8, z0: -99, z1: -FC1, count: 8, corridorSide: 'stbd', ...T3 });
  await world.tick();
  row('tfs', { x0: 66, x1: 88.8, z0: FC1, z1: 99, count: 8, corridorSide: 'port', ...T3 });
  await world.tick();
  row('tfp', { x0: 70, x1: 88.8, z0: -FC0, z1: 0, count: 7, corridorSide: 'port', ...T3 });
  await world.tick();
  row('tfs', { x0: 70, x1: 88.8, z0: 0, z1: FC0, count: 7, corridorSide: 'stbd', ...T3 });
  await world.tick();
  room('wc-3v', 'WC 3. Klasse (vorn)', 66, 70, -FC0, 0, 'wc', [dP(68)], { ...WET, wall: 'paintWhite', cls: 'third' });
  await world.tick();
  room('wasch-3v', 'Waschraum 3. Klasse (vorn)', 66, 70, 0, FC0, washroom, [dS(68)], { ...WET, wall: 'paintWhite', cls: 'third' });

  await world.tick();
  // ============================================================== Scotland Road (port) and its crew quarters
  const SRX0 = -70, SRX1 = 64.8;
  await world.tick();
  gang('scotland-road', 'Scotland Road', SRX0, SRX1, SR0, SR1, { wall: 'paintWhite', handrail: true, lamp: 'bulkhead', group: 'Besatzung',
    teleport: { name: 'Scotland Road', group: 'Besatzung', x: 24, z: SRC, yaw: Math.PI },
    info: { title: 'Scotland Road', x: 20, z: SRC, radius: 7, text: 'Der breite Arbeitsgang an der Backbordseite des E-Decks zog sich über mehr als die halbe Schiffslänge. Die Besatzung taufte ihn nach einer Arbeiterstraße in Liverpool „Scotland Road“. Stewards, Köche und Heizer gelangten hier ungesehen von den Passagieren der oberen Klassen an ihre Arbeitsplätze, und auch die Dritte Klasse nutzte ihn als Verbindung zwischen Bug und Heck. In der Unglücksnacht drang das Wasser vom Bug her durch diesen Gang nach achtern vor.' } });
  await world.tick();
  world.addTeleport({ name: 'Scotland Road (achtern)', deck, x: -52, z: SRC, yaw: 0, group: 'Besatzung' });
  await world.tick();
  gang('quer-sr', 'Quergang am vorderen Ende der Scotland Road', SRX1, 66, SR0, CH, { wall: 'paintWhite', lamp: 'bulkhead' });

  const GLORY = 'Die Stewards schliefen in großen Gemeinschaftsräumen mit eisernen Doppelkojen, die im Seemannsjargon „Glory Holes“ hießen. Bis zu 40 Mann teilten sich einen Raum ohne Tageslicht außer ein paar Bullaugen. Von den rund 420 Stewards und Küchenleuten der Titanic überlebten nur etwa 60.';
  const crewRooms = [
    [59, 66, 'stewards-3', 'Schlafsaal der Stewards 3. Klasse', dormitoryPlus],
    [54, 59, 'wasch-stewards-v', 'Waschraum und WC der Stewards (vorn)', 'wc', { floor: 'tile' }],
    [50, 54, 'obersteward-3', 'Kabine der Obersteward-Assistenten', { preset: 'cabinCrew', berths: 4 }],
    [41, 50, 'glory-1', 'Schlafsaal der Speisesaalstewards 1. Klasse', dormitoryPlus, { teleport: { name: 'Stewardunterkünfte', group: 'Besatzung' }, info: { title: 'Stewardunterkünfte – das „Glory Hole“', text: GLORY } }],
    [34, 41, 'glory-2', 'Schlafsaal der Speisesaalstewards 1. Klasse (II)', dormitoryPlus],
    [28, 34, 'bedroom-stewards', 'Schlafsaal der Kabinenstewards', dormitoryPlus],
    [19, 28, 'stewards-2', 'Schlafsaal der Speisesaalstewards 2. Klasse', dormitoryPlus],
    [14, 19, 'wasch-stewards-m', 'Waschraum der Stewards', washroom, { floor: 'tile' }],
    [6, 14, 'kellner', 'Schlafsaal der Kellner des À-la-carte-Restaurants', dormitoryPlus, { info: { title: 'Kellner des À-la-carte-Restaurants', text: 'Das Personal des À-la-carte-Restaurants auf dem B-Deck war nicht bei der White Star Line angestellt, sondern beim Londoner Gastronomen Luigi Gatti. Die überwiegend italienischen und französischen Kellner und Köche wohnten hier auf dem E-Deck. Von den rund 66 Angestellten des Restaurants überlebten nur drei.' } }],
    [-2, 6, 'koeche', 'Schlafsaal der Köche', dormitoryPlus, { teleport: { name: 'Schlafsaal der Köche', group: 'Besatzung' } }],
    [-9, -2, 'baecker', 'Schlafsaal der Bäcker', dormitoryPlus],
    [-16, -9, 'metzger', 'Schlafsaal der Metzger', dormitoryPlus],
    [-22, -16, 'kuechenjungen', 'Schlafsaal der Küchenjungen', dormitoryPlus],
    [-28, -22, 'tellerwaescher', 'Schlafsaal der Tellerwäscher', dormitoryPlus],
    [-33, -28, 'wc-crew', 'WC und Waschraum der Küchenmannschaft', 'wc', { floor: 'tile' }],
    [-38, -33, 'schmierer-achtern', 'Kabine der Maschinenschmierer', { preset: 'cabinCrew', berths: 8 }],
    [-48, -38, 'ing-messe', 'Ingenieursmesse', engMess, { wall: 'pine', teleport: { name: 'Ingenieursmesse', group: 'Besatzung' },
      info: { title: 'Ingenieursmesse', text: 'Die 25 Ingenieure der Titanic unter Chefingenieur Joseph Bell aßen in ihrer eigenen Messe nahe dem Maschinenschacht. Sie und die Elektriker hielten bis zuletzt Pumpen und Dynamos in Gang, damit das Schiff Licht und Funkstrom behielt. Keiner der Ingenieure überlebte den Untergang.' } }],
    [-53, -48, 'ing-pantry', 'Pantry der Ingenieursmesse', 'pantry', { floor: 'tile' }],
    [-58, -53, 'musiker', 'Musikerkabine', musicians, { teleport: { name: 'Musikerkabine', group: 'Besatzung' },
      info: { title: 'Musikerkabine', text: 'Die acht Musiker der Titanic reisten als Passagiere der Zweiten Klasse, wohnten aber in einer eigenen Kabine an der Scotland Road mit einem Nebenraum für ihre Instrumente. Unter Kapellmeister Wallace Hartley spielten sie während der Evakuierung weiter, um die Passagiere zu beruhigen. Keiner von ihnen überlebte.' } }],
    [-64, -58, 'glory-3', 'Schlafsaal der Stewards 2. Klasse', dormitoryPlus],
    [-70, -64, 'glory-4', 'Schlafsaal der Stewards 3. Klasse (achtern)', dormitoryPlus],
  ];
  await world.tick();
  for (const [x0, x1, id, name, furnish, o] of crewRooms) room(id, name, x0, x1, -99, SR0, furnish, [dS((x0 + x1) / 2, { style: 'steel' })], { ...CREW, ...o });

  await world.tick();
  // ============================================================== Park Lane (starboard, first class) + second-class corridor
  const F1 = { type: 'first' }, S2 = { type: 'second' };
  await world.tick();
  gang('park-lane', 'Park Lane (Korridor 1. Klasse)', -16, 62, PL0, PL1, { wall: 'whitePanel', handrail: true, floor: 'linoCream', group: '1. Klasse',
    teleport: { name: 'Park Lane (Korridor 1. Klasse)', group: '1. Klasse', x: 24, z: PLC, yaw: Math.PI },
    info: { title: 'Park Lane', x: 20, z: PLC, radius: 6, text: 'Als vornehmes Gegenstück zur Scotland Road der Besatzung erhielt der Kabinengang der Ersten Klasse an der Steuerbordseite den Spitznamen „Park Lane“ – nach der eleganten Londoner Straße. An ihm lagen die einfacheren Kabinen der Ersten Klasse, weiß getäfelt und ohne den Prunk der Suiten auf dem B- und C-Deck. Eine Überfahrt kostete hier ab etwa 30 Pfund.' } });
  await world.tick();
  gang('gang-2', 'Kabinengang 2. Klasse (Steuerbord)', -100, -16, PL0, PL1, { wall: 'whitePanel', handrail: true, floor: 'linoBlue', group: '2. Klasse',
    teleport: { name: 'Kabinengang 2. Klasse', group: '2. Klasse', x: -28, z: PLC, yaw: Math.PI } });

  await world.tick();
  // ---------------------------------------------------------------- x 50..66  (funnel casing 1: 52.5..59.5)
  room('pantry-1', 'Stewardpantry 1. Klasse', 62, 66, CH, 99, 'pantry', [dA(PLC)], { ...SVC, floor: 'tile' });
  await world.tick();
  row('out', { x0: 50, x1: 62, z0: PL1, z1: 99, count: 4, corridorSide: 'port', ...F1 });
  await world.tick();
  room('wc-1a', 'WC 1. Klasse (Herren)', 59.5, 62, CH, PL0, 'wc', [dS(60.75)], { ...WET, cls: 'first' });
  await world.tick();
  row('in', { x0: 52.5, x1: 59.5, z0: CH, z1: PL0, count: 2, corridorSide: 'stbd', ...F1 });
  await world.tick();
  room('bad-1a', 'Bad 1. Klasse', 50, 52.5, CH, PL0, 'bathroom', [dS(51.25)], { ...WET, cls: 'first' });
  await world.tick();
  room('gepaeck-1', 'Gepäckraum 1. Klasse', 59.5, SRX1, SR1, CH, 'hold', [dP(62.2, { style: 'steel' })], SVC);
  await world.tick();
  room('lampen', 'Lampenraum', 56, 59.5, SR1, -CH, 'store', [dP(57.75, { style: 'steel' })], SVC);
  await world.tick();
  room('putz', 'Putzmittelkammer', 52.5, 56, SR1, -CH, { preset: 'store', shelves: 3 }, [dP(54.25, { style: 'steel' })], SVC);
  await world.tick();
  room('waesche-v', 'Wäschekammer (vorn)', 50, 52.5, SR1, CH, 'linen', [dP(51.25)], SVC);

  await world.tick();
  // ---------------------------------------------------------------- x 28..50  grand staircase, lifts (casing 2: 30.5..37.5)
  const LX0 = 37.5, LX1 = 47.5;
  await world.tick();
  room('grosse-treppe', 'Halle der Großen Treppe (E-Deck)', LX0, LX1, SR1, PL0, 'empty',
    [dS(39.6, { w: 2.0, leaf: false }), dS(44.4, { w: 2.0, leaf: false }), dP(38.7, { style: 'oak' })], {
      type: 'lobby', cls: 'first', stairs: true, wall: 'oakPanel', floor: 'linoCream', lamp: 'bowl',
      teleport: { name: 'Große Treppe – E-Deck', group: '1. Klasse', x: 45.2, z: 0, yaw: Math.PI },
      info: { title: 'Große Treppe auf dem E-Deck', x: 44.2, z: 3.6, radius: 5, text: 'Hier, sechs Decks unter der Glaskuppel, beginnt die vordere Große Treppe der Ersten Klasse. Ihr breiter Mittellauf steigt zu einem Zwischenpodest, von dem zwei Seitenläufe zum nächsten Deck zurückführen – dieselbe Anordnung wiederholt sich bis zum Bootsdeck. Unter dem untersten Podest liegen getäfelte Wandschränke; von der Halle führte die „Park Lane“ zu den Kabinen.' } });
  await world.tick();
  world.addInfo({ title: 'Aufzüge der 1. Klasse', x: 44.9, y: Y + 1.5, z: 3.4, radius: 3, text: 'Unmittelbar vor der Großen Treppe lagen drei elektrische Personenaufzüge, die das E-Deck mit dem A-Deck verbanden – 1912 ein außergewöhnlicher Luxus auf See. Jede mahagonigetäfelte Kabine hatte ein Sofa und wurde von einem Liftboy bedient. Die Zweite Klasse besaß einen eigenen, vierten Aufzug.' });
  await world.tick();
  room('stiefel-1', 'Stiefelputzraum', LX1, 50, SR1, 0, { preset: 'store', shelves: 2 }, [dP(48.75)], SVC);
  await world.tick();
  room('waesche-1', 'Wäschekammer 1. Klasse', LX1, 50, 0, PL0, 'linen', [dS(48.75)], SVC);
  await world.tick();
  row('out', { x0: 28, x1: 50, z0: PL1, z1: 99, count: 7, corridorSide: 'port', ...F1 });
  await world.tick();
  row('in', { x0: 30.5, x1: 37.5, z0: CH, z1: PL0, count: 2, corridorSide: 'stbd', ...F1 });
  await world.tick();
  room('bad-1b', 'Bad 1. Klasse', 28, 30.5, CH, PL0, 'bathroom', [dS(29.25)], { ...WET, cls: 'first' });
  await world.tick();
  room('store-stewards', 'Stewardstore', 34, 37.5, SR1, -CH, 'store', [dP(35.75, { style: 'steel' })], SVC);
  await world.tick();
  room('besen', 'Besen- und Eimerkammer', 30.5, 34, SR1, -CH, { preset: 'store', shelves: 2 }, [dP(32.25, { style: 'steel' })], SVC);
  await world.tick();
  room('pantry-crew', 'Teeküche der Stewards', 28, 30.5, SR1, CH, 'pantry', [dP(29.25)], { ...SVC, floor: 'tile' });

  await world.tick();
  // ---------------------------------------------------------------- x 6..28 and x -16..6  (casings 3 and 4)
  // each block: funnel casing at its aft end, forward of it a cross alley from Park Lane with baths in the centre strip
  const block = (k, xa, cas0, cas1, xb, names) => {
    const al0 = (cas1 + xb) / 2 - 0.6, al1 = al0 + 1.2;
    // starboard: outside cabins, inside cabins, bath abaft the casing
    row('out', { x0: xa, x1: xb, z0: PL1, z1: 99, count: 7, corridorSide: 'port', ...F1 });
    row('in', { x0: al1, x1: xb, z0: CH, z1: PL0, count: 2, corridorSide: 'stbd', ...F1 });
    row('in', { x0: cas1, x1: al0, z0: CH, z1: PL0, count: 2, corridorSide: 'stbd', ...F1 });
    row('in', { x0: cas0, x1: cas1, z0: CH, z1: PL0, count: 2, corridorSide: 'stbd', ...F1 });
    room(`bad-1${k}`, 'Bad 1. Klasse', xa, cas0, CH, PL0, 'bathroom', [dS((xa + cas0) / 2)], { ...WET, cls: 'first' });
    gang(`quer-1${k}`, 'Quergang zu den Bädern 1. Klasse', al0, al1, ST, PL0, { wall: 'whitePanel', floor: 'linoCream' });
    const mid = (ST + CH) / 2;
    room(`bad-1${k}-a`, 'Bad 1. Klasse', cas1, al0, ST, mid, { preset: 'bathroom', shower: true }, [dF((ST + mid) / 2)], { ...WET, cls: 'first' });
    room(`wc-1${k}-h`, 'WC 1. Klasse (Herren)', cas1, al0, mid, CH, 'wc', [dF((mid + CH) / 2)], { ...WET, cls: 'first' });
    room(`bad-1${k}-f`, 'Bad 1. Klasse', al1, xb, ST, mid, { preset: 'bathroom', shower: true }, [dA((ST + mid) / 2)], { ...WET, cls: 'first' });
    room(`wc-1${k}-d`, 'WC 1. Klasse (Damen)', al1, xb, mid, CH, 'wc', [dA((mid + CH) / 2)], { ...WET, cls: 'first' });
    // port, off Scotland Road: service rooms
    const w3 = (xb - cas1) / 3, w2 = (cas1 - cas0) / 2;
    names.forEach(([id, name, furnish, o], i) => {
      let r;
      if (i < 3) r = [cas1 + (2 - i) * w3, cas1 + (3 - i) * w3, SR1, ST];
      else if (i < 5) r = [cas0 + (4 - i) * w2, cas0 + (5 - i) * w2, SR1, -CH];
      else r = [xa, cas0, SR1, CH];
      room(id, name, r[0], r[1], r[2], r[3], furnish, [dP((r[0] + r[1]) / 2, { style: 'steel' })], { ...SVC, ...o });
    });
  };
  await world.tick();
  block('c', 6, 8.5, 15.5, 28, [
    ['kellnermesse', 'Messe der Restaurantkellner', 'mess'], ['stiefel-m', 'Stiefelputzraum der Stewards', { preset: 'store', shelves: 3 }], ['proviant-1', 'Trockenproviant', 'store'],
    ['kartoffel', 'Kartoffellager', 'store'], ['geschirr', 'Geschirrkammer', 'pantry'], ['waesche-m', 'Wäschekammer (mittschiffs)', 'linen'],
  ]);
  await world.tick();
  block('d', -16, -13.5, -6.5, 6, [
    ['kochmesse', 'Messe der Köche und Bäcker', 'mess'], ['kochstore', 'Küchenstore', 'store'], ['metzgerstore', 'Vorratskammer der Metzger', { preset: 'store', shelves: 4 }],
    ['silber', 'Silberkammer', 'pantry'], ['glaeser', 'Gläser- und Porzellankammer', 'pantry'], ['baeckerstore', 'Mehlkammer der Bäcker', 'store'],
  ]);
  await world.tick();
  world.addInfo({ title: 'Kabinen der 1. Klasse auf dem E-Deck', x: -3, y: Y + 1.5, z: PLC, radius: 5, text: 'Die Kabinen an der Park Lane gehörten zu den preiswertesten der Ersten Klasse. Die Außenkabinen besaßen Bullaugen knapp über der Wasserlinie, die Innenkabinen wurden nur elektrisch beleuchtet. Bäder und Toiletten lagen in Quergängen und wurden über den Kabinensteward gebucht.' });

  await world.tick();
  // ---------------------------------------------------------------- x -38..-16  engine casing -36..-24
  row('out', { x0: -38, x1: -16, z0: PL1, z1: 99, count: 8, corridorSide: 'port', ...S2 });
  await world.tick();
  row('in', { x0: -24, x1: -16, z0: CH, z1: PL0, count: 3, corridorSide: 'stbd', ...S2 });
  await world.tick();
  row('in', { x0: -36, x1: -24, z0: CH, z1: PL0, count: 4, corridorSide: 'stbd', ...S2 });
  await world.tick();
  room('wc-2a', 'WC 2. Klasse', -38, -36, CH, PL0, 'wc', [dS(-37)], { ...WET, cls: 'second' });
  await world.tick();
  room('el-werkstatt', 'Werkstatt der Elektriker', -24, -21, SR1, CH, (ctx) => { /* benches along the walls */
    ctx.fit(workbench({ w: 1.8 }), ['left:hi', 'right:hi']); ctx.fit(workbench({ w: 1.8 }), ['right:hi', 'left:mid']);
    ctx.fit(shelves({ kind: 'stores', w: 1.5 }), ['far:mid']); ctx.fit(locker({ n: 2 }), ['left:lo', 'right:lo']);
  }, [dP(-22.5, { style: 'steel' })], SVC);
  await world.tick();
  room('el-lager', 'Lager der Elektriker', -21, -16, ST, CH, 'store', [dA(0.5, { style: 'steel' })], SVC);
  await world.tick();
  plan.cabinRow({ x0: -21, x1: -16, z0: SR1, z1: ST, count: 2, corridorSide: 'port', type: 'crew', name: 'Kabine der Elektriker', idPrefix: 'E-elektriker-', furnish: { preset: 'cabinCrew', berths: 2, officer: true }, door: 'pine', lamp: 'bulkhead' });
  await world.tick();
  plan.cabinRow({ x0: -36, x1: -24, z0: SR1, z1: -CH, count: 4, corridorSide: 'port', type: 'crew', name: 'Ingenieurskabine', idPrefix: 'E-ingenieur-', furnish: { preset: 'cabinCrew', berths: 1, single: true, officer: true }, door: 'pine', lamp: 'bulkhead' });
  await world.tick();
  room('masch-store', 'Maschinenstore', -38, -36, SR1, CH, { preset: 'store', shelves: 4 }, [dP(-37, { style: 'steel' })], SVC);
  await world.tick();
  world.addInfo({ title: 'Ingenieure und Elektriker', x: -30, y: Y + 1.5, z: SRC, radius: 5, text: 'Rund um den Schacht der Hauptmaschinen lagen die Kabinen der Ingenieure und Elektriker, damit sie bei einem Alarm in Sekunden an ihren Posten waren. Der Schacht selbst reicht als geschlossener Kasten durch alle Decks bis zum Oberlicht auf dem Bootsdeck. Ein Denkmal in Southampton erinnert an die Maschinenbesatzung, die geschlossen auf ihrem Posten blieb.' });

  await world.tick();
  // ---------------------------------------------------------------- x -58..-38  stair 'second', barber, purser
  const O2 = { type: 'lobby', cls: 'second', stairs: true, wall: 'oakDado', floor: 'linoBlue', lamp: 'bowl' };
  await world.tick();
  room('treppe-2', 'Treppenhaus 2. Klasse (E-Deck)', -47.5, -38, -3.4, PL0, 'empty', [dS(-46.3, { w: 1.6, leaf: false }), dS(-39.3, { w: 1.6, leaf: false })], { ...O2,
    teleport: { name: 'Treppenhaus 2. Klasse – E-Deck', group: '2. Klasse', x: -39.2, z: 4.5, yaw: Math.PI } });
  await world.tick();
  room('friseur-2', 'Friseur 2. Klasse', -52.5, -47.5, 2.4, PL0, 'barber', [dS(-50)], { type: 'public', cls: 'second', wall: 'oakDado', floor: 'linoBlue',
    teleport: { name: 'Friseur 2. Klasse', group: '2. Klasse' },
    info: { title: 'Friseur 2. Klasse', text: 'Auch die Zweite Klasse hatte ihren eigenen Friseursalon mit drehbaren Lederstühlen und Marmorwaschbecken. Eine Rasur kostete einen Shilling; nebenbei verkaufte der Barbier Tabak, Postkarten und Souvenirs wie Wimpel und Puppen. Friseur August Weikman, der in der Ersten Klasse arbeitete, überlebte den Untergang.' } });
  await world.tick();
  room('zahlmeister-2', 'Zahlmeisterbüro 2. Klasse', -52.5, -47.5, -3.4, 2.4, 'office', [dF(-2.65, { style: 'oak' })], { type: 'public', cls: 'second', wall: 'oakDado', floor: 'linoBlue',
    teleport: { name: 'Zahlmeisterbüro 2. Klasse', group: '2. Klasse' } });
  await world.tick();
  row('out', { x0: -58, x1: -38, z0: PL1, z1: 99, count: 7, corridorSide: 'port', ...S2 });
  await world.tick();
  row('in', { x0: -58, x1: -52.5, z0: CH, z1: PL0, count: 2, corridorSide: 'stbd', ...S2 });
  await world.tick();
  room('gepaeck-2', 'Gepäckraum 2. Klasse', -58, -52.5, SR1, CH, 'hold', [dP(-55.25, { style: 'steel' })], SVC);
  await world.tick();
  room('waesche-2', 'Wäschekammer 2. Klasse', -52.5, -47.5, SR1, -3.4, 'linen', [dP(-50)], SVC);
  await world.tick();
  room('pantry-2', 'Stewardpantry 2. Klasse', -47.5, -44.3, SR1, -3.4, 'pantry', [dP(-45.9)], { ...SVC, floor: 'tile' });
  await world.tick();
  room('stiefel-2', 'Stiefelputzraum 2. Klasse', -44.3, -41.1, SR1, -3.4, { preset: 'store', shelves: 2 }, [dP(-42.7)], SVC);
  await world.tick();
  room('post', 'Kabine der Postbeamten', -41.1, -38, SR1, -3.4, { preset: 'cabinCrew', berths: 4 }, [dP(-39.55, { style: 'pine' })], CREW);

  await world.tick();
  // ---------------------------------------------------------------- x -80..-58  stair 'secondAft'; Scotland Road ends at -70
  room('treppe-2a', 'Hinteres Treppenhaus 2. Klasse (E-Deck)', -68, -58, -3.3, PL0, 'empty', [dS(-66.8, { w: 1.6, leaf: false }), dS(-59.3, { w: 1.6, leaf: false })], { ...O2,
    teleport: { name: 'Hinteres Treppenhaus 2. Klasse – E-Deck', group: '2. Klasse', x: -59.2, z: 4.5, yaw: Math.PI } });
  await world.tick();
  gang('quer-2', 'Quergang 2. Klasse', -74.6, -73.4, -3.3, PL0, { wall: 'whitePanel', floor: 'linoBlue' });
  await world.tick();
  row('in', { x0: -73.4, x1: -68, z0: -3.3, z1: PL0, count: 3, corridorSide: 'aft', ...S2 });
  await world.tick();
  row('in', { x0: -80, x1: -74.6, z0: -3.3, z1: PL0, count: 3, corridorSide: 'fwd', ...S2 });
  await world.tick();
  row('out', { x0: -80, x1: -58, z0: PL1, z1: 99, count: 8, corridorSide: 'port', ...S2 });
  await world.tick();
  room('stewardessen', 'Kabine der Stewardessen', -61.3, -58, SR1, -3.3, { preset: 'cabinCrew', berths: 4 }, [dP(-59.65, { style: 'pine' })], CREW);
  await world.tick();
  room('waesche-a', 'Wäschekammer (achtern)', -64.6, -61.3, SR1, -3.3, 'linen', [dP(-62.95)], SVC);
  await world.tick();
  room('wc-stewards-a', 'WC der Stewards (achtern)', -68, -64.6, SR1, -3.3, 'wc', [dP(-66.3)], { ...CREW, floor: 'tile' });
  const TA = { type: 'third', door: 'pine' };
  await world.tick();
  gang('gang-3a-bb', 'Gang 3. Klasse achtern (Backbord)', -100, SRX0, TP0, TP1, { handrail: true,
    teleport: { name: 'Kabinen 3. Klasse (achtern, Backbord)', group: '3. Klasse', x: -85, z: TPC, yaw: Math.PI } });
  await world.tick();
  row('tap', { x0: -80, x1: SRX0, z0: -99, z1: TP0, count: 4, corridorSide: 'stbd', ...TA });
  await world.tick();
  row('tap', { x0: -80, x1: -68, z0: SR1, z1: -3.3, count: 5, corridorSide: 'port', ...TA });

  await world.tick();
  // ---------------------------------------------------------------- x -100..-80  second class starboard, third class port
  gang('quer-k', 'Quergang zu den Bädern', -90.6, -89.4, SR1, PL0, {});
  await world.tick();
  row('out', { x0: -100, x1: -80, z0: PL1, z1: 99, count: 7, corridorSide: 'port', ...S2 });
  await world.tick();
  row('in', { x0: -89.4, x1: -80, z0: CH, z1: PL0, count: 3, corridorSide: 'stbd', ...S2 });
  await world.tick();
  row('in', { x0: -100, x1: -90.6, z0: CH, z1: PL0, count: 3, corridorSide: 'stbd', ...S2 });
  await world.tick();
  row('tap', { x0: -100, x1: -80, z0: -99, z1: TP0, count: 8, corridorSide: 'stbd', ...TA });
  await world.tick();
  row('tap', { x0: -89.4, x1: -80, z0: SR1, z1: -CH, count: 4, corridorSide: 'port', ...TA });
  await world.tick();
  row('tap', { x0: -100, x1: -90.6, z0: SR1, z1: -CH, count: 4, corridorSide: 'port', ...TA });
  await world.tick();
  room('wc-3k', 'WC 3. Klasse', -89.4, -80, -CH, 0, 'wc', [dA(-1.5)], { ...WET, wall: 'paintWhite', cls: 'third' });
  await world.tick();
  room('wc-2k', 'WC 2. Klasse (achtern)', -89.4, -80, 0, CH, 'wc', [dA(1.5)], { ...WET, cls: 'second' });
  await world.tick();
  room('wasch-3k', 'Waschraum 3. Klasse', -100, -90.6, -CH, 0, washroom, [dF(-1.5)], { ...WET, wall: 'paintWhite', cls: 'third' });
  await world.tick();
  room('bad-2k', 'Bäder 2. Klasse', -100, -90.6, 0, CH, { preset: 'bathroom', shower: true }, [dF(1.5)], { ...WET, cls: 'second' });

  await world.tick();
  // ============================================================== x -124..-100  third class aft, stair 'thirdAft', stores
  gang('quer-3a', 'Quergang 3. Klasse (achtern)', -101.2, -100, -99, 99, {});
  await world.tick();
  gang('gang-3h-bb', 'Gang 3. Klasse im Heck (Backbord)', -120, -101.2, -AC1, -AC0, { handrail: true,
    info: { title: 'Kabinen der 3. Klasse im Heck (E-Deck)', x: -104, z: -ACC, radius: 5, text: 'Im Heck wohnten die allein reisenden Frauen, Ehepaare und Familien der Dritten Klasse – möglichst weit entfernt von den Männerquartieren im Bug. Viele von ihnen waren Auswanderer aus Irland, Skandinavien und dem Nahen Osten. Der Weg von hier zu den Rettungsbooten führte über mehrere Treppen und durch Bereiche, die ihnen sonst verschlossen waren.' } });
  await world.tick();
  gang('gang-3h-stb', 'Gang 3. Klasse im Heck (Steuerbord)', -120, -101.2, AC0, AC1, { handrail: true,
    teleport: { name: 'Kabinen 3. Klasse (Heck)', group: '3. Klasse', x: -104, z: ACC, yaw: Math.PI } });
  await world.tick();
  room('treppe-3a', 'Treppenhaus 3. Klasse (achtern)', -116, -107, -AC0, AC0, 'empty',
    [dP(-115.1, { w: 1.2, leaf: false }), dP(-107.9, { w: 1.2, leaf: false }), dS(-115.1, { w: 1.2, leaf: false }), dS(-107.9, { w: 1.2, leaf: false })], {
      type: 'lobby', stairs: true, wall: 'paintWhite', lamp: 'bulkhead', teleport: { name: 'Treppe 3. Klasse achtern – E-Deck', group: '3. Klasse', x: -115.3, z: -3.2, yaw: 0 } });
  await world.tick();
  row('tap', { x0: -120, x1: -101.2, z0: -99, z1: -AC1, count: 7, corridorSide: 'stbd', ...TA });
  await world.tick();
  row('tas', { x0: -120, x1: -101.2, z0: AC1, z1: 99, count: 7, corridorSide: 'port', ...TA });
  await world.tick();
  row('tap', { x0: -107, x1: -101.2, z0: -AC0, z1: 0, count: 2, corridorSide: 'port', ...TA });
  await world.tick();
  row('tas', { x0: -107, x1: -101.2, z0: 0, z1: AC0, count: 2, corridorSide: 'stbd', ...TA });
  await world.tick();
  room('wc-3a', 'WC 3. Klasse (Heck)', -120, -116, -AC0, 0, 'wc', [dP(-118)], { ...WET, wall: 'paintWhite', cls: 'third' });
  await world.tick();
  room('wasch-3a', 'Waschraum 3. Klasse (Heck)', -120, -116, 0, AC0, washroom, [dS(-118)], { ...WET, wall: 'paintWhite', cls: 'third' });
  await world.tick();
  room('store-heck-bb', 'Proviantstore (Heck)', -124, -120, -99, 0, 'store', [dF(-ACC, { style: 'steel' })], { ...SVC, walls: ['fwd', 'stbd'] });
  await world.tick();
  room('store-heck-stb', 'Tauwerk- und Persenningstore', -124, -120, 0, 99, 'store', [dF(ACC, { style: 'steel' })], { ...SVC, walls: ['fwd'] });

  await world.tick();
  // ============================================================== details
  world.addInfo({ title: 'Wasserdichte Schotten und Türen', x: 27, y: Y + 1.5, z: SRC, radius: 4.5, text: 'Fünfzehn Querschotten teilten den Rumpf in sechzehn wasserdichte Abteilungen; die meisten reichten nur bis zum E-Deck, also kaum drei Meter über die Wasserlinie. Während die zwölf Türen ganz unten in den Maschinenräumen von der Brücke aus elektrisch ausgelöst wurden, mussten die Schiebetüren hier oben von Hand mit einer Kurbel geschlossen werden. Als nach der Kollision sechs Abteilungen vollliefen, sank der Bug so tief, dass das Wasser auf dem E-Deck über die Schotten hinweg nach achtern strömte.' });
  await world.tick();
  scotlandRoadDetails(world, plan, { x0: SRX0, x1: SRX1, z0: SR0, z1: SR1, stations: BULKHEADS, benches: [59.2, 40, 20.5, -8, -46.5, -64] });
  await world.tick();
  grandLobbyDetails(world, plan, { x0: LX0, x1: LX1, z0: SR1, z1: PL0, liftX0: 45.5, liftX1: 47.5 });

  const res = await plan.finishAsync();
  if (res.problems.length) console.warn(`[E] ${res.problems.length} kit problems`);
  return {};
}
