import tokens from "../../brand/tokens.json";
import { loadFont } from "@remotion/fonts";
import syneUrl from "../../brand/fonts/Syne.woff2";
import monoUrl from "../../brand/fonts/JetBrainsMono.woff2";

export type Flavor = (typeof tokens.flavors)[number];

export const brand = tokens;
export const flavors: Flavor[] = tokens.flavors;
export const colors = tokens.colors;

/*
  Polices locales (brand/fonts/, WOFF2 variables) : aucun accès réseau au rendu.
  loadFont bloque le rendu (delayRender) jusqu'au chargement : pas de frame en police de secours.
*/
loadFont({ family: tokens.fonts.display, url: syneUrl, weight: "400 800" });
loadFont({ family: tokens.fonts.mono, url: monoUrl, weight: "100 800" });

export const DISPLAY = `"${tokens.fonts.display}", sans-serif`;
export const MONO = `"${tokens.fonts.mono}", monospace`;

/* ---------- Timing : 30 fps, grille à 120 BPM (1 temps = 15 frames) ---------- */

export const FPS = 30;
export const BEAT = 15;
/** Durée d'une transition (1 temps). */
export const T = BEAT;

export type FormatId = "16x9" | "9x16";

/*
  Durées des scènes par format. Chaque transition chevauche deux scènes de T frames :
  total = somme des scènes − 6 × T. Chaque scène démarre sur un temps (multiple de 15).
  Les plans Blender (blender/scripts/11_shots.py, DURATIONS) ont exactement ces longueurs :
  macro = macro, travel = travel, orbit = flavor. Les modifier ensemble.
    16:9 : 90 + 90 + 120 + 3 × 135 + 135 − 90 = 750 (25 s) ; débuts 0, 75, 150, 255, 375, 495, 615
    9:16 : 75 + 75 +  90 + 3 ×  75 +  75 − 90 = 450 (15 s) ; débuts 0, 60, 120, 195, 255, 315, 375
*/
export const FORMATS = {
  "16x9": {
    width: 1920,
    height: 1080,
    duration: { intro: 90, macro: 90, travel: 120, flavor: 135, outro: 135 },
  },
  "9x16": {
    width: 1080,
    height: 1920,
    duration: { intro: 75, macro: 75, travel: 90, flavor: 75, outro: 75 },
  },
} as const;

export type Durations = (typeof FORMATS)[FormatId]["duration"];

export function totalFrames(format: FormatId) {
  const d = FORMATS[format].duration;
  return d.intro + d.macro + d.travel + d.flavor * flavors.length + d.outro - (flavors.length + 3) * T;
}

/* ---------- Musique (public/musique.mp3, 120 BPM, analysée par scripts/analyze-music.mjs) ---------- */

/*
  Temps à 0,016 s + k × 0,5 s ; drop à 97,016 s (fin du break 75 → 95 s).
  On démarre ~95,5 s pour que le drop tombe sur l'impact du logo de l'intro (frame 45),
  dans les deux formats. Mesuré sur le MP4 rendu (corrélation avec la source) : la chaîne
  MP3 → AAC avance la musique de ~44 ms (délais d'encodeur). On compense : 95,5 + 0,044,
  arrondi à la frame (trimBefore en frames) → 2867 frames = 95,567 s ; mesuré : drop à ~7 ms de la frame 45.
*/
export const MUSIC_START_SECONDS = 95.567;
