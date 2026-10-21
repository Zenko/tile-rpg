/* ============================================================
   TRADING CARDS WITH NEIGHBOURS AND BOSSES (build 288)
   The Talk screen has a Trade card. Everyone you can talk to (but not Rook, the Atlas or a travelling visitor, who have their own screens)
   will swap cards with you:
     - a neighbour shows three cards they would part with today (npcTradeOffers: made from their name and the date, so it is the same all day
       and fresh tomorrow; the better you know them, the rarer the cards; the first leans on their favourite keyword). Each can be taken once a day.
     - a boss only trades once you have beaten them (summonState().beaten, the same flag the altar uses), and only their own cards: the three in
       BOSS_CARDS (two supers and a mythic), all super rare or better. One trade a boss per day.
   You pay with a SPARE copy (spareCount, so a deck is never broken) of the same rarity or better. Crafted "+" cards and the summoned gods
   and the Atlas cannot be traded away. A card with the neighbour's favourite keyword earns more friendship.
   A swap is made at the trade table (build 296, openTradeTable below): a window showing the two cards side by side with each one's family, what the
   swap pays, and a two-step agreement (you shake on it, then they do) before anything changes hands. A trade pays XP and Embers by the rarity of the card
   you take (NPC_TRADE_REWARD), a little more when it is their favourite keyword.
   Gamified (build 297): a Trader rank from your lifetime trades (TRADER_RANKS, +10% on every reward per rank), a Family match (the card you give and the
   card you take belong to the same family: +50%), and a daily goal of three swaps that pays a bonus on the third.
   Saved in state.progress.npcTrades = { day, done: { <offer key>: true } }, reset each day. UI: #talkTrade in index.html, the TRADE block at the
   end of css/latest.css; talkGo / renderTalkView (js/requests-friendship-rival.js) call renderTradePane. tests/npc-trade.test.js.
   ============================================================ */
