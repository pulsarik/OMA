import React from 'react';
import { PUBLIC_STYLES } from './PublicContent';

export const aiMetadata = {
  en: { title: 'Play Omaha Hi-Lo with an AI assistant | MCP', description: 'Ask an AI assistant to prepare a free Omaha Hi-Lo table. Play with bots or friends in your browser, without registration.' },
  ru: { title: 'Омаха хай-ло через ИИ-ассистента | MCP', description: 'Попросите ИИ-ассистента создать бесплатный стол Омахи хай-ло. Играйте с ботами или друзьями в браузере без регистрации.' },
};

export function AiPage({ language = 'en' }: { language?: 'en' | 'ru' }) {
  const ru = language === 'ru';
  return <div className="seo-shell"><style>{PUBLIC_STYLES}{'pre {white-space:pre-wrap;overflow-wrap:anywhere} code {overflow-wrap:anywhere}'}</style>
    <main className="seo-main">
      <nav className="seo-header"><a href="/">Omaha Hi-Lo</a><a href={ru ? '/ai' : '/ru/ai'}>{ru ? 'English' : 'Русский'}</a></nav>
      <article className="seo-card">
        <h1>{ru ? 'От разговора к игре' : 'From conversation to the poker table'}</h1>
        <p>{ru ? 'Бесплатная Омаха хай-ло с ботами или друзьями. Регистрация не нужна: откройте приглашение, выберите имя и займите место. Игра проходит на сайте, не в чате.' : 'Free Omaha Hi-Lo with bots or friends. No registration: open an invitation, choose a nickname and take a seat. You play on this website, not inside the chat.'}</p>
        <p>{ru ? 'В Омахе хай-ло банк делится между лучшей старшей комбинацией и подходящим лоу до восьмёрки. Используйте ровно две карты руки и три общие карты.' : 'Omaha Hi-Lo splits the pot between the best high hand and a qualifying eight-or-better low. Use exactly two hole cards and three community cards.'}</p>
        <div className="seo-links"><a className="seo-play" href="/">{ru ? 'Играть бесплатно' : 'Play for free'}</a><a href="/rules">{ru ? 'Изучить правила' : 'Learn the rules'}</a></div>
        <h2>{ru ? 'Подключение MCP' : 'Connect through MCP'}</h2>
        <p>{ru ? 'Добавьте удалённый MCP-сервер в совместимом клиенте. Транспорт: Streamable HTTP. Авторизация для этих ограниченных общедоступных инструментов не требуется.' : 'Add a remote MCP server in a compatible client. Transport: Streamable HTTP. These limited public tools require no authentication.'}</p>
        <pre>https://omahahilopoker.com/mcp</pre>
        <p>{ru ? 'В Claude Code:' : 'In Claude Code:'}</p>
        <pre>claude mcp add --transport http omaha https://omahahilopoker.com/mcp</pre>
        <p>{ru ? 'В VS Code добавьте запись в .vscode/mcp.json, запустите сервер и подтвердите доверие и вызов инструмента, если клиент запросит:' : 'In VS Code, add this to .vscode/mcp.json, start the server and approve server trust and tool use when prompted:'}</p>
        <pre>{JSON.stringify({ servers: { omaha: { type: 'http', url: 'https://omahahilopoker.com/mcp' } } }, null, 2)}</pre>
        <p>{ru ? 'Наличие MCP не гарантирует автоматическое обнаружение. Клиент должен поддерживать удалённые серверы и разрешать их подключение; могут действовать ограничения администратора. Интеграция с ChatGPT не проверена.' : 'MCP availability does not guarantee automatic discovery. Your client must support and permit remote servers; administrator restrictions may apply. ChatGPT integration has not been tested.'}</p>
        <h2>{ru ? 'Пример запроса' : 'Try asking'}</h2>
        <blockquote>{ru ? '«Создай мне приватный стол Омахи хай-ло с тремя ботами».' : '“Create a private Omaha Hi-Lo table for me with three bots.”'}</blockquote>
        <p>{ru ? 'Ассистент вызывает create_poker_table с opponents: "bots", bot_count: 3, private: true и возвращает настоящую ссылку join_url. Откройте её и займите место — игра с ботами начнётся автоматически.' : 'The assistant calls create_poker_table with opponents: "bots", bot_count: 3, private: true and returns the real join_url. Open it and take a seat; bot practice starts automatically.'}</p>
        <p>{ru ? 'Для друзей укажите opponents: "friends". Первый вошедший становится ведущим. Сначала займите место, затем отправьте приглашение друзьям и нажмите «Начать игру». Ссылка даёт право занять новое место, но не управлять чужим игроком. Не делитесь ею публично. Неиспользованные столы закрываются через час.' : 'For friends, use opponents: "friends". The first person to join becomes host. Take your seat first, then share the invitation and press Start game. The link admits a new player; it never controls an existing player. Share it only with intended guests. Unused tables close after one hour.'}</p>
        <h2>{ru ? 'Доступные инструменты' : 'Available tools'}</h2>
        <ul>
          <li><code>create_poker_table</code> — {ru ? 'создать настоящий стол' : 'create a real table'}</li>
          <li><code>get_play_link</code> — {ru ? 'создать новый стол и получить ссылку' : 'prepare a new table and return its link'}</li>
          <li><code>get_table_status</code> — {ru ? 'проверить состояние без личных данных и карт' : 'check availability without personal information or cards'}</li>
          <li><code>get_game_info</code> — {ru ? 'правила и возможности' : 'rules and features'}</li>
        </ul>
        <p><a href="/mcp-server.json">{ru ? 'Описание сервера для реестра' : 'Machine-readable server description'}</a> · <a href="https://modelcontextprotocol.io/registry/remote-servers">MCP Registry</a> · <a href="https://code.claude.com/docs/en/mcp">Claude Code MCP</a> · <a href="https://code.visualstudio.com/docs/agent-customization/mcp-servers">VS Code MCP</a></p>
      </article>
    </main>
  </div>;
}
