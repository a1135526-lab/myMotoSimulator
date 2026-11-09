import { create } from 'zustand';
import { useHornStore, type HornPreset } from '../../stores/hornStore';
import { useRoomStore } from './roomStore';
import { sendToRoom, tapRoomMessages } from './roomTransport';
import { ROOM_CLIP_MAX_CHARS, type RoomMessage } from './roomTypes';

/**
 * Horns in a friend room (and ranked, which races in one): yours goes out
 * while you race, everyone else's comes in for the speakers. A recorded horn
 * is sent once per race, just before its first honk.
 */
export interface RemoteHorn {
  readonly on: boolean;
  readonly preset: HornPreset;
  /** Their recording, if they've sent one. */
  readonly clip: string | null;
}

interface RemoteHornState {
  /** By player id. */
  readonly horns: Readonly<Record<string, RemoteHorn>>;
}

export const useRemoteHornStore = create<RemoteHornState>()(() => ({ horns: {} }));

const update = (id: string, patch: Partial<RemoteHorn>) => {
  const { horns } = useRemoteHornStore.getState();
  const was = horns[id] ?? { on: false, preset: 'standard' as const, clip: null };
  useRemoteHornStore.setState({ horns: { ...horns, [id]: { ...was, ...patch } } });
};

export function receiveHorn(msg: RoomMessage): void {
  if (msg.type === 'hornClip') {
    update(msg.id, { clip: msg.clip });
  } else if (msg.type === 'horn') {
    if (useRoomStore.getState().race?.raceId !== msg.raceId) return;
    update(msg.id, { on: msg.on, preset: msg.preset });
  }
}

/** The race your recording was last sent for. */
let clipSentFor: number | null = null;

export function sendHorn(on: boolean): void {
  const room = useRoomStore.getState();
  const { me, race } = room;
  if (room.status !== 'racing' || !me || !race) return;
  const { preset, clip } = useHornStore.getState();
  const sendable = preset === 'custom' && clip !== null && clip.length <= ROOM_CLIP_MAX_CHARS;
  if (on && sendable && clipSentFor !== race.raceId) {
    clipSentFor = race.raceId;
    sendToRoom({ type: 'hornClip', id: me.id, clip });
  }
  // A recording too big to send sounds as the standard horn to everyone else.
  const heard: HornPreset = preset === 'custom' && !sendable ? 'standard' : preset;
  sendToRoom({ type: 'horn', id: me.id, raceId: race.raceId, on, preset: heard });
}

tapRoomMessages(receiveHorn);

useHornStore.subscribe((s, prev) => {
  if (s.held !== prev.held) sendHorn(s.held);
});

// A new race (or leaving the room): nobody's horn is still held.
useRoomStore.subscribe((s, prev) => {
  if (s.race?.raceId === prev.race?.raceId && s.status === prev.status) return;
  const { horns } = useRemoteHornStore.getState();
  const quiet = Object.fromEntries(
    Object.entries(horns).map(([id, h]) => [id, { ...h, on: false }]),
  );
  useRemoteHornStore.setState({ horns: s.status === 'idle' ? {} : quiet });
});
