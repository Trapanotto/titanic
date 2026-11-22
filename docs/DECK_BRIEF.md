# Brief for deck modules

You furnish complete decks of a walkable 3D RMS Titanic (Three.js r170 + Vite, fully procedural). The user asked for
**the complete ship, every single room, maximum detail**. Your deck(s) must therefore be covered wall to wall with rooms:
no empty, unassigned floor area anywhere inside the deck's `DECK_SEGMENTS` – every square metre is a named room,
a corridor, a stair lobby, a casing or (rarely) a locked store. Follow the real 1912 deck plan as closely as you
remember it (room types, their order along the ship, port/starboard placement, class areas, cabin numbering scheme),
adapted to this model's simplified dimensions.

## Read first (completely)
1. `docs/CONTRACT.md` – coordinates, World API, performance rules, ownership, yaw convention, verification.
2. `src/core/constants.js` – all dimensions. Never hard-code what is defined there.
3. `docs/KIT.md` – the interior kit you must use (`src/interior/kit.js`): `buildDeckShell`, `createDeckPlan`
   (rooms, corridors, cabin rows, doors, furnishing presets), props, `bulkhead`, reachability checker.
4. `src/decks/_example.js` – a working example.
Skim `src/interior/rooms.js`, `presets.js`, `props.js` when you need details. Core files and `src/interior/` are read-only.

## Rules
- You only write your own deck file(s) `src/decks/<id>.js` (replace the stub; `export async function build(world)`) and
  optional helpers `src/decks/<id>-*.js`. Nothing else.
- Call `buildDeckShell` exactly once per deck and `plan.finish()` exactly once per deck.
- Ordinary rooms: data-driven through the kit with presets. Hero rooms (listed in your task): hand-detail them with a
  custom `furnish` function and kit props plus your own geometry (panelling, columns, ceilings, fireplaces, signature
  furniture), ≤ ~60 000 triangles each, shared `mats.*` / `kitMats` only, InstancedMesh for anything repeated > 200×.
- Every room must be reachable on foot: door → corridor → staircase from `STAIRS` (or an `EXT_DOORS` door). Keep stair
  keep-outs and casings clear (`stairs: true` lobbies; `casing: true` for saloons containing a casing). Lobbies must give
  access to BOTH x-ends of each staircase (flights alternate ends deck by deck).
- Doors ≥ 0.9 m clear. Shared room edges must match to 1 cm.
- Vertical consistency is given by constants (stairs, casings); do not invent extra floor openings.
- Add `world.addTeleport` (via the plan's `teleport` option) for every notable room (group = class or area, German
  names, e.g. 'Speisesaal 1. Klasse') and one per corridor section so the deck plan is useful: 8–25 per deck.
- Add `world.addInfo` (plan `info` option) with factual German texts (2–4 sentences, unique titles) for every hero room and
  other historically interesting places: 6–15 per deck.
- German for all names shown to the user; room `name`s in German too.
- No THREE.Light; lamps through the kit / `world.addLamp`.
- Triangle budget per deck ≤ ~1.5 M before bake (check the smoke test's per-deck table), aim well below.

## Verify (must all pass before you report)
- `node tools/smoke.mjs src/interior/stairs.js <your files> --bake` → exit 0; no `[kit …]` warnings that you can fix.
- `node src/interior/check.mjs <deck> <your files>` → all rooms reachable.
- `npx esbuild <your file> --bundle --format=esm --outfile=node_modules/.tmp/<id>.js --log-level=warning` clean.
- No dev server, no browser tools (the lead does the visual check), no npm installs.

## Final report (concise)
Files; room count by type; triangles; hero rooms built; teleports/infos count; kit warnings left and why; deviations
from the historical plan; anything the lead must fix in other modules.
