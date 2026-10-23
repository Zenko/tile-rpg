// Your cottage as a walkable room (js/home-room.js): furniture opens the cottage's own actions, the room survives each screen,
// a mini-game takes over the stage and gives it back, and the door leaves through the usual fade.
module.exports = async (page, assert) => {
  await page.evaluate(require('./home-fixture').furnish);   // the furnished 6 by 6 home these checks were written for
  const until = (fn, arg) => page.waitForFunction(fn, arg, { timeout: 8000 });
  await page.evaluate(() => { switchTab('town'); openScene('home'); });
  await until(() => !!document.querySelector('.hr-room .hr-world'));
  assert.strictEqual(await page.evaluate(() => document.querySelectorAll('.hr-room .town-tile').length), 8 * 9, 'a plain 6 x 6 room (with its walls) of the town\'s own tiles');
  assert.ok(await page.evaluate(() => !!document.querySelector('.hr-player .pl-sprite, .hr-player .pl-badge')), 'the player stands in the room');
  assert.ok(await page.evaluate(() => sceneView.classList.contains('room-on') && sceneView.classList.contains('hr-idle')), 'the room fills the screen with nothing open');
  assert.strictEqual(await page.evaluate(() => [homeRoom.x, homeRoom.y].join()), '4,7', 'starts just inside the door');

  // every piece of furniture is one of the cottage's own actions
  const ids = await page.evaluate(() => INTERIORS.home.actions.map(a => a.id).sort().join());
  assert.strictEqual(await page.evaluate(() => Object.values(HR_CATALOG).filter(d => d.act).map(d => d.act).sort().join()), ids, 'one piece of furniture per cottage action');

  // walk to the mailbox: it opens straight away, full screen, and Back to the room puts it away and stays in the house
  await page.evaluate(() => hrGoTo(hrHome().items.find(i => i.id === 'mail')));
  await until(() => typeof hoOpen === 'function' && hoOpen() && homeEl.dataset.view === 'mail');
  assert.ok(await page.evaluate(() => Math.abs(homeRoom.x - 6) + Math.abs(homeRoom.y - 7) === 1), 'stopped beside the mail table');
  await page.click('#hoLeave');
  assert.ok(await page.evaluate(() => inScene && !hoOpen() && !!document.querySelector('.hr-room')), 'Back to the room stays in the house');
  await until(() => sceneView.classList.contains('hr-idle'));

  // a floor tap walks, and a new tap cancels the old walk
  await page.evaluate(() => { const h = homeRoom, r = h.host.getBoundingClientRect(); hrTap({ clientX: r.left + h.cx + 3.5 * h.t, clientY: r.top + h.cy + 5.5 * h.t }); });
  await until(() => homeRoom.x === 3 && homeRoom.y === 5 && !homeRoom.player.classList.contains('walking'));

  // Tidy: walking up opens its screen; a game started there owns the stage, and leaving the screen ends it and gives the room back
  await page.evaluate(() => hrGoTo(hrHome().items.find(i => i.id === 'tidy')));
  await until(() => typeof hoOpen === 'function' && hoOpen() && homeEl.dataset.view === 'tidy');
  const spot = await page.evaluate(() => [homeRoom.x, homeRoom.y].join());
  await page.click('[data-ho="tstart"]');
  await until(() => !!mini && !document.querySelector('.hr-room'));
  await page.click('#hoLeave');
  await until(() => !mini && !!document.querySelector('.hr-room .hr-world'));
  assert.strictEqual(await page.evaluate(() => [homeRoom.x, homeRoom.y].join()), spot, 'you are where you were');
  await until(() => sceneView.classList.contains('hr-idle'));

  // the door: walk out and the scene closes
  await page.evaluate(() => { const h = homeRoom; hrWalk(hrBfs(h.x, h.y, (x, y) => x === 4 && y === h.rows - 1), null); });
  await until(() => !inScene && !document.querySelector('.hr-room'));
  assert.ok(await page.evaluate(() => !sceneView.classList.contains('room-on')), 'the room is put away');

  // other buildings are untouched
  await page.evaluate(() => { openScene('nook'); });
  assert.ok(await page.evaluate(() => !document.querySelector('.hr-room') && !sceneView.classList.contains('room-on')), 'only your cottage is a room');
  await page.evaluate(() => closeScene());
};
