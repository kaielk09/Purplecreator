"""Plan validation utilities."""
from dataclasses import dataclass, field
from .contracts import CoreRequest

@dataclass
class ExecutionPlan:
    objective: str
    steps: list[str]
    output_paths: list[str]
    dependencies: list[str] = field(default_factory=list)
    assumptions: list[str] = field(default_factory=list)

    def validate(self, request: CoreRequest) -> None:
        if not self.objective.strip() or not self.steps:
            raise ValueError("Plan needs an objective and at least one step")
        if any(not isinstance(s, str) or not s.strip() for s in self.steps + self.output_paths):
            raise ValueError("Plan entries cannot be blank")
        if len(set(self.output_paths)) != len(self.output_paths):
            raise ValueError("Plan contains duplicate output paths")
        missing = set(request.requested_outputs) - set(self.output_paths)
        if missing:
            raise ValueError("Plan omitted requested output paths: " + ", ".join(sorted(missing)))
        if len(self.steps) > 100:
            raise ValueError("Plan exceeds 100 steps; split into smaller phases")
