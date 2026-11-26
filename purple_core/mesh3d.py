"""Editable triangle-mesh core with validation and Wavefront OBJ export.

Mesh generation is geometry data, not a trained image/3D model. This module gives
Purple Creator a real mesh representation to build upon.
"""
from dataclasses import dataclass
from pathlib import Path
import math

Vec3 = tuple[float, float, float]
Face = tuple[int, ...]

@dataclass
class Mesh:
    name: str
    vertices: list[Vec3]
    faces: list[Face]

    def validate(self) -> list[str]:
        problems: list[str] = []
        if not self.name.strip():
            problems.append("Mesh name is empty")
        if not self.vertices:
            problems.append("Mesh has no vertices")
        if not self.faces:
            problems.append("Mesh has no faces")
        for idx, vertex in enumerate(self.vertices):
            if len(vertex) != 3 or not all(math.isfinite(v) for v in vertex):
                problems.append(f"Vertex {idx} is invalid")
        for idx, face in enumerate(self.faces):
            if len(face) < 3:
                problems.append(f"Face {idx} has fewer than three vertices")
            if any(not isinstance(i, int) or i < 0 or i >= len(self.vertices) for i in face):
                problems.append(f"Face {idx} references an invalid vertex")
        return problems

    def to_obj(self) -> str:
        issues = self.validate()
        if issues:
            raise ValueError("Invalid mesh: " + "; ".join(issues))
        lines = [f"o {self.name.replace(' ', '_')}"]
        lines.extend(f"v {x:.6f} {y:.6f} {z:.6f}" for x, y, z in self.vertices)
        lines.extend("f " + " ".join(str(i + 1) for i in face) for face in self.faces)
        return "\n".join(lines) + "\n"

    def save_obj(self, output_path: str | Path) -> Path:
        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(self.to_obj(), encoding="utf-8")
        return path


def make_box(name: str = "Box", size: Vec3 = (1.0, 1.0, 1.0)) -> Mesh:
    sx, sy, sz = size
    if any(v <= 0 or not math.isfinite(v) for v in size):
        raise ValueError("Box dimensions must be finite and positive")
    x, y, z = sx / 2, sy / 2, sz / 2
    vertices = [(-x,-y,-z),(x,-y,-z),(x,y,-z),(-x,y,-z),
                (-x,-y,z),(x,-y,z),(x,y,z),(-x,y,z)]
    faces = [(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
    return Mesh(name, vertices, faces)
