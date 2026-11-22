// Boat deck – insides of the three deck houses (outer walls, windows, roofs and domes: exterior module).
// Forward house (x 28..73): navigating bridge, wheelhouse, chart room, captain's quarters, officers' quarters around the
// funnel-1 casing, Marconi wireless rooms, top landing of the forward Grand Staircase with the 1st-class entrances,
// gymnasium (starboard) and officers' mess (port). Middle house (x -16..18): aft Grand Staircase entrance, engineers'
// rooms, pantries, tank room and the service rooms above the lounge. Aft house (x -48..-38): 2nd-class entrance.
import { DECK_Y } from '../core/constants.js';
import { buildDeckShell, createDeckPlan } from '../interior/kit.js';
import { sidesBut } from './boat-util.js';
import {
  furnishBridge, furnishWheelhouse, furnishChartRoom, furnishCaptainSitting, furnishCaptainBed, furnishMarconi, furnishSilentRoom,
  furnishOperators, furnishGym, furnishLandingFwd, furnishVestibule, furnishMess, furnishLandingAft, furnishSecondEntrance,
  furnishSecondVestibule, furnishFanRoom, furnishTankRoom, furnishLiftMachinery, ceilingDetails,
} from './boat-hero.js';

const deck = 'boat';
// dome openings in the house roofs (exterior module) – the ceiling stays open there
const DOME_F = { x0: 39.2, x1: 44.8, z0: -3.2, z1: 3.2 }, DOME_A = { x0: -5.0, x1: 0.2, z0: -2.8, z1: 2.8 };

