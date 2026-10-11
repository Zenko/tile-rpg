// The home room's Decorate/Done button must sit under menus: opening Settings from the room must not leave it floating on top.
module.exports = async (page, assert) => {
  const ev = (fn, arg) => page.evaluate(fn, arg);
  await ev(() => { switchTab('town'); openScene('home'); });
  await page.waitForFunction(() => !!document.querySelector('.hr-room .hr-world'), null, { timeout: 8000 });
  await page.click('.hr-edit-btn');   // edit mode: the button reads "Done"
  await ev(() => openPlayerMenu());
  const top = await ev(() => {
    const b = document.querySelector('.hr-edit-btn').getBoundingClientRect();
    const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
    return !!(hit && hit.closest('.hr-edit-btn'));
  });
  assert.ok(!top, 'the Done button is not painted over the Settings menu');
};
