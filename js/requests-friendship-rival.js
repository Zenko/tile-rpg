/* ============================================================
   VILLAGER REQUESTS
   Tap a neighbor to talk. Each one has one small request per day. Finish it, then hand it in to
   that same neighbor. Bosses skip the chat and go straight to their match.
   Fetch-style requests never take a card from you.
   ============================================================ */
const REQ_KEYWORDS = ['guard', 'swift', 'mend', 'shield', 'bloom'];   // all present in the starter deck, so always completable
const REQ_LANDMARKS = [
  { id: 'bridge', label: 'cross the bridge', where: 'the bridge' },
  { id: 'well',   label: 'visit the well',   where: 'the well' },
  { id: 'fountain', label: 'stand by the fountain', where: 'the fountain' },
];
const REQ_VISITS = [
  { building: 'nook',    who: 'Olwen', place: 'the Reading Nook', line: 'Could you pop into the Reading Nook and tell Olwen I said hello?' },
  { building: 'cottage', who: 'Wren',  place: "Wren's Cottage",   line: 'Would you look in on Wren at the cottage? Just say I sent you.' },
  { building: 'bakery',  who: 'Maple', place: "Maple's Bakery",   line: 'Pop into the bakery and tell Maple her rolls are the talk of the square.' },
  { building: 'house2',  who: 'Fern',  place: "Fern's Cottage",   line: 'Fern lent me a watering can ages ago. Could you let her know I have not forgotten?' },
  { building: 'stall-spice',  who: 'Saffron', place: "Saffron's Spice Stall", line: "Could you ask Saffron what today's deal is? I'm too shy to haggle." },
  { building: 'stall-tinker', who: 'Tock',    place: "Tock's Tinker Stall",   line: 'Tell Tock the little bell on the door is squeaking again, would you?' },
];
const REQ_PEBBLES = { fetch: 4, deck: 4, fish: 5, walk: 4, win: 0, visit: 4, dish: 9 };
const REQ_WIN_RARITY = 'rare';                 // "win without X" pays a card of rare or better
const REQ_MAX_ACTIVE = 2;                      // you can carry at most two open requests, so the list never overwhelms

const reqDay = () => todayKey();
function reqState() {
  const p = state.progress;
  if (!p.requests) p.requests = { day: reqDay(), list: {} };
  if (p.requests.day !== reqDay()) { p.requests.day = reqDay(); p.requests.list = {}; }
  return p.requests;
}
const kwName = (k) => (KW[k] ? KW[k].name : k);
const kwIcon = (k) => (KW[k] ? KW[k].icon : '');
const bigCount = () => state.deck.filter(id => cardDef(id).cost >= 3).length;
const ownedBig = () => state.ownedCards.filter(id => cardDef(id).cost >= 3).length;
const copiesWithKw = (k) => state.ownedCards.filter(id => cardDef(id).kw.includes(k)).length;

/* ---------- what a villager might ask for ---------- */
function makeRequest(f, m) {
  const kinds = ['fetch', 'deck', 'fish', 'walk', 'win', 'visit', 'dish'];
  // Only offer kinds that can actually be done right now.
  const landmarks = REQ_LANDMARKS.filter(l => requestLandmark(m, l.id));
  const visits = REQ_VISITS.filter(v => visitableHere(m, v.building) && v.who !== f.name);
  const shortOn = REQ_KEYWORDS.some(k => copiesWithKw(k) < 2);
  const options = kinds.filter(k => k !== 'fetch' || shortOn).filter(k => k !== 'walk' || landmarks.length).filter(k => k !== 'deck' || bigCount() < 3).filter(k => k !== 'fish' || hasFishableWater(m)).filter(k => k !== 'visit' || visits.length).filter(k => k !== 'dish' || (state.progress.totals.dishesCooked || 0) > 0);
  const kind = options[Math.floor(Math.random() * options.length)];
  const base = { id: f.id, giver: f.name, kind, state: 'open', made: Date.now() };
  if (kind === 'fetch') {
    // One step beyond what you have, never more than 2 cards: a keyword you own none of, else one you own exactly one of.
    const none = REQ_KEYWORDS.filter(k => copiesWithKw(k) === 0), few = REQ_KEYWORDS.filter(k => copiesWithKw(k) === 1);
    const pool = none.length ? none : few, k = pool[Math.floor(Math.random() * pool.length)];
    const need = copiesWithKw(k) + 1;
    return Object.assign(base, { kw: k, need, text: need > 1 ? `I'm looking for a second ${kwIcon(k)} ${kwName(k)} card to admire. Do you have two?` : `Have you come across a ${kwIcon(k)} ${kwName(k)} card yet? I'd love to see one.`, hint: `Find or craft one, then show me. I won't take it.`, pebbles: REQ_PEBBLES.fetch });
  }
  if (kind === 'deck') { const n = Math.min(3, Math.max(1, bigCount() + 1), CARD_POOL.filter(c => cardDef(c.id).cost >= 3).length, DECK_SIZE); return Object.assign(base, { need: n, text: `Build a full deck that includes at least ${n} card${n > 1 ? 's' : ''} costing 3 or more.`, hint: 'Bigger cards win bigger fights. Check Cards → Deck, then show me.', pebbles: REQ_PEBBLES.deck }); }
  if (kind === 'fish') { const n = 2; return Object.assign(base, { need: n, baseline: fishState().total || 0, text: `Catch ${n} fish by the water for me.`, hint: 'Tap the stream to go fishing.', pebbles: REQ_PEBBLES.fish }); }
  if (kind === 'walk') { const l = landmarks[Math.floor(Math.random() * landmarks.length)]; return Object.assign(base, { landmark: l.id, text: `Could you ${l.label} and tell me how it looks?`, hint: `Walk to ${l.where}.`, pebbles: REQ_PEBBLES.walk, seen: false }); }
  if (kind === 'dish') { const r = RECIPES[Math.floor(Math.random() * RECIPES.length)]; return Object.assign(base, { dish: r.id, text: `I've been dreaming about ${r.icon} ${r.name}. Could you bring me one?`, hint: `Maple can help you cook it (${needsText(r)}). I will eat it, mind.`, pebbles: REQ_PEBBLES.dish }); }
  if (kind === 'visit') { const v = visits[Math.floor(Math.random() * visits.length)]; return Object.assign(base, { building: v.building, who: v.who, text: v.line, hint: `Step inside ${v.place}.`, pebbles: REQ_PEBBLES.visit, visited: false }); }
  const k = ['swift', 'guard'][Math.floor(Math.random() * 2)];
  return Object.assign(base, { avoid: k, baseline: state.progress.totals.battlesWon || 0, wonClean: false, text: `Win a match without playing any ${kwIcon(k)} ${kwName(k)} cards.`, hint: 'Take a friendly match with a deck that has none, then tell me.', reward: REQ_WIN_RARITY });
}
function visitableHere(m, buildingId) { return !!(m.buildings && m.buildings.some(b => b.id === buildingId && b.enter)); }
function hasFishableWater(m) {
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.rows[y][x] === '~' && bankFor(m, x, y)) return true;
  return false;
}
function requestLandmark(m, id) {
  if (id === 'bridge') return m.rows.some(r => r.includes('b'));
  return m.props.some(p => p.type === id);
}
function landmarkTiles(m, id) {
  if (id === 'bridge') { const out = []; for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.rows[y][x] === 'b') out.push({ x, y }); return out; }
  return m.props.filter(p => p.type === id).map(p => ({ x: p.x, y: p.y }));
}

