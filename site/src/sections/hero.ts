import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Ctx } from "../scroll/state";

/**
 * Hero (canette) : pose initiale, flottement idle et parallaxe souris tant que le hero est visible.
 * Le fondu du titre au scroll est dans sections/text.ts (phase 1, sans three.js).
 */
export function hero(ctx: Ctx) {
  const section = document.querySelector<HTMLElement>(".s-hero")!;
  Object.assign(ctx.state, ctx.poses.hero());

  if (ctx.reduced) return;

  // Parallaxe souris : la canette s'incline vers le curseur (hero uniquement, souris uniquement)
  const { tilt, idle } = ctx.can;
  const parallax = { weight: 0 };
  if (ctx.pointer.enabled) {
    ctx.stage.onBeforeRender(() => {
      const w = parallax.weight * ctx.pointer.presence;
      tilt.rotation.set(-ctx.pointer.y * 0.18 * w, ctx.pointer.x * 0.35 * w, 0);
      tilt.position.set(ctx.pointer.x * 0.012 * w, ctx.pointer.y * 0.008 * w, 0);
    });
  }

  const float = gsap
    .timeline({ paused: true, repeat: -1, yoyo: true, onUpdate: ctx.stage.invalidate })
    .to(idle.position, { y: 0.004, duration: 2.4, ease: "sine.inOut" }, 0)
    .to(idle.rotation, { y: 0.12, duration: 2.4, ease: "sine.inOut" }, 0);

  // Flottement et parallaxe uniquement pendant le hero. « top bottom » (et non « top top ») :
  // le hero doit être actif dès le chargement, à scroll 0 (sinon rien ne démarre avant un premier scroll)
  ScrollTrigger.create({
    trigger: section,
    start: "top bottom",
    end: "bottom top",
    onToggle: (self) => {
      gsap.to(parallax, { weight: self.isActive ? 1 : 0, duration: 0.6, ease: "power2.out", onUpdate: ctx.stage.invalidate });
      if (self.isActive) {
        float.play();
      } else {
        float.pause();
        gsap.to([idle.position, idle.rotation], { y: 0, duration: 0.4, onUpdate: ctx.stage.invalidate });
      }
    },
  });
}
