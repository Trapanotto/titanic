import * as THREE from 'three';
import { mats } from '../core/materials.js';
import { box } from '../core/geo.js';
import { DECK_Y, SHIP, hullHalfWidth } from '../core/constants.js';
import { cyl, vcyl, ball, mk, lathe, Wires, edge, edgeSlope } from './fit-util.js';
import { merge, cylG, latheGeo } from './inst.js';
import { cowl, mushroom, bench, ceilingLamp, gableGeo } from './fit-gear.js';
import { TIER } from '../core/tier.js';

// Forecastle, well decks, open B deck aft and poop: anchor gear, mooring gear, hatches, cranes, docking bridge.

const B = DECK_Y.B, C = DECK_Y.C;
const TAU = Math.PI * 2;

// ---------- small fittings ----------
function capstan(world, g, x, y, z, k = 1) {
  // pawl rim / base, barrel with whelps, drum head with bar holes
  g.add(lathe(mats.steelDark, [[0.66 * k, 0], [0.66 * k, 0.05], [0.6 * k, 0.07], [0.6 * k, 0.12], [0.5 * k, 0.14], [0.4 * k, 0.2], [0.3 * k, 0.45], [0.29 * k, 0.65], [0.36 * k, 0.86], [0.5 * k, 0.92], [0.53 * k, 0.96], [0.53 * k, 1.04], [0.45 * k, 1.08], [0.2 * k, 1.11], [0, 1.12]], TIER.fine <= 1 ? 12 : 22, x, y, z));
  for (let i = 0; i < 8; i++) { // whelps
    const a = (i / 8) * TAU;
    const w = box(mats.iron, 0.06, 0.62, 0.1, x + Math.cos(a) * 0.33 * k, y + 0.52, z + Math.sin(a) * 0.33 * k); w.rotation.y = -a; w.rotation.z = 0.06; g.add(w);
  }
  for (let i = 0; i < 8; i++) { // bar holes in the head + pawls on the base rim
    const a = (i / 8) * TAU + 0.2;
    g.add(box(mats.iron, 0.08, 0.06, 0.07, x + Math.cos(a) * 0.5 * k, y + 1.0, z + Math.sin(a) * 0.5 * k));
    const p = box(mats.iron, 0.16, 0.04, 0.05, x + Math.cos(a) * 0.6 * k, y + 0.14, z + Math.sin(a) * 0.6 * k); p.rotation.y = -a + 1.2; g.add(p);
  }
  for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; g.add(vcyl(mats.iron, x + Math.cos(a) * 0.63 * k, y + 0.05, z + Math.sin(a) * 0.63 * k, 0.025, 0.02, 4)); }
  g.add(vcyl(mats.brass, x, y + 1.11, z, 0.03, 0.2 * k, 12));
  world.addCollider(x - 0.5 * k, y, z - 0.5 * k, x + 0.5 * k, y + 1.1, z + 0.5 * k);
}

let BOLLARD = null;
/** Twin mooring bitts along x: cast bollards with waist and capped head on a bed plate. */
function bitts(world, g, x, y, z, k = 1) {
  if (!BOLLARD) BOLLARD = latheGeo('bollard', [[0.19, 0], [0.2, 0.04], [0.17, 0.1], [0.155, 0.35], [0.165, 0.55], [0.2, 0.6], [0.23, 0.64], [0.23, 0.69], [0.19, 0.72], [0.12, 0.74], [0.001, 0.75]], TIER.fine <= 1 ? 10 : 16);
  g.add(box(mats.iron, 1.5 * k, 0.08, 0.55 * k, x, y + 0.04, z));
  for (let i = 0; i < 6; i++) g.add(vcyl(mats.iron, x + (i % 3 - 1) * 0.6 * k, y + 0.08, z + (i < 3 ? -1 : 1) * 0.22 * k, 0.025, 0.03, 6));
  for (const s of [-1, 1]) {
    const px = x + s * 0.45 * k;
    const b = mk(BOLLARD, mats.iron, px, y + 0.06, z); b.scale.setScalar(k); g.add(b);
    g.add(cyl(mats.iron, px - 0.3 * k, y + 0.45 * k, z, px + 0.3 * k, y + 0.45 * k, z, 0.04 * k, 6));
  }
  world.addCollider(x - 0.7 * k, y, z - 0.25 * k, x + 0.7 * k, y + 0.75 * k, z + 0.25 * k);
}

let ROLLER = null;
/** Roller fairlead / mooring chock at the bulwark. */
function fairlead(g, x, y, s) {
  if (!ROLLER) ROLLER = latheGeo('roller', [[0.06, 0], [0.16, 0.0], [0.16, 0.04], [0.1, 0.07], [0.1, 0.27], [0.16, 0.3], [0.16, 0.34], [0.06, 0.34]], TIER.fine <= 1 ? 8 : 14);
  const z = s * (edge(x) - 0.42);
  const f = new THREE.Group(); f.position.set(x, y, z); f.rotation.y = -s * Math.atan(edgeSlope(x)); g.add(f);
  f.add(box(mats.iron, 1.0, 0.1, 0.4, 0, 0.05, 0));
  for (const dx of [-0.32, 0.32]) { f.add(mk(ROLLER, mats.iron, dx, 0.1, 0)); f.add(vcyl(mats.iron, dx, 0.42, 0, 0.04, 0.07, 8)); }
  for (const dx of [-0.48, 0.48]) f.add(box(mats.iron, 0.08, 0.34, 0.34, dx, 0.25, 0.04));
  f.add(box(mats.iron, 1.04, 0.05, 0.1, 0, 0.47, 0.12));
}

