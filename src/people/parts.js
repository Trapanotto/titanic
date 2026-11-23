// People – geometry of the rigid body parts. Each part is modelled once in its own joint frame (x = forward,
// y = up, z = the figure's right side) for a reference stature of 1.75 m; the instances are scaled per person.
// Colours come from the per-person palette: every vertex names a palette slot (SLOT). Rings marked `l: n` are
// only used from detail level n on (TIER.fine), so the same silhouettes get cheaper on weak devices.
import { Geo, mat } from './geo.js';

export const SLOT = {
  SKIN: 0, HAIR: 1, COAT: 2, SLEEVE: 3, LOWER: 4, SHIRT: 5, ACCENT: 6, SHOE: 7, HAT: 8, BAND: 9, METAL: 10, HAND: 11,
  VEST: 12, YOKE: 13, LEG: 14, DARK: 15, MOUSTACHE: 16, CHAIN: 17, BUTTON: 18, BUTTON2: 19, LACE: 20, LEG2: 21,
  STOLE: 22, LAPEL: 23, APRON: 24, EYE: 25,
};
export const NSLOT = 26;
const S = SLOT;
const PI = Math.PI;

/** Skeleton of the reference figures (metres, stature 1.75; the instance scale maps it to the person). */
export const SKEL = {
  m: { hip: 0.92, hipZ: 0.09, waist: 0.14, neck: 0.44, shY: 0.378, shZ: 0.182, uArm: 0.31, fArm: 0.255, thigh: 0.42, shin: 0.415, ankle: 0.085 },
  f: { hip: 0.92, hipZ: 0.088, waist: 0.16, neck: 0.39, shY: 0.322, shZ: 0.16, uArm: 0.30, fArm: 0.245, thigh: 0.42, shin: 0.415, ankle: 0.085 },
};

/** Quality per detail level (TIER.fine 0..3). */
export function quality(fine) {
  const f = Math.max(0, Math.min(3, fine | 0));
  return {
    f,
    seg: [5, 6, 8, 9][f],      // limbs / clothing
    body: [7, 9, 12, 13][f],    // torso, skirts, hats
    head: [9, 10, 13, 15][f],
    small: [3, 4, 5, 6][f],
    btn: [3, 4, 4, 5][f],     // ears, thumbs, buttons
    hair: [5, 6, 8, 10][f],
  };
}
function geo(q) { const g = new Geo(); g.f = q.f; return g; }

// ------------------------------------------------------------------ torso surfaces (shared by base mesh + overlays)

const TORSO_M = [
  { t: -0.045, cu: -0.004, ru: 0.113, rv: 0.148 },
  { t: 0.06, cu: 0.0, ru: 0.117, rv: 0.156, l: 1 },
  { t: 0.16, cu: 0.006, ru: 0.126, rv: 0.165 },
  { t: 0.24, cu: 0.011, ru: 0.132, rv: 0.172 },
  { t: 0.30, cu: 0.008, ru: 0.127, rv: 0.18, l: 1 },
  { t: 0.345, cu: 0.002, ru: 0.117, rv: 0.186 },
  { t: 0.385, cu: -0.004, ru: 0.1, rv: 0.174 },
  { t: 0.418, cu: -0.008, ru: 0.078, rv: 0.122, l: 1 },
  { t: 0.44, cu: -0.008, ru: 0.064, rv: 0.072 },
];
const TORSO_F = [
  { t: -0.045, cu: -0.006, ru: 0.098, rv: 0.122 },
  { t: 0.03, cu: 0.0, ru: 0.1, rv: 0.12 },
  { t: 0.11, cu: 0.02, ru: 0.125, rv: 0.137, l: 1 },
  { t: 0.18, cu: 0.033, ru: 0.143, rv: 0.152 },
  { t: 0.235, cu: 0.022, ru: 0.13, rv: 0.16, l: 1 },
  { t: 0.28, cu: 0.01, ru: 0.112, rv: 0.164 },
  { t: 0.315, cu: 0.0, ru: 0.097, rv: 0.157, l: 2 },
  { t: 0.345, cu: -0.006, ru: 0.08, rv: 0.12 },
  { t: 0.39, cu: -0.006, ru: 0.056, rv: 0.06 },
];
const P_TORSO = 2.35;

function lerpRing(table, t) {
  if (t <= table[0].t) return table[0];
  for (let i = 0; i < table.length - 1; i++) {
    const a = table[i], b = table[i + 1];
    if (t <= b.t) {
      const k = (t - a.t) / (b.t - a.t);
      return { t, cu: a.cu + (b.cu - a.cu) * k, ru: a.ru + (b.ru - a.ru) * k, rv: a.rv + (b.rv - a.rv) * k };
    }
  }
  return table[table.length - 1];
}
const sep = (c, p) => Math.sign(c) * Math.pow(Math.abs(c), 2 / p);
/** Point on a torso surface at height y, angle a (0 = front), pushed out by off. */
function torsoPt(table, y, a, off) {
  const r = lerpRing(table, y);
  return [r.cu + (r.ru + off) * sep(Math.cos(a), P_TORSO), y, (r.rv + off) * sep(Math.sin(a), P_TORSO)];
}
const IN_M = () => [0, 0.25, 0];

// ------------------------------------------------------------------ parts

