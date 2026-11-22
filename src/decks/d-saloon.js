// D deck – the two dining saloons (hero rooms).
// 1st class: Jacobean saloon after Haddon Hall – strapwork ceiling with beams, rosettes and pendants, white panelling with
// bolection-moulded panels, lozenges and a carved frieze, alcoves with lit leaded windows and curtains, cased columns with
// Jacobean capitals, oak sideboards and stewards' stations, oak chairs in green leather with nail-head trim, tables for
// 2–8 under damask cloths with full place settings, lamps, flowers, menus and cruets.
// 2nd class: oak-panelled saloon with long tables and mahogany swivel chairs on cast-iron pedestals.
// Chairs, place settings and table assemblies are InstancedMeshes (one per part / material / zone).
import * as THREE from 'three';
import { mats as M } from '../core/materials.js';
import { AT } from '../interior/batch.js';
import { def, piano, pottedPalm, sconce, pilaster, kitMats as K } from '../interior/kit.js';
import { InstField, G, boxG, merge, rng, rotOf, wctx, panelRun, strapCeiling, ceilingOrnaments, leadedWindow, propTris } from './d-util.js';

const TAU = Math.PI * 2;
const atl = (g, cell) => G.atlasCell(g, cell);
/** tiny four-sided pyramids (nail heads / bosses) on a face with normal n: points [[x,y,z]], radius r */
function studs(pts, n, r = 0.006, h = 0.005) {
  const polys = [], t1 = Math.abs(n[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
  const t2 = [n[1] * t1[2] - n[2] * t1[1], n[2] * t1[0] - n[0] * t1[2], n[0] * t1[1] - n[1] * t1[0]];
  for (const c of pts) {
    const q = (a, b) => [c[0] + t1[0] * a + t2[0] * b, c[1] + t1[1] * a + t2[1] * b, c[2] + t1[2] * a + t2[2] * b];
    const ring = [q(-r, 0), q(0, -r), q(r, 0), q(0, r)], tip = [c[0] + n[0] * h, c[1] + n[1] * h, c[2] + n[2] * h];
    for (let k = 0; k < 4; k++) polys.push([ring[k], ring[(k + 1) % 4], tip]);
  }
  return G.polysGeo(polys, null);
}
const orient = (g, n) => { // fix the winding of studs so they face n
  const p = g.attributes.position, a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    const nn = b.clone().sub(a).cross(c.clone().sub(a));
    if (nn.x * n[0] + nn.y * n[1] + nn.z * n[2] < 0) { p.setXYZ(i + 1, c.x, c.y, c.z); p.setXYZ(i + 2, b.x, b.y, b.z); }
  }
  g.computeVertexNormals(); return g;
};

// ================================================================= furniture (built once, instanced)

/** 1st-class dining chair: oak, cabriole front legs, raked back posts with finials, shaped crest rail, green leather
 *  seat and back with brass nail-head trim (front faces +x, origin on the floor). ≈ 470 triangles. */
export const chairJac = def('dChairJac', [0.48, 0.52, 1.0], (p) => {
  const oak = M.oak, lea = M.leatherGreen, br = M.brass;
  for (const sz of [-1, 1]) {
    const x = 0.19, z = sz * 0.19;
    p.add(G.loft([[x + 0.03, 0, z], [x - 0.004, 0.07, z], [x - 0.016, 0.18, z], [x + 0.018, 0.31, z], [x + 0.002, 0.4, z]], [0.024, 0.013, 0.016, 0.026, 0.022], 5, true), oak);
    p.add(G.loft([[-0.205, 0, z], [-0.21, 0.42, z], [-0.25, 0.97, z]], [[0.019, 0.017], [0.02, 0.018], [0.018, 0.016]], 4, true), oak);
    p.add(G.lathe([[0.022, 0], [0.02, 0.025], [0, 0.05]], 4), oak, -0.251, 0.968, z);
    p.add(boxG(0.36, 0.022, 0.02, -0.005, 0.12, z, 'xX'), oak);
  }
  p.add(boxG(0.02, 0.022, 0.36, -0.005, 0.15, 0, 'zZ'), oak);
  p.add(boxG(0.44, 0.07, 0.44, 0, 0.365, 0, 'y'), oak);
  const apron = p.add(G.extrude([[-0.21, 0], [0.21, 0], [0.21, -0.045], [0.13, -0.03], [0.065, -0.058], [0, -0.042], [-0.065, -0.058], [-0.13, -0.03], [-0.21, -0.045]], 0.02), oak, 0.215, 0.332, 0);
  apron.rotation.y = Math.PI / 2;
  p.add(G.pillow(0.47, 0.08, 0.47, 0.25, 0.14, 3, 8), lea, 0.005, 0.382, 0);
  // brass band + nail heads round the seat, a row along the top of the back
  p.add(boxG(0.004, 0.014, 0.47, 0.243, 0.405, 0, 'xyYzZ'), br);
  for (const s of [-1, 1]) p.add(boxG(0.47, 0.014, 0.004, 0.005, 0.405, s * 0.238, s > 0 ? 'xXyYz' : 'xXyYZ'), br);
  p.add(orient(studs(Array.from({ length: 6 }, (_, i) => [0.246, 0.405, -0.19 + i * 0.076]), [1, 0, 0]), [1, 0, 0]), br);
  // back: lower rail, upholstered panel, shaped crest rail
  p.add(boxG(0.03, 0.04, 0.38, -0.216, 0.5, 0, ''), oak);
  p.add(G.bevelBox(0.045, 0.3, 0.37, 0.014), lea, -0.232, 0.67, 0, 0, 0, 0.075);
  const crest = p.add(G.extrude([[-0.215, 0], [0.215, 0], [0.215, 0.06], [0.12, 0.075], [0, 0.125], [-0.12, 0.075], [-0.215, 0.06]], 0.032), oak, -0.247, 0.835, 0);
  crest.rotation.set(0, Math.PI / 2, 0); crest.rotateX(-0.075);
});

/** 2nd-class swivel chair bolted to the floor: cast-iron pedestal with bolts, mahogany seat and curved back, crimson leather. */
export const swivelJac = def('dSwivel', [0.46, 0.48, 0.9], (p) => {
  const iron = M.iron, mah = M.mahogany, red = M.fabricRed;
  p.add(G.lathe([[0.17, 0.014], [0.09, 0.035], [0.035, 0.1], [0.03, 0.34], [0.055, 0.4]], 8), iron);
  for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + Math.PI / 4; p.add(G.lathe([[0.013, 0], [0, 0.012]], 4), iron, Math.cos(a) * 0.13, 0.014, Math.sin(a) * 0.13); }
  p.add(G.lathe([[0.2, 0], [0.21, 0.02], [0.2, 0.04]], 10), mah, 0, 0.395, 0);
  p.add(G.pillow(0.39, 0.06, 0.39, 0.3, 0.6, 3, 8), red, 0.01, 0.425, 0);
  p.add(G.arcWall(0.2, 0.02, Math.PI * 1.15, Math.PI * 0.7, 0, (u) => 0.4 + 0.04 * Math.sin(Math.PI * u), 8), mah, 0.02, 0.45, 0);
  p.add(G.lathe([[0.18, 0.27], [0.186, 0.17], [0.18, 0.06]], 6, Math.PI * 1.25, Math.PI * 0.5, false), red, 0.02, 0.45, 0);
});

