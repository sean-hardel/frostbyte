import { flavors } from "../brand";
import type { Ctx } from "../scroll/state";
import { move, segment } from "../scroll/segment";

/*
  Trailer : la canette 3D sort par le haut pendant que la section arrive, puis la vidéo (Remotion)
  prend le relais. Chargement différé : rien n'est téléchargé (ni poster ni vidéo) avant que la
  section approche de l'écran. Format choisi au chargement : 9:16 sur mobile en portrait, 16:9 sinon.
  WebM (VP9, plus léger) en premier, MP4 (H.264) en repli. Lecture au clic, son coupé par défaut
  et activable ; pause quand la section quitte l'écran.
*/

const BASE = `${import.meta.env.BASE_URL}trailer/`;
const portraitQuery = matchMedia("(max-width: 767px) and (orientation: portrait)");

export function trailer(ctx: Ctx) {
  const section = document.querySelector<HTMLElement>(".s-trailer")!;
  const last = flavors.length - 1;
  const tl = segment(ctx, section);
  // Sortie rapide (25 % de l'intervalle) : la canette a quitté l'écran avant que le lecteur n'y entre
  move(tl, ctx, () => ctx.poses.side(flavors.length, last), () => ctx.poses.away(flavors.length, last), 0.25, "power1.in");
  tl.to({}, { duration: 0.75 }); // la canette reste hors champ pendant la vidéo
}

/** Lecteur vidéo (sans three.js : phase 1, voir main.ts). */
export function setupPlayer(section: HTMLElement) {
  const player = section.querySelector<HTMLElement>(".trailer__player")!;
  const video = player.querySelector<HTMLVideoElement>("video")!;
  const play = player.querySelector<HTMLButtonElement>(".trailer__play")!;
  const sound = player.querySelector<HTMLButtonElement>(".trailer__sound")!;
  let loadedFormat: string | null = null;

  /** Pose poster et sources du format courant (au plus tôt quand la section approche). */
  const load = () => {
    const format = portraitQuery.matches ? "9x16" : "16x9";
    if (format === loadedFormat) return;
    loadedFormat = format;
    player.dataset.format = format;
    video.poster = `${BASE}poster-${format}.jpg`;
    video.replaceChildren(
      Object.assign(document.createElement("source"), { src: `${BASE}trailer-${format}.webm`, type: 'video/webm; codecs="vp9,opus"' }),
      Object.assign(document.createElement("source"), { src: `${BASE}trailer-${format}.mp4`, type: "video/mp4" }),
    );
    video.load(); // preload="none" : seul le poster est téléchargé tant qu'on ne lance pas la lecture
  };

  // Chargement différé : une fois la section à moins d'un écran
  const near = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        load();
        near.disconnect();
      }
    },
    { rootMargin: "100% 0px" },
  );
  near.observe(section);

  // Rotation de l'écran avant la lecture : on bascule de format
  portraitQuery.addEventListener("change", () => {
    if (loadedFormat && video.paused && video.currentTime === 0) load();
  });

  const setPlaying = (playing: boolean) => player.classList.toggle("is-playing", playing);
  const setMuted = (muted: boolean) => {
    video.muted = muted;
    sound.setAttribute("aria-pressed", String(!muted));
    sound.querySelector(".trailer__sound-label")!.textContent = muted ? "Activer le son" : "Couper le son";
  };
  setMuted(true);

  play.addEventListener("click", () => {
    load();
    video.play().catch(() => setPlaying(false));
  });
  video.addEventListener("click", () => (video.paused ? video.play() : video.pause()));
  video.addEventListener("play", () => setPlaying(true));
  video.addEventListener("pause", () => setPlaying(false));
  video.addEventListener("ended", () => {
    setPlaying(false);
    video.currentTime = 0;
  });
  sound.addEventListener("click", () => setMuted(!video.muted));

  // Pause automatique quand la vidéo sort de l'écran
  new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting && !video.paused) video.pause();
  }, { threshold: 0.25 }).observe(video);
}
