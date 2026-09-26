import tokens from "../../brand/tokens.json";
import { loadFont as loadSyne } from "@remotion/google-fonts/Syne";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

export type Flavor = (typeof tokens.flavors)[number];

export const brand = tokens;
export const flavors: Flavor[] = tokens.flavors;
export const colors = tokens.colors;

export const DISPLAY = loadSyne("normal", { weights: ["700", "800"], subsets: ["latin"] }).fontFamily;
export const MONO = loadMono("normal", { weights: ["400", "500"], subsets: ["latin"] }).fontFamily;

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
