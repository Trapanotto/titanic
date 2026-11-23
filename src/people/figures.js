// People – figure types of April 1912: which parts a person wears, body measures and the colour palette
// (per person one row of NSLOT colours, roughness in alpha, negative alpha = metal).
import * as THREE from 'three';
import { SLOT as S, NSLOT } from './parts.js';

export function rng(seed) {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (r, list) => list[Math.floor(r() * list.length) % list.length];
const chance = (r, p) => r() < p;

// ---------------------------------------------------------------- colours (sRGB hex)
const SKIN = [0xe9c6aa, 0xe2b898, 0xd8ab88, 0xcf9f7e, 0xc59372, 0xb98466];
const HAIR = [0x1d1713, 0x2e2018, 0x46301f, 0x5e4128, 0x6e3c20, 0x8d7048, 0xa8915e];
const GREY_HAIR = [0x8c8884, 0xa9a59f, 0xcfcbc3];
const DARK_CLOTH = [0x17171a, 0x232428, 0x1c2232, 0x2c2420, 0x34363a];
const SUIT = [0x232428, 0x2b2d33, 0x1f2638, 0x3a2e24, 0x4a4a4c, 0x58503f, 0x3e4436];
const LADY = [0x24304e, 0x4a2442, 0x8e8a88, 0xd6caae, 0x8a6a88, 0x2f4635, 0x5a1d26, 0x1a191c, 0xe2ddd0, 0xb48c8c, 0x6a7a94, 0x7a6a4e];
const BLOUSE = [0xf3f0e8, 0xece4cf, 0xe8e0d4, 0xf0eadf];
const TRIM = [0xf2eee6, 0xd98a98, 0xece2c8, 0x1a1a1a, 0xa890c4, 0x8e2230, 0xc8b070, 0x7a96b8];
const LADY_HAT = [0x141416, 0x22283c, 0xe0d6bc, 0xc9b27e, 0x6a6460, 0x4a2a3e, 0xf0ece2];
const FUR = [0x5a4230, 0xe8e4dc, 0x1c1a18, 0x8c8884, 0x7a5a3a];
const WORK = [0x3b342b, 0x2d2b29, 0x4a4438, 0x3a3a3e, 0x4e3e2e, 0x30343a];
const WORK_SHIRT = [0xbdb6a6, 0x8f99a8, 0xa8a090, 0xcfc8b6];
const SCARF = [0x6b3a2a, 0x3a4a5c, 0x7a6a4a, 0x2a2a2c, 0x5a2a34, 0x4e5a3a];
const NECK = [0xb8b0a0, 0x8a2a20, 0x2a3a6a, 0xd8d0c0];
const NAVY = 0x161b2b;
const GOLD = 0xd9b25a;

export const CLASS_OF = { gent1: 'first', lady1: 'first', man2: 'second', woman2: 'second', man3: 'third', woman3: 'third', officer: 'crew', steward: 'crew', seaman: 'crew', stoker: 'crew', boy: 'child', girl: 'child' };

const _c = new THREE.Color();
function setSlot(pal, s, hex, rough = 0.9, metal = false) {
  _c.setHex(hex); // sRGB -> linear working space
  const o = s * 4;
  pal[o] = _c.r; pal[o + 1] = _c.g; pal[o + 2] = _c.b; pal[o + 3] = metal ? -Math.max(0.05, rough) : rough;
}
function shade(hex, k) {
  const r = Math.min(255, ((hex >> 16) & 255) * k), g = Math.min(255, ((hex >> 8) & 255) * k), b = Math.min(255, (hex & 255) * k);
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}

/**
 * A person of figure type `type`, deterministic from seed. Returns the description used by the crowd:
 * sex, scale s (stature / 1.75), width w, head scale hs, parts, hem length, palette (Float32Array NSLOT*4),
 * walking speed / stride, idle pose.
 */
export function makePerson(type, seed) {
  const r = rng(seed);
  const p = {
    type, cls: CLASS_OF[type], sex: 'm', s: 1, w: 1, hs: 1, limb: 1,
    hat: null, hair: null, beard: false, torso: 'torsoM', hem: 0, pelvis: true, skirt: false, cane: false, stole: false,
    speed: 1.2, stride: 1.42, pose: 'stand', hatTilt: 0, hatScale: 1, hatScaleY: 1,
    pal: new Float32Array(NSLOT * 4),
  };
  const pal = p.pal;
  const skin = pick(r, SKIN);
  let hair = pick(r, HAIR);
  const old = type !== 'boy' && type !== 'girl' && chance(r, 0.25);
  if (old) hair = pick(r, GREY_HAIR);
  let apron = false;
  const female = type === 'lady1' || type === 'woman2' || type === 'woman3' || type === 'girl';
  p.sex = female ? 'f' : 'm';
  // body
  if (female) { p.s = (1.53 + r() * 0.15) / 1.75; p.w = 0.95 + r() * 0.12; p.speed = 0.95 + r() * 0.2; p.stride = 1.1 + r() * 0.1; }
  else { p.s = (1.62 + r() * 0.2) / 1.75; p.w = 0.94 + r() * 0.14; p.speed = 1.1 + r() * 0.25; p.stride = 1.36 + r() * 0.14; }
  if (type === 'boy' || type === 'girl') { p.s = (1.0 + r() * 0.35) / 1.75; p.hs = 1.32 - (p.s * 1.75 - 1.0) * 0.4; p.w = 1.05; p.speed = 1.05; p.stride = 0.85; }
  if (old && !female) { p.w += 0.05; p.speed -= 0.15; }
  // base palette
  setSlot(pal, S.SKIN, skin, 0.55);
  setSlot(pal, S.HAIR, hair, 0.5);
  setSlot(pal, S.HAND, skin, 0.55);
  setSlot(pal, S.YOKE, skin, 0.55);
  setSlot(pal, S.SHIRT, 0xf2f0ea, 0.75);
  setSlot(pal, S.DARK, 0x15120f, 0.5);
  setSlot(pal, S.EYE, 0x24190f, 0.25);
  setSlot(pal, S.METAL, GOLD, 0.3, true);
  setSlot(pal, S.MOUSTACHE, skin, 0.55);
  setSlot(pal, S.SHOE, 0x121212, 0.35);
  setSlot(pal, S.ACCENT, 0x18181a, 0.6);
  setSlot(pal, S.STOLE, 0x5a4230, 1);
  setSlot(pal, S.BAND, 0x0d0d0d, 0.5);
  const cloth = (coat, lower = coat, vest = coat) => {
    setSlot(pal, S.COAT, coat, 0.95); setSlot(pal, S.SLEEVE, coat, 0.95); setSlot(pal, S.LAPEL, coat, 0.95);
    setSlot(pal, S.LOWER, lower, 0.95); setSlot(pal, S.LEG, lower, 0.95); setSlot(pal, S.LEG2, lower, 0.95);
    setSlot(pal, S.VEST, vest, 0.9); setSlot(pal, S.BUTTON, shade(coat, 0.6), 0.5); setSlot(pal, S.BUTTON2, coat, 0.95);
    setSlot(pal, S.CHAIN, vest, 0.9); setSlot(pal, S.LACE, coat, 0.95); setSlot(pal, S.APRON, lower, 0.95);
  };
  const facial = (pm, pb) => {
    if (chance(r, pm)) setSlot(pal, S.MOUSTACHE, hair, 0.6);
    if (chance(r, pb)) { p.beard = true; setSlot(pal, S.MOUSTACHE, hair, 0.7); }
  };
  switch (type) {
    case 'gent1': {
      const coat = pick(r, SUIT.slice(0, 5)), style = r();
      const grey = 0x56585c;
      cloth(coat, style > 0.6 ? grey : coat, chance(r, 0.4) ? pick(r, [0xb8a27a, 0x6a6a6a, 0x8a7a5a, 0xd8d0c0]) : coat);
      if (style < 0.35) p.hem = 0.42 + r() * 0.04;              // lounge suit
      else if (style < 0.65) { p.hem = 0.92 + r() * 0.05; setSlot(pal, S.LAPEL, 0x0d0d0f, 0.35); } // frock coat, silk facings
      else { p.hem = 1.08 + r() * 0.08; const oc = pick(r, [0x2a2b2f, 0x3a3027, 0x1e2433, 0x4a4844]); setSlot(pal, S.COAT, oc, 1); setSlot(pal, S.SLEEVE, oc, 1); setSlot(pal, S.LAPEL, oc, 1); setSlot(pal, S.BUTTON2, shade(oc, 0.5), 0.5); setSlot(pal, S.BUTTON, oc, 1); } // overcoat
      setSlot(pal, S.ACCENT, pick(r, [0x111111, 0x5a1a1e, 0x1e2a4a, 0x3a3a3a, 0x6a5a3a]), 0.5);
      if (chance(r, 0.55)) setSlot(pal, S.CHAIN, GOLD, 0.3, true);
      const h = r();
      if (h < 0.3) { p.hat = 'topHat'; setSlot(pal, S.HAT, 0x111113, 0.3); }
      else if (h < 0.7) { p.hat = 'bowler'; setSlot(pal, S.HAT, chance(r, 0.7) ? 0x121214 : 0x3a2a1c, 0.6); }
      else { p.hat = 'bowler'; p.hatScaleY = 1.12; setSlot(pal, S.HAT, pick(r, [0x5a5a58, 0x4a4034, 0x3a3a3e]), 0.85); setSlot(pal, S.BAND, 0x1a1a1a, 0.5); } // homburg
      if (chance(r, 0.55)) setSlot(pal, S.HAND, pick(r, [0xb08a5a, 0x8a8680, 0xe8e4da, 0x6a5038]), 0.7);
      p.cane = chance(r, 0.4);
      facial(0.65, old ? 0.45 : 0.15);
      p.pose = p.cane ? 'cane' : chance(r, 0.4) ? 'behind' : 'stand';
      p.speed -= 0.1;
      break;
    }
    case 'lady1': {
      const c = pick(r, LADY);
      cloth(c, chance(r, 0.75) ? c : pick(r, LADY));
      setSlot(pal, S.SHIRT, pick(r, BLOUSE), 0.85);
      if (chance(r, 0.3)) { const b = pick(r, BLOUSE); setSlot(pal, S.COAT, b, 0.85); setSlot(pal, S.SLEEVE, b, 0.85); setSlot(pal, S.LAPEL, b, 0.85); } // blouse, no jacket
      setSlot(pal, S.ACCENT, chance(r, 0.5) ? shade(c, 0.7) : 0x1a1a1a, 0.6);
      p.torso = 'torsoW'; p.pelvis = false; p.skirt = true; p.hair = 'hairUp';
      p.hat = chance(r, 0.9) ? 'ladyHat' : null; p.hatScale = 0.95 + r() * 0.18;
      setSlot(pal, S.HAT, pick(r, LADY_HAT), 0.85); setSlot(pal, S.BAND, pick(r, TRIM), 0.8);
      setSlot(pal, S.HAND, pick(r, [0xf0ece2, 0xe8dcc4, 0x1a1a1a, 0x9a9490, 0xd8c8a8]), 0.75);
      setSlot(pal, S.LEG, 0x1a1a1c, 0.7); setSlot(pal, S.LEG2, chance(r, 0.7) ? 0x121212 : 0x3a2618, 0.4); setSlot(pal, S.SHOE, chance(r, 0.7) ? 0x121212 : 0x3a2618, 0.4);
      if (chance(r, 0.35)) { p.stole = true; setSlot(pal, S.STOLE, pick(r, FUR), 1); }
      p.pose = chance(r, 0.55) ? 'front' : 'stand';
      break;
    }
    case 'man2': {
      const c = pick(r, SUIT);
      cloth(c, chance(r, 0.7) ? c : pick(r, SUIT));
      if (chance(r, 0.25)) { p.hem = 1.05; const oc = pick(r, [0x3a3a3c, 0x3e3226, 0x2a2e36]); setSlot(pal, S.COAT, oc, 1); setSlot(pal, S.SLEEVE, oc, 1); setSlot(pal, S.LAPEL, oc, 1); }
      else p.hem = 0.42;
      setSlot(pal, S.ACCENT, pick(r, [0x111111, 0x3a1a1a, 0x2a2a3a, 0x4a3a2a]), 0.6);
      const h = r();
      if (h < 0.5) { p.hat = 'bowler'; setSlot(pal, S.HAT, pick(r, [0x121214, 0x3a2a1c, 0x2a2a2a]), 0.7); }
      else if (h < 0.8) { p.hat = 'capFlat'; setSlot(pal, S.HAT, pick(r, [0x5a5040, 0x4a4a48, 0x3a3428, 0x6a5e4a]), 1); }
      else { p.hat = 'bowler'; p.hatScaleY = 1.12; setSlot(pal, S.HAT, pick(r, [0x5a5a58, 0x4a4034]), 0.85); }
      facial(0.55, old ? 0.35 : 0.12);
      p.pose = chance(r, 0.3) ? 'behind' : 'stand';
      break;
    }
    case 'woman2': {
      const c = pick(r, [0x24304e, 0x3e3a40, 0x4a3a2c, 0x2f4635, 0x5a2a2a, 0x5a5a5e, 0x3a2a3a]);
      cloth(c);
      setSlot(pal, S.SHIRT, pick(r, BLOUSE), 0.85);
      if (chance(r, 0.4)) { const b = pick(r, [0xe8e0d0, 0xc8c0b0, 0x8a8a9a]); setSlot(pal, S.COAT, b, 0.9); setSlot(pal, S.SLEEVE, b, 0.9); setSlot(pal, S.LAPEL, b, 0.9); }
      p.torso = 'torsoW'; p.pelvis = false; p.skirt = true; p.hair = 'hairUp';
      if (chance(r, 0.7)) { p.hat = 'ladyHat'; p.hatScale = 0.72 + r() * 0.12; }
      setSlot(pal, S.HAT, pick(r, [0x1a1a1c, 0x3a3028, 0x2a2e40, 0xc8b080]), 0.9); setSlot(pal, S.BAND, pick(r, [0x1a1a1a, 0x8e2230, 0xd8d0c0, 0x4a5a3a]), 0.8);
      setSlot(pal, S.HAND, chance(r, 0.5) ? pick(r, [0x1a1a1a, 0x6a5a4a, 0xe8e0d0]) : skin, 0.7);
      setSlot(pal, S.LEG, 0x1a1a1c, 0.7); setSlot(pal, S.LEG2, 0x141414, 0.5); setSlot(pal, S.SHOE, 0x141414, 0.5);
      if (chance(r, 0.35)) { p.stole = true; setSlot(pal, S.STOLE, pick(r, [0x8a8070, 0xd8d0c0, 0x4a3a30, 0x5a4a5a]), 1); }
      p.pose = chance(r, 0.5) ? 'front' : 'stand';
      break;
    }
    case 'man3': {
      const c = pick(r, WORK);
      cloth(c, pick(r, WORK));
      p.hem = 0.4 + r() * 0.05;
      setSlot(pal, S.SHIRT, pick(r, WORK_SHIRT), 0.95); setSlot(pal, S.VEST, chance(r, 0.6) ? pick(r, WORK) : pick(r, WORK_SHIRT), 0.95);
      setSlot(pal, S.ACCENT, chance(r, 0.5) ? pick(r, NECK) : pick(r, WORK_SHIRT), 0.9);
      setSlot(pal, S.SHOE, 0x1c1814, 0.7);
      if (chance(r, 0.85)) { p.hat = 'capFlat'; setSlot(pal, S.HAT, pick(r, [0x4a4236, 0x2e2c2a, 0x3a3a3c, 0x5a4a38]), 1); }
      facial(0.6, 0.28);
      p.pose = 'stand';
      p.w += 0.03;
      break;
    }
    case 'woman3': {
      const c = pick(r, [0x2a2624, 0x3a2e28, 0x2a2e3a, 0x3a3430, 0x4a3a30]);
      cloth(c);
      const bl = pick(r, [0x8a7a6a, 0xb8b0a0, 0x5a4a3a, 0x6a7080, 0x9a8a7a]);
      setSlot(pal, S.COAT, bl, 0.95); setSlot(pal, S.SLEEVE, bl, 0.95); setSlot(pal, S.LAPEL, bl, 0.95); setSlot(pal, S.SHIRT, shade(bl, 1.15), 0.95);
      p.torso = 'torsoW'; p.pelvis = false; p.skirt = true; p.hair = 'hairUp';
      if (chance(r, 0.6)) { p.hat = 'scarf'; p.scarf = true; setSlot(pal, S.HAT, pick(r, SCARF), 1); }
      if (chance(r, 0.65)) apron = true, setSlot(pal, S.APRON, pick(r, [0xd8d2c4, 0x8a92a0, 0xc8c0a8, 0xe6e2d8]), 1);
      setSlot(pal, S.LEG, 0x1a1a1a, 0.8); setSlot(pal, S.LEG2, 0x1c1814, 0.7); setSlot(pal, S.SHOE, 0x1c1814, 0.7);
      if (chance(r, 0.5)) { p.stole = true; setSlot(pal, S.STOLE, pick(r, [0x5a4a3a, 0x3a3a44, 0x6a5a48, 0x4a2a2a]), 1); }
      p.pose = chance(r, 0.4) ? 'front' : 'stand';
      break;
    }
    case 'officer': {
      cloth(NAVY);
      setSlot(pal, S.BUTTON2, GOLD, 0.3, true); setSlot(pal, S.BUTTON, NAVY, 0.95); setSlot(pal, S.LACE, GOLD, 0.35, true);
      setSlot(pal, S.ACCENT, 0x101010, 0.5);
      p.hem = 0.5; p.hat = 'capPeaked';
      setSlot(pal, S.HAT, NAVY, 0.9); setSlot(pal, S.BAND, chance(r, 0.3) ? 0xeeeee8 : NAVY, 0.8);
      facial(0.55, old ? 0.5 : 0.2);
      p.pose = chance(r, 0.7) ? 'behind' : 'stand'; p.speed += 0.05;
      break;
    }
    case 'steward': {
      const white = 0xecebe4;
      cloth(white, 0x15151a, white);
      setSlot(pal, S.LEG, 0x15151a, 0.9); setSlot(pal, S.LEG2, 0x15151a, 0.9);
      setSlot(pal, S.BUTTON2, chance(r, 0.6) ? GOLD : white, 0.3, true); setSlot(pal, S.BUTTON, 0xd8d6cc, 0.5);
      setSlot(pal, S.ACCENT, 0x101010, 0.5);
      p.hem = 0.3;
      hair = pick(r, HAIR.slice(0, 4)); setSlot(pal, S.HAIR, hair, 0.35);
      facial(0.4, 0.03);
      p.pose = chance(r, 0.5) ? 'front' : 'behind'; p.speed += 0.15;
      break;
    }
    case 'seaman': {
      const j = pick(r, [NAVY, 0x1c2232, 0x23283a]);
      cloth(j, NAVY);
      setSlot(pal, S.YOKE, j, 0.95); setSlot(pal, S.ACCENT, j, 0.95);
      p.torso = 'torsoWork';
      if (chance(r, 0.7)) { p.hat = 'capPeaked'; setSlot(pal, S.HAT, NAVY, 0.9); setSlot(pal, S.BAND, NAVY, 0.9); setSlot(pal, S.DARK, 0x101010, 0.3); }
      setSlot(pal, S.SHOE, 0x141210, 0.6);
      facial(0.5, 0.35);
      p.pose = 'stand'; p.w += 0.04; p.speed += 0.05;
      break;
    }
    case 'stoker': {
      const soot = shade(skin, 0.72);
      const singlet = pick(r, [0x8a8478, 0x6a665e, 0x9a958a, 0x56524c]);
      const tr = pick(r, [0x2a2826, 0x3a3630, 0x23252a]);
      cloth(singlet, tr);
      setSlot(pal, S.SKIN, soot, 0.45); setSlot(pal, S.YOKE, soot, 0.45); setSlot(pal, S.SLEEVE, soot, 0.45); setSlot(pal, S.HAND, shade(soot, 0.85), 0.45);
      setSlot(pal, S.MOUSTACHE, soot, 0.45); setSlot(pal, S.SHIRT, soot, 0.45); setSlot(pal, S.LACE, soot, 0.45);
      setSlot(pal, S.ACCENT, pick(r, NECK), 0.95);
      setSlot(pal, S.SHOE, 0x161412, 0.8); setSlot(pal, S.HAIR, pick(r, HAIR.slice(0, 3)), 0.6);
      p.torso = 'torsoWork';
      if (chance(r, 0.3)) { p.hat = 'capFlat'; setSlot(pal, S.HAT, 0x2a2826, 1); }
      facial(0.5, 0.25);
      p.pose = 'stand'; p.w += 0.07; p.speed += 0.05;
      break;
    }
    case 'boy': {
      const navy = chance(r, 0.5);
      cloth(navy ? NAVY : 0xe8e6e0, NAVY);
      setSlot(pal, S.YOKE, navy ? 0xe8e6e0 : NAVY, 0.9); setSlot(pal, S.ACCENT, navy ? 0xe8e6e0 : NAVY, 0.9);
      setSlot(pal, S.LEG, 0x1a1a1c, 0.8); setSlot(pal, S.LEG2, 0x1a1a1c, 0.8);
      p.torso = 'torsoWork'; p.hem = 0;
      if (chance(r, 0.5)) { p.hat = 'capFlat'; setSlot(pal, S.HAT, pick(r, [0x3a3a3c, 0x5a5040, NAVY]), 1); }
      p.pose = 'stand';
      break;
    }
    case 'girl': {
      const c = pick(r, [0xe8dcd4, 0xc8d0e0, 0xe0d0e0, 0xd8e0d0, 0x8a2a30, 0x24304e]);
      cloth(c);
      setSlot(pal, S.SHIRT, 0xf0ece4, 0.85);
      p.torso = 'torsoW'; p.pelvis = false; p.skirt = 'short'; p.hair = 'hairUp';
      setSlot(pal, S.LEG, chance(r, 0.5) ? 0xe8e4dc : 0x1a1a1a, 0.8); setSlot(pal, S.LEG2, 0x141414, 0.4);
      if (chance(r, 0.4)) { p.hat = 'ladyHat'; p.hatScale = 0.7; setSlot(pal, S.HAT, pick(r, [0xe0d6bc, 0xc9b27e, 0xf0ece2]), 0.9); setSlot(pal, S.BAND, pick(r, TRIM), 0.8); }
      p.pose = 'stand';
      break;
    }
    default: cloth(0x444444);
  }
  if (p.scarf) p.hair = null;
  if (female) {
    // skirts use the VEST slot (the bodice has none); apron defaults to the skirt; a girl's LOWER = stockings (legs)
    pal.set(pal.subarray(S.LOWER * 4, S.LOWER * 4 + 4), S.VEST * 4);
    if (!apron) pal.set(pal.subarray(S.VEST * 4, S.VEST * 4 + 4), S.APRON * 4);
    if (type === 'girl') { pal.set(pal.subarray(S.LEG * 4, S.LEG * 4 + 4), S.LOWER * 4); p.pelvis = true; }
  }
  return p;
}

/** Captain Smith on his bridge: white full beard and hair. */
export function makeCaptain(p) {
  p.beard = true; p.pose = 'behind'; p.w = Math.max(p.w, 1.06);
  setSlot(p.pal, S.HAIR, 0xdcd8d0, 0.6); setSlot(p.pal, S.MOUSTACHE, 0xe4e0d8, 0.7);
  setSlot(p.pal, S.BAND, 0xeeeee8, 0.8);
  return p;
}

export const MI_KEYS =['head', 'hair', 'beard', 'hat', 'torso', 'hem', 'pelvis', 'skirtU', 'skirtL', 'uArm', 'fArm', 'thigh', 'shin', 'foot', 'cane', 'stole'];

/** Part (mesh) name per role for person p at detail level `fine`, via the fallbacks of the phone tier. */
export function partNames(p, fine, partFor) {
  const f = (n) => (n ? partFor(n, fine) : null);
  return {
    head: 'head', hair: f(p.hair) || (p.scarf && !f(p.hat) ? f('hairUp') : null), beard: p.beard ? f('beard') : null, hat: f(p.hat), torso: p.torso,
    hem: p.hem > 0 ? 'hem' : null, pelvis: p.pelvis ? 'pelvis' : null, skirtU: p.skirt ? 'skirtU' : null,
    skirtL: p.skirt && p.skirt !== 'short' ? f('skirtL') : null, uArm: 'uArm', fArm: 'fArm', thigh: p.pelvis ? 'thigh' : null,
    shin: 'shin', foot: 'foot', cane: p.cane ? f('cane') : null, stole: p.stole ? f('stole') : null,
  };
}
