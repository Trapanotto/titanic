// Build order of all scene modules. Each module: `export async function build(world)` -> optional { update(dt, t) }.
export const MODULES = [
  { id: 'environment', label: 'Ozean & Himmel', load: () => import('./environment/index.js') },
  { id: 'exterior', label: 'Rumpf & Aufbauten', load: () => import('./exterior/index.js') },
  { id: 'fittings', label: 'Schornsteine, Masten & Boote', load: () => import('./exterior/fittings.js') },
  { id: 'stairs', label: 'Treppenhäuser', load: () => import('./interior/stairs.js') },
  { id: 'boat', label: 'Bootsdeck', load: () => import('./decks/boat.js') },
  { id: 'A', label: 'A-Deck', load: () => import('./decks/a.js') },
  { id: 'B', label: 'B-Deck', load: () => import('./decks/b.js') },
  { id: 'C', label: 'C-Deck', load: () => import('./decks/c.js') },
  { id: 'D', label: 'D-Deck', load: () => import('./decks/d.js') },
  { id: 'E', label: 'E-Deck', load: () => import('./decks/e.js') },
  { id: 'F', label: 'F-Deck', load: () => import('./decks/f.js') },
  { id: 'G', label: 'G-Deck', load: () => import('./decks/g.js') },
  { id: 'orlop', label: 'Orlop-Deck', load: () => import('./decks/orlop.js') },
  { id: 'tank', label: 'Kessel & Maschinen', load: () => import('./decks/tank.js') },
  { id: 'people', label: 'Passagiere & Besatzung', load: () => import('./people/index.js') },
];
