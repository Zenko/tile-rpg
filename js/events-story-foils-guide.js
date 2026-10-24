/* ============================================================
   DAILY TOWN EVENTS
   One event a day, the same for everyone that day, each bending one system a little.
   Read through eventIs(); announced once a day and shown next to the district name.
   ============================================================ */
// TOWN_EVENTS: in content/story.js (the game's words and data, kept apart from the code)
const EVENT_WEIGHT = e => e.rare ? 0.25 : 1;
function eventNow() {
  const directed = typeof directorEvent === 'function' ? directorEvent() : null;   // js/director.js: paced by your recent days
  if (directed) return directed;
  const total = TOWN_EVENTS.reduce((n, e) => n + EVENT_WEIGHT(e), 0);
  let r = seeded('event-' + todayKey())() * total;
  for (const e of TOWN_EVENTS) { r -= EVENT_WEIGHT(e); if (r < 0) return e; }
  return TOWN_EVENTS[0];
}
/* Calm districts (build 102): beating a district's boss leaves that district calm for the rest of the real day - hidden
   cards and chests turn up half again as often there, and its ambient line says so. It is the town reacting to what you did. */
function districtCalm(d) { const c = state.progress.calm; return !!(c && c[d || state.currentDistrict] === todayKey()); }
function markDistrictCalm(d) {
  const p = state.progress; if (!p.calm || typeof p.calm !== 'object') p.calm = {};
  p.calm[d] = todayKey(); saveState();
  setTimeout(() => toast(`🕊️ ${DISTRICTS[d].name} is calm today: hidden cards and chests turn up more often.`), 1800);
}
function eventIs(id) { return eventNow().id === id; }
function noteTodayEvent() {
  const pr = state.progress, ev = eventNow();
  if (pr.eventSeen === todayKey()) return;
  if (prefs.cozy) { pr.eventSeen = todayKey(); return; }   // Cozy mode: no event toast (it is still shown next to the district name)
  pr.eventSeen = todayKey(); saveState();
  setTimeout(() => toast(`${ev.icon} Today in town: ${ev.name} - ${ev.text}`), 1500);
  logEvent(ev.icon, `Today in town: ${ev.name}. ${ev.text}`);
  showTipOnce('events');
}
function packPrice(pack) { return Math.round(pack.cost * (eventIs('market-day') ? 0.8 : 1) * (1 - Math.min(0.15, cardBonus('packDiscount')))); }   // Merchant skill, up to 15% off

/* ============================================================
   GETTING STARTED: a short guided path for someone new to town
   One step at a time, shown at the top of Rewards → Dailies. Each step pays a little; the last pays a card.
   ============================================================ */
