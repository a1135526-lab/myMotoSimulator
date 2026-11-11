import {
  advanceCircuitRace,
  advanceItemRace,
  applyRemoteUse,
  buildCircuit,
  createItemRace,
  fireItem,
  removeObject,
  remoteItemBodies,
  buildModel,
  createCircuitRace,
  resetPlayer,
  retireCircuitPlayer,
  shiftCircuitPlayer,
  startCircuitPlayerEngine,
  startLights,
  type CircuitGeometry,
  type CircuitRaceState,
  type CircuitSkill,
  type GhostLap,
  type GridLayout,
  type ItemEvent,
  type ItemRaceState,
  type ItemUse,
  type RemoteBike,
  type RiderSkill,
  type SimConfig,
  type SimModel,
} from '@/domain';
import type { CircuitSpec } from '@/data';
import { CompositeInputSource, type InputAction } from '../input/InputSource';
import { TouchInputSource } from '../input/TouchInputSource';
import { circuitSetup } from './circuitSetup';
import { ItemChannel } from './itemChannel';
import { LapRecorder, type CompletedLap } from './lapRecorder';

export interface CircuitConfig {
  readonly circuit: CircuitSpec;
  readonly player: SimConfig;
  readonly opponents: readonly SimConfig[];
  readonly names: readonly string[];
  readonly skill: RiderSkill;
  readonly laps: number;
  readonly assist: boolean;
  readonly brakeAssist: boolean;
  readonly autoShift: boolean;
  readonly autoClutch: boolean;
  /** Best lap so far on this circuit, to race against. */
  readonly ghost: GhostLap | null;
  /** Exact AI pace (ranked races), instead of the `skill` presets. */
  readonly aiSkill?: CircuitSkill;
  /** How the grid lines up (staggered unless set). */
  readonly grid?: GridLayout;
  /** An item race: boxes on the track, items to use. */
  readonly items?: boolean;
}

export interface CircuitSnapshot {
  readonly race: CircuitRaceState;
  readonly geo: CircuitGeometry;
  readonly models: readonly SimModel[];
  readonly names: readonly string[];
  readonly ghost: GhostLap | null;
  /** The items in play (item races only). */
  readonly items: ItemRaceState | null;
}

/** Every lap the player completes, with whether it was clean and its line. */
export type LapListener = (lap: CompletedLap) => void;

export { LIGHTS_HOLD_RANGE_S } from './circuitSetup';

/** Owns a running circuit race outside React; mirrors RaceController. */
export class CircuitController {
  readonly input = new CompositeInputSource();
  readonly touch = new TouchInputSource();
  private geo!: CircuitGeometry;
  private models!: SimModel[];
  private race!: CircuitRaceState;
  private config: CircuitConfig;
  private recorder = new LapRecorder();
  /** Racing in a friend room: Space / the start button don't start the lights. */
  private roomMode = false;
  /** One race only (ranked): Space after the flag doesn't put you back on the grid. */
  private singleRace = false;
  /** The finish window (a room, ranked) has closed: the race ends, finished or not. */
  private outOfTime: (race: CircuitRaceState) => boolean = () => false;
  private remoteBikes: () => readonly RemoteBike[] = () => [];
  private ghost: GhostLap | null = null;
  /** Your grid slot and the field size in a friend room (each player rides their own race). */
  private roomGrid: { readonly slot: number; readonly field: number } | null = null;
  /** The item race around `race` (item races only); `race` is always its circuit race. */
  private items: ItemRaceState | null = null;
  private readonly itemChannel = new ItemChannel();

  constructor(
    config: CircuitConfig,
    private readonly publish: (snapshot: CircuitSnapshot) => void,
    private readonly onToggleCamera: () => void = () => undefined,
    private readonly random: () => number = Math.random,
    private readonly onLap: LapListener = () => undefined,
  ) {
    this.config = config;
    this.ghost = config.ghost;
    this.input.add(this.touch);
    this.restage();
  }

  /** New settings (or circuit): the ghost comes from them too. */
  configure(config: CircuitConfig): void {
    this.config = config;
    this.ghost = config.ghost;
    this.restage();
  }

  setRoomMode(on: boolean): void {
    this.roomMode = on;
  }

  setSingleRace(on: boolean): void {
    this.singleRace = on;
  }

  setOutOfTime(check: (race: CircuitRaceState) => boolean): void {
    this.outOfTime = check;
  }

  /** Other players' bikes (a friend room), to bump into. */
  setRemoteBikes(source: () => readonly RemoteBike[]): void {
    this.remoteBikes = source;
  }

  /** Item races in a room: your uses go out, and your id names what you put on the track. */
  setItemLink(owner: string, send: (use: ItemUse) => void): void {
    this.itemChannel.link(owner, send);
  }

  /** Hear about items being picked, used and landing (HUD, sounds, the other players). */
  onItemEvents(listener: (events: readonly ItemEvent[]) => void): () => void {
    return this.itemChannel.listen(listener);
  }

