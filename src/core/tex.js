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
  for (let y = 0; y < size; y++) {
    const v = y * sy, j = Math.floor(v), t0 = v - j, t = t0 * t0 * (3 - 2 * t0);
    const r0 = (j % py) * px, r1 = ((j + 1) % py) * px, o = y * size;
    for (let x = 0; x < size; x++) {
      const a = lat[r0 + xi0[x]], b = lat[r0 + xi1[x]], c = lat[r1 + xi0[x]], d = lat[r1 + xi1[x]];
      const fx = xf[x];
      const top = a + (b - a) * fx, bot = c + (d - c) * fx;
      f[o + x] = top + (bot - top) * t;
    }
  }
  _fields.set(key, f);
  return f;
}

/** Tileable fbm (normalised to ~0..1). Periods double each octave. */
export function fbm(size, px, py = px, oct = 4, seed = 1, gain = 0.5) {
  const key = `f${size}|${px}|${py}|${oct}|${seed}|${gain}`;
  let f = _fields.get(key);
  if (f) return f;
  f = new Float32Array(size * size);
  let amp = 1, tot = 0, cx = px, cy = py;
  for (let o = 0; o < oct; o++) {
    if (cx > size || cy > size) break;
    const n = vnoise(size, cx, cy, seed + o * 101);
    for (let i = 0; i < f.length; i++) f[i] += n[i] * amp;
    tot += amp; amp *= gain; cx *= 2; cy *= 2;
  }
  for (let i = 0; i < f.length; i++) f[i] /= tot;
  _fields.set(key, f);
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
  const s = cells / size;
  for (let y = 0; y < size; y++) {
    const v = y * s, cj = Math.floor(v);
    for (let x = 0; x < size; x++) {
      const u = x * s, ci = Math.floor(u);
      let b1 = 9, b2 = 9, bid = 0;
      for (let dj = -1; dj <= 1; dj++) {
        const jj = cj + dj, jw = ((jj % cells) + cells) % cells;
        for (let di = -1; di <= 1; di++) {
          const ii = ci + di, iw = ((ii % cells) + cells) % cells, k = jw * cells + iw;
          const dx = ii + fx[k] - u, dy = jj + fy[k] - v, d = dx * dx + dy * dy;
          if (d < b1) { b2 = b1; b1 = d; bid = fid[k]; } else if (d < b2) b2 = d;
        }
      }
      const o = y * size + x;
      d1[o] = Math.sqrt(b1); d2[o] = Math.sqrt(b2); id[o] = bid;
    }
  }
  w = { d1, d2, id };
  _fields.set(key, w);
  return w;
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
  return t;
}

/**
 * Build the textures of a surface.
 * fn(x, y, o) fills o.r, o.g, o.b (sRGB 0..1), o.h (height, texel units scaled by `normal`), o.rough, o.ao, o.metal.
 * opts: size, metres, normal (strength), albedo/orm (bool, default true).
 * Returns { map, normalMap, ormMap } (missing ones are null). ORM: R = ao, G = roughness, B = metalness.
 */
export function surface(opts, fn) {
  const size = opts.size || 512, metres = opts.metres || 1, strength = opts.normal ?? 1;
  const wantAlbedo = opts.albedo !== false, wantOrm = opts.orm !== false, wantNormal = strength > 0;
  const n = size * size;
  const H = new Float32Array(n);
  const A = wantAlbedo ? new Uint8Array(n * 4) : null;
  const O = wantOrm ? new Uint8Array(n * 4) : null;
  const o = { r: 1, g: 1, b: 1, h: 0, rough: 1, ao: 1, metal: 0 };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      o.r = o.g = o.b = 1; o.h = 0; o.rough = 1; o.ao = 1; o.metal = 0;
      fn(x, y, o);
      const i = y * size + x;
      H[i] = o.h;
      if (A) { const k = i * 4; A[k] = clamp01(o.r) * 255 + 0.5; A[k + 1] = clamp01(o.g) * 255 + 0.5; A[k + 2] = clamp01(o.b) * 255 + 0.5; A[k + 3] = 255; }
      if (O) { const k = i * 4; O[k] = clamp01(o.ao) * 255 + 0.5; O[k + 1] = clamp01(o.rough) * 255 + 0.5; O[k + 2] = clamp01(o.metal) * 255 + 0.5; O[k + 3] = 255; }
    }
  }
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
  return {
    map: A ? dataTex(A, size, metres, true) : null,
    normalMap: N ? dataTex(N, size, metres, false) : null,
    ormMap: O ? dataTex(O, size, metres, false) : null,
  };
}
