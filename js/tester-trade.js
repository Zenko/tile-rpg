/* ============================================================
   TRADING CARDS BETWEEN TESTERS (build 336)
   Neighbours already trade (js/npc-trade.js); this is the same idea between real testers, with no server in between.
   - What you can offer: your spare cards only (spareAllocation, js/workshop-and-starter.js), so a trade can never take the last
     copy of a card or one your deck needs. Your spares ride along on your `players/{uid}` presence document (`spares`, at
     most TT_SPARES_MAX ids, best first) when "Let testers trade with me" is on (prefs.shareTrades, default on) - the same
     `players` rule as Who's Playing, nothing new for that part.
   - Sending: Who's Playing -> 🔁 on a tester -> pick one of your spares and one of theirs. Your card is taken out of your
     collection at once and held (state.progress.ttOut[docId]) while the offer waits in the 'trades' collection, addressed to
     them. At most TT_MAX_OPEN offers out at a time, one per tester.
   - Answering: their game turns an open offer into a letter (ttFetch, like challenges) with Yes / No. Yes runs a Firestore
     transaction that only succeeds while the offer is still open, then gives them your card and takes their spare.
   - Settling: your game checks its offers (ttSettle): accepted -> their card arrives; declined, gone or older than TT_EXPIRE_MS
     -> your card comes home. Cancelling is a transaction too, so a cancel and a yes can never both win.
   Needs the seventh Firestore rule the owner pastes in (HANDOFF.md §1a); until then sending fails politely and your card is
   handed straight back. Like every cloud feature here it trusts the testers' own games: it is a friendly swap, not a market.
   Saved: state.progress.ttOut = { docId: { give, want, to, name, at } }.
   ============================================================ */
const TT_COLLECTION = 'trades', TT_MAX_OPEN = 3, TT_EXPIRE_MS = 7 * 24 * 60 * 60 * 1000, TT_SPARES_MAX = 40, TT_SETTLE_MS = 3 * 60 * 1000;
let ttSettledAt = 0, ttFetchedAt = 0, ttUi = null;

function ttOutState() { const p = state.progress; if (!p.ttOut || typeof p.ttOut !== 'object') p.ttOut = {}; return p.ttOut; }
function ttSharingOn() { return prefs.shareTrades !== false; }
function ttOnline() { return typeof cloudReady !== 'undefined' && cloudReady && cloudDb && cloudUser; }
// The spares other testers may ask for, rarest first (rides on the presence document).
function ttSpareList() {
  if (!ttSharingOn() || featureLocked('trade')) return null;
  const a = spareAllocation();
  return Object.keys(a).filter(id => a[id] > 0 && cardDef(id) && !cardDef(id).token)
    .sort((x, y) => RELEASE_VALUE[cardDef(y).rarity] - RELEASE_VALUE[cardDef(x).rarity] || (x < y ? -1 : 1)).slice(0, TT_SPARES_MAX);
}
/* The wishlist (build 340) is your starred cards (js/pack-luck.js, Cards -> Sets): they ride on your presence document as `wants`,
   the trade sheet puts the cards each side hopes for first with a ★, and Who's Playing marks a tester's 🔁 when a swap would suit. */
function ttWantList() { return ttSharingOn() && typeof starred === 'function' ? starred() : null; }
function ttMatch(p) {
  const mineWanted = Array.isArray(p.wants) ? (ttSpareList() || []).filter(id => p.wants.includes(id)) : [];
  const theirsWanted = Array.isArray(p.spares) && typeof starred === 'function' ? p.spares.filter(id => starred().includes(id)) : [];
  return { mineWanted, theirsWanted, any: mineWanted.length > 0 || theirsWanted.length > 0 };
}
function ttTake(id) { const i = state.ownedCards.lastIndexOf(id); if (i < 0) return false; state.ownedCards.splice(i, 1); return true; }
function ttReturn(id) { if (cardDef(id)) state.ownedCards.push(id); }

