# Interior kit (`src/interior/`) – API reference for deck modules

Import everything from **`src/interior/kit.js`**:

```js
import { buildDeckShell, bulkhead, createDeckPlan, stairKeepouts, bedFirst, place /* … */ } from '../interior/kit.js';
```

A deck module is: **one `buildDeckShell` call** (floor, ceiling, hull lining, casings) + **one `createDeckPlan`** filled with
data (`room`, `corridor`, `cabinRow`, `wall`, `opening`) + `plan.finish()` + a few hand-detailed hero rooms
(`furnish: (ctx) => {…}` or `plan.prop(...)`). The stairs already exist (module `src/interior/stairs.js`, built before the decks).
Working example: `src/decks/_example.js` (60 m of E deck, 56 rooms, ~64 000 triangles).

Files: `kit.js` (entry) · `shell.js` · `rooms.js` · `presets.js` · `props.js` (entry of the prop library: `props-core.js`
builder / registry / sub-assemblies, `props-furniture.js`, `props-decor.js`, `props-tech.js`) · `geom.js` (geometry generators:
bevel boxes, lathes, modulated revolves, cushions, tufting, lofts, drapes, curtains, fronds) · `stairs.js` · `batch.js` (geometry
batching incl. mouldings / raised panels / prisms, extra materials, colour atlas, outline helpers) · `check.js` / `check.mjs` (reachability).

---------------------------------------------------------------------------------------------------------

## 1. Conventions

- World coordinates everywhere, metres. `+x` bow, `+z` starboard, `y` up. Deck floor `y = DECK_Y[deck]`.
- **Sides of a room** (rectangle `x0..x1`, `z0..z1`):

  | side | wall | plan view |
  |---|---|---|
  | `'fwd'`  | at `x = x1` (towards the bow) | runs along z |
  | `'aft'`  | at `x = x0` (towards the stern) | runs along z |
  | `'port'` | at `z = z0` (−z) | runs along x |
  | `'stbd'` | at `z = z1` (+z) | runs along x |

- A door's `at` is the **world coordinate of the door centre along its wall** (z for `fwd`/`aft` walls, x for `port`/`stbd` walls).
- Walls are 0.10 m thick, centred on the room edge. Clear room height = `ceilingY(deck) − DECK_Y[deck]`:
  orlop/G/F 2.4 m · E 2.5 · D/C/B/boat 2.6 · A 2.7. Doors are 0.9 × 2.0 m by default.
- `deckHalfWidth(deck, x)` = inner half width at floor level (inner face of hull lining on tank…C; exterior wall inner face
  on B/A/boat; 0 where the deck has no interior). The hull lining is **vertical** per deck (it stands at the floor-level
  hull width − 0.15 m), so every room is a clean box. `minHalfWidth(deck, x0, x1)` gives the minimum over a range.
- Materials: pass a name (`'carpetRed'`) or a `THREE.Material`. Names = keys of `mats` (core) and `kitMats` (kit) plus the
  aliases `tile`→tileWhite, `steelPlate`→steelFloor, `wood`→deckWood, `white`, `cream`, `grey`, `green`, `carpet`, `lino`.
  **Never create materials per mesh.** Extra kit materials (`kitMats.*`): `plate, ironwork, portGlass, blanketWS, books,
  crockery, bottles, clockFace, gaugeFace, switchboard, honour, damaskRed/Green/Blue/Gold, tileBlue, cane, trellis, bronze,
  slate, water, redLead` and (new) `atlas` (8 × 8 colour atlas for small coloured items – cells in `AT`/`ATLAS` of batch.js,
  cells 0–15 are book cloths with gilt bands), `crystal` (chandelier drops), `cutGlass` (lit cut-glass bowls, brighter at
  night), `fireRed`, `ebony`, `ivy` (double sided), `stencil` (crate sides), `notice`, `chart`, `keys` (piano keyboard),
  `louvre` (door / locker vents), `paintings` (2 × 2 oil paintings), `signs` (4 enamel direction signs).
- Everything the kit builds lands in `world.zone(deck, x)` automatically.

---------------------------------------------------------------------------------------------------------

## 2. Stairs (already built) – what a deck layout must respect

`src/interior/stairs.js` builds every entry of `STAIRS`: steps, balustrades, ramps, colliders, railings round every floor
hole, lamps. Two layouts:

- **Scissor** (oak / steel stairs): steps, enclosed underside (panelled closure walls, so the lane of a flight that **rises**
  from your deck is a solid block `x0..x1` × lane), railings on three sides of every floor hole, lamps above both landings. On
  each deck one lane is the hole of the flight arriving from below, the other lane holds the flight going up; people step
  off / on at the **same x-end** and U-turn there.
- **Imperial / split** (`type: 'imperial'` – the two Grand Staircases): per deck interval a wide **central flight** starts
  on the lower deck at the foot line `x1` and climbs aft to a **half-landing** (x0 .. x0 + landing, full width, at half the
  deck rise) against a panelled **pier** (`back`..x0) carrying the clock / paintings; two **side flights** return forward and
  arrive on the upper deck on the same foot line `x1`, where the next central flight starts. The whole footprint
  `x0..x1 × |z−zc| ≤ lane−0.08` is stacked identically on every deck and is the floor hole (`stairHoles`) of every deck but
  the lowest; all stepping on/off happens at the **forward edge x1**. Long sides: full-height panelled walls beside the
  landing bay, galleries with iron balustrades beside the flights (colliders the whole way up); on the top deck a balustrade
  also closes the head of the central flight. Undersides are open (plaster soffits, moulded oak strings, downstand beams
  round the well); on the lowest deck the space under the landing and the side flights is a panelled closet with arched
  doors. Geometry: `imperialPlan(st)` → `{back, x0, xl (landing front), xf (= x1, foot), hw (= lane), hwi (well), cw
  (central half width), g (slot between central and side flights), gc, zc}`.

  | stair | pier | landing | flights | central | side flights | foot / hall in front |
  |---|---|---|---|---|---|---|
  | grandFwd (E…boat) | 37.5..38.3 | 38.3..40.1 | 40.1..42.2 (8 risers per half, going 0.30) | \|z\| ≤ 1.1 | 1.3 ≤ \|z\| ≤ 2.62 | x 42.2; lifts at 45.5 (3.2 m hall) |
  | grandAft (C…boat) | −6.5..−5.8 | −5.8..−4.2 | −4.2..−2.1 | \|z\| ≤ 0.85 | 1.05 ≤ \|z\| ≤ 2.22 | x −2.1; hall to x 2 |

  Landing art: forward stair – oil paintings (E→D, C→B, B→A), the Aubusson tapestry of the Reception Room on D→C (drawn by
  `d-hero.js` on the pier face x = 38.3), "Honour and Glory crowning Time" (1.6 m relief, two winged figures ≈ 1.1 m, clock,
  laurel wreath, pediment) on A→boat with an info point; aft stair – paintings and a carved clock panel on A→boat. Bronze
  cherub (≈ 0.76 m figure, torch lamp) on the port newel at the foot of the central flight on A (both stairs) and on D
  (forward stair), gilt three-light newel lamps on the other foot newels, an 8-arm chandelier (×1.5) hanging from the dome
  over the well on the boat deck. Teleports of the stair halls stand ~3 m forward of the foot, facing aft (yaw π).
