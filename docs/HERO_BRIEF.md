# Brief: hero rooms to AAA detail

Walkable, fully procedural 3D RMS Titanic (Three.js r170 + Vite). Everything is built, working and published.
A review against an AAA standard found: **the hand-built showpiece rooms are the weakest part** – e.g. the first-class
dining saloon still has boxy chairs and plain slab tables, flat walls and simple columns – while ordinary cabins
(built from the interior kit) now have properly modelled Edwardian furniture. Your job: rebuild the hero rooms of your
deck(s) to showpiece quality.

## Read first
`docs/CONTRACT.md`, `docs/KIT.md` (esp. the prop list, `def`/`PB` custom-prop builder, Batch helpers `sweep`/`fielded`/
`prism`, door options, wall styles with `relief`/`grand`, `ctx.attach()`, `DETAIL`, new kitMats, small props such as
picture/sign/notice/bookPile/carafe), `src/core/constants.js`, `src/core/world.js`, `src/core/materials.js` (PBR
materials with normal/roughness maps – use `mats.*`/`kitMats`, never per-mesh materials), then your deck files completely,
and skim `src/interior/props-furniture.js` / `props-decor.js` to see the modelling quality level to match or exceed.

## What to do
- For each hero room in your task: replace primitive stand-ins by properly modelled pieces. Prefer the kit's detailed
  props (chairs, tables with draped cloths and place settings, sofas, fireplaces, columns, palms, chandeliers, pianos,
  bookcases, sconces, …) and build room-specific signature pieces yourself at the same quality (lathe/extrude/sweep
  profiles, bevels, mouldings, 12–24 segments on round parts).
- Architecture: real relief instead of flat textured walls – raised-and-fielded panelling, pilasters with capitals,
  cornices, coffered/moulded ceilings with roses and ribs, arches, alcoves and bays, window surrounds with curtains or
  leaded glazing, door cases, floor borders/inlays, thresholds. Period styles as named in the task.
- Life: table settings, flowers, menus, books, newspapers, ashtrays, coats, instruments, luggage, crockery, tools – with
  seeded variation so repeated items are not identical clones in identical poses.
- Lighting hooks: ceiling fixtures/sconces/table lamps as real fixtures using `mats.lampGlow` + `world.addLamp` at
  sensible places (the renderer assigns real lights and shadows to the nearest lamps). No THREE.Light.
- Keep: room rectangles, doors, colliders/walkways, teleports, infos (texts may be improved), floors, stair wells,
  casings, lift shafts. Do not move walls or change reachability. Furniture colliders: keep aisles ≥ 0.9 m.
- Performance: repeated furniture as `THREE.InstancedMesh` (one per distinct geometry/material) – mandatory for anything
  repeated > 40×; static unique geometry through the normal Batch/merge path. Budget per hero room: ≤ ~250 000
  triangles in view (the 1st-class dining saloon ≤ ~400 000 because of ~500 chairs: give the chair ≤ 600 triangles),
  hero-light rooms ≤ ~60 000. Report measured numbers.
- Files: only your deck files listed in the task (hero/saloon/util helpers and, where needed for furnish hooks, the deck
  layout file). Do NOT touch `src/interior/*`, `src/core/*`, `src/app/*`, `src/exterior/*`, `src/environment/*`,
  `src/main.js` (other agents are working there right now). The staircase halls around the two Grand Staircases were
  just rebuilt by another agent (imperial stairs, columns framing the foot, lift fronts): leave those parts as they are.

## Verify (must pass)
- `node tools/smoke.mjs --all --bake` exits 0 (if it fails in a file that is not yours because another agent is
  mid-edit, retry later; use `node tools/smoke.mjs src/interior/stairs.js <your deck files> --bake` meanwhile).
- `node src/interior/check.mjs <deck> <deck file>` → all rooms reachable, 0 kit warnings.
- esbuild bundle check of your deck file(s) (see CONTRACT.md).
- LOOK at your rooms: no browser tools (others use the pane). Render views with a throw-away software rasteriser to PNG
  and inspect them with the Read tool – reusable scripts from earlier agents exist under `node_modules/.tmp/`
  (e.g. `imperial-render.mjs`, `kitdetail/`); copy and adapt one. Check each hero room from eye height (1.65 m) from
  the door and from the middle: proportions, nothing floating/intersecting, back-faces, seat heights (0.45 m), table
  heights (0.75 m), symmetry.

## Final report (concise)
Per hero room: what was rebuilt, triangles before/after, instancing used; check results; anything the lead should
look at in the browser (teleport names); known weak spots.
