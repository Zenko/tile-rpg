// Full art (js/full-art.js): mythic, divine and Atlas cards with files show a full bleed face in the reveal popup, and step up to the middle when they attack.
module.exports = async (page, assert) => {
  // eligibility: only the rarest rarities, and only cards that are listed
  const el = await page.evaluate(() => ({
    mythic: hasFullArt(cardDef('mossy-titan')), god: hasFullArt(cardDef('ensueno')), crafted: hasFullArt(cardDef('mossy-titan~p.guard') || cardDef('mossy-titan')),
    common: hasFullArt(cardDef('toadstool')), none: hasFullArt(null),
    listed: FULL_ART.length, wrongRarity: FULL_ART.filter(id => { const d = cardDef(id); return !d || !FULL_ART_RARITIES.includes(d.rarity); }),
  }));
  assert.ok(el.mythic && el.god, 'a listed mythic and a listed god should have full art');
  assert.ok(!el.common && !el.none, 'a common card or nothing must not have full art');
  assert.deepStrictEqual(el.wrongRarity, [], 'FULL_ART holds a card that is not mythic, divine or atlas');
  assert.ok(el.listed >= 20, 'expected every mythic plus the gods to be listed');

  // every listed card has both files, and they load as pictures
  const missing = await page.evaluate(() => Promise.all(FULL_ART.flatMap(id => ['scene', 'hero'].map(k => new Promise(res => {
    const im = new Image(); im.onload = () => res(im.naturalWidth > 0 ? null : id + '-' + k); im.onerror = () => res(id + '-' + k); im.src = `assets/cards/full/${id}-${k}.${FULL_ART_EXT}`;
  })))).then(r => r.filter(Boolean)));
  assert.deepStrictEqual(missing, [], 'full art files missing or broken: ' + missing.join(', '));

  // the reveal popup: a mythic card gets the full bleed face, a common card does not, and the popup resets between the two
  await page.evaluate(() => showCardReveal('mossy-titan', 'Card Details', false, ''));
  const rv = await page.evaluate(() => { const f = document.getElementById('pickupCardFace'); return { fa: f.classList.contains('fa'), frame: f.parentElement.classList.contains('has-fa'), scene: !!f.querySelector('.fa-scene img'), hero: (f.querySelector('.fa-hero img') || {}).src || '', paper: !!f.querySelector('.paper .nm'), badges: f.querySelectorAll('.kws span').length }; });
  assert.ok(rv.fa && rv.frame && rv.scene && /mossy-titan-hero\.svg$/.test(rv.hero), 'the mythic reveal should be full art: ' + JSON.stringify(rv));
  assert.ok(rv.paper && rv.badges === 2, 'the full art face keeps its name panel and keyword badges');
  await page.evaluate(() => showCardReveal('toadstool', 'Card Details', false, ''));
  const plain = await page.evaluate(() => { const f = document.getElementById('pickupCardFace'); return { fa: f.classList.contains('fa'), frame: f.parentElement.classList.contains('has-fa'), scene: !!f.querySelector('.fa-scene') }; });
  assert.ok(!plain.fa && !plain.frame && !plain.scene, 'a common card must show its normal face: ' + JSON.stringify(plain));

  // the attack preview in battle
  await page.evaluate(() => { CARD_POOL.slice(0, 14).forEach(c => state.ownedCards.push(c.id)); state.deck = CARD_POOL.slice(0, 12).map(c => c.id); saveState(); prefs.tossStyle = 'skip'; prefs.fast = true; startBattle(state.districtData.square.npcs[0]); });
  await page.waitForFunction(() => typeof battle !== 'undefined' && battle && battle.G, null, { timeout: 8000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const G = battle.G, pl = G.p[0], c = pl.hand.find(x => !x.spell) || pl.hand[0]; pl.hand.splice(pl.hand.indexOf(c), 1); c.ready = true; pl.board.push(c);
    window.__atk = c; window.__runAttack = id => { c.id = id; btRender(); return btAnimate([{ type: 'attack', who: 0, attacker: c, target: { kind: 'spirit' }, dmg: 1 }], battle.token); };
    btRender();
  });
  await page.waitForTimeout(300);
  const preview = () => page.evaluate(() => { const s = document.querySelector('#battleView .atk-preview'), src = document.querySelector(`#battleView .card[data-uid="${window.__atk.uid}"]`); return { on: !!s, fa: !!(s && s.querySelector('.ap-card.fa .fa-hero img')), up: !!(s && s.classList.contains('up')), lifted: !!src && src.style.visibility === 'hidden' }; });

  // Fast battles skips it, and so does a card without full art
  await page.evaluate(() => { window.__p = __runAttack('mossy-titan'); });
  await page.waitForTimeout(80);
  assert.ok(!(await preview()).on, 'Fast battles should skip the preview');
  await page.evaluate(() => window.__p);
  await page.evaluate(() => { prefs.fast = false; });
  await page.evaluate(() => { window.__p = __runAttack('toadstool'); });
  await page.waitForTimeout(150);
  assert.ok(!(await preview()).on, 'a card without full art should not get a preview');
  await page.evaluate(() => window.__p);

  // a full art attacker: the preview appears, lifts the board card off, and tidies up completely when it is done
  await page.evaluate(() => { window.__p = __runAttack('mossy-titan'); });
  await page.waitForTimeout(150);
  const during = await preview();
  assert.ok(during.on && during.fa && during.up && during.lifted, 'the preview should show the full art card and lift the attacker: ' + JSON.stringify(during));
  await page.evaluate(() => window.__p);
  const after = await preview();
  assert.ok(!after.on && !after.lifted, 'the preview should clean up after itself: ' + JSON.stringify(after));

  // a tap skips it right away
  await page.evaluate(() => { window.__p = __runAttack('mossy-titan'); });
  await page.waitForTimeout(150);
  await page.evaluate(() => document.querySelector('#battleView .atk-preview').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
  const skipped = await preview();
  assert.ok(!skipped.on && !skipped.lifted, 'a tap should skip the preview: ' + JSON.stringify(skipped));
  await page.evaluate(() => window.__p);
};
