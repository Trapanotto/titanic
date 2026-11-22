// Interior kit – decor, lights, luggage / cargo, galley / bar, small "life" items. Front of every prop faces +x.
import * as THREE from 'three';
import { mats as M } from '../core/materials.js';
import { kitMats as K, matOf, AT } from './batch.js';
import * as G from './geom.js';
import { def, rngOf, tableLampOn, cabDoor, drawer, SHAPES } from './props-core.js';
import { lifeJackets } from './props-furniture.js';

const ROSE = (r) => [[0, 0], [r, 0], [r * 0.95, -0.012], [r * 0.7, -0.022], [r * 0.4, -0.03], [r * 0.25, -0.045], [0, -0.05]];

// ============================================================ fireplace, columns, pilasters

export const fireplace = def('fireplace', [1.7, 0.42, 2.3], (p, o) => {
  const m = matOf(o.mat, M.mahogany);
  p.b(M.brick, 0.08, 2.3, 1.7, -0.17, 0, 0);
  // hearth + fender
  p.bb(M.marble, 0.42, 0.04, 1.5, 0.0, 0, 0, 0.01);
  p.loft(M.brass, [[0.19, 0.07, -0.55], [0.2, 0.07, -0.3], [0.205, 0.07, 0], [0.2, 0.07, 0.3], [0.19, 0.07, 0.55]], 0.016, 8);
  for (const s of [-1, 1]) { p.loft(M.brass, [[0.19, 0.07, s * 0.55], [0.1, 0.07, s * 0.56], [-0.08, 0.07, s * 0.55]], 0.016, 8); p.lathe(M.brass, [[0, 0], [0.022, 0], [0.02, 0.04], [0, 0.05]], 0.19, 0.04, s * 0.55, 8); }
  // jambs: fluted pilasters with consoles
  for (const s of [-1, 1]) {
    const z = s * 0.66;
    p.bb(m, 0.24, 0.08, 0.28, -0.03, 0.04, z, 0.012);
    p.bb(m, 0.2, 0.92, 0.22, -0.05, 0.12, z, 0.01);
    for (let i = -1; i <= 1; i++) p.b(m, 0.012, 0.7, 0.02, 0.055, 0.22, z + i * 0.06);
    p.extZ(m, [[-0.1, 0], [0.08, 0], [0.11, 0.04], [0.1, 0.1], [0.06, 0.14], [0.1, 0.2], [0.12, 0.24], [-0.1, 0.24]], 0.18, -0.06, 0.98, z, 0.008);
    p.t(M.gold, 0.035, 0.008, 0.07, 1.16, z, 'z', 10, 4);
  }
  // frieze with carved garland, mantel shelf
  p.bb(m, 0.16, 0.24, 1.12, -0.07, 0.98, 0, 0.01);
  const gar = []; for (let i = 0; i <= 10; i++) { const t = i / 10; gar.push([0.015, 1.18 - 0.08 * Math.sin(Math.PI * t), -0.42 + 0.84 * t]); }
  p.loft(o.mat === 'oak' ? M.gold : M.woodDark, gar.map(([x, y, z]) => [x, y, z]), gar.map((_, i) => 0.012 + 0.012 * Math.sin((Math.PI * i) / 10)), 6);
  p.t(M.gold, 0.04, 0.01, 0.02, 1.1, 0, 'x', 12, 4);
  p.bb(m, 0.36, 0.035, 1.66, -0.03, 1.22, 0, 0.012); p.bb(m, 0.4, 0.04, 1.7, -0.01, 1.255, 0, 0.014);
  // cast-iron grate insert with arched opening, tiled slips, coal fire
  const ins = new THREE.Shape([new THREE.Vector2(-0.52, 0.04), new THREE.Vector2(0.52, 0.04), new THREE.Vector2(0.52, 0.98), new THREE.Vector2(-0.52, 0.98)]);
  const hole = new THREE.Path(); hole.moveTo(-0.3, 0.06); hole.lineTo(0.3, 0.06); hole.lineTo(0.3, 0.62); hole.quadraticCurveTo(0, 0.86, -0.3, 0.62); hole.lineTo(-0.3, 0.06); ins.holes.push(hole);
  p.extX(M.iron, ins, 0.03, -0.12, 0, 0, 0.006);
  for (const s of [-1, 1]) p.b(K.tileBlue, 0.01, 0.8, 0.16, -0.1, 0.12, s * 0.42);
  p.bb(M.iron, 0.04, 0.6, 0.6, -0.16, 0.06, 0, 0.004);
  p.bb(M.iron, 0.22, 0.03, 0.5, -0.05, 0.12, 0, 0.004);
  for (let i = 0; i < 5; i++) p.b(M.iron, 0.012, 0.16, 0.012, 0.05, 0.12, -0.2 + i * 0.1);
  p.cz(M.iron, 0.01, 0.52, 0.05, 0.27, 0, 6);
  const r = rngOf(5);
  for (let i = 0; i < 14; i++) p.bb(M.coal, 0.06 + r() * 0.04, 0.04 + r() * 0.03, 0.06 + r() * 0.05, -0.06 + r() * 0.12, 0.15 + r() * 0.08, -0.2 + r() * 0.4, 0.015).rotation.set(r(), r() * 3, r());
  if (o.fire !== false) {
    for (let i = 0; i < 5; i++) { const f = p.extX(M.fire, [[-0.05, 0], [0.05, 0], [0.03, 0.08], [0.01, 0.16 + r() * 0.06], [-0.02, 0.1]], 0.01, -0.04 + r() * 0.05, 0.2, -0.18 + i * 0.09); f.rotation.y = Math.PI / 2 + (r() - 0.5) * 0.6; }
    p.b(M.fire, 0.1, 0.02, 0.4, -0.02, 0.16, 0);
  }
  // fire irons
  p.lathe(M.brass, [[0, 0], [0.05, 0], [0.012, 0.02], [0.008, 0.55], [0.02, 0.58], [0, 0.6]], 0.12, 0.04, 0.68, 8);
  // overmantel mirror with carved frame and broken pediment
  if (o.mirror !== false) {
    p.bb(m, 0.05, 0.94, 1.3, -0.14, 1.3, 0, 0.008);
    p.b(M.mirror, 0.006, 0.76, 1.08, -0.112, 1.39, 0);
    for (const [y, h] of [[1.36, 0.03], [2.15, 0.03]]) p.bb(M.gold, 0.014, h, 1.12, -0.11, y, 0, 0.004);
    for (const s of [-1, 1]) p.bb(M.gold, 0.014, 0.82, 0.03, -0.11, 1.36, s * 0.555, 0.004);
    p.extX(m, [[-0.7, 0], [0.7, 0], [0.7, 0.06], [0.2, 0.2], [0.14, 0.17], [0.6, 0.06], [-0.6, 0.06], [-0.14, 0.17], [-0.2, 0.2], [-0.7, 0.06]], 0.06, -0.14, 2.24, 0, 0.006);
    p.lathe(M.gold, [[0, 0], [0.04, 0], [0.05, 0.04], [0.02, 0.08], [0, 0.09]], -0.13, 2.3, 0, 10);
  }
  if (o.clock !== false) {
    p.bb(M.woodDark, 0.12, 0.2, 0.22, 0.04, 1.295, 0, 0.008);
    p.extX(M.woodDark, [[-0.11, 0], [0.11, 0], [0.11, 0.04], [0.06, 0.1], [0, 0.12], [-0.06, 0.1], [-0.11, 0.04]], 0.12, 0.04, 1.495, 0, 0.005);
    p.cx(K.clockFace, 0.075, 0.012, 0.104, 1.42, 0, 16); p.t(M.brass, 0.078, 0.007, 0.105, 1.42, 0, 'x', 16, 4);
    for (const s of [-1, 1]) p.lathe(M.brass, [[0, 0], [0.012, 0], [0.012, 0.012], [0, 0.015]], 0.08, 1.28, s * 0.09, 6);
  }
  for (const s of [-1, 1]) p.lathe(M.brass, [[0, 0], [0.045, 0], [0.04, 0.012], [0.012, 0.03], [0.01, 0.16], [0.022, 0.2], [0.018, 0.22], [0.006, 0.22], [0.006, 0.28], [0, 0.28]], 0.05, 1.295, s * 0.6, 10);
});

/** fluted column (revolve with flutes), moulded base, leaf capital */
export const column = def('column', (o) => { const d = 2 * (o.r ?? 0.15) + 0.12; return [d, d, o.h ?? 2.5]; }, (p, o) => {
  const r = o.r ?? 0.15, h = o.h ?? 2.5, m = matOf(o.mat, M.paintWhite), cap = matOf(o.capital, m), D = 2 * r + 0.12;
  p.bb(m, D, 0.12, D, 0, 0, 0, 0.01);
  p.lathe(m, [[0, 0.12], [r * 1.25, 0.12], [r * 1.28, 0.15], [r * 1.18, 0.19], [r * 1.12, 0.2], [r * 1.18, 0.23], [r * 1.05, 0.26], [0, 0.26]], 0, 0, 0, 24);
  const fl = 20, sh0 = 0.26, sh1 = h - 0.38;
  p.rev(m, [{ o: r, y: sh0, m: 0 }, { o: r, y: sh0 + 0.06, m: 0.012 }, { o: r * 0.98, y: (sh0 + sh1) / 2, m: 0.012 }, { o: r * 0.88, y: sh1 - 0.06, m: 0.011 }, { o: r * 0.88, y: sh1, m: 0 }],
    { seg: fl * 3, wave: (pt, i) => -Math.abs(Math.sin((i / 3) * Math.PI)) });
  p.lathe(cap, [[r * 0.88, sh1], [r * 1.02, sh1 + 0.02], [r * 0.9, sh1 + 0.05], [r * 0.95, sh1 + 0.18], [r * 1.25, sh1 + 0.26], [0, sh1 + 0.26]], 0, 0, 0, 20);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2, lf = p.extZ(cap, [[-0.04, 0], [0.04, 0], [0.05, 0.08], [0.03, 0.15], [0, 0.18], [-0.03, 0.15], [-0.05, 0.08]], 0.012, 0, 0, 0, 0.003);
    lf.position.set(Math.cos(a) * r * 0.98, sh1 + 0.04, -Math.sin(a) * r * 0.98); lf.rotation.set(0, a + Math.PI / 2, 0); lf.rotateX(-0.35);
  }
  p.bb(cap, D - 0.02, 0.06, D - 0.02, 0, sh1 + 0.26, 0, 0.01);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.t(cap, 0.03, 0.009, sx * (D / 2 - 0.04), sh1 + 0.24, sz * (D / 2 - 0.04), 'y', 10, 4);
  p.bb(m, D + 0.02, h - sh1 - 0.32, D + 0.02, 0, sh1 + 0.32, 0, 0.01);
});

