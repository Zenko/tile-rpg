/* ============================================================
   NEIGHBOUR MEMORY (build 222)
   Neighbours remember how they have got on with you, so they stop feeling like fresh strangers every time. Per neighbour (keyed like friendship,
   "district:Name") state.progress.memory keeps small counters:
     won / lost  matches you won and lost against them        streak  your current run against them (+ wins, - losses)
     helped      favours you finished for them                gifts   loaves, dishes and cards you gave them
     chats       days you chatted                             ignored times they came over to you and you walked on (reset when you answer)
     first / seen  when you first met and last spoke          lastWin / lastLoss  when
   The list is capped (the least recently seen are dropped), because neighbours return under new names after a defeat.
   What it is used for:
     - what they say when you walk up (npcMemGreeting): a line about the last match, your help, a long absence, a streak,
     - their next deck: a neighbour you have beaten twice in a row "has been practising" and keeps one extra tough card (see npcDeckPlan),
     - Chat -> "What do you remember?" tells you the score between you.
   ============================================================ */
const NPC_MEM = { max: 60, recentMs: 10 * 60 * 1000, longMs: 24 * 3600 * 1000, practiceStreak: 2 };
function npcMemStore() { const p = state.progress; if (!p.memory || typeof p.memory !== 'object') p.memory = {}; return p.memory; }
function npcMemOf(f, create) {
  const st = npcMemStore(), k = neighborKey(f);
  if (!st[k] && create) st[k] = { won: 0, lost: 0, streak: 0, helped: 0, gifts: 0, chats: 0, ignored: 0, first: Date.now(), seen: Date.now(), lastWin: 0, lastLoss: 0 };
  return st[k] || null;
}
function npcMemTrim() {
  const st = npcMemStore(), keys = Object.keys(st);
  if (keys.length > NPC_MEM.max) keys.sort((a, b) => st[a].seen - st[b].seen).slice(0, keys.length - NPC_MEM.max).forEach(k => delete st[k]);
}
// A match against them ended. `won` is from your side.
function npcMemBattle(f, won, now) {
  if (!f) return; now = now || Date.now();
  const m = npcMemOf(f, true);
  if (won) { m.won++; m.streak = m.streak > 0 ? m.streak + 1 : 1; m.lastWin = now; }
  else { m.lost++; m.streak = m.streak < 0 ? m.streak - 1 : -1; m.lastLoss = now; }
  m.seen = now; npcMemTrim(); saveState();
}
// Something else happened between you: why is addFriendship's reason ('favour', 'bread', 'dish', 'card', 'chat', 'win', 'trade') or 'ignored' / 'answered'.
function npcMemNote(f, why, now) {
  if (!f || f.isBoss || f.isRival || f.signature) return; now = now || Date.now();
  const m = npcMemOf(f, true);
  if (why === 'favour') m.helped++;
  else if (why === 'bread' || why === 'dish' || why === 'card') m.gifts++;
  else if (why === 'chat') m.chats++;
  else if (why === 'ignored') m.ignored++;
  else if (why === 'answered') m.ignored = 0;
  if (why !== 'ignored') m.seen = now;
  npcMemTrim();
}
const npcMemWord = n => n === 1 ? 'once' : n === 2 ? 'twice' : n + ' times';
// A line that fits what has happened, or null. The most telling thing wins.
function npcMemGreeting(f, now) {
  const m = npcMemOf(f, false); if (!m) return null; now = now || Date.now();
  if (m.lastWin && now - m.lastWin < NPC_MEM.recentMs && m.lastWin >= m.lastLoss) return 'Hello again. You gave me quite a game just now. I am still thinking about that last turn.';
  if (m.lastLoss && now - m.lastLoss < NPC_MEM.recentMs && m.lastLoss > m.lastWin) return 'Good match earlier. I felt every card of that one. Fancy another?';
  if (m.streak >= 3) return `You have beaten me ${m.streak} times running. I am going to have to get cleverer.`;
  if (m.streak <= -3) return 'I will say it kindly: you are due a win. Shall we try again?';
  if (m.ignored >= 2) return 'There you are. I came looking for you earlier, but you were off somewhere. No harm done.';
  if (m.helped >= 2) return `Hello, friend. You have helped me ${npcMemWord(m.helped)} now. I do not forget that.`;
  if (m.seen && now - m.seen > NPC_MEM.longMs && (m.won + m.lost + m.chats + m.helped) > 0) return 'Well, look who it is. It has been a while.';
  return null;
}
// Chat -> "What do you remember?"
function npcMemSummary(f) {
  const m = npcMemOf(f, false);
  if (!m || !(m.won + m.lost + m.helped + m.gifts + m.chats)) return 'We have only just met. Give it time.';
  const bits = [];
  if (m.won + m.lost) bits.push(`We have played ${m.won + m.lost} ${m.won + m.lost === 1 ? 'match' : 'matches'}, and you lead ${m.won} to ${m.lost}.`.replace('you lead ' + m.won + ' to ' + m.lost, m.won > m.lost ? `you lead ${m.won} to ${m.lost}` : m.won < m.lost ? `I lead ${m.lost} to ${m.won}` : `we are level at ${m.won} each`));
  if (m.helped) bits.push(`You have helped me ${npcMemWord(m.helped)}.`);
  if (m.gifts) bits.push(`${m.gifts === 1 ? 'A gift' : m.gifts + ' gifts'} from you, which I have kept in mind.`);
  if (m.chats) bits.push(`And we have chatted on ${m.chats} ${m.chats === 1 ? 'day' : 'days'}.`);
  return bits.join(' ');
}
// Has this neighbour been beaten enough to practise?
function npcMemPractising(f) { const m = npcMemOf(f, false); return !!m && m.streak >= NPC_MEM.practiceStreak; }
