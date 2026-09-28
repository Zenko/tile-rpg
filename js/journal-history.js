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
function logEvent(icon, text) {
  const pr = ensureJournal();
  pr.eventLog.unshift({ icon, text, at: Date.now() });
  if (pr.eventLog.length > EVENT_LOG_MAX) pr.eventLog.length = EVENT_LOG_MAX;
  saveState();
  if (!journalPanel.classList.contains('hidden') && !document.getElementById('eventLogView').classList.contains('hidden')) renderJournal();
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
function renderJournal() {
  const pr = ensureJournal();
  eventLogList.innerHTML = '';
  if (!pr.eventLog.length) {
    eventLogList.innerHTML = '<div class="panel-desc">Nothing logged yet - go win a match, find a card, or explore somewhere new.</div>';
  } else {
    pr.eventLog.forEach(e => {
      const el = document.createElement('div');
      el.className = 'log-entry';
      el.innerHTML = `<span class="le-icon">${e.icon}</span><span class="le-text">${escapeHtml(e.text)}<div class="le-time">${fmtLogTime(e.at)}</div></span>`;
      eventLogList.appendChild(el);
    });
  }
  renderNotesList();
  renderChangelog();
  renderBattleLog();
  renderGuide();
}

const JOURNAL_SEGMENTS = {
  eventlog: { btn: 'segEventLog', view: 'eventLogView' },
  battles: { btn: 'segBattles', view: 'battlesView' },
  guide: { btn: 'segGuide', view: 'guideView' },
  notes: { btn: 'segNotes', view: 'notesView' },
  changelog: { btn: 'segChangelog', view: 'changelogView' },
};

/* ---------------- battle history: the last matches you played, and your overall record ---------------- */
const BATTLE_LOG_MAX = 40;
const BATTLE_KIND_LABEL = { neighbor: 'Friendly', boss: 'Boss', cellar: 'Cellar', deep: 'Deep cellar', rival: 'Rival', signature: 'Signature', cup: 'Cup', challenge: 'Challenge' };
function battleLog() { const p = state.progress; if (!Array.isArray(p.battleLog)) p.battleLog = []; return p.battleLog; }
function recordBattle(won, yielded, prizes) {
  const npc = battle.npc, G = battle.G, p = state.progress;
  const kind = npc.challenge ? 'challenge' : npc.cup ? 'cup' : npc.dungeon ? (npc.dungeon.deep ? 'deep' : 'cellar') : npc.isRival ? 'rival' : npc.signature ? 'signature' : npc.isBoss ? 'boss' : 'neighbor';
  battleLog().unshift({ at: Date.now(), name: npc.name, icon: opponentPortrait(npc), kind, won, yielded,
    turns: Math.ceil(G.turn / 2) + 1, spirit: Math.max(0, G.p[0].spirit), opp: Math.max(0, G.p[1].spirit),
    district: (npc.dungeon && npc.dungeon.district) || state.currentDistrict, weather: battle.weather,
    floor: npc.dungeon ? npc.dungeon.floor + 1 : null, deckName: ensureDeckSlots()[state.activeDeckSlot].name,
    prizes: prizes.map(id => { const d = cardDef(id); return d ? `${d.icon} ${d.name}` : ''; }).filter(Boolean) });
  if (battleLog().length > BATTLE_LOG_MAX) battleLog().length = BATTLE_LOG_MAX;
  // win/loss record is kept separately so it covers every match ever played, not just the ones in the list
  if (!p.record) p.record = { won: 0, lost: 0, streak: 0, best: 0 };
  if (won) { p.record.won++; p.record.streak++; p.record.best = Math.max(p.record.best, p.record.streak); }
  else { p.record.lost++; p.record.streak = 0; }
  saveState();
}
function renderBattleLog() {
  const p = state.progress, r = p.record || { won: 0, lost: 0, streak: 0, best: 0 }, total = r.won + r.lost;
  document.getElementById('battleStats').innerHTML = `
    <div class="bl-stat"><b>${r.won}–${r.lost}</b><span>won–lost</span></div>
    <div class="bl-stat"><b>${total ? Math.round(r.won / total * 100) : 0}%</b><span>win rate</span></div>
    <div class="bl-stat"><b>${r.streak}</b><span>win streak</span></div>
    <div class="bl-stat"><b>${r.best}</b><span>best streak</span></div>`;
  const list = document.getElementById('battleLogList'), log = battleLog();
  if (!log.length) { list.innerHTML = '<div class="panel-desc">No matches yet. Tap a neighbor in town to play one.</div>'; return; }
  list.innerHTML = log.map(b => {
    const where = b.floor ? `floor ${b.floor}` : (DISTRICTS[b.district] ? DISTRICTS[b.district].name : '');
    const wx = b.weather && b.weather !== 'clear' && WEATHER_KINDS[b.weather] ? ' ' + WEATHER_KINDS[b.weather].icon : '';
    const result = b.yielded ? 'Stepped away' : b.won ? `Won · ${b.spirit} Spirit left` : `Lost · they had ${b.opp} Spirit left`;
    return `<div class="log-entry bl-entry ${b.won ? 'won' : 'lost'}"><span class="le-icon">${b.icon}</span><span class="le-text">
      <b>${escapeHtml(b.name)}</b><span class="q-kind">${BATTLE_KIND_LABEL[b.kind] || ''}</span>
      <div>${result} · ${b.turns} turn${b.turns === 1 ? '' : 's'}</div>
      ${b.prizes && b.prizes.length ? `<div class="bl-prize">🎁 ${b.prizes.map(escapeHtml).join(', ')}</div>` : ''}
      <div class="le-time">${fmtLogTime(b.at)} · ${where}${wx}${b.deckName ? ' · ' + escapeHtml(b.deckName) : ''}</div></span>
      <span class="bl-result">${b.yielded ? '🏳️' : b.won ? '✅' : '❌'}</span></div>`;
  }).join('');
}
function switchJournalSegment(key) {
  sfx('nav'); buzz(HAP.tap);
  Object.entries(JOURNAL_SEGMENTS).forEach(([k, s]) => {
    document.getElementById(s.btn).classList.toggle('active', k === key);
    document.getElementById(s.view).classList.toggle('hidden', k !== key);
  });
  if (key !== 'notes') closeNoteEditor();
  if (key === 'changelog') markChangelogSeen();
  renderJournal();
}
document.getElementById('segEventLog').addEventListener('click', () => switchJournalSegment('eventlog'));
document.getElementById('segBattles').addEventListener('click', () => switchJournalSegment('battles'));
document.getElementById('segGuide').addEventListener('click', () => switchJournalSegment('guide'));
document.getElementById('segNotes').addEventListener('click', () => switchJournalSegment('notes'));
document.getElementById('segChangelog').addEventListener('click', () => switchJournalSegment('changelog'));

