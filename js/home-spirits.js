/* ============================================================
   SPIRITS AT HOME
   ============================================================
   Ties the card spirits into your cottage room (js/home-room.js). Cards are spirits in this game, so the home is where they live:

   - YOUR COMPANION lives here too. If a spirit, neighbour or boss walks with you, it wanders the room and answers a tap with a line.
   - SPIRIT PERCHES (home level 2) show one card you own as a small glowing figure over a pedestal. Nothing is spent: it is the card in your
     collection, shown off. The card must still be owned, or the perch looks empty. A card sits on one perch at a time.
   - THE COLLECTOR'S CABINET (level 2) lights a medal for every card set you have completed (CARD_SETS) and lists how close the others are.
   - THE REBORN MANTEL (level 3) holds up to three Reborn (foil) cards, shimmering.
   - FAMILY CORNERS (level 2): a Grove nook, Memory cairn, Tide basin and Wind chimes. Each draws spirits of its family.
   - RESONANCE: a perch showing a card whose family has a corner in the room glows in the family's colour.
   - VISITING SPIRITS (home level 3 and up) are the pay-off. Now and then a spirit comes to visit and, when you welcome it, leaves a rare card.
     It stays until you welcome it or the day ends. The level sets how rare and how often (HS_ODDS, HS_DAILY: 1 a day at levels 3 and 4,
     2 at level 5; mythic only at 5). Corners and perches pull the family toward the ones you have set up (hsFamilyWeights), resonating
     perches make a visit a little more likely. Rolled at most once every HS_COOLDOWN while you are home, never past the day's limit.

   Where it lives: the home's saved state (state.progress.home) gets `visit` ({ day, n, cur: { card, rar, fam }, nextAt }); a perch or mantel
   item carries its own `card` / `cards`. Everything else is derived. Hooks from home-room.js (all guarded by typeof so load order is safe):
   hsClass / hsExtras draw a piece, hsEntitiesHtml adds the companion and visitor, hsSheetHtml / hsVisitorSheet build the scene sheet,
   hsTapVisitor handles taps on the companion and the visitor, hsEnter / hsLeave start and stop the timer. Buttons come back through
   sceneAction() as 'hs:*' and are run by hsAction(). Numbers to watch in playtesting: the visit odds are a first guess, not simulated. */
const HS_VISIT_LEVEL = 3;
const HS_DAILY = [0, 0, 0, 1, 1, 2];   // visits a day, by home level
const HS_ODDS = { 3: [['rare', .75], ['ultra', .25]], 4: [['rare', .5], ['ultra', .4], ['super', .1]], 5: [['ultra', .55], ['super', .35], ['mythic', .1]] };
const HS_COOLDOWN = 10 * 60 * 1000;   // between rolls
const HS_LEVEL_PERKS = { 3: 'spirits may visit and leave a rare card', 4: 'rarer visitors', 5: 'a second visitor a day, and mythic spirits' };   // shown under Decorate -> Room (the pieces each level adds list themselves)
const HS_GLOW = { common: '#8dbccb', rare: '#9a86c9', ultra: '#6a96c2', super: '#c27a9c', mythic: '#d9b45a', divine: '#d9b45a', atlas: '#8f7ad9' };
const HS_FAMILY_GLOW = { grove: '#57a274', stone: '#c9bda6', tide: '#6fb0cc', wind: '#dbe9f2' };
const hs = { timer: 0, ticks: 0, pick: false, comp: null, vis: null };