/* ---------- is it done? ---------- */
function requestDone(r) {
  if (r.kind === 'fetch') return copiesWithKw(r.kw) >= (r.need || 1);
  if (r.kind === 'deck') return bigCount() >= r.need && state.deck.length >= DECK_SIZE;
  if (r.kind === 'fish') return ((fishState().total || 0) - r.baseline) >= r.need;
  if (r.kind === 'walk') return !!r.seen;
  if (r.kind === 'win') return !!r.wonClean;
  if (r.kind === 'visit') return !!r.visited;
  if (r.kind === 'dish') return dishCount(r.dish) > 0;
  return false;
}
function requestProgressText(r) {
  if (r.kind === 'fish') return `${Math.min(r.need, (fishState().total || 0) - r.baseline)}/${r.need} fish`;
  if (r.kind === 'deck') return `${Math.min(r.need, bigCount())}/${r.need} big cards in your deck`;
  if (r.kind === 'fetch') return requestDone(r) ? 'You have it.' : `${Math.min(copiesWithKw(r.kw), r.need || 1)}/${r.need || 1} ${kwName(r.kw)} cards`;
  if (r.kind === 'walk') return r.seen ? 'You went. Tell them.' : 'Not there yet.';
  if (r.kind === 'win') return r.wonClean ? 'A clean win. Tell them.' : 'No clean win yet.';
  if (r.kind === 'visit') return r.visited ? `You said hello to ${r.who}. Report back.` : `Not yet.`;
  if (r.kind === 'dish') return dishCount(r.dish) ? 'You have one ready.' : 'Not cooked yet.';
  return '';
}

/* walking onto a landmark is what completes a walk request */
function noteStep(x, y) {
  const rs = reqState(), m = getMap(state.currentDistrict); let any = false;
  Object.values(rs.list).forEach(r => {
    if (r.kind !== 'walk' || r.state !== 'active' || r.seen) return;
    const tiles = landmarkTiles(m, r.landmark);
    if (tiles.some(t => Math.abs(t.x - x) + Math.abs(t.y - y) <= (r.landmark === 'bridge' ? 0 : 1))) { r.seen = true; any = true; }
  });
  if (any) { saveState(); toast('📝 You can tell them now.'); }
}
/* a finished battle can complete a "win without" request */
function noteBattleResult(won, playedKeywords) {
  if (!won) return;
  const rs = reqState(); let any = false;
  Object.values(rs.list).forEach(r => {
    if (r.kind !== 'win' || r.state !== 'active' || r.wonClean) return;
    if (!playedKeywords.includes(r.avoid)) { r.wonClean = true; any = true; }
  });
  if (any) { saveState(); toast('📝 That counts for a request.'); }
}

/* ---------- the talk card ---------- */
let talkTo = null;
function talkEls() { return { ov: document.getElementById('talkOverlay'), name: document.getElementById('talkName'), text: document.getElementById('talkText'), sub: document.getElementById('talkSub'),
  main: document.getElementById('talkMain'), fight: document.getElementById('talkFight'), close: document.getElementById('talkClose'), tag: document.getElementById('talkTag') }; }
function activeCount() { return Object.values(reqState().list).filter(r => r.state === 'active').length; }
function openTalk(f) {
  talkTo = f; const e = talkEls();
  bumpStat('talks', 1);
  e.name.textContent = f.name;
  e.ov.classList.remove('hidden'); sfx('tap');
  renderTalk();
}
/* The neighbor's portrait, a speech bubble that types out (tap it to finish at once) and a few small-talk topics,
   so the card feels like a conversation rather than a form. Text is typed only when it changes, since renderTalk()
   runs again after every action. */
