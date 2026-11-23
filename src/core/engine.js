// Shared state of the main engines: set by the engine-order telegraph on the bridge (app/interact.js), read by the
// animated machinery (tank top), the propellers, the funnel smoke and the sound.
export const ORDERS = [
  { name: 'Stopp', f: 0, dial: 4 },
  { name: 'Langsame Fahrt voraus', f: 0.35, dial: 2 },
  { name: 'Halbe Fahrt voraus', f: 0.65, dial: 1 },
  { name: 'Volle Fahrt voraus', f: 1, dial: 0 },
];

export const ENGINE = {
  order: 3,   // index into ORDERS
  speed: 1,   // 0..1, follows the order slowly (the engines take a while)
  phase: 0,   // integral of speed over time (s): animators use it instead of the clock
};

/** Advance the engines by dt seconds. */
export function stepEngine(dt) {
  const target = ORDERS[ENGINE.order].f;
  ENGINE.speed += (target - ENGINE.speed) * (1 - Math.exp(-dt / 3.5));
  if (Math.abs(target - ENGINE.speed) < 0.002) ENGINE.speed = target;
  ENGINE.phase += dt * ENGINE.speed;
}
