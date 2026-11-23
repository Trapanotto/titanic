// Procedural PBR surface recipes (albedo + normal + ORM) for the shared material library.
// Every recipe is tileable and authored per metre. Colours are period-correct, slightly desaturated 1912 palettes.
// Resolution: every recipe has a reference size (`REF`, mostly 512) its pixel constants are written for; at other
// sizes the constants scale with k = size / REF, so features keep their physical size, and fine features fade out
// (instead of aliasing) where they would get thinner than about a pixel. surface({ ref }) keeps the normal slopes.
import { surface, vnoise, fbm, worley, clamp01, sstep, hex, hash2, rng, cells, cover, strokes, cached } from './tex.js';

const TAU = Math.PI * 2;
const hyp = (a, b) => Math.sqrt(a * a + b * b);
const lerp = (a, b, t) => a + (b - a) * t;
const frac = (v) => v - Math.floor(v);
/** Wrapped distance on a ring of length S. */
const wrapD = (d, S) => { d = Math.abs(d) % S; return d > S / 2 ? S - d : d; };
function put(o, c, k = 1) { o.r = c[0] * k; o.g = c[1] * k; o.b = c[2] * k; }
function blend(o, c, t) { o.r += (c[0] - o.r) * t; o.g += (c[1] - o.g) * t; o.b += (c[2] - o.b) * t; }
function mul(o, k) { o.r *= k; o.g *= k; o.b *= k; }
function tint(o, kr, kg, kb) { o.r *= kr; o.g *= kg; o.b *= kb; }

// ------------------------------------------------------------------ woods

/** Grain noise fields of a wood (cached per size / seed). Grain runs along x; sample transposed for vertical pieces. */
function grainFields(S, seed, fleck = false, fine = false) {
  return {
    warp: fbm(S, 3, 6, 4, seed + 1),                         // ring distortion
    streak: fbm(S, 2, cells(S, 96), 4, seed + 2, 0.6),        // colour streaks along the grain
    pores: vnoise(S, cells(S, 64), S >> 1, seed + 3),         // vessels: short dashes along the grain
    big: fbm(S, 3, 3, 3, seed + 4),                           // slow colour drift
    fleck: fleck ? vnoise(S, cells(S, 40), cells(S, 150), seed + 5) : null,   // medullary-ray flakes (quarter-sawn oak)
    fine: fine ? vnoise(S, cells(S, 220), cells(S, 220), seed + 6) : null,
  };
}

/**
 * One wood pixel: colour into o, details into WP. Grain along x, rings counted along y.
 * cycles: broad figure bands per tile; fineC: fine growth rings per tile (fade out below ~4 px per ring);
 * ringPorous: big earlywood pores bunched at the start of each ring (oak); phase0 shifts the rings (another board).
 */
const WP = { late: 0, pore: 0, fl: 0, ring: 0 };
function woodPixel(G, i, y, S, cycles, o, base, contrast, fleckK, poreK, fineC = 0, fineK = 0.12, ringPorous = false, phase0 = 0, warpK = 2.2) {
  const ph = (y / S) * cycles + G.warp[i] * warpK + phase0;
  const t = frac(ph);
  const aa = Math.min(0.2, 1.5 * cycles / S);
  // growth ring: earlywood light, latewood darkening towards the ring boundary, sharp edge (anti-aliased)
  const late = sstep(0.36, 0.9, t) * sstep(1, 1 - aa, t);
  let ring = 0, early = 1 - sstep(0, 0.3, t);
  if (fineC) {
    const fade = sstep(3, 6, S / fineC);
    if (fade > 0) {
      const t2 = frac((y / S) * fineC + G.warp[i] * warpK * (fineC / cycles) * 0.35 + G.streak[i] * 1.3 + phase0 * 3);
      ring = sstep(0.5, 0.92, t2) * sstep(1, 0.9, t2) * fade;
      if (ringPorous) early = Math.max(early * 0.5, (1 - sstep(0, 0.25, t2)) * fade);
    }
  }
  let pore = sstep(0.66, 0.9, G.pores[i]) * poreK;
  if (ringPorous) pore *= 0.2 + 0.8 * early;
  const fl = fleckK ? sstep(0.68, 0.84, G.fleck[i] + 0.25 * (G.big[i] - 0.5)) * fleckK : 0;
  const k = (1 - contrast * late) * (1 - fineK * ring) * (0.9 + 0.2 * G.big[i]) * (0.93 + 0.14 * G.streak[i]) * (1 - pore) * (1 + 0.3 * fl);
  // latewood is denser and more saturated (less blue), not just darker
  const dl = contrast * late + fineK * ring;
  o.r = base[0] * k; o.g = base[1] * k * (1 - 0.06 * dl); o.b = base[2] * k * (1 - 0.18 * dl);
  WP.late = late; WP.pore = pore; WP.fl = fl; WP.ring = ring;
}

/**
 * Open-deck planking: yellow pine / teak strakes, black pitch (marine glue) in the seams, staggered butts, wooden
 * plugs over the bolts at every beam, holystoned and weathered (soft earlywood worn away, latewood standing proud).
 */
export function woodPlanks({ size = 1024, metres = 4, planks = 32, base = '#b3a07f', seam = '#1f1c19', seed = 3, weathered = true } = {}) {
  const S = size, REF = 1024, k = S / REF, P = S / planks, r = rng(seed);
  const butt = [], phase = [], tnt = [], cyc = [], grey = [], cath = [], drift = [];
  for (let i = 0; i < planks; i++) {
    tnt.push(r()); butt.push(Math.floor(r() * S)); phase.push(Math.floor(r() * S)); cyc.push(0.75 + 0.55 * r());
    grey.push(r()); cath.push(r() < 0.45 ? 0.6 + 1.6 * r() : 0); drift.push(0.2 + 0.6 * r());
  }
  const G = grainFields(S, seed, false, true);
  const GREY = hex('#9a968a'), B = hex(base), SEAM = hex(seam), PITCHW = hex('#5c5850'), DIRT = hex('#6f665a');
  const stain = fbm(S, 4, 4, 4, seed + 10), wet = fbm(S, 6, 3, 3, seed + 11);
  const hw = Math.max(0.45, 0.0035 / metres * S);            // half the 7 mm seam
  const beams = 5, plugR = 0.011 / metres * S, plugK = sstep(0.8, 1.6, plugR);
  const dirtW = Math.max(0.8, 2.6 * k);
  const fineA = 0.06 / Math.max(k, 0.5);
  return surface({ size: S, metres, normal: 2.2, ref: REF }, (x, y, o) => {
    const i = y * S + x, row = Math.floor(y / P), fy = y + 0.5 - row * P;
    const xr = (x - butt[row] + S) % S;                      // 0 at this plank's butt
    const gx = (xr + phase[row]) % S, gi = y * S + gx;
    const p0 = drift[row] * xr / S + cath[row] * Math.cos(TAU * 2 * xr / S) + row * 0.37;
    woodPixel(G, gi, y + row * 7, S, planks * 3.2 * cyc[row], o, B, 0.24, 0, 0.2, planks * 9 * cyc[row], 0.08, false, p0);
    const late = WP.late, pore = WP.pore, ring = WP.ring;
    mul(o, 0.88 + 0.2 * tnt[row]);
    if (weathered) blend(o, GREY, 0.2 + 0.3 * grey[row] * (0.5 + 0.5 * G.big[gi]) + 0.1 * stain[i]);
    blend(o, DIRT, 0.12 * sstep(0.55, 0.85, stain[i]));      // old water / soot stains
    mul(o, 0.96 + 0.08 * G.fine[i]);
    // seams: caulking between strakes (bottom edge of each plank), butt joint
    const dEdge = Math.min(fy, P - fy), dButt = wrapD(x + 0.5 - butt[row], S);
    const cs = Math.max(cover(dEdge, hw), cover(dButt, hw));
    // dirt and wear collect along the seams, end grain at the butt is darker
    const nearSeam = Math.exp(-Math.max(0, Math.min(dEdge, dButt) - hw) / dirtW);
    mul(o, 1 - 0.14 * nearSeam - 0.12 * Math.exp(-dButt / (6 * k + 1)));
    const crown = 1 - Math.pow((fy - P / 2) / (P / 2), 2) * 0.3;
    let h = 0.75 * crown + 0.3 * late + 0.1 * ring - 0.2 * pore + fineA * G.fine[i] - 0.25 * nearSeam;
    let rough = 0.7 + 0.12 * (1 - late) + 0.08 * (1 - G.big[gi]) - 0.1 * sstep(0.5, 0.9, wet[i]);
    let ao = 1 - 0.32 * nearSeam;
    // plugs (dowels over the bolts at every beam), not right next to a butt
    if (plugK > 0) {
      const bx = (Math.floor(x / (S / beams)) + 0.5) * (S / beams);
      if (dButt > plugR * 3) {
        const d = hyp(x + 0.5 - bx, fy - P / 2);
        if (d < plugR + 1) {
          const inside = clamp01(plugR - d + 0.5), rim = cover(d - plugR, 0.5) * plugK;
          const hp = hash2(bx, row, seed);
          blend(o, [o.r * (0.86 + 0.2 * hp), o.g * (0.84 + 0.2 * hp), o.b * (0.8 + 0.2 * hp)], inside * plugK);
          mul(o, 1 - 0.3 * rim);
          h -= 0.12 * inside * plugK + 0.2 * rim; ao -= 0.15 * rim;
        }
      }
    }
    if (cs > 0) {
      const pc = [SEAM[0], SEAM[1], SEAM[2]];
      const pw = hash2(row, Math.floor(x / 40), seed + 3);   // pitch worn grey in places
      blend(o, pw > 0.75 ? PITCHW : pc, cs);
      h = lerp(h, -0.7, cs); rough = lerp(rough, 0.42, cs); ao = lerp(ao, 0.55, cs);
    }
    o.h = h; o.rough = rough; o.ao = ao;
  });
}

