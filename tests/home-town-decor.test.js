// Town decorations (bought in Shop -> Items) can be placed in the cottage too, from the same inventory the town uses.
module.exports = async (page, assert) => {
  const until = (fn, arg) => page.waitForFunction(fn, arg, { timeout: 8000 });
  const ev = (fn, arg) => page.evaluate(fn, arg);
  await ev(() => { switchTab('town'); openScene('home'); state.decorationInventory = { planter: 2, flag: 1 }; });
  await until(() => !!document.querySelector('.hr-room .hr-world'));
  await page.click('.hr-edit-btn');
  assert.ok(await ev(() => /Your decorations/.test(document.getElementById('scActions').textContent) && !!document.querySelector('#scActions [data-act="hr:place:deco:planter"]')), 'the panel lists the decorations you own');
  assert.ok(await ev(() => !document.querySelector('#scActions [data-act="hr:place:deco:wind-chime"]')), 'and only those');

  // pick one and put it down
  await ev(() => sceneAction('hr:place:deco:planter'));
  assert.strictEqual(await ev(() => homeRoom.edit.pick), 'deco:planter');
  await ev(() => hrEditTap(3, 3));
  assert.ok(await ev(() => hrHome().items.some(i => i.id === 'deco:planter' && i.x === 3 && i.y === 3)), 'placed where tapped');
  assert.strictEqual(await ev(() => decorationInventoryCount('planter')), 1, 'it came out of the same inventory the town uses');
  assert.ok(await ev(() => !!document.querySelector('.hr-prop.emoji')), 'drawn as its emoji');
  assert.ok(await ev(() => homeRoom.solid.has('3,3')), 'and it takes up its tile');

  // it can be moved like anything else, and the rules still apply
  await ev(() => hrEditTap(3, 3)); await ev(() => hrEditTap(5, 4));
  assert.ok(await ev(() => hrHome().items.some(i => i.id === 'deco:planter' && i.x === 5 && i.y === 4)), 'moved');
  assert.ok(/doormat/.test(await ev(() => hrPlaceError('deco:flag', 4, 7, null))), 'the doormat stays clear');
  assert.ok(/wall/.test(await ev(() => hrPlaceError('window', 3, 4, null))), 'wall pieces still need the wall');

  // putting it away sends it back to the town's inventory, not the home's storage
  assert.strictEqual(await ev(() => hrSelected() && hrSelected().id), 'deco:planter', 'it stays selected after a move');
  await ev(() => sceneAction('hr:store'));
  assert.strictEqual(await ev(() => decorationInventoryCount('planter')), 2, 'it is back in your decorations');
  assert.ok(await ev(() => !hrHome().storage['deco:planter'] && !hrHome().items.some(i => i.id === 'deco:planter')), 'and gone from the room');

  // none left: nothing to place
  await ev(() => { state.decorationInventory.flag = 0; sceneAction('hr:place:deco:flag'); });
  assert.strictEqual(await ev(() => homeRoom.edit.pick), null, 'cannot place what you do not have');

  // a decoration that no longer exists is tidied away instead of breaking the room
  await ev(() => { hrHome().items.push({ uid: 'ghost', id: 'deco:not-a-thing', x: 3, y: 6 }); });
  assert.ok(await ev(() => !hrHome().items.some(i => i.uid === 'ghost')), 'an unknown decoration is dropped');
};