function torsoMale(q, { work = false } = {}) {
  const g = geo(q), lo = q.f === 0;
  g.rings(TORSO_M.map((r, i) => ({ ...r, p: P_TORSO, slot: work && i >= TORSO_M.length - 3 ? S.YOKE : S.COAT })), { seg: q.body });
  if (!work) {
    // waistcoat and shirt front in the V of the open coat
    const vw = (y) => 0.05 + 0.4 * Math.max(0, Math.min(1, (y - 0.1) / 0.31)) ** 0.9;
    g.patch(lo ? 2 : q.f >= 2 ? 4 : 3, lo ? 2 : q.f >= 2 ? 6 : 4, (u, v, off) => { const y = 0.1 + 0.335 * v; const w = vw(y); return torsoPt(TORSO_M, y, -w + 2 * w * u, off); }, S.VEST,
      { top: 0.004, walls: false, slotFn: (u, v) => (0.1 + 0.335 * v > (lo ? 0.2 : 0.3) ? S.SHIRT : S.VEST), orient: IN_M });
    // tie (four-in-hand) on the shirt front + knot
    g.patch(1, lo ? 1 : q.f >= 2 ? 4 : 2, (u, v, off) => { const y = 0.25 + 0.17 * v; const w = 0.06 - 0.025 * v; return torsoPt(TORSO_M, y, -w + 2 * w * u, off); }, S.ACCENT,
      { top: 0.009, bot: 0.004, walls: !lo, orient: IN_M });
    if (!lo) g.ellipsoid(torsoPt(TORSO_M, 0.425, 0, 0)[0] + 0.006, 0.428, 0, 0.012, 0.012, 0.016, S.ACCENT, q.small, 3);
    // lapels along both edges of the V, wider towards the notch
    const nl = lo ? 2 : q.f >= 2 ? 5 : 3;
    for (const side of [-1, 1]) {
      g.patch(lo ? 1 : 2, nl, (u, v, off) => {
        const y = 0.1 + 0.3 * v, w = vw(y), lw = 0.05 + 0.26 * v * v;
        return torsoPt(TORSO_M, y, side * (w - 0.01 + lw * u), off);
      }, S.LAPEL, { top: 0.011, bot: 0.002, walls: !lo, orient: IN_M });
    }
    // coat collar rising behind the neck
    if (!lo) g.rings([
      { t: 0.405, cu: -0.012, ru: 0.083, rv: 0.088, slot: S.COAT },
      { t: 0.452, cu: -0.014, ru: 0.07, rv: 0.072, slot: S.COAT, l: 1 },
      { t: 0.468, cu: -0.016, ru: 0.064, rv: 0.066, slot: S.COAT },
    ], { seg: q.seg, arc: [0.9, 2 * PI - 0.9] });
    if (!lo) {
      g.rings([
        { t: 0.468, cu: -0.016, ru: 0.06, rv: 0.062, slot: S.COAT },
        { t: 0.405, cu: -0.012, ru: 0.075, rv: 0.08, slot: S.COAT },
      ], { seg: q.seg, arc: [0.9, 2 * PI - 0.9], orient: false });
    }
    if (q.f >= 2) {
      // buttons: centre column (single-breasted) and two outer rows (double-breasted reefer, palette-switched)
      for (const y of [0.075, -0.005]) g.ellipsoid(torsoPt(TORSO_M, y, 0, 0.006)[0], y, 0, 0.004, 0.009, 0.009, S.BUTTON, q.btn, 2);
      for (const y of [0.06, 0.15, 0.24]) for (const sd of [-1, 1]) {
        const p = torsoPt(TORSO_M, y, sd * 0.5, 0.012);
        g.ellipsoid(p[0], y, p[2], 0.005, 0.009, 0.009, S.BUTTON2, q.btn, 2);
      }
    }
    if (q.f >= 3) {
      // watch chain across the waistcoat, pocket square
      g.patch(5, 1, (u, v, off) => { const a = -0.28 + 0.56 * u, y = 0.14 + 0.03 * Math.cos((u - 0.5) * PI) + v * 0.006; return torsoPt(TORSO_M, y, a, off); }, S.CHAIN, { top: 0.008, walls: false, orient: () => [0, 0.15, 0] });
      g.patch(1, 1, (u, v, off) => torsoPt(TORSO_M, 0.25 + 0.025 * v, -0.62 - 0.12 * u, off), S.SHIRT, { top: 0.009, bot: 0.004, orient: IN_M });
    }
    // stiff shirt collar
    g.rings([
      { t: 0.418, cu: -0.004, ru: 0.06, rv: 0.062, slot: S.SHIRT },
      { t: 0.49, cu: -0.002, ru: 0.058, rv: 0.06, slot: S.SHIRT },
    ], { seg: q.seg });
  } else {
    // jersey / singlet: rolled neck band (accent = neck cloth for stokers)
    g.rings([
      { t: 0.415, cu: -0.006, ru: 0.074, rv: 0.08, slot: S.ACCENT },
      { t: 0.44, cu: -0.006, ru: 0.07, rv: 0.074, slot: S.ACCENT, l: 1 },
      { t: 0.462, cu: -0.006, ru: 0.06, rv: 0.064, slot: S.ACCENT },
      { t: 0.47, cu: -0.006, ru: 0.05, rv: 0.054, slot: S.ACCENT, l: 1 },
    ], { seg: q.seg });
    if (q.f >= 2) g.ellipsoid(0.07, 0.41, 0.02, 0.012, 0.03, 0.022, S.ACCENT, q.small, 3); // knot of the neck cloth
  }
  return g;
}

