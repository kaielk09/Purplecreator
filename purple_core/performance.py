"""Performance targets and generation profiles for Purple Creator's future runtime.
These are policy defaults, not measured speed guarantees or a running model.
"""
from dataclasses import dataclass
from typing import Literal

TaskSize = Literal["small", "medium", "large"]

@dataclass(frozen=True)
class GenerationProfile:
    name: str
    max_new_tokens: int
    review_passes: int
    target_seconds: int
    allow_web_research: bool
    allow_multi_file_plan: bool

PROFILES = {
    "small": GenerationProfile("small", 900, 1, 15, False, False),
    "medium": GenerationProfile("medium", 2400, 1, 60, False, True),
    "large": GenerationProfile("large", 6000, 2, 300, True, True),
}

def get_profile(size: TaskSize) -> GenerationProfile:
    """Return a speed/quality profile. Callers may override values per task."""
    return PROFILES[size]

def cache_key(model_version: str, prompt: str, context: str = "") -> str:
    """Stable cache key for exact repeat requests (no external state is accessed)."""
    import hashlib
    normalized = "\\n".join(part.strip() for part in (model_version, prompt, context))
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()

def generation_strategy(size: TaskSize) -> list[str]:
    profile = get_profile(size)
    strategy = ["Use the smallest suitable model/runtime path", "Avoid unnecessary planning for simple tasks", "Run one focused quality review"]
    if profile.allow_multi_file_plan:
        strategy.append("Plan file relationships before generation")
    if profile.allow_web_research:
        strategy.append("Search only when facts or APIs may be outdated or missing")
    if profile.review_passes > 1:
        strategy.append("Use a second review pass for large tasks")
    return strategy

if __name__ == "__main__":
    for size in ("small", "medium", "large"):
        print(size, get_profile(size), generation_strategy(size))