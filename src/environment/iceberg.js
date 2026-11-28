import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { SHIP } from '../core/constants.js';
import { TIER } from '../core/tier.js';

// The iceberg (night only), a few growlers and brash ice around it, merged into one flat-shaded mesh.
// Shape: a displaced icosphere – broad fractal mass, sharp ridged crests, horizontal strata that break the steep
// faces into ledges, a wave-cut notch at the waterline. Colour per face: snow on the flat tops, glacier blue on the
// steep faces (darker in the clefts, banded with the strata), a wet darker band just above the water.

const WL = SHIP.waterline;

function hash3(x, y, z) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 2147483647 - 1640531535);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function noise3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  let fx = x - xi, fy = y - yi, fz = z - zi;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
  const l = (a, b, t) => a + (b - a) * t;
  return l(
    l(l(hash3(xi, yi, zi), hash3(xi + 1, yi, zi), fx), l(hash3(xi, yi + 1, zi), hash3(xi + 1, yi + 1, zi), fx), fy),
    l(l(hash3(xi, yi, zi + 1), hash3(xi + 1, yi, zi + 1), fx), l(hash3(xi, yi + 1, zi + 1), hash3(xi + 1, yi + 1, zi + 1), fx), fy),
    fz);
}
/** fractal noise, -0.5..0.5 */
function fbm(x, y, z, oct) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += a * (noise3(x * f, y * f, z * f) - 0.5); n += a; a *= 0.5; f *= 2.03; }
  return s / n * 0.5 * 2;
}
/** ridged noise: sharp crests (0..1) */
function ridged(x, y, z, oct) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { const v = 1 - Math.abs(noise3(x * f, y * f, z * f) * 2 - 1); s += a * v * v; n += a; a *= 0.5; f *= 2.1; }
  return s / n;
}

/**
 * Displaced icosphere. len/wid = full extents (m), height above water (m), peaks = gaussian bumps of the top.
 * Vertices are displaced by functions of their position only, so the faces stay closed.
 */
function bergGeometry(detail, len, wid, height, seed, peaks, o = {}) {
  const g = new THREE.IcosahedronGeometry(1, detail); // non-indexed -> flat shading
  const p = g.attributes.position;
  const oct = o.oct ?? 5, strata = o.strata ?? height / 7;
  for (let i = 0; i < p.count; i++) {
    const ux = p.getX(i), uy = p.getY(i), uz = p.getZ(i);
    const n = fbm(ux * 1.9 + seed, uy * 1.9, uz * 1.9, oct);
    const r = ridged(ux * 3.1 + seed * 0.7, uy * 3.1 + 11, uz * 3.1, Math.max(2, oct - 1));
    const rad = (1 + 0.5 * n + 0.18 * (r - 0.5)) * (1 - 0.32 * Math.max(uy, 0) ** 2);
    let y;
    if (uy > 0) {
      let prof = 0.42;
      for (const k of peaks) prof += k.h * Math.exp(-(((ux - k.x) / k.sx) ** 2 + ((uz - k.z) / k.sz) ** 2));
      y = Math.pow(uy, 0.42) * height * prof * (0.85 + 0.55 * r + 0.3 * n); // (steep walls rising straight from the sea)
      // strata: the steep faces break into ledges (the snow lies on them)
      if (strata > 0.5) { const q = y / strata, f = q - Math.floor(q); y = (Math.floor(q) + Math.pow(f, 2.6)) * strata * 0.45 + y * 0.55; }
      // a notch cut by the swell just above the water
      if (y < 1.6) y *= 0.9;
    } else {
      y = uy * height * 0.42 * (1 + 0.3 * n);
    }
    const notch = uy > 0 && uy < 0.12 ? 0.9 : 1;
    p.setXYZ(i, ux * len * 0.5 * rad * notch, y, uz * wid * 0.5 * rad * notch);
  }
  g.deleteAttribute('uv');
  g.computeVertexNormals();
  colourise(g, seed, strata);
  return g;
}