/* ---------- sending ---------- */
async function ttSend(to, give, want) {
  if (featureLocked('trade')) { toast(featureLockText('trade')); return false; }
  if (!ttOnline()) { toast(words('trade.offline')); return false; }
  const out = ttOutState();
  if (Object.keys(out).length >= TT_MAX_OPEN) { toast(words('trade.tooMany', { n: TT_MAX_OPEN })); return false; }
  if (Object.values(out).some(o => o.to === to.id)) { toast(words('trade.already')); return false; }
  if (!cardDef(give) || !cardDef(want) || spareCount(give) < 1) { toast(words('trade.noSpare')); return false; }
  ttTake(give); saveState(); updateHud();                    // held while they decide
  const name = String(to.name || 'A player').slice(0, 16);
  const doc = { from: cloudUser.uid, fromName: String((state.character && state.character.name) || 'A player').slice(0, 16), fromEmoji: String((state.character && state.character.emoji) || '🙂').slice(0, 8),
    to: to.id, toName: name, give, want, status: 'open', at: Date.now() };
  try {
    const ref = await cloudDb.collection(TT_COLLECTION).add(doc);
    out[ref.id] = { give, want, to: to.id, name, at: doc.at };
    saveState(); sfx('claim'); toast(words('trade.sent', { name }));
    return true;
  } catch (e) {
    ttReturn(give); saveState(); updateHud();
    toast(words('trade.failed'));
    return false;
  }
}

/* ---------- your offers: settle what has been answered ---------- */
function ttFinish(id, o, status) {
  const out = ttOutState(); delete out[id];
  if (status === 'accepted') {
    giveSpecialCard(o.want, words('trade.arrivedLabel', { name: o.name }));
    bumpStat('testerTrades', 1);
    sendLetter('ttdone-' + id, { from: o.name, icon: '🔁', subject: words('trade.yesSubject'), body: words('trade.yesBody', { name: o.name, give: cardDef(o.give).name, want: cardDef(o.want).name }), gift: null });
  } else {
    ttReturn(o.give); updateHud();
    toast(words(status === 'declined' ? 'trade.declined' : 'trade.returned', { name: o.name, card: cardDef(o.give).name }));
  }
  saveState();
}
async function ttSettle(force) {
  if (!ttOnline()) return 0;
  if (!force && Date.now() - ttSettledAt < TT_SETTLE_MS) return 0;
  ttSettledAt = Date.now();
  let n = 0;
  for (const [id, o] of Object.entries(ttOutState())) {
    const ref = cloudDb.collection(TT_COLLECTION).doc(id);
    try {
      const snap = await ref.get();
      if (!ttOutState()[id]) continue;                       // settled by a cancel while this was waiting
      if (!snap.exists) { ttFinish(id, o, 'gone'); n++; continue; }
      const st = snap.data().status;
      if (st === 'accepted' || st === 'declined') { ttFinish(id, o, st); ref.delete().catch(() => {}); n++; }
      else if (Date.now() - o.at > TT_EXPIRE_MS) { await ttCancel(id, true); n++; }
    } catch (e) { /* offline or no rule yet: try again later */ }
  }
  return n;
}
// Take an open offer back. A transaction, so if they said yes a moment ago their answer wins and the swap goes through.
async function ttCancel(id, quiet) {
  const o = ttOutState()[id]; if (!o) return;
  if (!ttOnline()) { if (!quiet) toast(words('trade.offline')); return; }
  const ref = cloudDb.collection(TT_COLLECTION).doc(id);
  try {
    const st = await cloudDb.runTransaction(async tx => {
      const s = await tx.get(ref);
      if (!s.exists) return 'gone';
      const v = s.data().status;
      if (v === 'open') { tx.delete(ref); return 'cancelled'; }
      return v;
    });
    if (st !== 'cancelled' && st !== 'gone') ref.delete().catch(() => {});
    ttFinish(id, o, st === 'accepted' ? 'accepted' : 'returned');
  } catch (e) { if (!quiet) toast(words('trade.failed')); }
  if (ttUi) ttRender();
}

