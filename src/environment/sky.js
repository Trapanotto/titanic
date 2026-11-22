import * as THREE from 'three';

// Sky dome (analytic day atmosphere + sun + domain-warped clouds, deep night gradient + Milky Way) and the star field.
// SKY_GLSL is shared with the ocean shader so that reflections / the far sea match the dome exactly.

/** Pole of the galactic plane used for the Milky Way band (shader + star distribution). */
export const MILKY_POLE = new THREE.Vector3(0.35, 0.45, -0.82).normalize();

export const SKY_GLSL = /* glsl */ `
uniform vec3 uSunDir;
uniform float uNight;
uniform float uTime;

const vec3 SEA_DAY = vec3(0.0030, 0.0135, 0.0230);
const vec3 SEA_NIGHT = vec3(0.00025, 0.00045, 0.0009);
const vec3 SUN_TINT = vec3(1.0, 0.86, 0.66);

float tHash(vec2 p) {
  p = mod(p, 289.0);
  vec3 p3 = fract(vec3(p.x, p.y, p.x) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float tNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = tHash(i);
  float b = tHash(i + vec2(1.0, 0.0));
  float c = tHash(i + vec2(0.0, 1.0));
  float d = tHash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float tFbm(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    s += a * tNoise(p);
    p = mat2(1.6, 1.2, -1.2, 1.6) * p + vec2(17.1, 9.2);
    a *= 0.5;
  }
  return s;
}
// Clear-sky colour for a unit direction with d.y >= 0 (no sun disc, no clouds, no stars).
vec3 skyBase(vec3 d) {
  float h = clamp(d.y, 0.0, 1.0);
  float mu = max(dot(d, uSunDir), 0.0);
  float g = pow(1.0 - h, 3.0);
  // day: deep zenith blue -> pale, slightly milky horizon (Rayleigh + haze), Mie glow around the sun
  vec3 day = mix(vec3(0.060, 0.170, 0.470), vec3(0.540, 0.660, 0.800), g);
  day = mix(day, vec3(0.700, 0.750, 0.800), pow(1.0 - h, 16.0) * 0.65);
  float sunH = clamp(uSunDir.y, 0.0, 1.0);
  day += SUN_TINT * (0.10 * pow(mu, 4.0) * (0.3 + 0.7 * g) + 0.30 * pow(mu, 24.0) + 0.85 * pow(mu, 260.0));
  day *= 1.0 - 0.10 * max(-dot(d, uSunDir), 0.0) * (1.0 - g);
  // night: moonless, extremely clear North Atlantic sky
  vec3 night = mix(vec3(0.00055, 0.00095, 0.0026), vec3(0.0042, 0.0062, 0.0115), pow(1.0 - h, 6.0));
  night += vec3(0.0016, 0.0024, 0.0016) * pow(1.0 - h, 14.0);
  return mix(day, night, uNight);
}
// Cloud layer: rgb = lit cloud colour, a = coverage. lite = fewer octaves (reflections).
vec4 skyClouds(vec3 d, float lite) {
  if (d.y <= 0.0 || uNight > 0.995) return vec4(0.0);
  vec2 uv = d.xz / (d.y + 0.07) * 0.85 + vec2(uTime * 0.0035, uTime * 0.0012);
  vec2 q = vec2(tNoise(uv * 0.7), tNoise(uv * 0.7 + vec2(5.2, 1.3)));
  float base = tFbm(uv * 0.9 + q * 1.3);
  float det = lite > 0.5 ? 0.5 : tFbm(uv * 3.3 + q * 2.0 + vec2(11.0, 3.0));
  float dens = base * 0.8 + det * 0.32 - 0.56;
  float a = smoothstep(0.0, 0.22, dens) * smoothstep(0.015, 0.2, d.y);
  // cirrus streaks high up
  float ci = tNoise(vec2(uv.x * 0.35 + uv.y * 0.15, uv.y * 2.6 - uv.x * 0.4) * 0.8 + vec2(3.0, uTime * 0.001));
  float ca = smoothstep(0.62, 0.85, ci) * 0.28 * smoothstep(0.05, 0.4, d.y);
  float lit = clamp(0.6 + (base - tNoise((uv + uSunDir.xz * 0.35) * 0.9 + q * 1.3)) * 2.6, 0.0, 1.0);
  float mu = max(dot(d, uSunDir), 0.0);
  vec3 cc = mix(vec3(0.46, 0.51, 0.60), vec3(1.0, 0.975, 0.94), lit);
  cc += SUN_TINT * pow(mu, 10.0) * (1.0 - a) * 0.9;           // silver lining
  cc = mix(cc, skyBase(d) * 1.05, pow(1.0 - d.y, 5.0) * 0.55); // aerial perspective
  vec3 ccir = vec3(1.0, 0.98, 0.95) + SUN_TINT * pow(mu, 6.0) * 0.4;
  float A = clamp(a + ca * (1.0 - a), 0.0, 1.0);
  vec3 col = (cc * a + ccir * ca * (1.0 - a)) / max(A, 1e-4);
  return vec4(col, A * (1.0 - uNight));
}
// Colour of the sea close to the horizon in the horizontal unit direction dh.
vec3 seaFar(vec3 dh) {
  vec3 deep = mix(SEA_DAY, SEA_NIGHT, uNight);
  vec3 c = mix(deep, skyBase(dh), 0.55);
  vec2 sh = normalize(uSunDir.xz);
  float az = max(dh.x * sh.x + dh.z * sh.y, 0.0);
  c += SUN_TINT * (0.35 * pow(az, 60.0) + 0.06 * pow(az, 6.0)) * (1.0 - uNight);
  return c;
}
`;

