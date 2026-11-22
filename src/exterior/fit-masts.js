import * as THREE from 'three';
import { mats, canvasTexture } from '../core/materials.js';
import { box } from '../core/geo.js';
import { FUNNELS, MASTS, DECK_Y, SHIP } from '../core/constants.js';
import { BY, RY, cyl, vcyl, ball, lathe, Wires, edge, innerCylGeo } from './fit-util.js';
import { Inst, merge, boxG, cylG, bottleScrewGeo as BSCREW, rodGeo as ROD, shackleGeo as SHACKLE } from './inst.js';

let _block = null, _sheave = null, _cleat = null;
const BLOCK = () => (_block ||= merge([boxG(0.03, 0.3, 0.16, -0.05, 0, 0), boxG(0.03, 0.3, 0.16, 0.05, 0, 0), boxG(0.13, 0.04, 0.05, 0, 0.16, 0), cylG([0, 0.18, 0], [0, 0.3, 0], 0.015, 5)]));
const SHEAVE = () => (_sheave ||= merge([cylG([-0.035, 0, 0], [0.035, 0, 0], 0.075, 10), cylG([-0.07, 0, 0], [0.07, 0, 0], 0.015, 5), new THREE.TorusGeometry(0.04, 0.012, 4, 8, Math.PI * 1.3).rotateZ(Math.PI).translate(0, -0.2, 0), cylG([0, -0.15, 0], [0, -0.2, 0], 0.012, 4)]));
const CLEAT = () => (_cleat ||= merge([boxG(0.05, 0.05, 0.36, 0, 0.07, 0), boxG(0.05, 0.07, 0.05, 0, 0.035, -0.07), boxG(0.05, 0.07, 0.05, 0, 0.035, 0.07)]));

const RAKE = FUNNELS[0].rake;
const TAN = Math.tan(RAKE);

// ---------- flags (module-level materials, created once) ----------
function star(ctx, cx, cy, R) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? R * 0.4 : R, an = -Math.PI / 2 + (i * Math.PI) / 5;
    ctx[i ? 'lineTo' : 'moveTo'](cx + Math.cos(an) * r, cy + Math.sin(an) * r);
  }
  ctx.closePath(); ctx.fill();
}
const houseFlagTex = canvasTexture(256, 1, (ctx, s) => {
  ctx.fillStyle = '#c8141e'; ctx.fillRect(0, 0, s, s);
  ctx.fillStyle = '#ffffff'; star(ctx, s * 0.36, s * 0.5, s * 0.3);
  // swallowtail: cut a notch out of the fly
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath(); ctx.moveTo(s, s * 0.04); ctx.lineTo(s * 0.62, s * 0.5); ctx.lineTo(s, s * 0.96); ctx.closePath(); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
}, 51);
const ensignTex = canvasTexture(256, 1, (ctx, s) => {
  ctx.fillStyle = '#16245f'; ctx.fillRect(0, 0, s, s);
  const w = s / 2, h = s / 2; // canton
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
  ctx.fillStyle = '#1b2f7a'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = h * 0.2;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w, h); ctx.moveTo(w, 0); ctx.lineTo(0, h); ctx.stroke();
  ctx.strokeStyle = '#c8141e'; ctx.lineWidth = h * 0.07;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w, h); ctx.moveTo(w, 0); ctx.lineTo(0, h); ctx.stroke();
  ctx.fillStyle = '#ffffff'; ctx.fillRect(w * 0.5 - h * 0.17, 0, h * 0.34, h); ctx.fillRect(0, h * 0.33, w, h * 0.34);
  ctx.fillStyle = '#c8141e'; ctx.fillRect(w * 0.5 - h * 0.1, 0, h * 0.2, h); ctx.fillRect(0, h * 0.4, w, h * 0.2);
  ctx.restore();
}, 53);
const flagOpts = { roughness: 0.95, side: THREE.DoubleSide };
const houseFlagMat = new THREE.MeshStandardMaterial({ map: houseFlagTex, alphaTest: 0.5, ...flagOpts });
houseFlagMat.name = 'fitHouseFlag';
const ensignMat = new THREE.MeshStandardMaterial({ map: ensignTex, ...flagOpts });
ensignMat.name = 'fitBlueEnsign';

