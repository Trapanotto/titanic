import * as THREE from 'three';

// Geometry helpers with UVs measured in metres (shared textures tile per metre).

const boxCache = new Map();

/** BoxGeometry whose UVs are in metres. Cached by size (round to mm). */
export function tiledBoxGeometry(w, h, d) {
  const k = `${Math.round(w * 1000)}_${Math.round(h * 1000)}_${Math.round(d * 1000)}`;
  let g = boxCache.get(k);
  if (g) return g;
  g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const scale = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]]; // +x -x +y -y +z -z
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const j = f * 4 + i; uv.setXY(j, uv.getX(j) * scale[f][0], uv.getY(j) * scale[f][1]); }
  boxCache.set(k, g);
  return g;
}

/** Mesh: box of size w(x) h(y) d(z) centred at (x,y,z). */
export function box(material, w, h, d, x = 0, y = 0, z = 0, { cast = false, receive = true } = {}) {
  const m = new THREE.Mesh(tiledBoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = cast; m.receiveShadow = receive;
  return m;
}

/** Mesh: box given by min/max corners. */
export function boxBetween(material, x0, y0, z0, x1, y1, z1, opts) {
  return box(material, Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, opts);
}

/** Horizontal plane (facing up, or down if `down`) with metre UVs, spanning x0..x1, z0..z1 at height y. */
export function slab(material, x0, x1, z0, z1, y, down = false) {
  const w = Math.abs(x1 - x0), d = Math.abs(z1 - z0);
  const g = new THREE.PlaneGeometry(w, d);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w, uv.getY(i) * d);
  g.rotateX(down ? Math.PI / 2 : -Math.PI / 2);
  const m = new THREE.Mesh(g, material);
  m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
  m.receiveShadow = true;
  return m;
}

/** Vertical or arbitrary cylinder between two points. */
export function rod(material, ax, ay, az, bx, by, bz, radius = 0.02, segments = 6) {
  const a = new THREE.Vector3(ax, ay, az), b = new THREE.Vector3(bx, by, bz);
  const len = a.distanceTo(b);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, segments, 1, false), material);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
  return m;
}

/** Scale the UVs of any geometry (e.g. Extrude/Lathe) so that textures tile reasonably. */
export function scaleUV(geometry, su, sv = su) {
  const uv = geometry.attributes.uv;
  if (uv) for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  return geometry;
}
