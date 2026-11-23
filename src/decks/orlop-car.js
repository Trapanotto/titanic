// Orlop deck: William Carter's 1912 Renault Type CE Coupé de Ville beside its opened shipping crate with straw,
// cargo-hold furnishing that keeps walking lanes free (crates, barrels, bales, netted sack piles), mail-room furnishing.
import * as THREE from 'three';
import { mats } from '../core/materials.js';
import { TIER } from '../core/tier.js';
import { DECK_Y, hullHalfWidth } from '../core/constants.js';
import { PRESETS, overlap, sackPile, shelves, tableRect, safe, crate, stool, trunk, def, kitMats, Batch, LINING_INSET } from '../interior/kit.js';
import { carPaint } from './f-util.js';
import { bagPile } from './g-hero.js';
import { gratingMat } from './tank-lib.js';

const TAU = Math.PI * 2;
function rng(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const STRAW = 45;   // atlas cell

/** artillery wheel lying in the xy plane (axle along z) centred at (x, y, z): tyre, felloe, 12 wooden spokes, brass hub */
function wheel(p, x, y, z, side) {
  p.t(mats.rubber, 0.392, 0.058, x, y, z, 'z', 28, 8);
  p.t(mats.woodDark, 0.335, 0.028, x, y, z, 'z', 24, 4);
  p.t(mats.iron, 0.348, 0.012, x, y, z, 'z', 24, 3);
  for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU, m = p.fr(mats.oak, 0.03, 0.022, 0.022, 0.018, 0.28, x, y, z, {}); m.position.set(x + Math.cos(a) * 0.06, y + Math.sin(a) * 0.06, z); m.rotation.z = a - Math.PI / 2; }
  p.latheZ(mats.brass, [[0, 0], [0.085, 0], [0.085, 0.03], [0.06, 0.05], [0.055, 0.1], [0.035, 0.13], [0, 0.135]], x, y, z - side * 0.06, 12, side);
  p.cz(mats.woodDark, 0.09, 0.1, x, y, z, 12);
}
/** curved mudguard over a wheel (closed arc of thin plates), x = wheel centre */
function mudguard(p, x, y, z, a0, a1, r = 0.5, w = 0.26) {
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = a0 + ((a1 - a0) * (i + 0.5)) / n, L = (r * (a1 - a0)) / n + 0.01;
    const m = p.b(mats.iron, L, 0.012, w, x + Math.cos(a) * r, y + Math.sin(a) * r, z); m.rotation.z = a - Math.PI / 2; m.position.y -= 0.006;
  }
}

/** Renault Type CE Coupé de Ville (1912), front +x: coal-scuttle bonnet, radiators behind the engine, open chauffeur's
 *  seat, closed coupé body with windows and curtains, artillery wheels, mudguards, running boards, lamps, spare tyre. */