export const pilaster = def('pilaster', (o) => [o.w ?? 0.32, 0.08, o.h ?? 2.5], (p, o) => {
  const w = o.w ?? 0.32, h = o.h ?? 2.5, m = matOf(o.mat, M.oak), cap = matOf(o.capital, m);
  p.bb(m, 0.08, 0.16, w + 0.05, 0, 0, 0, 0.01); p.bb(m, 0.07, 0.04, w + 0.03, 0, 0.16, 0, 0.008);
  p.bb(m, 0.05, h - 0.4, w, -0.015, 0.2, 0, 0.006);
  const nf = Math.max(2, Math.round(w / 0.08));
  for (let i = 0; i < nf; i++) p.b(m, 0.012, h - 0.6, 0.016, 0.012, 0.3, -w / 2 + (w * (i + 0.5)) / nf);
  p.bb(cap, 0.07, 0.05, w + 0.03, 0, h - 0.2, 0, 0.006);
  p.extX(cap, [[-w / 2, 0], [w / 2, 0], [w / 2 + 0.03, 0.06], [w / 2 + 0.03, 0.1], [w / 2 - 0.02, 0.1], [0, 0.06], [-w / 2 + 0.02, 0.1], [-w / 2 - 0.03, 0.1], [-w / 2 - 0.03, 0.06]], 0.04, 0.01, h - 0.15, 0, 0.004);
  p.bb(cap, 0.09, 0.05, w + 0.08, 0, h - 0.05, 0, 0.008);
});

// ============================================================ plants

export const pottedPalm = def('pottedPalm', [0.9, 0.9, 1.9], (p) => {
  p.lathe(M.brass, [[0, 0], [0.15, 0], [0.16, 0.03], [0.13, 0.06], [0.2, 0.2], [0.23, 0.34], [0.25, 0.37], [0.21, 0.37], [0.2, 0.33], [0, 0.33]], 0, 0, 0, 18);
  p.ag(AT.soil, G.lathe([[0, 0], [0.205, 0], [0.205, 0.01], [0, 0.012]], 12), 0, 0.32, 0);
  p.loft(M.rope, [[0, 0.33, 0], [0.01, 0.6, 0.01], [-0.01, 0.9, 0], [0, 1.18, -0.01]], [0.05, 0.045, 0.04, 0.035], 7);
  for (let i = 0; i < 4; i++) p.lathe(M.rope, [[0.04, 0], [0.056, 0.02], [0.04, 0.05]], 0, 0.45 + i * 0.18, 0, 6);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + (i % 2) * 0.3, f = p.add(G.frond(0.55 + (i % 3) * 0.07, 11, 0.28 - (i % 3) * 0.05, 0.5, i + 3), M.plant, 0, 1.12 + (i % 3) * 0.06, 0);
    f.rotation.set(0, a, 0.25 + (i % 3) * 0.12, 'YXZ');
  }
  for (let i = 0; i < 3; i++) { const f = p.add(G.frond(0.45, 8, 0.4, 0.1, i + 20), M.plant, 0, 1.18, 0); f.rotation.set(0, i * 2.1, 0.9, 'YXZ'); }
});

/** lattice screen with climbing ivy (Café Parisien / Verandah) */
export const trellis = def('trellis', (o) => [o.w ?? 2, 0.06, o.h ?? 2.4], (p, o) => {
  const w = o.w ?? 2, h = o.h ?? 2.4, r = rngOf(Math.round(w * 13 + h * 7));
  for (const s of [-1, 1]) p.bb(M.paintWhite, 0.05, h, 0.05, 0, 0, s * (w / 2 - 0.025), 0.006);
  p.bb(M.paintWhite, 0.05, 0.05, w, 0, h - 0.05, 0, 0.006); p.bb(M.paintWhite, 0.05, 0.08, w, 0, 0, 0, 0.006);
  const polys = [], step = 0.3, t = 0.012, lw = 0.022;
  const lath = (a, b, off) => { // thin bar between 2D points (z, y) in plane x = off
    const dz = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dz, dy), nz = (-dy / l) * lw / 2, ny = (dz / l) * lw / 2;
    const A = [off, a[1] + ny, a[0] + nz], B = [off, b[1] + ny, b[0] + nz], C = [off, b[1] - ny, b[0] - nz], D = [off, a[1] - ny, a[0] - nz];
    const f = (q, dx) => [q[0] + dx, q[1], q[2]];
    polys.push([f(A, t), f(B, t), f(C, t), f(D, t)], [f(D, -t), f(C, -t), f(B, -t), f(A, -t)], [f(A, -t), f(B, -t), f(B, t), f(A, t)], [f(C, -t), f(D, -t), f(D, t), f(C, t)]);
  };
  const z0 = -w / 2 + 0.05, z1 = w / 2 - 0.05, y0 = 0.08, y1 = h - 0.05;
  const clipSeg = (zs, ys, dir) => { // line z = zs + dir*(y - ys) clipped to the rect
    const pts = [];
    for (const y of [y0, y1]) { const z = zs + dir * (y - ys); if (z >= z0 && z <= z1) pts.push([z, y]); }
    for (const z of [z0, z1]) { const y = ys + (z - zs) / dir; if (y > y0 && y < y1) pts.push([z, y]); }
    return pts.length >= 2 ? [pts[0], pts[1]] : null;
  };
  for (let k = -Math.ceil(h / step); k <= Math.ceil(w / step) + Math.ceil(h / step); k++) {
    const s1 = clipSeg(z0 + k * step, y0, 1); if (s1) lath(s1[0], s1[1], 0.008);
    const s2 = clipSeg(z1 - k * step, y0, -1); if (s2) lath(s2[0], s2[1], -0.008);
  }
  p.add(G.polysGeo(polys), M.paintWhite);
  // ivy: a few vines with leaves on both faces
  const leaves = [];
  for (let v = 0; v < Math.max(2, Math.round(w * 1.5)); v++) {
    let z = z0 + r() * (z1 - z0), y = y0;
    while (y < y1 - 0.1) {
      y += 0.06 + r() * 0.05; z = Math.max(z0, Math.min(z1, z + (r() - 0.5) * 0.12));
      if (r() < 0.85) for (const sx of [-1, 1]) {
        const s = 0.035 + r() * 0.03, a = r() * 6.28, cx = sx * (0.03 + r() * 0.01), cz = z + Math.cos(a) * 0.03, cy = y + Math.sin(a) * 0.03;
        leaves.push([[cx, cy - s, cz], [cx + sx * 0.005, cy, cz + s * 0.9], [cx, cy + s * 0.9, cz]], [[cx, cy - s, cz], [cx, cy + s * 0.9, cz], [cx + sx * 0.005, cy, cz - s * 0.9]]);
      }
    }
  }
  if (leaves.length) p.add(G.polysGeo(leaves), K.ivy);
});

// ============================================================ lights

/** wall light – origin = mounting point on the wall, light points +x */
export const sconce = def('sconce', [0.2, 0.16, 0.3], (p, o) => {
  const m = o.plain ? M.brass : M.gold;
  p.latheX(m, [[0, 0], [0.06, 0], [0.065, 0.006], [0.03, 0.022], [0, 0.032]], 0, -0.06, 0, 10).scale.set(1, 1.5, 1);
  const arms = o.plain ? [0] : [-1, 1];
  for (const s of arms) {
    const z = s * 0.1;
    p.loft(m, [[0.02, -0.08, 0], [0.08, -0.12, z * 0.4], [0.13, -0.08, z * 0.85], [0.14, -0.02, z]], 0.009, 6);
    p.lathe(m, [[0, 0], [0.025, 0], [0.03, 0.015], [0, 0.03]], 0.14, -0.03, z, 8);
    p.lathe(M.lampGlow, [[0, 0], [0.018, 0], [0.04, 0.05], [0.045, 0.09], [0, 0.1]], 0.14, -0.005, z, 10);
  }
  if (!o.plain) p.lathe(m, [[0, 0], [0.015, 0], [0.02, -0.03], [0.008, -0.05], [0, -0.06]], 0.02, -0.1, 0, 8);
});

