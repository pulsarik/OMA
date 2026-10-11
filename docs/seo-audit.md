# SEO audit and implementation

Audit date: 11 October 2026. Branch: `seo/public-pages`. No production deployment, database changes or game-rule changes.

## Existing production and architecture

- `https://omahahilopoker.com/` returned HTTP 200, without an indexing prohibition in its response headers. HTTP and the HTTPS `www` homepage redirected to the HTTPS non-www origin with 301 responses. Google indexing status itself requires Search Console access and was not established by these checks.
- Initial HTML had `lang="en"`, viewport metadata, the title `Omaha Hi-Lo Replay`, and an empty React root. It had no description, canonical, Open Graph or JSON-LD. Content appeared only after JavaScript ran.
- The rendered homepage already had one H1, its introduction and the two-card/three-card explanation. It had no H2 in its default view. Lobby, Statistics and About were button-controlled views rather than separate crawlable destinations.
- `/robots.txt`, `/sitemap.xml` and `/rules` returned HTTP 200 with the same app-shell HTML. There was no actual sitemap or robots file. The unrestricted SPA fallback also returned the homepage for unknown URLs, creating duplicate/soft-404 candidates.
- React/Vite uses pathname dispatch for `/player/`, `/lobby/` and `/debug/`; Express serves `demo/client/dist` and previously fell back to `index.html` for almost every non-API URL. `render.yaml` builds the server and client, then starts Express, with persistent SQLite storage. Its configured deployment branches are `NewUI` and `NewUIstats`; this checkout was on `main`. The deployed service's exact current branch must be checked in Render before release.
- Language was selected from localStorage and changed after React mounted; there were no separately addressable translated educational pages or hreflang links.
- Replay, bots, multiplayer, the hand archive, player statistics, current-combination guides, bot explanations and archive comparison tooltips already exist. Voice UI is explicitly disabled and is not advertised by the new content.
- The red exclamation mark is `ReportProblemButton`, opening a problem-report dialog and submitting diagnostics to `/api/problems`. The commit and GMT build date come from `/api/version`. Both are retained.

## Mobile and performance observations

Inspected the actual production UI in Chromium at 360, 390 and 400px. No horizontal page overflow occurred; game entry remained visible. The existing compact green/card layout was retained.

Unthrottled production samples had TTFB around 278–451ms and DOMContentLoaded around 692–1101ms. Two usable LCP observations were 792ms and 856ms; one observer did not record LCP. Observed initial CLS was zero in these samples. These are small desktop-browser laboratory observations with a mobile viewport, not a Lighthouse mobile benchmark or a field Core Web Vitals assessment. INP was not established. The original homepage transferred roughly 145KB of reported resources in this browser.

The new educational pages load their content without the game bundle, WebSocket connection or voice bundle. The game still loads its existing code on game/home/archive routes. Vite still warns about the existing lazy voice chunk exceeding 500KB uncompressed.

## Implemented behavior

- Build-time static HTML for the homepage and six guides in English and Russian: 13 public URLs. No browser installation, production API calls or database reads are needed to build.
- Homepage title and description use the requested wording. Its existing introduction is now shared with the initial HTML snapshot, and its supporting heading is a semantic H2 with the existing appearance. A compact card adds six educational links below game entry.
- `/rules`, `/omaha-vs-holdem`, `/how-to-play`, `/hand-replay`, `/statistics`, `/poker-hints`, and equivalent `/ru/...` pages provide original, fully translated content. Rules include a worked example, hand rankings, low comparison, split pots, scoop and quartering. Strategy advice is limited to practical learning habits.
- `/statistics` initializes the existing archive UI and retains its original replay callback. The static HTML supplies explanations of actual metrics; live archive rows still load from the existing API. Build-time HTML does not embed changing production data. No fabricated statistics are supplied.
- Every public URL gets a unique title/description, self-canonical, Open Graph metadata, WebSite/WebPage JSON-LD and semantic HTML. Guides have visible breadcrumbs and BreadcrumbList JSON-LD. No reviews, ratings, invented rankings or rich-result eligibility claims are added.
- Reciprocal English/Russian hreflang and English x-default are generated only for fully translated guides. The homepage retains its existing preference-based Russian UI; its default initial HTML is English and it is deliberately excluded from hreflang pairs. Client metadata follows its selected language.
- `sitemap.xml` contains only public canonical URLs. `robots.txt` allows public pages/assets and excludes API/admin crawling. Session and debug pages receive a separate noindex HTML shell and X-Robots-Tag; they no longer inherit homepage content/canonical. Admin HTML also receives noindex. Robots exclusions are not access controls.
- Extensionless guides are served directly with HTTP 200; trailing-slash and `index.html` guide variants redirect 301 to their canonicals, preserving query parameters. `/index.html` redirects to `/`. Unknown URLs now return a genuine 404. Existing game URL families and HTTP/WebSocket payloads are preserved.
- Statistics Back/Lobby navigation returns to `/`; About opens the existing homepage About view. Direct visits to translated statistics preserve the selected language when entering the game. Archive descriptions only list columns that are currently displayed.
- Initial homepage cards link to `/?start=bots` and `/?start=friends`; these only open the existing setup/join view and never create a game without the player's action.

## Files

