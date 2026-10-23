/* ============================================================
   YOUR HOME'S SCREENS (build 320)
   Every piece in your home that does something opens its own full-screen view the moment you walk up to it (home-room.js hrUse), laid out
   like the building screens: a title bar (spacer, title, a chip), a line of speech, the stage, the controls, and "Back to the room" at the
   foot. One element, #homeScreen (built on first use), shows one view at a time (`data-view`):
     mail      - letters as sealed envelopes: tap to break the seal, tap the parcel to unwrap a gift, write back to a friend (+1 friendship),
                 and every sender leaves a stamp in the album (mailState().stamps).
     bonsai    - the calm corner's bonsai (calmState().bonsai), tended by hand: hold to water into the green band and snip the three stray
                 shoots that grow each day. A tended day counts toward a streak (bonsaiTendDone, js/calm.js); from Young tree it flowers once
                 a day, and the flower pays a little.
     sand      - the calm corner's sand garden, bigger: three rakes, stones and shells, and three leaves fall on it each day; rake one away
                 for 1 of the currency.
     nap       - the armchair: close your eyes and catch the dream motes that drift up for a few seconds; the nap pays the old daily amount
                 plus a little for the motes (at most +3), once a day (buildingState('home').nap, as before).
     shelves   - six spots on three boards for your town decorations (homeState().shelf); two of a kind on a board make a matching pair.
     frames    - the three frames on the wall (homeState().favs); a framed card draws its family's spirits (hsFamilyWeights).
     trophies  - what you have won, and the empty places still to win, with your records.
     altar     - the four gods as shrines, what each still needs, and the way to the candles (js/altar-screen.js, which opens above this).
     manage    - your home: level, cosiness, stats, the pieces still to come, upgrades, colours and the furniture shop. Buying or placing
                 drops you into decorating (home-room.js), which is where pieces are moved.
   The rules stay where they were (mail in houses-and-cellar.js, the bonsai and sand in calm.js, summoning in summoning.js, the home in
   home-room.js); this file is the hands-on way to reach them. Hooks: renderScene() -> homeScreenSync(), closeScene() -> homeScreenHide().
   Colours are the --ho-* tokens in css/theme.css (a warm room, the same in both themes), CSS in the YOUR HOME'S SCREENS block of
   css/latest.css. tests/home-screens.test.js.
   ============================================================ */
const HO_VIEWS = { perch: 'perch', mantel: 'mantel', cabinet: 'cabinet', visitor: 'visitor', 'mg-tidy': 'tidy', mail: 'mail', 'calm-bonsai': 'bonsai', 'calm-sand': 'sand', nap: 'nap', decorate: 'shelves', favs: 'frames', trophies: 'trophies', altar: 'altar', manage: 'manage' };
const HO_TITLES = { perch: 'Spirit perch', mantel: 'Reborn mantel', cabinet: 'Collector\'s cabinet', visitor: 'A visiting spirit', tidy: 'Tidy Up', mail: 'Mailbox', bonsai: 'Your bonsai', sand: 'Sand garden', nap: 'The armchair', shelves: 'The shelves', frames: 'Framed cards', trophies: 'Trophy case', altar: 'The altar', manage: 'Your home' };
const HO_SHOOTS = 3, HO_SHOOT_SPOTS = [[20, 34], [80, 30], [28, 66], [74, 62], [50, 12], [12, 52], [88, 50]];
const HO_LEAVES = 3, HO_DREAM_MS = 9000, HO_MOTES = ['✨', '🌙', '⭐', '🫧'];
let homeEl = null, hoUi = null, hoCleanups = [];

const hoOpen = () => !!hoUi && !!homeEl && !homeEl.classList.contains('hidden');
const $ho = id => document.getElementById(id);
function hoLater(fn, ms) { const t = setTimeout(fn, ms); hoCleanups.push(() => clearTimeout(t)); return t; }
function hoEvery(fn, ms) { const t = setInterval(fn, ms); hoCleanups.push(() => clearInterval(t)); return t; }
function hoOn(el, type, fn) { el.addEventListener(type, fn); hoCleanups.push(() => el.removeEventListener(type, fn)); }
function hoReset() { hoCleanups.forEach(f => { try { f(); } catch (e) { /* already gone */ } }); hoCleanups = []; }
function hoSay(t) { if (hoUi) hoUi.say = t; const el = $ho('hoSay'); if (el) el.textContent = t || ''; }

function homeBuild() {
  const el = document.createElement('div'); el.id = 'homeScreen'; el.className = 'home-screen hidden'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Your home');
  el.innerHTML = `<div class="ho-bar"><span aria-hidden="true"></span><b class="ho-title" id="hoTitle"></b><span class="ho-chip" id="hoChip"></span></div>
    <p class="ho-say" id="hoSay" aria-live="polite"></p>
    <div class="ho-stage" id="hoStage"></div>
    <div class="ho-foot" id="hoFoot"></div>
    <button type="button" class="btn btn-ghost ho-leave" id="hoLeave">← Back to the room</button>`;
  document.body.appendChild(el); homeEl = el; screenFxInit(el);
  el.addEventListener('click', e => {
    if (e.target.closest('#hoLeave')) { homeScreenClose(); return; }
    const b = e.target.closest('[data-ho]'); if (b && !b.disabled && hoUi) hoAct(b.dataset.ho);
  });
  return el;
}
// Open the view for one of the cottage's actions (or 'manage'). False when that action has no view of its own.
function homeScreenOpen(act, uid) {   // uid: which piece, for the spirit pieces (there can be several perches)
  const view = HO_VIEWS[act]; if (!view || !scene || scene.id !== 'home') return false;
  const el = homeEl || homeBuild();
  hoUi = { view, uid: uid || null, say: '', tab: 'home', cat: 'all', rar: 'all', letter: null, frame: null, god: null, pick: null, tool: 'rake' };
  if (homeRoom.player) { homeRoom.walk++; homeRoom.player.classList.remove('walking'); }
  homeRoom.sel = null;
  screenFxShow(el); document.body.classList.add('in-home-screen'); sfx('nav'); buzz(HAP.tap);
  if (view === 'altar') showTipOnce('altar'); else if (view === 'manage') showTipOnce('homeManage'); else showTipOnce('homeScreens');
  hoRender();
  return true;
}
function homeScreenClose() {
  if (!hoOpen()) return;
  if (hoUi.view === 'tidy' && typeof mini !== 'undefined' && mini && mini.house === 'home') miniStop();   // leaving mid-game ends it (no medal), and the room comes back
  hoReset(); screenFxHide(homeEl); document.body.classList.remove('in-home-screen'); hoUi = null; sfx('nav');
  if (scene && scene.id === 'home') renderScene();
}
function homeScreenHide() { if (!homeEl) return; hoReset(); homeEl.classList.add('hidden'); document.body.classList.remove('in-home-screen'); hoUi = null; }
// renderScene() calls this: views that only show saved things follow every change (a claimed gift, a god summoned at the candles).
function homeScreenSync() {
  if (!hoOpen()) return;
  if (!scene || scene.id !== 'home') { homeScreenHide(); return; }
  if (['mail', 'altar', 'manage', 'frames', 'shelves', 'trophies', 'perch', 'mantel', 'cabinet', 'visitor'].includes(hoUi.view) && !hoUi.rendering) hoRender();
  else if (hoUi.view === 'tidy' && !hoUi.rendering && hoTidyPhase() !== hoUi.phase) hoRender();   // the game started or ended
}
function hoRender() {
  if (!hoOpen()) return;
  hoReset(); hoUi.rendering = true;
  const v = hoUi.view;
  homeEl.dataset.view = v;
  $ho('hoTitle').textContent = HO_TITLES[v];
  $ho('hoChip').textContent = '';
  const fn = { perch: hoPerch, mantel: hoMantel, cabinet: hoCabinet, visitor: hoVisitor, tidy: hoTidy, mail: hoMail, bonsai: hoBonsai, sand: hoSand, nap: hoNap, shelves: hoShelves, frames: hoFrames, trophies: hoTrophies, altar: hoAltar, manage: hoManage }[v];
  fn($ho('hoStage'), $ho('hoFoot'));
  if (!hoUi) return;   // the view closed itself (its piece or its visitor is gone)
  hoSay(hoUi.say);
  hoUi.rendering = false;
}
function hoAct(a) {
  const [what, ...rest] = a.split(':'), arg = rest.join(':'), u = hoUi;
  const run = {
    // spirit pieces: the rules are home-spirits.js's hsAction, which redraws through renderScene() -> homeScreenSync()
    hs: () => { hsAction('hs:' + arg); return true; },
    set: () => { const st = CARD_SETS.find(x => x.id === arg); if (st) { u.say = `${st.icon} ${st.name}: ${setComplete(st) ? st.text : `${setProgress(st)} of ${st.cards.length} cards. ${st.text}`}`; sfx('tap'); } },
    welcome: () => { homeScreenClose(); hsWelcome(); return true; },
    // tidy
    tstart: () => { u.combo = 0; u.bestCombo = 0; miniStart('tidy'); return true; },
    // mail
    open: () => hoOpenLetter(arg), letters: () => { u.letter = null; u.say = ''; sfx('nav'); }, claim: () => { u.popped = arg; claimLetter(arg); if (hoUi) hoRender(); return true; },
    claimall: () => { mailState().list.filter(l => l.gift && !l.claimed).forEach(l => claimLetter(l.id)); }, del: () => { deleteLetter(arg); return true; },
    reply: () => hoReply(rest[0], rest[1]),
    // bonsai
    plant: () => { calmState().bonsai = { since: Date.now(), trims: 0, trimDay: '', paid: 0 }; saveState(); sfx('claim'); u.say = 'A seedling goes into the pot. It grows with real days.'; },
    snip: () => hoSnip(+arg), bloom: () => hoBloom(),
    // sand
    tool: () => { u.tool = arg; sfx('tap'); }, smooth: () => { const st = calmState().sand; st.strokes = []; st.stones = []; saveState(); sfx('soft'); u.say = 'Smooth again, ready for something new.'; },
    // nap
    doze: () => { hoDoze(); return true; },
    // shelves
    put: () => { u.say = shelfAction(arg); }, take: () => hoTakeShelf(+arg), clear: () => { u.say = shelfAction('clear'); },
    // frames
    frame: () => { u.frame = u.frame === +arg ? null : +arg; sfx('tap'); }, pick: () => hoPickCard(arg), unframe: () => hoUnframe(), rar: () => { u.rar = arg; sfx('tap'); },
    // trophies
    tro: () => { const g = hoTrophyGoals()[+arg]; if (g) { u.pick = +arg; u.say = `${g.name}: ${g.how}`; sfx('tap'); } },
    // altar
    god: () => { u.god = u.god === arg ? null : arg; u.say = u.god ? '' : altarIntro(); sfx('tap'); }, summon: () => { u.say = summonTap(arg); },
    candles: () => { openAltarScreen(); return true; },
    // manage
    tab: () => { u.tab = arg; sfx('nav'); }, up: () => { hrAction('hr:up'); }, style: () => { hrAction('hr:' + arg); },
    cat: () => { u.cat = arg; sfx('tap'); },
    decorate: () => { hoToRoom(); return true; }, place: () => { hoToRoom('hr:place:' + arg); return true; }, buy: () => { hoToRoom('hr:buy:' + arg); return true; }
  }[what];
  if (!run) return;
  if (run() === true) return;   // the step re-draws (or leaves) on its own
  hoRender();
}