/* ---------- offers to you ---------- */
async function ttFetch(force) {
  if (!ttOnline()) return 0;
  if (!force && Date.now() - ttFetchedAt < TT_SETTLE_MS) return 0;
  ttFetchedAt = Date.now();
  let n = 0;
  try {
    const snap = await cloudDb.collection(TT_COLLECTION).where('to', '==', cloudUser.uid).limit(10).get();
    snap.docs.forEach(d => { const t = d.data(); if (t && t.status === 'open' && ttDeliver(d.id, t)) n++; });
  } catch (e) { /* no rule yet, or offline */ }
  return n;
}
function ttDeliver(id, t) {
  if (!cardDef(t.give) || !cardDef(t.want)) return false;
  const name = String(t.fromName || 'A player').slice(0, 16);
  return sendLetter('tt-' + id, { from: name, icon: '🔁', subject: words('trade.offerSubject'), gift: null,
    body: words('trade.offerBody', { name, give: cardDef(t.give).name, want: cardDef(t.want).name }),
    tt: { id, give: t.give, want: t.want, name, done: null } });
}
async function ttAnswer(letterId, yes) {
  const l = mailState().list.find(x => x.id === letterId); if (!l || !l.tt || l.tt.done) return;
  const t = l.tt;
  if (yes && spareCount(t.want) < 1) { toast(words('trade.noSpareToGive', { card: cardDef(t.want).name })); return; }
  if (!ttOnline()) { toast(words('trade.offline')); return; }
  const ref = cloudDb.collection(TT_COLLECTION).doc(t.id);
  try {
    const ok = await cloudDb.runTransaction(async tx => {
      const s = await tx.get(ref);
      if (!s.exists || s.data().status !== 'open') return false;
      tx.update(ref, { status: yes ? 'accepted' : 'declined', answeredAt: Date.now() });
      return true;
    });
    if (!ok) { t.done = 'gone'; toast(words('trade.gone', { name: t.name })); }
    else if (yes) {
      ttTake(t.want); t.done = 'yes';
      giveSpecialCard(t.give, words('trade.arrivedLabel', { name: t.name }));
      bumpStat('testerTrades', 1); sfx('claim');
    } else { t.done = 'no'; sfx('soft'); }
  } catch (e) { toast(words('trade.failed')); }
  saveState();
  if (typeof hoRender === 'function' && typeof hoUi !== 'undefined' && hoUi) hoRender();
}
// The letter's part (js/home-screens.js puts it under the letter's text).
function ttLetterHtml(l) {
  if (!l.tt) return '';
  const g = cardDef(l.tt.give), w = cardDef(l.tt.want);
  const pair = `<div class="tt-pair"><span class="tt-chip rarity-${g.rarity}">${cardArtHtml(g)}<b>${escapeHtml(g.name)}</b><small>${words('trade.theyGive')}</small></span><span class="tt-arrow">⇄</span><span class="tt-chip rarity-${w.rarity}">${cardArtHtml(w)}<b>${escapeHtml(w.name)}</b><small>${words('trade.youGive')}</small></span></div>`;
  if (l.tt.done) return pair + `<div class="ho-got">${words(l.tt.done === 'yes' ? 'trade.saidYes' : l.tt.done === 'no' ? 'trade.saidNo' : 'trade.wasGone')}</div>`;
  return pair + `<div class="ho-reply"><small>${words('trade.answer')}</small><div><button type="button" class="ho-pill" data-ho="ttyes:${l.id}">✅ ${words('trade.yes')}</button><button type="button" class="ho-pill" data-ho="ttno:${l.id}">${words('trade.no')}</button></div></div>`;
}

