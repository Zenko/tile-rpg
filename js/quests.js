/* ============================================================
   QUESTS, ACHIEVEMENTS AND THE REWARDS SCREEN
   Moved out of js/progression.js. Loads straight after it; progression.js keeps tips, levelling, the Ember ledger, the DOM
   handles, save/load and the opponent/reward helpers. Everything here is looked up at run time, so the split changes no behaviour.
   ============================================================ */
// STEP_QUEST_TIERS, QUEST_POOL, WEEKLY_QUEST_POOL, ACHIEVEMENTS: in content/guide.js (the game's words and data, kept apart from the code)




const DAILY_QUEST_COUNT = 20;
const WEEKLY_QUEST_COUNT = 20;

// Draws `count` quests from `pool`, preferring one of each stat before repeating any - used for both
// dailies and weekly quests so a fresh set stays varied even at a count larger than the number of stats.
function drawQuestSet(pool, count) {
  const shuffled = shuffle(pool.slice());
  const picked = [], usedStats = new Set();
  for (const q of shuffled) {
    if (picked.length >= count) break;
    if (usedStats.has(q.stat)) continue;
    usedStats.add(q.stat);
    picked.push(q);
  }
  for (const q of shuffled) {
    if (picked.length >= count) break;
    if (picked.includes(q)) continue;
    picked.push(q);
  }
  return picked;
}

function ensureQuests() {
  const pr = state.progress;
  const today = todayKey();
  // Also redraw if a saved quest points at an id that no longer exists in QUEST_POOL (e.g. after a
  // pool edit) - otherwise questDef(id) returns undefined and every caller downstream throws.
  const stale = pr.quests.some(q => !questDef(q.id));
  if (pr.questDay === today && pr.quests.length && !stale) return;
  // New day: draw a fresh set of quests, baseline against current totals so progress starts at 0 today
  const picked = drawQuestSet(QUEST_POOL, DAILY_QUEST_COUNT)
    .map(q => ({ id: q.id, base: pr.totals[q.stat] || 0, claimed: false }));
  pr.questDay = today;
  pr.quests = picked;
  saveState();
}

function questDef(id) { return QUEST_POOL.find(q => q.id === id); }
function questProgress(q) {
  const def = questDef(q.id);
  return Math.min(def.goal, Math.max(0, (state.progress.totals[def.stat] || 0) - q.base));
}

// Simple year+week-number key - doesn't need to be calendar-precise, just needs to change once a week.
function weekKey() {
  const d = new Date();
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
  return d.getFullYear() + '-W' + week;
}
function ensureWeeklyQuests() {
  const pr = state.progress;
  if (!Array.isArray(pr.weeklyQuests)) pr.weeklyQuests = [];
  if (typeof pr.weekKey !== 'string') pr.weekKey = null;
  const wk = weekKey();
  const stale = pr.weeklyQuests.some(q => !weeklyQuestDef(q.id));
  if (pr.weekKey === wk && pr.weeklyQuests.length && !stale) return;
  // New week: draw a fresh set of weekly quests, baselined against current totals like dailies
  const picked = drawQuestSet(WEEKLY_QUEST_POOL, WEEKLY_QUEST_COUNT)
    .map(q => ({ id: q.id, base: pr.totals[q.stat] || 0, claimed: false }));
  pr.weekKey = wk;
  pr.weeklyQuests = picked;
  saveState();
}
function weeklyQuestDef(id) { return WEEKLY_QUEST_POOL.find(q => q.id === id); }
function weeklyQuestProgress(q) {
  const def = weeklyQuestDef(q.id);
  return Math.min(def.goal, Math.max(0, (state.progress.totals[def.stat] || 0) - q.base));
}

// Completed dailies and weeklies both land here, newest first - what the Journal's Quest Log shows under "Completed".
const QUEST_HISTORY_MAX = 100;
function ensureQuestHistory() {
  const pr = state.progress;
  if (!Array.isArray(pr.questHistory)) pr.questHistory = [];
  return pr.questHistory;
}
function logQuestHistory(kind, def, rewardCardId) {
  const hist = ensureQuestHistory();
  hist.unshift({ kind, icon: def.icon, name: def.name, reward: cardDef(rewardCardId).rarity, at: Date.now() });
  if (hist.length > QUEST_HISTORY_MAX) hist.length = QUEST_HISTORY_MAX;
}