/* ---------------- the spirit pieces and a visiting spirit (js/home-spirits.js) ---------------- */
const hoPiece = () => hrHome().items.find(i => i.uid === hoUi.uid) || null;
const hoSpiritCard = (id, act, on) => { const d = cardDef(id); return `<button type="button" class="ho-card rarity-${d.rarity}${on ? ' on' : ''}" data-ho="${act}">${cardArtHtml(d)}<small>${escapeHtml(d.name)}</small></button>`; };
function hoPerch(stage, foot) {
  const it = hoPiece(), u = hoUi; if (!it) { homeScreenClose(); return; }
  const cur = hsCardOf(it), d = cur && cardDef(cur), fam = cur && hsFam(cur), glow = cur ? (hsResonant(it) ? HS_FAMILY_GLOW[fam] : HS_GLOW[d.rarity]) : '';
  $ho('hoChip').textContent = cur ? RARITY_LABEL[d.rarity] : 'Empty';
  stage.innerHTML = `<div class="ho-perch${cur ? ' on' : ''}${hsResonant(it) ? ' resonant' : ''}" style="--g:${glow || 'transparent'}"><span class="ho-perch-fig">${cur ? cardArtHtml(d) : '🕊️'}</span><i class="ho-perch-stand"></i>
    ${cur ? `<div class="ho-perch-name"><b>${escapeHtml(d.name)}</b><small>${RARITY_LABEL[d.rarity]}${fam ? ' · ' + FAMILIES[fam].name : ''}${hsResonant(it) ? ' · resonating with its corner' : ''}</small></div>` : ''}</div>`;
  const others = hrHome().items.filter(i => i.id === 'perch' && i.uid !== it.uid).map(hsCardOf).filter(Boolean), list = hsOwnedBases().filter(id => !others.includes(id)).slice(0, 40);
  foot.innerHTML = `<div class="ho-sec">${cur ? 'Choose another spirit' : 'Choose a spirit'}</div>${list.length ? `<div class="ho-cards">${list.map(id => hoSpiritCard(id, `hs:perch:${it.uid}:${id}`, id === cur)).join('')}</div>` : '<p class="ho-note">Cards you collect can rest here.</p>'}
    ${cur ? `<button type="button" class="ho-btn ghost" data-ho="hs:clear:${it.uid}">Send it back to your cards</button>` : ''}`;
  if (!u.say) u.say = hsSay('perch') + ' A spirit beside a corner of its own family resonates, and draws visitors.';
}
function hoMantel(stage, foot) {
  const it = hoPiece(), u = hoUi; if (!it) { homeScreenClose(); return; }
  const have = (it.cards || []).filter(c => hsOwns(c) && hasFoil(c)), reborn = [...new Set(Object.keys(foils()).filter(k => foils()[k] > 0).map(k => BattleEngine.baseIdOf(k)))].filter(c => cardDef(c) && !have.includes(c));
  $ho('hoChip').textContent = `✨ ${have.length}/3`;
  stage.innerHTML = `<div class="ho-mantel">${[0, 1, 2].map(i => { const c = have[i], d = c && cardDef(c);
    return d ? `<button type="button" class="ho-mslot on rarity-${d.rarity}" data-ho="hs:mdel:${it.uid}:${c}" aria-label="Take ${escapeHtml(d.name)} down"><span>${cardArtHtml(d)}</span><small>${escapeHtml(d.name)}</small></button>` : '<span class="ho-mslot" aria-hidden="true"></span>'; }).join('')}<i class="ho-mantel-shelf"></i></div>`;
  foot.innerHTML = have.length >= 3 ? '<p class="ho-note">The mantel is full. Tap a spirit on it to take it down.</p>'
    : `<div class="ho-sec">Reborn spirits</div>${reborn.length ? `<div class="ho-cards">${reborn.map(c => hoSpiritCard(c, `hs:madd:${it.uid}:${c}`)).join('')}</div>` : '<p class="ho-note">A spirit that faded as an Echo can come back Reborn. They shimmer here.</p>'}`;
  if (!u.say) u.say = hsSay('mantel') + ' Tap one on the mantel to take it down.';
}
function hoCabinet(stage, foot) {
  const done = CARD_SETS.filter(setComplete).length;
  $ho('hoChip').textContent = `🏅 ${done}/${CARD_SETS.length}`;
  stage.innerHTML = `<div class="ho-cabinet">${CARD_SETS.map(st => { const n = setProgress(st), ok = setComplete(st);
    return `<button type="button" class="ho-medal-row${ok ? ' on' : ''}" data-ho="set:${st.id}"><span>${st.icon}</span><b>${escapeHtml(st.name)}</b><div class="ho-bar2"><i style="width:${Math.round(n / st.cards.length * 100)}%"></i></div><small>${ok ? 'Lit ✓' : `${n}/${st.cards.length}`}</small></button>`; }).join('')}</div>`;
  foot.innerHTML = '';
  if (!hoUi.say) hoUi.say = hsSay('cabinet') + ' Tap a set to see what it needs.';
}
function hoVisitor(stage, foot) {
  const v = hrHome().level >= HS_VISIT_LEVEL ? hsVisit().cur : null; if (!v) { homeScreenClose(); return; }
  const d = cardDef(v.card), fam = FAMILIES[v.fam];
  $ho('hoChip').textContent = RARITY_LABEL[d.rarity];
  stage.innerHTML = `<div class="ho-visit" style="--g:${HS_GLOW[v.rar] || 'transparent'}"><span class="ho-visit-fig">${cardArtHtml(d)}</span><b>${escapeHtml(d.name)}</b><small>${RARITY_LABEL[d.rarity]} · ${fam ? fam.name : 'a spirit'}</small></div>`;
  foot.innerHTML = '<button type="button" class="ho-btn pri" data-ho="welcome">🤝 Welcome it</button>';
  if (!hoUi.say) hoUi.say = 'A spirit has come to visit. It has brought you something.';
}

