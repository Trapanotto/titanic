// Open decks – things people left there: benches and coiled mooring ropes on the poop and the well decks, a bucket
// and mop by the bulwark, shuffleboard courts with cues and discs and a quoits pitch on the boat deck amidships.
import * as THREE from 'three';
import { mats } from '../core/materials.js';
import { DECK_Y, BOAT_HOUSES } from '../core/constants.js';
import { TIER } from '../core/tier.js';
import { mk, BY } from './fit-util.js';
import { merge, boxG, cylG, torusG } from './inst.js';
import { hullEdge } from './structure-layout.js';
import { bench } from './fit-gear.js';

const B = DECK_Y.B, C = DECK_Y.C;

/** rope coiled flat on deck: three turns, the end lying across */
function coilGeo() {
  const lo = TIER.fine <= 1, parts = [];
  for (let k = 0; k < 4; k++) parts.push(torusG(0.36 - k * 0.055, 0.026, lo ? 4 : 6, lo ? 10 : 16).rotateX(Math.PI / 2).translate(0, 0.028 + (k % 2) * 0.03, 0));
  parts.push(cylG([0.34, 0.03, 0], [0.62, 0.03, 0.18], 0.024, 5));
  return merge(parts);
}

/** shuffleboard court painted on the planks, 9 m along x, centred on the origin */
function courtGeo() {
  const y = 0.004, t = 0.045, E = 4.5, hw = 0.9, P = [];
  const line = (x0, z0, x1, z1) => { const L = Math.hypot(x1 - x0, z1 - z0); P.push(boxG(L, 0.004, t, (x0 + x1) / 2, y, (z0 + z1) / 2, 0, -Math.atan2(z1 - z0, x1 - x0), 0)); };
  line(-E, -hw, E, -hw); line(-E, hw, E, hw); line(-E, -hw, -E, hw); line(E, -hw, E, hw);
  for (const s of [-1, 1]) {
    const xa = s * 1.5, xb = s * 3.7, xm = s * 2.7, wm = hw * 0.78 * ((2.7 - 1.5) / (3.7 - 1.5));
    line(xa, 0, xb, -hw * 0.78); line(xa, 0, xb, hw * 0.78); line(xb, -hw * 0.78, xb, hw * 0.78);   // scoring triangle
    line(xm, -wm, xm, wm); line(xm, 0, xb, 0);                                                    // 10 | 8 8 | 7 7
    line(xb, -hw * 0.78, s * E, -hw * 0.5); line(xb, hw * 0.78, s * E, hw * 0.5);                 // "10 off" box
  }
  return merge(P);
}

export function buildExtras(world, parent) {
  const root = new THREE.Group();
  root.name = 'deckExtras';
  parent.add(root);
  world.markForBake(root);

  // ---- poop: benches of the third class along the bulwark, facing inboard (all devices: they are solid)
  for (const s of [-1, 1]) for (const x of [-115.2, -125.4]) bench(world, root, x, B, s * (hullEdge(x) - 0.62), -s);

  if (TIER.fine < 1) return {};

  // ---- coiled ropes beside the mooring fittings
  const coil = coilGeo();
  const coils = [[-118.3, B], [-128.3, B], [-98, C], [82.6, C], [108.6, B], [118.5, B]];
  for (const s of [-1, 1]) for (const [x, y] of coils) { const m = mk(coil, mats.rope, x, y, s * (hullEdge(x) - 0.78)); m.rotation.y = x * 1.7 + s; root.add(m); }

  // ---- bucket and mop left by the bulwark on the poop
  {
    const x = -121.9, z = hullEdge(x) - 0.42;
    root.add(mk(merge([cylG([0, 0, 0], [0, 0.28, 0], 0.12, 8, 0.14, true), cylG([0, 0, 0], [0, 0.012, 0], 0.12, 8)]), mats.steel, x, B, z));
    root.add(mk(merge([cylG([0.35, 0.05, 0.0], [0.42, 1.25, 0.3], 0.014, 5)]), mats.pine, x, B, z));
    root.add(mk(boxG(0.16, 0.08, 0.16, 0.35, 0.04, 0), mats.linen, x, B, z));
  }

  // ---- deck games on the boat deck amidships (the long stretch without lifeboats)
  const midH = BOAT_HOUSES[1], court = courtGeo();
  const disc = merge([cylG([0, 0.006, 0], [0, 0.03, 0], 0.075, 10)]);
  const cue = merge([cylG([0, 0.018, 0], [1.55, 0.018, 0], 0.012, 5), boxG(0.03, 0.02, 0.2, 1.57, 0.018, 0)]);
  const quoit = torusG(0.1, 0.016, 5, 12).rotateX(Math.PI / 2).translate(0, 0.02, 0);
  for (const s of [-1, 1]) {
    const cx = 0.5, cz = s * (midH.hw + 2.9);
    root.add(mk(court, mats.paintWhite, cx, BY, cz));
    // a game in progress: discs round the far triangle, the cues laid down at the near end
    [[2.4, 0.2, 0], [3.0, -0.35, 1], [3.3, 0.3, 0], [2.0, -0.1, 1], [3.9, 0.45, 1], [-3.9, -0.5, 0], [-3.9, -0.3, 1], [-4.1, -0.1, 0]].forEach(([dx, dz, k]) => root.add(mk(disc, k ? mats.woodDark : mats.hullRed, cx + dx, BY, cz + dz)));
    for (const [dz, a] of [[0.55, 0.08], [0.7, -0.05]]) { const m = mk(cue, mats.oak, cx - 6.0, BY, cz + dz); m.rotation.y = a; root.add(m); }
    // quoits: a pegged board and rope rings thrown at it
    const qx = cx + 9.2;
    root.add(mk(merge([boxG(0.36, 0.035, 0.36, 0, 0.018, 0), cylG([0, 0.03, 0], [0, 0.24, 0], 0.014, 6)]), mats.oak, qx, BY, cz));
    [[0, 0, 0.035], [0.26, 0.12, 0], [-0.1, 0.34, 0], [0.33, -0.25, 0], [-1.9, 0.1, 0], [-1.95, -0.08, 0.03]].forEach(([dx, dz, dy]) => root.add(mk(quoit, mats.rope, qx + dx, BY + dy, cz + dz)));
  }
  return {};
}