| helper | returns |
|---|---|
| `stairHoles(deck)` | `[{id,x0,x1,z0,z1}]` openings in the floor of `deck` (scissor: flights arriving from below; imperial: the whole well; on F also `MACHINERY_ACCESS`) – already cut out by `buildDeckShell` |
| `stairSolids(deck)` | scissor: lane rectangles of the flights rising from `deck` (enclosed, not walkable); imperial: the well above `deck` (no lamps / ceiling overlay there) |
| `stairKeepouts(deck)` | `[{id,x0,x1,z0,z1}]` = scissor: both lanes, +2 m in x, +0.3 m in z; imperial: the entry `keep` (unchanged old rectangles). **No walls, no furniture inside.** |
| `stairLandings(deck)` | `[{id,x,z}]` free points 1 m before both ends of every scissor stair / 1 m in front of the foot of an imperial one |
| `assertClear(deck, rect, label)` | `true` if rect is clear of all keep-outs, else `console.warn` + `false` |
| `stairFlights()` | all flights: scissor `type:'scissor'` (`from,to,xb,xt,dir,z0,z1,zo,zc,y0,y1`), imperial one entry per deck interval `type:'imperial'` (`from,to,y0,ym,y1` + `imperialPlan` fields) |
| `imperialPlan(st)`, `isImperial(st)` | plan geometry of an imperial stair (see above) |

Keep-outs per stair (x-range × |z| ≤): grandFwd 37.5..46.5 × 2.7 (E…boat) · grandAft −7..2 × 2.3 (C…boat) · second
−47.5..−38.5 × 1.9 (F…boat) · secondAft −68..−59 × 1.8 (F…B) · thirdFwd 95..104 × 1.6 (G…C) · thirdAft −116..−107 × 1.6
(G…C) · holdFwd 68..76.5 × 1.4 (orlop, G) · holdAft −78.5..−70 × 1.4 (orlop, G).
On **F deck** the two `MACHINERY_ACCESS` openings have a pipe railing on three sides and are **open at their +x end**
(`MACHINERY_ACCESS_OPEN_END`); the tank module's stair must arrive there. Their keep-out: rect +0.4 m, +1.6 m at the +x end.

A stair lobby is a room with **`stairs: true`** that contains the keep-out (see example). Rooms may *touch* a keep-out edge.
The lobby must be reachable from the corridors at **both** x-ends of the stair or at least at the end where people step
off on your deck (both ends are used alternately deck by deck – simplest: let the lobby span the whole keep-out and
have ≥ 1.2 m free floor beside the lanes, i.e. lobby half width ≥ lane + 1.5 m, or open it at both ends).

Grand staircase extras (built by the kit): oak treads with moulded nosing, brass edge strip, red runner with brass stair rods; moulded oak strings with gilt bead; carved oak newels with gilt rosettes and pineapple finials; sweeping oak handrail; wrought-iron scroll panels with gilt rosettes (shared template placed with shear matrices along the pitch); panelled landing bays with pilasters, dado, cornice and sconces; see the imperial notes above. Oak stairs (2nd class): turned balusters (~7 per metre), panelled newels with ball caps, oak handrail;
steel stairs: chequer treads with angle nosings, pipe rails with stanchions and ball knuckles. A glazed dome prop
`domeLight({r})` is available for the boat-deck ceiling above the stairs (deck module `boat`).

---------------------------------------------------------------------------------------------------------

## 3. `buildDeckShell(world, deck, opts)` → `{ y, ceil, height }`

Builds for every segment of the deck (boat deck: the three `BOAT_HOUSES`; A: `A_HOUSE`; B: full hull width; tank…C: hull shaped):
floor with the stair holes cut out + `world.addFloor` (hull-clipped), ceiling with holes above the rising flights, on
tank…C the inner hull lining with portholes (F, E, D, C by default) and stair-stepped colliders, end bulkheads at the true
segment ends (not at C-deck x = 78, 94, −90, −106 – exterior), and the `CASINGS` (F…A, boat houses) as solid blocks with colliders.
Call it once per deck (or several times with disjoint x-ranges).

| option | default | meaning |
|---|---|---|
| `x0`, `x1` | whole deck | restrict to an x-range |
| `floor` | per deck: tank/orlop `steelFloor`, G/F/E `linoRed`, D `linoCream`, C `linoBlue`, B `carpetRed`, A/boat `linoCream` | base floor material; `false` = no floor mesh |
| `floors` | `[]` | `[{x0,x1,z0?,z1?,mat}]` regions with another floor material (later entries win). Cheaper than room overlays for big areas |
| `walk` | `true` | `false` = do not register `addFloor` |
| `ceiling` | tank/orlop `'steel'`, G/F/E `'white'`, D/C/boat `'panel'`, B/A `'plaster'` | `'steel'` (steel + beams) · `'white'` (painted + beams) · `'panel'` · `'plaster'` · material/name · `false` |
| `beams` | 2.4 m for `'steel'`/`'white'` | beam pitch in m, `false` = none (beams are 0.14 m deep) |
| `lining` | tank/orlop `steel`, G/F `paintWhite`, E/D/C `whitePanel` | hull-lining material, `false` = no lining mesh (colliders stay) |
| `portholes` | on when deck is above the waterline (F, E, D, C) | `false` · `true` (force) · `{pitch: 2.7, phase: 1.35, y: 1.65, r: 0.2}` – portholes at `x = phase + k·pitch`: brass rim, glass, four dogs and the deadlight hinged up on its hook (prop `porthole`); positions are registered in `world._kitPorts[deck]` (`{x, y, z, n, r}`) for the cabin curtains |
| `ends` | `true` | `false` · `{aft, fwd}` · `true` on a side that is not a segment end forces a bulkhead there (sub-range builds) |
| `casings` | `true` (`whitePanel`; F/E `paintWhite`) | `false` or a material |
| `height` | `ceilingY(deck) − DECK_Y[deck]` | clear height; for the tank top e.g. `{x0: 66, x1: 108, height: DECK_Y.orlop − SLAB − DECK_Y.tank}` |
| `flare` | `true` if height > 3.2 m | lining follows the real hull flare in 2.6 m bands (tall machinery spaces) |
| `holes` / `ceilingHoles` | automatic | `holes:false` = no floor holes; `ceilingHoles:[rects]` to override |
| `collide` | `true` | hull-lining colliders |

