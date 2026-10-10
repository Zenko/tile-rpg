// Decorating your cottage (js/home-room.js): move anything, buy and place furniture, put it away, pick colours, level the home up.
module.exports = async (page, assert) => {
  const until = (fn, arg) => page.waitForFunction(fn, arg, { timeout: 8000 });
  const ev = (fn, arg) => page.evaluate(fn, arg);
  await ev(() => { switchTab('town'); openScene('home'); state.progress.pebbles = 500; });
  await until(() => !!document.querySelector('.hr-room .hr-world'));

  // an old or brand new cottage is the original layout, level 1
  assert.deepStrictEqual(await ev(() => { const h = hrHome(); return [h.level, h.items.length, h.style.floor, h.style.wall, h.style.rug]; }), [1, 15, 'oak', 'plaster', 'teal'], 'starts as the original cottage');
  await ev(() => { delete state.progress.home.items; delete state.progress.home.style; delete state.progress.home.level; });
  assert.strictEqual(await ev(() => hrHome().items.length), 15, 'a save with none of the new fields gets the original layout');

  // Decorate opens the panel; nothing is for using while you do
  await page.click('.hr-edit-btn');
  assert.ok(await ev(() => !!homeRoom.edit && !!document.querySelector('#scActions .hr-tabs') && !sceneView.classList.contains('hr-idle')), 'the Decorate panel opens as the sheet');
  assert.ok(await ev(() => !document.querySelector('#scActions [data-act="leave"]')), 'and it has no way out of the house');

  // even the bonsai can be moved: tap it, then a free tile
  const bonsai = () => ev(() => { const i = hrHome().items.find(x => x.id === 'bonsai'); return i.x + ',' + i.y; });
  assert.strictEqual(await bonsai(), '7,5');
  await ev(() => hrEditTap(7, 5)); assert.strictEqual(await ev(() => hrSelected().id), 'bonsai', 'tapping a piece picks it up');
  assert.ok(await ev(() => document.querySelectorAll('.hr-target').length > 5), 'the tiles it can go on are tinted');
  await ev(() => hrEditTap(6, 3));
  assert.strictEqual(await bonsai(), '6,3', 'tapping a free tile moves it there');
  assert.strictEqual(await ev(() => state.progress.home.items.find(i => i.id === 'bonsai').x), 6, 'and the move is saved');
  assert.ok(await ev(() => homeRoom.solid.has('6,3') && !homeRoom.solid.has('7,5')), 'the blocked tiles follow it');

  // the rules
  const err = (id, x, y) => ev(([id, x, y]) => hrPlaceError(id, x, y, null), [id, x, y]);
  assert.ok(/doormat/.test(await err('plant', 4, 9)), 'the doormat stays clear');
  assert.ok(/wall/.test(await err('window', 3, 4)), 'a window hangs on the wall');
  assert.ok(/floor/.test(await err('plant', 3, 1)), 'a plant stands on the floor');
  assert.ok(/taken/.test(await err('plant', 2, 5)), 'a taken tile is refused');
  // wall the doormat in with two stools, then the third would trap you
  await ev(() => { const h = hrHome(); h.items.push({ uid: 's1', id: 'stool', x: 3, y: 9 }, { uid: 's2', id: 'stool', x: 5, y: 9 }); hrIndex(); });
  assert.ok(/block/.test(await err('stool', 4, 8)), 'a piece that would shut you off from the door is refused');
  await ev(() => { const h = hrHome(); h.items = h.items.filter(i => i.uid !== 's1' && i.uid !== 's2'); hrIndex(); homeRoom.edit.sel = null; });

  // buy a lamp: Embers go, it is ready to place, and it goes where you tap
  const pebbles = () => ev(() => state.progress.pebbles);
  await ev(() => { homeRoom.edit.tab = 'items'; renderScene(); });
  await ev(() => sceneAction('hr:buy:lamp'));
  assert.strictEqual(await pebbles(), 470, 'a lamp costs 30 Embers');
  assert.strictEqual(await ev(() => homeRoom.edit.pick), 'lamp', 'and is ready to put down');
  await ev(() => hrEditTap(4, 4));
  assert.ok(await ev(() => hrHome().items.some(i => i.id === 'lamp' && i.x === 4 && i.y === 4) && !hrHome().storage.lamp), 'placed where tapped, out of storage');
  await ev(() => sceneAction('hr:buy:fireplace'));
  assert.strictEqual(await pebbles(), 470, 'a piece from a higher home level cannot be bought yet');

  // put it away, and the mailbox cannot be put away
  await ev(() => hrEditTap(4, 4)); await ev(() => sceneAction('hr:store'));
  assert.ok(await ev(() => !hrHome().items.some(i => i.id === 'lamp') && hrHome().storage.lamp === 1), 'put away goes to storage');
  await ev(() => hrEditTap(7, 8)); await ev(() => sceneAction('hr:store'));
  assert.ok(await ev(() => hrHome().items.some(i => i.id === 'mail')), 'a menu piece stays in the house');
  await ev(() => sceneAction('hr:desel'));

  // colours: unlocked ones apply, locked ones do not
  await ev(() => sceneAction('hr:floor:walnut'));
  assert.strictEqual(await ev(() => hrHome().style.floor + ' ' + homeRoom.host.style.getPropertyValue('--floor1')), 'walnut #5f4630', 'the floor colour changes the room');
  await ev(() => sceneAction('hr:floor:birch'));
  assert.strictEqual(await ev(() => hrHome().style.floor), 'walnut', 'a colour from a higher level stays locked');

  // level up: the room grows, the colours unlock, nothing moves
  const before = await ev(() => hrHome().items.map(i => i.uid + i.x + i.y).join());
  await ev(() => sceneAction('hr:up'));
  assert.strictEqual(await ev(() => hrHome().level), 2); assert.strictEqual(await pebbles(), 410, 'level 2 costs 60 Embers');
  assert.strictEqual(await ev(() => document.querySelectorAll('.hr-room .town-tile').length), 9 * 13, 'the room is two rows deeper');
  assert.strictEqual(await ev(() => hrHome().items.map(i => i.uid + i.x + i.y).join()), before, 'every piece stays where it was');
  await ev(() => sceneAction('hr:floor:birch'));
  assert.strictEqual(await ev(() => hrHome().style.floor), 'birch', 'the new colour is unlocked');
  assert.strictEqual(await ev(() => hrMatY()), 11);

  // Done leaves decorating, not the house
  await ev(() => sceneAction('hr-close'));
  assert.ok(await ev(() => !homeRoom.edit && inScene && sceneView.classList.contains('hr-idle')), 'Done closes the panel and stays inside');
};
