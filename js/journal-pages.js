/* ============================================================
   JOURNAL PAGES (v1.89.0): Today, the Almanac, the ? help sheet (Guide + What's new), and journalGo(), the one place that
   takes you from a Journal entry to where the thing lives (a tab, a building, a menu).
   Today reads the game's own daily state; nothing in it is saved or ticked by hand. The Almanac is a sticker-book of what
   you have found: fish, cards, recipes and night critters, with silhouettes for the undiscovered.
   ============================================================ */

/* ---------- going somewhere ---------- */
// Buildings the Journal can send you to (id of INTERIORS, the district it stands in, and what to call it).
const JPLACES = {
  bakery: { scene: 'bakery', district: 'square', name: "Maple's bakery" },
  home: { scene: 'home', district: 'square', name: 'your cottage' },
  nook: { scene: 'nook', district: 'square', name: 'the Reading Nook' },
  cup: { scene: 'cup', district: 'square', name: 'the fountain' },
  cellar: { scene: 'cellar', district: 'square', name: 'the cellar' },
  museum: { scene: 'museum', district: 'market', name: 'the Card Museum' },
  shop: { scene: 'card-shop', district: 'market', name: 'the Card Shop' },
  lantern: { scene: 'lantern', district: 'market', name: "Lumen's Lantern Market" },
  net: { scene: 'harbor-hut', district: 'harbor', name: "Tam's Net Loft" },
  glass: { scene: 'garden-glass', district: 'garden', name: "Iris's Glasshouse" }
};
// Targets: { tab } switches tab, { menu } opens the player menu (settings / social), { map } opens the world map,
// { scene, district, name } walks into a building when you are already in its district.
function journalGo(t) {
  if (!t) return;
  if (inBattle) return;
  if (t.tab) { switchTab(t.tab); return; }
  if (t.calm) { switchTab('town'); setTimeout(() => openCalm(), 200); return; }
  if (t.map) { switchTab('town'); setTimeout(openWorldMap, 200); return; }
  if (t.menu) { switchTab('town'); setTimeout(() => { openPlayerMenu(); document.getElementById(t.menu === 'social' ? 'segPmSocial' : 'segPmSettings').click(); }, 200); return; }
  if (t.scene) {
    switchTab('town');
    if (t.district && state.currentDistrict !== t.district) { toast(`${t.name} is in ${DISTRICTS[t.district].name}. Open the map to travel there.`); return; }
    setTimeout(() => openSceneFx(t.scene), 260);
    return;
  }
  switchTab('town');
}
const GUIDE_GO = {
  'Districts': { map: 1 }, 'Themes': { menu: 'settings' }, 'Inventory': { tab: 'character' }, 'Character tab': { tab: 'character' },
  'Draft Run': JPLACES.cup, 'Festival Cup': JPLACES.cup, 'Deck challenges': JPLACES.cup, 'Daily puzzle': JPLACES.nook,
  'The cellar': JPLACES.cellar, 'Letters': JPLACES.home, 'Your cottage': JPLACES.home, 'Card Museum & expeditions': JPLACES.museum,
  'Packs & decorations': JPLACES.shop, 'Lantern Market': JPLACES.lantern, 'The Net Loft': JPLACES.net, 'The Glasshouse': JPLACES.glass,
  'Workshop': { tab: 'collection' }, 'Index & sets': { tab: 'collection' }, 'Charms & mastery': { tab: 'collection' },
  'Pebbles and soft limits': { menu: 'settings' }, 'Who goes first': { menu: 'settings' }, 'Ghost duels': { menu: 'social' }
};
function guideTarget(name) { return GUIDE_GO[name] || null; }

