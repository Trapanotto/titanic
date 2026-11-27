// Always-visible HUD minimap: player-centred top view of the current deck + slim side elevation strip.
//
// ---------------------------------------------------------------- transform (world x/z -> map pixels)
// World: +x = bow, +z = starboard. yaw 0 faces the bow, positive yaw turns to PORT,
// forward = (cos yaw, 0, -sin yaw), right (starboard when facing the bow) = (sin yaw, 0, cos yaw).
// The map rotates by θ = yaw (heading-up, default) or θ = 0 (bow-up / "north-up").
// With the player at (px, pz), d = (x - px, z - pz), k = map size in CSS px / visible span in metres:
//     X = cx + k * ( dx * sinθ + dz * cosθ)      (component along the "right" vector of the rotated frame)
//     Y = cy - k * ( dx * cosθ - dz * sinθ)      (component along the "forward" vector, screen y points down)
// θ = yaw: a point straight ahead lands straight above the centre, a point to the player's right lands right.
// θ = 0  : the bow is up, starboard is right, port is left.
// As a canvas matrix (device px, dpr = devicePixelRatio): setTransform(a, b, c, d, e, f) with
//     a = kd·sinθ, b = -kd·cosθ, c = kd·cosθ, d = kd·sinθ, kd = k·dpr,
//     e = dpr·cx - a·px - c·pz,   f = dpr·cy - b·px - d·pz.
// det = kd² > 0, so nothing is mirrored. A direction drawn "up" (0,-1) in screen space and rotated by -φ with
// φ = yaw - θ shows the player's view direction.
import {
  SHIP, DECK_Y, DECK_ORDER, DECK_NAMES, DECK_SEGMENTS, OPEN_DECKS, A_HOUSE, BOAT_HOUSES, BOAT_LOW_ROOFS,
  FUNNELS, MASTS, CASINGS, STAIRS, MACHINERY_ACCESS, MACHINERY_X, EXT_DOORS,
  hullHalfWidth, deckAtY, deckHasInterior,
} from '../core/constants.js';

const STORE_KEY = 'titanic.minimap.v1';
export const ZOOMS = [30, 60, 120];       // visible span across the map in metres
const LAYER_RES = 12;                      // px per metre of the pre-rendered deck layers
const HALF = SHIP.halfBeam + 1;            // layer covers |z| <= HALF
const LAYER_CACHE = 3;                     // decks kept pre-rendered
const CASING_DECKS = new Set(['F', 'E', 'D', 'C', 'B', 'A', 'boat']);
const OPEN_NAMES = {
  boat: 'Offenes Bootsdeck', aProm: 'Promenadendeck', bAft: 'Offenes B-Deck achtern', forecastle: 'Back (Vordeck)',
  poop: 'Poopdeck', wellFwd: 'Vorderes Brunnendeck', wellAft: 'Achteres Brunnendeck',
};
const COL = {
  bg: '#0b1626', cream: '#efe6cf', creamDim: 'rgba(239,230,207,0.6)', brass: '#c9a24a', brassHi: '#f1d58a',
  wall: 'rgba(239,230,207,0.5)', wood: '#6f5a3e', base: 'rgba(239,230,207,0.09)', player: '#ff5a3c',
};
// muted room fills (on dark navy, drawn at ~0.6 alpha)
const TYPE_FILL = {
  corridor: '#b4a888', lobby: '#9a8558', stairwell: '#9a8558', promenade: '#8a7a56',
  public: '#8c6a3a', saloon: '#8c6a3a', restaurant: '#8c6a3a', cafe: '#8c6a3a', suite: '#7a4632',
  service: '#56606a', galley: '#56606a', store: '#4d5660', mess: '#5e6670', dormitory: '#55657a',
  crew: '#5a6872', officer: '#5d6b74', bridge: '#5d6b74', wireless: '#5d6b74', office: '#5d6b74', hospital: '#6a7f86',
  bath: '#4f7a82', gym: '#667f58', sport: '#667f58',
  machinery: '#434d57', tank: '#434d57', hold: '#4a4f52', tunnel: '#434d57',
};
const CLS_FILL = { first: '#7a4632', second: '#5f6c4c', third: '#4d5e74', crew: '#555d64', plain: '#5a5850' };

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

/** Canvas matrix world(x,z) -> device px. Writes [a,b,c,d,e,f] into `out` (no allocation). */
export function mapMatrix(px, pz, yaw, headingUp, k, cx, cy, dpr, out) {
  const th = headingUp ? yaw : 0, s = Math.sin(th), c = Math.cos(th), kd = k * dpr;
  const a = kd * s, b = -kd * c, cc = kd * c, d = kd * s;
  out[0] = a; out[1] = b; out[2] = cc; out[3] = d;
  out[4] = dpr * cx - a * px - cc * pz;
  out[5] = dpr * cy - b * px - d * pz;
  return out;
}

