/* ============================================================
   TURN-BASED BATTLE: the rules live in BattleEngine; this part draws them and routes taps.
   You are always seat 0; the neighbor is seat 1. Who takes the first turn comes from the toss (js/battle-toss.js).
   ============================================================ */
let battleToken = 0;
const btWait = ms => new Promise(r => setTimeout(r, prefs.fast ? ms * 0.45 : ms));   // "Fast battles" trims every pause
const btToast = m => toast(m, true);
const btGet = id => document.getElementById(id);
const btAlive = token => battle && battle.token === token && !battle.ended;

/* ---------- battle intro (v1.73.0) ----------
   startBattle() is now a thin wrapper: it fades out of the town (the same door fade as buildings), sets the battle up
   exactly as before (startBattleNow), then plays a "versus" card - you against them, with a boss's twist spelled out.
   The opening deal waits for the card (battle.introP, read in btDealOpening), and a tap skips it. With Calm mode on, or
   when the deck is too short (the old early-return with its message), it goes straight in as it always did. */
function startBattle(opponent) {
  const deckOk = state.deck.filter(id => !!cardDef(id)).length >= DECK_SIZE;
  if (opponent.puzzle || !deckOk) { startBattleNow(opponent, 0); return; }
  if (tossBusy) return;                                    // a double tap while the toss is up
  // Who goes first is decided before anything is dealt (js/battle-toss.js): the toss, then the fade and the versus card.
  btTossFirst(opponent).then(first => {
    if (doorFading || !btMotionOk()) { startBattleNow(opponent, first); return; }
    withDoorFade(() => { startBattleNow(opponent, first); if (inBattle && battle) battle.introP = btIntro(opponent, battle.isBoss, first); });
  });
}
function btIntro(opponent, isBoss, first) {
  return new Promise(resolve => {
    const tw = bossTwistFor(opponent), t = tw ? BattleEngine.TWISTS[tw] : null;
    const tag = isBoss ? '👑 District boss' : opponent.cup ? '🏆 Festival Cup' : opponent.dungeon ? '🕯️ Cellar' : opponent.isRival ? '⚡ Rival' : '⚔️ Friendly match';
    const el = document.createElement('div'); el.className = 'bt-intro' + (isBoss ? ' boss' : '');
    el.innerHTML = `<div class="bt-intro-side opp"><span class="bt-intro-av"></span><div><div class="bt-intro-name"></div><div class="bt-intro-tag">${tag}</div></div></div>
      <div class="bt-intro-vs">VS</div>
      <div class="bt-intro-side you"><span class="bt-intro-av you-av"></span><div><div class="bt-intro-name you-name"></div><div class="bt-intro-tag">${first === 1 ? '🎁 You go second · +1 card' : '🥇 You go first'}</div></div></div>
      ${t ? `<div class="bt-intro-twist"><b>${t.icon} Boss twist</b><span></span></div>` : ''}`;
    el.querySelector('.opp .bt-intro-av').textContent = opponentPortrait(opponent);
    el.querySelector('.opp .bt-intro-name').textContent = opponent.name;
    const me = el.querySelector('.you-av'); applyAvatarStyle(me, state.character); me.textContent = state.character.emoji;
    el.querySelector('.you-name').textContent = state.character.name || 'You';
    if (t) el.querySelector('.bt-intro-twist span').textContent = t.text;
    battleView.appendChild(el);
    let done = false;
    const finish = () => {
      if (done) return; done = true; clearTimeout(timer);
      el.classList.add('out');
      setTimeout(() => { el.remove(); resolve(); }, 300);
    };
    const timer = setTimeout(finish, isBoss ? 2100 : 1500);
    el.addEventListener('pointerdown', finish);
    if (!isBoss) sfx('tap');   // a boss already got its sting in startBattleNow
    buzz(HAP.tap);
  });
}
/* ---------- the world in the match (v1.83.0) ----------
   Three layers change how a match plays, the same for both sides: the weather (WEATHER_EFFECTS), night (Echo hits +1) and the
   district's "home turf" (its family has +1 health - Stone in Town Square, Wind in Market Row, Tide in the Harbor, Grove in the
   Garden). Returns the engine's `mods` and the short chips the battle screen shows. The cellar and puzzles are shut away from
   all of it. */
