# Turntable 5 s pour le trailer : la canette tourne sur elle-même pendant que la caméra orbite.
# - 150 images à 30 fps (cadence du trailer), 1920 × 1080
# - Can_Body : 0 → 450° (linéaire) ; caméra : orbite de 90° (ease in/out) via l'empty Cam_Orbit.
#   Rotation relative canette/caméra = 360° : logo face caméra à la première et à la dernière image.
# - Sortie : PNG RGBA (fond transparent, pour composer dans Remotion) dans trailer/public/renders/
# Idempotent : supprime l'animation et Cam_Orbit existants avant de les recréer.
# Frame 1 = pose de repos (rotation 0) : 06_export_glb.py reste valable s'il est lancé à la frame 1.
import bpy
import math
from bpy_extras import anim_utils

FPS = 30
FRAMES = 150  # 5 s
CAN_TURN = math.radians(450)
ORBIT = math.radians(90)
OUTPUT = "//../trailer/public/renders/can_turntable_####"

scene = bpy.context.scene
body = bpy.data.objects["Can_Body"]
cam = bpy.data.objects["Camera"]


def set_interpolation(obj, interpolation):
    ad = obj.animation_data
    bag = anim_utils.action_get_channelbag_for_slot(ad.action, ad.action_slot)
    for fc in bag.fcurves:
        for kp in fc.keyframe_points:
            kp.interpolation = interpolation


# --- Nettoyage (caméra détachée en gardant sa position monde) ---
world = cam.matrix_world.copy()
cam.parent = None
cam.matrix_world = world
for obj in (body, cam):
    obj.animation_data_clear()
old = bpy.data.objects.get("Cam_Orbit")
if old:
    bpy.data.objects.remove(old, do_unlink=True)
body.rotation_euler = (0.0, 0.0, 0.0)

# --- Timing ---
scene.render.fps = FPS
scene.render.fps_base = 1.0
scene.frame_start = 1
scene.frame_end = FRAMES
scene.frame_set(1)

# --- Canette : rotation continue ---
body.rotation_euler.z = 0.0
body.keyframe_insert("rotation_euler", index=2, frame=1)
body.rotation_euler.z = CAN_TURN
body.keyframe_insert("rotation_euler", index=2, frame=FRAMES)
set_interpolation(body, "LINEAR")
body.rotation_euler.z = 0.0

# --- Caméra : orbite autour de l'axe de la canette (le Track To garde la visée) ---
orbit = bpy.data.objects.new("Cam_Orbit", None)
scene.collection.objects.link(orbit)
orbit.empty_display_size = 0.05
cam.parent = orbit
cam.matrix_parent_inverse = orbit.matrix_world.inverted()
orbit.rotation_euler.z = 0.0
orbit.keyframe_insert("rotation_euler", index=2, frame=1)
orbit.rotation_euler.z = ORBIT
orbit.keyframe_insert("rotation_euler", index=2, frame=FRAMES)
set_interpolation(orbit, "BEZIER")  # départ et arrivée en douceur

scene.frame_set(1)

# --- Rendu ---
r = scene.render
r.resolution_x, r.resolution_y, r.resolution_percentage = 1920, 1080, 100
r.film_transparent = True
r.use_motion_blur = True
r.motion_blur_shutter = 0.5
r.image_settings.file_format = "PNG"
r.image_settings.color_mode = "RGBA"
r.image_settings.color_depth = "8"
r.image_settings.compression = 15
r.filepath = OUTPUT