export const renault = def('ghRenault', [1.8, 4.6, 2.12], (p) => {
  // chassis: frame rails, dumb irons, axles, leaf springs, differential
  for (const z of [-0.43, 0.43]) { p.bb(mats.iron, 4.0, 0.12, 0.06, 0.1, 0.42, z, 0.01); p.bb(mats.iron, 0.3, 0.08, 0.05, 2.2, 0.4, z, 0.01).rotation.z = 0.25; }
  for (const [x, k] of [[1.45, 0], [-1.35, 1]]) {
    p.cz(mats.iron, 0.035, 1.5, x, 0.45, 0, 8);
    for (const z of [-0.43, 0.43]) for (let i = 0; i < 4; i++) p.bb(mats.iron, 1.0 - i * 0.18, 0.018, 0.05, x, 0.47 + i * 0.019, z, 0.004);
    if (k) p.s(mats.iron, 0.13, x, 0.45, 0.08, 1, 1, 1, false);
  }
  p.cx(mats.iron, 0.03, 2.05, -0.25, 0.42, 0.08, 8);  // propeller shaft from the differential to the gearbox
  p.bb(mats.iron, 0.34, 0.2, 0.34, 0.92, 0.36, 0.08, 0.01); p.b(mats.iron, 0.08, 0.06, 0.92, 0.92, 0.42, 0);  // gearbox on its cross member
  // wheels and mudguards
  for (const x of [1.45, -1.35]) for (const s of [-1, 1]) { wheel(p, x, 0.45, s * 0.78, s); mudguard(p, x, 0.45, s * 0.8, x > 0 ? 0.35 : 0.0, x > 0 ? 2.84 : 2.6); }
  for (const s of [-1, 1]) p.b(mats.iron, 0.04, 0.02, 0.3, 1.45, 0.925, s * 0.56);
  // running boards with brass edging, linoleum top, tool box; spare tyre on the off side
  for (const s of [-1, 1]) {
    p.bb(mats.woodDark, 1.95, 0.035, 0.26, 0.05, 0.56, s * 0.8, 0.006);
    p.b(mats.rubber, 1.9, 0.004, 0.22, 0.05, 0.596, s * 0.8);
    p.b(mats.brass, 1.95, 0.02, 0.012, 0.05, 0.56, s * 0.935);
    for (const x of [0.9, -0.8]) p.b(mats.iron, 0.04, 0.12, 0.3, x, 0.45, s * 0.66);
  }
  p.bb(mats.woodDark, 0.5, 0.25, 0.2, -0.45, 0.6, -0.8, 0.01);
  p.t(mats.rubber, 0.405, 0.06, 0.45, 1.04, 1.0, 'z', 28, 8); p.t(mats.iron, 0.34, 0.02, 0.45, 1.04, 1.0, 'z', 20, 3);
  p.b(mats.leather, 0.05, 0.04, 0.12, 0.45, 1.44, 1.0); p.b(mats.iron, 0.04, 0.55, 0.04, 0.45, 0.6, 0.92);
  // coal-scuttle bonnet sloping down to the front (extruded side profile), louvres, hinge, filler cap
  const bon = [[2.3, 0.55], [2.32, 0.7], [2.2, 0.82], [1.85, 0.96], [1.4, 1.06], [1.02, 1.12], [1.02, 0.55]];
  p.extZ(carPaint, bon, 0.84, 0, 0, 0, 0.01);
  for (const s of [-1, 1]) for (let k = 0; k < 7; k++) p.b(mats.iron, 0.04, 0.14, 0.012, 1.25 + k * 0.12, 0.7, s * 0.425).rotation.z = 0.1;
  p.cx(mats.brass, 0.012, 0.75, 1.625, 1.0, 0, 6).rotation.z = Math.PI / 2 - 0.24;   // bonnet hinge along the crown
  p.lathe(mats.brass, [[0, 0], [0.04, 0], [0.04, 0.03], [0, 0.04]], 2.05, 0.9, 0, 10).rotation.z = 0.3;
  // radiators behind the engine on either side of the dashboard (Renault's characteristic layout)
  for (const s of [-1, 1]) {
    p.bb(mats.brass, 0.32, 0.55, 0.04, 0.88, 0.58, s * 0.46, 0.006);
    for (let k = 0; k < 9; k++) p.b(mats.iron, 0.012, 0.47, 0.03, 0.75 + k * 0.032, 0.62, s * 0.475);
  }
  // dashboard (bulkhead) with coil box, oiler, side lamps; acetylene headlamps on forks ahead
  p.bb(mats.woodDark, 0.06, 0.62, 1.0, 0.72, 0.58, 0, 0.008);
  p.bb(mats.woodDark, 0.05, 0.12, 0.25, 0.68, 0.95, -0.2, 0.006); p.c(mats.brass, 0.05, 0.12, 0.66, 0.95, 0.2, 10);
  for (const s of [-1, 1]) {
    p.latheX(mats.brass, [[0, 0], [0.12, 0], [0.13, 0.04], [0.12, 0.2], [0.07, 0.24], [0, 0.25]], 2.02, 1.0, s * 0.42, 14);
    p.cx(mats.mirror, 0.11, 0.012, 2.27, 1.0, s * 0.42, 14); p.b(mats.brass, 0.04, 0.35, 0.03, 2.08, 0.66, s * 0.42);
    p.lathe(mats.brass, [[0, 0], [0.05, 0], [0.06, 0.12], [0.04, 0.2], [0.015, 0.24], [0, 0.25]], 0.74, 1.12, s * 0.55, 10);
    p.b(mats.lampGlow, 0.01, 0.06, 0.04, 0.8, 1.2, s * 0.55);
  }
  // open chauffeur's compartment: low sides, buttoned leather bench, raked steering column and wheel, levers, pedals, horn
  for (const s of [-1, 1]) p.bb(carPaint, 0.75, 0.38, 0.05, 0.35, 0.6, s * 0.7, 0.008);
  p.b(mats.woodDark, 0.8, 0.03, 1.4, 0.35, 0.6, 0);
  p.pil(mats.leather, 0.48, 0.16, 1.3, 0.22, 0.72, 0, 0.35, 0.2, 4, 14, 0.01);
  p.pil(mats.leather, 0.12, 0.42, 1.34, -0.03, 0.82, 0, 0.4, 0.2, 4, 12, 0.01);
  for (let i = 0; i < 4; i++) p.s(mats.leather, 0.012, 0.03, 1.0 + (i % 2) * 0.12, -0.45 + i * 0.3, 1, 1, 1);
  const col = p.c(mats.iron, 0.022, 0.52, 0.665, 0.98 - 0.26, -0.32, 6); col.rotation.z = 0.6;
  p.t(mats.woodDark, 0.19, 0.018, 0.52, 1.2, -0.32, 'y', 20, 5).rotation.set(Math.PI / 2, 0, 0.6, 'ZYX');
  for (let k = 0; k < 3; k++) { const m = p.b(mats.iron, 0.36, 0.012, 0.016, 0.52, 1.2 - 0.006, -0.32); m.position.y = 1.2; m.rotation.set(0, (k * Math.PI) / 3, 0.6, 'ZYX'); }
  for (const [x, a] of [[0.62, -0.25], [0.5, -0.1]]) { const m = p.c(mats.brass, 0.012, 0.55, x, 0.58, 0.74, 6); m.rotation.x = a; }
  p.b(mats.brass, 0.25, 0.12, 0.02, 0.55, 0.62, 0.75);
  for (const z of [-0.4, -0.25, 0.0]) p.b(mats.iron, 0.08, 0.02, 0.05, 0.62, 0.628, z).rotation.z = 0.35;
  p.cx(mats.brass, 0.03, 0.55, 1.05, 1.05, 0.62, 8); p.latheX(mats.brass, [[0.03, 0], [0.1, 0.15], [0.105, 0.17], [0, 0.17]], 1.32, 1.05, 0.62, 12);
  p.s(mats.rubber, 0.07, 0.75, 1.05, 0.62, 1.2, 1, 1, false); p.t(mats.brass, 0.034, 0.008, 0.9, 1.05, 0.62, 'x', 12, 3);
  // enclosed coupé body: tumblehome lower body with mouldings, door, glazed upper part with frames and curtains, roof
  const body = [[0.18, 0.56], [-1.95, 0.56], [-2.1, 0.7], [-2.1, 1.0], [-1.98, 1.15], [0.18, 1.15]];
  p.extZ(carPaint, body, 1.46, 0, 0, 0, 0.02);
  for (const s of [-1, 1]) {
    p.b(mats.gold, 2.1, 0.015, 0.008, -0.88, 1.05, s * 0.735); p.b(mats.gold, 2.1, 0.015, 0.008, -0.88, 0.7, s * 0.735);
    p.b(mats.iron, 0.005, 0.5, 0.005, -0.2, 0.62, s * 0.734); p.b(mats.iron, 0.005, 0.5, 0.005, -1.1, 0.62, s * 0.734);
    p.b(mats.brass, 0.1, 0.02, 0.025, -0.35, 0.98, s * 0.745); p.s(mats.brass, 0.018, -0.3, 0.98, s * 0.755);
  }
  p.b(mats.glass, 1.32, 0.52, 1.42, -0.62, 1.16, 0);
  for (const x of [0.13, -0.4, -1.28]) for (const s of [-1, 1]) p.b(carPaint, 0.08, 0.56, 0.04, x, 1.14, s * 0.72);
  for (const s of [-1, 1]) { p.b(carPaint, 1.48, 0.06, 0.04, -0.6, 1.14, s * 0.72); p.b(carPaint, 1.48, 0.06, 0.04, -0.6, 1.66, s * 0.72); }
  p.b(carPaint, 0.06, 0.56, 1.46, 0.16, 1.14, 0); p.b(mats.glass, 0.01, 0.4, 1.0, 0.19, 1.22, 0);
  p.b(carPaint, 0.62, 0.56, 1.46, -1.62, 1.14, 0); p.b(mats.glass, 0.01, 0.16, 0.35, -1.93, 1.42, 0);
  for (const s of [-1, 1]) { // curtains drawn half across the side windows, tassel ties
    p.b(mats.fabricRed, 0.32, 0.46, 0.01, -1.12, 1.18, s * 0.7); p.b(mats.fabricRed, 0.18, 0.46, 0.01, -0.26, 1.18, s * 0.7);
    p.s(mats.gold, 0.02, -0.96, 1.36, s * 0.69);
  }
  p.pil(mats.fabricRed, 0.14, 0.42, 1.3, -1.85, 0.9, 0, 0.4, 0.2, 4, 12, 0.01);
  p.bb(mats.leather, 2.32, 0.08, 1.58, -0.83, 1.7, 0, 0.03);
  p.bb(mats.leather, 2.26, 0.05, 1.5, -0.83, 1.78, 0, 0.02);
  for (const s of [-1, 1]) p.b(mats.brass, 1.9, 0.02, 0.02, -0.9, 1.86, s * 0.68);
  for (let k = 0; k < 4; k++) p.b(mats.brass, 0.02, 0.06, 1.38, -1.7 + k * 0.55, 1.8, 0);
  for (const s of [-1, 1]) { // coach lamps beside the division
    p.lathe(mats.brass, [[0, 0], [0.04, 0], [0.06, 0.05], [0.06, 0.18], [0.04, 0.22], [0.02, 0.27], [0, 0.28]], 0.2, 1.15, s * 0.77, 10);
    p.b(mats.lampGlow, 0.02, 0.1, 0.05, 0.26, 1.22, s * 0.77);
  }
  // rear: luggage grid, red tail lamp, number plate
  p.b(mats.iron, 0.3, 0.02, 1.0, -2.25, 0.62, 0); for (const z of [-0.45, 0.45]) p.b(mats.iron, 0.3, 0.2, 0.02, -2.25, 0.62, z);
  p.lathe(mats.brass, [[0, 0], [0.04, 0], [0.045, 0.1], [0, 0.12]], -2.135, 0.82, 0.55, 8); p.b(mats.navRed, 0.01, 0.04, 0.04, -2.185, 0.86, 0.55);
  p.b(kitMats.slate, 0.01, 0.12, 0.42, -2.12, 0.62, 0);
  if (TIER.fine >= 1) {
    // carbide (acetylene) generator for the headlamps on the near-side running board, rubber hose to the lamps
    p.lathe(mats.brass, [[0, 0], [0.07, 0], [0.075, 0.02], [0.07, 0.3], [0.05, 0.34], [0.02, 0.36], [0, 0.37]], 0.75, 0.596, -0.8, 10);
    for (const y of [0.66, 0.84]) p.t(mats.iron, 0.074, 0.006, 0.75, y, -0.8, 'y', 12, 3);
    p.tube(mats.rubber, [[0.75, 0.94, -0.8], [1.4, 0.88, -0.62], [2.0, 0.97, -0.42]], 0.008, 8, 3);
    // mudguard stays from the frame rails, door hinges, step plates on the running boards
    for (const x of [1.45, -1.35]) for (const s of [-1, 1]) p.tube(mats.iron, [[x + 0.22, 0.45, s * 0.46], [x + 0.28, 0.7, s * 0.68], [x + 0.31, 0.84, s * 0.8]], 0.01, 6, 3);
    for (const s of [-1, 1]) for (const y of [0.68, 1.0]) p.b(mats.brass, 0.04, 0.06, 0.012, -0.22, y, s * 0.742);
    if (TIER.fine >= 2) for (const s of [-1, 1]) for (const x of [-0.55, 0.55]) p.b(mats.brass, 0.3, 0.004, 0.2, x, 0.6, s * 0.8);
  }
});