/* ---------- Today ---------- */
function dailyTaskCount() {
  const ids = new Set(), t = todayKey();
  Object.values(INTERIORS).forEach(it => { if (Array.isArray(it.actions)) it.actions.forEach(a => { if (a.kind === 'daily') ids.add(a.id); }); });
  let done = 0;
  Object.keys(DISTRICTS).forEach(k => {
    const d = state.districtData && state.districtData[k]; if (!d || !d.buildings) return;
    Object.values(d.buildings).forEach(b => { if (b && typeof b === 'object') ids.forEach(id => { if (b[id] === t) done++; }); });
  });
  return { done: Math.min(done, ids.size), total: ids.size };
}
function minigamePrizesToday() { return Object.keys(MINIGAMES).reduce((n, id) => n + miniState(id).rewarded, 0); }
function todayModel() {
  const now = Date.now(), pr = state.progress, away = [], daily = [], week = [], locked = [];
  const bake = (ensureDistrictData('square').buildings.bakery || {}).oven;
  if (bake && bake.startedAt && now - bake.startedAt >= (bake.ms || BAKE_MS)) away.push({ icon: '🍞', title: "Bread is ready at Maple's", sub: 'Take it out, then share it or cook with it', go: JPLACES.bakery });
  const home = expedState().active.filter(t => t.ends <= now).length;
  if (home) away.push({ icon: '🧭', title: `${home === 1 ? 'An expedition team is' : home + ' expedition teams are'} home`, sub: 'Collect Pebbles, supplies and maybe a card', go: JPLACES.museum });
  const ripe = cropsIn().filter(c => cropProgress(c) >= 1).length;
  if (ripe) away.push({ icon: '🌻', title: `${ripe} crop${ripe === 1 ? ' is' : 's are'} ripe`, sub: 'Harvest them in Town Square', go: { tab: 'town' } });
  const mail = unreadMail();
  if (mail) away.push({ icon: '📬', title: `${mail} unread letter${mail === 1 ? '' : 's'}`, sub: 'Read them at your cottage', go: JPLACES.home });

  daily.push({ icon: '🎁', title: 'Daily gift', sub: giftReady() ? 'Claim it in Rewards' : 'Claimed today', done: !giftReady(), frac: giftReady() ? 0 : 1, go: { tab: 'quests' } });
  // There are 20 daily quests to choose from, so this counts the ones you have claimed (three is a good day), not "of 20".
  const qs = pr.quests || [], qReady = qs.filter(q => !q.claimed && questProgress(q) >= questDef(q.id).goal).length, qClaimed = qs.filter(q => q.claimed).length;
  if (qs.length) daily.push({ icon: '📜', title: 'Daily quests', sub: qReady ? `${qReady} ready to claim` : qClaimed ? `${qClaimed} claimed today` : 'Pick a few in Rewards', done: qClaimed >= 3 && !qReady, frac: Math.min(1, qClaimed / 3), bar: [Math.min(qClaimed, 3), 3], go: { tab: 'quests' } });
  const dt = dailyTaskCount();
  daily.push({ icon: '🪑', title: 'Help around town', sub: `${dt.done} of ${dt.total} daily tasks done`, done: dt.done >= dt.total, frac: dt.total ? dt.done / dt.total : 0, bar: [dt.done, dt.total], go: { tab: 'town' } });
  const mp = minigamePrizesToday();
  daily.push({ icon: '🎸', title: 'Minigame prizes', sub: mp ? `${mp} prize${mp === 1 ? '' : 's'} earned today` : 'Play a minigame at a house in town', done: mp >= 3, frac: Math.min(1, mp / 3), go: { tab: 'town' } });
  const pz = puzzleState(), pzDone = pz.solvedDay === todayKey();
  daily.push({ icon: '🧩', title: 'Daily puzzle', sub: pzDone ? 'Solved today' : 'A new board in the Reading Nook', done: pzDone, frac: pzDone ? 1 : 0, go: JPLACES.nook });
  const ch = challengeState().list || [], chWon = ch.filter(c => c.won).length;
  if (ch.length) daily.push({ icon: '🎯', title: 'Deck challenges', sub: `${chWon} of ${ch.length} beaten today`, done: chWon >= ch.length, frac: chWon / ch.length, bar: [chWon, ch.length], go: JPLACES.cup });

  week.push({ icon: '🧘', title: 'Calm corner', sub: calmRested() ? 'Rested today' : 'Breathe, rake sand, look at the stars', done: false, frac: 0, go: { calm: true } });
  const cs = cupState();
  week.push({ icon: '🏆', title: cupName(), sub: cs.trophy ? 'Trophy won this week' : cs.active ? `Round ${cs.round + 1} of 3 in progress` : 'Three matches, no healing', done: !!cs.trophy, frac: cs.trophy ? 1 : cs.round / 3, go: JPLACES.cup });
  if (featureLocked('draft')) locked.push({ icon: '🎴', title: featureLockText('draft').replace(/^🎴 /, '') });
  else { const dr = draftState(); week.push({ icon: '🎴', title: 'Draft Run', sub: dr.active ? 'A run is in progress' : dr.clearedToday ? 'Cleared today. More runs pay less.' : 'Build a deck from offers of three', done: !!dr.clearedToday, frac: dr.clearedToday ? 1 : 0, go: JPLACES.cup }); }
  if (featureLocked('ghost')) locked.push({ icon: '👻', title: featureLockText('ghost').replace(/^👻 /, '') });
  else { const gs = ghostState(); week.push({ icon: '👻', title: 'Ghost duels', sub: `${gs.paid} of 5 paid wins today`, done: gs.paid >= 5, frac: gs.paid / 5, bar: [gs.paid, 5], go: { menu: 'social' } }); }
  return { away, groups: [{ title: 'Daily', items: daily }, { title: 'This week', items: week }], locked, daily };
}
function jBar(n, of) { return `<div class="jbar" role="progressbar" aria-valuenow="${n}" aria-valuemax="${of}"><i style="width:${of ? Math.round(n / of * 100) : 0}%"></i></div>`; }
// "Clear skies now, rain in about 6 min" - the short form of forecastText() (which also lists each weather's effects).
function weatherBrief() {
  const w = state.weather, name = k => `${WEATHER_KINDS[k].icon || '☀️'} ${WEATHER_KINDS[k].name}`, now = weatherNow(), nx = WEATHER_KINDS[w.next] ? w.next : null;
  const mins = Math.max(1, Math.round(((w.changesAt || 0) - (w.elapsed || 0)) / 60000));
  return nx && nx !== now ? `${name(now)} now · ${name(nx)} in about ${mins} min` : `${name(now)}, settled for a while`;
}
let todayGo = [];
function renderToday() {
  const m = todayModel(), box = document.getElementById('todayList'), ev = eventNow(), sd = seasonDef();
  const fully = m.daily.filter(i => i.done).length, frac = m.daily.reduce((s, i) => s + i.frac, 0) / m.daily.length, C = 2 * Math.PI * 30;
  todayGo = [];
  const row = i => {
    const idx = todayGo.push(i.go) - 1;
    return `<div class="jtd${i.done ? ' done' : ''}"><span class="jtd-ic">${i.icon}</span><div class="jtd-t"><b>${escapeHtml(i.title)}</b><span class="jsoft">${escapeHtml(i.sub)}</span>${i.bar ? jBar(i.bar[0], i.bar[1]) : ''}</div>${i.done ? '<span class="jtd-done" aria-label="Done">✓</span>' : `<button type="button" class="jgo" data-tgo="${idx}">Go →</button>`}</div>`;
  };
  const dayName = new Date().toLocaleDateString([], { weekday: 'long' });
  let html = `<div class="card-box jtd-hero"><svg class="jring" viewBox="0 0 72 72" aria-hidden="true"><circle cx="36" cy="36" r="30" fill="none" stroke="var(--track)" stroke-width="7"/><circle cx="36" cy="36" r="30" fill="none" stroke="var(--water)" stroke-width="7" stroke-linecap="round" stroke-dasharray="${(C * frac).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 36 36)"/><text x="36" y="41" text-anchor="middle" font-size="15">${fully}/${m.daily.length}</text></svg>
    <div><b>${fully === m.daily.length ? 'All caught up' : `${dayName} in ${DISTRICTS[state.currentDistrict].name}`}</b><span class="jsoft">${sd.icon} ${sd.name}, ${seasonDaysLeft()} day${seasonDaysLeft() === 1 ? '' : 's'} left · ${ev.icon} ${ev.name}<br>${weatherBrief()}</span></div></div>`;
  if (m.away.length) html += `<div class="jgroup-h">Since you were away<small>${m.away.length}</small></div><div class="card-box jtd-away">${m.away.map(row).join('')}</div>`;
  m.groups.forEach(g => { html += `<div class="jgroup-h">${g.title}<small>${g.items.filter(i => i.done).length} of ${g.items.length}</small></div><div class="card-box">${g.items.map(row).join('')}</div>`; });
  if (m.locked.length) html += `<div class="jgroup-h">Coming up</div><div class="card-box">${m.locked.map(l => `<div class="jtd locked"><span class="jtd-ic">🔒</span><div class="jtd-t"><b>${l.icon} ${escapeHtml(l.title)}</b></div></div>`).join('')}</div>`;
  box.innerHTML = html;
  box.querySelectorAll('[data-tgo]').forEach(b => b.addEventListener('click', () => { sfx('tap'); buzz(HAP.tap); journalGo(todayGo[+b.dataset.tgo]); }));
}

