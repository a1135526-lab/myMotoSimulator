import {
  useFriendsStore,
  useRaceStore,
  useRoomStore,
  useUiStore,
  type RoomProfile,
} from '@/application';

/**
 * Invite a friend to race: into the room you're in, or a new one made for
 * the purpose. Resolves with what happened, in words.
 */
export async function inviteToRace(
  friendId: string,
  profile: RoomProfile,
): Promise<{ ok: boolean; message: string }> {
  if (useRoomStore.getState().status === 'idle') {
    useRaceStore.getState().setDiscipline('room');
    useUiStore.getState().setMode('race');
    await useRoomStore.getState().create(profile, useRoomStore.getState().settings);
  }
  const { code, status, error } = useRoomStore.getState();
  if (!code || status === 'idle') return { ok: false, message: error ?? '開房間失敗' };
  const sent = await useFriendsStore.getState().invite(friendId, code);
  return sent
    ? { ok: true, message: `已邀請，房號 ${code}` }
    : { ok: false, message: '邀請沒有送出，請檢查網路' };
}

/** Accept an invite: off to the friend's room. */
export async function joinInvite(code: string, profile: RoomProfile): Promise<void> {
  if (useRoomStore.getState().status !== 'idle') useRoomStore.getState().leave();
  useRaceStore.getState().setDiscipline('room');
  useUiStore.getState().setMode('race');
  await useRoomStore.getState().join(code, profile);
}
