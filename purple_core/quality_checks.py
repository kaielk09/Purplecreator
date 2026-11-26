"""Small language-aware preflight checks; not substitutes for full compilers."""
from dataclasses import dataclass
import ast
import re

@dataclass(frozen=True)
class QualityIssue:
    level: str
    code: str
    message: str
    line: int | None = None

def check_python(source: str) -> list[QualityIssue]:
    issues = []
    try:
        ast.parse(source)
    except SyntaxError as exc:
        issues.append(QualityIssue("error", "PY_SYNTAX", exc.msg, exc.lineno))
        return issues
    for i, line in enumerate(source.splitlines(), start=1):
        if re.search(r"\b(pass|TODO|NotImplemented)\b", line):
            issues.append(QualityIssue("warning", "INCOMPLETE_MARKER", "Possible unfinished code marker", i))
    return issues

def check_generic(source: str) -> list[QualityIssue]:
    issues = []
    if not source.strip():
        return [QualityIssue("error", "EMPTY_OUTPUT", "Generated output is empty")]
    if source.count("{") != source.count("}"):
        issues.append(QualityIssue("warning", "BRACE_COUNT", "Brace counts differ"))
    if source.count("(") != source.count(")"):
        issues.append(QualityIssue("warning", "PAREN_COUNT", "Parenthesis counts differ"))
    if source.count("[") != source.count("]"):
        issues.append(QualityIssue("warning", "BRACKET_COUNT", "Bracket counts differ"))
    return issues
