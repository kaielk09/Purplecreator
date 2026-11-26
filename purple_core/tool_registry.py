"""Explicit allow-list tool registry for model-invoked tools."""
from dataclasses import dataclass
from typing import Callable, Any

@dataclass(frozen=True)
class ToolSpec:
    name: str
    description: str
    handler: Callable[..., Any]
    required_args: tuple[str, ...] = ()

class ToolRegistry:
    def __init__(self):
        self._tools: dict[str, ToolSpec] = {}

    def register(self, spec: ToolSpec) -> None:
        if not spec.name or not spec.name.replace("_", "").isalnum():
            raise ValueError("Tool name must be a simple identifier")
        if spec.name in self._tools:
            raise ValueError(f"Tool already registered: {spec.name}")
        self._tools[spec.name] = spec

    def describe(self) -> list[dict[str, str]]:
        return [{"name": t.name, "description": t.description} for t in self._tools.values()]

    def invoke(self, name: str, arguments: dict[str, Any]) -> Any:
        spec = self._tools.get(name)
        if spec is None:
            raise KeyError(f"Tool is not allow-listed: {name}")
        if not isinstance(arguments, dict):
            raise TypeError("Tool arguments must be a dictionary")
        missing = [key for key in spec.required_args if key not in arguments]
        if missing:
            raise ValueError("Missing tool arguments: " + ", ".join(missing))
        # No model-generated names are resolved dynamically; only registered handlers execute.
        return spec.handler(**arguments)

    def names(self) -> tuple[str, ...]:
        return tuple(self._tools.keys())