/** Solid wood for furniture / mouldings (oak by default: ring-porous, quarter-sawn ray flecks). */
export function woodSolid({ size = 512, metres = 1.5, base = '#8a5c32', cycles = 24, fleck = 0, contrast = 0.22, seed = 5, rough = 0.5 } = {}) {
  const S = size, k = S / 512, G = grainFields(S, seed, fleck > 0, true), B = hex(base);
  const polish = fbm(S, 3, 5, 4, seed + 30), wipe = strokes(S, Math.round(160 * k * k) + 20, seed + 31, { len: [20 * k, 120 * k], dir: 0, spread: 0.25, curve: 0.3, amp: [0.2, 0.6] });
  const fineA = 0.05 / Math.max(k, 0.5);
  return surface({ size: S, metres, normal: 1.2, ref: 512 }, (x, y, o) => {
    const i = y * S + x;
    woodPixel(G, i, y, S, cycles, o, B, contrast, fleck, 0.34, cycles * 4.5, 0.12, true, 0, 1.2);
    const { late, pore, fl, ring } = WP;
    o.h = 0.22 * late + 0.12 * ring - 0.9 * pore + 0.12 * fl + fineA * G.fine[i];
    // hand-rubbed finish: the sheen varies slowly, faint wipe marks along the grain, rays polish up glossier
    o.rough = rough + 0.14 * pore - 0.1 * fl + 0.1 * (polish[i] - 0.5) + 0.06 * wipe[i] + 0.04 * late;
    o.ao = 1 - 0.32 * pore;
  });
}

/** Raised (or flat-sunk) panel relief: frame, ovolo moulding, groove, bevel, field. All widths in px. */
function panelProfile(d, J, F, M, B, raised, P) {
  if (d < J) { P.h = 0.55; P.ao = 0.55; return P; }
  if (d < F) { P.h = 1; P.ao = 1; return P; }
  if (d < F + M) { const t = (d - F) / M; P.h = 0.3 + 0.7 * Math.cos(t * Math.PI / 2); P.ao = 1 - 0.25 * t; return P; }
  const G = Math.max(1.5, M * 0.3);
  if (d < F + M + G) { P.h = 0.25; P.ao = 0.55; return P; }
  if (raised && d < F + M + G + B) { const t = (d - F - M - G) / B; P.h = 0.25 + 0.5 * Math.sin(t * Math.PI / 2); P.ao = 0.75 + 0.25 * t; return P; }
  P.h = raised ? 0.75 : 0.3; P.ao = 1; return P;
}

/**
 * Oak frame-and-panel wainscot (one panel per tile): stiles run the full height (vertical grain), rails between them
 * (horizontal grain, butt joint visible), mitred ovolo sticking, raised field of quarter-sawn oak with ray flecks;
 * wax and dust in the recesses, the polish worn glossier on the field and frame.
 */
export function woodPanel({ size = 512, metres = 1.2, base = '#87592e', seed = 7 } = {}) {
  const S = size, k = S / 512, G = grainFields(S, seed, true), B = hex(base), DARK = hex('#2a1407'), WAX = hex('#3a2412');
  const F = 40 * k, M = 10 * k, BV = 30 * k, J = Math.max(1, 1.2 * k), jw = Math.max(0.35, 0.5 * k);
  const polish = fbm(S, 3, 3, 4, seed + 30), dust = fbm(S, 8, 8, 3, seed + 31);
  const P = { h: 0, ao: 1 };
  const inner = F + M + Math.max(1.5, M * 0.3);
  return surface({ size: S, metres, normal: 6, ref: 512 }, (x, y, o) => {
    const dx = Math.min(x, S - 1 - x), dy = Math.min(y, S - 1 - y), d = Math.min(dx, dy);
    panelProfile(d, J, F, M, BV, true, P);
    const stile = dx < F;
    const vertical = d < F ? stile : d < F + M ? dx <= dy : true;
    // each piece is another board: other ring phase
    const ph = d >= F + M ? 0.15 : stile ? (x < S / 2 ? 0 : 0.45) : d < F ? (y < S / 2 ? 0.7 : 0.25) : 0.9;
    const i = vertical ? x * S + y : y * S + x;
    woodPixel(G, i, vertical ? x : y, S, 22, o, B, 0.1, d >= inner ? 0.45 : 0.25, 0.16, 100, 0.08, true, ph, 1.3);
    const { late, pore, fl, ring } = WP;
    if (d >= inner) mul(o, 1.04);
    blend(o, DARK, (1 - P.ao) * 0.5);
    // rail-to-stile joint lines
    let joint = 0;
    if (!stile && dy < F) joint = cover(dx - F, jw);
    // wax / dust settled in the groove and on the lower edge of the moulding
    const rec = d >= F + M && d < inner ? 1 : 0;
    blend(o, WAX, rec * (0.25 + 0.25 * dust[y * S + x]));
    mul(o, 1 - 0.45 * joint);
    o.h = P.h + 0.008 * late + 0.005 * ring - 0.016 * pore + 0.006 * fl - 0.08 * joint;
    o.ao = P.ao * (1 - 0.35 * joint);
    const pol = polish[y * S + x];
    o.rough = 0.4 + 0.12 * pore - 0.06 * fl + (1 - P.ao) * 0.22 + 0.08 * (pol - 0.5) + 0.15 * rec * dust[y * S + x];
  });
}

/**
 * White enamel-painted pine panelling: brush marks along each piece, the pine grain faintly telegraphing through,
 * paint pooled into the corners of the mouldings, a faint ivory yellowing and dust in the recesses.
 */
export function paintedPanel({ size = 512, metres = 1.0, base = '#e7e4db', seed = 13 } = {}) {
  const S = size, k = S / 512, B = hex(base), GRIME = hex('#a49d8c'), IVORY = hex('#e3d9bf');
  const peel = vnoise(S, cells(S, 160), cells(S, 160), seed), big = fbm(S, 4, 4, 3, seed + 1), brush = vnoise(S, 6, cells(S, 220), seed + 2);
  const gwarp = fbm(S, 3, 6, 4, seed + 41);
  const F = 36 * k, M = 8 * k, J = Math.max(1, 1.2 * k);
  const P = { h: 0, ao: 1 };
  return surface({ size: S, metres, normal: 5, ref: 512 }, (x, y, o) => {
    const i = y * S + x;
    const dx = Math.min(x, S - 1 - x), dy = Math.min(y, S - 1 - y), d = Math.min(dx, dy);
    panelProfile(d, J, F, M, 0, false, P);
    const vertical = d < F ? dx < F : d < F + M ? dx <= dy : true;
    const ti = vertical ? x * S + y : i;
    // grain under the paint: latewood ridges a few microns high
    const gl = Math.pow(0.5 + 0.5 * Math.sin(TAU * ((vertical ? x : y) / S * 18 + gwarp[ti] * 2)), 4);
    put(o, B, 0.97 + 0.04 * big[i]);
    blend(o, IVORY, 0.18 * (1 - P.ao) + 0.08 * (1 - big[i]));
    blend(o, GRIME, (1 - P.ao) * 0.35 + 0.04 * (1 - big[i]));
    // paint fillet in the corners of the sticking (rounded, slightly glossier)
    const fill = d >= F + M && d < F + M + 4 * k ? 1 - (d - F - M) / (4 * k) : 0;
    o.h = P.h + 0.006 * peel[i] + 0.005 * brush[ti] + 0.006 * gl + 0.05 * fill;
    o.ao = P.ao;
    o.rough = 0.32 + 0.08 * big[i] + (1 - P.ao) * 0.22 - 0.06 * fill + 0.04 * brush[ti];
  });
}

