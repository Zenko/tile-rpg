/* ============================================================
   THE DAILY RIFT (build 259)
   One gold portal a day, by the fountain in the first district, and the same world behind it for every tester: the world is
   made from the date alone (dailyRiftWorld: the map, palette, family, name, and where the cards are hidden and which ones), so
   everyone hunts the same six cards. One try a day, DAILY_RIFT_MS long; the score is cards found, then how fast all of them
   were found. Results go on a shared board in Journal -> Rifts.

   - Saved in state.progress.dailyRift = { day, entered, done, cards, of, ms }. A new day (todayKey) starts it fresh.
   - The world is an 'explore' world with w.daily = the day. js/puddle-worlds.js builds it under pwWithSeed (same spots for
     everyone) and pwCardId skips its "unowned first" weighting for it. Entered with pwEnterWorld(w, x, y, 'daily'), so the
     warped-time transition, the timer, the Rift Map and leaving all work as for any world.
   - The board reuses the town goal's Firestore path and rule (community/{doc}/folks/{uid}, see HANDOFF section 1a) with the
     doc 'rift-<day>': { cards, of, ms, name, at }. The name is sent only while "Share that I'm playing" is on, otherwise the
     row reads as a nameless dreamer. Without the cloud (offline, signed out, stats sharing off) the board shows only you.
   - Hooks (typeof-guarded there): lifeRenderEntities -> dailyRiftRender, lifeStep -> dailyRiftStep, pwLeave -> dailyRiftLeave,
     renderRiftAtlas -> dailyRiftHtml.
   Look: the DAILY RIFT block at the end of css/latest.css (gold portal tokens --daily-* in css/theme.css).
   ============================================================ */
const DAILY_RIFT_MS = 4 * 60 * 1000;      // how long the daily world lasts: the same for everyone
const DAILY_RIFT_FETCH_MS = 3 * 60 * 1000;
const DAILY_RIFT_COLL = 'community';       // the town goal's collection and rule, doc 'rift-<day>'
let dailyBoard = { day: null, rows: [], fetchedAt: 0 };

function dailyRiftState() {
  const day = todayKey(), p = state.progress;
  if (!p.dailyRift || p.dailyRift.day !== day) p.dailyRift = { day, entered: false, done: false, cards: 0, of: 0, ms: 0 };
  return p.dailyRift;
}
function dailyRiftOpen() {
  if (prefs.cozy) return false;
  if (typeof ensureLevel === 'function' && ensureLevel().level < PW_MIN_LEVEL) return false;
  return !dailyRiftState().entered;
}

// Today's world, made from the date alone.
function dailyRiftWorld(day) {
  const seed = 'daily-' + day, rnd = seeded('pw-pick-' + seed), pick = a => a[Math.floor(rnd() * a.length)], now = Date.now();
  const w = { seed, kind: 'explore', sub: pick(PW_MOODS), startedAt: now, origin: null, cards0: state.ownedCards.length, daily: day };
  PW_KINDS.explore.create(w, rnd, pick, {});
  pwFamilize(w, pick(Object.keys(FAMILIES)));
  w.intro = 'Everyone gets this same rift today. Find every card before it closes.';
  w.endsAt = now + DAILY_RIFT_MS;
  return w;
}
// Where the gold portal stands today: a ground tile two to four steps from the fountain, picked from the date.
function dailyRiftSpot(day) {
  const m = getMap('square'), f = m.props.find(p => p.type === 'fountain') || m.spawn, rnd = seeded('daily-spot-' + day), spots = [];
  for (let y = 1; y < m.h - 1; y++) for (let x = 1; x < m.w - 1; x++) {
    const c = m.rows[y][x], d = Math.abs(x - f.x) + Math.abs(y - f.y);
    if (!m.solid[y][x] && (c === '.' || c === '=') && d >= 2 && d <= 4) spots.push({ x, y });
  }
  return spots.length ? spots[Math.floor(rnd() * spots.length)] : { x: m.spawn.x, y: m.spawn.y - 2 };
}

/* ---------------- on the map ---------------- */
function dailyRiftRender(data, add) {
  if (state.currentDistrict !== 'square' || !dailyRiftOpen() || (typeof pwActive === 'function' && pwActive())) return;
  const s = dailyRiftSpot(todayKey());
  add('life-portal daily', s.x, s.y, '<span class="pt-glow"></span><span class="pt-swirl"></span><span class="pt-core"></span><i></i><i></i><i></i><span class="pt-fam" title="The Daily Rift">⭐</span>');
  if (typeof portalTownShowing === 'function' && portalTownShowing()) showTipOnce('dailyrift');
}
function dailyRiftStep(x, y) {
  if (state.currentDistrict !== 'square' || !dailyRiftOpen()) return;
  const s = dailyRiftSpot(todayKey()); if (s.x !== x || s.y !== y) return;
  if ((typeof pwActive === 'function' && pwActive()) || (typeof pwBusy === 'function' && pwBusy())) return;
  const st = dailyRiftState(); st.entered = true; saveState();
  sfx('splash'); buzz(HAP.tap);
  setTimeout(() => pwEnterWorld(dailyRiftWorld(st.day), x, y, 'daily'), 250);
}

