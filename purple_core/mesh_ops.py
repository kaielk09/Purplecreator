"""Basic deterministic mesh editing operations used by procedural 3D builders."""
from dataclasses import replace
from .mesh3d import Mesh, Vec3

def translated(mesh: Mesh, offset: Vec3) -> Mesh:
    ox, oy, oz = offset
    return replace(mesh, vertices=[(x+ox, y+oy, z+oz) for x,y,z in mesh.vertices])

def scaled(mesh: Mesh, factors: Vec3) -> Mesh:
    sx, sy, sz = factors
    if min(sx, sy, sz) <= 0:
        raise ValueError("Scale factors must be positive")
    return replace(mesh, vertices=[(x*sx, y*sy, z*sz) for x,y,z in mesh.vertices])

def merge_meshes(name: str, meshes: list[Mesh]) -> Mesh:
    vertices: list[Vec3] = []
    faces = []
    for mesh in meshes:
        errors = mesh.validate()
        if errors:
            raise ValueError(f"Cannot merge invalid mesh {mesh.name}: {errors}")
        offset = len(vertices)
        vertices.extend(mesh.vertices)
        faces.extend(tuple(i+offset for i in face) for face in mesh.faces)
    merged = Mesh(name, vertices, faces)
    errors = merged.validate()
    if errors:
        raise ValueError("Merged mesh failed validation: " + "; ".join(errors))
    return merged
