// Build-time opt-in; existing large tables keep their original renderer.
export const MOBILE_TABLE_ENABLED = import.meta.env.VITE_MOBILE_TABLE_UI === 'true';
export const MOBILE_TABLE_MAX_PLAYERS = 7;
export const MOBILE_TABLE_MAX_WIDTH = 760;

export function shouldUseMobileTable(width: number, players: number) {
  return MOBILE_TABLE_ENABLED && width <= MOBILE_TABLE_MAX_WIDTH
    && players >= 2 && players <= MOBILE_TABLE_MAX_PLAYERS;
}
