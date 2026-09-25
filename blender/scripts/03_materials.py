# Matériaux : MAT_Alu (aluminium brossé) et MAT_Label (étiquette imprimée, texture label.png).
# Les nœuds sont cherchés par type, jamais par nom (noms localisés selon la langue de l'UI).
# Idempotent : recrée les deux matériaux et les réassigne.
import bpy


def fresh_material(name):
    old = bpy.data.materials.get(name)
    if old:
        bpy.data.materials.remove(old)
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    return mat


def principled(mat):
    return next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")


def set_input(node, name, value):
    if name in node.inputs:
        node.inputs[name].default_value = value


# --- Aluminium brossé : stries verticales (étirage de la canette) dans la rugosité ---
alu = fresh_material("MAT_Alu")
nt = alu.node_tree
bsdf = principled(alu)
set_input(bsdf, "Base Color", (0.91, 0.92, 0.93, 1.0))
set_input(bsdf, "Metallic", 1.0)
set_input(bsdf, "Anisotropic", 0.4)

coord = nt.nodes.new("ShaderNodeTexCoord")
mapping = nt.nodes.new("ShaderNodeMapping")
mapping.inputs["Scale"].default_value = (900.0, 900.0, 4.0)  # fin en XY, étiré en Z
noise = nt.nodes.new("ShaderNodeTexNoise")
noise.inputs["Scale"].default_value = 1.0
noise.inputs["Detail"].default_value = 4.0
ramp = nt.nodes.new("ShaderNodeMapRange")
ramp.inputs["To Min"].default_value = 0.22
ramp.inputs["To Max"].default_value = 0.42
nt.links.new(coord.outputs["Object"], mapping.inputs["Vector"])
nt.links.new(mapping.outputs["Vector"], noise.inputs["Vector"])
nt.links.new(noise.outputs["Fac"], ramp.inputs["Value"])
nt.links.new(ramp.outputs["Result"], bsdf.inputs["Roughness"])

bump = nt.nodes.new("ShaderNodeBump")
bump.inputs["Strength"].default_value = 0.05
nt.links.new(noise.outputs["Fac"], bump.inputs["Height"])
nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])

# --- Étiquette : encre imprimée sur alu, sous vernis ---
label = fresh_material("MAT_Label")
nt = label.node_tree
bsdf = principled(label)
set_input(bsdf, "Metallic", 0.1)
set_input(bsdf, "Roughness", 0.3)
set_input(bsdf, "Coat Weight", 0.4)  # vernis d'impression

# Texture d'étiquette : textures/label.png (rendue depuis label.svg par blender/tools)
# Chemin relatif au .blend, non packé : relancer ce script après un nouveau rendu du PNG.
LABEL_PATH = "//textures/label.png"
img = next((i for i in bpy.data.images if i.filepath == LABEL_PATH), None)
if img is None:
    img = bpy.data.images.load(LABEL_PATH)
else:
    img.reload()
img.name = "label.png"

uvmap = nt.nodes.new("ShaderNodeUVMap")
uvmap.uv_map = "UVMap"
tex = nt.nodes.new("ShaderNodeTexImage")
tex.label = "LABEL"
tex.image = img
tex.interpolation = "Cubic"
nt.links.new(uvmap.outputs["UV"], tex.inputs["Vector"])
nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])

# --- Assignation ---
# Can_Body : on remplit les slots existants (créés par 01) pour garder les material_index
body = bpy.data.objects["Can_Body"]
slots = body.data.materials
while len(slots) < 2:
    slots.append(None)
slots[0] = alu    # index 0
slots[1] = label  # index 1
for name in ("Can_Tab", "Can_Rivet"):
    obj = bpy.data.objects[name]
    obj.data.materials.clear()
    obj.data.materials.append(alu)
