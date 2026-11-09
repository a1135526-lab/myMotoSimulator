import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { RideGrades } from '@/domain';
import { RideGradeCard } from './RideGradeCard';

const grades: RideGrades = {
  score: 72,
  grade: 'B',
  items: [
    { key: 'cornering', score: 88, grade: 'A' },
    { key: 'limits', score: 40, grade: 'D' },
    { key: 'drift', score: 65, grade: 'B' },
  ],
  tally: {
    racingS: 120,
    offTrackS: 4.2,
    excursions: 3,
    hits: 0,
    resets: 0,
    drifts: 1,
    slideS: 0,
    slideClean: true,
    upshifts: 0,
    goodUpshifts: 0,
    limiterS: 0,
    corners: 20,
    cornerPace: 19,
    peakMps: 0,
    corner: null,
  },
};

describe('RideGradeCard', () => {
  it('shows the overall letter and a row per part with what it came from', () => {
    render(<RideGradeCard grades={grades} reactionS={0.2} />);
    expect(screen.getByTestId('ride-grade')).toHaveTextContent('B');
    expect(screen.getByTestId('ride-grades')).toHaveTextContent('72');
    expect(screen.getByTestId('grade-limits')).toHaveTextContent('衝出賽道 3 次 · 草地上 4.2 秒');
    expect(screen.getByTestId('grade-cornering')).toHaveTextContent('95%');
    expect(screen.getByTestId('grade-drift')).toHaveTextContent('成功甩尾 1 次');
  });
});