function giftReady() { return state.progress.lastGift !== todayKey(); }

function claimDailyGift() {
  if (!giftReady()) return;
  const pr = state.progress;
  // Streak continues only if the last claim was yesterday
  const y = new Date(); y.setDate(y.getDate() - 1);
  const yKey = y.getFullYear() + '-' + String(y.getMonth() + 1).padStart(2, '0') + '-' + String(y.getDate()).padStart(2, '0');
  pr.giftStreak = (pr.lastGift === yKey) ? pr.giftStreak + 1 : 1;
  pr.lastGift = todayKey();

  // Gift is always at least rare; streak nudges the odds upward, never punishes a gap
  const bonus = Math.min(pr.giftStreak, 7) * 0.03;
  let rarity = 'rare';
  const r = Math.random();
  if (r < 0.04 + bonus * 0.4) rarity = 'super';
  else if (r < 0.25 + bonus) rarity = 'ultra';
  const id = randomCardId(rarity);
  state.ownedCards.push(id);
  noteCardsFound(1);
  saveState();
  updateHud();
  showCardReveal(id, `Daily gift · day ${pr.giftStreak}`, true);
  renderQuests();
  checkAchievements();
}

// batch=true skips the reveal and redraw so "Claim all" can do one reveal at the end; both return the card id.
function claimQuest(index, batch) {
  const q = state.progress.quests[index];
  if (!q || q.claimed) return null;
  const def = questDef(q.id);
  if (questProgress(q) < def.goal) return null;
  q.claimed = true;
  const id = randomCardId(def.reward);
  state.ownedCards.push(id);
  noteCardsFound(1);
  logQuestHistory('daily', def, id);
  logEvent('🎯', `Completed quest: ${def.name} · ${RARITY_LABEL[cardDef(id).rarity]} reward.`);
  if (batch) return id;
  saveState();
  updateHud();
  showCardReveal(id, 'Quest complete', true);
  renderQuests();
  checkAchievements();
  return id;
}

function claimWeeklyQuest(index, batch) {
  const q = state.progress.weeklyQuests[index];
  if (!q || q.claimed) return null;
  const def = weeklyQuestDef(q.id);
  if (weeklyQuestProgress(q) < def.goal) return null;
  q.claimed = true;
  const id = randomCardId(def.reward);
  state.ownedCards.push(id);
  noteCardsFound(1);
  logQuestHistory('weekly', def, id);
  logEvent('🏵️', `Completed weekly quest: ${def.name} · ${RARITY_LABEL[cardDef(id).rarity]} reward.`);
  if (batch) return id;
  saveState();
  updateHud();
  showCardReveal(id, 'Weekly quest complete', true);
  renderQuests();
  checkAchievements();
  return id;
}

// Claim every finished quest in one go (v Beta 2): one reveal for the best card, a note for the rest.
function claimAllQuests(kind) {
  const weekly = kind === 'weekly', list = weekly ? state.progress.weeklyQuests : state.progress.quests, ids = [];
  list.forEach((q, i) => { const id = weekly ? claimWeeklyQuest(i, true) : claimQuest(i, true); if (id) ids.push(id); });
  if (!ids.length) return;
  saveState(); updateHud();
  const best = ids.slice().sort((a, b) => RARITY_ORDER.indexOf(cardDef(b).rarity) - RARITY_ORDER.indexOf(cardDef(a).rarity))[0];
  showCardReveal(best, ids.length > 1 ? `${ids.length} quests claimed` : (weekly ? 'Weekly quest complete' : 'Quest complete'), true, ids.length > 1 ? `Best of ${ids.length} new cards. The rest are in your collection.` : '');
  renderQuests();
  checkAchievements();
}