const NPC_TRADE_TIERS = [['common', 'rare', 'rare'], ['common', 'rare', 'ultra'], ['rare', 'ultra', 'super']];   // by friendship: new, friendly (2+ hearts), close (3+)
function npcTradeState() {
  const p = state.progress;
  if (!p.npcTrades || p.npcTrades.day !== todayKey()) p.npcTrades = { day: todayKey(), done: {}, count: 0 };
  return p.npcTrades;
}
function npcTradeKind(f) { return !f || f.isRival || f.isAtlas || f.isVisitor ? null : f.isBoss ? 'boss' : 'neighbour'; }
function npcBossDistrict(f) { const m = /^boss-([a-z]+)/.exec(f && f.id || ''); return m && BOSS_CARDS[m[1]] ? m[1] : state.currentDistrict; }
function npcBossBeaten(f) { return !!(f && f.isBoss && summonState().beaten[npcBossDistrict(f)]); }
// Today's offers: [{ key, give (card id), need (the rarity you must pay with, or better) }]
function npcTradeOffers(f) {
  const kind = npcTradeKind(f);
  if (kind === 'boss') { const d = npcBossDistrict(f); return (BOSS_CARDS[d] || []).map(id => ({ key: 'boss:' + d + ':' + id, give: id, need: cardDef(id).rarity })); }
  if (kind !== 'neighbour') return [];
  const key = neighborKey(f), rnd = seeded('trade|' + key + '|' + todayKey()), hearts = friendHearts(f);
  const tiers = NPC_TRADE_TIERS[hearts >= 3 ? 2 : hearts >= 2 ? 1 : 0], fam = districtFamily(state.currentDistrict), theme = signatureTheme(f), taken = new Set(), out = [];
  tiers.forEach((rar, i) => {
    const pool = cardPool(rar), loved = pool.filter(c => c.kw.includes(theme)), kin = fam ? pool.filter(c => CARD_FAMILY[c.id] === fam) : [];
    let src = i === 0 && loved.length ? loved : kin.length && rnd() < 0.6 ? kin : pool;
    src = src.filter(c => !taken.has(c.id)); if (!src.length) src = pool;
    const c = src[Math.floor(rnd() * src.length)]; taken.add(c.id);
    out.push({ key: 'n:' + key + ':' + i, give: c.id, need: rar });
  });
  return out;
}
const NPC_TRADE_REWARD = { common: [8, 2], rare: [12, 3], ultra: [18, 5], super: [26, 8], mythic: [40, 12] };   // [XP, Embers] by the rarity of the card you take
const TRADER_RANKS = [{ n: 0, name: 'Newcomer', icon: '🌱' }, { n: 3, name: 'Swapper', icon: '🔄' }, { n: 8, name: 'Dealer', icon: '🤝' }, { n: 15, name: 'Merchant', icon: '🎒' }, { n: 30, name: 'Tycoon', icon: '👑' }];
const TRADE_DAILY_GOAL = 3, TRADE_DAILY_BONUS = { xp: 30, embers: 10 }, TRADE_KIN_BONUS = 0.5, TRADE_RANK_BONUS = 0.1;
function traderInfo() {
  const n = (state.progress.totals.tradesDone || 0); let i = 0;
  TRADER_RANKS.forEach((r, k) => { if (n >= r.n) i = k; });
  const next = TRADER_RANKS[i + 1] || null;
  return { n, i, rank: TRADER_RANKS[i], next, frac: next ? (n - TRADER_RANKS[i].n) / (next.n - TRADER_RANKS[i].n) : 1 };
}
function tradeKin(payId, gotId) { const a = CARD_FAMILY[BattleEngine.baseIdOf(payId)], b = CARD_FAMILY[BattleEngine.baseIdOf(gotId)]; return !!a && a === b; }
// What a swap pays: by the rarity of the card you take, a little more for their favourite keyword, +10% a Trader rank, +50% for a Family match.
function npcTradeReward(got, loved, kin) {
  const r = NPC_TRADE_REWARD[got.rarity] || NPC_TRADE_REWARD.common, mul = (1 + TRADE_RANK_BONUS * traderInfo().i) * (kin ? 1 + TRADE_KIN_BONUS : 1);
  return { xp: Math.round((r[0] + (loved ? 4 : 0)) * mul), embers: Math.round((r[1] + (loved ? 2 : 0)) * mul) };
}
function npcTradeDone(f, o) {
  const done = npcTradeState().done;
  return !!done[o.key] || (f.isBoss && !!done['boss:' + npcBossDistrict(f)]);   // a boss trades once a day, whichever card
}
// The spare cards that can pay for an offer: this rarity or better, never a crafted card, a summoned god or the Atlas.
function npcTradeCandidates(o) {
  const min = Math.max(RARITY_ORDER.indexOf(o.need), RARITY_ORDER.indexOf(o.boss ? 'super' : 'common'));
  return Object.keys(ownedCardCounts()).filter(id => {
    const d = cardDef(id);
    return d && !d.crafted && d.exclusive !== 'summon' && RARITY_ORDER.indexOf(d.rarity) >= min && spareCount(id) >= 1;
  }).sort((a, b) => RARITY_ORDER.indexOf(cardDef(a).rarity) - RARITY_ORDER.indexOf(cardDef(b).rarity) || cardDef(a).name.localeCompare(cardDef(b).name));
}
function npcTradeDo(f, offerKey, payId) {
  const kind = npcTradeKind(f);
  if (!kind || (kind === 'boss' && !npcBossBeaten(f))) return null;
  const o = npcTradeOffers(f).find(x => x.key === offerKey);
  if (!o || npcTradeDone(f, o)) return null;
  if (!npcTradeCandidates(Object.assign({ boss: kind === 'boss' }, o)).includes(payId)) return null;
  const pay = cardDef(payId), got = cardDef(o.give), isNew = !discoveredSet().has(o.give);
  const loved = kind === 'neighbour' && (pay.kw.includes(signatureTheme(f)) || got.kw.includes(signatureTheme(f)));
  state.ownedCards.splice(state.ownedCards.indexOf(payId), 1);
  state.ownedCards.push(o.give);
  const done = npcTradeState().done; done[o.key] = true; if (kind === 'boss') done['boss:' + npcBossDistrict(f)] = true;
  state.progress.discovered = Array.from(new Set((state.progress.discovered || []).concat([BattleEngine.baseIdOf(payId)])));   // the Index remembers what went
  bumpStat('tradesDone', 1); bumpStat('cardsFound', 1); bumpPill('pillCards');
  const kin = tradeKin(payId, o.give), reward = npcTradeReward(got, loved, kin), rank0 = traderInfo().i;
  addXP(reward.xp); addPebbles(reward.embers, 'trades');   // addPebbles saves and refreshes the bar
  const st = npcTradeState(); st.count = (st.count || 0) + 1;
  const daily = st.count === TRADE_DAILY_GOAL;   // the third swap of the day pays a bonus
  if (daily) { addXP(TRADE_DAILY_BONUS.xp); addPebbles(TRADE_DAILY_BONUS.embers, 'trades'); }
  if (kind === 'neighbour') addFriendship(f, loved ? 3 : 1, 'trade');
  logEvent('🤝', `Traded ${pay.name} to ${f.name} for ${got.name}.`);
  saveState(); updateHud(); if (typeof checkSets === 'function') checkSets(); checkAchievements();
  if (isNew) toast('📖 New entry in your Index');
  const ti = traderInfo(), rankUp = ti.i > rank0 ? ti.rank : null;
  if (rankUp) setTimeout(() => toast(`${rankUp.icon} You are a ${rankUp.name} trader now. Swaps pay ${Math.round(TRADE_RANK_BONUS * 100 * ti.i)}% more.`), 1800);
  const total = { xp: reward.xp + (daily ? TRADE_DAILY_BONUS.xp : 0), embers: reward.embers + (daily ? TRADE_DAILY_BONUS.embers : 0) };
  const note = `🫧 +${total.embers} ${GAME.currency.many}` + (kin ? '<br>🤝 Family match: +50%' : '') + (daily ? `<br>⭐ Daily trader bonus: ${TRADE_DAILY_GOAL} swaps today` : '');
  showCardReveal(o.give, `Traded with ${f.name}`, true, note, total.xp);
  return { o, pay, got, loved, reward, kin, daily, rankUp };
}

