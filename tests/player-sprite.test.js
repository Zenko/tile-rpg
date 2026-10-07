// The drawn player (js/player-sprite.js): the character faces the way it last stepped and the walk animates body + feet.
module.exports = async (page, assert) => {
  await page.evaluate(() => {
    const d = ensureDistrictData('square'); d.npcs.length = 0; d.boss = null; d.items = []; d.chest = null; d.spirits = [];
    state.currentDistrict = 'square'; state.playerPos = Object.assign({}, getMap('square').spawn); plFace = 'down';
    renderTown(); switchTab('town');
  });
  const view = () => page.evaluate(() => { const s = playerEl.querySelector('.pl-sprite'); return s ? [s.dataset.view, s.dataset.flip || ''] : null; });
  assert.deepStrictEqual(await view(), ['down', ''], 'a drawn sprite, facing down at the start');
  assert.strictEqual(await page.evaluate(() => playerEl.querySelectorAll('.pl-view').length), 3, 'down, up and left drawings (right is left mirrored)');

  const stepTo = (dx, dy) => page.evaluate(([dx, dy]) => { state.playerPos = { x: state.playerPos.x + dx, y: state.playerPos.y + dy }; positionPlayer(true); }, [dx, dy]);
  await stepTo(1, 0);  assert.deepStrictEqual(await view(), ['left', '1'], 'right is the left view mirrored');
  await stepTo(-1, 0); assert.deepStrictEqual(await view(), ['left', ''], 'facing left');
  await stepTo(0, -1); assert.deepStrictEqual(await view(), ['up', ''], 'facing up');
  await stepTo(0, 1);  assert.deepStrictEqual(await view(), ['down', ''], 'facing down');
  await stepTo(8, 8);  assert.deepStrictEqual(await view(), ['down', ''], 'a jump across the map keeps the facing');

  // a real right-facing drawing is used as it is, not mirrored
  await page.evaluate(() => { playerArt().views.right = playerArt().views.left; playerEl = null; townBuiltFor = null; renderTown(); plFace = 'right'; positionPlayer(false); });
  assert.deepStrictEqual(await view(), ['right', ''], 'a real right view is not flipped');
  await page.evaluate(() => { delete playerArt().views.right; playerEl = null; townBuiltFor = null; renderTown(); positionPlayer(false); });

  // walking turns the animation on (and the feet move)
  await page.evaluate(() => playerEl.classList.add('walking'));
  const anim = await page.evaluate(() => ['.pl-body', '.pl-leg.l', '.pl-leg.r'].map(q => getComputedStyle(playerEl.querySelector('.pl-view[data-v="' + playerEl.querySelector('.pl-sprite').dataset.view + '"] ' + q)).animationName));
  assert.deepStrictEqual(anim, ['pl-bob', 'pl-lift-l', 'pl-lift-r'], 'body and both feet animate while walking');
  await page.evaluate(() => playerEl.classList.remove('walking'));

  // no art loaded: the old emoji badge comes back instead of an empty spot
  await page.evaluate(() => { PLAYER_ART.order = []; playerEl = null; townBuiltFor = null; renderTown(); positionPlayer(false); });
  assert.ok(await page.evaluate(() => !!playerEl.querySelector('.pl-badge')), 'falls back to the badge');
};
