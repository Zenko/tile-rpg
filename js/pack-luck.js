/* ============================================================
   THE LUCKY METER AND STARRED CARDS (build 332)
   Lucky meter. Every Ember spent on a pack fills it (state.progress.packLuck); a pack that gives super rare or better empties
   it. When a pack's price would fill it to PACK_LUCK_AT, that pack is super rare at least. 300 is about what a super costs in
   ordinary packs on average, so the meter only matters on an unlucky streak; Starlight wishes (js/wishes.js) stay the way to
   get one chosen card. Applied in buyPack (js/workshop-and-starter.js) through packLuckRoll.
   Starred cards. Up to STAR_MAX cards you are hoping for (state.progress.starred), starred from Cards → Sets on a card you
   are missing. seasonalPick (js/progression.js) makes a starred card twice as likely as the rest of its rarity wherever a
   random card is picked (packs, the trading board, finds, prizes), so rarity odds never change, only which card of that
   rarity turns up. A starred card un-stars itself when it joins your collection (starredNoteNew, from noteCardsFound).
   ============================================================ */
const PACK_LUCK_AT = 300, STAR_MAX = 3, STAR_WEIGHT = 2;
function packLuck() { return Math.max(0, Math.floor(+state.progress.packLuck) || 0); }
// The pack's rolled rarity, raised to super if the meter fills with this pack; also moves the meter.
function packLuckRoll(rarity, cost) {
  const tier = RARITY_ORDER.indexOf(rarity), superAt = RARITY_ORDER.indexOf('super');
  if (tier >= superAt) { state.progress.packLuck = 0; return rarity; }
  if (packLuck() + cost >= PACK_LUCK_AT) { state.progress.packLuck = 0; bumpStat('luckyPacks', 1); setTimeout(() => toast(words('luck.filled')), 900); return 'super'; }
  state.progress.packLuck = packLuck() + cost;
  return rarity;
}
function starred() { const s = state.progress.starred; return Array.isArray(s) ? s.filter(id => cardDef(id)) : []; }
function isStarred(id) { return starred().includes(id); }
function starWeight(id) { return isStarred(id) ? STAR_WEIGHT : 1; }
function canStar(id) { const d = cardDef(id); return !!d && !d.exclusive && !d.foe && !d.token; }
function toggleStar(id) {
  const s = starred(), i = s.indexOf(id);
  if (i >= 0) s.splice(i, 1);
  else if (!canStar(id)) { toast(words('star.cannot')); return false; }
  else if (s.length >= STAR_MAX) { toast(words('star.full', { n: STAR_MAX })); return false; }
  else s.push(id);
  state.progress.starred = s; saveState(); sfx('tap'); buzz(HAP.tap);
  return true;
}
// A starred card just arrived: it has done its job.
function starredNoteNew() {
  const own = new Set(state.ownedCards), s = starred(), got = s.filter(id => own.has(id));
  if (!got.length) return;
  state.progress.starred = s.filter(id => !own.has(id));
  got.forEach(id => { const d = cardDef(id); setTimeout(() => toast(words('star.found', { card: `${d.icon} ${d.name}` })), 1500); });
}
function luckPanelHtml() {
  const n = packLuck(), s = starred();
  const stars = s.length ? s.map(id => { const d = cardDef(id); return `<span class="luck-star" title="${escapeHtml(d.name)}">⭐ ${d.icon} ${escapeHtml(d.name)}</span>`; }).join('') : `<span class="luck-none">${words('star.none')}</span>`;
  return `<div class="wallet luck-wallet"><div class="luck-body"><div class="w-amt">🍀 ${words('luck.title')}</div>
    <div class="q-bar" role="img" aria-label="${n} of ${PACK_LUCK_AT}"><div class="q-fill" style="width:${Math.round(n / PACK_LUCK_AT * 100)}%"></div></div>
    <div class="w-sub">${words('luck.sub', { n, of: PACK_LUCK_AT })}</div>
    <div class="luck-stars">${stars}</div></div></div>`;
}
