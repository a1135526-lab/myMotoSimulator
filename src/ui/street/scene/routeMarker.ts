import * as THREE from 'three';
import type { NavView } from '@/application';
import { QuadBuilder } from './geometryBuilder';
import { band } from './polyline';

/** The sat-nav route painted on the road ahead, and a beam of light over the destination. */

const RIBBON_Y = 0.09;
const RIBBON_W = 1.4;
const BEACON_H = 60;

export class RouteMarker {
  readonly group = new THREE.Group();
  private route: NavView['route'] | null = null;
  private ribbon: THREE.Mesh | null = null;
  private readonly ribbonMat = new THREE.MeshBasicMaterial({
    color: '#2fb4ff',
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
  private readonly beacon: THREE.Mesh;

  constructor() {
    this.beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 1.6, BEACON_H, 20, 1, true).translate(0, BEACON_H / 2, 0),
      new THREE.MeshBasicMaterial({
        color: '#ff3b5c',
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: false,
      }),
    );
    this.beacon.visible = false;
    this.group.add(this.beacon);
  }

  update(nav: NavView | null): void {
    this.beacon.visible = nav !== null && !nav.arrived;
    if (nav) this.beacon.position.set(nav.route.end.x, 0, nav.route.end.z);
    const route = nav && !nav.arrived ? nav.route : null;
    if (route === this.route) return;
    this.route = route;
    if (this.ribbon) {
      this.group.remove(this.ribbon);
      this.ribbon.geometry.dispose();
      this.ribbon = null;
    }
    if (!route || route.points.length < 2) return;
    const b = new QuadBuilder();
    band(b, route.points, -RIBBON_W / 2, RIBBON_W / 2, RIBBON_Y, 1);
    this.ribbon = new THREE.Mesh(b.build(), this.ribbonMat);
    this.group.add(this.ribbon);
  }

  dispose(): void {
    this.ribbon?.geometry.dispose();
    this.ribbonMat.dispose();
    this.beacon.geometry.dispose();
    (this.beacon.material as THREE.Material).dispose();
  }
}
