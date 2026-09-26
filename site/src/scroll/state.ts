import * as THREE from "three";
import { CAN } from "../brand";
import type { Stage } from "../three/stage";
import type { Can } from "../three/can";
import type { PaletteController } from "../three/palette";
import type { Pointer } from "../input/pointer";

/** État unique animé par les ScrollTriggers, appliqué à la scène juste avant chaque rendu. */
export type SceneState = {
  rotY: number;
  tilt: number;
  x: number;
  y: number;
  scale: number;
  camY: number;
  camZ: number;
  /** 0 → 2 : fondu entre les saveurs. */
  flavor: number;
};

export type Ctx = {
  stage: Stage;
  can: Can;
  state: SceneState;
  poses: Poses;
  reduced: boolean;
  /** Valeur de scrub : lissage en secondes, ou true (direct) en reduced-motion. */
  scrub: number | true;
  /** Souris lissée (parallaxe, particules) ; `enabled` = false au tactile et en reduced-motion. */
  pointer: Pointer;
};

export function applyState(s: SceneState, stage: Stage, can: Can, palette: PaletteController) {
  can.pivot.position.set(s.x, s.y, 0);
  can.pivot.rotation.set(0, s.rotY, s.tilt);
  can.pivot.scale.setScalar(s.scale);
  stage.camera.position.set(0, s.camY, s.camZ);
  stage.camera.lookAt(0, s.camY, 0);
  palette.set(s.flavor);
}

const TURN = Math.PI * 2;

/*
  Poses clés. Chaque valeur est recalculée à la demande (aspect courant de la caméra),
  ce qui permet aux tweens (invalidateOnRefresh) de s'adapter au resize et à l'orientation.
*/
export function createPoses(stage: Stage) {
  const tanHalf = () => Math.tan(THREE.MathUtils.degToRad(stage.camera.fov / 2));
  const aspect = () => stage.camera.aspect;
  const portrait = () => aspect() < 1;

  /** Distance caméra qui cadre la canette entière (≈ 62 % de la hauteur). */
  const heroZ = () => {
    const byHeight = CAN.height / 0.62 / (2 * tanHalf());
    const byWidth = (CAN.radius * 2) / (portrait() ? 0.55 : 0.35) / (2 * tanHalf() * aspect());
    return Math.max(byHeight, byWidth);
  };

  /** Distance caméra qui cadre le logo (paysage : 70 % de la hauteur ; portrait : 62 % de la largeur). */
  const zoomZ = () => {
    const byHeight = CAN.logoSize.h / 0.7 / (2 * tanHalf());
    const byWidth = CAN.logoSize.w / (portrait() ? 0.62 : 0.85) / (2 * tanHalf() * aspect());
    return CAN.radius + Math.max(byHeight, byWidth);
  };

  const hero = (): SceneState => ({
    rotY: -0.5, tilt: 0.16, x: 0, y: 0, scale: 1, camY: 0, camZ: heroZ(), flavor: 0,
  });

  const spinEnd = (): SceneState => ({
    rotY: TURN, tilt: 0, x: 0, y: 0, scale: 1, camY: 0, camZ: heroZ(), flavor: 0,
  });

  /** Gros plan logo : canette à droite de l'accroche (paysage) ou logo remonté au-dessus (portrait). */
  const zoom = (): SceneState => {
    const camZ = zoomZ();
    const view = stage.visibleAt(camZ - CAN.radius);
    return portrait()
      ? { rotY: TURN, tilt: 0, x: 0, y: 0, scale: 1, camY: CAN.logoY - view.h * 0.16, camZ, flavor: 0 }
      : { rotY: TURN, tilt: 0, x: view.w * 0.2, y: 0, scale: 1, camY: CAN.logoY, camZ, flavor: 0 };
  };

  /** Canette décalée pour laisser la place au texte : à droite (paysage) ou en haut (portrait). */
  const side = (turns: number, flavor: number): SceneState => {
    const view = stage.visibleAt(heroZ());
    return portrait()
      ? { rotY: turns * TURN, tilt: 0, x: 0, y: view.h * 0.2, scale: 0.6, camY: 0, camZ: heroZ(), flavor }
      : { rotY: turns * TURN - 0.35, tilt: -0.06, x: view.w * 0.22, y: 0, scale: 1, camY: 0, camZ: heroZ(), flavor };
  };

  /**
   * CTA : la canette reste dans sa colonne (droite en paysage, haut en portrait), le titre
   * occupe l'autre ; aucune trajectoire ne croise le texte (vérifié par le test ?debug).
   */
  const cta = (turns: number, flavor: number): SceneState => {
    const view = stage.visibleAt(heroZ());
    return portrait()
      ? { rotY: turns * TURN + 0.25, tilt: 0.08, x: 0, y: view.h * 0.24, scale: 0.5, camY: 0, camZ: heroZ(), flavor }
      : { rotY: turns * TURN + 0.25, tilt: 0.08, x: view.w * 0.22, y: 0, scale: 0.95, camY: 0, camZ: heroZ(), flavor };
  };

  return { hero, spinEnd, zoom, side, cta };
}

export type Poses = ReturnType<typeof createPoses>;
