// G deck ("Lower Deck") – exists only forward (x 66..116) and aft (x -116..-58) of the machinery spaces.
// Forward: hold stair lobby, Squash Racquet Court on the centreline, Post Office and first-class baggage room (starboard),
// third-class cabins (port), stair 'thirdFwd' and open berths for single men in the bow.
// Aft: third-class cabins along both sides, in the centre the ship's provision stores and refrigerated rooms
// along two provision alleys either side of the hold stair 'holdAft', stair 'thirdAft' at the after end.
import { buildDeckShell, bulkhead, createDeckPlan, sink, bench } from '../interior/kit.js';
import { shortcuts } from './f-util.js';
import {
  squashCourt, squashChanging, postOffice, baggageRoom, meatRoom, fishRoom, produceRoom, dairyRoom, iceRoom, mineralRoom, wineCellar, beerStore, dryStore,
} from './g-hero.js';

const deck = 'G';
const S0 = 3.05, S1 = 4.25, SC = 3.65;   // forward side corridors
const C0 = 4.4, C1 = 5.6, CC = 5.0;       // aft side corridors
const BULKHEADS = { 90: [-SC, SC], 108: [0], '-80': [-CC, 0, CC], '-100': [-CC, CC] };

function washroom(ctx) {
  ctx.fit(sink({ w: 1.0 }), ['far:mid', 'left:hi', 'right:hi']);
  ctx.fit(bench({ w: 1.2, back: false, mat: 'pine' }), ['left:mid', 'right:mid'], { collide: false });
}

