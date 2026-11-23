// Interior kit – public entry. Deck modules import everything from here. See docs/KIT.md.
export { buildDeckShell, bulkhead, PORTHOLES } from './shell.js';
export { createDeckPlan, STYLES, addStyle, SIDES, FurnishCtx } from './rooms.js';
export { PRESETS } from './presets.js';
export * from './props.js';
export * as props from './props.js';
export { stairHoles, stairKeepouts, stairSolids, stairLandings, stairFlights, assertClear, MACHINERY_ACCESS_OPEN_END, imperialPlan, isImperial, IMP_BAND } from './stairs.js';
export { checkReachability } from './check.js';
export {
  Batch, kitMats, matOf, kitFine, deckHalfWidth, shellHalfWidth, minHalfWidth, deckRanges, casingsOn, rectMinus, overlap, LINING_INSET, HULL_DECKS,
} from './batch.js';
