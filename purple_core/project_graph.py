"""Project dependency graph helpers for multi-file generation and review."""
from dataclasses import dataclass

@dataclass(frozen=True)
class ProjectFile:
    path: str
    role: str = "source"
    imports: tuple[str, ...] = ()

@dataclass
class ProjectGraph:
    files: list[ProjectFile]

    def validate(self) -> list[str]:
        issues = []
        paths = [f.path for f in self.files]
        if len(paths) != len(set(paths)):
            issues.append("Duplicate project paths")
        known = set(paths)
        for file in self.files:
            if not file.path or file.path.startswith("/") or ".." in file.path.split("/"):
                issues.append(f"Unsafe project path: {file.path}")
            for imp in file.imports:
                if imp.startswith(".") and imp not in known:
                    issues.append(f"Unresolved local import {imp} in {file.path}")
        return issues

    def dependency_order(self) -> list[str]:
        if self.validate():
            raise ValueError("; ".join(self.validate()))
        pending = {f.path: set(f.imports) for f in self.files}
        order = []
        while pending:
            ready = sorted(path for path, deps in pending.items() if not (deps & pending.keys()))
            if not ready:
                # Cyclic imports are allowed in some languages; report stable order.
                return order + sorted(pending)
            order.extend(ready)
            for path in ready:
                pending.pop(path)
        return order

    def files_by_role(self, role: str) -> list[str]:
        return [f.path for f in self.files if f.role == role]
