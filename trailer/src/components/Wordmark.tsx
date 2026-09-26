import type React from "react";
import { colors } from "../brand";

/*
  Wordmark FROST/BYTE en tracés SVG, repris à l'identique de blender/textures/logo.svg
  (grille 70 × 100, avance 84, trait 16, caps carrés). Toute modification du logo
  doit être reportée ici.
*/

type Glyph = { paths: string[]; butt?: string; slash?: boolean };

const GLYPHS: Record<string, Glyph> = {
  F: { paths: ["M62,8 H8 V92 M8,50 H50"] },
  R: { paths: ["M8,92 V8 H50 L62,20 V38 L50,50 H8"], butt: "M34,47 L70.25,105" },
  O: { paths: ["M20,8 H50 L62,20 V80 L50,92 H20 L8,80 V20 Z"] },
  S: { paths: ["M62,8 H20 L8,20 V38 L20,50 H50 L62,62 V80 L50,92 H8"] },
  T: { paths: ["M8,8 H62 M35,8 V92"] },
  "/": { paths: [], slash: true },
  B: { paths: ["M8,92 V8 H48 L60,20 V38 L50,50 H8 M8,50 H50 L62,62 V80 L50,92 H8"] },
  Y: { paths: ["M8,8 L35,50 L62,8 M35,50 V92"] },
  E: { paths: ["M62,8 H8 V92 H62 M8,50 H48"] },
};

const ADVANCE = 84;
const LINE_GAP = 124;

/** État d'une lettre : décalage, échelle, opacité, tracé (0 → 1 : dessin progressif). */
export type LetterState = { x?: number; y?: number; scale?: number; opacity?: number; draw?: number };

type Props = {
  /** "line" : FROST/BYTE sur une ligne ; "stacked" : FROST puis /BYTE (comme logo.svg). */
  layout?: "line" | "stacked";
  width: number;
  color?: string;
  accent?: string;
  /** Animation par lettre (index 0 → 9 dans l'ordre F R O S T / B Y T E). */
  letter?: (index: number) => LetterState;
  style?: React.CSSProperties;
};

const TEXT = "FROST/BYTE";

export const Wordmark: React.FC<Props> = ({
  layout = "line",
  width,
  color = colors.frost,
  accent = colors.ice,
  letter,
  style,
}) => {
  const positions = [...TEXT].map((_, i) =>
    layout === "line" ? { x: i * ADVANCE, y: 0 } : { x: (i < 5 ? i : i - 5) * ADVANCE, y: i < 5 ? 0 : LINE_GAP },
  );
  const vbW = (layout === "line" ? TEXT.length : 5) * ADVANCE - 14;
  const vbH = layout === "line" ? 100 : LINE_GAP + 100;

  return (
    <svg viewBox={`-12 -12 ${vbW + 24} ${vbH + 24}`} width={width} style={{ overflow: "visible", ...style }}>
      <defs>
        <clipPath id="fb-cell" clipPathUnits="userSpaceOnUse">
          <rect x={-10} y={0} width={100} height={100} />
        </clipPath>
      </defs>
      {[...TEXT].map((ch, i) => {
        const g = GLYPHS[ch];
        const s = { x: 0, y: 0, scale: 1, opacity: 1, draw: 1, ...letter?.(i) };
        if (s.opacity <= 0) return null;
        const p = positions[i];
        // Échelle autour du centre de la cellule (35, 50)
        const transform = `translate(${p.x + s.x + 35} ${p.y + s.y + 50}) scale(${s.scale}) translate(-35 -50)`;
        const dash = s.draw < 1 ? { pathLength: 1, strokeDasharray: 1, strokeDashoffset: 1 - s.draw } : {};
        return (
          <g key={i} transform={transform} opacity={s.opacity}>
            <g clipPath="url(#fb-cell)">
              {g.slash ? (
                <polygon points="0,100 18,100 70,0 52,0" fill={accent} opacity={s.draw} />
              ) : (
                <g fill="none" stroke={color} strokeWidth={16} strokeLinejoin="miter">
                  {g.paths.map((d) => (
                    <path key={d} d={d} strokeLinecap="square" {...dash} />
                  ))}
                  {g.butt ? <path d={g.butt} strokeLinecap="butt" {...dash} /> : null}
                </g>
              )}
            </g>
          </g>
        );
      })}
    </svg>
  );
};
