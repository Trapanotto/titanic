// First-person player: walk (collision, gravity, stairs) and fly mode.
// Pure movement core – no DOM access here, so it can be tested headless. Input is written into
// `player.input` by src/app/controls.js (keyboard / mouse / touch).
import { SHIP, hullHalfWidth } from '../core/constants.js';

export const PLAYER = {
  radius: 0.3,
  height: 1.7,
  eye: 1.65,
  walkSpeed: 2.4,
  runSpeed: 6,
  flySpeed: 12,
  flyFast: 40,
  jumpSpeed: 2.8,     // ~0.4 m jump
  gravity: 9.81,
  maxStep: 0.75,      // follow the ground up/down to this difference
  subStep: 0.2,       // max horizontal distance per collision step
  maxPitch: 1.5,
  landRange: 3,       // fly -> walk: ground must be within this distance below the camera
};

const HALF_PI = Math.PI / 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export class Player {
  /**
   * @param world  World (needs groundAt, collide, state)
   * @param camera THREE.PerspectiveCamera (or any object with position.set / rotation.set / rotation.order)
   */
  constructor(world, camera) {
    this.world = world;
    this.camera = camera;
    if (camera?.rotation) camera.rotation.order = 'YXZ';

    /** feet position (in fly mode: camera position minus eye height) */
    this.pos = { x: 0, y: 0, z: 0 };
    this.vel = { x: 0, y: 0, z: 0 };
    /** yaw 0 = looking at the bow (+x), positive = turning to port (counter-clockwise from above) */
    this.yaw = 0;
    this.pitch = 0;
    this.mode = 'walk';
    this.grounded = false;
    this.headBob = true;
    this.flySpeedScale = 1;
    this.speed = 0; // current horizontal speed (m/s), for the HUD

    /** movement intent, written by the controls: f = forward(-1..1), s = strafe right, u = up/down (fly) */
    this.input = { f: 0, s: 0, u: 0, run: false, jump: false };

    /** optional callbacks: onHint(text), onRespawn(), onModeChange(mode) */
    this.onHint = null;
    this.onRespawn = null;
    this.onModeChange = null;

    this._airTime = 0;
    this._outsideTime = 0;
    this._safeTimer = 0;
    this._safeNew = { x: 0, y: 0, z: 0, ok: false };
    this._safeOld = { x: 0, y: 0, z: 0, ok: false };
    this._eyeY = PLAYER.eye;   // smoothed camera height (stairs / steps)
    this._bobPhase = 0;
    this._bobAmp = 0;
    this._setMode('walk', true);
  }

  // ---------------------------------------------------------------- public API

  /** Jump to a teleport {x, y (floor height), z, yaw}. Always switches to walk mode. */
  teleport(t) {
    const p = this.pos;
    p.x = t.x; p.z = t.z ?? 0; p.y = t.y ?? 0;
    if (t.yaw !== undefined) this.yaw = t.yaw;
    this.pitch = t.pitch ?? 0;
    this.vel.x = this.vel.y = this.vel.z = 0;
    this._setMode('walk');
    // settle on the real ground if the given height is slightly off
    const g = this.world.groundAt(p.x, p.z, p.y + 0.3);
    if (g !== null && Math.abs(g - p.y) <= PLAYER.maxStep) p.y = g;
    this.grounded = g !== null;
    this._airTime = this._outsideTime = 0;
    if (this.grounded) this._markSafe(true);
    else this._safeNew.ok = this._safeOld.ok = false; // nothing to stand on: a fall ends in fly mode
    this._eyeY = p.y + PLAYER.eye;
    this._bobAmp = 0;
    this.applyCamera();
  }

  /** Place the CAMERA at x,y,z in fly mode (yaw/pitch in radians, optional). */
  setFlyPose(x, y, z, yaw, pitch) {
    this.pos.x = x; this.pos.y = y - PLAYER.eye; this.pos.z = z;
    if (yaw !== undefined) this.yaw = yaw;
    if (pitch !== undefined) this.pitch = clamp(pitch, -PLAYER.maxPitch, PLAYER.maxPitch);
    this.vel.x = this.vel.y = this.vel.z = 0;
    this._setMode('fly');
    this._eyeY = y;
    this.applyCamera();
  }

  /** Turn the view towards a world point. */
  lookAt(x, y, z) {
    const dx = x - this.pos.x, dy = y - (this.pos.y + PLAYER.eye), dz = z - this.pos.z;
    this.yaw = Math.atan2(-dz, dx);
    this.pitch = clamp(Math.atan2(dy, Math.hypot(dx, dz)), -PLAYER.maxPitch, PLAYER.maxPitch);
    this.applyCamera();
  }

  /** Mouse / touch look in radians (dx > 0 turns right, dy > 0 looks down). */
  look(dx, dy) {
    this.yaw -= dx;
    if (this.yaw > Math.PI) this.yaw -= 2 * Math.PI; else if (this.yaw < -Math.PI) this.yaw += 2 * Math.PI;
    this.pitch = clamp(this.pitch - dy, -PLAYER.maxPitch, PLAYER.maxPitch);
  }

  /** Toggle walk <-> fly. Returns the resulting mode. */
  toggleFly() {
    if (this.mode === 'walk') {
      this._setMode('fly');
      this.vel.y = 0;
    } else if (!this.tryLand()) {
      this.onHint?.('Kein Deck unter dir – fliege zu einem Deck');
    }
    return this.mode;
  }

  /** fly -> walk if there is ground within PLAYER.landRange below the camera. */
  tryLand() {
    const p = this.pos, camY = p.y + PLAYER.eye;
    for (let h = camY - 0.6; h >= camY - PLAYER.landRange - 0.01; h -= 0.6) {
      const g = this.world.groundAt(p.x, p.z, h);
      if (g === null || g < camY - PLAYER.landRange - 0.2) continue;
      p.y = g;
      const c = this.world.collide(p.x, p.z, p.y, PLAYER.radius, PLAYER.height);
      p.x = c.x; p.z = c.z;
      this.vel.x = this.vel.y = this.vel.z = 0;
      this.grounded = true;
      this._airTime = this._outsideTime = 0;
      this._setMode('walk');
      this._markSafe(true);
      return true;
    }
    return false;
  }

  changeFlySpeed(factor) {
    this.flySpeedScale = clamp(this.flySpeedScale * factor, 0.1, 8);
    return this.flySpeedScale;
  }

  /** Advance the simulation and write the camera. */
  update(dt) {
    if (this.mode === 'fly') this._updateFly(dt); else this._updateWalk(dt);
    this.applyCamera(dt);
  }

  /** Write position/orientation to the camera (dt only used for smoothing). */
  applyCamera(dt = 0) {
    const cam = this.camera;
    if (!cam) return;
    const p = this.pos;
    const target = p.y + PLAYER.eye;
    if (this.mode === 'fly' || dt <= 0) this._eyeY = target;
    else {
      // smooth steps and stair treads, but never lag far behind
      this._eyeY += (target - this._eyeY) * (1 - Math.exp(-16 * dt));
      this._eyeY = clamp(this._eyeY, target - 0.35, target + 0.35);
    }
    let bob = 0;
    if (this.headBob && this.mode === 'walk') bob = Math.sin(this._bobPhase * 2) * 0.028 * this._bobAmp;
    cam.position.set(p.x, this._eyeY + bob, p.z);
    cam.rotation.set(this.pitch, this.yaw - HALF_PI, 0);
  }

  // ---------------------------------------------------------------- internals

  _setMode(mode, silent) {
    const changed = this.mode !== mode;
    this.mode = mode;
    if (this.world?.state) this.world.state.mode = mode;
    if (changed && !silent) this.onModeChange?.(mode);
  }

  _updateFly(dt) {
    const inp = this.input, p = this.pos, v = this.vel;
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw), cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    // forward follows the view direction, strafe stays horizontal, u is world up
    let tx = inp.f * cy * cp + inp.s * sy;
    let ty = inp.f * sp + inp.u;
    let tz = -inp.f * sy * cp + inp.s * cy;
    const len = Math.hypot(tx, ty, tz);
    const speed = (inp.run ? PLAYER.flyFast : PLAYER.flySpeed) * this.flySpeedScale;
    if (len > 1) { tx /= len; ty /= len; tz /= len; }
    const k = 1 - Math.exp(-10 * dt);
    v.x += (tx * speed - v.x) * k; v.y += (ty * speed - v.y) * k; v.z += (tz * speed - v.z) * k;
    p.x += v.x * dt; p.y += v.y * dt; p.z += v.z * dt;
    p.x = clamp(p.x, -3000, 3000); p.z = clamp(p.z, -3000, 3000); p.y = clamp(p.y, -20, 1500);
    this.speed = Math.hypot(v.x, v.z);
    this.grounded = false;
  }

  _updateWalk(dt) {
    const inp = this.input, p = this.pos, v = this.vel, w = this.world;
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);

    // --- horizontal velocity (smooth acceleration) ---
    let tx = inp.f * cy + inp.s * sy;
    let tz = -inp.f * sy + inp.s * cy;
    const len = Math.hypot(tx, tz);
    if (len > 1) { tx /= len; tz /= len; }
    const speed = inp.run ? PLAYER.runSpeed : PLAYER.walkSpeed;
    const k = 1 - Math.exp(-(this.grounded ? (len > 0.01 ? 10 : 14) : 2.5) * dt);
    v.x += (tx * speed - v.x) * k;
    v.z += (tz * speed - v.z) * k;
    if (len < 0.01 && Math.abs(v.x) + Math.abs(v.z) < 0.02) v.x = v.z = 0;

    // --- horizontal move with collision, sub-stepped (gives wall sliding) ---
    const dx = v.x * dt, dz = v.z * dt;
    const dist = Math.hypot(dx, dz);
    const ox = p.x, oz = p.z;
    if (dist > 1e-6) {
      const n = Math.ceil(dist / PLAYER.subStep);
      const sx = dx / n, sz = dz / n;
      for (let i = 0; i < n; i++) {
        const c = w.collide(p.x + sx, p.z + sz, p.y, PLAYER.radius, PLAYER.height);
        p.x = c.x; p.z = c.z;
        if (this.grounded) this._followGround();
      }
      // velocity actually achieved: stops speed building up against walls
      if (dt > 0) {
        const ax = (p.x - ox) / dt, az = (p.z - oz) / dt;
        if (ax * ax + az * az < v.x * v.x + v.z * v.z) { v.x = ax; v.z = az; }
      }
    }
    this.speed = dt > 0 ? Math.hypot(p.x - ox, p.z - oz) / dt : 0;

    // --- vertical ---
    if (this.grounded) {
      this._followGround();
      if (this.grounded && inp.jump) { v.y = PLAYER.jumpSpeed; this.grounded = false; }
    }
    if (!this.grounded) {
      v.y = Math.max(v.y - PLAYER.gravity * dt, -40);
      let dy = v.y * dt;
      const n = Math.max(1, Math.ceil(Math.abs(dy) / 0.4));
      dy /= n;
      for (let i = 0; i < n; i++) {
        const g = w.groundAt(p.x, p.z, p.y);
        const ny = p.y + dy;
        if (g !== null && ny <= g && v.y <= 0) { p.y = g; v.y = 0; this.grounded = true; break; }
        p.y = ny;
      }
    } else v.y = 0;

    // --- bookkeeping: safe position, falling, respawn ---
    if (this.grounded) {
      this._airTime = 0; this._outsideTime = 0;
      this._safeTimer += dt;
      if (this._safeTimer >= 0.4) this._markSafe(false);
      const moving = this.speed > 0.3;
      this._bobAmp += ((moving ? Math.min(1.6, this.speed / PLAYER.walkSpeed) : 0) - this._bobAmp) * Math.min(1, dt * 8);
      if (moving) this._bobPhase += dt * (3.2 + this.speed * 1.5);
    } else {
      this._airTime += dt;
      this._bobAmp *= Math.max(0, 1 - dt * 8);
      const outside = Math.abs(p.x) > SHIP.bowX || Math.abs(p.z) > hullHalfWidth(p.x, Math.max(p.y, 0)) + 0.5;
      if (outside) this._outsideTime += dt; else this._outsideTime = 0;
      if ((outside && (p.y < SHIP.waterline - 3 || this._outsideTime > 2)) || p.y < -4 || this._airTime > 5) this.respawn();
    }
  }

  /** While grounded: snap to the floor/ramp if it is within reach, otherwise start falling. */
  _followGround() {
    const p = this.pos;
    const g = this.world.groundAt(p.x, p.z, p.y);
    if (g !== null && Math.abs(g - p.y) <= PLAYER.maxStep) p.y = g;
    else { this.grounded = false; this.vel.y = 0; }
  }

  _markSafe(reset) {
    const p = this.pos, a = this._safeNew, b = this._safeOld;
    this._safeTimer = 0;
    if (reset || !a.ok) { a.x = b.x = p.x; a.y = b.y = p.y; a.z = b.z = p.z; a.ok = b.ok = true; return; }
    b.x = a.x; b.y = a.y; b.z = a.z;
    a.x = p.x; a.y = p.y; a.z = p.z;
  }

  /** Back to the last safe grounded position (or fly mode if there never was one). */
  respawn() {
    const s = this._safeOld, p = this.pos;
    this.vel.x = this.vel.y = this.vel.z = 0;
    this._airTime = this._outsideTime = 0;
    if (!s.ok) {
      p.y = Math.max(p.y, SHIP.waterline + 30);
      this._setMode('fly');
      this.onHint?.('Kein Deck unter dir – fliege zu einem Deck');
      return;
    }
    p.x = s.x; p.y = s.y; p.z = s.z;
    this.grounded = true;
    this._safeNew.x = s.x; this._safeNew.y = s.y; this._safeNew.z = s.z;
    this._eyeY = p.y + PLAYER.eye;
    this.onRespawn?.();
  }
}
