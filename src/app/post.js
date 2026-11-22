// Post-processing pipeline: HDR scene (MSAA) -> half-res ambient occlusion from depth (+ bilateral blur)
// -> quarter-res sun shafts -> dual-filter bloom -> one final pass (AO, interior haze, shafts, bloom, ACES,
// colour grade, vignette, grain, dither, sRGB). Quality 'niedrig' renders directly (no post).
import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

export const QUALITY_LEVELS = ['niedrig', 'mittel', 'hoch'];
const PRESETS = {
  // phones / weak devices: direct rendering, at most 1 pixel per CSS pixel (dynamic resolution may go lower)
  mobil: { post: false, pixelRatio: 1.0, samples: 0, ao: 0, rays: false, bloomLevels: 0, shadow: 0 },
  niedrig: { post: false, pixelRatio: 1.0, samples: 0, ao: 0, rays: false, bloomLevels: 0, shadow: 2048 },
  mittel: { post: true, pixelRatio: 1.0, samples: 2, ao: 8, rays: false, bloomLevels: 4, shadow: 2048 },
  hoch: { post: true, pixelRatio: 1.5, samples: 4, ao: 12, rays: true, bloomLevels: 5, shadow: 4096 },
};
export function qualityPreset(name) { return PRESETS[name] || PRESETS.hoch; }

const VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const DEPTH_GLSL = /* glsl */ `
uniform sampler2D tDepth;
uniform vec4 uProj; // p00, p11, near, far
float viewZ(float d) { return (uProj.z * uProj.w) / ((uProj.w - uProj.z) * d - uProj.w); }
vec3 viewPos(vec2 uv, float d) { float z = viewZ(d); vec2 ndc = uv * 2.0 - 1.0; return vec3(ndc.x * -z / uProj.x, ndc.y * -z / uProj.y, z); }
float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
`;

const AO_FRAG = /* glsl */ `
${DEPTH_GLSL}
uniform vec2 uTexel;     // full-res texel
uniform float uRadius, uIntensity;
varying vec2 vUv;
#ifndef SAMPLES
#define SAMPLES 12
#endif
void main() {
  float d = texture2D(tDepth, vUv).x;
  if (d >= 0.99999) { gl_FragColor = vec4(1.0, 1e5, 0.0, 1.0); return; }
  vec3 P = viewPos(vUv, d);
  vec2 ox = vec2(uTexel.x * 2.0, 0.0), oy = vec2(0.0, uTexel.y * 2.0);
  vec3 Pr = viewPos(vUv + ox, texture2D(tDepth, vUv + ox).x), Pl = viewPos(vUv - ox, texture2D(tDepth, vUv - ox).x);
  vec3 Pu = viewPos(vUv + oy, texture2D(tDepth, vUv + oy).x), Pd = viewPos(vUv - oy, texture2D(tDepth, vUv - oy).x);
  vec3 dx = abs(Pr.z - P.z) < abs(P.z - Pl.z) ? Pr - P : P - Pl;
  vec3 dy = abs(Pu.z - P.z) < abs(P.z - Pd.z) ? Pu - P : P - Pd;
  vec3 N = normalize(cross(dx, dy));
  float z = -P.z;
  vec2 rad = vec2(uProj.x, uProj.y) * 0.5 * uRadius / z;
  float rl = length(rad);
  if (rl > 0.12) rad *= 0.12 / rl;
  if (rl < uTexel.y * 1.5) { gl_FragColor = vec4(1.0, z, 0.0, 1.0); return; }
  float rnd = ign(gl_FragCoord.xy) * 6.2831853;
  float R2 = uRadius * uRadius;
  float sum = 0.0;
  for (int i = 0; i < SAMPLES; i++) {
    float t = (float(i) + 0.5) / float(SAMPLES);
    float a = rnd + float(i) * 2.399963;
    vec2 suv = vUv + vec2(cos(a), sin(a)) * rad * (0.12 + 0.88 * t * t);
    vec3 S = viewPos(suv, texture2D(tDepth, suv).x);
    vec3 v = S - P;
    float vv = dot(v, v);
    float vn = dot(v, N);
    float fall = max(0.0, 1.0 - vv / R2);
    sum += max(0.0, vn - 0.012 * z - 0.01) / (vv + 0.02 * R2) * fall;
  }
  float ao = clamp(1.0 - uIntensity * sum * uRadius * 2.0 / float(SAMPLES), 0.0, 1.0);
  gl_FragColor = vec4(ao, z, 0.0, 1.0);
}
`;

