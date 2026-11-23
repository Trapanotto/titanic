// Interior kit – low level helpers: direct-to-buffer geometry batching (one mesh per zone + material),
// extra shared materials, deck outline helpers, rectangle utilities.
import * as THREE from 'three';
import { mats, canvasTexture } from '../core/materials.js';
import {
  DECK_Y, DECK_SEGMENTS, ZONE_LEN, hullHalfWidth, A_HOUSE, BOAT_HOUSES, CASINGS,
} from '../core/constants.js';
import { TIER } from '../core/tier.js';

/** Fine-detail level used by the kit's architecture and clutter (TIER.fine 0..3, read at build time). */
export function kitFine() { return TIER.fine; }

/** Distance between the outer hull surface and the inner face of the hull lining (decks C and below). */
export const LINING_INSET = 0.15;
export const HULL_DECKS = ['tank', 'orlop', 'G', 'F', 'E', 'D', 'C'];

/** Half width of the built floor/ceiling of a deck at station x (0 where the deck has no interior shape). */
export function shellHalfWidth(deck, x) {
  if (deck === 'A') return x >= A_HOUSE.x0 && x <= A_HOUSE.x1 ? A_HOUSE.hw : 0;
  if (deck === 'boat') { const h = BOAT_HOUSES.find((b) => x >= b.x0 && x <= b.x1); return h ? h.hw : 0; }
  if (deck === 'B') return hullHalfWidth(x, DECK_Y.B);
  return Math.max(0, hullHalfWidth(x, DECK_Y[deck]) - LINING_INSET);
}
/** Half width usable for rooms/furniture at station x: the inner face of the side wall / hull lining at floor level. */
export function deckHalfWidth(deck, x) {
  const hw = shellHalfWidth(deck, x);
  if (deck === 'A' || deck === 'boat') return Math.max(0, hw - 0.15);
  if (deck === 'B') return Math.max(0, hw - 0.2);
  return hw;
}
/** Smallest deckHalfWidth over [x0, x1]. */
export function minHalfWidth(deck, x0, x1) {
  let m = Infinity;
  const n = Math.max(1, Math.ceil((x1 - x0) / 0.5));
  for (let i = 0; i <= n; i++) m = Math.min(m, deckHalfWidth(deck, x0 + ((x1 - x0) * i) / n));
  return m;
}
/** x-ranges [x0, x1] in which the deck has an interior (boat deck: the deck houses). */
export function deckRanges(deck) {
  if (deck === 'boat') return BOAT_HOUSES.map((h) => [h.x0, h.x1]);
  return DECK_SEGMENTS[deck].map((s) => [s[0], s[1]]);
}
/** Casings that exist on this deck: [{id,x0,x1,z0,z1}]. */
export function casingsOn(deck) {
  if (!['F', 'E', 'D', 'C', 'B', 'A', 'boat'].includes(deck)) return [];
  return CASINGS.filter((c) => deck !== 'boat' || BOAT_HOUSES.some((h) => c.x0 >= h.x0 && c.x1 <= h.x1))
    .map((c) => ({ id: c.id, x0: c.x0, x1: c.x1, z0: -c.hw, z1: c.hw }));
}

// ---------------------------------------------------------------- rectangles

export const overlap = (a, b, eps = 1e-4) => a.x0 < b.x1 - eps && a.x1 > b.x0 + eps && a.z0 < b.z1 - eps && a.z1 > b.z0 + eps;

/** Subtract axis-aligned holes from a rectangle {x0,x1,z0,z1}; returns a list of rectangles (x-strip decomposition). */
export function rectMinus(r, holes) {
  const hs = holes.filter((h) => overlap(r, h));
  if (!hs.length) return [r];
  const xs = [...new Set([r.x0, r.x1, ...hs.flatMap((h) => [h.x0, h.x1])].filter((x) => x >= r.x0 && x <= r.x1))].sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < xs.length - 1; i++) {
    const xa = xs[i], xb = xs[i + 1];
    if (xb - xa < 1e-4) continue;
    let zs = [[r.z0, r.z1]];
    for (const h of hs) {
      if (!(h.x0 < xb - 1e-4 && h.x1 > xa + 1e-4)) continue;
      zs = zs.flatMap(([a, b]) => {
        const res = [];
        if (h.z0 > a + 1e-4) res.push([a, Math.min(b, h.z0)]);
        if (h.z1 < b - 1e-4) res.push([Math.max(a, h.z1), b]);
        if (h.z0 >= b || h.z1 <= a) return [[a, b]];
        return res.filter(([p, q]) => q - p > 1e-4);
      });
    }
    for (const [a, b] of zs) out.push({ x0: xa, x1: xb, z0: a, z1: b });
  }
  return out;
}

/** Subtract intervals [[a,b],...] from [p,q] → list of intervals. */
export function intervalMinus(p, q, cuts) {
  let res = [[p, q]];
  for (const [a, b] of cuts) {
    res = res.flatMap(([s, e]) => {
      if (b <= s || a >= e) return [[s, e]];
      const o = [];
      if (a > s) o.push([s, a]);
      if (b < e) o.push([b, e]);
      return o;
    });
  }
  return res.filter(([s, e]) => e - s > 1e-4);
}

// ---------------------------------------------------------------- extra materials (created once)

function std(o) { return new THREE.MeshStandardMaterial(o); }
function unitTex(size, draw, seed) { const t = canvasTexture(size, 1, draw, seed); t.repeat.set(1, 1); return t; }

