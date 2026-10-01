// The game boots, every tab opens, and the version labels are wired up.
module.exports = async (page, assert) => {
  for (const tab of ['collection', 'journal', 'quests', 'character', 'town']) {
    await page.evaluate(t => switchTab(t), tab); await page.waitForTimeout(250);
    assert.ok(await page.evaluate(t => !document.getElementById(({ collection: 'collectionPanel', journal: 'journalPanel', quests: 'questsPanel', character: 'characterPanel', town: 'townPanel' })[t]).classList.contains('hidden'), tab), `tab ${tab} did not open`);
  }
  const v = await page.evaluate(() => ({ label: gameVersionLabel(), build: gameBuildLabel(), n: RELEASES[0].n }));
  assert.match(v.label, /^Beta \d+/); assert.match(v.build, /build \d+/);
  assert.ok(await page.evaluate(() => typeof BUILD === 'number'));
};
