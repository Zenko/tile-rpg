/* ============================================================
   NPC BRAIN (build 216)
   How a neighbour decides things. This first stage is their DECK: a plain neighbour no longer fields a deck that is only random
   plus their district's family. Each one now plans it from four things, strongest first:
     1. what you suggested (Chat -> Suggest a deck), taken more seriously the more hearts they have for you,
     2. the weather (rain turns them to Deriva, storms to Susurro, snow to Recuerdo, clear skies to Brote, mist to Susurro),
     3. the season's own cards (SEASONS[..].cards),
     4. their own taste: a favourite family and a temperament (bold / steady) that never change, worked out from their name.
   The plan is a short list of "kept" cards handed to BattleEngine.suggestDeck, which fills the rest of the deck with its usual cost curve,
   so a planned deck still plays like every other deck. Picks are capped by the neighbour's foe tier (gentle neighbours never keep a
   rare card), so a plan changes what a deck is ABOUT without making it harder.
   The plan also returns a one-line note ("Wren packed Deriva cards for the rain") shown under their name on the versus card.
   Later stages (walking, meeting each other, approaching you) will read the same taste and mood.
   Nothing here is saved except the player's suggestion: state.progress.friends[key].deckHint = { id, day }.
   ============================================================ */
const NPC_WEATHER_FAMILY = { clear: 'grove', cloudy: 'wind', rain: 'tide', storm: 'wind', snow: 'stone' };
const NPC_WEATHER_WORDS = { clear: 'clear skies', cloudy: 'the mist', rain: 'the rain', storm: 'the storm', snow: 'the snow' };
const NPC_HINTS = [
  { id: 'family:grove', label: '🌿 Brote cards', say: 'Brote cards? Lovely, I will pack some.' },
  { id: 'family:stone', label: '🪨 Recuerdo cards', say: 'Recuerdo, solid and steady. I can do that.' },
  { id: 'family:tide', label: '🌊 Deriva cards', say: 'Deriva it is. I like the sound of that.' },
  { id: 'family:wind', label: '🪶 Susurro cards', say: 'Susurro cards, light on their feet. Good idea.' },
  { id: 'tough', label: '💪 Something tougher', say: 'You want a real challenge? Then I will bring my sturdiest cards.' },
  { id: 'gentle', label: '🫖 Something gentler', say: 'A softer deck for a softer day. I will go easy.' },
  { id: 'seasonal', label: '🍂 Whatever suits the season', say: 'Something seasonal. I will see what the weather brings.' }
];
function npcHintDef(id) { return NPC_HINTS.find(h => h.id === id) || null; }
function npcTaste(f) {
  const h = foeSeedHash('taste:' + (f && f.name));
  const fams = Object.keys(FAMILIES);
  return { family: fams[h % fams.length], bold: ((h >> 5) & 1) === 1 };
}
function npcDeckHint(f) {
  const fr = f && friendOf(f), hint = fr && fr.deckHint;
  return hint && npcHintDef(hint.id) ? hint : null;
}
// A neighbour agrees to a suggestion only once they know you at least a little. Returns what they say.
function npcAcceptHint(f, id) {
  const def = npcHintDef(id), hearts = friendHearts(f);
  if (!def) return { ok: false, say: '' };
  if (hearts < 1) return { ok: false, say: 'Hmm, we hardly know each other yet. Maybe once we are better friends?' };
  const fr = friendOf(f);
  fr.deckHint = { id, day: todayKey() };
  saveState();
  return { ok: true, say: def.say + (hearts >= 3 ? ' Anything for a friend.' : '') };
}
function npcCardOk(id, tier) {
  const d = BattleEngine.defOf(id);
  return !!d && !d.spell && !d.foe && !d.exclusive && !d.crafted && RARITY_ORDER.indexOf(d.rarity) <= tier - 1;
}
function npcCardScore(d) { return d.power + d.grit + 2 * d.kw.length; }
function npcFamilyPicks(fam, n, tier) {
  const ids = CARD_POOL.filter(c => CARD_FAMILY[c.id] === fam && npcCardOk(c.id, tier)).map(c => c.id);
  return shuffledArr(ids).slice(0, n);
}
function npcSeasonPicks(n, tier) { return shuffledArr(seasonDef().cards.filter(id => npcCardOk(id, tier))).slice(0, n); }
function npcStylePicks(kind, n, tier) {
  const ids = CARD_POOL.map(c => c.id).filter(id => npcCardOk(id, tier));
  const d = id => BattleEngine.defOf(id);
  const pool = kind === 'tough' ? ids.filter(id => d(id).cost >= 3).sort((a, b) => npcCardScore(d(b)) - npcCardScore(d(a))).slice(0, 14)
    : ids.filter(id => d(id).cost <= 2);
  return shuffledArr(pool).slice(0, n);
}
// Plan a plain neighbour's deck. Returns { keep: [card ids], note } (never null for a neighbour; keep may be short).
function npcDeckPlan(f, tier) {
  tier = Math.max(1, Math.min(4, tier || foeTierFor(false)));
  const taste = npcTaste(f), hearts = friendHearts(f), hint = npcDeckHint(f), weather = weatherNow(), wFam = NPC_WEATHER_FAMILY[weather] || taste.family;
  const keep = [], why = [];
  const add = (ids, reason) => { let n = 0; ids.forEach(id => { if (!keep.includes(id) && keep.length < 7) { keep.push(id); n++; } }); if (n && reason && !why.includes(reason)) why.push(reason); };
  if (hint) {                                          // your suggestion: one more card per heart, up to five
    const n = Math.max(1, Math.min(5, hearts)), hd = npcHintDef(hint.id);
    if (hint.id.startsWith('family:')) add(npcFamilyPicks(hint.id.slice(7), n, tier), `${FAMILIES[hint.id.slice(7)].name} cards (as you suggested)`);
    else if (hint.id === 'seasonal') add(npcSeasonPicks(n, tier), `${seasonDef().name.toLowerCase()} cards (as you suggested)`);
    else add(npcStylePicks(hint.id, n, tier), hint.id === 'tough' ? 'their sturdiest cards (as you suggested)' : 'a gentler deck (as you suggested)');
  }
  add(npcFamilyPicks(wFam, 2, tier), `${FAMILIES[wFam].name} cards for ${NPC_WEATHER_WORDS[weather] || 'the day'}`);
  add(npcSeasonPicks(2, tier), `${seasonDef().name.toLowerCase()} cards`);
  add(npcFamilyPicks(taste.family, 1, tier), `a favourite ${FAMILIES[taste.family].name} card`);
  const tip = f.mind && f.mind.tip;                      // learned from a friend (stage 3): one card of their favourite family
  if (tip && FAMILIES[tip.family]) add(npcFamilyPicks(tip.family, 1, tier), `a tip from ${tip.from}`);
  if (!hint && taste.bold) add(npcStylePicks('tough', 1, tier), '');
  const note = why.length ? `${f.name} packed ${why.slice(0, 2).join(' and ')}.` : '';
  return { keep, note };
}

