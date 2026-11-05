// The interactive-table keywords wired into the rest of the game (build 340): weekly rules, neighbours' signature decks, companion
// perks, Workshop skills, the daily puzzle's search, the trade wishlist and the new card art.
module.exports = async (page, assert) => {
  const r = await page.evaluate(() => {
    const E = BattleEngine, out = {};
    // weekly rules: one for each mechanic, and their mods do what the chip says
    out.weeks = ['snare', 'nestle', 'combo', 'flank', 'glimpse'].filter(id => WEEKLY_RULES.some(w => w.id === id));
    const G = E.newGame(['pinwheel', 'pebble', 'pebble'], ['pebble', 'pebble', 'pebble'], null, { seed: 3, mods: { flankBonus: 1, snareBonus: 2 }, first: 0 });
    const me = G.p[0], op = G.p[1]; E.startTurn(G);
    me.hand = [E.makeCard('pinwheel', 900)]; me.board = [E.makeCard('pebble', 901)]; me.energy = 5;
    E.playCard(G, 0, 900, undefined, { slot: 1 });
    out.flank = me.board.find(c => c.id === 'pinwheel').power;            // 1 + 2 + 1
    op.snares = [E.makeCard('bramble-snare', 902)]; const a = E.makeCard('geode', 903); a.ready = true; me.board.push(a); op.board = [E.makeCard('pebble', 904)];
    E.attack(G, 0, 903, { kind: 'card', uid: 904 }); out.snareHit = a.grit - a.hp;   // 3 + 2
    // neighbours: some love a new keyword, and their deck shows it (with Snares)
    let fan = null; for (let i = 0; i < 400 && !fan; i++) { const f = { name: 'N' + i, district: 'square' }; if (SIG_THEMES_NEW.includes(signatureTheme(f))) fan = f; }
    out.fan = !!fan;
    if (fan) { const t = signatureTheme(fan), d = signatureDeck(fan); out.deckLen = d.length; out.themed = d.filter(id => cardDef(id).kw.includes(t)).length; out.snares = d.filter(id => E.SPELLS[cardDef(id).spell] && E.SPELLS[cardDef(id).spell].snare).length; }
    out.perks = ['nestle', 'flank', 'combo', 'glimpse'].every(k => COMPANION_PERKS[KW_PERK[k]]);
    out.craft = CRAFT.skills.includes('nestle') && CRAFT.skills.includes('combo') && !!cardDef('sprout~.nestle');
    // the puzzle search tries each slot for a placement card and each half of a choose-one spell
    const P = E.newGame(['pebble', 'pebble', 'pebble'], ['pebble', 'pebble', 'pebble'], null, { seed: 4 }); E.startTurn(P);
    P.p[0].hand = [E.makeCard('nest-keeper', 950), E.makeCard('crossroads', 951)]; P.p[0].board = [E.makeCard('pebble', 952), E.makeCard('pebble', 953)]; P.p[0].energy = 5; P.p[1].board = [E.makeCard('pebble', 954)];
    const acts = puzzleActions(P); out.slots = acts.filter(x => x.uid === 950).map(x => x.slot); out.modes = [...new Set(acts.filter(x => x.uid === 951).map(x => x.mode))];
    // the wishlist: starred cards meet a tester's spares (and theirs meet mine)
    state.progress.starred = ['blossom']; const spare = (ttSpareList() || [])[0];
    const m = ttMatch({ spares: ['blossom', 'sprout'], wants: spare ? [spare] : [] });
    out.wish = { theirs: m.theirsWanted, mineWanted: m.mineWanted.length, spare: !!spare, any: m.any };
    out.art = ['nest-keeper', 'pitfall', 'twin-moons'].every(id => /assets\/cards\//.test(cardDef(id).art || ''));
    return out;
  });
  assert.deepStrictEqual(r.weeks, ['snare', 'nestle', 'combo', 'flank', 'glimpse'], 'a weekly rule for each new mechanic');
  assert.strictEqual(r.flank, 4, 'Flank Week makes Flank +3'); assert.strictEqual(r.snareHit, 5, 'Snare Week makes a Snare hit for 5');
  assert.ok(r.fan, 'some neighbours love a new keyword'); assert.strictEqual(r.deckLen, 12); assert.ok(r.themed >= 4, 'their deck carries their keyword: ' + JSON.stringify(r)); assert.ok(r.snares >= 1, 'and sets Snares');
  assert.ok(r.perks, 'each new keyword lends a companion perk'); assert.ok(r.craft, 'Nestle and Follow-up can be crafted on');
  assert.deepStrictEqual(r.slots, [0, 1, 2], 'the puzzle search tries every slot'); assert.deepStrictEqual(r.modes, [0, 1], 'and both halves');
  assert.deepStrictEqual(r.wish.theirs, ['blossom'], 'their spare I starred is a match'); assert.ok(!r.wish.spare || r.wish.mineWanted === 1); assert.ok(r.wish.any);
  assert.ok(r.art, 'the new cards have drawn art');
  // the trade sheet puts starred cards first and marks them
  const ui = await page.evaluate(() => { ensureLevel().level = 20; state.progress.starred = ['blossom']; ttOpen({ id: 'x', name: 'Tester X', spares: ['sprout', 'blossom'] });
    const first = document.querySelector('#ttCard [data-tt^="want:"]').dataset.tt, marked = !!document.querySelector('#ttCard .tt-chip.wished .tt-star'); ttClose(); return { first, marked }; });
  assert.strictEqual(ui.first, 'want:blossom'); assert.ok(ui.marked);
};
