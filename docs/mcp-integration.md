# Omaha Hi-Lo MCP integration

## Architecture reviewed

- `server/src/index.ts`: one Express/HTTP/WebSocket service, existing lobby
  creation and joining, per-lobby locks, authenticated host commands, bot setup,
  deal creation, broadcasts and reconnection. MCP mounts before legacy CORS and
  JSON middleware. No second poker engine or game-action MCP tool.
- `game.ts` owns rules/dealing/scoring; `bot.ts` owns bot decisions. `lobby.ts`
  provides pure prepared-lobby/status helpers alongside existing seat helpers.
- `handStore.ts` stores lobby and hand JSON in SQLite. New optional assistant
  metadata persists in the existing lobby JSON; no destructive migration.
- `App.tsx` routes `/lobby/:id` and `/player/...`; the existing lobby UI and
  WebSocket flow issue browser-only member credentials and resume saved seats.
  The new `lobbyInvitation.ts` captures the invitation fragment before removing
  it from the address bar. It retains join capability locally for sharing.
- `demo/client/src/seo` prerenders public pages. `/ai` and `/ru/ai` are rendered
  in production and hydrated by React; tools/list supplies machine-readable tool
  schemas, `/mcp-server.json` supplies registry metadata, `/llms.txt` links docs.
- `render.yaml`: existing single Node service, TLS at Render, persistent SQLite
  disk, static client and WebSocket server on the same origin. MCP uses short
  stateless Streamable HTTP requests with JSON responses, no sticky MCP session
  or long-lived SSE requirement. GET/DELETE return 405 as permitted for this mode.

## Tool contract

`create_poker_table` and `get_play_link` both **create** a new lobby. Parameters:

| Field | Value |
| --- | --- |
| `game_type` | `omaha_hi_lo` (default and only game) |
| `opponents` | `bots` (default) or `friends` |
| `bot_count` | Integer 1–9; default 3 for bots; omit for friends |
| `player_name` | Optional suggested nickname, 1–30 characters; never an identity |
| `private` | Boolean, default true |

Returns `table_id`, `join_url`, game name, ready status, configuration,
`expires_at` and English/Russian instructions. Ready means a real waiting lobby
exists; no hand is dealt until a human joins. Friends tables have ten seats.
Bots tables reserve one human seat plus the requested number of bots.

`get_table_status({"table_id":"<UUID>"})` returns existence, waiting/in-progress
and available seats, without names, member IDs, PINs, tokens or cards. Finished
parties report `game_in_progress: false`; status is not per-hand telemetry.
`get_game_info({})` returns rules based on `/rules`, supported features and links.

## Onboarding and authorization

Private links look like `/lobby/<UUID>#invite=<256-bit random token>`. A SHA-256
hash is stored in SQLite and checked with a constant-time comparison. The raw
token is returned once in the join URL; HTTP request paths and Referer headers
do not include fragments. Never log tool response bodies or WebSocket payloads
at a proxy. Private pages also send `Referrer-Policy: no-referrer`.

A prepared lobby has no player identities. A link holder clicks Take a seat,
and the server creates a new member with its own random credential. The first
joiner becomes host. **Open and join your friends table before sharing it.**
The invitation is not a host credential and cannot resume, impersonate or act
as an existing player. Subsequent joiners have ordinary guest permissions.
Private MCP tables are excluded from open-table listings and do not accept PINs.
Public friends tables use the existing guest listing; bot practice is not listed.

Bots are added and dealt through the existing authenticated `startLobby` path.
Friends use the existing Start game button. Existing non-MCP PIN invitations
and WebSocket messages remain compatible; the invitation field is additive.
Started/full tables reject new participants; existing credentials still resume.
Waiting tables expire after the existing `LOBBY_WAIT_MS` (one hour by default),
even if visited, and are removed by the existing startup/periodic cleanup.

## Limits and deployment

| Setting / limit | Default / requirement |
| --- | --- |
| `PUBLIC_ORIGIN` | `https://omahahilopoker.com`; set to the actual origin of each deployment, never derive links from Host headers |
| `MCP_TRUST_PROXY_HOPS` | 0 directly; blueprint sets 1 behind the final Render proxy; verify actual forwarding topology before adding another proxy |
| `MCP_ALLOWED_ORIGINS` | Optional comma-separated exact browser origins; PUBLIC_ORIGIN is always allowed |
| `DATA_FILE` | Existing persistent SQLite path; use `:memory:` only for tests |
| `LOBBY_WAIT_MS` | Existing 3,600,000 ms waiting lifetime; tests can shorten it |
| HTTP requests | 60/minute/IP and 600/minute globally, HTTP 429 + Retry-After |
| Table creation | 10/hour/IP and 100/hour globally, shared by both creating tools; MCP `isError` on exhaustion |
| Waiting assistant tables | 100 persisted active waiting tables, checked under the shared creation lock |
| Concurrent requests | 16; HTTP 503 + Retry-After when saturated |
| JSON bodies | 16 KiB maximum; strict input schemas reject unknown fields |

IP quotas group IPv6 addresses using express-rate-limit's subnet key. Anonymous
MCP clients behind the same egress IP share quotas. Quotas are process-local and
reset on restart; persisted table capacity survives restart. Keep one service
instance with the existing SQLite/WebSocket architecture. Before horizontal
scaling, use shared quotas and redesign the existing session/broadcast state.

