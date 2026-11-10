import * as THREE from 'three';
import type { CircuitGhostView } from '@/application';
import { createBikeModel, type BikeModel } from '../../scene/models';

const GHOST_COLOR = '#7fd4ff';
const GHOST_OPACITY = 0.38;

/** Yaw that turns a model facing −Z to travel along heading h (forward = cos h, sin h). */
const yawFor = (heading: number) => Math.atan2(-Math.cos(heading), -Math.sin(heading));

/** Your best lap as a see-through bike riding its line. */
export class GhostBike {
  readonly group = new THREE.Group();
  private bike: BikeModel | null = null;
  private manual: boolean | null = null;
  private readonly materials: THREE.Material[] = [];

  /** `groundAt` gives the road height under the ghost (it records only where it rode). */
  update(ghost: CircuitGhostView | null, groundAt: (x: number, z: number) => number): void {
    this.group.visible = ghost !== null;
    if (!ghost) return;
    this.ensure(ghost.manual);
    this.group.position.set(ghost.x, groundAt(ghost.x, ghost.z), ghost.z);
    this.group.rotation.y = yawFor(ghost.heading);
    if (this.bike) this.bike.group.rotation.z = ghost.lean;
  }

  dispose(): void {
    for (const m of this.materials) m.dispose();
  }

  /** Scooter or manual bike, with every surface made see-through and cool blue. */
  private ensure(manual: boolean): void {
    if (this.bike && this.manual === manual) return;
    if (this.bike) this.group.remove(this.bike.group);
    for (const m of this.materials) m.dispose();
    this.materials.length = 0;
    const bike = createBikeModel(GHOST_COLOR, !manual);
    bike.group.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const ghost = new THREE.MeshBasicMaterial({
        color: GHOST_COLOR,
        transparent: true,
        opacity: GHOST_OPACITY,
        depthWrite: false,
      });
      o.material = ghost;
      o.castShadow = false;
      this.materials.push(ghost);
    });
    this.bike = bike;
    this.manual = manual;
    this.group.add(bike.group);
  }
}
