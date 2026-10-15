// Nudges creature power/grit in content/cards.js toward a win-contribution ladder by rarity, one point per card per round.
// Same measurement as scripts/balance-cards.js (swap one card into random decks, same seeds, change in win %), but with a fresh seed each
// round and it WRITES content/cards.js. Floors and caps keep stat totals sane (no 1/1 commons, no 11/10 mythics).
// usage: node scripts/balance-tune.js [rounds=4] [games=6000] [threshold=1.5]      (about 4 minutes a round at 6000 games)
// Review the git diff afterwards: the metric is relative to the whole pool and noisy (about +-1), so a card that flips back and forth
// between rounds is noise, not a target. Spells are measured but never changed (edit their cost or effect by hand).
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), CARDS = path.join(ROOT, 'content', 'cards.js');
const TARGET = { common: -0.5, rare: 0.3, ultra: 1, super: 1.8, mythic: 2.5 };          // wanted mean contribution per rarity
const MIN = { common: 4, rare: 7, ultra: 8, super: 10, mythic: 14 }, MAX = { common: 6, rare: 10, ultra: 12, super: 14, mythic: 20 };   // power + grit
const ROUNDS = +process.argv[2] || 4, N = +process.argv[3] || 6000, THRESH = +process.argv[4] || 1.5;

function measure(seed) {
  const { BattleEngine: BE, CARD_POOL } = require('../server/load-engine')();     // re-reads content/cards.js each round
  const pool = CARD_POOL.filter(c => !c.exclusive && !c.foe);
  let s = seed; const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296, pick = a => a[Math.floor(rnd() * a.length)];
  const randDeck = () => { const d = []; while (d.length < 12) { const c = pick(pool); if (d.filter(x => x === c.id).length < 2) d.push(c.id); } return d; };
  const cases = []; for (let i = 0; i < N; i++) cases.push({ base: randDeck(), foe: randDeck(), slot: Math.floor(rnd() * 12) });
  const win = (d, c, i) => { const side = i % 2; return BE.simulate(i + 1, side === 0 ? d : c.foe, side === 0 ? c.foe : d, {}).G.winner === side ? 1 : 0; };
  const bt = cases.reduce((a, c, i) => a + win(c.base, c, i), 0), out = {};
  for (const card of pool) {
    let w = 0; cases.forEach((c, i) => { const d = c.base.slice(); if (!d.includes(card.id)) d[c.slot] = card.id; w += win(d, c, i); });
    out[card.id] = (w - bt) / N * 100;
  }
  return { out, pool };
}

for (let r = 0; r < ROUNDS; r++) {
  const { out, pool } = measure(1000 + r * 7919);
  let src = fs.readFileSync(CARDS, 'utf8'); const changes = [];
  for (const c of pool) {
    if (c.spell) continue;
    const err = out[c.id] - TARGET[c.rarity]; if (Math.abs(err) < THRESH) continue;
    let p = c.power, g = c.grit;
    const lo = c.rarity === 'common' && c.cost === 1 ? 3 : MIN[c.rarity];
    if (err < 0) { if (p + g >= MAX[c.rarity]) continue; if (p <= g) p++; else g++; }     // buff the smaller stat
    else { if (p + g <= lo) continue; if (p > g) p--; else g--; if (p < 1 || g < 1) continue; }   // nerf the larger one
    const re = new RegExp("(\\{ id: '" + c.id + "',[^\\n]*?cost: \\d+, power: )\\d+(, grit: )\\d+");
    if (!re.test(src)) continue;
    src = src.replace(re, (m, a, b) => a + p + b + g); changes.push(`${c.id} ${c.power}/${c.grit}->${p}/${g} (${out[c.id].toFixed(1)})`);
  }
  fs.writeFileSync(CARDS, src);
  const by = {}; pool.filter(c => !c.spell).forEach(c => (by[c.rarity] = by[c.rarity] || []).push(out[c.id]));
  console.log(`round ${r + 1}: ${changes.length} changes; mean by rarity`, Object.fromEntries(Object.entries(by).map(([k, v]) => [k, +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(1)])));
  if (changes.length) console.log('  ' + changes.join(', ')); else break;
}