function torsoFemale(q) {
  const g = geo(q), lo = q.f === 0;
  g.rings(TORSO_F.map((r) => ({ ...r, p: P_TORSO, slot: S.COAT })), { seg: q.body });
  // blouse front (jabot) in the opening of the jacket + lapels
  const vw = (y) => 0.07 + 0.42 * Math.max(0, Math.min(1, (y - 0.06) / 0.29)) ** 1.2;
  g.patch(lo ? 2 : q.f >= 2 ? 4 : 3, lo ? 2 : q.f >= 2 ? 6 : 3, (u, v, off) => { const y = 0.06 + 0.31 * v, w = vw(y); return torsoPt(TORSO_F, y, -w + 2 * w * u, off); }, S.SHIRT,
    { top: 0.004, walls: false, orient: () => [0, 0.2, 0] });
  for (const side of [-1, 1]) {
    g.patch(lo ? 1 : 2, lo ? 2 : q.f >= 2 ? 5 : 3, (u, v, off) => { const y = 0.08 + 0.26 * v, w = vw(y), lw = 0.05 + 0.2 * v; return torsoPt(TORSO_F, y, side * (w - 0.01 + lw * u), off); }, S.LAPEL,
      { top: 0.009, bot: 0.002, walls: !lo, orient: () => [0, 0.2, 0] });
  }
  // belt / waistband
  g.rings([
    { t: -0.03, cu: -0.006, ru: 0.104, rv: 0.126, slot: S.ACCENT, p: P_TORSO },
    { t: 0.02, cu: -0.002, ru: 0.105, rv: 0.125, slot: S.ACCENT, p: P_TORSO },
  ], { seg: q.body });
  // high lace collar up under the chin
  g.rings([
    { t: 0.345, cu: -0.004, ru: 0.06, rv: 0.064, slot: S.SHIRT },
    { t: 0.42, cu: -0.002, ru: 0.052, rv: 0.055, slot: S.SHIRT, l: 1 },
    { t: 0.455, cu: 0.0, ru: 0.052, rv: 0.055, slot: S.SHIRT },
  ], { seg: q.seg });
  if (q.f >= 2) {
    // brooch at the collar, jacket buttons
    g.ellipsoid(0.057, 0.4, 0, 0.006, 0.011, 0.011, S.METAL, q.btn, 2);
    for (const y of [0.0, 0.07]) { const p = torsoPt(TORSO_F, y, 0.13, 0.006); g.ellipsoid(p[0], y, p[2], 0.004, 0.008, 0.008, S.BUTTON, q.btn, 2); }
  }
  return g;
}

/** Coat skirt below the waist (pelvis frame, from the waist downwards; scaled in y for jacket / frock / overcoat). */
function coatHem(q) {
  const g = geo(q), lo = q.f === 0;
  const R = [
    { t: 0.0, cu: -0.004, ru: 0.116, rv: 0.152 },
    { t: -0.08, cu: -0.008, ru: 0.124, rv: 0.168, l: 1 },
    { t: -0.18, cu: -0.012, ru: 0.13, rv: 0.178 },
    { t: -0.36, cu: -0.012, ru: 0.137, rv: 0.186, l: 2 },
    { t: -0.6, cu: -0.01, ru: 0.145, rv: 0.198 },
  ].filter((r) => (r.l || 0) <= q.f);
  const open = (t) => 0.16 + 0.4 * Math.min(1, -t / 0.3);
  const seg = q.body, nA = seg + 1, rows = R.length;
  // outer shell (and the lining) as open ring stacks; the front opening widens downwards
  const shell = (off, inner) => {
    const base = g.nv, t0 = g.I.length;
    for (const r of R) {
      const o = open(r.t);
      for (let i = 0; i <= seg; i++) {
        const a = o + ((2 * PI - 2 * o) * i) / seg;
        g.v(r.cu + (r.ru + off) * sep(Math.cos(a), 2.2), r.t, (r.rv + off) * sep(Math.sin(a), 2.2), S.COAT);
      }
    }
    for (let j = 0; j < rows - 1; j++) for (let i = 0; i < seg; i++) {
      const a = base + j * nA + i, b = a + 1, c = a + nA, d = c + 1;
      g.t(a, c, b); g.t(b, c, d); // rows run downwards: as built the faces point inwards (the lining)
    }
    g._smooth(base, t0, [], [], inner ? null : (x, y) => [0, y, 0]);
    return base;
  };
  const v0 = shell(0, false);
  if (!lo) {
    const v1 = shell(-0.008, true);
    // edges: front edges and the hem, thickness strips (double-sided)
    const P = g.P, e0 = g.nv, et0 = g.I.length;
    const strip = (pairs) => {
      let prev = null;
      for (const [a, b] of pairs) {
        const A = g.v(P[a * 3], P[a * 3 + 1], P[a * 3 + 2], S.COAT), B = g.v(P[b * 3], P[b * 3 + 1], P[b * 3 + 2], S.COAT);
        if (prev) { g.t(prev[0], A, prev[1]); g.t(prev[1], A, B); g.t(prev[0], prev[1], A); g.t(prev[1], B, A); }
        prev = [A, B];
      }
    };
    for (const i of [0, seg]) strip(R.map((_, j) => [v0 + j * nA + i, v1 + j * nA + i]));
    strip(Array.from({ length: nA }, (_, i) => [v0 + (rows - 1) * nA + i, v1 + (rows - 1) * nA + i]));
    g._smooth(e0, et0, [], [], null);
  }
  if (q.f >= 2) for (const sd of [-1, 1]) g.ellipsoid(-0.123, -0.01, sd * 0.045, 0.006, 0.009, 0.009, S.BUTTON, q.btn, 2); // back buttons
  return g;
}

function pelvis(q) {
  const g = geo(q);
  g.rings([
    { t: 0.155, cu: -0.004, ru: 0.112, rv: 0.146 },
    { t: 0.08, cu: -0.008, ru: 0.12, rv: 0.163, l: 1 },
    { t: 0.0, cu: -0.014, ru: 0.124, rv: 0.172 },
    { t: -0.055, cu: -0.01, ru: 0.11, rv: 0.16 },
    { t: -0.095, cu: -0.004, ru: 0.075, rv: 0.105, l: 1 },
    { t: -0.112, cu: 0, ru: 0.025, rv: 0.035, l: 2 },
    { t: -0.115, cu: 0, ru: 0, rv: 0 },
  ].map((r) => ({ ...r, slot: S.LOWER })), { seg: q.body, p: 2.3 });
  return g;
}

/** Women's skirt. part: 'upper' (waist to knee, pelvis frame), 'lower' (knee to hem, own pivot at y = -0.40),
 *  'full' (one piece, phones). */
