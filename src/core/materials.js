import * as THREE from 'three';
import {
  woodPlanks, woodSolid, woodPanel, paintedPanel, pineBoards, mahoganyFigure, rivetedSteel, hullPlating, treadPlate,
  metalSmudge, paintSurface, rustSurface, carpet, linoTiles, ceramicTiles, brickWall, coalLumps, plasterCeiling,
  marbleSurface, weave, leatherGrain, basketWeave, ropeLay,
} from './tex-lib.js';

// Shared material library. ALWAYS reuse these (meshes are merged per material).
// Textures are authored "per metre": use tiledBox()/tiledPlane() from core/geo.js so UVs are in metres.
// PBR detail (albedo + normal + ORM maps) is generated procedurally at startup (src/core/tex-lib.js).

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

/** Canvas texture covering `metres` x `metres` of surface. draw(ctx, size, rand). */
export function canvasTexture(size, metres, draw, seed = 1) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  draw(ctx, size, rng(seed));
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / metres, 1 / metres);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// ------------------------------------------------------------------ procedural surfaces

const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
const S = {
  deck: woodPlanks({ size: 1024, metres: 4, planks: 32, base: '#b6a283', seed: 3 }),
  oak: woodSolid({ base: '#85603a', fleck: 0.5, contrast: 0.13, seed: 5, rough: 0.5 }),
  oakPanel: woodPanel({ base: '#805c37', seed: 7 }),
  mahogany: mahoganyFigure({ base: '#44251a', seed: 9 }),
  pine: pineBoards({ base: '#c3a473', seed: 11 }),
  whitePanel: paintedPanel({ base: '#e6e3da', seed: 13 }),
  steel: rivetedSteel({ metres: 2.4, base: '#8b8e90', seed: 15 }),
  hull: hullPlating({ size: 1024, metres: 6, seed: 17 }),
  carpetRed: carpet({ ground: '#5a1f1d', motif: '#97794a', accent: '#2f3a2c', seed: 21 }),
  carpetGreen: carpet({ ground: '#2c3a2b', motif: '#958452', accent: '#57261f', seed: 23 }),
  carpetBlue: carpet({ ground: '#252e44', motif: '#a09368', accent: '#5a2a25', seed: 25 }),
  // 30 cm tiles, 8 x 8 per texture (2.4 m repeat, so the mottling / wax sheen does not visibly tile)
  linoCream: linoTiles({ a: '#bdb193', b: '#784e42', inset: true, metres: 2.4, n: 8, seed: 27, mottle: 0.1 }),
  linoBlue: linoTiles({ a: '#c9c2ae', b: '#505d6e', inset: true, metres: 2.4, n: 8, seed: 29, mottle: 0.1 }),
  linoRed: linoTiles({ a: '#7f4535', b: '#74402f', metres: 1.0, rough: 0.5, seed: 31, mottle: 0.12 }),
  tileWhite: ceramicTiles({ seed: 33 }),
  steelFloor: treadPlate({ seed: 35 }),
  coal: coalLumps({ seed: 37 }),
  plaster: plasterCeiling({ seed: 39 }),
  brick: brickWall({ seed: 41 }),
  paint: paintSurface({ seed: 85 }),
  smudge: metalSmudge({ seed: 81 }),
  rust: rustSurface({ seed: 87 }),
  marble: marbleSurface({ seed: 91 }),
  fabric: weave({ thread: 2, metres: 0.5, seed: 95 }),
  canvas: weave({ thread: 4, metres: 0.6, depth: 1, varK: 0.16, stains: 1, seed: 97 }),
  leather: leatherGrain({ seed: 99 }),
  wicker: basketWeave({ seed: 101 }),
  rope: ropeLay({ seed: 103 }),
};
const genMs = (typeof performance !== 'undefined' ? performance.now() : 0) - t0;
if (typeof window !== 'undefined' && window.__titanicTexMs === undefined) window.__titanicTexMs = genMs;

