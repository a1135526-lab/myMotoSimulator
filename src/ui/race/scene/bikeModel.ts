import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/** Bike + rider, ~2 m long, facing −Z. Wheels spin via `update`. */
export interface BikeModel {
  readonly group: THREE.Group;
  update(distanceM: number, speedMps: number): void;
}

const std = (color: string, roughness: number, metalness = 0, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });

interface Part {
  readonly geo: THREE.BufferGeometry;
  readonly mat: THREE.Material;
  readonly pos: readonly [number, number, number];
  readonly rotX?: number;
}

/** Tyre, rim, spokes and brake disc; spins about its local x axis. */
function wheel(radius: number, rubber: THREE.Material, rim: THREE.Material, disc: THREE.Material) {
  const g = new THREE.Group();
  const tyre = new THREE.Mesh(
    new THREE.TorusGeometry(radius - 0.055, 0.058, 14, 40).rotateY(Math.PI / 2),
    rubber,
  );
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(radius - 0.1, radius - 0.1, 0.1, 32, 1, true).rotateZ(Math.PI / 2),
    rim,
  );
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 0.16, 12).rotateZ(Math.PI / 2),
    rim,
  );
  const brake = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.5, radius * 0.5, 0.012, 28).rotateZ(Math.PI / 2),
    disc,
  );
  brake.position.x = 0.07;
  g.add(tyre, barrel, hub, brake);
  for (let k = 0; k < 5; k++) {
    const spoke = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, radius - 0.12, 0.045).translate(0, (radius - 0.12) / 2, 0),
      rim,
    );
    spoke.rotation.x = (k / 5) * Math.PI * 2;
    g.add(spoke);
  }
  return g;
}

function addParts(group: THREE.Group, parts: readonly Part[]) {
  for (const p of parts) {
    const mesh = new THREE.Mesh(p.geo, p.mat);
    mesh.position.set(...p.pos);
    mesh.rotation.x = p.rotX ?? 0;
    group.add(mesh);
  }
}

const rbox = (w: number, h: number, d: number, r = 0.05) => new RoundedBoxGeometry(w, h, d, 3, r);
const tube = (r0: number, r1: number, len: number) => new THREE.CylinderGeometry(r0, r1, len, 14);

function scooterBody(paint: THREE.Material, m: Record<string, THREE.Material>): Part[] {
  return [
    { geo: rbox(0.36, 0.08, 0.55), mat: m.black as THREE.Material, pos: [0, 0.3, -0.05] },
    { geo: rbox(0.44, 0.78, 0.2, 0.08), mat: paint, pos: [0, 0.7, -0.5], rotX: 0.28 },
    { geo: rbox(0.3, 0.14, 0.34, 0.06), mat: paint, pos: [0, 0.5, -0.72] },
    { geo: rbox(0.52, 0.14, 0.22, 0.06), mat: paint, pos: [0, 1.12, -0.52] },
    { geo: rbox(0.2, 0.07, 0.04, 0.02), mat: m.headlight as THREE.Material, pos: [0, 1.0, -0.63] },
    { geo: rbox(0.42, 0.44, 0.95, 0.12), mat: paint, pos: [0, 0.66, 0.36] },
    { geo: rbox(0.33, 0.1, 0.78, 0.05), mat: m.black as THREE.Material, pos: [0, 0.92, 0.26] },
    { geo: rbox(0.1, 0.22, 0.55, 0.04), mat: m.rim as THREE.Material, pos: [0.19, 0.38, 0.5] },
    {
      geo: tube(0.045, 0.055, 0.5),
      mat: m.chrome as THREE.Material,
      pos: [-0.2, 0.42, 0.62],
      rotX: Math.PI / 2 - 0.2,
    },
    { geo: rbox(0.26, 0.07, 0.04, 0.02), mat: m.tail as THREE.Material, pos: [0, 0.82, 0.84] },
    {
      geo: tube(0.024, 0.024, 0.68),
      mat: m.chrome as THREE.Material,
      pos: [0.08, 0.62, -0.62],
      rotX: 0.35,
    },
    {
      geo: tube(0.024, 0.024, 0.68),
      mat: m.chrome as THREE.Material,
      pos: [-0.08, 0.62, -0.62],
      rotX: 0.35,
    },
  ];
}

