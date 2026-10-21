// The trade table (js/npc-trade.js openTradeTable, build 296): a trade shows both cards, what it pays and a two-step agreement before anything
// changes hands; Not now changes nothing; a finished trade pays XP and Embers.
module.exports = async (page, assert) => {
  const ev = (fn, arg) => page.evaluate(fn, arg);
  await ev(() => { const h = document.getElementById('testHideOverlays'); if (h) h.remove(); document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); switchTab('town'); });
  await ev(() => {
    const f = { id: 'npc-square-fenn', name: 'Fenn', icon: '🧑', deck: [], level: 3 }; window.__f = f; openTalk(f);
    const o = npcTradeOffers(f)[0], pay = CARD_POOL.find(c => !c.exclusive && c.rarity === o.need && c.id !== o.give).id;
    window.__o = o; window.__pay = pay; state.ownedCards = [pay, pay, pay, 'sprout', 'sprout', 'sprout']; state.deck = ['sprout']; saveState();
    talkGo('trade'); document.querySelector(`#talkTrade [data-offer="${o.key}"]`).click();
  });
  assert.ok(await ev(() => document.getElementById('talkCard').dataset.view === 'trade' && !!document.querySelector('#talkTrade [data-pay]')), 'tapping an offer keeps you on the Trade screen and lists your cards to pay with');
  await ev(() => document.querySelector(`#talkTrade [data-pay="${window.__pay}"]`).click());
  const t = await ev(() => { const el = document.getElementById('tradeOverlay'); return { shown: !el.classList.contains('hidden') && getComputedStyle(el).display !== 'none', you: document.getElementById('txYou').textContent, them: document.getElementById('txThem').textContent, reward: document.getElementById('txReward').textContent, owned: state.ownedCards.length, trades: state.progress.totals.tradesDone || 0 }; });
  assert.ok(t.shown && /You give/.test(t.you) && /family|Spell/.test(t.you) && /Fenn gives/.test(t.them) && /family|Spell/.test(t.them) && /\+\d+ XP/.test(t.reward) && /Embers/.test(t.reward) && /Daily|swap/.test(await ev(() => document.getElementById('txMeta').textContent)), 'the table shows both cards, their families and the reward: ' + JSON.stringify(t));
  assert.strictEqual(t.trades, 0, 'nothing has changed hands yet');

  // Not now: nothing happens
  await ev(() => document.getElementById('txNo').click());
  assert.ok(await ev(() => document.getElementById('tradeOverlay').classList.contains('hidden') && (state.progress.totals.tradesDone || 0) === 0 && state.ownedCards.includes(window.__pay)), 'Not now closes it and trades nothing');

  // shake on it: you agree, then they do, then it happens and pays
  await ev(() => document.querySelector(`#talkTrade [data-pay="${window.__pay}"]`).click());
  const before = await ev(() => ({ xp: state.progress.xp + state.progress.level * 1000, embers: state.progress.pebbles }));
  await ev(() => document.getElementById('txYes').click());
  await page.waitForTimeout(250);
  const mid = await ev(() => ({ you: document.getElementById('txSealYou').textContent, them: document.getElementById('txSealThem').textContent, trades: state.progress.totals.tradesDone || 0 }));
  assert.ok(/✓/.test(mid.you) && !/✓/.test(mid.them) && mid.trades === 0, 'you agree first and nothing has moved yet: ' + JSON.stringify(mid));
  await page.waitForTimeout(1500);
  const end = await ev(() => ({ hidden: document.getElementById('tradeOverlay').classList.contains('hidden'), trades: state.progress.totals.tradesDone || 0, has: state.ownedCards.includes(window.__o.give), embers: state.progress.pebbles, xp: state.progress.xp + state.progress.level * 1000 }));
  assert.ok(end.hidden && end.trades === 1 && end.has, 'then they agree and the cards change hands: ' + JSON.stringify(end));
  assert.ok(end.embers > before.embers && end.xp > before.xp, 'and the trade paid Embers and XP: ' + JSON.stringify({ before, end }));
  await ev(() => { document.getElementById('pickupOverlay').classList.add('hidden'); closeTalk(); });
};