/** the opened shipping crate (front +x = open end): sides of planed boards with stencils, battens, lid off,
 *  straw spilling out; the front panel lies on the floor */
export const carCrate = def('ghCarCrate', [2.4, 5.0, 2.3], (p) => {
  const r = rng(5);
  p.b(mats.pine, 4.9, 0.12, 2.1, 0, 0, 0); for (const z of [-0.85, 0, 0.85]) p.b(mats.oak, 4.9, 0.1, 0.14, 0, 0.0, z);
  for (const s of [-1, 1]) {
    for (let k = 0; k < 7; k++) p.b(k === 3 ? kitMats.stencil : mats.pine, 4.9, 0.28, 0.025, 0, 0.12 + k * 0.29, s * 1.04);
    for (const x of [-2.4, -1.2, 0, 1.2, 2.4]) p.b(mats.oak, 0.1, 2.05, 0.04, x, 0.12, s * 1.075);
    p.b(mats.oak, 4.9, 0.08, 0.04, 0, 2.15, s * 1.075);
  }
  for (let k = 0; k < 7; k++) p.b(mats.pine, 0.025, 2.05, 0.28, -2.44, 0.12, -0.86 + k * 0.29);
  for (const z of [-0.8, 0.8]) p.b(mats.oak, 0.04, 2.05, 0.1, -2.47, 0.12, z);
  // front panel lying on the floor in front of the crate
  for (let k = 0; k < 7; k++) p.b(mats.pine, 0.28, 0.025, 2.05, 2.62 + k * 0.29, 0, 0);
  for (const z of [-0.8, 0.8]) p.b(mats.oak, 2.0, 0.035, 0.1, 3.49, 0.025, z);
  // straw: a matted bed on the crate floor, tufts and loose stalks on the floor in front
  for (let i = 0; i < 26; i++) { const g = new THREE.SphereGeometry(0.2 + r() * 0.15, 6, 4); g.scale(1.6, 0.35, 1.2); p.ag(STRAW, g, -2.1 + r() * 4.4, 0.13, -0.85 + r() * 1.7); }
  for (let i = 0; i < 70; i++) { const m = p.ab(STRAW, 0.25 + r() * 0.2, 0.006, 0.01, 2.5 + r() * 1.2, 0.026, -1.0 + r() * 2.0); m.rotation.y = r() * 3; }
  p.b(mats.paper, 0.01, 0.35, 0.6, -2.46, 1.3, 0.3);
  if (TIER.fine >= 1) {
    // hoop-iron corner straps and the lifting eyes of the crate
    for (const s of [-1, 1]) {
      for (const x of [-2.42, 2.42]) p.b(mats.iron, 0.07, 2.05, 0.006, x, 0.12, s * 1.1);
      for (const y of [0.3, 1.9]) p.b(mats.iron, 4.86, 0.05, 0.006, 0, y, s * 1.1);
      p.t(mats.iron, 0.05, 0.012, -1.8, 2.25, s * 1.1, 'z', 10, 3); p.t(mats.iron, 0.05, 0.012, 1.8, 2.25, s * 1.1, 'z', 10, 3);
    }
  }
});
/** canvas-wrapped bale tied with rope bands */
const bale = def('ghBale', [1.0, 0.7, 0.7], (p, o) => {
  const f = TIER.fine;
  if (f >= 1) {
    // pressed bale: bulging canvas wrap, the bands cut into it, sewn seam along the top, shipping mark on the front
    p.pil(mats.canvas, 0.7, 0.62, 1.0, 0, 0, 0, 0.18, 0.12, 3, 12, -0.015);
    for (const z of [-0.3, 0, 0.3]) { p.b(mats.rope, 0.66, 0.026, 0.03, 0, 0.6, z); for (const sg of [-1, 1]) p.b(mats.rope, 0.026, 0.58, 0.03, sg * 0.338, 0.02, z); }
    if (f >= 2) for (let k = 0; k < 9; k++) p.b(mats.rope, 0.012, 0.006, 0.03, -0.05 + (k % 2) * 0.1, 0.618, -0.4 + k * 0.1);
    p.b(kitMats.stencil, 0.005, 0.28, 0.42, 0.342, 0.17, 0.0);
  } else {
    p.bb(mats.canvas, 0.7, 0.62, 1.0, 0, 0, 0, 0.08);
    for (const z of [-0.3, 0, 0.3]) { p.b(mats.rope, 0.72, 0.03, 0.03, 0, 0.6, z); for (const s of [-1, 1]) p.b(mats.rope, 0.03, 0.62, 0.03, s * 0.355, 0, z); }
    p.b(kitMats.stencil, 0.005, 0.3, 0.45, 0.352, 0.15, 0.0);
  }
});
/** stack of dunnage (loose planks for stowing cargo), crossed in layers – low clutter, no collider */
const dunnage = def('ghDunnage', [0.9, 1.5, 0.22], (p, o) => {
  const r = rng(o.v ?? 1), n = 3 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const across = i % 2 === 1, y = i * 0.045;
    for (let k = 0; k < (across ? 3 : 4); k++) {
      const m = across ? p.b(mats.pine, 0.85, 0.04, 0.14, (r() - 0.5) * 0.04, y, -0.5 + k * 0.5) : p.b(mats.pine, 0.15, 0.04, 1.45 - r() * 0.2, -0.33 + k * 0.22, y, (r() - 0.5) * 0.05);
      m.rotation.y = (r() - 0.5) * 0.06;
    }
  }
});
/** coiled mooring / lashing rope lying on the floor */
const ropeCoil = def('ghRopeCoil', [0.62, 0.62, 0.16], (p) => {
  for (let k = 0; k < 3; k++) p.t(mats.rope, 0.24 - k * 0.025, 0.026, 0.0, 0.026 + k * 0.05, 0, 'y', 16, 4);
  p.t(mats.rope, 0.17, 0.024, 0.02, 0.03, 0.02, 'y', 14, 4);
  p.tube(mats.rope, [[0.24, 0.13, 0], [0.3, 0.06, 0.05], [0.26, 0.026, 0.22]], 0.024, 6, 4);
});
/** pile of sacks and small crates under a rope cargo net, ring bolts */
const nettedPile = def('ghNetted', [1.6, 1.3, 1.1], (p, o) => {
  const r = rng(o.v ?? 3);
  for (const [x, z, k] of [[-0.3, -0.35, 0], [-0.3, 0.35, 1], [0.32, 0, 0], [0, 0, 2]]) {
    if (k === 1) p.bb(kitMats.stencil, 0.6, 0.55, 0.6, x, 0, z, 0.01); else p.pil(mats.canvas, 0.55, 0.32, 0.8, x, k === 2 ? 0.32 : 0, z, 0.55, 0.45, 4, 10, 0.03).rotation.y = r() * 3;
  }
  // net: four sloping planes of open mesh to the floor, rope edge
  const H = 0.95, w = 0.8, d = 0.65;
  for (const s of [-1, 1]) {
    const g1 = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-d - 0.1, 0, s * (w + 0.1)), new THREE.Vector3(d + 0.1, 0, s * (w + 0.1)), new THREE.Vector3(0.2, H, s * 0.1), new THREE.Vector3(-0.2, H, s * 0.1)]);
    g1.setIndex(s > 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]); g1.computeVertexNormals(); g1.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1.6, 0, 1.0, 1.2, 0.6, 1.2], 2));
    p.add(g1, gratingMat);
  }
  for (const s of [-1, 1]) p.b(mats.rope, 1.5, 0.03, 0.03, 0, 0.0, s * 0.9);
  for (const s of [-1, 1]) p.t(mats.iron, 0.04, 0.01, s * 0.8, 0.02, 0, 'y', 8, 3);
});

