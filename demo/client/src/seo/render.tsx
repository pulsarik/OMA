import React from 'react';
import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import { GuidePage, HomeSnapshot } from './PublicContent';
import { guides, guidePath, homeMeta, ORIGIN, type Language } from './content';
import { GAME_PREVIEW, GAME_PREVIEW_URL } from './gamePreview';

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const json = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');

export function publicPages() {
  // Guides are hydrated: preserve React's adjacent-text markers. The homepage
  // snapshot is replaced by createRoot and does not need hydration markers.
  const pages = [{ path: '/', language: 'en' as Language, ...homeMeta.en, body: renderToStaticMarkup(<HomeSnapshot />), slug: '' },
    ...guides.flatMap(guide => (['en'] as const).map(language => ({
      path: guidePath(guide.slug, language), language, title: `${guide[language].title} | Omaha Hi-Lo`,
      description: guide[language].description, body: renderToString(<GuidePage guide={guide} language={language} />), slug: guide.slug,
    })))];
  return pages.map(page => {
    const url = `${ORIGIN}${page.path}`;
    const structured: object[] = [
      { '@type': 'WebSite', '@id': `${ORIGIN}/#website`, name: 'Omaha Hi-Lo', url: `${ORIGIN}/` },
      { '@type': 'WebPage', '@id': `${url}#page`, url, name: page.title, description: page.description, inLanguage: page.language, isPartOf: { '@id': `${ORIGIN}/#website` } },
    ];
    if (page.slug) structured.push({ '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: page.language === 'ru' ? 'Главная' : 'Home', item: `${ORIGIN}/` },
      { '@type': 'ListItem', position: 2, name: guides.find(guide => guide.slug === page.slug)![page.language].title, item: url },
    ] });
    const alternates = '';
    return { ...page, head: `<title>${escape(page.title)}</title>
<meta name="description" content="${escape(page.description)}" />
<link rel="canonical" href="${url}" />
${alternates}
${page.path === '/' ? `<meta name="robots" content="index, follow, max-image-preview:large" />
<meta property="og:image" content="${GAME_PREVIEW_URL}" />
<meta property="og:image:width" content="${GAME_PREVIEW.width}" />
<meta property="og:image:height" content="${GAME_PREVIEW.height}" />
<meta property="og:image:alt" content="${escape(GAME_PREVIEW.alt[page.language])}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="${GAME_PREVIEW_URL}" />
<meta name="twitter:image:alt" content="${escape(GAME_PREVIEW.alt[page.language])}" />` : ''}
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Omaha Hi-Lo" />
<meta property="og:title" content="${escape(page.title)}" />
<meta property="og:description" content="${escape(page.description)}" />
<meta property="og:url" content="${url}" />
<meta property="og:locale" content="${page.language === 'ru' ? 'ru_RU' : 'en_US'}" />
<script type="application/ld+json">${json({ '@context': 'https://schema.org', '@graph': structured })}</script>` };
  });
}
