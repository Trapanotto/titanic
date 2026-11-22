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
  oak: woodSolid({ base: '#8c5f35', fleck: 0.7, seed: 5, rough: 0.5 }),
  oakPanel: woodPanel({ base: '#875a30', seed: 7 }),
  mahogany: mahoganyFigure({ base: '#5e2a1a', seed: 9 }),
  pine: pineBoards({ base: '#c3a473', seed: 11 }),
  whitePanel: paintedPanel({ base: '#e6e3da', seed: 13 }),
  steel: rivetedSteel({ metres: 2.4, base: '#8b8e90', seed: 15 }),
  hull: hullPlating({ size: 1024, metres: 6, seed: 17 }),
  carpetRed: carpet({ ground: '#5a1f1d', motif: '#97794a', accent: '#2f3a2c', seed: 21 }),
  carpetGreen: carpet({ ground: '#2c3a2b', motif: '#958452', accent: '#57261f', seed: 23 }),
  carpetBlue: carpet({ ground: '#252e44', motif: '#a09368', accent: '#5a2a25', seed: 25 }),
  linoCream: linoTiles({ a: '#cbc0a2', b: '#70493e', inset: true, metres: 1.2, seed: 27, mottle: 0.08 }),
  linoBlue: linoTiles({ a: '#d3ccb8', b: '#4f5c6e', inset: true, metres: 1.2, seed: 29, mottle: 0.08 }),
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

/** Glass: cheap transparency + env reflections, opacity rises towards grazing angles (fresnel). */
function glassMaterial() {
  const m = phys({
    color: 0xd2e2e6, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.14, side: THREE.DoubleSide,
    depthWrite: false, ior: 1.5, specularIntensity: 1, envMapIntensity: 1.6,
  });
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', /* glsl */ `
      {
        float fr = pow(1.0 - clamp(abs(dot(normal, normalize(vViewPosition))), 0.0, 1.0), 4.0);
        diffuseColor.a = mix(diffuseColor.a, 0.85, fr);
      }
      #include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'titanicGlass1';
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
  mahogany: phys(surf({ roughness: 1, clearcoat: 0.7, clearcoatRoughness: 0.12 }, S.mahogany, 'anro')),
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

/** Generated textures by surface name (albedo / normal / orm). */
export const textures = Object.fromEntries(Object.entries(S).map(([k, s]) => [k, s.map]));
export const surfaces = S;
export const textureGenMs = genMs;

/** Called by the environment on day/night change. */
export function applyNightToMaterials(night) {
  mats.windowLit.emissiveIntensity = night ? 3.2 : 0.0;
  mats.lampGlow.emissiveIntensity = night ? 3.4 : 2.4;
}
