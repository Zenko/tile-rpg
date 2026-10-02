// The weather board is rows (not one paragraph), the mailbox is grouped, and the cellar hud keeps hearts and lantern chips on one row.
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
  const hud = await page.evaluate(() => !!document.querySelector('.cl-top .cl-hearts') && !!document.querySelector('.cl-top #clChips'));
  assert.ok(hud, 'hearts and lantern chips share the .cl-top row');
};
