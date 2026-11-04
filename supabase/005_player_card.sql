-- =====================================================================
-- 揍灰來尬掐 · player cards (run after 001–004)
--
-- Supabase → SQL Editor → New query → paste → Run.
-- Only ADDS a function; safe to run again.
--
-- A quick look at an opponent from the results screen: their ranked tier in
-- each group. Only what the public ranked board already shows; their match
-- history stays visible to friends only (get_friend_matches).
-- =====================================================================

create or replace function public.get_player_card(p_nickname text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'nickname', p.nickname,
    'ranked', coalesce((
      select jsonb_agg(jsonb_build_object(
        'grp', r.grp, 'points', r.points, 'games', r.games, 'wins', r.wins, 'best', r.best
      ))
      from public.ranked r where r.user_id = p.id
    ), '[]'::jsonb)
  )
  from public.profiles p
  where lower(p.nickname) = lower(btrim(coalesce(p_nickname, '')))
  limit 1;
$$;

revoke all on function public.get_player_card(text) from public;
grant execute on function public.get_player_card(text) to anon, authenticated;
