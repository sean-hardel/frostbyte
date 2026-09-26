import { flavors } from "../brand";
import type { Ctx } from "../scroll/state";
import { move, reveal, segment } from "../scroll/segment";

/*
  CTA : la canette revient, dans la dernière saveur. Elle était sortie par le haut pendant le trailer ;
  pour ne jamais passer devant la vidéo (encore visible au début de cet intervalle), elle contourne
  hors champ par la droite et n'entre dans sa colonne qu'à la fin (85 %), quand le lecteur a quitté l'écran.
*/
export function cta(ctx: Ctx) {
  const section = document.querySelector(".s-cta")!;
  const n = flavors.length;
  const last = n - 1;
  const p = ctx.poses;
  const tl = segment(ctx, section);
  move(tl, ctx, () => p.away(n, last), () => p.awayRight(n, last), 0.4, "none");
  move(tl, ctx, () => p.awayRight(n, last), () => p.ctaOffRight(n, last), 0.45, "none");
  move(tl, ctx, () => p.ctaOffRight(n, last), () => p.cta(n, last), 0.15, "power2.out");

  reveal(section.querySelector(".cta__copy")!);
}