/** ceiling light – origin at the ceiling, hangs down. style: 'dome' | 'bowl' | 'bulkhead' | 'cut' | 'bare' */
export const ceilingLight = def('ceilingLight', [0.4, 0.4, 0.2], (p, o) => {
  const st = o.style ?? 'dome';
  if (st === 'bowl') { // gilt rose, three chains, cut-glass bowl in a gilt ring
    p.lathe(M.gold, ROSE(0.1), 0, 0, 0, 12);
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; p.loft(M.gold, [[Math.cos(a) * 0.05, -0.04, Math.sin(a) * 0.05], [Math.cos(a) * 0.19, -0.2, Math.sin(a) * 0.19]], 0.004, 4, false); }
    p.lathe(M.gold, [[0.2, -0.2], [0.21, -0.21], [0.2, -0.225], [0.19, -0.215], [0.2, -0.2]], 0, 0, 0, 20); // closed ring profile
    p.rev(K.cutGlass, [{ o: 0.02, y: -0.33, m: 0 }, { o: 0.1, y: -0.315, m: 0.006 }, { o: 0.16, y: -0.27, m: 0.008 }, { o: 0.192, y: -0.215, m: 0.004 }], { seg: 24, k: 12, capBottom: true, capTop: true }, 0, 0, 0);
    p.lathe(M.gold, [[0, 0], [0.022, 0], [0.02, -0.03], [0.008, -0.05], [0, -0.06]], 0, -0.32, 0, 8);
  } else if (st === 'bulkhead') {
    p.lathe(M.iron, [[0, 0], [0.12, 0], [0.12, -0.025], [0.08, -0.06], [0, -0.06]], 0, 0, 0, 10);
    p.lathe(M.lampGlow, [[0, -0.205], [0.05, -0.195], [0.085, -0.12], [0.075, -0.055]], 0, 0, 0, 10);
    for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); p.loft(M.iron, [[c * 0.085, -0.06, s * 0.085], [c * 0.098, -0.13, s * 0.098], [c * 0.05, -0.205, s * 0.05]], 0.006, 3, false); }
    p.t(M.iron, 0.096, 0.006, 0, -0.12, 0, 'y', 10, 3);
  } else if (st === 'cut') {
    p.bb(M.gold, 0.34, 0.025, 0.34, 0, -0.025, 0, 0.008);
    p.fr(K.cutGlass, 0.28, 0.28, 0.12, 0.12, 0.1, 0, -0.025, 0, { top: false }).rotation.x = Math.PI;
    p.bb(M.gold, 0.3, 0.012, 0.3, 0, -0.04, 0, 0.004);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; p.lathe(K.crystal, [[0, 0], [0.014, -0.012], [0, -0.04]], Math.cos(a) * 0.13, -0.04, Math.sin(a) * 0.13, 4); }
    p.lathe(K.crystal, [[0, 0], [0.025, -0.02], [0, -0.07]], 0, -0.13, 0, 6);
  } else if (st === 'bare') {
    p.lathe(M.brass, [[0, 0], [0.035, 0], [0.03, -0.02], [0.012, -0.03], [0.012, -0.08], [0.022, -0.085], [0.022, -0.11], [0, -0.11]], 0, 0, 0, 10);
    p.lathe(M.lampGlow, [[0, -0.11], [0.015, -0.11], [0.03, -0.14], [0.03, -0.17], [0.015, -0.195], [0, -0.2]], 0, 0, 0, 10);
  } else {
    p.lathe(M.brass, [[0, -0.03], [0.14, -0.025], [0.15, 0], [0, 0]], 0, 0, 0, 12);
    p.lathe(M.lampGlow, [[0, -0.15], [0.08, -0.135], [0.12, -0.09], [0.13, -0.025]], 0, 0, 0, 12);
    p.lathe(M.brass, [[0, -0.18], [0.016, -0.155], [0, -0.14]], 0, 0, 0, 5);
  }
});

/** moulded plaster ceiling rose (first class) – origin at the ceiling */
export const ceilingRose = def('ceilingRose', (o) => [2 * (o.r ?? 0.3), 2 * (o.r ?? 0.3), 0.04], (p, o) => {
  const r = o.r ?? 0.3;
  p.rev(M.plaster, [{ o: r * 0.3, y: -0.035, m: 0 }, { o: r * 0.65, y: -0.026, m: r * 0.05 }, { o: r, y: -0.006 }, { o: r, y: 0 }], { seg: 24, k: 8, capBottom: true }, 0, 0, 0);
  p.lathe(M.gold, [[0, -0.045], [r * 0.3, -0.04], [0, -0.03]], 0, 0, 0, 12);
});

/** chandelier – origin at the ceiling: gilt arms with glass shades, crystal drops and a cut-glass bowl */
export const chandelier = def('chandelier', [1.0, 1.0, 0.9], (p, o) => {
  const n = o.arms ?? 6;
  p.lathe(M.gold, ROSE(0.13), 0, 0, 0, 16);
  p.lathe(M.gold, [[0.012, -0.04], [0.012, -0.2], [0.03, -0.24], [0.012, -0.28], [0.012, -0.4], [0.035, -0.44], [0.02, -0.5], [0.06, -0.54], [0.09, -0.56], [0, -0.58]], 0, 0, 0, 12);
  p.rev(K.cutGlass, [{ o: 0.0, y: -0.78, m: 0 }, { o: 0.08, y: -0.75, m: 0.006 }, { o: 0.13, y: -0.68, m: 0.008 }, { o: 0.15, y: -0.6, m: 0.004 }], { seg: 24, k: 12, capBottom: true, capTop: true }, 0, 0, 0);
  p.lathe(M.gold, [[0.15, -0.6], [0.16, -0.59], [0.15, -0.58], [0.14, -0.585]], 0, 0, 0, 20);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, c = Math.cos(a), s = -Math.sin(a), R = 0.42;
    p.loft(M.gold, [[c * 0.08, -0.56, s * 0.08], [c * 0.22, -0.64, s * 0.22], [c * 0.34, -0.62, s * 0.34], [c * 0.41, -0.55, s * 0.41], [c * R, -0.5, s * R]], 0.011, 6);
    p.lathe(M.gold, [[0, 0], [0.035, 0], [0.04, 0.012], [0.015, 0.02], [0.012, 0.04], [0, 0.04]], c * R, -0.5, s * R, 10);
    p.lathe(M.lampGlow, [[0, 0], [0.022, 0], [0.055, 0.07], [0.058, 0.11], [0.04, 0.12], [0, 0.12]], c * R, -0.46, s * R, 12);
    for (let k = 0; k < 3; k++) p.lathe(K.crystal, [[0, 0], [0.012, -0.012], [0, -0.035]], c * (0.18 + k * 0.08), -0.66 - (k === 1 ? 0.02 : 0), s * (0.18 + k * 0.08), 4);
  }
  for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2; p.lathe(K.crystal, [[0, 0], [0.01, -0.01], [0, -0.03]], Math.cos(a) * 0.155, -0.6, -Math.sin(a) * 0.155, 4); }
  p.lathe(K.crystal, [[0, 0], [0.025, -0.025], [0, -0.09]], 0, -0.78, 0, 6);
});

/** glazed dome / laylight (grand staircase) – origin at the ceiling */
export const domeLight = def('domeLight', (o) => [2 * (o.r ?? 2.5), 2 * (o.r ?? 2.5), 0.3], (p, o) => {
  const r = o.r ?? 2.5;
  p.rev(M.lampGlow, [{ o: r * 0.98, y: -0.04 }, { o: r * 0.7, y: -0.02 }, { o: r * 0.35, y: 0.06 }, { o: 0.2, y: 0.1 }], { seg: 32, capTop: true }, 0, 0, 0).geometry.scale(1, 1, 1);
  p.t(M.gold, r, 0.06, 0, -0.05, 0, 'y', 48, 6); p.t(M.gold, r - 0.12, 0.025, 0, -0.07, 0, 'y', 48, 4);
  for (const f of [0.7, 0.35]) p.t(M.iron, r * f, 0.02, 0, f > 0.5 ? -0.04 : 0.04, 0, 'y', 40, 4);
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; p.loft(M.iron, [[Math.cos(a) * 0.2, 0.08, Math.sin(a) * 0.2], [Math.cos(a) * r * 0.35, 0.04, Math.sin(a) * r * 0.35], [Math.cos(a) * r * 0.7, -0.03, Math.sin(a) * r * 0.7], [Math.cos(a) * r, -0.06, Math.sin(a) * r]], 0.015, 4, false); }
  for (let i = 0; i < 16; i++) { const a = ((i + 0.5) / 16) * Math.PI * 2; p.lathe(M.gold, [[0, 0], [0.05, 0], [0.04, -0.03], [0, -0.04]], Math.cos(a) * (r - 0.05), -0.08, Math.sin(a) * (r - 0.05), 8); }
  p.lathe(M.gold, [[0, 0.1], [0.22, 0.1], [0.2, 0.04], [0.1, -0.02], [0.04, -0.1], [0, -0.14]], 0, 0, 0, 16);
});

export const tableLamp = def('tableLamp', [0.2, 0.2, 0.32], (p) => { tableLampOn(p, 0, 0, 0); });

