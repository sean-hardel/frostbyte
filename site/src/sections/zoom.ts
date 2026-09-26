import type { Ctx } from "../scroll/state";
import { move, segment } from "../scroll/segment";

/** Zoom : la caméra plonge sur le logo, puis tient le gros plan pendant l'accroche. */
export function zoom(ctx: Ctx) {
  const section = document.querySelector(".s-zoom")!;
  const tl = segment(ctx, section);
  move(tl, ctx, ctx.poses.spinEnd, ctx.poses.zoom, 0.65, "power2.inOut");
  tl.to({}, { duration: 0.35 }); // maintien du gros plan
}
