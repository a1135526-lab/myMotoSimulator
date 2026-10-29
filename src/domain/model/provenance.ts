/**
 * Where a group of numbers came from. Every spec section carries one so the
 * UI can flag unverified values as "估計值" instead of presenting guesses as fact.
 */
export type DataSourceKind =
  /** Manufacturer spec sheet or official website. */
  | 'official'
  /** Measured on a real dyno / timed run, with a citable record. */
  | 'measured'
  /** Forums, shops, magazines: plausible but not authoritative. */
  | 'community'
  /** Engineering estimate or placeholder pending real data. */
  | 'estimated';

export interface Provenance {
  readonly verified: boolean;
  readonly kind: DataSourceKind;
  /** URLs or citations. May be empty only when kind is "estimated". */
  readonly sources: readonly string[];
  readonly note?: string;
}
