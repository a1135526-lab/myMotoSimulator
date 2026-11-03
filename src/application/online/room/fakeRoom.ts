import type { RoomHandlers, RoomTransport } from './roomTransport';
import type { RoomMessage, RoomPlayer } from './roomTypes';

/** An in-memory stand-in for Realtime: rooms shared by every FakeTransport on one hub. */
export class FakeHub {
  private readonly rooms = new Map<string, Set<FakeTransport>>();

  transport(): FakeTransport {
    return new FakeTransport(this);
  }

  enter(code: string, t: FakeTransport): void {
    const room = this.rooms.get(code) ?? new Set();
    room.add(t);
    this.rooms.set(code, room);
    this.syncPresence(code);
  }

  exit(code: string, t: FakeTransport): void {
    this.rooms.get(code)?.delete(t);
    this.syncPresence(code);
  }

  /** Broadcast to everyone else (like `broadcast: { self: false }`), through JSON like the wire. */
  deliver(code: string, from: FakeTransport, msg: RoomMessage): void {
    const copy = JSON.parse(JSON.stringify(msg)) as RoomMessage;
    for (const t of this.rooms.get(code) ?? []) if (t !== from) t.handlers?.message(copy);
  }

  syncPresence(code: string): void {
    const room = [...(this.rooms.get(code) ?? [])];
    const players = room.flatMap((t) => (t.me ? [t.me] : []));
    for (const t of room) t.handlers?.presence(players);
  }
}

export class FakeTransport implements RoomTransport {
  me: RoomPlayer | null = null;
  handlers: RoomHandlers | null = null;
  private code: string | null = null;

  constructor(private readonly hub: FakeHub) {}

  connect(code: string, me: RoomPlayer, handlers: RoomHandlers): Promise<boolean> {
    this.code = code;
    this.me = me;
    this.handlers = handlers;
    this.hub.enter(code, this);
    return Promise.resolve(true);
  }

  send(msg: RoomMessage): void {
    if (this.code) this.hub.deliver(this.code, this, msg);
  }

  announce(me: RoomPlayer): void {
    this.me = me;
    if (this.code) this.hub.syncPresence(this.code);
  }

  leave(): void {
    if (this.code) this.hub.exit(this.code, this);
    this.code = null;
    this.handlers = null;
  }
}
