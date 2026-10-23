# Omaha Hi-Lo Poker

Free Omaha Hi-Lo 8 or Better with bots or friends, played in the browser.
Express/TypeScript, SQLite and WebSockets serve the React/Vite client.

## AI assistants / MCP

Live remote endpoint: **https://omahahilopoker.com/mcp**
Transport: **Streamable HTTP**. Anonymous, limited table preparation; no account required.
Published in the official MCP Registry on 2026-10-23 as
[`io.github.pulsarik/omaha-hi-lo`, version 1.0.0](https://registry.modelcontextprotocol.io/v0.1/servers/io.github.pulsarik%2Fomaha-hi-lo/versions/1.0.0).
Connection guide routes `/ai` and `/ru/ai` are implemented locally but still
need deployment (the public routes returned 404 during registration).

Tools: `create_poker_table`, `get_play_link`, `get_table_status`, `get_game_info`.
`get_play_link` creates a new table, so reuse a returned link when possible.
The assistant returns the actual `join_url`, including its fragment. The user
opens it, chooses a guest nickname and takes a seat. Bot games start automatically;
for friends, the first person to join becomes host and starts after friends join.

For example, connect in Claude Code:

```sh
claude mcp add --transport http omaha https://omahahilopoker.com/mcp
```

Then ask: “Create a private Omaha Hi-Lo table with three bots.” Approve the tool
call if prompted. Expected arguments:

```json
{"opponents":"bots","bot_count":3,"private":true}
```

This does **not** imply automatic discovery by assistants or tested ChatGPT
integration. Each client needs an explicit connection and may require trust/tool
approval. See [implementation, security, testing and deployment](docs/mcp-integration.md)
and [official Claude Code MCP instructions](https://code.claude.com/docs/en/mcp).

## Development checks

```powershell
npm.cmd --prefix server test -- --runInBand
npm.cmd --prefix server run build
npm.cmd --prefix demo/client run build
npm.cmd --prefix demo run test:client -- --runInBand
npm.cmd --prefix demo run e2e:mcp
```

Full existing gameplay checks: `npm.cmd --prefix demo run ci`.
Render configuration: [render.yaml](render.yaml).

## По-русски

MCP позволяет ассистенту создать настоящий стол и вернуть приглашение. Игра
проходит на сайте, не в чате. Регистрация не нужна. Приватная ссылка позволяет
занять новое место, но не управлять другим игроком. Первый вошедший становится
ведущим: сначала займите место сами, затем пригласите друзей.
Неиспользованные столы закрываются через час. Для подключения ассистента нужен
совместимый MCP-клиент и разрешение на вызов инструментов; автоматическое
обнаружение и работа с ChatGPT не гарантируются.
