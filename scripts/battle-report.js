// A battle report for the whole card pool: how the game plays, not how one card scores. AI against AI (smart both sides), fixed seeds, both seats.
//   A. What each rarity is worth   3 cards of a rarity swapped into an ordinary deck: do rarer cards actually help?
//   B. Families            the best deck each family can build, against the others and against a panel of random decks
//   C. Keywords            the best deck built around each keyword against the same panel
//   F. Companion cheers   each cheer's win-rate gain for a random deck (bond 2 and bond 3), the aim is about +1 to +3 and +2 to +5
//   E. Weekly rules       each rule's aimed-at deck with and without the rule, against the same panel: it should help that deck, not make it unbeatable
//   G. Depth (the second lap)   a family deck against a district boss at Depth 0 to 5: the aim is a steady fall of about 5 to 7 points a Depth, from about 50% at Depth 1 to 25% at Depth 5 (the all-cards deck runs about 15 points higher)
//   D. Shape of a game     who goes first, how long games last, how often a game stalls, how often spells are cast
// usage: node scripts/battle-report.js [games per pairing=300]      (about a minute; same seeds every run, so two runs are comparable)
const { BattleEngine: BE, CARD_POOL, WEEKLY_RULES, DEPTH_MAX, depthProfile, depthMods, depthDeck } = require('../server/load-engine')();   // the engine's CHEERS are read from BE
const N = +process.argv[2] || 300;
const base = CARD_POOL.filter(c => !c.exclusive && !c.foe);
const RANK = ['common', 'rare', 'ultra', 'super', 'mythic'];
const deckFrom = cards => { const counts = {}; cards.forEach(c => { counts[c.id] = 2; }); return BE.suggestDeck(counts); };
// win rate of deckA over deckB across N games, half in each seat
function duel(a, b, n, mods) {
  let w = 0;
  for (let i = 0; i < n; i++) { const side = i % 2, r = BE.simulate(5000 + i, side === 0 ? a : b, side === 0 ? b : a, mods ? { opts: { mods } } : {}); if (r.G.winner === side ? 1 : 0) w++; }
  return w / n * 100;
}
const pct = x => (x.toFixed(0) + '%').padStart(5);
const all = deckFrom(base);
// A single reference deck makes an archetype look good or bad by accident, so families and keywords are measured against a panel of 30 varied random decks (50% = as good as a random deck).
let ps = 31337; const prnd = () => (ps = (ps * 1664525 + 1013904223) >>> 0) / 4294967296;
const panel = []; while (panel.length < 30) { const d = []; while (d.length < 12) { const c = base[Math.floor(prnd() * base.length)]; if (d.filter(x => x === c.id).length < 2) d.push(c.id); } panel.push(d); }
const vsPanel = (deck, mods) => panel.reduce((a, d) => a + duel(deck, d, Math.max(4, Math.round(N / 25)), mods), 0) / panel.length;

console.log('A. WHAT EACH RARITY IS WORTH (a random deck with 3 cards of the rarity slotted in, against the same deck without them; 50% = no help)');
let rs = 4711; const rr = () => (rs = (rs * 1664525 + 1013904223) >>> 0) / 4294967296, pickFrom = a => a[Math.floor(rr() * a.length)];
const creatures = base.filter(c => !c.spell);
const randFrom = (pool, n, d) => { while (d.length < n) { const c = pickFrom(pool); if (d.filter(x => x === c.id).length < 2) d.push(c.id); } return d; };
RANK.forEach(r => {
  const rarityPool = creatures.filter(c => c.rarity === r); let w = 0, g = 0;
  for (let i = 0; i < N * 2; i++) {
    const plain = randFrom(creatures.filter(c => c.rarity === 'common' || c.rarity === 'rare'), 12, []);      // an ordinary common-and-rare deck
    const boosted = randFrom(rarityPool, 3, []).concat(plain.slice(3));   // 3 of the rarity replace 3 of its cards
    const side = i % 2; g++; if (BE.simulate(20000 + i, side === 0 ? boosted : plain, side === 0 ? plain : boosted, {}).G.winner === side) w++;
  }
  console.log('  ' + (r + ' x3').padEnd(12) + pct(w / g * 100));
});

