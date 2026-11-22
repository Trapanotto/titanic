// A deck – hand-detailed public rooms: forward Grand Staircase with the lifts, Lounge, Reading & Writing Room,
// Smoking Room, Verandah Cafés, aft Grand Staircase, second-class landing and entrance, bar pantry.
import {
  fireplace, bookcase, settee, sofa, armchair, tableRound, pottedPalm, column, liftCage, writingDesk, chairDining, trellis,
  bench, backBar, barCounter, shelves, sink, clockWall, PRESETS, kitMats,
} from '../interior/kit.js';
import { detailer, wput, reserveExtDoors, group, wx, wz, aWindows, extDoorSpans, deckMats, statue, ROT } from './boat-util.js';

const HW = 10.15; // inner face of the A-deck house side walls

/** line both exterior side walls between x0..x1 */
function lineSides(d, x0, x1, o) {
  for (const s of [-1, 1]) d.lineExterior(wx(s * HW, -s), x0, x1, { ...o, wins: aWindows(s), doors: extDoorSpans('A', s, 10.3) });
}
/** panels on a wall face over several intervals */
function panelRuns(d, w, runs, o) { for (const [a, b] of runs) if (b - a > 0.3) d.panels(w, a, b, o); }

// ---------------------------------------------------------------------------------------------- forward Grand Staircase

function liftShafts(ctx, d) {
  const x0 = 45.5, x1 = 47.45, H = d.H, Y = d.Y;
  // side walls, posts, frieze with gilt band
  for (const s of [-1, 1]) d.box('oakPanel', x0, s * 2.4, x1, s * 2.48, 0, H);
  for (const z of [-2.4, -0.8, 0.8, 2.4]) { d.box('oak', x0 - 0.09, z - 0.09, x0 + 0.02, z + 0.09, 0, H); d.box('gold', x0 - 0.1, z - 0.1, x0 + 0.03, z + 0.1, 2.05, 2.12); }
  d.box('oak', x0 - 0.07, -2.48, x0 + 0.02, 2.48, 2.12, H);
  d.box('gold', x0 - 0.085, -2.48, x0 - 0.07, 2.48, 2.5, 2.54);
  for (const zc of [-1.6, 0, 1.6]) {
    d.wquad(kitMats.ironwork, wz(x0, -1), zc - 0.71, zc + 0.71, 0.05, 2.05, 0.012);         // ornate folding gate
    d.box('brass', x0 - 0.05, zc - 0.71, x0 - 0.01, zc + 0.71, 1.0, 1.04);
    d.b.disc(kitMats.clockFace, [x0 - 0.075, Y + 2.31, zc], [-1, 0, 0], 0.09, 12, true);       // floor indicator
    d.b.ring(kitMats.bronze ?? kitMats.plate, [x0 - 0.08, Y + 2.31, zc], [-1, 0, 0], 0.09, 0.12, 12);
    ctx.plan.prop(liftCage(), 46.45, zc, Math.PI, { collide: false });
  }
  d.world.addCollider(x0 - 0.1, Y, -2.5, 47.5, Y + H, 2.5);
  ctx.occupied.push({ x0: 45.3, x1: 47.5, z0: -2.6, z1: 2.6 });
}

export function furnishHallFwd(ctx) {
  const d = detailer(ctx), H = d.H;
  reserveExtDoors(ctx);
  liftShafts(ctx, d);
  lineSides(d, 37.55, 47.45, { wall: 'oakPanel', wainscot: 'oak', cornice: 'gold', dado: 'oak', reveal: 'oak', panels: { mat: 'oakPanel', pitch: 1.0 } });
  const P = { mat: 'oakPanel', orn: 'gold', pitch: 1.1, y0: 0.95, y1: H - 0.3 };
  const aw = wz(37.55, 1), fw = wz(47.45, -1);
  panelRuns(d, aw, [[-10.1, -4.55], [-3.2, 3.2], [4.55, 10.1]], P);
  d.pilasters(aw, [-9.95, -7.4, -4.75, -3.05, 0, 3.05, 4.75, 7.4, 9.95], { h: H, w: 0.3 });
  d.sconces(aw, [-8.6, -6.1, -1.6, 1.6, 6.1, 8.6], 1.9);
  panelRuns(d, fw, [[-10.1, -6.95], [-5.45, -2.6], [2.6, 5.45], [6.95, 10.1]], P);
  d.pilasters(fw, [-9.95, -7.05, -5.35, -2.55, 2.55, 5.35, 7.05, 9.95], { h: H, w: 0.3 });
  d.sconces(fw, [-8.5, -4.0, 4.0, 8.5], 1.9);
  for (const s of [-1, 1]) {
    group(ctx, 39.6, s * 6.4, { r: 0.4, n: 4, kind: 'wicker', tmat: 'oak', a0: Math.PI / 4 });
    group(ctx, 44.6, s * 6.4, { r: 0.4, n: 4, kind: 'uph', mat: 'fabricGreen', tmat: 'oak', a0: Math.PI / 4 });
    for (const x of [39.4, 44.6]) wput(ctx, settee({ mat: 'fabricGreen', w: 1.7 }), x, s * 9.75, s < 0 ? 'stbd' : 'port');
    wput(ctx, pottedPalm(), 38.0, s * 9.6, 'fwd', { collide: false });
    wput(ctx, pottedPalm(), 47.0, s * 9.6, 'aft', { collide: false });
    d.coffer(37.6, 47.4, s < 0 ? -10.1 : 3.0, s < 0 ? -3.0 : 10.1, { bead: 'gold', pitchX: 2.45, pitchZ: 2.35 });
  }
}