// STORY: in content/story.js (the game's words and data, kept apart from the code)
// The path above ends onboarding; everyone who keeps playing gets these too, at their own pace, still one
// step at a time in the same Rewards → Dailies slot. STORY_ARC_LEN marks where "getting started" ends.
const STORY_ARC_LEN = STORY.length;
STORY.push(
  { icon: '👑', text: 'Face down a district boss.',                   goal: 'Defeat any district boss',                   done: p => (p.totals.bossesWon || 0) >= 1,     pebbles: 12 },
  { icon: '🗺️', text: 'See the whole town.',                          goal: 'Visit every district',                       done: () => Object.keys(DISTRICTS).every(k => state.visitedDistricts.includes(k)), pebbles: 12 },
  { icon: '🦦', text: "Meet the harbor and the garden's newest neighbors.", goal: 'Visit the Net Loft and the Glasshouse', done: p => !!(p.visited && p.visited['harbor-hut'] && p.visited['garden-glass']), pebbles: 10 },
  { icon: '🎭', text: 'Take on your rival.',                          goal: `Beat ${CAST.rival.name} in a match`,                       done: p => (p.totals.rivalWins || 0) >= 1,     pebbles: 15 },
  { icon: '🧩', text: 'Finish what you started.',                     goal: 'Complete any themed card set',               done: () => CARD_SETS.some(setComplete),        pebbles: 15 },
  { icon: '⭐', text: 'Truly settle in.',                             goal: 'Reach level 10',                             done: p => (p.level || 1) >= 10,                card: 'mythic' },
);
function storyState() { const p = state.progress; if (!p.story || typeof p.story !== 'object') p.story = { step: 0, notified: -1, beat: -1 }; return p.story; }   // beat: the last step whose scene has played (js/scenes.js)
function storyStep() { const s = storyState(); return s.step < STORY.length ? STORY[s.step] : null; }
function storyReady() { const st = storyStep(); return !!(st && st.done(state.progress)); }
function storyArcLabel(step) { return step < STORY_ARC_LEN ? 'Getting started' : 'Making yourself at home'; }
function claimStory() {
  const s = storyState(), st = storyStep(), wasOnboarding = s.step < STORY_ARC_LEN;
  if (!st || !st.done(state.progress)) return;
  s.step++;
  if (st.pebbles) { addPebbles(st.pebbles, 'story'); toast(`📜 Step done! +${st.pebbles} 🫧`); }
  if (st.card) { const cid = randomCardId(st.card); state.ownedCards.push(cid); bumpStat('cardsFound', 1);
    setTimeout(() => showCardReveal(cid, wasOnboarding ? 'Welcome to town!' : 'A town that knows you', true, wasOnboarding ? `${CAST.guide.name} says: "You belong here now."` : `${CAST.guide.name} says: "Look at you - practically a local."`), 300); }
  logEvent(st.icon, `${storyArcLabel(s.step - 1)}: ${st.goal}.`);
  saveState(); sfx('claim'); buzz(HAP.found);
  renderQuests(); checkAchievements();
  storyHoldUntil(1600);   // let the toast and any card reveal clear before Wren speaks again (js/scenes.js)
}
function renderStory() {
  const slot = document.getElementById('storySlot'), s = storyState(), st = storyStep();
  if (!st) { slot.innerHTML = ''; return; }
  const ready = st.done(state.progress), arc = storyArcLabel(s.step);
  const arcStart = s.step < STORY_ARC_LEN ? 0 : STORY_ARC_LEN, arcLen = s.step < STORY_ARC_LEN ? STORY_ARC_LEN : STORY.length - STORY_ARC_LEN;
  slot.innerHTML = `<div class="story-card${ready ? ' ready' : ''}">
    <div class="story-top"><span class="story-icon">${st.icon}</span><span class="story-text"><small>${arc} · step ${s.step - arcStart + 1} of ${arcLen}</small><b>${st.text}</b><span>${st.goal}</span></span>
    ${ready ? '<button class="panel-action active" id="storyClaim">Claim</button>' : `<span class="q-count">${st.card ? 'a card' : `🫧 ${st.pebbles}`}</span>`}</div>
    <div class="q-bar"><div class="q-fill" style="width:${Math.round((s.step - arcStart) / arcLen * 100)}%"></div></div></div>`;
  const b = document.getElementById('storyClaim'); if (b) b.addEventListener('click', claimStory);
}
// A nudge when the current step gets done, so nobody has to keep checking.
function checkStory() {
  const s = storyState();
  if (storyReady() && s.notified !== s.step) { s.notified = s.step; saveState(); toast('📜 Next step ready - claim it in Rewards'); }
  storyBeatCheck();
}

/* ============================================================
   FOIL CARDS
   Any card that joins your collection has a small chance to be a shiny foil. Foils are purely a collector's chase:
   they shimmer everywhere the card is shown. Found by comparing the collection with the last snapshot, so every
   way of getting a card counts without each one having to remember to roll.
   ============================================================ */
const FOIL_ODDS = 0.02;
function foils() { const p = state.progress; if (!p.foils || typeof p.foils !== 'object') p.foils = {}; return p.foils; }
function foilCount(id) { return foils()[id] || 0; }
function hasFoil(id) { const b = BattleEngine.baseIdOf(id); return Object.keys(foils()).some(k => BattleEngine.baseIdOf(k) === b && foils()[k] > 0); }
/* Build 325 (owner): every card from a portal, a puddle world or a boss's reward is Reborn, always, instead of the 2% roll. Called
   right after the card joins the collection; the snapshot is brought up to the new count so reconcileFoils does not roll it again. */
