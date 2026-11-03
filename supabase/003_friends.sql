-- =====================================================================
-- 機車模擬器 · friends (run after schema.sql and 002_matches.sql)
--
-- Supabase → SQL Editor → New query → paste → Run.
-- Only ADDS things; safe to run again.
--
-- Friends are signed-in players with a nickname. Adding someone sends a
-- request; it becomes a friendship once they accept (or if they had already
-- asked you). Friends can see each other's race history.
-- =====================================================================

create table if not exists public.friendships (
  requester uuid not null references public.profiles (id) on delete cascade,
  addressee uuid not null references public.profiles (id) on delete cascade,
  status text not null check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (requester, addressee),
  check (requester <> addressee)
);
-- One row per pair, whichever way round it was asked.
create unique index if not exists friendships_pair
  on public.friendships (least(requester, addressee), greatest(requester, addressee));
create index if not exists friendships_addressee on public.friendships (addressee);

alter table public.friendships enable row level security;
revoke all on public.friendships from anon, authenticated;

-- Ask someone by nickname. Returns 'requested', 'accepted' (they had asked
-- you, so you're friends now), 'pending' (you already asked) or 'already'.
create or replace function public.send_friend_request(p_nickname text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  target uuid;
  existing public.friendships;
begin
  if uid is null then
    raise exception 'not_signed_in';
  end if;
  if not exists (select 1 from public.profiles where id = uid) then
    raise exception 'no_nickname';
  end if;
  select p.id into target from public.profiles p
  where lower(p.nickname) = lower(btrim(coalesce(p_nickname, '')));
  if target is null then
    raise exception 'friend_not_found';
  end if;
  if target = uid then
    raise exception 'friend_self';
  end if;
  select * into existing from public.friendships f
  where (f.requester = uid and f.addressee = target)
     or (f.requester = target and f.addressee = uid);
  if found then
    if existing.status = 'accepted' then
      return 'already';
    end if;
    if existing.requester = target then
      update public.friendships set status = 'accepted'
      where requester = target and addressee = uid;
      return 'accepted';
    end if;
    return 'pending';
  end if;
  if (select count(*) from public.friendships f where f.requester = uid or f.addressee = uid) >= 200 then
    raise exception 'too_many_friends';
  end if;
  insert into public.friendships (requester, addressee, status) values (uid, target, 'pending');
  return 'requested';
end;
$$;

-- Accept or turn down someone's request.
create or replace function public.respond_friend_request(p_from uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not_signed_in';
  end if;
  if p_accept then
    update public.friendships set status = 'accepted'
    where requester = p_from and addressee = uid and status = 'pending';
  else
    delete from public.friendships
    where requester = p_from and addressee = uid and status = 'pending';
  end if;
end;
$$;

-- Unfriend, or take back a request you sent.
create or replace function public.remove_friend(p_friend uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not_signed_in';
  end if;
  delete from public.friendships
  where (requester = uid and addressee = p_friend) or (requester = p_friend and addressee = uid);
end;
$$;

-- Your friends and requests. state: 'friend', 'incoming' (they asked you),
-- 'outgoing' (you asked them).
create or replace function public.get_friends()
returns table (id uuid, nickname text, state text, since timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.nickname,
         case when f.status = 'accepted' then 'friend'
              when f.addressee = auth.uid() then 'incoming'
              else 'outgoing' end,
         f.created_at
  from public.friendships f
  join public.profiles p
    on p.id = case when f.requester = auth.uid() then f.addressee else f.requester end
  where f.requester = auth.uid() or f.addressee = auth.uid()
  order by p.nickname;
$$;

-- A friend's race history (newest first); nothing for anyone else.
create or replace function public.get_friend_matches(p_friend uuid, p_limit integer default 500)
returns setof jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester = auth.uid() and f.addressee = p_friend)
        or (f.requester = p_friend and f.addressee = auth.uid()))
  ) then
    raise exception 'not_friends';
  end if;
  return query
    select m.data from public.matches m
    where m.user_id = p_friend
    order by m.played_at desc
    limit least(greatest(coalesce(p_limit, 500), 1), 1000);
end;
$$;

revoke all on function public.send_friend_request(text) from public, anon;
revoke all on function public.respond_friend_request(uuid, boolean) from public, anon;
revoke all on function public.remove_friend(uuid) from public, anon;
revoke all on function public.get_friends() from public, anon;
revoke all on function public.get_friend_matches(uuid, integer) from public, anon;
grant execute on function public.send_friend_request(text) to authenticated;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
grant execute on function public.get_friends() to authenticated;
grant execute on function public.get_friend_matches(uuid, integer) to authenticated;