function skirt(q, part) {
  const g = geo(q);
  const up = [
    { t: 0.17, cu: -0.006, ru: 0.098, rv: 0.122 },
    { t: 0.1, cu: -0.012, ru: 0.13, rv: 0.152, l: 1 },
    { t: 0.0, cu: -0.022, ru: 0.158, rv: 0.176 },
    { t: -0.12, cu: -0.018, ru: 0.163, rv: 0.178, l: 2 },
    { t: -0.27, cu: -0.01, ru: 0.163, rv: 0.174, l: 1 },
    { t: -0.42, cu: -0.004, ru: 0.162, rv: 0.168 },
  ];
  const low = [
    { t: 0.03, cu: -0.004, ru: 0.157, rv: 0.163 },
    { t: -0.2, cu: 0.0, ru: 0.163, rv: 0.164, l: 2 },
    { t: -0.385, cu: 0.006, ru: 0.172, rv: 0.168 },
    { t: -0.445, cu: 0.008, ru: 0.18, rv: 0.174, l: 1 },
  ];
  let rings;
  if (part === 'upper') rings = up;
  else if (part === 'lower') rings = low;
  else rings = [...up.slice(0, 5), ...low.slice(1).map((r) => ({ ...r, t: r.t - 0.4, l: r.l === 1 ? 0 : r.l }))];
  rings = rings.filter((r) => (r.l || 0) <= q.f);
  const segs = q.body;
  // a few soft folds in the lower part
  const folds = q.f >= 2 ? 7 : 0;
  const mod = folds ? (j, a, r) => (r.t < (part === 'lower' ? 0 : -0.3) ? 0.004 * Math.sin(a * folds) * Math.min(1, (-(r.t) + 0.05) * 3) : 0) : null;
  g.rings(rings.map((r) => ({ ...r, slot: S.VEST, p: 2.1 })), { seg: segs, mod });
  const last = rings[rings.length - 1];
  if (part !== 'upper' && q.f >= 1) {
    // hem lip inside (the open bottom shows cloth, not the void)
    g.rings([
      { t: last.t, cu: last.cu, ru: last.ru - 0.006, rv: last.rv - 0.006, slot: S.VEST },
      { t: last.t + 0.12, cu: last.cu, ru: last.ru - 0.016, rv: last.rv - 0.016, slot: S.VEST },
    ], { seg: segs, inward: true, orient: false });
    g.rings([
      { t: last.t, cu: last.cu, ru: last.ru - 0.007, rv: last.rv - 0.007, slot: S.VEST },
      { t: last.t, cu: last.cu, ru: last.ru + 0.0005, rv: last.rv + 0.0005, slot: S.VEST },
    ], { seg: segs, orient: false });
  }
  // apron (third class): front panel, palette-switched (= skirt colour when there is no apron)
  const at = (t) => {
    for (let i = 0; i < rings.length - 1; i++) { const a = rings[i], b = rings[i + 1]; if (t <= a.t && t >= b.t) { const k = (a.t - t) / (a.t - b.t); return { cu: a.cu + (b.cu - a.cu) * k, ru: a.ru + (b.ru - a.ru) * k, rv: a.rv + (b.rv - a.rv) * k }; } }
    return rings[rings.length - 1];
  };
  const t0 = part === 'lower' ? 0.0 : 0.13, t1 = part === 'upper' ? -0.42 : last.t + 0.08;
  g.patch(q.f >= 2 ? 5 : 4, q.f >= 2 ? 5 : 2, (u, v, off) => {
    const t = t0 + (t1 - t0) * v, r = at(t), a = (-0.75 + 1.5 * u) * (0.8 + 0.2 * v);
    return [r.cu + (r.ru + off) * sep(Math.cos(a), 2.1), t, (r.rv + off) * sep(Math.sin(a), 2.1)];
  }, S.APRON, { top: q.f >= 2 ? 0.007 : 0.012, bot: 0.0, walls: false, orient: () => [0, (t0 + t1) / 2, 0] });
  return g;
}

/** Upper arm (shoulder joint frame, hangs along -y). */
function upperArm(q) {
  const g = geo(q);
  g.rings([
    { t: 0.045, ru: 0, rv: 0 },
    { t: 0.036, ru: 0.03, rv: 0.031, l: 1 },
    { t: 0.016, ru: 0.046, rv: 0.048 },
    { t: -0.02, ru: 0.051, rv: 0.052, l: 1 },
    { t: -0.1, ru: 0.048, rv: 0.047, l: 1 },
    { t: -0.2, ru: 0.044, rv: 0.042 },
    { t: -0.29, ru: 0.041, rv: 0.039, l: 2 },
    { t: -0.33, ru: 0.034, rv: 0.033 },
    { t: -0.352, ru: 0.016, rv: 0.016, l: 1 },
    { t: -0.358, ru: 0, rv: 0 },
  ].map((r) => ({ ...r, slot: S.SLEEVE })), { seg: q.seg });
  return g;
}

/** Forearm with cuff and hand (elbow frame). Symmetric about the z = 0 plane, so it serves both sides. */
function foreArm(q) {
  const g = geo(q);
  g.rings([
    { t: 0.04, ru: 0, rv: 0, slot: S.SLEEVE },
    { t: 0.028, ru: 0.028, rv: 0.028, slot: S.SLEEVE, l: 1 },
    { t: 0.0, ru: 0.04, rv: 0.039, slot: S.SLEEVE },
    { t: -0.07, ru: 0.042, rv: 0.04, slot: S.SLEEVE, l: 2 },
    { t: -0.17, ru: 0.036, rv: 0.034, slot: S.SLEEVE, l: 1 },
    { t: -0.188, ru: 0.037, rv: 0.035, slot: S.LACE, l: 1 },
    { t: -0.205, ru: 0.038, rv: 0.036, slot: S.SLEEVE, l: 1 },
    { t: -0.228, ru: 0.039, rv: 0.037, slot: S.SLEEVE },
    { t: -0.229, ru: 0.033, rv: 0.031, slot: S.SHIRT, crease: true, l: 1 },
    { t: -0.248, ru: 0.031, rv: 0.029, slot: S.SHIRT, l: 1 },
    { t: -0.252, ru: 0.023, rv: 0.019, slot: S.HAND, crease: true, l: 1 },
    { t: -0.27, ru: 0.033, rv: 0.016, slot: S.HAND, p: 2.6, l: 1 },
    { t: -0.31, ru: 0.04, rv: 0.018, slot: S.HAND, p: 2.8 },
    { t: -0.35, ru: 0.039, rv: 0.016, slot: S.HAND, p: 2.8, l: 2 },
    { t: -0.385, ru: 0.034, rv: 0.013, slot: S.HAND, p: 2.6 },
    { t: -0.41, ru: 0.026, rv: 0.011, slot: S.HAND, p: 2.4, l: 1 },
    { t: -0.424, ru: 0.012, rv: 0.007, slot: S.HAND, l: 2 },
    { t: -0.428, ru: 0, rv: 0, slot: S.HAND },
  ], { seg: q.seg });
  // thumb block on the front edge of the hand, pointing down and forward
  if (q.f >= 1) g.xf(mat(0.034, -0.29, 0, 0, 0, 0.42), (h) => h.ellipsoid(0, -0.022, 0, 0.011, 0.032, 0.011, S.HAND, q.small, 3));
  return g;
}