/* ---------------- small helpers ---------------- */
function hsOwnedBases() {   // the cards you own, once each, rarest first
  const ids = [...new Set(state.ownedCards.map(id => BattleEngine.baseIdOf(id)))].filter(id => cardDef(id) && !cardDef(id).token);
  return ids.sort((a, b) => RARITY_ORDER.indexOf(cardDef(b).rarity) - RARITY_ORDER.indexOf(cardDef(a).rarity) || (cardDef(b).power || 0) - (cardDef(a).power || 0));
}
function hsFam(card) { return CARD_FAMILY[BattleEngine.baseIdOf(card)] || null; }
function hsOwns(card) { return !!card && baseOwnedSet().has(BattleEngine.baseIdOf(card)); }
function hsItems(id) { return hrHome().items.filter(i => i.id === id); }
function hsCardOf(it) { return it.card && hsOwns(it.card) ? it.card : null; }   // a perch whose card has gone just looks empty
function hsCorners(fam) { return hrHome().items.filter(i => HR_CATALOG[i.id] && HR_CATALOG[i.id].family === fam).length; }
function hsResonant(it) { const c = it.id === 'perch' && hsCardOf(it); return !!c && !!hsFam(c) && hsCorners(hsFam(c)) > 0; }
function hsSay(kind) {
  return { perch: 'A quiet place for one of your spirits to rest.', cabinet: 'Every set you finish lights a medal.', mantel: 'Reborn spirits shimmer here.' }[kind];
}
function hsArt(card) { const d = cardDef(card); return d ? cardArtHtml(d) : ''; }

/* ---------------- drawing a piece ---------------- */
function hsClass(it) { return hsResonant(it) ? ' resonant' : ''; }
function hsExtras(it) {   // what goes inside a piece's own box: the spirit on a perch, the Reborn on the mantel, the medals in the cabinet
  if (it.id === 'perch') {
    const c = hsCardOf(it); if (!c) return '';
    const fam = hsFam(c), g = hsResonant(it) ? HS_FAMILY_GLOW[fam] : HS_GLOW[cardDef(c).rarity];
    return `<span class="hr-fig" style="--g:${g}">${hsArt(c)}</span>`;
  }
  if (it.id === 'mantel') return (it.cards || []).filter(c => hsOwns(c) && hasFoil(c)).slice(0, 3).map((c, i) => `<span class="hr-fig m reborn" style="--i:${i};--g:#e8cb88">${hsArt(c)}</span>`).join('');
  if (it.id === 'cabinet') return '<span class="hr-medals">' + CARD_SETS.map(s => `<i class="${setComplete(s) ? 'on' : ''}">${s.icon}</i>`).join('') + '</span>';
  return '';
}

/* ---------------- the sheets (the scene's bottom sheet) ---------------- */
function hsInfo(title, line) { return `<div class="hr-info"><b>${title}</b><span>${line}</span></div>`; }
function hsSheetHtml(it) {
  if (it.id === 'perch') return hsPerchSheet(it);
  if (it.id === 'mantel') return hsMantelSheet(it);
  if (it.id === 'cabinet') return hsCabinetSheet();
  return '';
}
function hsPerchSheet(it) {
  const cur = hsCardOf(it), on = hrHome().items.filter(i => i.id === 'perch' && i.uid !== it.uid).map(i => hsCardOf(i)).filter(Boolean);
  if (cur && !hs.pick) {
    const d = cardDef(cur), fam = hsFam(cur);
    return `<div class="hr-h">Resting here</div>` + hsInfo(`${d.icon} ${d.name}`, `${RARITY_LABEL[d.rarity]}${fam ? ' · ' + FAMILIES[fam].name : ''}${hsResonant(it) ? ' · resonating with its corner' : ''}`)
      + sceneBtn('hs:change', 'Choose another spirit') + sceneBtn('hs:clear:' + it.uid, 'Send it back to your cards');
  }
  const list = hsOwnedBases().filter(id => !on.includes(id)).slice(0, 14);
  return '<div class="hr-h">Choose a spirit</div>' + (list.length
    ? list.map(id => sceneBtn(`hs:perch:${it.uid}:${id}`, `${cardDef(id).icon} ${cardDef(id).name} · ${RARITY_LABEL[cardDef(id).rarity]}`)).join('')
    : hsInfo('No spirits yet', 'Cards you collect can rest here.'));
}
function hsMantelSheet(it) {
  const have = (it.cards || []).filter(c => hsOwns(c) && hasFoil(c)), reborn = [...new Set(Object.keys(foils()).filter(k => foils()[k] > 0).map(k => BattleEngine.baseIdOf(k)))].filter(c => cardDef(c) && !have.includes(c));
  let s = `<div class="hr-h">On the mantel · ${have.length} of 3</div>`;
  s += have.map(c => sceneBtn(`hs:mdel:${it.uid}:${c}`, `✨ ${cardDef(c).icon} ${cardDef(c).name} · take down`)).join('');
  if (have.length < 3) s += '<div class="hr-h">Reborn spirits</div>' + (reborn.length
    ? reborn.map(c => sceneBtn(`hs:madd:${it.uid}:${c}`, `${cardDef(c).icon} ${cardDef(c).name} · ${RARITY_LABEL[cardDef(c).rarity]}`)).join('')
    : hsInfo('None yet', 'A spirit that faded as an Echo can come back Reborn. They shimmer here.'));
  return s;
}
function hsCabinetSheet() {
  const done = CARD_SETS.filter(setComplete).length;
  return `<div class="hr-h">Card sets · ${done} of ${CARD_SETS.length}</div>` + CARD_SETS.map(s => sceneBtn('hr:noop', `${setComplete(s) ? '✅' : s.icon} ${s.name} · ${setComplete(s) ? s.text : setProgress(s) + '/' + s.cards.length}`, true)).join('');
}

