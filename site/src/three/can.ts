import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader, DRACO_GLTF_CONFIG } from "three/examples/jsm/loaders/DRACOLoader.js";
import { CAN } from "../brand";
import type { Stage } from "./stage";

export type Can = {
  /** Groupe piloté par le scroll (position, rotation, échelle). */
  pivot: THREE.Group;
  /** Groupe enfant pour le flottement idle, indépendant du scroll. */
  idle: THREE.Group;
  alu: THREE.MeshPhysicalMaterial;
  label: THREE.MeshPhysicalMaterial;
};

export async function loadCan(stage: Stage): Promise<Can> {
  // Décodeur Draco glTF fourni par three (URLs import.meta.url, empaquetées et hashées par Vite)
  const draco = new DRACOLoader().setDecoderPath(DRACO_GLTF_CONFIG);
  const loader = new GLTFLoader().setDRACOLoader(draco);
  const gltf = await loader.loadAsync(`${import.meta.env.BASE_URL}canette.glb`);
  draco.dispose();

  const model = gltf.scene;
  // Origine du GLB au centre du fond : on recentre pour tourner autour du milieu
  model.position.y = -CAN.height / 2;

  const materials = new Map<string, THREE.MeshPhysicalMaterial>();
  model.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      const mat = obj.material as THREE.MeshPhysicalMaterial;
      materials.set(mat.name, mat);
    }
  });
  const alu = materials.get("MAT_Alu");
  const label = materials.get("MAT_Label");
  if (!alu || !label) throw new Error("canette.glb : MAT_Alu ou MAT_Label introuvable");

  // Texte net sous incidence rasante (côtés de la canette)
  if (label.map) {
    label.map.anisotropy = Math.min(8, stage.renderer.capabilities.getMaxAnisotropy());
  }

  const idle = new THREE.Group();
  idle.add(model);
  const pivot = new THREE.Group();
  pivot.add(idle);
  stage.scene.add(pivot);

  return { pivot, idle, alu, label };
}
