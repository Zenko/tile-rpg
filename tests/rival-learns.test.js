// Rook learns: he studies the deck you bring and swaps a few cards for counters, within his chapter's rarity and the spell cap.
module.exports = async (page, assert) => {
  const r = await page.evaluate(() => {
    const out = {}, d = id => BattleEngine.defOf(id);
    // reading a deck
    const spellsId = CARD_POOL.filter(c => c.spell && !c.exclusive).slice(0, 4).map(c => c.id), guards = CARD_POOL.filter(c => !c.spell && c.kw.includes('guard') && !c.exclusive).map(c => c.id);
    const guardDeck = Array.from({ length: 12 }, (_, i) => guards[i % guards.length]);
    const sg = rookStudyFrom(guardDeck); out.readGuards = sg.guards === 12 && sg.spells === 0;
    const sp = rookStudyFrom(spellsId.concat(guardDeck.slice(0, 8))); out.readSpells = sp.spells === 4;
    // themes
    out.themeSpells = rookThemes({ duels: 2, guards: 5, swifts: 0, avgCost: 2.8, spells: 0 }).some(t => t.id === 'spells');
    out.themeRush = rookThemes({ duels: 2, guards: 0, swifts: 4, avgCost: 2.8, spells: 0 }).some(t => t.id === 'blockers');
    out.themeCheap = rookThemes({ duels: 2, guards: 0, swifts: 0, avgCost: 2.0, spells: 0 }).some(t => t.id === 'blockers');
    out.themeHeavy = rookThemes({ duels: 2, guards: 0, swifts: 0, avgCost: 3.6, spells: 0 }).some(t => t.id === 'rush');
    out.themeShield = rookThemes({ duels: 2, guards: 0, swifts: 0, avgCost: 2.8, spells: 4 }).some(t => t.id === 'shields');
    out.noThemes = rookThemes({ duels: 0 }).length === 0 && rookThemes({ duels: 3, guards: 1, swifts: 1, avgCost: 2.8, spells: 1 }).length === 0;
    // learning folds in a duel
    state.progress.rival = { chapter: 2, district: null, arrivedAt: 0, awayUntil: 0, met: false, losses: 0 };
    rookNoteDuel(guardDeck); const st = rookStudy(); out.learned = st.duels === 1 && st.guards === 12;
    rookNoteDuel(Array.from({ length: 12 }, () => 'sprout')); out.fades = rookStudy().guards < 12 && rookStudy().guards > 0;
    // adapting: a guard-heavy player gets spells in Rook's deck, same size, spell cap kept, rarity within the chapter
    state.progress.rival.study = { duels: 3, avgCost: 2.8, guards: 6, swifts: 0, spells: 0, fam: null };
    const base = BattleEngine.suggestDeck((() => { const c = {}; CARD_POOL.filter(x => !x.spell && !x.exclusive && x.rarity === 'common').slice(0, 16).forEach(x => { c[x.id] = 2; }); return c; })());
    let added = 0, sized = true, capOk = true, rarityOk = true, notes = 0;
    for (let i = 0; i < 40; i++) {
      const ad = rookAdaptDeck(base, 2); sized = sized && ad.deck.length === 12;
      const nSp = ad.deck.filter(id => d(id).spell).length; capOk = capOk && nSp <= ROOK_LEARN.spellCap;
      const maxR = Math.min(4, 1 + Math.ceil(2 / 2)); rarityOk = rarityOk && ad.deck.filter(id => !base.includes(id)).every(id => RARITY_ORDER.indexOf(d(id).rarity) <= maxR);
      added += ad.deck.filter(id => !base.includes(id)).length; if (ad.notes.length) notes++;
    }
    out.sized = sized; out.cap = capOk; out.rarity = rarityOk; out.swapped = added > 0 && added / 40 <= ROOK_LEARN.swaps; out.noted = notes > 30;
    out.hint = /^ I noticed you lean on Watch cards/.test(rookTalkHint());
    // no study yet: his deck is left alone
    state.progress.rival.study = { duels: 0, avgCost: 0, guards: 0, swifts: 0, spells: 0, fam: null };
    out.untouched = JSON.stringify(rookAdaptDeck(base, 2).deck) === JSON.stringify(base) && rookTalkHint() === '';
    return out;
  });
  Object.keys(r).forEach(k => assert.ok(r[k], 'Rook learns: ' + k));
  // a real duel start: after studying a Watch-heavy deck his deck carries counters and the versus note says so; finishing records the duel
  const d = await page.evaluate(() => {
    const out = {}, guards = CARD_POOL.filter(c => !c.spell && c.kw.includes('guard') && !c.exclusive).map(c => c.id);
    state.deck = Array.from({ length: 12 }, (_, i) => guards[i % guards.length]); CARD_POOL.slice(0, 30).forEach(c => state.ownedCards.push(c.id, c.id)); state.deck.forEach(id => state.ownedCards.push(id, id)); prefs.tossStyle = 'skip';
    state.progress.rival = { chapter: 3, district: null, arrivedAt: 0, awayUntil: 0, met: false, losses: 0, study: { duels: 3, avgCost: 2.8, guards: 8, swifts: 0, spells: 0, fam: null } };
    const opp = { id: 'rival-rook', name: 'Rook', icon: '🎭', isRival: true, x: 1, y: 1, deck: rivalDeck(3), profile: rivalProfile(3) };
    startBattleNow(opp, 0);
    out.note = /spells/.test(opp.deckNote || '');
    out.started = !!battle && battle.G.p[1].deck.length + battle.G.p[1].hand.length === 12;
    const before = rookStudy().duels; battle.G.over = true; battle.G.winner = 0; battle.G.events = []; btFinish();
    out.recorded = rookStudy().duels === before + 1;
    return out;
  });
  assert.ok(d.note, 'the versus note says what he brought'); assert.ok(d.started, 'the duel starts with a full deck'); assert.ok(d.recorded, 'the duel is studied');
};
