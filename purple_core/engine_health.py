"""Consistent, non-secret health summary for engine components."""
from dataclasses import dataclass
from typing import Any

@dataclass(frozen=True)
class ComponentStatus:
    component: str
    status: str
    notes: str = ""

def summarize_health(runtime: Any = None, research: Any = None, validators: Any = None) -> list[ComponentStatus]:
    statuses = []
    if runtime is None:
        statuses.append(ComponentStatus("model_runtime", "missing", "Model weights and inference adapter are not connected"))
    else:
        info = runtime.info()
        statuses.append(ComponentStatus("model_runtime", "ready" if info.loaded else "unavailable", info.detail))
    statuses.append(ComponentStatus("research", "ready" if research else "adapter_missing", "Research providers are injected; no provider assumed"))
    statuses.append(ComponentStatus("validation", "ready" if validators else "basic_only", "Preflight checks are not full compilers"))
    return statuses
