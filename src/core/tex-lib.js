// Procedural PBR surface recipes (albedo + normal + ORM) for the shared material library.
// Every recipe is tileable and authored per metre. Colours are period-correct, slightly desaturated 1912 palettes.
import { surface, vnoise, fbm, worley, clamp01, sstep, hex, hash2, rng } from './tex.js';

const TAU = Math.PI * 2;
const hyp = (a, b) => Math.sqrt(a * a + b * b);
const lerp = (a, b, t) => a + (b - a) * t;
function put(o, c, k = 1) { o.r = c[0] * k; o.g = c[1] * k; o.b = c[2] * k; }
function blend(o, c, t) { o.r += (c[0] - o.r) * t; o.g += (c[1] - o.g) * t; o.b += (c[2] - o.b) * t; }
function mul(o, k) { o.r *= k; o.g *= k; o.b *= k; }

// ------------------------------------------------------------------ woods

/** Wood grain value 0..1 (dark late-wood lines) along x, fields cached per size/seed. */
function grainFields(S, seed) {
  return {
    warp: fbm(S, 3, 6, 4, seed + 1),
    streak: fbm(S, 2, 96, 4, seed + 2, 0.6),
    pores: vnoise(S, 48, S / 2, seed + 3),
    big: fbm(S, 3, 3, 3, seed + 4),
    fleck: vnoise(S, 40, 9, seed + 5),
  };
}
function woodPixel(G, i, y, S, cycles, o, base, { contrast = 0.2, fleckK = 0, poreK = 0.3 } = {}) {
  const ring = 0.5 + 0.5 * Math.sin(TAU * (y / S * cycles + G.warp[i] * 2.2));
  const late = Math.pow(ring, 3);
  const pore = sstep(0.72, 0.92, G.pores[i]) * poreK;
  const fl = fleckK ? sstep(0.7, 0.86, G.fleck[i]) * fleckK : 0;
  const k = (1 - contrast * late) * (0.9 + 0.2 * G.big[i]) * (0.94 + 0.12 * G.streak[i]) * (1 - pore) * (1 + 0.16 * fl);
  put(o, base, k);
  return { late, pore, fl };
}

export function woodPlanks({ size = 1024, metres = 4, planks = 32, base = '#b3a07f', seam = '#1f1c19', seed = 3, weathered = true } = {}) {
  const S = size, P = S / planks, r = rng(seed);
  const tint = [], butt = [], phase = [];
  for (let i = 0; i < planks; i++) { tint.push(r()); butt.push(Math.floor(r() * S)); phase.push(r()); }
  const G = grainFields(S, seed);
  const grey = hex('#9c9789'), B = hex(base), SEAM = hex(seam);
  const fine = vnoise(S, S / 2, S / 2, seed + 9);
  return surface({ size: S, metres, normal: 2.2 }, (x, y, o) => {
    const i = y * S + x, row = Math.floor(y / P), fy = y - row * P;
    const t = tint[row];
    const g = woodPixel(G, (y * S + ((x + Math.floor(phase[row] * S)) % S)), y + row * 7, S, planks * 3.2, o, B, { contrast: 0.22 });
    mul(o, 0.9 + 0.18 * t);
    if (weathered) blend(o, grey, 0.25 + 0.25 * G.big[i] * t);
    mul(o, 0.96 + 0.08 * fine[i]);
    let db = Math.abs(x - butt[row]); db = Math.min(db, S - db);
    const ds = Math.min(fy, P - fy, db + 0.5);
    const crown = 1 - Math.pow((fy - P / 2) / (P / 2), 2) * 0.25;
    o.h = 0.7 * crown + 0.12 * g.late - 0.15 * g.pore;
    o.rough = 0.74 + 0.12 * g.late + 0.06 * (1 - G.big[i]);
    o.ao = 1 - 0.3 * Math.exp(-ds / 2.2);
    if (fy < 1.6 || db < 1.2) { put(o, SEAM); o.h = -0.6; o.rough = 0.45; o.ao = 0.6; }
  });
}

export function woodSolid({ size = 512, metres = 1.5, base = '#8a5c32', cycles = 24, fleck = 0, contrast = 0.22, seed = 5, rough = 0.5 } = {}) {
  const S = size, G = grainFields(S, seed), B = hex(base);
  return surface({ size: S, metres, normal: 1.2 }, (x, y, o) => {
    const i = y * S + x;
    const g = woodPixel(G, i, y, S, cycles, o, B, { contrast, fleckK: fleck, poreK: 0.32 });
    o.h = 0.25 * g.late - 0.8 * g.pore + 0.1 * g.fl;
    o.rough = rough + 0.12 * g.pore - 0.08 * g.fl;
    o.ao = 1 - 0.3 * g.pore;
  });
}

