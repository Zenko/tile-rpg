// Build 240: saved note drawings are dropped once (written notes stay), and a save that cannot be written is no longer silent.
module.exports = async (page, assert) => {
  // ---- drawings are dropped once, written notes are kept ----
  const mig = await page.evaluate(() => {
    const pr = state.progress, big = 'data:image/png;base64,' + 'A'.repeat(6000);
    delete pr.drawingsDropped;
    pr.notesList = [{ id: 'w', type: 'write', title: 'Plan', text: 'keep me', drawing: big, updatedAt: 1 }, { id: 'd', type: 'draw', title: 'Sketch', text: '', drawing: big, updatedAt: 2 }];
    pr.drawing = big;
    ensureJournal();
    return { ids: pr.notesList.map(n => n.id), kept: pr.notesList[0] && pr.notesList[0].text, drawing: pr.notesList[0] && pr.notesList[0].drawing, flag: pr.drawingsDropped, legacy: 'drawing' in pr, size: JSON.stringify(pr.notesList).length };
  });
  assert.deepStrictEqual(mig.ids, ['w'], 'the drawing note is gone, the written note stays');
  assert.strictEqual(mig.kept, 'keep me'); assert.strictEqual(mig.drawing, '', 'a written note carries no drawing');
  assert.ok(mig.flag && !mig.legacy && mig.size < 500, 'flagged as done, the old single drawing is gone, and the save is small again: ' + JSON.stringify(mig));

  // ---- a save the device refuses is reported, once, and again after a good save ----
  const r = await page.evaluate(async () => {
    const out = {}, shown = [], realToast = toast; toast = m => { if (/^⚠️/.test(m)) shown.push(m); };   // only the warnings: ordinary game toasts can land in the same moment
    const realSet = Storage.prototype.setItem; let fail = true;
    Storage.prototype.setItem = function (k, v) { if (fail && k === STORAGE_KEY) throw new DOMException('full', 'QuotaExceededError'); return realSet.call(this, k, v); };
    try {
      saveFailWarned = false; saveFailAt = 0;
      saveState(); flushSaveState(); out.first = shown.length;
      saveState(); flushSaveState(); out.second = shown.length;          // still failing: not nagged again
      fail = false; saveState(); flushSaveState();                        // a good save resets it
      fail = true; saveState(); flushSaveState(); out.third = shown.length;
      out.text = shown[0];
    } finally { Storage.prototype.setItem = realSet; toast = realToast; saveFailWarned = false; }
    return out;
  });
  assert.strictEqual(r.first, 1, 'a failed save shows a warning'); assert.strictEqual(r.second, 1, 'and does not repeat while it keeps failing');
  assert.strictEqual(r.third, 2, 'but warns again once a good save has happened in between');
  assert.ok(/could not store your save/.test(r.text) && /may be lost/.test(r.text), 'the message says what happened: ' + r.text);

  // ---- the cloud backup refusing the document (too big) is reported too, offline is not ----
  const c = await page.evaluate(async () => {
    const shown = [], realToast = toast; toast = m => { if (/^⚠️/.test(m)) shown.push(m); };   // only the warnings: ordinary game toasts can land in the same moment
    const saved = { cloudReady, cloudDb, cloudUser, cloudSyncing };
    const fakeDb = code => ({ collection: () => ({ doc: () => ({ set: () => (code ? Promise.reject({ code }) : Promise.resolve()), get: () => Promise.resolve({ exists: false }) }) }) });
    const run = async code => { saveFailWarned = false; saveFailAt = 0; cloudReady = true; cloudSyncing = false; cloudUser = { uid: 'u' }; cloudDb = fakeDb(code); try { cloudPush(); } catch (e) { /* fake db */ } await new Promise(r => setTimeout(r, 50)); };
    try {
      await run('invalid-argument'); const tooBig = shown.slice();
      shown.length = 0; await run('unavailable'); const offline = shown.slice();
      return { tooBig, offline };
    } finally { ({ cloudReady, cloudDb, cloudUser, cloudSyncing } = saved); toast = realToast; saveFailWarned = false; }
  });
  assert.ok(c.tooBig.length === 1 && /too big for the cloud backup/.test(c.tooBig[0]) && !/may be lost/.test(c.tooBig[0]), 'a refused cloud document is reported: ' + JSON.stringify(c.tooBig));
  assert.strictEqual(c.offline.length, 0, 'an ordinary network problem stays quiet');
};
