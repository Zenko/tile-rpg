/* ============================================================
   TURN-BASED BATTLE: the rules live in BattleEngine; this part draws them and routes taps.
   You are always seat 0 (you go first); the neighbor is seat 1.
   ============================================================ */
let battleToken = 0;
const btWait = ms => new Promise(r => setTimeout(r, prefs.fast ? ms * 0.45 : ms));   // "Fast battles" trims every pause
const btToast = m => toast(m, true);
const btGet = id => document.getElementById(id);
const btAlive = token => battle && battle.token === token && !battle.ended;

function startBattle(opponent) {
  // Never let a damaged card id reach the engine: drop anything that is not a real card first.
  const cleaned = state.deck.filter(id => !!cardDef(id));
  if (cleaned.length !== state.deck.length) { state.deck = cleaned; saveState(); }
  if (!opponent.puzzle && state.deck.length < DECK_SIZE) {
    townLog.textContent = `You need a full ${DECK_SIZE}-card deck before battling. Visit the Deck tab.`;
    toast(`Fill your ${DECK_SIZE}-card deck first`);
    return;
  }
  const isBoss = !!opponent.isBoss;
  // Some opponents (deep cellar floors, the rival, a neighbor's signature deck) bring their own difficulty.
  const profile = Object.assign({}, opponent.profile || opponentProfile(isBoss));
  const weather = weatherNow(), fx = weatherFx();
  if (isBoss && fx.bossSpirit) profile.spirit += fx.bossSpirit;
  const companionSpirit = hasPerk('spirit') && !opponent.puzzle;
  // Plain neighbors and district bosses get a fresh deck each fight, scaled to how many wins you have (their stored deck
  // predates enhanced and unique foe cards). Every other kind of opponent brings its own deck.
  const plainFoe = !opponent.dungeon && !opponent.cup && !opponent.challenge && !opponent.signature && !opponent.isRival && !opponent.puzzle;
  const oppDeck = plainFoe ? buildDeckForOpponent(DECK_SIZE, isBoss, null, opponent.name)
    : (Array.isArray(opponent.deck) && opponent.deck.length === DECK_SIZE) ? opponent.deck : buildDeckForOpponent(DECK_SIZE, isBoss);
  const twistKind = bossTwistFor(opponent);
  let G;
  if (opponent.puzzle) {
    // A fixed board, already mid-turn. Unlike every other JSON.parse in the codebase this one had no
    // try/catch - a corrupted stored snapshot (a botched migration, a localStorage write cut short) would
    // throw here and break the puzzle rematch permanently for that save, since the bad string persists
    // across reloads. Clear it so puzzleState() rebuilds a fresh one (next day; matches the existing
    // "no puzzle today" bail-out in startPuzzle()) instead of crashing every time it's opened.
    try { G = JSON.parse(opponent.puzzle); G.rng = Math.random; G.events = []; }
    catch (e) {
      if (state.progress.puzzle) state.progress.puzzle.snap = null;
      saveState();
      toast("That puzzle board didn't load right");
      return;
    }
  }
  else {
    G = BattleEngine.newGame(state.deck.slice(), oppDeck.slice(), Math.random, { spirit: [BattleEngine.RULES.spirit, profile.spirit], mods: { swiftBonus: fx.swiftBonus || 0 },
      twist: twistKind ? { side: 1, kind: twistKind } : null, startSpirit: opponent.startSpirit ? [opponent.startSpirit, null] : null });
    BattleEngine.startTurn(G);
  }
  if (companionSpirit) BattleEngine.boost(G, 0, { spirit: 2 });      // a Guard-type companion stands with you
  if (!opponent.puzzle) {
    const sp = cardBonus('startSpirit'), dr = cardBonus('startDraw');     // charms and completed sets
    if (sp || dr) BattleEngine.boost(G, 0, { spirit: sp, draw: dr });
    // ★★★ mastered cards arrive a little tougher
    G.p[0].deck.concat(G.p[0].hand).forEach(c => { if (!c.spell && masteryRank(c.id) >= 3) { c.grit++; c.hp++; } });
  }
  G.events.length = 0;

  inBattle = true;
  battle = { npc: opponent, isBoss, G, profile, weather, sel: null, busy: false, ended: false, rewarded: false, yieldArmed: false, token: ++battleToken, startedAt: Date.now() };
  const chip = weather === 'storm' ? '⛈️ Swift +1 power' : weather === 'snow' ? (isBoss ? '❄️ Boss +2 Spirit · richer prize' : '❄️ Richer prize') : '';
  const tw = twistKind ? BattleEngine.TWISTS[twistKind] : null;
  btGet('btWeather').textContent = opponent.puzzle ? '🧩 Ending your turn resets the board' : [tw ? `${tw.icon} ${tw.text}` : '', chip, plainFoe ? '✦ Seasoned deck: unique & enhanced cards' : ''].filter(Boolean).join(' · ');
  battle.puzzle = !!opponent.puzzle;

  townPanel.classList.add('hidden');
  sceneView.classList.add('hidden'); document.body.classList.remove('in-scene'); inScene = false;
  document.getElementById('bottomNav').style.display = 'none';
  document.body.classList.add('in-battle');
  battleView.classList.remove('hidden');
  setupBattleBackdrop(opponent, isBoss);
  btGet('btOppName').textContent = opponent.name;
  btGet('btYouName').textContent = state.character.name || 'You';
  btGet('btOppPortrait').textContent = opponentPortrait(opponent);
  applyAvatarStyle(btGet('btYouPortrait'), state.character);
  btGet('btYouPortrait').textContent = state.character.emoji;
  // Your half of the screen carries your avatar's color; the opponent's half always stays the plain,
  // district-driven look, so the two sides read as clearly different - yours personalized, theirs neutral.
  battleView.style.setProperty('--side-accent', state.character.color || 'var(--water-glow)');
  btSetMsg(isBoss ? `${opponent.name} rises to meet you` : 'Your turn');
  btHideTip();
  btRender();
  if (isBoss) { sfx('rare'); buzz(HAP.win); }
  if (battle.puzzle) { btSetMsg('🧩 Win this turn!'); btRender(); return; }   // no mulligan, no snack: the board is the puzzle
  battle.pendingHelp = !state.progress.seenBattleHelp;
  if (battle.pendingHelp) { state.progress.seenBattleHelp = true; saveState(); }
  const swapBtn = btGet('mulliganSwapBtn'); swapBtn.disabled = false; swapBtn.textContent = 'Draw new hand';
  btRenderMulliganHand();
  renderSnackRow();
  btGet('mulliganOverlay').classList.remove('hidden');
}
// Dishes that help in battle can be eaten on the keep-this-hand screen, one per match.
function renderSnackRow() {
  const row = btGet('snackRow'), list = battle.snack ? [] : snackDishes();
  row.classList.toggle('hidden', !list.length && !battle.snack);
  if (battle.snack) { const r = recipeDef(battle.snack); const fx = r.desc.replace(/^Eat before a match: /, ''); row.innerHTML = `<span class="snack-done">${r.icon} You ate the ${r.name}: ${fx.charAt(0).toLowerCase() + fx.slice(1)}</span>`; return; }
  row.innerHTML = '<span class="snack-label">🍽️ Snack first?</span>' + list.map(r =>
    `<button class="snack-btn" data-snack="${r.id}">${r.icon} ${r.name} <small>${[r.battle.spirit ? `+${r.battle.spirit}♥` : '', r.battle.draw ? `+${r.battle.draw}🃏` : ''].filter(Boolean).join(' ')} · ${dishCount(r.id)}</small></button>`).join('');
  row.querySelectorAll('[data-snack]').forEach(b => b.addEventListener('click', () => eatSnack(b.dataset.snack)));
}
function eatSnack(id) {
  const r = recipeDef(id);
  if (!battle || battle.snack || !r || !r.battle || dishCount(id) <= 0) return;
  dishes()[id] = dishCount(id) - 1;
  battle.snack = id;
  BattleEngine.boost(battle.G, 0, r.battle);
  bumpStat('snacksEaten', 1); saveState();
  sfx('claim'); buzz(HAP.found);
  btRender(); btRenderMulliganHand(); renderSnackRow();
  // The spirit bar alone doesn't make a max-spirit boost visible (it raises current and max together,
  // so a full bar still looks full) - this floater is the immediate "yes, that did something" moment.
  const bonusText = [r.battle.spirit ? `+${r.battle.spirit} Max Spirit` : '', r.battle.draw ? `+${r.battle.draw} Card` : ''].filter(Boolean).join(' · ');
  if (bonusText) btFloater(btGet('btYouBar'), bonusText, 'heal');
}
// The one persistent, whole-match reminder that a snack buff is active - called from btRender() so it
// always reflects battle.snack, including resetting to hidden on a fresh battle where it's unset.
function btSyncSnackBadge() {
  const badge = btGet('btYouSnackBadge');
  if (!badge || !battle) return;
  if (battle.snack) {
    const r = recipeDef(battle.snack);
    badge.classList.remove('hidden');
    badge.textContent = r ? r.icon : '🍽️';
    badge.title = r ? `${r.name}: ${r.desc.replace(/^Eat before a match: /, '')}` : 'Snack eaten';
  } else {
    badge.classList.add('hidden');
  }
}

