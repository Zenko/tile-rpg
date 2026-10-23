// Shared by the home tests written before build 320: a home furnished the way every new home used to start (a 6 by 6 room with all nine
// pieces that do something), so their positions still hold. A new home is now a bare 5 by 4 nook (tests/home-screens.test.js covers it).
// Use: await page.evaluate(require('./home-fixture').furnish)  before openScene('home');  and  await require('./home-fixture').decorate(page)
// instead of clicking the old Decorate button (it opens Manage now, whose Decorate the room button starts decorating).
module.exports = {
  furnish: () => {
    const items = [['nap', 1, 2], ['decorate', 2, 1], ['favs', 3, 1], ['trophies', 5, 1], ['altar', 6, 2], ['bonsai', 6, 4], ['sand', 1, 5], ['tidy', 1, 7], ['mail', 6, 7]];
    const h = homeState(); h.items = items.map(([id, x, y]) => ({ uid: id, id, x, y })); h.got = {}; items.forEach(([id]) => { h.got[id] = 1; }); h.level = 1;
  },
  decorate: async page => {
    await page.click('.hr-edit-btn');
    await page.waitForFunction(() => typeof hoOpen === 'function' && hoOpen(), null, { timeout: 5000 });
    await page.click('[data-ho="decorate"]');
    await page.waitForFunction(() => !!homeRoom.edit, null, { timeout: 5000 });
  }
};
