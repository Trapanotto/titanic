// Self test: open the page with ?selftest=1. It plays through the things that can break unnoticed (doors,
// watertight doors, lift, telegraph, every deck) on the device it runs on, measures the frame time per deck and
// shows the result as a table (also in window.__titanic.selftest and in the console).
import { DECK_Y, DECK_NAMES } from '../core/constants.js';
import { ORDERS } from '../core/engine.js';

// The test runs in the app's own time. Where the browser draws no or only a few frames (hidden or covered
// window), it steps the missing frames itself, so the result does not depend on the window being visible.
let dbg = null, manual = false;
pump.stuck = 0;
const turn = () => new Promise((r) => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); });
const hidden = () => manual || document.hidden;
async function pump(s) { for (let i = 0, n = Math.ceil(s * 60); i < n; i++) { if (dbg.streamer?.blocking) { await new Promise((r) => setTimeout(r, 100)); i--; if (++pump.stuck > 1200) return; continue; } dbg.frame(1 / 60, 1); if (i % 4 === 3) await turn(); } await turn(); }
async function wait(s) {
  const t0 = dbg.time || 0;
  if (!hidden()) await new Promise((r) => setTimeout(r, s * 1000));
  const missing = s - ((dbg.time || 0) - t0);
  if (missing > 0.05) { if (missing > s * 0.5) manual = true; await pump(missing); }
}
async function frame() {
  if (!hidden()) return new Promise((r) => requestAnimationFrame(r));
  const t0 = performance.now();
  dbg.frame(1 / 60, 1);
  await turn();
  return (frame.clock = (frame.clock || 0) + Math.max(0.1, performance.now() - t0));
}

async function waitFor(cond, seconds) {
  for (let t = 0; t < seconds; t += 0.1) { if (cond()) return true; await wait(0.1); }
  return !!cond();
}

