-- =====================================================================
-- 揍灰來尬掐 · ranked racing (run after 001–003)
--
-- Supabase → SQL Editor → New query → paste → Run.
-- Only ADDS things (and lets the match history store ranked races);
-- safe to run again.
--
-- Points per group (scooter / manual). The client reports its place; the
-- server works out the points itself, once per race, from the same table
-- as src/domain/ranked/ranking.ts.
-- =====================================================================

create table if not exists public.ranked (
  user_id uuid not null references public.profiles (id) on delete cascade,
  grp text not null check (grp in ('scooter', 'manual')),
  points integer not null default 0,
  games integer not null default 0,
  wins integer not null default 0,
  best integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, grp)
);
create index if not exists ranked_board on public.ranked (grp, points desc);

-- Each race counts once per player.
create table if not exists public.ranked_reports (
  user_id uuid not null references public.profiles (id) on delete cascade,
  match_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, match_id)
);

alter table public.ranked enable row level security;
alter table public.ranked_reports enable row level security;
revoke all on public.ranked from anon, authenticated;
revoke all on public.ranked_reports from anon, authenticated;

-- The point table: place in a field of 2–4; against the AI it counts half.
create or replace function public.ranked_delta(p_position integer, p_field integer, p_vs_ai boolean)
returns integer
language sql
immutable
set search_path = ''
as $$
  select (case
    when least(greatest(p_field, 2), 4) = 2 then
      case when p_position <= 1 then 24 else -18 end
    when least(greatest(p_field, 2), 4) = 3 then
      case when p_position <= 1 then 28 when p_position = 2 then 4 else -16 end
    else
      case when p_position <= 1 then 30 when p_position = 2 then 12
           when p_position = 3 then -6 else -18 end
  end) / (case when p_vs_ai then 2 else 1 end);
$$;

-- Report your place in a ranked race. Returns { points, delta, games, wins }.
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
  if p_group not in ('scooter', 'manual')
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

-- Your points in both groups.
create or replace function public.get_my_ranked()
returns table (grp text, points integer, games integer, wins integer, best integer)
language sql
stable
security definer
set search_path = ''
as $$
  select r.grp, r.points, r.games, r.wins, r.best
  from public.ranked r where r.user_id = auth.uid();
$$;

-- The top of a group's ladder, plus your own row.
create or replace function public.get_ranked_board(p_group text, p_limit integer default 50)
returns table (rank bigint, nickname text, points integer, games integer, wins integer, is_me boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with ranked_rows as (
    select rank() over (order by r.points desc, r.updated_at) as rank,
           p.nickname, r.points, r.games, r.wins, r.user_id = auth.uid() as is_me
    from public.ranked r
    join public.profiles p on p.id = r.user_id
    where r.grp = p_group and r.games > 0
  )
  select * from ranked_rows
  where ranked_rows.rank <= least(greatest(coalesce(p_limit, 50), 1), 100) or ranked_rows.is_me
  order by ranked_rows.rank;
$$;

-- Let the match history (002_matches.sql) keep ranked races too.
create or replace function public.add_matches(p_matches jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  m jsonb;
  added integer := 0;
  n integer;
begin
  if uid is null then
    raise exception 'not_signed_in';
  end if;
  if jsonb_typeof(p_matches) <> 'array' or jsonb_array_length(p_matches) > 100 then
    raise exception 'bad_match';
  end if;
  if (select count(*) from public.matches where user_id = uid) >= 5000 then
    raise exception 'too_many_matches';
  end if;
  for m in select value from jsonb_array_elements(p_matches) loop
    continue when jsonb_typeof(m) <> 'object'
      or jsonb_typeof(m -> 'id') <> 'string'
      or char_length(m ->> 'id') > 64
      or jsonb_typeof(m -> 'at') <> 'number'
      or (m ->> 'kind') not in ('room', 'circuit', 'drag', 'ranked')
      or octet_length(m::text) > 8000;
    insert into public.matches (user_id, match_id, played_at, data)
    values (uid, m ->> 'id', to_timestamp((m ->> 'at')::double precision / 1000), m)
    on conflict (user_id, match_id) do nothing;
    get diagnostics n = row_count;
    added := added + n;
  end loop;
  return added;
end;
$$;

revoke all on function public.ranked_delta(integer, integer, boolean) from public, anon, authenticated;
revoke all on function public.report_ranked(text, text, boolean, integer, integer) from public, anon;
revoke all on function public.get_my_ranked() from public, anon;
revoke all on function public.get_ranked_board(text, integer) from public;
grant execute on function public.report_ranked(text, text, boolean, integer, integer) to authenticated;
grant execute on function public.get_my_ranked() to authenticated;
grant execute on function public.get_ranked_board(text, integer) to anon, authenticated;
