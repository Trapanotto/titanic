import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mats } from '../core/materials.js';
import { box } from '../core/geo.js';
import { DECK_Y, SHIP, hullHalfWidth } from '../core/constants.js';
import { cyl, mk, gridGeo } from './fit-util.js';

// Underwater stern gear: three propellers, shaft bossings, stern frame and rudder.
//
// NOTE: the contract hull (hullHalfWidth) has no counter stern / propeller aperture – below the waterline it runs
// as a deep, narrow deadwood right to x = SHIP.sternX. The centre propeller and the rudder therefore sit in a
// stern frame directly abaft the hull end instead of at x ≈ -128..-124 (where they would be buried in the hull).
const WING = { x: -129.0, y: 3.9, R: 3.6, blades: 3 };
const CENTRE = { x: SHIP.sternX - 1.65, y: 3.1, R: 2.5, blades: 4 };
const RUDDER_POST_X = SHIP.sternX - 3.7;
const RUDDER_TOP = SHIP.waterline - 0.25; // kept just below the surface because there is no counter above it

/** One propeller (axis = x, fairwater cone pointing aft) as merged geometry. */
function propGeo(R, n, rh, hand) {
  const K = 16, J = 12, geos = [];
  const P = 2 * R * 1.05; // pitch
  // aerofoil-ish section: rounded leading edge, max thickness at ~30 % chord, thin trailing edge
  const thick = (x) => { const u = Math.max(0, Math.min(1, x)); return 2.4 * Math.sqrt(u) * (1 - u) * (1 - 0.35 * u); };
  for (const face of [1, -1]) {
    const g = gridGeo(K + 1, J + 1, (k, j) => {
      const f = k / K, rr = rh * 0.7 + (R - rh * 0.7) * f;
      const c = R * 0.62 * (Math.pow(f, 0.45) * Math.sqrt(Math.max(0, 1 - Math.pow(f, 2.4))) + 0.3 * (1 - f));
      const xc = j / J;                                   // 0 = leading edge, 1 = trailing edge
      const cj = 0.5 - xc;
      const beta = Math.atan(P / (2 * Math.PI * rr));
      const camber = R * 0.012 * (1 - f) * 4 * xc * (1 - xc);
      const th = (R * 0.05 * (1 - 0.82 * f) * thick(xc) * 0.5 * face) + camber;
      const skew = -0.14 * f * f * R; // skew-back of the blade tips
      const t = c * cj * Math.cos(beta) - th * Math.sin(beta) + skew * 0.3;
      const a = hand * (c * cj * Math.sin(beta) + th * Math.cos(beta)) - 0.06 * f * R; // slight rake aft
      const d = t / rr;
      return [a, rr * Math.cos(d), rr * Math.sin(d)];
    }, (face > 0) !== (hand > 0));
    geos.push(g);
  }
  const blade = mergeGeometries(geos);
  const all = [];
  for (let i = 0; i < n; i++) { const b = blade.clone(); b.rotateX((i / n) * Math.PI * 2); all.push(b); }
  // boss with fillets, fairwater cone and nut
  const hub = new THREE.LatheGeometry([[rh * 0.9, -rh * 1.1], [rh * 1.06, -rh * 0.9], [rh * 1.06, rh * 0.8], [rh * 0.98, rh * 1.0], [rh * 0.7, rh * 1.05]].map(([r, y]) => new THREE.Vector2(r, y)), 20); hub.rotateZ(Math.PI / 2); all.push(hub);
  const cone = new THREE.LatheGeometry([[rh * 1.02, 0], [rh * 0.98, rh * 0.5], [rh * 0.8, rh * 1.0], [rh * 0.5, rh * 1.4], [rh * 0.2, rh * 1.65], [0.001, rh * 1.72]].map(([r, y]) => new THREE.Vector2(r, y)), 20);
  cone.rotateZ(Math.PI / 2); cone.translate(-rh * 0.9, 0, 0); all.push(cone);
  return mergeGeometries(all.map((g) => { const q = g.index ? g.toNonIndexed() : g; if (q.attributes.uv) q.deleteAttribute('uv'); return q; }));
}