/* ---------------- the Trade card on the Talk screen ---------------- */
let tradePick = null;   // the offer key being paid for, or null while the offers are showing
function tradeCatSub(f) {
  if (f.isBoss && !npcBossBeaten(f)) return 'Beat them first';
  const left = npcTradeOffers(f).filter(o => !npcTradeDone(f, o)).length;
  return left ? `${left} to see` : 'Back tomorrow';
}
function tradeThumb(d) { return `<span class="tr-art rarity-${d.rarity}">${cardArtHtml(d)}</span>`; }
function tradeLine(f) {
  if (f.isBoss) return npcBossBeaten(f) ? `You beat me fair and square. Take a look at what I keep.` : `Trade? Not with someone who has not beaten me.`;
  return typeof npcGreeting === 'function' ? npcGreeting(f, `Let me see what I can spare today.`) : `Let me see what I can spare today.`;
}
function tradeOpened(f) { tradePick = null; talkSaid = ''; talkSay(tradeLine(f)); if (typeof showTipOnce === 'function') showTipOnce('npctrade'); }
function renderTradePane(f) {
  const box = document.getElementById('talkTrade'); if (!box || !f) return;
  const kind = npcTradeKind(f);
  if (!kind) { box.innerHTML = ''; return; }
  if (kind === 'boss' && !npcBossBeaten(f)) { box.innerHTML = `<div class="talk-sub">${escapeHtml(f.name)} only trades with someone who has beaten them. Win a match first.</div>`; return; }
  const offers = npcTradeOffers(f), picked = tradePick && offers.find(o => o.key === tradePick);
  if (!picked) {
    tradePick = null;
    const sub = kind === 'boss' ? `${escapeHtml(f.name)} trades one card a day, and only for a spare super rare or better.` : `Each card can be traded once a day, for a spare of the same rarity or better. Cards with ${KW[signatureTheme(f)].icon} ${KW[signatureTheme(f)].name} make ${escapeHtml(f.name)} happiest.`;
    box.innerHTML = `<div class="talk-sub">${sub}</div>` + offers.map(o => {
      const d = cardDef(o.give), done = npcTradeDone(f, o), need = kind === 'boss' && RARITY_ORDER.indexOf(o.need) < RARITY_ORDER.indexOf('super') ? 'super' : o.need;
      return `<button type="button" class="talk-topic tr-offer${done ? ' used' : ''}" data-offer="${o.key}"${done ? ' disabled' : ''}>${tradeThumb(d)}<span class="tr-t"><b>${escapeHtml(d.name)}</b><small>${RARITY_LABEL[d.rarity]} · costs a spare ${RARITY_LABEL[need]} or better${discoveredSet().has(o.give) ? '' : ' · new to you'}</small></span>${done ? '<em>Traded</em>' : ''}</button>`;
    }).join('');
    return;
  }
  const got = cardDef(picked.give), cands = npcTradeCandidates(Object.assign({ boss: kind === 'boss' }, picked)), theme = kind === 'neighbour' ? signatureTheme(f) : null;
  box.innerHTML = `<button type="button" class="talk-topic tr-back" data-back="1">‹ Other cards</button><div class="talk-sub">For ${escapeHtml(got.name)}, give a spare ${RARITY_LABEL[picked.need]} card or better. Only spare copies are shown.</div>` +
    (cands.length ? cands.map(id => { const d = cardDef(id); return `<button type="button" class="talk-topic tr-offer" data-pay="${id}">${tradeThumb(d)}<span class="tr-t"><b>${escapeHtml(d.name)}${theme && d.kw.includes(theme) ? ' 💞' : ''}</b><small>${RARITY_LABEL[d.rarity]} · you have ${ownedCardCounts()[id]}</small></span></button>`; }).join('')
      : `<div class="talk-sub">You have no spare ${RARITY_LABEL[picked.need]} card or better to give yet.</div>`);
}
document.getElementById('talkTrade').addEventListener('click', e => {
  const f = talkTo; if (!f) return;
  const back = e.target.closest('[data-back]'), offer = e.target.closest('[data-offer]'), pay = e.target.closest('[data-pay]');
  if (back) { tradePick = null; sfx('nav'); renderTradePane(f); return; }
  if (offer) { tradePick = offer.dataset.offer; sfx('tap'); renderTradePane(f); return; }
  if (!pay || !tradePick) return;
  const o = npcTradeOffers(f).find(x => x.key === tradePick); if (!o) return;
  const payId = pay.dataset.pay, give = cardDef(o.give), want = cardDef(payId);
  openTradeTable(f, o, payId, () => {
    const r = npcTradeDo(f, o.key, payId);
    tradePick = null;
    if (!r) { sfx('tie'); talkSay(`Hm, that does not work for me right now.`); renderTradePane(f); renderTalkView(); return; }
    talkSaid = ''; talkSay(r.loved ? `${r.pay.name}! ${KW[signatureTheme(f)].icon} ${KW[signatureTheme(f)].name} is my favourite. Deal.` : f.isBoss ? `Fair trade. Look after it.` : `Deal. A good swap for us both.`);
    talkReact('🤝'); sfx('claim'); buzz(HAP.found);
    renderTradePane(f); renderTalkView();
  });
});

