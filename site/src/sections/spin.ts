import type { Ctx } from "../scroll/state";
import { move, reveal, segment } from "../scroll/segment";

/** Spin : un tour complet, la canette se redresse et finit logo face caméra. */
export function spin(ctx: Ctx) {
  const section = document.querySelector(".s-spin")!;
  const tl = segment(ctx, section);
  move(tl, ctx, ctx.poses.hero, ctx.poses.spinEnd, 1, "power1.inOut");

  section.querySelectorAll(".fact").forEach((fact) => reveal(fact));
}
