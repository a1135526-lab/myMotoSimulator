import * as THREE from 'three';

/**
 * High-resolution procedural textures for the city, drawn once on 2D canvases
 * (no image assets to ship). All are mip-mapped with anisotropic filtering so
 * surfaces stay sharp at grazing angles instead of shimmering or going blocky.
 */

export interface TextureOptions {
  readonly anisotropy: number;
}

type Draw = (ctx: CanvasRenderingContext2D, size: number, rnd: () => number) => void;

export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function canvasTexture(
  size: number,
  draw: Draw,
  opts: TextureOptions,
  seed: number,
  color = true,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  draw(ctx, size, seeded(seed));
  const tex = new THREE.CanvasTexture(canvas);
  if (color) tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = opts.anisotropy;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

/** Fine speckle on top of a base colour, for aggregate / concrete grain. */
export function speckle(
  ctx: CanvasRenderingContext2D,
  size: number,
  rnd: () => number,
  count: number,
  shades: [number, number],
  alpha: number,
  grain = 1.6,
) {
  for (let i = 0; i < count; i++) {
    const s = shades[0] + rnd() * (shades[1] - shades[0]);
    ctx.fillStyle = `rgb(${s} ${s} ${s + 2} / ${alpha})`;
    ctx.fillRect(rnd() * size, rnd() * size, grain * (0.5 + rnd()), grain * (0.5 + rnd()));
  }
}

/** Blotches of slightly different tone: patching, wear, stains. */
export function blotches(
  ctx: CanvasRenderingContext2D,
  size: number,
  rnd: () => number,
  count: number,
  color: (rnd: () => number) => string,
  radius: [number, number],
) {
  for (let i = 0; i < count; i++) {
    const r = radius[0] + rnd() * (radius[1] - radius[0]);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, color(rnd));
    g.addColorStop(1, 'rgb(0 0 0 / 0)');
    ctx.save();
    ctx.translate(rnd() * size, rnd() * size);
    ctx.scale(1, 0.4 + rnd() * 0.8);
    ctx.fillStyle = g;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();
  }
}

