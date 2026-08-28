import {
  ConnectionContext,
  receivesHandUpdate,
  receivesOpenLobbies,
  receivesPublicDeal,
} from '../src/connectionContext';

const home: ConnectionContext = { scope: 'home' };
const lobby: ConnectionContext = { scope: 'lobby', lobbyId: 'lobby-a', memberId: 'member-a' };
const tableA: ConnectionContext = {
  scope: 'player',
  handId: 'hand-a',
  partyId: 'party-a',
  playerId: 'player-a',
  visitId: 1,
};
const tableB: ConnectionContext = {
  scope: 'player',
  handId: 'hand-b',
  partyId: 'party-b',
  playerId: 'player-b',
  visitId: 2,
};

test('hand updates stay within the active table', () => {
  expect(receivesHandUpdate(tableA, 'hand-a')).toBe(true);
  expect(receivesHandUpdate(tableA, 'hand-b')).toBe(false);
  expect(receivesHandUpdate(tableB, 'hand-a')).toBe(false);
  expect(receivesHandUpdate(home, 'hand-a')).toBe(false);
  expect(receivesHandUpdate(lobby, 'hand-a')).toBe(false);
});

test('public deals reach the home feed and players in the same party only', () => {
  const handA = { id: 'hand-a', partyId: 'party-a' };

  expect(receivesPublicDeal(home, handA)).toBe(true);
  expect(receivesPublicDeal(tableA, handA)).toBe(true);
  expect(receivesPublicDeal(tableB, handA)).toBe(false);
  expect(receivesPublicDeal(lobby, handA)).toBe(false);
});

test('open lobby updates stay on the home feed', () => {
  expect(receivesOpenLobbies(home)).toBe(true);
  expect(receivesOpenLobbies(tableA)).toBe(false);
  expect(receivesOpenLobbies(lobby)).toBe(false);
});
