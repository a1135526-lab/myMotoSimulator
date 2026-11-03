import type { RankedGroup } from '@/domain';
import type { Outcome } from '../leaderboard';
import { errorText, supabase } from '../supabase';

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