/* ---------- Almanac ---------- */
let almTab = 'fish', almFam = 'all', almSel = '';
const ALM_TABS = [['fish', '🐟 Fish'], ['cards', '🃏 Cards'], ['recipes', '🍲 Recipes'], ['bugs', '✨ Critters']];
const ALM_FAMS = [['all', 'All'], ['grove', '🌿 Grove'], ['stone', '🪨 Stone'], ['tide', '🌊 Tide'], ['wind', '🪶 Wind'], ['spell', '✨ Spells']];
function almanacSet(tab) {
  if (tab === 'fish') { const f = fishState(); return FISH.map(x => ({ id: x.id, icon: x.icon, name: x.name, found: !!f.caught[x.id], hint: x.hint || '', blurb: x.blurb, extra: f.caught[x.id] ? `Caught ${f.caught[x.id]}×` : '' })); }
  if (tab === 'cards') { const d = discoveredSet(); return CARD_POOL.map(c => ({ id: c.id, icon: c.icon, art: c, name: c.name, found: d.has(c.id), card: c, fam: c.spell ? 'spell' : CARD_FAMILY[c.id] || '', hint: c.exclusive ? ('A prize ' + (EXCLUSIVE_HINT[c.exclusive] || 'from a special place')) : 'Packs, the ground, prizes and Draft Runs' })); }
  if (tab === 'recipes') { const made = state.progress.recipesMade || {}; return RECIPES.map(r => ({ id: r.id, icon: r.icon, name: r.name, found: !!made[r.id] || dishCount(r.id) > 0, hint: 'Needs ' + needsText(r), blurb: 'Needs ' + needsText(r) })); }
  const bc = bugState().caught; return BUGS.map(b => ({ id: b.id, icon: b.icon, name: b.name, found: !!bc[b.id], hint: b.hint || '', blurb: b.hint || '', extra: bc[b.id] ? `Caught ${bc[b.id]}×` : '' }));
}
function jumpAlmanac(tab) {
  almTab = tab; almSel = '';
  if (typeof currentTab !== 'undefined' && currentTab !== 'journal') switchTab('journal');
  switchJournalSegment('almanac');
}
function renderJournalAlmanac() {
  jChips(document.getElementById('almanacTabs'), ALM_TABS.map(([v, l]) => { const s = almanacSet(v); return [v, `${l} ${s.filter(x => x.found).length}/${s.length}`]; }), almTab, v => { almTab = v; almSel = ''; renderJournalAlmanac(); });
  const set = almanacSet(almTab), found = set.filter(x => x.found).length, body = document.getElementById('almanacBody');
  let html = `<div class="jprog"><div class="jsoft jprog-h"><span>${found} of ${set.length} discovered</span><span>${Math.round(found / set.length * 100)}%</span></div>${jBar(found, set.length)}</div>`;
  if (almTab === 'cards') html += `<div class="jchips" id="almFams" role="group" aria-label="Family"></div>`;
  const shown = set.map((x, i) => Object.assign({ i }, x)).filter(x => almTab !== 'cards' || almFam === 'all' || x.fam === almFam);
  html += `<div class="jgrid">${shown.map(x => `<button type="button" class="jtile${x.found ? '' : ' unk'}${almSel === almTab + x.i ? ' sel' : ''}" data-i="${x.i}" aria-label="${x.found ? escapeHtml(x.name) : 'Not discovered yet'}"${x.card && x.found ? ` data-r="${x.card.rarity}"` : ''}><span class="jt-em">${x.card ? cardArtHtml(x.card) : x.icon}</span><span class="jt-nm">${x.found ? escapeHtml(x.name) : '???'}</span></button>`).join('')}</div>`;
  const sel = almSel.startsWith(almTab) ? set[+almSel.slice(almTab.length)] : null;
  if (sel) {
    html += `<div class="card-box jdetail"><b>${sel.found ? `${sel.icon} ${escapeHtml(sel.name)}` : '❓ Not discovered yet'}</b>`;
    if (sel.found && sel.card) html += `<span class="jsoft">${RARITY_LABEL[sel.card.rarity]} · costs ${sel.card.cost} · ${cardStatsText(sel.card)}${sel.fam && sel.fam !== 'spell' ? ` · ${FAMILIES[sel.fam].icon} ${FAMILIES[sel.fam].name}` : ''}</span>${hasAbility(sel.card) ? `<span class="jsoft">${cardAbilityHtml(sel.card)}</span>` : ''}`;
    else if (sel.found) html += `<span class="jsoft">${escapeHtml(sel.blurb || '')}${sel.extra ? ' · ' + sel.extra : ''}</span>`;
    else html += `<span class="jsoft">Hint: ${escapeHtml(sel.hint || 'Keep exploring')}</span>`;
    html += '</div>';
  }
  body.innerHTML = html;
  if (almTab === 'cards') jChips(document.getElementById('almFams'), ALM_FAMS, almFam, v => { almFam = v; renderJournalAlmanac(); });
  body.querySelectorAll('.jtile').forEach(t => t.addEventListener('click', () => { sfx('flip'); const k = almTab + t.dataset.i; almSel = almSel === k ? '' : k; renderJournalAlmanac(); }));
}