`bulkhead(world, deck, x, { doors: [{z, w = 1.0, h = 1.9}], y0, y1, mat = 'steel', wt = true, thickness = 0.1, collide = true })`
– transverse steel bulkhead across the full hull width at station `x` with door openings, colliders and (with `wt`) a
watertight door frame, sill (0.12 m, can be stepped over) and a raised sliding door plate. Works on every deck and for tall
spaces (`y1`). If a room wall would coincide with it, give that room `walls` without that side.

---------------------------------------------------------------------------------------------------------

## 4. `createDeckPlan(world, deck, defaults)` → plan

`defaults`: `{ wall: 'whitePanel', floor: null, lamp: true, doorW: 0.9, doorH: 2.0, lampPitch: 6, height }`.
Nothing is built until **`plan.finish()`** (call it exactly once, at the end).

### 4.1 `plan.room(spec)` → room record (or `null` if completely outside the hull)

| field | default | meaning |
|---|---|---|
| `id`, `name` | auto | id must be unique per deck (it seeds the furniture variation); `name` is German and user-visible |
| `type` | `'room'` | free tag (`'cabin'`, `'corridor'`, `'lobby'`, `'crew'`, …) stored in `world.rooms` |
| `x0,x1,z0,z1` | – | rectangle (wall centre lines). May extend beyond the hull (e.g. `z1: 99`) – it is clipped |
| `wall` | plan default | wall style name, `{ base, …overrides }`, or a material (see 4.5) – used for the faces on this room's side |
| `floor` | plan default | floor overlay material (5 mm above the deck floor); `null` = keep the shell floor |
| `ceiling` | – | optional ceiling overlay material |
| `walls` | all four | `'none'` or a list of sides this room builds. Shared edges are built once whoever owns them |
| `open` | `[]` | sides (list) that are forced open over the whole edge, even if the neighbour owns a wall |
| `doors` | `[]` | `[{ side, at, w = 0.9, h = 2.0, leaf = true, open = 95 (degrees; 0 = closed + collider), hinge: 'lo'|'hi', style: 'oak'|'mahogany'|'white'|'pine'|'steel'|'grey'|'green', frame, label }]` |
| `furnish` | none | preset name, `{ preset, …options }`, or `function (ctx)` (see 5) |
| `lamp` | `true` | `false`, or fixture style `'dome'|'bowl'|'bulkhead'|'cut'|'bare'|'chandelier'`; one per ~`lampPitch` (6 m) in both directions, each registers `world.addLamp` |
| `facing` | door side | side used as the "door wall" for furnishing if the room has no own door |
| `stairs` | `false` | `true` = room may contain stair keep-outs (lobby); floor overlay gets the holes, furniture avoids the keep-out |
| `casing` | `false` | `true` = room may contain a casing (big saloons); furniture and lamps avoid it |
| `teleport` | – | `true` or `{ name, group, x, z, yaw }` → `world.addTeleport` at a free spot just inside the main door |
| `info` | – | `{ title, text, radius, x, z }` → `world.addInfo` (German, 2–4 factual sentences) |
| `noAccess` | `false` | deliberately closed room (ignored by the reachability check) |
| `berths`, `cls`, `group` | – | passed to presets / teleport group |

A door is cut into whatever wall exists on that edge, so **either** neighbour may declare it (declare it once). The leaf
swings into the declaring room and stands open; number plates (`label`, characters 0-9 A-Z, on a brass backing plate) are
mounted above the door on the other side. Every door gets a moulded architrave with plinth blocks on both faces (square
steel frame for steel / grey doors), a lining in the opening (the clear width is unchanged) and a steppable threshold strip
(brass in grand styles, oak / steel otherwise). The leaf is panelled on both faces (4–6 raised panels; pine: boarded;
steel: braced plate) with brass knob, rose and hinges. Variants chosen automatically: doors of rooms of `type: 'cabin'`
get a ventilation louvre in the lower panels; doors of public rooms (`type` lobby / public / saloon / restaurant / cafe /
promenade / suite / gym / sport) in oak, mahogany or white are glazed; doors ≥ 1.25 m wide get two leaves (one per jamb).
Door options (new, optional): `glazed: true|false`, `double: false`. Doors narrower than 0.9 m, doors on a missing wall / wall end, rooms overlapping a stair keep-out or a casing
and rooms outside the deck segments are reported with `console.warn('[kit <deck>] …')` and collected in `plan.problems`
and `world.kitProblems` (the room is still built – fix the data).

Every room is registered: `world.rooms.push({ id, name, deck, type, cls, x0, x1, z0, z1, safe, noAccess })`.

### 4.2 `plan.corridor(spec)`

A room with `type: 'corridor'`, **`walls: 'none'`** and no furniture: the adjoining rooms provide the walls, the corridor
provides the wall *style of its side*, the floor overlay and lamps every ~6 m. Extra option `handrail: true` (oak rail at
0.9 m on all corridor-side wall faces, interrupted at doors). Where a corridor ends at nothing, give it `walls: ['fwd']` etc.
Corridors that meet simply overlap or touch – no wall appears between rooms that do not own that edge.

### 4.3 `plan.cabinRow(spec)` → array of rooms

