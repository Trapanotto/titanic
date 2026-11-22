// E deck – hand-made details: Scotland Road services (pipes, valves, cable trays, hangers, signs, lockers) and the
// lowest landing of the forward Grand Staircase (lift shafts, seating).
import { DECK_Y, ceilingY, STAIRS } from '../core/constants.js';
import {
  pipe, matOf, liftCage, sofa, armchair, tableRound, pottedPalm, valve, gauge, bench, sconce, column, imperialPlan, notice, sign, locker,
} from '../interior/kit.js';

/** door x-positions (with half width) opening onto the corridor strip z0..z1 */
function corridorDoors(plan, z0, z1) {
  const out = [];
  for (const r of plan.rooms ?? []) for (const d of r.doors ?? []) {
    if ((d.side === 'stbd' && Math.abs(r.z1 - z0) < 0.02) || (d.side === 'port' && Math.abs(r.z0 - z1) < 0.02)) out.push([d.at - (d.w ?? 0.9) / 2 - 0.2, d.at + (d.w ?? 0.9) / 2 + 0.2, d.side === 'stbd' ? 'out' : 'in']);
  }
  return out;
}

/**
 * Scotland Road services: three pipe runs (fresh-water main, lagged steam heating, fire main) on hangers with pipe clips,
 * flanged joints, gate valves with hand wheels, a ladder-type cable tray with lead-covered cables; hydrants, gauges and
 * hose boxes at the watertight bulkheads; enamel direction signs, notice boards, crew lockers and benches on free wall.
 */
