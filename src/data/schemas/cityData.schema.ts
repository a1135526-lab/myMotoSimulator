import { z } from 'zod';
import { AREA_KINDS, POI_KINDS, ROAD_CLASSES, type CityData } from '@/domain';

/** Imported map data (scripts/osm): shape plus the cross-references the game relies on. */

const flat = z.array(z.number());

export const CityDataSchema = z
  .object({
    name: z.string().min(1),
    attribution: z.string().includes('OpenStreetMap'),
    bounds: z.object({ minX: z.number(), minZ: z.number(), maxX: z.number(), maxZ: z.number() }),
    names: z.array(z.string()),
    nodes: flat.refine((a) => a.length % 2 === 0, 'nodes must be x,z pairs'),
    signals: z.array(z.number().int().nonnegative()),
    edges: z.array(flat.min(6)),
    areas: z.array(flat.min(8)),
    waterways: z.array(flat.min(6)),
    buildings: z.array(flat.min(7)),
    pois: z.array(flat.length(4)),
    places: z.array(flat.length(3)),
    villages: z.array(flat.min(3)),
  })
  .superRefine((d, ctx) => {
    const nodeCount = d.nodes.length / 2;
    const issue = (message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, message });
    const nameOk = (i: number | undefined) => i === undefined || (i >= -1 && i < d.names.length);
    d.edges.forEach((e, i) => {
      const [a = -1, b = -1, name, cls = -1, lanes = 0, oneway = 9] = e;
      if (a < 0 || a >= nodeCount || b < 0 || b >= nodeCount) issue(`edge ${i}: bad node`);
      if (!nameOk(name)) issue(`edge ${i}: bad name`);
      if (cls < 0 || cls >= ROAD_CLASSES.length) issue(`edge ${i}: bad class`);
      if (lanes < 1 || ![-1, 0, 1].includes(oneway)) issue(`edge ${i}: bad lanes/oneway`);
      if (e.length % 2 !== 0) issue(`edge ${i}: odd point list`);
    });
    d.signals.forEach((s) => s >= nodeCount && issue(`signal ${s}: no such node`));
    d.areas.forEach((a, i) => {
      if ((a[0] ?? -1) < 0 || (a[0] ?? 0) >= AREA_KINDS.length || !nameOk(a[1]))
        issue(`area ${i}: bad kind/name`);
    });
    d.pois.forEach((p, i) => {
      if ((p[0] ?? -1) < 0 || (p[0] ?? 0) >= POI_KINDS.length || (p[1] ?? -1) < 0 || !nameOk(p[1]))
        issue(`poi ${i}: bad kind/name`);
    });
  });

export function parseCityData(input: unknown): CityData {
  return CityDataSchema.parse(input);
}
