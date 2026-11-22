import * as THREE from 'three';
import { FUNNELS, DECK_Y } from '../core/constants.js';
import { SHIP_SPEED } from './ocean.js';

// Funnel smoke: stateless GPU particles (one Points draw call). Every particle's position is a pure
// function of time, so there are no per-frame buffer uploads.

const COUNT = 420;

const VERT = /* glsl */ `
attribute vec2 aSeed;      // x = funnel index 0..2, y = random
uniform vec3 uTops[3];
uniform float uTime;
uniform float uScale;      // pixels per metre at 1 m distance
uniform float uOpacity;
varying float vAlpha;
varying float vAge;
void main() {
  float life = 11.0 + 5.0 * position.y;
  float age01 = fract(uTime / life + position.x);
  float age = age01 * life;
  vec3 top = aSeed.x < 0.5 ? uTops[0] : (aSeed.x < 1.5 ? uTops[1] : uTops[2]);
  float ang = position.z * 6.2831853;
  vec2 rd = vec2(cos(ang), sin(ang));
  float spread = (0.5 + 1.5 * sqrt(age)) * (0.4 + 0.6 * aSeed.y);
  vec3 p = top;
  p.x += rd.x * (0.9 * aSeed.y + spread * 0.5) - ${SHIP_SPEED.toFixed(1)} * (age - 1.6 * (1.0 - exp(-age / 1.6)));
  p.y += 11.0 * (1.0 - exp(-age / 2.5)) + 0.35 * age + sin(age * 0.7 + ang) * 0.08 * age;
  p.z += rd.y * (0.7 * aSeed.y + spread * 0.8) + sin(age * 0.5 + ang * 3.0) * 0.12 * age;
  vec4 mv = viewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float size = 3.4 + 1.5 * age * (0.6 + 0.4 * aSeed.y);
  gl_PointSize = min(size * uScale / max(-mv.z, 0.5), 600.0);
  vAlpha = smoothstep(0.0, 0.05, age01) * pow(1.0 - age01, 1.4) * uOpacity;
  vAge = age01;
}
`;

const FRAG = /* glsl */ `
uniform vec3 uColor;
varying float vAlpha;
varying float vAge;
void main() {
  vec2 c = gl_PointCoord - vec2(0.5);
  float a = exp(-dot(c, c) * 14.0) - 0.03;
  if (a <= 0.0) discard;
  vec3 col = uColor * (1.0 + 2.6 * vAge) * (0.75 + 0.6 * (0.5 - c.y));
  gl_FragColor = vec4(col, a * vAlpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

export function createSmoke(shared, world) {
  const r = rng(77);
  const pos = new Float32Array(COUNT * 3);
  const seed = new Float32Array(COUNT * 2);
  for (let i = 0; i < COUNT; i++) {
    pos[i * 3] = r(); pos[i * 3 + 1] = r(); pos[i * 3 + 2] = r();
    seed[i * 2] = i % 3; seed[i * 2 + 1] = r();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 2));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1000);

  // fallback until the fittings module publishes world.funnelTops
  const tops = [0, 1, 2].map((i) => {
    const f = FUNNELS[i];
    return new THREE.Vector3(f.x - f.rake * f.height, DECK_Y.boat + f.height, 0);
  });
  const uniforms = {
    uTops: { value: tops }, uTime: shared.uTime, uScale: { value: 800 },
    uOpacity: { value: 0.16 }, uColor: { value: new THREE.Color(0.05, 0.05, 0.055) },
  };
  const material = new THREE.ShaderMaterial({
    name: 'funnelSmoke', uniforms, vertexShader: VERT, fragmentShader: FRAG,
    transparent: true, depthWrite: false, depthTest: true, fog: false,
  });
  const points = new THREE.Points(g, material);
  points.name = 'funnelSmoke';
  points.frustumCulled = false;
  points.renderOrder = 50;
  points.userData.noMerge = true;

  let check = 0;
  const size = new THREE.Vector2();
  return {
    points,
    update(dt, n, camera) {
      check -= dt;
      if (check <= 0) {
        check = 1;
        const ft = world.funnelTops;
        if (Array.isArray(ft)) {
          for (let i = 0; i < 3 && i < ft.length; i++) {
            const f = ft[i];
            if (f && Number.isFinite(f.x) && Number.isFinite(f.y)) tops[i].set(f.x, f.y, f.z || 0);
          }
        }
      }
      let h = 900;
      if (world.renderer) h = world.renderer.getDrawingBufferSize(size).y;
      const fov = camera && camera.isPerspectiveCamera ? camera.fov : 70;
      uniforms.uScale.value = h / (2 * Math.tan((fov * Math.PI) / 360));
      uniforms.uOpacity.value = 0.13 - 0.1 * n;        // barely visible at night
      const c = 0.12 - 0.11 * n;                        // coal smoke: brown-grey, lit by the sun
      uniforms.uColor.value.setRGB(c * 1.05, c, c * 0.95);
    },
  };
}
