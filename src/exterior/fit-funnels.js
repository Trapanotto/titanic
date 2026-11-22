import * as THREE from 'three';
import { mats } from '../core/materials.js';
import { box } from '../core/geo.js';
import { FUNNELS, BOAT_HOUSES, BOAT_LOW_ROOFS } from '../core/constants.js';
import { BY, RY, LOW_ROOF_Y, cyl, ball, mk, Wires, roofAt } from './fit-util.js';
import { Inst, latheGeo, rivetGeo, bottleScrewGeo as TB_GEO, rodGeo as ROD_GEO, shackleGeo as SHACKLE_GEO } from './inst.js';

const SEG = 64;
const TAU = Math.PI * 2;

let _hoop = null;
const HOOP_GEO = () => (_hoop ||= new THREE.TorusGeometry(0.38, 0.014, 4, 16, Math.PI));

/**
 * Elliptical shell in the funnel's local frame (x fwd, y along the raked axis, z stbd).
 * rings: [{ ly | cut, off, s }] – `cut` = height above the boat deck of a HORIZONTAL world plane
 * (so the foot follows the roof although the funnel is raked), `off` = radial offset, `s` = scale (0 → point).
 */
function shell(a, b, rake, rings, { inward = false, flat = 0 } = {}) {
  const sr = Math.sin(rake), cr = Math.cos(rake);
  const n = SEG + 1;
  const pos = new Float32Array(rings.length * n * 3), nor = new Float32Array(rings.length * n * 3), idx = [];
  rings.forEach((ring, j) => {
    const s = ring.s ?? 1, A = (a + (ring.off || 0)) * s, B = (b + (ring.off || 0)) * s;
    for (let i = 0; i < n; i++) {
      const th = (i / SEG) * TAU, c = Math.cos(th), sn = Math.sin(th);
      const lx = A * c, lz = B * sn;
      const ly = ring.cut !== undefined ? (ring.cut - lx * sr) / cr : ring.ly;
      const k = (j * n + i) * 3;
      pos[k] = lx; pos[k + 1] = ly; pos[k + 2] = lz;
      if (flat) { nor[k + 1] = flat; } else {
        let nx = c / (a + (ring.off || 0)), nz = sn / (b + (ring.off || 0));
        const l = Math.hypot(nx, nz) * (inward ? -1 : 1);
        nor[k] = nx / l; nor[k + 2] = nz / l;
      }
    }
  });
  for (let j = 0; j < rings.length - 1; j++) for (let i = 0; i < SEG; i++) {
    const p0 = j * n + i, p1 = p0 + 1, p2 = p0 + n, p3 = p2 + 1;
    if (inward || flat < 0) idx.push(p0, p1, p2, p1, p3, p2); else idx.push(p0, p2, p1, p1, p2, p3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}

/** Snap a stay anchor to the nearest roof (house or raised roof) so wires do not end in a walkway. */
function stayAnchor(x, s) {
  let best = null;
  for (const h of [...BOAT_HOUSES.map((o) => ({ ...o, y: RY })), ...BOAT_LOW_ROOFS.map((o) => ({ ...o, y: LOW_ROOF_Y }))]) {
    const cx = Math.max(h.x0 + 0.4, Math.min(h.x1 - 0.4, x));
    const d = Math.abs(cx - x);
    if (d < 3 && (!best || d < best.d)) best = { d, x: cx, y: h.y, z: s * Math.min(6.4, h.hw - 0.35) };
  }
  return best || { x, y: BY, z: s * 6.4 };
}

export function buildFunnels(world, parent) {
  const root = new THREE.Group(); root.name = 'funnels';
  parent.add(root);
  world.markForBake(root);
  const stays = new Wires(mats.iron);
  const tb = new Inst();
  const rivetXf = [];
  const tops = [];
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _n = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);
  const UP = new THREE.Vector3(0, 1, 0);

  FUNNELS.forEach((F, fi) => {
    const { a, b, rake } = F;
    const L = F.height / Math.cos(rake);          // length along the axis (top is F.height above the boat deck)
    const LB = L * 0.755;                           // buff / black boundary
    const cut = RY - BY - 0.06;                     // foot plane (just inside the roof plating)
    const dummy = fi === 3;
    const g = new THREE.Group(); g.name = 'funnel' + (fi + 1);
    g.position.set(F.x, BY, 0); g.rotation.z = rake;
    root.add(g);
    g.updateMatrix();
    const sr = Math.sin(rake), cr = Math.cos(rake);
    const W = (lx, ly, lz) => [F.x + lx * cr - ly * sr, BY + lx * sr + ly * cr, lz];
    const add = (geo, mat, cast = false) => { const m = mk(geo, mat, 0, 0, 0, cast); g.add(m); return m; };

    // --- shell ---
    add(shell(a, b, rake, [{ cut, off: 0 }, { ly: L * 0.25 }, { ly: L * 0.5 }, { ly: LB }]), mats.funnelBuff, true);
    add(shell(a, b, rake, [{ ly: LB }, { ly: L }]), mats.funnelBlack, true);
    // base collar / coaming on the roof
    add(shell(a, b, rake, [{ cut, off: 0.14 }, { cut: cut + 0.55, off: 0.14 }, { cut: cut + 0.62, off: 0 }]), mats.funnelBuff);
    add(shell(a, b, rake, [{ cut: cut + 0.08, off: 0.5 }, { cut: cut + 0.08, off: 0.1 }], { flat: 1 }), mats.steelDark);
    add(shell(a, b, rake, [{ cut, off: 0.5 }, { cut: cut + 0.08, off: 0.5 }]), mats.steelDark);
    // top: rolled rim, flat lip, inner lining and the dark uptake
    add(shell(a, b, rake, [{ ly: L - 0.3, off: 0 }, { ly: L - 0.26, off: 0.07 }, { ly: L, off: 0.07 }]), mats.funnelBlack);
    add(shell(a, b, rake, [{ ly: L, off: 0.07 }, { ly: L, off: -0.28 }], { flat: 1 }), mats.funnelBlack);
    add(shell(a, b, rake, [{ ly: L - 4.2, off: -0.28 }, { ly: L, off: -0.28 }], { inward: true }), mats.funnelBlack);
    add(shell(a, b, rake, [{ ly: L - 4.2, off: -0.28 }, { ly: L - 4.2, s: 0 }], { flat: 1 }), mats.iron);
    if (!dummy) {
      // inner uptake flue with soot-black mouth
      const fa = a * 0.58 - a, fb = fa; // same radial offset for both axes
      add(shell(a, b, rake, [{ ly: L - 4.2, off: fa }, { ly: L - 0.45, off: fb }]), mats.iron);
      add(shell(a, b, rake, [{ ly: L - 0.45, off: fa }, { ly: L - 0.45, off: fa - 0.12 }], { flat: 1 }), mats.iron);
      add(shell(a, b, rake, [{ ly: L - 4.2, off: fa - 0.12 }, { ly: L - 0.45, off: fa - 0.12 }], { inward: true }), mats.funnelBlack);
      add(shell(a, b, rake, [{ ly: L - 2.4, off: fa - 0.12 }, { ly: L - 2.4, s: 0 }], { flat: 1 }), mats.funnelBlack);
      // bracing between flue and shell
      for (let k = 0; k < 6; k++) {
        const th = (k / 6) * TAU + 0.3;
        g.add(cyl(mats.iron, (a + fa) * Math.cos(th), L - 1.2, (b + fb) * Math.sin(th), (a - 0.28) * Math.cos(th), L - 1.2, (b - 0.28) * Math.sin(th), 0.04, 5));
      }
    } else {
      // funnel 4: dummy – galley / smoking-room flue and ventilation trunk only
      g.add(cyl(mats.iron, 0.9, L - 4.2, 0, 0.9, L - 0.3, 0, 0.42, 10, 0.42, false, true));
      g.add(cyl(mats.iron, -1.2, L - 4.2, 0.4, -1.2, L - 0.5, 0.4, 0.26, 8, 0.26, false, true));
      for (let k = 0; k < 4; k++) g.add(box(mats.iron, 2 * a - 0.7, 0.06, 0.08, 0, L - 2.2, -1.5 + k));
    }

    // --- riveted seam bands ---
    const bands = [0.2, 0.345, 0.49, 0.635].map((f) => f * L);
    for (const ly of bands) {
      add(shell(a, b, rake, [{ ly: ly - 0.09, off: 0 }, { ly: ly - 0.075, off: 0.03 }, { ly: ly + 0.075, off: 0.03 }, { ly: ly + 0.09, off: 0 }]), mats.funnelBuff);
      for (const dy of [-0.04, 0.04]) for (let i = 0; i < 80; i++) rivetXf.push([g.matrix, a + 0.03, b + 0.03, ((i + (dy > 0 ? 0.5 : 0)) / 80) * TAU, ly + dy]);
    }
    // vertical plate seams (rivet rows) on the buff part
    for (let k = 0; k < 8; k++) {
      const th = ((k + 0.5) / 8) * TAU;
      for (let ly = cut + 1.2; ly < LB - 0.2; ly += 0.22) {
        const lyy = ly + (k % 2) * 0.11;
        if (bands.some((bl) => Math.abs(bl - lyy) < 0.15)) continue;
        rivetXf.push([g.matrix, a, b, th, lyy]);
      }
    }
    // stay band (just below the black top) and a band on the black part
    const LS = L * 0.72;
    add(shell(a, b, rake, [{ ly: LS - 0.1, off: 0 }, { ly: LS - 0.08, off: 0.045 }, { ly: LS + 0.08, off: 0.045 }, { ly: LS + 0.1, off: 0 }]), mats.funnelBuff);
    add(shell(a, b, rake, [{ ly: L * 0.875 - 0.08, off: 0 }, { ly: L * 0.875 - 0.06, off: 0.03 }, { ly: L * 0.875 + 0.06, off: 0.03 }, { ly: L * 0.875 + 0.08, off: 0 }]), mats.funnelBlack);

    // --- pipes on the shell ---
    const pipe = (th, ly0, ly1, r, mat = mats.funnelBuff, gap = 0.07) => {
      const px = (a + r + gap) * Math.cos(th), pz = (b + r + gap) * Math.sin(th);
      const y0 = ly0 ?? (cut - px * sr) / cr;
      // split at the colour boundary so the pipe is painted like the funnel
      if (mat === mats.funnelBuff && ly1 > LB) {
        g.add(cyl(mats.funnelBuff, px, y0, pz, px, LB, pz, r, 8));
        g.add(cyl(mats.funnelBlack, px, LB, pz, px, ly1, pz, r, 8));
      } else g.add(cyl(mat, px, y0, pz, px, ly1, pz, r, 8));
      for (let ly = y0 + 1.5; ly < ly1 - 0.4; ly += 3.1) { // clamps
        const m = box(ly > LB ? mats.funnelBlack : mats.funnelBuff, r + gap + 0.04, 0.07, 2 * r + 0.08, 0, 0, 0);
        m.position.set((a + (r + gap) / 2) * Math.cos(th), ly, (b + (r + gap) / 2) * Math.sin(th));
        m.rotation.y = -Math.atan2(Math.sin(th) / b, Math.cos(th) / a);
        g.add(m);
        const ring = mk(new THREE.TorusGeometry(r + 0.012, 0.016, 4, 12), ly > LB ? mats.funnelBlack : mats.funnelBuff, px, ly, pz);
        ring.rotation.x = Math.PI / 2; g.add(ring);
      }
      return [px, pz];
    };
    const LW = L * 0.6; // whistle platform height
    if (!dummy) {
      pipe(-0.3, null, L + 0.25, 0.1);                 // waste steam pipe (safety valves), forward port
      const [wx, wz] = pipe(0.3, null, LW + 0.45, 0.065); // whistle steam pipe
      pipe(Math.PI - 0.22, null, L + 0.2, 0.09);       // escape pipes on the after side
      pipe(Math.PI + 0.22, null, L + 0.2, 0.09);
      // --- whistle platform with triple-chime whistle ---
      const px = a + 0.62;
      const xs = (z) => a * Math.sqrt(Math.max(0, 1 - (z / b) ** 2)) * Math.cos(Math.PI / SEG) - 0.02; // shell surface (inside the polygon)
      const pin = xs(1.0); // platform reaches back into the elliptical shell so it bears against it everywhere
      g.add(box(mats.steelFloor, px + 0.475 - pin, 0.05, 2.0, (px + 0.475 + pin) / 2, LW, 0));
      for (const z of [-0.95, 0.95]) g.add(cyl(mats.iron, xs(z * 0.8), LW - 0.75, z * 0.8, px + 0.4, LW - 0.03, z, 0.03, 5));
      for (const z of [-0.98, -0.33, 0.33, 0.98]) g.add(cyl(mats.iron, px + 0.45, LW, z, px + 0.45, LW + 1.0, z, 0.02, 5));
      for (const h of [0.5, 1.0]) g.add(cyl(mats.iron, px + 0.45, LW + h, -0.98, px + 0.45, LW + h, 0.98, 0.018, 5));
      for (const z of [-0.98, 0.98]) for (const h of [0.5, 1.0]) g.add(cyl(mats.iron, px + 0.45, LW + h, z, xs(z), LW + h, z, 0.018, 5));
      // manifold + three bells (large centre, two small)
      g.add(cyl(mats.brass, wx, LW + 0.45, wz, px + 0.05, LW + 0.45, 0.2, 0.05, 6));
      g.add(cyl(mats.brass, px + 0.05, LW + 0.45, -0.42, px + 0.05, LW + 0.45, 0.42, 0.06, 6));
      // valve chest with lever and lanyard, then three cast bells (chime whistle)
      g.add(box(mats.brass, 0.22, 0.2, 1.0, px + 0.05, LW + 0.38, 0));
      g.add(cyl(mats.brass, px + 0.05, LW + 0.38, -0.52, px + 0.05, LW + 0.38, 0.52, 0.07, 10));
      g.add(cyl(mats.iron, px + 0.05, LW + 0.5, 0.2, px - 0.45, LW + 0.62, 0.2, 0.015, 4));
      stays.seg(...W(px - 0.45, LW + 0.62, 0.2), ...W(px + 0.3, LW - 0.1, 0.9), 0.006);
      const bell = (z, r, h) => {
        const wb = mk(latheGeo('whistle', [[0.55, 0], [0.62, 0.06], [0.55, 0.12], [0.5, 0.15], [0.5, 0.92], [0.55, 0.95], [0.5, 1.0], [0.38, 1.08], [0.2, 1.14], [0.08, 1.2], [0.06, 1.3], [0.001, 1.32]], 16), mats.brass, px + 0.05, LW + 0.52, z);
        wb.scale.set(r * 1.8, h, r * 1.8); g.add(wb);
        g.add(cyl(mats.brass, px + 0.05, LW + 0.44, z, px + 0.05, LW + 0.5, z, r * 0.45, 8));
        g.add(cyl(mats.iron, px + 0.05, LW + 0.5, z, px + 0.05, LW + 0.52, z, r * 0.48, 12));       // dark mouth gap
      };
      bell(0, 0.19, 0.62); bell(-0.42, 0.12, 0.4); bell(0.42, 0.12, 0.4);
    } else {
      pipe(Math.PI, null, L + 0.15, 0.08);
      pipe(0, null, LB - 1, 0.06);
    }

    // --- ladder on the forward face (port of the centreline), up to the rim ---
    const lth = dummy ? 0.5 : -0.62;
    const lxr = (a + 0.11) * Math.cos(lth), lzr = (b + 0.11) * Math.sin(lth);
    const ly0 = (cut - lxr * sr) / cr;
    const tx = -Math.sin(lth) * a, tz = Math.cos(lth) * b, tl = Math.hypot(tx, tz);
    const ux = (tx / tl) * 0.19, uz = (tz / tl) * 0.19;
    const yaw = -Math.atan2(uz, ux);
    for (const sgn of [-1, 1]) {
      g.add(cyl(mats.funnelBuff, lxr + ux * sgn, ly0, lzr + uz * sgn, lxr + ux * sgn, LB, lzr + uz * sgn, 0.022, 5));
      g.add(cyl(mats.funnelBlack, lxr + ux * sgn, LB, lzr + uz * sgn, lxr + ux * sgn, L - 0.1, lzr + uz * sgn, 0.022, 5));
    }
    for (let ly = ly0 + 0.35; ly < L - 0.2; ly += 0.36) {
      const m = box(ly > LB ? mats.funnelBlack : mats.funnelBuff, 0.38, 0.03, 0.03, lxr, ly, lzr);
      m.rotation.y = yaw; g.add(m);
    }
    // safety cage: hoops + vertical straps from 3 m above the roof
    {
      const nx = Math.cos(lth) / a, nz = Math.sin(lth) / b, nl = Math.hypot(nx, nz), ox = nx / nl, oz = nz / nl;
      const hy0 = ly0 + 3.0;
      for (let ly = hy0; ly < L - 0.3; ly += 0.9) {
        const mat = ly > LB ? mats.funnelBlack : mats.funnelBuff;
        const hoop = mk(HOOP_GEO(), mat, lxr + ox * 0.05, ly, lzr + oz * 0.05);
        hoop.rotation.set(Math.PI / 2, 0, 0); hoop.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), Math.atan2(ox, oz));
        g.add(hoop);
      }
      for (const an of [-1.2, 0, 1.2]) {
        const tx2 = -oz, tz2 = ox;
        const cx = lxr + ox * 0.05 + (ox * Math.cos(an) + tx2 * Math.sin(an)) * 0.38, cz = lzr + oz * 0.05 + (oz * Math.cos(an) + tz2 * Math.sin(an)) * 0.38;
        const y1 = Math.min(LB, L - 0.3), mat = mats.funnelBuff;
        g.add(cyl(mat, cx, hy0, cz, cx, y1, cz, 0.012, 4));
        if (L - 0.3 > LB) g.add(cyl(mats.funnelBlack, cx, LB, cz, cx, L - 0.3, cz, 0.012, 4));
      }
    }

    // --- stays: 4 per side from the stay band to the roofs ---
    const topX = F.x - LS * sr;
    [[0.62, 7.4], [1.22, 2.9], [1.92, -2.9], [2.52, -7.4]].forEach(([th, dx]) => {
      for (const s of [-1, 1]) {
        const p = W((a + 0.06) * Math.cos(th), LS, (b + 0.06) * Math.sin(th) * s);
        const an = stayAnchor(topX + dx, s);
        stays.seg(p[0], p[1], p[2], an.x, an.y + 0.25, an.z, 0.02);
        // bottle screw (open frame, two threaded ends), shackle and eye pad on the roof
        const q = [an.x, an.y + 0.25, an.z], dl = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
        const at = (d) => [q[0] + ((p[0] - q[0]) * d) / dl, q[1] + ((p[1] - q[1]) * d) / dl, q[2] + ((p[2] - q[2]) * d) / dl];
        const b0 = at(0.32), b1 = at(0.72);
        tb.between(TB_GEO(), mats.iron, b0, b1);
        tb.between(ROD_GEO(), mats.iron, at(0.05), b0, 1);
        tb.between(SHACKLE_GEO(), mats.iron, q, at(0.08));
        root.add(box(mats.iron, 0.26, 0.05, 0.16, an.x, an.y + 0.025, an.z));
        root.add(box(mats.iron, 0.04, 0.2, 0.12, an.x, an.y + 0.12, an.z));
        // eye band lug on the funnel with a shackle
        const e = box(mats.funnelBuff, 0.16, 0.2, 0.06, 0, 0, 0); e.position.set(p[0], p[1], p[2]); e.lookAt(an.x, an.y, an.z); root.add(e);
        tb.between(SHACKLE_GEO(), mats.iron, p, [p[0] + (an.x - p[0]) * 0.02, p[1] + (an.y - p[1]) * 0.02, p[2] + (an.z - p[2]) * 0.02]);
      }
    });

    // --- fidley gratings / stokehold vent trunks on the roof beside the working funnels ---
    for (const s of [-1, 1]) {
      const fx = F.x - 0.6, fz = s * 4.95;
      if (roofAt(fx, fz) !== RY) continue;
      if (!dummy) {
        root.add(box(mats.paintWhite, 3.2, 0.36, 1.5, fx, RY + 0.18, fz));
        root.add(box(mats.steelFloor, 3.0, 0.05, 1.3, fx, RY + 0.385, fz));
        for (let k = -3; k <= 3; k++) root.add(box(mats.iron, 0.04, 0.03, 1.3, fx + k * 0.42, RY + 0.42, fz));
      }
    }

    if (fi < 3) { const t = W(0, L, 0); tops.push({ x: t[0], y: t[1], z: t[2] }); }
  });

  // rivets (one instanced mesh for all funnels)
  const rg = rivetGeo(0.026);
  const rivets = new THREE.InstancedMesh(rg, mats.funnelBuff, rivetXf.length);
  rivets.name = 'funnelRivets';
  rivetXf.forEach(([gm, A, B, th, ly], i) => {
    const c = Math.cos(th), s = Math.sin(th);
    _p.set(A * c, ly, B * s);
    _n.set(c / A, 0, s / B).normalize();
    _q.setFromUnitVectors(UP, _n);
    _m.compose(_p, _q, _s).premultiply(gm);
    rivets.setMatrixAt(i, _m);
  });
  rivets.instanceMatrix.needsUpdate = true;
  rivets.computeBoundingSphere?.();
  root.add(rivets);
  root.add(stays.build('funnelStays'));
  tb.build(root, 'funnelStayFittings');

  world.funnelTops = tops;

  world.addInfo({
    title: 'Die vier Schornsteine',
    text: 'Jeder Schornstein war rund 19 m hoch, im Querschnitt elliptisch (7,5 m × 5,8 m) und wie die Masten leicht nach achtern geneigt. Nur die vorderen drei führten die Rauchgase der 29 Kessel ab und trugen die Dampfpfeifen. Der vierte war eine Attrappe: Er diente der Belüftung von Maschinenraum und Küchen – und ließ das Schiff mächtiger und schneller wirken.',
    x: 3, y: BY + 1.2, z: 9.6, radius: 5,
  });
  return {};
}
