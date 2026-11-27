// Interior kit – furniture: beds, storage, washing / sanitary, seating, tables. Front of every prop faces +x.
import * as THREE from 'three';
import { mats as M } from '../core/materials.js';
import { kitMats as K, matOf, AT } from './batch.js';
import * as G from './geom.js';
import {
  def, PROPS, rngOf, turnedLeg, taperLeg, cabriole, bail, knob, keyplate, drawer, cabDoor, mattress, pillowAt, blanket, cushion,
  tuftBack, tuftSeat, placeSetting, tableLampOn, towelOn, bookRow, papers, SHAPES, PLATE, slabWithHoles,
  FINE, piping, foldedBlanket, soapOn, toothMug, hairBrush, handMirror, vaseOn,
} from './props-core.js';

// ============================================================ helpers

/** cork life jackets (white canvas blocks with tapes) lying on a surface at y, centred at x, z */
export function lifeJackets(p, x, y, z, n = 2, along = 'z') {
  for (let i = 0; i < n; i++) {
    const yy = y + i * 0.085, rot = (i % 2 ? 0.12 : -0.08);
    const grp = [p.bb(M.canvas, 0.34, 0.07, 0.56, x, yy, z, 0.025)];
    grp.push(p.b(M.paintCream, 0.37, 0.012, 0.025, x, yy + 0.07, z - 0.07), p.b(M.paintCream, 0.37, 0.012, 0.025, x, yy + 0.07, z + 0.07));
    for (const m of grp) { const ox = m.position.x - x, oz = m.position.z - z, a = along === 'z' ? rot : rot + Math.PI / 2; m.position.x = x + ox * Math.cos(a) + oz * Math.sin(a); m.position.z = z - ox * Math.sin(a) + oz * Math.cos(a); m.rotation.y = a; }
  }
}
/** carafe + two tumblers on a small brass tray */
export function carafeSet(p, x, y, z) {
  p.lathe(M.brass, [[0, 0], [0.09, 0], [0.095, 0.008], [0.088, 0.008], [0, 0.004]], x, y, z, 14);
  p.lathe(M.glass, SHAPES.CARAFE, x, y + 0.006, z - 0.02, 10);
  p.lathe(M.glass, SHAPES.TUMBLER.map(([r, h]) => [r * 0.85, h * 0.9]), x + 0.03, y + 0.006, z + 0.055, 8);
  p.lathe(M.glass, SHAPES.TUMBLER.map(([r, h]) => [r * 0.85, h * 0.9]), x - 0.035, y + 0.006, z + 0.05, 8);
}
const plinth = (p, m, d, w, h = 0.09) => p.fr(m, d, w, d - 0.02, w - 0.02, h, 0, 0, 0, { bottom: false });
const BRASS_POST = (h) => [[0, 0], [0.027, 0], [0.019, 0.05], [0.019, h - 0.12], [0.036, h - 0.035], [0, h + 0.008]];
const FINIAL = [[0, 0], [0.03, 0], [0.034, 0.045], [0.012, 0.09], [0.016, 0.1], [0, 0.12]];

// ============================================================ beds

export const bedFirst = def('bedFirst', (o) => [2.05, o.wide ? 1.4 : 1.0, o.canopy ? 2.15 : 1.2], (p, o) => {
  const W = o.wide ? 1.4 : 1.0, L = 2.05, wood = o.style === 'mahogany' || o.canopy, cover = matOf(o.cover, M.fabricGold);
  const hz = -L / 2 + 0.035, fz = L / 2 - 0.035, my = 0.3, mt = my + 0.2, F = FINE();
  // base: side rails, spring frame, valance
  for (const s of [-1, 1]) {
    if (wood && F >= 1) p.bb(M.mahogany, 0.035, 0.2, L - 0.09, s * (W / 2 - 0.02), 0.13, 0, 0.006);
    else p.b(wood ? M.mahogany : M.iron, 0.035, wood ? 0.2 : 0.07, L - 0.09, s * (W / 2 - 0.02), wood ? 0.13 : 0.23, 0);
  }
  p.b(M.canvas, W - 0.08, 0.03, L - 0.12, 0, my - 0.03, 0);
  mattress(p, W - 0.04, L - 0.1, 0.2, 0, my, 0);
  if (F >= 2) { // a second pillow leaning against the head board behind the first
    const xs = o.wide ? [-1, 1].map((s) => s * W * 0.22) : [0], pw = o.wide ? W * 0.4 : W * 0.74;
    for (const x of xs) p.pil(M.linen, pw, 0.15, 0.34, x, mt - 0.03, hz + 0.215, 0.6, 0.45, 3, 10, 0.02).rotation.x = -0.3;
    for (const x of xs) pillowAt(p, pw + 0.02, 0.4, 0.13, x, mt - 0.02, hz + 0.38);
  } else if (o.wide) { for (const s of [-1, 1]) pillowAt(p, W * 0.42, 0.42, 0.14, s * W * 0.22, mt - 0.02, hz + 0.27); }
  else pillowAt(p, W * 0.78, 0.42, 0.14, 0, mt - 0.02, hz + 0.27);
  blanket(p, cover, W - 0.01, 0, mt, hz + 0.62, fz - 0.03, 0.2);
  if (F >= 2) foldedBlanket(p, cover === M.fabricGold ? M.fabricRed : M.fabricGold, W * 0.86, 0.34, F >= 3 ? 2 : 1, 0, mt + 0.018, fz - 0.3, 0.03); // folded eiderdown at the foot
  if (!wood) {
    const end = (z, h, rails) => {
      for (const s of [-1, 1]) p.lathe(M.brass, BRASS_POST(h), s * W / 2, 0, z, 6);
      p.cx(M.brass, 0.017, W, 0, h - 0.07, z, 6);
      for (const y of rails) p.cx(M.brass, 0.011, W, 0, y, z, 5);
      const n = o.wide ? 5 : 3, y0 = rails[rails.length - 1];
      for (let i = 1; i <= n; i++) { const x = -W / 2 + (W * i) / (n + 1); p.c(M.brass, 0.009, h - 0.07 - y0, x, y0, z, 5); }
      p.b(M.iron, W, 0.03, 0.03, 0, 0.255, z);
      if (F >= 2) { // turned collars where the rails meet the posts, ball on every spindle
        for (const s of [-1, 1]) for (const y of [...rails, 0.27]) p.lathe(M.brass, [[0.019, -0.014], [0.028, 0], [0.019, 0.014]], s * W / 2, y, z, 6);
        if (F >= 3) for (let i = 1; i <= n; i++) p.s(M.brass, 0.016, -W / 2 + (W * i) / (n + 1), (y0 + h - 0.07) / 2, z);
      }
    };
    end(hz, 1.18, [0.52]); end(fz, 0.86, [0.5]);
  } else {
    const board = (z, h, panels) => {
      const top = (t) => h - 0.08 * (1 - Math.cos(t * Math.PI * 2)) * 0.5 + 0.05 * Math.sin(t * Math.PI);
      const out = [[-W / 2, 0.22]]; for (let i = 0; i <= 12; i++) { const t = i / 12; out.push([-W / 2 + W * t, top(t)]); } out.push([W / 2, 0.22]);
      p.extZ(M.mahogany, out, 0.035, 0, 0, z, 0);
      const pw = (W - 0.12 - (panels - 1) * 0.06) / panels;
      for (let i = 0; i < panels; i++) { const x = -W / 2 + 0.06 + pw / 2 + i * (pw + 0.06), ph = h - 0.48; const f = p.fp(M.mahogany, pw, ph, x, 0.3 + ph / 2, z + Math.sign(-z) * 0.0175, 0.01, 0.04); f.rotation.y = z < 0 ? -Math.PI / 2 : Math.PI / 2; }
      for (const s of [-1, 1]) {
        if (F >= 1) p.bb(M.mahogany, 0.065, h - 0.04, 0.065, s * W / 2, 0, z, 0.008); else p.b(M.mahogany, 0.065, h - 0.04, 0.065, s * (W / 2 + 0.0), 0, z);
        p.lathe(M.mahogany, FINIAL, s * W / 2, h - 0.04, z, 6);
      }
      p.b(M.gold, W * 0.4, 0.02, 0.04, 0, top(0.5) - 0.08, z);
      if (F >= 2) { // rounded cap rail following the shaped top
        const pts = []; for (let i = 0; i <= 10; i++) { const t = 0.04 + (0.92 * i) / 10; pts.push([-W / 2 + W * t, top(t) - 0.004, z]); }
        p.loft(M.mahogany, pts, 0.021, 5);
      }
      if (F >= 3) { // carved cartouche on the face towards the room / mattress (+z)
        const cy = 0.3 + (h - 0.48) / 2, sh = []; for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; sh.push([Math.cos(a) * 0.09 * (1 + 0.15 * Math.cos(a * 2)), cy + Math.sin(a) * 0.065]); }
        if (panels === 2) p.extZ(M.mahogany, sh, 0.014, 0, 0, z + 0.0175 + 0.007, 0.004);
      }
    };
    board(hz, 1.12, o.wide ? 3 : 2); board(fz, 0.72, o.wide ? 3 : 2);
  }
  if (o.canopy) {
    const H = 2.08;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.lathe(M.mahogany, [[0, 0], [0.04, 0], [0.04, 0.3], [0.03, 0.34], [0.028, 0.6], [0.042, 0.72], [0.026, 0.84], [0.024, H - 0.2], [0.034, H - 0.14], [0.026, H], [0, H]], sx * W / 2, 0, sz * (L / 2 - 0.035), 10);
    p.bb(M.mahogany, W + 0.12, 0.07, L + 0.06, 0, H, 0, 0.012); p.bb(M.mahogany, W + 0.06, 0.05, L, 0, H - 0.05, 0, 0.01);
    p.bb(M.gold, W + 0.13, 0.015, L + 0.07, 0, H + 0.035, 0, 0.004);
    // valance on three sides, head curtain, tied-back curtains at the foot posts
    const val = (len) => G.curtain(len, 0.28, Math.round(len * 4), 0.018);
    p.add(val(L), cover, -W / 2 - 0.02, H, 0); p.add(val(L), cover, W / 2 + 0.02, H, 0);
    p.add(val(W), cover, 0, H, -L / 2 - 0.02, 0, Math.PI / 2, 0);
    p.add(G.curtain(W, 1.5, 4, 0.025), cover, 0, H - 0.05, hz + 0.05, 0, Math.PI / 2, 0);
    for (const s of [-1, 1]) p.add(G.curtain(0.5, 1.75, 3, 0.03, 0.75, s * 0.2, 0, 7), cover, s * (W / 2 + 0.03), H - 0.06, fz - 0.2, 0, 0, 0);
  }
});

export const berthSecond = def('berthSecond', (o) => [1.99, 0.8, o.upper === false ? 0.75 : 1.8], (p, o) => {
  const wood = matOf(o.mat, M.mahogany), cover = matOf(o.cover, M.fabricGreen), tiers = o.upper === false ? [0.3] : [0.3, 1.3];
  const h = o.upper === false ? 0.75 : 1.8, F = FINE();
  // end boards with raised panels
  for (const s of [-1, 1]) {
    p.b(wood, 0.8, h, 0.035, 0, 0, s * 0.975);
    const n = tiers.length;
    for (let i = 0; i < n; i++) { const y0 = i ? 1.02 : 0.05, ph = i ? h - 1.1 : 0.22; const f = p.fp(wood, 0.6, ph, 0, y0 + ph / 2, s * 0.957, 0.008, 0.035); f.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2; }
    if (F >= 1) p.bb(wood, 0.82, 0.035, 0.055, 0, h - 0.035, s * 0.975, 0.008); else p.b(wood, 0.8, 0.03, 0.05, 0, h - 0.03, s * 0.975);
  }
  // drawers under the lower berth
  for (const s of [-1, 1]) drawer(p, wood, 0.86, 0.2, 0.4, 0.14, s * 0.47, 1, false);
  p.b(wood, 0.04, 0.22, 1.9, 0.37, 0.03, 0);
  for (const y of tiers) {
    p.b(wood, 0.78, 0.05, 1.92, 0, y, 0);
    p.bb(wood, 0.035, 0.24, 1.92, 0.38, y - 0.02, 0, 0.008);                       // lee board
    p.b(wood, 0.05, 0.03, 1.92, 0.385, y + 0.21, 0);
    mattress(p, 0.7, 1.85, 0.13, -0.02, y + 0.05, 0);
    pillowAt(p, 0.5, 0.36, 0.11, -0.04, y + 0.16, -0.72);
    // soft blanket with a rolled sheet edge (not a box)
    p.pil(cover, 0.74, 0.1, 1.28, -0.02, y + 0.1, 0.26, 0.25, 0.12, 2, 12, 0.004);
    p.cx(M.linen, 0.016, 0.74, -0.02, y + 0.192, -0.375, 8);
    if (F >= 3) foldedBlanket(p, M.blanket, 0.5, 0.3, 1, -0.05, y + 0.19, 0.72, 0.03);
  }
  if (o.upper !== false) {
    p.cz(M.brass, 0.011, 1.92, 0.38, 1.76, 0, 8);
    if (F >= 2) for (const s of [-1, 1]) p.latheZ(M.brass, [[0, 0], [0.024, 0], [0.022, 0.006], [0.014, 0.016], [0, 0.02]], 0.38, 1.76, s * 0.957, 6, -s); // rod flanges on the end boards
    p.add(G.curtain(0.42, 1.4, 3, 0.025, 0, 0, 9, 3), cover, 0.39, 1.75, -0.73);
  }
});

