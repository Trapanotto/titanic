import * as THREE from 'three';
import { TIER } from '../core/tier.js';
import { SHIP, hullHalfWidth, DECK_Y } from '../core/constants.js';
import { worley, fbm, vnoise, rng, releaseTexData } from '../core/tex.js';
import { SKY_GLSL } from './sky.js';

// Ocean: camera-centred warped grid (dense uniform cells near the camera, geometric growth to the horizon),
// footprint-filtered Gerstner swell + wind sea, three scrolling detail slope maps, Kelvin bow-wave system,
// hull wash and a turbulent stern wake with lacy advected foam, whitecaps from the wave Jacobian,
// Schlick fresnel with the real sky / cloud colours, GGX sun glitter, sub-surface glow in the crests,
// analytic hull reflection (incl. the lit portholes at night) and the ship's shadow on the water.

// (weak tiers: fewer quads, same 120 m uniform core – see createOcean)
let N = 160;          // quads per half side  -> (2N)^2 * 2 = 204 800 triangles
let LIN = 96;         // uniform cells per half side
let CELL = 1.25;      // m, size of the uniform cells = snapping step
const HALF = 6000;    // m, half extent
export const SHIP_SPEED = 10.8; // m/s (21 kn) – the sea drifts aft (-x) with this speed

const HULL_X0 = -140, HULL_LEN = 280, HULL_N = 512;

// [dirX, dirZ, wavelength, amplitude, steepness]
const WAVES = [
  [-0.848, 0.530, 92.0, 0.30, 0.55],
  [-0.966, -0.259, 57.0, 0.20, 0.55],
  [-0.643, 0.766, 37.0, 0.13, 0.6],
  [-0.940, 0.342, 23.0, 0.085, 0.6],
  [-0.766, -0.643, 14.5, 0.055, 0.6],
  [-0.996, 0.087, 9.1, 0.034, 0.65],
  [-0.574, 0.819, 5.7, 0.021, 0.65],
  [-0.906, -0.423, 3.6, 0.013, 0.65],
  // cross sea from other directions: breaks up the parallel crest lines at middle distance
  [0.259, 0.966, 41.0, 0.06, 0.45],
  [-0.326, -0.946, 19.3, 0.035, 0.5],
  [0.616, -0.788, 11.7, 0.022, 0.5],
  [-0.423, 0.906, 7.3, 0.016, 0.55],
];

function glslWaves() {
  const lines = WAVES.map(([dx, dz, l, a, q], i) => {
    const n = Math.hypot(dx, dz);
    const k = (2 * Math.PI) / l, w = Math.sqrt(9.81 * k);
    // wave groups: the amplitude of every component swells and fades over a few hundred metres (alternating sign),
    // so the crest pattern never repeats regularly
    const m = `(1.0 + ${(i % 2 ? 0.55 : -0.55).toFixed(2)} * grp${i % 3})`;
    return `  gW(p, vec2(${(dx / n).toFixed(4)}, ${(dz / n).toFixed(4)}), ${k.toFixed(5)}, ${w.toFixed(5)}, ${a.toFixed(4)} * ${m}, ${(q / (k * a * WAVES.length)).toFixed(4)}, ${l.toFixed(2)}, fp, acc, nrm);`;
  });
  return `  float grp0 = textureLod(uFoamTex, p * 0.0021 + vec2(0.17, 0.41), 3.0).b * 2.0 - 1.0;
  float grp1 = textureLod(uFoamTex, p.yx * 0.0017 + vec2(0.63, 0.08), 3.0).b * 2.0 - 1.0;
  float grp2 = -0.7 * grp0;
` + lines.join('\n');
}

