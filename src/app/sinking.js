// The night of 14 April 1912 (start screen, or URL ?untergang=1): the iceberg, the collision and the sinking.
//
// The ship never moves: everything of the ship (its geometry, the visitor walking on its decks, the lamps) stays in
// ship coordinates. What moves is the outside world – sky, sea, iceberg, lifeboats rowing away, rockets – which is
// drawn through the inverse of the ship's transform T (trim, sinkage, list). Seen from inside, the horizon tilts and
// the sea climbs up the decks. The water inside the hull is one horizontal plane per watertight compartment, shown
// only inside the hull. At the break the stern is drawn in a second pass with its own transform.
import * as THREE from 'three';
import { DECK_Y, SHIP, FUNNELS, hullHalfWidth } from '../core/constants.js';
import { ENGINE } from '../core/engine.js';
import { mats } from '../core/materials.js';
import { TIER } from '../core/tier.js';
import { SHIP_SPEED } from '../environment/ocean.js';
import { Director, Wreckage, HullDamage } from './cinema.js';
import { bergGeometry } from '../environment/iceberg.js';
import { Crowd } from './crowd.js';
import { createCarpathia, createIceField } from './epilogue.js';
import { liveBoat } from '../exterior/fit-boats.js';

const WL = SHIP.waterline, ROOF = DECK_Y.roof + 0.5, D2R = Math.PI / 180;
const XB = 1.0;                 // the hull breaks here: between the third (x 12) and the fourth funnel (x -10)
const P_BREAK = new THREE.Vector3(XB, 4, 0);
const HIT = 15;                 // s of real time from the first sight of the iceberg to the collision (23:40)
const SCRAPE = 14;              // s of real time while the berg grinds along (then the clock runs compressed)
const END = 160;                // 02:20, minutes after 23:40
// minutes of the night per second: 'fast' = the whole night in about two minutes (15 s approach, 8 s scraping,
// 77 s to 02:14, 20 s for the last six minutes), 'slow' about 20 minutes
const RATE = { fast: 2.0, slow: 160 / 1200, pause: 0 };
const FINALE = 154, FINALE_RATE = 0.3;
const BOAT_REF = 160 / 300;     // clock rate at which the davits work at their own (real-time) pace

// trim (degrees, bow down), sinkage (m), list (degrees, port down) of the whole ship – minutes after 23:40
const KEYS_A = [
  [0, 0, 0, 0], [20, 0.5, 0.5, -0.3], [45, 1.2, 1.0, -0.6], [65, 2.0, 1.6, -0.4], [90, 3.0, 2.2, 0.6], [110, 3.8, 2.7, 1.5],
  [120, 4.3, 3.0, 2.2], [130, 5.5, 3.6, 2.8], [140, 7.0, 4.3, 3.2], [150, 8.8, 5.2, 3.6], [155, 10.0, 6.0, 4.0], [157, 11.5, 6.8, 4.2],
  // after the break: the bow section goes down steeply
  [157.5, 22, 16, 5], [158.5, 38, 55, 6], [160, 45, 160, 6], [999, 45, 160, 6],
];
// the stern section after the break, about the break point: trim, drop of the break point (m), list
const KEYS_B = [[157, 11.5, 0, 4.2], [157.6, 3, 4, 3], [158.3, 45, 22, 2], [159.0, 80, 60, 1], [159.6, 86, 95, 1], [160.2, 88, 190, 1], [999, 88, 190, 1]];

// watertight compartments (forward edge, aft edge) and when they fill (minutes): the first six were opened by the ice
const COMPS = [
  [135, 118, 0, 12], [118, 100, 0, 18], [100, 84, 0, 22], [84, 66, 0, 30], [66, 55.5, 0, 40], [55.5, 39.5, 20, 140],
  [39.5, 23.6, 95, 140], [23.6, 8.3, 120, 150], [8.3, -6.7, 135, 155], [-6.7, -22, 145, 157], [-22, -45, 150, 157.5],
  [-45, -58, 152, 158], [-58, -80, 154, 158.5], [-80, -100, 155, 159], [-100, -118, 156, 159.5], [-118, -136, 157, 160],
];
// lowering of the boats (minutes after 23:40) by boat number: odd = starboard
const LAUNCH = { 7: 65, 5: 75, 3: 80, 8: 80, 1: 85, 6: 90, 16: 100, 14: 105, 12: 110, 9: 110, 11: 115, 13: 120, 15: 120, 2: 125, 10: 130, 4: 135 };
const ROCKETS = [65, 72, 79, 86, 93, 100, 107, 114];
// how many were in each boat as it was lowered (roughly as recorded; the first boats left half empty)
const LOADS = { 7: 28, 5: 36, 3: 32, 8: 39, 1: 12, 6: 28, 16: 40, 14: 40, 12: 42, 9: 42, 11: 44, 13: 44, 15: 44, 2: 26, 10: 40, 4: 40 };
// the film after 02:20: the sea, a boat going back (the clock runs faster), then a cut to first light
const AFTER_RATE = 0.6, BACK_END = 172, DAWN = 268, DAWN_END = 281;

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (t) => { t = clamp01(t); return t * t * (3 - 2 * t); };
function keyAt(keys, m) {
  let i = 0;
  while (i < keys.length - 2 && keys[i + 1][0] <= m) i++;
  const a = keys[i], b = keys[i + 1], t = smooth((m - a[0]) / Math.max(1e-6, b[0] - a[0]));
  return [lerp(a[1], b[1], t), lerp(a[2], b[2], t), lerp(a[3], b[3], t)];
}
const _r = new THREE.Matrix4();
/** ship -> world: trim about midship at the waterline, then down by the sinkage */
function shipMatrix(out, trim, sink, list) {
  out.makeTranslation(0, -WL, 0);
  _r.makeRotationX(-list * D2R); out.premultiply(_r);
  _r.makeRotationZ(-trim * D2R); out.premultiply(_r);
  _r.makeTranslation(0, WL - sink, 0); out.premultiply(_r);
  return out;
}
const pad = (n) => String(n).padStart(2, '0');
/** topmost open deck at x (as topDeck in environment/ocean.js): above it the sea itself closes over the hull */
const topDeck = (x) => (x > 94 ? 22.5 : x > 78 ? 19.7 : x > 74 ? 22.5 : x > -72 ? 28.2 : x > -90 ? 22.5 : x > -106 ? 19.7 : 22.5);

export class Sinking {
  constructor({ world, scene, camera, player, renderer, sound, ui, interact, post }) {
    Object.assign(this, { world, scene, camera, player, renderer, sound, ui, interact, post });
    this.active = false;
    this.TA = new THREE.Matrix4(); this.TAi = new THREE.Matrix4(); this.TB = new THREE.Matrix4();
    this.qAi = new THREE.Quaternion();
    this.m = -HIT / 60;            // minutes after 23:40
    this.t = 0;                     // real seconds since the start
    this.speed = 'fast';
    this.XB = XB;
    this.cine = true;              // a film: the camera is the director's, nobody walks
  }

  // ------------------------------------------------------------------ start