  /** Z: use the item you hold. */
  fireItem(): void {
    if (!this.items) return;
    const remote = remoteItemBodies(this.geo, this.items, this.remoteBikes());
    const { state, used } = fireItem(this.geo, this.items, 0, remote);
    if (!used) return;
    this.setItems(state);
    this.itemChannel.sent(used);
  }

  /** Another player used an item. `me` is your id, for a paper plane or skateboard aimed at you. */
  applyRemoteItem(owner: string, use: ItemUse, me: string | null): void {
    if (this.items) this.setItems(applyRemoteUse(this.geo, this.items, owner, use, me));
  }

  /** Someone ran into this trap or shot: it's gone. */
  removeItemObject(id: string): void {
    if (this.items) this.setItems(removeObject(this.items, id));
  }

  /** A friend-room start: fresh grid, lights on, the same hold as everyone else. */
  startRoomRace(holdS: number, slot = 0, field = 1): void {
    this.roomGrid = { slot, field };
    this.restage(holdS);
    this.update(startLights(this.race));
  }

  /** "Brand Model" of the player's bike. */
  private get bikeLabel(): string {
    const bike = this.config.player.bike;
    return `${bike.brand} ${bike.model}`;
  }

  /** Back to the grid; `holdS` fixes the hold after the fifth red (else random). */
  restage(holdS?: number): void {
    const { circuit, player, opponents } = this.config;
    this.geo = buildCircuit(
      circuit.controlPoints,
      circuit.widthM / 2,
      undefined,
      circuit.elevation,
    );
    this.models = [player, ...opponents].map(buildModel);
    const room = this.roomMode ? this.roomGrid : null;
    const setup = circuitSetup(this.config, this.random, holdS, room);
    const seed = Math.floor(this.random() * 2 ** 31);
    this.items = this.config.items
      ? createItemRace(this.geo, this.models, setup, seed, `${this.itemChannel.owner}:`)
      : null;
    this.race = this.items?.race ?? createCircuitRace(this.geo, this.models, setup);
    this.itemChannel.restart();
    // A rematch keeps the ghost, including a best set in the last race.
    this.recorder = new LapRecorder();
    this.emit();
  }

  tick(elapsedS: number): void {
    const [command, remote] = [this.input.read(), this.remoteBikes()];
    const { geo, models } = this;
    if (this.items) {
      this.items = advanceItemRace(geo, models, this.items, command, elapsedS, remote);
      this.race = this.items.race;
    } else {
      this.race = advanceCircuitRace(geo, models, this.race, command, elapsedS, remote);
    }
    if (this.race.phase === 'racing' && this.outOfTime(this.race)) {
      this.setRace(retireCircuitPlayer(this.race));
    }
    const lap = this.recorder.observe(this.geo, this.race);
    if (lap) this.lapCompleted(lap);
    this.emit();
  }

  /** A faster clean lap becomes the ghost straight away, for the next lap. */
  private lapCompleted(lap: CompletedLap): void {
    if (lap.clean && (!this.ghost || lap.lapS < this.ghost.lapS)) {
      const manual = this.config.player.bike.kind === 'manual';
      this.ghost = { lapS: lap.lapS, samples: lap.samples, bike: this.bikeLabel, manual };
    }
    this.onLap(lap);
  }

  /** Space: start the lights from the grid; after the race, back to the grid. */
  go(): void {
    // In a friend room only the host starts the race, for everyone at once.
    if (this.roomMode) return;
    if (this.race.phase === 'grid') this.update(startLights(this.race));
    else if (this.race.phase === 'finished' && !this.singleRace) this.restage();
  }

  handleAction = (action: InputAction): void => {
    switch (action) {
      case 'toggleTimer':
        return this.go();
      case 'reset':
        this.recorder.markDirty();
        return this.update(resetPlayer(this.geo, this.models, this.race));
      case 'shiftUp':
        return this.update(shiftCircuitPlayer(this.models, this.race, 1));
      case 'shiftDown':
        return this.update(shiftCircuitPlayer(this.models, this.race, -1));
      case 'startEngine':
        return this.update(startCircuitPlayerEngine(this.models, this.race));
      case 'toggleCamera':
        return this.onToggleCamera();
      case 'useItem':
        return this.fireItem();
    }
  };

  snapshot(): CircuitSnapshot {
    return {
      race: this.race,
      geo: this.geo,
      models: this.models,
      names: this.config.names,
      ghost: this.ghost,
      items: this.items,
    };
  }

  dispose(): void {
    this.input.dispose();
  }

  private update(race: CircuitRaceState): void {
    if (race === this.race) return;
    this.setRace(race);
    this.emit();
  }

  /** The circuit race changed outside a tick: the item race wraps the same one. */
  private setRace(race: CircuitRaceState): void {
    this.race = race;
    if (this.items) this.items = { ...this.items, race };
  }

  private setItems(items: ItemRaceState): void {
    if (items === this.items) return;
    this.items = items;
    this.race = items.race;
    this.emit();
  }

  private emit(): void {
    this.publish(this.snapshot());
    this.itemChannel.flush(this.items);
  }
}
