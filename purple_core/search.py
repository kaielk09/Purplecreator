"""Web-search adapter interface; provider implementation is added later."""
from dataclasses import dataclass
from typing import Protocol
@dataclass
class SearchResult:
    title: str
    url: str
    snippet: str = ""
class SearchProvider(Protocol):
    def search(self, query: str, limit: int = 5) -> list[SearchResult]: ...
class SearchNotConfigured(RuntimeError):
    pass
class PurpleSearch:
    def __init__(self, provider: SearchProvider | None = None):
        self.provider = provider
    def search(self, query: str, limit: int = 5) -> list[SearchResult]:
        if not query.strip():
            raise ValueError("Search query cannot be empty")
        if self.provider is None:
            raise SearchNotConfigured("Web search provider is not connected yet")
        return self.provider.search(query.strip(), max(1, min(limit, 20)))
