// Interior kit – gymnasium, wireless / bridge, machinery, pipes, pool, squash court. Front of every prop faces +x.
import * as THREE from 'three';
import { mats as M } from '../core/materials.js';
import { DECK_Y } from '../core/constants.js';
import { kitMats as K, matOf, Batch, AT } from './batch.js';
import * as G from './geom.js';
import { def, cached, drawer, papers } from './props-core.js';

const GAUGE = (r) => [[0, 0], [r, 0], [r * 1.05, 0.01], [r, 0.03], [r * 0.92, 0.035], [0, 0.035]];
/** dial instrument facing +x at (x, y, z): brass case, dial face, glass */
function dial(p, x, y, z, r = 0.09, face = K.gaugeFace) {
  p.latheX(M.brass, GAUGE(r), x, y, z, 20);
  p.cx(face, r * 0.88, 0.004, x + 0.036, y, z, 20);
  p.latheX(M.glass, [[0, 0], [r * 0.9, 0], [r * 0.6, 0.008], [0, 0.01]], x + 0.036, y, z, 16);
}

// ============================================================ gymnasium

export const rowingMachine = def('rowingMachine', [0.6, 2.0, 0.7], (p) => {
  p.bb(M.oak, 1.9, 0.06, 0.16, 0, 0.12, 0, 0.01);
  for (const x of [-0.88, 0.88]) p.bb(M.iron, 0.07, 0.12, 0.56, x, 0, 0, 0.01);
  for (const s of [-1, 1]) p.b(M.chrome, 1.6, 0.012, 0.012, -0.05, 0.18, s * 0.06);
  p.bb(M.oak, 0.3, 0.04, 0.3, -0.35, 0.21, 0, 0.012); p.pil(M.leather, 0.3, 0.04, 0.28, -0.35, 0.25, 0, 0.4, 0.3, 3, 10);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.cz(M.iron, 0.02, 0.02, -0.35 + sx * 0.1, 0.2, sz * 0.09, 8);
  const fb = p.bb(M.oak, 0.04, 0.26, 0.42, 0.78, 0.16, 0, 0.008); fb.rotation.z = 0.5;
  for (const s of [-1, 1]) p.bb(M.leather, 0.06, 0.03, 0.12, 0.74, 0.3, s * 0.1, 0.008).rotation.z = 0.5;
  p.bb(M.iron, 0.08, 0.04, 0.6, 0.42, 0.14, 0, 0.006); // outrigger carrying the two oar cylinders
  for (const s of [-1, 1]) {
    p.lathe(M.iron, [[0, 0], [0.05, 0], [0.05, 0.12], [0.03, 0.15], [0, 0.16]], 0.42, 0.18, s * 0.24, 10);
    p.loft(M.iron, [[0.42, 0.34, s * 0.24], [0.25, 0.48, s * 0.26], [0.05, 0.6, s * 0.28]], 0.014, 6);
    p.lathe(M.oak, [[0, 0], [0.018, 0], [0.018, 0.12], [0, 0.13]], 0.05, 0.6, s * 0.28, 8).rotation.x = s * Math.PI / 2;
  }
});
function ridingMachine(p, camel) {
  p.bb(M.paintGreen, 1.1, 0.1, 0.5, 0, 0, 0, 0.015);
  p.bb(M.paintGreen, 0.5, 0.4, 0.4, -0.2, 0.1, 0, 0.02);
  p.fp(M.paintGreen, 0.3, 0.26, -0.2, 0.3, 0.2, 0.006, 0.03).rotation.y = -Math.PI / 2;
  p.latheX(K.gaugeFace, [[0, 0], [0.06, 0], [0.06, 0.012], [0, 0.012]], 0.05, 0.32, 0, 16);
  p.lathe(M.chrome, [[0, 0], [0.06, 0], [0.05, 0.05], [0.04, 0.4], [0.06, 0.45], [0, 0.46]], 0.05, 0.1, 0, 12);
  p.bb(M.leather, 0.7, 0.18, 0.34, 0.05, 0.56, 0, 0.06);
  const saddle = p.pil(M.leather, 0.5, 0.14, 0.34, 0.0, 0.72, 0, 0.6, 0.5, 4, 14, -0.04); void saddle;
  for (const s of [-1, 1]) { p.tube(M.leather, [[0.05, 0.78, s * 0.17], [0.06, 0.6, s * 0.2], [0.06, 0.42, s * 0.22]], 0.008, 6, 3); p.t(M.chrome, 0.05, 0.008, 0.06, 0.4, s * 0.22, 'z', 10, 3); }
  if (camel) {
    p.pil(M.leather, 0.34, 0.26, 0.3, -0.15, 0.76, 0, 0.8, 0.6, 5, 12);
    p.loft(M.leather, [[0.35, 0.68, 0], [0.48, 0.92, 0], [0.52, 1.18, 0], [0.6, 1.3, 0], [0.68, 1.3, 0]], [0.08, 0.07, 0.06, 0.06, 0.05], 8);
  } else {
    p.loft(M.leather, [[0.35, 0.68, 0], [0.45, 0.95, 0], [0.5, 1.12, 0], [0.62, 1.18, 0], [0.7, 1.12, 0]], [[0.1, 0.07], [0.09, 0.06], [0.08, 0.055], [0.07, 0.05], [0.05, 0.04]], 8);
    for (const s of [-1, 1]) p.lathe(M.leather, [[0, 0], [0.02, 0], [0.012, 0.06], [0, 0.07]], 0.5, 1.2, s * 0.03, 6);
  }
  for (const s of [-1, 1]) p.tube(M.leather, [[0.62, 1.12, s * 0.04], [0.4, 0.95, s * 0.12], [0.2, 0.9, s * 0.14]], 0.005, 6, 3);
}
export const electricHorse = def('electricHorse', [0.55, 1.2, 1.4], (p) => ridingMachine(p, false));
export const electricCamel = def('electricCamel', [0.55, 1.2, 1.5], (p) => ridingMachine(p, true));
export const cycleMachine = def('cycleMachine', [0.55, 1.4, 1.5], (p) => {
  p.bb(M.iron, 1.3, 0.05, 0.5, 0, 0, 0, 0.01);
  p.t(M.iron, 0.3, 0.03, 0.3, 0.42, 0, 'z', 28, 6); p.cz(M.iron, 0.04, 0.08, 0.3, 0.42, 0, 10);
  for (let i = 0; i < 6; i++) { const s = p.b(M.iron, 0.012, 0.58, 0.012, 0.3, 0.13, 0); s.rotation.z = (i * Math.PI) / 6; s.position.set(0.3, 0.42, 0); }
  p.loft(M.iron, [[-0.32, 0.05, 0], [-0.3, 0.5, 0], [-0.3, 0.86, 0]], 0.022, 8);
  p.loft(M.iron, [[0.3, 0.42, 0], [0.0, 0.42, 0], [-0.3, 0.5, 0]], 0.02, 8);
  p.loft(M.iron, [[0.35, 0.05, 0], [0.36, 0.6, 0], [0.35, 1.02, 0]], 0.022, 8);
  p.pil(M.leather, 0.28, 0.07, 0.2, -0.32, 0.855, 0, 0.6, 0.5, 3, 10, 0.02); // saddle on the seat post
  p.loft(M.chrome, [[0.35, 1.04, -0.25], [0.32, 1.06, 0], [0.35, 1.04, 0.25]], 0.012, 6);
  for (const s of [-1, 1]) { p.lathe(M.rubber, [[0, 0], [0.018, 0], [0.018, 0.1], [0, 0.1]], 0.35, 1.04, s * 0.25, 8).rotation.x = s * Math.PI / 2; }
  p.cz(M.iron, 0.04, 0.1, -0.05, 0.36, 0, 10);
  // opposed cranks (one line through the axle), pedals on the crank ends
  const cd = [-Math.sin(0.8) * 0.075, Math.cos(0.8) * 0.075];
  for (const s of [-1, 1]) { const c = p.b(M.iron, 0.03, 0.18, 0.015, -0.05, 0.27, s * 0.07); c.rotation.z = 0.8; p.cz(M.iron, 0.008, 0.04, -0.05 + s * cd[0], 0.36 + s * cd[1], s * 0.09, 6); p.bb(M.rubber, 0.1, 0.02, 0.06, -0.05 + s * cd[0], 0.35 + s * cd[1], s * 0.13, 0.006); }
  p.c(M.iron, 0.015, 1.2, 0.62, 0.05, 0, 6); // dial column standing on the base plate
  dial(p, 0.6, 1.25, 0, 0.17); p.lathe(M.paintWhite, [[0, 0], [0.19, 0], [0.19, 0.02], [0, 0.02]], 0.6, 1.25, 0, 24).rotation.z = -Math.PI / 2;
});
export const punchBag = def('punchBag', (o) => [0.4, 0.4, o.h ?? 2.4], (p, o) => {
  const h = o.h ?? 2.4;
  p.lathe(M.oak, [[0, 0], [0.22, 0], [0.22, 0.04], [0, 0.04]], 0, h - 0.04, 0, 16);
  p.lathe(M.iron, [[0, 0], [0.03, 0], [0.02, 0.04], [0, 0.05]], 0, h - 0.09, 0, 8);
  for (let i = 0; i < 6; i++) p.t(M.iron, 0.015, 0.003, 0, h - 0.12 - i * 0.04, 0, i % 2 ? 'x' : 'z', 8, 3);
  p.lathe(M.leather, [[0, 0], [0.08, 0.02], [0.15, 0.12], [0.17, 0.3], [0.15, 0.48], [0.08, 0.56], [0.02, 0.58], [0, 0.6]], 0, h - 0.95, 0, 16);
});

