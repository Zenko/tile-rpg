// Trading cards with neighbours and bosses (js/npc-trade.js): a Trade card on the Talk screen, daily offers, spare copies only, and bosses that
// only trade once beaten and only for super rare or better.
module.exports = async (page, assert) => {
  const ev = (fn, arg) => page.evaluate(fn, arg);
  await ev(() => { const h = document.getElementById('testHideOverlays'); if (h) h.remove(); switchTab('town'); });

  // a neighbour: three offers a day, the same all day, and a Trade card on the grid
  const first = await ev(() => {
    const f = { id: 'npc-square-fenn', name: 'Fenn', icon: '🧑', deck: [], level: 3 };
    window.__f = f; openTalk(f);
    const a = npcTradeOffers(f), b = npcTradeOffers(f);
    return { n: a.length, same: JSON.stringify(a) === JSON.stringify(b), exclusive: a.some(o => cardDef(o.give).exclusive), card: !!document.querySelector('.tk-cat[data-go="trade"]'), sub: document.querySelector('.tk-cat[data-go="trade"] small').textContent };
  });
  assert.strictEqual(first.n, 3, 'a neighbour offers three cards');
  assert.ok(first.same && !first.exclusive, 'the same offers all day, never an exclusive card');
  assert.ok(first.card && /3 to see/.test(first.sub), 'the Talk screen has a Trade card: ' + first.sub);

  // nothing spare: the offers show, but there is nothing to pay with
  await ev(() => { state.ownedCards = ['sprout', 'sprout']; state.deck = []; saveState(); document.querySelector('.tk-cat[data-go="trade"]').click(); });
  assert.strictEqual(await ev(() => document.getElementById('talkCard').dataset.view), 'trade', 'the Trade card opens its list');
  const rows = await ev(() => document.querySelectorAll('#talkTrade .tr-offer').length);
  assert.strictEqual(rows, 3, 'three offers listed');

  // a spare card of the right rarity pays for it
  const paid = await ev(() => {
    const f = window.__f, o = npcTradeOffers(f)[0], need = o.need;
    const pay = CARD_POOL.find(c => !c.exclusive && c.rarity === need && c.id !== o.give).id;
    state.ownedCards = [pay, pay, pay, 'sprout', 'sprout', 'sprout']; state.deck = ['sprout']; saveState();
    const cands = npcTradeCandidates(o);
    document.querySelector(`#talkTrade [data-offer="${o.key}"]`).click();
    const listed = [...document.querySelectorAll('#talkTrade [data-pay]')].map(b => b.dataset.pay);
    const before = state.ownedCards.length, tr0 = state.progress.totals.tradesDone || 0;
    const r = npcTradeDo(f, o.key, pay);
    document.getElementById('pickupOverlay').classList.add('hidden');
    return { cands, listed, got: r && r.got.id === o.give, owns: state.ownedCards.includes(o.give), pays: state.ownedCards.filter(x => x === pay).length, len: state.ownedCards.length - before, trades: (state.progress.totals.tradesDone || 0) - tr0, again: npcTradeDo(f, o.key, pay), pay, need };
  });
  assert.ok(paid.cands.includes(paid.pay) && paid.listed.includes(paid.pay), 'the spare card is offered as payment');
  assert.ok(paid.got && paid.owns && paid.pays === 2 && paid.len === 0 && paid.trades === 1, 'one card each way: ' + JSON.stringify(paid));
  assert.strictEqual(paid.again, null, 'an offer can only be taken once a day');

  // never a card the deck needs, a crafted card or a summoned god
  const guard = await ev(() => {
    const o = { need: 'common' };
    state.ownedCards = ['sprout', 'sprout', 'sprout', 'duermevela', 'duermevela']; state.deck = ['sprout'];
    const ok = npcTradeCandidates(o);
    return { sprout: ok.includes('sprout'), god: ok.includes('duermevela'), lone: (state.ownedCards = ['toadstool'], npcTradeCandidates(o).includes('toadstool')) };
  });
  assert.ok(guard.sprout && !guard.god && !guard.lone, 'only spare copies, never a god or your last copy: ' + JSON.stringify(guard));

  // a boss: locked until beaten
  const locked = await ev(() => {
    closeTalk && closeTalk();
    const boss = { id: 'boss-square', name: BOSSES.square, icon: '👹', deck: [], isBoss: true };
    window.__boss = boss; openTalk(boss);
    summonState().beaten = {};
    const lockedTry = npcTradeDo(boss, 'boss:square:last-door', 'sprout');
    document.querySelector('.tk-cat[data-go="trade"]').click();
    return { lockedTry, sub: document.querySelector('.tk-cat[data-go="trade"] small') ? document.querySelector('.tk-cat[data-go="trade"] small').textContent : '', text: document.getElementById('talkTrade').textContent };
  });
  assert.strictEqual(locked.lockedTry, null, 'an unbeaten boss will not trade');
  assert.ok(/beaten them/.test(locked.text), 'the pane says why: ' + locked.text);

  // beaten: only the boss's own cards, all super rare or better, one trade a day
  const beaten = await ev(() => {
    const boss = window.__boss; summonState().beaten.square = true; renderTalk(); talkGo('trade');
    const offers = npcTradeOffers(boss), rars = offers.map(o => cardDef(o.give).rarity);
    const sup = CARD_POOL.find(c => c.rarity === 'super' && !c.exclusive).id, myth = CARD_POOL.find(c => c.rarity === 'mythic' && !c.exclusive).id;
    state.ownedCards = [sup, sup, sup, myth, myth, 'sprout', 'sprout', 'sprout']; state.deck = ['sprout'];
    const sOffer = offers.find(o => cardDef(o.give).rarity === 'super'), mOffer = offers.find(o => cardDef(o.give).rarity === 'mythic');
    const commonPays = npcTradeCandidates(Object.assign({ boss: true }, sOffer)).includes('sprout');
    const mythPays = npcTradeCandidates(Object.assign({ boss: true }, mOffer));
    const bad = npcTradeDo(boss, mOffer.key, sup);           // a super cannot buy a mythic
    const ok = npcTradeDo(boss, sOffer.key, sup);
    document.getElementById('pickupOverlay').classList.add('hidden');
    const second = npcTradeDo(boss, offers.find(o => o !== sOffer && cardDef(o.give).rarity === 'super').key, sup);
    return { ids: offers.map(o => o.give), rars, commonPays, mythPays, bad, ok: !!ok, gotIt: state.ownedCards.includes(sOffer.give), second };
  });
  assert.deepStrictEqual(beaten.ids, ['door-cat', 'sleepers-lantern', 'last-door'], 'the boss offers its own three cards');
  assert.ok(beaten.rars.every(r => r === 'super' || r === 'mythic'), 'a boss only trades super rare and mythic cards: ' + beaten.rars);
  assert.ok(!beaten.commonPays, 'a common card cannot pay a boss');
  assert.ok(!beaten.mythPays.includes('sprout') && beaten.bad === null && beaten.ok && beaten.gotIt, 'rarity rules hold: ' + JSON.stringify(beaten));
  assert.strictEqual(beaten.second, null, 'a boss trades once a day');
  await ev(() => { closeTalk(); });
};
