/* ---------------- journal: an auto-kept event log, plus a notebook of written/drawn notes ---------------- */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function ensureJournal() {
  const pr = state.progress;
  if (!Array.isArray(pr.eventLog)) pr.eventLog = [];
  if (!Array.isArray(pr.notesList)) pr.notesList = [];
  // Migrate the old single free-write note + single drawing (pre-notebook saves) into the list once.
  if (typeof pr.notes === 'string' && pr.notes.trim()) {
    pr.notesList.push({ id: 'note_migrated_w', type: 'write', title: '', text: pr.notes, drawing: '', updatedAt: Date.now() });
  }
  if (typeof pr.drawing === 'string' && pr.drawing) {
    pr.notesList.push({ id: 'note_migrated_d', type: 'draw', title: '', text: '', drawing: pr.drawing, updatedAt: Date.now() });
  }
  delete pr.notes;
  delete pr.drawing;
  return pr;
}
function genNoteId() { return 'note_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function findNote(id) { return ensureJournal().notesList.find(n => n.id === id); }
const EVENT_LOG_MAX = 150;
function logEvent(icon, text, cat) {
  const pr = ensureJournal();
  pr.eventLog.unshift(cat ? { icon, text, at: Date.now(), cat } : { icon, text, at: Date.now() });
  if (pr.eventLog.length > EVENT_LOG_MAX) pr.eventLog.length = EVENT_LOG_MAX;
  saveState();
  if (!journalPanel.classList.contains('hidden') && jSeg === 'eventlog') renderJournal();
}

// Cards trickle in one at a time from a dozen different places (packs, chests, fishing, battles...), so
// logging every single pickup would flood the event log. Instead we tally them and drop one summary entry
// every 6 hours of play - a "here's what you picked up" digest rather than a running card-by-card log.
const CARD_LOG_INTERVAL_MS = 6 * 60 * 60 * 1000;
function ensureCardLog() {
  const pr = state.progress;
  if (!pr.cardLog || typeof pr.cardLog !== 'object') pr.cardLog = { pending: 0, windowStart: Date.now() };
  if (typeof pr.cardLog.pending !== 'number') pr.cardLog.pending = 0;
  if (typeof pr.cardLog.windowStart !== 'number') pr.cardLog.windowStart = Date.now();
  return pr.cardLog;
}
function noteCardsFound(n) {
  if (!n) return;
  ensureCardLog().pending += n;
  maybeFlushCardLog();
}
function maybeFlushCardLog() {
  const log = ensureCardLog();
  if (Date.now() - log.windowStart < CARD_LOG_INTERVAL_MS) return;
  if (log.pending > 0) logEvent('🃏', `Picked up ${log.pending} card${log.pending === 1 ? '' : 's'} over the last 6 hours.`);
  log.pending = 0;
  log.windowStart = Date.now();
  saveState();
}
function fmtLogTime(ts) {
  const d = new Date(ts), now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return sameDay ? time : d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' · ' + time;
}
/* ============================================================
   JOURNAL (v1.89.0): five pages - Today, Log, Battles, Almanac, Notes - and a ? button that opens the Guide and What's new
   in a sheet (js/journal-pages.js). Only the page you are looking at is rendered. Today and the Almanac are in
   js/journal-pages.js; the Log and Battles are here.
   ============================================================ */
let jSeg = 'today', logFilter = 'all', logOpen = -1, btFilter = 'all', btOpen = -1;
const JOURNAL_SEGMENTS = {
  today: { btn: 'segToday', view: 'todayView' },
  eventlog: { btn: 'segEventLog', view: 'eventLogView' },
  battles: { btn: 'segBattles', view: 'battlesView' },
  almanac: { btn: 'segJAlmanac', view: 'almanacView' },
  notes: { btn: 'segNotes', view: 'notesView' },
};
function renderJournal() {
  ensureJournal();
  if (jSeg === 'today') renderToday();
  else if (jSeg === 'eventlog') renderLog();
  else if (jSeg === 'battles') renderBattleLog();
  else if (jSeg === 'almanac') renderAlmanac();
  else if (jSeg === 'notes') renderNotesList();
  updateJournalBadge();
}
function jChips(el, list, current, onPick) {
  el.innerHTML = list.map(([v, label]) => `<button type="button" class="jchip${v === current ? ' active' : ''}" data-v="${v}" aria-pressed="${v === current}">${label}</button>`).join('');
  el.querySelectorAll('.jchip').forEach(b => b.addEventListener('click', () => { sfx('nav'); buzz(HAP.tap); onPick(b.dataset.v); }));
}

/* ---------------- the log: grouped by day, filterable, and every entry links to where it lives ---------------- */
const LOG_FILTERS = [['all', 'All'], ['cards', 'Cards'], ['battles', 'Battles'], ['fishing', 'Fishing'], ['town', 'Town'], ['social', 'Social']];
// Older entries carry no category, so it is worked out from the wording; new code can pass one to logEvent().
function eventCategory(e) {
  if (e.cat) return e.cat;
  const t = e.text || '';
  if (/\b(fish|fished|caught|catch|angler)\b/i.test(t) && !/critter|bug/i.test(t)) return 'fishing';
  if (/\b(match|beat|won|cup|cellar|rival|challenge|puzzle|duel|draft|ghost|boss|battle)\b/i.test(t)) return 'battles';
  if (/\b(letter|friend|friendship|gift|neighbo)/i.test(t)) return 'social';
  if (/\b(card|pack|crafted|released|found|index|donat|trophy|museum wing)\b/i.test(t)) return 'cards';
  return 'town';
}
function logDayLabel(ts) {
  const d = new Date(ts), now = new Date(), y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return 'Today';
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}
function fmtClockTime(ts) { return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }
// Where an entry leads: [button label, action]
function logTarget(e) {
  const cat = eventCategory(e);
  if (cat === 'cards') return ['View in the Almanac', () => jumpAlmanac('cards')];
  if (cat === 'fishing') return ['Open the fish log', () => jumpAlmanac('fish')];
  if (cat === 'battles') return ['See your matches', () => { const i = battleLog().findIndex(b => (e.text || '').includes(b.name)); switchJournalSegment('battles'); btFilter = 'all'; btOpen = i; renderBattleLog(); }];
  if (/letter/i.test(e.text || '')) return ['Open your cottage', () => journalGo({ scene: 'home', district: 'square', name: 'your cottage' })];
  return ['Back to town', () => switchTab('town')];
}
function renderLog() {
  const pr = ensureJournal(), list = document.getElementById('eventLogList');
  jChips(document.getElementById('logChips'), LOG_FILTERS, logFilter, v => { logFilter = v; logOpen = -1; renderLog(); });
  const rows = pr.eventLog.map((e, i) => Object.assign({ i }, e)).filter(e => logFilter === 'all' || eventCategory(e) === logFilter);
  if (!pr.eventLog.length) { list.innerHTML = '<div class="jempty">Nothing logged yet - go win a match, find a card, or explore somewhere new.</div>'; return; }
  if (!rows.length) { list.innerHTML = '<div class="jempty">Nothing like that yet.<button class="jgo" type="button" id="logShowAll">Show everything</button></div>'; document.getElementById('logShowAll').addEventListener('click', () => { logFilter = 'all'; renderLog(); }); return; }
  let html = '', last = '';
  rows.forEach(e => {
    const day = logDayLabel(e.at);
    if (day !== last) { html += `<div class="jday">${day}</div>`; last = day; }
    const open = logOpen === e.i, tgt = open ? logTarget(e) : null;
    html += `<button class="jrow" type="button" data-i="${e.i}" aria-expanded="${open}"><span class="jr-ic">${e.icon}</span><span class="jr-tx">${escapeHtml(e.text)}</span><span class="jr-tm">${fmtClockTime(e.at)}</span>${open ? `<span class="jr-more"><span class="jgo" role="button" data-go="${e.i}">${tgt[0]} →</span></span>` : ''}</button>`;
  });
  list.innerHTML = html;
  list.querySelectorAll('.jrow').forEach(r => r.addEventListener('click', ev => {
    const go = ev.target.closest('[data-go]');
    if (go) { sfx('nav'); buzz(HAP.tap); logTarget(pr.eventLog[+go.dataset.go])[1](); return; }
    sfx('flip'); logOpen = logOpen === +r.dataset.i ? -1 : +r.dataset.i; renderLog();
  }));
}

/* ---------------- battle history: the last matches you played, and your overall record ---------------- */
const BATTLE_LOG_MAX = 40;
const BATTLE_KIND_LABEL = { neighbor: 'Friendly', boss: 'Boss', cellar: 'Cellar', deep: 'Deep cellar', rival: 'Rival', signature: 'Signature', cup: 'Cup', challenge: 'Challenge', draft: 'Draft', ghost: 'Ghost' };
function battleLog() { const p = state.progress; if (!Array.isArray(p.battleLog)) p.battleLog = []; return p.battleLog; }
function recordBattle(won, yielded, prizes) {
  const npc = battle.npc, G = battle.G, p = state.progress;
  const kind = npc.ghost ? 'ghost' : npc.draft ? 'draft' : npc.challenge ? 'challenge' : npc.cup ? 'cup' : npc.dungeon ? (npc.dungeon.deep ? 'deep' : 'cellar') : npc.isRival ? 'rival' : npc.signature ? 'signature' : npc.isBoss ? 'boss' : 'neighbor';
  battleLog().unshift({ at: Date.now(), name: npc.name, icon: opponentPortrait(npc), kind, won, yielded,
    turns: Math.ceil(G.turn / 2) + 1, spirit: Math.max(0, G.p[0].spirit), opp: Math.max(0, G.p[1].spirit),
    district: (npc.dungeon && npc.dungeon.district) || state.currentDistrict, weather: battle.weather,
    floor: npc.dungeon ? npc.dungeon.floor + 1 : null, deckName: npc.playerDeck ? 'Draft deck' : ensureDeckSlots()[state.activeDeckSlot].name,
    prizes: prizes.map(id => { const d = cardDef(id); return d ? `${d.icon} ${d.name}` : ''; }).filter(Boolean) });
  if (battleLog().length > BATTLE_LOG_MAX) battleLog().length = BATTLE_LOG_MAX;
  // win/loss record is kept separately so it covers every match ever played, not just the ones in the list
  if (!p.record) p.record = { won: 0, lost: 0, streak: 0, best: 0 };
  if (won) { p.record.won++; p.record.streak++; p.record.best = Math.max(p.record.best, p.record.streak); }
  else { p.record.lost++; p.record.streak = 0; }
  saveState();
}
const BATTLE_FILTERS = [['all', 'All'], ['won', 'Won'], ['lost', 'Lost'], ['boss', 'Boss'], ['cup', 'Cup']];
function battleMatches(b) {
  return btFilter === 'all' || (btFilter === 'won' && b.won && !b.yielded) || (btFilter === 'lost' && !b.won) || (btFilter === 'boss' && b.kind === 'boss') || (btFilter === 'cup' && b.kind === 'cup');
}
// The last results as dots on a line (up = win), oldest on the left.
function battleSparkline(log) {
  const r = log.slice(0, 10).reverse(); if (r.length < 2) return '';
  const w = 300, st = w / (r.length - 1), pts = r.map((b, i) => [i * st + 6, b.won ? 8 : 26]);
  return `<svg viewBox="0 0 312 34" width="100%" height="34" role="img" aria-label="Your last ${r.length} results, oldest first"><polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="var(--stone-edge)" stroke-width="2"/>${pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="${i === pts.length - 1 ? 5 : 3.5}" fill="${r[i].won ? 'var(--win-glow)' : 'var(--lose-glow)'}"/>`).join('')}</svg>`;
}
function renderBattleLog() {
  const p = state.progress, r = p.record || { won: 0, lost: 0, streak: 0, best: 0 }, total = r.won + r.lost, log = battleLog();
  document.getElementById('battleStats').innerHTML = `
    <div class="bl-stat"><b>${r.won}–${r.lost}</b><span>won–lost</span></div>
    <div class="bl-stat"><b>${total ? Math.round(r.won / total * 100) : 0}%</b><span>win rate</span></div>
    <div class="bl-stat"><b>${r.streak}</b><span>win streak</span></div>
    <div class="bl-stat"><b>${r.best}</b><span>best streak</span></div>`;
  const trend = document.getElementById('battleTrend'), recent = log.slice(0, 10);
  trend.classList.toggle('hidden', recent.length < 2);
  trend.innerHTML = recent.length < 2 ? '' : `<div class="jsoft jbt-head"><span>Last ${recent.length} matches</span><span>${recent.filter(b => b.won && !b.yielded).length} wins</span></div>${battleSparkline(log)}`;
  jChips(document.getElementById('battleChips'), BATTLE_FILTERS, btFilter, v => { btFilter = v; btOpen = -1; renderBattleLog(); });
  const list = document.getElementById('battleLogList');
  if (!log.length) { list.innerHTML = '<div class="jempty">No matches yet. Tap a neighbor in town to play one.<button class="jgo" type="button" id="btToTown">Go to town</button></div>'; document.getElementById('btToTown').addEventListener('click', () => switchTab('town')); return; }
  const rows = log.map((b, i) => Object.assign({ i }, b)).filter(battleMatches);
  if (!rows.length) { list.innerHTML = '<div class="jempty">No matches like that yet.<button class="jgo" type="button" id="btShowAll">Show all matches</button></div>'; document.getElementById('btShowAll').addEventListener('click', () => { btFilter = 'all'; renderBattleLog(); }); return; }
  list.innerHTML = rows.map(b => {
    const where = b.floor ? `floor ${b.floor}` : (DISTRICTS[b.district] ? DISTRICTS[b.district].name : '');
    const wx = b.weather && b.weather !== 'clear' && WEATHER_KINDS[b.weather] ? ' ' + WEATHER_KINDS[b.weather].icon : '';
    const result = b.yielded ? 'Stepped away' : b.won ? `Won · ${b.spirit} Spirit left` : `Lost · they had ${b.opp} Spirit left`;
    const open = btOpen === b.i, mine = log.filter(x => x.name === b.name && !x.yielded), w = mine.filter(x => x.won).length;
    const npc = open ? rematchNpc(b) : null;
    return `<div class="bl-entry"><button class="bl-head" type="button" data-i="${b.i}" aria-expanded="${open}"><span class="le-icon">${b.icon}</span><span class="le-text"><b>${escapeHtml(b.name)}</b><span class="q-kind">${BATTLE_KIND_LABEL[b.kind] || ''}</span>
      <div>${result} · ${b.turns} turn${b.turns === 1 ? '' : 's'}</div></span><span class="bl-result">${b.yielded ? '🏳️' : b.won ? '✅' : '❌'}</span></button>
      ${open ? `<div class="bl-detail"><div class="jsoft">${fmtLogTime(b.at)} · ${where}${wx}${b.deckName ? ' · ' + escapeHtml(b.deckName) : ''}</div>
        <div class="jsoft">Recent record against ${escapeHtml(b.name)}: <b>${w}–${mine.length - w}</b></div>
        ${b.prizes && b.prizes.length ? `<div class="bl-prize">🎁 ${b.prizes.map(escapeHtml).join(', ')}</div>` : ''}
        ${npc ? `<div><button class="jgo" type="button" data-rematch="${b.i}">⚔️ Rematch</button></div>` : (b.kind === 'neighbor' || b.kind === 'boss') && DISTRICTS[b.district] ? `<div class="jsoft">📍 Find them in ${DISTRICTS[b.district].name}</div>` : ''}</div>` : ''}</div>`;
  }).join('');
  list.querySelectorAll('.bl-head').forEach(h => h.addEventListener('click', () => { sfx('flip'); btOpen = btOpen === +h.dataset.i ? -1 : +h.dataset.i; renderBattleLog(); }));
  list.querySelectorAll('[data-rematch]').forEach(btn => btn.addEventListener('click', () => {
    const npc = rematchNpc(log[+btn.dataset.rematch]); if (!npc) return;
    sfx('tap'); buzz(HAP.tap); switchTab('town'); setTimeout(() => startBattle(npc), 120);
  }));
}
// A neighbor or boss who is in the district you are standing in can be challenged again from here.
function rematchNpc(b) {
  if (!b || (b.kind !== 'neighbor' && b.kind !== 'boss') || b.district !== state.currentDistrict) return null;
  const d = ensureDistrictData(state.currentDistrict);
  if (b.kind === 'boss') return d.boss && d.boss.name === b.name ? d.boss : null;
  return (d.npcs || []).find(n => n.name === b.name) || null;
}

function switchJournalSegment(key) {
  sfx('nav'); buzz(HAP.tap);
  jSeg = key;
  Object.entries(JOURNAL_SEGMENTS).forEach(([k, s]) => {
    const btn = document.getElementById(s.btn); btn.classList.toggle('active', k === key); btn.setAttribute('aria-selected', k === key);
    document.getElementById(s.view).classList.toggle('hidden', k !== key);
  });
  if (key !== 'notes') closeNoteEditor();
  renderJournal();
}
Object.entries(JOURNAL_SEGMENTS).forEach(([k, s]) => document.getElementById(s.btn).addEventListener('click', () => switchJournalSegment(k)));
