/** Pictures captured from the game (scripts/art/capture-art.mjs), for the lobby and mode cards. */
export type ArtName = 'lobby' | 'street' | 'circuit' | 'room' | 'drag' | 'simulator';

export const artUrl = (name: ArtName) => `${import.meta.env.BASE_URL}art/${name}.jpg`;

/** A darkened picture as a CSS background, so text on top stays readable. */
export const artBackground = (name: ArtName, shade = 0.55) =>
  `linear-gradient(180deg, rgb(10 12 16 / ${shade * 0.6}), rgb(10 12 16 / ${shade + 0.3})), url("${artUrl(name)}") center / cover no-repeat`;
