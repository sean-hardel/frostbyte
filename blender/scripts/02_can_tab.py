# Languette d'ouverture (ovale percé) et rivet, posés sur le couvercle et parentés à Can_Body.
# Idempotent : supprime et recrée Can_Tab et Can_Rivet.
import bpy
import bmesh
import math

LID_Z = 0.1652          # hauteur du panneau de couvercle au centre (m)
THICKNESS = 0.0005
N = 48

# Ellipse extérieure (demi-axes x, y) et trou pour le doigt, centres sur l'axe Y
OUTER_C, OUTER_A, OUTER_B = 0.0055, 0.0060, 0.0102
HOLE_C, HOLE_A, HOLE_B = 0.0095, 0.0035, 0.0026


def outer_point(theta):
    """Intersection du rayon issu du centre du trou avec l'ellipse extérieure."""
    c, s = math.cos(theta), math.sin(theta)
    d = HOLE_C - OUTER_C
    qa = c * c / OUTER_A ** 2 + s * s / OUTER_B ** 2
    qb = 2 * d * s / OUTER_B ** 2
    qc = d * d / OUTER_B ** 2 - 1
    t = (-qb + math.sqrt(qb * qb - 4 * qa * qc)) / (2 * qa)
    return (t * c, HOLE_C + t * s, 0.0)


for name in ("Can_Tab", "Can_Rivet"):
    old = bpy.data.objects.get(name)
    if old:
        mesh = old.data
        bpy.data.objects.remove(old, do_unlink=True)
        if mesh and mesh.users == 0:
            bpy.data.meshes.remove(mesh)

body = bpy.data.objects["Can_Body"]

# Anneau plat (extérieur → trou), épaissi par Solidify
bm = bmesh.new()
thetas = [2 * math.pi * i / N for i in range(N)]
outer = [bm.verts.new(outer_point(t)) for t in thetas]
hole = [bm.verts.new((HOLE_A * math.cos(t), HOLE_C + HOLE_B * math.sin(t), 0.0)) for t in thetas]
for i in range(N):
    j = (i + 1) % N
    f = bm.faces.new((outer[i], outer[j], hole[j], hole[i]))
    f.smooth = True
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
mesh = bpy.data.meshes.new("Can_Tab")
bm.to_mesh(mesh)
bm.free()

tab = bpy.data.objects.new("Can_Tab", mesh)
bpy.context.scene.collection.objects.link(tab)
tab.location = (0.0, 0.0, LID_Z + 0.0003)
tab.rotation_euler = (math.radians(1.5), 0.0, 0.0)  # anneau légèrement relevé, comme une vraie languette
solid = tab.modifiers.new("Solidify", "SOLIDIFY")
solid.thickness = THICKNESS
solid.offset = 1.0
bevel = tab.modifiers.new("Bevel", "BEVEL")
bevel.width = 0.0002
bevel.segments = 2
tab.parent = body

# Rivet : petit cylindre bombé au centre du couvercle
bm = bmesh.new()
bmesh.ops.create_cone(
    bm, cap_ends=True, cap_tris=False, segments=24,
    radius1=0.0018, radius2=0.0016, depth=0.0007,
)
for f in bm.faces:
    f.smooth = True
mesh = bpy.data.meshes.new("Can_Rivet")
bm.to_mesh(mesh)
bm.free()

rivet = bpy.data.objects.new("Can_Rivet", mesh)
bpy.context.scene.collection.objects.link(rivet)
rivet.location = (0.0, 0.0, LID_Z + 0.0009)
bevel = rivet.modifiers.new("Bevel", "BEVEL")
bevel.width = 0.00025
bevel.segments = 2
rivet.parent = body
