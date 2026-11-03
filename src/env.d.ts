interface ImportMetaEnv {
  /** Supabase project for the global leaderboards; unset = offline only. */
  readonly VITE_SUPABASE_URL?: string;
  /** Its publishable (anon) key — public by design. */
  readonly VITE_SUPABASE_KEY?: string;
  /** "off" builds without the leaderboards (e2e tests). */
  readonly VITE_ONLINE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
