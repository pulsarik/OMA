// Compare against a saved bot.ts (or CommonJS bot.js) with the current rules.
// Each seed is played twice with the strategies swapping seats and cards.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { performance } = require('node:perf_hooks');
const ts = require('typescript');
const { botMove } = require('../dist/bot');
const { dealHand, recordPlayerMove, stacksAfterPayout } = require('../dist/game');

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index < 0 ? fallback : process.argv[index + 1];
}
const baselinePath = option('--baseline');
const pairs = Number(option('--pairs', 100));
const seedStart = Number(option('--seed', 12345));
const style = option('--style', 'normal');
if (!baselinePath || !Number.isInteger(pairs) || pairs < 2 || !Number.isInteger(seedStart)
  || !['normal', 'aggressive', 'cautious', 'mixed'].includes(style)) {
  throw new Error('Usage: node scripts/benchmark-bots.cjs --baseline path/to/old-bot.ts [--pairs 100] [--seed 12345] [--style normal|aggressive|cautious|mixed]');
}
const baseline = new Module(path.resolve(__dirname, '../dist/bot-baseline.js'), module);
baseline.filename = path.resolve(__dirname, '../dist/bot-baseline.js');
baseline.paths = Module._nodeModulePaths(path.dirname(baseline.filename));
baseline._compile(ts.transpileModule(fs.readFileSync(baselinePath, 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText, baseline.filename);
const timings = { current: [], baseline: [] };
const observations = [];

for (let pair = 0; pair < pairs; pair++) {
  const seed = (seedStart + Math.imul(pair, 2654435761)) >>> 0;
  let profit = 0;
  for (const seat of [0, 1]) {
    const hand = dealHand(2, seed);
    hand.players.forEach((player, index) => {
      player.botStyle = style === 'mixed' ? ['normal', 'aggressive', 'cautious'][(seed + index) % 3] : style;
    });
    let moves = 0;
    while (hand.stage !== 'showdown') {
      if (moves++ > 200) throw new Error(`Hand failed to finish: seed=${seed}, seat=${seat}`);
      const player = hand.players.find(candidate => candidate.id === hand.currentPlayerId);
      const current = player.id === hand.players[seat].id;
      const started = performance.now();
      const decision = (current ? botMove : baseline.exports.botMove)(hand, player);
      timings[current ? 'current' : 'baseline'].push(performance.now() - started);
      recordPlayerMove(hand, player.id, decision.move, decision.amount);
    }
    const stacks = stacksAfterPayout(hand);
    if ([...stacks.values()].reduce((sum, value) => sum + value, 0) !== 2000) throw new Error('Chip conservation failed');
    profit += (stacks.get(hand.players[seat].id) - 1000) / hand.blinds.big;
  }
  observations.push(profit / 2);
  if ((pair + 1) % 25 === 0) process.stderr.write(`Completed ${pair + 1}/${pairs} pairs\n`);
}
const mean = observations.reduce((sum, value) => sum + value, 0) / pairs;
const deviation = Math.sqrt(observations.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (pairs - 1));
const error = 1.96 * deviation / Math.sqrt(pairs);
const timingSummary = values => {
  values.sort((a, b) => a - b);
  return { decisions: values.length, medianMs: values[Math.floor(values.length / 2)], p95Ms: values[Math.floor(values.length * 0.95)], maxMs: values[values.length - 1] };
};
console.log(JSON.stringify({
  pairs, hands: pairs * 2, seedStart, style, bbPer100: mean * 100,
  approximate95PercentInterval: [(mean - error) * 100, (mean + error) * 100],
  pairStandardDeviationBB: deviation,
  timing: { current: timingSummary(timings.current), baseline: timingSummary(timings.baseline) },
}, null, 2));
