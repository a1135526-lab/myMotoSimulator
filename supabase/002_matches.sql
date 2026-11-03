-- =====================================================================
-- 機車模擬器 · match history (run after schema.sql)
--
-- Supabase → SQL Editor → New query → paste → Run.
-- Only ADDS things: the leaderboards and their scores are not touched,
-- and running it again changes nothing that's already there.
--
-- Each signed-in player keeps their own race history here so it follows
-- them between devices. It's only ever read back by its owner.
-- =====================================================================

create table if not exists public.matches (
  user_id uuid not null references auth.users (id) on delete cascade,
  -- The game's own id for the race, so one race is never stored twice.
  match_id text not null,
  played_at timestamptz not null,
  data jsonb not null,
  primary key (user_id, match_id)
);
create index if not exists matches_by_time on public.matches (user_id, played_at desc);

-- Locked down like every other table: only the functions below get in.
alter table public.matches enable row level security;
revoke all on public.matches from anon, authenticated;

-- Add up to 100 races at once (new ones, or a device catching up).
-- Returns how many were new.
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
    -- Skip anything that isn't a sensible, small race record.
    continue when jsonb_typeof(m) <> 'object'
      or jsonb_typeof(m -> 'id') <> 'string'
      or char_length(m ->> 'id') > 64
      or jsonb_typeof(m -> 'at') <> 'number'
      or (m ->> 'kind') not in ('room', 'circuit', 'drag')
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

-- Your own races, newest first.
create or replace function public.get_my_matches(p_limit integer default 1000)
returns setof jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select m.data from public.matches m
  where m.user_id = auth.uid()
  order by m.played_at desc
  limit least(greatest(coalesce(p_limit, 1000), 1), 2000);
$$;

revoke all on function public.add_matches(jsonb) from public, anon;
revoke all on function public.get_my_matches(integer) from public, anon;
grant execute on function public.add_matches(jsonb) to authenticated;
grant execute on function public.get_my_matches(integer) to authenticated;
