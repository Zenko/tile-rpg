// Character effects (js/player-fx.js): shadow and light follow the sky, weather layers, footsteps, auras, hop, dissolve, and the Settings switch.
module.exports = async (page, assert) => {
  await page.evaluate(() => {
    const d = ensureDistrictData('square'); d.npcs.length = 0; d.boss = null; d.items = []; d.chest = null; d.spirits = [];
    state.currentDistrict = 'square'; state.playerPos = Object.assign({}, getMap('square').spawn); plFace = 'down'; prefs.charFx = true;
    const st = document.createElement('style'); st.textContent = '.pl-wet, .pl-frost, .pl-tint, .pl-shd { transition: none !important; }'; document.head.appendChild(st);
    renderTown(); switchTab('town');
  });
  const vars = () => page.evaluate(() => ({ skew: townView.style.getPropertyValue('--sh-skew'), len: +townView.style.getPropertyValue('--sh-len'), a: +townView.style.getPropertyValue('--sh-a'), tint: townView.style.getPropertyValue('--pl-tint') }));
  const atPhase = p => page.evaluate(p => { state.sky.elapsedMs = p * DAY_LEN_MS; pfxLast = ''; pfxSync(); }, p);

  await atPhase(0.5); const noon = await vars();
  await atPhase(0.3); const morning = await vars();
  await atPhase(0.0); const night = await vars();
  assert.ok(noon.len < morning.len, 'the shadow is shortest at noon: ' + noon.len + ' vs ' + morning.len);
  assert.ok(noon.a > night.a, 'and strongest by day');
  assert.notStrictEqual(morning.skew, noon.skew, 'it swings with the sun');
  assert.ok(/rgba\(0,0,0,0\)/.test(noon.tint) && !/rgba\(0,0,0,0\)/.test(night.tint), 'the light tint is clear at noon and cool at night: ' + noon.tint + ' / ' + night.tint);

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
  await page.evaluate(() => { state.companion = null; state.progress.calm = {}; state.progress.record.streak = 0; });

  // hop and dissolve
  await page.evaluate(() => { pfxHop(); });
  assert.ok(await page.evaluate(() => playerEl.querySelector('.pl-sprite').classList.contains('hop')), 'the figure hops');
  await page.waitForTimeout(800);
  assert.ok(!(await page.evaluate(() => playerEl.querySelector('.pl-sprite').classList.contains('hop'))), 'and lands');
  const gone = await page.evaluate(() => new Promise(res => { const took = pfxEnter(() => res(playerEl.querySelector('.pl-sprite').classList.contains('pl-gone'))); if (!took) res('not taken'); }));
  assert.strictEqual(gone, true, 'she has burned away when the door opens');
  await page.evaluate(() => { pfxReform(); }); await page.waitForTimeout(1100);
  assert.ok(!(await page.evaluate(() => playerEl.querySelector('.pl-sprite').classList.contains('pl-gone'))), 'and re-forms on the way out');

  // the Settings switch
  await page.evaluate(() => { prefs.charFx = false; pfxSync(); positionPlayer(false); });
  assert.ok(await page.evaluate(() => document.body.classList.contains('no-charfx')), 'switched off');
  assert.strictEqual(await page.evaluate(() => { townWorld.querySelectorAll('.pfx').forEach(e => e.remove()); pfxHop(); pfxPlayer({ x: 3, y: 3 }, { x: 4, y: 3 }, true); return townWorld.querySelectorAll('.pfx').length + (playerEl.querySelector('.pl-sprite').classList.contains('hop') ? 1 : 0); }), 0, 'nothing is added while it is off');
  await page.evaluate(() => { prefs.charFx = true; document.body.classList.remove('no-charfx'); });
};