function checkAchievements() {
  const pr = state.progress;
  let anyNew = false;
  ACHIEVEMENTS.forEach(a => {
    if (!pr.achievements.includes(a.id) && a.test()) {
      pr.achievements.push(a.id);
      anyNew = true;
      pr.freshAch = a.id;
      toast(`${a.icon} Milestone: ${a.name}`);
      logEvent(a.icon, `Milestone reached: ${a.name}.`);
      const t = titleFor(a.id);
      if (t) { toast(`🏷️ New title: ${t.name} - wear it from your profile`); logEvent('🏷️', `Earned the title "${t.name}".`); }
      sfx('claim'); buzz(HAP.found);
    }
  });
  // The hardest milestones also pay a card nobody else has (MILESTONE_CARDS, content/cards.js). Checked on every call, not only when a milestone
  // is first reached, so a player who reached one before the card existed still gets it.
  const got = pr.milestoneCards || (pr.milestoneCards = {});
  Object.keys(MILESTONE_CARDS).forEach(id => {
    if (!pr.achievements.includes(id) || got[id]) return;
    got[id] = true; anyNew = true;
    const a = ACHIEVEMENTS.find(x => x.id === id);
    giveSpecialCard(MILESTONE_CARDS[id], `Milestone: ${a ? a.name : id}`);
    logEvent('🏅', `A milestone card: ${cardDef(MILESTONE_CARDS[id]).name}.`);
  });
  if (anyNew) saveState();
  updateQuestBadge();
  if (!questsPanel.classList.contains('hidden')) renderQuests();
}

function updateCardsBadge() {
  const btn = document.getElementById('tabCollection');
  const show = almanacHasNew() && !btn.classList.contains('active');
  let dot = btn.querySelector('.dot');
  if (show && !dot) { dot = document.createElement('span'); dot.className = 'dot'; btn.appendChild(dot); }
  if (!show && dot) dot.remove();
}

function updateQuestBadge() {
  updateCardsBadge();
  const btn = document.getElementById('tabQuests');
  const pr = state.progress;
  ensureQuests();
  ensureWeeklyQuests();
  const claimable = pr.quests.some(q => !q.claimed && questProgress(q) >= questDef(q.id).goal)
    || (pr.weeklyQuests || []).some(q => !q.claimed && weeklyQuestProgress(q) >= weeklyQuestDef(q.id).goal);
  const show = giftReady() || claimable || storyReady();
  let dot = btn.querySelector('.dot');
  if (show && !dot) { dot = document.createElement('span'); dot.className = 'dot'; btn.appendChild(dot); }
  if (!show && dot) dot.remove();
}

function bumpStat(stat, n) {
  state.progress.totals[stat] = (state.progress.totals[stat] || 0) + (n || 1);
  if (stat === 'cardsFound') noteCardsFound(n || 1);
  if (typeof companionBond === 'function') companionBond(stat, n || 1);   // js/skills-gear.js
  if (typeof ladderFromStat === 'function') ladderFromStat(stat, n || 1);   // js/ladder-practice.js
  if (typeof gossipNote === 'function') gossipNote(stat, n || 1);   // js/town-news.js: something the neighbours might talk about
  // Toast when a quest first completes, so progress feels alive
  state.progress.quests.forEach(q => {
    const def = questDef(q.id);
    if (def.stat === stat && !q.claimed && !q.notified && questProgress(q) >= def.goal) {
      q.notified = true;
      toast(`${def.icon} Quest ready to claim!`);
      sfx('claim');
    }
  });
  addXP((XP_PER_STAT[stat] || 2) * (n || 1));
  saveState();
  checkAchievements();
}