/** Varnished pine matchboarding (third class): V-jointed boards, knots with the grain flowing round, resin streaks. */
export function pineBoards({ size = 512, metres = 1.6, boards = 8, base = '#c4a571', seed = 11 } = {}) {
  const S = size, k = S / 512, P = S / boards, G = grainFields(S, seed), B = hex(base), r = rng(seed);
  const KNOT = hex('#5e3a1a'), KNOTC = hex('#8a5a2c'), RESIN = hex('#b07a38');
  const knots = [];
  for (let n = 0; n < 5; n++) knots.push({ x: r() * S, y: (Math.floor(r() * boards) + 0.3 + r() * 0.4) * P, rx: (5 + r() * 6) * k, ry: (3 + r() * 3) * k, dead: r() < 0.4 });
  const tnt = [], ph = []; for (let n = 0; n < boards; n++) { tnt.push(r()); ph.push(r() * 3); }
  const varnish = fbm(S, 3, 3, 4, seed + 30), resin = vnoise(S, 3, cells(S, 40), seed + 31);
  const gw = 2.2 * Math.max(k, 0.5);
  return surface({ size: S, metres, normal: 2.5, ref: 512 }, (x, y, o) => {
    const i = y * S + x, row = Math.floor(y / P), fy = y + 0.5 - row * P;
    // grain bends around knots
    let kd = 9, warpK = 0, kn = null;
    for (const kk of knots) {
      const ddx = wrapD(x - kk.x, S);
      const e = Math.sqrt((ddx / kk.rx) ** 2 + ((y - kk.y) / kk.ry) ** 2);
      if (e < kd) { kd = e; kn = kk; }
      warpK += Math.exp(-e * 0.5) * 3 * k * Math.sign(y - kk.y);
    }
    woodPixel(G, i, y + warpK, S, 30, o, B, 0.32, 0, 0.15, 110, 0.1, false, ph[row]);
    const { late, ring } = WP;
    mul(o, 0.92 + 0.14 * tnt[row]);
    // resin streaks along the grain, a little darker and glossier
    const rs = sstep(0.72, 0.9, resin[i]);
    blend(o, RESIN, rs * 0.25);
    let h = 0.08 * late + 0.04 * ring, rough = 0.48 + 0.1 * late + 0.1 * (varnish[i] - 0.5) - 0.1 * rs;
    if (kd < 1.8) {
      const t = sstep(1.8, 0.5, kd);
      blend(o, kd < 1 ? KNOTC : KNOT, t * 0.85);
      if (kd < 1) mul(o, 0.85 + 0.15 * Math.sin(kd * 14));    // rings inside the knot
      if (kn.dead) { const rim = cover((kd - 1) * kn.rx, 0.6); mul(o, 1 - 0.5 * rim); h -= 0.3 * rim; }
      h += 0.1 * t; rough -= 0.05 * t;
    }
    // V-joint between the boards
    const groove = Math.min(fy, P - fy);
    o.h = h + 0.6 - 0.6 * Math.exp(-groove / gw);
    o.ao = 1 - 0.45 * Math.exp(-groove / (gw * 1.15));
    mul(o, 1 - 0.4 * Math.exp(-groove / gw));
    o.rough = rough + 0.1 * Math.exp(-groove / gw);
  });
}

// Polished (French-polished) mahogany: deep red-brown, fine interlocked "ribbon" figure that shows mostly as a change
// of sheen (roughness) rather than of colour; low-contrast straight grain, fine dark (filled) pores.
export function mahoganyFigure({ size = 512, metres = 1.5, base = '#47251a', seed = 9 } = {}) {
  const S = size, k = S / 512, G = grainFields(S, seed), B = hex(base), DEEP = hex('#381c13'), WARM = hex('#5a321f');
  const fig = fbm(S, 4, 2, 3, seed + 20), drift = fbm(S, 2, 3, 3, seed + 21), polish = fbm(S, 4, 4, 4, seed + 22);
  const wipe = strokes(S, Math.round(120 * k * k) + 20, seed + 23, { len: [30 * k, 160 * k], dir: 0, spread: 0.2, curve: 0.4, amp: [0.2, 0.5] });
  return surface({ size: S, metres, normal: 0.6, ref: 512 }, (x, y, o) => {
    const i = y * S + x;
    woodPixel(G, i, y, S, 46, o, B, 0.07, 0, 0.14, 140, 0.05);
    const { late, pore } = WP;
    // interlocked grain: narrow ribbons (~3 cm) that wander slightly, alternating light / dark with the view angle
    const ribbon = 0.5 + 0.5 * Math.sin(TAU * (y / S * 48 + fig[i] * 2.2));
    const rib = sstep(0.25, 0.75, ribbon);
    blend(o, WARM, 0.14 * rib);
    blend(o, DEEP, 0.2 * (1 - drift[i]));                // slow colour drift across a board
    o.h = 0.08 * late - 0.5 * pore + 0.05 * rib;
    o.rough = 0.28 + 0.1 * (1 - rib) + 0.1 * pore + 0.06 * (polish[i] - 0.5) + 0.05 * wipe[i]; // the figure shimmers in the sheen
    o.ao = 1 - 0.15 * pore;
  });
}

// ------------------------------------------------------------------ metal / steel

/**
 * Painted, riveted steel plating (crew / machinery spaces). rows = plate strakes per tile, rivet pitch / radius in px
 * at 512. Paint is slightly uneven (brush marks, runs below the laps, fillets round the rivets), chipped on edges and
 * rivet heads, with grime on the lap ledges and rust weeping down from some rivets.
 */
export function rivetedSteel({ size = 512, metres = 2.4, rows = 2, pitch = 16, rad = 2.8, base = '#8b8e90', rust = 0.5, seed = 15, paintMetal = 0.08 } = {}) {
  const S = size, k = S / 512, R = S / rows, B = hex(base), RUST = hex('#74431f'), RUSTD = hex('#4a2a16'), DIRT = hex('#4a4640'), PRIMER = hex('#6d4a3a');
  const wav = fbm(S, 4, 4, 3, seed), grime = fbm(S, 5, 3, 4, seed + 1), fine = vnoise(S, cells(S, 128), cells(S, 128), seed + 2), brk = vnoise(S, cells(S, 64), 16, seed + 3);
  const brush = vnoise(S, cells(S, 150), 5, seed + 4), chipN = vnoise(S, cells(S, 90), cells(S, 90), seed + 5), runs = vnoise(S, cells(S, 70), 3, seed + 6);
  const pt = Math.max(8, Math.round(pitch * k)), rd0 = rad * k, rK = sstep(0.6, 1.2, rd0), off = 7 * k, lapW = Math.max(1, 1.5 * k);
  const fineA = 0.25 / Math.max(k, 0.5);
  return surface({ size: S, metres, normal: 2.5, ref: 512 }, (x, y, o) => {
    const i = y * S + x, row = Math.floor(y / R), fy = y + 0.5 - row * R;
    const buttX = (row % 2) * (S / 2);
    const bx = wrapD(x + 0.5 - buttX, S);
    put(o, B, 0.94 + 0.08 * grime[i] + 0.03 * fine[i]);
    let h = (row % 2 ? 0.7 : 0) + 2.5 * wav[i] + fineA * 0.4 * fine[i] + 0.12 * brush[i];
    // lap below (fy = 0 is the lower edge of this plate) and butt
    const lap = Math.max(cover(fy, lapW), cover(bx, lapW * 0.8));
    // grime collects on the ledge just above the lower plate's edge
    const ledge = Math.exp(-fy / (5 * k + 1));
    blend(o, DIRT, 0.5 * lap + 0.22 * ledge * (0.5 + grime[i]));
    h -= 0.4 * lap;
    // paint runs hanging below the upper lap
    const du = R - fy;
    if (du < 30 * k) h += 0.25 * sstep(0.75, 0.95, runs[i]) * (1 - du / (30 * k));
    // rivets: two rows along each lap, two columns along each butt
    let rd = 99;
    for (const ry of [off, R - off]) {
      const cx = Math.round(x / pt) * pt, dd = hyp(x - cx, fy - ry);
      if (dd < rd) rd = dd;
    }
    for (const rx of [buttX - off, buttX + off]) {
      const dxx = wrapD(x - rx, S);
      const cy = Math.round(fy / pt) * pt, dd = hyp(dxx, fy - cy);
      if (dd < rd) rd = dd;
    }
    let metal = paintMetal, rough = 0.5 + 0.14 * grime[i] + 0.06 * brush[i];
    if (rd < rd0) {
      const dome = Math.sqrt(1 - (rd / rd0) ** 2);
      h += 1.6 * dome * rK; rough -= 0.06;
      // worn paint on the crown of the head
      if (dome > 0.75 && chipN[i] > 0.55) { blend(o, [0.42, 0.42, 0.42], 0.5 * rK); metal = 0.5; rough = 0.42; }
    } else if (rd < rd0 + 2 * k + 0.5) {
      // paint fillet round the head
      const t = (rd - rd0) / (2 * k + 0.5);
      h += 0.35 * (1 - t) * rK; o.ao = 1 - 0.22 * (1 - t) * rK;
    }
    // chipped paint near edges and rivets: primer, sometimes bare rusty steel
    const edgeW = Math.exp(-Math.min(fy, R - fy, bx) / (10 * k + 1)) + (rd < rd0 * 2.5 ? 0.5 : 0);
    const chip = sstep(0.9, 0.95, chipN[i] + 0.07 * edgeW) * sstep(0.45, 0.7, grime[i]);
    if (chip > 0) {
      blend(o, chipN[i] > 0.9 ? RUSTD : PRIMER, chip * 0.85);
      h -= 0.25 * chip; rough += 0.2 * chip; metal *= 1 - chip;
    }
    // rust streaks running down (towards lower v) from some rivets of the lap above
    if (rust > 0) {
      const cx = Math.round(x / pt) * pt;
      const dy = (R - off) - fy;
      if (dy > 0 && hash2(cx, row, seed) > 0.8) {
        const spread = 1.5 + dy * 0.03;
        const w = Math.abs(x - cx) + (brk[i] - 0.5) * 3 * spread;
        const kk = Math.exp(-dy / ((40 + 60 * hash2(cx, row, seed + 1)) * k)) * sstep(2.5 * spread * Math.max(k, 0.6), 0.5, w) * rust;
        blend(o, RUST, kk * 0.7); rough += kk * 0.3; metal *= 1 - kk;
      }
      // rust at the lower lap edge where water stands
      const re = Math.exp(-fy / (3 * k + 0.8)) * sstep(0.55, 0.8, grime[i]) * rust;
      blend(o, RUST, re * 0.5);
    }
    o.h = h; o.metal = metal; o.rough = rough;
  });
}

/**
 * Lapped and riveted hull / superstructure plating (white albedo with weathering, multiplied by material colour):
 * in-and-out strakes, staggered butts, closely riveted seams, hungry-horse dishing between the frames, faint
 * vertical weathering streaks, slight plate-to-plate paint variation, rust weeping from a few rivets.
 */
