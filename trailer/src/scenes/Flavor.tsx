import type React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BEAT, DISPLAY, DURATION, MONO, colors, flavors, type Flavor as FlavorToken } from "../brand";
import { CanSequence } from "../components/CanSequence";
import { Flash, IceShards, Scanlines, Shake, Vignette } from "../components/Fx";
import { Slam, Typed } from "../components/Hud";

/*
  Saveur (150 frames) — la canette glisse depuis la droite puis finit son tour logo de face ;
  le nom claque en typo cinétique. Temps : 0 entrée canette · 15 nom · 45 notes · 60 infos.
*/

type Props = { flavor: FlavorToken; index: number };

const NAME_AT = BEAT;
const NOTES_AT = BEAT * 3;
const INFO_AT = BEAT * 4;

export const Flavor: React.FC<Props> = ({ flavor, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [first, second = ""] = flavor.name.split(" ");
  // Syne 800 ≈ 1,07 em par lettre : le mot le plus long tient dans ~880 px (la canette commence vers 1150 px)
  const nameSize = Math.min(168, Math.floor(880 / (Math.max(first.length, second.length) * 1.07)));

  const enter = spring({ frame, fps, config: { damping: 15, stiffness: 150, mass: 0.8 } });
  const band = spring({ frame: frame - 2, fps, config: { damping: 20, stiffness: 120 } });
  const drift = interpolate(frame, [0, DURATION.flavor], [0, -30]);

  return (
    <AbsoluteFill style={{ backgroundColor: flavor.night }}>
      {/* Bande d'accent diagonale derrière la canette */}
      <AbsoluteFill
        style={{
          left: 1080,
          width: 520,
          backgroundColor: flavor.accent,
          opacity: 0.16,
          transform: `skewX(-14deg) translateX(${(1 - band) * 900}px)`,
        }}
      />

      {/* Nom en contour qui défile vite, en fond */}
      <AbsoluteFill style={{ justifyContent: "flex-end", paddingBottom: 40 }}>
        <div
          style={{
            fontFamily: DISPLAY,
            fontWeight: 800,
            fontSize: 240,
            whiteSpace: "nowrap",
            color: "transparent",
            WebkitTextStroke: `3px ${flavor.accent}`,
            opacity: 0.14,
            transform: `translateX(${-frame * 10}px)`,
          }}
        >
          {`${flavor.name} · `.repeat(4)}
        </div>
      </AbsoluteFill>

      <Shake at={[NAME_AT]} amplitude={10}>
        {/* Canette : glisse depuis la droite, tour lent qui finit logo face caméra */}
        <AbsoluteFill style={{ transform: `translateX(${420 + (1 - enter) * 1100 + drift}px) scale(1.12)` }}>
          <CanSequence flavor={flavor} from={105} to={150} duration={DURATION.flavor} />
        </AbsoluteFill>

        <AbsoluteFill style={{ padding: "0 0 0 150px", justifyContent: "center" }}>
          <Typed at={6} text={`Saveur ${String(index + 1).padStart(2, "0")} / ${String(flavors.length).padStart(2, "0")}`}
            size={26} color={flavor.accent} speed={2} style={{ marginBottom: 24 }} />
          <Slam at={NAME_AT} size={nameSize} color={flavor.accent}>{first}</Slam>
          <Slam at={NAME_AT + 5} size={nameSize} color={colors.frost}>{second}</Slam>
          <Typed at={NOTES_AT} text={flavor.notes} size={28} color={colors.frost} speed={2.2}
            style={{ marginTop: 34, letterSpacing: "0.08em", textTransform: "none" }} />
          <div
            style={{
              display: "flex",
              gap: 48,
              marginTop: 40,
              fontFamily: MONO,
              fontSize: 24,
              letterSpacing: "0.25em",
              color: colors.frost,
              opacity: interpolate(frame, [INFO_AT, INFO_AT + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              transform: `translateY(${interpolate(frame, [INFO_AT, INFO_AT + 8], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
            }}
          >
            <span>0 G SUCRE</span>
            <span style={{ color: flavor.accent }}>/</span>
            <span>32 MG CAFÉINE</span>
            <span style={{ color: flavor.accent }}>/</span>
            <span>500 ML</span>
          </div>
        </AbsoluteFill>
      </Shake>

      <IceShards at={NAME_AT} seed={`flavor-${flavor.id}`} color={flavor.accent} origin={[1380, 540]} count={24} />
      <Flash at={[NAME_AT]} color={flavor.accent} strength={0.25} />
      <Scanlines opacity={0.05} />
      <Vignette />
    </AbsoluteFill>
  );
};
