"""Structured task specifications to reduce ambiguity before code generation."""
from dataclasses import dataclass, field
from typing import Literal

@dataclass
class CodingSpec:
    task: str
    language: str = "Luau"
    target: str = "Roblox"
    context: str = ""
    requirements: list[str] = field(default_factory=list)
    constraints: list[str] = field(default_factory=list)
    expected_files: list[str] = field(default_factory=list)
    acceptance_checks: list[str] = field(default_factory=list)
    complexity: Literal["small", "medium", "large"] = "medium"

    def validate(self) -> None:
        if not self.task.strip():
            raise ValueError("Task description cannot be empty")
        if self.complexity not in {"small", "medium", "large"}:
            raise ValueError("Unknown complexity level")
        for collection_name in ("requirements", "constraints", "expected_files", "acceptance_checks"):
            collection = getattr(self, collection_name)
            if any(not isinstance(item, str) or not item.strip() for item in collection):
                raise ValueError(f"{collection_name} must contain non-empty strings")

    def to_prompt_context(self) -> str:
        self.validate()
        sections = [f"TASK: {self.task}", f"LANGUAGE: {self.language}", f"TARGET: {self.target}"]
        if self.context: sections.append("CONTEXT:\\n" + self.context)
        for label, values in (("REQUIREMENTS", self.requirements), ("CONSTRAINTS", self.constraints), ("FILES", self.expected_files), ("ACCEPTANCE CHECKS", self.acceptance_checks)):
            if values: sections.append(label + ":\\n- " + "\\n- ".join(values))
        sections.append("COMPLEXITY: " + self.complexity)
        return "\\n\\n".join(sections)
