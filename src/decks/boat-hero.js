// Boat deck – hand-detailed rooms: bridge, wheelhouse, Marconi rooms, gymnasium, Grand Staircase landings, service rooms.
import {
  shipsWheel, binnacle, telegraph, clockWall, gauge, chartTable, shelves, desk, chairDining, sofa, armchair, tableRound, tableRect,
  bookcase, heater, bedFirst, wardrobe, washbasinMarble, chest, marconiSet, machineBlock, switchboard, tankV, tankH, valve, bunkCrew,
  locker, washstand, trunk, rowingMachine, electricHorse, electricCamel, cycleMachine, punchBag, bench, mirrorWall, pottedPalm,
  settee, servingCounter, fireplace, pipe, matOf, sconce,
} from '../interior/kit.js';
import { mats } from '../core/materials.js';
import { detailer, wput, reserve, reserveExtDoors, wx, wz, boatWindows, extDoorSpans, deckMats } from './boat-util.js';

const FW = 7.35; // inner face of the forward house side walls

// ---------------------------------------------------------------------------------------------- bridge & navigation

export function furnishBridge(ctx) {
  const d = detailer(ctx);
  reserveExtDoors(ctx);
  wput(ctx, shipsWheel(), 70.0, 0, 'fwd');
  wput(ctx, binnacle(), 71.3, 0, 'aft');
  for (const s of [-1, 1]) {
    wput(ctx, telegraph(), 72.25, s * 1.5, 'aft');      // main engine-order telegraphs
    wput(ctx, telegraph(), 72.25, s * 3.4, 'aft');      // docking / steering telegraphs
    wput(ctx, telegraph(), 71.9, s * 6.4, 'aft');       // wing telegraphs at the open sides
  }
  // brass hand rail and teak capping under the front windows
  d.box('woodDark', 72.62, -FW + 0.05, 72.85, FW - 0.05, 0.95, 1.0);
  d.box('brass', 72.55, -FW + 0.1, 72.6, FW - 0.1, 0.9, 0.94);
  // telephones to the crow's nest / engine room / forecastle and a clock on the wheelhouse wall
  const aw = wz(66.05, 1);
  for (const z of [-3.4, 3.4, -6.6]) {
    d.wbox('mahogany', aw, z - 0.13, z + 0.13, 1.3, 1.68, 0.1);
    d.wbox('brass', aw, z - 0.11, z - 0.05, 1.42, 1.62, 0.05, 0.1);
    d.wbox('iron', aw, z + 0.02, z + 0.1, 1.55, 1.6, 0.04, 0.1);
  }
  d.wmount(clockWall(), aw, 0.6, 2.2);
  d.wmount(gauge({ r: 0.14 }), aw, -0.6, 2.2);          // rudder indicator
  for (const s of [-1, 1]) d.box('brass', 67.0, s * 2.1, 67.12, s * 2.22, 0, 1.15);   // speaking tubes
}

export function furnishWheelhouse(ctx) {
  const d = detailer(ctx);
  wput(ctx, shipsWheel(), 64.6, 0, 'fwd');
  wput(ctx, binnacle(), 65.55, 0, 'aft');
  wput(ctx, telegraph(), 65.4, 1.9, 'aft');
  wput(ctx, tableRect({ w: 1.0, d: 0.6, mat: 'oak' }), 62.0, 2.0, 'stbd');
  const fw = wz(65.95, -1);
  d.wmount(gauge({ r: 0.16 }), fw, 0, 2.15);            // rudder indicator above the helmsman
  d.wmount(clockWall(), fw, 1.4, 2.1);
  // teak panelling of the forward wall, framed steering-order board
  d.panels(fw, -2.55, 2.55, { mat: 'oak', frame: 'woodDark', pitch: 0.85, y0: 0.15, y1: 1.0, skip: [[-2.3, -1.3]] });
  d.wquad(deckMats().chart, fw, 0.75, 1.15, 1.25, 1.75); d.wbox('woodDark', fw, 0.72, 1.18, 1.22, 1.78, 0.012);
  // telemotor column next to the wheel
  d.box('brass', 64.25, 0.75, 64.45, 0.95, 0, 1.05, true);
}

