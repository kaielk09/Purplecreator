"""Safe project artifact path validation and in-memory packaging primitives."""
from dataclasses import dataclass
from pathlib import PurePosixPath

@dataclass(frozen=True)
class ArtifactEntry:
    path: str
    content: str
    media_type: str = "text/plain"

def validate_relative_path(path: str) -> str:
    if not isinstance(path, str) or not path.strip():
        raise ValueError("Artifact path must be a non-empty string")
    p = PurePosixPath(path.replace("\\", "/"))
    if p.is_absolute() or any(part in {"", ".", ".."} for part in p.parts):
        raise ValueError(f"Unsafe relative artifact path: {path}")
    if ":" in p.parts[0] or "\x00" in path:
        raise ValueError(f"Unsafe artifact path: {path}")
    return str(p)

def validate_entries(entries: list[ArtifactEntry]) -> list[str]:
    issues = []
    seen = set()
    for entry in entries:
        try:
            path = validate_relative_path(entry.path)
        except ValueError as exc:
            issues.append(str(exc))
            continue
        if path in seen:
            issues.append(f"Duplicate artifact path: {path}")
        seen.add(path)
        if not isinstance(entry.content, str):
            issues.append(f"Artifact content must be text: {path}")
    return issues
