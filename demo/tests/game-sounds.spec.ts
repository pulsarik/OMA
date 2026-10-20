import { expect, test } from '@jest/globals';
import { gameSoundEvents, openingSounds, SoundState } from '../client/src/audio/gameSoundEvents';

const state: SoundState = {
  handId: 'h1', partyId: 'party', playerId: 'P1', revision: 1, stage: 'preflop',
  currentPlayerId: 'P2', folded: false, partyFinishedEarly: false, community: [], actions: [],
};
const next = (patch: Partial<SoundState>): SoundState => ({ ...state, revision: 2, ...patch });

test('fresh deals and new turns have distinct cues; duplicate and stale states stay silent', () => {
  expect(openingSounds(state)).toEqual(['deal']);
  expect(openingSounds({ ...state, currentPlayerId: 'P1' })).toEqual(['deal', 'turn']);
  expect(openingSounds({ ...state, stage: 'river' })).toEqual([]);
  const turn = next({ currentPlayerId: 'P1' });
  expect(gameSoundEvents(state, turn)).toEqual(['turn']);
  expect(gameSoundEvents(turn, turn)).toEqual([]);
  expect(gameSoundEvents(turn, state)).toEqual([]);
  expect(gameSoundEvents(turn, { ...turn, revision: 3 })).toEqual([]);
});

test('only newly confirmed actions produce effects, including on a street change', () => {
  const call = next({ actions: [{ move: 'call', amount: 4 }] });
  expect(gameSoundEvents(state, call)).toEqual(['chips']);
  expect(gameSoundEvents(call, { ...call, revision: 3 })).toEqual([]);
  expect(gameSoundEvents(call, { ...call, revision: 3, stage: 'flop', community: ['Ac', '2c', '3d'],
    actions: [...call.actions, { move: 'check' }], currentPlayerId: 'P1' })).toEqual(['check', 'cards', 'turn']);
  expect(gameSoundEvents(state, next({ actions: [{ move: 'fold' }] }))).toEqual(['fold']);
  expect(gameSoundEvents(state, next({ actions: [{ move: 'call', amount: 0 }] }))).toEqual([]);
});

test('a new street signals your turn even if the same player acts first again', () => {
  expect(gameSoundEvents({ ...state, currentPlayerId: 'P1' }, next({ stage: 'flop',
    currentPlayerId: 'P1', community: ['Ac', '2c', '3d'] }))).toEqual(['cards', 'turn']);
});

test.each([{ isBot: true }, { folded: true }, { partyFinishedEarly: true }, { stage: 'showdown' }])(
  'does not prompt an inactive player: %j', patch => {
    expect(gameSoundEvents(state, next({ currentPlayerId: 'P1', ...patch }))).not.toContain('turn');
  },
);

test('uses server winners to distinguish a scoop, split pot, loss and uncontested win', () => {
  const result = { highWinners: ['P1'], lowWinners: ['P1'], sidePots: [] };
  const completed = next({ stage: 'showdown', currentPlayerId: undefined, result });
  expect(gameSoundEvents(state, completed)).toEqual(['win']);
  expect(gameSoundEvents(state, { ...completed, result: { ...result, lowWinners: ['P2'] } })).toEqual(['splitWin']);
  expect(gameSoundEvents(state, { ...completed, result: { ...result, highWinners: ['P2'], lowWinners: [] } })).toEqual([]);
  expect(gameSoundEvents(state, { ...completed, result: { highWinners: [], lowWinners: [],
    sidePots: [{ uncontestedWinnerId: 'P1' }] } })).toEqual(['win']);
  expect(gameSoundEvents(completed, { ...completed, revision: 3 })).toEqual([]);
  expect(gameSoundEvents({ ...completed, result: undefined, showdownSummary: result }, { ...completed, revision: 3 })).toEqual([]);
});

test('new hands reset action history without replaying an already completed hand', () => {
  expect(gameSoundEvents(next({ stage: 'showdown' }), { ...state, handId: 'h2' })).toEqual(['deal']);
  expect(gameSoundEvents(state, { ...state, handId: 'h2', stage: 'showdown' })).toEqual([]);
});

test('returned uncalled chips neither celebrate a loss nor downgrade a scoop to a split', () => {
  const result = { highWinners: ['P2'], lowWinners: [], sidePots: [
    { uncontestedWinnerId: 'P1', players: [{ id: 'P1', net: 0 }] },
  ] };
  expect(gameSoundEvents(state, next({ stage: 'showdown', result }))).toEqual([]);
  expect(gameSoundEvents(state, next({ stage: 'showdown', result: { highWinners: ['P1'], lowWinners: [], sidePots: [
    { uncontestedWinnerId: 'P2', players: [{ id: 'P2', net: 0 }] },
  ] } }))).toEqual(['win']);
});
