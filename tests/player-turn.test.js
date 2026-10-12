// Turning on the spot (js/player-sprite.js): a character with turn art (Alyn) turns through the in-between pictures when her heading
// changes, looks at what she interacts with, and can be dragged round on the Character tab.
module.exports = async (page, assert) => {
  await page.evaluate(() => {
    const d = ensureDistrictData('square'); d.npcs.length = 0; d.boss = null; d.items = []; d.chest = null; d.spirits = [];
    state.currentDistrict = 'square'; state.playerPos = Object.assign({}, getMap('square').spawn); state.character.drawn = 'alyn';
    plFace = 'down'; plDeg = null; playerEl = null; townBuiltFor = null; renderTown(); switchTab('town');
  });
  const look = () => page.evaluate(() => { const s = playerEl.querySelector('.pl-sprite'); return [s.dataset.view, s.dataset.flip || '', s.dataset.ang === undefined ? '' : s.dataset.ang]; });
  const stepTo = (dx, dy) => page.evaluate(([dx, dy]) => { state.playerPos = { x: state.playerPos.x + dx, y: state.playerPos.y + dy }; positionPlayer(true); }, [dx, dy]);
  // Wait for the sprite to reach the expected [view, flip, angle] (null = don't care) instead of sleeping a fixed time: the turn
  // animation runs slower on a busy CI machine. A timeout is swallowed on purpose - the assertion after it reports the real value.
  const lookIs = want => page.waitForFunction(w => { const s = playerEl.querySelector('.pl-sprite'), g = [s.dataset.view, s.dataset.flip || '', s.dataset.ang === undefined ? '' : s.dataset.ang]; return w.every((x, i) => x === null || x === g[i]); }, want, { timeout: 6000 }).catch(() => {});

  assert.strictEqual(await page.evaluate(() => playerEl.querySelector('.pl-sprite').dataset.char), 'alyn', 'Alyn is drawn');
  assert.strictEqual(await page.evaluate(() => playerEl.querySelectorAll('.pl-view').length), 5, 'down, up, left, right and the turn picture');
  assert.strictEqual(await page.evaluate(() => playerArt().turn.length), 24, '24 turn pictures, 15 degrees apart');

  // a step to the right turns her through the in-between pictures and ends on her own right-facing drawing (never mirrored)
  // (a MutationObserver records every view change, so the brief in-between picture is caught however busy the machine is; polling can miss it)
  await page.evaluate(() => { window.__views = []; new MutationObserver(() => { const v = playerEl.querySelector('.pl-sprite').dataset.view; if (window.__views[window.__views.length - 1] !== v) window.__views.push(v); }).observe(playerEl, { attributes: true, attributeFilter: ['data-view'], subtree: true }); });
  await stepTo(1, 0);
  await lookIs(['right', '', '90']);
  assert.ok((await page.evaluate(() => window.__views)).includes('turn'), 'a quarter turn passes through a turn picture first');
  assert.deepStrictEqual(await look(), ['right', '', '90'], 'facing right, own drawing');
  await stepTo(0, -1); await lookIs(['up', '', '180']);
  assert.deepStrictEqual(await look(), ['up', '', '180'], 'facing up');
  await stepTo(-1, 0); await lookIs(['left', '', '270']);
  assert.deepStrictEqual(await look(), ['left', '', '270'], 'facing left');
  await stepTo(0, 1); await lookIs(['down', '', '0']);
  assert.deepStrictEqual(await look(), ['down', '', '0'], 'facing down again (the short way round)');

  // looking at a tile diagonally from her own, then a redraw of the town must not turn her back
  await page.evaluate(() => playerLookAt({ x: state.playerPos.x + 1, y: state.playerPos.y + 1 }));
  await lookIs(['turn', null, '45']);
  assert.deepStrictEqual((await look()).slice(0, 1).concat((await look())[2]), ['turn', '45'], 'looking diagonally down-right is 45 degrees');
  assert.ok(await page.evaluate(() => playerEl.querySelector('.pl-turn-img').src === playerArt().turn[3]), 'with that turn picture');
  await page.evaluate(() => positionPlayer(false));
  assert.strictEqual((await look())[2], '45', 'a redraw keeps the look direction');
  await page.evaluate(() => playerLookAt({ x: state.playerPos.x - 3, y: state.playerPos.y }));
  await lookIs(['left', '', '270']);
  assert.deepStrictEqual(await look(), ['left', '', '270'], 'a tile straight to the left is her left view');
  await page.evaluate(() => playerLookAt({ x: state.playerPos.x, y: state.playerPos.y }));
  assert.strictEqual((await look())[2], '270', 'her own tile changes nothing');
  await stepTo(1, 0); await lookIs(['right', null, null]);
  assert.strictEqual((await look())[0], 'right', 'a real step takes the look direction back to walking');

  // using something turns her to it
  const seen = await page.evaluate(() => {
    const orig = playerLookAt; let got = null; playerLookAt = t => { got = t; orig(t); };
    interactWith('building', { x: state.playerPos.x, y: state.playerPos.y - 1, locked: 'Shut for the test.' }); playerLookAt = orig;
    return got && got.y === state.playerPos.y - 1;
  });
  assert.ok(seen, 'interactWith turns her to face its target');
  await lookIs(['up', null, null]);
  assert.strictEqual((await look())[0], 'up', 'now looking up at it');

  // characters without turn art are left alone
  await page.evaluate(() => { state.character.drawn = 'first'; playerEl = null; townBuiltFor = null; renderTown(); plFace = 'down'; plDeg = null; positionPlayer(false); });
  assert.strictEqual(await page.evaluate(() => playerEl.querySelectorAll('.pl-view').length), 3, 'the Original has no turn picture');
  await page.evaluate(() => playerLookAt({ x: state.playerPos.x + 1, y: state.playerPos.y }));
  assert.strictEqual((await look())[0], 'down', 'looking at something does not turn a character with no turn art');

  // the Character tab: drag her round, and she settles back to the front
  await page.evaluate(() => { state.character.drawn = 'alyn'; switchTab('character'); renderCharacterTab(); });
  await page.waitForSelector('#chStage .ch-fig', { state: 'attached' });
  const box = await page.evaluate(() => { const r = document.getElementById('chMe').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await page.mouse.move(box.x, box.y); await page.mouse.down(); await page.mouse.move(box.x + 30, box.y, { steps: 3 }); await page.mouse.move(box.x + 60, box.y, { steps: 3 });
  assert.strictEqual(await page.evaluate(() => document.querySelector('#chStage .ch-fig').dataset.ang), '45', 'dragging 60 px turns her 45 degrees');
  await page.mouse.up();
  assert.ok(await page.evaluate(() => !document.getElementById('chMe').classList.contains('hop')), 'a drag is not a tap (no hop)');
  await page.waitForFunction(() => document.querySelector('#chStage .ch-fig').dataset.ang === '0', null, { timeout: 10000 }).catch(() => {});   // she turns back on a timer; wait for it rather than a fixed 3.7 s
  assert.strictEqual(await page.evaluate(() => document.querySelector('#chStage .ch-fig').dataset.ang), '0', 'she turns back to the front');
  await page.evaluate(() => { state.character.drawn = 'first'; });
};
