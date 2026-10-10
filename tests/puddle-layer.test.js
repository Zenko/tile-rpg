// Rain puddles (js/town-life.js) are part of the ground: whatever stands or walks on their tile is drawn above them.
module.exports = async (page, assert) => {
  await page.evaluate(() => {
    const d = ensureDistrictData('square'); d.boss = null; d.items = []; d.chest = null; d.spirits = [];
    state.currentDistrict = 'square'; state.playerPos = Object.assign({}, getMap('square').spawn);
    state.weather.current = 'rain'; renderTown(); switchTab('town');
  });
  const info = await page.evaluate(() => {
    const p = townWorld.querySelector('.ent.life-puddle'); if (!p) return null;
    const x = +p.dataset.x, y = +p.dataset.y;
    // put a neighbour, a decoration and the player on that very tile
    const d = ensureDistrictData('square'); d.decorations = d.decorations || [];
    d.decorations.push({ id: DECORATION_ITEMS[0].id, x, y, uid: 'pz' }); renderTown();
    state.playerPos = { x, y }; positionPlayer(false);
    const z = el => +getComputedStyle(el).zIndex, pud = townWorld.querySelector('.ent.life-puddle[data-x="' + x + '"][data-y="' + y + '"]');
    return { puddle: z(pud), deco: z(townWorld.querySelector('.ent.decoration')), player: z(playerEl), row: y };
  });
  assert.ok(info, 'it rains puddles');
  assert.strictEqual(info.puddle, 0, 'a puddle is the lowest thing in the town');
  assert.ok(info.deco > info.puddle && info.player > info.puddle, 'a decoration and the player are drawn over it: ' + JSON.stringify(info));
};