export function hullPlating({ size = 1024, metres = 6, seed = 17 } = {}) {
  const S = size, REF = 1024, k = S / REF, ROWS = 4, R = S / ROWS, FR = 7, FP = S / FR;
  const streak = vnoise(S, cells(S, 40), 3, seed), streak2 = fbm(S, 8, 2, 3, seed + 1), big = fbm(S, 3, 3, 4, seed + 2), fine = vnoise(S, cells(S, 256), cells(S, 256), seed + 3);
  const drip = vnoise(S, cells(S, 160), 6, seed + 4), canN = fbm(S, 7, 4, 3, seed + 5);
  const RUST = hex('#8a5a3a'), GRIME = hex('#a8a59e'), SALT = hex('#c9c6be');
  const rp = S / Math.round(S / Math.max(6, 14 * k)), rr = 2.4 * k, rK = sstep(0.55, 1.1, rr), lapE = 3 * k, bw = Math.max(0.8, 1.5 * k);
  const plates = 8;                                    // plate length: S / plates * metres ≈ 0.75 m per butt group
  return surface({ size: S, metres, normal: 1.6, ref: REF }, (x, y, o) => {
    const i = y * S + x, row = Math.floor(y / R), fy = y + 0.5 - row * R;
    const outer = row % 2;
    const buttX = ((row % 2 ? S / 2 : 0) + 40 * k * row) % S;
    const bx = wrapD(x + 0.5 - buttX, S);
    const fx = x % FP;
    const plateId = Math.floor(((x - buttX + S) % S) / (S / 2)) + row * 2;
    // hungry-horse dishing between frames, a little irregular from plate to plate (oil-canning)
    const dish = Math.pow(Math.sin(Math.PI * fx / FP), 2) * Math.pow(Math.sin(Math.PI * fy / R), 2);
    let h = outer * 1.2 - (0.5 + 0.35 * canN[i]) * dish + 1.5 * big[i];
    // lap edge: outer strakes overlap the inner ones, chamfered edge
    if (outer) { const e = Math.min(fy, R - fy); if (e < lapE) h -= (lapE - e) * 0.35 / k; }
    else { const e = Math.min(fy, R - fy); if (e < lapE * 2) h -= 0.25 * (1 - e / (lapE * 2)); }
    const butt = cover(bx, bw * 0.5);
    h -= 0.6 * butt;
    o.r = o.g = o.b = (0.95 + 0.05 * fine[i]) * (0.985 + 0.03 * hash2(plateId, 0, seed));
    // weathering streaks running down from the laps and rivets
    const s = sstep(0.55, 0.9, streak[i]) * (0.5 + 0.5 * streak2[i]);
    const below = Math.exp(-(R - fy) / (R * 0.5));            // streaks strongest just below the lap above
    blend(o, GRIME, 0.3 * s * (0.6 + 0.4 * below) + 0.1 * (1 - big[i]) + 0.25 * butt);
    blend(o, SALT, 0.12 * sstep(0.8, 0.95, drip[i]) * below);
    let rd = 99;
    for (const ry of [6 * k, 14 * k, R - 6 * k, R - 14 * k]) { const cx = Math.round(x / rp) * rp; const d = hyp(x - cx, fy - ry); if (d < rd) rd = d; }
    for (const ox of [-8 * k, 8 * k, -18 * k, 18 * k]) { const d0 = wrapD(x - buttX - ox, S); const cy = Math.round(fy / rp) * rp; const d = hyp(d0, fy - cy); if (d < rd) rd = d; }
    { const cy = Math.round(fy / (2 * rp)) * 2 * rp; const d = hyp(fx - FP / 2, fy - cy) * 1.2; if (d < rd) rd = d; }
    if (rd < rr) h += 1.1 * Math.sqrt(1 - (rd / rr) ** 2) * rK;
    // rust weeping from some rivets / butts
    const cx = Math.round(x / rp) * rp, dy = (R - 6 * k) - fy;
    if (dy > 0 && hash2(cx, row, seed) > 0.92) {
      const kk = Math.exp(-dy / (70 * k)) * sstep(3 * Math.max(k, 0.5), 0.5, Math.abs(x - cx) + (fine[i] - 0.5) * 3);
      blend(o, RUST, kk * 0.5);
    }
    o.h = h;
    o.rough = 0.42 + 0.22 * s + 0.1 * (1 - big[i]) + 0.05 * dish;
    o.ao = (rd < rr + 1 && rd >= rr ? 1 - 0.15 * rK : 1) * (1 - 0.25 * butt);
  });
}

export function treadPlate({ size = 512, metres = 1.0, seed = 35 } = {}) {
  const S = size, C = S / 8, BASE = hex('#4d5053'), TOP = hex('#7f8285'), DIRT = hex('#2e2d2b'), RUST = hex('#6a3d22');
  const g = fbm(S, 6, 6, 4, seed), fine = vnoise(S, cells(S, 256), cells(S, 256), seed + 1), rs = fbm(S, 8, 8, 3, seed + 2);
  const scuff = strokes(S, Math.round(300 * (S / 512) ** 2) + 30, seed + 3, { len: [6, 50 * S / 512], dir: 0, spread: 0.5, curve: 0.3, amp: [0.3, 0.8] });
  const L = C * 0.32, W = C * 0.085, aa = 1.2;
  return surface({ size: S, metres, normal: 3, ref: 512 }, (x, y, o) => {
    const i = y * S + x, cx = Math.floor(x / C), cy = Math.floor(y / C);
    const lx = x + 0.5 - (cx + 0.5) * C, ly = y + 0.5 - (cy + 0.5) * C;
    const dir = (cx + cy) % 2 ? 1 : -1;
    // distance to the bar segment rotated by 45 deg
    const u = (lx + dir * ly) * 0.7071, v = (-dir * lx + ly) * 0.7071;
    const du = Math.max(Math.abs(u) - L, 0), d = hyp(du, v);
    const bar = sstep(W + aa, W - aa, d);
    put(o, BASE, 0.85 + 0.2 * g[i] + 0.06 * fine[i]);
    blend(o, DIRT, (1 - bar) * (0.3 + 0.25 * (1 - g[i])) * sstep(W, W + 6, d));
    // bar tops polished bright by boots, scuffs across them
    blend(o, TOP, bar * (0.55 + 0.25 * scuff[i]));
    const rust = sstep(0.68, 0.8, rs[i]) * (1 - bar * 0.7);
    blend(o, RUST, rust * 0.6);
    o.h = bar * (0.6 + 0.4 * Math.sqrt(Math.max(0, 1 - (d / (W + 1)) ** 2))) * 1.6 + 0.2 * fine[i] - 0.15 * scuff[i];
    o.metal = lerp(0.5, 0.88, bar) * (1 - rust);
    o.rough = lerp(0.64, 0.3, bar) + rust * 0.3 + 0.1 * scuff[i] * (1 - bar);
    o.ao = bar > 0.5 ? 1 : 0.8 + 0.2 * sstep(W + 1, W + 6, d);
  });
}

/**
 * Metal finish (brass, gilt, copper, iron, chrome multiply their colour / roughness with it): polishing hairlines,
 * fine random scratches, finger smudges (rougher) and faint brownish tarnish blotches (in the albedo).
 */
export function metalSmudge({ size = 512, metres = 0.6, seed = 81 } = {}) {
  const S = size, k = S / 512, sm = fbm(S, 5, 5, 5, seed), fine = vnoise(S, cells(S, 128), cells(S, 128), seed + 3), tarn = fbm(S, 3, 3, 5, seed + 4);
  const scr = strokes(S, Math.round(700 * k * k) + 40, seed + 1, { len: [3 * k + 2, 60 * k + 4], curve: 0.8, amp: [0.25, 1] });
  const hair = strokes(S, Math.round(260 * k * k) + 20, seed + 2, { len: [60 * k, 260 * k], dir: 0.15, spread: 0.12, curve: 0.2, amp: [0.15, 0.45] });
  const sK = Math.min(1, k * 1.3);                       // thinner than a pixel at low res: fade
  return surface({ size: S, metres, normal: 0.6, ref: 512 }, (x, y, o) => {
    const i = y * S + x;
    const s = sstep(0.4, 0.75, sm[i]);
    const t = sstep(0.5, 0.85, tarn[i]);
    const sc = Math.max(scr[i], hair[i] * 0.8) * sK;
    o.r = o.g = o.b = 0.9 + 0.1 * (1 - s * 0.6) * (0.95 + 0.05 * fine[i]);
    tint(o, 1 - 0.12 * t, 1 - 0.15 * t, 1 - 0.24 * t);
    o.r += 0.04 * sc; o.g += 0.04 * sc; o.b += 0.04 * sc;
    o.rough = 0.7 + 0.24 * s + 0.12 * t + 0.18 * sc;
    o.h = -0.5 * sc + 0.15 * s;
  });
}

