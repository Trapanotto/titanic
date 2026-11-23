// D deck ("Saloon Deck") – complete layout, bow → stern.
// Bow: crew stores, firemen's quarters around the forward 3rd-class stair, 3rd-class cabins and open berths, the
// 1st-class staterooms D1–D14, the Reception Room with the forward Grand Staircase and the gangway entrances, the
// 1st-class Dining Saloon, the main galley with pantries, bakery, butcher and scullery, the 2nd-class Dining Saloon,
// 2nd-class staterooms with the ship's hospital (starboard), 3rd-class cabins aft and stores at the stern.
import { DECK_Y } from '../core/constants.js';
import { buildDeckShell, bulkhead, createDeckPlan, bench, shelves, workbench, locker, trunk } from '../interior/kit.js';
import { DINING1, DINING2, dining1Walls, dining2Walls, furnishDining1, furnishDining2 } from './d-saloon.js';
import {
  RECEPTION, furnishReception, furnishVestibule, furnishGalley, furnishBakery, furnishPastry, furnishButcher, furnishVeg,
  furnishScullery, furnishSurgery, furnishDispensary, furnishWard, washroom,
} from './d-hero.js';

const deck = 'D';
// longitudinal lines (wall centre lines, z)
const F1a = 6.5, F1b = 8.3;    // 1st-class corridors x 47.5..64
const T3a = 4.6, T3b = 5.8;    // 3rd-class corridors (forward x 64..84.8, aft x −116..−96)
const S2a = 6.8, S2b = 8.0;    // 2nd-class corridors x −96..−59
const GZ = 12.4;               // inner edge of the stewards' passages along the galley
const CH = 3;                  // casings |z| <= 3
const CC = 0.8;                // half width of the crew centre corridors

function lamplight(ctx) { // lamp room: shelves with lamps and oil cans, a workbench
  ctx.fit(shelves({ kind: 'bottles', w: 1.5, mat: 'steel' }), ['far:lo', 'far:hi']); ctx.fit(shelves({ kind: 'bottles', w: 1.5, mat: 'steel' }), ['far:hi', 'left:hi']);
  ctx.fit(workbench({ w: 1.6 }), ['left:hi', 'right:hi']); ctx.fit(locker({ n: 2, mat: 'steel' }), ['right:lo', 'left:lo']);
}
function stewardRoom(ctx) {
  ctx.fit(shelves({ kind: 'linen', w: 1.5 }), ['far:lo', 'far:hi']); ctx.fit(locker({ n: 3 }), ['left:hi', 'right:hi']);
  ctx.fit(bench({ w: 1.4 }), ['right:mid', 'left:mid'], { collide: false });
}
function luggage(ctx) {
  ctx.fit(shelves({ kind: 'empty', w: 1.5 }), ['far:lo', 'far:hi']);
  for (let i = 0; i < 5; i++) ctx.fit(trunk({ big: i % 2 === 0 }), ['left:hi', 'right:hi', 'left:mid', 'right:mid', 'far:mid'], { collide: false });
}

