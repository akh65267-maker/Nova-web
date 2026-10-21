import {
  AmbientLight,
  BufferGeometry,
  Color,
  DirectionalLight,
  DodecahedronGeometry,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshStandardMaterial,
  OctahedronGeometry,
  PerspectiveCamera,
  Scene,
  TorusGeometry,
  WebGLRenderer,
} from "three";

// Loaded on demand by hero-shapes.tsx, so none of three.js is in the page's first bundle.

// `at` is the shape's place in the frame, -1..1 on each axis; `base` is the same place in scene units.
type Shape = { mesh: Mesh; at: { x: number; y: number }; base: { x: number; y: number }; spin: number; drift: number; phase: number; depth: number };

const PALETTE = ["#6366f1", "#f472b6", "#34d399", "#fbbf24", "#60a5fa"];
const MAX_PIXEL_RATIO = 1.5;

function geometries(): BufferGeometry[] {
  return [new IcosahedronGeometry(0.9, 0), new TorusGeometry(0.75, 0.28, 16, 48), new OctahedronGeometry(0.85, 0), new DodecahedronGeometry(0.8, 0), new TorusGeometry(0.55, 0.2, 12, 36)];
}

/** Starts the scene on `canvas` and returns what stops it and frees the GPU memory. */
export function mountScene(canvas: HTMLCanvasElement, { compact }: { compact: boolean }): () => void {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: !compact, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));

  const scene = new Scene();
  const camera = new PerspectiveCamera(40, 1, 0.1, 50);
  camera.position.z = 9;

  scene.add(new AmbientLight("#ffffff", 1.6));
  const key = new DirectionalLight("#ffffff", 2.2);
  key.position.set(3, 4, 5);
  scene.add(key);

  const group = new Group();
  scene.add(group);

  const meshGeometries = geometries();
  const materials: MeshStandardMaterial[] = [];
  const count = compact ? 3 : 5;
  const shapes: Shape[] = Array.from({ length: count }, (_, i) => {
    const material = new MeshStandardMaterial({ color: new Color(PALETTE[i % PALETTE.length]), roughness: 0.35, metalness: 0.1, transparent: true, opacity: 0.85 });
    materials.push(material);
    const mesh = new Mesh(meshGeometries[i % meshGeometries.length], material);
    // Mostly on the right of the frame, where the hero leaves room.
    const at = { x: [0.55, 0.82, 0.3, 0.05, 0.92][i] ?? 0, y: [0.55, -0.45, -0.75, 0.75, 0.7][i] ?? 0 };
    mesh.scale.setScalar(0.5 + (i % 3) * 0.12);
    group.add(mesh);
    return { mesh, at, base: { x: 0, y: 0 }, spin: 0.12 + i * 0.05, drift: 0.25 + i * 0.07, phase: i * 1.7, depth: 0.4 + (i % 3) * 0.3 };
  });

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const onPointerMove = (event: PointerEvent) => {
    pointer.tx = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (event.clientY / window.innerHeight) * 2 - 1;
  };
  if (!compact) window.addEventListener("pointermove", onPointerMove, { passive: true });

  const resize = () => {
    const { clientWidth: width, clientHeight: height } = canvas;
    if (width === 0 || height === 0) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    const halfHeight = Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
    for (const shape of shapes) {
      shape.base.x = shape.at.x * halfHeight * camera.aspect;
      shape.base.y = shape.at.y * halfHeight;
    }
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  // Draws only while the hero is on screen and the tab is visible.
  let visible = true;
  let frame = 0;
  let last = performance.now();

  const draw = (now: number) => {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const t = now / 1000;

    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;
    for (const shape of shapes) {
      shape.mesh.rotation.x += shape.spin * dt;
      shape.mesh.rotation.y += shape.spin * 1.3 * dt;
      shape.mesh.position.x = shape.base.x + pointer.x * shape.depth;
      shape.mesh.position.y = shape.base.y + Math.sin(t * shape.drift + shape.phase) * 0.35 - pointer.y * shape.depth;
    }
    renderer.render(scene, camera);
    frame = requestAnimationFrame(draw);
  };

  const sync = () => {
    cancelAnimationFrame(frame);
    if (visible && !document.hidden) {
      last = performance.now();
      frame = requestAnimationFrame(draw);
    }
  };
  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  });
  intersection.observe(canvas);
  document.addEventListener("visibilitychange", sync);
  sync();

  return () => {
    cancelAnimationFrame(frame);
    intersection.disconnect();
    observer.disconnect();
    document.removeEventListener("visibilitychange", sync);
    window.removeEventListener("pointermove", onPointerMove);
    for (const geometry of meshGeometries) geometry.dispose();
    for (const material of materials) material.dispose();
    renderer.dispose();
  };
}
