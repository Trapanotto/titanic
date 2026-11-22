// Minimal serif stroke font for raised lettering on curved surfaces (hull names, draught marks, plates).
// Glyph units: cap height 1. Strokes: ['l', u0, v0, u1, v1, w?] lines, ['a', cu, cv, ru, rv, deg0, deg1, w?] arcs.

const SER = 0.17; // half serif length
const stem = (u) => [['l', u, 0, u, 1], ['l', u - SER, 0.03, u + SER, 0.03, 0.5], ['l', u - SER, 0.97, u + SER, 0.97, 0.5]];
const GLYPHS = {
  T: { w: 0.8, s: [['l', 0, 0.96, 0.8, 0.96], ['l', 0.4, 0, 0.4, 0.96], ['l', 0.4 - SER, 0.03, 0.4 + SER, 0.03, 0.5], ['l', 0.02, 0.8, 0.02, 0.98, 0.6], ['l', 0.78, 0.8, 0.78, 0.98, 0.6]] },
  I: { w: 0.36, s: stem(0.18) },
  A: { w: 0.9, s: [['l', 0.05, 0, 0.45, 1], ['l', 0.45, 1, 0.85, 0], ['l', 0.22, 0.36, 0.68, 0.36, 0.7], ['l', -0.08, 0.03, 0.2, 0.03, 0.5], ['l', 0.72, 0.03, 0.98, 0.03, 0.5]] },
  N: { w: 0.84, s: [['l', 0.08, 0, 0.08, 1, 0.7], ['l', 0.08, 1, 0.76, 0], ['l', 0.76, 0, 0.76, 1, 0.7], ['l', -0.08, 0.03, 0.24, 0.03, 0.5], ['l', 0.6, 0.97, 0.92, 0.97, 0.5]] },
  C: { w: 0.82, s: [['a', 0.44, 0.5, 0.4, 0.49, 45, 315], ['l', 0.74, 0.7, 0.76, 0.9, 0.6]] },
  O: { w: 0.88, s: [['a', 0.44, 0.5, 0.4, 0.49, 0, 360]] },
  L: { w: 0.7, s: [['l', 0.12, 0, 0.12, 1], ['l', 0.12, 0.04, 0.68, 0.04, 0.8], ['l', -0.05, 0.97, 0.29, 0.97, 0.5], ['l', 0.66, 0.0, 0.68, 0.2, 0.6]] },
  V: { w: 0.86, s: [['l', 0.03, 1, 0.43, 0], ['l', 0.43, 0, 0.83, 1, 0.7], ['l', -0.12, 0.97, 0.18, 0.97, 0.5], ['l', 0.68, 0.97, 0.98, 0.97, 0.5]] },
  E: { w: 0.72, s: [...stem(0.12).slice(0, 1), ['l', 0.12, 0.96, 0.68, 0.96, 0.8], ['l', 0.12, 0.5, 0.56, 0.5, 0.7], ['l', 0.12, 0.04, 0.7, 0.04, 0.8], ['l', -0.05, 0.03, 0.12, 0.03, 0.5], ['l', -0.05, 0.97, 0.12, 0.97, 0.5], ['l', 0.68, 0.8, 0.68, 0.98, 0.6], ['l', 0.7, 0.0, 0.7, 0.2, 0.6]] },
  R: { w: 0.8, s: [...stem(0.12).slice(0, 2), ['l', 0.12, 0.96, 0.42, 0.96, 0.8], ['l', 0.12, 0.5, 0.42, 0.5, 0.8], ['a', 0.42, 0.73, 0.25, 0.23, -90, 90], ['l', 0.4, 0.5, 0.74, 0], ['l', -0.05, 0.97, 0.12, 0.97, 0.5]] },
  P: { w: 0.76, s: [...stem(0.12).slice(0, 2), ['l', 0.12, 0.96, 0.42, 0.96, 0.8], ['l', 0.12, 0.48, 0.42, 0.48, 0.8], ['a', 0.42, 0.72, 0.26, 0.24, -90, 90], ['l', -0.05, 0.97, 0.12, 0.97, 0.5]] },
  X: { w: 0.6, s: [['l', 0.02, 0, 0.58, 1], ['l', 0.58, 0, 0.02, 1]] },
  S: { w: 0.7, s: [['a', 0.35, 0.75, 0.3, 0.24, 20, 270], ['a', 0.35, 0.27, 0.3, 0.26, 90, -160]] },
  '.': { w: 0.3, s: [['l', 0.15, 0.0, 0.15, 0.14, 1.3]] },
  ' ': { w: 0.5, s: [] },
};
const ROMAN = { I: { w: 0.22, s: [['l', 0.11, 0, 0.11, 1]] }, V: { w: 0.6, s: [['l', 0.02, 1, 0.3, 0], ['l', 0.3, 0, 0.58, 1]] }, X: { w: 0.6, s: [['l', 0.02, 0, 0.58, 1], ['l', 0.58, 0, 0.02, 1]] } };

