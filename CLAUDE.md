# FROST/BYTE — canette 3D, landing page, trailer

Marque fictive de boisson énergisante, présentée en trois livrables : un modèle 3D de canette (Blender), une landing page animée au scroll (Three.js) et un trailer vidéo de 25 s (Remotion).

## Marque

- **Nom** : FROST/BYTE. **Slogan** : « Stay sharp. Stay cold. »
- **Palette** : `frost` #EAF6FF (blanc givre), `ice` #00D4FF (cyan glace), `night` #0A2540 (bleu nuit), `alu` #9BA8B8 (gris aluminium)
- **Typographies** : Syne (titres), JetBrains Mono (texte, HUD), via Google Fonts
- **Univers** : gaming et tech, froid, précis. Brume, fragments de glace, cristaux, HUD.
- **Canette** : 500 ml slim, Ø 66 mm × 168 mm. Corps blanc satiné, motif de cristaux cyan, condensation, couvercle en alu brossé.

**Source de vérité : [brand/tokens.json](brand/tokens.json).** `site/` et `trailer/` importent ce fichier. Aucune couleur, police ou dimension de marque n'est écrite en dur ailleurs.

## Structure

```
brand/tokens.json         tokens de marque partagés
brand/fonts/              JetBrains Mono (TTF, OFL), utilisée pour rendre les SVG
blender/canette.blend     fichier Blender source
blender/scripts/NN_*.py   scripts rejouables (un par étape MCP)
blender/textures/         logo.svg, label.svg (sources) → logo.png, label.png (générés)
blender/tools/            rasteriseur SVG → PNG (Node + @resvg/resvg-js)
site/public/canette.glb   export web de la canette (généré par 06_export_glb.py)
site/                     landing page — Vite + TS + three + gsap ScrollTrigger + lenis
trailer/                  vidéo — Remotion + @remotion/three
```

### Flux d'assets

1. Le logo (`logo.svg`) et l'étiquette dépliée (`label.svg`, qui inclut le logo) sont des SVG écrits à la main. On les rend en PNG avec `npm run textures` depuis `blender/tools/` (première fois : `npm install`).
   - Le wordmark est fait de tracés, sans police. Les petits textes de l'étiquette utilisent JetBrains Mono via `brand/fonts/`.
   - `label.svg` fait 3072 × 1926 px, soit le ratio exact de la zone d'étiquette (circonférence 207,3 mm × hauteur 130 mm). Ne pas changer ce ratio.
   - x = 1536 correspond à la face avant (-Y dans Blender). x = 0 ≡ 3072 correspond à la couture, à l'arrière. Tout ce qui touche un bord doit être périodique sur 3072 px.
2. Après un nouveau rendu, relancer `03_materials.py`, qui recharge `//textures/label.png` (chemin relatif, image non packée).
3. `06_export_glb.py` exporte la canette seule (`Can_Body` + enfants) vers `site/public/canette.glb`, qui pèse environ 144 Ko pour environ 22k triangles. Il faut le relancer après chaque modification du modèle ou des matériaux. Le trailer copiera ce même fichier dans `trailer/public/`.
   - **Compression Draco** : côté three.js, il faut `GLTFLoader` + `DRACOLoader` (decoder dans `three/examples/jsm/libs/draco/`).
   - **Textures WebP** (`EXT_texture_webp`) : l'étiquette est réduite à 2048 px à l'export, le `.blend` garde la version 3072 px.
   - **Rugosité de l'alu** : glTF n'exporte pas de procédural, donc elle est exportée en valeur fixe (0,27). Le script remet le shader d'origine après l'export.
   - **Repère** : unités en mètres, Y en haut, origine au centre du fond. Il faut recentrer (y ≈ 0.084) dans three.js pour faire tourner la canette sur elle-même.

## Stack