/** Raised (or flat-sunk) panel relief: frame, ovolo moulding, groove, bevel, field. */
function panelProfile(d, F, M, B, raised) {
  if (d < 1.2) return { h: 0.55, ao: 0.55, joint: 1 };
  if (d < F) return { h: 1, ao: 1, joint: 0 };
  if (d < F + M) { const t = (d - F) / M; return { h: 0.3 + 0.7 * Math.cos(t * Math.PI / 2), ao: 1 - 0.25 * t, joint: 0 }; }
  if (d < F + M + 3) return { h: 0.25, ao: 0.55, joint: 0 };
  if (raised && d < F + M + 3 + B) { const t = (d - F - M - 3) / B; return { h: 0.25 + 0.5 * t, ao: 0.75 + 0.25 * t, joint: 0 }; }
  return { h: raised ? 0.75 : 0.3, ao: 1, joint: 0 };
}

export function woodPanel({ size = 512, metres = 1.2, base = '#87592e', seed = 7 } = {}) {
  const S = size, G = grainFields(S, seed), B = hex(base), DARK = hex('#2a1407');
  const F = 40, M = 10, BV = 30;
  return surface({ size: S, metres, normal: 6 }, (x, y, o) => {
    const dx = Math.min(x, S - 1 - x), dy = Math.min(y, S - 1 - y), d = Math.min(dx, dy);
    const p = panelProfile(d, F, M, BV, true);
    const vertical = d >= F || dx <= dy; // stiles + field: vertical grain, rails: horizontal
    const i = vertical ? x * S + y : y * S + x;
    const g = woodPixel(G, i, vertical ? x : y, S, 22, o, B, { contrast: 0.2, fleckK: 0.6, poreK: 0.25 });
    if (d >= F + M + 3) mul(o, 1.04);
    blend(o, DARK, (1 - p.ao) * 0.5);
    o.h = p.h + 0.004 * g.late - 0.01 * g.pore;
    o.ao = p.ao;
    o.rough = 0.42 + 0.12 * g.pore + (1 - p.ao) * 0.2;
  });
}

export function paintedPanel({ size = 512, metres = 1.0, base = '#e7e4db', seed = 13 } = {}) {
  const S = size, B = hex(base), GRIME = hex('#a49d8c');
  const peel = vnoise(S, 160, 160, seed), big = fbm(S, 4, 4, 3, seed + 1), brush = vnoise(S, 6, 220, seed + 2);
  const F = 36, M = 8;
  return surface({ size: S, metres, normal: 5 }, (x, y, o) => {
    const i = y * S + x;
    const dx = Math.min(x, S - 1 - x), dy = Math.min(y, S - 1 - y), d = Math.min(dx, dy);
    const p = panelProfile(d, F, M, 0, false);
    put(o, B, 0.97 + 0.04 * big[i]);
    blend(o, GRIME, (1 - p.ao) * 0.45 + 0.05 * (1 - big[i]));
    o.h = p.h + 0.006 * peel[i] + 0.004 * (d >= F ? brush[x * S + y] : brush[i]);
    o.ao = p.ao;
    o.rough = 0.34 + 0.08 * big[i] + (1 - p.ao) * 0.25;
  });
}

export function pineBoards({ size = 512, metres = 1.6, boards = 8, base = '#c4a571', seed = 11 } = {}) {
  const S = size, P = S / boards, G = grainFields(S, seed), B = hex(base), r = rng(seed), KNOT = hex('#6a4520');
  const knots = [];
  for (let k = 0; k < 4; k++) knots.push({ x: r() * S, y: (Math.floor(r() * boards) + 0.3 + r() * 0.4) * P, rx: 5 + r() * 6, ry: 3 + r() * 3 });
  const tint = []; for (let i = 0; i < boards; i++) tint.push(r());
  return surface({ size: S, metres, normal: 2.5 }, (x, y, o) => {
    const i = y * S + x, row = Math.floor(y / P), fy = y - row * P;
    // grain bends around knots
    let kd = 9, warpK = 0;
    for (const k of knots) {
      let ddx = Math.abs(x - k.x); ddx = Math.min(ddx, S - ddx);
      const e = Math.sqrt((ddx / k.rx) ** 2 + ((y - k.y) / k.ry) ** 2);
      if (e < kd) kd = e;
      warpK += Math.exp(-e * 0.5) * 3 * Math.sign(y - k.y);
    }
    const g = woodPixel(G, i, y + warpK, S, 30, o, B, { contrast: 0.32, poreK: 0.15 });
    mul(o, 0.92 + 0.14 * tint[row]);
    if (kd < 1.6) { blend(o, KNOT, sstep(1.6, 0.6, kd) * 0.85); }
    const groove = Math.min(fy, P - fy);
    o.h = 0.6 - 0.6 * Math.exp(-groove / 1.4) + 0.08 * g.late;
    o.ao = 1 - 0.45 * Math.exp(-groove / 1.6);
    o.rough = 0.5 + 0.12 * g.late;
  });
}

