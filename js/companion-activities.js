/* ============================================================
   THINGS TO DO WITH YOUR COMPANION
   Tap your companion in town (or use "Do something together" on Character → Companion) and a sheet offers what the two of
   you can do, whoever they are (a card, a neighbour, a boss or Rook):
     Chat / Pet / Look around    quick things, no screen change (a pat is worth bond up to three times a day)
     Go for a walk               the two of you wander the district on their own, slowly, and they chat as you go (CWALK)
     Calm together               the Quiet Nook with your companion keeping you company (calmCompanionPresence)
     Sit together                the calm "sit" view with them beside you
     Spar                        a friendly match against their deck or a copy of yours; XP win or lose, no prizes
     Play a game                 tic-tac-toe with spirit cards, or Spirit Trumps (a five-round card game)
     Hide and seek               the original game on the town tiles
     Talk / Challenge            a neighbour or Rook talks as ever; a boss can be challenged on home ground
   Rewards are small and capped each day (companionDay()) so none of it becomes a grind: bond from the first walk, spar,
   game and calm minute of the day, and XP that tapers after the first few. Everything is built from the same pieces the
   rest of the game uses (showCardReveal-style tiles, startBattle, the Calm overlay, the town walk helpers).
   ============================================================ */

/* ---------- what they say: first person, short, a little different every time ---------- */
const COMPANION_TALK = {
  any: ['This is nice.', 'I like walking with you.', 'Do you ever just listen to the town?', 'No hurry, is there?', 'I could do this all day.', 'You walk at a good pace.', 'I was hoping you would come by.', 'Thank you for bringing me.', 'Everything feels a little brighter with company.', 'I noticed something small just now. I forgot what.'],
  clear: ['What a bright day.', 'The light on the stones is lovely today.', 'Not a cloud to worry about.'],
  cloudy: ['Soft light today. I like it.', 'Mist makes the town feel close.', 'Everything looks a little dreamy in this.'],
  rain: ['Listen to the rain on the roofs.', 'I like how the puddles shine.', 'Mind the puddles. Or do not.'],
  storm: ['The air is tingling. Stay close.', 'Big sky today.', 'I do not mind a storm, with you here.'],
  snow: ['Little drifting stars everywhere.', 'It is so quiet in the snow.', 'Look, it is landing on your sleeve.'],
  night: ['The lanterns look like small moons.', 'Nights are for slow walks.', 'Do you think the stars know our names?'],
  places: {
    square: ['El Umbral always smells like warm bread.', 'The old stones here remember a lot.', 'I like the benches. Someone is always just leaving.'],
    market: ['So many voices at once. I love it.', 'Someone is selling something that smells wonderful.', 'Keep your cards close in a crowd.'],
    harbor: ['Hear the water? It is humming along.', 'The boats sound like they are sleeping.', 'I could watch the tide for hours.'],
    garden: ['Everything here is growing, quietly.', 'The flowers keep their own time.', 'Do plants dream, do you think?'],
  },
  perk: {
    spirit: ['I feel steady when I am beside you.', 'If a match comes, I will be right here.'],
    finds: ['I think there is something in the grass. Maybe.', 'Keep your eyes low. Things hide there.'],
    crops: ['Your garden must be doing well.', 'I can feel the seedlings from here.'],
    harvest: ['Harvest days are the best days.', 'Could we bake something later?'],
    chest: ['Somewhere a lock is waiting for a key.', 'I have a feeling about chests today.'],
    fish: ['The fish are talking. It sounds like bubbles.', 'We should visit the water later.'],
    xp: ['You are getting better at all of this.', 'Every day you learn a little more.'],
  },
  kind: {
    card: ['Being a card is mostly waiting. This is better.', 'I used to be in a deck. Now I get to walk.', 'My picture looks good in this light, I think.'],
    spell: ['I only ever last a moment in a match. This is longer.', 'Spells do not usually get walks. Thank you.'],
    npc: ['Folks keep waving at us.', 'I told them I was out with a friend.', 'It is good to have somewhere to be.'],
    boss: ['The town looks smaller from up here.', 'I have promised not to scare anyone. Mostly.', 'Walking is not so different from guarding.'],
    rival: ['Do not think this means I am going easy next time.', 'I am only here to watch your footwork.', 'Your deck is getting scary, you know.'],
  },
  bond: ['I think we are good friends now.', 'I would follow you anywhere. Almost anywhere.', 'You make this town feel like home.'],
};
const COMPANION_CALM_TALK = ['This is peaceful.', 'I am just breathing.', 'Mmm.', 'The quiet is soft today.', 'I am glad we stopped.', 'Nothing needs us right now.'];
let companionRecent = [];
function companionPlayerName() { return (state.character && state.character.name) || 'friend'; }
function companionTalk(c) {
  c = c || state.companion; if (!c) return '';
  const kind = companionKind(c), spell = kind === 'card' && cardDef(c.cardId) && cardDef(c.cardId).spell, T = COMPANION_TALK;
  const pool = [...T.any, ...(T[weatherNow()] || []), ...(isNightNow() ? T.night : []), ...(T.places[state.currentDistrict] || []), ...companionPerks(c).flatMap(k => T.perk[k] || []), ...(T.kind[spell ? 'spell' : kind] || []), ...(bondLevel(c) >= 3 ? T.bond : [])];
  let line, tries = 0;
  do { line = pool[Math.floor(Math.random() * pool.length)]; tries++; } while (companionRecent.includes(line) && tries < 12);
  companionRecent.push(line); if (companionRecent.length > 8) companionRecent.shift();
  return line.replace(/\{you\}/g, companionPlayerName());
}
const companionLine = c => `“${companionTalk(c)}”`;