const SNOW = new THREE.Color(1.0, 1.0, 1.0), ICE = new THREE.Color(0.46, 0.66, 0.84), DEEP = new THREE.Color(0.2, 0.4, 0.62);
const WET = new THREE.Color(0.32, 0.5, 0.6), UNDER = new THREE.Color(0.18, 0.48, 0.55), _c = new THREE.Color();
/** colour per face (flat): snow where it is flat, glacier blue on steep faces, darker in clefts and strata, wet at the water */
function colourise(g, seed, strata) {
  const p = g.attributes.position, n = g.attributes.normal, col = new Float32Array(p.count * 3);
  for (let f = 0; f < p.count; f += 3) {
    let cy = 0, ny = 0, cx = 0, cz = 0;
    for (let k = 0; k < 3; k++) { cy += p.getY(f + k); ny += n.getY(f + k); cx += p.getX(f + k); cz += p.getZ(f + k); }
    cy /= 3; ny /= 3; cx /= 3; cz /= 3;
    const v = noise3(cx * 0.21 + seed, cy * 0.35, cz * 0.21);           // patchiness
    const band = strata > 0.5 ? 0.5 + 0.5 * Math.sin((cy / strata) * Math.PI * 2 + v * 2.5) : 0.5;
    if (cy < -0.05) _c.copy(UNDER);
    else if (cy < 1.4) _c.copy(WET).lerp(ICE, cy / 1.4 * 0.4);
    else {
      const flat = THREE.MathUtils.smoothstep(ny, 0.6, 0.88);
      _c.copy(ICE).lerp(DEEP, Math.max(0, (0.5 - v) * 1.2) * (1 - flat) + 0.25 * band * (1 - flat));
      _c.lerp(SNOW, flat * (0.75 + 0.25 * v));
    }
    const k = 0.92 + 0.16 * hash3(Math.round(cx * 7), Math.round(cy * 7), Math.round(cz * 7)); // faceted sparkle
    for (let j = 0; j < 3; j++) { col[(f + j) * 3] = _c.r * k; col[(f + j) * 3 + 1] = _c.g * k; col[(f + j) * 3 + 2] = _c.b * k; }
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
}

/** small loose pieces: brash ice and bergy bits round the berg (more on its lee side) */
function brash(cx, cz, rot, count, rnd) {
  const parts = [];
  for (let i = 0; i < count; i++) {
    const a = rnd() * Math.PI * 2, d = 38 + Math.pow(rnd(), 0.7) * 95, lee = 1 + 0.8 * Math.max(0, Math.cos(a - rot - 2.4));
    const x = cx + Math.cos(a) * d * lee, z = cz + Math.sin(a) * d * lee * 0.8;
    const s = 0.35 + Math.pow(rnd(), 3) * 3.2;
    const gg = bergGeometry(s > 1.6 ? 2 : 1, s * 2.2, s * (1.2 + rnd()), s * (0.25 + rnd() * 0.5), i * 1.37, [{ x: 0, z: 0, sx: 0.7, sz: 0.7, h: 0.6 }], { oct: 2, strata: 0 });
    gg.rotateY(rnd() * 6.28);
    gg.translate(x, WL - 0.12 - s * 0.05, z);
    parts.push(gg);
  }
  return parts;
}

export function createIceberg() {
  const f = TIER.fine ?? 3, parts = [];
  const D = [12, 16, 22, 28][f] ?? 22;
  // the main berg: about 120 m long, 25 m high, with a sharp peak (survivors compared it to the Rock of Gibraltar)
  const main = bergGeometry(D, 120, 62, 25, 3.1, [
    { x: 0.32, z: 0.05, sx: 0.28, sz: 0.55, h: 0.78 },
    { x: 0.18, z: -0.1, sx: 0.1, sz: 0.16, h: 0.35 },
    { x: -0.5, z: 0.2, sx: 0.22, sz: 0.5, h: 0.42 },
    { x: -0.05, z: -0.4, sx: 0.25, sz: 0.3, h: 0.22 },
    { x: 0.6, z: 0.3, sx: 0.12, sz: 0.2, h: 0.25 },
  ], { oct: f >= 2 ? 6 : 4 });
  main.rotateY(0.45);
  main.translate(520, WL - 0.3, 140);
  parts.push(main);
  const growlers = [
    [432, 96, 9, 6, 2.4, 0.4], [468, 196, 6, 4, 1.5, 1.9], [588, 92, 12, 7, 3.0, 2.7],
    [392, 158, 5, 4, 1.2, 0.9], [610, 214, 8, 5, 2.0, 5.2], [455, 118, 4, 3, 0.9, 3.3], [560, 205, 7, 5, 1.6, 4.1],
  ];
  for (const [x, z, len, wid, h, rot] of growlers) {
    const gg = bergGeometry(f >= 2 ? 4 : 3, len, wid, h, x * 0.37, [{ x: 0.1, z: 0, sx: 0.6, sz: 0.6, h: 0.7 }], { oct: 3, strata: h > 2 ? 1 : 0 });
    gg.rotateY(rot);
    gg.translate(x, WL - 0.15, z);
    parts.push(gg);
  }
  let seed = 12345;
  const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  parts.push(...brash(520, 140, 0.45, [30, 50, 80, 110][f] ?? 80, rnd));
  const geometry = mergeGeometries(parts, false);
  for (const g of parts) g.dispose();
  const material = new THREE.MeshStandardMaterial({
    name: 'ice', color: 0xffffff, vertexColors: true, roughness: 0.42, metalness: 0, flatShading: true,
    emissive: 0x0b1420, emissiveIntensity: 1, transparent: true, opacity: 0,
  });
  // the faint glow of the ice in the starlight follows its colour: the snow stands out pale against the blue walls
  material.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance *= vColor.rgb * vColor.rgb * 1.8;');
  };
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'iceberg';
  mesh.visible = false;
  mesh.castShadow = false; mesh.receiveShadow = false;
  mesh.userData.noMerge = true;
  return {
    mesh,
    update(n) {
      mesh.visible = n > 0.01;
      material.opacity = n;
    },
  };
}
