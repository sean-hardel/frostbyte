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
blender/canette.blend     fichier Blender source
blender/scripts/NN_*.py   scripts rejouables (un par étape MCP)
blender/textures/         label.png (rendu depuis Remotion), normal maps
blender/export/canette.glb  export glTF (Draco)
site/                     landing page — Vite + TS + three + gsap ScrollTrigger + lenis
trailer/                  vidéo — Remotion + @remotion/three
```

### Flux d'assets

1. L'étiquette est une composition Remotion `Label` (2048×1024). On la rend vers `blender/textures/label.png` :
   `npx remotion still Label ../blender/textures/label.png` (depuis `trailer/`).
2. Blender applique le label, puis exporte `blender/export/canette.glb`.
3. Le GLB est copié dans `site/public/models/canette.glb` et `trailer/public/canette.glb`. Après chaque ré-export, il faut recopier les deux.

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
- Noms d'objets en anglais, préfixés : `Can_Body`, `Can_Lid`, `Can_Tab`, `Can_Bottom`. Matériaux : `MAT_Label`, `MAT_Alu`.
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