/* ---------- a speech bubble over the companion in town ---------- */
let compBubble = null, compBubbleTimer = 0;
function companionSay(text, ms) {
  compBubble = { text, until: Date.now() + (ms || 4500) };
  applyCompBubble();
  clearTimeout(compBubbleTimer); compBubbleTimer = setTimeout(applyCompBubble, (ms || 4500) + 30);
}
function applyCompBubble() {                          // also called after every redraw of the town's entities
  const el = typeof townWorld !== 'undefined' && townWorld && townWorld.querySelector('.ent.companion'); if (!el) return;
  let b = el.querySelector('.comp-bubble');
  if (!compBubble || Date.now() > compBubble.until) { if (b) b.remove(); return; }
  if (!b) { b = document.createElement('div'); b.className = 'comp-bubble'; el.appendChild(b); }
  if (b.textContent !== compBubble.text) b.textContent = compBubble.text;
}

/* ---------- rewards: small, and capped each day ---------- */
function companionPlayReward(kind, xpFull) {
  const d = companionDay(), c = state.companion, n = d.plays || 0; d.plays = n + 1;
  const xp = n < 5 ? xpFull : 1;
  addXP(xp);
  let bond = false;
  if (c && !d.playBond) { d.playBond = true; companionGrow(1); bond = true; }
  saveState();
  return { xp, bond };
}

/* ============================================================
   THE HUB
   ============================================================ */