/* ---------------- the run ---------------- */
function dailyRiftTick() {
  const w = typeof pwActive === 'function' && pwActive(); if (!w || !w.daily || w.allAt) return;
  const d = state.districtData[PW_KEY]; if (!d || !d.items || !d.items.length || !d.items.every(i => i.collected)) return;
  w.allAt = Date.now(); saveState();
  toast(`✨ All ${d.items.length} found in ${pwFmt(w.allAt - w.startedAt)}! The rift lets you go.`); sfx('win');
  setTimeout(() => { if (pwActive() === w && !pwBusy()) pwLeave('done'); }, 2600);
}
// From pwLeave: the result of today's try, its Embers, and the board.
function dailyRiftLeave(w) {
  if (!w || !w.daily) return;
  const st = dailyRiftState(); if (st.day !== w.daily || st.done) return;
  const d = state.districtData[PW_KEY], items = (d && d.items) || [], cards = items.filter(i => i.collected).length;
  st.done = true; st.cards = cards; st.of = items.length;
  st.ms = w.allAt ? w.allAt - w.startedAt : Math.min(DAILY_RIFT_MS, Date.now() - w.startedAt);
  const pay = cards * 2 + (cards && cards === items.length ? 6 : 0);
  if (pay) addPebbles(pay, 'dailyRift');
  if (cards && cards === items.length) {   // every card found: the Rift Walker, and after ten such days the Rift Cartographer
    bumpStat('dailyRiftsFull', 1);
    const k = worldCardId('rift', 'walker') || ((state.progress.totals.dailyRiftsFull || 0) >= 10 ? worldCardId('rift', 'cartographer') : null);
    if (k) setTimeout(() => giveSpecialCard(k, 'A keepsake from the Daily Rift'), 2500);
  }
  logEvent('⭐', `Today's rift: ${cards} of ${items.length} cards${cards === items.length && cards ? ` in ${pwFmt(st.ms)}` : ''}.`);
  saveState(); dailyRiftPush();
}

/* ---------------- the shared board ---------------- */
function dailyRiftCloudOk() { return typeof communityCloudOk === 'function' && communityCloudOk(); }
function dailyRiftPush() {
  const st = dailyRiftState(); if (!st.done || !dailyRiftCloudOk()) return;
  const name = typeof presenceSharingOn === 'function' && presenceSharingOn() ? String(state.character.name || '').slice(0, 24) : '';
  try { cloudDb.collection(DAILY_RIFT_COLL).doc('rift-' + st.day).collection('folks').doc(cloudUser.uid).set({ cards: st.cards, of: st.of, ms: st.ms, name, at: Date.now() }).catch(() => {}); } catch (e) { /* offline: the board just shows you */ }
}
function dailyRiftFetch(force) {
  const day = todayKey(), now = Date.now();
  if (!dailyRiftCloudOk() || (!force && dailyBoard.day === day && now - dailyBoard.fetchedAt < DAILY_RIFT_FETCH_MS)) return;
  dailyBoard.fetchedAt = now;
  try {
    cloudDb.collection(DAILY_RIFT_COLL).doc('rift-' + day).collection('folks').get().then(snap => {
      const rows = []; snap.forEach(doc => { const v = doc.data() || {}; if (typeof v.cards === 'number') rows.push({ cards: v.cards, of: v.of || 0, ms: v.ms || 0, name: v.name || '', me: !!cloudUser && doc.id === cloudUser.uid }); });
      dailyBoard = { day, rows, fetchedAt: now };
      if (typeof jSeg !== 'undefined' && jSeg === 'rifts' && typeof renderRiftAtlas === 'function') renderRiftAtlas();
    }).catch(() => {});
  } catch (e) { /* offline */ }
}
// The rows to show: the cloud's, or just your own result, best first (most cards, then fastest).
function dailyRiftRows() {
  const st = dailyRiftState(), rows = dailyBoard.day === st.day ? dailyBoard.rows.slice() : [];
  if (st.done && !rows.some(r => r.me)) rows.push({ cards: st.cards, of: st.of, ms: st.ms, name: state.character.name || '', me: true });
  return rows.sort((a, b) => b.cards - a.cards || a.ms - b.ms);
}
// The section at the top of Journal -> Rifts.
function dailyRiftHtml() {
  dailyRiftFetch(false);
  const st = dailyRiftState(), w = dailyRiftWorld(st.day), f = FAMILIES[w.family], esc = s => (typeof escapeHtml === 'function' ? escapeHtml(String(s)) : String(s));
  const status = st.done ? `You found <b>${st.cards} of ${st.of}</b>${st.cards === st.of && st.cards ? ` in <b>${pwFmt(st.ms)}</b>` : ''}. A new rift opens tomorrow.`
    : st.entered ? 'You are in today\'s rift right now.'
    : !dailyRiftOpen() ? (prefs.cozy ? 'Off in Cozy mode (it has a timer).' : `Opens for you from level ${PW_MIN_LEVEL}.`)
    : `The gold portal stands by the fountain in ${esc(PLACES.square)}. One try a day: find every card before it closes.`;
  const rows = dailyRiftRows(), top = rows.slice(0, 5), mine = rows.findIndex(r => r.me);
  const line = (r, i) => `<li class="${r.me ? 'me' : ''}"><span class="dr-rank">${i + 1}</span><span class="dr-name">${r.me ? 'You' : esc(r.name || `A ${GAME.player.lower}`)}</span><span class="dr-score">${r.cards}/${r.of || '?'}${r.cards && r.cards === r.of ? ` · ${pwFmt(r.ms)}` : ''}</span></li>`;
  let board = top.map(line).join('');
  if (mine >= 5) board += line(rows[mine], mine);
  if (!board) board = `<li class="dr-none">${dailyRiftCloudOk() ? 'Nobody has tried today\'s rift yet.' : 'Other testers\' results show here when cloud backup and play stats are on.'}</li>`;
  return `<section class="ra-row dr-card"><header><h3>⭐ Today's rift</h3><span class="ra-count">${f ? f.icon + ' ' : ''}${esc(w.name)}</span></header><p class="dr-status">${status}</p><ol class="dr-board">${board}</ol></section>`;
}
setInterval(dailyRiftTick, 1000);
