import * as THREE from 'three';
import { bannerTexture, crowdTexture } from '../../scene/textures';
import { offsetPoint, type RibbonSample } from './ribbons';

const TREE_COUNT = 260;

/** Ground height at a point (0 on a flat circuit). */
export type GroundAt = (x: number, z: number) => number;

/** The start / finish gantry with its five lights, at the start line's height. */
export function startGantry(
  p: RibbonSample,
  halfWidth: number,
): { group: THREE.Group; lights: THREE.MeshStandardMaterial[] } {
  const group = new THREE.Group();
  const span = halfWidth + 2;
  const postMat = new THREE.MeshLambertMaterial({ color: '#d0d4da' });
  for (const side of [-1, 1]) {
    const at = offsetPoint(p, side * span);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.5, 7, 0.5), postMat);
    post.position.set(at.x, 3.5, at.z);
    group.add(post);
  }
  const banner = new THREE.Mesh(
    new THREE.PlaneGeometry(span * 2, 1.3),
    new THREE.MeshBasicMaterial({ map: bannerTexture('START / FINISH'), side: THREE.DoubleSide }),
  );
  banner.position.set(p.x, 6.6, p.z);
  // Plane width (local X) must run across the track, along the left vector.
  banner.rotation.y = Math.atan2(-Math.cos(p.heading), -Math.sin(p.heading));
  group.add(banner);

  const lights: THREE.MeshStandardMaterial[] = [];
  for (let i = 0; i < 5; i++) {
    const mat = new THREE.MeshStandardMaterial({
      color: '#2a0000',
      emissive: '#ff1a1a',
      emissiveIntensity: 0,
    });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), mat);
    const at = offsetPoint(p, (i - 2) * 0.9);
    bulb.position.set(at.x, 5.6, at.z);
    group.add(bulb);
    lights.push(mat);
  }
  group.position.y = p.y ?? 0;
  return { group, lights };
}

/** Pines scattered beyond the barriers, standing on the ground. */
export function trees(
  samples: readonly RibbonSample[],
  halfWidth: number,
  runoffM: number,
  groundAt: GroundAt,
): THREE.Group {
  const clear = halfWidth + runoffM + 8;
  const spots: { x: number; z: number; s: number }[] = [];
  const coarse = samples.filter((_, i) => i % 8 === 0);
  for (let k = 0; spots.length < TREE_COUNT && k < TREE_COUNT * 4; k++) {
    const p = samples[Math.floor(Math.random() * samples.length)] as RibbonSample;
    const side = Math.random() > 0.5 ? 1 : -1;
    const at = offsetPoint(p, side * (clear + 6 + Math.random() * 70));
    if (coarse.every((c) => Math.hypot(c.x - at.x, c.z - at.z) > clear)) {
      spots.push({ ...at, s: 0.8 + Math.random() * 0.8 });
    }
  }
  const group = new THREE.Group();
  const crown = new THREE.InstancedMesh(
    new THREE.ConeGeometry(2.6, 7, 7).translate(0, 5.5, 0),
    new THREE.MeshLambertMaterial({ color: '#2f5d2a' }),
    spots.length,
  );
  const trunk = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.3, 0.4, 2.2, 6).translate(0, 1.1, 0),
    new THREE.MeshLambertMaterial({ color: '#5a4030' }),
    spots.length,
  );
  const m = new THREE.Matrix4();
  spots.forEach((t, i) => {
    m.makeScale(t.s, t.s, t.s).setPosition(t.x, groundAt(t.x, t.z), t.z);
    crown.setMatrixAt(i, m);
    trunk.setMatrixAt(i, m);
  });
  group.add(crown, trunk);
  return group;
}

/** Main grandstand along the start straight. */
export function grandstand(
  samples: readonly RibbonSample[],
  halfWidth: number,
  runoffM: number,
): THREE.Group {
  const group = new THREE.Group();
  const crowd = new THREE.MeshLambertMaterial({ map: crowdTexture(), side: THREE.DoubleSide });
  const last = samples[samples.length - 1]?.s ?? 0;
  const stand = samples.filter((p, i) => i % 3 === 0 && (p.s < 120 || p.s > last - 80));
  for (const p of stand) {
    const at = offsetPoint(p, -(halfWidth + runoffM + 6));
    const block = new THREE.Mesh(new THREE.BoxGeometry(6, 5, 6.2), crowd);
    block.position.set(at.x, 2.5 + (p.y ?? 0), at.z);
    block.rotation.y = -p.heading;
    group.add(block);
  }
  return group;
}
