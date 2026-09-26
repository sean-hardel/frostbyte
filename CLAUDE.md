# FROST/BYTE — canette 3D, landing page, trailer

Marque fictive de boisson énergisante, présentée en trois livrables : un modèle 3D de canette (Blender), une landing page animée au scroll (Three.js) et un trailer vidéo de 25 s (Remotion).

## Marque

- **Nom** : FROST/BYTE. **Slogan** : « Stay sharp. Stay cold. »
- **Palette** : `frost` #EAF6FF (blanc givre), `ice` #00D4FF (cyan glace), `night` #0A2540 (bleu nuit), `alu` #9BA8B8 (gris aluminium)
- **Typographies** : Syne (titres), JetBrains Mono (texte, HUD). Elles sont embarquées en local dans `brand/fonts/`, sans aucun appel à Google Fonts.
- **Univers** : gaming et tech, froid, précis. Brume, fragments de glace, cristaux, HUD.
- **Canette** : 500 ml slim, Ø 66 mm × 168 mm. Corps blanc satiné, motif de cristaux cyan, condensation, couvercle en alu brossé.

**Source de vérité : [brand/tokens.json](brand/tokens.json).** `site/` et `trailer/` importent ce fichier. Aucune couleur, police ou dimension de marque n'est écrite en dur ailleurs.

## Structure

```
brand/tokens.json         tokens de marque partagés
brand/fonts/              polices locales (OFL) : Syne.woff2 + JetBrainsMono.woff2 (variables, latin) et fonts.css
                          pour site/ et trailer/ ; JetBrainsMono.ttf pour le rendu des SVG (resvg ne lit pas le WOFF2)
blender/canette.blend     fichier Blender source
blender/scripts/NN_*.py   scripts rejouables (un par étape MCP)
blender/textures/         logo.svg, label.svg (sources) → logo.png, label.png (générés)
blender/tools/            rasteriseur SVG → PNG (Node + @resvg/resvg-js)
site/public/canette.glb   export web de la canette (généré par 06_export_glb.py)
site/                     landing page — Vite + TS + three + gsap ScrollTrigger + lenis
trailer/                  vidéo — Remotion + @remotion/transitions (rendus Blender en séquences PNG)
```

### Flux d'assets

1. Le logo (`logo.svg`) et l'étiquette dépliée (`label.svg`, qui inclut le logo) sont des SVG écrits à la main. On les rend en PNG avec `npm run textures` depuis `blender/tools/` (première fois : `npm install`).
   - Le wordmark est fait de tracés, sans police. Les petits textes de l'étiquette utilisent JetBrains Mono via `brand/fonts/`.
   - `label.svg` fait 3072 × 1926 px, soit le ratio exact de la zone d'étiquette (circonférence 207,3 mm × hauteur 130 mm). Ne pas changer ce ratio.
   - x = 1536 correspond à la face avant (-Y dans Blender). x = 0 ≡ 3072 correspond à la couture, à l'arrière. Tout ce qui touche un bord doit être périodique sur 3072 px.
2. Après un nouveau rendu, relancer `03_materials.py`, qui recharge `//textures/label.png` (chemin relatif, image non packée).
3. `06_export_glb.py` exporte la canette seule (`Can_Body` + enfants) vers `site/public/canette.glb`, qui pèse environ 144 Ko pour environ 22k triangles. Il faut le relancer après chaque modification du modèle ou des matériaux. Le trailer n'utilise pas le GLB, mais les séquences PNG rendues par Blender (voir `08_render_flavors`).
   - **Compression Draco** : côté three.js, `GLTFLoader` + `DRACOLoader.setDecoderPath(DRACO_GLTF_CONFIG)` (décodeur fourni par three, empaqueté par Vite, rien à copier).
   - **Textures WebP** (`EXT_texture_webp`) : l'étiquette est réduite à 2048 px à l'export, le `.blend` garde la version 3072 px.
   - **Rugosité de l'alu** : glTF n'exporte pas de procédural, donc elle est exportée en valeur fixe (0,27). Le script remet le shader d'origine après l'export.
   - **Repère** : unités en mètres, Y en haut, origine au centre du fond. Il faut recentrer (y ≈ 0.084) dans three.js pour faire tourner la canette sur elle-même.

## Stack