```js
plan.cabinRow({ x0, x1, z0, z1, count | pitch, corridorSide, type, numbering: { deckLetter, start, step }, … })
```
| field | meaning |
|---|---|
| `corridorSide` | side of **each cabin** that faces the corridor. `'port'`/`'stbd'` → the row runs along x; `'fwd'`/`'aft'` → along z |
| `count` or `pitch` | number of cabins, or approximate cabin width (the range is divided evenly) |
| `type` | `'first'` (whitePanel, carpetRed, `cabinFirst`) · `'second'` (whitePanel, linoBlue, `cabinSecond`) · `'third'` (paintWhite, linoRed, `cabinThird`) · `'crew'` (paintWhite, linoRed, `cabinCrew`) |
| `numbering` | `{ deckLetter: 'E', start: 1, step: 2 }` → ids / plates `E1, E3, …`, names `Kabine E 1`; omit for unnumbered rooms |
| `alternateMirror` | default `true`: doors of neighbouring cabins are paired (door 0.2 m from the partition, hinged on it) |
| `wall, floor, furnish, lamp, berths, door, doorW, open, name, idPrefix, skip: [indices], group` | overrides |

Cabins whose rectangle lies completely outside the hull are skipped silently (and not numbered).

### 4.4 `plan.wall`, `plan.opening`, direct placement

- `plan.wall(x0, z0, x1, z1, { wall: style, doors: [{ at, w, h, swing: 'pos'|'neg', … }] })` – free-standing axis-aligned
  wall (partitions inside a big room, screens). Clipped to the hull; warns when it crosses a stair keep-out.
- `plan.opening(x0, z0, x1, z1)` – removes any wall along that segment (wide archway, open end of a room).
- `plan.prop(prop, x, z, rotY = 0, { collide, y })` – put a prop at world coordinates into the right zone.
- `plan.lamp(x, z, style = 'dome', { intensity, color, h })` – ceiling fixture + `world.addLamp`.
- `plan.batch` – the `Batch` of the plan for custom static geometry (`box`, `flat`, `wallX`, `wallZ`, `bar`, `post`, `poly`,
  `disc`, `ring`; flushed by `finish()`); `plan.zone(x)`, `plan.halfWidth(x)`, `plan.y`, `plan.h`.
- `plan.finish()` → `{ rooms, walls, doors, problems }`. Builds: de-duplicated walls (two faces, each in the style of the
  room on its side), door openings with frame + lintel + open leaf, skirting / dado / cornice / handrail per style, floor
  overlays, colliders for all wall pieces (split at doors), lamps, furniture, `world.rooms`, teleports and infos.

### 4.5 Wall styles (`STYLES`, extend with `addStyle(name, def)`)

`oakPanel` (carved oak panels, 1st class public rooms) · `oak` · `oakDado` (cream above oak wainscot) · `mahogany` ·
`mahoganyDado` · `whitePanel` (white panelling – default; cabins, corridors) · `whiteGold` (white panels, gilt cornice and
dado rail) · `whiteDado` · `paintWhite` (plain painted, no trim – 3rd class, crew, service) · `cream` · `green` · `grey` ·
`pine` · `steel` · `steelDark` · `tile` (white tiles) · `tileBlue` (Turkish bath / pool) · `brick` · `damaskRed` /
`damaskGreen` / `damaskBlue` (silk wall covering over white wainscot, gilt cornice – 1st class staterooms) · `damaskGold`.

A style is `{ wall, wainscot?, skirt?, dado?, cornice?, rail?, door, frame?, lamp, relief?, grand? }` (material names). Per-room
variation: `wall: { base: 'oakPanel', cornice: 'gold', rail: true }`.

**3D relief (new).** Wall faces are modelled according to the style family (`relief` overrides it: `'panel' | 'wainscot' |
'boards' | 'steel' | 'plain' | 'tile' | 'none'` or `false`):

| family | styles | geometry |
|---|---|---|
| panel | oakPanel, oak, mahogany, whitePanel, whiteGold | raised & fielded panels (tall upper row; lower row under a chair rail in grand styles), chair rail, profiled skirting and cornice; the painted-panel textures are replaced by the plain material (`oakPanel` → `oak`, `whitePanel` → `paintWhite`) |
| wainscot | oakDado, mahoganyDado, whiteDado, damask* | panelled wainscot, moulded dado rail, plain upper wall, picture rail, cornice |
| boards | paintWhite, pine | tongue-and-groove beads (painted boarding of 3rd-class / crew rooms and corridors), low skirting, capping |
| steel | steel, steelDark, grey | bulb-angle frames every 0.61 m, riveted seam strap, cable run under the deck head |
| plain / tile | cream, green / tile, tileBlue | mouldings only / cove skirting |

