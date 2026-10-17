// Mobile (build 280): zoom allowed, small controls hit 44px to a thumb, and the battle works on a short phone (360x640).
// The effective tap size is measured the way scripts/mobile-audit.js does: by probing which element receives a tap just outside a control.
module.exports = async (page, assert) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.evaluate(() => { document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('resize')); });
  await page.waitForTimeout(300);
  const probe = `(sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(), cx = Math.round(r.left + r.width / 2), cy = Math.round(r.top + r.height / 2);
    const hit = (x, y) => { const t = document.elementFromPoint(x, y); return !!t && (t === e || e.contains(t)); };
    if (!hit(cx, cy)) return { covered: true };
    const reach = (dx, dy) => { let n = 0; for (let i = 1; i <= 30; i++) { const x = cx + dx * (dx ? i + r.width / 2 : 0), y = cy + dy * (dy ? i + r.height / 2 : 0); if (!hit(Math.round(x), Math.round(y))) break; n = i; } return n; };
    return { w: Math.round(r.width) + reach(-1, 0) + reach(1, 0), h: Math.round(r.height) + reach(0, -1) + reach(0, 1) }; }`;
  const size = async sel => page.evaluate(`(${probe})(${JSON.stringify(sel)})`);

  // pinch-zoom is not blocked
  const meta = await page.evaluate(() => document.querySelector('meta[name=viewport]').content);
  assert.ok(!/user-scalable\s*=\s*no|maximum-scale\s*=\s*1(\.0)?\b/.test(meta), 'the page can be zoomed: ' + meta);

  // the Embers pill, and the Cards tabs
  const pill = await size('#pillPebbles'); assert.ok(pill && pill.w >= 43 && pill.h >= 43, 'the Embers pill is a 44px target: ' + JSON.stringify(pill));
  await page.evaluate(() => { document.getElementById('tabCollection').click(); setCardsView('deck'); }); await page.waitForTimeout(400);
  const seg = await size('#segMine'); assert.ok(seg && seg.h >= 43, 'the Cards tabs are 44px tall to a thumb: ' + JSON.stringify(seg));

  // a battle on a short phone, with a Gift, a Fate and a companion cheer (the crowded case) and a full hand
  await page.evaluate(() => {
    prefs.tossStyle = 'skip'; CARD_POOL.slice(0, 60).forEach(x => state.ownedCards.push(x.id, x.id, x.id)); state.deck = BattleEngine.suggestDeck(ownedCardCounts()); state.progress.level = 12;
    state.progress.tarot = Object.assign({ attuned: [] }, state.progress.tarot || {}); const star = ARCANA.findIndex(a => a.card === 'moonstone'); state.progress.tarot.attuned = [star]; chooseFate(star);
    chooseCompanion(cardEntry('sprout')); state.companion.bond = BOND_AT[1] + 1; state.companion.perk = 'spirit'; saveState();
    startBattle({ id: 'm-test', name: 'Test Foe', icon: '🦊', deck: BattleEngine.suggestDeck(ownedCardCounts()), isBoss: false, rewardCard: null, defeated: false, profile: { level: 'gentle', spirit: 15 } });
  });
  for (let i = 0; i < 40; i++) { await page.waitForTimeout(400); if (await page.evaluate(() => inBattle && battle && battle.G && !battle.busy && !document.getElementById('mulliganOverlay').classList.contains('hidden'))) break; }
  await page.evaluate(() => { document.getElementById('mulliganKeepBtn').click(); const h = document.getElementById('btHelpClose'); if (h) h.click(); document.querySelectorAll('.overlay').forEach(o => { if (o.id !== 'battleView') o.classList.add('hidden'); }); });
  await page.waitForTimeout(1200);
  await page.evaluate(() => { const me = battle.G.p[0]; while (me.hand.length < 7 && me.deck.length) me.hand.push(me.deck.pop()); me.hand[0].hp = Math.max(1, me.hand[0].hp - 2); btRender(); });
  await page.waitForTimeout(500);

  for (const id of ['#btKnack', '#btFate', '#btCheer']) { const s = await size(id); assert.ok(s && !s.covered && s.w >= 43 && s.h >= 43, id + ' is a 44px target: ' + JSON.stringify(s)); }
  const bar = await page.evaluate(() => { const n = document.querySelector('#btYouSpirit .num'), b = document.getElementById('btHelp'); return { clipped: n ? n.scrollWidth > n.clientWidth + 1 : null, text: n ? n.textContent.trim() : '', help: b ? getComputedStyle(b).display : 'none' }; });
  assert.ok(bar.clipped === false && /\d+\s*\/\s*\d+/.test(bar.text), 'the Calm number is not cut off with three power buttons: ' + JSON.stringify(bar));
  assert.strictEqual(bar.help, 'none', 'the help button makes room on a narrow phone');

  // the effects line folds to one effect and opens on a tap
  const chips = await page.evaluate(() => { const e = document.getElementById('btWeather'); return { n: (e._chips || []).length, folded: e.classList.contains('folded'), h: Math.round(e.getBoundingClientRect().height) }; });
  if (chips.n > 1) {
    assert.ok(chips.folded && chips.h <= 40, 'several effects fold to one line on a short phone: ' + JSON.stringify(chips));
    await page.evaluate(() => document.getElementById('btWeather').click());
    assert.ok(await page.evaluate(() => document.getElementById('btWeather').classList.contains('open') && document.getElementById('btWeather').getBoundingClientRect().height > 40), 'a tap opens the full list');
    await page.evaluate(() => document.getElementById('btWeather').click());
    assert.ok(await page.evaluate(() => !document.getElementById('btWeather').classList.contains('open')), 'and closes it again');
  }

  // a full hand: every covered card still shows its health (it must not sit under the next card)
  const hand = await page.evaluate(() => { const cards = [...document.querySelectorAll('#btHand .hcard')]; return cards.slice(0, -1).map((w, i) => { const st = w.querySelector('.stats .hp'), next = cards[i + 1].getBoundingClientRect(), r = st && st.getBoundingClientRect(); return !!r && r.right <= next.left + 2 && r.width > 0; }); });
  assert.ok(hand.length >= 5 && hand.every(Boolean), 'each covered card in a full hand shows its health: ' + hand);
};