/** world (x,z) -> CSS px on the map; writes {x, y} into `out`. */
export function worldToMap(x, z, px, pz, yaw, headingUp, k, cx, cy, out) {
  const th = headingUp ? yaw : 0, s = Math.sin(th), c = Math.cos(th), dx = x - px, dz = z - pz;
  out.x = cx + k * (dx * s + dz * c);
  out.y = cy - k * (dx * c - dz * s);
  return out;
}

/** Half width of the built-up area of a deck at station x (same as the deck plan). */
function deckHalfWidth(deck, x) { return hullHalfWidth(x, Math.min(DECK_Y[deck], DECK_Y.C) + 0.6); }

/** Half width of the enclosed interior of a deck at station x (0 where the deck has no interior). */
function interiorHalfWidth(deck, x) {
  if (deck === 'boat') {
    for (const b of BOAT_HOUSES) if (x >= b.x0 && x <= b.x1) return b.hw;
    return 0;
  }
  if (!deckHasInterior(deck, x)) return 0;
  const hw = deckHalfWidth(deck, x);
  return deck === 'A' ? Math.min(A_HOUSE.hw, hw) : hw;
}

/** Adds a hull-shaped closed sub-path x0..x1, |z| <= hwFn(x) (no beginPath). */
function regionPath(g, x0, x1, hwFn) {
  const n = Math.max(2, Math.ceil((x1 - x0) / 1.5));
  for (let i = 0; i <= n; i++) { const x = x0 + ((x1 - x0) * i) / n; if (i) g.lineTo(x, -hwFn(x)); else g.moveTo(x, -hwFn(x)); }
  for (let i = n; i >= 0; i--) { const x = x0 + ((x1 - x0) * i) / n; g.lineTo(x, hwFn(x)); }
  g.closePath();
}

function roomFill(r) {
  if (r.type === 'cabin') return CLS_FILL[r.cls] || CLS_FILL.second;
  return TYPE_FILL[r.type] || CLS_FILL[r.cls] || '#625e52';
}

function roomLabel(r) {
  const n = r.name == null ? '' : String(r.name);
  if (r.type === 'corridor' && (!n || n === r.id)) return 'Gang';
  if (!n || (n === r.id && /^[A-Za-z]+-\d+$/.test(n))) return '';
  return n;
}

export class Minimap {
  /**
   * @param opts { parent: HUD element, world, player, ui (for started / modal / startEl / info / action) }
   */
  constructor({ parent, world, player, ui }) {
    this.world = world;
    this.player = player;
    this.ui = ui;
    this.on = true;
    this.headingUp = true;
    this.zoom = 60;
    try {
      const s = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (s && typeof s === 'object') {
        if (typeof s.on === 'boolean') this.on = s.on;
        if (typeof s.headingUp === 'boolean') this.headingUp = s.headingUp;
        if (ZOOMS.includes(s.zoom)) this.zoom = s.zoom;
      }
    } catch { /* private mode */ }

    this._shown = false;
    this._dirty = true;
    this._t = 1;
    this._last = { x: NaN, z: NaN, yaw: NaN, deck: '', found: -1, label: '', room: null, high: false };
    this._size = 0; this._dpr = 0; this._sideW = 0;
    this._m = new Float64Array(6);
    this._pt = { x: 0, y: 0 };
    this._layers = new Map();     // deck -> canvas
    this._rooms = null;           // deck -> rooms[]
    this._tps = null;             // deck -> teleports[]
    this._infos = null;           // deck -> info items[]
    this._sig = [-1, -1, -1];
    this._cone = null; this._coneSize = 0;
    this._sideDeck = '';

    const root = (this.root = el('div', 'minimap'));
    root.hidden = true;
    const map = (this.mapEl = el('div', 'mm-map'));
    map.title = 'Minikarte – Klick: Zoom · J: aus · K: Ausrichtung';
    this.canvas = el('canvas', 'mm-canvas');
    const close = el('button', 'mm-close', '×');
    close.title = 'Minikarte ausblenden (J)';
    close.addEventListener('click', (e) => { e.stopPropagation?.(); this.toggle(); });
    map.append(this.canvas, close);
    this.labelEl = el('div', 'mm-label');
    this.deckEl = el('b', '', '');
    this.roomEl = el('span', '', '');
    this.labelEl.append(this.deckEl, this.roomEl);
    const side = (this.sideEl = el('div', 'mm-side'));
    this.sideCanvas = el('canvas', 'mm-side-canvas');
    this.marker = el('div', 'mm-marker');
    side.append(this.sideCanvas, this.marker);
    root.append(map, this.labelEl, side);
    parent.append(root);

    map.addEventListener('click', () => this.cycleZoom(1)); // touchend below prevents the synthetic click
    map.addEventListener('touchend', (e) => { e.preventDefault?.(); this.ui.action?.('plan'); }, { passive: false });
    window.addEventListener('resize', () => { this._size = 0; this._dirty = true; });
    window.addEventListener('keydown', (e) => this._key(e));
  }