export function mahoganyFigure({ size = 512, metres = 1.5, base = '#5c2818', seed = 9 } = {}) {
  const S = size, G = grainFields(S, seed), B = hex(base);
  const fig = fbm(S, 4, 2, 3, seed + 20);
  return surface({ size: S, metres, normal: 0.8 }, (x, y, o) => {
    const i = y * S + x;
    const g = woodPixel(G, i, y, S, 40, o, B, { contrast: 0.18, poreK: 0.35 });
    const ribbon = 0.5 + 0.5 * Math.sin(TAU * (y / S * 7 + fig[i] * 1.5));
    mul(o, 0.85 + 0.3 * ribbon);
    o.h = 0.2 * g.late - 0.7 * g.pore;
    o.rough = 0.3 + 0.12 * g.pore;
    o.ao = 1 - 0.25 * g.pore;
  });
}

// ------------------------------------------------------------------ metal / steel

/** Riveted steel plating. rows = number of plate strakes per tile, rivet spacing in px. */
export function rivetedSteel({ size = 512, metres = 2.4, rows = 2, pitch = 16, rad = 2.8, base = '#8b8e90', rust = 0.5, seed = 15, paintMetal = 0.25 } = {}) {
  const S = size, R = S / rows, B = hex(base), RUST = hex('#74431f'), DIRT = hex('#4a4640');
  const wav = fbm(S, 4, 4, 3, seed), grime = fbm(S, 5, 3, 4, seed + 1), fine = vnoise(S, 128, 128, seed + 2), brk = vnoise(S, 64, 16, seed + 3);
  const off = 7;
  return surface({ size: S, metres, normal: 2.5 }, (x, y, o) => {
    const i = y * S + x, row = Math.floor(y / R), fy = y - row * R;
    const buttX = (row % 2) * (S / 2);
    let bx = Math.abs(x - buttX); bx = Math.min(bx, S - bx);
    put(o, B, 0.94 + 0.08 * grime[i] + 0.03 * fine[i]);
    let h = (row % 2 ? 0.7 : 0) + 2.5 * wav[i];
    if (fy < 1.5 || bx < 1.2) { h -= 0.4; blend(o, DIRT, 0.5); }
    // rivets: two rows along each lap, two columns along each butt
    let rd = 99;
    for (const ry of [off, R - off]) {
      const cx = Math.round(x / pitch) * pitch, dd = hyp(x - cx, fy - ry);
      if (dd < rd) rd = dd;
    }
    for (const rx of [buttX - off, buttX + off]) {
      let dxx = Math.abs(x - rx); dxx = Math.min(dxx, S - dxx);
      const cy = Math.round(fy / pitch) * pitch, dd = hyp(dxx, fy - cy);
      if (dd < rd) rd = dd;
    }
    let metal = paintMetal, rough = 0.52 + 0.14 * grime[i];
    if (rd < rad) { h += 1.6 * Math.sqrt(1 - (rd / rad) ** 2); metal = 0.45; rough -= 0.1; }
    else if (rd < rad + 1.5) { o.ao = 0.8; }
    // rust streaks running down (towards lower v) from some rivets of the lap above
    if (rust > 0) {
      const cx = Math.round(x / pitch) * pitch;
      const dy = (R - off) - fy; // distance below the upper rivet row of this plate (v points up)
      if (dy > 0 && hash2(cx, row, seed) > 0.82) {
        const w = Math.abs(x - cx) + (brk[i] - 0.5) * 3;
        const k = Math.exp(-dy / (40 + 60 * hash2(cx, row, seed + 1))) * sstep(2.5, 0.5, w) * rust;
        blend(o, RUST, k * 0.7); rough += k * 0.3; metal *= 1 - k;
      }
    }
    o.h = h; o.metal = metal; o.rough = rough;
  });
}

