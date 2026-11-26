"""Bridge contracts that connect the real model runtime to engine adapters."""
from dataclasses import dataclass
from typing import Protocol
from .model_runtime import RuntimeInfo
from .task_planner import TaskPlan

class TextRuntime(Protocol):
    def generate(self, prompt: str, *, temperature: float = 0.2) -> str: ...
    def info(self) -> RuntimeInfo: ...

@dataclass(frozen=True)
class PlannedPrompt:
    task: str
    context: str
    plan: TaskPlan | None = None

def build_runtime_prompt(request: PlannedPrompt) -> str:
    if not request.task.strip():
        raise ValueError("Task must not be empty")
    plan_text = ""
    if request.plan:
        request.plan.validate()
        plan_text = "\nExecution plan:\n" + "\n".join(
            f"{i+1}. {step.description} (id={step.id})" for i, step in enumerate(request.plan.ordered_steps())
        )
    return (
        "You are Purple Creator, a careful software and project creation engine. "
        "Solve the task completely, verify internal consistency, and provide full outputs. "
        "Do not claim to have executed or tested code unless a tool actually did so.\n\n"
        "TASK:\n" + request.task + "\n\nCONTEXT:\n" + request.context + plan_text
    )

def generate_text(runtime: TextRuntime, request: PlannedPrompt) -> str:
    prompt = build_runtime_prompt(request)
    output = runtime.generate(prompt, temperature=0.2)
    if not isinstance(output, str) or not output.strip():
        raise RuntimeError("Runtime returned empty text")
    return output
