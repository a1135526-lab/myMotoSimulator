import { useEffect } from 'react';
import { CircuitProvider, useCircuitController, useRankedStore, useRoomStore } from '@/application';
import { LobbyMusicPlayer } from '../../audio/LobbyMusicPlayer';
import { ArtBackdrop } from '../../components/common/ArtBackdrop';
import { HomeButton } from '../../components/common/HomeButton';
import { MusicToggle } from '../../components/common/MusicToggle';
import { AppLayout } from '../../layouts/AppLayout';
import { CircuitPage } from '../circuit/CircuitPage';
import { RankedMenu } from './RankedMenu';
import { RankedWaiting } from './RankedWaiting';

/** Against the AI there's nobody to start the lights: they come on by themselves. */
const AI_LIGHTS_DELAY_MS = 1500;
function AutoStart() {
  const controller = useCircuitController();
  useEffect(() => {
    const timer = window.setTimeout(() => controller.go(), AI_LIGHTS_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [controller]);
  return null;
}

/** Ranked: the menu, the queue, then a race — with people (in a room) or the AI. */
export function RankedRoot() {
  const phase = useRankedStore((s) => s.phase);
  const matchId = useRankedStore((s) => s.match?.id);
  const roomStatus = useRoomStore((s) => s.status);

  if (phase === 'ai') {
    return (
      <CircuitProvider key={matchId}>
        <AutoStart />
        <CircuitPage ranked />
      </CircuitProvider>
    );
  }
  if (phase === 'room' && roomStatus === 'racing') {
    return (
      <CircuitProvider>
        <CircuitPage room ranked />
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
      <ArtBackdrop name="circuit" />
      {phase === 'idle' ? <RankedMenu /> : <RankedWaiting />}
    </AppLayout>
  );
}