export function buildStern(world, parent) {
  const root = new THREE.Group(); root.name = 'sternGear';
  parent.add(root);
  world.markForBake(root);
  const props = [];
  const red = mats.hullRed;

  const addProp = (x, y, z, R, n, rh, hand, speed) => {
    const m = mk(propGeo(R, n, rh, hand), mats.brass, x, y, z);
    m.userData.noMerge = true; m.name = 'propeller';
    root.add(m);
    props.push({ m, speed: speed * hand });
  };

  // ---------- wing propellers + shaft bossings ----------
  // lateral position: as close to the hull as the blade tips allow
  let zh = 0;
  for (let i = 0; i <= 24; i++) {
    const ph = -Math.PI / 2 + (i / 24) * Math.PI;
    for (const dx of [-0.6, 0.9]) zh = Math.max(zh, hullHalfWidth(WING.x + dx, WING.y + WING.R * Math.sin(ph)) + WING.R * Math.cos(ph) + 0.3);
  }
  const xa = WING.x + 0.75, xf = -105.5, N = 26, M = 14;
  for (const s of [1, -1]) {
    addProp(WING.x, WING.y, s * zh, WING.R, WING.blades, 0.62, s, 0.9);
    const g = gridGeo(N + 1, M + 1, (i, j) => {
      const x = xa + ((xf - xa) * i) / N, t = i / N;
      const r = 0.64 + 0.45 * t;
      const blend = Math.min(1, (x - xa) / 4.5), sm = blend * blend * (3 - 2 * blend);
      const inner = (zh - r) + (hullHalfWidth(x, WING.y) - 0.6 - (zh - r)) * sm;
      const outer = zh + r * (1 - 0.3 * t);
      const zc = (inner + outer) / 2, az = Math.max(r, (outer - inner) / 2), ay = r * (1 + 0.9 * sm * (1 - 0.4 * t));
      const al = (j / M) * Math.PI * 2;
      return [x, WING.y + ay * Math.sin(al) - 0.25 * sm * (az - r) * 0.2, s * (zc + az * Math.cos(al))];
    }, s < 0);
    root.add(mk(g, red));
    // stern tube end ring
    root.add(cyl(mats.iron, xa - 0.12, WING.y, s * zh, xa + 0.1, WING.y, s * zh, 0.68, 14));
  }

  // ---------- stern frame, centre propeller ----------
  const sx = SHIP.sternX, xr = RUDDER_POST_X;
  root.add(box(red, sx - xr + 1.6, 0.5, 0.55, (sx + xr) / 2 + 0.45, 0.27, 0));                       // sole piece (keel extension)
  root.add(box(red, sx - xr + 1.9, 0.7, 0.6, (sx + xr) / 2 + 0.7, RUDDER_TOP - 0.2, 0));             // arch piece
  root.add(box(red, 0.5, RUDDER_TOP - 0.1, 0.55, xr + 0.25, (RUDDER_TOP + 0.1) / 2, 0));             // rudder post
  root.add(cyl(red, sx + 2.2, CENTRE.y, 0, CENTRE.x + 0.55, CENTRE.y, 0, 1.0, 14, 0.58));            // boss on the propeller post
  root.add(box(red, 0.6, RUDDER_TOP, 0.5, sx + 0.1, RUDDER_TOP / 2, 0));                              // propeller post
  addProp(CENTRE.x, CENTRE.y, 0, CENTRE.R, CENTRE.blades, 0.52, 1, 1.5);

  // ---------- rudder ----------
  {
    const H = RUDDER_TOP - 0.15, c = 4.3;
    const sh = new THREE.Shape();
    sh.moveTo(0, 0.35);
    sh.lineTo(-c * 0.9, 0.3);
    sh.quadraticCurveTo(-c, 0.4, -c, H * 0.25);
    sh.lineTo(-c * 0.97, H * 0.62);
    sh.quadraticCurveTo(-c * 0.9, H * 0.86, -c * 0.5, H * 0.95);
    sh.lineTo(0, H);
    sh.closePath();
    const rg = new THREE.ExtrudeGeometry(sh, { depth: 0.34, bevelEnabled: true, bevelSize: 0.1, bevelThickness: 0.1, bevelSegments: 1, curveSegments: 6 });
    rg.translate(0, 0, -0.17);
    root.add(mk(rg, red, xr - 0.12, 0, 0));
    // plating seams (butt straps) on both faces of the rudder
    for (let k = 1; k <= 3; k++) root.add(box(red, 0.08, H * (0.86 - 0.05 * k), 0.6, xr - 0.12 - c * k * 0.24, H * 0.5, 0));
    root.add(box(red, c * 0.9, 0.08, 0.6, xr - 0.12 - c * 0.45, H * 0.5, 0));
    // rudder stock head, arms and pintles / gudgeons
    for (let k = 0; k < 6; k++) {
      const y = 0.9 + (k * (H - 1.6)) / 5;
      root.add(box(mats.iron, 0.75, 0.24, 0.66, xr + 0.05, y, 0));
      root.add(cyl(mats.iron, xr - 0.06, y - 0.3, 0, xr - 0.06, y + 0.3, 0, 0.13, 8));
      root.add(box(red, c * (0.82 - 0.05 * k), 0.16, 0.6, xr - 0.15 - (c * (0.82 - 0.05 * k)) / 2, y, 0)); // horizontal arms
    }
  }

  world.addInfo({
    title: 'Propeller und Ruder',
    text: 'Tief unter dem Heck arbeiteten drei Bronzepropeller: zwei dreiflügelige Außenschrauben von 7,2 m Durchmesser, angetrieben von den beiden Kolbendampfmaschinen, und eine Mittelschraube von rund 5 m, die an der Niederdruckturbine hing. Zusammen brachten sie etwa 46 000 PS ins Wasser und das Schiff auf über 21 Knoten. Das Ruder war gut 24 m hoch und wog rund 100 Tonnen.',
    x: -130.5, y: DECK_Y.B + 1.2, z: 0, radius: 3,
  });

  return {
    update(dt) { for (const p of props) p.m.rotation.x += dt * p.speed; },
  };
}
