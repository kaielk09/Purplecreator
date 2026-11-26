"""Deterministic task routing; model-based classification can be plugged in later."""
from dataclasses import dataclass
from .contracts import CoreRequest, TaskKind
from .performance import get_profile

@dataclass(frozen=True)
class Route:
    kind: TaskKind
    profile_name: str
    allow_search: bool
    needs_planning: bool
    validators: tuple[str, ...]

def route_request(request: CoreRequest) -> Route:
    request.validate()
    kind = request.task_kind
    text = request.prompt.lower()
    # Explicit task_kind always wins; only mixed requests use lightweight keyword routing.
    if kind == "mixed":
        code_words = ("script", "code", "luau", "python", "javascript", "function", "program")
        model_words = ("3d", "mesh", "model", "obiekt", "budynek", "geometry", "siatka")
        has_code = any(w in text for w in code_words)
        has_model = any(w in text for w in model_words)
        if has_code and has_model:
            kind = "mixed"
        elif has_model:
            kind = "model3d"
        elif has_code:
            kind = "code"
        else:
            kind = "mixed"
    profile = get_profile(request.complexity)
    validators = {
        "code": ("manifest", "static_code_review", "optional_compiler"),
        "model3d": ("scene_schema", "mesh_validation", "geometry_bounds"),
        "research": ("source_quality", "citation_presence"),
        "organize": ("path_sandbox", "manifest_consistency"),
        "mixed": ("manifest", "artifact_schema", "task_specific_validation"),
    }[kind]
    return Route(kind, profile.name, profile.allow_web_research, profile.allow_multi_file_plan, validators)
