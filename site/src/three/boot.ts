import * as THREE from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { applyState, createPoses, type Ctx } from "../scroll/state";
import { driveSegments } from "../scroll/segment";
import { createStage, type Stage } from "./stage";
import { applyCondensation, loadCan, type Can } from "./can";
import { createPalette } from "./palette";
import { createParticles, type Particles } from "./particles";
import { createPointer } from "../input/pointer";
import condensationNormalUrl from "../../../blender/textures/condensation_normal.webp";
import condensationMaskUrl from "../../../blender/textures/condensation_mask.webp";
import { brand } from "../brand";
import { hero } from "../sections/hero";
import { spin } from "../sections/spin";
import { zoom } from "../sections/zoom";
import { flavorsScroll } from "../sections/flavors";
import { trailer } from "../sections/trailer";
import { cta } from "../sections/cta";

/*
  Phase 2 (chargée à la demande par main.ts, au premier geste de l'utilisateur) : toute la 3D.
  Jusqu'ici, une image fixe de la canette (public/hero-can.webp, capturée depuis cette même scène)
  tient la place dans le hero. Quand le premier rendu est prêt, fondu image → canvas.
*/

/** Rotation de l'HDRI autour de Y : place le grand softbox en reflet sur la face avant. */
const ENV_ROTATION = -Math.PI / 2 + 0.9;

export async function boot({ reduced }: { reduced: boolean }) {
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
  const particles = setupParticles(ctx, palette.accent);

  hero(ctx);
  spin(ctx);
  zoom(ctx);
  flavorsScroll(ctx);
  trailer(ctx);
  cta(ctx);
  driveSegments(ctx);
  ScrollTrigger.refresh();

  // Shaders compilés sans bloquer (KHR_parallel_shader_compile quand disponible), puis premier rendu
  await stage.renderer.compileAsync(stage.scene, stage.camera);
  stage.renderNow();
  requestAnimationFrame(() => document.documentElement.classList.add("is-3d"));

  // Assets non critiques : HDRI studio (512 Ko) pour les reflets, condensation (246 Ko) sur l'étiquette
  const envReady = stage
    .loadEnvironment(`${import.meta.env.BASE_URL}env/studio_small_03_512.hdr`, ENV_ROTATION)
    .catch((err: unknown) => console.warn("HDRI non chargée, studio de repli conservé", err));
  const condensationReady = applyCondensation(can, stage, condensationNormalUrl, condensationMaskUrl).catch(
    (err: unknown) => console.warn("Condensation non chargée", err),
  );

  if (new URLSearchParams(location.search).has("debug")) {
    exposeDebug(stage, can, particles, Promise.all([envReady, condensationReady]));
  }
}

/**
 * Particules de givre : défilent avec le scroll (parallaxe), s'excitent avec la vitesse de scroll,
 * s'écartent de la souris. Mises à jour juste avant chaque rendu (rendu à la demande).
 */
function setupParticles(ctx: Ctx, accent: THREE.Color): Particles {
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
  return particles;
}

/**
 * Outils de vérification (?debug) :
 * - canRect() : rectangle écran de la canette (tests de chevauchement)
 * - snapshot() : image de la canette en pose hero, sans particules, fond transparent, recadrée,
 *   avec l'échelle px/m — utilisée par scripts/make-hero-poster.mjs pour public/hero-can.webp
 */
function exposeDebug(stage: Stage, can: Can, particles: Particles, assetsReady: Promise<unknown>) {
  const box = new THREE.Box3();
  const corner = new THREE.Vector3();
  const canRect = () => {
    can.pivot.updateMatrixWorld(true);
    stage.camera.updateMatrixWorld();
    box.setFromObject(can.pivot, true);
    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i < 8; i++) {
      corner.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z);
      corner.project(stage.camera);
      const c = stage.renderer.domElement; // dimensions du canvas (et non de la fenêtre, qui peut différer sur mobile)
      xs.push(((corner.x + 1) / 2) * c.clientWidth);
      ys.push(((1 - corner.y) / 2) * c.clientHeight);
    }
    return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
  };

  (window as unknown as { __fb: unknown }).__fb = {
    canRect,
    async snapshot() {
      await assetsReady;
      particles.points.visible = false;
      can.idle.position.set(0, 0, 0); // pose hero exacte : ni flottement ni parallaxe
      can.idle.rotation.set(0, 0, 0);
      can.tilt.position.set(0, 0, 0);
      can.tilt.rotation.set(0, 0, 0);
      stage.renderNow();
      const canvas = stage.renderer.domElement;
      const dpr = canvas.width / canvas.clientWidth;
      const r = canRect();
      const pad = 4;
      const [x, y] = [Math.floor(r.left - pad), Math.floor(r.top - pad)];
      const [w, h] = [Math.ceil(r.right - r.left + 2 * pad), Math.ceil(r.bottom - r.top + 2 * pad)];
      const out = document.createElement("canvas");
      out.width = Math.round(w * dpr);
      out.height = Math.round(h * dpr);
      out.getContext("2d")!.drawImage(canvas, x * dpr, y * dpr, w * dpr, h * dpr, 0, 0, out.width, out.height);
      particles.points.visible = true;
      const ppm = canvas.clientHeight / (2 * stage.camera.position.z * Math.tan(THREE.MathUtils.degToRad(stage.camera.fov / 2)));
      return {
        rect: r, // rectangle écran de la canette au moment exact de la capture (pose hero figée)
        dataUrl: out.toDataURL("image/webp", 0.86),
        // Boîte en mètres dans le plan de la canette, origine au centre de l'écran, y vers le haut
        box: { w: w / ppm, h: h / ppm, cx: (x + w / 2 - canvas.clientWidth / 2) / ppm, cy: -(y + h / 2 - canvas.clientHeight / 2) / ppm },
      };
    },
  };
}
