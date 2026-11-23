// Deck streaming: only the decks around the player are built, baked and on the GPU.
//
// Start: every deck module is built once in full ("dry pass") so that all logical data exists for the whole ship
// (colliders, floors, ramps, teleports, info points, lamps, rooms, deck plan) – its geometry is thrown away right
// after each module. Then the zones that are needed around the player are rebuilt: the modules feeding them run again
// with every registration switched off (no duplicate colliders / teleports / …), only the content that lands in the
// wanted zones is kept, baked and uploaded. Far zones are evicted (GPU buffers disposed) when the tier's memory budget
// is exceeded. The unit of work is one module build (a whole deck function), the unit of residency one 24 m zone.
//
// Wanted zones: the player's deck, the neighbouring decks (tier), and the decks seen through a stairwell / machinery
// hatch the player stands next to (tier). Missing zones of the player's own deck are loaded behind a short veil;
// everything else is pre-built in idle moments (one module per idle slot) so stairs and wells normally never show a
// missing deck.
import { DECK_Y, DECK_ORDER, STAIRS, MACHINERY_ACCESS, deckAboveY, deckAtY } from '../core/constants.js';
import { yieldTask } from '../core/world.js';

const REG_STUBS = ['addCollider', 'addColliderFor', 'addFloor', 'addRamp', 'addTeleport', 'addInfo', 'addLamp', 'markForBake'];
const STATE_KEYS = ['rooms', '_kitPorts', '_kitStairs', 'funnelTops', 'kitProblems', '_dStats'];
const now = () => performance.now();

export class DeckStreamer {
  constructor(world, tier, { flush = () => {}, onError = null } = {}) {
    this.world = world;
    this.tier = tier;
    this.cfg = tier.stream;
    this.flush = flush;
    this.onError = onError;
    this.mods = [];            // { id, label, load, mod, zones:Set<Group>, update, upd:[], time:[] }
    this.loaded = new Set();   // zones with baked content
    this.used = new Map();     // zone -> last time wanted (s)
    this.busy = false;         // a load is running
    this.blocking = false;     // the player's own deck is loading (veil, no simulation)
    this.stats = { builds: 0, evictions: 0, lastMs: 0, mb: 0, zones: 0, maxOver: 0 };
    this.rush = false;         // the running load must finish as fast as possible (veil is up)
    this.sliceMs = tier.stream.sliceMs ?? 4; // background work per frame
    this._swap = null;
    this._idle = 0;
    this._still = 0;
    this._last = { x: NaN, y: NaN, z: NaN };
    this._veil = null;
    this._openings = null;
  }

  // ------------------------------------------------------------------ build helpers

  /**
   * Run one module build. full = registrations on (dry pass); keep = zones whose new content is kept.
   * A rebuild (full = false) is time-sliced: the module awaits world.tick() at its natural breaks and the frame loop
   * keeps running in between. While it is paused the world looks untouched: the registration stubs and the module's
   * private state are swapped out, content for zones that are not wanted goes into detached stand-in groups, and the
   * module's per-frame code is only registered once the build is complete.
   */
  async _run(m, full, keep) {
    const W = this.world;
    const before = new Map();
    if (full) for (const g of W.zones.values()) before.set(g, g.children.length);
    const sc0 = W.scene.children.length, ex0 = W.exterior.children.length;
    // listeners of the previous build of this module are replaced
    W.updaters = W.updaters.filter((f) => !m.upd.includes(f));
    W._timeListeners = W._timeListeners.filter((f) => !m.time.includes(f));
    m.upd = []; m.time = [];
    const onUpdate = W.onUpdate, onTime = W.onTimeChange, zone = W.zone;
    const real = {}, mine = {}, shadows = new Map();
    const stub = () => ({ x0: 0, x1: 0, y0: 0, y1: 0, z0: 0, z1: 0, s: 0, tag: null });
    const tag0 = W.colliderTag;
    const patch = () => {
      W.colliderTag = m.id;
      if (full) {
        W.onUpdate = (fn) => { m.upd.push(fn); onUpdate.call(W, fn); };
        W.onTimeChange = (fn) => { m.time.push(fn); onTime.call(W, fn); };
        return;
      }
      W.onUpdate = (fn) => { m.upd.push(fn); };
      W.onTimeChange = (fn) => { m.time.push(fn); fn(W.state.night); };
      for (const k of REG_STUBS) W[k] = k === 'markForBake' ? (g) => g : stub;
      for (const k of STATE_KEYS) {
        real[k] = [Object.prototype.hasOwnProperty.call(W, k), W[k]];
        if (k in mine) W[k] = mine[k]; else delete W[k];
      }
      W.zone = (deck, x) => {
        const g = zone.call(W, deck, x);
        if (keep && keep.has(g)) return g;
        let sh = shadows.get(g);
        if (!sh) { sh = new g.constructor(); sh.name = g.name; sh.userData = { ...g.userData, chunks: undefined, batches: undefined }; shadows.set(g, sh); }
        return sh;
      };
    };
    const unpatch = () => {
      delete W.onUpdate; delete W.onTimeChange;
      W.colliderTag = tag0;
      if (full) return;
      for (const k of REG_STUBS) delete W[k];
      for (const k of STATE_KEYS) {
        if (Object.prototype.hasOwnProperty.call(W, k)) mine[k] = W[k]; else delete mine[k];
        const [own, v] = real[k]; if (own) W[k] = v; else delete W[k];
      }
      delete W.zone;
      // a rebuild must not show anything outside the zones (the first build already added it)
      for (let i = W.scene.children.length - 1; i >= sc0; i--) W.scene.children[i].parent = null;
      W.scene.children.length = Math.min(W.scene.children.length, sc0);
      for (let i = W.exterior.children.length - 1; i >= ex0; i--) W.exterior.children[i].parent = null;
      W.exterior.children.length = Math.min(W.exterior.children.length, ex0);
    };
    let res;
    m.mod ??= await m.load();
    patch();
    this._swap = full ? null : { out: unpatch, in: patch };
    try {
      res = await m.mod.build(W);
    } finally {
      this._swap = null;
      unpatch();
    }
    if (!full) { // complete: now its per-frame code may run
      for (const fn of m.upd) onUpdate.call(W, fn);
      for (const fn of m.time) W._timeListeners.push(fn);
    }
    m.update = typeof res?.update === 'function' ? res.update : null;
    if (full) {
      for (const g of W.zones.values()) {
        const n0 = before.get(g) ?? 0;
        if (g.children.length > n0) m.zones.add(g);
        if (!(keep && keep.has(g))) W.dropBuilt(g, n0);
      }
    }
    this.flush();
    this.stats.builds++;
  }