export async function build(world) {
  buildDeckShell(world, deck, { ceilingHoles: [DOME_F, DOME_A] });
  const plan = createDeckPlan(world, deck, { wall: 'whitePanel', floor: null });

  const OFF = { group: 'Offiziere & Brücke' };
  const room = (id, name, x0, x1, z0, z1, o = {}) => plan.room({ id: 'boat-' + id, name, x0, x1, z0, z1, ...o });
  const gang = (id, name, x0, x1, z0, z1, o = {}) => plan.corridor({ id: 'boat-' + id, name, x0, x1, z0, z1, ...o });
  const dP = (at, o = {}) => ({ side: 'port', at, ...o }), dS = (at, o = {}) => ({ side: 'stbd', at, ...o });
  const dA = (at, o = {}) => ({ side: 'aft', at, ...o }), dF = (at, o = {}) => ({ side: 'fwd', at, ...o });

  // ============================================================ forward house (x 28..73, inner faces x 28.15..72.85, |z| 7.35)
  const FA = 28.1, FF = 72.9;           // room limits at the house end walls (just inside the exterior walls)
  const C = 3, CO = 4.3, HH = 4.6;      // casing half width, outer edge of the side corridors, half width of the stair hall
  const XB = 66, XW = 61.4, XQ = 59.5;  // bridge aft wall, wheelhouse aft wall, aft edge of the cross corridor (= casing 1)
  const XH0 = 37.5, XH1 = 46.5;         // stair hall (= keep-out of grandFwd)

  room('bruecke', 'Kommandobrücke', XB, FF, -99, 99, {
    type: 'bridge', walls: ['aft'], wall: 'paintWhite', floor: 'deckWood', lamp: 'bulkhead', furnish: furnishBridge,
    teleport: { name: 'Brücke – Kommandostand', group: OFF.group, x: 68.3, z: 2.2, yaw: 0 },
    info: { title: 'Die Kommandobrücke', x: 70, z: 0, radius: 4.5, text: 'Von der offenen Navigationsbrücke aus wurde die Titanic geführt. Hier standen die Maschinentelegrafen, mit denen Befehle in den Maschinenraum übermittelt wurden, ein Kompass und die Telefone zum Krähennest. In der Nacht zum 15. April 1912 hatte Erster Offizier William Murdoch hier die Wache, als um 23:40 Uhr der Eisberg gemeldet wurde.' },
  });
  room('ruderhaus', 'Ruderhaus', XW, XB, -2.6, 2.6, {
    type: 'bridge', wall: 'oak', floor: 'deckWood', lamp: 'bulkhead', furnish: furnishWheelhouse, doors: [dF(-1.8), dA(-1.8)],
    teleport: { name: 'Steuerhaus (Ruderhaus)', group: OFF.group },
    info: { title: 'Das Ruderhaus', text: 'Im geschlossenen Ruderhaus stand das Hauptsteuerrad, das über einen hydraulischen Telemotor die Steuermaschine im Heck bediente. Quartermaster Robert Hichens stand hier am Ruder, als Murdoch „hart steuerbord“ befahl – nach damaliger Kommandosprache eine Drehung des Schiffes nach Backbord.' },
  });
  room('kartenraum', 'Kartenraum', XW, XB, -99, -2.6, {
    type: 'bridge', wall: 'oak', floor: 'linoCream', furnish: furnishChartRoom, doors: [dA(-3.45), dS(63.7), dF(-5.2)],
    teleport: { group: OFF.group },
  });
  room('kapitaen-salon', 'Wohnzimmer des Kapitäns', XW, XB, 2.6, 99, {
    type: 'officer', wall: { base: 'oakDado' }, floor: 'carpetRed', furnish: furnishCaptainSitting, doors: [dA(3.45), dF(5.3)],
    teleport: { name: 'Kapitänswohnung (Kapitän Smith)', group: OFF.group },
    info: { title: 'Kapitän Edward J. Smith', text: 'Die Wohnung des Kapitäns lag an Steuerbord direkt hinter dem Ruderhaus: Wohnzimmer, Schlafzimmer und ein eigenes Bad. Edward John Smith, 62 Jahre alt, war der ranghöchste Kapitän der White Star Line. Die Jungfernfahrt der Titanic sollte seine letzte Reise vor dem Ruhestand sein.' },
  });
  room('kapitaen-schlaf', 'Schlafzimmer des Kapitäns', 57.6, XW, CO, 99, { type: 'officer', wall: { base: 'oakDado' }, floor: 'carpetRed', furnish: furnishCaptainBed, doors: [dF(5.9)] });
  room('kapitaen-bad', 'Bad des Kapitäns', 55.6, 57.6, CO, 99, { type: 'bath', wall: 'tile', floor: 'tile', furnish: { preset: 'bathroom', wood: true }, doors: [dF(5.9)] });

  // officers' cabins (starboard: chief, first and second officer; port: third to sixth officer)
  const offCab = (id, name, x0, x1, port) => room(id, name, x0, x1, port ? -99 : CO, port ? -CO : 99, {
    type: 'officer', cls: 'crew', wall: 'whitePanel', floor: 'linoRed', furnish: { preset: 'cabinCrew', officer: true, single: true, berths: 2 },
    doors: [port ? dS(x0 + 0.65, { style: 'oak' }) : dP(x0 + 0.65, { style: 'oak' })],
  });
  offCab('wilde', 'Kabine Chief Officer Henry T. Wilde', 53.23, 55.6, false);
  offCab('murdoch', 'Kabine 1. Offizier William M. Murdoch', 50.87, 53.23, false);
  offCab('lightoller', 'Kabine 2. Offizier Charles H. Lightoller', 48.5, 50.87, false);
  room('offiziersbad', 'Bad und WC der Offiziere', XH1, 48.5, CO, 99, { type: 'bath', wall: 'tile', floor: 'tile', furnish: { preset: 'bathroom', wc: true }, doors: [dP(47.5)] });
  offCab('pitman', 'Kabine 3. Offizier Herbert J. Pitman', 57.83, XW, true);
  offCab('boxhall', 'Kabine 4. Offizier Joseph G. Boxhall', 54.27, 57.83, true);
  offCab('lowe', 'Kabine 5. Offizier Harold G. Lowe', 50.7, 54.27, true);
  offCab('moody', 'Kabine 6. Offizier James P. Moody', XH1, 49.3, true);
  gang('eingang-offiziere', 'Eingang Offiziersquartier (Backbord)', 49.3, 50.7, -99, -CO, { wall: 'whitePanel', floor: 'linoCream' });

  gang('gang-bb', 'Offiziersgang Backbord', XH1, XQ, -CO, -C, { floor: 'linoCream', teleport: { group: OFF.group } });
  gang('gang-stb', 'Offiziersgang Steuerbord', XH1, XQ, C, CO, { floor: 'linoCream', teleport: { group: OFF.group } });
  gang('quergang', 'Quergang vor dem Schornstein 1', XQ, XW, -CO, CO, { floor: 'linoCream', teleport: { name: 'Quergang Offiziersquartier', group: OFF.group } });

  // Marconi wireless rooms between the stair hall and the funnel-1 casing
  room('marconi', 'Funkraum (Marconi)', 49, 52.5, -C, C, {
    type: 'wireless', wall: 'whitePanel', floor: 'linoCream', lamp: 'bowl', furnish: furnishMarconi, doors: [dP(50)],
    teleport: { name: 'Funkraum (Marconi)', group: OFF.group, x: 50, z: -2.3, yaw: -Math.PI / 2 },
    info: { title: 'Der Marconi-Funkraum', text: 'Die Funker Jack Phillips und Harold Bride waren Angestellte der Marconi-Gesellschaft. Mit einem 5-kW-Funkensender, der über 500 Kilometer weit reichte, übermittelten sie Telegramme der Passagiere und Eiswarnungen anderer Schiffe. Nach der Kollision sandten sie die Notrufe CQD und SOS, bis um 2:17 Uhr der Strom ausfiel.' },
  });
  room('stillraum', 'Schalldämpfungsraum (Sender)', XH1, 49, -C, 0.2, {
    type: 'wireless', wall: 'paintWhite', floor: 'linoRed', lamp: 'bulkhead', furnish: furnishSilentRoom, doors: [dF(-1.4)],
    info: { title: 'Der „Silent Room“', text: 'Der laute Funkensender mit Umformer und Kondensatoren stand in einem schallgedämmten Nebenraum, damit die Funker im Hörraum die schwachen Signale im Kopfhörer verstehen konnten. Die Antenne war zwischen den beiden Masten gespannt.' },
  });
  room('funker', 'Schlafraum der Funker (Phillips & Bride)', XH1, 49, 0.2, C, { type: 'wireless', cls: 'crew', wall: 'whitePanel', floor: 'linoRed', furnish: furnishOperators, doors: [dF(1.6)] });

  // forward Grand Staircase – top landing under the glass dome, entrances port and starboard
  room('treppe-vorn', 'Große Treppe – Bootsdeck', XH0, XH1, -HH, HH, {
    type: 'lobby', cls: 'first', stairs: true, wall: { base: 'oakPanel', cornice: 'gold' }, floor: 'linoCream', lamp: false,
    furnish: furnishLandingFwd, doors: [dF(-3.65, { w: 1.1, leaf: false }), dF(3.65, { w: 1.1, leaf: false })],
    teleport: { name: 'Große Treppe – Bootsdeck', group: '1. Klasse', x: 45.6, z: -1.2, yaw: Math.PI },
    info: { title: 'Die Glaskuppel der Großen Treppe', x: 42, z: 3.4, radius: 4, text: 'Über dem obersten Treppenabsatz wölbte sich eine Kuppel aus schmiedeeisernem Gitterwerk und Milchglas, die tagsüber Licht bis tief in das Treppenhaus fallen ließ und abends von innen beleuchtet wurde. Die Treppe mit ihrer Eichenholzvertäfelung im Stil William and Mary war das berühmteste Ausstattungsmerkmal des Schiffes.' },
  });
  plan.opening(38.6, -HH, 45.4, -HH);
  plan.opening(38.6, HH, 45.4, HH);
  for (const s of [-1, 1]) {
    room(s < 0 ? 'eingang-bb' : 'eingang-stb', s < 0 ? 'Eingangshalle 1. Klasse (Backbord)' : 'Eingangshalle 1. Klasse (Steuerbord)', XH0, XH1, s < 0 ? -99 : HH, s < 0 ? -HH : 99, {
      type: 'lobby', cls: 'first', wall: { base: 'oakPanel', cornice: 'gold' }, floor: 'linoCream', lamp: 'bowl', furnish: furnishVestibule,
    });
  }

  // gymnasium (starboard) and officers' mess (port) beside the funnel-2 casing
  room('gym', 'Gymnastikraum', FA, XH0, C, 99, {
    type: 'gym', cls: 'first', walls: sidesBut('aft'), wall: { base: 'pine', cornice: 'oak', skirt: 'oak', lamp: 'bowl' }, floor: 'linoCream', lamp: 'bowl',
    furnish: furnishGym, doors: [dF(6.0, { style: 'oak' })],
    teleport: { name: 'Gymnastikraum', group: '1. Klasse', x: 34.0, z: 5.2, yaw: Math.PI },
    info: { title: 'Der Gymnastikraum', text: 'Der Gymnastikraum der Ersten Klasse lag an Steuerbord auf dem Bootsdeck. Unter Aufsicht des Sportlehrers Thomas W. McCawley konnten Passagiere auf elektrischen Pferden und einem elektrischen Kamel reiten, rudern, Rad fahren oder am Sandsack boxen. Eine große Anzeige zeigte die auf den Fahrrädern zurückgelegte Strecke, an der Wand hing eine Karte der White-Star-Routen. McCawley kam beim Untergang ums Leben.' },
  });
  room('offiziersmesse', 'Offiziersmesse', 31, XH0, -99, -C, {
    type: 'mess', cls: 'crew', wall: { base: 'oakDado' }, floor: 'linoCream', furnish: furnishMess, doors: [dF(-6.0)],
    teleport: { name: 'Offiziersmesse', group: OFF.group },
  });
  room('offiziers-anrichte', 'Anrichte der Offiziersmesse', FA, 31, -99, -C, { type: 'service', walls: sidesBut('aft'), wall: 'paintWhite', floor: 'tile', lamp: 'bulkhead', furnish: 'pantry', doors: [dF(-5.2)] });
  room('steward-vorrat', 'Vorratsraum der Stewards', FA, 30.5, -C, C, { type: 'service', walls: sidesBut('aft'), wall: 'paintWhite', floor: 'linoRed', lamp: 'bulkhead', furnish: 'store', doors: [dP(29.25)] });

  // ============================================================ middle house (x -16..18, inner faces -15.85..17.85, |z| 6.85)
  const MA = -15.9, MF = 17.9, XA0 = -6.5, XA1 = 2;
  room('treppe-achtern', 'Große Treppe (achtern) – Bootsdeck', XA0, XA1, -99, 99, {
    type: 'lobby', cls: 'first', stairs: true, wall: { base: 'oakPanel', cornice: 'gold' }, floor: 'linoCream', lamp: false, furnish: furnishLandingAft,
    teleport: { name: 'Große Treppe (achtern) – Bootsdeck', group: '1. Klasse', x: 1.2, z: -3.4, yaw: Math.PI },
    info: { title: 'Die hintere Große Treppe', x: -2.4, z: 3.2, radius: 3.5, text: 'Die hintere Große Treppe führte vom Bootsdeck hinunter bis zum C-Deck und erschloss Lounge, Rauchsalon und die achteren Erste-Klasse-Kabinen. Auch sie trug eine Glaskuppel. Beim Auseinanderbrechen des Schiffes riss die Bruchstelle in der Nähe dieses Treppenhauses auf.' },
  });
  room('ing-rauch', 'Rauchzimmer der Ingenieure', MA, XA0, C, 99, { type: 'mess', cls: 'crew', walls: sidesBut('aft'), wall: { base: 'oakDado' }, floor: 'linoRed', furnish: { preset: 'smoking', fireplace: false, cover: 'leather' }, doors: [dF(5.0)] });
  room('lager-achtern', 'Lagerraum (achtern)', MA, -13.5, -C, C, { type: 'service', walls: sidesBut('aft'), wall: 'paintWhite', floor: 'linoRed', lamp: 'bulkhead', furnish: 'store', doors: [dS(-14.75)] });
  room('deckspantry', 'Deckspantry', -11, XA0, -99, -C, { type: 'service', wall: 'paintWhite', floor: 'tile', lamp: 'bulkhead', furnish: 'pantry', doors: [dF(-5.0)] });
  room('tankraum', 'Tankraum (Frischwasser)', MA, -11, -99, -C, { type: 'service', walls: sidesBut('aft'), wall: 'steel', floor: 'steelFloor', lamp: 'bulkhead', furnish: furnishTankRoom, doors: [dF(-5.0, { style: 'steel' })] });
  room('ing-messe', 'Messe der Ingenieure', XA1, 8.5, 0, 99, {
    type: 'mess', cls: 'crew', wall: { base: 'oakDado' }, floor: 'linoCream', furnish: { preset: 'mess', set: true }, doors: [dA(4.5)],
    teleport: { group: 'Besatzung' },
    info: { title: 'Die Ingenieure der Titanic', text: 'Chefingenieur Joseph Bell und seine Ingenieure hatten ihre Messe in den Aufbauten des Bootsdecks. Alle 35 Ingenieure blieben nach der Kollision auf ihren Posten und hielten Pumpen und Generatoren in Gang, damit Licht und Funk bis kurz vor dem Untergang arbeiteten. Keiner von ihnen überlebte.' },
  });
  room('ing-anrichte', 'Anrichte der Ingenieursmesse', XA1, 8.5, -99, 0, { type: 'service', wall: 'paintWhite', floor: 'tile', lamp: 'bulkhead', furnish: 'pantry', doors: [dA(-4.5), dS(6.5)] });
  room('luefter', 'Lüfterraum über der Lounge', 8.5, MF, C, 99, { type: 'service', walls: sidesBut('fwd'), wall: 'steel', floor: 'steelFloor', lamp: 'bulkhead', furnish: furnishFanRoom, doors: [dA(5.0, { style: 'steel' })] });
  room('oberlicht', 'Wartungsraum Lounge-Oberlicht', 8.5, MF, -99, -C, { type: 'service', walls: sidesBut('fwd'), wall: 'paintWhite', floor: 'linoRed', lamp: 'bulkhead', furnish: { preset: 'store', shelves: 3 }, doors: [dA(-5.0)] });
  room('lager-vorn', 'Lagerraum (vorn)', 15.5, MF, -C, C, { type: 'service', walls: sidesBut('fwd'), wall: 'paintWhite', floor: 'linoRed', lamp: 'bulkhead', furnish: 'store', doors: [dS(16.75)] });

  // ============================================================ aft house (x -48..-38, inner faces -47.85..-38.15, |z| 4.85)
  const AA = -47.9, AF = -38.1, LZ = 2.2, XL = -41.5;
  room('eingang-2kl', 'Eingang 2. Klasse – Bootsdeck', AA, AF, -LZ, LZ, {
    type: 'lobby', cls: 'second', stairs: true, walls: ['port', 'stbd'], wall: 'oak', floor: 'linoBlue', lamp: false, furnish: furnishSecondEntrance,
    teleport: { name: 'Eingang 2. Klasse – Bootsdeck', group: '2. Klasse', x: -40.0, z: -2.6, yaw: Math.PI },
    info: { title: 'Bootsdeck der Zweiten Klasse', x: -43, z: 2.5, radius: 3.5, text: 'Das achtere Ende des Bootsdecks war der Promenadenbereich der Zweiten Klasse. Über diesen Eingang und das Treppenhaus der Zweiten Klasse gelangten die Passagiere in der Unglücksnacht zu den achteren Rettungsbooten – viele der hier ausgesetzten Boote waren nur halb besetzt.' },
  });
  plan.opening(AA, -LZ, XL, -LZ);
  plan.opening(AA, LZ, XL, LZ);
  for (const s of [-1, 1]) {
    room(s < 0 ? 'vorraum-2kl-bb' : 'vorraum-2kl-stb', s < 0 ? 'Vorraum 2. Klasse (Backbord)' : 'Vorraum 2. Klasse (Steuerbord)', AA, XL, s < 0 ? -99 : LZ, s < 0 ? -LZ : 99, {
      type: 'lobby', cls: 'second', walls: sidesBut('aft'), wall: 'oak', floor: 'linoBlue', lamp: 'dome', furnish: furnishSecondVestibule,
    });
  }
  room('aufzug-masch', 'Aufzugsmaschinenraum (2. Klasse)', XL, AF, -99, -LZ, { type: 'service', walls: sidesBut('fwd'), wall: 'steel', floor: 'steelFloor', lamp: 'bulkhead', furnish: furnishLiftMachinery, doors: [dA(-3.6, { style: 'steel' })] });
  room('geraeteraum', 'Lampen- und Geräteraum', XL, AF, LZ, 99, { type: 'service', walls: sidesBut('fwd'), wall: 'paintWhite', floor: 'linoRed', lamp: 'bulkhead', furnish: { preset: 'store', shelves: 3 }, doors: [dA(3.6)] });

  ceilingDetails(plan, { domeF: DOME_F, domeA: DOME_A });
  const res = plan.finish();
  if (res.problems.length) console.warn(`[boat] ${res.problems.length} kit problem(s)`);
  world.addInfo({
    title: 'Die Offiziere der Titanic', x: 54, y: DECK_Y.boat + 1.5, z: -3.6, radius: 3,
    text: 'Entlang des ersten Schornsteinschachts lagen die Kabinen der sieben Offiziere. Von ihnen überlebten nur vier: Lightoller, Pitman, Boxhall und Lowe. Charles Lightoller war der ranghöchste Überlebende und wichtigster Zeuge der Untersuchungen in den USA und in Großbritannien.',
  });
  return {};
}