export const bunkThird = def('bunkThird', (o) => [1.9, 0.75, (o.tiers ?? 2) > 1 ? 1.65 : 0.7], (p, o) => {
  const tiers = (o.tiers ?? 2) > 1 ? [0.3, 1.2] : [0.3], h = tiers.length > 1 ? 1.65 : 0.7, iron = !!o.iron;
  const frame = iron ? M.iron : M.pine, cover = iron ? matOf(o.cover, M.blanket) : K.blanketWS, F = FINE();
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    if (iron) p.c(frame, 0.018, h, sx * 0.35, 0, sz * 0.925, 6);
    else if (F >= 3) p.bb(frame, 0.05, h, 0.05, sx * 0.35, 0, sz * 0.925, 0.007); // chamfered posts
    else p.b(frame, 0.05, h, 0.05, sx * 0.35, 0, sz * 0.925);
  }
  for (const y of tiers) {
    if (iron) {
      for (const s of [-1, 1]) p.cz(frame, 0.016, 1.85, s * 0.35, y + 0.04, 0, 6);
      for (const s of [-1, 1]) p.cx(frame, 0.014, 0.7, 0, y + 0.04, s * 0.92, 6);
      p.b(M.steelDark, 0.66, 0.01, 1.8, 0, y + 0.03, 0);
    } else {
      p.b(frame, 0.04, 0.17, 1.86, 0.355, y - 0.02, 0);                     // lee board
      p.b(frame, 0.7, 0.09, 1.82, -0.01, y, 0);
    }
    p.pil(M.linen, 0.66, 0.1, 1.78, 0, y + 0.06, 0, 0.3, 0.15, 2, 10, 0.004);
    p.pil(M.linen, 0.42, 0.09, 0.3, 0, y + 0.14, -0.7, 0.6, 0.45, 2, 8);
    // soft blanket instead of a box, rolled sheet edge from level 2
    p.pil(cover, 0.7, 0.115, 1.2, 0, y + 0.065, 0.28, 0.25, 0.1, 2, 8, 0.003);
    if (F >= 2) p.cx(M.linen, 0.014, 0.7, 0, y + 0.163, -0.31, 6); else p.b(M.linen, 0.71, 0.022, 0.05, 0, y + 0.165, -0.31);
  }
  if (tiers.length > 1 && !iron) for (let k = 0; k < 3; k++) p.b(frame, 0.03, 0.03, 0.04, 0.36, 0.55 + k * 0.28, 0.925);
});
/** crew / firemen bunk (iron frame) */
export const bunkCrew = (o = {}) => bunkThird({ iron: true, ...o });
PROPS.bunkCrew = bunkCrew; bunkCrew.fp = bunkThird.fp;

export const hammock = def('hammock', [2.3, 0.6, 1.3], (p) => {
  const pts = [], rad = [];
  for (let i = 0; i <= 8; i++) { const t = i / 8, z = -0.85 + 1.7 * t, s = Math.sin(t * Math.PI); pts.push([0, 0.95 - 0.22 * s, z]); rad.push([0.04 + 0.26 * Math.pow(s, 0.6), 0.02 + 0.05 * s]); }
  p.loft(M.canvas, pts, rad, 10);
  for (const s of [-1, 1]) {
    p.c(M.iron, 0.025, 1.3, 0, 0, s * 1.12, 8); p.t(M.iron, 0.03, 0.006, 0, 1.06, s * 1.1, 'x', 8, 3);
    for (const dx of [-0.2, -0.1, 0, 0.1, 0.2]) p.tube(M.rope, [[dx, 0.96, s * 0.85], [dx * 0.3, 1.02, s * 0.98], [0, 1.06, s * 1.08]], 0.004, 4, 3);
  }
  p.pil(M.blanket, 0.36, 0.05, 0.6, 0, 0.8, 0.15, 0.4, 0.3, 3, 8);
});

export const coolingCouch = def('coolingCouch', [1.9, 0.75, 0.8], (p, o) => {
  const f = matOf(o.mat, M.fabricRed);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) turnedLeg(p, M.woodDark, 0.3, sx * 0.32, sz * 0.88, 0.03);
  p.bb(M.woodDark, 0.72, 0.08, 1.86, 0, 0.27, 0, 0.012);
  p.bb(M.woodDark, 0.74, 0.05, 1.88, 0, 0.3, 0, 0.01);
  p.pil(f, 0.68, 0.13, 1.78, 0, 0.35, 0.02, 0.3, 0.15, 4, 14, 0.008);
  p.loft(f, [[-0.3, 0.55, -0.78], [0.3, 0.55, -0.78]], 0.1, 10);                        // head bolster
  for (const s of [-1, 1]) p.lathe(M.gold, [[0, 0], [0.06, 0], [0.065, 0.01], [0, 0.012]], s * 0.31, 0.55, -0.78, 10).rotation.z = -s * Math.PI / 2;
  // carved Moorish head board
  const out = [[-0.36, 0.33], [0.36, 0.33], [0.36, 0.62], [0.25, 0.68], [0.12, 0.78], [0, 0.82], [-0.12, 0.78], [-0.25, 0.68], [-0.36, 0.62]];
  const sh = new THREE.Shape(out.map(([a, b]) => new THREE.Vector2(a, b)));
  const hole = new THREE.Path(); hole.moveTo(-0.08, 0.5); hole.lineTo(0.08, 0.5); hole.lineTo(0.08, 0.64); hole.quadraticCurveTo(0, 0.76, -0.08, 0.64); hole.lineTo(-0.08, 0.5); sh.holes.push(hole);
  p.extZ(M.woodDark, sh, 0.04, 0, 0, -0.92, 0.006);
  p.bb(M.gold, 0.6, 0.02, 0.045, 0, 0.72, -0.92, 0.004);
});

// ============================================================ storage

export const wardrobe = def('wardrobe', (o) => [o.w ?? 1.1, 0.55, 2.02], (p, o) => {
  const m = matOf(o.mat, M.mahogany), w = o.w ?? 1.1, fx = 0.267, F = FINE();
  if (F >= 2) p.ms(m, 0.54, 0.09, w, 0, 0, 0, 'plinth', 0); else plinth(p, m, 0.54, w, 0.09);
  p.bb(m, 0.5, 1.76, w - 0.03, -0.015, 0.09, 0, 0.01);
  p.bb(m, 0.52, 0.09, w - 0.01, -0.01, 1.85, 0, 0.01);
  p.ms(m, 0.55, 0.08, w + 0.03, 0, 1.94, 0, 'crown', 0); // one coved crown moulding instead of stacked boards
  p.bb(M.gold, 0.005, 0.02, w - 0.06, 0.247, 1.88, 0, 0.003);
  if (F >= 3) for (const s of [-1, 1]) { const f = p.fp(m, 0.36, 1.4, -0.015, 0.95, s * (w / 2 - 0.015), 0.008, 0.04); f.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2; } // fielded side panels
  if (F >= 2 && !o.open) for (const s of [-1, 1]) for (const y of [0.32, 1.5]) p.c(M.brass, 0.007, 0.07, fx - 0.003, y, s * (w / 2 - 0.022), 6); // hinge knuckles
  const dw = w / 2 - 0.025, dh = 1.68;
  if (o.open) {
    p.b(M.woodDark, 0.02, 1.7, w - 0.06, -0.2, 0.12, 0);
    p.cz(M.brass, 0.008, w - 0.08, 0.0, 1.62, 0, 6);
    for (let i = 0; i < 4; i++) { const z = -w / 2 + 0.12 + i * 0.12; p.ag([AT.coat, AT.navy, AT.khaki, AT.greyCloth][i], G.pillow(0.36, 0.85, 0.08, 0.6, 0.3, 3, 8), -0.02, 0.72, z).rotation.y = Math.PI / 2; }
    p.b(M.woodDark, 0.42, 0.02, w - 0.06, 0.0, 1.66, 0);
    p.ag(AT.hat, G.pillow(0.2, 0.12, 0.24, 0.8, 0.8, 4, 10), 0, 1.68, w / 4);
    const door = p.bb(m, 0.022, dh, dw, fx + (dw / 2) * Math.sin(0.6), 0.14, -w / 2 + (dw / 2) * Math.cos(0.6), 0.006); door.rotation.y = 0.6;
    for (const y of [0.3, 1.55]) p.c(M.brass, 0.01, 0.09, fx - 0.012, y, -w / 2 + 0.012, 6); // hinge knuckles joining the ajar door to the carcass
    cabDoor(p, m, dw, dh, fx, 0.14, w / 4, { mirror: o.mirror, panels: 2, knobAt: -dw / 2 + 0.05 });
  } else {
    cabDoor(p, m, dw, dh, fx, 0.14, -w / 4, { panels: 2, knobAt: dw / 2 - 0.05 });
    cabDoor(p, m, dw, dh, fx, 0.14, w / 4, { mirror: o.mirror, panels: 2, knobAt: -dw / 2 + 0.05 });
  }
  if (o.life) lifeJackets(p, -0.02, 2.02, 0, Math.min(2, o.life === true ? 2 : o.life), 'z');
});

export const chest = def('chest', [0.9, 0.5, 0.95], (p, o) => {
  const m = matOf(o.mat, M.mahogany);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.lathe(m, [[0, 0], [0.03, 0], [0.04, 0.03], [0.035, 0.06], [0.028, 0.075], [0, 0.075]], sx * 0.19, 0, sz * 0.4, 10);
  p.bb(m, 0.46, 0.83, 0.88, -0.01, 0.075, 0, 0.01);
  if (FINE() >= 2) p.ms(m, 0.5, 0.035, 0.92, 0, 0.905, 0, 'ogee', 0.02); else p.bb(m, 0.5, 0.035, 0.92, 0, 0.905, 0, 0.014);
  const hs = [0.2, 0.24, 0.27];
  let y = 0.1;
  for (let i = 0; i < 3; i++) { drawer(p, m, 0.82, hs[i] - 0.015, 0.243, y + hs[i] / 2, 0, 2, true); y += hs[i]; }
});

export const locker = def('locker', (o) => [0.4 * (o.n ?? 1), 0.45, 1.8], (p, o) => {
  const n = o.n ?? 1, w = 0.4 * n, m = matOf(o.mat, M.paintGrey);
  p.b(M.iron, 0.42, 0.06, w - 0.02, -0.01, 0, 0);
  p.bb(m, 0.43, 1.74, w, -0.01, 0.06, 0, 0.006);
  for (let i = 0; i < n; i++) {
    const z = -w / 2 + 0.2 + i * 0.4;
    p.bb(m, 0.016, 1.64, 0.37, 0.212, 0.1, z, 0.004);
    for (const y of [0.25, 1.52]) p.b(K.louvre, 0.004, 0.14, 0.22, 0.222, y, z);
    p.bb(M.iron, 0.01, 0.12, 0.018, 0.226, 0.9, z + 0.14, 0.003);
    p.bb(M.steelDark, 0.012, 0.03, 0.05, 0.226, 1.06, z + 0.15, 0.003);           // hasp
    p.t(M.brass, 0.018, 0.004, 0.232, 1.02, z + 0.165, 'x', 8, 3); p.bb(M.brass, 0.018, 0.036, 0.03, 0.235, 0.96, z + 0.165, 0.004); // padlock
    p.b(K.plate, 0.003, 0.03, 0.06, 0.222, 1.62, z);
    for (const y of [0.3, 1.4]) p.c(M.steelDark, 0.01, 0.06, 0.218, y - 0.03, z - 0.18, 6);
  }
});

