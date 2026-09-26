# Préparation cinématique (sauvegardée dans le .blend) — à lancer après 03_materials et 05_world.
# 1. Matériaux alignés sur le site : étiquette (rugosité, vernis), alu (stries 0.14 → 0.32, anisotropie)
# 2. Condensation sur MAT_Label : normal map + masque de rugosité de 09 (même répétition que le site)
# 3. Gouttes en relief (FB_Drops) dans la zone du plan macro : calottes d'eau réfractantes, dont
#    3 « glisseuses » (FB_Drop_Slide_*) animées par 11_shots.py
# 4. Givre 3D (FB_Frost) : éclats de glace autour de la canette, pour le bokeh en profondeur de champ
# 5. Retrait de l'ancienne animation turntable (07) : 11_shots.py construit chaque plan
# Idempotent : supprime et recrée ce qu'il crée (nœuds FB_cond_*, collections FB_Drops / FB_Frost).
import bpy
import math
import random
from mathutils import Matrix, Vector

CAN_R = 0.033
LABEL_Z = (0.016, 0.146)
COND_REPEAT = (3.0, 3.0 * 130 / 207)  # identique à site/src/three/can.ts (applyCondensation)


def principled(mat):
    return next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")


def fresh_collection(name):
    old = bpy.data.collections.get(name)
    if old:
        for obj in list(old.objects):
            bpy.data.objects.remove(obj, do_unlink=True)
        bpy.data.collections.remove(old)
    col = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(col)
    return col


def fresh_material(name):
    old = bpy.data.materials.get(name)
    if old:
        bpy.data.materials.remove(old)
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    return mat


def load_image(path):
    img = next((i for i in bpy.data.images if i.filepath == path), None) or bpy.data.images.load(path)
    img.colorspace_settings.is_data = True  # normal map / masque : données
    return img


# --- 1. Matériaux alignés sur le site -------------------------------------------------------------
label = bpy.data.materials["MAT_Label"]
lb = principled(label)
lb.inputs["Roughness"].default_value = 0.45
lb.inputs["Coat Weight"].default_value = 0.12
lb.inputs["Coat Roughness"].default_value = 0.4

alu = bpy.data.materials["MAT_Alu"]
ab = principled(alu)
ab.inputs["Anisotropic"].default_value = 0.35
ramp = next(n for n in alu.node_tree.nodes if n.type == "MAP_RANGE")
ramp.inputs["To Min"].default_value = 0.14
ramp.inputs["To Max"].default_value = 0.32

# --- 2. Condensation (normal map + masque de 09) -------------------------------------------------
nt = label.node_tree
for n in [n for n in nt.nodes if n.label.startswith("FB_cond")]:
    nt.nodes.remove(n)
uv = next(n for n in nt.nodes if n.type == "UVMAP")
mapping = nt.nodes.new("ShaderNodeMapping")
mapping.label = "FB_cond_mapping"
mapping.inputs["Scale"].default_value = (COND_REPEAT[0], COND_REPEAT[1], 1.0)
normal_tex = nt.nodes.new("ShaderNodeTexImage")
normal_tex.label = "FB_cond_normal"
normal_tex.image = load_image("//textures/condensation_normal.webp")
mask_tex = nt.nodes.new("ShaderNodeTexImage")
mask_tex.label = "FB_cond_mask"
mask_tex.image = load_image("//textures/condensation_mask.webp")
normal_map = nt.nodes.new("ShaderNodeNormalMap")
normal_map.label = "FB_cond_normalmap"
rough = nt.nodes.new("ShaderNodeMath")
rough.label = "FB_cond_roughness"
rough.operation = "MULTIPLY"
rough.inputs[1].default_value = 0.45
nt.links.new(uv.outputs["UV"], mapping.inputs["Vector"])
nt.links.new(mapping.outputs["Vector"], normal_tex.inputs["Vector"])
nt.links.new(mapping.outputs["Vector"], mask_tex.inputs["Vector"])
nt.links.new(normal_tex.outputs["Color"], normal_map.inputs["Color"])
nt.links.new(normal_map.outputs["Normal"], lb.inputs["Normal"])
nt.links.new(normal_map.outputs["Normal"], lb.inputs["Coat Normal"])
nt.links.new(mask_tex.outputs["Color"], rough.inputs[0])
nt.links.new(rough.outputs["Value"], lb.inputs["Roughness"])

