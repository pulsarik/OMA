# Visitor country and source

The admin access table hides the browser cookie. Its internal identifier still groups a browser's connections and game statistics.

New player connections record:

- **Country:** the optional `CF-IPCountry` request header supplied by the CDN. Without the header (including local development), or for unknown/Tor codes, the table shows “Unknown”. This is informational metadata, not verified identity. See [Cloudflare IP geolocation](https://developers.cloudflare.com/network/ip-geolocation/).
- **Source:** `utm_source` when present, otherwise the external referring hostname (for example `www.google.com`), otherwise “Direct / unknown”. Browsers and apps can suppress referrers, so an untagged shared link cannot always be distinguished from a direct visit.

The source is captured on entry and retained in session storage through lobby/player navigation and reconnects. A new external referrer or UTM source replaces the tab's previous attribution. Only the referring origin is retained in the browser; the server stores only its hostname, without paths, search queries or invitation tokens. The table shows the latest known country/source for each browser. Old rows remain “Unknown” until new connections supply metadata. SQLite columns are added automatically at server startup.

Страна берётся из заголовка CDN, если он доступен. Источник — UTM-метка или домен сайта перехода, например Google. Без этих данных отображается «Прямой / неизвестно». Старые записи автоматически восстановить нельзя; новые данные появляются при подключении игрока.
