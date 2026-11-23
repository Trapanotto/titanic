// Interior kit – data-driven room / wall / door builder. See docs/KIT.md.
import { mats } from '../core/materials.js';
import { DECK_Y, ceilingY } from '../core/constants.js';
import {
  Batch, kitMats, matOf, deckHalfWidth, minHalfWidth, deckRanges, casingsOn, overlap, rectMinus, intervalMinus, problem, PLATE_CHARS, kitFine,
} from './batch.js';
import { stairKeepouts, stairHoles, stairSolids } from './stairs.js';
import * as P from './props.js';
import { PRESETS } from './presets.js';
import * as THREE from 'three';
import { tiledBoxGeometry } from '../core/geo.js';

export const SIDES = ['fwd', 'aft', 'port', 'stbd'];
const T2 = 0.05; // half wall thickness

// ---------------------------------------------------------------- wall styles

/** Wall styles: name → { wall, wainscot?, skirt?, dado?, cornice?, rail?, door, lamp }. Extend freely with addStyle(). */
export const STYLES = {
  oakPanel: { wall: 'oakPanel', skirt: 'oak', cornice: 'oak', door: 'oak', lamp: 'bowl' },
  oak: { wall: 'oak', skirt: 'woodDark', cornice: 'oak', door: 'oak', lamp: 'bowl' },
  oakDado: { wall: 'paintCream', wainscot: 'oakPanel', dado: 'oak', skirt: 'oak', cornice: 'oak', door: 'oak', lamp: 'bowl' },
  mahogany: { wall: 'mahogany', skirt: 'woodDark', cornice: 'woodDark', door: 'mahogany', lamp: 'bowl' },
  mahoganyDado: { wall: 'paintCream', wainscot: 'mahogany', dado: 'woodDark', skirt: 'woodDark', cornice: 'woodDark', door: 'mahogany', lamp: 'bowl' },
  whitePanel: { wall: 'whitePanel', skirt: 'paintWhite', cornice: 'paintWhite', door: 'white', lamp: 'dome' },
  whiteGold: { wall: 'whitePanel', skirt: 'paintWhite', cornice: 'gold', dado: 'gold', door: 'white', lamp: 'bowl' },
  whiteDado: { wall: 'paintWhite', wainscot: 'whitePanel', dado: 'paintWhite', skirt: 'paintWhite', door: 'white', lamp: 'dome' },
  paintWhite: { wall: 'paintWhite', door: 'white', lamp: 'dome' },
  cream: { wall: 'paintCream', skirt: 'woodDark', door: 'white', lamp: 'dome' },
  green: { wall: 'paintGreen', skirt: 'woodDark', cornice: 'paintWhite', door: 'white', lamp: 'dome' },
  grey: { wall: 'paintGrey', door: 'steel', lamp: 'bulkhead' },
  pine: { wall: 'pine', door: 'pine', lamp: 'bulkhead' },
  steel: { wall: 'steel', door: 'steel', lamp: 'bulkhead' },
  steelDark: { wall: 'steelDark', door: 'steel', lamp: 'bulkhead' },
  tile: { wall: 'tileWhite', door: 'white', lamp: 'dome' },
  tileBlue: { wall: 'tileBlue', skirt: 'tileWhite', cornice: 'tileWhite', door: 'white', lamp: 'dome' },
  brick: { wall: 'brick', door: 'steel', lamp: 'bulkhead' },
  damaskRed: { wall: 'damaskRed', wainscot: 'whitePanel', dado: 'paintWhite', skirt: 'paintWhite', cornice: 'gold', door: 'white', lamp: 'bowl' },
  damaskGreen: { wall: 'damaskGreen', wainscot: 'whitePanel', dado: 'paintWhite', skirt: 'paintWhite', cornice: 'gold', door: 'white', lamp: 'bowl' },
  damaskBlue: { wall: 'damaskBlue', wainscot: 'whitePanel', dado: 'paintWhite', skirt: 'paintWhite', cornice: 'gold', door: 'white', lamp: 'bowl' },
  damaskGold: { wall: 'damaskGold', wainscot: 'oakPanel', dado: 'oak', skirt: 'oak', cornice: 'gold', door: 'oak', lamp: 'bowl' },
};
export function addStyle(name, def) { STYLES[name] = def; }

/**
 * 3D relief of the wall styles: 'panel' raised & fielded panels with dado / cornice, 'wainscot' panelled dado + plain wall
 * with picture rail, 'boards' tongue-and-groove boarding (beads), 'steel' frames, seam strap with rivets and cable run,
 * 'plain' mouldings only, 'tile' cove skirting, 'none'. Override per style/room with `relief: kind | false`.
 */
const RELIEF = {
  oakPanel: 'panel', oak: 'panel', mahogany: 'panel', whitePanel: 'panel', whiteGold: 'panel', oakDado: 'wainscot', mahoganyDado: 'wainscot',
  whiteDado: 'wainscot', damaskRed: 'wainscot', damaskGreen: 'wainscot', damaskBlue: 'wainscot', damaskGold: 'wainscot', paintWhite: 'boards',
  pine: 'boards', steel: 'steel', steelDark: 'steel', grey: 'steel', cream: 'plain', green: 'plain', tile: 'tile', tileBlue: 'tile', brick: 'none',
};
const GRAND = new Set(['oakPanel', 'mahogany', 'whiteGold', 'damaskGold', 'damaskRed', 'damaskGreen', 'damaskBlue']);
/** painted-panel textures are replaced by the plain material when the panels are modelled in 3D */
const PLAIN_OF = { oakPanel: 'oak', whitePanel: 'paintWhite' };

const DOOR_MATS = { oak: 'oak', mahogany: 'mahogany', white: 'paintWhite', pine: 'pine', steel: 'steelDark', grey: 'paintGrey', green: 'paintGreen' };
const styleCache = new Map();
const nameOf = (m) => (m && m.isMaterial ? m.name : m);
function resolveStyle(s) {
  const key = typeof s === 'string' ? s : JSON.stringify(s, (k, v) => (v && v.isMaterial ? v.name || v.uuid : v));
  let r = styleCache.get(key);
  if (r) return r;
  let d, base;
  if (typeof s === 'string') { d = STYLES[s]; base = s; if (!d) { console.warn('[kit] unknown wall style "' + s + '"'); d = STYLES.whitePanel; base = 'whitePanel'; } }
  else if (s && s.isMaterial) { d = { wall: s, door: 'white' }; base = null; }
  else { base = s.base ?? 'whitePanel'; const b = STYLES[base] ?? STYLES.whitePanel; d = { ...b, ...s }; }
  let kind = d.relief === false ? 'none' : (typeof d.relief === 'string' ? d.relief : (base ? RELIEF[base] ?? 'plain' : 'plain'));
  if (kind === 'panel' && d.wainscot) kind = 'wainscot';
  const plain = (m) => matOf(PLAIN_OF[nameOf(m)] ?? m);
  r = {
    key, wall: matOf(d.wall), wainscot: d.wainscot ? matOf(d.wainscot) : null, skirt: d.skirt ? matOf(d.skirt) : null,
    dado: d.dado ? matOf(d.dado) : null, cornice: d.cornice ? matOf(d.cornice) : null, rail: d.rail ? matOf(d.rail === true ? 'oak' : d.rail) : null,
    door: d.door ?? 'white', frame: d.frame === null ? null : matOf(d.frame ?? d.skirt ?? d.cornice ?? d.wall), lamp: d.lamp ?? 'dome',
    kind, grand: !!(base && GRAND.has(base)) || !!d.grand,
    wallR: kind === 'panel' ? plain(d.wall) : matOf(d.wall), wainR: d.wainscot ? plain(d.wainscot) : null,
  };
  styleCache.set(key, r);
  return r;
}

// moulding profiles [out, up] (from the wall outwards)
const PR = {
  skirt: [[0, 0], [0.016, 0], [0.016, 0.1], [0.011, 0.108], [0.011, 0.12], [0.005, 0.132], [0, 0.138]],
  skirtLow: [[0, 0], [0.014, 0], [0.014, 0.09], [0.006, 0.1], [0, 0.104]],
  dado: [[0, 0], [0.006, 0.004], [0.014, 0.012], [0.018, 0.026], [0.014, 0.04], [0.006, 0.05], [0, 0.056]],
  picture: [[0, 0], [0.01, 0.004], [0.014, 0.016], [0.008, 0.026], [0, 0.03]],
  cornice: [[0, 0], [0.01, 0], [0.012, 0.012], [0.022, 0.02], [0.038, 0.04], [0.056, 0.07], [0.066, 0.095], [0.078, 0.106], [0.078, 0.13]],
  corniceGrand: [[0, 0], [0.012, 0], [0.014, 0.016], [0.03, 0.026], [0.03, 0.05], [0.05, 0.06], [0.072, 0.09], [0.086, 0.12], [0.1, 0.13], [0.1, 0.16]],
  cap: [[0, 0], [0.012, 0], [0.016, 0.012], [0.01, 0.03], [0, 0.035]],
  arch: [[0, 0], [0.012, 0], [0.018, 0.02], [0.016, 0.05], [0.022, 0.07], [0.012, 0.085], [0, 0.085]],
  bolection: [[0, 0], [0.01, 0.006], [0.012, 0.016], [0, 0.024]],
  bead: [[0, 0], [0.005, 0.006], [0, 0.012]],
  head: [[0, 0], [0.03, 0], [0.034, 0.01], [0.028, 0.022], [0.04, 0.03], [0.04, 0.042], [0, 0.042]],
};

const CLASS = {
  first: { wall: 'whitePanel', floor: 'carpetRed', furnish: 'cabinFirst', label: 'Kabine' },
  second: { wall: 'whitePanel', floor: 'linoBlue', furnish: 'cabinSecond', label: 'Kabine' },
  third: { wall: 'paintWhite', floor: 'linoRed', furnish: 'cabinThird', label: 'Kabine' },
  crew: { wall: 'paintWhite', floor: 'linoRed', furnish: 'cabinCrew', label: 'Mannschaftskabine' },
};

