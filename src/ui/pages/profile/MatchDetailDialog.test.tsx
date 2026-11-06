import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useAuthStore, useFriendsStore, type MatchRecord } from '@/application';
import { RecentMatches } from './ProfileTables';

const authStart = useAuthStore.getState();
const friendsStart = useFriendsStore.getState();

const room: MatchRecord = {
  id: 'm1',
  at: Date.UTC(2026, 10, 1, 12, 0),
  kind: 'room',
  trackId: 'practice-park',
  trackName: '練習場',
  laps: 2,
  bike: 'SYM JET SL 125',
  manual: false,
  position: 2,
  field: 3,
  won: false,
  dnf: false,
  timeS: 121.5,
  bestLapS: 60.2,
  riders: [
    { name: '小華', bike: 'Yamaha NMAX', position: 1, timeS: 120, isMe: false, accountName: 'hua' },
    { name: '你', bike: 'SYM JET SL 125', position: 2, timeS: 121.5, isMe: true },
    { name: '阿強', bike: 'Kymco KRV', position: 3, timeS: 125, isMe: false },
  ],
};

describe('match history', () => {
  afterEach(() => {
    useAuthStore.setState(authStart, true);
    useFriendsStore.setState(friendsStart, true);
  });

  it('opens a race: its facts, the full order, and +friend for signed-in opponents', () => {
    useAuthStore.setState({ status: 'signedIn', profile: 'ready', nickname: '阿明', userId: 'me' });
    useFriendsStore.setState({ friends: [] });
    render(<RecentMatches matches={[room]} />);
    fireEvent.click(screen.getByTestId('profile-match'));
    const detail = screen.getByTestId('match-detail');
    expect(detail).toHaveTextContent('第 2 名 · 練習場');
    expect(detail).toHaveTextContent('好友對戰');
    expect(detail).toHaveTextContent('最快圈');
    expect(detail).toHaveTextContent('Yamaha NMAX');
    // Only 小華 was signed in, so only 小華 can be added.
    expect(screen.getAllByTestId('match-add-friend')).toHaveLength(1);
    expect(screen.getAllByTestId('match-view-player')).toHaveLength(2);
    fireEvent.click(screen.getByLabelText('關閉'));
    expect(screen.queryByTestId('match-detail')).toBeNull();
  });

  it('races against the AI list the AI bikes, with nobody to add', () => {
    render(
      <RecentMatches
        matches={[
          {
            ...room,
            kind: 'circuit',
            riders: room.riders.map((r) => ({ ...r, accountName: undefined })),
          },
        ]}
      />,
    );
    fireEvent.click(screen.getByTestId('profile-match'));
    expect(screen.getByTestId('match-detail')).toHaveTextContent('電腦');
    expect(screen.queryByTestId('match-view-player')).toBeNull();
  });
});
