// Balance search (used for the build 151 pass): nudges one creature's power or grit by 1 (never more than 2 from where it started, within a floor and a
// ceiling for its cost and rarity) and keeps the change if the family decks, a mixed deck and an aggro / midrange / wall bench move closer to their
// targets, judged on fresh random decks each step. Writes the accepted changes to a JSON file (apply them by hand or with a script).
// usage: node scripts/balance-search.js <gamesPerMatchup> <iterations> <out.json> <start.json|{}> <frozen.json|{}>
// Greedy balance search: nudge one card's power or grit by 1 (never more than 2 from the original, never below 1) and keep the change if the
// objective improves. Objective: the four mono-family decks and a mixed deck should win about equally head to head, an aggro / midrange / wall bench
// should land near its target, nothing should be wildly better or worse than the rest.
const { BattleEngine: BE, CARD_POOL } = require('../server/load-engine')();
const fs = require('fs');
const N = +(process.argv[2] || 200), ITERS = +(process.argv[3] || 300), OUT = process.argv[4], START = process.argv[5];
const src = fs.readFileSync(require('path').join(__dirname, '..', 'js', 'data-and-engine.js'), 'utf8'), lm = src.match(/const lists = \{([\s\S]*?)\n  \};/)[1], FAM = {};
for (const m of lm.matchAll(/(\w+): '([^']+)'/g)) m[2].split(/\s+/).forEach(id => FAM[id] = m[1]);
const pool = CARD_POOL.filter(c => !c.exclusive && !c.foe);
const creatures = pool.filter(c => !c.spell);
const orig = Object.fromEntries(creatures.map(c => [c.id, { power: c.power, grit: c.grit }]));
if (START) for (const [id, p] of Object.entries(JSON.parse(fs.readFileSync(START, 'utf8')))) Object.assign(CARD_POOL.find(x => x.id === id), p);
const fams = ['grove', 'stone', 'tide', 'wind'];
const benches = {
  aggro: ['origami-crane','origami-crane','flintstone','flintstone','firefly','firefly','feather','feather','gale','kite-runner','ember-fox','moon-dragon'],
  mid:   ['sprout','sprout','toadstool','toadstool','geode','geode','blossom','blossom','crystal-spire','stone-lantern','aurora-stag','sky-whale'],
  wall:  ['pebble','pebble','geode','geode','bubble','bubble','old-kettle','hollow-log','jade-turtle','moonstone','mossy-titan','hermit-crab']
};
const TARGET = { aggro: 62, mid: 50, wall: 45 };
const famOf = deck => { const c = {}; deck.forEach(id => { if (FAM[id]) c[FAM[id]] = (c[FAM[id]] || 0) + 1; }); const b = Object.entries(c).sort((a, z) => z[1] - a[1])[0]; return b && b[1] >= 8 ? b[0] : null; };
function duel(A, B, n) {
  let w = 0;
  for (let g = 0; g < n; g++) { const side = g % 2, d0 = side ? B : A, d1 = side ? A : B;
    const r = BE.simulate(g + 1, d0, d1, { levels: ['smart', 'smart'], opts: { passive: [famOf(d0), famOf(d1)] } }); if ((r.G.winner === 0) === (side === 0)) w++; }
  return w / n * 100;
}
// Robust evaluation: several decks per group, each built (with the game's own Auto-fill) from a fixed random subset of the cards, so one card
// flipping a single deck's make-up cannot swing the result.
const K = 5; let sr = 4242; const srnd = () => (sr = (sr * 1664525 + 1013904223) >>> 0) / 4294967296;
let SUBS = {};
function resample(seedv) { sr = seedv; SUBS = {}; fams.concat(['mixed']).forEach(g => { SUBS[g] = []; for (let k = 0; k < K; k++) { const src = g === 'mixed' ? pool : pool.filter(c => FAM[c.id] === g); SUBS[g].push(src.filter(() => srnd() < (g === 'mixed' ? 0.5 : 0.75)).map(c => c.id)); } }); }
resample(4242);
function evaluate() {
  const dk = {}; Object.keys(SUBS).forEach(g => dk[g] = SUBS[g].map(ids => BE.suggestDeck(Object.fromEntries(ids.map(id => [id, 2])))));
  const names = Object.keys(dk), t = {}; names.forEach(n => t[n] = []);
  for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) for (let a = 0; a < K; a++) for (let b = 0; b < K; b++) { const w = duel(dk[names[i]][a], dk[names[j]][b], Math.round(N / 4)); t[names[i]].push(w); t[names[j]].push(100 - w); }
  const wr = {}; names.forEach(n => wr[n] = t[n].reduce((a, b) => a + b, 0) / t[n].length);
  const bn = {}; for (const [k, d] of Object.entries(benches)) { let sum = 0, c = 0; names.forEach(n => dk[n].forEach(dd => { sum += duel(d, dd, Math.round(N / 4)); c++; })); bn[k] = sum / c; }
  let J = 0; names.forEach(n => J += (wr[n] - (n === 'mixed' ? 46 : 50)) ** 2); for (const k of Object.keys(benches)) J += 0.6 * (bn[k] - TARGET[k]) ** 2;
  return { J, wr, bn };
}
let seed = 4711; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const patch = () => Object.fromEntries(creatures.filter(c => c.power !== orig[c.id].power || c.grit !== orig[c.id].grit).map(c => [c.id, { power: c.power, grit: c.grit }]));
const FLOOR = { common: { 1: 3, 2: 4, 3: 6 }, rare: { 2: 4, 3: 5 }, ultra: { 3: 6, 4: 7 }, super: { 4: 10 }, mythic: { 5: 14 } };
let acc = 0; const FROZEN = new Set(Object.keys(JSON.parse(fs.readFileSync(process.argv[6], 'utf8'))));
for (let it = 0; it < ITERS; it++) {
  resample(13000 + it);                 // fresh decks every iteration; the current cards and the candidate are both judged on these same ones
  const cur = evaluate();
  const names = Object.keys(cur.wr), worst = names.slice().sort((a, b) => Math.abs(cur.wr[b] - 50) - Math.abs(cur.wr[a] - 50))[0];
  let cand, dir;
  if (rnd() < 0.2) { const k = Object.keys(benches).sort((a, b) => Math.abs(cur.bn[b] - TARGET[b]) - Math.abs(cur.bn[a] - TARGET[a]))[0]; const ids = benches[k]; cand = CARD_POOL.find(x => x.id === ids[Math.floor(rnd() * ids.length)]); dir = cur.bn[k] > TARGET[k] ? -1 : 1; }
  else { const set = worst === 'mixed' ? creatures : creatures.filter(c => FAM[c.id] === worst); cand = set[Math.floor(rnd() * set.length)]; dir = cur.wr[worst] > (worst === 'mixed' ? 46 : 50) ? -1 : 1; }
  if (!cand || cand.spell || FROZEN.has(cand.id)) continue;
  const field = rnd() < 0.5 ? 'power' : 'grit', o = orig[cand.id][field], nv = cand[field] + dir;
  if (nv < 1 || Math.abs(nv - o) > 2) continue;
  const total = (field === 'power' ? nv + cand.grit : cand.power + nv), fl = ((FLOOR[cand.rarity] || {})[cand.cost] || 0) - (cand.kw.includes('swift') ? 1 : 0);
  const CEIL = { common: { 1: 5, 2: 6, 3: 8 }, rare: { 2: 5, 3: 8 }, ultra: { 3: 9, 4: 11 }, super: { 4: 13 }, mythic: { 5: 18 } }, cl = (CEIL[cand.rarity] || {})[cand.cost] || 99;
  if (total < fl && dir < 0) continue;
  if (total > cl && dir > 0) continue;      // and never above the usual ceiling: no stat inflation
  const old = cand[field]; cand[field] = nv;
  const e = evaluate();
  if (e.J < cur.J - 6) { acc++; console.log(`it ${it}: ${cand.id}.${field} ${old}->${nv}  J ${cur.J.toFixed(0)}->${e.J.toFixed(0)}`); fs.writeFileSync(OUT, JSON.stringify(patch(), null, 1)); }
  else cand[field] = old;
}
console.log('done accepted', acc);
