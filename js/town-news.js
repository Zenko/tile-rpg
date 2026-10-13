/* ============================================================
   TOWN NEWS (build 250): five small systems that make the town feel like it notices you and changes day to day.
   None of them use AI; everything is templates, seeds and the stats the game already keeps.
     1. Gossip           neighbours talk about what you did lately (bumpStat -> gossipNote records a "deed"; npcGreeting asks
                         gossipGreeting for a line). Someone in the same district saw it; elsewhere they "heard" it.
     2. Weather moments  when the weather turns there is a chance of a short "moment" (a koi run in the rain, a rainbow after
                         it...) that bends one perk for a few minutes. weatherFx() merges momentFx() into the weather's own perks,
                         so every system that already reads weatherFx() picks it up with no change of its own.
     3. The Dream Gazette one front page a day, seeded by the date so every tester reads the same story. Opened from the
                         Journal's Today page or the weather board; announced once a day.
     4. Town goal        one shared goal a week (catch 60 fish, bake 30 loaves...). The town's total is your share + a steady
                         trickle from your neighbours (up to half the goal by the end of the week) + other testers' shares from
                         Firestore (community/{week}/folks/{uid}, needs the rule in HANDOFF §1a; without it you and your
                         neighbours can still finish it). Halfway and full rewards are claimed from the goal's sheet.
     5. Visitors         on most days a traveller turns up in one district: Moth the Pedlar sells three cards, Quill the
                         Wanderer brings a one-family deck and gives a card the first time you beat it. syncVisitor() keeps one
                         isVisitor NPC in that district (like syncAtlas), openTalk hands it to openVisitor().
   Saved in state.progress.townNews ({ deeds, moment, comm, visit, paper }). Hooks into other files are all typeof-guarded,
   and nothing at the top level reaches into another file (HANDOFF §9's load-order rule).
   ============================================================ */
const TN = { bootAt: Date.now(), tickMs: 4000, announceAfterMs: 15000 };
const TN_CAST = [CAST.guide.name, CAST.baker.name, CAST.gardener.name, CAST.grainSeller.name, CAST.threadSeller.name, CAST.spiceSeller.name, CAST.tinker.name, CAST.netMender.name, CAST.glassKeeper.name, CAST.nightVendor.name];
function tnState() {
  const p = state.progress;
  if (!p.townNews || typeof p.townNews !== 'object') p.townNews = {};
  const t = p.townNews;
  if (!Array.isArray(t.deeds)) t.deeds = [];
  return t;
}
const tnPick = (rng, arr) => arr[Math.min(arr.length - 1, Math.floor(rng() * arr.length))];
function tnDistrictName(k) { return (k && k !== 'pw' && DISTRICTS[k] && DISTRICTS[k].name) || 'somewhere strange'; }
function tnQuiet() { return !!prefs.cozy; }   // Cozy mode keeps everything working but drops the toasts

/* ---------------- 1. GOSSIP ----------------
   A deed is { s: stat, n, d: district, at, told: [neighbour keys] }. The same deed in the same district within mergeMs grows
   instead of adding a line ("caught 3 fish"), and a neighbour only brings each deed up once. */