const COMMON_GLSL = /* glsl */ `
uniform sampler2D uFoamTex;
uniform float uDrift;
uniform float uAmp;
uniform sampler2D uHull;
const float BOW_X = ${SHIP.bowX.toFixed(2)};
const float HALF_BEAM = ${SHIP.halfBeam.toFixed(2)};
float hullHW(float x) { return texture2D(uHull, vec2((x - (${HULL_X0.toFixed(1)})) / ${HULL_LEN.toFixed(1)}, 0.5)).r * HALF_BEAM; }

// Gerstner wave. fp = metres per sample (filter footprint): waves shorter than ~4 samples fade out.
// acc: xyz displacement; nrm: x = sum(D.x*WA*C), y = sum(Q*WA*S), z = sum(D.y*WA*C)
void gW(vec2 p, vec2 D, float k, float w, float A, float Q, float L, float fp, inout vec3 acc, inout vec3 nrm) {
  float fade = smoothstep(2.5 * fp, 6.0 * fp, L) * uAmp;
  if (fade <= 0.0) return;
  float a = A * fade;
  float th = k * dot(D, p) - w * uTime;
  float S = sin(th), C = cos(th);
  acc.xz += Q * a * D * C;
  acc.y += a * S;
  float WA = k * a;
  nrm.x += D.x * WA * C;
  nrm.z += D.y * WA * C;
  nrm.y += Q * WA * S;
}
void waves(vec2 p, float fp, inout vec3 acc, inout vec3 nrm) {
${glslWaves()}
}

// Kelvin wave system of the ship (stationary in the ship frame). g = world xz. Returns height (m).
float kelvin(vec2 g, float hw) {
  float s = BOW_X - g.x;                    // metres aft of the stem
  if (s < -6.0) return 0.0;
  float az = abs(g.y);
  float off = max(az - hw, 0.0);
  float h = 0.0;
  // bow wave hump right at the stem and along the first part of the hull
  h += 0.75 * exp(-off * off / 5.0) * exp(-pow((s - 5.0) / 9.0, 2.0));
  // shoulder trough + stern wave
  h -= 0.35 * exp(-off * off / 12.0) * exp(-pow((s - 40.0) / 18.0, 2.0));
  h += 0.30 * exp(-off * off / 14.0) * exp(-pow((s - 255.0) / 16.0, 2.0));
  if (s > 0.0) {
    float cusp = 0.3536 * s + 1.5;
    float q = (az - cusp) / (3.0 + 0.07 * s);
    float env = exp(-q * q * 1.4) * exp(-s / 520.0) * smoothstep(0.0, 12.0, s);
    float inside = 1.0 - smoothstep(cusp * 0.55, cusp, az);
    // divergent waves (beta 60 / 70 deg -> lambda = 2 pi U^2 cos^2 b / g)
    float k1 = 6.2831853 / 18.7, k2 = 6.2831853 / 8.7;
    h += env * (0.42 * sin(k1 * (s * 0.5 + az * 0.866)) + 0.2 * sin(k2 * (s * 0.342 + az * 0.94) + 1.3));
    // transverse waves inside the wedge (lambda = 74.7 m)
    h += 0.22 * inside * exp(-s / 300.0) * smoothstep(10.0, 40.0, s) * cos(0.0841 * s) * smoothstep(0.0, 3.0, off);
  }
  return h;
}
`;

const VERT = /* glsl */ `
uniform float uTime;
${COMMON_GLSL}
uniform vec2 uGrid; // x = uniform core half size, y = (r - 1) / r
varying vec3 vWorld;
varying vec2 vGrid;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vec2 g = wp.xz;
  vec2 rel = abs(g - cameraPosition.xz);
  float cs = OCEAN_CELL + max(0.0, max(rel.x, rel.y) - uGrid.x) * uGrid.y;   // local cell size
  vec2 p = g + vec2(uDrift, 0.0);
  vec3 acc = vec3(0.0), nrm = vec3(0.0);
  waves(p, cs, acc, nrm);
  float hw = hullHW(g.x);
  float kel = kelvin(g, hw) * (1.0 - smoothstep(4.0, 12.0, cs));
  wp.xyz += acc;
  wp.y += kel;
  vWorld = wp.xyz;
  vGrid = g;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const FRAG = /* glsl */ `
${SKY_GLSL}
${COMMON_GLSL}
uniform sampler2D uRipple;
uniform float uChop;
uniform float uWhitecap;
uniform float uShipLights;
uniform float uSunI;
varying vec3 vWorld;
varying vec2 vGrid;

const float WL = ${SHIP.waterline.toFixed(2)};

float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }

// stars reflected in the calm night sea
vec3 starRefl(vec3 R) {
  vec2 uv = vec2(atan(R.z, R.x) * 180.0, R.y * 360.0);
  vec2 c = floor(uv), f = fract(uv) - 0.5;
  float h = hash12(c);
  float s = step(0.985, h) * exp(-dot(f, f) * 18.0) * (h - 0.985) * 60.0;
  return vec3(0.8, 0.85, 1.0) * s * 0.6 * smoothstep(0.02, 0.2, R.y);
}

