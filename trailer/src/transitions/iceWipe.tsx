import type React from "react";
import { AbsoluteFill } from "remotion";
import type { TransitionPresentation, TransitionPresentationComponentProps } from "@remotion/transitions";
import { colors } from "../brand";
import { useFormat } from "../format";

/*
  Volet diagonal à arête de glace brisée (même dent que la bande de l'étiquette).
  La scène entrante est révélée derrière le front ; un liseré suit l'arête.
*/

type IceWipeProps = {
  direction: "from-left" | "from-right";
  edgeColor: string;
};

const TOOTH = 90; // hauteur d'une dent (px)
const AMP = 46; // profondeur des dents (px)
const SLANT = 420; // inclinaison du front sur la hauteur de l'écran (px)

/** Points de l'arête (haut → bas) pour un front centré en x = front. */
function edgePoints(front: number, HEIGHT: number) {
  const pts: Array<[number, number]> = [];
  for (let y = -TOOTH, i = 0; y <= HEIGHT + TOOTH; y += TOOTH / 2, i++) {
    const x = front + (y / HEIGHT - 0.5) * SLANT + (i % 2 === 0 ? -AMP : AMP) * 0.5;
    pts.push([x, y]);
  }
  return pts;
}

const IceWipe: React.FC<TransitionPresentationComponentProps<IceWipeProps>> = ({
  children,
  presentationDirection,
  presentationProgress,
  passedProps,
}) => {
  if (presentationDirection === "exiting") {
    return <AbsoluteFill>{children}</AbsoluteFill>;
  }
  const { width: WIDTH, height: HEIGHT } = useFormat();
  const p = presentationProgress;
  const fromLeft = passedProps.direction === "from-left";
  // Le front traverse tout l'écran, pente et dents comprises
  const travel = WIDTH + SLANT + AMP * 2;
  const front = fromLeft ? -SLANT / 2 - AMP + p * travel : WIDTH + SLANT / 2 + AMP - p * travel;
  const edge = edgePoints(front, HEIGHT);
  const far = fromLeft ? -WIDTH : WIDTH * 2;
  const polygon = [[far, -TOOTH], ...edge, [far, HEIGHT + TOOTH]]
    .map(([x, y]) => `${(x / WIDTH) * 100}% ${(y / HEIGHT) * 100}%`)
    .join(", ");
  const line = edge.map(([x, y]) => `${x},${y}`).join(" ");

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ clipPath: `polygon(${polygon})` }}>{children}</AbsoluteFill>
      {p > 0 && p < 1 ? (
        <svg width={WIDTH} height={HEIGHT} style={{ position: "absolute", inset: 0 }}>
          <polyline points={line} fill="none" stroke={passedProps.edgeColor} strokeWidth={10} strokeLinejoin="miter" />
          <polyline
            points={line}
            fill="none"
            stroke={colors.frost}
            strokeWidth={3}
            strokeLinejoin="miter"
            transform={`translate(${fromLeft ? -22 : 22} 0)`}
            opacity={0.8}
          />
        </svg>
      ) : null}
    </AbsoluteFill>
  );
};

export function iceWipe(props: IceWipeProps): TransitionPresentation<IceWipeProps> {
  return { component: IceWipe, props };
}
