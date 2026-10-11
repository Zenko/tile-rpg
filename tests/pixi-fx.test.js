// The PixiJS effects batch (builds 211+): town fireflies / leaves / glints / bursts (js/town-fx.js), the card reveal burst (js/reveal-fx.js),
// the holo foil shader (js/holo-gl.js) and the home room light (js/home-gl.js). Skips itself when there is no WebGL.
module.exports = async (page, assert) => {
  await page.waitForFunction(() => typeof tglState !== 'undefined' && tglState !== 'init', null, { timeout: 30000 });
  if (await page.evaluate(() => tglState === 'off')) { console.log('      (no WebGL here: pixi fx test skipped)'); return; }
  await page.waitForFunction(() => tglOn(), null, { timeout: 15000 });
  const until = (fn, arg, ms) => page.waitForFunction(fn, arg, { timeout: ms || 10000 });

  // 1. town: at night fireflies appear in the Pixi layer and the old DOM motes step aside; a burst and a step add particles that expire
  await page.evaluate(() => { prefs.charFx = true; switchTab('town'); townView.dataset.wx = 'clear'; townView.classList.add('is-night'); tfxKick(); });
  await until(() => !!tfx && tfx.flies.some(f => f.s.visible && f.fade > 0.1), null, 8000);
  const a = await page.evaluate(() => ({ on: townView.classList.contains('tfx-on'), motes: getComputedStyle(townView.querySelector('.pfx-motes') || document.body).display, layer: tgl.world.children.includes(tfx.layer) }));
  assert.ok(a.on && a.layer, 'the effects layer should be inside the Pixi world: ' + JSON.stringify(a));
  assert.strictEqual(a.motes, 'none', 'the DOM motes should hide while the Pixi ones draw');
  const b = await page.evaluate(() => { const n0 = tfx.sys.parts.length; const ok = tfxBurst('mythic'); const n1 = tfx.sys.parts.length; tfxStep({ x: state.playerPos.x, y: state.playerPos.y }); return { ok, n0, n1, n2: tfx.sys.parts.length }; });
  assert.ok(b.ok && b.n1 > b.n0 + 10 && b.n2 > b.n1, 'a burst and a step should add particles: ' + JSON.stringify(b));
  await until(() => tfx.sys.parts.length < 25, null, 8000);   // sparkles and motes die; only the ambient embers/glints may remain
  // by day with no lamps and no leaves wanted (winter) nothing keeps the loop alive; reduced motion turns the layer off
  await page.evaluate(() => { townView.classList.remove('is-night'); townView.dataset.season = 'winter'; });
  assert.ok(await page.evaluate(() => tfxReady()), 'the layer should be ready by day');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const c = await page.evaluate(() => ({ ready: tfxReady(), burst: tfxBurst('rare') }));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  assert.ok(!c.ready && c.burst === false, 'reduced motion must draw nothing: ' + JSON.stringify(c));
  await page.evaluate(() => { townView.dataset.season = 'summer'; });

  // 2. battle: a hit also flashes the card (a stretched rect particle) - covered with the battle test's overlay canvas
  await page.evaluate(() => { CARD_POOL.slice(0, 14).forEach(c => state.ownedCards.push(c.id)); state.deck = CARD_POOL.slice(0, 12).map(c => c.id); saveState(); prefs.tossStyle = 'skip'; prefs.fast = true; startBattle(state.districtData.square.npcs[0]); });
  await until(() => typeof inBattle !== 'undefined' && inBattle && !!document.querySelector('#battleView .card'));
  await until(() => !!bfx || bfxFailed);
  if (await page.evaluate(() => !!bfx)) {
    const f = await page.evaluate(() => { const card = document.querySelector('#battleView .card'); btImpact(card, 3); const flash = bfx.parts.filter(p => p.w > 0).length; btImpact(card, 6); return { flash, after: bfx.parts.filter(p => p.w > 0).length }; });
    assert.strictEqual(f.flash, 1, 'a normal hit should flash the card once: ' + JSON.stringify(f));
    assert.strictEqual(f.after, 1, 'a knockout dissolves instead of flashing');
  }
  await page.evaluate(() => { closeBattle && closeBattle(); });

  // 3 + 4. the reveal: the burst canvas is made on the first rare reveal, the next one fills it; the foil shader sits in the face and paints
  await page.evaluate(() => { const st = document.getElementById('testHideOverlays'); if (st) st.remove(); });
  await page.evaluate(() => { showCardReveal('mossy-titan', 'Found', false, ''); });
  await until(() => !!rvfx && !!hgl, null, 15000);
  await page.evaluate(() => { showCardReveal('mossy-titan', 'Found', false, '', 0, { flip: true, isNew: true }); document.getElementById('pickupCardFace').parentElement.click(); });
  await until(() => rvfx.sys.parts.length > 20, null, 5000);
  const d = await page.evaluate(() => { const cv = document.getElementById('rvfxCanvas'); return { shown: cv.style.display, z: getComputedStyle(cv).zIndex }; });
  assert.strictEqual(d.shown, '', 'the burst canvas should be showing');
  await until(() => rvfx.sys.parts.length === 0 && document.getElementById('rvfxCanvas').style.display === 'none', null, 10000);
  await page.waitForTimeout(300);
  const h = await page.evaluate(() => {
    const f = document.getElementById('pickupCardFace'), cv = hgl.app.canvas;
    hgl.app.render(); const ex = hgl.app.renderer.extract.pixels(hgl.app.stage), px = ex.pixels || ex; let lit = 0; for (let i = 3; i < px.length; i += 4) if (px[i] > 8) lit++;
    return { inFace: cv.parentNode === f, cls: f.classList.contains('holo-gl'), foilDisplay: getComputedStyle(f.querySelector('.holo-foil')).display, lit, total: px.length / 4 };
  });
  assert.ok(h.inFace && h.cls && h.foilDisplay === 'none', 'the shader canvas should be in the face and the CSS foil hidden: ' + JSON.stringify(h));
  assert.ok(h.lit > h.total * 0.1, 'the shader should paint foil over the card: ' + JSON.stringify(h));
  // a common card afterwards loses the shader
  await page.evaluate(() => showCardReveal('toadstool', 'Found', false, ''));
  const e = await page.evaluate(() => { const f = document.getElementById('pickupCardFace'); return { inFace: hgl.app.canvas.parentNode === f, cls: f.classList.contains('holo-gl') }; });
  assert.ok(!e.inFace && !e.cls, 'a common card must not keep the foil shader: ' + JSON.stringify(e));
  await page.evaluate(() => { pickupOverlay.classList.add('hidden'); });

  // 5. home: the light layer sits in the scrolling room, hides the plain glows, and stops when you leave
  await page.evaluate(() => { const st = document.createElement('style'); st.id = 'testHideOverlays'; st.textContent = '.overlay{display:none!important}'; document.head.appendChild(st); switchTab('town'); openScene('home'); });
  await until(() => !!document.querySelector('.hr-room .hr-world'));
  await until(() => !!hmg && hmg.items.length >= 1 && !!document.querySelector('.hr-world.hmg-on .hmg-canvas'), null, 15000);
  const g = await page.evaluate(() => ({ glowDisplay: document.querySelector('.hr-glow') ? getComputedStyle(document.querySelector('.hr-glow')).display : 'none', items: hmg.items.length, raf: !!hmgRaf, size: [hmg.app.canvas.width > 0, hmg.w === Math.round(homeRoom.cols * homeRoom.t)] }));
  assert.strictEqual(g.glowDisplay, 'none', 'the plain glow divs should step aside: ' + JSON.stringify(g));
  assert.ok(g.items >= 1 && g.raf && g.size[0] && g.size[1], 'the light layer should be drawing at the room size: ' + JSON.stringify(g));
  await page.evaluate(() => { const h = homeRoom; h.edit = null; hrHome().items.push({ uid: 'tfx-t', id: 'fireplace', x: 2, y: 1 }); hrRefresh(); });
  await until(() => hmg.items.some(it => it.g.id === 'fireplace'), null, 5000);
  await page.evaluate(() => { hrHome().items = hrHome().items.filter(i => i.uid !== 'tfx-t'); });
  await page.evaluate(() => closeScene());
  await until(() => !hmgRaf && !document.querySelector('.hmg-canvas'), null, 5000);
};
