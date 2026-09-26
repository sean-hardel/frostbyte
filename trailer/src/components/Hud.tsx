import type React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { DISPLAY, MONO, colors } from "../brand";

/* Typographie cinétique : textes qui « claquent » sur un temps, textes HUD, compteurs. */

/** Progression spring (0 → 1, avec léger dépassement) démarrant à `at`. */
export function useImpact(at: number, stiffness = 260) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - at, fps, config: { damping: 14, stiffness, mass: 0.6 } });
}

/** Texte display qui entre par un masque (glisse depuis le bas), sur le temps `at`. */
export const Slam: React.FC<{
  at: number;
  children: React.ReactNode;
  size: number;
  color?: string;
  style?: React.CSSProperties;
}> = ({ at, children, size, color = colors.frost, style }) => {
  const p = useImpact(at);
  return (
    <div style={{ overflow: "hidden", lineHeight: 0.95, paddingBottom: size * 0.08, ...style }}>
      <div
        style={{
          fontFamily: DISPLAY,
          fontWeight: 800,
          fontSize: size,
          letterSpacing: "-0.01em",
          color,
          transform: `translateY(${(1 - p) * 110}%) skewY(${(1 - p) * 8}deg)`,
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </div>
    </div>
  );
};

/** Texte mono HUD qui se tape caractère par caractère à partir de `at`. */
export const Typed: React.FC<{
  at: number;
  text: string;
  size?: number;
  color?: string;
  speed?: number;
  style?: React.CSSProperties;
}> = ({ at, text, size = 26, color = colors.frost, speed = 1.5, style }) => {
  const frame = useCurrentFrame();
  const n = Math.max(0, Math.floor((frame - at) * speed));
  if (n <= 0) return null;
  const shown = text.slice(0, n);
  const cursor = n < text.length || Math.floor(frame / 8) % 2 === 0;
  return (
    <div
      style={{
        fontFamily: MONO,
        fontSize: size,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color,
        whiteSpace: "pre",
        ...style,
      }}
    >
      {shown}
      <span style={{ opacity: cursor ? 1 : 0 }}>▌</span>
    </div>
  );
};

/** Compteur numérique de `from` à `to` entre `at` et `at + duration`. */
export const Counter: React.FC<{
  at: number;
  to: number;
  duration?: number;
  suffix?: string;
  size: number;
  color?: string;
}> = ({ at, to, duration = 12, suffix = "", size, color = colors.frost }) => {
  const frame = useCurrentFrame();
  const v = interpolate(frame, [at, at + duration], [0, to], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: size, color, fontVariantNumeric: "tabular-nums" }}>
      {Math.round(v)}
      {suffix}
    </span>
  );
};

/** Bloc « donnée HUD » : trait d'accent, valeur géante, libellé mono. */
export const Stat: React.FC<{
  at: number;
  value: React.ReactNode;
  label: string;
  accent: string;
  align?: "left" | "right";
  valueSize?: number;
  style?: React.CSSProperties;
}> = ({ at, value, label, accent, align = "left", valueSize = 112, style }) => {
  const p = useImpact(at);
  const frame = useCurrentFrame();
  if (frame < at) return null;
  const dir = align === "left" ? -1 : 1;
  return (
    <div
      style={{
        position: "absolute",
        textAlign: align,
        transform: `translateX(${dir * (1 - p) * 160}px)`,
        opacity: Math.min(1, p * 1.5),
        ...style,
      }}
    >
      <div
        style={{
          height: 6,
          width: interpolate(p, [0, 1], [0, 120]),
          background: accent,
          marginBottom: 18,
          marginLeft: align === "right" ? "auto" : 0,
        }}
      />
      <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: valueSize, lineHeight: 1, color: colors.frost }}>{value}</div>
      <div style={{ fontFamily: MONO, fontSize: 28, letterSpacing: "0.3em", color: accent, marginTop: 14 }}>{label}</div>
    </div>
  );
};