export function furnishChartRoom(ctx) {
  const d = detailer(ctx), M = deckMats();
  ctx.put(chartTable(), ctx.W / 2, ctx.D / 2, 'in');
  ctx.fit(shelves({ kind: 'empty', mat: 'oak', w: 1.4 }), ['far:mid', 'left:mid', 'right:mid']);
  ctx.fit(desk({ w: 1.2, mat: 'oak' }), ['right:hi', 'left:hi', 'far:lo']);
  ctx.fit(chairDining({ cls: 'plain' }), ['near:hi'], { collide: false });
  // framed chart on the inboard wall and the chronometers
  d.wquad(M.chart, wx(-2.65, -1), 62.2, 63.2, 1.2, 1.9);
  d.wbox('oak', wx(-2.65, -1), 62.15, 63.25, 1.15, 1.95, 0.015);
  d.wmount(clockWall(), wz(61.45, 1), -6.0, 1.9);
}

export function furnishCaptainSitting(ctx) {
  const d = detailer(ctx);
  ctx.fit(desk({ w: 1.4, mat: 'mahogany' }), ['far:mid', 'right:mid', 'left:mid']);
  ctx.fit(sofa({ mat: 'leather', w: 1.8 }), ['right:hi', 'left:hi', 'far:hi']);
  ctx.fit(bookcase({ mat: 'mahogany', w: 1.2 }), ['left:hi', 'right:lo', 'far:lo']);
  if (ctx.put(tableRound({ r: 0.4, mat: 'mahogany' }), ctx.W / 2, ctx.D / 2 + 0.2, 'in')) {
    ctx.put(armchair({ kind: 'club', mat: 'leather' }), ctx.W / 2 - 0.95, ctx.D / 2 + 0.2, 'right', { collide: false });
    ctx.put(armchair({ kind: 'club', mat: 'leather' }), ctx.W / 2 + 0.95, ctx.D / 2 + 0.2, 'left', { collide: false });
  }
  ctx.fit(heater(), ['near:hi', 'far:lo'], { collide: false });
  d.wmount(clockWall(), wz(61.45, 1), 6.0, 2.0);
}

export function furnishCaptainBed(ctx) {
  ctx.fit(bedFirst({ style: 'mahogany', cover: 'fabricBlue' }), ['far:mid', 'right:hi', 'left:hi']);
  ctx.fit(wardrobe({ mirror: true, mat: 'mahogany' }), ['left:hi', 'right:hi', 'near:hi']);
  ctx.fit(washbasinMarble(), ['right:lo', 'left:lo', 'near:hi']);
  ctx.fit(chest(), ['left:lo', 'right:mid', 'far:lo']);
}

// ---------------------------------------------------------------------------------------------- Marconi rooms

export function furnishMarconi(ctx) {
  const d = detailer(ctx);
  wput(ctx, marconiSet(), 52.05, 0.75, 'aft');
  for (const z of [0.3, 1.25]) wput(ctx, chairDining({ cls: 'plain', mat: 'oak' }), 51.25, z, 'fwd', { collide: false });
  wput(ctx, desk({ w: 1.2, mat: 'oak' }), 50.8, 2.6, 'port');
  wput(ctx, chairDining({ cls: 'plain', mat: 'oak' }), 50.8, 1.95, 'stbd', { collide: false });
  wput(ctx, shelves({ kind: 'empty', w: 1.0, mat: 'oak' }), 52.2, -1.9, 'aft');
  const fw = wz(52.45, -1);
  d.wmount(clockWall(), fw, -0.5, 2.15);                 // ship's time
  d.wmount(clockWall(), fw, 2.3, 2.15);                  // New York time
  // message forms on the desk, pneumatic tube to the enquiry office, accumulator box
  d.box('paper', 50.5, 2.45, 50.85, 2.7, 0.8, 0.82);
  d.box('brass', 49.1, -2.9, 49.2, -2.8, 0, 2.6);
  d.box('brass', 49.05, -2.95, 49.25, -2.75, 1.0, 1.25);
  d.box('woodDark', 49.15, 2.2, 49.7, 2.9, 0, 0.5, true);
}

