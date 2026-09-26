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
| `trailer/` | `npm run render:shots` | rendus Blender Cycles GPU de tous les plans (~1 h) |
| `trailer/` | `npm run render` | vidéos → `out/trailer.mp4` (16:9) et `out/trailer-vertical.mp4` (9:16), h264 crf 18 |
| `trailer/` | `npm run typecheck` | `tsc --noEmit` |

## Conventions Blender (MCP)

- Avant d'écrire du code, appeler `get_addon_status` puis `get_scene_info`.
- Unités en mètres, échelle réelle : la canette mesure 0.066 × 0.168 m.
- Noms d'objets en anglais, préfixés : `Can_Body` (coque complète : fond bombé, corps, sertissage, couvercle), `Can_Tab` et `Can_Rivet` (enfants de `Can_Body`), `Can_CamTarget`. Matériaux : `MAT_Alu` (slot 0), `MAT_Label` (slot 1, zone d'étiquette z = 16 → 146 mm). UV cylindriques calculés dans `01` : u = 0,5 face avant (-Y), u croissant vers +X, couture à +Y, v = 0 → 1 sur la hauteur de l'étiquette.
- Éclairage : HDRI Poly Haven `studio_small_03` (packé dans le `.blend`) + fill uniforme faible (débouche les reflets noirs sur l'alu). La caméra voit un fond uni `night` via Light Path > Is Camera Ray. Vue « Khronos PBR Neutral » (comme le tone mapping du site), repli sur AgX si absente, exposition recalée pour que l'étiquette sorte blanche ; l'intensité du fond est compensée (2^-exposition) pour garder la couleur `night` exacte. Réglages en tête de `05_world.py`.
- Ordre des scripts : `00_scene_setup` → `01_can_body` → `02_can_tab` → `03_materials` → `04_camera` → `05_world` (après import de l'HDRI) → `06_export_glb` → `10_cinematic_setup`. `09_condensation` (CLI, indépendant) génère les textures de gouttes, `11_shots` (CLI) rend les plans du trailer. Relancer `02` après `01`, car `01` recrée le parent, puis `10`.
- **Export GLB** : à faire avec `Can_Body` en pose de repos (rotation 0), sinon une rotation est figée dans le GLB. `06` sélectionne `Can_Body`, `Can_Tab` et `Can_Rivet` par leur nom : les objets `FB_*` (gouttes, givre) ne sont pas exportés, même parentés.
- **Préparation cinéma** (`10_cinematic_setup.py`, sauvegardé dans le `.blend`) : matériaux alignés sur le site, condensation (normal map + masque de `09`, même répétition que le site), gouttes d'eau en relief (`FB_Drops`, calottes réfractantes, dont 3 `FB_Drop_Slide_*`), éclats de givre 3D (`FB_Frost`) pour le bokeh.
  - **Gouttes en Cycles** : l'eau est transparente pour les rayons d'ombre et diffus (Light Path). Sans ça, un matériau réfractant bloque la lumière (caustiques désactivées) et les gouttes sortent noires. Le fond plat des calottes est posé 0,03 mm au-dessus de la surface.
- **Plans du trailer** (`11_shots.py` + `fb_common.py`) : `macro` (gouttes, 3 glissent, mise au point sur la principale, lumière d'accent reliée aux seules gouttes par light linking), `travel` (part du logo et recule en arc), `orbit` (canette 0 → 450° + orbite de 90° : logo de face au début et à la fin). Chacun en 16:9 et 9:16 (cadrages distincts), durées = scènes du trailer. DOF et motion blur partout. Sortie : `trailer/public/renders/<plan>/<saveur>/<format>/####.png` (RGBA, gitignoré). Le `.blend` n'est pas modifié.
  - **Moteurs** : `--engine eevee` pour les aperçus (`--step`, `--scale`), `--engine cycles` pour le final. `fb_common.setup_cycles_gpu()` force HIP sur la « RX 7800 XT » uniquement (GPU intégré et CPU désactivés) et **échoue** au lieu de retomber sur le CPU ; débruitage OpenImageDenoise sur GPU, échantillonnage adaptatif (256 max, seuil 0,02).
  - **Temps mesurés** (RX 7800 XT) : orbite ~2,2 s/image, travelling ~2,6 s, macro ~7,7 s (réfraction). Tout le trailer (10 séquences, ~1 000 images) ≈ 1 h : `node scripts/render-shots.mjs` depuis `trailer/` (journal dans `trailer/out/render-shots.log`).
  - **Recoloration des saveurs** : `fb_common.apply_flavor()` (même matrice que le site). Relancer les rendus après tout changement de `flavors[].label` ou `alu`.
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
    - **Pilote unique** : les timelines de section sont en pause. `driveSegments()` (`src/scroll/segment.ts`) lisse le scroll une seule fois et fait écrire l'état par la seule section active. Ne pas remettre de `scrub` par section : lors d'un scroll rapide traversant plusieurs sections, la pose finale deviendrait fausse.
    - **Complétude des poses** : chaque pose doit définir toutes les propriétés de `SceneState`.
  - **Effets** :
    - **Condensation** : normal map + masque de rugosité générés par `blender/scripts/09_condensation.py` (numpy dans Blender, texture qui se raccorde sans couture, WebP). Ils sont importés depuis `blender/textures/` et appliqués en différé à l'étiquette (`applyCondensation`). La répétition en u doit rester entière pour boucler autour de la canette.
    - **Particules de givre** (`src/three/particles.ts`) : entièrement pilotées par le scroll (parallaxe, vitesse) et la souris. Il n'y a pas d'animation temporelle, donc le rendu reste à la demande.
    - **Parallaxe souris** : dans le hero uniquement, via le groupe `can.tilt` et `src/input/pointer.ts` ; désactivée au tactile et en reduced-motion.
    - **Écran de chargement** : cristal du logo animé en CSS dès le premier paint. `.is-loaded` le termine (branches et pixels), puis `.is-done` le masque. Les tracés sont repris de `logo.svg` : il faut les reporter si le logo change.
  - **Saveurs** (`brand/tokens.json` → `flavors`) : `night` et `accent` sont les couleurs de la page, en variables CSS. `label` (`base`, `ink`, `accent`) donne les couleurs de l'étiquette de la canette. L'étiquette est recolorée dans le shader par une mat3 (`src/three/palette.ts`, et la même dans `blender/scripts/fb_common.py`) : frost → `base`, night → `ink`, ice → `accent`. `label.png` doit rester en 3 couleurs (frost, night, ice) ; ajouter une couleur à l'étiquette casserait la recoloration. Pour le trailer, relancer les rendus Blender après chaque changement de `label`.
  - **Métal** : tone mapping Neutral (pas AgX, qui délave). Le premier rendu utilise `RoomEnvironment`, puis `public/env/studio_small_03_512.hdr` le remplace en différé : c'est le même HDRI que dans Blender, réduit à 512 Ko par `scripts/make-env.mjs`. Les stries de l'alu viennent d'une texture de bruit générée dans `can.ts` (rugosité et relief, variation le long de u). La languette et le rivet, sans UV, utilisent une variante lisse.
  - **Chevauchements** : la canette ne doit jamais recouvrir un titre. Chaque pose laisse une colonne libre au texte (droite/gauche en paysage, haut/bas en portrait), y compris pour le CTA. Les textes de saveur s'effacent dès que leur section repart. Exception volontaire : sur mobile, `.fact` et `.zoom__copy` sont des encarts opaques posés sur la canette. `?debug` expose `window.__fb.canRect()` (rectangle écran de la canette) pour tester ces chevauchements.
  - **Pas d'`pin`, pas de post-processing** : c'est un choix pour la fluidité sur mobile.
  - **Section trailer** (`src/sections/trailer.ts`, avant le CTA) : vidéos dans `site/public/trailer/` (**versionnées**, nécessaires à GitHub Pages). Rien n'est chargé avant que la section approche (IntersectionObserver, `preload="none"`), puis poster + sources du format courant : 9:16 sur mobile en portrait, 16:9 sinon ; WebM VP9/Opus d'abord, MP4 H.264 en repli. Lecture au clic, son coupé par défaut et activable, pause hors écran. La canette 3D sort par le haut (`poses.away`) et revient au CTA en contournant par la droite hors champ (`awayRight`, `ctaOffRight`) : elle ne doit jamais passer devant le lecteur.
    - **Régénérer après un nouveau rendu du trailer** (depuis `trailer/`, ffmpeg de Remotion) :
      `npx remotion ffmpeg -i out/trailer.mp4 -c copy -movflags +faststart ../site/public/trailer/trailer-16x9.mp4` (idem `trailer-vertical.mp4` → `trailer-9x16.mp4`) ;
      `npx remotion ffmpeg -i out/trailer.mp4 -c:v libvpx-vp9 -b:v 0 -crf 36 -row-mt 1 -deadline good -cpu-used 2 -c:a libopus -b:a 128k ../site/public/trailer/trailer-16x9.webm` (idem 9:16) ;
      posters : dernière image de l'outro, `-ss 24.5` (16:9) / `-ss 14.8` (9:16), `-frames:v 1 -q:v 3` → `poster-<format>.jpg`.
- **Trailer** : les animations dépendent uniquement de `useCurrentFrame()` et `interpolate`/`spring`. Pas de `Math.random()` sans seed (utiliser `random(seed)` de Remotion), pas de `setTimeout` ni de CSS animations. Une séquence par fichier dans `trailer/src/scenes/`.
  - **Deux formats, mêmes scènes** : `Trailer` (16:9, 1920×1080, 25 s) et `TrailerVertical` (9:16, 1080×1920, 15 s), déclarés dans `src/Root.tsx`. Les scènes lisent le format via `useFormat()` (`src/format.tsx`) : `fmt.v(paysage, portrait)` pour les valeurs de mise en page, `fmt.duration` pour les durées.
  - **Grille rythmique** : 120 BPM, soit 1 temps = `BEAT` = 15 frames (`src/brand.ts`). Les impacts et entrées tombent sur des multiples de `BEAT`, et chaque transition dure 1 temps. Les durées (`FORMATS` dans `brand.ts`) sont choisies pour que chaque scène démarre sur un temps ; elles doivent rester égales aux durées des plans Blender (`DURATIONS` de `11_shots.py`, `shotFrames` de `CanSequence.tsx`, `FRAMES` de `check-renders.mjs`).
  - **Montage** (`src/Trailer.tsx`, `TransitionSeries`) : Intro → Macro → Travelling → 3 × Flavor → Outro. Transitions custom dans `src/transitions/` : `iceWipe` (volet à arête de glace) et `punchZoom` (coupe avec flash), plus `slide`. Par-dessus : givre (`FrostParticles`, cristaux du site, accent de la saveur à l'écran), étalonnage froid (`ColdGrade`), grain (`Grain`) — `src/components/Atmosphere.tsx`.
  - **Son** (`src/Soundtrack.tsx`) : `public/musique.mp3` (**non versionnée**, à placer à la main ; source et licence à compléter dans `public/sfx/CREDITS.md` ; `check-renders.mjs` signale son absence) démarre à `MUSIC_START_SECONDS` (≈ 95,5 s, compensé de +44 ms pour les délais d'encodeur MP3 → AAC mesurés sur le MP4) pour que le drop (97,016 s) tombe sur l'impact du logo (frame 45) dans les deux formats ; analyse (tempo 120,25 BPM, phase, extraits) par `scripts/analyze-music.mjs`. Après un rendu, `scripts/check-audio.mjs` liste les attaques de la piste ; pour mesurer le calage réel, corréler la piste du MP4 avec la source (méthode décrite dans `brand.ts`). Effets CC0 dans `public/sfx/` (crédits : `public/sfx/CREDITS.md`), placés d'après `sceneStarts()` : ils suivent le montage. Le ffmpeg de Remotion est un build réduit (pas de sortie PCM brute ni de filtre `afade`) : fondus via la prop `volume`.
  - **Logo** : `Wordmark.tsx` et `Crystal.tsx` reprennent les tracés de `blender/textures/logo.svg`. Toute modification du logo doit être reportée dans les deux.
  - **Canette** : `CanSequence` lit `public/renders/<plan>/<saveur>/<format>/NNNN.png`. `npm run studio` et `npm run render` vérifient d'abord les rendus (nombre, taille, alpha) avec `scripts/check-renders.mjs`.

## Langue

Échanges et commentaires en français, identifiants de code et noms de fichiers en anglais.
