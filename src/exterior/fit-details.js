import * as THREE from 'three';
import { mats } from '../core/materials.js';
import { DECK_Y, SHIP, deckPlanHalfWidth as plan } from '../core/constants.js';
import { TIER } from '../core/tier.js';
import { mk, Wires } from './fit-util.js';
import { Inst, merge, boxG, cylG, rivetGeo } from './inst.js';
import { BULWARK_H, hullEdge, stations, X } from './structure-layout.js';

// Small deck details of the open decks under the solid bulwarks (forecastle, well decks, poop), added by TIER.fine:
//   fine >= 1: patent taffrail log on the poop rail with its line streaming astern
//   fine >= 2: ring bolts with eye plates along the bulwarks, horn cleats beside the mooring pipes, rivet rows on the
//              inner face of the bulwark plating (gunwale angle + deck stringer angle)
// Every area is its own small group (own bake clusters), the rivet heads one instanced set per end of the ship, so the
// distance LOD of the small parts and of the rivet heads works per area instead of ship-wide.

const B = DECK_Y.B, C = DECK_Y.C;

// areas: deck height, x range of the bulwark, x of the mooring fittings / chain plates that ring bolts keep clear of,
// cargo hatches [x0, x1, half width, coaming height] as built in fit-decks.js
const AREAS = [
  { id: 'forecastle', y: B, x0: X.fc, x1: SHIP.bowX, pipes: [122.5, 115, 106, 100.5], rings: [101, 113], keep: [[94.6, 99.4], [124.5, 134.5]],
    hatches: [[101.0, 105.4, 2.2, 0.8]] },
  { id: 'wellFwd', y: C, x0: X.wellF, x1: X.fc, pipes: [], keep: [[88.0, 89.2], [84.9, 88.1], [78, 79.2], [92.8, 94]], ports: [80.5, 85.5, 90.8],
    hatches: [[86.9, 91.4, 2.5, 0.85], [81.3, 85.3, 2.5, 0.85]] },
  { id: 'wellAft', y: C, x0: X.poop, x1: X.wellA, pipes: [], keep: [[-101.1, -99.9], [-96.1, -92.9], [-106, -104.8], [-91.2, -90]], ports: [-92.5, -97.5, -102.5],
    hatches: [[-97.2, -93.4, 2.3, 0.85], [-103.6, -99.4, 2.3, 0.85]] },
  { id: 'poop', y: B, x0: SHIP.sternX, x1: X.poop, pipes: [-110, -120.5, -130.5], rings: [-113, -127], keep: [[-123.4, -120.6], [-134.5, -131.2], [-107.2, -106]],
    hatches: [[-110.9, -108.7, 1.2, 0.7]] },
];

let G = null;
function geos() {
  const f = TIER.fine;
  if (G && G.f === f) return G;
  G = {
    f,
    // ring bolt: eye plate with a raised eye, the ring lying on the deck
    ring: merge([
      boxG(0.14, 0.012, 0.09, 0, 0.006, 0),
      cylG([0, 0.012, -0.018], [0, 0.034, -0.018], 0.018, 6),
      new THREE.TorusGeometry(0.05, 0.009, 4, 10).rotateX(Math.PI / 2 - 0.12).translate(0, 0.022, 0.04),
    ]),
    // horn cleat on the inner face of the bulwark (local +z = out of the plating, x along the bulwark)
    cleat: merge([
      boxG(0.3, 0.1, 0.012, 0, 0, 0.006),
      boxG(0.05, 0.05, 0.06, -0.07, 0, 0.042), boxG(0.05, 0.05, 0.06, 0.07, 0, 0.042),
      cylG([-0.2, 0, 0.09], [0.2, 0, 0.09], 0.022, 6),
    ]),
  };
  return G;
}

/** Linear interpolation of the bulwark's station polyline (the plating is faceted between these stations). */
function innerFace(x0, x1) {
  const xs = stations(x0, x1, 1.5, 0.3);
  return (x) => {
    let i = 0;
    while (i < xs.length - 2 && xs[i + 1] < x) i++;
    const a = xs[i], b = xs[i + 1], t = b > a ? (x - a) / (b - a) : 0;
    return hullEdge(a) + (hullEdge(b) - hullEdge(a)) * t;
  };
}