/** Cargo hatch: riveted coaming with stiffeners, battens + cleats + wedges, tarpaulin with folds and lashings, margin planks. */
function hatch(world, g, x0, x1, hw, y, h = 0.85) {
  const xc = (x0 + x1) / 2, L = x1 - x0, W = 2 * hw;
  g.add(box(mats.steelDark, L, h - 0.14, W, xc, y + (h - 0.14) / 2, 0, { cast: true }));
  g.add(box(mats.steelDark, L + 0.12, 0.05, W + 0.12, xc, y + h - 0.16, 0));                    // coaming flat bar
  g.add(box(mats.canvas, L + 0.08, 0.2, W + 0.08, xc, y + h - 0.06, 0, { cast: true }));
  // tarpaulin crown with a slight camber over the hatch boards
  g.add(box(mats.canvas, L - 0.1, 0.05, W - 0.4, xc, y + h + 0.06, 0));
  g.add(box(mats.canvas, L - 0.2, 0.04, W * 0.4, xc, y + h + 0.1, 0));
  // margin planks round the hatch (teak) and deck seam iron
  g.add(box(mats.woodDark, L + 0.8, 0.012, 0.25, xc, y + 0.006, -hw - 0.3)); g.add(box(mats.woodDark, L + 0.8, 0.012, 0.25, xc, y + 0.006, hw + 0.3));
  g.add(box(mats.woodDark, 0.25, 0.012, W + 0.35, x0 - 0.275, y + 0.006, 0)); g.add(box(mats.woodDark, 0.25, 0.012, W + 0.35, x1 + 0.275, y + 0.006, 0));
  for (const s of [-1, 1]) {
    g.add(box(mats.woodDark, L + 0.12, 0.07, 0.04, xc, y + h - 0.22, s * (hw + 0.06)));
    g.add(box(mats.woodDark, 0.04, 0.07, W + 0.12, xc + s * (L / 2 + 0.06), y + h - 0.22, 0));
    for (let x = x0 + 0.35; x < x1 - 0.2; x += 0.7) {
      g.add(box(mats.iron, 0.1, 0.16, 0.07, x, y + h - 0.24, s * (hw + 0.1)));                     // cleat
      const w = box(mats.oak, 0.18, 0.06, 0.05, x + 0.04, y + h - 0.2, s * (hw + 0.12)); w.rotation.y = 0.25; g.add(w); // wedge
    }
    for (let z = -hw + 0.35; z < hw - 0.2; z += 0.7) {
      g.add(box(mats.iron, 0.07, 0.16, 0.1, xc + s * (L / 2 + 0.1), y + h - 0.24, z));
      const w = box(mats.oak, 0.05, 0.06, 0.18, xc + s * (L / 2 + 0.12), y + h - 0.2, z + 0.04); w.rotation.y = 0.25; g.add(w);
    }
    // stiffeners of the coaming (with brackets to the deck)
    for (let x = x0 + 0.6; x < x1 - 0.3; x += 1.2) {
      g.add(box(mats.steelDark, 0.06, h - 0.3, 0.1, x, y + (h - 0.3) / 2, s * (hw + 0.04)));
      g.add(box(mats.steelDark, 0.04, 0.2, 0.22, x, y + 0.1, s * (hw + 0.1)));
    }
    // tarpaulin folds at the corners
    for (const e of [-1, 1]) {
      const f = box(mats.canvas, 0.18, 0.28, 0.04, xc + e * (L / 2 + 0.06), y + h - 0.2, s * (hw + 0.06)); f.rotation.y = e * s * 0.785; g.add(f);
    }
  }
  // rope lashings over the tarpaulin (with sag towards the edges)
  for (let x = x0 + 0.8; x < x1 - 0.5; x += 1.4) {
    g.add(box(mats.rope, 0.03, 0.02, W - 0.4, x, y + h + 0.095, 0));
    for (const s of [-1, 1]) { const r = cyl(mats.rope, x, y + h + 0.09, s * (hw - 0.2), x, y + h - 0.2, s * (hw + 0.1), 0.012, 4); g.add(r); }
  }
  world.addCollider(x0 - 0.1, y, -hw - 0.1, x1 + 0.1, y + h + 0.1, hw + 0.1);
}

/** Admiralty-pattern kedge anchor with its stock, lying on deck (lashed). */
function kedge(g, x, y, z, yaw) {
  const k = new THREE.Group(); k.position.set(x, y, z); k.rotation.y = yaw; g.add(k);
  k.add(cyl(mats.iron, -1.0, 0.09, 0, 1.0, 0.09, 0, 0.07, 8, 0.05));                    // shank
  k.add(cyl(mats.iron, 1.15, 0.06, -0.9, 1.15, 0.06, 0.9, 0.045, 8));                   // stock (folded flat)
  for (const s of [-1, 1]) { k.add(ball(mats.iron, 1.15, 0.06, s * 0.92, 0.06, 6, 4)); k.add(cyl(mats.iron, -1.0, 0.09, 0, -1.25, 0.09, s * 0.7, 0.06, 6, 0.04)); k.add(box(mats.iron, 0.3, 0.05, 0.25, -1.22, 0.05, s * 0.72)); }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.03, 5, 12), mats.iron); ring.rotation.x = Math.PI / 2; ring.position.set(1.3, 0.04, 0); k.add(ring);
  for (const xx of [-0.4, 0.5]) k.add(cyl(mats.rope, xx, 0.0, -0.15, xx, 0.17, 0.0, 0.015, 4));
}

