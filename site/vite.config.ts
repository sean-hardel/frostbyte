import { defineConfig, type Plugin } from "vite";
import tokens from "../brand/tokens.json" with { type: "json" };

// Injecte les tokens de marque en CSS custom properties dans le <head> :
// disponibles dès le premier paint, sans couleur écrite en dur dans styles.css.
function brandTokens(): Plugin {
  const mint = tokens.flavors[0];
  const vars = {
    "--frost": tokens.colors.frost,
    "--ice": tokens.colors.ice,
    "--night": tokens.colors.night,
    "--alu": tokens.colors.alu,
    "--bg": mint.night,
    "--accent": mint.accent,
    "--font-display": `"${tokens.fonts.display}", system-ui, sans-serif`,
    "--font-mono": `"${tokens.fonts.mono}", ui-monospace, monospace`,
  };
  const css = Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(";");
  return {
    name: "brand-tokens",
    transformIndexHtml: (html) =>
      html
        .replace("</head>", `<style>:root{${css}}</style>\n</head>`)
        .replaceAll("%BRAND_NIGHT%", tokens.colors.night),
  };
}

export default defineConfig(() => ({
  // GitHub Pages : le site est servi sous https://sean-hardel.github.io/frostbyte/.
  // Même base en dev, build et preview (sinon preview sert à « / » un build qui pointe vers /frostbyte/).
  base: "/frostbyte/",
  plugins: [brandTokens()],
  server: {
    // brand/tokens.json est importé depuis la racine du repo
    fs: { allow: [".."] },
  },
  build: {
    target: "es2022",
    // three.js (~600 Ko minifié) est dans le chunk de la phase 2 (three/boot.ts), chargé au premier geste
    chunkSizeWarningLimit: 900,
  },
}));
