import * as THREE from 'three';

type Vec3 = readonly [number, number, number];

/**
 * Accumulates quads into one BufferGeometry (positions, normals, UVs and
 * optional vertex colours), so a whole city's walls or road markings are a
 * single draw call.
 */
export class QuadBuilder {
  private readonly positions: number[] = [];
  private readonly normals: number[] = [];
  private readonly uvs: number[] = [];
  private readonly colors: number[] = [];
  private readonly indices: number[] = [];

  /**
   * a, b, c, d: bottom-left, bottom-right, top-right, top-left as seen from
   * the front (counter-clockwise). uv: [u0, v0, u1, v1].
   */
  quad(
    a: Vec3,
    b: Vec3,
    c: Vec3,
    d: Vec3,
    normal: Vec3,
    uv: readonly [number, number, number, number] = [0, 0, 1, 1],
    color: THREE.Color | null = null,
  ): void {
    const base = this.positions.length / 3;
    this.positions.push(...a, ...b, ...c, ...d);
    for (let i = 0; i < 4; i++) this.normals.push(...normal);
    const [u0, v0, u1, v1] = uv;
    this.uvs.push(u0, v0, u1, v0, u1, v1, u0, v1);
    if (color) for (let i = 0; i < 4; i++) this.colors.push(color.r, color.g, color.b);
    this.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  /** Flat rectangle facing up at height y; UVs in world metres / tile. */
  floor(x0: number, z0: number, x1: number, z1: number, y: number, tile: number) {
    const uv: [number, number, number, number] = [x0 / tile, -z1 / tile, x1 / tile, -z0 / tile];
    this.quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], [0, 1, 0], uv);
  }

  /**
   * Vertical wall from (ax, az) to (bx, bz): a is on the left and b on the
   * right for someone standing outside looking at it. UVs in metres / tile.
   */
  wall(
    ax: number,
    az: number,
    bx: number,
    bz: number,
    y0: number,
    y1: number,
    tileW: number,
    tileH: number,
    uOffset = 0,
    color: THREE.Color | null = null,
  ) {
    const len = Math.hypot(bx - ax, bz - az);
    // Viewer's right is r = (b − a)/len, and r = (−n) × up, so n = (−r_z, 0, r_x).
    const nx = -(bz - az) / len;
    const nz = (bx - ax) / len;
    this.quad(
      [ax, y0, az],
      [bx, y0, bz],
      [bx, y1, bz],
      [ax, y1, az],
      [nx, 0, nz],
      [uOffset, y0 / tileH, uOffset + len / tileW, y1 / tileH],
      color,
    );
  }

  /** Axis-aligned box (sides + top), e.g. a kerbed slab. */
  box(x0: number, z0: number, x1: number, z1: number, y0: number, y1: number, tile: number) {
    this.floor(x0, z0, x1, z1, y1, tile);
    this.wall(x0, z1, x1, z1, y0, y1, tile, tile); // south
    this.wall(x1, z0, x0, z0, y0, y1, tile, tile); // north
    this.wall(x1, z1, x1, z0, y0, y1, tile, tile); // east
    this.wall(x0, z0, x0, z1, y0, y1, tile, tile); // west
  }

  get empty(): boolean {
    return this.indices.length === 0;
  }

  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.normals, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uvs, 2));
    if (this.colors.length > 0) {
      g.setAttribute('color', new THREE.Float32BufferAttribute(this.colors, 3));
    }
    g.setIndex(this.indices);
    g.computeBoundingSphere();
    return g;
  }
}
