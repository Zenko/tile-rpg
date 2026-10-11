/* ============================================================
   COMPANION AI (build 227)
   Your companion (Character -> Companion) used to do one thing in town: step into the tile you just left. Now, when you stand still for a few
   seconds, it behaves like a small creature with a mood:
     sleepy 💤 at night   wary 😨 in a storm   chilly ❄️ in snow   cosy ☔ in rain   alert 👀 when something is lying on the ground nearby
     friendly 💞 when a neighbour who likes you is close   playful 🎵 on a clear day   content otherwise
   and acts on it: it shows the mood over its head now and then and, when playful or content, shuffles a tile or two beside you (never onto you, a
   wall, a door or a neighbour). From bond level 2 it also quietly points out an item lying within 3 tiles of you (one 👀 per item), and it greets
   any neighbour with 2+ hearts who walks up (💞, at most once every 90 s each). The moods are cosmetic and the pointing is short range, so it
   never replaces the explicit "Look around" action (companionLookAround) and finds nothing you would not see yourself.
   Petting it now mentions its mood. Nothing here is saved.
   ============================================================ */
const COMPANION_AI = { checkMs: 1500, stillMs: 3500, every: [7000, 13000], senseRange: 3, greetMs: 90000, wanderRadius: 2 };
const CAI = { pos: null, posAt: 0, nextAt: 0, sensed: {}, greeted: {}, district: null };
const COMPANION_MOODS = {
  alert: { icon: '👀', word: 'alert' }, sleepy: { icon: '💤', word: 'sleepy' }, wary: { icon: '😨', word: 'a little wary' }, chilly: { icon: '❄️', word: 'chilly' },
  cosy: { icon: '☔', word: 'cosy' }, friendly: { icon: '💞', word: 'friendly' }, playful: { icon: '🎵', word: 'playful' }, content: { icon: '🙂', word: 'content' }
};
// ctx = { night, weather, itemNear, friendNear } -> a mood id. The most pressing thing wins.
function companionMoodId(ctx) {
  if (ctx.itemNear) return 'alert';
  if (ctx.night) return 'sleepy';
  if (ctx.weather === 'storm') return 'wary';
  if (ctx.weather === 'snow') return 'chilly';
  if (ctx.weather === 'rain') return 'cosy';
  if (ctx.friendNear) return 'friendly';
  return ctx.weather === 'clear' ? 'playful' : 'content';
}
function companionAiCtx() {
  const data = ensureDistrictData(state.currentDistrict), p = state.playerPos, d = (o) => Math.abs(o.x - p.x) + Math.abs(o.y - p.y);
  const itemNear = [...(data.items || []).filter(i => !i.collected), ...(data.chest ? [data.chest] : [])].filter(o => d(o) <= COMPANION_AI.senseRange);
  const friendNear = (data.npcs || []).some(n => !n.defeated && !n.isBoss && !n.isRival && d(n) <= 3 && friendHearts(n) >= 2);
  return { night: !!skyPhase().isNight, weather: weatherNow(), itemNear: itemNear.length ? itemNear : null, friendNear, data };
}
function companionMoodLine() {
  const c = state.companion; if (!c) return '';
  const ctx = companionAiCtx(), m = COMPANION_MOODS[companionMoodId(ctx)];
  return `${c.name} seems ${m.word} ${m.icon}.`;
}
// A free tile within wanderRadius of you for the companion to shuffle to, or null. Never you, a wall, a door or exit, a neighbour, or an item.
function companionAsideTile() {
  const m = getMap(state.currentDistrict), data = ensureDistrictData(state.currentDistrict), p = state.playerPos, cur = state.companionPos, out = [];
  for (let dx = -COMPANION_AI.wanderRadius; dx <= COMPANION_AI.wanderRadius; dx++) for (let dy = -COMPANION_AI.wanderRadius; dy <= COMPANION_AI.wanderRadius; dy++) {
    const x = p.x + dx, y = p.y + dy;
    if ((dx === 0 && dy === 0) || (cur && cur.x === x && cur.y === y)) continue;
    if (x < 0 || y < 0 || x >= m.w || y >= m.h || m.solid[y][x] || m.exits[x + ',' + y] || m.entries[x + ',' + y]) continue;
    if ((data.npcs || []).some(n => n.x === x && n.y === y) || (data.boss && data.boss.x === x && data.boss.y === y)) continue;
    if ((data.items || []).some(i => !i.collected && i.x === x && i.y === y)) continue;
    if (Math.abs(x - p.x) + Math.abs(y - p.y) > COMPANION_AI.wanderRadius) continue;
    out.push({ x, y });
  }
  return out.length ? out[Math.floor(Math.random() * out.length)] : null;
}
function companionShuffle(to) {
  state.companionPos = { x: to.x, y: to.y };
  const el = townWorld && townWorld.querySelector('.ent.companion');
  if (el) { el.style.transition = 'left .45s ease-in-out, top .45s ease-in-out'; el.style.setProperty('--x', to.x); el.style.setProperty('--y', to.y); el.style.zIndex = to.y * 2 + 2; }
}
// One look at things. `now` is a timestamp (real or scripted). Returns what it did ('' when nothing), for tests.
function companionAiTick(now) {
  if (!state.companion || !state.companionPos || !townWorld) return '';
  if (typeof HIDESEEK !== 'undefined' && HIDESEEK.active) return '';
  if (CAI.district !== state.currentDistrict) { CAI.district = state.currentDistrict; CAI.sensed = {}; }
  const p = state.playerPos;
  if (!CAI.pos || CAI.pos.x !== p.x || CAI.pos.y !== p.y) { CAI.pos = { x: p.x, y: p.y }; CAI.posAt = now; CAI.nextAt = now + COMPANION_AI.stillMs; }
  if (now - CAI.posAt < COMPANION_AI.stillMs) return '';
  const ctx = companionAiCtx(), c = state.companion;
  // a quiet pointer to something close (bond level 2 and up), once per item
  if (ctx.itemNear && bondLevel(c) >= 2) {
    const o = ctx.itemNear.find(i => !CAI.sensed[state.currentDistrict + ':' + i.x + ',' + i.y]);
    if (o) { CAI.sensed[state.currentDistrict + ':' + o.x + ',' + o.y] = true; companionFloat('👀'); return 'sense'; }
  }
  // a hello for a friend who walked up
  const g = (ctx.data.npcs || []).find(n => !n.defeated && !n.isBoss && !n.isRival && Math.abs(n.x - p.x) + Math.abs(n.y - p.y) <= 2 && friendHearts(n) >= 2 && now - (CAI.greeted[n.id] || 0) > COMPANION_AI.greetMs);
  if (g) { CAI.greeted[g.id] = now; companionFloat('💞'); return 'greet'; }
  if (now < CAI.nextAt) return '';
  CAI.nextAt = now + COMPANION_AI.every[0] + Math.random() * (COMPANION_AI.every[1] - COMPANION_AI.every[0]);
  const mood = companionMoodId(ctx);
  if ((mood === 'playful' || mood === 'content') && Math.random() < 0.55) { const t = companionAsideTile(); if (t) { companionShuffle(t); return 'move'; } }
  if (mood !== 'content' || Math.random() < 0.4) { companionFloat(COMPANION_MOODS[mood].icon); return 'emote'; }
  return '';
}
setInterval(() => { if (typeof wanderPaused === 'function' && wanderPaused()) return; try { companionAiTick(Date.now()); } catch (e) { /* the companion is decoration: never break the game */ } }, COMPANION_AI.checkMs);
