# Monde : l'HDRI Poly Haven (studio_small_03) éclaire et se reflète sur le métal,
# mais la caméra voit un fond uni bleu nuit (#0A2540) via Light Path > Is Camera Ray.
# Prérequis : l'HDRI a été importé par download_polyhaven_asset (nœud Environment Texture présent).
# Idempotent : reconstruit le mélange à chaque exécution.
import bpy

NIGHT = "#0A2540"


def srgb_to_linear(hex_color):
    rgb = [int(hex_color[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in rgb]
    return (*lin, 1.0)


world = bpy.context.scene.world
nt = world.node_tree
env = next(n for n in nt.nodes if n.type == "TEX_ENVIRONMENT")
out = next(n for n in nt.nodes if n.type == "OUTPUT_WORLD")

# Nettoie un éventuel mélange précédent (repéré par label)
for n in [n for n in nt.nodes if n.label.startswith("FB_")]:
    nt.nodes.remove(n)

# Fond HDRI : on garde le Background existant branché sur l'environnement
hdri_bg = next(
    n for n in nt.nodes
    if n.type == "BACKGROUND" and any(l.from_node == env for l in n.inputs["Color"].links)
)

solid_bg = nt.nodes.new("ShaderNodeBackground")
solid_bg.label = "FB_solid"
solid_bg.inputs["Color"].default_value = srgb_to_linear(NIGHT)
solid_bg.inputs["Strength"].default_value = 1.0

light_path = nt.nodes.new("ShaderNodeLightPath")
light_path.label = "FB_lightpath"
mix = nt.nodes.new("ShaderNodeMixShader")
mix.label = "FB_mix"

nt.links.new(light_path.outputs["Is Camera Ray"], mix.inputs["Fac"])
nt.links.new(hdri_bg.outputs["Background"], mix.inputs[1])
nt.links.new(solid_bg.outputs["Background"], mix.inputs[2])
nt.links.new(mix.outputs["Shader"], out.inputs["Surface"])

# L'HDRI est packé dans le .blend (il est téléchargé dans un dossier temporaire)
if env.image and env.image.packed_file is None:
    env.image.pack()
