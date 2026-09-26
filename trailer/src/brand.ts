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
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const BEAT = 15;
/** Durée d'une transition (1 temps). */
export const T = BEAT;

/*
  Durées des scènes. Chaque transition chevauche deux scènes de T frames, donc
  total = somme des scènes − 5 × T = 750 (25 s). Toutes les durées − T sont des
  multiples de BEAT : chaque scène démarre sur un temps (0, 75, 210, 345, 480, 615).
*/
export const DURATION = {
  intro: 90,
  reveal: 150,
  flavor: 150,
  outro: 135,
} as const;

export const TOTAL =
  DURATION.intro + DURATION.reveal + DURATION.flavor * flavors.length + DURATION.outro - (flavors.length + 2) * T;

/** Nombre d'images du turntable Blender (07_turntable.py). */
export const TURNTABLE_FRAMES = 150;