function battleWorld(opponent, weather) {
  const mods = {}, chips = [];
  if (opponent.puzzle || opponent.dungeon) return { mods, chips };
  const fx = WEATHER_EFFECTS[weather] || {};
  ['swiftBonus', 'bloomStart', 'shieldHp', 'mendBonus'].forEach(k => { if (fx[k]) mods[k] = fx[k]; });
  if (fx.battle) chips.push(fx.battle);
  if (skyPhase().isNight) { mods.echoBonus = 1; chips.push('🌙 Night: Echo hits +1'); }
  const fam = districtFamily(state.currentDistrict);
  if (fam) { mods.famHp = { family: fam, hp: 1 }; chips.push(`${FAMILIES[fam].icon} ${FAMILIES[fam].name} home turf +1♥`); }
  return { mods, chips };
}
function startBattleNow(opponent, first) {
  first = first === 1 ? 1 : 0;                              // 0 = you take the first turn (the toss, js/battle-toss.js)
  // Never let a damaged card id reach the engine: drop anything that is not a real card first.
  const cleaned = state.deck.filter(id => !!cardDef(id));
  if (cleaned.length !== state.deck.length) { state.deck = cleaned; saveState(); }
  if (!opponent.puzzle && state.deck.length < DECK_SIZE) {
    townLog.textContent = `You need a full ${DECK_SIZE}-card deck before battling. Open Cards → Deck.`;
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
  const oppDeck = plainFoe ? buildDeckForOpponent(DECK_SIZE, isBoss, null, opponent.name, state.currentDistrict)   // a district's folk favour its family
    : (Array.isArray(opponent.deck) && opponent.deck.length === DECK_SIZE) ? opponent.deck : buildDeckForOpponent(DECK_SIZE, isBoss);
  const twistKind = bossTwistFor(opponent);
  const world = battleWorld(opponent, weather);
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
    G = BattleEngine.newGame(state.deck.slice(), oppDeck.slice(), Math.random, { spirit: [BattleEngine.RULES.spirit, profile.spirit], mods: world.mods,
      twist: twistKind ? { side: 1, kind: twistKind } : null, startSpirit: opponent.startSpirit ? [opponent.startSpirit, null] : null, first, knack: [currentKnackId(), null] });
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
  battle = { npc: opponent, isBoss, first, G, profile, weather, sel: null, busy: false, ended: false, rewarded: false, yieldArmed: false, token: ++battleToken, startedAt: Date.now() };
  const chip = [weather === 'snow' ? (isBoss ? '❄️ Boss +2 Spirit · richer prize' : '❄️ Richer prize') : '', ...world.chips].filter(Boolean).join(' · ');
  const tw = twistKind ? BattleEngine.TWISTS[twistKind] : null;
  btGet('btWeather').textContent = opponent.puzzle ? '🧩 Ending your turn resets the board' : [tw ? `${tw.icon} ${tw.text}` : '', chip, plainFoe ? '✦ Seasoned deck' : ''].filter(Boolean).join(' · ');
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
  btSetMsg(first === 1 ? `${opponent.name} goes first` : isBoss ? `${opponent.name} rises to meet you` : 'Your turn');
  ensureCosmeticUnlocks(); btGet('btYouRow').className = 'trow mat-' + (state.character.mat || 'glass');   // the player's table mat
  btHideTip();
  btRender();
  if (isBoss) { sfx('rare'); buzz(HAP.win); }
  if (battle.puzzle) { btSetMsg('🧩 Win this turn!'); btRender(); return; }   // no mulligan, no snack: the board is the puzzle
  battle.pendingHelp = !state.progress.seenBattleHelp;
  if (battle.pendingHelp) { state.progress.seenBattleHelp = true; saveState(); }
  const swapBtn = btGet('mulliganSwapBtn'); swapBtn.disabled = false; swapBtn.textContent = 'Draw new hand';
  btRenderMulliganHand();
  renderSnackRow(); btRenderKnackRow();
  // Deal the opening hand slowly from the deck, then offer the keep-or-redraw choice.
  const tk = battle.token; battle.busy = true;
  btRender({ dealAll: true });
  btDealOpening(tk).then(() => {
    if (!btAlive(tk)) return;
    battle.busy = false; btRender(); btRenderMulliganHand();
    btGet('mulliganOverlay').classList.remove('hidden');
  });
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

/* ---------- Keeper's Knack (v1.84.0) ----------
   Your once-per-match ability (BattleEngine.KNACKS). Pick it on the keep-this-hand screen (or in Character -> Me); during the
   match a round button by your bar opens a small sheet with what it does and a "Use" button. It needs no aiming. */
function knackChipsHtml(selectedId, inBattle) {
  return Object.entries(BattleEngine.KNACKS).map(([id, k]) => {
    const open = knackUnlocked(id);
    return `<button type="button" class="knack-chip${id === selectedId ? ' on' : ''}${open ? '' : ' locked'}" data-knack="${id}"${open ? '' : ' aria-disabled="true"'} title="${k.name}: ${k.text}">${open ? k.icon : '🔒'} ${k.name}${open ? '' : ` <small>Lv ${k.level}</small>`}</button>`;
  }).join('');
}
function knackPickerWire(box, onPick) {
  box.querySelectorAll('[data-knack]').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.knack, k = BattleEngine.KNACKS[id];
    if (!knackUnlocked(id)) { toast(`${k.name} unlocks at Keeper level ${k.level}`); return; }
    chooseKnack(id); sfx('tap'); onPick(id);
  }));
}
function btRenderKnackRow() {
  const row = btGet('knackRow'); if (!row || !battle) return;
  if (battle.puzzle) { row.classList.add('hidden'); return; }
  row.classList.remove('hidden');
  const cur = battle.G.p[0].knack, k = BattleEngine.KNACKS[cur];
  row.innerHTML = `<div class="knack-label">✨ Your Knack - once per match</div><div class="knack-chips">${knackChipsHtml(cur)}</div><div class="knack-desc">${k ? `${k.icon} <b>${k.name}.</b> ${k.text} <i>From your turn ${k.from}.</i>` : ''}</div>`;
  knackPickerWire(row, id => { BattleEngine.setKnack(battle.G, 0, id); btRenderKnackRow(); btRenderKnack(); });
}
function btRenderKnack() {
  const b = btGet('btKnack'); if (!b || !battle) return;
  const G = battle.G, pl = G.p[0], k = BattleEngine.KNACKS[pl.knack];
  b.classList.toggle('hidden', !k || !!battle.puzzle);
  if (!k) return;
  const chk = BattleEngine.knackReady(G, 0);
  b.textContent = k.icon;
  b.classList.toggle('ready', chk.ok && !battle.busy);
  b.classList.toggle('used', !!pl.knackUsed);
  b.setAttribute('aria-label', `${k.name}: ${pl.knackUsed ? 'used' : chk.ok ? 'ready' : chk.why}`);
}
function btShowKnackTip() {
  if (!battle || battle.G.over) return;
  const G = battle.G, pl = G.p[0], k = BattleEngine.KNACKS[pl.knack]; if (!k) return;
  const chk = BattleEngine.knackReady(G, 0), ok = chk.ok && !battle.busy;
  const tip = btGet('btTip');
  tip.innerHTML = `<div class="t-h"><span class="ic">${k.icon}</span><b>${k.name}</b><small>Your Knack · once per match</small></div>
    <div class="kw">${k.text}</div>
    ${pl.knackUsed ? '<div class="kw" style="color:var(--ink-soft)">Already used this match.</div>' : ok ? '<button class="btn knack-use" id="btKnackUse" type="button">Use it now</button>' : `<div class="hint">${chk.why}.</div>`}`;
  tip.classList.add('show', 'interactive'); battleView.classList.add('tip-open'); btPlaceTip();     // unlike a card sheet this one has a button, so it takes taps
  const use = btGet('btKnackUse'); if (use) use.addEventListener('click', btDoKnack);
}
async function btDoKnack() {
  if (!battle || battle.busy || battle.G.over) return;
  const token = battle.token; btHideTip(); battle.sel = null;
  const r = BattleEngine.useKnack(battle.G, 0);
  if (!r.ok) { btToast(r.why); return; }
  battle.busy = true; bumpStat('knacksUsed', 1); saveState();
  await btAnimate(btFlush(battle.G), token);
  if (!btAlive(token)) return;
  battle.busy = false;
  if (battle.G.over) return btFinish();
  btRender();
}