/* ---------- the ? sheet: Guide and What's new ---------- */
let sheetTab = 'guide';
function openJournalSheet(tab) {
  if (tab) sheetTab = tab;
  setSheetTab(sheetTab);
  document.getElementById('journalSheet').classList.add('show'); document.getElementById('journalScrim').classList.add('show');
  sfx('nav'); buzz(HAP.tap);
}
function closeJournalSheet() { document.getElementById('journalSheet').classList.remove('show'); document.getElementById('journalScrim').classList.remove('show'); updateJournalBadge(); }
function setSheetTab(t) {
  sheetTab = t;
  document.getElementById('sheetTabGuide').classList.toggle('active', t === 'guide'); document.getElementById('sheetTabUpdates').classList.toggle('active', t === 'updates');
  document.getElementById('guideView').classList.toggle('hidden', t !== 'guide'); document.getElementById('changelogView').classList.toggle('hidden', t !== 'updates');
  if (t === 'guide') renderGuide(); else renderChangelog();
}
document.getElementById('journalHelpBtn').addEventListener('click', () => openJournalSheet());
document.getElementById('journalSheetClose').addEventListener('click', closeJournalSheet);
document.getElementById('journalScrim').addEventListener('click', closeJournalSheet);
document.getElementById('sheetTabGuide').addEventListener('click', () => { sfx('nav'); setSheetTab('guide'); });
document.getElementById('sheetTabUpdates').addEventListener('click', () => { sfx('nav'); setSheetTab('updates'); });
document.getElementById('guideSearch').addEventListener('input', e => { guideQuery = e.target.value; renderGuide(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.getElementById('journalSheet').classList.contains('show')) closeJournalSheet(); });

/* A small bar with an Undo button for a few seconds (used by Notes' swipe-to-delete). */
let undoTimer = 0;
function showUndoBar(msg, onUndo) {
  let bar = document.getElementById('jundo');
  if (!bar) { bar = document.createElement('div'); bar.id = 'jundo'; bar.className = 'jundo'; bar.setAttribute('role', 'status'); document.body.appendChild(bar); }
  bar.innerHTML = `<span>${escapeHtml(msg)}</span><button type="button">Undo</button>`;
  bar.querySelector('button').addEventListener('click', () => { clearTimeout(undoTimer); bar.classList.remove('show'); onUndo(); sfx('tap'); });
  void bar.offsetWidth; bar.classList.add('show');
  clearTimeout(undoTimer); undoTimer = setTimeout(() => bar.classList.remove('show'), 5000);
}