/**
 * Attach a surface's maps to material options.
 * parts: 'a' albedo, 'n' normal, 'r' roughness (ORM.g), 'm' metalness (ORM.b), 'o' ambient occlusion (ORM.r)
 */
function surf(opts, s, parts = 'anro', nScale = 1) {
  if (parts.includes('a') && s.map) opts.map = s.map;
  if (parts.includes('n') && s.normalMap) { opts.normalMap = s.normalMap; opts.normalScale = new THREE.Vector2(nScale, nScale); }
  if (parts.includes('r') && s.ormMap) opts.roughnessMap = s.ormMap;
  if (parts.includes('m') && s.ormMap) opts.metalnessMap = s.ormMap;
  if (parts.includes('o') && s.ormMap) { opts.aoMap = s.ormMap; opts.aoMapIntensity = opts.aoMapIntensity ?? 1; }
  return opts;
}

// Lamps are not points: regularise the inverse-square falloff (soft source radius ~0.45 m) so lights that sit
// close to a ceiling or column do not burn out a tiny hot spot. Patched once, before any shader is compiled.
if (!THREE.ShaderChunk.lights_pars_begin.includes('TITANIC_SOFT_FALLOFF')) {
  THREE.ShaderChunk.lights_pars_begin = THREE.ShaderChunk.lights_pars_begin.replace(
    'float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );',
    'float distanceFalloff = 1.0 / ( pow( lightDistance, decayExponent ) + 0.2 ); // TITANIC_SOFT_FALLOFF',
  );
}

function std(opts) { return new THREE.MeshStandardMaterial(opts); }
function phys(opts) { return new THREE.MeshPhysicalMaterial(opts); }

// ------------------------------------------------------------------ shared lighting uniforms
// Written by the environment every frame. Fixed set of uniforms -> no shader recompiles.
//  uWinGlow      warm night glow of window glass seen from outside (0 by day / from inside)
//  uShipVol*     baked irradiance volume of the exterior deck lamps (night): pools of light on the planking and the
//                white superstructure, visible from any distance (the real point-light pool only covers ~15 m)
const placeholderVol = new THREE.Data3DTexture(new Uint8Array(1), 1, 1, 1);
placeholderVol.format = THREE.RedFormat;
placeholderVol.needsUpdate = true;
export const lightingUniforms = {
  uWinGlow: { value: 0 },
  uShipVol: { value: placeholderVol },
  uShipVolK: { value: 0 },
  uShipVolMax: { value: 3 },
  uShipVolMin: { value: new THREE.Vector3(0, -1000, 0) },
  uShipVolInv: { value: new THREE.Vector3(1, 1, 1) },
  uShipVolColor: { value: new THREE.Color(1.0, 0.78, 0.52) },
  uShipAmb: { value: new THREE.Color(0, 0, 0) },   // soft overall glow of the lit ship at night (seen from outside)
};

const WORLDPOS_VERT = /* glsl */ `
  {
    vec4 tw = vec4( transformed, 1.0 );
    #ifdef USE_BATCHING
      tw = batchingMatrix * tw;
    #endif
    #ifdef USE_INSTANCING
      tw = instanceMatrix * tw;
    #endif
    vTitW = ( modelMatrix * tw ).xyz;
  }`;