const BLUR_FRAG = /* glsl */ `
uniform sampler2D tAO;
uniform vec2 uDir; // texel step
varying vec2 vUv;
void main() {
  vec4 c = texture2D(tAO, vUv);
  float z0 = c.y;
  float sum = c.x, w = 1.0;
  for (int i = -3; i <= 3; i++) {
    if (i == 0) continue;
    vec4 s = texture2D(tAO, vUv + uDir * float(i));
    float dz = (s.y - z0) / (0.03 * z0 + 0.05);
    float wi = exp(-float(i * i) * 0.12 - dz * dz);
    sum += s.x * wi; w += wi;
  }
  gl_FragColor = vec4(sum / w, z0, 0.0, 1.0);
}
`;

const RAYS_FRAG = /* glsl */ `
uniform sampler2D tDepth;
uniform vec2 uSun;
uniform float uAspect;
varying vec2 vUv;
float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
void main() {
  vec2 dir = uSun - vUv;
  float len = length(dir * vec2(uAspect, 1.0));
  vec2 st = dir / 28.0 * min(1.0, 0.85 / max(len, 1e-3));
  vec2 uv = vUv + st * ign(gl_FragCoord.xy);
  float acc = 0.0, wsum = 0.0, wgt = 1.0;
  for (int i = 0; i < 28; i++) {
    float d = texture2D(tDepth, uv).x;
    acc += step(0.99999, d) * wgt;
    wsum += wgt;
    wgt *= 0.955;
    uv += st;
  }
  float k = acc / wsum;
  float fall = exp(-len * 2.2);
  gl_FragColor = vec4(k * fall, 0.0, 0.0, 1.0);
}
`;

// ---- auto exposure: log-average luminance (centre weighted) -> temporally adapted 1x1 value ----
const LUM_FRAG = /* glsl */ `
uniform sampler2D tSrc;
uniform vec2 uTexel;
varying vec2 vUv;
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
void main() {
  float s = 0.0;
  for (int j = 0; j < 2; j++) for (int i = 0; i < 2; i++) {
    vec2 o = (vec2(float(i), float(j)) - 0.5) * uTexel * 2.0;
    s += log2(clamp(luma(texture2D(tSrc, vUv + o).rgb), 1e-4, 64.0));
  }
  gl_FragColor = vec4(s * 0.25, 0.0, 0.0, 1.0);
}`;
const ADAPT_FRAG = /* glsl */ `
uniform sampler2D tLum, tPrev;
uniform float uDt, uReset;
varying vec2 vUv;
void main() {
  float s = 0.0, w = 0.0;
  // mip level 4 of the 256x128 log-luminance target = 16 x 8 texels, each the mean of 16 x 16
  for (int j = 0; j < 8; j++) for (int i = 0; i < 16; i++) {
    vec2 uv = (vec2(float(i), float(j)) + 0.5) / vec2(16.0, 8.0);
    vec2 q = (uv - 0.5) * vec2(1.6, 2.0);
    float wi = 1.0 - 0.75 * smoothstep(0.15, 1.0, dot(q, q));   // centre weighted
    s += textureLod(tLum, uv, 4.0).r * wi; w += wi;
  }
  float cur = s / w;
  float prev = texture2D(tPrev, vec2(0.5)).r;
  // faster towards brighter (pupil closes), slower towards darker
  float rate = cur > prev ? 2.2 : 1.1;
  float a = uReset > 0.5 ? 1.0 : 1.0 - exp(-uDt * rate);
  gl_FragColor = vec4(mix(prev, cur, a), 0.0, 0.0, 1.0);
}`;
const AE_GLSL = /* glsl */ `
uniform sampler2D tAdapt;
uniform vec4 uAE; // key (log2 reference luminance), min, max, strength
float autoExposure() {
  float l = texture2D(tAdapt, vec2(0.5)).r;
  return clamp(exp2((uAE.x - l) * uAE.w), uAE.y, uAE.z);
}`;

