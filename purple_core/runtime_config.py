"""Runtime config defaults; secrets are never logged."""
from dataclasses import dataclass
import os

@dataclass(frozen=True)
class RuntimeConfig:
    model_id: str = "purple-local"
    max_context_chars: int = 24000
    max_output_tokens: int = 4000
    max_repair_attempts: int = 2
    request_timeout_seconds: float = 120.0
    enable_research: bool = False

    @classmethod
    def from_env(cls):
        def bounded(name, default, low, high):
            try:
                value = int(os.getenv(name, str(default)))
            except ValueError:
                value = default
            return max(low, min(high, value))
        try:
            timeout = float(os.getenv("PURPLE_TIMEOUT", "120"))
        except ValueError:
            timeout = 120.0
        if timeout <= 0:
            timeout = 120.0
        research = os.getenv("PURPLE_ENABLE_RESEARCH", "false").lower() in {"1", "true", "yes"}
        return cls(
            model_id=os.getenv("PURPLE_MODEL_ID", "purple-local"),
            max_context_chars=bounded("PURPLE_CONTEXT_CHARS", 24000, 1000, 200000),
            max_output_tokens=bounded("PURPLE_MAX_OUTPUT_TOKENS", 4000, 64, 32000),
            max_repair_attempts=bounded("PURPLE_REPAIR_ATTEMPTS", 2, 0, 5),
            request_timeout_seconds=min(timeout, 900.0),
            enable_research=research,
        )