const hubEl = () => document.getElementById('companionHub');
function closeCompanionHub() { hubEl().classList.add('hidden'); }
function inTownNow() { return typeof currentTab !== 'undefined' && currentTab === 'town' && !inBattle && !inScene; }
// Runs fn once the town is showing (the other tabs have no map to walk on).
function whenInTown(fn) {
  if (inBattle || inScene) return;
  if (typeof currentTab !== 'undefined' && currentTab !== 'town') { switchTab('town'); setTimeout(fn, 500); } else fn();
}
function companionTypeText(c) { return typeof companionTypeLabel === 'function' ? companionTypeLabel(c) : ''; }
function openCompanionMenu(line) {                       // the old name stays: the town taps and the stage still call it
  if (!state.companion) { toast('You have no companion yet'); return; }
  if (CWALK.on) stopCompanionWalk('menu');
  drawCompanionHub(line); hubEl().classList.remove('hidden'); sfx('nav'); buzz(HAP.tap);
}
const openCompanionHub = openCompanionMenu;
function companionActivities(c) {
  const kind = companionKind(c);
  const list = [
    { id: 'walk', icon: '🚶', name: 'Go for a walk', text: 'A slow wander. They chat as you go.' },
    { id: 'calm', icon: '🧘', name: 'Calm together', text: 'Breathe, sip tea, watch the stars.' },
    { id: 'sit', icon: '🪑', name: 'Sit together', text: 'Just sit for a while.' },
    { id: 'spar', icon: '⚔️', name: 'Spar', text: 'A friendly match. XP win or lose.' },
    { id: 'games', icon: '🎲', name: 'Play a game', text: 'Tic-tac-toe or Spirit Trumps.' },
    { id: 'hide', icon: '🙈', name: 'Hide and seek', text: 'They hide, you find them.' },
  ];
  if (kind === 'npc') list.push({ id: 'talk', icon: '🗣️', name: 'Talk properly', text: 'Gifts, favours, a real chat.' });
  if (kind === 'rival') list.push({ id: 'talk', icon: '🎭', name: 'Talk or duel', text: 'The usual rivalry.' });
  if (kind === 'boss') list.push({ id: 'challenge', icon: '👑', name: 'Challenge', text: 'A real duel, on home ground.' });
  list.push({ id: 'page', icon: '🧭', name: 'Companion page', text: 'Perks, bond and who is with you.' });
  return list;
}
function drawCompanionHub(line) {
  const c = state.companion; if (!c) return;
  const lv = bondLevel(c), bondName = ['', 'Friendly', 'Trusted', 'Inseparable'][lv];
  const perks = companionPerks(c).map(k => `<span>${COMPANION_PERKS[k].icon} ${COMPANION_PERKS[k].text}</span>`).join('');
  hubEl().querySelector('.overlay-card').innerHTML = `
    <div class="chb-head"><div class="chb-portrait">${companionIconHtml(c)}</div>
      <div class="chb-who"><b>${escapeHtml(c.name)}</b><small>${escapeHtml(companionTypeText(c))}</small>
        <div class="cp-bond"><span class="cp-bond-bar">${[1, 2, 3].map(i => `<i class="${lv >= i ? 'on' : ''}"></i>`).join('')}</span><span class="cp-bond-name">${bondName}</span></div></div>
      <button class="coll-clear" id="chbClose">Close</button></div>
    <div class="chb-perks">${perks}</div>
    <div class="chb-say" id="chbSay">${line ? escapeHtml(line) : `“${escapeHtml(companionTrait(c))}”`}</div>
    <div class="chb-quick"><button data-chb="chat">💬 Chat</button><button data-chb="pet">🤚 Pet</button><button data-chb="look">👀 Look around</button></div>
    <div class="chb-grid">${companionActivities(c).map(a => `<button class="chb-act" data-chb="${a.id}"><span class="chb-ai">${a.icon}</span><b>${a.name}</b><small>${a.text}</small></button>`).join('')}</div>`;
}
function companionHubBody(html) {                          // swap the grid for a small chooser (spar, games) with a Back button
  const card = hubEl().querySelector('.overlay-card');
  card.querySelector('.chb-quick').classList.add('hidden'); card.querySelector('.chb-perks').classList.add('hidden');
  const g = card.querySelector('.chb-grid'); g.className = 'chb-choose'; g.innerHTML = html + '<button class="btn btn-ghost" data-chb="back">Back</button>';
}
hubEl().addEventListener('click', e => {
  if (e.target.id === 'companionHub') { closeCompanionHub(); return; }
  const b = e.target.closest('[data-chb]'); if (!b) return;
  const c = state.companion; if (!c) { closeCompanionHub(); return; }
  const act = b.dataset.chb, say = document.getElementById('chbSay');
  sfx('tap'); buzz(HAP.tap);
  if (act === 'chat') { say.textContent = companionLine(c); if (inTownNow()) companionSay(say.textContent.replace(/[“”]/g, ''), 3600); }
  else if (act === 'pet') { const t = petCompanion(); drawCompanionHub(t); }
  else if (act === 'look') { if (!inTownNow()) { say.textContent = 'Out in town, I can show you. Let us go for a look.'; return; } say.textContent = companionLookAround(); }
  else if (act === 'back') drawCompanionHub();
  else if (act === 'walk') { closeCompanionHub(); whenInTown(startCompanionWalk); }
  else if (act === 'calm') { closeCompanionHub(); openCalm(); }
  else if (act === 'sit') { closeCompanionHub(); whenInTown(() => calmSit(c.name)); }
  else if (act === 'hide') { closeCompanionHub(); whenInTown(() => { showTipOnce('companionPlay'); startHideSeek(); }); }
  else if (act === 'spar') companionHubBody(`<p class="chb-note">A friendly match. You earn XP win or lose, and there are no prizes.</p>
    <button class="chb-act" data-chb="spar-mirror"><span class="chb-ai">🪞</span><b>Mirror match</b><small>They play a copy of your deck.</small></button>
    <button class="chb-act" data-chb="spar-own"><span class="chb-ai">🃏</span><b>Their own deck</b><small>${companionKind(c) === 'card' || companionKind(c) === 'npc' ? 'Built around who they are.' : 'The deck they are known for.'}</small></button>`);
  else if (act === 'spar-mirror' || act === 'spar-own') { closeCompanionHub(); whenInTown(() => startCompanionSpar(act === 'spar-own' ? 'own' : 'mirror')); }   // from Character -> Companion the battle needs the town screen under it, or part of the tab shows through
  else if (act === 'games') companionHubBody(`<p class="chb-note">Small rewards for playing, and a little more bond the first time each day.</p>
    <button class="chb-act" data-chb="game-ttt"><span class="chb-ai">⭕</span><b>Tic-tac-toe</b><small>Your spirit against theirs.</small></button>
    <button class="chb-act" data-chb="game-trumps"><span class="chb-ai">🂠</span><b>Spirit Trumps</b><small>Five rounds, five of your cards.</small></button>`);
  else if (act === 'game-ttt' || act === 'game-trumps') { closeCompanionHub(); openCompanionGame(act === 'game-ttt' ? 'ttt' : 'trumps'); }
  else if (act === 'talk') { closeCompanionHub(); const o = companionNpcObj(c); if (o) openTalk(o); }
  else if (act === 'challenge') { closeCompanionHub(); const o = companionNpcObj(c); if (o) whenInTown(() => interactWith('fight', o)); }
  else if (act === 'page') { closeCompanionHub(); switchTab('character'); if (typeof charSetView === 'function') charSetView('pals'); }
  else if (act === 'close') closeCompanionHub();
});
document.addEventListener('click', e => { if (e.target.id === 'chbClose') { sfx('nav'); closeCompanionHub(); } });

