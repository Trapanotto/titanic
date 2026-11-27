// Working mirrors: the wall mirror nearest to the camera shows a real (planar) reflection.
// The mirror glass of every prop is baked into the big zone meshes, so the bake records the world box of each pane
// (world.js: zone.userData.mirrors); one Reflector quad is moved in front of the nearest pane. Only one mirror at a
// time reflects (the scene is drawn a second time for it), all others keep their plain glossy glass.
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { mats } from '../core/materials.js';

mats.mirror.userData.isMirror = true; // read by the bake

const _c = new THREE.Vector3(), _n = new THREE.Vector3(), _r = new THREE.Vector3(), _u = new THREE.Vector3(0, 1, 0), _m = new THREE.Matrix4();

export class MirrorView {
  constructor(world, scene, tier) {
    this.world = world;
    this.range = tier.fine === 0 ? 35 : 65;
    const size = tier.fine === 0 ? 384 : tier.fine === 1 ? 512 : tier.fine === 2 ? 768 : 1024;
    this.quad = new Reflector(new THREE.PlaneGeometry(1, 1), { textureWidth: size, textureHeight: size, clipBias: 0.002, color: 0xc4cacc, multisample: 0 });
    this.quad.name = 'mirrorView';
    this.quad.visible = false;
    this.quad.matrixAutoUpdate = false;
    this.quad.userData.noMerge = true;
    scene.add(this.quad);
    this._tick = 0;
    this._cur = null;
    if (tier.fine <= 1) { // the scene is drawn a second time for the mirror: only every second frame on weak devices
      const q = this.quad, draw = q.onBeforeRender;
      let n = 0;
      q.userData.fresh = false;
      q.onBeforeRender = function (...a) { if ((n++ & 1) && q.userData.fresh) return; q.userData.fresh = true; draw.apply(this, a); };
    }
  }

  /** Pick the nearest mirror in front of the camera (every few frames) and place the reflecting quad on it. */
  update(camera) {
    if ((this._tick++ & 7) !== 0 && this._cur) return;
    const p = camera.position, R2 = this.range * this.range;
    let best = null, bd = R2;
    for (const g of this.world.zones.values()) {
      const list = g.userData.mirrors;
      if (!list || !g.visible || g.userData.loading || !g.children.length) continue;
      for (const b of list) {
        const dx = b.cx - p.x, dy = b.cy - p.y, dz = b.cz - p.z, d = dx * dx + dy * dy + dz * dz;
        if (d < bd) { bd = d; best = b; }
      }
    }
    if (!best) { this.quad.visible = false; this._cur = null; return; }
    // the pane is a thin box: its normal is the thin horizontal axis, pointing to the camera's side
    const nx = best.ax === 0 ? Math.sign(p.x - best.cx) || 1 : 0, nz = best.ax === 2 ? Math.sign(p.z - best.cz) || 1 : 0;
    const key = best.cx + '|' + best.cy + '|' + best.cz + '|' + nx + nz;
    this.quad.visible = true;
    if (key === this._cur) return;
    this._cur = key;
    this.quad.userData.fresh = false; // another mirror: draw it at once
    _n.set(nx, 0, nz); _r.crossVectors(_u, _n);
    _c.set(best.cx + nx * (best.t / 2 + 0.004), best.cy, best.cz + nz * (best.t / 2 + 0.004));
    _m.makeBasis(_r, _u, _n).setPosition(_c);
    this.quad.matrix.copy(_m).scale(_r.set(best.w, best.h, 1));
    this.quad.matrixWorldNeedsUpdate = true;
    this.quad.updateMatrixWorld(true);
  }
}