let talkSaid = '', talkTypeTimer = null;
function talkSay(text) {
  const el = document.getElementById('talkText');
  if (text === talkSaid) return;
  talkSaid = text; clearInterval(talkTypeTimer);
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || text.length < 3) { el.textContent = text; return; }
  let i = 0; el.textContent = '';
  talkTypeTimer = setInterval(() => {
    i += 2; el.textContent = text.slice(0, i);
    if (i >= text.length) { clearInterval(talkTypeTimer); el.textContent = text; }
  }, 22);
}
function talkFinishTyping() { clearInterval(talkTypeTimer); if (talkSaid) document.getElementById('talkText').textContent = talkSaid; }
function talkReact(emoji) {
  const pt = document.getElementById('talkPortrait');
  pt.classList.remove('react'); void pt.offsetWidth; pt.classList.add('react');
  const fl = document.createElement('span'); fl.className = 'talk-float'; fl.textContent = emoji;
  pt.appendChild(fl); setTimeout(() => fl.remove(), 1100);
}
const TALK_WEATHER = {
  clear:  ['Lovely and bright, isn\'t it? Good day for a wander.', 'Not a cloud to complain about. I could sit out in this all afternoon.'],
  cloudy: ['A bit grey, but I don\'t mind. It keeps the glare off the cards.', 'Cloudy days are for slow walks and warm drinks.'],
  rain:   ['Listen to that rain on the roofs. I do love the sound.', 'Puddles everywhere! Mind your step.'],
  storm:  ['Quite the storm! Everything feels a little faster in this weather.', 'Thunder always makes my cards tingle. Stay dry, friend.'],
  snow:   ['Snow! Everything is so quiet under it.', 'Winter suits this town. Come and find me by the warm windows later.']
};
const TALK_GOSSIP = [
  place => `Things are calm around ${place}. I like it that way.`,
  place => `Someone left a card on a bench in ${place} yesterday. Finders keepers, I suppose!`,
  place => `I heard the boss of ${place} has been in a mood lately. Bring a good deck.`,
  place => `Have you tried the bakery? Nothing beats warm bread while you walk through ${place}.`,
  place => `I saw a spirit drifting through ${place} earlier. Keep your eyes open.`
];
const TALK_TOPICS = [
  { id: 'weather', label: '🌤️ The weather' },
  { id: 'town',    label: '🏘️ Around town' },
  { id: 'cards',   label: '🎴 Favourite cards' }
];
function talkTopicReply(id, f) {
  if (id === 'weather') { const l = TALK_WEATHER[weatherNow()] || TALK_WEATHER.clear; return l[Math.floor(Math.random() * l.length)]; }
  if (id === 'town') return TALK_GOSSIP[Math.floor(Math.random() * TALK_GOSSIP.length)](DISTRICTS[state.currentDistrict] ? DISTRICTS[state.currentDistrict].name : 'town');
  const k = KW[signatureTheme(f)];
  return `I'm partial to ${k.icon} ${k.name} cards. ${k.text} Bring me one and I'll never forget it.`;
}
function talkChatsToday() { const p = state.progress; if (!p.chats || p.chats.day !== todayKey()) p.chats = { day: todayKey(), done: {} }; return p.chats; }
function renderTalkTopics(f) {
  const box = document.getElementById('talkTopics');
  const show = !f.isBoss && !f.isRival && !f._thanks;
  box.classList.toggle('hidden', !show);
  if (!show) return;
  const used = f._topics || (f._topics = {});
  box.innerHTML = TALK_TOPICS.map(t => `<button class="talk-topic${used[t.id] ? ' used' : ''}" data-topic="${t.id}">${t.label}</button>`).join('');
  box.querySelectorAll('[data-topic]').forEach(b => b.addEventListener('click', () => {
    if (!talkTo) return;
    const id = b.dataset.topic; talkTo._topics = talkTo._topics || {}; talkTo._topics[id] = true;
    talkSaid = ''; talkSay(talkTopicReply(id, talkTo)); sfx('tap'); buzz(HAP.tap);
    const chats = talkChatsToday(), key = neighborKey(talkTo);
    if (!chats.done[key]) { chats.done[key] = true; saveState(); talkReact('💞'); addFriendship(talkTo, 1, 'chat'); renderTalkFriendship(talkTo); }
    else talkReact('💬');
    b.classList.add('used');
  }));
}
function renderTalk() {
  if (!talkTo) return;
  const f = talkTo, e = talkEls(), rs = reqState(), r = rs.list[f.id];
  const pt = document.getElementById('talkPortrait');
  if (!pt.firstChild || pt.dataset.for !== f.id) { pt.dataset.for = f.id; pt.textContent = opponentPortrait(f); talkSaid = ''; }
  const mood = (!f.isBoss && !f.isRival && friendHearts(f) >= 3) ? '😊' : '';
  pt.dataset.mood = mood;
  renderTalkTopics(f);
  e.fight.classList.remove('hidden'); e.main.classList.remove('hidden'); e.main.disabled = false; e.tag.textContent = '';
  e.fight.textContent = '⚔️ Friendly match'; e.name.textContent = f.name;
  if (f.isRival) { renderRivalTalk(f); return; }
  const gift = document.getElementById('talkGift');
  gift.classList.toggle('hidden', !canShareBread(f));
  gift.textContent = `🍞 Share a loaf (${breadCount()} left)`;
  const dishBtn = document.getElementById('talkDish'), bd = bestGiftDish();
  dishBtn.classList.toggle('hidden', !canGiveDish(f));
  document.getElementById('talkCardGift').classList.toggle('hidden', !canGiveCard(f));
  if (!canGiveCard(f)) document.getElementById('talkCards').classList.add('hidden');
  if (bd) dishBtn.textContent = `🎁 Give ${bd.icon} ${bd.name}`;
  renderTalkFriendship(f);
  if (f._thanks) {                                    // just handed over a loaf: let them say thank you first
    talkSay(f._thanks); e.sub.textContent = r && r.state === 'active' && !requestDone(r) ? `${r.hint}  (${requestProgressText(r)})` : 'They tuck the loaf away carefully.';
    e.main.classList.add('hidden');
    if (!f._reacted) { f._reacted = true; talkReact('❤️'); }
    return;
  }
  if (!r) {
    talkSay('Hello there. Fancy a chat, or a friendly match?');
    e.sub.textContent = 'I might have a small favour to ask.';
    e.main.textContent = '💬 Chat'; e.main.dataset.act = 'ask';
  } else if (r.state === 'open') {
    talkSay(r.text); e.sub.textContent = r.hint;
    e.tag.textContent = r.reward ? `Reward: a ${REQ_WIN_RARITY} card or better` : `Reward: 🫧 ${r.pebbles} Embers`;
    if (activeCount() >= REQ_MAX_ACTIVE) { e.main.textContent = 'You have two favours open already'; e.main.disabled = true; e.main.dataset.act = ''; }
    else { e.main.textContent = '✅ Happy to help'; e.main.dataset.act = 'accept'; }
  } else if (r.state === 'active') {
    talkSay(requestDone(r) ? 'You did it? Wonderful!' : r.text);
    e.sub.textContent = requestDone(r) ? 'Thank you, truly.' : `${r.hint}  (${requestProgressText(r)})`;
    e.tag.textContent = r.reward ? `Reward: a ${REQ_WIN_RARITY} card or better` : `Reward: 🫧 ${r.pebbles} Embers`;
    if (requestDone(r)) { e.main.textContent = '🎁 Hand it in'; e.main.dataset.act = 'complete'; }
    else { e.main.textContent = 'Still working on it'; e.main.disabled = true; e.main.dataset.act = ''; }
  } else {
    talkSay('Thanks again for the help earlier.');
    e.sub.textContent = 'Nothing else today. Come back tomorrow.';
    e.main.classList.add('hidden');
  }
}
function talkAct(act) {
  if (!talkTo) return;
  const f = talkTo, rs = reqState();
  if (act === 'ask') { rs.list[f.id] = makeRequest(f, getMap(state.currentDistrict)); saveState(); }
  else if (act === 'accept') {
    if (activeCount() >= REQ_MAX_ACTIVE) return;
    rs.list[f.id].state = 'active'; saveState(); toast('📝 Favour accepted'); sfx('claim');
    logEvent('📝', `Accepted a favour from ${f.name}.`);
  }
  else if (act === 'complete') { completeRequest(f); return; }
  renderTalk();
}
function completeRequest(f) {
  const rs = reqState(), r = rs.list[f.id];
  if (!r || r.state !== 'active' || !requestDone(r)) return;
  r.state = 'done'; r.doneAt = Date.now();
  if (r.kind === 'dish') dishes()[r.dish] = dishCount(r.dish) - 1;        // the only favour that uses something up
  bumpStat('favours', 1);
  addFriendship(f, FRIEND_POINTS.favour, 'favour');
  let rewardCard = null;
  if (r.reward) { rewardCard = randomCardId(rollRewardRarity(false)); state.ownedCards.push(rewardCard); bumpStat('cardsFound', 1); bumpPill('pillCards'); }
  else addPebbles(r.pebbles, 'favours');
  logEvent('🎁', `Finished a favour for ${f.name}${rewardCard ? '' : ` for 🫧 ${r.pebbles} Embers`}.`);
  saveState(); updateHud(); renderTalk(); sfx('claim'); buzz(HAP.win);
  toast(rewardCard ? '🎁 A card, as thanks' : `🫧 +${r.pebbles} Embers`);
  if (rewardCard) setTimeout(() => showCardReveal(rewardCard, `A gift from ${f.name}`, true), 300);
}
function closeTalk() { document.getElementById('talkCards').classList.add('hidden'); clearInterval(talkTypeTimer); talkSaid = ''; document.getElementById('talkPortrait').dataset.for = ''; if (talkTo) { delete talkTo._thanks; delete talkTo._topics; delete talkTo._reacted; } talkTo = null; talkEls().ov.classList.add('hidden'); }
document.getElementById('talkBubble').addEventListener('click', talkFinishTyping);
document.getElementById('talkMain').addEventListener('click', e => { const a = e.currentTarget.dataset.act; if (a) talkAct(a); });
document.getElementById('talkGift').addEventListener('click', () => { if (talkTo) shareBread(talkTo); });
document.getElementById('talkDish').addEventListener('click', () => { if (talkTo) giveDish(talkTo); });
document.getElementById('talkCardGift').addEventListener('click', () => { if (!talkTo) return; const box = document.getElementById('talkCards'); if (box.classList.contains('hidden')) renderCardGiftPicker(talkTo); else box.classList.add('hidden'); });

