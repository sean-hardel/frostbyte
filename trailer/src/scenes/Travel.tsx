import type React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { BEAT, DISPLAY, MONO, colors, flavors } from "../brand";
import { CanSequence } from "../components/CanSequence";
import { Flash, IceShards, Shake, Vignette } from "../components/Fx";
import { Counter, Stat, Typed } from "../components/Hud";
import { useFormat } from "../format";

/*
  Travelling — plan Blender « travel » : part serré sur le logo et recule en arc (focale fixe,
  mise au point qui suit). Les trois données HUD tombent sur les temps, une fois la canette
  dégagée (pas sur le gros plan du logo). 16:9 : de part et d'autre ; 9:16 : bandes haute et basse.
*/

export const Travel: React.FC = () => {
  const frame = useCurrentFrame();
  const fmt = useFormat();
  const duration = fmt.duration.travel;
  const HITS = fmt.v([BEAT * 3, BEAT * 4, BEAT * 5], [BEAT * 2, BEAT * 3, BEAT * 4]);
  const seconds = (frame / 30).toFixed(1).padStart(4, "0");
  const size = fmt.v(112, 76);

  const pos = fmt.v(
    [{ left: 170, top: 250 }, { right: 100, top: 420 }, { left: 170, top: 620 }],
    [{ left: 70, top: 170 }, { right: 70, top: 170 }, { left: 70, top: 1560 }],
  );

  return (
    <AbsoluteFill style={{ backgroundColor: colors.night }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 55%, ${colors.ice}30 0%, transparent 45%)` }} />

      {/* Texte géant en contour qui défile derrière la canette */}
      <AbsoluteFill style={{ justifyContent: "center" }}>
        <div
          style={{
            fontFamily: DISPLAY,
            fontWeight: 800,
            fontSize: fmt.v(360, 300),
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
        <CanSequence shot="travel" flavor={flavors[0]} duration={duration} />
      </Shake>

      <Stat at={HITS[0]} value="0 G" label="SUCRE" accent={colors.ice} valueSize={size} style={pos[0]} />
      <Stat
        at={HITS[1]}
        value={<Counter at={HITS[1]} to={32} suffix=" MG" size={size} />}
        label={fmt.v("CAFÉINE / 100 ML", "CAFÉINE")}
        accent={colors.ice}
        align="right"
        valueSize={size}
        style={pos[1]}
      />
      <Stat at={HITS[2]} value="-2 °C" label="CRYO BLEND" accent={colors.ice} valueSize={size} style={pos[2]} />

      <AbsoluteFill
        style={{ padding: fmt.v("60px 80px", "70px 70px"), flexDirection: "row", justifyContent: "space-between" }}
      >
        <Typed at={4} text="// FB-500 — scan" size={22} color={colors.ice} speed={2} />
        <div style={{ fontFamily: MONO, fontSize: 22, letterSpacing: "0.2em", color: colors.alu }}>T+{seconds}s</div>
      </AbsoluteFill>

      <IceShards at={HITS[0]} seed="travel" count={22} speed={0.9} />
      <Flash at={HITS} color={colors.ice} strength={0.22} />
      <Vignette />
    </AbsoluteFill>
  );
};
