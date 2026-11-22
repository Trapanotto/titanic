import * as THREE from 'three';

// Dust motes floating in the lamp light inside the ship. Stateless GPU points that wrap around the camera;
// each mote is lit by the nearest pool lamps (uniform array), so they only show up in pools of light.

const COUNT = 1400;
const BOX = new THREE.Vector3(12, 5, 12);
export const DUST_LIGHTS = 6;

const VERT = /* glsl */ `
attribute vec4 aSeed;
uniform float uTime;
uniform vec3 uCam;
uniform vec3 uBox;
uniform vec4 uL[${DUST_LIGHTS}];
uniform vec3 uLC[${DUST_LIGHTS}];
uniform float uScale;
uniform float uAmount;
varying vec3 vCol;
void main() {
  vec3 drift = vec3(sin(uTime * 0.05 + aSeed.w * 6.28) * 0.6, -0.025 - 0.02 * aSeed.w, cos(uTime * 0.04 + aSeed.w * 4.0) * 0.6) * uTime * 0.1;
  vec3 wob = vec3(sin(uTime * 0.7 + aSeed.x * 40.0), sin(uTime * 0.5 + aSeed.y * 30.0), sin(uTime * 0.6 + aSeed.z * 50.0)) * 0.04;
  vec3 rel = fract((aSeed.xyz * uBox + drift - uCam) / uBox) - 0.5;
  vec3 p = uCam + rel * uBox + wob;
  vec3 light = vec3(0.0);
  for (int i = 0; i < ${DUST_LIGHTS}; i++) {
    vec3 d = uL[i].xyz - p;
    light += uLC[i] * (uL[i].w / (dot(d, d) + 0.6));
  }
  vec4 mv = viewMatrix * vec4(p, 1.0);
  float dist = -mv.z;
  float edge = 1.0 - smoothstep(0.32, 0.5, max(abs(rel.x), max(abs(rel.y), abs(rel.z))));
  vCol = light * edge * smoothstep(0.25, 0.8, dist) * uAmount * (0.4 + 0.6 * aSeed.w);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp((0.006 + 0.006 * aSeed.w) * uScale / max(dist, 0.2), 1.0, 6.0);
}
`;
const FRAG = /* glsl */ `
varying vec3 vCol;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float a = exp(-dot(c, c) * 14.0);
  gl_FragColor = vec4(vCol * a, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

export function createDust(shared) {
  const r = rng(321);
  const pos = new Float32Array(COUNT * 3), seed = new Float32Array(COUNT * 4);
  for (let i = 0; i < COUNT * 4; i++) seed[i] = r();
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
  const uniforms = {
    uTime: shared.uTime, uCam: { value: new THREE.Vector3() }, uBox: { value: BOX.clone() },
    uL: { value: Array.from({ length: DUST_LIGHTS }, () => new THREE.Vector4(0, -100, 0, 0)) },
    uLC: { value: Array.from({ length: DUST_LIGHTS }, () => new THREE.Color(1, 0.8, 0.6)) },
    uScale: { value: 800 }, uAmount: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({
    name: 'dustMotes', uniforms, vertexShader: VERT, fragmentShader: FRAG,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true, fog: false,
  });
  const points = new THREE.Points(g, material);
  points.name = 'dustMotes';
  points.frustumCulled = false;
  points.renderOrder = 60;
  points.userData.noMerge = true;
  points.visible = false;
  return { points, uniforms };
}
