// Vérifie que les plans Blender du trailer sont présents et complets (ils sont gitignorés) :
// nombre d'images, taille (1920×1080 / 1080×1920) et canal alpha (PNG RGBA).
// Lancé avant `npm run studio` et les rendus.
import { existsSync, readdirSync, openSync, readSync, closeSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
// Doit correspondre à DURATIONS (blender/scripts/11_shots.py) et à JOBS (scripts/render-shots.mjs)
const FRAMES = { macro: [90, 75], travel: [120, 90], orbit: [135, 75] };
const SIZE = { "16x9": [1920, 1080], "9x16": [1080, 1920] };
const JOBS = [["macro", "mint"], ["travel", "mint"], ["orbit", "mint"], ["orbit", "berry"], ["orbit", "citrus"]];

function pngHeader(file) {
  const fd = openSync(file, "r");
  const b = Buffer.alloc(26);
  readSync(fd, b, 0, 26, 0);
  closeSync(fd);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), colorType: b[25] };
}

const problems = [];
for (const [shot, flavor] of JOBS) {
  for (const [format, [w, h]] of Object.entries(SIZE)) {
    const expected = FRAMES[shot][format === "9x16" ? 1 : 0];
    const dir = join(root, "public", "renders", shot, flavor, format);
    const files = existsSync(dir) ? readdirSync(dir).filter((n) => /^\d{4}\.png$/.test(n)) : [];
    if (files.length < expected) {
      problems.push(`${shot}/${flavor}/${format} : ${files.length}/${expected} images`);
      continue;
    }
    for (const f of [files[0], files[files.length - 1]]) {
      const p = pngHeader(join(dir, f));
      if (p.w !== w || p.h !== h || p.colorType !== 6) problems.push(`${shot}/${flavor}/${format}/${f} : ${p.w}×${p.h}, type ${p.colorType}`);
    }
  }
}

// Musique : non versionnée (.gitignore), à fournir localement (voir public/sfx/CREDITS.md)
if (!existsSync(join(root, "public", "musique.mp3"))) {
  problems.push("public/musique.mp3 absente : fichier non versionné, à placer à la main (voir public/sfx/CREDITS.md)");
}

if (problems.length) {
  console.error("Rendus Blender manquants ou invalides :\n  " + problems.join("\n  "));
  console.error("Pour les (re)générer, depuis trailer/ : node scripts/render-shots.mjs   (Cycles GPU, ~1 h)");
  process.exit(1);
}
console.log(`Rendus OK : ${JOBS.length * 2} séquences`);