/** cargo-hold preset that keeps the given walking lanes (world rectangles) free; adds bales and netted piles */
export function cargoHold(lanes, extra) {
  return (ctx) => {
    const free0 = ctx.free.bind(ctx);
    ctx.free = (u, v, eu, ev) => free0(u, v, eu, ev) && !lanes.some((l) => overlap(l, ctx._rect(u, v, eu, ev), 0.01));
    if (extra) extra(ctx);
    let k = 0;
    ctx.grid(3.1, 2.7, (u, v, i, j) => { if ((i + j) % 2 === 0) ctx.put(k++ % 2 ? bale() : nettedPile({ v: i * 3 + j }), u, v, (i + j) % 4 ? 'in' : 'right'); }, 1.2);
    PRESETS.hold(ctx);
    // low clutter in what is left over (dunnage stacks, rope coils): no colliders, placed after all cargo
    const f = TIER.fine;
    if (f >= 1) {
      let n = 0;
      const cap = f >= 3 ? 8 : f >= 2 ? 5 : 3;
      ctx.grid(2.2, 1.9, (u, v, i, j) => { if (n < cap && (i * 7 + j * 3) % 4 === 1 && ctx.put((i + j) % 3 ? dunnage({ v: i * 5 + j }) : ropeCoil(), u, v, (i + j) % 2 ? 'in' : 'left', { collide: false })) n++; }, 0.5);
    }
  };
}

