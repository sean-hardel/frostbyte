import type React from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame } from "remotion";
import { colors } from "../brand";
import { useFormat } from "../format";

/*
  Couches d'ambiance posées au-dessus du montage (Trailer.tsx), communes aux deux formats :
  - FrostParticles : cristaux de givre du site (cœur + étoile à 6 branches, 25 % en accent),
    3 couches de parallaxe, dérive continue + poussée sur les impacts (déterministe : random(seed))
  - ColdGrade : étalonnage froid (ombres vers night, hautes lumières vers frost, légère désaturation)
  - Grain : bruit SVG dont la graine change à chaque frame
*/

const LAYERS = [
  { count: 26, size: [3, 7], speed: 0.6, alpha: 0.35, blur: 1.2 },
  { count: 18, size: [6, 12], speed: 1.2, alpha: 0.6, blur: 0 },
  { count: 8, size: [14, 26], speed: 2.2, alpha: 0.45, blur: 3 },
] as const;

/** Un cristal : étoile à 6 branches + cœur, comme le shader de particules du site. */
const Crystal: React.FC<{ size: number; color: string; rotation: number }> = ({ size, color, rotation }) => (
  <svg width={size * 2} height={size * 2} viewBox="-1 -1 2 2" style={{ overflow: "visible", transform: `rotate(${rotation}deg)` }}>
    <g stroke={color} strokeWidth={0.07} strokeLinecap="round">
      {[0, 60, 120].map((a) => (
        <line key={a} x1={-0.9} y1={0} x2={0.9} y2={0} transform={`rotate(${a})`} />
      ))}
    </g>
    <circle r={0.22} fill={color} />
  </svg>
);

export const FrostParticles: React.FC<{ accent: string; impacts?: number[] }> = ({ accent, impacts = [] }) => {
  const frame = useCurrentFrame();
  const { width, height } = useFormat();
  // Poussée : chaque impact projette les cristaux vers le haut pendant ~20 frames
  const push = impacts.reduce(
    (acc, t) => acc + interpolate(frame - t, [0, 3, 22], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    0,
  );
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
      {LAYERS.flatMap((layer, li) =>
        Array.from({ length: layer.count }, (_, i) => {
          const seed = `frost-${li}-${i}`;
          const size = layer.size[0] + random(`${seed}-s`) * (layer.size[1] - layer.size[0]);
          const drift = frame * layer.speed + push * 40 * layer.speed;
          const x = (random(`${seed}-x`) * width + Math.sin(frame / 40 + random(`${seed}-p`) * 6) * 18 * layer.speed) % width;
          const y = (((random(`${seed}-y`) * height - drift) % height) + height) % height;
          const twinkle = 0.6 + 0.4 * Math.sin(frame / 7 + random(`${seed}-t`) * 20);
          const color = random(`${seed}-c`) < 0.25 ? accent : colors.frost;
          return (
            <div
              key={seed}
              style={{
                position: "absolute",
                left: x - size,
                top: y - size,
                opacity: layer.alpha * twinkle,
                filter: layer.blur ? `blur(${layer.blur}px)` : undefined,
              }}
            >
              <Crystal size={size} color={color} rotation={random(`${seed}-r`) * 60 + frame * (li + 1) * 0.3} />
            </div>
          );
        }),
      )}
    </AbsoluteFill>
  );
};

/** Étalonnage froid : dégradé de teinte appliqué en modes de fusion (ombres bleu nuit, hautes lumières givre). */
export const ColdGrade: React.FC = () => (
  <>
    <AbsoluteFill style={{ backgroundColor: colors.night, mixBlendMode: "soft-light", opacity: 0.35, pointerEvents: "none" }} />
    <AbsoluteFill style={{ backgroundColor: colors.ice, mixBlendMode: "color", opacity: 0.06, pointerEvents: "none" }} />
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at center, transparent 50%, ${colors.night}AA 100%)`,
        pointerEvents: "none",
      }}
    />
  </>
);

/** Grain argentique léger : bruit fractal SVG, graine différente à chaque frame. */
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.07 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useFormat();
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "overlay", opacity }}>
      <svg width={width} height={height}>
        <filter id="fb-grain">
          <feTurbulence type="fractalNoise" baseFrequency={0.9} numOctaves={2} seed={frame % 97} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#fb-grain)" />
      </svg>
    </AbsoluteFill>
  );
};
