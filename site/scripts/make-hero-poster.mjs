// Génère l'image fixe de la canette du hero depuis la scène three.js elle-même (pose hero, HDRI et
// condensation chargées, sans particules, fond transparent) :
//   public/hero-can.webp   l'image, recadrée sur la canette
//   src/hero-poster.css    sa boîte en mètres (--w, --h, --cx, --cy), utilisée par styles.css (.hero-can)
// À relancer après toute modification de la canette, de ses matériaux ou de la pose hero.
// Usage (depuis site/, après `npm run build`) : node scripts/make-hero-poster.mjs
// Navigateur : Edge ou Chrome installé (playwright-core, sans téléchargement de navigateur).
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { preview } from "vite";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 4179;
const URL = `http://localhost:${PORT}/frostbyte/?debug`;

// Serveur de prévisualisation via l'API de Vite (pas de processus enfant à tuer)
const server = await preview({ root, preview: { port: PORT, strictPort: true, open: false }, logLevel: "warn" });

try {
  const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? "msedge" });
  // Paysage, haute définition : la canette fait ~62 % de la hauteur → ~1360 px de haut à DPR 2
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 2 });
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__fb?.snapshot, null, { timeout: 30000 });
  const { dataUrl, box } = await page.evaluate(() => window.__fb.snapshot());
  await browser.close();

  const png = Buffer.from(dataUrl.split(",")[1], "base64");
  writeFileSync(join(root, "public", "hero-can.webp"), png);
  const f = (v) => v.toFixed(5);
  writeFileSync(
    join(root, "src", "hero-poster.css"),
    `/* Généré par scripts/make-hero-poster.mjs — boîte de la canette (mètres) sur public/hero-can.webp */\n` +
      `.hero-can {\n  --w: ${f(box.w)};\n  --h: ${f(box.h)};\n  --cx: ${f(box.cx)};\n  --cy: ${f(box.cy)};\n}\n`,
  );
  console.log(`hero-can.webp : ${Math.round(png.length / 1024)} Ko, boîte ${JSON.stringify(box)}`);
} finally {
  await server.close();
}