const DOWN_FRAG = /* glsl */ `
uniform sampler2D tSrc;
uniform vec2 uTexel; // source texel
uniform float uFirst, uThreshold, uKnee, uExposure;
${AE_GLSL}
varying vec2 vUv;
vec3 pre(vec3 c) {
  c *= uExposure * autoExposure();
  float br = max(c.r, max(c.g, c.b));
  float soft = clamp(br - uThreshold + uKnee, 0.0, 2.0 * uKnee);
  soft = soft * soft / (4.0 * uKnee + 1e-4);
  float contrib = max(soft, br - uThreshold) / max(br, 1e-4);
  return c * contrib;
}
vec3 tap(vec2 uv) {
  vec3 c = texture2D(tSrc, uv).rgb;
  if (uFirst > 0.5) { c = pre(min(c, vec3(4000.0))); c /= 1.0 + max(c.r, max(c.g, c.b)) * 0.25; }
  return c;
}
void main() {
  vec2 h = uTexel;
  vec3 s = tap(vUv) * 4.0 + tap(vUv - h) + tap(vUv + h) + tap(vUv + vec2(h.x, -h.y)) + tap(vUv - vec2(h.x, -h.y));
  s /= 8.0;
  if (uFirst > 0.5) s /= max(1e-4, 1.0 - max(s.r, max(s.g, s.b)) * 0.25);
  gl_FragColor = vec4(max(s, 0.0), 1.0);
}
`;

const UP_FRAG = /* glsl */ `
uniform sampler2D tSrc;   // lower-res (blurred) level
uniform sampler2D tAdd;   // same-res down level
uniform vec2 uTexel;      // source texel
uniform float uAddK;
varying vec2 vUv;
void main() {
  vec2 h = uTexel;
  vec3 s = texture2D(tSrc, vUv + vec2(-h.x * 2.0, 0.0)).rgb + texture2D(tSrc, vUv + vec2(h.x * 2.0, 0.0)).rgb
    + texture2D(tSrc, vUv + vec2(0.0, h.y * 2.0)).rgb + texture2D(tSrc, vUv + vec2(0.0, -h.y * 2.0)).rgb
    + (texture2D(tSrc, vUv + vec2(-h.x, h.y)).rgb + texture2D(tSrc, vUv + vec2(h.x, h.y)).rgb
    + texture2D(tSrc, vUv + vec2(h.x, -h.y)).rgb + texture2D(tSrc, vUv + vec2(-h.x, -h.y)).rgb) * 2.0;
  s /= 12.0;
  gl_FragColor = vec4(s + texture2D(tAdd, vUv).rgb * uAddK, 1.0);
}
`;