function btCloseMulligan() {
  btGet('mulliganOverlay').classList.add('hidden');
  if (battle && battle.pendingHelp) { battle.pendingHelp = false; btShowHelp(); return; }   // btHelpClose carries on from there
  btOpponentOpens();
}
// When the toss gave the neighbor the first turn, they play it as soon as you have kept (or redrawn) your hand.
function btOpponentOpens() {
  if (!battle || battle.ended || battle.first !== 1 || battle.openingDone || battle.G.active !== 1) return;
  battle.openingDone = true;
  btOpponentRound(battle.token);
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
  el.dataset.inspect = c.id;
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
  if (c.lull) { el.classList.add('lulled'); el.insertAdjacentHTML('beforeend', '<span class="badge lul">😴</span>'); }
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

/* ---------------- decks, card backs and dealing ----------------
   Each side's draw pile is a stack of card backs on the table (taller = more cards left) and the opponent's hand is a
   little fan of backs by their name, so you can see how many they hold. Your own backs wear your card sleeve. Cards
   are dealt by flying a back from the pile to its place and then flipping the face up, slowly enough to watch. */
function btBackEl(mine) {
  const s = mine ? currentSleeve() : null, el = document.createElement('div');
  el.className = 'cback' + (s && s.id ? ' sleeved sleeve-' + s.id : '');
  if (s && s.id) el.innerHTML = `<span class="sleeve-fx"></span><span class="sleeve-mark">${s.icon}</span>`;
  return el;
}
function btRenderPiles() {
  const G = battle.G;
  [['You', 0], ['Opp', 1]].forEach(([k, i]) => {
    const pile = btGet('bt' + k + 'Pile'), n = G.p[i].deck.length, layers = n ? Math.min(6, Math.ceil(n / 3)) : 0;
    pile.innerHTML = ''; pile.classList.toggle('empty', !n);
    for (let l = 0; l < layers; l++) { const b = btBackEl(i === 0); b.style.transform = `translate(${-l * 1.3}px, ${-l * 1.7}px)`; pile.appendChild(b); }
    if (n) { const c = document.createElement('span'); c.className = 'pile-n'; c.textContent = n; pile.appendChild(c); }
  });
}
function btRenderOppHand() {
  const box = btGet('btOppHand'), n = battle.G.p[1].hand.length;
  box.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const b = btBackEl(false), off = i - (n - 1) / 2;
    b.style.setProperty('--r', (off * 7).toFixed(1) + 'deg'); b.style.setProperty('--y', Math.round(off * off * 0.8) + 'px');
    box.appendChild(b);
  }
}
const btMotionOk = () => !document.documentElement.classList.contains('calm') && !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
// Fly a card back from one element to another over ms milliseconds; resolves when it lands.
function btFlyBack(fromEl, toEl, ms, mine) {
  return new Promise(res => {
    if (!fromEl || !toEl || !btMotionOk()) return res();
    const a = fromEl.getBoundingClientRect(), b = toEl.getBoundingClientRect();
    const tw = toEl.offsetWidth || b.width, th = toEl.offsetHeight || b.height, cx = b.left + b.width / 2, cy = b.top + b.height / 2;
    const f = btBackEl(mine); f.classList.add('flying'); f.style.width = a.width + 'px'; f.style.height = a.height + 'px';
    battleView.appendChild(f);
    const anim = f.animate([
      { transform: `translate(${a.left}px, ${a.top}px) scale(1)` },
      { transform: `translate(${cx - tw / 2}px, ${cy - th / 2}px) scale(${tw / a.width}, ${th / a.height})` }
    ], { duration: ms * (prefs.fast ? 0.45 : 1), easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'forwards' });
    const done = () => { f.remove(); res(); };
    anim.onfinish = done; anim.oncancel = done;
  });
}
// A drawn card: its back flies from your pile to its place in the hand, then it flips face up.
async function btDealOne(uid, ms) {
  const card = battleView.querySelector(`#btHand .card[data-uid="${uid}"]`);
  if (!card) return;
  const pileTop = btGet('btYouPile').querySelector('.cback:last-of-type') || btGet('btYouPile');
  await btFlyBack(pileTop, card, ms, true);
  card.classList.remove('deal-hide');
  if (btMotionOk()) card.animate([{ transform: 'perspective(500px) rotateY(90deg)' }, { transform: 'perspective(500px) rotateY(0deg)' }], { duration: 260 * (prefs.fast ? 0.45 : 1), easing: 'ease-out' });
}
async function btDealOpening(token) {
  await btWait(250);
  if (battle && battle.introP) await battle.introP;      // the versus card plays first
  if (!btAlive(token)) return;
  for (const c of battle.G.p[0].hand.slice()) {
    if (!btAlive(token)) return;
    await btDealOne(c.uid, 420); await btWait(70);
  }
}

function btRenderBars() {
  const G = battle.G;
  btRenderPiles(); btRenderOppHand();
  [['You', 0], ['Opp', 1]].forEach(([k, i]) => {
    const p = G.p[i], pct = Math.max(0, p.spirit / p.maxSpirit * 100);
    const sp = btGet('bt' + k + 'Spirit');
    sp.querySelector('.fill').style.width = pct + '%';
    sp.style.setProperty('--p', pct + '%');   // the Spirit ring around the portrait is a conic-gradient driven by this
    sp.querySelector('.num').textContent = `${Math.max(0, p.spirit)}/${p.maxSpirit}`;
    sp.classList.toggle('low', p.spirit <= Math.ceil(p.maxSpirit * 0.3));
    const sb = btGet('bt' + k + 'Sbar');       // the life bar under the name: always readable at a glance
    sb.querySelector('.fill').style.width = pct + '%';
    sb.querySelector('.sn').textContent = `♥ ${Math.max(0, p.spirit)} / ${p.maxSpirit}`;
    sb.classList.toggle('low', p.spirit <= Math.ceil(p.maxSpirit * 0.3));
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
        if (canAct) el.addEventListener('pointerdown', e => btStartDrag(e, c, 'board'));
        slot.appendChild(el);
      } else if (k === 'You' && sel && sel.kind === 'play' && !btSelIsSpell()) slot.classList.add('drop');
      box.appendChild(slot);
    }
  });
  btGet('btOppBar').classList.toggle('target-glow', tFace);
  btGet('btAtkFace').classList.toggle('hidden', !tFace);   // a big, obvious button for hitting the Spirit directly
}