/** Waving flag: hoist at the local origin edge, streaming towards -x (aft). */
function makeFlag(mat, w, h, x, y, z, phase) {
  const nx = 36, ny = 14;
  const geo = new THREE.PlaneGeometry(w, h, nx, ny);
  const p = geo.attributes.position, uv = geo.attributes.uv;
  const u = new Float32Array(p.count), by = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) {
    u[i] = uv.getX(i);
    by[i] = p.getY(i);
    p.setXYZ(i, -u[i] * w, by[i], 0);
  }
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.userData.noMerge = true;
  m.frustumCulled = false;
  m.name = 'flag';
  const update = (t) => {
    for (let i = 0; i < p.count; i++) {
      const uu = u[i], ph = uu * 7.5 - t * 5.2 + phase + by[i] * 0.9;
      p.setZ(i, uu * (0.16 * Math.sin(ph) + 0.07 * Math.sin(ph * 2.3 + 1.7)) * w * 0.5);
      p.setY(i, by[i] - uu * uu * 0.1 * w + uu * 0.035 * Math.cos(ph * 1.2) * w);
      p.setX(i, -uu * w * (0.965 + 0.02 * Math.sin(ph * 0.5)));
    }
    p.needsUpdate = true;
    geo.computeVertexNormals();
  };
  update(0);
  return { mesh: m, update };
}

