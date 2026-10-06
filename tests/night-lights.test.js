// Night lights (js/night-lights.js): by day the light canvas is empty; at night lit lamps, windows and the player cut holes in the darkness.
module.exports = async (page, assert) => {
  const r = await page.evaluate(() => {
    const px = (x, y) => nlCanvas.getContext('2d').getImageData(x, y, 1, 1).data[3];
    const out = { mounted: !!nlCanvas && !!document.querySelector('.town-sky.has-lights > canvas.town-lights') };
    state.weather.current = 'clear'; state.sky.elapsedMs = DAY_LEN_MS * 0.5;                                   // noon
    applySky(true); renderTown(); out.dayLamps = nlLamps.length; out.dayAlpha = (() => { const d = nlCanvas.getContext('2d').getImageData(0, 0, nlCanvas.width, nlCanvas.height).data; let m = 0; for (let i = 3; i < d.length; i += 4) m = Math.max(m, d[i]); return m; })();
    for (let t = 0; t < DAY_LEN_MS; t += DAY_LEN_MS / 96) { state.sky.elapsedMs = t; const s = skyPhase(); if (s.isNight && s.dim >= 0.5) break; }
    const l = lifeState(), m = getMap(state.currentDistrict), lamps = m.props.filter(p => p.type === 'lamp'); lamps.forEach(p => { l.lit[state.currentDistrict + ':' + p.id] = true; });
    applySky(true); renderTown();
    out.nightLamps = nlLamps.length; out.expected = lamps.length;
    const cam = nlLast, tp = tilePx * 0.5;
    out.dark = (() => { const d = nlCanvas.getContext('2d').getImageData(0, 0, nlCanvas.width, nlCanvas.height).data; let m = 0; for (let i = 3; i < d.length; i += 4) m = Math.max(m, d[i]); return m; })();   // somewhere is fully covered
    const lp = lamps[0]; out.atLamp = lp ? px(Math.round((lp.x + 0.5) * tp + cam.cx * 0.5), Math.round((lp.y + 0.3) * tp + cam.cy * 0.5)) : null;
    return out;
  });
  assert.ok(r.mounted, 'the light canvas should live inside .town-sky: ' + JSON.stringify(r));
  assert.strictEqual(r.dayLamps, 0, 'no lamp is lit by day');
  assert.strictEqual(r.dayAlpha, 0, 'by day the light canvas must paint nothing: ' + JSON.stringify(r));
  assert.strictEqual(r.nightLamps, r.expected, 'every lit lamp should be a light: ' + JSON.stringify(r));
  if (r.expected) assert.ok(r.dark > 240 && r.atLamp < 100, 'night is dark somewhere and cut open at a lit lamp: ' + JSON.stringify(r));
};
