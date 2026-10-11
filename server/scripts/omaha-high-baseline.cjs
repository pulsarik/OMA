// Run after the server build: node server/scripts/omaha-high-baseline.cjs
// Uniform nine-card samples: four hole cards, five board cards, no folds.
const { evaluatePlayerCombo } = require('../dist/game.js');
const fs = require('node:fs');
const path = require('node:path');
const samples = 1_000_000;
const seed = 20261011;
let state = seed;
function random() {
  state ^= state << 13;
  state ^= state >>> 17;
  state ^= state << 5;
  return (state >>> 0) / 4294967296;
}
const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
const deck = ranks.flatMap(rank => ['c', 'd', 'h', 's'].map(suit => rank + suit));
const keys = {
  'straight flush': 'straightFlush', 'four of a kind': 'fourOfAKind',
  'full house': 'fullHouse', flush: 'flush', straight: 'straight',
  'three of a kind': 'threeOfAKind', 'two pair': 'twoPair', pair: 'pair',
  'high card': 'highCard',
};
const counts = Object.fromEntries(Object.values(keys).map(key => [key, 0]));
for (let sample = 0; sample < samples; sample++) {
  for (let i = 0; i < 9; i++) {
    const j = i + Math.floor(random() * (52 - i));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  const combo = evaluatePlayerCombo(deck.slice(0, 4), deck.slice(4, 9));
  const key = keys[combo?.highRank];
  if (!key) throw new Error('Unrecognized high combination');
  counts[key]++;
  if ((sample + 1) % 100_000 === 0) console.log(`${sample + 1}/${samples}`);
}
fs.writeFileSync(path.resolve(__dirname, '../../demo/client/src/omahaHighBaseline.json'),
  JSON.stringify({ samples, seed, counts }, null, 2) + '\n');
