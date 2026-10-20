import type { GameSound } from './sounds';

type Summary = {
  highWinners: string[]; lowWinners: string[];
  sidePots: Array<{ uncontestedWinnerId?: string; players?: Array<{ id: string; net?: number }> }>;
};
export type SoundState = {
  handId: string; partyId: string; playerId: string; revision: number; stage: string;
  currentPlayerId?: string; isBot?: boolean; folded: boolean; partyFinishedEarly: boolean;
  community: string[]; actions: Array<{ move: string; amount?: number }>;
  result?: Summary; showdownSummary?: Summary;
};

function isYourTurn(state: SoundState) {
  return !state.isBot && !state.folded && !state.partyFinishedEarly && state.stage !== 'showdown'
    && state.currentPlayerId === state.playerId;
}

export function openingSounds(state: SoundState): GameSound[] {
  if (state.stage !== 'preflop' || state.actions.length || state.partyFinishedEarly) return [];
  return isYourTurn(state) ? ['deal', 'turn'] : ['deal'];
}

/** Observe server events only; all hand evaluation and payout rules stay on the server. */
export function gameSoundEvents(previous: SoundState, next: SoundState): GameSound[] {
  if (previous.handId !== next.handId) return openingSounds(next);
  if (next.revision <= previous.revision) return [];
  const sounds: GameSound[] = [];
  const actions = next.actions.slice(previous.actions.length);
  if (actions.some(action => ['bet', 'raise', 'call'].includes(action.move) && (action.amount ?? 0) > 0)) sounds.push('chips');
  else if (actions.some(action => action.move === 'check')) sounds.push('check');
  else if (actions.some(action => action.move === 'fold')) sounds.push('fold');
  if (next.community.length > previous.community.length) sounds.push('cards');
  const result = next.result ?? next.showdownSummary;
  if (result && !(previous.result ?? previous.showdownSummary)) {
    const winners = new Set([...result.highWinners, ...result.lowWinners,
      ...result.sidePots.flatMap(pot => {
        if (!pot.uncontestedWinnerId) return [];
        const winner = pot.players?.find(player => player.id === pot.uncontestedWinnerId);
        // The server's net field distinguishes a won pot from returned uncalled chips.
        return winner?.net !== undefined && winner.net <= 0 ? [] : [pot.uncontestedWinnerId];
      })]);
    if (winners.has(next.playerId)) sounds.push(winners.size === 1 ? 'win' : 'splitWin');
  }
  if (isYourTurn(next) && (!isYourTurn(previous) || previous.stage !== next.stage)) sounds.push('turn');
  return sounds;
}
