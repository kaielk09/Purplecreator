# Purple Creator — Core Architecture Blueprint

Purple Creator is a model-first engine. The web app, Roblox Studio integration and desktop UI are future clients; they must never contain the model logic.

## Request path
1. **Ingress** — normalize a task, reject blank/oversized input, attach caller metadata.
2. **Router** — classify code, 3D geometry, research, project organization, or mixed work.
3. **Context** — gather only relevant files, user constraints, version targets and source notes.
4. **Planner** — produce an explicit plan and output manifest; large tasks are split into bounded steps.
5. **Executor** — provider-neutral model adapters perform generation. This repo currently supplies interfaces/scaffolding, not trained weights.
6. **Validation** — schema, completeness, static checks and optional external compiler/runtime tests.
7. **Repair loop** — pass concrete findings back to the model, with a bounded retry count.
8. **Packaging** — validate paths, assemble files/artifacts and produce a result manifest.
9. **Telemetry** — record timings, tokens, stage status and errors without logging secrets or private source contents.

## Core modules
- `contracts.py`: stable request/result contracts.
- `routing.py`: intent classification and task profile selection.
- `context.py` (future): context budget, file relevance and source provenance.
- `planning.py` (future): plan and manifest generation.
- `pipeline.py`: orchestration, bounded retry, cancellation hooks.
- `code_engine.py`: code prompt/generate/review path.
- `model3d.py`, `mesh3d.py`, `mesh_ops.py`, `primitives.py` (future): scene and mesh tools.
- `search.py`: optional search provider interface.
- `file_builder.py`: sandboxed output file writer.

## Adapter boundaries
The core does not depend on a particular hosted inference service, UI, Roblox Studio, or search vendor. Runtime adapters are injected. The future local model adapter must implement the same contract.

## Quality gates
- Requests and plans must validate before generation.
- Outputs must match the requested artifact types and declared paths.
- No silent TODO/pseudocode output for production generation.
- Retry only on actionable validation findings, and cap retries.
- Static checks are not equivalent to compiler/runtime validation; status must say so.
- File writes are sandboxed and path traversal is rejected.

## Status (honest)
This blueprint and orchestration are implemented as scaffolding. A trained Purple model, real inference adapter, strong compiler integration, search provider and robust 3D synthesis model are still separate milestones.
