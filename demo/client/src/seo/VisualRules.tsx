import React from 'react';
import { type Language } from './content';
import { RuleCards } from './RuleCards';
import { illustratedHand, lowIllustrations } from './rulesIllustrations';
import { LessonHeading } from './RulesLessonHeading';
import { BlindRules, RaiseLimitRules } from './BlindRules';
import { Choices } from './RulesChoices';
import { BetSizingExamples } from './BetSizingExamples';

function HandLesson({ language }: { language: Language }) {
  const ru = language === 'ru';
  return <section className="lesson" id="build-a-hand">
    <LessonHeading number="01" title={ru ? 'Четыре карты в руке. Используйте две.' : 'Four cards in your hand. Use two.'}
      subtitle={ru ? 'Это главное правило Омахи — и для хай, и для лоу.' : 'The essential Omaha rule, for both high and low.'} />
    <div className="rules-formula" aria-label={ru ? '2 карты руки + 3 общие карты = 5 карт комбинации' : '2 hole cards + 3 board cards = a 5-card hand'}>
      <span><strong>2</strong><small>{ru ? 'из руки' : 'from your hand'}</small></span><b aria-hidden="true">+</b>
      <span><strong>3</strong><small>{ru ? 'со стола' : 'from the board'}</small></span><b aria-hidden="true">=</b>
      <span><strong>5</strong><small>{ru ? 'в комбинации' : 'in your final hand'}</small></span>
    </div>
    <Choices name="rules-hand" legend={ru ? 'Переключите комбинацию — нужные карты выделены золотым' : 'Switch hands — the cards you use are outlined in gold'}
      items={(['high', 'low'] as const).map(mode => ({ label: mode === 'high' ? ru ? 'Хай · старшая' : 'High · strongest' : ru ? 'Лоу · младшая' : 'Low · lowest',
        body: <div className="rules-felt">
          <div className="rules-felt-row" data-source="hole"><div className="rules-felt-label"><span>{ru ? 'Ваши 4 карты' : 'Your 4 hole cards'}</span><small>{ru ? 'Используем 2' : 'Use 2'}</small></div>
            <RuleCards codes={illustratedHand.hole} selected={illustratedHand[mode]} language={language} /></div>
          <div className="rules-felt-row" data-source="board"><div className="rules-felt-label"><span>{ru ? '5 общих карт' : '5 community cards'}</span><small>{ru ? 'Используем 3' : 'Use 3'}</small></div>
            <RuleCards codes={illustratedHand.board} selected={illustratedHand[mode]} language={language} /></div>
          <div className="rules-result"><strong>{mode === 'high' ? ru ? 'Хай: тройка королей' : 'High: three kings' : ru ? 'Лоу: 8–4–3–2–A' : 'Low: 8–4–3–2–A'}</strong>
            <small>{mode === 'high' ? 'K♣ Q♥ + 8♠ K♥ K♠' : 'A♠ 2♦ + 3♣ 4♦ 8♠'}</small></div>
          <p>{ru ? 'Для хай и лоу можно выбрать разные пары из тех же четырёх карт.' : 'You can choose different pairs from the same four cards for high and low.'}</p>
        </div> }))} />
    <p className="rules-note">{ru ? 'Нельзя взять одну карту руки или сыграть только бордом. Для флеша нужны две карты одной масти в руке и три на столе.' : 'You cannot use just one hole card or play the board. A flush needs two suited cards in your hand and three on the board.'}</p>
  </section>;
}

function LowLesson({ language }: { language: Language }) {
  const ru = language === 'ru';
  return <section className="lesson" id="qualifying-low">
    <LessonHeading number="02" title={ru ? 'Лоу: пять разных карт от A до 8' : 'Low: five different ranks, A through 8'}
      subtitle={ru ? 'Туз — младший. Ни пар, ни девяток и старше.' : 'Aces are low. No pairs. Nothing higher than an eight.'} />
    <div className="rules-low-grid">{lowIllustrations.map(item => <div key={item.cards} className="rules-low-example">
      <strong>{item.low ? '✓ ' : '× '}{item[language]}</strong><RuleCards codes={item.cards} language={language} />
      <p>{ru ? item.ruNote : item.enNote}</p>
    </div>)}</div>
    <p>{ru ? 'Это готовые пятикарточные комбинации: в игре всё ещё нужны 2 карты руки + 3 общие. Стрит и флеш не мешают лоу.' : 'These are completed five-card hands: in play, you still need 2 hole cards + 3 board cards. Straights and flushes do not hurt a low.'}</p>
    <p className="rules-note">{ru ? 'Сравнивайте от старшей карты вниз: 7–6–4–2–A побеждает 8–4–3–2–A. Если старшая одинаковая, сравните следующую: 8–5–4–2–A побеждает 8–6–3–2–A.' : 'Compare from the highest card down: 7–6–4–2–A beats 8–4–3–2–A. If the highest cards match, compare the next: 8–5–4–2–A beats 8–6–3–2–A.'}</p>
  </section>;
}

