import "lenis/dist/lenis.css";
import "../../brand/fonts/fonts.css"; // polices locales (WOFF2), empaquetées et hashées par Vite
import "./styles.css";
import * as THREE from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { setupLenis } from "./scroll/lenis";
import { applyState, createPoses, type Ctx } from "./scroll/state";
import { createStage } from "./three/stage";
import { loadCan } from "./three/can";
import { createPalette } from "./three/palette";
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
  };
  stage.onBeforeRender(() => applyState(ctx.state, stage, can, palette));

  hero(ctx);
  spin(ctx);
  zoom(ctx);
  flavorsScroll(ctx);
  cta(ctx);

  ScrollTrigger.refresh();
  stage.invalidate();
  requestAnimationFrame(() => loader.classList.add("is-done"));

  // HDRI studio (512 Ko) chargée après le premier affichage : ne retarde pas l'apparition de la canette
  stage
    .loadEnvironment(`${import.meta.env.BASE_URL}env/studio_small_03_512.hdr`, ENV_ROTATION)
    .then(() => document.documentElement.classList.add("env-ready"))
    .catch((err: unknown) => console.warn("HDRI non chargée, studio de repli conservé", err));

  if (new URLSearchParams(location.search).has("debug")) exposeDebug(stage, can);
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
  loader.querySelector(".loader__bar")?.remove();
  loader.append(Object.assign(document.createElement("p"), { textContent: "Impossible de charger la canette 3D." }));
});
