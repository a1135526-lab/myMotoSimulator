-- =====================================================================
-- 揍灰來尬掐 · ten more circuits (run after 001–005)
--
-- Supabase → SQL Editor → New query → paste → Run.
-- Only ADDS rows to the circuit rules (lap times on these circuits can then
-- go on the global boards); safe to run again.
-- =====================================================================

-- Minimum lap: the whole lap at 90 m/s (324 km/h) average, as in schema.sql.
insert into public.circuits (id, length_m, min_lap_ms) values
  ('harbor-night', 2172, 2172 * 1000 / 90),
  ('sugar-mill', 1555, 1555 * 1000 / 90),
  ('lotus-lake', 1919, 1919 * 1000 / 90),
  ('cloud-peak', 1506, 1506 * 1000 / 90),
  ('gorge-run', 1695, 1695 * 1000 / 90),
  ('cape-coast', 3635, 3635 * 1000 / 90),
  ('lake-ridge', 1615, 1615 * 1000 / 90),
  ('kart-oval', 1012, 1012 * 1000 / 90),
  ('neon-streets', 1675, 1675 * 1000 / 90),
  ('rift-valley', 3642, 3642 * 1000 / 90)
on conflict (id) do nothing;