/* ============================================================
   AUTO WALKS
   The player and companion wander the district on their own, one tile every CWALK_STEP_MS (a relaxed pace), picking a new
   random spot each leg and pausing to look around. The companion chats in bubbles. Any tap, another screen, a match or
   a building stops it, and a walk of a minute or so leaves you a little closer (three a day).
   ============================================================ */
const CWALK_STEP_MS = 720, CWALK_MAX_MS = 6 * 60 * 1000;
const CWALK = { on: false, token: 0, started: 0, steps: 0, saved: 140, timers: [], talk: 0, fails: 0 };
function companionWalkActive() { return CWALK.on; }
function cwalkLater(fn, ms) { const t = setTimeout(fn, ms); CWALK.timers.push(t); return t; }
function cwalkPaused() { return !!document.querySelector('.overlay:not(.hidden)') || (typeof HIDESEEK !== 'undefined' && HIDESEEK.active); }
function cwalkAlive(token) {
  if (!CWALK.on || token !== CWALK.token) return false;
  if (inBattle || inScene || !state.companion || (typeof currentTab !== 'undefined' && currentTab !== 'town') || document.hidden) { stopCompanionWalk('interrupted'); return false; }
  if (Date.now() - CWALK.started > CWALK_MAX_MS) { stopCompanionWalk('done'); return false; }
  return true;
}
function cwalkTileOk(m, data, x, y) {
  const k = x + ',' + y;
  if (x < 0 || y < 0 || x >= m.w || y >= m.h || m.solid[y][x] || !m.reach[y][x] || m.entries[k] || m.exits[k] || m.rows[y][x] === 'b') return false;
  if (data.chest && data.chest.x === x && data.chest.y === y) return false;
  return !data.items.some(it => !it.collected && it.x === x && it.y === y);
}
function startCompanionWalk() {
  const c = state.companion; if (!c || CWALK.on || inBattle || inScene || !townWorld) return;
  if (typeof HIDESEEK !== 'undefined' && HIDESEEK.active) return;
  cancelWalk(); setChase(null); pendingWalk = null; camRelease();
  CWALK.on = true; CWALK.token++; CWALK.started = Date.now(); CWALK.steps = 0; CWALK.fails = 0; CWALK.saved = STEP_MS; STEP_MS = CWALK_STEP_MS;
  const pill = document.getElementById('compWalkPill'); pill.querySelector('b').textContent = c.name; pill.classList.remove('hidden');
  sfx('nav'); buzz(HAP.tap);
  const token = CWALK.token;
  cwalkLater(() => { if (cwalkAlive(token)) companionSay(companionTalk(c), 4200); }, 1800);
  CWALK.talk = setInterval(() => { if (CWALK.on && !cwalkPaused() && cwalkAlive(token)) companionSay(companionTalk(state.companion), 4800); }, 9000);
  cwalkLeg(token);
}
function cwalkLeg(token) {
  if (!cwalkAlive(token)) return;
  if (cwalkPaused()) { cwalkLater(() => cwalkLeg(token), 900); return; }
  const m = getMap(state.currentDistrict), data = ensureDistrictData(state.currentDistrict), p = state.playerPos;
  let path = null;
  for (let i = 0; i < 40 && !path; i++) {
    const r = 3 + Math.floor(Math.random() * 9), a = Math.random() * Math.PI * 2, tx = Math.round(p.x + Math.cos(a) * r), ty = Math.round(p.y + Math.sin(a) * r);
    if ((tx === p.x && ty === p.y) || !cwalkTileOk(m, data, tx, ty)) continue;
    const pth = findPath(m, data, p, (x, y) => x === tx && y === ty);
    if (pth && pth.length >= 3 && pth.length <= 24 && pth.every(t => cwalkTileOk(m, data, t.x, t.y))) path = pth;
  }
  if (!path) { if (++CWALK.fails > 5) { stopCompanionWalk('done'); return; } cwalkLater(() => cwalkLeg(token), 2000); return; }
  CWALK.fails = 0;
  cwalkStep(path, 0, token);
}
function cwalkStep(path, i, token) {
  if (!cwalkAlive(token)) return;
  if (cwalkPaused()) { cwalkLater(() => cwalkStep(path, i, token), 900); return; }
  if (i >= path.length) { playerEl.classList.remove('walking'); saveState(); cwalkLater(() => cwalkLeg(token), 2500 + Math.random() * 3500); return; }
  const p = path[i], prev = state.playerPos;
  state.playerPos = { x: p.x, y: p.y };
  followPlayer(prev); positionPlayer(true); updateCamera(true);
  const ce = townWorld.querySelector('.ent.companion'); if (ce) ce.style.transition = `left ${STEP_MS}ms linear, top ${STEP_MS}ms linear`;   // a slow glide for them too
  playerEl.classList.add('walking');
  CWALK.steps++; if (CWALK.steps % 3 === 1) { sfx('step'); }
  bumpStat('steps', 1); noteStep(p.x, p.y); lifeStep(p.x, p.y);
  cwalkLater(() => cwalkStep(path, i + 1, token), STEP_MS);
}
function stopCompanionWalk(why) {
  if (!CWALK.on) return;
  const c = state.companion, secs = (Date.now() - CWALK.started) / 1000, steps = CWALK.steps;
  CWALK.on = false; CWALK.token++; CWALK.timers.forEach(clearTimeout); CWALK.timers = []; clearInterval(CWALK.talk);
  STEP_MS = CWALK.saved;
  document.getElementById('compWalkPill').classList.add('hidden');
  if (playerEl) playerEl.classList.remove('walking');
  const ce = townWorld && townWorld.querySelector('.ent.companion'); if (ce) ce.style.transition = '';
  if (c && secs >= 45 && steps >= 20) {
    const d = companionDay();
    if ((d.walks || 0) < 3) { d.walks = (d.walks || 0) + 1; companionGrow(1); addXP(8); toast(`🌿 A lovely walk with ${c.name} · +1 bond, +8 XP`); }
    else toast(`🌿 A lovely walk with ${c.name}`);
    if (why !== 'interrupted') companionSay('That was lovely. Thank you.', 3600);
  }
  saveState();
  if (typeof renderTown === 'function' && currentTab === 'town') renderTown();
}
document.getElementById('compWalkPill').addEventListener('click', () => { sfx('tap'); stopCompanionWalk('tap'); });

