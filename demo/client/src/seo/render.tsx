import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GuidePage, HomeSnapshot } from './PublicContent';
import { guides, guidePath, homeMeta, ORIGIN, type Language } from './content';

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const json = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');

export function publicPages() {
  const pages = [{ path: '/', language: 'en' as Language, ...homeMeta.en, body: renderToStaticMarkup(<HomeSnapshot />), slug: '' },
    ...guides.flatMap(guide => (['en', 'ru'] as const).map(language => ({
      path: guidePath(guide.slug, language), language, title: `${guide[language].title} | Omaha Hi-Lo`,
      description: guide[language].description, body: renderToStaticMarkup(<GuidePage guide={guide} language={language} />), slug: guide.slug,
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
    const alternates = page.slug ? (['en', 'ru'] as const).map(language => `<link rel="alternate" hreflang="${language}" href="${ORIGIN}${guidePath(page.slug, language)}" />`).join('\n') + `\n<link rel="alternate" hreflang="x-default" href="${ORIGIN}/${page.slug}" />` : '';
    return { ...page, head: `<title>${escape(page.title)}</title>
<meta name="description" content="${escape(page.description)}" />
<link rel="canonical" href="${url}" />
${alternates}
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Omaha Hi-Lo" />
<meta property="og:title" content="${escape(page.title)}" />
<meta property="og:description" content="${escape(page.description)}" />
<meta property="og:url" content="${url}" />
<meta property="og:locale" content="${page.language === 'ru' ? 'ru_RU' : 'en_US'}" />
<script type="application/ld+json">${json({ '@context': 'https://schema.org', '@graph': structured })}</script>` };
  });
}
