/* ============================================================
   BATTLE COACH (build 225)
   The live coach line under the board (btCoach in js/battle-ui.js) says what you can do right now. This is its memory: it watches how your turns
   end and, after a LOSS, offers one or two kind, specific tips instead of the generic "try a different card mix".
   What it notices (battle.coach, filled in by coachTrackEnd every time you end a turn):
     unspent      turns you ended with energy left AND a card you could have played          spellHeld  of those, ones where it was a spell
     idle         cards that could attack but stayed home when you ended your turn          firstIdle  an empty board after your first turn although you could play
   plus the shape of your deck (coachDeckShape): how top-heavy it is, and whether you own spells but run none.
   Across losses (state.progress.coachHist, the tips of your last few lost matches) a tip that keeps coming up is said first and says so.
   It never judges a win, never lectures (at most two tips, the most useful first), and costs nothing to ignore.
   ============================================================ */
const COACH = { unspent: 2, idle: 3, heavy: 4, recurring: 2 };
function coachNew() { return { turns: 0, unspent: 0, spellHeld: 0, wasted: 0, idle: 0, firstIdle: false }; }
function coachTrackEnd(b) {
  if (!b || !b.G || b.puzzle) return;
  const c = b.coach || (b.coach = coachNew()), G = b.G, me = G.p[0];
  c.turns++;
  const playable = me.hand.filter(x => BattleEngine.canPlay(G, 0, x.uid).ok);
  if (playable.length) { c.unspent++; c.wasted += me.energy; if (playable.some(x => x.spell)) c.spellHeld++; }
  c.idle += me.board.filter(x => x.ready && x.attacks === 0 && BattleEngine.legalTargets(G, 0, x.uid).length).length;
  if (c.turns === 1 && !me.board.length && playable.length) c.firstIdle = true;
}
function coachDeckShape(deck, ownedCards) {
  const defs = (deck || []).map(id => BattleEngine.defOf(id)).filter(Boolean);
  const heavy = defs.filter(d => d.cost >= 4).length, spells = defs.filter(d => d.spell).length;
  const ownsSpell = (ownedCards || []).some(id => { const d = BattleEngine.defOf(id); return d && d.spell; });
  return { heavy, spells, ownsSpell, size: defs.length };
}
// The tips for a lost match, most useful first (at most two). `c` is battle.coach, `shape` is coachDeckShape().
function coachTipsWithIds(c, shape) {
  const t = [], P = (id, text) => t.push({ id, text });
  if (c && c.unspent >= COACH.unspent) P('unspent', c.spellHeld >= 1 ? `You ended ${c.unspent} turns with energy to spare and a playable card in hand, including a spell. Spending your energy each turn is the quickest way to get ahead.` : `You ended ${c.unspent} turns with energy to spare and a playable card in hand. Spending your energy each turn is the quickest way to get ahead.`);
  if (c && c.firstIdle) P('firstIdle', 'Your first turn passed with nothing on the board. A cheap card early gives you something to attack with next turn.');
  if (c && c.idle >= COACH.idle) P('idle', `Cards stayed home without attacking ${c.idle} times. Attacking each turn wears them down faster than they can rebuild.`);
  if (shape && shape.size && shape.heavy >= COACH.heavy) P('heavy', `Your deck has ${shape.heavy} cards that cost 4 or more. That is top-heavy. Cards -> Deck -> Auto-fill rebuilds it with a good mix of cheap cards.`);
  if (shape && shape.ownsSpell && shape.spells === 0) P('noSpells', 'You own spells but none are in your deck. One or two can swing a close match.');
  return t.slice(0, 2);
}
// The tips for a lost match as plain text, most useful first (at most two). `c` is battle.coach, `shape` is coachDeckShape().
function coachTips(c, shape) { return coachTipsWithIds(c, shape).map(x => x.text); }
function coachNote(b, deck, ownedCards) {
  const tips = coachTipsWithIds(b && b.coach, coachDeckShape(deck, ownedCards));
  // Across losses: a tip that came up in 2 or more of your last 5 lost matches is said first, and says that it keeps coming up.
  const p = state.progress, hist = Array.isArray(p.coachHist) ? p.coachHist : (p.coachHist = []);
  const count = id => hist.slice(-5).filter(h => h.includes(id)).length;
  tips.forEach(t => { t.recurring = count(t.id) >= COACH.recurring; });
  tips.sort((x, y) => (y.recurring ? 1 : 0) - (x.recurring ? 1 : 0));
  hist.push(tips.map(t => t.id)); if (hist.length > 8) hist.splice(0, hist.length - 8);
  if (tips.length && typeof teleInc === 'function') { teleInc('coach.shown'); tips.forEach(t => { teleInc('coach.' + t.id); if (t.recurring) teleInc('coach.recurring'); }); }
  return tips.length ? '💡 ' + tips.map(t => (t.recurring ? 'This keeps coming up. ' : '') + t.text).join(' ') : '';
}
