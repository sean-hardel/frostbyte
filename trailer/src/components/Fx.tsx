import type React from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame } from "remotion";
import { colors } from "../brand";
import { useFormat } from "../format";

/* Effets courts synchronisés sur les temps : flash, tremblement, éclats de glace, scanlines. */

/** Flash plein écran de quelques frames à chaque impact. */
export const Flash: React.FC<{ at: number[]; color?: string; strength?: number }> = ({
  at,
  color = colors.frost,
  strength = 0.85,
}) => {
  const frame = useCurrentFrame();
  const opacity = Math.max(
    0,
    ...at.map((t) => interpolate(frame - t, [-1, 0, 5], [0, strength, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })),
  );
  if (opacity <= 0) return null;
  return <AbsoluteFill style={{ backgroundColor: color, opacity, mixBlendMode: "screen" }} />;
};

/** Tremblement amorti après chaque impact (déterministe : random(seed)). */
export const Shake: React.FC<{ at: number[]; amplitude?: number; children: React.ReactNode }> = ({
  at,
  amplitude = 18,
  children,
}) => {
  const frame = useCurrentFrame();
  let x = 0;
  let y = 0;
  for (const t of at) {
    const d = frame - t;
    if (d < 0 || d > 10) continue;
    const decay = 1 - d / 10;
    x += (random(`sx-${t}-${frame}`) - 0.5) * 2 * amplitude * decay;
    y += (random(`sy-${t}-${frame}`) - 0.5) * 2 * amplitude * decay;
  }
  return <AbsoluteFill style={{ transform: `translate(${x}px, ${y}px)` }}>{children}</AbsoluteFill>;
};

/** Éclats de glace projetés depuis `origin` à la frame `at`. */
export const IceShards: React.FC<{
  at: number;
  seed: string;
  count?: number;
  color?: string;
  origin?: [number, number];
  speed?: number;
}> = ({ at, seed, count = 26, color = colors.ice, origin, speed = 1 }) => {
  const frame = useCurrentFrame();
  const { width: WIDTH, height: HEIGHT } = useFormat();
  const [ox, oy] = origin ?? [WIDTH / 2, HEIGHT / 2];
  const t = frame - at;
  if (t < 0 || t > 45) return null;
  const life = interpolate(t, [0, 45], [1, 0], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <svg width={WIDTH} height={HEIGHT}>
        {Array.from({ length: count }, (_, i) => {
          const angle = random(`${seed}-a-${i}`) * Math.PI * 2;
          const v = (18 + random(`${seed}-v-${i}`) * 34) * speed;
          const dist = v * t * (1 - t / 120);
          const size = 10 + random(`${seed}-s-${i}`) * 34;
          const rot = random(`${seed}-r-${i}`) * 360 + t * (random(`${seed}-w-${i}`) - 0.5) * 24;
          const x = ox + Math.cos(angle) * dist;
          const y = oy + Math.sin(angle) * dist;
          const filled = random(`${seed}-f-${i}`) > 0.5;
          return (
            <polygon
              key={i}
              points={`0,${-size} ${size * 0.45},${size * 0.6} ${-size * 0.3},${size * 0.4}`}
              transform={`translate(${x} ${y}) rotate(${rot})`}
              fill={filled ? color : "none"}
              stroke={color}
              strokeWidth={2}
              opacity={life * (filled ? 0.9 : 0.7)}
            />
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

/** Lignes de balayage + vignette, pour la texture « écran ». */
export const Scanlines: React.FC<{ opacity?: number }> = ({ opacity = 0.08 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        backgroundImage: `repeating-linear-gradient(0deg, ${colors.frost} 0 1px, transparent 1px 4px)`,
        backgroundPosition: `0 ${frame * 2}px`,
        opacity,
      }}
    />
  );
};

export const Vignette: React.FC = () => (
  <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.55) 100%)" }} />
);
