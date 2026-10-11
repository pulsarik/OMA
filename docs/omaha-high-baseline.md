# Expected Omaha high frequencies

The archive compares each high category's share of all recorded player
combinations with a Monte Carlo estimate for uniformly dealt Omaha hands.
Each sample deals four hole cards and five board cards without replacement,
then uses `evaluatePlayerCombo` in `server/src/game.ts` to select the best
hand using exactly two hole cards and three board cards. Royal flush counts
as straight flush. Folded players remain included, matching archive counting.

The checked-in `demo/client/src/omahaHighBaseline.json` contains category counts,
sample size (1,000,000), and the xorshift32 seed (20261011). Regenerate from the
repository root after changing the evaluator:

```powershell
npm.cmd --prefix server run build
node server/scripts/omaha-high-baseline.cjs
```

These are estimates, especially for rare hands. The direction arrows compare
unrounded frequencies; they are not significance tests. Observations in an
archive share boards and may be selected by player behavior, so they are not
necessarily independent uniform samples. The tooltip states that small-sample
fluctuations are natural. Low statistics are unchanged.