function area(world, parent, A, inst) {
  const g = new THREE.Group(); g.name = 'deckDetail:' + A.id;
  parent.add(g);
  world.markForBake(g);
  const D = geos(), top = A.y + BULWARK_H;
  const face = innerFace(A.x0, A.x1);
  const clear = (x, list, r) => !list.some((p) => Math.abs(x - p) < r);
  const kept = (x) => A.keep.some(([a, b]) => x > a && x < b);
  const yawAt = (x, s) => -s * Math.atan((face(x + 0.25) - face(x - 0.25)) / 0.5);
  // stations of the bulwark that carry a plate stay (see structure-decks bulwark()): keep the fittings off them
  const xs = stations(A.x0, A.x1, 1.5, 0.3), stays = xs.filter((x, i) => i < xs.length - 1 && hullEdge(x) > 1.2 && xs[i + 1] - x > 0.7);

  // ring bolts on the deck, 0.32 m inside the bulwark (inside the strip the walker cannot reach anyway)
  for (const s of [1, -1]) {
    for (let x = A.x0 + 1.3; x < A.x1 - 0.8; x += 2.3) {
      if (kept(x) || !clear(x, A.pipes, 0.8) || !clear(x, stays, 0.18) || face(x) < 1.6) continue;
      const m = mk(D.ring, mats.iron, x, A.y, s * (face(x) - 0.32));
      m.rotation.y = yawAt(x, s) + (s > 0 ? Math.PI : 0);
      g.add(m);
    }
    // horn cleats beside the mooring pipes
    for (const xp of A.pipes) for (const dx of [-0.85, 0.85]) {
      const x = xp + dx;
      if (face(x) < 1.6 || !clear(x, stays, 0.26) || !clear(x, A.rings || [], 0.62)) continue;
      const m = mk(D.cleat, mats.iron, x, A.y + 0.62, s * (face(x) - 0.001));
      m.rotation.y = yawAt(x, s) + (s > 0 ? Math.PI : 0);
      g.add(m);
    }
  }

  // rivet heads on the inner face: gunwale angle (top) and deck stringer angle (foot), staggered
  const R = rivetGeo(0.011);
  const q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), n = new THREE.Vector3();
  for (const s of [1, -1]) {
    for (const [y, ph, ports] of [[top - 0.08, 0, null], [A.y + 0.06, 0.07, A.ports || []]]) {
      for (let x = A.x0 + 0.12 + ph; x < A.x1 - 0.12; x += 0.14) {
        const e = face(x);
        if (e < 0.8 || (ports && !clear(x, ports, 0.6))) continue;
        const sl = (face(x + 0.1) - face(x - 0.1)) / 0.2;
        n.set(sl, 0, -s).normalize(); // inboard normal of the face line z = s * e(x)
        q.setFromUnitVectors(up, n);
        inst.at(R, mats.paintWhite, x, y, s * (e - 0.001), q);
      }
    }
  }
  // rivet rows round the hatch coamings (corner angles at the deck and under the batten cleats)
  const qz = [1, -1].map((s) => new THREE.Quaternion().setFromUnitVectors(up, new THREE.Vector3(0, 0, s)));
  const qx = [1, -1].map((s) => new THREE.Quaternion().setFromUnitVectors(up, new THREE.Vector3(s, 0, 0)));
  for (const [x0, x1, hw, h] of A.hatches || []) {
    for (const y of [A.y + 0.07, A.y + h - 0.36]) {
      for (const [k, s] of [[0, 1], [1, -1]]) {
        for (let x = x0 + 0.1; x < x1 - 0.05; x += 0.15) inst.at(R, mats.steelDark, x, y, s * hw, qz[k]);
        for (let z = -hw + 0.1; z < hw - 0.05; z += 0.15) inst.at(R, mats.steelDark, s > 0 ? x1 : x0, y, z, qx[k]);
      }
    }
  }
}

/** Patent (Walker) taffrail log: brass register on a bracket clamped to the poop rail, line streaming astern. */
function taffrailLog(world, parent) {
  const g = new THREE.Group(); g.name = 'deckDetail:taffrailLog';
  parent.add(g);
  world.markForBake(g);
  const x = -131.6, s = 1, e = plan(x), yc = B + BULWARK_H + 0.062; // on top of the teak capping, starboard quarter
  const z = s * (e - 0.06);
  const brass = merge([
    cylG([0.08, 0.1, 0], [-0.12, 0.1, 0], 0.045, 10),                 // register body
    cylG([-0.12, 0.1, 0], [-0.2, 0.1, 0], 0.02, 6, 0.012),           // rotator shaft end
    cylG([0.02, 0.145, 0], [0.02, 0.16, 0], 0.04, 10),               // dial bezel on top
  ]);
  const iron = merge([
    boxG(0.22, 0.02, 0.16, 0, 0.01, 0),                              // clamp plate on the capping
    boxG(0.04, 0.07, 0.04, 0, 0.045, 0),                             // swivel post
    boxG(0.12, 0.012, 0.06, 0, 0.056, 0),
  ]);
  for (const [geo, mat] of [[brass, mats.brass], [iron, mats.iron]]) {
    const m = mk(geo, mat, x, yc, z); m.rotation.y = -Math.atan((plan(x + 0.25) - plan(x - 0.25)) / 0.5) * s; g.add(m);
  }
  g.add(mk(new THREE.CircleGeometry(0.034, 10).rotateX(-Math.PI / 2), mats.porcelain, x + 0.02, yc + 0.161, z));
  // log line: from the register over the stern down to the sea, well astern
  const w = new Wires(mats.rope, false);
  w.sag(x - 0.2, yc + 0.1, z, SHIP.sternX - 38, SHIP.waterline, z + 6, 2.5, 10, 0.006);
  g.add(w.build('logLine'));
}

export function buildDetails(world, parent) {
  if (TIER.fine >= 1) taffrailLog(world, parent);
  if (TIER.fine >= 2) {
    // rivet heads: one instanced set per end of the ship (forecastle + forward well, after well + poop) and material,
    // each with its own box for the distance LOD of tiny instances
    for (const [name, ids] of [['fore', ['forecastle', 'wellFwd']], ['aft', ['wellAft', 'poop']]]) {
      const g = new THREE.Group(); g.name = 'deckRivets:' + name; parent.add(g);
      const inst = new Inst();
      for (const A of AREAS) if (ids.includes(A.id)) area(world, parent, A, inst);
      inst.build(g, 'deckRivets:' + name);
    }
  }
  return {};
}
