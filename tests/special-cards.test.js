// Cards you cannot find on the map (build 288): exclusive cards from bosses, portals, puddle worlds, the deep cellar, the Daily Rift and the hardest
// milestones. Never in packs or finds; each world hands over its first copy; bosses field their own cards; milestones pay (also to older saves).
module.exports = async (page, assert) => {
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const SOURCES = ['boss', 'portal', 'puddle', 'cellar', 'rift', 'milestone'];

  // the data: every new card is exclusive, has a family, a picture and sane numbers; nothing ordinary can produce one
  const data = await ev(S => {
    const fresh = CARD_POOL.filter(c => S.includes(c.exclusive) && c.rarity !== 'divine' && !['glowworm', 'echo-cavern', 'deep-wyrm', 'rooks-ace'].includes(c.id));
    const ids = new Set(CARD_POOL.map(c => c.id));
    const out = {
      n: fresh.length, dupes: CARD_POOL.length - ids.size,
      noFamily: fresh.filter(c => !CARD_FAMILY[c.id]).map(c => c.id), noArt: fresh.filter(c => !c.art).map(c => c.id),
      lowRarity: fresh.filter(c => RARITY_ORDER.indexOf(c.rarity) < 2).map(c => c.id),
      hint: fresh.filter(c => !EXCLUSIVE_HINT[c.exclusive]).map(c => c.id),
      kw: fresh.filter(c => c.kw.some(k => !KW[k])).map(c => c.id),
      mil: Object.keys(MILESTONE_CARDS).filter(a => !ACHIEVEMENTS.some(x => x.id === a) || !cardDef(MILESTONE_CARDS[a]) || cardDef(MILESTONE_CARDS[a]).exclusive !== 'milestone'),
      boss: Object.keys(BOSS_CARDS).filter(d => !DISTRICTS[d] || BOSS_CARDS[d].length !== 3 || BOSS_CARDS[d].some(id => cardDef(id).exclusive !== 'boss')),
      world: [].concat(Object.values(WORLD_CARDS.portal), Object.values(WORLD_CARDS.puddle), WORLD_CARDS.cellar, Object.values(WORLD_CARDS.rift)).filter(id => !cardDef(id)),
      puddleKinds: Object.keys(WORLD_CARDS.puddle).filter(k => !PW_KINDS[k]),
      leak: 0
    };
    for (let i = 0; i < 600; i++) { for (const r of RARITY_ORDER.slice(0, 5)) { const c = cardDef(randomCardId(r)); if (c.exclusive) out.leak++; } }
    return out;
  }, SOURCES);
  assert.strictEqual(data.n, 45, 'forty-five cards from outside the map');
  assert.ok(!data.dupes && !data.noFamily.length && !data.noArt.length && !data.lowRarity.length && !data.hint.length && !data.kw.length, 'card data: ' + JSON.stringify(data));
  assert.ok(!data.mil.length && !data.boss.length && !data.world.length && !data.puddleKinds.length, 'the tables point at real cards, milestones and worlds: ' + JSON.stringify(data));
  assert.strictEqual(data.leak, 0, 'random card draws never hand out an exclusive card');

  // milestones pay once, also for one reached before the card existed
  const mil = await ev(() => {
    const pr = state.progress, id = 'wins-200', card = MILESTONE_CARDS[id];
    state.ownedCards = state.ownedCards.filter(c => c !== card); pr.milestoneCards = {}; pr.achievements = pr.achievements.filter(a => a !== id);
    state.progress.totals.battlesWon = 200; checkAchievements();
    const one = state.ownedCards.filter(c => c === card).length;
    checkAchievements(); checkAchievements();
    const still = state.ownedCards.filter(c => c === card).length;
    pr.achievements.push('steps-10000'); pr.milestoneCards['steps-10000'] = false; delete pr.milestoneCards['steps-10000'];
    checkAchievements();
    return { one, still, older: state.ownedCards.includes(MILESTONE_CARDS['steps-10000']), queued: specialQueue.length > 0 || !pickupOverlay.classList.contains('hidden') };
  });
  assert.strictEqual(mil.one, 1, 'a milestone pays its card once');
  assert.strictEqual(mil.still, 1, 'and not again on later checks');
  assert.ok(mil.older && mil.queued, 'an older save that already has the milestone gets its card, and sees it: ' + JSON.stringify(mil));
  await ev(() => { specialQueue.length = 0; document.getElementById('pickupOverlay').classList.add('hidden'); });

  // worlds hand over the first copy only
  const wc = await ev(() => {
    state.ownedCards = state.ownedCards.filter(c => c !== 'thread-spinner');
    const first = worldCardId('puddle', 'maze');
    state.ownedCards.push('thread-spinner');
    return { first, second: worldCardId('puddle', 'maze'), bad: worldCardId('puddle', 'nope') };
  });
  assert.deepStrictEqual(wc, { first: 'thread-spinner', second: null, bad: null }, 'a keepsake is given once');

  // a portal world hides its own card as the treasure (a plain puddle or the Daily Rift do not)
  const portal = await ev(() => {
    const out = {}, hide = () => { document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); };
    const build = (via, daily) => {
      if (pwActive()) pwLeave('left', true);
      const w = pwFamilize(pwNewWorld('explore'), 'grove'); w.via = via; if (daily) w.daily = '2026-01-01';
      w.origin = { district: 'square', x: null, y: null }; w.endsAt = Date.now() + 600000; w.map = pwGenerate(w);
      state.progress.puddleWorld = w; pwApply(w); const d = pwBuildData();
      return d.items.filter(i => i.treasure).map(i => i.cardId);
    };
    state.ownedCards = state.ownedCards.filter(c => c !== 'portal-verdant');
    out.portal = build('portal'); out.puddle = build(null); out.daily = build('portal', true);
    state.ownedCards.push('portal-verdant'); out.owned = build('portal');
    if (pwActive()) pwLeave('left', true); hide();
    return out;
  });
  assert.deepStrictEqual(portal.portal, ['portal-verdant'], 'a grove portal hides the Verdant Doorway');
  assert.ok(!portal.puddle.includes('portal-verdant') && !portal.daily.includes('portal-verdant'), 'a plain puddle world and the Daily Rift do not');
  assert.ok(!portal.owned.includes('portal-verdant'), 'once you own it the treasure is an ordinary card again');

  // bosses play their own cards
  const bosses = await ev(() => {
    const out = {};
    Object.keys(BOSS_CARDS).forEach(d => {
      const deck = buildBossDeck(d), has = id => deck.filter(c => BattleEngine.baseIdOf(c) === id).length, [a, b, m] = BOSS_CARDS[d];
      out[d] = { len: deck.length, a: has(a), b: has(b), m: has(m), maxCopies: Math.max(...deck.map(c => deck.filter(x => x === c).length)) };
    });
    const dep = depthOpponent('square', 3).deck, g = DEEP_GUARDIANS.map(gd => deepDeck(Object.assign({}, gd, { deep: true, depth: 5, guardian: true })));
    out.depth = { len: dep.length, mine: dep.filter(c => BOSS_CARDS.square.includes(BattleEngine.baseIdOf(c))).length };
    out.guard = g.map((deck, i) => ({ len: deck.length, mine: deck.filter(c => DEEP_GUARDIANS[i].cards.includes(BattleEngine.baseIdOf(c))).length }));
    return out;
  });
  ['square', 'market', 'harbor', 'garden'].forEach(d => {
    const b = bosses[d];
    assert.ok(b.len === 12 && b.a === 2 && b.b === 2 && b.m === 1 && b.maxCopies <= 2, `${d}'s boss fields its five cards: ` + JSON.stringify(b));
  });
  assert.ok(bosses.depth.len === 12 && bosses.depth.mine >= 3, 'a Depth 3 boss brings more of them: ' + JSON.stringify(bosses.depth));
  assert.ok(bosses.guard.every(g => g.len === 12 && g.mine >= 3), 'the cellar guardians play the cards they drop: ' + JSON.stringify(bosses.guard));
};
