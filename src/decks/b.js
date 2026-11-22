// B deck ("Bridge Deck") – complete layout of the enclosed superstructure x -72..78, bow → stern.
// Forward: first-class staterooms, forward Grand Staircase with lifts and entrance halls; the two Parlour Suites with
// their private promenades; more staterooms; aft Grand Staircase, restaurant reception, the à la carte restaurant and the
// Café Parisien; aft: second-class staircases, smoking room and bar, lavatories and deck stewards.
import { buildDeckShell, createDeckPlan, SIDES, wardrobe, trunk } from '../interior/kit.js';
import * as H from './b-hero.js';
import { BM } from './bc-util.js';

const deck = 'B';
// longitudinal lines (wall centre lines, |z|)
const CI = 6.2, CO = 7.8, CC = (CI + CO) / 2;   // 1st-class corridors either side, 1.6 m
const PZ = 11.3;                                // inboard wall of the private promenades
const XF = 77.85, XA = -71.85;                  // inner faces of the exterior end walls (exterior module owns them)

const CABIN_STYLES = ['damaskRed', 'whitePanel', 'damaskGreen', 'whiteGold', 'damaskBlue', 'mahoganyDado', 'oakDado', 'whitePanel', 'damaskGold'];
const CABIN_FLOORS = ['carpetRed', 'carpetBlue', 'carpetGreen', 'carpetRed'];

