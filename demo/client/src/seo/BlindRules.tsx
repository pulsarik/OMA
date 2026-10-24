import React from 'react';
import { type Language } from './content';
import { LessonHeading } from './RulesLessonHeading';
import { illustratedBlindLevels, illustratedRaises } from './rulesIllustrations';

export function BlindRules({ language }: { language: Language }) {
  const ru = language === 'ru';
  return <section className="lesson" id="blinds">
    <LessonHeading number="04" title={ru ? 'SB и BB: с чего начинается банк' : 'SB and BB: how the pot starts'}
      subtitle={ru ? 'Две обязательные ставки до первого решения игроков.' : 'Two forced bets before anyone makes their first decision.'} />
    <div className="rules-blind-definitions">
      <div><span className="rules-position">SB</span><strong>{ru ? 'Малый блайнд' : 'Small blind'}</strong><p>{ru ? 'Начинается с 2 фишек. Место сразу после дилера по часовой стрелке.' : 'Starts at 2 chips. The seat immediately after the dealer clockwise.'}</p></div>
      <div><span className="rules-position rules-position--gold">BB</span><strong>{ru ? 'Большой блайнд' : 'Big blind'}</strong><p>{ru ? 'Начинается с 4 фишек. Следующее место после SB. Задаёт начальную ставку на префлопе.' : 'Starts at 4 chips. The next seat after SB. Sets the opening wager on the preflop round.'}</p></div>
    </div>
    <figure className="rules-blind-figure">
      <figcaption>{ru ? 'Пример: четыре игрока, блайнды 2 / 4' : 'Example: four players, blinds 2 / 4'}</figcaption>
      <div className="rules-blind-table" role="img" aria-label={ru ? 'По часовой стрелке: дилер Аня, SB Борис — 2, BB Вера — 4, Даня ходит первым на префлопе. В банке 6.' : 'Clockwise: dealer Anna, SB Ben posts 2, BB Cara posts 4, Dan acts first preflop. The pot is 6.'}>
        <div className="rules-seat rules-seat--dealer" aria-hidden="true"><b>D</b><strong>{ru ? 'Аня' : 'Anna'}</strong><small>{ru ? 'Дилер' : 'Dealer'}</small></div>
        <div className="rules-seat rules-seat--small" aria-hidden="true"><b>SB</b><strong>{ru ? 'Борис' : 'Ben'}</strong><small>{ru ? 'Ставит 2' : 'Posts 2'}</small></div>
        <div className="rules-seat rules-seat--big" aria-hidden="true"><b>BB</b><strong>{ru ? 'Вера' : 'Cara'}</strong><small>{ru ? 'Ставит 4' : 'Posts 4'}</small></div>
        <div className="rules-seat rules-seat--first" aria-hidden="true"><b>1 →</b><strong>{ru ? 'Даня' : 'Dan'}</strong><small>{ru ? 'Первый ход' : 'First to act'}</small></div>
        <div className="rules-blind-pot" aria-hidden="true"><span>↻</span><strong>6</strong><small>{ru ? 'в банке' : 'in the pot'}</small></div>
      </div>
    </figure>
    <p>{ru ? 'D — кнопка дилера, ориентир для порядка ходов. На префлопе первым ходит игрок после BB; после флопа — первый оставшийся игрок после дилера. Метки блайндов меняются от раздачи к раздаче.' : 'D is the dealer button, which marks the order of play. Preflop, action starts after BB; from the flop onward, it starts with the first remaining player after the dealer. Blind positions change from hand to hand.'}</p>
    <p>{ru ? 'При 2 / 4 без повышений SB добавляет ещё 2 для колла, остальные — 4. BB уже внёс 4 и может сказать «чек», если никто не повысил. Блайнды списываются из стека в банк; если фишек не хватает, игрок ставит остаток all-in.' : 'At 2 / 4 with no raises, SB adds 2 to call and the other players call 4. BB has already paid 4 and can check if nobody raises. Blinds move from the stack into the pot; a player short of chips posts their remaining stack all-in.'}</p>
    <p className="rules-note"><strong>{ru ? 'Если игроков двое: ' : 'With two players: '}</strong>{ru ? 'дилер одновременно ставит SB и ходит первым на префлопе. BB ходит первым после флопа.' : 'the dealer also posts SB and acts first preflop. BB acts first from the flop onward.'}</p>
    <div id="blind-levels" className="rules-section">
      <h3>{ru ? 'Блайнды удваиваются каждые 8 раздач' : 'Blinds double every 8 hands'}</h3>
      <p>{ru ? 'Рост зависит от номера раздачи в партии, а не от минут или числа ваших ходов.' : 'Levels follow the hand number in the game, not elapsed minutes or the number of actions you take.'}</p>
      <ol className="rules-blind-levels">{illustratedBlindLevels.map(level => <li key={level.from}>
        <small>{ru ? 'Раздачи' : 'Hands'} {level.from}–{level.to}</small><strong>{level.small} / {level.big}</strong><span>SB / BB</span>
      </li>)}</ol>
      <p className="rules-note">{ru ? 'Раздача №8 ещё играется с 2 / 4. С №9 — уже 4 / 8. Следующий рост — с №17, затем с №25 и далее каждые 8 раздач.' : 'Hand 8 still uses 2 / 4. Hand 9 starts at 4 / 8. The next increases begin at hands 17 and 25, then every 8 hands.'}</p>
    </div>
  </section>;
}