  start() {
    if (this.active || !this.world.env) return;
    this.active = true;
    const W = this.world, env = W.env, sc = this.scene;
    W.sinkMode = true;
    W.starBoost = 2.2; // starlight: enough to make out the dark ship against the sea after the lights went out
    W.setNight(true);
    W.nightOverride = 1; // (dark from the first frame: no fade from the day)
    ENGINE.order = 3; ENGINE.speed = 1;
    // the outside world, drawn through the inverse of the ship's transform
    this.outside = new THREE.Group();
    this.outside.name = 'outsideWorld';
    this.outside.matrixAutoUpdate = false;
    sc.add(this.outside);
    for (const o of [env.sky.dome, env.sky.stars, env.ocean.mesh, env.berg.mesh, env.sun, env.sun.target]) this.outside.add(o);
    // things that belong to the ship but are not baked: ice on the well deck, the falling funnel
    this.shipLive = new THREE.Group();
    this.shipLive.name = 'shipLive';
    sc.add(this.shipLive);
    this._floods();
    this._iceberg();
    this.director = new Director(this);
    this.wreck = new Wreckage(this);
    this.damage = new HullDamage(this);
    this.crowd = new Crowd(this);
    if (this.cine) mats.hullRed?.color?.setHex(0x4a2620);
    this.carpathia = createCarpathia();
    this.iceField = createIceField();
    this.outside.add(this.carpathia, this.iceField);
    this.contactX = 200;
    W.gradeHook = (P) => this._grade(P);
    W.sinkHold = true;             // no deck streaming: the camera wanders over the whole ship
    if (this.ui.controls) this.ui.controls.noLock = true;
    document.body.classList.add('cine');
    // lifeboats: all in their chocks, driven by the timetable below
    const B = this.interact.boats;
    for (const u of [...B.live.keys()]) B.reset(u);
    B.sink = { timeScale: 1, waterY: (S) => this.seaLocalY(S.u.x, S.u.z) - DECK_Y.boat, onAfloat: (S) => this._afloat(S) };
    this.stations = [...W.uses.values()].filter((u) => u.kind === 'lifeboat').map((u) => {
      const s = u.spec, fwd = [62.8, 53.0, 43.1, 33.2], aft = [-30.1, -40.0, -49.9, -59.8];
      const k = fwd.includes(s.x) ? fwd.indexOf(s.x) : 4 + aft.indexOf(s.x);
      const no = 2 * k + (s.side > 0 ? 1 : 2);
      return { u, no, launch: LAUNCH[no] ?? 120, swung: false, lowered: false };
    });
    this.away = [];
    this.rockets = []; this.rocketNo = 0;
    this.sound.band = null; // the band plays later, on the boat deck
    // the visitor: at the very bow, looking ahead into the dark
    const p = this.player;
    if (!this.cine) p.teleport({ deck: 'B', x: 122, y: DECK_Y.B, z: 2.5, yaw: -0.12 }); // beside the anchor crane, clear view ahead to starboard
    p.pitch = 0.0;
    this._ui();
    // behind a black title card: the boiler room built, every shader of the film compiled (also the variants with the
    // cut of the break), the grade settled in the dark – then the film starts without a hitch
    this.ready = false;
    this._prepare();
  }

  _ui() {
    const clock = (this.clockEl = document.createElement('div'));
    clock.className = 'sink-clock';
    for (const c of ['top', 'bottom']) { const b = document.createElement('div'); b.className = 'cine-bar ' + c; document.body.append(b); }
    const quit = document.createElement('button');
    quit.type = 'button'; quit.className = 'cine-quit'; quit.textContent = 'Beenden';
    quit.addEventListener('click', () => { const q = new URLSearchParams(location.search); q.delete('untergang'); location.search = q.toString(); });
    document.body.append(quit);
    clock.innerHTML = '<span></span><small></small>';
    this.clockT = clock.firstChild; this.clockS = clock.lastChild;
    this.clockS.addEventListener('click', () => this.cycle());
    document.body.append(clock);
    this.fadeEl = document.createElement('div');
    this.fadeEl.className = 'cine-fade';
    this.fadeEl.innerHTML = '<div></div>';
    document.body.append(this.fadeEl);
    this.underEl = document.createElement('div');
    this.underEl.className = 'sink-under';
    document.body.append(this.underEl);
    window.addEventListener('keydown', (e) => { if ((e.code === 'KeyU' || e.code === 'Space') && !e.repeat && !this.ui.modal) { e.preventDefault(); this.cycle(); } });
  }

  cycle() {
    this.speed = this.speed === 'fast' ? 'slow' : this.speed === 'slow' ? 'pause' : 'fast';
    this.ui.toast?.(this.speed === 'fast' ? 'Zeit: schnell (2 Minuten)' : this.speed === 'slow' ? 'Zeit: langsam (20 Minuten)' : 'Zeit angehalten', 1.6);
  }

  async _prepare() {
    const F = this.fadeEl, wait = (ms) => new Promise((r) => setTimeout(r, ms));
    F.firstChild.innerHTML = '14. April 1912<br><small>Nordatlantik, 23:39</small>';
    F.classList.add('show', 'title');
    const t0 = performance.now();
    try { if (this.preload) await this.preload(); } catch (e) { console.warn('[sinking] Kesselraum', e); }
    // the light of the interiors (wheelhouse, Marconi room) is baked the first time the camera is inside: now
    this._warmInside = true;
    await wait(1800);
    this._warmInside = false;
    this.world.noOutside = false; this.outside.visible = true;
    await wait(400); // (a few frames: the night's environment light is in place before the shaders are compiled for it)
    try { await this._warm(); } catch (e) { console.warn('[sinking] Shader', e); }
    await wait(Math.max(600, 2600 - (performance.now() - t0))); // (the title stays a moment; grade and lamps settle meanwhile)
    this.ready = true;
    F.classList.remove('show');
    setTimeout(() => F.classList.remove('title'), 1400);
  }