export const bookcase = def('bookcase', (o) => [o.w ?? 1.4, 0.4, 2.05], (p, o) => {
  const m = matOf(o.mat, M.mahogany), w = o.w ?? 1.4, F = FINE();
  if (F >= 2) p.ms(m, 0.42, 0.08, w, 0, 0, 0, 'plinth', 0); else plinth(p, m, 0.42, w, 0.08);
  p.bb(m, 0.38, 0.72, w - 0.02, -0.01, 0.08, 0, 0.01);
  for (const s of [-1, 1]) cabDoor(p, m, w / 2 - 0.03, 0.62, 0.18 + 0.022, 0.13, s * w / 4, { knobAt: -s * (w / 4 - 0.06) });
  if (F >= 2) p.ms(m, 0.42, 0.04, w + 0.02, 0, 0.8, 0, 'ovolo', 0); else p.bb(m, 0.42, 0.04, w + 0.02, 0, 0.8, 0, 0.012);
  // upper glazed case
  const y0 = 0.84, y1 = 1.92, iw = w - 0.08;
  p.b(m, 0.3, y1 - y0, 0.02, -0.04, y0, -w / 2 + 0.03); p.b(m, 0.3, y1 - y0, 0.02, -0.04, y0, w / 2 - 0.03); p.b(m, 0.02, y1 - y0, w - 0.04, -0.18, y0, 0);
  const n = 4, sh = (y1 - y0 - 0.02) / n;
  for (let i = 0; i < n; i++) {
    const y = y0 + i * sh; p.b(m, 0.28, 0.02, iw, -0.04, y, 0);
    bookRow(p, 0.08, y + 0.02, -iw / 2, iw / 2, 0.2, Math.min(0.28, sh - 0.04), (o.seed ?? 7) * 13 + i);
  }
  p.b(m, 0.3, 0.02, iw, -0.04, y1 - 0.02, 0);
  for (const s of [-1, 1]) {
    const z = s * w / 4, dw = w / 2 - 0.03, dh = y1 - y0;
    for (const [sz, a, b] of [[0, -dw / 2, -dw / 2 + 0.04], [0, dw / 2 - 0.04, dw / 2]]) { void sz; p.bb(m, 0.022, dh, b - a, 0.115, y0, z + (a + b) / 2, 0.005); }
    p.bb(m, 0.022, 0.05, dw, 0.115, y0, z, 0.005); p.bb(m, 0.022, 0.05, dw, 0.115, y1 - 0.05, z, 0.005);
    for (const t of [1 / 3, 2 / 3]) p.b(m, 0.012, dh - 0.1, 0.012, 0.12, y0 + 0.05, z - dw / 2 + dw * t);
    for (let k = 1; k < 3; k++) p.b(m, 0.012, 0.012, dw - 0.08, 0.12, y0 + (dh * k) / 3, z);
    p.b(M.glass, 0.004, dh - 0.1, dw - 0.08, 0.112, y0 + 0.05, z);
    knob(p, 0.126, y0 + dh * 0.45, z - s * (dw / 2 - 0.05), 0.009);
  }
  p.bb(m, 0.4, 0.06, w, -0.01, y1, 0, 0.012);
  p.ms(m, 0.46, 0.07, w + 0.06, 0.005, y1 + 0.06, 0, 'crown', 0); // coved cornice
});

export const shelves = def('shelves', (o) => [o.w ?? 1.5, 0.45, 1.9], (p, o) => {
  const w = o.w ?? 1.5, m = matOf(o.mat, M.pine), kind = o.kind ?? 'stores', r = rngOf(17 + (o.v ?? 0) * 31 + w * 10);
  for (const s of [-1, 1]) p.b(m, 0.45, 1.9, 0.035, 0, 0, s * (w / 2 - 0.018));
  if (w > 1.3) p.b(m, 0.39, 1.87, 0.025, -0.02, 0, 0);
  const lv = [0.12, 0.6, 1.08, 1.56];
  for (const y of lv) { p.b(m, 0.41, 0.025, w - 0.07, -0.01, y, 0); p.b(m, 0.02, 0.05, w - 0.07, 0.205, y + 0.025, 0); } // board + fiddle rail
  p.b(m, 0.43, 0.025, w - 0.07, 0, 1.875, 0);
  const cells = (fn) => { for (let i = 0; i < lv.length; i++) { const y = lv[i] + 0.025; if (kind === 'stores' && i === 0 && r() < 0.6) continue; if (w > 1.3) { fn(y, -w / 2 + 0.04, -0.015, i, 0); fn(y, 0.015, w / 2 - 0.04, i, 1); } else fn(y, -w / 2 + 0.04, w / 2 - 0.04, i, 0); } };
  if (kind === 'crockery') {
    cells((y, z0, z1, i) => {
      const L = z1 - z0;
      if (i % 2 === 0) { for (let k = 0; k < Math.min(2, Math.floor(L / 0.24)); k++) { const n = 6 + Math.floor(r() * 8), h = n * 0.012; p.lathe(M.porcelain, [[0, 0], [0.11, 0.008], [0.115, h], [0, h - 0.004]], -0.02, y, z0 + 0.12 + k * 0.24, 12); } }
      else { for (let k = 0; k < Math.min(3, Math.floor(L / 0.13)); k++) { const z = z0 + 0.07 + k * 0.2; p.lathe(M.porcelain, [[0, 0], [0.03, 0], [0.044, 0.065], [0, 0.03]], 0.06, y, z, 7); if (k % 2) p.lathe(M.porcelain, [[0, 0], [0.04, 0], [0.05, 0.16], [0.03, 0.2], [0, 0.2]], -0.1, y, z, 7); } }
    });
  } else if (kind === 'bottles') {
    cells((y, z0, z1, i) => { if (i === 3) return; for (let z = z0 + 0.04; z < z1 - 0.03; z += 0.11) { const c = [AT.bottleGreen, AT.amber, AT.claret, AT.clearGlass][Math.floor(r() * 4)]; p.alathe(c, [[0, 0], [0.033, 0.2], [0.011, 0.27], [0, 0.31]], 0.0, y, z, 6); } });
  } else if (kind === 'linen') {
    cells((y, z0, z1) => { for (let z = z0 + 0.02; z < z1 - 0.2; z += 0.25) { const n = 3 + Math.floor(r() * 4); p.bb(r() < 0.8 ? M.linen : M.paintCream, 0.34, 0.06 * n, 0.22, (r() - 0.5) * 0.02, y, z + 0.11, 0.015).rotation.y = (r() - 0.5) * 0.06; } });
  } else if (kind === 'stores') {
    cells((y, z0, z1) => {
      for (let z = z0 + 0.03 + r() * 0.15, cnt = 0; z < z1 - 0.1 && cnt < 1 + (r() < 0.4 ? 1 : 0); cnt++) {
        const k = r();
        if (z + (k < 0.35 ? 0.13 : k < 0.65 ? 0.32 : k < 0.85 ? 0.12 : 0.27) > z1) break;
        if (k < 0.35) { p.c(r() < 0.5 ? M.chrome : M.copper, 0.06, 0.16, 0.05, y, z + 0.06, 7); p.ab(AT.labelRed + Math.floor(r() * 3), 0.001, 0.08, 0.06, 0.111, y + 0.04, z + 0.06); z += 0.16 + r() * 0.1; }
        else if (k < 0.65) { const bw = 0.2 + r() * 0.1, bh = 0.12 + r() * 0.2; p.ab([AT.paper, AT.ochre, AT.label, AT.khaki][Math.floor(r() * 4)], 0.3, bh, bw, -0.03, y, z + bw / 2); if (r() < 0.4) p.ab([AT.paper, AT.label][Math.floor(r() * 2)], 0.26, 0.1, bw - 0.04, -0.03, y + bh, z + bw / 2); z += bw + 0.03 + r() * 0.08; }
        else if (k < 0.85) { p.alathe(AT.amber, [[0, 0], [0.05, 0], [0.055, 0.16], [0.035, 0.19], [0, 0.2]], 0.04, y, z + 0.06, 6); z += 0.16; }
        else { p.pil(M.canvas, 0.3, 0.22, 0.24, -0.02, y, z + 0.13, 0.7, 0.55, 2, 8); z += 0.3; }
      }
    });
  } else if (kind === 'empty' && o.mat) {
    cells((y, z0, z1) => { for (let z = z0 + 0.24; z < z1 - 0.05; z += 0.24) p.b(m, 0.4, 0.44, 0.012, -0.01, y, z); for (let z = z0 + 0.05; z < z1 - 0.1; z += 0.24) if (r() < 0.6) p.ab(AT.paper, 0.22, 0.008 + r() * 0.06, 0.16, -0.02, y, z + 0.08); });
  }
});

export const safe = def('safe', [0.65, 0.6, 0.95], (p) => {
  p.bb(M.iron, 0.58, 0.9, 0.63, -0.01, 0.05, 0, 0.025);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.lathe(M.iron, [[0, 0], [0.03, 0], [0.035, 0.03], [0.02, 0.05], [0, 0.05]], sx * 0.22, 0, sz * 0.25, 8);
  p.bb(M.steelDark, 0.03, 0.74, 0.5, 0.29, 0.13, -0.01, 0.012);
  p.fp(M.steelDark, 0.44, 0.66, 0.305, 0.5, -0.01, 0.008, 0.04);
  for (const y of [0.25, 0.75]) p.c(M.steelDark, 0.022, 0.1, 0.29, y - 0.05, -0.27, 8);
  p.latheX(M.brass, [[0, 0], [0.06, 0], [0.065, 0.01], [0.05, 0.02], [0.02, 0.025], [0, 0.03]], 0.32, 0.62, -0.01, 20);
  p.t(M.brass, 0.07, 0.008, 0.33, 0.4, -0.01, 'x', 14, 4);
  for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 2 + 0.3; const s = p.b(M.brass, 0.012, 0.14, 0.012, 0.33, 0.33, -0.01); s.rotation.x = a; }
  p.b(K.plate, 0.003, 0.05, 0.16, 0.319, 0.8, -0.01);
});

// ============================================================ washing / sanitary

