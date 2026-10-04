/* ============================================================
   FATE SPREAD (build 112)
   Lay three cards from your deck as a tarot spread (Cards -> Deck -> Your deck). It is saved with the deck slot and applies to
   every match played with that deck (BattleEngine.layoutSpread, js/data-and-engine.js):
     Past    - always in your opening hand
     Present - enters play with a Haze
     Future  - joins your hand at the start of your 4th turn
   Three cards of one family are Harmony (+2 Calm at the start); three different families are Contrast (one extra card).
   A spread names cards by id. If the deck no longer holds all three, the spread waits (it is not erased) and says so.
   Unlocked at Keeper level 6 (FEATURE_LEVELS.spread in js/progression.js). Neutral (draft) and puzzle matches ignore it.
   ============================================================ */
const SPREAD_SLOTS = [
  { pos: 'Past',    icon: '🕰️', fx: 'Starts in your hand' },
  { pos: 'Present', icon: '🔮', fx: 'Enters play with a Haze' },
  { pos: 'Future',  icon: '🌅', fx: 'Joins your hand on turn 4' },
];
let spreadEditing = false;
const spreadSlot = () => ensureDeckSlots()[state.activeDeckSlot];
function spreadIds() { const s = spreadSlot(); return Array.isArray(s.spread) ? s.spread.slice(0, 3) : []; }
function spreadSet(ids) { spreadSlot().spread = ids.slice(0, 3); saveState(); }
// Do the saved ids all exist in the current deck (counting copies)?
function spreadValid(ids) {
  if (ids.length !== 3) return false;
  const left = state.deck.slice();
  return ids.every(id => { const i = left.indexOf(id); if (i < 0) return false; left.splice(i, 1); return true; });
}
function currentSpread() { if (featureLocked('spread')) return null; const ids = spreadIds(); return spreadValid(ids) ? ids : null; }

function renderDeckSpread() {
  const el = document.getElementById('deckSpread'); if (!el) return;
  if (featureLocked('spread')) { el.innerHTML = `<div class="sp-head"><b>🃏 Fate Spread</b><small>${featureLockText('spread')}</small></div>`; return; }
  const ids = spreadIds(), valid = spreadValid(ids), full = state.deck.length >= DECK_SIZE;
  const bonus = ids.length === 3 && valid ? BattleEngine.spreadBonus(ids) : { harmony: false, contrast: false };
  const chip = (i) => { const id = ids[i], d = id && cardDef(id), s = SPREAD_SLOTS[i];
    return `<button type="button" class="sp-slot${d ? ' filled' : ''}${d && !valid ? ' off' : ''}" data-spslot="${i}" aria-label="${s.pos}: ${d ? d.name + '. Tap to remove.' : 'empty'}"><span class="sp-pos">${s.icon} ${s.pos}</span><span class="sp-card">${d ? `<span class="sp-ico">${cardArtHtml(d)}</span><b>${d.name}</b>` : '<span class="sp-ico">?</span><b>Choose a card</b>'}</span><small>${s.fx}</small></button>`; };
  const note = ids.length === 3 && !valid ? '<div class="sp-note">Your deck no longer holds all three of these cards, so the spread is resting. Put them back or lay a new one.</div>'
    : bonus.harmony ? '<div class="sp-bonus">✨ Harmony: all one family · +2 Calm at the start</div>' : bonus.contrast ? '<div class="sp-bonus">🌈 Contrast: three families · draw 1 extra card at the start</div>'
    : ids.length === 3 ? '<div class="sp-hint">No bonus. One family gives Harmony, three different families give Contrast.</div>' : '<div class="sp-hint">Past starts in your hand, Present enters with a Haze, Future arrives on turn 4.</div>';
  let pick = '';
  if (spreadEditing) {
    const seen = {}; const tiles = state.deck.map((id, i) => { const d = cardDef(id); if (!d) return ''; const n = ids.filter(x => x === id).length, copies = state.deck.filter(x => x === id).length;
      return `<button type="button" class="sp-pick${n ? ' used' : ''}" data-sppick="${i}" aria-label="${d.name}${n ? ', chosen' : ''}"><span>${cardArtHtml(d)}</span><small>${d.name}</small>${n ? `<i>${ids.indexOf(id) + 1}</i>` : ''}</button>`; }).join('');
    pick = `<div class="sp-grid">${tiles || '<div class="sp-hint">Fill your deck first.</div>'}</div>`;
  }
  el.innerHTML = `<div class="sp-head"><b>🃏 Fate Spread</b><small>${valid ? 'Laid for ' + spreadSlot().name : 'Lay three cards from your deck'}</small></div>
    <div class="sp-slots">${[0, 1, 2].map(chip).join('')}</div>${note}${pick}
    <div class="calm-actions two"><button type="button" class="calm-btn wide" id="spEdit" ${full ? '' : 'disabled'}>${spreadEditing ? 'Done' : ids.length ? '✎ Change spread' : '🃏 Lay a spread'}</button>${ids.length ? '<button type="button" class="calm-btn wide" id="spClear">Clear</button>' : ''}</div>`;
  const edit = document.getElementById('spEdit'); if (edit) edit.addEventListener('click', () => { spreadEditing = !spreadEditing; sfx('nav'); renderDeckSpread(); });
  const clr = document.getElementById('spClear'); if (clr) clr.addEventListener('click', () => { spreadSet([]); sfx('soft'); renderDeckSpread(); });
  onAll(el, '[data-spslot]', b => { const i = +b.dataset.spslot, cur = spreadIds(); if (!cur[i]) { spreadEditing = true; sfx('tap'); renderDeckSpread(); return; } cur.splice(i, 1); spreadSet(cur); sfx('tap'); renderDeckSpread(); });
  onAll(el, '[data-sppick]', b => {
    const id = state.deck[+b.dataset.sppick], cur = spreadIds(), copies = state.deck.filter(x => x === id).length, used = cur.filter(x => x === id).length;
    if (cur.includes(id) && used >= copies) { cur.splice(cur.indexOf(id), 1); spreadSet(cur); sfx('tap'); renderDeckSpread(); return; }   // tap a chosen card again to take it back
    if (cur.length >= 3) { toast('Three cards only. Tap a chosen one to take it back.'); sfx('tie'); return; }
    cur.push(id); spreadSet(cur); sfx('claim'); renderDeckSpread();
  });
}

// Keep-this-hand screen: a read-only line of what is laid, so the Past card's place in your hand makes sense.
function btRenderSpreadRow() {
  const row = document.getElementById('spreadRow'); if (!row || !battle) return;
  const pl = battle.G.p[0];
  if (!pl.spread) { row.classList.add('hidden'); return; }
  const b = BattleEngine.spreadBonus(pl.spread.ids);
  row.classList.remove('hidden');
  row.innerHTML = mullRowHtml('spread', '🃏', 'Fate Spread', b.harmony ? 'Harmony · +2 Calm' : b.contrast ? 'Contrast · +1 card' : 'Past · Present · Future', `<div class="sp-line">${pl.spread.ids.map((id, i) => `<span><small>${SPREAD_SLOTS[i].pos}</small>${cardDef(id).icon} ${cardDef(id).name}</span>`).join('')}</div>${b.harmony ? '<div class="knack-desc">✨ Harmony: +2 Calm</div>' : b.contrast ? '<div class="knack-desc">🌈 Contrast: one extra card</div>' : ''}`);
  mullRowOpen(row, 'spread');
}