/** Edwardian electric radiator with copper reflector and glowing elements */
export const heater = def('heater', [0.6, 0.2, 0.62], (p) => {
  for (const s of [-1, 1]) { p.b(M.iron, 0.18, 0.02, 0.06, 0, 0, s * 0.26); p.lathe(M.brass, [[0, 0], [0.012, 0], [0.012, 0.56], [0.02, 0.58], [0, 0.6]], -0.04, 0.02, s * 0.26, 6); }
  p.bb(M.iron, 0.05, 0.52, 0.5, -0.06, 0.06, 0, 0.012);
  const refl = p.rev(M.copper, [{ o: 0.25, y: 0.11 }, { o: 0.22, y: 0.07 }, { o: 0.15, y: 0.03 }, { o: 0.05, y: 0 }], { seg: 12, capTop: true }, -0.03, 0.34, 0);
  refl.rotation.z = -Math.PI / 2; refl.position.set(-0.035, 0.34, 0); refl.scale.set(1.05, 0.7, 1);
  for (let i = 0; i < 4; i++) p.cz(M.fire, 0.016, 0.34, 0.03, 0.2 + i * 0.09, 0, 6);
  for (const s of [-1, 1]) p.bb(M.chrome, 0.03, 0.34, 0.02, 0.025, 0.17, s * 0.18, 0.005);
  for (let i = 0; i < 7; i++) p.b(M.brass, 0.006, 0.42, 0.006, 0.085, 0.13, -0.18 + i * 0.06);
  p.b(M.brass, 0.01, 0.01, 0.4, 0.085, 0.13, 0); p.b(M.brass, 0.01, 0.01, 0.4, 0.085, 0.55, 0);
});

/** wall clock – origin = mounting point, faces +x */
export const clockWall = def('clockWall', [0.4, 0.08, 0.4], (p) => {
  const oct = []; for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; oct.push([Math.cos(a) * 0.205, Math.sin(a) * 0.205]); }
  p.extX(M.woodDark, oct, 0.04, 0.02, 0, 0, 0.006);
  p.t(M.brass, 0.165, 0.012, 0.045, 0, 0, 'x', 28, 6);
  p.cx(K.clockFace, 0.155, 0.006, 0.043, 0, 0, 28);
  p.latheX(M.glass, [[0, 0], [0.155, 0], [0.12, 0.012], [0, 0.016]], 0.045, 0, 0, 20);
});

/** wall mirror – origin = centre on the wall, faces +x */
export const mirrorWall = def('mirrorWall', (o) => [o.w ?? 0.8, 0.05, o.h ?? 1.1], (p, o) => {
  const w = o.w ?? 0.8, h = o.h ?? 1.1, f = matOf(o.frame, M.gold);
  p.b(M.woodDark, 0.015, h - 0.04, w - 0.04, 0.008, -h / 2 + 0.02, 0);
  for (const [sy, sz, y, z] of [[0.06, w, -h / 2, 0], [0.06, w, h / 2 - 0.06, 0], [h - 0.12, 0.06, -h / 2 + 0.06, -w / 2 + 0.03], [h - 0.12, 0.06, -h / 2 + 0.06, w / 2 - 0.03]]) p.bb(f, 0.035, sy, sz, 0.0175, y, z, 0.012);
  p.b(M.mirror, 0.006, h - 0.12, w - 0.12, 0.016, -h / 2 + 0.06, 0);
  for (const sy of [-1, 1]) for (const sz of [-1, 1]) p.t(f, 0.025, 0.007, 0.036, sy * (h / 2 - 0.03), sz * (w / 2 - 0.03), 'x', 10, 4);
  p.extX(f, [[-0.15, 0], [0.15, 0], [0.06, 0.05], [0, 0.09], [-0.06, 0.05]], 0.03, 0.017, h / 2, 0, 0.004);
});

/** framed oil painting (v = 0..3) – origin = centre on the wall, faces +x */
export const picture = def('picture', (o) => [o.w ?? 0.6, 0.05, o.h ?? 0.45], (p, o) => {
  const w = o.w ?? 0.6, h = o.h ?? 0.45, v = (o.v ?? 0) % 4, f = matOf(o.frame, M.gold);
  for (const [sy, sz, y, z] of [[0.05, w, -h / 2, 0], [0.05, w, h / 2 - 0.05, 0], [h - 0.1, 0.05, -h / 2 + 0.05, -w / 2 + 0.025], [h - 0.1, 0.05, -h / 2 + 0.05, w / 2 - 0.025]]) p.b(f, 0.035, sy, sz, 0.0175, y, z);
  p.b(M.woodDark, 0.012, h - 0.09, w - 0.09, 0.008, -h / 2 + 0.045, 0);
  const u0 = (v % 2) / 2, v0 = 0.5 - Math.floor(v / 2) / 2, cg = new THREE.PlaneGeometry(w - 0.09, h - 0.09);
  const uv = cg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * 0.5, v0 + uv.getY(i) * 0.5);
  p.add(cg, K.paintings, 0.02, 0, 0, 0, Math.PI / 2, 0);
  p.c(M.brass, 0.002, 0.25, 0.005, h / 2, 0, 4);
});

/** coat / hat hooks on a wall board with a coat and hat – origin = mounting point, faces +x */
export const coatHooks = def('coatHooks', (o) => [0.15 + 0.25 * (o.n ?? 3), 0.2, 0.5], (p, o) => {
  const n = o.n ?? 3, w = 0.15 + 0.25 * n, r = rngOf(n + (o.v ?? 0) * 7);
  p.bb(matOf(o.mat, M.mahogany), 0.025, 0.1, w, 0.0125, -0.05, 0, 0.006);
  for (let i = 0; i < n; i++) {
    const z = -w / 2 + 0.2 + i * 0.25;
    p.b(M.brass, 0.07, 0.012, 0.012, 0.06, -0.006, z); p.b(M.brass, 0.012, 0.04, 0.012, 0.09, 0.0, z);
    const k = r();
    if (k < 0.45) { p.ag([AT.coat, AT.navy, AT.greyCloth, AT.khaki][Math.floor(r() * 4)], G.pillow(0.12, 0.85, 0.42, 0.45, 0.35, 3, 8), 0.08, -0.9, z); }
    else if (k < 0.7) { p.ag(AT.hat, G.lathe([[0, 0], [0.13, 0], [0.085, 0.012], [0.08, 0.1], [0, 0.11]], 8), 0.11, 0.02, z); }
  }
});

/** hat box (round, striped paper) */
export const hatBox = def('hatBox', [0.42, 0.42, 0.32], (p, o) => {
  p.alathe(o.v % 2 ? AT.pink : AT.straw, [[0, 0], [0.19, 0], [0.19, 0.26], [0, 0.26]], 0, 0, 0, 18);
  p.alathe(AT.label, [[0, 0.24], [0.2, 0.24], [0.205, 0.3], [0, 0.3]], 0, 0, 0, 18);
  p.loft(M.leather, [[0, 0.3, -0.12], [0, 0.36, -0.06], [0, 0.37, 0], [0, 0.36, 0.06], [0, 0.3, 0.12]], 0.008, 5);
});

/** pair of slippers */
export const slippers = def('slippers', [0.3, 0.3, 0.08], (p, o) => {
  for (const s of [-1, 1]) { const m = p.ag(o.v % 2 ? AT.red : AT.navy, G.pillow(0.27, 0.07, 0.1, 0.5, 0.6, 3, 10, 0.02), 0, 0, s * 0.065); m.rotation.y = s * 0.12; }
});

/** framed notice (White Star regulations) – origin = centre on the wall/door, faces +x */
export const notice = def('notice', [0.3, 0.02, 0.4], (p) => {
  p.bb(M.woodDark, 0.015, 0.38, 0.28, 0.0075, -0.19, 0, 0.004);
  const g = new THREE.PlaneGeometry(0.24, 0.34); p.add(g, K.notice, 0.016, 0, 0, 0, Math.PI / 2, 0);
});

/** enamel direction sign (kind 0..3) – origin = centre on the wall, faces +x */
export const sign = def('sign', [0.5, 0.02, 0.14], (p, o) => {
  const k = (o.kind ?? 0) % 4, g = new THREE.BoxGeometry(0.008, 0.12, 0.48), uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i), 1 - (k + 1) / 4 + uv.getY(i) / 4);
  p.add(g, K.signs, 0.004, 0, 0);
});

/** wall-mounted fire hose reel cabinet – origin = mounting point (centre), faces +x */
export const fireHose = def('fireHose', [0.6, 0.18, 0.7], (p) => {
  p.bb(K.fireRed, 0.16, 0.7, 0.6, 0.08, -0.35, 0, 0.012);
  p.bb(M.brass, 0.012, 0.6, 0.5, 0.166, -0.3, 0, 0.004); p.b(M.glass, 0.006, 0.5, 0.4, 0.17, -0.25, 0);
  p.t(M.canvas, 0.17, 0.04, 0.09, 0, 0, 'x', 20, 6); p.t(M.canvas, 0.11, 0.035, 0.09, 0, 0, 'x', 16, 6);
  p.latheX(M.brass, [[0, 0], [0.02, 0], [0.012, 0.15], [0, 0.16]], 0.1, -0.25, 0.2, 8);
  p.latheZ(M.brass, [[0, 0], [0.05, 0], [0.05, 0.01], [0, 0.012]], 0.08, 0.0, -0.31, 12);
});

/** wall-mounted chemical fire extinguisher on a bracket – origin = mounting point, faces +x */
export const extinguisher = def('extinguisher', [0.25, 0.2, 0.7], (p) => {
  p.bb(M.iron, 0.02, 0.1, 0.14, 0.01, -0.06, 0, 0.004);
  p.lathe(K.fireRed, [[0, 0], [0.085, 0], [0.09, 0.03], [0.09, 0.5], [0.07, 0.56], [0, 0.57]], 0.11, -0.6, 0, 12);
  p.lathe(M.brass, [[0, 0], [0.05, 0], [0.04, 0.04], [0.02, 0.07], [0, 0.07]], 0.11, -0.03, 0, 10);
  p.loft(M.rubber, [[0.11, 0.0, 0.03], [0.17, -0.06, 0.06], [0.2, -0.25, 0.05]], 0.012, 6);
  p.t(M.iron, 0.095, 0.008, 0.11, -0.25, 0, 'y', 12, 3);
});

