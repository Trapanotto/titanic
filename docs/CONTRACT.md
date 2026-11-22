# Titanic 3D – module contract

Walkable RMS Titanic in the browser. Three.js (npm `three` r170, import addons from `three/addons/...`), Vite, plain ES modules, no other dependencies, **no external assets** (everything procedural: geometry + canvas textures). All user-facing text is **German**.

## Coordinates
Metres. `+x` = bow, `+y` = up, `+z` = starboard. Origin = midship / keel / centreline. Sea surface at `y = 10.5`.
All dimensions, deck heights, hull shape, deck houses, funnels, casings, stairs and exterior doors are defined in
`src/core/constants.js`. **Read it completely first and never hard-code a number that exists there.**

## Core files (read-only for module agents – do not edit)
- `src/core/constants.js` – layout contract (`DECK_Y`, `hullHalfWidth(x,y)`, `DECK_SEGMENTS`, `STAIRS`, `CASINGS`, `EXT_DOORS`, ...).
- `src/core/world.js` – `World` registry (below).
- `src/core/materials.js` – `mats` shared material library, `canvasTexture()`.
- `src/core/geo.js` – `box`, `boxBetween`, `slab`, `rod`, `tiledBoxGeometry`, `scaleUV` (UVs in metres).
- `src/modules.js` – list of modules and build order.

If you really need something changed in a core file, do NOT edit it; work around it locally and mention it in your final report.

## Module shape
```js
export async function build(world) {   // world: World
  ...add objects, colliders, floors, teleports, infos...
  return { update(dt, t) {} };          // optional
}
```
Each module only writes files inside its own folder/file(s) given in its task.

## World API
- `world.scene`, `world.exterior` (Group for everything outside), `world.zone(deck, x)` → Group for interior content of
  deck `deck` near station `x` (24 m zones, automatically culled by camera distance/height and merged). Put every interior
  mesh into the zone of its own x position (use the room centre). Positions are world coordinates (zone groups sit at the origin).
- `world.markForBake(group)` – exterior groups whose static meshes should be merged.
- `world.addCollider(x0,y0,z0,x1,y1,z1)` – solid axis-aligned box. `world.addColliderFor(object, pad)`.
  Player is a cylinder r = 0.3 m, 1.7 m tall; obstacles lower than 0.45 m are stepped over. Door openings must be ≥ 0.9 m wide clear.
- `world.addFloor({y, x0, x1, z0, z1, clip})` – walkable surface; `clip: x => halfWidth` for hull-shaped decks.
  A walker falls if there is no floor → every walkable area needs a floor, every edge needs a railing/wall collider.
- `world.addRamp({x0,x1,z0,z1,y0,y1,axis})` – stairs: height `y0` at `x0` → `y1` at `x1` (axis `'x'`), or along z.
  A ramp is used only if its height is within 0.75 m of the walker's feet, so walking under a stair works; block the
  low-headroom part under it with a collider.
- `world.addTeleport({name, deck, x, z, yaw, group})` – destination for the deck plan (yaw 0 = facing bow).
- `world.addInfo({title, text, x, y, z, radius})` – historical info point (German, 2–4 sentences, factual).
- `world.addLamp({x,y,z,color,intensity})` – position of a light fixture. Real point lights are a small pool owned by the
  environment module and jump to the lamps nearest to the camera. **Never create THREE.Light objects in deck/interior modules.**
- `world.onUpdate(fn(dt,t))`, `world.onTimeChange(fn(night))`, `world.state = {night, inside, deck, mode}`.

## Performance rules (hard)
- Static meshes are merged per zone **per material** → always use the shared `mats.*` materials; create a new material
  only when unavoidable, once at module level (never per mesh), and reuse it.
- Reuse geometries (cache by size; `box()` already does). Keep props low-poly: cylinders 6–10 segments, spheres ≤ 8×6.
  Budget: standard cabin ≤ ~1 500 triangles incl. furniture, hero room ≤ ~60 000, one deck ≤ ~1.5 M.
- Meshes that move/animate or must stay separate: `mesh.userData.noMerge = true`.
- For something repeated > 200× identically (rivets, balusters, chairs in the dining saloon) prefer `THREE.InstancedMesh`.
- No per-frame allocations, no raycasts against scene meshes, no textures > 1024², no shadow-casting on small props
  (`castShadow` only on large exterior parts).
- Transparent glass: `mats.glass`. Windows seen from outside that should glow at night: `mats.windowLit`.

## Ownership of surfaces
- **Exterior module** owns everything visible from outside and all open decks: hull shell, outer walls of the B-deck
  enclosure, of the A-deck house and of the boat-deck houses (with the door openings from `EXT_DOORS`, real openings +
  colliders either side), the well-deck bulkheads at x = 78, 94, −90, −106, roofs, open-deck planking + `addFloor`,
  railings + colliders, exterior stairs between open decks, funnels, masts, boats, deck gear. Outer walls are solid slabs
  (0.12–0.2 m thick, inner face painted white) so interiors need no extra lining on decks boat/A/B.
- **Interior kit** (`src/interior/`) owns floors, ceilings, inner hull lining (decks C and below, where the hull is curved),
  casings, all `STAIRS` (geometry, ramps, floor holes, railings around holes) and the room/prop library.
- **Deck modules** (`src/decks/*.js`) own the room layout and furnishing of one deck, built with the kit.

## Visual target
Maximum detail within the budget: correct proportions, period-correct (1912, Edwardian) look. First class: carved oak /
mahogany panelling, gilt, patterned carpets and lino tiles; second class: oak, simpler; third class: white-painted pine,
steel, red lino; crew/machinery: riveted steel, pipes, gauges.

## App-provided fields
The app sets `world.renderer` (WebGLRenderer) and `world.camera` (PerspectiveCamera) before modules are built.
Modules must tolerate `world.renderer == null` (headless smoke test).

## Verifying your work (no browser – the lead does the visual check)
- Headless smoke test: `node tools/smoke.mjs <your module file(s)> [--bake]` – builds the modules into a World with a
  stubbed DOM and prints mesh/triangle/collider counts, per-deck statistics and teleport sanity checks. Must exit 0.
  You may list several modules (e.g. `src/interior/stairs.js src/decks/d.js`). `--all` builds everything in `src/modules.js`.
- Bundle check: `npx esbuild <file> --bundle --format=esm --outfile=node_modules/.tmp/<yourname>.js --log-level=warning`.
- Do not start dev servers and do not use browser tools. Do not run `npm install` / add dependencies.

## Yaw convention (teleports)
yaw 0 faces the bow (+x); positive yaw turns to PORT (like three's rotation.y). Forward = (cos yaw, 0, −sin yaw):
`Math.PI/2` faces −z (port), `-Math.PI/2` faces +z (starboard), `Math.PI` faces the stern.
Info-point titles must be unique (discovered state is keyed by title).

## Facts from the finished exterior module (for deck modules)
- Outer walls of the B enclosure, A house and boat-deck houses are 0.15 m thick, growing INWARD from the nominal line
  (A house inner face at |z| = 10.15, x −65.85..69.85; boat houses likewise). Interior floors/rooms start at the inner face.
- The exterior adds NO floors inside the A house / boat-deck houses / B enclosure – the interior kit does.
- Boat-house roof slabs have openings under the two glass domes: x 39.2..44.8, |z| ≤ 3.2 and x −5..0.2, |z| ≤ 2.8.
  Leave the interior ceiling open there so the dome is visible from the staircases.
- Bridge (boat deck x 66..73) has large unglazed side openings; wing cabs at x 67.6..70.4, |z| 10.4..12.1.