/* ---------- sharing bread: one loaf per neighbor per day ---------- */
const BREAD_THANKS = [
  'Fresh bread? For me? You are too kind.',
  'Oh, it is still warm! Thank you, friend.',
  'Maple\'s bread! I will save the crust for the ducks.',
  'You remembered I like the crusty ones. Thank you!',
];
function giftsToday() { const p = state.progress; if (!p.gifts || p.gifts.day !== todayKey()) p.gifts = { day: todayKey(), to: {} }; return p.gifts; }
// A neighbor is known by district + name, so "Wren of El Umbral" is the same person every time they turn up.
function neighborKey(f) { const d = /^npc-([a-z]+)-/.exec(f.id || ''); return (d ? d[1] : state.currentDistrict) + ':' + f.name; }
function canShareBread(f) { return !!f && breadCount() > 0 && !f.isBoss && !f.isRival && !giftsToday().to[neighborKey(f)]; }
// A cooked dish counts as the day's gift too, but is worth more friendship than bread.
function canGiveDish(f) { return !!f && !!bestGiftDish() && !f.isBoss && !f.isRival && !giftsToday().to[neighborKey(f)]; }
function giveDish(f) {
  const r = bestGiftDish();
  if (!r || !canGiveDish(f)) return;
  dishes()[r.id] = dishCount(r.id) - 1;
  giftsToday().to[neighborKey(f)] = true;
  addPebbles(2, 'gifts');
  bumpStat('dishesGiven', 1);
  addFriendship(f, r.gift, 'dish');
  f._thanks = `${r.icon} ${r.name}? For me? This is the nicest thing anyone has done all week! (+2 🫧)`;
  logEvent(r.icon, `Gave ${r.name} to ${f.name}.`);
  saveState(); sfx('gift'); buzz(HAP.found);
  renderTalk();
}
function shareBread(f) {
  if (!canShareBread(f)) return;
  state.progress.bread = breadCount() - 1;
  giftsToday().to[neighborKey(f)] = true;
  addPebbles(3, 'gifts');
  bumpStat('breadShared', 1);
  addFriendship(f, FRIEND_POINTS.bread, 'bread');
  f._thanks = BREAD_THANKS[Math.floor(Math.random() * BREAD_THANKS.length)] + ' (+3 🫧)';
  logEvent('🍞', `Shared a loaf with ${f.name}.`);
  saveState(); sfx('claim'); buzz(HAP.found);
  renderTalk();
}
document.getElementById('talkFight').addEventListener('click', () => { const f = talkTo; closeTalk(); if (f) interactWith('fight', f); });
document.getElementById('talkClose').addEventListener('click', closeTalk);

