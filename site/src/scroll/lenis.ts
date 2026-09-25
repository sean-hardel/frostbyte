import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Scroll lissé à la molette, synchronisé avec ScrollTrigger sur le ticker GSAP.
 * Au doigt, le scroll reste natif (syncTouch désactivé) : c'est le plus fluide sur mobile.
 * Désactivé en prefers-reduced-motion.
 */
export function setupLenis(reduced: boolean) {
  if (reduced) return null;
  const lenis = new Lenis({ autoRaf: false, anchors: true, lerp: 0.12 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  return lenis;
}
