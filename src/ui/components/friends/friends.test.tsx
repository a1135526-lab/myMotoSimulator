import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useAuthStore, useFriendsStore } from '@/application';
import { AddFriendButton } from '../../race/room/RoomFriends';
import { FriendsDialog } from './FriendsDialog';

const authStart = useAuthStore.getState();
const friendsStart = useFriendsStore.getState();
const signedIn = () =>
  useAuthStore.setState({ status: 'signedIn', profile: 'ready', nickname: '阿明', userId: 'me' });

describe('friends', () => {
  afterEach(() => {
    useAuthStore.setState(authStart, true);
    useFriendsStore.setState(friendsStart, true);
  });

  it('signed out: the dialog explains and offers Google sign-in', () => {
    useAuthStore.setState({ status: 'signedOut' });
    render(<FriendsDialog onClose={() => undefined} />);
    expect(screen.getByTestId('friends-dialog')).toHaveTextContent('登入');
    expect(screen.queryByTestId('friend-name')).toBeNull();
  });

  it('signed in: requests, friends with online dots, and pending ones', () => {
    signedIn();
    useFriendsStore.setState({
      friends: [
        { id: 'a', nickname: '小華', state: 'friend' },
        { id: 'b', nickname: '阿強', state: 'friend' },
        { id: 'c', nickname: '路人', state: 'incoming' },
        { id: 'd', nickname: '新朋友', state: 'outgoing' },
      ],
      online: new Set(['a']),
      // Keep refresh from talking to a server.
      refresh: async () => undefined,
    });
    render(<FriendsDialog onClose={() => undefined} />);
    const dialog = screen.getByTestId('friends-dialog');
    expect(dialog).toHaveTextContent('好友邀請');
    expect(dialog).toHaveTextContent('好友（2）');
    expect(dialog).toHaveTextContent('等對方接受');
    const invites = screen.getAllByRole('button', { name: '邀請比賽' });
    expect(invites[0]).toBeEnabled(); // 小華 is online
    expect(invites[1]).toBeDisabled(); // 阿強 isn't
  });

  it('in a room, +friend only for signed-in players who are not friends yet', () => {
    signedIn();
    useFriendsStore.setState({ friends: [{ id: 'a', nickname: '小華', state: 'friend' }] });
    const player = (accountName?: string) => ({
      id: 'p',
      name: 'x',
      bike: 'X',
      manual: false,
      cylinders: 1,
      joinedAt: 0,
      ...(accountName && { accountName }),
    });
    const { rerender } = render(<AddFriendButton player={player()} />);
    expect(screen.queryByTestId('room-add-friend')).toBeNull();
    rerender(<AddFriendButton player={player('小華')} />);
    expect(screen.getByText('好友')).toBeInTheDocument();
    rerender(<AddFriendButton player={player('阿強')} />);
    expect(screen.getByTestId('room-add-friend')).toBeInTheDocument();
  });
});
