import type React from "react";
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BEAT, DISPLAY, MONO, TURNTABLE_FRAMES, brand, colors, flavors } from "../brand";
import { turntableSrc } from "../components/CanSequence";
import { Crystal } from "../components/Crystal";
import { Flash, IceShards, Scanlines, Shake, Vignette } from "../components/Fx";
import { Typed } from "../components/Hud";
import { Wordmark, type LetterState } from "../components/Wordmark";

/*
  Outro (135 frames) — temps : 0 les 3 canettes montent · 30 logo · 60 slogan · 75 infos.
  Les canettes utilisent la dernière image de chaque turntable (logo de face).
*/

const CANS_AT = 4;
const LOGO_AT = BEAT * 2; // 30
const SLOGAN_AT = BEAT * 4; // 60
const INFO_AT = BEAT * 5; // 75

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [sharp, cold] = brand.tagline.split(/(?<=\.)\s/);

  const letter = (i: number): LetterState => {
    const p = spring({ frame: frame - LOGO_AT - 4 - i * 1.5, fps, config: { damping: 13, stiffness: 300, mass: 0.5 } });
    return { y: (1 - p) * 60, opacity: Math.min(1, p * 2), scale: 1.4 - 0.4 * p };
  };
  const crystal = interpolate(frame, [LOGO_AT, LOGO_AT + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const slogan = spring({ frame: frame - SLOGAN_AT, fps, config: { damping: 14, stiffness: 220 } });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.night }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 100%, ${colors.ice}2e 0%, transparent 60%)` }} />

      <Shake at={[LOGO_AT]} amplitude={10}>
        {/* Les 3 canettes, en cascade depuis le bas */}
        {flavors.map((f, i) => {
          const p = spring({ frame: frame - CANS_AT - i * 5, fps, config: { damping: 14, stiffness: 170, mass: 0.7 } });
          const x = (i - 1) * 380;
          return (
            <AbsoluteFill
              key={f.id}
              style={{ transform: `translate(${x}px, ${300 + (1 - p) * 800}px) scale(0.52) rotate(${(1 - p) * (i - 1) * 12}deg)` }}
            >
              <Img src={turntableSrc(f, TURNTABLE_FRAMES)} style={{ width: "100%", height: "100%" }} />
            </AbsoluteFill>
          );
        })}

        {/* Logo : cristal + wordmark */}
        <AbsoluteFill style={{ alignItems: "center", paddingTop: 70 }}>
          <Crystal size={120} draw={crystal} rotation={(1 - crystal) * 90} />
          <div style={{ marginTop: 34 }}>
            <Wordmark width={1040} letter={letter} />
          </div>
          <div
            style={{
              display: "flex",
              gap: 26,
              marginTop: 40,
              fontFamily: DISPLAY,
              fontWeight: 700,
              fontSize: 60,
              color: colors.frost,
              opacity: Math.min(1, slogan * 1.5),
              transform: `translateY(${(1 - slogan) * 40}px)`,
            }}
          >
            <span>{sharp}</span>
            <span style={{ color: colors.ice }}>{cold}</span>
          </div>
          <Typed at={INFO_AT} text="Zero sugar · 500 ml · 3 saveurs" size={24} color={colors.alu} speed={2}
            style={{ marginTop: 18 }} />
        </AbsoluteFill>
      </Shake>

      <div
        style={{
          position: "absolute",
          right: 60,
          bottom: 40,
          fontFamily: MONO,
          fontSize: 18,
          letterSpacing: "0.1em",
          color: colors.alu,
          opacity: interpolate(frame, [INFO_AT, INFO_AT + 10], [0, 0.7], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      >
        Marque fictive — projet démo.
      </div>

      <IceShards at={LOGO_AT} seed="outro" count={30} origin={[960, 300]} />
      <Flash at={[LOGO_AT]} strength={0.55} />
      <Scanlines opacity={0.05} />
      <Vignette />
    </AbsoluteFill>
  );
};