export function furnishSilentRoom(ctx) {
  ctx.fit(machineBlock({ w: 1.1, d: 0.75, h: 1.0, kind: 'dynamo' }), ['far:mid', 'left:hi', 'right:hi']);
  ctx.fit(switchboard({ w: 1.3 }), ['left:hi', 'right:hi', 'far:lo'], { gap: 0 });
  ctx.fit(tankV({ r: 0.22, h: 1.2, mat: 'copper' }), ['right:lo', 'left:lo', 'far:hi']);
  ctx.fit(tankV({ r: 0.22, h: 1.2, mat: 'copper' }), ['right:mid', 'left:mid', 'far:hi']);
  ctx.fit(tankH({ r: 0.2, l: 0.9, mat: 'iron' }), ['near:hi', 'right:hi'], { collide: false }); // spark gap / induction coil
}

export function furnishOperators(ctx) {
  ctx.fit(bunkCrew({ tiers: 2, cover: 'blanket' }), ['far:mid', 'right:hi', 'left:hi']);
  ctx.fit(locker({ n: 2 }), ['left:hi', 'right:hi', 'near:hi']);
  ctx.fit(washstand(), ['right:lo', 'left:lo', 'near:hi']);
  ctx.fit(trunk(), ['left:lo', 'right:mid'], { collide: false });
}

// ---------------------------------------------------------------------------------------------- gymnasium

export function furnishGym(ctx) {
  const d = detailer(ctx), M = deckMats();
  reserveExtDoors(ctx);
  // pine lining of the exterior walls (starboard side and aft end), with windows left open
  const sw = wx(FW, -1);
  d.lineExterior(sw, 28.15, 37.45, { wall: 'pine', wainscot: 'pine', cornice: 'oak', dado: 'oak', sill: 1.0, head: 2.15, wins: boatWindows('fwd', 1), doors: extDoorSpans('boat', 1, 7.5), reveal: 'oak', panels: { mat: 'pine', pitch: 0.9, frame: 'oak' } });
  d.lineExterior(wz(28.15, 1), 3.05, FW, { wall: 'pine', wainscot: 'pine', cornice: 'oak', dado: 'oak', sill: 1.0, head: 2.15, wins: [[2.825, 3.775], [5.025, 5.975]], reveal: 'oak' });
  // inboard wall (against the casing and the stores): raised pine panels, wall bars
  const pw = wx(3.05, 1);
  d.panels(pw, 28.3, 37.3, { mat: 'pine', frame: 'oak', y0: 0.15, y1: 0.95, pitch: 1.0 });
  // equipment along the inboard wall: cycles under the big distance dial, electric horses and camel
  wput(ctx, cycleMachine(), 29.0, 3.85, 'stbd');
  wput(ctx, cycleMachine(), 29.8, 3.85, 'stbd');
  d.wbox('paintWhite', pw, 28.85, 29.95, 1.55, 2.55, 0.02);
  d.b.disc(matOf('gaugeFace'), [29.4, d.Y + 2.05, 3.05 + 0.035], [0, 0, 1], 0.42, 16, true);
  d.b.ring(mats.brass, [29.4, d.Y + 2.05, 3.05 + 0.04], [0, 0, 1], 0.42, 0.48, 16);
  wput(ctx, electricHorse(), 31.0, 3.7, 'stbd');
  wput(ctx, electricHorse(), 31.9, 3.7, 'stbd');
  wput(ctx, electricCamel(), 32.9, 3.7, 'stbd');
  // wall-mounted weight / pulley machines
  for (const x of [34.3, 35.2]) {
    d.wbox('iron', pw, x - 0.25, x + 0.25, 0.1, 2.1, 0.06);
    d.wbox('oak', pw, x - 0.2, x + 0.2, 0.2, 0.55, 0.12, 0.06);
    d.wbox('rope', pw, x - 0.015, x + 0.015, 0.55, 1.9, 0.02, 0.2);
  }
  ctx.occupied.push({ x0: 33.95, x1: 35.55, z0: 3, z1: 3.5 });
  wput(ctx, punchBag(), 36.7, 3.6, 'stbd');
  // rowing machines and a bench along the windows
  wput(ctx, rowingMachine(), 29.7, 6.85, 'fwd');
  wput(ctx, rowingMachine(), 35.3, 6.85, 'fwd');
  wput(ctx, bench({ w: 1.15, mat: 'oak', iron: true }), 31.45, 7.0, 'port', { collide: false });
  // White Star route map and a mirror on the forward wall, clock on the aft wall
  const fw = wz(37.45, -1);
  d.wquad(M.worldMap, fw, 3.25, 5.25, 1.0, 2.3);
  d.wbox('oak', fw, 3.2, 5.3, 0.95, 1.0, 0.03); d.wbox('oak', fw, 3.2, 5.3, 2.3, 2.35, 0.03);
  d.wmount(mirrorWall({ w: 0.6, h: 1.4, frame: 'oak' }), fw, 6.95, 1.95);
  d.wmount(clockWall(), wz(28.15, 1), 4.4, 2.2);
  for (const x of [30.4, 33.8, 36.6]) d.wmount(sconce({ plain: true }), sw, x, 2.3, 0.03);
}

