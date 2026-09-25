# Nettoyage de la scène par défaut : supprime le Cube et la Light (l'éclairage vient de l'HDRI).
import bpy

for name in ("Cube", "Light"):
    obj = bpy.data.objects.get(name)
    if obj:
        bpy.data.objects.remove(obj, do_unlink=True)

units = bpy.context.scene.unit_settings
units.system = "METRIC"
units.scale_length = 1.0
units.length_unit = "MILLIMETERS"