// lit portholes / windows / promenade lamps on the hull side plane (height above the water hy, station hx)
float shipLights(float hx, float hy, float sig) {
  float L = 0.0;
  // rows: F, E, D, C (hull ports), B (windows), A (promenade)
  for (int r = 0; r < 6; r++) {
    float fr = float(r);
    float y = r == 0 ? 2.4 : r == 1 ? 5.0 : r == 2 ? 7.75 : r == 3 ? 10.5 : r == 4 ? 13.3 : 16.4;
    float x0 = r == 4 ? -72.0 : r == 5 ? -76.0 : -118.0;
    float x1 = r == 4 ? 78.0 : r == 5 ? 76.0 : 120.0;
    float sp = r >= 4 ? 3.2 : 2.1;
    float vy = (hy - y) / sig;
    if (abs(vy) > 3.0 || hx < x0 || hx > x1) continue;
    float cx = floor(hx / sp);
    float fx = (hx / sp - cx - 0.5) * sp;
    float on = step(0.28, hash12(vec2(cx, fr * 7.0 + 3.0)));
    float rad = r >= 4 ? 0.55 : 0.2;
    L += on * exp(-fx * fx / (rad * rad)) * exp(-vy * vy) * (r >= 4 ? 1.4 : 1.0);
  }
  return L;
}

// height of the ship's side above the water at station x (for shadow / reflection)
float sideTop(float x) {
  float t = 11.8;                                         // C/B-deck sheer line
  if (x > -72.0 && x < 78.0) t = ${(DECK_Y.boat - SHIP.waterline + 1.0).toFixed(2)}; // superstructure up to the boat deck rail
  return t;
}

