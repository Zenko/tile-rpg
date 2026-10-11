// Neighbour memory: they keep score with you, say so, practise after losing, and the list stays small.
module.exports = async (page, assert) => {
  const r = await page.evaluate(() => {
    const out = {}, f = { id: 'npc-square-3', name: 'Mnemo', x: 3, y: 3 }, t0 = 1700000000000;
    state.progress.memory = {};
    out.empty = npcMemGreeting(f, t0) === null && /only just met/.test(npcMemSummary(f));
    // a win, then a greeting soon after
    npcMemBattle(f, true, t0);
    out.justWon = /gave me quite a game/.test(npcMemGreeting(f, t0 + 60000));
    out.lateGone = npcMemGreeting(f, t0 + NPC_MEM.recentMs + 120000) === null;      // later it is no longer "just now"
    npcMemBattle(f, false, t0 + 1000);
    out.justLost = /Good match earlier/.test(npcMemGreeting(f, t0 + 2000));
    // the score and the streak
    npcMemBattle(f, true, t0 + 2000); npcMemBattle(f, true, t0 + 3000);
    const m = npcMemOf(f, false); out.score = m.won === 3 && m.lost === 1 && m.streak === 2;
    out.practising = npcMemPractising(f) === true;
    npcMemBattle(f, true, t0 + 4000); out.streak3 = /3 times running/.test(npcMemGreeting(f, t0 + NPC_MEM.recentMs * 3));
    npcMemBattle(f, false, t0 + 5000); out.reset = npcMemOf(f, false).streak === -1 && !npcMemPractising(f);
    // events from friendship
    npcMemNote(f, 'favour'); npcMemNote(f, 'favour'); npcMemNote(f, 'bread'); npcMemNote(f, 'chat');
    const m2 = npcMemOf(f, false); out.events = m2.helped === 2 && m2.gifts === 1 && m2.chats === 1;
    // addFriendship feeds memory, but never for bosses or the rival
    const g = { id: 'npc-square-4', name: 'Other', x: 1, y: 1 };
    addFriendship(g, 3, 'favour'); out.viaFriendship = npcMemOf(g, false) && npcMemOf(g, false).helped === 1;
    addFriendship({ id: 'boss-square', name: 'Big', isBoss: true }, 3, 'favour'); out.noBoss = !npcMemOf({ id: 'boss-square', name: 'Big', isBoss: true }, false);
    // being ignored, then answering
    npcMemNote(g, 'ignored'); npcMemNote(g, 'ignored'); out.ignored = npcMemOf(g, false).ignored === 2;
    npcMemNote(g, 'answered'); out.answered = npcMemOf(g, false).ignored === 0;
    // a long absence
    const h = { id: 'npc-square-5', name: 'Faraway', x: 1, y: 1 }; npcMemNote(h, 'chat', t0); out.absent = /been a while/.test(npcMemGreeting(h, t0 + NPC_MEM.longMs + 5000));
    // the summary
    out.summary = /played 6 matches, and you lead 4 to 2/.test(npcMemSummary(f)) && /helped me twice/.test(npcMemSummary(f));
    // greeting precedence: a fresh approach beats memory
    f.approach = { kind: 'match', at: Date.now() }; out.approachFirst = /friendly game/.test(npcGreeting(f, 'FALLBACK'));
    // the deck: a neighbour you have beaten twice running keeps an extra tough card
    npcMemBattle(h, true); npcMemBattle(h, true); out.plan = /practising/.test(npcDeckPlan(h, 3).note + ' ' + JSON.stringify(npcDeckPlan(h, 3).keep.length > 0));
    // the list is capped
    for (let i = 0; i < 90; i++) npcMemNote({ id: 'npc-square-' + (100 + i), name: 'N' + i, x: 0, y: 0 }, 'chat', t0 + i);
    out.capped = Object.keys(npcMemStore()).length <= NPC_MEM.max;
    return out;
  });
  Object.keys(r).forEach(k => assert.ok(r[k], 'memory: ' + k));
  // the Chat menu offers it once there is something to remember
  await page.evaluate(() => { document.getElementById('testHideOverlays').remove(); const n = state.districtData.square.npcs[0]; npcMemBattle(n, true); openTalk(n); });
  await page.evaluate(() => document.querySelector('#talkCats [data-go="chat"]').click());
  const has = await page.evaluate(() => [...document.querySelectorAll('#talkTopics button')].some(b => /What do you remember/.test(b.textContent)));
  assert.ok(has, 'the Chat menu offers "What do you remember?"');
};