export function scotlandRoadDetails(world, plan, { x0, x1, z0, z1, stations, benches = [] }) {
  const deck = 'E', top = ceilingY(deck), Y = DECK_Y[deck], b = plan.batch;
  const yP = top - 0.26;                       // below the 0.14 m deck beams
  const zin = z1 - 0.05, zout = z0 + 0.05;     // wall faces
  const runs = [
    { z: zin - 0.13, r: 0.05, mat: 'paintWhite' },   // fresh water main
    { z: zin - 0.29, r: 0.045, mat: 'canvas' },      // steam heating (lagged)
    { z: zin - 0.43, r: 0.03, mat: 'redLead' },      // fire main (red)
  ];
  const doors = corridorDoors(plan, z0, z1);
  const freeAt = (x, w, side) => !doors.some(([a, c, s]) => (!side || s === side) && x + w / 2 > a && x - w / 2 < c) && !stations.some((s) => Math.abs(s - x) < w / 2 + 0.8);
  const SEG = 12;
  const iron = matOf('iron'), brass = matOf('brass');
  for (let xa = x0; xa < x1 - 0.01; xa += SEG) {
    const xb = Math.min(x1, xa + SEG), zone = plan.zone((xa + xb) / 2);
    for (const p of runs) pipe(zone, p.mat, [[xa, yP, p.z], [xb, yP, p.z]], p.r);
    // ladder-type cable tray along the outboard wall with three lead-covered cables and a bell wire
    for (const zz of [zout + 0.1, zout + 0.38]) b.box(iron, xa, yP - 0.04, zz - 0.01, xb, yP + 0.02, zz + 0.01, 'xXyYzZ');
    for (let x = xa + 0.15; x < xb; x += 0.3) b.box(iron, x - 0.012, yP - 0.035, zout + 0.1, x + 0.012, yP - 0.02, zout + 0.38, 'yY');
    b.bar(matOf('steelDark'), [xa, yP - 0.02, zout + 0.17], [xb, yP - 0.02, zout + 0.17], 0.04, 0.04);
    b.bar(matOf('rubber'), [xa, yP - 0.02, zout + 0.24], [xb, yP - 0.02, zout + 0.24], 0.035, 0.035);
    b.bar(matOf('steelDark'), [xa, yP - 0.02, zout + 0.31], [xb, yP - 0.02, zout + 0.31], 0.03, 0.03);
    b.bar(matOf('copper'), [xa, yP + 0.03, zout + 0.05], [xb, yP + 0.03, zout + 0.05], 0.012, 0.012);
  }
  // hangers every 2.4 m: drop rods, cross bar, half-round pipe clips with bolts; lagging bands on the steam line
  for (let x = x0 + 1.2; x < x1; x += 2.4) {
    b.box(iron, x - 0.02, yP - 0.075, zin - 0.5, x + 0.02, yP - 0.05, zin - 0.06);
    for (const zz of [zin - 0.08, zin - 0.48]) b.box(iron, x - 0.012, yP - 0.06, zz - 0.012, x + 0.012, top, zz + 0.012, 'xXzZ');
    for (const p of runs) {
      b.box(iron, x - 0.018, yP - p.r - 0.01, p.z - p.r - 0.012, x + 0.018, yP + p.r + 0.012, p.z - p.r, 'xXzZY');
      b.box(iron, x - 0.018, yP - p.r - 0.01, p.z + p.r, x + 0.018, yP + p.r + 0.012, p.z + p.r + 0.012, 'xXzZY');
      b.box(iron, x - 0.018, yP + p.r, p.z - p.r - 0.012, x + 0.018, yP + p.r + 0.014, p.z + p.r + 0.012, 'xXzZY');
    }
    b.box(iron, x - 0.02, yP - 0.05, zout + 0.08, x + 0.02, yP - 0.03, zout + 0.4);
    b.box(iron, x - 0.012, yP - 0.03, zout + 0.38, x + 0.012, top, zout + 0.4, 'xXzZ');
    for (const dx of [-0.6, 0.6]) b.box(iron, x + dx - 0.012, yP - 0.052, runs[1].z - 0.052, x + dx + 0.012, yP + 0.052, runs[1].z + 0.052, 'xXyYzZ');
  }
  // gate valves with hand wheels on the mains every ~12 m (offset from the hangers)
  for (let x = x0 + 6.6; x < x1 - 1; x += 12) {
    const zone = plan.zone(x);
    for (const [k, rr] of [[0, 0.11], [2, 0.08]]) {
      const p = runs[k];
      b.box(iron, x - 0.09, yP - p.r - 0.03, p.z - p.r - 0.03, x + 0.09, yP + p.r + 0.03, p.z + p.r + 0.03);
      const v = valve({ r: rr, mat: k ? 'redLead' : 'rust' }); v.position.set(x, yP - p.r, p.z); v.rotation.x = Math.PI; zone.add(v);
    }
  }
  // flanges on the water main
  for (let x = x0 + 3; x < x1; x += 6) b.box(matOf('steelDark'), x - 0.03, yP - 0.07, runs[0].z - 0.07, x + 0.03, yP + 0.07, runs[0].z + 0.07);
  for (const s of stations) {
    if (s <= x0 + 2 || s >= x1 - 2) continue;
    const zone = plan.zone(s);
    // branch of the fire main down to a hydrant valve, pressure gauge, hose box (red lead) with brass label
    pipe(zone, 'redLead', [[s + 0.35, yP, runs[2].z], [s + 0.35, Y + 1.15, runs[2].z], [s + 0.35, Y + 1.15, zin - 0.12]], 0.03);
    const v = valve({ r: 0.09, mat: 'brass' }); v.position.set(s + 0.35, Y + 1.15, zin - 0.14); v.rotation.y = Math.PI / 2; zone.add(v);
    const g = gauge({ r: 0.09 }); g.position.set(s - 0.3, Y + 1.6, zin - 0.01); g.rotation.y = Math.PI / 2; zone.add(g);
    b.box(matOf('redLead'), s - 1.4, Y + 1.0, zout, s - 0.9, Y + 1.55, zout + 0.16);
    b.box(brass, s - 1.3, Y + 1.42, zout + 0.16, s - 1.0, Y + 1.48, zout + 0.165);
    // watertight-door warning notice and enamel direction sign
    const n = notice(); n.position.set(s - 0.6, Y + 1.55, zin - 0.005); n.rotation.y = Math.PI / 2; zone.add(n);
    const sg = sign({ kind: (Math.round(s) & 1) ? 0 : 3 }); sg.position.set(s + 1.0, Y + 2.05, zin - 0.005); sg.rotation.y = Math.PI / 2; zone.add(sg);
  }
  // notice boards, crew lockers and benches on free stretches of wall
  let nb = 0, nl = 0;
  for (let x = x0 + 9; x < x1 - 3; x += 17) {
    if (freeAt(x, 1.1, 'in')) {
      const zone = plan.zone(x);
      b.box(matOf('oak'), x - 0.5, Y + 1.2, zin - 0.03, x + 0.5, Y + 1.85, zin, 'zxXyY');
      b.box(matOf('linoCream'), x - 0.46, Y + 1.24, zin - 0.032, x + 0.46, Y + 1.81, zin - 0.03, 'z');
      for (let k = 0; k < 4; k++) { const n = notice(); n.position.set(x - 0.32 + k * 0.21, Y + 1.72 - (k % 2) * 0.05, zin - 0.035); n.rotation.y = Math.PI / 2; n.scale.set(1, 0.6, 0.6); zone.add(n); }
      nb++;
    }
    const lx = x + 6;
    if (freeAt(lx, 2.0, 'out') && lx < x1 - 2 && !benches.some((bx) => Math.abs(bx - lx) < 2.0)) {
      plan.prop(locker({ n: 4, mat: 'steelDark' }), lx, zout + 0.225, -Math.PI / 2, { collide: true });
      nl++;
    }
  }
  for (const x of benches) plan.prop(bench({ w: 1.6, back: false, iron: true }), x, zout + 0.27, -Math.PI / 2, { collide: false });
  return { boards: nb, lockers: nl };
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
  // aft wall beside the pier of the staircase (casing of funnel 2 behind it): settees either side, sconces
  for (const s of [-1, 1]) {
    plan.prop(sofa({ w: 1.6, mat: 'leatherGreen' }), x0 + 0.5, s * 4.6, 0);
    const sc = sconce(); sc.position.set(x0 + 0.07, Y + 1.8, s * 3.45); plan.zone(x0).add(sc);
  }
  // oak columns framing the foot of the staircase
  const st = imperialPlan(STAIRS.find((q) => q.id === 'grandFwd'));
  for (const s of [-1, 1]) plan.prop(column({ h: top - Y, r: 0.15, mat: 'oak', capital: 'gold' }), st.xf + 0.45, s * (st.hw + 0.55), 0, { collide: true });
}
