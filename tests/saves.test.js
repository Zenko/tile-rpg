// Old and hostile saves: they load, get filled in, and nothing player-typed can inject markup.
module.exports = async (page, assert) => {
  // 1. A bare v3-era save (just a position) is carried forward and every tab still draws.
  await page.evaluate(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.setItem(OLD_STORAGE_KEY, JSON.stringify({ playerPos: { x: 3, y: 3 }, ownedCards: ['sprout', 'sprout', 'pebble'], deck: ['sprout'] }));
    loadState();
  });
  assert.ok(await page.evaluate(() => state.progress && typeof state.progress.pebbles === 'number'), 'progress was not created');
  for (const tab of ['collection', 'quests', 'character', 'journal', 'town']) { await page.evaluate(t => switchTab(t), tab); await page.waitForTimeout(150); }
  // 2. Hostile character fields are cut down on load.
  await page.evaluate(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.assign({}, state, { character: Object.assign({}, state.character, { name: '<img src=x onerror=window.__pwned=1>'.repeat(3), emoji: '<img src=x onerror=window.__pwned=1>' }) })));
    loadState();
  });
  const c = await page.evaluate(() => state.character);
  assert.ok(c.name.length <= 16, 'name not shortened');
  assert.strictEqual(c.emoji, '🧑', 'markup emoji was kept');
  // 3. escapeHtml neutralises the usual suspects.
  assert.strictEqual(await page.evaluate(() => escapeHtml('<b a="1">&\'')), '&lt;b a=&quot;1&quot;&gt;&amp;&#39;');
  assert.ok(!(await page.evaluate(() => window.__pwned)), 'injected script ran');
};