// Shows the actual opening hand (not just a blind yes/no) so the choice to keep or redraw is an informed one.
function btRenderMulliganHand() {
  const box = btGet('mulliganHand');
  box.innerHTML = '';
  battle.G.p[0].hand.forEach(c => {
    const w = document.createElement('div'); w.className = 'hcard';
    w.appendChild(btCardEl(c, '', true));
    box.appendChild(w);
  });
}

function btCloseMulligan() {
  btGet('mulliganOverlay').classList.add('hidden');
  if (battle && battle.pendingHelp) { battle.pendingHelp = false; btShowHelp(); }
}

// Colors the battle backdrop from the current district's own biome palette (read straight off the live town
// element, so it can never drift out of sync with the town's own look), and dims/tints it further for a boss.
function setupBattleBackdrop(opponent, isBoss) {
  const bv = document.getElementById('battleView');
  bv.classList.toggle('bt-boss', isBoss);
  const districtKey = (opponent.dungeon && opponent.dungeon.district) || state.currentDistrict || 'square';
  const biome = BIOME_OF[districtKey] || 'meadow';
  bv.dataset.btBiome = biome;
  // Borrow the district's real palette from the town view's own computed styles, so battle backgrounds
  // always match the town instead of keeping a second, easily-stale copy of the same colors.
  const probe = document.createElement('div');
  probe.className = 'town-view'; probe.dataset.biome = biome; probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;width:0;height:0;';
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const ground = cs.getPropertyValue('--ground').trim() || '#2c3a2c';
  const ground2 = cs.getPropertyValue('--ground2').trim() || ground;
  const roof = cs.getPropertyValue('--roof').trim() || '#5c4433';
  const leaf = cs.getPropertyValue('--leaf2').trim() || '#3c8058';
  probe.remove();
  bv.style.setProperty('--bt-sky-top', ground2);
  bv.style.setProperty('--bt-sky-bot', ground);
  bv.style.setProperty('--bt-hill', ground);
  bv.style.setProperty('--bt-roof', biome === 'orchard' ? leaf : roof);
}