  // ------------------------------------------------------------------ settings

  _save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ on: this.on, headingUp: this.headingUp, zoom: this.zoom })); } catch { /* ignore */ }
  }

  toggle() {
    this.on = !this.on;
    this._save();
    this._dirty = true;
    this.ui.toast?.(this.on ? 'Minikarte an' : 'Minikarte aus (J)', 1.3);
  }

  toggleOrientation() {
    this.headingUp = !this.headingUp;
    this._save();
    this._dirty = true;
    this.ui.toast?.(this.headingUp ? 'Minikarte: Blickrichtung oben' : 'Minikarte: Bug oben', 1.5);
  }

  /** dir +1 = next level (wraps), used by clicks; zoomIn/zoomOut clamp. */
  cycleZoom(dir) {
    const i = ZOOMS.indexOf(this.zoom);
    this.zoom = ZOOMS[(i + dir + ZOOMS.length) % ZOOMS.length];
    this._save(); this._dirty = true;
  }

  setZoomStep(dir) {
    const i = Math.max(0, Math.min(ZOOMS.length - 1, ZOOMS.indexOf(this.zoom) + dir));
    if (ZOOMS[i] === this.zoom) return;
    this.zoom = ZOOMS[i];
    this._save(); this._dirty = true;
    this.ui.toast?.(`Minikarte ${this.zoom} m`, 1);
  }

  _key(e) {
    if (!this.ui.started || e.repeat || e.ctrlKey || e.altKey || e.metaKey) return;
    const tag = e.target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.code === 'KeyJ') this.toggle();
    else if (e.code === 'KeyK') this.toggleOrientation();
    else if (e.key === '+' || e.code === 'NumpadAdd' || e.code === 'Equal') this.setZoomStep(-1);      // zoom in
    else if (e.key === '-' || e.code === 'NumpadSubtract' || e.code === 'Minus') this.setZoomStep(1);  // zoom out
  }

  /** Re-measure (viewport / touch mode changed). */
  relayout() { this._size = 0; this._dirty = true; }

  // ------------------------------------------------------------------ data

  /** (Re)bucket rooms / teleports / info points per deck. Cheap; called when the registries change size. */
  _bucket() {
    const w = this.world, infos = this.ui.info?.items || [];
    const rooms = w.rooms || [];
    const sig = this._sig;
    if (this._rooms && sig[0] === rooms.length && sig[1] === w.teleports.length && sig[2] === infos.length) return;
    const roomsChanged = !this._rooms || sig[0] !== rooms.length;
    sig[0] = rooms.length; sig[1] = w.teleports.length; sig[2] = infos.length;
    const mk = () => Object.fromEntries(DECK_ORDER.map((d) => [d, []]));
    this._rooms = mk(); this._tps = mk(); this._infos = mk();
    for (const r of rooms) if (this._rooms[r.deck]) this._rooms[r.deck].push(r);
    for (const d of DECK_ORDER) this._rooms[d].sort((p, q) => p.x0 - q.x0);
    for (const t of w.teleports) if (this._tps[t.deck]) this._tps[t.deck].push(t);
    for (const it of infos) { const d = deckAtY(it.info?.y ?? it.y); if (this._infos[d]) this._infos[d].push(it); }
    if (roomsChanged) this._layers.clear();
    this._dirty = true;
  }

  /** Room the point lies in (smallest containing rectangle), or null. */
  roomAt(deck, x, z) {
    const list = this._rooms?.[deck];
    if (!list) return null;
    // rooms often extend to z = ±99 ("up to the hull / house wall") – clip them to the enclosed area
    const hw = interiorHalfWidth(deck, x);
    if (!(Math.abs(z) <= hw + 0.05)) return null;
    let best = null, ba = Infinity;
    for (let i = 0; i < list.length; i++) {
      const r = list[i];
      if (r.x0 > x) break; // sorted by x0
      if (x > r.x1 || z < r.z0 || z > r.z1) continue;
      const a = (r.x1 - r.x0) * (Math.min(r.z1, hw) - Math.max(r.z0, -hw));
      if (a < ba) { ba = a; best = r; }
    }
    return best;
  }

  /** Name of the place the player is in (room, staircase, open deck area) or ''. */
  placeName(deck, x, z) {
    const r = this.roomAt(deck, x, z);
    const n = r ? roomLabel(r) : '';
    if (n) return n;
    for (const s of STAIRS) {
      if (s.decks.includes(deck) && x >= s.x0 - 0.5 && x <= s.x1 + 0.5 && Math.abs(z - s.zc) <= s.lane + 0.3) return s.name;
    }
    const y = DECK_Y[deck];
    for (const k in OPEN_DECKS) {
      const o = OPEN_DECKS[k];
      if (o.y === y && x >= o.x0 && x <= o.x1 && Math.abs(z) <= deckHalfWidth(deck, x) + 0.5) return OPEN_NAMES[k] || '';
    }
    return r ? (r.type === 'corridor' ? 'Gang' : '') : '';
  }

  // ------------------------------------------------------------------ per frame

  _visible() {
    const ui = this.ui;
    return this.on && ui.started && ui.modal === null && (!ui.startEl || ui.startEl.hidden);
  }

  update(dt) {
    const vis = this._visible();
    if (vis !== this._shown) { this._shown = vis; this.root.hidden = !vis; if (vis) this._dirty = true; }
    if (!vis) return;
    this._t += dt;
    const minDt = this.ui.root?.classList?.contains?.('touch') ? 0.16 : 0.1;
    if (this._t < minDt) return; // at most ~6 (touch) / ~10 (desktop) redraws per second
    const p = this.player, pos = p.pos, L = this._last;
    const high = p.mode === 'fly' && pos.y > DECK_Y.roof + 6;
    let deck = this.world.state.deck;
    if (high || !(deck in this._deckIndex())) deck = 'boat';
    const found = this.ui.info?.foundCount ?? 0;
    let dyaw = Math.abs(p.yaw - L.yaw); if (dyaw > Math.PI) dyaw = 2 * Math.PI - dyaw;
    const moved = !(Math.abs(pos.x - L.x) < 0.12 && Math.abs(pos.z - L.z) < 0.12) || !(dyaw < 0.025);
    if (!moved && !this._dirty && deck === L.deck && found === L.found && high === L.high) return;
    this._t = 0;
    this._bucket();
    L.x = pos.x; L.z = pos.z; L.yaw = p.yaw; L.deck = deck; L.found = found; L.high = high;
    this._dirty = false;
    this._fit();
    this._draw(deck, pos.x, pos.z, p.yaw);
    this._drawSideMarker(deck, pos);
    // label
    const deckName = high ? 'Über dem Schiff' : DECK_NAMES[deck] || '';
    const room = high ? '' : this.placeName(deck, pos.x, pos.z);
    const label = deckName + '|' + room;
    if (label !== L.label) {
      L.label = label;
      this.deckEl.textContent = deckName;
      this.roomEl.textContent = room ? ' · ' + room : '';
      this.labelEl.title = room ? `${deckName} · ${room}` : deckName;
    }
  }

  _deckIndex() {
    if (!this._di) this._di = Object.fromEntries(DECK_ORDER.map((d, i) => [d, i]));
    return this._di;
  }

  /** Size the canvases for the current viewport / devicePixelRatio. */
  _fit() {
    const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 1), 2);
    if (this._size && dpr === this._dpr) return;
    const W = window.innerWidth || 1280, H = window.innerHeight || 720;
    const touch = !!this.ui.root?.classList?.contains?.('touch');
    let S = Math.round(Math.min(W, H) * 0.2);
    S = Math.max(130, Math.min(touch ? 130 : 300, S));
    if (W < 900 || H < 560) S = 130;
    this._size = S; this._dpr = dpr;
    this.root.style.width = S + 'px';
    this.root.classList.toggle?.('small', S < 170);
    this.mapEl.style.width = this.mapEl.style.height = S + 'px';
    this.canvas.style.width = this.canvas.style.height = S + 'px';
    this.canvas.width = this.canvas.height = Math.round(S * dpr);
    this._cone = null;
    this._fontI = `italic bold ${S < 170 ? 6 : 8}px Georgia, serif`;
    this._fontS = `${S < 170 ? 9 : 10.5}px Georgia, serif`;
    // side strip in true proportions: 50 m of height
    const sw = S - 10, sx = (sw - 6) / SHIP.length, sh = Math.round(50 * sx + 6);
    this._sideW = sw;
    this._side = { sx, h: sh, padX: 3, padB: 3 };
    this.sideCanvas.style.width = sw + 'px'; this.sideCanvas.style.height = sh + 'px';
    this.sideCanvas.width = Math.round(sw * dpr); this.sideCanvas.height = Math.round(sh * dpr);
    this._sideDeck = '';
  }

  // ------------------------------------------------------------------ static deck layer

  _layer(deck) {
    let cv = this._layers.get(deck);
    if (cv) return cv;
    if (this._layers.size >= LAYER_CACHE) this._layers.delete(this._layers.keys().next().value);
    cv = document.createElement('canvas');
    cv.width = Math.ceil(SHIP.length * LAYER_RES);
    cv.height = Math.ceil(2 * HALF * LAYER_RES);
    const g = cv.getContext('2d');
    if (g) this._paintDeck(g, deck);
    this._layers.set(deck, cv);
    return cv;
  }

  /** Paint one deck in world metres (x along the canvas, z down). */
  _paintDeck(g, deck) {
    const R = LAYER_RES, y = DECK_Y[deck], hullHW = (x) => deckHalfWidth(deck, x);
    g.setTransform(R, 0, 0, R, -SHIP.sternX * R, HALF * R);
    g.lineJoin = 'round';
    const x0s = SHIP.sternX + 0.01, x1s = SHIP.bowX - 0.01;

    // widest hull for orientation
    g.beginPath(); regionPath(g, x0s, x1s, (x) => hullHalfWidth(x, DECK_Y.C));
    g.fillStyle = 'rgba(239,230,207,0.035)'; g.fill();
    g.setLineDash?.([1.4, 1]); g.strokeStyle = 'rgba(239,230,207,0.28)'; g.lineWidth = 0.18; g.stroke(); g.setLineDash?.([]);

    // open-air decks at this level
    for (const k in OPEN_DECKS) {
      const o = OPEN_DECKS[k];
      if (o.y !== y) continue;
      g.beginPath(); regionPath(g, Math.max(o.x0, x0s), Math.min(o.x1, x1s), hullHW);
      g.globalAlpha = 0.7; g.fillStyle = COL.wood; g.fill(); g.globalAlpha = 1;
      g.strokeStyle = COL.wall; g.lineWidth = 0.2; g.stroke();
    }

    // interior area (also the clip for rooms)
    const interior = () => {
      g.beginPath();
      if (deck === 'boat') for (const b of BOAT_HOUSES) g.rect(b.x0, -b.hw, b.x1 - b.x0, 2 * b.hw);
      else {
        const hw = deck === 'A' ? (x) => Math.min(A_HOUSE.hw, hullHW(x)) : hullHW;
        for (const [a, b] of DECK_SEGMENTS[deck]) regionPath(g, Math.max(a, x0s), Math.min(b, x1s), hw);
      }
    };
    interior();
    g.fillStyle = '#1a2738'; g.fill();
    g.fillStyle = COL.base; g.fill();

    // rooms
    const rooms = this._rooms?.[deck] || [];
    g.save();
    interior(); g.clip();
    if (deck === 'tank') {
      g.globalAlpha = 0.55; g.fillStyle = '#434d57';
      g.beginPath(); regionPath(g, MACHINERY_X[0], MACHINERY_X[1], hullHW); g.fill();
    }
    for (const r of rooms) {
      g.globalAlpha = r.type === 'corridor' ? 0.42 : r.noAccess ? 0.35 : 0.62;
      g.fillStyle = roomFill(r);
      g.fillRect(r.x0, r.z0, r.x1 - r.x0, r.z1 - r.z0);
    }
    g.globalAlpha = 1;
    g.strokeStyle = COL.wall; g.lineWidth = 0.13;
    g.beginPath();
    for (const r of rooms) if (r.type !== 'corridor') g.rect(r.x0, r.z0, r.x1 - r.x0, r.z1 - r.z0);
    g.stroke();
    g.restore();
    interior();
    g.strokeStyle = 'rgba(239,230,207,0.75)'; g.lineWidth = 0.22; g.stroke();
    if (deck === 'boat') {
      g.fillStyle = 'rgba(150,145,130,0.55)'; g.strokeStyle = COL.wall; g.lineWidth = 0.15;
      for (const b of BOAT_LOW_ROOFS) { g.beginPath(); g.rect(b.x0, -b.hw, b.x1 - b.x0, 2 * b.hw); g.fill(); g.stroke(); }
    }

    // casings / funnels
    if (CASING_DECKS.has(deck)) {
      g.fillStyle = '#343a41'; g.strokeStyle = 'rgba(239,230,207,0.55)'; g.lineWidth = 0.15;
      for (const c of CASINGS) { g.beginPath(); g.rect(c.x0, -c.hw, c.x1 - c.x0, 2 * c.hw); g.fill(); g.stroke(); }
    }
    if (deck === 'boat') {
      for (const f of FUNNELS) {
        g.beginPath(); g.ellipse(f.x, 0, f.a, f.b, 0, 0, Math.PI * 2);
        g.fillStyle = '#b98a4e'; g.fill(); g.strokeStyle = '#141416'; g.lineWidth = 0.35; g.stroke();
      }
      g.fillStyle = '#d9c9a0';
      for (const m of MASTS) { g.beginPath(); g.arc(m.x, 0, 0.35, 0, Math.PI * 2); g.fill(); }
    }

    // stairs: lanes, step hatching, up/down arrows
    for (const s of STAIRS) {
      const i = s.decks.indexOf(deck);
      if (i < 0) continue;
      const len = s.x1 - s.x0;
      g.globalAlpha = 0.85; g.fillStyle = '#e6dcc0';
      g.fillRect(s.x0, s.zc - s.lane, len, 2 * s.lane);
      g.globalAlpha = 1;
      g.beginPath();
      for (let x = s.x0 + 0.45; x < s.x1 - 0.05; x += 0.45) { g.moveTo(x, s.zc - s.lane); g.lineTo(x, s.zc + s.lane); }
      g.strokeStyle = 'rgba(70,58,34,0.7)'; g.lineWidth = 0.07; g.stroke();
      g.strokeStyle = '#6b5a36'; g.lineWidth = 0.14; g.strokeRect(s.x0, s.zc - s.lane, len, 2 * s.lane);
      // flight i rises from this deck, flight i-1 arrives here from below (see constants.js STAIRS)
      const arrow = (k, up) => {
        const port = k % 2 === 0, zc = port ? s.zc - s.lane / 2 : s.zc + s.lane / 2;
        // even flights climb towards +x, odd towards -x; descending arrows point the other way
        const dir = (port ? 1 : -1) * (up ? 1 : -1), xm = (s.x0 + s.x1) / 2, h = Math.min(len * 0.32, 1.6), wv = Math.min(s.lane * 0.32, 0.6);
        g.beginPath(); g.moveTo(xm + dir * h, zc); g.lineTo(xm - dir * h * 0.6, zc - wv); g.lineTo(xm - dir * h * 0.6, zc + wv); g.closePath();
        g.fillStyle = up ? '#8a5f14' : '#2c3b50'; g.fill();
      };
      if (s.type === 'imperial') {
        // imperial: the central flight climbs from the foot (x1) towards -x to the half-landing; the two side flights
        // arrive from below at x1 – going down, one walks them towards -x as well
        const xm = (s.x0 + s.x1) / 2, h = Math.min(len * 0.3, 1.4);
        const tri = (zc, w, col) => {
          g.beginPath(); g.moveTo(xm - h, zc); g.lineTo(xm + h * 0.6, zc - w); g.lineTo(xm + h * 0.6, zc + w); g.closePath();
          g.fillStyle = col; g.fill();
        };
        if (i < s.decks.length - 1) tri(s.zc, Math.min(s.cw * 0.6, 0.6), '#8a5f14');
        if (i > 0) { const zs = (s.cw + s.gap + s.lane) / 2, w = Math.min((s.lane - s.cw - s.gap) * 0.35, 0.5); tri(s.zc - zs, w, '#2c3b50'); tri(s.zc + zs, w, '#2c3b50'); }
        continue;
      }
      if (i < s.decks.length - 1) arrow(i, true);
      if (i > 0) arrow(i - 1, false);
    }
    if (deck === 'F' || deck === 'tank') {
      g.fillStyle = 'rgba(230,220,192,0.75)'; g.strokeStyle = '#6b5a36'; g.lineWidth = 0.12;
      for (const m of MACHINERY_ACCESS) { g.beginPath(); g.rect(m.x0, m.z0, m.x1 - m.x0, m.z1 - m.z0); g.fill(); g.stroke(); }
    }
    // exterior doors
    g.fillStyle = COL.brassHi;
    for (const d of EXT_DOORS) {
      if (d.deck !== deck) continue;
      if (d.axis === 'x') g.fillRect(d.x - d.w / 2, d.z - 0.18, d.w, 0.36);
      else g.fillRect(d.x - 0.18, d.z - d.w / 2, 0.36, d.w);
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
  }

  // ------------------------------------------------------------------ dynamic map

  _draw(deck, px, pz, yaw) {
    const g = this.canvas.getContext('2d');
    if (!g) return;
    const S = this._size, dpr = this._dpr, r = S / 2, cx = r, cy = r, k = S / this.zoom;
    const hu = this.headingUp, th = hu ? yaw : 0, sn = Math.sin(th), cs = Math.cos(th);
    const m = mapMatrix(px, pz, yaw, hu, k, cx, cy, dpr, this._m);

    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, S, S);
    g.save();
    g.beginPath(); g.arc(cx, cy, r - 1, 0, Math.PI * 2); g.clip();
    g.fillStyle = COL.bg; g.fillRect(0, 0, S, S);

    // static deck layer (only drawn if the ship is anywhere near)
    if (Math.abs(pz) < HALF + this.zoom && px > SHIP.sternX - this.zoom && px < SHIP.bowX + this.zoom) {
      const layer = this._layer(deck);
      g.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
      g.imageSmoothingEnabled = true;
      g.drawImage(layer, SHIP.sternX, -HALF, layer.width / LAYER_RES, layer.height / LAYER_RES);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // world -> css px (inline, no allocation)
    const lim = r + 6;
    // teleports
    const tps = this._tps?.[deck] || [];
    g.fillStyle = COL.brass; g.strokeStyle = '#3a2708'; g.lineWidth = 1;
    const tr = S < 170 ? 2.4 : 3.2;
    for (let i = 0; i < tps.length; i++) {
      const t = tps[i], dx = t.x - px, dz = t.z - pz;
      const X = cx + k * (dx * sn + dz * cs), Y = cy - k * (dx * cs - dz * sn);
      if (X < -lim + cx || X > cx + lim || Y < cy - lim || Y > cy + lim) continue;
      g.beginPath(); g.arc(X, Y, tr, 0, Math.PI * 2); g.fill(); g.stroke();
    }
    // undiscovered info points
    const infos = this._infos?.[deck] || [];
    const ir = S < 170 ? 3.2 : 4.2;
    g.font = this._fontI; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let i = 0; i < infos.length; i++) {
      const it = infos[i];
      if (it.found) continue;
      const dx = it.x - px, dz = it.z - pz;
      const X = cx + k * (dx * sn + dz * cs), Y = cy - k * (dx * cs - dz * sn);
      if (X < cx - lim || X > cx + lim || Y < cy - lim || Y > cy + lim) continue;
      g.beginPath(); g.arc(X, Y, ir, 0, Math.PI * 2);
      g.fillStyle = COL.brassHi; g.fill(); g.strokeStyle = '#5c400f'; g.lineWidth = 0.8; g.stroke();
      g.fillStyle = '#3a2708'; g.fillText('i', X, Y + 0.5);
    }

    // view cone + player arrow (screen space, rotated by -(yaw - θ))
    const phi = yaw - th;
    if (!this._cone || this._coneSize !== S) {
      const grad = g.createRadialGradient(0, 0, 0, 0, 0, r * 0.62);
      grad.addColorStop(0, 'rgba(241,213,138,0.42)'); grad.addColorStop(1, 'rgba(241,213,138,0)');
      this._cone = grad; this._coneSize = S;
    }
    g.translate(cx, cy); g.rotate(-phi);
    const ca = 0.62; // half opening angle of the cone (~70° field of view)
    g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, r * 0.62, -Math.PI / 2 - ca, -Math.PI / 2 + ca); g.closePath();
    g.fillStyle = this._cone; g.fill();
    const a = S < 170 ? 6 : 8;
    g.beginPath(); g.moveTo(0, -a); g.lineTo(a * 0.68, a * 0.75); g.lineTo(0, a * 0.35); g.lineTo(-a * 0.68, a * 0.75); g.closePath();
    g.fillStyle = COL.player; g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 1.2; g.stroke();
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.restore();

    // rim: brass ring, bow marker, zoom
    g.beginPath(); g.arc(cx, cy, r - 1, 0, Math.PI * 2);
    g.strokeStyle = COL.brass; g.lineWidth = 1.5; g.stroke();
    g.beginPath(); g.arc(cx, cy, r - 4.5, 0, Math.PI * 2);
    g.strokeStyle = 'rgba(201,162,74,0.3)'; g.lineWidth = 0.8; g.stroke();
    // bow direction on screen = (sinθ, -cosθ)
    const bx = sn, by = -cs;
    g.save();
    g.translate(cx + bx * (r - 2), cy + by * (r - 2)); g.rotate(th);
    g.beginPath(); g.moveTo(0, -1); g.lineTo(5, 7); g.lineTo(-5, 7); g.closePath();
    g.fillStyle = COL.brassHi; g.fill(); g.strokeStyle = '#3a2708'; g.lineWidth = 0.8; g.stroke();
    g.restore();
    g.font = this._fontS; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = COL.cream;
    g.fillText('Bug', cx + bx * (r - 17), cy + by * (r - 17));
    g.fillStyle = COL.creamDim;
    g.fillText(this.zoom + ' m', cx, cy + r - (S < 170 ? 10 : 13));
  }

  // ------------------------------------------------------------------ side elevation strip

  _drawSide(deck) {
    const g = this.sideCanvas.getContext('2d');
    if (!g) return;
    const { sx, h, padX, padB } = this._side, w = this._sideW, dpr = this._dpr;
    const X = (x) => padX + (x - SHIP.sternX) * sx, Y = (y) => h - padB - y * sx;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    const { A, B, C, boat, roof } = DECK_Y, od = OPEN_DECKS;
    g.fillStyle = 'rgba(60,110,150,0.3)'; g.fillRect(0, Y(SHIP.waterline), w, h - Y(SHIP.waterline));
    const pts = [
      [-124, 0], [-130, 6], [SHIP.sternX, 15], [SHIP.sternX, B], [od.poop.x1, B], [od.wellAft.x0, C], [od.wellAft.x1, C],
      [od.bAft.x0, B], [od.bAft.x1, B], [od.bAft.x1, A], [od.wellFwd.x0, A], [od.wellFwd.x0, C], [od.wellFwd.x1, C],
      [od.forecastle.x0, B], [SHIP.bowX, B + 0.6], [SHIP.bowX - 1.2, SHIP.waterline], [SHIP.bowX - 3.5, 0],
    ];
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y))));
    g.closePath();
    g.save(); g.clip();
    g.fillStyle = '#1c1d22'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(233,228,212,0.85)'; g.fillRect(0, 0, w, Y(C + 0.9));
    g.fillStyle = '#5e2a23'; g.fillRect(0, Y(SHIP.waterline), w, h);
    g.restore();
    g.fillStyle = 'rgba(233,228,212,0.85)';
    g.fillRect(X(A_HOUSE.x0), Y(boat), (A_HOUSE.x1 - A_HOUSE.x0) * sx, (boat - A) * sx);
    for (const b of BOAT_HOUSES) g.fillRect(X(b.x0), Y(roof), (b.x1 - b.x0) * sx, (roof - boat) * sx);
    for (const f of FUNNELS) {
      const top = roof + f.height, lean = -f.rake * f.height;
      g.fillStyle = '#c9944f';
      g.beginPath(); g.moveTo(X(f.x - f.a), Y(roof)); g.lineTo(X(f.x + f.a), Y(roof)); g.lineTo(X(f.x + f.a + lean), Y(top)); g.lineTo(X(f.x - f.a + lean), Y(top)); g.fill();
      g.fillStyle = '#141416';
      g.fillRect(X(f.x - f.a + lean), Y(top), 2 * f.a * sx, f.height * 0.22 * sx);
    }
    // current deck
    g.strokeStyle = COL.brassHi; g.lineWidth = 1.2;
    const yy = Math.round(Y(DECK_Y[deck])) + 0.5;
    g.beginPath();
    for (const [a, b] of DECK_SEGMENTS[deck]) { g.moveTo(X(a), yy); g.lineTo(X(b), yy); }
    for (const k in OPEN_DECKS) { const o = OPEN_DECKS[k]; if (o.y === DECK_Y[deck]) { g.moveTo(X(o.x0), yy); g.lineTo(X(o.x1), yy); } }
    g.stroke();
  }

  _drawSideMarker(deck, pos) {
    if (deck !== this._sideDeck) { this._sideDeck = deck; this._drawSide(deck); }
    const { sx, h, padX, padB } = this._side;
    const x = Math.max(SHIP.sternX - 4, Math.min(SHIP.bowX + 4, pos.x)), y = Math.max(0, Math.min(55, pos.y + 0.9));
    const mx = 4 + padX + (x - SHIP.sternX) * sx, my = 2 + h - padB - y * sx; // 4/2 = .mm-side padding
    this.marker.style.transform = `translate(${mx.toFixed(1)}px, ${my.toFixed(1)}px)`;
  }
}