const FINAL_FRAG = /* glsl */ `
${DEPTH_GLSL}
uniform sampler2D tScene, tAO, tBloom, tRays;
uniform vec2 uAOTexel, uRes;
uniform float uUseAO, uAOStrength, uUseBloom, uBloom, uUseRays, uRays, uExposure, uTime;
uniform float uHaze, uHazeMax, uContrast, uSaturation, uVignette, uGrain, uDebug;
uniform vec3 uHazeColor, uSunColor, uLift, uGain;
${AE_GLSL}
varying vec2 vUv;

vec3 RRTAndODTFit(vec3 v) { vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
vec3 aces(vec3 c) {
  const mat3 IN = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
  const mat3 OUT = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
  c = IN * (c / 0.6);
  c = RRTAndODTFit(c);
  return clamp(OUT * c, 0.0, 1.0);
}
vec3 toSRGB(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

void main() {
  vec3 col = texture2D(tScene, vUv).rgb;
  float ex = uExposure * autoExposure();
  float d = texture2D(tDepth, vUv).x;
  float z = d >= 0.99999 ? 1e5 : -viewZ(d);
  if (uUseAO > 0.5 && d < 0.99999) {
    // joint bilateral upsample of the half-res AO
    vec2 p = vUv / uAOTexel - 0.5;
    vec2 f = fract(p);
    vec2 b = (floor(p) + 0.5) * uAOTexel;
    vec4 s00 = texture2D(tAO, b), s10 = texture2D(tAO, b + vec2(uAOTexel.x, 0.0));
    vec4 s01 = texture2D(tAO, b + vec2(0.0, uAOTexel.y)), s11 = texture2D(tAO, b + uAOTexel);
    float tol = 0.02 * z + 0.02;
    float w00 = (1.0 - f.x) * (1.0 - f.y) / (abs(s00.y - z) / tol + 0.05);
    float w10 = f.x * (1.0 - f.y) / (abs(s10.y - z) / tol + 0.05);
    float w01 = (1.0 - f.x) * f.y / (abs(s01.y - z) / tol + 0.05);
    float w11 = f.x * f.y / (abs(s11.y - z) / tol + 0.05);
    float ao = (s00.x * w00 + s10.x * w10 + s01.x * w01 + s11.x * w11) / (w00 + w10 + w01 + w11);
    float bright = smoothstep(2.0, 8.0, luma(col) * ex);
    col *= mix(1.0, ao, uAOStrength * (1.0 - bright));
    if (uDebug > 0.5 && uDebug < 1.5) { gl_FragColor = vec4(vec3(ao), 1.0); return; }
  }
  // participating medium (interiors / machinery): in-scatter towards the haze colour
  if (uHaze > 0.0 && d < 0.99999) {
    float f = (1.0 - exp(-z * uHaze)) * uHazeMax;
    col = mix(col, uHazeColor, f);
  }
  if (uUseRays > 0.5) col += uSunColor * texture2D(tRays, vUv).r * uRays;
  if (uUseBloom > 0.5) col += texture2D(tBloom, vUv).rgb * uBloom / max(ex, 1e-3);
  col = aces(col * ex);
  if (uDebug > 1.5) { gl_FragColor = vec4(vec3(autoExposure() * 0.25), 1.0); return; }
  // grade (display-referred)
  col = col * uGain + uLift * (1.0 - col);
  float l = luma(col);
  col = max(mix(vec3(l), col, uSaturation), 0.0);
  vec3 g = toSRGB(col);
  g = clamp((g - 0.5) * uContrast + 0.5, 0.0, 1.0);
  g = mix(g, g * g * (3.0 - 2.0 * g), max(uContrast - 1.0, 0.0) * 0.6);
  vec2 q = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
  g *= mix(1.0, smoothstep(1.15, 0.25, length(q)), uVignette);
  float n = fract(sin(dot(gl_FragCoord.xy + fract(uTime * 7.31) * 113.0, vec2(12.9898, 78.233))) * 43758.5453);
  g += (n - 0.5) * uGrain * (1.0 - 0.6 * luma(g));
  g += (ign(gl_FragCoord.xy) - 0.5) / 255.0;
  gl_FragColor = vec4(g, 1.0);
}
`;