/* ---------------- drawing ---------------- */
function btSetMsg(t) { btGet('btMsg').textContent = t; }

// mine: the card belongs to the player, so it wears their card sleeve (bought at the Tinker's stall).
function btCardEl(c, cls, mine) {
  const def = cardDef(c.id);
  const el = document.createElement('div');
  el.className = `card rarity-${def.rarity} ${cls || ''}` + (c.spell ? ' spell' : '');
  el.dataset.uid = c.uid;
  el.innerHTML = c.spell
    ? `<div class="cost">${c.cost}</div><div class="icon">${cardArtHtml(def)}</div><div class="nm">${def.name}</div><div class="spell-tag">✨ Spell</div>`
    : `<div class="cost">${c.cost}</div><div class="icon">${cardArtHtml(def)}</div><div class="nm">${def.name}</div>
    <div class="kws">${c.kw.map(k => `<span>${KW[k].icon}</span>`).join('')}</div>
    <div class="stats"><span class="pw">⚔${c.power}</span><span class="hp ${c.hp < c.grit ? 'hurt' : ''}">♥${c.hp}</span></div>`;
  const sleeve = mine ? currentSleeve() : null;
  const mr = mine ? masteryRank(c.id) : 0;
  if (mine && hasFoil(c.id)) el.classList.add('foil');
  if (mr) { el.classList.add('mastered', 'mastery-' + mr); el.insertAdjacentHTML('beforeend', `<span class="mastery-stars">${'★'.repeat(mr)}</span>`); }
  if (sleeve && sleeve.id) { el.classList.add('sleeved', 'sleeve-' + sleeve.id); el.insertAdjacentHTML('afterbegin', `<span class="sleeve-fx"></span><span class="sleeve-mark">${sleeve.icon}</span>`); }
  if (c.shield) el.classList.add('shielded');
  // opponent-only extras: unique foe cards, and enhanced (crafted "+") versions of ordinary cards
  if (!mine && def.foe) { el.classList.add('foe-card'); el.insertAdjacentHTML('beforeend', '<span class="badge foe">✦</span>'); }
  else if (!mine && def.crafted) el.classList.add('enhanced-card');
  if (c.kw.includes('guard')) { el.classList.add('guarding'); el.insertAdjacentHTML('beforeend', '<span class="badge grd">🛡️</span>'); }
  if (/(^| )sleep( |$)/.test(cls || '')) el.insertAdjacentHTML('beforeend', '<span class="badge zz">💤</span>');
  return el;
}

function btFloater(el, text, kind) {
  if (!el) return;
  const f = document.createElement('div');
  f.className = 'floater ' + kind; f.textContent = text;
  el.appendChild(f); setTimeout(() => f.remove(), 1000);
}

// A small burst of sparks flying outward from an impact point, for extra punch on hits and knockouts.
function btImpact(el, n) {
  if (!el) return;
  for (let i = 0; i < (n || 4); i++) {
    const s = document.createElement('span');
    s.className = 'impact-spark'; s.textContent = '✦';
    const ang = Math.random() * Math.PI * 2, dist = 16 + Math.random() * 16;
    s.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
    s.style.setProperty('--dy', Math.sin(ang) * dist + 'px');
    s.style.animationDelay = (Math.random() * 0.08) + 's';
    el.appendChild(s); setTimeout(() => s.remove(), 650);
  }
}

function btRenderBars() {
  const G = battle.G;
  [['You', 0], ['Opp', 1]].forEach(([k, i]) => {
    const p = G.p[i], pct = Math.max(0, p.spirit / p.maxSpirit * 100);
    const sp = btGet('bt' + k + 'Spirit');
    sp.querySelector('.fill').style.width = pct + '%';
    sp.querySelector('.num').textContent = `${Math.max(0, p.spirit)} / ${p.maxSpirit}`;
    sp.classList.toggle('low', p.spirit <= Math.ceil(p.maxSpirit * 0.3));
    btGet('bt' + k + 'Deck').textContent = `🃏 ${p.deck.length}`;
    btGet('bt' + k + 'Bar').classList.toggle('turn', G.active === i && !G.over);
  });
}

function btRenderGems() {
  const me = battle.G.p[0], box = btGet('btGems');
  box.innerHTML = '';
  for (let i = 0; i < BattleEngine.RULES.ecap; i++) {
    const g = document.createElement('div');
    g.className = 'gem' + (i < me.energy ? ' on' : (i < me.maxEnergy ? ' spent' : ''));
    box.appendChild(g);
  }
}

function btRenderBoards(entering) {
  const G = battle.G, sel = battle.sel;
  // An aimed spell can hit any enemy card - Guard only protects against attacks.
  const targets = sel && sel.kind === 'attack' ? BattleEngine.legalTargets(G, 0, sel.uid)
    : sel && sel.kind === 'spell' ? G.p[1].board.map(c => ({ kind: 'card', uid: c.uid })) : [];
  const tCards = new Set(targets.filter(t => t.kind === 'card').map(t => t.uid));
  const tFace = targets.some(t => t.kind === 'spirit');
  [['Opp', G.p[1]], ['You', G.p[0]]].forEach(([k, pl]) => {
    const box = btGet('bt' + k + 'Board');
    box.innerHTML = '';
    for (let i = 0; i < BattleEngine.RULES.board; i++) {
      const slot = document.createElement('div'); slot.className = 'slot';
      const c = pl.board[i];
      if (c) {
        const mine = k === 'You', canAct = mine && G.active === 0 && c.ready && c.attacks === 0 && !G.over && !battle.busy;
        const cls = (entering === c.uid ? 'enter ' : '') + (mine && !canAct ? 'exhausted ' : '') + (mine && !c.ready ? 'sleep ' : '') +
                    (canAct ? 'can-act ' : '') + (sel && sel.uid === c.uid ? 'selected ' : '') + (!mine && tCards.has(c.uid) ? 'targetable' : '');
        const el = btCardEl(c, cls, mine);
        el.addEventListener('click', () => btOnBoardCard(k === 'You' ? 'you' : 'opp', c));
        slot.appendChild(el);
      } else if (k === 'You' && sel && sel.kind === 'play' && !btSelIsSpell()) slot.classList.add('drop');
      box.appendChild(slot);
    }
  });
  btGet('btOppBar').classList.toggle('target-glow', tFace);
}

