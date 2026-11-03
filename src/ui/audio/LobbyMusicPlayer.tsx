import { useLobbyMusic } from './useLobbyMusic';

/** Drop into a page to have the lobby music play while it's shown. */
export function LobbyMusicPlayer() {
  useLobbyMusic();
  return null;
}