/* ---------------- buttons ---------------- */
function hsAction(act) {
  const [, what, a, b] = act.split(':'), items = hrHome().items, it = items.find(i => i.uid === a);
  if (what === 'welcome') { hsWelcome(); return; }
  if (what === 'change') { hs.pick = true; }
  else if (what === 'perch' && it && it.id === 'perch' && hsOwns(b)) { it.card = BattleEngine.baseIdOf(b); hs.pick = false; sfx('claim'); showTipOnce('homeSpirits'); hrCommit(); }
  else if (what === 'clear' && it) { delete it.card; hs.pick = false; sfx('tap'); hrCommit(); }
  else if (what === 'madd' && it && it.id === 'mantel' && hasFoil(b) && (it.cards || []).length < 3 && !(it.cards || []).includes(b)) { it.cards = (it.cards || []).concat([b]); sfx('claim'); hrCommit(); }
  else if (what === 'mdel' && it) { it.cards = (it.cards || []).filter(c => c !== b); sfx('tap'); hrCommit(); }
  renderScene();
}

/* ---------------- companion at home ---------------- */
function hsFreeTiles(avoid) {
  const r = homeRoom, out = [];
  for (let y = 2; y <= r.rows - 2; y++) for (let x = 1; x <= r.cols - 2; x++)
    if (hrWalkable(x, y) && !(x === r.x && y === r.y) && !(x === HR_DOOR_X && y === hrMatY()) && !avoid.some(a => a && a.x === x && a.y === y)) out.push({ x, y });
  return out;
}
function hsPick(list) { return list.length ? list[Math.floor(Math.random() * list.length)] : null; }
function hsPlaceComp() {
  const r = homeRoom, ok = hs.comp && hrWalkable(hs.comp.x, hs.comp.y) && hs.comp.x >= 1 && hs.comp.y >= 2 && hs.comp.x <= r.cols - 2 && hs.comp.y <= r.rows - 2;
  if (!ok) { const near = hsFreeTiles([hs.vis]).sort((a, b) => Math.abs(a.x - r.x) + Math.abs(a.y - r.y) - Math.abs(b.x - r.x) - Math.abs(b.y - r.y)).slice(0, 6); hs.comp = hsPick(near); }
  return hs.comp;
}
function hsTick() {   // every few seconds: the companion shuffles a step, and now and then a spirit may call
  const h = homeRoom; if (!h.world || !scene || scene.id !== 'home' || scene.mode || doorFading) return;
  hs.ticks++;
  const c = hs.comp, el = h.world.querySelector('.hr-comp');
  if (c && el && !h.edit && !h.sel && Math.random() < .7) {
    const nbs = [[0, -1], [0, 1], [-1, 0], [1, 0]].map(([dx, dy]) => ({ x: c.x + dx, y: c.y + dy }))
      .filter(t => hrWalkable(t.x, t.y) && t.y >= 2 && t.y <= h.rows - 2 && !(t.x === h.x && t.y === h.y) && !(t.x === HR_DOOR_X && t.y === hrMatY()) && !(hs.vis && hs.vis.x === t.x && hs.vis.y === t.y));
    const n = hsPick(nbs);
    if (n) { c.x = n.x; c.y = n.y; el.style.setProperty('--x', n.x); el.style.setProperty('--y', n.y); el.style.zIndex = n.y * 10 + 4; }
  }
  if (hs.ticks % 20 === 0) hsMaybeVisit(false);   // about once a minute
}