export const dressingTable = def('dressingTable', [1.0, 0.5, 1.62], (p, o) => {
  const m = matOf(o.mat, M.mahogany);
  for (const s of [-1, 1]) {
    p.fr(m, 0.46, 0.32, 0.44, 0.3, 0.05, -0.005, 0, s * 0.34, { bottom: false });
    p.bb(m, 0.44, 0.66, 0.3, -0.01, 0.05, s * 0.34, 0.008);
    for (let i = 0; i < 3; i++) drawer(p, m, 0.27, 0.19, 0.235, 0.17 + i * 0.205, s * 0.34, 1, false);
  }
  drawer(p, m, 0.36, 0.1, 0.235, 0.66, 0, 1, false);
  const F = FINE();
  if (F >= 2) p.ms(m, 0.5, 0.035, 1.0, 0, 0.72, 0, 'ovolo', 0.02); else p.bb(m, 0.5, 0.035, 1.0, 0, 0.72, 0, 0.012);
  // swing mirror between turned uprights + jewel drawers
  for (const s of [-1, 1]) {
    p.b(m, 0.2, 0.12, 0.2, -0.13, 0.755, s * 0.36);
    p.lathe(m, [[0, 0], [0.022, 0], [0.013, 0.05], [0.013, 0.5], [0.02, 0.56], [0.012, 0.64], [0, 0.7]], -0.18, 0.875, s * 0.3, 6);
    p.c(M.brass, 0.012, 0.04, -0.18, 1.3, s * 0.27, 8).rotation.x = Math.PI / 2;
  }
  const mo = [], mi = [];
  for (let i = 0; i <= 14; i++) { const a = (i / 14) * Math.PI * 2; mo.push([Math.cos(a) * 0.24, Math.sin(a) * 0.33]); mi.push(new THREE.Vector2(Math.cos(-a) * 0.205, Math.sin(-a) * 0.295)); }
  const sh = new THREE.Shape(mo.map(([a, b]) => new THREE.Vector2(a, b))); sh.holes.push(new THREE.Path(mi));
  p.extX(m, sh, 0.03, -0.18, 1.3, 0, 0);
  const mg = G.extrude(mi.map((v) => [v.x * 1.02, v.y * 1.02]), 0.006); const mm = p.add(mg, M.mirror, -0.18, 1.3, 0); mm.rotation.y = Math.PI / 2;
  // toilet set: tray, brush, perfume bottles, hand mirror
  p.lathe(M.brass, [[0, 0], [0.12, 0], [0.125, 0.01], [0, 0.004]], 0.05, 0.755, -0.05, 12).scale.set(1, 1, 1.5);
  for (const [dz, c] of [[-0.14, AT.rose], [-0.06, AT.clearGlass], [0.02, AT.amber]]) p.alathe(c, [[0, 0], [0.028, 0], [0.025, 0.07], [0.008, 0.09], [0.012, 0.11], [0, 0.12]], 0.05, 0.76, dz, 6);
  p.b(M.woodDark, 0.06, 0.03, 0.22, 0.1, 0.755, 0.18);
  if (F >= 2) { hairBrush(p, 0.16, 0.755, -0.36, Math.PI, M.woodDark); handMirror(p, 0.17, 0.755, 0.39, Math.PI / 2, M.chrome); }
  if (F >= 3) p.lathe(M.porcelain, [[0, 0], [0.03, 0], [0.04, 0.025], [0.036, 0.04], [0.012, 0.046], [0.014, 0.056], [0, 0.058]], 0.0, 0.755, 0.17, 10); // powder bowl
});

/** fold-down wash cabinet ("compactum") of 2nd / 3rd class and crew cabins */
export const washstand = def('washstand', [0.6, 0.42, 1.6], (p, o) => {
  const m = matOf(o.mat, M.mahogany);
  p.fr(m, 0.42, 0.6, 0.4, 0.58, 0.06, 0, 0, 0, { bottom: false });
  p.bb(m, 0.38, 0.62, 0.58, -0.01, 0.06, 0, 0.008);
  for (const s of [-1, 1]) p.b(m, 0.38, 0.1, 0.04, -0.01, 0.68, s * 0.27);
  p.b(m, 0.02, 0.1, 0.5, 0.17, 0.68, 0);
  cabDoor(p, m, 0.5, 0.5, 0.2, 0.1, 0, { knobAt: 0.2, panels: 1 });
  // folded-down basin unit: marble slab with oval basin, brass tap from the tank cabinet above
  slabWithHoles(p, M.marble, 0.42, 0.03, 0.6, 0, 0.78, 0, [[0.02, 0, 0.135, 0.18]], 0);
  const bowl = p.rev(M.porcelain, [{ o: 0.185, y: 0.006 }, { o: 0.16, y: 0.003 }, { o: 0.14, y: -0.05 }, { o: 0.09, y: -0.09 }, { o: 0.02, y: -0.1 }], { seg: 18, capTop: true }, 0.02, 0.812, 0);
  bowl.scale.set(0.75, 1, 1);
  p.bb(m, 0.15, 0.74, 0.6, -0.135, 0.81, 0, 0.008);                                    // tank cabinet
  p.bb(m, 0.17, 0.04, 0.62, -0.125, 1.55, 0, 0.01);
  p.bb(M.woodDark, 0.012, 0.44, 0.44, -0.054, 1.0, 0, 0.004); p.b(M.mirror, 0.004, 0.38, 0.38, -0.048, 1.03, 0);
  p.latheX(M.brass, [[0, 0], [0.012, 0], [0.01, 0.06], [0.008, 0.1], [0, 0.1]], -0.06, 0.92, 0, 8);
  p.c(M.brass, 0.012, 0.03, -0.01, 0.89, 0, 8);

  // brass rack with carafe and glasses, soap dish, towel on the side rail
  if (o.items !== false) { p.lathe(M.glass, SHAPES.CARAFE, -0.01, 1.59, 0.2, 8); p.lathe(M.glass, SHAPES.TUMBLER, -0.02, 1.59, -0.2, 6); }
  p.lathe(M.porcelain, [[0, 0], [0.04, 0], [0.05, 0.015], [0, 0.008]], 0.15, 0.81, -0.24, 8).scale.set(1, 1, 1.4);
  if (FINE() >= 2) { soapOn(p, 0.15, 0.816, -0.24, 0.3); toothMug(p, 0.14, 0.81, 0.23); }
  p.cx(M.brass, 0.008, 0.34, 0, 0.7, 0.296, 6);
  p.bb(M.linen, 0.26, 0.28, 0.03, 0.02, 0.42, 0.296, 0.01); p.cx(M.linen, 0.02, 0.26, 0.02, 0.7, 0.296, 8);
});

export const washbasinMarble = def('washbasinMarble', (o) => [o.double ? 1.5 : 0.8, 0.5, o.mirror === false ? 1.05 : 1.75], (p, o) => {
  const w = o.double ? 1.5 : 0.8;
  slabWithHoles(p, M.marble, 0.5, 0.05, w, 0, 0.82, 0, (o.double ? [-0.38, 0.38] : [0]).map((z) => [0.03, z, 0.145, 0.18]), 0);
  const sp =[[-w / 2, 0], [w / 2, 0], [w / 2, 0.2], [w / 2 - 0.05, 0.24], [w * 0.25, 0.26], [0, 0.3], [-w * 0.25, 0.26], [-w / 2 + 0.05, 0.24], [-w / 2, 0.2]];
  p.extX(M.marble, sp, 0.035, -0.23, 0.87, 0, 0);
  for (const s of [-1, 1]) {
    p.lathe(M.brass, [[0, 0], [0.026, 0], [0.016, 0.05], [0.015, 0.4], [0.022, 0.45], [0.014, 0.5], [0.014, 0.76], [0.024, 0.8], [0, 0.82]], 0.19, 0, s * (w / 2 - 0.06), 6);
    p.b(M.brass, 0.25, 0.03, 0.025, -0.1, 0.78, s * (w / 2 - 0.06));
  }
  p.cz(M.brass, 0.01, w - 0.12, 0.19, 0.16, 0, 6);
  for (const z of o.double ? [-0.38, 0.38] : [0]) {
    p.rev(M.porcelain, [{ o: 0.185, y: 0.002 }, { o: 0.16, y: -0.06 }, { o: 0.1, y: -0.11 }, { o: 0.02, y: -0.12 }], { seg: 16, capTop: true }, 0.03, 0.871, z).scale.set(0.8, 1, 1);
    p.lathe(M.chrome, [[0, 0], [0.018, 0], [0.01, 0.02], [0.01, 0.1], [0, 0.11]], -0.165, 0.87, z, 6);
    p.loft(M.chrome, [[-0.165, 0.96, z], [-0.13, 0.985, z], [-0.08, 0.97, z], [-0.07, 0.94, z]], 0.009, 6);
    for (const s of [-1, 1]) {
      p.lathe(M.chrome, [[0, 0], [0.016, 0], [0.009, 0.05], [0, 0.055]], -0.17, 0.87, z + s * 0.1, 6);
      p.b(M.porcelain, 0.06, 0.012, 0.012, -0.17, 0.92, z + s * 0.1);
    }
    p.lathe(M.porcelain, [[0, 0], [0.04, 0], [0.045, 0.012], [0, 0.006]], 0.1, 0.871, z + 0.24 * (z <= 0 ? 1 : -1), 8);
    if (FINE() >= 2) soapOn(p, 0.1, 0.877, z + 0.24 * (z <= 0 ? 1 : -1), 0.4);
  }
  p.lathe(M.glass, SHAPES.TUMBLER, -0.12, 0.871, -w / 2 + 0.1, 6);
  if (o.mirror !== false) {
    p.bb(M.mahogany, 0.035, 0.62, w * 0.8, -0.232, 1.13, 0, 0.012);
    p.b(M.gold, 0.008, 0.56, w * 0.8 - 0.06, -0.214, 1.16, 0);
    p.b(M.mirror, 0.005, 0.52, w * 0.8 - 0.1, -0.208, 1.18, 0);
    p.b(M.glass, 0.12, 0.008, w * 0.6, -0.17, 1.1, 0);
    for (const s of [-1, 1]) p.b(M.brass, 0.1, 0.02, 0.01, -0.19, 1.08, s * w * 0.28);
    if (FINE() >= 2) { // toilet things on the glass shelf
      toothMug(p, -0.17, 1.108, w * 0.2);
      p.alathe(AT.amber, [[0, 0], [0.028, 0], [0.028, 0.1], [0.01, 0.13], [0.01, 0.15], [0, 0.15]], -0.17, 1.108, -w * 0.18, 6);
      if (FINE() >= 3) p.alathe(AT.blueGlass, [[0, 0], [0.022, 0], [0.024, 0.07], [0.008, 0.09], [0.012, 0.11], [0, 0.11]], -0.17, 1.108, -w * 0.08, 6);
    }
  }
  p.b(M.linen, 0.03, 0.14, 0.3, 0.19, 0.02, w / 2 - 0.25);
});

export const basinSmall = def('basinSmall', [0.5, 0.4, 1.0], (p) => {
  p.bb(M.porcelain, 0.03, 0.22, 0.5, -0.185, 0.86, 0, 0.01);                            // splash back
  const lp = G.rectLoop(0.36, 0.48, 0.08, 2);
  p.rev(M.porcelain, [{ o: -0.05, y: -0.12 }, { o: 0, y: -0.04 }, { o: 0.01, y: 0 }, { o: 0.012, y: 0.015 }, { o: -0.008, y: 0.016 }, { o: -0.02, y: 0.005 }, { o: -0.05, y: -0.08 }, { o: -0.1, y: -0.1 }], { perim: lp, capBottom: true, capTop: true }, 0.0, 0.845, 0);
  p.lathe(M.iron, [[0, 0], [0.04, 0], [0.02, 0.03], [0.02, 0.72]], -0.12, 0, 0, 6);
  p.loft(M.chrome, [[0.0, 0.74, 0], [0.0, 0.6, 0], [-0.05, 0.55, 0], [-0.1, 0.58, 0], [-0.17, 0.58, 0]], 0.014, 5, false);
  p.lathe(M.brass, [[0, 0], [0.014, 0], [0.01, 0.06], [0, 0.07]], -0.13, 0.86, 0.1, 6);
  p.loft(M.brass, [[-0.13, 0.92, 0.1], [-0.08, 0.93, 0.1], [-0.06, 0.9, 0.1]], 0.008, 6);
  p.bb(M.paintCream, 0.06, 0.03, 0.09, -0.12, 0.865, -0.14, 0.01);
  if (FINE() >= 2) soapOn(p, -0.12, 0.895, -0.14, Math.PI / 2);
});