function btRenderHand(drawnUid) {
  const G = battle.G, me = G.p[0], box = btGet('btHand');
  box.innerHTML = '';
  me.hand.forEach(c => {
    const w = document.createElement('div'); w.className = 'hcard';
    const ok = !battle.busy && BattleEngine.canPlay(G, 0, c.uid).ok;
    const el = btCardEl(c, (ok ? 'playable ' : 'unaffordable ') + (battle.sel && battle.sel.uid === c.uid ? 'selected ' : '') + (drawnUid === c.uid ? 'draw' : ''), true);
    el.addEventListener('click', () => btOnHandCard(c));
    w.appendChild(el); box.appendChild(w);
  });
  const endBtn = btGet('btEnd');
  endBtn.disabled = G.active !== 0 || G.over || battle.busy;
  const anyMove = G.active === 0 && (me.hand.some(c => BattleEngine.canPlay(G, 0, c.uid).ok) || me.board.some(c => c.ready && c.attacks === 0));
  const yourTurn = G.active === 0 && !battle.busy && !G.over;
  endBtn.classList.toggle('turn-active', yourTurn);
  endBtn.classList.toggle('pulse', yourTurn && !anyMove);
}

function btCoach() {
  const el = btGet('btCoach'), G = battle.G;
  if (G.over || G.active !== 0 || battle.busy) { el.textContent = ''; return; }
  const me = G.p[0], op = G.p[1], g = BattleEngine.guards(op).length;
  const ready = me.board.filter(c => c.ready && c.attacks === 0);
  const playable = me.hand.filter(c => BattleEngine.canPlay(G, 0, c.uid).ok);
  let t;
  if (battle.sel && battle.sel.kind === 'spell') t = 'Tap a glowing enemy card to aim your spell.';
  else if (playable.length) t = 'You have energy to spend. Tap a card to read it, tap again to play it.';
  else if (ready.length && g) t = 'An enemy 🛡️ Guard blocks the way. Attack it first.';
  else if (ready.length) t = ready.some(a => op.board.some(c => !c.shield && a.power >= c.hp))
    ? 'One of your cards can defeat an enemy card. Removing their cards is often better than hitting Spirit.'
    : 'Tap a glowing card, then pick a target.';
  else if (me.board.some(c => !c.ready)) t = 'New cards 💤 can attack next turn. End your turn when you are ready.';
  else t = 'Nothing left to do. End your turn.';
  el.textContent = t;
}

function btRender(o) { o = o || {}; btRenderBars(); btSyncSnackBadge(); btRenderGems(); btRenderBoards(o.entering); btRenderHand(o.drawn); btCoach(); }

/* ---------------- card info sheet ---------------- */
function btShowTip(c, hint) {
  const def = cardDef(c.id), tip = btGet('btTip');
  const body = c.spell
    ? `<div class="kw">✨ <b>Spell.</b> ${spellText(def)}</div><div class="kw" style="color:var(--ink-soft)">Resolves at once and does not take a board slot.</div>`
    : `<div class="kw">⚔ <b>${c.power}</b> power &nbsp; ♥ <b>${c.hp}</b>${c.hp < c.grit ? ' / ' + c.grit : ''} health</div>
    ${c.kw.map(k => `<div class="kw">${KW[k].icon} <b>${KW[k].name}.</b> ${KW[k].text}</div>`).join('') || '<div class="kw" style="color:var(--ink-soft)">No keywords.</div>'}`;
  tip.innerHTML = `<div class="t-h"><span class="ic">${cardArtHtml(def)}</span><b>${def.name}</b><small>${RARITY_LABEL[def.rarity]} · costs ${c.cost}</small></div>
    ${body}
    ${hint ? `<div class="hint">${hint}</div>` : ''}`;
  tip.classList.add('show'); battleView.classList.add('tip-open');
  btPlaceTip();
}
// The sheet sits just above your bar (measured, not hard-coded), so the ? and flag buttons are never underneath it.
function btPlaceTip() {
  const view = battleView.getBoundingClientRect(), bar = btGet('btYouBar').getBoundingClientRect();
  btGet('btTip').style.bottom = Math.max(0, view.bottom - bar.top + 6) + 'px';
}
function btHideTip() { btGet('btTip').classList.remove('show'); battleView.classList.remove('tip-open'); }

