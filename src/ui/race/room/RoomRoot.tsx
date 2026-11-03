import { useEffect, useMemo } from 'react';
import {
  CircuitProvider,
  useAuthStore,
  useCurrentBike,
  useRaceStore,
  useRoomStore,
} from '@/application';
import { HomeButton } from '../../components/common/HomeButton';
import { MusicToggle } from '../../components/common/MusicToggle';
import { LobbyMusicPlayer } from '../../audio/LobbyMusicPlayer';
import { ArtBackdrop } from '../../components/common/ArtBackdrop';
import { AppLayout } from '../../layouts/AppLayout';
import { CircuitPage } from '../circuit/CircuitPage';
import { RoomEntry } from './RoomEntry';
import { RoomLobby } from './RoomLobby';

/** Friend rooms: entry (make / join), the lobby, then the race itself. */
export function RoomRoot() {
  const status = useRoomStore((s) => s.status);
  const me = useRoomStore((s) => s.me);
  const updateProfile = useRoomStore((s) => s.updateProfile);
  const bike = useCurrentBike();
  const nickname = useAuthStore((s) => s.nickname);
  const profile = useMemo(
    () => ({
      bike: `${bike.brand} ${bike.model}`,
      manual: bike.kind === 'manual',
      cylinders: bike.engine.cylinders,
      // Signed in: others in the room can add you as a friend by it.
      ...(nickname && { accountName: nickname }),
    }),
    [bike, nickname],
  );

  // A new bike in the lobby: let the others see it.
  useEffect(() => {
    if (me && me.bike !== profile.bike) updateProfile({ ...profile, name: me.name });
  }, [me, profile, updateProfile]);

  const back = () => {
    useRoomStore.getState().leave();
    const race = useRaceStore.getState();
    race.setDiscipline('circuit');
    race.setStep('mode');
  };

  if (status === 'racing') {
    return (
      <CircuitProvider>
        <CircuitPage room />
      </CircuitProvider>
    );
  }
  return (
    <AppLayout
      toolbar={
        <>
          <HomeButton />
          <MusicToggle />
        </>
      }
    >
      <LobbyMusicPlayer />
      <ArtBackdrop name="room" />
      {status === 'lobby' ? <RoomLobby /> : <RoomEntry profile={profile} onBack={back} />}
    </AppLayout>
  );
}