  /** The slice is used up: give the frame back, continue after the next one was drawn (or at once when rushing). */
  async _pause() {
    const S = this.world.slicer, sw = this._swap;
    const over = now() - S.until;
    if (over > this.stats.maxOver) this.stats.maxOver = Math.round(over);
    sw?.out();
    if (this.rush || typeof document === 'undefined' || document.hidden || typeof requestAnimationFrame !== 'function') await yieldTask();
    else await new Promise((r) => { let d = false; const go = () => { if (!d) { d = true; r(); } }; requestAnimationFrame(go); setTimeout(go, 150); });
    sw?.in();
    S.until = now() + (this.rush ? 30 : this.sliceMs);
  }

  /** Dry pass over all streamable modules (logical data for the whole ship). */
  async dryPass(list, onModule) {
    for (const def of list) {
      const m = { ...def, mod: null, zones: new Set(), update: null, upd: [], time: [] };
      this.mods.push(m);
      await onModule?.(m, 'start');
      const t0 = now();
      await this._run(m, true, null);
      m.buildMs = Math.round(now() - t0);
      await onModule?.(m, 'done');
    }
    // nothing of these modules is resident yet: their per-frame code waits for the rebuild
    for (const m of this.mods) this._park(m);
    this.zonesByDeck = {};
    for (const m of this.mods) for (const g of m.zones) (this.zonesByDeck[g.userData.deck] ??= new Set()).add(g);
  }

  /** Module without resident zones: drop its per-frame code (frees the objects it references). */
  _park(m) {
    const W = this.world;
    W.updaters = W.updaters.filter((f) => !m.upd.includes(f));
    W._timeListeners = W._timeListeners.filter((f) => !m.time.includes(f));
    m.upd = []; m.time = []; m.update = null;
  }

  // ------------------------------------------------------------------ which zones are wanted

  _openingList() {
    if (this._openings) return this._openings;
    const o = [];
    for (const s of STAIRS) {
      const k = s.keep || {}, hw = Math.max(s.lane || 0, k.hw || 0) + 0.6;
      o.push({ x0: Math.min(s.x0, k.x0 ?? s.x0, s.back ?? s.x0) - 2, x1: Math.max(s.x1, k.x1 ?? s.x1) + 2, z0: (s.zc || 0) - hw, z1: (s.zc || 0) + hw, decks: s.decks.slice() });
    }
    for (const m of MACHINERY_ACCESS || []) o.push({ x0: m.x0 - 1, x1: m.x1 + 1, z0: m.z0 - 1, z1: m.z1 + 1, decks: DECK_ORDER.slice(0, DECK_ORDER.indexOf('F') + 1) });
    return (this._openings = o);
  }

