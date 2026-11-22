import { buildFunnels } from './fit-funnels.js';
import { buildMasts } from './fit-masts.js';
import { buildBoats } from './fit-boats.js';
import { buildGear } from './fit-gear.js';
import { buildDeckMachinery } from './fit-decks.js';
import { buildStern } from './fit-stern.js';

// Exterior FITTINGS: funnels, masts + rigging + flags, lifeboats under Welin davits, deck gear,
// forecastle / well-deck / poop machinery, propellers and rudder.
// (Hull, decks, railings, walls and exterior stairs live in index.js / structure-*.js.)

export async function build(world) {
  const parent = world.exterior;
  const parts = [buildFunnels, buildMasts, buildBoats, buildGear, buildDeckMachinery, buildStern].map((fn) => fn(world, parent));
  const updaters = parts.map((p) => p && p.update).filter(Boolean);
  return {
    update(dt, t) { for (const u of updaters) u(dt, t); },
  };
}
