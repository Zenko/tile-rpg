// Landscape (build 285): a phone on its side gets a rail on the left, a map that shows about five rows, a battle laid out across and wider card lists.
// An upright phone and a roomy landscape screen (a tablet) keep the 460px column.
module.exports = async (page, assert) => {
  const rect = sel => page.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height) }; }, sel);
  const settle = async () => { await page.evaluate(() => window.dispatchEvent(new Event('resize'))); await page.waitForTimeout(500); };

  // ----- upright: unchanged -----
  await page.setViewportSize({ width: 390, height: 844 }); await settle();
  let nav = await rect('#bottomNav');
  assert.ok(nav.w > 300 && nav.b > 760, 'upright, the dock sits along the bottom: ' + JSON.stringify(nav));
  assert.strictEqual(await page.evaluate(() => isShortLandscape()), false);
  // ----- a roomy landscape screen: also unchanged -----
  await page.setViewportSize({ width: 1180, height: 820 }); await settle();
  nav = await rect('#bottomNav'); assert.ok(nav.w > 300 && nav.h < 120, 'a tablet on its side keeps the dock along the bottom: ' + JSON.stringify(nav));

  // ----- a phone on its side -----
  await page.setViewportSize({ width: 844, height: 390 }); await settle();
  assert.strictEqual(await page.evaluate(() => isShortLandscape()), true);
  nav = await rect('#bottomNav'); assert.ok(nav.w < 100 && nav.h > 300 && nav.l < 20, 'the dock is a rail down the left: ' + JSON.stringify(nav));
  const tabs = await page.evaluate(() => [...document.querySelectorAll('#bottomNav .tab-btn')].map(b => { const r = b.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }));
  assert.ok(tabs.length === 5 && tabs.every(t => t[0] >= 44 && t[1] >= 44), 'five tabs, each a 44px target: ' + JSON.stringify(tabs));
  assert.ok(nav.b <= 390, 'the rail fits the screen');
  const hud = await rect('.hud'); assert.ok(hud.l >= nav.r && hud.w < 460, 'the top pill clears the rail and is narrower than the screen: ' + JSON.stringify(hud));
  // the tab slider follows the current tab, vertically
  await page.evaluate(() => document.getElementById('tabCollection').click()); await page.waitForTimeout(600);
  const pill = await page.evaluate(() => { const nav = document.getElementById('bottomNav'), t = document.getElementById('tabCollection').getBoundingClientRect(); return { i: getComputedStyle(nav).getPropertyValue('--i').trim(), tabTop: Math.round(t.top), navTop: Math.round(nav.getBoundingClientRect().top) }; });
  assert.strictEqual(pill.i, '2', 'the slider is on the third tab'); assert.ok(pill.tabTop > pill.navTop + 100, 'which is further down the rail');
  // card lists use the width
  const cols = await page.evaluate(() => { const g = document.querySelector('.alm-row'); return g ? getComputedStyle(g).gridTemplateColumns.split(' ').length : 0; });
  assert.ok(cols >= 5, 'the card list has five or more columns on its side, not three: ' + cols);
  await page.evaluate(() => document.getElementById('tabTown').click()); await page.waitForTimeout(600);
  // the map: about five rows, not three
  const map = await page.evaluate(() => ({ tile: tilePx, rows: viewRows, cols: Math.ceil(townView.clientWidth / tilePx) }));
  assert.ok(map.tile >= 48 && map.tile <= 90 && map.cols >= 9, 'the map shows many more tiles across: ' + JSON.stringify(map));
  assert.ok(map.rows >= 5, 'and at least five rows: ' + JSON.stringify(map));

  // ----- a battle on its side -----
  await page.evaluate(() => {
    prefs.tossStyle = 'skip'; CARD_POOL.slice(0, 60).forEach(x => state.ownedCards.push(x.id, x.id, x.id)); state.deck = BattleEngine.suggestDeck(ownedCardCounts()); state.progress.level = 12;
    startBattle({ id: 'ls-test', name: 'Test Foe', icon: '🦊', deck: BattleEngine.suggestDeck(ownedCardCounts()), isBoss: false, rewardCard: null, defeated: false, profile: { level: 'gentle', spirit: 15 } });
  });
  for (let i = 0; i < 40; i++) { await page.waitForTimeout(400); if (await page.evaluate(() => inBattle && battle && battle.G && !battle.busy && !document.getElementById('mulliganOverlay').classList.contains('hidden'))) break; }
  await page.evaluate(() => { document.getElementById('mulliganKeepBtn').click(); document.querySelectorAll('.overlay').forEach(o => { if (o.id !== 'battleView') o.classList.add('hidden'); }); });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const G = battle.G; ['hedgehog', 'geode', 'bubble'].forEach((id, i) => { G.p[0].board.push(BattleEngine.makeCard(id, 800 + i, {})); G.p[1].board.push(BattleEngine.makeCard(['toadstool', 'dove', 'pebble'][i], 900 + i, {})); }); const me = G.p[0]; while (me.hand.length < 7 && me.deck.length) me.hand.push(me.deck.pop()); btRender(); });
  await page.waitForTimeout(500);
  const bt = {}; for (const [k, s] of [['opp', '#btOppBar'], ['you', '#btYouBar'], ['table', '#battleView .table'], ['oppBoard', '#btOppBoard'], ['youBoard', '#btYouBoard'], ['hand', '#btHand'], ['end', '#btEnd']]) bt[k] = await rect(s);
  assert.ok(bt.opp.r <= bt.table.l + 4 && bt.you.r <= bt.table.l + 4, 'both players sit to the left of the table: ' + JSON.stringify({ o: bt.opp.r, y: bt.you.r, t: bt.table.l }));
  assert.ok(bt.table.t >= 20 && bt.table.b <= 390, 'the table fits the screen height');
  assert.ok(bt.hand.t > bt.table.t + 100 && bt.hand.l >= bt.table.l - 140, 'the hand is under the table');
  assert.ok(bt.end.l > bt.table.r - 40 && bt.end.h >= 44 && bt.end.b <= 390 && bt.end.r <= 844, 'End turn is on the right, a 44px target, fully on screen: ' + JSON.stringify(bt.end));
  const cardsH = await page.evaluate(() => [...document.querySelectorAll('#btYouBoard .card, #btOppBoard .card')].map(c => Math.round(c.getBoundingClientRect().height)));
  assert.ok(cardsH.length === 6 && cardsH.every(h => h >= 80), 'board cards stay readable: ' + cardsH);
  // the three buttons are reachable and not covered
  const minis = await page.evaluate(() => ['btHelp', 'btYield'].map(id => { const e = document.getElementById(id), r = e.getBoundingClientRect(), t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!t && (t === e || e.contains(t)) && r.bottom <= 390; }));
  assert.ok(minis.every(Boolean), 'the help and yield buttons are on screen and not covered: ' + minis);
  // End turn works through the layout
  const ended = await page.evaluate(async () => { const t0 = battle.G.turn; battle.G.active = 0; battle.busy = false; btRender(); document.getElementById('btEnd').click(); await new Promise(r => setTimeout(r, 1500)); return battle.G.turn > t0; });
  assert.ok(ended, 'End turn still ends the turn');

  // ----- and back upright, everything returns to the column -----
  await page.evaluate(() => { try { yieldBattle && 0; } catch (e) {} });
  await page.setViewportSize({ width: 390, height: 844 }); await settle();
  const g = await page.evaluate(() => getComputedStyle(document.getElementById('battleView')).display);
  assert.strictEqual(g, 'flex', 'upright, the battle is the old column again');
};
