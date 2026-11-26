"""User-facing generation services backed by inference and procedural geometry."""
from __future__ import annotations

import re
from pathlib import Path

from .artifact_io import validate_relative_path
from .file_builder import write_project_file
from .inference import HuggingFaceRuntime, InferenceSettings
from .mesh3d import Mesh
from .model3d import Primitive, Scene
from .scene_builder import scene_to_mesh


def _safe_stem(text: str, fallback: str = "purple_output") -> str:
    stem = re.sub(r"[^a-zA-Z0-9_-]+", "_", text.strip()).strip("_")
    return (stem[:48] or fallback)


def create_runtime(
    model_id: str = "Qwen/Qwen2.5-0.5B-Instruct",
    load_in_4bit: bool = True,
) -> HuggingFaceRuntime:
    return HuggingFaceRuntime(
        InferenceSettings(model_id=model_id, load_in_4bit=load_in_4bit)
    )


def generate_text(
    prompt: str,
    *,
    runtime: HuggingFaceRuntime | None = None,
    language: str = "Luau",
    target: str = "Roblox",
    task: str = "code",
) -> str:
    engine = runtime or create_runtime()
    instruction = (
        f"Task type: {task}\nTarget language: {language}\nTarget platform: {target}\n"
        "Generate the requested result. If code is requested, return complete "
        "source code and do not omit required functions.\n\n"
        f"User request:\n{prompt}"
    )
    return engine.generate(instruction)


def generate_code_file(
    prompt: str,
    output_dir: str | Path,
    *,
    language: str = "Luau",
    target: str = "Roblox",
    filename: str | None = None,
    runtime: HuggingFaceRuntime | None = None,
) -> Path:
    extensions = {
        "luau": ".luau",
        "lua": ".lua",
        "python": ".py",
        "javascript": ".js",
        "typescript": ".ts",
        "csharp": ".cs",
        "java": ".java",
    }
    extension = extensions.get(language.lower(), ".txt")
    name = filename or ("main" + extension)
    safe_path = validate_relative_path(name)
    code = generate_text(
        prompt,
        runtime=runtime,
        language=language,
        target=target,
        task="code generation",
    )
    return write_project_file(output_dir, safe_path, code)


def build_3d_scene_from_prompt(prompt: str) -> Scene:
    """Create editable deterministic geometry for common natural-language requests.

    This is procedural geometry, not neural 3D generation. The returned mesh
    is real geometry and can be exported to OBJ.
    """
    text = prompt.lower()
    name = _safe_stem(prompt[:48], "PurpleScene")
    parts: list[Primitive] = []

    if any(word in text for word in ("dom", "house", "chatka")):
        parts.extend([
            Primitive("House_Body", "cube", (0, 1, 0), (0, 0, 0), (4, 2, 3), "wall"),
            Primitive("House_Roof", "cone", (0, 2.8, 0), (0, 45, 0), (3.2, 2, 3.2), "roof"),
            Primitive("House_Door", "cube", (0, 0.65, 1.56), (0, 0, 0), (0.8, 1.3, 0.12), "door"),
            Primitive("House_Window_Left", "cube", (-1.25, 1.15, 1.56), (0, 0, 0), (0.65, 0.6, 0.12), "glass"),
            Primitive("House_Window_Right", "cube", (1.25, 1.15, 1.56), (0, 0, 0), (0.65, 0.6, 0.12), "glass"),
        ])
    elif any(word in text for word in ("drzew", "tree")):
        parts.extend([
            Primitive("Tree_Trunk", "cylinder", (0, 1, 0), (0, 0, 0), (0.45, 2, 0.45), "wood"),
            Primitive("Tree_Crown", "sphere", (0, 2.8, 0), (0, 0, 0), (2, 2, 2), "leaves"),
        ])
    elif any(word in text for word in ("wież", "tower")):
        parts.extend([
            Primitive("Tower_Base", "cube", (0, 1, 0), (0, 0, 0), (2, 2, 2), "stone"),
            Primitive("Tower_Shaft", "cylinder", (0, 3.2, 0), (0, 0, 0), (1.2, 3, 1.2), "stone"),
            Primitive("Tower_Top", "cone", (0, 5.2, 0), (0, 0, 0), (1.6, 1.5, 1.6), "roof"),
        ])
    elif any(word in text for word in ("kula", "sphere")):
        parts.append(Primitive("Sphere", "sphere"))
    elif any(word in text for word in ("walec", "cylinder")):
        parts.append(Primitive("Cylinder", "cylinder"))
    elif any(word in text for word in ("stoż", "cone")):
        parts.append(Primitive("Cone", "cone"))
    else:
        parts.append(Primitive("Generated_Cube", "cube"))

    return Scene(name=name, primitives=parts)


def generate_3d_files(
    prompt: str,
    output_dir: str | Path,
) -> tuple[Path, Path, Mesh]:
    scene = build_3d_scene_from_prompt(prompt)
    mesh = scene_to_mesh(scene)
    root = Path(output_dir)
    root.mkdir(parents=True, exist_ok=True)
    stem = _safe_stem(scene.name, "purple_scene")
    obj_path = root / f"{stem}.obj"
    json_path = root / f"{stem}.scene.json"
    obj_path.write_text(mesh.to_obj(), encoding="utf-8")
    json_path.write_text(scene.to_json(), encoding="utf-8")
    return obj_path, json_path, mesh
