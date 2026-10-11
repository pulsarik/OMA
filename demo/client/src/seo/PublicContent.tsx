import React from 'react';
import { guides, guidePath, type Guide, type Language } from './content';
import { APP_SHELL_STYLES } from '../pages/appStyles';

export const PUBLIC_STYLES = `
 .seo-shell { min-height:100vh; background:radial-gradient(circle at 50% 0%,#147a58,#064630 48%,#022c20); color:#17211b; font-family:Inter,ui-sans-serif,system-ui,sans-serif; padding:clamp(14px,4vw,38px); }
 .seo-main { width:min(100%,880px); margin:auto; display:grid; gap:18px; }
 .seo-card { box-sizing:border-box; min-width:0; border:1px solid #d8e2dc; border-radius:24px; background:#fff; padding:clamp(18px,4vw,30px); box-shadow:0 24px 70px rgba(1,35,25,.22); }
 .seo-card h1 { margin:0 0 14px; font-size:clamp(28px,6vw,44px); line-height:1.12; }
 .seo-card h2 { font-size:21px; margin:24px 0 8px; }
 .seo-card p { color:#3f5148; line-height:1.65; margin:8px 0; }
 .seo-card a { color:#076644; text-underline-offset:3px; }
 .seo-links { display:flex; flex-wrap:wrap; gap:8px 20px; }
 .seo-links a { display:inline-block; padding:8px 0; }
 .seo-header { display:flex; justify-content:space-between; gap:16px; align-items:center; color:#fff; }
 .seo-header a { color:inherit; padding:8px 0; }
 .seo-crumbs { margin:0 0 20px; padding:0; list-style:none; display:flex; flex-wrap:wrap; gap:8px; color:#526159; }
 .seo-crumbs li+li:before { content:'/'; margin-right:8px; }
 .seo-play { display:inline-block; background:#08734d; color:#fff!important; border-radius:12px; padding:12px 16px!important; text-decoration:none; font-weight:900; }
 .seo-home-actions { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; }
 .seo-home-actions a { text-align:center; color:#17211b; text-decoration:none; min-height:158px; display:grid; align-content:center; font-size:20px; font-weight:800; }
 @media(max-width:560px) { .seo-home-actions { grid-template-columns:1fr; } }
`;

export function LearnLinks({ language }: { language: Language }) {
  const labels = language === 'ru'
    ? ['Правила', 'Омаха и Холдем', 'Начало игры', 'Повтор раздач', 'Статистика', 'Подсказки']
    : ['Rules', "Omaha vs Hold’em", 'Getting started', 'Hand replay', 'Statistics', 'Poker hints'];
  return <section className="seo-card" aria-labelledby="learn-title">
    <h2 id="learn-title" style={{ marginTop: 0 }}>{language === 'ru' ? 'Правила и обучение' : 'Rules and learning'}</h2>
    <nav className="seo-links" aria-label={language === 'ru' ? 'Учебные страницы' : 'Omaha Hi-Lo guides'}>
      {guides.map((guide, index) => <a key={guide.slug} href={guidePath(guide.slug, language)}>{labels[index]}</a>)}
    </nav>
  </section>;
}

export function GuideArticle({ guide, language }: { guide: Guide; language: Language }) {
  const content = guide[language];
  return <article className="seo-card">
    <nav aria-label={language === 'ru' ? 'Навигационная цепочка' : 'Breadcrumb'}>
      <ol className="seo-crumbs"><li><a href="/">{language === 'ru' ? 'Главная' : 'Home'}</a></li><li aria-current="page">{content.title}</li></ol>
    </nav>
    <h1>{content.title}</h1>
    <a className="seo-play" href="/">{language === 'ru' ? 'Играть в Омаху хай-ло' : 'Play Omaha Hi-Lo'}</a>
    {content.sections.map(([heading, body]) => <section key={heading}><h2>{heading}</h2><p>{body}</p></section>)}
  </article>;
}

export function GuidePage({ guide, language }: { guide: Guide; language: Language }) {
  const alternate: Language = language === 'en' ? 'ru' : 'en';
  return <><style dangerouslySetInnerHTML={{ __html: PUBLIC_STYLES }} /><div className="seo-shell"><main className="seo-main">
    <header className="seo-header"><a href="/">OMAHA HI-LO</a><a href={guidePath(guide.slug, alternate)} lang={alternate} hrefLang={alternate}>{alternate.toUpperCase()}</a></header>
    <GuideArticle guide={guide} language={language} />
    {guide.slug === 'statistics' && <section className="seo-card"><h2 style={{ marginTop: 0 }}>{language === 'ru' ? 'Архив игр' : 'Game archive'}</h2><p>{language === 'ru' ? 'Архив загружается из сохранённых игр при включённом JavaScript.' : 'The live archive loads saved games when JavaScript is enabled.'}</p></section>}
    <LearnLinks language={language} />
  </main></div></>;
}