const GOSSIP = { keep: 12, freshMs: 6 * 3600 * 1000, mergeMs: 30 * 60 * 1000, chance: 0.5, toldCap: 10 };
// GOSSIP_DEEDS: in content/story.js (the game's words and data, kept apart from the code)
// Called from bumpStat (js/quests.js) for every stat; only the ones above are worth talking about.
function gossipNote(stat, n) {
  if (!GOSSIP_DEEDS[stat] || !state || !state.progress) return;
  const t = tnState(), now = Date.now(), d = state.currentDistrict, last = t.deeds[0];
  if (last && last.s === stat && last.d === d && now - last.at < GOSSIP.mergeMs) { last.n += n || 1; last.at = now; last.told = []; }
  else t.deeds.unshift({ s: stat, n: n || 1, d, at: now, told: [] });
  if (t.deeds.length > GOSSIP.keep) t.deeds.length = GOSSIP.keep;
}
// The line a neighbour says about your freshest deed they have not mentioned yet, or null. Marks it told.
function gossipLine(f, now) {
  if (!f || f.isBoss || f.isRival || f.isAtlas || f.isVisitor || f.signature) return null;
  now = now || Date.now();
  const t = tnState(), who = neighborKey(f);
  const deed = t.deeds.filter(x => GOSSIP_DEEDS[x.s] && now - x.at < GOSSIP.freshMs && !(x.told || []).includes(who))
    .sort((a, b) => (GOSSIP_DEEDS[b.s].big ? 1 : 0) - (GOSSIP_DEEDS[a.s].big ? 1 : 0) || b.at - a.at)[0];
  if (!deed) return null;
  const did = GOSSIP_DEEDS[deed.s].did(deed.n), rng = seeded('gossip-' + deed.at + who);
  let line;
  if (deed.d === state.currentDistrict) {
    line = tnPick(rng, [`I saw you ${did} earlier. Nicely done.`, `Was that you who ${did}? The whole lane is talking about it.`, `Everyone round here saw you ${did}. You are the talk of the place.`]);
  } else {
    const data = ensureDistrictData(state.currentDistrict);
    const others = (data.npcs || []).filter(n => n !== f && !n.isBoss && !n.isRival && !n.isAtlas && !n.isVisitor && !n.defeated).map(n => n.name);
    const other = others.length ? tnPick(rng, others) : tnPick(rng, TN_CAST), where = tnDistrictName(deed.d);
    line = tnPick(rng, [`Word from ${where} is that you ${did}.`, `${other} told me you ${did} over in ${where}. Is it true?`, `A little bird from ${where} says you ${did}. Is that so?`]);
  }
  deed.told = (deed.told || []).concat(who).slice(-GOSSIP.toldCap);
  if (typeof teleInc === 'function') teleInc('news.gossip');
  setTimeout(() => bumpStat('gossipHeard', 1), 0);   // after the greeting is shown, so the quest toast does not cut across it
  return line;
}
// What npcGreeting (js/npc-brain.js) asks: a coin flip first, so gossip is a nice surprise, not every greeting.
function gossipGreeting(f) { return Math.random() < GOSSIP.chance ? gossipLine(f) : null; }

// MOMENTS: in content/story.js (the game's words and data, kept apart from the code)
const MOMENT = { chance: 0.5, rainbowChance: 0.8, ms: 4 * 60 * 1000 };
// Called by maybeRollWeather (js/town-render-weather.js) when the weather really changes. `roll` is for tests.
function momentOnWeather(prev, cur, roll) {
  const r = roll != null ? roll : Math.random();
  const id = Object.keys(MOMENTS).find(k => {
    const m = MOMENTS[k];
    return m.weather === cur && (m.after ? m.after.includes(prev) && r < MOMENT.rainbowChance : !m.after && r < MOMENT.chance);
  });
  if (!id) return null;
  const t = tnState(), m = MOMENTS[id];
  t.moment = { id, ends: Date.now() + MOMENT.ms };
  bumpStat('moments', 1);
  const name = momentName(m);
  logEvent(m.icon, `${name}: ${m.text}`);
  if (!tnQuiet() && !inBattle && !document.hidden) setTimeout(() => toast(`${m.icon} ${name}! ${m.text}`), 2200);   // after the weather's own toast; the Journal log keeps it otherwise
  if (typeof teleInc === 'function') teleInc('news.moment.' + id);
  momentVisual();
  return id;
}
function momentName(m) { return m.night && skyPhase().isNight ? m.night : m.name; }
// The moment happening now, or null.
function momentNow() {
  const t = state && state.progress && state.progress.townNews, mo = t && t.moment, m = mo && MOMENTS[mo.id];
  if (!m || Date.now() >= mo.ends || weatherNow() !== m.weather) return null;
  return m;
}
function momentFx() { const m = momentNow(); return m ? m.fx : null; }
function momentMinsLeft() { const t = tnState(); return t.moment ? Math.max(1, Math.ceil((t.moment.ends - Date.now()) / 60000)) : 0; }
// The rainbow is one static gradient arc over the map that fades in and out (opacity only, HANDOFF §9's animation rules).
function momentVisual() {
  const view = typeof townView !== 'undefined' ? townView : null; if (!view) return;   // #townGrid, the .town-view (js/town-render-weather.js)
  let el = view.querySelector('.tn-rainbow');
  const on = !!momentNow() && tnState().moment.id === 'rainbow';
  if (on && !el) { el = document.createElement('div'); el.className = 'tn-rainbow'; el.setAttribute('aria-hidden', 'true'); view.appendChild(el); requestAnimationFrame(() => el.classList.add('on')); }
  else if (!on && el) { el.classList.remove('on'); setTimeout(() => el.remove(), 2600); }
}

