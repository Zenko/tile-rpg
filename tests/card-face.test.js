// Card face ("circle stack on paper"): the same layout on collection tiles, battle cards and the reveal popup.
module.exports = async (page, assert) => {
  await page.evaluate(() => { ['dove', 'lion-dancer', 'spark', 'pebble'].forEach(id => state.ownedCards.push(id)); state.deck = []; saveState(); switchTab('collection'); });
  await page.waitForTimeout(400);
  // collection tiles: a paper panel with name and numbers, one round badge per keyword, none on a spell
  const tiles = await page.evaluate(() => {
    const q = id => document.querySelector(`.alm-card.tile[data-tile="${id}"]`);
    const d = q('dove'), s = q('spark');
    return { paper: !!d.querySelector('.ac-paper .ac-name'), badges: d.querySelectorAll('.ac-kw i').length, spellBadges: s.querySelectorAll('.ac-kw i').length, spellLabel: s.querySelector('.ac-paper .ac-power').textContent,
      inside: (() => { const c = d.getBoundingClientRect(), p = d.querySelector('.ac-paper').getBoundingClientRect(); return p.bottom <= c.bottom + 1 && p.left >= c.left - 1 && p.right <= c.right + 1; })() };
  });
  assert.ok(tiles.paper, 'tile has no paper panel');
  assert.strictEqual(tiles.badges, 2, 'Dove has two keywords');
  assert.strictEqual(tiles.spellBadges, 0, 'a spell has no keyword badges');
  assert.ok(/Spell/.test(tiles.spellLabel), 'spell label missing on the tile');
  assert.ok(tiles.inside, 'paper panel is outside the tile');

  // reveal popup (overlays are hidden by the runner, so lift that to measure)
  await page.evaluate(() => { document.getElementById('testHideOverlays').remove(); showCardReveal('lion-dancer', 'Card Details', false, 'note'); });
  await page.waitForTimeout(500);
  const rv = await page.evaluate(() => {
    const f = document.getElementById('pickupCardFace'), p = f.querySelector('.paper'), k = f.querySelector('.kws'), c = f.getBoundingClientRect(), pr = p.getBoundingClientRect();
    return { paper: !!p, badges: f.querySelectorAll('.kws span').length, stats: !!p.querySelector('.stats .pw') && !!p.querySelector('.stats .hp'), box: getComputedStyle(f).containerType,
      overhang: k.getBoundingClientRect().left < c.left, inside: pr.bottom <= c.bottom + 1 && pr.right <= c.right + 1, art: f.querySelector('.icon').getBoundingClientRect().height > c.height * 0.4 };
  });
  assert.ok(rv.paper && rv.stats, 'reveal face has no paper panel with stats');
  assert.strictEqual(rv.badges, 2, 'Lion Dancer has two keyword badges');
  assert.strictEqual(rv.box, 'inline-size', 'card face must be a size container');
  assert.ok(rv.overhang && rv.inside && rv.art, `reveal layout off: ${JSON.stringify(rv)}`);
  await page.evaluate(() => { showCardReveal('spark', 'Spell', false); });
  await page.waitForTimeout(300);
  const sp = await page.evaluate(() => { const f = document.getElementById('pickupCardFace'); return { tag: !!f.querySelector('.paper .spell-tag'), kws: f.querySelectorAll('.kws').length }; });
  assert.ok(sp.tag && sp.kws === 0, 'spell face should show a Spell label on the paper and no keyword badges');
  await page.evaluate(() => { const st = document.createElement('style'); st.id = 'testHideOverlays'; st.textContent = '.overlay{display:none!important}'; document.head.appendChild(st); });

  // battle: hand and board cards share the layout
  await page.evaluate(() => { CARD_POOL.slice(0, 14).forEach(c => state.ownedCards.push(c.id)); state.deck = CARD_POOL.slice(0, 12).map(c => c.id); state.character.sleeve = 'tide'; window.masteryRank = () => 3; saveState(); });   // a sleeve and mastery stars add extra children: the panel must still sit flush with the card bottom
  await page.evaluate(() => { prefs.tossStyle = 'skip'; prefs.fast = true; prefs.calm = true; startBattle(state.districtData.square.npcs[0]); });
  await page.waitForFunction(() => typeof battle !== 'undefined' && battle && battle.G, null, { timeout: 8000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const G = battle.G, pl = G.p[0], c = pl.hand.find(x => !x.spell) || pl.hand[0]; pl.hand.splice(pl.hand.indexOf(c), 1); c.ready = true; pl.board.push(c); btRender(); });
  await page.waitForTimeout(600);
  const bt = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('#battleView #btYouBoard .card, #battleView .hand .card')].filter(c => c.getBoundingClientRect().height > 0);
    return { n: cards.length, allPaper: cards.every(c => c.querySelector('.paper')), boxed: cards.every(c => getComputedStyle(c).containerType === 'inline-size'),
      badgesOk: cards.every(c => c.classList.contains('spell') || c.querySelectorAll('.kws span').length === (c.querySelector('.kws') ? c.querySelectorAll('.kws span').length : 0)),
      paperInside: cards.every(c => { const r = c.getBoundingClientRect(), p = c.querySelector('.paper').getBoundingClientRect(); return p.bottom <= r.bottom + 1.5 && r.bottom - p.bottom < 1.5 && p.top > r.top; }) };
  });
  assert.ok(bt.n >= 2, 'expected hand and board cards');
  assert.ok(bt.allPaper && bt.boxed && bt.paperInside, `battle cards off: ${JSON.stringify(bt)}`);
};
