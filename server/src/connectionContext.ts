export type HomeConnectionContext = {
  scope: 'home';
};

export type LobbyConnectionContext = {
  scope: 'lobby';
  lobbyId: string;
  memberId: string;
};

export type PlayerConnectionContext = {
  scope: 'player';
  handId: string;
  partyId: string;
  playerId: string;
  visitId: number;
};

export type ConnectionContext =
  | HomeConnectionContext
  | LobbyConnectionContext
  | PlayerConnectionContext;

export type PublicHandTarget = {
  id: string;
  partyId?: string;
};

export function receivesHandUpdate(context: ConnectionContext, handId: string) {
  return context.scope === 'player' && context.handId === handId;
}

export function receivesPublicDeal(context: ConnectionContext, hand: PublicHandTarget) {
  if (context.scope === 'home') return true;
  return context.scope === 'player' && context.partyId === (hand.partyId ?? hand.id);
}

export function receivesOpenLobbies(context: ConnectionContext) {
  return context.scope === 'home';
}