function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rngOf(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// door leaf templates (merged per size + style + variant): origin at the hinge, leaf along +x, thickness along z.
// variant: 'louvre' (cabin doors: ventilation louvre in the lower panel), 'glazed' (public rooms), '' (panelled)
const leafCache = new Map();
/** Deck streaming: forget the cached door-leaf templates (rebuilt on demand, frees memory). */
export function flushRoomCaches() { leafCache.clear(); }
function doorLeaf(w, h, style, variant = '') {
  const fine = kitFine();
  const key = `${Math.round(w * 100)}_${Math.round(h * 100)}_${style}_${variant}_${fine}`;
  let t = leafCache.get(key);
  if (!t) {
    const p = new P.PB(), m = matOf(DOOR_MATS[style] ?? style, mats.paintWhite), knobMat = style === 'steel' || style === 'grey' ? mats.iron : mats.brass;
    p.bb(m, w, h, 0.042, w / 2, 0, 0, 0.006).rotation.set(0, 0, 0);
    const faces = [1, -1];
    if (style === 'steel' || style === 'grey') {
      for (const s of faces) { p.bb(mats.steelDark, w - 0.08, 0.03, 0.012, w / 2, h * 0.32, s * 0.026, 0.004); p.bb(mats.steelDark, w - 0.08, 0.03, 0.012, w / 2, h * 0.7, s * 0.026, 0.004); }
      for (const s of faces) for (let k = 0; k < 3; k++) p.b(mats.iron, 0.06, 0.04, 0.03, w - 0.05, 0.3 + k * 0.6, s * 0.03);
    } else if (style === 'pine') {
      for (const s of faces) { for (let i = 1; i < 5; i++) p.b(m, 0.006, h - 0.04, 0.004, (w * i) / 5, 0.02, s * 0.0235); p.b(m, w - 0.06, 0.1, 0.012, w / 2, h * 0.45, s * 0.026); p.b(m, w - 0.06, 0.1, 0.012, w / 2, 0.15, s * 0.026); }
    } else {
      // stiles & rails frame the panels: 2 columns × (glazed top | 2 tall + 2 short) panels
      const st = 0.1, cols = w > 0.7 ? 2 : 1, pw = (w - 2 * st - (cols - 1) * 0.08) / cols;
      const rows = variant === 'glazed' ? [[h * 0.45, h - 0.1, 'g'], [0.12, h * 0.4, 'p']] : [[h * 0.5, h - 0.12, 'p'], [h * 0.3, h * 0.45, 'p'], [0.12, h * 0.26, variant === 'louvre' ? 'l' : 'p']];
      for (const s of faces) {
        for (let c = 0; c < cols; c++) {
          const zc = st + pw / 2 + c * (pw + 0.08);
          for (const [y0, y1, k] of rows) {
            const ph = y1 - y0, yc = (y0 + y1) / 2;
            if (k === 'g') { if (s > 0) { p.b(mats.glass, pw, ph, 0.006, zc, y0, 0); for (const t of [1 / 3, 2 / 3]) p.b(m, 0.016, ph, 0.03, zc - pw / 2 + pw * t, y0, 0); } p.bb(m, pw + 0.02, 0.02, 0.012, zc, y0 - 0.01, s * 0.026, 0.004); p.bb(m, pw + 0.02, 0.02, 0.012, zc, y1 - 0.01, s * 0.026, 0.004); }
            else if (k === 'l') { p.b(kitMats.louvre, pw, ph, 0.004, zc, y0, s * 0.0245); }
            else { const f = p.fp(m, pw, ph, 0, yc, 0, 0.009, Math.min(0.045, pw * 0.2)); f.position.set(zc, yc, s * 0.0235); f.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2; }
          }
        }
      }
    }
    // knob with rose and escutcheon on both faces, three hinges on the hinge edge
    for (const s of faces) {
      p.b(knobMat, 0.05, 0.16, 0.004, w - 0.075, h * 0.47 - 0.08, s * 0.0245);
      const k = p.lathe(knobMat, [[0, 0], [0.014, 0], [0.007, 0.035], [0.026, 0.055], [0, 0.078]], w - 0.075, h * 0.47, s * 0.023, 7); k.rotation.x = s * Math.PI / 2;
    }
    for (const y of [0.2, h - 0.25]) p.b(knobMat, 0.02, 0.1, 0.02, 0.0, y, 0.025);
    // fine detail (only materials the leaf already uses, so no extra meshes per door)
    const steel = style === 'steel' || style === 'grey';
    if (fine >= 1) {
      p.b(knobMat, 0.02, 0.1, 0.02, 0.0, h * 0.5 - 0.05, 0.025); // third hinge
      if (style === 'pine') for (const s of faces) { // ledged & braced: diagonal brace between the two lower ledges
        const dx = w - 0.16, dy = h * 0.45 - 0.25, br = p.b(m, 0.09, Math.hypot(dx, dy), 0.008, 0, 0, 0);
        br.position.set(w / 2, (0.25 + h * 0.45) / 2, s * 0.0255); br.rotation.z = -Math.atan2(dx, dy);
      }
      else if (!steel) for (const s of faces) p.b(knobMat, 0.05, 0.24, 0.003, w - 0.075, h * 0.47 + 0.17, s * 0.0245); // finger plates
    }
    if (fine >= 2) {
      for (const y of [0.2, h * 0.5 - 0.05, h - 0.25]) p.c(knobMat, 0.011, 0.12, 0.0, y - 0.01, 0.03, 6); // hinge knuckles
      if (!steel) for (const s of faces) { p.b(knobMat, 0.016, 0.03, 0.004, w - 0.075, h * 0.47 - 0.065, s * 0.0275); } // key escutcheon
    }
    if (fine >= 3 && steel) for (const s of faces) { // rivets round the stiffened edge
      for (let y = 0.12; y < h - 0.08; y += 0.24) for (const a of [0.035, w - 0.035]) p.b(mats.iron, 0.018, 0.018, 0.008, a, y, s * 0.0265);
    }
    t = P._bakeTemplate(p.g);
    leafCache.set(key, t);
  }
  const g = new THREE.Group();
  for (const part of t) g.add(new THREE.Mesh(part.geo, part.mat));
  return g;
}
const PUBLIC_TYPES = new Set(['lobby', 'public', 'saloon', 'restaurant', 'cafe', 'promenade', 'suite', 'gym', 'sport']);

// ---------------------------------------------------------------- plan

class DeckPlan {
  constructor(world, deck, defaults = {}) {
    this.world = world; this.deck = deck;
    this.y = DECK_Y[deck];
    this.h = defaults.height ?? (ceilingY(deck) - this.y);
    this.def = { wall: 'whitePanel', floor: null, lamp: true, doorW: 0.9, doorH: 2.0, lampPitch: 6, ...defaults };
    this.rooms = []; this.freeWalls = []; this.openings = []; this.problems = [];
    this.batch = new Batch(world, deck);
    this.keepouts = stairKeepouts(deck); this.casings = casingsOn(deck); this.ranges = deckRanges(deck);
    this.solids = stairSolids(deck); this.holes = stairHoles(deck);
    this._n = 0; this._done = false;
  }

  _problem(msg) { this.problems.push(msg); problem(this.world, this.deck, msg); }
  zone(x) { return this.world.zone(this.deck, x); }
  /** inner half width at station x (hull lining / side wall) */
  halfWidth(x) { return deckHalfWidth(this.deck, x); }

  /** Declare a room. Returns the room record (or null if it lies completely outside the hull). */
  room(spec) {
    const r = { type: 'room', doors: [], open: [], ...spec };
    if (r.x0 > r.x1) [r.x0, r.x1] = [r.x1, r.x0];
    if (r.z0 > r.z1) [r.z0, r.z1] = [r.z1, r.z0];
    r.id = String(r.id ?? `${this.deck}-${++this._n}`);
    r.name ??= r.id;
    r.open = [].concat(r.open ?? []);
    const w = spec.walls;
    r.walls = (w === undefined || w === true || w === 'all' ? SIDES : (w === false || w === 'none' ? [] : [].concat(w))).filter((s) => !r.open.includes(s));
    r.style = resolveStyle(spec.wall ?? this.def.wall);
    r.doors = (r.doors ?? []).map((d) => ({ w: this.def.doorW, h: this.def.doorH, ...d }));
    for (const d of r.doors) {
      if (!SIDES.includes(d.side)) this._problem(`room ${r.id}: door side "${d.side}" must be one of ${SIDES.join('|')}`);
      if (d.w < 0.9 - 1e-6) this._problem(`room ${r.id}: door narrower than 0.9 m`);
      d.at ??= d.side === 'fwd' || d.side === 'aft' ? (r.z0 + r.z1) / 2 : (r.x0 + r.x1) / 2;
    }
    // validation
    if (!(r.x1 - r.x0 > 0.2 && r.z1 - r.z0 > 0.2)) { this._problem(`room ${r.id}: degenerate rectangle`); return null; }
    if (!this.ranges.some(([a, b]) => r.x0 >= a - 0.01 && r.x1 <= b + 0.01)) this._problem(`room ${r.id} (x ${r.x0}..${r.x1}) lies outside the interior segments of deck ${this.deck}`);
    let hmax = 0; const n = Math.max(1, Math.ceil((r.x1 - r.x0) / 0.5));
    for (let i = 0; i <= n; i++) hmax = Math.max(hmax, this.halfWidth(r.x0 + ((r.x1 - r.x0) * i) / n));
    if (r.z0 >= hmax - 0.3 || r.z1 <= -hmax + 0.3) { if (!r.quiet) this._problem(`room ${r.id} lies outside the hull – skipped`); return null; }
    if (!r.stairs) { const k = this.keepouts.find((q) => overlap(q, r, 0.02)); if (k) this._problem(`room ${r.id} overlaps the keep-out of stair "${k.id}" (use stairs:true for a stair lobby)`); }
    if (!r.casing) { const c = this.casings.find((q) => overlap(q, r, 0.06)); if (c) this._problem(`room ${r.id} overlaps casing "${c.id}" (x ${c.x0}..${c.x1}, |z| < ${c.z1})`); }
    // usable rectangle (inside walls and hull)
    const lim = minHalfWidth(this.deck, r.x0, r.x1) - 0.04;
    r.safe = { x0: r.x0 + T2, x1: r.x1 - T2, z0: Math.max(r.z0 + T2, -lim), z1: Math.min(r.z1 - T2, lim) };
    r.hullSide = r.z1 - T2 > lim ? 'stbd' : (r.z0 + T2 < -lim ? 'port' : null);
    this.rooms.push(r);
    return r;
  }

  /** A corridor: no own walls (the neighbouring rooms provide them), lamps every ~6 m, no furniture. */
  corridor(spec) {
    const wall = spec.handrail ? { base: typeof (spec.wall ?? this.def.wall) === 'string' ? (spec.wall ?? this.def.wall) : 'whitePanel', rail: true } : spec.wall;
    return this.room({ type: 'corridor', walls: 'none', furnish: 'empty', ...spec, wall });
  }

  /**
   * Row of identical cabins. corridorSide = side of each cabin that faces the corridor ('port'|'stbd' → row runs along x,
   * 'fwd'|'aft' → row runs along z).
   */
  cabinRow(spec) {
    const cls = CLASS[spec.type ?? 'second'] ?? CLASS.second, side = spec.corridorSide;
    const alongX = side === 'port' || side === 'stbd';
    const a = alongX ? spec.x0 : spec.z0, b = alongX ? spec.x1 : spec.z1, len = b - a;
    const count = spec.count ?? Math.max(1, Math.round(len / (spec.pitch ?? 3)));
    const pitch = len / count, num = spec.numbering, dw = spec.doorW ?? this.def.doorW;
    const out = [];
    let n = num?.start ?? 1;
    for (let i = 0; i < count; i++) {
      if (spec.skip?.includes(i)) continue;
      const lo = a + i * pitch, hi = lo + pitch;
      const mirror = spec.alternateMirror !== false ? i % 2 === 1 : !!spec.mirror;
      const at = mirror ? hi - 0.2 - dw / 2 : lo + 0.2 + dw / 2;
      const label = num ? `${num.deckLetter ?? this.deck}${n}` : null;
      const r = this.room({
        id: spec.idPrefix ? `${spec.idPrefix}${i + 1}` : (label ?? undefined), name: label ? `${spec.name ?? cls.label} ${num.deckLetter ?? this.deck} ${n}` : (spec.name ?? cls.label),
        type: 'cabin', cls: spec.type ?? 'second', quiet: true,
        x0: alongX ? lo : spec.x0, x1: alongX ? hi : spec.x1, z0: alongX ? spec.z0 : lo, z1: alongX ? spec.z1 : hi,
        wall: spec.wall ?? cls.wall, floor: spec.floor ?? cls.floor, furnish: spec.furnish ?? cls.furnish, lamp: spec.lamp,
        doors: [{ side, at: Math.min(hi - dw / 2 - 0.06, Math.max(lo + dw / 2 + 0.06, at)), w: dw, label, style: spec.door, hinge: mirror ? 'hi' : 'lo', open: spec.open }],
        berths: spec.berths, group: spec.group,
      });
      if (r) { out.push(r); n += num?.step ?? 1; }
    }
    return out;
  }

  /** Free-standing axis-aligned wall. opts: { wall: style, doors: [{at, w, h, ...}], h } */
  wall(x0, z0, x1, z1, opts = {}) {
    const axis = Math.abs(z1 - z0) < 1e-6 ? 'x' : (Math.abs(x1 - x0) < 1e-6 ? 'z' : null);
    if (!axis) { this._problem(`wall (${x0},${z0})-(${x1},${z1}) is not axis-aligned`); return; }
    const c = axis === 'x' ? z0 : x0, a = Math.min(axis === 'x' ? x0 : z0, axis === 'x' ? x1 : z1), b = Math.max(axis === 'x' ? x0 : z0, axis === 'x' ? x1 : z1);
    const rect = axis === 'x' ? { x0: a, x1: b, z0: c - T2, z1: c + T2 } : { x0: c - T2, x1: c + T2, z0: a, z1: b };
    if (!opts.stairs) { const k = this.keepouts.find((q) => overlap(q, rect, 0.02)); if (k) this._problem(`wall (${x0},${z0})-(${x1},${z1}) crosses the keep-out of stair "${k.id}"`); }
    this.freeWalls.push({ axis, c, a, b, style: resolveStyle(opts.wall ?? this.def.wall), doors: (opts.doors ?? []).map((d) => ({ w: this.def.doorW, h: this.def.doorH, ...d })) });
  }

  /** Force an opening (no wall) along an axis-aligned segment, e.g. a wide archway between two rooms. */
  opening(x0, z0, x1, z1) {
    const axis = Math.abs(z1 - z0) < 1e-6 ? 'x' : 'z';
    const c = axis === 'x' ? z0 : x0, a = Math.min(axis === 'x' ? x0 : z0, axis === 'x' ? x1 : z1), b = Math.max(axis === 'x' ? x0 : z0, axis === 'x' ? x1 : z1);
    this.openings.push({ axis, c, a, b });
  }

  /** Place a prop at world coordinates into the right zone. */
  prop(prop, x, z, rotY = 0, opts = {}) {
    return P.place(this.zone(x), prop, x, opts.y ?? this.y, z, rotY, { collide: opts.collide, world: this.world });
  }
  /** Ceiling light fixture + lamp registration at world x,z. */
  lamp(x, z, style = 'dome', opts = {}) {
    const top = this.y + (opts.h ?? this.h);
    P.place(this.zone(x), style === 'chandelier' ? P.chandelier() : P.ceilingLight({ style }), x, top, z, 0);
    if (style === 'bowl' || style === 'chandelier' || style === 'cut') P.place(this.zone(x), P.ceilingRose({ r: style === 'chandelier' ? 0.42 : 0.3 }), x, top, z, 0);
    this.world.addLamp({ x, y: top - (style === 'chandelier' ? 0.7 : 0.3), z, color: opts.color, intensity: opts.intensity ?? 1 });
  }

  // -------------------------------------------------------------- finish

  finish() {
    const it = this._finishSteps();
    for (;;) { const r = it.next(); if (r.done) return r.value; }
  }

  /** finish() in time slices (deck streaming): hands the frame back between rooms via world.tick(). */
  async finishAsync() {
    const it = this._finishSteps(), w = this.world;
    for (;;) {
      const r = it.next();
      if (r.done) return r.value;
      const p = w.tick?.();
      if (p) await p;
    }
  }

  /** The work of finish() as a generator: yields after every wall line, room and block of wall faces. */
  *_finishSteps() {
    if (this._done) return { rooms: this.rooms, problems: this.problems };
    this._done = true;
    const { deck, world, batch: b, y: Y } = this, top = Y + this.h;
    const lines = new Map();
    const L = (axis, c) => { const k = axis + Math.round(c * 100); let l = lines.get(k); if (!l) lines.set(k, (l = { axis, c, edges: [], doors: [], open: [] })); return l; };
    const edgeOf = (r, side) => (side === 'aft' ? { axis: 'z', c: r.x0, a: r.z0, b: r.z1, sgn: 1 } : side === 'fwd' ? { axis: 'z', c: r.x1, a: r.z0, b: r.z1, sgn: -1 }
      : side === 'port' ? { axis: 'x', c: r.z0, a: r.x0, b: r.x1, sgn: 1 } : { axis: 'x', c: r.z1, a: r.x0, b: r.x1, sgn: -1 });

    for (const r of this.rooms) {
      for (const side of SIDES) {
        const e = edgeOf(r, side), l = L(e.axis, e.c);
        l.edges.push({ a: e.a, b: e.b, sgn: e.sgn, own: r.walls.includes(side), style: r.style, room: r });
        if (r.open.includes(side)) l.open.push([e.a, e.b]);
      }
      for (const d of r.doors) { if (!SIDES.includes(d.side)) continue; const e = edgeOf(r, d.side); L(e.axis, e.c).doors.push({ ...d, sgn: e.sgn, room: r, style: d.style ?? r.style.door, lo: e.a, hi: e.b }); }
    }
    for (const w of this.freeWalls) {
      const l = L(w.axis, w.c);
      l.edges.push({ a: w.a, b: w.b, sgn: 0, own: true, style: w.style, room: null });
      for (const d of w.doors) l.doors.push({ ...d, sgn: d.swing === 'neg' ? -1 : 1, room: null, style: d.style ?? w.style.door, lo: w.a, hi: w.b });
    }
    for (const o of this.openings) L(o.axis, o.c).open.push([o.a, o.b]);

    const doorsOfRoom = new Map(this.rooms.map((r) => [r, []]));
    let nWalls = 0, nDoors = 0;

    this._phase = 'lines';
    for (const l of lines.values()) {
      yield;
      // elementary intervals → runs
      const pts = [...new Set(l.edges.flatMap((e) => [e.a, e.b]).concat(l.open.flat()))].sort((p, q) => p - q);
      const runs = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const p = pts[i], q = pts[i + 1], m = (p + q) / 2;
        if (q - p < 1e-4) continue;
        const cover = l.edges.filter((e) => e.a < m && e.b > m);
        if (!cover.some((e) => e.own) || l.open.some(([s, e]) => s < m && e > m)) continue;
        const any = cover.find((e) => e.sgn === 0) ?? cover.find((e) => e.own);
        const en = cover.find((e) => e.sgn < 0) ?? any, ep = cover.find((e) => e.sgn > 0) ?? any;
        const sn = en.style, sp = ep.style, rn = en.sgn < 0 ? en.room : null, rp = ep.sgn > 0 ? ep.room : null;
        const last = runs[runs.length - 1];
        if (last && Math.abs(last.b - p) < 1e-4 && last.sn === sn && last.sp === sp) { last.b = q; if (rn) last.rn.add(rn); if (rp) last.rp.add(rp); }
        else runs.push({ a: p, b: q, sn, sp, rn: new Set(rn ? [rn] : []), rp: new Set(rp ? [rp] : []), cont: !!(last && Math.abs(last.b - p) < 1e-4) });
      }
      // doors: dedupe
      const doors = [];
      for (const d of l.doors.sort((p, q) => p.at - q.at)) { if (doors.length && Math.abs(doors[doors.length - 1].at - d.at) < 0.5) continue; doors.push(d); }
      const used = new Set();

      for (let ri = 0; ri < runs.length; ri++) {
        const run = runs[ri], next = runs[ri + 1];
        const contA = run.cont, contB = !!(next && next.cont);
        // hull clipping
        let parts;
        if (l.axis === 'z') { const lim = this.halfWidth(l.c); if (lim <= 0.05) continue; parts = [[Math.max(run.a, -lim), Math.min(run.b, lim)]]; }
        else parts = this._clipX(run.a, run.b, Math.abs(l.c));
        for (const [pa, pb] of parts) {
          if (pb - pa < 0.03) continue;
          const ds = doors.filter((d) => d.at - d.w / 2 >= pa - 0.01 && d.at + d.w / 2 <= pb + 0.01);
          let cur = pa;
          const solid = (s, e, jambS, jambE) => {
            if (e - s < 0.005) return;
            const cS = contA && s === run.a, cE = contB && e === run.b;
            const s2 = s - (jambS || cS ? 0 : T2 - 0.005), e2 = e + (jambE || cE ? 0 : T2 - 0.005);
            const info = { vs: s, ve: e, capS: !cS, capE: !cE, cornerS: !jambS && !cS, cornerE: !jambE && !cE };
            this._face(l, -1, s2, e2, Y, top, run.sn, { ...info, room: run.rn }); this._face(l, 1, s2, e2, Y, top, run.sp, { ...info, room: run.rp });
            if (!jambS && !(contA && s === run.a)) this._cap(l, s2, Y, top, -1, run.sn.wall);
            if (!jambE && !(contB && e === run.b)) this._cap(l, e2, Y, top, 1, run.sn.wall);
            if (l.axis === 'x') world.addCollider(s, Y, l.c - T2, e, top, l.c + T2); else world.addCollider(l.c - T2, Y, s, l.c + T2, top, e);
            nWalls++;
          };
          let prevDoor = false;
          for (const d of ds) {
            used.add(d);
            const da = d.at - d.w / 2, db = d.at + d.w / 2;
            solid(cur, da, prevDoor, true);
            this._door(l, d, da, db, Y, top, run);
            nDoors++;
            for (const r of this.rooms) {
              const e = SIDES.map((s) => [s, edgeOf(r, s)]).find(([, q]) => q.axis === l.axis && Math.abs(q.c - l.c) < 0.006 && q.a <= da + 0.01 && q.b >= db - 0.01);
              if (e) doorsOfRoom.get(r).push({ side: e[0], at: d.at, w: d.w, own: d.room === r, hinge: d._hinge, leaf: d._leaf });
            }
            cur = db; prevDoor = true;
          }
          solid(cur, pb, prevDoor, false);
        }
      }
      for (const d of doors) if (!used.has(d) && !l.open.some(([s, e]) => s <= d.at && e >= d.at)) this._problem(`door of ${d.room ? 'room ' + d.room.id : 'a free wall'} at ${l.axis === 'x' ? 'x' : 'z'}=${d.at.toFixed(2)} does not fit on a wall (missing wall, wall end or hull)`);
    }

    // rooms: floor / ceiling overlays, lamps, furniture, registries
    const upHoles = this.solids; // ceiling openings above the flights that rise from this deck
    world.rooms ??= [];
    this._phase = 'rooms';
    for (const r of this.rooms) {
      yield;
      const fm = r.floor ?? this.def.floor;
      if (fm) this._overlay(matOf(fm), r, Y + 0.005, false, r.stairs ? this.holes : []);
      if (r.ceiling) this._overlay(matOf(r.ceiling), r, top - 0.005, true, r.stairs ? upHoles : []);
      r.doorsAll = doorsOfRoom.get(r);
      const s = r.safe, usable = s.x1 - s.x0 > 0.5 && s.z1 - s.z0 > 0.5;
      const lamp = r.lamp ?? this.def.lamp;
      if (lamp && usable) {
        const style = typeof lamp === 'string' ? lamp : r.style.lamp, pitch = r.lampPitch ?? this.def.lampPitch;
        const nx = Math.max(1, Math.round((s.x1 - s.x0) / pitch)), nz = Math.max(1, Math.round((s.z1 - s.z0) / pitch));
        for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
          const x = s.x0 + ((s.x1 - s.x0) * (i + 0.5)) / nx, z = s.z0 + ((s.z1 - s.z0) * (j + 0.5)) / nz;
          const pt = { x0: x - 0.25, x1: x + 0.25, z0: z - 0.25, z1: z + 0.25 };
          if (this.casings.some((c) => overlap(c, pt)) || this.solids.some((c) => overlap(c, pt)) || this.holes.some((c) => overlap(c, pt)) || Math.abs(z) > this.halfWidth(x) - 0.2) continue;
          this.lamp(x, z, style);
        }
      }
      const ctx = usable ? new FurnishCtx(this, r) : null;
      if (ctx && r.furnish && r.furnish !== 'empty') {
        const f = r.furnish, name = typeof f === 'string' ? f : f.preset;
        const fn = typeof f === 'function' ? f : PRESETS[name];
        if (!fn) this._problem(`room ${r.id}: unknown furnish preset "${name}"`);
        else {
          ctx.opts = typeof f === 'object' ? f : {};
          const t0 = b.tris;
          try { fn(ctx); } catch (e) { this._problem(`room ${r.id}: furnish failed: ${e.message}`); }
          // a hand-detailed room that panels its own walls keeps flat wall faces (only the mouldings are added)
          r._detailed = typeof f === 'function' && b.tris - t0 - ctx.clutterTris > 120;
        }
      }
      // what the furnishing occupies (for the wall fittings added later); rooms furnished by own code may place props
      // that are not tracked, so they get no fittings
      r._fit = !(typeof r.furnish === 'function') ? { occ: ctx?.occupied ?? [], mounts: ctx?.mounted ?? [] } : null;
      world.rooms.push({ id: r.id, name: r.name, deck, type: r.type, cls: r.cls, x0: r.x0, x1: r.x1, z0: r.z0, z1: r.z1, safe: r.safe, noAccess: !!r.noAccess });
      const entry = ctx ? ctx.entryPoint() : { x: (r.x0 + r.x1) / 2, z: (r.z0 + r.z1) / 2, yaw: 0 };
      r.entry = entry;
      if (r.teleport) world.addTeleport({ name: r.teleport.name ?? r.name, deck, x: r.teleport.x ?? entry.x, z: r.teleport.z ?? entry.z, yaw: r.teleport.yaw ?? entry.yaw, group: r.teleport.group ?? r.group ?? '' });
      if (r.info) world.addInfo({ title: r.info.title ?? r.name, text: r.info.text, x: r.info.x ?? (s.x0 + s.x1) / 2, y: Y + 1.5, z: r.info.z ?? (s.z0 + s.z1) / 2, radius: r.info.radius ?? Math.max(2.5, Math.min(8, Math.hypot(s.x1 - s.x0, s.z1 - s.z0) / 2)) });
    }
    // wall faces (deferred so hand-detailed rooms can be recognised), then corridor fittings and porthole curtains
    const jobs = this._jobs ?? [];
    yield;
    this._phase = 'faces';
    for (let i = 0; i < jobs.length; i++) {
      const j = jobs[i];
      if ((i & 7) === 7) yield;
      this._emit(j, !!(j.info.room && [...j.info.room].some((q) => q._detailed)));
    }
    this._jobs = [];
    yield;
    this._phase = 'corridors';
    yield* this._corridorDetails(jobs);
    yield;
    this._phase = 'fittings';
    yield* this._roomFittings(jobs);
    yield;
    this._phase = 'curtains';
    this._portCurtains();
    yield;
    this._phase = 'flush';
    yield* b.flushSteps(); // one zone/material bucket per step (large decks: tens of ms in one go otherwise)
    return { rooms: this.rooms, walls: nWalls, doors: nDoors, problems: this.problems };
  }

  /** ceiling services / battens and fire appliances (extinguisher, hose reel) along the corridors */
  *_corridorDetails(jobs) {
    const b = this.batch, Y = this.y, TOP = Y + this.h, fine = kitFine();
    for (const r of this.rooms) {
      if (r.type !== 'corridor' || r._detailed) continue;
      yield; // one corridor per time slice (long corridors with pipes, trays and fittings)
      const s = r.safe, alongX = s.x1 - s.x0 >= s.z1 - s.z0, len = alongX ? s.x1 - s.x0 : s.z1 - s.z0, wid = alongX ? s.z1 - s.z0 : s.x1 - s.x0;
      if (len < 2.5 || wid < 0.6) continue;
      const kind = r.style.kind;
      const W = (a, y, t) => (alongX ? [a, y, s.z0 + wid * t] : [s.x0 + wid * t, y, a]), a0 = (alongX ? s.x0 : s.z0) + 0.05, a1 = (alongX ? s.x1 : s.z1) - 0.05;
      const free = (a) => { const p = W(a, 0, 0.5); return !this.solids.some((q) => p[0] > q.x0 - 0.3 && p[0] < q.x1 + 0.3 && p[2] > q.z0 - 0.3 && p[2] < q.z1 + 0.3) && !this.holes.some((q) => p[0] > q.x0 - 0.3 && p[0] < q.x1 + 0.3 && p[2] > q.z0 - 0.3 && p[2] < q.z1 + 0.3) && !this.casings.some((q) => p[0] > q.x0 && p[0] < q.x1 && Math.abs(p[2]) < q.z1); };
      if (kind === 'boards' || kind === 'steel') {
        // steam pipe and cable tray under the deck beams
        const segs = []; let st = null;
        for (let a = a0; a <= a1 + 1e-6; a += 0.5) { const ok = free(a); if (ok && st === null) st = a; if ((!ok || a + 0.5 > a1) && st !== null) { segs.push([st, ok ? a1 : a - 0.5]); st = null; } }
        for (const [p0, p1] of segs) {
          if (p1 - p0 < 0.6) continue;
          b.prism(mats.steelDark, W(p0, TOP - 0.13, 0.22), W(p1, TOP - 0.13, 0.22), 0.035, 6);
          b.prism(mats.paintWhite, W(p0, TOP - 0.2, 0.22), W(p1, TOP - 0.2, 0.22), 0.025, 6);
          const t0 = W(p0, TOP - 0.17, 0.62), t1 = W(p1, TOP - 0.16, 0.82);
          b.box(mats.steelDark, t0[0], t0[1], t0[2], t1[0], t1[1], t1[2], 'xXyYzZ');
          for (const t of [0.67, 0.72, 0.77]) b.prism(mats.rubber, W(p0, TOP - 0.15, t), W(p1, TOP - 0.15, t), 0.009, 4);
          for (let a = p0 + 0.3; a < p1; a += 1.5) {
            const h0 = W(a - 0.01, TOP - 0.21, 0.2), h1 = W(a + 0.01, TOP, 0.24); b.box(mats.iron, h0[0], h0[1], h0[2], h1[0], h1[1], h1[2], 'xXzZ');
            // tray hangers: two drop rods from the deck head to a cross bar under the tray (the tray tilts 0.17 → 0.16 below TOP)
            for (const t of [0.61, 0.83]) { const r0 = W(a - 0.008, TOP - 0.185, t - 0.008), r1 = W(a + 0.008, TOP, t + 0.008); b.box(mats.iron, Math.min(r0[0], r1[0]), r0[1], Math.min(r0[2], r1[2]), Math.max(r0[0], r1[0]), r1[1], Math.max(r0[2], r1[2]), 'xXzZ'); }
            const c0 = W(a - 0.015, TOP - 0.19, 0.6), c1 = W(a + 0.015, TOP - 0.17, 0.84); b.box(mats.iron, Math.min(c0[0], c1[0]), c0[1], Math.min(c0[2], c1[2]), Math.max(c0[0], c1[0]), c1[1], Math.max(c0[2], c1[2]));
          }
          if (fine >= 2) for (let a = p0 + 1.05; a < p1 - 0.2; a += 2.4) { // pipe flanges / couplings
            b.prism(mats.steelDark, W(a - 0.016, TOP - 0.13, 0.22), W(a + 0.016, TOP - 0.13, 0.22), 0.05, 8, true);
            if (a + 0.5 < p1) b.prism(mats.paintWhite, W(a + 0.5 - 0.012, TOP - 0.2, 0.22), W(a + 0.5 + 0.012, TOP - 0.2, 0.22), 0.035, 8, true);
          }
          if (fine >= 3) for (let a = p0 + 3.6; a < p1 - 0.6; a += 9) { // stop valve with hand wheel under the steam pipe
            const wc = W(a, TOP - 0.3, 0.22);
            b.prism(mats.brass, W(a - 0.06, TOP - 0.13, 0.22), W(a + 0.06, TOP - 0.13, 0.22), 0.045, 8, true);
            b.prism(mats.brass, W(a, TOP - 0.17, 0.22), wc, 0.01, 5);
            for (const n of [[0, -1, 0], [0, 1, 0]]) b.ring(mats.iron, [wc[0], wc[1] + n[1] * 0.006, wc[2]], n, 0.06, 0.078, 10);
            for (const [tx, tz] of [[0.068, 0.004], [0.004, 0.068]]) b.box(mats.iron, wc[0] - tx, wc[1] - 0.005, wc[2] - tz, wc[0] + tx, wc[1] + 0.005, wc[2] + tz); // spokes
          }
        }
      } else if (kind === 'panel' || kind === 'wainscot') {
        // moulded ceiling battens across the corridor
        const n = Math.max(1, Math.round(len / 1.6));
        for (let i = 0; i <= n; i++) { const a = (alongX ? s.x0 : s.z0) + (len * i) / n; if (!free(a)) continue; const p = W(a - 0.05, TOP - 0.045, 0), q = W(a + 0.05, TOP, 1); b.box(r.style.cornice ?? mats.paintWhite, Math.min(p[0], q[0]), p[1], Math.min(p[2], q[2]), Math.max(p[0], q[0]), q[1], Math.max(p[2], q[2]), 'xXyzZ'); }
      }
      // fire appliances on the walls every ~14 m
      const faces = jobs.filter((j) => j.info.room?.has(r) && !j.info.lintel && j.y0 <= Y + 0.01 && j.l.axis === (alongX ? 'x' : 'z') && j.info.ve - j.info.vs > 1.0);
      if (!faces.length) continue;
      let k = 0;
      for (let a = (alongX ? s.x0 : s.z0) + 4; a < (alongX ? s.x1 : s.z1) - 2; a += 14) {
        const f = faces.find((j) => j.info.vs < a - 0.5 && j.info.ve > a + 0.5);
        if (!f) continue;
        const sd = f.side, c = f.l.c + sd * T2, x = alongX ? a : c, z = alongX ? c : a;
        if (Math.abs(z) > this.halfWidth(x) - 0.2) continue;
        const hose = k++ % 2 === 1, prop = hose ? P.fireHose() : P.extinguisher();
        // above the hand rail where the wall has one (extinguisher body would reach down to 0.65 m)
        const st = f.st, railed = st.rail || (fine >= 1 && !st.grand && st.kind !== 'tile' && st.kind !== 'none' && (fine >= 2 || (st.kind !== 'panel' && st.kind !== 'wainscot')));
        P.place(this.zone(x), prop, x, Y + (hose ? 1.35 : railed ? 1.6 : 1.25), z, P.faceDir(alongX ? 0 : sd, alongX ? sd : 0));
      }
    }
  }

  /**
   * Fine detail per room (kitFine ≥ 1): light switch beside the main door (latch side), from fine 2 a ventilation
   * grille under the cornice and a moulded ceiling frame in 1st / 2nd class cabins. Batched, no colliders.
   */
  *_roomFittings(jobs) {
    const fine = kitFine();
    if (fine < 0) return;
    const b = this.batch, Y = this.y, TOP = Y + this.h;
    const byLine = new Map(), key = (axis, c, side) => axis + Math.round(c * 100) + ':' + side;
    for (const j of jobs) { const k = key(j.l.axis, j.l.c, j.side); let a = byLine.get(k); if (!a) byLine.set(k, (a = [])); a.push(j); }
    const wallAt = (k, a, hw, ya, yb) => (byLine.get(k) ?? []).some((j) => j.s <= a - hw && j.e >= a + hw && j.y0 <= ya + 1e-4 && j.y1 >= yb - 1e-4);
    const blocked = (q) => this.solids.some((o) => overlap(o, q)) || this.holes.some((o) => overlap(o, q)) || this.casings.some((o) => overlap(o, q));
    let n = 0;
    for (const r of this.rooms) {
      if ((++n & 31) === 0) yield;
      if (r.type === 'corridor' || r._detailed || r.stairs || !r._fit || !r.doorsAll?.length) continue;
      // nothing tall placed or hung against the wall there (furniture rects carry their height, wall props a y range)
      const free = (p, q, ya, yb) => { const rc = { x0: Math.min(p[0], q[0]), x1: Math.max(p[0], q[0]), z0: Math.min(p[2], q[2]), z1: Math.max(p[2], q[2]) };
        return !r._fit.occ.some((o) => overlap(o, rc, 0) && (o.h ?? 9) > ya - Y - 0.02) && !r._fit.mounts.some((o) => overlap(o, rc, 0) && o.y0 < yb - Y && o.y1 > ya - Y); };
      const d = r.doorsAll.find((q) => q.own) ?? r.doorsAll[0], sd = d.side, alongX = sd === 'port' || sd === 'stbd';
      const c = sd === 'aft' ? r.x0 : sd === 'fwd' ? r.x1 : sd === 'port' ? r.z0 : r.z1, side = sd === 'aft' || sd === 'port' ? 1 : -1;
      const lo = alongX ? r.x0 : r.z0, hi = alongX ? r.x1 : r.z1, k = key(alongX ? 'x' : 'z', c, side), f = c + side * T2;
      const at = (a, y, off) => (alongX ? [a, y, f + side * off] : [f + side * off, y, a]);
      const O = alongX ? [0, 0, side] : [side, 0, 0];
      const box = (m, a0, a1, ya, yb, o1, o0 = 0) => { const p = at(a0, ya, o0), q = at(a1, yb, o1); b.box(m, p[0], p[1], p[2], q[0], q[1], q[2]); };
      const ok = (a, hw, ya, yb, m) => a - hw > lo + 0.06 && a + hw < hi - 0.06 && r.doorsAll.every((o) => o.side !== sd || Math.abs(o.at - a) > o.w / 2 + m)
        && wallAt(k, a, hw, ya, yb) && free(at(a - hw, 0, 0), at(a + hw, 0, 0.08), ya, yb) && (() => { const p = at(a, 0, 0); return Math.abs(p[2]) < this.halfWidth(p[0]) - 0.1; })();
      const kind = r.style.kind, posh = kind === 'panel' || kind === 'wainscot', cover = posh ? mats.brass : mats.porcelain;
      // rotary light switch on a wooden pattress, latch side of the door
      const sw = d.at + (d.hinge === 'hi' ? -1 : 1) * (d.w / 2 + 0.16);
      if (ok(sw, 0.05, Y + 1.24, Y + 1.35, 0.1)) {
        box(kind === 'steel' ? mats.steelDark : mats.woodDark, sw - 0.045, sw + 0.045, Y + 1.25, Y + 1.34, 0.014);
        b.prism(cover, at(sw, Y + 1.295, 0.014), at(sw, Y + 1.295, 0.034), 0.03, 8, true);
        box(mats.brass, sw - 0.005, sw + 0.005, Y + 1.283, Y + 1.307, 0.046, 0.034);
      }
      if (fine < 1) continue;
      // ventilation grille high on the door wall (the deck's supply trunks run over the corridors)
      if (kind !== 'steel' && this.h >= 2.45) {
        const cand = [(lo + hi) / 2, hi - 0.45, lo + 0.45].find((a) => ok(a, 0.19, TOP - 0.36, TOP - 0.2, 0.35));
        if (cand !== undefined) {
          box(posh ? mats.brass : mats.paintWhite, cand - 0.17, cand + 0.17, TOP - 0.355, TOP - 0.205, 0.012);
          b.poly(kitMats.louvre, [at(cand - 0.145, TOP - 0.335, 0.016), at(cand + 0.145, TOP - 0.335, 0.016), at(cand + 0.145, TOP - 0.225, 0.016), at(cand - 0.145, TOP - 0.225, 0.016)], O);
        }
      }
      // moulded ceiling frame in 1st / 2nd class cabins and suites
      const s = r.safe;
      if (fine < 2) continue;
      if (posh && (r.type === 'cabin' || r.type === 'suite') && s.x1 - s.x0 > 1.4 && s.z1 - s.z0 > 1.4 && !blocked(s)) {
        const x0 = s.x0 + 0.28, x1 = s.x1 - 0.28, z0 = s.z0 + 0.28, z1 = s.z1 - 0.28, zm = Math.max(Math.abs(z0), Math.abs(z1));
        if (zm < Math.min(this.halfWidth(x0), this.halfWidth(x1)) - 0.25) {
          const m = r.style.cornice ?? r.style.frame ?? mats.paintWhite, y0 = TOP - 0.03, y1 = TOP - 0.004, t = 0.025;
          b.box(m, x0 - t, y0, z0 - t, x1 + t, y1, z0 + t, 'xXyzZ'); b.box(m, x0 - t, y0, z1 - t, x1 + t, y1, z1 + t, 'xXyzZ');
          b.box(m, x0 - t, y0, z0 + t, x0 + t, y1, z1 - t, 'xXy'); b.box(m, x1 - t, y0, z0 + t, x1 + t, y1, z1 - t, 'xXy');
          // 1st class: the frame divided into four panels by moulded ribs, clear of the centre lamp (fine 3)
          if (fine >= 3 && (r.cls === 'first' || r.type === 'suite')) {
            const xm = (x0 + x1) / 2, zm2 = (z0 + z1) / 2, g = 0.22;
            b.box(m, xm - t, y0, z0 + t, xm + t, y1, zm2 - g, 'xXyzZ'); b.box(m, xm - t, y0, zm2 + g, xm + t, y1, z1 - t, 'xXyzZ');
            b.box(m, x0 + t, y0, zm2 - t, xm - g, y1, zm2 + t, 'xXyzZ'); b.box(m, xm + g, y0, zm2 - t, x1 - t, y1, zm2 + t, 'xXyzZ');
          }
        }
      }
    }
  }

  /** curtains on a brass rod at the portholes of 1st / 2nd class cabins */
  _portCurtains() {
    const ports = this.world._kitPorts?.[this.deck];
    if (!ports?.length) return;
    for (const r of this.rooms) {
      if (!r.hullSide || !(r.type === 'cabin' || r.type === 'suite') || !(r.cls === 'first' || r.cls === 'second' || r.type === 'suite')) continue;
      const sg = r.hullSide === 'stbd' ? 1 : -1, mat = r.cls === 'second' ? 'fabricGreen' : ['fabricGold', 'fabricRed', 'fabricBlue'][(r.id.length + r.id.charCodeAt(r.id.length - 1)) % 3];
      for (const p of ports) {
        if (Math.sign(p.z) !== sg || p.x < r.x0 + 0.45 || p.x > r.x1 - 0.45) continue;
        P.place(this.zone(p.x), P.portCurtain({ r: p.r, mat }), p.x, p.y, p.z, P.faceDir(p.n[0], p.n[2]));
      }
    }
  }

  /** sub-intervals of [a,b] (along x) where a wall at |z| = c is inside the hull */
  _clipX(a, b, c) {
    const ok = (x) => this.halfWidth(x) >= c + 0.02;
    const n = Math.max(1, Math.ceil((b - a) / 0.25)), out = [];
    let start = null, prev = a, prevOk = ok(a);
    if (prevOk) start = a;
    const bis = (x0, x1, ok0) => { for (let i = 0; i < 10; i++) { const m = (x0 + x1) / 2; if (ok(m) === ok0) x0 = m; else x1 = m; } return ok0 ? x0 : x1; };
    for (let i = 1; i <= n; i++) {
      const x = a + ((b - a) * i) / n, o = ok(x);
      if (o && !prevOk) start = bis(prev, x, false);
      if (!o && prevOk) { out.push([start, bis(prev, x, true)]); start = null; }
      prev = x; prevOk = o;
    }
    if (start !== null) out.push([start, b]);
    return out;
  }

  /** one wall face (side = -1 / +1 of the line) between s..e – queued, emitted by _emit() after furnishing */
  _face(l, side, s, e, y0, y1, st, info = {}) {
    (this._jobs ??= []).push({ l, side, s, e, y0, y1, st, info: { vs: s, ve: e, capS: true, capE: true, cornerS: false, cornerE: false, ...info } });
  }

  /** build a queued wall face with the relief of its style (flat = only mouldings, for hand-detailed rooms) */
  _emit({ l, side, s, e, y0, y1, st, info }, flat) {
    const b = this.batch, X = l.axis === 'x', c = l.c + side * T2, Y = this.y, TOP = Y + this.h;
    if (e - s < 0.005) return;
    const A = X ? [1, 0, 0] : [0, 0, 1], O = X ? [0, 0, side] : [side, 0, 0], U = [0, 1, 0], mA = [-A[0], -A[1], -A[2]];
    const P = (a, y, off = 0) => (X ? [a, y, c + side * off] : [c + side * off, y, a]);
    const quad = (mat, ya, yb) => { if (yb - ya < 1e-4) return; if (X) b.wallX(mat, c, s, e, ya, yb, side); else b.wallZ(mat, c, s, e, ya, yb, side); };
    const inY = (ya, yb) => ya >= y0 - 1e-4 && yb <= y1 + 1e-4;
    const mould = (mat, prof, yb, sa = s, ea = e) => { if (mat && ea - sa > 0.01) b.sweep(mat, prof, P(sa, yb), A, O, U, ea - sa, [info.capS && sa === s, info.capE && ea === e]); };
    // box on the wall face: along a0..a1, height ya..yb, from the face out to `off` (front + sides + top + bottom)
    const wbox = (mat, a0, a1, ya, yb, off, o0 = 0) => {
      const p = P(a0, ya, o0), q = P(a1, yb, off);
      const front = X ? (side > 0 ? 'Z' : 'z') : (side > 0 ? 'X' : 'x');
      b.box(mat, p[0], p[1], p[2], q[0], q[1], q[2], front + (X ? 'xX' : 'zZ') + 'yY');
    };
    const kind = st.kind, relief = !flat && (kind === 'panel' || kind === 'wainscot');
    const fine = kitFine(), owners = info.room ? [...info.room] : [];
    // 1st-class cabins and suites: moulded (bolection) panels like the grand rooms, from fine 2
    const moulded = st.grand || (fine >= 2 && kind === 'panel' && owners.some((q) => q.cls === 'first' || q.type === 'suite'));
    const wallM = flat ? st.wall : st.wallR ?? st.wall, wainM = flat ? st.wainscot : st.wainR ?? st.wainscot;
    const frameM = st.frame ?? st.skirt ?? wallM;
    // base surfaces
    if (st.wainscot) { quad(wainM, y0, Math.min(y1, Math.max(y0, Y + 0.95))); quad(wallM, Math.max(y0, Y + 0.95), y1); } else quad(wallM, y0, y1);
    const vs = info.vs, ve = info.ve;
    // ---- relief
    if (relief) {
      const pm = kind === 'panel' ? wallM : wainM, cw = st.grand && kind === 'panel' ? 0.22 : 0;
      const a0 = vs + (info.cornerS ? cw : 0) + 0.08, a1 = ve - (info.cornerE ? cw : 0) - 0.08;
      const rows = [];
      if (inY(Y + 0.2, Y + 0.8) && (st.grand || kind === 'wainscot')) rows.push([Y + 0.2, Y + 0.78, false]);
      if (kind === 'panel' && inY(Y + 1.0, TOP - 0.38) && TOP - 0.38 - (Y + 1.0) > 0.3) rows.push([Y + 1.0, TOP - 0.4, true]);
      if (kind === 'panel' && y0 > Y + 1.2 && TOP - 0.2 - (y0 + 0.08) > 0.16) rows.push([y0 + 0.08, TOP - 0.2, false]);
      const pitch = st.grand ? 0.75 : 0.62;
      for (const [r0, r1, tall] of rows) {
        const L = a1 - a0, n = Math.max(1, Math.round(L / (tall || st.grand ? pitch : pitch * 1.45))), pw = (L - (n - 1) * 0.08) / n, ph = r1 - r0;
        if (pw < 0.14) continue;
        for (let i = 0; i < n; i++) {
          const a = a0 + pw / 2 + i * (pw + 0.08);
          b.fielded(pm, P(a, (r0 + r1) / 2, 0), A, O, U, pw, ph, 0.01, Math.min(0.05, pw * 0.2, ph * 0.2));
          if (moulded && tall) { // bolection moulding round the panel
            const m = st.cornice ?? frameM;
            b.sweep(m, PR.bolection, P(a - pw / 2, r0, 0), A, O, [0, -1, 0], pw, [true, true]);
            b.sweep(m, PR.bolection, P(a - pw / 2, r1, 0), A, O, U, pw, [true, true]);
            b.sweep(m, PR.bolection, P(a - pw / 2, r0, 0), U, O, mA, ph, [true, true]);
            b.sweep(m, PR.bolection, P(a + pw / 2, r0, 0), U, O, A, ph, [true, true]);
          }
        }
      }
      if (cw && y0 < Y + 0.5) for (const [on, a] of [[info.cornerS, vs], [info.cornerE, ve - cw]]) {
        if (!on || ve - vs < 2 * cw + 0.3) continue;
        wbox(frameM, a + 0.02, a + cw - 0.02, Y + 0.14, TOP - 0.3, 0.024);
        wbox(frameM, a + 0.01, a + cw - 0.01, Y + 0.14, Y + 0.3, 0.032);
        wbox(st.cornice ?? frameM, a + 0.005, a + cw - 0.005, TOP - 0.34, TOP - 0.26, 0.04);
        for (let k = 0; k < 3; k++) wbox(frameM, a + 0.05 + k * ((cw - 0.1) / 2) - 0.008, a + 0.05 + k * ((cw - 0.1) / 2) + 0.008, Y + 0.36, TOP - 0.42, 0.03, 0.024);
      }
    } else if (!flat && kind === 'boards' && ((st.wall === mats.paintWhite && owners.some((q) => q.cls === 'third' || (q.type === 'corridor' && !q.cls))) || (fine >= 1 && st.wall === mats.pine))) {
      const n = Math.floor((ve - vs) / 0.2);
      for (let i = 1; i < n; i++) { const a = vs + ((ve - vs) * i) / n; b.sweep(wallM, PR.bead, P(a, Math.max(y0, Y + 0.1)), U, O, A, Math.min(y1, TOP - 0.04) - Math.max(y0, Y + 0.1), [false, false]); }
    } else if (!flat && fine >= 1 && kind === 'boards' && st.wall === mats.paintWhite && y0 < Y + 0.5 && ve - vs > 0.3 && owners.some((q) => q.cls === 'crew')) {
      // crew quarters: painted steel bulkhead with a riveted butt strap
      wbox(wallM, vs + 0.02, ve - 0.02, Y + 1.22, Y + 1.3, 0.007);
      if (fine >= 3) for (let a = vs + 0.1; a < ve - 0.06; a += 0.14) for (const yy of [Y + 1.24, Y + 1.28]) b.stud(wallM, P(a, yy, 0.007), O, A, 0.008, 0.008);
    } else if (!flat && kind === 'steel' && y0 < Y + 0.5) {
      const dark = mats.steelDark;
      for (let a = Math.ceil((vs + 0.15) / 0.61) * 0.61; a < ve - 0.15; a += 0.61) { wbox(dark, a - 0.006, a + 0.006, Y, TOP, 0.075); wbox(dark, a - 0.035, a + 0.035, Y, TOP, 0.085, 0.075); }
      wbox(dark, vs, ve, Y + 1.22, Y + 1.3, 0.008);
      for (let a = vs + 0.08; a < ve - 0.05; a += 0.12) { // rivet heads on the seam strap
        for (const yy of [Y + 1.24, Y + 1.28]) { const p = P(a, yy, 0.008), t = P(a, yy, 0.018); const d = 0.009; const q = (da, dy) => [p[0] + A[0] * da, p[1] + dy, p[2] + A[2] * da]; const ps = [q(-d, -d), q(d, -d), q(d, d), q(-d, d)]; for (let k = 0; k < 4; k++) b.poly(dark, [ps[k], ps[(k + 1) % 4], t], O); }
      }
      if (y1 > TOP - 0.1) for (const [yy, r] of [[TOP - 0.22, 0.018], [TOP - 0.27, 0.014]]) { b.prism(mats.iron, P(vs + 0.02, yy, 0.05), P(ve - 0.02, yy, 0.05), r, 5); }
    }
    // ---- mouldings
    const skirtM = st.skirt ?? (kind === 'boards' ? wallM : kind === 'tile' ? wallM : null);
    if (skirtM && inY(Y, Y + 0.14)) mould(skirtM, kind === 'boards' || kind === 'tile' ? PR.skirtLow : PR.skirt, Y);
    const dadoM = st.dado ?? (relief && kind === 'panel' ? frameM : (kind === 'plain' && st.skirt ? st.skirt : null));
    if (dadoM && inY(Y + 0.85, Y + 0.95)) mould(dadoM, PR.dado, Y + (st.wainscot ? 0.92 : 0.86));
    if ((kind === 'wainscot' || kind === 'plain') && !flat && inY(TOP - 0.45, TOP - 0.4)) mould(st.cornice ?? st.skirt ?? frameM, PR.picture, TOP - 0.44);
    else if (relief && kind === 'panel' && fine >= 1 && inY(TOP - 0.4, TOP - 0.36)) mould(frameM, PR.picture, TOP - 0.395); // frieze rail over the tall panels
    if (st.cornice && inY(TOP - 0.16, TOP)) {
      const g = st.grand && !flat, cb = TOP - (g ? 0.16 : 0.13);
      mould(st.cornice, g ? PR.corniceGrand : PR.cornice, cb);
      // carved dentil course under the cornice (moulded panelling, fine 3)
      if (moulded && !flat && fine >= 3 && inY(cb - 0.04, cb)) for (let a = vs + 0.05; a < ve - 0.05; a += 0.075) wbox(st.cornice, a - 0.014, a + 0.014, cb - 0.036, cb, 0.022);
    }
    else if (kind === 'boards' && inY(TOP - 0.04, TOP)) mould(wallM, PR.cap, TOP - 0.035);
    if (st.rail && e - s > 0.4 && inY(Y + 0.8, Y + 0.95)) {
      const o = c + side * 0.07;
      if (X) b.bar(st.rail, [s + 0.05, Y + 0.88, o], [e - 0.05, Y + 0.88, o], 0.05, 0.05); else b.bar(st.rail, [o, Y + 0.88, s + 0.05], [o, Y + 0.88, e - 0.05], 0.05, 0.05);
      const n = Math.max(1, Math.round((ve - vs) / 1.3));
      for (let i = 0; i <= n; i++) { const a = vs + 0.15 + ((ve - vs - 0.3) * i) / Math.max(1, n); wbox(mats.brass, a - 0.012, a + 0.012, Y + 0.85, Y + 0.885, 0.06); wbox(mats.brass, a - 0.03, a + 0.03, Y + 0.83, Y + 0.9, 0.006); }
    } else if (!flat && fine >= 1 && !st.grand && kind !== 'tile' && kind !== 'none' && ve - vs > 0.7 && y0 <= Y + 0.01 && inY(Y + 0.8, Y + 0.95)
      && (fine >= 2 || (kind !== 'panel' && kind !== 'wainscot')) && owners.some((q) => q.type === 'corridor' && !q._detailed)) {
      // corridor hand rail on brackets (stops short of the door architraves)
      const ra = vs + 0.14, rb = ve - 0.14, steel = kind === 'steel';
      if (steel) b.prism(mats.iron, P(ra, Y + 0.9, 0.135), P(rb, Y + 0.9, 0.135), 0.022, 6, true); // clear of the frames (0.085)
      else { const o = c + side * 0.068, rm = kind === 'panel' || kind === 'wainscot' ? mats.oak : mats.woodDark; if (X) b.bar(rm, [ra, Y + 0.875, o], [rb, Y + 0.875, o], 0.045, 0.05); else b.bar(rm, [o, Y + 0.875, ra], [o, Y + 0.875, rb], 0.045, 0.05); }
      const n = Math.max(1, Math.round((rb - ra) / 1.4)), bm = steel ? mats.iron : mats.brass;
      for (let i = 0; i <= n; i++) { const a = ra + 0.08 + ((rb - ra - 0.16) * i) / n; wbox(bm, a - 0.01, a + 0.01, Y + 0.85, Y + 0.875, steel ? 0.115 : 0.05); wbox(bm, a - 0.028, a + 0.028, Y + 0.82, Y + 0.89, 0.006); }
    }
  }
  /** end cap of a wall at along-coordinate p, facing dir (-1/+1) */
  _cap(l, p, y0, y1, dir, mat) {
    const b = this.batch;
    if (l.axis === 'x') b.wallZ(mat, p, l.c - T2, l.c + T2, y0, y1, dir); else b.wallX(mat, p, l.c - T2, l.c + T2, y0, y1, dir);
  }

  _door(l, d, da, db, Y, top, run) {
    const b = this.batch, X = l.axis === 'x', yh = Math.min(Y + d.h, top);
    const box = (mat, a0, y0, c0, a1, y1, c1, faces) => { if (X) b.box(mat, a0, y0, c0, a1, y1, c1, faces); else b.box(mat, c0, y0, a0, c1, y1, a1, faces); };
    // lintel
    const li = { capS: false, capE: false, lintel: true };
    if (top - yh > 0.02) { this._face(l, -1, da, db, yh, top, { ...run.sn, skirt: null, dado: null, wainscot: null, rail: null }, { ...li, room: run.rn }); this._face(l, 1, da, db, yh, top, { ...run.sp, skirt: null, dado: null, wainscot: null, rail: null }, { ...li, room: run.rp }); }
    const st = d.room ? d.room.style : run.sn, fm = d.frame === false ? null : st.frame;
    const dstyle = d.style ?? st.door, steelDoor = dstyle === 'steel' || dstyle === 'grey';
    if (fm) {
      // door lining in the opening (no change of the clear width) + moulded architrave on both faces
      const e = T2 + 0.003;
      if (X) { b.wallZ(fm, da, l.c - e, l.c + e, Y, yh, 1); b.wallZ(fm, db, l.c - e, l.c + e, Y, yh, -1); b.poly(fm, [[da, yh, l.c - e], [db, yh, l.c - e], [db, yh, l.c + e], [da, yh, l.c + e]], [0, -1, 0]); }
      else { b.wallX(fm, da, l.c - e, l.c + e, Y, yh, 1); b.wallX(fm, db, l.c - e, l.c + e, Y, yh, -1); b.poly(fm, [[l.c - e, yh, da], [l.c - e, yh, db], [l.c + e, yh, db], [l.c + e, yh, da]], [0, -1, 0]); }
      const prof = steelDoor ? [[0, 0], [0.03, 0], [0.03, 0.07], [0, 0.07]] : PR.arch, aw = prof[prof.length - 1][1];
      // 1st class / suites / public rooms: moulded door head (cornice) over the architrave, fine 2
      const rt = d.room?.type, head = !steelDoor && kitFine() >= 2 && top - (yh + aw) > 0.25 && (st.grand || d.room?.cls === 'first' || rt === 'suite' || PUBLIC_TYPES.has(rt));
      for (const sd of [-1, 1]) {
        const c = l.c + sd * T2, A = X ? [1, 0, 0] : [0, 0, 1], O = X ? [0, 0, sd] : [sd, 0, 0];
        const P = (a, y) => (X ? [a, y, c] : [c, y, a]);
        b.sweep(fm, prof, P(da, Y), [0, 1, 0], O, [-A[0], 0, -A[2]], yh + aw - Y, [false, true]);
        b.sweep(fm, prof, P(db, Y), [0, 1, 0], O, A, yh + aw - Y, [false, true]);
        b.sweep(fm, prof, P(da - aw, yh), A, O, [0, 1, 0], db - da + 2 * aw, [true, true]);
        if (head && (!d.label || sd === (d.sgn || 1))) b.sweep(fm, PR.head, P(da - aw - 0.025, yh + aw), A, O, [0, 1, 0], db - da + 2 * aw + 0.05, [true, true]);
        if (!steelDoor) for (const a of [da - aw, db]) { const p = P(a, Y), q = X ? [a + aw, Y + 0.16, c + sd * 0.024] : [c + sd * 0.024, Y + 0.16, a + aw]; b.box(fm, Math.min(p[0], q[0]), Y, Math.min(p[2], q[2]), Math.max(p[0], q[0]), Y + 0.16, Math.max(p[2], q[2])); }
      }
      // threshold strip (steppable)
      const tm = steelDoor ? mats.steelDark : st.grand ? mats.brass : (dstyle === 'pine' || dstyle === 'white' ? mats.oak : matOf(DOOR_MATS[dstyle] ?? 'oak'));
      box(tm, da, Y, l.c - T2 - 0.03, db, Y + (steelDoor ? 0.03 : 0.012), l.c + T2 + 0.03, 'xXYzZ');
    } else {
      this._cap(l, da, Y, yh, 1, run.sn.wall); this._cap(l, db, Y, yh, -1, run.sn.wall);
      if (X) b.poly(run.sn.wall, [[da, yh, l.c - T2], [db, yh, l.c - T2], [db, yh, l.c + T2], [da, yh, l.c + T2]], [0, -1, 0]);
      else b.poly(run.sn.wall, [[l.c - T2, yh, da], [l.c - T2, yh, db], [l.c + T2, yh, db], [l.c + T2, yh, da]], [0, -1, 0]);
    }
    // leaf
    const sgn = d.sgn || 1;
    const hingeLo = d.hinge ? d.hinge === 'lo' : (d.at - d.lo <= d.hi - d.at);
    d._hinge = hingeLo ? 'lo' : 'hi'; d._leaf = d.leaf !== false;
    if (d.leaf !== false) {
      const closed = d.closed || d.open === 0, ang = ((closed ? 0 : d.open ?? 95) * Math.PI) / 180;
      const rt = d.room?.type, variant = steelDoor ? '' : (d.glazed || (d.glazed !== false && PUBLIC_TYPES.has(rt) && (dstyle === 'oak' || dstyle === 'mahogany' || dstyle === 'white')) ? 'glazed' : rt === 'cabin' ? 'louvre' : '');
      const double = d.w >= 1.25 && !steelDoor && d.double !== false;
      // an open leaf stands clear of the jamb: its hinge edge used to sit half inside the architrave (flickering edge)
      const hi = closed ? 0.01 : 0.036;
      const leaves = double ? [[da + hi, 1, (d.w - 0.03) / 2], [db - hi, -1, (d.w - 0.03) / 2]] : [[hingeLo ? da + hi : db - hi, hingeLo ? 1 : -1, d.w - 0.02]];
      for (const [ha, dirA, lw] of leaves) {
        const off = closed ? 0 : sgn * (T2 + 0.02);
        const al = Math.cos(ang) * dirA, pr = Math.sin(ang) * sgn; // along-wall / perpendicular components
        const dx = X ? al : pr, dz = X ? pr : al, hx = X ? ha : l.c + off, hz = X ? l.c + off : ha;
        const leaf = doorLeaf(lw, d.h - 0.02, dstyle, variant);
        leaf.position.set(hx, Y, hz); leaf.rotation.y = Math.atan2(-dz, dx); leaf.userData.leaf = true;
        this.zone(hx).add(leaf);
      }
      if (closed) { if (X) this.world.addCollider(da, Y, l.c - T2, db, yh, l.c + T2); else this.world.addCollider(l.c - T2, Y, da, l.c + T2, yh, db); }
    }
    // brass number plate above the door, on the side opposite to the declaring room
    if (d.label && top - yh > 0.26) {
      const side = -sgn, txt = String(d.label).toUpperCase().replace(/[^0-9A-Z]/g, ''), cw = 0.055, ch = 0.075, yc = yh + 0.17;
      const face = l.c + side * (T2 + 0.012), right = X ? side : -side, n = txt.length;
      { // brass backing plate
        const hw = (n * cw) / 2 + 0.025, f2 = l.c + side * (T2 + 0.006), f1 = l.c + side * (T2 + 0.001);
        const pa = [d.at - hw, d.at + hw], ya = yc - ch / 2 - 0.02, yb = yc + ch / 2 + 0.02;
        if (X) b.box(mats.brass, pa[0], ya, Math.min(f1, f2), pa[1], yb, Math.max(f1, f2), side > 0 ? 'ZxXyY' : 'zxXyY');
        else b.box(mats.brass, Math.min(f1, f2), ya, pa[0], Math.max(f1, f2), yb, pa[1], side > 0 ? 'XzZyY' : 'xzZyY');
      }
      for (let i = 0; i < n; i++) {
        const idx = PLATE_CHARS.indexOf(txt[i]); if (idx < 0) continue;
        const a0 = d.at + right * ((i - n / 2) * cw), a1 = a0 + right * cw;
        const u0 = (idx % 6) / 6, u1 = u0 + 1 / 6, v1 = 1 - Math.floor(idx / 6) / 6, v0 = v1 - 1 / 6;
        const pts = X ? [[a0, yc - ch / 2, face], [a1, yc - ch / 2, face], [a1, yc + ch / 2, face], [a0, yc + ch / 2, face]]
          : [[face, yc - ch / 2, a0], [face, yc - ch / 2, a1], [face, yc + ch / 2, a1], [face, yc + ch / 2, a0]];
        b.poly(kitMats.plate, pts, X ? [0, 0, side] : [side, 0, 0], [[u0, v0], [u1, v0], [u1, v1], [u0, v1]]);
      }
    }
  }

  /** thin floor / ceiling overlay of a room, clipped to the hull */
  _overlay(mat, r, y, down, holes) {
    const b = this.batch, lim = (x) => this.halfWidth(x) - 0.01;
    for (const q of rectMinus({ x0: r.x0, x1: r.x1, z0: r.z0, z1: r.z1 }, holes)) {
      const m = minHalfWidth(this.deck, q.x0, q.x1) - 0.01;
      if (q.z0 >= -m && q.z1 <= m) { b.flat(mat, q.x0, q.x1, q.z0, q.z1, y, down); continue; }
      const n = Math.max(1, Math.ceil((q.x1 - q.x0) / 1.0));
      for (let i = 0; i < n; i++) {
        const xa = q.x0 + ((q.x1 - q.x0) * i) / n, xb = q.x0 + ((q.x1 - q.x0) * (i + 1)) / n, la = lim(xa), lb = lim(xb);
        const cl = (z, h) => Math.max(-h, Math.min(h, z));
        const p = [[xa, y, cl(q.z0, la)], [xb, y, cl(q.z0, lb)], [xb, y, cl(q.z1, lb)], [xa, y, cl(q.z1, la)]];
        if (p[3][2] - p[0][2] < 1e-3 && p[2][2] - p[1][2] < 1e-3) continue;
        b.poly(mat, p, [0, down ? -1 : 1, 0]);
      }
    }
  }
}