/** Painted surface: orange peel, brush marks, a few sags, grime blotches; roughness factor in G. */
export function paintSurface({ size = 512, metres = 2.0, seed = 85 } = {}) {
  const S = size, peel = vnoise(S, cells(S, 180), cells(S, 180), seed), big = fbm(S, 4, 4, 4, seed + 1), drip = vnoise(S, cells(S, 60), 4, seed + 2);
  const brush = vnoise(S, cells(S, 200), 4, seed + 3), sag = vnoise(S, cells(S, 50), 10, seed + 4);
  return surface({ size: S, metres, normal: 0.22, ref: 512 }, (x, y, o) => {
    const i = y * S + x;
    const gr = sstep(0.55, 0.85, big[i]) * 0.5 + sstep(0.7, 0.9, drip[i]) * 0.4;
    const sg = sstep(0.82, 0.95, sag[i]);
    o.r = o.g = o.b = 1 - 0.06 * gr - 0.02 * peel[i] - 0.015 * sg;
    o.g -= 0.006 * gr; o.b -= 0.02 * gr;
    o.h = 0.25 * peel[i] + 2 * big[i] + 0.35 * brush[i] + 0.8 * sg;
    o.rough = 0.8 + 0.16 * gr - 0.08 * sg + 0.04 * brush[i];
    o.ao = 1;
  });
}

export function rustSurface({ size = 512, metres = 1.0, seed = 87 } = {}) {
  const S = size, a = fbm(S, 6, 6, 5, seed), b = fbm(S, 16, 16, 3, seed + 1), w = worley(S, cells(S, 24), seed + 2), pit = worley(S, cells(S, 90), seed + 3);
  const C1 = hex('#5a2e18'), C2 = hex('#8c4c24'), C3 = hex('#2f2219'), C4 = hex('#a8652f');
  return surface({ size: S, metres, normal: 2, ref: 512 }, (x, y, o) => {
    const i = y * S + x;
    put(o, C1);
    blend(o, C2, sstep(0.45, 0.75, a[i]));
    blend(o, C3, sstep(0.6, 0.8, b[i]) * 0.7);
    const flake = sstep(0.1, 0.0, w.d2[i] - w.d1[i]);
    const p = sstep(0.35, 0.1, pit.d1[i]);                  // corrosion pits
    blend(o, C4, sstep(0.75, 0.9, w.id[i]) * 0.35 * (1 - flake)); // fresh orange scale on some flakes
    mul(o, 1 - 0.3 * p);
    o.h = 1.2 * a[i] + 0.8 * b[i] - flake * 0.8 - 0.6 * p;
    o.rough = 0.9 + 0.1 * b[i];
    o.ao = 1 - flake * 0.3 - 0.25 * p;
    o.metal = 0.05;
  });
}

// ------------------------------------------------------------------ floors

/** Coverage masks of the carpet design for one motif cell (S/2 px square), shared by all carpets of that size. */
const CM = 11; // out, lat, dots, leaf, rib, ros, rosHi, ringQuat, core, qcore, scroll
function carpetMotif(S) {
  return cached(`carpetMotif${S}`, () => {
    const C = S >> 1, D = new Float32Array(C * C * CM);
    const px = 1 / C;                           // one pixel in cell units
    const ff = (sd) => clamp01(0.5 - sd / px);  // anti-aliased fill of a signed distance (cell units)
    for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) {
      const cu = (x + 0.5) / C - 0.5, cv = (y + 0.5) / C - 0.5;
      const au = Math.abs(cu), av = Math.abs(cv);
      const r = hyp(cu, cv), a = Math.atan2(cv, cu);
      // tone-on-tone ground: a powdering of small darker dots
      const gd = ff(hyp(frac(cu * 10 + 0.5) - 0.5, frac(cv * 10 + 0.5) - 0.5) / 10 - 0.009);
      // trellis: gold band with dark outline
      const dl = Math.abs(au + av - 0.5) * 0.7071;
      const out = ff(dl - 0.026), lat = ff(dl - 0.014);
      // dotted inner border
      const dl2 = Math.abs(au + av - 0.39) * 0.7071;
      const along = (au - av) * 14;
      const dots = ff(hyp(dl2, (frac(along) - 0.5) / 14) - 0.011);
      // leaves pointing from the rosette along the axes (to the trellis junctions), with a light midrib
      const s = Math.max(au, av), tt = Math.min(au, av);
      const leafW = s > 0.17 && s < 0.36 ? 0.042 * Math.sin(Math.PI * (s - 0.17) / 0.19) : 0;
      const leaf = leafW > 0 ? ff(tt - leafW) : 0, leafOut = leafW > 0 ? ff(tt - leafW - 0.01) : 0;
      const rib = leaf * ff(tt - 0.004);
      // rosette: 8 petals in the accent colour, gold ring and centre, dark outline
      const petal = 0.13 + 0.05 * Math.cos(8 * a);
      const ros = ff(r - petal), rosOut = ff(r - petal - 0.012);
      const ring = ff(Math.abs(r - 0.075) - 0.012), core = ff(r - 0.035);
      // quatrefoils at the trellis junctions (cell edge midpoints)
      const qx = au > av ? 0.5 : 0, qy = au > av ? 0 : 0.5;
      const ddx = au - qx, ddy = av - qy, dj = hyp(ddx, ddy), aj = Math.atan2(ddy, ddx);
      const qr = 0.06 * (0.65 + 0.35 * Math.abs(Math.cos(2 * aj)));
      let quat = ff(dj - qr), quatOut = ff(dj - qr - 0.01), qcore = ff(dj - 0.018);
      // star medallion in the diamonds between the rosettes (centred on the cell corners)
      const ex = 0.5 - au, ey = 0.5 - av, rc = hyp(ex, ey), ac = Math.atan2(ey, ex);
      const star = 0.075 + 0.035 * Math.cos(8 * ac);
      const st = ff(rc - star);
      quatOut = Math.max(quatOut, ff(rc - star - 0.01));
      qcore = Math.max(qcore, ff(rc - 0.03));
      quat = Math.max(quat, st * (1 - ff(Math.abs(rc - 0.05) - 0.008)));
      const k = (y * C + x) * CM;
      D[k] = Math.max(out, rosOut, leafOut, quatOut); D[k + 1] = lat; D[k + 2] = dots; D[k + 3] = leaf; D[k + 4] = rib;
      D[k + 5] = ros; D[k + 6] = ros * sstep(0.12, 0.06, r); D[k + 7] = Math.max(ring, quat); D[k + 8] = core; D[k + 9] = qcore; D[k + 10] = gd;
    }
    return D;
  });
}

/**
 * Axminster-style cut-pile carpet: diamond trellis in gold with dark outlines, two-tone rosettes, leaves along the
 * trellis axes, quatrefoils at the junctions, dotted inner border, tone-on-tone ground. Pile tufts in the normal
 * map, slight dips where colours meet, faint abrash (dye-lot) bands, flattened lighter traffic patches.
 */
export function carpet({ size = 512, metres = 1.0, ground = '#5a1d1c', motif = '#9c7e48', accent = '#2e3a2b', seed = 21 } = {}) {
  const S = size, k = S / 512, C = S >> 1, G = hex(ground), M = hex(motif), A = hex(accent);
  const OUT = [G[0] * 0.42, G[1] * 0.4, G[2] * 0.42], GD = [G[0] * 0.78, G[1] * 0.76, G[2] * 0.78];
  const ML = [Math.min(1, M[0] * 1.18), Math.min(1, M[1] * 1.15), Math.min(1, M[2] * 1.08)];
  const MD = [M[0] * 0.72, M[1] * 0.78, M[2] * 0.6], AL = [Math.min(1, A[0] * 1.35), Math.min(1, A[1] * 1.3), Math.min(1, A[2] * 1.3)];
  const D = carpetMotif(S);
  const pile = vnoise(S, S >> 1, S >> 1, seed), pile2 = vnoise(S, cells(S, 128), cells(S, 128), seed + 1);
  const abrash = fbm(S, 2, 8, 3, seed + 2), wear = fbm(S, 2, 2, 4, seed + 3), lint = vnoise(S, cells(S, 200), cells(S, 200), seed + 4);
  const pileA = 0.8 / Math.max(k, 0.5);
  const LINT = [0.75, 0.72, 0.66];
  return surface({ size: S, metres, normal: 1.4, ref: 512 }, (x, y, o) => {
    const i = y * S + x, q = ((y % C) * C + (x % C)) * CM;
    put(o, G, 0.9 + 0.14 * abrash[i]);
    blend(o, GD, 0.6 * D[q + 10]);
    // compose (outlines first, then fills)
    blend(o, OUT, D[q] * 0.85);
    blend(o, M, D[q + 1] * 0.9);
    blend(o, M, D[q + 2] * 0.8);
    blend(o, MD, D[q + 3] * 0.9);
    blend(o, ML, D[q + 4] * 0.6);
    blend(o, A, D[q + 5] * 0.92);
    blend(o, AL, D[q + 6] * 0.4);
    blend(o, M, D[q + 7] * 0.9);
    blend(o, ML, D[q + 8] * 0.9);
    blend(o, A, D[q + 9] * 0.8);
    // colour boundaries: the tufts of two colours part slightly
    const m = Math.max(D[q + 1], D[q + 5], D[q + 3], D[q + 7]);
    const edge = 4 * m * (1 - m);
    // pile
    const p = pile[i] * 0.6 + pile2[i] * 0.4;
    mul(o, 0.88 + 0.22 * p);
    // traffic: flattened pile is lighter (more of the tuft sides show) and a little greyer
    const w = sstep(0.55, 0.85, wear[i]) * 0.5;
    o.r += (o.r * 0.12 + 0.02) * w; o.g += (o.g * 0.1 + 0.02) * w; o.b += (o.b * 0.08 + 0.02) * w;
    const l = lint[i];
    if (l > 0.93) blend(o, LINT, sstep(0.93, 0.99, l) * 0.25);
    o.h = p * pileA * (1 - 0.8 * w) + m * 0.2 - 0.35 * edge;
    o.ao = 0.84 + 0.16 * p - 0.08 * edge;
    o.rough = 1;
  });
}