void main() {
  vec3 toCam = cameraPosition - vWorld;
  float dist = max(length(toCam), 0.001);
  vec3 V = toCam / dist;
  float day = 1.0 - uNight;
  vec2 g = vGrid;
  vec2 p = g + vec2(uDrift, 0.0);

  // ---- surface normal: Gerstner (footprint filtered) + Kelvin + detail slopes ----
  vec2 fwg = fwidth(g);
  float fp = max(max(fwg.x, fwg.y), 0.02);
  vec3 acc = vec3(0.0), nrm = vec3(0.0);
  waves(p, fp, acc, nrm);
  float J = 1.0 - nrm.y;                                  // < 1 where crests compress
  vec2 slope = vec2(nrm.x, nrm.z) / max(J, 0.2);

  float hw = hullHW(g.x);
  float kFade = 1.0 - smoothstep(2.0, 8.0, fp);
  if (kFade > 0.0) {
    float e = 0.35;
    float k0 = kelvin(g, hw);
    float kx = kelvin(g + vec2(e, 0.0), hw), kz = kelvin(g + vec2(0.0, e), hw);
    slope += vec2(kx - k0, kz - k0) / e * kFade;
  }

  // domain warp (slow, large-scale) so the tiled slope maps never line up into regular stripes / moire
  vec2 wq = texture2D(uFoamTex, p * 0.0047 + vec2(0.31, 0.77)).bg - 0.5;
  vec2 wq2 = texture2D(uFoamTex, p * 0.0113 + vec2(0.62, 0.13)).bg - 0.5;
  vec2 t1 = p / 11.0 + wq * 0.9 + vec2(0.012, 0.004) * uTime;
  vec2 t2 = mat2(0.8, -0.6, 0.6, 0.8) * p / 3.7 + wq2 * 1.3 + vec2(-0.03, 0.021) * uTime;
  vec2 t3 = mat2(0.28, 0.96, -0.96, 0.28) * p / 1.3 + vec2(0.05, -0.04) * uTime;
  vec2 t0 = mat2(0.57, 0.82, -0.82, 0.57) * p / 53.0 + wq * 0.5 + vec2(-0.004, 0.003) * uTime;
  vec3 r1 = texture2D(uRipple, t1).rgb, r2 = texture2D(uRipple, t2).rgb, r3 = texture2D(uRipple, t3).rgb, r0 = texture2D(uRipple, t0).rgb;
  vec2 d1 = r1.rg * 2.0 - 1.0, d2 = mat2(0.8, 0.6, -0.6, 0.8) * (r2.rg * 2.0 - 1.0), d3 = mat2(0.28, -0.96, 0.96, 0.28) * (r3.rg * 2.0 - 1.0);
  vec2 d0 = mat2(0.57, -0.82, 0.82, 0.57) * (r0.rg * 2.0 - 1.0);
  float f1 = 1.0 - smoothstep(0.35, 1.6, fp), f2 = 1.0 - smoothstep(0.08, 0.5, fp), f3 = 1.0 - smoothstep(0.03, 0.18, fp);
  // far away the 11 m map is replaced by a 53 m one (its texels are then filtered instead of aliasing)
  vec2 det = (d0 * mix(0.09, 0.16, 1.0 - f1) + d1 * 0.2 * f1 + d2 * 0.17 * f2 + d3 * 0.12 * f3) * uChop;

  // ---- distance to the hull at the waterline, wake geometry ----
  float x = g.x;
  float az = abs(g.y);
  float side = g.y >= 0.0 ? 1.0 : -1.0;
  float ax = max(abs(x) - BOW_X, 0.0);
  float dHull = length(vec2(ax, max(az - hw, 0.0)));
  if (ax <= 0.0 && az < hw - 0.35) discard; // no sea inside the hull (it showed on G deck where the shell is hidden or not loaded)
  float sBow = BOW_X - x;
  float bowK = smoothstep(-70.0, 125.0, x);
  float sW = -128.0 - x;
  float wake = 0.0;
  if (sW > 0.0) {
    float ww = (7.0 + 1.05 * sqrt(sW)) * (0.8 + 0.4 * tNoise(vec2(p.x * 0.012, g.y * 0.02)));
    wake = (1.0 - smoothstep(ww * 0.15, ww, az)) * exp(-sW / 650.0) * smoothstep(0.0, 14.0, sW);
  }
  // turbulent, flattened water in the wake
  det = mix(det, det * 1.6 + vec2(r3.b - 0.5, r2.b - 0.5) * 0.25, wake);
  slope *= 1.0 - 0.45 * wake;

  vec2 S2 = slope + det;
  vec3 Nn = normalize(vec3(-S2.x, 1.0, -S2.y));

  // ---- foam coverage ----
  float lace1 = texture2D(uFoamTex, p * 0.11).r;
  float lace2 = texture2D(uFoamTex, p * 0.31 + vec2(0.37, 0.71)).g;
  float foamPatch = texture2D(uFoamTex, p * 0.013).b;
  float laceFar = texture2D(uFoamTex, p * 0.037 + vec2(0.53, 0.21)).r;
  float lace = mix(lace1 * 0.62 + lace2 * 0.38, laceFar, smoothstep(0.04, 0.35, fp));
  float patchy = smoothstep(0.3, 0.75, texture2D(uFoamTex, p * 0.021 + vec2(0.1, 0.4)).b);
  float edge = exp(-dHull / (0.6 + 1.4 * bowK)) * (0.55 + 0.45 * bowK);
  float wash = exp(-dHull / (1.8 + max(sBow, 0.0) * 0.035)) * 0.7 * smoothstep(-5.0, 30.0, sBow);
  float arm = 0.0;
  if (sBow > 0.0) {
    float cusp = 0.3536 * sBow + 1.5;
    float q = (az - cusp) / (1.6 + sBow * 0.05);
    arm = exp(-q * q) * exp(-sBow / 160.0) * smoothstep(2.0, 10.0, sBow);
  }
  float caps = smoothstep(0.72, 0.38, J) * smoothstep(0.35, 0.7, foamPatch) * uWhitecap;
  float cov = clamp(edge * 0.9 + wash + arm * 0.8 + wake * (0.2 + 0.55 * patchy + 0.6 * exp(-max(sW, 0.0) / 140.0)) + caps, 0.0, 1.0);
  float foam = smoothstep(1.0 - cov, 1.0 - cov + 0.32, lace) * sqrt(cov);
  foam = max(foam, smoothstep(0.55, 0.0, dHull) * 0.9);   // soft contact line at the hull
  foam *= exp(-dist / 2400.0);
  float aer = clamp(wake * 0.85 + wash * 0.6 + arm * 0.35, 0.0, 1.0);
  Nn = normalize(mix(Nn, vec3(0.0, 1.0, 0.0), foam * 0.5));

  // ---- ship shadow on the water (analytic) ----
  vec3 Ls = uSunDir;
  float sunVis = 1.0;
  if (Ls.z * side < 0.0 && az > hw) {
    float t = (az - hw) / max(abs(Ls.z), 1e-3);
    float hy = Ls.y * t, hx = x + Ls.x * t;
    if (abs(hx) < BOW_X - 4.0) sunVis = smoothstep(-0.8, 0.8, hy - sideTop(hx));
  }

  // ---- reflection ----
  float NdV = max(dot(Nn, V), 0.0);
  float fres = 0.02 + 0.98 * pow(1.0 - NdV, 5.0);
  vec3 R = reflect(-V, Nn);
  R.y = abs(R.y) + 0.01;
  R = normalize(R);
  vec3 refl = skyBase(R);
  if (day > 0.01) {
    vec4 cl = skyClouds(R, 1.0);
    refl = mix(refl, cl.rgb, cl.a * smoothstep(0.0, 0.05, R.y));
  }
  refl += starRefl(R) * uNight;
  // hull mirror image near the ship
  if (R.z * side < 0.0 && az > hw - 0.2 && dHull < 260.0) {
    float t = (az - hw) / max(abs(R.z), 1e-3);
    float hy = R.y * t, hx = x + R.x * t;
    if (abs(hx) < BOW_X && hy < sideTop(hx) && t < 400.0) {
      float lit = max(0.0, side * uSunDir.z) * 0.8 + 0.2;
      float white = step(sideTop(hx) - 8.3, hy) * step(11.9, sideTop(hx));
      vec3 hullC = mix(vec3(0.012, 0.012, 0.014) * (0.4 + uSunI * 0.25 * lit), vec3(0.62, 0.61, 0.58) * (0.15 + uSunI * 0.22 * lit), white) * day;
      hullC += mix(vec3(0.0008, 0.0008, 0.001), vec3(0.03, 0.025, 0.019), white) * uNight;
      float sig = 0.25 + 0.06 * t;
      hullC += vec3(1.0, 0.7, 0.38) * shipLights(hx, hy, sig) * 1.6 * clamp(0.7 / sig, 0.08, 1.0) * uShipLights;
      float taper = smoothstep(hw - 3.0, hw - 0.3, hullHW(hx));   // the hull narrows towards bow / stern
      refl = mix(refl, hullC, smoothstep(0.0, 0.6, hy) * smoothstep(sideTop(hx), sideTop(hx) - 0.8, hy) * taper * (1.0 - smoothstep(330.0, 400.0, t)));
    }
  }

  // ---- water body: absorption tint + sub-surface scattering in the crests ----
  vec3 deep = mix(SEA_DAY, SEA_NIGHT, uNight);
  float crest = clamp(acc.y * 1.6 + 0.35, 0.0, 1.0);
  vec2 lh = normalize(uSunDir.xz);
  float back = pow(max(dot(-V.xz, lh), 0.0), 3.0);
  vec3 sss = vec3(0.008, 0.05, 0.046) * (0.15 + crest * (0.6 + 1.8 * back)) * uSunI * 0.12 * day * (0.5 + 0.5 * sunVis);
  vec3 body = deep * (0.6 + 0.4 * (1.0 - NdV)) + sss;
  body = mix(body, mix(vec3(0.03, 0.14, 0.15) * (0.22 + 0.1 * uSunI), vec3(0.002, 0.004, 0.006), uNight), aer * 0.65);

  vec3 col = mix(body, refl, fres);

  // ---- sun glitter (GGX, roughness grows with distance / pixel footprint) ----
  if (day > 0.01) {
    vec3 H = normalize(Ls + V);
    float NdH = max(dot(Nn, H), 0.0), NdL = max(dot(Nn, Ls), 0.0);
    float rgh = clamp(0.04 + fp * 0.04 + 0.07 * smoothstep(60.0, 2500.0, dist), 0.04, 0.3);
    float a2 = rgh * rgh;
    float dd = NdH * NdH * (a2 - 1.0) + 1.0;
    float D = a2 / (3.14159 * dd * dd);
    float Fs = 0.02 + 0.98 * pow(1.0 - max(dot(H, V), 0.0), 5.0);
    float spec = D * Fs * NdL / max(4.0 * NdV * NdL + 0.05, 0.05);
    col += vec3(1.0, 0.92, 0.78) * spec * uSunI * 1.4 * sunVis * day * (1.0 - foam);
  }

  // ---- night: warm glow of the ship's lights on the water near the hull ----
  float glow = (exp(-dHull / 9.0) * 0.7 + exp(-dHull / 40.0) * 0.3) * (1.0 - smoothstep(110.0, 135.0, abs(x))) * (0.55 + 0.45 * lace2);
  col += vec3(1.0, 0.66, 0.32) * glow * 0.03 * uShipLights;

  // ---- foam shading ----
  float sunL = max(uSunDir.y, 0.0) * sunVis;
  vec3 foamDay = vec3(0.78, 0.82, 0.86) * (0.28 + 0.62 * sunL * uSunI / 3.0) + vec3(0.06, 0.1, 0.14);
  vec3 foamNight = vec3(0.011, 0.013, 0.018) + vec3(1.0, 0.68, 0.35) * (0.08 * exp(-dHull / 10.0)) * uShipLights;
  col = mix(col, mix(foamDay, foamNight, uNight), foam * (0.7 + 0.3 * lace));

  // ---- aerial perspective / horizon (same function as the sky dome below the horizon) ----
  vec3 dh = normalize(vec3(-V.x, 0.0, -V.z) + vec3(0.00001, 0.0, 0.0));
  col = mix(col, seaFar(dh), smoothstep(600.0, 4800.0, dist) * 0.95);

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

function buildGrid() {
  const rings = N - LIN, want = HALF - LIN * CELL;
  let lo = 1.0001, hi = 3;
  for (let i = 0; i < 60; i++) {
    const r = (lo + hi) / 2;
    const sum = CELL * r * (Math.pow(r, rings) - 1) / (r - 1);
    if (sum > want) hi = r; else lo = r;
  }
  const r = (lo + hi) / 2;
  const coord = new Float32Array(N + 1);
  let d = 0, step = CELL;
  for (let a = 1; a <= N; a++) {
    if (a > LIN) step *= r;
    d += step;
    coord[a] = d;
  }
  const side = 2 * N + 1;
  const pos = new Float32Array(side * side * 3);
  let o = 0;
  for (let j = -N; j <= N; j++) {
    const z = Math.sign(j) * coord[Math.abs(j)];
    for (let i = -N; i <= N; i++) {
      pos[o++] = Math.sign(i) * coord[Math.abs(i)]; pos[o++] = 0; pos[o++] = z;
    }
  }
  const idx = new Uint32Array(4 * N * N * 6);
  o = 0;
  for (let j = 0; j < 2 * N; j++) {
    for (let i = 0; i < 2 * N; i++) {
      const a = j * side + i, b = a + 1, c = a + side, e = c + 1;
      idx[o++] = a; idx[o++] = c; idx[o++] = b; // faces +y
      idx[o++] = b; idx[o++] = c; idx[o++] = e;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), HALF * 1.5);
  return { geometry: g, growth: r };
}

function hullTexture() {
  const data = new Uint8Array(HULL_N);
  for (let i = 0; i < HULL_N; i++) {
    const x = HULL_X0 + ((i + 0.5) / HULL_N) * HULL_LEN;
    data[i] = Math.round(Math.min(1, hullHalfWidth(x, SHIP.waterline) / SHIP.halfBeam) * 255);
  }
  const t = new THREE.DataTexture(data, HULL_N, 1, THREE.RedFormat, THREE.UnsignedByteType);
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
}

function linearTex(data, size) {
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true; t.anisotropy = 8;
  t.needsUpdate = true;
  t.onUpdate = releaseTexData;
  return t;
}

/** Tileable wind-ripple slope map: RG = slopes (0.5 = flat), B = height. Sum of integer-wavevector sines. */
function rippleTexture(size = 256) {
  const r = rng(4711);
  const W = [];
  const wind = Math.atan2(0.35, -0.94);
  for (let i = 0; i < 56; i++) {
    let kx, ky, guard = 0;
    do {
      const m = 2 + Math.pow(r(), 1.4) * 34, a = wind + (r() - 0.5) * 2.4 * (0.4 + r() * 0.6);
      kx = Math.round(Math.cos(a) * m); ky = Math.round(Math.sin(a) * m);
    } while ((kx === 0 && ky === 0) && ++guard < 10);
    const m = Math.hypot(kx, ky) || 1;
    W.push({ kx, ky, amp: (0.6 + 0.8 * r()) / Math.pow(m, 1.7), ph: r() * Math.PI * 2 });
  }
  const n = size * size;
  const sx = new Float32Array(n), sy = new Float32Array(n), hh = new Float32Array(n);
  let maxS = 1e-6, minH = 1e9, maxH = -1e9;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let h = 0, dx = 0, dy = 0;
      const u = (x / size) * Math.PI * 2, v = (y / size) * Math.PI * 2;
      for (const w of W) {
        const th = w.kx * u + w.ky * v + w.ph;
        const s = Math.sin(th), c = Math.cos(th);
        h += w.amp * s; dx += w.amp * w.kx * c; dy += w.amp * w.ky * c;
      }
      const i = y * size + x;
      sx[i] = dx; sy[i] = dy; hh[i] = h;
      maxS = Math.max(maxS, Math.abs(dx), Math.abs(dy)); minH = Math.min(minH, h); maxH = Math.max(maxH, h);
    }
  }
  const data = new Uint8Array(n * 4);
  for (let i = 0; i < n; i++) {
    data[i * 4] = Math.round((sx[i] / maxS * 0.5 + 0.5) * 255);
    data[i * 4 + 1] = Math.round((sy[i] / maxS * 0.5 + 0.5) * 255);
    data[i * 4 + 2] = Math.round(((hh[i] - minH) / (maxH - minH)) * 255);
    data[i * 4 + 3] = 255;
  }
  return linearTex(data, size);
}