/* ============================================================
   SPARRING
   ============================================================ */
function sparDeck(c, mode) {
  let deck = null;
  if (mode === 'mirror') deck = state.deck.slice();
  else {
    const kind = companionKind(c);
    if (kind === 'card') {
      const d = cardDef(c.cardId), fam = d && !d.spell ? CARD_FAMILY[BattleEngine.baseIdOf(c.cardId)] : null;
      if (fam) {
        const counts = {}; CARD_POOL.filter(x => !x.exclusive && !x.spell && CARD_FAMILY[x.id] === fam && RARITY_ORDER.indexOf(x.rarity) <= 3).forEach(x => { counts[x.id] = 2; });
        counts[c.cardId] = 2; BASE_COMMONS.forEach(id => { counts[id] = Math.max(counts[id] || 0, 1); });
        deck = BattleEngine.suggestDeck(counts);
      }
    } else if (kind === 'rival') deck = rivalDeck(rivalState().chapter);
    else if (c.npc && Array.isArray(c.npc.deck)) deck = c.npc.deck.slice();
  }
  deck = (deck || []).filter(id => !!cardDef(id));
  if (deck.length !== DECK_SIZE) deck = buildDeckForOpponent(DECK_SIZE, companionKind(c) === 'boss');
  return deck;
}
function startCompanionSpar(mode) {
  const c = state.companion; if (!c || inBattle || inScene) return;
  if (state.deck.filter(id => !!cardDef(id)).length < DECK_SIZE) { toast(`Fill your ${DECK_SIZE}-card deck first (Cards → Deck)`); return; }
  const opp = { id: 'spar-' + companionKey(c), name: c.name, icon: c.icon, deck: sparDeck(c, mode), profile: { level: bondLevel(c) >= 3 ? 'smart' : 'normal', spirit: 20 },
                rewardCard: null, defeated: false, isBoss: false, spar: { mode } };
  startBattle(opp);
}
// Called from btShowResult: XP win or lose, full for the first three a day, and the first of the day brings you closer.
function sparResult() {
  const won = battle.G.winner === 0, yielded = battle.G.why === 'yield', npc = battle.npc, d = companionDay(), n = d.spars || 0;
  const full = n < 3, xp = yielded ? 0 : won ? (full ? 20 : 4) : (full ? 10 : 2);
  let bond = false;
  if (!yielded) { d.spars = n + 1; if (xp) addXP(xp); if (state.companion && !d.sparBond) { d.sparBond = true; companionGrow(1); bond = true; } }
  saveState();
  const icon = btGet('battleEndIcon'); icon.textContent = npc.icon || '⚔️'; icon.className = 'big-icon' + (won ? ' reveal-icon' : '');
  battleEndTitle.textContent = yielded ? 'You stepped away.' : won ? `You beat ${npc.name}!` : `${npc.name} wins this one.`;
  battleEndStats.innerHTML = yielded ? 'No cost to you. Come back any time.' : `${won ? 'A fine match.' : 'A close one. They grin.'}<br><b>+${xp} XP</b>${bond ? ' · <b>+1 bond</b>' : ''}${full ? '' : '<br><small>Plenty of sparring today: a little less XP now.</small>'}`;
  btGet('battleRetryBtn').classList.remove('hidden'); btGet('battleSparkles').innerHTML = '';
  if (won) { sparkleBurst(btGet('battleSparkles'), ['✨', '💞'], 10); sfx('win'); buzz(HAP.win); } else sfx('soft');
}