/**
 * Linoleum tiles: two-colour chequer with marbled mottle, inlaid diamond, sunk dark joints; the wax wears to a patchy
 * sheen, heel scuffs (dark short arcs, rougher).
 */
export function linoTiles({ size = 512, metres = 1.2, n = 4, a = '#cbbd98', b = '#7a3b2c', inset = false, rough = 0.42, seed = 27, mottle = 0.06 } = {}) {
  const S = size, k = S / 512, q = S / n, A = hex(a), B = hex(b);
  const mc = Math.max(2, Math.round(10 * metres));
  const sp = vnoise(S, cells(S, 128), cells(S, 128), seed), mot = fbm(S, mc, mc, 3, seed + 1), wax = fbm(S, 3, 3, 4, seed + 2);
  const marb = fbm(S, mc * 2, mc, 3, seed + 4);
  const scuff = strokes(S, Math.round(40 * metres * metres) + 10, seed + 3, { len: [4 * k + 2, 26 * k + 4], curve: 1.5, amp: [0.4, 1] });
  const jw = Math.max(0.5, 0.8 * k);
  return surface({ size: S, metres, normal: 1.5, ref: 512 }, (x, y, o) => {
    const i = y * S + x, tx = Math.floor(x / q), ty = Math.floor(y / q);
    const fx = x + 0.5 - tx * q, fy = y + 0.5 - ty * q;
    const even = (tx + ty) % 2 === 0;
    put(o, even ? A : B, 0.95 + 0.08 * hash2(tx, ty, seed));
    blend(o, even ? B : A, 0.04);                       // linoleum: the two colours are never pure
    if (inset && even) {
      const cu = Math.abs(fx - q / 2), cv = Math.abs(fy - q / 2);
      const dd = (cu + cv - q * 0.2) * 0.7071;
      const ins = clamp01(0.5 - dd);
      if (ins > 0) blend(o, [B[0] * 0.95, B[1] * 0.95, B[2] * 0.95], ins);
    }
    // marbled mottle (streaky, the calender direction), fine speckle
    const mm = 0.5 * mot[i] + 0.3 * sp[i] + 0.2 * sstep(0.3, 0.7, marb[i]);
    mul(o, 1 - mottle + 2 * mottle * mm);
    const d = Math.min(fx, q - fx, fy, q - fy);
    const joint = cover(d, jw);
    const nearJ = Math.exp(-d / (3 * k + 1));
    blend(o, [o.r * 0.55, o.g * 0.55, o.b * 0.55], Math.max(joint, 0.15 * nearJ));
    const sc = scuff[i];
    mul(o, 1 - 0.12 * sc);
    o.h = -joint * 0.8 + 0.05 * sp[i] - 0.1 * nearJ;
    o.ao = 1 - joint * 0.4 - 0.1 * nearJ;
    o.rough = rough + 0.16 * (wax[i] - 0.5) + 0.2 * sc + joint * 0.3 + 0.08 * nearJ;
  });
}

export function ceramicTiles({ size = 512, metres = 0.9, n = 6, base = '#ebeae3', grout = '#a9a598', seed = 33 } = {}) {
  const S = size, k = S / 512, q = S / n, B = hex(base), GR = hex(grout), sp = vnoise(S, cells(S, 64), cells(S, 64), seed), dirt = fbm(S, 4, 4, 3, seed + 1);
  const wave = fbm(S, n * 2, n * 2, 2, seed + 2);
  const gw = Math.max(0.9, 1.9 * k), pw = 6 * k;
  return surface({ size: S, metres, normal: 2.5, ref: 512 }, (x, y, o) => {
    const i = y * S + x, tx = Math.floor(x / q), ty = Math.floor(y / q);
    const fx = x + 0.5 - tx * q, fy = y + 0.5 - ty * q, d = Math.min(fx, q - fx, fy, q - fy);
    put(o, B, 0.96 + 0.05 * hash2(tx, ty, seed) + 0.02 * sp[i]);
    const g = cover(d, gw);
    blend(o, GR, g);
    blend(o, [o.r * 0.85, o.g * 0.83, o.b * 0.78], g * dirt[i] * 0.6);
    const pillow = Math.min(1, d / pw);
    // glaze: slightly wavy, glossy, a little thicker at the rounded edges
    o.h = -g * 0.8 + (1 - g) * pillow * 0.5 + 0.12 * wave[i];
    o.rough = lerp(0.08 + 0.05 * sp[i], 0.85, g);
    o.ao = 1 - g * 0.35;
  });
}

// ------------------------------------------------------------------ masonry / misc

export function brickWall({ size = 512, metres = 1.2, seed = 41 } = {}) {
  const S = size, k = S / 512, CH = S / 8, BL = S / 4, MORTAR = hex('#8a857c');
  const soot = fbm(S, 3, 3, 4, seed), fine = vnoise(S, cells(S, 128), cells(S, 128), seed + 1), chip = vnoise(S, cells(S, 96), cells(S, 96), seed + 2);
  const pal = ['#8f5a3e', '#9b6446', '#7d4c35', '#a56f4c', '#866049'].map(hex);
  const m0 = Math.max(1.2, 3.2 * k), m1 = Math.max(0.4, 2.0 * k);
  return surface({ size: S, metres, normal: 2, ref: 512 }, (x, y, o) => {
    const i = y * S + x, row = Math.floor(y / CH), fy = y + 0.5 - row * CH;
    const xs = x + 0.5 + (row % 2) * BL / 2, col = Math.floor(xs / BL) % 4, fx = xs - Math.floor(xs / BL) * BL;
    const d = Math.min(fx, BL - fx, fy, CH - fy) - (chip[i] - 0.5) * 2.5 * k;
    const mortar = sstep(m0, m1, d);
    put(o, pal[Math.floor(hash2(col, row, seed) * pal.length)], 0.9 + 0.15 * fine[i]);
    blend(o, MORTAR, mortar);
    mul(o, 1 - 0.35 * sstep(0.45, 0.8, soot[i]));
    o.h = (1 - mortar) * (0.9 + 0.2 * fine[i]);
    o.rough = 0.82 + 0.1 * mortar;
    o.ao = 1 - mortar * 0.35;
  });
}

export function coalLumps({ size = 512, metres = 1.5, seed = 37 } = {}) {
  const S = size, w = worley(S, cells(S, 22), seed), w2 = worley(S, cells(S, 64), seed + 1), fine = vnoise(S, cells(S, 256), cells(S, 256), seed + 2);
  return surface({ size: S, metres, normal: 1.6, ref: 512 }, (x, y, o) => {
    const i = y * S + x;
    const edge = w.d2[i] - w.d1[i];
    const kk = 0.05 + 0.06 * w.id[i] + 0.035 * (1 - w2.d1[i]) + 0.02 * fine[i];
    o.r = kk; o.g = kk; o.b = kk * 1.08;
    o.h = (1 - w.d1[i] * 1.1) * 10 + (1 - w2.d1[i]) * 2.5;
    o.ao = 0.35 + 0.65 * sstep(0, 0.25, edge);
    o.rough = 0.42 + 0.35 * w2.id[i];
  });
}

export function plasterCeiling({ size = 512, metres = 1.5, seed = 39 } = {}) {
  const S = size, k = S / 512, B = hex('#ebe6d8'), GR = hex('#bdb5a2'), big = fbm(S, 3, 3, 4, seed), fine = vnoise(S, cells(S, 128), cells(S, 128), seed + 1);
  const b0 = 3 * k, b1 = 26 * k, b2 = 30 * k;
  return surface({ size: S, metres, normal: 4, ref: 512 }, (x, y, o) => {
    const i = y * S + x;
    const d = Math.min(x, S - 1 - x, y, S - 1 - y);
    let h = 0, ao = 1;
    if (d < b0) { h = 0.2; ao = 0.8; }
    else if (d < b1) { const t = (d - b0) / (b1 - b0); h = 0.6 + 0.4 * Math.sin(t * Math.PI * 2.5) * (1 - t); ao = 0.9 + 0.1 * Math.sin(t * Math.PI * 2.5); }
    else if (d < b2) { h = 0.1; ao = 0.82; }
    const cx = x - S / 2, cy = y - S / 2, r = hyp(cx, cy) / S, a = Math.atan2(cy, cx);
    if (r < 0.16) { const pet = Math.cos(a * 12) * 0.5 + 0.5; h += (0.9 - r * 4) * (0.6 + 0.4 * pet); ao *= 0.9 + 0.1 * pet; }
    else if (r < 0.19) { h += 0.3; }
    put(o, B, 0.97 + 0.04 * big[i] + 0.01 * fine[i]);
    blend(o, GR, (1 - ao) * 0.8);
    o.h = h + 0.02 * fine[i];
    o.ao = ao;
    o.rough = 0.86;
  });
}