function thigh(q) {
  const g = geo(q);
  g.rings([
    { t: 0.075, ru: 0, rv: 0 },
    { t: 0.055, ru: 0.06, rv: 0.058, l: 1 },
    { t: 0.0, ru: 0.088, rv: 0.084 },
    { t: -0.12, ru: 0.083, rv: 0.08, l: 1 },
    { t: -0.26, ru: 0.071, rv: 0.068 },
    { t: -0.38, ru: 0.06, rv: 0.058, l: 2 },
    { t: -0.425, ru: 0.057, rv: 0.055 },
    { t: -0.455, ru: 0.032, rv: 0.03, l: 1 },
    { t: -0.465, ru: 0, rv: 0 },
  ].map((r) => ({ ...r, slot: S.LOWER })), { seg: q.seg });
  return g;
}

/** Shin: trouser leg for men (LEG = LEG2 = trousers), boot shaft + stocking for women (instance narrower). */
function shin(q) {
  const g = geo(q);
  g.rings([
    { t: 0.035, ru: 0, rv: 0, slot: S.LEG },
    { t: 0.022, ru: 0.04, rv: 0.04, slot: S.LEG, l: 1 },
    { t: 0.0, ru: 0.056, rv: 0.054, slot: S.LEG },
    { t: -0.1, ru: 0.057, rv: 0.055, slot: S.LEG, l: 1 },
    { t: -0.2, ru: 0.053, rv: 0.052, slot: S.LEG, l: 2 },
    { t: -0.24, ru: 0.052, rv: 0.051, slot: S.LEG2 },
    { t: -0.33, ru: 0.05, rv: 0.05, slot: S.LEG2, l: 2 },
    { t: -0.395, ru: 0.053, rv: 0.053, slot: S.LEG2 },
    { t: -0.396, ru: 0.04, rv: 0.04, slot: S.SHOE, crease: true, l: 1 },
    { t: -0.43, ru: 0.034, rv: 0.034, slot: S.SHOE },
  ], { seg: q.seg, capB: q.f >= 1 });
  return g;
}

/** Shoe / boot (ankle frame, sole at y = -0.085). */
function foot(q) {
  const g = geo(q);
  const sole = -0.085;
  g.rings([
    { t: -0.075, cu: -0.05, ru: 0, rv: 0 },
    { t: -0.07, cu: -0.048, ru: 0.025, rv: 0.026, l: 1 },
    { t: -0.05, cu: -0.04, ru: 0.046, rv: 0.038 },
    { t: -0.01, cu: -0.032, ru: 0.056, rv: 0.044, l: 1 },
    { t: 0.05, cu: -0.045, ru: 0.042, rv: 0.048 },
    { t: 0.11, cu: -0.056, ru: 0.032, rv: 0.05, l: 2 },
    { t: 0.16, cu: -0.062, ru: 0.024, rv: 0.046 },
    { t: 0.195, cu: -0.066, ru: 0.018, rv: 0.036, l: 1 },
    { t: 0.212, cu: -0.07, ru: 0.01, rv: 0.02, l: 2 },
    { t: 0.216, cu: -0.072, ru: 0, rv: 0 },
  ].map((r) => ({ ...r, slot: S.SHOE, p: 2.3 })), { seg: q.f ? q.seg : 4, axis: 'x', clampU: [sole, 1] });
  if (q.f >= 1) {
    // heel block
    g.rings([
      { t: -0.07, cu: sole + 0.012, ru: 0.012, rv: 0.03, slot: S.DARK, p: 3 },
      { t: -0.02, cu: sole + 0.012, ru: 0.012, rv: 0.034, slot: S.DARK, p: 3 },
    ], { seg: q.small + 1, axis: 'x', capB: true, capT: true });
  }
  return g;
}

// ------------------------------------------------------------------ head

