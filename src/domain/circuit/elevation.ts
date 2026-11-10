/**
 * Hills on a circuit: the road's height along the lap.
 *
 * A circuit's elevation is authored as key points `[lapFraction, heightM]`
 * (fraction 0–1 of the way round from the start line). Between two keys the
 * road eases from one height to the next along a half cosine, so every key is
 * a crest, a dip or a level shelf and the steepest grade sits halfway between
 * them: (π / 2) · Δh / Δs. The profile wraps, so the last key eases back into
 * the first across the start line. The road is level side to side.
 */
export type ElevationKey = readonly [fraction: number, heightM: number];

/** Height at a lap fraction (wraps), m; 0 everywhere with no keys. */
export function elevationAt(keys: readonly ElevationKey[], fraction: number): number {
  if (keys.length === 0) return 0;
  const f = fraction - Math.floor(fraction);
  const n = keys.length;
  // The key at or before f, wrapping back to the last one before the first key.
  let i = n - 1;
  for (let k = 0; k < n; k++) {
    if ((keys[k] as ElevationKey)[0] <= f) i = k;
  }
  const [f0, h0] = keys[i] as ElevationKey;
  const [f1raw, h1] = keys[(i + 1) % n] as ElevationKey;
  const f1 = f1raw <= f0 ? f1raw + 1 : f1raw;
  const at = f < f0 ? f + 1 : f;
  const t = f1 > f0 ? (at - f0) / (f1 - f0) : 0;
  return h0 + (h1 - h0) * (1 - Math.cos(Math.PI * t)) * 0.5;
}

/** Steepest grade the keys give on a lap this long (rise / run, either way). */
export function steepestGrade(keys: readonly ElevationKey[], lengthM: number): number {
  const n = keys.length;
  let worst = 0;
  for (let i = 0; i < n; i++) {
    const [f0, h0] = keys[i] as ElevationKey;
    const [f1raw, h1] = keys[(i + 1) % n] as ElevationKey;
    const run = ((f1raw <= f0 ? f1raw + 1 : f1raw) - f0) * lengthM;
    if (run > 0) worst = Math.max(worst, (Math.PI / 2) * (Math.abs(h1 - h0) / run));
  }
  return worst;
}
