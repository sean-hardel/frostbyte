// Vérifie la piste audio d'une vidéo rendue : attaques (onsets) détectées et écart à la grille des
// temps (multiples de 15 frames à 30 fps, soit 0,5 s). Usage : node scripts/check-audio.mjs out/trailer.mp4
import { execFileSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const input = process.argv[2] ?? "out/trailer.mp4";
const SR = 22050, HOP = 256;
const wavPath = join(tmpdir(), `fb-check-${process.pid}.wav`);
execFileSync("npx", ["remotion", "ffmpeg", "-v", "error", "-y", "-i", input, "-vn", "-ac", "1", "-ar", String(SR), "-c:a", "pcm_s16le", wavPath], { stdio: "inherit", shell: true });
const wav = readFileSync(wavPath);
rmSync(wavPath);
const d = wav.indexOf("data") + 8;
const s = new Int16Array(wav.buffer, wav.byteOffset + d, Math.floor((wav.length - d) / 2));

const frames = Math.floor(s.length / HOP);
const env = new Float32Array(frames);
for (let f = 0; f < frames; f++) {
  let e = 0;
  for (let i = f * HOP; i < (f + 1) * HOP; i++) e += (s[i] / 32768) ** 2;
  env[f] = Math.log1p(1000 * e / HOP);
}
const onset = env.map((v, f) => Math.max(0, v - (env[f - 1] ?? v)));
// Pics d'attaque : maxima locaux au-dessus du 95e centile, espacés d'au moins 0,2 s
const sorted = [...onset].sort((a, b) => a - b);
const thr = sorted[Math.floor(sorted.length * 0.95)];
const peaks = [];
for (let f = 1; f < frames - 1; f++) {
  const t = (f * HOP) / SR;
  if (onset[f] > thr && onset[f] >= onset[f - 1] && onset[f] >= onset[f + 1] && (!peaks.length || t - peaks.at(-1) > 0.2)) peaks.push(t);
}
const offs = peaks.map((t) => ((t + 0.25) % 0.5) - 0.25); // écart signé au temps le plus proche (s)
const onGrid = offs.filter((o) => Math.abs(o) < 0.05).length;
const median = [...offs].sort((a, b) => a - b)[Math.floor(offs.length / 2)];
const duration = s.length / SR;
console.log(JSON.stringify({
  fichier: input,
  dureeAudio: +duration.toFixed(2),
  attaques: peaks.length,
  surLaGrille: `${onGrid}/${peaks.length} à ±50 ms d'un temps`,
  ecartMedian_ms: Math.round(median * 1000),
  premieresAttaques_s: peaks.slice(0, 8).map((t) => +t.toFixed(2)),
}, null, 1));
