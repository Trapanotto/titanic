import * as THREE from 'three';

// Procedural texture toolkit (pure JS, no canvas -> also works in the headless smoke test).
// Tileable value noise / fbm / worley fields + a "surface" builder that turns a per-pixel recipe
// (albedo, height, roughness, ao, metalness) into albedo + normal (Sobel) + ORM DataTextures.
// All textures are authored "per metre" (repeat = 1 / metres, RepeatWrapping).

export function rng(seed) { let s = (seed >>> 0) || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function hash2(x, y, seed) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const _fields = new Map();
// The noise fields are only a build-time cache (hundreds of MB). Drop them once texture generation has been idle
// for a while; they are regenerated on demand if a late texture needs them.
let _fieldTimer = null;
function touchFields() {
  if (_fieldTimer) clearTimeout(_fieldTimer);
  _fieldTimer = setTimeout(() => { _fields.clear(); _fieldTimer = null; }, 20000);
  _fieldTimer.unref?.();
}

/** Build-time cache for anything shared between surfaces (same lifetime as the noise fields). */
export function cached(key, make) {
  let v = _fields.get(key);
  if (v === undefined) { v = make(); _fields.set(key, v); }
  touchFields();
  return v;
}

/** Tileable value noise, `px` x `py` lattice cells across the texture, values 0..1. */
export function vnoise(size, px, py = px, seed = 1) {
  const key = `v${size}|${px}|${py}|${seed}`;
  let f = _fields.get(key);
  if (f) return f;
  f = new Float32Array(size * size);
  const lat = new Float32Array(px * py);
  for (let j = 0; j < py; j++) for (let i = 0; i < px; i++) lat[j * px + i] = hash2(i, j, seed);
  const sx = px / size, sy = py / size;
  const xi0 = new Int32Array(size), xi1 = new Int32Array(size), xf = new Float32Array(size);
  for (let x = 0; x < size; x++) {
    const u = x * sx, i = Math.floor(u), t = u - i;
    xi0[x] = i % px; xi1[x] = (i + 1) % px; xf[x] = t * t * (3 - 2 * t);
  }
  // separable: every lattice row interpolated along x once, then each pixel row blends two of them
  const rowsX = new Float32Array(py * size);
  for (let j = 0; j < py; j++) {
    const r = j * px, o = j * size;
    for (let x = 0; x < size; x++) { const a = lat[r + xi0[x]]; rowsX[o + x] = a + (lat[r + xi1[x]] - a) * xf[x]; }
  }
  for (let y = 0; y < size; y++) {
    const v = y * sy, j = Math.floor(v), t0 = v - j, t = t0 * t0 * (3 - 2 * t0);
    const r0 = (j % py) * size, r1 = ((j + 1) % py) * size, o = y * size;
    for (let x = 0; x < size; x++) { const top = rowsX[r0 + x]; f[o + x] = top + (rowsX[r1 + x] - top) * t; }
  }
  _fields.set(key, f); touchFields();
  return f;
}

/** Tileable fbm (normalised to ~0..1). Periods double each octave. */
export function fbm(size, px, py = px, oct = 4, seed = 1, gain = 0.5) {
  const key = `f${size}|${px}|${py}|${oct}|${seed}|${gain}`;
  let f = _fields.get(key);
  if (f) return f;
  f = new Float32Array(size * size);
  let amp = 1, tot = 0, cx = px, cy = py, no = 0;
  for (let o = 0; o < oct && cx <= size && cy <= size; o++) { tot += amp; amp *= gain; cx *= 2; cy *= 2; no++; }
  amp = 1 / tot; cx = px; cy = py;
  for (let o = 0; o < no; o++) {
    const n = vnoise(size, cx, cy, seed + o * 101);
    for (let i = 0; i < f.length; i++) f[i] += n[i] * amp;
    amp *= gain; cx *= 2; cy *= 2;
  }
  _fields.set(key, f); touchFields();
  return f;
}

/** Tileable worley noise: returns {d1, d2, id} (distances in cell units, id 0..1). */
export function worley(size, cells, seed = 1, jitter = 0.9) {
  const key = `w${size}|${cells}|${seed}|${jitter}`;
  let w = _fields.get(key);
  if (w) return w;
  const fx = new Float32Array(cells * cells), fy = new Float32Array(cells * cells), fid = new Float32Array(cells * cells);
  for (let j = 0; j < cells; j++) for (let i = 0; i < cells; i++) {
    const k = j * cells + i;
    fx[k] = 0.5 + (hash2(i, j, seed) - 0.5) * jitter; fy[k] = 0.5 + (hash2(i, j, seed + 7) - 0.5) * jitter; fid[k] = hash2(i, j, seed + 13);
  }
  const d1 = new Float32Array(size * size), d2 = new Float32Array(size * size), id = new Float32Array(size * size);
  // feature points with a one-cell wrapped border, stored at absolute cell positions (no modulo in the inner loop)
  const P = cells + 2, ax = new Float32Array(P * P), ay = new Float32Array(P * P), aid = new Float32Array(P * P);
  for (let j = -1; j <= cells; j++) for (let i = -1; i <= cells; i++) {
    const k = ((j + cells) % cells) * cells + ((i + cells) % cells), q = (j + 1) * P + i + 1;
    ax[q] = i + fx[k]; ay[q] = j + fy[k]; aid[q] = fid[k];
  }
  const s = cells / size;
  for (let y = 0; y < size; y++) {
    const v = y * s, cj = Math.floor(v);
    for (let x = 0; x < size; x++) {
      const u = x * s, ci = Math.floor(u);
      let b1 = 9, b2 = 9, bid = 0;
      for (let dj = 0; dj <= 2; dj++) {
        const row = (cj + dj) * P + ci;
        for (let di = 0; di <= 2; di++) {
          const q = row + di;
          const dx = ax[q] - u, dy = ay[q] - v, d = dx * dx + dy * dy;
          if (d < b1) { b2 = b1; b1 = d; bid = aid[q]; } else if (d < b2) b2 = d;
        }
      }
      const o = y * size + x;
      d1[o] = Math.sqrt(b1); d2[o] = Math.sqrt(b2); id[o] = bid;
    }
  }
  w = { d1, d2, id };
  _fields.set(key, w); touchFields();
  return w;
}

/** Lattice cell count for a noise field: `n` cells, but never finer than 2 px per cell (no aliasing at 256 px). */
export const cells = (size, n) => Math.max(2, Math.min(Math.round(n), size >> 1));

/** Box-filtered coverage (0..1) of a line of half-width `hw` px at distance `d` px from the pixel centre. */
export function cover(d, hw) {
  d = d < 0 ? -d : d;
  const c = Math.min(hw, d + 0.5) - Math.max(-hw, d - 0.5);
  return c <= 0 ? 0 : c > 1 ? 1 : c;
}

/**
 * Tileable field of random strokes (scratches, scuffs, hairlines), values 0..1. Size must be a power of two.
 * n strokes, length len[0]..len[1] px, `curve` = total bend in radians, `dir` = preferred angle (null: any),
 * `spread` = angular spread around dir. Strokes fade in and out at their ends.
 */
export function strokes(size, n, seed, { len = [4, 40], curve = 0.4, dir = null, spread = 0.3, amp = [0.3, 1] } = {}) {
  const key = `s${size}|${n}|${seed}|${len}|${curve}|${dir}|${spread}|${amp}`;
  let f = _fields.get(key);
  if (f) return f;
  f = new Float32Array(size * size);
  const r = rng(seed), m = size - 1, step = 0.6;
  for (let s = 0; s < n; s++) {
    let x = r() * size, y = r() * size;
    let a = dir === null ? r() * Math.PI * 2 : dir + (r() - 0.5) * 2 * spread;
    const L = len[0] + (len[1] - len[0]) * r() * r(), v = (amp[0] + (amp[1] - amp[0]) * r()) * step;
    const da = (r() - 0.5) * curve / Math.max(1, L) * step, ramp = L * 0.2 + 0.5;
    let ca = Math.cos(a), sa = Math.sin(a);
    for (let t = 0; t < L; t += step) {
      const e = Math.min(1, t / ramp, (L - t) / ramp) * v;
      const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
      const i0 = x0 & m, i1 = (x0 + 1) & m, j0 = (y0 & m) * size, j1 = ((y0 + 1) & m) * size;
      f[j0 + i0] += (1 - fx) * (1 - fy) * e; f[j0 + i1] += fx * (1 - fy) * e;
      f[j1 + i0] += (1 - fx) * fy * e; f[j1 + i1] += fx * fy * e;
      x += ca * step; y += sa * step;
      if (da) { a += da; ca = Math.cos(a); sa = Math.sin(a); }
    }
  }
  for (let i = 0; i < f.length; i++) if (f[i] > 1) f[i] = 1;
  _fields.set(key, f); touchFields();
  return f;
}

/** Bilinear, wrapped sample of a field. */
export function sampleField(f, size, x, y) {
  x = ((x % size) + size) % size; y = ((y % size) + size) % size;
  const x0 = Math.floor(x), y0 = Math.floor(y), tx = x - x0, ty = y - y0;
  const x1 = (x0 + 1) % size, y1 = (y0 + 1) % size;
  const a = f[y0 * size + x0], b = f[y0 * size + x1], c = f[y1 * size + x0], d = f[y1 * size + x1];
  return (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
}

export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const hex = (h) => { const n = parseInt(h.replace('#', ''), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
export { hash2 };

function dataTex(data, size, metres, srgb) {
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 8;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.repeat.set(1 / metres, 1 / metres);
  t.needsUpdate = true;
  t.onUpdate = releaseTexData;
  return t;
}

/** The pixels live on the GPU after the first upload (mipmaps are generated there): drop the CPU copy. */
export function releaseTexData(t) {
  const img = t.image;
  if (img && img.data) t.image = { data: null, width: img.width, height: img.height, depth: img.depth };
}

/**
 * Build the textures of a surface.
 * fn(x, y, o) fills o.r, o.g, o.b (sRGB 0..1), o.h (height, texel units scaled by `normal`), o.rough, o.ao, o.metal.
 * opts: size, metres, normal (strength), albedo/orm (bool, default true), ref (the size the recipe's heights are
 * authored for: the normal strength scales with size / ref, so a feature of fixed physical size keeps its slope).
 * Returns { map, normalMap, ormMap } (missing ones are null). ORM: R = ao, G = roughness, B = metalness.
 */
let RAW = false;
/** Texture worker: surface() returns the raw pixel arrays instead of textures. */
export function setRawSurfaces(v) { RAW = !!v; }

/** DataTexture for pixels that arrive later (texture worker): 1x1 until fillTexture(). */
export function pendingTexture(srgb) { return dataTex(new Uint8Array([128, 128, 255, 255]), 1, 1, srgb); }
/** Put the generated pixels into a texture made by pendingTexture(). */
export function fillTexture(t, data, size, metres) {
  t.image = { data, width: size, height: size };
  t.repeat.set(1 / metres, 1 / metres);
  t.onUpdate = releaseTexData;
  t.needsUpdate = true;
}
/** Textures of a surface from raw arrays ({A, N, O, size, metres}). */
export function rawToSurface(r) {
  return {
    map: r.A ? dataTex(r.A, r.size, r.metres, true) : null,
    normalMap: r.N ? dataTex(r.N, r.size, r.metres, false) : null,
    ormMap: r.O ? dataTex(r.O, r.size, r.metres, false) : null,
  };
}

export function surface(opts, fn) {
  const size = opts.size || 512, metres = opts.metres || 1, strength = (opts.normal ?? 1) * (opts.ref ? size / opts.ref : 1);
  const wantAlbedo = opts.albedo !== false, wantOrm = opts.orm !== false, wantNormal = strength > 0;
  const n = size * size;
  const H = new Float32Array(n);
  // clamped views clamp and round on store; the textures get plain Uint8Array views of the same memory
  const AC = wantAlbedo ? new Uint8ClampedArray(n * 4).fill(255) : null;
  const OC = wantOrm ? new Uint8ClampedArray(n * 4).fill(255) : null;
  const o = { r: 0.5, g: 0.5, b: 0.5, h: 0.5, rough: 0.5, ao: 0.5, metal: 0.5 };
  for (let y = 0, i = 0; y < size; y++) {
    for (let x = 0; x < size; x++, i++) {
      o.r = o.g = o.b = 1; o.h = 0; o.rough = 1; o.ao = 1; o.metal = 0;
      fn(x, y, o);
      H[i] = o.h;
      const k = i * 4;
      if (AC) { AC[k] = o.r * 255; AC[k + 1] = o.g * 255; AC[k + 2] = o.b * 255; }
      if (OC) { OC[k] = o.ao * 255; OC[k + 1] = o.rough * 255; OC[k + 2] = o.metal * 255; }
    }
  }
  const A = AC ? new Uint8Array(AC.buffer) : null, O = OC ? new Uint8Array(OC.buffer) : null;
  let N = null;
  if (wantNormal) {
    N = new Uint8Array(n * 4);
    const m = size - 1;
    for (let y = 0; y < size; y++) {
      const ym = ((y - 1) & m) * size, y0 = y * size, yp = ((y + 1) & m) * size;
      for (let x = 0; x < size; x++) {
        const xm = (x - 1) & m, xp = (x + 1) & m;
        // Sobel
        const tl = H[ym + xm], t = H[ym + x], tr = H[ym + xp], l = H[y0 + xm], r = H[y0 + xp], bl = H[yp + xm], b = H[yp + x], br = H[yp + xp];
        const dx = (tr + 2 * r + br - tl - 2 * l - bl) * 0.25, dy = (bl + 2 * b + br - tl - 2 * t - tr) * 0.25;
        let nx = -dx * strength, ny = -dy * strength;
        const inv = 1 / Math.sqrt(nx * nx + ny * ny + 1);
        const k = (y0 + x) * 4;
        N[k] = (nx * inv * 0.5 + 0.5) * 255 + 0.5; N[k + 1] = (ny * inv * 0.5 + 0.5) * 255 + 0.5; N[k + 2] = (inv * 0.5 + 0.5) * 255 + 0.5; N[k + 3] = 255;
      }
    }
  }
  if (RAW) return { A, N, O, size, metres };
  return rawToSurface({ A, N, O, size, metres });
}
