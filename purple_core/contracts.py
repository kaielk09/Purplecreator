"""Stable data contracts for the provider-neutral Purple Creator runtime."""
from dataclasses import dataclass, field
from typing import Literal

TaskKind = Literal["code", "model3d", "research", "organize", "mixed"]
RunStatus = Literal["completed", "needs_review", "failed", "cancelled"]

@dataclass
class CoreRequest:
    prompt: str
    task_kind: TaskKind = "mixed"
    language: str = "Luau"
    target: str = "Roblox"
    project_context: str = ""
    constraints: list[str] = field(default_factory=list)
    requested_outputs: list[str] = field(default_factory=list)
    complexity: Literal["small", "medium", "large"] = "medium"
    request_id: str = ""

    def validate(self, max_prompt_chars: int = 100_000) -> None:
        if not isinstance(self.prompt, str) or not self.prompt.strip():
            raise ValueError("Request prompt cannot be empty")
        if len(self.prompt) > max_prompt_chars:
            raise ValueError(f"Prompt exceeds {max_prompt_chars} characters")
        if self.task_kind not in {"code", "model3d", "research", "organize", "mixed"}:
            raise ValueError("Unsupported task kind")
        if self.complexity not in {"small", "medium", "large"}:
            raise ValueError("Unsupported complexity")
        if any(not isinstance(x, str) or not x.strip() for x in self.constraints + self.requested_outputs):
            raise ValueError("Constraints and requested outputs must be non-empty strings")

@dataclass
class Artifact:
    path: str
    kind: str
    content: str
    validation: list[str] = field(default_factory=list)

@dataclass
class StageRecord:
    stage: str
    status: str
    detail: str = ""
    duration_ms: int | None = None

@dataclass
class CoreResult:
    status: RunStatus
    task_kind: TaskKind
    summary: str
    artifacts: list[Artifact] = field(default_factory=list)
    stages: list[StageRecord] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
