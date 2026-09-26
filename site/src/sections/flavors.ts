import { flavors, type Flavor } from "../brand";
import type { Ctx } from "../scroll/state";
import { move, segment } from "../scroll/segment";

/** Textes propres au site (le reste vient de brand/tokens.json). */
const COPY: Record<string, { desc: string; kcal: number }> = {
  mint: { desc: "L'original. Une attaque mentholée franche, un finish glacé qui remet les idées au clair.", kcal: 11 },
  berry: { desc: "Des baies sombres, une pointe de cassis, et ce froid qui mord juste ce qu'il faut.", kcal: 13 },
  citrus: { desc: "Acide, vif, électrique. Le yuzu tranche, le citron vert réveille.", kcal: 12 },
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

/** Nom en deux tons : un <span> par mot (le 2e passe en frost, voir styles.css). */
function flavorName(name: string) {
  const h2 = el("h2", "flavor__name");
  h2.append(...name.split(" ").map((word) => el("span", undefined, word)));
  return h2;
}

function stat(value: string, label: string) {
  const li = el("li");
  li.append(el("strong", undefined, value), label);
  return li;
}

function flavorSection(f: Flavor, index: number) {
  const copy = COPY[f.id];
  const section = el("section", "section s-flavor");
  section.dataset.flavor = f.id;
  // Accent figé sur la saveur de la section (le --accent global, lui, suit le scroll)
  section.style.setProperty("--accent", f.accent);

  const box = el("div", "flavor__copy reveal");
  const stats = el("ul", "flavor__stats");
  stats.append(stat("0 g", "sucre"), stat("32 mg", "caféine"), stat(String(copy.kcal), "kcal"));
  box.append(
    el("span", "hud", `Saveur ${String(index + 1).padStart(2, "0")} / ${String(flavors.length).padStart(2, "0")}`),
    flavorName(f.name),
    el("p", "flavor__notes", f.notes),
    el("p", "flavor__desc", copy.desc),
    stats,
  );
  section.append(box);
  return section;
}

/** Génère les sections de saveurs (avant la création des ScrollTriggers). */
export function buildFlavorSections() {
  const container = document.querySelector("#saveurs")!;
  container.append(...flavors.map(flavorSection));
}

/**
 * Saveurs : la première section dézoome et décale la canette ; chacune des suivantes
 * fait un tour complet pendant le fondu de palette (étiquette, alu, fond, accent).
 */
export function flavorsScroll(ctx: Ctx) {
  const sections = document.querySelectorAll(".s-flavor");
  sections.forEach((section, i) => {
    const tl = segment(ctx, section);
    const from = i === 0 ? ctx.poses.zoom : () => ctx.poses.side(i, i - 1);
    move(tl, ctx, from, () => ctx.poses.side(i + 1, i), 0.8, "power2.inOut");
    tl.to({}, { duration: 0.2 }); // maintien : la saveur est lisible avant la suivante
  });
}