/** brass porthole (inner face): rim, glass, hinged-up deadlight, dogs – origin = centre on the lining, faces +x */
export const porthole = def('porthole', (o) => [2 * (o.r ?? 0.2) + 0.16, 0.08, 2 * (o.r ?? 0.2) + 0.5], (p, o) => {
  const r = o.r ?? 0.2;
  p.latheX(M.brass, [[r + 0.065, 0], [r + 0.07, 0.01], [r + 0.025, 0.03], [r, 0.04], [r, 0.0]], 0, 0, 0, 14);
  p.cx(K.portGlass, r, 0.006, 0.012, 0, 0, 14);
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; p.b(M.brass, 0.012, 0.012, 0.06, 0.045, Math.sin(a) * (r + 0.045) - 0.006, Math.cos(a) * (r + 0.045)).rotation.x = a; }
  // deadlight swung up against the lining, held by a hook
  p.latheX(M.brass, [[0, 0], [r + 0.04, 0], [r + 0.045, 0.012], [r + 0.02, 0.025], [0, 0.03]], 0.005, 2 * r + 0.09, 0, 12);
  p.bb(M.brass, 0.03, 0.05, 0.08, 0.02, r + 0.035, 0, 0.004);
  p.b(M.brass, 0.04, 0.012, 0.012, 0.02, 3 * r + 0.14, 0);
});

/** porthole curtain on a brass rod (tied back) – origin = porthole centre on the lining, faces +x */
export const portCurtain = def('portCurtain', (o) => [2 * (o.r ?? 0.2) + 0.4, 0.06, 0.7], (p, o) => {
  const r = o.r ?? 0.2, w = 2 * r + 0.34, c = matOf(o.mat, M.fabricGreen);
  p.cz(M.brass, 0.007, w, 0.05, r + 0.08, 0, 6);
  for (const s of [-1, 1]) { p.latheZ(M.brass, [[0, 0], [0.012, 0], [0.012, 0.012], [0, 0.015]], 0.05, r + 0.08, s * w / 2, 8, s); p.add(G.curtain(0.22, 2 * r + 0.25, 2, 0.012, 0.5, s * 0.05, 8, 4), c, 0.05, r + 0.07, s * (r + 0.1)); }
});

// ============================================================ piano, lift

export const piano = def('piano', (o) => (o.grand ? [1.5, 2.1, 1.05] : [1.5, 0.66, 1.3]), (p, o) => {
  const m = matOf(o.mat, M.woodDark);
  if (o.grand) {
    // plan outline of the case (x from +1.05 keyboard end to −1.05 tail), z −0.72..0.72
    const out = [[0.75, 0.72], [-0.2, 0.72], [-0.6, 0.55], [-0.85, 0.3], [-1.0, 0.0], [-1.03, -0.25], [-0.98, -0.5], [-0.85, -0.65], [-0.6, -0.72], [0.75, -0.72]];
    p.extY(m, out.map(([x, z]) => [x, -z]), 0.28, 0, 0.66, 0, 0.01);
    p.extY(m, out.map(([x, z]) => [x * 0.98, -z * 0.98]), 0.02, 0, 0.94, 0, 0.004);
    p.bb(m, 0.3, 0.2, 1.48, 0.9, 0.62, 0, 0.01);
    p.b(K.keys, 0.15, 0.012, 1.26, 0.92, 0.82, 0); p.bb(m, 0.06, 0.06, 1.3, 0.82, 0.82, 0, 0.008);
    for (const s of [-1, 1]) p.bb(m, 0.32, 0.12, 0.08, 0.9, 0.78, s * 0.7, 0.01);
    const lg = G.extrude(out.map(([x, z]) => [x, -(z - 0.72)]), 0.018, 0.004); lg.rotateX(-Math.PI / 2);
    p.add(lg, m, 0, 0.97, 0.72, 0.55, 0, 0);
    p.c(m, 0.012, 0.62, -0.3, 0.94, -0.55, 6).rotation.x = 0.25;
    p.extX(m, [[-0.3, 0], [0.3, 0], [0.3, 0.2], [-0.3, 0.2]], 0.015, 0.68, 0.95, 0, 0.003).rotation.z = 0.25;
    p.ab(AT.paper, 0.01, 0.24, 0.36, 0.69, 0.98, 0).rotation.z = 0.25;
    for (const [x, z] of [[0.8, -0.6], [0.8, 0.6], [-0.85, -0.3]]) p.lathe(m, [[0, 0], [0.045, 0], [0.05, 0.03], [0.07, 0.08], [0.05, 0.3], [0.06, 0.45], [0.075, 0.6], [0.08, 0.66], [0, 0.66]], x, 0, z, 10);
    p.extX(m, [[-0.08, 0], [0.08, 0], [0.05, 0.55], [-0.05, 0.55]], 0.04, 0.6, 0.1, 0, 0.004);
    for (let i = -1; i <= 1; i++) p.bb(M.brass, 0.08, 0.012, 0.02, 0.64, 0.06, i * 0.04, 0.003);
    return;
  }
  // upright
  p.bb(m, 0.34, 1.26, 1.5, -0.16, 0, 0, 0.01); p.bb(m, 0.36, 0.04, 1.54, -0.15, 1.26, 0, 0.012);
  for (let i = 0; i < 3; i++) p.fp(m, 0.42, 0.42, 0.012, 0.5 + 0.24, -0.47 + i * 0.47, 0.008, 0.035);
  p.bb(m, 0.3, 0.06, 1.5, 0.17, 0.66, 0, 0.008);
  p.b(K.keys, 0.14, 0.012, 1.26, 0.2, 0.72, 0); p.bb(m, 0.04, 0.05, 1.3, 0.28, 0.69, 0, 0.006);
  for (const s of [-1, 1]) { p.bb(m, 0.3, 0.14, 0.08, 0.17, 0.66, s * 0.71, 0.01); p.lathe(m, [[0, 0], [0.04, 0], [0.04, 0.06], [0.03, 0.2], [0.045, 0.4], [0.03, 0.6], [0, 0.6]], 0.28, 0.06, s * 0.66, 8); p.bb(m, 0.36, 0.06, 0.1, 0.12, 0, s * 0.66, 0.008); }
  p.bb(m, 0.03, 0.3, 1.0, 0.02, 0.8, 0, 0.006);
  p.extX(m, [[-0.4, 0], [0.4, 0], [0.4, 0.04], [-0.4, 0.04]], 0.02, 0.06, 0.95, 0, 0.003).rotation.z = 0.15;
  p.ab(AT.paper, 0.006, 0.26, 0.38, 0.07, 0.97, -0.1).rotation.z = 0.15; p.ab(AT.paper, 0.006, 0.26, 0.38, 0.072, 0.97, 0.22).rotation.z = 0.15;
  for (const s of [-1, 1]) { p.loft(M.brass, [[0.02, 1.0, s * 0.62], [0.1, 0.96, s * 0.64], [0.14, 1.0, s * 0.64]], 0.008, 5); p.lathe(M.brass, [[0, 0], [0.025, 0], [0.012, 0.02], [0, 0.025]], 0.14, 1.0, s * 0.64, 8); p.lathe(M.paintCream, [[0, 0], [0.01, 0], [0.01, 0.12], [0, 0.13]], 0.14, 1.02, s * 0.64, 6); }
  for (let i = -1; i <= 1; i++) p.bb(M.brass, 0.08, 0.012, 0.02, 0.2, 0.05, i * 0.05, 0.003);
});

/** electric lift car (1st class): panelled mahogany, upholstered seat, gilt gate */
export const liftCage = def('liftCage', [1.6, 1.6, 2.4], (p) => {
  p.b(M.mahogany, 1.6, 0.06, 1.6); p.bb(M.mahogany, 1.6, 0.08, 1.6, 0, 2.3, 0, 0.01);
  p.bb(M.mahogany, 0.04, 2.24, 1.6, -0.78, 0.06, 0, 0.006);
  for (const s of [-1, 1]) p.bb(M.mahogany, 1.6, 2.24, 0.04, 0, 0.06, s * 0.78, 0.006);
  for (let i = 0; i < 3; i++) { p.fp(M.mahogany, 0.42, 0.9, -0.76, 1.3, -0.5 + i * 0.5, 0.01, 0.04).rotation.y = 0; for (const s of [-1, 1]) { const f = p.fp(M.mahogany, 0.42, 0.9, 0, 1.3, 0, 0.01, 0.04); f.position.set(-0.5 + i * 0.5, 1.3, s * 0.76); f.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2; } }
  for (const s of [-1, 1]) p.bb(M.gold, 1.5, 0.02, 0.01, 0, 0.9, s * 0.758, 0.003);
  p.bb(M.mahogany, 0.4, 0.42, 1.2, -0.56, 0.06, 0, 0.01); p.pil(M.fabricRed, 0.38, 0.1, 1.16, -0.55, 0.48, 0, 0.35, 0.2, 3, 14);
  p.pil(M.fabricRed, 0.08, 0.5, 1.1, -0.72, 0.6, 0, 0.5, 0.25, 3, 12);
  // gilt folding gate
  for (let i = 0; i <= 8; i++) p.b(M.gold, 0.015, 2.16, 0.015, 0.78, 0.08, -0.74 + i * 0.09);
  for (const y of [0.15, 1.05, 2.16]) p.b(M.gold, 0.02, 0.02, 0.75, 0.78, y, -0.38);
  for (let i = 0; i < 4; i++) p.t(M.gold, 0.06, 0.007, 0.78, 1.6, -0.65 + i * 0.18, 'x', 12, 3);
  p.lathe(M.gold, [[0, 0], [0.18, 0], [0.16, -0.03], [0, -0.04]], 0, 2.3, 0, 16); p.lathe(M.lampGlow, [[0.15, -0.03], [0.14, -0.08], [0.08, -0.12], [0, -0.13]], 0, 2.3, 0, 16);
  p.cz(M.brass, 0.015, 1.4, -0.72, 0.95, 0, 8);
});

