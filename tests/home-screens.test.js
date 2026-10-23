// Your home's screens (js/home-screens.js): a bare starting nook, pieces that arrive as the home grows, walking up to a piece opens its
// full-screen view, and each view does its job (letters, bonsai, sand, nap, shelves, frames, trophies, altar, Manage).
// SHOTS=<dir> saves a screenshot of every view.
module.exports = async (page, assert) => {
  const until = (fn, arg) => page.waitForFunction(fn, arg, { timeout: 8000 });
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const shot = async name => { if (process.env.SHOTS) await page.waitForTimeout(1000), await page.evaluate(() => { if (!document.getElementById('shotNoToast')) document.head.insertAdjacentHTML('beforeend', '<style id="shotNoToast">.toast{opacity:0!important}</style>'); }), await page.screenshot({ path: require('path').join(process.env.SHOTS, name + '.png') }); };
  await ev(() => { document.getElementById('testHideOverlays').remove(); switchTab('town'); state.progress.pebbles = 600; openScene('home'); });
  await until(() => !!document.querySelector('.hr-room .hr-world'));
  await page.waitForTimeout(400);
  await shot('0-room');

  // a new home is a bare nook: a mailbox and an armchair
  assert.deepStrictEqual(await ev(() => hrHome().items.map(i => i.id).sort()), ['mail', 'nap'], 'only a mailbox and an armchair to start');
  assert.strictEqual(await ev(() => homeRoom.cols + 'x' + homeRoom.rows), '7x7', 'a 5 by 4 floor inside its walls');

  // walking up to the mailbox opens it full screen, no sheet in between
  await ev(() => { checkMail(true); hrGoTo(hrHome().items.find(i => i.id === 'mail')); });
  await until(() => document.getElementById('homeScreen') && !document.getElementById('homeScreen').classList.contains('hidden'));
  assert.strictEqual(await ev(() => homeEl.dataset.view), 'mail');
  await shot('1-mail');
  const id = await ev(() => mailState().list[0].id);
  await ev(id => hoAct('open:' + id), id);
  assert.ok(await ev(id => mailState().list.find(l => l.id === id).read && !!document.querySelector('.ho-letter'), id), 'breaking the seal reads the letter');
  assert.ok(await ev(() => Object.keys(hoStamps()).length >= 1), 'and keeps its stamp');
  const gift = await ev(id => { const l = mailState().list.find(x => x.id === id); return !!(l.gift && !l.claimed); }, id);
  if (gift) { const e0 = await ev(() => state.progress.pebbles); await page.click('.ho-parcel'); assert.ok(await ev(id => mailState().list.find(l => l.id === id).claimed, id), 'the parcel unwraps the gift'); }
  await shot('2-letter');
  // writing back to a friend
  await ev(() => { friendsState()['square:Rowan'] = { name: 'Rowan', district: 'square', points: 2, icon: '🧑' }; mailState().list.unshift({ id: 'friend-x', from: 'Rowan', icon: '🧑', subject: 'A note from a friend', body: 'Hello!', at: Date.now(), read: false, claimed: false, gift: null }); hoAct('letters'); hoAct('open:friend-x'); });
  await ev(() => hoAct('reply:friend-x:doodle'));
  assert.strictEqual(await ev(() => friendsState()['square:Rowan'].points), 3, 'writing back is a friendship point');
  assert.ok(await ev(() => mailState().list[0].replied === 'doodle' && !document.querySelector('[data-ho^="reply:"]')), 'once per letter');
  await page.click('#hoLeave');
  await until(() => document.getElementById('homeScreen').classList.contains('hidden'));
  assert.ok(await ev(() => inScene && !!document.querySelector('.hr-room')), 'Back to the room stays in the house');

  // the nap: catch dreams, paid once a day
  await ev(() => { buildingState('home').nap = null; homeScreenOpen('nap'); });
  await shot('3-nap');
  await ev(() => hoAct('doze'));
  assert.ok(await ev(() => hoUi.dream && !!document.querySelector('.ho-nap.dreaming')), 'closing your eyes starts the dream');
  await until(() => !!document.querySelector('.ho-mote'));
  await shot('4-dream');
  await ev(() => document.querySelector('.ho-mote').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
  assert.strictEqual(await ev(() => hoUi.caught), 1, 'a tapped mote is caught');
  const e1 = await ev(() => state.progress.pebbles);
  await page.waitForFunction(() => !hoUi.dream, null, { timeout: 15000 });
  assert.ok(await ev(e => state.progress.pebbles > e && buildingState('home').nap === todayKey() && state.progress.totals.naps === 1, e1), 'waking pays and uses the day\'s nap');
  assert.ok(await ev(() => !document.querySelector('[data-ho="doze"]')), 'no second nap today');

  // grow the home: it gets bigger and new pieces arrive
  await ev(() => homeScreenOpen('manage'));
  await shot('5-manage');
  await ev(() => hoAct('tab:upgrade')); await shot('6-upgrade');
  await ev(() => hoAct('up'));
  assert.strictEqual(await ev(() => hrHome().level), 2);
  await until(() => hrHome().items.some(i => i.id === 'bonsai'));
  assert.ok(await ev(() => ['decorate', 'favs'].every(id => hrHome().items.some(i => i.id === id) || hrHome().storage[id])), 'level 2 brings the bonsai, shelves and frames');
  assert.ok(await ev(() => !hrHome().items.some(i => i.id === 'altar') && !hrHome().storage.altar), 'the altar is not here yet');
  await ev(() => hoAct('tab:colours')); await shot('7-colours');
  await ev(() => hoAct('style:floor:walnut'));
  assert.strictEqual(await ev(() => hrHome().style.floor), 'walnut', 'colours change from Manage');
  await ev(() => hoAct('tab:shop')); await shot('8-shop');
  await ev(() => hoAct('buy:plant'));
  assert.ok(await ev(() => !!homeRoom.edit && homeRoom.edit.pick === 'plant' && !hoOpen()), 'buying drops you into decorating, ready to place');
  await ev(() => sceneAction('hr-close'));

  // the bonsai: plant, water in the band, snip three shoots
  await ev(() => homeScreenOpen('calm-bonsai'));
  await ev(() => hoAct('plant'));
  assert.ok(await ev(() => !!calmState().bonsai), 'planted');
  const w = await page.$('#hoWater'), box = await w.boundingBox();
  await page.mouse.move(box.x + 20, box.y + 10); await page.mouse.down(); await page.waitForTimeout(1600); await page.mouse.up();
  assert.ok(await ev(() => hoCare().watered === 1), 'holding long enough waters it');
  await shot('9-bonsai');
  for (let i = 0; i < 3; i++) await ev(() => document.querySelector('.ho-shoot').click());
  assert.ok(await ev(() => calmState().bonsai.trimDay === todayKey() && calmState().bonsai.streak === 1 && state.progress.totals.bonsaiTends === 1), 'water + three snips = tended, day one of a streak');

  // the sand: rake over a leaf to sweep it away
  await ev(() => homeScreenOpen('calm-sand'));
  await ev(() => { calmState().sandLeaves = { day: todayKey(), left: [[0.5, 0.5, 0]] }; hoRender(); });
  await shot('10-sand');
  const cv = await (await page.$('#hoSandCv')).boundingBox(), e2 = await ev(() => state.progress.pebbles);
  await page.mouse.move(cv.x + cv.width * .2, cv.y + cv.height * .5); await page.mouse.down();
  await page.mouse.move(cv.x + cv.width * .8, cv.y + cv.height * .5, { steps: 12 }); await page.mouse.up();
  assert.ok(await ev(e => hoLeaves().left.length === 0 && state.progress.pebbles === e + 1, e2), 'raking over the leaf sweeps it for 1');
  assert.ok(await ev(() => calmState().sand.strokes.some(s => s.n === 3)), 'the stroke is kept, with its rake');
  await ev(() => hoAct('tool:stone'));
  await page.mouse.click(cv.x + 40, cv.y + 40);
  assert.ok(await ev(() => calmState().sand.stones.length === 1), 'a stone goes down where you tap');

  // shelves and frames
  await ev(() => { state.decorationInventory = { planter: 1, 'wind-chime': 1 }; homeScreenOpen('decorate'); });
  await ev(() => hoAct('put:planter'));
  assert.ok(await ev(() => homeState().shelf[0] === 'planter' && decorationInventoryCount('planter') === 0), 'a decoration goes on the shelf');
  await shot('11-shelves');
  await ev(() => hoAct('take:0'));
  assert.ok(await ev(() => !homeState().shelf.length && decorationInventoryCount('planter') === 1), 'and comes back down');
  await ev(() => { state.ownedCards.push('sprout', 'blossom'); homeScreenOpen('favs'); hoAct('pick:sprout'); });
  assert.deepStrictEqual(await ev(() => homeState().favs), ['sprout'], 'a card gets framed');
  await ev(() => { hoAct('frame:0'); hoAct('pick:blossom'); });
  assert.deepStrictEqual(await ev(() => homeState().favs), ['blossom'], 'a selected frame swaps its card');
  await shot('12-frames');

  // Tidy Up: drag a thing onto its place, or tap one; the game's own timer, score and medal
  await ev(() => { hrHome().level = 3; hrArrivals(true); homeScreenOpen('mg-tidy'); });
  assert.ok(await ev(() => homeEl.dataset.view === 'tidy' && !!document.querySelector('[data-ho="tstart"]')), 'the basket opens Tidy Up');
  await shot('15-tidy');
  await page.click('[data-ho="tstart"]');
  await until(() => hoTidyPhase() === 'play' && !!document.getElementById('hoThing').innerHTML);
  const right = await ev(() => mini.st.item.bin);
  const t = await (await page.$('#hoThing')).boundingBox(), bn = await (await page.$(`[data-ho-bin="${right}"]`)).boundingBox();
  await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2); await page.mouse.down();
  await page.mouse.move(bn.x + bn.width / 2, bn.y + bn.height / 2, { steps: 6 }); await page.mouse.up();
  assert.strictEqual(await ev(() => mini.st.score), 1, 'dragging a thing to its place scores');
  const right2 = await ev(() => mini.st.item.bin);
  await page.dispatchEvent(`[data-ho-bin="${right2}"]`, 'pointerdown');
  assert.strictEqual(await ev(() => mini.st.score), 2, 'tapping the right place scores too');
  await shot('16-tidy-play');
  await ev(() => { mini.st.start = Date.now() - 21000; });
  await until(() => hoTidyPhase() === 'done' && !!document.querySelector('.ho-tidy.done'));
  assert.ok(await ev(() => /2 things tidied/.test(document.getElementById('hoStage').textContent)), 'the result shows the score');
  await shot('17-tidy-done');
  await ev(() => homeScreenClose());
  await until(() => !mini);

  // the trophy case and the altar
  await ev(() => homeScreenOpen('trophies'));
  assert.ok(await ev(() => document.querySelectorAll('.ho-tro').length >= 5), 'empty places show what there is to win');
  await shot('13-trophies');
  await ev(() => { hrHome().level = 4; hrArrivals(true); homeScreenOpen('altar'); });
  assert.ok(await ev(() => document.querySelectorAll('.ho-god').length === 4), 'four shrines');
  await ev(() => hoAct('god:duermevela'));
  assert.ok(await ev(() => !!document.querySelector('.ho-godinfo li')), 'a shrine says what it needs');
  await shot('14-altar');
  await ev(() => hoAct('candles'));
  assert.ok(await ev(() => !document.getElementById('altarScreen').classList.contains('hidden')), 'the candles open above');
  await ev(() => closeAltarScreen());
  await ev(() => homeScreenClose());

  // the spirit pieces and a visiting spirit open full screen too
  await ev(() => { const h = hrHome(); h.level = 5; h.items.push({ uid: 'p1', id: 'perch', x: 2, y: 4 }, { uid: 'm1', id: 'mantel', x: 3, y: 1 }, { uid: 'c1', id: 'cabinet', x: 4, y: 1 }); hrIndex(); homeScreenOpen('perch', 'p1'); });
  await page.click('#hoFoot [data-ho^="hs:perch:p1:"]');
  assert.ok(await ev(() => !!hrHome().items.find(i => i.uid === 'p1').card && !!document.querySelector('.ho-perch.on')), 'a spirit rests on the perch');
  await shot('18-perch');
  await ev(() => homeScreenOpen('mantel', 'm1')); await shot('19-mantel');
  await ev(() => homeScreenOpen('cabinet', 'c1'));
  assert.strictEqual(await ev(() => document.querySelectorAll('.ho-medal-row').length), await ev(() => CARD_SETS.length), 'one row per card set');
  await shot('20-cabinet');
  await ev(() => { homeScreenClose(); hsMaybeVisit(true); });
  await ev(() => homeScreenOpen('visitor')); await shot('21-visitor');
  const n0 = await ev(() => state.ownedCards.length);
  await page.click('[data-ho="welcome"]');
  assert.strictEqual(await ev(() => state.ownedCards.length), n0 + 1, 'welcoming the visitor gives its card');
  await ev(() => document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')));

  // leaving the house puts everything away
  await ev(() => closeScene());
  assert.ok(await ev(() => document.getElementById('homeScreen').classList.contains('hidden') && !document.body.classList.contains('in-home-screen')), 'closed with the house');
};
