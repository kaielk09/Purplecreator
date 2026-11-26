"""Geometry diagnostics, intentionally conservative."""
from collections import Counter
import math
from .mesh3d import Mesh

def inspect_mesh(mesh: Mesh, area_epsilon: float = 1e-10) -> list[str]:
    issues = list(mesh.validate())
    if issues:
        return issues
    for i, face in enumerate(mesh.faces):
        if len(set(face)) != len(face):
            issues.append(f"Face {i} repeats vertex indices")
        if len(face) == 3:
            a, b, c = (mesh.vertices[j] for j in face)
            ab = (b[0]-a[0], b[1]-a[1], b[2]-a[2])
            ac = (c[0]-a[0], c[1]-a[1], c[2]-a[2])
            cross = (ab[1]*ac[2]-ab[2]*ac[1], ab[2]*ac[0]-ab[0]*ac[2], ab[0]*ac[1]-ab[1]*ac[0])
            if math.sqrt(sum(x*x for x in cross)) * 0.5 <= area_epsilon:
                issues.append(f"Triangle {i} is degenerate")
    edges = Counter()
    for face in mesh.faces:
        if len(face) >= 3 and all(isinstance(j, int) and 0 <= j < len(mesh.vertices) for j in face):
            for a, b in zip(face, face[1:] + face[:1]):
                edges[tuple(sorted((a, b)))] += 1
    boundary = sum(1 for count in edges.values() if count == 1)
    nonmanifold = sum(1 for count in edges.values() if count > 2)
    if boundary:
        issues.append(f"Mesh has {boundary} boundary edges (may be intentional)")
    if nonmanifold:
        issues.append(f"Mesh has {nonmanifold} non-manifold edges")
    return issues

def bounds(mesh: Mesh):
    if not mesh.vertices:
        raise ValueError("Cannot compute bounds for empty mesh")
    low = tuple(min(v[i] for v in mesh.vertices) for i in range(3))
    high = tuple(max(v[i] for v in mesh.vertices) for i in range(3))
    return low, high
