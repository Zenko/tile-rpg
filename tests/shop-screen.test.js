// The Card Shop front as a full screen (js/shop-screen.js): four displays. Packs opens the Shop screen; the sleeve wall, the decoration shelf
// and the mirror (try things on, then wear or buy) are full-screen views inside this screen (swipe through sleeves, buy and wear; buy, place, store and remove
// decorations). Leave at the foot.
module.exports = async (page, assert) => {
  const q = s => page.evaluate(s2 => eval(s2), s);
  await page.evaluate(() => { document.getElementById('testHideOverlays').textContent = '.overlay:not(#pickupOverlay){display:none!important}'; state.progress.pebbles = 500; state.character.unlockedSleeves = ['']; state.character.sleeve = ''; state.decorationInventory = {}; openScene('card-shop'); });
  await page.waitForTimeout(400);
  assert.ok(await q("shopOpen() && document.body.classList.contains('in-shopfront')"), 'the shop front opens as a full screen');
  assert.strictEqual(await page.locator('.cs-case').count(), 4, 'four displays');
  for (const [id, mode] of [['packs', 'packs']]) {
    await page.click(`[data-shop="${id}"]`); await page.waitForTimeout(400);
    assert.ok(await q(`!shopOpen() && scene.mode === '${mode}'`), `the ${id} display opens its Shop view and puts the front away`);
    await q("sceneAction('back')"); await page.waitForTimeout(300); assert.ok(await q("shopOpen()"), `Back returns to the front from ${id}`);
  }
  // the mirror: trying something on changes only the preview; the button wears or buys it
  await page.click('[data-shop="customize"]'); await page.waitForTimeout(400);
  assert.ok(await q("shopOpen() && shopEl.dataset.view === 'customize'"), 'the mirror is a view of this screen');
  const emoji = await q("EMOJI_OPTIONS.find(o => o.cost > 0 && !state.character.unlockedEmojis.includes(o.emoji))"), was = await q("state.character.emoji");
  await q("state.character.drawn = false; shopRender()");
  await page.click(`[data-try="emoji|${emoji.emoji}"]`); await page.waitForTimeout(200);
  assert.ok((await q("document.getElementById('csMe').innerHTML")).includes(emoji.emoji), 'trying a look on shows it in the mirror'); assert.strictEqual(await q("state.character.emoji"), was, 'but changes nothing yet');
  const peb = await q("state.progress.pebbles"); await page.click('#csWear'); await page.waitForTimeout(300);
  assert.strictEqual(await q("state.character.emoji"), emoji.emoji, 'the button buys and wears it'); assert.strictEqual(await q("state.progress.pebbles"), peb - emoji.cost, 'and charges for it');
  assert.ok(await q("document.getElementById('csWear').disabled"), 'a worn look shows as worn');
  await page.click('[data-cat2="color"]'); await page.waitForTimeout(150);
  const col = await q("COLOR_OPTIONS.find(o => o.cost > 0 && !state.character.unlockedColors.includes(o.color))"), was2 = await q("state.character.color");
  await q("state.progress.pebbles = 0"); await page.click(`[data-try="color|${col.color}"]`); await page.waitForTimeout(150);
  assert.ok(/Needs/.test(await page.textContent('#csWear')) && await q("document.getElementById('csWear').disabled"), 'too poor: the button says what is missing'); assert.strictEqual(await q("state.character.color"), was2, 'and nothing changes');
  await q("state.progress.pebbles = 500"); await page.click('[data-cat2="stage"]'); await page.waitForTimeout(150); await page.click('[data-try="stage|live"]'); await page.waitForTimeout(100);
  await page.click('[data-cat2="mat"]'); await page.click('[data-cat2="border"]'); assert.ok(await page.locator('.cs-ch').count() >= 2, 'every category lists its choices');
  await page.click('#csBack'); await page.waitForTimeout(300); assert.ok(await q("shopEl.dataset.view === 'hub'"), 'Front returns to the four displays');
  await q("state.progress.pebbles = 500");
  // the sleeve wall: swipe the card, buy and wear
  await page.click('[data-shop="sleeves"]'); await page.waitForTimeout(400);
  assert.ok(await q("shopOpen() && shopEl.dataset.view === 'sleeves'"), 'the sleeve wall is a view of this screen');
  assert.strictEqual(await q("shopUi.sleeve"), 0, 'it starts on the sleeve you wear');
  const cb = await page.locator('#csBigCard').boundingBox();
  await page.mouse.move(cb.x + cb.width * .8, cb.y + 60); await page.mouse.down(); await page.mouse.move(cb.x + cb.width * .1, cb.y + 60, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(400);
  assert.strictEqual(await q("shopUi.sleeve"), 1, 'swiping the card left shows the next sleeve');
  await page.click('[data-step="1"]'); await page.waitForTimeout(300); assert.strictEqual(await q("shopUi.sleeve"), 2, 'the arrow does the same');
  await page.click('[data-step="-1"]'); await page.waitForTimeout(300);
  const cost = await q("SLEEVES[1].cost"), id = await q("SLEEVES[1].id");
  await page.click('#csMain'); await page.waitForTimeout(300);
  assert.strictEqual(await q("ensureSleeves().sleeve"), id, 'the button buys and wears it'); assert.strictEqual(await q("state.progress.pebbles"), 500 - cost, 'and charges for it');
  assert.ok(await q("document.getElementById('csMain').disabled"), 'a worn sleeve shows as worn');
  await page.click('#csBack'); await page.waitForTimeout(300); assert.ok(await q("shopEl.dataset.view === 'hub'"), 'Front returns to the four displays');
  // decorations: pick, buy, see it in Yours, remove it
  await page.click('[data-shop="items"]'); await page.waitForTimeout(400);
  assert.ok(await q("shopEl.dataset.view === 'items'"), 'the decoration shelf is a view of this screen');
  const item = await q("DECORATION_ITEMS.find(d => !d.museum && !d.atlas && !d.rift && !d.night && !d.level).id");
  await q("itemsCat = 'all'; shopRender()"); await page.click(`[data-item="${item}"]`); await page.waitForTimeout(150);
  assert.ok(await page.locator('.cs-detail').count() === 1, 'tapping a tile shows it with its price');
  await page.click(`[data-buy="${item}"]`); await page.waitForTimeout(250);
  assert.strictEqual(await q(`decorationInventoryCount('${item}')`), 1, 'Buy adds it to your decorations'); assert.ok(await page.locator(`[data-place="${item}"]`).count() === 1, 'and a Place button appears');
  await page.click('[data-tab="yours"]'); await page.waitForTimeout(200); assert.ok(await page.locator('.cs-row').count() === 1, 'Yours lists what is in storage');
  await page.click('[data-tab="shop"]'); await page.waitForTimeout(150);
  await page.click(`[data-place="${item}"]`); await page.waitForTimeout(600); assert.ok(await q("!shopOpen() && !inScene && !!placingDecoration"), 'Place steps out to the map to put it down');
  await q("cancelPlacingDecoration(true)");
  await q("openScene('card-shop'); sceneAction('items')"); await page.waitForTimeout(300);
  await page.click('#csLeave'); await page.waitForTimeout(1100); assert.ok(await q("!shopOpen() && !inScene"), 'Leave goes back to the street');
};
