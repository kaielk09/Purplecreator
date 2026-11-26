# Pre-training readiness roadmap

## Built foundations
- Request/result/artifact contracts and task routing
- Provider-neutral generation/review scaffolding
- Adapter-driven pipeline with optional bounded repair
- Context packer and source provenance
- Plan validation and artifact manifest checks
- Tool allow-list registry
- Research adapter contract and source checks
- Runtime config without artificial token/output limits
- Editable mesh/OBJ data, primitive generators, transforms and scene merging
- Mesh quality checks and bounding boxes
- Starter tests for key utilities

## Integration and engineering tasks still before training
- Connect Purple inference runtime to planner/executor adapters
- Add language-specific compiler/runtime checks in an isolated environment
- Add streaming/progress and cooperative cancellation
- Integrate research provider and retrieval with source provenance and permissions
- Run regression tests in CI and publish actual measured results
- Complete 3D topology/material/UV/normal and export pipeline
- Benchmark actual quality and latency, rather than relying on target estimates

## Training is still last
Freeze model/tokenizer design, curate data with licensing/provenance, create train/validation/test splits, make training reproducible, evaluate model quality and safety, and only then train.