// ---------------------------------------------------------------- furnishing context

const DIRS = { right: [1, 0], left: [-1, 0], in: [0, 1], out: [0, -1] };

/**
 * Local frame of a room for furnishing presets. u runs along the door wall (0..W), v into the room (0..D).
 * The frame is chosen so that the main door is in the low-u half.
 */
export class FurnishCtx {
  constructor(plan, r) {
    this.plan = plan; this.room = r; this.world = plan.world; this.deck = plan.deck; this.y = plan.y; this.h = plan.h;
    this.rng = rngOf(hash(plan.deck + ':' + r.id)); this.opts = {}; this.cls = r.cls;
    /** second random stream for decorative extras (does not disturb the furniture layout drawn from rng) */
    this.drng = rngOf(hash('deco:' + plan.deck + ':' + r.id));
    /** third stream for lived-in clutter (fine detail) – leaves rng / drng and with them the existing layout untouched */
    this.crng = rngOf(hash('clutter:' + plan.deck + ':' + r.id));
    /** kit fine-detail level at build time (TIER.fine) */
    this.fine = kitFine();
    this.clutterTris = 0; this.mounted = [];
    const s = r.safe, doors = r.doorsAll ?? [];
    const main = doors.find((d) => d.own) ?? doors[0];
    const side = r.facing ?? main?.side ?? r.open[0] ?? (r.hullSide === 'stbd' ? 'port' : r.hullSide === 'port' ? 'stbd' : 'aft');
    this.side = side;
    const alongZ = side === 'aft' || side === 'fwd';
    this.W = alongZ ? s.z1 - s.z0 : s.x1 - s.x0; this.D = alongZ ? s.x1 - s.x0 : s.z1 - s.z0;
    const doorPos = main && main.side === side ? main.at - (alongZ ? s.z0 : s.x0) : null;
    const flip = doorPos !== null ? doorPos > this.W / 2 + 0.01 : this.rng() < 0.5;
    this.V = side === 'aft' ? [1, 0] : side === 'fwd' ? [-1, 0] : side === 'port' ? [0, 1] : [0, -1]; // [x, z]
    this.U = alongZ ? [0, flip ? -1 : 1] : [flip ? -1 : 1, 0];
    this.o = [alongZ ? (side === 'aft' ? s.x0 : s.x1) : (flip ? s.x1 : s.x0), alongZ ? (flip ? s.z1 : s.z0) : (side === 'port' ? s.z0 : s.z1)];
    this.door = doorPos === null ? null : { u: flip ? this.W - doorPos : doorPos, w: main.w };
    const hs = r.hullSide; // which local wall is the hull
    this.hull = !hs ? null : (hs === side ? 'near' : (alongZ ? ((hs === 'stbd') !== flip ? 'right' : 'left') : 'far'));
    this.doorDepth = Math.min(1.0, Math.max(0.5, this.D * 0.4));
    this.occupied = [];
    this.obstacles = [...plan.casings, ...plan.keepouts].filter((q) => overlap(q, r));
    this._doors = doors;
    this.count = 0;
  }