const DOME_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const DOME_FRAG = /* glsl */ `
${SKY_GLSL}
uniform float uEnv;
uniform vec3 uPole;
varying vec3 vDir;

float tHash3(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float tNoise3(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = tHash3(i);
  float n100 = tHash3(i + vec3(1.0, 0.0, 0.0));
  float n010 = tHash3(i + vec3(0.0, 1.0, 0.0));
  float n110 = tHash3(i + vec3(1.0, 1.0, 0.0));
  float n001 = tHash3(i + vec3(0.0, 0.0, 1.0));
  float n101 = tHash3(i + vec3(1.0, 0.0, 1.0));
  float n011 = tHash3(i + vec3(0.0, 1.0, 1.0));
  float n111 = tHash3(i + vec3(1.0, 1.0, 1.0));
  return mix(mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
             mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y), f.z);
}

void main() {
  vec3 d = normalize(vDir);
  vec3 dh = normalize(vec3(d.x, 0.0, d.z) + vec3(0.00001, 0.0, 0.0));
  vec3 du = normalize(vec3(d.x, max(d.y, 0.0), d.z) + vec3(0.00001, 0.0, 0.0));
  float day = 1.0 - uNight;
  float up = smoothstep(0.0, 0.14, d.y);
  vec3 col = skyBase(du);

  vec4 cl = vec4(0.0);
  if (d.y > 0.0 && day > 0.001) {
    cl = skyClouds(d, uEnv);
    col = mix(col, cl.rgb, cl.a);
  }

  // sun disc with limb darkening + corona
  float mu = max(dot(d, uSunDir), 0.0);
  float disc = smoothstep(0.99986, 0.99994, mu);
  float limb = 0.6 + 0.4 * smoothstep(0.99986, 1.0, mu);
  vec3 sunCol = vec3(1.0, 0.93, 0.80);
  col += sunCol * (disc * limb * 40.0 + pow(mu, 2200.0) * 3.0 + pow(mu, 600.0) * 0.6) * (1.0 - uEnv) * day * (1.0 - cl.a * 0.92);
  col += sunCol * pow(mu, 220.0) * 6.0 * uEnv * day;

  // Milky Way (night only): bright band with dust lanes and a brighter core region
  if (uNight > 0.001 && d.y > -0.02) {
    float b = dot(d, uPole);
    float band = exp(-b * b * 30.0);
    float n = tNoise3(d * 7.0) * 0.45 + tNoise3(d * 19.0) * 0.3 + tNoise3(d * 53.0) * 0.25;
    float dust = smoothstep(0.4, 0.75, tNoise3(d * 7.0 + vec3(3.7, 1.3, 7.1))) * exp(-b * b * 120.0);
    float core = pow(max(dot(d, normalize(vec3(-0.6, 0.25, -0.2))), 0.0), 6.0);
    vec3 mw = mix(vec3(0.50, 0.58, 0.85), vec3(0.85, 0.78, 0.65), core);
    col += mw * (0.016 * band * (0.15 + 1.8 * n * n * n) * (1.0 - 0.8 * dust) * (1.0 + 1.5 * core) * up * uNight);
  }

  // below the horizon: far sea (identical to the far end of the ocean mesh)
  if (d.y < 0.0) {
    col = mix(col, seaFar(dh), 1.0 - smoothstep(-0.008, 0.0, d.y));
  }

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const STAR_VERT = /* glsl */ `
attribute vec3 aColor;
attribute vec3 aParams; // size px, phase, twinkle speed
uniform float uTime;
uniform float uNight;
uniform float uPx;
varying vec3 vCol;
void main() {
  vec3 d = normalize(position);
  float ext = smoothstep(-0.01, 0.25, d.y);
  float tw = 0.5 + 0.5 * sin(uTime * aParams.z + aParams.y) * sin(uTime * aParams.z * 0.37 + aParams.y * 2.1);
  float amt = mix(0.75, 0.12, ext);
  vCol = aColor * (1.0 - amt * tw) * (0.12 + 0.88 * ext) * uNight;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aParams.x * uPx;
}
`;

const STAR_FRAG = /* glsl */ `
varying vec3 vCol;
void main() {
  vec2 c = gl_PointCoord - vec2(0.5);
  float r = length(c) * 2.0;
  float a = max(0.0, 1.0 - r);
  a = a * a * a + 0.15 * exp(-r * r * 20.0);
  gl_FragColor = vec4(vCol * a, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

const DOME_R = 4500;
const STAR_R = 4300;

/**
 * @param shared {uNight, uSunDir, uTime} shared uniform objects
 */
export function createSky(shared) {
  const uniforms = {
    uNight: shared.uNight, uSunDir: shared.uSunDir, uTime: shared.uTime,
    uEnv: { value: 0 }, uPole: { value: MILKY_POLE },
  };
  const material = new THREE.ShaderMaterial({
    name: 'skyDome', uniforms, vertexShader: DOME_VERT, fragmentShader: DOME_FRAG,
    side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(DOME_R, 64, 32), material);
  dome.name = 'skyDome';
  dome.frustumCulled = false;
  dome.renderOrder = -1000;
  dome.matrixAutoUpdate = true;
  dome.userData.noMerge = true;

  // ---- stars ----
  const COUNT = 16000;
  const pos = new Float32Array(COUNT * 3);
  const col = new Float32Array(COUNT * 3);
  const par = new Float32Array(COUNT * 3);
  const r = rng(1912);
  const gauss = () => (r() + r() + r() + r() - 2) * 0.87; // ~N(0, 0.5)
  const e1 = new THREE.Vector3(0, 1, 0).cross(MILKY_POLE).normalize();
  const e2 = new THREE.Vector3().crossVectors(MILKY_POLE, e1).normalize();
  const v = new THREE.Vector3();
  const palette = [[0.70, 0.80, 1.0], [0.85, 0.90, 1.0], [1.0, 1.0, 1.0], [1.0, 0.96, 0.84], [1.0, 0.86, 0.66], [1.0, 0.72, 0.52]];
  const weights = [0.16, 0.30, 0.26, 0.15, 0.09, 0.04];
  for (let i = 0; i < COUNT; i++) {
    let guard = 0;
    do {
      if (i < COUNT * 0.62) {
        const y = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - y * y);
        v.set(Math.cos(a) * s, y, Math.sin(a) * s);
      } else { // concentrated along the Milky Way
        const a = r() * Math.PI * 2, off = gauss() * 0.2;
        v.copy(e1).multiplyScalar(Math.cos(a)).addScaledVector(e2, Math.sin(a)).addScaledVector(MILKY_POLE, off).normalize();
      }
    } while (v.y < -0.015 && ++guard < 50);
    if (v.y < -0.015) v.y = -v.y;
    pos[i * 3] = v.x * STAR_R; pos[i * 3 + 1] = v.y * STAR_R; pos[i * 3 + 2] = v.z * STAR_R;
    const m = Math.pow(r(), 5.0); // few bright, many faint
    const bright = 0.15 + 3.2 * m + (r() < 0.003 ? 3.0 : 0);
    let k = 0, acc = weights[0]; const pick = r();
    while (pick > acc && k < palette.length - 1) acc += weights[++k];
    const c = palette[k];
    col[i * 3] = c[0] * bright; col[i * 3 + 1] = c[1] * bright; col[i * 3 + 2] = c[2] * bright;
    par[i * 3] = 1.3 + 2.6 * Math.pow(m, 0.5) + (bright > 3.0 ? 1.4 : 0);
    par[i * 3 + 1] = r() * Math.PI * 2;
    par[i * 3 + 2] = 1.2 + r() * 4.5;
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  sg.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  sg.setAttribute('aParams', new THREE.BufferAttribute(par, 3));
  sg.boundingSphere = new THREE.Sphere(new THREE.Vector3(), STAR_R);
  const starUniforms = { uNight: shared.uNight, uTime: shared.uTime, uPx: { value: 1 } };
  const starMat = new THREE.ShaderMaterial({
    name: 'stars', uniforms: starUniforms, vertexShader: STAR_VERT, fragmentShader: STAR_FRAG,
    blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, depthTest: true, fog: false,
  });
  const stars = new THREE.Points(sg, starMat);
  stars.name = 'stars';
  stars.frustumCulled = false;
  stars.renderOrder = -900;
  stars.visible = false;

  return {
    dome, stars, material, uniforms, starUniforms,
    follow(p) { dome.position.copy(p); stars.position.copy(p); },
  };
}

/** Warm "lamp-lit panelled room" environment used for PBR reflections / IBL while the player is inside. */
export function createInteriorEnvMaterial(kind = 0) {
  return new THREE.ShaderMaterial({
    name: 'interiorEnv', side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false, toneMapped: false,
    uniforms: { uKind: { value: kind } },
    vertexShader: DOME_VERT,
    fragmentShader: /* glsl */ `
      uniform float uKind;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y * 0.5 + 0.5;
        // floor (dark carpet / wood), walls (panelling), ceiling (lit plaster)
        vec3 floorC = mix(vec3(0.045, 0.028, 0.018), vec3(0.03, 0.03, 0.032), uKind);
        vec3 wallC = mix(vec3(0.16, 0.10, 0.06), vec3(0.06, 0.055, 0.05), uKind);
        vec3 ceilC = mix(vec3(0.42, 0.34, 0.24), vec3(0.12, 0.09, 0.07), uKind);
        vec3 c = mix(floorC, wallC, smoothstep(0.25, 0.48, h));
        c = mix(c, ceilC, smoothstep(0.6, 0.85, h));
        // a grid of lamps on the ceiling and a few bright sconces on the walls
        float l = pow(max(d.y, 0.0), 3.0) * pow(0.5 + 0.5 * cos(d.x * 11.0), 8.0) * pow(0.5 + 0.5 * cos(d.z * 11.0), 8.0);
        float a = atan(d.z, d.x);
        float sc = pow(0.5 + 0.5 * cos(a * 6.0), 30.0) * exp(-pow((d.y - 0.15) * 9.0, 2.0));
        vec3 lampC = mix(vec3(1.0, 0.78, 0.48), vec3(1.0, 0.55, 0.25), uKind);
        c += lampC * (l * 9.0 + sc * 4.0);
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
}
