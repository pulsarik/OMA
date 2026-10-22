# Homepage search thumbnail

Implemented 22 October 2026. Deployment and Google Search Console checks remain separate.

## Audit and implementation

The live homepage returned HTTP 200 and already contained prerendered content, canonical metadata and JSON-LD. It had no gameplay `<img>`, Open Graph image or Twitter image. Its public `robots.txt` allows image crawling; only API and admin paths are disallowed.

The project builds React/Vite pages with `demo/client/scripts/build.mjs`, then serves the generated HTML and public assets through Express on Render. The preview uses that existing pipeline, without dependencies or changes to game logic or deployment configuration.

- Source: `demo/visual-previews/player-game.png`, an existing actual two-player preflop screenshot. No generated gameplay or synthetic cards.
- Output: `demo/client/public/images/omaha-hi-lo-game.jpg`, 1200×630, 90,339 bytes.
- Conversion: crop the table at x=32, y=76, width=1494, height=838; resize to 1124×630 with high-quality bicubic interpolation; center on a 1200×630 `#edf4f0` background; encode JPEG at quality 85. Only the screenshot framing and encoding were changed.
- Public URL: `https://omahahilopoker.com/images/omaha-hi-lo-game.jpg`.
- One responsive `<img>` in the existing homepage features card, below the play options, shared by the static snapshot and React. Explicit dimensions reserve its space; asynchronous decoding and the small asset limit loading cost. English and Russian alt text are available.
- Homepage HTML and runtime metadata include absolute Open Graph/Twitter image URLs, image dimensions, image alt text, `summary_large_image`, and `max-image-preview:large`. Private routes remove these image tags and remain noindex.
- Existing title, description, canonical and JSON-LD are preserved. No extra structured data or sitemap entries were needed.

## Verification

- `npm.cmd --prefix demo/client run typecheck`
- `npm.cmd --prefix demo run test:client -- --runInBand` — 36 tests passed.
- `npm.cmd --prefix demo run e2e:seo` — server/client production builds and 16 browser tests passed.
- Browser coverage checks generated HTML with JavaScript disabled and enabled, mobile/desktop image dimensions, no duplicate images/tags, successful image decoding, and private-route metadata cleanup.
- HTTP coverage checks the image returns 200 with JPEG bytes and MIME type, without authentication, using `Googlebot-Image/1.0`, and is allowed by the current robots rules.
- Built title, description, canonical and JSON-LD were compared with the live homepage and match exactly.

Local checks cannot establish field Core Web Vitals or actual Googlebot access through the production CDN. At implementation time the new live image URL returned 404 because this change had not been deployed.

## After deployment

1. Confirm the homepage source contains the image and tags, and the public image URL returns HTTP 200 with `Content-Type: image/jpeg`, without authentication, redirects or restrictive `X-Robots-Tag` headers. Check production robots.txt still allows `/images/`.
2. In Google Search Console, inspect `https://omahahilopoker.com/`, run **Test live URL**, and inspect the tested page HTML/screenshot and resource loading. Confirm Google can fetch and render the image and that indexing is allowed.
3. Request indexing of the homepage once after deployment. Review the subsequently crawled page and selected canonical; monitor Search performance and Core Web Vitals after sufficient traffic/data accumulates.

Google chooses search thumbnails automatically. Open Graph tags support sharing, while the visible, crawlable image and preview permission make an image available for Google's selection; none guarantees a thumbnail. See [Google image SEO best practices](https://developers.google.com/search/docs/appearance/google-images) and [robots preview controls](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag#max-image-preview).
