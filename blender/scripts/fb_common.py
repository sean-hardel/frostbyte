# Fonctions partagées par les scripts de rendu (08, 10, 11) : tokens de marque, recoloration
# des saveurs (identique à site/src/three/palette.ts), configuration EEVEE / Cycles GPU.
# Import depuis un script lancé avec -P :
#   sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import fb_common
import bpy
import json
import os
from mathutils import Matrix

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
GPU_NAME = "RX 7800 XT"  # seul périphérique Cycles autorisé (le GPU intégré et le CPU sont désactivés)


def tokens():
    with open(os.path.join(ROOT, "brand", "tokens.json"), encoding="utf-8") as f:
        return json.load(f)


def flavor(flavor_id):
    return next(f for f in tokens()["flavors"] if f["id"] == flavor_id)


def linear(hex_color):
    rgb = [int(hex_color[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in rgb]


def _columns(a, b, c):
    return Matrix(((a[0], b[0], c[0]), (a[1], b[1], c[1]), (a[2], b[2], c[2])))


# --- Recoloration de l'étiquette : frost → base, night → ink, ice → accent (R = P · M_ref⁻¹, linéaire) ---

def _recolor_rows(label_mat):
    """Crée (une fois) les nœuds Image → 3 × dot(ligne_i, couleur) → max(0) → Combine → Base Color."""
    nt = label_mat.node_tree
    rows = sorted((n for n in nt.nodes if n.label.startswith("FB_recolor_dot_")), key=lambda n: n.label)
    if len(rows) == 3:
        return rows
    for n in [n for n in nt.nodes if n.label.startswith("FB_recolor")]:
        nt.nodes.remove(n)
    tex = next(n for n in nt.nodes if n.type == "TEX_IMAGE" and n.label == "LABEL")
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    combine = nt.nodes.new("ShaderNodeCombineColor")
    combine.label = "FB_recolor_combine"
    rows = []
    for i, channel in enumerate(("Red", "Green", "Blue")):
        dot = nt.nodes.new("ShaderNodeVectorMath")
        dot.operation = "DOT_PRODUCT"
        dot.label = f"FB_recolor_dot_{i}"
        clamp = nt.nodes.new("ShaderNodeMath")
        clamp.operation = "MAXIMUM"
        clamp.label = f"FB_recolor_max_{i}"
        clamp.inputs[1].default_value = 0.0
        nt.links.new(tex.outputs["Color"], dot.inputs[0])
        nt.links.new(dot.outputs["Value"], clamp.inputs[0])
        nt.links.new(clamp.outputs["Value"], combine.inputs[channel])
        rows.append(dot)
    nt.links.new(combine.outputs["Color"], bsdf.inputs["Base Color"])
    return rows


def apply_flavor(flavor_id):
    """Recolore l'étiquette et teinte l'alu pour la saveur donnée."""
    t = tokens()
    f = next(x for x in t["flavors"] if x["id"] == flavor_id)
    ref_inverse = _columns(linear(t["colors"]["frost"]), linear(t["colors"]["night"]), linear(t["colors"]["ice"])).inverted()
    target = _columns(linear(f["label"]["base"]), linear(f["label"]["ink"]), linear(f["label"]["accent"]))
    recolor = target @ ref_inverse
    for i, dot in enumerate(_recolor_rows(bpy.data.materials["MAT_Label"])):
        dot.inputs[1].default_value = tuple(recolor[i])
    alu = next(n for n in bpy.data.materials["MAT_Alu"].node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    alu.inputs["Base Color"].default_value = (*linear(f["alu"]), 1.0)
    return f


# --- Moteurs ---

def _set_engine(scene, *candidates):
    for engine in candidates:
        try:
            scene.render.engine = engine
            return engine
        except TypeError:
            continue
    raise RuntimeError(f"Aucun moteur parmi {candidates}")


def setup_eevee(scene, samples=16):
    _set_engine(scene, "BLENDER_EEVEE_NEXT", "BLENDER_EEVEE")
    scene.eevee.taa_render_samples = samples
    # Réfraction des gouttes et du givre (sans raytracing, EEVEE les rend opaques)
    if hasattr(scene.eevee, "use_raytracing"):
        scene.eevee.use_raytracing = True
    print(f"[FB] moteur : {scene.render.engine} ({samples} échantillons)")


def setup_cycles_gpu(scene, max_samples=256, threshold=0.02):
    """Cycles sur la RX 7800 XT en HIP, explicitement ; échoue au lieu de retomber sur le CPU."""
    _set_engine(scene, "CYCLES")
    prefs = bpy.context.preferences.addons["cycles"].preferences
    prefs.compute_device_type = "HIP"
    prefs.get_devices()
    devices = prefs.get_devices_for_type("HIP")
    chosen = []
    for d in devices:
        d.use = d.type == "HIP" and GPU_NAME in d.name
        if d.use:
            chosen.append(d.name)
    if not chosen:
        raise RuntimeError(f"[FB] GPU HIP « {GPU_NAME} » introuvable : {[(d.name, d.type) for d in devices]}")
    scene.cycles.device = "GPU"

    c = scene.cycles
    c.samples = max_samples
    c.use_adaptive_sampling = True
    c.adaptive_threshold = threshold
    c.use_denoising = True
    try:
        c.denoiser = "OPENIMAGEDENOISE"
    except TypeError:
        pass
    if hasattr(c, "denoising_use_gpu"):
        c.denoising_use_gpu = True
    c.denoising_input_passes = "RGB_ALBEDO_NORMAL"
    c.max_bounces = 10
    c.diffuse_bounces = 3
    c.glossy_bounces = 4
    c.transmission_bounces = 8
    c.transparent_max_bounces = 8
    c.caustics_reflective = False
    c.caustics_refractive = False
    scene.render.use_persistent_data = True
    print(f"[FB] moteur : CYCLES, device={c.device}, compute={prefs.compute_device_type}, GPU={chosen}, "
          f"débruitage={c.denoiser} (GPU={getattr(c, 'denoising_use_gpu', '?')}), max {max_samples} éch., seuil {threshold}")
    return chosen


def setup_output(scene, filepath, width, height, percentage=100):
    r = scene.render
    r.resolution_x, r.resolution_y, r.resolution_percentage = width, height, percentage
    r.film_transparent = True
    r.use_motion_blur = True
    r.motion_blur_shutter = 0.5
    r.image_settings.file_format = "PNG"
    r.image_settings.color_mode = "RGBA"
    r.image_settings.color_depth = "8"
    r.image_settings.compression = 15
    r.filepath = filepath