/* ---------------- the trade table: both of you agree before anything changes hands (build 296) ---------------- */
const txEl = id => document.getElementById(id);
let txBusy = false, txTimers = [], txDone = null;
function txFamily(def) { const fam = def.spell ? null : FAMILIES[CARD_FAMILY[BattleEngine.baseIdOf(def.id)]]; return fam ? `${fam.icon} ${fam.name} family` : '✨ Spell'; }
function txSide(label, id) {
  const d = cardDef(id);
  return `<small>${escapeHtml(label)}</small><div class="reveal-card-frame"><div class="reveal-card rarity-${d.rarity}${d.spell ? ' spell' : ''}">${cardFaceHtml(d)}</div></div><span class="rarity-tag rt-${d.rarity}">${RARITY_LABEL[d.rarity]}</span><span class="tx-fam">${txFamily(d)}</span>`;
}
function txClose() { txTimers.forEach(clearTimeout); txTimers = []; txBusy = false; txDone = null; txEl('tradeOverlay').classList.add('hidden'); }
function openTradeTable(f, o, payId, onDone) {
  const give = cardDef(o.give), pay = cardDef(payId), theme = f.isBoss ? null : signatureTheme(f);
  const loved = !!theme && (pay.kw.includes(theme) || give.kw.includes(theme)), kin = tradeKin(payId, o.give), rw = npcTradeReward(give, loved, kin);
  txBusy = false; txDone = onDone;
  txEl('txTitle').textContent = `Trade with ${f.name}`;
  txEl('txSay').textContent = loved ? `“${pay.name}! ${KW[theme].icon} ${KW[theme].name} is my favourite. Do we have a deal?”` : f.isBoss ? '“Fair is fair. Do we have a deal?”' : '“A swap, then? Do we have a deal?”';
  txEl('txYou').innerHTML = txSide('You give', payId);
  txEl('txThem').innerHTML = txSide(`${f.name} gives`, o.give);
  if (typeof fullArtApply === 'function') [['txYou', pay], ['txThem', give]].forEach(([id, d]) => { const face = txEl(id).querySelector('.reveal-card'); if (face) face.parentElement.classList.toggle('has-fa', fullArtApply(face, d)); });
  [['txSealYou', 'You'], ['txSealThem', f.name]].forEach(([id, who]) => { const el = txEl(id); el.className = 'tx-seal'; el.textContent = `${who}: not yet`; });
  const ti = traderInfo(), today = npcTradeState().count || 0, pips = Array.from({ length: TRADE_DAILY_GOAL }, (_, i) => `<i class="${i < today ? 'on' : ''}"></i>`).join('');
  txEl('txMeta').innerHTML = `<div class="tx-rank"><span>${ti.rank.icon} <b>${ti.rank.name}</b></span><span class="tx-bar" role="progressbar" aria-valuenow="${Math.round(ti.frac * 100)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${Math.round(ti.frac * 100)}%"></i></span><small>${ti.next ? `${ti.next.n - ti.n} more to ${ti.next.name}` : 'Top rank'}</small></div>`
    + `<div class="tx-daily"><span class="tx-pips">${pips}</span><small>${today >= TRADE_DAILY_GOAL ? 'Daily bonus claimed' : `${TRADE_DAILY_GOAL - today} more swap${TRADE_DAILY_GOAL - today === 1 ? '' : 's'} today for a bonus`}</small></div>`;
  txEl('txReward').innerHTML = `The swap pays <b>+${rw.xp} XP</b> and <b>🫧 +${rw.embers} ${GAME.currency.many}</b>` + (kin ? `<span class="tx-kin">🤝 Family match: +50%</span>` : '');
  txEl('txYes').disabled = false; txEl('txNo').disabled = false;
  txEl('tradeOverlay').classList.remove('hidden'); sfx('nav');
  txEl('txNo').focus();
  txEl('txYes').onclick = () => {
    if (txBusy) return; txBusy = true; txEl('txYes').disabled = true; txEl('txNo').disabled = true; sfx('tap'); buzz(HAP.tap);
    const quick = typeof btMotionOk === 'function' && !btMotionOk(), fn = txDone;
    const you = () => { const el = txEl('txSealYou'); el.classList.add('on'); el.textContent = '✓ You agree'; };
    const them = () => { const el = txEl('txSealThem'); el.classList.add('on'); el.textContent = `✓ ${f.name} agrees`; sfx('claim'); };
    const fin = () => { txClose(); if (fn) fn(); };
    you();
    if (quick) { them(); fin(); return; }
    txTimers.push(setTimeout(them, 650), setTimeout(fin, 1300));
  };
}
txEl('txNo').addEventListener('click', () => { if (!txBusy) { sfx('nav'); txClose(); } });
txEl('txX').addEventListener('click', () => { if (!txBusy) { sfx('nav'); txClose(); } });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !txEl('tradeOverlay').classList.contains('hidden')) { e.stopImmediatePropagation(); if (!txBusy) txClose(); } }, true);
