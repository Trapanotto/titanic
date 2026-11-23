// People – procedural pose of one figure: walk cycle (hip sway, pelvis rotation, arm swing, knee bend, rolling
// foot with the pelvis height solved so that the lower foot always touches the deck), idle standing (weight shift,
// looking around, hands clasped behind / in front, leaning on a cane). Writes one matrix per rigid part.
import { SKEL } from './parts.js';

const TAU = Math.PI * 2;
// scratch matrices (column-major 4x4 like three.js)
const M = Array.from({ length: 17 }, () => new Float64Array(16));
const [ROOT, PEL, TOR, HEAD, THL, THR, SHL, SHR, FTL, FTR, UAL, UAR, FAL, FAR, SKL, HEM] = M;

/** out = parent × [R(yaw, roll, pitch) | t]; R = Ry · Rx · Rz. */
function joint(out, par, tx, ty, tz, ry, rx, rz) {
  const cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rx), sx = Math.sin(rx), cz = Math.cos(rz), sz = Math.sin(rz);
  // local rotation rows
  const r00 = cy * cz + sy * sx * sz, r01 = -cy * sz + sy * sx * cz, r02 = sy * cx;
  const r10 = cx * sz, r11 = cx * cz, r12 = -sx;
  const r20 = -sy * cz + cy * sx * sz, r21 = sy * sz + cy * sx * cz, r22 = cy * cx;
  const p = par;
  const a0 = p[0], a1 = p[1], a2 = p[2], b0 = p[4], b1 = p[5], b2 = p[6], c0 = p[8], c1 = p[9], c2 = p[10];
  out[0] = a0 * r00 + b0 * r10 + c0 * r20; out[1] = a1 * r00 + b1 * r10 + c1 * r20; out[2] = a2 * r00 + b2 * r10 + c2 * r20; out[3] = 0;
  out[4] = a0 * r01 + b0 * r11 + c0 * r21; out[5] = a1 * r01 + b1 * r11 + c1 * r21; out[6] = a2 * r01 + b2 * r11 + c2 * r21; out[7] = 0;
  out[8] = a0 * r02 + b0 * r12 + c0 * r22; out[9] = a1 * r02 + b1 * r12 + c1 * r22; out[10] = a2 * r02 + b2 * r12 + c2 * r22; out[11] = 0;
  out[12] = p[12] + a0 * tx + b0 * ty + c0 * tz; out[13] = p[13] + a1 * tx + b1 * ty + c1 * tz; out[14] = p[14] + a2 * tx + b2 * ty + c2 * tz; out[15] = 1;
  return out;
}
function rootMatrix(out, x, y, z, yaw, s) {
  const c = Math.cos(yaw) * s, n = Math.sin(yaw) * s;
  out[0] = c; out[1] = 0; out[2] = -n; out[3] = 0;
  out[4] = 0; out[5] = s; out[6] = 0; out[7] = 0;
  out[8] = n; out[9] = 0; out[10] = c; out[11] = 0;
  out[12] = x; out[13] = y; out[14] = z; out[15] = 1;
  return out;
}

const wrap01 = (x) => x - Math.floor(x);
function bump(ph, c, w) { let d = wrap01(ph - c + 0.5) - 0.5; d /= w; return Math.exp(-d * d); }
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Foot pitch (world) over the gait cycle of one leg: heel strike at 0, toe-off at ~0.62. */
function footPitch(ph) {
  if (ph < 0.08) return 0.22 * (1 - ph / 0.08);
  if (ph < 0.42) return 0;
  if (ph < 0.62) return -0.62 * smooth(0.42, 0.62, ph);
  if (ph < 0.8) return -0.62 + 0.75 * smooth(0.62, 0.8, ph);
  return 0.13 + 0.09 * smooth(0.8, 0.98, ph);
}

