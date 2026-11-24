// Keyboard / mouse / pointer-lock / touch input -> player.input and named actions.
const LOOK_SENS = 0.0022;

const MOVE_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'ShiftLeft', 'ShiftRight', 'Space', 'KeyQ', 'KeyE', 'ControlLeft', 'ControlRight',
]);
const ACTIONS = {
  KeyF: 'fly', KeyN: 'night', KeyM: 'plan', KeyH: 'help', KeyE: 'info', KeyP: 'fps', KeyB: 'bob', KeyT: 'sound', KeyK: 'hints',
  Escape: 'escape', Enter: 'enter',
};

export class Controls {
  /**
   * @param player Player
   * @param canvas renderer canvas
   * @param opts { noLock, isBlocked(): boolean (modal open), onAction(name, event), onLockChange(locked) }
   */
  constructor(player, canvas, opts = {}) {
    this.player = player;
    this.canvas = canvas;
    this.noLock = !!opts.noLock;
    this.isBlocked = opts.isBlocked || (() => false);
    this.onAction = opts.onAction || (() => {});
    this.onLockChange = opts.onLockChange || (() => {});
    this.locked = false;
    this.touch = false;
    this.keys = new Set();
    this._drag = false;
    this._touchMove = { id: -1, x0: 0, y0: 0, f: 0, s: 0 };
    this._touchLook = { id: -1, x: 0, y: 0 };
    this._touchJump = false;
    this._touchUp = 0;
    this._taps = new Map();   // touch id -> { x, y, t } (a short touch that does not move is a tap)
    this._press = null;       // mouse press { x, y, t }
    this._bind();
  }

  /** True when the player may look/move (pointer locked, or a mode that needs no lock). */
  // No confirmation step: keys work immediately; the pointer is locked on the first key press or click.
  get active() { return !this.isBlocked(); }

  requestLock() {
    if (this.noLock || this.touch || this.locked || this.isBlocked()) return;
    try {
      const p = this.canvas.requestPointerLock?.();
      if (p && p.catch) p.catch(() => {}); // e.g. re-lock too soon after Esc – the user simply clicks again
    } catch { /* ignore */ }
  }

  releaseLock() {
    if (document.pointerLockElement === this.canvas) document.exitPointerLock?.();
  }

  clearKeys() { this.keys.clear(); this._drag = false; }

