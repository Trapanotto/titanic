// Device tiers: decided once at startup, before anything heavy is built. Everything that costs memory or GPU time
// reads its settings from TIER (texture size, geometry detail, lights, shadows, post, streaming budget).
//   mobile – phones / small tablets: one deck at a time, 256 px textures, no post, few lights, no shadows
//   low    – weak laptops / integrated GPUs / big tablets: current deck + neighbour, 512 px, no post
//   mid    – ordinary desktops, laptops with a small graphics card, unknown GPUs: post 'mittel', 512 px textures
//   high   – only GPUs known to be strong: today's full quality
// A session that ended without the page being closed (bluescreen, driver reset, tab crash) lowers the tier for good
// (crashGuard); ?tier=... overrides and resets that.
// `fine` (0–3) is the level of fine modelling detail (profiles, carving, clutter, rivets): modules add geometry only
// from the level they can afford – see docs/CONTRACT.md "Detail levels".
// URL override: ?tier=mobile|low|mid|high. Debug: ?nohalf=1 (no float render targets), ?maxtex=2048.

export const TIERS = ['mobile', 'low', 'mid', 'high'];

const SETTINGS = {
  mobile: {
    quality: 'mobil', qualities: ['mobil', 'niedrig'], antialias: true, maxPixelRatio: 1.5, minPixelRatio: 0.75,
    power: 'default', texMax: 256, detail: 0.25, fine: 0, dropRadius: 0.1, physical: false, lamps: 4, lampShadows: 0, sunShadow: 0,
    particles: false, lampVolume: false, envMaps: 'min', oceanSeg: 0.3, tinyInstances: false, insideExtFar: 70,
    stream: { neighbours: 0, nearDecks: 14, wells: 'near', budgetMB: 60 },
  },
  low: {
    quality: 'niedrig', qualities: ['niedrig', 'mittel'], antialias: true, maxPixelRatio: 1, minPixelRatio: 0.7,
    power: 'default', texMax: 512, detail: 0.35, fine: 1, dropRadius: 0.05, physical: false, lamps: 6, lampShadows: 0, sunShadow: 1024,
    particles: true, lampVolume: true, envMaps: 'all', oceanSeg: 0.6, tinyInstances: true, insideExtFar: 120,
    stream: { neighbours: 1, wells: 'near', budgetMB: 110 },
  },
  mid: {
    quality: 'mittel', qualities: ['niedrig', 'mittel', 'hoch'], antialias: true, maxPixelRatio: 2, minPixelRatio: 1,
    power: 'high-performance', texMax: 512, detail: 0.6, fine: 2, dropRadius: 0, physical: true, lamps: 14, lampShadows: 2, sunShadow: 2048,
    particles: true, lampVolume: true, envMaps: 'all', oceanSeg: 1, tinyInstances: true,
    stream: { neighbours: 1, wells: true, budgetMB: 160 },
  },
  high: {
    quality: 'hoch', qualities: ['niedrig', 'mittel', 'hoch'], antialias: true, maxPixelRatio: 2, minPixelRatio: 1,
    power: 'high-performance', texMax: 1024, detail: 1, fine: 3, dropRadius: 0, physical: true, lamps: 14, lampShadows: 2, sunShadow: 4096,
    particles: true, lampVolume: true, envMaps: 'all', oceanSeg: 1, tinyInstances: true,
    stream: { neighbours: 1, wells: true, budgetMB: 200 },
  },
};

/** The active tier (headless / node: 'high' without streaming). */
export const TIER = { name: 'high', reason: 'Standard', caps: {}, ...SETTINGS.high, streaming: false };

export function setTier(name, reason = '', caps = {}) {
  if (!SETTINGS[name]) name = 'high';
  Object.assign(TIER, SETTINGS[name], { name, reason, caps });
  return TIER;
}
export const lowerTier = (name) => TIERS[Math.max(0, TIERS.indexOf(name) - 1)];

/** Debug flags that simulate a weaker device; must run before any WebGL context is created. */
export function applyDebugCaps(params) {
  const proto = typeof WebGL2RenderingContext !== 'undefined' ? WebGL2RenderingContext.prototype : null;
  if (!proto) return;
  if (params.get('nohalf')) {
    const ge = proto.getExtension;
    proto.getExtension = function (n) { return /color_buffer_(half_)?float|float_blend/i.test(n) ? null : ge.call(this, n); };
    const gs = proto.getSupportedExtensions;
    proto.getSupportedExtensions = function () { return (gs.call(this) || []).filter((n) => !/color_buffer_(half_)?float|float_blend/i.test(n)); };
  }
  const mt = parseInt(params.get('maxtex') || '', 10);
  if (mt > 0) {
    const gp = proto.getParameter;
    proto.getParameter = function (p) {
      if (p === 0x0D33 || p === 0x84E8) return Math.min(mt, gp.call(this, p)); // MAX_TEXTURE_SIZE, MAX_RENDERBUFFER_SIZE
      return gp.call(this, p);
    };
  }
}

/** WebGL capabilities from a throw-away context (null: no WebGL 2). */
export function probeCaps() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2');
    if (!gl) return null;
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const caps = {
      maxTex: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      floatRT: !!gl.getExtension('EXT_color_buffer_float') || !!gl.getExtension('EXT_color_buffer_half_float'),
      gpu: String((dbg && gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) || gl.getParameter(gl.RENDERER) || ''),
    };
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return caps;
  } catch { return null; }
}