Only explicitly allowed browser Origins get CORS access. Requests without an
Origin work for native MCP clients. Do not add wildcard Origins or blindly trust
arbitrary forwarding headers. With a proxy misconfigured to zero hops, clients
may share the proxy's quota; this fails conservatively. Native clients do not
need browser CORS exceptions. Allow the local Inspector's exact Origin only
when testing its direct browser mode.

Build/start commands are unchanged; install server dependencies from the updated
lockfile and build both packages. Set the staging PUBLIC_ORIGIN to its staging
host (the blueprint intentionally prompts for it). Route `/mcp` to the same
service as the game, without caching, HTML rewrites or a browser-only challenge.
Render terminates HTTPS as described in its [web-service documentation](https://render.com/docs/web-services).

## Client connection and verification

The implementation uses the [official TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk/tree/v1.x).
Automated protocol tests use its `Client` and `StreamableHTTPClientTransport`
against a real HTTP listener. Browser tests use the same external client against
the full game server, then open its exact returned URL in clean Chromium contexts.

```powershell
npm.cmd --prefix server test -- --runInBand mcp.spec.ts
npm.cmd --prefix demo run e2e:mcp
```

The dedicated browser suite builds both packages, serves the production client
on port 4310, and uses a second isolated server on 4311 for accelerated expiry.
It covers bot play, reconnect, friends joining as separate identities, copied
invitations, absent/wrong tokens, attempted impersonation, private listing
exclusion, public bot links, expiry, and both documentation languages.
Protocol tests cover initialization/tools/list, all tools, invalid input, quotas,
CORS, unsupported methods and payload limits. Run existing lobby/gameplay tests
as regression coverage as well.

For manual protocol inspection, run `npx @modelcontextprotocol/inspector`, select
Streamable HTTP and connect to the deployed `/mcp`. Use tools/list, then create
one table, open its link in a private browser window and play. Inspector and the
SDK are protocol clients; success does **not** certify any particular assistant.

[Claude Code](https://code.claude.com/docs/en/mcp) supports remote HTTP servers:

```sh
claude mcp add --transport http omaha https://omahahilopoker.com/mcp
```

[VS Code](https://code.visualstudio.com/docs/agent-customization/mcp-servers)
supports explicit HTTP MCP configuration in `.vscode/mcp.json`:

```json
{"servers":{"omaha":{"type":"http","url":"https://omahahilopoker.com/mcp"}}}
```

Start/enable the server, approve trust/tool calls when requested, and ask:
“Create a private Omaha Hi-Lo table with three bots.” The assistant should call
`create_poker_table` with `{"opponents":"bots","bot_count":3,"private":true}`
and return the actual `join_url` unchanged. All play happens on the website.
Client configuration examples are documented capabilities, not claims that
these assistant products were exercised here. ChatGPT integration is untested.

## Registry publication: published 2026-10-23

The [remote registry requirements](https://modelcontextprotocol.io/registry/remote-servers)
support `remotes` with type `streamable-http`. The prepared manifest is
`demo/client/public/mcp-server.json`, using the published 2025-12-11 schema.
Version **1.0.0** was published successfully using the official `mcp-publisher`
v1.8.1 and GitHub authentication as **`io.github.pulsarik/omaha-hi-lo`**.
The [public registry entry](https://registry.modelcontextprotocol.io/v0.1/servers/io.github.pulsarik%2Fomaha-hi-lo/versions/1.0.0)
points to **https://omahahilopoker.com/mcp**. Domain/DNS verification was not
needed: the chosen namespace is verified through GitHub.

Live preflight verified SDK initialization, discovery of all four tools,
creation of one real private bot table, HTTP 200 for its join page, status lookup,
and successful WebSocket invitation validation. The unused preflight table
expires automatically. The production version at the time was `b036798`.
The `/ai` and `/mcp-server.json` routes still returned 404, so the registry's
website URL uses the working homepage. Deploy the pending documentation and
integration refinements separately; this publication did not deploy code.

The publisher executable and authentication state are outside the repository in
`%LOCALAPPDATA%/OmahaMcpPublisher`. No authentication tokens are committed.

For future registry updates:

1. Update the manifest with a new version and verify the deployed endpoint.
2. Authenticate with `mcp-publisher login github` as `pulsarik` if the saved
   registry login has expired. Keep authentication files outside this repository.
3. Run `mcp-publisher publish <path-to-mcp-server.json>` from the publishing
   directory. Recheck the public registry entry after publication.
4. Explicitly connect clients and complete their trust/permission steps.

There is no universal automatic assistant discovery guarantee. Publishing the
manifest, landing page or llms.txt alone does not install a ChatGPT/Claude
integration. Registry publication and public HTTPS smoke testing are complete;
product-specific client connection/testing and deployment of pending website
changes remain separate tasks.

## Кратко по-русски

Сервер MCP работает в существующем Express-приложении и создаёт реальные лобби.
Ссылка содержит только приглашение на новое место; личный токен игрока выдаётся
после входа в браузере. Первый вошедший становится ведущим. Для игры с друзьями
сначала займите место сами, затем отправьте ссылку. Приватные MCP-столы не видны
в общем списке и не используют PIN. Боты запускаются автоматически после входа.

23 октября 2026 сервер опубликован в официальном реестре под именем
`io.github.pulsarik/omaha-hi-lo`, версия 1.0.0. Владение подтверждено через
GitHub; изменение DNS не потребовалось. Публичный MCP endpoint проверен
официальным SDK. Страницы /ai и /ru/ai ещё нужно развернуть. Работа с ChatGPT
не проверена; автоматическое обнаружение ассистентами не гарантируется.
