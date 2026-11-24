// DOM overlay: loading screen, HUD, help, info panel, deck plan, touch buttons.
import { DECK_NAMES, DECK_Y } from '../core/constants.js';
import { DeckPlan } from './deckplan.js';
import { InfoPoints } from './infopoints.js';
import { Minimap } from './minimap.js';

const QUICK = ['Bug', 'Brücke', 'Große Treppe', 'Speisesaal', 'Rauchsalon', 'Kesselraum', 'Maschinenraum', 'Poop', 'Krähennest'];

const HELP = [
  ['W A S D / Pfeiltasten', 'bewegen'],
  ['Maus', 'umsehen'],
  ['Shift', 'rennen (im Flug: schnell)'],
  ['Leertaste', 'springen'],
  ['F', 'Flugmodus an/aus – im Flug: Q/Strg ab, E/Leertaste auf, Mausrad Tempo'],
  ['N', 'Tag / Nacht'],
  ['M', 'Deckplan'],
  ['J', 'Minikarte ein/aus'],
  ['K', 'Minikarte: Blickrichtung oben / Bug oben'],
  ['+ / −', 'Minikarte zoomen (30 / 60 / 120 m) – oder Klick auf die Karte'],
  ['E', 'Info lesen (in der Nähe einer Marke) oder etwas bedienen (Türen, Schotttüren, Aufzüge, Schränke, Wasserhähne, Badewannen, Toilettenspülung, Klaviere, Telegraf, Steuerrad, Glocke, Pfeife, Telefon, Fernglas, Morsetaste)'],
  ['T', 'Ton an/aus'],
  ['Klick / Antippen', 'Info-Marke direkt öffnen'],
  ['1 – 9', 'Schnellreise zu Höhepunkten'],
  ['P', 'Leistungsanzeige (FPS, Zeichenaufrufe, Dreiecke, Speicher)'],
  ['G', 'Grafikqualität (niedrig / mittel / hoch)'],
  ['B', 'Kopfwippen an/aus'],
  ['H', 'Hilfe'],
  ['Esc', 'Maus freigeben'],
];

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

export class UI {
  constructor({ world, scene, player, noLock = false }) {
    this.world = world;
    this.player = player;
    this.noLock = noLock;
    this.controls = null;       // set by main.js
    this.renderer = null;       // set by main.js (performance display)
    this.qualityName = () => '';
    this.modal = null;          // null | 'help' | 'info' | 'plan'
    this.started = false;       // loading finished
    this.entered = false;       // user clicked "an Bord gehen" at least once
    this.info = new InfoPoints(world, scene);
    this.quick = [];
    this._hudTimer = 1;
    this._fps = { on: false, frames: 0, time: 0 };
    this._last = { deck: '', sub: '', deg: 999, head: '', prompt: -2, found: -1, total: -1 };
    this._toastTimer = 0;
    this._overlayTimer = 0;

    this.root = $('ui') || document.body.appendChild(el('div'));
    this.loadingEl = $('loading');
    this.startEl = $('start');
    this._buildHud();
    this._buildPanels();
    this.plan = new DeckPlan(this.root, world, player, (t) => this.teleportTo(t), () => this._closed('plan'));
    this.minimap = new Minimap({ parent: this.rightEl, world, player, ui: this });

    player.onHint = (text) => this.toast(text, 4);
    player.onRespawn = () => this.toast('Über Bord gegangen – zurück an Deck gesetzt', 3);
    world.onTimeChange((night) => { this.timeEl.textContent = night ? '☾ Nacht' : '☀ Tag'; });

    if (this.startEl) {
      this.startEl.addEventListener('click', () => { this.entered = true; this.controls?.requestLock(); this._refreshOverlay(); });
      this.startEl.addEventListener('touchend', (e) => { e.preventDefault(); this.entered = true; this.enableTouch(); }, { passive: false });
      window.addEventListener('keydown', (e) => {
        if (this.started && !this.entered && (e.code === 'Enter' || e.code === 'Space')) { e.preventDefault(); this.startEl.click(); }
      });
    }
  }

  // ------------------------------------------------------------------ loading screen

  setProgress(fraction, label) {
    const bar = $('loading-bar'), lab = $('loading-label');
    if (bar) bar.style.width = Math.round(Math.max(0, Math.min(1, fraction)) * 100) + '%';
    if (lab && label !== undefined) lab.textContent = label;
  }