/** Lapped and riveted hull / superstructure plating (white albedo with weathering, multiplied by material colour). */
export function hullPlating({ size = 1024, metres = 6, seed = 17 } = {}) {
  const S = size, ROWS = 4, R = S / ROWS, FR = 7, FP = S / FR;
  const streak = vnoise(S, 40, 3, seed), streak2 = fbm(S, 8, 2, 3, seed + 1), big = fbm(S, 3, 3, 4, seed + 2), fine = vnoise(S, 256, 256, seed + 3);
  const RUST = hex('#8a5a3a'), GRIME = hex('#a8a59e');
  return surface({ size: S, metres, normal: 1.6 }, (x, y, o) => {
    const i = y * S + x, row = Math.floor(y / R), fy = y - row * R;
    const outer = row % 2;
    const buttX = (row % 2 ? S / 2 : 0) + 40 * row;
    let bx = Math.abs(x - (buttX % S)); bx = Math.min(bx, S - bx);
    const fx = x % FP;
    // hungry-horse dishing between frames
    let h = outer * 1.2 - 0.5 * Math.pow(Math.sin(Math.PI * fx / FP), 2) * Math.pow(Math.sin(Math.PI * fy / R), 2) + 1.5 * big[i];
    // lap edge: outer strakes overlap the inner ones, chamfered edge
    if (outer) { const e = Math.min(fy, R - fy); if (e < 3) h -= (3 - e) * 0.35; }
    if (bx < 1.5) h -= 0.6;
    o.r = o.g = o.b = 0.95 + 0.05 * fine[i];
    const s = sstep(0.55, 0.9, streak[i]) * (0.5 + 0.5 * streak2[i]);
    blend(o, GRIME, 0.35 * s + 0.12 * (1 - big[i]));
    let rd = 99;
    for (const ry of [6, 14, R - 6, R - 14]) { const cx = Math.round(x / 14) * 14; const d = hyp(x - cx, fy - ry); if (d < rd) rd = d; }
    for (const ox of [-8, 8, -18, 18]) { let d0 = Math.abs(x - (buttX % S) - ox); d0 = Math.min(d0, S - d0); const cy = Math.round(fy / 14) * 14; const d = hyp(d0, fy - cy); if (d < rd) rd = d; }
    { const cy = Math.round(fy / 28) * 28; const d = hyp(fx - FP / 2, fy - cy) * 1.2; if (d < rd) rd = d; }
    if (rd < 2.4) h += 1.1 * Math.sqrt(1 - (rd / 2.4) ** 2);
    // rust weeping from some rivets / butts
    const cx = Math.round(x / 14) * 14, dy = (R - 6) - fy;
    if (dy > 0 && hash2(cx, row, seed) > 0.9) {
      const k = Math.exp(-dy / 70) * sstep(3, 0.5, Math.abs(x - cx) + (fine[i] - 0.5) * 3);
      blend(o, RUST, k * 0.55);
    }
    o.h = h;
    o.rough = 0.42 + 0.22 * s + 0.1 * (1 - big[i]);
    o.ao = rd < 3.4 && rd >= 2.4 ? 0.85 : 1;
  });
}

export function treadPlate({ size = 512, metres = 1.0, seed = 35 } = {}) {
  const S = size, C = S / 8, BASE = hex('#4d5053'), TOP = hex('#7f8285'), DIRT = hex('#2e2d2b'), RUST = hex('#6a3d22');
  const g = fbm(S, 6, 6, 4, seed), fine = vnoise(S, 256, 256, seed + 1), rs = fbm(S, 8, 8, 3, seed + 2);
  const L = C * 0.32, W = C * 0.085;
  return surface({ size: S, metres, normal: 3 }, (x, y, o) => {
    const i = y * S + x, cx = Math.floor(x / C), cy = Math.floor(y / C);
    const lx = x - (cx + 0.5) * C, ly = y - (cy + 0.5) * C;
    const dir = (cx + cy) % 2 ? 1 : -1;
    // distance to the bar segment rotated by 45 deg
    const u = (lx + dir * ly) * 0.7071, v = (-dir * lx + ly) * 0.7071;
    const du = Math.max(Math.abs(u) - L, 0), d = hyp(du, v);
    const bar = sstep(W + 1.2, W - 1.2, d);
    put(o, BASE, 0.85 + 0.2 * g[i] + 0.06 * fine[i]);
    blend(o, DIRT, (1 - bar) * 0.35 * (1 - g[i]));
    blend(o, TOP, bar * 0.65);
    const rust = sstep(0.68, 0.8, rs[i]) * (1 - bar * 0.7);
    blend(o, RUST, rust * 0.6);
    o.h = bar * (0.6 + 0.4 * Math.sqrt(Math.max(0, 1 - (d / (W + 1)) ** 2))) * 1.6 + 0.2 * fine[i];
    o.metal = lerp(0.55, 0.85, bar) * (1 - rust);
    o.rough = lerp(0.62, 0.34, bar) + rust * 0.3;
    o.ao = bar > 0.5 ? 1 : 0.8 + 0.2 * sstep(W + 5, W + 1, d) * 0 + 0.2 * sstep(W + 1, W + 6, d);
  });
}

