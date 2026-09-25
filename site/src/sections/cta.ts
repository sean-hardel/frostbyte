import { flavors } from "../brand";
import type { Ctx } from "../scroll/state";
import { move, reveal, segment } from "../scroll/segment";

/** CTA : la canette revient au centre, dans la dernière saveur. */
export function cta(ctx: Ctx) {
  const section = document.querySelector(".s-cta")!;
  const last = flavors.length - 1;
  const tl = segment(ctx, section);
  move(tl, ctx, () => ctx.poses.side(flavors.length, last), () => ctx.poses.cta(flavors.length, last), 1, "power2.inOut");

  reveal(section.querySelector(".cta__copy")!);
}
