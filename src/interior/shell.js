// Interior kit – deck shell: floors (with stair holes), ceilings, inner hull lining, end bulkheads, casings.
import { mats } from '../core/materials.js';
import { DECK_Y, DECK_SEGMENTS, ZONE_LEN, SLAB, SHIP, ceilingY, hullHalfWidth } from '../core/constants.js';
import {
  Batch, kitMats, matOf, hookNight, shellHalfWidth, deckRanges, casingsOn, rectMinus, HULL_DECKS, LINING_INSET,
} from './batch.js';
import { stairHoles } from './stairs.js';
import { porthole } from './props-decor.js';
import { place, faceDir } from './props-core.js';

const DEF_FLOOR = { tank: 'steelFloor', orlop: 'steelFloor', G: 'linoRed', F: 'linoRed', E: 'linoRed', D: 'linoCream', C: 'linoBlue', B: 'carpetRed', A: 'linoCream', boat: 'linoCream' };
const DEF_CEIL = { tank: 'steel', orlop: 'steel', G: 'white', F: 'white', E: 'white', D: 'panel', C: 'panel', B: 'plaster', A: 'plaster', boat: 'panel' };
const DEF_LINING = { tank: 'steel', orlop: 'steel', G: 'paintWhite', F: 'paintWhite', E: 'whitePanel', D: 'whitePanel', C: 'whitePanel' };
const DEF_CASING = { F: 'paintWhite', E: 'paintWhite' };
const EXTERIOR_ENDS_C = [78, 94, -90, -106]; // bulkheads owned by the exterior module

/** Default porthole rhythm of the inner lining (x = phase + k * pitch). */
export const PORTHOLES = { pitch: 2.7, phase: 1.35, y: 1.65, r: 0.2 };

function xBreaks(xa, xb, half, extra) {
  const set = new Set([xa, xb]);
  for (const e of extra) if (e > xa + 1e-4 && e < xb - 1e-4) set.add(e);
  for (let z = Math.ceil(xa / ZONE_LEN) * ZONE_LEN; z < xb; z += ZONE_LEN) if (z > xa + 1e-4) set.add(z);
  const xs = [...set].sort((p, q) => p - q), out = [xs[0]];
  for (let i = 0; i < xs.length - 1; i++) {
    const a = xs[i], c = xs[i + 1];
    let varies = false;
    for (let k = 0; k <= 4 && !varies; k++) varies = Math.abs(half(a + ((c - a) * k) / 4) - half(a)) > 1e-3;
    const n = varies ? Math.ceil((c - a) / 2 - 1e-6) : 1;
    for (let k = 1; k <= n; k++) out.push(a + ((c - a) * k) / n);
  }
  return out;
}

/** Horizontal surface following `half`, with rectangular holes and material regions. */
function surface(b, y, down, xa, xb, half, holes, regions, defMat) {
  const xs = xBreaks(xa, xb, half, [...holes, ...regions].flatMap((r) => [r.x0, r.x1]));
  const cl = (z, h) => Math.max(-h, Math.min(h, z));
  for (let i = 0; i < xs.length - 1; i++) {
    const a = xs[i], c = xs[i + 1], xm = (a + c) / 2, ha = half(a), hc = half(c), hm = Math.max(ha, hc);
    if (hm <= 0.01) continue;
    const hs = holes.filter((h) => h.x0 < xm && h.x1 > xm), rs = regions.filter((r) => r.x0 < xm && r.x1 > xm);
    const zs = [...new Set([-99, 99, ...[...hs, ...rs].flatMap((r) => [r.z0 ?? -99, r.z1 ?? 99])])].sort((p, q) => p - q);
    for (let j = 0; j < zs.length - 1; j++) {
      const zl = zs[j], zr = zs[j + 1], zm = (Math.max(zl, -hm) + Math.min(zr, hm)) / 2;
      if (zl >= hm || zr <= -hm) continue;
      if (hs.some((h) => h.z0 < zm && h.z1 > zm)) continue;
      let mat = defMat;
      for (const r of rs) if ((r.z0 ?? -99) < zm && (r.z1 ?? 99) > zm) mat = r._m;
      const p = [[a, y, cl(zl, ha)], [c, y, cl(zl, hc)], [c, y, cl(zr, hc)], [a, y, cl(zr, ha)]];
      if (p[3][2] - p[0][2] < 1e-4 && p[2][2] - p[1][2] < 1e-4) continue;
      b.poly(mat, p, [0, down ? -1 : 1, 0]);
    }
  }
}