const PLATE_BODY = [[0.07, 0], [0.1, 0.011], [0.122, 0.017], [0.118, 0.019]];
/** one place setting (diner on −x, looking +x): plate with cobalt-and-gold rim, wine glass, fork / knife / spoon, mitred napkin */
export const setting = def('dSetting', [0.4, 0.3, 0.16], (p, o) => {
  const first = o.cls !== 'second';
  p.add(G.lathe(PLATE_BODY, 8), M.porcelain);
  p.add(G.lathe([[0.094, 0.0123], [0, 0.009]], 8), M.porcelain);
  if (first) { p.add(atl(G.lathe([[0.118, 0.019], [0.094, 0.0123]], 8), AT.cobalt), K.atlas); }
  else p.add(G.lathe([[0.118, 0.019], [0.094, 0.0123]], 8), M.porcelain);
  p.add(first ? G.lathe([[0.03, 0], [0.006, 0.012], [0.005, 0.07], [0.03, 0.095], [0.035, 0.14]], 6) : G.lathe([[0.03, 0], [0.034, 0.1]], 6), M.glass, 0.15, 0, first ? 0.14 : 0.13);
  const cut = merge([boxG(0.19, 0.004, 0.018, 0, 0.002, -0.165, 'xXy'), boxG(0.21, 0.004, 0.014, -0.005, 0.002, 0.15, 'xXy'), boxG(0.19, 0.004, 0.016, 0, 0.002, 0.175, 'xXy')]);
  p.add(cut, M.chrome);
  p.add(G.extrude([[-0.05, 0], [0.05, 0], [0.035, 0.07], [0, 0.11], [-0.035, 0.07]], 0.024), M.linen, 0.0, 0.012, 0).rotation.y = Math.PI / 2;
});

/** table assembly without settings: draped damask cloth, base, shaded lamp. kind: {round:r} or {lx, lz}; lamp */
export const tableAsm = def('dTable', [1, 1, 1.05], (p, o) => {
  const rows = (d) => [{ o: d + 0.05, y: 0.47, m: 0.012 }, { o: d + 0.035, y: 0.63, m: 0.006 }, { o: d + 0.018, y: 0.745 }, { o: d - 0.025, y: 0.757 }];
  const wood = o.wood === 'mahogany' ? M.mahogany : M.oak;
  if (o.round) {
    const r = o.round;
    p.add(G.revolve(rows(r), { seg: r > 0.5 ? 26 : 22, k: Math.round(r * 16), capTop: true }), M.linen);
    p.add(G.lathe([[0.24, 0], [0.09, 0.06], [0.05, 0.14], [0.045, 0.48]], 8), wood);
  } else {
    const { lx, lz } = o;
    const rl = G.rectLoop(lx, lz, 0.05, 1, 0.22);
    p.add(G.revolve([{ o: 0.05, y: 0.47, m: 0.012 }, { o: 0.035, y: 0.63, m: 0.006 }, { o: 0.018, y: 0.745 }, { o: -0.025, y: 0.757 }], { perim: rl, k: Math.round((lx + lz) * 5), capTop: true }), M.linen);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      p.add(G.frustum(0.04, 0.04, 0.06, 0.06, 0.47, { top: false, bottom: false }), wood, sx * (lx / 2 - 0.09), 0, sz * (lz / 2 - 0.09));
      p.add(G.lathe([[0.03, 0], [0.034, 0.03], [0.026, 0.06]], 6), wood, sx * (lx / 2 - 0.09), 0, sz * (lz / 2 - 0.09));
    }
  }
  if (o.lamp !== false) {
    p.add(G.lathe([[0.055, 0], [0.02, 0.03], [0.009, 0.06], [0.009, 0.2], [0, 0.22]], 6), M.brass, 0, 0.757, 0);
    p.add(G.revolve([{ o: 0.1, y: 0, m: 0.005 }, { o: 0.07, y: 0.07, m: 0.004 }, { o: 0.05, y: 0.12 }], { seg: 12, k: 6, capTop: true, capBottom: true }), M.lampGlow, 0, 0.757 + 0.16, 0);
  }
});

