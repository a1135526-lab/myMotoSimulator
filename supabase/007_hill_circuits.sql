-- =====================================================================
-- 揍灰來尬掐 · four hill circuits (run after 001–006)
--
-- Supabase → SQL Editor → New query → paste → Run.
-- Only ADDS rows to the circuit rules (lap times on these circuits can then
-- go on the global boards); safe to run again.
-- =====================================================================

-- Minimum lap: the whole lap at 90 m/s (324 km/h) average, as in schema.sql.
insert into public.circuits (id, length_m, min_lap_ms) values
  ('dragon-ridge', 2727, 2727 * 1000 / 90),
  ('roller-hills', 2455, 2455 * 1000 / 90),
  ('cliff-coast', 2308, 2308 * 1000 / 90),
  ('midnight-pass', 1661, 1661 * 1000 / 90)
on conflict (id) do nothing;