/** Electric deck crane (Stothert & Pitt type). yaw: direction of the jib (0 = forward). */
function crane(world, parent, wires, x, y, z, yaw, L = 8.6, elev = 0.62) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = yaw; parent.add(g);
  const W = mats.paintWhite, D = mats.steelDark;
  g.add(vcyl(D, 0, 0, 0, 0.1, 1.0, 14));
  g.add(vcyl(W, 0, 0.1, 0, 1.45, 0.78, 14, 0.62, true));
  g.add(vcyl(D, 0, 1.55, 0, 0.14, 0.86, 14));
  for (let i = 0; i < 10; i++) g.add(vcyl(mats.iron, Math.cos(i * 0.628) * 0.9, 0.1, Math.sin(i * 0.628) * 0.9, 0.05, 0.04, 6));
  // machinery house with motor, hoisting drum and counterweight
  g.add(box(W, 1.7, 1.25, 1.4, -0.3, 2.32, 0, { cast: true }));
  g.add(box(W, 1.85, 0.07, 1.55, -0.3, 2.98, 0));
  g.add(box(mats.windowLit, 0.02, 0.4, 0.6, 0.56, 2.5, 0));
  g.add(box(D, 0.5, 0.7, 1.2, -1.35, 2.1, 0));
  g.add(cyl(D, -0.2, 3.25, -0.4, -0.2, 3.25, 0.4, 0.22, 10));
  // A-frame
  for (const s of [-1, 1]) {
    g.add(cyl(W, -0.9, 2.98, s * 0.6, -0.5, 4.5, s * 0.12, 0.06, 6));
    g.add(cyl(W, 0.3, 2.98, s * 0.6, -0.5, 4.5, s * 0.12, 0.05, 6));
  }
  g.add(cyl(mats.iron, -0.5, 4.5, -0.2, -0.5, 4.5, 0.2, 0.09, 8));
  // lattice jib
  const jx = 0.55, jy = 1.95, tx = jx + Math.cos(elev) * L, ty = jy + Math.sin(elev) * L;
  for (const s of [-1, 1]) g.add(cyl(W, jx, jy, s * 0.5, tx, ty, s * 0.09, 0.075, 6, 0.055, true));
  const N = 7;
  for (let i = 1; i < N; i++) {
    const f = i / N, f2 = (i + 1) / N, wz = 0.5 - 0.41 * f, wz2 = 0.5 - 0.41 * f2;
    const px = jx + (tx - jx) * f, py = jy + (ty - jy) * f, qx = jx + (tx - jx) * f2, qy = jy + (ty - jy) * f2;
    g.add(cyl(W, px, py, -wz, px, py, wz, 0.03, 5));
    if (i < N - 1) g.add(cyl(W, px, py, (i % 2 ? -1 : 1) * wz, qx, qy, (i % 2 ? 1 : -1) * wz2, 0.025, 5));
  }
  g.add(cyl(mats.iron, tx, ty, -0.14, tx, ty, 0.14, 0.2, 10));               // jib head sheave
  g.add(box(D, 0.5, 0.2, 0.3, jx - 0.05, jy - 0.05, 0.5)); g.add(box(D, 0.5, 0.2, 0.3, jx - 0.05, jy - 0.05, -0.5));
  // wires (in world space)
  g.updateMatrixWorld(true);
  const v = new THREE.Vector3(), w = new THREE.Vector3();
  const seg = (ax, ay, az, bx, by, bz, r) => { v.set(ax, ay, az).applyMatrix4(g.matrix); w.set(bx, by, bz).applyMatrix4(g.matrix); wires.seg(v.x, v.y, v.z, w.x, w.y, w.z, r); };
  for (const s of [-1, 1]) seg(-0.5, 4.5, s * 0.15, tx - 0.1, ty + 0.1, s * 0.08, 0.014);  // luffing ropes
  seg(-0.2, 3.4, 0, tx, ty + 0.2, 0, 0.012);                                               // hoist rope
  const hy = Math.max(2.4, ty - 3.0);
  seg(tx + 0.2, ty, 0, tx + 0.2, hy, 0, 0.012);
  // hook block: cheeks, sheave, swivel and cargo hook
  for (const s of [-1, 1]) g.add(box(mats.iron, 0.24, 0.32, 0.03, tx + 0.2, hy - 0.1, s * 0.05));
  g.add(cyl(mats.iron, tx + 0.2, hy - 0.05, -0.04, tx + 0.2, hy - 0.05, 0.04, 0.1, 10));
  g.add(ball(mats.iron, tx + 0.2, hy - 0.3, 0, 0.07, 8, 6));
  const hk = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.025, 5, 10, Math.PI * 1.45), mats.iron); hk.rotation.z = Math.PI * 0.95; hk.position.set(tx + 0.2, hy - 0.46, 0); g.add(hk);
  // driver's platform with railing and controller, wire guides, jib rest
  g.add(box(mats.steelFloor, 0.7, 0.05, 1.3, 0.85, 1.7, 0));
  for (const s of [-1, 1]) g.add(cyl(W, 1.15, 1.72, s * 0.62, 0.62, 1.2, s * 0.62, 0.03, 5));
  for (const [ax, az, bx, bz] of [[1.18, -0.63, 1.18, 0.63], [1.18, -0.63, 0.6, -0.63], [1.18, 0.63, 0.6, 0.63]]) {
    g.add(cyl(W, ax, 2.72, az, bx, 2.72, bz, 0.018, 5));
    g.add(cyl(W, ax, 2.2, az, bx, 2.2, bz, 0.012, 4));
  }
  for (const [px, pz] of [[1.18, -0.63], [1.18, 0.63], [1.18, 0]]) g.add(cyl(W, px, 1.72, pz, px, 2.72, pz, 0.02, 5));
  g.add(vcyl(mats.steelDark, 0.95, 1.72, -0.35, 0.75, 0.1, 10));
  g.add(cyl(mats.brass, 0.95, 2.47, -0.35, 1.05, 2.75, -0.35, 0.015, 4));
  g.add(ball(mats.woodDark, 1.05, 2.77, -0.35, 0.03, 6, 4));
  world.addCollider(x - 0.95, y, z - 0.95, x + 0.95, y + 3.1, z + 0.95);
}

/** Spur gear wheel (disc, hub, teeth) with its axis along z, as meshes added to g. */
function gear(g, x, y, z, r, w, teeth, mat = mats.iron) {
  g.add(cyl(mat, x, y, z - w / 2, x, y, z + w / 2, r, Math.max(16, teeth), r, false));
  g.add(cyl(mat, x, y, z - w, x, y, z + w, r * 0.25, 10));
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * TAU;
    const t = box(mat, 0.05 * Math.max(1, r * 2.5), 0.05, w, x + Math.cos(a) * (r + 0.02), y + Math.sin(a) * (r + 0.02), z); t.rotation.z = a; g.add(t);
  }
}