/** bud vase with flowers (variant v: 0 red roses, 1 yellow, 2 white / pink) */
export const vase = def('dVase', [0.12, 0.12, 0.3], (p, o) => {
  const v = o.v ?? 0, heads = [[AT.flowerRed, AT.flowerRed, AT.rose], [AT.flowerYellow, AT.flowerYellow, AT.flowerWhite], [AT.flowerWhite, AT.pink, AT.pink]][v];
  p.add(G.lathe([[0.034, 0], [0.014, 0.03], [0.011, 0.11], [0.02, 0.15]], 5), M.chrome);
  const fl = [[0.0, 0.215, 0.0], [0.035, 0.19, 0.02], [-0.03, 0.185, -0.025]];
  fl.forEach(([x, y, z], i) => { p.add(atl(new THREE.SphereGeometry(0.026, 5, 3), heads[i]), K.atlas, x, y, z); p.add(atl(G.lathe([[0.003, 0], [0.003, y - 0.14]], 3), AT.leafDark), K.atlas, x * 0.5, 0.14, z * 0.5); });
  for (const [a, h] of [[0.6, 0.17], [2.6, 0.165], [4.4, 0.18]]) {
    const c = Math.cos(a), s = Math.sin(a);
    const lf = [[0, h - 0.02, 0], [c * 0.07 - s * 0.015, h + 0.005, s * 0.07 + c * 0.015], [c * 0.09, h - 0.01, s * 0.09], [c * 0.07 + s * 0.015, h - 0.025, s * 0.07 - c * 0.015]];
    p.add(atl(G.polysGeo([lf, [...lf].reverse()], null), AT.leafLight), K.atlas);
  }
});
/** cruet stand (oil, vinegar, salt, pepper) */
export const cruet = def('dCruet', [0.14, 0.14, 0.17], (p) => {
  p.add(G.lathe([[0.06, 0], [0.06, 0.007], [0.009, 0.011], [0.006, 0.13], [0.015, 0.14], [0, 0.155]], 6), M.chrome);
  for (const [a, h] of [[0, 0.1], [2.1, 0.1], [4.2, 0.07]]) p.add(G.lathe([[0.019, 0], [0.021, h * 0.55], [0.008, h * 0.82], [0, h]], 4), M.glass, Math.cos(a) * 0.036, 0.008, Math.sin(a) * 0.036);
  p.add(G.lathe([[0.011, 0], [0.011, 0.012], [0, 0.016]], 5), M.chrome, Math.cos(4.2) * 0.036, 0.078, Math.sin(4.2) * 0.036);
});
/** tent-folded menu card (atlas paper, gilt crest) */
export const menuCard = def('dMenu', [0.1, 0.06, 0.1], (p) => {
  const a = [[-0.035, 0, -0.05], [-0.035, 0, 0.05], [0, 0.1, 0.05], [0, 0.1, -0.05]], b = [[0.035, 0, 0.05], [0.035, 0, -0.05], [0, 0.1, -0.05], [0, 0.1, 0.05]];
  p.add(atl(G.polysGeo([a, b, [...a].reverse(), [...b].reverse()], null), AT.ivory), K.atlas); // both faces of the folded card (open ends)
  p.add(atl(G.polysGeo([[[-0.0226, 0.064, -0.012], [-0.0226, 0.064, 0.012], [-0.0143, 0.081, 0.012], [-0.0143, 0.081, -0.012]].map(([x, y, z]) => [x - 0.002, y, z])], [-1, 0.5, 0]), AT.gilt), K.atlas);
});
/** water carafe */
export const carafeG = def('dCarafe', [0.15, 0.15, 0.25], (p) => { p.add(G.lathe([[0.055, 0], [0.068, 0.05], [0.066, 0.11], [0.03, 0.17], [0.021, 0.23], [0.027, 0.245]], 8), M.glass); });

// ---------------------------------------------------------------- architecture pieces (static, merged)

/** steel column cased in white, Jacobean capital: plinth, Attic base, plain shaft with entasis, necking, bell with
 *  carved leaf band, square abacus with scrolled corners. */
export const columnJac = def('dColumnJac', (o) => [0.46, 0.46, o.h ?? 2.6], (p, o) => {
  const h = o.h ?? 2.6, m = M.paintWhite, r = 0.135;
  p.bb(m, 0.44, 0.16, 0.44, 0, 0, 0, 0.012);
  p.add(G.lathe([[0.2, 0.16], [0.2, 0.18], [0.185, 0.2], [0.17, 0.215], [0.18, 0.23], [0.16, 0.25], [0.145, 0.27], [r, 0.29]], 20), m);
  p.add(G.lathe([[r, 0.29], [r * 1.0, 0.9], [r * 0.95, 1.6], [r * 0.86, h - 0.46]], 20), m);
  p.add(G.lathe([[r * 0.86, h - 0.46], [r * 0.98, h - 0.445], [r * 0.98, h - 0.425], [r * 0.86, h - 0.41], [r * 0.88, h - 0.3], [0.15, h - 0.2], [0.17, h - 0.19]], 20), m);
  for (let i = 0; i < 8; i++) { // stiff Jacobean leaves round the bell
    const a = (i / 8) * TAU, lf = p.add(G.extrude([[-0.035, 0], [0.035, 0], [0.04, 0.07], [0.02, 0.13], [0, 0.15], [-0.02, 0.13], [-0.04, 0.07]], 0.012), m);
    lf.position.set(Math.cos(a) * r * 0.9, h - 0.4, -Math.sin(a) * r * 0.9); lf.rotation.set(0, a + Math.PI / 2, 0); lf.rotateX(-0.28);
  }
  p.bb(m, 0.4, 0.06, 0.4, 0, h - 0.19, 0, 0.01);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const t = p.t(m, 0.032, 0.012, sx * 0.17, h - 0.17, sz * 0.17, 'y', 10, 4); t.rotation.set(Math.PI / 2, 0, sx * sz * 0.8); }
  p.bb(m, 0.46, 0.05, 0.46, 0, h - 0.13, 0, 0.01);
  p.bb(m, 0.36, 0.08, 0.36, 0, h - 0.08, 0, 0.005);
});