/** Polished white statuary marble: soft cloud, main veins, a network of fine branching veins, faint polishing swirls. */
export function marbleSurface({ size = 512, metres = 1.2, base = '#e6e2d9', vein = '#8e877c', seed = 91 } = {}) {
  const S = size, B = hex(base), V = hex(vein), V2 = hex('#a8977a');
  const warp = fbm(S, 3, 3, 5, seed), warp2 = fbm(S, 6, 6, 4, seed + 1), cloud = fbm(S, 4, 4, 4, seed + 2), net = fbm(S, 5, 5, 5, seed + 3);
  const swirl = strokes(S, Math.round(90 * (S / 512) ** 2) + 10, seed + 4, { len: [40, 200 * S / 512], curve: 4, amp: [0.2, 0.5] });
  return surface({ size: S, metres, normal: 0.3, ref: 512 }, (x, y, o) => {
    const i = y * S + x;
    const s = Math.abs(Math.sin(TAU * (x / S + y / S + warp[i] * 1.6)));
    const s2 = Math.abs(Math.sin(TAU * (2 * x / S - y / S + warp2[i] * 2.2)));
    const vein1 = Math.pow(1 - s, 14), vein2 = Math.pow(1 - s2, 24) * 0.6;
    const ridge = 1 - Math.abs(net[i] - 0.5) * 2;
    const vein3 = sstep(0.94, 0.985, ridge) * (0.35 + 0.65 * sstep(0.4, 0.7, cloud[i]));
    put(o, B, 0.95 + 0.06 * cloud[i]);
    blend(o, [0.86, 0.83, 0.78], sstep(0.5, 0.8, cloud[i]) * 0.3);
    blend(o, V2, vein3 * 0.45);
    blend(o, V, Math.min(1, vein1 + vein2) * 0.7);
    blend(o, [o.r * 0.85, o.g * 0.84, o.b * 0.82], Math.pow(1 - s, 4) * 0.25); // veins bleed softly into the stone
    o.h = -0.2 * (vein1 + vein2) - 0.1 * vein3;
    o.rough = 0.08 + 0.08 * vein1 + 0.04 * cloud[i] + 0.05 * swirl[i];
  });
}

// ------------------------------------------------------------------ textiles

/** Damask / brocade motif coverage at tile coordinates (u, v), px = one pixel in tile units: a palmette in an
 *  ogee lattice, two per tile in half-drop. */
function damask(u, v, px) {
  const ff = (sd) => clamp01(0.5 - sd / px);
  const A = 0.17;
  // ogee lattice: two sine vines
  const f1 = 0.25 + A * Math.sin(TAU * v), f2 = 0.75 - A * Math.sin(TAU * v);
  const sl = Math.sqrt(1 + (A * TAU * Math.cos(TAU * v)) ** 2);
  const d1 = Math.abs(frac(u - f1 + 0.5) - 0.5) / sl, d2 = Math.abs(frac(u - f2 + 0.5) - 0.5) / sl;
  let cov = ff(Math.min(d1, d2) - 0.006);
  // nearest motif centre (0.5, 0.75) or (0, 0.25)
  let lx = frac(u - 0.5 + 0.5) - 0.5, ly = frac(v - 0.75 + 0.5) - 0.5;
  const lx2 = frac(u + 0.5) - 0.5, ly2 = frac(v - 0.25 + 0.5) - 0.5;
  if (lx2 * lx2 * 1.4 + ly2 * ly2 < lx * lx * 1.4 + ly * ly) { lx = lx2; ly = ly2; }
  lx = Math.abs(lx);
  // pomegranate body with a ground line inside it
  const e = hyp(lx / 0.075, (ly + 0.02) / 0.1);
  let sd = (e - 1) * 0.075;
  const inner = Math.abs(e - 0.62) * 0.075 - 0.004;
  // crown of petals
  const cx = lx, cy = ly - 0.07, rr = hyp(cx, cy), th = Math.atan2(cx, cy);
  if (cy > -0.01 && th < 1.25) sd = Math.min(sd, rr - 0.12 * (0.55 + 0.45 * Math.abs(Math.cos(3.5 * th))));
  // side leaves
  {
    const ax = lx - 0.1, ay = ly + 0.11, c = 0.7071, s = 0.7071;
    const rx = ax * c - ay * s, ry = ax * s + ay * c;
    sd = Math.min(sd, (hyp(rx / 0.1, ry / 0.032) - 1) * 0.032);
  }
  // stem and bud
  if (ly < -0.1 && ly > -0.36) sd = Math.min(sd, lx - 0.006);
  sd = Math.min(sd, hyp(lx, ly - 0.25) - 0.026);
  cov = Math.max(cov, ff(sd) * (1 - ff(inner) * ff(sd + 0.01)));
  return cov;
}

/**
 * Woven cloth (greyscale albedo multiplied by the material colour). Plain weave; with `damask` a tone-on-tone figure
 * woven in satin (long warp floats: smoother, glossier, a shade lighter) on the plain ground.
 */
export function weave({ size = 512, metres = 0.5, thread = 2, depth = 0.7, varK = 0.12, stains = 0, damaskK = 0, seed = 95 } = {}) {
  const S = size, k = S / 512, T = Math.max(2, Math.round(thread * k));
  const big = fbm(S, 4, 4, 4, seed), slub = vnoise(S, cells(S, S / T), 12, seed + 1), slub2 = vnoise(S, 12, cells(S, S / T), seed + 2), st = fbm(S, 5, 5, 4, seed + 3);
  const pill = fbm(S, 6, 6, 3, seed + 4);
  const px = 1 / S;
  return surface({ size: S, metres, normal: 2, ref: 512 }, (x, y, o) => {
    const i = y * S + x;
    const cx = Math.floor(x / T), cy = Math.floor(y / T);
    const fx = (x % T + 0.5) / T, fy = (y % T + 0.5) / T;
    const hw = Math.sin(Math.PI * fx), hf = Math.sin(Math.PI * fy);
    const dm = damaskK ? damask((x + 0.5) / S, (y + 0.5) / S, px) * damaskK : 0;
    let h;
    const warpTop = (cx + cy) % 2 === 0;
    const plain = warpTop ? 0.5 + 0.5 * hw * hf : 0.5 * hf * hw + 0.2;
    if (dm > 0) {
      // satin: warp floats over 5 picks, binding points stepped by 2
      const bind = ((cy - 2 * cx) % 5 + 5) % 5 === 0;
      const sat = bind ? 0.35 + 0.3 * hw * hf : 0.55 + 0.4 * hw;
      h = lerp(plain, sat, dm);
    } else h = plain;
    const sl = warpTop ? slub[i] : slub2[i];
    const kk = 1 - varK + varK * (0.6 * big[i] + 0.4 * sl);
    o.r = o.g = o.b = kk * (0.88 + 0.12 * h) * (1 + 0.04 * dm) * (1 - 0.03 * sstep(0.6, 0.8, pill[i]));
    if (stains) { const s = sstep(0.62, 0.8, st[i]) * stains; o.r *= 1 - 0.12 * s; o.g *= 1 - 0.14 * s; o.b *= 1 - 0.2 * s; }
    o.h = h * depth;
    o.ao = 0.8 + 0.2 * h;
    // the satin figure is glossier than the plain ground; worn spots a little smoother
    o.rough = 1 - 0.38 * dm - 0.06 * sstep(0.6, 0.85, pill[i]);
  });
}

/** Upholstery leather (greyscale x material colour): pebble grain at two scales, creases, rubbed lighter, smoother high points. */
export function leatherGrain({ size = 512, metres = 0.5, seed = 97 } = {}) {
  const S = size, w = worley(S, cells(S, 56), seed), w2 = worley(S, cells(S, 150), seed + 3), cre = fbm(S, 6, 6, 4, seed + 1), big = fbm(S, 3, 3, 3, seed + 2);
  const rub = fbm(S, 2, 2, 4, seed + 4);
  return surface({ size: S, metres, normal: 2.2, ref: 512 }, (x, y, o) => {
    const i = y * S + x;
    const crease = sstep(0.09, 0.0, w.d2[i] - w.d1[i]);
    const crease2 = sstep(0.12, 0.0, w2.d2[i] - w2.d1[i]) * 0.5;
    const ridge = 1 - Math.abs(cre[i] - 0.5) * 2;
    const deep = sstep(0.9, 0.98, ridge);
    const rb = sstep(0.55, 0.85, rub[i]) * (1 - crease);
    o.r = o.g = o.b = (0.88 + 0.14 * big[i]) * (1 - 0.25 * crease - 0.12 * crease2 - 0.3 * deep) * (1 + 0.12 * rb);
    o.h = 0.5 * (1 - w.d1[i]) + 0.2 * (1 - w2.d1[i]) - 0.6 * crease - 0.2 * crease2 - 1.2 * deep;
    o.rough = 0.8 + 0.2 * crease + 0.1 * crease2 - 0.22 * rb - 0.08 * (1 - w.d1[i]);
    o.ao = 1 - 0.25 * crease - 0.3 * deep;
  });
}

/**
 * Deep-buttoned (Chesterfield) leather (greyscale x material colour): diamond tufting with a button every 12.5 cm,
 * pleats running between the buttons, the fabric drawn into folds round each button, pebble grain on top and the
 * puffed tops rubbed lighter and smoother. Pattern is 4 x 4 diamonds per 0.5 m tile.
 */
