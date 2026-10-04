// Family balance: random 12-card decks of each family (built with the game's own Auto-fill from a random 75% of that family, passives on) and of
// mixed cards play each other; prints each group's average win %. A balanced game has every group near 50. Slow (about a minute at the defaults).
// usage: node scripts/balance-families.js [decksPerGroup=16] [gamesPerMatchup=30] [rngSeed]
const dir = require('path').join(__dirname, '..'), K = +(process.argv[2] || 16), G = +(process.argv[3] || 30);
const { BattleEngine: BE, CARD_POOL } = require(dir + '/server/load-engine')();
const fs = require('fs');
const src = fs.readFileSync(dir + '/js/data-and-engine.js', 'utf8'), lm = src.match(/const lists = \{([\s\S]*?)\n  \};/)[1], FAM = {};
for (const m of lm.matchAll(/(\w+): '([^']+)'/g)) m[2].split(/\s+/).forEach(id => FAM[id] = m[1]);
const pool = CARD_POOL.filter(c => !c.exclusive && !c.foe), fams = ['grove', 'stone', 'tide', 'wind'];
let sr = +(process.argv[4] || 123456); const rnd = () => (sr = (sr * 1664525 + 1013904223) >>> 0) / 4294967296;
const famOf = deck => { const c = {}; deck.forEach(id => { if (FAM[id]) c[FAM[id]] = (c[FAM[id]] || 0) + 1; }); const b = Object.entries(c).sort((a, z) => z[1] - a[1])[0]; return b && b[1] >= 8 ? b[0] : null; };
const groups = {};
fams.forEach(f => { groups[f] = []; for (let k = 0; k < K; k++) groups[f].push(BE.suggestDeck(Object.fromEntries(pool.filter(c => FAM[c.id] === f && rnd() < 0.75).map(c => [c.id, 2])))); });
groups.mixed = []; for (let k = 0; k < K; k++) groups.mixed.push(BE.suggestDeck(Object.fromEntries(pool.filter(() => rnd() < 0.5).map(c => [c.id, 2]))));
const names = Object.keys(groups), tot = Object.fromEntries(names.map(n => [n, { w: 0, n: 0 }])); let seed = 1, turns = 0, games = 0;
for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) for (let a = 0; a < K; a++) for (let b = 0; b < K; b++) {
  const A = groups[names[i]][a], B = groups[names[j]][b]; let w = 0;
  for (let g = 0; g < G; g++) { const side = g % 2, d0 = side ? B : A, d1 = side ? A : B, r = BE.simulate(seed++, d0, d1, { levels: ['smart', 'smart'], opts: { passive: [famOf(d0), famOf(d1)] } }); turns += r.G.turn; games++; if ((r.G.winner === 0) === (side === 0)) w++; }
  tot[names[i]].w += w; tot[names[i]].n += G; tot[names[j]].w += G - w; tot[names[j]].n += G;
}
const out = {}; names.forEach(n => out[n] = +(tot[n].w / tot[n].n * 100).toFixed(1));
// per-deck spread inside a family (how much the deck you build matters)
const spread = {}; fams.forEach(f => { const rates = groups[f].map(d => { let w = 0, n = 0; names.filter(x => x !== f).forEach(o => groups[o].slice(0, 4).forEach(od => { for (let g = 0; g < 6; g++) { const side = g % 2, d0 = side ? od : d, d1 = side ? d : od, r = BE.simulate(seed++, d0, d1, { levels: ['smart', 'smart'], opts: { passive: [famOf(d0), famOf(d1)] } }); if ((r.G.winner === 0) === (side === 0)) w++; n++; } })); return w / n * 100; }); const m = rates.reduce((a, b) => a + b) / rates.length; spread[f] = { mean: +m.toFixed(0), sd: +Math.sqrt(rates.reduce((a, b) => a + (b - m) ** 2, 0) / rates.length).toFixed(0), min: +Math.min(...rates).toFixed(0), max: +Math.max(...rates).toFixed(0) }; });
console.log(JSON.stringify({ wr: out, spread, avgTurns: +(turns / games / 2).toFixed(1) }));
