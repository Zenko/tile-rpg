/* ============================================================
   THE FAN MENU, THE INFO BAR AND THE TAB WINDOW (build 290)
   The bottom dock was replaced by one round button and an info bar (prototype: an artifact, chosen by the owner: Glass buttons,
   Unfold, Slide up, Stagger). Tapping the button fans the five places (Town, Journal, Cards, Rewards, Character) out in an arc
   around the thumb; the button becomes a close mark while it is open. The five buttons are the old tab buttons, ids unchanged,
   so switchTab(), the badge dots (a `.dot` child) and everything that finds a tab by id work as before.

   How the pieces fit:
   - The fan is moved by script (not CSS transitions) because Unfold swings each button along the arc while it also travels out,
     which CSS cannot express with one transition. Each button has progress 0..1 (`fanU`); every frame sets only transform and
     opacity. It closes a little faster than it opens. Reduced motion (btMotionOk) skips the movement.
   - The window (#tabWin) holds the Journal, Cards, Shop, Rewards and Character panels. switchTab() calls fanWinSync() at its end:
     it slides the window up for a tab and down for Town. The panel being left is NOT hidden until the slide-down has finished
     (fanWinHold), or the window would empty itself before it left. Between two tabs the window stays and only the content rises
     in (fanStagger). The town stays drawn under a dim; nothing about the town's own pausing changed.
   - The info bar: in Town it shows the place, time and weather (the old #pillSky, moved here) over cards and Embers (the old
     #pillCards / #pillPebbles, moved here so their taps, bumps and flying rewards still work). In a window the first line says
     what that screen is about (fanContext). A thin gold line is the XP to the next level.
   - The side is a setting (prefs.menuHand: right or left, Settings -> Appearance).
   Everything here is prefixed fan / win so it never collides with another file's names.
   ============================================================ */
const FAN_ANGLES = { right: [205, 16.25], left: [335, -16.25] };   // degrees: the first button, and the step to the next (screen angles, 270 is straight up)
const FAN_RADIUS = 240, FAN_OPEN_S = 0.5, FAN_STAGGER_S = 0.025, FAN_CLOSE_FACTOR = 0.75;
const FAN_IDS = ['tabTown', 'tabJournal', 'tabCollection', 'tabQuests', 'tabCharacter'];   // along the arc
const WIN_OUT_MS = 280, WIN_RISE_MAX = 14;
const WIN_TITLES = { journal: ['📓', 'Journal'], collection: ['🃏', 'Cards'], quests: ['🎁', 'Rewards'], character: ['🧑', 'Character'], shop: ['🛍️', 'Card Shop'] };

const fanNav = document.getElementById('bottomNav'), fanMainBtn = document.getElementById('fanMain'), fanMainIcon = document.getElementById('fanMainIcon'), fanMainDot = document.getElementById('fanMainDot');
const fanItems = FAN_IDS.map(id => document.getElementById(id)), fanCtxEl = document.getElementById('dockCtx'), fanXpEl = document.getElementById('dockXpFill');
const fanWinEl = document.getElementById('tabWin'), fanWinBody = document.getElementById('winBody'), fanWinIcon = document.getElementById('winIcon'), fanWinTitle = document.getElementById('winTitle');
let fanIsOpen = false, fanU = fanItems.map(() => 0), fanWait = fanItems.map(() => 0), fanDir = 0, fanRaf = 0, fanLast = 0, fanPos = [];
let winHeld = null, winOutTimer = 0, winRiseTimer = 0, fanIconSig = '', fanJournalAt = 0, fanJournalTxt = '';

const fanHand = () => (prefs.menuHand === 'left' ? 'left' : 'right');
const fanMotion = () => (typeof btMotionOk === 'function' ? btMotionOk() : true);
const fanClamp01 = v => Math.max(0, Math.min(1, v));