  /** local (u, v) → world {x, z} */
  at(u, v) { return { x: this.o[0] + u * this.U[0] + v * this.V[0], z: this.o[1] + u * this.U[1] + v * this.V[1] }; }
  rot(dir) { const d = DIRS[dir] ?? DIRS.in; return P.faceDir(d[0] * this.U[0] + d[1] * this.V[0], d[0] * this.U[1] + d[1] * this.V[1]); }

  _doorZones() {
    const r = this.room, zones = [];
    for (const d of this._doors) {
      const dep = this.doorDepth, m = d.w / 2 + 0.12;
      const zone = (a0, a1, depth) => (d.side === 'aft' ? { x0: r.x0, x1: r.x0 + depth, z0: a0, z1: a1 } : d.side === 'fwd' ? { x0: r.x1 - depth, x1: r.x1, z0: a0, z1: a1 }
        : d.side === 'port' ? { x0: a0, x1: a1, z0: r.z0, z1: r.z0 + depth } : { x0: a0, x1: a1, z0: r.z1 - depth, z1: r.z1 });
      zones.push(zone(d.at - m, d.at + m, dep + T2));
      if (d.own && d.leaf) { const hj = d.hinge === 'lo' ? d.at - d.w / 2 : d.at + d.w / 2; zones.push(zone(hj - 0.14, hj + 0.14, Math.min(d.w + 0.1, this.D * 0.6))); }
    }
    return zones;
  }