- **Blender** 5.2.1 LTS, piloté via le MCP `mcp-for-blender` (config dans [.mcp.json](.mcp.json))
- **Site** : Vite, TypeScript, `three`, `gsap` + `ScrollTrigger`, `lenis`
- **Trailer** : Remotion, `@remotion/three` (React Three Fiber), 1920×1080, 30 fps, 750 frames
- **Package manager** : npm

## Commandes

| Dossier | Commande | Rôle |
|---|---|---|
| `site/` | `npm run dev` | serveur de dev |
| `site/` | `npm run build` | build de prod |
| `trailer/` | `npx remotion studio` | prévisualisation |
| `trailer/` | `npx remotion render Trailer out/trailer.mp4` | rendu vidéo |

## Conventions Blender (MCP)

- Avant d'écrire du code, appeler `get_addon_status` puis `get_scene_info`.
- Unités en mètres, échelle réelle : la canette mesure 0.066 × 0.168 m.
- Noms d'objets en anglais, préfixés : `Can_Body` (coque complète : fond bombé, corps, sertissage, couvercle), `Can_Tab` et `Can_Rivet` (enfants de `Can_Body`), `Can_CamTarget`. Matériaux : `MAT_Alu` (slot 0), `MAT_Label` (slot 1, zone d'étiquette z = 16 → 146 mm). UV cylindriques calculés dans `01` : u = 0,5 face avant (-Y), u croissant vers +X, couture à +Y, v = 0 → 1 sur la hauteur de l'étiquette.
- Éclairage : HDRI Poly Haven `studio_small_03` (packé dans le `.blend`) + fill uniforme faible (débouche les reflets noirs sur l'alu). La caméra voit un fond uni `night` via Light Path > Is Camera Ray. Exposition AgX à +0,8 pour que l'étiquette sorte blanche ; l'intensité du fond est compensée (2^-exposition) pour garder la couleur `night` exacte. Réglages en tête de `05_world.py`.
- Ordre des scripts : `00_scene_setup` → `01_can_body` → `02_can_tab` → `03_materials` → `04_camera` → `05_world` (après import de l'HDRI) → `06_export_glb`. Relancer `02` après `01`, car `01` recrée le parent.
- Chercher les nœuds de shader par `type` (ex. `n.type == "BSDF_PRINCIPLED"`), jamais par nom, car les noms sont localisés.
- Ne pas écrire d'identifiants d'enum en dur : lire les valeurs valides via `bl_rna` (exception : `scene.render.engine`, à changer dans un `try/except TypeError`).
- Régler les couleurs sur les entrées des nœuds, pas sur `material.diffuse_color`, qui ne sert qu'au viewport.
- Tout code passé à `execute_blender_code` qui modifie la scène est aussi sauvegardé dans `blender/scripts/NN_nom.py`. Les scripts sont idempotents : ils suppriment et recréent leurs objets.
- Après chaque modification : `get_viewport_screenshot` pour contrôler le rendu, puis sauvegarder le `.blend`.
- Budget : moins de 30k triangles pour la canette complète. Export glTF en +Y up, textures embarquées, compression Draco.

## Conventions code

- TypeScript `strict` dans `site/` et `trailer/`.
- Couleurs et polices lues depuis `brand/tokens.json` (en CSS custom properties côté site).
- **Site** : un canvas three.js fixe en fond, des sections HTML qui défilent par-dessus. Une timeline ScrollTrigger (`scrub`) pilote la canette. Un module par section dans `site/src/sections/`. On respecte `prefers-reduced-motion`, on plafonne le DPR à 2 et le rendu doit être correct en largeur mobile.
- **Trailer** : les animations dépendent uniquement de `useCurrentFrame()` et `interpolate`/`spring`. Pas de `Math.random()` sans seed (utiliser `random(seed)` de Remotion), pas de `setTimeout` ni de CSS animations. Une séquence par fichier dans `trailer/src/scenes/`.

## Langue

Échanges et commentaires en français, identifiants de code et noms de fichiers en anglais.