// ============================================================ wireless / bridge

export const marconiSet = def('marconiSet', [1.8, 0.75, 1.55], (p) => {
  p.bb(M.oak, 0.75, 0.04, 1.8, 0, 0.72, 0, 0.012);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) p.bb(M.oak, 0.06, 0.72, 0.06, sx * 0.32, 0, sz * 0.84, 0.008);
  for (const s of [-1, 1]) { p.b(M.oak, 0.62, 0.15, 0.56, 0.02, 0.57, s * 0.5); drawer(p, M.oak, 0.5, 0.12, 0.35, 0.64, s * 0.5, 1, false); } // drawer boxes under the top
  // slate panel with knife switches and meters
  p.bb(K.slate, 0.04, 0.68, 1.4, -0.34, 0.76, 0, 0.006);
  for (let i = 0; i < 3; i++) { const z = -0.45 + i * 0.45; dial(p, -0.32, 1.28, z, 0.07); for (const s of [-1, 1]) { p.b(M.copper, 0.02, 0.04, 0.03, -0.31, 0.98, z + s * 0.05); const k = p.b(M.copper, 0.012, 0.16, 0.012, -0.29, 1.0, z + s * 0.05); k.rotation.z = -0.4; } p.latheX(K.ebony, [[0, 0], [0.012, 0], [0.012, 0.03], [0, 0.035]], -0.32, 1.14, z, 6); } // knob on the slate
  // magnetic detector (wooden box with brass wheels), tuner with coils, key, headphones
  p.bb(M.woodDark, 0.28, 0.2, 0.4, -0.12, 0.76, -0.6, 0.008);
  for (const s of [-1, 1]) { p.latheZ(M.brass, [[0, 0], [0.07, 0], [0.075, 0.01], [0.07, 0.02], [0, 0.02]], -0.12, 0.98, -0.6 + s * 0.12, 18); p.cz(M.copper, 0.03, 0.12, -0.12, 0.98, -0.6 + s * 0.06, 10); }
  p.bb(M.woodDark, 0.3, 0.18, 0.5, -0.15, 0.76, 0.05, 0.008);
  for (const s of [-1, 1]) { p.cz(M.copper, 0.06, 0.18, -0.15, 1.0, 0.05 + s * 0.13, 16); p.cz(K.ebony, 0.063, 0.01, -0.15, 1.0, 0.05 + s * 0.13 + 0.09, 16); } // tuning coils resting on the tuner box
  for (let i = 0; i < 4; i++) { p.lathe(K.ebony, [[0, 0], [0.02, 0], [0.02, 0.015], [0, 0.02]], 0.02, 0.94, -0.1 + i * 0.1, 10); }
  p.bb(M.woodDark, 0.16, 0.025, 0.1, 0.22, 0.76, 0.32, 0.005); p.b(M.brass, 0.14, 0.01, 0.02, 0.22, 0.8, 0.32).rotation.z = 0.05; p.lathe(K.ebony, [[0, 0], [0.018, 0], [0.02, 0.012], [0, 0.02]], 0.28, 0.81, 0.32, 10);
  for (const s of [-1, 1]) p.latheX(K.ebony, [[0, 0], [0.04, 0], [0.04, 0.025], [0, 0.03]], 0.12, 0.79, 0.62 + s * 0.08, 12).rotation.set(0, 0, Math.PI / 2);
  p.tube(M.chrome, [[0.12, 0.8, 0.54], [0.12, 0.88, 0.62], [0.12, 0.8, 0.7]], 0.004, 8, 3);
  papers(p, 0.15, 0.76, -0.15, 0.1, 2); p.cz(M.oak, 0.004, 0.15, 0.15, 0.768, 0.05, 6); // pencil lying on the papers
  // clock above (in front of the slate panel, not half inside it)
  p.cx(K.clockFace, 0.11, 0.01, -0.31, 1.48, 0.55, 20); p.t(M.woodDark, 0.115, 0.012, -0.305, 1.48, 0.55, 'x', 20, 4);
  p.b(M.glass, 0.12, 0.2, 0.12, 0.0, 0.76, -0.25); p.c(M.chrome, 0.01, 0.16, 0.0, 0.78, -0.25, 6); // spark gap
});
export const telegraph = def('telegraph', [0.5, 0.45, 1.3], (p) => {
  p.lathe(M.brass, [[0, 0], [0.17, 0], [0.17, 0.03], [0.12, 0.06], [0.08, 0.1], [0.065, 0.2], [0.055, 0.8], [0.07, 0.86], [0.09, 0.9], [0, 0.9]], 0, 0, 0, 16);
  p.rev(M.brass, [{ o: 0.06, y: 0.25, m: 0.004 }, { o: 0.056, y: 0.75, m: 0.004 }], { seg: 32, k: 16 }, 0, 0, 0);
  p.cz(M.brass, 0.21, 0.18, 0, 1.1, 0, 28);
  for (const s of [-1, 1]) {
    p.cz(K.gaugeFace, 0.18, 0.004, 0, 1.1, s * 0.091, 28); p.t(M.brass, 0.19, 0.012, 0, 1.1, s * 0.09, 'z', 28, 4);
    p.latheZ(M.glass, [[0, 0], [0.18, 0], [0.1, 0.02], [0, 0.025]], 0, 1.1, s * 0.093, 20, s);
    const h = p.b(M.brass, 0.03, 0.4, 0.02, 0.08, 0.95, s * 0.115); h.rotation.z = -0.45;
    p.lathe(K.ebony, [[0, 0], [0.025, 0], [0.03, 0.04], [0.02, 0.09], [0, 0.1]], 0.18, 1.3, s * 0.115, 10).rotation.z = -0.45;
  }
  p.lathe(M.brass, [[0, 0], [0.06, 0], [0.05, 0.04], [0, 0.06]], 0, 1.31, 0, 12);
});
export const shipsWheel = def('shipsWheel', [1.25, 0.5, 1.6], (p) => {
  // telemotor pedestal (brass) on a teak plinth, wheel facing +x
  p.bb(M.oak, 0.5, 0.08, 0.5, -0.1, 0, 0, 0.01);
  p.lathe(M.brass, [[0, 0], [0.16, 0], [0.16, 0.03], [0.11, 0.08], [0.09, 0.4], [0.11, 0.7], [0.13, 0.8], [0.1, 0.84], [0.13, 0.9], [0.14, 1.02], [0.1, 1.06], [0, 1.06]], -0.1, 0.08, 0, 18);
  p.lathe(M.glass, [[0, 0], [0.11, 0], [0.11, 0.03], [0, 0.04]], -0.1, 1.14, 0, 16);
  p.cx(M.brass, 0.05, 0.25, 0.04, 0.98, 0, 12);
  const wx = 0.16, wy = 0.98;
  p.t(M.woodDark, 0.42, 0.026, wx, wy, 0, 'x', 40, 7); p.t(M.brass, 0.4, 0.008, wx + 0.02, wy, 0, 'x', 40, 4);
  p.latheX(M.brass, [[0, 0], [0.09, 0], [0.1, 0.02], [0.08, 0.06], [0.05, 0.08], [0, 0.09]], wx - 0.04, wy, 0, 18);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    const sp = p.lathe(M.woodDark, [[0, 0], [0.02, 0], [0.014, 0.1], [0.022, 0.2], [0.015, 0.3], [0.02, 0.4], [0.014, 0.42], [0.03, 0.47], [0.032, 0.53], [0.02, 0.6], [0, 0.62]], wx, wy, 0, 8);
    sp.rotation.x = -a; void c; void s;
  }
});
export const binnacle = def('binnacle', [0.6, 0.5, 1.4], (p) => {
  p.lathe(M.woodDark, [[0, 0], [0.24, 0], [0.24, 0.05], [0.18, 0.1], [0.14, 0.2], [0.13, 0.8], [0.17, 0.92], [0.18, 0.98], [0, 0.98]], 0, 0, 0, 16);
  p.lathe(M.brass, [[0, 0.98], [0.19, 0.98], [0.19, 1.08], [0.18, 1.16], [0.14, 1.24], [0.06, 1.3], [0.06, 1.34], [0.02, 1.38], [0, 1.4]], 0, 0, 0, 18);
  p.b(M.glass, 0.02, 0.1, 0.16, 0.18, 1.08, 0);
  for (const s of [-1, 1]) { p.b(M.brass, 0.06, 0.03, 0.18, 0, 1.0, s * 0.27); p.s(M.iron, 0.09, 0, 1.1, s * 0.3, 1, 1, 1, false); }
  p.lathe(M.iron, [[0, 0], [0.05, 0], [0.05, 0.5], [0, 0.5]], -0.21, 0.4, 0, 10);
  p.lathe(M.lampGlow, [[0, 0], [0.03, 0], [0.03, 0.06], [0, 0.07]], 0.0, 1.34, 0, 8);
});

