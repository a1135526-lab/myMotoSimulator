-- =====================================================================
-- 機車模擬器 · global leaderboards (Supabase / Postgres)
--
-- Run once in Supabase → SQL Editor → New query → paste → Run.
-- Safe to run again: it drops and recreates only what it owns.
--
-- Security model
--   * Every table has row level security on and NO policies, so nothing
--     can be read or written through the Data API directly.
--   * Players only go through the functions below. Reads are open to
--     everyone; writes need a signed-in (Google) player with a nickname,
--     and every score is checked against the game's physics first.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Clean slate (only our own objects)
-- ---------------------------------------------------------------------
drop function if exists public.set_nickname(text);
drop function if exists public.get_my_profile();
drop function if exists public.submit_lap(text, boolean, integer, text, boolean, jsonb);
drop function if exists public.submit_drag(text, integer, real, text, boolean);
drop function if exists public.submit_mission(text, integer, integer, text);
drop function if exists public.get_lap_board(text, boolean, integer);
drop function if exists public.get_lap_ghost(text, boolean, text);
drop function if exists public.get_drag_board(text, integer);
drop function if exists public.get_mission_board(text, integer);
drop function if exists public.app_check_rate();
drop function if exists public.app_clean_bike(text);
drop table if exists public.lap_times;
drop table if exists public.drag_times;
drop table if exists public.mission_times;
drop table if exists public.profiles;
drop table if exists public.blocked_words;
drop table if exists public.circuits;
drop table if exists public.drag_tracks;
drop table if exists public.missions;

-- ---------------------------------------------------------------------
-- Rules: what each board allows. Minimum times are well beyond what any
-- bike in the game can do, so only made-up times are refused.
-- ---------------------------------------------------------------------
create table public.circuits (
  id text primary key,
  length_m integer not null,
  min_lap_ms integer not null
);
-- Minimum lap: the whole lap at 90 m/s (324 km/h) average.
insert into public.circuits (id, length_m, min_lap_ms) values
  ('practice-park', 1275, 1275 * 1000 / 90),
  ('hill-town', 2172, 2172 * 1000 / 90),
  ('south-bay', 3446, 3446 * 1000 / 90),
  -- 006_more_circuits.sql adds these to a live database.
  ('harbor-night', 2172, 2172 * 1000 / 90),
  ('sugar-mill', 1555, 1555 * 1000 / 90),
  ('lotus-lake', 1919, 1919 * 1000 / 90),
  ('cloud-peak', 1506, 1506 * 1000 / 90),
  ('gorge-run', 1695, 1695 * 1000 / 90),
  ('cape-coast', 3635, 3635 * 1000 / 90),
  ('lake-ridge', 1615, 1615 * 1000 / 90),
  ('kart-oval', 1012, 1012 * 1000 / 90),
  ('neon-streets', 1675, 1675 * 1000 / 90),
  ('rift-valley', 3642, 3642 * 1000 / 90),
  -- 007_hill_circuits.sql adds these to a live database.
  ('dragon-ridge', 2727, 2727 * 1000 / 90),
  ('roller-hills', 2455, 2455 * 1000 / 90),
  ('cliff-coast', 2308, 2308 * 1000 / 90),
  ('midnight-pass', 1661, 1661 * 1000 / 90);

create table public.drag_tracks (
  id text primary key,
  distance_m integer not null,
  min_et_ms integer not null
);
insert into public.drag_tracks (id, distance_m, min_et_ms) values
  ('coastal-night', 201, 5000),
  ('central-speedway', 402, 8000),
  ('wet-strip', 402, 8000),
  ('mountain-climb', 1000, 16000);

create table public.missions (
  id text primary key,
  route_m integer not null,
  limit_s integer not null,
  min_ms integer not null
);
-- Limit = route ÷ 8.3 m/s + 15 s (as in the game); minimum = route at 45 m/s.
insert into public.missions (id, route_m, limit_s, min_ms) values
  ('district-office', 273, 48, 273 * 1000 / 45),
  ('hospital-run', 701, 100, 701 * 1000 / 45),
  ('fill-up', 1032, 140, 1032 * 1000 / 45),
  ('school-pickup', 1062, 143, 1062 * 1000 / 45),
  ('campus', 2953, 371, 2953 * 1000 / 45),
  ('night-market', 3365, 421, 3365 * 1000 / 45),
  ('high-school', 5246, 647, 5246 * 1000 / 45),
  ('forest-park', 5492, 677, 5492 * 1000 / 45),
  ('youchang-school', 6163, 758, 6163 * 1000 / 45);

