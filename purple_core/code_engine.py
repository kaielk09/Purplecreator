"""Provider-agnostic code generation scaffold. No arbitrary token ceiling."""
from dataclasses import dataclass, field
from typing import Protocol
from .coding_spec import CodingSpec
from .code_review import Finding, review_generated_code

class CodeModel(Protocol):
    def generate(self, prompt: str, *, temperature: float = 0.15) -> str: ...

@dataclass
class CodePlan:
    summary: str
    files: list[str]
    dependencies: list[str] = field(default_factory=list)
    risk_notes: list[str] = field(default_factory=list)
    tests: list[str] = field(default_factory=list)

@dataclass
class CodeOutput:
    code: str
    plan: CodePlan
    findings: list[Finding]
    status: str
    attempts: int

def build_quality_prompt(spec: CodingSpec, plan: CodePlan | None = None) -> str:
    spec.validate()
    planning = ""
    if plan:
        planning = "\nPLAN:\n- " + "\n- ".join([plan.summary, *plan.files, *plan.dependencies, *plan.tests, *plan.risk_notes])
    return f"""You are Purple Creator's code-generation engine.
Produce robust, maintainable, complete code that follows the task specification.
Correctness is more important than verbosity. Never invent APIs or requirements.
Respect existing project conventions and avoid unrelated changes.
Use the right architecture, clear names, input validation, error handling,
and security boundaries appropriate for the language and environment.
No placeholders, TODOs, pseudocode, ellipses, or omitted functions.
If critical details are missing, explicitly list the questions instead of guessing.
Return code only when the specification is sufficiently clear.

SPEC:
{spec.to_prompt_context()}
{planning}
Before final output, internally verify: every requirement is covered, API names are
valid for the target version, edge cases are considered, dependencies are included,
and the result is complete and consistent."""

def generate_and_review(model: CodeModel, spec: CodingSpec, plan: CodePlan, max_attempts: int = 2) -> CodeOutput:
    prompt = build_quality_prompt(spec, plan)
    code = ""
    findings: list[Finding] = []
    attempts = 0
    for attempts in range(1, max(1, max_attempts) + 1):
        code = model.generate(prompt, temperature=0.15)
        findings = review_generated_code(code)
        hard_errors = [f for f in findings if f.level == "error"]
        warnings = [f for f in findings if f.level == "warning"]
        if not hard_errors and not warnings:
            return CodeOutput(code, plan, findings, "preflight_passed", attempts)
        prompt += "\n\nREVIEW FINDINGS FROM PRIOR OUTPUT:\n" + "\n".join(
            f"- {f.level}: line {f.line}: {f.message}" for f in findings
        ) + "\nRegenerate a complete corrected result; do not merely silence the checks."
    return CodeOutput(code, plan, findings, "needs_external_validation", attempts)
