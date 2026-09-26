import { gsap } from "gsap";
import { reveal } from "../scroll/segment";

/*
  Animations de texte indépendantes de la 3D (phase 1, chargées tout de suite, sans three.js) :
  fondu du titre du hero au scroll et apparitions des blocs de texte de chaque section.
  Les timelines de la canette sont dans les autres modules de sections/ (phase 2, three/boot.ts).
*/
export function setupText(reduced: boolean) {
  const heroSection = document.querySelector(".s-hero")!;
  gsap.to(".hero__title", {
    yPercent: -30,
    opacity: 0,
    ease: "none",
    scrollTrigger: { trigger: heroSection, start: "top top", end: "bottom top", scrub: reduced ? true : 0.8 },
  });

  document.querySelectorAll(".s-spin .fact").forEach((fact) => reveal(fact));

  const zoom = document.querySelector(".s-zoom")!;
  reveal(zoom.querySelector(".zoom__copy")!, zoom);

  // Visible tant que la section est posée ; s'efface dès qu'elle repart vers le haut,
  // sinon (mobile) le bloc remonterait à travers la canette placée au-dessus
  document.querySelectorAll(".s-flavor").forEach((section) =>
    reveal(section.querySelector(".flavor__copy")!, section, { start: "top 75%", end: "bottom 92%" }),
  );

  const trailer = document.querySelector(".s-trailer")!;
  reveal(trailer.querySelector(".trailer__copy")!, trailer, { start: "top 75%", end: "bottom 25%" });

  reveal(document.querySelector(".cta__copy")!);
}
