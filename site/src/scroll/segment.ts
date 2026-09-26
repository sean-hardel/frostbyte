import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Ctx, SceneState } from "./state";

/*
  Chaque section pilote la canette pendant son propre intervalle de scroll :
  du moment où son haut entre par le bas de l'écran jusqu'à ce que son bas y arrive.
  Les intervalles des sections se suivent sans chevauchement ; chaque tween part
  explicitement de la pose de fin de la section précédente (fromTo), donc le scroll
  arrière et le rechargement en milieu de page restent cohérents.
*/
export function segment(ctx: Ctx, trigger: Element) {
  return gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger,
      start: "top bottom",
      end: "bottom bottom",
      scrub: ctx.scrub,
      invalidateOnRefresh: true,
    },
    onUpdate: ctx.stage.invalidate,
  });
}

/** Valeurs fonctionnelles : réévaluées à chaque refresh (resize, rotation d'écran). */
export function poseVars(pose: () => SceneState) {
  const keys = Object.keys(pose()) as Array<keyof SceneState>;
  return Object.fromEntries(keys.map((k) => [k, () => pose()[k]])) as Record<keyof SceneState, () => number>;
}

/** Tween de la canette d'une pose à l'autre sur `duration` (fraction de l'intervalle de la section). */
export function move(
  tl: gsap.core.Timeline,
  ctx: Ctx,
  from: () => SceneState,
  to: () => SceneState,
  duration: number,
  ease = "power1.inOut",
  position?: gsap.Position,
) {
  tl.fromTo(ctx.state, poseVars(from), { ...poseVars(to), duration, ease, immediateRender: false }, position);
}

/**
 * Apparition d'un bloc de texte (transition CSS) tant que `trigger` (par défaut le bloc lui-même)
 * traverse l'écran.
 */
export function reveal(el: Element, trigger: Element = el, range = { start: "top 85%", end: "bottom 15%" }) {
  ScrollTrigger.create({
    trigger,
    start: range.start,
    end: range.end,
    toggleClass: { targets: el, className: "is-in" },
  });
}