/* ============================================================
   GAMES (a shared sheet, #companionGame)
   ============================================================ */
const gameEl = () => document.getElementById('companionGame'), gameBody = () => document.getElementById('cgBody');
let cgCur = null, cgState = null;
function openCompanionGame(id) {
  if (!state.companion || inBattle) return;
  cgCur = id; cgState = null;
  document.getElementById('cgTitle').textContent = id === 'ttt' ? 'Tic-tac-toe' : 'Spirit Trumps';
  gameEl().classList.remove('hidden'); sfx('nav'); buzz(HAP.tap);
  if (id === 'ttt') tttStart(true); else trumpsStart();
}
function closeCompanionGame() { gameEl().classList.add('hidden'); cgCur = null; cgState = null; }
document.getElementById('cgClose').addEventListener('click', () => { sfx('nav'); closeCompanionGame(); });
gameEl().addEventListener('click', e => { if (e.target.id === 'companionGame') closeCompanionGame(); });
const cgSkill = c => ({ 1: 0.35, 2: 0.2, 3: 0.08 }[bondLevel(c)] || 0.35) - (['boss', 'rival'].includes(companionKind(c)) ? 0.1 : 0);   // how often they slip up
function cgOwnedCreatures() { const ids = Object.keys(ownedCardCounts()).filter(id => { const d = cardDef(id); return d && !d.spell && d.rarity !== 'atlas'; }); return ids.length ? ids : BASE_COMMONS.filter(id => cardDef(id)); }
const cgPick = arr => arr[Math.floor(Math.random() * arr.length)];
function cgFinish(kind, result, xp, lines) {                         // result: 'win' | 'draw' | 'loss'
  const c = state.companion, r = companionPlayReward(kind, xp[result]);
  return `<div class="cg-result ${result}"><b>${result === 'win' ? 'You win!' : result === 'draw' ? 'A draw.' : `${escapeHtml(c.name)} wins.`}</b><span>“${escapeHtml(cgPick(lines[result]))}”</span><small>+${r.xp} XP${r.bond ? ' · +1 bond' : ''}</small></div>`;
}