# --- 3. Gouttes en relief (plan macro) ------------------------------------------------------------
water = fresh_material("MAT_Water")
wb = principled(water)
wb.inputs["Base Color"].default_value = (1, 1, 1, 1)
wb.inputs["Roughness"].default_value = 0.02
wb.inputs["IOR"].default_value = 1.33
wb.inputs["Transmission Weight"].default_value = 1.0
if hasattr(water, "use_raytrace_refraction"):
    water.use_raytrace_refraction = True  # EEVEE (aperçus)
# Cycles : un matériau réfractant bloque les rayons d'ombre (caustiques désactivées) → l'étiquette
# sous la goutte n'est plus éclairée et la goutte paraît noire. On laisse passer ombres et rebonds diffus.
wnt = water.node_tree
out = next(n for n in wnt.nodes if n.type == "OUTPUT_MATERIAL")
light_path = wnt.nodes.new("ShaderNodeLightPath")
see_through = wnt.nodes.new("ShaderNodeMath")
see_through.operation = "MAXIMUM"
transparent = wnt.nodes.new("ShaderNodeBsdfTransparent")
mix = wnt.nodes.new("ShaderNodeMixShader")
wnt.links.new(light_path.outputs["Is Shadow Ray"], see_through.inputs[0])
wnt.links.new(light_path.outputs["Is Diffuse Ray"], see_through.inputs[1])
wnt.links.new(see_through.outputs["Value"], mix.inputs["Fac"])
wnt.links.new(wb.outputs["BSDF"], mix.inputs[1])
wnt.links.new(transparent.outputs["BSDF"], mix.inputs[2])
wnt.links.new(mix.outputs["Shader"], out.inputs["Surface"])

drops = fresh_collection("FB_Drops")
body = bpy.data.objects["Can_Body"]
old_mesh = bpy.data.meshes.get("FB_drop_mesh")
if old_mesh:
    bpy.data.meshes.remove(old_mesh)
bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=1.0)
proto = bpy.context.active_object
drop_mesh = proto.data
drop_mesh.name = "FB_drop_mesh"
bpy.data.objects.remove(proto, do_unlink=True)
# Calotte : on garde l'hémisphère z ≥ 0 et on ferme par un fond plat (posé sur l'étiquette).
# Une sphère entière enfoncée dans la canette réfracte l'intérieur de la coque → gouttes noires.
import bmesh  # noqa: E402
bm = bmesh.new()
bm.from_mesh(drop_mesh)
bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, 0),
                       plane_no=(0, 0, 1), clear_inner=True)
rim = [e for e in bm.edges if e.is_boundary]
bmesh.ops.holes_fill(bm, edges=rim, sides=0)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
bm.to_mesh(drop_mesh)
bm.free()
for poly in drop_mesh.polygons:
    poly.use_smooth = abs(poly.normal.z) < 0.999  # fond plat non lissé
drop_mesh.materials.append(water)


def drop_matrix(theta, z, r, elong=1.15, height=0.5):
    """Calotte posée sur le cylindre : Z local = normale, Y local = verticale (goutte étirée vers le bas)."""
    n = Vector((math.cos(theta), math.sin(theta), 0.0))
    up = Vector((0.0, 0.0, 1.0))
    t = up.cross(n)
    basis = Matrix((t, up, n)).transposed()  # colonnes : X = tangente, Y = haut, Z = normale
    scale = Matrix.Diagonal((r, r * elong, r * height)).to_4x4()
    # Fond légèrement AU-DESSUS de la surface : s'il est sous l'étiquette (la surface subdivisée est un peu
    # en retrait du rayon théorique), les rayons réfractés ressortent dans la coque → gouttes noires.
    pos = n * (CAN_R + 0.00003) + Vector((0.0, 0.0, z))
    return Matrix.Translation(pos) @ basis.to_4x4() @ scale


