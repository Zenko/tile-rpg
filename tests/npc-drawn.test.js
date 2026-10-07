// A neighbour drawn with a character (NPC_DRAWN_TEST in js/player-sprite.js): the Square's first plain neighbour is Don, the rest keep their emoji.
module.exports = async (page, assert) => {
  await page.evaluate(() => { state.currentDistrict = 'square'; state.playerPos = Object.assign({}, getMap('square').spawn); renderTown(); switchTab('town'); });
  const info = () => page.evaluate(() => {
    const d = ensureDistrictData('square'), plain = fighters(d).filter(n => !n.isBoss && !n.isRival && !n.isAtlas && !n.defeated);
    const el = f => entityElsById.get(f.id);
    return { n: plain.length, drawn: plain.map(f => !!(el(f) && el(f).querySelector(':scope > .pl-sprite'))), emoji: plain.map(f => !!(el(f) && el(f).querySelector(':scope > span'))) };
  });
  const s = await info();
  assert.ok(s.n >= 1, 'the Square has neighbours');
  assert.deepStrictEqual(s.drawn, s.drawn.map((_, i) => i === 0), 'only the first plain neighbour is drawn');
  assert.ok(s.emoji.slice(1).every(Boolean), 'the others keep their emoji');

  // it turns to face the way it moves and steps while it glides
  const r = await page.evaluate(async () => {
    const d = ensureDistrictData('square'), f = fighters(d).find(n => !n.isBoss && !n.isRival && !n.isAtlas && !n.defeated), el = entityElsById.get(f.id);
    moveFighter(f, { x: f.x - 1, y: f.y, dx: -1 });
    const left = [el.querySelector('.pl-sprite').dataset.view, el.querySelector('.pl-sprite').dataset.flip || '', el.classList.contains('walking')];
    moveFighter(f, { x: f.x + 1, y: f.y, dx: 1 });
    const right = [el.querySelector('.pl-sprite').dataset.view, el.querySelector('.pl-sprite').dataset.flip || ''];
    moveFighter(f, { x: f.x, y: f.y - 1, dx: 0 });
    const up = el.querySelector('.pl-sprite').dataset.view;
    await new Promise(res => setTimeout(res, GRAVE_MOVE_MS + 150));
    return { left, right, up, stopped: !el.classList.contains('walking') };
  });
  assert.deepStrictEqual(r.left, ['left', '', true], 'facing left, walking');
  assert.deepStrictEqual(r.right, ['left', '1'], 'right is the left view mirrored');
  assert.strictEqual(r.up, 'up', 'facing up');
  assert.ok(r.stopped, 'it stops stepping when it arrives');
};
