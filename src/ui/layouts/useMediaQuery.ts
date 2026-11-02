import { useEffect, useState } from 'react';

/** A phone on its side: the 3D modes go full screen with the buttons on the picture. */
export const IMMERSIVE_QUERY =
  '(pointer: coarse) and (orientation: landscape) and (max-height: 540px)';
/** A phone held upright: suggest turning it. */
export const PHONE_PORTRAIT_QUERY =
  '(pointer: coarse) and (orientation: portrait) and (max-width: 540px)';

const matches = (query: string) =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(query).matches
    : false;

export function useMediaQuery(query: string): boolean {
  const [on, setOn] = useState(() => matches(query));
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const list = window.matchMedia(query);
    const update = () => setOn(list.matches);
    update();
    list.addEventListener('change', update);
    return () => list.removeEventListener('change', update);
  }, [query]);
  return on;
}

export const useImmersive = () => useMediaQuery(IMMERSIVE_QUERY);
