import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { resolveGuide } from './seo/content';
import { updateMetadata } from './seo/metadata';

const root = document.getElementById('root')!;
const resolved = resolveGuide(window.location.pathname);
if (resolved?.language === 'ru') {
  window.location.replace(`/${resolved.guide.slug}${window.location.search}${window.location.hash}`);
} else if (resolved) window.localStorage.setItem('omaha-language', 'en');
if (resolved?.language !== 'ru' && resolved && resolved.guide.slug !== 'statistics') {
  import('./seo/PublicContent').then(({ GuidePage }) => {
    const page = <GuidePage {...resolved} />;
    document.documentElement.lang = resolved.language;
    updateMetadata(window.location.pathname, resolved.language);
    if (root.dataset.prerendered) hydrateRoot(root, page);
    else createRoot(root).render(page);
  });
} else if (resolved?.language !== 'ru') {
  import('./pages/App').then(({ default: App }) => createRoot(root).render(<App />));
}
