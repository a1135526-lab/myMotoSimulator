import * as THREE from 'three';

const POOL = 160;
const LIFE_S = 1.1;
const RISE_MPS = 0.9;
const GROW_PER_S = 1.6;
/** Puffs per second at full slide. */
const RATE_PER_S = 45;

interface Puff {
  readonly sprite: THREE.Sprite;
  age: number;
}

function puffTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(235,235,235,0.9)');
    g.addColorStop(1, 'rgba(235,235,235,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  return new THREE.CanvasTexture(canvas);
}

/** Pooled sprite puffs behind sliding rear tyres. */
export class TyreSmoke {
  readonly group = new THREE.Group();
  private readonly puffs: Puff[] = [];
  private readonly texture = puffTexture();
  private next = 0;
  private owed = 0;

  constructor() {
    for (let i = 0; i < POOL; i++) {
      const material = new THREE.SpriteMaterial({
        map: this.texture,
        transparent: true,
        depthWrite: false,
        opacity: 0,
      });
      const sprite = new THREE.Sprite(material);
      sprite.visible = false;
      this.group.add(sprite);
      this.puffs.push({ sprite, age: LIFE_S });
    }
  }

  /** Queue puffs at a rear contact patch for a slide of 0–1. */
  emit(x: number, z: number, intensity: number, dt: number): void {
    this.owed += intensity * RATE_PER_S * dt;
    while (this.owed >= 1) {
      this.owed -= 1;
      const puff = this.puffs[this.next];
      this.next = (this.next + 1) % POOL;
      if (!puff) continue;
      puff.age = 0;
      puff.sprite.visible = true;
      puff.sprite.position.set(
        x + (Math.random() - 0.5) * 0.5,
        0.3,
        z + (Math.random() - 0.5) * 0.5,
      );
    }
  }

  update(dt: number): void {
    for (const puff of this.puffs) {
      if (puff.age >= LIFE_S) continue;
      puff.age += dt;
      const t = Math.min(1, puff.age / LIFE_S);
      const scale = 0.6 + puff.age * GROW_PER_S;
      puff.sprite.scale.set(scale, scale, 1);
      puff.sprite.position.y += RISE_MPS * dt;
      (puff.sprite.material as THREE.SpriteMaterial).opacity = 0.38 * (1 - t);
      if (t >= 1) puff.sprite.visible = false;
    }
  }

  dispose(): void {
    this.texture.dispose();
    for (const puff of this.puffs) puff.sprite.material.dispose();
  }
}
