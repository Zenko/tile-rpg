// Your cottage as a walkable room (js/home-room.js): furniture opens the cottage's own actions, the room survives each screen,
// a mini-game takes over the stage and gives it back, and the door leaves through the usual fade.
module.exports = async (page, assert) => {
  const until = (fn, arg) => page.waitForFunction(fn, arg, { timeout: 8000 });
  await page.evaluate(() => { switchTab('town'); openScene('home'); });
  await until(() => !!document.querySelector('.hr-room .hr-world'));
  assert.strictEqual(await page.evaluate(() => document.querySelectorAll('.hr-room .town-tile').length), 99, 'a 9 x 11 room of the town\'s own tiles');
  assert.ok(await page.evaluate(() => !!document.querySelector('.hr-player .pl-sprite, .hr-player .pl-badge')), 'the player stands in the room');
  assert.ok(await page.evaluate(() => sceneView.classList.contains('room-on') && sceneView.classList.contains('hr-idle')), 'the room fills the screen with nothing open');
  assert.strictEqual(await page.evaluate(() => [homeRoom.x, homeRoom.y].join()), '4,9', 'starts just inside the door');

  // every piece of furniture is one of the cottage's own actions
  const ids = await page.evaluate(() => INTERIORS.home.actions.map(a => a.id).sort().join());
  assert.strictEqual(await page.evaluate(() => Object.values(HR_CATALOG).filter(d => d.act).map(d => d.act).sort().join()), ids, 'one piece of furniture per cottage action');

  // walk to the mailbox: the sheet offers it, the room stays, the old list opens
  await page.evaluate(() => hrGoTo(hrHome().items.find(i => i.id === 'mail')));
  await until(() => !!document.querySelector('#scActions [data-act="mail"]'));
  assert.ok(await page.evaluate(() => !sceneView.classList.contains('hr-idle')), 'the stage makes room for the sheet');
  assert.ok(await page.evaluate(() => Math.abs(homeRoom.x - 7) + Math.abs(homeRoom.y - 8) === 1), 'stopped beside the mail table');
  assert.ok(await page.evaluate(() => !!document.querySelector('#scActions [data-act="hr-close"]') && !document.querySelector('#scActions [data-act="leave"]')), 'the sheet ends in Close, not Head back out');
  await page.click('#scActions [data-act="hr-close"]');
  assert.ok(await page.evaluate(() => inScene && sceneView.classList.contains('hr-idle') && !!document.querySelector('.hr-room')), 'Close puts the sheet away and stays in the house');
  await page.evaluate(() => hrGoTo(hrHome().items.find(i => i.id === 'mail')));
  await until(() => !!document.querySelector('#scActions [data-act="mail"]'));
  await page.click('#scActions [data-act="mail"]');
  assert.strictEqual(await page.evaluate(() => scene.mode), 'mail');
  assert.ok(await page.evaluate(() => !!document.querySelector('.hr-room') && sceneView.classList.contains('room-on')), 'the room stays above the letter list');
  await page.evaluate(() => sceneAction('back'));
  assert.ok(await page.evaluate(() => sceneView.classList.contains('hr-idle') && !homeRoom.sel), 'closing the mailbox frees the room');

  // a floor tap walks, and a new tap cancels the old walk
  await page.evaluate(() => { const h = homeRoom, r = h.host.getBoundingClientRect(); hrTap({ clientX: r.left + h.cx + 3.5 * h.t, clientY: r.top + h.cy + 5.5 * h.t }); });
  await until(() => homeRoom.x === 3 && homeRoom.y === 5 && !homeRoom.player.classList.contains('walking'));

  // the nap is a daily action that keeps the sheet and shows its result in the bubble
  await page.evaluate(() => { buildingState('home').nap = null; hrGoTo(hrHome().items.find(i => i.id === 'nap')); });
  await until(() => !!document.querySelector('#scActions [data-act="nap"]'));
  const before = await page.evaluate(() => state.progress.pebbles);
  await page.click('#scActions [data-act="nap"]');
  assert.ok(await page.evaluate(b => state.progress.pebbles > b, before), 'napping pays out');
  assert.ok(await page.evaluate(() => !!document.querySelector('#scActions [data-act="nap"]') && document.getElementById('scText').textContent.length > 0), 'the sheet stays and the bubble tells you what happened');

  // Tidy: the mini-game owns the stage, then the room comes back
  await page.evaluate(() => hrGoTo(hrHome().items.find(i => i.id === 'tidy')));
  await until(() => !!document.querySelector('#scActions [data-act="mg-tidy"]'));
  await page.click('#scActions [data-act="mg-tidy"]');
  await until(() => !!document.querySelector('#scStage .mg'));
  assert.ok(await page.evaluate(() => !document.querySelector('.hr-room') && !sceneView.classList.contains('room-on')), 'the game takes over the stage');
  const spot = await page.evaluate(() => [homeRoom.x, homeRoom.y].join());
  await page.evaluate(() => sceneAction('mg-back'));
  await until(() => !!document.querySelector('.hr-room .hr-world'));
  assert.strictEqual(await page.evaluate(() => [homeRoom.x, homeRoom.y].join()), spot, 'you are where you were');
  assert.ok(await page.evaluate(() => sceneView.classList.contains('hr-idle')), 'and the room is free again');

  // the door: walk out and the scene closes
  await page.evaluate(() => { const h = homeRoom; hrWalk(hrBfs(h.x, h.y, (x, y) => x === 4 && y === h.rows - 1), null); });
  await until(() => !inScene && !document.querySelector('.hr-room'));
  assert.ok(await page.evaluate(() => !sceneView.classList.contains('room-on')), 'the room is put away');

  // other buildings are untouched
  await page.evaluate(() => { openScene('nook'); });
  assert.ok(await page.evaluate(() => !document.querySelector('.hr-room') && !sceneView.classList.contains('room-on')), 'only your cottage is a room');
  await page.evaluate(() => closeScene());
};