// gait keyframes [phase, value] of one leg (heel strike at 0): hip flexion (relative to the amplitude) and knee
// flexion (rad); cosine interpolation, wrapping
const HIP = [0, 0.86, 0.5, -1, 0.62, -0.55, 0.75, 0.25, 0.88, 1, 1, 0.86];
const KNEE = [0, 0.06, 0.15, 0.3, 0.42, 0.1, 0.62, 0.68, 0.73, 1.0, 0.9, 0.22, 1, 0.06];
function kf(ph, K) {
  for (let i = 2; i < K.length; i += 2) {
    if (ph <= K[i]) {
      const t = (ph - K[i - 2]) / (K[i] - K[i - 2]), s = 0.5 - 0.5 * Math.cos(Math.PI * t);
      return K[i - 1] + (K[i + 1] - K[i - 1]) * s;
    }
  }
  return K[K.length - 1];
}

const LEG = { th: 0, kn: 0, an: 0, drop: 0, fwd: 0 };
/** Sagittal leg: hip flexion th (forward +), knee flexion kn, foot pitch fp -> ankle angle and the drop of the lowest sole point below the hip. */
function legFK(L, th, kn, fp, k) {
  const s2 = th - kn;
  const ax = k.thigh * Math.sin(th) + k.shin * Math.sin(s2), ay = -k.thigh * Math.cos(th) - k.shin * Math.cos(s2);
  const c = Math.cos(fp), s = Math.sin(fp);
  const hy = -0.07 * s + -0.085 * c, ty = 0.21 * s + -0.085 * c; // heel / toe sole points rotated
  L.th = th; L.kn = kn; L.an = fp - s2; L.drop = -(ay + Math.min(hy, ty)); L.fwd = ax;
  return L;
}
const LL = { ...LEG }, LR = { ...LEG };

/**
 * Pose person `a` (crowd agent: x, y, z, yaw, phase, wk, idle state; a.p = figure) and write the parts through
 * w.put(meshIndex, matrix, sx, sy, sz). a.mi = mesh indices of the person's parts (-1 = none).
 */
