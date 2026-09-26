// Vérifie que les rendus Blender par saveur sont présents (ils sont gitignorés).
// Lancé avant `npm run studio` et `npm run render`.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tokens = JSON.parse(readFileSync(join(root, "..", "brand", "tokens.json"), "utf8"));
const FRAMES = 150;

const missing = tokens.flavors
  .map((f) => {
    const dir = join(root, "public", "renders", f.id);
    const count = existsSync(dir) ? readdirSync(dir).filter((n) => /^can_\d{4}\.png$/.test(n)).length : 0;
    return { id: f.id, count };
  })
  .filter((r) => r.count < FRAMES);

if (missing.length) {
  console.error("Rendus Blender manquants :", missing.map((m) => `${m.id} (${m.count}/${FRAMES})`).join(", "));
  console.error('Depuis la racine du repo :\n  "C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe" -b blender/canette.blend -P blender/scripts/08_render_flavors.py');
  process.exit(1);
}
console.log(`Rendus OK : ${tokens.flavors.map((f) => f.id).join(", ")} (${FRAMES} images chacun)`);
