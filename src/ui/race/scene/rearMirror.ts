import * as THREE from 'three';

/**
 * Rear-view mirror: the scene seen backwards from the rider's head, drawn
 * into a frame the HUD lays out (an element marked `data-mirror-slot`), and
 * flipped left-to-right as a real mirror shows it. Rendered into a texture,
 * then onto a mirrored quad in the slot's viewport.
 */

/** Vertical field of view, deg; the slot is wide, so it sees well to the sides. */
const MIRROR_FOV = 26;
const EYE_HEIGHT_M = 1.2;
/** Looks a touch down the road behind. */
const PITCH_RAD = -0.03;
const NEAR_M = 0.6;
const FAR_M = 900;

/** SwiftShader / llvmpipe and friends: WebGL emulated on the CPU. */
export function isSoftwareRenderer(gl: WebGLRenderingContext | WebGL2RenderingContext): boolean {
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  const name = String(
    gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? '',
  ).toLowerCase();
  return /swiftshader|llvmpipe|softpipe|software|basic render/.test(name);
}

/** Yaw that turns a camera (looking down −Z) to face along heading h. */
const yawFor = (heading: number) => Math.atan2(-Math.cos(heading), -Math.sin(heading));

export interface RiderEye {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** Direction of travel; the mirror looks the other way. */
  readonly heading: number;
}

export class RearMirror {
  private readonly camera = new THREE.PerspectiveCamera(MIRROR_FOV, 3, NEAR_M, FAR_M);
  private readonly target = new THREE.WebGLRenderTarget(1, 1);
  private readonly overlay = new THREE.Scene();
  private readonly overlayCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly quadMaterial: THREE.MeshBasicMaterial;
  private readonly quad: THREE.Mesh;
  /** Software WebGL (CI) is too slow to draw the scene twice. */
  private readonly disabled: boolean;

  constructor(private readonly renderer: THREE.WebGLRenderer) {
    this.camera.rotation.order = 'YXZ';
    this.target.texture.colorSpace = THREE.SRGBColorSpace;
    this.quadMaterial = new THREE.MeshBasicMaterial({
      map: this.target.texture,
      toneMapped: false,
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.quadMaterial);
    // Mirrored left to right (three flips the face winding for a negative scale).
    this.quad.scale.x = -1;
    this.overlay.add(this.quad);
    this.overlayCamera.position.z = 0.5;
    this.disabled = isSoftwareRenderer(renderer.getContext());
  }

  /**
   * Draw the mirror into `slot` (in canvas CSS pixels, top-left origin), with
   * `hidden` (the rider's own bike, the cockpit) left out of the reflection.
   */
  render(
    scene: THREE.Scene,
    eye: RiderEye,
    slot: DOMRect | null,
    hidden: readonly THREE.Object3D[],
  ): void {
    if (this.disabled || !slot || slot.width < 8 || slot.height < 8) return;
    const r = this.renderer;
    const size = r.getSize(new THREE.Vector2());
    const ratio = r.getPixelRatio();
    const w = Math.round(slot.width * ratio);
    const h = Math.round(slot.height * ratio);
    if (this.target.width !== w || this.target.height !== h) this.target.setSize(w, h);
    this.camera.aspect = slot.width / slot.height;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(eye.x, eye.y + EYE_HEIGHT_M, eye.z);
    this.camera.rotation.set(PITCH_RAD, yawFor(eye.heading + Math.PI), 0);

    const wasVisible = hidden.map((o) => o.visible);
    hidden.forEach((o) => (o.visible = false));
    const shadows = r.shadowMap.autoUpdate;
    // The shadow map was just drawn for the main view; reuse it.
    r.shadowMap.autoUpdate = false;
    r.setRenderTarget(this.target);
    r.render(scene, this.camera);
    r.setRenderTarget(null);
    r.shadowMap.autoUpdate = shadows;
    hidden.forEach((o, i) => (o.visible = wasVisible[i] ?? true));

    // Viewport origin is bottom-left.
    const y = size.y - slot.y - slot.height;
    r.setScissorTest(true);
    r.setScissor(slot.x, y, slot.width, slot.height);
    r.setViewport(slot.x, y, slot.width, slot.height);
    r.render(this.overlay, this.overlayCamera);
    r.setScissorTest(false);
    r.setViewport(0, 0, size.x, size.y);
  }

  dispose(): void {
    this.target.dispose();
    this.quad.geometry.dispose();
    this.quadMaterial.dispose();
  }
}

/** Where the HUD's mirror frame sits on the canvas (CSS px), or null if there isn't one. */
export function mirrorSlot(canvas: HTMLCanvasElement): DOMRect | null {
  const el = canvas.parentElement?.querySelector('[data-mirror-slot]');
  if (!el) return null;
  const c = canvas.getBoundingClientRect();
  const s = el.getBoundingClientRect();
  // The frame's border is drawn by the page; the picture goes inside it.
  const inset = el.clientLeft;
  return new DOMRect(
    s.left - c.left + inset,
    s.top - c.top + inset,
    s.width - inset * 2,
    s.height - inset * 2,
  );
}
