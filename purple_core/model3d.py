"""Format-neutral editable scene schema for procedural 3D output."""
from dataclasses import dataclass, asdict
import json
@dataclass
class Primitive:
    name: str
    shape: str = "cube"
    position: tuple[float, float, float] = (0.0, 0.0, 0.0)
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0)
    scale: tuple[float, float, float] = (1.0, 1.0, 1.0)
    material: str = "default"
@dataclass
class Scene:
    name: str
    primitives: list[Primitive]
    def to_json(self) -> str:
        return json.dumps(asdict(self), ensure_ascii=False, indent=2)
    def validate(self) -> None:
        if not self.name.strip():
            raise ValueError("Scene needs a name")
        if any(p.shape not in {"cube", "sphere", "cylinder", "cone"} for p in self.primitives):
            raise ValueError("Unsupported primitive shape")
        for p in self.primitives:
            if any(v <= 0 for v in p.scale):
                raise ValueError(f"Scale must be positive for {p.name}")