// ============================================================ machinery

export const switchboard = def('switchboard', (o) => [o.w ?? 3, 0.4, 2.3], (p, o) => {
  const w = o.w ?? 3, n = Math.max(1, Math.round(w / 0.75)), pw = (w - 0.08) / n;
  p.bb(M.iron, 0.12, 0.1, w, -0.12, 0, 0, 0.01);
  for (let i = 0; i <= n; i++) p.bb(M.iron, 0.1, 2.3, 0.06, -0.12, 0, -w / 2 + 0.03 + i * pw, 0.01);
  p.bb(M.iron, 0.1, 0.08, w, -0.12, 2.22, 0, 0.01);
  for (let i = 0; i < n; i++) {
    const z = -w / 2 + 0.04 + pw * (i + 0.5);
    p.bb(K.slate, 0.04, 1.9, pw - 0.04, -0.1, 0.25, z, 0.004);
    dial(p, -0.08, 1.85, z - pw * 0.22, 0.08); dial(p, -0.08, 1.85, z + pw * 0.22, 0.08);
    for (let k = 0; k < 3; k++) {
      const y = 1.45 - k * 0.3;
      for (const s of [-1, 1]) { p.b(M.copper, 0.03, 0.05, 0.025, -0.065, y - 0.12, z + s * 0.05); p.b(M.copper, 0.03, 0.05, 0.025, -0.065, y + 0.06, z + s * 0.05); const blade = p.b(M.copper, 0.012, 0.2, 0.012, -0.04, y - 0.1, z + s * 0.05); blade.rotation.z = k === 1 ? 0.6 : 0; }
      p.cz(K.ebony, 0.012, 0.14, -0.02, y + 0.08, z, 6);
    }
    p.latheX(M.brass, [[0, 0], [0.012, 0], [0.012, 0.04], [0, 0.04]], -0.08, 0.5, z, 6); p.t(M.brass, 0.07, 0.008, -0.03, 0.5, z, 'x', 16, 4);
    for (let k = 0; k < 4; k++) p.b(M.brass, 0.008, 0.008, 0.18, -0.025, 0.5, z).rotation.x = (k * Math.PI) / 4;
  }
  p.cz(M.brass, 0.018, w, 0.15, 0.95, 0, 8);
  for (const s of [-1, 1]) p.lathe(M.brass, [[0, 0], [0.025, 0], [0.018, 0.02], [0.018, 0.93], [0, 0.95]], 0.15, 0, s * (w / 2 - 0.05), 8);
});
export const ladder = def('ladder', (o) => [0.5, 0.12, o.h ?? 2.6], (p, o) => {
  const h = o.h ?? 2.6;
  for (const s of [-1, 1]) { p.bb(M.iron, 0.06, h, 0.016, 0, 0, s * 0.23, 0.004); p.loft(M.iron, [[0, h - 0.02, s * 0.23], [0.05, h + 0.08, s * 0.23], [0.15, h + 0.12, s * 0.23]], 0.012, 5); }
  for (let y = 0.3; y < h - 0.1; y += 0.3) p.cz(M.iron, 0.012, 0.46, 0, y, 0, 6);
});
/** free-standing watertight door in its frame (door plate raised, gearing above); purely decorative */
export const watertightDoor = def('watertightDoor', (o) => [(o.w ?? 1.0) + 0.3, 0.2, (o.h ?? 1.9) + 0.2], (p, o) => {
  const w = o.w ?? 1.0, h = o.h ?? 1.9;
  for (const s of [-1, 1]) { p.bb(M.steelDark, 0.2, h + 0.15, 0.12, 0, 0, s * (w / 2 + 0.06), 0.012); for (let y = 0.15; y < h; y += 0.2) p.s(M.steelDark, 0.012, 0.1, y, s * (w / 2 + 0.06), 1, 1, 1); }
  p.bb(M.steelDark, 0.2, 0.12, w + 0.24, 0, h, 0, 0.012); p.bb(M.steelDark, 0.2, 0.1, w, 0, 0, 0, 0.01);
  if (o.closed) {
    p.bb(M.steel, 0.05, h, w, 0.08, 0.1, 0, 0.01);
    for (let i = 0; i < 4; i++) p.b(M.steelDark, 0.03, 0.04, w - 0.1, 0.11, 0.3 + i * 0.45, 0);
    for (const s of [-1, 1]) for (const y of [0.4, h - 0.3]) { p.bb(M.iron, 0.05, 0.08, 0.12, 0.12, y, s * (w / 2 - 0.02), 0.008); }
    p.t(M.brass, 0.12, 0.015, 0.14, h / 2, 0, 'x', 16, 4);
  }
  p.cz(M.steelDark, 0.03, w + 0.3, 0.06, h + 0.2, 0, 8);
  p.cx(M.steelDark, 0.08, 0.06, 0.08, h + 0.2, w / 2 + 0.05, 16);
});
export const valve = def('valve', (o) => [0.3, 0.3, 0.3], (p, o) => {
  const r = o.r ?? 0.12;
  p.lathe(M.iron, [[0, 0], [0.045, 0], [0.045, 0.02], [0.03, 0.03], [0.035, 0.08], [0.02, 0.1], [0.012, 0.2], [0, 0.2]], 0, 0, 0, 10);
  p.t(matOf(o.mat, M.rust), r, 0.012, 0, 0.2, 0, 'y', 20, 5);
  for (let i = 0; i < 4; i++) { const s = p.b(matOf(o.mat, M.rust), 2 * r - 0.02, 0.012, 0.014, 0, 0.194, 0); s.rotation.y = (i * Math.PI) / 4; }
  p.lathe(M.brass, [[0, 0], [0.022, 0], [0.018, 0.02], [0, 0.025]], 0, 0.2, 0, 8);
});
/** round gauge – origin = centre on the wall, dial faces +x */
export const gauge = def('gauge', [0.3, 0.08, 0.3], (p, o) => {
  const r = o.r ?? 0.12;
  dial(p, 0, 0, 0, r);
  p.lathe(M.brass, [[0, 0], [0.012, 0], [0.012, 0.08], [0.02, 0.09], [0, 0.1]], 0.02, -r - 0.09, 0, 8);
});
export const tankV = def('tankV', (o) => { const d = 2 * (o.r ?? 0.6); return [d, d, o.h ?? 2]; }, (p, o) => {
  const r = o.r ?? 0.6, h = o.h ?? 2, m = matOf(o.mat, M.steel);
  p.lathe(m, [[0, 0], [r, 0], [r, h - 0.2], [r * 0.85, h - 0.1], [r * 0.5, h - 0.03], [0, h]], 0, 0, 0, 24);
  for (const y of [0.25, h * 0.5, h - 0.28]) p.lathe(M.steelDark, [[r, y], [r + 0.012, y + 0.01], [r + 0.012, y + 0.05], [r, y + 0.06]], 0, 0, 0, 24);
  p.latheX(M.steelDark, [[0, 0], [0.2, 0], [0.2, 0.04], [0.16, 0.06], [0, 0.06]], r - 0.02, h * 0.35, 0, 16);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; p.c(M.iron, 0.012, 0.03, r + 0.04, h * 0.35 + Math.sin(a) * 0.17, Math.cos(a) * 0.17, 6).rotation.z = Math.PI / 2; }
  // gauge glass beside the shell (at z = r/2 the shell surface is at x = 0.866 r), two brass cocks into the shell
  const gx = r * 0.866 + 0.045;
  p.c(M.glass, 0.015, h * 0.5, gx, h * 0.25, r * 0.5, 8);
  for (const y of [h * 0.25 - 0.02, h * 0.75 - 0.02]) { p.c(M.brass, 0.02, 0.04, gx, y, r * 0.5, 8); p.b(M.brass, 0.07, 0.025, 0.025, gx - 0.035, y + 0.008, r * 0.5); }
  p.lathe(M.steelDark, [[0, 0], [0.08, 0], [0.08, 0.1], [0.12, 0.1], [0.12, 0.13], [0, 0.13]], 0, h - 0.04, 0, 12);
});
export const tankH = def('tankH', (o) => [o.l ?? 2.4, 2 * (o.r ?? 0.6), 2 * (o.r ?? 0.6) + 0.3], (p, o) => {
  const r = o.r ?? 0.6, l = o.l ?? 2.4, m = matOf(o.mat, M.steel);
  const body = p.lathe(m, [[0, -l / 2], [r * 0.5, -l / 2 + 0.03], [r * 0.85, -l / 2 + 0.1], [r, -l / 2 + 0.2], [r, l / 2 - 0.2], [r * 0.85, l / 2 - 0.1], [r * 0.5, l / 2 - 0.03], [0, l / 2]], 0, r + 0.3, 0, 24);
  body.rotation.x = Math.PI / 2;
  for (const z of [-l * 0.3, 0, l * 0.3]) { const b = p.lathe(M.steelDark, [[r, 0], [r + 0.012, 0.01], [r + 0.012, 0.05], [r, 0.06]], 0, r + 0.3, z, 24); b.rotation.x = Math.PI / 2; }
  for (const s of [-1, 1]) { p.extX(M.iron, [[-r * 0.8, 0], [r * 0.8, 0], [r * 0.8, 0.05], [r * 0.5, 0.3], [-r * 0.5, 0.3], [-r * 0.8, 0.05]].map(([a, b]) => [a, b]), 0.12, 0, 0, s * l * 0.3, 0.005).rotation.y = Math.PI / 2; }
  p.lathe(M.steelDark, [[0, 0], [0.1, 0], [0.1, 0.12], [0.15, 0.12], [0.15, 0.15], [0, 0.15]], 0, 2 * r + 0.25, l * 0.2, 12);
  p.lathe(M.brass, [[0, 0], [0.012, 0], [0.012, 0.14], [0, 0.15]], 0, 2 * r + 0.28, -l * 0.25, 6); dial(p, 0.0, 2 * r + 0.5, -l * 0.25, 0.07);
});
/** generic machine: kind 'pump' | 'dynamo' | 'engine' | 'box' */
export const machineBlock = def('machineBlock', (o) => [o.w ?? 1.6, o.d ?? 1.0, o.h ?? 1.4], (p, o) => {
  const w = o.w ?? 1.6, d = o.d ?? 1.0, h = o.h ?? 1.4, kind = o.kind ?? 'box', body = matOf(o.mat, M.paintGrey);
  p.bb(M.iron, d, 0.15, w, 0, 0, 0, 0.02);
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) p.lathe(M.steelDark, [[0, 0], [0.025, 0], [0.025, 0.02], [0.012, 0.02], [0.012, 0.05], [0, 0.05]], sx * (d / 2 - 0.06), 0.15, -w / 2 + 0.1 + (i * (w - 0.2)) / 2, 6);
  if (kind === 'dynamo') {
    const R = h * 0.36, cy = 0.15 + h * 0.4;
    p.latheZ(body, [[0, 0], [R * 0.6, 0], [R, 0.06], [R, w * 0.45 - 0.06], [R * 0.6, w * 0.45], [0, w * 0.45]], 0, cy, w * 0.15 - w * 0.225, 24);
    for (let i = 0; i < 3; i++) p.latheZ(M.steelDark, [[R, 0], [R + 0.015, 0.01], [R + 0.015, 0.05], [R, 0.06]], 0, cy, w * 0.15 - w * 0.2 + i * w * 0.15, 24);
    // commutator against the end of the field frame, shaft through to the flywheel (fits inside the footprint)
    p.cz(M.copper, h * 0.2, w * 0.2, 0, cy, -w * 0.175, 16);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; p.b(M.iron, 0.008, 0.012, w * 0.2, Math.cos(a) * h * 0.2, cy + Math.sin(a) * h * 0.2 - 0.006, -w * 0.175); }
    const FR = Math.min(h * 0.42, d / 2 - 0.05);
    p.cz(M.steelDark, 0.045, w * 0.2, 0, cy, -w * 0.35, 10);
    p.t(M.iron, FR, 0.04, 0, cy, -w * 0.42, 'z', 28, 6); p.cz(M.iron, 0.09, 0.08, 0, cy, -w * 0.42, 12);
    for (let i = 0; i < 6; i++) { const s = p.b(M.iron, 0.03, FR * 2 - 0.04, 0.02, 0, 0, -w * 0.42); s.rotation.z = (i * Math.PI) / 6; s.position.set(0, cy, -w * 0.42); }
    p.bb(body, d * 0.7, 0.2, w * 0.5, 0, 0.15, w * 0.15, 0.02);
  } else if (kind === 'pump') {
    p.bb(body, d * 0.6, h * 0.45, w * 0.5, 0, 0.15, -w * 0.2, 0.03);
    p.lathe(body, [[0, 0], [d * 0.28, 0], [d * 0.28, 0.06], [d * 0.24, 0.1], [d * 0.24, h - 0.3], [d * 0.28, h - 0.25], [d * 0.28, h - 0.18], [0, h - 0.15]], 0, 0.15, w * 0.25, 16);
    p.c(M.brass, d * 0.1, 0.12, 0, h, w * 0.25, 10); p.cz(M.iron, 0.05, w * 0.5, 0, h * 0.6, 0, 8);
    p.t(M.rust, 0.13, 0.015, d * 0.31, h * 0.5, -w * 0.2, 'x', 18, 5); for (let i = 0; i < 4; i++) p.b(M.rust, 0.012, 0.25, 0.014, d * 0.31, h * 0.5 - 0.125, -w * 0.2).rotation.x = (i * Math.PI) / 4;
    dial(p, d * 0.3, 0.15 + h * 0.3, -w * 0.38, 0.07); // on the front of the pump body (not in the air above it)
  } else if (kind === 'engine') {
    const n = Math.max(2, Math.round(w / 0.8));
    p.bb(body, d * 0.8, h * 0.4, w * 0.96, 0, 0.15, 0, 0.03);
    for (let i = 0; i < n; i++) {
      const z = -w / 2 + (w / n) * (i + 0.5), rr = Math.min(d, w / n) * 0.36;
      p.lathe(body, [[0, 0], [rr * 1.15, 0], [rr * 1.15, 0.05], [rr, 0.08], [rr, h * 0.45], [rr * 1.15, h * 0.48], [rr * 1.15, h * 0.52], [0, h * 0.52]], 0, 0.15 + h * 0.4, z, 16);
      p.c(M.brass, 0.05, 0.08, 0, h * 0.92 + 0.15, z, 8); for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; p.c(M.iron, 0.012, 0.03, Math.cos(a) * rr, 0.15 + h * 0.92, z + Math.sin(a) * rr, 6); }
    }
    p.cz(M.copper, 0.05, w, d * 0.42, h * 0.7, 0, 8);
  } else {
    p.bb(body, d * 0.9, h - 0.15, w * 0.94, 0, 0.15, 0, 0.03); p.bb(M.steelDark, d * 0.92, 0.05, w * 0.96, 0, h * 0.6, 0, 0.01);
    dial(p, d * 0.45, h * 0.8, 0, 0.09);
    for (const s of [-1, 1]) p.fp(body, w * 0.35, h * 0.35, d * 0.45, h * 0.35, s * w * 0.22, 0.008, 0.03);
  }
});