/** oak Jacobean sideboard with plate gallery, silver and plate stacks; brass kick rail. front +x */
export const sideboard = def('dSideboard', (o) => [o.w ?? 2.4, 0.6, 1.8], (p, o) => {
  const w = o.w ?? 2.4, oak = M.oak, d = 0.58, r = rng(Math.round(w * 100) + (o.v ?? 0));
  p.b(M.woodDark, d - 0.04, 0.1, w - 0.04, -0.01, 0, 0);
  p.b(M.brass, 0.006, 0.07, w - 0.06, d / 2 - 0.035, 0.015, 0);
  p.bb(oak, d, 0.78, w, 0, 0.1, 0, 0.008);
  const n = Math.max(2, Math.round(w / 0.8)), cw = (w - 0.1) / n;
  for (let i = 0; i < n; i++) {
    const z = -w / 2 + 0.05 + cw * (i + 0.5);
    p.fp(oak, cw - 0.06, 0.15, d / 2, 0.79, z, 0.008, 0.03);
    p.c(M.brass, 0.012, 0.02, d / 2 + 0.01, 0.785, z, 6).rotation.z = Math.PI / 2;
    p.fp(oak, cw - 0.06, 0.48, d / 2, 0.42, z, 0.012, 0.05);
    p.add(G.extrude([[-0.03, 0], [0.03, 0], [0, 0.06]], 0.01), oak, d / 2 + 0.014, 0.4, z).rotation.y = Math.PI / 2; // carved lozenge
  }
  for (const s of [-1, 1]) p.bb(oak, 0.05, 0.78, 0.07, d / 2 - 0.0, 0.1, s * (w / 2 - 0.02), 0.006);
  p.bb(oak, d + 0.04, 0.04, w + 0.04, 0.01, 0.88, 0, 0.01);
  // gallery: back board with panels, turned columns, shelf with cornice
  p.b(oak, 0.025, 0.72, w, -d / 2 + 0.03, 0.92, 0);
  for (let i = 0; i < n; i++) p.fp(oak, cw - 0.08, 0.5, -d / 2 + 0.043, 1.2, -w / 2 + 0.05 + cw * (i + 0.5), 0.008, 0.035);
  for (const s of [-1, 1]) p.lathe(oak, [[0, 0], [0.03, 0], [0.03, 0.04], [0.02, 0.08], [0.028, 0.22], [0.018, 0.36], [0.026, 0.48], [0.03, 0.52], [0, 0.52]], -d / 2 + 0.12, 0.92, s * (w / 2 - 0.06), 8);
  p.bb(oak, 0.24, 0.03, w + 0.02, -d / 2 + 0.12, 1.44, 0, 0.008);
  p.bb(oak, 0.26, 0.06, w + 0.06, -d / 2 + 0.12, 1.6, 0, 0.012);
  p.extX(oak, [[-w / 2, 0], [w / 2, 0], [w / 2, 0.05], [w * 0.2, 0.07], [0, 0.14], [-w * 0.2, 0.07], [-w / 2, 0.05]], 0.03, -d / 2 + 0.04, 1.66, 0);
  // plates on the shelf, standing against the back (cobalt rims)
  for (let i = 0; i < 5; i++) { const z = -w / 2 + 0.25 + (i * (w - 0.5)) / 4; const pl = p.add(G.lathe([[0.122, 0.017], [0.07, 0], [0, 0.004]], 10), M.porcelain, -d / 2 + 0.07, 1.6, z); pl.rotation.z = -(Math.PI / 2 - 0.2); const rim = p.add(atl(G.lathe([[0.124, 0.019], [0.1, 0.012]], 10), AT.cobalt), K.atlas, -d / 2 + 0.07, 1.6, z); rim.rotation.z = -(Math.PI / 2 - 0.2); } // face to the room, top leaning on the back board
  // silver on the top: coffee urn, tureen, plate stacks, tray with sauce boats
  const ty = 0.92;
  p.lathe(M.chrome, [[0, 0], [0.08, 0], [0.06, 0.03], [0.04, 0.06], [0.1, 0.12], [0.11, 0.24], [0.08, 0.3], [0.03, 0.33], [0.04, 0.36], [0, 0.38]], 0, ty, -w * 0.3, 14);
  p.c(M.chrome, 0.008, 0.08, 0.1, ty + 0.1, -w * 0.3, 6).rotation.z = Math.PI / 2;
  p.lathe(M.chrome, [[0, 0], [0.09, 0], [0.13, 0.05], [0.14, 0.11], [0.12, 0.12], [0.1, 0.17], [0.03, 0.18], [0.03, 0.21], [0, 0.22]], 0.02, ty, w * 0.05, 14);
  for (const z of [w * 0.28, w * 0.38]) { const hgt = 0.06 + r() * 0.08; p.lathe(M.porcelain, [[0, 0], [0.11, 0], [0.122, hgt], [0, hgt]], 0.05, ty, z, 12); p.add(atl(G.lathe([[0.123, hgt], [0.1, hgt + 0.002]], 12), AT.cobalt), K.atlas, 0.05, ty, z); }
  p.lathe(M.chrome, [[0, 0], [0.2, 0], [0.21, 0.015], [0.2, 0.02], [0, 0.005]], 0.06, ty, -w * 0.05 - 0.3, 16);
});