/* ----- tic-tac-toe: your spirit against theirs ----- */
const TTT_LINES = {
  win: ['Well played. I did not see that coming.', 'You got me. Again some time?', 'That was a clever line. I am impressed.'],
  draw: ['Neither of us gave an inch.', 'A draw. We are well matched.', 'Evenly matched, you and I.'],
  loss: ['Got you! Do not worry, you were close.', 'I had a good feeling about that corner.', 'Better luck next round, friend.'],
};
const TTT_LINES3 = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
function tttWinner(b) { for (const l of TTT_LINES3) if (b[l[0]] && b[l[0]] === b[l[1]] && b[l[0]] === b[l[2]]) return b[l[0]]; return b.every(Boolean) ? 'draw' : null; }
function tttMinimax(b, turn) {                                       // 'me' is the player, 'ai' the companion
  const w = tttWinner(b); if (w) return w === 'ai' ? 1 : w === 'me' ? -1 : 0;
  let best = turn === 'ai' ? -2 : 2;
  b.forEach((v, i) => { if (v) return; b[i] = turn; const s = tttMinimax(b, turn === 'ai' ? 'me' : 'ai'); b[i] = null; best = turn === 'ai' ? Math.max(best, s) : Math.min(best, s); });
  return best;
}
function tttAiMove(b, c) {
  const empty = b.map((v, i) => v ? -1 : i).filter(i => i >= 0);
  if (Math.random() < cgSkill(c)) return cgPick(empty);               // an honest slip-up
  let bestScore = -2, moves = [];
  empty.forEach(i => { b[i] = 'ai'; const s = tttMinimax(b, 'me'); b[i] = null; if (s > bestScore) { bestScore = s; moves = [i]; } else if (s === bestScore) moves.push(i); });
  return cgPick(moves);
}
function tttStart(playerFirst) {
  cgState = { board: Array(9).fill(null), over: false, first: playerFirst, mark: cgState && cgState.mark || cgPick(cgOwnedCreatures()), msg: '', result: '' };
  tttRender();
  if (!playerFirst) setTimeout(tttAiTurn, 500);
}
function tttRender() {
  const c = state.companion, s = cgState; if (!c || !s) return;
  const me = cardDef(s.mark), meHtml = me ? cardArtHtml(me) : '🙂', aiHtml = companionIconHtml(c);
  gameBody().innerHTML = `<p class="cg-line">${s.over ? '' : s.msg || 'Tap a square to place your spirit.'}</p>
    <div class="cg-ttt" id="cgTtt">${s.board.map((v, i) => `<button class="cg-cell${v ? ' set ' + v : ''}" data-cell="${i}" ${v || s.over ? 'disabled' : ''} aria-label="Square ${i + 1}">${v === 'me' ? meHtml : v === 'ai' ? aiHtml : ''}</button>`).join('')}</div>
    ${s.result}
    <div class="cg-foot"><button class="btn btn-ghost" id="cgSwap">Change my spirit</button><button class="btn" id="cgAgain">${s.over ? 'Play again' : 'Start over'}</button></div>`;
  document.getElementById('cgTtt').addEventListener('click', e => { const b = e.target.closest('[data-cell]'); if (b) tttPlay(+b.dataset.cell); });
  document.getElementById('cgSwap').addEventListener('click', () => { const ids = cgOwnedCreatures(); s.mark = cgPick(ids); sfx('tap'); tttRender(); });
  document.getElementById('cgAgain').addEventListener('click', () => { sfx('tap'); tttStart(!s.first); });
}
function tttPlay(i) {
  const s = cgState; if (!s || s.over || s.board[i] || s.waiting) return;
  s.board[i] = 'me'; sfx('tap'); buzz(HAP.tap);
  if (!tttCheck()) { s.waiting = true; s.msg = `${state.companion.name} is thinking…`; tttRender(); setTimeout(tttAiTurn, 550); } else tttRender();
}
function tttAiTurn() {
  const s = cgState, c = state.companion; if (!s || !c || cgCur !== 'ttt' || s.over) return;
  s.waiting = false; s.board[tttAiMove(s.board, c)] = 'ai'; sfx('tap');
  s.msg = ''; tttCheck(); tttRender();
}
function tttCheck() {
  const s = cgState, w = tttWinner(s.board); if (!w) return false;
  s.over = true; const res = w === 'me' ? 'win' : w === 'ai' ? 'loss' : 'draw';
  s.result = cgFinish('ttt', res, { win: 10, draw: 5, loss: 3 }, TTT_LINES);
  if (res === 'win') { sfx('win'); buzz(HAP.win); } else sfx('soft');
  return true;
}