// ---------------------------------------------------------------------------------------------- Lounge (Louis XV)

export function furnishLounge(ctx) {
  const d = detailer(ctx), H = d.H, Y = d.Y;
  const P = { mat: 'oakPanel', orn: 'gold', frame: 'gold', pitch: 1.15, y0: 0.95, y1: H - 0.32 };
  lineSides(d, 2.05, 18.95, { wall: 'oakPanel', wainscot: 'oak', cornice: 'gold', dado: 'gold', reveal: 'oak', panels: { mat: 'oakPanel', pitch: 0.9 } });
  // boiserie on the end walls and around the funnel-3 casing
  const aw = wz(2.05, 1), fw = wz(18.95, -1);
  panelRuns(d, aw, [[-10.1, -5.45], [-3.55, 3.55], [5.45, 10.1]], P);
  d.pilasters(aw, [-9.95, -7.7, -5.45, -3.55, 0, 3.55, 5.45, 7.7, 9.95], { h: H, w: 0.32 });
  panelRuns(d, fw, [[-10.1, -2.3], [-0.7, 3.15], [4.65, 10.1]], P);
  d.pilasters(fw, [-9.95, -7.4, -4.85, -2.3, -0.7, 1.2, 3.15, 4.65, 7.4, 9.95], { h: H, w: 0.32 });
  const ca = wz(8.5, -1), cf = wz(15.5, 1);
  panelRuns(d, ca, [[-2.95, -1.15], [1.15, 2.95]], P);
  d.pilasters(ca, [-2.85, -1.1, 1.1, 2.85], { h: H, w: 0.3 });
  for (const s of [-1, 1]) {
    const cs = wx(s * 3, s);
    d.panels(cs, 8.6, 15.4, P);
    d.pilasters(cs, [8.65, 12, 15.35], { h: H, w: 0.3 });
    d.sconces(cs, [10.3, 13.7], 1.95);
  }
  d.sconces(aw, [-6.6, 6.6, -2, 2], 1.95);
  d.sconces(fw, [-6.1, 6.1], 1.95);
  // the great fireplace on the casing with the statue of Artemis on the mantel and a carved overmantel
  wput(ctx, fireplace({ mat: 'oak', mirror: false, clock: false }), 8.29, 0, 'aft');
  d.wbox('oakPanel', ca, -1.0, 1.0, 1.24, H - 0.12, 0.05);
  d.wbox('paintCream', ca, -0.42, 0.42, 1.24, 2.3, 0.02, 0.05);
  for (const [a, b, y0, y1] of [[-1.0, 1.0, 2.3, 2.36], [-0.46, -0.42, 1.24, 2.3], [0.42, 0.46, 1.24, 2.3], [-1.0, 1.0, 2.5, 2.55]]) d.wbox('gold', ca, a, b, y0, y1, 0.015, 0.07);
  statue(ctx.plan.zone(8), 8.2, Y + 1.18, 0, ROT.aft, 0.95);
  d.glow(7.9, 0, 0.4, 0xff8a3a, 0.8);
  // lending library on the forward face of the casing
  for (const z of [-1.3, 1.3]) wput(ctx, bookcase({ mat: 'oak', w: 1.6 }), 15.7, z, 'fwd');
  d.panels(cf, -2.95, 2.95, { ...P, skip: [[-2.15, 2.15]] });
  // hearth group, settee on the aft wall
  wput(ctx, sofa({ mat: 'fabricGold', w: 1.8 }), 5.55, 0, 'fwd');
  wput(ctx, tableRound({ r: 0.35, mat: 'oak' }), 6.85, 0, 'fwd');
  wput(ctx, armchair({ kind: 'uph', mat: 'fabricGreen' }), 7.0, 1.45, 'port', { collide: false });
  wput(ctx, armchair({ kind: 'uph', mat: 'fabricGreen' }), 7.0, -1.45, 'stbd', { collide: false });
  wput(ctx, settee({ mat: 'fabricGreen', w: 1.85 }), 2.45, 0, 'fwd');
  // seating groups and card tables
  const covers = ['fabricGreen', 'fabricGold', 'fabricRed'];
  let i = 0;
  for (const s of [-1, 1]) {
    for (const [x, z] of [[4.3, 2.9], [4.3, 7.6], [7.1, 4.9], [7.1, 8.0], [10.2, 5.0], [13.4, 5.0], [10.2, 8.2], [13.4, 8.2], [17.3, 5.0], [17.3, 8.2]]) {
      const card = i % 4 === 3;
      group(ctx, x, s * z, card ? { rect: true, w: 0.8, d: 0.8, n: 4, dining: true, mat: 'fabricGreen', tmat: 'mahogany' } : { r: 0.42, n: i % 3 === 0 ? 3 : 4, kind: 'uph', mat: covers[i % 3], tmat: 'oak', a0: s * 0.3 });
      i++;
    }
  }
  group(ctx, 17.4, 1.9, { rect: true, w: 0.8, d: 0.8, n: 4, dining: true, mat: 'fabricGreen', tmat: 'mahogany' });
  group(ctx, 17.2, -2.6, { rect: true, w: 0.8, d: 0.8, n: 4, dining: true, mat: 'fabricGreen', tmat: 'mahogany' });
  for (const s of [-1, 1]) { wput(ctx, pottedPalm(), 2.6, s * 9.6, 'fwd', { collide: false }); wput(ctx, pottedPalm(), 18.4, s * 9.6, 'aft', { collide: false }); }
  // chandeliers and a coffered ceiling with gilt beads
  d.lamp(5.25, 0, 'chandelier'); d.lamp(17.25, 0, 'chandelier'); d.lamp(12, 6.6, 'chandelier'); d.lamp(12, -6.6, 'chandelier');
  for (const s of [-1, 1]) { d.lamp(4.2, s * 6.9, 'bowl'); d.lamp(17.3, s * 6.6, 'bowl'); }
  d.coffer(2.1, 18.9, -10.1, 10.1, { bead: 'gold', pitchX: 2.8, pitchZ: 2.9 });
}

