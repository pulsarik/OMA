import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { resolveGuide } from './seo/content';
import { updateMetadata } from './seo/metadata';
import { installButtonClickSound } from './buttonClickSound';
import { browserVisitAttribution } from './visitAttribution';

// Public guides can be the entry page before the player opens the game.
browserVisitAttribution();

const disposeButtonClickSound = installButtonClickSound();
if (import.meta.hot) import.meta.hot.dispose(disposeButtonClickSound);

const root = document.getElementById('root')!;
const resolved = resolveGuide(window.location.pathname);
if (resolved?.language === 'ru') {
  window.location.replace(`/${resolved.guide.slug}${window.location.search}${window.location.hash}`);
} else if (resolved) window.localStorage.setItem('omaha-language', 'en');
if (/^\/(ru\/)?ai\/?$/.test(window.location.pathname)) {
  import('./seo/AiPage').then(({ AiPage, aiMetadata }) => {
    const language = window.location.pathname.startsWith('/ru/') ? 'ru' : 'en';
    document.documentElement.lang = language;
    document.title = aiMetadata[language].title;
    const page = <AiPage language={language} />;
    if (root.dataset.prerendered) hydrateRoot(root, page);
    else createRoot(root).render(page);
  });
} else if (resolved?.language !== 'ru' && resolved && resolved.guide.slug !== 'statistics') {
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
