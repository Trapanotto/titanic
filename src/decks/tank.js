// Tank Top – the machinery level, bow → stern:
//   x 108..66   cargo hold bottoms No. 1–3, fresh-water tank rooms, firemen's tunnel on the centreline (under the orlop deck)
//   x 66..-22   boiler rooms 6 … 1 (full height up to F deck), 29 Scotch boilers, 159 furnaces
//   x -22..-44  reciprocating engine room, x -44..-58 turbine room (full height)
//   x -58..-68  electric engine room (dynamos), x -68..-104 shaft tunnels and stores (under the orlop deck)
// Access from F deck by two steel stair towers under MACHINERY_ACCESS; watertight doors at tank-top level in every
// bulkhead make the whole machinery length walkable.
import { mats } from '../core/materials.js';
import { MACHINERY_X, DECK_SEGMENTS } from '../core/constants.js';
import {
  Batch, buildDeckShell, bulkhead, createDeckPlan, tankH, machineBlock, crateStack, barrel, shelves, sackPile, crate, ladder,
} from '../interior/kit.js';
import { DECK, Y, CEIL, LOW, Instancer, tube, pipeRun, cageLamp, railX, railZ, plate, flight, floorHW } from './tank-lib.js';
import { buildBoilerRooms, BOILER_ROOMS, boilerEnds, wtGear } from './tank-boilers.js';
import { buildEngineSpaces, LEVEL_U, LEVEL_M } from './tank-engines.js';

const G = 'Maschinen';
const [MX0, MX1] = MACHINERY_X;                 // -58, 66
const [SX0, SX1] = DECK_SEGMENTS.tank[0];       // -104, 108

/** Hull-side colliders along the inner lining at floor level, stepped so that no step deviates more than 3 cm. */
function hullColliders(world, xa, xb) {
  for (let x = xa; x < xb - 1e-4;) {
    let xe = Math.min(xb, x + 6);
    while (xe - x > 0.25 && Math.abs(floorHW(xe) - floorHW(x)) > 0.03) xe = x + (xe - x) / 2;
    const h = Math.min(floorHW(x), floorHW(xe)), top = x >= MX0 && xe <= MX1 ? CEIL : LOW;
    for (const s of [-1, 1]) world.addCollider(x, Y, s * h, xe, top, s * (h + 0.6));
    x = xe;
  }
}

/** Stair tower under MACHINERY_ACCESS 'boilerAccess' (port, aft end of boiler room 4). */
function boilerAccess(world, b) {
  const yF = Y + 10, yU = LEVEL_U, yM = LEVEL_M;
  flight(b, world, { axis: 'x', a0: 25, a1: 20, y0: yF, y1: yU, c0: -10.45, c1: -8.1 });
  plate(b, world, 18.1, 20, -10.45, -8.1, yU);
  railX(b, world, 18.1, 20, -10.45, yU);
  railX(b, world, 19.2, 20, -8.1, yU);
  flight(b, world, { axis: 'z', a0: -8.1, a1: -3.1, y0: yU, y1: yM, c0: 18.15, c1: 19.2, rails: ['visual', true] });
  plate(b, world, 18.1, 20.45, -3.1, -1.8, yM);
  railX(b, world, 18.1, 20.45, -1.8, yM);
  railZ(b, world, -3.1, -1.8, 20.45, yM);
  flight(b, world, { axis: 'z', a0: -3.1, a1: -8.1, y0: yM, y1: Y, c0: 19.25, c1: 20.4, rails: [true, true], under: true });
  // posts carrying the landings
  for (const [x, z, h] of [[20.4, -1.85, yM], [20.4, -3.05, yM], [19.95, -10.4, yU], [19.95, -8.15, yU]]) b.box(mats.steelDark, x - 0.06, Y, z - 0.06, x + 0.06, h - 0.06, z + 0.06, 'xXzZ');
  cageLamp(b, world, 19.3, yU + 2.2, -9.3, { hang: CEIL, intensity: 0.9 });
  cageLamp(b, world, 19.3, yM + 2.2, -2.45, { hang: yU - 0.2, intensity: 0.8 });
}

