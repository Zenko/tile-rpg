/* ============================================================
   THE INTERACTIVE TABLE (build 336)
   The battle screen's side of the cards that ask for a decision. The rules are all in the engine (js/data-and-engine.js:
   Snares, Glimpse / G.pending, choose-one `modes`, Nestle / Flank slots, Follow-up); this file only shows them and asks.
     - Choose one: a spell with `modes` opens #btChoice with one button per half. A half that needs an enemy card then waits
       for a target the usual way (battle.sel.kind 'spell' with a `mode`).
     - Glimpse: after your play animates, an open G.pending shows the offered cards in #btChoice; a tap sends the 'pick' action.
     - Snares: set ones sit as small cards on the corner of each draw pile (yours face up to you, theirs face down) and flip
       over with a flash when they spring.
     - Placement: while you drag a Nestle or Flank card, the slots where it would earn its bonus are marked.
     - Follow-up cards glow in your hand once you have played a card this turn (btRenderHand).
     - Reading the table: the opponent lifts the card it is about to play for a beat (btTelegraph), and a tap on your draw
       pile opens #btDeckSheet, the cards still in your deck (theirs: only how many).
     - Reactions: a small wheel of emoji (#btEmotes) you can send; the opponent sometimes answers, and reacts to Snares.
   Every new event type the engine emits is drawn by btInteractEvent, which btAnimate hands them to.
   ============================================================ */
const BT_NEW_EVENTS = new Set(['snareset', 'snare', 'stopped', 'glimpse', 'picked']);
const BT_EMOTES = ['😊', '👏', '😮', '🤝', '😅', '🌙'];
const BT_EMOTE_REPLIES = ['😊', '👋', '😄', '🙏', '😌'];

/* ---------- choose one ---------- */
function btIsModal(c) { return !!(c && c.spell && BattleEngine.SPELLS[c.spell] && BattleEngine.SPELLS[c.spell].modes); }
// Resolves to the chosen mode (0 or 1), or null when the player keeps the card.
function btChooseMode(c) {
  return new Promise(res => {
    const box = btGet('btChoice'), fx = BattleEngine.SPELLS[c.spell], def = cardDef(c.id);
    box.innerHTML = `<div class="btc-sheet"><div class="btc-head"><span class="btc-ic">${cardArtHtml(def)}</span><div><b>${escapeHtml(def.name)}</b><small>${words('table.chooseOne')}</small></div></div>
      <div class="btc-opts">${fx.modes.map((m, i) => { const ok = BattleEngine.modeOk(battle.G, 0, fx, i); return `<button type="button" class="btc-opt" data-mode="${i}"${ok ? '' : ' disabled'}><span class="btc-oi">${m.icon}</span><span class="btc-ot">${escapeHtml(m.text)}${ok ? '' : `<small>${words('table.notNow')}</small>`}</span></button>`; }).join('')}</div>
      <button type="button" class="btn btn-ghost btc-cancel">${words('table.keep')}</button></div>`;
    box.classList.remove('hidden'); battleView.classList.add('choosing');
    const done = v => { box.classList.add('hidden'); box.innerHTML = ''; battleView.classList.remove('choosing'); res(v); };
    onAll(box, '.btc-opt', b => { sfx('tap'); done(+b.dataset.mode); });
    box.querySelector('.btc-cancel').addEventListener('click', () => { sfx('tap'); done(null); });
  });
}
async function btPlayModal(c) {
  showTipOnce('chooseOne');
  const mode = await btChooseMode(c);
  if (!battle || battle.ended) return;
  if (mode === null) { btRender(); return; }
  if (BattleEngine.modeNeedsTarget(c, mode)) {
    battle.sel = { kind: 'spell', uid: c.uid, mode };
    btShowTip(c, words('table.aim'));
    btRender(); return;
  }
  btDoPlay(c.uid, undefined, undefined, mode);
}

/* ---------- Glimpse ---------- */
async function btGlimpsePick(token) {
  const G = battle.G, P = G.pending;
  if (!P || P.who !== 0 || !btAlive(token)) return;
  showTipOnce('glimpse');
  const box = btGet('btChoice');
  box.innerHTML = `<div class="btc-sheet wide"><div class="btc-head"><span class="btc-ic">🔭</span><div><b>${KW.glimpse.name}</b><small>${words('table.glimpse')}</small></div></div><div class="btc-cards"></div></div>`;
  const row = box.querySelector('.btc-cards');
  const index = await new Promise(res => {
    P.options.forEach((c, i) => {
      const w = document.createElement('div'); w.className = 'btc-pick';
      const el = btCardEl(c, 'playable', true); w.appendChild(el);
      const def = cardDef(c.id), line = document.createElement('small');
      line.innerHTML = def.spell ? escapeHtml(spellText(def)) : (c.kw.length ? c.kw.map(k => `${KW[k].icon} ${KW[k].name}`).join(' · ') : cardStatsText(def));
      w.appendChild(line);
      w.addEventListener('click', () => { sfx('tap'); buzz(HAP.tap); res(i); });
      row.appendChild(w);
    });
    box.classList.remove('hidden'); battleView.classList.add('choosing');
  });
  box.classList.add('hidden'); box.innerHTML = ''; battleView.classList.remove('choosing');
  if (!btAlive(token)) return;
  BattleEngine.pickCard(G, 0, index);
  await btAnimate(btFlush(G), token);
}

