import {
  buildCircuit,
  buildModel,
  CIRCUIT_SKILLS,
  estimateLapTime,
  type CircuitGeometry,
  type SimConfig,
} from '@/domain';
import type { CircuitSpec } from '@/data';

const geoCache = new Map<string, CircuitGeometry>();
const lapCache = new Map<string, number>();
const LAP_CACHE_LIMIT = 128;

export function circuitGeometry(circuit: CircuitSpec): CircuitGeometry {
  let geo = geoCache.get(circuit.id);
  if (!geo) {
    geo = buildCircuit(circuit.controlPoints, circuit.widthM / 2);
    geoCache.set(circuit.id, geo);
  }
  return geo;
}

export const circuitEnvironment = (circuit: CircuitSpec) => ({
  airDensity: circuit.airDensity,
  gradePercent: 0,
  tractionG: circuit.gripG,
});

/** Flying-lap estimate with a pro rider — for garage cards and matchups. */
export function computeLapEstimate(config: SimConfig, circuit: CircuitSpec): number {
  const key = JSON.stringify([circuit.id, config.bike.id, config.tune, config.environment]);
  const hit = lapCache.get(key);
  if (hit !== undefined) return hit;
  const lap = estimateLapTime(
    circuitGeometry(circuit),
    buildModel(config),
    circuit.gripG,
    CIRCUIT_SKILLS.pro,
  );
  lapCache.set(key, lap);
  if (lapCache.size > LAP_CACHE_LIMIT) {
    const oldest = lapCache.keys().next().value;
    if (oldest !== undefined) lapCache.delete(oldest);
  }
  return lap;
}
