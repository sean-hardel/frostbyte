# Crédits audio du trailer

## Musique

| Fichier | Titre | Artiste | Source | Licence |
|---|---|---|---|---|
| `../musique.mp3` | « 60,000 Light Years » (2:55, 120 BPM) | Jim_Combs | [Pixabay](https://pixabay.com/music/upbeat-60000-light-years-140306/) | [Pixabay Content License](https://pixabay.com/service/license-summary/) |

La Pixabay Content License autorise l'usage gratuit, y compris commercial, sans attribution obligatoire ;
le crédit est donné par courtoisie (ici, dans le README et dans le pied de page du site). Elle interdit
notamment de redistribuer le morceau seul, tel quel.
C'est pourquoi le fichier **n'est pas versionné** (`.gitignore`) : le télécharger depuis la page Pixabay
et le placer dans `trailer/public/musique.mp3` avant `npm run studio` ou `npm run render`.
Extrait utilisé : à partir de ~95,5 s (25 s en 16:9, 15 s en 9:16), voir `MUSIC_START_SECONDS` dans `src/brand.ts`.

## Effets sonores

Tous sous licence **CC0 1.0 (domaine public)**, vérifiée sur chaque page Freesound
(`creativecommons.org/publicdomain/zero/1.0/`). Aucune attribution n'est requise ; elle est donnée par courtoisie.
Les `.wav` sont des extraits des aperçus HQ publics de Freesound (découpe seule, fondus appliqués dans Remotion).
Les enregistrements complets ne sont pas conservés : les retélécharger depuis les liens ci-dessous si besoin.

| Fichier | Source | Auteur | Extrait | Utilisation |
|---|---|---|---|---|
| `can-open.wav` | [BeerCanOpening.aif](https://freesound.org/people/gleepglop/sounds/61392/) | gleepglop | intégral (1,1 s) | ouverture (frame 0), logo de l'outro |
| `ice-crack.wav` | [Ice Cracks](https://freesound.org/people/karlis.stigis/sounds/168712/) | karlis.stigis | 40,7 → 42,3 s | volets de glace |
| `ice-crack-2.wav` | [Ice Cracks](https://freesound.org/people/karlis.stigis/sounds/168712/) | karlis.stigis | 16,4 → 17,6 s | « / » de l'intro |
| `impact.wav` | [Dramatic Hit](https://freesound.org/people/qubodup/sounds/222517/) | qubodup | 0 → 4 s | impact du logo (drop) |
| `impact-low.wav` | [Cinematic Low Pitch Impact](https://freesound.org/people/Jofae/sounds/408141/) | Jofae | 0 → 4 s | coupe vers l'outro |