/** stewards' service station: cutlery drawers, marble top, plate rack with stacks, glasses, napkins; brass kick plate */
export const station = def('dStation', (o) => [o.w ?? 1.6, 0.55, 2.0], (p, o) => {
  const w = o.w ?? 1.6, oak = M.oak, d = 0.55;
  p.b(M.woodDark, d - 0.04, 0.1, w - 0.04, -0.01, 0, 0);
  p.b(M.brass, 0.005, 0.09, w - 0.04, d / 2 - 0.03, 0.005, 0);
  p.bb(oak, d, 0.8, w, 0, 0.1, 0, 0.008);
  for (let k = 0; k < 3; k++) for (let i = 0; i < 2; i++) { const z = (i - 0.5) * (w / 2), y = 0.78 - k * 0.2; p.fp(oak, w / 2 - 0.07, 0.15, d / 2, y, z, 0.008, 0.03); p.c(M.brass, 0.011, 0.02, d / 2 + 0.01, y, z, 6).rotation.z = Math.PI / 2; }
  p.bb(M.marble, d + 0.03, 0.03, w + 0.03, 0.01, 0.9, 0, 0.008);
  p.b(oak, 0.02, 1.07, w, -d / 2 + 0.02, 0.93, 0);
  for (const s of [-1, 1]) p.bb(oak, 0.3, 1.07, 0.03, -d / 2 + 0.15, 0.93, s * (w / 2 - 0.015), 0.005);
  for (const y of [1.33, 1.68]) p.bb(oak, 0.3, 0.025, w - 0.06, -d / 2 + 0.15, y, 0, 0.005);
  p.bb(oak, 0.34, 0.05, w + 0.04, -d / 2 + 0.16, 1.98, 0, 0.01);
  // contents
  for (let i = 0; i < 3; i++) { const z = (i - 1) * (w * 0.3), hgt = 0.08 + (i % 2) * 0.05; p.lathe(M.porcelain, [[0, 0], [0.1, 0], [0.112, hgt], [0, hgt]], -d / 2 + 0.14, 1.355, z, 12); p.add(atl(G.lathe([[0.113, hgt], [0.092, hgt + 0.002]], 12), AT.cobalt), K.atlas, -d / 2 + 0.14, 1.355, z); }
  for (let i = 0; i < 6; i++) p.lathe(M.glass, [[0.03, 0], [0.006, 0.012], [0.005, 0.07], [0.03, 0.095], [0.035, 0.14]], -d / 2 + 0.14 + (i % 2) * 0.07, 1.705, -w / 2 + 0.15 + i * ((w - 0.3) / 5), 6);
  for (let i = 0; i < 3; i++) p.bb(M.linen, 0.22, 0.035, 0.22, 0.02, 0.93 + i * 0.035, w * 0.25, 0.01);
  p.lathe(M.glass, [[0.055, 0], [0.068, 0.05], [0.066, 0.11], [0.03, 0.17], [0.021, 0.23], [0.027, 0.245]], 0.02, 0.93, -w * 0.25, 10);
});

// ================================================================= 1st class dining saloon

export const DINING1 = { x0: -6.5, x1: 30.5, bay: 10.9 };
const BAY_X = [0, 5.4, 10.8, 16.2, 21.6, 27];

/** Bay partitions (kit walls) – call before plan.finish(). */
export function dining1Walls(plan) {
  for (const x of BAY_X) for (const s of [-1, 1]) plan.wall(x, s * DINING1.bay, x, s * 99, { wall: 'whitePanel' });
}

/** table kinds: seats = [edge point (x, z), outward normal] */
function kindsFirst() {
  const round = (r, n, a0 = 0) => Array.from({ length: n }, (_, i) => { const a = a0 + (i / n) * TAU; return { p: [Math.cos(a) * r, Math.sin(a) * r], n: [Math.cos(a), Math.sin(a)] }; });
  const rect = (lx, lz, along) => [
    ...along.flatMap((x) => [{ p: [x, -lz / 2], n: [0, -1] }, { p: [x, lz / 2], n: [0, 1] }]),
    { p: [-lx / 2, 0], n: [-1, 0] }, { p: [lx / 2, 0], n: [1, 0] }];
  return {
    r2: { o: { round: 0.45 }, seats: round(0.45, 2), ex: 1.95, ez: 1.0 },
    r4: { o: { round: 0.62 }, seats: round(0.62, 4), ex: 2.3, ez: 2.3 },
    s6: { o: { lx: 1.6, lz: 0.95 }, seats: rect(1.6, 0.95, [-0.4, 0.4]), ex: 2.65, ez: 2.0, long: true },
    s8: { o: { lx: 2.25, lz: 1.05 }, seats: rect(2.25, 1.05, [-0.72, 0, 0.72]), ex: 3.3, ez: 2.1, long: true },
  };
}

