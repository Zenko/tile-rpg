// Seeded matches replay exactly, a tampered move is caught, and Node plays the same match as the browser (the basis for a server referee).
const loadEngine = require('../server/load-engine');

// Runs in both worlds, so it takes the engine as arguments and uses nothing else.
function run(E, CARD_POOL) {
  const ids = CARD_POOL.filter(c => !c.exclusive && !c.foe).map(c => c.id);
  const mk = seed => { const r = E.makeRng('deck' + seed), d = []; while (d.length < 12) { const id = ids[Math.floor(r() * ids.length)]; if (d.filter(x => x === id).length < 2) d.push(id); } return d; };
  const hash = s => { let h = 0; for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0; return h; };
  const out = { games: [], replayMismatch: [], unfinished: [], tamper: null };
  const levels = [['smart', 'smart'], ['normal', 'smart'], ['smart', 'gentle']];
  for (let seed = 1; seed <= 120; seed++) {
    const { G, record } = E.simulate(seed, mk(seed * 2), mk(seed * 2 + 1), { levels: levels[seed % 3], opts: { first: seed % 2 }, mulligan: [seed % 2 === 0, seed % 3 === 0] });
    const ev = JSON.stringify(G.events), R = E.replay(record);
    if (!G.over) out.unfinished.push(seed);
    if (JSON.stringify(R.events) !== ev || R.winner !== G.winner || R.turn !== G.turn || R.replayError) out.replayMismatch.push(seed);
    out.games.push([seed, G.winner, G.turn, ev.length, hash(ev), G.p[0].spirit, G.p[1].spirit]);
  }
  // Tamper: point the first attack at a card that does not exist; the rules must refuse it, never silently accept it.
  const { record } = E.simulate(5, mk(10), mk(11));
  const i = record.actions.findIndex(a => a.type === 'attack');
  if (i >= 0) {
    const bad = JSON.parse(JSON.stringify(record)); bad.actions[i].uid = 99999;
    const R = E.replay(bad); out.tamper = { index: i, rejected: !!R.replayError };
  }
  // The AI has its own random stream: however many numbers it burns, a later mulligan must deal the same cards as in a game where it burned none.
  const g1 = E.newGame(mk(40), mk(41), null, { seed: 9 }), g2 = E.newGame(mk(40), mk(41), null, { seed: 9 });
  E.startTurn(g1); E.startTurn(g2);
  const ai = g1.aiRng || g1.rng; for (let k = 0; k < 50; k++) ai();
  E.mulligan(g1, 0); E.mulligan(g2, 0);
  const handOf = G => JSON.stringify(G.p[0].hand.map(c => c.id));
  out.aiStreamIsolated = handOf(g1) === handOf(g2);

  // Different seeds must not all play the same match.
  out.distinct = new Set(out.games.map(g => g[4])).size;
  return out;
}

module.exports = async (page, assert) => {
  const { BattleEngine, CARD_POOL } = loadEngine();
  const node = run(BattleEngine, CARD_POOL);
  assert.deepStrictEqual(node.unfinished, [], 'games that never finished: ' + node.unfinished);
  assert.deepStrictEqual(node.replayMismatch, [], 'replay differs from the played match for seeds: ' + node.replayMismatch);
  assert.ok(node.tamper && node.tamper.rejected, 'a tampered attack was accepted: ' + JSON.stringify(node.tamper));
  assert.ok(node.aiStreamIsolated, 'the AI is drawing from the rules\' random stream, so replays would drift');
  assert.ok(node.distinct > 100, 'seeds are not giving different matches: ' + node.distinct);
  const browser = await page.evaluate(`(${run})(BattleEngine, CARD_POOL)`);
  assert.deepStrictEqual(browser.games, node.games, 'the browser and Node played different matches from the same seeds');
};
