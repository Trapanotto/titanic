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
async function pump(s) { pump.stuck = 0; for (let i = 0, n = Math.ceil(s * 60); i < n; i++) { if (dbg.streamer?.blocking) { await new Promise((r) => setTimeout(r, 100)); i--; if (++pump.stuck > 1200) return; continue; } dbg.frame(1 / 60, 1); if (i % 4 === 3) await turn(); } await turn(); }
async function wait(s) {
  const t0 = dbg.time || 0;
  if (!hidden()) await new Promise((r) => setTimeout(r, s * 1000));
  const missing = s - ((dbg.time || 0) - t0);
  if (missing > 0.05) { if (missing > s * 0.5) manual = true; await pump(missing); }
}
async function frame() {
  for (let i = 0; i < 600 && dbg.streamer?.blocking; i++) await new Promise((r) => setTimeout(r, 100)); // a deck is loading: no frames
  // what the picture cost is read right after it was drawn: later the loader may draw (uploads) and overwrite it
  const note = () => { const r = dbg.renderer.info.render; frame.calls = r.calls; frame.tris = r.triangles; };
  if (!hidden()) return new Promise((r) => requestAnimationFrame((t) => { note(); r(t); }));
  const t0 = performance.now();
  dbg.frame(1 / 60, 1);
  note();
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

  await check('Schrank, Schublade, Bullauge, Licht, Wasserhahn, Wanne, Spülung bedienbar', async () => {
    await go('B', 20, 5);
    const F = interact.fixtures, us = [...world.uses.values()];
    const wd = us.find((u) => u.kind === 'wardrobe' && !u.o?.open), tap = us.find((u) => u.kind === 'washbasinMarble'), tub = us.find((u) => u.kind === 'bathtub');
    if (!wd || !tap || !tub) return { ok: false, note: `Schrank ${!!wd}, Becken ${!!tap}, Wanne ${!!tub}` };
    F.toggleWardrobe(wd); await wait(0.9);
    const opened = F.open.some((w) => w.u === wd && w.t === 1);
    F.toggleWardrobe(wd); await wait(0.9);
    const closed = !F.open.some((w) => w.u === wd);
    F.toggleTap(tap); const runs = F.taps.length === 1; F.toggleTap(tap); const stops = F.taps.length === 0;
    F.toggleTub(tub); await wait(1.5);
    const fills = F.tubs.get(tub)?.level > 0.22;
    F.toggleTub(tub);
    const c = F.count;
    // drawers and portholes where the loaded decks have them; light switch and bell push of a cabin
    const dw = us.find((u) => ['chest', 'dressingTable', 'writingDesk'].includes(u.kind)), ph = us.find((u) => u.kind === 'porthole');
    let extra = true;
    if (dw) { F.toggleDrawer(dw); await wait(0.7); extra = extra && F.drawers.some((x) => x.u === dw && x.t === 1); F.toggleDrawer(dw); await wait(0.7); extra = extra && !F.drawers.length; }
    if (ph) { F.togglePort(ph); await wait(0.7); extra = extra && F.ports.some((x) => x.u === ph && x.t === 1); F.togglePort(ph); await wait(0.7); extra = extra && !F.ports.length; }
    const sw = F.switches.find((x) => !x.bell && world.lamps.some((L) => L.x > x.room.x0 && L.x < x.room.x1 && L.z > x.room.z0 && L.z < x.room.z1 && Math.abs(L.y - x.y - 1.5) < 1.5));
    let light = false;
    if (sw) { F.toggleLight(sw.room); const off = world.lamps.filter((L) => L.off).length; F.toggleLight(sw.room); light = off > 0 && !world.lamps.some((L) => L.off); }
    if (!(extra && light && c.light > 500 && c.bell > 100)) return { ok: false, note: `Schublade/Bullauge: ${extra}, Licht: ${light}, ${c.light} Schalter, ${c.bell} Klingeln` };
    return { ok: opened && closed && runs && stops && fills && c.wc > 0, note: `${c.light} Lichtschalter, ${c.bell} Klingeln, ${c.drawer} Schubladen, ${c.porthole} Bullaugen · ` + `${c.wardrobe} Schränke, ${c.tap} Hähne, ${c.tub} Wannen, ${c.wc} Toiletten (geladene Decks) · Schrank auf/zu: ${opened && closed}, Hahn: ${runs && stops}, Wanne füllt: ${fills}` };
  });

  await check('Hinsetzen, Uhr, Bücherschrank, Deckspiele', async () => {
    const F = interact.fixtures, t = world.teleports.find((x) => x.deck === 'A' && /Promenade/.test(x.name)) || world.teleports.find((x) => x.deck === 'A');
    player.teleport(t); await settle();
    const seat = [...world.uses.values()].find((u) => u.kind === 'seat' && Math.abs(u.y - DECK_Y.A) < 0.3);
    if (!seat) return { ok: false, note: 'kein Liegestuhl registriert' };
    const x0 = player.pos.x, z0 = player.pos.z;
    F.sit(seat, seat.o.eye); await wait(0.3);
    const sat = !!F.seat && player.mode === 'fly' && Math.abs(player.pos.x - seat.x) < 0.1 && interact.nearest === 'seat';
    interact.run('seat'); await wait(0.3);
    const up = !F.seat && player.mode === 'walk' && Math.abs(player.pos.x - x0) < 0.3 && Math.abs(player.pos.z - z0) < 0.3;
    const games = interact.items.filter((i) => /Shuffleboard|Wurfring/.test(i.label())).length, c = F.count;
    return { ok: sat && up && games === 4 && c.seat > 100, note: `${c.seat} Sitzplätze, ${c.clock} Uhren, ${c.book} Bücherschränke, ${c.fire} Kamine (geladene Decks), ${games} Spielpunkte · hingesetzt: ${sat}, aufgestanden: ${up}` };
  });

  await check('Kesselfeuertür, Hauptschalter', async () => {
    const T = interact.technik, t = world.teleports.find((x) => /Kesselraum 6/.test(x.name));
    player.teleport(t); await settle();
    for (let k = 0; k < 3; k++) { for (let j = 0; j < 6; j++) await frame(); await settle(); }
    const u = [...world.uses.values()].find((x) => x.kind === 'furnace' && !x.open0);
    if (!u) return { ok: false, note: 'keine Feuerung registriert' };
    T.workFurnace(u); await wait(0.6);
    const open = T.furn.get(u).st === 1 && T.furn.get(u).t === 1;
    T.workFurnace(u); await wait(0.3);
    const fed = T.furn.get(u).st === 2 && T.coal.length > 0;
    await wait(0.8); T.workFurnace(u); await wait(0.6);
    const shut = T.furn.get(u).st === 0 && !T.furn.get(u).g.visible;
    const n = world.lamps.length, main = interact.items.find((i) => /Hauptschalter/.test(i.label()));
    main.act(); const dark = world.lamps.filter((L) => L.off).length; main.act();
    const sw = dark > 1000 && !world.lamps.some((L) => L.off && L.color !== 0xff7a30);
    return { ok: open && fed && shut && sw, note: `${T.count.furnace} Feuerungen, ${n} Lampen · auf: ${open}, Kohle: ${fed}, zu: ${shut}, Hauptschalter: ${sw}` };
  });

  await check('Rettungsboot: ausschwenken, einsteigen, fieren', async () => {
    const B = interact.boats, us = [...world.uses.values()].filter((u) => u.kind === 'lifeboat'), u = us.find((x) => !x.spec.out);
    if (us.length !== 16 || !u) return { ok: false, note: us.length + ' Stationen' };
    B.work(u);
    const S = B.live.get(u), hidden = S ? S.clusters.filter((c) => c.off).length : 0;
    const out = await waitFor(() => S.phase === 'out', 14);
    B.board(u, { x: u.x + 2.4, z: u.z - u.spec.side * 2.6 }); await wait(0.3);
    const aboard = !!B.rider && player.mode === 'fly';
    const y0 = player.pos.y;
    interact.run('boat'); await wait(2);
    const lowering = S.y < 0.9 && S.q.length >= 1 && player.pos.y < y0 - 0.1;
    B.reset(u); await wait(0.3);
    const back = !B.live.size && !B.rider && !world.extAll.some((c) => c.off) && player.mode === 'walk' && Math.abs(player.pos.y - DECK_Y.boat) < 0.3;
    return { ok: hidden > 0 && out && aboard && lowering && back, note: `${us.length} Stationen · ausgeschwenkt: ${out}, eingestiegen: ${aboard}, fiert mit Besucher: ${lowering}, wieder an Deck und verstaut: ${back}` };
  });

  // every deck: reachable, built, and how fast it draws here
  const decks = [...new Set(world.teleports.map((t) => t.deck))];
  let worst = 0;
  for (const deck of decks) {
    await check('Deck ' + (DECK_NAMES[deck] || deck), async () => {
      const t = world.teleports.find((x) => x.deck === deck);
      player.teleport(t); await settle();
      // the deck may start loading only after the first frames at the new place: draw some, then wait again
      for (let k = 0; k < 3; k++) { for (let j = 0; j < 6; j++) await frame(); await settle(); }
      for (let k = 0; k < 100 && (streamer?.blocking || streamer?.busy || !(frame.tris > 20000)); k++) { await frame(); await wait(0.1); }
      const ground = world.groundAt(player.pos.x, player.pos.z, player.pos.y + 0.3);
      let n = 0, sum = 0, max = 0, last = 0, calls = 0, tris = 0;
      for (let k = 0; k < 90; k++) { const now = await frame(); if (last) { const ms = now - last; sum += ms; n++; if (ms > max) max = ms; } last = now; if (frame.tris > tris) { tris = frame.tris; calls = frame.calls; } }
      const avg = n ? sum / n : 0;
      if (avg > worst) worst = avg;
      return { ok: ground !== null && tris > 1000, note: `${avg.toFixed(1)} ms (max ${max.toFixed(0)}) · ${calls} Aufrufe · ${(tris / 1e6).toFixed(2)} Mio. Dreiecke` };
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
