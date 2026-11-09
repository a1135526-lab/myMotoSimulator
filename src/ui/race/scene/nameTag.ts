import * as THREE from 'three';

const WIDTH_PX = 256;
const HEIGHT_PX = 64;
/** Size in the world, m, and height above the ground. */
const TAG_W_M = 2.2;
const TAG_H_M = TAG_W_M * (HEIGHT_PX / WIDTH_PX);
export const TAG_HEIGHT_M = 2.35;

/**
 * A name floating over a bike, in the rider's colour, so you can tell who's
 * who on track. Returns null where there's no 2D canvas (tests).
 */
export function createNameTag(name: string, color: string): THREE.Sprite | null {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH_PX;
  canvas.height = HEIGHT_PX;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = 'rgba(8, 10, 14, 0.72)';
  ctx.beginPath();
  ctx.roundRect(2, 8, WIDTH_PX - 4, HEIGHT_PX - 16, 12);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.fillRect(10, 16, 8, HEIGHT_PX - 32);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(name, WIDTH_PX / 2 + 6, HEIGHT_PX / 2, WIDTH_PX - 40);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, depthWrite: false, transparent: true }),
  );
  sprite.scale.set(TAG_W_M, TAG_H_M, 1);
  sprite.position.y = TAG_HEIGHT_M;
  return sprite;
}
