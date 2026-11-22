// C deck ("Shelter Deck") – complete layout, bow → stern.
// Three interior segments: under the forecastle (x 94..133, crew + 3rd class entrance), the main segment (x −90..78:
// first-class staterooms C1–C120 with the two Grand Staircase halls, Purser's Office, barber shop, suites; aft of them the
// second-class library with its enclosed promenades and second-class staterooms) and under the poop (x −134..−106: 3rd
// class general room and smoking room, steering gear). The well-deck bulkheads (x 78, 94, −90, −106) with their doors
// belong to the exterior module; rooms touching them leave that wall out.
import { DECK_Y } from '../core/constants.js';
import { buildDeckShell, createDeckPlan, basinSmall, bench, showerBath, locker, bunkCrew, workbench, shelves, tableRect, chairDining, pottedPalm, sofa, armchair, tableRound, desk, safe, bookcase, PRESETS } from '../interior/kit.js';
import {
  bay, poster, grandLobby, aftLobby, purserOffice, enquiryOffice, suiteSitting, barberShop, library, promenade,
  thirdSaloon, barPantry, steeringGear, windlassRoom, carpenter,
} from './c-hero.js';

const deck = 'C';
// first-class corridors (wall centre lines, |z|)
const CZ0 = 7.0, CZ1 = 8.8, CZC = (CZ0 + CZ1) / 2;
const CH = 3;                     // casing half width
// second-class aft area
const SZ0 = 8.0, SZ1 = 9.2, SZC = (SZ0 + SZ1) / 2, SIN = 4.2;
const WZ = 10.2;                  // library window wall / inner wall of the enclosed promenades

function washroom(ctx) {
  const n = Math.max(1, Math.floor((ctx.W - 0.3) / 0.75));
  for (let i = 0; i < n; i++) ctx.put(basinSmall(), ((i + 0.5) * ctx.W) / n, ctx.D - 0.22, 'out', { collide: false });
  ctx.fit(showerBath(), ['left:hi', 'right:hi', 'left:lo']);
  ctx.fit(bench({ w: 1.4, back: false }), ['right:lo', 'left:lo'], { collide: false });
}
function lampRoom(ctx) {
  ctx.fit(workbench({ w: Math.min(1.8, ctx.W - 1.4) }), ['far:mid', 'far:lo', 'right:hi']);
  ctx.fit(shelves({ kind: 'bottles', w: 1.4 }), ['right:hi', 'left:hi', 'far:hi']);
  ctx.fit(shelves({ kind: 'stores', w: 1.4 }), ['left:hi', 'right:mid', 'far:hi']);
  ctx.fit(locker({ n: 2 }), ['left:lo', 'right:lo']);
}
function maidsSaloon(ctx) {
  ctx.fit(sofa({ mat: 'fabricBlue', w: 1.8 }), ['far:mid']);
  ctx.put(tableRect({ w: 1.6, d: 0.9, mat: 'mahogany' }), ctx.W / 2, ctx.D / 2, 'in');
  for (const [du, dv, dir] of [[-0.6, -0.7, 'in'], [0.6, -0.7, 'in'], [-0.6, 0.7, 'out'], [0.6, 0.7, 'out']]) ctx.put(chairDining({ cls: 'second', mat: 'mahogany' }), ctx.W / 2 + du, ctx.D / 2 + dv, dir, { collide: false });
  ctx.fit(tableRound({ r: 0.4, mat: 'mahogany' }), ['far:lo']);
  ctx.fit(armchair({ kind: 'uph', mat: 'fabricBlue' }), ['far:hi', 'right:hi']);
  ctx.fit(bookcase({ w: 1.2, mat: 'mahogany' }), ['right:mid', 'left:mid']);
  ctx.fit(pottedPalm(), ['near:hi'], { collide: false });
}
function surgery(ctx) {
  ctx.fit(bunkCrew({ tiers: 1, cover: 'linen' }), ['far:mid', 'left:hi']);
  ctx.fit(tableRect({ w: 1.2, d: 0.7, mat: 'paintWhite' }), ['right:hi', 'left:hi']);
  ctx.fit(shelves({ kind: 'bottles', w: 1.2, mat: 'paintWhite' }), ['right:mid', 'left:mid', 'far:hi']);
  ctx.fit(basinSmall(), ['near:hi', 'right:lo'], { collide: false });
}
function consulting(ctx) {
  if (ctx.put(desk({ w: 1.3, mat: 'oak' }), ctx.W / 2, ctx.D - 1.1, 'out')) ctx.put(chairDining({ cls: 'plain' }), ctx.W / 2, ctx.D - 0.45, 'out', { collide: false });
  ctx.put(chairDining({ cls: 'first' }), ctx.W / 2, ctx.D - 1.9, 'in', { collide: false });
  ctx.fit(bookcase({ w: 1.2, mat: 'oak' }), ['right:hi', 'left:hi']);
  ctx.fit(safe(), ['left:mid', 'right:mid']);
  ctx.fit(sofa({ mat: 'leather', w: 1.6 }), ['left:hi', 'right:lo']);
}

