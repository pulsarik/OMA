# Omaha Hi-Lo: technical requirements

## Goal

Домашнее веб-приложение для дружеской игры в Omaha Hi-Lo и проверки поведения бота на известных раздачах.

Это не казино и не строгий покерный движок с рейком и полной турнирной бюрократией. Главный приоритет - понятная домашняя игра, сохранение раскладов, переигрывание раздач и удобная отладка.

## Architecture

- Backend: Node.js + TypeScript.
- Frontend: React + Vite.
- Storage: SQLite through `server/src/handStore.ts`.
- Realtime updates: WebSocket.
- Main game logic: `server/src/game.ts`.
- Backend entry point and API/WebSocket protocol: `server/src/index.ts`.
- Main player/home/debug UI: `demo/client/src/pages/App.tsx`.
- Admin HTML page: `demo/client/admin.html`.
- Game tests: `server/tests/game.spec.ts`.

## Pages

### Home: `http://localhost:5173/`

Home is a clean lobby page.

It must show only:

- player count input;
- player name inputs;
- `New deal` button;
- player links after a deal is created.

It must not show:

- raw WebSocket logs;
- JSON dumps;
- old hands list;
- debug/admin links as primary UI.

Creating a deal from Home starts a new party.

### Player page: `/player/:handId/:playerId/:token`

Each player opens a private URL.

The page must show:

- current player name, not only `P1`;
- party code;
- current stage;
- connection status;
- whose turn it is using player name;
- private hole cards for the current player;
- closed cards for other players unless cards are revealed;
- board slots from the start, with closed cards for unopened streets;
- pot as a visible chip stack and number on the table;
- current score as chip stacks near player seats;
- available actions only when valid.

The page should be vertically compact. Avoid large technical blocks in the middle of the gameplay view.

### Admin: `http://localhost:5173/admin.html`

Admin is for debugging and inspection.

It must support:

- creating a new party with a selected number of players and names;
- listing saved hands with paging;
- opening a hand and seeing all hands, board, actions and result.

Admin `New deal` always creates a new party. If the number of players changed, this must not continue the old party.

### Replay controls

Replay is a rare debug/bot-testing function.

On the player page it must be:

- visible only at the end of a hand when continuation is not already created;
- one compact row;
- placed at the bottom of the page;
- not duplicated in the main action button row.

Replay by hand code must support short codes like `HA0001`.

## Game model

### Party

A party groups multiple hands.

Party requirements:

- has a short code like `PA0001`;
- keeps player ids and names between continuation hands;
- starts every player with 1000 chips;
- carries player stacks between hands;
- rotates blinds between active players;
- continues until only one player has chips left;
- should not be continued if the player count changes from admin.

### Hand

A hand is one deal.

Hand requirements:

- has a UUID internally;
- has a short code like `HA0001`;
- belongs to one party;
- stores all hole cards and full board;
- stores deterministic `dealSeed`;
- stores public `dealCode`;
- stores current stage and current player;
- stores actions;
- stores reveal votes;
- stores pot size;
- stores betting-round state;
- stores player stacks;
- stores blind level and blind players;
- stores `nextHandId` or `nextReplayHandId` when continuation was created.

Old hands are never deleted by `New deal`.

### Cards and deck

- Standard 52-card deck.
- Omaha hand: 4 private cards per player.
- Board: 5 community cards.
- No duplicate cards are allowed across all players and board.
- Board must always render 5 slots on the player page.

## Deal seed

- New random deals use deterministic PRNG `mulberry32`.
- Current shuffle contract version is `OMA1`.
- Every hand has a public deal code like `OMA1-P2-S9IX`.
- Deal code format includes shuffle version, player count and seed.
- The same `dealCode` must always rebuild the same hole cards and board after restart or on another server.
- Deal code only restores card layout, not actions, stacks, pot, reveal votes or tournament state.
- If the shuffle algorithm changes, a new version prefix must be used, for example `OMA2`.

### Stages

Stages:

- `preflop`;
- `flop`;
- `turn`;
- `river`;
- `showdown`.

Visible board:

- preflop: 0 open board cards, 5 slots shown;
- flop: 3 open board cards;
- turn: 4 open board cards;
- river/showdown: 5 open board cards.

## Betting model

Current betting is intentionally simple tournament betting.

Actions:

- `Check`;
- `Bet`;
- `Call`;
- `Raise`;
- `Fold`.

Rules:

- `Check` never increases the pot.
- `Check` is allowed only when the player has matched the current street bet.
- `Bet` is allowed only when no bet is currently open on the street.
- `Call` adds the missing amount to match the current street bet.
- `Bet` and `Raise` use the current big blind as their unit.
- `Raise` increases the current street bet by one current big blind.
- Maximum 3 raises are allowed on one street.
- `Fold` removes the player from active contention.
- A street advances only when every active player has acted and matched the current street bet.
- If only one active player remains, the hand goes to showdown immediately.
- A player cannot put more chips into the pot than their remaining stack.
- A player with zero remaining stack is all-in and does not need to act again.

Current limitations:

- no side pots yet;
- no rake;
- no configurable raise cap yet;

Possible future rule:

- make raise cap configurable per party.

## Blinds and tournament stacks