/** Lacy foam: R = coarse bubble lace, G = fine lace, B = large-scale patchiness. */
function foamTexture(size = 512) {
  const w1 = worley(size, 14, 31), w2 = worley(size, 36, 37), w3 = worley(size, 70, 41);
  const pf = fbm(size, 4, 4, 4, 43), fine = vnoise(size, 128, 128, 47);
  const data = new Uint8Array(size * size * 4);
  const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  for (let i = 0; i < size * size; i++) {
    const e1 = 1 - ss(0.0, 0.16, w1.d2[i] - w1.d1[i]);
    const e2 = 1 - ss(0.0, 0.2, w2.d2[i] - w2.d1[i]);
    const e3 = 1 - ss(0.0, 0.25, w3.d2[i] - w3.d1[i]);
    const holes = ss(0.15, 0.45, w2.d1[i]);
    const a = Math.min(1, Math.max(e1 * 0.9, e2 * 0.75) * (0.6 + 0.4 * fine[i]) + 0.25 * holes * fine[i]);
    const b = Math.min(1, Math.max(e2, e3 * 0.85) * (0.7 + 0.3 * fine[i]));
    data[i * 4] = a * 255; data[i * 4 + 1] = b * 255; data[i * 4 + 2] = pf[i] * 255; data[i * 4 + 3] = 255;
  }
  return linearTex(data, size);
}

