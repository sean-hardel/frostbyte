import type React from "react";
import { AbsoluteFill, Easing, useCurrentFrame } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { T, colors, flavors, type FormatId } from "./brand";
import { FormatProvider, useFormat } from "./format";
import { Intro } from "./scenes/Intro";
import { Macro } from "./scenes/Macro";
import { Travel } from "./scenes/Travel";
import { Flavor } from "./scenes/Flavor";
import { Outro } from "./scenes/Outro";
import { iceWipe } from "./transitions/iceWipe";
import { punchZoom } from "./transitions/punchZoom";
import { ColdGrade, FrostParticles, Grain } from "./components/Atmosphere";
import { Soundtrack, sceneStarts } from "./Soundtrack";

/*
  Montage (identique en 16:9 et 9:16, seules les durées changent — voir FORMATS dans brand.ts) :
  Intro → (punch) → Macro → (volet de glace) → Travelling → (slide) → Mint → (volet de glace)
  → Berry → (slide) → Citrus → (punch) → Outro. Chaque transition dure 1 temps.
  Par-dessus : givre, étalonnage froid, grain ; puis la bande-son.
*/

const timing = linearTiming({ durationInFrames: T, easing: Easing.inOut(Easing.cubic) });

const toFlavor = (i: number) =>
  i % 2 === 1 ? (
    <TransitionSeries.Transition
      key={`t-${i}`}
      presentation={iceWipe({ direction: "from-right", edgeColor: flavors[i].accent })}
      timing={timing}
    />
  ) : (
    <TransitionSeries.Transition key={`t-${i}`} presentation={slide({ direction: "from-right" })} timing={timing} />
  );

const Montage: React.FC = () => {
  const { duration: d } = useFormat();
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={d.intro}>
        <Intro />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={punchZoom({ flashColor: colors.frost })} timing={timing} />
      <TransitionSeries.Sequence durationInFrames={d.macro}>
        <Macro />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={iceWipe({ direction: "from-left", edgeColor: colors.ice })} timing={timing} />
      <TransitionSeries.Sequence durationInFrames={d.travel}>
        <Travel />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={timing} />

      {flavors.flatMap((flavor, i) => [
        i > 0 ? toFlavor(i) : null,
        <TransitionSeries.Sequence key={flavor.id} durationInFrames={d.flavor}>
          <Flavor flavor={flavor} index={i} />
        </TransitionSeries.Sequence>,
      ])}

      <TransitionSeries.Transition presentation={punchZoom({ flashColor: colors.frost })} timing={timing} />
      <TransitionSeries.Sequence durationInFrames={d.outro}>
        <Outro />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};

/** Givre : accent de la saveur à l'écran, poussée sur les impacts forts. */
const Atmosphere: React.FC = () => {
  const fmt = useFormat();
  const s = sceneStarts(fmt.duration);
  return (
    <>
      {[
        { from: 0, to: s.flavors[0], accent: colors.ice },
        ...flavors.map((f, i) => ({ from: s.flavors[i], to: s.flavors[i + 1] ?? s.outro, accent: f.accent })),
        { from: s.outro, to: Infinity, accent: colors.ice },
      ].map(({ from, to, accent }) => (
        <FrostWindow key={from} from={from} to={to} accent={accent} impacts={[45, s.outro + fmt.v(30, 15)]} />
      ))}
      <ColdGrade />
      <Grain />
    </>
  );
};

/** Particules actives sur une fenêtre de frames (évite 3 couches simultanées). */
const FrostWindow: React.FC<{ from: number; to: number; accent: string; impacts: number[] }> = ({ from, to, accent, impacts }) => (
  <FrameGate from={from} to={to}>
    <FrostParticles accent={accent} impacts={impacts} />
  </FrameGate>
);

const FrameGate: React.FC<{ from: number; to: number; children: React.ReactNode }> = ({ from, to, children }) => {
  const frame = useCurrentFrame();
  return frame >= from && frame < to ? <>{children}</> : null;
};

export const Trailer: React.FC<{ format: FormatId }> = ({ format }) => (
  <FormatProvider id={format}>
    <AbsoluteFill style={{ backgroundColor: colors.night }}>
      <Montage />
      <Atmosphere />
      <Soundtrack />
    </AbsoluteFill>
  </FormatProvider>
);
