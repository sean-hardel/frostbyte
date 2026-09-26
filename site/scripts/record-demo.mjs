// Enregistre la démo du site (docs/demo.gif) : scroll du hero jusqu'au CTA, en passant par le zoom sur le logo
// et les 3 saveurs. Rendu image par image avec une horloge contrôlée (page.clock) : chaque image avance le temps
// de la page d'exactement 1/FPS s, quel que soit le temps de rendu (WebGL logiciel en headless) → animation régulière.
// Usage (depuis site/) : node scripts/record-demo.mjs [url]   (défaut : le site en ligne)
// Sortie : images PNG dans un dossier temporaire, puis GIF optimisé via le ffmpeg de Remotion (trailer/).
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const URL = process.argv[2] ?? "https://sean-hardel.github.io/frostbyte/";
const FPS = 15;
const SIZE = { width: 1280, height: 720 };
const MAX_BYTES = 8 * 1024 * 1024;
const OUT = join(root, "docs", "demo.gif");

// Parcours : [section d'arrivée, durée du trajet (s), pause une fois arrivé (s)]
const PATH = [
  ["hero", 0, 0.8],
  ["spin", 1.6, 0.2],
  ["zoom", 1.6, 0.8],
  ["mint", 1.4, 0.7],
  ["berry", 1.2, 0.7],
  ["citrus", 1.2, 0.7],
  ["cta", 1.8, 1.0],
];

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2); // easeInOutCubic

const frames = mkdtempSync(join(tmpdir(), "fb-demo-"));
const browser = await chromium.launch({
  channel: process.env.PW_CHANNEL ?? "msedge",
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--hide-scrollbars"],
});
try {
  const page = await browser.newPage({ viewport: SIZE, deviceScaleFactor: 1 });
  await page.clock.install();
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForSelector("#loader.is-done", { state: "attached", timeout: 30000 });

  // Premier geste → la 3D démarre ; on attend la canette, l'HDRI et la condensation.
  // (Suivi par les événements réseau de Playwright : l'horloge simulée remplace aussi `performance`,
  // dont la liste des ressources est alors vide.)
  const assets = ["studio_small_03", "condensation_normal", "condensation_mask"].map((n) =>
    page.waitForResponse((r) => r.url().includes(n) && r.ok(), { timeout: 60000 }),
  );
  await page.mouse.wheel(0, 1);
  await page.waitForFunction(() => document.documentElement.classList.contains("is-3d"), null, { timeout: 60000 });
  await Promise.all(assets);
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(2500);

  // Positions « posées » des sections (bas de la section au bas de l'écran)
  const stops = await page.evaluate(() => {
    const y = (sel) => { const s = document.querySelector(sel); return Math.max(0, s.offsetTop + s.offsetHeight - innerHeight); };
    return {
      hero: 0, spin: y(".s-spin"), zoom: y(".s-zoom"), cta: y(".s-cta"),
      mint: y('[data-flavor="mint"]'), berry: y('[data-flavor="berry"]'), citrus: y('[data-flavor="citrus"]'),
    };
  });

  // Temps figé : désormais, seul runFor fait avancer la page
  await page.clock.pauseAt(await page.evaluate(() => Date.now()));

  const scrollTo = (y) =>
    page.evaluate((v) => {
      scrollTo(0, v);
      dispatchEvent(new Event("scroll")); // ScrollTrigger / Lenis voient le scroll dans la même image
    }, y);

  let n = 0;
  let from = 0;
  const shoot = async (y) => {
    await scrollTo(Math.round(y));
    await page.clock.runFor(1000 / FPS);
    await page.screenshot({ path: join(frames, `${String(n++).padStart(4, "0")}.png`) });
  };
  for (const [name, travel, hold] of PATH) {
    const to = stops[name];
    const moveFrames = Math.round(travel * FPS);
    for (let i = 1; i <= moveFrames; i++) await shoot(from + (to - from) * ease(i / moveFrames));
    for (let i = 0; i < Math.round(hold * FPS); i++) await shoot(to);
    from = to;
  }
  console.log(`${n} images (${(n / FPS).toFixed(1)} s à ${FPS} fps), arrêts : ${JSON.stringify(stops)}`);
} finally {
  await browser.close();
}

// GIF : palette générée sur toute la séquence (stats_mode=diff : couleurs des zones qui bougent),
// tramage bayer (compresse mieux que Floyd-Steinberg), seules les zones modifiées réencodées.
// Si le fichier dépasse 8 Mo, on allège d'abord la palette, puis seulement ensuite la largeur.
mkdirSync(dirname(OUT), { recursive: true });
const ffmpeg = (args) => execFileSync("npx", ["remotion", "ffmpeg", "-v", "error", "-y", ...args], { cwd: join(root, "trailer"), shell: true });
const LADDER = [
  { width: 1280, colors: 192, bayer: 4 },
  { width: 1280, colors: 160, bayer: 5 },
  { width: 1280, colors: 128, bayer: 5 },
  { width: 1120, colors: 160, bayer: 5 },
  { width: 960, colors: 160, bayer: 5 },
];
let size = 0;
for (const { width, colors, bayer } of LADDER) {
  const palette = join(frames, "palette.png");
  const input = ["-framerate", String(FPS), "-i", join(frames, "%04d.png")];
  ffmpeg([...input, "-vf", `scale=${width}:-1:flags=lanczos,palettegen=max_colors=${colors}:stats_mode=diff`, palette]);
  ffmpeg([...input, "-i", palette, "-lavfi",
    `scale=${width}:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=${bayer}:diff_mode=rectangle`,
    "-loop", "0", OUT]);
  size = statSync(OUT).size;
  console.log(`GIF ${width} px, ${colors} couleurs, bayer ${bayer} : ${(size / 1024 / 1024).toFixed(2)} Mo`);
  if (size <= MAX_BYTES) break;
}
rmSync(frames, { recursive: true, force: true });
if (size > MAX_BYTES) throw new Error("GIF toujours au-dessus de 8 Mo");
console.log(`→ ${OUT}`);
