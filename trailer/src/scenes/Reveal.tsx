import type React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { BEAT, DISPLAY, DURATION, MONO, colors, flavors } from "../brand";
import { CanSequence } from "../components/CanSequence";
import { Flash, IceShards, Scanlines, Shake, Vignette } from "../components/Fx";
import { Counter, Stat, Typed } from "../components/Hud";

/*
  Reveal (150 frames) — le turntable mint complet ; trois données HUD tombent sur les temps 30, 60, 90.
*/

const HITS = [BEAT * 2, BEAT * 4, BEAT * 6]; // 30, 60, 90

export const Reveal: React.FC = () => {
  const frame = useCurrentFrame();
  const mint = flavors[0];
  const push = interpolate(frame, [0, DURATION.reveal], [1, 1.12]);
  const seconds = (frame / 30).toFixed(1).padStart(4, "0");

  return (
    <AbsoluteFill style={{ backgroundColor: colors.night }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 55%, ${colors.ice}30 0%, transparent 45%)` }} />

      {/* Texte géant en contour qui défile derrière la canette */}
      <AbsoluteFill style={{ justifyContent: "center" }}>
        <div
          style={{
            fontFamily: DISPLAY,
            fontWeight: 800,
            fontSize: 360,
            whiteSpace: "nowrap",
            color: "transparent",
            WebkitTextStroke: `3px ${colors.frost}`,
            opacity: 0.1,
            transform: `translateX(${-frame * 6}px)`,
          }}
        >
          CRYO BLEND CRYO BLEND CRYO BLEND
        </div>
      </AbsoluteFill>

      <Shake at={HITS} amplitude={8}>
        <AbsoluteFill style={{ transform: `scale(${push})` }}>
          <CanSequence flavor={mint} duration={DURATION.reveal} />
        </AbsoluteFill>
      </Shake>

      <Stat at={HITS[0]} value="0 G" label="SUCRE" accent={colors.ice} style={{ left: 170, top: 250 }} />
      <Stat
        at={HITS[1]}
        value={<Counter at={HITS[1]} to={32} suffix=" MG" size={112} />}
        label="CAFÉINE / 100 ML"
        accent={colors.ice}
        align="right"
        style={{ right: 100, top: 420 }}
      />
      <Stat at={HITS[2]} value="-2 °C" label="CRYO BLEND" accent={colors.ice} style={{ left: 170, top: 620 }} />

      <AbsoluteFill style={{ padding: "60px 80px", flexDirection: "row", justifyContent: "space-between" }}>
        <Typed at={4} text="// FB-500 — scan" size={22} color={colors.ice} speed={2} />
        <div style={{ fontFamily: MONO, fontSize: 22, letterSpacing: "0.2em", color: colors.alu }}>T+{seconds}s</div>
      </AbsoluteFill>

      <IceShards at={HITS[0]} seed="reveal" count={22} speed={0.9} />
      <Flash at={HITS} color={colors.ice} strength={0.22} />
      <Scanlines opacity={0.05} />
      <Vignette />
    </AbsoluteFill>
  );
};
