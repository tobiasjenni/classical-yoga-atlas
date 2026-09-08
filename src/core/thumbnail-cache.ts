import {
  AmbientLight,
  Box3,
  Vector3,
  CircleGeometry,
  Color,
  DirectionalLight,
  GridHelper,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Vector4,
  WebGLRenderTarget,
  type WebGLRenderer,
} from 'three';
import { makeRig, applyPose } from './rig';
import type { Pose } from './schema';
import type { ModelStyle } from './appearance';
// GPU-only previews derived from pose data. No bitmap files, data URLs or image downloads.
// One reusable skinned mannequin renders all atlas targets; each card displays its cached texture.
function createEngine(style: ModelStyle) {
  const scene = new Scene(),
    rig = makeRig(style);
  scene.add(rig.group);
  scene.add(new AmbientLight(0xffffff, 1.45));
  const key = new DirectionalLight(new Color('#fff1dc'), 2.5);
  key.position.set(3, 5, 4);
  scene.add(key);
  const fill = new DirectionalLight(new Color('#d5e2de'), 1.2);
  fill.position.set(-3, 2, -2);
  scene.add(fill);
  const floor = new Mesh(
    new CircleGeometry(1.15, 48),
    new MeshStandardMaterial({ color: '#c5c9b8', roughness: 1, transparent: true, opacity: 0.22 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.02;
  scene.add(floor);
  const grid = new GridHelper(2.6, 16, '#aeb39f', '#c2c6b7');
  grid.position.y = -0.025;
  const material = Array.isArray(grid.material) ? grid.material[0] : grid.material;
  material.transparent = true;
  material.opacity = 0.28;
  scene.add(grid);
  return {
    style,
    scene,
    rig,
    floor,
    grid,
    cache: new Map<string, { signature: string; target: WebGLRenderTarget }>(),
  };
}
const engines = new WeakMap<WebGLRenderer, ReturnType<typeof createEngine>>();
export function cachedThumbnail(
  gl: WebGLRenderer,
  id: string,
  pose: Pose,
  width: number,
  height: number,
  hero: boolean,
  style: ModelStyle = 'reference',
) {
  let engine = engines.get(gl);
  if (!engine) {
    engine = createEngine(style);
    engines.set(gl, engine);
  }
  if (engine.style !== style) {
    engine.scene.remove(engine.rig.group);
    engine.rig.mesh.skeleton.dispose();
    engine.rig = makeRig(style);
    engine.scene.add(engine.rig.group);
    engine.style = style;
  }
  const key = `${id}-${hero ? 'hero' : 'card'}`,
    signature = `${style}:${Math.round(width)}x${Math.round(height)}:${JSON.stringify(pose)}`;
  const old = engine.cache.get(key);
  if (old?.signature === signature) return old.target.texture;
  // Cap render size rather than allocating at the device's full pixel ratio.
  const aspect = Math.max(0.1, width / Math.max(1, height)),
    w = Math.min(768, Math.max(128, Math.round(width * 1.3))),
    h = Math.max(64, Math.round(w / aspect));
  const target = new WebGLRenderTarget(w, h, { depthBuffer: true });
  target.texture.colorSpace = SRGBColorSpace;
  const camera = new PerspectiveCamera(hero ? 29 : 33, aspect, 0.1, 20);
  applyPose(engine.rig, pose);
  engine.rig.mesh.skeleton.update();
  const bounds = new Box3(),
    point = new Vector3();
  const vertices = engine.rig.mesh.geometry.getAttribute('position');
  for (let i = 0; i < vertices.count; i++) {
    point.fromBufferAttribute(vertices, i);
    engine.rig.mesh.applyBoneTransform(i, point);
    bounds.expandByPoint(point);
  }
  const center = bounds.getCenter(new Vector3());
  const radius = bounds.getSize(new Vector3()).length() / 2;
  const halfFov = Math.min(
    (camera.fov * Math.PI) / 360,
    Math.atan(Math.tan((camera.fov * Math.PI) / 360) * aspect),
  );
  const distance = (radius * 1.12) / Math.sin(halfFov);
  camera.position.copy(center).addScaledVector(new Vector3(1.85, 1, 2.5).normalize(), distance);
  camera.lookAt(center);
  camera.updateMatrixWorld();
  const previous = gl.getRenderTarget(),
    viewport = gl.getViewport(new Vector4()),
    scissor = gl.getScissor(new Vector4()),
    scissorTest = gl.getScissorTest(),
    color = gl.getClearColor(new Color()),
    alpha = gl.getClearAlpha();
  try {
    gl.setRenderTarget(target);
    gl.setScissorTest(false);
    gl.setClearColor(0x000000, 0);
    gl.clear();
    gl.render(engine.scene, camera);
  } finally {
    gl.setRenderTarget(previous);
    gl.setViewport(viewport);
    gl.setScissor(scissor);
    gl.setScissorTest(scissorTest);
    gl.setClearColor(color, alpha);
  }
  old?.target.dispose();
  engine.cache.set(key, { signature, target });
  return target.texture;
}
export function disposeThumbnailCache(gl: WebGLRenderer) {
  const engine = engines.get(gl);
  if (!engine) return;
  for (const entry of engine.cache.values()) entry.target.dispose();
  engine.rig.mesh.skeleton.dispose();
  engine.floor.geometry.dispose();
  engine.floor.material.dispose();
  engine.grid.geometry.dispose();
  for (const material of Array.isArray(engine.grid.material)
    ? engine.grid.material
    : [engine.grid.material])
    material.dispose();
  engines.delete(gl);
}
