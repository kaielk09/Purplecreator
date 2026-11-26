"""Format-neutral scene schema for procedural 3D output."""
from dataclasses import dataclass, asdict
import json
import math

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
        self.validate()
        return json.dumps(asdict(self), ensure_ascii=False, indent=2)

    def validate(self) -> None:
        if not isinstance(self.name, str) or not self.name.strip():
            raise ValueError("Scene needs a non-empty name")
        if not isinstance(self.primitives, list):
            raise ValueError("Scene primitives must be a list")
        allowed = {"cube", "sphere", "cylinder", "cone"}
        for primitive in self.primitives:
            if primitive.shape not in allowed:
                raise ValueError(f"Unsupported primitive shape: {primitive.shape}")
            if not primitive.name.strip():
                raise ValueError("Primitive needs a non-empty name")
            transforms = (*primitive.position, *primitive.rotation, *primitive.scale)
            if not all(math.isfinite(v) for v in transforms):
                raise ValueError(f"Non-finite transform in {primitive.name}")
            if any(v <= 0 for v in primitive.scale):
                raise ValueError(f"Scale must be positive for {primitive.name}")
