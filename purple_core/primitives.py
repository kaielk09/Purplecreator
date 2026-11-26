"""Procedural triangle mesh primitives."""
import math
from .mesh3d import Mesh, Vec3

def _check_segments(segments: int, minimum: int = 3):
    if not isinstance(segments, int) or segments < minimum or segments > 512:
        raise ValueError(f"segments must be integer in [{minimum}, 512]")

def make_uv_sphere(name: str = "Sphere", radius: float = 1.0, segments: int = 24, rings: int = 12) -> Mesh:
    _check_segments(segments)
    _check_segments(rings, 2)
    if not math.isfinite(radius) or radius <= 0:
        raise ValueError("radius must be finite and positive")
    verts: list[Vec3] = [(0.0, radius, 0.0)]
    for ring in range(1, rings):
        phi = math.pi * ring / rings
        for s in range(segments):
            theta = 2 * math.pi * s / segments
            verts.append((radius * math.sin(phi) * math.cos(theta),
                         radius * math.cos(phi),
                         radius * math.sin(phi) * math.sin(theta)))
    bottom_index = len(verts)
    verts.append((0.0, -radius, 0.0))
    faces = []
    first_ring = 1
    for s in range(segments):
        nxt = (s + 1) % segments
        faces.append((0, first_ring + s, first_ring + nxt))
    for ring in range(rings - 2):
        start = first_ring + ring * segments
        next_start = start + segments
        for s in range(segments):
            nxt = (s + 1) % segments
            faces.extend([(start+s, next_start+s, next_start+nxt),
                         (start+s, next_start+nxt, start+nxt)])
    last_ring = first_ring + (rings - 2) * segments
    for s in range(segments):
        nxt = (s + 1) % segments
        faces.append((last_ring+s, bottom_index, last_ring+nxt))
    return Mesh(name, verts, faces)

def make_cylinder(name: str = "Cylinder", radius: float = 1.0, height: float = 2.0, segments: int = 24) -> Mesh:
    _check_segments(segments)
    if any(not math.isfinite(v) or v <= 0 for v in (radius, height)):
        raise ValueError("radius and height must be finite and positive")
    verts: list[Vec3] = []
    for y in (-height / 2, height / 2):
        verts.extend((radius * math.cos(2 * math.pi * i / segments), y, radius * math.sin(2 * math.pi * i / segments)) for i in range(segments))
    bottom, top = len(verts), len(verts) + 1
    verts.extend([(0.0, -height / 2, 0.0), (0.0, height / 2, 0.0)])
    faces = []
    for i in range(segments):
        j = (i + 1) % segments
        faces.extend([(i, j, segments + j, segments + i),
                     (bottom, j, i),
                     (top, segments + i, segments + j)])
    return Mesh(name, verts, faces)

def make_cone(name: str = "Cone", radius: float = 1.0, height: float = 2.0, segments: int = 24) -> Mesh:
    _check_segments(segments)
    if any(not math.isfinite(v) or v <= 0 for v in (radius, height)):
        raise ValueError("radius and height must be finite and positive")
    verts = [(radius * math.cos(2 * math.pi * i / segments), -height / 2,
              radius * math.sin(2 * math.pi * i / segments)) for i in range(segments)]
    tip, bottom_center = len(verts), len(verts) + 1
    verts.extend([(0.0, height / 2, 0.0), (0.0, -height / 2, 0.0)])
    faces = []
    for i in range(segments):
        j = (i + 1) % segments
        faces.extend([(i, j, tip), (bottom_center, j, i)])
    return Mesh(name, verts, faces)
