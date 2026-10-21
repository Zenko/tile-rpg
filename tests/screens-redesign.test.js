// The weather board is rows (not one paragraph), the mailbox is grouped, and the cellar's bar and pill carry its floor, hearts and lantern.
module.exports = async (page, assert) => {
  await page.evaluate(() => { showProp('🪧', 'Sign', { html: weatherBoardHtml('"Hello."') }); });
  const rows = await page.evaluate(() => document.querySelectorAll('#sceneryDesc.rich .wb-row').length);
  assert.ok(rows >= 3, 'weather board should show Now, Today and Town mood rows, got ' + rows);
  await page.evaluate(() => {
    document.getElementById('sceneryOverlay').classList.add('hidden');
    const ms = mailState(); ms.list = [{ id: 'a', at: Date.now(), read: false, claimed: false, from: 'Hazel', subject: 'Hi', icon: '🐰', body: 'x', gift: { pebbles: 5 } }, { id: 'b', at: Date.now(), read: true, claimed: false, from: 'Fern', subject: 'Old', icon: '🌷', body: 'y' }];
    openScene('home'); sceneAction('mail');
  });
  const mail = await page.evaluate(() => ({ secs: [...document.querySelectorAll('.mail-sec')].map(e => e.textContent), items: document.querySelectorAll('.mail-item').length, gift: !!document.querySelector('.mail-gift') }));
  assert.strictEqual(mail.items, 2); assert.ok(mail.gift, 'gift letter shows a Gift chip'); assert.strictEqual(mail.secs.length, 2, 'two groups: ' + mail.secs.join('|'));
  await page.evaluate(() => { closeScene(); const st = cellarState(); st.floor = 3; st.run = null; cellarNewRun(st); openScene('cellar'); });
  await page.waitForTimeout(500);
  const hud = await page.evaluate(() => ({ bar: document.getElementById('hudCellar').textContent, pill: document.getElementById('pwTime').textContent }));
  assert.ok(/Floor 4 · ♥♥♥/.test(hud.bar) && /Lantern/.test(hud.bar) && /^F4/.test(hud.pill), 'the cellar bar and pill carry the floor, hearts and lantern: ' + JSON.stringify(hud));
  await page.evaluate(() => { pwLeave('left', true); const st = cellarState(); st.floor = 0; st.run = null; });
};
