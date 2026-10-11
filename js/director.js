/* ============================================================
   EVENT DIRECTOR (build 224)
   Picks the day's town event (TOWN_EVENTS, js/events-story-foils-guide.js) the way a game director paces a story, instead of a plain dice roll:
     - it remembers the last few events (state.progress.director.hist) and does not repeat yesterday's (x0.1) or a recent one (x0.4),
     - after a rare event the next day is an ordinary one (rare x0.3),
     - events for things you actually do (fish, crops, bread, trades, the Cup, spirits) are favoured (x1.5), ones for things you have never touched
       are a little less likely (x0.7), so an event is usually one you can enjoy,
     - while you have few friends the Friendship Fair is twice as likely, and a Tournament is more welcome after a rough patch of matches.
   Whatever it picks is stored for the day (director.day / director.id), so it never changes under you and the whole day agrees. The base weights
   (EVENT_WEIGHT: rare = a quarter) are untouched, so rare events still come about one day in a dozen.
   eventNow() asks directorEvent() first and falls back to its old roll if this file is missing.
   ============================================================ */
const DIRECTOR = { histLen: 5, yesterday: 0.1, recent: 0.4, afterRare: 0.3, used: 1.5, unused: 0.7, fewFriends: 2, friendsEnough: 3 };
const DIRECTOR_USES = { 'fishing-derby': 'fishCaught', 'harvest-fair': 'cropsHarvested', 'baking-day': 'breadBaked', 'swap-day': 'tradesDone', 'festival-day': 'cupRoundsWon', 'spirit-parade': 'spiritsMet' };
function directorState() {
  const p = state.progress;
  if (!p.director || typeof p.director !== 'object') p.director = { day: null, id: null, hist: [] };
  if (!Array.isArray(p.director.hist)) p.director.hist = [];
  return p.director;
}
function directorHearts() { const fs = friendsState(); return Object.keys(fs).reduce((n, k) => n + heartsFor(fs[k].points || 0), 0); }
// The weight of one event today, given what has happened lately. Pure given `ctx` ({ hist, totals, hearts, tilt }), so it can be tested.
function directorWeight(e, ctx) {
  let w = EVENT_WEIGHT(e);
  const h = ctx.hist || [], last = h[h.length - 1];
  if (last === e.id) w *= DIRECTOR.yesterday; else if (h.slice(-3).includes(e.id)) w *= DIRECTOR.recent;
  const lastEv = TOWN_EVENTS.find(x => x.id === last);
  if (e.rare && lastEv && lastEv.rare) w *= DIRECTOR.afterRare;
  const stat = DIRECTOR_USES[e.id];
  if (stat) w *= (ctx.totals && ctx.totals[stat] > 0) ? DIRECTOR.used : DIRECTOR.unused;
  if (e.id === 'friendship-fair' && ctx.hearts < DIRECTOR.friendsEnough) w *= DIRECTOR.fewFriends;
  if (e.id === 'tourney' && ctx.tilt < 0) w *= 1.6;
  return w;
}
function directorEvent() {
  const d = directorState(), day = todayKey();
  if (d.day === day) { const e = TOWN_EVENTS.find(x => x.id === d.id); if (e) return e; }
  const ctx = { hist: d.hist, totals: (state.progress && state.progress.totals) || {}, hearts: directorHearts(), tilt: typeof adaptTilt === 'function' ? adaptTilt() : 0 };
  const ws = TOWN_EVENTS.map(e => directorWeight(e, ctx)), total = ws.reduce((a, b) => a + b, 0);
  let r = seeded('event-' + day)() * total, pick = TOWN_EVENTS[0];
  for (let i = 0; i < TOWN_EVENTS.length; i++) { r -= ws[i]; if (r < 0) { pick = TOWN_EVENTS[i]; break; } }
  d.day = day; d.id = pick.id; d.hist.push(pick.id); if (typeof teleInc === 'function') teleInc('events.' + pick.id);
  if (d.hist.length > DIRECTOR.histLen) d.hist.splice(0, d.hist.length - DIRECTOR.histLen);
  return pick;
}
