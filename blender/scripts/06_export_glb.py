# Export web de la canette seule (Can_Body + Can_Tab + Can_Rivet) vers site/public/canette.glb.
# - Modificateurs appliqués (subdivision niveau viewport, solidify, bevel)
# - Compression Draco (côté three.js : GLTFLoader + DRACOLoader)
# - Textures en WebP (EXT_texture_webp), étiquette réduite à 2048 px de large
# - Rugosité procédurale de MAT_Alu (bruit) remplacée le temps de l'export par une valeur fixe,
#   car glTF ne sait pas exporter de nœuds procéduraux. Tout est restauré après l'export.
import bpy
import os

OUT = os.path.join(os.path.dirname(bpy.data.filepath), "..", "site", "public", "canette.glb")
OUT = os.path.normpath(OUT)
OBJECTS = ("Can_Body", "Can_Tab", "Can_Rivet")
ALU_ROUGHNESS = 0.27        # moyenne de la plage procédurale 0.20 → 0.34
LABEL_WEB_WIDTH = 2048

os.makedirs(os.path.dirname(OUT), exist_ok=True)

# --- Préparation : MAT_Alu sans procédural ---
alu = bpy.data.materials["MAT_Alu"]
bsdf = next(n for n in alu.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
saved_links = []
for name in ("Roughness", "Normal"):
    for link in list(bsdf.inputs[name].links):
        saved_links.append((link.from_socket, bsdf.inputs[name]))
        alu.node_tree.links.remove(link)
saved_rough = bsdf.inputs["Roughness"].default_value
bsdf.inputs["Roughness"].default_value = ALU_ROUGHNESS

# --- Préparation : étiquette réduite ---
label = bpy.data.materials["MAT_Label"]
tex = next(n for n in label.node_tree.nodes if n.type == "TEX_IMAGE")
full_img = tex.image
web_img = full_img.copy()
web_img.name = "label_web"
w, h = full_img.size
web_img.scale(LABEL_WEB_WIDTH, round(h * LABEL_WEB_WIDTH / w))
tex.image = web_img

# --- Sélection ---
prev_selected = [o for o in bpy.context.selected_objects]
prev_active = bpy.context.view_layer.objects.active
for o in bpy.context.view_layer.objects:
    o.select_set(o.name in OBJECTS)
bpy.context.view_layer.objects.active = bpy.data.objects["Can_Body"]

try:
    bpy.ops.export_scene.gltf(
        filepath=OUT,
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_texcoords=True,
        export_normals=True,
        export_tangents=False,
        export_materials="EXPORT",
        export_image_format="WEBP",
        export_image_quality=85,
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6,
        export_draco_position_quantization=14,
        export_draco_normal_quantization=10,
        export_draco_texcoord_quantization=12,
        export_cameras=False,
        export_lights=False,
        export_animations=False,
        export_extras=False,
    )
finally:
    # --- Restauration ---
    tex.image = full_img
    bpy.data.images.remove(web_img)
    bsdf.inputs["Roughness"].default_value = saved_rough
    for from_socket, to_socket in saved_links:
        alu.node_tree.links.new(from_socket, to_socket)
    for o in bpy.context.view_layer.objects:
        o.select_set(o in prev_selected)
    bpy.context.view_layer.objects.active = prev_active

print("export", OUT, f"{os.path.getsize(OUT) / 1024:.0f} Ko")