// ---------------------------------------------------------------------------------------------- Grand Staircase (forward) – top landing

export function furnishLandingFwd(ctx) {
  const d = detailer(ctx), H = d.H;
  // aft wall in front of the funnel-2 casing: carved oak panels between gilt-capped pilasters, sconces
  const aw = wz(37.55, 1);
  d.panels(aw, -4.5, 4.5, { mat: 'oakPanel', orn: 'gold', pitch: 1.1, y0: 0.95, y1: H - 0.3 });
  d.strip('oak', aw, -4.55, 4.55, 0.88, 0.95, 0.05);
  d.pilasters(aw, [-4.45, -2.2, 0, 2.2, 4.45], { h: H, w: 0.3 });
  d.sconces(aw, [-1.1, 1.1, -3.3, 3.3], 1.9);
  d.wmount(clockWall(), aw, 0, 2.15, 0.06);
  // forward wall between the two corridor openings
  const fw = wz(46.45, -1);
  d.panels(fw, -3.0, 3.0, { mat: 'oakPanel', orn: 'gold', pitch: 1.2, y0: 0.95, y1: H - 0.3 });
  d.pilasters(fw, [-2.95, 0, 2.95], { h: H, w: 0.28 });
  d.sconces(fw, [-1.5, 1.5], 1.9);
  // palms in the corners, lamps beside the dome
  for (const s of [-1, 1]) {
    wput(ctx, pottedPalm(), 38.0, s * 4.1, 'fwd', { collide: false });
    d.lamp(38.6, s * 3.75, 'bowl'); d.lamp(45.6, s * 3.75, 'bowl');
  }
}

export function furnishVestibule(ctx) {
  const d = detailer(ctx), r = ctx.room, s = r.z0 < 0 ? -1 : 1, H = d.H;
  reserveExtDoors(ctx);
  d.lineExterior(wx(s * FW, -s), 37.55, 46.45, { wall: 'oakPanel', wainscot: 'oak', cornice: 'gold', dado: 'oak', sill: 1.0, head: 2.15, wins: boatWindows('fwd', s), doors: extDoorSpans('boat', s, 7.5), reveal: 'oak' });
  for (const x of [39.6, 44.4]) wput(ctx, settee({ mat: 'fabricGreen', w: 1.6 }), x, s * 6.95, s < 0 ? 'stbd' : 'port', { collide: true });
  wput(ctx, pottedPalm(), 45.95, s * 6.85, 'aft', { collide: false });
  d.sconces(wx(s * FW, -s), [40.9, 43.1], 2.2);
  void H;
}

