# Architecture status

## Foundation implemented
- Request/result/artifact contracts and deterministic task routing
- Provider-neutral code generation interface and preflight review scaffold
- Adapter-injected pipeline with bounded optional repair loop
- Context packing with relevance ordering and source provenance
- Plan validation and safe artifact-manifest checks
- Allow-listed tool registry
- Research adapter contract and source URL checks
- Runtime configuration without artificial token or output-size caps
- Generation profiles with planning targets (not benchmark guarantees)
- Editable mesh data, OBJ serialization, and basic mesh operations
- Primitive mesh builders: box, sphere, cylinder, cone
- Rotation, scaling, translation, mesh merging and scene-to-mesh conversion
- Mesh quality diagnostics and bounds
- Starter regression tests for routing, manifests, primitive meshes and scene composition

## Still not implemented
- Purple model weights, training or real inference adapter
- Model-driven planner and executor implementations
- Live research provider and permission-aware retrieval
- Language compiler/runtime integrations in isolated environments
- Robust progress streaming, cancellation and persisted telemetry
- UV coordinates, normals, materials, texture mapping, rigging, animation and advanced formats
- CI execution and published test/benchmark results

## Truthful runtime status
Current files are architecture and deterministic geometry utilities. The repo does not yet contain a trained model that can reason or generate artifacts by itself. Interfaces must be connected to real model inference before any AI capability is claimed.
