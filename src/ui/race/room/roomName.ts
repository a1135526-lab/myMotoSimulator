/** The name you used last time in a room, remembered on this device. */
const KEY = 'scooter-dyno:room-name';

export function savedRoomName(): string {
  try {
    return globalThis.localStorage?.getItem(KEY) ?? '';
  } catch {
    return '';
  }
}

export function saveRoomName(name: string): void {
  try {
    globalThis.localStorage?.setItem(KEY, name);
  } catch {
    // Not remembered; asked again next time.
  }
}
