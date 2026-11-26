"""Purple Creator orchestration shell. Model, search and validators are injected adapters."""
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
    """A bounded stage runner. It intentionally does not fabricate a model backend."""
    def __init__(self, adapters: PipelineAdapters, max_repair_attempts: int = 1):
        self.adapters = adapters
        self.max_repair_attempts = max(0, min(max_repair_attempts, 3))

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
            findings = self.adapters.validator.validate(request, artifacts, route)
            result.artifacts = artifacts
            result.warnings.extend(findings or [])
            if findings:
                result.status = "needs_review"
                result.summary = "Artifacts generated, but validation findings remain."
                result.stages.append(StageRecord("validation", "needs_review", "; ".join(findings)))
            else:
                result.status = "completed"
                result.summary = "Artifacts passed the configured validation adapter."
                result.stages.append(StageRecord("validation", "passed", "No findings reported by adapter"))
        except Exception as exc:
            result.status = "failed"
            result.errors.append(f"{type(exc).__name__}: {exc}")
            result.summary = "Pipeline stopped safely at the failing stage."
            result.stages.append(StageRecord("pipeline", "failed", result.errors[-1]))
        return result