/** Cargo / warping winch: bed, side frames, barrel with brake band, warping ends, gearing, twin steam cylinders. */
function winch(world, g, x, y, z) {
  g.add(box(mats.steelDark, 1.5, 0.12, 1.7, x, y + 0.06, z));
  for (const s of [-1, 1]) {
    g.add(box(mats.steelDark, 1.0, 0.75, 0.1, x, y + 0.45, z + s * 0.55));
    g.add(box(mats.steelDark, 0.6, 0.25, 0.1, x - 0.1, y + 0.9, z + s * 0.55));
  }
  g.add(cyl(mats.iron, x, y + 0.6, z - 0.5, x, y + 0.6, z + 0.5, 0.3, 16));
  for (const s of [-1, 1]) {
    g.add(cyl(mats.iron, x, y + 0.6, z + s * 0.6, x, y + 0.6, z + s * 0.95, 0.2, 14, 0.26));          // warping end
    g.add(cyl(mats.iron, x, y + 0.6, z + s * 0.5, x, y + 0.6, z + s * 0.54, 0.42, 16));               // barrel flange
    g.add(cyl(mats.iron, x, y + 0.6, z + s * 0.95, x, y + 0.6, z + s * 1.0, 0.27, 14));
  }
  // brake band round the barrel flange with the lever
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.02, 4, 20, Math.PI * 1.6), mats.steelDark); band.position.set(x, y + 0.6, z - 0.45); band.rotation.z = -0.4; g.add(band);
  g.add(cyl(mats.steelDark, x + 0.35, y + 0.25, z - 0.45, x + 0.7, y + 1.05, z - 0.45, 0.02, 5));
  // gearing: main wheel on the barrel shaft, pinion on the crank shaft, pawl
  gear(g, x, y + 0.6, z + 0.42, 0.38, 0.06, 26);
  gear(g, x - 0.38, y + 0.98, z + 0.42, 0.12, 0.07, 10);
  g.add(cyl(mats.iron, x - 0.38, y + 0.98, z - 0.6, x - 0.38, y + 0.98, z + 0.6, 0.035, 8));
  g.add(box(mats.iron, 0.05, 0.25, 0.04, x + 0.43, y + 0.85, z + 0.42));
  // twin steam cylinders with valve chests and a reversing lever
  for (const s of [-1, 1]) {
    g.add(cyl(mats.steelDark, x - 0.55, y + 0.4, z + s * 0.3, x - 0.55, y + 0.9, z + s * 0.3, 0.16, 12, 0.16, true));
    g.add(box(mats.steelDark, 0.16, 0.36, 0.2, x - 0.75, y + 0.65, z + s * 0.3));
    g.add(cyl(mats.iron, x - 0.55, y + 0.9, z + s * 0.3, x - 0.4, y + 0.98, z + s * 0.3, 0.025, 5));
  }
  g.add(cyl(mats.steelDark, x - 0.75, y + 0.75, z - 0.3, x - 0.75, y + 0.75, z + 0.3, 0.04, 6));            // manifold between the valve chests
  g.add(cyl(mats.steelDark, x - 0.75, y + 0.75, z, x - 0.75, y + 1.3, z, 0.04, 6));                          // steam pipe
  g.add(cyl(mats.brass, x + 0.5, y + 0.12, z + 0.3, x + 0.62, y + 1.05, z + 0.3, 0.02, 5));                // lever pivoted on the bed
  g.add(ball(mats.woodDark, x + 0.62, y + 1.07, z + 0.3, 0.035, 6, 4));
  world.addCollider(x - 0.75, y, z - 0.95, x + 0.75, y + 1.0, z + 0.95);
}

/** Stockless anchor. Local frame: crown at the origin, shank along +y, flukes spread along ±x, thickness along z. */
function anchor(k = 1) {
  const g = new THREE.Group();
  const I = mats.iron;
  // shank (tapered, octagonal) with a forelock head
  g.add(cyl(I, 0, 0.1 * k, 0, 0, 3.0 * k, 0, 0.17 * k, 8, 0.12 * k, true));
  g.add(cyl(I, 0, 2.95 * k, 0, 0, 3.15 * k, 0, 0.15 * k, 8, 0.15 * k, true));
  // crown with tripping palms
  const crown = new THREE.Shape();
  crown.moveTo(-1.0, -0.1); crown.lineTo(1.0, -0.1); crown.quadraticCurveTo(1.12, 0.12, 0.9, 0.34); crown.lineTo(0.25, 0.42); crown.quadraticCurveTo(0, 0.5, -0.25, 0.42); crown.lineTo(-0.9, 0.34); crown.quadraticCurveTo(-1.12, 0.12, -1.0, -0.1);
  const cg = new THREE.ExtrudeGeometry(crown, { depth: 0.46, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 1, curveSegments: 5 });
  cg.translate(0, 0, -0.23); cg.scale(k, k, k);
  const cm = new THREE.Mesh(cg, I); cm.castShadow = true; g.add(cm);
  for (const s of [-1, 1]) {
    // fluke arm + broad palm
    g.add(cyl(I, s * 0.72 * k, 0.25 * k, 0.05 * k, s * 0.92 * k, 1.5 * k, 0.15 * k, 0.17 * k, 6, 0.1 * k, true));
    const palm = new THREE.Shape(); palm.moveTo(-0.28, 0); palm.lineTo(0.28, 0); palm.lineTo(0.22, 0.6); palm.quadraticCurveTo(0, 0.9, -0.22, 0.6); palm.closePath();
    const pg = new THREE.ExtrudeGeometry(palm, { depth: 0.08, bevelEnabled: false, curveSegments: 4 });
    pg.translate(0, 0, -0.04); pg.scale(k, k, k);
    const pm = new THREE.Mesh(pg, I); pm.position.set(s * 0.9 * k, 1.15 * k, 0.15 * k); pm.rotation.set(-0.12, 0, s * 0.12); g.add(pm);
  }
  // D-shackle + anchor ring
  const sh = new THREE.Mesh(new THREE.TorusGeometry(0.22 * k, 0.05 * k, 6, 14, Math.PI * 1.2), I); sh.position.set(0, 3.3 * k, 0); sh.rotation.set(0, Math.PI / 2, -Math.PI * 0.1); g.add(sh);
  g.add(cyl(I, 0, 3.2 * k, -0.2 * k, 0, 3.2 * k, 0.2 * k, 0.05 * k, 8));
  for (const s of [-1, 1]) g.add(ball(I, 0, 3.2 * k, s * 0.21 * k, 0.07 * k, 8, 6));
  return g;
}