  /** world rect of a local footprint */
  _rect(u, v, eu, ev) {
    const a = this.at(u - eu / 2, v - ev / 2), c = this.at(u + eu / 2, v + ev / 2);
    return { x0: Math.min(a.x, c.x), x1: Math.max(a.x, c.x), z0: Math.min(a.z, c.z), z1: Math.max(a.z, c.z) };
  }
  /** true if the local rectangle (centre u,v, size eu × ev) is inside the room/hull and free of doors, casings, stairs and props */
  free(u, v, eu, ev) {
    if (u - eu / 2 < -0.01 || u + eu / 2 > this.W + 0.01 || v - ev / 2 < -0.01 || v + ev / 2 > this.D + 0.01) return false;
    const q = this._rect(u, v, eu, ev), dk = this.deck;
    const zmax = Math.max(Math.abs(q.z0), Math.abs(q.z1));
    if (zmax > deckHalfWidth(dk, q.x0) - 0.03 || zmax > deckHalfWidth(dk, q.x1) - 0.03) return false;
    this._zones ??= this._doorZones();
    const hit = (o) => overlap(o, q, 0.005);
    return !(this._zones.some(hit) || this.obstacles.some(hit) || this.occupied.some(hit));
  }

  /**
   * Place a prop with its centre at local (u, v), front facing dir ('in' | 'out' | 'left' | 'right').
   * Returns false (and does nothing) if the spot is not free. opts: { collide, force, y, reserve (extra clearance in front, m) }
   */
  put(prop, u, v, dir = 'in', opts = {}) {
    const fp = prop.userData.fp ?? { w: 0.5, d: 0.5, h: 1 }, side = dir === 'left' || dir === 'right';
    const eu = side ? fp.d : fp.w, ev = side ? fp.w : fp.d;
    if (!opts.force && !this.free(u, v, eu, ev)) return false;
    const p = this.at(u, v), q = this._rect(u, v, eu, ev);
    const collide = opts.collide ?? (fp.h > 0.45 && Math.min(fp.w, fp.d) >= 0.4 && Math.max(fp.w, fp.d) >= 0.75);
    // opts.merge: geometry goes into the deck batch (no extra meshes) – for small clutter repeated in hundreds of rooms
    if (opts.merge) this.clutterTris += this.plan.batch.prop(prop, p.x, this.y + (opts.y ?? 0), p.z, this.rot(dir));
    else P.place(this.plan.zone(p.x), prop, p.x, this.y + (opts.y ?? 0), p.z, this.rot(dir), { collide: false });
    if (collide) this.world.addCollider(q.x0, this.y, q.z0, q.x1, this.y + Math.max(0.5, Math.min(fp.h, 2)), q.z1);
    if (!opts.ghost) { q.h = fp.h + (opts.y ?? 0); this.occupied.push(q); }
    if (!opts.clutter) this.count++;
    this.last = { u, v, dir, fp, x: p.x, z: p.z };
    return true;
  }

