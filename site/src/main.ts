import "lenis/dist/lenis.css";
import "../../brand/fonts/fonts.css"; // polices locales (WOFF2), empaquetées et hashées par Vite
import "./styles.css";
import "./hero-poster.css"; // position de l'image fixe de la canette (générée par scripts/make-hero-poster.mjs)
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { setupLenis } from "./scroll/lenis";
import { buildFlavorSections } from "./sections/flavors";
import { setupText } from "./sections/text";
import { setupPlayer } from "./sections/trailer";

/*
  Chargement en deux phases (performance : pas de three.js ni de WebGL au chargement) :
  1. ici, tout de suite : Lenis, sections générées, animations de texte, lecteur trailer ;
     le hero montre une image fixe de la canette (public/hero-can.webp), placée en CSS ;
  2. three/boot.ts, importé au premier geste (scroll, molette, souris, toucher, clavier), ou tout de
     suite si la page est déjà défilée ou en ?debug : scène 3D, canette, timelines, particules.
*/

gsap.registerPlugin(ScrollTrigger);
// Mobile : la barre d'adresse qui se replie ne doit pas relancer tous les calculs
ScrollTrigger.config({ ignoreMobileResize: true });

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const loader = document.querySelector<HTMLElement>("#loader")!;
const debug = new URLSearchParams(location.search).has("debug");

buildFlavorSections();
setupLenis(reduced);
setupText(reduced);
setupPlayer(document.querySelector<HTMLElement>(".s-trailer")!);
ScrollTrigger.refresh();

// Écran de chargement : fermé dès que l'image de la canette et les polices sont prêtes
const poster = document.querySelector<HTMLImageElement>(".hero-can")!;
Promise.all([document.fonts.ready, poster.decode().catch(() => undefined)]).then(() => {
  loader.classList.add("is-loaded");
  setTimeout(() => loader.classList.add("is-done"), reduced ? 0 : 450);
});

// Phase 2 : la 3D, au premier geste
const TRIGGERS = ["scroll", "wheel", "pointermove", "pointerdown", "touchstart", "keydown"] as const;
let started = false;
function start3d() {
  if (started) return;
  started = true;
  for (const t of TRIGGERS) window.removeEventListener(t, start3d);
  import("./three/boot")
    .then(({ boot }) => boot({ reduced }))
    .catch((err: unknown) => {
      // L'image fixe reste en place : la page reste utilisable sans 3D
      console.error("3D indisponible, image fixe conservée", err);
    });
}
if (debug || window.scrollY > 0) start3d();
else for (const t of TRIGGERS) window.addEventListener(t, start3d, { passive: true, once: true });
