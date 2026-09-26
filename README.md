# FROST/BYTE

Marque fictive de boisson énergisante (projet démo), présentée en trois livrables :

- **Modèle 3D** de la canette, construit dans Blender via le MCP Blender (`blender/`)
- **Landing page** animée au scroll : Vite, Three.js, GSAP ScrollTrigger (`site/`)
- **Trailer** vidéo en 16:9 (25 s) et 9:16 (15 s) : Remotion, plans rendus avec Blender Cycles (`trailer/`)

## Démarrage

```sh
# Site
cd site && npm install && npm run dev

# Trailer (nécessite les rendus Blender et la musique, voir ci-dessous)
cd trailer && npm install
npm run render:shots   # rendus Blender Cycles GPU (~1 h)
npm run render         # out/trailer.mp4 et out/trailer-vertical.mp4
```

La musique du trailer n'est pas versionnée : la télécharger depuis
[Pixabay](https://pixabay.com/music/upbeat-60000-light-years-140306/) et la placer dans `trailer/public/musique.mp3`.

Conventions, pipeline d'assets et détails techniques : [CLAUDE.md](CLAUDE.md).

## Crédits

- **Musique du trailer** : « 60,000 Light Years » par **Jim_Combs**, sur
  [Pixabay](https://pixabay.com/music/upbeat-60000-light-years-140306/), sous
  [Pixabay Content License](https://pixabay.com/service/license-summary/).
- **Effets sonores** : Freesound, CC0 (gleepglop, karlis.stigis, qubodup, Jofae) — détail dans
  [trailer/public/sfx/CREDITS.md](trailer/public/sfx/CREDITS.md).
- **HDRI** : « Studio Small 03 » par Greg Zaal, [Poly Haven](https://polyhaven.com/a/studio_small_03), CC0.
- **Polices** : Syne et JetBrains Mono, SIL Open Font License 1.1 (`brand/fonts/`).