function markFoil(id) {
  const p = state.progress, f = foils(), d = cardDef(id); if (!d) return;
  f[id] = Math.min((f[id] || 0) + 1, ownedCardCounts()[id] || 1);
  if (p.foilSnap) p.foilSnap[id] = ownedCardCounts()[id] || 0;
  logEvent('✨', `A Reborn ${d.name}!`); bumpStat('foilsFound', 1); showTipOnce('foils');
  setTimeout(() => toast(`✨ Reborn! Your ${d.icon} ${d.name} shimmers`), 1400);
  saveState();
}
// Is this card coming from a portal or puddle world (not the cellar, which is a world too but is not a puddle)?
function foilWorldNow() { const w = typeof pwActive === 'function' && pwActive(); return !!w && state.currentDistrict === PW_KEY && w.kind !== 'cellar'; }
function reconcileFoils() {
  const p = state.progress, counts = ownedCardCounts(), f = foils();
  if (!p.foilSnap) { p.foilSnap = counts; return; }
  const found = [];
  Object.keys(counts).forEach(id => { for (let i = 0; i < counts[id] - (p.foilSnap[id] || 0); i++) if (Math.random() < FOIL_ODDS * (eventIs('starfall') ? 3 : 1)) { f[id] = (f[id] || 0) + 1; found.push(id); } });
  Object.keys(f).forEach(id => { f[id] = Math.min(f[id], counts[id] || 0); if (!f[id]) delete f[id]; });   // a foil you gave away is gone
  p.foilSnap = counts;
  if (found.length) {
    found.forEach(id => { const d = cardDef(id); setTimeout(() => toast(`✨ Reborn! Your new ${d.icon} ${d.name} is a shimmering one`), 1400); logEvent('✨', `Found a Reborn ${d.name}!`); });
    bumpStat('foilsFound', found.length); sfx('mythic'); showTipOnce('foils');
  }
  saveState();
}

/* ============================================================
   TOWN GUIDE (Journal → Guide)
   Every system in one place: what it is, where to find it, and what (if anything) still has to unlock.
   ============================================================ */
