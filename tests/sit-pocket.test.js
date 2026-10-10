/* Sitting keeps her still, the Character-tab spar opens over the town, and full art shows as the default on small cards. */
const assert = require('assert');
module.exports = async function (page) {
  await page.evaluate(() => { switchTab('town'); });
  // sitting: taps do nothing and she takes the pose
  const before = await page.evaluate(() => { calmSit(''); return Object.assign({}, state.playerPos); });
  assert.ok(await page.evaluate(() => playerEl.classList.contains('sitting')), 'she settles into the sitting pose');
  await page.evaluate(() => handleMapTap(state.playerPos.x + 2, state.playerPos.y));
  await page.waitForTimeout(400);
  assert.deepStrictEqual(await page.evaluate(() => Object.assign({}, state.playerPos)), before, 'a tap does not move her while she sits');
  assert.ok(await page.evaluate(() => !!document.querySelector('#calmSitTime') && document.getElementById('calmSitSay').textContent.length > 0), 'the sitting card shows the time and a line');
  await page.evaluate(() => closeCalm());
  assert.ok(await page.evaluate(() => !playerEl.classList.contains('sitting')), 'standing up ends the pose');
  // the spar started from the Character tab goes to the town first, so the battle has the whole screen
  const tab = await page.evaluate(async () => {
    state.companion = state.companion || { kind: 'card', cardId: state.ownedCards[0], bond: 0 };
    switchTab('character'); await new Promise(r => setTimeout(r, 200));
    whenInTown(() => { window.__started = true; });
    await new Promise(r => setTimeout(r, 800));
    return { tab: currentTab, started: !!window.__started };
  });
  assert.strictEqual(tab.tab, 'town', 'it switches to the town first'); assert.ok(tab.started, 'and then starts');
  // full art as default on small cards
  const id = await page.evaluate(() => CARD_POOL.map(c => c.id).find(i => hasFullArt(cardDef(i))));
  assert.ok(id, 'a card with full art exists');
  const bg = await page.evaluate(i => { const d = cardDef(i), h = document.createElement('div'); h.innerHTML = miniCardHtml(d); document.body.appendChild(h); return new Promise(r => setTimeout(() => { const ok = !!h.querySelector('.card-mini.fa > .fa-scene img') && !!h.querySelector('.card-mini.fa .fa-hero img') && !h.querySelector('img.fa-small'); h.remove(); r(ok); }, 100)); }, id);
  assert.ok(bg, 'a mini card with full art is dressed exactly like the popup: scene behind, subject in front');
};
