"""Mesh transforms and merging for procedural scene composition."""
from dataclasses import replace
import math
from .mesh3d import Mesh, Vec3

def translated(mesh: Mesh, offset: Vec3) -> Mesh:
    if not all(math.isfinite(v) for v in offset):
        raise ValueError("Translation values must be finite")
    ox, oy, oz = offset
    return replace(mesh, vertices=[(x+ox, y+oy, z+oz) for x,y,z in mesh.vertices])

def scaled(mesh: Mesh, factors: Vec3) -> Mesh:
    if not all(math.isfinite(v) and v > 0 for v in factors):
        raise ValueError("Scale factors must be finite and positive")
    sx, sy, sz = factors
    return replace(mesh, vertices=[(x*sx, y*sy, z*sz) for x,y,z in mesh.vertices])

def rotated_degrees(mesh: Mesh, angles: Vec3) -> Mesh:
    if not all(math.isfinite(v) for v in angles):
        raise ValueError("Rotation values must be finite")
    rx, ry, rz = (math.radians(v) for v in angles)
    cx, sx = math.cos(rx), math.sin(rx)
    cy, sy = math.cos(ry), math.sin(ry)
    cz, sz = math.cos(rz), math.sin(rz)
    out = []
    for x, y, z in mesh.vertices:
        # X then Y then Z rotation
        y1, z1 = y*cx-z*sx, y*sx+z*cx
        x2, z2 = x*cy+z1*sy, -x*sy+z1*cy
        x3, y3 = x2*cz-y1*sz, x2*sz+y1*cz
        out.append((x3, y3, z2))
    return replace(mesh, vertices=out)

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
