import { z } from 'zod';
import type { GainPoint, Provenance, TorquePoint } from '@/domain';

export const positive = () => z.number().finite().positive();
export const nonNegative = () => z.number().finite().nonnegative();
export const rpm = () => z.number().finite().int().min(0).max(20000);

export const ProvenanceSchema: z.ZodType<Provenance> = z
  .object({
    verified: z.boolean(),
    kind: z.enum(['official', 'measured', 'community', 'estimated']),
    sources: z.array(z.string().min(1)).readonly(),
    note: z.string().optional(),
  })
  .superRefine((p, ctx) => {
    if (p.kind !== 'estimated' && p.sources.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sources'],
        message: `kind "${p.kind}" requires at least one source`,
      });
    }
    if (p.verified && (p.kind === 'estimated' || p.kind === 'community')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['verified'],
        message: `kind "${p.kind}" cannot be marked verified`,
      });
    }
  });

/** Require strictly ascending rpm so interpolation is well-defined. */
const ascendingRpm = <T extends { rpm: number }>(points: readonly T[], ctx: z.RefinementCtx) => {
  points.forEach((point, i) => {
    const prev = points[i - 1];
    if (prev && point.rpm <= prev.rpm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [i, 'rpm'],
        message: `rpm must be strictly ascending (${prev.rpm} → ${point.rpm})`,
      });
    }
  });
};

export const TorquePointSchema: z.ZodType<TorquePoint> = z.object({
  rpm: rpm(),
  torqueNm: nonNegative(),
});

export const GainPointSchema: z.ZodType<GainPoint> = z.object({
  rpm: rpm(),
  gain: z.number().finite().min(0.5).max(2),
});

export const TorqueGainCurveSchema = z.array(GainPointSchema).readonly().superRefine(ascendingRpm);

export const torqueCurveSchema = (minPoints: number) =>
  z.array(TorquePointSchema).min(minPoints).readonly().superRefine(ascendingRpm);