const needs = (district) => districtUnlocked(district) ? '' : `Opens with ${DISTRICTS[district].name} (${districtLockReason(district).replace(/^Needs /, '')})`;
// GUIDE: in content/guide.js (the game's words and data, kept apart from the code)
// Collapsed by default (keyed by item name) - with ~30 entries across 5 sections, showing every "how"
// description at once was the same wall-of-text problem the Changelog had. Tapping a row expands just
// its own details in place, same idiom as mail-item/cl-entry.
let guideOpen = {}, guideQuery = '', guideSection = 'all';   // guideSection: 'all' or a GUIDE section name
// GUIDE_NEW: in content/guide.js (the game's words and data, kept apart from the code)
function guideSeen() { const p = state.progress; if (!p.guideSeen || typeof p.guideSeen !== 'object') p.guideSeen = {}; return p.guideSeen; }
// Redesign (build 93): roomier cards (icon tile, name, a "where" chip, details on tap), a Today card split into
// labelled rows instead of one paragraph, and section chips pinned under the search box. Searching ignores the chip
// so a match is never hidden by a filter you forgot about.
function renderGuide() {
  const box = document.getElementById('guideList'), ev = eventNow(), sd = seasonDef(), q = guideQuery.trim().toLowerCase(), seen = guideSeen();
  const match = it => !q || `${it.name} ${it.where} ${it.how}`.toLowerCase().includes(q);
  const chips = document.getElementById('guideChips'), keep = chips.scrollLeft;
  chips.innerHTML = [['all', 'All']].concat(GUIDE.map(g => [g.section, g.section])).map(([id, label]) =>
    `<button type="button" class="gd-chip${!q && guideSection === id ? ' active' : ''}" role="tab" data-gsec="${escapeHtml(id)}">${escapeHtml(label)}</button>`).join('');
  chips.scrollLeft = keep;
  onAll(chips, '[data-gsec]', b => { sfx('nav'); guideSection = b.dataset.gsec; renderGuide(); });
  let body = GUIDE.map(g => {
    if (!q && guideSection !== 'all' && guideSection !== g.section) return '';
    const items = g.items.filter(match);
    if (!items.length) return '';
    return `<div class="gd-section"><div class="gd-section-title">${g.section}<span>${items.length}</span></div>` + items.map(it => {
      const lock = it.lock ? it.lock() : '';
      const open = !!guideOpen[it.name] || (!!q && items.length <= 3 && !lock);
      const isNew = GUIDE_NEW.includes(it.name) && !seen[it.name], go = guideTarget(it.name);
      // A lock reason answers "why can't I do this yet" - show it right away rather than gating it
      // behind a tap; only the (usually longer) "how" text for unlocked items collapses.
      return `<div class="gd-card${lock ? ' locked' : ''}${open ? ' open' : ''}"${lock ? '' : ` data-toggle-guide="${escapeHtml(it.name)}" role="button" tabindex="0" aria-expanded="${open}"`}>
        <div class="gd-head"><span class="gd-icon">${it.icon}</span>
          <div class="gd-title"><div class="gd-name">${it.name}${isNew ? '<span class="jnew">NEW</span>' : ''}</div><div class="gd-where">📍 ${it.where}</div></div>
          ${lock ? '' : `<span class="gd-chev" aria-hidden="true">${open ? '⌃' : '⌄'}</span>`}</div>
        ${lock ? `<div class="gd-how gd-lock">🔒 ${escapeHtml(lock)}</div>` : (open ? `<div class="gd-how">${it.how}${go ? `<div class="gd-go"><button type="button" class="jgo" data-guide-go="${escapeHtml(it.name)}">Take me there →</button></div>` : ''}</div>` : '')}</div>`;
    }).join('') + '</div>';
  }).join('');
  if (!body) body = `<div class="jempty">Nothing matches “${escapeHtml(guideQuery)}”.<button class="jgo" type="button" id="guideClear">Clear search</button></div>`;
  const left = seasonDaysLeft();
  box.innerHTML = `<div class="gd-today">
      <div class="gd-today-label">Today</div>
      <div class="gd-row"><span class="gd-row-ico">${ev.icon}</span><div><b>${ev.name}</b><span>${ev.text}</span></div></div>
      <div class="gd-row"><span class="gd-row-ico">${sd.icon}</span><div><b>${sd.name}</b><span>${left} day${left === 1 ? '' : 's'} left</span></div></div>
      <div class="gd-row"><span class="gd-row-ico">🌦️</span><div><b>${weatherBrief()}</b><span>Tap the sky badge for what each weather does</span></div></div>
    </div>` + body;
  box.querySelectorAll('[data-toggle-guide]').forEach(el => {
    const toggle = ev2 => {
      if (ev2.target.closest('[data-guide-go]')) return;
      const name = el.dataset.toggleGuide;
      sfx('nav');
      guideOpen[name] = !guideOpen[name];
      if (guideOpen[name] && GUIDE_NEW.includes(name)) { guideSeen()[name] = true; saveState(); }
      renderGuide();
    };
    el.addEventListener('click', toggle);
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(e); } });
  });
  box.querySelectorAll('[data-guide-go]').forEach(b => b.addEventListener('click', () => { sfx('tap'); closeJournalSheet(); journalGo(guideTarget(b.dataset.guideGo)); }));
  const gc = document.getElementById('guideClear'); if (gc) gc.addEventListener('click', () => { guideQuery = ''; document.getElementById('guideSearch').value = ''; renderGuide(); });
}

/* ============================================================
   DISPLAY SETTINGS: larger text (the old Fast battles, Easy reeling, Cozy mode, dark cellar and Smooth map switches were removed)
   ============================================================ */
