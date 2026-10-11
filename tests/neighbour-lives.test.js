// Neighbour lives: what they are doing on the talk screen, and Journal -> Neighbours.
module.exports = async (page, assert) => {
  const r = await page.evaluate(() => {
    const out = {};
    state.progress.friends = {}; state.progress.memory = {}; state.progress.npcBonds = {};
    out.emptyList = peopleList().length === 0;
    out.doing = npcDoingLine({ name: 'Wren', intent: 'off to sit for a while' }) === '💭 Wren is off to sit for a while.' && npcDoingLine({ name: 'X' }) === null;
    friendsState()['square:Wren'] = { name: 'Wren', district: 'square', points: 12, icon: '🙂', sigDay: null, sigWins: 0, gift: false };
    friendsState()['market:Sable'] = { name: 'Sable', district: 'market', points: 3, icon: '🧑', sigDay: null, sigWins: 0, gift: false };
    metStore().npcs['garden:Moss'] = { name: 'Moss', district: 'garden', icon: '🌿' };
    npcMemBattle({ id: 'npc-square-1', name: 'Wren' }, true); npcMemBattle({ id: 'npc-square-1', name: 'Wren' }, true); npcMemBattle({ id: 'npc-square-1', name: 'Wren' }, false); npcMemNote({ id: 'npc-square-1', name: 'Wren' }, 'favour');
    npcBondAdd({ name: 'Wren' }, { name: 'Rowan' }, 4, Date.now()); npcBondAdd({ name: 'Wren' }, { name: 'Tansy' }, 7, Date.now());
    const list = peopleList();
    out.sorted = list.length === 3 && list[0].name === 'Wren' && list[0].hearts === 3 && list[1].name === 'Sable';
    out.closest = peopleClosest('Wren', 'square').name === 'Tansy' && peopleClosest('Moss', 'garden') === null;
    // live neighbours show what they are doing, but only in the district you are in
    state.currentDistrict = 'square'; const data = ensureDistrictData('square'); data.npcs.length = 0;
    data.npcs.push({ id: 'npc-square-1', name: 'Wren', x: 3, y: 3, intent: 'sitting' });
    out.live = peopleList().find(p => p.name === 'Wren').f !== null && peopleList().find(p => p.name === 'Sable').f === null;
    return out;
  });
  Object.keys(r).forEach(k => assert.ok(r[k], 'lives: ' + k));
  // the page itself
  await page.evaluate(() => { document.getElementById('testHideOverlays').remove(); switchTab && switchTab('journal'); });
  await page.evaluate(() => document.getElementById('segPeople').click());
  const html = await page.evaluate(() => document.getElementById('peopleList').innerHTML);
  assert.ok(/Wren/.test(html) && /Sable/.test(html) && /Moss/.test(html), 'everyone met is listed');
  assert.ok(/you lead 2-1/.test(html) && /helped 1×/.test(html), 'the score and help are shown: ' + html.replace(/<[^>]+>/g, ' ').slice(0, 300));
  assert.ok(/Closest to Tansy/.test(html), 'the closest friend is named');
  assert.ok(/Wren is sitting/.test(html), 'a neighbour in this district says what they are doing');
  assert.ok(/Mornings /.test(html) && /Plays /.test(html), 'their habits are described');
  assert.ok(await page.evaluate(() => !document.getElementById('peopleView').classList.contains('hidden')), 'the tab shows');
  // the empty state
  await page.evaluate(() => { state.progress.friends = {}; state.progress.memory = {}; metStore().npcs = {}; renderPeople(); });
  assert.ok(/Meet and chat with neighbours/.test(await page.evaluate(() => document.getElementById('peopleList').textContent)), 'an empty state explains itself');
  // the talk screen line
  await page.evaluate(() => { const n = ensureDistrictData('square').npcs[0]; n.intent = 'heading home'; openTalk(n); });
  assert.ok(/is heading home/.test(await page.evaluate(() => document.getElementById('talkDoing').textContent)), 'the talk screen says what they are doing');
};