/* ----- Spirit Trumps: five of your spirits against five of theirs, one stat called each round ----- */
const TRUMP_STATS = { power: { icon: '⚔️', label: 'Power', get: d => d.power }, grit: { icon: '♥', label: 'Health', get: d => d.grit } };
const TRUMP_LINES = {
  win: ['You read the wind better than I did.', 'Your spirits are strong. I am proud of them.', 'Good hands win games. Yours were good.'],
  draw: ['Five rounds and not a point between us.', 'A fair fight, start to finish.', 'Neither wind favoured either of us.'],
  loss: ['My spirits had a good day.', 'The wind was kind to me, that is all.', 'You almost had me in the third round.'],
};
function trumpsDeal(c) {
  const mine = [], pool = cgOwnedCreatures().slice();
  while (mine.length < 5 && pool.length) mine.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  while (mine.length < 5) mine.push(cgPick(BASE_COMMONS.filter(id => cardDef(id))));
  const maxR = Math.max(...mine.map(id => RARITY_ORDER.indexOf(cardDef(id).rarity)));
  let theirs = [];
  if (c.npc && Array.isArray(c.npc.deck)) theirs = [...new Set(c.npc.deck.filter(id => { const d = cardDef(id); return d && !d.spell; }))];
  if (companionKind(c) === 'card' && cardDef(c.cardId) && !cardDef(c.cardId).spell) theirs = [c.cardId];
  const rest = CARD_POOL.filter(x => !x.exclusive && !x.spell && RARITY_ORDER.indexOf(x.rarity) <= Math.max(1, maxR)).map(x => x.id);
  theirs = theirs.sort(() => Math.random() - 0.5).slice(0, 5);
  while (theirs.length < 5) { const id = cgPick(rest); if (!theirs.includes(id)) theirs.push(id); }
  return { mine, theirs };
}
function trumpsStart() {
  const c = state.companion, { mine, theirs } = trumpsDeal(c);
  cgState = { mine, theirs, usedMine: [], usedTheirs: [], round: 0, stat: cgPick(Object.keys(TRUMP_STATS)), score: [0, 0], reveal: null, over: false, result: '' };
  trumpsRender();
}
function trumpsRender() {
  const c = state.companion, s = cgState; if (!c || !s) return;
  const st = TRUMP_STATS[s.stat], tile = id => `<span class="cr-tile">${cardTileHtml(id, 0)}</span>`;
  let head = `<div class="cg-score"><b>You ${s.score[0]}</b><span>Round ${Math.min(5, s.round + 1)} of 5</span><b>${s.score[1]} ${escapeHtml(c.name)}</b></div>`;
  let mid = '';
  if (s.reveal) {
    const r = s.reveal;
    mid = `<div class="cg-reveal"><div>${tile(r.me)}<small>You · ${st.icon} ${TRUMP_STATS[r.stat].get(cardDef(r.me))}</small></div><div class="cg-vs ${r.res}">${r.res === 'win' ? 'You take it' : r.res === 'loss' ? 'They take it' : 'Tied'}</div><div>${tile(r.ai)}<small>${escapeHtml(c.name)} · ${st.icon} ${TRUMP_STATS[r.stat].get(cardDef(r.ai))}</small></div></div>`;
  } else mid = `<p class="cg-line">The wind calls <b>${st.icon} ${st.label}</b>. Play a spirit.</p>`;
  const hand = s.mine.map((id, i) => `<div class="cg-hcard${s.usedMine.includes(i) ? ' used' : ''}" ${s.usedMine.includes(i) || s.reveal || s.over ? '' : `data-play="${i}" role="button"`} aria-label="${escapeHtml(cardDef(id).name)}">${tile(id)}</div>`).join('');
  gameBody().innerHTML = `${head}${mid}<div class="cg-hand">${hand}</div>${s.over ? s.result : ''}
    <div class="cg-foot">${s.reveal && !s.over ? '<button class="btn" id="cgNext">Next round</button>' : ''}${s.over ? '<button class="btn" id="cgAgain">Play again</button>' : ''}</div>`;
  gameBody().querySelectorAll('[data-play]').forEach(b => b.addEventListener('click', () => trumpsPlay(+b.dataset.play)));
  const nx = document.getElementById('cgNext'); if (nx) nx.addEventListener('click', () => { sfx('tap'); s.round++; s.reveal = null; s.stat = cgPick(Object.keys(TRUMP_STATS)); trumpsRender(); });
  const ag = document.getElementById('cgAgain'); if (ag) ag.addEventListener('click', () => { sfx('tap'); trumpsStart(); });
}
function trumpsPlay(i) {
  const c = state.companion, s = cgState; if (!c || !s || s.reveal || s.over || s.usedMine.includes(i)) return;
  const stat = TRUMP_STATS[s.stat], get = id => stat.get(cardDef(id));
  const left = s.theirs.map((id, k) => k).filter(k => !s.usedTheirs.includes(k));
  const best = left.slice().sort((a, b) => get(s.theirs[b]) - get(s.theirs[a]))[0];
  const k = Math.random() < cgSkill(c) ? cgPick(left) : best;           // sometimes they just play the wrong one
  s.usedMine.push(i); s.usedTheirs.push(k);
  const a = get(s.mine[i]), b = get(s.theirs[k]), res = a > b ? 'win' : a < b ? 'loss' : 'draw';
  if (res === 'win') s.score[0]++; else if (res === 'loss') s.score[1]++;
  s.reveal = { me: s.mine[i], ai: s.theirs[k], stat: s.stat, res }; sfx(res === 'win' ? 'claim' : 'tap'); buzz(HAP.tap);
  if (s.round >= 4) {
    s.over = true; const r = s.score[0] > s.score[1] ? 'win' : s.score[0] < s.score[1] ? 'loss' : 'draw';
    s.result = cgFinish('trumps', r, { win: 14, draw: 7, loss: 4 }, TRUMP_LINES);
    if (r === 'win') { sfx('win'); buzz(HAP.win); }
  }
  trumpsRender();
}

/* ============================================================
   CALM TOGETHER: your companion keeps you company in the Quiet Nook (called from calmRender in js/calm.js)
   ============================================================ */
function calmCompanionPresence(body) {
  const c = state.companion; if (!c) return;
  const el = document.createElement('div'); el.className = 'calm-comp';
  el.innerHTML = `<span class="calm-comp-ico">${companionIconHtml(c)}</span><span class="calm-comp-say">${escapeHtml(c.name)} keeps you company.</span>`;
  body.appendChild(el);
  const say = el.querySelector('.calm-comp-say');
  calmEvery(() => { say.classList.add('fade'); setTimeout(() => { say.textContent = COMPANION_CALM_TALK[Math.floor(Math.random() * COMPANION_CALM_TALK.length)]; say.classList.remove('fade'); }, 500); }, 15000);
  calmLater(() => {                                         // a quiet minute together leaves you closer, once a day
    const d = companionDay(); if (d.calm || !state.companion) return;
    d.calm = true; companionGrow(1); saveState(); toast(`🌿 A quiet minute with ${state.companion.name} · +1 bond`);
  }, 60000);
}