/** Road asphalt: dark binder, light aggregate, worn wheel tracks. One tile ≈ 8 m. */
export const asphaltTexture = (o: TextureOptions) =>
  canvasTexture(
    1024,
    (ctx, n, rnd) => {
      ctx.fillStyle = '#3a3b3e';
      ctx.fillRect(0, 0, n, n);
      blotches(
        ctx,
        n,
        rnd,
        40,
        (r) => `rgb(${50 + r() * 20} ${50 + r() * 20} ${54 + r() * 20} / 0.35)`,
        [40, 160],
      );
      speckle(ctx, n, rnd, 90000, [20, 60], 0.55, 1.6);
      speckle(ctx, n, rnd, 26000, [90, 150], 0.45, 1.4);
      // Darker, smoother tyre tracks running along the lane.
      for (const x of [0.25, 0.75]) {
        const g = ctx.createLinearGradient(n * (x - 0.08), 0, n * (x + 0.08), 0);
        g.addColorStop(0, 'rgb(0 0 0 / 0)');
        g.addColorStop(0.5, 'rgb(15 15 18 / 0.18)');
        g.addColorStop(1, 'rgb(0 0 0 / 0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, n, n);
      }
      // A few sealed cracks.
      ctx.strokeStyle = 'rgb(18 18 20 / 0.55)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 7; i++) {
        ctx.beginPath();
        let x = rnd() * n;
        let y = rnd() * n;
        ctx.moveTo(x, y);
        for (let k = 0; k < 8; k++) {
          x += (rnd() - 0.5) * 70;
          y += (rnd() - 0.2) * 60;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    },
    o,
    11,
  );

/** Sidewalk pavers in a running bond, with joints and wear. One tile ≈ 4 m. */
export const paverTexture = (o: TextureOptions) =>
  canvasTexture(
    1024,
    (ctx, n, rnd) => {
      ctx.fillStyle = '#8f8a83';
      ctx.fillRect(0, 0, n, n);
      const rows = 16;
      const h = n / rows;
      const w = h * 2;
      for (let r = 0; r < rows; r++) {
        const off = r % 2 === 0 ? 0 : w / 2;
        for (let c = -1; c < n / w + 1; c++) {
          const tone = 128 + rnd() * 34;
          const warm = rnd() < 0.15 ? 18 : 0;
          ctx.fillStyle = `rgb(${tone + warm} ${tone - 4} ${tone - 10 - warm})`;
          ctx.fillRect(c * w + off + 2, r * h + 2, w - 4, h - 4);
        }
      }
      speckle(ctx, n, rnd, 50000, [70, 170], 0.25, 1.2);
      blotches(ctx, n, rnd, 18, () => 'rgb(40 38 34 / 0.18)', [30, 110]);
    },
    o,
    12,
  );

/** Kerb / concrete. */
export const concreteTexture = (o: TextureOptions) =>
  canvasTexture(
    512,
    (ctx, n, rnd) => {
      ctx.fillStyle = '#a9a6a0';
      ctx.fillRect(0, 0, n, n);
      speckle(ctx, n, rnd, 30000, [120, 200], 0.3, 1.3);
      blotches(ctx, n, rnd, 14, () => 'rgb(70 66 60 / 0.2)', [20, 90]);
    },
    o,
    13,
  );

export const grassTexture = (o: TextureOptions) =>
  canvasTexture(
    1024,
    (ctx, n, rnd) => {
      ctx.fillStyle = '#4b6a33';
      ctx.fillRect(0, 0, n, n);
      blotches(
        ctx,
        n,
        rnd,
        60,
        (r) => `rgb(${60 + r() * 40} ${90 + r() * 40} ${40 + r() * 20} / 0.35)`,
        [30, 140],
      );
      for (let i = 0; i < 70000; i++) {
        const g = 70 + rnd() * 70;
        ctx.strokeStyle = `rgb(${g * 0.55} ${g} ${g * 0.35} / 0.6)`;
        ctx.lineWidth = 1;
        const x = rnd() * n;
        const y = rnd() * n;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (rnd() - 0.5) * 3, y - 2 - rnd() * 5);
        ctx.stroke();
      }
    },
    o,
    14,
  );

export const roofTexture = (o: TextureOptions) =>
  canvasTexture(
    512,
    (ctx, n, rnd) => {
      ctx.fillStyle = '#7d7b78';
      ctx.fillRect(0, 0, n, n);
      speckle(ctx, n, rnd, 25000, [90, 150], 0.35, 1.5);
      blotches(ctx, n, rnd, 20, () => 'rgb(40 42 38 / 0.25)', [20, 100]);
      ctx.strokeStyle = 'rgb(60 60 58 / 0.5)';
      for (let i = 0; i <= 4; i++) {
        ctx.beginPath();
        ctx.moveTo(0, (i * n) / 4);
        ctx.lineTo(n, (i * n) / 4);
        ctx.stroke();
      }
    },
    o,
    15,
  );

/** Shop sign faces: bright panels with big characters, lit at night. */
export const SIGN_TEXTS: readonly { text: string; bg: string; fg: string }[] = [
  { text: '便利商店', bg: '#0b8a4b', fg: '#ffffff' },
  { text: '機車行', bg: '#d32f2f', fg: '#ffffff' },
  { text: '牛肉麵', bg: '#ffcc00', fg: '#b71c1c' },
  { text: '藥局', bg: '#1565c0', fg: '#ffffff' },
  { text: '咖啡', bg: '#4e342e', fg: '#ffe0b2' },
  { text: '早餐店', bg: '#ff7043', fg: '#ffffff' },
  { text: '眼鏡', bg: '#ffffff', fg: '#1a237e' },
  { text: '旅館', bg: '#6a1b9a', fg: '#ffeb3b' },
];

export function signTexture(index: number, o: TextureOptions): THREE.CanvasTexture {
  const s = SIGN_TEXTS[index % SIGN_TEXTS.length] ?? SIGN_TEXTS[0];
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx || !s) throw new Error('2D canvas unavailable');
  ctx.fillStyle = s.bg;
  ctx.fillRect(0, 0, 128, 512);
  ctx.strokeStyle = 'rgb(255 255 255 / 0.6)';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 116, 500);
  ctx.fillStyle = s.fg;
  ctx.font = 'bold 84px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const chars = [...s.text];
  const step = 480 / chars.length;
  chars.forEach((ch, i) => ctx.fillText(ch, 64, 18 + step * (i + 0.5)));
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = o.anisotropy;
  return tex;
}