// ---------------------------------------------------------------------------------------------- Reading & Writing Room

export function furnishReading(ctx) {
  const d = detailer(ctx), H = d.H;
  reserveExtDoors(ctx);
  const P = { mat: 'whitePanel', frame: 'gold', pitch: 1.0, y0: 0.95, y1: H - 0.32 };
  d.lineExterior(wx(-HW, 1), 19.05, 30.45, { wall: 'whitePanel', wainscot: 'whitePanel', cornice: 'gold', dado: 'gold', reveal: 'paintWhite', wins: aWindows(-1), doors: extDoorSpans('A', -1, 10.3), panels: { mat: 'whitePanel', frame: 'gold', pitch: 0.9 } });
  panelRuns(d, wz(19.05, 1), [[-10.1, -2.25], [-0.75, 2.95]], P);
  panelRuns(d, wz(30.45, -1), [[-10.1, -4.55], [-3.25, -1.05], [1.05, 2.95]], P);
  panelRuns(d, wx(2.95, -1), [[19.1, 20.25], [21.75, 27.85], [29.35, 30.4]], P);
  d.pilasters(wz(19.05, 1), [-9.95, -6.2, -2.4, 2.8], { h: H, w: 0.28, mat: 'paintWhite' });
  // bow window: columns and a beam frame the bay with window seats
  d.put(column({ h: H, r: 0.12, mat: 'paintWhite', capital: 'gold' }), 25.55, -8.9, 0, true);
  d.box('paintWhite', 25.4, -HW, 30.45, -8.75, H - 0.3, H);
  d.box('gold', 25.4, -8.78, 30.45, -8.74, H - 0.33, H - 0.3);
  wput(ctx, settee({ mat: 'fabricBlue', w: 1.2 }), 26.7, -9.8, 'stbd');
  wput(ctx, settee({ mat: 'fabricBlue', w: 1.2 }), 29.3, -9.8, 'stbd');
  group(ctx, 28.0, -7.7, { r: 0.35, n: 2, kind: 'uph', mat: 'fabricBlue', tmat: 'mahogany', a0: 0 });
  // white marble fireplace on the casing, fireside chairs
  wput(ctx, fireplace({ mat: 'paintWhite' }), 30.24, 0, 'aft');
  d.glow(30.0, 0, 0.4, 0xff8a3a, 0.7);
  wput(ctx, tableRound({ r: 0.33, mat: 'mahogany' }), 28.7, 0, 'fwd');
  wput(ctx, armchair({ kind: 'uph', mat: 'fabricRed' }), 28.7, 1.0, 'port', { collide: false });
  wput(ctx, armchair({ kind: 'uph', mat: 'fabricRed' }), 28.7, -1.0, 'stbd', { collide: false });
  // writing desks along the aft wall and the inboard wall
  for (const z of [-9.3, -8.0, -6.7, -5.4, -4.1]) if (wput(ctx, writingDesk(), 19.37, z, 'fwd')) wput(ctx, chairDining({ cls: 'first', seat: 'fabricGreen' }), 20.05, z, 'aft', { collide: false });
  for (const x of [22.8, 24.0, 25.2, 26.4]) if (wput(ctx, writingDesk(), x, 2.63, 'port')) wput(ctx, chairDining({ cls: 'first', seat: 'fabricGreen' }), x, 1.95, 'stbd', { collide: false });
  for (const [x, z] of [[22.6, -6.0], [25.6, -5.4], [22.6, -2.6], [25.8, -2.3]]) group(ctx, x, z, { r: 0.4, n: 3, kind: 'uph', mat: 'fabricGreen', tmat: 'mahogany', a0: 0.5 });
  wput(ctx, bookcase({ mat: 'mahogany', w: 1.4 }), 30.25, -6.2, 'aft');
  wput(ctx, pottedPalm(), 19.6, 2.4, 'fwd', { collide: false });
  for (const [x, z] of [[21.6, -7.2], [21.6, -1.8], [27.3, -1.8], [27.9, -9.4]]) d.lamp(x, z, 'bowl');
  d.lamp(24.4, -4.6, 'chandelier');
  d.coffer(19.1, 30.4, -10.1, 2.9, { bead: 'gold', pitchX: 2.85, pitchZ: 3.25 });
}

