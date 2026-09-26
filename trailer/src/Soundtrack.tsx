import type React from "react";
import { Audio, Sequence, interpolate, staticFile, useVideoConfig } from "remotion";
import { FPS, MUSIC_START_SECONDS, T, flavors } from "./brand";
import { useFormat } from "./format";

/*
  Bande-son : musique (public/musique.mp3, 120 BPM, drop calé sur l'impact du logo, voir brand.ts)
  + effets CC0 (public/sfx/, crédits dans public/sfx/CREDITS.md), placés sur les moments forts.
  Les frames des effets sont dérivées des durées de scène : elles suivent le montage.
*/

/** Début (frame) de chaque scène, transitions d'un temps déduites. */
export function sceneStarts(d: { intro: number; macro: number; travel: number; flavor: number; outro: number }) {
  const order = [d.intro, d.macro, d.travel, ...flavors.map(() => d.flavor), d.outro];
  const starts: number[] = [];
  let t = 0;
  for (const len of order) {
    starts.push(t);
    t += len - T;
  }
  const [intro, macro, travel, ...rest] = starts;
  return { intro, macro, travel, flavors: rest.slice(0, flavors.length), outro: rest[flavors.length] };
}

const Sfx: React.FC<{ at: number; src: string; volume?: number; fadeOut?: number }> = ({ at, src, volume = 1, fadeOut = 0 }) => {
  const { durationInFrames } = useVideoConfig();
  const len = Math.min(durationInFrames - at, 4 * FPS);
  return (
    <Sequence from={at} durationInFrames={len} name={`sfx ${src}`}>
      <Audio
        src={staticFile(`sfx/${src}`)}
        volume={(f) =>
          fadeOut ? volume * interpolate(f, [len - fadeOut, len], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : volume
        }
      />
    </Sequence>
  );
};

export const Soundtrack: React.FC = () => {
  const fmt = useFormat();
  const { durationInFrames } = useVideoConfig();
  const s = sceneStarts(fmt.duration);
  const impact = fmt.v(45, 45); // impact du logo dans l'intro = drop de la musique
  const slash = 30; // « / » de l'intro
  const outroLogo = s.outro + fmt.v(30, 15);

  return (
    <>
      <Audio
        src={staticFile("musique.mp3")}
        trimBefore={Math.round(MUSIC_START_SECONDS * FPS)}
        volume={(f) =>
          0.85 *
          interpolate(f, [0, 6, durationInFrames - 45, durationInFrames - 1], [0, 1, 1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
        }
      />
      {/* Intro : ouverture de canette, craquement sur le « / », impact sur le drop */}
      <Sfx at={0} src="can-open.wav" volume={0.9} />
      <Sfx at={slash} src="ice-crack-2.wav" volume={0.7} fadeOut={10} />
      <Sfx at={impact} src="impact.wav" volume={0.8} fadeOut={30} />
      {/* Volets de glace : macro → travelling, saveur 1 → saveur 2 */}
      <Sfx at={s.travel - T + 2} src="ice-crack.wav" volume={0.65} fadeOut={15} />
      <Sfx at={s.flavors[1] - T + 2} src="ice-crack.wav" volume={0.55} fadeOut={15} />
      {/* Outro : coupe punch puis logo */}
      <Sfx at={s.outro - Math.round(T / 2)} src="impact-low.wav" volume={0.7} fadeOut={30} />
      <Sfx at={outroLogo} src="can-open.wav" volume={0.5} />
    </>
  );
};