/** Adds the exterior lamp volume (night) to a lit material as extra indirect light (affected by AO maps). */
function shipLampPatch(sh) {
  Object.assign(sh.uniforms, lightingUniforms);
  sh.vertexShader = 'varying vec3 vTitW;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>' + WORLDPOS_VERT);
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <common>', `#include <common>
varying vec3 vTitW;
uniform highp sampler3D uShipVol;
uniform float uShipVolK, uShipVolMax;
uniform vec3 uShipVolMin, uShipVolInv, uShipVolColor, uShipAmb;`)
    .replace('#include <aomap_fragment>', /* glsl */ `
  if ( uShipVolK > 0.0 ) {
    vec3 sN = inverseTransformDirection( normal, viewMatrix );
    if ( abs( vTitW.x ) < 140.0 && abs( vTitW.z ) < 17.0 && vTitW.y > 10.0 ) {
      // light spilling from hundreds of windows and deck lamps: strongest around the decks, fading up the funnels
      float gy = 1.0 - 0.7 * smoothstep( 31.0, 52.0, vTitW.y );
      reflectedLight.indirectDiffuse += material.diffuseColor * uShipAmb * gy * ( 0.75 + 0.25 * sN.y );
    }
    vec3 uvw = ( vTitW + sN * 0.3 - uShipVolMin ) * uShipVolInv;
    if ( all( greaterThan( uvw, vec3( 0.0 ) ) ) && all( lessThan( uvw, vec3( 1.0 ) ) ) ) {
      float e = texture( uShipVol, uvw ).r;
      e = e * e * uShipVolMax * uShipVolK * ( 0.62 + 0.38 * max( sN.y, 0.0 ) );
      reflectedLight.indirectDiffuse += material.diffuseColor * uShipVolColor * ( e * RECIPROCAL_PI );
      reflectedLight.indirectSpecular += material.specularColor * uShipVolColor * ( e * 0.06 );
    }
  }
  #include <aomap_fragment>`);
}

/** Glass: cheap transparency + env reflections, opacity rises towards grazing angles (fresnel).
 *  At night, panes seen from outside glow warm (lit rooms behind them; the interiors far away are culled). */
