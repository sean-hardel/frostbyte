import tokens from "../../brand/tokens.json";

export type Flavor = (typeof tokens.flavors)[number];

export const brand = tokens;
export const flavors: Flavor[] = tokens.flavors;

/** Dimensions réelles de la canette (m), identiques au modèle Blender. */
export const CAN = {
  height: tokens.can.heightMm / 1000,
  radius: tokens.can.diameterMm / 2000,
  /** Centre du logo sur l'étiquette, relatif au centre de la canette (m). */
  logoY: 0.0173,
  /** Encombrement du logo (m) : hauteur, largeur. */
  logoSize: { h: 0.064, w: 0.058 },
} as const;
