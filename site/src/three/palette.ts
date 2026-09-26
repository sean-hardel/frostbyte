import * as THREE from "three";
import { brand, flavors, type Flavor } from "../brand";
import type { Can } from "./can";

/*
  Recoloration de l'étiquette par saveur, sans texture supplémentaire.

  label.png n'utilise que trois couleurs de référence : frost, night et ice (cyan).
  Elles sont linéairement indépendantes en RGB : tout pixel (anti-aliasing compris)
  s'écrit c = M_ref · w, où M_ref a ces trois couleurs pour colonnes.
  La couleur recolorée est c' = P · w = (P · M_ref⁻¹) · c, où P a pour colonnes
  les couleurs de la saveur. Une seule mat3 par saveur, appliquée dans le shader ;
  une transition entre saveurs est une simple interpolation de deux mat3.
  Tous les calculs se font en espace linéaire (celui du shader).
*/

function linear(hex: string) {
  return new THREE.Color(hex); // three convertit sRGB → linéaire à la création
}

function columns(a: THREE.Color, b: THREE.Color, c: THREE.Color) {
  // Matrix3.set est en ordre ligne ; a, b, c sont les colonnes
  return new THREE.Matrix3().set(a.r, b.r, c.r, a.g, b.g, c.g, a.b, b.b, c.b);
}

const refInverse = columns(
  linear(brand.colors.frost),
  linear(brand.colors.night),
  linear(brand.colors.ice),
).invert();

type Palette = {
  recolor: THREE.Matrix3;
  alu: THREE.Color;
  /** Couleurs CSS (sRGB) pour le fond et l'accent de la page. */
  bg: THREE.Color;
  accent: THREE.Color;
};

function paletteOf(f: Flavor): Palette {
  // Couleurs d'étiquette propres à la saveur (≠ couleurs de page) : frost → base, night → ink, ice → accent
  const target = columns(linear(f.label.base), linear(f.label.ink), linear(f.label.accent));
  return {
    recolor: target.multiply(refInverse),
    alu: linear(f.alu),
    bg: srgbRaw(f.night),
    accent: srgbRaw(f.accent),
  };
}

/** Couleur gardée en valeurs sRGB brutes (pas de conversion), pour interpoler en sRGB. */
function srgbRaw(hex: string) {
  return new THREE.Color().setStyle(hex, THREE.LinearSRGBColorSpace);
}

export type PaletteController = {
  /** t ∈ [0, flavors.length - 1] : 0 = mint, 1 = berry, 2 = citrus, valeurs intermédiaires = fondu. */
  set(t: number): void;
};

export function createPalette(can: Can): PaletteController {
  const palettes = flavors.map(paletteOf);
  const uRecolor = { value: palettes[0].recolor.clone() };

  can.label.onBeforeCompile = (shader) => {
    shader.uniforms.uRecolor = uRecolor;
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform mat3 uRecolor;")
      .replace(
        "#include <map_fragment>",
        "#include <map_fragment>\n\tdiffuseColor.rgb = max(uRecolor * diffuseColor.rgb, 0.0);",
      );
  };
  can.label.needsUpdate = true;

  const root = document.documentElement.style;
  const bg = new THREE.Color();
  const accent = new THREE.Color();
  let current = -1;

  return {
    set(t) {
      const max = palettes.length - 1;
      t = THREE.MathUtils.clamp(t, 0, max);
      if (t === current) return;
      current = t;

      const i = Math.min(Math.floor(t), max - 1);
      const f = t - i;
      const a = palettes[i];
      const b = palettes[i + 1];

      const m = uRecolor.value.elements;
      for (let k = 0; k < 9; k++) {
        m[k] = a.recolor.elements[k] * (1 - f) + b.recolor.elements[k] * f;
      }
      for (const mat of can.alu) mat.color.lerpColors(a.alu, b.alu, f);

      // Interpolation en sRGB pour le CSS (fondu perçu plus régulier)
      bg.lerpColors(a.bg, b.bg, f);
      accent.lerpColors(a.accent, b.accent, f);
      root.setProperty("--bg", `#${bg.getHexString(THREE.LinearSRGBColorSpace)}`);
      root.setProperty("--accent", `#${accent.getHexString(THREE.LinearSRGBColorSpace)}`);
    },
  };
}
