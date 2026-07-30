# Omaha Hi-Lo repository guide

## Scope and layout

- `server/` is the Node.js/TypeScript game server.
- `server/src/game.ts` owns game rules, dealing, betting, scoring, and hand transitions.
- `server/src/bot.ts` owns deterministic bot decisions.
- `server/src/lobby.ts` owns lobby types and pure lobby helpers.
- `server/src/index.ts` wires HTTP, WebSocket handlers, persistence, sessions, and broadcasts.
- `demo/client/` is the React/Vite browser client.
- `demo/client/src/pages/App.tsx` owns page-level state and routing.
- `demo/client/src/components/` contains reusable visual components.
- `demo/client/src/pages/appStyles.ts` contains page CSS template strings.
- `demo/playwright/tests/` contains browser tests; `server/tests/` contains server unit tests.

## Commands

Run commands from the repository root on Windows with `npm.cmd` when PowerShell blocks `npm.ps1`.

- Server tests: `npm.cmd --prefix server test`
- Server build: `npm.cmd --prefix server run build`
- Client build: `npm.cmd --prefix demo/client run build`
- Client unit tests: `npm.cmd --prefix demo run test:client -- --runInBand`
- Browser tests: `npm.cmd --prefix demo run e2e`
- Full CI-equivalent check: `npm.cmd --prefix demo run ci`

## Working agreements

- Preserve unrelated and pre-existing working-tree changes.
- Keep game rules in `game.ts`; do not duplicate rule calculations in HTTP or React code.
- Keep WebSocket message shapes backward-compatible unless the task explicitly changes the protocol.
- Put pure lobby behavior in `lobby.ts`; keep network and storage effects in `index.ts`.
- Prefer small React components and focused modules over adding new sections to `App.tsx`.
- Keep user-facing text available in both Russian and English.
- Never commit secrets, `.env` files, SQLite databases, build output, or test artifacts.
- Add or update focused tests for behavior changes and run the narrowest relevant checks first.

## Definition of done

- TypeScript builds for every changed package.
- Relevant unit tests pass.
- Run affected Playwright coverage for user-visible or WebSocket-flow changes.
- Review the final diff for accidental formatting churn, generated files, and unrelated edits.
