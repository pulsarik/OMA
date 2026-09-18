// New oval table UI is enabled by default; set VITE_MOBILE_TABLE_UI=false to keep the legacy look.
export const MOBILE_TABLE_ENABLED = import.meta.env.VITE_MOBILE_TABLE_UI !== 'false';
export const MOBILE_TABLE_MAX_PLAYERS = 7;
export const MOBILE_TABLE_MAX_WIDTH = 760;
export const DESKTOP_TABLE_MAX_PLAYERS = 10;

export function shouldUseDesktopTable(width: number, players: number) {
  return MOBILE_TABLE_ENABLED && width > MOBILE_TABLE_MAX_WIDTH
    && players >= 2 && players <= DESKTOP_TABLE_MAX_PLAYERS;
}

export function shouldUseMobileTable(width: number, players: number) {
  return MOBILE_TABLE_ENABLED && width <= MOBILE_TABLE_MAX_WIDTH
    && players >= 2 && players <= MOBILE_TABLE_MAX_PLAYERS;
}