function glassMaterial() {
  const m = phys({
    color: 0xd2e2e6, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.14, side: THREE.DoubleSide,
    depthWrite: false, ior: 1.5, specularIntensity: 1, envMapIntensity: 1.6,
  });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uWinGlow = lightingUniforms.uWinGlow;
    sh.vertexShader = 'varying vec3 vTitW;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>' + WORLDPOS_VERT);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTitW;\nuniform float uWinGlow;')
      .replace('#include <opaque_fragment>', /* glsl */ `
      {
        float fr = pow(1.0 - clamp(abs(dot(normal, normalize(vViewPosition))), 0.0, 1.0), 4.0);
        diffuseColor.a = mix(diffuseColor.a, 0.85, fr);
        if ( uWinGlow > 0.0 ) {
          // one value per pane-sized cell: rooms are lit a little differently, a few are dark
          vec3 cell = floor( vTitW * vec3( 0.55, 0.36, 0.55 ) );
          float h = fract( sin( dot( cell, vec3( 12.9898, 78.233, 37.719 ) ) ) * 43758.5453 );
          float lit = 0.55 + 0.6 * h;
          lit *= step( 0.07, fract( h * 13.7 ) );
          float far = smoothstep( 7.0, 26.0, length( vViewPosition ) );
          float gk = uWinGlow * far;
          vec3 warm = mix( vec3( 1.0, 0.66, 0.32 ), vec3( 1.0, 0.8, 0.52 ), h ) * 2.4 * lit;
          outgoingLight = mix( outgoingLight, warm + outgoingLight * 0.3, gk );
          diffuseColor.a = mix( diffuseColor.a, 0.93, gk );
        }
      }
      #include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'titanicGlass2';
  return m;
}

/** All shared materials. */
export const mats = {
  // --- exterior ---
  hullBlack: phys(surf({ color: 0x1b1c1f, roughness: 1, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.32 }, S.hull, 'anro', 1)),
  hullRed: std(surf({ color: 0x6c2a22, roughness: 0.82, metalness: 0 }, S.hull, 'ano')),
  hullWhite: std(surf({ color: 0xeeebe3, roughness: 1, metalness: 0 }, S.hull, 'anro')),
  hullStripe: std(surf({ color: 0xcf9f2a, roughness: 0.5, metalness: 0.1 }, S.paint, 'anr')),
  funnelBuff: std(surf({ color: 0xcf9a55, roughness: 1, metalness: 0 }, S.hull, 'anro', 0.8)),
  funnelBlack: std(surf({ color: 0x141416, roughness: 0.78, metalness: 0.05 }, S.paint, 'anr')),
  deckWood: std(surf({ roughness: 1 }, S.deck, 'anro', 1)),
  canvas: std(surf({ color: 0xdcd5c2, roughness: 0.95 }, S.canvas, 'ano', 0.8)),
  rope: std(surf({ color: 0x8c7752, roughness: 1 }, S.rope, 'ano')),
  rust: std(surf({ roughness: 1, metalness: 1 }, S.rust, 'anrmo')),
  // --- paint / metal ---
  paintWhite: std(surf({ color: 0xece9e1, roughness: 0.5 }, S.paint, 'anr')),
  paintCream: std(surf({ color: 0xe0d5b8, roughness: 0.55 }, S.paint, 'anr')),
  paintGrey: std(surf({ color: 0x8e9192, roughness: 0.62 }, S.paint, 'anr')),
  paintGreen: std(surf({ color: 0x4a6550, roughness: 0.62 }, S.paint, 'anr')),
  whitePanel: std(surf({ roughness: 1 }, S.whitePanel, 'anro', 0.9)),
  steel: std(surf({ roughness: 1, metalness: 1 }, S.steel, 'anrmo')),
  steelDark: std(surf({ color: 0x64676a, roughness: 1, metalness: 1 }, S.steel, 'anrmo')),
  steelFloor: std(surf({ roughness: 1, metalness: 1 }, S.steelFloor, 'anrmo')),
  iron: std(surf({ color: 0x2a2b2e, roughness: 0.62, metalness: 0.75 }, S.smudge, 'nr', 0.5)),
  brass: std(surf({ color: 0xd8b45e, roughness: 0.34, metalness: 1 }, S.smudge, 'anr', 0.35)),
  gold: std(surf({ color: 0xebc66c, roughness: 0.28, metalness: 1 }, S.smudge, 'anr', 0.25)),
  copper: std(surf({ color: 0xc47c55, roughness: 0.38, metalness: 1 }, S.smudge, 'anr', 0.35)),
  chrome: std(surf({ color: 0xe1e3e5, roughness: 0.14, metalness: 1 }, S.smudge, 'nr', 0.2)),
  // --- wood ---
  oak: phys(surf({ roughness: 1, clearcoat: 0.25, clearcoatRoughness: 0.3 }, S.oak, 'anro')),
  oakPanel: phys(surf({ roughness: 1, clearcoat: 0.3, clearcoatRoughness: 0.26 }, S.oakPanel, 'anro')),
  mahogany: phys(surf({ roughness: 1, clearcoat: 0.55, clearcoatRoughness: 0.16 }, S.mahogany, 'anro', 0.7)),
  woodDark: phys(surf({ color: 0x4e3020, roughness: 1, clearcoat: 0.5, clearcoatRoughness: 0.18 }, S.oak, 'anro')),
  pine: std(surf({ roughness: 1 }, S.pine, 'anro')),
  // --- floors ---
  carpetRed: phys(surf({ roughness: 1, sheen: 1, sheenRoughness: 0.55, sheenColor: new THREE.Color(0x7a3a32) }, S.carpetRed, 'ano', 0.8)),
  carpetGreen: phys(surf({ roughness: 1, sheen: 1, sheenRoughness: 0.55, sheenColor: new THREE.Color(0x4c5c40) }, S.carpetGreen, 'ano', 0.8)),
  carpetBlue: phys(surf({ roughness: 1, sheen: 1, sheenRoughness: 0.55, sheenColor: new THREE.Color(0x46506a) }, S.carpetBlue, 'ano', 0.8)),
  linoCream: std(surf({ roughness: 1 }, S.linoCream, 'anro')),
  linoBlue: std(surf({ roughness: 1 }, S.linoBlue, 'anro')),
  linoRed: std(surf({ roughness: 1 }, S.linoRed, 'anro')),
  tileWhite: std(surf({ roughness: 1 }, S.tileWhite, 'anro')),
  // --- soft goods ---
  fabricRed: phys(surf({ color: 0x6c2228, roughness: 1, sheen: 0.9, sheenRoughness: 0.4, sheenColor: new THREE.Color(0xa0525a) }, S.fabric, 'ano', 0.6)),
  fabricGreen: phys(surf({ color: 0x2f4a37, roughness: 1, sheen: 0.9, sheenRoughness: 0.4, sheenColor: new THREE.Color(0x5f8068) }, S.fabric, 'ano', 0.6)),
  fabricBlue: phys(surf({ color: 0x2b3a5a, roughness: 1, sheen: 0.9, sheenRoughness: 0.4, sheenColor: new THREE.Color(0x5a6a90) }, S.fabric, 'ano', 0.6)),
  fabricGold: phys(surf({ color: 0xa88a4c, roughness: 0.95, sheen: 0.8, sheenRoughness: 0.35, sheenColor: new THREE.Color(0xd8c090) }, S.fabric, 'ano', 0.6)),
  linen: std(surf({ color: 0xf0ede4, roughness: 1 }, S.fabric, 'ano', 0.4)),
  blanket: std(surf({ color: 0x8c2e29, roughness: 1 }, S.fabric, 'ano', 0.9)),
  leather: std(surf({ color: 0x4a2a1a, roughness: 0.62 }, S.leather, 'anro')),
  leatherGreen: std(surf({ color: 0x25402d, roughness: 0.62 }, S.leather, 'anro')),
  wicker: std(surf({ color: 0xc6ab76, roughness: 0.9 }, S.wicker, 'ano')),
  // --- misc ---
  plaster: std(surf({ roughness: 1 }, S.plaster, 'anro', 0.9)),
  marble: phys(surf({ roughness: 1, clearcoat: 0.4, clearcoatRoughness: 0.08 }, S.marble, 'anr')),
  porcelain: phys({ color: 0xf8f7f2, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.04 }),
  brick: std(surf({ roughness: 1 }, S.brick, 'anro')),
  coal: std(surf({ roughness: 1 }, S.coal, 'anro')),
  rubber: std(surf({ color: 0x1c1c1c, roughness: 0.9 }, S.paint, 'n')),
  plant: std({ color: 0x2f5f2c, roughness: 0.7, side: THREE.DoubleSide }),
  paper: std(surf({ color: 0xe7e0c6, roughness: 1 }, S.fabric, 'n', 0.25)),
  mirror: std({ color: 0xd6dbde, roughness: 0.025, metalness: 1, envMapIntensity: 1.2 }),
  glass: glassMaterial(),
  // --- emissive (driven by day/night) ---
  windowLit: std({ color: 0x1d2a33, roughness: 0.12, metalness: 0.6, emissive: 0xffbf6a, emissiveIntensity: 0 }), // opaque porthole / window as seen from outside
  lampGlow: std({ color: 0xfff2d6, emissive: 0xffd39a, emissiveIntensity: 2.4 }),   // lamp shades / bulbs (always on)
  fire: std({ color: 0xff7a22, emissive: 0xff5a10, emissiveIntensity: 3 }),          // furnaces, fireplaces
  navRed: std({ color: 0xff2020, emissive: 0xff0000, emissiveIntensity: 2 }),
  navGreen: std({ color: 0x20ff50, emissive: 0x00ff30, emissiveIntensity: 2 }),
};
for (const [name, m] of Object.entries(mats)) m.name = name;
const NO_LAMP_PATCH = new Set(['glass', 'windowLit', 'lampGlow', 'fire', 'navRed', 'navGreen', 'mirror']);
for (const [name, m] of Object.entries(mats)) {
  if (NO_LAMP_PATCH.has(name) || !m.isMeshStandardMaterial || m.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile) continue;
  m.onBeforeCompile = shipLampPatch;
  m.customProgramCacheKey = () => 'titanicLampVol1';
}

/** Generated textures by surface name (albedo / normal / orm). */
export const textures = Object.fromEntries(Object.entries(S).map(([k, s]) => [k, s.map]));
export const surfaces = S;
export const textureGenMs = genMs;

/** Called by the environment on day/night change. */
export function applyNightToMaterials(night) {
  mats.windowLit.emissiveIntensity = night ? 3.2 : 0.0;
  mats.lampGlow.emissiveIntensity = night ? 3.4 : 2.4;
}
