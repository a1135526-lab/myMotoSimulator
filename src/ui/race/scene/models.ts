import * as THREE from 'three';

/** Low-poly bike + rider, ~2 m long, facing −Z. Wheels spin via `update`. */
export interface BikeModel {
  readonly group: THREE.Group;
  update(distanceM: number, speedMps: number): void;
}

const WHEEL_RADIUS_M = 0.31;

export function createBikeModel(color: string, scooter: boolean): BikeModel {
  const group = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color });
  const dark = new THREE.MeshLambertMaterial({ color: '#1b1d22' });
  const skin = new THREE.MeshLambertMaterial({ color: '#2a2f3a' });

  const wheels: THREE.Mesh[] = [];
  for (const zPos of [-0.7, 0.7]) {
    const wheel = new THREE.Mesh(
      new THREE.CylinderGeometry(WHEEL_RADIUS_M, WHEEL_RADIUS_M, 0.16, 18),
      dark,
    );
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(0, WHEEL_RADIUS_M, zPos);
    wheels.push(wheel);
    group.add(wheel);
  }

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.45, scooter ? 1.3 : 1.1), paint);
  body.position.set(0, 0.62, scooter ? 0.15 : 0);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.55, 0.35), paint);
  nose.position.set(0, scooter ? 0.75 : 0.9, -0.6);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.7), dark);
  seat.position.set(0, scooter ? 0.92 : 0.95, 0.35);
  group.add(body, nose, seat);

  // Rider: tucked torso, helmet, arms to the bars.
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.6, 0.3), skin);
  torso.position.set(0, 1.25, 0.25);
  torso.rotation.x = -0.6;
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), paint);
  helmet.position.set(0, 1.55, -0.05);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.5), skin);
  legs.position.set(0, 0.95, 0.35);
  group.add(torso, helmet, legs);

  return {
    group,
    update: (distanceM) => {
      for (const w of wheels) w.rotation.x = -distanceM / WHEEL_RADIUS_M;
    },
  };
}

/** First-person handlebars and dash, attached to the camera. */
export function createCockpit(): THREE.Group {
  const group = new THREE.Group();
  const black = new THREE.MeshLambertMaterial({ color: '#15171b' });
  const chrome = new THREE.MeshLambertMaterial({ color: '#8a8f98' });

  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.75, 8), chrome);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, -0.42, -0.62);
  const dash = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.12), black);
  dash.position.set(0, -0.36, -0.7);
  dash.rotation.x = -0.4;
  group.add(bar, dash);
  for (const side of [-1, 1]) {
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.14, 10), black);
    grip.rotation.z = Math.PI / 2;
    grip.position.set(side * 0.4, -0.43, -0.6);
    group.add(grip);
  }
  return group;
}

/** Drag-strip tree: 3 amber + 1 green bulb per lane, plus red false-start bulbs. */
export interface TreeModel {
  readonly group: THREE.Group;
  set(lights: { ambers: readonly boolean[]; green: boolean; red: [boolean, boolean] }): void;
}

export function createTree(): TreeModel {
  const group = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 3, 0.25),
    new THREE.MeshLambertMaterial({ color: '#202227' }),
  );
  pole.position.y = 1.5;
  group.add(pole);

  const bulb = (color: string, x: number, y: number) => {
    const mat = new THREE.MeshStandardMaterial({
      color: '#222',
      emissive: color,
      emissiveIntensity: 0,
    });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), mat);
    mesh.position.set(x, y, 0.15);
    group.add(mesh);
    return mat;
  };
  const lane = (x: number) => ({
    ambers: [bulb('#ffb300', x, 2.7), bulb('#ffb300', x, 2.45), bulb('#ffb300', x, 2.2)],
    green: bulb('#00e676', x, 1.95),
    red: bulb('#ff1744', x, 1.7),
  });
  const lanes = [lane(-0.2), lane(0.2)];

  return {
    group,
    set: ({ ambers, green, red }) => {
      lanes.forEach((l, i) => {
        l.ambers.forEach((m, j) => (m.emissiveIntensity = ambers[j] ? 2.5 : 0));
        l.green.emissiveIntensity = green ? 3 : 0;
        l.red.emissiveIntensity = red[i] ? 3 : 0;
      });
    },
  };
}
