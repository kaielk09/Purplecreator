"""Generation prompt contracts and preflight review pipeline for Luau outputs."""
from dataclasses import dataclass
from .coding_spec import CodingSpec
from .code_review import Finding, review_generated_code

@dataclass
class GenerationResult:
    code: str
    findings: list[Finding]
    passed_preflight: bool


def build_luau_generation_instructions(spec: CodingSpec) -> str:
    context = spec.to_prompt_context()
    return f"""You are Purple Creator, a careful Roblox Luau code generator.
Generate complete, production-minded Luau code matching the specification below.

Do not invent APIs, objects, services, properties, or assumptions. If a critical
requirement is ambiguous, ask for clarification instead of silently guessing.
Do not return pseudo-code, unfinished TODOs, placeholders, or omitted sections.
Use clear names, small functions, robust input checks, and comments only where useful.
For Roblox, choose the correct Script/LocalScript/ModuleScript execution context,
use server authority for game-critical state, and avoid trusting client input.
Return code only, with no markdown fences or surrounding explanation.

SPECIFICATION:
{context}

Before responding, silently verify requirements, API correctness, execution context,
edge cases, and that every requested file/module is complete."""


def preflight_generated_luau(code: str) -> GenerationResult:
    findings = review_generated_code(code)
    return GenerationResult(code=code, findings=findings, passed_preflight=not any(f.level == "error" for f in findings))