function btRenderHand(drawnUid, dealAll) {
  const G = battle.G, me = G.p[0], box = btGet('btHand');
  box.innerHTML = '';
  const n = me.hand.length, step = n <= 4 ? 8 : n <= 6 ? 6 : 5;
  me.hand.forEach((c, i) => {
    const w = document.createElement('div'); w.className = 'hcard';
    // the hand fans out: each card turns a little further from the middle and sits a touch lower
    const off = i - (n - 1) / 2;
    w.style.setProperty('--rot', (off * step).toFixed(1) + 'deg'); w.style.setProperty('--dy', Math.round(off * off * 1.4) + 'px');
    const ok = !battle.busy && BattleEngine.canPlay(G, 0, c.uid).ok;
    const el = btCardEl(c, (ok ? 'playable ' : 'unaffordable ') + (battle.sel && battle.sel.uid === c.uid ? 'selected ' : '') + ((drawnUid === c.uid || dealAll) && btMotionOk() ? 'deal-hide' : ''), true);
    el.addEventListener('click', () => btOnHandCard(c));
    el.addEventListener('pointerdown', e => btStartDrag(e, c));
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
  else if (playable.length) t = 'Drag a card onto the table to play it, or tap it to read it first.';
  else if (ready.length && g) t = 'An enemy 🛡️ Guard blocks the way. Attack it first.';
  else if (ready.length) t = ready.some(a => op.board.some(c => !c.shield && a.power >= c.hp))
    ? 'One of your cards can defeat an enemy card. Removing their cards is often better than hitting Spirit.'
    : 'Tap a glowing card, then pick a target.';
  else if (me.board.some(c => !c.ready)) t = 'New cards 💤 can attack next turn. End your turn when you are ready.';
  else t = 'Nothing left to do. End your turn.';
  el.textContent = t;
}

function btRender(o) { o = o || {}; btRenderKnack(); btRenderBars(); btSyncSnackBadge(); btRenderGems(); btRenderBoards(o.entering); btRenderHand(o.drawn, o.dealAll); btCoach(); }

/* ---------------- card info sheet ---------------- */
function btShowTip(c, hint) {
  const def = cardDef(c.id), tip = btGet('btTip');
  const body = c.spell
    ? `<div class="kw">✨ <b>Spell.</b> ${spellText(def)}</div><div class="kw" style="color:var(--ink-soft)">Resolves at once and does not take a board slot.</div>`
    : `<div class="kw">⚔ <b>${c.power}</b> power &nbsp; ♥ <b>${c.hp}</b>${c.hp < c.grit ? ' / ' + c.grit : ''} health</div>
    ${c.kw.map(k => `<div class="kw">${KW[k].icon} <b>${KW[k].name}.</b> ${KW[k].text}</div>`).join('') || '<div class="kw" style="color:var(--ink-soft)">No keywords.</div>'}`;
  tip.innerHTML = `<div class="t-h"><span class="ic">${cardArtHtml(def)}</span><b>${def.name}</b><small>${RARITY_LABEL[def.rarity]} · costs ${c.cost}</small></div>
    ${body}
    ${!c.spell && BattleEngine.familyOf(c.id) ? `<div class="kw">${FAMILIES[BattleEngine.familyOf(c.id)].icon} <b>${FAMILIES[BattleEngine.familyOf(c.id)].name} family.</b> Kin cards grow with their family.</div>` : ''}
    ${def.foe ? '<div class="kw">✦ <b>Unique.</b> Only opponents carry this card.</div>' : def.crafted ? '<div class="kw">＋ <b>Enhanced.</b> A sharpened version of an ordinary card.</div>' : ''}
    ${hint ? `<div class="hint">${hint}</div>` : ''}`;
  tip.classList.add('show'); battleView.classList.add('tip-open');
  btPlaceTip();
}
// The sheet sits just above your bar (measured, not hard-coded), so the ? and flag buttons are never underneath it.
function btPlaceTip() {
  const view = battleView.getBoundingClientRect(), bar = btGet('btYouBar').getBoundingClientRect();
  btGet('btTip').style.bottom = Math.max(0, view.bottom - bar.top + 6) + 'px';
}
function btHideTip() { btGet('btTip').classList.remove('show', 'interactive'); battleView.classList.remove('tip-open'); }

/* ---------------- drag a card from your hand onto the table ----------------
   Pointer events, so it works the same with a finger or a mouse. A press that moves less than DRAG_MIN px is still a
   tap (the old tap-to-read, tap-again-to-play flow is untouched). Past that, a ghost copy of the card follows the
   pointer, held a little above the fingertip so it is not hidden under it, and what is under the ghost's centre
   is the drop target: creature cards go to your side of the table (onto a slot, or the next free one), spells with no
   aim go anywhere on the table, and aimed spells go onto an enemy card. Anything else puts the card back. */
const DRAG_MIN = 8;
let btDragEndedAt = 0, btDrag = null, btDropHintShown = false;
function btStartDrag(e, c, from) {
  if (!battle || battle.busy || battle.G.over || battle.G.active !== 0 || btDrag) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  from = from || 'hand';
  if (from === 'hand' && !BattleEngine.canPlay(battle.G, 0, c.uid).ok) return;        // unaffordable cards just show why when tapped
  if (from === 'board' && !(c.ready && c.attacks === 0)) return;
  btDrag = { c, from, sx: e.clientX, sy: e.clientY, active: false, ghost: null, id: e.pointerId };
  window.addEventListener('pointermove', btDragMove);
  window.addEventListener('pointerup', btDragEnd);
  window.addEventListener('pointercancel', btDragEnd);
}
function btDragKind(c) { return !c.spell ? 'creature' : BattleEngine.spellNeedsTarget(c) ? 'aimed' : 'spell'; }
function btDragBegin() {
  const d = btDrag, c = d.c;
  if (battle.sel) { battle.sel = null; btHideTip(); btRender(); }   // drop any earlier selection (this rebuilds the hand)
  const origin = battleView.querySelector(`${d.from === 'board' ? '#btYouBoard' : '#btHand'} .card[data-uid="${c.uid}"]`);
  if (!origin) { btDragCleanup(); return; }
  d.active = true; d.origin = origin; d.kind = d.from === 'board' ? 'attack' : btDragKind(c);
  const r = origin.getBoundingClientRect(); d.w = r.width; d.h = r.height;
  const g = origin.cloneNode(true);
  g.classList.remove('playable', 'selected', 'draw'); g.classList.add('drag-ghost');
  g.style.width = r.width + 'px'; g.style.height = r.height + 'px';
  battleView.appendChild(g); d.ghost = g;
  origin.classList.add('drag-origin');
  if (d.kind === 'creature') {
    const slots = [...battleView.querySelectorAll('#btYouBoard .slot')];
    slots.forEach(s => s.classList.add('drop-zone'));
    const next = slots.find(s => !s.querySelector('.card')); if (next) next.classList.add('drop-next');
  } else if (d.kind === 'spell') battleView.querySelector('.table').classList.add('cast-zone');
  else if (d.kind === 'attack') {
    // light up everything this card may legally hit: enemy cards, and the enemy Spirit when no Guard stands in the way
    const legal = BattleEngine.legalTargets(battle.G, 0, c.uid), ids = new Set(legal.filter(t => t.kind === 'card').map(t => t.uid));
    battleView.querySelectorAll('#btOppBoard .card').forEach(x => { if (ids.has(+x.dataset.uid)) x.classList.add('targetable'); });
    if (legal.some(t => t.kind === 'spirit')) { btGet('btOppBar').classList.add('target-glow'); d.glow = true; }
    // make the attack unmistakable: a dashed aim line from the attacker to the ghost, everything that can't be hit
    // dims, and the Spirit says what a drop there does
    battleView.classList.add('attack-drag'); g.classList.add('attack-ghost');
    const line = document.createElement('div'); line.className = 'aim-line'; battleView.appendChild(line); d.line = line;
    const bv = battleView.getBoundingClientRect(); d.ox = r.left + r.width / 2 - bv.left; d.oy = r.top + r.height / 2 - bv.top;
  } else battleView.querySelectorAll('#btOppBoard .card').forEach(x => x.classList.add('targetable'));
  sfx('tap'); buzz(HAP.tap);
}
function btDragPlace(x, y) {
  const d = btDrag;
  d.ghost.style.transform = `translate(${x - d.w / 2}px, ${y - d.h * 0.95}px) scale(1.12)`;
  // what the player sees is what counts: test the ghost's centre, not the fingertip below it
  d.cx = x; d.cy = y - d.h * 0.95 + d.h / 2;
  if (d.line) {
    const bv = battleView.getBoundingClientRect(), dx = d.cx - bv.left - d.ox, dy = d.cy - bv.top - d.oy;
    d.line.style.cssText = `left:${d.ox}px;top:${d.oy}px;width:${Math.hypot(dx, dy)}px;transform:rotate(${Math.atan2(dy, dx)}rad)`;
  }
}
// Find what the ghost is over. The ghost itself ignores pointer events, so elementFromPoint sees through it.
function btDragTarget() {
  const d = btDrag, el = document.elementFromPoint(d.cx, d.cy);
  if (!el) return null;
  if (d.kind === 'creature') {
    const slot = el.closest('#btYouBoard .slot'); if (slot) return { slot, index: [...slot.parentNode.children].indexOf(slot) };
    return el.closest('#btYouRow') ? { slot: null, index: null } : null;
  }
  if (d.kind === 'attack') {
    const legal = BattleEngine.legalTargets(battle.G, 0, d.c.uid), card = el.closest('#btOppBoard .card');
    if (card) return { card, ok: legal.some(t => t.kind === 'card' && t.uid === +card.dataset.uid) };
    // anywhere above the enemy row counts as "at the opponent": drag up past their cards to hit their Spirit
    if (el.closest('#btOppBar, .divider') || d.cy < btGet('btOppBoard').getBoundingClientRect().top) return { face: true, ok: legal.some(t => t.kind === 'spirit') };
    return null;
  }
  if (d.kind === 'spell') return el.closest('.table') ? { slot: null } : null;
  const card = el.closest('#btOppBoard .card'); return card ? { card } : null;
}
function btDragHover(t) {
  const d = btDrag;
  battleView.querySelectorAll('.drop-hover, .atk-blocked').forEach(x => x.classList.remove('drop-hover', 'atk-blocked'));
  if (d.kind === 'attack' && t && t.card && t.ok === false) t.card.classList.add('atk-blocked');   // a Guard stands in the way
  if (d.line) d.line.classList.toggle('locked', !!(t && t.ok));
  if (t && t.slot) t.slot.classList.add('drop-hover');
  if (t && t.card && (t.ok !== false)) t.card.classList.add('drop-hover');
  btGet('btOppBar').classList.toggle('drop-hover', !!(t && t.face && t.ok));
}
function btDragMove(e) {
  const d = btDrag; if (!d || (d.id !== undefined && e.pointerId !== d.id)) return;
  if (!d.active) {
    if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < DRAG_MIN) return;
    btDragBegin(); if (!btDrag) return;
  }
  e.preventDefault();
  btDragPlace(e.clientX, e.clientY);
  btDragHover(btDragTarget());
}
function btDragCleanup() {
  window.removeEventListener('pointermove', btDragMove);
  window.removeEventListener('pointerup', btDragEnd);
  window.removeEventListener('pointercancel', btDragEnd);
  const d = btDrag; btDrag = null;
  if (d && d.glow && !(battle && battle.sel && battle.sel.kind === 'attack')) btGet('btOppBar').classList.remove('target-glow');
  btGet('btOppBar').classList.remove('drop-hover');
  if (d && d.ghost) d.ghost.remove();
  if (d && d.line) d.line.remove();
  battleView.classList.remove('attack-drag');
  if (d && d.origin) d.origin.classList.remove('drag-origin');
  battleView.querySelectorAll('.drop-zone, .drop-next, .drop-hover, .cast-zone, .atk-blocked').forEach(x => x.classList.remove('drop-zone', 'drop-next', 'drop-hover', 'cast-zone', 'atk-blocked'));
  battleView.querySelectorAll('#btOppBoard .card.targetable').forEach(x => { if (!battle || !battle.sel) x.classList.remove('targetable'); });
}
function btDragEnd(e) {
  const d = btDrag; if (!d || (d.id !== undefined && e && e.pointerId !== d.id)) return;
  if (!d.active) { btDragCleanup(); return; }                      // never moved far enough: it was a tap
  const cancelled = e && e.type === 'pointercancel';
  const t = cancelled ? null : btDragTarget(), c = d.c, kind = d.kind;
  btDragCleanup(); btDragEndedAt = Date.now();
  if (!battle || battle.busy || battle.G.over || battle.G.active !== 0) return;
  if (!t) {
    if (!cancelled && !btDropHintShown) { btDropHintShown = true; btToast(kind === 'attack' ? 'Drop it on an enemy card, or drag up to hit their Spirit' : kind === 'aimed' ? 'Drop it on an enemy card to aim it' : 'Drop it on your side of the table to play it'); }
    return;
  }
  if (kind === 'attack') {
    if (!t.ok) { btToast('A Guard must be attacked first'); return; }
    battle.sel = null; btHideTip();
    btDoAttack(c.uid, t.face ? { kind: 'spirit' } : { kind: 'card', uid: +t.card.dataset.uid });
    return;
  }
  battle.sel = null; btHideTip();
  if (kind === 'aimed') btDoPlay(c.uid, { kind: 'card', uid: +t.card.dataset.uid });
  else btDoPlay(c.uid, undefined, kind === 'creature' ? t.index : undefined);
}

/* ---------------- input ---------------- */
function btSelIsSpell() {
  const s = battle && battle.sel; if (!s) return false;
  const c = battle.G.p[0].hand.find(x => x.uid === s.uid);
  return !!(c && c.spell);
}
function btOnHandCard(c) {
  if (!battle || battle.busy || battle.G.over || battle.G.active !== 0) return;
  if (Date.now() - btDragEndedAt < 350) return;   // the click that follows the end of a drag is not a tap
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
  if (Date.now() - btDragEndedAt < 350) return;   // the click after a drag is not a tap
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

/* ---------------- battle effects: attacked, defended and spells ----------------
   Everything here is a short-lived element (or a Web Animations API flight) appended to the battle view or a card;
   nothing touches the board's own transforms. They are skipped under Calm motion / reduced motion (btMotionOk). */
const SPELL_FX = { 'chill': ['#bfe6ff', 'bolt'], 'overgrowth': ['#8de0a0', 'rise'], 'stone-skin': ['#d8c9a8', 'rise'], 'undertow': ['#7fd0e8', 'sweep'], 'quickstep': ['#ffe1a8', 'rise'], 'picnic': ['#ffd6a0', 'draw'], 'spark': ['#ffd36b', 'bolt'], 'thunderclap': ['#bcd8ff', 'sweep'], 'moonlit-tide': ['#7fd0e8', 'sweep'], 'starfall': ['#ffe9a8', 'bolt'],
  'rain-shower': ['#8de0a0', 'rise'], 'harvest': ['#c9b6ff', 'draw'], 'gust': ['#bfeaff', 'whoosh'], 'sunbeam': ['#ffd98a', 'rise'], 'second-wind': ['#c9f0ff', 'rise'] };
function btCenter(el) { if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, r }; }
function btFx(cls, x, y, ms, style) {
  const el = document.createElement('div'); el.className = 'fx ' + cls; el.style.left = x + 'px'; el.style.top = y + 'px';
  if (style) Object.entries(style).forEach(([k, v]) => el.style.setProperty(k, v));
  battleView.appendChild(el); setTimeout(() => el.remove(), ms); return el;
}
// Little overlays that live inside a card for a moment.
function btCardFx(cardEl, cls, ms, style) {
  if (!cardEl || !btMotionOk()) return;
  const s = document.createElement('span'); s.className = cls; if (style) Object.entries(style).forEach(([k, v]) => s.style.setProperty(k, v));
  cardEl.appendChild(s); setTimeout(() => s.remove(), ms);
}
function btSlashFx(cardEl, gold) { btCardFx(cardEl, 'fx-slash' + (gold ? ' gold' : ''), 520); }
function btShieldFx(cardEl) { btCardFx(cardEl, 'fx-shield', 700); }
function btShake(hard) {
  if (!btMotionOk()) return;
  const c = hard ? 'shake-hard' : 'shake'; battleView.classList.remove('shake', 'shake-hard'); void battleView.offsetWidth; battleView.classList.add(c);
  setTimeout(() => battleView.classList.remove(c), 340);
}
// A colour wash around the edge of the screen: red when you are hit, gold when you land one on their Spirit.
function btVignette(kind) { if (!btMotionOk()) return; const el = document.createElement('div'); el.className = 'fx fx-vig ' + kind; battleView.appendChild(el); setTimeout(() => el.remove(), 650); }
// Bar hit/heal flashes go on both the ring and the life bar.
function btSpiritFlash(who, cls, ms) {
  const k = who === 0 ? 'You' : 'Opp';
  [btGet('bt' + k + 'Spirit'), btGet('bt' + k + 'Sbar')].forEach(el => { el.classList.add(cls); setTimeout(() => el.classList.remove(cls), ms || 420); });
}
function btSpellFx(def, e) {
  return new Promise(res => {
    if (!btMotionOk()) return res();
    const [col, kind] = SPELL_FX[def.spell] || ['#ffe9a8', 'bolt'], mine = e.who === 0;
    const from = btCenter(btGet(mine ? 'btHand' : 'btOppHand')), tgtEl = e.target ? document.querySelector(`#battleView .card[data-uid="${e.target.uid}"]`) : null;
    const enemyRow = btCenter(btGet(mine ? 'btOppBoard' : 'btYouBoard')), ownRow = btCenter(btGet(mine ? 'btYouBoard' : 'btOppBoard'));
    const to = tgtEl ? btCenter(tgtEl) : kind === 'draw' ? btCenter(btGet(mine ? 'btHand' : 'btOppHand')) : (kind === 'sweep' || kind === 'bolt') ? enemyRow : ownRow;
    if (!from || !to) return res();
    const orb = btFx('fx-orb', 0, 0, 1200, { '--c': col });
    const view = battleView.getBoundingClientRect();
    const arrive = () => {
      orb.remove();
      btFx('fx-burst', to.x, to.y, 600, { '--c': col });
      btFx('fx-wash', 0, 0, 700, { '--c': col, '--x': ((to.x - view.left) / view.width * 100) + '%', '--y': ((to.y - view.top) / view.height * 100) + '%' });
      if (kind === 'sweep' && enemyRow) btFx('fx-sweep', enemyRow.r.left, enemyRow.y, 700, { '--c': col, width: enemyRow.r.width + 'px' });
      if (kind === 'bolt') btFx('fx-bolt', to.x, view.top, 420, { '--c': col, height: Math.max(0, to.y - view.top) + 'px' });
      if (kind === 'rise' || kind === 'draw') {
        const cards = kind === 'draw' ? [btGet(mine ? 'btHand' : 'btOppHand')] : [...battleView.querySelectorAll(mine ? '#btYouBoard .card' : '#btOppBoard .card')];
        cards.forEach(cEl => { const r = cEl.getBoundingClientRect(); for (let i = 0; i < 5; i++) btFx('fx-rise', r.left + Math.random() * r.width, r.top + r.height * 0.7, 900, { '--c': col, '--d': (i * 70) + 'ms' }).textContent = kind === 'draw' ? '✦' : (def.spell === 'rain-shower' ? '＋' : '✦'); });
      }
      if (kind === 'whoosh') btFx('fx-whoosh', to.x, to.y, 600, { '--c': col });
      if (btMotionOk() && (kind === 'bolt' || kind === 'sweep')) btShake(false);
      setTimeout(res, 260);
    };
    const mid = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - 50 };
    const a = orb.animate([
      { transform: `translate(${from.x}px, ${from.y}px) scale(.6)` },
      { transform: `translate(${mid.x}px, ${mid.y}px) scale(1.15)`, offset: 0.5 },
      { transform: `translate(${to.x}px, ${to.y}px) scale(.9)` }
    ], { duration: 420 * (prefs.fast ? 0.5 : 1), easing: 'ease-in-out', fill: 'forwards' });
    a.onfinish = arrive; a.oncancel = arrive;
    setTimeout(() => res(), 1500);
  });
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
        btSpiritFlash(e.who === 0 ? 1 : 0, 'hit', 400); btFloater(bar, '-' + e.dmg, 'dmg'); btImpact(bar, 3);
        btVignette(e.who === 0 ? 'gold' : 'red'); btShake(e.dmg >= 3);
        if (e.who === 0) { sfx('round'); buzz(HAP.round); } else { sfx('soft'); buzz(HAP.soft); }
      } else {
        const t = document.querySelector(`#battleView .card[data-uid="${e.target.uid}"]`);
        if (t) {
          t.classList.add('hurt-flash'); btFloater(t, e.blocked ? '🛡️ blocked' : '-' + e.dmg, e.blocked ? 'blk' : 'dmg');
          if (e.blocked) btShieldFx(t); else { btImpact(t, 4); btSlashFx(t); btShake(e.dmg >= 3); }
        }
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
      await btWait(e.who === 0 ? 260 : 480);
      await btSpellFx(def, e);                       // the spell's own light show: an orb flies to the target and bursts
      await btWait(e.who === 0 ? 160 : 240);
    } else if (e.type === 'zap') {
      const t = document.querySelector(`#battleView .card[data-uid="${e.uid}"]`);
      if (t) { if (e.blocked) btShieldFx(t); else btSlashFx(t, true); }
      if (t) { t.classList.add('hurt-flash'); btFloater(t, e.pierce ? '🌠' : e.blocked ? '🫧 blocked' : (({ thorns: '🌵 -', sting: '🐝 -', chill: '❄️ -' })[e.tag] || '✨ -') + e.dmg, e.blocked ? 'blk' : 'dmg'); if (!e.blocked) btImpact(t, 5); }
      sfx('tap'); await btWait(260);
    } else if (e.type === 'bounce') {
      const t = document.querySelector(`#battleView .card[data-uid="${e.card.uid}"]`);
      if (t) { t.classList.add('bounce-away'); btFloater(t, '🍃 back to hand', 'blk'); }
      await btWait(420); btRender();
    } else if (e.type === 'buff' || e.type === 'mendcard' || e.type === 'readied') {
      const t = document.querySelector(`#battleView .card[data-uid="${e.uid}"]`);
      if (t) btFloater(t, e.type === 'buff' ? (e.skin ? '🧱 +2♥ +1⚔' : e.rally ? '📯 +1 ⚔' : '🌞 +1 ⚔') : e.type === 'mendcard' ? `+${e.amt || 1} ♥` : '🌬️ ready', 'heal');
      await btWait(120);
    } else if (e.type === 'summon') {
      btRender({ entering: e.card.uid });
      const t = document.querySelector(`#battleView .card[data-uid="${e.card.uid}"]`);
      if (t) btFloater(t, '🌱 grows', 'heal');
      if (e.who === 0) sfx('play'); else sfx('flip');
      await btWait(340);
    } else if (e.type === 'kin') {
      btRender();
      const t = document.querySelector(`#battleView .card[data-uid="${e.uid}"]`);
      if (t) btFloater(t, `🤝 +${e.n}/+${e.n}`, 'heal');
      await btWait(260);
    } else if (e.type === 'lull') {
      btRender();
      const t = document.querySelector(`#battleView .card[data-uid="${e.uid}"]`);
      if (t) btFloater(t, '😴 rests', 'blk');
      sfx('soft'); await btWait(300);
    } else if (e.type === 'knack') {
      const k = BattleEngine.KNACKS[e.id];
      btRender(); btSpellFlash({ icon: k.icon, name: k.name, rarity: 'rare' });
      btSetMsg(`You use ${k.icon} ${k.name}`);
      sfx('rare'); buzz(HAP.play); await btWait(560);
    } else if (e.type === 'shieldup') {
      btRender();
      const t = document.querySelector(`#battleView .card[data-uid="${e.uid}"]`);
      if (t) { btShieldFx(t); btFloater(t, '🫧 shield', 'heal'); }
      await btWait(160);
    } else if (e.type === 'tide') {
      btSetMsg('🌊 The tide washes in!');
      battleView.classList.add('tide-wash'); setTimeout(() => battleView.classList.remove('tide-wash'), 900);
      sfx('soft'); await btWait(520);
    } else if (e.type === 'spirit') {
      const bar = btGet(e.who === 0 ? 'btYouSpirit' : 'btOppSpirit');
      if (e.echo || e.spell) { btSpiritFlash(e.who, 'hit', 400); btFloater(bar, (e.spell ? '✨ -' : '🔔 -') + (-e.delta), 'dmg'); btVignette(e.who === 0 ? 'red' : 'gold'); await btWait(300); }
      else if (e.delta > 0) { btSpiritFlash(e.who, 'heal', 500); btFloater(bar, '+' + e.delta, 'heal'); await btWait(240); }
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
      btRender({ drawn: e.card.uid });
      await btDealOne(e.card.uid, 520); await btWait(120);
    } else if (e.type === 'draw' && e.who === 1) {
      btRenderBars();
      const hand = btGet('btOppHand'), back = hand.lastElementChild;
      if (back && btMotionOk()) { back.classList.add('deal-hide'); await btFlyBack(btGet('btOppPile').querySelector('.cback:last-of-type') || btGet('btOppPile'), back, 380, false); back.classList.remove('deal-hide'); }
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

async function btDoPlay(uid, target, slotIndex) {
  const token = battle.token; battle.busy = true;
  const r = BattleEngine.playCard(battle.G, 0, uid, target);
  if (r && !r.ok) btToast(r.why);
  if (r && r.ok && typeof slotIndex === 'number') {      // a card dragged onto a particular slot lands there (board order is cosmetic)
    const board = battle.G.p[0].board, last = board[board.length - 1];
    if (last && last.uid === uid) { board.pop(); board.splice(Math.min(slotIndex, board.length), 0, last); }
  }
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
  return btOpponentRound(token);
}
// Their whole turn, then the table is yours again. Used after you end yours, and for their opening turn when they won the toss.
async function btOpponentRound(token) {
  const G = battle.G;
  battle.busy = true; battle.sel = null; btHideTip(); btRender();
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
  endCard.className = 'overlay-card end-card';
  const turns = Math.ceil(G.turn / 2) + 1;
  btGet('battleEndGrid').classList.add('hidden');

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
    battleEndStats.innerHTML = `<span class="end-prize-k">Prize</span><br><b>${cardArtHtml(rewardDef)} ${rewardDef.name}</b> <span class="rarity-tag rt-${rewardDef.rarity}" style="margin:4px 0 0">${RARITY_LABEL[rewardDef.rarity]}</span>`;
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
  btRenderEndStats(G, won, yielded, turns, npc);
  if (firstShow && !npc.puzzle) { battle.recorded = true; recordBattle(won, yielded, state.ownedCards.slice(ownedBefore)); }
  updateHud();
  battleEndOverlay.classList.remove('hidden');
}

// The stats half of the results window: a grid of what happened this match, shown above whatever the prize or summary
// text says, so there is one window with both. Hidden for puzzles (nothing to count) and for stepping away.
function btRenderEndStats(G, won, yielded, turns, npc) {
  const box = btGet('battleEndGrid');
  if (npc.puzzle || yielded) { box.classList.add('hidden'); return; }
  const st = battle.stats || { played: 0, dealt: 0, taken: 0, ko: 0 }, me = G.p[0];
  const tiles = [['⏱️', turns, 'Turns'], ['❤️', `${Math.max(0, me.spirit)}/${me.maxSpirit}`, 'Your Spirit'], ['🃏', st.played, 'Cards played'],
                 ['⚔️', st.dealt, 'Damage dealt'], ['💥', st.ko, 'Foes cleared'], ['🛡️', st.taken, 'Damage taken']];
  box.innerHTML = tiles.map(([ic, v, l], i) => `<div class="end-stat" style="--n:${i}"><span class="es-ic">${ic}</span><b>${v}</b><span class="es-l">${l}</span></div>`).join('');
  box.classList.remove('hidden');
}

function closeBattle(retry) {
  if (battle && battle.closing) return;                 // a second tap on Continue while the fade is running
  const fromDungeon = !!(battle && battle.npc && battle.npc.dungeon), fromPuzzle = !!(battle && battle.npc && battle.npc.puzzle), fromCup = !!(battle && battle.npc && battle.npc.cup),
        fromChallenge = !!(battle && battle.npc && battle.npc.challenge);
  if (battle) { battle.ended = true; battleToken++; }
  if (retry && battle) { battleEndOverlay.classList.add('hidden'); btGet('mulliganOverlay').classList.add('hidden'); startBattle(battle.npc); return; }
  if (battle) battle.closing = true;
  // The results window stays up while the screen fades out behind it to the page colour (about half a second), the town
  // is swapped in while covered, then it fades back (v1.75.0, the "fade through" exit). If a fade is somehow already
  // running we swap at once rather than skip it, since this is the only place a battle ever closes.
  const leave = () => {
    battleEndOverlay.classList.add('hidden');
    btGet('mulliganOverlay').classList.add('hidden');
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
  };
  if (doorFading) leave(); else withDoorFade(leave, 430, 560);
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
    <b>The world joins in</b> (for both sides): ☀️ clear Bloom +1 power, ☁️ cloud Shield +1 health, 🌧️ rain Mend heals +1, ⛈️ storm Swift +1 power, 🌙 night Echo +1, and each district is home turf for its card family (+1 health). In ❄️ snow bosses are tougher but pay better.<br><br>
    <b>✨ Your Knack</b> is a free once-per-match power you pick on the keep-this-hand screen. Tap its round button by your bar when it glows.<br><br>
    <b>Who goes first</b> comes from a coin call or dice roll before the match. Going second means an extra card and +1 energy on your first two turns.<br><br>
    ${Object.values(KW).map(k => `${k.icon} <b>${k.name}.</b> ${k.text}`).join('<br>')}<br><br>
    <i>Drag a card onto the table to play it, or tap it to read it and tap it again to play it. To attack, tap a glowing card then a target (or the red Attack Spirit button), or drag it onto an enemy card or up past their cards.</i>`;
  ov.classList.remove('hidden');
}

btGet('btEnd').addEventListener('click', () => { if (!battle || battle.busy || battle.G.over || battle.G.active !== 0) return; ensureAudio(); btPlayerEnd(); });
function btAttackFace() {
  if (!battle || battle.busy || !battle.sel || battle.sel.kind !== 'attack') return;
  if (!BattleEngine.legalTargets(battle.G, 0, battle.sel.uid).some(t => t.kind === 'spirit')) { btToast('A Guard must be attacked first'); return; }
  const u = battle.sel.uid; battle.sel = null; btHideTip(); btDoAttack(u, { kind: 'spirit' });
}
btGet('btOppBar').addEventListener('click', btAttackFace);
btGet('btAtkFace').addEventListener('click', btAttackFace);
btGet('btHelp').addEventListener('click', btShowHelp);
btGet('btYield').addEventListener('click', btYield);
btGet('btKnack').addEventListener('click', () => { ensureAudio(); if (btGet('btTip').classList.contains('interactive')) btHideTip(); else btShowKnackTip(); });
btGet('btHelpClose').addEventListener('click', () => { btGet('btHelpOverlay').classList.add('hidden'); btOpponentOpens(); });
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
  if (battle && inBattle && btGet('btTip').classList.contains('interactive') && !e.target.closest('#btTip') && !e.target.closest('#btKnack')) btHideTip();   // tap away from the Knack sheet
  if (!battle || !inBattle || !battle.sel) return;
  if (e.target.closest('#battleView .card') || e.target.closest('#btOppBar') || e.target.closest('#btAtkFace') || e.target.closest('#btTip') || e.target.closest('#btEnd')) return;
  battle.sel = null; btHideTip(); btRender();
}, true);

function ownedCardCounts() {
  const counts = {};
  state.ownedCards.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
  return counts;
}