/* A villager who falls takes their unfinished favour with them. A favour you have already finished
   stays, so beating the very neighbor who asked never robs you of the reward you just earned. */
function dropRequestsFor(f) {
  const rs = reqState(), r = rs.list[f.id];
  if (!r || r.state === 'done') return;
  if (r.state === 'active' && requestDone(r)) return;
  delete rs.list[f.id];
}

/* Which keywords did the player actually play this battle? Recorded from the engine's own play events,
   so it does not depend on the animation running to the end. */
function notePlayerPlay(ev) {
  if (battle) {                                         // numbers for the results window (see btRenderEndStats)
    const st = battle.stats || (battle.stats = { played: 0, dealt: 0, taken: 0, ko: 0 });
    if ((ev.type === 'play' || ev.type === 'spell') && ev.who === 0) st.played++;
    else if (ev.type === 'attack' && !ev.blocked) { if (ev.who === 0) st.dealt += ev.dmg || 0; else st.taken += ev.dmg || 0; }
    else if (ev.type === 'faint' && ev.who === 1) st.ko++;
  }
  if (battle && (ev.type === 'spell' || ev.type === 'play') && ev.who === 0 && ev.card) {            // mastery: every card you put down counts
    if (!battle.mastery) battle.mastery = {};
    const b = BattleEngine.baseIdOf(ev.card.id); battle.mastery[b] = (battle.mastery[b] || 0) + 1;
  }
  if (battle && ev.type === 'spell' && ev.who === 0) { battle.spellsCast = (battle.spellsCast || 0) + 1; return; }
  if (!battle || ev.type !== 'play' || ev.who !== 0 || !ev.card) return;
  if (!battle.playedKw) battle.playedKw = [];
  (ev.card.kw || []).forEach(k => { if (!battle.playedKw.includes(k)) battle.playedKw.push(k); });
}

/* stepping inside a building completes a visit request for that building */
function noteVisit(buildingId) {
  const pv = state.progress; if (!pv.visited || typeof pv.visited !== 'object') pv.visited = {}; pv.visited[buildingId] = true;
  const rs = reqState(); let any = false;
  Object.values(rs.list).forEach(r => { if (r.kind === 'visit' && r.state === 'active' && !r.visited && r.building === buildingId) { r.visited = true; any = true; } });
  if (any) { saveState(); toast('👋 You passed on the hello.'); }
}


/* ============================================================
   NEIGHBOR FRIENDSHIP
   A neighbor is known by district + name. Favours, shared bread and friendly wins earn friendship points; points
   become hearts (up to 5). At 3 hearts a neighbor plays you with their signature deck, at 5 they give a keepsake card.
   ============================================================ */
