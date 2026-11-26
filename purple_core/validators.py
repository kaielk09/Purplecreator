"""Shared preflight validation; not a compiler or sandbox runtime."""
from .contracts import CoreRequest, Artifact
from .artifact_pack import validate_artifact_manifest

def validate_request_coverage(request: CoreRequest, artifacts: list[Artifact]) -> list[str]:
    issues = validate_artifact_manifest(artifacts)
    paths = {a.path.replace(chr(92), "/") for a in artifacts}
    for expected in request.requested_outputs:
        if expected.replace(chr(92), "/") not in paths:
            issues.append("Requested output missing: " + expected)
    if not artifacts:
        issues.append("Executor returned no artifacts")
    for artifact in artifacts:
        if not artifact.content.strip():
            issues.append("Empty artifact: " + artifact.path)
    return issues

def check_text_artifact(artifact: Artifact) -> list[str]:
    problems = []
    if not artifact.content.strip():
        return ["Artifact is empty"]
    if "TODO" in artifact.content or "PLACEHOLDER" in artifact.content:
        problems.append("Placeholder marker found")
    if artifact.content.strip().startswith(chr(96) * 3):
        problems.append("Markdown code fence detected; normalize before saving")
    return problems
