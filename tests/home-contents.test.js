// The frames, shelves and trophy case in the room show what you actually chose and won (js/home-room.js hrExtras), and redraw when it changes.
module.exports = async (page, assert) => {
  await page.evaluate(require('./home-fixture').furnish);   // the furnished 6 by 6 home these checks were written for
  const ev = (fn, arg) => page.evaluate(fn, arg);
  await ev(() => {
    switchTab('town');
    state.ownedCards = ['sprout', 'blossom', 'feather', 'pebble'];
    const h = homeState(); h.favs = ['sprout', 'blossom']; h.shelf = ['planter'];
    trophies().push({ id: 'testcup', icon: '🥇', name: 'Test Cup' });
    openScene('home');
  });
  await page.waitForFunction(() => !!document.querySelector('.hr-room .hr-world'), null, { timeout: 8000 });
  const n = sel => ev(s => document.querySelectorAll(s).length, sel);
  assert.strictEqual(await n('.hr-frame'), 2, 'your two favourite cards are in the frames');
  assert.ok(await ev(() => !!document.querySelector('.hr-frame img, .hr-frame span')), 'drawn with the card art');
  assert.strictEqual(await ev(() => document.querySelectorAll('.hr-prop .hr-thing').length), 1 + await ev(() => trophyItems().slice(0, 6).length), 'one shelf decoration plus your trophies');

  await ev(() => { homeState().favs.push('feather'); homeState().shelf.push('flag'); renderScene(); });
  assert.strictEqual(await n('.hr-frame'), 3, 'a new favourite appears without leaving the room');
  assert.ok(await ev(() => document.querySelectorAll('.hr-prop .hr-thing').length >= 2), 'and so does a new shelf piece');
  await ev(() => { homeState().favs = []; homeState().shelf = []; renderScene(); });
  assert.strictEqual(await n('.hr-frame'), 0, 'empty frames when none are chosen');
};
