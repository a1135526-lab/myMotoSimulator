import * as THREE from 'three';

/** Procedural textures drawn on a 2D canvas — no image assets to ship. */

function canvasTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  draw(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

export function asphaltTexture(): THREE.Texture {
  const tex = canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = '#2b2d31';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 5000; i++) {
      const shade = 30 + Math.floor(Math.random() * 40);
      ctx.fillStyle = `rgb(${shade},${shade},${shade + 3})`;
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 1.5);
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function grassTexture(): THREE.Texture {
  const tex = canvasTexture(128, 128, (ctx) => {
    ctx.fillStyle = '#2f4a25';
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 1500; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#3a5a2c' : '#26401e';
      ctx.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function checkerTexture(): THREE.Texture {
  const tex = canvasTexture(128, 32, (ctx) => {
    const cell = 16;
    for (let x = 0; x < 128; x += cell) {
      for (let y = 0; y < 32; y += cell) {
        ctx.fillStyle = (x / cell + y / cell) % 2 === 0 ? '#ffffff' : '#111111';
        ctx.fillRect(x, y, cell, cell);
      }
    }
  });
  tex.wrapS = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  return tex;
}

export function labelTexture(text: string, bg = '#ffcc00', fg = '#111111'): THREE.Texture {
  return canvasTexture(256, 128, (ctx) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 256, 128);
    ctx.strokeStyle = fg;
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, 248, 120);
    ctx.fillStyle = fg;
    ctx.font = 'bold 64px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 68);
  });
}

export function bannerTexture(text: string): THREE.Texture {
  return canvasTexture(1024, 128, (ctx) => {
    ctx.fillStyle = '#c81d25';
    ctx.fillRect(0, 0, 1024, 128);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 92px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 512, 70);
  });
}

export function crowdTexture(): THREE.Texture {
  const tex = canvasTexture(256, 64, (ctx) => {
    ctx.fillStyle = '#3a3f4a';
    ctx.fillRect(0, 0, 256, 64);
    const colors = ['#e63946', '#f1faee', '#a8dadc', '#ffb703', '#219ebc', '#fb8500', '#8ecae6'];
    for (let row = 0; row < 4; row++) {
      for (let x = 0; x < 256; x += 6) {
        ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)] ?? '#fff';
        ctx.beginPath();
        ctx.arc(x + 3 + Math.random() * 2, 10 + row * 15, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}
