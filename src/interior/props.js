// Interior kit – Edwardian prop library (entry). Every prop: function(opts) -> THREE.Group, origin at floor level in the
// centre of its footprint, FRONT FACING +x, footprint in group.userData.fp = { w (along local z), d (along local x), h }.
// Props are built once per option set, merged per material and shared. Files: props-core.js (builder, registry,
// sub-assemblies), props-furniture.js, props-decor.js, props-tech.js, geometry generators in geom.js.
export { PROPS, place, faceDir, _bakeTemplate, def, PB, DETAIL } from './props-core.js';
export * from './props-furniture.js';
export * from './props-decor.js';
export * from './props-tech.js';