/* ---------- Snares on the piles ---------- */
function btRenderSnares() {
  [['You', 0], ['Opp', 1]].forEach(([k, i]) => {
    const pile = btGet('bt' + k + 'Pile'), list = BattleEngine.snaresOf(battle.G.p[i]);
    if (!list.length) return;
    const tray = document.createElement('div'); tray.className = 'snare-tray';
    list.forEach(s => {
      const b = document.createElement('span'), def = cardDef(s.id);
      b.className = 'snare' + (i === 0 ? ' mine' : ''); b.dataset.uid = s.uid;
      b.innerHTML = i === 0 ? cardArtHtml(def) : '🪤';
      b.title = i === 0 ? `${def.name} (set): ${spellText(def)}` : words('table.snareHidden');
      tray.appendChild(b);
    });
    pile.appendChild(tray);
  });
}

/* ---------- Nestle and Flank: where the card would earn its bonus ---------- */
function btMarkSlotBonus(c) {
  if (!c || c.spell || !(c.kw.includes('nestle') || c.kw.includes('flank'))) return;
  showTipOnce('placement');
  const n = battle.G.p[0].board.length;
  battleView.querySelectorAll('#btYouBoard .slot').forEach((s, i) => {
    if (i > n) return;                                     // every empty slot past the row is the same spot: the end
    const b = BattleEngine.slotBonus(battle.G, 0, c, i), txt = b.flank ? `🏹 +${BattleEngine.RULES.flank}` : b.nestle ? `🪺 ${b.nestle === 2 ? 'both sides' : 'one side'}` : '';
    if (txt) { s.classList.add('slot-bonus'); s.dataset.bonus = txt; }
  });
}
function btClearSlotBonus() { battleView.querySelectorAll('.slot-bonus').forEach(s => { s.classList.remove('slot-bonus'); delete s.dataset.bonus; }); }

/* ---------- the opponent lifts the card it is about to play ---------- */
async function btTelegraph(a, token) {
  if (!a || a.type !== 'play' || !btMotionOk()) return;
  const G = battle.G, idx = G.p[1].hand.findIndex(c => c.uid === a.uid), backs = btGet('btOppHand').children, back = backs[idx];
  if (!back) return;
  back.classList.add('considering');
  await btWait(320);
  if (btAlive(token)) back.classList.remove('considering');
}

/* ---------- deck tracker ---------- */
function btOpenDeckTracker(side) {
  if (!battle) return;
  const pl = battle.G.p[side], sheet = btGet('btDeckSheet'), snares = BattleEngine.snaresOf(pl).length;
  let body;
  if (side === 0) {
    const groups = new Map();
    pl.deck.forEach(c => { const g = groups.get(c.id) || { c, n: 0 }; g.n++; groups.set(c.id, g); });
    const rows = [...groups.values()].sort((a, b) => a.c.cost - b.c.cost || cardDef(a.c.id).name.localeCompare(cardDef(b.c.id).name));
    body = rows.length ? `<ul class="bds-list">${rows.map(({ c, n }) => { const d = cardDef(c.id); return `<li><span class="bds-cost">${c.cost}</span><span class="bds-ic">${cardArtHtml(d)}</span><span class="bds-nm">${escapeHtml(d.name)}</span><span class="bds-st">${c.spell ? '✨' : `⚔${c.power} ♥${c.grit}`}</span><b>×${n}</b></li>`; }).join('')}</ul>` : `<p class="bds-empty">${words('table.deckEmpty')}</p>`;
    if (pl.future) body += `<p class="bds-note">🌅 ${words('table.future', { name: escapeHtml(cardDef(pl.future.id).name), n: BattleEngine.SPREAD_RULES.futureTurn })}</p>`;
    body = `<p class="bds-sub">${words('table.deckLeft', { n: pl.deck.length })}</p>` + body;
  } else {
    body = `<p class="bds-sub">${pl.deck.length} cards left in their deck · ${pl.hand.length} in hand${snares ? ` · ${snares} Snare${snares > 1 ? 's' : ''} set face down` : ''}.</p><p class="bds-note">${words('table.theirDeck')}</p>`;
  }
  sheet.innerHTML = `<div class="bds-card"><button type="button" class="bds-x" aria-label="Close">✕</button><h3>${side === 0 ? '🃏 Your deck' : `🃏 ${escapeHtml(battle.npc.name)}'s deck`}</h3>${body}</div>`;
  sheet.classList.remove('hidden'); sfx('tap');
  showTipOnce('deckTracker');
}
function btCloseDeckTracker() { const s = btGet('btDeckSheet'); s.classList.add('hidden'); s.innerHTML = ''; }

