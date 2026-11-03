/** m:ss for mission clocks. */
export function fmtClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** m:ss.0 for mission results. */
export function fmtRunTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  return `${m}:${(seconds - m * 60).toFixed(1).padStart(4, '0')}`;
}

export const starText = (stars: number) => '★'.repeat(stars) + '☆'.repeat(3 - stars);
