// Sound, generated in the browser (Web Audio, no files): sea and wind on the open decks, the engines, boilers and
// dynamos below, footsteps by floor covering, the trio in the Reception Room, and the one-shot sounds of the things
// that can be operated (telegraph bell, ship's bell, whistle, Morse spark).
import { DECK_Y } from '../core/constants.js';
import { ENGINE } from '../core/engine.js';

const STORE_KEY = 'titanic.ton';
const MUSIC = { x: 33.6, z: -12.0, deck: 'D', range: 30 };

// --- the waltz of the trio (own tune, D major, 3/4): melody as [midi, beats] per bar, chords for the accompaniment
const CH = {
  D: { b: 50, c: [66, 69, 74] }, Bm: { b: 47, c: [66, 71, 74] }, G: { b: 43, c: [67, 71, 74] },
  A7: { b: 45, c: [64, 67, 73] }, Em: { b: 52, c: [64, 67, 71] },
};
const WALTZ = [
  ['D', [[78, 2], [76, 1]]], ['Bm', [[74, 2], [71, 1]]], ['G', [[79, 2], [78, 1]]], ['A7', [[76, 3]]],
  ['D', [[78, 2], [81, 1]]], ['Bm', [[78, 2], [74, 1]]], ['Em', [[76, 1], [79, 1], [76, 1]]], ['A7', [[73, 3]]],
  ['D', [[74, 2], [78, 1]]], ['G', [[83, 2], [79, 1]]], ['D', [[81, 2], [78, 1]]], ['A7', [[76, 3]]],
  ['G', [[79, 1], [78, 1], [76, 1]]], ['D', [[78, 2], [74, 1]]], ['A7', [[76, 2], [73, 1]]], ['D', [[74, 3]]],
];
const BEAT = 0.42;
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

const MORSE = { C: '-.-.', Q: '--.-', D: '-..', E: '.', M: '--', G: '--.', Y: '-.--', S: '...', O: '---' };

