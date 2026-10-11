/* ============================================================
   PLAYTEST TELEMETRY FOR THE AI SYSTEMS (build 230)
   Tuning the AI by feel only goes so far, so each system leaves small anonymous COUNTERS in state.progress.telemetry:
     styles    your wins/losses (w, l) against each opponent play style           kinds   against plain neighbours, bosses and Rook
     tilt      your wins/losses by the adaptive-difficulty tilt (-2..+2), which shows whether adaptive difficulty really evens things out
     cards     for every card in the deck you took into a match: matches played with it (p) and won (w)
     approach  neighbours who came to you: started / accepted / ignored           coach   loss tips shown, and which
     events    how often each daily event was picked    meet  neighbour encounters by kind    stories  messages delivered
     rook      duels he studied and duels where he brought counters               adapt  matches eased / pushed by adaptive difficulty
   No names, no positions, no free text: only numbers keyed by card ids and system names. They ride along in the stats summary the game already sends
   (statsSummary().ai, js/cloud-save.js; the "Share playtest stats" switch in Settings controls it) and scripts/analyze-stats.py turns an export of the
   Firebase 'stats' collection into a report: cards that win too often or too rarely, whether styles and the tilt behave, how welcome approaches are.
   ============================================================ */
function teleStore() { const p = state.progress; if (!p.telemetry || typeof p.telemetry !== 'object') p.telemetry = {}; return p.telemetry; }
// teleInc('approach.started') -> telemetry.approach.started += 1. Never throws: telemetry must not be able to break the game.
function teleInc(path, n) {
  try {
    const parts = String(path).split('.'); let o = teleStore();
    for (let i = 0; i < parts.length - 1; i++) { if (!o[parts[i]] || typeof o[parts[i]] !== 'object') o[parts[i]] = {}; o = o[parts[i]]; }
    const k = parts[parts.length - 1]; o[k] = (typeof o[k] === 'number' ? o[k] : 0) + (n == null ? 1 : n);
  } catch (e) { /* ignore */ }
}
function teleWL(group, key, won) { teleInc(`${group}.${key}.${won ? 'w' : 'l'}`); }
// A finished match against a plain neighbour, a boss or Rook (not a yield, not a neutral / puzzle / special match).
function teleBattle(b, won) {
  try {
    const npc = b && b.npc; if (!npc || b.neutral || b.puzzle) return;
    const kind = npc.isRival ? 'rival' : npc.isBoss ? 'boss' : npc.adaptive ? 'neighbour' : null; if (!kind) return;
    teleWL('kinds', kind, won);
    teleWL('styles', npc.aiStyle || 'plain', won);
    if (typeof npc.tilt === 'number') teleWL('tilt', String(npc.tilt), won);
    const seen = new Set();
    (state.deck || []).forEach(id => { const base = BattleEngine.baseIdOf(id); if (seen.has(base)) return; seen.add(base); teleInc(`cards.${base}.p`); if (won) teleInc(`cards.${base}.w`); });
  } catch (e) { /* ignore */ }
}
// The summary that goes into statsSummary().ai: the counters as they are (they are already small), or null when nothing happened yet.
function teleSummary() { const t = state.progress && state.progress.telemetry; return t && Object.keys(t).length ? JSON.parse(JSON.stringify(t)) : null; }
