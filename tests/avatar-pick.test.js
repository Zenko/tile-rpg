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
  assert.ok(s.sprite && !s.badge && s.hud, 'and she comes back with one tap');

  // more drawn characters (Don, Alyn) are more swatches of the same size; picking it swaps the town sprite and the portraits
  const n = await page.evaluate(() => [...document.querySelectorAll('.drawn-swatch')].filter(e => e.getBoundingClientRect().width > 0).length);
  assert.strictEqual(n, 3, 'every drawn character has a swatch');
  const faces = () => page.evaluate(() => ({ char: playerEl.querySelector('.pl-sprite').dataset.char, hud: document.querySelector('#avatarChipEmoji .av-face').src, drawn: state.character.drawn }));
  const before = await faces();
  await page.evaluate(() => [...document.querySelectorAll('.drawn-swatch')].find(e => e.title === 'Don').click());
  const after = await faces();
  assert.deepStrictEqual([after.char, after.drawn], ['don', 'don'], 'Don is the town sprite');
  assert.notStrictEqual(after.hud, before.hud, 'and his face is in the HUD');
  const sizes2 = await page.evaluate(() => [...document.querySelectorAll('.drawn-swatch')].map(e => Math.round(e.getBoundingClientRect().width)).filter(w => w > 0));   // the Card Shop's copies are on a hidden tab
  assert.ok(sizes2.every(w => w === sizes2[0]), 'every drawn swatch is the same size: ' + sizes2);
  assert.ok(await page.evaluate(() => [...document.querySelectorAll('.drawn-swatch')].filter(e => e.classList.contains('active') && e.getBoundingClientRect().width > 0).length === 1), 'only one is marked');
  await page.evaluate(() => { state.character.drawn = 'gone'; renderTown(); });
  assert.strictEqual((await faces()).char, 'first', 'an unknown id falls back to the first character');

  // the Character tab stage shows a drawn character whole (not a face in a circle), and keeps the round portrait for emoji looks
  const stage = () => page.evaluate(() => { const st = document.getElementById('chStage').getBoundingClientRect(), f = document.querySelector('#chStage .ch-fig'), r = f && f.getBoundingClientRect(); return { fig: !!f, circle: !!document.querySelector('#chStage .avatar-preview'), inside: !!r && r.top >= st.top && r.bottom <= st.bottom && r.left >= st.left && r.right <= st.right, h: r ? r.height : 0 }; });
  await page.evaluate(() => { state.character.drawn = 'first'; switchTab('character'); charView = 'me'; renderCharacterTab(); });
  await page.waitForTimeout(600);   // the stage grows from its compact height
  let g = await stage();
  assert.ok(g.fig && !g.circle && g.inside && g.h > 100, 'the drawn character stands in full on the stage: ' + JSON.stringify(g));
  await page.evaluate(() => { state.character.drawn = false; renderCharacterTab(); });
  g = await stage();
  assert.ok(!g.fig && g.circle, 'an emoji look keeps the round portrait');
};
