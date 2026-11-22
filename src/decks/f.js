// F deck ("Middle Deck") – complete layout, bow → stern.
// Bow: third-class single men. Forward of the boiler casings the first-class Swimming Bath (starboard) and the
// Turkish Baths, then the two third-class dining saloons around funnel casings 3 and 4, the third-class galley,
// the engineers' quarters around the engine casing with the access to the engine room, then second-class staterooms
// and finally third-class families aft. A working alleyway runs along the port side through all watertight bulkheads.
import { buildDeckShell, bulkhead, createDeckPlan, oven, butcherBlock, shelves, workbench, sink, bench } from '../interior/kit.js';
import { shortcuts, Instancer } from './f-util.js';
import {
  swimmingBath, bathVestibule, coolingRoom, hotRoom, steamRoom, shampooRoom, electricBath, bathEntrance, thirdDining, machineLobby,
} from './f-hero.js';

const deck = 'F';
const C0 = 4.4, C1 = 5.6, CC = 5.0;  // side corridors |z| 4.4..5.6
const BULKHEADS = {
  108: [0], 90: [0], 66: [-CC], 50: [-CC], 28: [-CC], 6: [-CC, [6.0, 1.6]], '-16': [-CC, [0, 1.4], CC], '-38': [-CC, 0, CC],
  '-58': [-CC, CC], '-80': [-CC, CC], '-100': [-CC, CC],
};

function bakery(ctx) {
  ctx.fit(oven({ w: 1.4 }), ['far:mid', 'left:hi']); ctx.fit(oven({ w: 1.2 }), ['far:lo', 'right:hi']);
  ctx.fit(workbench({ w: 1.8 }), ['left:mid', 'right:mid']); ctx.fit(butcherBlock(), ['right:lo', 'left:lo']);
  ctx.fit(shelves({ kind: 'stores', w: 1.5 }), ['near:hi', 'right:hi']); ctx.fit(sink({ w: 1.0 }), ['left:lo', 'near:hi']);
}
function washroom(ctx) {
  ctx.fit(sink({ w: 1.2 }), ['far:mid', 'left:hi']); ctx.fit(sink({ w: 1.2 }), ['far:lo', 'right:hi']);
  ctx.fit(bench({ w: 1.6, back: false, mat: 'pine' }), ['left:mid', 'right:mid'], { collide: false });
}

