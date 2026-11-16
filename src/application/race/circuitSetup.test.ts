import { describe, expect, it } from 'vitest';
import { getBike, getCircuit } from '@/data';
import { rankedAi } from '@/domain';
import { buildSimConfig } from '../hooks/useSimConfig';
import { circuitEnvironment } from '../services/lapService';
import { createStockSelection } from '../tuning/selection';
import type { CircuitConfig } from './CircuitController';
import { circuitSetup } from './circuitSetup';

const circuit = getCircuit('practice-park');
const env = circuitEnvironment(circuit);
const jet = getBike('sym-jet-sl-125');
const bike = buildSimConfig(jet, createStockSelection(jet), env);

const config: CircuitConfig = {
  circuit,
  player: bike,
  opponents: [bike, bike, bike],
  names: ['你', '#1', '#2', '#3'],
  skill: 'average',
  laps: 2,
  assist: false,
  brakeAssist: false,
  autoShift: true,
  autoClutch: true,
  ghost: null,
};

describe('circuitSetup AI pace', () => {
  it('grid-mates differ a little, some slower than the set pace', () => {
    const { skill } = rankedAi('hard', 0);
    const skills = circuitSetup({ ...config, aiSkill: skill }, () => 0, 1, null).aiSkills;
    expect(skills.some((s) => s.cornerGripUse < skill.cornerGripUse)).toBe(true);
  });

  it('all out: every AI rider at exactly the set pace', () => {
    const { skill, allOut } = rankedAi('max', 0);
    const skills = circuitSetup(
      { ...config, aiSkill: skill, aiAllOut: allOut },
      () => 0,
      1,
      null,
    ).aiSkills;
    expect(skills).toHaveLength(3);
    for (const s of skills) expect(s).toEqual(skill);
  });
});