-- Words a nickname may not contain (lower case).
create table public.blocked_words (word text primary key);
insert into public.blocked_words (word) values
  ('fuck'), ('shit'), ('bitch'), ('cunt'), ('nigger'), ('nigga'), ('asshole'),
  ('admin'), ('moderator'), ('官方'), ('管理員'),
  ('幹你'), ('幹妳'), ('靠北'), ('靠杯'), ('機掰'), ('雞掰'), ('垃圾'), ('白痴'), ('白癡'),
  ('智障'), ('去死'), ('三小'), ('他媽'), ('你媽'), ('婊'), ('屌'), ('賤');

-- ---------------------------------------------------------------------
-- Players and scores (best per player per board)
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null,
  last_submit_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index profiles_nickname_key on public.profiles (lower(nickname));

create table public.lap_times (
  user_id uuid not null references public.profiles (id) on delete cascade,
  circuit_id text not null references public.circuits (id),
  assisted boolean not null,
  lap_ms integer not null,
  bike text not null,
  manual boolean not null,
  -- Ghost: [t, x, z, heading, lean, …] every 0.2 s, for others to race.
  ghost jsonb not null,
  set_at timestamptz not null default now(),
  primary key (user_id, circuit_id, assisted)
);
create index lap_times_board on public.lap_times (circuit_id, assisted, lap_ms);

create table public.drag_times (
  user_id uuid not null references public.profiles (id) on delete cascade,
  track_id text not null references public.drag_tracks (id),
  et_ms integer not null,
  trap_kmh real not null,
  bike text not null,
  manual boolean not null,
  set_at timestamptz not null default now(),
  primary key (user_id, track_id)
);
create index drag_times_board on public.drag_times (track_id, et_ms);

create table public.mission_times (
  user_id uuid not null references public.profiles (id) on delete cascade,
  mission_id text not null references public.missions (id),
  time_ms integer not null,
  stars smallint not null,
  crashes smallint not null,
  bike text not null,
  set_at timestamptz not null default now(),
  primary key (user_id, mission_id)
);
create index mission_times_board on public.mission_times (mission_id, time_ms);

-- Locked down: no direct access at all, only through the functions.
alter table public.circuits enable row level security;
alter table public.drag_tracks enable row level security;
alter table public.missions enable row level security;
alter table public.blocked_words enable row level security;
alter table public.profiles enable row level security;
alter table public.lap_times enable row level security;
alter table public.drag_times enable row level security;
alter table public.mission_times enable row level security;
revoke all on all tables in schema public from anon, authenticated;

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------

-- Signed in, has a nickname, and hasn't submitted in the last 2 seconds.
create function public.app_check_rate()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  last timestamptz;
begin
  if uid is null then
    raise exception 'not_signed_in';
  end if;
  select p.last_submit_at into last from public.profiles p where p.id = uid;
  if not found then
    raise exception 'no_nickname';
  end if;
  if last is not null and last > now() - interval '2 seconds' then
    raise exception 'too_fast';
  end if;
  update public.profiles set last_submit_at = now() where id = uid;
  return uid;
end;
$$;

-- Bike names are free text from the client: trim and cap them.
create function public.app_clean_bike(p_bike text)
returns text
language sql
immutable
set search_path = ''
as $$
  select left(btrim(coalesce(p_bike, '')), 60);
$$;