export async function build(world) {
  buildDeckShell(world, deck);
  const plan = createDeckPlan(world, deck, { wall: 'paintWhite' });
  const { room, gang, dP, dS, dA, dF, row, side } = shortcuts(plan, 'F');
  const inst = new Instancer(world, deck);
  const SVC = { type: 'service', wall: 'paintWhite', lamp: 'bulkhead' };
  const CREW = { type: 'crew', wall: 'paintWhite', lamp: 'bulkhead', group: 'Besatzung' };
  const WET = { type: 'bath', wall: 'tile', floor: 'tile' };
  const STEEL = { wall: 'steel', floor: 'steelFloor', lamp: 'bulkhead' };
  const T3 = { group: '3. Klasse' };

  // ============================================================== watertight bulkheads
  for (const [x, ds] of Object.entries(BULKHEADS)) {
    bulkhead(world, deck, Number(x), { thickness: 0.06, doors: ds.map((d) => (Array.isArray(d) ? { z: d[0], w: d[1] } : { z: d, w: 1.0 })) });
  }

  // ============================================================== x 108..120  bow
  gang('gang-bug', 'Gang im Vorschiff', 108, 117, -0.6, 0.6, { lamp: 'bulkhead' });
  row(108, 117, 0.6, 1, 'third', { pitch: 3 }); row(108, 117, 0.6, -1, 'third', { pitch: 3 });
  room('zimmerleute', 'Lagerraum der Zimmerleute', 117, 120, -99, 99, { preset: 'store', shelves: 3 }, [dA(0, { w: 1.0, style: 'steel' })], SVC);

  // ============================================================== x 90..108  stair 'thirdFwd'
  room('treppe-3v', 'Treppenhaus 3. Klasse (vorn)', 95, 104, -2.6, 2.6, 'empty', [dA(0, { w: 1.2, leaf: false }), dF(0, { w: 1.2, leaf: false })], {
    type: 'lobby', stairs: true, lamp: 'bulkhead', teleport: { name: 'Treppe 3. Klasse vorn – F-Deck', group: '3. Klasse' } });
  gang('gang-3v-a', 'Gang 3. Klasse (vor dem Treppenhaus)', 90, 95, -0.6, 0.6, { lamp: 'bulkhead' });
  gang('gang-3v-f', 'Gang 3. Klasse (Bug)', 104, 108, -0.6, 0.6, { lamp: 'bulkhead' });
  row(90, 95, 0.6, 1, 'third', { pitch: 2.5 }); row(90, 95, 0.6, -1, 'third', { pitch: 2.5 });
  row(95, 104, 2.6, 1, 'third', { pitch: 3 }); row(95, 104, 2.6, -1, 'third', { pitch: 3 });
  room('wc-3v', 'WC 3. Klasse (vorn)', 104, 108, -99, -0.6, 'wc', [dS(106)], { ...WET, wall: 'paintWhite', cls: 'third' });
  room('wasch-3v', 'Waschraum 3. Klasse (vorn)', 104, 108, 0.6, 99, washroom, [dP(106)], { ...WET, wall: 'paintWhite', cls: 'third' });

  // ============================================================== x 66..90  third class forward (single men), maze of corridors
  gang('gang-3c-bb', 'Gang 3. Klasse vorn (Backbord)', 66, 90, -C1, -C0, { handrail: true,
    teleport: { name: 'Kabinen 3. Klasse vorn (F-Deck)', group: '3. Klasse', x: 84, z: -CC, yaw: Math.PI },
    info: { title: 'Allein reisende Männer im Vorschiff', x: 80, z: -CC, radius: 6, text: 'Die White Star Line trennte die Dritte Klasse streng: Allein reisende Männer wohnten im Vorschiff, Frauen, Familien und Ehepaare im Heck. Die Kabinen für zwei bis sechs Personen lagen an einem Gewirr schmaler Gänge, in denen sich in der Unglücksnacht viele Passagiere verirrten. Wasser drang hier schon kurz nach der Kollision ein.' } });
  gang('gang-3c-stb', 'Gang 3. Klasse vorn (Steuerbord)', 66, 90, C0, C1, { handrail: true });
  gang('quer-3c-a', 'Quergang 3. Klasse (achtern)', 66, 67.2, -C0, C0, {});
  gang('quer-3c-m', 'Quergang 3. Klasse (Mitte)', 77.4, 78.6, -C0, C0, {});
  gang('quer-3c-f', 'Quergang 3. Klasse (vorn)', 88.8, 90, -C0, C0, {});
  side(66, 78, C1, 1, 'third'); side(78, 90, C1, 1, 'third'); side(66, 78, C1, -1, 'third'); side(78, 90, C1, -1, 'third');
  for (const [a, b] of [[67.2, 77.4], [78.6, 88.8]]) {
    row(a, b, 0, 1, 'third', { zOut: C0, flip: true, pitch: 2.5 });
    row(a, b, 0, -1, 'third', { zOut: C0, flip: true, pitch: 2.5 });
  }

  // ============================================================== x 50..66  Swimming Bath (funnel casing 1: 52.5..59.5)
  gang('gang-d', 'Arbeitsgang F-Deck (beim Schwimmbad)', 50, 66, -C1, -C0, { lamp: 'bulkhead' });
  gang('nische-d', 'Gang am Schornsteinschacht 1', 52.5, 59.5, -C0, -3, { lamp: 'bulkhead' });
  room('handtuch', 'Handtuch- und Wäscheausgabe (Schwimmbad)', 50, 52.5, -C0, 3, 'linen', [dP(51.25)], SVC);
  room('bad-vorraum', 'Vorraum des Schwimmbads', 59.5, 66, -C0, 3, bathVestibule, [dP(61.6, { style: 'mahogany' }), dS(64.2, { w: 1.2, style: 'mahogany' })], { ...WET, cls: 'first' });
  room('schwimmbad', 'Schwimmbad', 50, 66, 3, 99, swimmingBath, [], {
    ...WET, cls: 'first', lamp: 'bowl', teleport: { name: 'Schwimmbad', group: '1. Klasse' },
    info: { title: 'Das Schwimmbad', x: 58, z: 4.0, radius: 6, text: 'Die Titanic und ihr Schwesterschiff Olympic gehörten zu den ersten Schiffen mit einem Schwimmbad an Bord. Das gekachelte Becken war etwa 9 mal 4 Meter groß und wurde mit erwärmtem Meerwasser gefüllt. Die Benutzung kostete für Passagiere der Ersten Klasse einen Schilling; Damen und Herren badeten zu getrennten Zeiten. Am Rand lagen Umkleidekabinen und Duschen.' } });
  room('waeschelager', 'Wäschelager', 62, 66, -99, -C1, 'linen', [dS(64)], SVC);
  side(50, 62, C1, -1, 'third');

  // ============================================================== x 28..50  Turkish Baths (funnel casing 2: 30.5..37.5)
  gang('gang-e', 'Arbeitsgang F-Deck (Türkisches Bad)', 28, 50, -C1, -C0, { lamp: 'bulkhead',
    teleport: { name: 'Arbeitsgang F-Deck', group: 'Besatzung', x: 40, z: -CC, yaw: 0 } });
  gang('nische-e', 'Gang am Schornsteinschacht 2', 30.5, 37.5, -C0, -3, { lamp: 'bulkhead' });
  room('tb-waesche', 'Wäschekammer des Türkischen Bades', 28, 30.5, -C0, 3, 'linen', [dP(29.25)], SVC);
  room('tb-waerter', 'Raum der Badewärter', 37.5, 44, -C0, 3, { preset: 'cabinCrew', berths: 2, officer: true }, [dP(40.7)], CREW);
  const TB = { wall: 'tileBlue', floor: 'tile', cls: 'first', type: 'bath', group: '1. Klasse' };
  room('tb-eingang', 'Eingang des Türkischen Bades', 44, 50, -C0, 3, bathEntrance, [dP(47, { style: 'oak' }), dS(47, { w: 1.2, style: 'oak' })], { ...TB, wall: 'oakDado' });
  room('tb-kuehl', 'Türkisches Bad – Ruheraum', 37.5, 50, 3, 99, coolingRoom, [dA(7.65, { style: 'oak' })], {
    ...TB, lamp: false, teleport: { name: 'Türkisches Bad – Ruheraum', group: '1. Klasse' },
    info: { title: 'Türkisches Bad – der Ruheraum', x: 44, z: 7.5, radius: 6, text: 'Der Kühl- oder Ruheraum war der prächtigste Raum des Türkischen Bades: blaugrüne Fliesen, eine tiefrote Decke mit vergoldeten Balken, geschnitzte Teakholz-Gitter vor den Bullaugen und bronzene Lampen im orientalischen Stil. Nach dem Schwitzen ruhten die Gäste auf niedrigen Liegen und tranken Kaffee an kleinen Damaskus-Tischen. Ein Bad kostete vier Schilling oder einen Dollar.' } });
  gang('tb-gang', 'Gang der Baderäume', 28, 37.5, 7.0, 8.3, { wall: 'tileBlue', floor: 'tile', lamp: 'bowl' });
  room('tb-shampoo-1', 'Shampooing-Raum I', 28, 31.2, 3, 7.0, shampooRoom, [dS(29.6)], TB);
  room('tb-shampoo-2', 'Shampooing-Raum II', 31.2, 34.4, 3, 7.0, shampooRoom, [dS(32.8)], TB);
  room('tb-elektro', 'Elektrisches Bad', 34.4, 37.5, 3, 7.0, electricBath, [dS(36.0)], { ...TB,
    info: { title: 'Das Elektrische Bad', text: 'Neben dem Türkischen Bad bot die Titanic ein elektrisches Lichtbad – damals eine moderne Kur. Der Badegast saß in einem Holzkasten, aus dem nur der Kopf herausragte, und wurde von zahlreichen Glühlampen erwärmt. Die Anwendung sollte gegen Rheuma und Erschöpfung helfen.' } });
  room('tb-heiss', 'Heißluftraum', 28, 31.5, 8.3, 99, hotRoom, [dP(29.8)], { ...TB,
    info: { title: 'Heiß- und Warmluftraum', text: 'Das Türkische Bad funktionierte wie ein römisches Bad: Der Gast ging vom Warmluftraum in den noch heißeren Heißluftraum, dann ins Dampfbad und zum Shampooing, einer Massage mit Waschung. Danach kühlte er sich im Ruheraum ab. Die Räume wurden über Dampfleitungen aus den Kesseln beheizt.' } });
  room('tb-warm', 'Warmluftraum', 31.5, 34.5, 8.3, 99, hotRoom, [dP(33)], TB);
  room('tb-dampf', 'Dampfbad', 34.5, 37.5, 8.3, 99, steamRoom, [dP(36)], TB);
  side(28, 50, C1, -1, 'third');

  // ============================================================== x 6..28  forward third-class dining saloon (casing 3: 8.5..15.5)
  gang('gang-f', 'Arbeitsgang F-Deck (Speisesaal)', 6, 28, -C1, -C0, { lamp: 'bulkhead' });
  const DIN = { type: 'saloon', cls: 'third', casing: true, wall: 'paintWhite', floor: 'linoRed', lamp: 'bowl', lampPitch: 4.5, group: '3. Klasse' };
  room('speise-v', 'Speisesaal 3. Klasse (vorn)', 6, 28, -C0, 99, thirdDining(inst), [dP(17, { w: 1.6, leaf: false }), dP(25, { w: 1.2, leaf: false })], {
    ...DIN, teleport: { name: 'Speisesaal 3. Klasse (vorn)', group: '3. Klasse' } });
  room('kessel-nd', 'Niedergang Kesselraum', 18.5, 28, -99, -C1, machineLobby, [dS(27.3, { w: 1.0, style: 'steel' })], {
    ...STEEL, type: 'machinery', stairs: true, group: 'Maschinen', teleport: { name: 'Niedergang Kesselraum', group: 'Maschinen' },
    info: { title: 'Niedergang zu den Kesselräumen', text: 'Durch diesen stählernen Vorraum stiegen Heizer und Trimmer über eiserne Leitern zu den Kesselräumen hinab. In sechs Kesselräumen standen 29 Kessel mit 159 Feuerungen. Die Männer arbeiteten in Vier-Stunden-Wachen bei großer Hitze und im Kohlenstaub.' } });
  room('spuel', 'Geschirrspülküche 3. Klasse', 6, 12, -99, -C1, 'pantry', [dS(9)], { ...SVC, floor: 'tile' });
  room('anrichte-v', 'Anrichte 3. Klasse (vorn)', 12, 18.5, -99, -C1, 'pantry', [dS(15.25)], { ...SVC, floor: 'tile' });

  // ============================================================== x -16..6  aft third-class dining saloon (casing 4: -13.5..-6.5), full width
  room('speise-a', 'Speisesaal 3. Klasse (achtern)', -16, 6, -99, 99, thirdDining(inst, { pipes: [-8, -1.8, 4.2, 9.0] }),
    [dF(-CC, { w: 1.0, leaf: false }), dF(6.0, { w: 1.6, leaf: false }), dA(-CC, { w: 1.0, leaf: false }), dA(CC, { w: 1.0, leaf: false })], {
      ...DIN, teleport: { name: 'Speisesaal 3. Klasse', group: '3. Klasse', x: 5.2, z: 6.0, yaw: Math.PI },
      info: { title: 'Speisesaal der Dritten Klasse', x: -2, z: 4.5, radius: 9, text: 'Der Speisesaal der Dritten Klasse bestand aus zwei Räumen, die durch ein wasserdichtes Schott getrennt waren, und bot rund 470 Personen Platz. Wände und Decke waren weiß emailliert, Rohre und Spanten blieben sichtbar. Statt der damals üblichen Bänke gab es einzelne Stühle, und an den Wänden hingen Werbeplakate der White Star Line. Gegessen wurde in mehreren Schichten, drei Mahlzeiten am Tag waren im Fahrpreis enthalten.' } });

  // ============================================================== x -38..-16  galley, engineers (engine casing -36..-24)
  gang('gang-g-bb', 'Arbeitsgang F-Deck (Ingenieure)', -38, -16, -C1, -C0, { lamp: 'bulkhead',
    teleport: { name: 'Ingenieursunterkünfte', group: 'Besatzung', x: -30, z: -CC, yaw: Math.PI },
    info: { title: 'Unterkünfte der Ingenieure', x: -31, z: -CC, radius: 6, text: 'Rund um den Maschinenschacht lagen die Kabinen, die Messe und der Rauchsalon der Ingenieure – nah an den Niedergängen zu Maschinen und Kesseln. Die 25 Ingenieure unter Chefingenieur Joseph Bell und die Elektriker hielten in der Unglücksnacht Pumpen und Generatoren bis zuletzt in Betrieb. Keiner von ihnen überlebte.' } });
  gang('gang-g-stb', 'Gang Steuerbord (Ingenieure)', -38, -16, C0, C1, { lamp: 'bulkhead' });
  gang('nische-g-bb', 'Gang am Maschinenschacht (Backbord)', -36, -24, -C0, -3, { lamp: 'bulkhead' });
  gang('nische-g-stb', 'Gang am Maschinenschacht (Steuerbord)', -36, -24, 3, C0, { lamp: 'bulkhead' });
  gang('quer-ing', 'Quergang achtern des Maschinenschachts', -38, -36, -C0, C0, { lamp: 'bulkhead' });
  room('kombuese', 'Kombüse 3. Klasse', -24, -16, -C0, C0, { preset: 'galley', ranges: 3 }, [dF(0, { w: 1.4, leaf: false }), dP(-20, { style: 'steel' }), dS(-20, { style: 'steel' })], {
    ...SVC, floor: 'tile', teleport: { name: 'Kombüse 3. Klasse', group: '3. Klasse' },
    info: { title: 'Kombüse der Dritten Klasse', text: 'Die eigene Kombüse der Dritten Klasse lag direkt hinter dem achteren Speisesaal, an dessen Rückwand die Speisen ausgegeben wurden. Auf der Speisekarte standen Haferbrei, Suppe, Rindfleisch, Kartoffeln, Brot und Tee. Für viele Auswanderer war die Verpflegung an Bord besser als zu Hause.' } });
  room('rauch-ing', 'Rauchsalon der Ingenieure', -24, -16, -99, -C1, { preset: 'smoking', fireplace: false }, [dS(-20)], { ...CREW, wall: 'pine', floor: 'linoBlue' });
  side(-38, -24, C1, -1, 'crew', { cluster: 7, name: 'Kabine der Ingenieure', furnish: { preset: 'cabinCrew', berths: 2, officer: true }, wall: 'pine' });
  room('ing-chef', 'Kabine des Zweiten Ingenieurs', -38, -35, C1, 99, { preset: 'cabinCrew', berths: 1, single: true, officer: true }, [dP(-36.5)], { ...CREW, wall: 'pine' });
  room('maschinen-nd', 'Niedergang Maschinenraum', -35, -27, C1, 99, machineLobby, [dP(-28.0, { w: 1.0, style: 'steel' })], {
    ...STEEL, type: 'machinery', stairs: true, group: 'Maschinen', teleport: { name: 'Niedergang Maschinenraum', group: 'Maschinen' },
    info: { title: 'Niedergang zum Maschinenraum', text: 'Von hier führte ein steiler Niedergang in den Maschinenraum mit den beiden vierzylindrigen Dreifach-Expansionsmaschinen und der Niederdruckturbine. Zusammen leisteten sie rund 46 000 PS und trieben die drei Propeller an. Der Raum reichte vom Tank Top bis unter dieses Deck.' } });
  room('ing-messe', 'Messe der Assistenzingenieure', -27, -20, C1, 99, { preset: 'mess', set: true }, [dP(-23.5)], { ...CREW, wall: 'pine' });
  room('baeckerei', 'Bäckerei 3. Klasse', -20, -16, C1, 99, bakery, [dP(-18, { style: 'steel' })], { ...SVC, floor: 'tile' });

  // ============================================================== x -58..-38  second class, stair 'second'
  gang('gang-2-bb', 'Kabinengang 2. Klasse (Backbord)', -80, -38, -C1, -C0, { wall: 'whitePanel', handrail: true, floor: 'linoBlue', group: '2. Klasse' });
  gang('gang-2-stb', 'Kabinengang 2. Klasse (Steuerbord)', -80, -38, C0, C1, { wall: 'whitePanel', handrail: true, floor: 'linoBlue', group: '2. Klasse',
    teleport: { name: 'Kabinengang 2. Klasse (F-Deck)', group: '2. Klasse', x: -54, z: CC, yaw: Math.PI },
    info: { title: 'Kabinen der Zweiten Klasse auf dem F-Deck', x: -52, z: CC, radius: 6, text: 'Die Kabinen der Zweiten Klasse waren mit Mahagoni-Kojen, einem Sofa, einem klappbaren Waschtisch und Linoleumböden ausgestattet – vergleichbar mit der Ersten Klasse anderer Reedereien. Kurze Quergänge erschlossen die Kabinen an der Bordwand. Die Überfahrt kostete etwa 13 Pfund.' } });
  room('treppe-2', 'Treppenhaus 2. Klasse (F-Deck)', -48, -38, -C0, C0, 'empty', [dF(0, { w: 1.0, style: 'steel' })], {
    type: 'lobby', stairs: true, walls: ['fwd'], wall: 'oak', floor: 'linoBlue', lamp: 'bowl', cls: 'second',
    teleport: { name: 'Treppenhaus 2. Klasse – F-Deck', group: '2. Klasse' } });
  row(-58, -48, 0, 1, 'second', { zOut: C0, flip: true, pitch: 3.3 }); row(-58, -48, 0, -1, 'second', { zOut: C0, flip: true, pitch: 3.3 });
  side(-58, -38, C1, 1, 'second'); side(-58, -38, C1, -1, 'second');

  // ============================================================== x -80..-58  second class, stair 'secondAft'
  room('treppe-2a', 'Hinteres Treppenhaus 2. Klasse (F-Deck)', -68, -58, -C0, C0, 'empty', [], {
    type: 'lobby', stairs: true, walls: 'none', wall: 'oak', floor: 'linoBlue', lamp: 'bowl', cls: 'second',
    teleport: { name: 'Hinteres Treppenhaus 2. Klasse – F-Deck', group: '2. Klasse', x: -59.6, z: 2.6, yaw: Math.PI } });
  row(-80, -68, 0, 1, 'second', { zOut: C0, flip: true, pitch: 3 }); row(-80, -68, 0, -1, 'second', { zOut: C0, flip: true, pitch: 3 });
  side(-80, -58, C1, 1, 'second'); side(-80, -58, C1, -1, 'second');

  // ============================================================== x -100..-80  second / third class, baths
  gang('gang-3a-bb', 'Kabinengang 3. Klasse achtern (Backbord)', -120, -80, -C1, -C0, { handrail: true, group: '3. Klasse',
    teleport: { name: 'Kabinengang 3. Klasse achtern (F-Deck)', group: '3. Klasse', x: -96, z: -CC, yaw: 0 },
    info: { title: 'Familien der Dritten Klasse im Heck', x: -104, z: -CC, radius: 6, text: 'Im Heck wohnten die Familien, Ehepaare und allein reisenden Frauen der Dritten Klasse. Die meisten waren Auswanderer aus Skandinavien, Irland, dem Nahen Osten und Osteuropa auf dem Weg nach Amerika. Von den 709 Passagieren der Dritten Klasse überlebte nur etwa ein Viertel.' } });
  gang('gang-3a-stb', 'Kabinengang 3. Klasse achtern (Steuerbord)', -120, -80, C0, C1, { handrail: true, group: '3. Klasse' });
  room('wc-2-h', 'WC 2. Klasse (Herren)', -84, -80, 0, C0, 'wc', [dS(-82)], { ...WET, cls: 'second' });
  room('bad-2-h', 'Bad 2. Klasse (Herren)', -88, -84, 0, C0, { preset: 'bathroom', shower: true }, [dS(-86)], { ...WET, cls: 'second' });
  room('wc-2-d', 'WC 2. Klasse (Damen)', -84, -80, -C0, 0, 'wc', [dP(-82)], { ...WET, cls: 'second' });
  room('bad-2-d', 'Bad 2. Klasse (Damen)', -88, -84, -C0, 0, 'bathroom', [dP(-86)], { ...WET, cls: 'second' });
  row(-100, -88, 0, 1, 'third', { zOut: C0, flip: true, pitch: 3 }); row(-100, -88, 0, -1, 'third', { zOut: C0, flip: true, pitch: 3 });
  side(-90, -80, C1, 1, 'second'); side(-90, -80, C1, -1, 'second');
  side(-100, -90, C1, 1, 'third'); side(-100, -90, C1, -1, 'third');

  // ============================================================== x -120..-100  third class aft, stair 'thirdAft'
  room('treppe-3a', 'Treppenhaus 3. Klasse (achtern)', -116, -107, -C0, C0, 'empty', [], {
    type: 'lobby', stairs: true, walls: 'none', lamp: 'bulkhead', teleport: { name: 'Treppe 3. Klasse achtern – F-Deck', group: '3. Klasse', x: -107.6, z: 2.4, yaw: Math.PI } });
  row(-107, -100, 0, 1, 'third', { zOut: C0, flip: true, pitch: 3.5 }); row(-107, -100, 0, -1, 'third', { zOut: C0, flip: true, pitch: 3.5 });
  room('wasch-3a', 'Waschraum 3. Klasse (achtern)', -120, -116, 0, C0, washroom, [dS(-118)], { ...WET, wall: 'paintWhite', cls: 'third' });
  room('wc-3a', 'WC 3. Klasse (achtern)', -120, -116, -C0, 0, 'wc', [dP(-118)], { ...WET, wall: 'paintWhite', cls: 'third' });
  side(-110, -100, C1, 1, 'third'); side(-110, -100, C1, -1, 'third');
  side(-120, -110, C1, 1, 'third'); side(-120, -110, C1, -1, 'third');

  world.addInfo({ title: 'Wasserdichte Schotten auf dem F-Deck', x: 66.6, y: plan.y + 1.5, z: -CC, radius: 3, text: 'Fünfzehn Querschotten teilten den Rumpf der Titanic in sechzehn wasserdichte Abteilungen. Auf dem F-Deck besaßen sie Schiebetüren, die von Hand oder von oben geschlossen werden konnten. Da die Schotten aber nur bis zum E- oder D-Deck reichten, lief das Wasser nach der Kollision von Abteilung zu Abteilung über.' });

  const res = plan.finish();
  inst.flush();
  console.info(`[F] ${res.rooms.length} rooms, ${res.walls} wall pieces, ${res.doors} doors, ${inst.n} instanced chairs, ${res.problems.length} problems`);
  return {};
}