/** Renault hero placement inside hold No. 2 */
export function renaultHold(lanes) {
  return cargoHold(lanes, (ctx) => {
    const { plan, world } = ctx, Y = ctx.y, x = 88.6, z = 2.5;
    plan.prop(renault(), x, z, 0.08, { collide: true });
    ctx.occupied.push({ x0: x - 2.5, x1: x + 2.5, z0: z - 1.2, z1: z + 1.2 });
    plan.prop(carCrate(), 88.4, -3.3, 0, { collide: false });
    for (const [x0, z0, x1, z1] of [[85.95, -4.4, 90.85, -4.3], [85.95, -2.3, 90.85, -2.2], [85.95, -4.4, 86.05, -2.2]]) world.addCollider(x0, Y, z0, x1, Y + 2.25, z1);
    ctx.occupied.push({ x0: 85.9, x1: 92.3, z0: -4.45, z1: -2.15 });
    // wheel chocks, lashing ropes to ring bolts, a petrol can, the lid of the crate leaning against the hull
    const b = plan.batch;
    for (const dx of [1.45, -1.35]) for (const dz of [-0.78, 0.78]) for (const e of [-0.42, 0.42]) {
      const ca = Math.cos(0.08), sa = Math.sin(0.08), cx = x + (dx + e) * ca + dz * sa, cz = z - (dx + e) * sa + dz * ca;
      b.poly(mats.oak, [[cx - 0.12, Y, cz - 0.08], [cx + 0.12, Y, cz - 0.08], [cx + 0.12, Y, cz + 0.08], [cx - 0.12, Y, cz + 0.08]], [0, 1, 0]);
      b.box(mats.oak, cx - 0.1, Y, cz - 0.08, cx + 0.1, Y + 0.1, cz + 0.08);
    }
    for (const dx of [1.9, -1.9]) for (const s of [-1, 1]) {
      const ca = Math.cos(0.08), sa = Math.sin(0.08), R = (lx, lz) => [x + lx * ca + lz * sa, z - lx * sa + lz * ca]; // car is turned by 0.08 rad
      const [ax, az] = R(dx, s * 0.43), [bx, bz] = R(dx * 1.25, s * 1.35), p0 = [ax, Y + 0.48, az], p1 = [bx, Y + 0.02, bz];
      b.prism(mats.rope, p0, p1, 0.012, 4);
      b.box(mats.iron, p1[0] - 0.05, Y, p1[2] - 0.05, p1[0] + 0.05, Y + 0.03, p1[2] + 0.05);
    }
    plan.prop(crate({ s: 0.6 }), 91.8, 3.9, 0.3, { collide: false });
    b.box(kitMats.fireRed, 91.3, Y, 0.9, 91.55, Y + 0.32, 1.08); b.box(mats.brass, 91.4, Y + 0.32, 0.96, 91.45, Y + 0.36, 1.0);
    const hw = Math.min(14, plan.halfWidth(93) - 0.05);
    for (let k = 0; k < 8; k++) b.box(mats.pine, 92.2 + k * 0.3, Y + 0.05, hw - 0.35, 92.47 + k * 0.3, Y + 2.0, hw - 0.32 + 0.025);
    world.addLamp({ x, y: Y + 2.1, z, color: 0xffe2b0, intensity: 1.2 });
  });
}