const unitCyl = () => cached('unit10', () => new THREE.CylinderGeometry(1, 1, 1, 10, 1, true));
const unitFlange = () => cached('flange', () => G.lathe([[0, -0.5], [1, -0.5], [1, 0.5], [0, 0.5]], 12));
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0), _d = new THREE.Vector3();
/**
 * Pipe run through world points [[x,y,z],...]; adds meshes (shared geometry) to `parent`: straight runs, bolted flanges at
 * the joints and every ~2.5 m, elbow spheres. Returns parent.
 */
export function pipe(parent, mat, pts, r = 0.05) {
  const m = matOf(mat, M.steelDark);
  for (let i = 0; i < pts.length - 1; i++) {
    _a.fromArray(pts[i]); _b.fromArray(pts[i + 1]);
    const len = _a.distanceTo(_b); if (len < 1e-4) continue;
    _d.subVectors(_b, _a).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(_up, _d);
    const mesh = new THREE.Mesh(unitCyl(), m);
    mesh.scale.set(r, len, r); mesh.position.copy(_a).add(_b).multiplyScalar(0.5); mesh.quaternion.copy(q);
    parent.add(mesh);
    const nf = Math.floor(len / 2.5);
    for (let k = 0; k <= nf + 1; k++) {
      const t = k === 0 ? Math.min(0.12, len * 0.2) / len : k === nf + 1 ? 1 - Math.min(0.12, len * 0.2) / len : k / (nf + 1);
      if (len < 0.5 && k > 0 && k <= nf) continue;
      const f = new THREE.Mesh(unitFlange(), m); f.scale.set(r * 1.6, Math.max(0.02, r * 0.5), r * 1.6); f.position.copy(_a).lerp(_b, t); f.quaternion.copy(q); parent.add(f);
    }
    if (i > 0) { const j = new THREE.Mesh(cached('shi', () => new THREE.SphereGeometry(1, 14, 10)), m); j.scale.setScalar(r * 1.12); j.position.fromArray(pts[i]); parent.add(j); }
  }
  return parent;
}