- Every player starts a new party with 1000 chips.
- First 8 hands: blinds are 2/4.
- Next 8 hands: blinds are 4/8.
- Next 8 hands: blinds are 8/16.
- The pattern continues by doubling every 8 hands.
- Blind level is based on hand number inside the party.
- Blinds rotate through active players.
- Posted blinds are immediately deducted from player stacks and added to the pot.
- A player with zero chips is out of future action.
- New continuation hands should stop being available when only one player has chips.

## Pot and scoring

- The hand starts with the posted blinds in the pot.
- Betting actions add coins to the pot.
- At showdown the pot is paid to High/Low winners.
- Party score is represented by current chip stacks.
- Player stacks should be shown visually as chip stacks, not as a bulky `Party score` block.

Chip denominations:

- 1: gold;
- 5: red;
- 10: blue;
- 20: purple;
- 100: black.

## Omaha Hi-Lo evaluation

Omaha rule is strict:

- exactly 2 cards from hand;
- exactly 3 cards from board.

High:

- normal poker high-hand ranking.
- If there is no qualifying low, high winners take the whole pot.

Low:

- 8-or-better.
- Aces are low for low evaluation.
- Low hand must use 5 different low ranks from A through 8.
- If there is no qualifying low, show `Low: none`.

Split pot:

- High and Low can be won by different players.
- Both players can therefore see that they won.
- UI must make this explicit, for example `Split pot: You won High` and `Split pot: You won Low`.
- If one player wins both High and Low, show that clearly as winning both sides.

Combination display:

- show current known high/low combination after the first action/check information is available;
- make combo cards smaller than table cards;
- visually distinguish cards from hand and board;
- group meaningful parts of combinations where useful, for example two pair as separate pair groups.

## Show cards

At showdown:

- cards of other players remain hidden by default;
- any player may request `Show cards`;
- if at least one player requested it and no new deal was created yet, other players must see that request;
- all cards are revealed only when every player votes to show cards.

## New deal and replay

### New deal from player page

At the end of a hand:

- `New deal` creates one continuation hand in the same party;
- if another player also clicks `New deal`, they should open the same already-created continuation;
- old hand receives `nextHandId`;
- old hand remains available for history/replay;
- player names and player ids are preserved.

### Replay from player page

Replay creates a continuation hand in the same party with:

- same player ids;
- same player names;
- same hole cards;
- same board;
- fresh tokens;
- fresh actions/state.
- tournament stack handling remains active, so replay also starts with posted blinds for that replay hand.

If one player clicks replay and another clicks new deal from the same old hand, system state must stay coherent: only one continuation should be created for that old hand.

### New deal from admin/home

Admin/Home `New deal` creates a new party, especially when player count or names are changed.

## Identifiers

Internal ids may remain UUIDs.

User-facing ids should be short:

- party code: `PA0001`;
- hand code: `HA0001`.

Short hand codes exist mainly for replaying known hands and bot testing.

## UI rules

- Cards should look like standard playing cards, not raw text.
- Current player's own cards are visible.
- Other players' cards are shown as card backs until reveal.
- Board cards are always shown as 5 slots.
- The board label is not needed if layout makes it obvious.
- Avoid large white padding around card rows.
- Avoid repeated player names inside card pods when the page already shows the player.
- Technical/debug functions should be low priority visually.
- Main action row should contain only common gameplay actions.
- `Replay deal` must not be in the main action row.
- Use player names in UI messages when available.
- Do not show `Waiting for P1` if the player has a name.

## WebSocket actions

Known client-to-server actions:

- `deal`;
- `new_deal`;
- `replay_deal`;
- `join_player`;
- `player_move`;
- `reveal_cards`;
- `list`;
- `replay`.

Known player moves:

- `check`;
- `bet`;
- `call`;
- `raise`;
- `fold`.

## Testing expectations

Backend tests should cover:

- deterministic deal by seed;
- deal code rebuilds the same card layout;
- no duplicate cards;
- private token per player;
- stage advancement by checks;
- invalid out-of-turn actions;
- check does not increase pot;
- bet/call increase pot;
- raise keeps round open until matched;
- raise is capped at 3 raises per street;
- blind levels double every 8 hands;
- stacks carry into the next hand after payout;
- player names carry into the next hand;
- blind positions rotate between active players;
- players with zero stack are skipped by blinds and turns;
- all-in calls cannot make stacks negative;
- fold to showdown;
- reveal only after all votes;
- Omaha Hi-Lo high/low evaluation;
- no qualifying low;
- replay keeps layout with fresh tokens.

Useful next test additions:

- WebSocket `deal` returns `playerLinks`;
- Home page reconnects if backend starts after the browser page;
- `new_deal` cannot create a continuation after tournament completion;
- replay/new-deal race creates only one continuation;
- admin new deal creates a new party, not a continuation.

Before finishing code changes, run at least:

```powershell
cd server
npm test
npm run build

cd ..\demo\client
npm run build
```

## Open decisions

- Whether to add a raise cap per street.
- Whether to add side pots.
- Whether blinds should follow exact dealer/button rules for more than two players.
- Whether bot logic should live inside the server or as an external client.
- Whether old mojibake docs in `demo/` should be replaced or removed.