// ============================================================ luggage / cargo

function trunkAt(p, w, d, h, x, y, z, m, r) {
  p.bb(m, d, h, w, x, y, z, 0.02);
  for (const s of [-1, 1]) p.b(M.woodDark, d + 0.012, 0.03, 0.035, x, y + h * 0.45, z + s * w * 0.3);
  for (const s of [-1, 1]) { p.bb(M.woodDark, d + 0.014, h + 0.012, 0.04, x, y - 0.006, z + s * w * 0.18, 0.008); }
  p.bb(M.woodDark, d + 0.012, 0.035, w + 0.012, x, y + h * 0.7, z, 0.008);
  for (const s of [-1, 1]) { p.bb(M.leather, d + 0.02, h + 0.02, 0.05, x, y - 0.01, z + s * w * 0.38, 0.006); p.b(M.brass, 0.01, 0.05, 0.06, x + d / 2 + 0.01, y + h * 0.75, z + s * w * 0.38); }
  for (const sx of [-1, 1]) for (const sy of [0, 1]) for (const sz of [-1, 1]) p.b(M.brass, 0.05, 0.05, 0.05, x + sx * (d / 2 - 0.02), y + sy * (h - 0.05), z + sz * (w / 2 - 0.02));
  p.b(M.brass, 0.012, 0.08, 0.1, x + d / 2 + 0.006, y + h * 0.6, z);
  for (const s of [-1, 1]) p.loft(M.leather, [[x, y + h * 0.55, z + s * (w / 2 + 0.002)], [x, y + h * 0.6, z + s * (w / 2 + 0.03)], [x + 0.06, y + h * 0.6, z + s * (w / 2 + 0.03)], [x + 0.06, y + h * 0.55, z + s * (w / 2 + 0.002)]], 0.012, 4);
  if (r) for (let i = 0; i < 2; i++) { const l = p.ab([AT.label, AT.labelRed, AT.labelBlue, AT.yellow][Math.floor(r() * 4)], 0.003, 0.08 + r() * 0.05, 0.1 + r() * 0.05, x + d / 2 + 0.012, y + 0.1 + r() * (h - 0.3), z - w * 0.1 + r() * w * 0.25); l.rotation.x = (r() - 0.5) * 0.6; }
}
function suitcaseAt(p, x, y, z, m, cell = null, rot = 0) {
  const g = p.add(G.roundBox(0.2, 0.42, 0.62, 0.025, 1), m, x, y + 0.21, z); g.rotation.y = rot;
  const hz = Math.cos(rot), hx = -Math.sin(rot); void hz; void hx;
  p.loft(M.leather, [[x, y + 0.42, z - 0.07], [x, y + 0.47, z - 0.05], [x, y + 0.47, z + 0.05], [x, y + 0.42, z + 0.07]], 0.01, 4);
  for (const s of [-1, 1]) p.b(M.brass, 0.21, 0.025, 0.03, x, y + 0.36, z + s * 0.2);
  if (cell !== null) p.ab(cell, 0.004, 0.08, 0.12, x + 0.101, y + 0.15, z + 0.1);
}

export const trunk = def('trunk', (o) => (o.big ? [1.05, 0.6, 0.65] : [0.85, 0.5, 0.5]), (p, o) => {
  const [w, d, h] = o.big ? [1.05, 0.6, 0.65] : [0.85, 0.5, 0.5];
  trunkAt(p, w - 0.02, d - 0.03, h, 0, 0, 0, matOf(o.mat, M.leather), rngOf(o.big ? 3 : 4));
});
export const suitcase = def('suitcase', [0.62, 0.2, 0.42], (p, o) => { suitcaseAt(p, 0, 0, 0, matOf(o.mat, M.leather), AT.label); });
export const luggagePile = def('luggagePile', [1.3, 1.0, 1.1], (p, o) => {
  const v = o.v ?? 0, r = rngOf(v + 11);
  trunkAt(p, 0.95, 0.56, 0.55, -0.17, 0, -0.12, M.leather, r);
  const t2 = new PBProxy(p, 0.15); trunkAt(t2, 0.75, 0.46, 0.4, -0.12, 0.55, -0.08, v % 2 ? M.woodDark : M.fabricGreen, r); t2.done();
  suitcaseAt(p, 0.33, 0, 0.3, M.leather, AT.labelRed, 0);
  suitcaseAt(p, 0.33, 0, -0.32, v % 3 ? M.fabricRed : M.leather, AT.label, 0);
  if (v % 3) { p.alathe(v % 2 ? AT.pink : AT.straw, [[0, 0], [0.17, 0], [0.17, 0.22], [0, 0.22]], -0.12, 0.95, 0.05, 14); p.alathe(AT.label, [[0, 0.2], [0.18, 0.2], [0.18, 0.26], [0, 0.26]], -0.12, 0.95, 0.05, 14); }
});
/** helper: rotate everything added to p after construction around the y axis at (0, 0) */
class PBProxy {
  constructor(p, rot) { this.p = p; this.rot = rot; this.n0 = p.g.children.length; }
  done() { const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.rot); for (let i = this.n0; i < this.p.g.children.length; i++) { const c = this.p.g.children[i]; c.position.applyQuaternion(q); c.quaternion.premultiply(q); } }
}
for (const name of ['b', 'bb', 'c', 'cx', 'cz', 's', 't', 'lathe', 'latheX', 'latheZ', 'pil', 'fr', 'fp', 'loft', 'tube', 'extX', 'extZ', 'extY', 'rev', 'ab', 'alathe', 'ag', 'add']) PBProxy.prototype[name] = function (...a) { return this.p[name](...a); };

