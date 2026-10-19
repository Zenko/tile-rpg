// The neighbour screen's dock and close-up styles (build 289, prefs.talkStyle): the same panes and buttons as the classic grid, a dock of the four jobs,
// a match button one tap away, a list that opens above the dock and closes again, and a Settings switch.
module.exports = async (page, assert) => {
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const shown = sel => ev(s => { const e = document.querySelector(s); return !!e && e.offsetParent !== null; }, sel);
  const view = () => ev(() => document.getElementById('talkCard').dataset.view);
  const open = s => ev(st => { if (talkTo) closeTalk(); prefs.talkStyle = st; openTalk({ id: 'npc-square-fenn', name: 'Fenn', icon: '🧑', deck: [], level: 3 }); }, s);
  await ev(() => { const h = document.getElementById('testHideOverlays'); if (h) h.remove(); switchTab('town'); });

  // the default is the close-up, and an unknown value falls back to it
  assert.strictEqual(await ev(() => { delete prefs.talkStyle; return talkStyle(); }), 'combo', 'close-up is the default');
  assert.strictEqual(await ev(() => { prefs.talkStyle = 'nonsense'; return talkStyle(); }), 'combo', 'an unknown style falls back');

  for (const st of ['dock', 'combo']) {
    await open(st);
    assert.strictEqual(await ev(() => document.getElementById('talkCard').dataset.style), st, st + ' is set on the card');
    await page.waitForTimeout(700);   // the cards rise in one after another
    // the dock: the jobs on screen at once, at the bottom, with the match button above it
    const dock = await ev(() => { const c = document.getElementById('talkCats').getBoundingClientRect(), q = document.getElementById('talkQuick').getBoundingClientRect(), tab = [...document.querySelectorAll('#talkCats .tk-cat')].map(b => b.dataset.go); return { tab, row: [...document.querySelectorAll('#talkCats .tk-cat')].every(b => Math.abs(b.getBoundingClientRect().top - c.top) < 14), quickAbove: q.bottom <= c.top + 1, quickText: document.getElementById('talkQuick').textContent }; });
    assert.deepStrictEqual(dock.tab, ['chat', 'play', 'trade'], 'the dock holds the jobs this neighbour has: ' + JSON.stringify(dock));
    assert.ok(dock.row && dock.quickAbove && /match/i.test(dock.quickText), st + ': one row, with the match button above it: ' + JSON.stringify(dock));
    // a job opens a list above the dock; the dock stays; tapping the same icon puts it away
    await ev(() => document.querySelector('#talkCats [data-go="chat"]').click());
    const o = await ev(() => { const s = document.querySelector('.tk-sub').getBoundingClientRect(), c = document.getElementById('talkCats').getBoundingClientRect(); return { view: document.getElementById('talkCard').dataset.view, above: s.bottom <= c.top + 1, dock: document.getElementById('talkCats').offsetParent !== null, on: document.querySelector('#talkCats .tk-cat.on').dataset.go, topics: document.querySelectorAll('#talkTopics .talk-topic').length, quote: /“/.test(document.querySelector('#talkTopics .talk-topic').textContent) }; });
    assert.ok(o.view === 'chat' && o.above && o.dock && o.on === 'chat' && o.topics >= 3, st + ': the list opens above the dock: ' + JSON.stringify(o));
    assert.strictEqual(o.quote, st === 'combo', 'topics read as things you say in the close-up only');
    await ev(() => document.querySelector('#talkCats [data-go="chat"]').click());
    assert.strictEqual(await view(), 'home', 'the same icon again puts the list away');
    // tapping the neighbour puts it away too
    await ev(() => document.querySelector('#talkCats [data-go="trade"]').click());
    assert.strictEqual(await view(), 'trade', 'Trade opens');
    await ev(() => document.getElementById('talkPortrait').click());
    assert.strictEqual(await view(), 'home', 'tapping the neighbour closes the list');
    // the match button does what the Play list's does
    const fights = await ev(() => { let n = 0; const real = interactWith; interactWith = (k, f) => { if (k === 'fight') n++; }; document.getElementById('talkQuick').click(); interactWith = real; return n; });
    assert.strictEqual(fights, 1, 'the match button starts a match');
  }

  // the close-up shows what they remember; the dock style does not
  const memo = await ev(() => { const f = { id: 'npc-square-fenn', name: 'Fenn', icon: '🧑', deck: [], level: 3 }; const m = npcMemOf(f, true); m.chats = 2; if (talkTo) closeTalk(); prefs.talkStyle = 'combo'; openTalk(f); const a = document.getElementById('talkMemo').textContent; closeTalk(); prefs.talkStyle = 'dock'; openTalk(f); const b = document.getElementById('talkMemo'); return { a, shown: b.offsetParent !== null }; });
  assert.ok(/chatted on 2 days/.test(memo.a) && !memo.shown, 'a line of what they remember, in the close-up only: ' + JSON.stringify(memo));

  // classic: the grid, no dock, nothing new on screen
  await open('classic');
  assert.ok(!(await shown('#talkQuick')) && !(await shown('#talkMemo')), 'classic shows neither the match button nor the memory line');
  await ev(() => document.querySelector('#talkCats [data-go="play"]').click());
  assert.ok(!(await shown('#talkCats')), 'classic hides the grid while a list is open');

  // the Settings switch sets the pref and shows the choice
  const seg = await ev(() => { document.querySelector('#talkStyleSeg [data-talkstyle-pick="dock"]').click(); const a = prefs.talkStyle; syncTalkStyleSeg(); return { a, on: document.querySelector('#talkStyleSeg .seg-btn.active').dataset.talkstylePick }; });
  assert.deepStrictEqual(seg, { a: 'dock', on: 'dock' }, 'the Settings switch works');
  await ev(() => { closeTalk(); delete prefs.talkStyle; savePrefs(); });
};
