// Génère l'env map du site : HDRI Poly Haven studio_small_03 (CC0, le même que dans Blender),
// réduit de 1024 × 512 à 512 × 256 pour le mobile, écrit en .hdr RGBE non compressé.
// Usage (depuis site/) : node scripts/make-env.mjs  → public/env/studio_small_03_512.hdr
import { FloatType } from "three";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE = "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_03_1k.hdr";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "env", "studio_small_03_512.hdr");
const FACTOR = 2;

const buffer = await (await fetch(SOURCE)).arrayBuffer();
const loader = new HDRLoader();
loader.setDataType(FloatType);
const { width, height, data } = loader.parse(buffer); // RGBA float32

// Réduction par moyenne de blocs FACTOR × FACTOR
const w = width / FACTOR;
const h = height / FACTOR;
const out = new Float32Array(w * h * 3);
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    for (let c = 0; c < 3; c++) {
      let sum = 0;
      for (let dy = 0; dy < FACTOR; dy++) {
        for (let dx = 0; dx < FACTOR; dx++) {
          sum += data[((y * FACTOR + dy) * width + (x * FACTOR + dx)) * 4 + c];
        }
      }
      out[(y * w + x) * 3 + c] = sum / (FACTOR * FACTOR);
    }
  }
}

// Encodage RGBE (exposant partagé), lignes non compressées : lu tel quel par HDRLoader
const header = `#?RADIANCE\n# studio_small_03 (Poly Haven, CC0), ${w}x${h}\nFORMAT=32-bit_rle_rgbe\n\n-Y ${h} +X ${w}\n`;
const pixels = new Uint8Array(w * h * 4);
for (let i = 0; i < w * h; i++) {
  const [r, g, b] = [out[i * 3], out[i * 3 + 1], out[i * 3 + 2]];
  const m = Math.max(r, g, b);
  if (m < 1e-32) continue;
  const e = Math.ceil(Math.log2(m));
  const scale = 256 / 2 ** e;
  pixels[i * 4] = Math.min(255, Math.floor(r * scale));
  pixels[i * 4 + 1] = Math.min(255, Math.floor(g * scale));
  pixels[i * 4 + 2] = Math.min(255, Math.floor(b * scale));
  pixels[i * 4 + 3] = e + 128;
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, Buffer.concat([Buffer.from(header, "ascii"), Buffer.from(pixels)]));
console.log(`${width}x${height} → ${w}x${h} : ${OUT} (${Math.round((header.length + pixels.length) / 1024)} Ko)`);