/** furnish function of the 1st class dining saloon (room x −6.5..30.5, full width, contains the funnel-3 casing). */
export function furnishDining1(ctx) {
  const plan = ctx.plan, world = ctx.world, Y = ctx.y, TOP = Y + ctx.h, b = plan.batch, w = wctx(ctx), { x0, x1 } = DINING1;
  const HW = plan.halfWidth((x0 + x1) / 2), R = rng(1912), D = rng(414);
  const f = new InstField(world, plan.deck);
  const casing = plan.casings.filter((c) => c.x1 > x0 && c.x0 < x1);
  const t0 = b.tris;

  // ---------------------------------------------------------------- architecture
  // ceiling: beams on the bay lines and the column lines, strapwork lattice in every coffer
  ceilingOrnaments(f);
  strapCeiling(plan, f, { x0: x0 + 0.05, x1: x1 - 0.05, z0: -HW, z1: HW, xs: BAY_X, zs: [-DINING1.bay, -5.35, 0, 5.35, DINING1.bay], avoid: casing.map((c) => ({ x0: c.x0 - 0.05, x1: c.x1 + 0.05, z0: c.z0 - 0.05, z1: c.z1 + 0.05 })), beamD: 0.22, beamW: 0.32 });
  // panelling: forward / aft walls, casing, bay partitions, the hull between the windows
  const run = (P, A, O, len, gaps, o = {}) => panelRun(b, { P, A, O, len, Y, TOP, gaps, ...o });
  run([x1 - 0.05, Y, -HW], [0, 0, 1], [-1, 0, 0], 2 * HW, w.doorGaps('fwd', 0.16).map(([a, c]) => [a + HW, c + HW]));
  run([x0 + 0.05, Y, HW], [0, 0, -1], [1, 0, 0], 2 * HW, w.doorGaps('aft', 0.16).map(([a, c]) => [HW - c, HW - a]));
  for (const c of casing) {
    run([c.x0, Y, c.z0], [0, 0, 1], [-1, 0, 0], c.z1 - c.z0, []);
    run([c.x1, Y, c.z1], [0, 0, -1], [1, 0, 0], c.z1 - c.z0, []);
    for (const s of [-1, 1]) run([s > 0 ? c.x0 : c.x1, Y, s * c.z1], [s, 0, 0], [0, 0, s], c.x1 - c.x0, []);
  }
  const wins = [];
  for (let x = -4.05; x < x1 - 1; x += 2.7) wins.push(x);
  const bays = [x0, ...BAY_X, x1];
  for (const s of [-1, 1]) {
    for (const x of BAY_X) for (const side of [-1, 1]) run([x + side * 0.05, Y, s * DINING1.bay], [0, 0, s], [side, 0, 0], HW - DINING1.bay, [[-1, 0.18]]);
    for (let i = 0; i < bays.length - 1; i++) {
      const a = bays[i] + 0.05, c = bays[i + 1] - 0.05;
      run([a, Y, s * HW], [1, 0, 0], [0, 0, -s], c - a, [], { upper: false, frieze: false, backBands: [[Y + 0.13, Y + 0.99]] });
      run([a, Y, s * HW], [1, 0, 0], [0, 0, -s], c - a, wins.filter((x) => x > a && x < c).map((x) => [x - a - 0.95, x - a + 0.95]), { lower: false, backBands: [[Y + 0.99, TOP - 0.13]] });
    }
    for (const x of wins) leadedWindow(plan, x, s, { w: 1.7, y0: 0.9, y1: 2.12, curtain: M.fabricGreen });
    // piers at the alcove openings: cased end of every partition with a pilaster towards the nave, deep header beam
    for (const x of BAY_X) {
      b.box(M.paintWhite, x - 0.16, Y, s * (DINING1.bay - 0.12), x + 0.16, TOP, s * (DINING1.bay + 0.1), s > 0 ? 'xXz' : 'xXZ');
      w.mount(pilaster({ h: ctx.h - 0.28, w: 0.26, mat: 'paintWhite' }), x, s * (DINING1.bay - 0.12), s > 0 ? 'port' : 'stbd', 0);
      world.addCollider(x - 0.16, Y, Math.min(s * (DINING1.bay - 0.2), s * (DINING1.bay + 0.1)), x + 0.16, TOP, Math.max(s * (DINING1.bay - 0.2), s * (DINING1.bay + 0.1)));
      w.reserve(x, s * (DINING1.bay - 0.05), 0.4, 0.4);
    }
    for (let i = 0; i < bays.length - 1; i++) { // arched spandrel brackets under the header beam
      const a = bays[i] + (i > 0 ? 0.16 : 0.05), c = bays[i + 1] - (i < bays.length - 2 ? 0.16 : 0.05), zf = s * (DINING1.bay - 0.12);
      for (const [xa, dir] of [[a, 1], [c, -1]]) {
        const pts = [[xa, TOP - 0.22], [xa + dir * 0.45, TOP - 0.22], [xa + dir * 0.3, TOP - 0.3], [xa + dir * 0.15, TOP - 0.42], [xa, TOP - 0.5]];
        b.poly(M.paintWhite, pts.map(([x, y]) => [x, y, zf]), [0, 0, -s]);
        b.poly(M.paintWhite, pts.map(([x, y]) => [x, y, zf + s * 0.2]), [0, 0, s]);
        for (let k = 1; k < pts.length - 1; k++) b.poly(M.paintWhite, [[pts[k][0], pts[k][1], zf], [pts[k + 1][0], pts[k + 1][1], zf], [pts[k + 1][0], pts[k + 1][1], zf + s * 0.2], [pts[k][0], pts[k][1], zf + s * 0.2]], [0, -1, -dir * 0.3]);
      }
    }
  }
  const archTris = b.tris - t0;

  // ---------------------------------------------------------------- columns, sideboards, stations, piano, palms
  for (const x of BAY_X) for (const z of [-5.35, 5.35]) w.put(columnJac({ h: ctx.h }), x, z, 'fwd', { collide: true });
  let v = 0;
  const side = (x, z, dir, wd = 2.4) => w.put(sideboard({ w: wd, v: v++ }), x, z, dir);
  side(x1 - 0.32, 0, 'aft'); side(x1 - 0.32, -11.9, 'aft', 2.2); side(x1 - 0.32, 11.9, 'aft', 2.2);
  w.put(piano({ mat: 'oak' }), x0 + 0.38, 0, 'fwd');
  side(x0 + 0.32, -8.0, 'fwd', 2.2); side(x0 + 0.32, 8.0, 'fwd', 2.2);
  for (const c of casing) {
    side(c.x0 - 0.32, 0, 'aft', 2.6); side(c.x1 + 0.32, 0, 'fwd', 2.6);
    for (const s of [-1, 1]) {
      w.put(station({ w: 1.8 }), (c.x0 + c.x1) / 2, s * (c.z1 + 0.29), s > 0 ? 'stbd' : 'port');
      for (const dx of [-2.3, 2.3]) w.mount(sconce(), (c.x0 + c.x1) / 2 + dx, s * (c.z1 + 0.012), s > 0 ? 'stbd' : 'port', 1.85);
    }
  }
  for (const [x, z] of [[x0 + 0.55, -2.4], [x0 + 0.55, 2.4], [x1 - 0.55, -2.8], [x1 - 0.55, 2.8]]) w.put(pottedPalm(), x, z, 'fwd', { collide: false });
  for (const x of BAY_X) for (const z of [-5.35, 5.35]) for (const s of [-1, 1]) w.mount(sconce(), x + s * 0.205, z, s > 0 ? 'fwd' : 'aft', 1.9);

  // ---------------------------------------------------------------- tables
  const K1 = kindsFirst();
  for (const [k, t] of Object.entries(K1)) f.defineProp('t_' + k, tableAsm(t.o));
  f.defineProp('chair', chairJac()).defineProp('set', setting({ cls: 'first' })).defineProp('cruet', cruet()).defineProp('menu', menuCard()).defineProp('carafe', carafeG());
  for (let i = 0; i < 3; i++) f.defineProp('vase' + i, vase({ v: i }));
  let tables = 0, seats = 0;
  const place = (x, z, k, rotated) => {
    const t = K1[k], rot = rotated ? Math.PI / 2 : 0, c = Math.cos(rot), s = Math.sin(rot);
    const tr = ([a, bb]) => [x + a * c + bb * s, z - a * s + bb * c];
    f.addProp('t_' + k, x, Y, z, rot);
    for (const seat of t.seats) {
      const [px, pz] = tr(seat.p), [nx, nz] = [seat.n[0] * c + seat.n[1] * s, -seat.n[0] * s + seat.n[1] * c];
      const out = D() < 0.07 ? 0.18 + D() * 0.12 : D() * 0.08, yaw = rotOf(-nx, -nz) + (D() - 0.5) * (out > 0.15 ? 0.7 : 0.16);
      f.addProp('chair', px + nx * (0.25 + out), Y, pz + nz * (0.25 + out), yaw);
      f.addProp('set', px - nx * 0.17, Y + 0.757, pz - nz * 0.17, rotOf(-nx, -nz) + (D() - 0.5) * 0.06);
    }
    // centre pieces: vase, cruet, menus (carafe on the larger tables), seeded offsets
    const big = !!t.long, o1 = big ? 0.42 : 0.16, sg = D() < 0.5 ? 1 : -1;
    const [vx, vz] = tr(big ? [sg * o1, 0.05] : [0.04, sg * o1]);
    f.addProp('vase' + Math.floor(D() * 3), vx, Y + 0.757, vz, D() * TAU);
    if (k !== 'r2') { const [cx, cz] = tr(big ? [-sg * o1, -0.05] : [-0.05, -sg * o1]); f.addProp('cruet', cx, Y + 0.757, cz, D() * TAU); }
    const [mx, mz] = tr(big ? [sg * 0.15, -0.18] : [0.12, -sg * 0.08]); f.addProp('menu', mx, Y + 0.757, mz, rot + (D() - 0.5) * 0.5);
    if (big) { const [qx, qz] = tr([-sg * 0.2, 0.17]); f.addProp('carafe', qx, Y + 0.757, qz); }
    tables++; seats += t.seats.length;
  };
  const tryTable = (x, z, order) => {
    for (const k of order) for (const rotated of K1[k].long ? [false] : [false]) {
      const t = K1[k], ex = rotated ? t.ez : t.ex, ez = rotated ? t.ex : t.ez;
      for (const dx of [0, -0.3, 0.3]) {
        if (!w.free(x + dx, z, ex, ez)) continue;
        place(x + dx, z, k, rotated);
        w.reserve(x + dx, z, ex, ez);
        const hx = (t.o.round ?? t.o.lx / 2), hz = (t.o.round ?? t.o.lz / 2);
        world.addCollider(x + dx - hx, Y, z - hz, x + dx + hx, Y + 0.8, z + hz);
        return true;
      }
    }
    return false;
  };
  const rows = [-9.45, -6.9, -4.15, -1.5, 1.5, 4.15, 6.9, 9.45], NX = 13, xa = x0 + 1.55, xb = x1 - 1.75;
  for (let i = 0; i < NX; i++) {
    const x = xa + ((xb - xa) * i) / (NX - 1);
    rows.forEach((z) => {
      const q = R();
      tryTable(x, z, q < 0.12 ? ['s8', 's6', 'r4', 'r2'] : q < 0.42 ? ['s6', 'r4', 'r2'] : q < 0.78 ? ['r4', 'r2'] : ['r2']);
    });
  }
  for (let i = 0; i < bays.length - 1; i++) {
    const a = bays[i], c = bays[i + 1];
    for (const s of [-1, 1]) tryTable((a + c) / 2, s * 12.45, c - a > 4.5 ? ['s8', 's6', 'r4'] : ['r4', 's6', 'r2']);
  }
  const instTris = f.tris();
  f.flush();
  (world._dStats ??= {}).dining1 = { tables, seats, chairTris: propTris(chairJac()), settingTris: propTris(setting({ cls: 'first' })), instTris, archTris };
  return { tables, seats };
}

