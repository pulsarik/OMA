import { guidePath, homeMeta, ORIGIN, resolveGuide, type Language } from './content';
import { GAME_PREVIEW, GAME_PREVIEW_URL } from './gamePreview';

// Development serves one Vite template. Production already includes these tags in HTML.
export function updateMetadata(pathname: string, language: Language) {
  const resolved = resolveGuide(pathname);
  const isHome = pathname === '/';
  const meta = resolved ? { title: `${resolved.guide[resolved.language].title} | Omaha Hi-Lo`, description: resolved.guide[resolved.language].description } : homeMeta[language];
  const publicPage = resolved || isHome;
  document.documentElement.lang = resolved?.language ?? language;
  document.title = publicPage ? meta.title : 'Omaha Hi-Lo Table';
  const set = (selector: string, tag: string, attributes: Record<string, string>) => {
    let element = document.head.querySelector(selector);
    if (!element) { element = document.createElement(tag); document.head.append(element); }
    Object.entries(attributes).forEach(([key, value]) => element!.setAttribute(key, value));
  };
  set('meta[name="robots"]', 'meta', { name: 'robots', content: isHome ? 'index, follow, max-image-preview:large' : publicPage ? 'index, follow' : 'noindex, follow' });
  if (isHome) {
    for (const [property, content] of Object.entries({ 'og:image': GAME_PREVIEW_URL, 'og:image:width': String(GAME_PREVIEW.width), 'og:image:height': String(GAME_PREVIEW.height), 'og:image:alt': GAME_PREVIEW.alt[language] })) {
      set(`meta[property="${property}"]`, 'meta', { property, content });
    }
    for (const [name, content] of Object.entries({ 'twitter:card': 'summary_large_image', 'twitter:image': GAME_PREVIEW_URL, 'twitter:image:alt': GAME_PREVIEW.alt[language] })) {
      set(`meta[name="${name}"]`, 'meta', { name, content });
    }
  } else {
    document.head.querySelectorAll('meta[property="og:image"], meta[property^="og:image:"], meta[name^="twitter:"]').forEach(element => element.remove());
  }
  if (!publicPage) {
    document.head.querySelectorAll('link[rel="canonical"], link[hreflang], script[type="application/ld+json"], meta[property^="og:"]').forEach(element => element.remove());
    return;
  }
  const path = resolved ? guidePath(resolved.guide.slug, resolved.language) : '/';
  set('meta[name="description"]', 'meta', { name: 'description', content: meta.description });
  set('link[rel="canonical"]', 'link', { rel: 'canonical', href: `${ORIGIN}${path}` });
  for (const [property, content] of Object.entries({ 'og:title': meta.title, 'og:description': meta.description, 'og:url': `${ORIGIN}${path}`, 'og:type': 'website', 'og:site_name': 'Omaha Hi-Lo', 'og:locale': (resolved?.language ?? language) === 'ru' ? 'ru_RU' : 'en_US' })) {
    set(`meta[property="${property}"]`, 'meta', { property, content });
  }
  document.head.querySelectorAll('link[hreflang]').forEach(element => element.remove());
  if (isHome) {
    const script = document.head.querySelector('script[type="application/ld+json"]');
    if (script?.textContent) {
      const schema = JSON.parse(script.textContent);
      const page = schema['@graph']?.find((item: { '@type': string }) => item['@type'] === 'WebPage');
      if (page) { page.name = meta.title; page.description = meta.description; page.inLanguage = language; script.textContent = JSON.stringify(schema); }
    }
  }
}
