// Generates the shared library's procedural surfaces off the main thread (the app keeps building the ship meanwhile).
import { setRawSurfaces } from './tex.js';
import { makeSurface } from './tex-lib.js';

setRawSurfaces(true);
self.onmessage = (e) => {
  const { names, maxSize } = e.data;
  for (const k of names) {
    try {
      const r = makeSurface(k, maxSize);
      self.postMessage({ k, r }, [r.A?.buffer, r.N?.buffer, r.O?.buffer].filter(Boolean));
    } catch (err) {
      self.postMessage({ k, error: String(err?.message || err) });
    }
  }
};