/** Metal smudges / fine scratches: roughness factor (G 0.7..1) + faint tarnish albedo. */
export function metalSmudge({ size = 512, metres = 0.6, seed = 81 } = {}) {
  const S = size, sm = fbm(S, 5, 5, 5, seed), scr = vnoise(S, 512, 6, seed + 1), scr2 = vnoise(S, 8, 512, seed + 2), fine = vnoise(S, 128, 128, seed + 3);
  return surface({ size: S, metres, normal: 0.6 }, (x, y, o) => {
    const i = y * S + x;
    const s = sstep(0.4, 0.75, sm[i]);
    o.r = o.g = o.b = 0.9 + 0.1 * (1 - s * 0.6) * (0.95 + 0.05 * fine[i]);
    o.rough = 0.72 + 0.28 * s;
    o.h = 0.3 * sstep(0.8, 0.95, scr[i]) + 0.3 * sstep(0.85, 0.97, scr2[i]);
  });
}

/** Painted surface: orange peel, grime blotches; roughness factor in G. */
export function paintSurface({ size = 512, metres = 2.0, seed = 85 } = {}) {
  const S = size, peel = vnoise(S, 180, 180, seed), big = fbm(S, 4, 4, 4, seed + 1), drip = vnoise(S, 60, 4, seed + 2);
  return surface({ size: S, metres, normal: 0.22 }, (x, y, o) => {
    const i = y * S + x;
    const gr = sstep(0.55, 0.85, big[i]) * 0.5 + sstep(0.7, 0.9, drip[i]) * 0.4;
    o.r = o.g = o.b = 1 - 0.06 * gr - 0.02 * peel[i];
    o.g -= 0.006 * gr; o.b -= 0.02 * gr;
    o.h = 0.25 * peel[i] + 2 * big[i];
    o.rough = 0.82 + 0.18 * gr;
    o.ao = 1;
  });
}

export function rustSurface({ size = 512, metres = 1.0, seed = 87 } = {}) {
  const S = size, a = fbm(S, 6, 6, 5, seed), b = fbm(S, 16, 16, 3, seed + 1), w = worley(S, 24, seed + 2);
  const C1 = hex('#5a2e18'), C2 = hex('#8c4c24'), C3 = hex('#2f2219');
  return surface({ size: S, metres, normal: 2 }, (x, y, o) => {
    const i = y * S + x;
    put(o, C1);
    blend(o, C2, sstep(0.45, 0.75, a[i]));
    blend(o, C3, sstep(0.6, 0.8, b[i]) * 0.7);
    const flake = sstep(0.1, 0.0, w.d2[i] - w.d1[i]);
    o.h = 1.2 * a[i] + 0.8 * b[i] - flake * 0.8;
    o.rough = 0.9 + 0.1 * b[i];
    o.ao = 1 - flake * 0.3;
    o.metal = 0.05;
  });
}

// ------------------------------------------------------------------ floors

