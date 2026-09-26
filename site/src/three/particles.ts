import * as THREE from "three";
import type { Stage } from "./stage";

/*
  Particules de givre : petits cristaux à 6 branches, en additif, autour de la canette.
  Aucun mouvement autonome : elles ne bougent qu'avec le scroll (défilement en parallaxe
  selon la profondeur, grossissement avec la vitesse) et la souris (répulsion). Le rendu
  reste donc à la demande : rien ne tourne quand la page est immobile.
*/

const BOX = new THREE.Vector3(0.55, 0.36, 0.3); // demi-dimensions du volume (m), centré sur la canette

const vertexShader = /* glsl */ `
  uniform float uScroll;
  uniform float uVelocity;
  uniform vec3 uMouse;      // xy : souris (NDC), z : présence 0 → 1
  uniform float uAspect;
  uniform float uPixelRatio;
  uniform float uSize;
  uniform vec3 uBox;
  attribute vec4 aSeed;     // x : vitesse, y : taille, z : phase, w : teinte
  varying float vAlpha;
  varying float vTint;
  varying float vRot;

  void main() {
    vec3 p = position;
    float depth = (p.z + uBox.z) / (2.0 * uBox.z);               // 0 = fond, 1 = avant
    float speed = mix(0.35, 1.4, depth) * (0.75 + 0.5 * aSeed.x); // parallaxe
    p.y = mod(p.y + uScroll * speed + uBox.y, 2.0 * uBox.y) - uBox.y;
    p.x += sin(uScroll * 2.5 + aSeed.z * 6.2831) * 0.012;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);

    // Répulsion autour de la souris, mesurée à l'écran
    vec4 clip = projectionMatrix * mv;
    vec2 ndc = clip.xy / clip.w;
    vec2 d = (ndc - uMouse.xy) * vec2(uAspect, 1.0);
    float push = uMouse.z * smoothstep(0.45, 0.0, length(d));
    mv.xy += normalize(d + 1e-5) * push * 0.045 * -mv.z;

    gl_Position = projectionMatrix * mv;
    float size = uSize * mix(0.55, 1.6, aSeed.y) * (1.0 + min(abs(uVelocity), 1.0) * 0.8);
    gl_PointSize = min(size * uPixelRatio / -mv.z, 48.0 * uPixelRatio);

    float twinkle = 0.65 + 0.35 * sin(aSeed.z * 43.0 + uScroll * 9.0);
    vAlpha = mix(0.22, 0.95, depth) * twinkle;
    vTint = aSeed.w;
    vRot = aSeed.z * 6.2831 + uScroll * 1.5;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uAccent;
  varying float vAlpha;
  varying float vTint;
  varying float vRot;

  void main() {
    vec2 uv = gl_PointCoord * 2.0 - 1.0;
    float c = cos(vRot), s = sin(vRot);
    uv = mat2(c, -s, s, c) * uv;
    float r = length(uv);
    float a = atan(uv.y, uv.x);
    float core = smoothstep(0.32, 0.0, r);
    float star = pow(abs(cos(3.0 * a)), 14.0) * smoothstep(1.0, 0.15, r); // 6 branches
    float alpha = (core + star * 0.75) * vAlpha;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(mix(uColor, uAccent, vTint), alpha); // AdditiveBlending multiplie déjà par alpha
    #include <colorspace_fragment>
  }
`;

export type Particles = {
  uniforms: {
    uScroll: { value: number };
    uVelocity: { value: number };
    uMouse: { value: THREE.Vector3 };
    uAspect: { value: number };
    uAccent: { value: THREE.Color };
  };
};

export function createParticles(stage: Stage, color: THREE.Color): Particles {
  const count = stage.isMobile ? 260 : 700;
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count * 4);
  let seed = 11;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < count; i++) {
    positions.set([(rand() * 2 - 1) * BOX.x, (rand() * 2 - 1) * BOX.y, (rand() * 2 - 1) * BOX.z], i * 3);
    // 25 % des cristaux prennent la couleur d'accent de la saveur
    seeds.set([rand(), rand() ** 2, rand(), rand() < 0.25 ? 1 : 0], i * 4);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 4));

  const uniforms = {
    uScroll: { value: 0 },
    uVelocity: { value: 0 },
    uMouse: { value: new THREE.Vector3(0, 0, 0) },
    uAspect: { value: 1 },
    uPixelRatio: { value: stage.renderer.getPixelRatio() },
    // Taille en px à 1 m de la caméra (la caméra est à 0,4 → 0,9 m) : ~6 → 25 px à l'écran
    uSize: { value: stage.isMobile ? 7 : 10 },
    uBox: { value: BOX },
    uColor: { value: color.clone() },
    uAccent: { value: new THREE.Color() },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false; // les positions sont déplacées dans le shader
  points.renderOrder = 2;
  stage.scene.add(points);

  return { uniforms };
}
