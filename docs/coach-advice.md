# Coach: decision, reason, presentation

Coach is deterministic and has no LLM prompt or model request. It is distinct
from the AI commentator (`commentary/providers.ts`), which reports public events
and must not give strategy advice.

The client requests `training_advice` after ten seconds of the human turn at a
table with bots. The server checks the player/session/turn and calls `botMove`.
That function estimates expected shares of accessible pots (including high/low
splits and ties), considers future betting risk and profile margins, and returns
the existing action and wager. Each return branch now attaches its reason code:

| Code | Actual decision basis |
| --- | --- |
| CHECK_NO_BET | No additional call cost; strategy does not choose a legal aggressive action |
| POT_ODDS | Call-price comparison passes; or raw estimated share is below the price when folding |
| CALL_MARGIN | Call test fails despite raw share meeting the price; risk/margin matters |
| PREMIUM_BLIND_ENTRY | Bounded premium starting-hand entry for one blind, not a profitable-EV claim |
| STARTING_HAND | Premium preflop score selects aggression |
| POT_SHARE | Postflop share/scoop criteria or facing-bet aggressive criteria select aggression |

The code is diagnostic metadata only; thresholds, sampling and sizing are unchanged.
Quartering and low-vulnerability flags describe the existing size adjustment.
No `STRONG_HIGH` or `LOW_DRAW` reason is invented: those are not standalone
decision branches. A river board lacking three distinct low ranks is marked as
unable to support low; a board that supports low does not prove anyone has low.

`trainingRecommendation` carries action, amount, reason, context and confidence.
Confidence is null because the strategy supplies no calibrated confidence.
Calls are additional chips capped at the stack; raises remain street totals.
`renderTrainingAdvice` selects copy only by that structure, never hand ID/hash.
It returns short `text` plus optional `detail`; no sentence is truncated. Typical
short copy is about 100 characters, with a 180-character validation safety limit.
Invalid/mismatched structures produce a short unavailable fallback.

The WebSocket keeps existing move/amount/text fields and adds recommendation/detail.
The client validates the envelope and rejects stale turns. Both React and browser
speech synthesis use exactly `text`. Details expand on demand and are not spoken.
Advice lives in the action panel's normal flow, allowing short screens to scroll
instead of overlaying cards and controls. Existing delay, settings and voice
coordination remain in place.

Verification: server Coach/bot tests, client protocol tests, and `npm --prefix demo
run e2e:coach` (isolated ports, in-memory server, legacy and oval layouts at 320/390px).
Copy tests cover editorial constraints and meaning; they do not claim to measure
naturalness automatically. The Russian and English phrase catalogs require human
editorial review when introducing new reasons.
