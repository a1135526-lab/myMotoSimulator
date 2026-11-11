-- =====================================================================
-- 揍灰來尬掐 · item races (run after 001–007)
--
-- Supabase → SQL Editor → New query → paste → Run. Safe to run again.
--
-- 1. Item-race lap boards: an item race's laps go on the same lap board
--    tables under the circuit id "items:<circuit>", so they need rules here.
--    Minimum lap: the whole lap at 100 m/s average (boosts included).
-- 2. Item ranked: its own ladders, groups 'items-scooter' / 'items-manual',
--    with the same point table as plain ranked (src/domain/ranked/ranking.ts).
-- =====================================================================

insert into public.circuits (id, length_m, min_lap_ms) values
  ('items:south-bay', 3446, 3446 * 1000 / 100),
  ('items:hill-town', 1670, 1670 * 1000 / 100),
  ('items:practice-park', 1433, 1433 * 1000 / 100),
  ('items:harbor-night', 2231, 2231 * 1000 / 100),
  ('items:sugar-mill', 1940, 1940 * 1000 / 100),
  ('items:lotus-lake', 1920, 1920 * 1000 / 100),
  ('items:cloud-peak', 2417, 2417 * 1000 / 100),
  ('items:gorge-run', 2084, 2084 * 1000 / 100),
  ('items:cape-coast', 3636, 3636 * 1000 / 100),
  ('items:lake-ridge', 1731, 1731 * 1000 / 100),
  ('items:kart-oval', 1211, 1211 * 1000 / 100),
  ('items:neon-streets', 1988, 1988 * 1000 / 100),
  ('items:rift-valley', 3645, 3645 * 1000 / 100),
  ('items:dragon-ridge', 2727, 2727 * 1000 / 100),
  ('items:roller-hills', 2455, 2455 * 1000 / 100),
  ('items:cliff-coast', 2308, 2308 * 1000 / 100),
  ('items:midnight-pass', 1661, 1661 * 1000 / 100),
  ('items:pinball-park', 1358, 1358 * 1000 / 100),
  ('items:rainbow-pier', 1430, 1430 * 1000 / 100),
  ('items:night-market', 1079, 1079 * 1000 / 100)
on conflict (id) do nothing;

-- Item ranked ladders alongside the plain ones.
alter table public.ranked drop constraint if exists ranked_grp_check;
alter table public.ranked
  add constraint ranked_grp_check
  check (grp in ('scooter', 'manual', 'items-scooter', 'items-manual'));

-- report_ranked as in 004_ranked.sql, accepting the item ladders too.
create or replace function public.report_ranked(
  p_match text,
  p_group text,
  p_vs_ai boolean,
  p_position integer,
  p_field integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  delta integer;
  result public.ranked;
  last timestamptz;
begin
  if uid is null then
    raise exception 'not_signed_in';
  end if;
  if not exists (select 1 from public.profiles where id = uid) then
    raise exception 'no_nickname';
  end if;
  if p_group not in ('scooter', 'manual', 'items-scooter', 'items-manual')
     or p_match is null or char_length(p_match) > 64
     or p_field is null or p_field < 2 or p_field > 4
     or p_position is null or p_position < 1 or p_position > p_field then
    raise exception 'bad_report';
  end if;
  select max(created_at) into last from public.ranked_reports where user_id = uid;
  if last is not null and last > now() - interval '30 seconds' then
    raise exception 'too_fast';
  end if;
  begin
    insert into public.ranked_reports (user_id, match_id) values (uid, p_match);
  exception when unique_violation then
    raise exception 'already_reported';
  end;

  delta := public.ranked_delta(p_position, p_field, coalesce(p_vs_ai, true));
  insert into public.ranked (user_id, grp) values (uid, p_group)
  on conflict (user_id, grp) do nothing;
  update public.ranked r
    set points = greatest(0, r.points + delta),
        games = r.games + 1,
        wins = r.wins + case when p_position = 1 then 1 else 0 end,
        best = greatest(r.best, greatest(0, r.points + delta)),
        updated_at = now()
    where r.user_id = uid and r.grp = p_group
    returning * into result;
  return jsonb_build_object(
    'points', result.points, 'delta', delta, 'games', result.games, 'wins', result.wins
  );
end;
$$;
