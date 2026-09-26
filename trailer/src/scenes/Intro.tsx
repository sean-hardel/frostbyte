import type React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BEAT, colors } from "../brand";
import { Crystal } from "../components/Crystal";
import { Flash, IceShards, Scanlines, Shake, Vignette } from "../components/Fx";
import { Typed } from "../components/Hud";
import { Wordmark, type LetterState } from "../components/Wordmark";
import { useFormat } from "../format";

/*
  Intro (90 frames) — temps : 0 cristal · 15 FROST · 30 « / » · 32 BYTE · 45 impact · 60 slogan.
*/

const FROST_AT = BEAT; // 15
const SLASH_AT = BEAT * 2; // 30
const IMPACT_AT = BEAT * 3; // 45
const TAGLINE_AT = BEAT * 4; // 60

/** Frame d'entrée de chaque lettre F R O S T / B Y T E. */
const letterStart = (i: number) => (i < 5 ? FROST_AT + i * 2 : i === 5 ? SLASH_AT : SLASH_AT + 2 + (i - 6) * 2);

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fmt = useFormat();
  // Portrait : wordmark empilé (FROST / /BYTE), comme logo.svg
  const wm = { layout: fmt.v("line", "stacked") as "line" | "stacked", width: fmt.v(1500, 860) };

  const letter = (i: number): LetterState => {
    const p = spring({ frame: frame - letterStart(i), fps, config: { damping: 12, stiffness: 320, mass: 0.5 } });
    return { scale: 2.6 - 1.6 * p, y: (1 - p) * -70, opacity: Math.min(1, p * 2.5) };
  };

  // Cristal : se dessine, puis remonte au-dessus du wordmark quand les lettres arrivent
  const crystalDraw = interpolate(frame, [0, 16], [0, 1], { extrapolateRight: "clamp" });
  const lift = spring({ frame: frame - FROST_AT + 4, fps, config: { damping: 16, stiffness: 180 } });
  const impact = spring({ frame: frame - IMPACT_AT, fps, config: { damping: 9, stiffness: 400, mass: 0.4 } });
  const punch = frame >= IMPACT_AT ? 1 + (1 - impact) * 0.08 : 1;

  // Split RVB bref sur les impacts
  const glitch = Math.max(
    ...[SLASH_AT, IMPACT_AT].map((t) =>
      interpolate(frame - t, [0, 1, 7], [0, 16, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    ),
  );

  return (
    <AbsoluteFill style={{ backgroundColor: colors.night }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 50%, ${colors.ice}26 0%, transparent 55%)`,
          opacity: interpolate(frame, [IMPACT_AT - 2, IMPACT_AT + 4], [0.3, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      />
      <Shake at={[SLASH_AT, IMPACT_AT]} amplitude={14}>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div style={{ transform: `translateY(${-lift * fmt.v(250, 420)}px) scale(${1 - lift * 0.25})` }}>
            <Crystal size={220} draw={crystalDraw} rotation={(1 - crystalDraw) * -90} />
          </div>
        </AbsoluteFill>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", transform: `scale(${punch})` }}>
          {glitch > 0.5 ? (
            <>
              <Wordmark layout={wm.layout} width={wm.width} letter={letter} color={colors.ice} accent={colors.ice}
                style={{ position: "absolute", transform: `translateX(${glitch}px)`, opacity: 0.6, mixBlendMode: "screen" }} />
              <Wordmark layout={wm.layout} width={wm.width} letter={letter} color={colors.alu} accent={colors.alu}
                style={{ position: "absolute", transform: `translateX(${-glitch}px)`, opacity: 0.6, mixBlendMode: "screen" }} />
            </>
          ) : null}
          <Wordmark layout={wm.layout} width={wm.width} letter={letter} style={{ position: "absolute" }} />
        </AbsoluteFill>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <Typed at={TAGLINE_AT} text="Stay sharp. Stay cold." size={34} color={colors.ice} speed={1.6}
            style={{ transform: `translateY(${fmt.v(190, 400)}px)` }} />
        </AbsoluteFill>
      </Shake>
      <IceShards at={IMPACT_AT} seed="intro" count={34} />
      <Flash at={[SLASH_AT]} color={colors.ice} strength={0.35} />
      <Flash at={[IMPACT_AT]} strength={0.7} />
      <Scanlines />
      <Vignette />
    </AbsoluteFill>
  );
};
