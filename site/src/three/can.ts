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
  /** Alu du corps (stries) + variante lisse pour languette et rivet ; teintés ensemble par la palette. */
  alu: THREE.MeshPhysicalMaterial[];
  label: THREE.MeshPhysicalMaterial;
};

/*
  Alu brossé : glTF n'exporte pas les stries procédurales de Blender (rugosité fixe).
  On les recrée ici avec une texture de bruit 1D générée (aucun fichier) : elle varie
  le long de u (tour de la canette) et reste constante en v → stries verticales.
  Elle module la rugosité (canal G) et un léger relief (bumpMap).
*/
function brushedTexture(): THREE.DataTexture {
  const width = 2048;
  const data = new Uint8Array(width * 4);
  // Bruit déterministe : somme de fréquences + grain fin (générateur LCG seedé)
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const grain = Array.from({ length: width }, rand);
  for (let x = 0; x < width; x++) {
    const t = x / width;
    const low = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 37 + Math.sin(t * Math.PI * 2 * 5) * 3);
    const v = 0.55 * grain[x] + 0.25 * grain[(x + 1) % width] + 0.2 * low;
    const byte = Math.round(115 + v * 140); // 0.45 → 1.0 : multiplicateur de rugosité
    data.set([byte, byte, byte, 255], x * 4);
  }
  const tex = new THREE.DataTexture(data, width, 1);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.repeat.set(3, 1);
  tex.needsUpdate = true;
  return tex;
}

export async function loadCan(stage: Stage): Promise<Can> {
  // Décodeur Draco glTF fourni par three (URLs import.meta.url, empaquetées et hashées par Vite)
  const draco = new DRACOLoader().setDecoderPath(DRACO_GLTF_CONFIG);
  const loader = new GLTFLoader().setDRACOLoader(draco);
  const gltf = await loader.loadAsync(`${import.meta.env.BASE_URL}canette.glb`);
  draco.dispose();

  const model = gltf.scene;
  // Origine du GLB au centre du fond : on recentre pour tourner autour du milieu
  model.position.y = -CAN.height / 2;

  const meshes: THREE.Mesh[] = [];
  model.traverse((obj) => {
    if (obj instanceof THREE.Mesh) meshes.push(obj);
  });
  const find = (name: string) =>
    meshes.map((m) => m.material as THREE.MeshPhysicalMaterial).find((m) => m.name === name);
  const alu = find("MAT_Alu");
  const label = find("MAT_Label");
  if (!alu || !label) throw new Error("canette.glb : MAT_Alu ou MAT_Label introuvable");

  // Métal : plus lisse et plus réfléchissant, stries simulées
  const brushed = brushedTexture();
  brushed.anisotropy = Math.min(8, stage.renderer.capabilities.getMaxAnisotropy());
  alu.metalness = 1;
  alu.roughness = 0.32; // × texture 0.45 → 1.0 : rugosité effective 0.14 → 0.32
  alu.roughnessMap = brushed;
  alu.bumpMap = brushed;
  alu.bumpScale = 0.35;
  alu.anisotropy = 0.35; // reflets étirés le long des stries

  // Languette et rivet n'ont pas d'UV : variante lisse sans texture ni anisotropie
  const aluSmooth = alu.clone();
  aluSmooth.name = "MAT_Alu_smooth";
  aluSmooth.roughnessMap = null;
  aluSmooth.bumpMap = null;
  aluSmooth.anisotropy = 0;
  aluSmooth.roughness = 0.22;
  for (const mesh of meshes) {
    if (mesh.material === alu && !mesh.geometry.getAttribute("uv")) mesh.material = aluSmooth;
  }

  // Vernis d'étiquette discret : avec l'HDRI, un vernis fort renvoie une bande de reflet qui mange le texte
  label.clearcoat = 0.12;
  label.clearcoatRoughness = 0.4;
  label.roughness = 0.45;

  // Texte net sous incidence rasante (côtés de la canette)
  if (label.map) {
    label.map.anisotropy = Math.min(8, stage.renderer.capabilities.getMaxAnisotropy());
  }

  const idle = new THREE.Group();
  idle.add(model);
  const pivot = new THREE.Group();
  pivot.add(idle);
  stage.scene.add(pivot);

  return { pivot, idle, alu: [alu, aluSmooth], label };
}
