# Purple Creator — model-first AI core

Purple Creator is being developed as a **model and engine first**. A website, desktop app, and Roblox Studio connector are later clients; core logic belongs in this package.

## Current repository scope

- Request contracts and deterministic task routing
- Model-adapter orchestration scaffold
- Code generation and lightweight preflight review scaffold
- Context packing with source provenance
- Plan validation and artifact manifest checks
- Research adapter contract (no provider credentials or provider implementation included)
- Procedural editable 3D meshes: box, UV sphere, cylinder, cone
- Mesh transformations, validation diagnostics, and OBJ export
- Runtime configuration and starter regression tests

## Structure

`purple_core/` — core model-independent logic and interfaces.

## Important status note

This repository is **not yet a trained Purple Creator model**. Real inference adapters, compiler/runtime validation, advanced 3D generation, integrated research providers, and training are future milestones. Scaffold code is not proof of model quality or runtime performance.

## Milestones

See:
- `purple_core/architecture.md` — architecture blueprint
- `purple_core/ARCHITECTURE_STATUS.md` — implementation status
- `purple_core/ROADMAP_PRETRAINING.md` — readiness gates before training

Purple Creator — evolving toward a model-first creation engine.
