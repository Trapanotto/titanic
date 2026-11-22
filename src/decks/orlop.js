// Orlop deck – the lowest continuous deck, only forward (x 66..112) and aft (x -112..-58) of the machinery spaces.
// Forward: cargo holds No. 1–3 with the first-class baggage hold and the registered-mail room, the hold stair 'holdFwd'.
// Aft: refrigerated cargo holds, general cargo holds No. 4–6, bulk provisions, wine and the electricians' store,
// the hold stair 'holdAft'. Watertight bulkheads with doors separate the holds.
import { buildDeckShell, bulkhead, createDeckPlan } from '../interior/kit.js';
import { shortcuts } from './f-util.js';
import { cargoHold, renaultHold, mailHold } from './orlop-car.js';
import { baggageRoom, produceRoom, dairyRoom, wineCellar, dryStore } from './g-hero.js';

const deck = 'orlop';
const BULKHEADS = { 82: [-1.5], 96: [0], '-80': [0], '-100': [0] };

export async function build(world) {
  buildDeckShell(world, deck);
  const plan = createDeckPlan(world, deck, { wall: 'steel' });
  const { room, dP, dS, dA, dF } = shortcuts(plan, 'O');
  const HOLD = { type: 'hold', wall: 'steel', floor: null, lamp: 'bulkhead', lampPitch: 7, group: 'Laderäume' };
  const STORE = { type: 'store', wall: 'steel', lamp: 'bulkhead', group: 'Laderäume' };
  const R = (x0, x1, z0, z1) => ({ x0, x1, z0, z1 });

  for (const [x, ds] of Object.entries(BULKHEADS)) bulkhead(world, deck, Number(x), { doors: ds.map((z) => ({ z, w: 1.2, h: 1.9 })) });

  // ============================================================== forward
  room('laderaum-3', 'Laderaum Nr. 3', 66, 82, -99, 3, cargoHold([R(66, 82, -2.6, -1.4), R(68.3, 69.7, -2.6, 3), R(78.3, 79.7, -2.6, 3)]), [], {
    ...HOLD, stairs: true, teleport: { name: 'Laderaum Nr. 3 – Niedergang', group: 'Laderäume', x: 68.6, z: -2.0, yaw: 0 },
    info: { title: 'Laderäume im Vorschiff', x: 77, z: -2.0, radius: 6, text: 'Unter dem G-Deck lagen im Vorschiff die Laderäume Nr. 1 bis 3. Die Ladung der Titanic war vergleichsweise klein, aber wertvoll: Kisten mit Straußenfedern, Tee, Wein, Möbel, Maschinenteile und eine juwelenbesetzte Ausgabe des „Rubaiyat“ von Omar Khayyam. Der Eisberg riss die Bordwand gerade in diesem Bereich auf, sodass die vorderen Laderäume als Erste voll Wasser liefen.' } });
  room('gepaeck-lager', 'Gepäcklagerraum 1. Klasse', 66, 72, 3, 99, baggageRoom, [dP(69, { w: 1.2, style: 'steel' })], {
    ...STORE, teleport: { name: 'Gepäcklagerraum', group: 'Laderäume' },
    info: { title: 'Gepäcklagerraum', text: 'Großes Reisegepäck, das an Bord nicht benötigt wurde, verstaute die Mannschaft hier unten im Schiff. Ein Lastenaufzug und Luken verbanden den Raum mit dem Gepäckraum auf dem G-Deck darüber. Viele Passagiere verloren beim Untergang ihre gesamte Habe und forderten später Entschädigung.' } });
  room('postlager', 'Postlagerraum', 72, 82, 3, 99, mailHold, [dP(79, { w: 1.2, style: 'steel' })], {
    ...STORE, wall: 'pine', teleport: { name: 'Postlagerraum', group: 'Laderäume' },
    info: { title: 'Der Postlagerraum', text: 'Direkt unter dem Postamt lag der Lagerraum für Post und Einschreibesendungen, mit dem Sortierraum durch eine Treppe verbunden. An Bord befanden sich rund 3 400 Säcke Post. Kurz nach der Kollision stand hier bereits das Wasser; die Postbeamten schleppten die Einschreibesäcke noch nach oben.' } });
  room('laderaum-2', 'Laderaum Nr. 2', 82, 96, -99, 99, renaultHold([R(82, 96, -2.0, 0.6)]), [dA(-1.5, { w: 1.2, style: 'steel' }), dF(0, { w: 1.2, style: 'steel' })], {
    ...HOLD, teleport: { name: 'Laderaum 2 – Renault-Automobil', group: 'Laderäume', x: 84.2, z: 0.4, yaw: -0.5 },
    info: { title: 'Der Renault von William Carter', x: 87, z: 0.8, radius: 6, text: 'Der Millionär William Ernest Carter aus Philadelphia ließ sein neues Automobil, einen Renault Type CE Coupé de Ville von 1912, in einer Kiste im Laderaum Nr. 2 mitreisen. Der Chauffeur saß offen vorne, die Fahrgäste in einer geschlossenen Kabine. Carter überlebte und forderte von der Reederei rund 5 000 Dollar Ersatz. Der Wagen inspirierte die bekannte Szene im Film „Titanic“ von 1997.' } });
  room('laderaum-1', 'Laderaum Nr. 1', 96, 106, -99, 99, cargoHold([R(96, 106, -0.8, 0.8)]), [dA(0, { w: 1.2, style: 'steel' })], {
    ...HOLD, teleport: { name: 'Laderaum Nr. 1', group: 'Laderäume' } });
  room('bootsmann', 'Lagerraum des Bootsmanns', 106, 112, -99, 99, { preset: 'store', shelves: 4 }, [dA(0, { w: 1.0, style: 'steel' })], STORE);

  // ============================================================== aft
  room('laderaum-4', 'Laderaum Nr. 4', -80, -58, -4, 99, cargoHold([R(-80, -58, -2.8, -1.4), R(-62.7, -61.3, -4, -1.4), R(-80, -78.5, -1.4, 1.4)]), [], {
    ...HOLD, stairs: true, teleport: { name: 'Laderaum Nr. 4 – Niedergang', group: 'Laderäume', x: -78.9, z: -2.0, yaw: 0 } });
  room('kuehl-1', 'Kühlladeraum', -80, -58, -99, -4, produceRoom('fruit'), [dS(-62, { w: 1.2, style: 'steel' })], {
    ...STORE, wall: 'paintWhite', floor: 'tile', teleport: { name: 'Kühlladeraum', group: 'Laderäume' },
    info: { title: 'Der Kühlladeraum', text: 'Neben den Proviantkühlräumen besaß die Titanic gekühlte Laderäume für verderbliche Fracht. Sie wurden wie die Kühlräume der Küche über Solerohre von den Kältemaschinen im Maschinenraum gekühlt. Hier reisten unter anderem Obst, Butter und Käse nach New York.' } });
  room('laderaum-5', 'Laderaum Nr. 5', -100, -80, -3, 99, cargoHold([R(-100, -80, -2.9, 0.8)]), [dF(0, { w: 1.2, style: 'steel' }), dA(0, { w: 1.2, style: 'steel' })], {
    ...HOLD, teleport: { name: 'Laderaum Nr. 5', group: 'Laderäume' } });
  room('proviant-lager', 'Proviantlager (Massengut)', -100, -90, -99, -3, dryStore, [dS(-95, { w: 1.2, style: 'steel' })], { ...STORE, floor: 'steelFloor' });
  room('wein-lager', 'Weinlager (Orlop)', -90, -80, -99, -3, wineCellar, [dS(-85, { w: 1.2, style: 'steel' })], { ...STORE, floor: 'steelFloor',
    teleport: { name: 'Weinlager (Orlop-Deck)', group: 'Laderäume' } });
  room('laderaum-6', 'Laderaum Nr. 6', -112, -100, -99, 2, cargoHold([R(-112, -100, -0.8, 2)]), [], { ...HOLD, teleport: { name: 'Laderaum Nr. 6', group: 'Laderäume' },
    info: { title: 'Laderaum Nr. 6', text: 'Im Heck unter den Kabinen der Dritten Klasse lag der hintere Laderaum. Unter dem Orlop-Deck verlief hier der Wellentunnel, durch den die Wellen der beiden Kolbenmaschinen zu den Seitenpropellern liefen. Beim Untergang hob sich das Heck weit aus dem Wasser, und die Ladung stürzte nach vorne.' } });
  room('kuehl-2', 'Kühlladeraum (achtern)', -112, -104, 2, 99, dairyRoom, [dP(-108, { w: 1.2, style: 'steel' })], { ...STORE, wall: 'paintWhite', floor: 'tile' });
  room('elektro', 'Elektrikerlager', -104, -100, 2, 99, { preset: 'store', shelves: 4 }, [dP(-102, { w: 1.0, style: 'steel' })], { ...STORE,
    info: { title: 'Elektrikerlager', text: 'Die Titanic hatte rund 10 000 Glühlampen, 150 Elektromotoren und Hunderte Heizkörper an Bord. Ersatzteile, Kabel und Lampen für die Elektriker lagerten in diesem Store. Die vier Hauptgeneratoren lieferten zusammen 1,6 Megawatt Strom.' } });

  const res = plan.finish();
  console.info(`[orlop] ${res.rooms.length} rooms, ${res.walls} wall pieces, ${res.doors} doors, ${res.problems.length} problems`);
  return {};
}