// GAZETTE_STORIES: in content/story.js (the game's words and data, kept apart from the code)
function gazetteToday(day) {
  day = day || todayKey();
  const rng = seeded('gazette-' + day), st = tnPick(rng, GAZETTE_STORIES);
  const a = tnPick(rng, TN_CAST); let b = tnPick(rng, TN_CAST); if (b === a) b = TN_CAST[(TN_CAST.indexOf(a) + 3) % TN_CAST.length];
  const dist = tnDistrictName(tnPick(rng, Object.keys(DISTRICTS))), fam = FAMILIES[tnPick(rng, Object.keys(FAMILIES))].name;
  const fill = s => s.replace(/\{a\}/g, a).replace(/\{b\}/g, b).replace(/\{d\}/g, dist).replace(/\{s\}/g, seasonDef().name.toLowerCase()).replace(/\{f\}/g, fam);
  const h = fill(st.h);
  return { h: h.charAt(0).toUpperCase() + h.slice(1), b: fill(st.b) };
}
function gazetteExtras() {
  const out = [], ev = eventNow(), sd = seasonDef();
  out.push(`${ev.icon} <b>${escapeHtml(ev.name)}</b>: ${escapeHtml(ev.text)}`);
  const m = momentNow(); if (m) out.push(`${m.icon} <b>${escapeHtml(momentName(m))}</b> right now, for about ${momentMinsLeft()} more min.`);
  const g = communityGoal(), c = communityTotals();
  out.push(`${g.icon} <b>Town goal:</b> ${escapeHtml(g.name)} · ${c.total} of ${g.goal} ${g.unit} so far.`);
  const v = visitorToday(); if (v) out.push(`${v.def.icon} <b>Travellers:</b> ${escapeHtml(v.def.name)} was seen heading for ${escapeHtml(tnDistrictName(v.district))}.`);
  out.push(`${sd.icon} ${escapeHtml(sd.name)}, ${seasonDaysLeft()} day${seasonDaysLeft() === 1 ? '' : 's'} left.`);
  return out;
}
function gazetteHtml() {
  const p = gazetteToday(), date = new Date().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
  return `<div class="tn-paper"><small class="tn-date">${escapeHtml(date)}</small><h3 class="tn-head">${escapeHtml(p.h)}</h3><p class="tn-body">${escapeHtml(p.b)}</p>
    <div class="tn-also"><small>Also today</small>${gazetteExtras().map(x => `<p>${x}</p>`).join('')}</div></div>`;
}
function gazetteRead() { const t = tnState(); return t.paper === todayKey(); }
function openGazette() {
  const t = tnState();
  if (t.paper !== todayKey()) { t.paper = todayKey(); bumpStat('papersRead', 1); if (typeof teleInc === 'function') teleInc('news.paper'); }
  showProp('📰', 'The Dream Gazette', { html: gazetteHtml() }, []);
  showTipOnce('townnews');
}

/* ---------------- 4. THE TOWN GOAL ----------------
   Your share is the goal's stat now minus where it stood when you first saw this week's goal (comm.base). */
