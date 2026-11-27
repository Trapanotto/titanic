// Shared state of the main engines: set by the engine-order telegraph on the bridge (app/interact.js), read by the
// animated machinery (tank top), the propellers, the funnel smoke and the sound.
export const ORDERS = [
  { name: 'Stopp', f: 0, dial: 4 },
  { name: 'Langsame Fahrt voraus', f: 0.35, dial: 2 },
  { name: 'Halbe Fahrt voraus', f: 0.65, dial: 1 },
  { name: 'Volle Fahrt voraus', f: 1, dial: 0 },
];

export const ENGINE = {
  steam: 0, // 0..1: steam blowing off at the funnels (after the collision)
  order: 3,   // index into ORDERS
  speed: 1,   // 0..1, follows the order slowly (the engines take a while)
  phase: 0,   // integral of speed over time (s): animators use it instead of the clock
  helm: 0,    // wheel on the bridge: -1 hard to port .. +1 hard to starboard
  rudder: 0,  // rudder angle as a fraction of hard over, follows the helm
};

/** Advance the engines by dt seconds. */
export function stepEngine(dt) {
  const target = ORDERS[ENGINE.order].f;
  ENGINE.speed += (target - ENGINE.speed) * (1 - Math.exp(-dt / 3.5));
  if (Math.abs(target - ENGINE.speed) < 0.002) ENGINE.speed = target;
  ENGINE.phase += dt * ENGINE.speed;
  const dr = ENGINE.helm - ENGINE.rudder;
  ENGINE.rudder += Math.sign(dr) * Math.min(Math.abs(dr), dt * 0.22); // hard over in about 4.5 s
}
