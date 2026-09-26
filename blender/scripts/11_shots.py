# Plans cinématiques du trailer : construit la caméra et l'animation d'un plan, applique la saveur,
# configure le moteur (EEVEE pour les aperçus, Cycles GPU HIP pour le final) et rend la séquence.
# Ne modifie pas le .blend (lancé en -b, rien n'est sauvegardé).
#
#   blender -b blender/canette.blend -P blender/scripts/11_shots.py -- \
#     --shot orbit --flavor citrus --format 16x9 --engine cycles [--frames 60-60] [--step 3] [--scale 50] [--out DIR]
#
# Plans (durées 16:9 / 9:16, en frames à 30 fps) :
#   macro  : gros plan 90 mm sur les gouttes, 3 gouttes glissent (mise au point sur la principale)  90 / 75
#   travel : part serré sur le logo, recule en arc de 25° (travelling arrière)                      120 / 90
#   orbit  : la canette tourne (0 → 450°) pendant que la caméra orbite de 90°, profondeur de champ  135 / 75
# Sortie par défaut : trailer/public/renders/<shot>/<flavor>/<format>/####.png (RGBA, fond transparent)
import bpy
import math
import os
import sys
import time
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fb_common  # noqa: E402

CAN_R = 0.033
CENTER = Vector((0.0, 0.0, 0.084))
FRONT = -math.pi / 2
LOGO_Z = 0.101
FORMATS = {"16x9": (1920, 1080), "9x16": (1080, 1920)}
DURATIONS = {"macro": (90, 75), "travel": (120, 90), "orbit": (135, 75)}


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    args = {"shot": "orbit", "flavor": "mint", "format": "16x9", "engine": "eevee",
            "frames": None, "step": "1", "scale": "100", "out": None, "samples": "256"}
    for key, value in zip(argv[::2], argv[1::2]):
        args[key.lstrip("-")] = value
    return args


def smooth(t):  # ease in-out (cubique)
    return t * t * (3 - 2 * t)


def ease_out(t):
    return 1 - (1 - t) ** 3


def ease_in(t):
    return t * t


def cyl(angle, radius, z):
    return Vector((radius * math.cos(angle), radius * math.sin(angle), z))


# --- Caméra et cible -----------------------------------------------------------------------------

def make_camera(scene, lens, fstop):
    for name in ("FB_ShotCam", "FB_ShotTarget"):
        old = bpy.data.objects.get(name)
        if old:
            bpy.data.objects.remove(old, do_unlink=True)
    target = bpy.data.objects.new("FB_ShotTarget", None)
    scene.collection.objects.link(target)
    cam = bpy.data.objects.new("FB_ShotCam", bpy.data.cameras.new("FB_ShotCam"))
    scene.collection.objects.link(cam)
    cam.data.lens = lens
    cam.data.sensor_width = 36
    cam.data.sensor_fit = "AUTO"
    cam.data.clip_start = 0.005
    cam.data.dof.use_dof = True
    cam.data.dof.aperture_fstop = fstop
    track = cam.constraints.new("TRACK_TO")
    track.target = target
    track.track_axis = "TRACK_NEGATIVE_Z"
    track.up_axis = "UP_Y"
    scene.camera = cam
    return cam, target


def key(obj, path, frame):
    obj.keyframe_insert(path, frame=frame)


def set_collections(visible):
    for name in ("FB_Drops", "FB_Frost"):
        col = bpy.data.collections.get(name)
        if col:
            col.hide_render = name not in visible
            col.hide_viewport = name not in visible


# --- Plans ---------------------------------------------------------------------------------------

def shot_orbit(scene, n, portrait):
    """Canette 0 → 450° (linéaire) + orbite caméra de 90° (ease) : logo de face au début et à la fin."""
    set_collections({"FB_Frost"})
    cam, target = make_camera(scene, lens=115 if portrait else 85, fstop=3.2)
    target.location = CENTER
    body = bpy.data.objects["Can_Body"]
    start = Vector((0.15, -0.82, 0.30))
    a0, radius = math.atan2(start.y, start.x), Vector((start.x, start.y)).length
    for f in range(1, n + 1):
        t = (f - 1) / (n - 1)
        body.rotation_euler.z = math.radians(450) * t
        key(body, "rotation_euler", f)
        cam.location = cyl(a0 + math.radians(90) * smooth(t), radius, start.z)
        key(cam, "location", f)
    cam.data.dof.focus_distance = (Vector((radius, 0, start.z)) - Vector((0, 0, CENTER.z))).length - CAN_R