  loadingWarn(text) {
    const box = $('loading-warn');
    if (box) box.append(el('div', '', text));
  }

  loadingFatal(text) {
    this.setProgress(0, text);
    this.loadingEl?.classList.add('fatal');
  }

  /** Modules are built: create info markers, show the start overlay. */
  ready() {
    this.info.build();
    const tps = this.world.teleports;
    this.quick = QUICK.map((q) => tps.find((t) => t.name.toLowerCase().includes(q.toLowerCase())) || null);
    this._fillHelp();
    this.started = true;
    if (this.loadingEl) {
      this.loadingEl.classList.add('done');
      setTimeout(() => { this.loadingEl.hidden = true; }, 900);
    }
    this.root.classList.add('live');
    // desktop: a start button with the three things one needs to know; phones and tablets go straight in
    const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    if (this.noLock || coarse || this.controls?.touch) this.entered = true;
    this._refreshOverlay();
  }

  // ------------------------------------------------------------------ state

  /** True while the player must not move / look (modal open or still loading). */
  isBlocked() { return this.modal !== null || !this.started || !this.entered; }

  enableTouch() {
    if (this.controls) this.controls.touch = true;
    this.root.classList.add('touch');
    this.minimap?.relayout();
    this._refreshOverlay();
  }

  onLockChange() {
    // a click that opened a panel may also have asked for the pointer lock: a panel needs a free pointer
    if (this.modal && this.controls?.locked) this.controls.releaseLock();
    this._refreshOverlay(250);
  }

  /** Start / pause overlay is shown whenever the player has no way to look around. */
  _refreshOverlay(delay = 0) {
    clearTimeout(this._overlayTimer);
    const apply = () => {
      if (!this.startEl) return;
      const c = this.controls;
      const free = !c || c.locked || c.noLock || c.touch;
      // only once, after loading on a desktop; no pause overlay afterwards
      this.startEl.hidden = !(this.started && !this.entered);
    };
    if (delay) this._overlayTimer = setTimeout(apply, delay); else apply();
  }

  _open(name) {
    if (this.modal === name) return;
    if (this.modal) this._hide(this.modal);
    this.modal = name;
    this.controls?.clearKeys();
    this.controls?.releaseLock();
    this._refreshOverlay();
  }

  _hide(name) {
    if (name === 'help') this.helpEl.hidden = true;
    else if (name === 'info') this.infoEl.hidden = true;
    else if (name === 'plan' && this.plan.isOpen) { this.plan.isOpen = false; this.plan.root.hidden = true; }
  }

  /** Close the current modal and go back to the ship. */
  closeModal(relock = true) {
    if (!this.modal) return;
    this._hide(this.modal);
    this._closed(this.modal, relock);
  }

  _closed(name, relock = true) {
    if (this.modal !== name) return;
    this.modal = null;
    if (relock && this.entered) this.controls?.requestLock();
    this._refreshOverlay(350);
  }

  teleportTo(t) {
    if (this.modal) { this._hide(this.modal); this.modal = null; }
    this.player.teleport(t);
    this.entered = true;
    this.controls?.requestLock();
    this._refreshOverlay(350);
    this.toast(`${t.name} · ${DECK_NAMES[t.deck] || ''}`, 2.5);
  }