const HEAD = [
  { t: -0.035, cu: 0.0, ru: 0.054, rv: 0.052 },
  { t: 0.035, cu: 0.006, ru: 0.053, rv: 0.051, l: 1 },
  { t: 0.052, cu: 0.028, ru: 0.064, rv: 0.054 },
  { t: 0.072, cu: 0.03, ru: 0.074, rv: 0.064, l: 2 },
  { t: 0.1, cu: 0.022, ru: 0.084, rv: 0.07 },
  { t: 0.13, cu: 0.014, ru: 0.094, rv: 0.074 },
  { t: 0.16, cu: 0.008, ru: 0.099, rv: 0.077, l: 1 },
  { t: 0.19, cu: 0.002, ru: 0.1, rv: 0.078 },
  { t: 0.22, cu: -0.005, ru: 0.097, rv: 0.076, l: 2 },
  { t: 0.248, cu: -0.01, ru: 0.085, rv: 0.068 },
  { t: 0.27, cu: -0.012, ru: 0.063, rv: 0.051, l: 1 },
  { t: 0.283, cu: -0.012, ru: 0.033, rv: 0.027, l: 2 },
  { t: 0.288, cu: -0.012, ru: 0, rv: 0 },
];
const g2 = (x, s) => Math.exp(-(x * x) / (s * s));
const wrapA = (a) => { a %= 2 * PI; if (a > PI) a -= 2 * PI; if (a < -PI) a += 2 * PI; return a; };
function headMod(y, a) {
  const A = wrapA(a);
  let d = 0;
  // nose: ridge from the brow to the tip
  if (y > 0.105 && y < 0.185) d += 0.024 * g2(A, 0.17) * (y < 0.125 ? (y - 0.105) / 0.02 : 1 - ((y - 0.125) / 0.06) * 0.8);
  d += 0.005 * g2(A, 0.5) * g2(y - 0.185, 0.012);                       // brow ridge
  d -= 0.009 * (g2(A - 0.4, 0.2) + g2(A + 0.4, 0.2)) * g2(y - 0.165, 0.014); // eye sockets
  d += 0.004 * (g2(A - 0.95, 0.3) + g2(A + 0.95, 0.3)) * g2(y - 0.14, 0.02); // cheekbones
  d += 0.009 * g2(A, 0.35) * g2(y - 0.066, 0.016);                      // chin
  d -= 0.003 * g2(A, 0.3) * g2(y - 0.093, 0.006);                       // mouth
  return d;
}
/** Hair line: hair above it (men's short hair / women's hair under the up-do). */
function hairLine(a) {
  const A = Math.abs(wrapA(a));
  if (A < 0.9) return 0.236 - 0.01 * A;
  if (A < 1.7) return 0.226 - 0.04 * (A - 0.9) / 0.8;      // temples, above the ears
  if (A < 2.3) return 0.19 - 0.08 * (A - 1.7) / 0.6;       // behind the ears
  return 0.11 - 0.02 * (A - 2.3);                          // nape
}

function head(q) {
  const g = geo(q);
  g.rings(HEAD.map((r) => ({ ...r, slot: S.SKIN })), {
    seg: q.head,
    mod: (j, a, r) => headMod(r.t, a) + (r.t > hairLine(a) ? 0.004 : 0),
    slotFn: (j, a, r) => (r.t > hairLine(a) ? S.HAIR : undefined),
  });
  // ears
  if (q.f >= 1) for (const sd of [-1, 1]) g.xf(mat(-0.006, 0.152, sd * 0.077, sd * 0.1, 0, -0.12), (h) => h.ellipsoid(0, 0, 0, 0.021, 0.031, 0.009, S.SKIN, q.small + 1, q.f ? 3 : 2));
  // moustache (skin coloured for clean-shaven men: then it reads as the upper lip)
  g.xf(mat(0.103, 0.104, 0, 0, 0, 0.25), (h) => h.ellipsoid(0, 0, 0, 0.008, 0.0065, 0.026, S.MOUSTACHE, q.small, 3));
  { // also on phones: a head without eyes looked like a mask
    // eyes (dark) and brows
    for (const sd of [-1, 1]) {
      const a = sd * 0.4, y = 0.165, r = lerpRing(HEAD, y), p = headMod(y, a);
      const x = r.cu + (r.ru + p) * Math.cos(a), z = (r.rv + p) * Math.sin(a);
      g.ellipsoid(x - 0.003, y, z, 0.006, 0.0055, 0.011, S.EYE, q.small, 2);
      if (q.f >= 2) {
        const yb = 0.183, rb = lerpRing(HEAD, yb), pb = headMod(yb, a);
        g.xf(mat(rb.cu + (rb.ru + pb) * Math.cos(a) - 0.002, yb, (rb.rv + pb) * Math.sin(a), 0, -sd * 0.35, 0), (h) => h.ellipsoid(0, 0, 0, 0.004, 0.003, 0.017, S.HAIR, q.small, 2));
      }
    }
  }
  return g;
}

/** Women's hair up: pompadour roll, side puffs and a bun (head frame). */
function hairUp(q) {
  const g = geo(q), s = q.hair, nr = q.f >= 2 ? 4 : 3;
  g.xf(mat(0.03, 0.247, 0, 0, 0, -0.35), (h) => h.ellipsoid(0, 0, 0, 0.075, 0.045, 0.09, S.HAIR, s, nr));
  if (q.f >= 1) g.ellipsoid(-0.03, 0.235, 0, 0.088, 0.05, 0.085, S.HAIR, s, nr);
  g.ellipsoid(-0.085, 0.27, 0, 0.042, 0.042, 0.047, S.HAIR, s, nr); // bun
  return g;
}

function beard(q) {
  const g = geo(q);
  // shell along the jaw from ear to ear, below the mouth
  const rows = [0.035, 0.05, 0.07, 0.092, 0.12].map((t) => { const r = lerpRing(HEAD, t); return { t, cu: r.cu, ru: r.ru + 0.009, rv: r.rv + 0.009, slot: S.MOUSTACHE }; });
  rows[0].ru -= 0.012; rows[0].rv -= 0.004; rows[0].cu += 0.01;
  g.rings(rows, { seg: q.seg + 2, arc: [-1.7, 1.7], mod: (j, a, r) => (j === 4 ? -0.008 * g2(wrapA(a), 0.6) : headMod(r.t, a) * 0.6) });
  g.ellipsoid(0.098, 0.05, 0, 0.022, 0.03, 0.035, S.MOUSTACHE, q.small + 1, 3);
  return g;
}

// ------------------------------------------------------------------ headwear (head frame)

