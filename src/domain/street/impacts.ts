import type { FreeRider } from './freeRide';
import { CAR_SIZE, carFrame, type Car } from './traffic';

/**
 * Bumping into a car: the rider is shoved clear of it and slowed, but stays
 * on the bike where it happened. Nobody is put back on the road.
 */

/** Gap left between the rider and the car body after a shove, m. */
const CLEAR_M = 0.5;
/** Share of the rider's speed kept after riding into a car. */
const KEEP = 0.35;
/** A car moving faster than this, or a rider faster than this, makes it a real hit. */
const CAR_HIT_MPS = 3;
const RIDER_HIT_MPS = 1.5;
/** One bump is counted once, however many steps it takes to come apart, s. */
const HIT_REPEAT_S = 1;

export function bumpCar(rider: FreeRider, car: Car, clockS: number): FreeRider {
  const size = CAR_SIZE[car.kind];
  const r = carFrame(car, rider.x, rider.z);
  const outAhead = size.length / 2 + CLEAR_M - Math.abs(r.ahead);
  const outSide = size.width / 2 + CLEAR_M - Math.abs(r.side);
  // Out the nearer way: past the bumper or off the car's flank.
  const ahead = outAhead < outSide ? r.ahead + Math.sign(r.ahead || 1) * outAhead : r.ahead;
  const side = outAhead < outSide ? r.side : r.side + Math.sign(r.side || 1) * outSide;
  const fx = Math.cos(car.heading);
  const fz = Math.sin(car.heading);
  const real = car.speedMps > CAR_HIT_MPS || rider.sim.speedMps > RIDER_HIT_MPS;
  const fresh = rider.hitAtS === null || clockS - rider.hitAtS > HIT_REPEAT_S;
  return {
    ...rider,
    x: car.x + ahead * fx - side * fz,
    z: car.z + ahead * fz + side * fx,
    sim: { ...rider.sim, speedMps: rider.sim.speedMps * KEEP },
    drift: 0,
    hitAtS: real && fresh ? clockS : rider.hitAtS,
  };
}
