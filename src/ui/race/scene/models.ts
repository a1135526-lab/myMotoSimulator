import * as THREE from 'three';

export { createBikeModel, type BikeModel } from './bikeModel';

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