  /** Decks of the camera position: its own deck first. */
  wanted(p, out = new Set(), neighbours = this.cfg.neighbours) {
    const own = deckAtY(p.y - 1.6);
    const decks = [own];
    const i = DECK_ORDER.indexOf(own);
    for (let k = 1; k <= neighbours; k++) { if (DECK_ORDER[i - k]) decks.push(DECK_ORDER[i - k]); if (DECK_ORDER[i + k]) decks.push(DECK_ORDER[i + k]); }
    for (const d of decks) for (const g of this.zonesByDeck[d] || []) out.add(g);
    // stairwells / hatches next to the camera: the zones of every deck they connect, near the well
    if (this.cfg.wells) {
      for (const o of this._openingList()) {
        if (p.x < o.x0 - 8 || p.x > o.x1 + 8 || p.z < o.z0 - 8 || p.z > o.z1 + 8) continue;
        const lo = DECK_Y[o.decks[0]] - 0.5, hi = deckAboveY(o.decks[o.decks.length - 1]) + 2;
        if (p.y < lo || p.y > hi) continue;
        for (const d of o.decks) for (const g of this.zonesByDeck[d] || []) if (g.userData.x1 > o.x0 - 12 && g.userData.x0 < o.x1 + 12) out.add(g);
      }
    }
    return { own, set: out };
  }

  // ------------------------------------------------------------------ loading / eviction

  /** Build + bake the given zones (all modules that feed them, in build order). */
  async load(zones, { veil = false, rush = veil, label = '' } = {}) {
    const want = new Set([...zones].filter((g) => !this.loaded.has(g)));
    if (!want.size) return;
    this.busy = true;
    this.rush = rush;
    const t0 = now();
    if (veil) this._showVeil(label);
    const W = this.world;
    W.slicer = { until: now() + (rush ? 30 : this.sliceMs), pause: () => this._pause() };
    try {
      for (const g of want) g.userData.loading = true;
      const mods = this.mods.filter((m) => [...m.zones].some((g) => want.has(g)));
      for (let i = 0; i < mods.length; i++) {
        this._setVeil((i + 0.2) / (mods.length + 1));
        await W.tick();
        await this._run(mods[i], false, want);
      }
      await this.world.bakeZones([...want], { onProgress: (f) => this._setVeil((mods.length + f) / (mods.length + 1)) });
      if (this.compileZones) await this.compileZones([...want]);
      for (const g of want) { this.loaded.add(g); this.used.set(g, now() / 1000); }
    } catch (e) {
      console.error('[stream] Laden fehlgeschlagen', e);
      this._failUntil = now() / 1000 + 5;
      this.onError?.(e);
    } finally {
      W.slicer = null;
      for (const g of want) g.userData.loading = false;
      // now visible: listeners (lamp shadows) refresh what they rendered while the zones were hidden
      for (const g of want) if (this.loaded.has(g)) this.world._zoneChanged(g, true);
      this.busy = false;
      this.stats.lastMs = Math.round(now() - t0);
      if (veil || this.rush) this._hideVeil();
      this.rush = false;
      this._account();
    }
  }

  /** Evict unwanted zones (least recently wanted first) while over the memory budget. */
  evict(wantSet) {
    const budget = this.cfg.budgetMB * 1048576;
    let total = 0;
    for (const g of this.loaded) total += g.userData.bytes || 0;
    if (total <= budget) return;
    // hysteresis: a zone must have been unwanted for a while (walking back and forth must not rebuild decks)
    // (hard limit at 1.3 x budget: then any unwanted zone goes, oldest first)
    const old = now() / 1000 - 8, byAge = (a, b) => (this.used.get(a) || 0) - (this.used.get(b) || 0);
    const unwanted = [...this.loaded].filter((g) => !wantSet.has(g)).sort(byAge);
    const out = [];
    for (const g of unwanted) {
      if (total <= budget) break;
      if ((this.used.get(g) || 0) >= old && total <= budget * 1.3) break;
      total -= g.userData.bytes || 0; out.push(g);
      if (out.length >= 2 && !this.blocking) break; // a few zones per frame: disposing a whole deck at once stalls
    }
    if (!out.length) return;
    this._evT = 0; // more to do: continue in the next frame
    this.world.unloadZones(out);
    for (const g of out) { this.loaded.delete(g); this.used.delete(g); }
    // modules with nothing resident any more: drop their per-frame code
    for (const m of this.mods) if (![...m.zones].some((g) => this.loaded.has(g))) this._park(m);
    this.stats.evictions += out.length;
    this._account();
  }

  _account() {
    let b = 0;
    for (const g of this.loaded) b += g.userData.bytes || 0;
    this.stats.mb = Math.round(b / 1048576);
    this.stats.zones = this.loaded.size;
    const decks = new Set();
    for (const g of this.loaded) decks.add(g.userData.deck);
    this.stats.decks = [...decks].sort((a, b) => DECK_ORDER.indexOf(a) - DECK_ORDER.indexOf(b)).join(' ');
  }

