import type * as THREE from 'three';
import { blotches, canvasTexture, speckle, type TextureOptions } from './cityTextures';

/** Building facades: window grids per style, plus a matching map of lit windows for night. */

/** Facade styles; each texture tile covers FACADE_TILE_M metres. */
export type FacadeStyle = 'glass' | 'office' | 'apartment' | 'industrial';
export const FACADE_STYLES: readonly FacadeStyle[] = ['glass', 'office', 'apartment', 'industrial'];

/** Width × height of one facade tile, m: columns × bays, floors × storey height. */
export const FACADE_TILE_M: Readonly<Record<FacadeStyle, { w: number; h: number }>> = {
  glass: { w: 6, h: 8 },
  office: { w: 12, h: 14 },
  apartment: { w: 12, h: 12 },
  industrial: { w: 16, h: 8 },
};

interface FacadeLayout {
  readonly cols: number;
  readonly floors: number;
  /** Window rectangle inside its cell, as fractions. */
  readonly win: { x: number; y: number; w: number; h: number };
}

const LAYOUT: Readonly<Record<FacadeStyle, FacadeLayout>> = {
  glass: { cols: 4, floors: 2, win: { x: 0.03, y: 0.04, w: 0.94, h: 0.92 } },
  office: { cols: 4, floors: 4, win: { x: 0.1, y: 0.25, w: 0.8, h: 0.55 } },
  apartment: { cols: 4, floors: 4, win: { x: 0.18, y: 0.28, w: 0.64, h: 0.48 } },
  industrial: { cols: 4, floors: 2, win: { x: 0.08, y: 0.62, w: 0.84, h: 0.2 } },
};

function drawFacade(
  style: FacadeStyle,
  ctx: CanvasRenderingContext2D,
  n: number,
  rnd: () => number,
) {
  const { cols, floors, win } = LAYOUT[style];
  const cw = n / cols;
  const fh = n / floors;
  // Wall
  if (style === 'glass') {
    const g = ctx.createLinearGradient(0, 0, 0, n);
    g.addColorStop(0, '#5f7f8f');
    g.addColorStop(1, '#3d5664');
    ctx.fillStyle = g;
  } else if (style === 'industrial') {
    ctx.fillStyle = '#9ea7ad';
  } else if (style === 'apartment') {
    ctx.fillStyle = '#cfc6b8';
  } else {
    ctx.fillStyle = '#b8b4ad';
  }
  ctx.fillRect(0, 0, n, n);
  if (style === 'apartment') {
    // Small mosaic tiles, the classic Taiwanese apartment finish.
    for (let y = 0; y < n; y += 8) {
      for (let x = (y / 8) % 2 === 0 ? 0 : 4; x < n; x += 8) {
        const t = 190 + rnd() * 30;
        ctx.fillStyle = `rgb(${t} ${t - 8} ${t - 22})`;
        ctx.fillRect(x + 0.5, y + 0.5, 7, 7);
      }
    }
  }
  if (style === 'industrial') {
    // Corrugated cladding.
    for (let x = 0; x < n; x += 10) {
      const g = ctx.createLinearGradient(x, 0, x + 10, 0);
      g.addColorStop(0, 'rgb(255 255 255 / 0.18)');
      g.addColorStop(0.5, 'rgb(0 0 0 / 0.12)');
      g.addColorStop(1, 'rgb(255 255 255 / 0.18)');
      ctx.fillStyle = g;
      ctx.fillRect(x, 0, 10, n);
    }
  }
  speckle(ctx, n, rnd, 12000, [80, 200], 0.08, 1.4);

  for (let f = 0; f < floors; f++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cw + win.x * cw;
      const y = f * fh + win.y * fh;
      const w = win.w * cw;
      const h = win.h * fh;
      const g = ctx.createLinearGradient(x, y, x + w, y + h);
      const sky = style === 'glass' ? 0.0 : 0.15 + rnd() * 0.25;
      g.addColorStop(0, `rgb(${70 + sky * 120} ${95 + sky * 120} ${110 + sky * 110})`);
      g.addColorStop(1, `rgb(${25 + sky * 40} ${35 + sky * 50} ${45 + sky * 50})`);
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w, h);
      // Mullions / frames
      ctx.strokeStyle = style === 'glass' ? 'rgb(30 40 45 / 0.9)' : 'rgb(70 72 74)';
      ctx.lineWidth = style === 'glass' ? 3 : 4;
      ctx.strokeRect(x, y, w, h);
      ctx.beginPath();
      ctx.moveTo(x + w / 2, y);
      ctx.lineTo(x + w / 2, y + h);
      ctx.stroke();
      if (style === 'apartment') {
        // Window grille (鐵窗) and an air-conditioner box under some windows.
        ctx.strokeStyle = 'rgb(60 62 60 / 0.85)';
        ctx.lineWidth = 2;
        for (let k = 1; k < 6; k++) {
          ctx.beginPath();
          ctx.moveTo(x + (w * k) / 6, y - 4);
          ctx.lineTo(x + (w * k) / 6, y + h + 4);
          ctx.stroke();
        }
        ctx.strokeRect(x - 4, y - 4, w + 8, h + 8);
        if (rnd() < 0.55) {
          ctx.fillStyle = '#e6e4de';
          ctx.fillRect(x + w * 0.15, y + h + 8, w * 0.42, fh * 0.14);
          ctx.fillStyle = 'rgb(80 80 80 / 0.6)';
          for (let k = 0; k < 5; k++) ctx.fillRect(x + w * 0.17 + k * 6, y + h + 12, 3, fh * 0.1);
        }
      }
    }
    // Floor band / slab edge
    ctx.fillStyle = style === 'glass' ? 'rgb(25 32 36 / 0.85)' : 'rgb(90 88 84 / 0.45)';
    ctx.fillRect(0, f * fh, n, style === 'glass' ? 5 : 8);
  }
  // Streaks of grime running down from the windows.
  blotches(ctx, n, rnd, 10, () => 'rgb(40 38 35 / 0.12)', [20, 60]);
}

/** Lit windows at night: same grid, random rooms switched on in warm or cool light. */
function drawWindowsLit(
  style: FacadeStyle,
  ctx: CanvasRenderingContext2D,
  n: number,
  rnd: () => number,
) {
  const { cols, floors, win } = LAYOUT[style];
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, n, n);
  const cw = n / cols;
  const fh = n / floors;
  const share = style === 'glass' ? 0.55 : style === 'industrial' ? 0.3 : 0.45;
  for (let f = 0; f < floors; f++) {
    for (let c = 0; c < cols; c++) {
      if (rnd() > share) continue;
      const warm = rnd() < 0.7;
      const k = 0.55 + rnd() * 0.45;
      ctx.fillStyle = warm
        ? `rgb(${255 * k} ${200 * k} ${130 * k})`
        : `rgb(${190 * k} ${220 * k} ${255 * k})`;
      ctx.fillRect(
        c * cw + win.x * cw + 3,
        f * fh + win.y * fh + 3,
        win.w * cw - 6,
        win.h * fh - 6,
      );
    }
  }
}

export interface FacadeTextures {
  readonly map: THREE.Texture;
  readonly emissive: THREE.Texture;
}

export function facadeTextures(style: FacadeStyle, o: TextureOptions): FacadeTextures {
  const seed = FACADE_STYLES.indexOf(style) * 31 + 101;
  return {
    map: canvasTexture(512, (ctx, n, rnd) => drawFacade(style, ctx, n, rnd), o, seed),
    emissive: canvasTexture(256, (ctx, n, rnd) => drawWindowsLit(style, ctx, n, rnd), o, seed + 7),
  };
}
