# Brief: geometry audit – find and fix broken / incomplete models

Walkable, fully procedural 3D RMS Titanic (Three.js r170 + Vite), built and published. All models were authored
"blind" (no browser), and the user has now found visibly broken ones. Example (already fixed by the lead): the deck
chairs on the boat deck – the leg-rest rails were rotated the wrong way (rotateX sign error) so rails and slats
diverged, the arm rests floated in the air without touching the back or a leg, the "rug" was a box hovering over the
frame. The user asks: **find every other such incomplete or wrong geometry in your area and fix it.**

## Read first
`docs/CONTRACT.md`, `docs/KIT.md` (skim), `src/core/world.js` (skim), then ALL files of your area (listed in your task).

## What counts as a defect (look for all of these)
1. **Floating / disconnected parts**: a component of a model that touches neither another component of the same model
   nor the floor/wall/ceiling it should rest on (gap > ~1.5 cm): arms without supports, table tops above legs, handles
   beside doors, lamps below their chains, cushions hovering, shelves contents hovering, legs ending above the floor
   or sinking below it.
2. **Wrong rotations / mirrored parts**: members tilted the wrong way (sign errors in rotateX/Y/Z, atan2 argument order),
   parts facing backwards, left/right or front/back swapped, slats diverging from the rails that carry them, dials or
   lettering mirrored/upside-down/sideways (cylinder-cap UVs run along z/x!), doors hinged outside their frame.
3. **Inside-out / missing faces**: back-faces visible from where a visitor can stand (wrong winding, open shells such
   as lathe profiles that are not closed, frustums with a missing cap, mirrored geometry via negative scale), holes.
   Already reported and still open: the kit's `ceilingLight` styles 'bowl' and 'cut' (gilt ring / glass), chandelier
   stems, ceiling beams on G deck, handrail end caps on Scotland Road and stairs, stair stringers, exterior dome glass
   seen from inside, crow's nest, skylight gables, propeller tips.
4. **Interpenetration that reads as an error**: furniture through walls/columns/each other, the revolving-door canopy
   through the wall (A-deck smoking room), curtains through window frames, props sunk into floors, stacked items
   intersecting, railings through stairs.
5. **Wrong proportions / unrecognisable shapes**: seat height not ≈ 0.45 m, table ≈ 0.75 m, door handle ≈ 1.0 m,
   railing ≈ 1.05–1.1 m, bed ≈ 0.5–0.6 m; things far too big/small/thin/thick; primitive box stand-ins left over;
   figures that look like something else (the bronze cherub at the Grand Staircase foot currently looks like a teddy
   bear; the Honour-and-Glory figures; the Artemis statuette).
6. **Z-fighting / coplanar duplicates**, doubled objects at the same place, gaps between wall panels, panelling that
   does not reach floor/ceiling, mouldings that stop short of corners.

## Method (mandatory – do not just read code)
- Build an **automated audit** as a throw-away node script under `node_modules/.tmp/audit-<yourname>/` (DOM stub as in
  `tools/smoke.mjs`): for every prop/model builder in your area, build it standalone and (a) split its triangles into
  connected components (weld vertices at 1 mm; additionally treat components whose bounding boxes overlap or touch
  within 1.5 cm as connected), then flag every component cluster that touches neither the main cluster nor the ground
  plane/its mounting surface; (b) flag bounding boxes far from the declared footprint (`userData.fp`) or below y = 0;
  (c) flag meshes with negative determinant, non-closed lathe profiles where the open end is visible, and triangles
  whose normals point towards the model centroid for convex-ish parts (heuristic for inside-out). For room-level
  content, run the same floating-component test per room on the baked room geometry (exclude things that are meant
  to hang: mark the ceiling and walls as mounting surfaces).
- **Look at everything**: render each prop/model and each hero room with a software rasteriser to PNG and inspect the
  images with the Read tool. Reusable renderers from earlier agents exist under `node_modules/.tmp/` (e.g.
  `kitdetail/`, `imperial-render.mjs`, `heroAB/v.mjs`, `bc/view.mjs`, `dhero/view.mjs`, `fg/`, exterior `render.mjs`):
  copy and adapt one; paint back-faces magenta; render each model from 2–3 angles (front-quarter, side, top) on contact
  sheets (many props per image) so the whole area can be reviewed in a reasonable number of images. Judge critically
  like a QA artist: would a visitor notice this as broken or silly?
- Fix every defect at its source. Keep footprints, colliders, room layouts, doors, floors, ramps, teleports, info
  points and public APIs unchanged; keep shared `mats.*`/`kitMats`; keep instancing; do not blow up triangle counts
  (± 10 % per model unless a stand-in must be replaced).
- Do NOT use browser tools (the lead uses the browser). Do not touch files outside your area; if you find a defect
  whose source is outside your area, list it precisely (file, function, what is wrong) in your report.

## Verify
`node tools/smoke.mjs --all --bake` exits 0; `node src/interior/check.mjs <deck> <file>` for decks whose files you
changed → all rooms reachable, 0 kit warnings; esbuild bundle of `src/main.js`
(`npx esbuild src/main.js --bundle --format=esm --outfile=node_modules/.tmp/audit-<yourname>/app.js --log-level=warning`).
Re-run your automated audit afterwards and report remaining flags with a reason for each.

## Final report (concise)
Table of defects found → fix (model, what was wrong, how fixed); counts (models audited / defective / fixed);
remaining known issues and why; defects outside your area for the lead.
