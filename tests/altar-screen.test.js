// The full-screen altar (js/altar-screen.js), driven the way a player does: tap, drag, hold the bowl, the big button, the gods' riddles.
module.exports = async (page, assert) => {
  await page.evaluate(() => {
    const fam = f => CARD_POOL.filter(c => !c.spell && !c.exclusive && CARD_FAMILY[c.id] === f), g = (f, r) => fam(f).find(c => c.rarity === r).id;
    state.ownedCards = ['sprout', 'sprout', 'firefly', 'firefly', 'acorn', 'acorn', 'droplet', 'droplet', 'bubble', 'bubble', 'toadstool', 'toadstool']; state.deck = state.ownedCards.slice();
    for (let i = 0; i < 4; i++) state.ownedCards.push(g('stone', 'common')); for (let i = 0; i < 3; i++) state.ownedCards.push(g('wind', 'common'));
    ['duermevela', 'murmullo', 'marea-lenta', 'ensueno'].forEach(id => state.ownedCards.push(id));
    state.progress.altar = { found: {}, burning: [] }; openScene('home'); sceneAction('altar'); sceneAction('alt:open');
    document.getElementById('testHideOverlays').textContent = '';
  });
  await page.waitForTimeout(300);
  const q = s => page.evaluate(s2 => eval(s2), s);
  // tap a spare stone card: it lands on the stone candle and the flame wakes
  await page.click('#altarScreen [data-tab="stone"]'); await page.click('#asTray .as-card >> nth=0');
  assert.strictEqual(await q("altarDraftNow().feed.stone.length"), 1, 'a tap feeds the card to its own candle');
  assert.ok(await q("document.getElementById('asCall').disabled === false && document.getElementById('asBowl').classList.contains('ready')"), 'the button and the bowl light up');
  // drag a wind card onto the stone candle: it is refused with a hint
  await page.click('#altarScreen [data-tab="wind"]');
  const card = await page.locator('#asTray .as-card').first().boundingBox(), stone = await page.locator('.as-c[data-fam="stone"] .as-wax').boundingBox(), wind = await page.locator('.as-c[data-fam="wind"] .as-wax').boundingBox();
  const drag = async to => { await page.mouse.move(card.x + 40, card.y + 50); await page.mouse.down(); await page.mouse.move(card.x + 40, card.y - 40, { steps: 4 }); await page.mouse.move(to.x + 20, to.y + 30, { steps: 6 }); await page.mouse.up(); };
  await drag(stone); assert.ok(/belongs to the/.test(await page.textContent('#asHint')), 'a wrong candle says where the card belongs'); assert.strictEqual(await q("altarDraftNow().feed.wind.length"), 0);
  await drag(wind); assert.strictEqual(await q("altarDraftNow().feed.wind.length"), 1, 'dragging onto the right candle feeds it');
  // hold the bowl: the spirit answers and the cards are used
  const before = await q("state.ownedCards.length"), bb = await page.locator('#asBowl').boundingBox();
  await page.mouse.move(bb.x + 60, bb.y + 60); await page.mouse.down(); await page.waitForTimeout(1200); await page.mouse.up(); await page.waitForTimeout(200);
  assert.strictEqual(await q("state.ownedCards.length"), before - 1, 'two cards used, one arrived'); assert.strictEqual(await q("altarFed().length"), 0);
  assert.strictEqual(await q("Object.keys(altarState().found).length"), 1, 'the Spirit Book remembers it');
  await page.waitForTimeout(900); assert.ok(await q("!document.getElementById('pickupOverlay').classList.contains('hidden')"), 'the card reveal shows above the altar'); await page.evaluate(() => document.getElementById('pickupCardFace').parentElement.click()); await page.waitForSelector('#pickupContinue:not(.hidden)', { timeout: 8000 }); await page.evaluate(() => document.getElementById('pickupContinue').click()); await page.waitForTimeout(500);
  // the big button works too, and a burn goes on a pillar
  await page.click('#altarScreen [data-tab="stone"]'); await page.click('#asTray .as-card >> nth=0'); await page.click('#asBurns [data-burn="hour"]'); await page.click('#asCall'); await page.waitForTimeout(200);
  assert.strictEqual(await q("altarBurning().length"), 1, 'an hour burn goes on a pillar'); assert.ok(await page.locator('#asPil span').count() >= 1, 'and shows in the pillar strip');
  // the Atlas riddle: a god on the wrong candle sputters, on the right one it stays, four right ones and nothing else call the Atlas
  await page.click('#altarScreen [data-tab="gods"]'); await page.click('#asTray .as-card[data-id="murmullo"]'); await page.click('.as-c[data-fam="stone"] .as-wax');
  assert.ok(/does not belong where/.test(await page.textContent('#asHint')), 'the wrong riddle sputters'); assert.strictEqual(await q("altarFedCount('murmullo')"), 0);
  const place = async (id, fam) => { await page.click('#altarScreen [data-tab="gods"]'); if (await q(`altarUi.armed !== '${id}'`)) await page.click(`#asTray .as-card[data-id="${id}"]`); await page.click(`.as-c[data-fam="${fam}"] .as-wax`); };   // a god stays armed after a wrong candle, so the player can just try another
  await place('murmullo', 'wind'); await place('duermevela', 'stone'); await place('marea-lenta', 'tide'); await place('ensueno', 'grove');
  assert.ok(await q("document.getElementById('asBowl').classList.contains('atlas')"), 'four gods on their candles make the bowl gold'); assert.ok(/Atlas/.test(await page.textContent('#asCall')));
  await page.click('#asCall'); await page.waitForTimeout(500);
  assert.ok(await q("state.ownedCards.includes('the-atlas')"), 'the Atlas answers'); assert.ok(await q("['duermevela','murmullo','marea-lenta','ensueno'].every(id => state.ownedCards.includes(id))"), 'and no god is used up');
  await page.click('#asX'); assert.ok(!(await q("altarOpen()")));
};
