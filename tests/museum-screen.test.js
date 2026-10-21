// The Hall of Spirits as a full screen (js/museum-screen.js), driven the way a player does: pick a wing, drag a spare onto its plinth
// (and onto the wrong one), tap-then-plinth, donate them all, and leave.
module.exports = async (page, assert) => {
  const q = s => page.evaluate(s2 => eval(s2), s);
  // (spares only exist beyond what a full deck needs, hence the filler cards)
  await page.evaluate(() => { document.getElementById('testHideOverlays').textContent = '.overlay:not(#pickupOverlay){display:none!important}'; state.deck = []; const wing = ['sprout', 'acorn', 'blossom', 'foxglove'], filler = CARD_POOL.filter(c => !c.spell && !c.exclusive && !wing.includes(c.id)).slice(0, 12).map(c => c.id); state.ownedCards = wing.concat(wing, filler); museumState().donated = {}; museumState().wings = {}; openScene('museum'); });
  await page.waitForTimeout(400);
  assert.ok(await q("museumOpen() && document.body.classList.contains('in-museum')"), 'the hall opens as a full screen');
  assert.strictEqual(await page.locator('.mu-door').count(), 5, 'five wings');
  assert.ok(await page.locator('.mu-door[data-wing="grove"] .mu-badge').count() === 1, 'the grove wing shows spares ready');
  await page.click('.mu-door[data-wing="grove"]'); await page.waitForTimeout(300);
  assert.strictEqual(await q("museumEl.dataset.view"), 'wing', 'tapping a door goes into the wing'); assert.strictEqual(await page.locator('.mu-plinth').count(), 8, 'eight plinths');
  assert.strictEqual(await page.locator('.mu-card').count(), 4, 'four spares wait on the tray');
  const centre = async sel => { const b = await page.locator(sel).boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
  const drag = async (from, to) => { const a = await centre(from), b = await centre(to); await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 10 }); await page.mouse.up(); await page.waitForTimeout(550); };
  await drag('.mu-card[data-card="sprout"]', '.mu-plinth[data-plinth="acorn"]');
  assert.strictEqual(await q("isDonated('sprout')"), false, 'a card on the wrong plinth is not donated'); assert.ok(/does not belong/.test(await page.textContent('#muSay')), 'and the curator says so');
  await drag('.mu-card[data-card="sprout"]', '.mu-plinth[data-plinth="sprout"]');
  assert.strictEqual(await q("isDonated('sprout')"), true, 'dragging a spare onto its plinth donates it'); assert.ok(await page.locator('.mu-plinth.filled').count() === 1, 'and the plinth fills');
  // tap the card, then its plinth
  await page.click('.mu-card[data-card="acorn"]'); await page.click('.mu-plinth[data-plinth="acorn"]'); await page.waitForTimeout(600);
  assert.strictEqual(await q("isDonated('acorn')"), true, 'tap the card, then its plinth, also donates');
  // the rest at once
  await page.click('.mu-all'); await page.waitForTimeout(600);
  assert.strictEqual(await q("wingProgress(wingDef('grove'))"), 4, 'Donate all places every spare in the wing');
  await page.click('#muBack'); await page.waitForTimeout(250); assert.strictEqual(await q("museumEl.dataset.view"), 'hall', 'All wings returns to the hall');
  await page.click('#muLeave'); await page.waitForTimeout(1100); assert.ok(await q("!museumOpen() && !inScene"), 'Leave goes back to the street');
};
