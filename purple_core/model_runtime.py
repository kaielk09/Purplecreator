"""Runtime contract and health reporting for a future Purple model backend."""
from dataclasses import dataclass
from typing import Protocol, Iterable

@dataclass(frozen=True)
class RuntimeInfo:
    name: str
    loaded: bool
    device: str
    model_revision: str | None = None
    detail: str = ""

class PurpleRuntime(Protocol):
    def generate(self, prompt: str, *, temperature: float = 0.2) -> str: ...
    def info(self) -> RuntimeInfo: ...

@dataclass(frozen=True)
class RuntimeCapability:
    name: str
    enabled: bool
    explanation: str

def runtime_capabilities(runtime: PurpleRuntime | None) -> tuple[RuntimeCapability, ...]:
    if runtime is None:
        return (RuntimeCapability("text_generation", False, "No model runtime connected"),)
    info = runtime.info()
    return (RuntimeCapability("text_generation", info.loaded, info.detail or info.name),)