/* ============================================================
   NPC BRAIN, STAGE 2: WHERE THEY WALK (build 217)
   Plain neighbours (ids "npc-<district>-<n>") used to shuffle a few tiles from their home and back. Now each one has a small mind
   (f.mind) that picks a GOAL, walks there by the shortest route, stands a while, then picks the next:
     - goals are places: home, a bench / well / fountain / lamp / nets (their prop), a building door, or another neighbour,
     - each is scored from what the neighbour wants right now (a social need that builds up, the time of day, the weather, their
       temperament from npcTaste) minus how far it is, minus a penalty for somewhere they just were, plus some chance,
     - the pick is weighted by score, so it is never the same route twice and never a perfect machine.
   By day in clear weather they roam and sit at benches; in rain, storm or snow they head for doors and home; at night they go
   home and mostly stay. A sociable neighbour keeps drifting towards other neighbours and lingers beside them.
   Steps still obey the old rules (tileFreeForWander, stillConnected) so a neighbour can never wall the village in, and a goal that
   will not work (path blocked three times) is dropped for a rest. `f.intent` always says in words what they are up to.
   Bosses, the Atlas and the rival are untouched. Tuning lives in NPC_WALK.
   ============================================================ */
const NPC_WALK = {
  stepMs: [760, 1050],      // between steps while going somewhere (the slide animation is 520 ms)
  idleMs: [1500, 2600],     // between decisions while standing
  dwell: { home: [6000, 12000], bench: [7000, 14000], door: [3000, 6000], well: [4000, 8000], fountain: [4000, 8000], lamp: [3000, 6000], nets: [4000, 8000], friend: [7000, 13000], look: [3000, 6000] },
  radius: { steady: 7, bold: 12 },     // how far from home they will choose to go
  maxFails: 3
};
const NPC_INTENT_WORDS = { home: 'heading home', bench: 'off to sit for a while', door: 'popping by a doorway', well: 'wandering to the well', fountain: 'strolling to the fountain', lamp: 'checking on a lamp', nets: 'looking over the nets', friend: 'going to chat with a neighbour', look: 'having a look around' };
function npcBrained(f) { return !!f && !f.isBoss && !f.isAtlas && !f.isRival && !f.signature && /^npc-/.test(f.id || ''); }
const npcRand = (a, b) => a + Math.random() * (b - a);
function npcMind(f) {
  if (!f.mind || typeof f.mind !== 'object') f.mind = {};
  const m = f.mind;
  if (typeof m.social !== 'number') m.social = Math.random() * 0.6;          // 0..1, builds while alone
  if (!Array.isArray(m.recent)) m.recent = [];
  if (typeof m.fails !== 'number') m.fails = 0;
  return m;
}
// Places a neighbour might go on this map: doors, props and (via npcLandmarks) nothing else. Cached on the map object.
function npcLandmarks(m) {
  if (m._npcLandmarks) return m._npcLandmarks;
  const list = [];
  (m.buildings || []).forEach(b => list.push({ kind: 'door', x: b.entry.x, y: b.entry.y, solid: false, id: 'door:' + b.entry.x + ',' + b.entry.y }));
  (m.props || []).forEach(p => list.push({ kind: ['bench', 'well', 'fountain', 'lamp', 'nets'].includes(p.type) ? p.type : 'look', x: p.x, y: p.y, solid: true, id: 'prop:' + p.id }));
  return (m._npcLandmarks = list);
}
// The nearest free tile beside a landmark (a door's own tile is never stood on), or null.
function npcStandTile(m, data, f, lm) {
  let best = null, bd = 1e9;
  const cand = lm.solid ? [[0, 1], [0, -1], [1, 0], [-1, 0]] : [[0, 1], [1, 0], [-1, 0], [0, 2]];
  cand.forEach(([dx, dy]) => {
    const x = lm.x + dx, y = lm.y + dy;
    if (!tileFreeForWander(m, data, x, y, f)) return;
    const d = Math.abs(x - f.x) + Math.abs(y - f.y);
    if (d < bd) { bd = d; best = { x, y }; }
  });
  return best;
}
/* Score every possible goal. Pure: everything it reads is in ctx, so it can be tested without a town.
   ctx = { night, weather, bold, social (0..1), home: {x,y}, pos: {x,y}, recent: [ids], cands: [{ id, kind, x, y }] } */
