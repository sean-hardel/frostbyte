import type React from "react";
import { Easing } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { DURATION, T, colors, flavors } from "./brand";
import { Intro } from "./scenes/Intro";
import { Reveal } from "./scenes/Reveal";
import { Flavor } from "./scenes/Flavor";
import { Outro } from "./scenes/Outro";
import { iceWipe } from "./transitions/iceWipe";
import { punchZoom } from "./transitions/punchZoom";

/*
  Montage : Intro → (punch) → Reveal → (volet de glace) → Mint → (whip) → Berry
  → (volet de glace inversé) → Citrus → (punch) → Outro. Chaque transition dure 1 temps.
*/

const timing = linearTiming({ durationInFrames: T, easing: Easing.inOut(Easing.cubic) });

/** Transition vers la saveur `i` (i ≥ 1) : whip, puis volet de glace inversé. */
const toFlavor = (i: number) =>
  i % 2 === 1 ? (
    <TransitionSeries.Transition key={`t-${i}`} presentation={slide({ direction: "from-right" })} timing={timing} />
  ) : (
    <TransitionSeries.Transition
      key={`t-${i}`}
      presentation={iceWipe({ direction: "from-right", edgeColor: flavors[i].accent })}
      timing={timing}
    />
  );

export const Trailer: React.FC = () => (
  <TransitionSeries>
    <TransitionSeries.Sequence durationInFrames={DURATION.intro}>
      <Intro />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={punchZoom({ flashColor: colors.frost })} timing={timing} />
    <TransitionSeries.Sequence durationInFrames={DURATION.reveal}>
      <Reveal />
    </TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={iceWipe({ direction: "from-left", edgeColor: flavors[0].accent })} timing={timing} />

    {flavors.flatMap((flavor, i) => [
      i > 0 ? toFlavor(i) : null,
      <TransitionSeries.Sequence key={flavor.id} durationInFrames={DURATION.flavor}>
        <Flavor flavor={flavor} index={i} />
      </TransitionSeries.Sequence>,
    ])}

    <TransitionSeries.Transition presentation={punchZoom({ flashColor: colors.frost })} timing={timing} />
    <TransitionSeries.Sequence durationInFrames={DURATION.outro}>
      <Outro />
    </TransitionSeries.Sequence>
  </TransitionSeries>
);
