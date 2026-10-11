/* ============================================================
   NPC BRAIN (build 216)
   How a neighbour decides things. This first stage is their DECK: a plain neighbour no longer fields a deck that is only random
   plus their district's family. Each one now plans it from four things, strongest first:
     1. what you suggested (Chat -> Suggest a deck), taken more seriously the more hearts they have for you,
     2. the weather (rain turns them to Deriva, storms to Susurro, snow to Recuerdo, clear skies to Brote, mist to Susurro),
     3. the season's own cards (SEASONS[..].cards),
     4. their own taste: a favourite family and a temperament (bold / steady) that never change, worked out from their name.
   The plan is a short list of "kept" cards handed to BattleEngine.suggestDeck, which fills the rest of the deck with its usual cost curve,
   so a planned deck still plays like every other deck. Picks are capped by the neighbour's foe tier (gentle neighbours never keep a
   rare card), so a plan changes what a deck is ABOUT without making it harder.
   The plan also returns a one-line note ("Wren packed Deriva cards for the rain") shown under their name on the versus card.
   Later stages (walking, meeting each other, approaching you) will read the same taste and mood.
   Nothing here is saved except the player's suggestion: state.progress.friends[key].deckHint = { id, day }.
   ============================================================ */
const NPC_WEATHER_FAMILY = { clear: 'grove', cloudy: 'wind', rain: 'tide', storm: 'wind', snow: 'stone' };
const NPC_WEATHER_WORDS = { clear: 'clear skies', cloudy: 'the mist', rain: 'the rain', storm: 'the storm', snow: 'the snow' };
const NPC_HINTS = [
  { id: 'family:grove', label: '🌿 Brote cards', say: 'Brote cards? Lovely, I will pack some.' },
  { id: 'family:stone', label: '🪨 Recuerdo cards', say: 'Recuerdo, solid and steady. I can do that.' },
  { id: 'family:tide', label: '🌊 Deriva cards', say: 'Deriva it is. I like the sound of that.' },
  { id: 'family:wind', label: '🪶 Susurro cards', say: 'Susurro cards, light on their feet. Good idea.' },
  { id: 'tough', label: '💪 Something tougher', say: 'You want a real challenge? Then I will bring my sturdiest cards.' },
  { id: 'gentle', label: '🫖 Something gentler', say: 'A softer deck for a softer day. I will go easy.' },
  { id: 'seasonal', label: '🍂 Whatever suits the season', say: 'Something seasonal. I will see what the weather brings.' }
];
function npcHintDef(id) { return NPC_HINTS.find(h => h.id === id) || null; }
function npcTaste(f) {
  const h = foeSeedHash('taste:' + (f && f.name));
  const fams = Object.keys(FAMILIES);
  return { family: fams[h % fams.length], bold: ((h >> 5) & 1) === 1 };
}
function npcDeckHint(f) {
  const fr = f && friendOf(f), hint = fr && fr.deckHint;
  return hint && npcHintDef(hint.id) ? hint : null;
}
// A neighbour agrees to a suggestion only once they know you at least a little. Returns what they say.
function npcAcceptHint(f, id) {
  const def = npcHintDef(id), hearts = friendHearts(f);
  if (!def) return { ok: false, say: '' };
  if (hearts < 1) return { ok: false, say: 'Hmm, we hardly know each other yet. Maybe once we are better friends?' };
  const fr = friendOf(f);
  fr.deckHint = { id, day: todayKey() };
  saveState();
  return { ok: true, say: def.say + (hearts >= 3 ? ' Anything for a friend.' : '') };
}
function npcCardOk(id, tier) {
  const d = BattleEngine.defOf(id);
  return !!d && !d.spell && !d.foe && !d.exclusive && !d.crafted && RARITY_ORDER.indexOf(d.rarity) <= tier - 1;
}
function npcCardScore(d) { return d.power + d.grit + 2 * d.kw.length; }
function npcFamilyPicks(fam, n, tier) {
  const ids = CARD_POOL.filter(c => CARD_FAMILY[c.id] === fam && npcCardOk(c.id, tier)).map(c => c.id);
  return shuffledArr(ids).slice(0, n);
}
function npcSeasonPicks(n, tier) { return shuffledArr(seasonDef().cards.filter(id => npcCardOk(id, tier))).slice(0, n); }
function npcStylePicks(kind, n, tier) {
  const ids = CARD_POOL.map(c => c.id).filter(id => npcCardOk(id, tier));
  const d = id => BattleEngine.defOf(id);
  const pool = kind === 'tough' ? ids.filter(id => d(id).cost >= 3).sort((a, b) => npcCardScore(d(b)) - npcCardScore(d(a))).slice(0, 14)
    : ids.filter(id => d(id).cost <= 2);
  return shuffledArr(pool).slice(0, n);
}
// Plan a plain neighbour's deck. Returns { keep: [card ids], note } (never null for a neighbour; keep may be short).
function npcDeckPlan(f, tier) {
  tier = Math.max(1, Math.min(4, tier || foeTierFor(false)));
  const taste = npcTaste(f), hearts = friendHearts(f), hint = npcDeckHint(f), weather = weatherNow(), wFam = NPC_WEATHER_FAMILY[weather] || taste.family;
  const keep = [], why = [];
  const add = (ids, reason) => { let n = 0; ids.forEach(id => { if (!keep.includes(id) && keep.length < 7) { keep.push(id); n++; } }); if (n && reason && !why.includes(reason)) why.push(reason); };
  if (hint) {                                          // your suggestion: one more card per heart, up to five
    const n = Math.max(1, Math.min(5, hearts)), hd = npcHintDef(hint.id);
    if (hint.id.startsWith('family:')) add(npcFamilyPicks(hint.id.slice(7), n, tier), `${FAMILIES[hint.id.slice(7)].name} cards (as you suggested)`);
    else if (hint.id === 'seasonal') add(npcSeasonPicks(n, tier), `${seasonDef().name.toLowerCase()} cards (as you suggested)`);
    else add(npcStylePicks(hint.id, n, tier), hint.id === 'tough' ? 'their sturdiest cards (as you suggested)' : 'a gentler deck (as you suggested)');
  }
  add(npcFamilyPicks(wFam, 2, tier), `${FAMILIES[wFam].name} cards for ${NPC_WEATHER_WORDS[weather] || 'the day'}`);
  add(npcSeasonPicks(2, tier), `${seasonDef().name.toLowerCase()} cards`);
  add(npcFamilyPicks(taste.family, 1, tier), `a favourite ${FAMILIES[taste.family].name} card`);
  if (!hint && taste.bold) add(npcStylePicks('tough', 1, tier), '');
  const note = why.length ? `${f.name} packed ${why.slice(0, 2).join(' and ')}.` : '';
  return { keep, note };
}
