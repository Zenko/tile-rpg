/* ============================================================
   BINDER (build 102)
   Collection depth for the Sets tab: nine "pages" (one per rarity and one per card family) each showing how much of that
   page you have discovered. Filling a page for the first time pays Pebbles once. Progress counts discovered cards (the same
   Index the rest of the game uses), so nothing is lost by trading or releasing a card after you have found it.
   Saved: state.progress.binderDone = { pageId: true }.
   ============================================================ */
const BINDER_PEBBLES = { common: 20, rare: 30, ultra: 45, super: 60, mythic: 90, grove: 40, stone: 40, tide: 40, wind: 40 };
function binderPages() {
  const real = CARD_POOL.filter(c => !c.foe);
  return RARITY_ORDER.map(r => ({ id: r, icon: ({ common: '⚪', rare: '🔵', ultra: '🟣', super: '🟠', mythic: '🌸' })[r] || '⚪', name: RARITY_LABEL[r], ids: real.filter(c => c.rarity === r).map(c => c.id) }))
    .concat(Object.keys(FAMILIES).map(f => ({ id: f, icon: FAMILIES[f].icon, name: FAMILIES[f].name, ids: real.filter(c => CARD_FAMILY[c.id] === f).map(c => c.id) })))
    .filter(p => p.ids.length);
}
function binderDone() { const p = state.progress; if (!p.binderDone || typeof p.binderDone !== 'object') p.binderDone = {}; return p.binderDone; }
// Called whenever cards change hands (from checkSets): pays the first time a page is full.
function checkBinder() {
  const disc = discoveredSet(), done = binderDone();
  binderPages().forEach(pg => {
    if (done[pg.id] || !pg.ids.every(id => disc.has(id))) return;
    done[pg.id] = true; const peb = BINDER_PEBBLES[pg.id] || 30;
    addPebbles(peb, 'binder'); logEvent(pg.icon, `Completed the ${pg.name} page of your binder. +${peb} 🫧`);
    setTimeout(() => toast(`${pg.icon} Binder page complete: ${pg.name}! +${peb} 🫧`), 1200); sfx('rankup');
  });
}
function binderHtml() {
  const disc = discoveredSet(), done = binderDone();
  const row = pg => { const n = pg.ids.filter(id => disc.has(id)).length, full = n === pg.ids.length;
    return `<div class="bn-row${full ? ' full' : ''}"><span class="bn-ico">${pg.icon}</span><span class="bn-name">${pg.name}</span><i class="bn-bar"><b style="width:${Math.round(n / pg.ids.length * 100)}%"></b></i><em>${full ? '✓' : n + '/' + pg.ids.length}</em></div>`; };
  const pages = binderPages(), byRar = pages.filter(p => RARITY_ORDER.includes(p.id)), byFam = pages.filter(p => !RARITY_ORDER.includes(p.id));
  const stars = Object.keys(state.progress.mastery || {}).reduce((n, id) => n + masteryRank(id), 0);
  return `<div class="bn-card"><div class="bn-title">Binder</div><div class="bn-sub">Fill a page for a one-time Pebble prize.</div>
    <div class="bn-group">By rarity</div>${byRar.map(row).join('')}<div class="bn-group">By family</div>${byFam.map(row).join('')}
    <div class="bn-foot"><span>★ ${stars} mastery stars</span><span>${Object.keys(done).length} of ${pages.length} pages complete</span></div></div>`;
}
