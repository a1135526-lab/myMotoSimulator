import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { getBike } from '@/data';
import { selectionForLevel } from '../race/opponentSetup';
import type { RaceResult } from '@/domain';
import { sendScore, submitDrag } from '../online/leaderboard';
import { recordDragMatch } from '../stats/matchRecorder';
import { RaceController, type RaceConfig } from '../race/RaceController';
import { useConfigStore } from '../stores/configStore';
import { activeTrack, useRaceStore } from '../stores/raceStore';
import { useRecordsStore } from '../stores/recordsStore';
import { toRaceView } from '../viewModels/race';
import { RaceContext } from './raceContext';
import { useFlickShift } from './useFlickShift';
import { useInputSources } from './useInputSources';
import { useActiveTrack } from './useRaceSetup';
import { buildSimConfig, useCurrentBike } from './useSimConfig';
import { useSimulationLoop } from './useSimulationLoop';

/** Player = the garage bike and tune; opponent and venue from the race setup. */
function useRaceConfig(): RaceConfig {
  const bike = useCurrentBike();
  const selection = useConfigStore((s) => s.selection);
  const { track, distanceM } = useActiveTrack();
  const treeMode = useRaceStore((s) => s.treeMode);
  const opponent = useRaceStore((s) => s.opponent);
  const autoClutch = useRaceStore((s) => s.autoClutch);

  return useMemo(() => {
    const oppBike = getBike(opponent.bikeId);
    const env = track.environment;
    return {
      player: buildSimConfig(bike, selection, env),
      opponent: buildSimConfig(
        oppBike,
        selectionForLevel(oppBike, opponent.tuneLevel, opponent.riderMassKg),
        env,
      ),
      opponentSkill: opponent.skill,
      settings: { distanceM, treeMode, autoClutch },
    };
  }, [bike, selection, track, distanceM, treeMode, autoClutch, opponent]);
}

/**
 * A clean finish (no jump start) goes on the strip's board here, and on the
 * global board when it's one of the fixed strips.
 */
function recordRun(config: RaceConfig, result: RaceResult): void {
  const store = useRaceStore.getState();
  const me = result.player;
  const strip = activeTrack(store.trackId, store.customDistanceM);
  const oppBike = config.opponent.bike;
  recordDragMatch(
    result,
    { trackId: strip.track.id, distanceM: strip.distanceM },
    {
      label: `${config.player.bike.brand} ${config.player.bike.model}`,
      manual: config.player.bike.kind === 'manual',
    },
    `${oppBike.brand} ${oppBike.model}`,
  );
  if (me.falseStart || !me.finished || me.elapsedS === null || me.trapSpeedKmh === null) {
    store.setDragRecord(null);
    return;
  }
  const { track, distanceM } = activeTrack(store.trackId, store.customDistanceM);
  const custom = track.distanceM === null;
  const bike = config.player.bike;
  const run = {
    etS: me.elapsedS,
    trapKmh: me.trapSpeedKmh,
    bike: `${bike.brand} ${bike.model}`,
    manual: bike.kind === 'manual',
    at: Date.now(),
  };
  const place = useRecordsStore
    .getState()
    .addDragRun(custom ? `custom-${distanceM}` : track.id, run);
  store.setDragRecord({ etS: run.etS, place, online: { state: 'off' } });
  if (custom) return;
  sendScore(
    () => submitDrag({ trackId: track.id, ...run }),
    (online) => {
      const shown = useRaceStore.getState().dragRecord;
      if (shown?.etS === run.etS) useRaceStore.getState().setDragRecord({ ...shown, online });
    },
  );
}

export function RaceProvider({ children }: { children: ReactNode }) {
  const config = useRaceConfig();
  const applied = useRef(config);
  const [controller] = useState(
    () =>
      new RaceController(
        config,
        ({ race, models }) => useRaceStore.getState().publish(toRaceView(race, models)),
        Math.random,
        (result) => recordRun(applied.current, result),
      ),
  );

  useEffect(() => {
    if (applied.current === config) return;
    applied.current = config;
    controller.configure(config);
  }, [controller, config]);

  useEffect(() => () => controller.dispose(), [controller]);

  useSimulationLoop(controller);
  useInputSources(controller);
  useFlickShift(controller);

  return <RaceContext.Provider value={controller}>{children}</RaceContext.Provider>;
}