/* ---------------- input ---------------- */
function btSelIsSpell() {
  const s = battle && battle.sel; if (!s) return false;
  const c = battle.G.p[0].hand.find(x => x.uid === s.uid);
  return !!(c && c.spell);
}
function btOnHandCard(c) {
  if (!battle || battle.busy || battle.G.over || battle.G.active !== 0) return;
  const chk = BattleEngine.canPlay(battle.G, 0, c.uid);
  if (battle.sel && battle.sel.kind === 'spell' && battle.sel.uid === c.uid) {      // tapping an aimed spell again puts it away
    battle.sel = null; btHideTip(); btRender(); return;
  }
  if (battle.sel && battle.sel.kind === 'play' && battle.sel.uid === c.uid) {       // a second tap plays it
    if (!chk.ok) { btToast(chk.why); return; }
    if (BattleEngine.spellNeedsTarget(c)) {                                          // aimed spells wait for a target
      battle.sel = { kind: 'spell', uid: c.uid };
      btShowTip(c, 'Now tap a glowing enemy card to aim it.');
      btRender(); return;
    }
    battle.sel = null; btHideTip(); btDoPlay(c.uid); return;
  }
  battle.sel = { kind: 'play', uid: c.uid };
  btShowTip(c, chk.ok ? (c.spell ? 'Tap again to cast it.' : 'Tap again to play it.') : chk.why);
  btRender();
}

function btOnBoardCard(side, c) {
  if (!battle || battle.busy || battle.G.over) return;
  const G = battle.G;
  if (side === 'you') {
    if (G.active !== 0) return btShowTip(c, '');
    if (battle.sel && battle.sel.kind === 'spell') { btToast('Aim it at an enemy card'); return; }
    if (battle.sel && battle.sel.kind === 'play') {                                    // drop the selected hand card onto the board
      const chk = BattleEngine.canPlay(G, 0, battle.sel.uid);
      const card = G.p[0].hand.find(x => x.uid === battle.sel.uid);
      if (chk.ok && !BattleEngine.spellNeedsTarget(card)) { const u = battle.sel.uid; battle.sel = null; btHideTip(); btDoPlay(u); }
      return;
    }
    if (battle.sel && battle.sel.kind === 'attack' && battle.sel.uid === c.uid) { battle.sel = null; btHideTip(); btRender(); return; }
    if (!c.ready) { battle.sel = null; btShowTip(c, 'Just arrived. It can attack next turn.'); btRender(); return; }
    if (c.attacks > 0) { btShowTip(c, 'Already attacked this turn.'); return; }
    battle.sel = { kind: 'attack', uid: c.uid };
    btShowTip(c, BattleEngine.guards(G.p[1]).length ? 'A Guard blocks the way. Attack a highlighted card.' : 'Tap a highlighted enemy card, or the enemy Spirit bar.');
    btRender();
  } else {
    if (battle.sel && battle.sel.kind === 'spell') {
      const u = battle.sel.uid; battle.sel = null; btHideTip(); btDoPlay(u, { kind: 'card', uid: c.uid }); return;
    }
    if (battle.sel && battle.sel.kind === 'attack') {
      const legal = BattleEngine.legalTargets(G, 0, battle.sel.uid).some(t => t.kind === 'card' && t.uid === c.uid);
      if (!legal) { btToast('A Guard must be attacked first'); return; }
      const u = battle.sel.uid; battle.sel = null; btHideTip(); btDoAttack(u, { kind: 'card', uid: c.uid }); return;
    }
    btShowTip(c, '');
  }
}

/* ---------------- animation ---------------- */
function btFlush(G) { return G.events.splice(0); }

async function btAnimate(evs, token) {
  for (const e of evs) {
    if (!btAlive(token)) return;
    if (e.type === 'play') {
      btRender({ entering: e.card.uid });
      if (e.who === 0) { sfx('play'); buzz(HAP.play); } else sfx('flip');
      await btWait(e.who === 0 ? 260 : 520);
    } else if (e.type === 'attack') {
      const atk = document.querySelector(`#battleView .card[data-uid="${e.attacker.uid}"]`);
      if (atk) atk.classList.add(e.who === 0 ? 'strike-up' : 'strike-down');
      sfx('tap');
      await btWait(230);
      if (e.target.kind === 'spirit') {
        const bar = btGet(e.who === 0 ? 'btOppSpirit' : 'btYouSpirit');
        bar.classList.add('hit'); btFloater(bar, '-' + e.dmg, 'dmg'); btImpact(bar, 3); setTimeout(() => bar.classList.remove('hit'), 400);
        if (e.who === 0) { sfx('round'); buzz(HAP.round); } else { sfx('soft'); buzz(HAP.soft); }
      } else {
        const t = document.querySelector(`#battleView .card[data-uid="${e.target.uid}"]`);
        if (t) { t.classList.add('hurt-flash'); btFloater(t, e.blocked ? '🫧 blocked' : '-' + e.dmg, e.blocked ? 'blk' : 'dmg'); if (!e.blocked) btImpact(t, 4); }
      }
      btRenderBars(); await btWait(340);
    } else if (e.type === 'spell') {
      // A cast spell flashes up in the middle of the field before its effect lands.
      const def = cardDef(e.card.id);
      btRender();
      btSpellFlash(def);
      btSetMsg(`${e.who === 0 ? 'You cast' : battle.npc.name + ' casts'} ${def.icon} ${def.name}`);
      if (e.target) { const t = document.querySelector(`#battleView .card[data-uid="${e.target.uid}"]`); if (t) t.classList.add('spell-aim'); }
      if (e.who === 0) { sfx('rare'); buzz(HAP.play); } else sfx('flip');
      await btWait(e.who === 0 ? 520 : 760);
    } else if (e.type === 'zap') {
      const t = document.querySelector(`#battleView .card[data-uid="${e.uid}"]`);
      if (t) { t.classList.add('hurt-flash'); btFloater(t, e.pierce ? '🌠' : e.blocked ? '🫧 blocked' : (e.tag === 'thorns' ? '🌵 -' : '✨ -') + e.dmg, e.blocked ? 'blk' : 'dmg'); if (!e.blocked) btImpact(t, 5); }
      sfx('tap'); await btWait(260);
    } else if (e.type === 'bounce') {
      const t = document.querySelector(`#battleView .card[data-uid="${e.card.uid}"]`);
      if (t) { t.classList.add('bounce-away'); btFloater(t, '🍃 back to hand', 'blk'); }
      await btWait(420); btRender();
    } else if (e.type === 'buff' || e.type === 'mendcard' || e.type === 'readied') {
      const t = document.querySelector(`#battleView .card[data-uid="${e.uid}"]`);
      if (t) btFloater(t, e.type === 'buff' ? (e.rally ? '📯 +1 ⚔' : '🌞 +1 ⚔') : e.type === 'mendcard' ? '+1 ♥' : '🌬️ ready', 'heal');
      await btWait(120);
    } else if (e.type === 'tide') {
      btSetMsg('🌊 The tide washes in!');
      battleView.classList.add('tide-wash'); setTimeout(() => battleView.classList.remove('tide-wash'), 900);
      sfx('soft'); await btWait(520);
    } else if (e.type === 'spirit') {
      const bar = btGet(e.who === 0 ? 'btYouSpirit' : 'btOppSpirit');
      if (e.echo || e.spell) { bar.classList.add('hit'); btFloater(bar, (e.spell ? '✨ -' : '🔔 -') + (-e.delta), 'dmg'); setTimeout(() => bar.classList.remove('hit'), 400); await btWait(300); }
      else if (e.delta > 0) { bar.classList.add('heal'); btFloater(bar, '+' + e.delta, 'heal'); setTimeout(() => bar.classList.remove('heal'), 500); await btWait(240); }
      btRenderBars();
    } else if (e.type === 'faint') {
      const el = document.querySelector(`#battleView .card[data-uid="${e.card.uid}"]`);
      if (el) { el.classList.add('faint'); btImpact(el, 6); }
      if (e.who === 1) { sfx('round'); buzz(HAP.round); } else sfx('soft');
      await btWait(460);
    } else if (e.type === 'grow') {
      const el = document.querySelector(`#battleView .card[data-uid="${e.card.uid}"]`);
      if (el) btFloater(el, '🌸 +1', 'heal');
    } else if (e.type === 'draw' && e.who === 0) {
      btRender({ drawn: e.card.uid }); await btWait(200);
    } else if (e.type === 'burn' && e.who === 0) {
      btToast('Your hand is full, so a card was set aside');
    } else if (e.type === 'turn') {
      btSetMsg(e.who === 0 ? 'Your turn' : `${battle.npc.name}'s turn`);
      if (e.who === 0) sfx('nav');
    }
  }
  if (btAlive(token)) btRender();
}