/* ---------- the trade sheet (Who's Playing -> 🔁) ---------- */
function ttOpen(p) {
  if (featureLocked('trade')) { toast(featureLockText('trade')); return; }
  ttUi = { p: p || null, give: null, want: null };
  showTipOnce('testerTrade');
  document.getElementById('ttOverlay').classList.remove('hidden');
  ttRender(); sfx('nav');
}
function ttClose() { ttUi = null; document.getElementById('ttOverlay').classList.add('hidden'); }
function ttChip(id, sel, extra, wished) {
  const d = cardDef(id);
  return `<button type="button" class="tt-chip rarity-${d.rarity}${sel ? ' sel' : ''}${wished ? ' wished' : ''}" data-tt="${extra}:${id}">${wished ? `<span class="tt-star" title="${words(extra === 'want' ? 'trade.youStarred' : 'trade.theyStarred')}">★</span>` : ''}${cardArtHtml(d)}<b>${escapeHtml(d.name)}</b><small>${wished ? words(extra === 'want' ? 'trade.youStarred' : 'trade.theyStarred') : RARITY_LABEL[d.rarity]}${!wished && extra === 'want' && !ownedCardCounts()[id] ? ` · ${words('trade.newForYou')}` : ''}</small></button>`;
}
function ttRender() {
  const box = document.getElementById('ttCard'); if (!box || !ttUi) return;
  const out = Object.entries(ttOutState()), p = ttUi.p;
  const m = p ? ttMatch(p) : { mineWanted: [], theirsWanted: [] }, first = list => (a, b) => (list.includes(b) ? 1 : 0) - (list.includes(a) ? 1 : 0);   // wished-for cards first
  const mine = (ttSpareList() || []).slice().sort(first(m.mineWanted)), theirs = p && Array.isArray(p.spares) ? p.spares.filter(id => cardDef(id)).slice(0, TT_SPARES_MAX).sort(first(m.theirsWanted)) : [];
  const offers = out.length ? `<h3>${words('trade.yourOffers')}</h3><div class="tt-offers">${out.map(([id, o]) => `<div class="tt-offer"><span>${cardArtHtml(cardDef(o.give))} ⇄ ${cardArtHtml(cardDef(o.want))} <b>${escapeHtml(o.name)}</b><small>${fmtLogTime(o.at)}</small></span><button type="button" class="btn btn-ghost" data-tt="cancel:${id}">${words('trade.cancel')}</button></div>`).join('')}</div>` : '';
  let body = '';
  if (p) {
    const name = escapeHtml(String(p.name || 'A player').slice(0, 16));
    body = `<h2>🔁 ${words('trade.title', { name })}</h2>
      ${m.mineWanted.length || m.theirsWanted.length ? `<p class="tt-match">★ ${words('trade.matchNote')}</p>` : `<p class="tt-hint">${words('trade.starHint')}</p>`}
      <h3>${words('trade.pickGive')}</h3><div class="tt-grid">${mine.length ? mine.map(id => ttChip(id, ttUi.give === id, 'give', m.mineWanted.includes(id))).join('') : `<p class="tt-empty">${words('trade.noSpares')}</p>`}</div>
      <h3>${words('trade.pickWant', { name })}</h3><div class="tt-grid">${theirs.length ? theirs.map(id => ttChip(id, ttUi.want === id, 'want', m.theirsWanted.includes(id))).join('') : `<p class="tt-empty">${words('trade.theyHaveNone', { name })}</p>`}</div>`;
  } else body = `<h2>🔁 ${words('trade.titleMine')}</h2>${out.length ? '' : `<p class="tt-empty">${words('trade.noneOut')}</p>`}`;
  const ready = p && ttUi.give && ttUi.want;
  box.innerHTML = `${body}${offers}<div class="controls"><button type="button" class="btn btn-ghost" data-tt="close:">${words('trade.close')}</button>${p ? `<button type="button" class="btn" data-tt="send:"${ready ? '' : ' disabled'}>${words('trade.send')}</button>` : ''}</div>`;
  onAll(box, '[data-tt]', b => {
    const [k, v] = b.dataset.tt.split(/:(.*)/s);
    if (k === 'give' || k === 'want') { ttUi[k] = ttUi[k] === v ? null : v; sfx('tap'); ttRender(); }
    else if (k === 'cancel') ttCancel(v);
    else if (k === 'close') ttClose();
    else if (k === 'send') ttSend(ttUi.p, ttUi.give, ttUi.want).then(ok => { if (ok && ttUi) { ttUi.give = ttUi.want = null; ttRender(); } });
  });
}
document.getElementById('ttOverlay').addEventListener('click', e => { if (e.target.id === 'ttOverlay') ttClose(); });
setInterval(() => { if (!document.hidden) { ttFetch(); ttSettle(); } }, 60 * 1000);
