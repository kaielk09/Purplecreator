"""Preflight checks for generated source; intentionally not a full compiler."""
from dataclasses import dataclass

@dataclass
class Finding:
    level: str
    message: str
    line: int | None = None

PAIRS = {"(": ")", "[": "]", "{": "}"}

def check_balanced_delimiters(source: str) -> list[Finding]:
    stack: list[tuple[str, int]] = []
    findings: list[Finding] = []
    quote: str | None = None
    escaped = False
    comment = False
    line = 1
    i = 0
    while i < len(source):
        ch = source[i]
        nxt = source[i + 1] if i + 1 < len(source) else ""
        if comment:
            if ch == "\n":
                comment = False
            else:
                i += 1
                continue
        elif quote:
            if escaped:
                escaped = False
            elif ch == chr(92):
                escaped = True
            elif ch == quote:
                quote = None
        else:
            if ch == "-" and nxt == "-":
                comment = True
                i += 1
            elif ch == "'" or ch == chr(34):
                quote = ch
            elif ch in PAIRS:
                stack.append((ch, line))
            elif ch in PAIRS.values():
                if not stack or PAIRS[stack[-1][0]] != ch:
                    findings.append(Finding("error", f"Unexpected closing delimiter {ch}", line))
                else:
                    stack.pop()
        if ch == "\n":
            line += 1
        i += 1
    for opening, opened_line in stack:
        findings.append(Finding("error", f"Unclosed delimiter {opening}", opened_line))
    if quote:
        findings.append(Finding("error", "Unclosed string literal", line))
    return findings

def review_generated_code(source: str) -> list[Finding]:
    findings = check_balanced_delimiters(source)
    for number, line in enumerate(source.splitlines(), 1):
        lower = line.strip().lower()
        if any(marker in lower for marker in ("todo", "your code here", "implement this")):
            findings.append(Finding("warning", "Placeholder marker found", number))
        if lower in {"pass", "-- todo", "-- implement"}:
            findings.append(Finding("warning", "Empty/unfinished marker", number))
    if not source.strip():
        findings.append(Finding("error", "Generated source is empty"))
    return findings