import { gsap } from "gsap";

/**
 * Position lissée de la souris en coordonnées normalisées (-1 → 1, y vers le haut),
 * partagée par la parallaxe du hero et les particules.
 * Inactif au tactile (pas de survol) et en prefers-reduced-motion : `enabled` reste false.
 */
export type Pointer = {
  enabled: boolean;
  /** Position lissée (NDC). */
  x: number;
  y: number;
  /** 0 → 1 : présence de la souris dans la fenêtre (s'annule quand elle sort). */
  presence: number;
};

export function createPointer(reduced: boolean, onChange: () => void): Pointer {
  const state: Pointer = { enabled: false, x: 0, y: 0, presence: 0 };
  if (reduced || !matchMedia("(hover: hover) and (pointer: fine)").matches) return state;
  state.enabled = true;

  const toX = gsap.quickTo(state, "x", { duration: 0.6, ease: "power3.out", onUpdate: onChange });
  const toY = gsap.quickTo(state, "y", { duration: 0.6, ease: "power3.out", onUpdate: onChange });
  const toPresence = gsap.quickTo(state, "presence", { duration: 0.5, ease: "power2.out", onUpdate: onChange });

  window.addEventListener(
    "pointermove",
    (e) => {
      toX((e.clientX / innerWidth) * 2 - 1);
      toY(-((e.clientY / innerHeight) * 2 - 1));
      toPresence(1);
    },
    { passive: true },
  );
  document.documentElement.addEventListener("pointerleave", () => toPresence(0));
  return state;
}