  /** Named action from the controls (keyboard / touch buttons). */
  action(name, event, arg) {
    if (!this.started) return;
    const p = this.player;
    switch (name) {
      case 'escape': this.closeModal(false); break;
      case 'help': if (this.modal === 'help') this.closeModal(); else { this._open('help'); this.helpEl.hidden = false; } break;
      case 'plan': if (this.modal === 'plan') this.closeModal(); else { this._open('plan'); this.plan.open(); } break;
      case 'info':
        if (this.modal === 'info') this.closeModal();
        else if (!this.modal && p.mode === 'walk' && this.interact && this.interact.nearest !== -1 && (this.interact.nearest !== 'door' || this.info.nearest < 0)) this.interact.run();
        else if (!this.modal && p.mode === 'walk' && this.info.nearest >= 0) this.openInfo(this.info.nearest);
        break;
      case 'night': if (this.modal !== 'plan') { this.world.setNight(!this.world.state.night); this.toast(this.world.state.night ? 'Nacht' : 'Tag', 1.5); } break;
      case 'fly':
        if (this.modal) break;
        if (p.toggleFly() === 'fly') this.toast('Flugmodus – F zum Landen', 2.5); else this.toast('Zu Fuß', 1.5);
        break;
      case 'flyspeed': this.toast(`Fluggeschwindigkeit × ${p.changeFlySpeed(arg).toFixed(2)}`, 1.2); break;
      case 'fps': this._fps.on = !this._fps.on; this.fpsEl.hidden = !this._fps.on; this._fps.frames = 0; this._fps.t0 = 0; if (this._fps.on) this.fpsEl.textContent = '…'; break;
      case 'sound': if (this.sound) this.toast(this.sound.toggle() ? 'Ton an' : 'Ton aus', 1.5); break;
      case 'bob': p.headBob = !p.headBob; this.toast(p.headBob ? 'Kopfwippen an' : 'Kopfwippen aus', 1.5); break;
      case 'quick': { const t = this.quick[arg - 1]; if (!this.modal && t) this.teleportTo(t); break; }
      case 'touchmode': this.entered = true; this.enableTouch(); break;
      case 'tap': {
        if (this.modal || !arg) break;
        const i = this.info.pick(arg.x, arg.y, this.world.camera);
        if (i >= 0) this.openInfo(i);
        break;
      }
      case 'stick': this._stick(arg); break;
      default: break;
    }
  }

  openInfo(i) {
    const it = this.info.items[i];
    if (!it) return;
    this.info.markFound(i);
    this.infoTitle.textContent = it.info.title;
    this.infoText.textContent = '';
    for (const para of String(it.info.text).split(/\n\s*\n/)) this.infoText.append(el('p', '', para.trim()));
    this._open('info');
    this.infoEl.hidden = false;
  }

  /** Performance display (key P): frame time, draw calls, triangles, visible zones / chunks, memory. */
  _perfText(ms) {
    const r = this.renderer, st = this.world.stats || {}, L = [];
    L.push(`${Math.round(1000 / ms)} FPS · ${ms.toFixed(1)} ms`);
    if (r) {
      const i = r.info.render;
      L.push(`${i.calls} Aufrufe · ${(i.triangles / 1e6).toFixed(2).replace('.', ',')} Mio. Dreiecke`);
      L.push(`Zonen ${st.zones ?? '–'} · Blöcke ${st.chunks ?? '–'}/${st.chunksTotal ?? '–'}${st.exterior === false ? ' · außen aus' : ''}`);
      const m = r.info.memory;
      L.push(`Geometrien ${m.geometries} · Texturen ${m.textures}`);
    }
    const pm = performance.memory;
    if (pm && pm.usedJSHeapSize) L.push(`JS-Speicher ${Math.round(pm.usedJSHeapSize / 1048576)} MB`);
    const q = this.qualityName?.();
    if (q) L.push('Qualität ' + q + (this.tier ? ' · Stufe ' + this.tier.name : ''));
    try { const gl = this.renderer?.getContext(); if (gl) L.push(`Tiefe ${gl.getParameter(gl.DEPTH_BITS)} Bit · Glättung ${gl.getContextAttributes().antialias ? 'an' : 'aus'} · Pixel ×${this.renderer.getPixelRatio().toFixed(2)}`); } catch { /* context lost */ }
    const sm = window.__titanic?.streamer?.stats;
    if (sm) L.push(`Decks ${sm.decks || '–'} · ${sm.mb} MB Geometrie`);
    this.fpsEl.textContent = L.join('\n');
  }

  /**
   * Full-screen message with an optional "reload" button (no WebGL 2, lost graphics context …).
   * Returns a function that removes it again.
   */
  showError(title, text, reload = true) {
    this._errEl?.remove();
    const box = el('div', 'modal error');
    const p = el('div', 'panel error-box');
    p.append(el('div', 'info-orn', '✦  White Star Line  ✦'), el('h2', '', title), el('p', 'error-text', text));
    if (reload) {
      const b = el('button', 'btn-reload', 'Neu laden');
      b.addEventListener('click', () => location.reload());
      p.append(b);
    }
    box.append(p);
    this.root.append(box);
    this._errEl = box;
    this.controls?.releaseLock?.();
    return () => { if (this._errEl === box) { box.remove(); this._errEl = null; } };
  }

