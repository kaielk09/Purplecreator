"""Command line entry point for testing Purple Creator without training."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from .generator import (
    build_3d_scene_from_prompt,
    create_runtime,
    generate_3d_files,
    generate_code_file,
    generate_text,
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="purple",
        description="Purple Creator local inference and procedural 3D engine",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("status", help="Show runtime and dependency status")

    text_cmd = sub.add_parser("ask", help="Generate a text response using a pretrained model")
    text_cmd.add_argument("prompt")
    text_cmd.add_argument("--model", default="Qwen/Qwen2.5-0.5B-Instruct")
    text_cmd.add_argument("--full-precision", action="store_true")

    code_cmd = sub.add_parser("code", help="Generate a source file")
    code_cmd.add_argument("prompt")
    code_cmd.add_argument("--language", default="Luau")
    code_cmd.add_argument("--target", default="Roblox")
    code_cmd.add_argument("--output", default="purple_output")
    code_cmd.add_argument("--file", default=None)
    code_cmd.add_argument("--model", default="Qwen/Qwen2.5-0.5B-Instruct")

    mesh_cmd = sub.add_parser("3d", help="Generate an OBJ mesh and scene JSON")
    mesh_cmd.add_argument("prompt")
    mesh_cmd.add_argument("--output", default="purple_output")

    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)

    if args.command == "status":
        try:
            import torch
            gpu = torch.cuda.get_device_name(0) if torch.cuda.is_available() else "not available (CPU mode)"
            print("PyTorch: installed")
            print("GPU:", gpu)
        except ImportError:
            print("PyTorch: missing")
        try:
            import transformers
            print("Transformers:", transformers.__version__)
        except ImportError:
            print("Transformers: missing")
        print("Training: not required")
        print("Model weights: downloaded lazily on first ask/code request")
        return 0

    if args.command == "3d":
        obj_path, scene_path, mesh = generate_3d_files(args.prompt, args.output)
        print("3D generation completed.")
        print("OBJ:", obj_path)
        print("Scene:", scene_path)
        print("Vertices:", len(mesh.vertices))
        print("Faces:", len(mesh.faces))
        print("Note: procedural primitive-based geometry, not neural 3D generation.")
        return 0

    if args.command == "ask":
        runtime = create_runtime(
            model_id=args.model,
            load_in_4bit=not args.full_precision,
        )
        print(generate_text(args.prompt, runtime=runtime, task="general"))
        return 0

    if args.command == "code":
        runtime = create_runtime(model_id=args.model)
        path = generate_code_file(
            args.prompt,
            args.output,
            language=args.language,
            target=args.target,
            filename=args.file,
            runtime=runtime,
        )
        print("Generated file:", path)
        return 0

    return 2


if __name__ == "__main__":
    raise SystemExit(main())
