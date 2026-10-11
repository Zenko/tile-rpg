// Playtest telemetry: anonymous counters from the AI systems, carried in the stats summary, and an analysis script that reads an export.
const { execFileSync } = require('child_process'), path = require('path');
module.exports = async (page, assert) => {
  const r = await page.evaluate(() => {
    const out = {}; state.progress.telemetry = {};
    teleInc('approach.started'); teleInc('approach.started'); teleInc('approach.accepted'); teleInc('events.market-day', 3);
    const t = teleStore(); out.inc = t.approach.started === 2 && t.approach.accepted === 1 && t.events['market-day'] === 3;
    out.safe = (() => { try { teleInc(''); teleInc('a.b.c.d'); teleStore().odd = 5; teleInc('odd.deeper'); return true; } catch (e) { return false; } })();
    // battle results
    state.progress.telemetry = {}; state.deck = ['sprout', 'sprout', 'pebble', 'droplet', 'toadstool', 'firefly', 'bubble', 'flintstone', 'origami-crane', 'dove', 'gale', 'hedgehog'];
    teleBattle({ npc: { adaptive: true, aiStyle: 'greedy', tilt: -1, name: 'X' }, neutral: false }, true);
    teleBattle({ npc: { adaptive: true, aiStyle: null, tilt: 0, name: 'Y' }, neutral: false }, false);
    teleBattle({ npc: { isBoss: true, name: 'Z', aiStyle: 'defensive', tilt: null }, neutral: false }, true);
    teleBattle({ npc: { isRival: true, name: 'R', aiStyle: null }, neutral: false }, false);
    teleBattle({ npc: { name: 'cup' }, neutral: false }, true);               // a special match: ignored
    teleBattle({ npc: { adaptive: true, name: 'N' }, neutral: true }, true);  // neutral (spar / draft): ignored
    const e = teleStore();
    out.styles = e.styles.greedy.w === 1 && e.styles.plain.l === 2 && e.styles.defensive.w === 1;
    out.kinds = e.kinds.neighbour.w === 1 && e.kinds.neighbour.l === 1 && e.kinds.boss.w === 1 && e.kinds.rival.l === 1 && !e.kinds.special;
    out.tilt = e.tilt['-1'].w === 1 && e.tilt['0'].l === 1 && !e.tilt['null'];
    out.cards = e.cards.sprout.p === 4 && e.cards.pebble.p === 4 && e.cards.sprout.w === 2 && e.cards.pebble.w === 2;   // a card counts once per match, 4 counted matches, 2 won
    out.ignored = !(e.styles.cup) && JSON.stringify(e).indexOf('"N"') < 0;
    // in the stats summary, as numbers and ids only
    const s = statsSummary(); out.summary = !!s.ai && s.ai.styles.greedy.w === 1;
    out.anon = !/X|Y|Z|name/.test(JSON.stringify(s.ai));
    state.progress.telemetry = {}; out.empty = teleSummary() === null && statsSummary().ai === null;
    // the AI systems feed it: a coach tip, an eased match
    state.progress.telemetry = {};
    coachNote({ coach: { turns: 5, unspent: 3, spellHeld: 0, wasted: 4, idle: 0, firstIdle: false } }, [], []);
    out.coach = teleStore().coach.shown === 1 && teleStore().coach.unspent === 1;
    return out;
  });
  Object.keys(r).forEach(k => assert.ok(r[k], 'telemetry: ' + k));
  // the analysis script reads the sample export and flags the outliers
  const script = path.join(__dirname, '..', 'scripts', 'analyze-stats.py'), sample = path.join(__dirname, 'fixtures', 'stats-sample.json');
  let rep; try { rep = execFileSync('python3', [script, sample], { encoding: 'utf8' }); } catch (e) { rep = null; }
  assert.ok(rep, 'the analysis script runs on the sample export');
  assert.ok(/Players in export: 7/.test(rep) && /with AI counters: 6/.test(rep), 'it counts players and skips old builds');
  assert.ok(/card sky-whale may be too strong/.test(rep) && /card pebble may be too weak/.test(rep), 'it flags outlier cards');
  assert.ok(/style aggressive/.test(rep), 'it flags a style far from plain');
  assert.ok(!/unexpected: the eased matches/.test(rep), 'the sample tilt behaves as expected');
};