console.log('\nB. FAMILIES (best deck of each family; spells included)');
const fam = id => BE.familyOf(id);
const fams = ['grove', 'stone', 'tide', 'wind'].map(f => ({ f, deck: deckFrom(base.filter(c => fam(c.id) === f || c.spell)) }));
console.log(' '.repeat(10) + fams.map(c => c.f.padStart(8)).join('') + '   vs 30 random decks');
fams.forEach(r => console.log(r.f.padEnd(10) + fams.map(c => (r === c ? '-' : pct(duel(r.deck, c.deck, N))).padStart(8)).join('') + pct(vsPanel(r.deck)).padStart(18)));

console.log('\nC. KEYWORDS (a deck built around one keyword, against 30 random decks; 50% = an average deck)');
Object.keys(BE.KEYWORDS).forEach(k => {
  const cards = base.filter(c => c.kw.includes(k)); if (cards.length < 6) return;
  const deck = deckFrom(cards.concat(base.filter(c => !c.kw.includes(k) && !c.spell && c.kw.length === 0)));   // the keyword's cards first, plain bodies to fill
  console.log((BE.KEYWORDS[k].name + ' (' + cards.length + ' cards)').padEnd(24) + pct(vsPanel(deck)));
});

console.log('  (reference: the all-cards deck scores ' + pct(vsPanel(all)).trim() + ' against the panel)');
console.log('\nD. SHAPE OF A GAME (random 12-card decks, same seeds each run)');
let s = 99; const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
const randDeck = () => { const d = []; while (d.length < 12) { const c = base[Math.floor(rnd() * base.length)]; if (d.filter(x => x === c.id).length < 2) d.push(c.id); } return d; };
let first = 0, turns = [], stuck = 0, inDeck = 0, cast = 0;
for (let i = 0; i < N * 2; i++) {
  const a = randDeck(), b = randDeck(), G = BE.simulate(9000 + i, a, b, {}).G;
  inDeck += a.concat(b).filter(id => BE.defOf(id).spell).length;
  cast += (G.events || []).filter(e => e.type === 'spell').length;
  if (!G.over) { stuck++; continue; }
  if (G.winner === G.first) first++;
  turns.push(G.turn);
}
turns.sort((x, y) => x - y);
const played = turns.length;
console.log(`  first player wins ${(first / played * 100).toFixed(1)}%   (the second seat gets a catch-up bonus; about 50 is the aim)`);
console.log(`  turns per game: median ${turns[played >> 1]}, 10th pct ${turns[Math.floor(played * .1)]}, 90th pct ${turns[Math.floor(played * .9)]}, over 25 turns ${(turns.filter(t => t > 25).length / played * 100).toFixed(1)}%`);
console.log(`  games that never ended (stalled): ${stuck}`);
console.log(`  spells: ${inDeck} in decks, ${cast} cast (${inDeck ? (cast / inDeck * 100).toFixed(0) : 0}% of the spells in a deck are cast during a game)`);

console.log('\nE. WEEKLY RULES (the deck each rule is aimed at, against the panel, without and with the rule; both sides get the rule)');
const kwOf = r => { const m = r.mods; return m.swiftBonus ? 'swift' : m.mendBonus ? 'mend' : m.shieldHp ? 'shield' : m.bloomStart ? 'bloom' : m.echoBonus ? 'echo' : m.guardHp ? 'guard' : m.thornsBonus ? 'thorns' : m.drainBonus ? 'drain' : m.rallyBonus ? 'rally' : m.kwHp ? Object.keys(m.kwHp)[0] : m.kwPower ? Object.keys(m.kwPower)[0] : null; };
WEEKLY_RULES.forEach(r => {
  const k = kwOf(r), f = r.mods.weekFam && r.mods.weekFam.family;
  const deck = f ? deckFrom(base.filter(c => fam(c.id) === f || c.spell)) : deckFrom(base.filter(c => c.kw.includes(k)).concat(base.filter(c => !c.kw.includes(k) && !c.spell && c.kw.length === 0)));
  const off = vsPanel(deck), on = vsPanel(deck, r.mods);
  console.log('  ' + r.name.padEnd(18) + (f || BE.KEYWORDS[k].name).padEnd(10) + pct(off) + ' ->' + pct(on) + '  (' + (on - off >= 0 ? '+' : '') + (on - off).toFixed(0) + ')');
});

