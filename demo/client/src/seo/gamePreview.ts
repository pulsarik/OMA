import { ORIGIN } from './content';

// Optimized crop of demo/visual-previews/player-game.png, an actual game capture.
export const GAME_PREVIEW = {
  src: '/images/omaha-hi-lo-game.jpg',
  width: 1200,
  height: 630,
  alt: {
    en: 'Omaha Hi-Lo game with two players, four hole cards, chips and a green poker table',
    ru: 'Игра в Омаху хай-ло: два игрока, четыре карманные карты, фишки и зелёный покерный стол',
  },
};

export const GAME_PREVIEW_URL = `${ORIGIN}${GAME_PREVIEW.src}`;
