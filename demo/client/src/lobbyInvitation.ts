// Fragments never reach the HTTP server or Referer header. Remove the fragment
// after capturing it; this capability only joins a new seat, never resumes one.
export function captureLobbyInvitation(lobbyId: string) {
  const key = `omaha-lobby-${lobbyId}-invitation`;
  const token = new URLSearchParams(window.location.hash.slice(1)).get('invite');
  if (token && /^[A-Za-z0-9_-]{43}$/.test(token)) {
    window.localStorage.setItem(key, token);
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    return token;
  }
  return window.localStorage.getItem(key) ?? undefined;
}

export function lobbyInvitationUrl(lobby: { id: string; mode: string; pin: string; invitationOnly?: boolean }, invitation?: string) {
  const suffix = lobby.invitationOnly ? (invitation ? `#invite=${invitation}` : '')
    : lobby.mode === 'guests' || !lobby.pin ? '' : `?pin=${encodeURIComponent(lobby.pin)}`;
  return `${window.location.origin}/lobby/${encodeURIComponent(lobby.id)}${suffix}`;
}