function applyComfortPrefs() {
  const r = document.documentElement.classList;
  r.toggle('big-text', prefs.textSize === 'large'); r.toggle('bigger-text', prefs.textSize === 'largest');   // js/settings-extra.js owns the Text size choice
  r.toggle('reduce-motion', prefs.motion === 'reduced');
}
// Separate from the loop above: turning this on needs an async permission prompt first, and turning it on
// or off should immediately (re)schedule or cancel whatever's currently pending (a loaf in the oven, the
// boss's next appearance) rather than waiting for the next natural trigger.
// Restores scheduling after a reload/reopen - anything already in flight (a loaf mid-bake, the boss
// currently hidden) needs to be rescheduled since the setTimeout from whenever it originally started is
// long gone. Called once at start-up (if notifications are already on) and right after turning them on.
function scheduleAllPendingNotifs() {
  if (!notifsEnabled()) return;
  const ov = ovenState();
  if (ov.startedAt) scheduleLocalNotify('bread', ov.startedAt + (ov.ms || BAKE_MS), '🍞 Bread is ready!', 'Your loaf at the bakery is done baking.');
  const wait = msUntilBossAppear();
  if (wait > 0) scheduleLocalNotify('boss', Date.now() + wait, '👹 The boss is back', 'A district boss has returned - good luck!');
}
document.getElementById('notifsToggle').addEventListener('click', async () => {
  sfx('tap');
  if (prefs.notifs) {
    prefs.notifs = false; savePrefs(); syncToggles();
    Object.keys(notifTimers).forEach(k => clearTimeout(notifTimers[k]));
    return;
  }
  const granted = await requestNotifPermission();
  if (!granted) { syncToggles(); return; }
  prefs.notifs = true; savePrefs(); syncToggles();
  toast('🔔 Notifications on');
  scheduleAllPendingNotifs();
});
document.getElementById('weatherAlertsToggle').addEventListener('click', async () => {
  sfx('tap');
  if (prefs.weatherAlerts) { prefs.weatherAlerts = false; savePrefs(); syncToggles(); weatherAwayStop(); return; }
  if (!(await requestNotifPermission())) { syncToggles(); return; }
  prefs.weatherAlerts = true; savePrefs(); syncToggles();
  toast('🌦️ Weather alerts on');
});
document.getElementById('presenceToggle').addEventListener('click', () => {
  sfx('tap');
  prefs.sharePresence = !prefs.sharePresence; prefs.presenceChosen = true; savePrefs(); syncToggles();
  if (prefs.sharePresence) { pushPresence(); toast("👋 Sharing that you're playing"); }
  else removePresence();
  fetchWhosPlaying();
});
// Ember ledger (js/progression.js): where Embers come from and go, for tuning the economy.
document.getElementById('econToggle').addEventListener('click', () => {
  const panel = document.getElementById('econPanel'), open = panel.classList.toggle('hidden') === false;
  document.getElementById('econToggle').textContent = open ? 'Hide' : 'Show'; sfx('tap');
  if (!open) return;
  const r = econReport(), fmt = l => l.slice(0, 8).map(x => `${x.src}: ${x.total} (${Math.round(x.perHour)}/h)`).join('\n') || '-';
  panel.textContent = `Over ${r.hours}h of play\nEarned ${r.earned} (${r.earnedPerHour}/h) · Spent ${r.spent} (${r.spentPerHour}/h)\n\nEARNED\n${fmt(r.earn)}\n\nSPENT\n${fmt(r.spend)}`;
});
document.getElementById('statsToggle').addEventListener('click', () => {
  sfx('tap'); prefs.shareStats = prefs.shareStats === false; savePrefs(); syncToggles();
  if (prefs.shareStats !== false) pushStats();
  toast(prefs.shareStats === false ? '📈 Play stats are private' : '📈 Sharing anonymous play stats');
});
// Lingering duels: your current deck rides along with your presence entry (on by default, with Share that I'm playing).
document.getElementById('shareDeckToggle').addEventListener('click', () => {
  sfx('tap');
  prefs.shareDeck = prefs.shareDeck === false; savePrefs(); syncToggles();
  if (prefs.sharePresence) pushPresence();
  toast(prefs.shareDeck === false ? '👻 Your deck is private' : prefs.sharePresence ? '👻 Testers can duel your deck' : '👻 Turn on Share that I\'m playing so testers can find you');
});

/* ============================================================
   FEEDBACK FOR TESTERS: every note carries enough context to act on
   ============================================================ */
