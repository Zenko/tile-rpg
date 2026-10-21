// A beaten neighbour leaves only a grave: the drawn-character try-out (npcDrawnId, js/player-sprite.js) must not hop to the next
// neighbour when the one it was on is buried, or that neighbour looks like the defeated one standing beside the grave.
module.exports = async (page, assert) => {
  const ev = (fn, arg) => page.evaluate(fn, arg);
  await ev(() => { const h = document.getElementById('testHideOverlays'); if (h) h.remove(); switchTab('town'); });
  const r = await ev(() => {
    state.currentDistrict = 'square'; renderTown();
    const data = ensureDistrictData('square'), plain = data.npcs.filter(n => !n.isRival && !n.isAtlas && !n.isVisitor);
    const drawn = () => [...document.querySelectorAll('.ent.npc .pl-sprite')].length;
    const before = drawn();
    buryFighter(plain[0]);
    document.querySelectorAll('.ent.npc').forEach(e => e.remove()); entityElsById.clear();   // as after a reload: every neighbour is drawn afresh
    renderTown();
    return { sprite: playerSpriteReady(), before, after: drawn(), grave: !!document.querySelector('.ent.grave') };
  });
  assert.ok(r.sprite && r.before === 1, 'the try-out draws one neighbour to begin with: ' + JSON.stringify(r));
  assert.ok(r.grave, 'the beaten neighbour leaves a grave');
  assert.strictEqual(r.after, 0, 'no drawn sprite stands beside the grave once its neighbour is buried: ' + JSON.stringify(r));
};