/* ---------------- visiting spirits ---------------- */
function hsVisit() {   // today's visits; a new day starts clean and any spirit still waiting has gone
  const h = homeState(), t = todayKey();
  if (!h.visit || h.visit.day !== t) h.visit = { day: t, n: 0, cur: null, nextAt: 0 };
  return h.visit;
}
function hsFamilyWeights() {   // each family starts at 1; its corners count 2 apiece and the perches showing it 1 apiece
  const w = {};
  Object.keys(FAMILIES).forEach(f => {
    const perches = hrHome().items.filter(i => i.id === 'perch' && hsCardOf(i) && hsFam(hsCardOf(i)) === f).length;
    w[f] = 1 + Math.min(6, hsCorners(f) * 2) + Math.min(3, perches);
  });
  return w;
}
function hsRoll(level, rnd) {   // which spirit calls: rarity from the home level, family from the corners and perches
  rnd = rnd || Math.random;
  const odds = HS_ODDS[Math.min(5, Math.max(HS_VISIT_LEVEL, level))]; let r = rnd(), rar = odds[odds.length - 1][0];
  for (const [k, p] of odds) { r -= p; if (r <= 0) { rar = k; break; } }
  const w = hsFamilyWeights(), fams = Object.keys(w); let fr = rnd() * fams.reduce((a, f) => a + w[f], 0), fam = fams[0];
  for (const f of fams) { fr -= w[f]; if (fr <= 0) { fam = f; break; } }
  let pool = CARD_POOL.filter(c => c.rarity === rar && !c.exclusive && CARD_FAMILY[c.id] === fam);
  if (!pool.length) pool = CARD_POOL.filter(c => c.rarity === rar && !c.exclusive && CARD_FAMILY[c.id]);
  if (!pool.length) pool = cardPool(rar);
  return { card: pool[Math.floor(rnd() * pool.length)].id, rar, fam };
}
function hsMaybeVisit(force) {
  const home = hrHome(); if (home.level < HS_VISIT_LEVEL) return false;
  const v = hsVisit();
  if (v.cur || v.n >= HS_DAILY[home.level]) return false;
  if (!force) {
    if (Date.now() < v.nextAt) return false;
    v.nextAt = Date.now() + HS_COOLDOWN;
    const resonant = hrHome().items.filter(hsResonant).length;
    if (Math.random() > Math.min(.85, .55 + .05 * resonant)) { saveState(); return false; }
  }
  v.cur = hsRoll(home.level); hs.vis = null; saveState();
  if (homeRoom.world) { hrRefresh(); toast('✨ A spirit has come to visit your home'); showTipOnce('homeSpirits'); }
  else setTimeout(() => { if (scene && scene.id === 'home') { toast('✨ A spirit has come to visit your home'); showTipOnce('homeSpirits'); } }, 900);   // called as you walk in, before the room is drawn
  return true;
}
function hsPlaceVisitor() {
  const r = homeRoom, ok = hs.vis && hrWalkable(hs.vis.x, hs.vis.y) && hs.vis.y >= 2 && hs.vis.y <= r.rows - 2 && hs.vis.x >= 1 && hs.vis.x <= r.cols - 2;
  if (!ok) { const mid = { x: r.cols / 2, y: r.rows / 2 }; hs.vis = hsPick(hsFreeTiles([hs.comp]).sort((a, b) => Math.hypot(a.x - mid.x, a.y - mid.y) - Math.hypot(b.x - mid.x, b.y - mid.y)).slice(0, 8)); }
  return hs.vis;
}
function hsEntitiesHtml() {   // the companion and a waiting visitor, drawn just under the player
  let s = '';
  hs.vis = hs.vis || null;
  const v = hrHome().level >= HS_VISIT_LEVEL ? hsVisit().cur : null;
  if (v) { const t = hsPlaceVisitor(); if (t) s += `<div class="hr-visitor" style="--x:${t.x};--y:${t.y};--g:${HS_GLOW[v.rar] || '#fff'}"><span class="hr-vfig">${hsArt(v.card)}</span></div>`; }
  if (state.companion) { const c = hsPlaceComp(); if (c) s += `<div class="ent hr-comp" style="--x:${c.x};--y:${c.y};z-index:${c.y * 10 + 4}"><span>${companionIconHtml(state.companion)}</span></div>`; }
  return s;
}
function hsTapVisitor(tx, ty) {   // true when the tap was for the visiting spirit (it opens its sheet) or the companion (it says something)
  const v = hrHome().level >= HS_VISIT_LEVEL ? hsVisit().cur : null;
  if (v && hs.vis && tx === hs.vis.x && (ty === hs.vis.y || ty === hs.vis.y - 1)) {
    const h = homeRoom; h.sel = 'hs-visitor'; const d = cardDef(v.card); scene.text = `A spirit has come to visit: ${d.name}, ${RARITY_LABEL[d.rarity]}. It has brought you something.`; sfx('tap'); renderScene(); return true;
  }
  if (state.companion && hs.comp && tx === hs.comp.x && ty === hs.comp.y) { toast(companionLine()); sfx('tap'); return true; }
  return false;
}
function hsVisitorSheet() {
  const v = hsVisit().cur; if (!v) return '';
  const d = cardDef(v.card);
  return hsInfo(`${d.icon} ${d.name}`, `${RARITY_LABEL[d.rarity]} · ${FAMILIES[v.fam] ? FAMILIES[v.fam].name : 'a spirit'}`) + sceneBtn('hs:welcome', '🤝 Welcome it');
}
function hsWelcome() {
  const home = hrHome(), v = hsVisit(); if (!v.cur) return;
  const cid = v.cur.card, isNew = !discoveredSet().has(BattleEngine.baseIdOf(cid));
  v.cur = null; v.n++; hs.vis = null; homeRoom.sel = null;
  state.ownedCards.push(cid); saveState(); updateHud(); bumpPill('pillCards'); bumpStat('homeVisitors', 1);
  logEvent('🕊️', `A spirit visited your home and left ${cardDef(cid).name}.`);
  hrRefresh(); renderScene();
  showCardReveal(cid, 'A visiting spirit', false);
  if (isNew) toast('📖 New entry in your Index');
}

/* ---------------- start and stop ---------------- */
function hsEnter() {
  hsLeave(); hs.pick = false; hs.comp = null; hs.vis = null; hs.ticks = 0;
  hs.timer = setInterval(hsTick, 3000);
  const waiting = hrHome().level >= HS_VISIT_LEVEL && hsVisit().cur;
  if (waiting) setTimeout(() => { if (scene && scene.id === 'home' && hsVisit().cur) toast('✨ A spirit is waiting to meet you'); }, 900);
  else hsMaybeVisit(false);
}
function hsLeave() { if (hs.timer) { clearInterval(hs.timer); hs.timer = 0; } }