/** Pick the tier for this device. */
export function detectTier(params, caps) {
  const q = (params.get('tier') || '').toLowerCase();
  const alias = { mobil: 'mobile', phone: 'mobile', niedrig: 'low', mittel: 'mid', medium: 'mid', hoch: 'high' };
  const forced = alias[q] || q;
  const nav = typeof navigator !== 'undefined' ? navigator : {};
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const mem = nav.deviceMemory || 0, cores = nav.hardwareConcurrency || 0;
  const scr = typeof screen !== 'undefined' ? Math.max(screen.width, screen.height) * (devicePixelRatio || 1) : 0;
  const gpu = (caps?.gpu || '').toLowerCase();
  const info = { coarse, mem, cores, scr, gpu: caps?.gpu || '', maxTex: caps?.maxTex || 0, floatRT: !!caps?.floatRT };
  if (TIERS.includes(forced)) return { name: forced, reason: 'URL ?tier=' + forced, info };
  let name = 'high';
  const reasons = [];
  const mobileGpu = /mali|adreno|powervr|apple a\d|sgx|videocore|tegra/.test(gpu);
  // every integrated Intel GPU (HD, UHD, Iris, Iris Xe) shares the main memory and has weak drivers under load
  const weakGpu = /intel(?!.*\barc\b)|hd graphics|swiftshader|llvmpipe|software|microsoft basic|radeon(\(tm\))? (r[2-7]|hd) /.test(gpu);
  // full quality only where the card is known to cope: desktop-class GeForce RTX x060+, GTX 1070/1080, Radeon RX
  // 5600+/6600+/7600+/9000, Apple M2+ and M1 Pro/Max. Workstation laptop cards (RTX A500 … with 4 GB), MX, GTX 16xx,
  // Arc and everything unknown stay on 'mid'.
  const strongGpu = /rtx\s*[2-5]0[6-9]0|gtx\s*10[78]0|rx\s*(5[67]|6[6-9]|7[6-9]|9\d)\d0|apple m[2-9]|apple m1 (pro|max|ultra)/.test(gpu);
  const ua = nav.userAgent || '';
  const phoneUA = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  if (coarse || phoneUA || mobileGpu) {
    name = 'mobile'; reasons.push(coarse ? 'Touch' : phoneUA ? 'Mobilgerät' : 'Mobil-GPU');
    if (mem >= 8 && /adreno.*7\d\d|apple gpu/.test(gpu) && !phoneUA) { name = 'low'; reasons.push('starkes Tablet'); }
  } else {
    if (weakGpu) { name = 'low'; reasons.push('integrierte GPU'); }
    else if (!strongGpu) { name = 'mid'; reasons.push(gpu ? 'Mittelklasse-GPU' : 'GPU unbekannt'); }
    if (mem && mem <= 4) { name = TIERS.indexOf(name) > 1 ? 'low' : name; reasons.push(mem + ' GB RAM'); }
    if (cores && cores <= 2) { name = 'low'; reasons.push(cores + ' Kerne'); }
  }
  if (caps && !caps.floatRT && TIERS.indexOf(name) > 1) { name = 'low'; reasons.push('keine Float-Rendertargets'); }
  if (caps && caps.maxTex && caps.maxTex < 4096 && TIERS.indexOf(name) > 1) { name = 'low'; reasons.push('Texturgröße ' + caps.maxTex); }
  return { name, reason: reasons.join(', ') || 'Desktop', info };
}

/**
 * Crash guard. While the tour runs a heartbeat is kept in localStorage and removed when the page is hidden or closed.
 * A stale heartbeat at the next start means the last session died (bluescreen, GPU driver reset, tab crash): from
 * then on this device starts one tier lower. Returns { cap, crashed } and the functions to keep the heartbeat.
 */
const RUN_KEY = 'titanicRun', CAP_KEY = 'titanicTierCap';
export function crashGuard(params) {
  const ls = (() => { try { return window.localStorage; } catch { return null; } })();
  const get = (k) => { try { return ls?.getItem(k) || ''; } catch { return ''; } };
  const set = (k, v) => { try { v == null ? ls?.removeItem(k) : ls?.setItem(k, v); } catch { /* storage blocked */ } };
  let cap = get(CAP_KEY), crashed = false;
  if (params.get('tier')) { set(CAP_KEY, null); cap = ''; } // the user decides
  else {
    const [t, at] = get(RUN_KEY).split('|');
    // another open tab keeps its heartbeat fresh; a dead session is at least a restart old
    if (TIERS.includes(t) && Date.now() - (+at || 0) > 15000) {
      const lower = lowerTier(t);
      if (!TIERS.includes(cap) || TIERS.indexOf(lower) < TIERS.indexOf(cap)) cap = lower;
      set(CAP_KEY, cap);
      crashed = true;
    }
  }
  set(RUN_KEY, null);
  let name = '', last = 0;
  return {
    cap: TIERS.includes(cap) ? cap : '', crashed,
    beat(tier) { name = tier; const n = Date.now(); if (n - last > 4000) { last = n; set(RUN_KEY, name + '|' + n); } },
    clear() { last = 0; set(RUN_KEY, null); },
  };
}
