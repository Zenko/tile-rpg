/* ============================================================
   NEIGHBOUR STORIES (build 229)
   A new kind of favour grown from the neighbours' own lives: "pass a message to another neighbour". The giver asks you to carry a friendly note to
   someone else in the district (a thank-you, an invitation, a compliment). When you talk to that neighbour the message is delivered, they reply, and
   the two grow closer (their bond rises, see npc-brain.js), so the town's friendships visibly come from what you carry.
   It plugs into the existing favour system in js/requests-friendship-rival.js: makeRequest() may pick kind 'message' (npcStoryKinds), requestDone() and
   requestProgressText() ask this file about it, and openTalk's interactWith calls npcStoryTalked(). Rewards are Embers like the other small favours.
   ============================================================ */
const STORY_NOTES = [
  'that the morning here smells wonderful',
  'that I am saving them a seat at the fountain',
  'thank you for the kind word last week',
  'that I admired their deck the other day',
  'that I would love to swap stories sometime',
  'that the town is better with them in it'
];
const STORY_REPLIES = [
  'Ha! Please tell them I was just thinking the same thing.',
  'Oh, that is lovely. Tell them I will find them soon.',
  'You carry messages kindly. Tell them thank you from me.',
  'That made my day. Pass my warmest hello back.'
];
const STORY_PEBBLES = 5;
function npcStoryTargets(f, data) { return (data.npcs || []).filter(n => n !== f && !n.defeated && !n.isBoss && !n.isRival && !n.isAtlas && /^npc-/.test(n.id || '')); }
// Extra favour kinds that can be offered right now (makeRequest appends these to its list).
function npcStoryKinds(f, m) {
  const data = ensureDistrictData(state.currentDistrict);
  return npcStoryTargets(f, data).length ? ['message'] : [];
}
// Build the request body (merged into makeRequest's base object).
function npcStoryRequest(base, f, m) {
  const data = ensureDistrictData(state.currentDistrict), ts = npcStoryTargets(f, data);
  // a bonded friend is the likelier recipient: friends write to friends
  const t = ts.slice().sort((a, b) => npcBond(f, b) - npcBond(f, a) + (Math.random() - 0.5) * 2)[0];
  const note = STORY_NOTES[Math.floor(Math.random() * STORY_NOTES.length)];
  return Object.assign(base, { target: t.id, targetName: t.name, note, text: `Could you pass a message to ${t.name} for me? Tell them ${note}.`, hint: `Find ${t.name} and have a word with them.`, pebbles: STORY_PEBBLES, delivered: false });
}
function npcStoryDone(r) { return !!r.delivered; }
function npcStoryProgress(r) {
  if (r.delivered) return `You told ${r.targetName}. Report back.`;
  const data = ensureDistrictData(state.currentDistrict);
  return data.npcs.some(n => n.id === r.target && !n.defeated) ? `Find ${r.targetName} and have a word.` : `${r.targetName} seems to have wandered off. Try the district they live in.`;
}
// Called when you open the talk screen with `t`: if an active message is for them, deliver it.
function npcStoryTalked(t) {
  if (!t || !t.id) return false;
  const rs = reqState(); let hit = false;
  Object.values(rs.list).forEach(r => {
    if (r.kind !== 'message' || r.state !== 'active' || r.delivered || r.target !== t.id) return;
    r.delivered = true; hit = true;
    r.replyText = `${r.giver} sent that? ${STORY_REPLIES[Math.floor(Math.random() * STORY_REPLIES.length)]}`;
    const data = ensureDistrictData(state.currentDistrict), giver = data.npcs.find(n => n.id === r.id);
    if (giver) { npcBondAdd(giver, t, 2, Date.now()); t.lastMeet = { with: giver.name, kind: 'message', topic: r.note, at: Date.now() }; }
  });
  if (hit) { teleInc('stories.delivered'); saveState(); toast('📝 Message delivered. Report back.'); }
  return hit;
}
