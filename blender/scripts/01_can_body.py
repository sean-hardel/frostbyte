# Corps de la canette 50 cl (Ø 66 mm × 168 mm) : profil révolu autour de Z.
# Fond bombé avec pied d'appui, épaule, col, double sertissage et couvercle.
# Idempotent : supprime et recrée Can_Body. Origine au centre du fond (z = 0).
import bpy
import bmesh
import math

NAME = "Can_Body"
SEGMENTS = 64
LABEL_Z = (0.016, 0.146)  # zone d'étiquette (m)

# Profil (rayon, z) en mètres, du centre du fond jusqu'au centre du couvercle
PROFILE = [
    # dôme du fond (bombé vers l'intérieur)
    (0.0, 0.0105), (0.008, 0.0100), (0.014, 0.0088), (0.019, 0.0068),
    (0.022, 0.0045), (0.0235, 0.0022), (0.0245, 0.0006),
    # pied d'appui
    (0.0255, 0.0), (0.0265, 0.0002),
    # raccord fond → corps
    (0.0285, 0.0020), (0.0305, 0.0050), (0.0320, 0.0085), (0.0328, 0.0115),
    (0.0330, 0.0140),
    # corps (zone étiquette entre LABEL_Z). Les boucles à ±1 mm des bordures maintiennent
    # la zone en place sous la subdivision, sinon elle rétrécit de ~8 % (étiquette écrasée).
    (0.0330, LABEL_Z[0]), (0.0330, LABEL_Z[0] + 0.001), (0.0330, 0.050), (0.0330, 0.080),
    (0.0330, 0.110), (0.0330, LABEL_Z[1] - 0.001), (0.0330, LABEL_Z[1]), (0.0330, 0.148),
    # épaule et col
    (0.0327, 0.1505), (0.0318, 0.1535), (0.0303, 0.1565), (0.0288, 0.1590),
    (0.0278, 0.1610), (0.0272, 0.1628),
    # double sertissage (rebord)
    (0.0270, 0.1640), (0.0272, 0.1655), (0.0276, 0.1668), (0.0276, 0.1678),
    (0.0272, 0.1684), (0.0266, 0.1682),
    # paroi intérieure et gorge du couvercle
    (0.0262, 0.1672), (0.0258, 0.1650), (0.0254, 0.1638), (0.0249, 0.1640),
    (0.0246, 0.1648),
    # panneau du couvercle
    (0.0200, 0.1650), (0.0100, 0.1652), (0.0, 0.1653),
]

old = bpy.data.objects.get(NAME)
if old:
    bpy.data.objects.remove(old, do_unlink=True)
if NAME in bpy.data.meshes:
    bpy.data.meshes.remove(bpy.data.meshes[NAME])

bm = bmesh.new()
verts = [bm.verts.new((r, 0.0, z)) for r, z in PROFILE]
edges = [bm.edges.new((verts[i], verts[i + 1])) for i in range(len(verts) - 1)]
bmesh.ops.spin(
    bm, geom=verts + edges, cent=(0, 0, 0), axis=(0, 0, 1),
    angle=2 * math.pi, steps=SEGMENTS, use_merge=True,
)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)

# Index matériau 1 = étiquette ; UV cylindriques sur toute la canette
uv = bm.loops.layers.uv.new("UVMap")
height = LABEL_Z[1] - LABEL_Z[0]
for f in bm.faces:
    c = f.calc_center_median()
    f.material_index = 1 if LABEL_Z[0] < c.z < LABEL_Z[1] else 0
    f.smooth = True
    # u = 0.5 face avant (-Y), couture à l'arrière (+Y) ; u croît de gauche à droite vu de face
    us = [(math.atan2(l.vert.co.y, l.vert.co.x) / (2 * math.pi) + 0.75) % 1.0 for l in f.loops]
    if max(us) - min(us) > 0.5:  # face à cheval sur la couture
        us = [u + 1.0 if u < 0.5 else u for u in us]
    for l, u in zip(f.loops, us):
        l[uv].uv = (u, (l.vert.co.z - LABEL_Z[0]) / height)

mesh = bpy.data.meshes.new(NAME)
# Slots créés avant to_mesh, sinon Blender ramène les material_index à 0
mesh.materials.append(bpy.data.materials.get("MAT_Alu"))
mesh.materials.append(bpy.data.materials.get("MAT_Label"))
bm.to_mesh(mesh)
bm.free()

obj = bpy.data.objects.new(NAME, mesh)
bpy.context.scene.collection.objects.link(obj)
sub = obj.modifiers.new("Subdivision", "SUBSURF")
sub.levels = 1
sub.render_levels = 2