/** registered-mail hold: stacks of mail bags, a sorting table, the safe for registered letters */
export function mailHold(ctx) {
  ctx.fit(shelves({ kind: 'empty', w: 1.5, mat: 'oak' }), ['far:lo', 'far:hi']);
  ctx.fit(safe(), ['near:hi', 'left:hi']);
  if (ctx.put(tableRect({ w: 1.6, d: 0.8, mat: 'oak', items: true }), 1.4, Math.min(2.0, ctx.D / 2), 'in')) ctx.put(stool({ mat: 'oak', seat: 'oak' }), 1.4, Math.min(2.0, ctx.D / 2) - 0.65, 'in', { collide: false });
  ctx.grid(1.6, 1.25, (u, v, i, j) => { if (!((i === 0 && j < 2))) ctx.put((i + j) % 3 ? bagPile({ v: i * 5 + j }) : sackPile(), u, v, (i + j) % 2 ? 'in' : 'right'); }, 0.7);
  ctx.fit(trunk({ big: true }), ['right:lo', 'left:lo']);
}
/**
 * Spar ceiling in the cargo holds: horizontal wooden battens on the hull frames (they keep the cargo off the cold,
 * sweating shell plating). holds = [{ x0, x1, sides: [-1|1, ...] }]. Level 0: three rows, from level 1 six.
 */
