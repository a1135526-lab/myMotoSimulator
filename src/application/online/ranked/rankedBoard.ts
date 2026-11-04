import type { RankedGroup } from '@/domain';
import type { Outcome } from '../leaderboard';
import { errorText, supabase } from '../supabase';
import type { RankedRecord } from './rankedTypes';

export interface RankedBoardRow {
  readonly rank: number;
  readonly nickname: string;
  readonly points: number;
  readonly games: number;
  readonly wins: number;
  readonly isMe: boolean;
}

/** The top of a group's ladder, plus your own row. */
export async function fetchRankedBoard(group: RankedGroup): Promise<Outcome<RankedBoardRow[]>> {
  if (!supabase) return { ok: false, error: '這個版本沒有連線功能' };
  const { data, error } = await supabase.rpc('get_ranked_board', { p_group: group, p_limit: 50 });
  if (error) return { ok: false, error: errorText(error) };
  const rows =
    (data as {
      rank: number;
      nickname: string;
      points: number;
      games: number;
      wins: number;
      is_me: boolean;
    }[]) ?? [];
  return {
    ok: true,
    value: rows.map((r) => ({
      rank: Number(r.rank),
      nickname: r.nickname,
      points: r.points,
      games: r.games,
      wins: r.wins,
      isMe: r.is_me,
    })),
  };
}

export interface PlayerCard {
  readonly nickname: string;
  readonly ranked: Partial<Record<RankedGroup, RankedRecord>>;
}

const isGroup = (g: unknown): g is RankedGroup => g === 'scooter' || g === 'manual';
const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/** Someone's ranked tiers, by nickname (what the public board shows); null if unknown. */
export async function fetchPlayerCard(nickname: string): Promise<Outcome<PlayerCard | null>> {
  if (!supabase) return { ok: false, error: '這個版本沒有連線功能' };
  const { data, error } = await supabase.rpc('get_player_card', { p_nickname: nickname });
  if (error) return { ok: false, error: errorText(error) };
  const raw = data as { nickname?: unknown; ranked?: unknown } | null;
  if (!raw || typeof raw.nickname !== 'string') return { ok: true, value: null };
  const ranked: Partial<Record<RankedGroup, RankedRecord>> = {};
  for (const r of Array.isArray(raw.ranked) ? (raw.ranked as Record<string, unknown>[]) : []) {
    if (!isGroup(r.grp)) continue;
    ranked[r.grp] = { points: n(r.points), games: n(r.games), wins: n(r.wins), best: n(r.best) };
  }
  return { ok: true, value: { nickname: raw.nickname, ranked } };
}
