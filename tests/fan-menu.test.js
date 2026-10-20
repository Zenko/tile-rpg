// The fan menu, the info bar and the tab window (build 290, js/fan-menu.js): the round button opens a fan of the five places and turns
// into a close mark, a place opens as a window over the dimmed town and slides away again, the bar says where you are, the side is a
// setting, and reduced motion skips the movement.
module.exports = async (page, assert) => {
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const box = sel => ev(s => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, r: r.right, b: r.bottom }; }, sel);
  await ev(() => { switchTab('town'); prefs.menuHand = 'right'; savePrefs(); fanLayout(); });
  await page.waitForTimeout(300);

  // resting: a bar and one button, the five places folded away under it
  const rest = await ev(() => ({ open: fanNav.classList.contains('open'), ops: fanItems.map(b => +getComputedStyle(b).opacity), ctx: fanNav.dataset.ctx, sky: !!document.querySelector('#dockBar #pillSky'), stats: !!document.querySelector('#dockBar #pillPebbles') && !!document.querySelector('#dockBar #pillCards'),
    hudSky: !!document.querySelector('.hud #pillSky'), win: document.getElementById('tabWin').classList.contains('on') }));
  assert.ok(!rest.open && rest.ops.every(o => o === 0) && rest.ctx === 'town' && rest.sky && rest.stats && !rest.hudSky && !rest.win, 'resting state: ' + JSON.stringify(rest));

  // tap the round button: the fan unfolds, every place is a 44px+ target inside the screen, and the button shows a close mark
  await page.click('#fanMain'); await page.waitForTimeout(900);
  const open = await ev(() => { const vw = innerWidth, vh = innerHeight; return { cls: fanNav.classList.contains('open'), aria: fanMainBtn.getAttribute('aria-expanded'), label: fanMainBtn.getAttribute('aria-label'),
    items: fanItems.map(b => { const r = b.getBoundingClientRect(); return { w: Math.round(r.width), inside: r.left >= 0 && r.right <= vw && r.top >= 0 && r.bottom <= vh, op: +getComputedStyle(b).opacity, hit: document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === b || b.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)) }; }),
    x: +getComputedStyle(document.querySelector('.fm-x')).opacity, ico: +getComputedStyle(document.querySelector('.fm-ico')).opacity }; });
  assert.ok(open.cls && open.aria === 'true' && open.label === 'Close menu', 'the button reports it is open: ' + JSON.stringify(open));
  assert.ok(open.items.every(i => i.w >= 44 && i.inside && i.op === 1 && i.hit), 'five tappable places, all on screen: ' + JSON.stringify(open.items));
  assert.ok(open.x === 1 && open.ico === 0, 'the button turns into a close mark while open: ' + JSON.stringify({ x: open.x, ico: open.ico }));
  // no two places overlap each other
  const overlap = await ev(() => { const rs = fanItems.map(b => b.getBoundingClientRect()); let o = 0; for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) { const dx = (rs[i].x + rs[i].width / 2) - (rs[j].x + rs[j].width / 2), dy = (rs[i].y + rs[i].height / 2) - (rs[j].y + rs[j].height / 2); if (Math.hypot(dx, dy) < 60) o++; } return o; });
  assert.strictEqual(overlap, 0, 'the five places do not overlap');

  // the close mark closes it, and the places fold away
  await page.click('#fanMain'); await page.waitForTimeout(800);
  const shut = await ev(() => ({ open: fanNav.classList.contains('open'), ops: fanItems.map(b => +getComputedStyle(b).opacity) }));
  assert.ok(!shut.open && shut.ops.every(o => o === 0), 'tapping the close mark folds the fan: ' + JSON.stringify(shut));

  // a place opens as a window over the dimmed town: Journal
  await page.click('#fanMain'); await page.waitForTimeout(700); await page.click('#tabJournal'); await page.waitForTimeout(800);
  const j = await ev(() => ({ tab: currentTab, on: document.getElementById('tabWin').classList.contains('on'), title: document.getElementById('winTitle').textContent, panel: !document.getElementById('journalPanel').classList.contains('hidden'),
    dim: document.body.classList.contains('win-open'), fanOpen: fanNav.classList.contains('open'), ctx: document.getElementById('dockCtx').textContent, ctxShown: getComputedStyle(document.getElementById('dockCtx')).display !== 'none', skyHidden: getComputedStyle(document.getElementById('dockTown')).display === 'none',
    town: document.getElementById('townPanel').classList.contains('tab-away') }));
  assert.ok(j.tab === 'journal' && j.on && j.title === 'Journal' && j.panel && j.dim && !j.fanOpen && j.town, 'Journal opens as a window: ' + JSON.stringify(j));
  assert.ok(/^Journal/.test(j.ctx) && j.ctxShown && j.skyHidden, 'the bar says what the screen is about: ' + JSON.stringify(j));
  // the window sits between the top pill and the bar, and the bar stays under the fan
  const g = await ev(() => { const w = document.getElementById('tabWin').getBoundingClientRect(), bar = document.getElementById('dockBar').getBoundingClientRect(), hud = document.querySelector('.hud').getBoundingClientRect(); return { winTop: w.top, hudBottom: hud.bottom, winBottom: w.bottom, barTop: bar.top, winH: w.height }; });
  assert.ok(g.winTop >= g.hudBottom && g.winBottom <= g.barTop && g.winH > 300, 'the window clears the top pill and the info bar: ' + JSON.stringify(g));

  // its content scrolls inside the window, and Today shows rows
  const sc = await ev(() => { const b = document.getElementById('winBody'); return { overflow: getComputedStyle(b).overflowY, rows: document.querySelectorAll('#todayList *').length > 0 }; });
  assert.ok(sc.overflow === 'auto' && sc.rows, 'the body scrolls and the Journal has its rows: ' + JSON.stringify(sc));

  // another place while the window is open: the window stays, the content changes
  await page.click('#fanMain'); await page.waitForTimeout(600); await page.click('#tabCollection'); await page.waitForTimeout(700);
  const c = await ev(() => ({ on: document.getElementById('tabWin').classList.contains('on'), out: document.getElementById('tabWin').classList.contains('win-out'), title: document.getElementById('winTitle').textContent,
    cards: !document.getElementById('collectionPanel').classList.contains('hidden'), journalHidden: document.getElementById('journalPanel').classList.contains('hidden'), ctx: document.getElementById('dockCtx').textContent }));
  assert.ok(c.on && !c.out && c.title === 'Cards' && c.cards && c.journalHidden && /deck \d+\/\d+/.test(c.ctx), 'Cards replaces Journal in the same window: ' + JSON.stringify(c));
  // the Deck, Sets and Workshop tabs work inside the window
  await page.click('#segDeck'); await page.waitForTimeout(300);
  assert.ok(await ev(() => !document.getElementById('deckPanel').classList.contains('hidden')), 'a tab inside the window still switches');

  // the close button slides it away: the panel stays until the slide is done, then the town is back
  await page.click('#winClose');
  await page.waitForTimeout(80);
  const mid = await ev(() => ({ cls: document.getElementById('tabWin').className, panelVisible: !document.getElementById('collectionPanel').classList.contains('hidden'), tab: currentTab }));
  assert.ok(/win-out/.test(mid.cls) && mid.panelVisible && mid.tab === 'town', 'the window keeps its content while it slides down: ' + JSON.stringify(mid));
  await page.waitForTimeout(600);
  const gone = await ev(() => ({ on: document.getElementById('tabWin').classList.contains('on'), panelHidden: document.getElementById('collectionPanel').classList.contains('hidden'), dim: document.body.classList.contains('win-open'), ctx: fanNav.dataset.ctx, town: !document.getElementById('townPanel').classList.contains('tab-away') }));
  assert.ok(!gone.on && gone.panelHidden && !gone.dim && gone.ctx === 'town' && gone.town, 'closed: ' + JSON.stringify(gone));

  // tapping the dimmed town closes a window, and so does Escape; Escape first closes an open fan
  await ev(() => switchTab('quests')); await page.waitForTimeout(700);
  await page.mouse.click(200, 30); await page.waitForTimeout(700);
  assert.strictEqual(await ev(() => currentTab), 'town', 'tapping the dim closes the window');
  await ev(() => switchTab('character')); await page.waitForTimeout(700);
  await page.click('#fanMain'); await page.waitForTimeout(600);
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  assert.ok(await ev(() => !fanNav.classList.contains('open') && currentTab === 'character'), 'Escape folds the fan first');
  await page.keyboard.press('Escape'); await page.waitForTimeout(700);
  assert.strictEqual(await ev(() => currentTab), 'town', 'a second Escape closes the window');

  // the dots: a gift waiting puts a dot on Rewards and on the round button; collecting it takes both away
  await ev(() => { state.progress.lastGift = null; updateHud(); });
  await page.waitForTimeout(200);
  const d1 = await ev(() => ({ item: !!document.querySelector('#tabQuests .dot'), main: !document.getElementById('fanMainDot').classList.contains('hidden') }));
  assert.ok(d1.item && d1.main, 'a gift ready dots Rewards and the round button: ' + JSON.stringify(d1));
  await ev(() => { state.progress.lastGift = todayKey(); updateHud(); }); await page.waitForTimeout(200);
  const d2 = await ev(() => ({ main: !document.getElementById('fanMainDot').classList.contains('hidden') }));
  assert.ok(!d2.main, 'and the dot goes when there is nothing waiting');

  // the info bar: place and weather in town, cards and Embers always, XP line
  const bar = await ev(() => ({ district: document.getElementById('hudDistrict').textContent, cards: document.getElementById('cardCount').textContent, embers: document.getElementById('pebbleCount').textContent, xp: document.getElementById('dockXpFill').style.width,
    stat: document.getElementById('pillPebbles').getBoundingClientRect().height }));
  assert.ok(bar.district && +bar.cards === await ev(() => state.ownedCards.length) && bar.embers !== '' && /%$/.test(bar.xp), 'the bar shows the place, cards, Embers and XP: ' + JSON.stringify(bar));

  // the other hand: the button and the fan move to the left side, and the Settings switch does it
  await ev(() => { openPlayerMenu(); }); await page.waitForTimeout(300);
  await page.click('#handSeg [data-hand-pick="left"]'); await page.waitForTimeout(500);
  await ev(() => closePlayerMenu());
  const left = await ev(() => ({ pref: prefs.menuHand, cls: fanNav.className, mainX: fanMainBtn.getBoundingClientRect().x, w: innerWidth, active: document.querySelector('#handSeg .seg-btn.active').dataset.handPick }));
  assert.ok(left.pref === 'left' && /\bl\b/.test(left.cls) && left.mainX < left.w / 2 && left.active === 'left', 'the menu moves to the left: ' + JSON.stringify(left));
  await page.click('#fanMain'); await page.waitForTimeout(900);
  const lo = await ev(() => fanItems.map(b => { const r = b.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0; }));
  assert.ok(lo.every(Boolean), 'the left-hand fan fits on screen: ' + JSON.stringify(lo));
  await page.click('#fanMain'); await page.waitForTimeout(600);
  await ev(() => { prefs.menuHand = 'right'; savePrefs(); fanLayout(); });

  // a small phone: the fan still fits, for both hands
  await page.setViewportSize({ width: 360, height: 640 }); await page.waitForTimeout(300);
  for (const hand of ['right', 'left']) {
    await ev(h => { prefs.menuHand = h; fanLayout(); }, hand);
    await page.click('#fanMain'); await page.waitForTimeout(900);
    const fit = await ev(() => fanItems.map(b => { const r = b.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight; }));
    assert.ok(fit.every(Boolean), hand + ' hand fits 360x640: ' + JSON.stringify(fit));
    await page.click('#fanMain'); await page.waitForTimeout(600);
  }
  await ev(() => { prefs.menuHand = 'right'; savePrefs(); fanLayout(); });
  await page.setViewportSize({ width: 400, height: 860 }); await page.waitForTimeout(300);

  // reduced motion: no travelling, the fan and the window are simply there, and gone
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.click('#fanMain'); await page.waitForTimeout(80);
  assert.ok(await ev(() => fanItems.every(b => +getComputedStyle(b).opacity === 1)), 'reduced motion: the fan is open at once');
  await page.click('#tabJournal'); await page.waitForTimeout(120);
  assert.ok(await ev(() => document.getElementById('tabWin').classList.contains('on') && !document.getElementById('tabWin').classList.contains('win-in')), 'reduced motion: the window just appears');
  await page.click('#winClose'); await page.waitForTimeout(120);
  assert.ok(await ev(() => !document.getElementById('tabWin').classList.contains('on') && document.getElementById('journalPanel').classList.contains('hidden')), 'reduced motion: and just goes');
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  // a battle hides the whole menu; the window comes back with the tab afterwards
  await ev(() => switchTab('journal')); await page.waitForTimeout(700);
  await ev(() => { document.body.classList.add('in-battle'); });
  assert.strictEqual(await ev(() => getComputedStyle(document.getElementById('tabWin')).display), 'none', 'a battle hides the window');
  await ev(() => { document.body.classList.remove('in-battle'); });
  assert.strictEqual(await ev(() => getComputedStyle(document.getElementById('tabWin')).display), 'flex', 'and it is back after the battle');
};
