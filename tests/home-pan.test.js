// While decorating you cannot walk, so a drag pans the camera and a plain tap still picks a piece up (real mouse events).
module.exports = async (page, assert) => {
  const until = (fn, arg) => page.waitForFunction(fn, arg, { timeout: 8000 });
  const ev = (fn, arg) => page.evaluate(fn, arg);
  await ev(() => { switchTab('town'); openScene('home'); });
  await until(() => !!document.querySelector('.hr-room .hr-world'));
  await page.click('.hr-edit-btn');
  const cam = () => ev(() => [Math.round(homeRoom.cx), Math.round(homeRoom.cy)]);
  const box = await ev(() => { const r = homeRoom.host.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  // a plain click on the mailbox picks it up
  const at = await ev(() => { const h = homeRoom, r = h.host.getBoundingClientRect(), i = hrHome().items.find(x => x.id === 'mail'); return { x: r.left + h.cx + (i.x + .5) * h.t, y: r.top + h.cy + (i.y + .5) * h.t }; });
  await page.mouse.click(at.x, at.y);
  assert.strictEqual(await ev(() => hrSelected() && hrSelected().id), 'mail', 'a tap picks a piece up');
  await ev(() => sceneAction('hr:desel'));
  // a drag moves the camera and picks nothing up
  const before = await cam();
  await page.mouse.move(box.x + box.w / 2, box.y + box.h * .5); await page.mouse.down();
  await page.mouse.move(box.x + box.w / 2, box.y + box.h * .5 + 60, { steps: 4 }); await page.mouse.move(box.x + box.w / 2 + 40, box.y + box.h * .5 + 160, { steps: 4 }); await page.mouse.up();
  const after = await cam();
  assert.ok(after[1] > before[1] || after[0] !== before[0], 'a drag moves the camera: ' + before + ' -> ' + after);
  assert.strictEqual(await ev(() => hrSelected()), null, 'and a drag does not pick anything up');
  // Done brings the camera back to you
  await ev(() => sceneAction('hr-close'));
  assert.ok(await ev(() => !homeRoom.edit), 'Done leaves decorating');
};
