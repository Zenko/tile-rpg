// NPC brain, stage 3: neighbours meet, build bonds, trade deck tips, and mention it when you talk to them.
module.exports = async (page, assert) => {
  const r = await page.evaluate(() => {
    WANDER.enabled = false;
    const out = {}, m = getMap('square'), data = ensureDistrictData('square');
    data.npcs.length = 0; data.boss = null; data.items = []; data.spirits = [];
    state.progress.bonds = {};
    const a = { id: 'npc-square-0', name: 'Aster', x: 5, y: 8, homeX: 5, homeY: 8, icon: '🙂' }, b = { id: 'npc-square-1', name: 'Briar', x: 6, y: 8, homeX: 6, homeY: 8, icon: '🙂' };
    data.npcs.push(a, b);
    const t0 = Date.now();
    // a chat builds a bond, remembers the topic, and both stand still for a while
    const c = npcMeet(a, b, t0, 'chat');
    out.chatKind = c.kind; out.bond1 = npcBond(a, b); out.same = npcBond(b, a) === npcBond(a, b);
    out.lastMeet = a.lastMeet.with === 'Briar' && b.lastMeet.with === 'Aster' && !!a.lastMeet.topic;
    out.dwell = a.mind.dwellUntil > t0 && b.mind.dwellUntil > t0;
    out.intent = /chatting with Briar/.test(a.intent);
    // the greeting mentions it while fresh, and falls back later
    out.greet = npcGreeting(a, 'FALLBACK').includes('Briar');
    a.lastMeet.at = Date.now() - NPC_MEET.fresh - 1000;
    { const g = npcGreeting(a, 'FALLBACK'); out.greetOld = (g === 'FALLBACK' || /^Hello there\. I like to spend/.test(g)) && !g.includes('Briar'); }   // the fallback, or a line about their routine
    // the cooldown stops a second meeting right away, then allows one
    let meetings = 0; const real = npcMeet; window.__count = 0;
    const origRandom = Math.random; Math.random = () => 0;     // always roll "yes"
    const before = npcBond(a, b); npcMeetTick(data, t0 + 1000); out.cooled = npcBond(a, b) === before;
    npcMeetTick(data, t0 + NPC_MEET.cooldownMs + 5000); out.after = npcBond(a, b) > before;
    Math.random = origRandom;
    // not adjacent: nothing happens
    b.x = 9; const bb = npcBond(a, b); npcMeetTick(data, t0 + 10 * NPC_MEET.cooldownMs); out.apart = npcBond(a, b) === bb; b.x = 6;
    // a tip: the learner keeps a card of the teacher's favourite family in their next deck
    npcBondAdd(a, b, 6, t0);
    const tip = npcMeet(a, b, t0 + 1e6, 'tip');
    const learner = tip.tip.learner === 'Aster' ? a : b;
    out.tipSaved = learner.mind.tip.family === tip.tip.family;
    const plan = npcDeckPlan(learner, 3);
    out.tipInPlan = /a tip from/.test(plan.note + ' ' + JSON.stringify(plan.keep.length)) || plan.keep.some(id => CARD_FAMILY[id] === tip.tip.family);
    // bonded friends are more attractive goals
    const hi = npcScoreGoals({ night: false, weather: 'clear', bold: false, social: 0.5, home: { x: 0, y: 0 }, pos: { x: 1, y: 1 }, recent: [], cands: [{ id: 'f', kind: 'friend', x: 2, y: 2, bond: 8 }] })[0].s;
    let loSum = 0, hiSum = 0; for (let i = 0; i < 300; i++) { loSum += npcScoreGoals({ night: false, weather: 'clear', bold: false, social: 0.5, home: { x: 0, y: 0 }, pos: { x: 1, y: 1 }, recent: [], cands: [{ id: 'f', kind: 'friend', x: 2, y: 2, bond: 0 }] })[0].s; hiSum += npcScoreGoals({ night: false, weather: 'clear', bold: false, social: 0.5, home: { x: 0, y: 0 }, pos: { x: 1, y: 1 }, recent: [], cands: [{ id: 'f', kind: 'friend', x: 2, y: 2, bond: 8 }] })[0].s; }
    out.bondPull = hiSum > loSum + 20;
    // a gift needs friendship; best friend lookup
    out.best = npcBestFriend(a, data, 1) === b;
    // bonds stay capped
    for (let i = 0; i < 80; i++) npcBondAdd({ name: 'N' + i }, { name: 'M' + i }, 1, t0 + i);
    out.capped = Object.keys(npcBonds()).length <= NPC_MEET.maxBonds;
    return out;
  });
  assert.strictEqual(r.chatKind, 'chat'); assert.strictEqual(r.bond1, 1); assert.ok(r.same, 'a bond is mutual');
  assert.ok(r.lastMeet, 'both remember who they met'); assert.ok(r.dwell, 'they stand and talk for a while'); assert.ok(r.intent);
  assert.ok(r.greet, 'they mention it when you talk to them'); assert.ok(r.greetOld, 'but not for ever');
  assert.ok(r.cooled, 'a cooldown stops back-to-back meetings'); assert.ok(r.after, 'and then they can meet again');
  assert.ok(r.apart, 'neighbours who are not side by side never meet');
  assert.ok(r.tipSaved && r.tipInPlan, 'a tip reaches the next deck');
  assert.ok(r.bondPull, 'friends seek each other out more'); assert.ok(r.best);
  assert.ok(r.capped, 'the bond list stays small');
};
