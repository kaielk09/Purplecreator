"""Artifact manifest path validation."""
from dataclasses import dataclass
from pathlib import PurePosixPath
from .contracts import Artifact

@dataclass(frozen=True)
class ManifestEntry:
    path: str
    kind: str

def validate_artifact_manifest(artifacts: list[Artifact]) -> list[str]:
    issues = []
    seen = set()
    for artifact in artifacts:
        path = artifact.path.replace(chr(92), "/")
        pure = PurePosixPath(path)
        if pure.is_absolute() or not path or ".." in pure.parts:
            issues.append("Unsafe path: " + artifact.path)
        if path in seen:
            issues.append("Duplicate path: " + path)
        seen.add(path)
        if not artifact.kind.strip():
            issues.append("Missing kind: " + path)
        if not isinstance(artifact.content, str):
            issues.append("Content must be text: " + path)
    return issues

def build_manifest(artifacts: list[Artifact]) -> list[ManifestEntry]:
    problems = validate_artifact_manifest(artifacts)
    if problems:
        raise ValueError("; ".join(problems))
    return [ManifestEntry(a.path.replace(chr(92), "/"), a.kind) for a in artifacts]