export async function build(world) {
  const Y = DECK_Y[deck];
  await world.tick();
  buildDeckShell(world, deck, {
    floors: [
      { x0: RECEPTION.x0, x1: RECEPTION.x1, mat: 'carpetRed' },       // Axminster carpet
      { x0: -24, x1: -16, z0: -GZ, z1: GZ, mat: 'tileWhite' },          // galley
    ],
  });
  const plan = createDeckPlan(world, deck, { wall: 'paintWhite' });

  const CREW = { type: 'crew', wall: 'paintWhite', lamp: 'bulkhead', floor: 'linoRed', group: 'Besatzung' };
  const SVC = { type: 'service', wall: 'paintWhite', lamp: 'bulkhead' };
  const KIT = { type: 'service', wall: 'tile', floor: 'tileWhite', lamp: 'dome', group: 'Besatzung' };
  const WET = { type: 'bath', wall: 'tile', floor: 'tileWhite' };
  const T3 = { type: 'third', door: 'pine' };
  const room = (id, name, x0, x1, z0, z1, furnish, doors, o = {}) => plan.room({ id: 'D-' + id, name, x0, x1, z0, z1, furnish, doors, ...o });
  const gang = (id, name, x0, x1, z0, z1, o = {}) => plan.corridor({ id: 'D-' + id, name, x0, x1, z0, z1, ...o });
  const dP = (at, o = {}) => ({ side: 'port', at, ...o }), dS = (at, o = {}) => ({ side: 'stbd', at, ...o });
  const dA = (at, o = {}) => ({ side: 'aft', at, ...o }), dF = (at, o = {}) => ({ side: 'fwd', at, ...o });
  // cabin numbering bow → stern (rows are built with rising x, therefore numbered downwards); port odd, starboard even
  const ctr = { p1: 1, s1: 2, p2: 51, s2: 52 };
  const row = (key, spec) => {
    const start = ctr[key] + (spec.count - 1) * 2;
    ctr[key] += spec.count * 2;
    return plan.cabinRow({ ...spec, numbering: { deckLetter: 'D', start, step: -2 } });
  };

  await world.tick();
  // ============================================================== x 104..126  bow: stores, lamp room, crew WCs
  gang('gang-bug', 'Mannschaftsgang im Vorschiff', 104, 118, -CC, CC, { lamp: 'bulkhead' });
  await world.tick();
  room('wc-heizer', 'WC der Heizer', 104, 110, -99, -CC, 'wc', [dS(107)], { ...CREW, floor: 'tileWhite' });
  await world.tick();
  room('wasch-heizer', 'Waschraum der Heizer', 104, 110, CC, 99, washroom, [dP(107)], { ...CREW, floor: 'tileWhite' });
  await world.tick();
  room('lampen', 'Lampenraum', 110, 118, -99, -CC, lamplight, [dS(111.5, { style: 'steel' })], { ...SVC,
    teleport: { name: 'Lampenraum (Bug)', group: 'Besatzung' },
    info: { title: 'Der Lampenraum', text: 'Trotz elektrischer Beleuchtung führte die Titanic Petroleumlampen für Positionslaternen, Ankerlichter und als Notbeleuchtung mit. Im Lampenraum im Vorschiff wurden sie von einem Lampentrimmer gereinigt, gefüllt und instand gehalten. Wegen der Brandgefahr lag der Raum weit entfernt von den Passagierbereichen.' } });
  await world.tick();
  room('farben', 'Farben- und Öllager', 110, 118, CC, 99, { preset: 'store', shelves: 3 }, [dP(111.5, { style: 'steel' })], SVC);
  await world.tick();
  room('store-bug', 'Bootsmannsstore (Bug)', 118, 126, -99, 99, 'store', [dA(0, { w: 1.0, style: 'steel' })], SVC);

  await world.tick();
  // ============================================================== x 86..104  firemen's quarters, stair 'thirdFwd'
  room('treppe-3v', 'Treppenhaus 3. Klasse (vorn)', 95, 104, -CH, CH, 'empty', [dA(0, { w: 1.0, leaf: false }), dF(0, { w: 1.0, leaf: false })], {
    type: 'lobby', stairs: true, wall: 'paintWhite', lamp: 'bulkhead', teleport: { name: 'Treppe 3. Klasse vorn – D-Deck', group: '3. Klasse', x: 103.3, z: 2.2, yaw: Math.PI } });
  const FIREMEN = 'Im Vorschiff des D-Decks schliefen Heizer, Trimmer und Schmierer in großen Sälen mit eisernen Doppelkojen. Sie arbeiteten in Wachen von vier Stunden vor den 159 Feuerungen der 29 Kessel. Um die Passagiere nicht zu stören, erreichten sie die Kesselräume über eigene Wendeltreppen und einen Tunnel unter den Laderäumen.';
  await world.tick();
  room('heizer-bb', 'Schlafsaal der Heizer (Backbord)', 95, 104, -99, -CH, 'dormitory', [dS(96.2)], { ...CREW,
    teleport: { name: 'Heizerunterkünfte', group: 'Besatzung' }, info: { title: 'Heizerunterkünfte auf dem D-Deck', text: FIREMEN } });
  await world.tick();
  room('heizer-stb', 'Schlafsaal der Heizer (Steuerbord)', 95, 104, CH, 99, 'dormitory', [dP(96.2)], CREW);
  await world.tick();
  gang('gang-heizer', 'Gang im Heizerlogis', 87.2, 95, -CC, CC, { lamp: 'bulkhead' });
  await world.tick();
  room('trimmer', 'Schlafsaal der Trimmer', 87.2, 95, -99, -CC, 'dormitory', [dS(93.5)], CREW);
  await world.tick();
  room('schmierer', 'Schlafsaal der Schmierer', 87.2, 95, CC, 99, 'dormitory', [dP(93.5)], CREW);
  await world.tick();
  gang('quer-heizer', 'Quergang vor dem Schott (Heizerlogis)', 86, 87.2, -99, 99, { lamp: 'bulkhead' });
  await world.tick();
  bulkhead(world, deck, 86, { thickness: 0.06, doors: [{ z: 0, w: 1.0 }] });

  await world.tick();
  // ============================================================== x 64..86  third class forward
  gang('quer-3v', 'Quergang 3. Klasse (vorn)', 84.8, 86, -99, 99, {});
  await world.tick();
  gang('gang-3v-bb', 'Gang 3. Klasse vorn (Backbord)', 64, 84.8, -T3b, -T3a, { handrail: true,
    teleport: { name: 'Kabinen 3. Klasse vorn – D-Deck', group: '3. Klasse', x: 83.5, z: -(T3a + T3b) / 2, yaw: Math.PI } });
  await world.tick();
  gang('gang-3v-stb', 'Gang 3. Klasse vorn (Steuerbord)', 64, 84.8, T3a, T3b, { handrail: true });
  await world.tick();
  plan.cabinRow({ x0: 64, x1: 84.8, z0: -99, z1: -T3b, count: 7, corridorSide: 'stbd', berths: 6, ...T3 });
  await world.tick();
  plan.cabinRow({ x0: 64, x1: 84.8, z0: T3b, z1: 99, count: 7, corridorSide: 'port', berths: 6, ...T3 });
  const OPEN3 = { type: 'third', cls: 'third', wall: 'paintWhite', floor: 'linoRed', lamp: 'bulkhead', furnish: { preset: 'dormitory', pine: true } };
  await world.tick();
  room('kojen-3v-bb', 'Offener Schlafsaal 3. Klasse (Backbord)', 68, 84.8, -T3a, 0, undefined, [dP(70.5, { style: 'pine' }), dP(82.3, { style: 'pine' })], { ...OPEN3,
    teleport: { name: 'Offener Schlafsaal 3. Klasse', group: '3. Klasse' },
    info: { title: 'Offene Schlafsäle der 3. Klasse', text: 'Im Vorschiff gab es neben den Kabinen auch offene Schlafsäle, in denen allein reisende Männer der Dritten Klasse in langen Reihen von Kiefernholzkojen schliefen. Die Kojen ließen sich bei geringer Auslastung abbauen, um den Raum als Laderaum zu nutzen. Selbst diese Unterkünfte galten 1912 als besser als auf den meisten Auswandererschiffen.' } });
  await world.tick();
  room('kojen-3v-stb', 'Offener Schlafsaal 3. Klasse (Steuerbord)', 68, 84.8, 0, T3a, undefined, [dS(70.5, { style: 'pine' }), dS(82.3, { style: 'pine' })], OPEN3);
  await world.tick();
  room('wc-3v', 'WC 3. Klasse (vorn)', 64, 68, -T3a, 0, 'wc', [dP(66)], { ...WET, wall: 'paintWhite', cls: 'third' });
  await world.tick();
  room('wasch-3v', 'Waschraum 3. Klasse (vorn)', 64, 68, 0, T3a, washroom, [dS(66)], { ...WET, wall: 'paintWhite', cls: 'third' });

  await world.tick();
  // ============================================================== x 47.5..64  first-class staterooms, gangway vestibules
  const F1 = { type: 'first' };
  await world.tick();
  for (const s of [-1, 1]) {
    const bb = s < 0;
    gang(bb ? 'gang-1-bb' : 'gang-1-stb', bb ? 'Gang 1. Klasse (Backbord)' : 'Gang 1. Klasse (Steuerbord)', RECEPTION.x1, 64, bb ? -F1b : F1a, bb ? -F1a : F1b, {
      wall: 'whitePanel', floor: 'carpetRed', handrail: true, lamp: 'bowl',
      ...(bb ? {} : { teleport: { name: 'Kabinen 1. Klasse D-Deck', group: '1. Klasse', x: 62.6, z: (F1a + F1b) / 2, yaw: Math.PI } }) });
    room(bb ? 'vestibuel-bb' : 'vestibuel-stb', bb ? 'Eingangshalle 1. Klasse (Backbord)' : 'Eingangshalle 1. Klasse (Steuerbord)', RECEPTION.x1, 52, bb ? -99 : F1b, bb ? -F1b : 99,
      furnishVestibule(s), [dA(s * 11, { w: 1.8, leaf: false }), bb ? dS(49.75, { w: 1.4, leaf: false }) : dP(49.75, { w: 1.4, leaf: false })], {
        type: 'lobby', cls: 'first', wall: 'whitePanel', floor: 'linoCream', lamp: 'bowl', group: '1. Klasse',
        ...(bb ? {} : {
          teleport: { name: 'Eingangshalle 1. Klasse', group: '1. Klasse' },
          info: { title: 'Einschiffung der 1. Klasse', text: 'Durch die Gangway-Pforten in der Bordwand des D-Decks betraten die Passagiere der Ersten Klasse in Southampton und Cherbourg das Schiff. Hinter schmiedeeisernen Gittertoren gelangten sie direkt in den Empfangsraum am Fuß der Großen Treppe. Stewards nahmen sie hier in Empfang und führten sie zu ihren Kabinen.' },
        }) });
    row(bb ? 'p1' : 's1', { x0: 52, x1: 64, z0: bb ? -99 : F1b, z1: bb ? -F1b : 99, count: 4, corridorSide: bb ? 'stbd' : 'port', ...F1, wall: bb ? 'damaskGreen' : 'damaskRed' });
    row(bb ? 'p1' : 's1', { x0: 61, x1: 64, z0: bb ? -F1a : CH, z1: bb ? -CH : F1a, count: 1, corridorSide: bb ? 'port' : 'stbd', ...F1 });
    row(bb ? 'p1' : 's1', { x0: 52.5, x1: 59.5, z0: bb ? -F1a : CH, z1: bb ? -CH : F1a, count: 2, corridorSide: bb ? 'port' : 'stbd', ...F1, wall: 'damaskBlue' });
  }
  await world.tick();
  gang('quer-1', 'Quergang 1. Klasse', 59.5, 61, -F1a, F1a, { wall: 'whitePanel', floor: 'carpetRed', lamp: 'bowl' });
  await world.tick();
  room('bad-1a', 'Bad 1. Klasse', 61, 64, -CH, -1, 'bathroom', [dA(-2)], { ...WET, cls: 'first' });
  await world.tick();
  room('wc-1', 'WC 1. Klasse', 61, 64, -1, 1, 'wc', [dA(0)], { ...WET, cls: 'first' });
  await world.tick();
  room('bad-1b', 'Bad 1. Klasse', 61, 64, 1, CH, 'bathroom', [dA(2)], { ...WET, cls: 'first' });
  await world.tick();
  room('anrichte-empf', 'Anrichte des Empfangsraums', RECEPTION.x1, 52.5, -F1a, -CH, 'pantry', [dP(50)], { ...SVC, floor: 'tileWhite' });
  await world.tick();
  room('silber', 'Silberkammer', RECEPTION.x1, 52.5, -CH, CH, { preset: 'store', shelves: 3 }, [dP(50)], SVC);
  await world.tick();
  room('wc-damen-1', 'Damentoilette 1. Klasse', RECEPTION.x1, 52.5, CH, F1a, 'wc', [dS(50)], { ...WET, cls: 'first', wall: 'whitePanel' });

  await world.tick();
  // ============================================================== x 30.5..47.5  Reception Room with the Grand Staircase
  room('empfang', 'Empfangsraum 1. Klasse', RECEPTION.x0, RECEPTION.x1, -99, 99, furnishReception,
    [dF(-(F1a + F1b) / 2, { w: 1.4, leaf: false }), dF((F1a + F1b) / 2, { w: 1.4, leaf: false })], {
      type: 'public', cls: 'first', stairs: true, casing: true, wall: { base: 'whitePanel', cornice: 'gold' }, ceiling: 'plaster', lamp: 'chandelier',
      teleport: { name: 'Empfangsraum 1. Klasse', group: '1. Klasse', x: 32.2, z: -3.8, yaw: -0.25 },
      info: { title: 'Empfangsraum der 1. Klasse', x: 34, z: 6, radius: 7, text: 'Der Empfangsraum am Fuß der Großen Treppe war im jakobinischen Stil mit weiß lackierter, geschnitzter Holztäfelung ausgestattet. Auf dem Axminster-Teppich standen Korbsessel und kleine Tische; ein Steinway-Flügel sorgte für Musik. Vor dem Dinner trafen sich hier die Passagiere der Ersten Klasse, danach spielte das Bordorchester für die Gäste beim Kaffee.' } });
  await world.tick();
  world.addTeleport({ name: 'Große Treppe – D-Deck', deck, x: 45.0, z: 0, yaw: Math.PI, group: '1. Klasse' });
  await world.tick();
  world.addInfo({ title: 'Die Große Treppe am D-Deck', x: 43.6, y: Y + 1.5, z: 3.6, radius: 4, text: 'Die vordere Große Treppe reichte vom Bootsdeck bis hinunter zum E-Deck. Auf dem D-Deck mündete sie in den Empfangsraum: Über die beiden Seitenläufe kamen die Passagiere vom Zwischenpodest herab, am Fuß des Mittellaufs stand auf dem Pfosten ein Bronzecherub mit Fackellampe. Das schmiedeeiserne Geländer mit vergoldeten Rosetten und die Eichenbalustrade wiederholten sich auf jedem Deck.' });
  await world.tick();
  world.addInfo({ title: 'Der Aubusson-Wandteppich', x: 43.6, y: Y + 1.5, z: -1.2, radius: 2.5, text: 'Über dem Empfangsraum hing auf dem Zwischenpodest der Treppe ein großer französischer Wandteppich aus Aubusson mit einer Jagdszene. Er bildete den Blickfang für alle, die vom Empfangsraum zur Treppe hinaufsahen. Teile ähnlicher Ausstattung des Schwesterschiffs Olympic sind bis heute erhalten.' });
  await world.tick();
  world.addInfo({ title: 'Die Aufzüge am D-Deck', x: 45.0, y: Y + 1.5, z: -3.6, radius: 2.0, text: 'Unmittelbar vor der Großen Treppe lagen die drei Aufzüge der Ersten Klasse. Sie verbanden das E-Deck mit dem A-Deck und hatten kunstvoll verzierte Scherengitter aus Schmiedeeisen. Liftboys in Uniform bedienten die Kabinen.' });

  await world.tick();
  // ============================================================== x −6.5..30.5  First-class Dining Saloon
  dining1Walls(plan);
  await world.tick();
  room('speisesaal-1', 'Speisesaal 1. Klasse', DINING1.x0, DINING1.x1, -99, 99, furnishDining1, [
    dF(-4.6, { w: 1.6, leaf: false }), dF(4.6, { w: 1.6, leaf: false }), dF(-9.6, { w: 1.4, leaf: false }), dF(9.6, { w: 1.4, leaf: false }),
    dA(-13.15, { w: 0.9, style: 'white' }), dA(13.15, { w: 0.9, style: 'white' }),
  ], {
    type: 'public', cls: 'first', casing: true, wall: { base: 'whitePanel', cornice: 'paintWhite', dado: 'paintWhite' }, floor: 'linoCream', ceiling: 'plaster', lamp: 'cut',
    teleport: { name: 'Speisesaal 1. Klasse', group: '1. Klasse', x: 29.7, z: -4.6, yaw: Math.PI },
    info: { title: 'Speisesaal der 1. Klasse', x: 26, z: -4, radius: 9, text: 'Mit rund 35 Metern Länge und der vollen Schiffsbreite war der Speisesaal der größte Raum, der 1912 auf einem Schiff zu finden war; er bot Platz für 554 Gäste. Die weiß gestrichene Täfelung und die stuckierte Decke im jakobinischen Stil waren Vorbildern wie Haddon Hall und Hatfield House nachempfunden. In den Nischen an den Seiten saßen kleinere Gesellschaften hinter bleiverglasten Fenstern, die von hinten beleuchtet wurden.' } });
  await world.tick();
  world.addInfo({ title: 'Das letzte Dinner', x: 6, y: Y + 1.5, z: 6, radius: 8, text: 'Am Abend des 14. April 1912 wurde hier ein Dinner mit zehn Gängen serviert, unter anderem Austern, pochierter Lachs, Filet Mignon und Waldorfpudding. Kapitän Smith war an diesem Abend Gast der Familie Widener im À-la-carte-Restaurant auf dem B-Deck. Gegen 23:40 Uhr, als der Eisberg das Schiff streifte, hatten die Stewards den Saal bereits für das Frühstück eingedeckt.' });

  await world.tick();
  // ============================================================== x −36..−6.5  pantries, galley, bakery, butcher
  for (const s of [-1, 1]) {
    const bb = s < 0;
    gang(bb ? 'stewards-bb' : 'stewards-stb', bb ? 'Stewardgang Backbord (Kombüse)' : 'Stewardgang Steuerbord (Kombüse)', -36, DINING1.x0, bb ? -99 : GZ, bb ? -GZ : 99, {
      wall: 'paintWhite', lamp: 'bulkhead', group: 'Besatzung',
      ...(bb ? { teleport: { name: 'Stewardgang (Kombüse)', group: 'Besatzung', x: -10, z: -13.15, yaw: Math.PI } } : {}) });
    room(bb ? 'anrichte-1-bb' : 'anrichte-1-stb', bb ? 'Anrichte 1. Klasse (Backbord)' : 'Anrichte 1. Klasse (Steuerbord)', -16, DINING1.x0, bb ? -GZ : CH, bb ? -CH : GZ, 'pantry',
      [dF(s * 4.6, { w: 1.2 }), dF(s * 11.0, { w: 1.0 }), dA(s * 7.5, { w: 1.2 }), bb ? dP(-9.5) : dS(-9.5)], { ...KIT,
        ...(bb ? { teleport: { name: 'Anrichte 1. Klasse', group: 'Besatzung' } } : {}) });
  }
  await world.tick();
  room('spuel-1', 'Spülküche 1. Klasse', -16, -13.5, -CH, CH, furnishScullery, [dA(0, { w: 1.0 })], KIT);
  await world.tick();
  room('kombuese', 'Kombüse (Hauptküche)', -24, -16, -GZ, GZ, furnishGalley, [dP(-21.5, { w: 1.2 }), dS(-21.5, { w: 1.2 })], {
    ...KIT, floor: null, lamp: 'bowl',
    teleport: { name: 'Kombüse (Hauptküche)', group: 'Besatzung', x: -17.0, z: -1.0, yaw: Math.PI },
    info: { title: 'Die Hauptkombüse', x: -20, z: 0, radius: 7, text: 'Zwischen den Speisesälen der Ersten und Zweiten Klasse lag die Hauptküche, die beide Säle versorgte. Ihr Herzstück war eine kohlebefeuerte Herdreihe von fast 30 Metern Länge mit 19 Backöfen, dazu kamen Grills, Bratöfen, Dampfkessel und Wärmetische. Dutzende Köche, Bäcker und Küchenjungen bereiteten hier täglich Tausende Mahlzeiten zu.' } });
  await world.tick();
  room('baeckerei', 'Bäckerei', -30, -24, -GZ, -7.5, furnishBakery, [dF(-10, { w: 1.0 }), dP(-27)], { ...KIT,
    teleport: { name: 'Bäckerei', group: 'Besatzung' },
    info: { title: 'Bäckerei und Konditorei', text: 'Die Bäcker arbeiteten in Schichten rund um die Uhr: Frisches Brot, Brötchen und Croissants gab es zu jeder Mahlzeit. Die Konditorei nebenan stellte Torten, Eis und das Gebäck für den Nachmittagstee her. Chefbäcker Charles Joughin überlebte den Untergang, nachdem er über zwei Stunden im eiskalten Wasser ausgeharrt hatte.' } });
  await world.tick();
  room('konditorei', 'Konditorei', -30, -24, -7.5, -CH, furnishPastry, [dF(-5.2, { w: 1.0 })], KIT);
  await world.tick();
  room('gemuese', 'Gemüseküche', -30, -24, CH, 7.5, furnishVeg, [dF(5.2, { w: 1.0 })], KIT);
  await world.tick();
  room('metzgerei', 'Metzgerei', -30, -24, 7.5, GZ, furnishButcher, [dF(10, { w: 1.0 }), dS(-27)], KIT);
  await world.tick();
  room('spuel-2', 'Spülküche (achtern)', -36, -30, -GZ, -CH, furnishScullery, [dP(-33), dA(-7.6, { w: 1.0 })], KIT);
  await world.tick();
  room('anrichte-2', 'Anrichte 2. Klasse', -36, -30, CH, GZ, 'pantry', [dS(-33), dA(7.6, { w: 1.2 })], KIT);

  await world.tick();
  // ============================================================== x −59..−36  Second-class Dining Saloon
  dining2Walls(plan);
  await world.tick();
  room('speisesaal-2', 'Speisesaal 2. Klasse', DINING2.x0, DINING2.x1, -99, 99, furnishDining2, [
    dF(-13.15, { w: 0.9, style: 'oak' }), dF(13.15, { w: 0.9, style: 'oak' }),
  ], {
    type: 'public', cls: 'second', stairs: true, wall: 'oakPanel', floor: 'linoCream', lamp: 'bowl',
    teleport: { name: 'Speisesaal 2. Klasse', group: '2. Klasse', x: -48.6, z: 2.6, yaw: 0.3 },
    info: { title: 'Speisesaal der 2. Klasse', x: -50, z: 4, radius: 8, text: 'Der Speisesaal der Zweiten Klasse war gut 21 Meter lang, reichte über die volle Schiffsbreite und bot 394 Gästen Platz. Er war mit Eichenholz getäfelt; an langen Tafeln standen fest am Boden verschraubte Drehstühle aus Mahagoni mit rotem Lederbezug. Ein Klavier sorgte für Musik, und die Speisekarte stand der Ersten Klasse anderer Reedereien kaum nach.' } });
  await world.tick();
  plan.opening(DINING2.x0, -S2b, DINING2.x0, -S2a);

  await world.tick();
  // ============================================================== x −68..−59  stair 'secondAft' and the hospital (starboard)
  room('treppe-2a', 'Hinteres Treppenhaus 2. Klasse (D-Deck)', -68, -59, -3.3, 3.3, 'empty', [dF(-2.45, { w: 0.9, leaf: false }), dF(2.45, { w: 0.9, leaf: false }), dA(0, { w: 1.2, leaf: false })], {
    type: 'lobby', cls: 'second', stairs: true, wall: 'oak', floor: 'linoCream', lamp: 'bowl',
    teleport: { name: 'Treppe 2. Klasse achtern – D-Deck', group: '2. Klasse', x: -59.8, z: 2.45, yaw: Math.PI } });
  await world.tick();
  gang('vorraum-2a', 'Vorraum am hinteren Treppenhaus', -74, -68, -1.2, 1.2, { wall: 'whitePanel', floor: 'linoBlue' });
  await world.tick();
  room('wc-2-herren', 'WC Herren 2. Klasse', -74, -68, -3.3, -1.2, 'wc', [dS(-71)], { ...WET, cls: 'second' });
  await world.tick();
  room('wc-2-damen', 'WC Damen 2. Klasse', -74, -68, 1.2, 3.3, 'wc', [dP(-71)], { ...WET, cls: 'second' });
  const HOSP = { type: 'hospital', wall: 'paintWhite', floor: 'linoCream', lamp: 'dome', group: 'Hospital' };
  await world.tick();
  gang('hosp-gang', 'Gang zum Hospital', -74, -59, S2a, S2b, { wall: 'paintWhite', floor: 'linoCream' });
  await world.tick();
  room('hospital', 'Hospital', -74, -66, S2b, 99, (ctx) => furnishWard(ctx, 5), [dP(-70.5, { w: 1.2 })], { ...HOSP,
    teleport: { name: 'Hospital', group: '2. Klasse' },
    info: { title: 'Das Bordhospital', text: 'Achtern auf der Steuerbordseite des D-Decks lag das Hospital mit Krankensälen für Männer und Frauen, einer Isolierstation für ansteckende Krankheiten, einer Apotheke und einem Operationsraum. Es wurde vom Schiffsarzt William O’Loughlin und seinem Assistenten John Edward Simpson geleitet. Beide Ärzte kamen beim Untergang ums Leben.' } });
  await world.tick();
  room('isolier', 'Isolierstation', -66, -61, S2b, 99, (ctx) => furnishWard(ctx, 3), [dP(-63.5)], HOSP);
  await world.tick();
  room('hosp-bad', 'Bad des Hospitals', -61, -59, S2b, 99, 'bathroom', [dP(-60)], { ...HOSP, ...WET });
  await world.tick();
  room('op', 'Operationsraum', -74, -69, CH + 0.3, S2a, furnishSurgery, [dS(-71.5)], { ...HOSP, wall: 'tile', floor: 'tileWhite' });
  await world.tick();
  room('apotheke', 'Apotheke', -69, -64, CH + 0.3, S2a, furnishDispensary, [dS(-66.5)], HOSP);
  await world.tick();
  room('arzt', 'Untersuchungszimmer des Schiffsarztes', -64, -59, CH + 0.3, S2a, 'office', [dS(-61.5)], { ...HOSP, wall: 'oakDado', floor: 'carpetGreen' });

  await world.tick();
  // ============================================================== x −96..−59  second-class staterooms
  const C2 = { type: 'second' };
  await world.tick();
  gang('gang-2-bb', 'Gang 2. Klasse (Backbord)', -96, DINING2.x0, -S2b, -S2a, { wall: 'whitePanel', floor: 'linoBlue', handrail: true,
    teleport: { name: 'Kabinen 2. Klasse D-Deck', group: '2. Klasse', x: -60, z: -(S2a + S2b) / 2, yaw: Math.PI } });
  await world.tick();
  gang('gang-2-stb', 'Gang 2. Klasse (Steuerbord)', -96, -74, S2a, S2b, { wall: 'whitePanel', floor: 'linoBlue', handrail: true });
  await world.tick();
  gang('quer-2', 'Quergang 2. Klasse (vorn)', -75.2, -74, -S2a, S2a, { wall: 'whitePanel', floor: 'linoBlue' });
  await world.tick();
  gang('quer-2b', 'Quergang 2. Klasse (achtern)', -90.2, -89, -S2a, S2a, { wall: 'whitePanel', floor: 'linoBlue' });
  await world.tick();
  row('p2', { x0: -96, x1: DINING2.x0, z0: -99, z1: -S2b, count: 12, corridorSide: 'stbd', ...C2 });
  await world.tick();
  row('s2', { x0: -96, x1: -74, z0: S2b, z1: 99, count: 7, corridorSide: 'port', ...C2 });
  await world.tick();
  row('p2', { x0: -68, x1: DINING2.x0, z0: -S2a, z1: -3.3, count: 3, corridorSide: 'port', ...C2 });
  await world.tick();
  row('p2', { x0: -74, x1: -68, z0: -S2a, z1: -3.3, count: 2, corridorSide: 'port', ...C2 });
  await world.tick();
  for (const s of [-1, 1]) {
    const k = s < 0 ? 'p2' : 's2', z0 = s < 0 ? -S2a : 3.3, z1 = s < 0 ? -3.3 : S2a, cs = s < 0 ? 'port' : 'stbd';
    row(k, { x0: -89, x1: -75.2, z0, z1, count: 5, corridorSide: cs, ...C2 });
    row(k, { x0: -96, x1: -90.2, z0, z1, count: 2, corridorSide: cs, ...C2, berths: 4 });
  }
  // centre strip: baths, WCs, linen and luggage rooms off the cross passages
  const ZC = [[-3.3, -1.1], [-1.1, 1.1], [1.1, 3.3]];
  [['wc-2a-h', 'WC Herren 2. Klasse (achtern)', 'wc', WET], ['bad-2a', 'Bad 2. Klasse', 'bathroom', WET], ['wc-2a-d', 'WC Damen 2. Klasse (achtern)', 'wc', WET]]
    .forEach(([id, name, f, o], i) => room(id, name, -96, -90.2, ZC[i][0], ZC[i][1], f, [dF((ZC[i][0] + ZC[i][1]) / 2)], { ...o, cls: 'second' }));
  [['bad-2b', 'Bad 2. Klasse', 'bathroom', WET], ['waesche-2', 'Wäschekammer 2. Klasse', 'linen', SVC], ['bad-2c', 'Bad 2. Klasse', 'bathroom', WET]]
    .forEach(([id, name, f, o], i) => room(id, name, -89, -82.1, ZC[i][0], ZC[i][1], f, [dA((ZC[i][0] + ZC[i][1]) / 2)], { ...o, cls: 'second' }));
  [['gepaeck-2', 'Gepäckraum 2. Klasse', luggage, SVC], ['steward-2', 'Stewardraum 2. Klasse', stewardRoom, SVC], ['bad-2d', 'Bad 2. Klasse (Damen)', 'bathroom', WET]]
    .forEach(([id, name, f, o], i) => room(id, name, -82.1, -75.2, ZC[i][0], ZC[i][1], f, [dF((ZC[i][0] + ZC[i][1]) / 2)], { ...o, cls: 'second' }));

  await world.tick();
  // ============================================================== x −126..−96  third class aft, stores at the stern
  room('treppe-3a', 'Treppenhaus 3. Klasse (achtern)', -116, -107, -T3a, T3a, 'empty',
    [dP(-113.6, { w: 1.2, leaf: false }), dP(-108.6, { w: 1.2, leaf: false }), dS(-113.6, { w: 1.2, leaf: false }), dS(-108.6, { w: 1.2, leaf: false }), dA(0, { w: 1.0, leaf: false })], {
      type: 'lobby', cls: 'third', stairs: true, wall: 'paintWhite', floor: 'linoRed', lamp: 'bulkhead',
      teleport: { name: 'Treppe 3. Klasse achtern – D-Deck', group: '3. Klasse', x: -107.6, z: 2.6, yaw: Math.PI } });
  await world.tick();
  gang('gang-3a-bb', 'Gang 3. Klasse achtern (Backbord)', -116, -96, -T3b, -T3a, { handrail: true,
    teleport: { name: 'Kabinen 3. Klasse achtern – D-Deck', group: '3. Klasse', x: -97, z: -(T3a + T3b) / 2, yaw: Math.PI },
    info: { title: 'Kabinen der 3. Klasse im Heck', x: -101, z: -5.2, radius: 5, text: 'Im Heck der Titanic waren Familien, Ehepaare und allein reisende Frauen der Dritten Klasse untergebracht, getrennt von den ledigen Männern im Bug. Die Kabinen mit zwei bis sechs Kojen hatten weiß gestrichene Wände und ein Waschbecken. Viele Passagiere aus Skandinavien, Irland und dem Nahen Osten reisten so als Auswanderer nach Amerika.' } });
  await world.tick();
  gang('gang-3a-stb', 'Gang 3. Klasse achtern (Steuerbord)', -116, -96, T3a, T3b, { handrail: true });
  await world.tick();
  plan.cabinRow({ x0: -116, x1: -96, z0: -99, z1: -T3b, count: 7, corridorSide: 'stbd', berths: 6, ...T3 });
  await world.tick();
  plan.cabinRow({ x0: -116, x1: -96, z0: T3b, z1: 99, count: 7, corridorSide: 'port', berths: 6, ...T3 });
  await world.tick();
  plan.cabinRow({ x0: -107, x1: -96, z0: -T3a, z1: 0, count: 4, corridorSide: 'port', berths: 4, ...T3 });
  await world.tick();
  plan.cabinRow({ x0: -107, x1: -96, z0: 0, z1: T3a, count: 4, corridorSide: 'stbd', berths: 2, ...T3 });
  await world.tick();
  gang('gang-heck', 'Gang zum Heckstore', -121, -116, -CC, CC, { lamp: 'bulkhead' });
  await world.tick();
  room('wc-3a', 'WC 3. Klasse (achtern)', -121, -116, -99, -CC, 'wc', [dS(-118.5)], { ...WET, wall: 'paintWhite', cls: 'third' });
  await world.tick();
  room('wasch-3a', 'Waschraum 3. Klasse (achtern)', -121, -116, CC, 99, washroom, [dP(-118.5)], { ...WET, wall: 'paintWhite', cls: 'third' });
  await world.tick();
  room('store-heck', 'Proviant- und Gepäckstore (Heck)', -126, -121, -99, 99, 'store', [dF(0, { w: 1.0, style: 'steel' })], { ...SVC,
    teleport: { name: 'Heckstore', group: 'Besatzung' } });

  const res = await plan.finishAsync();
  await world.tick();
  console.info(`[deck D] ${res.rooms.length} rooms, ${res.walls} wall pieces, ${res.doors} doors, ${res.problems.length} problems`);
  return {};
}
