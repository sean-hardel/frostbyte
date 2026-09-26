# Rendu du turntable (07) pour chaque saveur de brand/tokens.json → trailer/public/renders/<id>/can_####.png
# Même recoloration que le site (site/src/three/palette.ts) : l'étiquette n'utilise que frost, night
# et ice ; chaque pixel est recoloré par R = P · M_ref⁻¹ (espace linéaire), avec 3 produits scalaires.
# L'alu prend la teinte flavor.alu.
#
# Usage (ne modifie pas le .blend, rien n'est sauvegardé) :
#   blender -b blender/canette.blend -P blender/scripts/08_render_flavors.py
import bpy
import json
from mathutils import Matrix

TOKENS = bpy.path.abspath("//../brand/tokens.json")
OUTPUT = "//../trailer/public/renders/{id}/can_####"


def linear(hex_color):
    rgb = [int(hex_color[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in rgb]


def columns(a, b, c):
    return Matrix(((a[0], b[0], c[0]), (a[1], b[1], c[1]), (a[2], b[2], c[2])))


with open(TOKENS, encoding="utf-8") as f:
    tokens = json.load(f)
ref_inverse = columns(
    linear(tokens["colors"]["frost"]),
    linear(tokens["colors"]["night"]),
    linear(tokens["colors"]["ice"]),
).inverted()

# --- Nœuds de recoloration dans MAT_Label : Image → 3 × dot(ligne_i, couleur) → max(0) → Combine → BSDF ---
label = bpy.data.materials["MAT_Label"]
nt = label.node_tree
for n in [n for n in nt.nodes if n.label.startswith("FB_recolor")]:
    nt.nodes.remove(n)
tex = next(n for n in nt.nodes if n.type == "TEX_IMAGE")
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

alu = next(n for n in bpy.data.materials["MAT_Alu"].node_tree.nodes if n.type == "BSDF_PRINCIPLED")

# --- Un rendu animation par saveur ---
scene = bpy.context.scene
for flavor in tokens["flavors"]:
    label_colors = flavor["label"]  # frost → base, night → ink, ice → accent (comme site/src/three/palette.ts)
    target = columns(linear(label_colors["base"]), linear(label_colors["ink"]), linear(label_colors["accent"]))
    recolor = target @ ref_inverse
    for i, dot in enumerate(rows):
        dot.inputs[1].default_value = tuple(recolor[i])
    alu.inputs["Base Color"].default_value = (*linear(flavor["alu"]), 1.0)

    scene.render.filepath = OUTPUT.format(id=flavor["id"])
    print(f"[FB] rendu {flavor['id']} → {scene.render.filepath}")
    bpy.ops.render.render(animation=True)