// A big, brief copy of a cast spell over the middle of the field.
function btSpellFlash(def) {
  const field = document.querySelector('#battleView .field');
  if (!field) return;
  const f = document.createElement('div');
  f.className = 'spell-flash rarity-' + def.rarity;
  f.innerHTML = `<span class="sf-icon">${cardArtHtml(def)}</span><span class="sf-name">${def.name}</span>`;
  field.appendChild(f); setTimeout(() => f.remove(), 900);
}

async function btDoPlay(uid, target) {
  const token = battle.token; battle.busy = true;
  const r = BattleEngine.playCard(battle.G, 0, uid, target);
  if (r && !r.ok) btToast(r.why);
  await btAnimate(btFlush(battle.G), token);
  if (!btAlive(token)) return;
  battle.busy = false;
  if (battle.G.over) return btFinish();
  btRender();
}

async function btDoAttack(uid, target) {
  const token = battle.token; battle.busy = true;
  const r = BattleEngine.attack(battle.G, 0, uid, target);
  if (!r.ok) btToast(r.why);
  await btAnimate(btFlush(battle.G), token);
  if (!btAlive(token)) return;
  battle.busy = false;
  if (battle.G.over) return btFinish();
  btRender();
}

async function btOpponentTurn(token) {
  const G = battle.G, lv = battle.profile.level;
  btSetMsg(`${battle.npc.name} is thinking…`);
  await btWait(650); if (!btAlive(token)) return;
  for (let i = 0; i < 40 && !G.over; i++) {
    const a = BattleEngine.aiNextAction(G, 1, lv);
    if (a.type === 'end') break;
    BattleEngine.applyAction(G, 1, a);
    await btAnimate(btFlush(G), token); if (!btAlive(token)) return;
    if (G.over) break;
    await btWait(a.type === 'play' ? 380 : 220); if (!btAlive(token)) return;
  }
}

async function btPlayerEnd() {
  const token = battle.token, G = battle.G;
  if (battle.puzzle) { BattleEngine.forfeit(G, 0); G.why = 'puzzle'; btFinish(); return; }
  battle.busy = true; battle.sel = null; btHideTip(); btRender();
  BattleEngine.endTurn(G, 0);
  await btAnimate(btFlush(G), token); if (!btAlive(token)) return;
  if (G.over) return btFinish();
  await btOpponentTurn(token); if (!btAlive(token)) return;
  if (G.over) return btFinish();
  await btWait(200); if (!btAlive(token)) return;
  BattleEngine.endTurn(G, 1);
  await btAnimate(btFlush(G), token); if (!btAlive(token)) return;
  if (G.over) return btFinish();
  battle.busy = false; btSetMsg('Your turn'); btRender();
}

/* ---------------- finishing ---------------- */
function btFinish() {
  if (!battle || battle.ended) return;
  battle.ended = true; battle.busy = false;
  const G = battle.G, won = G.winner === 0, yielded = G.why === 'yield';
  if (won && !yielded && !battle.dungeon) noteBattleResult(true, battle.playedKw || []);
  if (battle.spellsCast) bumpStat('spellsCast', battle.spellsCast);
  if (!battle.puzzle) settleMastery(won && !yielded);
  const winPeb = won && !yielded && !battle.puzzle ? cardBonus('winPebbles') : 0;
  if (winPeb) { addPebbles(winPeb); setTimeout(() => toast(`🌵 Thorn charms: +${winPeb} 🫧`), 1200); }
  btRender();
  setTimeout(() => btShowResult(won, yielded), won ? 500 : 300);
}

