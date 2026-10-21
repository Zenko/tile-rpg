// The neighbour screen: a grid of Chat / Play / Gift cards, each opening its own list with a Back, a thank-you spoken over the grid,
// and three ways out: the round X, the Android back gesture (a history entry; Back inside a list goes to the grid first) and Escape.
module.exports = async (page, assert) => {
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const shown = sel => ev(s => { const e = document.querySelector(s); return !!e && e.offsetParent !== null; }, sel);
  const view = () => ev(() => document.getElementById('talkCard').dataset.view);
  const open = () => ev(() => { openTalk({ id: 'npc-square-fenn', name: 'Fenn', icon: '🧑', deck: [], level: 3 }); });
  const isOpen = () => ev(() => !document.getElementById('talkOverlay').classList.contains('hidden'));
  await ev(() => { const h = document.getElementById('testHideOverlays'); if (h) h.remove(); switchTab('town'); state.progress.bread = 0; prefs.talkStyle = 'classic'; });   // the grid of cards; the dock and close-up are in talk-dock.test.js   // this test drives an overlay

  // the grid: Chat and Play (no Gift with nothing to give), the lists are not on screen yet
  await open();
  assert.ok(await shown('.tk-cat[data-go="chat"]') && await shown('.tk-cat[data-go="play"]'), 'Chat and Play cards');
  assert.ok(!(await shown('.tk-cat[data-go="gift"]')), 'no Gift card with nothing to give');
  assert.ok(!(await shown('#talkFight')) && (await view()) === 'home', 'the lists start closed');
  assert.ok(await ev(() => document.querySelector('.tk-plate #talkName').textContent === 'Fenn' && !!document.querySelector('.tk-plate #talkHearts')), 'name and hearts share the bar');

  // a card opens its list, Back returns
  await ev(() => document.querySelector('.tk-cat[data-go="play"]').click());
  assert.ok((await view()) === 'play' && await shown('#talkFight') && !(await shown('.tk-cat[data-go="chat"]')), 'Play opens its list');
  assert.ok(await ev(() => document.getElementById('talkFight').classList.contains('tk-primary')), 'the match is the filled choice');
  await ev(() => document.getElementById('talkBack').click());
  assert.strictEqual(await view(), 'home', 'Back returns to the grid');
  await ev(() => document.querySelector('.tk-cat[data-go="chat"]').click());
  assert.ok(await shown('#talkTopics') && await shown('#talkMain'), 'Chat holds the topics and the favour');

  // a gift: the card appears once there is something to give, and the thank-you is spoken over the grid
  await ev(() => { state.progress.bread = 2; renderTalk(); });
  assert.ok(await shown('.tk-cat[data-go="gift"]') || (await view()) !== 'home', 'a loaf makes the Gift card appear');
  await ev(() => document.querySelector('[data-go="gift"]') ? document.querySelector('[data-go="gift"]').click() : talkGo('gift'));
  assert.ok(await shown('#talkGift'), 'Gift lists the loaf');
  await ev(() => document.getElementById('talkGift').click());
  assert.strictEqual(await view(), 'home', 'the thank-you comes back to the grid');
  assert.ok(/\+3/.test(await ev(() => document.getElementById('talkText').textContent + talkSaid)), 'and is spoken in the bubble');

  // the way out: the footer at the bottom (the last thing on the card, like the building screens)
  assert.ok(await ev(() => { const c = document.getElementById('talkCard'); const x = document.getElementById('talkClose'), r = x.getBoundingClientRect(); return x.parentElement === c && x.classList.contains('x-close') && r.top < 80 && r.right > innerWidth - 80 && r.width >= 44; }), 'the way out is the round X at the top right');
  await ev(() => document.getElementById('talkClose').click());
  assert.ok(!(await isOpen()), 'the X closes the screen');
  await page.waitForFunction(() => talkPopIgnore === 0, null, { timeout: 4000 });

  // the Android back gesture: one entry; Back inside a list goes to the grid first
  assert.ok(!(await ev(() => history.state && history.state.talk)), 'no talk entry while closed');
  await open();
  assert.ok(await ev(() => history.state && history.state.talk === 1), 'opening adds a history entry');
  await ev(() => talkGo('play'));
  await ev(() => history.back());
  await page.waitForFunction(() => document.getElementById('talkCard').dataset.view === 'home', null, { timeout: 4000 });
  assert.ok(await isOpen(), 'back inside a list goes to the grid, not out');
  await ev(() => history.back());
  await page.waitForFunction(() => document.getElementById('talkOverlay').classList.contains('hidden'), null, { timeout: 4000 });
  assert.ok(!(await isOpen()), 'back from the grid closes the screen');
  assert.ok(!(await ev(() => history.state && history.state.talk)), 'and the entry is gone');

  // reopening straight after Exit (before the browser has gone back) still ends with one entry, so Back still closes it
  await open(); await ev(() => document.getElementById('talkClose').click()); await open();
  await page.waitForFunction(() => talkPopIgnore === 0 && talkPushed === true, null, { timeout: 4000 });
  await ev(() => history.back());
  await page.waitForFunction(() => document.getElementById('talkOverlay').classList.contains('hidden'), null, { timeout: 4000 });
  assert.ok(!(await isOpen()), 'the reopened screen still closes with Back');

  // Escape closes too
  await page.waitForFunction(() => talkPopIgnore === 0, null, { timeout: 4000 });
  await open(); await page.keyboard.press('Escape');
  assert.ok(!(await isOpen()), 'Escape closes the screen');

  // the figure: a drawn neighbour is a cropped bust, anyone else is their emoji, big
  await ev(() => { delete NPC_DRAWN_SEEN['npc-square-fenn']; }); await open();
  assert.ok(await ev(() => document.getElementById('talkPortrait').classList.contains('tk-emoji') && !document.querySelector('#talkPortrait img.tk-img')), 'no drawing: the emoji');
  await ev(() => closeTalk());
  if (await ev(() => playerSpriteReady())) {
    await ev(() => { NPC_DRAWN_SEEN['npc-square-fenn'] = 'don'; }); await open();
    assert.ok(await ev(() => !!document.querySelector('#talkPortrait img.tk-img') && !document.getElementById('talkPortrait').classList.contains('tk-emoji')), 'a drawn neighbour: the bust');
    await ev(() => closeTalk());
  }

  // Rook (and bosses) have nothing to chat about: just Play, and no hearts
  await ev(() => openTalk({ id: 'rival-rook', name: 'Rook', icon: '🎭', deck: [], isRival: true }));
  assert.ok(await shown('.tk-cat[data-go="play"]') && !(await shown('.tk-cat[data-go="chat"]')) && !(await shown('#talkHearts')), 'a rival: only Play, no hearts');
  await ev(() => closeTalk());
};
