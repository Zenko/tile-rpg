/* Loads the battle engine and card data in plain Node, with no browser and no build step.
   js/data-and-engine.js is the same file the game loads in a page; it touches no DOM, so it runs unchanged in a bare vm context.
   This is the seed of the future match server: `const { BattleEngine, CARD_POOL } = require('./server/load-engine')()`.
   Everything the server needs to referee a match is BattleEngine.newGame/replay/step/simulate (see "Seeds, match records and
   replay" in js/data-and-engine.js). */
const vm = require('vm'), fs = require('fs'), path = require('path');

module.exports = function loadEngine() {
  const file = path.join(__dirname, '..', 'js', 'data-and-engine.js');
  const ctx = vm.createContext({ console });
  // const/let at the top of the file are not properties of the context, so the exports are collected in the same script.
  vm.runInContext(fs.readFileSync(file, 'utf8') + '\n;this.__engine = { BattleEngine, CARD_POOL, defOf: BattleEngine.defOf };', ctx, { filename: 'js/data-and-engine.js' });
  return ctx.__engine;
};