// The claim center (Dailies and Weekly share it): a hero with Claim all, then Ready / In progress (closest
// first) / a collapsed "not started" group / Claimed. claimQuest()/claimWeeklyQuest() index into the
// unsorted state array, so each row carries its original index.
const claimOpen = { daily: false, weekly: false };
function renderClaimCenter(kind) {
  const weekly = kind === 'weekly', pr = state.progress;
  const box = document.getElementById(weekly ? 'weeklyClaim' : 'dailyClaim');
  const defOf = weekly ? weeklyQuestDef : questDef, progOf = weekly ? weeklyQuestProgress : questProgress;
  const rows = (weekly ? pr.weeklyQuests : pr.quests).map((q, i) => {
    const def = defOf(q.id), prog = progOf(q);
    return { q, i, def, prog, st: q.claimed ? 'done' : prog >= def.goal ? 'ready' : prog > 0 ? 'prog' : 'new' };
  });
  const by = st => rows.filter(r => r.st === st);
  const ready = by('ready'), prog = by('prog').sort((a, b) => b.prog / b.def.goal - a.prog / a.def.goal), fresh = by('new'), done = by('done');
  const row = r => `<div class="quest ${r.st === 'ready' ? 'done' : ''}">
      <div class="quest-top"><span class="q-icon">${r.def.icon}</span><span class="q-name">${r.def.name}</span>
      ${r.st === 'done' ? '<span class="q-count">✓ claimed</span>' : r.st === 'ready' ? `<button class="panel-action active q-claim" data-claim="${r.i}">Claim</button>` : `<span class="q-count">${r.prog}/${r.def.goal}</span>`}</div>
      ${r.st === 'done' ? '' : `<div class="q-bar"><div class="q-fill" style="width:${Math.round(r.prog / r.def.goal * 100)}%"></div></div>`}</div>`;
  const group = (title, note, list) => list.length ? `<div class="section-title">${title}${note ? ` <span class="q-kind">${note}</span>` : ''}</div>${list.map(row).join('')}` : '';
  const total = rows.length;
  box.innerHTML = `<div class="claim-hero ${ready.length ? 'ready' : ''}">
      <div><b>${ready.length ? `${ready.length} ready to claim` : 'Nothing to claim right now'}</b>
      <span>${done.length} of ${total} claimed ${weekly ? 'this week' : 'today'}</span></div>
      ${ready.length ? '<button class="panel-action active" data-claimall="1">Claim all</button>' : `<span class="claim-tick">${done.length === total && total ? '✅' : '🎯'}</span>`}</div>`
    + group('Ready', ready.length, ready) + group('In progress', 'closest first', prog)
    + (fresh.length ? `<button class="claim-more" data-nsopen="1">${claimOpen[kind] ? 'Hide' : 'Show'} not started · ${fresh.length}</button>${claimOpen[kind] ? fresh.map(row).join('') : ''}` : '')
    + group('Claimed', done.length, done);
  onAll(box, '[data-claim]', b => (weekly ? claimWeeklyQuest : claimQuest)(+b.dataset.claim));
  const all = box.querySelector('[data-claimall]'); if (all) all.addEventListener('click', () => claimAllQuests(kind));
  const ns = box.querySelector('[data-nsopen]'); if (ns) ns.addEventListener('click', () => { claimOpen[kind] = !claimOpen[kind]; sfx('tap'); renderClaimCenter(kind); });
}

function renderQuests() {
  ensureQuests();
  ensureWeeklyQuests();
  const pr = state.progress;

  renderStory();
  const slot = document.getElementById('giftSlot');
  const ready = giftReady();
  slot.innerHTML = `
    <div class="gift-card ${ready ? 'ready' : ''}" id="giftCard">
      <div class="g-icon">${ready ? '🎁' : '📦'}</div>
      <div>
        <div class="g-title">${ready ? 'Your daily gift is ready' : 'Daily gift collected'}</div>
        <div class="g-sub">${ready ? 'Tap to open. A rare card or better.' : `Come back tomorrow${pr.giftStreak > 1 ? ` · ${pr.giftStreak}-day streak` : ''}`}</div>
      </div>
    </div>`;
  if (ready) document.getElementById('giftCard').addEventListener('click', claimDailyGift);

  renderClaimCenter('daily');
  renderClaimCenter('weekly');

  const grid = document.getElementById('achGrid');
  grid.innerHTML = '';
  ACHIEVEMENTS.forEach(a => {
    const unlocked = pr.achievements.includes(a.id);
    const el = document.createElement('div');
    el.className = 'ach' + (unlocked ? '' : ' locked') + (pr.freshAch === a.id ? ' fresh' : '');
    const t = titleFor(a.id);
    el.innerHTML = `<span class="a-ico">${unlocked ? a.icon : '🔒'}</span><span class="a-name">${a.name}</span>${t ? `<span class="a-title">🏷️ ${escapeHtml(t.name)}</span>` : ''}`;
    grid.appendChild(el);
  });
  pr.freshAch = null;

  renderFavours();
}

