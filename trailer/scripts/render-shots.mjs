// Rend tous les plans Blender du trailer (blender/scripts/11_shots.py), un processus Blender par séquence.
// Usage (depuis trailer/) :
//   node scripts/render-shots.mjs                 → Cycles GPU, tout
//   node scripts/render-shots.mjs --engine eevee  → aperçus EEVEE
//   node scripts/render-shots.mjs --only orbit    → filtre sur le nom de séquence (ex. "orbit/citrus")
// Sortie : public/renders/<plan>/<saveur>/<format>/####.png ; journal : out/render-shots.log
import { spawn } from "node:child_process";
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const BLENDER = process.env.BLENDER ?? "C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe";
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, v, i, a) => (v.startsWith("--") ? [...acc, [v.slice(2), a[i + 1]]] : acc), []),
);
const engine = args.engine ?? "cycles";

export const JOBS = [
  ["macro", "mint"],
  ["travel", "mint"],
  ["orbit", "mint"],
  ["orbit", "berry"],
  ["orbit", "citrus"],
].flatMap(([shot, flavor]) => ["16x9", "9x16"].map((format) => ({ shot, flavor, format })));

const log = join(root, "trailer", "out", "render-shots.log");
mkdirSync(dirname(log), { recursive: true });
const say = (line) => {
  console.log(line);
  appendFileSync(log, `${new Date().toISOString()} ${line}\n`);
};

function run(job) {
  return new Promise((resolve, reject) => {
    const p = spawn(BLENDER, [
      "-b", join(root, "blender", "canette.blend"),
      "-P", join(root, "blender", "scripts", "11_shots.py"),
      "--", "--shot", job.shot, "--flavor", job.flavor, "--format", job.format, "--engine", engine,
    ]);
    let tail = "";
    p.stdout.on("data", (d) => {
      tail = (tail + d).slice(-4000);
      for (const line of String(d).split(/\r?\n/)) if (line.includes("[FB]")) say(`  ${line.trim()}`);
    });
    p.stderr.on("data", (d) => (tail = (tail + d).slice(-4000)));
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`Blender a échoué (${code})\n${tail}`))));
  });
}

const jobs = JOBS.filter((j) => !args.only || `${j.shot}/${j.flavor}/${j.format}`.includes(args.only));
say(`== ${jobs.length} séquence(s), moteur ${engine}`);
const t0 = Date.now();
for (const [i, job] of jobs.entries()) {
  const t = Date.now();
  say(`[${i + 1}/${jobs.length}] ${job.shot}/${job.flavor}/${job.format}`);
  await run(job);
  say(`  terminé en ${((Date.now() - t) / 60000).toFixed(1)} min`);
}
say(`== tout terminé en ${((Date.now() - t0) / 60000).toFixed(1)} min`);