// ================================================================= 2nd class dining saloon

export const DINING2 = { x0: -59, x1: -36 };

/** Oak screens beside the 2nd class staircase – call before plan.finish(). */
export function dining2Walls(plan) {
  const k = plan.keepouts.find((q) => q.id === 'second');
  if (!k) return;
  for (const s of [-1, 1]) plan.wall(k.x0 + 2, s * (k.z1 + 0.06), k.x1 - 2, s * (k.z1 + 0.06), { wall: 'oakPanel' });
}

/** furnish function of the 2nd class dining saloon (room x −59..−36, full width, wraps the 'second' staircase). */
export function furnishDining2(ctx) {
  const plan = ctx.plan, world = ctx.world, Y = ctx.y, TOP = Y + ctx.h, b = plan.batch, w = wctx(ctx), { x0, x1 } = DINING2;
  const HW = plan.halfWidth((x0 + x1) / 2), D = rng(1207);
  const f = new InstField(world, plan.deck);
  const t0 = b.tris, oak = M.oak;
  const stair = plan.keepouts.find((q) => q.id === 'second');

  // ---------------------------------------------------------------- architecture: oak panelling, beamed ceiling
  const run = (P, A, O, len, gaps, o = {}) => panelRun(b, { P, A, O, len, Y, TOP, gaps, mat: oak, frame: oak, back: M.oak, lozenge: false, ...o });
  run([x1 - 0.05, Y, -HW], [0, 0, 1], [-1, 0, 0], 2 * HW, w.doorGaps('fwd', 0.16).map(([a, c]) => [a + HW, c + HW]));
  const aftGaps = [...w.doorGaps('aft', 0.16), [-8.2, -6.6]].map(([a, c]) => [HW - c, HW - a]);
  run([x0 + 0.05, Y, HW], [0, 0, -1], [1, 0, 0], 2 * HW, aftGaps);
  const ports = (world._kitPorts?.D ?? []).filter((q) => q.x > x0 + 0.3 && q.x < x1 - 0.3);
  for (const s of [-1, 1]) {
    const P = [x0 + 0.05, Y, s * (HW - 0.004)], A = [1, 0, 0], O = [0, 0, -s], L = x1 - x0 - 0.1;
    run(P, A, O, L, [], { upper: false, backBands: [[Y + 0.13, Y + 0.99], [TOP - 0.46, TOP - 0.13]] });
    const pg = ports.filter((q) => Math.sign(q.z) === s).map((q) => [q.x - x0 - 0.05 - 0.36, q.x - x0 - 0.05 + 0.36]);
    run(P, A, O, L, pg, { lower: false, frieze: false, backBands: [[Y + 0.99, TOP - 0.46]] });
    for (const q of ports.filter((pp) => Math.sign(pp.z) === s)) { // oak surround of every porthole
      const zf = s * (HW - 0.01), yc = q.y ?? Y + 1.65, r = (q.r ?? 0.2) + 0.03, R2 = 0.36;
      for (const [xa, xb2, ya, yb] of [[q.x - R2, q.x + R2, yc - R2, yc - r], [q.x - R2, q.x + R2, yc + r, yc + R2], [q.x - R2, q.x - r, yc - r, yc + r], [q.x + r, q.x + R2, yc - r, yc + r]])
        b.box(oak, xa, ya, zf, xb2, yb, zf - s * 0.025, s > 0 ? 'xXyYz' : 'xXyYZ');
      for (const [ya, yb] of [[Y + 0.99, yc - R2], [yc + R2, TOP - 0.46]]) if (yb - ya > 0.01) b.poly(oak, [[q.x - R2, ya, s * (HW - 0.003)], [q.x + R2, ya, s * (HW - 0.003)], [q.x + R2, yb, s * (HW - 0.003)], [q.x - R2, yb, s * (HW - 0.003)]], [0, 0, -s]);
    }
  }
  if (stair) for (const s of [-1, 1]) { // the oak screens beside the staircase (both faces)
    const z = s * (stair.z1 + 0.06);
    run([stair.x0 + 2, Y, z + s * 0.05], [1, 0, 0], [0, 0, s], stair.x1 - stair.x0 - 4, []);
  }
  ceilingOrnaments(f, M.paintWhite, M.oak);
  strapCeiling(plan, f, { x0: x0 + 0.05, x1: x1 - 0.05, z0: -HW, z1: HW, xs: [-56.6, -54.2, -51.8, -49.4, -47, -44.6, -42.2, -39.8, -37.4], zs: [-8.4, -2.9, 2.9, 8.4], mat: oak,
    avoid: stair ? [{ x0: stair.x0 - 0.2, x1: stair.x1 + 0.2, z0: stair.z0 - 0.25, z1: stair.z1 + 0.25 }] : [], ribs: false, beamW: 0.22, beamD: 0.16 });
  const archTris = b.tris - t0;

  // ---------------------------------------------------------------- piano, sideboards, sconces
  w.put(piano({ mat: 'mahogany' }), x1 - 0.4, 0, 'aft');
  for (const z of [-4.6, 4.6]) w.put(sideboard({ w: 2.2, v: 7 }), x1 - 0.32, z, 'aft');
  for (const z of [-11.6, 11.6]) w.put(station({ w: 1.8 }), x0 + 0.3, z, 'fwd');
  for (const z of [-4, 4]) w.mount(sconce({ plain: true }), x0 + 0.06, z, 'fwd', 1.9);
  for (const s of [-1, 1]) for (let x = x0 + 2.7; x < x1 - 1; x += 5.4) w.mount(sconce({ plain: true }), x, s * (HW - 0.01), s > 0 ? 'port' : 'stbd', 1.95);

  // ---------------------------------------------------------------- long tables athwartships, swivel chairs every 0.62 m
  f.defineProp('chair', swivelJac()).defineProp('set', setting({ cls: 'second' })).defineProp('cruet', cruet()).defineProp('carafe', carafeG());
  for (let i = 0; i < 2; i++) f.defineProp('vase' + i, vase({ v: i + 1 }));
  const LENS = [5.0, 3.7];
  for (const L of LENS) f.defineProp('t' + L, tableAsm({ lx: 0.9, lz: L, lamp: false, wood: 'mahogany' }));
  let tables = 0, seats = 0;
  const longTable = (x, zc, len) => {
    if (!w.free(x, zc, 1.9, len + 0.1)) return;
    f.addProp('t' + len, x, Y, zc);
    const n = Math.floor((len - 0.1) / 0.62);
    for (let i = 0; i < n; i++) {
      const dz = -((n - 1) * 0.62) / 2 + i * 0.62;
      for (const sx of [-1, 1]) {
        const yaw = rotOf(-sx, 0) + (D() - 0.5) * 0.5; // swivel chairs stand at slightly different angles
        f.addProp('chair', x + sx * 0.72, Y, zc + dz, yaw);
        f.addProp('set', x + sx * 0.28, Y + 0.757, zc + dz, rotOf(-sx, 0) + (D() - 0.5) * 0.05);
      }
    }
    for (let k = 0; k < Math.round(len / 1.8); k++) {
      const z = zc - len / 2 + (len * (k + 0.5)) / Math.round(len / 1.8);
      f.addProp(k % 2 ? 'cruet' : 'vase' + Math.floor(D() * 2), x + (D() - 0.5) * 0.06, Y + 0.757, z, D() * TAU);
      if (k % 2 === 0) f.addProp('carafe', x + 0.06, Y + 0.757, z + 0.3);
    }
    w.reserve(x, zc, 1.9, len + 0.1); world.addCollider(x - 0.45, Y, zc - len / 2, x + 0.45, Y + 0.8, zc + len / 2);
    tables++; seats += 2 * n;
  };
  const NX = 9, xa = x0 + 2.1, xb = x1 - 1.6;
  for (let i = 0; i < NX; i++) {
    const x = xa + ((xb - xa) * i) / (NX - 1);
    for (const s of [-1, 1]) { longTable(x, s * 5.6, 5.0); longTable(x, s * 11.35, 3.7); }
  }
  const instTris = f.tris();
  f.flush();
  (world._dStats ??= {}).dining2 = { tables, seats, chairTris: propTris(swivelJac()), instTris, archTris };
  return { tables, seats };
}