// ---------------------------------------------------------------------------------------------- Smoking Room (Georgian)

export function furnishSmoking(ctx) {
  const d = detailer(ctx), H = d.H, M = deckMats();
  const P = { mat: 'mahogany', inlay: 'porcelain', frame: 'woodDark', pitch: 1.1, y0: 0.95, y1: H - 0.32 };
  lineSides(d, -35.95, -13.55, { wall: 'mahogany', wainscot: 'mahogany', cornice: 'gold', dado: 'woodDark', reveal: 'woodDark', panels: { mat: 'mahogany', inlay: 'porcelain', pitch: 0.9 } });
  // leaded stained-glass windows, lit from the promenade side
  for (const s of [-1, 1]) for (const [a, b] of aWindows(s)) if (b > -35.95 && a < -13.55) d.wquad(M.stained, wx(s * HW, -s), a, b, 0.9, 2.25, 0.006);
  // fireplace with "Plymouth Harbour" on the forward face of the engine casing
  const cf = wz(-24, 1);
  wput(ctx, fireplace({ mat: 'mahogany', mirror: false }), -23.79, 0, 'fwd');
  d.glow(-23.5, 0, 0.4, 0xff8a3a, 0.8);
  d.wbox('woodDark', cf, -1.08, 1.08, 1.22, 2.6, 0.025);
  d.wquad(M.plymouth, cf, -0.95, 0.95, 1.3, 2.52, 0.03);
  panelRuns(d, cf, [[-2.95, -1.2], [1.2, 2.95]], P);
  d.pilasters(cf, [-2.9, -1.15, 1.15, 2.9], { h: H, w: 0.3, mat: 'mahogany' });
  for (const s of [-1, 1]) {
    const cs = wx(s * 3, s);
    d.panels(cs, -35.9, -24.1, P);
    d.pilasters(cs, [-35.85, -32, -28, -24.15], { h: H, w: 0.3, mat: 'mahogany' });
    d.sconces(cs, [-34, -30, -26], 1.9);
  }
  const aw = wz(-35.95, 1), fw = wz(-13.55, -1);
  panelRuns(d, aw, [[-10.1, -7.2], [-5.8, -3.05], [3.05, 5.8], [7.2, 10.1]], P);
  panelRuns(d, fw, [[-10.1, -8.05], [-6.75, -4.45], [-3.15, 3.15], [4.45, 10.1]], P);
  d.pilasters(fw, [-9.95, -4.4, -3.2, 0, 3.2, 4.4, 9.95], { h: H, w: 0.3, mat: 'mahogany' });
  d.sconces(fw, [-1.6, 1.6, 7.2, -9.0], 1.9);
  // green leather club chairs around tables, some card tables
  let i = 0;
  const spots = [];
  for (const s of [-1, 1]) {
    for (const x of [-34.2, -31.3, -28.4, -25.5]) for (const z of [4.7, 7.7]) spots.push([x, s * z]);
    for (const x of [-21.6, -18.7, -15.8]) for (const z of [2.9, 5.8, 8.6]) spots.push([x, s * z]);
  }
  spots.push([-21.3, 0], [-18.4, 0], [-15.6, 0]);
  for (const [x, z] of spots) {
    const card = i % 5 === 2;
    group(ctx, x, z, card ? { rect: true, w: 0.85, d: 0.85, n: 4, dining: true, mat: 'leatherGreen', tmat: 'mahogany' } : { r: 0.4, n: 4, kind: 'club', mat: 'leatherGreen', tmat: 'mahogany', a0: Math.PI / 4 });
    i++;
  }
  d.coffer(-35.9, -13.6, -10.1, 10.1, { bead: 'gold', pitchX: 2.8, pitchZ: 2.9 });
  d.world.addInfo({
    title: 'Gemälde „Plymouth Harbour“', x: -22.5, y: d.Y + 1.5, z: 0, radius: 2.5,
    text: 'Über dem Kamin des Rauchsalons hing das Ölgemälde „Plymouth Harbour“ (auch „The Approach to the New World“) des Marinemalers Norman Wilkinson. Auf der Olympic hing an gleicher Stelle sein Bild „Der Hafen von Plymouth“; das Original der Titanic ging mit dem Schiff unter. Der Kamin war der einzige echte, mit Kohle beheizte Kamin an Bord.',
  });
}

