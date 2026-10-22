import crypto from 'crypto';
import { Lobby, isLobbyExpired, LOBBY_WAIT_MS } from './lobby';

export function invitationHash(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function newInvitation() {
  const token = crypto.randomBytes(32).toString('base64url');
  return { token, hash: invitationHash(token) };
}

export function canUseInvitation(lobby: Lobby, token: unknown, now = Date.now(), waitMs = LOBBY_WAIT_MS) {
  if (!lobby.assistant || lobby.status !== 'waiting' || isLobbyExpired(lobby, now, waitMs)) return false;
  if (!lobby.assistant.private) return true;
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) return false;
  const expected = Buffer.from(lobby.assistant.invitationHash, 'hex');
  const supplied = Buffer.from(invitationHash(token), 'hex');
  return expected.length === supplied.length && crypto.timingSafeEqual(expected, supplied);
}
