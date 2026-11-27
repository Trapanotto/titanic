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

const WL = SHIP.waterline, ROOF = DECK_Y.roof + 0.5, D2R = Math.PI / 180;
const XB = 1.0;                 // the hull breaks here: between the third (x 12) and the fourth funnel (x -10)
const P_BREAK = new THREE.Vector3(XB, 4, 0);
const HIT = 28;                 // s of real time from the first sight of the iceberg to the collision (23:40)
const END = 160;                // 02:20, minutes after 23:40
const RATE = { fast: 160 / 300, slow: 160 / 1200, pause: 0 };   // minutes of the night per second
const FINALE = 154, FINALE_RATE = 0.1;                           // from 02:14 at most six times real time

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
  }

  // ------------------------------------------------------------------ start

  start() {
    if (this.active || !this.world.env) return;
    this.active = true;
    const W = this.world, env = W.env, sc = this.scene;
    W.sinkMode = true;
    W.starBoost = 2.2; // starlight: enough to make out the dark ship against the sea after the lights went out
    W.setNight(true);
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
    p.teleport({ deck: 'B', x: 122, y: DECK_Y.B, z: 2.5, yaw: -0.12 }); // beside the anchor crane, clear view ahead to starboard
    p.pitch = 0.0;
    this._ui();
    // the clipping variants of every shader for the break, compiled now (no hitch later)
    this._prewarm();
  }

  _ui() {
    const clock = (this.clockEl = document.createElement('div'));
    clock.className = 'sink-clock';
    clock.innerHTML = '<span></span><small></small>';
    this.clockT = clock.firstChild; this.clockS = clock.lastChild;
    this.clockS.addEventListener('click', () => this.cycle());
    document.body.append(clock);
    this.underEl = document.createElement('div');
    this.underEl.className = 'sink-under';
    document.body.append(this.underEl);
    window.addEventListener('keydown', (e) => { if (e.code === 'KeyU' && !e.repeat && !this.ui.modal) this.cycle(); });
  }

  cycle() {
    this.speed = this.speed === 'fast' ? 'slow' : this.speed === 'slow' ? 'pause' : 'fast';
    this.ui.toast?.(this.speed === 'fast' ? 'Zeit: schnell (5 Minuten)' : this.speed === 'slow' ? 'Zeit: langsam (20 Minuten)' : 'Zeit angehalten', 1.6);
  }

  _prewarm() {
    const r = this.renderer;
    if (!r?.compileAsync) return;
    setTimeout(async () => {
      try {
        r.clippingPlanes = [new THREE.Plane(new THREE.Vector3(1, 0, 0), 1e5)];
        const rt = new THREE.WebGLRenderTarget(1, 1);
        r.setRenderTarget(rt); r.render(new THREE.Scene(), this.camera); r.setRenderTarget(null); // sets the clipping state
        await r.compileAsync(this.scene, this.camera);
        rt.dispose();
      } catch { /* compiled when needed */ } finally { r.clippingPlanes = []; }
    }, 1500);
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
    b.material.emissive.setHex(0x34424f); // a little starlight on the ice (it was a moonless night)
    this.berg = { x: 110 + HIT * SHIP_SPEED, v: SHIP_SPEED, z: 0 };
  }

  _moveBerg(dt) {
    const B = this.berg, hit = this.t >= HIT;
    if (hit) B.v *= Math.exp(-dt / 25); // the ship carries her way for a while after the engines were stopped
    if (B.x > -360) B.x -= B.v * dt;
    const x = B.x, hwAt = (xx) => hullHalfWidth(Math.max(-130, Math.min(125, xx)), WL);
    let z = hwAt(Math.min(x, 120)) + 0.4 + this.bergNear + Math.max(0, x - 120) * 0.07; // she turns to port: the berg slides along starboard
    if (x < 10) z += (10 - x) * 0.14;                                                   // and falls away astern
    B.z = z;
    this.world.env.berg.mesh.position.set(x - 520, 0, z - 140);
    // ice tumbling onto the forward well deck as the berg passes it
    if (!this.iced && hit && x < 92) this._ice();
  }

  _collide() {
    this.hitDone = true;
    ENGINE.order = 0;
    ENGINE.steam = 1;
    this.shake = 10;
    this.sound.scrape(11);
    this.sound.steamRoar(42);
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
    for (const S of this.away) {
      const A = S.away, b = S.L.boat;
      A.t += dtMin;
      const k = smooth(A.t / 14), turn = smooth(A.t / 2.5);
      b.position.set(A.p0.x - 25 * k, WL - 0.35 + Math.sin(this.t * 1.1 + A.seed) * 0.06, A.p0.z + A.side * (170 + (A.seed % 5) * 22) * k);
      b.rotation.set(Math.sin(this.t * 0.8 + A.seed) * 0.02, -A.side * Math.PI / 2 * turn, Math.sin(this.t * 0.9 + A.seed * 2) * 0.03);
    }
    void dt;
  }

  _rocket() {
    const p0 = new THREE.Vector3(69.2, DECK_Y.boat + 1.4, 9.6).applyMatrix4(this.TA);
    const head = new THREE.Mesh(this._rhead ||= new THREE.SphereGeometry(0.35, 8, 6), this._rmat ||= new THREE.MeshBasicMaterial({ color: 0xfff6e0 }));
    head.position.copy(p0);
    this.outside.add(head);
    const n = 46, pos = new Float32Array(n * 3), vel = [];
    for (let i = 0; i < n; i++) { const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u), s = 14 + Math.random() * 10; vel.push([r * Math.cos(a) * s, u * s * 0.7 + 4, r * Math.sin(a) * s]); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pm = new THREE.PointsMaterial({ color: 0xfffaf0, size: 3.2, sizeAttenuation: true, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    const pts = new THREE.Points(g, pm); pts.visible = false; pts.frustumCulled = false;
    this.outside.add(pts);
    this.rockets.push({ head, pts, vel, p0, t: 0, top: 190 + Math.random() * 30 });
    this.sound.rocket(1.8);
  }

  _moveRockets(dt) {
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const R = this.rockets[i];
      R.t += dt;
      if (R.t < 1.8) { const k = R.t / 1.8; R.head.position.set(R.p0.x + 6 * k, R.p0.y + R.top * (1 - (1 - k) * (1 - k)), R.p0.z + 4 * k); continue; }
      if (R.head.visible) { R.head.visible = false; R.pts.visible = true; R.c = R.head.position.clone(); }
      const s = R.t - 1.8, P = R.pts.geometry.attributes.position;
      for (let k = 0; k < R.vel.length; k++) { const v = R.vel[k]; P.setXYZ(k, R.c.x + v[0] * s, R.c.y + v[1] * s - 2.2 * s * s, R.c.z + v[2] * s); }
      P.needsUpdate = true;
      R.pts.material.opacity = clamp01(1 - s / 4);
      if (s > 4) { this.outside.remove(R.head); this.outside.remove(R.pts); R.pts.geometry.dispose(); R.pts.material.dispose(); this.rockets.splice(i, 1); }
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
    // whoever is still on board goes into the sea; a boat still on its falls goes down with the ship
    const B = this.interact.boats, R = B.rider;
    if (!(R && R.S.away)) {
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
    if (!this.active) return;
    this.t += dt;
    // the night's clock: real time until the scraping is over, then compressed
    let rate = 1 / 60;
    if (this.t > HIT + 12) { rate = RATE[this.speed]; if (this.m >= FINALE) rate = Math.min(rate, FINALE_RATE); }
    const dtMin = Math.min(dt, 0.1) * rate;
    if (this.m < END + 1) this.m += dtMin;
    const m = this.m;
    // the ship's transform
    const [ta, sa, la] = keyAt(KEYS_A, Math.max(0, m));
    shipMatrix(this.TA, ta, sa, la);
    this.TAi.copy(this.TA).invert();
    this.qAi.setFromRotationMatrix(this.TAi);
    this.outside.matrix.copy(this.TAi);
    this.world.shipToWorld = this.TA;
    this.outside.matrixWorldNeedsUpdate = true;
    if (this.broken) {
      const [tb, db, lb] = keyAt(KEYS_B, m);
      this.TB.makeTranslation(-P_BREAK.x, -P_BREAK.y, -P_BREAK.z);
      _r.makeRotationX(-lb * D2R); this.TB.premultiply(_r);
      _r.makeRotationZ(-tb * D2R); this.TB.premultiply(_r);
      _r.makeTranslation(this.P0.x, this.P0.y - db, this.P0.z); this.TB.premultiply(_r);
    }
    // events
    if (!this.hitDone && this.t >= HIT) this._collide();
    if (this.t < HIT + 60) this._moveBerg(dt);
    if (ENGINE.steam > 0 && this.t > HIT) ENGINE.steam = Math.max(0, ENGINE.steam - dt / 45);
    if (this.ice) for (const I of this.ice) { if (I.t < 1) { I.t += dt * 1.4; const k = clamp01(I.t); I.m.position.y = lerp(I.m.position.y, I.y1, k * k); I.m.position.z = lerp(I.m.position.z, I.z1, k); } }
    this._boats();
    this.interact.boats.sink.timeScale = this.t > HIT + 12 ? rate / RATE.fast : 1;
    this._row(dtMin, dt);
    while (this.rocketNo < ROCKETS.length && m >= ROCKETS[this.rocketNo]) { this.rocketNo++; this._rocket(); }
    this._moveRockets(dt);
    this.sound.band = m >= 40 && m < 151 ? { x: 42, y: DECK_Y.boat, z: 6.8, range: 55 } : null;
    if (!this.funnelDone && m >= 154.6) this._funnel();
    if (this.funnel && this.funnel.t < 1.4) {
      const f = this.funnel; f.t += dt / 2.6;
      const k = clamp01(f.t);
      f.g.rotation.set(k * k * 1.55, 0, -k * k * 0.25); // over to starboard and a little forward
      if (k >= 1 && !f.splash) { f.splash = true; this.sound.splash(); }
      if (f.t > 1.35) f.g.visible = false;
    }
    this._power();
    if (!this.broken && m >= 157) this._break();
    this._updateFloods();
    // under water?
    const cam = this.camera.position, wy = cam.clone().applyMatrix4(this.TA).y;
    const under = this.drift ? this.drift.p.y < WL - 0.05 : wy < this.waterAt(cam) - 0.02;
    this.world.underwater = under;
    const Rv = this.interact.boats.rider;
    this.world.viewLabel = this.drift ? ['Nordatlantik', under ? 'Unter Wasser' : 'Im Wasser'] : Rv && Rv.S.away ? ['Rettungsboot', 'auf dem Nordatlantik'] : null;
    this.underEl.classList.toggle('show', under);
    this.sound.muffle(under);
    // the end
    if (m >= END && !this.endAt) this.endAt = this.t + 9;
    if (this.endAt && this.t >= this.endAt && !this.endEl) this._end();
    // clock
    const total = 23 * 3600 + 40 * 60 + m * 60, h = Math.floor(total / 3600) % 24, mi = Math.floor(total / 60) % 60;
    const txt = `${pad(h)}:${pad(mi)}`;
    if (txt !== this._txt) { this._txt = txt; this.clockT.textContent = txt; }
    const sp = this.t < HIT + 12 ? '' : this.speed === 'pause' ? '❚❚ angehalten (U)' : this.speed === 'slow' ? '▶ langsam (U)' : '▶▶ schnell (U)';
    if (sp !== this._sp) { this._sp = sp; this.clockS.textContent = sp; }
  }

  /** after the visitor's own update: camera in the world frame (rowing away, in the water), shaking, the end */
  lateUpdate(dt) {
    if (!this.active) return;
    const p = this.player, cam = this.camera;
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
    } finally {
      r.clippingPlanes = [];
      r.autoClear = ac; r.shadowMap.autoUpdate = sh; scene.background = bg;
      kids.forEach((c, i) => { c.visible = vis[i]; });
    }
  }

  // ------------------------------------------------------------------ the end

  _end() {
    const e = (this.endEl = document.createElement('div'));
    e.className = 'sink-end';
    e.innerHTML = '<div class="t">02:20</div><div class="row"><button type="button" data-a="again">Noch einmal</button><button type="button" data-a="tour">Zum Rundgang</button></div>';
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