  /**
   * Small accessory (slippers, books, carafe, life jackets …) relative to the prop placed last by put()/fit():
   * dx along that prop's front direction, dz along its width (local z), opts.y height above the floor, opts.turn extra
   * rotation (rad). No collider, does not reserve floor; refused outside the room or in a door zone. Returns true/false.
   */
  attach(prop, dx = 0, dz = 0, opts = {}) {
    const L = this.last; if (!L) return false;
    const { x, z } = this._relXZ(dx, dz);
    const u = (x - this.o[0]) * this.U[0] + (z - this.o[1]) * this.U[1], v = (x - this.o[0]) * this.V[0] + (z - this.o[1]) * this.V[1];
    const fp = prop.userData.fp ?? { w: 0.3, d: 0.3 }, r = Math.max(fp.w, fp.d) / 2;
    if (u - r < 0 || u + r > this.W || v - r < 0 || v + r > this.D || Math.abs(z) + r > deckHalfWidth(this.deck, x) - 0.02) return false;
    this._zones ??= this._doorZones();
    const q = { x0: x - r, x1: x + r, z0: z - r, z1: z + r };
    if (!opts.y && this._zones.some((o) => overlap(o, q, 0.005))) return false;
    if (opts.merge) this.clutterTris += this.plan.batch.prop(prop, x, this.y + (opts.y ?? 0), z, this.rot(L.dir) + (opts.turn ?? 0));
    else P.place(this.plan.zone(x), prop, x, this.y + (opts.y ?? 0), z, this.rot(L.dir) + (opts.turn ?? 0));
    return true;
  }