function btShowResult(won, yielded) {
  const G = battle.G, npc = battle.npc;
  const ownedBefore = state.ownedCards.length, firstShow = !battle.recorded;   // cards added below are this match's prizes
  const icon = btGet('battleEndIcon'), endCard = btGet('battleEndCard');
  endCard.className = 'overlay-card';
  const turns = Math.ceil(G.turn / 2) + 1;

  if (won && !battle.rewarded && npc.puzzle) {
    puzzleWin();
  } else if (!won && npc.puzzle) {
    icon.textContent = '🧩'; icon.className = 'big-icon';
    btGet('battleSparkles').innerHTML = '';
    battleEndTitle.textContent = 'Not quite.';
    battleEndStats.textContent = `There is a way to win this turn${state.progress.puzzle && state.progress.puzzle.steps ? ` in ${state.progress.puzzle.steps} moves` : ''}. Try again - the board resets exactly as it was.`;
    btGet('battleRetryBtn').classList.remove('hidden');
    sfx('soft');
  } else if (won && !battle.rewarded && npc.challenge) {
    challengeWin();
  } else if (won && !battle.rewarded && npc.cup) {
    cupWin();
  } else if (!won && npc.cup && !battle.rewarded) {
    battle.rewarded = true;
    cupLoss();
  } else if (won && !battle.rewarded && npc.dungeon) {
    dungeonWin();
  } else if (won && !battle.rewarded && npc.isRival) {
    rivalWin();
  } else if (won && !battle.rewarded && npc.signature) {
    signatureWin();
  } else if (won && !battle.rewarded) {
    battle.rewarded = true;
    buryFighter(npc); if (!npc.isBoss) { dropRequestsFor(npc); addFriendship(npc, FRIEND_POINTS.win, 'win'); }
    state.wins++;
    ensureRewardTier(npc);                                   // neighbors give rare or better, bosses super or better
    if (battle.weather === 'snow') npc.rewardCard = snowUpgrade(npc.rewardCard, !!npc.isBoss);
    const isNew = !discoveredSet().has(BattleEngine.baseIdOf(npc.rewardCard));
    state.ownedCards.push(npc.rewardCard);
    noteCardsFound(1);
    saveState();
    const rewardDef = cardDef(npc.rewardCard), tier = RARITY_ORDER.indexOf(rewardDef.rarity);
    icon.textContent = battle.isBoss ? '👑' : '🌿';
    icon.className = 'big-icon reveal-icon';
    if (tier >= 1) endCard.classList.add('glow-' + rewardDef.rarity);
    battleEndTitle.textContent = battle.isBoss ? `${npc.name} yields.` : `${npc.name} offers a card.`;
    battleEndStats.innerHTML = `You won with <b>${Math.max(0, G.p[0].spirit)}</b> Spirit left after ${turns} turns and received<br><b>${cardArtHtml(rewardDef)} ${rewardDef.name}</b> <span class="rarity-tag rt-${rewardDef.rarity}" style="margin:4px 0 0">${RARITY_LABEL[rewardDef.rarity]}</span>`;
    btGet('battleRetryBtn').classList.add('hidden');
    sparkleBurst(btGet('battleSparkles'), ['✨', '🌟', '🌿'], battle.isBoss ? 20 : 10);
    sfx(battle.isBoss || tier >= 3 ? 'mythic' : 'win'); buzz(HAP.win);
    bumpPill('pillWins'); bumpPill('pillCards');
    bumpStat('battlesWon', 1);
    if (battle.isBoss) bumpStat('bossesWon', 1);
    logEvent(battle.isBoss ? '👑' : '⚔️', battle.isBoss ? `Defeated ${npc.name}, boss of ${DISTRICTS[state.currentDistrict].name}.` : `Won a friendly match against ${npc.name}.`);
    if (isNew) setTimeout(() => toast('📖 New entry in your Index'), 900);
  } else if (!won && npc.dungeon && npc.dungeon.deep && !battle.rewarded) {
    battle.rewarded = true;                                   // settle the run exactly once
    dungeonLoss();
    icon.textContent = '🕳️'; icon.className = 'big-icon';
    btGet('battleSparkles').innerHTML = '';
    battleEndTitle.textContent = 'The deep pushes you back.';
    battleEndStats.innerHTML = `${npc.name} held floor ${npc.dungeon.floor + 1}. You cleared <b>${npc.dungeon.floor}</b> floors this run · deepest <b>${cellarBest()}</b>.<br>The cellar rests for a while before the next climb.`;
    btGet('battleRetryBtn').classList.add('hidden');
    sfx('soft');
  } else if (!won) {
    icon.textContent = '🍃'; icon.className = 'big-icon';
    btGet('battleSparkles').innerHTML = '';
    if (npc.isRival && !yielded) rivalState().losses++;
    if (yielded) {
      battleEndTitle.textContent = 'You stepped away.';
      battleEndStats.textContent = `No cost to you. ${npc.name} will be here whenever you are ready.`;
    } else {
      battleEndTitle.textContent = battle.isBoss ? `${npc.name} holds firm.` : npc.isRival ? 'Rook grins. "Not bad. Again?"' : 'A close, friendly match.';
      battleEndStats.textContent = `${npc.name} won this one after ${turns} turns. No cost to you. Try a different card mix, or try again.`;
    }
    btGet('battleRetryBtn').classList.remove('hidden');
    sfx('soft');
  }
  if (firstShow && !npc.puzzle) { battle.recorded = true; recordBattle(won, yielded, state.ownedCards.slice(ownedBefore)); }
  updateHud();
  battleEndOverlay.classList.remove('hidden');
}

