// Full art (js/full-art.js): every card is a full bleed card, kept inside the card; mythic, divine and Atlas cards with drawn files also step up to the middle when they attack.
module.exports = async (page, assert) => {
  // eligibility: every card is full art; only the listed rarest cards have drawn files (and the attack preview)
  const el = await page.evaluate(() => ({
    mythic: hasFullArt(cardDef('mossy-titan')), god: hasFullArt(cardDef('ensueno')), crafted: hasFullArt(cardDef('mossy-titan~p.guard') || cardDef('mossy-titan')),
    common: hasFullArt(cardDef('toadstool')), drawnCommon: hasDrawnArt(cardDef('toadstool')), drawnMythic: hasDrawnArt(cardDef('mossy-titan')), none: hasFullArt(null),
    listed: FULL_ART.length, wrongRarity: FULL_ART.filter(id => { const d = cardDef(id); return !d || !FULL_ART_RARITIES.includes(d.rarity); }),
  }));
  assert.ok(el.mythic && el.god, 'a listed mythic and a listed god should have full art');
  assert.ok(el.common && !el.none, 'every card has full art, nothing has none');
  assert.ok(el.drawnMythic && !el.drawnCommon, 'only a listed card has drawn files');
  assert.deepStrictEqual(el.wrongRarity, [], 'FULL_ART holds a card that is not mythic, divine or atlas');
  assert.ok(el.listed >= 20, 'expected every mythic plus the gods to be listed');

  // every listed card has both files, and they load as pictures
  const missing = await page.evaluate(() => Promise.all(FULL_ART.flatMap(id => ['scene', 'hero'].map(k => new Promise(res => {
    const im = new Image(); im.onload = () => res(im.naturalWidth > 0 ? null : id + '-' + k); im.onerror = () => res(id + '-' + k); im.src = `assets/cards/full/${id}-${k}.${FULL_ART_EXT}`;
  })))).then(r => r.filter(Boolean)));
  assert.deepStrictEqual(missing, [], 'full art files missing or broken: ' + missing.join(', '));

  // the reveal popup: a mythic card gets its drawn face, a common card the auto one (its own picture on a CSS scene), and the popup resets between the two
  await page.evaluate(() => showCardReveal('mossy-titan', 'Card Details', false, ''));
  const rv = await page.evaluate(() => { const f = document.getElementById('pickupCardFace'); return { fa: f.classList.contains('fa'), frame: f.parentElement.classList.contains('has-fa'), scene: !!f.querySelector('.fa-scene img'), hero: (f.querySelector('.fa-hero img') || {}).src || '', paper: !!f.querySelector('.paper .nm'), badges: f.querySelectorAll('.kws span').length }; });
  assert.ok(rv.fa && rv.frame && rv.scene && /mossy-titan-hero\.svg$/.test(rv.hero), 'the mythic reveal should be full art: ' + JSON.stringify(rv));
  assert.ok(rv.paper && rv.badges === 2, 'the full art face keeps its name panel and keyword badges');
  await page.evaluate(() => showCardReveal('toadstool', 'Card Details', false, ''));
  const plain = await page.evaluate(() => { const f = document.getElementById('pickupCardFace'); return { fa: f.classList.contains('fa'), frame: f.parentElement.classList.contains('has-fa'), scene: !!f.querySelector('.fa-scene'), auto: !!f.querySelector('.fa-auto-scene'), hero: (f.querySelector('.fa-hero img') || {}).src || '' }; });
  assert.ok(plain.fa && plain.frame && plain.scene && plain.auto && /toadstool\.png$/.test(plain.hero), 'a common card shows its own picture full bleed: ' + JSON.stringify(plain));
  // contained: the picture and the scene stay inside the card's edge
  const box = await page.evaluate(() => { const f = document.getElementById('pickupCardFace').getBoundingClientRect(), h = document.querySelector('#pickupCardFace .fa-hero').getBoundingClientRect(), s = document.querySelector('#pickupCardFace .fa-scene').getBoundingClientRect(); const inside = r => r.left >= f.left - 0.5 && r.right <= f.right + 0.5 && r.top >= f.top - 0.5 && r.bottom <= f.bottom + 0.5; return { hero: inside(h), scene: inside(s), fillsW: s.width >= f.width - 1 }; });
  assert.ok(box.hero && box.scene && box.fillsW, 'the art must stay inside the card: ' + JSON.stringify(box));

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
  assert.ok(!(await preview()).on, 'a card without drawn art should not get a preview');
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
