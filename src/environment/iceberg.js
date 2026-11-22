import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { SHIP } from '../core/constants.js';

// The iceberg (night only) + a few growlers, merged into one flat-shaded mesh.

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

/** Displaced icosphere. len/wid = full extents (m), height above water (m). */
function bergGeometry(detail, len, wid, height, seed, peaks) {
  const g = new THREE.IcosahedronGeometry(1, detail); // non-indexed -> flat shading
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const ux = p.getX(i), uy = p.getY(i), uz = p.getZ(i);
    const n = noise3(ux * 2.1 + seed, uy * 2.1, uz * 2.1) - 0.5;
    const n2 = noise3(ux * 5.3 + seed, uy * 5.3 + 7, uz * 5.3) - 0.5;
    const rad = (1 + 0.42 * n + 0.2 * n2) * (1 - 0.3 * Math.max(uy, 0) ** 2);
    let y;
    if (uy > 0) {
      let prof = 0.3;
      for (const k of peaks) prof += k.h * Math.exp(-(((ux - k.x) / k.sx) ** 2 + ((uz - k.z) / k.sz) ** 2));
      y = Math.pow(uy, 0.75) * height * prof * (0.9 + 0.5 * n2 + 0.25 * n);
    } else {
      y = uy * height * 0.35;
    }
    p.setXYZ(i, ux * len * 0.5 * rad, y, uz * wid * 0.5 * rad);
  }
  g.deleteAttribute('uv');
  g.computeVertexNormals();
  return g;
}

export function createIceberg() {
  const parts = [];
  const main = bergGeometry(9, 120, 62, 25, 3.1, [
    { x: 0.32, z: 0.05, sx: 0.3, sz: 0.6, h: 0.72 },
    { x: -0.5, z: 0.2, sx: 0.22, sz: 0.5, h: 0.42 },
    { x: -0.05, z: -0.4, sx: 0.25, sz: 0.3, h: 0.2 },
  ]);
  main.rotateY(0.45);
  main.translate(520, SHIP.waterline - 0.3, 140);
  parts.push(main);
  const growlers = [
    [432, 96, 9, 6, 2.4, 0.4], [468, 196, 6, 4, 1.5, 1.9], [588, 92, 12, 7, 3.0, 2.7],
    [392, 158, 5, 4, 1.2, 0.9], [610, 214, 8, 5, 2.0, 5.2],
  ];
  for (const [x, z, len, wid, h, rot] of growlers) {
    const gg = bergGeometry(2, len, wid, h, x * 0.37, [{ x: 0.1, z: 0, sx: 0.6, sz: 0.6, h: 0.7 }]);
    gg.rotateY(rot);
    gg.translate(x, SHIP.waterline - 0.15, z);
    parts.push(gg);
  }
  const geometry = mergeGeometries(parts, false);
  for (const g of parts) g.dispose();
  const material = new THREE.MeshStandardMaterial({
    name: 'ice', color: 0xdcebf7, roughness: 0.55, metalness: 0, flatShading: true,
    emissive: 0x0b1420, emissiveIntensity: 1, transparent: true, opacity: 0,
  });
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