// ---------------------------------------------------------------------------------------------- Verandah Cafés

function trellisRun(d, w, a, e, rot) {
  const n = Math.max(1, Math.ceil((e - a) / 2.0)), p = (e - a) / n;
  for (let i = 0; i < n; i++) {
    const m = a + (i + 0.5) * p, c = w.c + w.n * 0.04;
    d.plan.prop(trellis({ w: Math.round((p - 0.08) * 100) / 100, h: 2.45 }), w.axis === 'x' ? m : c, w.axis === 'x' ? c : m, rot, { collide: false });
  }
}

export function furnishVerandah(ctx) {
  const d = detailer(ctx), s = ctx.room.z0 < 0 ? -1 : 1, H = d.H;
  reserveExtDoors(ctx);
  // white trellis with ivy on every wall (between the large windows on the outboard side)
  const out = wx(s * HW, -s), inn = wx(s * 3.05, s), aw = wz(-47.45, 1), fw = wz(-36.05, -1);
  const gaps = [], open = [...aWindows(s), ...extDoorSpans('A', s, 10.3)].filter(([p, q]) => q > -47.45 && p < -36.05).sort((p, q) => p[0] - q[0]);
  let cur = -47.4;
  for (const [p, q] of open) { if (p - 0.1 - cur > 0.5) gaps.push([cur, p - 0.1]); cur = Math.max(cur, q + 0.1); }
  if (-36.1 - cur > 0.5) gaps.push([cur, -36.1]);
  d.lineExterior(out, -47.45, -36.05, { wall: 'paintWhite', wainscot: 'whitePanel', cornice: 'paintWhite', reveal: 'paintWhite', wins: aWindows(s), doors: extDoorSpans('A', s, 10.3) });
  for (const [p, q] of gaps) trellisRun(d, out, p, q, d.wrot(out));
  trellisRun(d, inn, -47.4, -36.1, d.wrot(inn));
  const zr = (a, b) => (s > 0 ? [a, b] : [-b, -a]);
  for (const [a, b] of [zr(3.1, 5.35), zr(6.65, 10.1)]) trellisRun(d, aw, a, b, d.wrot(aw));
  for (const [a, b] of [zr(3.1, 5.85), zr(7.15, 10.1)]) trellisRun(d, fw, a, b, d.wrot(fw));
  // wicker chairs and tables, palms
  let i = 0;
  for (const x of [-45.6, -42.8, -39.9, -37.5]) for (const z of [4.7, 7.5]) { group(ctx, x, s * z, { r: 0.36, n: i % 2 ? 3 : 4, kind: 'wicker', tmat: 'wicker', a0: 0.4 }); i++; }
  for (const [x, z] of [[-47.0, 9.6], [-36.5, 9.6], [-47.0, 3.5], [-36.5, 3.5]]) wput(ctx, pottedPalm(), x, s * z, 'fwd', { collide: false });
  // trellis canopy strips under the ceiling
  for (const x of [-45.0, -41.7, -38.4]) d.box('trellis', x - 0.03, s * 3.1, x + 0.03, s * 10.1, H - 0.2, H - 0.02);
}

