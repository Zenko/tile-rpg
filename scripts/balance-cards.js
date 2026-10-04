// Per-card contribution: the same random decks play with and without each card swapped in (same seeds), and the change in win % is printed.
// Most cards land within about +-5; the mean per family and rarity should sit near 0. usage: node scripts/balance-cards.js [games=800]
const { BattleEngine: BE, CARD_POOL } = require('../server/load-engine')();
const fs = require('fs');
const N = +(process.argv[2] || 800);
const src = fs.readFileSync(require('path').join(__dirname, '..', 'js', 'data-and-engine.js'), 'utf8'), lm = src.match(/const lists = \{([\s\S]*?)\n  \};/)[1], FAM = {};
for (const m of lm.matchAll(/(\w+): '([^']+)'/g)) m[2].split(/\s+/).forEach(id => FAM[id] = m[1]);
const pool = CARD_POOL.filter(c => !c.exclusive && !c.foe);
let s = 777; const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; const pick = a => a[Math.floor(rnd() * a.length)];
const randDeck = () => { const d = []; while (d.length < 12) { const c = pick(pool); if (d.filter(x => x === c.id).length < 2) d.push(c.id); } return d; };
// the same decks for every card (common random numbers), so differences are the card, not the luck
const cases = []; for (let i = 0; i < N; i++) cases.push({ base: randDeck(), foe: randDeck(), slot: Math.floor(rnd() * 12) });
const baseWin = cases.map((c, i) => { const side = i % 2; return BE.simulate(i + 1, side === 0 ? c.base : c.foe, side === 0 ? c.foe : c.base, {}).G.winner === side ? 1 : 0; });
const out = {};
for (const card of pool) {
  let w = 0;
  cases.forEach((c, i) => { const d = c.base.slice(); if (!d.includes(card.id)) d[c.slot] = card.id; const side = i % 2; w += BE.simulate(i + 1, side === 0 ? d : c.foe, side === 0 ? c.foe : d, {}).G.winner === side ? 1 : 0; });
  out[card.id] = +((w - baseWin.reduce((a, b) => a + b, 0)) / N * 100).toFixed(1);
}
const byFam = {}, byRar = {};
pool.forEach(c => { const f = c.spell ? 'spell' : FAM[c.id]; (byFam[f] = byFam[f] || []).push(out[c.id]); (byRar[c.rarity] = byRar[c.rarity] || []).push(out[c.id]); });
const mean = a => +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(1);
console.log(JSON.stringify({ cards: out, byFam: Object.fromEntries(Object.entries(byFam).map(([k, v]) => [k, mean(v)])), byRar: Object.fromEntries(Object.entries(byRar).map(([k, v]) => [k, mean(v)])) }));
