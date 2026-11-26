"""Safe local file creation helpers used by Purple Creator's future model runtime."""
from pathlib import Path
def write_project_file(project_root: str | Path, relative_path: str, content: str) -> Path:
    """Write inside project_root; reject traversal and absolute paths."""
    root = Path(project_root).resolve()
    rel = Path(relative_path)
    if rel.is_absolute() or ".." in rel.parts:
        raise ValueError("relative_path must be a safe relative path")
    destination = (root / rel).resolve()
    if destination != root and root not in destination.parents:
        raise ValueError("file path escapes project root")
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(content, encoding="utf-8")
    return destination