/**
 * Builds floor, ceiling, hull lining (decks C and below), end bulkheads and casings of a deck (or an x-range of it).
 * See docs/KIT.md for the options.
 */
export function buildDeckShell(world, deck, opts = {}) {
  hookNight(world);
  const Y = DECK_Y[deck];
  const H = opts.height ?? (ceilingY(deck) - Y);
  const yc = Y + H;
  const hullDeck = HULL_DECKS.includes(deck);
  const b = new Batch(world, deck);
  const floorMat = matOf(opts.floor, mats[DEF_FLOOR[deck]]);
  const regions = (opts.floors ?? []).map((r) => ({ ...r, _m: matOf(r.mat, floorMat) }));
  const ceilStyle = opts.ceiling === undefined ? DEF_CEIL[deck] : opts.ceiling;
  const liningMat = opts.lining === false ? null : matOf(opts.lining, mats[DEF_LINING[deck]] ?? mats.paintWhite);
  const flare = opts.flare ?? (hullDeck && H > 3.2);
  const hullW = (x, y) => Math.max(0, hullHalfWidth(x, y) - LINING_INSET);
  const half = (x) => shellHalfWidth(deck, x);
  const halfTop = flare ? (x) => hullW(x, yc) : half;
  const holesF = opts.holes === false ? [] : stairHoles(deck);
  const upper = Object.keys(DECK_Y).find((d) => d !== 'roof' && Math.abs(DECK_Y[d] - SLAB - yc) < 0.06);
  const holesC = opts.ceilingHoles ?? (upper ? stairHoles(upper) : []);
  const X0 = opts.x0 ?? -Infinity, X1 = opts.x1 ?? Infinity;

  let ceilMat = null, beamMat = null;
  if (ceilStyle === 'steel') { ceilMat = mats.steel; beamMat = mats.steelDark; }
  else if (ceilStyle === 'white') { ceilMat = mats.paintWhite; beamMat = mats.paintWhite; }
  else if (ceilStyle === 'panel') ceilMat = mats.whitePanel;
  else if (ceilStyle === 'plaster') ceilMat = mats.plaster;
  else if (ceilStyle) ceilMat = matOf(ceilStyle);
  const beamPitch = opts.beams === false ? 0 : (typeof opts.beams === 'number' ? opts.beams : (beamMat || opts.beams ? 2.4 : 0));
  if (beamPitch && !beamMat) beamMat = ceilMat;

  const ph = opts.portholes === false ? null : { ...PORTHOLES, ...(typeof opts.portholes === 'object' ? opts.portholes : {}) };
  const wantPorts = ph && hullDeck && liningMat && (opts.portholes ? true : (opts.height == null && Y + ph.y > SHIP.waterline + 0.3));

  for (const [sa, sb] of deckRanges(deck)) {
    const xa = Math.max(sa, X0), xb = Math.min(sb, X1);
    if (xb - xa < 0.01) continue;

    // floor
    if (opts.floor !== false) surface(b, Y, false, xa, xb, half, holesF, regions, floorMat);
    if (opts.walk !== false) {
      for (const r of rectMinus({ x0: xa, x1: xb, z0: -99, z1: 99 }, holesF)) world.addFloor({ y: Y, x0: r.x0, x1: r.x1, z0: r.z0, z1: r.z1, clip: half });
    }
    // ceiling
    if (ceilMat) {
      surface(b, yc, true, xa, xb, halfTop, holesC, [], ceilMat);
      if (beamPitch) {
        for (let x = Math.ceil((xa + 0.3) / beamPitch) * beamPitch; x < xb - 0.3; x += beamPitch) {
          const h = halfTop(x);
          if (h < 0.3) continue;
          for (const r of rectMinus({ x0: x - 0.05, x1: x + 0.05, z0: -h, z1: h }, holesC.map((q) => ({ ...q, x0: q.x0 - 0.1, x1: q.x1 + 0.1 })))) {
            if (r.x1 - r.x0 > 0.09) b.box(beamMat, r.x0, yc - 0.14, r.z0, r.x1, yc, r.z1, 'xXy');
          }
        }
      }
    }
    // hull lining + colliders
    if (hullDeck) {
      const xs = xBreaks(xa, xb, flare ? (x) => half(x) + halfTop(x) : half, []);
      const nb = flare ? Math.max(1, Math.ceil(H / 2.6)) : 1;
      if (liningMat) {
        for (const s of [-1, 1]) {
          for (let i = 0; i < xs.length - 1; i++) {
            const a = xs[i], c = xs[i + 1];
            for (let k = 0; k < nb; k++) {
              const y0 = Y + (H * k) / nb, y1 = Y + (H * (k + 1)) / nb;
              const w = (x, y) => (flare ? (k === 0 && y === y0 ? half(x) : hullW(x, y)) : half(x));
              b.poly(liningMat, [[a, y0, s * w(a, y0)], [c, y0, s * w(c, y0)], [c, y1, s * w(c, y1)], [a, y1, s * w(a, y1)]], [0, 0, -s]);
            }
          }
          if (wantPorts) {
            for (let x = Math.ceil((xa + 0.6 - ph.phase) / ph.pitch) * ph.pitch + ph.phase; x < xb - 0.6; x += ph.pitch) {
              const h = half(x), d = (half(x + 0.25) - half(x - 0.25)) / 0.5, l = Math.hypot(d, 1);
              if (h < 1) continue;
              const n = [d / l, 0, -s / l], c = [x, Y + ph.y, s * h];
              // brass porthole with hinged-up deadlight and dogs (shared template), registered for curtains (rooms.js)
              place(world.zone(deck, x), porthole({ r: ph.r }), c[0], c[1], c[2], faceDir(n[0], n[2]));
              ((world._kitPorts ??= {})[deck] ??= []).push({ x, y: c[1], z: c[2], n, r: ph.r });
            }
          }
        }
      }
      if (opts.collide !== false) {
        for (let x = xa; x < xb - 1e-4;) {
          const slope = Math.abs(half(Math.min(xb, x + 0.5)) - half(x)) / 0.5;
          let xe = Math.min(xb, x + Math.max(0.4, Math.min(12, 0.15 / Math.max(slope, 1e-6))));
          // the slope is sampled at x only: shrink the step where the hull starts to taper inside it
          while (xe - x > 0.45 && (Math.abs(half(xe) - half(x)) > 0.15 || Math.abs(half((x + xe) / 2) - half(x)) > 0.15)) xe = x + Math.max(0.4, (xe - x) / 2);
          if (xb - xe < 0.2) xe = xb;
          const h = Math.min(half(x), half(xe));
          for (const s of [-1, 1]) world.addCollider(x, Y, s * h, xe, yc, s * (h + 0.6));
          x = xe;
        }
      }
      // end bulkheads at true segment ends
      const seg = DECK_SEGMENTS[deck].find((q) => q[0] <= xa && q[1] >= xb);
      for (const [xe, dir, on] of [[xa, 1, opts.ends?.aft ?? opts.ends ?? true], [xb, -1, opts.ends?.fwd ?? opts.ends ?? true]]) {
        const isEnd = seg && Math.abs(xe - (dir > 0 ? seg[0] : seg[1])) < 1e-3;
        const force = (dir > 0 ? opts.ends?.aft : opts.ends?.fwd) === true || opts.ends === 'force';
        if (!on || (!isEnd && !force) || (deck === 'C' && EXTERIOR_ENDS_C.includes(xe) && !force)) continue;
        const h = Math.max(halfTop(xe), half(xe)) + 0.05;
        if (liningMat) b.wallZ(liningMat, xe + dir * 0.03, -h, h, Y, yc, dir);
        world.addCollider(xe - dir * 0.3, Y, -h - 0.6, xe + dir * 0.03, yc, h + 0.6);
      }
    }
  }

  // casings
  if (opts.casings !== false) {
    const cm = matOf(opts.casings === true ? null : opts.casings, mats[DEF_CASING[deck]] ?? mats.whitePanel);
    for (const c of casingsOn(deck)) {
      const xm = (c.x0 + c.x1) / 2;
      if (xm < X0 || xm >= X1) continue;
      b.box(cm, c.x0, Y, c.z0, c.x1, yc, c.z1, 'xXzZ');
      world.addCollider(c.x0, Y, c.z0, c.x1, yc, c.z1);
    }
  }
  b.flush();
  return { y: Y, ceil: yc, height: H };
}

