// E deck – hand-made details: Scotland Road services (pipes, cable trays, hangers, fittings) and the
// lowest landing of the forward Grand Staircase (lift shafts, seating).
import { DECK_Y, ceilingY } from '../core/constants.js';
import {
  pipe, matOf, liftCage, sofa, armchair, tableRound, pottedPalm, clockWall, valve, gauge, bench, sconce,
} from '../interior/kit.js';

/** Pipes, cable tray and hangers under the ceiling of Scotland Road, plus a few fittings on its walls. */
export function scotlandRoadDetails(world, plan, { x0, x1, z0, z1, stations, benches = [] }) {
  const deck = 'E', top = ceilingY(deck), Y = DECK_Y[deck], b = plan.batch;
  const yP = top - 0.26;                       // below the 0.14 m deck beams
  const zin = z1 - 0.05, zout = z0 + 0.05;     // wall faces
  const runs = [
    { z: zin - 0.13, r: 0.05, mat: 'paintWhite' },   // fresh water main
    { z: zin - 0.28, r: 0.04, mat: 'copper' },       // steam heating
    { z: zin - 0.41, r: 0.03, mat: 'steelDark' },    // fire main
  ];
  const SEG = 12;
  for (let xa = x0; xa < x1 - 0.01; xa += SEG) {
    const xb = Math.min(x1, xa + SEG), zone = plan.zone((xa + xb) / 2);
    for (const p of runs) pipe(zone, p.mat, [[xa, yP, p.z], [xb, yP, p.z]], p.r);
    // cable tray along the outboard wall with two lead-covered cables
    b.box(matOf('iron'), xa, yP - 0.03, zout + 0.1, xb, yP - 0.01, zout + 0.36);
    b.bar(matOf('steelDark'), [xa, yP + 0.01, zout + 0.17], [xb, yP + 0.01, zout + 0.17], 0.04, 0.04);
    b.bar(matOf('rubber'), [xa, yP + 0.01, zout + 0.28], [xb, yP + 0.01, zout + 0.28], 0.05, 0.04);
  }
  // hangers every 2.4 m (flat iron straps from the ceiling)
  const iron = matOf('iron');
  for (let x = x0 + 1.2; x < x1; x += 2.4) {
    b.box(iron, x - 0.02, yP - 0.07, zin - 0.47, x + 0.02, yP - 0.05, zin - 0.06);
    b.box(iron, x - 0.02, yP - 0.07, zin - 0.47, x + 0.02, top, zin - 0.45, 'xXzZ');
    b.box(iron, x - 0.02, yP - 0.05, zout + 0.08, x + 0.02, yP - 0.03, zout + 0.38);
    b.box(iron, x - 0.02, yP - 0.05, zout + 0.36, x + 0.02, top, zout + 0.38, 'xXzZ');
  }
  // flanges on the water main and valves / gauges near every watertight bulkhead
  for (let x = x0 + 3; x < x1; x += 6) b.box(matOf('steelDark'), x - 0.03, yP - 0.07, runs[0].z - 0.07, x + 0.03, yP + 0.07, runs[0].z + 0.07);
  for (const s of stations) {
    if (s <= x0 + 2 || s >= x1 - 2) continue;
    const zone = plan.zone(s);
    // branch of the fire main down to a hydrant valve
    pipe(zone, 'steelDark', [[s + 0.35, yP, runs[2].z], [s + 0.35, Y + 1.15, runs[2].z], [s + 0.35, Y + 1.15, zin - 0.12]], 0.03);
    const v = valve({ r: 0.09, mat: 'brass' }); v.position.set(s + 0.35, Y + 1.15, zin - 0.14); v.rotation.y = Math.PI / 2; zone.add(v);
    const g = gauge({ r: 0.09 }); g.position.set(s - 0.3, Y + 1.6, zin - 0.01); g.rotation.y = Math.PI / 2; zone.add(g);
    // hose reel box (red lead) on the outboard wall
    b.box(matOf('redLead'), s - 1.4, Y + 1.0, zout, s - 0.9, Y + 1.55, zout + 0.16);
  }
  // crew benches against the outboard wall
  for (const x of benches) plan.prop(bench({ w: 1.6, back: false, iron: true }), x, zout + 0.27, -Math.PI / 2, { collide: false });
}

/** The three lift shafts that end on E deck and the furniture of the staircase hall. */
export function grandLobbyDetails(world, plan, { x0, x1, z0, z1, liftX0, liftX1 }) {
  const deck = 'E', top = ceilingY(deck), Y = DECK_Y[deck], b = plan.batch;
  const oak = matOf('oak'), panel = matOf('oakPanel'), gold = matOf('gold');
  // lift cages, gates facing aft towards the staircase
  const cx = (liftX0 + liftX1) / 2 + 0.1;
  for (const z of [-1.6, 0, 1.6]) plan.prop(liftCage(), cx, z, Math.PI, { collide: false });
  // oak surround of the shafts: pilasters, header with gilt strip, panelled sides, closed back
  const fx = cx - 0.8;
  for (const z of [-2.4, -0.8, 0.8, 2.4]) b.box(oak, fx - 0.08, Y, z - 0.07, fx + 0.02, top, z + 0.07);
  b.box(oak, fx - 0.06, Y + 2.3, -2.4, fx + 0.02, top, 2.4);
  b.box(gold, fx - 0.075, Y + 2.3, -2.4, fx - 0.06, Y + 2.33, 2.4);
  for (const s of [-1, 1]) b.box(panel, fx, Y, s * 2.4 - 0.04, x1 - 0.05, top, s * 2.4 + 0.04);
  world.addCollider(fx - 0.08, Y, -2.47, x1, top, 2.47);
  // lamps above the gates
  for (const z of [-1.6, 0, 1.6]) { const s = sconce(); s.position.set(fx - 0.09, Y + 2.2, z); s.rotation.y = Math.PI; plan.zone(fx).add(s); }
  // seating, starboard forward corner
  plan.prop(sofa({ w: 1.8, mat: 'fabricGreen' }), x1 - 0.5, 4.9, Math.PI);
  plan.prop(tableRound({ r: 0.4, mat: 'oak' }), x1 - 1.9, 4.9, 0);
  plan.prop(armchair({ kind: 'uph', mat: 'fabricGreen' }), x1 - 1.9, 3.75, -Math.PI / 2, { collide: false });
  plan.prop(pottedPalm(), x1 - 0.55, z1 - 0.6, 0, { collide: false });
  // port forward corner
  plan.prop(sofa({ w: 1.8, mat: 'fabricGold' }), x1 - 0.5, -4.6, Math.PI);
  plan.prop(tableRound({ r: 0.4, mat: 'oak' }), x1 - 1.9, -4.6, 0);
  plan.prop(armchair({ kind: 'uph', mat: 'fabricGold' }), x1 - 1.9, -3.45, Math.PI / 2, { collide: false });
  plan.prop(pottedPalm(), x1 - 0.55, z0 + 0.6, 0, { collide: false });
  // aft wall (casing of funnel 2 behind it): bench settee and clock
  plan.prop(sofa({ w: 1.6, mat: 'leatherGreen' }), x0 + 0.5, 4.6, 0);
  const c = clockWall(); c.position.set(x0 + 0.07, Y + 1.9, 0); plan.zone(x0).add(c);
  for (const z of [-4.5, 2.2]) { const s = sconce(); s.position.set(x0 + 0.07, Y + 1.8, z); plan.zone(x0).add(s); }
}