def add_drop(name, theta, z, r, elong=1.15, height=0.5):
    obj = bpy.data.objects.new(name, drop_mesh)
    drops.objects.link(obj)
    obj.parent = body
    obj.matrix_parent_inverse = Matrix.Identity(4)
    obj.matrix_basis = drop_matrix(theta, z, r, elong, height)
    return obj


rng = random.Random(7)
FRONT = -math.pi / 2  # face avant (-Y)
patch = []
for i in range(110):
    for _ in range(40):  # évite les chevauchements grossiers
        theta = FRONT + rng.uniform(-0.55, 0.55)
        z = rng.uniform(0.03, 0.12)
        r = 0.00025 + 0.0010 * rng.random() ** 2.5
        if all((abs(theta - t) * CAN_R) ** 2 + (z - zz) ** 2 > (r + rr) ** 2 for t, zz, rr in patch):
            patch.append((theta, z, r))
            add_drop(f"FB_Drop_{i:03d}", theta, z, r, elong=rng.uniform(1.0, 1.3), height=rng.uniform(0.6, 0.8))
            break
# Glisseuses : grosses gouttes, position de départ (11_shots.py les anime vers le bas)
for i, (dtheta, z, r) in enumerate([(-0.10, 0.098, 0.0020), (0.06, 0.110, 0.0016), (0.20, 0.090, 0.0014)]):
    add_drop(f"FB_Drop_Slide_{i}", FRONT + dtheta, z, r, elong=1.35, height=0.8)
print(f"[FB] gouttes : {len(patch)} + 3 glisseuses")

# --- 4. Givre 3D (bokeh) --------------------------------------------------------------------------
ice = fresh_material("MAT_Ice")
ib = principled(ice)
ib.inputs["Base Color"].default_value = (0.85, 0.95, 1.0, 1.0)
ib.inputs["Roughness"].default_value = 0.3
ib.inputs["IOR"].default_value = 1.31
ib.inputs["Transmission Weight"].default_value = 0.7
ib.inputs["Emission Color"].default_value = (0.55, 0.85, 1.0, 1.0)
ib.inputs["Emission Strength"].default_value = 0.6
if hasattr(ice, "use_raytrace_refraction"):
    ice.use_raytrace_refraction = True

frost = fresh_collection("FB_Frost")
old_mesh = bpy.data.meshes.get("FB_ice_mesh")
if old_mesh:
    bpy.data.meshes.remove(old_mesh)
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1.0)
proto = bpy.context.active_object
ice_mesh = proto.data
ice_mesh.name = "FB_ice_mesh"
bpy.data.objects.remove(proto, do_unlink=True)
ice_mesh.materials.append(ice)

rng = random.Random(11)
center = Vector((0.0, 0.0, 0.084))
count = 0
while count < 70:
    p = center + Vector((rng.uniform(-0.5, 0.5), rng.uniform(-0.5, 0.5), rng.uniform(-0.12, 0.14)))
    if Vector((p.x, p.y)).length < 0.1:  # pas contre la canette
        continue
    obj = bpy.data.objects.new(f"FB_Ice_{count:02d}", ice_mesh)
    frost.objects.link(obj)
    s = rng.uniform(0.0015, 0.005)
    obj.scale = (s, s * rng.uniform(0.6, 1.4), s * rng.uniform(0.3, 0.7))
    obj.rotation_euler = (rng.uniform(0, math.tau), rng.uniform(0, math.tau), rng.uniform(0, math.tau))
    obj.location = p
    count += 1
print(f"[FB] givre : {count} éclats")

# --- 5. Retrait de l'ancien turntable (07) --------------------------------------------------------
cam = bpy.data.objects["Camera"]
world_matrix = cam.matrix_world.copy()
cam.parent = None
cam.matrix_world = world_matrix
orbit = bpy.data.objects.get("Cam_Orbit")
if orbit:
    bpy.data.objects.remove(orbit, do_unlink=True)
body.animation_data_clear()
body.rotation_euler = (0.0, 0.0, 0.0)