/**
 * Transverse (watertight) bulkhead: steel wall across the full hull width at station x with door openings.
 * doors: [{ z, w = 1.0, h = 1.9 }]
 */
export function bulkhead(world, deck, x, opts = {}) {
  const y0 = opts.y0 ?? DECK_Y[deck], y1 = opts.y1 ?? ceilingY(deck), t = (opts.thickness ?? 0.1) / 2;
  const M = matOf(opts.mat, mats.steel), wt = opts.wt !== false;
  const b = new Batch(world, deck, y0);
  const hull = HULL_DECKS.includes(deck);
  const hwAt = (y) => (hull ? Math.max(0, hullHalfWidth(x, y) - LINING_INSET) : shellHalfWidth(deck, x));
  const doors = (opts.doors ?? []).map((d) => ({ w: 1.0, h: 1.9, ...d })).sort((p, q) => p.z - q.z);
  const cuts = [-99, ...doors.flatMap((d) => [d.z - d.w / 2, d.z + d.w / 2]), 99];
  const nb = Math.max(1, Math.ceil((y1 - y0) / 2.6));
  const cl = (z, h) => Math.max(-h, Math.min(h, z));
  for (let k = 0; k < nb; k++) {
    const ya = y0 + ((y1 - y0) * k) / nb, yb = y0 + ((y1 - y0) * (k + 1)) / nb, ha = hwAt(ya), hb = hwAt(yb);
    for (let i = 0; i < cuts.length - 1; i++) {
      const zl = cuts[i], zr = cuts[i + 1], door = i % 2 === 1 ? doors[(i - 1) / 2] : null;
      const yl = door ? Math.max(ya, y0 + door.h) : ya;
      if (yl >= yb - 1e-4) continue;
      for (const sx of [-1, 1]) {
        b.poly(M, [[x + sx * t, yl, cl(zl, door ? 99 : ha)], [x + sx * t, yl, cl(zr, door ? 99 : ha)], [x + sx * t, yb, cl(zr, hb)], [x + sx * t, yb, cl(zl, hb)]], [sx, 0, 0], undefined, x);
      }
    }
  }
  const hmax = hwAt(y1) + 0.3;
  if (opts.collide !== false) {
    for (let i = 0; i < cuts.length - 1; i += 2) {
      const zl = cl(cuts[i], hmax), zr = cl(cuts[i + 1], hmax);
      if (zr - zl > 0.01) world.addCollider(x - t, y0, zl, x + t, y1, zr);
    }
  }
  const F = mats.steelDark;
  for (const d of doors) {
    const za = d.z - d.w / 2, zb = d.z + d.w / 2, yt = y0 + d.h;
    b.poly(M, [[x - t, y0, za], [x + t, y0, za], [x + t, yt, za], [x - t, yt, za]], [0, 0, 1], undefined, x);
    b.poly(M, [[x - t, y0, zb], [x + t, y0, zb], [x + t, yt, zb], [x - t, yt, zb]], [0, 0, -1], undefined, x);
    b.poly(M, [[x - t, yt, za], [x + t, yt, za], [x + t, yt, zb], [x - t, yt, zb]], [0, -1, 0], undefined, x);
    if (wt) {
      const e = t + 0.04;
      b.box(F, x - e, y0, za - 0.09, x + e, yt + 0.09, za);
      b.box(F, x - e, y0, zb, x + e, yt + 0.09, zb + 0.09);
      b.box(F, x - e, yt, za, x + e, yt + 0.09, zb);
      b.box(F, x - e, y0, za, x + e, y0 + 0.12, zb, 'xXY');
      const top = Math.min(y1 - 0.05, yt + 0.15 + d.h);
      if (top - yt > 0.6) { // vertically sliding watertight door, shown raised
        b.box(F, x + e, yt + 0.15, za - 0.05, x + e + 0.05, top, zb + 0.05);
        for (const z of [za - 0.12, zb + 0.06]) b.box(mats.iron, x + e, y0, z, x + e + 0.07, top, z + 0.06);
        b.box(mats.brass, x + e + 0.05, yt + 0.5, d.z - 0.05, x + e + 0.09, yt + 0.6, d.z + 0.05);
      }
    }
  }
  b.flush();
}
