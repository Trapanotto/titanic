// Local room cubemap probes for mirrors: one CubeCamera capture shared across all mirrors in view,
// updated only when moving across rooms/decks, shifting position, or changing lighting/weather.
import * as THREE from 'three';
import { mats } from '../core/materials.js';

mats.mirror.userData.isMirror = true; // read by the bake (marks zones that contain mirrors)

export class MirrorView {
  constructor(world, scene, tier) {
    this.world = world;
    this.scene = scene;
    this.tier = tier;
    const size = tier.fine === 0 ? 128 : tier.fine <= 2 ? 256 : 512;
    this.rt = new THREE.WebGLCubeRenderTarget(size, {
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
      magFilter: THREE.LinearFilter,
      type: tier.caps?.floatRT ? THREE.HalfFloatType : THREE.UnsignedByteType,
    });
    this.cubeCam = new THREE.CubeCamera(0.15, 180, this.rt);
    this._pos = new THREE.Vector3(1e9, 1e9, 1e9);
    this._deck = null;
    this._visHash = 0;
    this._dirty = true;
    this._lastAt = -1e9;
    world.onTimeChange?.(() => { this._dirty = true; });
    world.onWeatherChange?.(() => { this._dirty = true; });
  }

  invalidate() { this._dirty = true; }

  dispose() {
    mats.mirror.envMap = null;
    mats.mirror.needsUpdate = true;
    this.rt.dispose();
  }

  /** Capture a local 360 cubemap around the camera whenever a mirror zone is nearby and state changed. */
  update(camera) {
    const renderer = this.world.renderer;
    if (!renderer) return;
    const p = camera.position;
    let hasMirror = false;
    let visHash = 0;
    const R2 = 35 * 35;
    for (const g of this.world.zones.values()) {
      if (!g.visible || g.userData.loading || !g.children.length) continue;
      visHash = (visHash * 31 + g.children.length) | 0;
      const list = g.userData.mirrors;
      if (hasMirror || !list) continue;
      for (const b of list) {
        const dx = b.cx - p.x, dy = b.cy - p.y, dz = b.cz - p.z;
        if (dx * dx + dy * dy + dz * dz < R2) { hasMirror = true; break; }
      }
    }
    if (!hasMirror) return;

    const deck = this.world.state?.deck ?? null;
    const dHoriz = Math.hypot(p.x - this._pos.x, p.z - this._pos.z);
    const dVert = Math.abs(p.y - this._pos.y);
    const changed = this._dirty || deck !== this._deck || visHash !== this._visHash || dHoriz > 2.5 || dVert > 1.0;
    if (!changed) return;

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (this._lastAt >= 0 && now - this._lastAt < 350) return;

    this.cubeCam.position.copy(p);
    const prevEnv = mats.mirror.envMap;
    const prevShadow = renderer.shadowMap.enabled;
    const prevTone = renderer.toneMapping;
    const prevTarget = renderer.getRenderTarget();
    try {
      mats.mirror.envMap = null; // avoid WebGL feedback loop while capturing
      renderer.shadowMap.enabled = false;
      renderer.toneMapping = THREE.NoToneMapping;
      this.cubeCam.update(renderer, this.scene);
    } finally {
      renderer.setRenderTarget(prevTarget);
      renderer.shadowMap.enabled = prevShadow;
      renderer.toneMapping = prevTone;
      mats.mirror.envMap = this.rt.texture;
      if (prevEnv !== this.rt.texture) mats.mirror.needsUpdate = true;
    }

    this._pos.copy(p);
    this._deck = deck;
    this._visHash = visHash;
    this._dirty = false;
    this._lastAt = now;
  }
}
