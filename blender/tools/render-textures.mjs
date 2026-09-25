// Rasterise les SVG de blender/textures/ en PNG avec resvg.
// Usage (depuis blender/tools/) : npm run textures
import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const texturesDir = join(here, "..", "textures");
const fontFiles = [join(here, "..", "..", "brand", "fonts", "JetBrainsMono.ttf")];

// label.svg référence logo.svg : on l'inline en data URI pour que resvg le rende en vectoriel
const logoDataUri =
  "data:image/svg+xml;base64," + readFileSync(join(texturesDir, "logo.svg")).toString("base64");

const jobs = [
  { src: "logo.svg", out: "logo.png", width: 2048 },
  { src: "label.svg", out: "label.png", width: 3072 },
];

for (const { src, out, width } of jobs) {
  const svg = readFileSync(join(texturesDir, src), "utf8").replaceAll(
    'xlink:href="logo.svg"',
    `xlink:href="${logoDataUri}"`,
  );
  const png = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    font: { fontFiles, loadSystemFonts: false, defaultFontFamily: "JetBrains Mono" },
  })
    .render()
    .asPng();
  writeFileSync(join(texturesDir, out), png);
  console.log(`${src} → ${out} (${width}px, ${(png.length / 1024).toFixed(0)} Ko)`);
}
