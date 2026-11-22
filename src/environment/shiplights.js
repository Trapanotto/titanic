import * as THREE from 'three';
import { DECK_Y, MASTS, FUNNELS, A_HOUSE, BOAT_HOUSES, isInterior } from '../core/constants.js';
import { lightingUniforms } from '../core/materials.js';

// The ship's own exterior lighting at night, independent of the small pool of real point lights:
//  - an irradiance volume (0.5 m voxels, R8) baked from all exterior lamps -> pools of light on the planking and the
//    white superstructure from any distance (sampled by every shared lit material, see core/materials.js)
//  - glow sprites on every exterior lamp, the masthead light and the red / green side lights (bloom picks them up)

const VOX = 0.5;
const VOL = { x0: -140, x1: 140, y0: 18, y1: 48, z0: -16, z1: 16 };
const RADIUS = 8.5;
const EMAX = 3;

const FLOORS = Object.values(DECK_Y).sort((a, b) => a - b);
const floorBelow = (y) => { let f = FLOORS[0]; for (const v of FLOORS) if (v <= y - 0.3) f = v; return f; };

export function isExteriorLamp(L) { return !isInterior(L.x, L.y - 0.4, L.z) && L.y > DECK_Y.C; }

/** Bake the exterior lamp volume. Returns the number of lamps used. */
export function bakeLampVolume(lamps) {
  const nx = Math.round((VOL.x1 - VOL.x0) / VOX), ny = Math.round((VOL.y1 - VOL.y0) / VOX), nz = Math.round((VOL.z1 - VOL.z0) / VOX);
  const acc = new Float32Array(nx * ny * nz);
  const R = Math.ceil(RADIUS / VOX);
  let used = 0;
  // the lit windows of the deck houses spill light onto the promenades and the boat deck (virtual soft sources)
  const spill = [];
  for (const s of [1, -1]) {
    for (let x = A_HOUSE.x0 + 2; x < A_HOUSE.x1 - 1; x += 3.2) spill.push({ x, y: DECK_Y.A + 1.5, z: s * (A_HOUSE.hw + 0.35), intensity: 0.16 });
    for (const h of BOAT_HOUSES) for (let x = h.x0 + 1.5; x < h.x1 - 1; x += 3.0) spill.push({ x, y: DECK_Y.boat + 1.5, z: s * (h.hw + 0.35), intensity: 0.12 });
    // working lights on forecastle and poop (no registered fixtures there)
    spill.push({ x: 112, y: DECK_Y.B + 3.2, z: s * 3.5, intensity: 0.35 }, { x: -118, y: DECK_Y.B + 3.2, z: s * 4, intensity: 0.3 });
  }
  spill.push({ x: MASTS[0].x - 1.2, y: DECK_Y.B + 4.5, z: 0, intensity: 0.7 }, { x: MASTS[1].x + 1.2, y: DECK_Y.B + 4.5, z: 0, intensity: 0.6 });
  for (const L of [...lamps, ...spill]) {
    if (!isExteriorLamp(L)) continue;
    used++;
    const I = Number.isFinite(L.intensity) ? L.intensity : 1;
    const fy = floorBelow(L.y);
    const cx = Math.floor((L.x - VOL.x0) / VOX), cy = Math.floor((L.y - VOL.y0) / VOX), cz = Math.floor((L.z - VOL.z0) / VOX);
    for (let k = Math.max(0, cy - R); k <= Math.min(ny - 1, cy + 2); k++) {
      const vy = VOL.y0 + (k + 0.5) * VOX, dy = vy - L.y;
      if (dy > 0.35 || vy < fy - 0.25) continue;           // through the deck above / the floor below
      for (let j = Math.max(0, cz - R); j <= Math.min(nz - 1, cz + R); j++) {
        const dz = VOL.z0 + (j + 0.5) * VOX - L.z;
        for (let i = Math.max(0, cx - R); i <= Math.min(nx - 1, cx + R); i++) {
          const dx = VOL.x0 + (i + 0.5) * VOX - L.x;
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 > RADIUS * RADIUS) continue;
          const win = 1 - d2 / (RADIUS * RADIUS);
          acc[(k * nz + j) * nx + i] += I * win * win / (d2 + 0.6);
        }
      }
    }
  }
  const data = new Uint8Array(acc.length);
  for (let k = 0; k < ny; k++) {
    const vy = VOL.y0 + (k + 0.5) * VOX;
    for (let j = 0; j < nz; j++) {
      const vz = VOL.z0 + (j + 0.5) * VOX;
      for (let i = 0; i < nx; i++) {
        const o = (k * nz + j) * nx + i, e = acc[o];
        if (e < 1e-3) continue;
        if (isInterior(VOL.x0 + (i + 0.5) * VOX, vy, vz)) continue; // no light inside the deck houses
        data[o] = Math.round(Math.sqrt(Math.min(1, e / EMAX)) * 255);
      }
    }
  }
  const tex = new THREE.Data3DTexture(data, nx, ny, nz);
  tex.format = THREE.RedFormat;
  tex.type = THREE.UnsignedByteType;
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = tex.wrapR = THREE.ClampToEdgeWrapping;
  tex.unpackAlignment = 1;
  tex.needsUpdate = true;
  const U = lightingUniforms;
  U.uShipVol.value.dispose?.();
  U.uShipVol.value = tex;
  U.uShipVolMax.value = EMAX;
  U.uShipVolMin.value.set(VOL.x0, VOL.y0, VOL.z0);
  U.uShipVolInv.value.set(1 / (VOL.x1 - VOL.x0), 1 / (VOL.y1 - VOL.y0), 1 / (VOL.z1 - VOL.z0));
  return used;
}

