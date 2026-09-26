import type React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import type { TransitionPresentation, TransitionPresentationComponentProps } from "@remotion/transitions";

/*
  Coupe « punch » : la scène sortante fonce vers la caméra et s'efface, la scène entrante
  arrive légèrement zoomée ; un flash culmine au milieu de la transition.
*/

type PunchZoomProps = { flashColor: string };

const PunchZoom: React.FC<TransitionPresentationComponentProps<PunchZoomProps>> = ({
  children,
  presentationDirection,
  presentationProgress: p,
  passedProps,
}) => {
  if (presentationDirection === "exiting") {
    return (
      <AbsoluteFill
        style={{
          transform: `scale(${1 + p * 0.6})`,
          opacity: interpolate(p, [0, 0.5, 0.55], [1, 1, 0], { extrapolateRight: "clamp" }),
          filter: `blur(${p * 14}px)`,
        }}
      >
        {children}
      </AbsoluteFill>
    );
  }
  const flash = interpolate(p, [0.3, 0.5, 0.85], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          transform: `scale(${interpolate(p, [0.5, 1], [1.35, 1], { extrapolateLeft: "clamp" })})`,
          opacity: p >= 0.5 ? 1 : 0,
        }}
      >
        {children}
      </AbsoluteFill>
      <AbsoluteFill style={{ backgroundColor: passedProps.flashColor, opacity: flash }} />
    </AbsoluteFill>
  );
};

export function punchZoom(props: PunchZoomProps): TransitionPresentation<PunchZoomProps> {
  return { component: PunchZoom, props };
}
