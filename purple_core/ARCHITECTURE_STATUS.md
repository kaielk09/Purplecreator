# Architecture status

Implemented foundation:
- Request/result/artifact contracts (`contracts.py`)
- Deterministic task routing (`routing.py`)
- Adapter-injected orchestration shell (`pipeline.py`)
- Code generation/review scaffolding (`code_engine.py`)
- Mesh representation and OBJ output (`mesh3d.py`) plus operations
- Generation profiles and capability catalog

Not implemented yet:
- Purple-trained weights and inference runtime
- Model-driven planner/executor adapters
- Multi-source retrieval with permission-aware project context
- Compiler/runtime execution for generated code
- Production-grade 3D topology generation, materials, UVs and export formats
- Cancellation, streaming and persisted run telemetry

The pipeline currently accepts injected interfaces. This prevents fake/demo output from being misrepresented as inference from Purple's model.