let LINK = null;
/** Stud-link chain link (oval with a stud across). */
function linkGeo() {
  if (LINK) return LINK;
  const lo = TIER.fine <= 1;
  const t = new THREE.TorusGeometry(0.115, 0.04, lo ? 4 : 6, lo ? 10 : 14); t.scale(1.75, 1, 1);
  LINK = merge([t, cylG([0, -0.1, 0], [0, 0.1, 0], 0.03, lo ? 4 : 6)]);
  return LINK;
}

export function buildDeckMachinery(world, parent) {
  const root = new THREE.Group(); root.name = 'deckMachinery';
  parent.add(root);
  world.markForBake(root);
  const wires = new Wires(mats.iron);
  const hwAt = (x, y) => hullHalfWidth(x, y);

  // =====================================================================
  // FORECASTLE
  // =====================================================================
  // --- chain cables: hawse pipes -> wildcats (windlass) ---
  const links = [];
  const HX = 125.4, HZ = 1.2, WX = 116.6, WZ = 2.25;
  for (const s of [-1, 1]) {
    // deck hawse pipe (bolster) and chain pipe
    const hp = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.13, 6, 14), mats.iron); hp.rotation.x = Math.PI / 2; hp.scale.set(1.3, 1, 1); hp.position.set(HX + 0.5, B + 0.1, s * HZ * 0.92); root.add(hp);
    root.add(box(mats.iron, 1.5, 0.05, 0.9, HX + 0.45, B + 0.025, s * HZ * 0.93));
    // wildcat with brake, on a bedplate
    root.add(vcyl(mats.steelDark, WX, B, s * WZ, 0.14, 1.25, 16));
    root.add(lathe(mats.iron, [[1.0, 0], [1.0, 0.12], [0.62, 0.18], [0.62, 0.28], [0.95, 0.34], [0.95, 0.42], [0.55, 0.5], [0.55, 0.62], [0.95, 0.7], [0.95, 0.8], [0.5, 0.9], [0.42, 1.25], [0.52, 1.38], [0.52, 1.46], [0, 1.5]], 16, WX, B + 0.14, s * WZ));
    for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; const w = box(mats.iron, 0.32, 0.22, 0.12, WX + Math.cos(a) * 0.72, B + 0.7, s * WZ + Math.sin(a) * 0.72); w.rotation.y = -a; root.add(w); }
    world.addCollider(WX - 0.95, B, s * WZ - 0.95, WX + 0.95, B + 1.6, s * WZ + 0.95);
    // brake handwheel pedestal
    root.add(vcyl(mats.steelDark, WX - 1.5, B, s * (WZ + 0.9), 0.95, 0.09, 8));
    const hwl = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.025, 5, 14), mats.brass); hwl.rotation.x = Math.PI / 2; hwl.position.set(WX - 1.5, B + 0.98, s * (WZ + 0.9)); root.add(hwl);
    // spurling pipe abaft the wildcat
    root.add(vcyl(mats.iron, WX - 1.3, B, s * (WZ + 0.55), 0.3, 0.26, 10));
    // chain stopper / riding chock
    const cx = (HX + WX) / 2 + 1, cz = s * (HZ + (WZ - 0.78 - HZ) * ((HX - cx) / (HX - WX)));
    root.add(box(mats.iron, 0.9, 0.3, 0.14, cx, B + 0.15, cz - 0.3));
    root.add(box(mats.iron, 0.9, 0.3, 0.14, cx, B + 0.15, cz + 0.3));
    root.add(box(mats.iron, 0.12, 0.38, 0.74, cx, B + 0.19, cz));
    // chain on deck: hawse pipe -> tangent point on the inboard side of the wildcat, rising onto it
    const dx = WX - HX, dz = s * (WZ - 0.78) - s * HZ, len = Math.hypot(dx, dz), n = Math.floor(len / 0.34), yaw = Math.atan2(-dz, dx);
    for (let i = 0; i <= n; i++) {
      const lift = Math.max(0, 1 - (n - i) / 5) * 0.45;
      links.push([HX + (dx * i) / n, B + (i % 2 ? 0.16 : 0.07) + lift, s * HZ + (dz * i) / n, yaw, i % 2]);
    }
    // 3/4 turn round the wildcat (inboard -> aft -> outboard), then down the spurling pipe
    for (let i = 1; i <= 7; i++) {
      const b = (i / 8) * Math.PI;
      links.push([WX - Math.sin(b) * 0.78, B + 0.56, s * (WZ - Math.cos(b) * 0.78), Math.atan2(-s * Math.sin(b), -Math.cos(b)), i % 2]);
    }
  }
  {
    const im = new THREE.InstancedMesh(linkGeo(), mats.iron, links.length);
    const o = new THREE.Object3D(); o.rotation.order = 'YXZ';
    links.forEach(([x, y, z, yaw, vert], i) => {
      o.position.set(x, y, z); o.rotation.set(vert ? 0 : Math.PI / 2, yaw, 0); o.updateMatrix(); im.setMatrixAt(i, o.matrix);
    });
    im.instanceMatrix.needsUpdate = true; im.name = 'anchorChains'; root.add(im);
  }

  // --- centre anchor in its well at the stem + anchor crane ---
  {
    const a = anchor(0.8);
    a.position.set(129.3, B + 0.2, 0); a.rotation.set(Math.PI / 2, 0, -Math.PI / 2); // shank pointing forward, flukes athwartships
    root.add(a);
    root.add(box(mats.steelDark, 3.2, 0.06, 0.9, 131.0, B + 0.03, 0));               // well plating
    for (const s of [-1, 1]) root.add(box(mats.iron, 3.0, 0.14, 0.05, 131.0, B + 0.07, s * 0.42));
    // crane
    const cx = 127.6;
    root.add(vcyl(mats.steelDark, cx, B, 0, 0.12, 0.6, 12));
    root.add(vcyl(mats.paintWhite, cx, B + 0.1, 0, 1.25, 0.42, 12, 0.34, true));
    root.add(vcyl(mats.paintWhite, cx, B + 1.35, 0, 1.15, 0.26, 10, 0.2));
    root.add(cyl(mats.paintWhite, cx + 0.05, B + 2.35, 0, 131.2, B + 1.55, 0, 0.16, 8, 0.1, true));
    root.add(cyl(mats.paintWhite, cx - 1.0, B + 1.9, 0, cx + 0.05, B + 2.35, 0, 0.14, 8));
    root.add(box(mats.steelDark, 0.5, 0.5, 0.6, cx - 1.1, B + 1.8, 0));               // counterweight
    root.add(box(mats.steelDark, 0.7, 0.6, 0.7, cx - 0.15, B + 1.2, 0));              // gear case
    wires.seg(cx, B + 2.5, 0, 131.2, B + 1.62, 0, 0.012);
    root.add(cyl(mats.iron, 131.2, B + 1.55, -0.1, 131.2, B + 1.55, 0.1, 0.14, 8));
    wires.seg(131.25, B + 1.5, 0, 131.25, B + 0.5, 0, 0.014);
    root.add(ball(mats.iron, 131.25, B + 0.45, 0, 0.1, 6, 4));
    world.addCollider(cx - 0.45, B, -0.45, cx + 0.45, B + 2.4, 0.45);
  }

  // --- bower anchors at the hull sides below the hawse pipes ---
  for (const s of [-1, 1]) {
    const xt = 127.25, yt = 20.75, xb = 126.75, yb = 17.5;
    const top = new THREE.Vector3(xt, yt, s * (hwAt(xt, yt) + 0.2)), bot = new THREE.Vector3(xb, yb, s * (hwAt(xb, yb) + 0.26));
    const Y = top.clone().sub(bot).normalize();
    const hs = (hwAt(xb + 0.5, 19) - hwAt(xb - 0.5, 19));
    const Z = new THREE.Vector3(-hs * s, 0, s).normalize();
    const Xa = new THREE.Vector3().crossVectors(Y, Z).normalize(); Z.crossVectors(Xa, Y).normalize();
    const a = anchor(1.0);
    a.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(Xa, Y, Z));
    a.position.copy(bot);
    root.add(a);
  }

  // --- capstans, bitts, fairleads ---
  for (const s of [-1, 1]) {
    capstan(world, root, 113.0, B, s * 3.0, 1.1);
    bitts(world, root, 119.3, B, s * 2.75, 0.9);
    bitts(world, root, 111.8, B, s * 4.6);
    bitts(world, root, 103.2, B, s * 6.2);
    bitts(world, root, 99.3, B, s * 7.2);
    for (const x of [122.5, 115, 106, 100.5]) fairlead(root, x, B, s);
    cowl(root, 100.0, B, s * 4.0, 0.42, 1.9, s * 0.2);
    world.addCollider(99.45, B, s * 4.0 - 0.55, 100.55, B + 2, s * 4.0 + 0.55);
    mushroom(root, 108.2, B, s * 1.6, 0.2, 0.7);
  }

  // --- breakwater (V, apex forward) ---
  {
    const ax = 110.6, ex = 106.6, ez = 5.2, H = 0.78;
    const L = Math.hypot(ax - ex, ez);
    for (const s of [-1, 1]) {
      const m = box(mats.paintWhite, L + 0.1, H, 0.07, (ax + ex) / 2, B + H / 2, (s * ez) / 2, { cast: true });
      m.rotation.y = Math.atan2(-s * ez, ex - ax); root.add(m);
      const cap = box(mats.paintWhite, L + 0.1, 0.05, 0.16, (ax + ex) / 2, B + H, (s * ez) / 2); cap.rotation.y = m.rotation.y; root.add(cap);
      for (let i = 1; i < 6; i++) { // stays on the after side
        const f = i / 6, px = ax + (ex - ax) * f, pz = s * ez * f;
        root.add(cyl(mats.paintWhite, px - 0.03, B + H - 0.08, pz - s * 0.03, px - 0.55, B, pz - s * 0.4, 0.035, 5));
      }
      const n = 9;
      for (let i = 0; i < n; i++) {
        const x0 = ax + ((ex - ax) * i) / n, x1 = ax + ((ex - ax) * (i + 1)) / n, z0 = (s * ez * i) / n, z1 = (s * ez * (i + 1)) / n;
        world.addCollider(Math.min(x0, x1) - 0.05, B, Math.min(z0, z1) - 0.05, Math.max(x0, x1) + 0.05, B + H, Math.max(z0, z1) + 0.05);
      }
    }
  }

  // --- hatch No. 1 and the derrick winch at the foot of the foremast ---
  hatch(world, root, 101.0, 105.4, 2.2, B, 0.8);
  winch(world, root, 99.5, B, 0);
  kedge(root, 120.8, B, 0, 0);

  // =====================================================================
  // FORWARD WELL DECK
  // =====================================================================
  hatch(world, root, 86.9, 91.4, 2.5, C);   // No. 2
  hatch(world, root, 81.3, 85.3, 2.5, C);   // No. 3
  for (const s of [-1, 1]) {
    crane(world, root, wires, 79.7, C, s * 9.5, s * 0.35, 8.4, 0.66);
    bitts(world, root, 84.0, C, s * 9.9);
    fairlead(root, 88.6, C, s);
  }

  // =====================================================================
  // AFT WELL DECK + OPEN B DECK AFT
  // =====================================================================
  hatch(world, root, -97.2, -93.4, 2.3, C);    // No. 5
  hatch(world, root, -103.6, -99.4, 2.3, C);   // No. 6
  for (const s of [-1, 1]) {
    crane(world, root, wires, -98.3, C, s * 9.9, Math.PI - s * 0.35, 8.2, 0.7);
    crane(world, root, wires, -85.6, B, s * 10.3, Math.PI - s * 0.3, 8.6, 0.6);
    bitts(world, root, -96.2, C, s * 11.9);
    fairlead(root, -100.5, C, s);
    bench(world, root, -84.3, B, s * 4.3, s);
    bench(world, root, -76.6, B, s * 2.4, s);
  }
  winch(world, root, -82.6, B, 0);

  // =====================================================================
  // POOP DECK
  // =====================================================================
  for (const s of [-1, 1]) {
    capstan(world, root, -113.6, B, s * 4.2, 1.05);
    capstan(world, root, -127.2, B, s * 2.5, 0.95);
    bitts(world, root, -112.6, B, s * 9.6);
    bitts(world, root, -118.4, B, s * 8.6);
    bitts(world, root, -129.0, B, s * 4.9, 0.9);
    for (const x of [-110, -120.5, -130.5]) fairlead(root, x, B, s);
    cowl(root, -110.4, B, s * 3.1, 0.4, 1.8, s * 0.2);
    world.addCollider(-110.95, B, s * 3.1 - 0.52, -109.85, B + 2, s * 3.1 + 0.52);
    cowl(root, -125.4, B, s * 3.9, 0.34, 1.5, Math.PI + s * 0.3);
    world.addCollider(-125.85, B, s * 3.9 - 0.45, -124.95, B + 1.8, s * 3.9 + 0.45);
  }
  hatch(world, root, -110.9, -108.7, 1.2, B, 0.7);
  // steering-gear skylight
  root.add(box(mats.paintWhite, 1.6, 0.5, 1.8, -124.9, B + 0.25, 0));
  for (const s of [-1, 1]) { const p = box(mats.windowLit, 1.5, 0.03, 0.95, -124.9, B + 0.63, s * 0.44); p.rotation.x = s * 0.3; root.add(p); }
  root.add(box(mats.paintWhite, 1.66, 0.06, 0.08, -124.9, B + 0.78, 0));
  for (const [x, ry] of [[-125.68, Math.PI], [-124.12, 0]]) { const gm = mk(gableGeo(0.9, 0.28), mats.paintWhite, x, B + 0.5, 0); gm.rotation.y = ry; root.add(gm); } // gable ends
  world.addCollider(-125.7, B, -0.9, -124.1, B + 0.8, 0.9);

  // --- docking bridge: raised athwartship walkway with telegraphs, wheel and binnacle ---
  {
    const xa = -122.8, xf = -121.2, yb = B + 2.4, xm = (xa + xf) / 2;
    const half = edge(xm) + 0.35;
    const W = mats.paintWhite;
    root.add(box(mats.deckWood, xf - xa, 0.06, 2 * half, xm, yb - 0.03, 0, { cast: true }));
    root.add(box(W, xf - xa + 0.1, 0.16, 2 * half + 0.1, xm, yb - 0.14, 0));
    world.addFloor({ y: yb, x0: xa, x1: xf, z0: -half, z1: half });
    // stanchions + knee braces
    for (const z of [-half + 1.3, -5.6, -2.6, 2.6, 5.6, half - 1.3]) {
      for (const x of [xa + 0.15, xf - 0.15]) root.add(vcyl(W, x, B, z, 2.2, 0.06, 8));
      root.add(cyl(W, xa + 0.15, B + 1.5, z, xa + 0.15, yb - 0.2, z + 0.7, 0.03, 5));
      root.add(cyl(W, xa + 0.15, B + 1.5, z, xa + 0.15, yb - 0.2, z - 0.7, 0.03, 5));
      world.addCollider(xa + 0.05, B, z - 0.1, xa + 0.25, yb, z + 0.1);
      world.addCollider(xf - 0.25, B, z - 0.1, xf - 0.05, yb, z + 0.1);
    }
    // railings (gap on the forward side for the stair)
    const rail = (x0, z0, x1, z1) => {
      const n = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / 1.4));
      for (let i = 0; i <= n; i++) root.add(vcyl(W, x0 + ((x1 - x0) * i) / n, yb, z0 + ((z1 - z0) * i) / n, 1.02, 0.022, 6));
      for (const h of [0.35, 0.7]) root.add(cyl(W, x0, yb + h, z0, x1, yb + h, z1, 0.014, 5));
      root.add(cyl(mats.woodDark, x0, yb + 1.04, z0, x1, yb + 1.04, z1, 0.035, 6));
      world.addCollider(Math.min(x0, x1) - 0.05, yb, Math.min(z0, z1) - 0.05, Math.max(x0, x1) + 0.05, yb + 1.1, Math.max(z0, z1) + 0.05);
    };
    rail(xa + 0.04, -half + 0.04, xa + 0.04, half - 0.04);
    rail(xf - 0.04, -half + 0.04, xf - 0.04, -0.58);
    rail(xf - 0.04, 0.58, xf - 0.04, half - 0.04);
    rail(xa + 0.04, -half + 0.04, xf - 0.04, -half + 0.04);
    rail(xa + 0.04, half - 0.04, xf - 0.04, half - 0.04);
    // stair from the poop deck (centreline, rising aft)
    const x0 = xf + 3.5, sw = 0.5, rise = yb - B, N = 12;
    world.addRamp({ x0, x1: xf, z0: -sw, z1: sw, y0: B, y1: yb, axis: 'x' });
    for (let i = 0; i < N; i++) {
      const x = x0 + ((xf - x0) * (i + 0.5)) / N, y = B + (rise * (i + 1)) / N;
      root.add(box(mats.woodDark, 0.27, 0.04, 2 * sw, x, y - 0.02, 0)); // treads reach the stringers
    }
    for (const s of [-1, 1]) {
      const z = s * (sw + 0.02);
      const st = cyl(W, x0, B + 0.03, z, xf, yb + 0.03, z, 0.06, 4); st.scale.z *= 0.35; root.add(st);
      root.add(cyl(mats.woodDark, x0, B + 1.0, z, xf, yb + 1.0, z, 0.03, 6));
      root.add(cyl(W, x0, B + 0.55, z, xf, yb + 0.55, z, 0.014, 5));
      for (let k = 0; k <= 3; k++) { const x = x0 + ((xf - x0) * k) / 3, y = B + (rise * k) / 3; root.add(vcyl(W, x, y, z, 1.0, 0.02, 5)); }
      world.addCollider(xf, B, Math.min(z, z + s * 0.06), x0 - 0.3, yb + 1.0, Math.max(z, z + s * 0.06));
    }
    world.addCollider(xf + 0.9, B, -sw, x0 - 0.45, B + 0.47, sw);          // no walking under the stair
    world.addCollider(xf, B + 0.9, -sw, xf + 1.9, B + 1.2, sw);            // (closes the low part from behind as well)
    // engine-order and docking telegraphs, emergency steering wheel, binnacle
    const telegraph = (z) => {
      root.add(vcyl(mats.brass, xm - 0.25, yb, z, 0.06, 0.2, 10));
      root.add(vcyl(mats.brass, xm - 0.25, yb, z, 0.95, 0.075, 10, 0.06));
      root.add(cyl(mats.brass, xm - 0.25, yb + 1.12, z - 0.1, xm - 0.25, yb + 1.12, z + 0.1, 0.21, 14));
      for (const s of [-1, 1]) {
        root.add(cyl(mats.porcelain, xm - 0.25, yb + 1.12, z + s * 0.1, xm - 0.25, yb + 1.12, z + s * 0.108, 0.18, 20));
        const bez = new THREE.Mesh(new THREE.TorusGeometry(0.185, 0.015, 4, 24), mats.brass); bez.position.set(xm - 0.25, yb + 1.12, z + s * 0.11); root.add(bez);
        // dial divisions (AHEAD / ASTERN sectors) and the reply pointer
        for (let k = 0; k <= 10; k++) {
          const a = Math.PI * (0.1 + 0.8 * (k / 10)), d = box(mats.iron, 0.07, 0.008, 0.004, 0, 0, 0);
          d.position.set(xm - 0.25 + Math.cos(a) * 0.13, yb + 1.12 + Math.sin(a) * 0.13, z + s * 0.111); d.rotation.z = a; root.add(d);
        }
        root.add(box(mats.hullRed, 0.3, 0.012, 0.004, xm - 0.25, yb + 1.12, z + s * 0.111));
        const ptr = box(mats.iron, 0.012, 0.15, 0.006, 0, 0, 0); ptr.position.set(xm - 0.25 + 0.04, yb + 1.12 + 0.07, z + s * 0.114); ptr.rotation.z = -0.5; root.add(ptr);
      }
      for (const s of [-1, 1]) {
        root.add(cyl(mats.brass, xm - 0.25, yb + 1.12, z + s * 0.14, xm - 0.25 + s * 0.12, yb + 1.44, z + s * 0.14, 0.014, 5));
        root.add(ball(mats.oak, xm - 0.25 + s * 0.13, yb + 1.47, z + s * 0.14, 0.035, 6, 4));
      }
      world.addCollider(xm - 0.42, yb, z - 0.17, xm - 0.08, yb + 1.3, z + 0.17);
    };
    telegraph(-3.6); telegraph(3.6); telegraph(-half + 1.0); telegraph(half - 1.0);
    // wheel
    {
      const z = 1.7, wx = xm - 0.3, wy = yb + 1.05;
      root.add(vcyl(mats.mahogany, wx - 0.12, yb, z, 1.09, 0.11, 8, 0.08)); // pedestal carries the wheel axle
      root.add(box(mats.mahogany, 0.5, 0.06, 0.4, wx - 0.12, yb + 0.03, z));
      root.add(cyl(mats.brass, wx - 0.12, wy, z, wx + 0.14, wy, z, 0.035, 6));
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.03, 6, 20), mats.mahogany); rim.rotation.y = Math.PI / 2; rim.position.set(wx + 0.1, wy, z); root.add(rim);
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU;
        root.add(cyl(mats.mahogany, wx + 0.1, wy, z, wx + 0.1, wy + Math.sin(a) * 0.6, z + Math.cos(a) * 0.6, 0.018, 5));
      }
      root.add(cyl(mats.brass, wx + 0.06, wy, z, wx + 0.14, wy, z, 0.08, 8));
      world.addCollider(wx - 0.3, yb, z - 0.3, wx + 0.15, yb + 1.3, z + 0.3);
    }
    // binnacle
    {
      const z = -1.7, bx = xm - 0.25;
      root.add(vcyl(mats.mahogany, bx, yb, z, 0.95, 0.2, 10, 0.17));
      root.add(ball(mats.brass, bx, yb + 1.0, z, 0.19, 10, 6, 0.9));
      for (const s of [-1, 1]) root.add(ball(mats.iron, bx, yb + 0.92, z + s * 0.3, 0.085, 8, 6));
      world.addCollider(bx - 0.2, yb, z - 0.2, bx + 0.2, yb + 1.2, z + 0.2);
    }
    for (const z of [-4.6, 4.6]) ceilingLamp(world, root, xm, yb - 0.22, z);
    world.addInfo({
      title: 'Docking-Brücke',
      text: 'Die quer über das Poopdeck gespannte Docking-Brücke diente beim An- und Ablegen: Von hier überwachte ein Offizier das Heck und gab Befehle über Maschinentelegrafen und Telefon an die Kommandobrücke weiter. In der Unglücksnacht stand hier Quartermaster George Rowe, der zunächst nur ein vorbeigleitendes „Segelschiff“ zu sehen glaubte – den Eisberg. Später half er, die Notraketen abzufeuern.',
      x: xm, y: yb + 1.2, z: 2.8, radius: 3,
    });
  }

  root.add(wires.build('craneWires'));

  world.addInfo({
    title: 'Anker und Ankergeschirr',
    text: 'Die Titanic führte drei Anker: zwei Buganker von je knapp 8 Tonnen in den Klüsen an den Bordwänden und einen über 15 Tonnen schweren Mittelanker, der in einer Mulde auf der Back lag und mit einem eigenen Kran ausgesetzt wurde. Jedes Glied der Ankerketten wog rund 80 kg. Der Mittelanker wurde von 20 Pferden durch die Straßen von Netherton zum Bahnhof gezogen.',
    x: 118, y: B + 1.2, z: 0, radius: 4,
  });
  return {};
}