def shot_travel(scene, n, portrait):
    """Départ serré sur le logo, recul en arc de 25° ; la mise au point suit la face avant."""
    set_collections({"FB_Drops", "FB_Frost"})
    lens = 95 if portrait else 70
    cam, target = make_camera(scene, lens=lens, fstop=2.8)
    body = bpy.data.objects["Can_Body"]
    # Distances à la surface : logo ≈ 75 % de la hauteur (16:9) / 85 % de la largeur (9:16) → canette entière
    d_start = 0.068 * lens / 20.25 if portrait else 0.085 * lens / 20.25
    d_end = 0.28 * lens / 36 if portrait else 0.24 * lens / 20.25
    for f in range(1, n + 1):
        t = ease_out((f - 1) / (n - 1))
        body.rotation_euler.z = math.radians(-8 + 16 * (f - 1) / (n - 1))
        key(body, "rotation_euler", f)
        d = d_start + (d_end - d_start) * t
        cam.location = cyl(FRONT + math.radians(25) * t, CAN_R + d, LOGO_Z + (0.20 - LOGO_Z) * t)
        key(cam, "location", f)
        target.location = Vector((0, 0, LOGO_Z + (CENTER.z - LOGO_Z) * t))
        key(target, "location", f)
        cam.data.dof.focus_distance = d
        cam.data.keyframe_insert("dof.focus_distance", frame=f)


def shot_macro(scene, n, portrait):
    """Gros plan sur les gouttes ; 3 glisseuses descendent (accélération), la mise au point suit la principale."""
    set_collections({"FB_Drops", "FB_Frost"})
    cam, target = make_camera(scene, lens=90, fstop=4.0)
    slide = [bpy.data.objects[f"FB_Drop_Slide_{i}"] for i in range(3)]
    # Départ / fin (m) et fenêtre temporelle (fraction du plan) de chaque glisseuse
    travel = [(0.026, 0.0, 1.0), (0.018, 0.25, 1.0), (0.022, 0.45, 1.0)]
    starts = [s.location.z for s in slide]
    for f in range(1, n + 1):
        u = (f - 1) / (n - 1)
        for s, z0, (dist, t0, t1) in zip(slide, starts, travel):
            k = min(1.0, max(0.0, (u - t0) / (t1 - t0)))
            s.location.z = z0 - dist * ease_in(k)
            key(s, "location", f)
        # Caméra : légère dérive latérale et verticale, suit la zone de la goutte principale
        focus_z = slide[0].location.z
        cam.location = cyl(FRONT - 0.10 + 0.06 * u, CAN_R + 0.17, focus_z + 0.012)
        key(cam, "location", f)
        target.location = cyl(FRONT - 0.10 + 0.03 * u, CAN_R, focus_z)
        key(target, "location", f)
    cam.data.dof.focus_object = slide[0]
    for s, z0 in zip(slide, starts):  # état de repos pour les autres usages de la scène
        s.location.z = z0
    # Lumière d'accent (plan macro uniquement) : points brillants dans les gouttes
    kick = bpy.data.objects.new("FB_MacroKick", bpy.data.lights.new("FB_MacroKick", "AREA"))
    scene.collection.objects.link(kick)
    kick.data.size = 0.03
    kick.data.energy = 25.0  # ne touche que les gouttes (light linking)
    kick.visible_diffuse = False
    # Light linking (Cycles) : seules les gouttes reçoivent cette lumière, pas le vernis de l'étiquette
    if hasattr(kick, "light_linking"):
        kick.light_linking.receiver_collection = bpy.data.collections["FB_Drops"]
    kick.data.color = (0.85, 0.95, 1.0)
    kick.location = cyl(FRONT - 0.6, CAN_R + 0.12, 0.16)
    kick.rotation_euler = (Vector((0, 0, 0.1)) - kick.location).to_track_quat("-Z", "Y").to_euler()


SHOTS = {"macro": shot_macro, "travel": shot_travel, "orbit": shot_orbit}


# --- Rendu ---------------------------------------------------------------------------------------

def main():
    a = parse_args()
    scene = bpy.context.scene
    portrait = a["format"] == "9x16"
    n = DURATIONS[a["shot"]][1 if portrait else 0]
    fb_common.apply_flavor(a["flavor"])
    SHOTS[a["shot"]](scene, n, portrait)

    out = a["out"] or os.path.join(fb_common.ROOT, "trailer", "public", "renders", a["shot"], a["flavor"], a["format"])
    width, height = FORMATS[a["format"]]
    fb_common.setup_output(scene, os.path.join(out, "####"), width, height, int(a["scale"]))
    if a["engine"] == "cycles":
        fb_common.setup_cycles_gpu(scene, max_samples=int(a["samples"]))
    else:
        fb_common.setup_eevee(scene)

    scene.frame_start, scene.frame_end = 1, n
    if a["frames"]:
        first, last = (int(x) for x in a["frames"].split("-"))
        scene.frame_start, scene.frame_end = first, last
    scene.frame_step = int(a["step"])

    times = []
    stamp = {}
    bpy.app.handlers.render_pre.append(lambda *_: stamp.__setitem__("t", time.time()))
    bpy.app.handlers.render_post.append(lambda *_: times.append(time.time() - stamp["t"]))
    print(f"[FB] plan={a['shot']} saveur={a['flavor']} format={a['format']} frames={scene.frame_start}-{scene.frame_end}"
          f"/{scene.frame_step} → {out}")
    t0 = time.time()
    bpy.ops.render.render(animation=True)
    if times:
        print(f"[FB] {len(times)} image(s) en {time.time() - t0:.1f} s ; par image : "
              f"1re {times[0]:.2f} s, moyenne {sum(times) / len(times):.2f} s, max {max(times):.2f} s")


main()