const FRIEND_POINTS = { favour: 3, bread: 2, win: 1, signature: 1 };
const HEART_AT = [3, 7, 12, 18, 25];                 // points needed for heart 1..5
const SIG_HEARTS = 3;
const SIG_THEMES = ['mend', 'swift', 'guard', 'bloom', 'shield', 'echo'];
function friendsState() { const p = state.progress; if (!p.friends || typeof p.friends !== 'object') p.friends = {}; return p.friends; }
function heartsFor(points) { return HEART_AT.filter(t => points >= t).length; }
function friendOf(f) { return friendsState()[neighborKey(f)] || null; }
function friendHearts(f) { const fr = friendOf(f); return fr ? heartsFor(fr.points) : 0; }
function heartRow(h) { return '❤️'.repeat(h) + '🤍'.repeat(5 - h); }
function addFriendship(f, pts, why) {
  if (!f || f.isBoss || f.isRival || f.signature) return;
  const k = neighborKey(f), fs = friendsState();
  const fr = fs[k] || (fs[k] = { name: f.name, district: k.split(':')[0], points: 0, icon: opponentPortrait(f), sigDay: null, sigWins: 0, gift: false });
  const before = heartsFor(fr.points);
  if (eventIs('friendship-fair')) pts *= 2;
  fr.points += pts; fr.icon = opponentPortrait(f);
  const after = heartsFor(fr.points);
  if (after > before) {
    toast(`💞 ${f.name}: ${'❤️'.repeat(after)}`);
    showTipOnce('friends');
    logEvent('💞', `${f.name} of ${DISTRICTS[fr.district] ? DISTRICTS[fr.district].name : 'town'} now has ${after} heart${after > 1 ? 's' : ''} for you.`);
    if (after >= SIG_HEARTS && before < SIG_HEARTS) setTimeout(() => toast(`🌟 ${f.name} will play their signature deck with you now`), 2400);
    if (after >= 5 && !fr.gift) {
      fr.gift = true;
      const cid = randomCardId(Math.random() < 0.3 ? 'mythic' : 'super');
      state.ownedCards.push(cid); bumpStat('cardsFound', 1); bumpPill('pillCards');
      setTimeout(() => showCardReveal(cid, `A keepsake from ${f.name}`, true, 'For being such a good friend.'), 700);
    }
  }
  saveState();
  checkAchievements();
}
function renderTalkFriendship(f) {
  const el = document.getElementById('talkHearts'), sig = document.getElementById('talkSig');
  const show = !f.isBoss && !f.isRival;
  el.classList.toggle('hidden', !show);
  sig.classList.add('hidden');
  if (!show) return;
  const fr = friendOf(f), pts = fr ? fr.points : 0, h = heartsFor(pts);
  const next = HEART_AT[h];
  const fav = KW[signatureTheme(f)];
  el.innerHTML = `${heartRow(h)}<small>${h >= 5 ? 'Best friends' : `${next - pts} more to the next heart`} · loves ${fav.icon} ${fav.name} cards</small>`;
  if (h >= SIG_HEARTS) {
    sig.classList.remove('hidden');
    sig.textContent = `🌟 Signature match: ${KW[signatureTheme(f)].icon} ${KW[signatureTheme(f)].name} deck`;
  }
}
// Every neighbor has a favourite keyword, fixed by their name, and their signature deck is built around it.
function signatureTheme(f) { let h = 7; const s = neighborKey(f); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return SIG_THEMES[h % SIG_THEMES.length]; }
function signatureDeck(f) {
  const theme = signatureTheme(f), counts = {};
  const themed = CARD_POOL.filter(c => !c.exclusive && !c.spell && c.kw.includes(theme) && RARITY_ORDER.indexOf(c.rarity) <= 3);
  themed.forEach(c => { counts[c.id] = 2; });
  BASE_COMMONS.forEach(id => { counts[id] = Math.max(counts[id] || 0, 1); });
  return BattleEngine.suggestDeck(counts);
}
function startSignatureMatch(f) {
  if (!f || friendHearts(f) < SIG_HEARTS) return;
  const foe = { id: f.id, name: `${f.name}'s best`, icon: opponentPortrait(f), deck: signatureDeck(f), isBoss: false, rewardCard: null,
                signature: { key: neighborKey(f), name: f.name, theme: signatureTheme(f) }, profile: { level: 'smart', spirit: 20 } };
  closeTalk();
  townLog.textContent = `${f.name} fetches their favourite deck.`;
  startBattle(foe);
}
document.getElementById('talkSig').addEventListener('click', () => { const f = talkTo; if (f) startSignatureMatch(f); });
// The first signature win with a friend each day pays an ultra rare card or better; later ones a few Embers.
function signatureWin() {
  const npc = battle.npc, s = npc.signature, fr = friendsState()[s.key];
  battle.rewarded = true;
  state.wins++;
  bumpStat('battlesWon', 1);
  let cardId = null, pebbles = 0;
  if (fr && fr.sigDay !== todayKey()) {
    fr.sigDay = todayKey();
    const r = rollRewardRarity(false);
    cardId = randomCardId(RARITY_ORDER.indexOf(r) < 2 ? 'ultra' : r);
    state.ownedCards.push(cardId); noteCardsFound(1); bumpPill('pillCards');
  } else { pebbles = 6; addPebbles(pebbles, 'rival'); }
  if (fr) { fr.sigWins = (fr.sigWins || 0) + 1; fr.points += FRIEND_POINTS.signature; }
  saveState();
  const icon = btGet('battleEndIcon'), endCard = btGet('battleEndCard');
  icon.textContent = '🌟'; icon.className = 'big-icon reveal-icon';
  battleEndTitle.textContent = `${s.name} laughs. "You've got me!"`;
  if (cardId) {
    const def = cardDef(cardId);
    endCard.classList.add('glow-' + def.rarity);
    battleEndStats.innerHTML = `A signature win, and ${s.name} hands over<br><b>${cardArtHtml(def)} ${def.name}</b> <span class="rarity-tag rt-${def.rarity}" style="margin:4px 0 0">${RARITY_LABEL[def.rarity]}</span>`;
  } else battleEndStats.innerHTML = `Another signature win. <b>+${pebbles} 🫧</b><br><small>The card prize comes once a day.</small>`;
  btGet('battleRetryBtn').classList.add('hidden');
  sparkleBurst(btGet('battleSparkles'), ['🌟', '💞', '✨'], 14);
  sfx('win'); buzz(HAP.win); bumpPill('pillWins');
  logEvent('🌟', `Won a signature match against ${s.name}.`);
}