function npcScoreGoals(ctx) {
  const wet = ctx.weather === 'rain' || ctx.weather === 'storm' || ctx.weather === 'snow', fine = ctx.weather === 'clear' && !ctx.night;
  const radius = ctx.bold ? NPC_WALK.radius.bold : NPC_WALK.radius.steady;
  const out = [];
  ctx.cands.forEach(c => {
    const dist = Math.abs(c.x - ctx.pos.x) + Math.abs(c.y - ctx.pos.y), fromHome = Math.abs(c.x - ctx.home.x) + Math.abs(c.y - ctx.home.y);
    if (c.kind !== 'home' && fromHome > radius) return;
    let s = Math.random() * 0.35 - dist * 0.04;
    if (c.kind === 'home') s += (ctx.night ? 1.4 : 0) + (wet ? 0.6 : 0) + (ctx.bold ? 0 : 0.25) + (dist > radius ? 0.5 : 0) - 0.35;
    else if (c.kind === 'door') s += (wet ? 0.7 : 0.15) + (ctx.night ? 0.1 : 0) + (ctx.bold ? 0.25 : 0);
    else if (c.kind === 'friend') s += ctx.social * 1.5 + Math.min(1, (c.bond || 0) * 0.12) + (ctx.night ? -0.5 : 0) - (wet ? 0.2 : 0);
    else s += (fine ? 0.5 : wet ? -0.7 : 0) + (ctx.night ? -0.5 : 0) + (c.kind === 'bench' ? 0.25 : 0);
    if (ctx.recent.includes(c.id)) s -= 0.9;
    out.push({ c, s });
  });
  return out;
}
// Weighted pick among the best few scores (so it is varied, but a clear favourite wins most of the time).
function npcPickScored(scored) {
  if (!scored.length) return null;
  const top = scored.slice().sort((a, b) => b.s - a.s).slice(0, 4), lo = top[top.length - 1].s;
  const w = top.map(x => Math.exp((x.s - lo) * 2.2));
  let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < top.length; i++) { r -= w[i]; if (r <= 0) return top[i].c; }
  return top[0].c;
}
function npcChooseGoal(m, data, f, now) {
  const mind = npcMind(f), taste = npcTaste(f);
  if (typeof f.homeX !== 'number') { f.homeX = f.x; f.homeY = f.y; }
  const cands = [{ id: 'home', kind: 'home', x: f.homeX, y: f.homeY }];
  npcLandmarks(m).forEach(lm => { const t = npcStandTile(m, data, f, lm); if (t) cands.push({ id: lm.id, kind: lm.kind, x: t.x, y: t.y }); });
  data.npcs.forEach(o => { if (o !== f && npcBrained(o) && !o.defeated) cands.push({ id: 'friend:' + o.id, kind: 'friend', x: o.x, y: o.y, who: o, bond: npcBond(f, o) }); });
  const ctx = { night: !!skyPhase().isNight, weather: weatherNow(), bold: taste.bold, social: mind.social, home: { x: f.homeX, y: f.homeY }, pos: { x: f.x, y: f.y }, recent: mind.recent, cands };
  const pick = npcPickScored(npcScoreGoals(ctx));
  if (!pick) return null;
  let tx = pick.x, ty = pick.y;
  if (pick.kind === 'friend') {                      // stand beside them, not on them
    const t = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => ({ x: pick.who.x + dx, y: pick.who.y + dy })).filter(p => tileFreeForWander(m, data, p.x, p.y, f)).sort((a, b) => Math.abs(a.x - f.x) + Math.abs(a.y - f.y) - Math.abs(b.x - f.x) - Math.abs(b.y - f.y))[0];
    if (!t) return null; tx = t.x; ty = t.y;
  }
  mind.goal = { id: pick.id, kind: pick.kind, x: tx, y: ty, who: pick.who ? pick.who.id : null, at: now };
  mind.fails = 0;
  f.intent = NPC_INTENT_WORDS[pick.kind] || 'wandering';
  return mind.goal;
}
function npcArrive(f, now) {
  const mind = npcMind(f), g = mind.goal;
  if (g) {
    mind.recent.push(g.id); if (mind.recent.length > 3) mind.recent.shift();
    if (g.kind === 'friend') mind.social = Math.max(0, mind.social - 0.7); else mind.social = Math.min(1, mind.social + 0.15);
    const d = NPC_WALK.dwell[g.kind] || NPC_WALK.dwell.look;
    mind.dwellUntil = now + npcRand(d[0], d[1]);
    f.intent = g.kind === 'home' ? 'resting at home' : g.kind === 'friend' ? 'chatting' : g.kind === 'bench' ? 'sitting' : 'pausing';
  }
  mind.goal = null;
}
// One decision for one neighbour. Called from wanderTick (js/neighbors-bosses.js) when its own clock says so.
function npcWanderTick(m, data, f, now) {
  const mind = npcMind(f);
  if (now < (mind.dwellUntil || 0)) { f.nextMoveAt = now + npcRand(NPC_WALK.idleMs[0], NPC_WALK.idleMs[1]); mind.social = Math.min(1, mind.social + 0.004); return; }
  if (!mind.goal && !npcChooseGoal(m, data, f, now)) { mind.dwellUntil = now + 2500; f.nextMoveAt = now + 2500; return; }
  const g = mind.goal;
  if (g.kind === 'friend' && g.who) { const o = data.npcs.find(n => n.id === g.who); if (!o || o.defeated) { mind.goal = null; return; } if (Math.abs(o.x - g.x) + Math.abs(o.y - g.y) > 1) { mind.goal = null; return; } }
  if (f.x === g.x && f.y === g.y) { npcArrive(f, now); f.nextMoveAt = now + npcRand(NPC_WALK.idleMs[0], NPC_WALK.idleMs[1]); return; }
  const path = findPath(m, data, { x: f.x, y: f.y }, (x, y) => x === g.x && y === g.y), next = path && path[0];
  if (!next || !tileFreeForWander(m, data, next.x, next.y, f) || !stillConnected(m, data, f, next.x, next.y)) {
    mind.fails++;
    if (mind.fails >= NPC_WALK.maxFails) { mind.goal = null; mind.dwellUntil = now + 2500; f.intent = 'having a think'; }
    f.nextMoveAt = now + 900; return;
  }
  mind.fails = 0;
  moveFighter(f, { x: next.x, y: next.y, dx: next.x - f.x, dy: next.y - f.y });
  f.nextMoveAt = now + npcRand(NPC_WALK.stepMs[0], NPC_WALK.stepMs[1]);
  if (f.x === g.x && f.y === g.y) f.nextMoveAt = now + 300;     // arrive on the next tick
}