export async function holdBattens(world, holds) {
  const deck = 'orlop', Y = DECK_Y.orlop, f = TIER.fine, b = new Batch(world, deck);
  const rows = f === 0 ? [0.5, 1.15, 1.8] : [0.35, 0.68, 1.01, 1.34, 1.67, 2.0], hgt = 0.14, step = f === 0 ? 2.0 : 1.0;
  const w = (x, y) => hullHalfWidth(x, y) - LINING_INSET - 0.075;     // inner edge of the kit's hull frames
  for (const h of holds) {
    await world.tick();
    const n = Math.max(1, Math.round((h.x1 - h.x0 - 0.2) / step));
    for (const s of h.sides) for (const dy of rows) {
      const y0 = Y + dy, y1 = y0 + hgt;
      for (let i = 0; i < n; i++) {
        const xa = h.x0 + 0.1 + ((h.x1 - h.x0 - 0.2) * i) / n, xb = h.x0 + 0.1 + ((h.x1 - h.x0 - 0.2) * (i + 1)) / n;
        const fa0 = s * (w(xa, y0) - 0.03), fb0 = s * (w(xb, y0) - 0.03), fa1 = s * (w(xa, y1) - 0.03), fb1 = s * (w(xb, y1) - 0.03);
        b.poly(mats.pine, [[xa, y0, fa0], [xb, y0, fb0], [xb, y1, fb1], [xa, y1, fa1]], [0, 0, -s]);
        b.poly(mats.pine, [[xa, y1, fa1], [xb, y1, fb1], [xb, y1, s * w(xb, y1)], [xa, y1, s * w(xa, y1)]], [0, 1, 0]);
        if (dy > 1.5) b.poly(mats.pine, [[xa, y0, fa0], [xb, y0, fb0], [xb, y0, s * w(xb, y0)], [xa, y0, s * w(xa, y0)]], [0, -1, 0]);
      }
    }
    // lashing ring bolts let into the deck along the sides (level 2+)
    if (f >= 2) for (const s of h.sides) for (let x = h.x0 + 1.0; x < h.x1 - 0.6; x += 2.0) {
      const z = s * (w(x, Y) - 0.35);
      b.disc(mats.iron, [x, Y + 0.004, z], [0, 1, 0], 0.05, 8);
      b.prism(mats.iron, [x - 0.045, Y + 0.012, z], [x + 0.045, Y + 0.012, z], 0.011, 4);
    }
  }
  await world.tick();
  b.flush();
}
export { gratingMat };
