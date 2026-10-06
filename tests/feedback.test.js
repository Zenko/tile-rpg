// Settings has one "Feedback and bugs" button (the separate Report a bug button is gone) and it opens the feedback sheet.
module.exports = async (page, assert) => {
  assert.strictEqual(await page.locator('#bugBtn').count(), 0, 'the Report a bug button should be gone');
  assert.strictEqual(await page.locator('#feedbackBtn').count(), 1, 'there is one Feedback button');
  assert.ok(/bugs/i.test(await page.locator('#feedbackBtn').textContent()), 'the button says it also takes bug reports');
  await page.evaluate(() => { sendFeedback('feedback'); });
  const r = await page.evaluate(() => ({ open: !document.getElementById('feedbackOverlay').classList.contains('hidden'), title: document.getElementById('feedbackModalTitle').textContent, desc: document.getElementById('feedbackModalDesc').textContent }));
  assert.ok(r.open && /bugs/i.test(r.title) && /bug/i.test(r.desc), 'the sheet should open and mention bugs: ' + JSON.stringify(r));
  await page.evaluate(() => closeFeedbackModal(null));
  assert.ok(await page.evaluate(() => document.getElementById('feedbackOverlay').classList.contains('hidden')), 'cancel closes the sheet');
};
