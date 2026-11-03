/* ============================================================
   MATCH REPLAYS AND BATTLE STATS (build 332)
   Replays. Every batch of events the battle screen animates passes through btFlush (js/battle-ui.js), which hands it to
   replayNote: one frame per batch, holding what happened in words and the table after it (both boards, Calm, your hand,
   how many cards they hold). That is a picture of each move, not a re-simulation, so it stays right whatever charms,
   companions, weather or twists touched the match. recordBattle (js/journal-history.js) keeps the last REPLAY_MAX of them
   in their own localStorage key ('tr-replays'), never in the save, so the cloud backup stays small; the log entry keeps
   only the replay's id (rid). Journal → Battles → a match → "Watch replay" opens #replayOverlay: step, play / pause, speed.
   Stats. The same frames say which cards you and they played. finishReplayStats adds them up in state.progress.cardStats
   ({ id: [games, wins] }) and state.progress.famStats ({ mine: { fam: [w, l] }, vs: { fam: [w, l] } }, by the family most
   of the cards came from), shown at the top of Journal → Battles (renderBattleInsights).
   ============================================================ */
const REPLAY_MAX = 10, REPLAY_FRAMES_MAX = 400, REPLAY_KEY = 'tr-replays';

function replayCardLabel(c) { const d = c && cardDef(c.id); return d ? `${d.icon} ${d.name}` : '?'; }
function replaySide(who) { return who === 0 ? words('replay.you') : (battle && battle.npc ? battle.npc.name : words('replay.them')); }
// One event in words, or '' for the ones nobody needs to read (draws, readying, buffs).
function replayLine(G, e) {
  const who = replaySide(e.who), find = uid => G.p.flatMap(p => p.board.concat(p.hand)).find(c => c.uid === uid);
  switch (e.type) {
    case 'turn': return words('replay.turn', { who });
    case 'play': return words('replay.play', { who, card: replayCardLabel(e.card) });
    case 'spell': return words('replay.spell', { who, card: replayCardLabel(e.card) });
    case 'attack': return e.target && e.target.kind === 'card' ? words('replay.attack', { card: replayCardLabel(e.attacker), target: replayCardLabel(find(e.target.uid)) }) : words('replay.attackCalm', { card: replayCardLabel(e.attacker) });
    case 'faint': return words('replay.faint', { card: replayCardLabel(e.card) });
    case 'spirit': return e.delta < 0 ? words('replay.hurt', { who: replaySide(e.who), n: -e.delta }) : e.delta > 0 ? words('replay.heal', { who: replaySide(e.who), n: e.delta }) : '';
    case 'knack': return words('replay.knack', { who });
    case 'fate': return words('replay.fate', { who });
    case 'end': return e.winner === 0 ? words('replay.won') : e.winner === 1 ? words('replay.lost', { who: replaySide(1) }) : '';
  }
  return '';
}
// The table right now, small: board cards as [id, power, hp, shield], your hand as ids.
function replaySnap(G) {
  const board = p => p.board.map(c => [c.id, c.power || 0, c.hp || 0, c.shield ? 1 : 0]);
  return { t: Math.ceil((G.turn || 0) / 2) + 1, w: G.active, s: [Math.max(0, G.p[0].spirit), Math.max(0, G.p[1].spirit)], b: [board(G.p[0]), board(G.p[1])], h: G.p[0].hand.map(c => c.id), hc: G.p[1].hand.length };
}
function replayBegin() {
  if (!battle || !battle.G) return;
  battle.rec = { frames: [Object.assign({ l: [words('replay.start')] }, replaySnap(battle.G))], mine: [], theirs: [] };
}
// Called by btFlush with each batch of events, before they are animated.
function replayNote(G, evs) {
  const r = battle && battle.G === G && battle.rec; if (!r || !evs.length) return;
  evs.forEach(e => { if ((e.type === 'play' || e.type === 'spell') && e.card) (e.who === 0 ? r.mine : r.theirs).push(e.card.id); });
  if (r.frames.length >= REPLAY_FRAMES_MAX) return;
  const l = evs.map(e => replayLine(G, e)).filter(Boolean);
  if (!l.length) return;
  r.frames.push(Object.assign({ l }, replaySnap(G)));
}

