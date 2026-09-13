# Bot strategy and comparison

`src/bot.ts` uses only the bot's own hole cards, the visible board, public stacks,
contributions, and betting history. Opponent hole cards and future community cards
are never used to infer ranges. Decisions remain deterministic for replays.

- Calls compare the expected share of **accessible** pots against the actual
  payment, capped at the bot's stack. Premium starting hands and made high hands
  cannot bypass this check.
- Simulated opponent hands receive soft likelihood weights based on calls and
  aggression on each street. Past actions are evaluated against the board visible
  on that street. Bluffs and weak hands keep nonzero weight.
- Position, players yet to act, and effective stack relative to the accessible
  pot add a bounded allowance for future betting. This allowance vanishes on the
  river or when no further money can be contested.
- Simulations account for high/low ties and scoop chances separately for each pot.
  Quartering risk and runouts that lose a currently unbeatable low reduce bet
  sizing for hands with little scoop potential. Strong scoop hands can use a full
  pot bet at a low stack-to-pot ratio.
- Borderline estimates receive up to three times the normal sample count, using
  the weighted variance and effective sample count. The limit is a fixed work
  budget rather than a wall-clock cutoff, preserving deterministic replay.

Game rules, hypothetical call pots, nut-low detection, and shared hand evaluation
remain in `src/game.ts`. Network message shapes and the three bot styles remain
compatible. Range weights, realization allowances, and sizing are heuristics;
this is not an equilibrium solver or a search over future betting trees.

## Validation

From the repository root:

```powershell
npm.cmd --prefix server test -- --runInBand
npm.cmd --prefix server run build
npm.cmd --prefix demo run e2e -- --grep "a bot takes its turn after the human acts"
```

The strategy tests cover stack-capped calls, side-pot eligibility, pending short
callers, folded contributions, hidden-information independence, action-dependent
ranges, premium-hand folds, position, counterfeit protection, adaptive sampling,
and complete legal hands with chip conservation at 2, 3, 6, and 10 seats.

## Reproducible comparison

Save a baseline `bot.ts` before editing it. The script compiles that file in memory
and runs both strategies against the current game rules. To reproduce the original
baseline from this repository (PowerShell, from the root):

```powershell
New-Item -ItemType Directory -Force server/node_modules/.cache/bot-benchmark | Out-Null
git show 378bd2801cfdbf3968b559f994a3a7797d63842a:server/src/bot.ts | Set-Content -Encoding UTF8 server/node_modules/.cache/bot-benchmark/baseline.ts
npm.cmd --prefix server run build
node server/scripts/benchmark-bots.cjs --baseline server/node_modules/.cache/bot-benchmark/baseline.ts --pairs 100 --seed 12345
node server/scripts/benchmark-bots.cjs --baseline server/node_modules/.cache/bot-benchmark/baseline.ts --pairs 100 --seed 987654 --style mixed
```

Each seed produces two heads-up hands, with strategies exchanging seats on the
same cards and blinds. Stacks reset to 1,000 each hand. `--style mixed` assigns
different styles to the seats and preserves them when swapping strategies.
The script reports profit in big blinds per 100 hands, variability across paired
observations, an approximate 95% interval, and per-decision timing. The interval
uses pairs as independent observations, not individual correlated hands.

Initial local run, 100 pairs / 200 hands, seed 12345, normal styles:

| Metric | Result |
| --- | ---: |
| Current strategy profit, BB/100 | +613.4 |
| Approximate 95% interval, BB/100 | +157.7 to +1069.0 |
| Current decision median / p95 | 37.7 / 112.1 ms |
| Baseline decision median / p95 | 23.8 / 39.7 ms |

Independent second run, 100 pairs / 200 hands, seed 987654, mixed styles:

| Metric | Result |
| --- | ---: |
| Current strategy profit, BB/100 | +1074.1 |
| Approximate 95% interval, BB/100 | +487.6 to +1660.7 |
| Current decision median / p95 | 38.9 / 107.0 ms |
| Baseline decision median / p95 | 24.5 / 39.4 ms |

This measures a small fixed heads-up sample against this particular baseline.
It does not establish performance against human players or at full tables.
Timing depends on the machine and concurrent work; test multiple seeds and table
conditions before treating the measured win rate as a stable estimate.
