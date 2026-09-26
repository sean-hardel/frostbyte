import type React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import type { Flavor } from "../brand";
import { useFormat } from "../format";

/*
  Plan Blender (PNG RGBA, fond transparent) joué image par image.
  Rendus : blender/scripts/11_shots.py → public/renders/<shot>/<flavor>/<format>/NNNN.png
  Chaque plan a exactement la durée de sa scène (voir FORMATS dans brand.ts).
*/

export type Shot = "macro" | "travel" | "orbit";

/** Nombre d'images de chaque plan, par format (= DURATIONS de 11_shots.py). */
export function shotFrames(shot: Shot, portrait: boolean) {
  return { macro: portrait ? 75 : 90, travel: portrait ? 90 : 120, orbit: portrait ? 75 : 135 }[shot];
}

export function shotSrc(shot: Shot, flavor: Flavor, format: string, index: number, portrait: boolean) {
  const i = Math.round(Math.min(shotFrames(shot, portrait), Math.max(1, index)));
  return staticFile(`renders/${shot}/${flavor.id}/${format}/${String(i).padStart(4, "0")}.png`);
}

type Props = {
  shot: Shot;
  flavor: Flavor;
  /** Durée de la scène : le plan est réparti dessus (1:1 quand les durées correspondent). */
  duration: number;
  style?: React.CSSProperties;
};

export const CanSequence: React.FC<Props> = ({ shot, flavor, duration, style }) => {
  const frame = useCurrentFrame();
  const fmt = useFormat();
  const n = shotFrames(shot, fmt.portrait);
  const index = interpolate(frame, [0, duration - 1], [1, n], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={style}>
      <Img src={shotSrc(shot, flavor, fmt.id, index, fmt.portrait)} style={{ width: "100%", height: "100%" }} />
    </AbsoluteFill>
  );
};
