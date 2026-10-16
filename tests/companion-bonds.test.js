// Companion extras (build 277): perks for Sting / Kin / Lull, memories from what you did together, and the daily gift from bond 2.
module.exports = async (page, assert) => {
  const r = await page.evaluate(() => {
    const out = {};
    // the three keywords that used to fall back to XP now have a perk each, and every perk has a bond table and chat lines
    out.map = ['badger', 'moss-hare', 'hermit-crab'].map(id => companionPerkFor(id)).join();
    out.fallback = companionPerkFor('spark');                                  // a spell still gives XP
    out.tables = Object.keys(COMPANION_PERKS).every(k => BOND_PERK[k] || k === 'craft' || k === 'xp' && BOND_PERK.xp);
    out.talk = ['bounty', 'medals', 'hearth'].every(k => COMPANION_TALK.perk[k] && COMPANION_TALK.perk[k].length >= 2);
    // the effects: bread, mini-game medals and match wins
    state.ownedCards = ['badger', 'moss-hare', 'hermit-crab', 'sprout'].flatMap(id => [id, id, id]); state.progress.level = 12;
    chooseCompanion(cardEntry('hermit-crab')); const bake0 = bakeMs(); state.companion.perk = 'xp'; const bake1 = bakeMs(); state.companion.perk = 'hearth';
    out.bake = Math.round(bake0 / bake1 * 100) / 100 === 0.8 ? 'faster' : [bake0, bake1];
    out.bounty = hasPerk('hearth') && !hasPerk('bounty'); state.companion.perk = 'bounty'; out.bountyOn = hasPerk('bounty'); state.companion.perk = 'medals'; out.medalsOn = hasPerk('medals');
    out.cardBounty = [1, 2].map(lv => { state.companion.perk = 'bounty'; state.companion.perk2 = null; state.companion.bond = lv === 1 ? 0 : BOND_AT[1]; return cardBonus('winPebbles'); }).join();
    // memories
    chooseCompanion(cardEntry('sprout')); const c = state.companion;
    c.since = Date.now(); c.wins = 0; c.catches = 0; out.none = companionMemories(c).length;
    c.since = Date.now() - 15 * 86400000; c.wins = 13; c.catches = 4;
    const all = companionMemories(c), last = companionMemories(c, true);
    out.all = all.length; out.last = last.length; out.text = last.join(' | '); out.filled = last.every(t => !t.includes('{n}'));
    out.inTalk = (() => { const seen = new Set(); for (let i = 0; i < 300; i++) seen.add(companionTalk(c)); return all.every(t => seen.has(t.replace(/\{you\}/g, companionPlayerName()))) || last.some(t => seen.has(t)); })();
    // the gift: not before bond 2, once a day, pays Embers and XP, sometimes a card
    c.bond = 0; delete state.progress.companionDay; out.early = companionGiftReady(c) + '|' + companionGift();
    c.bond = BOND_AT[1]; out.ready = companionGiftReady(c);
    const e0 = state.progress.pebbles, cards0 = state.ownedCards.length; const real = Math.random; Math.random = () => 0.9;    // no card this time
    const t = companionGift(); Math.random = real;
    out.gift = t.includes('+6') && state.progress.pebbles - e0 >= 6 && state.ownedCards.length === cards0;
    out.again = companionGift() + '|' + companionGiftReady(c);
    delete state.progress.companionDay; c.bond = BOND_AT[2]; Math.random = () => 0.01;             // a card this time (and bond 3 pays 8)
    const cards1 = state.ownedCards.length, e1 = state.progress.pebbles; const t2 = companionGift(); Math.random = real;
    out.card = state.ownedCards.length === cards1 + 1 && state.progress.pebbles - e1 >= 8 && t2.includes('+8');
    return out;
  });
  assert.strictEqual(r.map, 'bounty,medals,hearth', 'Sting, Kin and Lull cards each give their own perk'); assert.strictEqual(r.fallback, 'xp');
  assert.ok(r.tables && r.talk, 'every perk has bond numbers and chat lines');
  assert.strictEqual(r.bake, 'faster', 'Hearth makes bread bake 20% faster: ' + JSON.stringify(r.bake)); assert.ok(r.bounty && r.bountyOn && r.medalsOn);
  assert.strictEqual(r.cardBounty, '0,1', 'bond 2 adds a second Ember to every win: ' + r.cardBounty);
  assert.strictEqual(r.none, 0, 'a new companion remembers nothing yet'); assert.strictEqual(r.all, 5, '15 days (2), 13 wins (2) and 4 catches (1) earn five memories'); assert.strictEqual(r.last, 3);
  assert.ok(r.filled && /14 days|15 days/.test(r.text) && /13 wins/.test(r.text) && /4 fish|4 catches/.test(r.text), 'the latest memory of each count: ' + r.text); assert.ok(r.inTalk, 'memories join the chat');
  assert.strictEqual(r.early, 'false|', 'no gift before bond 2'); assert.ok(r.ready); assert.ok(r.gift, 'a gift pays Embers and no card when the roll is bad');
  assert.strictEqual(r.again, '|false', 'only one gift a day'); assert.ok(r.card, 'a lucky roll adds a common card, and bond 3 pays more');

  // the page: memories and the gift button
  await page.evaluate(() => { const c = state.companion; c.bond = BOND_AT[1]; c.wins = 5; delete state.progress.companionDay; state.progress.pebbles = 0; saveState(); switchTab('character'); charSetView('pals'); });
  await page.waitForTimeout(400);
  const hasPage = await page.evaluate(() => ({ mem: !!document.querySelector('#cpMem'), gift: !!document.querySelector('#cpGift') }));
  assert.ok(hasPage.mem, 'the page shows what they remember'); assert.ok(hasPage.gift, 'and offers the gift');
  await page.evaluate(() => { Math.random = () => 0.9; document.querySelector('#cpGift').click(); });
  await page.waitForTimeout(300);
  assert.strictEqual(await page.evaluate(() => !document.querySelector('#cpGift') && state.progress.pebbles >= 6), true, 'the gift is taken and the button goes');
};