- `demo/client/src/seo/content.ts`: bilingual guide content, route helpers and metadata.
- `demo/client/src/seo/PublicContent.tsx`: semantic guide pages, shared homepage introduction, compact links and initial homepage snapshot.
- `demo/client/src/seo/render.tsx`: static rendering, canonical/hreflang/Open Graph and JSON-LD.
- `demo/client/src/seo/metadata.ts`: metadata for Vite development and the existing language preference.
- `demo/client/scripts/build.mjs`: normal Vite build followed by static HTML/sitemap generation; temporary SSR output is contained under ignored node_modules.
- `demo/client/public/robots.txt`.
- `demo/client/src/main.tsx`: load public guides independently and hydrate their generated HTML.
- `demo/client/src/pages/App.tsx`: integrate shared introduction/links and the existing archive route.
- `demo/client/src/pages/appStyles.ts`: preserve the existing compact appearance for semantic/static elements.
- `server/src/index.ts`: public static routes, private noindex headers/shell and 404 fallback.
- `demo/client/package.json`, `demo/package.json`: build and SEO test commands/CI integration.
- `demo/playwright.config.ts`, `demo/playwright.seo.config.ts`, `demo/playwright/tests/seo.spec.ts`: separate production-style HTML/routing coverage.
- `docs/seo-audit.md`: this delivery report.

Generated HTML, screenshots, test results and build output are ignored. The pre-existing untracked `demo/client/android/` directory was preserved.

## Validation

- Server TypeScript build and client TypeScript checks pass; client production build generates 13 pages and sitemap.
- Server unit tests: 10 suites, 119 tests pass. Client unit tests: 6 suites, 20 tests pass.
- Ten production-style SEO tests verify all public URLs with JavaScript disabled, unique metadata, canonicals, language tags, JSON-LD, sitemap responses, slash and index.html redirects, private noindex and genuine 404 responses. Browser coverage checks 360, 390 and 400px, English/Russian navigation, archive initialization, return navigation, direct translated entry, retained homepage language preference and actual bot-game startup through the built production client.
- Existing browser coverage checks bots, people entry, invitations/PINs, session recovery, archive replay, the diagnostic dialog and version footer: 10 tests pass together and 3 setup tests pass in a separate clean-server run. A combined run initially failed the setup empty-lobby assertion because earlier tests left open tables on the shared in-memory server; it passes in isolation.
- The existing `lobby-responsive.spec.ts` fails because it expects `Seats at the table` in the friends creation form. The same timeout was reproduced in an isolated checkout of the original commit `dfc7abf`, without these client changes. This stale test was left unchanged. The full CI-equivalent suite was not claimed to pass.
- No lint script or lint configuration is available in the changed packages. `git diff --check` is used for whitespace verification.

Commands from the repository root:

```powershell
npm.cmd --prefix demo/client run typecheck
npm.cmd --prefix server run build
npm.cmd --prefix demo/client run build
npm.cmd --prefix server test
npm.cmd --prefix demo run test:client -- --runInBand
npm.cmd --prefix demo run e2e:seo
```

## Manual release and Google Search Console

1. Review `seo/public-pages` and release it through the actual Render production branch/service after approval. Pushing this review branch does not publish the production website. The existing client build command generates the additional files automatically; no database migration is needed.
2. After release, confirm `/robots.txt` is plain text, `/sitemap.xml` is XML, guide URLs return 200 and slash variants return 301. View source on `/` and `/rules` to confirm content and canonicals before testing JavaScript.
3. Verify a Search Console **Domain property** for `omahahilopoker.com` using its DNS TXT record if not already verified.
4. Submit `https://omahahilopoker.com/sitemap.xml` in Sitemaps.
5. Use URL Inspection → Test live URL on `/`, `/rules`, `/statistics` and a Russian guide. Inspect fetched/rendered HTML, declared canonical, indexing permissions and resource access. Request indexing for the homepage and principal English pages after successful live checks.
6. Review Page indexing for soft 404s, blocked URLs and duplicate canonicals. Private game sessions are intentionally not indexed; public guides should be eligible. Validate breadcrumb markup with Google's Rich Results Test; WebPage/WebSite alone do not promise a rich result.
7. Review Core Web Vitals using field data when available, and use PageSpeed Insights mobile diagnostics after release. Do not infer field CWV from the viewport checks above.
8. Record a release-date baseline in Search results, then compare impressions/clicks, pages, countries and queries over subsequent weeks. No keyword volumes, traffic forecasts or ranking promises are made.

## Remaining work by estimated impact

1. **High:** review and release this branch, submit the sitemap, resolve any actual Search Console indexing/canonical issues. Prepared local changes cannot affect production search visibility before release.
2. **High:** develop editorial quality and relevant earned links based on actual search queries and user questions. Expand practical examples where Search Console shows demand; avoid generating many shallow strategy pages.
3. **Medium:** evaluate field LCP/INP/CLS, then optimize only measured bottlenecks. Check slower mobile connections, homepage snapshot replacement and the existing game bundle; current unthrottled samples are insufficient to prioritize a rewrite.
4. **Medium:** if Russian organic acquisition matters, introduce stable translated homepage URLs and language-aware game entry with full matching content, then add homepage hreflang. The current preference-based homepage remains intentionally outside the guide language pairs.
5. **Low:** add a designed, accurate Open Graph image for sharing and continue accessibility/editorial reviews. Social preview improvements do not imply a direct ranking benefit.

References: [Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), [canonical URL guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls), [structured-data guidelines](https://developers.google.com/search/docs/appearance/structured-data/sd-policies).
