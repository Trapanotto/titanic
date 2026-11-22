// Device tiers: decided once at startup, before anything heavy is built. Everything that costs memory or GPU time
// reads its settings from TIER (texture size, geometry detail, lights, shadows, post, streaming budget).
//   mobile – phones / small tablets: one deck at a time, 256 px textures, no post, few lights, no shadows
//   low    – weak laptops / integrated GPUs / big tablets: current deck + neighbour, 512 px, no post
//   mid    – ordinary desktops: post 'mittel', 512 px textures
//   high   – strong desktops: today's full quality
// URL override: ?tier=mobile|low|mid|high. Debug: ?nohalf=1 (no float render targets), ?maxtex=2048.

export const TIERS = ['mobile', 'low', 'mid', 'high'];

const SETTINGS = {
  mobile: {
    quality: 'mobil', qualities: ['mobil', 'niedrig'], antialias: false, maxPixelRatio: 1, minPixelRatio: 0.6,
    texMax: 256, detail: 0.25, dropRadius: 0.1, physical: false, lamps: 4, lampShadows: 0, sunShadow: 0,
    particles: false, lampVolume: false, envMaps: 'min', oceanSeg: 0.3, tinyInstances: false,
    stream: { neighbours: 0, wells: false, budgetMB: 60 },
  },
  low: {
    quality: 'niedrig', qualities: ['niedrig', 'mittel'], antialias: true, maxPixelRatio: 1, minPixelRatio: 0.7,
    texMax: 512, detail: 0.35, dropRadius: 0.05, physical: false, lamps: 6, lampShadows: 0, sunShadow: 1024,
    particles: true, lampVolume: true, envMaps: 'all', oceanSeg: 0.6, tinyInstances: true,
    stream: { neighbours: 1, wells: false, budgetMB: 110 },
  },
  mid: {
    quality: 'mittel', qualities: ['niedrig', 'mittel', 'hoch'], antialias: true, maxPixelRatio: 2, minPixelRatio: 1,
    texMax: 512, detail: 0.5, dropRadius: 0, physical: true, lamps: 14, lampShadows: 2, sunShadow: 2048,
    particles: true, lampVolume: true, envMaps: 'all', oceanSeg: 1, tinyInstances: true,
    stream: { neighbours: 1, wells: true, budgetMB: 160 },
  },
  high: {
    quality: 'hoch', qualities: ['niedrig', 'mittel', 'hoch'], antialias: true, maxPixelRatio: 2, minPixelRatio: 1,
    texMax: 1024, detail: 0.5, dropRadius: 0, physical: true, lamps: 14, lampShadows: 2, sunShadow: 4096,
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
  const mobileGpu = /mali|adreno|powervr|apple gpu|apple a\d|sgx|videocore|tegra/.test(gpu);
  const weakGpu = /intel.*(hd|uhd)|hd graphics|uhd graphics|swiftshader|llvmpipe|software|microsoft basic/.test(gpu);
  const midGpu = /iris|radeon.*(vega|graphics)|intel.*arc|apple m1(?! (pro|max|ultra))/.test(gpu);
  const ua = nav.userAgent || '';
  const phoneUA = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  if (coarse || phoneUA || mobileGpu) {
    name = 'mobile'; reasons.push(coarse ? 'Touch' : phoneUA ? 'Mobilgerät' : 'Mobil-GPU');
    if (mem >= 8 && /adreno.*7\d\d|apple gpu/.test(gpu) && !phoneUA) { name = 'low'; reasons.push('starkes Tablet'); }
  } else {
    if (weakGpu) { name = 'low'; reasons.push('integrierte GPU'); }
    else if (midGpu) { name = 'mid'; reasons.push('Mittelklasse-GPU'); }
    if (mem && mem <= 4) { name = TIERS.indexOf(name) > 1 ? 'low' : name; reasons.push(mem + ' GB RAM'); }
    if (cores && cores <= 2) { name = 'low'; reasons.push(cores + ' Kerne'); }
  }
  if (caps && !caps.floatRT && TIERS.indexOf(name) > 1) { name = 'low'; reasons.push('keine Float-Rendertargets'); }
  if (caps && caps.maxTex && caps.maxTex < 4096 && TIERS.indexOf(name) > 1) { name = 'low'; reasons.push('Texturgröße ' + caps.maxTex); }
  return { name, reason: reasons.join(', ') || 'Desktop', info };
}
