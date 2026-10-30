import type { TimeOfDay } from '@/application';

/** Lighting per time of day: physical sky + sun, fog and exposure to match. */
export interface Lighting {
  readonly elevationDeg: number;
  readonly azimuthDeg: number;
  readonly turbidity: number;
  readonly rayleigh: number;
  readonly exposure: number;
  readonly sun: string;
  readonly sunIntensity: number;
  readonly hemiSky: string;
  readonly hemiGround: string;
  readonly hemi: number;
  readonly fog: string;
  readonly fogDensity: number;
  readonly envIntensity: number;
  readonly night: number;
}

export const LIGHTING: Readonly<Record<TimeOfDay, Lighting>> = {
  day: {
    elevationDeg: 48,
    azimuthDeg: 150,
    turbidity: 2.6,
    rayleigh: 1.6,
    exposure: 0.58,
    sun: '#fff3e2',
    sunIntensity: 3.2,
    hemiSky: '#cfe3ff',
    hemiGround: '#5d5a52',
    hemi: 0.7,
    fog: '#a9c3db',
    fogDensity: 0.00095,
    envIntensity: 0.9,
    night: 0,
  },
  dusk: {
    elevationDeg: 3.5,
    azimuthDeg: 250,
    turbidity: 9,
    rayleigh: 2.6,
    exposure: 0.5,
    sun: '#ffab6b',
    sunIntensity: 2.2,
    hemiSky: '#f0b18f',
    hemiGround: '#3a3330',
    hemi: 0.45,
    fog: '#c99883',
    fogDensity: 0.0013,
    envIntensity: 0.7,
    night: 0.55,
  },
  night: {
    elevationDeg: -9,
    azimuthDeg: 200,
    turbidity: 2,
    rayleigh: 0.5,
    exposure: 0.85,
    sun: '#9fb2ff',
    sunIntensity: 0.35,
    hemiSky: '#33406a',
    hemiGround: '#141414',
    hemi: 0.35,
    fog: '#070b14',
    fogDensity: 0.0016,
    envIntensity: 0.25,
    night: 1,
  },
};