/**
 * Raised text on a surface S(u, v, out) (metres along the surface), N(u, v) outward normal.
 * Baseline at v0, cap height h, starts at u0; if `width` is given the advance is scaled to fit.
 */
export function strokeText(batch, mat, text, { S, N, u0 = 0, v0 = 0, h = 1, track = 0.1, width = 0, depth = 0.02, stroke = 0.1, roman = false, sides = true }) {
  const seg = (b, m, S_, N_, ua, va, ub, vb, w, d) => segment(b, m, S_, N_, ua, va, ub, vb, w, d, sides);
  const set = roman ? ROMAN : GLYPHS;
  const glyphs = [...text].map((c) => set[c] || GLYPHS[c] || GLYPHS[' ']);
  const raw = glyphs.reduce((a, g) => a + g.w * h, 0) + track * h * Math.max(0, glyphs.length - 1);
  const sx = width ? width / raw : 1;
  let pen = u0;
  for (const g of glyphs) {
    for (const st of g.s) {
      const w = stroke * (st[0] === 'l' ? (st[5] ?? 1) : (st[7] ?? 1));
      if (st[0] === 'l') seg(batch, mat, S, N, pen + st[1] * h * sx, v0 + st[2] * h, pen + st[3] * h * sx, v0 + st[4] * h, w, depth);
      else {
        const [, cu, cv, ru, rv, d0, d1] = st, n = Math.max(6, Math.round(Math.abs(d1 - d0) / 15));
        for (let i = 0; i < n; i++) {
          const a0 = ((d0 + ((d1 - d0) * i) / n) * Math.PI) / 180, a1 = ((d0 + ((d1 - d0) * (i + 1)) / n) * Math.PI) / 180;
          // thicker on the sides of round letters (modulated stroke)
          const ww = w * (0.55 + 0.45 * Math.abs(Math.cos((a0 + a1) / 2)));
          const ext = 0.004 / Math.max(0.05, h);
          seg(batch, mat, S, N, pen + (cu + Math.cos(a0 - ext) * ru) * h * sx, v0 + (cv + Math.sin(a0 - ext) * rv) * h, pen + (cu + Math.cos(a1 + ext) * ru) * h * sx, v0 + (cv + Math.sin(a1 + ext) * rv) * h, ww, depth);
        }
      }
    }
    pen += (g.w + track) * h * sx;
  }
}

function segment(batch, mat, S, N, ua, va, ub, vb, w, depth, sides = true) {
  const du = ub - ua, dv = vb - va, L = Math.hypot(du, dv);
  if (L < 1e-5) return;
  const pu = (-dv / L) * w * 0.5, pv = (du / L) * w * 0.5;
  // extend slightly along the stroke so joints close
  const eu = (du / L) * w * 0.25, ev = (dv / L) * w * 0.25;
  const c = [[ua - eu + pu, va - ev + pv], [ub + eu + pu, vb + ev + pv], [ub + eu - pu, vb + ev - pv], [ua - eu - pu, va - ev - pv]];
  const n = N((ua + ub) / 2, (va + vb) / 2);
  const top = c.map(([u, v]) => S(u, v, depth)), bot = c.map(([u, v]) => S(u, v, 0));
  batch.oquad(mat, top[0], top[1], top[2], top[3], n);
  if (!sides) return;
  const cm = S((ua + ub) / 2, (va + vb) / 2, depth);
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4, m = [(top[i][0] + top[j][0]) / 2 - cm[0], (top[i][1] + top[j][1]) / 2 - cm[1], (top[i][2] + top[j][2]) / 2 - cm[2]];
    batch.oquad(mat, bot[i], bot[j], top[j], top[i], m);
  }
}