function PotLesson({ language }: { language: Language }) {
  const ru = language === 'ru';
  const scenarios = [
    { label: ru ? 'Хай / лоу' : 'High / low', shares: [50, 50], players: ru ? ['Аня · хай', 'Борис · лоу'] : ['Anna · high', 'Ben · low'], note: ru ? 'Разные победители: половина за лучший хай, половина за лучшее подходящее лоу.' : 'Different winners: half for the best high, half for the best qualifying low.' },
    { label: ru ? 'Нет лоу' : 'No low', shares: [100], players: ru ? ['Аня · хай'] : ['Anna · high'], note: ru ? 'Если подходящего лоу нет ни у кого, победитель хай получает весь банк.' : 'If nobody has a qualifying low, the high winner takes the whole pot.' },
    { label: 'Scoop', shares: [100], players: ru ? ['Аня · хай + лоу'] : ['Anna · high + low'], note: ru ? 'Аня единолично выиграла обе половины. Весь банк — одному игроку: это scoop.' : 'Anna wins both halves outright. The whole pot goes to one player: a scoop.' },
    { label: ru ? 'Делим лоу' : 'Tied low', shares: [50, 25, 25], players: ru ? ['Аня · хай', 'Борис · ½ лоу', 'Вера · ½ лоу'] : ['Anna · high', 'Ben · ½ low', 'Cara · ½ low'], note: ru ? 'Борис и Вера делят лоу пополам: каждому по четверти всего банка. Это quartering.' : 'Ben and Cara share the low half: each gets a quarter of the whole pot. This is quartering.' },
    { label: '75 / 25', shares: [75, 25], players: ru ? ['Аня · хай + ½ лоу', 'Борис · ½ лоу'] : ['Anna · high + ½ low', 'Ben · ½ low'], note: ru ? 'Аня выигрывает хай и делит лоу с Борисом: 50 + 25 = 75 фишек.' : 'Anna wins high and ties low with Ben: 50 + 25 = 75 chips.' },
  ];
  return <section id="split-pot" className="lesson">
    <LessonHeading number="03" title={ru ? 'Один банк. Два способа выиграть.' : 'One pot. Two ways to win.'}
      subtitle={ru ? 'Посмотрите, кому достанутся 100 фишек.' : 'See where the 100 chips go.'} />
    <Choices name="rules-pot" legend={ru ? 'Выберите результат раздачи' : 'Choose a showdown result'} items={scenarios.map(item => ({ label: item.label,
      body: <div className="rules-pot-scene">
        <div className="rules-pot-total"><span className="rules-chip" aria-hidden="true">100</span><strong>{ru ? 'Банк: 100 фишек' : 'Pot: 100 chips'}</strong></div>
        <div className="rules-pot-bar" role="img" aria-label={item.players.map((player, index) => `${player}: ${item.shares[index]}`).join('; ')}>
          {item.shares.map((share, index) => <span key={index} style={{ flex: share }} aria-hidden="true">{share}</span>)}
        </div>
        <div className="rules-pot-key">{item.players.map(player => <span key={player}>{player}</span>)}</div><p>{item.note}</p>
      </div> }))} />
    <p>{ru ? 'Побочные банки распределяются отдельно среди имеющих на них право игроков. Выплата — не прибыль: вычтите свои вложения.' : 'Side pots are settled separately among eligible players. Payout is not profit: subtract your own contributions.'}</p>
  </section>;
}

function BettingLesson({ language }: { language: Language }) {
  const ru = language === 'ru';
  return <section className="lesson" id="pot-limit">
    <LessonHeading number="05" title={ru ? 'Pot-limit: сколько можно поставить?' : 'Pot-limit: how much can you bet?'}
      subtitle={ru ? 'Первая ставка — не больше банка. Для рейза сначала учтите колл.' : 'An opening bet is at most the pot. For a raise, count the call first.'} />
    <BetSizingExamples language={language} />
    <h3>{ru ? 'Почему рейз в банк здесь равен 140?' : 'Why is the pot raise 140 here?'}</h3>
    <p>{ru ? 'В банке уже 100, включая ставку соперника 20. На этой улице вы ещё ничего не внесли. Сначала мысленно уравняйте 20, затем посчитайте повышение.' : 'The pot is already 100, including an opponent’s bet of 20. You have not contributed on this street. Count the 20 call first, then work out the raise.'}</p>
    <div className="rules-bet-steps">
      <div><small>{ru ? '1 · Сейчас в банке 100' : '1 · There is 100 in the pot'}</small><strong>+20</strong><p>{ru ? 'Нужно добавить для колла. После колла в банке будет 120.' : 'Your call. After calling, the pot would be 120.'}</p></div>
      <div><small>{ru ? '2 · Банк после колла' : '2 · Pot after the call'}</small><strong>120</strong><p>{ru ? 'Максимальный размер повышения сверх колла.' : 'The maximum raise on top of your call.'}</p></div>
      <div><small>{ru ? '3 · Всего добавляете' : '3 · Total you put in'}</small><strong>140</strong><p>{ru ? '20 за колл + 120 повышения, если хватает фишек.' : '20 to call + 120 to raise, if your stack covers it.'}</p></div>
    </div>
  </section>;
}

export function VisualRules({ language }: { language: Language }) {
  return <><HandLesson language={language} /><LowLesson language={language} /><PotLesson language={language} /><BlindRules language={language} /><BettingLesson language={language} /><RaiseLimitRules language={language} /></>;
}