export function carpet({ size = 512, metres = 1.0, ground = '#5a1d1c', motif = '#9c7e48', accent = '#2e3a2b', seed = 21 } = {}) {
  const S = size, G = hex(ground), M = hex(motif), A = hex(accent);
  const pile = vnoise(S, 256, 256, seed), pile2 = vnoise(S, 128, 128, seed + 1), abrash = fbm(S, 3, 6, 3, seed + 2), wear = fbm(S, 2, 2, 4, seed + 3);
  const aa = 1.5 / (S / 2); // ~1.5 px in motif-cell units
  return surface({ size: S, metres, normal: 1.4 }, (x, y, o) => {
    const i = y * S + x;
    const u = (x / S) * 2, v = (y / S) * 2;
    const cu = u - Math.floor(u) - 0.5, cv = v - Math.floor(v) - 0.5;
    put(o, G, 0.9 + 0.14 * abrash[i]);
    // diamond lattice
    const dl = Math.abs(Math.abs(cu) + Math.abs(cv) - 0.5);
    let m = sstep(0.018 + aa, 0.018, dl);
    // inner diamond border
    const dl2 = Math.abs(Math.abs(cu) + Math.abs(cv) - 0.36);
    const acc = sstep(0.012 + aa, 0.012, dl2);
    // rosette
    const r = hyp(cu, cv), a = Math.atan2(cv, cu);
    const petal = 0.12 + 0.045 * Math.cos(8 * a);
    const ros = sstep(petal + aa, petal, r);
    const ring = sstep(0.012 + aa, 0.012, Math.abs(r - 0.2));
    const core = sstep(0.045 + aa, 0.045, r);
    // dots at lattice junctions
    let dj = 9;
    for (const [px, py] of [[0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]]) dj = Math.min(dj, hyp(cu - px, cv - py));
    const dot = sstep(0.05 + aa, 0.05, dj);
    blend(o, A, Math.max(acc, ros * (1 - core)) * 0.9);
    m = Math.max(m, ring, core, dot);
    blend(o, M, m * 0.85);
    const p = pile[i] * 0.65 + pile2[i] * 0.35;
    mul(o, 0.9 + 0.2 * p);
    blend(o, [o.r * 1.15, o.g * 1.12, o.b * 1.08], sstep(0.55, 0.85, wear[i]) * 0.5);
    o.h = p * 0.8 + m * 0.25;
    o.ao = 0.85 + 0.15 * p;
    o.rough = 1;
  });
}

export function linoTiles({ size = 512, metres = 1.2, n = 4, a = '#cbbd98', b = '#7a3b2c', inset = false, rough = 0.42, seed = 27, mottle = 0.06 } = {}) {
  const S = size, q = S / n, A = hex(a), B = hex(b);
  const sp = vnoise(S, 128, 128, seed), mot = fbm(S, 12, 12, 3, seed + 1), wax = fbm(S, 3, 3, 4, seed + 2), scuff = vnoise(S, 64, 6, seed + 3);
  return surface({ size: S, metres, normal: 1.5 }, (x, y, o) => {
    const i = y * S + x, tx = Math.floor(x / q), ty = Math.floor(y / q);
    const fx = x - tx * q, fy = y - ty * q;
    const even = (tx + ty) % 2 === 0;
    put(o, even ? A : B, 0.97 + 0.05 * hash2(tx, ty, seed));
    if (inset && even) {
      const cu = Math.abs(fx - q / 2), cv = Math.abs(fy - q / 2);
      if (cu + cv < q * 0.2) put(o, B, 0.95);
    }
    mul(o, 1 - mottle + 2 * mottle * (0.6 * mot[i] + 0.4 * sp[i]));
    const d = Math.min(fx, q - fx, fy, q - fy);
    const joint = sstep(1.6, 0.4, d);
    blend(o, [o.r * 0.55, o.g * 0.55, o.b * 0.55], joint);
    o.h = -joint * 0.8 + 0.05 * sp[i];
    o.ao = 1 - joint * 0.4;
    o.rough = rough + 0.16 * (wax[i] - 0.5) + 0.2 * sstep(0.75, 0.9, scuff[i]) + joint * 0.3;
  });
}

export function ceramicTiles({ size = 512, metres = 0.9, n = 6, base = '#ebeae3', grout = '#a9a598', seed = 33 } = {}) {
  const S = size, q = S / n, B = hex(base), GR = hex(grout), sp = vnoise(S, 64, 64, seed), dirt = fbm(S, 4, 4, 3, seed + 1);
  return surface({ size: S, metres, normal: 2.5 }, (x, y, o) => {
    const i = y * S + x, tx = Math.floor(x / q), ty = Math.floor(y / q);
    const fx = x - tx * q, fy = y - ty * q, d = Math.min(fx, q - fx, fy, q - fy);
    put(o, B, 0.96 + 0.05 * hash2(tx, ty, seed) + 0.02 * sp[i]);
    const g = sstep(2.6, 1.2, d);
    blend(o, GR, g);
    blend(o, [o.r * 0.85, o.g * 0.83, o.b * 0.78], g * dirt[i] * 0.6);
    const pillow = Math.min(1, d / 6);
    o.h = g ? -g * 0.8 + (1 - g) * pillow * 0.5 : pillow * 0.5;
    o.rough = lerp(0.1 + 0.05 * sp[i], 0.85, g);
    o.ao = 1 - g * 0.35;
  });
}