function mat(frag, uniforms, defines) {
  return new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms, defines: defines || {}, depthTest: false, depthWrite: false, toneMapped: false });
}
function rt(w, h, opts = {}) {
  const t = new THREE.WebGLRenderTarget(Math.max(1, w), Math.max(1, h), {
    type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
    depthBuffer: false, generateMipmaps: false, ...opts,
  });
  t.texture.generateMipmaps = false;
  return t;
}

/**
 * The renderer-facing part of the pipeline. `params` is written by the environment every frame
 * (grading / haze / bloom / AO / sun shafts per situation).
 */
export class PostPipeline {
  constructor(renderer, scene, camera, quality = 'hoch') {
    this.renderer = renderer; this.scene = scene; this.camera = camera;
    this.params = {
      exposure: 1, aoStrength: 0.85, aoRadius: 0.7, aoIntensity: 1.25,
      bloom: 0.06, bloomThreshold: 1.6, bloomKnee: 0.6,
      haze: 0, hazeMax: 0.4, hazeColor: new THREE.Color(0, 0, 0),
      rays: 0, sunColor: new THREE.Color(1, 0.9, 0.75), sunDir: new THREE.Vector3(0.5, 0.5, 0.7).normalize(),
      contrast: 1.04, saturation: 1.0, vignette: 0.25, grain: 0.012,
      lift: new THREE.Color(0, 0, 0), gain: new THREE.Color(1, 1, 1),
      // auto exposure: key = log2 of the scene luminance that needs no correction, limits of the correction factor,
      // strength 0..1 (0 = off, fixed exposure)
      aeKey: -2, aeMin: 0.5, aeMax: 2, aeStrength: 0,
    };
    this._lastCam = new THREE.Vector3(1e9, 0, 0);
    this.aeReset = true;
    this.quality = null;
    this.preset = null;
    this.time = 0;
    this.size = new THREE.Vector2();
    this._sun = new THREE.Vector3();
    this._camDir = new THREE.Vector3();
    this.listeners = [];
    this.quad = new FullScreenQuad(null);
    this.resScale = 1;
    // HDR targets need renderable float / half-float colour buffers (missing on many phones): else direct output
    const ext = renderer.extensions;
    this.failed = !(ext.has('EXT_color_buffer_float') || ext.has('EXT_color_buffer_half_float'));
    if (this.failed) console.warn('[post] keine Float-Rendertargets – Nachbearbeitung aus');
    this.setQuality(quality);
  }

  onQuality(fn) { this.listeners.push(fn); }

