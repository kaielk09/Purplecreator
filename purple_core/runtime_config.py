"""Runtime configuration; no artificial token/output-size caps."""
from dataclasses import dataclass
import os

@dataclass(frozen=True)
class RuntimeConfig:
    model_id: str = "purple-local"
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
        research = os.getenv("PURPLE_ENABLE_RESEARCH", "false").strip().lower() in {"1", "true", "yes"}
        return cls(
            model_id=os.getenv("PURPLE_MODEL_ID", "purple-local"),
            max_repair_attempts=bounded("PURPLE_REPAIR_ATTEMPTS", 2, 0, 5),
            request_timeout_seconds=min(timeout, 900.0),
            enable_research=research,
        )
