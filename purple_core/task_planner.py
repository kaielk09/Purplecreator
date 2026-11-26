"""Deterministic planning utilities: dependencies, ordering and task decomposition."""
from dataclasses import dataclass, field

@dataclass(frozen=True)
class PlanStep:
    id: str
    description: str
    depends_on: tuple[str, ...] = ()
    outputs: tuple[str, ...] = ()

@dataclass
class TaskPlan:
    objective: str
    steps: list[PlanStep]
    assumptions: list[str] = field(default_factory=list)

    def validate(self) -> None:
        if not self.objective.strip():
            raise ValueError("Plan objective is empty")
        ids = [step.id for step in self.steps]
        if len(set(ids)) != len(ids):
            raise ValueError("Duplicate plan step IDs")
        known = set(ids)
        for step in self.steps:
            if not step.id.strip() or not step.description.strip():
                raise ValueError("Step ID and description must be non-empty")
            missing = set(step.depends_on) - known
            if missing:
                raise ValueError(f"{step.id} depends on unknown step(s): {sorted(missing)}")
            if step.id in step.depends_on:
                raise ValueError(f"{step.id} cannot depend on itself")
        self.ordered_steps()

    def ordered_steps(self) -> list[PlanStep]:
        by_id = {s.id: s for s in self.steps}
        pending = set(by_id)
        done: set[str] = set()
        result: list[PlanStep] = []
        while pending:
            ready = sorted((sid for sid in pending if set(by_id[sid].depends_on) <= done))
            if not ready:
                raise ValueError("Plan dependency cycle detected")
            for sid in ready:
                result.append(by_id[sid])
                pending.remove(sid)
                done.add(sid)
        return result

    def critical_path_length(self) -> int:
        lengths: dict[str, int] = {}
        for step in self.ordered_steps():
            lengths[step.id] = 1 + max((lengths[d] for d in step.depends_on), default=0)
        return max(lengths.values(), default=0)
