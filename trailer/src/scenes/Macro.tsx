import type React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { BEAT, colors, flavors } from "../brand";
import { CanSequence } from "../components/CanSequence";
import { Flash, Vignette } from "../components/Fx";
import { Slam, Typed } from "../components/Hud";
import { useFormat } from "../format";

/*
  Macro — plan Blender « macro » : gros plan sur les gouttes de condensation, trois gouttes glissent,
  la mise au point suit la principale. Léger push-in, accroche « Glacée à cœur. » sur les temps.
*/

export const Macro: React.FC = () => {
  const frame = useCurrentFrame();
  const fmt = useFormat();
  const duration = fmt.duration.macro;
  const push = interpolate(frame, [0, duration], [1, 1.06]);
  const LINE1 = fmt.v(BEAT * 2, BEAT);
  const LINE2 = LINE1 + BEAT / 3;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.night }}>
      <AbsoluteFill style={{ transform: `scale(${push})` }}>
        <CanSequence shot="macro" flavor={flavors[0]} duration={duration} />
      </AbsoluteFill>

      {/* Dégradé bas pour la lisibilité du texte */}
      <AbsoluteFill style={{ background: `linear-gradient(transparent 55%, ${colors.night}CC 100%)` }} />

      <AbsoluteFill style={{ padding: fmt.v("60px 80px", "120px 70px"), justifyContent: "space-between" }}>
        <Typed at={4} text="// macro — condensation" size={22} color={colors.ice} speed={2.5} />
        <div style={{ paddingBottom: fmt.v(20, 140) }}>
          <Slam at={LINE1} size={fmt.v(120, 130)} color={colors.ice}>Glacée</Slam>
          <Slam at={LINE2} size={fmt.v(120, 130)} color={colors.frost}>à cœur.</Slam>
        </div>
      </AbsoluteFill>

      <Flash at={[LINE1]} color={colors.ice} strength={0.18} />
      <Vignette />
    </AbsoluteFill>
  );
};