/** planked shipping crate with stencilling */
function crateAt(p, s, x, y, z, rot = 0, mat = M.pine) {
  const q = p;
  q.b(mat, s - 0.04, s - 0.04, s - 0.04, x, y + 0.02, z);
  for (const [sx, sz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const g = new THREE.PlaneGeometry(s - 0.1, s - 0.1); const m = q.add(g, K.stencil, x + sx * (s / 2 - 0.018), y + s / 2, z + sz * (s / 2 - 0.018)); m.rotation.y = sx ? (sx > 0 ? Math.PI / 2 : -Math.PI / 2) : (sz > 0 ? 0 : Math.PI);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) q.b(M.oak, 0.06, s, 0.06, x + sx * (s / 2 - 0.03), y, z + sz * (s / 2 - 0.03));
  for (const yy of [0, s - 0.06]) { for (const sx of [-1, 1]) q.b(M.oak, 0.05, 0.06, s - 0.06, x + sx * (s / 2 - 0.025), y + yy, z); for (const sz of [-1, 1]) q.b(M.oak, s - 0.06, 0.06, 0.05, x, y + yy, z + sz * (s / 2 - 0.025)); }
  void rot;
}
export const crate = def('crate', (o) => { const s = o.s ?? 0.8; return [s, s, s]; }, (p, o) => { crateAt(p, o.s ?? 0.8, 0, 0, 0); });
export const crateStack = def('crateStack', [1.9, 1.7, 1.8], (p, o) => {
  const v = o.v ?? 0;
  crateAt(p, 0.9, -0.38, 0, -0.48); crateAt(p, 0.8, -0.4, 0, 0.45);
  const q = new PBProxy(p, 0.2); crateAt(q, 0.7, 0.45, 0, -0.5); q.done();
  const q2 = new PBProxy(p, v % 2 ? 0.2 : -0.1); crateAt(q2, 0.75, -0.38, 0.9, -0.45, 0, M.oak); q2.done();
  if (v % 3) crateAt(p, 0.6, -0.4, 0.8, 0.45);
});
/** staved barrel with iron hoops */
export const barrel = def('barrel', [0.64, 0.64, 0.9], (p, o) => {
  const m = matOf(o.mat, M.oak);
  p.rev(m, [{ o: 0.25, y: 0, m: 0.003 }, { o: 0.28, y: 0.15, m: 0.004 }, { o: 0.31, y: 0.45, m: 0.004 }, { o: 0.28, y: 0.75, m: 0.004 }, { o: 0.25, y: 0.9, m: 0.003 }], { seg: 24, wave: (pt, i) => (i % 2 ? -1 : 1) }, 0, 0, 0);
  p.lathe(m, [[0.25, 0.9], [0.235, 0.9], [0.235, 0.88], [0, 0.88]], 0, 0, 0, 16);
  for (const [y, r] of [[0.06, 0.258], [0.2, 0.285], [0.7, 0.285], [0.84, 0.258]]) p.lathe(M.iron, [[r - 0.002, y], [r + 0.008, y + 0.02], [r - 0.002, y + 0.04]], 0, 0, 0, 16);
  for (let i = -2; i <= 2; i++) p.b(m, 0.46, 0.004, 0.003, 0, 0.881, i * 0.08);
  p.c(M.woodDark, 0.025, 0.01, 0.1, 0.88, 0.05, 8);
});
export const sack = def('sack', [0.75, 0.5, 0.32], (p, o) => {
  const m = matOf(o.mat, M.canvas);
  p.pil(m, 0.48, 0.3, 0.62, 0, 0, -0.04, 0.55, 0.45, 4, 12, 0.03);
  p.loft(m, [[0, 0.1, 0.24], [0, 0.11, 0.3], [0.01, 0.1, 0.35]], [0.08, 0.04, 0.05], 8);
  p.t(M.rope, 0.04, 0.008, 0, 0.11, 0.3, 'z', 10, 4);
});
export const sackPile = def('sackPile', [1.5, 1.1, 0.85], (p, o) => {
  const m = matOf(o.mat, M.canvas);
  for (const [x, y, z, r] of [[-0.25, 0, -0.4, 0.2], [-0.25, 0, 0.38, -0.3], [0.28, 0, 0, 1.4], [-0.2, 0.28, 0, 0.5], [0.15, 0.27, 0.3, 1.0], [0, 0.52, 0.1, 0.2]]) {
    p.pil(m, 0.5, 0.3, 0.75, x, y, z, 0.55, 0.45, 4, 12, 0.03).rotation.y = r;
  }
});
export const coalPile = def('coalPile', (o) => [o.w ?? 3, o.d ?? 2, o.h ?? 1.2], (p, o) => {
  const w = o.w ?? 3, d = o.d ?? 2, h = o.h ?? 1.2;
  p.add(G.heap(w, d, h, Math.max(6, Math.round(d * 6)), Math.max(8, Math.round(w * 6))), M.coal, 0, 0, 0);
  const r = rngOf(Math.round(w * 10 + d));
  for (let i = 0; i < 10; i++) p.bb(M.coal, 0.1 + r() * 0.08, 0.07, 0.12 + r() * 0.08, (r() - 0.5) * d * 0.9, 0, (r() - 0.5) * w * 0.9, 0.02).rotation.y = r() * 3;
});
export const wheelbarrow = def('wheelbarrow', [0.62, 1.4, 0.62], (p) => {
  const tray = p.rev(M.iron, [{ o: -0.04, y: 0 }, { o: 0, y: 0.02 }, { o: 0.06, y: 0.26 }, { o: 0.07, y: 0.28 }, { o: 0.05, y: 0.28 }, { o: -0.005, y: 0.04 }], { perim: G.rectLoop(0.5, 0.44, 0.06, 2), capTop: true }, 0.1, 0.3, 0);
  tray.rotation.z = 0.08;
  p.add(G.heap(0.46, 0.5, 0.12, 5, 6), M.coal, 0.1, 0.56, 0);
  p.t(M.iron, 0.18, 0.025, 0.55, 0.2, 0, 'z', 18, 6); p.cz(M.iron, 0.03, 0.08, 0.55, 0.2, 0, 8);
  for (let i = 0; i < 6; i++) { const s = p.b(M.iron, 0.012, 0.34, 0.012, 0.55, 0.03, 0); s.rotation.z = (i * Math.PI) / 6; s.position.set(0.55, 0.2, 0); }
  for (const s of [-1, 1]) { p.loft(M.oak, [[0.55, 0.2, s * 0.06], [0.2, 0.3, s * 0.22], [-0.3, 0.42, s * 0.27], [-0.65, 0.5, s * 0.27]], 0.022, 6); p.b(M.iron, 0.04, 0.3, 0.04, -0.25, 0, s * 0.25); }
});

// ============================================================ galley / pantry / bar

export const range = def('range', (o) => [o.w ?? 2.4, 0.95, 1.95], (p, o) => {
  const w = o.w ?? 2.4, n = Math.max(1, Math.round(w / 0.8));
  p.b(M.iron, 0.86, 0.08, w, -0.02, 0, 0);
  p.bb(M.iron, 0.86, 0.77, w, -0.02, 0.08, 0, 0.012);
  p.bb(M.steelDark, 0.95, 0.04, w + 0.04, 0, 0.85, 0, 0.01);
  for (let i = 0; i < n; i++) for (let k = 0; k < 2; k++) p.t(M.iron, 0.12, 0.012, -0.12 + k * 0.28, 0.89, -w / 2 + (w / n) * (i + 0.5), 'y', 16, 4);
  p.bb(M.iron, 0.06, 0.5, w, -0.42, 0.89, 0, 0.008);
  for (let i = 0; i < n; i++) {
    const z = -w / 2 + (w / n) * (i + 0.5), dw = w / n - 0.14;
    p.bb(M.steelDark, 0.02, 0.4, dw, 0.44, 0.32, z, 0.006);
    p.fp(M.steelDark, dw - 0.08, 0.32, 0.45, 0.52, z, 0.006, 0.03);
    p.cz(M.brass, 0.012, dw - 0.16, 0.48, 0.66, z, 8);
    for (const s of [-1, 1]) p.b(M.brass, 0.02, 0.05, 0.03, 0.455, 0.36, z + s * (dw / 2 - 0.06));
    p.bb(M.iron, 0.02, 0.12, dw, 0.44, 0.12, z, 0.004); p.b(M.fire, 0.006, 0.02, dw * 0.6, 0.452, 0.15, z);
    const k = i % 3;
    if (k === 0) { p.lathe(M.copper, [[0, 0], [0.16, 0], [0.17, 0.02], [0.17, 0.22], [0.18, 0.23], [0.165, 0.23], [0.16, 0.03], [0, 0.03]], -0.1, 0.89, z, 16); p.lathe(M.copper, [[0, 0.23], [0.17, 0.23], [0.12, 0.27], [0.02, 0.28], [0.02, 0.31], [0, 0.31]], -0.1, 0.89, z, 14); }
    else if (k === 1) { p.lathe(M.steelDark, [[0, 0], [0.13, 0], [0.13, 0.12], [0, 0.12]], -0.1, 0.89, z - 0.1, 14); p.cz(M.iron, 0.012, 0.25, -0.1, 0.97, z + 0.15, 6); }
    else { p.lathe(M.copper, [[0, 0], [0.12, 0], [0.13, 0.09], [0.11, 0.12], [0.04, 0.16], [0.03, 0.19], [0, 0.19]], -0.1, 0.89, z, 12); p.loft(M.copper, [[0.02, 0.95, z], [0.12, 1.0, z], [0.16, 1.05, z]], 0.012, 5); }
  }
  p.cz(M.brass, 0.016, w, 0.5, 0.8, 0, 8);
  for (const s of [-1, 1]) p.loft(M.brass, [[0.4, 0.8, s * (w / 2 - 0.02)], [0.46, 0.8, s * (w / 2 - 0.02)], [0.5, 0.8, s * (w / 2 - 0.02)]], 0.016, 6);
  // hood and flue
  p.fr(M.steel, 0.95, w + 0.1, 0.5, w * 0.6, 0.3, 0, 1.5, 0, { bottom: false }).position.x = -0.1;
  p.bb(M.steel, 0.95, 0.06, w + 0.1, 0, 1.47, 0, 0.01);
  p.c(M.steel, 0.16, 0.25, -0.15, 1.7, 0, 12);
  for (let i = 0; i < 4; i++) p.loft(M.iron, [[0.3, 1.45, -w / 2 + 0.2 + i * (w - 0.4) / 3], [0.3, 1.32, -w / 2 + 0.2 + i * (w - 0.4) / 3]], 0.006, 4);
  for (let i = 0; i < 4; i++) p.lathe(M.copper, [[0, 0], [0.08, 0], [0.09, 0.1], [0.085, 0.1], [0, 0.01]], 0.3, 1.15, -w / 2 + 0.2 + i * (w - 0.4) / 3, 12);
});
export const oven = def('oven', (o) => [o.w ?? 1.4, 1.0, 2.0], (p, o) => {
  const w = o.w ?? 1.4;
  p.b(M.brick, 1.0, 2.0, w);
  p.bb(M.iron, 1.04, 0.06, w + 0.04, 0, 1.4, 0, 0.01);
  for (const [y, h] of [[0.55, 0.4], [0.12, 0.3]]) {
    p.bb(M.iron, 0.04, h, w * 0.62, 0.5, y, 0, 0.008); p.fp(M.iron, w * 0.55, h - 0.08, 0.52, y + h / 2, 0, 0.006, 0.03);
    p.cz(M.brass, 0.014, w * 0.4, 0.56, y + h - 0.06, 0, 8);
    for (const s of [-1, 1]) p.c(M.iron, 0.02, h - 0.08, 0.52, y + 0.04, s * w * 0.31, 8);
  }
  p.b(M.fire, 0.01, 0.04, w * 0.4, 0.52, 0.2, 0);
  p.latheX(K.gaugeFace, [[0, 0], [0.06, 0], [0.06, 0.02], [0, 0.02]], 0.5, 1.2, w * 0.35, 14);
});
export const servingCounter = def('servingCounter', (o) => [o.w ?? 2, o.d ?? 0.7, 0.93], (p, o) => {
  const w = o.w ?? 2, d = o.d ?? 0.7, m = matOf(o.mat, M.paintWhite);
  p.b(M.woodDark, d - 0.04, 0.08, w - 0.04, -0.02, 0, 0);
  p.bb(m, d, 0.8, w, 0, 0.08, 0, 0.008);
  p.bb(matOf(o.top, M.steelDark), d + 0.05, 0.045, w + 0.05, 0, 0.88, 0, 0.01);
  const n = Math.max(1, Math.round(w / 0.7));
  for (let i = 0; i < n; i++) { const z = -w / 2 + (w / n) * (i + 0.5); cabDoor(p, m, w / n - 0.08, 0.6, d / 2 + 0.022, 0.14, z, { knobAt: (w / n) * 0.3 }); }
  if (o.items) {
    for (let i = 0; i < n; i++) {
      const z = -w / 2 + (w / n) * (i + 0.5);
      if (i % 2) p.lathe(M.chrome, [[0, 0], [0.16, 0], [0.14, 0.06], [0.08, 0.11], [0.02, 0.13], [0.025, 0.15], [0, 0.155]], 0, 0.925, z, 12);
      else p.lathe(M.porcelain, [[0, 0], [0.06, 0], [0.11, 0.01], [0.112, 0.1], [0.1, 0.1], [0.06, 0.096], [0, 0.096]], 0, 0.925, z, 14);
    }
  }
});
export const kettle = def('kettle', [0.85, 0.85, 1.05], (p) => {
  for (let i = 0; i < 3; i++) { const a = i * 2.094; p.lathe(M.iron, [[0, 0], [0.04, 0], [0.03, 0.05], [0.025, 0.32], [0, 0.33]], Math.cos(a) * 0.32, 0, Math.sin(a) * 0.32, 8); }
  p.lathe(M.copper, [[0, 0.28], [0.25, 0.3], [0.37, 0.4], [0.4, 0.55], [0.4, 0.86], [0.42, 0.88], [0.4, 0.9], [0.38, 0.9], [0, 0.6]], 0, 0, 0, 24);
  p.lathe(M.copper, [[0, 0.9], [0.39, 0.9], [0.3, 0.95], [0.1, 0.99], [0.04, 1.0], [0, 1.0]], 0, 0, 0, 20);
  p.lathe(M.brass, [[0, 0], [0.04, 0], [0.03, 0.04], [0, 0.05]], 0, 1.0, 0, 10);
  p.loft(M.brass, [[-0.42, 0.75, -0.12], [-0.48, 0.8, 0], [-0.42, 0.75, 0.12]], 0.015, 6);
  p.latheX(M.brass, [[0, 0], [0.04, 0], [0.03, 0.15], [0.04, 0.17], [0, 0.18]], 0.38, 0.35, 0, 10);
  p.t(M.iron, 0.07, 0.01, 0.58, 0.35, 0, 'x', 12, 4);
});
export const butcherBlock = def('butcherBlock', [0.8, 0.8, 0.86], (p) => {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.bb(M.oak, 0.09, 0.56, 0.09, sx * 0.3, 0, sz * 0.3, 0.01);
  p.b(M.oak, 0.62, 0.03, 0.62, 0, 0.12, 0);
  p.bb(M.oak, 0.8, 0.3, 0.8, 0, 0.56, 0, 0.03);
  for (let i = -3; i <= 3; i++) p.b(M.woodDark, 0.8, 0.002, 0.004, 0, 0.86, i * 0.1);
  p.bb(M.chrome, 0.28, 0.006, 0.12, 0.1, 0.862, 0.15, 0.002).rotation.y = 0.3; p.bb(M.woodDark, 0.12, 0.025, 0.03, 0.27, 0.862, 0.2, 0.008).rotation.y = 0.3;
});
export const barCounter = def('barCounter', (o) => [o.w ?? 3, 0.65, 1.12], (p, o) => {
  const w = o.w ?? 3, m = matOf(o.mat, M.mahogany);
  p.b(M.woodDark, 0.5, 0.1, w - 0.04, -0.02, 0, 0);
  p.bb(m, 0.55, 0.95, w, 0, 0.1, 0, 0.01);
  const n = Math.max(2, Math.round(w / 0.6));
  for (let i = 0; i < n; i++) { const z = -w / 2 + (w / n) * (i + 0.5); p.fp(m, w / n - 0.12, 0.62, 0.275, 0.55, z, 0.01, 0.045); }
  for (let i = 0; i <= n; i++) p.bb(m, 0.04, 0.82, 0.05, 0.285, 0.14, -w / 2 + (w / n) * i, 0.008);
  p.bb(M.woodDark, 0.72, 0.06, w + 0.06, 0.02, 1.05, 0, 0.02);
  p.cz(M.brass, 0.022, w, 0.38, 0.18, 0, 10);
  const nb = Math.max(2, Math.round(w / 1.0));
  for (let i = 0; i <= nb; i++) { const z = -w / 2 + 0.1 + ((w - 0.2) * i) / nb; p.loft(M.brass, [[0.27, 0.3, z], [0.33, 0.24, z], [0.38, 0.18, z]], 0.012, 6); }
  for (let i = 0; i < 3; i++) { const z = -w * 0.3 + i * 0.12; p.lathe(M.porcelain, [[0, 0], [0.04, 0], [0.035, 0.08], [0.03, 0.1], [0, 0.1]], -0.15, 1.11, z, 10); p.lathe(M.woodDark, [[0, 0], [0.015, 0], [0.012, 0.2], [0.02, 0.24], [0, 0.26]], -0.15, 1.21, z, 8); }
  for (let i = 0; i < 4; i++) p.lathe(M.glass, SHAPES.TUMBLER, 0.1, 1.11, w * 0.1 + i * 0.1, 8);
});
export const backBar = def('backBar', (o) => [o.w ?? 3, 0.4, 2.1], (p, o) => {
  const w = o.w ?? 3, m = matOf(o.mat, M.mahogany), r = rngOf(Math.round(w * 10));
  p.bb(m, 0.4, 0.92, w, 0, 0, 0, 0.01);
  const n = Math.max(2, Math.round(w / 0.6));
  for (let i = 0; i < n; i++) { const z = -w / 2 + (w / n) * (i + 0.5); if (i % 2) cabDoor(p, m, w / n - 0.06, 0.6, 0.2 + 0.022, 0.08, z, { knobAt: 0 }); else { drawer(p, m, w / n - 0.06, 0.16, 0.222, 0.78, z, 2, false); cabDoor(p, m, w / n - 0.06, 0.6, 0.222, 0.08, z, { knobAt: 0 }); } }
  p.bb(M.marble, 0.42, 0.03, w + 0.02, 0, 0.92, 0, 0.008);
  p.bb(m, 0.06, 1.1, w, -0.17, 0.95, 0, 0.008); p.b(M.mirror, 0.006, 0.8, w - 0.3, -0.137, 1.05, 0);
  for (const y of [1.3, 1.62]) {
    p.bb(m, 0.18, 0.025, w - 0.1, -0.06, y, 0, 0.006);
    for (let z = -w / 2 + 0.12; z < w / 2 - 0.1; z += 0.09 + r() * 0.04) { const c = [AT.bottleGreen, AT.amber, AT.claret, AT.clearGlass, AT.smoke][Math.floor(r() * 5)]; const tall = r() < 0.6; p.alathe(c, tall ? [[0, 0], [0.035, 0], [0.036, 0.2], [0.012, 0.26], [0.011, 0.31], [0, 0.31]] : [[0, 0], [0.045, 0], [0.045, 0.14], [0.02, 0.18], [0.014, 0.22], [0, 0.22]], -0.06, y + 0.025, z, 7); p.ab(AT.label, 0.002, 0.06, 0.04, -0.06 + (tall ? 0.036 : 0.045), y + 0.07, z); }
  }
  for (let i = 0; i < 6; i++) p.lathe(M.glass, [[0, 0], [0.03, 0], [0.006, 0.01], [0.005, 0.06], [0.03, 0.08], [0.035, 0.12], [0.026, 0.09], [0, 0.078]], 0.08, 0.95, -w / 2 + 0.2 + i * 0.1, 6);
  p.bb(m, 0.32, 0.06, w + 0.06, -0.04, 2.0, 0, 0.012); p.bb(m, 0.36, 0.04, w + 0.1, -0.03, 2.06, 0, 0.012);
  for (const s of [-1, 1]) p.bb(m, 0.2, 1.1, 0.06, -0.1, 0.95, s * (w / 2 - 0.03), 0.008);
});

// ============================================================ small "life" items (props)

/** two cork life jackets lying flat (on top of wardrobes, on shelves) */
export const lifeJacket = def('lifeJacket', [0.6, 0.4, 0.2], (p, o) => { lifeJackets(p, 0, 0, 0, o.n ?? 2, 'z'); });
/** water carafe with two tumblers on a brass tray */
export const carafe = def('carafe', [0.2, 0.2, 0.25], (p) => {
  p.lathe(M.brass, [[0, 0], [0.09, 0], [0.095, 0.008], [0.088, 0.008], [0, 0.004]], 0, 0, 0, 14);
  p.lathe(M.glass, SHAPES.CARAFE, 0, 0.006, -0.02, 10);
  for (const s of [-1, 1]) p.lathe(M.glass, SHAPES.TUMBLER.map(([r, h]) => [r * 0.85, h * 0.9]), s * 0.035, 0.006, 0.05, 8);
});
/** pile of books (lying) */
export const bookPile = def('bookPile', [0.3, 0.25, 0.15], (p, o) => {
  const r = rngOf((o.v ?? 0) + 5); let y = 0;
  for (let i = 0; i < 3 + ((o.v ?? 0) % 3); i++) { const h = 0.025 + r() * 0.02; const b = p.ab(Math.floor(r() * 16), 0.18 + r() * 0.05, h, 0.24 + r() * 0.04, 0, y, 0, true); b.rotation.y = (r() - 0.5) * 0.4; y += h; }
});
/** folded towels */
export const towels = def('towels', [0.3, 0.25, 0.12], (p, o) => { for (let i = 0; i < (o.n ?? 2); i++) p.bb(M.linen, 0.22, 0.045, 0.28, (i % 2) * 0.01, i * 0.045, 0, 0.015); });
/** a newspaper on a surface */
export const newspaper = def('newspaper', [0.45, 0.35, 0.02], (p) => { p.ab(AT.paper, 0.32, 0.006, 0.42, 0, 0, 0); p.ab(AT.greyCloth, 0.3, 0.004, 0.4, 0.01, 0.006, 0.01).rotation.y = 0.08; });
