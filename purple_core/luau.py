"""Utilities for saving model-generated Luau code."""
from pathlib import PurePosixPath
from .file_builder import write_project_file
ALLOWED_SUFFIXES = {".lua", ".luau"}
def save_luau(project_root: str, relative_path: str, code: str):
    path = PurePosixPath(relative_path)
    if path.suffix.lower() not in ALLOWED_SUFFIXES:
        raise ValueError("Script path must end in .lua or .luau")
    return write_project_file(project_root, str(path), code)