export function RaiseLimitRules({ language }: { language: Language }) {
  const ru = language === 'ru';
  return <section className="lesson" id="raise-limit">
    <LessonHeading number="06" title={ru ? 'Повысить можно три раза за улицу' : 'Up to three raises per street'}
      subtitle={ru ? 'Общий лимит на весь стол, а не по три рейза каждому.' : 'One shared limit for the table, not three raises per player.'} />
    <p>{ru ? 'Улица — один раунд торговли: префлоп, флоп, тёрн или ривер. Первая ставка (bet) открывает торговлю; рейз (raise) повышает уже открытую ставку.' : 'A street is one betting round: preflop, flop, turn or river. A bet opens the betting; a raise increases an existing wager.'}</p>
    <div className="rules-raise-example">
      <h3>{ru ? 'Пример на флопе: размеры ставок, до которых повышают' : 'Flop example: the total wager after each action'}</h3>
      <ol className="rules-raise-chain">
        <li><small>{ru ? 'Первая ставка' : 'Opening bet'}</small><strong>{illustratedRaises.bet}</strong><span>{ru ? 'Рейзов: 0 из 3' : 'Raises: 0 of 3'}</span></li>
        {illustratedRaises.raises.map((amount, index) => <li key={amount}><small>{ru ? 'Рейз' : 'Raise'} {index + 1}</small><strong>{amount}</strong><span>{ru ? 'Рейзов:' : 'Raises:'} {index + 1} {ru ? 'из' : 'of'} 3</span></li>)}
      </ol>
      <p><strong>{ru ? 'Четвёртый рейз недоступен. ' : 'A fourth raise is unavailable. '}</strong>{ru ? 'Против последней ставки остаётся колл (уравнять, при нехватке фишек — all-in) или фолд (сбросить).' : 'Facing the last wager, you can call (all-in if your stack is short) or fold.'}</p>
    </div>
    <div className="rules-raise-reset"><span aria-hidden="true">↻</span><p><strong>{ru ? 'Новая улица → снова 0 из 3' : 'New street → back to 0 of 3'}</strong><br />{ru ? 'После перехода на тёрн или ривер лимит начинается заново. Новая раздача тоже начинается с нуля.' : 'The count resets on the flop, turn and river. A new hand also starts at zero.'}</p></div>
    <p>{ru ? 'Блайнды, первая ставка, коллы и чеки не расходуют рейзы. На префлопе BB уже открывает ставку: первое повышение над BB — рейз №1. Каждый рейз также ограничен размером банка и доступным стеком.' : 'Blinds, opening bets, calls and checks do not use a raise. Preflop, BB already opens the betting: the first increase above BB is raise 1. Every raise is also constrained by the pot and your available stack.'}</p>
    <p className="rules-note">{ru ? 'Лимит в три рейза — дополнительное правило нашего сайта, а не стандартное ограничение PLO8.' : 'The three-raise cap is an extra rule of this site, not a standard PLO8 restriction.'}</p>
  </section>;
}