function brim(g, q, { y, r0u, r0v, ru, rv, curl = 0.02, droop = 0, slot = S.HAT, thick = 0.006, cu = 0 }) {
  const along = (j, a) => {
    const s = Math.sin(a), c = Math.cos(a);
    return (j === 1 || j === 2) ? curl * s * s - droop * c * c : 0;
  };
  g.rings([
    { t: y, cu, ru: r0u, rv: r0v, slot },
    { t: y, cu, ru, rv, slot, crease: true },
    { t: y - thick, cu, ru, rv, slot, crease: true },
    { t: y - thick, cu, ru: r0u, rv: r0v, slot, crease: true },
  ], { seg: q.body, along, orient: false, inward: true }); // as built an outward annulus faces down: flip
  return g;
}

function hatBowler(q) {
  const g = geo(q);
  g.rings([
    { t: 0.226, ru: 0.103, rv: 0.088, slot: S.BAND },
    { t: 0.248, ru: 0.104, rv: 0.089, slot: S.HAT },
    { t: 0.29, ru: 0.104, rv: 0.09, slot: S.HAT, l: 1 },
    { t: 0.322, ru: 0.093, rv: 0.08, slot: S.HAT },
    { t: 0.343, ru: 0.066, rv: 0.057, slot: S.HAT, l: 1 },
    { t: 0.354, ru: 0.03, rv: 0.026, slot: S.HAT, l: 2 },
    { t: 0.356, ru: 0, rv: 0, slot: S.HAT },
  ].map((r) => ({ ...r, cu: -0.004 })), { seg: q.body });
  brim(g, q, { y: 0.228, cu: -0.004, r0u: 0.1, r0v: 0.085, ru: 0.155, rv: 0.13, curl: 0.022, thick: 0.005 });
  return g;
}

function hatTop(q) {
  const g = geo(q);
  g.rings([
    { t: 0.226, ru: 0.102, rv: 0.088, slot: S.BAND },
    { t: 0.26, ru: 0.101, rv: 0.087, slot: S.HAT },
    { t: 0.34, ru: 0.1, rv: 0.086, slot: S.HAT, l: 2 },
    { t: 0.41, ru: 0.106, rv: 0.091, slot: S.HAT },
  ].map((r) => ({ ...r, cu: -0.004 })), { seg: q.body, capT: true });
  brim(g, q, { y: 0.228, cu: -0.004, r0u: 0.1, r0v: 0.085, ru: 0.145, rv: 0.125, curl: 0.024, thick: 0.005 });
  return g;
}

function capFlat(q) {
  const g = geo(q);
  g.rings([
    { t: 0.222, cu: -0.002, ru: 0.102, rv: 0.088 },
    { t: 0.243, cu: 0.012, ru: 0.116, rv: 0.1, l: 2 },
    { t: 0.258, cu: 0.028, ru: 0.118, rv: 0.103 },
    { t: 0.27, cu: 0.022, ru: 0.098, rv: 0.088 },
    { t: 0.278, cu: 0.012, ru: 0.05, rv: 0.045, l: 2 },
    { t: 0.28, cu: 0.01, ru: 0, rv: 0 },
  ].map((r) => ({ ...r, slot: S.HAT })), { seg: q.body });
  // peak
  g.patch(q.f >= 2 ? 4 : 2, q.f >= 2 ? 2 : 1, (u, v, off) => {
    const a = -0.95 + 1.9 * u, r = 0.1 + 0.055 * v * (1 - 0.35 * Math.abs(a));
    return [-0.002 + r * Math.cos(a), 0.226 - 0.03 * v + off, 0.088 / 0.1 * r * Math.sin(a)];
  }, S.HAT, { top: 0.003, bot: -0.003, orient: () => [0, 0, 0] });
  return g;
}

function capPeaked(q) {
  const g = geo(q);
  g.rings([
    { t: 0.222, cu: -0.004, ru: 0.102, rv: 0.088, slot: S.HAT },
    { t: 0.262, cu: -0.004, ru: 0.104, rv: 0.09, slot: S.HAT },
    { t: 0.268, cu: -0.006, ru: 0.12, rv: 0.108, slot: S.BAND, crease: true },
    { t: 0.288, cu: -0.008, ru: 0.128, rv: 0.115, slot: S.BAND },
  ], { seg: q.body, capT: true });
  g.patch(q.f >= 2 ? 4 : 2, q.f >= 2 ? 2 : 1, (u, v, off) => {
    const a = -0.95 + 1.9 * u, r = 0.1 + 0.06 * v * (1 - 0.3 * Math.abs(a));
    return [-0.004 + r * Math.cos(a), 0.228 - 0.035 * v + off, 0.088 / 0.1 * r * Math.sin(a)];
  }, S.DARK, { top: 0.003, bot: -0.003, orient: () => [0, 0, 0] });
  if (q.f >= 1) g.ellipsoid(0.101, 0.243, 0, 0.006, 0.012, 0.018, S.METAL, q.small, 2); // badge
  return g;
}

function hatLady(q) {
  const g = geo(q);
  g.xf(mat(0.0, 0.0, 0, 0.05, 0, -0.09), (h) => {
    h.rings([
      { t: 0.255, cu: -0.01, ru: 0.105, rv: 0.095, slot: S.BAND },
      { t: 0.29, cu: -0.01, ru: 0.108, rv: 0.098, slot: S.HAT },
      { t: 0.33, cu: -0.012, ru: 0.095, rv: 0.086, slot: S.HAT, l: 1 },
      { t: 0.348, cu: -0.012, ru: 0.06, rv: 0.055, slot: S.HAT, l: 2 },
      { t: 0.352, cu: -0.012, ru: 0, rv: 0, slot: S.HAT },
    ], { seg: q.body });
    brim(h, q, { y: 0.257, cu: -0.01, r0u: 0.1, r0v: 0.09, ru: 0.27, rv: 0.25, curl: 0.012, droop: 0.022, thick: 0.007 });
    // trimming: ribbon bow / roses and an ostrich plume (palette BAND)
    const s = q.small + 1;
    h.ellipsoid(0.05, 0.325, 0.07, 0.05, 0.03, 0.04, S.BAND, s, 3);
    if (q.f >= 1) h.ellipsoid(0.0, 0.335, 0.085, 0.04, 0.028, 0.035, S.BAND, s, 3);
    if (q.f >= 2) h.ellipsoid(0.085, 0.31, 0.03, 0.03, 0.025, 0.03, S.BAND, s, 2);
    if (q.f >= 1) h.xf(mat(-0.06, 0.345, -0.03, 0.2, 0.4, 0.5), (k) => k.ellipsoid(0, 0, 0, 0.11, 0.018, 0.03, S.BAND, s, 3));
  });
  return g;
}

