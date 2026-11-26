"""Convert validated scene primitive descriptions into editable combined mesh geometry."""
import math
from .model3d import Scene, Primitive
from .mesh3d import Mesh, make_box
from .primitives import make_uv_sphere, make_cylinder, make_cone
from .mesh_ops import scaled, rotated_degrees, translated, merge_meshes

def primitive_mesh(primitive: Primitive) -> Mesh:
    if not primitive.name.strip():
        raise ValueError("Primitive name must not be empty")
    values = (*primitive.position, *primitive.rotation, *primitive.scale)
    if not all(math.isfinite(v) for v in values):
        raise ValueError(f"Primitive {primitive.name} has non-finite transforms")
    if any(v <= 0 for v in primitive.scale):
        raise ValueError(f"Primitive {primitive.name} has non-positive scale")
    shape = primitive.shape.lower()
    if shape == "cube":
        mesh = make_box(primitive.name)
    elif shape == "sphere":
        mesh = make_uv_sphere(primitive.name)
    elif shape == "cylinder":
        mesh = make_cylinder(primitive.name)
    elif shape == "cone":
        mesh = make_cone(primitive.name)
    else:
        raise ValueError(f"Unsupported primitive shape: {primitive.shape}")
    mesh = scaled(mesh, primitive.scale)
    mesh = rotated_degrees(mesh, primitive.rotation)
    mesh = translated(mesh, primitive.position)
    return mesh

def scene_to_mesh(scene: Scene) -> Mesh:
    scene.validate()
    if not scene.primitives:
        raise ValueError("Scene contains no primitives")
    meshes = [primitive_mesh(p) for p in scene.primitives]
    return merge_meshes(scene.name, meshes)
