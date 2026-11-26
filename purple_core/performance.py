"""Generation profiles and routing hints; targets are not measured guarantees."""
from dataclasses import dataclass
from typing import Literal
TaskSize = Literal["small", "medium", "large"]

@dataclass(frozen=True)
class GenerationProfile:
    name: str
    review_passes: int
    target_seconds: int
    allow_web_research: bool
    allow_multi_file_plan: bool

PROFILES = {
    "small": GenerationProfile("small", 1, 15, False, False),
    "medium": GenerationProfile("medium", 1, 60, False, True),
    "large": GenerationProfile("large", 2, 300, True, True),
}

def get_profile(size: TaskSize) -> GenerationProfile:
    return PROFILES[size]

def cache_key(model_version: str, prompt: str, context: str = "") -> str:
    import hashlib
    normalized = "\n".join(part.strip() for part in (model_version, prompt, context))
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()

def generation_strategy(size: TaskSize) -> list[str]:
    profile = get_profile(size)
    strategy = ["Use a suitable runtime path", "Avoid unnecessary planning for simple tasks", "Run a focused quality review"]
    if profile.allow_multi_file_plan:
        strategy.append("Plan file relationships before generation")
    if profile.allow_web_research:
        strategy.append("Research only when current facts or APIs are needed")
    if profile.review_passes > 1:
        strategy.append("Perform an additional review for large tasks")
    return strategy

if __name__ == "__main__":
    for size in ("small", "medium", "large"):
        print(size, get_profile(size), generation_strategy(size))
