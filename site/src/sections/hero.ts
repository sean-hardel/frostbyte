import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Ctx } from "../scroll/state";

/** Hero : pose initiale, flottement idle tant que le hero est visible, titre qui s'efface au scroll. */
export function hero(ctx: Ctx) {
  const section = document.querySelector<HTMLElement>(".s-hero")!;
  Object.assign(ctx.state, ctx.poses.hero());

  gsap.to(".hero__title", {
    yPercent: -30,
    opacity: 0,
    ease: "none",
    scrollTrigger: { trigger: section, start: "top top", end: "bottom top", scrub: ctx.scrub },
  });

  if (ctx.reduced) return;

  const { idle } = ctx.can;
  const float = gsap
    .timeline({ paused: true, repeat: -1, yoyo: true, onUpdate: ctx.stage.invalidate })
    .to(idle.position, { y: 0.004, duration: 2.4, ease: "sine.inOut" }, 0)
    .to(idle.rotation, { y: 0.12, duration: 2.4, ease: "sine.inOut" }, 0);

  // Le flottement ne tourne (et ne force de rendu) que pendant le hero
  ScrollTrigger.create({
    trigger: section,
    start: "top top",
    end: "bottom top",
    onToggle: (self) => {
      if (self.isActive) {
        float.play();
      } else {
        float.pause();
        gsap.to([idle.position, idle.rotation], { y: 0, duration: 0.4, onUpdate: ctx.stage.invalidate });
      }
    },
  });
}
