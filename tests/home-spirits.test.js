// Spirits at home (js/home-spirits.js): companion, perches, resonance, the collector's cabinet, the Reborn mantel, and level-gated visitors.
module.exports = async (page, assert) => {
  const until = (fn, arg) => page.waitForFunction(fn, arg, { timeout: 8000 });
  const ev = (fn, arg) => page.evaluate(fn, arg);
  await ev(() => {
    switchTab('town');
    state.ownedCards = ['sprout', 'blossom', 'pebble', 'droplet', 'feather'];
    state.progress.home = { level: 5, items: HR_DEFAULTS.map(d => Object.assign({}, d)).concat([
      { uid: 'pc1', id: 'perch', x: 3, y: 4 }, { uid: 'pc2', id: 'perch', x: 4, y: 4 }, { uid: 'cab', id: 'cabinet', x: 1, y: 1 }, { uid: 'man', id: 'mantel', x: 4, y: 1 }]) };
    state.companion = { kind: 'card', id: 'sprout', cardId: 'sprout', name: 'Sprout', icon: '🌱', perk: 'xp', since: Date.now(), bond: 0, wins: 0, catches: 0 };
    openScene('home');
  });
  await until(() => !!document.querySelector('.hr-room .hr-world'));

  // companion
  assert.ok(await ev(() => !!document.querySelector('.hr-comp > span')), 'your companion is in the room');
  const start = await ev(() => hs.comp.x + ',' + hs.comp.y);
  let moved = false;
  for (let i = 0; i < 30 && !moved; i++) { await ev(() => hsTick()); moved = (await ev(() => hs.comp.x + ',' + hs.comp.y)) !== start; }
  assert.ok(moved, 'it wanders');
  assert.ok(await ev(() => hrWalkable(hs.comp.x, hs.comp.y) && !(hs.comp.x === homeRoom.x && hs.comp.y === homeRoom.y)), 'only over free floor, never on you');
  assert.ok(await ev(() => hsTapVisitor(hs.comp.x, hs.comp.y)), 'a tap on it is for it, and it says something');

  // a perch shows a card you own, and only one perch per card
  await ev(() => hrGoTo(hrHome().items.find(i => i.uid === 'pc1')));
  await until(() => /Choose a spirit/.test(document.getElementById('scActions').textContent));
  assert.ok(await ev(() => !!document.querySelector('#scActions [data-act="hs:perch:pc1:sprout"]')), 'the sheet lists the cards you own');
  assert.ok(await ev(() => !!document.querySelector('#scActions [data-act="hr-close"]')), 'and ends in Close');
  await ev(() => sceneAction('hs:perch:pc1:sprout'));
  assert.strictEqual(await ev(() => hrHome().items.find(i => i.uid === 'pc1').card), 'sprout', 'the perch holds it');
  assert.ok(await ev(() => !!document.querySelector('.hr-prop .hr-fig')), 'and the spirit is drawn over it');
  assert.ok(await ev(() => !hsSheetHtml(hrHome().items.find(i => i.uid === 'pc2')).includes('hs:perch:pc2:sprout')), 'another perch cannot show the same card');
  assert.strictEqual(await ev(() => (state.ownedCards = state.ownedCards.filter(c => c !== 'sprout'), hsExtras(hrHome().items.find(i => i.uid === 'pc1')))), '', 'a card you no longer own leaves the perch empty');
  await ev(() => { state.ownedCards.push('sprout'); });

  // resonance: a Grove spirit with a Grove corner glows
  assert.ok(await ev(() => !hsResonant(hrHome().items.find(i => i.uid === 'pc1'))), 'no corner, no resonance');
  await ev(() => { hrHome().items.push({ uid: 'cg', id: 'grove', x: 6, y: 5 }); hrCommit(); });
  assert.ok(await ev(() => hsResonant(hrHome().items.find(i => i.uid === 'pc1')) && !!document.querySelector('.hr-prop.resonant')), 'a perch showing a Grove spirit resonates with a Grove nook');

  // the collector's cabinet lights a medal for each finished set
  assert.strictEqual(await ev(() => document.querySelectorAll('.hr-medals i').length), await ev(() => CARD_SETS.length), 'a medal for every set');
  const lit = () => ev(() => document.querySelectorAll('.hr-medals i.on').length);
  const before = await lit();
  await ev(() => { state.ownedCards = state.ownedCards.concat(CARD_SETS.find(s => s.id === 'birds').cards); hrRefresh(); });
  assert.strictEqual(await lit(), before + 1, 'finishing a set lights its medal');

  // the Reborn mantel holds three Reborn spirits
  await ev(() => { foils().sprout = 1; foils().blossom = 1; foils().pebble = 1; foils().droplet = 1; });
  assert.ok(await ev(() => hsSheetHtml(hrHome().items.find(i => i.uid === 'man')).includes('hs:madd:man:sprout')), 'Reborn cards can go up');
  for (const c of ['sprout', 'blossom', 'pebble', 'droplet']) await ev(c => { hsAction('hs:madd:man:' + c); }, c);
  assert.strictEqual(await ev(() => hrHome().items.find(i => i.uid === 'man').cards.length), 3, 'three at most');
  assert.strictEqual(await ev(() => document.querySelectorAll('.hr-fig.m.reborn').length), 3, 'and they are drawn on the mantel');
  await ev(() => hsAction('hs:mdel:man:sprout'));
  assert.strictEqual(await ev(() => hrHome().items.find(i => i.uid === 'man').cards.length), 2, 'one can be taken down');

  // visitors: not before level 3, rarity by level, then a daily limit
  await ev(() => { hrHome().level = 2; hsVisit().cur = null; hsVisit().n = 0; });
  assert.strictEqual(await ev(() => hsMaybeVisit(true)), false, 'no visitors below home level 3');
  const kinds = lvl => ev(l => { const s = new Set(); for (let i = 0; i < 400; i++) { const r = hsRoll(l); const d = cardDef(r.card); if (d.exclusive || d.spell || !CARD_FAMILY[d.id] || d.rarity !== r.rar) return ['bad ' + r.card]; s.add(r.rar); } return [...s].sort(); }, lvl);
  assert.deepStrictEqual(await kinds(3), ['rare', 'ultra'], 'level 3 brings rare and ultra rare spirits');
  assert.deepStrictEqual(await kinds(4), ['rare', 'super', 'ultra'], 'level 4 can bring super ultra rare');
  assert.deepStrictEqual(await kinds(5), ['mythic', 'super', 'ultra'], 'mythic only at level 5');
  // corners steer the family
  await ev(() => { hrHome().items.push({ uid: 'cg2', id: 'grove', x: 5, y: 7 }, { uid: 'cg3', id: 'grove', x: 6, y: 7 }); hrIndex(); });
  const grove = await ev(() => { let n = 0; for (let i = 0; i < 400; i++) if (hsRoll(3).fam === 'grove') n++; return n / 400; });
  assert.ok(grove > .55, 'three Grove nooks make Grove spirits the common visitors: ' + grove);

  await ev(() => { hrHome().level = 3; const v = hsVisit(); v.cur = null; v.n = 0; v.nextAt = 0; });
  assert.strictEqual(await ev(() => hsMaybeVisit(true)), true, 'a spirit calls at level 3');
  await until(() => !!document.querySelector('.hr-visitor .hr-vfig'));
  const owned = await ev(() => state.ownedCards.length);
  await ev(() => { const t = hs.vis; hsTapVisitor(t.x, t.y); });
  await until(() => !!document.querySelector('#scActions [data-act="hs:welcome"]'));
  await page.click('#scActions [data-act="hs:welcome"]');
  assert.strictEqual(await ev(() => state.ownedCards.length), owned + 1, 'welcoming it gives you its card');
  assert.ok(await ev(() => !hsVisit().cur && hsVisit().n === 1 && state.progress.totals.homeVisitors === 1 && !document.querySelector('.hr-visitor')), 'and it goes on its way');
  assert.strictEqual(await ev(() => hsMaybeVisit(true)), false, 'one visitor a day at level 3');
  await ev(() => { hrHome().level = 5; });
  assert.strictEqual(await ev(() => hsMaybeVisit(true)), true, 'level 5 allows a second');
  await ev(() => { hsVisit().day = 'long ago'; });
  assert.strictEqual(await ev(() => hsVisit().cur), null, 'a spirit still waiting at the end of the day has gone');
};