/* ============================================================
   NPC BRAIN, STAGE 3: NEIGHBOURS MEET EACH OTHER (build 218)
   When two neighbours stand next to each other (usually because one walked over to chat, see 'friend' goals above) they may have an
   encounter, at most once every NPC_MEET.cooldownMs per pair:
     chat      a little speech bubble each; builds their bond. The topic (the weather, the season, decks, you) is remembered.
     gift      once they are friends, a small present passes between them (hearts over their heads); a bigger bond bump.
     tip       friends swap deck know-how: the listener learns the speaker's favourite family and will keep one card of it in
               their next deck ("a tip from Rowan", see npcDeckPlan above).
     match     a friendly game: swords, then smiles. No one is ever defeated by it.
   What you see: bubbles over their heads (lifeFx). What you get: when you talk to a neighbour they may mention who they were just
   with (npcGreeting), friends keep seeking each other out (bond raises a friend goal's score), and tips change their decks.
   Bonds are saved in state.progress.bonds as "District:NameA|NameB" (names sorted) -> { pts, last } and capped, because neighbours
   come back under new names after a defeat and the list must not grow for ever.
   ============================================================ */
const NPC_MEET = { cooldownMs: 120000, incidentalChance: 0.1, intendedChance: 0.5, maxBonds: 40, giftBond: 3, tipBond: 4, fresh: 5 * 60 * 1000 };
function npcBonds() { const p = state.progress; if (!p.bonds || typeof p.bonds !== 'object') p.bonds = {}; return p.bonds; }
function npcBondKey(a, b) { return state.currentDistrict + ':' + [a.name, b.name].sort().join('|'); }
function npcBond(a, b) { const e = npcBonds()[npcBondKey(a, b)]; return e ? e.pts : 0; }
function npcBondAdd(a, b, pts, now) {
  const bonds = npcBonds(), k = npcBondKey(a, b), e = bonds[k] || (bonds[k] = { pts: 0, last: 0 });
  e.pts += pts; e.last = now;
  const keys = Object.keys(bonds);
  if (keys.length > NPC_MEET.maxBonds) keys.sort((x, y) => bonds[x].last - bonds[y].last).slice(0, keys.length - NPC_MEET.maxBonds).forEach(x => delete bonds[x]);
  return e;
}
// The neighbour this one is closest to (bond points, at least `min`), among those in the district. Used for deck tips and gossip.
function npcBestFriend(f, data, min) {
  let best = null, bp = (min || 1) - 1;
  (data.npcs || []).forEach(o => { if (o !== f && npcBrained(o)) { const p = npcBond(f, o); if (p > bp) { bp = p; best = o; } } });
  return best;
}
function npcTopicFor(f) {
  const t = [`the ${NPC_WEATHER_WORDS[weatherNow()] || 'weather'}`, `the ${seasonDef().name.toLowerCase()}`, 'their decks', 'a card they once found', friendHearts(f) >= 1 ? 'a certain dreamer in town' : 'the town'];
  return t[Math.floor(Math.random() * t.length)];
}
function npcBubble(f, emoji, delay) {
  setTimeout(() => { if (typeof lifeFx === 'function') lifeFx('npc-bubble', f.x, f.y, `<span>${emoji}</span>`, 2300); }, delay || 0);
}
// Make the encounter happen between a and b. Returns what happened (also used by the tests).
function npcMeet(a, b, now, forceKind) {
  const bond = npcBond(a, b);
  let kind = forceKind;
  if (!kind) {
    const w = { chat: 6, match: 1.5 + (npcTaste(a).bold ? 1 : 0) + (npcTaste(b).bold ? 1 : 0), gift: bond >= NPC_MEET.giftBond ? 2 : 0, tip: bond >= NPC_MEET.tipBond ? 3 : 0 };
    let r = Math.random() * Object.values(w).reduce((x, y) => x + y, 0);
    kind = 'chat'; for (const k of Object.keys(w)) { r -= w[k]; if (r <= 0) { kind = k; break; } }
  }
  const topic = npcTopicFor(a);
  const bump = kind === 'gift' ? 2 : 1;
  npcBondAdd(a, b, bump, now);
  const res = { kind, topic, tip: null };
  if (kind === 'tip') {                                         // the one with the stronger taste teaches the other
    const teacher = Math.random() < 0.5 ? a : b, learner = teacher === a ? b : a;
    npcMind(learner).tip = { from: teacher.name, family: npcTaste(teacher).family, at: now };
    res.tip = { teacher: teacher.name, learner: learner.name, family: npcTaste(teacher).family };
  }
  [[a, b], [b, a]].forEach(([x, y], i) => {
    const mind = npcMind(x);
    x.lastMeet = { with: y.name, kind, topic, at: now };
    mind.social = Math.max(0, mind.social - (kind === 'chat' || kind === 'match' ? 0.5 : 0.7));
    mind.dwellUntil = Math.max(mind.dwellUntil || 0, now + npcRand(5000, 9000));
    mind.goal = null;
    x.intent = kind === 'match' ? 'playing a friendly game' : `chatting with ${y.name}`;
    npcBubble(x, kind === 'gift' ? '🎁' : kind === 'tip' ? '🃏' : kind === 'match' ? '⚔️' : '💬', i * 700);
    if (kind === 'gift') npcBubble(x, '💞', 1500 + i * 400);
    else if (kind === 'match') npcBubble(x, i ? '😄' : '😤', 1600);
  });
  saveState();
  return res;
}
// Called once per wander tick. Looks for neighbours standing side by side and rolls for an encounter.
function npcMeetTick(data, now) {
  const ns = (data.npcs || []).filter(n => npcBrained(n) && !n.defeated);
  for (let i = 0; i < ns.length; i++) for (let j = i + 1; j < ns.length; j++) {
    const a = ns[i], b = ns[j];
    if (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) !== 1) continue;
    const e = npcBonds()[npcBondKey(a, b)];
    if (e && now - e.last < NPC_MEET.cooldownMs) continue;
    const ma = npcMind(a), mb = npcMind(b);
    const intended = (ma.goal && ma.goal.who === b.id) || (mb.goal && mb.goal.who === a.id);
    if (Math.random() < (intended ? NPC_MEET.intendedChance : NPC_MEET.incidentalChance)) npcMeet(a, b, now);
  }
}
// What a neighbour says when you walk up: a hint of who they were just with, if it was recent.
function npcGreeting(f, fallback) {
  const lm = f && f.lastMeet;
  if (lm && Date.now() - lm.at < NPC_MEET.fresh) {
    if (lm.kind === 'match') return `Hello there. ${lm.with} and I were just playing a friendly game. Fancy one yourself?`;
    if (lm.kind === 'gift') return `Hello there. ${lm.with} just gave me the nicest little present.`;
    if (lm.kind === 'tip') return `Hello there. ${lm.with} and I were swapping deck tips. Care for a match?`;
    return `Hello there. I was just chatting with ${lm.with} about ${lm.topic}.`;
  }
  return fallback;
}