  /** Per frame: module animations of resident modules + scheduling of loads. */
  update(dt, t, p) {
    for (const m of this.mods) if (m.update) { try { m.update(dt, t); } catch (e) { if (!m.err) { m.err = 1; console.error('[stream] update', m.id, e); } } }
    if (this.busy) {
      // the player got ahead of a background load (teleport, fast stairs): finish it at full speed behind the veil
      if (!this.rush) {
        const own = deckAtY(p.y - 1.6);
        for (const g of this.zonesByDeck[own] || []) if (!this.loaded.has(g)) { this.rush = true; this.blocking = true; this._showVeil(own); break; }
      }
      return;
    }
    const tNow = now() / 1000;
    if (tNow < (this._failUntil || 0)) return;
    // the wanted set is re-evaluated when the camera moved a bit or every 0.3 s (no per-frame garbage)
    const W = this._want;
    if (!W || tNow - W.t > 0.3 || Math.abs(p.x - W.x) + Math.abs(p.y - W.y) + Math.abs(p.z - W.z) > 0.5) {
      const r = this.wanted(p);
      this._want = { own: r.own, set: r.set, t: tNow, x: p.x, y: p.y, z: p.z };
    }
    const { own, set } = this._want;
    if (W !== this._want || !this._usedT || tNow - this._usedT > 1) { this._usedT = tNow; for (const g of set) if (this.loaded.has(g)) this.used.set(g, tNow); }
    // own deck missing -> load it now, behind the veil
    let ownMissing = false;
    for (const g of this.zonesByDeck[own] || []) if (!this.loaded.has(g)) { ownMissing = true; break; }
    if (ownMissing) {
      this.blocking = true;
      this.load(set, { veil: true, label: own }).then(() => { this.blocking = false; this.evict(set); });
      return;
    }
    // the rest in idle moments: the player stands still (or waited long enough), one module at a time
    const mv = Math.hypot(p.x - this._last.x, p.y - this._last.y, p.z - this._last.z) || 0;
    this._last.x = p.x; this._last.y = p.y; this._last.z = p.z;
    this._still = mv < 0.01 ? this._still + dt : 0;
    this._idle += dt;
    let nMiss = 0;
    for (const g of set) if (!this.loaded.has(g)) nMiss++;
    if (!nMiss) { if (tNow - (this._evT || 0) > 1) { this._evT = tNow; this.evict(set); } return; }
    if (!this._evT) { this._evT = tNow; this.evict(set); return; } // finish evicting before the next build
    const missing = [...set].filter((g) => !this.loaded.has(g));
    if (this._idle < 0.15) return;
    this._idle = 0;
    // one module per slot: the module feeding the missing zone closest to the player's deck (neighbours first)
    const oi = DECK_ORDER.indexOf(own);
    missing.sort((a, b) => Math.abs(DECK_ORDER.indexOf(a.userData.deck) - oi) - Math.abs(DECK_ORDER.indexOf(b.userData.deck) - oi)
      || Math.abs((a.userData.x0 + a.userData.x1) / 2 - p.x) - Math.abs((b.userData.x0 + b.userData.x1) / 2 - p.x));
    const miss = new Set(missing);
    const first = missing[0];
    const m = this.mods.find((x) => x.id !== 'stairs' && x.zones.has(first)) || this.mods.find((x) => x.zones.has(first));
    if (!m) return;
    const zones = [...m.zones].filter((g) => miss.has(g));
    // its zones also need every other module feeding them: load them together
    this.load(zones).then(() => { this.blocking = false; this.evict(set); });
  }

  // ------------------------------------------------------------------ veil

  _showVeil(deck) {
    if (typeof document === 'undefined') return;
    if (!this._veil) {
      const v = document.createElement('div');
      v.style.cssText = 'position:fixed;inset:0;z-index:50;display:flex;flex-direction:column;align-items:center;justify-content:center;'
        + 'background:rgba(6,12,22,0.82);color:#efe6d2;font:18px Georgia,serif;letter-spacing:.04em;pointer-events:none;transition:opacity .2s';
      v.innerHTML = '<div>Deck wird geladen …</div><div style="margin-top:14px;width:200px;height:3px;background:rgba(255,255,255,.18)"><div style="height:100%;width:0;background:#c9a24a"></div></div>';
      document.body.appendChild(v);
      this._veil = v;
      this._bar = v.lastChild.firstChild;
    }
    this._veil.firstChild.textContent = 'Deck wird geladen …';
    this._veil.style.display = 'flex';
    this._bar.style.width = '0';
  }
  _setVeil(f) { if (this._bar && this._veil?.style.display !== 'none') this._bar.style.width = Math.round(f * 100) + '%'; }
  _hideVeil() { if (this._veil) this._veil.style.display = 'none'; }
}