/* ---------- keeping them ---------- */
function replaysAll() { try { const v = JSON.parse(localStorage.getItem(REPLAY_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
function replayGet(id) { return replaysAll().find(r => r.id === id) || null; }
// From recordBattle: returns the new replay's id for the log entry, or null when there is nothing to keep.
function replaySave(meta) {
  const r = battle && battle.rec; if (!r || r.frames.length < 2) return null;
  const rep = Object.assign({ id: 'r' + Date.now().toString(36), at: Date.now(), frames: r.frames }, meta);
  const list = [rep].concat(replaysAll()).slice(0, REPLAY_MAX);
  for (let n = list.length; n > 0; n--) {   // a full localStorage drops the oldest replays first rather than failing the save
    try { localStorage.setItem(REPLAY_KEY, JSON.stringify(list.slice(0, n))); return rep.id; } catch (e) { /* try with fewer */ }
  }
  return null;
}

/* ---------- stats ---------- */
function replayMainFam(ids) {
  const n = {}; ids.forEach(id => { const f = CARD_FAMILY[BattleEngine.baseIdOf(id)]; if (f) n[f] = (n[f] || 0) + 1; });
  return Object.keys(n).sort((a, b) => n[b] - n[a])[0] || null;
}
function finishReplayStats(won) {
  const r = battle && battle.rec; if (!r) return {};
  const p = state.progress;
  if (!p.cardStats || typeof p.cardStats !== 'object') p.cardStats = {};
  if (!p.famStats || typeof p.famStats !== 'object') p.famStats = { mine: {}, vs: {} };
  [...new Set(r.mine.map(id => BattleEngine.baseIdOf(id)))].forEach(id => { const s = p.cardStats[id] || (p.cardStats[id] = [0, 0]); s[0]++; if (won) s[1]++; });
  const mine = replayMainFam(state.deck), vs = replayMainFam(r.theirs);
  const add = (o, f) => { if (!f) return; const s = o[f] || (o[f] = [0, 0]); s[won ? 0 : 1]++; };
  add(p.famStats.mine, mine); add(p.famStats.vs, vs);
  return { mineFam: mine, oppFam: vs };
}
const pct = (w, n) => n ? Math.round(w / n * 100) : 0;
function renderBattleInsights() {
  const box = document.getElementById('battleInsights'); if (!box) return;
  const p = state.progress, cs = p.cardStats || {}, fs = p.famStats || { mine: {}, vs: {} };
  const cards = Object.keys(cs).filter(id => cardDef(id)).map(id => ({ id, n: cs[id][0], w: cs[id][1] }));
  if (!cards.length) { box.innerHTML = ''; box.classList.add('hidden'); return; }
  box.classList.remove('hidden');
  const most = cards.slice().sort((a, b) => b.n - a.n).slice(0, 5);
  const winners = cards.filter(c => c.n >= 3).sort((a, b) => b.w / b.n - a.w / a.n || b.n - a.n).slice(0, 3);
  const famRow = (o, label) => {
    const rows = Object.keys(o).filter(f => FAMILIES[f]).map(f => ({ f, w: o[f][0], n: o[f][0] + o[f][1] })).filter(x => x.n);
    if (!rows.length) return '';
    return `<div class="bi-sub">${label}</div><div class="bi-fams">${rows.sort((a, b) => b.n - a.n).map(x => `<span class="bi-fam" title="${x.w} of ${x.n}"><b>${FAMILIES[x.f].icon} ${escapeHtml(FAMILIES[x.f].name)}</b> ${pct(x.w, x.n)}%</span>`).join('')}</div>`;
  };
  const vs = Object.keys(fs.vs).filter(f => FAMILIES[f]).map(f => ({ f, w: fs.vs[f][0], n: fs.vs[f][0] + fs.vs[f][1] })).filter(x => x.n >= 3).sort((a, b) => a.w / a.n - b.w / b.n)[0];
  const card = c => { const d = cardDef(c.id); return `<div class="bi-card"><span>${d.icon}</span><b>${escapeHtml(d.name)}</b><small>${words('stats.cardLine', { games: c.n === 1 ? words('stats.oneGame') : words('stats.games', { n: c.n }), pct: pct(c.w, c.n) })}</small></div>`; };
  box.innerHTML = `<div class="jsoft jbt-head"><span>${words('stats.title')}</span></div>
    <div class="bi-sub">${words('stats.mostPlayed')}</div><div class="bi-cards">${most.map(card).join('')}</div>
    ${winners.length ? `<div class="bi-sub">${words('stats.bestWinners')}</div><div class="bi-cards">${winners.map(card).join('')}</div>` : ''}
    ${famRow(fs.mine, words('stats.withFamily'))}${famRow(fs.vs, words('stats.againstFamily'))}
    ${vs ? `<div class="jsoft bi-tip">${words('stats.toughest', { fam: `${FAMILIES[vs.f].icon} ${FAMILIES[vs.f].name}`, pct: pct(vs.w, vs.n) })}</div>` : ''}`;
}

/* ---------- the viewer ---------- */
let replayView = null;   // { rep, i, timer, speed }
function replayCardHtml(c) {
  const d = cardDef(c[0]); if (!d) return '';
  return `<div class="rp-card${c[3] ? ' shield' : ''}" title="${escapeHtml(d.name)}"><span class="rp-ico">${d.icon}</span><span class="rp-name">${escapeHtml(d.name)}</span>${d.spell ? '' : `<span class="rp-stats">${c[1]}/${c[2]}</span>`}</div>`;
}
function replayDraw() {
  const v = replayView; if (!v) return;
  const f = v.rep.frames[v.i], n = v.rep.frames.length;
  const el = id => document.getElementById(id);
  el('rpTitle').textContent = v.rep.pov ? words('chal.replayTitle', { name: v.rep.pov }) : words('replay.title', { name: v.rep.name });
  el('rpSub').textContent = `${v.rep.won ? words('replay.subWon') : v.rep.yielded ? words('replay.subYield') : words('replay.subLost')} · ${fmtLogTime(v.rep.at)}`;
  el('rpOpp').innerHTML = `<span class="rp-who">${escapeHtml(v.rep.icon || '')} ${escapeHtml(v.rep.name)}</span><span class="rp-calm">♥ ${f.s[1]}</span><span class="rp-hand">🂠 ${f.hc}</span>`;
  el('rpYou').innerHTML = `<span class="rp-who">${escapeHtml(v.rep.pov || words('replay.you'))}</span><span class="rp-calm">♥ ${f.s[0]}</span>`;
  el('rpOppBoard').innerHTML = f.b[1].map(replayCardHtml).join('') || `<span class="rp-empty">${words('replay.emptyBoard')}</span>`;
  el('rpYouBoard').innerHTML = f.b[0].map(replayCardHtml).join('') || `<span class="rp-empty">${words('replay.emptyBoard')}</span>`;
  el('rpHand').innerHTML = f.h.map(id => { const d = cardDef(id); return d ? `<span class="rp-hcard" title="${escapeHtml(d.name)}">${d.icon}</span>` : ''; }).join('');
  const pov = v.rep.pov, you = words('replay.you');   // a replay a tester sent you: their "You" is them (js/challenges.js)
  el('rpLines').innerHTML = f.l.map(t => `<div>${escapeHtml(pov && t.startsWith(you + ' ') ? pov + t.slice(you.length) : t)}</div>`).join('');
  el('rpStep').textContent = words('replay.step', { i: v.i + 1, n, turn: f.t });
  el('rpSlider').max = n - 1; el('rpSlider').value = v.i;
  el('rpPlay').textContent = v.timer ? '⏸' : '▶';
  el('rpPlay').setAttribute('aria-label', v.timer ? words('replay.pause') : words('replay.playBtn'));
  el('rpSpeed').textContent = v.speed === 2 ? '2×' : '1×';
  el('rpPrev').disabled = v.i === 0; el('rpNext').disabled = v.i >= n - 1;
}
function replayGo(i) { const v = replayView; if (!v) return; v.i = Math.max(0, Math.min(v.rep.frames.length - 1, i)); if (v.i >= v.rep.frames.length - 1) replayStop(); replayDraw(); }
function replayStop() { const v = replayView; if (v && v.timer) { clearInterval(v.timer); v.timer = 0; } }
function replayToggle() {
  const v = replayView; if (!v) return;
  if (v.timer) { replayStop(); replayDraw(); return; }
  if (v.i >= v.rep.frames.length - 1) v.i = 0;
  v.timer = setInterval(() => replayGo(v.i + 1), v.speed === 2 ? 600 : 1200); replayDraw();
}
function openReplay(id) {
  const rep = replayGet(id); if (!rep) { toast(words('replay.gone')); return; }
  replayView = { rep, i: 0, timer: 0, speed: 1 };
  document.getElementById('replayOverlay').classList.remove('hidden'); sfx('tap');
  replayDraw();
}
function closeReplay() { replayStop(); replayView = null; document.getElementById('replayOverlay').classList.add('hidden'); }
document.getElementById('rpClose').addEventListener('click', closeReplay);
document.getElementById('rpPrev').addEventListener('click', () => { replayStop(); replayGo(replayView.i - 1); sfx('tap'); });
document.getElementById('rpNext').addEventListener('click', () => { replayStop(); replayGo(replayView.i + 1); sfx('tap'); });
document.getElementById('rpPlay').addEventListener('click', () => { replayToggle(); sfx('tap'); });
document.getElementById('rpSpeed').addEventListener('click', () => { const v = replayView; if (!v) return; v.speed = v.speed === 2 ? 1 : 2; if (v.timer) { replayStop(); replayToggle(); } else replayDraw(); sfx('tap'); });
document.getElementById('rpSlider').addEventListener('input', e => { replayStop(); replayGo(+e.target.value); });