export const PLATE_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const T = {};
T.plate = unitTex(512, (ctx, s) => {
  const q = s / 6;
  ctx.fillStyle = '#b8923f'; ctx.fillRect(0, 0, s, s);
  ctx.fillStyle = '#1a1208'; ctx.font = `bold ${Math.round(q * 0.82)}px Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let i = 0; i < 36; i++) ctx.fillText(PLATE_CHARS[i], (i % 6) * q + q / 2, Math.floor(i / 6) * q + q / 2 + q * 0.04);
}, 51);
T.iron = unitTex(256, (ctx, s) => {
  ctx.clearRect(0, 0, s, s);
  ctx.lineCap = 'round';
  const scroll = (cx, cy, r, a0, a1, col, w) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1); ctx.stroke(); };
  ctx.fillStyle = '#19191b'; ctx.fillRect(0, 0, 10, s); ctx.fillRect(s - 10, 0, 10, s); ctx.fillRect(0, 0, s, 9); ctx.fillRect(0, s - 9, s, 9);
  for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const cx = s / 2 + sx * s * 0.2, cy = s / 2 + sy * s * 0.22;
    scroll(cx, cy, s * 0.17, 0, 6.3, '#19191b', 8);
    scroll(cx + sx * 6, cy + sy * 6, s * 0.08, 0, 6.3, '#19191b', 7);
    scroll(cx, cy, s * 0.035, 0, 6.3, '#d9b253', 9);
  }
  ctx.strokeStyle = '#19191b'; ctx.lineWidth = 8; ctx.beginPath(); ctx.ellipse(s / 2, s / 2, s * 0.11, s * 0.3, 0, 0, 6.3); ctx.stroke();
  ctx.fillStyle = '#d9b253'; ctx.beginPath(); ctx.ellipse(s / 2, s / 2, s * 0.05, s * 0.12, 0, 0, 6.3); ctx.fill();
  for (const y of [0.1, 0.9]) { ctx.beginPath(); ctx.arc(s / 2, s * y, s * 0.035, 0, 6.3); ctx.fill(); }
}, 53);
T.blanket = canvasTexture(128, 1, (ctx, s) => {
  ctx.fillStyle = '#a3302b'; ctx.fillRect(0, 0, s, s);
  ctx.fillStyle = '#efe9da'; ctx.fillRect(0, s * 0.12, s, s * 0.07); ctx.fillRect(0, s * 0.81, s, s * 0.07);
  ctx.beginPath(); // simplified White Star pennant: white swallow-tail with star
  const cx = s / 2, cy = s / 2, r = s * 0.13;
  for (let i = 0; i < 10; i++) { const a = (i * Math.PI) / 5 - Math.PI / 2, q = i % 2 ? r * 0.45 : r; ctx.lineTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q); }
  ctx.closePath(); ctx.fill();
}, 55);
T.books = canvasTexture(256, 1, (ctx, s, r) => {
  ctx.fillStyle = '#2a170c'; ctx.fillRect(0, 0, s, s);
  const rows = 3, h = s / rows;
  for (let j = 0; j < rows; j++) {
    for (let x = 2; x < s - 4;) {
      const w = 7 + r() * 12, hh = h * (0.62 + r() * 0.25);
      ctx.fillStyle = ['#5b1d1a', '#1f3b2a', '#27314f', '#6a4a22', '#3a2a1c', '#7a6a48'][Math.floor(r() * 6)];
      ctx.fillRect(x, (j + 1) * h - 6 - hh, w - 1, hh);
      ctx.fillStyle = 'rgba(220,180,90,0.7)'; ctx.fillRect(x + 1, (j + 1) * h - 6 - hh * 0.8, w - 3, 2);
      x += w;
    }
    ctx.fillStyle = '#4a2c16'; ctx.fillRect(0, (j + 1) * h - 6, s, 6);
  }
}, 57);
T.crockery = canvasTexture(256, 1, (ctx, s) => {
  ctx.fillStyle = '#3a2716'; ctx.fillRect(0, 0, s, s);
  const rows = 3, h = s / rows;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < 6; i++) {
      const cx = (i + 0.5) * (s / 6), by = (j + 1) * h - 8;
      ctx.fillStyle = '#f3f1ea';
      if (j === 1) { for (let k = 0; k < 6; k++) ctx.fillRect(cx - 16, by - 5 - k * 6, 32, 4); } else { ctx.beginPath(); ctx.arc(cx, by - 20, 18, 0, 6.3); ctx.fill(); ctx.strokeStyle = '#b89a52'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, by - 20, 12, 0, 6.3); ctx.stroke(); }
    }
    ctx.fillStyle = '#5a3c20'; ctx.fillRect(0, (j + 1) * h - 8, s, 8);
  }
}, 59);
T.bottles = canvasTexture(256, 1, (ctx, s, r) => {
  ctx.fillStyle = '#2b1a10'; ctx.fillRect(0, 0, s, s);
  const rows = 3, h = s / rows;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < 10; i++) {
      const cx = (i + 0.5) * (s / 10), by = (j + 1) * h - 6;
      ctx.fillStyle = ['#23402a', '#5a3413', '#7a1d1d', '#c9c2a0', '#1c2c20'][Math.floor(r() * 5)];
      ctx.fillRect(cx - 7, by - 44, 14, 44); ctx.fillRect(cx - 3, by - 62, 6, 20);
      ctx.fillStyle = '#e9e2c8'; ctx.fillRect(cx - 6, by - 30, 12, 14);
    }
    ctx.fillStyle = '#5a3c20'; ctx.fillRect(0, (j + 1) * h - 6, s, 6);
  }
}, 61);
T.clock = unitTex(128, (ctx, s) => {
  ctx.fillStyle = '#f4efe0'; ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(s / 2, s / 2, s * 0.46, 0, 6.3); ctx.stroke();
  for (let i = 0; i < 12; i++) { const a = (i * Math.PI) / 6; ctx.lineWidth = i % 3 ? 2 : 5; ctx.beginPath(); ctx.moveTo(s / 2 + Math.cos(a) * s * 0.36, s / 2 + Math.sin(a) * s * 0.36); ctx.lineTo(s / 2 + Math.cos(a) * s * 0.43, s / 2 + Math.sin(a) * s * 0.43); ctx.stroke(); }
  ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(s / 2, s / 2); ctx.lineTo(s * 0.34, s * 0.3); ctx.stroke();
  ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(s / 2, s / 2); ctx.lineTo(s * 0.72, s * 0.22); ctx.stroke();
}, 63);
T.gauge = unitTex(128, (ctx, s) => {
  ctx.fillStyle = '#b08d3c'; ctx.fillRect(0, 0, s, s);
  ctx.fillStyle = '#f2eedf'; ctx.beginPath(); ctx.arc(s / 2, s / 2, s * 0.42, 0, 6.3); ctx.fill();
  ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
  for (let i = 0; i <= 10; i++) { const a = Math.PI * 0.75 + (i * Math.PI * 1.5) / 10; ctx.beginPath(); ctx.moveTo(s / 2 + Math.cos(a) * s * 0.32, s / 2 + Math.sin(a) * s * 0.32); ctx.lineTo(s / 2 + Math.cos(a) * s * 0.4, s / 2 + Math.sin(a) * s * 0.4); ctx.stroke(); }
  ctx.strokeStyle = '#a01010'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(s / 2, s / 2); ctx.lineTo(s * 0.7, s * 0.3); ctx.stroke();
}, 65);
T.switchboard = canvasTexture(256, 1, (ctx, s) => {
  ctx.fillStyle = '#2a2c2e'; ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 2; ctx.strokeRect(3, 3, s - 6, s - 6);
  for (let i = 0; i < 3; i++) {
    const cx = (i + 0.5) * (s / 3);
    ctx.fillStyle = '#f2eedf'; ctx.beginPath(); ctx.arc(cx, s * 0.22, s * 0.11, 0, 6.3); ctx.fill();
    ctx.strokeStyle = '#b08d3c'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, s * 0.22, s * 0.11, 0, 6.3); ctx.stroke();
    ctx.fillStyle = '#b46a3c'; for (let j = 0; j < 3; j++) { ctx.fillRect(cx - 14, s * (0.45 + j * 0.17), 8, s * 0.11); ctx.fillRect(cx + 6, s * (0.45 + j * 0.17), 8, s * 0.11); }
    ctx.fillStyle = '#111'; for (let j = 0; j < 3; j++) ctx.fillRect(cx - 4, s * (0.47 + j * 0.17), 8, s * 0.05);
  }
}, 67);
T.honour = unitTex(512, (ctx, s) => {
  // stylised "Honour and Glory crowning Time": carved oak relief, two winged figures flanking the clock
  ctx.fillStyle = '#8a5a2c'; ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = 'rgba(40,18,4,0.8)'; ctx.lineWidth = 8; ctx.strokeRect(10, 10, s - 20, s - 20);
  ctx.strokeStyle = 'rgba(255,215,160,0.3)'; ctx.lineWidth = 3; ctx.strokeRect(22, 22, s - 44, s - 44);
  ctx.beginPath(); ctx.moveTo(40, s - 40); ctx.quadraticCurveTo(s / 2, -s * 0.35, s - 40, s - 40); ctx.strokeStyle = 'rgba(40,18,4,0.7)'; ctx.lineWidth = 7; ctx.stroke();
  const fig = (sx) => {
    const cx = s / 2 + sx * s * 0.24;
    ctx.fillStyle = '#a8763c'; ctx.strokeStyle = 'rgba(40,18,4,0.75)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(cx, s * 0.33, s * 0.045, 0, 6.3); ctx.fill(); ctx.stroke(); // head
    ctx.beginPath(); ctx.moveTo(cx - s * 0.05, s * 0.39); ctx.lineTo(cx + s * 0.05, s * 0.39); ctx.lineTo(cx + s * 0.085, s * 0.86); ctx.lineTo(cx - s * 0.085, s * 0.86); ctx.closePath(); ctx.fill(); ctx.stroke(); // robe
    ctx.beginPath(); ctx.moveTo(cx + sx * s * 0.04, s * 0.42); ctx.quadraticCurveTo(cx + sx * s * 0.2, s * 0.25, cx + sx * s * 0.17, s * 0.7); ctx.quadraticCurveTo(cx + sx * s * 0.1, s * 0.6, cx + sx * s * 0.05, s * 0.6); ctx.closePath(); ctx.fill(); ctx.stroke(); // wing
    ctx.beginPath(); ctx.moveTo(cx - sx * s * 0.04, s * 0.43); ctx.lineTo(cx - sx * s * 0.17, s * 0.3); ctx.lineWidth = 9; ctx.strokeStyle = '#a8763c'; ctx.stroke(); // arm towards the clock
  };
  fig(-1); fig(1);
  ctx.fillStyle = '#6e4420'; ctx.beginPath(); ctx.arc(s / 2, s * 0.5, s * 0.15, 0, 6.3); ctx.fill();
  ctx.strokeStyle = '#d9b253'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(s / 2, s * 0.5, s * 0.15, 0, 6.3); ctx.stroke();
  ctx.fillStyle = '#a8763c'; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(s * (0.32 + i * 0.06), s * 0.9, s * 0.03, 0, 6.3); ctx.fill(); } // laurel
}, 69);
T.damask = canvasTexture(128, 0.6, (ctx, s) => {
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 3;
  for (const [cx, cy] of [[s / 2, s / 2], [0, 0], [s, 0], [0, s], [s, s]]) {
    ctx.beginPath(); ctx.ellipse(cx, cy, s * 0.14, s * 0.24, 0, 0, 6.3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.3); ctx.lineTo(cx, cy + s * 0.3); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx - s * 0.16, cy, s * 0.08, 0, 6.3); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + s * 0.16, cy, s * 0.08, 0, 6.3); ctx.stroke();
  }
}, 71);
T.tileBlue = canvasTexture(128, 0.6, (ctx, s) => {
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { ctx.fillStyle = (i + j) % 2 ? '#2f6f8f' : '#e9efe8'; ctx.fillRect((i * s) / 4, (j * s) / 4, s / 4, s / 4); }
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'; for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo((i * s) / 4, 0); ctx.lineTo((i * s) / 4, s); ctx.moveTo(0, (i * s) / 4); ctx.lineTo(s, (i * s) / 4); ctx.stroke(); }
}, 73);
T.cane = canvasTexture(64, 0.12, (ctx, s) => {
  ctx.fillStyle = '#cdb27c'; ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = 'rgba(70,45,15,0.6)'; ctx.lineWidth = 3;
  for (let i = -s; i < s * 2; i += 16) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + s, s); ctx.moveTo(i + s, 0); ctx.lineTo(i, s); ctx.stroke(); }
}, 75);
T.trellis = canvasTexture(128, 0.5, (ctx, s, r) => {
  ctx.clearRect(0, 0, s, s);
  ctx.strokeStyle = '#e9e4d4'; ctx.lineWidth = 7;
  for (let i = -s; i < s * 2; i += s / 2) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + s, s); ctx.moveTo(i + s, 0); ctx.lineTo(i, s); ctx.stroke(); }
  for (let i = 0; i < 26; i++) { ctx.fillStyle = r() < 0.5 ? '#2f6a2c' : '#3f7d35'; ctx.beginPath(); ctx.ellipse(r() * s, r() * s, 7 + r() * 5, 4 + r() * 3, r() * 3, 0, 6.3); ctx.fill(); }
}, 77);

/**
 * 8 × 8 colour atlas (one material for many small coloured items: book spines, labels, bottles, flowers, clothes …).
 * Cells 0–15 are book cloths with gilt bands at both ends (use atlasBox), the others are plain colours (use atlasCell).
 */
export const ATLAS = [
  0x5b1d1a, 0x1f3b2a, 0x27314f, 0x6a4a22, 0x1c1612, 0x6e2a2a, 0x4a4a22, 0x3a2a1c,
  0x8a2a22, 0x2c4a7a, 0x2e5a3a, 0xb89a62, 0x5a5a5e, 0x4a2a4a, 0x22504e, 0xd8cfb0,
  0xf2efe2, 0xe0d2a8, 0xb02a22, 0x2a4a8a, 0x2a6a3a, 0xd8b040, 0x141414, 0xd9b253,
  0x1e4a26, 0x7a4210, 0xb8c8c4, 0x5a1020, 0x3a3a3a, 0xece8dc, 0x2a5a8a, 0xc87878,
  0xf6f4ee, 0x2a3a8a, 0xc9a24a, 0x6a3a1a, 0xefe6cf, 0x141210, 0x2d5a34, 0xc89878,
  0xf4f2ea, 0xd9d4c4, 0x8a2020, 0x2a3a6a, 0x8a7a50, 0xd8c080, 0x1a1a1c, 0x4a4c50,
  0x2a5a24, 0x4a8a3a, 0xb02030, 0xe090a0, 0xe0c040, 0xf0f0e8, 0x3a2a1a, 0xa07030,
  0xa08040, 0xb46a3c, 0x2a2a2c, 0x6b3d24, 0xe8e8e8, 0x303438, 0xa01818, 0xf0efe8,
];
/** Named atlas cells. */
export const AT = {
  bookA: 0, bookB: 8, label: 16, paper: 17, labelRed: 18, labelBlue: 19, labelGreen: 20, yellow: 21, black: 22, gilt: 23,
  bottleGreen: 24, amber: 25, clearGlass: 26, claret: 27, smoke: 28, milk: 29, blueGlass: 30, rose: 31,
  china: 32, cobalt: 33, brassRim: 34, tea: 35, ivory: 36, ebony: 37, felt: 38, skin: 39,
  towel: 40, greyCloth: 41, red: 42, navy: 43, khaki: 44, straw: 45, hat: 46, coat: 47,
  leafDark: 48, leafLight: 49, flowerRed: 50, pink: 51, flowerYellow: 52, flowerWhite: 53, soil: 54, ochre: 55,
  brassDull: 56, copper: 57, iron: 58, rust: 59, chalk: 60, slate: 61, redPaint: 62, whitePaint: 63,
};
T.atlas = unitTex(256, (ctx, s) => {
  const q = s / 8;
  for (let i = 0; i < 64; i++) {
    const x = (i % 8) * q, y = Math.floor(i / 8) * q;
    ctx.fillStyle = '#' + ATLAS[i].toString(16).padStart(6, '0'); ctx.fillRect(x, y, q, q);
    if (i < 16) { ctx.fillStyle = '#d9b253'; ctx.fillRect(x, y + q * 0.1, q, q * 0.05); ctx.fillRect(x, y + q * 0.18, q, q * 0.03); ctx.fillRect(x, y + q * 0.82, q, q * 0.05); ctx.fillRect(x + q * 0.3, y + q * 0.35, q * 0.4, q * 0.12); }
  }
}, 79);
T.stencil = canvasTexture(256, 1, (ctx, s, r) => {
  ctx.fillStyle = '#c9a874'; ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 300; i++) { ctx.strokeStyle = `rgba(90,60,25,${0.05 + r() * 0.1})`; ctx.beginPath(); const y = r() * s; ctx.moveTo(0, y); ctx.lineTo(s, y + r() * 4 - 2); ctx.stroke(); }
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; for (let i = 1; i < 4; i++) ctx.fillRect(0, (i * s) / 4 - 1, s, 2);
  ctx.fillStyle = 'rgba(20,20,20,0.85)'; ctx.font = 'bold 30px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('W.S.L.', s / 2, s * 0.42); ctx.font = 'bold 20px sans-serif'; ctx.fillText('R.M.S. TITANIC', s / 2, s * 0.62); ctx.fillText('SOUTHAMPTON', s / 2, s * 0.78);
}, 81);
T.notice = unitTex(128, (ctx, s) => {
  ctx.fillStyle = '#efe8d2'; ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 3; ctx.strokeRect(5, 5, s - 10, s - 10);
  ctx.fillStyle = '#1a1a1a'; ctx.font = 'bold 14px serif'; ctx.textAlign = 'center'; ctx.fillText('WHITE STAR LINE', s / 2, 26);
  ctx.fillStyle = 'rgba(30,30,30,0.7)'; for (let i = 0; i < 7; i++) ctx.fillRect(16, 40 + i * 11, s - 32 - (i % 3) * 14, 3);
}, 83);
T.chart = canvasTexture(256, 1.2, (ctx, s, r) => {
  ctx.fillStyle = '#ece2c4'; ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = 'rgba(60,80,120,0.35)'; ctx.lineWidth = 1; for (let i = 0; i < s; i += 32) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, s); ctx.moveTo(0, i); ctx.lineTo(s, i); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(120,90,50,0.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, s * 0.3);
  for (let x = 0; x <= s; x += 16) ctx.lineTo(x, s * 0.3 + Math.sin(x * 0.05) * 20 + r() * 8); ctx.stroke();
  ctx.strokeStyle = 'rgba(150,30,30,0.7)'; ctx.beginPath(); ctx.moveTo(s * 0.1, s * 0.8); ctx.lineTo(s * 0.9, s * 0.45); ctx.stroke();
}, 85);
T.keys = unitTex(256, (ctx, s) => {
  ctx.fillStyle = '#efe6cf'; ctx.fillRect(0, 0, s, s);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; for (let i = 0; i <= 52; i++) ctx.fillRect((i * s) / 52, 0, 1, s);
  ctx.fillStyle = '#141210';
  for (let o = 0; o < 8; o++) for (const k of [1, 2, 4, 5, 6]) { const x = ((o * 7 + k) * s) / 52 - s / 52 / 3; if (x < s - 4) ctx.fillRect(x, 0, (s / 52) * 0.62, s * 0.62); }
}, 87);
T.paintings = unitTex(256, (ctx, s, r) => { // 2 × 2 small oil paintings (seascape, landscape, portrait, still life)
  const q = s / 2;
  const sky = (x, y, a, b) => { const g = ctx.createLinearGradient(0, y, 0, y + q); g.addColorStop(0, a); g.addColorStop(1, b); ctx.fillStyle = g; ctx.fillRect(x, y, q, q); };
  sky(0, 0, '#9fb6c8', '#e8d8b0'); ctx.fillStyle = '#2f4f63'; ctx.fillRect(0, q * 0.62, q, q * 0.38);
  ctx.fillStyle = '#1b1b1b'; ctx.fillRect(q * 0.3, q * 0.5, q * 0.42, q * 0.1); ctx.fillStyle = '#d9a05b'; for (let i = 0; i < 4; i++) ctx.fillRect(q * (0.38 + i * 0.07), q * 0.36, q * 0.04, q * 0.14);
  sky(q, 0, '#a9c4d6', '#f0e6c8'); ctx.fillStyle = '#4f6b3a'; ctx.beginPath(); ctx.moveTo(q, q * 0.7); ctx.quadraticCurveTo(q * 1.4, q * 0.45, q * 2, q * 0.65); ctx.lineTo(q * 2, q); ctx.lineTo(q, q); ctx.fill();
  ctx.fillStyle = '#2d4a26'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(q * (1.15 + r() * 0.7), q * (0.62 + r() * 0.1), q * (0.04 + r() * 0.05), 0, 7); ctx.fill(); }
  ctx.fillStyle = '#3a2a22'; ctx.fillRect(0, q, q, q); ctx.fillStyle = '#c89878'; ctx.beginPath(); ctx.ellipse(q * 0.5, q * 1.38, q * 0.13, q * 0.17, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#1a1a22'; ctx.beginPath(); ctx.moveTo(q * 0.2, q * 2); ctx.quadraticCurveTo(q * 0.5, q * 1.45, q * 0.8, q * 2); ctx.fill();
  ctx.fillStyle = '#2a2018'; ctx.fillRect(q, q, q, q); ctx.fillStyle = '#c9a24a'; ctx.beginPath(); ctx.ellipse(q * 1.5, q * 1.75, q * 0.25, q * 0.08, 0, 0, 7); ctx.fill();
  for (const [c, x, y] of [['#a8202a', 1.4, 1.6], ['#e0c040', 1.55, 1.58], ['#7a8a3a', 1.48, 1.52]]) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(q * x, q * y, q * 0.07, 0, 7); ctx.fill(); }
}, 91);
T.signs = unitTex(256, (ctx, s) => { // four enamel signs (rows): white letters on blue
  const h = s / 4, txt = ['↑ BOAT DECK', 'DINING SALOON →', '← BATHS', 'EMERGENCY EXIT'];
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = '#1d3c78'; ctx.fillRect(0, i * h, s, h); ctx.strokeStyle = '#f0f0f0'; ctx.lineWidth = 3; ctx.strokeRect(4, i * h + 4, s - 8, h - 8);
    ctx.fillStyle = '#f4f4f0'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt[i], s / 2, i * h + h / 2 + 1);
  }
}, 93);
T.louvre = canvasTexture(128, 0.4, (ctx, s) => {
  ctx.fillStyle = '#1b1b1b'; ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 8; i++) { const g = ctx.createLinearGradient(0, (i * s) / 8, 0, ((i + 1) * s) / 8); g.addColorStop(0, '#f4f2ea'); g.addColorStop(1, '#8a8880'); ctx.fillStyle = g; ctx.fillRect(0, (i * s) / 8 + 2, s, s / 8 - 5); }
}, 89);

/** Extra materials owned by the interior kit. Reuse them like `mats.*`. */
export const kitMats = {
  plate: std({ map: T.plate, roughness: 0.35, metalness: 0.7 }),
  ironwork: std({ map: T.iron, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.45, metalness: 0.6 }),
  portGlass: std({ color: 0x8fb6cf, emissive: 0xa9d4ff, emissiveIntensity: 0.9, roughness: 0.1 }),
  blanketWS: std({ map: T.blanket, roughness: 1 }),
  books: std({ map: T.books, roughness: 0.8 }),
  crockery: std({ map: T.crockery, roughness: 0.5 }),
  bottles: std({ map: T.bottles, roughness: 0.4 }),
  clockFace: std({ map: T.clock, roughness: 0.4 }),
  gaugeFace: std({ map: T.gauge, roughness: 0.4, metalness: 0.2 }),
  switchboard: std({ map: T.switchboard, roughness: 0.5 }),
  honour: std({ map: T.honour, roughness: 0.5 }),
  damaskRed: std({ color: 0x9a3a3a, map: T.damask, roughness: 0.9 }),
  damaskGreen: std({ color: 0x5f8a66, map: T.damask, roughness: 0.9 }),
  damaskBlue: std({ color: 0x5d79a8, map: T.damask, roughness: 0.9 }),
  damaskGold: std({ color: 0xcdb06a, map: T.damask, roughness: 0.9 }),
  tileBlue: std({ map: T.tileBlue, roughness: 0.25 }),
  cane: std({ map: T.cane, roughness: 0.9 }),
  trellis: std({ map: T.trellis, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9 }),
  bronze: std({ color: 0x6b4a26, roughness: 0.4, metalness: 0.85 }),
  slate: std({ color: 0x2c2f33, roughness: 0.6 }),
  water: std({ color: 0x3f8f9c, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.72 }),
  redLead: std({ color: 0x8a3a2a, roughness: 0.8, metalness: 0.2 }),
  // --- added for the detailed props / architecture ---
  atlas: std({ map: T.atlas, roughness: 0.55 }),
  crystal: std({ color: 0xfff6e6, emissive: 0xffe0b0, emissiveIntensity: 0.35, roughness: 0.04, metalness: 0.2 }),
  fireRed: std({ color: 0xa31a16, roughness: 0.45, metalness: 0.1 }),
  ebony: std({ color: 0x15110e, roughness: 0.18, metalness: 0.1 }),
  ivy: std({ color: 0x2f6128, roughness: 0.75, side: THREE.DoubleSide }),
  stencil: std({ map: T.stencil, roughness: 0.85 }),
  notice: std({ map: T.notice, roughness: 0.9 }),
  chart: std({ map: T.chart, roughness: 0.95 }),
  keys: std({ map: T.keys, roughness: 0.3 }),
  louvre: std({ map: T.louvre, roughness: 0.6 }),
  cutGlass: std({ color: 0xfff4dc, emissive: 0xffd9a0, emissiveIntensity: 1.1, roughness: 0.1, metalness: 0.1 }),
  paintings: std({ map: T.paintings, roughness: 0.6 }),
  signs: std({ map: T.signs, roughness: 0.3, metalness: 0.1 }),
};
for (const [k, m] of Object.entries(kitMats)) m.name = 'kit_' + k;

const _night = new WeakSet();
/** Registers the day/night behaviour of kit materials once per world. */
export function hookNight(world) {
  if (_night.has(world)) return;
  _night.add(world);
  world.onTimeChange((night) => {
    kitMats.portGlass.emissiveIntensity = night ? 0.03 : 0.9; kitMats.portGlass.color.setHex(night ? 0x0c1622 : 0x8fb6cf);
    kitMats.cutGlass.emissiveIntensity = night ? 1.6 : 1.0;
  });
}

const ALIAS = {
  tile: 'tileWhite', steelPlate: 'steelFloor', wood: 'deckWood', white: 'paintWhite', cream: 'paintCream', grey: 'paintGrey', green: 'paintGreen',
  carpet: 'carpetRed', lino: 'linoCream',
};
/** Resolve a material name ('carpetRed', 'tile', 'damaskRed', ...) or pass a Material through. */
export function matOf(m, fallback = mats.paintWhite) {
  if (!m) return fallback;
  if (m.isMaterial) return m;
  const r = mats[m] || kitMats[m] || mats[ALIAS[m]];
  if (!r) { console.warn('[kit] unknown material "' + m + '"'); return fallback; }
  return r;
}

// ---------------------------------------------------------------- batch

/**
 * Collects quads/polygons and creates ONE mesh per (zone, material) on flush().
 * Vertical faces get UVs (horizontal metres, y - yRef), horizontal faces (x, z) – all in metres.
 */
const _pv = new THREE.Vector3(), _pn = new THREE.Vector3(), _pm = new THREE.Matrix4(), _nm = new THREE.Matrix3();

export class Batch {
  constructor(world, deck, yRef = DECK_Y[deck]) { this.world = world; this.deck = deck; this.yRef = yRef; this.buckets = new Map(); this.tris = 0; }

  _bucket(mat, zx) {
    const zi = Math.floor(zx / ZONE_LEN), k = zi + '|' + mat.uuid;
    let b = this.buckets.get(k);
    // a full bucket is parked under its own key: keeps every flush step short (time slicing) – the zone bake merges them
    if (b && b.pos.length > 150000) { this._full = (this._full ?? 0) + 1; this.buckets.set(k + '#' + this._full, b); b = null; }
    if (!b) this.buckets.set(k, (b = { mat, zi, pos: [], nor: [], uv: [], idx: [] }));
    return b;
  }

  /** Convex polygon. pts: [[x,y,z],...]; n: wanted normal direction [nx,ny,nz] (winding is fixed automatically); uvs optional. */
  poly(mat, pts, n, uvs, zx) {
    const a = pts[0];
    let nx = 0, ny = 0, nz = 0;
    for (let i = 1; i < pts.length - 1; i++) {
      const b = pts[i], c = pts[i + 1];
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      nx += uy * vz - uz * vy; ny += uz * vx - ux * vz; nz += ux * vy - uy * vx;
    }
    const len = Math.hypot(nx, ny, nz);
    if (len < 1e-9) return;
    nx /= len; ny /= len; nz /= len;
    let flip = false;
    if (n && nx * n[0] + ny * n[1] + nz * n[2] < 0) { flip = true; nx = -nx; ny = -ny; nz = -nz; }
    if (zx === undefined) { zx = 0; for (const p of pts) zx += p[0]; zx /= pts.length; }
    const b = this._bucket(mat, zx), base = b.pos.length / 3;
    const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      b.pos.push(p[0], p[1], p[2]); b.nor.push(nx, ny, nz);
      if (uvs) b.uv.push(uvs[i][0], uvs[i][1]);
      else if (ay >= ax && ay >= az) b.uv.push(p[0], p[2]);
      else if (ax > az) b.uv.push(p[2], p[1] - this.yRef);
      else b.uv.push(p[0], p[1] - this.yRef);
    }
    for (let i = 1; i < pts.length - 1; i++) { if (flip) b.idx.push(base, base + i + 1, base + i); else b.idx.push(base, base + i, base + i + 1); }
    this.tris += pts.length - 2;
  }
  quad(mat, a, b, c, d, n, uvs, zx) { this.poly(mat, [a, b, c, d], n, uvs, zx); }

  /** Horizontal rectangle facing up (or down). */
  flat(mat, x0, x1, z0, z1, y, down = false) { this.poly(mat, [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]], [0, down ? -1 : 1, 0]); }
  /** Vertical rectangle in the plane z = const, x0..x1, y0..y1, facing sign(nz). */
  wallX(mat, z, x0, x1, y0, y1, nz) { this.poly(mat, [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]], [0, 0, nz]); }
  /** Vertical rectangle in the plane x = const, z0..z1, y0..y1, facing sign(nx). */
  wallZ(mat, x, z0, z1, y0, y1, nx) { this.poly(mat, [[x, y0, z0], [x, y0, z1], [x, y1, z1], [x, y1, z0]], [nx, 0, 0]); }

  /** Axis-aligned box; faces: subset of 'xXyYzZ' (lower case = min side, upper case = max side). */
  box(mat, x0, y0, z0, x1, y1, z1, faces = 'xXyYzZ') {
    if (x0 > x1) [x0, x1] = [x1, x0]; if (y0 > y1) [y0, y1] = [y1, y0]; if (z0 > z1) [z0, z1] = [z1, z0];
    const zx = (x0 + x1) / 2;
    for (const f of faces) {
      if (f === 'x') this.poly(mat, [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], [-1, 0, 0], undefined, zx);
      else if (f === 'X') this.poly(mat, [[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]], [1, 0, 0], undefined, zx);
      else if (f === 'y') this.poly(mat, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], [0, -1, 0], undefined, zx);
      else if (f === 'Y') this.poly(mat, [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], [0, 1, 0], undefined, zx);
      else if (f === 'z') this.poly(mat, [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], [0, 0, -1], undefined, zx);
      else if (f === 'Z') this.poly(mat, [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [0, 0, 1], undefined, zx);
    }
  }

  /** Square bar between two points (sloped allowed, must not be vertical). w = horizontal width, h = height; p/q = bottom centre line. */
  bar(mat, p, q, w = 0.06, h = 0.06) {
    const dx = q[0] - p[0], dz = q[2] - p[2], l = Math.hypot(dx, dz) || 1;
    const sx = (-dz / l) * w / 2, sz = (dx / l) * w / 2;
    const A = [p[0] + sx, p[1], p[2] + sz], B = [q[0] + sx, q[1], q[2] + sz], C = [q[0] - sx, q[1], q[2] - sz], D = [p[0] - sx, p[1], p[2] - sz];
    const up = (v) => [v[0], v[1] + h, v[2]];
    const zx = (p[0] + q[0]) / 2;
    this.poly(mat, [up(A), up(B), up(C), up(D)], [0, 1, 0], undefined, zx);
    this.poly(mat, [A, B, C, D], [0, -1, 0], undefined, zx);
    this.poly(mat, [A, B, up(B), up(A)], [sx, 0, sz], undefined, zx);
    this.poly(mat, [D, C, up(C), up(D)], [-sx, 0, -sz], undefined, zx);
    // end caps (free ends of handrails, strings and cappings would otherwise be open boxes)
    const ax = dx / l, az = dz / l;
    this.poly(mat, [A, D, up(D), up(A)], [-ax, 0, -az], undefined, zx);
    this.poly(mat, [B, C, up(C), up(B)], [ax, 0, az], undefined, zx);
  }
  /** Vertical square post. */
  post(mat, x, z, y0, y1, s = 0.05) { this.box(mat, x - s / 2, y0, z - s / 2, x + s / 2, y1, z + s / 2, 'xXzZY'); }

  /** Flat disc / ring with centre c and unit normal n (horizontal normals or ±y). */
  ring(mat, c, n, r0, r1, seg = 12, uvUnit = false) {
    const up = Math.abs(n[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const s = [up[1] * n[2] - up[2] * n[1], up[2] * n[0] - up[0] * n[2], up[0] * n[1] - up[1] * n[0]];
    const sl = Math.hypot(s[0], s[1], s[2]); s[0] /= sl; s[1] /= sl; s[2] /= sl;
    const u = [n[1] * s[2] - n[2] * s[1], n[2] * s[0] - n[0] * s[2], n[0] * s[1] - n[1] * s[0]];
    const pt = (r, a) => { const ca = Math.cos(a) * r, sa = Math.sin(a) * r; return [c[0] + s[0] * ca + u[0] * sa, c[1] + s[1] * ca + u[1] * sa, c[2] + s[2] * ca + u[2] * sa]; };
    const uv = (r, a) => [0.5 + (Math.cos(a) * r) / (2 * r1), 0.5 + (Math.sin(a) * r) / (2 * r1)];
    if (r0 <= 0) {
      const pts = [], uvs = [];
      for (let i = 0; i < seg; i++) { const a = (i / seg) * Math.PI * 2; pts.push(pt(r1, a)); uvs.push(uv(r1, a)); }
      this.poly(mat, pts, n, uvUnit ? uvs : undefined, c[0]);
      return;
    }
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
      this.poly(mat, [pt(r0, a0), pt(r1, a0), pt(r1, a1), pt(r0, a1)], n, undefined, c[0]);
    }
  }
  disc(mat, c, n, r, seg = 12, uvUnit = false) { this.ring(mat, c, n, 0, r, seg, uvUnit); }

  /**
   * Moulding: sweep a 2D profile [[out, up], ...] (from the wall outwards and back) along a straight line.
   * P0 = start point on the wall, A = unit direction of the run (length len), O = unit wall normal, U = unit 'up' of the profile.
   * caps: [start, end] close the profile ends (free ends of a moulding).
   */
  sweep(mat, prof, P0, A, O, U, len, caps = [false, false], zx) {
    const Q = (k, o, u) => [P0[0] + A[0] * k + O[0] * o + U[0] * u, P0[1] + A[1] * k + O[1] * o + U[1] * u, P0[2] + A[2] * k + O[2] * o + U[2] * u];
    for (let i = 0; i < prof.length - 1; i++) {
      const [o0, u0] = prof[i], [o1, u1] = prof[i + 1], dO = o1 - o0, dU = u1 - u0;
      if (Math.abs(dO) + Math.abs(dU) < 1e-6) continue;
      const n = [O[0] * dU - U[0] * dO, O[1] * dU - U[1] * dO, O[2] * dU - U[2] * dO];
      this.poly(mat, [Q(0, o0, u0), Q(len, o0, u0), Q(len, o1, u1), Q(0, o1, u1)], n, undefined, zx);
    }
    for (const [on, k, sg] of [[caps[0], 0, -1], [caps[1], len, 1]]) {
      if (!on) continue;
      for (let i = 0; i < prof.length - 1; i++) {
        const [o0, u0] = prof[i], [o1, u1] = prof[i + 1];
        // (closed rail sections reach o < 0: only segments lying in the wall plane o = 0 need no cap)
        if (Math.abs(u1 - u0) < 1e-6 || (Math.abs(o0) < 1e-5 && Math.abs(o1) < 1e-5)) continue;
        this.poly(mat, [Q(k, 0, u0), Q(k, o0, u0), Q(k, o1, u1), Q(k, 0, u1)], [A[0] * sg, A[1] * sg, A[2] * sg], undefined, zx);
      }
    }
  }

  /** Raised & fielded panel on a wall: base rect (w along A, h along U) at P (centre, on the wall), raised by t along O, bevel e. */
  fielded(mat, P, A, O, U, w, h, t = 0.01, e = 0.04, zx) {
    const hw = w / 2, hh = h / 2, iw = Math.max(0.004, hw - e), ih = Math.max(0.004, hh - e);
    const Q = (a, u, o) => [P[0] + A[0] * a + U[0] * u + O[0] * o, P[1] + A[1] * a + U[1] * u + O[1] * o, P[2] + A[2] * a + U[2] * u + O[2] * o];
    const n = (x, y) => [O[0] * 0.6 + (A[0] * x + U[0] * y) * 0.8, O[1] * 0.6 + (A[1] * x + U[1] * y) * 0.8, O[2] * 0.6 + (A[2] * x + U[2] * y) * 0.8];
    this.poly(mat, [Q(-iw, -ih, t), Q(iw, -ih, t), Q(iw, ih, t), Q(-iw, ih, t)], O, undefined, zx);
    this.poly(mat, [Q(-hw, -hh, 0), Q(hw, -hh, 0), Q(iw, -ih, t), Q(-iw, -ih, t)], n(0, -1), undefined, zx);
    this.poly(mat, [Q(-hw, hh, 0), Q(hw, hh, 0), Q(iw, ih, t), Q(-iw, ih, t)], n(0, 1), undefined, zx);
    this.poly(mat, [Q(-hw, -hh, 0), Q(-hw, hh, 0), Q(-iw, ih, t), Q(-iw, -ih, t)], n(-1, 0), undefined, zx);
    this.poly(mat, [Q(hw, -hh, 0), Q(hw, hh, 0), Q(iw, ih, t), Q(iw, -ih, t)], n(1, 0), undefined, zx);
  }

  /** n-sided prism (pipe, rod) between two points, sides only (caps optional). */
  prism(mat, a, b, r, n = 6, caps = false) {
    const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], l = Math.hypot(d[0], d[1], d[2]) || 1; d[0] /= l; d[1] /= l; d[2] /= l;
    const up = Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    let s = [d[1] * up[2] - d[2] * up[1], d[2] * up[0] - d[0] * up[2], d[0] * up[1] - d[1] * up[0]]; const sl = Math.hypot(...s); s = s.map((v) => v / sl);
    const u = [d[1] * s[2] - d[2] * s[1], d[2] * s[0] - d[0] * s[2], d[0] * s[1] - d[1] * s[0]];
    const ring = (c, k) => { const t = (k / n) * Math.PI * 2, cs = Math.cos(t) * r, sn = Math.sin(t) * r; return [c[0] + s[0] * cs + u[0] * sn, c[1] + s[1] * cs + u[1] * sn, c[2] + s[2] * cs + u[2] * sn]; };
    const zx = (a[0] + b[0]) / 2;
    for (let k = 0; k < n; k++) {
      const t = ((k + 0.5) / n) * Math.PI * 2, nn = [s[0] * Math.cos(t) + u[0] * Math.sin(t), s[1] * Math.cos(t) + u[1] * Math.sin(t), s[2] * Math.cos(t) + u[2] * Math.sin(t)];
      this.poly(mat, [ring(a, k), ring(b, k), ring(b, k + 1), ring(a, k + 1)], nn, undefined, zx);
    }
    if (caps) { const A = [], B = []; for (let k = 0; k < n; k++) { A.push(ring(a, k)); B.push(ring(b, k)); } this.poly(mat, A, [-d[0], -d[1], -d[2]], undefined, zx); this.poly(mat, B, d, undefined, zx); }
  }

  /** Rivet / bolt head: 4-sided pyramid (4 triangles) on a surface at p, surface normal O (unit), A = a unit direction in the surface. */
  stud(mat, p, O, A, r = 0.009, h = 0.009) {
    const B = [O[1] * A[2] - O[2] * A[1], O[2] * A[0] - O[0] * A[2], O[0] * A[1] - O[1] * A[0]];
    const q = (a, b) => [p[0] + A[0] * a + B[0] * b, p[1] + A[1] * a + B[1] * b, p[2] + A[2] * a + B[2] * b];
    const ps = [q(-r, -r), q(r, -r), q(r, r), q(-r, r)], t = [p[0] + O[0] * h, p[1] + O[1] * h, p[2] + O[2] * h];
    for (let k = 0; k < 4; k++) this.poly(mat, [ps[k], ps[(k + 1) % 4], t], O, undefined, p[0]);
  }

  /**
   * Merge a prop instance (Group from a def() prop or a template, children = meshes) into the batch at world (x, y, z),
   * rotated by rotY like place(). Adds no meshes: small clutter repeated in hundreds of rooms costs only vertices.
   * Returns the number of triangles added.
   */
  prop(group, x, y, z, rotY = 0) {
    const c = Math.cos(rotY), s = Math.sin(rotY);
    let n = 0;
    for (const m of group.children) {
      if (!m.isMesh || !m.geometry?.attributes?.position) continue;
      const g = m.geometry, pa = g.attributes.position, na = g.attributes.normal, ua = g.attributes.uv, ix = g.index;
      const ident = m.position.lengthSq() === 0 && m.rotation.x === 0 && m.rotation.y === 0 && m.rotation.z === 0 && m.scale.x === 1 && m.scale.y === 1 && m.scale.z === 1;
      if (!ident) { m.updateMatrix(); _pm.copy(m.matrix); _nm.getNormalMatrix(_pm); }
      const b = this._bucket(m.material, x), base = b.pos.length / 3;
      for (let i = 0; i < pa.count; i++) {
        _pv.set(pa.getX(i), pa.getY(i), pa.getZ(i));
        if (na) _pn.set(na.getX(i), na.getY(i), na.getZ(i)); else _pn.set(0, 1, 0);
        if (!ident) { _pv.applyMatrix4(_pm); _pn.applyMatrix3(_nm).normalize(); }
        b.pos.push(x + c * _pv.x + s * _pv.z, y + _pv.y, z - s * _pv.x + c * _pv.z);
        b.nor.push(c * _pn.x + s * _pn.z, _pn.y, -s * _pn.x + c * _pn.z);
        if (ua) b.uv.push(ua.getX(i), ua.getY(i)); else b.uv.push(0, 0);
      }
      if (ix) { for (let i = 0; i < ix.count; i++) b.idx.push(base + ix.getX(i)); n += ix.count / 3; }
      else { for (let i = 0; i < pa.count; i++) b.idx.push(base + i); n += pa.count / 3; }
    }
    this.tris += n;
    return n;
  }

  /** Create the meshes (one per zone and material) and reset. */
  flush() { for (const _ of this.flushSteps()) { /* all at once */ } }

  /** flush() as a generator: yields after every bucket with geometry (time slicing, see rooms.js finishAsync). */
  *flushSteps() {
    const list = [...this.buckets.values()];
    this.buckets.clear();
    for (const b of list) {
      if (!b.idx.length) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(b.nor, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
      g.setIndex(b.idx);
      const m = new THREE.Mesh(g, b.mat);
      m.receiveShadow = true;
      this.world.zone(this.deck, b.zi * ZONE_LEN + 1).add(m);
      yield;
    }
  }
}

/** Remembers problems found by the kit (also printed with console.warn). */
export function problem(world, deck, msg) {
  (world.kitProblems ??= []).push({ deck, msg });
  console.warn(`[kit ${deck}] ${msg}`);
}