const COMMUNITY_GOALS = [
  { id: 'fish',    stat: 'fishCaught',     icon: '🎣', name: 'Fill the harbour nets',        unit: 'fish',       goal: 60 },
  { id: 'crops',   stat: 'cropsHarvested', icon: '🌻', name: 'A bumper harvest',             unit: 'crops',      goal: 120 },
  { id: 'wins',    stat: 'battlesWon',     icon: '⚔️', name: 'A week of friendly matches',   unit: 'wins',       goal: 40 },
  { id: 'bread',   stat: 'breadBaked',     icon: '🍞', name: 'Bread for every table',        unit: 'loaves',     goal: 30 },
  { id: 'spirits', stat: 'spiritsMet',     icon: '👻', name: 'Welcome the wandering spirits', unit: 'spirits',   goal: 50 },
  { id: 'acts',    stat: 'townActs',       icon: '🎈', name: 'Liven up the town',            unit: 'good deeds', goal: 150 },
  { id: 'finds',   stat: 'cardsFound',     icon: '🍂', name: 'Sweep up the lost cards',      unit: 'cards',      goal: 80 },
];
const COMMUNITY = { npcShare: 0.5, half: 30, full: 80, fullRarity: 'super', pushMs: 2 * 60 * 1000, fetchMs: 10 * 60 * 1000, coll: 'community' };
function communityGoal(wk) { return tnPick(seeded('community-' + (wk || weekKey())), COMMUNITY_GOALS); }
function communityState() {
  const t = tnState(), wk = weekKey(), g = communityGoal(wk);
  if (!t.comm || t.comm.wk !== wk || t.comm.id !== g.id) t.comm = { wk, id: g.id, base: state.progress.totals[g.stat] || 0, half: false, full: false, others: 0, folks: 0, fetchedAt: 0, pushedAt: 0, pushedN: -1 };
  return t.comm;
}
function communityMine() { const c = communityState(), g = communityGoal(); return Math.max(0, (state.progress.totals[g.stat] || 0) - c.base); }
// How far through the week we are (0..1). weekKey() (js/quests.js) turns over at midnight going into Saturday, so Saturday is day 0 here.
function communityWeekFrac(now) { const d = new Date(now || Date.now()); return Math.min(1, ((d.getDay() + 1) % 7 + (d.getHours() + d.getMinutes() / 60) / 24) / 7); }
function communityTotals(now) {
  const c = communityState(), g = communityGoal(), mine = communityMine();
  const npcs = Math.floor(g.goal * COMMUNITY.npcShare * communityWeekFrac(now)), others = Math.max(0, c.others || 0);
  const total = Math.min(g.goal, mine + npcs + others);
  return { mine, npcs, others, folks: c.folks || 0, total, frac: total / g.goal };
}
function communityClaimable() { const c = communityState(), f = communityTotals().frac; return (!c.half && f >= 0.5) || (!c.full && f >= 1); }
function communityClaim() {
  const c = communityState(), g = communityGoal(), f = communityTotals().frac;
  if (!c.half && f >= 0.5) {
    c.half = true; addPebbles(COMMUNITY.half, 'community'); saveState();
    toast(`${g.icon} Halfway there! The town thanks you: +${COMMUNITY.half} 🫧`);
    logEvent(g.icon, `The town goal "${g.name}" is halfway done. +${COMMUNITY.half} ${GAME.currency.many}.`);
  }
  if (!c.full && f >= 1) {
    c.full = true; addPebbles(COMMUNITY.full, 'community');
    const cid = randomCardId(COMMUNITY.fullRarity);
    state.ownedCards.push(cid); noteCardsFound(1); bumpPill('pillCards'); saveState(); updateHud();
    bumpStat('townGoals', 1);
    logEvent(g.icon, `The whole town finished "${g.name}" together. +${COMMUNITY.full} ${GAME.currency.many} and a card.`);
    showCardReveal(cid, `${g.icon} The town goal is done! +${COMMUNITY.full} 🫧`, true);
  }
}
function communityHtml() {
  const g = communityGoal(), c = communityState(), t = communityTotals(), pct = Math.round(t.frac * 100);
  const seg = (n, cls, label) => n > 0 ? `<i class="${cls}" style="width:${Math.max(1.5, n / g.goal * 100).toFixed(1)}%" title="${label}"></i>` : '';
  const online = typeof cloudReady !== 'undefined' && cloudReady;
  return `<p class="tn-goal-name">${escapeHtml(g.name)}</p>
    <div class="tn-goal-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">${seg(t.mine, 'me', 'You')}${seg(t.npcs, 'npc', 'Neighbours')}${seg(t.others, 'oth', `Other ${GAME.player.lowerMany}`)}</div>
    <p class="tn-goal-num"><b>${t.total} of ${g.goal}</b> ${escapeHtml(g.unit)} · ${pct}%</p>
    <ul class="tn-goal-key"><li><i class="me"></i>You: ${t.mine}</li><li><i class="npc"></i>Your neighbours: ${t.npcs}</li><li><i class="oth"></i>Other ${GAME.player.lowerMany}: ${online ? `${t.others}${t.folks ? ` (${t.folks})` : ''}` : 'offline'}</li></ul>
    <p class="tn-goal-pay">Halfway: +${COMMUNITY.half} 🫧 ${c.half ? '✓' : ''}<br>Done: +${COMMUNITY.full} 🫧 and a card ${c.full ? '✓' : ''}</p>
    <p class="jsoft">A new goal every week. Your neighbours chip in a little every day; the rest is up to you and the other ${GAME.player.lowerMany}.</p>`;
}
function openCommunity() {
  communityFetch(true);
  const can = communityClaimable();
  showProp(communityGoal().icon, 'This week’s town goal', { html: communityHtml() }, can ? [{ label: '🎁 Claim the town’s thanks', run: communityClaim }] : []);
  showTipOnce('towngoal');
}
// Firestore: one small anonymous doc per tester per week ({ n, goal, at }), summed by everyone. Respects the anonymous-stats switch.
function communityCloudOk() { return typeof cloudReady !== 'undefined' && cloudReady && typeof cloudDb !== 'undefined' && cloudDb && typeof cloudUser !== 'undefined' && cloudUser && (typeof statsSharingOn !== 'function' || statsSharingOn()); }
function communityPush(force) {
  if (!communityCloudOk()) return;
  const c = communityState(), n = communityMine(), now = Date.now();
  if (!force && (n === c.pushedN || now - c.pushedAt < COMMUNITY.pushMs)) return;
  c.pushedAt = now; c.pushedN = n;
  try { cloudDb.collection(COMMUNITY.coll).doc(c.wk).collection('folks').doc(cloudUser.uid).set({ n, goal: c.id, at: now }).catch(() => {}); } catch (e) { /* offline or no rule yet: the goal still works without it */ }
}
function communityFetch(force) {
  if (!communityCloudOk()) return;
  const c = communityState(), now = Date.now();
  if (!force && now - c.fetchedAt < COMMUNITY.fetchMs) return;
  c.fetchedAt = now;
  try {
    cloudDb.collection(COMMUNITY.coll).doc(c.wk).collection('folks').get().then(snap => {
      let sum = 0, folks = 0;
      snap.docs.forEach(d => { const x = d.data() || {}; if (d.id !== cloudUser.uid && x.goal === c.id) { sum += Math.max(0, Math.min(10000, Math.floor(Number(x.n) || 0))); folks++; } });
      const cc = communityState(); if (cc.wk === c.wk) { cc.others = sum; cc.folks = folks; saveState(); }
    }).catch(() => {});
  } catch (e) { /* same as above */ }
}