export function furnishMess(ctx) {
  const d = detailer(ctx);
  if (ctx.put(tableRect({ w: 3.0, d: 1.0, cloth: true, set: true }), ctx.W / 2, ctx.D / 2, 'right')) {
    for (const s of [-1, 1]) for (let k = 0; k < 4; k++) ctx.put(chairDining({ cls: 'first', seat: 'leather' }), ctx.W / 2 + s * 0.8, ctx.D / 2 - 1.1 + k * 0.73, s < 0 ? 'right' : 'left', { collide: false });
  }
  ctx.fit(servingCounter({ w: 1.6, mat: 'mahogany' }), ['far:mid', 'left:mid', 'right:mid']);
  ctx.fit(sofa({ mat: 'leatherGreen', w: 1.6 }), ['right:hi', 'left:hi', 'far:lo']);
  ctx.fit(bookcase({ mat: 'oak', w: 1.0 }), ['left:hi', 'right:lo']);
  d.wmount(clockWall(), wz(37.45, -1), -4.0, 2.1);
}

// ---------------------------------------------------------------------------------------------- middle house

export function furnishLandingAft(ctx) {
  const d = detailer(ctx), H = d.H;
  reserveExtDoors(ctx);
  for (const s of [-1, 1]) {
    // aft wall pieces outboard of the casing (door to the engineers' rooms at z = ±5)
    const aw = wz(-6.45, 1);
    d.panels(aw, s < 0 ? -3.0 : 3.0, s * 4.4, { mat: 'oakPanel', orn: 'gold', pitch: 1.4, y0: 0.95, y1: H - 0.3 });
    d.panels(aw, -3.0, 3.0, { mat: 'oakPanel', orn: 'gold', pitch: 1.5, y0: 0.95, y1: H - 0.3 });
    d.lamp(1.0, s * 4.6, 'bowl'); d.lamp(-5.6, s * 4.6, 'bowl');
    wput(ctx, pottedPalm(), 1.4, s * 6.3, 'aft', { collide: false });
    wput(ctx, armchair({ kind: 'uph', mat: 'fabricGreen' }), -5.85, s * 6.25, 'fwd', { collide: false });
    d.lineExterior(wx(s * 6.85, -s), -6.45, 1.95, { wall: 'oakPanel', wainscot: 'oak', cornice: 'gold', sill: 1.0, head: 2.15, wins: boatWindows('mid', s), doors: extDoorSpans('boat', s, 7.0) });
  }
  d.pilasters(wz(-6.45, 1), [-3.0, 0, 3.0], { h: H, w: 0.3 });
  d.sconces(wz(-6.45, 1), [-1.5, 1.5], 1.9);
  d.wmount(clockWall(), wz(-6.45, 1), 0, 2.15, 0.06);
}

export function furnishTankRoom(ctx) {
  const d = detailer(ctx);
  ctx.fit(tankH({ r: 0.75, l: 3.2, mat: 'steelDark' }), ['far:mid', 'left:mid']);
  ctx.fit(tankH({ r: 0.6, l: 2.2, mat: 'steelDark' }), ['left:hi', 'right:hi', 'far:lo']);
  ctx.fit(valve({ mat: 'brass' }), ['right:lo', 'near:hi'], { collide: false });
  pipe(ctx.plan.zone(-13), mats.copper, [[-15.6, d.Y + 2.4, -4.0], [-11.3, d.Y + 2.4, -4.0], [-11.3, d.Y + 0.3, -4.0]], 0.05);
}