  /** Write the current movement intent into player.input. Call once per frame before player.update(). */
  apply() {
    const inp = this.player.input, k = this.keys, fly = this.player.mode === 'fly';
    if (!this.active) { inp.f = inp.s = inp.u = 0; inp.run = inp.jump = false; return; }
    let f = 0, s = 0, u = 0;
    if (k.has('KeyW') || k.has('ArrowUp')) f += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) f -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) s += 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) s -= 1;
    if (fly) {
      if (k.has('KeyE') || k.has('Space')) u += 1;
      if (k.has('KeyQ') || k.has('ControlLeft') || k.has('ControlRight')) u -= 1;
    }
    const tm = this._touchMove;
    if (tm.id !== -1) { f += tm.f; s += tm.s; }
    u += this._touchUp;
    inp.f = f; inp.s = s; inp.u = u;
    inp.run = k.has('ShiftLeft') || k.has('ShiftRight') || (tm.id !== -1 && Math.hypot(tm.f, tm.s) > 0.92);
    inp.jump = !fly && (k.has('Space') || this._touchJump);
    this._touchJump = false;
  }

  // ------------------------------------------------------------------ events

  _bind() {
    const c = this.canvas;
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === c;
      if (!this.locked) this.keys.clear();
      this.onLockChange(this.locked);
    });
    document.addEventListener('pointerlockerror', () => { this.locked = false; this.onLockChange(false); });

    window.addEventListener('keydown', (e) => {
      const tag = e.target?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA';
      if (typing && e.code !== 'Escape') return;
      if (e.altKey || e.metaKey) return;
      if (MOVE_KEYS.has(e.code)) {
        if (!this.isBlocked()) { this.keys.add(e.code); if (!this.locked && !e.repeat) this.requestLock(); }
        if (e.code !== 'ControlLeft' && e.code !== 'ControlRight' && !e.ctrlKey) e.preventDefault();
      }
      if (e.repeat || e.ctrlKey) return;
      const a = ACTIONS[e.code];
      if (a) this.onAction(a, e);
      else if (/^(Digit|Numpad)[1-9]$/.test(e.code)) this.onAction('quick', e, +e.code.slice(-1));
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.clearKeys());

    document.addEventListener('mousemove', (e) => {
      if (this.isBlocked()) return;
      if (this.locked || this._drag) {
        // some browsers report huge spikes right after locking
        const dx = Math.max(-150, Math.min(150, e.movementX || 0)), dy = Math.max(-150, Math.min(150, e.movementY || 0));
        this.player.look(dx * LOOK_SENS, dy * LOOK_SENS);
      }
    });
    c.addEventListener('mousedown', (e) => {
      if (e.button === 0) { this._drag = true; this._press = { x: e.clientX, y: e.clientY, t: performance.now(), locked: this.locked }; } // drag-look works even without pointer lock
      if (this.noLock || this.touch) return;
      if (!this.locked) this.requestLock();
    });
    window.addEventListener('mouseup', (e) => {
      this._drag = false;
      const p = this._press;
      this._press = null;
      if (!p || e.button !== 0 || this.isBlocked() || performance.now() - p.t > 400) return;
      // a click without dragging: with a locked pointer it aims at the centre of the view
      if (p.locked) this.onAction('tap', e, { x: window.innerWidth / 2, y: window.innerHeight / 2 });
      else if (Math.hypot(e.clientX - p.x, e.clientY - p.y) < 6) this.onAction('tap', e, { x: e.clientX, y: e.clientY });
    });
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener('wheel', (e) => {
      if (this.isBlocked()) return;
      e.preventDefault();
      if (this.player.mode === 'fly') this.onAction('flyspeed', e, e.deltaY < 0 ? 1.25 : 0.8);
    }, { passive: false });

    // --- touch: left half = virtual joystick (move), right half = look ---
    const tm = this._touchMove, tl = this._touchLook;
    c.addEventListener('touchstart', (e) => {
      if (!this.touch) { this.touch = true; this.onAction('touchmode', e); }
      if (this.isBlocked()) return;
      e.preventDefault();
      for (const t of e.changedTouches) {
        this._taps.set(t.identifier, { x: t.clientX, y: t.clientY, t: performance.now() });
        if (t.clientX < window.innerWidth * 0.45 && tm.id === -1) {
          tm.id = t.identifier; tm.x0 = t.clientX; tm.y0 = t.clientY; tm.f = tm.s = 0;
          this.onAction('stick', e, tm);
        } else if (tl.id === -1) { tl.id = t.identifier; tl.x = t.clientX; tl.y = t.clientY; }
      }
    }, { passive: false });
    c.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier === tm.id) {
          const R = 56;
          let dx = (t.clientX - tm.x0) / R, dy = (t.clientY - tm.y0) / R;
          const l = Math.hypot(dx, dy);
          if (l > 1) { dx /= l; dy /= l; }
          tm.s = Math.abs(dx) < 0.12 ? 0 : dx; tm.f = Math.abs(dy) < 0.12 ? 0 : -dy;
          this.onAction('stick', e, tm);
        } else if (t.identifier === tl.id) {
          if (!this.isBlocked()) this.player.look((t.clientX - tl.x) * LOOK_SENS * 2.2, (t.clientY - tl.y) * LOOK_SENS * 2.2);
          tl.x = t.clientX; tl.y = t.clientY;
        }
      }
    }, { passive: false });
    const end = (e) => {
      for (const t of e.changedTouches) {
        const tap = this._taps.get(t.identifier);
        this._taps.delete(t.identifier);
        if (tap && e.type === 'touchend' && !this.isBlocked() && performance.now() - tap.t < 400 && Math.hypot(t.clientX - tap.x, t.clientY - tap.y) < 12) {
          this.onAction('tap', e, { x: t.clientX, y: t.clientY });
        }
        if (t.identifier === tm.id) { tm.id = -1; tm.f = tm.s = 0; this.onAction('stick', e, tm); }
        if (t.identifier === tl.id) tl.id = -1;
      }
    };
    c.addEventListener('touchend', end);
    c.addEventListener('touchcancel', end);
  }

  /** Touch buttons (built by the UI) call these. */
  touchJump() { this._touchJump = true; }
  touchVertical(dir) { this._touchUp = dir; }
}
