// Skins (build 330): ?skin=example swaps names, pronouns, TEXT lines and story words without touching the real ones,
// is remembered on the device, shows the Skin pill, and ?skin= puts the real game back.
const path = require('path');
module.exports = async (page, assert) => {
  await page.route(/gstatic\.com|googleapis\.com|firebase/, r => r.abort());
  const base = 'file://' + path.join(__dirname, '..', 'index.html');
  const real = await page.evaluate(() => ({ title: GAME.title, square: PLACES.square, baker: CAST.baker.name }));
  await page.goto(base + '?skin=example'); await page.waitForTimeout(800);
  const s = await page.evaluate(() => ({
    on: SKIN_ON, title: document.title, square: DISTRICTS.square.name, money: currencyName(2),
    bakery: INTERIORS.bakery.title, visit: REQ_VISITS.find(r => r.building === 'bakery').line,
    beat: STORY_BEATS.find(b => b.mark === 'bakery').cards[1].text, out: words('town.stepOutside'),
    intro: STORY_INTRO.cards[1].text, pill: (document.querySelector('.skin-pill') || {}).textContent || ''
  }));
  assert.strictEqual(s.on, 'example');
  assert.match(s.title, /^Lantern Lane:/);
  assert.deepStrictEqual([s.square, s.money, s.bakery], ['Lantern Lane', 'Shells', "Bram's Bakery"]);
  assert.match(s.visit, /tell Bram his rolls/);
  assert.match(s.beat, /at his bakery/);
  assert.strictEqual(s.out, 'You step back out under the lanterns.');
  assert.match(s.intro, /a lantern hums/);
  assert.match(s.pill, /Skin: Example/);
  // remembered: a plain reload keeps it
  await page.goto(base); await page.waitForTimeout(600);
  assert.strictEqual(await page.evaluate(() => PLACES.square), 'Lantern Lane');
  // ?skin= goes back to the real game and forgets it; an unknown skin name is ignored
  await page.goto(base + '?skin='); await page.waitForTimeout(600);
  const back = await page.evaluate(() => ({ on: SKIN_ON, title: GAME.title, square: PLACES.square, baker: CAST.baker.name, pill: !!document.querySelector('.skin-pill') }));
  assert.deepStrictEqual(back, { on: null, title: real.title, square: real.square, baker: real.baker, pill: false });
  await page.goto(base + '?skin=nope'); await page.waitForTimeout(600);
  assert.strictEqual(await page.evaluate(() => SKIN_ON), null);
};