export async function run(d) {
  dbg = d;
  const { world, player, interact, renderer, streamer } = d, ENGINE = d.engine;
  const rows = [], res = (d.selftest = { done: false, pass: false, rows });
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;left:8px;top:8px;z-index:99;max-width:min(94vw,560px);max-height:92vh;overflow:auto;background:rgba(12,10,8,.92);color:#eadfbf;font:12px/1.45 ui-monospace,Consolas,monospace;padding:10px 12px;border:1px solid #8a6d2f;border-radius:6px;white-space:pre-wrap';
  document.body.append(box);
  const paint = (now) => { box.textContent = 'Selbsttest' + (res.done ? (res.pass ? ' – alles in Ordnung' : ' – FEHLER') : ' läuft … ' + (now || '')) + '\n' + rows.map((r) => (r.ok === null ? '   ' : r.ok ? ' ✓ ' : ' ✗ ') + r.name + (r.note ? '  ' + r.note : '')).join('\n'); };
  const add = (name, ok, note = '') => { rows.push({ name, ok, note: String(note) }); paint(); };
  // a deck that is being built stops the frames (veil): wait in real time until it is there
  const settle = async () => {
    await wait(0.4);
    for (let i = 0; i < 1200 && streamer?.blocking; i++) await new Promise((r) => setTimeout(r, 100));
    await waitFor(() => !streamer?.busy, 20);
    await wait(0.3);
  };
  const go = async (deck, x, z, yaw = 0) => { player.teleport({ deck, x, y: DECK_Y[deck], z, yaw }); await settle(); };
  const blocked = (dr) => { const c = world.collide(dr.x, dr.z, dr.y); return Math.hypot(c.x - dr.x, c.z - dr.z) > 0.05; };
  const check = async (name, fn) => {
    paint(name);
    try { const r = await fn(); add(name, r === true || r?.ok === true, r?.note ?? (r === true ? '' : r === false ? '' : r)); }
    catch (e) { add(name, false, e?.message || e); }
  };
  ui(d).toast?.('Selbsttest läuft – bitte nichts drücken', 5);

  await check('Start ohne Modulfehler', () => ({ ok: d.errors.length === 0, note: d.errors.map((e) => e.id).join(', ') }));
  const doors = [...world.doors.values()];
  await check('Türen registriert', () => ({ ok: doors.filter((x) => !x.kind).length > 1000, note: doors.filter((x) => !x.kind).length + ' Türen, ' + doors.filter((x) => x.kind === 'wt').length + ' Schotttüren' }));

  await check('Kabinentür schließt, sperrt und öffnet wieder', async () => {
    const dr = doors.find((x) => !x.kind && x.deck === 'B' && x.leaves.length === 1);
    const L = dr.leaves[0];
    await go('B', dr.x + (L.X ? 0 : 1.2), dr.z + (L.X ? 1.2 : 0));
    const was = dr.open;
    if (!was) { interact.toggleDoor(dr, player.pos, true); await wait(1); }
    const free = !blocked(dr);
    interact.toggleDoor(dr, player.pos, true); await wait(1);
    const shut = !dr.open && blocked(dr);
    interact.toggleDoor(dr, player.pos, true); await wait(1);
    const again = dr.open && !blocked(dr);
    return { ok: free && shut && again, note: `offen frei: ${free}, zu gesperrt: ${shut}, wieder frei: ${again}` };
  });

  await check('Schotttür fährt herunter und wieder hoch', async () => {
    const dr = doors.find((x) => x.kind === 'wt' && x.deck === 'tank');
    interact.toggleDoor(dr, { x: 0, y: -99, z: 0 }, true); await wait(2.2);
    const shut = !dr.open && blocked(dr);
    interact.toggleDoor(dr, { x: 0, y: -99, z: 0 }, true); await wait(2.2);
    return { ok: shut && dr.open && !blocked(dr), note: `zu gesperrt: ${shut}` };
  });

  await check('Brückenschalter schließt alle Schotttüren des Tank Tops', async () => {
    const i = interact.items.findIndex((x) => /Schotttüren/.test(x.label()));
    const tank = doors.filter((x) => x.kind === 'wt' && x.deck === 'tank');
    interact._pos = { x: 0, y: -99, z: 0 };
    interact.run(i); await wait(2.4);
    const shut = tank.filter((x) => !x.open).length;
    interact.run(i); await wait(2.4);
    const open = tank.filter((x) => x.open).length;
    return { ok: shut === tank.length && open === tank.length, note: `${shut} zu, ${open} wieder offen von ${tank.length}` };
  });

  await check('Telegraf: Stopp hält die Maschinen an', async () => {
    const before = ENGINE.order;
    ENGINE.order = 0;
    const stopped = await waitFor(() => ENGINE.speed < 0.08, 20);
    const p0 = ENGINE.phase; await wait(0.5);
    const still = ENGINE.phase - p0 < 0.06;
    ENGINE.order = before;
    const runs = await waitFor(() => ENGINE.speed > ORDERS[before].f - 0.15, 20);
    return { ok: stopped && still && runs, note: `steht: ${stopped && still}, läuft wieder: ${runs}` };
  });

  for (const [name, L, from, to] of [['Aufzug 1. Klasse fährt von D nach C', interact.lifts[0], 'D', 'C'], ['Aufzug 2. Klasse fährt von E nach D', interact.lifts[3], 'E', 'D']]) {
    await check(name, async () => {
      await go(from, L.reach[0], L.reach[1]);
      const near = interact.nearest !== -1 && /Aufzug/.test(interact.label(interact.nearest));
      L.dir = L.decks.indexOf(to) - L.decks.indexOf(from);
      interact._rideLift(L, from, player);
      const rode = !!interact._ride;
      const done = await waitFor(() => !interact._ride, 40);
      await settle();
      return { ok: near && rode && done && player.mode === 'walk' && Math.abs(player.pos.y - DECK_Y[to]) < 0.3, note: `Gitter erreichbar: ${near}, angekommen auf Höhe ${player.pos.y.toFixed(1)} m` };
    });
  }

  // every deck: reachable, built, and how fast it draws here
  const decks = [...new Set(world.teleports.map((t) => t.deck))];
  let worst = 0;
  for (const deck of decks) {
    await check('Deck ' + (DECK_NAMES[deck] || deck), async () => {
      const t = world.teleports.find((x) => x.deck === deck);
      player.teleport(t); await settle();
      await waitFor(() => renderer.info.render.triangles > 20000 && !streamer?.busy, 30);
      const ground = world.groundAt(player.pos.x, player.pos.z, player.pos.y + 0.3);
      let n = 0, sum = 0, max = 0, last = 0;
      for (let k = 0; k < 90; k++) { const now = await frame(); if (last) { const ms = now - last; sum += ms; n++; if (ms > max) max = ms; } last = now; }
      const avg = n ? sum / n : 0;
      if (avg > worst) worst = avg;
      const r = renderer.info.render;
      return { ok: ground !== null && r.triangles > 1000, note: `${avg.toFixed(1)} ms (max ${max.toFixed(0)}) · ${r.calls} Aufrufe · ${(r.triangles / 1e6).toFixed(2)} Mio. Dreiecke` };
    });
  }
  add('Gerät', null, `Stufe ${d.tier.name} · langsamstes Deck ${worst.toFixed(1)} ms pro Bild` + (hidden() ? ' (Fenster verdeckt: nur Rechenzeit, ohne Grafikkarte)' : ` (${Math.round(1000 / Math.max(worst, 1))} Bilder/s)`));
  add('Ton', null, d.sound?.ctx ? (d.sound.muted ? 'ausgeschaltet' : 'bereit (' + d.sound.ctx.state + ')') : 'noch nicht gestartet (erst nach Klick oder Taste)');

  res.pass = rows.every((r) => r.ok !== false);
  res.done = true;
  paint();
  console.log('[selftest]', JSON.stringify(res));
}

function ui(d) { return d.ui || {}; }