  /** compile every material the film will use: all objects shown for a moment, without and with the clipping plane */
  async _warm() {
    const r = this.renderer;
    if (!r?.compileAsync) return;
    const hidden = [];
    const showAll = (root) => root.traverse((o) => { if (!o.visible) { hidden.push(o); o.visible = true; } });
    for (const o of [this.carpathia, this.iceField, this.wreck?.surf, this.spur]) if (o && !o.visible) { hidden.push(o); o.visible = true; }
    showAll(this.scene);
    // every texture onto the graphics card now (the rooms' textures would otherwise go up the first time they are seen)
    if (r.initTexture) {
      const seen = new Set();
      this.scene.traverse((o) => {
        for (const m of [].concat(o.material || [])) for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'bumpMap', 'alphaMap']) {
          const t = m[k];
          if (t && !seen.has(t)) { seen.add(t); try { r.initTexture(t); } catch { /* later */ } }
        }
      });
    }
    const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
    try {
      // three variants: whole, cut (the two halves after the break), cut without the outside world (its starlight)
      const cut = [new THREE.Plane(new THREE.Vector3(1, 0, 0), 1e5)];
      for (const [planes, outside] of [[[], true], [[], false], [cut, true], [cut, false]]) {
        r.clippingPlanes = planes;
        this.outside.visible = outside;
        // (the film is drawn into the post pipeline's linear target, without it straight to the screen: the shaders differ)
        const target = this.post ? rt : null;
        r.setRenderTarget(target); r.render(new THREE.Scene(), this.camera); // (sets the clipping state)
        if (this.wreck) this.wreck.fxBow.fog = this.wreck.fxStern.fog = this.scene.fog;
        const jobs = [r.compileAsync(this.scene, this.camera)];
        if (this.wreck) jobs.push(r.compileAsync(this.wreck.fxBow, this.camera));
        r.setRenderTarget(null);
        await Promise.all(jobs);
      }
    } finally {
      r.clippingPlanes = [];
      this.outside.visible = true;
      for (const o of hidden) o.visible = false;
      rt.dispose();
    }
  }

  // ------------------------------------------------------------------ the water inside the hull

  _floods() {
    // hull half-width at the waterline (as the sea's cut-out in environment/ocean.js)
    const n = 544, data = new Uint8Array(n);
    for (let i = 0; i < n; i++) data[i] = Math.round(clamp01(hullHalfWidth(-136 + (272 * i) / (n - 1), WL) / SHIP.halfBeam) * 255);
    const tex = new THREE.DataTexture(data, n, 1, THREE.RedFormat, THREE.UnsignedByteType);
    tex.magFilter = tex.minFilter = THREE.LinearFilter; tex.needsUpdate = true;
    const basic = TIER.fine === 0;
    const geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    this.floods = COMPS.map(([x1, x0, f0, f1]) => {
      const U = { uX0: { value: x0 }, uX1: { value: x1 }, uHull: { value: tex } };
      const m = basic
        ? new THREE.MeshBasicMaterial({ color: 0x0a2833, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
        : new THREE.MeshStandardMaterial({ color: 0x0b2a34, roughness: 0.1, metalness: 0.0, transparent: true, opacity: 0.88, side: THREE.DoubleSide });
      m.name = 'flood';
      m.onBeforeCompile = (sh) => {
        Object.assign(sh.uniforms, U);
        sh.vertexShader = 'varying vec3 vShip;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n  vShip = (modelMatrix * vec4(transformed, 1.0)).xyz;');
        sh.fragmentShader = 'varying vec3 vShip;\nuniform float uX0;\nuniform float uX1;\nuniform sampler2D uHull;\n' + sh.fragmentShader.replace('void main() {', `void main() {
  float hwS = texture2D(uHull, vec2((vShip.x + 136.0) / 272.0, 0.5)).r * ${SHIP.halfBeam.toFixed(2)};
  float x = vShip.x, top = x > 94.0 ? 22.5 : x > 78.0 ? 19.7 : x > 74.0 ? 22.5 : x > -72.0 ? 28.2 : x > -90.0 ? 22.5 : x > -106.0 ? 19.7 : 22.5;
  if (x < uX0 || x > uX1 || vShip.y > top - 0.2 || abs(vShip.z) > hwS - 0.35) discard;`);
      };
      m.customProgramCacheKey = () => 'flood' + (basic ? 'b' : 's');
      const mesh = new THREE.Mesh(geo, m);
      mesh.name = 'flood';
      mesh.scale.set(x1 - x0 + 60, 1, 64);
      mesh.position.set((x0 + x1) / 2, -100, 0);
      mesh.frustumCulled = false;
      mesh.visible = false;
      mesh.renderOrder = 2;
      this.outside.add(mesh);
      return { mesh, x0, x1, f0, f1, level: -100 };
    });
  }

  /** ship-local height of the sea surface at (x, z) */
  seaLocalY(x, z) { const e = this.TA.elements; return (WL - e[1] * x - e[9] * z - e[13]) / e[5]; }

  _updateFloods() {
    const e = this.TA.elements, m = this.m;
    for (const F of this.floods) {
      const xc = (F.x0 + F.x1) / 2, keelW = e[1] * xc + e[5] * DECK_Y.tank + e[13];
      const sea = this.broken || this.seaLocalY(xc, 0) > DECK_Y.E; // the sea has reached E deck here: it pours in over the bulkheads
      const f = sea ? 1 : smooth((m - F.f0) / (F.f1 - F.f0)) * (m > F.f0 ? 1 : 0);
      F.level = lerp(keelW, WL, f);
      F.mesh.visible = f > 0.002;
      F.mesh.position.y = F.level;
    }
  }

  /** world height of the water at a ship-local point (sea outside the hull or above it, compartment level inside) */
  waterAt(p) {
    const hw = hullHalfWidth(p.x, WL);
    if (Math.abs(p.x) < SHIP.bowX && Math.abs(p.z) < hw - 0.35 && p.y < topDeck(p.x) - 0.2) {
      const F = this.floods.find((c) => p.x <= c.x1 && p.x >= c.x0);
      if (F) return F.mesh.visible ? F.level : -1e9;
    }
    return WL;
  }

  // ------------------------------------------------------------------ iceberg, collision

  _iceberg() {
    const b = this.world.env.berg.mesh, g = b.geometry, P = g.attributes.position;
    let minZ = Infinity;
    for (let i = 0; i < P.count; i++) { const x = P.getX(i), z = P.getZ(i); if (Math.abs(x - 520) < 12 && Math.abs(z - 140) < 60 && P.getY(i) > WL - 1) minZ = Math.min(minZ, z); }
    this.bergNear = 140 - (Number.isFinite(minZ) ? minZ : 110);
    b.material.emissive.setHex(0x04070b); // hardly any light on the ice: a moonless night, the berg a darker shape against the stars
    b.material.color.setHex(0x56606c);
    this.berg = { x: 110 + HIT * SHIP_SPEED, v: SHIP_SPEED, z: 0 };
    // the spur: a shelf of the berg's foot reaching out under water, the part that cut the ship open
    const sg = bergGeometry((TIER.fine ?? 2) >= 2 ? 6 : 4, 56, 30, 9, 7.3, [{ x: 0.2, z: 0, sx: 0.5, sz: 0.5, h: 0.4 }], { strata: 0, oct: 4, deep: 1.3 });
    sg.deleteAttribute('color');
    const SP = sg.attributes.position;
    let top = -1e9, near = 1e9;
    for (let i = 0; i < SP.count; i++) { top = Math.max(top, SP.getY(i)); if (Math.abs(SP.getX(i)) < 6 && Math.abs(SP.getY(i)) < 2.5) near = Math.min(near, SP.getZ(i)); }
    const sm = new THREE.MeshStandardMaterial({ color: 0x2f6474, roughness: 0.45, metalness: 0, flatShading: true, emissive: 0x020809 });
    sm.name = 'iceSpur';
    this.spur = new THREE.Mesh(sg, sm);
    this.spur.name = 'iceSpur';
    this.spur.frustumCulled = false;
    this.spurTop = top; this.spurNear = -near;
    this.outside.add(this.spur);
  }

  _moveBerg(dt) {
    const B = this.berg, hit = this.t >= HIT;
    if (hit) B.v *= Math.exp(-dt / 25); // the ship carries her way for a while after the engines were stopped
    if (B.x > -360) B.x -= B.v * dt;
    const x = B.x, hwAt = (xx) => hullHalfWidth(Math.max(-130, Math.min(125, xx)), WL);
    // where the berg touches: the point of its near face that needs it farthest out to clear the hull (z of the berg's
    // centre so that this point lies 0.1 m into the plating – the ice grinds along the side)
    const Pf = this.world.env.berg.profile;
    let zc = -1e9, cxw = x, cyw = WL + 1;
    for (let i = 0; i < Pf.length; i += 3) {
      const hx = x + Pf[i];
      if (hx < -133 || hx > 133) continue;
      const need = hullHalfWidth(hx, Pf[i + 1]) - 0.1 - Pf[i + 2];
      if (need > zc) { zc = need; cxw = hx; cyw = Pf[i + 1]; }
    }
    if (zc < -1e8) zc = hwAt(Math.min(x, 120)) + 0.4 + this.bergNear;
    this.touch = { x: cxw, y: cyw };
    // before the blow she is still turning to port: the berg comes in from farther out, and touches at 23:40
    let z = zc + Math.max(0, HIT - this.t) * 1.1;
    if (x < 10) z += (10 - x) * 0.14;                                                   // and falls away astern
    B.z = z;
    this.world.env.berg.mesh.position.set(x - 520, 0, z - 140);
    // the spur rides with the berg; its near face presses 0.6 m into the plating where it is
    const cx = (this.contactX = x + 12), hu = hullHalfWidth(Math.max(-130, Math.min(128, cx)), WL - 6);
    const away = Math.max(0, z - zc);
    this.spur.position.set(x + 30, WL - 3.2 - this.spurTop, hu - 0.6 + this.spurNear + away);
    this.spur.rotation.y = 0.05;
    // ice tumbling onto the forward well deck as the berg passes it
    if (!this.iced && hit && x < 92) this._ice();
  }

  _collide() {
    this.hitDone = true;
    ENGINE.order = 0;
    ENGINE.steam = 1;
    this.shake = 10;
    this.sound.scrape(SCRAPE + 1);
    this.sound.steamRoar(14);
  }

  _ice() {
    this.iced = true;
    const mat = new THREE.MeshStandardMaterial({ color: 0xe4f0fa, roughness: 0.5, flatShading: true, emissive: 0x0f1822 });
    this.ice = [];
    for (let i = 0; i < 16; i++) {
      const r = 0.15 + Math.random() * 0.4, m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), mat);
      const x = 79 + Math.random() * 14, z = 2 + Math.random() * 7.5;
      m.position.set(x, DECK_Y.C + 7 + Math.random() * 3, z + 3);
      m.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      this.shipLive.add(m);
      this.ice.push({ m, y1: DECK_Y.C + r * 0.6, z1: z, t: -Math.random() * 1.5 });
    }
  }

  // ------------------------------------------------------------------ lifeboats, rockets, band

  _boats() {
    const B = this.interact.boats;
    for (const st of this.stations) {
      if (!st.swung && this.m >= Math.max(25, st.launch - 22)) {
        st.swung = true;
        const S = B.live.get(st.u);
        if (!st.u.spec.out && (!S || S.phase === 'stowed')) B.work(st.u, true);
      }
      if (!st.lowered && this.m >= st.launch) {
        const S = B.live.get(st.u) || B._start(st.u);
        if (S && S.phase === 'out' && !S.q.length) { st.lowered = true; B.work(st.u, true); }
        else if (S && S.phase !== 'stowed' && S.phase !== 'out') st.lowered = true;
      }
      // the people climb in while the boat hangs at the rail, some minutes before it is lowered
      if (st.swung && !st.loaded && this.m >= st.launch - 18 && this.crowd) {
        const S = B.live.get(st.u) || (st.u.spec.out ? B._start(st.u) : null);
        if (!S) continue;
        st.loaded = true;
        // (the covers were off long before)
        const b = S.L.boat, sp = st.u.spec;
        if (sp.covered && b.children[0]) { b.remove(b.children[0]); b.add(liveBoat(sp.type || 'std', false)); }
        S.load = this.crowd.boatLoad(b, LOADS[st.no] ?? 30, st.no === 1 ? 2 : 4, st.no === 7);
        S.no = st.no;
      }
    }
  }

  /** a boat has reached the water: it leaves the falls and rows away (in the outside world) */
  _afloat(S) {
    const b = S.L.boat;
    b.updateWorldMatrix(true, false);
    const pw = new THREE.Vector3().setFromMatrixPosition(b.matrixWorld).applyMatrix4(this.TA);
    this.outside.add(b);
    b.matrixAutoUpdate = true;
    b.position.copy(pw); b.position.y = WL - 0.35;
    b.rotation.set(0, 0, 0); b.scale.set(1, 1, 1);
    S.away = { p0: pw.clone(), side: S.u.spec.side, t: 0, seed: S.u.id };
    this.away.push(S);
  }

  _row(dtMin, dt) {
    const m = this.m;
    // after 02:20 one boat turns back for the people in the water, a lantern in its bow
    if (m >= END + 0.4 && !this.back && this.away.length && m < DAWN) {
      const S = this.away.find((q) => q.no === 14) || this.away[Math.min(this.away.length - 1, 3)];
      const c = new THREE.Vector3();
      this.crowd.seaCentre(c);
      const p0 = S.L.boat.position.clone(), to = c.clone().add(new THREE.Vector3(Math.sign(p0.x - c.x || 1) * 6, 0, Math.sign(p0.z - c.z || 1) * 5));
      this.back = { S, p0, to, via: c.clone(), saved: 0 };
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd9a0 }));
      lamp.position.set(4.1, 1.9, 0);
      S.L.boat.add(lamp);
    }
    for (const S of this.away) {
      if (this.back && S === this.back.S && m < DAWN) {
        const Bk = this.back, b = S.L.boat, k = smooth((m - END - 0.4) / (BACK_END - 2 - END - 0.4));
        // in a curve towards the people, then slowly through them
        const p = Bk.p0.clone().lerp(Bk.to, Math.min(1, k * 1.25)).lerp(Bk.via, Math.max(0, k * 1.25 - 1) * 2);
        const d = p.clone().sub(b.position);
        b.position.set(p.x, WL - 0.35 + Math.sin(this.t * 1.1) * 0.06, p.z);
        if (d.lengthSq() > 1e-6) b.rotation.set(0, Math.atan2(-d.z, d.x), Math.sin(this.t * 0.9) * 0.03);
        if (k > 0.55 && Bk.saved < 6) { const n = this.crowd.rescue(b.position, 3, 6 - Bk.saved); for (let i = 0; i < n; i++) S.load && this.crowd.boatAdd(S.load); Bk.saved += n; }
        continue;
      }
      const A = S.away, b = S.L.boat;
      A.t += dtMin;
      const k = smooth(A.t / 14), turn = smooth(A.t / 2.5);
      b.position.set(A.p0.x - 25 * k, WL - 0.35 + Math.sin(this.t * 1.1 + A.seed) * 0.06, A.p0.z + A.side * (170 + (A.seed % 5) * 22) * k);
      if (m >= DAWN) {
        // first light: rowing towards the Carpathia; the first boats are alongside her
        const C = this.carpathia.position, j = this.away.indexOf(S), kd = smooth((m - DAWN) / 14);
        const tgt = j < 2 ? new THREE.Vector3(C.x - 20 + 26 * j, WL - 0.35, C.z + 14) : new THREE.Vector3(C.x + (j - 6) * 22, WL - 0.35, C.z + 60 + (j % 3) * 30);
        b.position.lerp(tgt, j < 2 ? 1 : 0.25 + 0.5 * kd);
        b.position.y = WL - 0.35 + Math.sin(this.t * 1.1 + A.seed) * 0.06;
        b.rotation.set(0, j < 2 ? 0 : Math.atan2(-(C.z - b.position.z), C.x - b.position.x), 0);
        continue;
      }
      b.rotation.set(Math.sin(this.t * 0.8 + A.seed) * 0.02, -A.side * Math.PI / 2 * turn, Math.sin(this.t * 0.9 + A.seed * 2) * 0.03);
    }
    void dt;
  }

  _rocket() {
    // fired from the socket at the starboard bridge wing; a white star shell bursting high over the ship
    const side = this.rocketNo % 2 ? 1 : -1;
    const p0 = new THREE.Vector3(69.2, DECK_Y.boat + 1.4, side * 9.6).applyMatrix4(this.TA);
    const head = new THREE.Mesh(this._rhead ||= new THREE.SphereGeometry(0.45, 8, 6), this._rmat ||= new THREE.MeshBasicMaterial({ color: 0xfff6e0, fog: false }));
    head.position.copy(p0);
    this.outside.add(head);
    this.rockets.push({ head, p0, t: 0, top: 180 + Math.random() * 40, side, burst: 0 });
    this.sound.rocket(1.8);
  }

  _moveRockets(dt) {
    const Wk = this.wreck;
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const R = this.rockets[i];
      R.t += dt;
      if (R.t < 1.8) {
        const k = R.t / 1.8;
        R.head.position.set(R.p0.x + 8 * k, R.p0.y + R.top * (1 - (1 - k) * (1 - k)), R.p0.z + R.side * 6 * k);
        Wk?.trail.emit(R.head.position, 3, 1.5, 0.2, null, 0.6);
        continue;
      }
      if (!R.burst) {
        R.burst = 1; R.head.visible = false; R.c = R.head.position.clone();
        Wk?.stars.burst(R.c, 480, 44);
        Wk?.sparks.emit(R.c, 60, 14, 0.5, null, 1);
        if (Wk) { Wk.flash.position.copy(R.c).applyMatrix4(this.TAi); Wk.flashT = 3.2; }
      }
      // the stars burst again as they fall (a crackle of smaller stars)
      if (R.burst === 1 && R.t > 2.6) { R.burst = 2; for (let k = 0; k < 8; k++) Wk?.stars.burst(R.c.clone().add(new THREE.Vector3((Math.random() - 0.5) * 70, -15 - Math.random() * 30, (Math.random() - 0.5) * 70)), 34, 11); }
      if (R.t > 7) { this.outside.remove(R.head); this.rockets.splice(i, 1); }
    }
  }

  // ------------------------------------------------------------------ the forward funnel falls, the lights fail, the hull breaks

  _funnel() {
    this.funnelDone = true;
    const F = FUNNELS[0], L = F.height / Math.cos(F.rake), BY = DECK_Y.boat, cut = DECK_Y.roof - BY;
    for (const c of this.world.extAll) if (c.ec === 101) c.off = true;
    const g = new THREE.Group(), body = new THREE.Group();
    g.position.set(F.x, DECK_Y.roof, 0);
    body.rotation.z = F.rake;
    g.add(body);
    const part = (y0, y1, mat) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, y1 - y0, 28, 1, true), mat); m.scale.set(F.a, 1, F.b); m.position.y = (y0 + y1) / 2 - cut; m.material.side = THREE.DoubleSide; body.add(m); };
    part(cut, L * 0.755, mats.funnelBuff); part(L * 0.755, L, mats.funnelBlack);
    this.shipLive.add(g);
    this.funnel = { g, t: 0 };
    this.sound.groan(3);
  }

  _break() {
    this.broken = true;
    this.P0 = P_BREAK.clone().applyMatrix4(this.TA);
    this.sound.groan(7);
    this.shake = 4;
    this.wreck?.breakUp();
    // whoever is still on board goes into the sea; a boat still on its falls goes down with the ship
    const B = this.interact.boats, R = B.rider;
    if (!this.cine && !(R && R.S.away)) {
      if (R) B.rider = null;
      this._overboard();
    }
  }

  _overboard() {
    const c = this.camera.position.clone().applyMatrix4(this.TA);
    this.drift = { p: new THREE.Vector3(c.x, Math.min(c.y, WL - 1.6), c.z) };
    this.world.sinkHold = true;
    this.world.culling = false;
  }

  _power() {
    const m = this.m;
    let p = 1;
    if (m >= 154 && m < 157.2) { const f = Math.sin(this.t * 31) * Math.sin(this.t * 7.3 + 1) * Math.sin(this.t * 2.1); p = f > 0.55 ? 0.08 : 0.78 + 0.22 * Math.sin(this.t * 13); }
    else if (m >= 157.2) p = 0;
    this.world.power = p;
    mats.lampGlow.emissiveIntensity = 3.4 * p;
    mats.windowLit.emissiveIntensity = 3.2 * p;
  }

  // ------------------------------------------------------------------ per frame

  update(dt) {
    if (!this.active || !this.ready) return;
    const W0 = this.world;
    this.t += dt;
    // the night's clock: real time until the scraping is over, then compressed
    let rate = 1 / 60;
    if (this.t > HIT + SCRAPE) {
      rate = RATE[this.speed];
      if (this.m >= FINALE) rate = Math.min(rate, FINALE_RATE);
      if (this.m >= END && rate > 0) rate = this.m >= DAWN ? 1.2 : AFTER_RATE;
    }
    const dtMin = Math.min(dt, 0.1) * rate;
    if (this.m < DAWN_END) this.m += dtMin;
    // the cut to first light: to black, the time jumps, up again
    if (this.m >= BACK_END && this.m < DAWN) {
      if (!this.fadeAt) { this.fadeAt = this.t; this.fadeEl.classList.add('show'); }
      this.m = BACK_END;
      if (this.t - this.fadeAt > 2.2) { this.m = DAWN; this._dawn(); }
    }
    const m = this.m;
    // the ship's transform
    const [ta, sa, la] = keyAt(KEYS_A, Math.max(0, m));
    this.ta = ta; this.la = la;
    shipMatrix(this.TA, ta, sa, la);
    this.TAi.copy(this.TA).invert();
    this.qAi.setFromRotationMatrix(this.TAi);
    this.outside.matrix.copy(this.TAi);
    this.world.shipToWorld = this.TA;
    this.outside.matrixWorldNeedsUpdate = true;
    if (this.broken) {
      const [tb, db, lb] = keyAt(KEYS_B, m);
      this.tb = tb; this.lb = lb;
      this.TB.makeTranslation(-P_BREAK.x, -P_BREAK.y, -P_BREAK.z);
      _r.makeRotationX(-lb * D2R); this.TB.premultiply(_r);
      _r.makeRotationZ(-tb * D2R); this.TB.premultiply(_r);
      _r.makeTranslation(this.P0.x, this.P0.y - db, this.P0.z); this.TB.premultiply(_r);
    }
    // events
    if (!this.hitDone && this.t >= HIT) this._collide();
    if (this.t < HIT + 28) this._moveBerg(dt);
    else if (!this.bergGone) {
      // far astern now, out of the pictures (it was soon lost in the dark)
      this.bergGone = true;
      this.world.env.berg.mesh.position.set(-1500 - 520, 0, 420 - 140);
      this.spur.visible = false;
    }
    if (ENGINE.steam > 0 && this.t > HIT) ENGINE.steam = clamp01(1 - Math.max(0, m) / 25) * (this.cine ? 0.1 : 1); // blowing off for the first 25 minutes (in the film a thinner plume)
    if (this.ice) for (const I of this.ice) { if (I.t < 1) { I.t += dt * 1.4; const k = clamp01(I.t); I.m.position.y = lerp(I.m.position.y, I.y1, k * k); I.m.position.z = lerp(I.m.position.z, I.z1, k); } }
    this._boats();
    this.interact.boats.sink.timeScale = this.t > HIT + SCRAPE ? rate / BOAT_REF : 1;
    this._row(dtMin, dt);
    while (this.rocketNo < ROCKETS.length && m >= ROCKETS[this.rocketNo]) { this.rocketNo++; this._rocket(); }
    this._moveRockets(dt);
    // the band: ragtime and waltzes on the boat deck, at the end the hymn; heard over the pictures like a score
    const tune = m < 100 ? (Math.floor((m - 30) / 22) % 2 ? 'waltz' : 'rag') : m < 126 ? 'waltz' : 'hymn';
    this.sound.band = m >= 30 && m < 153 && this.crowd?.bandOn !== false ? (this._bandSpot ||= { x: 47.5, y: DECK_Y.boat, z: 9.3, range: 40 }) : null;
    if (this.sound.band) this.sound.band.tune = tune;
    this.sound.bandScore = this.director?.shot?.band ? 1 : tune === 'hymn' ? 0.55 : 0.3;
    // the voices: a murmur on deck, rising to the roar at the end, then the cries from the water dying away
    const cl = m < 0 ? 0 : m < 45 ? 0.12 : m < 120 ? 0.25 : m < 150 ? 0.5 : m < 157 ? 0.8 : m < 160.5 ? 1 : m < BACK_END ? Math.max(0.05, 0.9 * (1 - (m - 160.5) / 10)) : 0;
    this.sound.crowdLevel = cl;
    this.sound.crowdPitch = m > 150 ? 1.35 : 1;
    if (!this.funnelDone && m >= 154.6) this._funnel();
    if (this.funnel && this.funnel.t < 1.4) {
      const f = this.funnel; f.t += dt / 2.6;
      const k = clamp01(f.t);
      f.g.rotation.set(k * k * 1.55, 0, -k * k * 0.25); // over to starboard and a little forward
      if (k >= 1 && !f.splash) {
        f.splash = true; this.sound.splash();
        f.g.updateMatrixWorld(true);
        const top = new THREE.Vector3(0, 18, 0).applyMatrix4(f.g.matrixWorld).applyMatrix4(this.TA); top.y = WL + 0.3;
        this.wreck?.funnel(top);
      }
      if (f.t > 1.35) f.g.visible = false;
    }
    this._power();
    W0.starBoost = m >= 157.2 ? Math.min(4, W0.starBoost + dt * 1.5) : 2.2; // after the lights failed: eyes used to the dark
    if (!this.broken && m >= 157) this._break();
    // the wreckage: ice off the berg while she grinds along it, the stern falling back, things sliding off her decks
    const Wk = this.wreck;
    if (Wk) {
      // the spur at work: steel and air torn out of the plating, the rents opening one by one, the sea pouring in
      const cxS = this.contactX;
      if (this.t > HIT - 0.6 && cxS > 56 && cxS < 128) {
        const hu = hullHalfWidth(cxS, WL - 6);
        Wk.grind(new THREE.Vector3(cxS, WL - 5.5 - Math.random() * 2, hu + 0.3).applyMatrix4(this.TA));
        if (Math.random() < dt * 6) this.shake = Math.max(this.shake || 0, 1.2);
      }
      const opened = this.damage.update(dt, cxS);
      for (const R0 of opened) { this.sound.groan?.(1.2); Wk.bubbles.emit(new THREE.Vector3(R0.x0, R0.yc, hullHalfWidth(R0.x0, R0.yc) + 0.5).applyMatrix4(this.TA), 60, 4, 1, null, 1.4); }
      if (m < 45) for (const R0 of this.damage.rents) if (R0.open && Math.random() < dt * 22) Wk.inflow(this.damage.mouth(R0, new THREE.Vector3()).applyMatrix4(this.TA));
      // inside boiler room 6: the jets of the sea through the opened seams at the forward end, 2.5 m above the plates
      if (this.boilerReady && this.t > 23.4 && this.t < 40) for (let k = 0; k < 6; k++) {
        const x = 61.6 + Math.random() * 3.2, y = 3.9 + Math.random() * 0.6, hz = hullHalfWidth(x, y) - 0.5;
        Wk.jets.emit(new THREE.Vector3(x, y, hz).applyMatrix4(this.TA), 8, 3.4, 0.15, new THREE.Vector3(0, 0.1, -2.4).transformDirection(this.TA).multiplyScalar(2.4), 0.25);
      }
      if (!this.calved && this.t > HIT + 0.8) { this.calved = true; Wk.calve(this.berg, hullHalfWidth(Math.min(this.berg.x, 120), WL)); }
      if (this.t > HIT && this.t < HIT + SCRAPE && Math.random() < 0.6) {
        const T0 = this.touch || { x: this.berg.x, y: WL + 1 }, cx = Math.max(-120, Math.min(126, T0.x));
        Wk.ice(new THREE.Vector3(cx, T0.y, hullHalfWidth(cx, T0.y) + 0.3).applyMatrix4(this.TA));
        if (Math.random() < 0.5) Wk.sparks.emit(new THREE.Vector3(cx, T0.y, hullHalfWidth(cx, T0.y) + 0.2).applyMatrix4(this.TA), 6, 4, 0.6, null, 0.8);
      }
      if (this.broken && !this.slammed && m >= 157.55) { this.slammed = true; Wk.slam(); this.shake = 2; }
      if (this.broken && m > 158.1 && m < 159.7 && Math.random() < dt * 14) Wk.slide();
      Wk.update(dt);
    }
    if (this.crowd && m < DAWN) this.crowd.update(dt, m);
    if (Wk && m > 160 && m < 163.5 && Math.random() < 0.6) {
      const p = new THREE.Vector3(this.P0.x - 40 + Math.random() * 50, WL + 0.1, (Math.random() - 0.5) * 22);
      Wk.spray.emit(p, 6, 2.5, 1, null, 0.8);
    }
    this.damage.g.visible = !this.director?.shot?.inside;
    this.world.noOutside = !!this.director?.shot?.inside;
    this.outside.visible = !this.world.noOutside; // (from inside the boiler room the plates outside would show through)
    this._updateFloods();
    // under water?
    const cam = this.camera.position, wy = cam.clone().applyMatrix4(this.TA).y;
    const under = this.drift ? this.drift.p.y < WL - 0.05 : wy < this.waterAt(cam) - 0.02;
    this.world.underwater = under;
    // under water in the film: clearer, greener water, a soft light on the camera (as a film crew would light it)
    const cineUnder = this.cine && under;
    this.world.underFog = cineUnder ? (this._uf ||= { color: new THREE.Color(0x02080d), density: 0.11 }) : null;
    if (Wk) {
      Wk.fill = cineUnder;
      if (cineUnder && !this.broken) {
        const ga = this.director?.shot?.glowAt;
        Wk.glow.color.setHex(ga ? 0x8fb4d8 : 0x5a9cb4); Wk.glow.intensity = ga ? 45 : 45;
        if (ga) Wk.glow.position.set(ga[0], ga[1], ga[2]); else Wk.glow.position.copy(this.camera.position).add(new THREE.Vector3(0, 5, 0));
      }
      else if (Wk.glowT <= 0) Wk.glow.color.setHex(0xff8a3a);
      Wk.drift(this.director?.pos || this.camera.position, cineUnder, this.t);
      // a cold fill light from the camera where the shot asks for it (the people on the dark stern)
      const fill = this.director?.shot?.fill;
      if (fill && Wk.flashT <= 0) { Wk.flash.color.setHex(this.director.shot.fillCol ?? 0xa8bcdc); Wk.flash.intensity = fill; const fp = Wk.flash.position.copy(this.camera.position).applyMatrix4(this.TA); fp.y += this.director.shot.fillUp ?? 8;
        fp.applyMatrix4(this.broken && this.m < END + 0.6 && this.director.shot.name !== 'Bruch' ? (this._TBi ||= new THREE.Matrix4()).copy(this.TB).invert() : this.TAi); // (the stern's pass: in its own frame)
      }
      else if (Wk.flashT > 0) Wk.flash.color.setHex(0xfff0dc);
      // the surface seen from below
      const sf = Wk.surf, cw = this.director?.pos || cam;
      sf.visible = cineUnder;
      if (cineUnder) { sf.position.set(cw.x, WL - 0.04, cw.z); sf.material.uniforms.uCam.value.copy(cw); sf.material.uniforms.uT.value = this.t; sf.material.uniforms.uLit.value = this.world.power ?? 0; sf.material.uniforms.uCol.value.copy(this._uf.color); }
      // the lantern of the boat that went back
      if (this.back && m < DAWN && m > END + 0.4 && Wk.glowT <= 0) {
        Wk.glow.color.setHex(0xffc070); Wk.glow.intensity = 90;
        Wk.glow.position.set(4.1, 2.2, 0).applyMatrix4(this.back.S.L.boat.matrix).applyMatrix4(this.TAi);
      }
    }
    const Rv = this.cine ? null : this.interact.boats.rider;
    this.world.viewLabel = this.drift ? ['Nordatlantik', under ? 'Unter Wasser' : 'Im Wasser'] : Rv && Rv.S.away ? ['Rettungsboot', 'auf dem Nordatlantik'] : null;
    this.underEl.classList.toggle('show', under);
    this.sound.muffle(under);
    // the end
    if (m >= DAWN_END - 0.2 && !this.endAt) this.endAt = this.t + 1.5;
    if (this.endAt && this.t >= this.endAt && !this.endEl) this._end();
    // clock (after 02:20 the film's time runs faster, to the boat that went back about 03:00)
    const shown = m <= END ? m : m < DAWN ? END + (m - END) * 3.5 : m;
    const total = 23 * 3600 + 40 * 60 + shown * 60, h = Math.floor(total / 3600) % 24, mi = Math.floor(total / 60) % 60;
    const txt = `${pad(h)}:${pad(mi)}`;
    if (txt !== this._txt) { this._txt = txt; this.clockT.textContent = txt; }
    const key = this.ui.controls?.touch ? '' : ' (U)';
    const sp = this.t < HIT + SCRAPE || m >= END ? '' : this.speed === 'pause' ? '❚❚ angehalten' + key : this.speed === 'slow' ? '▶ langsam' + key : '▶▶ schnell' + key;
    if (sp !== this._sp) { this._sp = sp; this.clockS.textContent = sp; }
  }

  /** after the visitor's own update: camera in the world frame (rowing away, in the water), shaking, the end */
  lateUpdate(dt) {
    if (!this.active) return;
    if (!this.ready) dt = 0;
    const p = this.player, cam = this.camera;
    if (this.cine) {
      if (this._warmInside) { cam.position.set(50.2, 30.0, 0.4); cam.lookAt(52, 29.5, 1.5); cam.updateMatrixWorld(); p.pos.set(50.2, 28.4, 0.4); this.world.noOutside = true; this.outside.visible = false; this.world.updateVisibility(cam.position); return; } // (the Marconi room: its light and lamp shadows are made now)
      const cut = this.director.apply(cam, dt);
      if (this.shake > 0) {
        this.shake -= dt;
        const a = Math.min(1, this.shake / 3) * 0.06;
        cam.position.x += (Math.random() - 0.5) * a; cam.position.y += (Math.random() - 0.5) * a;
        cam.rotateZ((Math.random() - 0.5) * a * 0.3);
      }
      cam.updateMatrixWorld();
      // the sounds follow the camera
      p.pos.x = cam.position.x; p.pos.y = cam.position.y - 1.6; p.pos.z = cam.position.z;
      if (cut) this.world.updateVisibility(cam.position); // (a cut: the right rooms and details at once)
      if (this.m > END + 0.6) { this.world.shipGone = true; this.world.interior.visible = false; this.world.exterior.visible = false; this.shipLive.visible = false; this.interact.boats.root.visible = this.away.length > 0; }
      return;
    }
    // the horizon stays level in a boat, in the water and in flight; walking on deck one sees it tilt
    const R = this.interact.boats.rider, world = (R && R.S.away) || this.drift || (p.mode === 'fly' && !R);
    if (this.drift) {
      const D = this.drift.p;
      D.y = Math.max(WL - 16, D.y - dt * 0.35);
      D.x += Math.sin(this.t * 0.3) * dt * 0.2;
      const q = D.clone().applyMatrix4(this.TAi);
      p.setFlyPose(q.x, q.y, q.z);
    }
    if (world) {
      // the horizon stays level: the visitor's yaw / pitch (written by the player every frame) are meant in the
      // world, not on the tilting ship – turn them by the inverse of the ship's rotation
      cam.quaternion.premultiply(this.qAi);
      if ((R && R.S.away) || this.drift) { this.world.culling = false; this.world.sinkHold = true; }
    }
    if (this.shake > 0) {
      this.shake -= dt;
      const a = Math.min(1, this.shake / 3) * 0.035;
      cam.position.x += (Math.random() - 0.5) * a; cam.position.y += (Math.random() - 0.5) * a;
      cam.rotateZ((Math.random() - 0.5) * a * 0.3);
    }
    cam.updateMatrixWorld();
    // the wreck is far below: stop drawing it
    if (this.m > END + 0.6) { this.world.interior.visible = false; this.world.exterior.visible = false; this.shipLive.visible = false; this.interact.boats.root.visible = this.away.length > 0; }
  }

  /** a line of text under the picture, like a title in a film (times, what happens) */
  caption(text) {
    let e = this.capEl;
    if (!e) { e = this.capEl = document.createElement('div'); e.className = 'cine-cap'; document.body.append(e); }
    e.textContent = text;
    e.classList.remove('show'); void e.offsetWidth; e.classList.add('show');
    clearTimeout(this._capT);
    this._capT = setTimeout(() => e.classList.remove('show'), 3200);
  }

  /** the film's grade: deep blacks, cool shadows, warm lights, grain, a heavy vignette; teal under water */
  _grade(P) {
    if (!this.cine) return;
    const u = this.world.underwater;
    P.contrast = u ? 1.12 : 1.2;
    P.saturation = u ? 1.05 : 0.8;
    P.vignette = 0.62;
    P.grain = 0.028;
    P.bloom = u ? 0.25 : 0.42; P.bloomThreshold = 0.8; P.bloomKnee = 0.7;
    P.exposure *= (u ? 1.05 : 1.15) * (this.director?.shot?.expo ?? 1);
    if (this.m >= DAWN) { P.contrast = 1.2; P.saturation = 0.7; P.vignette = 0.35; P.grain = 0.022; P.exposure *= 0.6; P.bloom = 0.5; P.lift.setRGB(0.04, 0.05, 0.1); P.gain.setRGB(1.08, 0.86, 0.68); return; }
    if (this.director?.shot?.cold) { P.exposure *= 0.7; P.contrast = 1.25; P.gain.setRGB(0.75, 0.85, 1.0); P.lift.setRGB(0, 0.005, 0.02); return; }
    if (u) { P.lift.setRGB(0.0, 0.02, 0.03); P.gain.setRGB(0.82, 1.02, 1.06); }
    else { P.lift.setRGB(0.0, 0.008, 0.022); P.gain.setRGB(1.07, 1.0, 0.9); }
  }

  // ------------------------------------------------------------------ drawing: after the break the stern is a second pass

  renderScene(r, scene, cam) {
    if (!this.active || !this.broken || this.m > END + 0.6) { r.render(scene, cam); return; }
    const kids = scene.children, vis = kids.map((c) => c.visible), outside = this.outside;
    const shipOnly = (on) => { kids.forEach((c, i) => { if (c === outside) c.visible = !on; else if (!c.isLight && !c.isCamera) c.visible = on && vis[i]; }); };
    const ac = r.autoClear, sh = r.shadowMap.autoUpdate, bg = scene.background;
    try {
      // 1. the outside world (sea, sky, water in the hull)
      shipOnly(false);
      r.render(scene, cam);
      r.autoClear = false; r.shadowMap.autoUpdate = false;
      scene.background = null; // (a colour background would clear the picture again)
      // 2. the bow section
      shipOnly(true);
      r.clippingPlanes = [this._pBow ||= new THREE.Plane(new THREE.Vector3(1, 0, 0), -XB)];
      r.render(scene, cam);
      // 3. the stern section, through a camera moved by the inverse of its motion relative to the bow
      const Rel = new THREE.Matrix4().copy(this.TAi).multiply(this.TB);
      const c2 = (this._cam2 ||= (() => { const c = new THREE.PerspectiveCamera(); c.matrixAutoUpdate = false; c.matrixWorldAutoUpdate = false; return c; })());
      c2.projectionMatrix.copy(cam.projectionMatrix); c2.projectionMatrixInverse.copy(cam.projectionMatrixInverse);
      c2.near = cam.near; c2.far = cam.far;
      c2.matrixWorld.copy(Rel).invert().multiply(cam.matrixWorld);
      c2.matrixWorldInverse.copy(c2.matrixWorld).invert();
      c2.matrix.copy(c2.matrixWorld);
      r.clippingPlanes = [this._pStern ||= new THREE.Plane(new THREE.Vector3(-1, 0, 0), XB)];
      r.render(scene, c2);
      // 4. the torn edges of both halves, reaching into the gap (not cut)
      if (this.wreck) {
        r.clippingPlanes = [];
        const fb = this.wreck.fxBow, fs = this.wreck.fxStern;
        fb.fog = fs.fog = scene.fog;
        r.render(fb, cam);
        r.render(fs, c2);
      }
    } finally {
      r.clippingPlanes = [];
      r.autoClear = ac; r.shadowMap.autoUpdate = sh; scene.background = bg;
      kids.forEach((c, i) => { c.visible = vis[i]; });
    }
  }

  // ------------------------------------------------------------------ first light: 04:10, the Carpathia

  _dawn() {
    const W = this.world;
    W.nightOverride = 0.52;
    W.sunDirOverride = new THREE.Vector3(0.82, 0.035, -0.56).normalize();
    this.carpathia.traverse((o) => { if (o.isPoints && o.material.blending === THREE.AdditiveBlending) o.material.opacity = 0.25; }); // (the lights pale in the morning)
    W.starBoost = 1;
    this.carpathia.position.set(300, WL - 0.4, -330);
    this.carpathia.rotation.y = 2.2;
    this.carpathia.visible = true;
    this.iceField.visible = true;
    this.world.env.berg.mesh.position.set(-640, 0, 260);
    this.crowd.sea.mesh.visible = false;
    for (const R of this.rockets) this.outside.remove(R.head);
    this.rockets.length = 0;
    this.sound.crowdLevel = 0;
    setTimeout(() => {
      this.fadeEl.firstChild.textContent = '04:10 · Die Carpathia nimmt die Überlebenden auf';
      this.fadeEl.classList.remove('show');
      this.fadeEl.classList.add('title');
      setTimeout(() => this.fadeEl.classList.remove('title'), 5200);
    }, 300);
  }

  // ------------------------------------------------------------------ the end

  _end() {
    const e = (this.endEl = document.createElement('div'));
    e.className = 'sink-end';
    e.innerHTML = '<div class="t">15. April 1912</div><div class="s">Von rund 2200 Menschen an Bord überlebten etwa 710.</div><div class="row"><button type="button" data-a="again">Noch einmal</button><button type="button" data-a="tour">Zum Rundgang</button></div>';
    e.addEventListener('click', (ev) => {
      const a = ev.target?.dataset?.a;
      if (!a) return;
      const q = new URLSearchParams(location.search);
      if (a === 'again') q.set('untergang', '1'); else q.delete('untergang');
      location.search = q.toString();
    });
    document.body.append(e);
    requestAnimationFrame(() => e.classList.add('show'));
    try { document.exitPointerLock?.(); } catch { /* not locked */ }
  }
}