export const bathtub = def('bathtub', [1.75, 0.78, 0.65], (p, o) => {
  const lp = G.rectLoop(0.7, 1.68, 0.3, 5);
  p.rev(M.porcelain, [{ o: -0.06, y: 0.12 }, { o: -0.02, y: 0.16 }, { o: 0.0, y: 0.35 }, { o: 0.025, y: 0.58 }, { o: 0.04, y: 0.61 }, { o: 0.03, y: 0.635 }, { o: 0.0, y: 0.63 }, { o: -0.025, y: 0.6 }, { o: -0.05, y: 0.35 }, { o: -0.1, y: 0.2 }, { o: -0.13, y: 0.18 }], { perim: lp, capBottom: true, capTop: true }, 0, 0, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * 0.25, z = sz * 0.68;
    p.loft(M.brass, [[x, 0.18, z], [x + sx * 0.05, 0.12, z + sz * 0.02], [x + sx * 0.08, 0.05, z + sz * 0.03], [x + sx * 0.085, 0.02, z + sz * 0.035]], [0.035, 0.03, 0.026, 0.02], 7);
    p.s(M.brass, 0.028, x + sx * 0.085, 0.025, z + sz * 0.035, 1, 0.8, 1);
  }
  // taps and waste at the head end (−z)
  for (const s of [-1, 1]) {
    p.lathe(M.chrome, [[0, 0], [0.02, 0], [0.014, 0.03], [0.013, 0.13], [0.018, 0.15], [0, 0.16]], s * 0.08, 0.6, -0.8, 8);
    for (const a of [0, Math.PI / 2]) p.b(M.porcelain, 0.07, 0.012, 0.012, s * 0.08, 0.76, -0.8).rotation.y = a;
  }
  p.loft(M.chrome, [[0, 0.7, -0.83], [0, 0.74, -0.78], [0, 0.71, -0.7], [0, 0.66, -0.68]], 0.014, 8);
  p.cx(M.chrome, 0.012, 0.18, 0, 0.72, -0.81, 6);
  p.tube(M.chrome, [[0, 0.62, -0.72], [0.03, 0.45, -0.73], [0.0, 0.25, -0.74]], 0.003, 8, 3);
  if (o.wood) { p.bb(M.mahogany, 0.035, 0.6, 1.76, 0.38, 0, 0, 0.006); for (let i = 0; i < 3; i++) { const f = p.fp(M.mahogany, 0.48, 0.4, 0.3975, 0.32, -0.56 + i * 0.56, 0.008, 0.04); void f; } p.bb(M.mahogany, 0.06, 0.03, 1.78, 0.37, 0.6, 0, 0.008); }
});

export const wc = def('wc', [0.5, 0.72, 1.95], (p, o) => {
  const pan = p.lathe(M.porcelain, [[0, 0], [0.13, 0], [0.1, 0.12], [0.13, 0.28], [0.17, 0.37], [0.175, 0.39], [0.13, 0.39], [0.05, 0.25], [0, 0.24]], 0.08, 0, 0, 12);
  pan.scale.set(1.15, 1, 0.95);
  p.bb(M.porcelain, 0.12, 0.3, 0.2, -0.12, 0.08, 0, 0.03);
  const seat = new THREE.Shape(); seat.absellipse(0, 0, 0.23, 0.2, 0, Math.PI * 2, false, 0); seat.autoClose = true;
  seat.holes.push(new THREE.Path().absellipse(0, 0, 0.15, 0.12, 0, Math.PI * 2, true, 0));
  p.extY(M.mahogany, seat, 0.025, 0.09, 0.39, 0, 0);
  const lid = new THREE.Shape(); lid.absellipse(0, 0, 0.2, 0.23, 0, Math.PI * 2, false, 0);
  p.extX(M.mahogany, lid, 0.02, -0.15, 0.64, 0, 0).rotation.z = 0.15;
  if (o.cistern !== false) {
    p.bb(M.iron, 0.22, 0.28, 0.46, -0.24, 1.62, 0, 0.02); p.bb(M.iron, 0.24, 0.03, 0.48, -0.23, 1.9, 0, 0.01);
    for (const s of [-1, 1]) p.b(M.iron, 0.12, 0.03, 0.02, -0.29, 1.6, s * 0.18);
    p.loft(M.brass, [[-0.24, 1.62, 0.12], [-0.27, 1.2, 0.08], [-0.27, 0.55, 0.0], [-0.24, 0.42, 0], [-0.2, 0.35, 0]], 0.018, 6, false);
    p.loft(M.iron, [[-0.12, 1.66, 0.16], [-0.12, 1.66, 0.24]], 0.006, 4);
    p.c(M.chrome, 0.003, 0.64, -0.12, 1.02, 0.24, 4);
    p.lathe(M.porcelain, [[0, 0], [0.015, 0], [0.02, 0.04], [0.012, 0.08], [0, 0.085]], -0.12, 0.94, 0.24, 8);
  }
  p.ab(AT.paper, 0.1, 0.11, 0.1, -0.25, 0.65, 0.22); p.b(M.brass, 0.07, 0.012, 0.012, -0.33, 0.755, 0.22); // paper on a holder from the wall
});

export const urinal = def('urinal', [0.5, 0.35, 1.3], (p) => {
  p.bb(M.porcelain, 0.04, 1.0, 0.46, -0.155, 0.25, 0, 0.012);
  const prof = [[0, 0], [0.12, 0], [0.18, 0.12], [0.2, 0.35], [0.19, 0.55], [0.12, 0.6]];
  p.add(G.lathe(prof, 12, 0, Math.PI), M.porcelain, -0.135, 0.45, 0).scale.set(0.8, 1, 1);
  p.add(G.lathe(prof.map(([r, y]) => [Math.max(0, r - 0.015), y]).reverse(), 12, 0, Math.PI, false), M.porcelain, -0.135, 0.45, 0).scale.set(0.8, 1, 1);
  p.add(G.lathe([[0.12, 0.6], [0.105, 0.6]], 12, 0, Math.PI, false), M.porcelain, -0.135, 0.45, 0).scale.set(0.8, 1, 1);
  for (const s of [-1, 1]) p.bb(M.marble, 0.32, 1.28, 0.025, -0.02, 0, s * 0.235, 0.008);
  p.c(M.chrome, 0.01, 0.25, -0.13, 1.05, 0, 6); p.cz(M.chrome, 0.008, 0.4, -0.15, 1.3, 0, 6);
  p.b(M.paintGrey, 0.3, 0.02, 0.4, 0, 0, 0);
});

export const showerBath = def('showerBath', [0.9, 0.9, 2.15], (p) => {
  const lp = G.rectLoop(0.86, 0.86, 0.12, 3);
  p.rev(M.porcelain, [{ o: -0.02, y: 0 }, { o: 0, y: 0.01 }, { o: 0.0, y: 0.13 }, { o: -0.025, y: 0.14 }, { o: -0.04, y: 0.04 }], { perim: lp, capTop: true }, 0, 0, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.c(M.chrome, 0.016, 1.95, sx * 0.2546, 0.12, sz * 0.2546, 8); // posts on the ring circle (r 0.36)
  for (const y of [0.55, 0.85, 1.15, 1.45]) p.t(M.chrome, 0.36, 0.014, 0, y, 0, 'y', 24, 5);
  p.t(M.chrome, 0.36, 0.012, 0, 2.06, 0, 'y', 24, 5);
  p.tube(M.chrome, [[-0.36, 2.06, 0], [-0.2, 2.06, 0], [0, 2.02, 0], [0, 1.915, 0]], 0.012, 8, 6);
  p.lathe(M.chrome, [[0, 0.06], [0.02, 0.06], [0.03, 0.03], [0.11, 0.0], [0.1, -0.01], [0, -0.01]], 0, 1.86, 0, 16);
  // valves on the 1.15 m ring pipe
  for (const [y, z] of [[1.15, -0.12], [1.15, 0.12]]) { p.latheX(M.chrome, [[0, 0], [0.02, 0], [0.015, 0.06], [0, 0.07]], -0.36, y, z, 8); p.t(M.chrome, 0.04, 0.005, -0.29, y, z, 'x', 10, 3); }
});

export const sink = def('sink', (o) => [o.w ?? 1.2, 0.6, 1.1], (p, o) => {
  const w = o.w ?? 1.2;
  // legs: under the basin up to its bottom (0.62), under the drainer up to the board (0.86)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const H = sz > 0 ? 0.86 : 0.62; p.lathe(M.iron, [[0, 0], [0.03, 0], [0.022, 0.03], [0.02, H - 0.02], [0, H]], sx * 0.22, 0, sz * (w / 2 - 0.06), 6); }
  const lp = G.rectLoop(0.58, w * 0.62, 0.04, 2);
  p.rev(M.porcelain, [{ o: -0.02, y: 0.62 }, { o: 0, y: 0.64 }, { o: 0, y: 0.9 }, { o: -0.04, y: 0.9 }, { o: -0.04, y: 0.68 }], { perim: lp, capBottom: true, capTop: true }, 0, 0, -w * 0.18);
  p.bb(M.oak, 0.56, 0.035, w * 0.36, 0, 0.86, w * 0.31, 0.006);
  for (let i = 0; i < 6; i++) p.b(M.oak, 0.5, 0.008, 0.012, 0, 0.895, w * 0.16 + i * w * 0.055);
  p.b(M.tileWhite, 0.03, 0.4, w, -0.285, 0.9, 0);
  for (const s of [-1, 1]) {
    // wall-mounted bib tap: flange on the tiled splash back (front face x = −0.27), spout curving down into the sink
    p.lathe(M.brass, [[0, 0], [0.018, 0], [0.012, 0.08], [0.012, 0.12], [0, 0.13]], -0.272, 1.02, -w * 0.18 + s * 0.12, 8).rotation.z = -Math.PI / 2;
    p.loft(M.brass, [[-0.2, 1.02, -w * 0.18 + s * 0.12], [-0.165, 0.99, -w * 0.18 + s * 0.12], [-0.155, 0.95, -w * 0.18 + s * 0.12]], 0.01, 6);
    p.c(M.brass, 0.005, 0.04, -0.2, 1.02, -w * 0.18 + s * 0.12, 6); p.t(M.brass, 0.022, 0.004, -0.2, 1.06, -w * 0.18 + s * 0.12, 'y', 8, 3);
  }
  p.tube(M.iron, [[0, 0.62, -w * 0.18], [0, 0.45, -w * 0.18], [-0.08, 0.4, -w * 0.18], [-0.28, 0.45, -w * 0.18]], 0.025, 10, 6);
});

// ============================================================ seating

const legShort = (p, m, x, z, h = 0.1) => p.lathe(m, FINE() >= 2
  ? [[0, 0], [0.018, 0], [0.022, h * 0.12], [0.017, h * 0.25], [0.03, h * 0.55], [0.03, h * 0.75], [0.036, h * 0.85], [0.034, h], [0, h]]
  : [[0, 0], [0.02, 0], [0.032, h * 0.5], [0.034, h], [0, h]], x, 0, z, 6);
/** carved / upholstered scroll on the front end of a rolled arm (arm axis along x, front at x), radii ry (y) × rz (z) */
function armScroll(p, f, x, y, z, ry, rz, wood = null) {
  const m = p.latheX(f, [[0, 0], [0.088, 0], [0.09, 0.006], [0.072, 0.012], [0.05, 0.009], [0.03, 0.014], [0, 0.013]], x, y, z, 10);
  m.scale.set(ry / 0.09, 1, rz / 0.09);
  if (wood && FINE() >= 3) p.latheX(wood, [[0, 0], [0.018, 0], [0.016, 0.008], [0, 0.012]], x + 0.012, y, z, 8);
}

export const sofa = def('sofa', (o) => [o.w ?? 1.8, 0.8, 0.9], (p, o) => {
  const f = matOf(o.mat, M.fabricRed), w = o.w ?? 1.8;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) legShort(p, M.woodDark, sx * 0.32, sz * (w / 2 - 0.08), 0.1);
  p.bb(f, 0.74, 0.28, w - 0.04, 0, 0.1, 0, 0.03);
  p.bb(M.woodDark, 0.025, 0.05, w - 0.24, 0.37, 0.1, 0, 0.008);
  const n = w > 1.5 ? 3 : 2, cw = (w - 0.34) / n;
  for (let i = 0; i < n; i++) cushion(p, f, 0.6, 0.14, cw - 0.01, 0.06, 0.37, -w / 2 + 0.17 + cw * (i + 0.5));
  p.bb(f, 0.2, 0.5, w - 0.06, -0.29, 0.38, 0, 0.04);
  tuftBack(p, f, w - 0.36, 0.38, -0.19, 0.64, 0, Math.max(3, Math.round(w * 3)), 2, 0.014, 0.025);
  p.loft(f, [[-0.39, 0.86, -w / 2 + 0.2], [-0.39, 0.88, 0], [-0.39, 0.86, w / 2 - 0.2]], 0.07, 6);
  for (const s of [-1, 1]) {
    p.bb(f, 0.74, 0.32, 0.14, 0, 0.36, s * (w / 2 - 0.08), 0.03);
    p.loft(f, [[-0.34, 0.69, s * (w / 2 - 0.075)], [0, 0.71, s * (w / 2 - 0.08)], [0.36, 0.69, s * (w / 2 - 0.075)]], [[0.095, 0.08], [0.095, 0.085], [0.095, 0.08]], 8);
    if (FINE() >= 2) armScroll(p, f, 0.352, 0.69, s * (w / 2 - 0.075), 0.096, 0.081, M.woodDark);
  }
});

