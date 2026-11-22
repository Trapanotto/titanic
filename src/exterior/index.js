import * as THREE from 'three';
import { DECK_Y } from '../core/constants.js';
import { Batch } from './structure-batch.js';
import { Inst } from './inst.js';
import { buildHull, buildPortholes } from './structure-hull.js';
import { buildDecks } from './structure-decks.js';
import { buildWalls } from './structure-walls.js';

// Exterior STRUCTURE: hull shell, open decks, railings, superstructure walls, exterior stairs.
// (Funnels, masts, boats and deck gear live in fittings.js.)

const TELEPORTS = [
  { name: 'Bug', deck: 'B', x: 125, z: 0, yaw: 0 },
  { name: 'Vorderes Welldeck', deck: 'C', x: 80.3, z: 0, yaw: 0 },
  { name: 'Brückennock', deck: 'boat', x: 69, z: 9.3, yaw: 0 },
  { name: 'Bootsdeck Mitte', deck: 'boat', x: 23, z: 9.5, yaw: 0 },
  { name: 'A-Deck Promenade', deck: 'A', x: 30, z: 12.1, yaw: 0 },
  { name: 'Achteres Welldeck', deck: 'C', x: -92, z: 0, yaw: Math.PI },
  { name: 'Poopdeck (Heck)', deck: 'B', x: -128.5, z: 0, yaw: Math.PI },
];

const INFOS = [
  { title: 'Der Bug', x: 127, y: DECK_Y.B, z: 0, radius: 6,
    text: 'Der fast senkrechte Vorsteven der Titanic ragte rund 18 Meter über die Wasserlinie. Hier vorn lagen die Ankereinrichtungen; die beiden Buganker wogen je knapp 8 Tonnen, ein dritter Mittelanker über 15 Tonnen. In der Nacht des 14. April 1912 streifte der Eisberg die Steuerbordseite kurz hinter dem Bug.' },
  { title: 'Back (Vorschiff)', x: 108, y: DECK_Y.B, z: 0, radius: 7,
    text: 'Das erhöhte Vorschiff, die Back, war Arbeitsbereich der Mannschaft und für Passagiere gesperrt. Unter diesem Deck wohnten Matrosen und Heizer. Am vorderen Mast befand sich der Ausguck, das „Krähennest“, von dem aus Frederick Fleet um 23:40 Uhr den Eisberg meldete.' },
  { title: 'Vorderes Welldeck', x: 86, y: DECK_Y.C, z: 0, radius: 7,
    text: 'Das vordere Welldeck diente den Passagieren der dritten Klasse als Aufenthaltsbereich im Freien. Hier lagen auch die Ladeluken zu den vorderen Frachträumen. Nach der Kollision fanden Passagiere auf diesem Deck Eisbrocken, die vom Eisberg abgebrochen waren.' },
  { title: 'Achteres Welldeck', x: -98, y: DECK_Y.C, z: 0, radius: 7,
    text: 'Auch das achtere Welldeck gehörte zum Bereich der dritten Klasse. Von hier führten Treppen hinauf zum Poopdeck und zum offenen B-Deck der zweiten Klasse. Die Klassen waren an Bord streng getrennt – nicht zuletzt wegen der amerikanischen Einwanderungsvorschriften.' },
  { title: 'Poopdeck', x: -122, y: DECK_Y.B, z: 0, radius: 8,
    text: 'Das Poopdeck am Heck war das wichtigste Freideck der dritten Klasse. In den letzten Minuten des Untergangs drängten sich hier Hunderte Menschen, während sich das Heck immer steiler aus dem Wasser hob. Gegen 2:20 Uhr am 15. April 1912 versank es als letzter Teil des Schiffes.' },
  { title: 'Promenadendeck (A-Deck)', x: 30, y: DECK_Y.A, z: 12, radius: 6,
    text: 'Das A-Deck war den Passagieren der ersten Klasse vorbehalten und lief als Promenade um das gesamte Deckshaus. Anders als beim Schwesterschiff Olympic war der vordere Teil der Promenade auf der Titanic mit Stahlwänden und Schiebefenstern gegen Gischt geschützt – eines der sichersten Unterscheidungsmerkmale der beiden Schiffe.' },
  { title: 'Bootsdeck und Rettungsboote', x: 23, y: DECK_Y.boat, z: 10, radius: 7,
    text: 'Auf dem Bootsdeck standen 16 hölzerne Rettungsboote an Welin-Davits sowie 4 Faltboote – zusammen Platz für 1178 Menschen. An Bord waren jedoch über 2200 Personen. Die Ausstattung übertraf dennoch die damaligen Vorschriften, die sich nach der Tonnage und nicht nach der Zahl der Menschen an Bord richteten.' },
  { title: 'Brücke und Brückennock', x: 69, y: DECK_Y.boat, z: 9.5, radius: 5,
    text: 'Von der Kommandobrücke aus wurde das Schiff geführt; die seitlichen Brückennocken mit ihren kleinen Schutzhäuschen erlaubten den Blick entlang der Bordwand, etwa beim Anlegen. In der Unglücksnacht hatte der Erste Offizier William Murdoch die Wache.' },
  { title: 'Offenes B-Deck achtern', x: -82, y: DECK_Y.B, z: 4, radius: 6,
    text: 'Das offene Achterende des B-Decks war eine Promenade der zweiten Klasse. Direkt davor lagen der Rauchsalon der zweiten Klasse und, weiter vorn, das À-la-carte-Restaurant mit dem Café Parisien der ersten Klasse.' },
  { title: 'Der Rumpf', x: 0, y: DECK_Y.boat, z: -12.5, radius: 6,
    text: 'Die Titanic war 269 Meter lang, gut 28 Meter breit und mit 46 328 Bruttoregistertonnen das größte Schiff ihrer Zeit. Gebaut wurde sie von 1909 bis 1912 bei Harland & Wolff in Belfast für die White Star Line. Rund drei Millionen Nieten hielten die Stahlplatten des Rumpfes zusammen.' },
  { title: 'Großes Treppenhaus – Glaskuppel', x: 42, y: DECK_Y.boat, z: 9, radius: 4,
    text: 'Über dem vorderen Großen Treppenhaus der ersten Klasse wölbte sich eine Kuppel aus Schmiedeeisen und Glas, die Tageslicht in das Treppenhaus brachte. Eine zweite, etwas schlichtere Kuppel saß über dem achteren Treppenhaus.' },
];

export async function build(world) {
  const group = new THREE.Group();
  group.name = 'exterior-structure';
  world.exterior.add(group);
  world.markForBake(group);

  const batch = new Batch();
  const inst = new Inst();
  const ports = [];
  buildHull(world, group, batch, inst, ports);
  buildDecks(world, batch, inst);
  buildWalls(world, batch, inst, ports);
  batch.flush(group);
  buildPortholes(inst, ports);
  inst.build(group, 'structure');

  for (const t of TELEPORTS) world.addTeleport({ ...t, group: 'Außendecks' });
  for (const i of INFOS) world.addInfo(i);
  return {};
}
