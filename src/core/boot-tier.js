// Early device tier initialization: must run before any heavy module (especially core/materials.js) evaluates.
import { TIER, TIERS, setTier, detectTier, probeCaps, applyDebugCaps, crashGuard } from './tier.js';

export const params = new URLSearchParams(location.search);
export const flag = (name) => { const v = params.get(name); return v !== null && v !== '0' && v !== 'false'; };

applyDebugCaps(params);
export const caps = probeCaps();
export const tierPick = detectTier(params, caps);
// the last session died without closing (bluescreen, driver reset): never start above the tier below it again
export const guard = crashGuard(params);
if (guard.cap && TIERS.indexOf(tierPick.name) > TIERS.indexOf(guard.cap)) {
  tierPick.name = guard.cap;
  tierPick.reason += (tierPick.reason ? ', ' : '') + 'nach Absturz zurückgestuft';
}
setTier(tierPick.name, tierPick.reason, { ...tierPick.info, ...(caps || {}) });
TIER.streaming = !flag('nostream');
