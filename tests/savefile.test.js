// Save file (build 283): export makes a readable file, a good file is accepted, bad ones are refused, and loading writes the save
// without the pending autosave undoing it.
module.exports = async (page, assert) => {
  const r = await page.evaluate(() => {
    const out = {};
    state.ownedCards.push('sprout', 'sprout', 'sprout'); state.progress.pebbles = 777; saveState();
    const text = saveFileBuild(), data = JSON.parse(text);
    out.wrapped = data.format === 1 && data.game === GAME.title && data.build === BUILD && !!data.savedAt && data.state.progress.pebbles === 777;
    out.name = saveFileName();
    out.good = saveFileCheck(text).ok; out.bare = saveFileCheck(JSON.stringify(data.state)).ok;
    out.bad = ['', '   ', 'not json', '[]', '"x"', '{}', '{"playerPos":{}}', JSON.stringify({ state: { playerPos: {}, ownedCards: [], progress: [] } }), JSON.stringify({ build: BUILD + 500, state: data.state })].map(t => saveFileCheck(t).ok);
    out.tooBig = saveFileCheck('x'.repeat(SAVE_FILE_MAX_BYTES + 1)).ok;
    // applying: a different save lands in storage even with an autosave pending, and the old one is kept
    const other = JSON.parse(text).state; other.progress.pebbles = 4242; other.character.name = 'Imported';
    state.progress.pebbles = 1; saveState();                                   // an autosave is now waiting
    out.applied = applySaveFile(other, false);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)), prev = JSON.parse(localStorage.getItem(STORAGE_KEY + '-before-load'));
    out.stored = stored.progress.pebbles; out.name2 = stored.character.name; out.fresh = stored.cloudSavedAt > Date.now() - 5000; out.prev = prev.progress.pebbles;
    flushSaveState(); out.afterFlush = JSON.parse(localStorage.getItem(STORAGE_KEY)).progress.pebbles;   // nothing pending to overwrite it
    // the button asks first
    importSaveText(text, false); out.asked = !document.getElementById('confirmOverlay').classList.contains('hidden');
    document.getElementById('confirmCancel').click();
    return out;
  });
  assert.ok(r.wrapped, 'the file holds the save with its game, format and build'); assert.ok(/-save-\d{4}-\d\d-\d\d\.json$/.test(r.name), r.name);
  assert.ok(r.good && r.bare, 'a real save is accepted, wrapped or bare'); assert.deepStrictEqual(r.bad, r.bad.map(() => false), 'empty, unreadable, wrong-shape and too-new files are refused');
  assert.strictEqual(r.tooBig, false);
  assert.ok(r.applied && r.stored === 4242 && r.name2 === 'Imported', 'the loaded save is what is stored: ' + JSON.stringify(r));
  assert.strictEqual(r.prev, 1, 'the save it replaced is kept'); assert.ok(r.fresh, 'cloud sync will see it as the newest');
  assert.strictEqual(r.afterFlush, 4242, 'a pending autosave cannot write the old game back over it'); assert.ok(r.asked, 'loading asks before replacing');

  // the real round trip through the page: download, then load into a fresh page
  const [dl] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => document.getElementById('saveFileExportBtn').click())]);
  const path = await dl.path(), fs = require('fs'); assert.ok(saveFileOk(fs.readFileSync(path, 'utf8')), 'the downloaded file is a valid save');
  function saveFileOk(t) { try { const d = JSON.parse(t); return d.format === 1 && Array.isArray(d.state.ownedCards); } catch (e) { return false; } }
  await page.evaluate(() => { localStorage.removeItem(STORAGE_KEY + '-before-load'); });
  await page.setInputFiles('#saveFileInput', path);
  await page.waitForTimeout(300);
  assert.ok(await page.evaluate(() => !document.getElementById('confirmOverlay').classList.contains('hidden')), 'choosing a file opens the confirm sheet');
  await page.evaluate(() => document.getElementById('confirmCancel').click());
};