// ---- bow spray: stateless GPU particles ----
const SPRAY_VERT = /* glsl */ `
attribute vec4 aSeed;
uniform float uTime;
uniform float uScale;
uniform float uHW;
varying float vA;
void main() {
  float life = 1.1 + 0.9 * aSeed.y;
  float age01 = fract(uTime / life + aSeed.x);
  float age = age01 * life;
  float side = aSeed.w < 0.5 ? -1.0 : 1.0;
  vec3 p0 = vec3(${(SHIP.bowX - 3).toFixed(2)} - aSeed.z * 16.0, ${SHIP.waterline.toFixed(2)} + 0.3, side * (uHW * (0.15 + aSeed.z * 0.5) + 0.4));
  vec3 v0 = vec3(-2.0 - 5.0 * aSeed.y, 2.5 + 3.5 * fract(aSeed.x * 7.3), side * (2.0 + 4.0 * fract(aSeed.y * 5.1)));
  vec3 p = p0 + v0 * age + vec3(-3.0, -4.9, 0.0) * age * age;
  vec4 mv = viewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float size = 0.7 + 2.4 * age01;
  gl_PointSize = min(size * uScale / max(-mv.z, 0.5), 300.0);
  vA = smoothstep(0.0, 0.08, age01) * pow(1.0 - age01, 1.5) * step(${SHIP.waterline.toFixed(2)} - 0.2, p.y);
}
`;
const SPRAY_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying float vA;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float a = exp(-dot(c, c) * 10.0) - 0.03;
  if (a <= 0.0) discard;
  gl_FragColor = vec4(uColor, a * vA * uOpacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

function createSpray(shared) {
  const COUNT = 260, r = rng(99);
  const pos = new Float32Array(COUNT * 3), seed = new Float32Array(COUNT * 4);
  for (let i = 0; i < COUNT; i++) { seed[i * 4] = r(); seed[i * 4 + 1] = r(); seed[i * 4 + 2] = Math.pow(r(), 1.5); seed[i * 4 + 3] = r(); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(SHIP.bowX, SHIP.waterline, 0), 40);
  const uniforms = { uTime: shared.uTime, uScale: { value: 800 }, uHW: { value: 2 }, uColor: { value: new THREE.Color(0.9, 0.93, 0.95) }, uOpacity: { value: 0.35 } };
  const material = new THREE.ShaderMaterial({ name: 'bowSpray', uniforms, vertexShader: SPRAY_VERT, fragmentShader: SPRAY_FRAG, transparent: true, depthWrite: false, fog: false });
  const points = new THREE.Points(g, material);
  points.name = 'bowSpray';
  points.frustumCulled = true;
  points.renderOrder = 40;
  points.userData.noMerge = true;
  uniforms.uHW.value = hullHalfWidth(SHIP.bowX - 8, SHIP.waterline);
  return { points, uniforms };
}

export function createOcean(shared) {
  const k = Math.min(1, Math.max(0.2, TIER.oceanSeg || 1));
  N = Math.round(160 * k); LIN = Math.round(96 * k); CELL = 120 / LIN;
  const grid = buildGrid();
  const uniforms = {
    uNight: shared.uNight, uSunDir: shared.uSunDir, uTime: shared.uTime,
    uDrift: { value: 0 }, uAmp: { value: 1 }, uChop: { value: 1 }, uWhitecap: { value: 0.5 }, uShipLights: { value: 0 }, uSunI: { value: 3 },
    uHull: { value: hullTexture() }, uRipple: { value: rippleTexture(256) }, uFoamTex: { value: foamTexture(512) },
    uGrid: { value: new THREE.Vector2(LIN * CELL, (grid.growth - 1) / grid.growth) },
  };
  const material = new THREE.ShaderMaterial({
    name: 'ocean', uniforms, vertexShader: VERT.replace('OCEAN_CELL', CELL.toFixed(3)), fragmentShader: FRAG,
    side: THREE.FrontSide, depthTest: true, depthWrite: true, fog: false,
  });
  const mesh = new THREE.Mesh(grid.geometry, material);
  mesh.name = 'ocean';
  mesh.position.y = SHIP.waterline;
  mesh.frustumCulled = false;
  mesh.userData.noMerge = true;
  const spray = createSpray(shared);
  return {
    mesh, uniforms, spray: spray.points,
    /** n = night factor 0..1, sunI = sun intensity, pxScale = pixels per metre at 1 m */
    update(camPos, time, n, sunI = 3, pxScale = 800) {
      mesh.position.x = Math.round(camPos.x / CELL) * CELL;
      mesh.position.z = Math.round(camPos.z / CELL) * CELL;
      uniforms.uDrift.value = time * SHIP_SPEED;
      uniforms.uAmp.value = 1 - 0.88 * n;      // "like a mill pond" at night
      uniforms.uChop.value = 1 - 0.75 * n;
      uniforms.uWhitecap.value = 0.55 * (1 - n);
      uniforms.uShipLights.value = n;
      uniforms.uSunI.value = sunI;
      spray.uniforms.uScale.value = pxScale;
      spray.uniforms.uOpacity.value = 0.16 * (1 - 0.85 * n);
      const c = 0.9 - 0.86 * n;
      spray.uniforms.uColor.value.setRGB(c, c * 1.02, c * 1.05);
    },
  };
}
