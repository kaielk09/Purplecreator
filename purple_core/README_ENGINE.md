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