-- ---------------------------------------------------------------------
-- Profile
-- ---------------------------------------------------------------------
create function public.get_my_profile()
returns table (nickname text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.nickname from public.profiles p where p.id = auth.uid();
$$;

create function public.set_nickname(p_nickname text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  name text := btrim(regexp_replace(coalesce(p_nickname, ''), '\s+', ' ', 'g'));
begin
  if uid is null then
    raise exception 'not_signed_in';
  end if;
  if char_length(name) < 2 or char_length(name) > 16 then
    raise exception 'nickname_length';
  end if;
  -- Letters (any script), digits, space, _ and -.
  if name !~ '^[[:alnum:]_ \-]+$' then
    raise exception 'nickname_chars';
  end if;
  if exists (
    select 1 from public.blocked_words b
    where position(b.word in lower(replace(name, ' ', ''))) > 0
  ) then
    raise exception 'nickname_blocked';
  end if;
  begin
    insert into public.profiles (id, nickname) values (uid, name)
    on conflict (id) do update set nickname = excluded.nickname;
  exception when unique_violation then
    raise exception 'nickname_taken';
  end;
  return name;
end;
$$;

-- ---------------------------------------------------------------------
-- Submitting scores. Each keeps the player's best only and returns
-- { "rank": n, "improved": bool } for that board.
-- ---------------------------------------------------------------------
create function public.submit_lap(
  p_circuit text,
  p_assisted boolean,
  p_lap_ms integer,
  p_bike text,
  p_manual boolean,
  p_ghost jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.app_check_rate();
  rule public.circuits;
  n integer;
  samples integer;
  expected numeric;
  i integer;
  t0 numeric; x0 numeric; z0 numeric;
  t1 numeric; x1 numeric; z1 numeric;
  improved boolean;
  best integer;
  board_rank integer;
begin
  select * into rule from public.circuits c where c.id = p_circuit;
  if not found then
    raise exception 'unknown_circuit';
  end if;
  if p_lap_ms is null or p_lap_ms < rule.min_lap_ms or p_lap_ms > 30 * 60 * 1000 then
    raise exception 'implausible_time';
  end if;

  -- The ghost must be a believable ride of this lap: one sample per 0.2 s,
  -- time running forward, never faster than 400 km/h between samples,
  -- ending at the lap time.
  if jsonb_typeof(p_ghost) <> 'array' then
    raise exception 'bad_ghost';
  end if;
  n := jsonb_array_length(p_ghost);
  if n % 5 <> 0 or n > 5 * 20000 then
    raise exception 'bad_ghost';
  end if;
  samples := n / 5;
  expected := p_lap_ms / 200.0;
  if samples < expected * 0.85 or samples > expected * 1.15 + 5 then
    raise exception 'bad_ghost';
  end if;
  t0 := (p_ghost ->> 0)::numeric;
  x0 := (p_ghost ->> 1)::numeric;
  z0 := (p_ghost ->> 2)::numeric;
  for i in 1 .. samples - 1 loop
    t1 := (p_ghost ->> (i * 5))::numeric;
    x1 := (p_ghost ->> (i * 5 + 1))::numeric;
    z1 := (p_ghost ->> (i * 5 + 2))::numeric;
    if t1 is null or x1 is null or z1 is null or t1 <= t0 then
      raise exception 'bad_ghost';
    end if;
    if sqrt((x1 - x0) ^ 2 + (z1 - z0) ^ 2) / (t1 - t0) > 112 then
      raise exception 'bad_ghost';
    end if;
    t0 := t1; x0 := x1; z0 := z1;
  end loop;
  if abs(t0 * 1000 - p_lap_ms) > 500 then
    raise exception 'bad_ghost';
  end if;

  insert into public.lap_times (user_id, circuit_id, assisted, lap_ms, bike, manual, ghost)
  values (uid, p_circuit, p_assisted, p_lap_ms, public.app_clean_bike(p_bike), p_manual, p_ghost)
  on conflict (user_id, circuit_id, assisted) do update
    set lap_ms = excluded.lap_ms,
        bike = excluded.bike,
        manual = excluded.manual,
        ghost = excluded.ghost,
        set_at = now()
    where excluded.lap_ms < public.lap_times.lap_ms;
  get diagnostics i = row_count;
  improved := i > 0;

  select l.lap_ms into best from public.lap_times l
  where l.user_id = uid and l.circuit_id = p_circuit and l.assisted = p_assisted;
  select count(*) + 1 into board_rank from public.lap_times l
  where l.circuit_id = p_circuit and l.assisted = p_assisted and l.lap_ms < best;
  return jsonb_build_object('rank', board_rank, 'improved', improved);
end;
$$;

create function public.submit_drag(
  p_track text,
  p_et_ms integer,
  p_trap_kmh real,
  p_bike text,
  p_manual boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.app_check_rate();
  rule public.drag_tracks;
  avg_kmh numeric;
  i integer;
  best integer;
  board_rank integer;
begin
  select * into rule from public.drag_tracks d where d.id = p_track;
  if not found then
    raise exception 'unknown_track';
  end if;
  if p_et_ms is null or p_et_ms < rule.min_et_ms or p_et_ms > 10 * 60 * 1000 then
    raise exception 'implausible_time';
  end if;
  -- From a standstill the bike crosses the line faster than its average.
  avg_kmh := rule.distance_m / (p_et_ms / 1000.0) * 3.6;
  if p_trap_kmh is null or p_trap_kmh > 450 or p_trap_kmh < avg_kmh * 0.95 then
    raise exception 'implausible_time';
  end if;

  insert into public.drag_times (user_id, track_id, et_ms, trap_kmh, bike, manual)
  values (uid, p_track, p_et_ms, p_trap_kmh, public.app_clean_bike(p_bike), p_manual)
  on conflict (user_id, track_id) do update
    set et_ms = excluded.et_ms,
        trap_kmh = excluded.trap_kmh,
        bike = excluded.bike,
        manual = excluded.manual,
        set_at = now()
    where excluded.et_ms < public.drag_times.et_ms;
  get diagnostics i = row_count;

  select d.et_ms into best from public.drag_times d
  where d.user_id = uid and d.track_id = p_track;
  select count(*) + 1 into board_rank from public.drag_times d
  where d.track_id = p_track and d.et_ms < best;
  return jsonb_build_object('rank', board_rank, 'improved', i > 0);
end;
$$;

create function public.submit_mission(
  p_mission text,
  p_time_ms integer,
  p_crashes integer,
  p_bike text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := public.app_check_rate();
  rule public.missions;
  stars smallint;
  i integer;
  best integer;
  board_rank integer;
begin
  select * into rule from public.missions m where m.id = p_mission;
  if not found then
    raise exception 'unknown_mission';
  end if;
  if p_time_ms is null or p_time_ms < rule.min_ms or p_time_ms > 60 * 60 * 1000 then
    raise exception 'implausible_time';
  end if;
  if p_crashes is null or p_crashes < 0 or p_crashes > 999 then
    raise exception 'implausible_time';
  end if;
  -- Stars are worked out here, never taken from the client.
  stars := case
    when p_time_ms <= rule.limit_s * 700 then 3
    when p_time_ms <= rule.limit_s * 850 then 2
    when p_time_ms <= rule.limit_s * 1000 then 1
    else 0
  end;

  insert into public.mission_times (user_id, mission_id, time_ms, stars, crashes, bike)
  values (uid, p_mission, p_time_ms, stars, p_crashes, public.app_clean_bike(p_bike))
  on conflict (user_id, mission_id) do update
    set time_ms = excluded.time_ms,
        stars = excluded.stars,
        crashes = excluded.crashes,
        bike = excluded.bike,
        set_at = now()
    where excluded.time_ms < public.mission_times.time_ms;
  get diagnostics i = row_count;

  select m.time_ms into best from public.mission_times m
  where m.user_id = uid and m.mission_id = p_mission;
  select count(*) + 1 into board_rank from public.mission_times m
  where m.mission_id = p_mission and m.time_ms < best;
  return jsonb_build_object('rank', board_rank, 'improved', i > 0);
end;
$$;

-- ---------------------------------------------------------------------
-- Reading the boards: the top p_limit, plus your own row if you're
-- further down. No ids or e-mails leave the database, only nicknames.
-- ---------------------------------------------------------------------
create function public.get_lap_board(p_circuit text, p_assisted boolean, p_limit integer default 50)
returns table (
  rank bigint,
  nickname text,
  lap_ms integer,
  bike text,
  manual boolean,
  set_at timestamptz,
  is_me boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with ranked as (
    select rank() over (order by l.lap_ms, l.set_at) as rank,
           p.nickname, l.lap_ms, l.bike, l.manual, l.set_at,
           l.user_id = auth.uid() as is_me
    from public.lap_times l
    join public.profiles p on p.id = l.user_id
    where l.circuit_id = p_circuit and l.assisted = p_assisted
  )
  select * from ranked
  where ranked.rank <= least(greatest(coalesce(p_limit, 50), 1), 100) or ranked.is_me
  order by ranked.rank;
$$;

create function public.get_lap_ghost(p_circuit text, p_assisted boolean, p_nickname text)
returns table (lap_ms integer, bike text, manual boolean, ghost jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select l.lap_ms, l.bike, l.manual, l.ghost
  from public.lap_times l
  join public.profiles p on p.id = l.user_id
  where l.circuit_id = p_circuit and l.assisted = p_assisted
    and lower(p.nickname) = lower(p_nickname);
$$;

create function public.get_drag_board(p_track text, p_limit integer default 50)
returns table (
  rank bigint,
  nickname text,
  et_ms integer,
  trap_kmh real,
  bike text,
  manual boolean,
  set_at timestamptz,
  is_me boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with ranked as (
    select rank() over (order by d.et_ms, d.set_at) as rank,
           p.nickname, d.et_ms, d.trap_kmh, d.bike, d.manual, d.set_at,
           d.user_id = auth.uid() as is_me
    from public.drag_times d
    join public.profiles p on p.id = d.user_id
    where d.track_id = p_track
  )
  select * from ranked
  where ranked.rank <= least(greatest(coalesce(p_limit, 50), 1), 100) or ranked.is_me
  order by ranked.rank;
$$;

create function public.get_mission_board(p_mission text, p_limit integer default 50)
returns table (
  rank bigint,
  nickname text,
  time_ms integer,
  stars smallint,
  crashes smallint,
  bike text,
  set_at timestamptz,
  is_me boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with ranked as (
    select rank() over (order by m.time_ms, m.set_at) as rank,
           p.nickname, m.time_ms, m.stars, m.crashes, m.bike, m.set_at,
           m.user_id = auth.uid() as is_me
    from public.mission_times m
    join public.profiles p on p.id = m.user_id
    where m.mission_id = p_mission
  )
  select * from ranked
  where ranked.rank <= least(greatest(coalesce(p_limit, 50), 1), 100) or ranked.is_me
  order by ranked.rank;
$$;

-- ---------------------------------------------------------------------
-- Who may call what. Postgres lets everyone run new functions by
-- default; take that away, then hand out exactly what's needed.
-- ---------------------------------------------------------------------
revoke all on function public.app_check_rate() from public, anon, authenticated;
revoke all on function public.app_clean_bike(text) from public, anon, authenticated;
revoke all on function public.get_my_profile() from public, anon;
revoke all on function public.set_nickname(text) from public, anon;
revoke all on function public.submit_lap(text, boolean, integer, text, boolean, jsonb) from public, anon;
revoke all on function public.submit_drag(text, integer, real, text, boolean) from public, anon;
revoke all on function public.submit_mission(text, integer, integer, text) from public, anon;
revoke all on function public.get_lap_board(text, boolean, integer) from public;
revoke all on function public.get_lap_ghost(text, boolean, text) from public;
revoke all on function public.get_drag_board(text, integer) from public;
revoke all on function public.get_mission_board(text, integer) from public;

grant execute on function public.get_my_profile() to authenticated;
grant execute on function public.set_nickname(text) to authenticated;
grant execute on function public.submit_lap(text, boolean, integer, text, boolean, jsonb) to authenticated;
grant execute on function public.submit_drag(text, integer, real, text, boolean) to authenticated;
grant execute on function public.submit_mission(text, integer, integer, text) to authenticated;
grant execute on function public.get_lap_board(text, boolean, integer) to anon, authenticated;
grant execute on function public.get_lap_ghost(text, boolean, text) to anon, authenticated;
grant execute on function public.get_drag_board(text, integer) to anon, authenticated;
grant execute on function public.get_mission_board(text, integer) to anon, authenticated;
