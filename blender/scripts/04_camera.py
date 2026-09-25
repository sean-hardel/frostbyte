# Caméra produit : 85 mm, légère plongée, cadrée sur la canette via un Track To.
# Idempotent : réutilise l'objet "Camera" et recrée la cible Can_CamTarget.
import bpy

scene = bpy.context.scene
CAN_CENTER_Z = 0.084

target = bpy.data.objects.get("Can_CamTarget")
if target is None:
    target = bpy.data.objects.new("Can_CamTarget", None)
    scene.collection.objects.link(target)
target.location = (0.0, 0.0, CAN_CENTER_Z)
target.empty_display_size = 0.02

cam = bpy.data.objects.get("Camera")
if cam is None or cam.type != "CAMERA":
    cam = bpy.data.objects.new("Camera", bpy.data.cameras.new("Camera"))
    scene.collection.objects.link(cam)
# Quasi de face (-Y = face avant de l'étiquette, décalage ~10°), plongée ~12° pour voir le rebord
cam.location = (0.15, -0.82, 0.30)
cam.data.lens = 85
cam.data.clip_start = 0.01
cam.data.clip_end = 20.0

for c in list(cam.constraints):
    cam.constraints.remove(c)
track = cam.constraints.new("TRACK_TO")
track.target = target
track.track_axis = "TRACK_NEGATIVE_Z"
track.up_axis = "UP_Y"

scene.camera = cam
scene.render.resolution_x = 1920
scene.render.resolution_y = 1080
