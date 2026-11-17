import { Page } from '@playwright/test';

export function createdLobbyCard(page: Page, hostPage: Page) {
  const lobbyId = new URL(hostPage.url()).pathname.match(/^\/lobby\/([^/]+)$/)?.[1];
  if (!lobbyId) throw new Error('Host lobby ID was not present in the URL');
  return page.getByTestId(`open-lobby-${decodeURIComponent(lobbyId)}`);
}