export function leatherTufted({ size = 256, metres = 0.5, seed = 105 } = {}) {
  const S = size, k = S / 256, D = S / 8;
  const w = worley(S, cells(S, 56), seed), big = fbm(S, 3, 3, 3, seed + 1), rubN = fbm(S, 3, 3, 3, seed + 2);
  const br = 0.011 / metres * S;
  return surface({ size: S, metres, normal: 1.1, ref: 256 }, (x, y, o) => {
    const i = y * S + x;
    const u = (x + 0.5) / D, v = (y + 0.5) / D;
    const a = (u + v) / 2, b = (u - v) / 2;              // buttons sit on the integer lattice of (a, b)
    const fa = frac(a) - 0.5, fb = frac(b) - 0.5;
    const ea = 1 - 4 * fa * fa, eb = 1 - 4 * fb * fb;
    const pillow = Math.pow(Math.max(0, ea * eb), 0.55);
    const ra = Math.round(a), rb = Math.round(b);
    const bxp = (ra + rb) * D, byp = (ra - rb) * D;       // nearest button (px)
    const dxb = x + 0.5 - bxp, dyb = y + 0.5 - byp, db = hyp(dxb, dyb);
    // pleats: the creases along the diamond edges are deepest near the buttons
    const edge = Math.min(0.5 - Math.abs(fa), 0.5 - Math.abs(fb)) * D * 1.414;
    const pleat = Math.exp(-edge / (1.6 * k + 0.4));
    const pull = Math.exp(-db / (D * 0.35));
    let h = 9 * pillow - 3 * pleat * (0.4 + 0.6 * pull) - 4 * pull;
    h += 0.6 * pull * Math.cos(6 * Math.atan2(dyb, dxb)) * sstep(br, br * 3, db);  // little folds round the button
    let ao = 1 - 0.45 * pleat * (0.5 + 0.5 * pull) - 0.35 * pull * (1 - pillow);
    const grain = 1 - w.d1[i], crease = sstep(0.09, 0.0, w.d2[i] - w.d1[i]);
    h += 0.35 * grain - 0.4 * crease;
    const rubbed = sstep(0.6, 0.95, pillow) * (0.5 + 0.5 * rubN[i]);
    let c = (0.86 + 0.14 * big[i]) * (1 - 0.18 * crease) * (1 + 0.16 * rubbed) * (1 - 0.3 * pleat * pull);
    let rough = 0.8 + 0.15 * crease - 0.25 * rubbed + 0.1 * pleat;
    // the button: covered in the same leather, a domed head in a dark well
    if (db < br + 1) {
      const t = clamp01(br + 0.5 - db), dome = Math.sqrt(Math.max(0, 1 - (db / br) ** 2));
      h = lerp(h, -2 + 2.5 * dome, t); c = lerp(c, 0.8 + 0.15 * dome, t); rough = lerp(rough, 0.55, t);
      ao = lerp(ao, 0.7 + 0.3 * dome, t);
      const rim = cover(db - br, 0.6); c *= 1 - 0.5 * rim; ao *= 1 - 0.4 * rim;
    }
    o.r = o.g = o.b = c;
    o.h = h; o.ao = ao; o.rough = rough;
  });
}

/** Rattan wicker (Café Parisien / verandah chairs): basket-woven strands with fibres, shiny skin, dark gaps. */
export function basketWeave({ size = 512, metres = 0.35, seed = 99 } = {}) {
  const S = size, W = S / 16, fine = vnoise(S, cells(S, 256), cells(S, 32), seed), fib = vnoise(S, cells(S, 32), cells(S, 256), seed + 1), node = fbm(S, 4, 4, 3, seed + 2);
  return surface({ size: S, metres, normal: 2.5, ref: 512 }, (x, y, o) => {
    const i = y * S + x, cx = Math.floor(x / W), cy = Math.floor(y / W);
    const fx = ((x % W) + 0.5) / W, fy = ((y % W) + 0.5) / W;
    const horiz = (Math.floor(cx / 2) + Math.floor(cy / 2)) % 2 === 0;
    const across = horiz ? fy : fx;
    const along = horiz ? fx : fy;
    const prof = Math.sin(Math.PI * across);
    const gap = sstep(0.12, 0.02, Math.min(across, 1 - across));
    const f = horiz ? fine[i] : fib[i];
    o.r = o.g = o.b = (0.8 + 0.2 * prof) * (0.9 + 0.1 * f) * (1 - gap * 0.6) * (0.94 + 0.08 * node[i]);
    o.h = prof * (0.7 + 0.3 * Math.sin(Math.PI * along)) + 0.06 * f;
    o.ao = 1 - gap * 0.5;
    o.rough = 0.62 + 0.25 * (1 - prof) + 0.1 * f;
  });
}

export function ropeLay({ size = 256, metres = 0.12, seed = 101 } = {}) {
  const S = size, fine = vnoise(S, cells(S, 64), cells(S, 128), seed);
  return surface({ size: S, metres, normal: 3, ref: 256 }, (x, y, o) => {
    const i = y * S + x;
    const t = ((x + y) / S) * 6;
    const f = t - Math.floor(t);
    const prof = Math.sin(Math.PI * f);
    const fib = 0.5 + 0.5 * Math.sin(TAU * ((x - y) / S) * 40 + fine[i] * 3);
    o.r = o.g = o.b = (0.7 + 0.3 * prof) * (0.9 + 0.1 * fib);
    o.h = prof + 0.08 * fib;
    o.ao = 0.6 + 0.4 * prof;
    o.rough = 1;
  });
}

// ------------------------------------------------------------------ the shared library's surfaces
// (generated in a worker in the browser, see core/tex-worker.js; synchronously in node)
const RECIPES = {
  woodPlanks, woodSolid, woodPanel, paintedPanel, pineBoards, mahoganyFigure, rivetedSteel, hullPlating, treadPlate,
  metalSmudge, paintSurface, rustSurface, carpet, linoTiles, ceramicTiles, brickWall, coalLumps, plasterCeiling,
  marbleSurface, weave, leatherGrain, leatherTufted, basketWeave, ropeLay,
};
// `px` (optional): texture size per tier cap (TIER.texMax 256 / 512 / 1024). Hero surfaces seen close up get more
// pixels; on phones a few surfaces that are only seen from afar give their memory to the open deck.
export const SURFACES = {
  deck: ['woodPlanks', { size: 1024, metres: 4, planks: 32, base: '#b6a283', seed: 3, px: { 256: 512, 512: 1024, 1024: 1024 } }],
  oak: ['woodSolid', { base: '#85603a', fleck: 0.5, contrast: 0.13, seed: 5, rough: 0.5 }],
  oakPanel: ['woodPanel', { base: '#805c37', seed: 7, px: { 1024: 1024 } }],
  mahogany: ['mahoganyFigure', { base: '#44251a', seed: 9, px: { 1024: 1024 } }],
  pine: ['pineBoards', { base: '#c3a473', seed: 11 }],
  whitePanel: ['paintedPanel', { base: '#e6e3da', seed: 13 }],
  steel: ['rivetedSteel', { metres: 2.4, base: '#8b8e90', seed: 15 }],
  hull: ['hullPlating', { size: 1024, metres: 6, seed: 17 }],
  carpetRed: ['carpet', { ground: '#5a1f1d', motif: '#97794a', accent: '#2f3a2c', seed: 21 }],
  carpetGreen: ['carpet', { ground: '#2c3a2b', motif: '#958452', accent: '#57261f', seed: 23 }],
  carpetBlue: ['carpet', { ground: '#252e44', motif: '#a09368', accent: '#5a2a25', seed: 25 }],
  // 30 cm tiles, 8 x 8 per texture (2.4 m repeat, so the mottling / wax sheen does not visibly tile)
  linoCream: ['linoTiles', { a: '#bdb193', b: '#784e42', inset: true, metres: 2.4, n: 8, seed: 27, mottle: 0.1 }],
  linoBlue: ['linoTiles', { a: '#c9c2ae', b: '#505d6e', inset: true, metres: 2.4, n: 8, seed: 29, mottle: 0.1 }],
  linoRed: ['linoTiles', { a: '#7f4535', b: '#74402f', metres: 1.0, rough: 0.5, seed: 31, mottle: 0.12 }],
  tileWhite: ['ceramicTiles', { seed: 33 }],
  steelFloor: ['treadPlate', { seed: 35 }],
  coal: ['coalLumps', { seed: 37, px: { 256: 128 } }],
  plaster: ['plasterCeiling', { seed: 39 }],
  brick: ['brickWall', { seed: 41, px: { 256: 128 } }],
  paint: ['paintSurface', { seed: 85 }],
  smudge: ['metalSmudge', { seed: 81, px: { 256: 128 } }],
  rust: ['rustSurface', { seed: 87, px: { 256: 128 } }],
  marble: ['marbleSurface', { seed: 91 }],
  fabric: ['weave', { thread: 2, metres: 0.5, damaskK: 1, seed: 95 }],
  canvas: ['weave', { thread: 4, metres: 0.6, depth: 1, varK: 0.16, stains: 1, seed: 97 }],
  leather: ['leatherGrain', { seed: 99 }],
  leatherTufted: ['leatherTufted', { seed: 105, px: { 256: 128, 512: 256, 1024: 256 } }],
  wicker: ['basketWeave', { seed: 101, px: { 256: 128 } }],
  rope: ['ropeLay', { seed: 103 }],
};
/** Build one surface of the shared library by name. */
const DEFAULT_SIZE = { woodPlanks: 1024, hullPlating: 1024, ropeLay: 256 };
/** Build one surface of the shared library by name; maxSize caps the resolution (weak tiers: 256 / 512). */
export function makeSurface(name, maxSize = 4096) {
  const [fn, { px, ...opts }] = SURFACES[name];
  const size = opts.size ?? DEFAULT_SIZE[fn] ?? 512;
  let s;
  if (px && px[maxSize]) s = px[maxSize];
  // below 512 the small ones shrink as well (keeps the relative detail of e.g. the rope texture)
  else s = maxSize >= size ? size : maxSize >= 512 ? maxSize : Math.max(64, Math.min(maxSize, size / 2));
  return RECIPES[fn]({ ...opts, size: s });
}