export function furnishFanRoom(ctx) {
  const d = detailer(ctx);
  ctx.fit(machineBlock({ w: 1.6, d: 1.2, h: 1.5, kind: 'pump', mat: 'paintGrey' }), ['far:lo', 'far:hi']);
  ctx.fit(machineBlock({ w: 1.6, d: 1.2, h: 1.5, kind: 'pump', mat: 'paintGrey' }), ['far:hi', 'right:hi']);
  ctx.fit(switchboard({ w: 1.2 }), ['left:hi', 'right:lo'], { gap: 0 });
  for (const x of [11.0, 14.6]) d.box('steelDark', x - 0.45, 3.3, x + 0.45, 4.2, 1.9, d.H - 0.02);   // ducts up to the roof vents
}

export function furnishLiftMachinery(ctx) {
  const d = detailer(ctx);
  ctx.fit(machineBlock({ w: 1.3, d: 1.0, h: 1.3, kind: 'dynamo', mat: 'paintGreen' }), ['far:mid', 'left:hi']);
  ctx.fit(switchboard({ w: 1.0 }), ['right:hi', 'left:lo'], { gap: 0 });
  d.b.ring(mats.iron, [-39.2, d.Y + 1.9, -3.4], [1, 0, 0], 0.25, 0.32, 12);   // rope sheave
}

// ---------------------------------------------------------------------------------------------- aft house (2nd class)

export function furnishSecondEntrance(ctx) {
  const d = detailer(ctx);
  d.wmount(clockWall(), wz(-38.15, -1), 0, 2.2);
  for (const s of [-1, 1]) d.lamp(-43, s * 1.9, 'dome');
}

export function furnishSecondVestibule(ctx) {
  const d = detailer(ctx), s = ctx.room.z0 < 0 ? -1 : 1;
  reserveExtDoors(ctx);
  wput(ctx, bench({ w: 1.6, mat: 'oak', iron: false }), -46.4, s * 4.45, s < 0 ? 'stbd' : 'port', { collide: true });
  wput(ctx, bench({ w: 1.6, mat: 'oak', iron: false }), -47.55, s * 3.3, 'fwd', { collide: true });
  d.lineExterior(wx(s * 4.85, -s), -47.85, -41.55, { wall: 'oak', wainscot: 'oak', sill: 1.0, head: 2.15, wins: boatWindows('aft', s), doors: extDoorSpans('boat', s, 5.0) });
}

// ---------------------------------------------------------------------------------------------- ceilings

/** Gilt frames around the two dome openings in the ceiling (the domes themselves belong to the exterior). */
export function ceilingDetails(plan, { domeF, domeA }) {
  const b = plan.batch, top = plan.y + plan.h, g = matOf('gold'), o = matOf('oak');
  for (const h of [domeF, domeA]) {
    const e = 0.18;
    b.box(o, h.x0 - e, top - 0.1, h.z0 - e, h.x1 + e, top, h.z0, 'xXzZy');
    b.box(o, h.x0 - e, top - 0.1, h.z1, h.x1 + e, top, h.z1 + e, 'xXzZy');
    b.box(o, h.x0 - e, top - 0.1, h.z0, h.x0, top, h.z1, 'xXzZy');
    b.box(o, h.x1, top - 0.1, h.z0, h.x1 + e, top, h.z1, 'xXzZy');
    b.box(g, h.x0 - e - 0.05, top - 0.13, h.z0 - e - 0.05, h.x1 + e + 0.05, top - 0.1, h.z1 + e + 0.05, 'xXzZy');
    // light-well lining between ceiling and the roof coaming
    for (const [x0, x1, z0, z1] of [[h.x0, h.x1, h.z0 - 0.01, h.z0], [h.x0, h.x1, h.z1, h.z1 + 0.01], [h.x0 - 0.01, h.x0, h.z0, h.z1], [h.x1, h.x1 + 0.01, h.z0, h.z1]]) b.box(g, x0, top, z0, x1, top + 0.05, z1, 'xXzZ');
  }
}
