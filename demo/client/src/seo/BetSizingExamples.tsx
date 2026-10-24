import React from 'react';
import { type Language } from './content';
import { Choices } from './RulesChoices';
import { illustratedBetSizes } from './rulesIllustrations';

export function BetSizingExamples({ language }: { language: Language }) {
  const ru = language === 'ru';
  const labels = ru ? ['Первая ставка', 'После ставки 20', 'Вы на SB', 'Осталось 30'] : ['Opening bet', 'Facing a bet of 20', 'You are SB', 'Only 30 left'];
  const sizes = ru ? ['Минимум', '¼ банка', '½ банка', 'Банк'] : ['Minimum', '¼ pot', '½ pot', 'Pot'];
  const explanations = ru ? [
    'Никто ещё не поставил. При BB = 4 минимальная ставка — 4, максимальная — 100. Например, половина банка — ставка 50. Для первой ставки достаточно выбрать размер и нажать Bet.',
    'В 100 уже включена ставка соперника 20. Минимальный полный рейз — до 40: ещё 20 сверх колла. Для долей банка сначала учитываем колл: 100 + 20 = 120. Половина — повышение на 60 сверх колла, то есть до 80. Выберите размер и нажмите Raise.',
    'Вы уже внесли SB = 2, соперник — BB = 4. Колл стоит ещё 2. Минимальный рейз — до 8, значит, добавить нужно 6. Четверть и половина банка здесь упираются в минимум и дают те же 8. Рейз в банк — до 12, добавить 10.',
    'Никто ещё не поставил, но у вас осталось только 30 фишек. Четверть банка — 25. Половина и весь банк превышают стек, поэтому обе кнопки дадут ставку 30 — all-in. Ставить больше своих фишек нельзя.',
  ] : [
    'Nobody has bet yet. With BB = 4, the minimum bet is 4 and the maximum is 100. Half the pot, for example, is a bet of 50. Choose a size and press Bet to open the betting.',
    'The 100 already includes the opponent’s bet of 20. The minimum full raise is to 40: another 20 on top of the call. Pot fractions count the call first: 100 + 20 = 120. Half of that is a raise of 60 on top of the call, or 80 total. Choose a size and press Raise.',
    'You have already posted SB = 2; the opponent posted BB = 4. Calling costs another 2. The minimum raise is to 8, so you add 6. Quarter-pot and half-pot sizes hit the minimum here and also give 8. A pot raise is to 12: add 10.',
    'Nobody has bet yet, but you have only 30 chips left. A quarter-pot bet is 25. Half-pot and pot both exceed your stack, so either choice produces a 30-chip all-in bet. You cannot bet more chips than you have.',
  ];
  return <div className="rules-sizing-examples">
    <Choices name="rules-sizing" legend={ru ? 'Выберите ситуацию · во всех примерах BB = 4' : 'Choose a situation · BB = 4 in every example'} items={illustratedBetSizes.map((example, index) => ({
      label: labels[index], body: <div className="rules-sizing-scene" data-example={example.id}>
        <dl className="rules-sizing-facts">
          {[[ru ? 'Банк сейчас' : 'Pot now', example.pot], [ru ? 'Уже внесли' : 'Already paid', example.ownBet], [ru ? 'Для колла' : 'To call', example.call], [ru ? 'В стеке' : 'Stack left', example.stack]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl>
        <div className="rules-sizing-options">{example.targets.map((target, size) => <div key={size}>
          <h4>{sizes[size]}</h4><small>{example.move === 'raise' ? ru ? 'Рейз до' : 'Raise to' : ru ? 'Ставка' : 'Bet'}</small>
          <strong className="rules-sizing-target">{target}</strong>
          <span className="rules-sizing-added">{ru ? 'Добавить' : 'Add'} {example.added[size]}</span>
          {example.added[size] === example.stack && <b className="rules-sizing-allin">All-in</b>}
        </div>)}</div>
        <p>{explanations[index]}</p>
      </div>,
    }))} />
    <p className="rules-note"><strong>{ru ? '«Рейз до 12» — это не «добавить 12». ' : '“Raise to 12” does not mean “add 12”. '}</strong>
      {ru ? 'Это ваша общая ставка за текущую улицу. Уже внесённые фишки вычитаются: если поставили 2, добавить нужно 10.' : 'It is your total wager on this street. Previously paid chips count toward it: if you already paid 2, you add 10.'}</p>
    <p>{ru ? 'Минимальное полное повышение обычно равно размеру предыдущего полного повышения. Если ставку подняли с 4 до 12 (на 8), следующий полный рейз — минимум до 20. При коротком стеке возможен меньший all-in; он может не открыть право на повторный рейз уже ходившим игрокам.' : 'The minimum full raise follows the previous full raise increment. If the wager went from 4 to 12 (an increase of 8), the next full raise is at least to 20. A short stack can make a smaller all-in raise; this may not reopen raising for players who already acted.'}</p>
    <p>{ru ? 'All-in тоже ограничен pot-limit: при банке 100 и стеке 500 нельзя открыть ставкой 500. Кнопки задают размер, а не советуют лучший ход — эти примеры показывают допустимые суммы.' : 'All-in is still subject to pot-limit: with a pot of 100 and a stack of 500, you cannot open for 500. The presets choose a size, not the best move; these examples show legal amounts.'}</p>
  </div>;
}