  toast(text, seconds = 2.5) {
    this.toastEl.textContent = text;
    this.toastEl.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => this.toastEl.classList.remove('show'), seconds * 1000);
  }

  // ------------------------------------------------------------------ per frame

  update(dt, t) {
    const p = this.player, st = this.world.state, L = this._last;
    this.info.update(dt, t, p.pos, p.mode);
    this.minimap.update(dt);

    const f = this._fps;
    if (f.on) {
      const now = performance.now();
      f.frames++;
      if (!f.t0) f.t0 = now;
      if (now - f.t0 >= 500) { this._perfText((now - f.t0) / f.frames); f.frames = 0; f.t0 = now; }
    }

    // compass: arrow points to the bow relative to the view direction
    const deg = Math.round((p.yaw * 180) / Math.PI);
    if (deg !== L.deg) { L.deg = deg; this.needle.style.transform = `rotate(${deg}deg)`; }

    this._hudTimer += dt;
    if (this._hudTimer < 0.15) return;
    this._hudTimer = 0;

    const high = p.mode === 'fly' && p.pos.y > DECK_Y.roof + 6;
    const deck = high ? 'Über dem Schiff' : DECK_NAMES[st.deck] || '';
    if (deck !== L.deck) { L.deck = deck; this.deckEl.textContent = deck; }
    const sub = (high ? 'Freier Flug' : st.inside ? 'Innen' : 'Außendeck') + ' · ' + (p.mode === 'fly' ? 'Flugmodus' : 'Zu Fuß');
    if (sub !== L.sub) { L.sub = sub; this.subEl.textContent = sub; }
    const a = Math.abs(deg);
    const head = a <= 45 ? 'Blick zum Bug' : a >= 135 ? 'Blick zum Heck' : deg > 0 ? 'Blick nach Backbord' : 'Blick nach Steuerbord';
    if (head !== L.head) { L.head = head; this.headEl.textContent = head; }

    const use = this.modal ? -1 : (this.interact?.nearest ?? -1), has = use !== -1;
    // a door steps back behind an info point; everything else that can be operated comes first
    const info = this.modal || (has && use !== 'door') ? -1 : this.info.nearest;
    const act = has && info < 0;
    const near = act ? this.interact.label(use) : info; // things to operate come before the info of the same spot
    if (near !== L.prompt) {
      L.prompt = near;
      if (act) { this.promptText.textContent = near; this.promptEl.classList.add('show'); }
      else if (info >= 0) { this.promptText.textContent = 'Info: ' + this.info.items[info].info.title; this.promptEl.classList.add('show'); }
      else this.promptEl.classList.remove('show');
    }
    const total = this.info.items.length, found = this.info.foundCount;
    if (found !== L.found || total !== L.total) {
      L.found = found; L.total = total;
      this.foundEl.textContent = `Entdeckt ${found} / ${total}`;
      this.foundEl.hidden = total === 0;
    }
  }

  // ------------------------------------------------------------------ DOM

  _buildHud() {
    const hud = (this.hudEl = el('div', 'hud'));
    const tl = el('div', 'hud-tl');
    this.deckEl = el('div', 'hud-deck', '');
    this.subEl = el('div', 'hud-sub', '');
    tl.append(this.deckEl, this.subEl);

    const tr = el('div', 'hud-tr');
    const compass = el('div', 'compass');
    this.needle = el('div', 'needle');
    this.needle.append(el('span', 'needle-tip', '▲'), el('span', 'needle-label', 'Bug'));
    compass.append(this.needle);
    const col = el('div', 'hud-col');
    this.headEl = el('div', 'hud-line', '');
    this.timeEl = el('div', 'hud-line', '☀ Tag');
    this.foundEl = el('div', 'hud-line', '');
    this.foundEl.hidden = true;
    this.fpsEl = el('div', 'hud-line fps', '');
    this.fpsEl.hidden = true;
    col.append(this.headEl, this.timeEl, this.foundEl, this.fpsEl);
    tr.append(col, compass);
    // right column: compass / status lines, then the minimap below them (flows, never overlaps)
    this.rightEl = el('div', 'hud-right');
    this.rightEl.append(tr);

    this.promptEl = el('div', 'prompt');
    this.promptEl.append(el('kbd', '', 'E'), (this.promptText = el('span', '', '')));
    this.promptEl.addEventListener('click', () => this.action('info'));
    this.toastEl = el('div', 'toast');

    const bar = el('div', 'keybar');
    // only the map and the help stay on screen; every other key is listed in the help (H)
    for (const [k, label, act] of [['M', 'Karte', 'plan'], ['H', 'Hilfe', 'help']]) {
      const item = el('span', 'key' + (act === 'plan' ? ' key-main' : ''));
      item.title = label + ' (' + k + ')';
      item.append(el('kbd', '', k), el('span', 'key-label', ' ' + label));
      item.addEventListener('click', (e) => { e.stopPropagation(); if (act === 'minimap') this.minimap?.toggle(); else this.action(act); });
      bar.append(item);
    }

    // touch controls (only visible with .touch on the root)
    const touch = el('div', 'touch-ui');
    this.stickEl = el('div', 'stick');
    this.stickKnob = el('div', 'stick-knob');
    this.stickEl.append(this.stickKnob);
    const btns = el('div', 'touch-btns');
    const tbtn = (label, title, down, up) => {
      const b = el('button', 'tbtn', label);
      b.title = title;
      b.addEventListener('touchstart', (e) => { e.preventDefault(); down(); }, { passive: false });
      if (up) { b.addEventListener('touchend', (e) => { e.preventDefault(); up(); }, { passive: false }); b.addEventListener('touchcancel', up); }
      btns.append(b);
    };
    tbtn('▲', 'Springen / Steigen', () => { if (this.player.mode === 'fly') this.controls.touchVertical(1); else this.controls.touchJump(); }, () => this.controls.touchVertical(0));
    tbtn('▼', 'Sinken', () => { if (this.player.mode === 'fly') this.controls.touchVertical(-1); }, () => this.controls.touchVertical(0));
    tbtn('Fliegen', 'Flugmodus', () => this.action('fly'));
    tbtn('Karte', 'Karte', () => this.action('plan'));
    tbtn('☾', 'Tag / Nacht', () => this.action('night'));
    tbtn('♪', 'Ton an / aus', () => this.action('sound'));
    tbtn('?', 'Hilfe', () => this.action('help'));
    touch.append(this.stickEl, btns);

    hud.append(tl, this.rightEl, this.promptEl, this.toastEl, bar, touch);
    this.root.append(hud);
  }

  _stick(tm) {
    if (!tm || tm.id === -1) { this.stickEl.classList.remove('show'); return; }
    const s = this.stickEl.style;
    s.left = tm.x0 + 'px'; s.top = tm.y0 + 'px';
    this.stickKnob.style.transform = `translate(${tm.s * 40}px, ${-tm.f * 40}px)`;
    this.stickEl.classList.add('show');
  }

  _buildPanels() {
    // help
    const help = (this.helpEl = el('div', 'modal help'));
    help.hidden = true;
    const hb = el('div', 'panel help-box');
    hb.append(el('h2', '', 'Steuerung'));
    const dl = el('dl', 'help-keys');
    for (const [k, v] of HELP) dl.append(el('dt', '', k), el('dd', '', v));
    this.quickEl = el('div', 'help-quick');
    hb.append(dl, this.quickEl, el('div', 'panel-foot', 'H oder Esc zum Schließen'));
    help.append(hb);
    help.addEventListener('click', () => this.closeModal());

    // info
    const info = (this.infoEl = el('div', 'modal info'));
    info.hidden = true;
    const ib = el('div', 'panel info-box');
    this.infoTitle = el('h2', '', '');
    this.infoText = el('div', 'info-text');
    ib.append(el('div', 'info-orn', '✦  White Star Line  ✦'), this.infoTitle, this.infoText, el('div', 'panel-foot', 'E, Esc, Klick oder Antippen zum Schließen'));
    info.append(ib);
    info.addEventListener('click', () => this.closeModal());

    this.root.append(help, info);
  }

  _fillHelp() {
    this.quickEl.textContent = '';
    const have = this.quick.map((t, i) => (t ? [i + 1, t.name] : null)).filter(Boolean);
    if (!have.length) return;
    this.quickEl.append(el('h3', '', 'Schnellreise'));
    const list = el('div', 'quick-list');
    for (const [n, name] of have) {
      const item = el('span', 'key');
      item.append(el('kbd', '', String(n)), document.createTextNode(' ' + name));
      list.append(item);
    }
    this.quickEl.append(list);
  }
}