function sportBody(paint: THREE.Material, m: Record<string, THREE.Material>): Part[] {
  return [
    {
      geo: tube(0.028, 0.028, 0.78),
      mat: m.chrome as THREE.Material,
      pos: [0.09, 0.68, -0.6],
      rotX: 0.42,
    },
    {
      geo: tube(0.028, 0.028, 0.78),
      mat: m.chrome as THREE.Material,
      pos: [-0.09, 0.68, -0.6],
      rotX: 0.42,
    },
    { geo: rbox(0.42, 0.42, 0.52, 0.1), mat: paint, pos: [0, 0.92, -0.56], rotX: 0.35 },
    {
      geo: rbox(0.32, 0.02, 0.3, 0.01),
      mat: m.visor as THREE.Material,
      pos: [0, 1.17, -0.62],
      rotX: 0.95,
    },
    {
      geo: rbox(0.24, 0.07, 0.03, 0.015),
      mat: m.headlight as THREE.Material,
      pos: [0, 0.87, -0.84],
    },
    {
      geo: new THREE.SphereGeometry(0.28, 24, 16).scale(1, 0.62, 1.35),
      mat: paint,
      pos: [0, 0.98, -0.14],
    },
    { geo: rbox(0.38, 0.36, 0.72, 0.1), mat: paint, pos: [0, 0.58, -0.22] },
    { geo: rbox(0.34, 0.3, 0.4, 0.05), mat: m.black as THREE.Material, pos: [0, 0.44, 0.06] },
    { geo: rbox(0.28, 0.08, 0.48, 0.04), mat: m.black as THREE.Material, pos: [0, 0.96, 0.32] },
    { geo: rbox(0.26, 0.15, 0.42, 0.06), mat: paint, pos: [0, 1.02, 0.62], rotX: -0.22 },
    { geo: rbox(0.18, 0.05, 0.03, 0.015), mat: m.tail as THREE.Material, pos: [0, 1.02, 0.84] },
    {
      geo: tube(0.05, 0.065, 0.55),
      mat: m.chrome as THREE.Material,
      pos: [0.18, 0.56, 0.52],
      rotX: Math.PI / 2 - 0.35,
    },
    {
      geo: rbox(0.06, 0.06, 0.62, 0.02),
      mat: m.rim as THREE.Material,
      pos: [0.13, 0.36, 0.38],
      rotX: -0.08,
    },
    {
      geo: rbox(0.06, 0.06, 0.62, 0.02),
      mat: m.rim as THREE.Material,
      pos: [-0.13, 0.36, 0.38],
      rotX: -0.08,
    },
  ];
}

/** Rider: sport bikes tucked in, scooters sitting up. */
function rider(
  group: THREE.Group,
  scooter: boolean,
  helmet: THREE.Material,
  jacket: THREE.Material,
  visor: THREE.Material,
) {
  const tuck = scooter ? 0.18 : 0.75;
  const hipZ = scooter ? 0.22 : 0.3;
  const hipY = scooter ? 1.0 : 1.02;
  const torsoLen = 0.42;
  const shoulderY = hipY + Math.cos(tuck) * (torsoLen + 0.17);
  const shoulderZ = hipZ - Math.sin(tuck) * (torsoLen + 0.17);
  const head: [number, number, number] = [0, shoulderY + 0.17, shoulderZ - 0.05];
  addParts(group, [
    {
      geo: new THREE.CapsuleGeometry(0.17, torsoLen, 6, 14),
      mat: jacket,
      pos: [0, (hipY + shoulderY) / 2, (hipZ + shoulderZ) / 2],
      rotX: -tuck,
    },
    { geo: new THREE.SphereGeometry(0.155, 20, 16), mat: helmet, pos: head },
    {
      geo: new THREE.SphereGeometry(
        0.158,
        20,
        12,
        Math.PI * 0.7,
        Math.PI * 0.6,
        Math.PI * 0.35,
        Math.PI * 0.3,
      ),
      mat: visor,
      pos: head,
    },
  ]);
  const gripZ = -0.5;
  const gripY = scooter ? 1.12 : 0.98;
  for (const side of [-1, 1]) {
    const armLen = Math.hypot(shoulderY - gripY, shoulderZ - gripZ);
    const arm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.05, Math.max(0.1, armLen - 0.1), 4, 10),
      jacket,
    );
    arm.position.set(side * 0.25, (shoulderY + gripY) / 2, (shoulderZ + gripZ) / 2);
    arm.rotation.x = -Math.atan2(shoulderZ - gripZ, shoulderY - gripY);
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.38, 4, 10), jacket);
    thigh.position.set(side * 0.2, hipY - 0.05, hipZ - 0.22);
    thigh.rotation.x = Math.PI / 2 - (scooter ? 0.1 : 0.35);
    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.36, 4, 10), jacket);
    shin.position.set(
      side * (scooter ? 0.16 : 0.2),
      scooter ? 0.62 : 0.68,
      hipZ - (scooter ? 0.42 : 0.3),
    );
    shin.rotation.x = scooter ? 0.15 : 0.6;
    group.add(arm, thigh, shin);
  }
}

export function createBikeModel(color: string, scooter: boolean): BikeModel {
  const group = new THREE.Group();
  const paint = std(color, 0.32, 0.35);
  const m: Record<string, THREE.Material> = {
    black: std('#17191d', 0.6, 0.1),
    rim: std('#9aa0a7', 0.3, 0.85),
    chrome: std('#dfe3e8', 0.12, 1),
    visor: std('#0b0f14', 0.05, 0.8),
    headlight: std('#fffbe8', 0.2, 0, { emissive: '#fff4d6', emissiveIntensity: 1.4 }),
    tail: std('#5a0a0a', 0.3, 0, { emissive: '#ff1a1a', emissiveIntensity: 1.1 }),
  };
  const rubber = std('#111214', 0.92);
  const disc = std('#c6cbd0', 0.25, 0.95);
  const jacket = std('#23262d', 0.75);

  const radius = scooter ? 0.27 : 0.31;
  const axles = scooter ? [-0.66, 0.62] : [-0.74, 0.68];
  const wheels = axles.map((z) => {
    const w = wheel(radius, rubber, m.rim as THREE.Material, disc);
    w.position.set(0, radius, z);
    group.add(w);
    return w;
  });
  addParts(group, scooter ? scooterBody(paint, m) : sportBody(paint, m));
  rider(group, scooter, paint, jacket, m.visor as THREE.Material);

  group.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  return {
    group,
    update: (distanceM) => {
      for (const w of wheels) w.rotation.x = -distanceM / radius;
    },
  };
}
