import React, { useEffect } from 'react';
import { HomeChoices } from '../components/HomeChoices';
import { guides, guidePath, homeCopy, type Guide, type Language } from './content';
import { APP_SHELL_STYLES } from '../pages/appStyles';
import { RulesNav, RulesPractice } from './RulesPractice';
import { GAME_PREVIEW } from './gamePreview';

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
 .home-benefits { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:22px; }
 .home-benefits h3 { margin:0 0 6px; font-size:18px; }
 .home-benefits p { margin:0; }
 .home-pot { margin-top:24px; padding:20px; border-radius:16px; background:#edf8f1; }
 .home-pot h3 { margin:0 0 8px; }
 .home-pot-split { display:flex; gap:4px; margin:16px 0; }
 .home-pot-split span { flex:1; padding:14px 8px; text-align:center; border-radius:8px; background:#075c40; color:white; font-weight:800; }
 .home-pot-split span+span { background:#f8d77e; color:#44310b; }
 .welcome-choice-card--primary { border:2px solid #c89730!important; background:#fff9e9!important; }
 @media(max-width:560px) { .home-benefits { grid-template-columns:1fr; gap:18px; } }
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
      <a href={language === 'ru' ? '/ru/ai' : '/ai'}>{language === 'ru' ? 'ИИ-ассистенты / MCP' : 'AI assistants / MCP'}</a>
      <a href={`${guidePath('rules', language)}#practice-50`}>{language === 'ru' ? '50 ситуаций с разбором' : '50 practice situations'}</a>
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
    {guide.slug === 'rules' ? <RulesNav language={language} /> : null}
    {content.sections.map(([heading, body], index) => <section id={`rule-${index + 1}`} key={heading}><h2>{heading}</h2><p>{body}</p></section>)}
    {guide.slug === 'rules' ? <RulesPractice language={language} /> : null}
  </article>;
}

export function GuidePage({ guide, language }: { guide: Guide; language: Language }) {
  useEffect(() => {
    // Vite loads guide content asynchronously, after the initial anchor navigation.
    if (window.location.hash) document.getElementById(window.location.hash.slice(1))?.scrollIntoView();
  }, [guide.slug]);
  return <><style dangerouslySetInnerHTML={{ __html: PUBLIC_STYLES }} /><div className="seo-shell"><main className="seo-main">
    <header className="seo-header"><a href="/">OMAHA HI-LO</a></header>
    <GuideArticle guide={guide} language={language} />
    {guide.slug === 'statistics' && <section className="seo-card"><h2 style={{ marginTop: 0 }}>{language === 'ru' ? 'Архив игр' : 'Game archive'}</h2><p>{language === 'ru' ? 'Архив загружается из сохранённых игр при включённом JavaScript.' : 'The live archive loads saved games when JavaScript is enabled.'}</p></section>}
    <LearnLinks language={language} />
  </main></div></>;
}

export function HomeIntro({ text }: { text: { eyebrow: string; title: string; intro: string; differenceTitle: string; difference: string } }) {
  return <section className="welcome-intro-card" style={HOME_CARD}>
    <span style={{ color: '#08734d', fontSize: 12, fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase' }}>{text.eyebrow}</span>
    <h1 style={{ margin: '12px 0', maxWidth: 720, fontSize: 'clamp(32px, 6vw, 56px)', lineHeight: 1.08, letterSpacing: '-.035em' }}>{text.title}</h1>
    <p style={{ maxWidth: 680, margin: 0, color: '#3f5148', fontSize: 'clamp(17px, 2.5vw, 21px)', lineHeight: 1.5 }}>{text.intro}</p>
    <div className="welcome-difference" style={{ marginTop: 18, borderLeft: '4px solid #fbbf24', padding: '3px 0 3px 14px' }}>
      <h2 style={{ display: 'inline', margin: 0, fontSize: 'inherit', fontWeight: 700 }}>{text.differenceTitle}</h2>
      <p style={{ margin: '5px 0 0', color: '#526159', lineHeight: 1.5 }}>{text.difference}</p>
    </div>
  </section>;
}

export function HomeBenefits({ language }: { language: Language }) {
  const ru = language === 'ru';
  const items = ru ? [
    ['Видно, какая комбинация собрана', 'Подсказки помогают разобраться в хай и лоу и увидеть, какие карты образуют комбинацию.'],
    ['Понятно, кому достался банк', 'Объяснение результата показывает, как банк распределился между победителями.'],
    ['Друзья за столом и в голосовом чате', 'Пригласите друзей по ссылке и обсуждайте игру голосом прямо за столом.'],
    ['Другой ход на тех же картах', 'Вернитесь к интересной раздаче, попробуйте другое решение и сравните результат.'],
  ] : [
    ['See the hand you have made', 'Hand hints help you understand high and low and see which cards form your combination.'],
    ['Understand where the pot went', 'Result explanations show how the pot was distributed among the winners.'],
    ['Friends at the table, together in voice chat', 'Invite friends with a link and talk about the game in the built-in voice chat.'],
    ['Try another move on the same cards', 'Replay an interesting deal, make a different decision and compare the outcome.'],
  ];
  return <section className="seo-card" aria-labelledby="home-benefits-title">
    <h2 id="home-benefits-title" style={{ marginTop: 0 }}>{ru ? 'Играйте вместе. Разбирайтесь по ходу.' : 'Play together. Learn as you go.'}</h2>
    <img src={GAME_PREVIEW.src} width={GAME_PREVIEW.width} height={GAME_PREVIEW.height}
      alt={GAME_PREVIEW.alt[language]} decoding="async"
      style={{ display: 'block', width: '100%', height: 'auto', borderRadius: 16, margin: '16px 0 24px' }} />
    <div className="home-benefits">{items.map(([title, body]) => <div key={title}><h3>{title}</h3><p>{body}</p></div>)}</div>
    <div className="home-pot">
      <h3>{ru ? 'Как делится банк в Omaha Hi-Lo?' : 'How does an Omaha Hi-Lo split pot work?'}</h3>
      <p>{ru ? 'Пример: в банке 100 фишек. Один игрок выиграл хай, другой собрал лучшее подходящее лоу, ничьих нет.' : 'Example: there are 100 chips in the pot. One player wins high, another has the best qualifying low, with no ties.'}</p>
      <div className="home-pot-split"><span>{ru ? 'Хай · 50 фишек' : 'High · 50 chips'}</span><span>{ru ? 'Лоу · 50 фишек' : 'Low · 50 chips'}</span></div>
      <p>{ru ? 'Для лоу нужны пять разных достоинств не выше восьмёрки; туз считается единицей. Если подходящего лоу нет, хай забирает весь банк. Один игрок может выиграть обе половины.' : 'Low needs five different ranks, eight or lower; ace counts as one. If no low qualifies, high wins the whole pot. One player can win both halves.'}</p>
      <a href={guidePath('rules', language)}>{ru ? 'Правила, комбинации и примеры разделения банка →' : 'Rules, hand rankings and split-pot examples →'}</a>
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
      <strong style={{ letterSpacing: '.12em' }}>OMAHA HI-LO</strong>
    </header>
    <nav className="welcome-nav" aria-label="Home views" style={{ display: 'flex', gap: 4, margin: '0 12px -18px', zIndex: 1 }}>
      {['LOBBY', 'STATISTICS', 'ABOUT'].map((label, index) => <a key={label} href={index === 1 ? '/statistics' : index === 2 ? '/?view=about' : '/'} style={{ padding: '8px 18px', borderRadius: '12px 12px 0 0', border: '1px solid #cbd5e1', background: '#fff', color: '#17211b', textDecoration: 'none', fontWeight: 900 }}>{label}</a>)}
    </nav>
    <HomeIntro text={homeCopy.en} />
    <HomeChoices />

    <HomeBenefits language="en" />
    <LearnLinks language="en" />
  </main></div></>;
}