export function buildMasts(world, parent) {
  const root = new THREE.Group(); root.name = 'masts';
  parent.add(root);
  world.markForBake(root);
  const rig = new Wires(mats.iron);       // steel wire rigging
  const rope = new Wires(mats.rope);      // halyards, aerial
  const flags = [];
  const steel = mats.funnelBuff;          // masts were painted a buff "mast colour"
  const P = (M, y) => M.x - (y - M.baseY) * TAN;

  const lowerMast = (M, yTop, r0, r1) => {
    root.add(cyl(steel, M.x, M.baseY - 0.05, 0, P(M, yTop), yTop, 0, r0, 16, r1, true));
    // riveted strake bands
    for (let y = M.baseY + 3; y < yTop - 1; y += 3) {
      const r = r0 + ((r1 - r0) * (y - M.baseY)) / (yTop - M.baseY) + 0.012;
      root.add(cyl(steel, P(M, y - 0.07), y - 0.07, 0, P(M, y + 0.07), y + 0.07, 0, r, 16));
    }
    // mast foot: partner ring, wedges and collar
    root.add(vcyl(mats.steelDark, M.x, M.baseY, 0, 0.35, r0 + 0.22, 12, r0 + 0.1));
    root.add(vcyl(mats.steelDark, M.x, M.baseY, 0, 0.06, r0 + 0.5, 12));
    for (let k = 0; k < 8; k++) root.add(vcyl(mats.iron, M.x + Math.cos(k * 0.785) * (r0 + 0.38), M.baseY + 0.05, Math.sin(k * 0.785) * (r0 + 0.38), 0.05, 0.035, 6));
    world.addCollider(M.x - r0 - 0.25, M.baseY, -r0 - 0.2, M.x + r0 + 0.2, M.baseY + 3, r0 + 0.2);
  };
  const topMast = (M, y0, yTop) => {
    root.add(cyl(mats.oak, P(M, y0), y0, 0, P(M, yTop), yTop, 0, 0.19, 10, 0.075, true));
    // doubling: cap + hounds band
    root.add(cyl(mats.iron, P(M, y0 + 0.2), y0 + 0.2, 0, P(M, y0 + 0.5), y0 + 0.5, 0, 0.36, 10));
    root.add(cyl(mats.iron, P(M, y0 + 1.6), y0 + 1.6, 0, P(M, y0 + 1.85), y0 + 1.85, 0, 0.33, 10));
    root.add(ball(mats.gold, P(M, yTop), yTop + 0.06, 0, 0.11, 8, 6, 0.6)); // truck
  };
  const rungs = (M, y0, y1, side) => { // iron rungs up the mast
    for (let y = y0; y < y1; y += 0.38) {
      const r = 0.48 - 0.006 * (y - M.baseY);
      const x = P(M, y) + side * (r + 0.07);
      root.add(box(mats.iron, 0.025, 0.025, 0.36, x, y, 0));
      root.add(box(mats.iron, 0.09, 0.02, 0.02, x - side * 0.04, y, -0.17));
      root.add(box(mats.iron, 0.09, 0.02, 0.02, x - side * 0.04, y, 0.17));
    }
  };
  const fit = new Inst();
  const deadeye = (x, y, z, tx, ty, tz) => { // bottle screw + shackle + chain plate at the foot of a shroud
    const dx = tx - x, dy = ty - y, dz = tz - z, l = Math.hypot(dx, dy, dz);
    const at = (d) => [x + (dx * d) / l, y + (dy * d) / l, z + (dz * d) / l];
    fit.between(SHACKLE(), mats.iron, [x, y + 0.06, z], at(0.14));
    fit.between(BSCREW(), mats.iron, at(0.14), at(0.62));
    fit.between(ROD(), mats.iron, at(0.62), at(0.9), 0.8);
    root.add(box(mats.iron, 0.2, 0.06, 0.16, x, y + 0.03, z));
    root.add(box(mats.iron, 0.04, 0.16, 0.12, x, y + 0.08, z));
  };
  const block = (x, y, z, s = 1) => { // rigging block: two cheeks, sheave, hook
    fit.at(BLOCK(), mats.woodDark, x, y, z, null, s);
    fit.at(SHEAVE(), mats.iron, x, y, z, null, s);
  };

  // =================== FOREMAST ===================
  const FM = MASTS[0];
  const fTop1 = 52.5;
  lowerMast(FM, fTop1, 0.48, 0.3);
  topMast(FM, fTop1 - 2.2, FM.topY);
  rungs(FM, FM.baseY + 0.6, FM.baseY + 14.6, -1);

  // crow's nest ~15 m above the forecastle deck, on the forward face
  const yN = FM.baseY + 15, xN = P(FM, yN) + 0.42;
  {
    const R = 0.82, H = 1.25;
    const out = cyl(steel, xN, yN, 0, xN, yN + H, 0, R, 16, R, true, true); root.add(out);
    const inn = new THREE.Mesh(innerCylGeo(16), mats.paintWhite); inn.scale.set(R - 0.03, H - 0.05, R - 0.03); inn.position.set(xN, yN + 0.06 + (H - 0.05) / 2, 0); root.add(inn);
    root.add(vcyl(mats.pine, xN, yN, 0, 0.06, R - 0.02, 16));
    const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.035, 5, 20), steel); rim.rotation.x = Math.PI / 2; rim.position.set(xN, yN + H, 0); root.add(rim);
    const rim2 = new THREE.Mesh(rim.geometry, steel); rim2.rotation.x = Math.PI / 2; rim2.position.set(xN, yN + 0.02, 0); root.add(rim2);
    // support brackets under the nest
    for (const z of [-0.5, 0.5]) root.add(cyl(steel, xN + 0.5, yN, z, P(FM, yN - 1.1) + 0.3, yN - 1.1, z * 0.4, 0.04, 5));
    // bell above the nest + telephone box inside
    const xb = P(FM, yN + 2.0) + 0.75;
    root.add(cyl(mats.iron, P(FM, yN + 2.25) + 0.3, yN + 2.25, 0, xb, yN + 2.25, 0, 0.025, 5));
    root.add(lathe(mats.brass, [[0.185, 0], [0.12, 0.12], [0.1, 0.26], [0.06, 0.33], [0.015, 0.34]], 10, xb, yN + 1.9, 0));
    root.add(ball(mats.iron, xb, yN + 1.9, 0, 0.04, 6, 4));
    root.add(box(mats.oak, 0.14, 0.3, 0.22, xN - 0.25, yN + 0.75, 0.62));
    root.add(cyl(mats.iron, xN - 0.25, yN + 0.9, 0.62, xN - 0.25, yN + 1.0, 0.72, 0.02, 4));            // telephone mouthpiece
    // canvas weather apron laced round the top of the nest on short iron stanchions
    const ap = cyl(mats.canvas, xN, yN + H + 0.02, 0, xN, yN + H + 0.48, 0, R + 0.03, 20, R + 0.05, false, true); ap.material = mats.canvas; root.add(ap);
    const api = new THREE.Mesh(innerCylGeo(16), mats.canvas); api.scale.set(R + 0.02, 0.46, R + 0.02); api.position.set(xN, yN + H + 0.25, 0); root.add(api);
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; root.add(vcyl(mats.iron, xN + Math.cos(a) * (R + 0.06), yN + H, Math.sin(a) * (R + 0.06), 0.5, 0.012, 4)); }
    root.add(new THREE.Mesh(new THREE.TorusGeometry(R + 0.06, 0.012, 4, 20).rotateX(Math.PI / 2).translate(xN, yN + H + 0.5, 0), mats.iron));
    // opening in the after side of the mast (access from the internal ladder)
    root.add(box(mats.iron, 0.05, 0.9, 0.5, P(FM, yN + 0.45) - 0.47, yN + 0.45, 0));
  }
  // masthead (steaming) light on a bracket
  {
    const yL = FM.baseY + 22.5, xL = P(FM, yL) + 0.62;
    root.add(box(steel, 0.5, 0.05, 0.4, xL - 0.1, yL - 0.2, 0));
    root.add(vcyl(mats.brass, xL, yL - 0.17, 0, 0.36, 0.13, 8));
    root.add(vcyl(mats.lampGlow, xL + 0.03, yL - 0.1, 0, 0.22, 0.125, 8));
    root.add(ball(mats.brass, xL, yL + 0.2, 0, 0.13, 8, 4, 0.5));
  }
  // cargo derrick for hatch No. 1, stepped at the mast foot
  const boom = (M, dir, len, elev, guyZ) => {
    const gx = M.x + dir * 0.62, gy = M.baseY + 1.5;
    const tx = gx + dir * Math.cos(elev) * len, ty = gy + Math.sin(elev) * len;
    root.add(cyl(steel, gx, gy, 0, tx, ty, 0, 0.17, 10, 0.1, true));
    root.add(box(mats.iron, 0.5, 0.3, 0.4, M.x + dir * 0.45, gy, 0));           // gooseneck
    root.add(cyl(mats.iron, tx, ty, 0, tx + dir * 0.12, ty + 0.1, 0, 0.13, 8)); // head band
    const yTL = M.baseY + len * 1.25;
    rig.seg(tx, ty, 0, P(M, yTL), yTL, 0, 0.018);                                // topping lift
    block(tx, ty - 0.35, 0);                                                      // cargo block
    block(P(M, yTL) + dir * 0.3, yTL - 0.4, 0);                                   // topping lift block at the mast
    rope.seg(tx, ty - 0.5, 0, tx, ty - 3.2, 0, 0.014);
    root.add(ball(mats.iron, tx, ty - 3.3, 0, 0.09, 8, 6));                      // hook weight (ball)
    root.add(new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.018, 4, 10, Math.PI * 1.4).rotateZ(Math.PI * 1.1), mats.iron)).children.at(-1).position.set(tx, ty - 3.5, 0);
    // heel fitting: gooseneck pin + band on the mast, steel derrick table
    root.add(cyl(mats.iron, M.x + dir * 0.45, gy - 0.25, 0, M.x + dir * 0.45, gy + 0.25, 0, 0.05, 8));
    root.add(cyl(steel, P(M, gy - 0.3), gy - 0.3, 0, P(M, gy - 0.18), gy - 0.18, 0, 0.56, 16));
    // derrick head: band with eyes
    for (const s of [-1, 1]) root.add(cyl(mats.iron, tx, ty, 0, tx - dir * 0.05, ty + 0.05, s * 0.12, 0.02, 4));
    rope.seg(tx, ty - 0.3, 0, gx + dir * 0.3, gy + 0.3, 0, 0.012);               // runner back to the winch
    for (const s of [-1, 1]) rig.seg(tx, ty, 0, tx - dir * 2.5, M.baseY + 0.3, s * guyZ, 0.012); // guys
  };
  boom(FM, 1, 10.5, 0.62, 5.8);

  // standing rigging of the foremast
  const yFS = 50.2;
  const ratlines = (shrouds, y0, y1) => { // rope rungs seized across the shrouds
    const at = (sh, y) => { const [x, yb, z, tx, ty, tz] = sh, f = (y - yb) / (ty - yb); return [x + (tx - x) * f, y, z + (tz - z) * f]; };
    for (let y = y0; y < y1; y += 0.38) {
      for (let k = 0; k < shrouds.length - 1; k++) {
        const a = at(shrouds[k], y), b = at(shrouds[k + 1], y);
        rope.seg(a[0], a[1], a[2], b[0], b[1] - 0.012, b[2], 0.009);
      }
    }
  };
  for (const s of [-1, 1]) {
    const shr = [];
    [98.7, 97.5, 96.3, 95.1].forEach((x, i) => {
      const z = s * (edge(x) - 0.42), tx = P(FM, yFS) + 0.1 * i, ty = yFS - 0.25 * i, tz = s * 0.3;
      rig.seg(x, FM.baseY + 0.05, z, tx, ty, tz, 0.022);
      deadeye(x, FM.baseY + 0.05, z, tx, ty, tz);
      shr.push([x, FM.baseY + 0.05, z, tx, ty, tz]);
    });
    ratlines(shr, FM.baseY + 1.6, FM.baseY + 14.6);
    // topmast backstays to the well-deck bulwarks
    [87.5, 85.5].forEach((x, i) => {
      const z = s * (edge(x) - 0.45);
      rig.seg(x, DECK_Y.C + 1.15, z, P(FM, 60.3 - i * 0.6), 60.3 - i * 0.6, s * 0.12, 0.016);
      deadeye(x, DECK_Y.C + 0.3, z, x, DECK_Y.C + 1.3, z);
    });
  }
  rig.seg(P(FM, 51.2) + 0.3, 51.2, 0, SHIP.bowX - 1.3, FM.baseY + 0.5, 0, 0.026);  // forestay to the stem
  rig.seg(P(FM, 60.8), 60.8, 0, SHIP.bowX - 2.6, FM.baseY + 0.4, 0, 0.016);       // fore topmast stay
  root.add(box(mats.iron, 0.3, 0.5, 0.12, SHIP.bowX - 1.3, FM.baseY + 0.25, 0));
  root.add(box(mats.iron, 0.25, 0.4, 0.1, SHIP.bowX - 2.6, FM.baseY + 0.2, 0));
  // signal halyards
  for (const s of [-1, 1]) rope.seg(P(FM, 61.6), 61.6, s * 0.1, 95.6, FM.baseY + 1.1, s * 1.6, 0.008);

  // =================== MAINMAST ===================
  const MM = MASTS[1];
  const mTop1 = 49.5;
  lowerMast(MM, mTop1, 0.46, 0.29);
  topMast(MM, mTop1 - 2.2, MM.topY);
  rungs(MM, MM.baseY + 0.6, MM.baseY + 12, 1);
  boom(MM, -1, 9.5, 0.55, 6.5);
  const yMS = 47.4;
  for (const s of [-1, 1]) {
    [-78.4, -79.6, -80.8, -82.0].forEach((x, i) => {
      const z = s * (edge(x) - 0.42), tx = P(MM, yMS) + 0.1 * i, ty = yMS + 0.25 * i - 0.75, tz = s * 0.3;
      rig.seg(x, MM.baseY + 0.05, z, tx, ty, tz, 0.022);
      deadeye(x, MM.baseY + 0.05, z, tx, ty, tz);
    });
    // main stays lead forward to the after end of the boat deck
    rig.seg(P(MM, 48.4), 48.4, s * 0.25, -71.3, BY + 0.15, s * 3.6, 0.024);
    root.add(box(mats.iron, 0.2, 0.3, 0.12, -71.3, BY + 0.15, s * 3.6));
    // topmast backstays to the after well deck bulwarks
    [-93.5, -95.5].forEach((x, i) => {
      const z = s * (edge(x) - 0.45);
      rig.seg(x, DECK_Y.C + 1.15, z, P(MM, 56.4 - i * 0.6), 56.4 - i * 0.6, s * 0.12, 0.016);
      deadeye(x, DECK_Y.C + 0.3, z, x, DECK_Y.C + 1.3, z);
    });
    rope.seg(P(MM, 57.7), 57.7, s * 0.1, -79.2, MM.baseY + 1.1, s * 1.5, 0.008);
  }
  // stern light bracket on the mainmast
  {
    const yL = MM.baseY + 16, xL = P(MM, yL) - 0.55;
    root.add(box(steel, 0.4, 0.05, 0.3, xL + 0.12, yL - 0.2, 0));
    root.add(vcyl(mats.brass, xL, yL - 0.17, 0, 0.3, 0.1, 8));
    root.add(vcyl(mats.lampGlow, xL - 0.02, yL - 0.1, 0, 0.18, 0.095, 8));
  }

  // =================== MARCONI AERIAL ===================
  const fx = P(FM, 61.4), mx = P(MM, 57.4);
  const sF = [fx - 3.2, 60.2], sM = [mx + 3.2, 56.3];   // spreader positions (x, y)
  const HWS = 2.7, wz = [-2.4, -0.8, 0.8, 2.4], SAG = 2.2;
  for (const [sx, sy, tx, ty] of [[sF[0], sF[1], fx, 61.4], [sM[0], sM[1], mx, 57.4]]) {
    root.add(cyl(mats.pine, sx, sy, -HWS, sx, sy, HWS, 0.05, 6));
    const bx = sx + (tx - sx) * 0.45, by = sy + (ty - sy) * 0.45;
    rope.seg(tx, ty, 0, bx, by, 0, 0.01);
    for (const s of [-1, 1]) rope.seg(bx, by, 0, sx, sy, s * HWS, 0.008);
  }
  for (const z of wz) {
    rope.sag(sF[0], sF[1], z, sM[0], sM[1], z, SAG, 24, 0.009);
    for (const t of [0.012, 0.988]) { // insulators
      const p = Wires.sagPoint(sF[0], sF[1], z, sM[0], sM[1], z, SAG, t);
      root.add(cyl(mats.porcelain, p[0] - 0.22, p[1], p[2], p[0] + 0.22, p[1], p[2], 0.035, 5));
    }
  }
  // downlead to the Marconi room (officers' quarters, x ≈ 46)
  {
    const t = (sF[0] - 48.6) / (sF[0] - sM[0]);
    const jx = 47.1, jy = 38.5, jz = -1.3;
    for (const z of wz) {
      const p = Wires.sagPoint(sF[0], sF[1], z, sM[0], sM[1], z, SAG, t);
      rope.seg(p[0], p[1], p[2], jx, jy, jz, 0.007);
    }
    rope.seg(jx, jy, jz, 46.2, RY + 1.25, -1.7, 0.009);
    // lead-in insulator + trunk on the roof
    root.add(vcyl(mats.paintWhite, 46.2, RY - 0.03, -1.7, 0.75, 0.16, 8, 0.12));
    root.add(vcyl(mats.porcelain, 46.2, RY + 0.72, -1.7, 0.5, 0.07, 6, 0.035));
    for (let k = 0; k < 3; k++) root.add(vcyl(mats.porcelain, 46.2, RY + 0.8 + k * 0.13, -1.7, 0.03, 0.1, 8));
  }

  // =================== FLAGS ===================
  // White Star Line house flag at the main truck
  {
    const y = MM.topY - 0.95;
    const f = makeFlag(houseFlagMat, 2.7, 1.5, P(MM, y) - 0.12, y, 0, 0);
    root.add(f.mesh); flags.push(f);
  }
  // ensign staff at the stern with the Blue Ensign
  {
    const x0 = SHIP.sternX + 1.7, y0 = DECK_Y.B, h = 7.2, lean = 0.9;
    root.add(cyl(mats.paintWhite, x0, y0, 0, x0 - lean, y0 + h, 0, 0.07, 8, 0.04));
    root.add(ball(mats.gold, x0 - lean, y0 + h + 0.05, 0, 0.07, 8, 6));
    root.add(vcyl(mats.iron, x0, y0, 0, 0.3, 0.12, 8));
    rope.seg(x0 - lean + 0.03, y0 + h, 0.04, x0 + 0.2, y0 + 1.0, 0.1, 0.006);
    world.addCollider(x0 - 0.15, y0, -0.15, x0 + 0.15, y0 + 2, 0.15);
    const fy = y0 + h - 1.05;
    const f = makeFlag(ensignMat, 3.0, 1.5, x0 - lean * ((fy - y0) / h) - 0.1, fy, 0, 1.9);
    root.add(f.mesh); flags.push(f);
  }

  // belaying cleats on the mast feet
  for (const M of MASTS) for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.5, y = M.baseY + 1.1 + (k % 2) * 0.25, r = 0.48;
    const R = [Math.cos(a), 0, Math.sin(a)];
    fit.basis(CLEAT(), mats.iron, [P(M, y) + R[0] * r, y, R[2] * r], [-R[2], 0, R[0]], R, [0, 1, 0]);
  }
  root.add(rig.build('rigging'));
  root.add(rope.build('ropes'));
  fit.build(root, 'rigFittings');

  world.addInfo({
    title: 'Krähennest (Ausguck)',
    text: 'Etwa 15 m über dem Vorschiff lag am Fockmast der Ausguck, erreichbar über eine Leiter im Inneren des hohlen Stahlmastes. In der Nacht zum 15. April 1912 hielten hier Frederick Fleet und Reginald Lee Wache – ohne Ferngläser, denn diese waren in einem Spind eingeschlossen. Um 23:40 Uhr schlug Fleet dreimal die Glocke und meldete der Brücke telefonisch: „Eisberg direkt voraus!“',
    x: 98.6, y: FM.baseY + 1.2, z: 2.2, radius: 3.5,
  });
  world.addInfo({
    title: 'Marconi-Antenne',
    text: 'Zwischen den beiden Masten spannten sich in rund 60 m Höhe vier parallele Antennendrähte, von denen eine Zuleitung zum Funkraum hinter der Brücke hinabführte. Die 5-kW-Station der Marconi-Gesellschaft hatte das Rufzeichen MGY und reichte nachts über 2 000 Seemeilen. Die Funker Jack Phillips und Harold Bride sendeten bis kurz vor dem Untergang die Notrufe CQD und SOS.',
    x: 47, y: BY + 1.2, z: -9.2, radius: 4,
  });

  return {
    update(dt, t) { for (const f of flags) f.update(t); },
  };
}
