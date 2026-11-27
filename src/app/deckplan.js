// Deck plan modal: side elevation + top view of one deck + searchable teleport list.
import {
  SHIP, DECK_Y, DECK_ORDER, DECK_NAMES, DECK_SEGMENTS, OPEN_DECKS, A_HOUSE, BOAT_HOUSES, BOAT_LOW_ROOFS,
  FUNNELS, MASTS, CASINGS, STAIRS, MACHINERY_ACCESS, MACHINERY_X, EXT_DOORS,
  hullHalfWidth, deckAboveY, deckHasInterior,
} from '../core/constants.js';

const COL = {
  cream: '#efe6cf', creamDim: 'rgba(239,230,207,0.55)', brass: '#c9a24a', brassHi: '#f1d58a',
  navy: '#0c1624', line: 'rgba(201,162,74,0.45)', wood: '#9c7d55', room: '#d9ceb0', steel: '#7d868c',
  water: 'rgba(60,110,150,0.28)',
};
const SHORT = { tank: 'Tank', orlop: 'Orlop', G: 'G', F: 'F', E: 'E', D: 'D', C: 'C', B: 'B', A: 'A', boat: 'Boot' };
const Z_STRETCH = 2.2;   // the plan is stretched athwartships so that pins stay clickable
const LABEL_ROWS = 3, ROW_H = 15;
const CASING_DECKS = new Set(['F', 'E', 'D', 'C', 'B', 'A', 'boat']);

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

function fitCanvas(canvas, cssH) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(200, canvas.clientWidth || canvas.parentElement.clientWidth || 600);
  canvas.style.height = cssH + 'px';
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(cssH * dpr)) {
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(cssH * dpr);
  }
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, cssH);
  return { g, w, h: cssH };
}

/** Half width of the built-up area of a deck at station x (plan view). */
function deckHalfWidth(deck, x) {
  return hullHalfWidth(x, Math.min(DECK_Y[deck], DECK_Y.C) + 0.6);
}

