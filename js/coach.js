/* ============================================================
   BATTLE COACH (build 225)
   The live coach line under the board (btCoach in js/battle-ui.js) says what you can do right now. This is its memory: it watches how your turns
   end and, after a LOSS, offers one or two kind, specific tips instead of the generic "try a different card mix".
   What it notices (battle.coach, filled in by coachTrackEnd every time you end a turn):
     unspent      turns you ended with energy left AND a card you could have played          spellHeld  of those, ones where it was a spell
     idle         cards that could attack but stayed home when you ended your turn          firstIdle  an empty board after your first turn although you could play
   plus the shape of your deck (coachDeckShape): how top-heavy it is, and whether you own spells but run none.
   It never judges a win, never lectures (at most two tips, the most useful first), and costs nothing to ignore.
   ============================================================ */
const COACH = { unspent: 2, idle: 3, heavy: 4 };
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
function coachTips(c, shape) {
  const t = [];
  if (c && c.unspent >= COACH.unspent) t.push(c.spellHeld >= 1 ? `You ended ${c.unspent} turns with energy to spare and a playable card in hand, including a spell. Spending your energy each turn is the quickest way to get ahead.` : `You ended ${c.unspent} turns with energy to spare and a playable card in hand. Spending your energy each turn is the quickest way to get ahead.`);
  if (c && c.firstIdle) t.push('Your first turn passed with nothing on the board. A cheap card early gives you something to attack with next turn.');
  if (c && c.idle >= COACH.idle) t.push(`Cards stayed home without attacking ${c.idle} times. Attacking each turn wears them down faster than they can rebuild.`);
  if (shape && shape.size && shape.heavy >= COACH.heavy) t.push(`Your deck has ${shape.heavy} cards that cost 4 or more. That is top-heavy. Cards -> Deck -> Auto-fill rebuilds it with a good mix of cheap cards.`);
  if (shape && shape.ownsSpell && shape.spells === 0) t.push('You own spells but none are in your deck. One or two can swing a close match.');
  return t.slice(0, 2);
}
function coachNote(b, deck, ownedCards) {
  const tips = coachTips(b && b.coach, coachDeckShape(deck, ownedCards));
  return tips.length ? '💡 ' + tips.join(' ') : '';
}