// ---------------------------------------------------------------- glow sprites
const HALO_VERT = /* glsl */ `
attribute vec4 aCol;   // rgb, size (m)
uniform float uScale, uK;
varying vec3 vCol;
varying float vCore;
void main() {
  vec4 mv = viewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float d = max(-mv.z, 0.3);
  float px = aCol.w * uScale / d;
  // far away the sprite keeps a minimum size and gets dimmer instead (energy roughly preserved)
  float minPx = 3.2;
  float e = px < minPx ? (px / minPx) : 1.0;
  gl_PointSize = clamp(max(px, minPx), 1.0, 64.0);
  vCol = aCol.rgb * uK * mix(sqrt(e), 1.0, 0.35);
  vCore = clamp(px / 14.0, 0.0, 1.0);
}`;
const HALO_FRAG = /* glsl */ `
varying vec3 vCol;
varying float vCore;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r2 = dot(c, c) * 4.0;
  if (r2 > 1.0) discard;
  float a = exp(-r2 * 5.0) * 0.8 + exp(-r2 * 40.0) * mix(1.2, 3.0, vCore);
  gl_FragColor = vec4(vCol * a, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function createHalos() {
  const material = new THREE.ShaderMaterial({
    name: 'lampHalos', vertexShader: HALO_VERT, fragmentShader: HALO_FRAG,
    uniforms: { uScale: { value: 800 }, uK: { value: 0 } },
    transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending, fog: false,
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3));
  geo.setAttribute('aCol', new THREE.BufferAttribute(new Float32Array(4), 4));
  const points = new THREE.Points(geo, material);
  points.name = 'lampHalos';
  points.frustumCulled = false;
  points.renderOrder = 45;
  points.userData.noMerge = true;
  points.visible = false;

  function rebuild(world) {
    const P = [], C = [];
    const add = (x, y, z, r, g, b, s) => { P.push(x, y, z); C.push(r, g, b, s); };
    for (const L of world.lamps) {
      if (!isExteriorLamp(L)) continue;
      add(L.x, L.y - 0.05, L.z, 1.0, 0.72, 0.42, 0.55);
    }
    // masthead (steaming) light on the foremast, see exterior/fit-masts.js
    const FM = MASTS[0], tan = Math.tan(FUNNELS[0].rake), yL = FM.baseY + 22.5;
    add(FM.x - 22.5 * tan + 0.65, yL - 0.05, 0, 1.0, 0.93, 0.8, 1.4);
    // side lights: find the red / green lamp lenses of the bridge wing cabs
    const box = new THREE.Box3(), c = new THREE.Vector3();
    const found = { navRed: null, navGreen: null };
    world.scene.updateMatrixWorld(true);
    world.scene.traverse((o) => {
      if (!o.isMesh || o.isInstancedMesh || !(o.material?.name in found) || !o.geometry?.attributes?.position) return;
      box.setFromObject(o);
      box.getCenter(c);
      if (!Number.isFinite(c.y) || box.max.x - box.min.x > 4) return;
      if (c.y > DECK_Y.A) found[o.material.name] = c.clone();
    });
    if (found.navRed) add(found.navRed.x + 0.2, found.navRed.y, found.navRed.z, 1.0, 0.05, 0.03, 1.4);
    if (found.navGreen) add(found.navGreen.x + 0.2, found.navGreen.y, found.navGreen.z, 0.05, 1.0, 0.3, 1.4);
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(P), 3));
    geo.setAttribute('aCol', new THREE.BufferAttribute(new Float32Array(C), 4));
    geo.setDrawRange(0, P.length / 3);
  }
  return { points, material, rebuild };
}
