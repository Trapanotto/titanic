// After the night (the film, app/sinking.js): 04:10, first light. The Cunard liner Carpathia, which had raced north
// through the ice since the CQD at 00:15, stops among the lifeboats; around her the field of ice and the bergs that
// had been invisible in the dark.
//
// The Carpathia (1903): 170 m, one tall funnel in Cunard red with a black top, four masts, a black hull with a white
// superstructure amidships. Built from a handful of extruded shapes – she is only ever seen at a few hundred metres.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { SHIP } from '../core/constants.js';
import { bergGeometry } from '../environment/iceberg.js';

const WL = SHIP.waterline;

/** a soft round puff for the smoke */
function softDot() {
  const n = 32, d = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const r = Math.hypot(x + 0.5 - n / 2, y + 0.5 - n / 2) / (n / 2), i = (y * n + x) * 4;
    d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = Math.round(Math.max(0, 1 - r) ** 2 * 255);
  }
  const t = new THREE.DataTexture(d, n, n, THREE.RGBAFormat);
  t.needsUpdate = true; t.magFilter = t.minFilter = THREE.LinearFilter;
  return t;
}

function lit(color, o = {}) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.05, ...o });
  return m;
}

/** plan of a hull (x along, z across), pointed bow, round stern; at deck height */
function hullShape(L, B) {
  const s = new THREE.Shape(), h = L / 2, b = B / 2;
  s.moveTo(h, 0);
  s.bezierCurveTo(h - 10, b * 0.9, h - 30, b, h - 45, b);
  s.lineTo(-h + 22, b);
  s.bezierCurveTo(-h + 6, b, -h, b * 0.55, -h, 0);
  s.bezierCurveTo(-h, -b * 0.55, -h + 6, -b, -h + 22, -b);
  s.lineTo(h - 45, -b);
  s.bezierCurveTo(h - 30, -b, h - 10, -b * 0.9, h, 0);
  return s;
}

export function createCarpathia() {
  const g = new THREE.Group();
  g.name = 'carpathia';
  const L = 170, B = 19.5;
  // hull: below the water red, the topsides black (extruded upward from the shape)
  const ext = (shape, h, y) => new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: 10 }).rotateX(-Math.PI / 2).translate(0, y, 0);
  const sh = hullShape(L, B);
  const red = new THREE.Mesh(ext(sh, 5, -5), lit(0x5a1e16, { roughness: 0.8 }));
  const black = new THREE.Mesh(ext(sh, 10.5, 0), lit(0x15161a, { roughness: 0.55 }));
  const white = new THREE.Mesh(ext(hullShape(L * 0.97, B * 0.97), 0.5, 10.5), lit(0xd7d2c4));
  g.add(red, black, white);
  // superstructure amidships and a bridge forward, deck houses aft
  const wm = lit(0xe2ddd0, { roughness: 0.6 });
  const box = (w, h, d, x, y, z, m = wm) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g.add(b); return b; };
  box(62, 3, 15, 4, 12.5, 0);
  box(48, 2.8, 12, 2, 15.4, 0);
  box(8, 3, 16, 30, 18.2, 0);                 // bridge
  box(12, 2.6, 10, -48, 12.3, 0);
  box(9, 2.6, 9, 60, 12.3, 0);
  // the funnel: Cunard red, black top, two thin black bands
  const fr = lit(0xb33a1c, { roughness: 0.55 }), fb = lit(0x111111);
  const fun = (y0, y1, m) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.5, y1 - y0, 24), m); c.scale.z = 0.78; c.position.set(-2, (y0 + y1) / 2, 0); c.rotation.z = 0.1; g.add(c); };
  fun(16.8, 30.5, fr); fun(30.5, 34.5, fb); fun(26.2, 26.8, fb); fun(27.6, 28.2, fb);
  // four masts with their yards
  const mm = lit(0x6b5a44);
  for (const [x, h] of [[66, 44], [42, 46], [-34, 44], [-58, 40]]) {
    const ms = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, h, 8), mm);
    ms.position.set(x, 10.5 + h / 2, 0); ms.rotation.z = 0.08; g.add(ms);
    const yd = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 12, 6), mm);
    yd.rotation.x = Math.PI / 2; yd.position.set(x - 1.2, 10.5 + h * 0.72, 0); g.add(yd);
  }
  // portholes and deck lights, still burning in the half light
  const pts = [];
  for (const side of [-1, 1]) for (let x = -L / 2 + 20; x < L / 2 - 25; x += 2.2) {
    for (const y of [4.2, 7.0]) if (Math.random() < 0.7) pts.push(x, y, side * (B / 2 + 0.05));
    if (Math.abs(x - 4) < 30 && Math.random() < 0.8) pts.push(x, 12.6, side * 7.55);
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const pm = new THREE.PointsMaterial({ color: 0xffd38a, size: 0.55, sizeAttenuation: true, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending });
  const lights = new THREE.Points(pg, pm);
  lights.frustumCulled = false;
  g.add(lights);
  // smoke from the funnel (she had stopped, but her boilers were still fired hard)
  const sp = [];
  for (let i = 0; i < 60; i++) { const k = i / 60; sp.push(-2 - k * 70 + Math.random() * 4, 36 + k * 22 + Math.random() * 3, (Math.random() - 0.5) * (3 + k * 18)); }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const smoke = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0x3a3632, size: 14, map: softDot(), sizeAttenuation: true, transparent: true, opacity: 0.32, depthWrite: false }));
  smoke.frustumCulled = false;
  g.add(smoke);
  g.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; o.material.name ||= 'carpathia'; } });
  g.position.y = WL - 0.4;
  g.visible = false;
  return g;
}