// ------------------------------------------------------------------ masonry / misc

export function brickWall({ size = 512, metres = 1.2, seed = 41 } = {}) {
  const S = size, CH = S / 8, BL = S / 4, MORTAR = hex('#8a857c');
  const soot = fbm(S, 3, 3, 4, seed), fine = vnoise(S, 128, 128, seed + 1), chip = vnoise(S, 96, 96, seed + 2);
  const pal = ['#8f5a3e', '#9b6446', '#7d4c35', '#a56f4c', '#866049'].map(hex);
  return surface({ size: S, metres, normal: 2 }, (x, y, o) => {
    const i = y * S + x, row = Math.floor(y / CH), fy = y - row * CH;
    const xs = x + (row % 2) * BL / 2, col = Math.floor(xs / BL) % 4, fx = xs - Math.floor(xs / BL) * BL;
    const d = Math.min(fx, BL - fx, fy, CH - fy) - (chip[i] - 0.5) * 2.5;
    const mortar = sstep(3.2, 2.0, d);
    put(o, pal[Math.floor(hash2(col, row, seed) * pal.length)], 0.9 + 0.15 * fine[i]);
    blend(o, MORTAR, mortar);
    mul(o, 1 - 0.35 * sstep(0.45, 0.8, soot[i]));
    o.h = (1 - mortar) * (0.9 + 0.2 * fine[i]);
    o.rough = 0.82 + 0.1 * mortar;
    o.ao = 1 - mortar * 0.35;
  });
}

export function coalLumps({ size = 512, metres = 1.5, seed = 37 } = {}) {
  const S = size, w = worley(S, 22, seed), w2 = worley(S, 64, seed + 1), fine = vnoise(S, 256, 256, seed + 2);
  return surface({ size: S, metres, normal: 1.6 }, (x, y, o) => {
    const i = y * S + x;
    const edge = w.d2[i] - w.d1[i];
    const k = 0.05 + 0.06 * w.id[i] + 0.035 * (1 - w2.d1[i]) + 0.02 * fine[i];
    o.r = k; o.g = k; o.b = k * 1.08;
    o.h = (1 - w.d1[i] * 1.1) * 10 + (1 - w2.d1[i]) * 2.5;
    o.ao = 0.35 + 0.65 * sstep(0, 0.25, edge);
    o.rough = 0.42 + 0.35 * w2.id[i];
  });
}

