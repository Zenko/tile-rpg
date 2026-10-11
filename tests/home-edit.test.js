// Decorating extras: undo (refunds a purchase), selling, flip, the categorised buy list with thumbnails, and dragging a piece (real mouse events).
module.exports = async (page, assert) => {
  const ev = (fn, arg) => page.evaluate(fn, arg);
  await ev(() => { switchTab('town'); state.progress.pebbles = 500; openScene('home'); });
  await page.waitForFunction(() => !!document.querySelector('.hr-room .hr-world'), null, { timeout: 8000 });
  await page.click('.hr-edit-btn');
  const embers = () => ev(() => state.progress.pebbles);
  const has = id => ev(id => hrHome().items.some(i => i.id === id), id);

  // buy and undo: the Embers come back, first the placing then the purchase
  await ev(() => sceneAction('hr:buy:lamp'));
  assert.strictEqual(await embers(), 470);
  await ev(() => hrEditTap(4, 4));
  assert.ok(await has('lamp'), 'placed');
  await ev(() => sceneAction('hr:undo'));
  assert.ok(!(await has('lamp')) && await ev(() => hrHome().storage.lamp === 1) && await embers() === 470, 'the first undo takes the piece back off the floor');
  await ev(() => sceneAction('hr:undo'));
  assert.ok(await embers() === 500 && await ev(() => !hrHome().storage.lamp), 'the second undo gives the Embers back');
  assert.ok(await ev(() => !document.querySelector('.hr-undo')), 'nothing left to undo');

  // sell from the room: half price, and undo takes it back
  await ev(() => { sceneAction('hr:buy:lamp'); hrEditTap(4, 4); hrEditTap(4, 4); });
  assert.strictEqual(await ev(() => hrSelected() && hrSelected().id), 'lamp');
  assert.ok(await ev(() => !!document.querySelector('#scActions [data-act="hr:sell"]')), 'a bought piece can be sold');
  await ev(() => sceneAction('hr:sell'));
  assert.ok(!(await has('lamp')) && await embers() === 485, 'sold for half: 15 of 30');
  await ev(() => sceneAction('hr:undo'));
  assert.ok((await has('lamp')) && await embers() === 470, 'undo puts it back and takes the Embers back');

  // flip, and undo flips it back
  await ev(() => hrEditTap(4, 4));
  await ev(() => sceneAction('hr:flip'));
  assert.ok(await ev(() => hrHome().items.find(i => i.id === 'lamp').flip === true && !!document.querySelector('.hr-prop.flip')), 'flipped');
  await ev(() => sceneAction('hr:undo'));
  assert.ok(await ev(() => !hrHome().items.find(i => i.id === 'lamp').flip), 'undo flips it back');

  // the pieces that do something are not for sale
  await ev(() => { homeRoom.edit.sel = 'mail'; renderScene(); });
  assert.ok(await ev(() => !document.querySelector('#scActions [data-act="hr:sell"]') && !!document.querySelector('#scActions [data-act="hr:store"]')), 'the mailbox can be put away but has no sell button');
  const before = await embers(); await ev(() => sceneAction('hr:sell'));
  assert.ok(await has('mail') && await embers() === before, 'selling the mailbox does nothing');
  await ev(() => sceneAction('hr:desel'));

  // sell from storage
  await ev(() => { sceneAction('hr:buy:plant'); homeRoom.edit.pick = null; sceneAction('hr:desel'); });
  assert.strictEqual(await ev(() => hrHome().storage.plant), 1);
  const e0 = await embers(); await ev(() => sceneAction('hr:sellst:plant'));
  assert.ok(await ev(() => !hrHome().storage.plant) && await embers() === e0 + 6, 'a stored plant sells for half of 12');

  // the buy list: pictures, and categories
  await ev(() => { sceneAction('hr:tab:items'); sceneAction('hr:desel'); });
  assert.ok(await ev(() => document.querySelectorAll('#scActions .hr-buy svg.hr-th use').length > 5), 'each piece has its own little picture');
  await ev(() => sceneAction('hr:cat:light'));
  assert.ok(await ev(() => !!document.querySelector('#scActions [data-act="hr:buy:lamp"]') && !document.querySelector('#scActions [data-act="hr:buy:cot"]')), 'a category shows only its pieces');
  await ev(() => sceneAction('hr:cat:all'));
  assert.ok(await ev(() => !!document.querySelector('#scActions [data-act="hr:buy:stool"]')), 'All shows everything');

  // dragging a piece with the mouse: a ghost follows, a good spot moves it, a bad spot does not
  await ev(() => { homeRoom.focus = { x: 2.5, y: 5.5 }; hrCamera(true); });
  const at = (x, y) => ev(([x, y]) => { const h = homeRoom, r = h.host.getBoundingClientRect(); return { x: r.left + h.cx + (x + .5) * h.t, y: r.top + h.cy + (y + .5) * h.t }; }, [x, y]);
  const sand = () => ev(() => { const i = hrHome().items.find(x => x.id === 'sand'); return i.x + ',' + i.y; });
  assert.strictEqual(await sand(), '1,5');
  const a = await at(1, 5), b = await at(3, 5);
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move((a.x + b.x) / 2, a.y, { steps: 3 });
  assert.ok(await ev(() => !!document.querySelector('.hr-ghost.ok')), 'a green ghost follows the finger over a free tile');
  await page.mouse.move(b.x, b.y, { steps: 3 }); await page.mouse.up();
  assert.strictEqual(await sand(), '3,5', 'letting go on a free tile moves the piece');
  assert.ok(await ev(() => !document.querySelector('.hr-ghost')), 'the ghost is gone');
  const c = await at(3, 5), d = await at(6, 2);
  await ev(() => { homeRoom.focus = { x: 4.5, y: 3.5 }; hrCamera(true); });
  const c2 = await at(3, 5), d2 = await at(6, 2);
  await page.mouse.move(c2.x, c2.y); await page.mouse.down(); await page.mouse.move(d2.x, d2.y, { steps: 5 });
  assert.ok(await ev(() => !!document.querySelector('.hr-ghost.bad')), 'a red ghost over the altar');
  await page.mouse.up();
  assert.strictEqual(await sand(), '3,5', 'dropping on a taken tile leaves it where it was');
};