// A read-only tracker for neighbor favours - the only way to check one used to be finding that neighbor
// again in town. Doesn't offer a "claim" button here since handing one in still has to happen in person.
function renderFriends() {
  const box = document.getElementById('friendsList');
  const list = Object.values(friendsState()).filter(fr => fr.points > 0).sort((a, b) => b.points - a.points);
  if (!list.length) { box.innerHTML = '<div class="panel-desc">Nobody yet. Finish favours, share bread from the bakery, and win friendly matches to grow closer to your neighbors.</div>'; return; }
  box.innerHTML = list.map(fr => {
    const h = heartsFor(fr.points), next = HEART_AT[h];
    const perks = [h >= SIG_HEARTS ? '🌟 signature match unlocked' : `🌟 signature match at ${SIG_HEARTS} hearts`, h >= 5 ? '🎁 keepsake given' : ''].filter(Boolean).join(' · ');
    return `<div class="panel-item"><span class="panel-icon">${fr.icon || '🙂'}</span><span class="panel-text">
      <div class="panel-name">${escapeHtml(fr.name)} <span class="q-kind">${DISTRICTS[fr.district] ? DISTRICTS[fr.district].name : ''}</span></div>
      <div class="panel-desc">${heartRow(h)} ${h >= 5 ? '' : `· ${next - fr.points} to go`}</div>
      <div class="panel-ability">${perks}</div></span></div>`;
  }).join('');
}
function renderFavours() {
  renderFriends();
  const rs = reqState();
  const active = Object.values(rs.list).filter(r => r.state === 'active');
  document.getElementById('favoursSub').textContent = `${active.length}/${REQ_MAX_ACTIVE} favours open`;
  const list = document.getElementById('favoursList');
  list.innerHTML = '';
  if (!active.length) {
    list.innerHTML = '<div class="panel-desc">No favours accepted yet - chat with a neighbor in town and see if they need a hand.</div>';
    return;
  }
  // Ready-to-hand-in favours sort to the top, same as Dailies/Weekly's claimRank - otherwise a finished
  // favour can sit buried below several still-in-progress ones.
  active.slice().sort((a, b) => (requestDone(b) ? 1 : 0) - (requestDone(a) ? 1 : 0)).forEach(r => {
    const ready = requestDone(r);
    const el = document.createElement('div');
    el.className = 'quest' + (ready ? ' done' : '');
    const rewardText = r.reward ? `a ${REQ_WIN_RARITY} card or better` : `🫧 ${r.pebbles} ${GAME.currency.many}`;
    el.innerHTML = `
      <div class="quest-top">
        <span class="q-icon">🤝</span>
        <span class="q-name">${escapeHtml(r.giver)}<span class="q-kind">Favour</span></span>
        <span class="q-count">${ready ? 'Ready!' : ''}</span>
      </div>
      <div class="panel-desc fav-detail">${escapeHtml(r.text)}</div>
      <div class="panel-desc fav-status">${ready ? `Find ${escapeHtml(r.giver)} to hand it in · ${rewardText}` : `${escapeHtml(requestProgressText(r))} · ${rewardText}`}</div>`;
    list.appendChild(el);
  });
}

// Completed dailies/weeklies still feed state.progress.questHistory (logQuestHistory, above) since
// achievements count it (first-weekly, weekly-10, quests-50, quests-150) - only the standalone "History"
// tab that once displayed it is gone now; a completed quest already gets a Journal → Log entry from
// claimQuest()/claimWeeklyQuest() (with its reward tier included), so nothing shown here was lost.
const REWARDS_SEGMENTS = {
  dailies: { btn: 'segDailies', view: 'dailiesView' },
  weekly: { btn: 'segWeekly', view: 'weeklyView' },
  milestones: { btn: 'segMilestones', view: 'milestonesView' },
  favours: { btn: 'segFavours', view: 'favoursView' },
};
function switchRewardsSegment(key) {
  sfx('nav'); buzz(HAP.tap);
  Object.entries(REWARDS_SEGMENTS).forEach(([k, s]) => {
    document.getElementById(s.btn).classList.toggle('active', k === key);
    document.getElementById(s.view).classList.toggle('hidden', k !== key);
  });
}
document.getElementById('segDailies').addEventListener('click', () => switchRewardsSegment('dailies'));
document.getElementById('segWeekly').addEventListener('click', () => switchRewardsSegment('weekly'));
document.getElementById('segMilestones').addEventListener('click', () => switchRewardsSegment('milestones'));
document.getElementById('segFavours').addEventListener('click', () => switchRewardsSegment('favours'));