/**
 * Swimming-pool basin (raised tiled coaming with brass rail, water surface). Rectangle in world coordinates on `deck`.
 */
export function poolBasin(world, deck, x0, x1, z0, z1, o = {}) {
  const y = DECK_Y[deck], b = new Batch(world, deck), rim = o.rim ?? 0.3, h = o.h ?? 0.4, tile = matOf(o.tile, M.tileWhite);
  b.box(tile, x0, y, z0, x1, y + h, z0 + rim, 'xXYzZ'); b.box(tile, x0, y, z1 - rim, x1, y + h, z1, 'xXYzZ');
  b.box(tile, x0, y, z0 + rim, x0 + rim, y + h, z1 - rim, 'xXY'); b.box(tile, x1 - rim, y, z0 + rim, x1, y + h, z1 - rim, 'xXY');
  b.box(M.marble, x0 - 0.02, y + h, z0 - 0.02, x1 + 0.02, y + h + 0.03, z0 + rim + 0.02, 'xXYzZ'); b.box(M.marble, x0 - 0.02, y + h, z1 - rim - 0.02, x1 + 0.02, y + h + 0.03, z1 + 0.02, 'xXYzZ');
  b.box(M.marble, x0 - 0.02, y + h, z0 + rim + 0.02, x0 + rim + 0.02, y + h + 0.03, z1 - rim - 0.02, 'xXY'); b.box(M.marble, x1 - rim - 0.02, y + h, z0 + rim + 0.02, x1 + 0.02, y + h + 0.03, z1 - rim - 0.02, 'xXY');
  b.flat(K.tileBlue, x0 + rim, x1 - rim, z0 + rim, z1 - rim, y + 0.02);
  b.flat(K.water, x0 + rim, x1 - rim, z0 + rim, z1 - rim, y + h - 0.12);
  const ry = y + 0.95, xa = x0 + rim / 2, xb = x1 - rim / 2, za = z0 + rim / 2, zb = z1 - rim / 2;
  b.bar(M.brass, [xa, ry, za], [xb, ry, za], 0.04, 0.04); b.bar(M.brass, [xa, ry, zb], [xb, ry, zb], 0.04, 0.04);
  b.bar(M.brass, [xa, ry, za], [xa, ry, zb], 0.04, 0.04); b.bar(M.brass, [xb, ry, za], [xb, ry, zb], 0.04, 0.04);
  const nx = Math.max(1, Math.round((xb - xa) / 2)), nz = Math.max(1, Math.round((zb - za) / 2));
  for (let i = 0; i <= nx; i++) for (const z of [za, zb]) b.post(M.brass, xa + ((xb - xa) * i) / nx, z, y + h, ry, 0.035);
  for (let i = 1; i < nz; i++) for (const x of [xa, xb]) b.post(M.brass, x, za + ((zb - za) * i) / nz, y + h, ry, 0.035);
  b.flush();
  // pool ladder (brass) at the x0 end
  const zone = world.zone(deck, (x0 + x1) / 2), lad = poolLadder({ h: h + 0.6 });
  lad.position.set(x0 + rim + 0.05, y + 0.02, (z0 + z1) / 2 + (z1 - z0) * 0.25); lad.rotation.y = Math.PI; zone.add(lad);
  world.addCollider(x0, y, z0, x1, y + 1.0, z1);
}
const poolLadder = def('poolLadder', (o) => [0.5, 0.3, o.h ?? 1.0], (p, o) => {
  const h = o.h ?? 1.0;
  for (const s of [-1, 1]) p.loft(M.brass, [[0, 0, s * 0.22], [0, h, s * 0.22], [-0.08, h + 0.2, s * 0.22], [-0.25, h + 0.25, s * 0.22], [-0.32, h - 0.1, s * 0.22]], 0.018, 8);
  for (let y = 0.2; y < h; y += 0.28) p.bb(M.chrome, 0.08, 0.025, 0.44, 0, y, 0, 0.006);
});

