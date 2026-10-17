import React from 'react';
import { type Language, guidePath } from './content';
import { practiceCases, practiceGroups } from './practice';

const styles = `
 .rules-nav { display:flex; flex-wrap:wrap; gap:8px 18px; margin:20px 0; }
 .rules-cards { display:flex; flex-wrap:wrap; gap:6px; margin:8px 0 14px; }
 .rules-card { display:inline-flex; align-items:center; justify-content:center; gap:3px; min-width:36px; padding:8px 5px; border:1px solid #b9cbc0; border-radius:7px; background:#fff; color:#17211b; font-weight:800; font-size:17px; box-shadow:0 2px 0 #d8e2dc; }
 .rules-card--red { color:#ac2433; }
 .rules-example { padding:18px; background:#edf8f1; border-radius:16px; margin:18px 0; }
 .rules-example h3 { margin-top:0; }
 .rules-ranks { padding-left:26px; }
 .rules-ranks li { padding:8px 0; border-bottom:1px solid #e1e9e4; }
 .rules-ranks .rules-cards { margin:8px 0; }
 .rules-checklist { padding-left:22px; color:#3f5148; line-height:1.65; }
 .rules-checklist li { margin:8px 0; }
 .practice-case { border:1px solid #d8e2dc; border-radius:12px; margin:10px 0; overflow:hidden; }
 .practice-case summary { padding:16px; cursor:pointer; font-weight:700; line-height:1.45; background:#f5faf7; }
 .practice-case summary:hover { background:#e8f5ed; }
 .practice-case summary:focus-visible { outline:3px solid #b58420; outline-offset:-3px; }
 .practice-body { padding:16px; }
 .practice-body p { margin-bottom:0; }
 .practice-note { font-size:14px; }
 .practice-group { margin:18px 0; }
 .practice-group > summary { cursor:pointer; padding:14px; border-radius:10px; background:#e5f2e9; color:#075c40; }
 .practice-group > summary h3 { display:inline; font-size:18px; margin:0; }
 .practice-group > summary:focus-visible { outline:3px solid #b58420; outline-offset:2px; }
 .rules-section { scroll-margin-top:20px; }
 .rules-pot-table { width:100%; border-collapse:collapse; font-size:15px; }
 .rules-pot-table th,.rules-pot-table td { padding:10px 6px; text-align:left; border-bottom:1px solid #d8e2dc; vertical-align:top; }
 @media(max-width:400px) { .rules-example { padding:12px; } .practice-case summary,.practice-body { padding:12px; } .rules-card { min-width:29px; font-size:15px; padding:7px 4px; } }
`;

function Cards({ codes, language }: { codes: string; language: Language }) {
  const symbols = { s: '♠', h: '♥', d: '♦', c: '♣' };
  const suits = language === 'ru' ? { s: 'пики', h: 'червы', d: 'бубны', c: 'трефы' } : { s: 'spades', h: 'hearts', d: 'diamonds', c: 'clubs' };
  return <span className="rules-cards">{codes.split(' ').map(code => {
    const suit = code[1] as keyof typeof symbols;
    const rank = code[0] === 'T' ? '10' : code[0];
    return <span key={code} className={`rules-card${suit === 'h' || suit === 'd' ? ' rules-card--red' : ''}`} aria-label={`${rank} ${suits[suit]}`}>{rank}<span aria-hidden="true">{symbols[suit]}</span></span>;
  })}</span>;
}

export function RulesNav({ language }: { language: Language }) {
  const ru = language === 'ru';
  return <nav className="rules-nav" aria-label={ru ? 'Содержание правил' : 'Rules contents'}>
    <a href="#rule-1">{ru ? 'Основные правила' : 'Basic rules'}</a>
    <a href="#hand-rankings">{ru ? 'Комбинации в картах' : 'Hand rankings in cards'}</a>
    <a href="#split-pot">{ru ? 'Доли банка' : 'Pot shares'}</a>
    <a href="#decision-checklist">{ru ? 'Как принять решение' : 'Decision checklist'}</a>
    <a href="#practice-50">{ru ? '50 учебных ситуаций' : '50 practice situations'}</a>
  </nav>;
}

