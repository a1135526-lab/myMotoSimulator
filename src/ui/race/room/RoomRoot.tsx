import { useEffect, useMemo } from 'react';
import { CircuitProvider, useCurrentBike, useRaceStore, useRoomStore } from '@/application';
import { ModeTabs } from '../../components/common/ModeTabs';
import { SoundToggle } from '../../components/common/SoundToggle';
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
  const profile = useMemo(
    () => ({
      bike: `${bike.brand} ${bike.model}`,
      manual: bike.kind === 'manual',
      cylinders: bike.engine.cylinders,
    }),
    [bike],
  );

  // A new bike in the lobby: let the others see it.
  useEffect(() => {
    if (me && me.bike !== profile.bike) updateProfile({ ...profile, name: me.name });
  }, [me, profile, updateProfile]);

  // Leaving race mode (another tab) leaves the room too.
  useEffect(() => () => useRoomStore.getState().leave(), []);

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
          <ModeTabs />
          <SoundToggle />
        </>
      }
    >
      {status === 'lobby' ? <RoomLobby /> : <RoomEntry profile={profile} onBack={back} />}
    </AppLayout>
  );
}
