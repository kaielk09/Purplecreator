"""Adapter-driven orchestration pipeline with bounded validation repair."""
from dataclasses import dataclass
from typing import Protocol
from .contracts import CoreRequest, CoreResult, StageRecord, Artifact
from .routing import route_request

class Planner(Protocol):
    def plan(self, request: CoreRequest, route) -> str: ...

class Executor(Protocol):
    def execute(self, request: CoreRequest, route, plan: str) -> list[Artifact]: ...

class Validator(Protocol):
    def validate(self, request: CoreRequest, artifacts: list[Artifact], route) -> list[str]: ...

@dataclass
class PipelineAdapters:
    planner: Planner
    executor: Executor
    validator: Validator

class PurplePipeline:
    """Runs injected components; it does not pretend a model backend is present."""
    def __init__(self, adapters: PipelineAdapters, max_repair_attempts: int = 1):
        self.adapters = adapters
        self.max_repair_attempts = max(0, min(int(max_repair_attempts), 3))

    def run(self, request: CoreRequest) -> CoreResult:
        result = CoreResult(status="failed", task_kind=request.task_kind, summary="")
        try:
            request.validate()
            result.stages.append(StageRecord("ingress", "passed", "Request schema validated"))
            route = route_request(request)
            result.task_kind = route.kind
            result.stages.append(StageRecord("routing", "passed", f"Profile={route.profile_name}; validators={','.join(route.validators)}"))
            plan = self.adapters.planner.plan(request, route)
            if not isinstance(plan, str) or not plan.strip():
                raise RuntimeError("Planner returned an empty plan")
            result.stages.append(StageRecord("planning", "passed", "Plan created by injected adapter"))
            artifacts = self.adapters.executor.execute(request, route, plan)
            if not isinstance(artifacts, list):
                raise TypeError("Executor must return list[Artifact]")
            result.stages.append(StageRecord("execution", "passed", f"Produced {len(artifacts)} artifact(s)"))
            findings = self.adapters.validator.validate(request, artifacts, route) or []
            repair = getattr(self.adapters.executor, "repair", None)
            repairs_done = 0
            while findings and callable(repair) and repairs_done < self.max_repair_attempts:
                repairs_done += 1
                result.stages.append(StageRecord("repair", "started", f"Attempt {repairs_done}"))
                repaired = repair(request, route, plan, artifacts, findings)
                if not isinstance(repaired, list) or not all(isinstance(a, Artifact) for a in repaired):
                    raise TypeError("Repair adapter must return list[Artifact]")
                artifacts = repaired
                findings = self.adapters.validator.validate(request, artifacts, route) or []
                result.stages.append(StageRecord("repair", "completed", f"Remaining findings: {len(findings)}"))
            result.artifacts = artifacts
            result.warnings.extend(findings)
            if findings:
                result.status = "needs_review"
                result.summary = "Artifacts generated; validation findings remain."
                result.stages.append(StageRecord("validation", "needs_review", "; ".join(findings)))
            else:
                result.status = "completed"
                result.summary = "Artifacts passed the configured validator."
                result.stages.append(StageRecord("validation", "passed", "No findings reported"))
        except Exception as exc:
            result.status = "failed"
            result.errors.append(f"{type(exc).__name__}: {exc}")
            result.summary = "Pipeline stopped at the failing stage."
            result.stages.append(StageRecord("pipeline", "failed", result.errors[-1]))
        return result
