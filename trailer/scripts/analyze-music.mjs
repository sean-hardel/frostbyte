// Analyse de public/musique.mp3 : vérifie le tempo (120 BPM attendu), trouve la phase des temps et
// propose les extraits les plus énergiques (25 s pour le 16:9, 15 s pour le 9:16) démarrant sur une mesure.
// Décodage via le ffmpeg fourni par Remotion (build réduit : pas de sortie PCM brute, on passe par un WAV
// temporaire) → PCM 16 bits mono 22 050 Hz.
// Usage (depuis trailer/) : node scripts/analyze-music.mjs
import { execFileSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SR = 22050;
const HOP = 256; // ~11,6 ms
const wavPath = join(tmpdir(), `fb-music-${process.pid}.wav`);
execFileSync(
  "npx",
  ["remotion", "ffmpeg", "-v", "error", "-y", "-i", "public/musique.mp3", "-ac", "1", "-ar", String(SR), "-c:a", "pcm_s16le", wavPath],
  { stdio: "inherit", shell: true },
);
const wav = readFileSync(wavPath);
rmSync(wavPath);
const dataAt = wav.indexOf("data") + 8; // en-tête RIFF : on saute jusqu'au bloc "data"
const samples = new Int16Array(wav.buffer, wav.byteOffset + dataAt, Math.floor((wav.length - dataAt) / 2));
const x = Float32Array.from(samples, (s) => s / 32768);
const duration = x.length / SR;

// Enveloppe d'attaque : flux d'énergie positif par trame (onset strength)
const frames = Math.floor(x.length / HOP);
const energy = new Float32Array(frames);
for (let f = 0; f < frames; f++) {
  let s = 0;
  for (let i = f * HOP; i < (f + 1) * HOP; i++) s += x[i] * x[i];
  energy[f] = Math.log1p(1000 * s / HOP);
}
const onset = new Float32Array(frames);
for (let f = 1; f < frames; f++) onset[f] = Math.max(0, energy[f] - energy[f - 1]);
const fps = SR / HOP;

// Tempo : autocorrélation de l'enveloppe entre 70 et 180 BPM
let best = { bpm: 0, score: -Infinity };
for (let bpm = 70; bpm <= 180; bpm += 0.25) {
  const lag = (60 / bpm) * fps;
  let s = 0;
  for (let f = 0; f + lag < frames; f++) {
    const l = f + lag, i = Math.floor(l), t = l - i;
    s += onset[f] * (onset[i] * (1 - t) + (onset[i + 1] ?? 0) * t);
  }
  if (s > best.score) best = { bpm, score: s };
}

// Phase à 120 BPM : décalage (s) qui maximise l'énergie sur la grille des temps
const BEAT = 0.5;
let phase = { offset: 0, score: -Infinity };
for (let off = 0; off < BEAT; off += 0.002) {
  let s = 0;
  for (let t = off; t < duration; t += BEAT) s += onset[Math.round(t * fps)] ?? 0;
  if (s > phase.score) phase = { offset: off, score: s };
}

// Phase de la mesure (4 temps) : le temps 1 est le plus accentué
const bar = [0, 1, 2, 3].map((k) => {
  let s = 0;
  for (let t = phase.offset + k * BEAT; t < duration; t += 4 * BEAT) s += onset[Math.round(t * fps)] ?? 0;
  return s;
});
const downbeat = phase.offset + bar.indexOf(Math.max(...bar)) * BEAT;

// Extraits les plus énergiques (RMS moyen), démarrant sur une mesure
const rmsAt = (a, b) => {
  let s = 0;
  const i0 = Math.floor(a * SR), i1 = Math.min(x.length, Math.floor(b * SR));
  for (let i = i0; i < i1; i++) s += x[i] * x[i];
  return Math.sqrt(s / Math.max(1, i1 - i0));
};
const excerpts = (len) => {
  const out = [];
  for (let t = downbeat; t + len <= duration; t += 4 * BEAT) out.push({ start: +t.toFixed(3), rms: rmsAt(t, t + len) });
  return out.sort((a, b) => b.rms - a.rms).slice(0, 4);
};

// Profil d'énergie par tranches de 5 s (pour repérer intro / montée / drop)
const profile = [];
for (let t = 0; t < duration; t += 5) profile.push(`${String(t).padStart(3)}s ${"#".repeat(Math.round(rmsAt(t, t + 5) * 120))}`);

console.log(JSON.stringify({
  duration: +duration.toFixed(2),
  tempoEstime: best.bpm,
  phaseTemps: +phase.offset.toFixed(3),
  premierTempsFort: +downbeat.toFixed(3),
  accentsParTemps: bar.map((v) => +v.toFixed(1)),
  extraits25s: excerpts(25),
  extraits15s: excerpts(15),
}, null, 2));
console.log(profile.join("\n"));