export function plasterCeiling({ size = 512, metres = 1.5, seed = 39 } = {}) {
  const S = size, B = hex('#ebe6d8'), GR = hex('#bdb5a2'), big = fbm(S, 3, 3, 4, seed), fine = vnoise(S, 128, 128, seed + 1);
  return surface({ size: S, metres, normal: 4 }, (x, y, o) => {
    const i = y * S + x;
    const d = Math.min(x, S - 1 - x, y, S - 1 - y);
    let h = 0, ao = 1;
    if (d < 3) { h = 0.2; ao = 0.8; }
    else if (d < 26) { const t = (d - 3) / 23; h = 0.6 + 0.4 * Math.sin(t * Math.PI * 2.5) * (1 - t); ao = 0.9 + 0.1 * Math.sin(t * Math.PI * 2.5); }
    else if (d < 30) { h = 0.1; ao = 0.82; }
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

export function marbleSurface({ size = 512, metres = 1.2, base = '#e6e2d9', vein = '#8e877c', seed = 91 } = {}) {
  const S = size, B = hex(base), V = hex(vein), warp = fbm(S, 3, 3, 5, seed), warp2 = fbm(S, 6, 6, 4, seed + 1), cloud = fbm(S, 4, 4, 4, seed + 2);
  return surface({ size: S, metres, normal: 0.3 }, (x, y, o) => {
    const i = y * S + x;
    const s = Math.abs(Math.sin(TAU * (x / S + y / S + warp[i] * 1.6)));
    const s2 = Math.abs(Math.sin(TAU * (2 * x / S - y / S + warp2[i] * 2.2)));
    const vein1 = Math.pow(1 - s, 14), vein2 = Math.pow(1 - s2, 24) * 0.6;
    put(o, B, 0.95 + 0.06 * cloud[i]);
    blend(o, [0.86, 0.83, 0.78], sstep(0.5, 0.8, cloud[i]) * 0.3);
    blend(o, V, Math.min(1, vein1 + vein2) * 0.7);
    o.h = -0.2 * (vein1 + vein2);
    o.rough = 0.08 + 0.08 * vein1 + 0.04 * cloud[i];
  });
}

// ------------------------------------------------------------------ textiles

/** Plain weave (greyscale albedo multiplied by the material colour). */
export function weave({ size = 512, metres = 0.5, thread = 2, depth = 0.7, varK = 0.12, stains = 0, seed = 95 } = {}) {
  const S = size, big = fbm(S, 4, 4, 4, seed), slub = vnoise(S, S / thread, 12, seed + 1), slub2 = vnoise(S, 12, S / thread, seed + 2), st = fbm(S, 5, 5, 4, seed + 3);
  return surface({ size: S, metres, normal: 2 }, (x, y, o) => {
    const i = y * S + x;
    const cx = Math.floor(x / thread), cy = Math.floor(y / thread);
    const fx = (x % thread + 0.5) / thread, fy = (y % thread + 0.5) / thread;
    const warpTop = (cx + cy) % 2 === 0;
    const hw = Math.sin(Math.PI * fx), hf = Math.sin(Math.PI * fy);
    const h = warpTop ? 0.5 + 0.5 * hw * hf : 0.5 * hf * hw + 0.2;
    const sl = warpTop ? slub[i] : slub2[i];
    const k = 1 - varK + varK * (0.6 * big[i] + 0.4 * sl);
    o.r = o.g = o.b = k * (0.88 + 0.12 * h);
    if (stains) { const s = sstep(0.62, 0.8, st[i]) * stains; o.r *= 1 - 0.12 * s; o.g *= 1 - 0.14 * s; o.b *= 1 - 0.2 * s; }
    o.h = h * depth;
    o.ao = 0.8 + 0.2 * h;
    o.rough = 1;
  });
}

export function leatherGrain({ size = 512, metres = 0.5, seed = 97 } = {}) {
  const S = size, w = worley(S, 56, seed), cre = fbm(S, 6, 6, 4, seed + 1), big = fbm(S, 3, 3, 3, seed + 2);
  return surface({ size: S, metres, normal: 2.2 }, (x, y, o) => {
    const i = y * S + x;
    const crease = sstep(0.09, 0.0, w.d2[i] - w.d1[i]);
    const ridge = 1 - Math.abs(cre[i] - 0.5) * 2;
    const deep = sstep(0.9, 0.98, ridge);
    o.r = o.g = o.b = (0.88 + 0.14 * big[i]) * (1 - 0.25 * crease - 0.3 * deep);
    o.h = 0.5 * (1 - w.d1[i]) - 0.6 * crease - 1.2 * deep;
    o.rough = 0.78 + 0.22 * big[i] * 0 + 0.2 * crease;
    o.ao = 1 - 0.25 * crease - 0.3 * deep;
  });
}

export function basketWeave({ size = 512, metres = 0.35, seed = 99 } = {}) {
  const S = size, W = S / 16, fine = vnoise(S, 256, 32, seed);
  return surface({ size: S, metres, normal: 2.5 }, (x, y, o) => {
    const i = y * S + x, cx = Math.floor(x / W), cy = Math.floor(y / W);
    const fx = (x % W) / W, fy = (y % W) / W;
    const horiz = (Math.floor(cx / 2) + Math.floor(cy / 2)) % 2 === 0;
    const across = horiz ? fy : fx;
    const along = horiz ? fx : fy;
    const prof = Math.sin(Math.PI * across);
    const gap = sstep(0.12, 0.02, Math.min(across, 1 - across));
    o.r = o.g = o.b = (0.8 + 0.2 * prof) * (0.92 + 0.08 * fine[i]) * (1 - gap * 0.6);
    o.h = prof * (0.7 + 0.3 * Math.sin(Math.PI * along));
    o.ao = 1 - gap * 0.5;
    o.rough = 0.8;
  });
}

export function ropeLay({ size = 256, metres = 0.12, seed = 101 } = {}) {
  const S = size, fine = vnoise(S, 64, 128, seed);
  return surface({ size: S, metres, normal: 3 }, (x, y, o) => {
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