export async function build(world) {
  buildDeckShell(world, deck);
  const plan = createDeckPlan(world, deck, { wall: 'paintWhite' });
  const { room, gang, dP, dS, dA, dF, row, side } = shortcuts(plan, 'G');
  const SVC = { type: 'service', wall: 'paintWhite', lamp: 'bulkhead', group: 'Besatzung' };
  const COLD = { type: 'store', wall: 'paintWhite', floor: 'tile', lamp: 'bulkhead', group: 'Besatzung' };
  const WET = { type: 'bath', wall: 'paintWhite', floor: 'tile', cls: 'third' };

  for (const [x, ds] of Object.entries(BULKHEADS)) bulkhead(world, deck, Number(x), { thickness: 0.06, doors: ds.map((z) => ({ z, w: 1.0 })) });

  // ============================================================== forward  x 66..90
  room('nd-lade-v', 'Niedergang Laderaum vorn (G-Deck)', 66, 76.6, -S0, S0, 'empty', [], {
    type: 'lobby', stairs: true, walls: 'none', lamp: 'bulkhead', teleport: { name: 'Niedergang Laderaum vorn – G-Deck', group: 'Besatzung', x: 76.0, z: 2.2, yaw: Math.PI } });
  gang('gang-v-bb', 'Gang G-Deck vorn (Backbord)', 66, 90, -S1, -S0, { handrail: true, lamp: 'bulkhead',
    teleport: { name: 'Kabinen 3. Klasse vorn (G-Deck)', group: '3. Klasse', x: 84, z: -SC, yaw: Math.PI } });
  gang('gang-v-stb', 'Gang G-Deck vorn (Steuerbord)', 66, 90, S0, S1, { handrail: true, lamp: 'bulkhead' });
  room('squash', 'Squash-Court', 76.6, 85.7, -S0, S0, squashCourt, [dA(0, { style: 'oak' })], {
    type: 'sport', cls: 'first', wall: 'paintWhite', floor: 'oak', lamp: 'bulkhead', lampPitch: 3.5, group: '1. Klasse',
    teleport: { name: 'Squash-Court', group: '1. Klasse' },
    info: { title: 'Der Squash-Court', text: 'Der Squash-Court der Titanic war 9,1 mal 6,1 Meter groß und reichte im Original über zwei Decks; vom F-Deck aus konnten Zuschauer von einer Galerie zusehen. Passagiere der Ersten Klasse zahlten zwei Schilling für eine halbe Stunde. Trainer war der Profi Frederick Wright, der beim Untergang ums Leben kam.' } });
  room('squash-umkleide', 'Umkleideraum (Squash-Court)', 85.7, 90, 0, S0, squashChanging, [dS(87.85)], { cls: 'first', wall: 'whitePanel', floor: 'linoCream' });
  room('squash-lehrer', 'Raum des Squash-Lehrers', 85.7, 90, -S0, 0, { preset: 'cabinCrew', berths: 1, single: true, officer: true }, [dP(87.85)], { ...SVC, wall: 'whitePanel' });
  room('gepaeck-1', 'Gepäckraum 1. Klasse', 66, 76, S1, 99, baggageRoom, [dP(71, { w: 1.4, style: 'steel' })], {
    ...SVC, floor: 'steelFloor', teleport: { name: 'Gepäckraum 1. Klasse', group: '1. Klasse' },
    info: { title: 'Gepäckraum der Ersten Klasse', text: 'Hier lagerte das Gepäck, das Passagiere der Ersten Klasse während der Reise nicht in der Kabine brauchten. Wohlhabende Reisende führten oft Dutzende Koffer und Schrankkoffer mit sich. Über eine Luke war der Raum mit den Gepäck- und Laderäumen auf dem Orlop-Deck verbunden.' } });
  room('postamt', 'Postamt', 76, 90, S1, 99, postOffice, [dP(78.4, { style: 'oak' }), dP(87.6, { style: 'oak' })], {
    type: 'office', wall: 'pine', floor: 'oak', lamp: 'bowl', group: 'Besatzung', teleport: { name: 'Postamt', group: 'Besatzung' },
    info: { title: 'Die Seepost der RMS Titanic', text: 'Die Titanic fuhr als „Royal Mail Ship“ im Auftrag der britischen Post. Fünf Postbeamte – drei Amerikaner und zwei Briten – sortierten während der Überfahrt rund 3 400 Postsäcke. In der Unglücksnacht versuchten sie, die Einschreibesendungen vor dem eindringenden Wasser auf höhere Decks zu retten; keiner von ihnen überlebte.' } });
  side(66, 76, S1, -1, 'third'); side(76, 86, S1, -1, 'third');
  room('postbeamte', 'Aufenthaltsraum der Seepostbeamten', 86, 90, -99, -S1, { preset: 'cabinCrew', berths: 2, officer: true }, [dS(88)], { ...SVC, wall: 'pine' });

  // ============================================================== forward  x 90..116  stair 'thirdFwd', open berths
  room('treppe-3v', 'Treppenhaus 3. Klasse (vorn, G-Deck)', 90, 104, -S1, S1, 'empty', [dF(0, { w: 1.2, leaf: false })], {
    type: 'lobby', stairs: true, walls: ['port', 'stbd', 'fwd'], lamp: 'bulkhead', teleport: { name: 'Treppe 3. Klasse vorn – G-Deck', group: '3. Klasse', x: 92, z: 2.4, yaw: 0 } });
  row(90, 100, S1, 1, 'third', { pitch: 3.33 }); row(90, 100, S1, -1, 'third', { pitch: 3.33 });
  room('wasch-3v', 'Waschraum 3. Klasse (vorn)', 100, 104, S1, 99, washroom, [dP(102)], WET);
  room('wc-3v', 'WC 3. Klasse (vorn)', 100, 104, -99, -S1, 'wc', [dS(102)], WET);
  gang('gang-bug', 'Gang zum Bug', 104, 108, -0.6, 0.6, { lamp: 'bulkhead' });
  room('gepaeck-3', 'Gepäckraum 3. Klasse', 104, 108, -99, -0.6, 'hold', [dS(106, { style: 'steel' })], SVC);
  room('lampen', 'Lampen- und Farbenlast', 104, 108, 0.6, 99, { preset: 'store', shelves: 3 }, [dP(106, { style: 'steel' })], SVC);
  room('kojen-bug', 'Offene Kojen 3. Klasse (Bug)', 108, 116, -99, 99, { preset: 'dormitory', pine: true }, [dA(0, { w: 1.0, style: 'steel' })], {
    type: 'dormitory', cls: 'third', wall: 'paintWhite', floor: 'linoRed', lamp: 'bulkhead', group: '3. Klasse',
    teleport: { name: 'Offene Kojen 3. Klasse', group: '3. Klasse' },
    info: { title: 'Offene Kojen im Bug', text: 'Ganz vorne im Bug, wo das Schiff am stärksten stampfte, schliefen allein reisende Männer der Dritten Klasse in offenen Kojen aus Kiefernholz. Diese Räume lagen der Kollisionsstelle am nächsten. Bewohner berichteten später, dass hier schon wenige Minuten nach dem Zusammenstoß Wasser über den Boden lief.' } });

  // ============================================================== aft  x -116..-58
  gang('gang-a-bb', 'Kabinengang G-Deck achtern (Backbord)', -116, -58, -C1, -C0, { handrail: true,
    teleport: { name: 'Kabinengang 3. Klasse achtern (G-Deck)', group: '3. Klasse', x: -62, z: -CC, yaw: Math.PI } });
  gang('gang-a-stb', 'Kabinengang G-Deck achtern (Steuerbord)', -116, -58, C0, C1, { handrail: true });
  room('nd-lade-a', 'Niedergang Laderaum achtern (G-Deck)', -80, -70, -C0, C0, 'empty', [], {
    type: 'lobby', stairs: true, walls: 'none', lamp: 'bulkhead', teleport: { name: 'Niedergang Laderaum achtern – G-Deck', group: 'Besatzung', x: -70.6, z: -2.4, yaw: Math.PI } });
  gang('prov-v', 'Proviantgang (vorn)', -70, -58, -0.6, 0.6, { lamp: 'bulkhead', group: 'Besatzung',
    teleport: { name: 'Kühlräume', group: 'Besatzung', x: -69.2, z: 0, yaw: 0 },
    info: { title: 'Kühl- und Proviantgänge', x: -65, z: 0, radius: 5, text: 'Für eine Atlantiküberquerung nahm die Titanic unter anderem rund 34 Tonnen frisches Fleisch, 5 Tonnen Fisch, 40 000 Eier, 40 Tonnen Kartoffeln und 6 800 Liter Milch an Bord. Die Kühlräume wurden von einer Ammoniak-Kältemaschine im Maschinenraum über Solerohre gekühlt. Jede Ware hatte ihren eigenen Raum mit passender Temperatur.' } });
  gang('prov-a', 'Proviantgang (achtern)', -100, -80, -0.6, 0.6, { lamp: 'bulkhead', group: 'Besatzung' });
  // refrigerated rooms off the forward provision alley
  room('fleisch', 'Fleischkühlraum (Hängefleisch)', -64, -58, -C0, -0.6, meatRoom, [dS(-61, { style: 'steel' })], { ...COLD,
    info: { title: 'Fleischkühlraum', text: 'In diesem Kühlraum hingen Rinderhälften, Hammel und Lämmer an Stahlschienen. Die Metzger des Schiffes zerlegten das Fleisch hier für alle drei Klassen. Kühlschlangen an den Wänden hielten die Temperatur knapp über dem Gefrierpunkt.' } });
  room('fisch', 'Fischkühlraum', -70, -64, -C0, -0.6, fishRoom, [dS(-67, { style: 'steel' })], COLD);
  room('gemuese', 'Gemüsekühlraum', -64, -58, 0.6, C0, produceRoom('veg'), [dP(-61, { style: 'steel' })], COLD);
  room('obst', 'Obstkühlraum', -70, -64, 0.6, C0, produceRoom('fruit'), [dP(-67, { style: 'steel' })], COLD);
  // stores off the after provision alley
  room('molkerei', 'Kühlraum für Milch, Butter und Eier', -86, -80, -C0, -0.6, dairyRoom, [dS(-83, { style: 'steel' })], COLD);
  room('eis', 'Eisraum', -92, -86, -C0, -0.6, iceRoom, [dS(-89, { style: 'steel' })], COLD);
  room('mineral', 'Mineralwasserlager', -100, -92, -C0, -0.6, mineralRoom, [dS(-96, { style: 'steel' })], { ...COLD, floor: 'steelFloor' });
  room('wein', 'Wein- und Spirituosenlager', -90, -80, 0.6, C0, wineCellar, [dP(-85, { style: 'steel' })], { ...COLD, floor: 'steelFloor',
    teleport: { name: 'Wein- und Spirituosenlager', group: 'Besatzung' },
    info: { title: 'Wein- und Spirituosenlager', text: 'Der verschlossene Getränkekeller enthielt unter anderem mehr als 1 000 Flaschen Wein, rund 15 000 Flaschen Bier und Stout sowie 850 Flaschen Spirituosen. Den Schlüssel verwahrte der Chefsteward. 2009 wurden im Wrack noch ungeöffnete Champagnerflaschen gefunden.' } });
  room('bier', 'Bier- und Trockenproviantlager', -100, -90, 0.6, C0, (ctx) => { beerStore(ctx); dryStore(ctx); }, [dP(-95, { style: 'steel' })], { ...COLD, floor: 'steelFloor' });
  // third-class cabins in the centre aft and the stair 'thirdAft'
  row(-107, -100, 0, 1, 'third', { zOut: C0, flip: true, pitch: 3.5 }); row(-107, -100, 0, -1, 'third', { zOut: C0, flip: true, pitch: 3.5 });
  room('treppe-3a', 'Treppenhaus 3. Klasse (achtern, G-Deck)', -116, -107, -C0, C0, 'empty', [], {
    type: 'lobby', stairs: true, walls: 'none', lamp: 'bulkhead', teleport: { name: 'Treppe 3. Klasse achtern – G-Deck', group: '3. Klasse', x: -107.6, z: 2.4, yaw: Math.PI },
    info: { title: 'Die Dritte Klasse auf dem G-Deck', x: -111.5, z: 3.4, radius: 4, text: 'Das G-Deck war das tiefste Passagierdeck der Titanic, nur knapp über der Wasserlinie. Die Kabinen der Dritten Klasse im Heck hatten trotzdem Bullaugen, elektrisches Licht und Waschbecken – ein großer Fortschritt gegenüber den Zwischendecks älterer Auswandererschiffe. Von hier führte die achtere Treppe der Dritten Klasse hinauf bis zum C-Deck.' } });
  // outboard cabins (alley clusters where the hull is wide enough)
  for (const s of [-1, 1]) { side(-80, -58, C1, s, 'third'); side(-100, -80, C1, s, 'third'); side(-116, -100, C1, s, 'third'); }

  const res = plan.finish();
  console.info(`[G] ${res.rooms.length} rooms, ${res.walls} wall pieces, ${res.doors} doors, ${res.problems.length} problems`);
  return {};
}