/* ---------------- Tidy Up ----------------
   The game is still MINIGAMES.tidy (js/puzzle-memory-minigames.js: the 20 seconds, the medal lines, the prizes and the daily limit); this
   is its screen. A thing to put away sits in the middle of a messy floor: drag it onto the wardrobe, bookshelf or kitchen (or tap one).
   It flies into the right one, or shakes back from the wrong one, and right answers in a row build a combo (just for show: the score is
   the game's own). The game's 100 ms timer calls miniRender(), which calls hoTidyPaint() to update this screen in place. */
function hoTidyPhase() { return typeof mini !== 'undefined' && mini && mini.house === 'home' && mini.id === 'tidy' ? (mini.done ? 'done' : 'play') : 'idle'; }
const hoTidyBins = () => Object.keys(TIDY_BINS).map(k => `<button type="button" class="ho-bin" data-ho-bin="${k}"><span>${TIDY_BINS[k].icon}</span><b>${TIDY_BINS[k].name}</b><i class="ho-bin-n">0</i></button>`).join('');
function hoTidy(stage, foot) {
  const u = hoUi, ph = hoTidyPhase(), def = MINIGAMES.tidy, ms = miniState('tidy'), left = Math.max(0, MINI_DAILY_REWARDED - ms.rewarded);
  u.phase = ph;
  $ho('hoChip').textContent = left ? `🎁 ${left} left` : '🎁 done';
  if (ph === 'play') {
    u.shown = null; u.binN = { wardrobe: 0, shelf: 0, kitchen: 0 };
    stage.innerHTML = `<div class="ho-tidy play"><div class="ho-tbar"><i id="hoTidyTime"></i></div><div class="ho-tscore"><b id="hoTidyScore">0</b><span id="hoTidyCombo"></span></div>
      <div class="ho-floor" id="hoFloor"><span class="ho-thing" id="hoThing" role="button" aria-label="Drag this to where it belongs"></span></div><div class="ho-bins">${hoTidyBins()}</div></div>`;
    foot.innerHTML = '<p class="ho-note">Drag each thing to where it belongs, or tap the right place.</p>';
    u.say = 'Go! Wardrobe, bookshelf or kitchen?';
    hoTidyWire(); hoTidyPaint();
    return;
  }
  const things = Object.values(TIDY_BINS).flatMap(b => b.things);
  const mess = Array.from({ length: 9 }, (_, i) => `<span class="ho-mess" style="left:${8 + (i * 37) % 80}%;top:${14 + (i * 53) % 62}%;--r:${(i * 47) % 70 - 35}deg">${things[(i * 5) % things.length]}</span>`).join('');
  if (ph === 'done') {
    const score = mini.st.score, tier = miniTier(def, score), medal = { gold: '🥇', silver: '🥈', bronze: '🥉' }[tier] || '🧺';
    stage.innerHTML = `<div class="ho-tidy done${tier ? ' ' + tier : ''}"><div class="ho-medal">${medal}</div><b class="ho-big">${score}</b><small>${def.scoreText(score)}${u.bestCombo >= 3 ? ` · best combo ×${u.bestCombo}` : ''}</small></div>`;
    u.say = scene.text;
  } else {
    stage.innerHTML = `<div class="ho-tidy idle"><div class="ho-floor">${mess}</div><div class="ho-bins">${hoTidyBins()}</div></div>`;
    if (!u.say) u.say = HR_CATALOG.tidy.say() + ' ' + def.how;
  }
  const t = def.tiers;
  foot.innerHTML = `<div class="ho-steps"><span>🥉 ${t.bronze}</span><span>🥈 ${t.silver}</span><span>🥇 ${t.gold}</span>${ms.best !== null ? `<span class="on">Best ${ms.best}</span>` : ''}</div>
    <button type="button" class="ho-btn pri" data-ho="tstart">🧺 ${ph === 'done' ? 'Tidy again' : 'Start tidying'}${left ? '' : ' · just for fun'}</button>`;
}
function hoTidyPaint(hit) {
  if (!hoOpen() || hoUi.view !== 'tidy' || hoTidyPhase() !== 'play') return;
  const st = mini.st, u = hoUi, thing = $ho('hoThing'); if (!thing) return;
  const bar = $ho('hoTidyTime'); if (bar) bar.style.width = Math.max(0, st.left / 20000 * 100) + '%';
  $ho('hoTidyScore').textContent = st.score;
  $ho('hoTidyCombo').textContent = u.combo >= 3 ? `×${u.combo} combo!` : '';
  if (u.shown !== st.item) { u.shown = st.item; thing.textContent = st.item.icon; thing.style.transform = ''; thing.classList.remove('in'); void thing.offsetWidth; thing.classList.add('in'); }
  if (hit) {
    const bin = homeEl.querySelector(`[data-ho-bin="${hit.bin}"]`); if (!bin) return;
    bin.classList.remove('good', 'bad'); void bin.offsetWidth; bin.classList.add(hit.ok ? 'good' : 'bad');
    if (hit.ok) { u.binN[hit.bin]++; bin.querySelector('.ho-bin-n').textContent = u.binN[hit.bin]; }
    if (hit.ok && btMotionOk() && hit.from) {   // the thing just put away flies into its place
      const f = document.createElement('span'), b = bin.getBoundingClientRect();
      f.className = 'ho-fly'; f.textContent = hit.icon; f.style.left = hit.from.left + 'px'; f.style.top = hit.from.top + 'px'; document.body.appendChild(f);
      f.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${b.left + b.width / 2 - hit.from.left - 30}px,${b.top + 10 - hit.from.top}px) scale(.35)`, opacity: .2 }], { duration: 320, easing: 'ease-in' }).onfinish = () => f.remove();
    }
  }
}
function hoTidyPut(binKey) {   // put the current thing in a place; returns nothing, paints the result
  if (hoTidyPhase() !== 'play') return;
  const st = mini.st, before = st.score, icon = st.item.icon, thing = $ho('hoThing'), from = thing && thing.getBoundingClientRect(), right = st.item.bin === binKey;
  mini.def.tap(st, binKey);
  const ok = right && st.score >= before; hoUi.combo = ok ? hoUi.combo + 1 : 0; hoUi.bestCombo = Math.max(hoUi.bestCombo, hoUi.combo);
  buzz(ok ? HAP.tap : HAP.tap);
  if (!ok && thing) { thing.classList.remove('nope'); void thing.offsetWidth; thing.classList.add('nope'); }
  hoTidyPaint({ bin: binKey, ok, icon, from: from && { left: from.left, top: from.top } });
}
function hoTidyWire() {
  const thing = $ho('hoThing'); let drag = null;
  homeEl.querySelectorAll('[data-ho-bin]').forEach(b => hoOn(b, 'pointerdown', e => { if (drag) return; e.preventDefault(); hoTidyPut(b.dataset.hoBin); }));
  hoOn(thing, 'pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; try { thing.setPointerCapture(e.pointerId); } catch (err) { /* synthetic */ } thing.classList.add('held'); });
  hoOn(thing, 'pointermove', e => { if (drag) thing.style.transform = `translate(${e.clientX - drag.x}px,${e.clientY - drag.y}px) scale(1.08)`; });
  const end = e => {
    if (!drag) return; drag = null; thing.classList.remove('held');
    thing.style.pointerEvents = 'none'; const under = document.elementFromPoint(e.clientX, e.clientY); thing.style.pointerEvents = '';   // look under the finger, not at the thing
    const bin = under && under.closest && under.closest('[data-ho-bin]');
    thing.style.transform = '';
    if (bin) hoTidyPut(bin.dataset.hoBin);
  };
  hoOn(thing, 'pointerup', end); hoOn(thing, 'pointercancel', () => { drag = null; thing.classList.remove('held'); thing.style.transform = ''; });
}

/* ---------------- the mailbox ---------------- */
function hoStamps() { const ms = mailState(); if (!ms.stamps || typeof ms.stamps !== 'object') ms.stamps = {}; return ms.stamps; }
const hoFriendOf = name => Object.values(friendsState()).find(f => f.name === name) || null;
function hoMail(stage, foot) {
  const ms = mailState(), list = ms.list, u = hoUi, unread = list.filter(l => !l.read).length, gifts = list.filter(l => l.gift && !l.claimed);
  $ho('hoChip').textContent = unread ? `📬 ${unread} new` : `✉️ ${list.length}`;
  const l = u.letter && list.find(x => x.id === u.letter);
  if (u.letter && !l) u.letter = null;
  if (l) {
    const gift = l.gift ? (l.claimed ? `<div class="ho-got${u.popped === l.id ? ' ho-pop' : ''}">🎁 ${giftText(l.gift)} <b>✓</b></div>`
      : `<button type="button" class="ho-parcel" data-ho="claim:${l.id}"><span class="ho-parcel-box" aria-hidden="true">🎁</span><b>Tap to unwrap</b><small>${giftText(l.gift)}</small></button>`) : '';
    const fr = /^friend-/.test(l.id) && hoFriendOf(l.from);
    const reply = !fr ? '' : l.replied ? `<div class="ho-got">${(HOME_REPLIES.find(r => r.id === l.replied) || HOME_REPLIES[0]).icon} You wrote back</div>`
      : `<div class="ho-reply"><small>Write back to ${escapeHtml(l.from)}</small><div>${HOME_REPLIES.map(r => `<button type="button" class="ho-pill" data-ho="reply:${l.id}:${r.id}">${r.icon} ${r.label}</button>`).join('')}</div></div>`;
    stage.innerHTML = `<article class="ho-letter${u.anim ? ' unfold' : ''}"><header><span class="ho-seal">${l.icon}</span><div><b>${escapeHtml(l.subject)}</b><small>from ${escapeHtml(l.from)} · ${fmtLogTime(l.at)}</small></div></header>
      <p>${escapeHtml(l.body)}</p>${gift}${reply}</article>`;
    foot.innerHTML = `<div class="ho-row"><button type="button" class="ho-btn" data-ho="letters">← All letters</button>${l.gift && !l.claimed ? '' : `<button type="button" class="ho-btn ghost" data-ho="del:${l.id}">🗑️ Delete</button>`}</div>`;
    u.anim = false; u.popped = null;
    return;
  }
  const stamps = Object.entries(hoStamps());
  const waiting = list.filter(x => !x.read || (x.gift && !x.claimed)), earlier = list.filter(x => !waiting.includes(x));
  const env = x => `<button type="button" class="ho-env${x.read ? ' opened' : ''}" data-ho="open:${x.id}"><span class="ho-seal">${x.icon}</span><span class="ho-env-tx"><b>${escapeHtml(x.subject)}</b><small>from ${escapeHtml(x.from)} · ${fmtLogTime(x.at)}</small></span>${x.gift && !x.claimed ? '<span class="ho-tag">🎁</span>' : ''}${x.read ? '' : '<span class="ho-tag seal">Break the seal</span>'}</button>`;
  const row = x => `<button type="button" class="ho-mrow" data-ho="open:${x.id}"><span>${x.icon}</span><b>${escapeHtml(x.subject)}</b><small>${escapeHtml(x.from)}</small></button>`;
  stage.innerHTML = `<div class="ho-stamps"><small>Stamps · ${stamps.length}</small><div>${stamps.length ? stamps.map(([who, ico]) => `<span class="ho-stamp" title="${escapeHtml(who)}">${ico}</span>`).join('') : '<em>Open a letter to keep its stamp.</em>'}</div></div>
    ${waiting.length ? `<div class="ho-sec">Waiting for you · ${waiting.length}</div><div class="ho-envs">${waiting.map(env).join('')}</div>` : ''}
    ${earlier.length ? `<div class="ho-sec">Earlier</div><div class="ho-mrows">${earlier.map(row).join('')}</div>` : ''}
    ${list.length ? '' : '<p class="ho-empty">Nothing yet. Neighbours write once they get to know you.</p>'}`;
  foot.innerHTML = gifts.length > 1 ? `<button type="button" class="ho-btn pri" data-ho="claimall">🎁 Unwrap all ${gifts.length} gifts</button>` : '';
  if (!u.say) u.say = list.length ? `${list.length} letter${list.length === 1 ? '' : 's'}${gifts.length ? ` · ${gifts.length} with a gift` : ''}` : '';
}
function hoOpenLetter(id) {
  const l = mailState().list.find(x => x.id === id); if (!l) return;
  if (!l.read) { l.read = true; bumpStat('lettersRead', 1); hoUi.anim = true; sfx('flip'); } else sfx('tap');
  const st = hoStamps(); if (!st[l.from]) { st[l.from] = l.icon; if (hoUi.anim) setTimeout(() => toast(`${l.icon} A new stamp for your album`), 400); }
  hoUi.letter = id; hoUi.say = ''; saveState();
}
function hoReply(id, kind) {
  const l = mailState().list.find(x => x.id === id), fr = l && hoFriendOf(l.from), r = HOME_REPLIES.find(x => x.id === kind);
  if (!l || !fr || !r || l.replied) return;
  const before = heartsFor(fr.points); l.replied = kind; fr.points += 1;
  if (heartsFor(fr.points) > before) toast(`💞 ${fr.name}: ${'❤️'.repeat(heartsFor(fr.points))}`);
  bumpStat('lettersSent', 1); saveState(); sfx('claim'); buzz(HAP.tap);
  hoUi.say = `${r.icon} You send ${r.label.toLowerCase()} back to ${l.from}. They will like that.`;
}

/* ---------------- the bonsai ---------------- */
function hoCare() {   // today's care: watered, which shoots are snipped. Not kept past the day.
  const b = calmState().bonsai;
  if (b.careDay !== todayKey()) { b.careDay = todayKey(); b.watered = 0; b.snipped = []; }
  return b;
}
function hoShootSpots() {   // three of the seven spots, picked by the date so they stay put all day
  const k = todayKey().split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7), idx = HO_SHOOT_SPOTS.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) { const j = (k >> (i * 2)) % (i + 1); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  return idx.slice(0, HO_SHOOTS).map(i => HO_SHOOT_SPOTS[i]);
}
function hoBonsai(stage, foot) {
  const c = calmState(), u = hoUi;
  if (!c.bonsai) {
    stage.innerHTML = `<div class="ho-bonsai"><div class="ho-light"></div><div class="ho-tree"><span class="ho-tree-ico s0">🫘</span></div><div class="ho-pot"></div></div>`;
    foot.innerHTML = `<button type="button" class="ho-btn pri" data-ho="plant">🌱 Plant a seedling</button><p class="ho-note">It grows with real days. Tending it helps a little. Missing a day costs nothing.</p>`;
    if (!u.say) u.say = 'An empty pot by the window.';
    return;
  }
  bonsaiPayStage();
  const b = hoCare(), s = bonsaiStage(), st = BONSAI_STAGES[s], nx = BONSAI_STAGES[s + 1], g = bonsaiGrowthDays(), tended = b.trimDay === todayKey();
  const pct = nx ? Math.min(100, Math.round((g - st.at) / (nx.at - st.at) * 100)) : 100, streak = tended || b.trimDay === bonsaiDayKey(Date.now() - 86400000) ? b.streak || 0 : 0;
  const shoots = tended ? '' : hoShootSpots().map((p, i) => b.snipped.includes(i) ? '' : `<button type="button" class="ho-shoot" data-ho="snip:${i}" style="left:${p[0]}%;top:${p[1]}%" aria-label="Snip this shoot">🌿</button>`).join('');
  const bloom = s >= 2 && b.bloomDay !== todayKey() ? `<button type="button" class="ho-bloom" data-ho="bloom" aria-label="Pick the flower">🌸</button>` : '';
  $ho('hoChip').textContent = streak ? `🔥 ${streak} day${streak === 1 ? '' : 's'}` : st.icon;
  stage.innerHTML = `<div class="ho-bonsai${b.watered || tended ? ' wet' : ''}"><div class="ho-light"></div><div class="ho-tree"><span class="ho-tree-ico s${s}">${st.icon}</span>${shoots}${bloom}</div><div class="ho-pot"><i></i></div><div class="ho-drops" id="hoDrops"></div></div>`;
  const care = tended ? `<div class="ho-done">✓ Tended today${streak > 1 ? ` · ${streak} days in a row` : ''}. Come back tomorrow.</div>`
    : `<div class="ho-steps"><span class="${b.watered ? 'on' : ''}">💧 Water ${b.watered ? '✓' : ''}</span><span class="${b.snipped.length >= HO_SHOOTS ? 'on' : ''}">✂️ Snip ${b.snipped.length}/${HO_SHOOTS}</span></div>
      ${b.watered ? '<p class="ho-note">Tap the three stray shoots to snip them.</p>' : `<div class="ho-meter" aria-hidden="true"><i id="hoWaterBar"></i><b></b></div><button type="button" class="ho-btn pri" id="hoWater">💧 Hold to water</button>`}`;
  foot.innerHTML = `<div class="ho-grow"><b>${st.name}</b><div class="ho-bar2"><i style="width:${pct}%"></i></div><small>${nx ? `${Math.max(0, nx.at - g).toFixed(1)} days to ${nx.name.toLowerCase()}` : 'As grown as it gets. Still lovely.'}</small></div>${care}`;
  if (!u.say) u.say = tended ? 'Watered and neat. It looks pleased with itself.' : HR_CATALOG.bonsai.say();
  const w = $ho('hoWater'); if (w) hoWaterWire(w);
}
// Hold to water: the bar fills while held; letting go in the green band (55% and up) waters it. Past full, it drains and still counts.
function hoWaterWire(btn) {
  let level = 0, t = null;
  const bar = $ho('hoWaterBar'), drops = $ho('hoDrops');
  const stop = () => {
    if (!t) return; clearInterval(t); t = null; if (drops) drops.classList.remove('on');
    if (level < 55) { hoSay(level ? 'A little more. Hold it longer.' : ''); return; }
    hoCare().watered = 1; saveState(); sfx('soft'); hoSay(level > 96 ? 'A little too much. It drains away, no harm done.' : 'Just right. The soil darkens.'); hoCheckTended();
  };
  hoOn(btn, 'pointerdown', e => { if (t) return; try { btn.setPointerCapture(e.pointerId); } catch (err) { /* synthetic */ } if (drops) drops.classList.add('on'); calmNote(330, 0.012, 2);
    t = setInterval(() => { level = Math.min(100, level + 2.4); if (bar) bar.style.width = level + '%'; if (level >= 100) stop(); }, 50); });
  hoOn(btn, 'pointerup', stop); hoOn(btn, 'pointercancel', stop);
  hoCleanups.push(() => clearInterval(t));
}
function hoSnip(i) {
  const b = hoCare(); if (b.snipped.includes(i) || b.trimDay === todayKey()) return true;
  b.snipped.push(i); saveState(); sfx('tap'); buzz(HAP.tap); calmNote(CALM_SCALE[i % CALM_SCALE.length], 0.03, 1);
  hoUi.say = b.snipped.length >= HO_SHOOTS ? 'Snip, snip, snip. Neat again.' : 'Snip.';
  hoCheckTended(true);
}
function hoCheckTended(quiet) {
  const b = hoCare();
  if (b.watered && b.snipped.length >= HO_SHOOTS && b.trimDay !== todayKey()) { bonsaiTendDone(); sfx('claim'); hoUi.say = 'Tended for today. It will be a little taller tomorrow.'; }
  if (!quiet) hoRender();
}
function hoBloom() {
  const b = calmState().bonsai; if (!b || b.bloomDay === todayKey()) return;
  const n = bonsaiStage() >= 4 ? 3 : 2; b.bloomDay = todayKey(); addPebbles(n, 'bonsai'); saveState(); sfx('found'); buzz(HAP.found);
  hoUi.say = `You pick the flower. Something glints in it: +${n} ${currencyName(n)}. Another will open tomorrow.`;
}

/* ---------------- the sand garden ---------------- */
function hoLeaves() {   // three leaves fall on the sand each day
  const c = calmState();
  if (!c.sandLeaves || c.sandLeaves.day !== todayKey()) c.sandLeaves = { day: todayKey(), left: Array.from({ length: HO_LEAVES }, () => [+(0.12 + Math.random() * 0.76).toFixed(3), +(0.12 + Math.random() * 0.76).toFixed(3), Math.round(Math.random() * 360)]) };
  return c.sandLeaves;
}
function hoSand(stage, foot) {
  const u = hoUi, st = calmState().sand, lv = hoLeaves();
  $ho('hoChip').textContent = lv.left.length ? `🍂 ${lv.left.length}` : '🍂 ✓';
  stage.innerHTML = `<div class="ho-sand" id="hoSand"><canvas id="hoSandCv" aria-label="Sand garden: drag to rake"></canvas></div>`;
  const tools = [['rake', '〰️', 'Rake'], ['wide', '≋', 'Wide rake'], ['fine', '➰', 'Stick'], ['stone', '🪨', 'Stone'], ['shell', '🐚', 'Shell']];
  foot.innerHTML = `<div class="ho-tools">${tools.map(([k, i, n]) => `<button type="button" class="ho-tool${u.tool === k ? ' on' : ''}" data-ho="tool:${k}" aria-pressed="${u.tool === k}"><span>${i}</span><small>${n}</small></button>`).join('')}</div>
    <button type="button" class="ho-btn ghost" data-ho="smooth">Smooth the sand</button>`;
  if (!u.say) u.say = lv.left.length ? `${lv.left.length} ${lv.left.length === 1 ? 'leaf has' : 'leaves have'} blown onto the sand. Rake ${lv.left.length === 1 ? 'it' : 'them'} away.` : 'Drag to rake. Pick a stone or a shell, then tap the sand.';
  const box = $ho('hoSand'), cv = $ho('hoSandCv'), cx = cv.getContext('2d');
  const tines = { rake: 3, wide: 5, fine: 1 }[u.tool], icon = { stone: '🪨', shell: '🐚' }[u.tool];
  let W = 0, H = 0, drawing = false, last = null, cur = null;
  const seg = (a, b, n) => {
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
    sandTines(n).forEach(o => {
      cx.lineCap = 'round'; cx.lineWidth = 4; cx.strokeStyle = 'rgba(120,104,70,.55)'; cx.beginPath(); cx.moveTo(a.x + nx * o, a.y + ny * o); cx.lineTo(b.x + nx * o, b.y + ny * o); cx.stroke();
      cx.lineWidth = 2; cx.strokeStyle = 'rgba(255,248,225,.5)'; cx.beginPath(); cx.moveTo(a.x + nx * o + 2, a.y + ny * o + 2); cx.lineTo(b.x + nx * o + 2, b.y + ny * o + 2); cx.stroke();
    });
  };
  const draw = () => {
    const r = box.getBoundingClientRect(), d = window.devicePixelRatio || 1; W = r.width; H = r.height;
    cv.width = Math.round(W * d); cv.height = Math.round(H * d); cx.setTransform(d, 0, 0, d, 0, 0); cx.clearRect(0, 0, W, H);
    st.strokes.forEach(s => { const p = sandPts(s); for (let i = 1; i < p.length; i++) seg({ x: p[i - 1][0] * W, y: p[i - 1][1] * H }, { x: p[i][0] * W, y: p[i][1] * H }, s.n); });
    box.querySelectorAll('.calm-rock, .ho-leaf').forEach(e => e.remove());
    st.stones.forEach(s => { const e = document.createElement('span'); e.className = 'calm-rock'; e.textContent = s[2] || '🪨'; e.style.left = s[0] * 100 + '%'; e.style.top = s[1] * 100 + '%'; box.appendChild(e); });
    hoLeaves().left.forEach((l, i) => { const e = document.createElement('span'); e.className = 'ho-leaf'; e.dataset.i = i; e.textContent = '🍂'; e.style.left = l[0] * 100 + '%'; e.style.top = l[1] * 100 + '%'; e.style.setProperty('--r', l[2] + 'deg'); box.appendChild(e); });
  };
  draw(); hoOn(window, 'resize', draw);
  const pos = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const sweep = p => {
    const lvs = hoLeaves();
    lvs.left.forEach((l, i) => {
      if (Math.hypot(l[0] * W - p.x, l[1] * H - p.y) > 30) return;
      const el = box.querySelector(`.ho-leaf[data-i="${i}"]`); lvs.left.splice(i, 1);
      if (el) { el.removeAttribute('data-i'); el.classList.add('swept'); setTimeout(() => el.remove(), 700); }
      box.querySelectorAll('.ho-leaf[data-i]').forEach((e, j) => { e.dataset.i = j; });
      addPebbles(1, 'sand'); bumpStat('leavesSwept', 1); sfx('claim');
      hoSay(lvs.left.length ? `Swept away. +1 ${currencyName(1)}. ${lvs.left.length} to go.` : `The sand is clear. +1 ${currencyName(1)}. More leaves fall tomorrow.`);
      $ho('hoChip').textContent = lvs.left.length ? `🍂 ${lvs.left.length}` : '🍂 ✓';
    });
  };
  hoOn(cv, 'pointerdown', e => {
    const p = pos(e);
    if (icon) {
      const hit = st.stones.findIndex(s => Math.hypot(s[0] * W - p.x, s[1] * H - p.y) < 22);
      if (hit >= 0) { st.stones.splice(hit, 1); hoSay('You lift it off the sand.'); } else { if (st.stones.length >= 12) st.stones.shift(); st.stones.push([+(p.x / W).toFixed(3), +(p.y / H).toFixed(3), icon]); }
      saveState(); draw(); sfx('tap'); return;
    }
    drawing = true; last = p; cur = { n: tines, p: [[+(p.x / W).toFixed(3), +(p.y / H).toFixed(3)]] }; try { cv.setPointerCapture(e.pointerId); } catch (err) { /* synthetic */ }
  });
  hoOn(cv, 'pointermove', e => {
    if (!drawing) return; const p = pos(e);
    if (Math.hypot(p.x - last.x, p.y - last.y) > 5) { seg(last, p, tines); cur.p.push([+(p.x / W).toFixed(3), +(p.y / H).toFixed(3)]); last = p; sweep(p); }
  });
  const end = () => {
    if (!drawing) return; drawing = false;
    if (cur && cur.p.length > 1) { st.strokes.push(cur); let n = st.strokes.reduce((a, s) => a + sandPts(s).length, 0); while (n > 1600 && st.strokes.length > 1) { n -= sandPts(st.strokes.shift()).length; } saveState(); }
    cur = null;
  };
  hoOn(cv, 'pointerup', end); hoOn(cv, 'pointercancel', end);
}

/* ---------------- the armchair ---------------- */
function hoNapReady() { return buildingState('home').nap !== todayKey(); }
function hoNap(stage, foot) {
  const u = hoUi, ready = hoNapReady(), naps = state.progress.totals.naps || 0;
  $ho('hoChip').textContent = `😴 ${naps}`;
  stage.innerHTML = `<div class="ho-nap${u.dream ? ' dreaming' : ''}${ready || u.dream ? '' : ' rested'}" id="hoNap"><div class="ho-window"><i></i><i></i></div><div class="ho-beam"></div>
    <div class="ho-chair">${svgUse('r-armchair')}<span class="ho-sleeper">${avFaceHTML(state.character)}</span>${u.dream ? '<span class="ho-zz" aria-hidden="true">z<i>z</i><i>z</i></span>' : ''}</div><div class="ho-motes" id="hoMotes"></div></div>`;
  if (u.dream) foot.innerHTML = `<div class="ho-steps"><span class="on" id="hoCaught">✨ ${u.caught} caught</span></div><div class="ho-meter time" aria-hidden="true"><i id="hoDreamBar"></i></div><p class="ho-note">Tap the dreams as they drift up.</p>`;
  else if (ready) foot.innerHTML = `<button type="button" class="ho-btn pri" data-ho="doze">😴 Close your eyes</button><p class="ho-note">A nap a day. Catch the dreams that drift up for a little extra.</p>`;
  else foot.innerHTML = `<div class="ho-done">✓ You have napped today. The chair will be just as sunny tomorrow.</div><p class="ho-note">${naps} nap${naps === 1 ? '' : 's'} in all${state.progress.totals.dreamMotes ? ` · ${state.progress.totals.dreamMotes} dreams caught` : ''}</p>`;
  if (!u.say) u.say = ready ? HR_CATALOG.nap.say() : 'You are not sleepy yet. Maybe tomorrow.';
}
function hoDoze() {
  const u = hoUi; if (!hoNapReady() || u.dream) return;
  u.dream = true; u.caught = 0; u.say = 'You settle into the cushion and close your eyes…'; sfx('soft'); hoRender();
  const box = $ho('hoMotes'), bar = $ho('hoDreamBar'), t0 = Date.now(), motion = btMotionOk();
  const spawn = () => {
    const m = document.createElement('button'); m.type = 'button'; m.className = 'ho-mote' + (motion ? '' : ' still'); m.textContent = HO_MOTES[Math.floor(Math.random() * HO_MOTES.length)];
    m.style.left = (10 + Math.random() * 80) + '%'; m.style.top = motion ? '' : (15 + Math.random() * 60) + '%'; m.style.setProperty('--dx', (Math.random() * 60 - 30) + 'px');
    m.addEventListener('pointerdown', () => { if (m.classList.contains('got')) return; m.classList.add('got'); u.caught++; calmNote(CALM_SCALE[u.caught % CALM_SCALE.length], 0.03, 1.4); buzz(HAP.tap); const c = $ho('hoCaught'); if (c) c.textContent = `✨ ${u.caught} caught`; setTimeout(() => m.remove(), 300); });
    box.appendChild(m); hoLater(() => m.remove(), motion ? 3800 : 1600);
  };
  hoEvery(spawn, motion ? 520 : 700); spawn();
  hoEvery(() => { if (bar) bar.style.width = Math.min(100, (Date.now() - t0) / HO_DREAM_MS * 100) + '%'; }, 100);
  hoLater(hoWake, HO_DREAM_MS);
}
function hoWake() {
  const u = hoUi; if (!u || !u.dream) return;
  u.dream = false; buildingState('home').nap = todayKey();
  const extra = Math.min(3, Math.floor(u.caught / 3)), pay = 3 + (weatherFx().dailyBonus || 0) + hrCosyBonus() + extra;
  addPebbles(pay, 'daily-tasks'); bumpStat('naps', 1); if (u.caught) bumpStat('dreamMotes', u.caught);
  const lines = HOME_DREAMS[u.caught >= 6 ? 2 : u.caught >= 3 ? 1 : 0];
  u.say = `${lines[Math.floor(Math.random() * lines.length)]} You wake with ${pay} ${currencyName(pay)} in your pocket${extra ? ` (${extra} from the dreams)` : ''}.`;
  saveState(); sfx('claim'); buzz(HAP.found); toast(`🫧 +${pay} ${currencyName(pay)}`);
  hoRender();
}

/* ---------------- the shelves ---------------- */
function hoShelves(stage, foot) {
  const h = homeState(), u = hoUi, deco = id => DECORATION_ITEMS.find(x => x.id === id);
  $ho('hoChip').textContent = `${h.shelf.length}/${SHELF_MAX}`;
  let boards = '';
  for (let b = 0; b < SHELF_MAX / 2; b++) {
    const a = deco(h.shelf[b * 2]), c = deco(h.shelf[b * 2 + 1]), match = a && c && a.cat && a.cat === c.cat;
    const slot = i => { const d = deco(h.shelf[i]); return d ? `<button type="button" class="ho-slot on" data-ho="take:${i}" aria-label="Take the ${escapeHtml(d.name)} down">${d.icon}</button>` : '<span class="ho-slot" aria-hidden="true"></span>'; };
    boards += `<div class="ho-board${match ? ' match' : ''}">${slot(b * 2)}${slot(b * 2 + 1)}${match ? '<span class="ho-spark" aria-hidden="true">✨</span>' : ''}</div>`;
  }
  stage.innerHTML = `<div class="ho-shelf">${boards}</div>`;
  const own = DECORATION_ITEMS.filter(d => decorationInventoryCount(d.id) > 0), full = h.shelf.length >= SHELF_MAX;
  foot.innerHTML = `<div class="ho-sec">Your decorations</div><div class="ho-tray">${own.length ? own.map(d => `<button type="button" class="ho-chipbtn" data-ho="put:${d.id}" ${full ? 'disabled' : ''}><span>${d.icon}</span><small>${escapeHtml(d.name)} ×${decorationInventoryCount(d.id)}</small></button>`).join('') : '<p class="ho-note">None in storage. The Card Shop sells decorations.</p>'}</div>
    ${h.shelf.length ? '<button type="button" class="ho-btn ghost" data-ho="clear">📦 Clear the shelves</button>' : ''}`;
  if (!u.say) u.say = 'Tap a decoration to set it out, and tap one on the shelf to take it down. Two of a kind on a board make a pair.';
}
function hoTakeShelf(i) {
  const h = homeState(), id = h.shelf[i], d = DECORATION_ITEMS.find(x => x.id === id); if (!id) return;
  h.shelf.splice(i, 1); state.decorationInventory[id] = decorationInventoryCount(id) + 1; saveState(); sfx('tap');
  hoUi.say = d ? `${d.icon} The ${d.name} goes back into your decorations.` : '';
}

/* ---------------- the framed cards ---------------- */
function hoFrames(stage, foot) {
  const h = homeState(), u = hoUi;
  $ho('hoChip').textContent = `${h.favs.length}/${FAV_MAX}`;
  stage.innerHTML = `<div class="ho-wall">${Array.from({ length: FAV_MAX }, (_, i) => { const d = cardDef(h.favs[i]);
    return `<button type="button" class="ho-frame${u.frame === i ? ' sel' : ''}${d ? ' rarity-' + d.rarity : ''}" data-ho="frame:${i}">${d ? `<span class="ho-frame-art">${cardArtHtml(d)}</span><b>${escapeHtml(d.name)}</b><small>${RARITY_LABEL[d.rarity]}</small>` : '<span class="ho-frame-art">+</span><small>Empty frame</small>'}</button>`; }).join('')}</div>`;
  const ids = [...new Set(state.ownedCards.map(id => BattleEngine.baseIdOf(id)))].filter(id => cardDef(id))
    .sort((a, b) => RARITY_ORDER.indexOf(cardDef(b).rarity) - RARITY_ORDER.indexOf(cardDef(a).rarity) || (cardDef(b).power || 0) - (cardDef(a).power || 0));
  const rars = RARITY_ORDER.filter(r => ids.some(id => cardDef(id).rarity === r)), shown = ids.filter(id => u.rar === 'all' || cardDef(id).rarity === u.rar).slice(0, 60);
  const sel = u.frame !== null && h.favs[u.frame];
  foot.innerHTML = `<div class="ho-chips"><button type="button" class="ho-pill${u.rar === 'all' ? ' on' : ''}" data-ho="rar:all">All</button>${rars.map(r => `<button type="button" class="ho-pill${u.rar === r ? ' on' : ''}" data-ho="rar:${r}">${RARITY_LABEL[r]}</button>`).join('')}</div>
    <div class="ho-cards">${shown.map(id => { const d = cardDef(id); return `<button type="button" class="ho-card rarity-${d.rarity}${h.favs.includes(id) ? ' on' : ''}" data-ho="pick:${id}">${cardArtHtml(d)}<small>${escapeHtml(d.name)}</small></button>`; }).join('')}</div>
    ${sel ? '<button type="button" class="ho-btn ghost" data-ho="unframe">Take it down</button>' : ''}`;
  if (!u.say) u.say = 'Tap a frame, then a card to hang in it. A framed card draws spirits of its family to visit.';
}
function hoPickCard(id) {
  const h = homeState(), d = cardDef(id), u = hoUi; if (!d) return;
  if (h.favs.includes(id)) { u.say = toggleFav(id); u.frame = null; return; }
  if (u.frame !== null && h.favs[u.frame]) { h.favs[u.frame] = id; saveState(); sfx('claim'); u.say = `${d.icon} ${d.name} takes its place on the wall.`; u.frame = null; return; }
  if (h.favs.length >= FAV_MAX) { u.say = 'All three frames are full. Tap one to swap its card.'; sfx('tie'); return; }
  u.say = toggleFav(id); u.frame = null;
}
function hoUnframe() { const h = homeState(), u = hoUi, id = u.frame !== null && h.favs[u.frame]; if (id) u.say = toggleFav(id); u.frame = null; }

/* ---------------- the trophy case ---------------- */
// Everything the case can hold, won or not, so the empty places say how to fill them.
function hoTrophyGoals() {
  const p = state.progress, out = trophies().map(t => ({ got: true, icon: t.icon || '🏆', name: t.name, how: 'Won at the fountain.' }));
  if (!cupState().trophy) out.push({ got: false, icon: '🏆', name: `The ${cupName()}`, how: `Win all three rounds of this week's cup at the fountain in ${PLACES.square}.` });
  const best = p.cellarBest || 0;
  out.push({ got: best >= 5, icon: '🕯️', name: best >= 5 ? `Cellar floor ${best}` : 'Deep in the cellar', how: best >= 5 ? 'Went deep in the cellar.' : `Reach floor 5 of the cellar (best so far: ${best}).` });
  out.push({ got: !!(p.rival && p.rival.chapter >= RIVAL.chapters), icon: CAST.rival.icon, name: `${CAST.rival.name}'s respect`, how: `Beat ${CAST.rival.name} through every chapter.` });
  const fs = p.fishing, koi = !!(fs && fs.caught && fs.caught['star-koi']);
  out.push({ got: koi, icon: '🌟', name: 'Starlight Koi', how: koi ? 'The rarest catch.' : 'Land the rarest fish of all.' });
  out.push({ got: !!(p.bugs && p.bugs.caught && p.bugs.caught.starwing), icon: '💫', name: 'Starwing', how: 'Catch the rarest critter after dark.' });
  const gods = SUMMONS.filter(s => !s.atlas && state.ownedCards.includes(s.card)).length;
  out.push({ got: gods >= 4, icon: '✨', name: 'All four gods home', how: `Summon every district god at the altar (${gods}/4).` });
  return out;
}
function hoTrophies(stage, foot) {
  const u = hoUi, goals = hoTrophyGoals(), got = goals.filter(g => g.got).length, r = state.progress.record || {}, pz = state.progress.puzzle;
  $ho('hoChip').textContent = `🏆 ${got}/${goals.length}`;
  stage.innerHTML = `<div class="ho-case">${goals.map((g, i) => `<button type="button" class="ho-tro${g.got ? ' got' : ''}${u.pick === i ? ' sel' : ''}" data-ho="tro:${i}"><span>${g.got ? g.icon : '?'}</span><small>${escapeHtml(g.got ? g.name : 'Not yet')}</small></button>`).join('')}</div>`;
  const foilTotal = Object.values(foils()).reduce((a, b) => a + b, 0), uniq = new Set(state.ownedCards.map(id => BattleEngine.baseIdOf(id))).size;
  const recs = [['⚔️', r.won || 0, 'matches won'], ['🔥', r.best || 0, 'best streak'], ['🥇', `${miniGoldCount()}/${Object.keys(MINIGAMES).length}`, 'house golds'], ['🧩', (pz && pz.solved) || 0, 'puzzles'], ['✨', foilTotal, 'Reborn'], ['🃏', uniq, 'cards found']];
  foot.innerHTML = `<div class="ho-sec">Records</div><div class="ho-stats">${recs.map(([i, v, l]) => `<div><span>${i}</span><b>${v}</b><small>${l}</small></div>`).join('')}</div>`;
  if (!u.say) u.say = got ? 'Everything you have won so far. Tap a place to read it, or to see how to fill it.' : 'Nothing in the case yet. Tap an empty place to see how to fill it.';
}

/* ---------------- the altar ---------------- */
function hoAltar(stage, foot) {
  const u = hoUi, gods = SUMMONS.filter(s => !s.atlas), home = gods.filter(summonOwned).length;
  $ho('hoChip').textContent = `🕯️ ${home}/4`;
  const tile = s => { const d = cardDef(s.card), own = summonOwned(s), ready = summonReady(s), reqs = summonReqs(s);
    return `<button type="button" class="ho-god${own ? ' home' : ready ? ' ready' : ''}${u.god === s.id ? ' sel' : ''}" data-ho="god:${s.id}" data-fam="${s.fam}"><span class="ho-god-ico">${d.icon}</span><b>${escapeHtml(d.name)}</b><small>${own ? 'Home ✓' : ready ? 'Ready to call' : `${reqs.filter(r => r.ok).length}/${reqs.length}`}</small></button>`; };
  const sel = u.god && summonDef(u.god), sd = sel && cardDef(sel.card);
  const detail = sel ? `<div class="ho-godinfo"><b>${sd.icon} ${escapeHtml(sd.name)}</b>${summonOwned(sel) ? '<p>Home, and their card waits in your collection.</p>'
    : `<ul>${summonReqs(sel).map(r => `<li class="${r.ok ? 'ok' : ''}">${r.ok ? '✅' : '▫️'} ${escapeHtml(r.text)}</li>`).join('')}</ul>${summonReady(sel) ? `<button type="button" class="ho-btn pri" data-ho="summon:${sel.id}">🕯️ Call ${escapeHtml(sd.name)}</button>` : ''}`}</div>` : '';
  const atlas = atlasRevealed() ? `<div class="ho-atlas">${state.ownedCards.includes('the-atlas') ? `🗺️ The ${CAST.atlas.name} walks with you.` : home >= 4 ? 'The four gods together on the candles call something larger.' : 'The candles lean toward something you cannot see yet.'}</div>` : '';
  stage.innerHTML = `<div class="ho-shrines">${gods.map(tile).join('')}</div>${detail}${atlas}`;
  const done = altarBurning().some(b => altarDone(b));
  foot.innerHTML = `<button type="button" class="ho-btn pri ho-candles" data-ho="candles">🔥 Light the candles${done ? ' · a spirit is ready' : ''}</button>`;
  if (!u.say) u.say = altarIntro();
}

/* ---------------- managing your home ---------------- */
function hoToRoom(act) {   // leave the screen for the room, in decorating, and (maybe) pick something up to place
  homeScreenClose();
  if (!homeRoom.edit) hrToggleEdit();
  if (act) hrAction(act);
}
function hoHomeStats() {
  const t = state.progress.totals, h = hrHome(), b = calmState().bonsai;
  return [['🧩', h.items.length, 'pieces placed'], ['✉️', t.lettersRead || 0, 'letters read'], ['😴', t.naps || 0, 'naps'],
    ['🌳', b ? BONSAI_STAGES[bonsaiStage()].name : 'Not planted', `bonsai${b && b.best ? ` · best ${b.best} days` : ''}`], ['🍂', t.leavesSwept || 0, 'leaves swept'],
    ['🕊️', t.homeVisitors || 0, 'spirits welcomed'], ['🖼️', `${homeState().favs.length}/${FAV_MAX}`, 'cards framed'], ['📚', `${homeState().shelf.length}/${SHELF_MAX}`, 'on the shelves'],
    ['🫧', (econState().spend.home || 0), `${GAME.currency.many} spent on it`]];
}
function hoManage(stage, foot) {
  const u = hoUi, h = hrHome(), L = HR_LEVELS[h.level], N = HR_LEVELS[h.level + 1];
  $ho('hoChip').textContent = `Lv ${h.level}`;
  const tabs = [['home', 'Home'], ['upgrade', 'Upgrade'], ['colours', 'Colours'], ['shop', 'Furniture']];
  let s = `<div class="ho-tabs" role="tablist">${tabs.map(([k, n]) => `<button type="button" role="tab" class="ho-pill${u.tab === k ? ' on' : ''}" data-ho="tab:${k}" aria-selected="${u.tab === k}">${n}</button>`).join('')}</div>`;
  if (u.tab === 'home') {
    const c = hrCosy(), tips = Object.values(c.parts).filter(v => v[0] < v[1]).sort((a, b) => (b[1] - b[0]) / b[1] - (a[1] - a[0]) / a[1]).slice(0, 2).map(v => v[2]);
    const coming = Object.keys(HR_CATALOG).filter(id => HR_CATALOG[id].act && !h.got[id]);
    s += `<div class="ho-hero"><span class="ho-hero-ico">🏠</span><div><b>Level ${h.level} · ${L.name}</b><small>${L.fw} by ${L.fh} floor${N ? ` · next: ${N.name}, 🫧 ${N.cost}` : ' · as grand as it gets'}</small></div></div>
      <div class="ho-card2"><div class="ho-cosy"><b>Cosiness ${c.score}</b><span>${c.tier}</span></div><div class="ho-bar2"><i style="width:${c.score}%"></i></div>
        <small>${hrCosyBonus() ? `+${hrCosyBonus()} ${currencyName(hrCosyBonus())} a nap` : 'A cosier home pays more for a nap'}${h.level >= HS_VISIT_LEVEL ? ` · +${Math.round(hrCosyVisitBonus() * 100)}% a spirit visits` : ''}</small>
        ${tips.length && c.score < 100 ? `<p class="ho-note">To raise it: ${tips.join('. ')}.</p>` : ''}</div>
      <div class="ho-sec">Stats</div><div class="ho-stats">${hoHomeStats().map(([i, v, l]) => `<div><span>${i}</span><b>${v}</b><small>${l}</small></div>`).join('')}</div>
      ${coming.length ? `<div class="ho-sec">On the way</div><div class="ho-list">${coming.map(id => `<div class="ho-li lock"><span>${HR_CATALOG[id].icon}</span><b>${HR_CATALOG[id].name}</b><small>${hrUnlockWhen(id)}</small></div>`).join('')}</div>` : ''}`;
  } else if (u.tab === 'upgrade') {
    s += `<div class="ho-list">${HR_LEVELS.slice(1).map((lv, i) => { const n = i + 1, st = n < h.level ? 'done' : n === h.level ? 'now' : n === h.level + 1 ? 'next' : 'lock';
      return `<div class="ho-li ${st}"><span>${n < h.level ? '✓' : n}</span><b>${lv.name}${n === h.level ? ' · you are here' : ''}</b><small>${lv.fw} by ${lv.fh} floor${n > 1 ? ` · ${hrUnlockText(n)}` : ' · a mailbox and an armchair'}</small></div>`; }).join('')}</div>`;
    s += N ? `<button type="button" class="ho-btn pri" data-ho="up" ${state.progress.pebbles < N.cost ? 'disabled' : ''}>⬆️ Grow to ${N.name} · 🫧 ${N.cost}</button>` : '<div class="ho-done">✓ Your home is as grand as it gets.</div>';
  } else if (u.tab === 'colours') {
    const pal = (list, id) => hrPalette(list, id).c, f = pal(HR_FLOORS, h.style.floor), w = pal(HR_WALLS, h.style.wall), r = pal(HR_RUGS, h.style.rug);
    s += `<div class="ho-preview" style="--pw:${w[0]};--pw2:${w[1]};--pf:${f[0]};--pf2:${f[2]};--pr:${r[0]};--pr2:${r[1]}"><i class="w"></i><i class="f"></i><i class="r"></i></div>`;
    const sw = (title, list, key) => `<div class="ho-sec">${title}</div><div class="hr-sws">${list.map(p => `<button type="button" class="hr-sw${p.id === h.style[key] ? ' on' : ''}" data-ho="style:${key}:${p.id}" ${hrLocked(p.lvl) ? 'disabled' : ''} style="--a:${p.c[0]};--b:${p.c[1]}"><i></i><span>${hrLocked(p.lvl) ? `Lv ${p.lvl}` : p.name}</span></button>`).join('')}</div>`;
    s += sw('Floor', HR_FLOORS, 'floor') + sw('Walls', HR_WALLS, 'wall') + sw('Rug', HR_RUGS, 'rug');
  } else {
    const row = (act, d, meta, dis) => `<button type="button" class="ho-li btn-like" data-ho="${act}" ${dis ? 'disabled' : ''}>${hrThumb(d)}<b>${escapeHtml(d.name)}</b><small>${meta}</small></button>`;
    const stored = Object.keys(h.storage), decos = DECORATION_ITEMS.filter(d => decorationInventoryCount(d.id) > 0);
    if (stored.length) s += `<div class="ho-sec">In storage</div><div class="ho-list">${stored.map(id => row('place:' + id, HR_CATALOG[id], `Place${h.storage[id] > 1 ? ` · ×${h.storage[id]}` : ''}`)).join('')}</div>`;
    if (decos.length) s += `<div class="ho-sec">Your decorations</div><div class="ho-list">${decos.map(d => row('place:deco:' + d.id, { icon: d.icon, name: d.name }, `Place · ×${decorationInventoryCount(d.id)}`)).join('')}</div>`;
    s += `<div class="ho-sec">Buy</div><div class="ho-chips">${HR_CATS.map(([k, n]) => `<button type="button" class="ho-pill${u.cat === k ? ' on' : ''}" data-ho="cat:${k}">${n}</button>`).join('')}</div>`;
    const buy = Object.entries(HR_CATALOG).filter(([id, d]) => d.cost && (u.cat === 'all' || HR_CAT_OF[id] === u.cat)).sort((a, b) => a[1].lvl - b[1].lvl || a[1].cost - b[1].cost);
    s += `<div class="ho-list">${buy.map(([id, d]) => hrLocked(d.lvl) ? row('noop', d, `🔒 Home level ${d.lvl}`, true) : row('buy:' + id, d, `🫧 ${d.cost}`, state.progress.pebbles < d.cost)).join('')}</div>
      <p class="ho-note">Buying takes you to the room to put it down. Changed your mind? Undo there gives your ${GAME.currency.many} back.</p>`;
  }
  stage.innerHTML = `<div class="ho-scroll">${s}</div>`;
  foot.innerHTML = '<button type="button" class="ho-btn pri" data-ho="decorate">🎨 Decorate the room</button>';
  if (!u.say) u.say = 'Everything about your home in one place. Decorate the room to move things around.';
}