/* ---------- reactions ---------- */
let btEmoteAt = 0;
function btShowBubble(side, emoji) {
  const host = btGet(side === 0 ? 'btYouSpirit' : 'btOppSpirit'); if (!host) return;
  host.querySelectorAll('.bt-bubble').forEach(b => b.remove());
  const b = document.createElement('span'); b.className = 'bt-bubble ' + (side === 0 ? 'you' : 'opp'); b.textContent = emoji;
  host.appendChild(b); setTimeout(() => b.remove(), 1900);
}
function btToggleEmotes() {
  const box = btGet('btEmotes');
  if (!box.classList.contains('hidden')) { box.classList.add('hidden'); return; }
  box.innerHTML = BT_EMOTES.map(e => `<button type="button" class="bt-emote" data-e="${e}" aria-label="Send ${e}">${e}</button>`).join('');
  onAll(box, '.bt-emote', b => btSendEmote(b.dataset.e));
  box.classList.remove('hidden'); sfx('tap');
}
function btSendEmote(e) {
  btGet('btEmotes').classList.add('hidden');
  if (!battle || Date.now() - btEmoteAt < 1500) return;     // a gentle limit, so a tap-happy thumb does not flood the table
  btEmoteAt = Date.now();
  btShowBubble(0, e); sfx('tap'); bumpStat('emotesSent', 1);
  if (Math.random() < 0.6) setTimeout(() => { if (battle && !battle.ended) btShowBubble(1, BT_EMOTE_REPLIES[Math.floor(Math.random() * BT_EMOTE_REPLIES.length)]); }, 900);
}

/* ---------- drawing the new events ---------- */
async function btInteractEvent(e, token) {
  const name = battle.npc.name;
  if (e.type === 'snareset') {
    btRender();
    const pile = btGet(e.who === 0 ? 'btYouPile' : 'btOppPile'), mark = pile.querySelector(`.snare[data-uid="${e.uid}"]`);
    if (e.who === 1) { const backs = btGet('btOppHand'); await btFlyBack(backs.lastElementChild || backs, mark || pile, 360, false); }
    if (mark) mark.classList.add('snare-new');
    btSetMsg(e.who === 0 ? words('table.youSet', { card: `${cardDef(e.card.id).icon} ${cardDef(e.card.id).name}` }) : words('table.theySet', { name }));
    sfx('flip'); showTipOnce('snares');
    await btWait(e.who === 0 ? 300 : 520);
  } else if (e.type === 'snare') {
    const def = cardDef(e.card.id);
    const mark = btGet(e.who === 0 ? 'btYouPile' : 'btOppPile').querySelector(`.snare[data-uid="${e.card.uid}"]`);
    if (mark) mark.classList.add('snare-spring');
    btSpellFlash(def);
    btSetMsg(words(e.who === 0 ? 'table.yourSnare' : 'table.theirSnare', { name, card: def.name }));
    sfx('rare'); buzz(HAP.play); btShake(false);
    btShowBubble(1, e.who === 0 ? '😮' : '😉');
    showTipOnce('snares');
    await btWait(720);
    btRender();
  } else if (e.type === 'stopped') {
    const t = document.querySelector(`#battleView .card[data-uid="${e.uid}"]`);
    if (t) btFloater(t, '🕸️ stopped', 'blk');
    sfx('block'); await btWait(320);
  } else if (e.type === 'glimpse') {
    if (e.who === 1) { btSetMsg(words('table.theyGlimpse', { name })); await btWait(520); }
  } else if (e.type === 'picked') {
    if (e.who === 1) { btSetMsg(words('table.theyKeep', { name, n: e.n })); await btWait(300); }
  }
}

// A fresh table (or leaving one): no picker, deck sheet or reaction wheel left open.
function btResetInteract() {
  ['btChoice', 'btDeckSheet', 'btEmotes'].forEach(id => { const el = btGet(id); el.classList.add('hidden'); el.innerHTML = ''; });
  battleView.classList.remove('choosing');
}

/* ---------- wiring (the elements are in index.html; nothing here runs until a battle is on screen) ---------- */
btGet('btYouPile').addEventListener('click', () => { if (battle && !btDrag) btOpenDeckTracker(0); });
btGet('btOppPile').addEventListener('click', () => { if (battle) btOpenDeckTracker(1); });
btGet('btDeckSheet').addEventListener('click', e => { if (e.target.id === 'btDeckSheet' || e.target.closest('.bds-x')) btCloseDeckTracker(); });
btGet('btEmoteBtn').addEventListener('click', btToggleEmotes);