export class DeckPlan {
  /**
   * @param parent  DOM element to attach the modal to
   * @param world   World
   * @param player  Player
   * @param onTeleport fn(teleport) – called when a destination was chosen
   * @param onClose fn()
   */
  constructor(parent, world, player, onTeleport, onClose) {
    this.world = world;
    this.player = player;
    this.onTeleport = onTeleport;
    this.onClose = onClose;
    this.isOpen = false;
    this.deck = 'boat';
    this._hoverDeck = null;
    this._hoverTp = null;
    this._hits = [];      // clickable rectangles of the top view
    this._side = null;    // side-view mapping
    this._listBuilt = 0;  // number of teleports the list was built for

    const root = (this.root = el('div', 'modal plan'));
    root.hidden = true;
    const box = el('div', 'plan-box panel');
    const head = el('header', 'plan-head');
    head.append(el('h2', '', 'Deckplan'), el('span', 'plan-sub', 'Deck wählen · Ort anklicken, um dorthin zu gehen'));
    const close = el('button', 'btn-close', '×');
    close.title = 'Schließen (M oder Esc)';
    close.addEventListener('click', () => this.close());
    head.append(close);

    const main = el('div', 'plan-main');
    const left = el('div', 'plan-left');
    const tabsWrap = el('div', 'plan-tabs-wrap');
    this.tabs = el('div', 'plan-tabs');
    this._tabBtns = {};
    for (const d of [...DECK_ORDER].reverse()) {
      const b = el('button', 'plan-tab', SHORT[d]);
      b.title = DECK_NAMES[d];
      b.addEventListener('click', () => this.select(d));
      this._tabBtns[d] = b;
      this.tabs.append(b);
    }
    this._tabLeft = el('button', 'plan-scroll left', '‹');
    this._tabLeft.type = 'button';
    this._tabLeft.setAttribute('aria-label', 'Decks links');
    this._tabLeft.addEventListener('click', () => this.tabs.scrollBy({ left: -140, behavior: 'smooth' }));
    this._tabRight = el('button', 'plan-scroll right', '›');
    this._tabRight.type = 'button';
    this._tabRight.setAttribute('aria-label', 'Decks rechts');
    this._tabRight.addEventListener('click', () => this.tabs.scrollBy({ left: 140, behavior: 'smooth' }));
    tabsWrap.append(this._tabLeft, this.tabs, this._tabRight);
    this.sideCanvas = el('canvas', 'plan-side');
    this.deckTitle = el('h3', 'plan-deckname');
    this.topCanvas = el('canvas', 'plan-top');
    this.legend = el('div', 'plan-legend', 'Backbord oben · Steuerbord unten · Bug rechts · Querrichtung gestreckt dargestellt');
    left.append(tabsWrap, this.sideCanvas, this.deckTitle, this.topCanvas, this.legend);

    const side = el('aside', 'plan-list');
    this.search = el('input', 'plan-search');
    this.search.type = 'search';
    this.search.placeholder = 'Ort suchen …';
    this.search.setAttribute('aria-label', 'Ort suchen');
    this.items = el('div', 'plan-items');
    this.empty = el('div', 'plan-empty', 'Keine Orte gefunden.');
    side.append(this.search, this.items, this.empty);

    main.append(left, side);
    box.append(head, main);
    root.append(box);
    parent.append(root);

    root.addEventListener('click', (e) => { if (e.target === root) this.close(); });
    this.search.addEventListener('input', () => this._filter());
    this.search.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { const first = this.items.querySelector('.plan-item:not([hidden])'); first?.click(); }
    });
    this.sideCanvas.addEventListener('mousemove', (e) => this._sideHover(e));
    this.sideCanvas.addEventListener('mouseleave', () => { if (this._hoverDeck) { this._hoverDeck = null; this._drawSide(); } });
    this.sideCanvas.addEventListener('click', (e) => { const d = this._sidePick(e); if (d) this.select(d); });
    this.topCanvas.addEventListener('mousemove', (e) => this._topHover(e));
    this.topCanvas.addEventListener('mouseleave', () => this._setHoverTp(null));
    this.topCanvas.addEventListener('click', (e) => { const t = this._topPick(e); if (t) this._go(t); });
    this.tabs.addEventListener('scroll', () => this._updateTabArrows(), { passive: true });
    window.addEventListener('resize', () => { if (this.isOpen) { this.draw(); this._updateTabArrows(); } });
  }

  _updateTabArrows() {
    const t = this.tabs;
    if (!t || !this._tabLeft || !this._tabRight) return;
    const canScroll = t.scrollWidth > t.clientWidth + 2;
    this._tabLeft.hidden = !canScroll || t.scrollLeft <= 2;
    this._tabRight.hidden = !canScroll || t.scrollLeft >= t.scrollWidth - t.clientWidth - 2;
  }

  open() {
    this.isOpen = true;
    this.root.hidden = false;
    this._buildList();
    this.search.value = '';
    this._filter();
    this.select(this._playerDeck());
    requestAnimationFrame(() => this._updateTabArrows());
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.root.hidden = true;
    this.search.blur();
    this.onClose?.();
  }

  select(deck) {
    this.deck = deck;
    for (const d in this._tabBtns) this._tabBtns[d].classList.toggle('active', d === deck);
    this._tabBtns[deck]?.scrollIntoView?.({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    requestAnimationFrame(() => this._updateTabArrows());
    setTimeout(() => this._updateTabArrows(), 220);
    const n = this.world.teleports.filter((t) => t.deck === deck).length;
    this.deckTitle.textContent = `${DECK_NAMES[deck]} · ${n} ${n === 1 ? 'Ort' : 'Orte'}`;
    this._hoverTp = null;
    // phones: the list shows the chosen deck only (see style.css), so it starts at the top again
    for (const sec of this.items.children) sec.classList.toggle('other', sec.dataset.deck !== deck);
    this.items.scrollTop = 0;
    this.draw();
  }

  draw() { this._drawSide(); this._drawTop(); }

  _playerDeck() {
    // nearest deck floor below the feet (state.deck is derived from the camera and equivalent while walking)
    const d = this.world.state.deck;
    return d in DECK_Y && DECK_ORDER.includes(d) ? d : 'boat';
  }

  _go(t) {
    this.isOpen = false;
    this.root.hidden = true;
    this.search.blur();
    this.onTeleport(t);
  }

  // ------------------------------------------------------------------ list

  _buildList() {
    const tps = this.world.teleports;
    if (this._listBuilt === tps.length && this.items.childElementCount) return;
    this._listBuilt = tps.length;
    this.items.textContent = '';
    for (const d of [...DECK_ORDER].reverse()) {
      const onDeck = tps.filter((t) => t.deck === d);
      if (!onDeck.length) continue;
      const sec = el('section', 'plan-sec');
      sec.dataset.deck = d;
      const h = el('h4', '', DECK_NAMES[d]);
      h.addEventListener('click', () => this.select(d));
      sec.append(h);
      const groups = new Map();
      for (const t of onDeck) { const k = t.group || ''; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(t); }
      for (const [gname, list] of groups) {
        const grp = el('div', 'plan-grp');
        if (gname) grp.append(el('h5', '', gname));
        for (const t of list) {
          const b = el('button', 'plan-item', t.name);
          b.dataset.q = `${t.name} ${t.group || ''} ${DECK_NAMES[d]}`.toLowerCase();
          b.addEventListener('click', () => this._go(t));
          b.addEventListener('mouseenter', () => { if (t.deck !== this.deck) this.select(t.deck); this._setHoverTp(t); });
          grp.append(b);
        }
        sec.append(grp);
      }
      this.items.append(sec);
    }
  }

  _filter() {
    const q = this.search.value.trim().toLowerCase();
    this.items.classList.toggle('searching', !!q);
    let any = false;
    for (const sec of this.items.children) {
      let secAny = false;
      for (const grp of sec.querySelectorAll('.plan-grp')) {
        let grpAny = false;
        for (const b of grp.querySelectorAll('.plan-item')) {
          const show = !q || b.dataset.q.includes(q);
          b.hidden = !show;
          if (show) grpAny = true;
        }
        grp.hidden = !grpAny;
        if (grpAny) secAny = true;
      }
      sec.hidden = !secAny;
      if (secAny) any = true;
    }
    this.empty.hidden = any;
    this.empty.textContent = this.world.teleports.length ? 'Keine Orte gefunden.' : 'Noch keine Orte vorhanden.';
  }

  // ------------------------------------------------------------------ side elevation

  _drawSide() {
    const { g, w, h } = fitCanvas(this.sideCanvas, 236);
    const padL = 44, padR = 14, padT = 8, padB = 10;
    const sx = (w - padL - padR) / SHIP.length, sy = (h - padT - padB) / 64;
    const X = (x) => padL + (x - SHIP.sternX) * sx, Y = (y) => h - padB - y * sy;
    this._side = { padL, padB, sx, sy, h };
    const { A, B, C, boat, roof } = DECK_Y;
    const od = OPEN_DECKS;

    // hull silhouette
    const hull = new Path2D();
    const pts = [
      [-124, 0], [-130, 6], [SHIP.sternX, 15], [SHIP.sternX, B], [od.poop.x1, B], [od.wellAft.x0, C], [od.wellAft.x1, C],
      [od.bAft.x0, B], [od.bAft.x1, B], [od.bAft.x1, A], [od.wellFwd.x0, A], [od.wellFwd.x0, C], [od.wellFwd.x1, C],
      [od.forecastle.x0, B], [SHIP.bowX, B + 0.6], [SHIP.bowX - 1.2, SHIP.waterline], [SHIP.bowX - 3.5, 0],
    ];
    pts.forEach(([x, y], i) => (i ? hull.lineTo(X(x), Y(y)) : hull.moveTo(X(x), Y(y))));
    hull.closePath();

    // sea
    g.fillStyle = COL.water;
    g.fillRect(0, Y(SHIP.waterline), w, h - Y(SHIP.waterline));
    g.save();
    g.clip(hull);
    g.fillStyle = '#17181c'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e9e4d4'; g.fillRect(0, 0, w, Y(C + 0.9));
    g.fillStyle = '#6e2c24'; g.fillRect(0, Y(SHIP.waterline), w, h);
    g.fillStyle = '#d9a514'; g.fillRect(0, Y(C + 0.9), w, 1.2);
    g.restore();

    // superstructure
    g.fillStyle = '#e9e4d4';
    g.fillRect(X(A_HOUSE.x0), Y(boat), (A_HOUSE.x1 - A_HOUSE.x0) * sx, (boat - A) * sy);
    for (const b of BOAT_HOUSES) g.fillRect(X(b.x0), Y(roof), (b.x1 - b.x0) * sx, (roof - boat) * sy);
    g.fillStyle = 'rgba(20,24,30,0.55)';
    g.fillRect(X(od.boat.x0), Y(boat) - 0.5, (od.boat.x1 - od.boat.x0) * sx, 1);

    // funnels
    for (const f of FUNNELS) {
      const top = roof + f.height, lean = -f.rake * f.height, split = roof + f.height * 0.76;
      const ls = -f.rake * f.height * 0.76;
      g.fillStyle = '#d9a05b';
      g.beginPath(); g.moveTo(X(f.x - f.a), Y(roof)); g.lineTo(X(f.x + f.a), Y(roof)); g.lineTo(X(f.x + f.a + ls), Y(split)); g.lineTo(X(f.x - f.a + ls), Y(split)); g.fill();
      g.fillStyle = '#141416';
      g.beginPath(); g.moveTo(X(f.x - f.a + ls), Y(split)); g.lineTo(X(f.x + f.a + ls), Y(split)); g.lineTo(X(f.x + f.a + lean), Y(top)); g.lineTo(X(f.x - f.a + lean), Y(top)); g.fill();
    }
    // masts
    g.strokeStyle = '#b08a52'; g.lineWidth = 1.4;
    for (const m of MASTS) { g.beginPath(); g.moveTo(X(m.x), Y(m.baseY)); g.lineTo(X(m.x - (m.topY - m.baseY) * 0.1), Y(m.topY)); g.stroke(); }

    // deck bands
    const band = (d, fill) => {
      g.fillStyle = fill;
      const y1 = Y(d === 'tank' ? DECK_Y.orlop : deckAboveY(d)), y0 = Y(DECK_Y[d]);
      for (const [a, b] of DECK_SEGMENTS[d]) g.fillRect(X(a), y1, (b - a) * sx, y0 - y1);
      if (d === 'tank') g.fillRect(X(MACHINERY_X[0]), Y(DECK_Y.F), (MACHINERY_X[1] - MACHINERY_X[0]) * sx, Y(DECK_Y.orlop) - Y(DECK_Y.F));
      for (const o of Object.values(OPEN_DECKS)) if (o.y === DECK_Y[d]) g.fillRect(X(o.x0), y0 - 2.5, (o.x1 - o.x0) * sx, 2.5);
    };
    if (this._hoverDeck && this._hoverDeck !== this.deck) band(this._hoverDeck, 'rgba(241,213,138,0.28)');
    band(this.deck, 'rgba(226,170,60,0.62)');

    // deck lines + labels
    g.font = '10px Georgia, serif'; g.textBaseline = 'middle'; g.textAlign = 'right';
    for (const d of DECK_ORDER) {
      const y = Math.round(Y(DECK_Y[d])) + 0.5, sel = d === this.deck;
      g.strokeStyle = sel ? COL.brassHi : 'rgba(150,130,90,0.55)'; g.lineWidth = sel ? 1.4 : 0.6;
      g.beginPath();
      for (const [a, b] of DECK_SEGMENTS[d]) { g.moveTo(X(a), y); g.lineTo(X(b), y); }
      g.stroke();
      g.fillStyle = sel ? COL.brassHi : d === this._hoverDeck ? COL.cream : COL.creamDim;
      g.fillText(SHORT[d], padL - 8, y - (d === 'tank' ? 0 : 4));
    }
    g.textAlign = 'left'; g.fillStyle = COL.creamDim;
    g.fillText('Heck', X(SHIP.sternX), Y(40));
    g.textAlign = 'right';
    g.fillText('Bug', X(SHIP.bowX), Y(40));

    // player
    const p = this.player.pos;
    if (Math.abs(p.x) < 160 && p.y > -5 && p.y < 70) {
      g.fillStyle = '#ff5a3c'; g.strokeStyle = '#fff'; g.lineWidth = 1;
      g.beginPath(); g.arc(X(p.x), Y(p.y + 1), 3.4, 0, Math.PI * 2); g.fill(); g.stroke();
    }
  }

  _sidePick(e) {
    const s = this._side;
    if (!s) return null;
    const r = this.sideCanvas.getBoundingClientRect();
    const x = (e.clientX - r.left - s.padL) / s.sx + SHIP.sternX;
    const y = (s.h - s.padB - (e.clientY - r.top)) / s.sy;
    if (y < 0) return null;
    let d = 'tank';
    for (const k of DECK_ORDER) if (y >= DECK_Y[k]) d = k;
    if (y > DECK_Y.roof + 3) return null;
    if ((d === 'orlop' || d === 'G') && !deckHasInterior(d, x) && x > MACHINERY_X[0] && x < MACHINERY_X[1]) d = 'tank';
    return d;
  }

  _sideHover(e) {
    const d = this._sidePick(e);
    this.sideCanvas.style.cursor = d ? 'pointer' : 'default';
    if (d !== this._hoverDeck) { this._hoverDeck = d; this._drawSide(); }
  }

  // ------------------------------------------------------------------ top view

  _drawTop() {
    const deck = this.deck, y = DECK_Y[deck];
    const pad = 16, labelH = LABEL_ROWS * ROW_H + 6;
    const wCss = Math.max(200, this.topCanvas.clientWidth || 600);
    const sx = (wCss - 2 * pad) / SHIP.length, sz = sx * Z_STRETCH;
    const planH = 2 * SHIP.halfBeam * sz;
    const { g, w, h } = fitCanvas(this.topCanvas, Math.round(planH + 2 * labelH + 8));
    const cy = h / 2;
    const X = (x) => pad + (x - SHIP.sternX) * sx, Z = (z) => cy + z * sz;

    const region = (x0, x1, hwFn) => {
      const n = Math.max(2, Math.ceil((x1 - x0) / 2));
      g.beginPath();
      for (let i = 0; i <= n; i++) { const x = x0 + ((x1 - x0) * i) / n; const zz = Z(-hwFn(x)); if (i) g.lineTo(X(x), zz); else g.moveTo(X(x), zz); }
      for (let i = n; i >= 0; i--) { const x = x0 + ((x1 - x0) * i) / n; g.lineTo(X(x), Z(hwFn(x))); }
      g.closePath();
    };
    const rect = (x0, x1, z0, z1) => { g.beginPath(); g.rect(X(x0), Z(z0), (x1 - x0) * sx, (z1 - z0) * sz); };
    const hullHW = (x) => deckHalfWidth(deck, x);

    // widest hull outline for orientation
    region(SHIP.sternX, SHIP.bowX, (x) => hullHalfWidth(x, DECK_Y.C));
    g.fillStyle = 'rgba(255,255,255,0.04)'; g.fill();
    g.setLineDash([4, 3]); g.strokeStyle = 'rgba(239,230,207,0.3)'; g.lineWidth = 1; g.stroke(); g.setLineDash([]);

    // open-air decks at this level
    for (const o of Object.values(OPEN_DECKS)) {
      if (o.y !== y) continue;
      region(Math.max(o.x0, SHIP.sternX + 0.01), Math.min(o.x1, SHIP.bowX - 0.01), hullHW);
      g.fillStyle = COL.wood; g.fill();
      g.strokeStyle = 'rgba(60,40,20,0.8)'; g.lineWidth = 1; g.stroke();
    }
    // interior
    g.fillStyle = COL.room; g.strokeStyle = '#4a3c24'; g.lineWidth = 1.2;
    if (deck === 'boat') {
      for (const b of BOAT_HOUSES) { rect(b.x0, b.x1, -b.hw, b.hw); g.fill(); g.stroke(); }
      g.fillStyle = '#b9b3a0';
      for (const b of BOAT_LOW_ROOFS) { rect(b.x0, b.x1, -b.hw, b.hw); g.fill(); g.stroke(); }
    } else {
      const hw = deck === 'A' ? (x) => Math.min(A_HOUSE.hw, hullHW(x)) : hullHW;
      for (const [a, b] of DECK_SEGMENTS[deck]) { region(a, b, hw); g.fill(); g.stroke(); }
    }
    if (deck === 'tank') {
      g.fillStyle = 'rgba(90,100,108,0.55)';
      region(MACHINERY_X[0], MACHINERY_X[1], hullHW); g.fill();
      g.fillStyle = '#2a2f35'; g.font = 'italic 11px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('Kessel- und Maschinenräume', X((MACHINERY_X[0] + MACHINERY_X[1]) / 2), Z(-SHIP.halfBeam * 0.55));
    }
    // casings / funnels
    if (CASING_DECKS.has(deck)) {
      g.fillStyle = '#5b5f63'; g.strokeStyle = '#2b2d30'; g.lineWidth = 1;
      for (const c of CASINGS) { rect(c.x0, c.x1, -c.hw, c.hw); g.fill(); g.stroke(); }
    }
    if (deck === 'boat') {
      for (const f of FUNNELS) {
        g.beginPath(); g.ellipse(X(f.x), Z(0), f.a * sx, f.b * sz, 0, 0, Math.PI * 2);
        g.fillStyle = '#d9a05b'; g.fill(); g.strokeStyle = '#141416'; g.lineWidth = 2; g.stroke();
      }
    }
    // stairs
    for (const s of STAIRS) {
      if (!s.decks.includes(deck)) continue;
      rect(s.x0, s.x1, s.zc - s.lane, s.zc + s.lane);
      g.fillStyle = '#f6efd9'; g.fill(); g.strokeStyle = '#6b5a36'; g.lineWidth = 1; g.stroke();
      g.beginPath();
      for (let x = s.x0 + 0.6; x < s.x1; x += 0.6) { g.moveTo(X(x), Z(s.zc - s.lane)); g.lineTo(X(x), Z(s.zc + s.lane)); }
      g.strokeStyle = 'rgba(107,90,54,0.6)'; g.lineWidth = 0.6; g.stroke();
    }
    if (deck === 'F' || deck === 'tank') {
      g.setLineDash([3, 2]); g.strokeStyle = '#6b5a36'; g.fillStyle = 'rgba(246,239,217,0.8)';
      for (const m of MACHINERY_ACCESS) { rect(m.x0, m.x1, m.z0, m.z1); g.fill(); g.stroke(); }
      g.setLineDash([]);
    }
    // exterior doors
    g.fillStyle = COL.brass;
    for (const d of EXT_DOORS) {
      if (d.deck !== deck) continue;
      if (d.axis === 'x') g.fillRect(X(d.x - d.w / 2), Z(d.z) - 1.5, d.w * sx, 3);
      else g.fillRect(X(d.x) - 1.5, Z(d.z - d.w / 2), 3, d.w * sz);
    }
    // captions
    g.font = '10px Georgia, serif'; g.fillStyle = COL.creamDim; g.textBaseline = 'middle';
    g.textAlign = 'left'; g.fillText('Heck', 2, cy - SHIP.halfBeam * sz - 8);
    g.textAlign = 'right'; g.fillText('Bug →', w - 2, cy - SHIP.halfBeam * sz - 8);

    // player marker
    const p = this.player, onDeck = this._playerDeck() === deck;
    if (Math.abs(p.pos.x) < SHIP.bowX + 8 && Math.abs(p.pos.z) < SHIP.halfBeam + 6) {
      const px = X(p.pos.x), pz = Z(p.pos.z);
      // heading on the (stretched) plan
      const a = Math.atan2(-Math.sin(p.yaw) * Z_STRETCH, Math.cos(p.yaw));
      g.save(); g.translate(px, pz); g.rotate(a);
      g.globalAlpha = onDeck ? 1 : 0.45;
      g.beginPath(); g.moveTo(9, 0); g.lineTo(-6, -5.5); g.lineTo(-3, 0); g.lineTo(-6, 5.5); g.closePath();
      g.fillStyle = '#ff5a3c'; g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 1.2; g.stroke();
      g.restore();
    }

    // teleport pins + labels
    const tps = this.world.teleports.filter((t) => t.deck === deck).sort((a, b) => a.x - b.x);
    const hits = (this._hits = []);
    const rows = { up: Array.from({ length: LABEL_ROWS }, () => []), down: Array.from({ length: LABEL_ROWS }, () => []) };
    g.font = '11px Georgia, serif'; g.textBaseline = 'middle'; g.textAlign = 'center';
    const topEdge = cy - SHIP.halfBeam * sz, botEdge = cy + SHIP.halfBeam * sz;
    for (const t of tps) {
      const px = X(t.x), pz = Z(t.z);
      const tw = g.measureText(t.name).width + 8;
      const lx = Math.max(tw / 2 + 1, Math.min(w - tw / 2 - 1, px));
      let placed = null;
      for (const side of t.z <= 0 ? ['up', 'down'] : ['down', 'up']) {
        for (let r = 0; r < LABEL_ROWS && !placed; r++) {
          if (rows[side][r].every((o) => lx + tw / 2 < o.x0 - 3 || lx - tw / 2 > o.x1 + 3)) {
            rows[side][r].push({ x0: lx - tw / 2, x1: lx + tw / 2 });
            const ly = side === 'up' ? topEdge - 10 - r * ROW_H : botEdge + 10 + r * ROW_H;
            placed = { lx, ly };
          }
        }
        if (placed) break;
      }
      const hot = t === this._hoverTp;
      if (placed) {
        g.strokeStyle = hot ? COL.brassHi : 'rgba(201,162,74,0.5)'; g.lineWidth = hot ? 1.2 : 0.7;
        g.beginPath(); g.moveTo(px, pz); g.lineTo(placed.lx, placed.ly + (placed.ly < pz ? 6 : -6)); g.stroke();
        g.fillStyle = hot ? COL.brassHi : COL.cream;
        g.fillText(t.name, placed.lx, placed.ly);
        hits.push({ x: placed.lx - tw / 2, y: placed.ly - 7, w: tw, h: 14, t });
      }
      hits.push({ x: px - 7, y: pz - 7, w: 14, h: 14, t, px, pz, pin: true, labelled: !!placed });
    }
    for (const hit of hits) {
      if (!hit.pin) continue;
      const hot = hit.t === this._hoverTp;
      g.beginPath(); g.arc(hit.px, hit.pz, hot ? 5.5 : 4, 0, Math.PI * 2);
      g.fillStyle = hot ? COL.brassHi : COL.brass; g.fill();
      g.strokeStyle = '#3a2708'; g.lineWidth = 1.2; g.stroke();
    }
    // tooltip for a hovered pin whose label did not fit
    const hp = hits.find((q) => q.pin && q.t === this._hoverTp && !q.labelled);
    if (hp) {
      const tw = g.measureText(hp.t.name).width + 12;
      const bx = Math.max(2, Math.min(w - tw - 2, hp.px - tw / 2)), by = hp.pz - 26;
      g.fillStyle = 'rgba(12,22,36,0.95)'; g.strokeStyle = COL.brass; g.lineWidth = 1;
      g.beginPath(); g.rect(bx, by, tw, 18); g.fill(); g.stroke();
      g.fillStyle = COL.brassHi; g.fillText(hp.t.name, bx + tw / 2, by + 9);
    }
    if (!tps.length) {
      g.fillStyle = COL.creamDim; g.font = 'italic 12px Georgia, serif';
      g.fillText('Auf diesem Deck sind keine Orte verzeichnet.', w / 2, h - 12);
    }
  }

  _topPick(e) {
    const r = this.topCanvas.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    const pad = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches ? 14 : 4;
    let best = null, bestD = Infinity;
    for (const hit of this._hits) {
      if (x >= hit.x && x <= hit.x + hit.w && y >= hit.y && y <= hit.y + hit.h) {
        if (hit.pin) return hit.t;
        best = hit.t;
      } else if (hit.pin) {
        const d = Math.hypot(x - hit.px, y - hit.pz);
        if (d <= pad + 6 && d < bestD) { bestD = d; best = hit.t; }
      }
    }
    return best;
  }

  _topHover(e) {
    const t = this._topPick(e);
    this.topCanvas.style.cursor = t ? 'pointer' : 'default';
    this._setHoverTp(t);
  }

  _setHoverTp(t) {
    if (t === this._hoverTp) return;
    this._hoverTp = t;
    if (this.isOpen) this._drawTop();
  }
}
