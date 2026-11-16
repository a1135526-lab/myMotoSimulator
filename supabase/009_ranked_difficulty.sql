-- =====================================================================
-- 揍灰來尬掐 · ranked difficulty (run after 001–008)
--
-- Supabase → SQL Editor → New query → paste → Run. Safe to run again.
--
-- Ranked races against the AI now have a difficulty, picked before
-- queueing (src/domain/ranked/difficulty.ts). A good place against the AI
-- earns this share of the people table; a bad place always costs half:
--   easy 25%  ·  normal 50% (as before)  ·  hard 75%  ·  max 100%
-- Races against people are unchanged. Clients that don't send a
-- difficulty get 'normal', which is exactly the old rule.
-- =====================================================================

-- Points against the AI at a difficulty (integer division truncates toward
-- zero, like Math.trunc in the client).
create or replace function public.ranked_ai_delta(
  p_position integer,
  p_field integer,
  p_difficulty text
)
returns integer
language sql
immutable
set search_path = ''
as $$
  with t as (select public.ranked_delta(p_position, p_field, false) as pts)
  select case
    when t.pts > 0 then t.pts * (case p_difficulty
      when 'easy' then 25 when 'hard' then 75 when 'max' then 100 else 50 end) / 100
    else t.pts * 50 / 100
  end
  from t;
$$;

-- report_ranked as in 008_item_race.sql, plus the difficulty. The old
-- five-argument version goes, or a call without a difficulty would match both.
drop function if exists public.report_ranked(text, text, boolean, integer, integer);
create or replace function public.report_ranked(
  p_match text,
  p_group text,
  p_vs_ai boolean,
  p_position integer,
  p_field integer,
  p_difficulty text default 'normal'
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
     or p_position is null or p_position < 1 or p_position > p_field
     or coalesce(p_difficulty, 'normal') not in ('easy', 'normal', 'hard', 'max') then
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

  if coalesce(p_vs_ai, true) then
    delta := public.ranked_ai_delta(p_position, p_field, coalesce(p_difficulty, 'normal'));
  else
    delta := public.ranked_delta(p_position, p_field, false);
  end if;
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

revoke all on function public.ranked_ai_delta(integer, integer, text) from public, anon, authenticated;
revoke all on function public.report_ranked(text, text, boolean, integer, integer, text) from public, anon;
grant execute on function public.report_ranked(text, text, boolean, integer, integer, text) to authenticated;
