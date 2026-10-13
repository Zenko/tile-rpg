// js/game-config.js is the one place for the names players see: rename everything in it and none of the old names may
// show up anywhere - not in the static page, the data tables, the story, the guide or a building screen.
const fs = require('fs'), path = require('path');
module.exports = async (page, assert) => {
  const old = await page.evaluate(() => [GAME.title, GAME.currency.one, GAME.currency.many, ...Object.values(GAME.player),
    ...Object.values(PLACES), ...Object.values(BOSSES), ...Object.values(FAMILY_NAMES), ...Object.values(CAST).map(c => c.name)]);
  // Same as an owner editing the values: mutate the config objects at the end of the file, before any other script runs.
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'game-config.js'), 'utf8') + `
    GAME.title = 'Zed Quest'; GAME.currency.one = 'Zedcoin'; GAME.currency.many = 'Zedcoins';
    Object.assign(GAME.player, { one: 'Zedwalker', many: 'Zedwalkers', lower: 'zedwalker', lowerMany: 'zedwalkers' });
    [PLACES, BOSSES, FAMILY_NAMES].forEach((o, i) => Object.keys(o).forEach(k => { o[k] = 'Zed' + ['place', 'boss', 'family'][i] + k; }));
    Object.keys(CAST).forEach(k => { CAST[k].name = 'Zed' + k; CAST[k].icon = '🦄'; });`;
  // Neighbours already in a save keep the names they were given (that is save data, not text): start the town over, as a
  // reskin with a fresh STORAGE_KEY would.
  await page.evaluate(() => { state.districtData = {}; saveState(); });
  await page.route('**/js/game-config.js', r => r.fulfill({ contentType: 'application/javascript', body: src }));
  await page.reload(); await page.waitForTimeout(800);
  const oldRe = new RegExp('(?<![A-Za-z])(' + old.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')(?![A-Za-zñ])');

  const r = await page.evaluate(() => ({
    title: document.title, hud: document.getElementById('hudDistrict').textContent, tip: document.getElementById('pillPebbles').title,
    district: DISTRICTS.square.name, boss: DISTRICTS.harbor.boss, family: FAMILIES.tide.name, rival: BattleEngine.defOf('rooks-ace').name,
    bakery: INTERIORS.bakery.title, baker: INTERIORS.bakery.who, guideIcon: STORY_GUIDE_ICON, money: currencyName(1) + '/' + currencyName(3),
    tables: JSON.stringify([STORY, STORY_BEATS, GUIDE, TIPS, QUEST_POOL, GAZETTE_STORIES, INTERIORS, DISTRICTS, FAMILIES, NPC_POOLS, TN_CAST, ROOK_LETTERS])
  }));
  assert.strictEqual(r.title, 'Zed Quest: a calm card-collecting town');
  assert.strictEqual(r.hud, 'Zedplacesquare');
  assert.match(r.tip, /^Zedcoins - the Card Shop on Zedplacemarket/);
  assert.deepStrictEqual([r.district, r.boss, r.family, r.rival], ['Zedplacesquare', 'Zedbossharbor', 'Zedfamilytide', "Zedrival's Ace"]);
  assert.deepStrictEqual([r.bakery, r.baker, r.guideIcon, r.money], ["Zedbaker's Bakery", '🦄', '🦄', 'Zedcoin/Zedcoins']);
  const leak = oldRe.exec(r.tables); assert.ok(!leak, `old name "${leak && leak[1]}" left in a data table: …${leak && r.tables.slice(Math.max(0, leak.index - 60), leak.index + 40)}…`);

  // what a player actually reads: the town, the guide, the quests, a building
  for (const step of [() => switchTab('town'), () => switchTab('quests'), () => switchTab('journal'), () => openScene('bakery'), () => openScene('fortune')]) {
    await page.evaluate(step); await page.waitForTimeout(250);
    const text = await page.evaluate(() => document.body.innerText);
    const m = oldRe.exec(text); assert.ok(!m, `old name "${m && m[1]}" on screen after ${step}: …${m && text.slice(Math.max(0, m.index - 60), m.index + 40)}…`);
  }
  assert.ok((await page.evaluate(() => document.getElementById('sceneView').innerText)).includes('Zedfortune'), 'the fortune teller is renamed on her screen');
};
