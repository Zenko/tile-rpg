// Character effects (js/player-fx.js): shadow and light follow the sky, weather layers, footsteps, auras, hop, dissolve, and the Settings switch.
module.exports = async (page, assert) => {
  await page.evaluate(() => {
    const d = ensureDistrictData('square'); d.npcs.length = 0; d.boss = null; d.items = []; d.chest = null; d.spirits = [];
    state.currentDistrict = 'square'; state.playerPos = Object.assign({}, getMap('square').spawn); plFace = 'down'; prefs.charFx = true;
    const st = document.createElement('style'); st.textContent = '.pl-wet, .pl-frost, .pl-tint, .pl-shd { transition: none !important; }'; document.head.appendChild(st);
    renderTown(); switchTab('town');
  });
  const tintNow = () => page.evaluate(() => townView.style.getPropertyValue('--pl-tint'));
  const atPhase = p => page.evaluate(p => { state.sky.elapsedMs = p * DAY_LEN_MS; pfxLast = ''; pfxSync(); applySky(true); }, p);

  await atPhase(0.5); const noon = await tintNow();
  await atPhase(0.0); const night = await tintNow();
  assert.ok(/rgba\(0,0,0,0\)/.test(noon) && !/rgba\(0,0,0,0\)/.test(night), 'the light tint is clear at noon and cool at night: ' + noon + ' / ' + night);
  assert.strictEqual(await page.evaluate(() => playerEl.querySelectorAll('.pl-shd').length), 0, 'there is no cast shadow, only the round one under her feet');
  assert.ok(await page.evaluate(() => /ellipse|circle|radial/.test(getComputedStyle(playerEl, '::before').background) || getComputedStyle(playerEl, '::before').borderRadius === '50%'), 'the round shadow under her feet is still there');

  // weather layers
  const op = sel => page.evaluate(sel => getComputedStyle(playerEl.querySelector('.pl-view[data-v="down"] ' + sel)).opacity, sel);
  await page.evaluate(() => { townView.dataset.wx = 'clear'; }); assert.strictEqual(await op('.pl-wet'), '0'); assert.strictEqual(await op('.pl-frost'), '0');
  await page.evaluate(() => { townView.dataset.wx = 'rain'; }); assert.ok(+await op('.pl-wet') > 0.5, 'wet shine in the rain'); assert.strictEqual(await op('.pl-frost'), '0');
  await page.evaluate(() => { townView.dataset.wx = 'snow'; }); assert.strictEqual(await op('.pl-wet'), '0'); assert.strictEqual(await op('.pl-frost'), '1');
  await page.evaluate(() => { townView.dataset.wx = 'clear'; });

  // footsteps: petals on grass, dust on the path
  const bits = await page.evaluate(() => { const m = getMap('square'); const out = {}; [['.', 'grass'], ['=', 'path'], ['#', 'cobble']].forEach(([ch, k]) => { townWorld.querySelectorAll('.pfx').forEach(e => e.remove()); let spot = null; m.rows.forEach((r, y) => { const x = r.indexOf(ch); if (!spot && x >= 0) spot = { x, y }; }); if (spot) { for (let i = 0; i < 6; i++) pfxStep(spot); out[k] = [...townWorld.querySelectorAll('.pfx')].map(e => e.className.replace('pfx ', '')); } }); return out; });
  assert.ok(bits.grass.some(c => c === 'pfx-petal'), 'petals on grass: ' + JSON.stringify(bits));
  assert.ok(bits.path.every(c => c === 'pfx-dust') && bits.path.length, 'dust on the path');
  assert.ok(bits.cobble.some(c => c === 'pfx-dust'), 'a puff on cobble');

  // auras, in priority order
  const aura = () => page.evaluate(() => { positionPlayer(false); return [playerEl.dataset.aura || '', !!playerEl.querySelector('.pl-aura')]; });
  assert.deepStrictEqual(await aura(), ['', false], 'no aura by default');
  await page.evaluate(() => { state.progress.calm = { square: todayKey() }; }); assert.strictEqual((await aura())[0], 'calm');
  await page.evaluate(() => { state.companion = { name: 'Pip', icon: '🐰', bond: 99 }; }); assert.strictEqual((await aura())[0], 'bond');
  await page.evaluate(() => { state.progress.record = Object.assign({ won: 0, lost: 0, best: 0 }, state.progress.record, { streak: 3 }); }); assert.strictEqual((await aura())[0], 'streak');
  const glow = () => page.evaluate(() => getComputedStyle(playerEl.querySelector('.pl-aura'), '::before').display);
  await atPhase(0.5); assert.strictEqual(await glow(), 'none', 'the aura has no soft glow by day (only its little hearts, flames or rings)');
  await atPhase(0.0); assert.strictEqual(await glow(), 'block', 'but it glows at night');
  await page.evaluate(() => { state.companion = null; state.progress.calm = {}; state.progress.record.streak = 0; });

  // emote and dissolve
  await page.evaluate(() => { pfxLoot = { html: '<span class="card-emoji">X</span>', r: 'mythic' }; pfxEmote(); });
  assert.ok(await page.evaluate(() => !!playerEl.querySelector('.pl-bubble .card-emoji')), 'a bubble shows the item she got');
  await page.waitForTimeout(2000);
  assert.ok(!(await page.evaluate(() => !!playerEl.querySelector('.pl-bubble'))), 'and it goes away');
  const gone = await page.evaluate(() => new Promise(res => { const took = pfxEnter(() => res(playerEl.querySelector('.pl-sprite').classList.contains('pl-gone'))); if (!took) res('not taken'); }));
  assert.strictEqual(gone, true, 'she has burned away when the door opens');
  await page.evaluate(() => { pfxReform(); }); await page.waitForTimeout(1100);
  assert.ok(!(await page.evaluate(() => playerEl.querySelector('.pl-sprite').classList.contains('pl-gone'))), 'and re-forms on the way out');

  // the Settings switch
  await page.evaluate(() => { prefs.charFx = false; pfxSync(); positionPlayer(false); });
  assert.ok(await page.evaluate(() => document.body.classList.contains('no-charfx')), 'switched off');
  assert.strictEqual(await page.evaluate(() => { townWorld.querySelectorAll('.pfx').forEach(e => e.remove()); pfxEmote(); pfxPlayer({ x: 3, y: 3 }, { x: 4, y: 3 }, true); return townWorld.querySelectorAll('.pfx').length + playerEl.querySelectorAll('.pl-bubble').length; }), 0, 'nothing is added while it is off');
  await page.evaluate(() => { prefs.charFx = true; document.body.classList.remove('no-charfx'); });
};
