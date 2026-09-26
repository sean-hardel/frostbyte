import "lenis/dist/lenis.css";
import "../../brand/fonts/fonts.css"; // polices locales (WOFF2), empaquetées et hashées par Vite
import "./styles.css";
import * as THREE from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { setupLenis } from "./scroll/lenis";
import { applyState, createPoses, type Ctx } from "./scroll/state";
import { driveSegments } from "./scroll/segment";
import { createStage } from "./three/stage";
import { applyCondensation, loadCan } from "./three/can";
import { createPalette } from "./three/palette";
import { createParticles } from "./three/particles";
import { createPointer } from "./input/pointer";
import condensationNormalUrl from "../../blender/textures/condensation_normal.webp";
import condensationMaskUrl from "../../blender/textures/condensation_mask.webp";
import { brand } from "./brand";
import { hero } from "./sections/hero";
import { spin } from "./sections/spin";
import { zoom } from "./sections/zoom";
import { buildFlavorSections, flavorsScroll } from "./sections/flavors";
import { cta } from "./sections/cta";

gsap.registerPlugin(ScrollTrigger);
// Mobile : la barre d'adresse qui se replie ne doit pas relancer tous les calculs
ScrollTrigger.config({ ignoreMobileResize: true });

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const loader = document.querySelector<HTMLElement>("#loader")!;

async function init() {
  buildFlavorSections();
  // Lenis avant la scène : son tick passe avant le rendu dans le ticker GSAP
  setupLenis(reduced);

  const stage = createStage(document.querySelector<HTMLCanvasElement>("#webgl")!);
  const can = await loadCan(stage);
  const palette = createPalette(can);
  const poses = createPoses(stage);

  const ctx: Ctx = {
    stage,
    can,
    state: poses.hero(),
    poses,
    reduced,
    scrub: reduced ? true : 0.8,
    pointer: createPointer(reduced, stage.invalidate),
  };
  stage.onBeforeRender(() => applyState(ctx.state, stage, can, palette));
  setupParticles(ctx, palette.accent);

  hero(ctx);
  spin(ctx);
  zoom(ctx);
  flavorsScroll(ctx);
  cta(ctx);
  driveSegments(ctx);

  ScrollTrigger.refresh();
  stage.invalidate();
  // Le cristal finit de se dessiner (branches, pixels) avant que l'écran de chargement s'efface
  loader.classList.add("is-loaded");
  setTimeout(() => loader.classList.add("is-done"), reduced ? 0 : 750);

  // Assets non critiques, chargés après le premier affichage :
  // HDRI studio (512 Ko) pour les reflets, condensation (246 Ko) sur l'étiquette
  stage
    .loadEnvironment(`${import.meta.env.BASE_URL}env/studio_small_03_512.hdr`, ENV_ROTATION)
    .then(() => document.documentElement.classList.add("env-ready"))
    .catch((err: unknown) => console.warn("HDRI non chargée, studio de repli conservé", err));
  applyCondensation(can, stage, condensationNormalUrl, condensationMaskUrl).catch((err: unknown) =>
    console.warn("Condensation non chargée", err),
  );

  if (new URLSearchParams(location.search).has("debug")) exposeDebug(stage, can);
}

/**
 * Particules de givre : défilent avec le scroll (parallaxe), s'excitent avec la vitesse de scroll,
 * s'écartent de la souris. Mises à jour juste avant chaque rendu (rendu à la demande).
 */
function setupParticles(ctx: Ctx, accent: THREE.Color) {
  const { stage, pointer, reduced } = ctx;
  const particles = createParticles(stage, new THREE.Color(brand.colors.frost));
  const velocity = { v: 0 };
  if (!reduced) {
    ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => {
        velocity.v = THREE.MathUtils.clamp(self.getVelocity() / 2500, -1, 1);
        gsap.to(velocity, { v: 0, duration: 0.8, ease: "power2.out", overwrite: true, onUpdate: stage.invalidate });
      },
    });
  }
  const u = particles.uniforms;
  stage.onBeforeRender(() => {
    u.uScroll.value = reduced ? 0 : (window.scrollY / innerHeight) * 0.12;
    u.uVelocity.value = velocity.v;
    u.uMouse.value.set(pointer.x, pointer.y, pointer.enabled ? pointer.presence : 0);
    u.uAspect.value = stage.camera.aspect;
    u.uAccent.value.copy(accent);
  });
}

/** Rotation de l'HDRI autour de Y : place le grand softbox en reflet sur la face avant. */
const ENV_ROTATION = -Math.PI / 2 + 0.9;

/** Outils de vérification (?debug) : rectangle écran de la canette, pour les tests de chevauchement. */
function exposeDebug(stage: ReturnType<typeof createStage>, can: Awaited<ReturnType<typeof loadCan>>) {
  const box = new THREE.Box3();
  const corner = new THREE.Vector3();
  (window as unknown as { __fb: unknown }).__fb = {
    canRect() {
      can.pivot.updateMatrixWorld(true);
      stage.camera.updateMatrixWorld();
      box.setFromObject(can.pivot, true);
      const xs: number[] = [];
      const ys: number[] = [];
      for (let i = 0; i < 8; i++) {
        corner.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z);
        corner.project(stage.camera);
        xs.push(((corner.x + 1) / 2) * innerWidth);
        ys.push(((1 - corner.y) / 2) * innerHeight);
      }
      return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
    },
  };
}

init().catch((err: unknown) => {
  console.error(err);
  loader.classList.add("is-error");
  loader.append(Object.assign(document.createElement("p"), { textContent: "Impossible de charger la canette 3D." }));
});
