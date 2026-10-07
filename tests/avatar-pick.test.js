// The avatar picker offers the drawn character (js/player-sprite.js) as the first swatch, on by default; an emoji look turns it off.
module.exports = async (page, assert) => {
  const look = () => page.evaluate(() => ({
    drawn: state.character.drawn, sprite: !!playerEl.querySelector('.pl-sprite'), badge: !!playerEl.querySelector('.pl-badge'),
    hud: !!document.querySelector('#avatarChipEmoji .av-face'), first: document.querySelector('#chBody .emoji-swatch, .shop-swatch-row .emoji-swatch')?.classList.contains('drawn-swatch'),
  }));
  await page.evaluate(() => { renderTown(); switchTab('character'); charView = 'look'; renderCharacterTab(); });
  let s = await look();
  assert.ok(s.sprite && !s.badge && s.hud, 'the drawn character is the default: sprite in town, face in the HUD');
  assert.ok(s.first, 'the drawn character is the first avatar swatch');
  assert.ok(await page.evaluate(() => document.querySelector('.drawn-swatch').classList.contains('active')), 'and it is marked as picked');
  const sizes = await page.evaluate(() => { const r = e => e.getBoundingClientRect(); const a = document.querySelector('.drawn-swatch'), b = document.querySelector('.shop-swatch-row .emoji-swatch:not(.drawn-swatch)'); return [r(a).width, r(a).height, r(b).width, r(b).height]; });
  assert.deepStrictEqual(sizes.slice(0, 2), sizes.slice(2), 'it is the same size as the emoji swatches');

  await page.evaluate(() => document.querySelector('.shop-swatch-row .emoji-swatch:not(.drawn-swatch)').click());
  s = await look();
  assert.strictEqual(s.drawn, false, 'picking an emoji turns the drawn character off');
  assert.ok(s.badge && !s.sprite && !s.hud, 'the town shows the emoji badge again and the HUD the emoji');
  assert.ok(!(await page.evaluate(() => document.querySelector('.drawn-swatch').classList.contains('active'))), 'the drawn swatch is no longer marked');

  await page.evaluate(() => document.querySelector('.drawn-swatch').click());
  s = await look();
  assert.ok(s.drawn === true && s.sprite && !s.badge && s.hud, 'and she comes back with one tap');
};
