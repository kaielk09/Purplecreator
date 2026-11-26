# Purple Creator engine

This package is the model-first core. It does not contain a website or user interface.

## Engine building blocks
- Contracts, routing and adapter-driven orchestration
- Task dependency planner with cycle detection and critical-path estimate
- Code-generation prompt scaffold and lightweight review loop
- Generic and Python syntax preflight checks
- Project dependency graph and output manifest validation
- Explicit tool allow-list registry
- Context relevance packing with source provenance
- Research-provider contract (provider not supplied)
- Runtime contract and component health summaries
- Procedural editable 3D meshes, primitive generators, transforms and scene merging
- OBJ mesh export and JSON scene representation

## Status honesty
These are reusable foundations and deterministic utilities. No Purple model weights, training, or real inference backend is included. Code quality checks are lightweight; they do not prove correctness. The research adapter does not perform online search. OBJ exports do not include UVs, normals or materials.

## Development priorities before training
1. Implement and integrate a real Purple model runtime.
2. Connect runtime to planner/executor adapters.
3. Add language compiler/runtime validation in isolated test runners.
4. Implement permission-aware retrieval and real research provider.
5. Add progress/cancellation and durable artifact output.
6. Improve 3D mesh topology, normals, UVs, material support and export.
7. Run tests/CI and establish measured benchmarks.
8. Training and evaluation remain the final phase.


## Run before training

The repository now includes a real pretrained inference path and a command-line entry point:
- `python -m purple_core status`
- `python -m purple_core ask "Explain a Python function"`
- `python -m purple_core code "Create a Roblox points module" --language Luau --output ./generated`
- `python -m purple_core 3d "Create a house with windows" --output ./generated3d`

Install optional inference dependencies with `pip install -r requirements-inference.txt`.
The first `ask` or `code` command downloads the configured pretrained base model. This does not train Purple AI and does not use Purple-specific weights. The 3D command creates deterministic editable OBJ geometry from built-in primitive patterns and does not need model weights. See [TEST_NOW.md](../TEST_NOW.md) for setup and offline tests.
