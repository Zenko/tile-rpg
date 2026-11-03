/* ============================================================
   CHALLENGES BETWEEN TESTERS (build 332)
   Lingering duels (js/cloud-save.js) used to be one-way: you fought a ghost of someone's deck and they never knew. Now,
   when you finish a duel with a tester's ghost (and you share that you are playing, prefs.sharePresence), the result and
   the match's replay frames (js/replays.js) are written to the 'challenges' collection, addressed to that tester. Their game
   picks it up (challengeFetch: on sign-in, every CHAL_FETCH_MS, and when Who's Playing opens), turns it into a letter in
   their mailbox, keeps the replay with their own, and deletes the document. The letter has two buttons (home-screens.js):
   watch the replay, and answer by playing a ghost of the challenger's deck (startGhostDuel, which sends its own result back).
   At most one challenge per tester per day is sent, so a rematch streak never floods anyone's mailbox.
   Needs a Firestore rule the owner pastes in (HANDOFF.md §1a); until then, sending and fetching fail silently like every
   other cloud call. Saved: state.progress.chalSent = { uid: dayKey }.
   ============================================================ */
const CHAL_COLLECTION = 'challenges', CHAL_FETCH_MS = 10 * 60 * 1000, CHAL_FRAMES_MAX = 250;
let chalFetchedAt = 0;

function chalSentState() { const p = state.progress; if (!p.chalSent || typeof p.chalSent !== 'object') p.chalSent = {}; return p.chalSent; }
// From ghostWin / ghostLoss: tell the deck's owner how it went.
function challengeSend(won) {
  const g = battle && battle.npc && battle.npc.ghost, r = battle && battle.rec;
  if (!g || !g.uid || !r || typeof presenceSharingOn !== 'function' || !presenceSharingOn() || !cloudReady || !cloudDb || !cloudUser || g.uid === cloudUser.uid) return false;
  const sent = chalSentState(); if (sent[g.uid] === todayKey()) return false;
  sent[g.uid] = todayKey(); saveState();
  const doc = { to: g.uid, from: cloudUser.uid, fromName: String((state.character && state.character.name) || 'A player').slice(0, 16),
    fromEmoji: String((state.character && state.character.emoji) || '🙂').slice(0, 8), won: !!won, turns: Math.ceil((battle.G.turn || 0) / 2) + 1,
    at: Date.now(), deck: typeof ghostDeckCode === 'function' ? ghostDeckCode() : null, frames: r.frames.slice(0, CHAL_FRAMES_MAX) };
  if (JSON.stringify(doc).length > 400000) doc.frames = [];   // far below Firestore's 1 MB, but never risk the write
  cloudDb.collection(CHAL_COLLECTION).add(doc).catch(() => { /* no rule yet, or offline: nothing to do */ });
  return true;
}
// Turn challenges addressed to you into letters (and replays), then delete them.
async function challengeFetch(force) {
  if (!cloudReady || !cloudDb || !cloudUser) return 0;
  if (!force && Date.now() - chalFetchedAt < CHAL_FETCH_MS) return 0;
  chalFetchedAt = Date.now();
  let n = 0;
  try {
    const snap = await cloudDb.collection(CHAL_COLLECTION).where('to', '==', cloudUser.uid).limit(10).get();
    snap.docs.forEach(d => { if (challengeDeliver(d.id, d.data())) n++; d.ref.delete().catch(() => {}); });
  } catch (e) { /* no rule yet, or offline */ }
  return n;
}
function challengeDeliver(id, c) {
  if (!c || typeof c !== 'object') return false;
  const name = String(c.fromName || 'A player').slice(0, 16), turns = Math.max(1, Math.floor(+c.turns) || 1);
  let rid = null;
  if (Array.isArray(c.frames) && c.frames.length > 1) {
    const rep = { id: 'c' + String(id).slice(0, 12), at: +c.at || Date.now(), frames: c.frames, name, icon: String(c.fromEmoji || '🙂').slice(0, 8), won: !c.won, yielded: false, kind: 'ghost', pov: name };
    try { localStorage.setItem(REPLAY_KEY, JSON.stringify([rep].concat(replaysAll().filter(x => x.id !== rep.id)).slice(0, REPLAY_MAX))); rid = rep.id; } catch (e) { rid = null; }
  }
  return sendLetter('chal-' + id, { from: name, icon: '👻', subject: c.won ? words('chal.subjectWon') : words('chal.subjectLost'),
    body: c.won ? words('chal.bodyWon', { name, turns }) : words('chal.bodyLost', { name, turns }), gift: null,
    chal: { rid, deck: typeof c.deck === 'string' ? c.deck : null, uid: String(c.from || ''), name } });
}
// The letter's buttons (js/home-screens.js).
function challengeWatch(letterId) { const l = mailState().list.find(x => x.id === letterId); if (l && l.chal && l.chal.rid) { homeScreenClose && homeScreenClose(); openReplay(l.chal.rid); } }
function challengeAnswer(letterId) {
  const l = mailState().list.find(x => x.id === letterId); if (!l || !l.chal || !l.chal.deck) return;
  if (typeof homeScreenClose === 'function') homeScreenClose();
  if (inScene) closeScene();
  startGhostDuel({ id: l.chal.uid, name: l.chal.name, deck: l.chal.deck });
}
function challengeLetterHtml(l) {
  if (!l.chal) return '';
  const watch = l.chal.rid && replayGet(l.chal.rid) ? `<button type="button" class="ho-pill" data-ho="chalwatch:${l.id}">${words('replay.watch')}</button>` : '';
  const answer = l.chal.deck ? `<button type="button" class="ho-pill" data-ho="chalplay:${l.id}">${words('chal.answer')}</button>` : '';
  return watch || answer ? `<div class="ho-reply"><small>${words('chal.what')}</small><div>${watch}${answer}</div></div>` : '';
}
setInterval(() => { if (!document.hidden) challengeFetch(); }, 60 * 1000);
