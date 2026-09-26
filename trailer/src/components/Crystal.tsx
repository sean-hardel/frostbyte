import type React from "react";
import { colors } from "../brand";

/*
  Symbole FROST/BYTE (cristal hexagonal), repris de blender/textures/logo.svg,
  recentré sur (0, 0). `draw` (0 → 1) dessine l'hexagone puis déploie les branches.
*/

const HEX = "0,-88 76.2,-44 76.2,44 0,88 -76.2,44 -76.2,-44";
const ARM = "M0,0 V-58";
const BRANCH = "M-14.1,-44.1 L0,-30 L14.1,-44.1";

type Props = {
  size: number;
  draw?: number;
  rotation?: number;
  color?: string;
  accent?: string;
  style?: React.CSSProperties;
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export const Crystal: React.FC<Props> = ({
  size,
  draw = 1,
  rotation = 0,
  color = colors.frost,
  accent = colors.ice,
  style,
}) => {
  const hex = clamp01(draw / 0.5);
  const arms = clamp01((draw - 0.35) / 0.45);
  const pixels = clamp01((draw - 0.75) / 0.25);
  return (
    <svg viewBox="-100 -100 200 200" width={size} height={size} style={{ overflow: "visible", ...style }}>
      <g transform={`rotate(${rotation})`} fill="none" strokeLinecap="square">
        <polygon
          points={HEX}
          stroke={color}
          strokeWidth={10}
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - hex}
        />
        <g stroke={accent} transform={`scale(${arms})`} opacity={arms > 0 ? 1 : 0}>
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <g key={a} transform={`rotate(${a})`}>
              <path d={ARM} strokeWidth={10} />
              <path d={BRANCH} strokeWidth={8} />
            </g>
          ))}
        </g>
        <g fill={color} stroke="none" opacity={pixels}>
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <rect key={a} x={-5} y={-78} width={10} height={10} transform={`rotate(${a}) scale(${pixels})`} />
          ))}
          <rect x={-9} y={-9} width={18} height={18} transform={`rotate(45) scale(${arms})`} />
        </g>
      </g>
    </svg>
  );
};
