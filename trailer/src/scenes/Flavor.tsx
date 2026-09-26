import type React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BEAT, DISPLAY, MONO, colors, flavors, type Flavor as FlavorToken } from "../brand";
import { CanSequence } from "../components/CanSequence";
import { Flash, IceShards, Shake, Vignette } from "../components/Fx";
import { Slam, Typed } from "../components/Hud";
import { useFormat } from "../format";

/*
  Saveur — plan Blender « orbit » (canette qui tourne + orbite caméra, profondeur de champ, givre),
  logo de face au début et à la fin. Le nom claque en typo cinétique.
  Temps : 0 entrée canette · 15 nom · 45 notes · 60 infos (16:9) ; tout serré sur 75 frames en 9:16.
  Mise en page : 16:9 → canette à droite, texte à gauche ; 9:16 → canette en haut, texte en bas.
*/

type Props = { flavor: FlavorToken; index: number };

export const Flavor: React.FC<Props> = ({ flavor, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fmt = useFormat();
  const duration = fmt.duration.flavor;
  const NAME_AT = fmt.v(BEAT, 8);
  const NOTES_AT = fmt.v(BEAT * 3, BEAT * 2);
  const INFO_AT = fmt.v(BEAT * 4, BEAT * 3);

  const [first, second = ""] = flavor.name.split(" ");
  // Syne 800 ≈ 1,07 em par lettre : le mot le plus long tient dans la colonne de texte
  const column = fmt.v(880, 920);
  const nameSize = Math.min(fmt.v(168, 150), Math.floor(column / (Math.max(first.length, second.length) * 1.07)));

  const enter = spring({ frame, fps, config: { damping: 15, stiffness: 150, mass: 0.8 } });
  const band = spring({ frame: frame - 2, fps, config: { damping: 20, stiffness: 120 } });
  const drift = interpolate(frame, [0, duration], [0, -30]);

  const canTransform = fmt.v(
    `translateX(${440 + (1 - enter) * 1100 + drift}px)`,
    `translateY(${-300 + (1 - enter) * -900 + drift}px) scale(0.9)`,
  );

  return (
    <AbsoluteFill style={{ backgroundColor: flavor.night }}>
      {/* Bande d'accent diagonale derrière la canette */}
      <AbsoluteFill
        style={fmt.v(
          { left: 1100, width: 520, backgroundColor: flavor.accent, opacity: 0.16, transform: `skewX(-14deg) translateX(${(1 - band) * 900}px)` },
          { top: 180, height: 900, backgroundColor: flavor.accent, opacity: 0.14, transform: `skewY(-14deg) translateY(${(1 - band) * -1200}px)` },
        )}
      />

      {/* Nom en contour qui défile vite, en fond */}
      <AbsoluteFill style={{ justifyContent: "flex-end", paddingBottom: fmt.v(40, 60) }}>
        <div
          style={{
            fontFamily: DISPLAY,
            fontWeight: 800,
            fontSize: fmt.v(240, 200),
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
        <AbsoluteFill style={{ transform: canTransform }}>
          <CanSequence shot="orbit" flavor={flavor} duration={duration} />
        </AbsoluteFill>

        <AbsoluteFill
          style={fmt.v(
            { padding: "0 0 0 150px", justifyContent: "center" },
            { padding: "0 80px 260px", justifyContent: "flex-end" },
          )}
        >
          <Typed at={4} text={`Saveur ${String(index + 1).padStart(2, "0")} / ${String(flavors.length).padStart(2, "0")}`}
            size={26} color={flavor.accent} speed={2.5} style={{ marginBottom: 24 }} />
          <Slam at={NAME_AT} size={nameSize} color={flavor.accent}>{first}</Slam>
          <Slam at={NAME_AT + 4} size={nameSize} color={colors.frost}>{second}</Slam>
          <Typed at={NOTES_AT} text={flavor.notes} size={fmt.v(28, 30)} color={colors.frost} speed={fmt.v(2.2, 3.2)}
            style={{ marginTop: 34, letterSpacing: "0.08em", textTransform: "none", whiteSpace: fmt.v("pre", "normal") }} />
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: fmt.v(48, 28),
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

      <IceShards at={NAME_AT} seed={`flavor-${flavor.id}`} color={flavor.accent} origin={fmt.v([1400, 540], [540, 620])} count={24} />
      <Flash at={[NAME_AT]} color={flavor.accent} strength={0.25} />
      <Vignette />
    </AbsoluteFill>
  );
};
