import type { Bounds } from './geometry2d';

/**
 * Uniform grid over the map so "what is near this point" only looks at a
 * handful of road segments, buildings and areas. Segments are packed as
 * owner × SEG_STRIDE + segment index.
 */
export const SEG_STRIDE = 4096;

export interface Cell {
  readonly segs: number[];
  readonly buildings: number[];
  readonly areas: number[];
  readonly water: number[];
}

export interface SpatialIndex {
  readonly cellM: number;
  readonly minX: number;
  readonly minZ: number;
  readonly cols: number;
  readonly rows: number;
  readonly cells: (Cell | undefined)[];
}

export function createIndex(bounds: Bounds, cellM: number): SpatialIndex {
  const cols = Math.ceil((bounds.maxX - bounds.minX) / cellM) + 1;
  const rows = Math.ceil((bounds.maxZ - bounds.minZ) / cellM) + 1;
  return { cellM, minX: bounds.minX, minZ: bounds.minZ, cols, rows, cells: [] };
}

const col = (ix: SpatialIndex, x: number) =>
  Math.max(0, Math.min(ix.cols - 1, Math.floor((x - ix.minX) / ix.cellM)));
const row = (ix: SpatialIndex, z: number) =>
  Math.max(0, Math.min(ix.rows - 1, Math.floor((z - ix.minZ) / ix.cellM)));

/** Every cell a box touches (created on demand). */
export function cellsIn(ix: SpatialIndex, b: Bounds, create: boolean, visit: (c: Cell) => void) {
  for (let r = row(ix, b.minZ); r <= row(ix, b.maxZ); r++) {
    for (let c = col(ix, b.minX); c <= col(ix, b.maxX); c++) {
      const k = r * ix.cols + c;
      let cell = ix.cells[k];
      if (!cell && create) {
        cell = { segs: [], buildings: [], areas: [], water: [] };
        ix.cells[k] = cell;
      }
      if (cell) visit(cell);
    }
  }
}

export function cellAt(ix: SpatialIndex, x: number, z: number): Cell | undefined {
  return ix.cells[row(ix, z) * ix.cols + col(ix, x)];
}

/** Unique values from the cells around a box, gathered by `pick`. */
export function gather(
  ix: SpatialIndex,
  b: Bounds,
  pick: (c: Cell) => readonly number[],
): Set<number> {
  const out = new Set<number>();
  cellsIn(ix, b, false, (c) => {
    for (const v of pick(c)) out.add(v);
  });
  return out;
}