export async function build(world) {
  const Y = DECK_Y[deck];
  buildDeckShell(world, deck, { floors: [{ x0: 94, x1: 133, mat: 'linoRed' }, { x0: -134, x1: -106, mat: 'linoRed' }] });
  const plan = createDeckPlan(world, deck, { wall: 'whitePanel' });

  const CREW = { type: 'crew', wall: 'paintWhite', lamp: 'bulkhead', group: 'Besatzung', floor: 'linoRed' };
  const SVC = { type: 'service', wall: 'paintWhite', lamp: 'bulkhead' };
  const WET = { type: 'bath', wall: 'tile', floor: 'tile' };
  const room = (id, name, x0, x1, z0, z1, furnish, doors, o = {}) => plan.room({ id: 'C-' + id, name, x0, x1, z0, z1, furnish, doors, ...o });
  const gang = (id, name, x0, x1, z0, z1, o = {}) => plan.corridor({ id: 'C-' + id, name, x0, x1, z0, z1, ...o });
  const dP = (at, o = {}) => ({ side: 'port', at, ...o }), dS = (at, o = {}) => ({ side: 'stbd', at, ...o });
  const dA = (at, o = {}) => ({ side: 'aft', at, ...o }), dF = (at, o = {}) => ({ side: 'fwd', at, ...o });
  const tp = (name, group, x, z, yaw) => world.addTeleport({ name, deck, x, z, yaw, group });
  const info = (title, x, z, text, radius = 4.5) => world.addInfo({ title, x, y: Y + 1.5, z, radius, text });

  // first-class numbering bow → stern: port odd, starboard even (rows are built with rising x → numbered downwards)
  const ctr = { p: 1, s: 2, p2: 151, s2: 152 };
  const row = (key, spec) => {
    const start = ctr[key] + (spec.count - 1) * 2;
    ctr[key] += spec.count * 2;
    return plan.cabinRow({ ...spec, numbering: { deckLetter: 'C', start, step: -2 } });
  };
  const F1 = { type: 'first' }, S2 = { type: 'second' };
  const DAMASK = ['damaskGreen', 'damaskBlue', 'damaskRed', 'whiteGold', 'whitePanel'];
  let dk = 0;
  const f1 = () => ({ ...F1, wall: DAMASK[dk++ % DAMASK.length] });
  // outside cabins (hull side) and inside cabins (towards the centre line), port + starboard
  const outside = (x0, x1, count, sides = 'ps') => {
    if (sides.includes('p')) row('p', { x0, x1, z0: -99, z1: -CZ1, count, corridorSide: 'stbd', ...f1() });
    if (sides.includes('s')) row('s', { x0, x1, z0: CZ1, z1: 99, count, corridorSide: 'port', ...f1() });
  };
  const inside = (x0, x1, count) => {
    row('p', { x0, x1, z0: -CZ0, z1: -CH, count, corridorSide: 'port', ...F1 });
    row('s', { x0, x1, z0: CH, z1: CZ0, count, corridorSide: 'stbd', ...F1 });
  };
  const alley = (id, x0, x1) => gang(id, 'Quergang 1. Klasse', x0, x1, -CZ0, CZ0, { floor: 'linoCream' });

  // ====================================================================================================== FORECASTLE x 94..133
  const LF = { x0: 94, x1: 106, z: 5.2 };
  room('eingang-3v', 'Eingangshalle 3. Klasse (vorn)', LF.x0, LF.x1, -LF.z, LF.z, 'empty', [], {
    type: 'lobby', cls: 'third', stairs: true, walls: 'none', wall: 'paintWhite', floor: 'linoRed', lamp: 'bulkhead',
    info: { title: 'Eingang der 3. Klasse unter der Back', x: 95.2, z: -3.2, radius: 4, text: 'Durch die Türen im Schott zum vorderen Brunnendeck gelangten die Passagiere der Dritten Klasse in diese Halle unter der Back. Von hier führte die vordere Treppe der Dritten Klasse hinunter zu den Kabinen der allein reisenden Männer auf den Decks D bis G. Das offene Brunnendeck davor diente ihnen tagsüber als Promenade.' } });
  tp('Eingangshalle 3. Klasse (vorn)', '3. Klasse', 95.3, -3.4, 0);
  room('zimmermann', 'Werkstatt des Zimmermanns', 94, 100, -99, -LF.z, carpenter, [dS(97.5, { style: 'steel' })], { ...SVC, walls: ['fwd', 'stbd', 'port'] });
  room('wasch-crew-v', 'Waschraum und WC der Decksmannschaft', 100, 106, -99, -LF.z, washroom, [dS(103.2)], { ...CREW, floor: 'tile' });
  room('crew-kombuese', 'Mannschaftsküche', 94, 100, LF.z, 99, { preset: 'galley', ranges: 1 }, [dP(97.5, { style: 'steel' })], { ...SVC, floor: 'tile', walls: ['fwd', 'port', 'stbd'],
    });
  room('lampen', 'Lampenraum und Bootsmannsstore', 100, 106, LF.z, 99, lampRoom, [dP(103.2, { style: 'steel' })], SVC);
  gang('gang-back', 'Gang unter der Back', 106, 112, -0.7, 0.7, { lamp: 'bulkhead', wall: 'paintWhite' });
  room('messe-matrosen', 'Mannschaftsmesse (Matrosen)', 106, 112, -99, -0.7, { preset: 'mess', set: true }, [dS(109)], { ...CREW, wall: 'pine',
    teleport: { name: 'Mannschaftsmesse', group: 'Besatzung' },
    info: { title: 'Mannschaftsmessen unter der Back', text: 'Unter der Back lagen die Messen der Decksmannschaft und der Heizer. Die Männer aßen an langen Tischen mit festen Bänken; das Essen kam aus der benachbarten Mannschaftsküche. Für die rund 900 Besatzungsmitglieder gab es keinen gemeinsamen Speisesaal – jede Abteilung hatte ihre eigene Messe.' } });
  room('messe-heizer', 'Heizermesse', 106, 112, 0.7, 99, { preset: 'mess' }, [dP(109)], { ...CREW, wall: 'pine' });
  const WL = { x0: 112, x1: 119 };
  room('ankerspill', 'Ankerspill-Maschinenraum', WL.x0, WL.x1, -99, 99, () => windlassRoom(plan, WL), [dA(0, { w: 0.9, style: 'steel' }), dF(0, { w: 0.9, style: 'steel' })], {
    ...SVC, wall: 'steel', floor: 'steelFloor', teleport: { name: 'Ankerspill-Maschinenraum', group: 'Besatzung', x: WL.x0 + 1.0, z: 0, yaw: 0 },
    info: { title: 'Ankerspillmaschinen', x: WL.x0 + 1.2, z: 0, text: 'Zwei Dampfmaschinen trieben über senkrechte Wellen die Ankerspille und Spillköpfe auf dem Vordeck darüber an. Durch die Kettenrohre lief die Ankerkette hinunter in den Kettenkasten. Allein die beiden Buganker wogen je etwa acht Tonnen, der Mittelanker auf der Back sogar rund 15,8 Tonnen.' } });
  gang('gang-bug', 'Gang zu den Bugstores', 119, 124, -0.6, 0.6, { lamp: 'bulkhead', wall: 'paintWhite' });
  room('farben', 'Farbenlast', 119, 124, -99, -0.6, 'store', [dS(121.5, { style: 'steel' })], SVC);
  room('tauwerk', 'Tauwerklast', 119, 124, 0.6, 99, { preset: 'store', shelves: 2 }, [dP(121.5, { style: 'steel' })], SVC);
  room('bugstore', 'Bootsmannsstore im Bug', 124, 133, -99, 99, 'store', [dA(0, { w: 0.9, style: 'steel' })], { ...SVC, walls: ['aft'] });

  // ====================================================================================================== MAIN SEGMENT x −90..78
  // ---------------------------------------------------------------- forward end x 62..78
  gang('quer-vorn', 'Quergang am vorderen Brunnendeck', 76.2, 78, -CZ1, CZ1, { floor: 'linoCream', wall: 'whitePanel' });
  tp('Eingang vom vorderen Brunnendeck', '1. Klasse', 76.9, 3.8, Math.PI);
  for (const s of [-1, 1]) {
    gang(s < 0 ? 'gang-bb-v' : 'gang-stb-v', s < 0 ? 'Kabinengang Backbord (vorn)' : 'Kabinengang Steuerbord (vorn)', 48, 76.2, s < 0 ? -CZ1 : CZ0, s < 0 ? -CZ0 : CZ1, { handrail: true, floor: 'linoCream', group: '1. Klasse' });
    room(s < 0 ? 'post-v' : 'stewards-v', s < 0 ? 'Kabine der Postbeamten' : 'Kabine der Kabinenstewards', 74.4, 78, s < 0 ? -99 : CZ1, s < 0 ? -CZ1 : 99,
      { preset: 'cabinCrew', berths: s < 0 ? 2 : 4, officer: s < 0 }, [{ side: s < 0 ? 'stbd' : 'port', at: 75.4, style: 'pine' }], { ...CREW, walls: s < 0 ? ['aft', 'stbd'] : ['aft', 'port'] });
  }
  tp('Kabinengang 1. Klasse (vorn)', '1. Klasse', 72, CZC, Math.PI);
  outside(62, 74.4, 3);
  inside(59.5, 66.2, 2);
  plan.cabinRow({ x0: 66.2, x1: 76.2, z0: -CZ0, z1: -CH, count: 3, corridorSide: 'port', type: 'crew', name: 'Kabine der Postbeamten', idPrefix: 'C-post-', furnish: { preset: 'cabinCrew', berths: 2, officer: true }, door: 'pine', lamp: 'bulkhead' });
  plan.cabinRow({ x0: 66.2, x1: 76.2, z0: CH, z1: CZ0, count: 3, corridorSide: 'stbd', type: 'crew', name: 'Kabine der Stewards', idPrefix: 'C-steward-', furnish: { preset: 'cabinCrew', berths: 4 }, door: 'pine', lamp: 'bulkhead' });
  gang('stich-vorn', 'Stichgang zum Gepäckraum', 68, 76.2, -0.7, 0.7, { wall: 'paintWhite', lamp: 'bulkhead' });
  room('gepaeck-1', 'Gepäckraum 1. Klasse (Kabinengepäck)', 59.5, 68, -CH, CH, 'hold', [dF(0, { w: 1.0, style: 'steel' })], { ...SVC, walls: ['fwd', 'port', 'stbd'] });
  room('waesche-v', 'Wäschekammer (vorn)', 68, 76.2, -CH, -0.7, 'linen', [dS(72.2)], SVC);
  room('pantry-v', 'Stewardpantry 1. Klasse (vorn)', 68, 76.2, 0.7, CH, 'pantry', [dP(72.2)], { ...SVC, floor: 'tile' });

  // ---------------------------------------------------------------- x 48..62  (funnel casing 1: 52.5..59.5)
  outside(48, 62, 4);
  alley('quer-e', 48, 49.2);
  inside(49.2, 59.5, 3);
  room('bad-1v', 'Bad 1. Klasse', 49.2, 52.5, -CH, 0, { preset: 'bathroom', shower: true }, [dA(-1.5)], { ...WET, cls: 'first', walls: ['aft', 'port', 'stbd'] });
  room('wc-1v', 'WC 1. Klasse', 49.2, 52.5, 0, CH, 'wc', [dA(1.5)], { ...WET, cls: 'first', walls: ['aft', 'port', 'stbd'] });

  // ---------------------------------------------------------------- x 37.5..48  forward Grand Staircase
  const GL = { x0: 37.5, x1: 48 };
  room('grosse-treppe', 'Halle der Großen Treppe (C-Deck)', GL.x0, GL.x1, -CZ1, CZ1, () => grandLobby(plan, GL), [], {
    type: 'lobby', cls: 'first', stairs: true, walls: 'none', wall: 'oakPanel', floor: 'linoCream', lamp: 'bowl',
    info: { title: 'Große Treppe auf dem C-Deck', x: 38.4, z: 4.0, radius: 5, text: 'Auf dem C-Deck öffnete sich die vordere Große Treppe zu einer weiten Halle mit Eichentäfelung und einem Boden aus cremefarbenen und roten Linoleumfliesen. Hier lagen das Zahlmeisterbüro und das Auskunftsbüro, die erste Anlaufstelle der Passagiere nach dem Einschiffen. Vor der Treppe fuhren drei elektrische Aufzüge zwischen dem E- und dem A-Deck.' } });
  plan.wall(GL.x1, -CZ0, GL.x1, CZ0, { wall: 'oakPanel' });
  tp('Große Treppe – C-Deck', '1. Klasse', 38.5, 4.6, 0);
  row('p', { x0: GL.x0, x1: GL.x1, z0: -99, z1: -CZ1, count: 3, corridorSide: 'stbd', ...F1, wall: 'damaskGold' });
  room('zahlmeister', 'Zahlmeisterbüro', GL.x0, 42.5, CZ1, 99, purserOffice, [dP(40.2, { style: 'oak' })], {
    type: 'office', cls: 'first', wall: 'oakDado', floor: 'carpetGreen', teleport: { name: 'Zahlmeisterbüro', group: '1. Klasse' },
    info: { title: 'Zahlmeisterbüro', text: 'Zahlmeister Hugh McElroy und seine Gehilfen verwahrten im Tresor dieses Büros Geld, Schmuck und Wertpapiere der Passagiere, gaben Wertmarken aus und wechselten Devisen. Hier gaben die Passagiere auch ihre Marconi-Telegramme auf. In der Unglücksnacht drängten sich Passagiere vor dem Schalter, um ihre Wertsachen zurückzufordern.' } });
  room('auskunft', 'Auskunftsbüro', 42.5, GL.x1, CZ1, 99, enquiryOffice, [dP(47.3, { style: 'oak' })], { type: 'office', cls: 'first', wall: 'oakDado', floor: 'carpetGreen' });
  bay(plan, 43.0, 46.6, CZ1, { sill: 1.05, head: 2.1, neg: 'oakPanel', pos: 'oakPanel', frame: 'mahogany', grille: true, shelf: 0.12 });

  // ---------------------------------------------------------------- x 2..37.5  (funnel casings 2: 30.5..37.5, 3: 8.5..15.5)
  for (const s of [-1, 1]) gang(s < 0 ? 'gang-bb-m' : 'gang-stb-m', s < 0 ? 'Kabinengang Backbord (mittschiffs)' : 'Kabinengang Steuerbord (mittschiffs)', 2, GL.x0, s < 0 ? -CZ1 : CZ0, s < 0 ? -CZ0 : CZ1, { handrail: true, floor: 'linoCream', group: '1. Klasse' });
  tp('Kabinengang 1. Klasse (mittschiffs)', '1. Klasse', 26, -CZC, Math.PI);
  outside(30, 37.5, 2);
  inside(30.5, 37.5, 2);
  alley('quer-d2', 29.3, 30.5);
  inside(16.7, 29.3, 4);
  // the two parlour suites: sitting room, bedroom, private bath
  ctr.p = 55; ctr.s = 62;
  const suite = (s) => {
    const z0 = s < 0 ? -99 : CZ1, z1 = s < 0 ? -CZ1 : 99, corr = s < 0 ? 'stbd' : 'port', n1 = s < 0 ? 55 : 62, n2 = n1 + 2, zc = s * 11.2;
    room(String(n1), `Suite C ${n1}–${n2} – Salon`, 24, 28, z0, z1, suiteSitting, [{ side: corr, at: 26.6, label: 'C' + n1, style: 'mahogany' }], {
      id: 'C' + n1, type: 'cabin', cls: 'first', wall: s < 0 ? 'damaskRed' : 'damaskGold', floor: 'carpetRed', lamp: 'chandelier' });
    room(String(n2), `Suite C ${n1}–${n2} – Schlafzimmer`, 20, 24, z0, z1, { preset: 'cabinFirstSuite', fireplace: false }, [{ side: corr, at: 22.6, label: 'C' + n2, style: 'mahogany' }, dF(zc)], {
      id: 'C' + n2, type: 'cabin', cls: 'first', wall: s < 0 ? 'damaskRed' : 'damaskGold', floor: 'carpetRed', lamp: 'bowl' });
    room('bad-' + n1, `Suite C ${n1}–${n2} – Bad`, 28, 30, z0, z1, { preset: 'bathroom', wc: true }, [dA(zc)], { ...WET, cls: 'first' });
  };
  suite(-1); suite(1);
  plan.rooms.find((r) => r.id === 'C55').teleport = { name: 'Suite C 55–57 (Straus)', group: '1. Klasse' };
  plan.rooms.find((r) => r.id === 'C55').info = { title: 'Suite C 55–57: Isidor und Ida Straus', text: 'In dieser Suite aus Salon, Schlafzimmer und Bad reisten Isidor Straus, Mitinhaber des New Yorker Kaufhauses Macy’s, und seine Frau Ida. Als ihr ein Platz im Rettungsboot angeboten wurde, weigerte sich Ida, ihren Mann zu verlassen: Sie hätten ihr Leben lang zusammengelebt und würden auch zusammen sterben. Beide kamen beim Untergang ums Leben.' };
  plan.rooms.find((r) => r.id === 'C62').info = { title: 'Suite C 62–64: John Jacob Astor', text: 'Die Suite an der Steuerbordseite bewohnten der Multimillionär John Jacob Astor IV., der reichste Mann an Bord, und seine junge, schwangere Frau Madeleine. Astor half ihr in Rettungsboot 4 und blieb selbst zurück, weil nur Frauen und Kinder einsteigen durften. Madeleine überlebte; Astors Leichnam wurde Tage später geborgen.' };
  ctr.p = 59; ctr.s = 66;
  outside(2, 20, 5);
  alley('quer-d1', 15.5, 16.7);
  inside(2, 15.5, 4);
  room('zofen', 'Aufenthaltsraum der Zofen und Diener', 16.7, 23.6, -CH, CH, maidsSaloon, [dA(0)], {
    type: 'public', cls: 'first', wall: 'whiteDado', floor: 'linoCream', teleport: { name: 'Salon der Zofen und Diener', group: '1. Klasse' } });
  room('arzt-behandlung', 'Behandlungsraum des Schiffsarztes', 23.6, 29.3, -CH, 0, surgery, [dF(-1.5)], { type: 'service', cls: 'first', wall: 'paintWhite', floor: 'tile' });
  room('arzt', 'Sprechzimmer des Schiffsarztes', 23.6, 29.3, 0, CH, consulting, [dF(1.5, { style: 'oak' })], {
    type: 'office', cls: 'first', wall: 'oakDado', floor: 'carpetGreen', teleport: { name: 'Schiffsarzt', group: '1. Klasse' },
    info: { title: 'Der Schiffsarzt', text: 'Chefarzt William O’Loughlin, seit über 40 Jahren im Dienst der White Star Line, und sein Assistent John Edward Simpson behandelten die Passagiere der Ersten Klasse in diesem Sprechzimmer; das Hospital lag ein Deck tiefer. Beide Ärzte blieben in der Unglücksnacht an Bord und kamen ums Leben.' } });
  room('deckpantry', 'Deckpantry', 2, 8.5, -CH, 0, 'pantry', [dA(-1.5)], { ...SVC, floor: 'tile', walls: ['aft', 'port', 'stbd'] });
  room('friseur', 'Friseursalon 1. Klasse', 2, 8.5, 0, CH, barberShop, [dA(1.5, { style: 'mahogany' })], {
    type: 'public', cls: 'first', wall: 'mahoganyDado', floor: 'tile', walls: ['aft', 'port', 'stbd'], teleport: { name: 'Friseursalon', group: '1. Klasse' },
    info: { title: 'Friseursalon der 1. Klasse', text: 'Beim Friseur der Ersten Klasse konnte man sich rasieren und frisieren lassen und zugleich Andenken kaufen: Von der Decke hingen Wimpel, Puppen, Fähnchen und Mützenbänder mit dem Schiffsnamen, dazu gab es Postkarten, Tabak und Spielzeug. Der Barbier August Weikman überlebte den Untergang.' } });

  // ---------------------------------------------------------------- x −6.5..2  aft Grand Staircase (lowest deck C)
  const AL = { x0: -6.5, x1: 2 };
  room('treppe-achtern', 'Halle der hinteren Großen Treppe (C-Deck)', AL.x0, AL.x1, -CZ1, CZ1, () => aftLobby(plan, AL), [], {
    type: 'lobby', cls: 'first', stairs: true, walls: 'none', wall: 'oakPanel', floor: 'linoCream', lamp: 'bowl',
    info: { title: 'Hintere Große Treppe', x: -5.8, z: -4.0, radius: 5, text: 'Die hintere Große Treppe begann auf dem C-Deck und führte, ebenso prunkvoll wie die vordere, hinauf bis zum Bootsdeck mit seiner eigenen Glaskuppel. Sie erschloss den hinteren Teil der Ersten Klasse mit dem Rauchsalon, dem À-la-carte-Restaurant und dem Café Parisien. Beim Untergang brach das Schiff ungefähr an dieser Stelle auseinander.' } });
  tp('Große Treppe (achtern) – C-Deck', '1. Klasse', -5.8, -3.6, 0);
  outside(AL.x0, AL.x1, 2);

  // ---------------------------------------------------------------- x −38.5..−6.5  (funnel casing 4: −13.5..−6.5, engine casing −36..−24)
  for (const s of [-1, 1]) gang(s < 0 ? 'gang-bb-a' : 'gang-stb-a', s < 0 ? 'Kabinengang Backbord (achtern)' : 'Kabinengang Steuerbord (achtern)', -38.5, AL.x0, s < 0 ? -CZ1 : CZ0, s < 0 ? -CZ0 : CZ1, { handrail: true, floor: 'linoCream', group: '1. Klasse' });
  tp('Kabinengang 1. Klasse (achtern)', '1. Klasse', -20, CZC, Math.PI);
  outside(-38.5, AL.x0, 9);
  inside(-22.8, AL.x0, 4);
  alley('quer-c', -24, -22.8);
  inside(-36, -24, 3);
  gang('stich-c', 'Gang zu den Bädern 1. Klasse', -22.8, -13.5, -0.6, 0.6, { floor: 'linoCream' });
  room('bad-1a', 'Bad 1. Klasse', -22.8, -18.15, -CH, -0.6, { preset: 'bathroom', shower: true }, [dS(-20.5)], { ...WET, cls: 'first' });
  room('wc-1a-d', 'WC 1. Klasse (Damen)', -18.15, -13.5, -CH, -0.6, 'wc', [dS(-15.8)], { ...WET, cls: 'first' });
  room('bad-1b', 'Bad 1. Klasse', -22.8, -18.15, 0.6, CH, 'bathroom', [dP(-20.5)], { ...WET, cls: 'first' });
  room('wc-1a-h', 'WC 1. Klasse (Herren)', -18.15, -13.5, 0.6, CH, 'wc', [dP(-15.8)], { ...WET, cls: 'first' });
  room('pantry-a', 'Stewardpantry 1. Klasse (achtern)', -38.5, -36, -CZ0, 0, 'pantry', [dP(-37.25)], { ...SVC, floor: 'tile' });
  room('waesche-a', 'Wäschekammer 1. Klasse (achtern)', -38.5, -36, 0, CZ0, 'linen', [dS(-37.25)], SVC);
  info('Kabinen der 1. Klasse auf dem C-Deck', -20, -CZC, 'Das C-Deck war fast auf ganzer Länge mit Kabinen der Ersten Klasse belegt, nummeriert von C 1 im Bug bis über C 140 – ungerade Nummern an Backbord, gerade an Steuerbord. Die Außenkabinen hatten Bullaugen, die Innenkabinen nur elektrisches Licht. Viele waren in verschiedenen Stilen ausgestattet, mit Messing- oder Mahagonibetten, Waschtisch und eigener Heizung.');

  // ---------------------------------------------------------------- x −59..−38.5  second-class staircase, library, promenades
  const O2 = { type: 'lobby', cls: 'second', stairs: true, walls: 'none', wall: 'oakDado', floor: 'linoBlue', lamp: 'bowl' };
  room('treppe-2', 'Treppenhalle 2. Klasse (C-Deck)', -47.5, -38.5, -WZ, WZ, (ctx) => {
    for (const s of [-1, 1]) { plan.prop(bench({ w: 1.8, mat: 'oak', iron: false }), -45.8, s * (WZ - 0.35), s < 0 ? PZ_ : NZ_, { collide: true }); plan.prop(pottedPalm(), -39.2, s * (WZ - 0.6), 0, { collide: false }); }
  }, [], { ...O2 });
  tp('Treppenhaus 2. Klasse – C-Deck', '2. Klasse', -39.1, -4.2, Math.PI);
  for (const z of [-CZC, CZC]) plan.wall(-38.5, z - 0.9, -38.5, z + 0.9, { wall: 'whitePanel', doors: [{ at: z, w: 0.9 }] });
  const LB = { x0: -59, x1: -47.5 };
  const bays = [[-57.3, -55.0], [-54.4, -52.1], [-51.5, -49.2]];
  room('bibliothek-2', 'Bibliothek 2. Klasse', LB.x0, LB.x1, -WZ, WZ, () => library(plan, LB, WZ, bays),
    [dF(-4.5, { w: 1.4, leaf: false, style: 'mahogany' }), dF(4.5, { w: 1.4, leaf: false, style: 'mahogany' }), dA(-4.5, { w: 1.2, style: 'mahogany' }), dA(4.5, { w: 1.2, style: 'mahogany' })], {
      type: 'public', cls: 'second', wall: 'mahoganyDado', floor: 'carpetGreen', lamp: 'bowl',
      teleport: { name: 'Bibliothek 2. Klasse', group: '2. Klasse', x: -48.4, z: -3.0, yaw: Math.PI },
      info: { title: 'Bibliothek der 2. Klasse', x: -53.3, z: 0, radius: 6, text: 'Die Bibliothek der Zweiten Klasse war mit hellem Bergahorn getäfelt, darunter ein geschnitzter Mahagonisockel; Mahagonimöbel mit grünem Bezug und ein großer Bücherschrank luden zum Lesen und Briefeschreiben ein. Große Fenster gingen auf die verglasten Promenaden an beiden Seiten. Der Lehrer Lawrence Beesley, der hier am Nachmittag des 14. April saß, beschrieb den Raum später in seinem Buch über den Untergang.' } });
  for (const s of [-1, 1]) {
    room(s < 0 ? 'prom-2-bb' : 'prom-2-stb', s < 0 ? 'Geschlossene Promenade 2. Klasse (Backbord)' : 'Geschlossene Promenade 2. Klasse (Steuerbord)', LB.x0, -38.5, s < 0 ? -99 : WZ, s < 0 ? -WZ : 99,
      () => promenade(plan, LB.x0, -38.5, s, plan.halfWidth(-50)), [{ side: s < 0 ? 'stbd' : 'port', at: -43, w: 1.2, leaf: false }],
      { type: 'promenade', cls: 'second', wall: 'whitePanel', floor: 'deckWood', lamp: 'dome' });
  }
  tp('Promenade 2. Klasse (C-Deck)', '2. Klasse', -40, 12.2, Math.PI);

  // ---------------------------------------------------------------- x −90..−59  aft staircase, second-class staterooms
  room('treppe-2a', 'Hintere Treppenhalle 2. Klasse (C-Deck)', -68, LB.x0, -SZ1, SZ1, 'empty', [], { ...O2 });
  tp('Hinteres Treppenhaus 2. Klasse – C-Deck', '2. Klasse', -59.8, -4.4, Math.PI);
  row('s2', { x0: -68, x1: LB.x0, z0: SZ1, z1: 99, count: 3, corridorSide: 'port', ...S2 });
  row('p2', { x0: -68, x1: LB.x0, z0: -99, z1: -SZ1, count: 3, corridorSide: 'stbd', ...S2 });
  gang('quer-achtern', 'Quergang am hinteren Brunnendeck', -90, -88.6, -99, 99, { floor: 'linoBlue', wall: 'whitePanel' });
  tp('Eingang vom hinteren Brunnendeck', '2. Klasse', -89.3, 3.6, 0);
  for (const s of [-1, 1]) gang(s < 0 ? 'gang-2-bb' : 'gang-2-stb', s < 0 ? 'Kabinengang 2. Klasse (Backbord)' : 'Kabinengang 2. Klasse (Steuerbord)', -88.6, -68, s < 0 ? -SZ1 : SZ0, s < 0 ? -SZ0 : SZ1, { handrail: true, floor: 'linoBlue', group: '2. Klasse' });
  tp('Kabinengang 2. Klasse (C-Deck)', '2. Klasse', -80, SZC, 0);
  row('p2', { x0: -88.6, x1: -68, z0: -99, z1: -SZ1, count: 7, corridorSide: 'stbd', ...S2, berths: 4 });
  row('s2', { x0: -88.6, x1: -68, z0: SZ1, z1: 99, count: 7, corridorSide: 'port', ...S2, berths: 4 });
  row('p2', { x0: -88.6, x1: -68, z0: -SZ0, z1: -SIN, count: 6, corridorSide: 'port', ...S2 });
  row('s2', { x0: -88.6, x1: -68, z0: SIN, z1: SZ0, count: 6, corridorSide: 'stbd', ...S2 });
  gang('mittelgang-2', 'Mittelgang 2. Klasse', -88.6, -68, -0.6, 0.6, { floor: 'linoBlue', wall: 'paintWhite' });
  const mid = [
    [-88.6, -81.73, -1, 'wc-2-d', 'WC 2. Klasse (Damen)', 'wc', WET],
    [-81.73, -74.87, -1, 'pantry-2', 'Stewardpantry 2. Klasse', 'pantry', { ...SVC, floor: 'tile' }],
    [-74.87, -68, -1, 'waesche-2', 'Wäschekammer 2. Klasse', 'linen', SVC],
    [-88.6, -81.73, 1, 'wc-2-h', 'WC 2. Klasse (Herren)', 'wc', WET],
    [-81.73, -74.87, 1, 'bad-2', 'Bäder 2. Klasse', { preset: 'bathroom', shower: true }, WET],
    [-74.87, -68, 1, 'gepaeck-2', 'Gepäckraum 2. Klasse', 'hold', SVC],
  ];
  for (const [x0, x1, s, id, name, furnish, o] of mid) room(id, name, x0, x1, s < 0 ? -SIN : 0.6, s < 0 ? -0.6 : SIN, furnish, [{ side: s < 0 ? 'stbd' : 'port', at: (x0 + x1) / 2, style: o === SVC ? 'steel' : 'white' }], { cls: 'second', ...o });

  // ====================================================================================================== POOP x −134..−106
  const LP = { x0: -118, x1: -106, z: 6 };
  room('eingang-3a', 'Eingangshalle 3. Klasse (achtern)', LP.x0, LP.x1, -LP.z, LP.z, (ctx) => {
    poster(plan, LP.x0 + 0.05, -5.2, 1, 0, 0.6, 0.8, 1.6); poster(plan, LP.x0 + 0.05, -1.6, 1, 0, 0.6, 0.8, 1.6);
  }, [], { type: 'lobby', cls: 'third', stairs: true, walls: 'none', wall: 'paintWhite', floor: 'linoRed', lamp: 'bulkhead' });
  tp('Eingangshalle 3. Klasse (achtern)', '3. Klasse', -107.0, -3.4, Math.PI);
  const GR = { x0: -122, x1: -106 }, DOOR3 = -108.6, HATCH = [-121.4, -119.4];
  room('aufenthalt-3', 'Allgemeiner Aufenthaltsraum 3. Klasse', GR.x0, GR.x1, LP.z, 99, () => thirdSaloon(plan, GR, 1, LP.z, false, DOOR3),
    [dP(DOOR3, { w: 1.2, style: 'pine' })], {
      type: 'public', cls: 'third', walls: ['aft', 'port', 'stbd'], wall: { base: 'whiteDado', dado: 'pine', skirt: 'pine' }, floor: 'linoRed', lamp: 'dome',
      teleport: { name: 'Aufenthaltsraum 3. Klasse', group: '3. Klasse', x: DOOR3, z: 6.9, yaw: Math.PI },
      info: { title: 'Allgemeiner Aufenthaltsraum der 3. Klasse', x: -114, z: 7.0, text: 'Der Gesellschaftsraum der Dritten Klasse war mit weiß lackierter Kiefer getäfelt und mit massiven Teakholztischen und -bänken eingerichtet. Ein Klavier sorgte für Musik und Tanz, an den Wänden hingen Plakate der White Star Line. Für viele Auswanderer war dieser Raum komfortabler als alles, was sie aus der Heimat kannten.' } });
  room('rauchsalon-3', 'Rauchsalon 3. Klasse', GR.x0, GR.x1, -99, -LP.z, () => thirdSaloon(plan, GR, -1, LP.z, true, DOOR3, HATCH),
    [dS(DOOR3, { w: 1.2, style: 'oak' })], {
      type: 'public', cls: 'third', walls: ['aft', 'port', 'stbd'], wall: 'oak', floor: 'linoRed', lamp: 'dome',
      teleport: { name: 'Rauchsalon 3. Klasse', group: '3. Klasse', x: DOOR3, z: -6.9, yaw: Math.PI },
      info: { title: 'Rauchsalon der 3. Klasse', x: -114, z: -7.0, text: 'Der Rauchsalon der Dritten Klasse war mit Eiche getäfelt und mit robusten Bänken, Tischen und Stühlen aus Teak möbliert; Spucknäpfe aus Messing standen auf dem Boden. Durch eine Durchreiche aus der Bar wurden Bier und Spirituosen ausgeschenkt. Der Raum war den Männern vorbehalten, die hier rauchten, Karten spielten und diskutierten.' } });
  bay(plan, HATCH[0], HATCH[1], -LP.z, { sill: 1.0, head: 1.9, neg: 'oak', pos: 'paintWhite', frame: 'oak', shelf: 0.15 });
  gang('gang-ruder', 'Gang zum Rudermaschinenraum', -122, LP.x0, -0.7, 0.7, { wall: 'paintWhite', lamp: 'bulkhead' });
  room('bar-3', 'Ausschank des Rauchsalons', -122, LP.x0, -LP.z, -0.7, barPantry, [dF(-3.6, { style: 'pine' })], { ...SVC, floor: 'tile' });
  room('wc-3-f', 'WC 3. Klasse (Frauen)', -122, LP.x0, 0.7, 3.35, 'wc', [dF(2.0)], { ...WET, wall: 'paintWhite', cls: 'third' });
  room('wc-3-m', 'WC 3. Klasse (Männer)', -122, LP.x0, 3.35, LP.z, 'wc', [dF(4.68)], { ...WET, wall: 'paintWhite', cls: 'third' });
  const SG = { x0: -134, x1: -122 };
  room('rudermaschine', 'Rudermaschinenraum', SG.x0, SG.x1, -99, 99, () => steeringGear(plan, SG), [dF(0.2, { w: 0.9, style: 'steel' })], {
    ...SVC, walls: ['fwd'], wall: 'steel', floor: 'steelFloor', teleport: { name: 'Rudermaschinenraum', group: 'Besatzung', x: SG.x1 - 0.8, z: 0.2, yaw: Math.PI },
    info: { title: 'Rudermaschinenraum', x: SG.x1 - 1.2, z: 0.2, text: 'Ganz im Heck saß auf dem Kopf des Ruderschafts der große Ruderquadrant. Ihn bewegten zwei Dampf-Rudermaschinen über Zahnräder – eine im Betrieb, die zweite als Reserve. Gesteuert wurden sie hydraulisch über den Telemotor vom Steuerrad auf der Brücke. Das über 100 Tonnen schwere Ruder war für die Größe des Schiffes eher klein, was die Ausweichbewegung vor dem Eisberg erschwerte.' } });

  const res = plan.finish();
  if (res.problems.length) console.warn(`[C] ${res.problems.length} kit problems`);
  return {};
}

const PZ_ = -Math.PI / 2, NZ_ = Math.PI / 2;