export class Sound {
  constructor(world, player) {
    this.world = world;
    this.player = player;
    this.ctx = null;
    this.muted = false;
    try { this.muted = localStorage.getItem(STORE_KEY) === 'aus'; } catch { /* private mode */ }
    this._timer = 0;
    this._stride = 0;
    this._foot = 1;
    this._bar = 0;
    this._barAt = 0;
    this._busyUntil = 0;
    const unlock = () => this.unlock();
    for (const ev of ['pointerdown', 'keydown', 'touchend']) window.addEventListener(ev, unlock, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend?.(); else if (!this.muted) this.ctx.resume?.();
    });
  }

  /** Browsers allow sound only after a click, key press or touch: build the graph then. */
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended' && !this.muted && !document.hidden) this.ctx.resume?.(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { this.ctx = new AC(); this._build(); } catch (e) { console.warn('[ton]', e); this.ctx = null; }
  }

  /** Switch the sound on/off; returns true when it is on. */
  toggle() {
    this.muted = !this.muted;
    try { localStorage.setItem(STORE_KEY, this.muted ? 'aus' : 'an'); } catch { /* ignore */ }
    this.unlock();
    if (this.ctx) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.9, this.ctx.currentTime, 0.05);
      if (!this.muted) this.ctx.resume?.();
    }
    return !this.muted;
  }

  // ------------------------------------------------------------------ graph

  _noise(seconds, brown) {
    const c = this.ctx, n = Math.floor(c.sampleRate * seconds), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
    }
    if (brown) { // loop without a click: fade the end into the start
      const f = Math.floor(c.sampleRate * 0.05);
      for (let i = 0; i < f; i++) { const k = i / f; d[n - f + i] = d[n - f + i] * (1 - k) + d[i] * k; }
    }
    return buf;
  }

  _loop(buf, rate = 1) {
    const s = this.ctx.createBufferSource();
    s.buffer = buf; s.loop = true; s.playbackRate.value = rate; s.start();
    return s;
  }

  _filter(type, f, q = 0.7) {
    const b = this.ctx.createBiquadFilter();
    b.type = type; b.frequency.value = f; b.Q.value = q;
    return b;
  }

  _gain(v) { const g = this.ctx.createGain(); g.gain.value = v; return g; }

  _osc(type, f) { const o = this.ctx.createOscillator(); o.type = type; o.frequency.value = f; o.start(); return o; }

  /** chain(a, b, c) connects a -> b -> c and returns the last node */
  _chain(...nodes) { for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]); return nodes[nodes.length - 1]; }

  _build() {
    const c = this.ctx;
    this.master = this._gain(this.muted ? 0 : 0.9);
    const comp = c.createDynamicsCompressor();
    this._chain(this.master, comp, c.destination);
    this.white = this._noise(2, false);
    this.brown = this._noise(4, true);
    const L = (this.layer = {});
    const out = (name) => { const g = this._gain(0); g.connect(this.master); L[name] = g; return g; };

    // sea: slow wash against the hull + hiss of the bow wave
    const sea = out('sea');
    const swell = this._gain(0.6);
    this._chain(this._osc('sine', 0.09), this._gain(0.35), swell.gain);
    this._chain(this._loop(this.brown), this._filter('lowpass', 480), swell, sea);
    this._chain(this._loop(this.white, 0.9), this._filter('bandpass', 1500, 0.5), this._gain(0.05), swell);

    // wind: band of noise that wanders
    const wind = out('wind');
    const wf = this._filter('bandpass', 520, 1.4);
    this._chain(this._osc('sine', 0.13), this._gain(210), wf.frequency);
    this._chain(this._loop(this.white, 0.7), wf, wind);

    // reciprocating engines: low rumble that beats with the cranks, a hum on the hull and a hiss on each stroke
    const eng = out('engine');
    const pulse = this._gain(0.55);
    this.beat = this._osc('sine', 2.67);
    this._chain(this.beat, this._gain(0.45), pulse.gain);
    this._chain(this._loop(this.brown, 0.8), this._filter('lowpass', 110), pulse, eng);
    this._chain(this._osc('sine', 41), this._gain(0.22), pulse);
    this._chain(this._osc('sine', 61.5), this._gain(0.1), pulse);
    this._chain(this._loop(this.white), this._filter('highpass', 2600), this._gain(0.035), pulse);

    // boiler rooms: roar of the fires and the forced draught
    const boil = out('boiler');
    this._chain(this._loop(this.brown, 1.3), this._filter('bandpass', 190, 0.5), boil);
    this._chain(this._loop(this.white, 0.6), this._filter('lowpass', 900), this._gain(0.06), boil);

    // dynamos: steady whine
    const dyn = out('dynamo');
    this._chain(this._osc('sawtooth', 196), this._filter('lowpass', 620), this._gain(0.12), dyn);
    this._chain(this._osc('sine', 98), this._gain(0.25), dyn);

    this.music = out('music');
    this.fx = this._gain(1);
    this.fx.connect(this.master);
  }

  // ------------------------------------------------------------------ per frame

  update(dt) {
    const c = this.ctx, p = this.player;
    if (!c || this.muted || c.state !== 'running') return;
    const st = this.world.state, pos = p.pos;

    // footsteps
    if (p.mode === 'walk' && p.grounded && p.speed > 0.6) {
      this._stride += p.speed * dt;
      const len = p.speed > 3.2 ? 1.05 : 0.74;
      if (this._stride >= len) { this._stride = 0; this._step(st); }
    } else this._stride = 0.5;

    this._timer -= dt;
    if (this._timer > 0) return;
    this._timer = 0.12;
    const t = c.currentTime, L = this.layer, set = (g, v) => g.gain.setTargetAtTime(v, t, 0.35);
    const outside = !st.inside, h = pos.y;
    const sp = ENGINE.speed;

    // sea and wind
    const nearSea = clamp01(1 - (h - 12) / 45);
    set(L.sea, outside ? 0.1 + 0.2 * nearSea : h > DECK_Y.C - 1 ? 0.012 : 0);
    set(L.wind, outside ? 0.035 + 0.05 * clamp01((h - 20) / 40) + 0.03 * sp : 0);

    // machinery (falls off with distance; a faint tremor everywhere inside the lower decks)
    const yT = DECK_Y.tank, dy = (h - yT) * 1.6;
    const near = (x, z, range) => { const d = Math.hypot(pos.x - x, dy, pos.z - z); const k = clamp01(1 - d / range); return k * k; };
    const tremor = st.inside ? (h < DECK_Y.E ? 0.07 : h < DECK_Y.C ? 0.035 : 0.012) : 0.006;
    set(L.engine, Math.pow(sp, 0.7) * Math.max(0.8 * near(-33, 0, 46), tremor));
    this.beat.frequency.setTargetAtTime(Math.max(0.05, 2.67 * sp), t, 0.5);
    const bx = Math.max(-18, Math.min(60, pos.x)); // boiler rooms run from x -18 to 60
    set(L.boiler, 0.42 * near(bx, 0, 24));
    set(L.dynamo, 0.07 * near(-62, 0, 20));

    // the trio in the Reception Room (D deck)
    const md = Math.hypot(pos.x - MUSIC.x, pos.z - MUSIC.z);
    const mk = Math.abs(h - DECK_Y[MUSIC.deck]) < 2.2 && st.inside ? clamp01(1 - md / MUSIC.range) : 0;
    set(this.music, 0.5 * mk * mk);
    if (mk > 0) {
      if (this._barAt < t) this._barAt = t + 0.1;
      while (this._barAt < t + 0.5) { this._playBar(this._bar, this._barAt); this._barAt += 3 * BEAT; this._bar = (this._bar + 1) % WALTZ.length; }
    }
  }

  // ------------------------------------------------------------------ notes and one-shots

  /** tone with an envelope into `dest`; opts: type, attack, decay (exponential tail) or hold + release, vibrato, cutoff */
  _tone(dest, f, at, dur, vol, o = {}) {
    const c = this.ctx, osc = c.createOscillator(), g = c.createGain();
    osc.type = o.type || 'sine'; osc.frequency.value = f;
    const a = o.attack ?? 0.008;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(vol, at + a);
    if (o.sustain) { g.gain.setValueAtTime(vol, at + dur); g.gain.linearRampToValueAtTime(0.0001, at + dur + (o.release ?? 0.08)); }
    else g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    const end = at + dur + (o.sustain ? (o.release ?? 0.08) : 0) + 0.02;
    let node = osc;
    if (o.cutoff) { const lp = this._filter('lowpass', o.cutoff); osc.connect(lp); node = lp; }
    if (o.vibrato) { const v = c.createOscillator(), vg = c.createGain(); v.frequency.value = 5.4; vg.gain.value = f * 0.006; v.connect(vg); vg.connect(osc.frequency); v.start(at); v.stop(end); }
    node.connect(g); g.connect(dest);
    osc.start(at); osc.stop(end);
  }

  _burst(dest, at, dur, vol, type, f, q, buf = this.white) {
    const c = this.ctx, s = c.createBufferSource(), g = c.createGain(), fl = this._filter(type, f, q);
    s.buffer = buf;
    g.gain.setValueAtTime(vol, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    s.connect(fl); fl.connect(g); g.connect(dest);
    s.start(at, Math.random() * 1.5, dur + 0.05);
  }

  _playBar(i, at) {
    const [ch, mel] = WALTZ[i], k = CH[ch], m = this.music;
    this._tone(m, hz(k.b), at, 0.9, 0.3, { type: 'triangle' });                        // cello, plucked
    for (const b of [1, 2]) for (const n of k.c) this._tone(m, hz(n), at + b * BEAT, 0.45, 0.07, { type: 'triangle' }); // piano
    let t = at;
    for (const [n, beats] of mel) {
      this._tone(m, hz(n), t, beats * BEAT - 0.06, 0.11, { type: 'sawtooth', cutoff: 2400, attack: 0.07, sustain: true, release: 0.12, vibrato: true }); // violin
      t += beats * BEAT;
    }
  }

  _step(st) {
    const c = this.ctx, at = c.currentTime, d = st.deck, r = 0.9 + Math.random() * 0.2;
    this._foot = -this._foot;
    const kind = !st.inside ? 'wood' : d === 'tank' || d === 'orlop' ? 'steel' : d === 'G' || d === 'F' || d === 'E' ? 'lino' : 'carpet';
    if (kind === 'wood') { this._burst(this.fx, at, 0.07, 0.3, 'bandpass', 380 * r, 1.6); this._burst(this.fx, at, 0.1, 0.5, 'lowpass', 140, 0.7, this.brown); }
    else if (kind === 'steel') { this._burst(this.fx, at, 0.06, 0.22, 'bandpass', 1400 * r, 5); this._tone(this.fx, 610 * r, at, 0.12, 0.035); this._burst(this.fx, at, 0.09, 0.4, 'lowpass', 180, 0.7, this.brown); }
    else if (kind === 'lino') this._burst(this.fx, at, 0.06, 0.2, 'bandpass', 650 * r, 1.2);
    else this._burst(this.fx, at, 0.09, 0.45, 'lowpass', 210 * r, 0.7, this.brown);
  }

  get ready() { return !!this.ctx && !this.muted; }

  /** two strokes of the telegraph gong */
  telegraphBell() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    for (const d of [0, 0.22]) for (const [f, v] of [[1850, 0.12], [2790, 0.05], [3720, 0.03]]) this._tone(this.fx, f, t + d, 0.6, v);
  }

  /** ship's bell: `n` strokes in pairs */
  bell(n = 2) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < n; i++) {
      const at = t + Math.floor(i / 2) * 1.1 + (i % 2) * 0.38;
      for (const [k, v, d] of [[1, 0.2, 2.6], [2.0, 0.12, 1.8], [2.76, 0.09, 1.3], [4.07, 0.05, 0.8], [5.4, 0.03, 0.5]]) this._tone(this.fx, 540 * k, at, d, v);
      this._burst(this.fx, at, 0.03, 0.2, 'bandpass', 3000, 1);
    }
  }

  /** steam whistle: three deep chimes with the hiss of steam */
  whistle(seconds = 3.2) {
    if (!this.ready) return;
    const c = this.ctx, t = c.currentTime;
    if (t < this._busyUntil) return;
    this._busyUntil = t + seconds + 0.8;
    for (const [f, v] of [[139, 0.2], [175, 0.16], [208, 0.14], [278, 0.05]]) {
      this._tone(this.fx, f, t, seconds, v, { type: 'sawtooth', cutoff: 950, attack: 0.3, sustain: true, release: 0.7 });
      this._tone(this.fx, f * 1.004, t + 0.05, seconds, v * 0.6, { type: 'square', cutoff: 700, attack: 0.4, sustain: true, release: 0.7 });
    }
    const s = c.createBufferSource(), g = c.createGain(), hp = this._filter('highpass', 1800);
    s.buffer = this.white; s.loop = true;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.09, t + 0.2); g.gain.setValueAtTime(0.09, t + seconds); g.gain.linearRampToValueAtTime(0.0001, t + seconds + 0.9);
    s.connect(hp); hp.connect(g); g.connect(this.fx);
    s.start(t); s.stop(t + seconds + 1);
  }

  /** Morse with the rough note of the rotary spark; returns the duration in seconds */
  morse(text) {
    const dot = 0.075;
    let n = 0;
    const marks = [];
    for (const ch of text.toUpperCase()) {
      if (ch === ' ') { n += 4; continue; }
      for (const s of MORSE[ch] || '') { const len = s === '-' ? 3 : 1; marks.push([n, len]); n += len + 1; }
      n += 2;
    }
    if (this.ready) {
      const t = this.ctx.currentTime + 0.05;
      for (const [a, len] of marks) {
        const at = t + a * dot, d = len * dot;
        this._tone(this.fx, 640, at, d, 0.11, { type: 'sawtooth', cutoff: 2600, attack: 0.003, sustain: true, release: 0.01 });
        this._tone(this.fx, 1283, at, d, 0.04, { type: 'square', cutoff: 3000, attack: 0.003, sustain: true, release: 0.01 });
      }
    }
    return n * dot;
  }

  /** door: latch click, soft creak, and the thud when it closes */
  door(opening) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this._burst(this.fx, t, 0.03, 0.2, 'bandpass', 1800, 4);
    this._tone(this.fx, opening ? 310 : 260, t + 0.05, 0.4, 0.012, { type: 'sawtooth', cutoff: 900, attack: 0.1, sustain: true, release: 0.1, vibrato: true });
    if (!opening) { this._burst(this.fx, t + 0.5, 0.12, 0.6, 'lowpass', 160, 0.7, this.brown); this._burst(this.fx, t + 0.5, 0.03, 0.15, 'bandpass', 1500, 3); }
  }

  /** wardrobe door: catch, and the knock of wood on wood when it shuts */
  cupboard(opening) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this._burst(this.fx, t, 0.025, 0.16, 'bandpass', 2600, 5);
    this._tone(this.fx, opening ? 420 : 350, t + 0.04, 0.28, 0.008, { type: 'sawtooth', cutoff: 1200, attack: 0.08, sustain: true, release: 0.08, vibrato: true });
    if (!opening) { this._burst(this.fx, t + 0.42, 0.07, 0.35, 'lowpass', 320, 0.8, this.brown); this._burst(this.fx, t + 0.42, 0.02, 0.12, 'bandpass', 2200, 4); }
  }

  /** drawer: wood sliding on wood */
  drawer(opening) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this._burst(this.fx, t, 0.32, 0.22, 'bandpass', opening ? 520 : 440, 1.2, this.brown);
    this._burst(this.fx, t + (opening ? 0.3 : 0.34), 0.05, opening ? 0.12 : 0.3, 'lowpass', 380, 0.8, this.brown);
  }

  /** electric bell push: the buzz of the indicator bell far away in the pantry */
  bellPush() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this._burst(this.fx, t, 0.02, 0.1, 'bandpass', 3000, 4);
    for (let i = 0; i < 16; i++) this._tone(this.fx, 1960, t + 0.12 + i * 0.055, 0.05, 0.022, { type: 'triangle', attack: 0.004 });
  }

  /** light switch */
  click() { if (this.ready) { const t = this.ctx.currentTime; this._burst(this.fx, t, 0.02, 0.22, 'bandpass', 2400, 5); this._burst(this.fx, t + 0.03, 0.015, 0.1, 'bandpass', 1500, 4); } }

  /** davits and falls at work: the pawl of the crank, the creak of the rope in the blocks */
  davit(seconds) {
    if (!this.ready) return;
    const t = this.ctx.currentTime, n = Math.floor(seconds / 0.16);
    for (let i = 0; i < n; i++) this._burst(this.fx, t + i * 0.16, 0.025, 0.1, 'bandpass', 2100 + (i % 3) * 180, 5);
    for (let i = 0; i < seconds / 1.3; i++) this._tone(this.fx, 150 + Math.random() * 60, t + i * 1.3 + Math.random() * 0.4, 0.5, 0.018, { type: 'sawtooth', cutoff: 700, attack: 0.15, sustain: true, release: 0.2, vibrato: true });
  }

  /** the boat takes the water */
  splash() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this._burst(this.fx, t, 1.4, 0.5, 'lowpass', 900, 0.6);
    this._burst(this.fx, t + 0.05, 0.9, 0.35, 'bandpass', 2600, 0.6);
    this._burst(this.fx, t, 0.5, 0.6, 'lowpass', 180, 0.8, this.brown);
  }

  /** a clock striking n times */
  chime(n) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < n; i++) for (const [f, v] of [[523, 0.07], [1046, 0.03], [1570, 0.015]]) this._tone(this.fx, f, t + i * 1.1, 1.6, v, { type: 'sine' });
  }

  /** an open fire: crackle and the low roar */
  fire(seconds = 6) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this._burst(this.fx, t, seconds, 0.12, 'lowpass', 300, 0.7, this.brown);
    for (let i = 0; i < seconds * 5; i++) this._burst(this.fx, t + Math.random() * seconds, 0.02 + Math.random() * 0.03, 0.08 + Math.random() * 0.14, 'bandpass', 1800 + Math.random() * 2600, 3);
  }

  /** a disc sliding over the deck planks / a rope ring landing */
  slide(seconds = 1.5) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this._burst(this.fx, t, 0.04, 0.3, 'lowpass', 500, 1, this.brown);
    this._burst(this.fx, t + 0.03, seconds, 0.14, 'bandpass', 1300, 0.7);
  }
  thud() { if (this.ready) { const t = this.ctx.currentTime; this._burst(this.fx, t, 0.09, 0.4, 'lowpass', 260, 0.8, this.brown); this._burst(this.fx, t, 0.03, 0.1, 'bandpass', 1700, 3); } }

  /** cast-iron fire door thrown open or shut */
  clang() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    for (const [f, v, d] of [[310, 0.16, 0.5], [487, 0.09, 0.4], [1130, 0.05, 0.25], [1790, 0.03, 0.18]]) this._tone(this.fx, f, t, d, v, { type: 'triangle', attack: 0.002 });
    this._burst(this.fx, t, 0.05, 0.3, 'bandpass', 1400, 2);
  }

  /** a shovel of coal: the scrape on the plates, the throw, the fire roaring up */
  shovel() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this._burst(this.fx, t, 0.28, 0.3, 'bandpass', 2300, 1.5);
    this._burst(this.fx, t + 0.4, 0.2, 0.25, 'lowpass', 900, 0.8, this.brown);
    this._burst(this.fx, t + 0.55, 3, 0.35, 'lowpass', 420, 0.7, this.brown);
    for (let i = 0; i < 12; i++) this._burst(this.fx, t + 0.6 + Math.random() * 2.2, 0.03, 0.1 + Math.random() * 0.1, 'bandpass', 2000 + Math.random() * 2500, 3);
  }

  /** anchor chain running over the windlass */
  chain(seconds = 6) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < seconds / 0.11; i++) { const at = t + i * 0.11 + Math.random() * 0.02; this._burst(this.fx, at, 0.05, 0.16, 'bandpass', 900 + (i % 4) * 260, 3); this._tone(this.fx, 180 + (i % 3) * 40, at, 0.09, 0.03, { type: 'square', cutoff: 900, attack: 0.002 }); }
    this._burst(this.fx, t, seconds, 0.12, 'lowpass', 200, 0.8, this.brown);
  }

  /** an electric exercise machine running: motor hum and the knock of its crank */
  machine(seconds = 8) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this._tone(this.fx, 58, t, seconds, 0.07, { type: 'sawtooth', cutoff: 300, attack: 0.4, sustain: true, release: 0.5 });
    this._tone(this.fx, 117, t, seconds, 0.02, { type: 'triangle', attack: 0.4, sustain: true, release: 0.5 });
    for (let i = 0; i < seconds / 0.42; i++) this._burst(this.fx, t + 0.3 + i * 0.42, 0.05, 0.12, 'lowpass', 500, 1, this.brown);
  }

  /** squash ball: racquet, wall, floor */
  pock(at = 0, f = 900) { if (this.ready) { const t = this.ctx.currentTime + at; this._burst(this.fx, t, 0.035, 0.35, 'bandpass', f, 2.5); this._tone(this.fx, f * 0.5, t, 0.06, 0.05, { type: 'sine', attack: 0.002 }); } }

  /** tap: squeak of the valve */
  tap(on) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this._tone(this.fx, on ? 1250 : 980, t, 0.16, 0.012, { type: 'triangle', attack: 0.03, vibrato: true });
    this._burst(this.fx, t, 0.04, 0.08, 'bandpass', 3200, 3);
  }

  /** running water near the visitor: level 0..1 (app/fixtures.js sets it every frame) */
  water(level) {
    if (!this.ready) return;
    if (!this._water) {
      if (level <= 0) return;
      const g = this._gain(0), g2 = this._gain(0);
      this._chain(this._loop(this.white, 1.1), this._filter('bandpass', 3400, 0.5), g, this.fx);
      this._chain(this._loop(this.brown, 1.6), this._filter('bandpass', 620, 0.8), g2, this.fx); // the splash in the basin
      this._water = [g, g2];
    }
    const t = this.ctx.currentTime;
    this._water[0].gain.setTargetAtTime(level * 0.05, t, 0.12);
    this._water[1].gain.setTargetAtTime(level * 0.22, t, 0.12);
  }

  /** water closet: the chain, the rush from the cistern, the gurgle, the cistern filling again */
  flush() {
    if (!this.ready) return;
    const c = this.ctx, t = c.currentTime;
    if (t < (this._flushUntil || 0)) return;
    this._flushUntil = t + 5;
    for (let i = 0; i < 3; i++) this._burst(this.fx, t + i * 0.045, 0.03, 0.12, 'bandpass', 2800, 5);
    const s = c.createBufferSource(), g = c.createGain(), f = this._filter('bandpass', 900, 0.6);
    s.buffer = this.white;
    g.gain.setValueAtTime(0.0001, t + 0.15); g.gain.linearRampToValueAtTime(0.3, t + 0.4); g.gain.setValueAtTime(0.3, t + 1.6); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
    f.frequency.setValueAtTime(1400, t + 0.15); f.frequency.exponentialRampToValueAtTime(380, t + 3.0);
    s.connect(f); f.connect(g); g.connect(this.fx);
    s.start(t + 0.15, 0, 3.2);
    this._burst(this.fx, t + 0.3, 2.4, 0.5, 'lowpass', 240, 0.8, this.brown);
    for (let i = 0; i < 5; i++) this._tone(this.fx, 150 + Math.random() * 90, t + 2.5 + i * 0.13, 0.12, 0.05, { type: 'sine', attack: 0.02 });
    this._burst(this.fx, t + 3.2, 1.6, 0.05, 'highpass', 4200, 0.5);
  }

  /** electric lift: gate rattle, motor hum, gate again */
  lift(seconds) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 5; i++) { this._burst(this.fx, t + i * 0.05, 0.03, 0.14, 'bandpass', 2400, 4); this._burst(this.fx, t + seconds - 0.25 + i * 0.05, 0.03, 0.14, 'bandpass', 2400, 4); }
    this._tone(this.fx, 96, t + 0.3, seconds - 0.7, 0.12, { type: 'sawtooth', cutoff: 420, attack: 0.3, sustain: true, release: 0.4 });
    this._tone(this.fx, 193, t + 0.3, seconds - 0.7, 0.04, { type: 'triangle', attack: 0.3, sustain: true, release: 0.4 });
    this._tone(this.fx, 1320, t + seconds, 0.8, 0.06);
  }

  /** a few bars on a piano */
  piano() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    if (t < (this._pianoUntil || 0)) return;
    const start = 4 * Math.floor(Math.random() * 4);
    this._pianoUntil = t + 12 * BEAT;
    for (let i = 0; i < 4; i++) {
      const [ch, mel] = WALTZ[start + i], k = CH[ch], at = t + 0.05 + i * 3 * BEAT;
      this._tone(this.fx, hz(k.b), at, 1.1, 0.16, { type: 'triangle' });
      for (const b of [1, 2]) for (const n of k.c) this._tone(this.fx, hz(n), at + b * BEAT, 0.5, 0.045, { type: 'triangle' });
      let u = at;
      for (const [n, beats] of mel) { this._tone(this.fx, hz(n), u, 1.2, 0.12, { type: 'triangle' }); this._tone(this.fx, hz(n) * 2, u, 0.5, 0.02); u += beats * BEAT; }
    }
  }

  /** watertight door: gear rattling while the plate runs, thud at the end */
  wtDoor() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 14; i++) this._burst(this.fx, t + i * 0.12, 0.04, 0.14, 'bandpass', 1300, 5);
    this._burst(this.fx, t + 1.75, 0.25, 0.7, 'lowpass', 120, 0.7, this.brown);
  }

  /** alarm bells before the watertight doors close */
  alarm() {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 16; i++) for (const [f, v] of [[2100, 0.07], [3150, 0.03]]) this._tone(this.fx, f, t + i * 0.11, 0.25, v);
  }

  /** ratchet of the steering gear while the wheel turns */
  wheelClicks(n = 10) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < n; i++) this._burst(this.fx, t + i * 0.11, 0.025, 0.12, 'bandpass', 2200, 3);
  }
}
