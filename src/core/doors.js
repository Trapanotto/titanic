// Doors that can be opened and closed. The kit (interior/rooms.js) registers every hinged door once
// (world.addDoor) and draws its leaves as instances, placed for the door's current state; the app (app/interact.js)
// swings them by rewriting the instance matrices.
import * as THREE from 'three';

const _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1), _up = new THREE.Vector3(0, 1, 0);

/**
 * Matrix of one leaf at swing t (0 = closed, 1 = open).
 * L: { X (wall runs along x), e (jamb coordinate along the wall), dir (+1/-1 leaf direction along the wall), c (wall
 *      line), T2 (half wall thickness), sgn (side it opens to), ang (open angle, rad) }, y = floor height
 */
export function leafMatrix(L, y, t, out) {
  const ang = t * L.ang, hi = 0.01 + 0.026 * t, off = t * L.sgn * (L.T2 + 0.02);
  const al = Math.cos(ang) * L.dir, pr = Math.sin(ang) * L.sgn;
  const dx = L.X ? al : pr, dz = L.X ? pr : al, ha = L.e + L.dir * hi;
  _p.set(L.X ? ha : L.c + off, y, L.X ? L.c + off : ha);
  _q.setFromAxisAngle(_up, Math.atan2(-dz, dx));
  return out.compose(_p, _q, _s);
}
