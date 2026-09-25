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

export default defineConfig({
  plugins: [brandTokens()],
  server: {
    // brand/tokens.json est importé depuis la racine du repo
    fs: { allow: [".."] },
  },
  build: {
    target: "es2022",
    // three.js seul pèse ~600 Ko minifié (~170 Ko gzip) : le bundle unique est attendu
    chunkSizeWarningLimit: 900,
  },
});
