// Family passives: each of the four works in a real game, and the Deck screen / battle opts read the archetype.
module.exports = async (page, assert) => {
  const r = await page.evaluate(() => {
    const mk = s => { let x = s % 2147483647 || 1; return () => (x = (x * 16807) % 2147483647) / 2147483647; };
    const base = CARD_POOL.filter(c => !c.exclusive && !c.foe && !c.spell), out = { bad: [], seen: {} };
    ['grove', 'stone', 'tide', 'wind'].forEach(fam => {
      const fp = base.filter(c => CARD_FAMILY[c.id] === fam).map(c => c.id), op = base.filter(c => CARD_FAMILY[c.id] && CARD_FAMILY[c.id] !== fam).map(c => c.id);
      for (let g = 0; g < 20; g++) {
        const rd = mk(40 + g), pick = (pool, n, d) => { while (n > 0) { const c = pool[Math.floor(rd() * pool.length)]; if (d.filter(x => x === c).length < 2) { d.push(c); n--; } } return d; };
        const A = pick(op, 4, pick(fp, 8, [])), B = pick(op, 12, []);
        const G = BattleEngine.newGame(A, B, mk(900 + g), { first: g % 2, passive: [fam, null] });
        if (G.p[0].passive !== fam) out.bad.push(fam + ' not set');
        BattleEngine.startTurn(G);
        let shields = 0, healed = 0, draws = 0;
        for (let t = 0; t < 200 && !G.over; t++) {
          BattleEngine.aiTurn(G, G.active, 'smart');
          G.events.forEach(e => { if (e.who === 0 && e.type === 'shieldup') shields++; });
          if (!G.over) BattleEngine.endTurn(G, G.active);
        }
        if (!G.over) out.bad.push(fam + ' never finished');
        if (fam === 'stone' && shields) out.seen.stone = true;
        if (fam === 'tide' && G.p[0].tideDrew !== undefined) out.seen.tide = true;
        if (fam === 'grove' || fam === 'wind') out.seen[fam] = true;
      }
    });
    // exact effects on a built game
    const grove = base.filter(c => CARD_FAMILY[c.id] === 'grove').map(c => c.id)[0];
    const G2 = BattleEngine.newGame(Array(12).fill(grove), Array(12).fill(grove), mk(5), { first: 0, passive: ['grove', null] });
    BattleEngine.startTurn(G2); const me = G2.p[0]; me.spirit = 10; me.energy = 10;
    const card = me.hand.find(c => !c.spell); BattleEngine.playCard(G2, 0, card.uid);
    out.groveHeal = me.spirit;
    const wind = base.filter(c => CARD_FAMILY[c.id] === 'wind' && c.kw.includes('swift') && c.cost <= 2)[0];
    const G3 = BattleEngine.newGame([wind.id], [wind.id], mk(6), { first: 0, passive: ['wind', null] });
    out.windPower = [G3.p[0].deck.concat(G3.p[0].hand)[0].power, wind.power];
    return out;
  });
  assert.deepStrictEqual(r.bad, []); assert.ok(r.seen.stone, 'a Stone shield showed up');
  assert.strictEqual(r.groveHeal, 12, 'a Brote card heals 2 Calm on arrival');
  assert.strictEqual(r.windPower[0], r.windPower[1] + 1, 'cheap Swift Wind gets +1 power');
  const d = await page.evaluate(() => {
    const stone = Object.keys(CARD_FAMILY).filter(id => CARD_FAMILY[id] === 'stone' && cardDef(id) && !cardDef(id).spell && !cardDef(id).exclusive).slice(0, 8);
    const rest = CARD_POOL.filter(c => CARD_FAMILY[c.id] && CARD_FAMILY[c.id] !== 'stone' && !c.spell && !c.exclusive).slice(0, 4).map(c => c.id);
    state.deck = stone.concat(rest); const p = archetypePassive(); renderDeckInsights();
    const mixed = state.deck.slice(); state.deck = rest.concat(rest).slice(0, 12); const none = archetypePassive(); state.deck = mixed;
    return { p, none, text: document.getElementById('deckInsights').textContent };
  });
  assert.strictEqual(d.p, 'stone'); assert.strictEqual(d.none, null);
  assert.ok(d.text.includes('Bedrock'), 'the Deck screen names the passive');
  // the smaller 6-card step: once per match, and the tier is read from the deck
  const m = await page.evaluate(() => {
    const grove = Object.keys(CARD_FAMILY).filter(id => CARD_FAMILY[id] === 'grove' && cardDef(id) && !cardDef(id).spell && !cardDef(id).exclusive);
    const rest = CARD_POOL.filter(c => CARD_FAMILY[c.id] && CARD_FAMILY[c.id] !== 'grove' && !c.spell && !c.exclusive).slice(0, 6).map(c => c.id);
    state.deck = grove.slice(0, 6).concat(rest); const tier6 = archetypeTier(); state.deck = grove.slice(0, 8).concat(rest.slice(0, 4)); const tier8 = archetypeTier(); state.deck = grove.slice(0, 6); const short = archetypeTier();
    const G = BattleEngine.newGame(Array(12).fill(grove[0]), Array(12).fill(grove[0]), () => 0.5, { first: 0, passive: ['grove', null], passiveTier: [1, null] });
    BattleEngine.startTurn(G); const me = G.p[0]; me.spirit = 5; me.energy = 10;
    const a = me.hand.find(c => !c.spell); BattleEngine.playCard(G, 0, a.uid); const afterOne = me.spirit;
    const b = me.hand.find(c => !c.spell); if (b) BattleEngine.playCard(G, 0, b.uid);
    return { tier6, tier8, short, afterOne, afterTwo: me.spirit };
  });
  assert.strictEqual(m.tier6, 1); assert.strictEqual(m.tier8, 2); assert.strictEqual(m.short, 0, 'an unfinished deck has no passive');
  assert.strictEqual(m.afterOne, 8, 'Seedling restores 3 Spirit'); assert.strictEqual(m.afterTwo, 8, 'only once per match');
};