/** the ice the night had hidden: bergs on the horizon and a scatter of floes (world coordinates) */
export function createIceField() {
  const parts = [];
  let sd = 2024;
  const rnd = () => ((sd = (Math.imul(sd, 1664525) + 1013904223) >>> 0) / 4294967296);
  const bergs = [[-900, -700, 70, 40, 22], [-300, -1100, 110, 60, 30], [500, -1300, 90, 50, 26], [1100, -500, 60, 40, 18], [-1400, 200, 80, 44, 24], [900, 900, 100, 60, 28]];
  for (const [x, z, l, w, h] of bergs) {
    const g = bergGeometry(4, l, w, h, x * 0.013, [{ x: 0.2, z: 0, sx: 0.35, sz: 0.5, h: 0.8 }, { x: -0.35, z: 0.1, sx: 0.25, sz: 0.4, h: 0.4 }], { oct: 4 });
    g.rotateY(rnd() * 6.28); g.translate(x, WL - 0.3, z); parts.push(g);
  }
  for (let i = 0; i < 70; i++) {
    const a = rnd() * 6.28, d = 120 + rnd() * 700, s = 0.6 + rnd() * rnd() * 5;
    const g = bergGeometry(1, s * 2.4, s * (1 + rnd()), s * 0.35, i * 1.7, [{ x: 0, z: 0, sx: 0.7, sz: 0.7, h: 0.6 }], { oct: 2, strata: 0 });
    g.rotateY(rnd() * 6.28); g.translate(Math.cos(a) * d, WL - 0.12, Math.sin(a) * d); parts.push(g);
  }
  const geo = mergeGeometries(parts, false);
  for (const g of parts) g.dispose();
  const m = new THREE.MeshStandardMaterial({ name: 'iceField', color: 0xffffff, vertexColors: true, roughness: 0.45, flatShading: true, emissive: 0x1a2430 });
  const mesh = new THREE.Mesh(geo, m);
  mesh.name = 'iceField';
  mesh.frustumCulled = false;
  mesh.visible = false;
  return mesh;
}