console.log('\nF. COMPANION CHEERS (a random deck with the cheer against the same deck without it, same seeds, both seats; the AI uses it at the end of its turn)');
{
  let cs = 2024; const cr = () => (cs = (cs * 1664525 + 1013904223) >>> 0) / 4294967296;
  const cd = () => { const d = []; while (d.length < 12) { const c = base[Math.floor(cr() * base.length)]; if (d.filter(x => x === c.id).length < 2) d.push(c.id); } return d; };
  const pairs = []; for (let i = 0; i < Math.max(300, N * 2); i++) pairs.push([cd(), cd()]);
  const rate = (perk, tier) => { let w = 0; pairs.forEach(([a, b], i) => { const side = i % 2, opts = perk ? { opts: { cheer: side === 0 ? [perk, null] : [null, perk], cheerTier: side === 0 ? [tier, null] : [null, tier] } } : {};
    if (BE.simulate(30000 + i, a, b, opts).G.winner === side) w++; }); return w / pairs.length * 100; };
  const off = rate(null);
  Object.keys(BE.CHEERS).forEach(k => console.log('  ' + (BE.CHEERS[k].icon + ' ' + k).padEnd(12) + [1, 2].map(t => { const on = rate(k, t); return 'bond ' + (t + 1) + ': ' + (on - off >= 0 ? '+' : '') + (on - off).toFixed(1); }).join('   ')));
}

console.log('\nG. DEPTH (the second lap: a district boss at Depth 0-5, smart AI; the player brings the best deck a family can build, or the all-cards deck; both seats)');
const depthFam = { square: 'stone', market: 'wind', harbor: 'tide', garden: 'grove' };
const bestOf = fams.map(c => c.deck), strong = { 'all cards': all }; fams.forEach(c => { strong[c.f + ' deck'] = c.deck; });
const depthWin = (mine, district, depth, games) => {
  let w = 0, rs2 = 777 + depth * 31; const r2 = () => (rs2 = (rs2 * 1664525 + 1013904223) >>> 0) / 4294967296;
  const prof = depthProfile(depth, true), mods = depthMods(district, depth);
  for (let i = 0; i < games; i++) {
    const boss = depthDeck(base, r2, depth, depthFam[district]), side = i % 2, sp = side === 0 ? [20, prof.spirit] : [prof.spirit, 20];
    const r = BE.simulate(41000 + i, side === 0 ? mine : boss, side === 0 ? boss : mine, { opts: { spirit: sp, mods } });
    if (r.G.winner === side) w++;
  }
  return w / games * 100;
};
const games = Math.max(40, Math.round(N / 2));
console.log(' '.repeat(14) + Array.from({ length: DEPTH_MAX + 1 }, (_, d) => ('D' + d).padStart(6)).join(''));
Object.keys(strong).forEach(name => {
  const row = Array.from({ length: DEPTH_MAX + 1 }, (_, d) => Object.keys(depthFam).reduce((a, k) => a + depthWin(strong[name], k, d, games), 0) / 4);
  console.log(name.padEnd(14) + row.map(x => pct(x).padStart(6)).join(''));
});
const avgRow = Array.from({ length: DEPTH_MAX + 1 }, (_, d) => panel.slice(0, 6).reduce((a, p) => a + Object.keys(depthFam).reduce((b, k) => b + depthWin(p, k, d, Math.max(10, games / 4)), 0) / 4, 0) / 6);
console.log('random deck'.padEnd(14) + avgRow.map(x => pct(x).padStart(6)).join(''));
