import { useEffect, useRef } from 'react';
import { useUiStore, type SoundFrame } from '@/application';
import { AudioEngine } from './AudioEngine';
import { distanceGain, voiceParams } from './engineSoundModel';
import type { EngineVoice } from './EngineVoice';

/** Opponent sits in the right lane; the further ahead, the more centred it sounds. */
const OPPONENT_PAN = 0.6;
const PAN_KNEE_M = 25;
const OPPONENT_LOUDNESS = 0.85;

interface VoiceSlot {
  voice: EngineVoice | null;
  cylinders: number;
}

function ensureVoice(engine: AudioEngine, slot: VoiceSlot, cylinders: number): EngineVoice {
  if (!slot.voice || slot.cylinders !== cylinders) {
    slot.voice?.dispose();
    slot.voice = engine.createVoice(cylinders);
    slot.cylinders = cylinders;
  }
  return slot.voice;
}

/**
 * Plays engine sound while the sound toggle is on. `read` is polled every
 * animation frame (it reads stores directly), so audio never re-renders React.
 */
export function useEngineAudio(read: () => SoundFrame | null): void {
  const soundOn = useUiStore((s) => s.soundOn);
  const reader = useRef(read);
  useEffect(() => {
    reader.current = read;
  }, [read]);

  useEffect(() => {
    if (!soundOn) return;
    const engine = AudioEngine.create();
    if (!engine) return;
    engine.resume();
    const resume = () => engine.resume();
    window.addEventListener('pointerdown', resume);
    window.addEventListener('keydown', resume);

    const player: VoiceSlot = { voice: null, cylinders: 0 };
    const opponent: VoiceSlot = { voice: null, cylinders: 0 };
    let frame = 0;

    const loop = () => {
      const snap = reader.current();
      if (snap) {
        const t = engine.now;
        ensureVoice(engine, player, snap.player.cylinders).update(voiceParams(snap.player, t));
        engine.setWind(snap.player.speedKmh);

        if (snap.opponent) {
          const gap = snap.opponent.gapM;
          const pan = OPPONENT_PAN / (1 + Math.abs(gap) / PAN_KNEE_M);
          ensureVoice(engine, opponent, snap.opponent.cylinders).update(
            voiceParams(snap.opponent, t),
            pan,
            OPPONENT_LOUDNESS * distanceGain(gap),
          );
        } else if (opponent.voice) {
          opponent.voice.dispose();
          opponent.voice = null;
        }
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointerdown', resume);
      window.removeEventListener('keydown', resume);
      player.voice?.dispose();
      opponent.voice?.dispose();
      engine.dispose();
    };
  }, [soundOn]);
}