- **Blender** 5.2.1 LTS, piloté via le MCP `mcp-for-blender` (config dans [.mcp.json](.mcp.json))
- **Site** : Vite, TypeScript, `three`, `gsap` + `ScrollTrigger`, `lenis`
- **Trailer** : Remotion 4 + `@remotion/transitions` + `@remotion/fonts`, 1920×1080, 30 fps, 750 frames (25 s)
- **Polices** : fichiers locaux dans `brand/fonts/`. Le site importe `fonts.css` dans `main.ts` (Vite hashe les WOFF2). Le trailer importe les WOFF2 dans `src/brand.ts` et les charge avec `loadFont` de `@remotion/fonts`, qui bloque le rendu jusqu'au chargement. Les noms de famille doivent rester identiques à `tokens.json → fonts`. Le sous-ensemble latin suffit pour le français ; pour une autre langue, ajouter le sous-ensemble correspondant (Fontsource `@fontsource-variable/*`).
- **Package manager** : npm

## Commandes

| Dossier | Commande | Rôle |
|---|---|---|
| `site/` | `npm run dev` | serveur de dev |
| `site/` | `npm run build` | typecheck (`tsc --noEmit`) + build de prod |
| `site/` | `npm run preview` | sert `dist/` (test de la version de prod) |
| `trailer/` | `npm run studio` | prévisualisation (vérifie d'abord les rendus Blender) |
| `trailer/` | `npm run render` | rendu vidéo → `out/trailer.mp4` (h264, crf 18) |
| `trailer/` | `npm run typecheck` | `tsc --noEmit` |

## Conventions Blender (MCP)

- Avant d'écrire du code, appeler `get_addon_status` puis `get_scene_info`.
- Unités en mètres, échelle réelle : la canette mesure 0.066 × 0.168 m.
- Noms d'objets en anglais, préfixés : `Can_Body` (coque complète : fond bombé, corps, sertissage, couvercle), `Can_Tab` et `Can_Rivet` (enfants de `Can_Body`), `Can_CamTarget`. Matériaux : `MAT_Alu` (slot 0), `MAT_Label` (slot 1, zone d'étiquette z = 16 → 146 mm). UV cylindriques calculés dans `01` : u = 0,5 face avant (-Y), u croissant vers +X, couture à +Y, v = 0 → 1 sur la hauteur de l'étiquette.
- Éclairage : HDRI Poly Haven `studio_small_03` (packé dans le `.blend`) + fill uniforme faible (débouche les reflets noirs sur l'alu). La caméra voit un fond uni `night` via Light Path > Is Camera Ray. Exposition AgX à +0,8 pour que l'étiquette sorte blanche ; l'intensité du fond est compensée (2^-exposition) pour garder la couleur `night` exacte. Réglages en tête de `05_world.py`.
- Ordre des scripts : `00_scene_setup` → `01_can_body` → `02_can_tab` → `03_materials` → `04_camera` → `05_world` (après import de l'HDRI) → `06_export_glb` → `07_turntable` → `08_render_flavors` (CLI). Relancer `02` après `01`, car `01` recrée le parent.
- **Animation (turntable)** : `07_turntable.py` anime `Can_Body` (0 → 450°) et orbite la caméra de 90° via l'empty `Cam_Orbit`. Timing : 150 images à 30 fps. Comme la rotation relative canette/caméra fait 360°, le logo est face caméra à la première et à la dernière image.
  - **Export GLB** : il faut le faire à la frame 1 (pose de repos), sinon la rotation animée est figée dans le GLB.
  - **Rendu des 3 saveurs** : `08_render_flavors.py` applique la recoloration du site dans `MAT_Label` (même matrice, 3 produits scalaires) et la teinte `flavor.alu`, puis rend le turntable de chaque saveur. Sortie : PNG RGBA à fond transparent, dans `trailer/public/renders/<id>/can_0001.png` → `0150` (gitignoré, ~2 min au total). Le `.blend` n'est pas modifié. On le lance en ligne de commande, pour ne pas bloquer Blender ni le MCP :
    `"C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b blender/canette.blend -P blender/scripts/08_render_flavors.py`
- Chercher les nœuds de shader par `type` (ex. `n.type == "BSDF_PRINCIPLED"`), jamais par nom, car les noms sont localisés.
- Ne pas écrire d'identifiants d'enum en dur : lire les valeurs valides via `bl_rna` (exception : `scene.render.engine`, à changer dans un `try/except TypeError`).
- Régler les couleurs sur les entrées des nœuds, pas sur `material.diffuse_color`, qui ne sert qu'au viewport.
- Tout code passé à `execute_blender_code` qui modifie la scène est aussi sauvegardé dans `blender/scripts/NN_nom.py`. Les scripts sont idempotents : ils suppriment et recréent leurs objets.
- Après chaque modification : `get_viewport_screenshot` pour contrôler le rendu, puis sauvegarder le `.blend`.
- Budget : moins de 30k triangles pour la canette complète. Export glTF en +Y up, textures embarquées, compression Draco.

## Conventions code

- TypeScript `strict` dans `site/` et `trailer/`.
- Couleurs et polices lues depuis `brand/tokens.json` (en CSS custom properties côté site).
- **Site** : un canvas three.js fixe (transparent, `pointer-events: none`, au-dessus du contenu) et des sections HTML qui défilent. On respecte `prefers-reduced-motion`, le DPR est plafonné (1,5 sur mobile, 2 ailleurs) et le rendu doit être correct en largeur mobile.
  - **Tokens** : injectés en CSS custom properties dans le `<head>` par un plugin de `vite.config.ts`. `styles.css` n'utilise que des `var(--…)`.
  - **Animation** : un seul objet `SceneState` (`src/scroll/state.ts`), appliqué à la scène juste avant chaque rendu. Le rendu se fait à la demande (`stage.invalidate()`), jamais en boucle continue.
  - **Découpage du scroll** : chaque section de `src/sections/` pilote la canette sur son propre intervalle (`segment()`, de « top bottom » à « bottom bottom », sans chevauchement). Elle le fait avec des `fromTo` entre des poses de `createPoses()`, évaluées au refresh, donc responsives. Pour ajouter une étape : nouvelle section + nouvelle pose, en partant de la pose de fin de la section précédente.
  - **Saveurs** (`brand/tokens.json` → `flavors`) : `night` et `accent` sont les couleurs de la page, en variables CSS. `label` (`base`, `ink`, `accent`) donne les couleurs de l'étiquette de la canette. L'étiquette est recolorée dans le shader par une mat3 (`src/three/palette.ts`, et la même dans `08_render_flavors.py`) : frost → `base`, night → `ink`, ice → `accent`. `label.png` doit rester en 3 couleurs (frost, night, ice) ; ajouter une couleur à l'étiquette casserait la recoloration. Pour les rendus du trailer, relancer `08` après chaque changement de `label`.
  - **Métal** : tone mapping Neutral (pas AgX, qui délave). Le premier rendu utilise `RoomEnvironment`, puis `public/env/studio_small_03_512.hdr` le remplace en différé : c'est le même HDRI que dans Blender, réduit à 512 Ko par `scripts/make-env.mjs`. Les stries de l'alu viennent d'une texture de bruit générée dans `can.ts` (rugosité et relief, variation le long de u). La languette et le rivet, sans UV, utilisent une variante lisse.
  - **Chevauchements** : la canette ne doit jamais recouvrir un titre. Chaque pose laisse une colonne libre au texte (droite/gauche en paysage, haut/bas en portrait), y compris pour le CTA. Les textes de saveur s'effacent dès que leur section repart. Exception volontaire : sur mobile, `.fact` et `.zoom__copy` sont des encarts opaques posés sur la canette. `?debug` expose `window.__fb.canRect()` (rectangle écran de la canette) pour tester ces chevauchements.
  - **Pas d'`pin`, pas de post-processing** : c'est un choix pour la fluidité sur mobile.
- **Trailer** : les animations dépendent uniquement de `useCurrentFrame()` et `interpolate`/`spring`. Pas de `Math.random()` sans seed (utiliser `random(seed)` de Remotion), pas de `setTimeout` ni de CSS animations. Une séquence par fichier dans `trailer/src/scenes/`.
  - **Grille rythmique** : 120 BPM, soit 1 temps = `BEAT` = 15 frames (`src/brand.ts`). Les impacts et entrées tombent sur des multiples de `BEAT`, et chaque transition dure 1 temps. Les durées des scènes (`DURATION`) sont choisies pour que chaque scène démarre sur un temps : si on en change une, il faut garder `durée − T` multiple de 15 et `TOTAL` = 750. Une musique à 120 BPM se posera directement.
  - **Montage** (`src/Trailer.tsx`, `TransitionSeries`) : Intro → Reveal → 3 × Flavor → Outro. Transitions custom dans `src/transitions/` : `iceWipe` (volet à arête de glace) et `punchZoom` (coupe avec flash).
  - **Logo** : `Wordmark.tsx` et `Crystal.tsx` reprennent les tracés de `blender/textures/logo.svg`. Toute modification du logo doit être reportée dans les deux.
  - **Canette** : `CanSequence` lit `public/renders/<id>/can_NNNN.png`. `npm run studio` et `npm run render` vérifient d'abord leur présence (`scripts/check-renders.mjs`).

## Langue

Échanges et commentaires en français, identifiants de code et noms de fichiers en anglais.