const T = {
  grandFwd: 'Die vordere Große Treppe verband sechs Decks vom Bootsdeck bis hinunter zum E-Deck. Auf dem B-Deck lag ihr Absatz zwischen den Staterooms der Ersten Klasse; geschnitzte Eichenvertäfelung, schmiedeeiserne Geländer mit vergoldeten Bronzeornamenten und ein Linoleumboden in Fliesenoptik prägten die Halle. Unmittelbar vor der Treppe lagen die drei Aufzüge der Ersten Klasse mit ihren Ziergittern.',
  vest: 'Seitlich der Großen Treppe lagen die Eingangshallen der Ersten Klasse mit Pfortentüren in der Bordwand. Durch solche Türen konnten Passagiere und Gepäck an Bord kommen, ohne die Decks der anderen Klassen zu berühren. Der Haupteingang beim Einschiffen in Southampton und Cherbourg lag jedoch tiefer, im Empfangsraum auf dem D-Deck.',
  ismay: 'Die beiden Parlour-Suiten des B-Decks waren die teuersten Unterkünfte an Bord; eine Überfahrt kostete in der Hauptsaison bis zu 870 Pfund. Die Suite B 52–56 war ursprünglich für den Bankier J. P. Morgan vorgesehen, dem die Reederei über seinen Trust gehörte. Bewohnt wurde sie schließlich von J. Bruce Ismay, dem Vorsitzenden der White Star Line, der den Untergang in einem der letzten Rettungsboote überlebte.',
  cardeza: 'In der zweiten Parlour-Suite B 51–55 reiste Charlotte Drake Cardeza aus Philadelphia mit ihrem Sohn Thomas, ihrer Zofe und dessen Kammerdiener. Für die Gruppe wurden 512 Pfund, 6 Shilling und 7 Pence bezahlt – einer der höchsten Fahrpreise der Jungfernfahrt. Ihr Gepäck umfasste 14 Schrankkoffer; alle vier überlebten in Rettungsboot 3.',
  prom: 'Nur die beiden Parlour-Suiten besaßen ein eigenes Promenadendeck von rund 15 Metern Länge an der Bordwand – auf dem Schwesterschiff Olympic gab es das nicht. Die Wände waren in Fachwerk nach Art der Tudorzeit gestaltet, Korbmöbel und Pflanzen machten es zu einem privaten Wintergarten mit Blick aufs Meer. Wer hier saß, wurde von keinem anderen Passagier gesehen.',
  ritz: 'Das À-la-carte-Restaurant wurde nicht von der White Star Line, sondern vom Londoner Gastronomen Luigi Gatti betrieben. Gäste der Ersten Klasse konnten hier von 8 bis 23 Uhr nach der Karte speisen; wer ganz auf die Mahlzeiten im Speisesaal verzichtete, erhielt einen Nachlass auf den Fahrpreis. Der Saal im Stil Louis XVI war mit hellem französischem Nussbaum und vergoldeten Schnitzereien getäfelt, der Teppich zeigte ein rosenfarbenes Muster, und jeder Tisch trug eine Lampe mit rosa Seidenschirm. Am Abend des 14. April 1912 gaben George und Eleanor Widener hier ein Essen zu Ehren von Kapitän Smith.',
  cafe: 'Das Café Parisien war eine Neuheit der Titanic: ein Straßencafé nach Pariser Vorbild an der Steuerbordseite, mit großen Fenstern zum Meer, weißen Rankgittern mit Efeu und Korbmöbeln. Es wurde aus der Küche des À-la-carte-Restaurants versorgt und war besonders bei jüngeren Passagieren der Ersten Klasse beliebt.',
  reception: 'Vor dem À-la-carte-Restaurant lag ein Empfangsraum, in dem sich die Gäste vor dem Essen trafen. Er war wie das Restaurant im Stil Louis XVI gehalten und mit Sofas, Sesseln und Palmen ausgestattet; von hier führten Türen in den Speisesaal und zum Café Parisien.',
  grandAft: 'Die hintere Große Treppe reichte vom Bootsdeck bis zum C-Deck und war kleiner als die vordere, aber ebenso in Eiche ausgeführt. Auf dem B-Deck öffnete sie sich zum Empfangsraum des À-la-carte-Restaurants.',
  galley: 'Das Restaurant hatte eine eigene Küche mit Anrichte, unabhängig von den großen Bordküchen auf dem D-Deck. Köche und Kellner waren Angestellte Luigi Gattis, nicht der Reederei; viele stammten aus Italien und Frankreich. Von den rund 66 Angestellten des Restaurants überlebten nur drei den Untergang.',
  smoke: 'Der Rauchsalon der Zweiten Klasse lag achtern auf dem B-Deck und war – wie damals üblich – den Herren vorbehalten. Eichenvertäfelung im Stil Louis XVI, mit dunkelgrünem Leder bezogene Stühle und ein Boden aus Linoleumfliesen gaben ihm den Charakter eines Clubs; Getränke kamen aus der angrenzenden Bar. Die Ausstattung entsprach der Ersten Klasse älterer Schiffe.',
  second: 'Die Zweite Klasse hatte zwei eigene Treppenhäuser. Dieses vordere reichte vom F-Deck bis zum Bootsdeck, wo der Eingang der Zweiten Klasse lag, und wurde von einem eigenen elektrischen Aufzug begleitet – ein Luxus, den 1912 kaum ein anderes Schiff der Zweiten Klasse bot.',
  secondAft: 'Das hintere Treppenhaus der Zweiten Klasse endete auf dem B-Deck. Von hier führten Türen auf das offene Achterdeck des B-Decks, das den Passagieren der Zweiten Klasse als Promenade diente.',
};

