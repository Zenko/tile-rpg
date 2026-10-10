/* A full art card wearing a card sleeve keeps its art inside the card (the sleeve CSS used to push the scene into the flow and the subject below the card). */
module.exports = async (page, assert) => {
  await page.evaluate(() => { CARD_POOL.slice(0, 14).forEach(c => state.ownedCards.push(c.id)); state.deck = CARD_POOL.slice(0, 12).map(c => c.id); saveState(); prefs.tossStyle = 'skip'; prefs.fast = true; startBattle(ensureDistrictData(state.currentDistrict).npcs[0]); });
  await page.waitForFunction(() => typeof battle !== 'undefined' && battle && battle.G, null, { timeout: 8000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const pl = battle.G.p[0], c = Object.assign({}, pl.hand[0], { id: 'kraken', uid: 'xk' }), d = cardDef('kraken');
    Object.assign(c, { power: d.power, hp: d.grit, grit: d.grit, cost: d.cost, kw: d.kw.slice(), ready: true }); pl.board.push(c); btRender();
    const el = document.querySelector('#btYouBoard .card[data-uid="xk"]'); el.classList.add('sleeved', 'sleeve-gilded'); el.insertAdjacentHTML('afterbegin', '<span class="sleeve-fx"></span><span class="sleeve-mark">★</span>');
  });
  await page.waitForTimeout(300);
  const r = await page.evaluate(() => { const c = document.querySelector('#btYouBoard .card[data-uid="xk"]'), cr = c.getBoundingClientRect(), hr = c.querySelector('.fa-hero').getBoundingClientRect(); return { fa: c.classList.contains('fa'), scene: getComputedStyle(c.querySelector('.fa-scene')).position, spill: hr.bottom - cr.bottom }; });
  assert.ok(r.fa && r.scene === 'absolute', 'the sleeved full art card keeps its scene behind the art: ' + JSON.stringify(r));
  assert.ok(r.spill <= 1, 'the art must not hang out below the card: ' + JSON.stringify(r));
};
