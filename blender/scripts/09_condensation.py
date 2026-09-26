# Texture de condensation (gouttes d'eau) pour l'étiquette : normal map + masque « mouillé ».
# Générée avec le Python de Blender (numpy) : champ de hauteur de gouttes en calottes sphériques,
# placées avec repliement torique → la texture se raccorde sans couture dans les deux directions
# (indispensable autour de la canette). Les normales sont dérivées du champ de hauteur.
#
# Sorties (1024 × 1024) :
#   blender/textures/condensation_normal.webp  normal map tangent-space, convention OpenGL (+Y en haut), comme three.js
#   blender/textures/condensation_mask.webp    gris : 255 = étiquette sèche, sombre = goutte (multiplicateur de rugosité)
# Le site les importe directement depuis ce dossier (Vite les empaquette).
#
# Usage : blender -b -P blender/scripts/09_condensation.py   (ne touche pas au .blend)
import bpy
import numpy as np
import os

SIZE = 1024
SEED = 42
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "textures")

# (nombre, rayon min px, rayon max px) — beaucoup de fines gouttes, quelques grosses
POPULATIONS = [(1600, 2.0, 5.0), (320, 6.0, 12.0), (70, 13.0, 22.0), (14, 24.0, 34.0)]
ELONGATION = 1.18   # gouttes légèrement étirées vers le bas (gravité)
BUMP = 2.2          # intensité des normales
WET = 0.28          # rugosité relative d'une goutte (× rugosité de l'étiquette)

rng = np.random.default_rng(SEED)
height = np.zeros((SIZE, SIZE), dtype=np.float32)
wet = np.zeros((SIZE, SIZE), dtype=np.float32)

for count, rmin, rmax in POPULATIONS:
    for _ in range(count):
        r = rng.uniform(rmin, rmax)
        cx, cy = rng.uniform(0, SIZE, 2)
        ry = r * ELONGATION
        x0, x1 = int(np.floor(cx - r)) - 1, int(np.ceil(cx + r)) + 2
        y0, y1 = int(np.floor(cy - ry)) - 1, int(np.ceil(cy + ry)) + 2
        xs = np.arange(x0, x1)
        ys = np.arange(y0, y1)
        dx = (xs[None, :] + 0.5 - cx) / r
        # Bas de la goutte (y petit = bas de l'image dans Blender) plus plein : décalage du centre de masse
        dy = (ys[:, None] + 0.5 - cy) / ry
        d2 = dx * dx + dy * dy
        inside = d2 < 1.0
        cap = np.where(inside, np.sqrt(np.clip(1.0 - d2, 0.0, 1.0)) * r * (1.0 - 0.15 * dy), 0.0)
        ix = np.mod(xs, SIZE)
        iy = np.mod(ys, SIZE)
        block = np.ix_(iy, ix)
        height[block] = np.maximum(height[block], cap)
        edge = np.clip((1.0 - d2) * 4.0, 0.0, 1.0)  # bord adouci du masque
        wet[block] = np.maximum(wet[block], np.where(inside, edge, 0.0))

# Normales par différences centrées avec repliement (np.roll) ; axe y = lignes (bas → haut dans Blender)
dhdx = (np.roll(height, -1, axis=1) - np.roll(height, 1, axis=1)) * 0.5
dhdy = (np.roll(height, -1, axis=0) - np.roll(height, 1, axis=0)) * 0.5
nx, ny, nz = -dhdx * BUMP / 8.0, -dhdy * BUMP / 8.0, np.ones_like(height)
norm = np.sqrt(nx * nx + ny * ny + nz * nz)
normal_rgb = np.stack([nx / norm, ny / norm, nz / norm], axis=-1) * 0.5 + 0.5

mask = 1.0 - wet * (1.0 - WET)


def save(name, rgb, quality):
    """WebP (le PNG pèse ~4× plus : trop lourd pour le mobile)."""
    img = bpy.data.images.new(name, SIZE, SIZE, alpha=False, float_buffer=False)
    img.colorspace_settings.is_data = True  # données, pas une couleur : aucune conversion sRGB
    rgba = np.concatenate([rgb, np.ones((SIZE, SIZE, 1), dtype=np.float32)], axis=-1)
    img.pixels.foreach_set(rgba.astype(np.float32).ravel())
    path = os.path.normpath(os.path.join(OUT_DIR, f"{name}.webp"))
    img.filepath_raw = path
    img.file_format = "WEBP"
    img.save(quality=quality)
    print(f"[FB] {path} ({os.path.getsize(path) // 1024} Ko)")


save("condensation_normal", normal_rgb.astype(np.float32), 92)
save("condensation_mask", np.repeat(mask[..., None], 3, axis=-1).astype(np.float32), 85)
print(f"[FB] gouttes : {sum(c for c, _, _ in POPULATIONS)}, couverture : {100 * (wet > 0.01).mean():.1f} %")