export function RulesPractice({ language }: { language: Language }) {
  const ru = language === 'ru';
  const ranks = [
    ['Straight flush', 'Стрит-флеш', '9h Th Jh Qh Kh'],
    ['Four of a kind', 'Каре', 'As Ah Ad Ac Kd'],
    ['Full house', 'Фулл-хаус', 'Ks Kh Kd 2s 2h'],
    ['Flush', 'Флеш', 'Ah Jh 8h 5h 2h'],
    ['Straight', 'Стрит', '5c 6d 7h 8s 9c'],
    ['Three of a kind', 'Тройка', 'Qs Qh Qd 9c 2s'],
    ['Two pair', 'Две пары', 'Js Jh 4d 4c As'],
    ['One pair', 'Пара', 'Ts Th Ad 7c 3s'],
    ['High card', 'Старшая карта', 'As Jd 9c 6h 2s'],
  ];
  const checklist = ru ? [
    'Сначала соберите хай и лоу по правилу 2 + 3. Отделите уже готовую комбинацию от дро, которому ещё нужна карта.',
    'Проверьте, что может быть сильнее: возможны ли флеш, стрит, фулл-хаус или более низкое лоу? Лучшее лоу иногда делится с соперником.',
    'Посчитайте цену колла и доступные банки. Оценивайте среднюю долю всего банка, а не только вероятность собрать лоу.',
    'Учитывайте позицию, игроков за вами и будущие ставки. На ранней улице один колл не обязательно оплачивает всё вскрытие.',
    'После игры сравните расчёт с результатом. Удачный ривер не делает плохой колл хорошим, а проигрыш сам по себе не доказывает ошибку.',
  ] : [
    'Build high and low using exactly 2 + 3. Separate a made hand from a draw that still needs another card.',
    'Check what can beat you: a flush, straight, full house or better low? Even the best low can be shared.',
    'Calculate the call price and eligible pots. Estimate your average share of the whole pot, not only your chance of making low.',
    'Account for position, players yet to act and future bets. An early-street call does not necessarily buy the whole showdown.',
    'After playing, compare the reasoning with the result. A lucky river does not make a bad call good, and a loss alone does not prove a mistake.',
  ];
  return <>
    <style dangerouslySetInnerHTML={{ __html: styles }} />
    <section id="hand-rankings" className="rules-section">
      <h2>{ru ? 'Комбинации Омахи: от сильнейшей к слабейшей' : 'Omaha hand rankings: strongest to weakest'}</h2>
      <p>{ru ? 'Ниже — готовые пятикарточные комбинации для хай. В игре каждую нужно собрать ровно из двух карт руки и трёх общих. Роял-флеш — самый старший стрит-флеш: 10-J-Q-K-A одной масти.' : 'These are completed five-card high hands. In play, each must use exactly two hole cards and three board cards. A royal flush is the highest straight flush: 10-J-Q-K-A of one suit.'}</p>
      <ol className="rules-ranks">{ranks.map(([en, label, codes]) => <li key={en}><strong>{ru ? label : en}</strong><Cards codes={codes} language={language} /></li>)}</ol>
      <div className="rules-example">
        <h3>{ru ? 'Одни карты руки, две разные комбинации' : 'One holding, two different combinations'}</h3>
        <strong>{ru ? 'Ваши четыре карты' : 'Your four hole cards'}</strong>
        <Cards codes="As 2d Kc Qh" language={language} />
        <strong>{ru ? 'Общий борд' : 'Community board'}</strong>
        <Cards codes="3c 4d 8s Kh Ks" language={language} />
        <p><strong>{ru ? 'Хай: ' : 'High: '}</strong>{ru ? 'K♣ Q♥ из руки + K♥ K♠ 8♠ со стола = тройка королей.' : 'K♣ Q♥ from your hand + K♥ K♠ 8♠ from the board = three kings.'}</p>
        <p><strong>{ru ? 'Лоу: ' : 'Low: '}</strong>{ru ? 'A♠ 2♦ из руки + 3♣ 4♦ 8♠ со стола = 8-4-3-2-A.' : 'A♠ 2♦ from your hand + 3♣ 4♦ 8♠ from the board = 8-4-3-2-A.'}</p>
      </div>
    </section>
    <section id="split-pot" className="rules-section">
      <h2>{ru ? 'Как распределяется банк 100 фишек' : 'How a 100-chip pot is distributed'}</h2>
      <p>{ru ? 'Примеры без побочных банков. При ничьей соответствующая половина делится поровну между её победителями.' : 'Examples without side pots. When players tie, the relevant half is shared equally among its winners.'}</p>
      <table className="rules-pot-table">
        <thead><tr><th scope="col">{ru ? 'Результат' : 'Result'}</th><th scope="col">{ru ? 'Выплата' : 'Payout'}</th></tr></thead>
        <tbody>
          <tr><td>{ru ? 'Разные единственные победители хай и лоу' : 'Different sole high and low winners'}</td><td>50 / 50</td></tr>
          <tr><td>{ru ? 'Единственный победитель хай, подходящего лоу нет' : 'Sole high winner, no qualifying low'}</td><td>100</td></tr>
          <tr><td>{ru ? 'Один игрок единолично выигрывает хай и лоу — scoop' : 'One player wins high and low outright — scoop'}</td><td>100</td></tr>
          <tr><td>{ru ? 'Один выигрывает хай, два других делят лоу' : 'One wins high, two others tie for low'}</td><td>50 / 25 / 25</td></tr>
          <tr><td>{ru ? 'Один выигрывает хай и делит лоу с другим' : 'One wins high and ties low with another'}</td><td>75 / 25</td></tr>
        </tbody>
      </table>
      <p>{ru ? 'Выплата не равна прибыли: чтобы узнать итог раздачи, вычтите все свои вложенные фишки. Побочные банки распределяются отдельно среди игроков, имеющих на них право.' : 'Payout is not profit: subtract all your contributions to find your net hand result. Side pots are settled separately among eligible players.'}</p>
    </section>
    <section id="decision-checklist" className="rules-section">
      <h2>{ru ? 'Как разумно выбирать действие' : 'How to reason through a decision'}</h2>
      <ol className="rules-checklist">{checklist.map(item => <li key={item}>{item}</li>)}</ol>
      <div className="rules-example">
        <h3>{ru ? 'Цена колла: простой пример на ривере' : 'Call price: a simple river example'}</h3>
        <p>{ru ? 'В банке 100. Соперник ставит 50. После вашего колла 50 банк составит 200. Порог безубыточности: 50 ÷ 200 = 25% средней доли банка. Ровно 25% — нулевое ожидание относительно фолда, больше — положительное.' : 'The pot is 100. Your opponent bets 50. Your 50 call creates a final pot of 200. Break-even expected share: 50 ÷ 200 = 25%. Exactly 25% is neutral versus folding; more is positive chip expectation.'}</p>
        <p className="practice-note">{ru ? 'Условия примера: один соперник, последнее действие на ривере, без рейка и побочных банков. Вероятности выигрыша здесь не рассчитаны. На флопе и тёрне учитывайте будущие ставки.' : 'Assumptions: one opponent, closing action on the river, no rake or side pots. Winning probabilities are not calculated here. On the flop and turn, account for future bets.'}</p>
      </div>
    </section>
    <section id="practice-50" className="rules-section">
      <h2>{ru ? '50 учебных ситуаций с разбором' : '50 practice situations with explanations'}</h2>
      <p>{ru ? '40 карточных примеров и 10 задач на решения и разбор игры. Сначала ответьте сами, затем откройте разбор. Это составленные учебные ситуации, а не архив сыгранных партий и не расчёты солвера. Там, где не заданы ставки и действия соперников, разбираем свойства руки, а не объявляем обязательный ход.' : '40 card examples and 10 decision and review exercises. Answer first, then open the explanation. These are authored learning situations, not archived games or solver outputs. When bets and opposing actions are unspecified, we discuss the holding rather than prescribe a mandatory move.'}</p>
      <nav className="rules-nav" aria-label={ru ? 'Темы упражнений' : 'Practice topics'}>{practiceGroups.map((group, index) => <a key={index} href={`#practice-group-${index + 1}`}>{group[language]}</a>)}</nav>
      {practiceGroups.map((group, index) => <details id={`practice-group-${index + 1}`} className="rules-section practice-group" key={index} open={index === 0}>
        <summary><h3>{group[language]}</h3></summary>
        {practiceCases.filter(item => item.group === index).map(item => <details className="practice-case" id={`practice-${item.id}`} key={item.id}>
          <summary>{item.id}. {item.question[language]}
            <span className="rules-cards">{ru ? 'Карты руки' : 'Hole cards'}</span><Cards codes={item.hole} language={language} />
            <span>{ru ? 'Борд' : 'Board'}</span>
            {item.board ? <Cards codes={item.board} language={language} /> : <span className="rules-cards">{ru ? 'Префлоп — общих карт ещё нет.' : 'Preflop — no board yet.'}</span>}
            <span>{ru ? 'Открыть / скрыть разбор' : 'Show / hide explanation'}</span>
          </summary>
          <div className="practice-body">
            <p><strong>{ru ? 'Разбор. ' : 'Explanation. '}</strong>{item.answer[language]}</p>
            <a href={`#practice-${item.id}`} aria-label={ru ? `Ссылка на ситуацию ${item.id}` : `Link to situation ${item.id}`}>#{item.id}</a>
          </div>
        </details>)}
      </details>)}
    </section>
    <section>
      <h2>{ru ? 'Проверьте понимание за столом' : 'Test your understanding at the table'}</h2>
      <p>{ru ? 'Сыграйте с ботами и выберите одну раздачу для разбора. Запишите руку, открытые на момент решения карты, размер банка, цену колла и свой расчёт. Сравните с подсказками и итоговой выплатой. В повторе попробуйте другой ход, помня, что известный исход не доказывает качество решения.' : 'Play with bots and choose a hand to review. Note your cards, the board visible at the decision, pot size, call price and reasoning. Compare with the hints and payout. Try another move in replay, remembering that a known outcome does not establish decision quality.'}</p>
      <a className="seo-play" href="/?start=bots">{ru ? 'Практиковаться с ботами' : 'Practice with bots'}</a>
      <nav className="rules-nav"><a href={guidePath('hand-replay', language)}>{ru ? 'Как повторить раздачу' : 'How to replay a hand'}</a><a href={guidePath('poker-hints', language)}>{ru ? 'Как читать подсказки' : 'How to read hand hints'}</a></nav>
      <p className="practice-note">{ru ? 'Сверка базовых правил: ' : 'Basic rules reference: '}<a href="https://www.pokerstars.com/poker/games/omaha/high-low/">PokerStars — Omaha Hi/Lo</a>. {ru ? 'Учебные ситуации и разборы подготовлены для этого сайта.' : 'The exercises and explanations were prepared for this site.'}</p>
    </section>
  </>;
}
