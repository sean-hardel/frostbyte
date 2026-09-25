import "lenis/dist/lenis.css";
import "./styles.css";
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
}

init().catch((err: unknown) => {
  console.error(err);
  loader.querySelector(".loader__bar")?.remove();
  loader.append(Object.assign(document.createElement("p"), { textContent: "Impossible de charger la canette 3D." }));
});