export async function build(world) {
  buildDeckShell(world, deck);
  const plan = createDeckPlan(world, deck, { wall: 'whitePanel', floor: 'carpetRed' });

  const SVC = { type: 'service', wall: 'paintWhite', floor: 'linoRed', lamp: 'dome' };
  const WET = { type: 'bath', wall: 'tile', floor: 'tile' };
  const room = (id, name, x0, x1, z0, z1, furnish, doors, o = {}) => plan.room({ id: 'B-' + id, name, x0, x1, z0, z1, furnish, doors, ...o });
  const gang = (id, name, x0, x1, z0, z1, o = {}) => plan.corridor({ id: 'B-' + id, name, x0, x1, z0, z1, ...o });
  const dP = (at, o = {}) => ({ side: 'port', at, ...o }), dS = (at, o = {}) => ({ side: 'stbd', at, ...o });
  const dA = (at, o = {}) => ({ side: 'aft', at, ...o }), dF = (at, o = {}) => ({ side: 'fwd', at, ...o });
  const SN = (s) => (s < 0 ? 'Backbord' : 'Steuerbord');
  const zr = (s, a, b) => (s < 0 ? { z0: -b, z1: -a } : { z0: a, z1: b }); // band a..b (|z|) on side s
  const noSide = (...xs) => SIDES.filter((q) => !xs.includes(q));

  // first-class stateroom row along x; numbers fall towards the bow (aft-most cabin gets `start`)
  let styleIdx = 0;
  const cabins = ({ x0, x1, z0, z1, count, side, start, suite = false, last }) => {
    const pitch = (x1 - x0) / count, dw = 0.9;
    for (let i = 0; i < count; i++) {
      const lo = x0 + i * pitch, hi = lo + pitch, mirror = i % 2 === 1, n = start - 2 * i, label = 'B' + n;
      const k = styleIdx++;
      plan.room({
        id: label, name: `Kabine B ${n}`, type: 'cabin', cls: 'first', group: '1. Klasse', x0: lo, x1: hi, z0, z1,
        wall: CABIN_STYLES[k % CABIN_STYLES.length], floor: CABIN_FLOORS[k % CABIN_FLOORS.length],
        furnish: suite ? { preset: 'cabinFirstSuite' } : { preset: 'cabinFirst', beds: k % 3 === 0 ? 1 : 2 },
        doors: [{ side, at: mirror ? hi - 0.2 - dw / 2 : lo + 0.2 + dw / 2, w: dw, label, hinge: mirror ? 'hi' : 'lo' }],
        walls: last && i === count - 1 ? noSide(last) : undefined,
      });
    }
  };

  // ============================================================== x 37.5..48  forward Grand Staircase, lifts, entrance halls
  const LF = { x0: 37.5, x1: 48, z0: -CO, z1: CO };
  plan.room({
    id: 'B-treppe-v', name: 'Große Treppe (vorn) – B-Deck', type: 'lobby', stairs: true, ...LF, wall: 'oakPanel', floor: 'linoCream', lamp: 'bowl',
    teleport: { name: 'Große Treppe – B-Deck', group: '1. Klasse', x: 45.0, z: 0, yaw: Math.PI },
    info: { title: 'Große Treppe – B-Deck', x: 42.0, z: 5.4, radius: 5, text: T.grandFwd },
    furnish: () => H.grandLobby(plan, LF),
  });
  for (const s of [-1, 1]) { plan.opening(LF.x1, s * CI, LF.x1, s * CO); plan.opening(LF.x0, s * CI, LF.x0, s * CO); }
  for (const s of [-1, 1]) {
    const R = { x0: 37.5, x1: 46, ...zr(s, CO, 99) };
    room(`vest-${s < 0 ? 'bb' : 'stb'}`, `Eingangshalle 1. Klasse (${SN(s)})`, R.x0, R.x1, R.z0, R.z1, () => H.vestibule(plan, R, s),
      [{ side: s < 0 ? 'stbd' : 'port', at: 41.75, w: 3.0, h: 2.3, leaf: false }],
      { type: 'lobby', wall: 'oakPanel', floor: 'linoCream', lamp: 'bowl', group: '1. Klasse',
        teleport: s > 0 ? { name: 'Eingangshalle 1. Klasse (B-Deck)', group: '1. Klasse', x: 42.4, z: 9.0, yaw: -Math.PI / 2 } : undefined,
        info: s > 0 ? { title: 'Eingangshallen der Ersten Klasse (B-Deck)', x: 42.4, z: 11.0, radius: 3.5, text: T.vest } : undefined });
  }

  // ============================================================== x 46..77.85  forward staterooms B 1 – B 32
  for (const s of [-1, 1]) {
    gang(`gang-v-${s < 0 ? 'bb' : 'stb'}`, `Kabinengang vorn (${SN(s)})`, 48, 76.25, ...Object.values(zr(s, CI, CO)), {
      handrail: true, teleport: { name: `Kabinengang vorn (${SN(s)})`, group: '1. Klasse', x: 66.5, z: s * CC, yaw: 0 } });
  }
  gang('quer-v', 'Querflur am Vorderende', 76.25, XF, -CO, CO, {});
  gang('quer-f1', 'Querflur vor Schornsteinschacht 1', 59.5, 61.1, -CI, CI, {});
  for (const s of [-1, 1]) {
    const odd = s < 0 ? 1 : 0; // port: odd numbers, starboard: even numbers
    const cs = s < 0 ? 'stbd' : 'port', is = s < 0 ? 'port' : 'stbd';
    cabins({ x0: 46, x1: XF, ...zr(s, CO, 99), count: 9, side: cs, start: 18 - odd, last: 'fwd' });          // outside B 1/2 – B 17/18
    cabins({ x0: 61.1, x1: 76.25, ...zr(s, 3, CI), count: 4, side: is, start: 26 - odd });                // inside B 19/20 – B 25/26
    cabins({ x0: 52.5, x1: 59.5, ...zr(s, 3, CI), count: 2, side: is, start: 30 - odd });                 // beside funnel casing 1
    cabins({ x0: 48, x1: 52.5, ...zr(s, 0, CI), count: 1, side: is, start: 32 - odd });                   // behind the lift shafts
  }
  room('bad-v', 'Badezimmer (vorn)', 61.1, 68.675, 0, 3, { preset: 'bathroom', shower: true }, [dA(1.5)], WET);
  room('wc-v', 'Herrentoiletten (vorn)', 61.1, 68.675, -3, 0, 'wc', [dA(-1.5)], WET);
  room('anrichte-v', 'Anrichte der Kabinenstewards (vorn)', 68.675, 76.25, 0, 3, 'pantry', [dF(1.5)], { ...SVC, floor: 'tile' });
  room('waesche-v', 'Wäschekammer (vorn)', 68.675, 76.25, -3, 0, 'linen', [dF(-1.5)], SVC);

  // ============================================================== x 14..37.5  Parlour Suites + private promenades
  const SUITE = {
    1: { n: [52, 54, 56], who: 'Ismay', tele: 'Parlour-Suite B52–56 (Ismay)', prom: 'Privates Promenadendeck',
      sit: { wall: 'lxvi', floor: 'carpetBlue', fo: { sty: 'lxvi', cover: 'fabricGold', wood: 'mahogany', fire: 'marble' } },
      bedF: { wall: 'empireB', floor: 'carpetGreen', fo: { sty: 'empire', cover: 'fabricGreen' } },   // Empire
      bedA: { wall: 'qanneB', floor: 'carpetRed', fo: { sty: 'qanne', cover: 'fabricRed' } } },              // Queen Anne
    '-1': { n: [51, 53, 55], who: 'Cardeza', tele: 'Parlour-Suite B51–55 (Cardeza)', prom: 'Privates Promenadendeck (Cardeza)',
      sit: { wall: 'adam', floor: 'carpetGreen', fo: { sty: 'adam', cover: 'fabricGreen', wood: 'mahogany', fire: 'marble' } },
      bedF: { wall: 'lxvB', floor: 'carpetBlue', fo: { sty: 'lxv', cover: 'fabricBlue' } },      // Louis XV
      bedA: { wall: 'renB', floor: 'carpetRed', fo: { sty: 'renaiss', cover: 'fabricRed' } } },   // Italian Renaissance
  };
  for (const s of [1, -1]) {
    const S = SUITE[s], band = zr(s, CO, PZ), full = zr(s, CO, 99), cs = s < 0 ? 'stbd' : 'port', ps = s < 0 ? 'port' : 'stbd';
    const zi = s * 8.5; // interconnecting doors close to the corridor wall
    const nm = `B ${S.n[0]}–${S.n[2]}`, G = { group: '1. Klasse', type: 'suite', cls: 'first' };
    plan.room({ id: 'B' + S.n[0], name: `Schlafzimmer B ${S.n[0]} (Parlour-Suite ${nm})`, x0: 32.5, x1: 37.5, ...band, ...S.bedF, ...G, lamp: 'bowl',
      furnish: H.suiteBedroom, doors: [{ side: cs, at: 36.6, label: 'B' + S.n[0] }, { side: ps, at: 34.0 }, dA(zi)] });
    plan.room({ id: 'B' + S.n[1], name: `Wohnzimmer B ${S.n[1]} (Parlour-Suite ${nm})`, x0: 26.5, x1: 32.5, ...band, ...S.sit, ...G, lamp: 'chandelier',
      furnish: H.suiteSitting, doors: [{ side: cs, at: 31.4, label: 'B' + S.n[1] }, { side: ps, at: 29.5, w: 1.2 }, dA(zi)],
      teleport: { name: S.tele, group: '1. Klasse' },
      info: { title: s > 0 ? 'Parlour-Suite B 52–56 (J. Bruce Ismay)' : 'Parlour-Suite B 51–55 (Familie Cardeza)', text: s > 0 ? T.ismay : T.cardeza } });
    plan.room({ id: 'B' + S.n[2], name: `Schlafzimmer B ${S.n[2]} (Parlour-Suite ${nm})`, x0: 21.5, x1: 26.5, ...band, ...S.bedA, ...G, lamp: 'bowl',
      furnish: H.suiteBedroom, doors: [{ side: cs, at: 25.6, label: 'B' + S.n[2] }, { side: ps, at: 23.0 }, dA(zi)] });
    room(`bad-suite-${S.who}`, `Badezimmer der Parlour-Suite ${nm}`, 19, 21.5, full.z0, full.z1, H.suiteBath, [dA(zi)], { ...WET, ...G, type: 'bath', wall: 'marbleB', floor: 'marble' });
    room(`garderobe-${S.who}`, `Garderobe der Parlour-Suite ${nm}`, 16.6, 19, full.z0, full.z1, (ctx) => {
      for (const p of [['far:lo', 'far:hi'], ['left:hi', 'right:hi'], ['right:hi', 'left:mid'], ['left:mid', 'right:mid']]) ctx.fit(wardrobe({ mirror: true, mat: 'mahogany' }), p);
      ctx.fit(trunk({ big: true }), ['far:mid', 'far:hi', 'left:lo']); ctx.fit(trunk(), ['right:lo', 'left:lo', 'far:mid'], { collide: false });
    },[{ side: cs, at: 17.8 }], { ...G, wall: 'mahoganyDado', floor: S.sit.floor });
    room(`diener-${S.who}`, `Dienerkabine der Parlour-Suite ${nm}`, 14, 16.6, full.z0, full.z1, { preset: 'cabinSecond', berths: 2 }, [{ side: cs, at: 15.3 }],
      { ...G, type: 'cabin', wall: 'whitePanel', floor: 'carpetBlue' });
    const RP = { x0: 21.5, x1: 37.5, ...zr(s, PZ, 99) };
    plan.room({ id: `B-prom-${S.who}`, name: `Privates Promenadendeck der Suite ${nm}`, type: 'promenade', ...RP, wall: 'tudor', floor: 'deckWood', lamp: 'bowl', group: '1. Klasse',
      teleport: { name: S.prom, group: '1. Klasse', x: 36.2, z: s * 12.1, yaw: Math.PI },
      info: s > 0 ? { title: 'Privates Promenadendeck', x: 30, z: s * 12.6, radius: 4, text: T.prom } : undefined,
      furnish: (ctx) => H.privatePromenade(ctx, RP, s, [34.0, 29.5, 23.0]) });
  }

  // ============================================================== x 2..37.5  corridors and staterooms around funnels 2 and 3
  for (const s of [-1, 1]) {
    gang(`gang-m-${s < 0 ? 'bb' : 'stb'}`, `Gang an den Parlour-Suiten (${SN(s)})`, 2, 37.5, ...Object.values(zr(s, CI, CO)), {
      handrail: true, teleport: { name: `Kabinengang mittschiffs (${SN(s)})`, group: '1. Klasse', x: 12.0, z: s * CC, yaw: 0 } });
  }
  gang('quer-m', 'Querflur zwischen den Schornsteinschächten', 22.2, 23.8, -CI, CI, {});
  for (const s of [-1, 1]) {
    const odd = s < 0 ? 1 : 0, is = s < 0 ? 'port' : 'stbd', cs = s < 0 ? 'stbd' : 'port';
    cabins({ x0: 30.5, x1: 37.5, ...zr(s, 3, CI), count: 2, side: is, start: 60 - odd });   // B 57/58 – B 59/60 beside funnel 2
    cabins({ x0: 23.8, x1: 30.5, ...zr(s, 3, CI), count: 2, side: is, start: 64 - odd });
    cabins({ x0: 15.5, x1: 22.2, ...zr(s, 3, CI), count: 2, side: is, start: 68 - odd });
    cabins({ x0: 2, x1: 14, ...zr(s, CO, 99), count: 3, side: cs, start: 74 - odd, suite: true }); // outside, large
    cabins({ x0: 8.5, x1: 15.5, ...zr(s, 3, CI), count: 2, side: is, start: 78 - odd });   // beside funnel 3
    cabins({ x0: 2, x1: 8.5, ...zr(s, 0, CI), count: 2, side: is, start: 82 - odd });
  }
  room('anrichte-m', 'Anrichte der Kabinenstewards (mittschiffs)', 23.8, 30.5, 0, 3, 'pantry', [dA(1.5)], { ...SVC, floor: 'tile' });
  room('waesche-m', 'Wäschekammer (mittschiffs)', 23.8, 30.5, -3, 0, 'linen', [dA(-1.5)], SVC);
  room('bad-m', 'Badezimmer (mittschiffs)', 15.5, 22.2, 0, 3, { preset: 'bathroom', shower: true }, [dF(1.5)], WET);
  room('wc-m', 'Damentoiletten (mittschiffs)', 15.5, 22.2, -3, 0, 'wc', [dF(-1.5)], WET);

  // ============================================================== x -6.5..2  aft Grand Staircase
  const LA = { x0: -6.5, x1: 2, z0: -CO, z1: CO };
  plan.room({
    id: 'B-treppe-a', name: 'Große Treppe (achtern) – B-Deck', type: 'lobby', stairs: true, ...LA, wall: 'oakPanel', floor: 'linoCream', lamp: 'bowl',
    teleport: { name: 'Große Treppe (achtern) – B-Deck', group: '1. Klasse', x: 0.9, z: 0, yaw: Math.PI },
    info: { title: 'Hintere Große Treppe – B-Deck', x: -1.5, z: 5.5, radius: 4, text: T.grandAft },
    furnish: () => H.aftLobby(plan, LA),
  });
  for (const s of [-1, 1]) { plan.opening(LA.x1, s * CI, LA.x1, s * CO); plan.opening(LA.x0, s * 3, LA.x0, s * CO); }
  for (const s of [-1, 1]) cabins({ x0: -6.5, x1: 2, ...zr(s, CO, 99), count: 2, side: s < 0 ? 'stbd' : 'port', start: 86 - (s < 0 ? 1 : 0) }); // B 83 – B 86

  // ============================================================== x -13.5..-6.5  restaurant reception (either side of funnel casing 4)
  for (const s of [-1, 1]) {
    const R = { x0: -13.5, x1: -6.5, ...zr(s, 3, 99) };
    room(s < 0 ? 'empfang-bb' : 'empfang-stb', s < 0 ? 'Empfangsraum des Restaurants' : 'Vorraum zum Café Parisien', R.x0, R.x1, R.z0, R.z1, (ctx) => H.reception(ctx, R, s),
      s < 0 ? [dA(-8.5, { w: 1.8, leaf: false })] : [dA(5.7, { w: 1.2 }), dA(11.2, { w: 1.6, leaf: false })],
      { type: 'lobby', wall: 'ritz', floor: BM().roseCarpet, lamp: false, group: '1. Klasse',
        teleport: s < 0 ? { name: 'Empfangsraum des Restaurants', group: '1. Klasse', x: -7.3, z: -5.4, yaw: Math.PI } : undefined,
        info: s < 0 ? { title: 'Empfangsraum des À-la-carte-Restaurants', text: T.reception } : undefined });
  }

  // ============================================================== x -24..-13.5  À la carte restaurant, Café Parisien
  const RR = { x0: -24, x1: -13.5, z0: -99, z1: 8.4 };
  plan.room({
    id: 'B-restaurant', name: 'À-la-carte-Restaurant', type: 'restaurant', ...RR, wall: 'ritz', floor: BM().roseCarpet, lamp: false, group: '1. Klasse',
    doors: [dS(-18.75, { w: 1.6, leaf: false })],
    teleport: { name: 'À-la-carte-Restaurant', group: '1. Klasse', x: -14.3, z: -8.5, yaw: Math.PI },
    info: { title: 'À-la-carte-Restaurant „Ritz“', x: -18.75, z: -8.0, radius: 6, text: T.ritz },
    furnish: (ctx) => H.restaurant(ctx, RR),
  });
  const RC = { x0: -36, x1: -13.5, z0: 8.4, z1: 99 };
  plan.room({
    id: 'B-cafe', name: 'Café Parisien', type: 'cafe', ...RC, wall: 'cafe', floor: 'linoCream', lamp: 'bowl', group: '1. Klasse',
    doors: [dA(11.0)],
    teleport: { name: 'Café Parisien', group: '1. Klasse', x: -14.6, z: 11.2, yaw: Math.PI },
    info: { title: 'Café Parisien', x: -25, z: 11.0, radius: 6, text: T.cafe },
    furnish: (ctx) => H.cafe(ctx, RC),
  });

  // ============================================================== x -38.5..-24  restaurant galley, pantry, staff (engine casing in the middle)
  room('anrichte-r', 'Anrichte des Restaurants', -30, -24, 3, 8.4, 'pantry', [dF(5.7, { w: 1.0 }), dS(-27)], { ...SVC, floor: 'tile' });
  room('personal-r', 'Aufenthaltsraum des Restaurantpersonals', -36, -30, 3, 8.4, { preset: 'mess' }, [dA(5.7), dF(5.7)], { ...SVC, type: 'crew', group: 'Besatzung' });
  room('kueche-r', 'Küche des À-la-carte-Restaurants', -38.5, -24, -99, -3, 'galley', [dF(-8.5, { w: 1.2 }), dS(-37.25)], {
    ...WET, type: 'galley', lamp: 'dome', group: 'Besatzung',
    teleport: { name: 'Küche des À-la-carte-Restaurants', group: 'Besatzung' },
    info: { title: 'Küche des À-la-carte-Restaurants', text: T.galley } });
  gang('gang-personal', 'Personalgang hinter dem Maschinenschacht', -38.5, -36, -3, 99, { wall: 'paintWhite', floor: 'linoRed', lamp: 'dome' });

  // ============================================================== x -47.5..-38.5  2nd class staircase ('second') + neighbours
  plan.room({
    id: 'B-treppe-2', name: 'Treppenhaus 2. Klasse – B-Deck', type: 'lobby', stairs: true, cls: 'second', x0: -47.5, x1: -38.5, z0: -4.5, z1: 4.5,
    wall: 'oakPanel', floor: 'linoBlue', lamp: 'bowl', doors: [dA(0, { w: 1.6, leaf: false })],
    teleport: { name: 'Treppenhaus 2. Klasse – B-Deck', group: '2. Klasse', x: -47.0, z: 3.1, yaw: 0 },
    info: { title: 'Treppenhaus der Zweiten Klasse (B-Deck)', x: -43, z: 3.2, radius: 3.5, text: T.second },
    furnish: () => { for (const s of [-1, 1]) H.stairBench(plan, -40.9, s * 4.15, s > 0 ? H.NZ : H.PZ); },
  });
  room('steward-2', 'Stewardraum 2. Klasse', -47.5, -38.5, 4.5, 9, 'office', [dP(-43)], { ...SVC, cls: 'second', group: 'Besatzung' });
  room('wc-2r', 'Herrentoiletten am Rauchsalon', -47.5, -38.5, 9, 99, 'wc', [dA(11.5)], { ...WET, cls: 'second' });
  room('umkleide-r', 'Umkleideraum des Restaurantpersonals', -47.5, -38.5, -8.5, -4.5, H.lockerRoom, [dF(-6.5)], { ...SVC, type: 'crew', group: 'Besatzung' });
  room('vorrat-r', 'Vorratskammer des Restaurants', -47.5, -38.5, -99, -8.5, 'store', [dF(-11.2)], { ...SVC, type: 'store' });

  // ============================================================== x -59..-47.5  2nd class smoking room and bar
  const RS = { x0: -59, x1: -47.5, z0: -8.5, z1: 99 };
  plan.room({
    id: 'B-rauchsalon-2', name: 'Rauchsalon 2. Klasse', type: 'saloon', cls: 'second', ...RS, wall: 'oakLXVI', floor: 'linoRed', lamp: false, group: '2. Klasse',
    teleport: { name: 'Rauchsalon 2. Klasse', group: '2. Klasse', x: -58.3, z: 0, yaw: 0 },
    info: { title: 'Rauchsalon der Zweiten Klasse', x: -53.25, z: 3.7, radius: 6, text: T.smoke },
    furnish: (ctx) => H.smokingRoom(ctx, RS),
  });
  room('bar-2', 'Bar 2. Klasse', -53, -47.5, -99, -8.5, (ctx) => H.barRoom(ctx, -51.6), [dS(-48.6)], { type: 'service', cls: 'second', wall: 'oak', floor: 'linoRed' });
  H.hatch(plan, -52.6, -50.6, -8.5, { neg: 'oak', pos: 'oak', frame: 'oak' });
  room('barlager-2', 'Vorratsraum der Bar', -59, -53, -99, -8.5, 'store', [dS(-56)], { ...SVC, type: 'store' });

  // ============================================================== x -71.85..-59  aft 2nd class staircase ('secondAft'), exit to the open deck
  const aftWalls = noSide('aft'); // the aft end wall belongs to the exterior module (doors to the open B deck at z = ±5)
  plan.room({
    id: 'B-treppe-2a', name: 'Hinteres Treppenhaus 2. Klasse – B-Deck', type: 'lobby', stairs: true, cls: 'second', x0: XA, x1: -59, z0: -6.5, z1: 6.5,
    walls: aftWalls, wall: 'oakPanel', floor: 'linoBlue', lamp: 'bowl', doors: [dF(0, { w: 1.6, leaf: false })],
    teleport: { name: 'Hinteres Treppenhaus 2. Klasse – B-Deck', group: '2. Klasse', x: -69.6, z: 3.0, yaw: 0 },
    info: { title: 'Hinteres Treppenhaus der Zweiten Klasse', x: -69.5, z: 2.8, radius: 3.5, text: T.secondAft },
    furnish: () => { for (const s of [-1, 1]) H.stairBench(plan, -65.5, s * 6.15, s > 0 ? H.NZ : H.PZ); },
  });
  for (const s of [-1, 1]) {
    const z = zr(s, 6.5, 99), ds = s < 0 ? dS : dP;
    room(s < 0 ? 'wc-2-herren' : 'wc-2-damen', s < 0 ? 'Herrentoiletten 2. Klasse' : 'Damentoiletten 2. Klasse', XA, -65.5, z.z0, z.z1, 'wc', [ds(-68.7)], { ...WET, cls: 'second', walls: aftWalls });
    if (s > 0) room('decksteward', 'Raum der Decksstewards', -65.5, -59, z.z0, z.z1, H.deckStewards, [ds(-62.2)], { ...SVC, type: 'crew', group: 'Besatzung' });
    else room('decksstore', 'Decksstore (Liegestühle und Decken)', -65.5, -59, z.z0, z.z1, 'store', [ds(-62.2)], { ...SVC, type: 'store' });
  }

  const res = plan.finish();
  if (res.problems.length) console.warn(`[deck B] ${res.problems.length} kit problems`);
  return {};
}