/** 2nd-class sofa berth (mahogany frame) */
export const settee = def('settee', (o) => [o.w ?? 1.85, 0.62, 0.9], (p, o) => {
  const f = matOf(o.mat, M.fabricGreen), w = o.w ?? 1.85;
  p.bb(M.mahogany, 0.58, 0.32, w - 0.04, -0.01, 0.04, 0, 0.01);
  p.b(M.woodDark, 0.55, 0.04, w - 0.08, -0.01, 0, 0);
  for (let i = 0; i < 2; i++) { const f2 = p.fp(M.mahogany, w / 2 - 0.16, 0.2, 0.28, 0.2, (i ? 1 : -1) * (w / 4 - 0.02), 0.008, 0.035); void f2; }
  cushion(p, f, 0.56, 0.12, w - 0.14, 0.01, 0.35, 0);
  p.bb(M.mahogany, 0.06, 0.52, w, -0.28, 0.36, 0, 0.01);
  tuftBack(p, f, w - 0.16, 0.36, -0.248, 0.62, 0, Math.max(3, Math.round(w * 3)), 2, 0.012, 0.03);
  if (FINE() >= 2) p.ms(M.mahogany, 0.09, 0.04, w + 0.02, -0.27, 0.86, 0, 'thumb', 0.012); else p.bb(M.mahogany, 0.09, 0.04, w + 0.02, -0.27, 0.86, 0, 0.012);
  for (const s of [-1, 1]) {
    const out = [[-0.3, 0], [0.3, 0], [0.3, 0.18], [0.27, 0.24], [0.2, 0.26], [0.1, 0.24], [-0.05, 0.3], [-0.2, 0.38], [-0.3, 0.42]];
    p.extZ(M.mahogany, out, 0.05, 0, 0.32, s * (w / 2 - 0.025), 0.008);
  }
});

function clubChair(p, f) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) legShort(p, M.woodDark, sx * 0.3, sz * 0.3, 0.07);
  p.bb(f, 0.74, 0.24, 0.62, 0.0, 0.07, 0, 0.04);
  cushion(p, f, 0.56, 0.13, 0.5, 0.07, 0.3, 0);
  p.bb(f, 0.2, 0.56, 0.72, -0.28, 0.3, 0, 0.05);
  p.pil(f, 0.06, 0.42, 0.48, -0.2, 0.42, 0, 0.5, 0.3, 2, 8);
  p.loft(f, [[-0.37, 0.84, -0.3], [-0.38, 0.87, 0], [-0.37, 0.84, 0.3]], 0.065, 6);
  for (const s of [-1, 1]) {
    p.bb(f, 0.72, 0.3, 0.13, 0, 0.27, s * 0.33, 0.035);
    p.loft(f, [[-0.32, 0.6, s * 0.335], [0.0, 0.61, s * 0.335], [0.34, 0.59, s * 0.335]], [[0.085, 0.07], [0.085, 0.075], [0.085, 0.07]], 8);
    if (FINE() >= 2) armScroll(p, f, 0.332, 0.59, s * 0.335, 0.086, 0.071);
    if (FINE() >= 3) for (let i = 0; i < 6; i++) p.latheX(M.brass, [[0, 0], [0.006, 0], [0.004, 0.004], [0, 0.005]], 0.358, 0.3 + i * 0.045, s * 0.33, 5); // brass nail heads
  }
}
export const armchair = def('armchair', (o) => (o.kind === 'wicker' ? [0.66, 0.66, 0.9] : [0.8, 0.8, 0.9]), (p, o) => {
  const kind = o.kind ?? 'club';
  if (kind === 'wicker') {
    // barrel-backed wicker chair (Café Parisien / Verandah / Palm Court)
    const a0 = Math.PI * 0.89, al = Math.PI * 1.22; // back wraps round −x, opening towards +x
    const hb = (u) => 0.58 + 0.24 * Math.pow(Math.sin(Math.PI * u), 1.5);
    p.add(G.arcWall(0.33, 0.03, a0, al, 0.02, hb, 18), K.cane, 0, 0, 0);
    const rim = []; for (let i = 0; i <= 12; i++) { const a = a0 + (al * i) / 12; rim.push([Math.sin(a) * 0.315, 0.6 + 0.24 * Math.pow(Math.sin((Math.PI * i) / 12), 1.5), Math.cos(a) * 0.315]); }
    p.tube(M.wicker, rim, 0.022, 14, 5);
    p.lathe(K.cane, [[0, 0.02], [0.29, 0.02], [0.3, 0.2], [0.305, 0.44], [0, 0.44]], 0, 0, 0, 16);
    p.pil(matOf(o.mat, M.fabricGreen), 0.5, 0.08, 0.5, 0.02, 0.43, 0, 0.45, 0.9, 3, 12);
    for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; p.c(M.wicker, 0.018, 0.04, Math.cos(a) * 0.26, 0, Math.sin(a) * 0.26, 6); }
    return;
  }
  const f = matOf(o.mat, kind === 'club' ? M.leather : M.fabricRed);
  if (kind === 'club') { clubChair(p, f); return; }
  // upholstered bergère with carved walnut frame and cabriole legs
  const wd = M.woodDark;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) cabriole(p, wd, 0.3, sx * 0.29, sz * 0.29, sx * 0.7, sz * 0.7, 0.026, 0, 4);
  if (FINE() >= 2) p.ms(wd, 0.64, 0.09, 0.64, 0, 0.28, 0, 'thumb', 0.02); else p.bb(wd, 0.64, 0.09, 0.64, 0, 0.28, 0, 0.012);
  p.bb(f, 0.6, 0.06, 0.6, 0.0, 0.36, 0, 0.02);
  cushion(p, f, 0.54, 0.1, 0.52, 0.04, 0.4, 0);
  // back: carved frame with upholstered panel
  const bo = []; for (let i = 0; i <= 10; i++) { const t = i / 10, a = Math.PI * t; bo.push([-Math.cos(a) * 0.32, 0.36 + Math.sin(a) * 0.1 + (t > 0.35 && t < 0.65 ? 0.015 : 0)]); }
  const shape = new THREE.Shape([new THREE.Vector2(-0.32, 0), new THREE.Vector2(0.32, 0), ...bo.reverse().map(([a, b]) => new THREE.Vector2(a, b))]);
  const hole = new THREE.Path(); hole.moveTo(-0.26, 0.05); hole.lineTo(-0.26, 0.32); hole.quadraticCurveTo(0, 0.44, 0.26, 0.32); hole.lineTo(0.26, 0.05); hole.lineTo(-0.26, 0.05); shape.holes.push(hole);
  const fr = p.extX(wd, shape, 0.045, -0.3, 0.42, 0, 0); fr.rotation.z = 0.1;
  const pad = p.pil(f, 0.06, 0.4, 0.54, -0.29, 0.44, 0, 0.5, 0.25, 3, 10); pad.rotation.z = 0.1;
  if (FINE() >= 3) p.latheX(wd, [[0, 0], [0.03, 0], [0.032, 0.008], [0.02, 0.014], [0.008, 0.012], [0, 0.02]], -0.324, 0.85, 0, 10); // carved rosette on the crest

  for (const s of [-1, 1]) {
    p.loft(wd, [[-0.28, 0.66, s * 0.31], [0.0, 0.635, s * 0.325], [0.26, 0.6, s * 0.32], [0.3, 0.45, s * 0.305], [0.28, 0.36, s * 0.29]], 0.021, 5);
    p.pil(f, 0.32, 0.035, 0.07, 0.0, 0.645, s * 0.325, 0.5, 0.4, 2, 8);
  }
});

export const chairDining = def('chairDining', [0.48, 0.5, 0.96], (p, o) => {
  const cls = o.cls ?? 'first';
  const wood = matOf(o.mat, cls === 'first' ? M.woodDark : cls === 'second' ? M.mahogany : M.oak), seat = matOf(o.seat, cls === 'first' ? M.leatherGreen : cls === 'second' ? M.fabricRed : wood);
  const sy = 0.44;
  // front legs turned, back legs rising into the back posts (slight rake)
  for (const sz of [-1, 1]) {
    if (cls === 'plain') taperLeg(p, wood, sy - 0.04, 0.19, sz * 0.19, 0.035, 0.028); else turnedLeg(p, wood, sy - 0.04, 0.19, sz * 0.19, 0.022, 0, 8);
    const bl = p.fr(wood, 0.032, 0.032, 0.036, 0.036, 0.96, -0.2, 0, sz * 0.19); bl.rotation.z = 0.06;
    p.lathe(wood, [[0, 0], [0.022, 0], [0.025, 0.02], [0.012, 0.045], [0, 0.05]], -0.23, 0.95, sz * 0.19, 8);
  }
  if (FINE() >= 2 && cls !== 'plain') { // turned H-stretcher
    const st = [[0.009, 0], [0.012, 0.03], [0.008, 0.09], [0.013, 0.18], [0.008, 0.27], [0.012, 0.33], [0.009, 0.36]];
    for (const sz of [-1, 1]) p.latheX(wood, st, -0.18, 0.1325, sz * 0.19, 6, 1);
    p.latheZ(wood, st, 0, 0.1325, -0.18, 6, 1);
  } else {
    for (const sz of [-1, 1]) p.b(wood, 0.36, 0.025, 0.022, 0, 0.12, sz * 0.19);
    p.b(wood, 0.022, 0.025, 0.36, 0.0, 0.12, 0);
  }
  p.bb(wood, 0.46, 0.06, 0.44, 0, sy - 0.04, 0, 0.008);
  if (cls === 'plain') {
    p.bb(wood, 0.46, 0.025, 0.44, 0, sy + 0.02, 0, 0.006);
    p.bb(wood, 0.035, 0.08, 0.38, -0.215, 0.84, 0, 0.008); p.bb(wood, 0.03, 0.05, 0.38, -0.205, 0.6, 0, 0.006);
    for (let i = -2; i <= 2; i++) {
      if (FINE() >= 2) p.lathe(wood, [[0.007, 0], [0.01, 0.04], [0.006, 0.09], [0.011, 0.14], [0.007, 0.2]], -0.21, 0.65, i * 0.07, 6); // turned spindles
      else p.c(wood, 0.008, 0.2, -0.21, 0.65, i * 0.07, 6);
    }
    return;
  }
  p.pil(seat, 0.44, 0.07, 0.42, 0.01, sy + 0.01, 0, 0.35, 0.18, 3, 12, 0.005);
  if (cls === 'first') p.b(M.brass, 0.004, 0.012, 0.4, 0.232, sy + 0.012, 0);
  // back: carved crest rail, upholstered panel
  const crest = [[-0.21, 0], [0.21, 0], [0.21, 0.07], [0.15, 0.09], [0.07, 0.085], [0.03, 0.12], [0, 0.135], [-0.03, 0.12], [-0.07, 0.085], [-0.15, 0.09], [-0.21, 0.07]];
  p.extX(wood, crest, 0.035, -0.225, 0.82, 0, 0.006).rotation.z = 0.06;
  p.pil(seat, 0.04, 0.3, 0.34, -0.21, 0.52, 0, 0.5, 0.2, 3, 10).rotation.z = 0.06;
  p.bb(wood, 0.035, 0.04, 0.38, -0.205, 0.5, 0, 0.006);
});

/** 2nd-class dining chair: swivel chair bolted to the floor */
export const swivelChair = def('swivelChair', [0.48, 0.5, 0.92], (p, o) => {
  const f = matOf(o.mat, M.fabricRed);
  p.lathe(M.iron, [[0, 0], [0.17, 0], [0.17, 0.012], [0.1, 0.03], [0.045, 0.06], [0.03, 0.1], [0.032, 0.36], [0.05, 0.4], [0, 0.41]], 0, 0, 0, 14);
  p.bb(M.mahogany, 0.44, 0.04, 0.44, 0, 0.41, 0, 0.01);
  p.pil(f, 0.4, 0.06, 0.4, 0.01, 0.44, 0, 0.35, 0.25, 3, 12);
  const a0 = Math.PI * 1.12, al = Math.PI * 0.76;
  p.add(G.arcWall(0.205, 0.018, a0, al, 0, 0.42, 12), M.mahogany, 0.02, 0.47, 0);
  p.add(G.lathe([[0.18, 0.3], [0.185, 0.18], [0.18, 0.05]], 14, a0 + 0.12, al - 0.24, false), f, 0.02, 0.47, 0);
  p.tube(M.mahogany, Array.from({ length: 9 }, (_, i) => { const a = a0 + (al * i) / 8; return [0.02 + Math.sin(a) * 0.2, 0.89, Math.cos(a) * 0.2]; }), 0.018, 16, 6);
});