function scarf(q) {
  const g = geo(q);
  const ts = [0.03, 0.06, 0.1, 0.14, 0.18, 0.21, 0.24, 0.265, 0.283, 0.295];
  const rings = ts.map((t, i) => { const r = lerpRing(HEAD, Math.min(t, 0.283)); return { t: Math.min(t, 0.296), cu: r.cu - 0.004, ru: r.ru + 0.012, rv: r.rv + 0.013, slot: S.HAT, l: [3, 5, 7].includes(i) ? 2 : 0 }; });
  rings[rings.length - 1].ru = rings[rings.length - 1].rv = 0;
  rings[0].ru = 0.06; rings[0].rv = 0.06; rings[0].cu = -0.005;
  // opening for the face: vertices in front are pulled back to the face edge
  g.rings(rings, {
    seg: q.head, mod: (j, a, r) => {
      const A = Math.abs(wrapA(a));
      if (r.t > 0.05 && r.t < 0.225 && A < 1.05) return -0.03 - 0.03 * (1 - A / 1.05);
      return 0;
    },
  });
  g.ellipsoid(0.05, 0.03, 0, 0.022, 0.022, 0.03, S.HAT, q.small + 1, 3); // knot under the chin
  return g;
}

/** Walking cane: unit length along -y (grip at 0, tip at -1); the crowd stretches it from the hand to the tip. */
function cane(q) {
  const g = geo(q);
  g.rings([
    { t: 0.04, ru: 0.014, rv: 0.014, slot: S.METAL },
    { t: 0.0, ru: 0.016, rv: 0.016, slot: S.METAL },
    { t: -0.03, ru: 0.011, rv: 0.011, slot: S.DARK },
    { t: -0.985, ru: 0.009, rv: 0.009, slot: S.DARK },
    { t: -1.0, ru: 0.008, rv: 0.008, slot: S.METAL },
  ], { seg: Math.max(4, q.small), capT: true, capB: true });
  return g;
}

/** Fur stole / shawl over the shoulders (woman's torso frame). */
function stole(q) {
  const g = geo(q);
  const arc = [0.5, 2 * PI - 0.5];
  g.rings([
    { t: 0.215, cu: 0.0, ru: 0.138, rv: 0.178 },
    { t: 0.27, cu: -0.006, ru: 0.13, rv: 0.192, l: 2 },
    { t: 0.315, cu: -0.01, ru: 0.114, rv: 0.19 },
    { t: 0.355, cu: -0.012, ru: 0.09, rv: 0.145, l: 1 },
    { t: 0.385, cu: -0.012, ru: 0.072, rv: 0.08 },
  ].map((r) => ({ ...r, slot: S.STOLE })), { seg: q.body, arc });
  g.rings([
    { t: 0.385, cu: -0.012, ru: 0.064, rv: 0.07 },
    { t: 0.215, cu: 0.0, ru: 0.128, rv: 0.168 },
  ].map((r) => ({ ...r, slot: S.STOLE })), { seg: q.body, arc, orient: false });
  // the two hanging ends in front (fur: thick)
  for (const sd of [-1, 1]) {
    g.patch(2, q.f >= 2 ? 4 : 2, (u, v, off) => { const y = 0.36 - 0.34 * v; return torsoPt(TORSO_F, y, sd * (0.42 + 0.28 * u - 0.12 * v), off); }, S.STOLE, { top: 0.03, bot: 0.004, orient: () => [0, 0.2, 0] });
  }
  return g;
}

// ------------------------------------------------------------------ catalogue

/** Part definitions. minFine: left out below that detail level (fallback = part used instead, or none). */
export const PART_DEFS = {
  head: { make: head },
  hairUp: { make: hairUp },
  beard: { make: beard, minFine: 1 },
  bowler: { make: hatBowler },
  topHat: { make: hatTop, minFine: 1, fallback: 'bowler' },
  capFlat: { make: capFlat, minFine: 1, fallback: 'capPeaked' },
  capPeaked: { make: capPeaked },
  ladyHat: { make: hatLady },
  scarf: { make: scarf, minFine: 1, fallback: null },
  torsoM: { make: (q) => torsoMale(q) },
  torsoW: { make: torsoFemale },
  torsoWork: { make: (q) => torsoMale(q, { work: true }) },
  hem: { make: coatHem },
  pelvis: { make: pelvis },
  skirtU: { make: (q) => skirt(q, q.f >= 1 ? 'upper' : 'full') },
  skirtL: { make: (q) => skirt(q, 'lower'), minFine: 1, fallback: null },
  uArm: { make: upperArm },
  fArm: { make: foreArm },
  thigh: { make: thigh },
  shin: { make: shin },
  foot: { make: foot },
  cane: { make: cane, minFine: 1, fallback: null },
  stole: { make: stole, minFine: 1, fallback: null },
};

/** Build the part geometries for a detail level. Returns { name: Geo } for the parts available at that level. */
export function buildParts(fine) {
  const q = quality(fine), out = {};
  for (const [k, d] of Object.entries(PART_DEFS)) if (q.f >= (d.minFine || 0)) out[k] = d.make(q);
  return out;
}

/** Name of the part that is drawn for `name` at this detail level (fallbacks on phones), or null. */
export function partFor(name, fine) {
  const d = PART_DEFS[name];
  if (!d) return null;
  if ((fine | 0) >= (d.minFine || 0)) return name;
  return d.fallback ?? null;
}