/**
 * Squash-court markings: red lines on the floor and on the front wall (side 'fwd' | 'aft').
 */
export function squashMarkings(world, deck, x0, x1, z0, z1, o = {}) {
  const y = DECK_Y[deck], b = new Batch(world, deck), red = M.fabricRed, fwd = (o.front ?? 'fwd') === 'fwd';
  const xf = fwd ? x1 - 0.06 : x0 + 0.06, dir = fwd ? -1 : 1, len = x1 - x0, xs = xf + dir * len * 0.56, w = 0.05;
  b.flat(red, xs - w / 2, xs + w / 2, z0, z1, y + 0.012);                          // short line
  b.flat(red, Math.min(xs, xf + dir * len), Math.max(xs, xf + dir * len), (z0 + z1) / 2 - w / 2, (z0 + z1) / 2 + w / 2, y + 0.012); // half-court line
  const hgt = o.h ?? 4;
  for (const yy of [y + 0.48, y + 1.8, y + Math.min(hgt - 0.3, 4.5)]) b.wallZ(red, xf, z0, z1, yy, yy + w, dir);
  b.box(M.iron, xf + dir * 0.0, y, z0, xf + dir * 0.03, y + 0.48, z1, fwd ? 'xyYzZ' : 'XyYzZ'); // tin
  b.flush();
}