export const bench = def('bench', (o) => [o.w ?? 1.8, 0.48, o.back === false ? 0.45 : 0.88], (p, o) => {
  const w = o.w ?? 1.8, m = matOf(o.mat, M.pine), iron = o.iron !== false, back = o.back !== false;
  for (let i = 0; i < 3; i++) p.bb(m, 0.12, 0.035, w, 0.13 - i * 0.13, 0.4, 0, 0.008);
  const n = Math.max(2, Math.round(w / 1.4) + 1);
  for (let i = 0; i < n; i++) {
    const z = -w / 2 + 0.06 + (i * (w - 0.12)) / (n - 1);
    if (iron) {
      const pr = back ? [[0.2, 0], [0.15, 0], [0.1, 0.3], [-0.1, 0.3], [-0.15, 0], [-0.2, 0], [-0.16, 0.36], [-0.21, 0.86], [-0.17, 0.86], [-0.12, 0.4], [0.2, 0.4], [0.22, 0.3]]
        : [[0.2, 0], [0.15, 0], [0.1, 0.3], [-0.1, 0.3], [-0.15, 0], [-0.2, 0], [-0.22, 0.3], [-0.2, 0.4], [0.2, 0.4], [0.22, 0.3]];
      p.extZ(M.iron, pr, 0.035, 0, 0, z, 0.004);
    } else { p.bb(m, 0.04, 0.4, 0.05, 0.15, 0, z, 0.006); p.bb(m, 0.04, back ? 0.86 : 0.4, 0.05, -0.17, 0, z, 0.006); p.b(m, 0.3, 0.04, 0.04, 0, 0.12, z); }
  }
  if (back) { p.bb(m, 0.025, 0.1, w, -0.2, 0.56, 0, 0.006); p.bb(m, 0.025, 0.1, w, -0.215, 0.72, 0, 0.006); }
  if (!iron) p.b(m, 0.03, 0.04, w - 0.1, 0, 0.12, 0);
});

export const stool = def('stool', [0.38, 0.38, 0.46], (p, o) => {
  const m = matOf(o.mat, M.mahogany);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) turnedLeg(p, m, 0.42, sx * 0.14, sz * 0.14, 0.02, 0, 6);
  for (const s of [-1, 1]) { p.b(m, 0.26, 0.02, 0.018, 0, 0.14, s * 0.14); p.b(m, 0.018, 0.02, 0.26, s * 0.14, 0.18, 0); }
  p.bb(m, 0.34, 0.04, 0.34, 0, 0.39, 0, 0.008);
  p.pil(matOf(o.seat, M.fabricRed), 0.34, 0.05, 0.34, 0, 0.42, 0, 0.4, 0.25, 3, 12);
});

export const barberChair = def('barberChair', [0.7, 1.1, 1.3], (p) => {
  p.lathe(M.iron, [[0, 0], [0.28, 0], [0.28, 0.02], [0.2, 0.05], [0.08, 0.08], [0, 0.08]], 0, 0, 0, 18);
  p.lathe(M.chrome, [[0, 0], [0.07, 0], [0.06, 0.05], [0.06, 0.34], [0.09, 0.4], [0, 0.42]], 0, 0.05, 0, 14);
  p.bb(M.porcelain, 0.5, 0.06, 0.52, 0.02, 0.44, 0, 0.015);
  p.pil(M.leather, 0.5, 0.09, 0.48, 0.02, 0.5, 0, 0.35, 0.2, 3, 12);
  const b = p.pil(M.leather, 0.1, 0.62, 0.48, -0.24, 0.52, 0, 0.4, 0.2, 3, 12); b.rotation.z = 0.25; // back meets the seat
  p.pil(M.leather, 0.08, 0.14, 0.26, -0.42, 1.11, 0, 0.6, 0.4, 3, 10).rotation.z = 0.25;
  p.c(M.chrome, 0.012, 0.25, -0.36, 0.92, 0, 6).rotation.z = 0.25;
  for (const s of [-1, 1]) { p.bb(M.porcelain, 0.42, 0.05, 0.07, 0.02, 0.72, s * 0.29, 0.015); p.loft(M.chrome, [[0.18, 0.72, s * 0.29], [0.2, 0.62, s * 0.29], [0.16, 0.47, s * 0.265]], 0.012, 6); p.loft(M.chrome, [[-0.18, 0.72, s * 0.29], [-0.2, 0.6, s * 0.29], [-0.16, 0.47, s * 0.265]], 0.012, 6); }
  const f = p.bb(M.chrome, 0.3, 0.025, 0.4, 0.42, 0.18, 0, 0.006); f.rotation.z = -0.4;
  p.loft(M.chrome, [[0.22, 0.45, 0], [0.3, 0.32, 0], [0.38, 0.22, 0]], 0.015, 6);
  p.latheX(M.chrome, [[0, 0], [0.015, 0], [0.012, 0.2], [0.025, 0.22], [0, 0.24]], 0.06, 0.12, 0.08, 8, 1);
});

// ============================================================ tables

export const tableRound = def('tableRound', (o) => [2 * (o.r ?? 0.5), 2 * (o.r ?? 0.5), o.lamp ? 1.05 : 0.78], (p, o) => {
  const r = o.r ?? 0.5, m = matOf(o.mat, M.mahogany), seg = r > 0.45 ? 20 : 16;
  const F = FINE();
  if (!o.cloth) {
    if (F >= 2) p.lathe(m, [[0, 0.705], [r - 0.03, 0.705], [r - 0.012, 0.711], [r, 0.724], [r, 0.735], [r - 0.006, 0.745], [r - 0.014, 0.75], [0, 0.75]], 0, 0, 0, seg); // moulded edge
    else p.lathe(m, [[0, 0.705], [r - 0.02, 0.705], [r, 0.725], [r - 0.01, 0.75], [0, 0.75]], 0, 0, 0, seg);
    p.lathe(m, [[0.0, 0.64], [r * 0.6, 0.64], [r * 0.6, 0.705], [0, 0.705]], 0, 0, 0, 10);
  } else p.c(m, r * 0.7, 0.04, 0, 0.66, 0, 10);
  if (F >= 2) p.lathe(m, [[0, 0.1], [0.075, 0.1], [0.07, 0.13], [0.045, 0.19], [0.05, 0.25], [0.072, 0.33], [0.05, 0.42], [0.04, 0.48], [0.045, 0.52], [0.038, 0.58], [0.05, 0.61], [0.09, 0.65], [0.09, 0.66], [0, 0.66]], 0, 0, 0, 8); // turned pedestal
  else p.lathe(m, [[0, 0.1], [0.07, 0.1], [0.045, 0.2], [0.07, 0.36], [0.04, 0.48], [0.04, 0.6], [0.09, 0.66], [0, 0.66]], 0, 0, 0, 8);
  const nf = r >= 0.4 ? 4 : 3, reach = Math.min(r * 0.72, 0.42);
  for (let i = 0; i < nf; i++) {
    const a = (i / nf) * Math.PI * 2 + Math.PI / 4, cx = Math.cos(a), cz = Math.sin(a);
    p.loft(m, [[cx * 0.04, 0.2, cz * 0.04], [cx * reach * 0.45, 0.14, cz * reach * 0.45], [cx * reach * 0.85, 0.05, cz * reach * 0.85], [cx * reach, 0.02, cz * reach]], [[0.03, 0.04], [0.025, 0.035], [0.02, 0.025], [0.02, 0.02]], 5);
    if (F >= 3) p.s(m, 0.026, cx * reach, 0.022, cz * reach, 1, 0.85, 1); // scrolled toe
  }
  if (o.cloth) {
    p.rev(M.linen, [{ o: r + 0.045, y: 0.5, m: 0.014 }, { o: r + 0.035, y: 0.66, m: 0.007 }, { o: r + 0.02, y: 0.745 }, { o: r - 0.02, y: 0.756 }], { seg: r > 0.45 ? 36 : 28, k: Math.round(r * 16), capTop: true }, 0, 0, 0);
  }
  const ty = o.cloth ? 0.756 : 0.75;
  if (o.set) { const n = o.set === true ? (r > 0.6 ? 6 : 4) : o.set; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + Math.PI / n; placeSetting(p, Math.cos(a) * (r - 0.17), ty, Math.sin(a) * (r - 0.17), a + Math.PI, true); } }
  if (o.lamp) tableLampOn(p, 0, ty, 0);
  else if (o.set) { p.lathe(M.glass, [[0, 0], [0.03, 0], [0.04, 0.05], [0.02, 0.12], [0.025, 0.15], [0, 0.14]], 0, ty, 0, 8); for (let i = 0; i < 5; i++) { const a = i * 1.26; p.ag(i % 2 ? 50 : 53, new THREE.SphereGeometry(0.025, 6, 4), Math.cos(a) * 0.03, ty + 0.17, Math.sin(a) * 0.03); } }
  if (o.items) papers(p, r * 0.25, ty, -r * 0.2, 0.4, 2);
});

export const tableRect = def('tableRect', (o) => [o.w ?? 1.2, o.d ?? 0.8, o.lamp ? 1.05 : 0.78], (p, o) => {
  const w = o.w ?? 1.2, d = o.d ?? 0.8, m = matOf(o.mat, M.mahogany);
  if (FINE() >= 2 && !o.cloth) p.ms(m, d, 0.035, w, 0, 0.715, 0, 'ovolo', 0.02); else p.bb(m, d, 0.035, w, 0, 0.715, 0, 0.012);
  for (const s of [-1, 1]) { p.bb(m, 0.022, 0.1, w - 0.16, s * (d / 2 - 0.06), 0.615, 0, 0.005); p.bb(m, d - 0.14, 0.1, 0.022, 0, 0.615, s * (w / 2 - 0.06), 0.005); }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) turnedLeg(p, m, 0.715, sx * (d / 2 - 0.07), sz * (w / 2 - 0.07), 0.034, 0, 6);
  if (o.cloth) p.rev(M.linen, [{ o: 0.04, y: 0.48, m: 0.012 }, { o: 0.032, y: 0.65, m: 0.006 }, { o: 0.02, y: 0.745 }, { o: -0.02, y: 0.755 }], { perim: G.rectLoop(d, w, 0.04, 1, 0.18), k: Math.round((w + d) * 4), capTop: true }, 0, 0, 0);
  const ty = o.cloth ? 0.755 : 0.75;
  if (o.set) {
    const n = Math.max(1, Math.round(w / 0.62));
    for (let i = 0; i < n; i++) { const z = -w / 2 + (w / n) * (i + 0.5); placeSetting(p, d / 2 - 0.17, ty, z, Math.PI, true); placeSetting(p, -d / 2 + 0.17, ty, z, 0, true); }
    if (!o.lamp) { // cruet stand
      p.lathe(M.chrome, [[0, 0], [0.06, 0], [0.06, 0.008], [0.008, 0.01], [0.006, 0.14], [0.015, 0.15], [0, 0.16]], 0, ty, w > 1.4 ? w * 0.2 : 0, 12);
      for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; p.lathe(M.glass, [[0, 0], [0.018, 0], [0.02, 0.05], [0.008, 0.08], [0.01, 0.09], [0, 0.09]], Math.cos(a) * 0.035, ty + 0.008, (w > 1.4 ? w * 0.2 : 0) + Math.sin(a) * 0.035, 6); }
    }
  }
  if (o.lamp) tableLampOn(p, 0, ty, 0);
  if (o.items) { papers(p, 0, ty, -w * 0.2, 0.3, 3); bookRow(p, -0.05, ty, w * 0.15, w * 0.15 + 0.16, 0.18, 0.22, 3, false); }
});

