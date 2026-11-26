# Pre-training readiness roadmap

This phase intentionally builds non-training infrastructure first.

## Foundations added
- Request/result/artifact contracts
- Deterministic task routing and complexity profiles
- Adapter-injected pipeline shell
- Code generation and preflight review scaffolding
- Context packing with source provenance and relevance ordering
- Execution plan validation
- Artifact manifest and path checks
- Research adapter contract and source URL checks
- Runtime configuration with bounded environment values
- Editable mesh representation and OBJ output
- Mesh operations and primitive builders (box, UV sphere, cylinder, cone)
- Mesh diagnostics and bounding-box calculations
- Initial regression tests

## Integration work still needed before training
- Connect real Purple inference to planning/execution adapter interfaces
- Compiler and runtime validators (Luau analyzer and other language-specific tools) in isolated environments
- Cancellation, progress/stream events, structured logs and metrics
- CI test run and actual benchmark report
- Robust 3D topology generation, normals, UVs, materials and export formats

## Training remains a separate final milestone
Choose and freeze model architecture/tokenizer, curate and document training datasets, ensure license/provenance checks, build train/validation/test splits, establish reproducible configs and checkpoints, benchmark quality and evaluate safety. The scaffolding alone is not proof of training readiness.
