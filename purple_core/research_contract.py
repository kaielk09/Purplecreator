"""Research adapter contract; no provider is bundled or implied."""
from dataclasses import dataclass
from typing import Protocol

@dataclass(frozen=True)
class ResearchSource:
    title: str
    url: str
    snippet: str = ""
    published: str = ""
    provider: str = ""

class ResearchAdapter(Protocol):
    def search(self, query: str, limit: int = 5) -> list[ResearchSource]: ...

def validate_sources(sources: list[ResearchSource]) -> list[str]:
    issues = []
    seen = set()
    for source in sources:
        if not source.title.strip():
            issues.append("Source title is blank")
        if not source.url.startswith(("https://", "http://")):
            issues.append(f"Invalid source URL: {source.url}")
        if source.url in seen:
            issues.append(f"Duplicate source URL: {source.url}")
        seen.add(source.url)
    return issues