  /** attach() merged into the deck batch (no extra meshes): small clutter on / at the prop placed last. */
  stow(prop, dx = 0, dz = 0, opts = {}) { return this.attach(prop, dx, dz, { ...opts, merge: true }); }

  /** world x/z of a point dx along the front / dz along the width of the prop placed last */
  _relXZ(dx, dz) {
    const L = this.last, d = DIRS[L.dir] ?? DIRS.in, F = [d[0] * this.U[0] + d[1] * this.V[0], d[0] * this.U[1] + d[1] * this.V[1]];
    return { x: L.x + F[0] * dx - F[1] * dz, z: L.z + F[1] * dx + F[0] * dz };
  }
  /** world point [x, y, z] relative to the prop placed last (y above the floor) */
  rel(dx, dz, y = 0) { const p = this._relXZ(dx, dz); return [p.x, this.y + y, p.z]; }
  /**
   * Small batched box relative to the prop placed last: dx0..dx1 along its front, dz0..dz1 along its width, y0..y1 above
   * the floor (books, soap, folded clothes …). No collider, no reservation. faces as Batch.box (default without bottom).
   */
  lbox(mat, dx0, dz0, dx1, dz1, y0, y1, faces = 'xXYzZ') {
    if (!this.last) return;
    const b = this.plan.batch, t0 = b.tris, p = this.rel(dx0, dz0, y0), q = this.rel(dx1, dz1, y1);
    b.box(matOf(mat), p[0], p[1], p[2], q[0], q[1], q[2], faces);
    this.clutterTris += b.tris - t0;
  }
  /** run fn(batch, rel) drawing clutter straight into the deck batch (counted as clutter, see lbox) */
  bits(fn) {
    if (!this.last) return;
    const b = this.plan.batch, t0 = b.tris;
    fn(b, (dx, dz, y) => this.rel(dx, dz, y));
    this.clutterTris += b.tris - t0;
  }