export function posePerson(a, t, w) {
  const p = a.p, k = SKEL[p.sex], mi = a.mi;
  const wk = a.wk; // 0 standing .. 1 walking
  const female = p.sex === 'f';
  const str = a.strideK; // stride relative to the nominal one (slower = shorter)
  const ph = a.phase, phR = ph, phL = wrap01(ph + 0.5);
  const cr = Math.cos(TAU * phR);
  // ---- legs
  const A = (female ? 0.2 : 0.36) * str * wk;
  const kneeK = (female ? 0.62 : 0.95) * Math.min(1.2, str) * wk;
  const fpK = wk * Math.min(1, str * 1.1);
  let thR = A * kf(phR, HIP) + 0.02 * wk, knR = kneeK * kf(phR, KNEE), fpR = fpK * footPitch(phR);
  let thL = A * kf(phL, HIP) + 0.02 * wk, knL = kneeK * kf(phL, KNEE), fpL = fpK * footPitch(phL);
  // idle: weight on one leg, the other knee relaxed
  const iw = 1 - wk;
  const shift = Math.sin(a.shiftPh) * iw;
  if (iw > 0) {
    const relaxR = Math.max(0, shift), relaxL = Math.max(0, -shift);
    knR += iw * 0.18 * relaxR; thR += iw * 0.08 * relaxR; fpR += iw * 0.0;
    knL += iw * 0.18 * relaxL; thL += iw * 0.08 * relaxL;
  }
  legFK(LR, thR, knR, fpR, k); legFK(LL, thL, knL, fpL, k);
  let hipH = Math.max(LR.drop, LL.drop);
  // ---- pelvis
  const sway = female ? 1.5 : 1;
  const sR = Math.sin(TAU * phR);
  const pYaw = 0.075 * A / 0.36 * cr * 1.1;
  const pRoll = wk * -0.035 * sway * sR + iw * 0.035 * shift;
  const pShift = wk * 0.018 * sway * sR + iw * 0.03 * shift;
  rootMatrix(ROOT, a.x, a.y, a.z, a.yaw, p.s);
  joint(PEL, ROOT, 0, hipH, pShift, pYaw, pRoll, 0);
  const W = p.w;
  // thighs (counter the pelvis roll so the legs stay in the walking plane)
  const lim = p.limb;
  joint(THR, PEL, 0, 0, k.hipZ * W, -pYaw, -pRoll - 0.02, thR);
  joint(THL, PEL, 0, 0, -k.hipZ * W, -pYaw, -pRoll + 0.02, thL);
  if (mi.thigh >= 0) { w.put(mi.thigh, THR, lim * W, k.thigh / 0.42, lim * W); w.put(mi.thigh, THL, lim * W, k.thigh / 0.42, lim * W); }
  const shinW = female ? 0.72 : lim * W;
  joint(SHR, THR, 0, -k.thigh, 0, 0, 0, -knR);
  joint(SHL, THL, 0, -k.thigh, 0, 0, 0, -knL);
  w.put(mi.shin, SHR, shinW, k.shin / 0.415, shinW); w.put(mi.shin, SHL, shinW, k.shin / 0.415, shinW);
  joint(FTR, SHR, 0, -k.shin, 0, 0, 0, LR.an);
  joint(FTL, SHL, 0, -k.shin, 0, 0, 0, LL.an);
  const fs = female ? 0.9 : 1;
  w.put(mi.foot, FTR, fs, 1, fs); w.put(mi.foot, FTL, fs, 1, fs);
  if (mi.pelvis >= 0) w.put(mi.pelvis, PEL, W, 1, W);
  // ---- skirts / coat skirt
  const spread = Math.abs(LR.fwd - LL.fwd);
  if (mi.skirtU >= 0) w.put(mi.skirtU, PEL, W * (1 + 0.1 * spread), p.skirt === 'short' ? 0.75 : 1, W);
  if (mi.skirtL >= 0) {
    joint(SKL, PEL, 0, -0.4, 0, 0, -pRoll * 0.8 + 0.01 * Math.sin(t * 1.3 + a.seed), -0.04 * wk + 0.02 * Math.sin(TAU * ph * 2) * wk);
    w.put(mi.skirtL, SKL, W * (1 + 0.32 * spread), 1, W * (1 + 0.04 * spread));
  }
  if (mi.hem >= 0) {
    joint(HEM, PEL, 0, k.waist, 0, 0, -pRoll * 0.3, -0.03 * wk);
    w.put(mi.hem, HEM, W * (1 + 0.12 * spread * Math.min(1, p.hem)), p.hem, W * (1 + 0.05 * spread));
  }
  // ---- torso and head
  const lean = (female ? 0.03 : -0.0) - 0.05 * wk * str + (a.pose === 'cane' ? -0.02 * iw : 0);
  const breathe = 0.006 * Math.sin(t * 1.6 + a.seed);
  joint(TOR, PEL, 0, k.waist, 0, -pYaw * 1.5, -pRoll * 1.2, lean + breathe);
  w.put(mi.torso, TOR, W, 1, W);
  if (mi.stole >= 0) w.put(mi.stole, TOR, W, 1, W);
  const hs = p.hs;
  joint(HEAD, TOR, 0, k.neck, 0, a.look + pYaw * 0.4, -pRoll * 0.5, -lean * 0.7 + a.lookP);
  w.put(mi.head, HEAD, hs, hs, hs);
  if (mi.hair >= 0) w.put(mi.hair, HEAD, hs, hs, hs);
  if (mi.beard >= 0) w.put(mi.beard, HEAD, hs, hs, hs);
  if (mi.hat >= 0) w.put(mi.hat, HEAD, hs * p.hatScale, hs * p.hatScale * p.hatScaleY, hs * p.hatScale);
  // ---- arms
  const B = (female ? 0.2 : 0.32) * wk * Math.min(1.3, str);
  let saR = -B * cr - 0.04 * wk, saL = B * cr - 0.04 * wk; // shoulder pitch (forward +)
  let elR = 0.22 + 0.25 * wk * Math.max(0, -cr) * str, elL = 0.22 + 0.25 * wk * Math.max(0, cr) * str;
  let abR = female ? 0.13 : 0.1, abL = abR, twR = 0, twL = 0;
  // idle poses blend in when standing
  const pose = a.pose;
  if (iw > 0) {
    let iR = 0, iL = 0, eR = 0, eL = 0, bR = 0, bL = 0, tR = 0, tL = 0;
    if (pose === 'behind') { iR = iL = -0.16; eR = eL = 0.85; bR = bL = 0.05; tR = 1.95; tL = -1.95; }
    else if (pose === 'front') { iR = iL = 0.12; eR = eL = 1.05; bR = bL = 0.1; tR = 1.2; tL = -1.2; }
    else if (pose === 'cane') { iR = 0.32; eR = 0.18; bR = -0.05; iL = -0.05; eL = 0.25; }
    else { iR = iL = 0.02; eR = eL = 0.12; }
    const sw = 0.03 * Math.sin(t * 0.7 + a.seed);
    saR = saR * wk + iw * (iR + sw); saL = saL * wk + iw * (iL - sw);
    elR = elR * wk + iw * (0.22 + eR); elL = elL * wk + iw * (0.22 + eL);
    abR = abR * wk + iw * (abR + bR); abL = abL * wk + iw * (abL + bL);
    twR = iw * tR; twL = iw * tL;
  }
  if (a.cane && wk > 0) { saR = saR * 0.6 + 0.12 * wk; elR = 0.3; }
  const shZ = k.shZ * W;
  joint(UAR, TOR, 0, k.shY, shZ, 0, -abR + pRoll * 1.2, saR - lean);
  joint(UAL, TOR, 0, k.shY, -shZ, 0, abL + pRoll * 1.2, saL - lean);
  const aw = (female ? 0.86 : 1) * W, al = k.uArm / 0.31;
  w.put(mi.uArm, UAR, aw, al, aw); w.put(mi.uArm, UAL, aw, al, aw);
  joint(FAR, UAR, 0, -k.uArm, 0, twR, 0, elR);
  joint(FAL, UAL, 0, -k.uArm, 0, twL, 0, elL);
  const fl = k.fArm / 0.255;
  w.put(mi.fArm, FAR, aw, fl, aw); w.put(mi.fArm, FAL, aw, fl, aw);
  if (mi.cane >= 0) {
    // grip in the right hand; standing: the tip rests on the deck a little ahead, walking: carried along the forearm
    const gq = 0.335 * fl, gx = FAR[12] - FAR[4] * gq, gy = FAR[13] - FAR[5] * gq, gz = FAR[14] - FAR[6] * gq;
    const sc = p.s, fx = Math.cos(a.yaw), fz = -Math.sin(a.yaw);
    const fl2 = Math.hypot(FAR[4], FAR[5], FAR[6]) || 1;
    let tx = gx - (FAR[4] / fl2) * 0.8 * sc, ty = gy - (FAR[5] / fl2) * 0.8 * sc, tz = gz - (FAR[6] / fl2) * 0.8 * sc;
    const px = gx + fx * 0.16 * sc + FAR[8] * 0.05, pz = gz + fz * 0.16 * sc + FAR[10] * 0.05;
    tx = tx * wk + px * iw; ty = ty * wk + a.y * iw; tz = tz * wk + pz * iw;
    if (ty < a.y + 0.005) ty = a.y + 0.005;
    const C = M[16];
    let yx = gx - tx, yy = gy - ty, yz = gz - tz;
    // x axis: horizontal, perpendicular to the cane
    let xx = -yz, xz = yx; const xl = Math.hypot(xx, xz);
    if (xl < 1e-6) { xx = 1; xz = 0; } else { xx /= xl; xz /= xl; }
    const yl = Math.hypot(yx, yy, yz) || 1;
    // z = x × y (normalised, scaled)
    let zx = -xz * yy, zy = xz * yx - xx * yz, zz = xx * yy;
    const zl = Math.hypot(zx, zy, zz) || 1; zx /= zl; zy /= zl; zz /= zl;
    C[0] = xx * sc; C[1] = 0; C[2] = xz * sc; C[3] = 0;
    C[4] = yx; C[5] = yy; C[6] = yz; C[7] = 0;
    C[8] = zx * sc; C[9] = zy * sc; C[10] = zz * sc; C[11] = 0;
    C[12] = gx; C[13] = gy; C[14] = gz; C[15] = 1;
    void yl;
    w.put(mi.cane, C, 1, 1, 1);
  }
  return hipH;
}
