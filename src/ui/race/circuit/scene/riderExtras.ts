import * as THREE from 'three';

/**
 * What items do to a bike on screen: a see-through shield bubble, a flame
 * out of the exhaust on a boost, and the skateboard — while it lasts the bike
 * is swapped for a kick scooter with the rider standing on it.
 */
export interface RiderExtras {
  readonly group: THREE.Group;
  update(state: { skate?: boolean; shield?: boolean; boost?: boolean }, bike: THREE.Group): void;
  dispose(): void;
}

function kickScooter(color: string): THREE.Group {
  const g = new THREE.Group();
  const metal = new THREE.MeshLambertMaterial({ color: '#c8ccd2' });
  const wheel = new THREE.MeshLambertMaterial({ color: '#1a1a1a' });
  const body = new THREE.MeshLambertMaterial({ color });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.8), metal);
  deck.position.set(0, 0.12, 0.05);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.9, 6), metal);
  stem.position.set(0, 0.55, -0.38);
  const bar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.45, 6).rotateZ(Math.PI / 2),
    metal,
  );
  bar.position.set(0, 1.0, -0.38);
  for (const z of [-0.38, 0.42]) {
    const w = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 0.05, 10).rotateZ(Math.PI / 2),
      wheel,
    );
    w.position.set(0, 0.09, z);
    g.add(w);
  }
  // Standing rider: legs, body, head.
  const legs = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.75, 0.16),
    new THREE.MeshLambertMaterial({ color: '#2b3340' }),
  );
  legs.position.set(0, 0.52, 0.12);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.55, 0.2), body);
  torso.position.set(0, 1.17, 0.02);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), body);
  head.position.set(0, 1.56, 0);
  g.add(deck, stem, bar, legs, torso, head);
  return g;
}

export function createRiderExtras(color: string): RiderExtras {
  const group = new THREE.Group();
  const skate = kickScooter(color);
  const shield = new THREE.Mesh(
    new THREE.SphereGeometry(1.4, 16, 10),
    new THREE.MeshStandardMaterial({
      color: '#7fd4ff',
      emissive: '#2a8cff',
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    }),
  );
  shield.position.y = 0.8;
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.16, 0.9, 8).rotateX(Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: '#ff8a1f', transparent: true, opacity: 0.85 }),
  );
  // Behind the bike (models face −Z, so behind is +Z), at exhaust height.
  flame.position.set(0.18, 0.45, 1.25);
  group.add(skate, shield, flame);
  let t = 0;
  return {
    group,
    update(state, bike) {
      const skating = state.skate === true;
      skate.visible = skating;
      bike.visible = !skating;
      shield.visible = state.shield === true;
      flame.visible = state.boost === true && !skating;
      t += 1;
      if (flame.visible) flame.scale.setScalar(0.85 + 0.25 * Math.abs(Math.sin(t * 0.7)));
    },
    dispose() {
      group.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          (o.material as THREE.Material).dispose();
        }
      });
    },
  };
}