/* ============================================================
   THE RIVAL
   Rook turns up after your first win and practises in one district at a time, moving on every so often. Beat Rook
   and they go off to rebuild their deck, coming back stronger - eight chapters, then a finale prize found nowhere else.
   Rook lives in a district's npc list while visiting (so wandering, blocking and tapping all just work) and is kept
   in sync with the one true record in state.progress.rival by syncRival().
   ============================================================ */
const RIVAL = {
  id: 'rival-rook', name: 'Rook', icon: '🎭', chapters: 8,
  stayMs: 20 * 60 * 1000,   // how long Rook practises in one district before moving on
  restMs: 8 * 60 * 1000,    // after a loss, Rook goes off to rebuild their deck for a while
  lines: [
    { hello: "You're the one everyone's talking about? Huh. Let's see if the stories are true.", after: "Beginner's luck. Next time I'll bring a real deck." },
    { hello: "I've been practising down by the water. My new cards are itching for a rematch.", after: "Two in a row... fine. I'm going to find better cards." },
    { hello: "I traded half my collection for this deck. It had better be worth it.", after: "It wasn't. Okay. OKAY. I'll train harder." },
    { hello: "I watched you play a district boss. I know your tricks now.", after: "How did you... never mind. I'll be back." },
    { hello: "Do you ever lose? Actually, don't answer. Just play.", after: "You know, you're the first person who's made me want to get better." },
    { hello: "I haven't slept. I rebuilt my deck three times. Ready?", after: "Maybe I've been going about this all wrong." },
    { hello: "No tricks today. Just my best cards and my best game.", after: "One more. Just one more. I'll give it everything." },
    { hello: "This is it. Everything I've learned since the day we met.", after: "...Thank you. Really. Take this - I think it was always meant to be yours." },
  ],
  settled: { hello: "Friendly match, partner? No pressure this time.", after: "Good game, as always. Same time tomorrow?" },
};
function rivalState() {
  const p = state.progress;
  if (!p.rival || typeof p.rival !== 'object') p.rival = { chapter: 0, district: null, arrivedAt: 0, awayUntil: 0, met: false, losses: 0 };
  return p.rival;
}
function rivalAround() { return (state.progress.totals.battlesWon || 0) >= 1; }   // Rook only notices you after your first win
function rivalLine() { const rv = rivalState(); return rv.chapter >= RIVAL.chapters ? RIVAL.settled : RIVAL.lines[rv.chapter]; }
// Rook's deck: mostly rares at first, climbing to supers and mythics by the last chapters.
function rivalDeck(ch) {
  const t = Math.min(1, ch / (RIVAL.chapters - 1));
  const w = { common: 0.30 * (1 - t), rare: 0.45 - 0.30 * t, ultra: 0.20 + 0.15 * t, super: 0.05 + 0.30 * t, mythic: 0.15 * t };
  const roll = () => { let r = Math.random(); for (const k of RARITY_ORDER) { r -= w[k]; if (r <= 0) return k; } return 'rare'; };
  const pool = BASE_COMMONS.slice(0, 4 + Math.max(0, 8 - ch));
  for (let i = 0; i < 16 + ch; i++) pool.push(randomCardId(roll()));
  const counts = {}; pool.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
  return BattleEngine.suggestDeck(counts);
}
function rivalProfile(ch) { return { level: ch < 2 ? 'normal' : 'smart', spirit: Math.min(30, 16 + ch * 2) }; }
function rivalNpc(data) { return data && data.npcs ? data.npcs.find(n => n.isRival) : null; }
// Returns true when the current district's population changed (so the town should redraw).
function syncRival() {
  if (inBattle || talkTo) return false;                    // never pull Rook away mid-conversation or mid-match
  const rv = rivalState(), now = Date.now();
  let where = null, changed = false;
  if (rivalAround() && now >= (rv.awayUntil || 0)) {
    const open = Object.keys(DISTRICTS).filter(districtUnlocked);
    if (!rv.district || !open.includes(rv.district) || now - rv.arrivedAt >= RIVAL.stayMs) {
      const others = open.filter(k => k !== rv.district), from = others.length ? others : open;
      const was = rv.district;
      rv.district = from[Math.floor(Math.random() * from.length)]; rv.arrivedAt = now;
      if (was && was === state.currentDistrict && rv.district !== was) toast(`🎭 Rook heads off toward ${DISTRICTS[rv.district].name}`);
    }
    where = rv.district;
  }
  Object.keys(state.districtData).forEach(k => {
    const d = state.districtData[k], i = d.npcs.findIndex(n => n.isRival);
    if (i >= 0 && k !== where) { d.npcs.splice(i, 1); if (k === state.currentDistrict) changed = true; }
  });
  if (where) {
    const d = ensureDistrictData(where);
    if (!rivalNpc(d)) {
      const s = pickSpot(getMap(where), occupiedSet(d), d, { isBoss: false });
      d.npcs.push({ id: RIVAL.id, name: RIVAL.name, icon: RIVAL.icon, isRival: true, x: s.x, y: s.y, homeX: s.x, homeY: s.y,
                    deck: rivalDeck(rv.chapter), profile: rivalProfile(rv.chapter), rewardCard: null, defeated: false, isBoss: false, justArrived: true });
      if (where === state.currentDistrict) {
        changed = true;
        if (!rv.met) { rv.met = true; toast('🎭 Someone with a deck of cards is watching you…'); logEvent('🎭', `A rival named Rook turned up in ${DISTRICTS[where].name}.`); }
        else toast(`🎭 Rook is practising in ${DISTRICTS[where].name}`);
      }
    }
  }
  if (changed) saveState();
  return changed;
}
function renderRivalTalk(f) {
  const e = talkEls(), rv = rivalState(), done = rv.chapter >= RIVAL.chapters;
  showTipOnce('rival');
  e.name.textContent = `🎭 Rook · ${done ? 'rival and friend' : `rivalry ${rv.chapter}/${RIVAL.chapters}`}`;
  talkSay(`"${rivalLine().hello}"`);
  e.sub.textContent = done ? 'The rivalry is settled, but Rook still loves a match.' : 'Every time you win, Rook comes back with a stronger deck.';
  e.tag.textContent = done ? 'Prize: a rare card or better, and 🫧 10' : rv.chapter === RIVAL.chapters - 1 ? "Prize: Rook's finale card, found nowhere else" : `Prize: ${rivalPrizeLabel(rv.chapter + 1)}`;
  e.main.classList.add('hidden');
  document.getElementById('talkGift').classList.add('hidden');
  document.getElementById('talkDish').classList.add('hidden');
  document.getElementById('talkCardGift').classList.add('hidden');
  document.getElementById('talkCards').classList.add('hidden');
  document.getElementById('talkHearts').classList.add('hidden');
  document.getElementById('talkSig').classList.add('hidden');
  e.fight.textContent = '⚔️ Duel Rook';
}
function rivalPrizeRarity(ch) { return ch <= 2 ? 'rare' : ch <= 5 ? 'ultra' : 'super'; }
function rivalPrizeLabel(ch) { return `${aOrAn(RARITY_LABEL[rivalPrizeRarity(ch)])} card or better`; }
function rivalWin() {
  const npc = battle.npc, rv = rivalState(), done = rv.chapter >= RIVAL.chapters;
  battle.rewarded = true;
  const line = rivalLine().after;
  state.wins++;
  bumpStat('battlesWon', 1); bumpStat('rivalWins', 1);
  let cardId;
  if (!done && rv.chapter === RIVAL.chapters - 1) cardId = 'rooks-ace';
  else if (done) { cardId = randomCardId(rollRewardRarity(false)); addPebbles(10, 'rival'); }
  else { const floor = rivalPrizeRarity(rv.chapter + 1), r = rollRewardRarity(false); cardId = randomCardId(RARITY_ORDER.indexOf(r) < RARITY_ORDER.indexOf(floor) ? floor : r); }
  const isNew = !discoveredSet().has(BattleEngine.baseIdOf(cardId));
  state.ownedCards.push(cardId); noteCardsFound(1); bumpPill('pillCards');
  if (!done) rv.chapter++;
  // Rook leaves to rebuild; the next visit is somewhere new
  rv.awayUntil = Date.now() + RIVAL.restMs; rv.district = null;
  Object.values(state.districtData).forEach(d => { const i = d.npcs.findIndex(n => n.isRival); if (i >= 0) d.npcs.splice(i, 1); });
  saveState();
  const def = cardDef(cardId), icon = btGet('battleEndIcon'), endCard = btGet('battleEndCard');
  icon.textContent = '🎭'; icon.className = 'big-icon reveal-icon';
  endCard.classList.add('glow-' + def.rarity);
  battleEndTitle.textContent = `Rook: "${line}"`;
  battleEndStats.innerHTML = `${!done ? `Rivalry <b>${rv.chapter}/${RIVAL.chapters}</b>. ` : ''}Rook hands over<br><b>${cardArtHtml(def)} ${def.name}</b> <span class="rarity-tag rt-${def.rarity}" style="margin:4px 0 0">${RARITY_LABEL[def.rarity]}</span>${done ? '<br><b>+10 🫧</b>' : ''}`;
  btGet('battleRetryBtn').classList.add('hidden');
  sparkleBurst(btGet('battleSparkles'), ['🎭', '✨', '🌟'], rv.chapter >= RIVAL.chapters && !done ? 24 : 12);
  sfx(!done && rv.chapter >= RIVAL.chapters ? 'mythic' : 'win'); buzz(HAP.win); bumpPill('pillWins');
  logEvent('🎭', !done && rv.chapter >= RIVAL.chapters ? 'Settled the rivalry with Rook - and earned their Ace.' : `Beat Rook (rivalry ${Math.min(rv.chapter, RIVAL.chapters)}/${RIVAL.chapters}).`);
  if (isNew) setTimeout(() => toast('📖 New entry in your Index'), 900);
}


