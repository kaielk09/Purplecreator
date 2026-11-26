"""Deterministic context selection and provenance records."""
from dataclasses import dataclass
from typing import Iterable

@dataclass(frozen=True)
class ContextItem:
    text: str
    source: str
    relevance: float = 1.0
    trusted: bool = True

@dataclass(frozen=True)
class PackedContext:
    text: str
    included_sources: tuple[str, ...]
    dropped_sources: tuple[str, ...]
    estimated_chars: int

def pack_context(items: Iterable[ContextItem], max_chars: int = 24000) -> PackedContext:
    if max_chars < 0:
        raise ValueError("max_chars must be non-negative")
    ordered = sorted(items, key=lambda x: (-x.relevance, x.source))
    chosen, included, dropped, used = [], [], [], 0
    for item in ordered:
        if not item.text.strip():
            dropped.append(item.source)
            continue
        chunk = f"[SOURCE: {item.source}; TRUSTED: {item.trusted}]\n{item.text.strip()}\n"
        if used + len(chunk) <= max_chars:
            chosen.append(chunk)
            included.append(item.source)
            used += len(chunk)
        else:
            dropped.append(item.source)
    return PackedContext("\n".join(chosen), tuple(included), tuple(dropped), used)
