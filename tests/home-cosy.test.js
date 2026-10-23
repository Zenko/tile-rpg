// The Cosy score (js/home-room.js hrCosy): what raises it, its tiers and cap, and what it pays.
module.exports = async (page, assert) => {
  await page.evaluate(require('./home-fixture').furnish);   // the furnished 6 by 6 home these checks were written for
  const ev = (fn, arg) => page.evaluate(fn, arg);
  await ev(() => { switchTab('town'); openScene('home'); });
  await page.waitForFunction(() => !!document.querySelector('.hr-room .hr-world'), null, { timeout: 8000 });

  const c0 = await ev(() => hrCosy());
  assert.deepStrictEqual([c0.score, c0.tier], [2, 'Bare'], 'a plain new home is bare: only the armchair counts, for comfort');
  assert.strictEqual(await ev(() => hrCosyBonus() + hrCosyVisitBonus()), 0.003, 'and pays almost nothing extra');

  const add = (...ids) => ev(ids => { const h = hrHome(); ids.forEach((id, k) => h.items.push({ uid: 'c' + h.items.length + k, id, x: 1 + (h.items.length % 6), y: 3 })); }, ids);
  await add('lamp', 'sconce', 'window');
  const lit = await ev(() => hrCosyParts().light);
  assert.deepStrictEqual(lit.slice(0, 2), [9, 12], 'three lights are 9 of 12 light points');
  await add('plant', 'tree', 'grove');
  assert.strictEqual(await ev(() => hrCosyParts().greenery[0]), 9, 'a plant, a tree and a Grove nook are greenery');
  await add('rug3', 'cot', 'cat');
  assert.strictEqual(await ev(() => hrCosyParts().comfort[0]), 4 + 4 + 3 + 2, 'rug, cot, cat and armchair make it comfy');
  const before = (await ev(() => hrCosy())).score;
  await ev(() => { const h = hrHome(); h.style.floor = 'walnut'; h.style.wall = 'sage'; });
  assert.strictEqual((await ev(() => hrCosy())).score, before + 4, 'your own floor and wall colours are worth 2 each');

  // tiers, and the pay
  await ev(() => { hrHome().items = hrHome().items.filter(i => hrDef(i).act); hrHome().style = { floor: 'oak', wall: 'plaster', rug: 'teal' }; });
  assert.strictEqual(await ev(() => hrCosy().tier), 'Bare');
  await add('lamp', 'plant', 'stool', 'table', 'rug2', 'clock');
  const mid = await ev(() => hrCosy());
  assert.ok(mid.score >= 10 && mid.score < 45 && ['Settled', 'Cosy'].includes(mid.tier), 'a modest room is settled or cosy: ' + mid.score + ' ' + mid.tier);
  await add('lamp', 'sconce', 'fireplace', 'plant', 'tree', 'cot', 'cat', 'rug3', 'painting', 'bookcase', 'wardrobe', 'chest', 'window', 'window', 'grove', 'basin', 'cairn', 'chimes', 'toys', 'table', 'stool');
  await ev(() => { const h = hrHome(); h.style = { floor: 'walnut', wall: 'sage', rug: 'red' }; });
  const top = await ev(() => hrCosy());
  assert.ok(top.score >= 70 && top.score <= 100 && top.tier === 'Enchanting', 'a full room is enchanting and never over 100: ' + top.score);
  assert.strictEqual(await ev(() => hrCosyBonus()), 2, 'an enchanting home pays 2 extra Embers a nap');
  assert.ok(await ev(() => hrCosyVisitBonus() > 0.1 && hrCosyVisitBonus() <= 0.15), 'and calls spirits more often');

  // the nap pays it
  await ev(() => { buildingState('home').nap = null; });
  const p0 = await ev(() => state.progress.pebbles);
  await ev(() => sceneAction('nap'));
  const paid = (await ev(() => state.progress.pebbles)) - p0;
  assert.strictEqual(paid, await ev(() => 3 + (weatherFx().dailyBonus || 0) + hrCosyBonus()), 'the nap pays its 3 plus weather plus cosiness');

  // Manage's Home tab shows it
  await ev(() => { hrRefresh(); homeScreenOpen('manage'); });
  assert.ok(await ev(() => /Cosiness/.test(document.getElementById('hoStage').textContent) && /Enchanting/.test(document.getElementById('hoStage').textContent)), 'Manage shows the score and tier');
};