// ---------------------------------------------------------------------------------------------- aft Grand Staircase, second class

export function furnishHallAft(ctx) {
  const d = detailer(ctx), H = d.H;
  reserveExtDoors(ctx);
  const P = { mat: 'oakPanel', orn: 'gold', pitch: 1.1, y0: 0.95, y1: H - 0.3 };
  lineSides(d, -6.45, 1.95, { wall: 'oakPanel', wainscot: 'oak', cornice: 'gold', dado: 'oak', reveal: 'oak' });
  const aw = wz(-6.45, 1), fw = wz(1.95, -1);
  panelRuns(d, aw, [[-10.1, -4.45], [-2.95, 2.95], [4.45, 5.3], [6.7, 10.1]], P);
  d.pilasters(aw, [-9.95, -4.5, -3.1, 0, 3.1, 4.5, 9.95], { h: H, w: 0.3 });
  panelRuns(d, fw, [[-10.1, -5.4], [-3.6, 3.6], [5.4, 10.1]], P);
  d.pilasters(fw, [-9.95, -5.4, -3.6, 3.6, 5.4, 9.95], { h: H, w: 0.3 });
  d.sconces(aw, [-1.5, 1.5, -7.3, 8.4], 1.9);
  d.wmount(clockWall(), aw, 0, 2.2, 0.06);
  for (const s of [-1, 1]) {
    group(ctx, -4.6, s * 7.2, { r: 0.4, n: 3, kind: 'uph', mat: 'fabricGreen', tmat: 'oak', a0: s > 0 ? Math.PI : 0 });
    group(ctx, 0.3, s * 7.2, { r: 0.4, n: 3, kind: 'wicker', tmat: 'oak', a0: s > 0 ? Math.PI : 0 });
    wput(ctx, pottedPalm(), 1.4, s * 9.6, 'aft', { collide: false });
    wput(ctx, pottedPalm(), -5.9, s * 9.6, 'fwd', { collide: false });
  }
}

export function furnishSecondStair(ctx) {
  const d = detailer(ctx);
  for (const s of [-1, 1]) wput(ctx, bench({ w: 1.2, mat: 'oak', iron: false }), -36.35, s * 2.1, 'aft');
  d.lamp(-37.2, 0, 'dome');
  d.panels(wz(-36.05, -1), -2.9, 2.9, { mat: 'oakPanel', pitch: 1.0, y0: 0.95, y1: d.H - 0.3 });
}

export function furnishSecondHall(ctx) {
  const d = detailer(ctx);
  reserveExtDoors(ctx);
  for (const s of [-1, 1]) wput(ctx, bench({ w: 1.6, mat: 'oak', iron: false }), -60.35, s * 3.3, 'aft');
  d.wmount(clockWall(), wz(-60.05, -1), 0, 2.3);
}

export function furnishBarPantry(ctx) {
  wput(ctx, backBar({ w: 3 }), -10.0, -9.88, 'stbd');
  wput(ctx, barCounter({ w: 3 }), -10.0, -8.3, 'stbd');
  wput(ctx, shelves({ kind: 'bottles', w: 1.5 }), -6.8, -6.6, 'aft');
  ctx.fit(sink({ w: 1.0 }), ['left:hi', 'right:hi', 'far:hi']);
}

export function furnishVerandahPantry(ctx) {
  PRESETS.pantry(ctx);
  ctx.fit(shelves({ kind: 'bottles', w: 1.2 }), ['left:mid', 'right:mid', 'near:hi']);
}

export function ceilingDetailsA() { /* all ceiling details are part of the hero rooms */ }