  /** Dynamic resolution: factor on the preset's pixel ratio (weak tiers). */
  setResolutionScale(k) {
    k = Math.max(0.3, Math.min(1, k));
    if (Math.abs(k - this.resScale) < 1e-3) return;
    this.resScale = k;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.preset.pixelRatio) * k);
    this.resize();
  }

  setQuality(name) {
    if (!PRESETS[name]) name = 'hoch';
    if (name === this.quality) return;
    this.quality = name;
    this.preset = PRESETS[name];
    this._dispose();
    const r = this.renderer;
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.preset.pixelRatio) * this.resScale);
    r.toneMapping = this.preset.post && !this.failed ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
    this._build();
    this.resize();
    for (const fn of this.listeners) fn(name, this.preset);
  }

  _build() {
    const p = this.preset;
    if (!p.post || this.failed) return;
    this.depth = new THREE.DepthTexture(1, 1, THREE.UnsignedIntType);
    this.depth.minFilter = this.depth.magFilter = THREE.NearestFilter;
    this.rtScene = rt(1, 1, { depthBuffer: true, samples: p.samples, depthTexture: this.depth });
    this.rtAO = rt(1, 1); this.rtAO2 = rt(1, 1);
    this.rtRays = rt(1, 1, { type: THREE.UnsignedByteType });
    this.down = []; this.up = [];
    for (let i = 0; i < p.bloomLevels; i++) { this.down.push(rt(1, 1)); this.up.push(rt(1, 1)); }
    const proj = { value: new THREE.Vector4() };
    this.uProj = proj;
    this.rtLum = rt(256, 128, { minFilter: THREE.LinearMipmapLinearFilter, generateMipmaps: true });
    this.rtLum.texture.generateMipmaps = true;
    this.rtAdapt = [rt(1, 1, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter }), rt(1, 1, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter })];
    this.adaptIdx = 0;
    this.aeReset = true;
    const uAE = { value: new THREE.Vector4(-2, 1, 1, 0) }, tAdapt = { value: this.rtAdapt[0].texture };
    this.uAE = uAE; this.tAdapt = tAdapt;
    this.mLum = mat(LUM_FRAG, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() } });
    this.mAdapt = mat(ADAPT_FRAG, { tLum: { value: this.rtLum.texture }, tPrev: { value: null }, uDt: { value: 0 }, uReset: { value: 1 } });
    this.mAO = mat(AO_FRAG, { tDepth: { value: this.depth }, uProj: proj, uTexel: { value: new THREE.Vector2() }, uRadius: { value: 0.7 }, uIntensity: { value: 1.2 } }, { SAMPLES: p.ao || 8 });
    this.mBlur = mat(BLUR_FRAG, { tAO: { value: null }, uDir: { value: new THREE.Vector2() } });
    this.mRays = mat(RAYS_FRAG, { tDepth: { value: this.depth }, uSun: { value: new THREE.Vector2() }, uAspect: { value: 1 } });
    this.mDown = mat(DOWN_FRAG, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uFirst: { value: 0 }, uThreshold: { value: 1 }, uKnee: { value: 0.5 }, uExposure: { value: 1 }, tAdapt, uAE });
    this.mUp = mat(UP_FRAG, { tSrc: { value: null }, tAdd: { value: null }, uTexel: { value: new THREE.Vector2() }, uAddK: { value: 1 } });
    this.mFinal = mat(FINAL_FRAG, {
      tScene: { value: this.rtScene.texture }, tDepth: { value: this.depth }, uProj: proj, tAdapt, uAE,
      tAO: { value: this.rtAO.texture }, tBloom: { value: this.up.length ? this.up[0].texture : null }, tRays: { value: this.rtRays.texture },
      uAOTexel: { value: new THREE.Vector2() }, uRes: { value: new THREE.Vector2() },
      uUseAO: { value: p.ao > 0 ? 1 : 0 }, uAOStrength: { value: 0.8 }, uUseBloom: { value: p.bloomLevels > 0 ? 1 : 0 }, uBloom: { value: 0.05 },
      uUseRays: { value: 0 }, uRays: { value: 0 }, uExposure: { value: 1 }, uTime: { value: 0 },
      uHaze: { value: 0 }, uHazeMax: { value: 0.4 }, uDebug: { value: 0 }, uContrast: { value: 1 }, uSaturation: { value: 1 }, uVignette: { value: 0.2 }, uGrain: { value: 0.01 },
      uHazeColor: { value: new THREE.Color() }, uSunColor: { value: new THREE.Color() }, uLift: { value: new THREE.Color() }, uGain: { value: new THREE.Color(1, 1, 1) },
    });
  }

  _dispose() {
    for (const k of ['rtScene', 'rtAO', 'rtAO2', 'rtRays', 'rtLum']) { this[k]?.dispose(); this[k] = null; }
    for (const t of this.rtAdapt || []) t.dispose();
    this.rtAdapt = null;
    this.depth?.dispose(); this.depth = null;
    for (const t of this.down || []) t.dispose();
    for (const t of this.up || []) t.dispose();
    this.down = []; this.up = [];
    for (const k of ['mAO', 'mBlur', 'mRays', 'mDown', 'mUp', 'mFinal', 'mLum', 'mAdapt']) { this[k]?.dispose(); this[k] = null; }
  }

  resize() {
    const r = this.renderer;
    r.setSize(window.innerWidth, Math.max(1, window.innerHeight), false);
    r.getDrawingBufferSize(this.size);
    const w = this.size.x, h = this.size.y;
    if (!this.rtScene) return;
    this.rtScene.setSize(w, h);
    const hw = Math.max(1, Math.ceil(w / 2)), hh = Math.max(1, Math.ceil(h / 2));
    this.rtAO.setSize(hw, hh); this.rtAO2.setSize(hw, hh);
    this.rtRays.setSize(Math.max(1, Math.ceil(w / 4)), Math.max(1, Math.ceil(h / 4)));
    let bw = w, bh = h;
    for (let i = 0; i < this.down.length; i++) {
      bw = Math.max(1, Math.ceil(bw / 2)); bh = Math.max(1, Math.ceil(bh / 2));
      this.down[i].setSize(bw, bh); this.up[i].setSize(bw, bh);
    }
    this.mAO.uniforms.uTexel.value.set(1 / w, 1 / h);
    this.mFinal.uniforms.uAOTexel.value.set(1 / hw, 1 / hh);
    this.mFinal.uniforms.uRes.value.set(w, h);
    this.mRays.uniforms.uAspect.value = w / h;
  }

  /** Debug: adapted log2 luminance and the resulting auto-exposure factor. */
  readAE() {
    if (!this.rtAdapt) return null;
    const b = new Uint16Array(4);
    this.renderer.readRenderTargetPixels(this.rtAdapt[this.adaptIdx], 0, 0, 1, 1, b);
    const l = THREE.DataUtils.fromHalfFloat(b[0]), P = this.params;
    return { logLum: l, factor: Math.min(P.aeMax, Math.max(P.aeMin, Math.pow(2, (P.aeKey - l) * P.aeStrength))) };
  }

  _pass(material, target) {
    this.quad.material = material;
    this.renderer.setRenderTarget(target);
    this.quad.render(this.renderer);
  }

  render(dt = 0) {
    const r = this.renderer, scene = this.scene, cam = this.camera, P = this.params;
    this.time += dt;
    r.info.autoReset = false;
    r.info.reset();
    r.toneMappingExposure = P.exposure;
    if (!this.preset.post || this.failed || !this.rtScene) {
      r.setRenderTarget(null);
      r.render(scene, cam);
      return;
    }
    try {
      // 1. scene (HDR, MSAA, depth texture)
      r.setRenderTarget(this.rtScene);
      r.render(scene, cam);
      const pm = cam.projectionMatrix.elements;
      this.uProj.value.set(pm[0], pm[5], cam.near, cam.far);
      const F = this.mFinal.uniforms;
      // 1b. auto exposure (log-average luminance, adapted over time; reset on teleports)
      if (cam.position.distanceToSquared(this._lastCam) > 25) this.aeReset = true;
      this._lastCam.copy(cam.position);
      this.uAE.value.set(P.aeKey, P.aeMin, P.aeMax, P.aeStrength);
      this.mLum.uniforms.tSrc.value = this.rtScene.texture;
      this.mLum.uniforms.uTexel.value.set(1 / this.rtScene.width, 1 / this.rtScene.height);
      this._pass(this.mLum, this.rtLum);
      const A = this.mAdapt.uniforms, src = this.rtAdapt[this.adaptIdx], dst = this.rtAdapt[1 - this.adaptIdx];
      A.tPrev.value = src.texture; A.uDt.value = Math.min(dt, 0.1); A.uReset.value = this.aeReset || dt <= 0 ? 1 : 0;
      this._pass(this.mAdapt, dst);
      this.adaptIdx = 1 - this.adaptIdx;
      this.tAdapt.value = dst.texture;
      this.aeReset = false;
      // 2. AO (half res) + separable bilateral blur
      if (this.preset.ao > 0 && P.aoStrength > 0.01) {
        this.mAO.uniforms.uRadius.value = P.aoRadius;
        this.mAO.uniforms.uIntensity.value = P.aoIntensity;
        this._pass(this.mAO, this.rtAO);
        const bu = this.mBlur.uniforms;
        bu.tAO.value = this.rtAO.texture; bu.uDir.value.set(1 / this.rtAO.width, 0);
        this._pass(this.mBlur, this.rtAO2);
        bu.tAO.value = this.rtAO2.texture; bu.uDir.value.set(0, 1 / this.rtAO.height);
        this._pass(this.mBlur, this.rtAO);
        F.uUseAO.value = 1;
      } else F.uUseAO.value = 0;
      // 3. sun shafts (quarter res)
      let rays = 0;
      if (this.preset.rays && P.rays > 0.001) {
        cam.getWorldDirection(this._camDir);
        const facing = this._camDir.dot(P.sunDir);
        if (facing > 0.05) {
          this._sun.copy(P.sunDir).multiplyScalar(1000).add(cam.position).project(cam);
          const sx = this._sun.x * 0.5 + 0.5, sy = this._sun.y * 0.5 + 0.5;
          const off = Math.max(0, Math.max(Math.abs(sx - 0.5), Math.abs(sy - 0.5)) - 0.5);
          rays = P.rays * Math.min(1, (facing - 0.05) * 4) * Math.max(0, 1 - off * 2.5);
          if (rays > 0.001) {
            this.mRays.uniforms.uSun.value.set(sx, sy);
            this._pass(this.mRays, this.rtRays);
          }
        }
      }
      F.uUseRays.value = rays > 0.001 ? 1 : 0;
      F.uRays.value = rays;
      // 4. bloom (dual filter, Karis-weighted first downsample)
      const L = this.down.length;
      if (L > 0 && P.bloom > 0.001) {
        const D = this.mDown.uniforms;
        D.uThreshold.value = P.bloomThreshold; D.uKnee.value = P.bloomKnee; D.uExposure.value = P.exposure;
        let src = this.rtScene;
        for (let i = 0; i < L; i++) {
          D.tSrc.value = src.texture; D.uTexel.value.set(1 / src.width, 1 / src.height); D.uFirst.value = i === 0 ? 1 : 0;
          this._pass(this.mDown, this.down[i]);
          src = this.down[i];
        }
        const U = this.mUp.uniforms;
        let low = this.down[L - 1];
        for (let i = L - 2; i >= 0; i--) {
          U.tSrc.value = low.texture; U.tAdd.value = this.down[i].texture; U.uTexel.value.set(1 / low.width, 1 / low.height); U.uAddK.value = 1;
          this._pass(this.mUp, this.up[i]);
          low = this.up[i];
        }
        F.tBloom.value = L > 1 ? this.up[0].texture : this.down[0].texture;
        F.uUseBloom.value = 1;
      } else F.uUseBloom.value = 0;
      // 5. final
      F.uExposure.value = P.exposure;
      F.uAOStrength.value = P.aoStrength;
      F.uBloom.value = P.bloom / Math.max(1, L);
      F.uHaze.value = P.haze; F.uHazeMax.value = P.hazeMax; F.uHazeColor.value.copy(P.hazeColor);
      F.uSunColor.value.copy(P.sunColor);
      F.uContrast.value = P.contrast; F.uSaturation.value = P.saturation; F.uVignette.value = P.vignette; F.uGrain.value = P.grain;
      F.uLift.value.copy(P.lift); F.uGain.value.copy(P.gain);
      F.uTime.value = this.time;
      F.uDebug.value = this.debug || 0;
      this._pass(this.mFinal, null);
    } catch (e) {
      console.error('[post] Nachbearbeitung fehlgeschlagen – direkte Ausgabe', e);
      this.failed = true;
      r.toneMapping = THREE.ACESFilmicToneMapping;
      r.setRenderTarget(null);
    }
  }
}