/* ---------- the fan ---------- */
function fanPaint(i) {
  const c = fanPos[i], b = fanItems[i], u = fanU[i], e = 1 - Math.pow(1 - u, 3);
  const a = (c.a0 + (c.a - c.a0) * e) * Math.PI / 180, r = FAN_RADIUS * e;
  b.style.transform = `translate(${(Math.cos(a) * r).toFixed(1)}px,${(Math.sin(a) * r).toFixed(1)}px)`;
  b.style.opacity = Math.min(1, e * 4).toFixed(3);
}
function fanLayout() {
  const hand = fanHand(), [a0, step] = FAN_ANGLES[hand];
  fanNav.classList.toggle('r', hand === 'right'); fanNav.classList.toggle('l', hand === 'left');
  fanPos = fanItems.map((b, i) => ({ a: a0 + i * step, a0 }));
  fanItems.forEach((b, i) => fanPaint(i));
}
function fanTick(now) {
  const dt = Math.min(0.05, (now - fanLast) / 1000); fanLast = now; let moving = false;
  fanItems.forEach((b, i) => {
    if (fanWait[i] > 0) { fanWait[i] -= dt; moving = true; return; }
    const u = fanClamp01(fanU[i] + fanDir * dt / (FAN_OPEN_S * (fanDir > 0 ? 1 : FAN_CLOSE_FACTOR)));
    if (u !== fanU[i]) { fanU[i] = u; fanPaint(i); }
    if (fanDir > 0 ? u < 1 : u > 0) moving = true;
  });
  fanRaf = moving ? requestAnimationFrame(fanTick) : 0;
}
function fanSetOpen(open) {
  if (open === fanIsOpen) return;
  fanIsOpen = open;
  fanNav.classList.toggle('open', open);
  fanMainBtn.setAttribute('aria-expanded', open); fanMainBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  fanItems.forEach(b => b.setAttribute('tabindex', open ? '0' : '-1'));
  if (!fanMotion()) { fanItems.forEach((b, i) => { fanU[i] = open ? 1 : 0; fanWait[i] = 0; fanPaint(i); }); return; }
  fanDir = open ? 1 : -1;
  fanItems.forEach((b, i) => { fanWait[i] = (open ? i : fanItems.length - 1 - i) * FAN_STAGGER_S; });
  if (!fanRaf) { fanLast = performance.now(); fanRaf = requestAnimationFrame(fanTick); }
  if (open) { try { fanItems[0].focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
}

/* ---------- the info bar ---------- */
function fanContext(key) {
  const pr = state.progress;
  if (key === 'journal') {
    const now = Date.now();
    if (now - fanJournalAt > 1500) { fanJournalAt = now; try { fanJournalTxt = `${todayModel().daily.filter(d => !d.done).length} to do today`; } catch (e) { fanJournalTxt = ''; } }
    return fanJournalTxt ? `Journal · ${fanJournalTxt}` : 'Journal';
  }
  if (key === 'collection') return `Cards · deck ${state.deck.length}/${DECK_SIZE}`;
  if (key === 'quests') {
    const ready = giftReady() ? 1 : 0, claim = (pr.quests || []).filter(q => !q.claimed && questProgress(q) >= questDef(q.id).goal).length
      + (pr.weeklyQuests || []).filter(q => !q.claimed && weeklyQuestProgress(q) >= weeklyQuestDef(q.id).goal).length;
    return ready ? 'Rewards · gift ready' : claim ? `Rewards · ${claim} to claim` : 'Rewards · all caught up';
  }
  if (key === 'character') return `Level ${ensureLevel().level} · ${state.character.name || 'You'}`;
  if (key === 'shop') return 'Card Shop';
  return '';
}
function fanDockUpdate() {
  const key = typeof currentTab === 'string' ? currentTab : 'town';
  if (fanIsOpen && fanNav.style.display === 'none') fanSetOpen(false);   // a battle or a building screen hid the menu while it was open
  if (fanNav.dataset.ctx !== key) fanNav.dataset.ctx = key;
  const line = key === 'town' ? '' : fanContext(key);
  if (fanCtxEl.textContent !== line) fanCtxEl.textContent = line;
  const pr = ensureLevel(), pct = Math.max(0, Math.min(100, pr.xp / xpToNext(pr.level) * 100)).toFixed(1) + '%';
  if (fanXpEl.style.width !== pct) fanXpEl.style.width = pct;
  // the round button shows where you are
  const src = tabs[key] && tabs[key].btn.querySelector('.t-icon'), html = src ? src.innerHTML : (WIN_TITLES[key] ? WIN_TITLES[key][0] : '🏘️');
  if (fanIconSig !== html) { fanIconSig = html; fanMainIcon.innerHTML = html; }
  // a dot on the button when a place you are not in has one
  fanMainDot.classList.toggle('hidden', !fanItems.some(b => !b.classList.contains('active') && b.querySelector('.dot')));
}

/* ---------- the window ---------- */
function fanWinHold(panel) {   // switchTab() asks before hiding the panel it is leaving for Town
  if (!fanWinEl.classList.contains('on') || panel.classList.contains('hidden') || !fanMotion()) return false;
  winHeld = panel; return true;
}
function fanWinFinish() {
  clearTimeout(winOutTimer);
  fanWinEl.classList.remove('on', 'win-in', 'win-out'); document.body.classList.remove('win-open');
  if (winHeld) { winHeld.classList.add('hidden'); winHeld = null; }
}
function fanWinSync(key) {
  if (key === 'town') {
    if (!fanWinEl.classList.contains('on')) { winHeld = null; document.body.classList.remove('win-open'); return; }
    document.body.classList.remove('win-open');
    if (!winHeld) { fanWinFinish(); return; }
    fanWinEl.classList.remove('win-in'); fanWinEl.classList.add('win-out');
    clearTimeout(winOutTimer); winOutTimer = setTimeout(fanWinFinish, WIN_OUT_MS + 40);
    return;
  }
  clearTimeout(winOutTimer);
  if (winHeld && winHeld !== (tabs[key] && tabs[key].panel)) winHeld.classList.add('hidden');
  winHeld = null;
  const t = WIN_TITLES[key] || ['', ''], icon = tabs[key] && tabs[key].btn.querySelector('.t-icon');
  fanWinIcon.innerHTML = icon ? icon.innerHTML : t[0]; fanWinTitle.textContent = t[1];
  const was = fanWinEl.classList.contains('on') && !fanWinEl.classList.contains('win-out');
  fanWinEl.classList.remove('win-out'); fanWinEl.classList.add('on'); document.body.classList.add('win-open');
  if (!was && fanMotion()) { fanWinEl.classList.remove('win-in'); void fanWinEl.offsetWidth; fanWinEl.classList.add('win-in'); setTimeout(() => fanWinEl.classList.remove('win-in'), 450); }
}
const fanVisible = el => !el.classList.contains('hidden') && el.getClientRects().length > 0;
// the blocks that rise in: a list or grid gives its rows, a lone wrapper gives what is inside it, anything else is one block
function fanRows(el, depth) {
  const kids = [...el.children].filter(fanVisible);
  if (kids.length === 1 && depth < 3) return fanRows(kids[0], depth + 1);
  if (kids.length >= 3 && el.matches('.panel-list, [id$="List"], [id$="Grid"], .ach-grid, .alm-grid, .cgrid, .dk-tray')) return kids;
  return [el];
}
function fanStagger(key) {
  if (key === 'town' || !fanMotion() || !tabs[key]) return;
  const els = [...tabs[key].panel.children].filter(fanVisible).flatMap(c => (c.matches('.seg') ? [c] : fanRows(c, 0))).slice(0, WIN_RISE_MAX);
  els.forEach((el, n) => { el.style.setProperty('--n', n); el.classList.add('win-rise'); });
  clearTimeout(winRiseTimer);
  winRiseTimer = setTimeout(() => els.forEach(el => { el.classList.remove('win-rise'); el.style.removeProperty('--n'); }), 1200);
}
// the window body scrolls now (it used to be #screen); anything that reset or kept the scroll position asks for it here
function fanScroller() { return fanWinBody; }

/* ---------- wiring ---------- */
fanMainBtn.addEventListener('click', () => { ensureAudio(); sfx('nav'); buzz(HAP.tap); fanSetOpen(!fanIsOpen); });
document.getElementById('fanScrim').addEventListener('click', () => fanSetOpen(false));
fanItems.forEach(b => b.addEventListener('click', () => fanSetOpen(false)));   // titles.js already switches the tab
document.getElementById('winClose').addEventListener('click', () => { if (inBattle) return; ensureAudio(); sfx('nav'); buzz(HAP.tap); switchTab('town'); });
document.getElementById('winDim').addEventListener('click', () => { if (inBattle) return; sfx('nav'); switchTab('town'); });
// an overlay or the settings menu on top: Escape belongs to it, not to the window under it (the story scene's overlay is never `.hidden`, it fades, so look at what shows)
function fanOverlayShowing() {
  if (!document.getElementById('playerMenu').classList.contains('hidden')) return true;
  return [...document.querySelectorAll('.overlay')].some(o => { const cs = getComputedStyle(o); return !o.classList.contains('hidden') && cs.display !== 'none' && cs.visibility !== 'hidden' && cs.opacity !== '0' && cs.pointerEvents !== 'none'; });
}
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape' || e.defaultPrevented) return;
  if (fanIsOpen) { fanSetOpen(false); fanMainBtn.focus({ preventScroll: true }); }
  else if (fanWinEl.classList.contains('on') && !fanWinEl.classList.contains('win-out') && !fanOverlayShowing() && !inBattle) switchTab('town');
});
// a dot appears or goes on a button (quests, journal, cards): the round button follows
{ const fanObs = new MutationObserver(() => fanDockUpdate()); fanItems.forEach(b => fanObs.observe(b, { childList: true, subtree: true })); }

/* the side of the screen (Settings -> Appearance) */
function syncHandSeg() { document.querySelectorAll('#handSeg .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.handPick === fanHand())); }
document.querySelectorAll('#handSeg .seg-btn').forEach(b => b.addEventListener('click', () => {
  prefs.menuHand = b.dataset.handPick; savePrefs(); syncHandSeg(); sfx('tap'); fanLayout(); fanDockUpdate();
}));
document.getElementById('avatarChip').addEventListener('click', syncHandSeg);

fanItems.forEach(b => b.setAttribute('tabindex', '-1'));
fanLayout(); syncHandSeg();