/** furnish: fresh-water tank room */
function freshWater(ctx) {
  ctx.fit(tankH({ r: 1.05, l: Math.min(4.2, ctx.W - 1.4) }), ['far:mid', 'far:hi']);
  ctx.fit(machineBlock({ kind: 'pump', w: 1.2, d: 0.9, h: 1.6 }), ['left:hi', 'right:hi', 'left:mid']);
  ctx.fit(shelves({ kind: 'empty', w: 1.2 }), ['right:mid', 'left:mid']);
}
/** furnish: stores entered through the bulkhead door at the forward end (no own door) – keep the forward 2.5 m free */
function aftStore(ctx) {
  const items = [crateStack({ v: 1 }), barrel(), barrel(), sackPile(), crateStack({ v: 2 }), crate({ s: 0.9 }), barrel()];
  let k = 0;
  for (let v = 3.6; v < ctx.D - 1.0 && k < items.length; v += 2.6) for (const u of [ctx.W * 0.3, ctx.W * 0.72]) if (k < items.length) ctx.put(items[k++], u, v, 'out');
  ctx.fit(shelves({ kind: 'stores', w: 1.5 }), ['left:hi', 'right:hi', 'far:mid']);
}

export async function build(world) {
  // ============================================================== shells (three heights)
  // (hull colliders are added below in fine steps: the kit's adaptive stepping is too coarse where the hull starts to
  //  narrow at x ≈ 40 and would close the side walkways beside the boilers)
  const HLOW = LOW - Y;
  buildDeckShell(world, DECK, { x0: SX0, x1: MX0, height: HLOW, collide: false });
  buildDeckShell(world, DECK, { x0: MX0, x1: MX1, collide: false });
  buildDeckShell(world, DECK, {
    x0: MX1, x1: SX1, height: HLOW, collide: false,
    floors: [{ x0: 72, x1: 104, mat: 'deckWood' }, { x0: 66, x1: 104, z0: -1, z1: 1, mat: 'steelFloor' }],
  });
  hullColliders(world, SX0, SX1);

  // ============================================================== watertight bulkheads
  const D1 = [{ z: 0, w: 1.0, h: 1.9 }];
  for (const x of [66, ...BOILER_ROOMS.map((r) => r.x0).filter((x) => x > -22), -22]) bulkhead(world, DECK, x, { doors: D1, y1: CEIL });
  // engine room | turbine room | dynamo room: centre doors + wing doors outboard of the propeller shafts
  bulkhead(world, DECK, -44, { doors: [{ z: -7.7, w: 0.95 }, { z: 0, w: 1.0 }, { z: 7.7, w: 0.95 }], y1: CEIL });
  bulkhead(world, DECK, -58, { doors: [-7.7, -1.3, 1.3, 7.7].map((z) => ({ z, w: 0.95 })), y1: CEIL });
  bulkhead(world, DECK, -68, { doors: [-12.4, -3.85, -1.85, 1.85, 3.85, 12.4].map((z) => ({ z, w: 0.95, h: 1.9 })), y1: LOW });
  for (const x of [80, 94]) bulkhead(world, DECK, x, { doors: [{ z: 0, w: 1.2, h: 2.0 }], y1: LOW });

  // ============================================================== machinery
  const b = new Batch(world, DECK);
  const inst = new Instancer(world);
  buildBoilerRooms(world, b, inst);
  for (const x of [66, ...BOILER_ROOMS.map((r) => r.x0).filter((x) => x > -22), -22]) wtGear(world, b, x);
  boilerAccess(world, b);
  const anim = buildEngineSpaces(world, b);

  // ============================================================== rooms (registry, teleports, infos) + low spaces
  const plan = createDeckPlan(world, DECK, { wall: 'steel', height: HLOW, lamp: 'bulkhead' });
  const MACH = { type: 'machinery', walls: 'none', lamp: false, group: G };
  const fullW = { z0: -99, z1: 99 };
  const brName = (n) => 'Kesselraum ' + n;
  for (const r of BOILER_ROOMS) {
    const E = boilerEnds(r), tx = (E.fwd + 0.75 + (r.x1 - 1.3)) / 2;
    plan.room({ ...MACH, id: 'tank-kr' + r.n, name: brName(r.n), x0: r.x0, x1: r.x1, ...fullW, teleport: { name: brName(r.n), group: G, x: tx, z: -0.4, yaw: Math.PI } });
  }
  plan.room({
    ...MACH, id: 'tank-mr', name: 'Maschinenraum (Kolbendampfmaschinen)', x0: -44, x1: -22, ...fullW,
    teleport: { name: 'Maschinenraum (Kolbendampfmaschinen)', group: G, x: -40.5, z: 0, yaw: 0 },
  });
  world.addTeleport({ name: 'Maschinenraum – obere Galerie', deck: DECK, x: -38.5, y: LEVEL_U, z: 0, yaw: -Math.PI / 2, group: G });
  plan.room({ ...MACH, id: 'tank-tr', name: 'Turbinenraum', x0: MX0, x1: -44, ...fullW, teleport: { name: 'Turbinenraum', group: G, x: -50.0, z: 3.6, yaw: Math.PI / 2 } });
  plan.room({ ...MACH, id: 'tank-dyn', name: 'Dynamoraum', x0: -68, x1: MX0, ...fullW, lamp: 'bulkhead', teleport: { name: 'Dynamoraum', group: G, x: -60.0, z: 11.0, yaw: Math.PI } });

  // ---- aft: shaft tunnels and stores
  const T = { wall: 'steel', lamp: 'bulkhead', group: G };
  plan.room({ ...T, id: 'tank-wt-stb', name: 'Wellentunnel Steuerbord', type: 'tunnel', x0: -100, x1: -68, z0: 3.2, z1: 7.0, walls: ['port', 'stbd'], teleport: { name: 'Wellentunnel', group: G, x: -80, z: 3.85, yaw: Math.PI } });
  plan.room({ ...T, id: 'tank-wt-bb', name: 'Wellentunnel Backbord', type: 'tunnel', x0: -100, x1: -68, z0: -7.0, z1: -3.2, walls: ['port', 'stbd'] });
  plan.room({ ...T, id: 'tank-wt-mitte', name: 'Mittelwellentunnel', type: 'tunnel', x0: SX0, x1: -68, z0: -3.2, z1: 3.2, walls: ['port', 'stbd'], teleport: { name: 'Mittelwellentunnel', group: G, x: -86, z: 1.8, yaw: Math.PI } });
  for (const s of [-1, 1]) {
    const n = s < 0 ? 'Backbord' : 'Steuerbord', k = s < 0 ? 'bb' : 'stb';
    plan.room({ ...T, id: 'tank-wt-ende-' + k, name: 'Tunnelende ' + n + ' (Stevenrohr)', type: 'tunnel', x0: SX0, x1: -100, z0: s < 0 ? -99 : 3.2, z1: s < 0 ? -3.2 : 99, walls: [s < 0 ? 'stbd' : 'port'] });
    plan.room({ ...T, id: 'tank-lager-' + k, name: 'Vorratsraum ' + n + ' (achtern)', type: 'store', x0: -100, x1: -68, z0: s < 0 ? -99 : 7.0, z1: s < 0 ? -7.0 : 99, walls: ['aft', s < 0 ? 'stbd' : 'port'], facing: 'fwd', furnish: aftStore });
  }

  // ---- forward: fresh water, hold bottoms, firemen's tunnel
  plan.corridor({ id: 'tank-ft', name: 'Feuermannstunnel', x0: MX1, x1: 104, z0: -1, z1: 1, wall: 'steel', lamp: 'bulkhead', teleport: { name: 'Feuermannstunnel', group: G, x: 86, z: 0, yaw: Math.PI } });
  for (const s of [-1, 1]) {
    const n = s < 0 ? 'Backbord' : 'Steuerbord', k = s < 0 ? 'bb' : 'stb', z0 = s < 0 ? -99 : 1, z1 = s < 0 ? -1 : 99, side = s < 0 ? 'stbd' : 'port', hull = s < 0 ? 'port' : 'stbd';
    plan.room({ id: 'tank-fw-' + k, name: 'Frischwassertanks ' + n, type: 'tank', x0: MX1, x1: 72, z0, z1, walls: ['fwd', side, hull], furnish: freshWater, doors: [{ side, at: 69.5, style: 'steel' }], teleport: s > 0 ? { name: 'Frischwassertanks', group: G } : undefined });
    plan.room({ id: 'tank-lr3-' + k, name: 'Laderaum Nr. 3 (Boden) ' + n, type: 'hold', x0: 72, x1: 80, z0, z1, walls: [side, hull], furnish: 'hold', doors: [{ side, at: 76, style: 'steel' }] });
    plan.room({ id: 'tank-lr2-' + k, name: 'Laderaum Nr. 2 (Boden) ' + n, type: 'hold', x0: 80, x1: 94, z0, z1, walls: [side, hull], furnish: 'hold', doors: [{ side, at: 87, style: 'steel' }], teleport: s > 0 ? { name: 'Laderaum Nr. 2', group: G } : undefined });
    plan.room({ id: 'tank-lr1-' + k, name: 'Laderaum Nr. 1 (Boden) ' + n, type: 'hold', x0: 94, x1: 104, z0, z1, walls: ['fwd', side, hull], furnish: 'hold', doors: [{ side, at: 98.5, style: 'steel' }] });
  }
  plan.room({ id: 'tank-wendel', name: 'Treppenschacht zum Heizerlogis', type: 'stairwell', x0: 104, x1: SX1, z0: -99, z1: 99, walls: ['aft'], doors: [{ side: 'aft', at: 0, w: 1.0, style: 'steel' }] });

  // ============================================================== details in the low spaces
  // firemen's tunnel: pipes along the crown, spiral-stair trunk at the forward end
  for (const z of [-0.55, 0.55]) pipeRun(b, z < 0 ? mats.paintWhite : mats.steelDark, [[MX1 + 0.2, LOW - 0.35, z], [103.8, LOW - 0.35, z]], z < 0 ? 0.09 : 0.06, { seg: 8 });
  for (let x = 68; x < 104; x += 3) b.box(mats.iron, x - 0.03, LOW - 0.48, -0.7, x + 0.03, LOW - 0.42, 0.7);
  tube(b, mats.steel, 'y', [106.1, 0], 1.15, Y, LOW, { seg: 18, caps: false });
  for (let y = Y + 0.4; y < LOW; y += 1.2) tube(b, mats.iron, 'y', [106.1, 0], 1.18, y - 0.04, y + 0.04, { seg: 18, caps: false });
  b.box(mats.steelDark, 104.9, Y, -0.55, 104.98, Y + 2.0, 0.55, 'x');
  b.box(mats.brass, 104.86, Y + 1.0, 0.3, 104.9, Y + 1.12, 0.42, 'x');
  world.addCollider(104.95, Y, -1.15, 107.25, LOW, 1.15);
  cageLamp(b, world, 104.4, Y + 2.4, 1.4, { dir: '-z', intensity: 0.8 });
  // shaft tunnels: frames along the tunnel walls and crown, handrails beside the walkways
  for (let x = -99; x < -68.5; x += 2.4) for (const [za, zb] of [[3.25, 6.95], [-6.95, -3.25]]) {
    b.box(mats.steelDark, x - 0.05, LOW - 0.25, za, x + 0.05, LOW, zb, 'xXy');
    for (const z of [za, zb]) b.box(mats.steelDark, x - 0.05, Y, z - 0.04, x + 0.05, LOW - 0.25, z + 0.04, 'xXzZ');
  }
  for (const s of [-1, 1]) b.bar(mats.iron, [-99.5, Y + 0.95, s * 3.3], [-68.5, Y + 0.95, s * 3.3], 0.04, 0.04);
  for (const s of [-1, 1]) place2(world, ladder({ h: HLOW - 0.2 }), -102.5, s * 2.9, s > 0 ? Math.PI / 2 : -Math.PI / 2);

  inst.flush();
  b.flush();

  // ============================================================== infos
  const info = (title, x, z, text, radius = 5, y = Y + 1.5) => world.addInfo({ title, x, y, z, text, radius });
  info('Die Kessel der Titanic', 47.4, 0, 'Dampf lieferten 29 Zylinderkessel der schottischen Bauart: 24 doppelendige mit je sechs und fünf einendige mit je drei Feuerungen – zusammen 159 Feuerungen. Die Kessel arbeiteten mit rund 15 bar (215 psi). Bei voller Fahrt verschlangen sie etwa 600 bis 650 Tonnen Kohle am Tag, die Heizer und Trimmer von Hand aus den Bunkern schaufelten.', 6);
  info('Eisbergschaden in Kesselraum 6', 58, 10.3, 'Um 23:40 Uhr streifte der Eisberg die Steuerbordseite. Die Bordwand wurde über rund 90 Meter an mehreren Stellen eingedrückt; Nähte sprangen auf, und hier im Kesselraum 6 schoss Wasser etwa 60 cm über den Flurplatten herein. Der Heizer Frederick Barrett rettete sich im letzten Moment durch die sich schließende wasserdichte Tür nach Kesselraum 5.', 4);
  info('Der Bunkerbrand', 48.3, 6.4, 'Schon bei der Abfahrt aus Southampton schwelte im Steuerbord-Kohlenbunker an der vorderen Querwand von Kesselraum 5 ein Feuer. Heizer bekämpften es tagelang, indem sie den Bunker leerschaufelten; gelöscht war es erst am 13. April. Das angrenzende Schott soll dabei verzogen und verfärbt worden sein.', 3.5);
  info('Wasserdichte Türen', 35.6, 0, 'Fünfzehn Querschotte teilten den Rumpf in sechzehn Abteilungen. Die Türen auf Höhe des Tank Tops waren Falltüren, die von der Brücke aus elektrisch ausgelöst werden konnten; Erster Offizier Murdoch schloss sie unmittelbar nach der Kollision um etwa 23:40 Uhr. Schwimmer konnten sie bei Wassereinbruch auch selbsttätig schließen.', 3);
  info('Heizer und Trimmer', -14.4, 0, 'Rund 160 Heizer und über 70 Trimmer arbeiteten in Wachen von vier Stunden. Die Trimmer karrten die Kohle aus den Bunkern heran, die Heizer beschickten die Feuerungen, schürten das Feuer mit langen Schüreisen und zogen die Asche. Die Hitze vor den Kesseln war gewaltig, die Luft voller Kohlenstaub.', 4);
  info('Die Kolbendampfmaschinen', -38.5, 0, 'Zwei Vierzylinder-Dreifachexpansionsmaschinen trieben die beiden dreiflügeligen Außenpropeller an; jede leistete rund 15 000 PS. Der Dampf arbeitete nacheinander in einem Hochdruck-, einem Mitteldruck- und zwei Niederdruckzylindern (Hub 1,90 m). Es waren die größten Kolbendampfmaschinen, die bis dahin gebaut worden waren; volle Fahrt entsprach etwa 75 Umdrehungen pro Minute.', 7);
  info('Der Manövrierstand', -31.5, 1.0, 'Zwischen den beiden Maschinen stand der Manövrierstand mit den Empfängern der Maschinentelegrafen. Von der Brücke kamen hier die Befehle an; die wachhabenden Ingenieure steuerten Drehzahl und Drehrichtung über Absperrventile und die dampfbetriebene Umsteuerung.', 3);
  info('Die Niederdruckturbine', -50.0, 3.6, 'Der Abdampf der beiden Kolbenmaschinen strömte mit noch rund 0,6 bar in die Parsons-Niederdruckturbine, die damit weitere etwa 16 000 PS gewann und den vierflügeligen Mittelpropeller antrieb. Die Turbine lief nur vorwärts; beim Manövrieren und bei Rückwärtsfahrt leiteten Umschaltventile den Dampf direkt in die Kondensatoren. Ihr Läufer wog rund 130 Tonnen.', 5);
  info('Die elektrische Zentrale', -60.0, 10.5, 'Vier dampfgetriebene Generatoren mit je 400 kW erzeugten den Strom für Licht, Lüfter, Aufzüge, Funkstation und Kombüsen. Die Ingenieure und Elektriker hielten sie bis wenige Minuten vor dem Untergang in Betrieb, damit Licht und Funk arbeiteten. Keiner der 35 Ingenieure, Elektriker und Maschinenoffiziere überlebte.', 4);
  info('Wellentunnel und Propeller', -84, 3.85, 'Durch die Wellentunnel liefen die Wellen der beiden Außenpropeller, getragen von Stehlagern, die regelmäßig geschmiert und kontrolliert wurden. Die Außenpropeller hatten drei Flügel und rund 7 m Durchmesser, der von der Turbine angetriebene Mittelpropeller vier Flügel und rund 5 m.', 5);
  info('Der Feuermannstunnel', 90, 0, 'Die Heizer wohnten im Bug. Über Wendeltreppen und diesen Tunnel unter den Laderäumen gelangten sie direkt in die Kesselräume, ohne die Passagierbereiche zu betreten. Bei Wachwechsel zogen hier jeweils Dutzende Männer zur Arbeit.', 5);

  plan.finish();
  return {
    update(dt, t) { for (const f of anim) f(t); },
  };

  function place2(w, prop, x, z, rot) { prop.position.set(x, Y, z); prop.rotation.y = rot; w.zone(DECK, x).add(prop); }
}