export function HomeIntro({ text }: { text: { eyebrow: string; title: string; intro: string; differenceTitle: string; difference: string } }) {
  return <section className="welcome-intro-card" style={HOME_CARD}>
    <span style={{ color: '#08734d', fontSize: 12, fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase' }}>{text.eyebrow}</span>
    <h1 style={{ margin: '8px 0 10px', fontSize: 'clamp(36px, 8vw, 68px)', lineHeight: .95 }}>{text.title}</h1>
    <p style={{ maxWidth: 680, margin: 0, color: '#3f5148', fontSize: 'clamp(17px, 2.5vw, 21px)', lineHeight: 1.5 }}>{text.intro}</p>
    <div className="welcome-difference" style={{ marginTop: 18, borderLeft: '4px solid #fbbf24', padding: '3px 0 3px 14px' }}>
      <h2 style={{ display: 'inline', margin: 0, fontSize: 'inherit', fontWeight: 700 }}>{text.differenceTitle}</h2>
      <p style={{ margin: '5px 0 0', color: '#526159', lineHeight: 1.5 }}>{text.difference}</p>
    </div>
  </section>;
}

const HOME_CARD: React.CSSProperties = {
  border: '1px solid rgba(167,243,208,.24)', borderRadius: 22, background: 'rgba(255,255,255,.96)',
  boxShadow: '0 24px 70px rgba(1,35,25,.22)', padding: 'clamp(18px, 4vw, 30px)',
};

// Initial homepage HTML uses the same introduction and links as the interactive lobby.
// React replaces this snapshot; no game state or production data is fetched at build time.
export function HomeSnapshot() {
  return <><style dangerouslySetInnerHTML={{ __html: APP_SHELL_STYLES + PUBLIC_STYLES }} />
    <div className="welcome-shell" style={{ minHeight: '100vh', background: 'radial-gradient(circle at 50% 0%, #147a58, #064630 48%, #022c20)', color: '#17211b', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif', padding: 'clamp(14px, 4vw, 38px)' }}>
    <main className="welcome-main" style={{ width: 'min(100%, 880px)', margin: '0 auto', display: 'grid', gap: 18 }}>
    <header className="welcome-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, color: '#fff' }}>
      <strong style={{ letterSpacing: '.12em' }}>OMAHA HI-LO</strong><span style={{ padding: '7px 10px' }}>RU</span>
    </header>
    <nav className="welcome-nav" aria-label="Home views" style={{ display: 'flex', gap: 4, margin: '0 12px -18px', zIndex: 1 }}>
      {['LOBBY', 'STATISTICS', 'ABOUT / О ПРОЕКТЕ'].map((label, index) => <a key={label} href={index === 1 ? '/statistics' : index === 2 ? '/?view=about' : '/'} style={{ padding: '8px 18px', borderRadius: '12px 12px 0 0', border: '1px solid #cbd5e1', background: '#fff', color: '#17211b', textDecoration: 'none', fontWeight: 900 }}>{label}</a>)}
    </nav>
    <HomeIntro text={{ eyebrow: 'A split-pot poker game', title: 'Omaha Hi-Lo', intro: 'Make your best high hand and your best qualifying low hand. The pot is split between them.', differenceTitle: 'How it differs from regular poker', difference: 'You receive four private cards and must use exactly two of them with exactly three board cards. A qualifying low uses five different cards ranked eight or lower.' }} />
    <section className="welcome-choice-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}>
      {[
        ['/?start=friends', '♧', 'Play with people', 'Join an open table or create your own.'],
        ['/?start=bots', '♠', 'Play with bots', 'Take a seat. Play right away.'],
        ['/statistics', '▤', 'Statistics', 'Browse the game archive.'],
      ].map(([href, icon, title, hint]) => <a key={href} href={href} className="welcome-choice-card" style={{ ...HOME_CARD, minHeight: 158, display: 'grid', gridTemplateColumns: '1fr', alignContent: 'start', justifyItems: 'center', gap: 14, border: '1px solid #d8e2dc', textAlign: 'center', color: 'inherit', textDecoration: 'none' }}>
        <span style={{ display: 'grid', placeItems: 'center', width: 52, height: 52, borderRadius: 16, background: '#e8f7ef', color: '#08734d', fontSize: 28, fontWeight: 800 }}>{icon}</span>
        <span><strong style={{ display: 'block', fontSize: 20 }}>{title}</strong><small style={{ display: 'block', marginTop: 6, color: '#65736a', fontSize: 14, lineHeight: 1.4 }}>{hint}</small></span>
      </a>)}
    </section>
    <LearnLinks language="en" />
  </main></div></>;
}