Grand styles (`oakPanel`, `mahogany`, `whiteGold`, `damask*`, or `grand: true`) add bolection mouldings round the upper
panels, a larger cornice and fluted pilaster strips at room corners. Corridors with `handrail: true` get brass brackets.
**Hand-detailed rooms** whose `furnish` function adds its own wall geometry to `plan.batch` (> 120 triangles, e.g. the
deck heroes' `detailer().panels`) keep flat wall faces (only skirting / dado / cornice mouldings are added) so the deck's own
panelling is not doubled. Lintels above doors get a transom panel (panel family) and the cornice.

Automatic fittings (new): corridors of the boards / steel families get a steam pipe, a hot-water pipe and a cable tray with
hangers under the deck head; panelled corridors get moulded ceiling battens every ~1.6 m; every corridor gets a chemical
fire extinguisher and a hose-reel cabinet alternately every ~14 m on a wall face; lamps of style `bowl`, `cut` and
`chandelier` get a moulded plaster ceiling rose; 1st / 2nd class cabins (and suites) on the hull side get curtains on a
brass rod at their portholes.

Floors (names): `carpetRed, carpetGreen, carpetBlue, linoCream` (cream/red tiles, 1st class), `linoBlue, linoRed` (3rd class /
crew), `tileWhite` (`'tile'`), `tileBlue`, `steelFloor`, `deckWood`, `pine`, `oak`, `marble`.

---------------------------------------------------------------------------------------------------------

## 5. Furnishing

### 5.1 Presets (`furnish: 'name'` or `{ preset: 'name', …options }`)

All presets adapt to the room size and to the door wall, keep every door zone (door width + 0.12 m each side, ~1 m deep,
plus the swing of the leaf) free, stay inside the hull-clipped rectangle, avoid casings / stair keep-outs and vary
deterministically with the room id. Anything that does not fit is left out.

| preset | content | sensible size (W along door wall × D) | options |
|---|---|---|---|
| `cabinFirst` | brass/mahogany bed(s), wardrobe with mirror, marble washbasin, dressing table, armchair, heater, trunk, sofa + table if large | ≥ 2.6 × 3; typical 3.5 × 4.5 | `beds: 1|2` |
| `cabinFirstSuite` | canopy bed, fireplace, wardrobe, dressing table, basin, sofa, writing desk, table + armchairs | ≥ 4 × 4.5 | `fireplace: false` |
| `cabinSecond` | mahogany bunk berth (+ second berth or sofa berth), fold-down washstand, wardrobe | ≥ 2.2 × 2.8; 4 berths need W ≥ 2.75 | `berths: 2|4` |
| `cabinThird` | pine bunks with White Star blankets, wall basin | 2 berths ≥ 1.8 × 2.4; 4 ≥ 2.4 × 2.6; 6 ≥ 3 × 3 | `berths: 2|4|6` |
| `cabinCrew` | iron bunks, lockers, stool (officer: desk + washstand) | ≥ 2 × 2.4 | `berths`, `single`, `officer` |
| `dormitory` | rows of bunks along the side walls and double rows between, lockers, bench | ≥ 5 × 5 | `pine: true` (3rd-class open berths) |
| `bathroom` | bathtub, basin, WC if > 4.5 m² | ≥ 1.9 × 2 | `wc`, `shower`, `wood` |
| `wc` | one WC (W < 1.7) or a row of stalls with partitions, urinals if D > 2.6, basin | ≥ 0.95 × 1.3 | – |
| `pantry` | crockery shelves, serving counter, sink | ≥ 2.5 × 2.5 | – |
| `store` | shelves, barrels, crates, sacks | ≥ 2 × 2 | `shelves` |
| `linen` | linen shelves, table | ≥ 1.8 × 1.5 | – |
| `office` | desk + chair, bookcase, safe | ≥ 2.6 × 2.8 | `mat` |
| `mess` | mess tables with benches, lockers | ≥ 3.5 × 4 | `set` |
| `lounge` | seating groups (3.2 m grid), fireplace, bookcase, palms, piano if > 70 m² | ≥ 5 × 5 | `fireplace, piano, wicker, cover, mat` |
| `smoking` | leather club chairs around tables, fireplace | ≥ 5 × 5 | `fireplace, cover` |
| `writing` | writing desks along the walls, small groups | ≥ 4 × 4 | `desks` |
| `dining` | `cls: 'first'` round + rectangular tables with cloth, settings, lamp, green leather chairs (2.9 m grid) · `'second'` long tables with swivel chairs · `'third'` long tables with benches | ≥ 6 × 6 | `cls` |
| `galley` | ranges and kettles along the far wall, sink, shelves, butcher block, serving counters, oven | ≥ 5 × 4 | `ranges`, `oven` |
| `hold` | crate stacks, barrels, luggage, sacks on a 2.3 m grid, centre aisle if W > 6 | any | – |
| `mail` | sorting shelves, table, mail-bag piles | ≥ 3 × 3 | – |
| `barber`, `hospital`, `turkish` (cooling-room couches), `bar` | as named | ≥ 3 × 3 | `beds`, `couches` |
| `empty` | nothing | | |

Add your own: `PRESETS.myRoom = (ctx) => {…}` or pass a function as `furnish`.

Life-giving extras added by the presets (drawn from `ctx.drng`, so layouts and reachability are unchanged): cork life
jackets on the wardrobes (1st / 2nd class) and on the crew lockers, slippers in front of 1st-class beds, a framed painting
over the bed and on a free wall, books or a newspaper on cabin tables, a carafe and books in suites, coat / hat hooks with
coats and hats in 2nd- and 3rd-class cabins, papers and books on some lounge tables, paintings in writing rooms.

### 5.2 `FurnishCtx` (argument of presets / furnish functions)

Local frame: **u** runs along the door wall (0…`ctx.W`), **v** into the room (0…`ctx.D`); the frame is chosen so that the
main door lies in the low-u half. Walls: `'near'` (door wall, v = 0), `'far'`, `'left'` (u = 0), `'right'` (u = W).
Directions (where the front of a prop points): `'in'` (+v), `'out'` (−v), `'right'` (+u), `'left'` (−u).

| member | meaning |
|---|---|
| `ctx.W, ctx.D, ctx.h, ctx.y` | usable size (inside walls and hull), clear height, floor y |
| `ctx.room, ctx.opts, ctx.cls, ctx.deck, ctx.world, ctx.plan` | the room record, preset options, cabin class |
| `ctx.door` | `{ u, w }` of the main door or `null`; `ctx.hull` = wall name that is the ship's side (or `null`) |
| `ctx.rng()` / `ctx.pick(list)` | deterministic random (seeded by deck + room id) |
| `ctx.fit(prop, ['wall:snug', …], { collide, gap, exact })` | put a prop against a wall; `snug` = `lo` \| `hi` \| `mid` (for side walls `lo` is near the door wall). Tries each preference and slides along the wall to the first free spot. Returns `true/false` |
| `ctx.put(prop, u, v, dir, { collide, force, ghost, y })` | free placement of the prop centre; refuses (returns `false`) when outside the room/hull, in a door zone, in a casing / stair keep-out or on another prop – unless `force` |
| `ctx.free(u, v, eu, ev)` | test a rectangle |
| `ctx.mount(prop, wall, pos, height)` | wall-mounted props (`sconce`, `mirrorWall`, `clockWall`, `gauge`) |
| `ctx.grid(du, dv, fn(u, v, i, j, nu, nv), margin)` | iterate a centred grid of cells |
| `ctx.box(mat, u0, v0, u1, v1, y0, y1, collide)` | raw box in local coordinates (partitions, platforms) |
| `ctx.glow(u, v, height, color, intensity)` | extra `world.addLamp` (e.g. fireplace) |
| `ctx.at(u, v)` → `{x, z}`, `ctx.rot(dir)` → rotY | conversions to world |
| `ctx.last` (new) | `{u, v, dir, fp, x, z, wall?, pos?}` of the prop placed last by `put` / `fit` (`wall`/`pos` when placed by `fit`) |
| `ctx.attach(prop, dx, dz, {y, turn})` (new) | small accessory relative to `ctx.last` (dx along its front, dz along its width, y above the floor), no collider, does not reserve floor; refused outside the room or (on the floor) in a door zone |
| `ctx.drng()` (new) | second deterministic random stream for decorative extras – use it for anything new so the furniture layout drawn from `ctx.rng` stays unchanged |

Colliders: `put`/`fit` add one automatically for props higher than 0.45 m with a footprint ≥ 0.4 × 0.75 m (beds, wardrobes,
tables, sofas…); chairs and small items get none. Override with `{ collide: true|false }`.

---------------------------------------------------------------------------------------------------------

## 6. Props (`props.js`)

Every prop is `name(opts) → THREE.Group`: origin on the floor in the centre of its footprint, **front facing +x**,
`group.userData.fp = { w (along local z), d (along local x), h }`. Geometry is built once per option set, merged per
material and shared, so calling a prop 500× is cheap. All props are modelled pieces (turned / tapered / cabriole legs,
bevelled edges, panelled doors and drawers with brass bails and key plates, upholstery with cushions and button tufting,
mattresses, pillows and turned-down blankets, cloths that drape, place settings, book spines, etc.); footprints are unchanged.
Round parts follow `DETAIL.q` (exported, default 0.5 = half the authored segments, with a floor by radius so large parts
stay smooth; set it before the first build to trade detail against triangles). Custom props: `def(name, fp, (p: PB, o) => …)`
with the builder methods of `props-core.js` (`b, bb, c, cx, cz, s, t, lathe, latheX/Z, pil, fr, fp, loft, tube, extX/Y/Z,
rev, ab, alathe, ag, add`). Place with

```js
place(parent, prop, x, y, z, rotY = 0, { collide: true, world })   // rotY: 0 faces +x, Math.PI/2 faces −z, faceDir(dx, dz)
plan.prop(prop, x, z, rotY, { collide })                            // same, zone + floor height automatic
```
`PROPS[name]` is the registry; `name.fp(opts)` returns the footprint without building.
Footprint **w × d × h** (m) and triangles with default options:

| group | props |
|---|---|
| beds | `bedFirst({style:'brass'|'mahogany', canopy, wide, cover})` 2.05×1.0(1.4)×1.2(2.15) ~750 (canopy 4 600) · `berthSecond({upper, cover, mat})` 1.99×0.8×1.8 750 · `bunkThird({tiers:1|2})` 1.9×0.75×1.65 310 (White Star blanket) · `bunkCrew({tiers, cover})` same, iron · `hammock` 2.3×0.6×1.3 · `coolingCouch({mat})` 1.9×0.75×0.8 |
| storage | `wardrobe({w, open, mirror, mat, life})` 1.1×0.55×2.02 380 (`life`: cork life jackets on top, 510) · `chest` 0.9×0.5×0.95 · `locker({n, mat})` 0.4n×0.45×1.8 · `bookcase({w, mat, seed})` 1.4×0.4×2.05 2 300 (glazed, individual book spines) · `shelves({w, kind:'stores'|'crockery'|'linen'|'bottles'|'empty', mat, v})` 1.5×0.45×1.9 470 (fiddle rails; `v` = content variant) · `safe` 0.65×0.6×0.95 |
| washing | `dressingTable` 1.0×0.5×1.62 1 000 · `washstand({items})` (fold-down compactum, carafe + tumbler) 0.6×0.42×1.6 890 · `washbasinMarble({double, mirror})` 0.8(1.5)×0.5×1.75 800 · `basinSmall` 0.5×0.4×1.0 · `bathtub({wood})` 1.75×0.78×0.65 · `wc({cistern})` 0.5×0.72×1.95 · `urinal` 0.5×0.35×1.3 · `showerBath` 0.9×0.9×2.15 · `sink({w})` 1.2×0.6×1.1 |
| seating | `sofa({w, mat})` 1.8×0.8×0.9 800 (tufted back, rolled arms) · `settee({w, mat})` 1.85×0.62×0.9 560 · `armchair({kind:'club'|'wicker'|'uph', mat})` 0.8×0.8×0.9 (wicker 0.66²) ~500 · `chairDining({cls:'first'|'second'|'plain', mat, seat})` 0.48×0.5×0.96 580 · `swivelChair` (2nd class, floor-fixed) 0.48×0.5×0.92 · `bench({w, back, mat, iron})` 1.8×0.48×0.88 · `stool` 0.38² · `barberChair` 0.7×1.1×1.3 |
| tables | `tableRound({r, cloth, set, lamp, mat, items})` 2r×2r×0.78 400–1 400 · `tableRect({w, d, cloth, set, lamp, mat, items})` 1.2×0.8×0.78 500–2 300 (`items`: papers / books) · `writingDesk` 1.1×0.6×1.1 · `desk({w, mat})` 1.4×0.7×0.8 · `chartTable` 1.8×0.9×1.0 · `messTable({w, set, cloth, mat})` (with benches) 2.4×1.7×0.78 · `workbench({w})` 1.8×0.7×0.95 |
| decor / light | `fireplace({mat, fire, mirror, clock})` 1.7×0.42×2.3 2 800 (uses `mats.fire`) · `column({h, r, mat, capital})` · `pilaster({h, w, mat, capital})` · `pottedPalm` 0.9²×1.9 · `trellis({w, h})` (ivy lattice, Café Parisien / Verandah) · `piano({grand})` 1.5×0.66×1.3 / 1.5×2.1×1.05 · `liftCage` 1.6²×2.4 · `heater` 0.6×0.2×0.62 · `tableLamp` · **wall-mounted, origin = mounting point:** `sconce({plain})`, `clockWall`, `mirrorWall({w, h, frame})`, `gauge({r})` · **ceiling-mounted, origin at the ceiling:** `ceilingLight({style:'dome'|'bowl'|'bulkhead'|'cut'|'bare'})` 120–320, `ceilingRose({r})`, `chandelier({arms})` 1 800, `domeLight({r})` |
| small / life (new) | **wall-mounted, origin = mounting point:** `picture({w, h, v, frame})` 0.6×0.05×0.45 · `coatHooks({n, v, mat})` (coats / hats) · `notice()` · `sign({kind})` (enamel direction sign) · `fireHose()` · `extinguisher()` · `porthole({r})` · `portCurtain({r, mat})` · **standing / lying:** `lifeJacket({n})` 0.6×0.4×0.2 · `carafe()` · `bookPile({v})` · `towels({n})` · `newspaper()` · `slippers({v})` · `hatBox({v})` |
| luggage / cargo | `trunk({big, mat})` 0.85×0.5×0.5 · `suitcase` · `luggagePile({v})` 1.3×1.0×1.1 · `crate({s})` · `crateStack({v})` 1.9×1.7×1.8 · `barrel` 0.64²×0.9 · `sack`, `sackPile({mat})` 1.5×1.1×0.85 (mail bags) · `coalPile({w, d, h})` · `wheelbarrow` |
| galley / bar | `range({w})` 2.4×0.95×1.95 1 800 (oven doors, rails, hood, flue, pots) · `oven({w})` 1.4×1.0×2.0 · `servingCounter({w, d, mat, top, items})` 2.0×0.7×0.93 · `kettle` 0.85²×1.05 · `butcherBlock` · `barCounter({w})` 3.0×0.65×1.12 · `backBar({w})` 3.0×0.4×2.1 |
| gymnasium / baths | `rowingMachine` 0.6×2.0×0.7 · `electricHorse`, `electricCamel` 0.55×1.2×1.4 · `cycleMachine` 0.55×1.4×1.5 · `punchBag({h})` · helpers `poolBasin(world, deck, x0, x1, z0, z1, {rim, h, tile})` (tiled coaming, water, brass rail, collider) and `squashMarkings(world, deck, x0, x1, z0, z1, {front:'fwd'|'aft', h})` |
| wireless / bridge | `marconiSet` 1.8×0.75×1.55 2 000 · `telegraph` 0.5×0.45×1.3 870 · `shipsWheel` 1.25×0.5×1.6 1 700 · `binnacle` 0.6×0.5×1.4 990 · `chartTable` |
| machinery | `switchboard({w})` 3.0×0.4×2.3 · `ladder({h})` · `watertightDoor({w, h, closed})` (decorative frame) · `valve({r, mat})` · `gauge` · `tankV({r, h, mat})` · `tankH({r, l, mat})` · `machineBlock({w, d, h, kind:'box'|'pump'|'dynamo'|'engine', mat})` · helper `pipe(parent, mat, [[x,y,z], …], r)` (world points) |

Budget reference (measured for a single cabin built alone, incl. all four walls with both faces, door, lamp, furniture and
extras; in a row about 10 % less): 1st class 3.5 × 4.5 ≈ 8 300 triangles · suite 4.5 × 5 ≈ 15 000 · 2nd class 2.4 × 3 ≈ 4 900 ·
2nd class 4-berth ≈ 5 000 · 3rd class 2 × 2.6 ≈ 1 800 · 3rd class 6-berth ≈ 2 500 · crew ≈ 2 300. `dining` first class ≈ 2 500
triangles per round table group with 4 chairs. All stairs of the ship ≈ 280 000 (template parts: iron panels ~470, balusters
~70, newels ~600). Whole interior ≈ 8.2 M triangles (zones are culled; was 1.8 M).

---------------------------------------------------------------------------------------------------------

## 7. Layout guidelines

- **Corridors:** 1st class 1.6–2.0 m, all others 1.2 m (never below 1.1 m). Corridors are rooms without own walls.
- **Cabins:** 1st ≈ 3.5 × 4.5 m, 2nd ≈ 2.4 × 3 m (4-berth 2.9 × 3), 3rd ≈ 2 × 2.6 m (4-berth 2.5 × 2.8), crew ≈ 2.2 × 2.8 m.
- **Doors** ≥ 0.9 m (player radius 0.3 m). Keep ≥ 0.25 m between a door edge and a wall end. One declaration per door.
- **Shared edges must have identical coordinates** (use shared constants for corridor edges; walls are matched to 1 cm).
- **Hull side:** on tank…C specify hull-side rooms out to `z = ±99`; walls, floors and furniture are clipped to the lining.
  Forward of x ≈ 40 and aft of x ≈ −70 the hull narrows (`plan.halfWidth(x)` / `deckHalfWidth(deck, x)`): move the corridors
  inboard there, or switch to a single centre corridor, so that hull-side cabins keep ≥ 2.4 m depth. A cabin whose usable
  depth gets too small is simply furnished sparsely / left empty; a cabin fully outside is dropped.
- **Casings** (`casingsOn(deck)`: funnel uptakes x 52.5..59.5, 30.5..37.5, 8.5..15.5, −13.5..−6.5 and engine casing
  −36..−24, all |z| ≤ 3, decks F…A) are solid. Route corridors past them at |z| ≥ 3; rooms may touch them. Rooms that must
  contain one (dining saloon) need `casing: true`.
- **Stair keep-outs** – see section 2. Put a lobby room (`stairs: true`) around each stair and connect it to the corridors.
- **Exterior doors** (`EXT_DOORS`, decks boat/A/B/C): keep 1.5 m free inside each door; do not put a wall end there.
  On B/A/boat the exterior module owns the outer walls – do not duplicate them: rooms at the side simply extend to
  `z = ±99` (their outer wall is clipped away automatically 0.15–0.2 m inside the exterior wall).
- **Lighting:** one lamp per room is automatic; big rooms get a 6 m grid. Add `chandelier`s / `sconce`s only in hero rooms.
- **Performance:** prefer presets and `floors` regions; a hero room ≤ 60 000 triangles; one deck ≤ 1.5 M. For > 200
  identical hand-placed items in one room use `THREE.InstancedMesh` yourself.
- Teleports: give the important rooms `teleport: { group: '1. Klasse' }` – the kit picks a free standing point.

---------------------------------------------------------------------------------------------------------

## 8. Worked example (excerpt of `src/decks/_example.js`)

```js
import { buildDeckShell, bulkhead, createDeckPlan, armchair, tableRound } from '../interior/kit.js';

export async function build(world) {
  const deck = 'E';
  buildDeckShell(world, deck, { x0: 37.5, x1: 94, ends: { aft: true, fwd: true } });   // real modules: no x0/x1/ends

  const plan = createDeckPlan(world, deck, { wall: 'whitePanel', floor: 'linoCream' });
  const CZ = 6.8, CW = 1.6, AFT = 46.5, FWD = 80;

  // stair lobby (contains the keep-out 37.5..46.5 × ±2.7); open doorways into both corridors
  plan.room({ id: 'E-lobby', name: 'Treppenhalle E-Deck', type: 'lobby', stairs: true, x0: 37.5, x1: AFT, z0: -10, z1: 10,
    wall: 'oakPanel', lamp: 'bowl', teleport: { group: '1. Klasse' },
    doors: [{ side: 'fwd', at: -(CZ + CW / 2), w: 1.3, leaf: false }, { side: 'fwd', at: CZ + CW / 2, w: 1.3, leaf: false }],
    furnish: (ctx) => { ctx.put(tableRound({ r: 0.4 }), 1.6, ctx.D - 1.6, 'in'); ctx.put(armchair({ kind: 'uph' }), 0.6, ctx.D - 1.6, 'right'); } });
  // a room entered from the lobby: it declares the door, the lobby wall gets the opening
  plan.room({ id: 'E-purser', name: 'Zahlmeisterbüro', x0: 37.5, x1: AFT, z0: -99, z1: -10, wall: 'oakDado', floor: 'carpetGreen',
    furnish: 'office', doors: [{ side: 'stbd', at: 44 }] });

  // corridors (no own walls) + cross passage
  plan.corridor({ id: 'E-gang-bb', name: 'Gang Backbord', x0: AFT, x1: FWD, z0: -CZ - CW, z1: -CZ, handrail: true });
  plan.corridor({ id: 'E-gang-stb', name: 'Gang Steuerbord', x0: AFT, x1: FWD, z0: CZ, z1: CZ + CW, handrail: true });
  plan.corridor({ id: 'E-quergang', name: 'Quergang', x0: 66, x1: 67.4, z0: -CZ, z1: CZ });

  // hull-side cabins, specified beyond the hull → clipped; inner rows interrupted by the cross passage
  plan.cabinRow({ x0: AFT, x1: FWD, z0: -99, z1: -CZ - CW, count: 10, corridorSide: 'stbd', type: 'first', numbering: { deckLetter: 'E', start: 1, step: 2 } });
  plan.cabinRow({ x0: AFT, x1: 66, z0: -CZ, z1: -3.4, count: 7, corridorSide: 'port', type: 'second', numbering: { deckLetter: 'E', start: 101, step: 2 } });
  plan.cabinRow({ x0: AFT, x1: 66, z0: 3.4, z1: CZ, count: 8, corridorSide: 'stbd', type: 'third', numbering: { deckLetter: 'E', start: 102, step: 2 } });

  // bathroom block between the funnel casing (52.5..59.5) and the cross passage
  plan.room({ id: 'E-bad-1', name: 'Bad', x0: 59.6, x1: 66, z0: -3.4, z1: -1, wall: 'tile', floor: 'tile', furnish: { preset: 'bathroom', shower: true }, doors: [{ side: 'fwd', at: -2.2 }] });
  plan.room({ id: 'E-wc-1', name: 'WC', x0: 59.6, x1: 66, z0: -1, z1: 1, wall: 'tile', floor: 'tile', furnish: 'wc', doors: [{ side: 'fwd', at: 0 }] });

  // watertight bulkhead with two doors, crew quarters forward of it (no own walls: bulkhead + lining enclose it)
  bulkhead(world, deck, FWD, { doors: [{ z: -(CZ + CW / 2) }, { z: CZ + CW / 2 }] });
  plan.room({ id: 'E-heizer', name: 'Heizerlogis', type: 'crew', x0: FWD, x1: 94, z0: -99, z1: 99, walls: 'none', facing: 'aft',
    floor: 'linoRed', lamp: 'bulkhead', furnish: 'dormitory', teleport: { group: 'Besatzung' } });

  plan.finish();
  return {};
}
```

---------------------------------------------------------------------------------------------------------

## 9. Verifying a deck

```
node tools/smoke.mjs src/interior/stairs.js src/decks/e.js --bake      # must exit 0, no "[kit …]" warnings
node src/interior/check.mjs E src/decks/e.js                           # reachability; several decks: E,F  several files allowed
npx esbuild src/decks/e.js --bundle --format=esm --outfile=node_modules/.tmp/e.js --log-level=warning
```
`check.mjs` builds the stairs + your module(s) with a stubbed DOM, flood-fills the walkable floor of the deck on a 0.4 m
grid (4-connected, radius 0.2 m, using `world.groundAt` / `world.collide`) starting at all stair landings and at the inside
of the `EXT_DOORS` of that deck, and lists every room of `world.rooms` that was not reached (exit code 1) plus the number
of kit warnings. From your own throw-away script (DOM stub as in `tools/smoke.mjs` / `check.mjs`):

```js
import { checkReachability } from '../src/interior/kit.js';
const r = checkReachability(world, 'E', { seeds: [{ x: 60, z: 0 }] });   // seeds optional
console.log(r.rooms, r.cells, r.unreachable.map((q) => q.id), r.reached(60, 7.6));
```
Typical reasons for an unreachable room: door on a wall that does not exist (see the "does not fit on a wall" warning),
door blocked by the neighbour's furniture (the neighbour did not know about the door – this cannot happen when both are
kit rooms), corridor not connected to a stair lobby, room edge coordinates that differ by more than 1 cm.

### Checklist

- [ ] `buildDeckShell` called once for the deck; no own floors/ceilings/hull walls; exterior-owned walls not duplicated.
- [ ] Every room is reachable through doors (≥ 0.9 m) from a corridor that reaches a staircase (`check.mjs` prints "all rooms reachable").
- [ ] No `[kit …]` warnings: no room/wall overlapping a stair keep-out (lobbies use `stairs: true`), no room overlapping a casing, nothing outside the deck segments.
- [ ] Each stair on the deck has a lobby that connects to the corridors; the 2 m in front of both stair ends are free.
- [ ] Teleports stand on floor and outside colliders (smoke test), infos are German, 2–4 factual sentences.
- [ ] Triangle budget (smoke test, "interior per deck") ≤ 1.5 M; no `THREE.Light`; no per-mesh materials.
- [ ] Room ids unique; names German; cabin numbers plausible for the deck.