// VISITORS: in content/world.js (the game's words and data, kept apart from the code)
const VISIT = { chance: 0.6, minLevel: 2, prices: { rare: 25, ultra: 70, super: 150 }, winPebbles: 12, prizeRarity: 'ultra' };
function visitorToday(day) {
  day = day || todayKey();
  if (ensureLevel().level < VISIT.minLevel) return null;
  const rng = seeded('visitor-' + day);
  if (rng() >= VISIT.chance) return null;
  const kind = rng() < 0.5 ? 'pedlar' : 'wanderer';
  const open = Object.keys(DISTRICTS).filter(k => districtUnlocked(k));
  const district = tnPick(rng, open.length ? open : ['square']), fam = tnPick(rng, Object.keys(FAMILIES));
  const stock = ['rare', 'ultra', 'super'].map(r => { const pool = cardPool(r).filter(c => !c.spell); return { id: pool[Math.floor(rng() * pool.length)].id, r, price: VISIT.prices[r] }; });
  return { kind, district, fam, stock, def: VISITORS[kind], day };
}
function visitState() {
  const t = tnState(), day = todayKey();
  if (!t.visit || t.visit.day !== day) t.visit = { day, sold: {}, beaten: false, announced: false };
  return t.visit;
}
// Keeps today's visitor standing in their district while you are there, and nobody anywhere else. Same shape as syncAtlas().
function syncVisitor() {
  if (inBattle || inScene || talkTo || !state || !state.districtData) return false;
  const v = visitorToday(), here = v && v.district === state.currentDistrict ? state.currentDistrict : null, id = v ? 'visitor-' + v.kind : null;
  let changed = false;
  Object.keys(state.districtData).forEach(k => {
    const d = state.districtData[k]; if (!d || !Array.isArray(d.npcs)) return;
    const i = d.npcs.findIndex(n => n.isVisitor && (k !== here || n.id !== id));
    if (i >= 0) { d.npcs.splice(i, 1); if (k === state.currentDistrict) changed = true; }
  });
  if (here) {
    const d = ensureDistrictData(here);
    if (!d.npcs.some(n => n.isVisitor)) {
      const s = pickSpot(getMap(here), occupiedSet(d), d, { isBoss: false });
      d.npcs.push({ id, name: v.def.name, icon: v.def.icon, isVisitor: v.kind, x: s.x, y: s.y, homeX: s.x, homeY: s.y,
                    deck: [], profile: { level: 'normal', spirit: 20 }, rewardCard: null, defeated: false, isBoss: false, justArrived: true });
      changed = true;
      const vs = visitState();
      if (!vs.announced) {
        vs.announced = true;
        logEvent(v.def.icon, `${v.def.name} is visiting ${tnDistrictName(here)} today.`);
        if (!tnQuiet()) setTimeout(() => toast(`${v.def.icon} ${v.def.name} has come to ${tnDistrictName(here)} for the day.`), 1200);
        if (typeof teleInc === 'function') teleInc('news.visitor.' + v.kind);
      }
    }
  }
  if (changed) saveState();
  return changed;
}
function openVisitor(f) {
  const v = visitorToday(); if (!v) return;
  // No noteMet(): a traveller is not a neighbour, so they never join the companion or friendship lists.
  const vs = visitState(); if (!vs.met) { vs.met = true; bumpStat('visitorsMet', 1); }
  showTipOnce('visitors');
  if (v.kind === 'pedlar') openPedlar(v); else openWanderer(v);
}
function openPedlar(v) {
  const vs = visitState(), peb = state.progress.pebbles;
  const rows = v.stock.map((s, i) => {
    const def = cardDef(s.id), owned = state.ownedCards.filter(id => BattleEngine.baseIdOf(id) === s.id).length;
    return `<div class="tn-stock${vs.sold[i] ? ' sold' : ''}"><span class="tn-st-art">${cardArtHtml(def)}</span><span class="tn-st-t"><b>${escapeHtml(def.name)}</b><small>${RARITY_LABEL[def.rarity]} · ${owned ? `you own ${owned}` : 'new to you'}</small></span><em>${vs.sold[i] ? 'Sold' : `${s.price} 🫧`}</em></div>`;
  }).join('');
  const left = v.stock.map((s, i) => [s, i]).filter(([, i]) => !vs.sold[i]);
  const html = `<p class="tn-greet">“${escapeHtml(left.length ? v.def.greet : 'Sold out! You have a good eye. I will be back another day.')}”</p>${rows}<p class="jsoft">You have ${peb} 🫧.</p>`;
  showProp(v.def.icon, v.def.name, { html }, left.map(([s, i]) => ({ label: `Buy ${cardDef(s.id).name} (${s.price} 🫧)`, run: () => pedlarBuy(i) })));
}
function pedlarBuy(i) {
  const v = visitorToday(), vs = visitState(); if (!v || v.kind !== 'pedlar' || vs.sold[i]) return;
  const s = v.stock[i];
  if (state.progress.pebbles < s.price) { toast(`Not enough ${GAME.currency.many}: that one is ${s.price} 🫧.`); sfx('soft'); return; }
  spendPebbles(s.price, 'visitor'); vs.sold[i] = true;
  state.ownedCards.push(s.id); noteCardsFound(1); bumpPill('pillCards'); saveState(); updateHud();
  bumpStat('visitorBuys', 1);
  logEvent(v.def.icon, `Bought ${cardDef(s.id).name} from ${v.def.name}.`);
  showCardReveal(s.id, `${v.def.icon} From ${v.def.name}'s pack`, true);
}
function openWanderer(v) {
  const vs = visitState(), fam = FAMILIES[v.fam];
  const html = `<p class="tn-greet">“${escapeHtml(vs.beaten ? 'Well played! My bag is lighter for it. A rematch is still welcome, just for fun.' : v.def.greet)}”</p>
    <p>Plays a <b>${fam.icon} ${escapeHtml(fam.name)}</b> deck, a little tougher than the folk round here.</p><p class="jsoft">${vs.beaten ? 'Prize already given today.' : `First win today: an ${RARITY_LABEL[VISIT.prizeRarity]} ${escapeHtml(fam.name)} card and +${VISIT.winPebbles} 🫧.`}</p>`;
  showProp(v.def.icon, v.def.name, { html }, [{ label: vs.beaten ? '⚔️ Rematch' : '⚔️ Challenge', run: () => wandererBattle(v) }]);
}
function wandererBattle(v) {
  if (state.deck.length < DECK_SIZE) { toast(`Fill your ${DECK_SIZE}-card deck first`); return; }
  const deck = buildDeckForOpponent(DECK_SIZE, false, Math.min(4, foeTierFor(false) + 1), 'visitor-' + v.day, FAMILIES[v.fam].district, state.wins);
  startBattle({ id: 'visitor-wanderer', name: v.def.name, icon: v.def.icon, deck, profile: { level: 'normal', spirit: 20 }, isBoss: false, rewardCard: null, visitor: { kind: v.kind, fam: v.fam } });
}
// btShowResult (js/battle-ui.js) on a win against a visitor. A loss uses the ordinary "close, friendly match" branch.
function visitorWin() {
  battle.rewarded = true;
  const vs = visitState(), v = battle.npc.visitor || {}, fam = FAMILIES[v.fam] || FAMILIES.grove;
  const icon = btGet('battleEndIcon'); icon.textContent = battle.npc.icon || '🎒'; icon.className = 'big-icon reveal-icon';
  battleEndTitle.textContent = `${battle.npc.name} tips their hat.`;
  if (!vs.beaten) {
    vs.beaten = true;
    const cid = familyCardId(v.fam || 'grove', VISIT.prizeRarity), def = cardDef(cid);
    state.ownedCards.push(cid); noteCardsFound(1); bumpPill('pillCards'); addPebbles(VISIT.winPebbles, 'visitor');
    bumpStat('visitorWins', 1); bumpStat('battlesWon', 1);
    logEvent(battle.npc.icon || '🎒', `Beat ${battle.npc.name}'s ${fam.name} deck and won ${def.name}.`);
    battleEndStats.innerHTML = `<span class="end-prize-k">Prize</span><br><b>${cardArtHtml(def)} ${escapeHtml(def.name)}</b> <span class="rarity-tag rt-${def.rarity}" style="margin:4px 0 0">${RARITY_LABEL[def.rarity]}</span><br>+${VISIT.winPebbles} 🫧`;
    btGet('battleEndCard').classList.add('glow-' + def.rarity);
  } else battleEndStats.textContent = 'A fine rematch. The prize was given earlier today.';
  saveState();
  btGet('battleRetryBtn').classList.add('hidden');
  sparkleBurst(btGet('battleSparkles'), ['✨', fam.icon], 12);
  sfx('win'); buzz(HAP.win);
}

