import type React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { TURNTABLE_FRAMES, type Flavor } from "../brand";

/*
  Turntable Blender (PNG RGBA 1920 × 1080, canette centrée) joué image par image.
  Rendus : blender/scripts/08_render_flavors.py → public/renders/<id>/can_NNNN.png
  La plage [from, to] (1 → 150) est répartie sur `duration` frames de la séquence.
*/

type Props = {
  flavor: Flavor;
  from?: number;
  to?: number;
  duration: number;
  style?: React.CSSProperties;
};

export function turntableSrc(flavor: Flavor, index: number) {
  const i = Math.round(Math.min(TURNTABLE_FRAMES, Math.max(1, index)));
  return staticFile(`renders/${flavor.id}/can_${String(i).padStart(4, "0")}.png`);
}

export const CanSequence: React.FC<Props> = ({ flavor, from = 1, to = TURNTABLE_FRAMES, duration, style }) => {
  const frame = useCurrentFrame();
  const index = interpolate(frame, [0, duration - 1], [from, to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={style}>
      <Img src={turntableSrc(flavor, index)} style={{ width: "100%", height: "100%" }} />
    </AbsoluteFill>
  );
};