function closeBattle(retry) {
  const fromDungeon = !!(battle && battle.npc && battle.npc.dungeon), fromPuzzle = !!(battle && battle.npc && battle.npc.puzzle), fromCup = !!(battle && battle.npc && battle.npc.cup),
        fromChallenge = !!(battle && battle.npc && battle.npc.challenge);
  battleEndOverlay.classList.add('hidden');
  btGet('mulliganOverlay').classList.add('hidden');
  if (battle) { battle.ended = true; battleToken++; }
  if (retry && battle) { startBattle(battle.npc); return; }
  inBattle = false;
  btHideTip();
  battleView.classList.add('hidden');
  townPanel.classList.remove('hidden');
  document.getElementById('bottomNav').style.display = '';
  document.body.classList.remove('in-battle');
  townLog.textContent = 'The town settles back into quiet.';
  renderTown();
  updateHud();
  if (fromDungeon) openScene('cellar');
  else if (fromPuzzle) openScene('nook');
  else if (fromCup) openScene('cup');
  else if (fromChallenge) { openScene('cup'); scene.mode = 'chal'; scene.text = 'The challenge board, again.'; renderScene(); }
}

/* ---------------- yield, help, wiring ---------------- */
function btYield() {
  if (!battle || battle.ended) return;
  if (!battle.yieldArmed) {
    battle.yieldArmed = true; btToast('Tap the flag again to step away');
    clearTimeout(btYield._t); btYield._t = setTimeout(() => { if (battle) battle.yieldArmed = false; }, 3000);
    return;
  }
  BattleEngine.forfeit(battle.G, 0);
  btFinish();
}

function btShowHelp() {
  const ov = btGet('btHelpOverlay');
  btGet('btHelpBody').innerHTML = `
    <b>Goal:</b> bring the other side's Spirit to 0.<br><br>
    <b>Energy ⚡</b> grows by one each turn (up to 5). Spend it to play cards.<br><br>
    <b>Cards stay on the board</b> (up to 4). A card can attack the turn <i>after</i> it arrives; 💤 means it just did.<br><br>
    <b>To attack:</b> tap a glowing card of yours, then a target: an enemy card, or their Spirit bar. Hitting Spirit is capped at 4 per attack, so removing enemy cards is often better.<br><br>
    <b>Friendly neighbors</b> start with less Spirit than you.<br><br>
    <b>✨ Spells</b> are cast from your hand for an instant effect and never take a board slot. Some are aimed: cast it, then tap an enemy card. Guard does not stop a spell.<br><br>
    <b>District bosses</b> each bend one rule: 🌳 Elder Yew heals 3 Spirit every turn, 🧱 Old Bramble's Guards are extra sturdy, 🌊 the Harbor Keeper's tide washes your strongest card back to hand every 4th turn, and 🌻 the Garden Sentinel's cheap cards all Bloom.<br><br>
    <b>Weather</b> can change a match: in a ⛈️ storm every 💨 Swift card has +1 power, and in ❄️ snow bosses are tougher but pay better.<br><br>
    ${Object.values(KW).map(k => `${k.icon} <b>${k.name}.</b> ${k.text}`).join('<br>')}<br><br>
    <i>Tap a card to read it, tap it again to play it.</i>`;
  ov.classList.remove('hidden');
}

btGet('btEnd').addEventListener('click', () => { if (!battle || battle.busy || battle.G.over || battle.G.active !== 0) return; ensureAudio(); btPlayerEnd(); });
btGet('btOppBar').addEventListener('click', () => {
  if (!battle || battle.busy || !battle.sel || battle.sel.kind !== 'attack') return;
  if (!BattleEngine.legalTargets(battle.G, 0, battle.sel.uid).some(t => t.kind === 'spirit')) { btToast('A Guard must be attacked first'); return; }
  const u = battle.sel.uid; battle.sel = null; btHideTip(); btDoAttack(u, { kind: 'spirit' });
});
btGet('btHelp').addEventListener('click', btShowHelp);
btGet('btYield').addEventListener('click', btYield);
btGet('btHelpClose').addEventListener('click', () => btGet('btHelpOverlay').classList.add('hidden'));
btGet('mulliganKeepBtn').addEventListener('click', () => { ensureAudio(); btCloseMulligan(); });
btGet('mulliganSwapBtn').addEventListener('click', () => {
  ensureAudio();
  const swapBtn = btGet('mulliganSwapBtn');
  if (!battle || !battle.G || swapBtn.disabled) return;
  BattleEngine.mulligan(battle.G, 0);
  btRender(); btRenderMulliganHand(); sfx('flip'); buzz(HAP.play);
  swapBtn.disabled = true; swapBtn.textContent = 'New hand drawn';   // one-time: keep the fresh hand visible, but no further redraws
});
// Tap outside to deselect. This runs in the CAPTURE phase, before the tapped card's own handler re-renders the board:
// afterwards the tapped element is detached from the page, and would wrongly look like a tap outside.
document.addEventListener('click', e => {
  if (!battle || !inBattle || !battle.sel) return;
  if (e.target.closest('#battleView .card') || e.target.closest('#btOppBar') || e.target.closest('#btTip') || e.target.closest('#btEnd')) return;
  battle.sel = null; btHideTip(); btRender();
}, true);

function ownedCardCounts() {
  const counts = {};
  state.ownedCards.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
  return counts;
}