export const writingDesk = def('writingDesk', [1.1, 0.6, 1.1], (p, o) => {
  const m = matOf(o.mat, M.mahogany);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) taperLeg(p, m, 0.6, sx * 0.25, sz * 0.5, 0.05, 0.032);
  p.bb(m, 0.56, 0.12, 1.04, 0, 0.6, 0, 0.006);
  drawer(p, m, 0.5, 0.09, 0.285, 0.66, 0, 2, true);
  if (FINE() >= 2) p.ms(m, 0.6, 0.03, 1.1, 0, 0.72, 0, 'ogee', 0.02); else p.bb(m, 0.6, 0.03, 1.1, 0, 0.72, 0, 0.01);
  // gallery: pigeon holes + small drawers
  const gx = -0.21, gy = 0.75;
  p.bb(m, 0.17, 0.32, 1.06, gx, gy, 0, 0.006); p.bb(m, 0.19, 0.025, 1.08, gx + 0.01, gy + 0.32, 0, 0.008);
  p.extX(m, [[-0.53, 0], [0.53, 0], [0.53, 0.04], [0.2, 0.06], [0, 0.1], [-0.2, 0.06], [-0.53, 0.04]], 0.03, gx - 0.07, gy + 0.345, 0);
  p.b(M.woodDark, 0.005, 0.17, 0.9, gx + 0.086, gy + 0.11, 0);
  for (let i = 0; i <= 6; i++) p.b(m, 0.15, 0.17, 0.012, gx + 0.01, gy + 0.11, -0.45 + i * 0.15);
  p.b(m, 0.15, 0.012, 0.9, gx + 0.01, gy + 0.2, 0);
  for (let i = 0; i < 6; i++) { if (i % 2) p.ab(AT.paper, 0.1, 0.07, 0.11, gx + 0.03, gy + 0.21, -0.375 + i * 0.15); p.ab(AT.label, 0.08, 0.06, 0.1, gx + 0.04, gy + 0.115, -0.375 + i * 0.15); }
  for (let i = 0; i < 4; i++) drawer(p, m, 0.24, 0.1, gx + 0.085 + 0.022, gy + 0.055, -0.39 + i * 0.26, 1, false);
  // blotter, inkstand, pen, letter, lamp
  p.bb(M.leatherGreen, 0.34, 0.008, 0.62, 0.08, 0.75, 0.05, 0.003); p.b(M.paper, 0.3, 0.003, 0.5, 0.08, 0.758, 0.05);
  for (const sz of [-1, 1]) p.bb(M.leatherGreen, 0.36, 0.01, 0.06, 0.08, 0.758, 0.05 + sz * 0.29, 0.003);
  p.bb(M.brass, 0.12, 0.012, 0.22, -0.06, 0.75, -0.34, 0.004);
  for (const s of [-1, 1]) { p.lathe(M.glass, [[0, 0], [0.028, 0], [0.03, 0.04], [0.015, 0.05], [0, 0.05]], -0.06, 0.762, -0.34 + s * 0.05, 8); p.lathe(M.brass, [[0, 0], [0.016, 0], [0.012, 0.012], [0, 0.016]], -0.06, 0.81, -0.34 + s * 0.05, 8); }
  p.cz(K.ebony, 0.004, 0.16, 0.0, 0.754, -0.2, 6); // pen lying on the desk top
  papers(p, 0.12, 0.761, 0.1, 0.15, 1);
  tableLampOn(p, -0.05, 0.75, 0.42);
});

export const desk = def('desk', (o) => [o.w ?? 1.4, 0.7, 0.8], (p, o) => {
  const m = matOf(o.mat, M.oak), w = o.w ?? 1.4, pw = Math.min(0.42, w * 0.3);
  for (const s of [-1, 1]) {
    const z = s * (w / 2 - pw / 2 - 0.01);
    p.fr(m, 0.66, pw, 0.64, pw - 0.02, 0.06, 0, 0, z, { bottom: false });
    p.bb(m, 0.62, 0.67, pw - 0.02, -0.01, 0.06, z, 0.008); // pedestal carcass up to the top
    for (let i = 0; i < 3; i++) drawer(p, m, pw - 0.06, 0.19, 0.3 + 0.022, 0.18 + i * 0.205, z, 2, i === 0);
  }
  p.bb(m, 0.62, 0.11, w - 2 * pw + 0.02, -0.01, 0.62, 0, 0.006); // frieze drawer carcass over the kneehole
  drawer(p, m, w - 2 * pw - 0.06, 0.08, 0.322, 0.66, 0, 2, true);
  if (FINE() >= 2) p.ms(m, 0.7, 0.04, w, 0, 0.73, 0, 'ovolo', 0.02); else p.bb(m, 0.7, 0.04, w, 0, 0.73, 0, 0.012);
  p.b(M.leatherGreen, 0.5, 0.003, w - 0.2, 0.0, 0.77, 0);
  p.bb(M.leather, 0.3, 0.008, 0.46, 0.08, 0.773, 0.05, 0.003); p.b(M.paper, 0.27, 0.003, 0.4, 0.08, 0.781, 0.05);
  papers(p, 0.0, 0.774, w / 2 - 0.3, 0.2, 2);
  p.bb(M.brass, 0.14, 0.012, 0.24, -0.18, 0.773, -w / 2 + 0.3, 0.004);
  p.lathe(M.glass, [[0, 0], [0.028, 0], [0.03, 0.04], [0.015, 0.05], [0, 0.05]], -0.18, 0.785, -w / 2 + 0.3, 8);
  bookRow(p, -0.22, 0.77, -0.15, 0.1, 0.18, 0.24, 11, false);
});

export const chartTable = def('chartTable', [1.8, 0.9, 1.0], (p) => {
  p.fr(M.mahogany, 0.9, 1.8, 0.88, 1.78, 0.08, 0, 0, 0, { bottom: false });
  p.bb(M.mahogany, 0.86, 0.82, 1.76, -0.01, 0.08, 0, 0.01);
  for (let i = 0; i < 5; i++) for (const s of [-1, 1]) drawer(p, M.mahogany, 0.84, 0.14, 0.42 + 0.022, 0.17 + i * 0.155, s * 0.43, 2, false);
  p.bb(M.mahogany, 0.96, 0.04, 1.86, 0, 0.9, 0, 0.014);
  for (const s of [-1, 1]) p.bb(M.mahogany, 0.96, 0.03, 0.03, 0, 0.94, s * 0.915, 0.006);
  p.bb(M.mahogany, 0.03, 0.03, 1.86, -0.465, 0.94, 0, 0.006);
  p.b(K.chart, 0.78, 0.004, 1.3, 0.02, 0.94, 0.05);
  p.b(K.chart, 0.5, 0.003, 0.7, -0.1, 0.944, -0.45).rotation.y = 0.2;
  const rule = p.bb(M.woodDark, 0.06, 0.012, 0.6, 0.15, 0.948, 0.15, 0.003); rule.rotation.y = 0.3;
  p.bb(M.brass, 0.02, 0.014, 0.08, 0.15, 0.95, 0.0).rotation.y = 0.3;
  for (const s of [-1, 1]) { const d = p.b(M.chrome, 0.004, 0.004, 0.16, 0.02, 0.95, -0.25 + s * 0.012); d.rotation.y = s * 0.12; }
  p.c(M.brass, 0.03, 0.04, 0.2, 0.944, -0.6, 10);
  p.lathe(M.brass, [[0, 0], [0.07, 0], [0.072, 0.015], [0.06, 0.02], [0, 0.02]], -0.25, 0.944, 0.55, 16);
  p.cz(M.oak, 0.004, 0.14, 0.25, 0.948, -0.1, 6); // pencil lying on the chart
});

/** long mess / 3rd-class table with a bench on both sides */
export const messTable = def('messTable', (o) => [o.w ?? 2.4, 1.7, 0.78], (p, o) => {
  const w = o.w ?? 2.4, m = matOf(o.mat, M.pine);
  p.bb(m, 0.75, 0.045, w, 0, 0.72, 0, 0.01);
  p.b(m, 0.6, 0.06, w - 0.46, 0, 0.66, 0); // apron between the trestles
  const trestle = [[-0.3, 0], [0.3, 0], [0.3, 0.03], [0.06, 0.08], [0.04, 0.65], [0.28, 0.69], [0.28, 0.72], [-0.28, 0.72], [-0.28, 0.69], [-0.04, 0.65], [-0.06, 0.08], [-0.3, 0.03]]; // carries the top (y 0.72)
  for (const s of [-1, 1]) p.extZ(M.iron, trestle, 0.04, 0, 0, s * (w / 2 - 0.25), 0.004);
  for (const sx of [-1, 1]) {
    p.bb(m, 0.3, 0.04, w, sx * 0.68, 0.42, 0, 0.008);
    for (const s of [-1, 1]) { p.b(M.iron, 0.04, 0.42, 0.04, sx * 0.68, 0, s * (w / 2 - 0.25)); p.b(M.iron, 0.6, 0.03, 0.03, sx * 0.38, 0.08, s * (w / 2 - 0.25)); }
  }
  if (o.cloth) p.rev(M.linen, [{ o: 0.02, y: 0.66, m: 0.006 }, { o: 0.012, y: 0.74 }, { o: -0.01, y: 0.768 }], { perim: G.rectLoop(0.75, w, 0.02, 1), k: Math.round(w * 3), capTop: true }, 0, 0, 0);
  if (o.set) {
    const n = Math.max(1, Math.round(w / 0.6)), ty = o.cloth ? 0.768 : 0.765;
    for (let i = 0; i < n; i++) {
      const z = -w / 2 + (w / n) * (i + 0.5);
      for (const s of [-1, 1]) {
        p.lathe(M.porcelain, [[0, 0], [0.07, 0], [0.11, 0.015], [0.1, 0.016], [0, 0.006]], s * 0.22, ty, z, 10);
        p.lathe(M.porcelain, [[0, 0], [0.038, 0], [0.042, 0.09], [0.036, 0.008], [0, 0.008]], s * 0.1, ty, z + 0.14, 7);
        p.t(M.porcelain, 0.024, 0.005, s * 0.1, ty + 0.045, z + 0.185, 'x', 6, 3);
        p.b(M.chrome, 0.17, 0.004, 0.014, s * 0.22, ty, z - 0.14);
      }
    }
  }
});

export const workbench = def('workbench', (o) => [o.w ?? 1.8, 0.7, 0.95], (p, o) => {
  const w = o.w ?? 1.8;
  p.bb(M.oak, 0.7, 0.07, w, 0, 0.82, 0, 0.01);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.bb(M.oak, 0.08, 0.82, 0.08, sx * 0.28, 0, sz * (w / 2 - 0.08), 0.008);
  p.b(M.oak, 0.6, 0.03, w - 0.2, 0, 0.2, 0);
  for (const sz of [-1, 1]) p.b(M.oak, 0.5, 0.06, 0.05, 0, 0.1, sz * (w / 2 - 0.08));
  p.b(M.oak, 0.6, 0.15, 0.44, 0.03, 0.67, w * 0.2); // drawer box hung under the top
  drawer(p, M.oak, 0.4, 0.12, 0.35, 0.73, w * 0.2, 1, false);
  // vice
  p.bb(M.iron, 0.14, 0.12, 0.12, 0.3, 0.89, -w * 0.32, 0.01); p.bb(M.iron, 0.04, 0.14, 0.16, 0.4, 0.86, -w * 0.32, 0.008);
  p.cx(M.chrome, 0.012, 0.3, 0.45, 0.93, -w * 0.32, 6); p.cz(M.chrome, 0.008, 0.2, 0.6, 0.93, -w * 0.32, 6);
  // tools: hammer, saw, can, rag
  p.b(M.oak, 0.3, 0.025, 0.025, 0.0, 0.89, w * 0.1).rotation.y = 0.3; p.bb(M.iron, 0.04, 0.03, 0.1, 0.13, 0.89, w * 0.06, 0.006);
  p.bb(M.steel, 0.5, 0.004, 0.12, -0.1, 0.89, w * 0.3, 0.001).rotation.y = -0.2;
  p.lathe(K.redLead, [[0, 0], [0.06, 0], [0.06, 0.12], [0.03, 0.15], [0.01, 0.2], [0, 0.2]], -0.2, 0.89, -w * 0.05, 8);
  p.pil(M.canvas, 0.2, 0.04, 0.15, 0.1, 0.89, w * 0.38, 0.8, 0.5, 3, 8);
});
