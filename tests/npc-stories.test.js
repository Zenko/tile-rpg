// Neighbour stories: carry a message between neighbours; they reply and grow closer.
module.exports = async (page, assert) => {
  const r = await page.evaluate(() => {
    const out = {}, m = getMap('square'), data = ensureDistrictData('square');
    data.npcs.length = 0; data.boss = null; data.items = []; data.spirits = [];
    state.progress.requests = null; state.progress.npcBonds = {};
    const a = { id: 'npc-square-0', name: 'Giver', x: 5, y: 8, icon: '🙂' }, b = { id: 'npc-square-1', name: 'Target', x: 9, y: 8, icon: '🙂' }, c = { id: 'npc-square-2', name: 'Bystander', x: 3, y: 8, icon: '🙂' };
    data.npcs.push(a, b, c);
    state.currentDistrict = 'square';
    out.kinds = npcStoryKinds(a, m).includes('message');
    out.noneAlone = (() => { data.npcs.splice(1); const k = npcStoryKinds(a, m); data.npcs.push(b, c); return k.length === 0; })();
    // makeRequest sometimes offers it
    let seen = 0; for (let i = 0; i < 400; i++) { if (makeRequest(a, m).kind === 'message') seen++; }
    out.offered = seen > 10;
    // a message request
    const req = npcStoryRequest({ id: a.id, giver: a.name, kind: 'message', state: 'active', made: Date.now() }, a, m);
    out.shape = req.target !== a.id && !!req.targetName && /pass a message to/.test(req.text) && req.pebbles === STORY_PEBBLES && req.delivered === false;
    req.target = b.id; req.targetName = b.name;
    reqState().list[a.id] = req;
    out.notDone = requestDone(req) === false && /Find Target/.test(requestProgressText(req));
    // talking to someone else does not deliver; the target does
    out.wrong = npcStoryTalked(c) === false && !req.delivered;
    const before = npcBond(a, b);
    out.deliver = npcStoryTalked(b) === true && req.delivered === true && requestDone(req) === true;
    out.bond = npcBond(a, b) === before + 2;
    out.reply = /Giver sent that\?/.test(req.replyText || '');
    out.targetGreets = /Giver just sent me a message/.test(npcGreeting(b, 'FALLBACK'));
    out.once = npcStoryTalked(b) === false;                              // delivered once only
    out.progress = /You told Target/.test(requestProgressText(req));
    // handing it in pays out like any favour
    // only what the favour itself paid counts: on a Double XP day the favour can also level you up, and a level pays Embers of its own
    let paid = 0; const realAdd = addPebbles; addPebbles = (n, src) => { if (src === 'favours') paid += n; return realAdd(n, src); };
    completeRequest(a); addPebbles = realAdd;
    out.paid = req.state === "done" && paid === STORY_PEBBLES;
    // a target who has gone: the hint says so and it still resolves
    const req2 = npcStoryRequest({ id: a.id, giver: a.name, kind: 'message', state: 'active', made: Date.now() }, a, m); req2.target = 'npc-square-99'; req2.targetName = 'Ghosty';
    out.gone = /wandered off/.test(requestProgressText(req2));
    return out;
  });
  Object.keys(r).forEach(k => assert.ok(r[k], 'stories: ' + k));
};
