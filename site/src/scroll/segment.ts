import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Ctx, SceneState } from "./state";

/*
  Chaque section pilote la canette pendant son propre intervalle de scroll :
  du moment où son haut entre par le bas de l'écran jusqu'à ce que son bas y arrive.
  Les intervalles se suivent sans chevauchement ; chaque tween part explicitement de la
  pose de fin de la section précédente (fromTo) et définit TOUTES les propriétés de l'état.

  Pilote unique (driveSegments) : les timelines de section sont en pause, et une seule
  valeur de scroll lissée choisit la section active, qui est la seule à écrire l'état.
  (Avec un scrub par section, un scroll rapide traversant plusieurs sections laissait
  gagner la dernière timeline à finir son lissage : la canette pouvait rester dans la
  mauvaise pose.)
*/
type Segment = { tl: gsap.core.Timeline; trigger: HTMLElement; start: number; end: number };
const segments: Segment[] = [];

export function segment(_ctx: Ctx, trigger: Element) {
  const tl = gsap.timeline({ paused: true, defaults: { ease: "none" } });
  segments.push({ tl, trigger: trigger as HTMLElement, start: 0, end: 0 });
  return tl;
}

/** À appeler une fois, après la création de toutes les sections. */
export function driveSegments(ctx: Ctx) {
  const smooth = { y: window.scrollY };
  let last: Segment | null = null;

  const apply = () => {
    let active = segments[0];
    for (const s of segments) if (smooth.y >= s.start) active = s;
    const p = gsap.utils.clamp(0, 1, (smooth.y - active.start) / Math.max(1, active.end - active.start));
    // Changement de section : la timeline peut déjà être à `p` sans avoir écrit l'état en dernier ;
    // un aller-retour de progression force son rendu.
    if (active !== last) active.tl.progress(p < 0.5 ? 1 : 0, true);
    active.tl.progress(p);
    last = active;
    ctx.stage.invalidate();
  };

  const measure = () => {
    for (const s of segments) {
      const top = s.trigger.getBoundingClientRect().top + window.scrollY;
      s.start = top - innerHeight;
      s.end = top + s.trigger.offsetHeight - innerHeight;
      s.tl.invalidate(); // poses réévaluées (resize, rotation d'écran)
    }
    last = null;
    smooth.y = window.scrollY;
    apply();
  };

  // Lissage (équivalent du scrub : 0.8) ; direct en prefers-reduced-motion
  const follow =
    ctx.scrub === true ? null : gsap.quickTo(smooth, "y", { duration: ctx.scrub, ease: "power3.out", onUpdate: apply });
  ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate: () => {
      if (follow) follow(window.scrollY);
      else {
        smooth.y = window.scrollY;
        apply();
      }
    },
  });
  ScrollTrigger.addEventListener("refresh", measure);
  measure();
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