/* ---------------- Journal, weather board and the tick ---------------- */
// Rows for the Journal's Today page (todayModel, js/journal-pages.js). `go.run` is handled by journalGo.
function townNewsTodayRows() {
  const rows = [], g = communityGoal(), c = communityState(), t = communityTotals(), p = gazetteToday();
  rows.push({ icon: '📰', title: 'The Dream Gazette', sub: p.h, done: gazetteRead(), frac: gazetteRead() ? 1 : 0, go: { run: openGazette } });
  const claim = communityClaimable();
  rows.push({ icon: g.icon, title: `Town goal: ${g.name}`, sub: claim ? 'Ready to claim!' : c.full ? 'Done this week, thank you' : `${t.total} of ${g.goal} ${g.unit} · you gave ${t.mine}`, done: c.full && !claim, frac: t.frac, bar: [t.total, g.goal], go: { run: openCommunity } });
  const v = visitorToday();
  if (v) { const vs = visitState(), done = v.kind === 'wanderer' ? vs.beaten : Object.keys(vs.sold).length >= v.stock.length;
    rows.push({ icon: v.def.icon, title: `${v.def.name} is in town`, sub: done ? 'Already visited today' : `${tnDistrictName(v.district)} · ${v.kind === 'pedlar' ? 'three cards for sale' : 'a match with a prize'}`, done, frac: done ? 1 : 0, go: { run: () => visitorGuide(v) } }); }
  // A weather moment is not listed here: Today is a checklist and a moment cannot be "done". The weather board and the Gazette show it.
  return rows;
}
// Walks you to today's visitor (guideArrive / walkThen in js/guide-walk.js), then opens them.
function visitorGuide(v) {
  if (typeof guideArrive !== 'function') { switchTab('town'); return; }
  guideArrive(v.district, () => {
    syncVisitor(); renderTown();
    const data = ensureDistrictData(state.currentDistrict), who = data.npcs.find(n => n.isVisitor);
    if (!who) { toast('The visitor has stepped away for a moment.'); return; }
    setChase(who);
    if (!walkThen(adjacentTo(who), () => { setChase(null); interactWith('talk', who); })) setChase(null);
  });
}
// Extra rows on the weather board (weatherBoardHtml, js/town-render-weather.js), drawn with its own row() helper.
function townNewsBoardRows(row) {
  let h = '';
  const m = momentNow(); if (m) h += row(m.icon, 'Right now', momentName(m), `<span>${m.text}</span>`, `~${momentMinsLeft()} min`);
  const g = communityGoal(), t = communityTotals();
  h += row(g.icon, 'Town goal', g.name, `<span>${t.total} of ${g.goal} ${g.unit}</span>`, `${Math.round(t.frac * 100)}%`);
  h += row('📰', 'The Dream Gazette', gazetteToday().h, '', '');
  return h;
}
function townNewsTick() {
  if (document.hidden || typeof state === 'undefined' || !state || !state.progress || inBattle) return;
  const t = tnState(), now = Date.now();
  if (t.moment && !momentNow()) {   // a moment has ended: say so quietly and drop the rainbow
    const m = MOMENTS[t.moment.id]; t.moment = null; saveState(); momentVisual();
    if (m && !inScene) logEvent(m.icon, `${m.name} has passed.`);
  }
  if (t.paperAnnounced !== todayKey() && now - TN.bootAt > TN.announceAfterMs && !inScene && !talkTo) {
    t.paperAnnounced = todayKey(); saveState();
    logEvent('📰', `The Dream Gazette: ${gazetteToday().h}.`);
    if (!tnQuiet()) toast('📰 The Dream Gazette is out. Read it in the Journal’s Today page.');
  }
  const c = communityState();
  if (communityClaimable() && c.nudged !== (c.full ? 2 : c.half ? 1 : 0) + ':' + c.wk) {
    c.nudged = (c.full ? 2 : c.half ? 1 : 0) + ':' + c.wk; saveState();
    if (!tnQuiet()) toast(`${communityGoal().icon} The town goal has a reward for you. Claim it from the Journal.`);
  }
  communityPush(); communityFetch();
}
setInterval(townNewsTick, TN.tickMs);
document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(townNewsTick, 500); });
