// Ground cards (build 262): spread at least ITEM_MIN_GAP apart, back after 60-100 s (not in lockstep), mostly commons, often the same card again.
module.exports = async (page, assert) => {
  const r = await page.evaluate(() => {
    const out = { gaps: [], rare: 0, total: 0, same: 0, delays: [] };
    for (let t = 0; t < 30; t++) {
      delete state.districtData.square; const d = ensureDistrictData('square'), its = d.items;
      for (let i = 0; i < its.length; i++) for (let j = i + 1; j < its.length; j++) out.gaps.push(Math.abs(its[i].x - its[j].x) + Math.abs(its[i].y - its[j].y));
    }
    const d = ensureDistrictData('square');
    for (let n = 0; n < 600; n++) {
      const it = d.items[n % 3], prev = it.cardId; it.collected = true; it.collectedAt = Date.now() - 200000; tickItems(d);
      out.total++; if (cardDef(it.cardId).rarity !== 'common') out.rare++; if (it.cardId === prev) out.same++;
      d.items.filter(o => o !== it && !o.collected).forEach(o => out.gaps.push(Math.abs(o.x - it.x) + Math.abs(o.y - it.y)));
    }
    const it = d.items[0];
    for (let k = 0; k < 200; k++) { it.collected = true; it.collectedAt = 1e12 + k * 777; let ms = 0; while (!itemRespawnDue(it, it.collectedAt + ms)) ms += 1000; out.delays.push(ms); }
    delete state.districtData.square; ensureDistrictData('square');
    return { minGap: Math.min(...out.gaps), rare: out.rare / out.total, same: out.same / out.total, dmin: Math.min(...out.delays), dmax: Math.max(...out.delays), distinct: new Set(out.delays).size, gapRule: ITEM_MIN_GAP };
  });
  assert.ok(r.minGap >= r.gapRule, `cards keep ${r.gapRule}+ steps apart (closest ${r.minGap})`);
  assert.ok(r.rare < 0.1, 'mostly commons: ' + r.rare);
  assert.ok(r.same > 0.25, 'often the same card again: ' + r.same);
  assert.ok(r.dmin >= 60000 && r.dmax <= 100000 && r.distinct > 10, `back after 60-100 s, not in lockstep (${r.dmin}-${r.dmax})`);
};
