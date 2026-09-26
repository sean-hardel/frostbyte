import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { gsap } from "gsap";

export type Stage = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  isMobile: boolean;
  /** Taille visible (m) d'un plan situé à `distance` de la caméra. */
  visibleAt(distance: number): { w: number; h: number };
  /** Demande un rendu à la prochaine frame. */
  invalidate(): void;
  /** Appelé juste avant chaque rendu (application de l'état animé). */
  onBeforeRender(fn: () => void): void;
  /** Remplace l'environnement par une HDRI équirectangulaire (reflets du métal). */
  loadEnvironment(url: string, rotationY?: number): Promise<void>;
};

export function createStage(canvas: HTMLCanvasElement): Stage {
  const isMobile = matchMedia("(max-width: 767px), (pointer: coarse)").matches;
  const dpr = Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: dpr < 2,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);
  // Neutral (Khronos PBR) : garde les couleurs de marque et le contraste du métal (AgX les délave)
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();

  // Premier rendu : studio calculé localement (immédiat) ; remplacé par l'HDRI réel dès qu'il est chargé
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new RoomEnvironment();
  scene.environment = pmrem.fromScene(envScene, 0.04).texture;
  envScene.dispose();

  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(1.5, 2, 3);
  scene.add(key);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 10);

  let dirty = true;
  const beforeRender: Array<() => void> = [];

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    dirty = true;
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  gsap.ticker.add(() => {
    if (!dirty) return;
    dirty = false;
    for (const fn of beforeRender) fn();
    renderer.render(scene, camera);
  });

  return {
    renderer,
    scene,
    camera,
    isMobile,
    visibleAt(distance) {
      const h = 2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      return { w: h * camera.aspect, h };
    },
    invalidate() {
      dirty = true;
    },
    onBeforeRender(fn) {
      beforeRender.push(fn);
    },
    async loadEnvironment(url, rotationY = 0) {
      const hdr = await new HDRLoader().loadAsync(url);
      hdr.mapping = THREE.EquirectangularReflectionMapping;
      const previous = scene.environment;
      scene.environment = pmrem.fromEquirectangular(hdr).texture;
      scene.environmentRotation.set(0, rotationY, 0);
      hdr.dispose();
      previous?.dispose();
      pmrem.dispose();
      dirty = true;
    },
  };
}