function testerInfo() {
  const pr = ensureLevel(), w = WEATHER_KINDS[weatherNow()];
  const ua = navigator.userAgent.replace(/\s*\(KHTML, like Gecko\)/, '').slice(0, 160);
  const recent = (state.progress.eventLog || []).slice(0, 4).map(e => `  - ${String(e.text).replace(/<[^>]+>/g, '')}`).join('\n');
  return [`— ${GAME.title} ${gameBuildLabel()} · ${fmtChangelogDate(RELEASES[0].date)}`,
    `Level ${pr.level} · ${state.wins} wins · ${state.ownedCards.length} cards · in ${DISTRICTS[state.currentDistrict].name}`,
    `${w ? w.name : ''} · ${seasonDef().name} · ${eventNow().name} · ${inBattle ? 'in a battle' : inScene && scene ? 'inside ' + scene.id : 'in town'}`,
    `Screen ${window.innerWidth}×${window.innerHeight} · touch ${'ontouchstart' in window ? 'yes' : 'no'}`,
    `Device: ${ua}`,
    econSummaryText() ? `Economy: ${econSummaryText()}` : '',
    recent ? `Recent:\n${recent}` : ''].filter(Boolean).join('\n');
}
// The same facts as testerInfo(), as structured fields, so a feedback document in Firestore can be
// scanned/filtered by name or level instead of only read as one block of text.
function testerData() {
  const pr = ensureLevel();
  return {
    name: (state.character && state.character.name) || 'A player',
    emoji: (state.character && state.character.emoji) || '',
    level: pr.level, wins: state.wins || 0, cards: state.ownedCards.length,
    district: DISTRICTS[state.currentDistrict] ? DISTRICTS[state.currentDistrict].name : '',
    version: gameBuildLabel(), screen: `${window.innerWidth}x${window.innerHeight}`,
    econ: (() => { const r = econReport(); return { hours: r.hours, earned: r.earned, spent: r.spent, earn: Object.fromEntries(r.earn.slice(0, 8).map(x => [x.src, x.total])), spend: Object.fromEntries(r.spend.slice(0, 8).map(x => [x.src, x.total])) }; })(),
  };
}
// A real overlay (like #cloudOverlay - see js/cloud-save.js) instead of prompt(), so a longer bug report or
// piece of feedback can actually be seen and edited while typing, not squeezed into one browser pop-up line.
let feedbackModalResolve = null;
async function sendFeedback(kind) {
  sfx('nav'); buzz(HAP.tap);
  document.getElementById('feedbackModalTitle').textContent = 'Feedback and bugs';
  document.getElementById('feedbackModalDesc').textContent = "Ideas, thoughts or something that broke? If it is a bug, tell us what happened and what you expected. It's sent straight to the developer, along with your name, level, game version and device.";
  document.getElementById('feedbackModalSubmit').textContent = 'Send';
  const textEl = document.getElementById('feedbackTextInput');
  textEl.value = '';
  document.getElementById('feedbackOverlay').classList.remove('hidden');
  setTimeout(() => textEl.focus(), 50);
  const msg = await new Promise(resolve => { feedbackModalResolve = resolve; });
  if (!msg || !msg.trim()) return;
  const sent = await pushFeedback(kind, msg.trim(), testerInfo(), testerData());
  if (sent) { toast('💬 Sent - thank you!'); sfx('claim'); return; }
  // Firestore unreachable or its security rule isn't set up yet - fall back to the old mailto: link
  // rather than the message just disappearing.
  const subject = encodeURIComponent(`${GAME.title} feedback`);
  const body = encodeURIComponent((msg.trim() + '\n\n' + testerInfo()).slice(0, 1600));
  window.location.href = `mailto:imzenko@gmail.com?subject=${subject}&body=${body}`;
}
function closeFeedbackModal(result) {
  document.getElementById('feedbackOverlay').classList.add('hidden');
  if (feedbackModalResolve) { const r = feedbackModalResolve; feedbackModalResolve = null; r(result); }
}
document.getElementById('feedbackModalCancel').addEventListener('click', () => { sfx('nav'); closeFeedbackModal(null); });
document.getElementById('feedbackModalSubmit').addEventListener('click', () => {
  const val = document.getElementById('feedbackTextInput').value;
  if (!val.trim()) { toast('Type a message first.'); sfx('tie'); return; }
  sfx('claim'); closeFeedbackModal(val);
});

loadState();
if (typeof portalBoot === 'function') portalBoot();   // js/portal.js: a portal that closed while the game was away is gone
pwBoot();          // js/puddle-worlds.js: a world that ended while the game was closed is gone; one still running is rebuilt from its seed
ensureJournal();   // drops saved note drawings once (build 240), so an old save shrinks on its first load
applyComfortPrefs();
ensureQuests();
migrateMapV2();
sanitizeCards();
const __mig = migrateToBattleV2();
migrateRewardsV2();
generateTiles();
advanceClock();
renderTown();
updateHud();
syncToggles();
scheduleAllPendingNotifs();
checkAchievements();
if (__mig && __mig.granted.length) setTimeout(() => toast(__mig.brandNew ? '🌱 A starter deck is ready. Tap a neighbor to battle.' : '📦 Battles use 12-card decks now. Starter cards were added and your deck is filled.'), 900);

// Browsers require a touch before audio can start; unlock it on the first tap


initTransientNotices();   // js/town-render-weather.js: the ambient line and town log fade in and out
setTimeout(storyIntroCheck, 500);   // a brand-new save opens with the dream-in scene (js/scenes.js)