  /**
   * Put a prop against a wall, trying a list of preferences ['wall:snug', ...] with wall = near|far|left|right and
   * snug = lo|hi|mid (lo = towards the door wall for side walls / towards u = 0 for near and far). Scans along the wall for a free spot.
   */
  fit(prop, prefs, opts = {}) {
    const fp = prop.userData.fp, gap = opts.gap ?? 0.02;
    for (const pref of [].concat(prefs)) {
      const [wall, snug = 'lo'] = pref.split(':');
      const side = wall === 'left' || wall === 'right', len = side ? this.D : this.W;
      const lo = fp.w / 2 + 0.03, hi = len - fp.w / 2 - 0.03;
      if (hi < lo - 1e-6) continue;
      const cand = [];
      if (snug === 'mid') { for (let k = 0; len / 2 + k <= hi + 1e-6 || len / 2 - k >= lo - 1e-6; k += 0.25) { if (len / 2 + k <= hi + 1e-6) cand.push(len / 2 + k); if (k > 0 && len / 2 - k >= lo - 1e-6) cand.push(len / 2 - k); } }
      else if (snug === 'hi') { for (let p = hi; p >= lo - 1e-6; p -= 0.2) cand.push(p); }
      else { for (let p = lo; p <= hi + 1e-6; p += 0.2) cand.push(p); }
      for (const p of cand) {
        const ok = wall === 'left' ? this.put(prop, fp.d / 2 + gap, p, 'right', opts) : wall === 'right' ? this.put(prop, this.W - fp.d / 2 - gap, p, 'left', opts)
          : wall === 'near' ? this.put(prop, p, fp.d / 2 + gap, 'in', opts) : this.put(prop, p, this.D - fp.d / 2 - gap, 'out', opts);
        if (ok) { this.last.wall = wall; this.last.pos = p; return true; }
        if (opts.exact) break;
      }
    }
    return false;
  }

  /** Mount a wall prop (sconce, mirror, clock: origin = mounting point) on a wall at position `pos` along it, height hgt. */
  mount(prop, wall, pos, hgt = 1.7, opts = {}) {
    const [u, v, dir] = wall === 'left' ? [0.01, pos, 'right'] : wall === 'right' ? [this.W - 0.01, pos, 'left'] : wall === 'near' ? [pos, 0.01, 'in'] : [pos, this.D - 0.01, 'out'];
    const p = this.at(u, v);
    if (Math.abs(p.z) > deckHalfWidth(this.deck, p.x)) return false;
    if (opts.merge) this.clutterTris += this.plan.batch.prop(prop, p.x, this.y + hgt, p.z, this.rot(dir));
    else P.place(this.plan.zone(p.x), prop, p.x, this.y + hgt, p.z, this.rot(dir));
    // remembered for the wall fittings (switches, grilles): wall strip and height range (coats hang ~0.9 m below the hooks)
    const fp = prop.userData.fp ?? { w: 0.5, h: 0.5 }, side = wall === 'left' || wall === 'right';
    const q = this._rect(u, v, side ? 0.3 : fp.w, side ? fp.w : 0.3);
    this.mounted.push({ ...q, y0: hgt - (prop.userData.prop === 'coatHooks' ? 1.0 : fp.h / 2 + 0.05), y1: hgt + fp.h / 2 + 0.05 });
    return true;
  }

  /** Iterate the centres of a grid of cells (du × dv) that fills the room with a margin. fn(u, v, i, j, nu, nv). */
  grid(du, dv, fn, margin = 0.4) {
    const nu = Math.floor((this.W - 2 * margin) / du + 1e-6), nv = Math.floor((this.D - 2 * margin) / dv + 1e-6);
    if (nu < 1 || nv < 1) return 0;
    const u0 = (this.W - nu * du) / 2, v0 = (this.D - nv * dv) / 2;
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) fn(u0 + (i + 0.5) * du, v0 + (j + 0.5) * dv, i, j, nu, nv);
    return nu * nv;
  }

  /** Raw box in local coordinates (u0..u1, v0..v1, heights above the floor), e.g. partitions and counters. */
  box(mat, u0, v0, u1, v1, y0, y1, collide = false) {
    const a = this.at(u0, v0), c = this.at(u1, v1);
    this.plan.batch.box(matOf(mat), a.x, this.y + y0, a.z, c.x, this.y + y1, c.z);
    const q = { x0: Math.min(a.x, c.x), x1: Math.max(a.x, c.x), z0: Math.min(a.z, c.z), z1: Math.max(a.z, c.z) };
    if (collide) { this.world.addCollider(q.x0, this.y + y0, q.z0, q.x1, this.y + y1, q.z1); this.occupied.push(q); }
  }

  /** extra lamp (e.g. fireplace glow) at local u,v */
  glow(u, v, hgt, color = 0xff8a3a, intensity = 0.8) { const p = this.at(u, v); this.world.addLamp({ x: p.x, y: this.y + hgt, z: p.z, color, intensity }); }

  pick(list) { return list[Math.floor(this.rng() * list.length) % list.length]; }

  /** a free standing point just inside the main door (or the room centre) + yaw looking into the room */
  entryPoint() {
    const d = this._doors.find((q) => q.own) ?? this._doors[0], r = this.room, s = r.safe;
    if (d) {
      const k = Math.min(0.7, (d.side === 'aft' || d.side === 'fwd' ? s.x1 - s.x0 : s.z1 - s.z0) / 2);
      if (d.side === 'aft') return { x: r.x0 + k, z: d.at, yaw: 0 };
      if (d.side === 'fwd') return { x: r.x1 - k, z: d.at, yaw: Math.PI };
      if (d.side === 'port') return { x: d.at, z: r.z0 + k, yaw: -Math.PI / 2 };
      return { x: d.at, z: r.z1 - k, yaw: Math.PI / 2 };
    }
    // no door (open room): nearest free spot to the middle of the entry side
    const yaw = Math.atan2(-this.V[1], this.V[0]);
    this._zones = [];
    for (let v = 0.5; v < this.D - 0.4; v += 0.25) {
      for (let k = 0; k < this.W / 2 - 0.4; k += 0.25) for (const u of [this.W / 2 + k, this.W / 2 - k]) if (this.free(u, v, 0.8, 0.8)) return { ...this.at(u, v), yaw };
    }
    return { x: (s.x0 + s.x1) / 2, z: (s.z0 + s.z1) / 2, yaw };
  }
}

/** Create a room plan for one deck. defaults: { wall, floor, lamp, doorW, doorH, lampPitch, height } */
export function createDeckPlan(world, deck, defaults) { return new DeckPlan(world, deck, defaults); }
