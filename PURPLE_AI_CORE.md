# Purple Creator AI Core (early scaffold)

This repository is currently building the **model/core only**. No chat interface, website, or Roblox Studio plugin is part of this phase.

## Target capabilities
- Web search through a pluggable search provider
- Luau / Lua script and module generation
- Create files in a project workspace
- Produce procedural 3D scene descriptions that can later be converted into Roblox/Blender-compatible assets
- Later: analyze a project and organize folders/assets with explicit preview/approval

## Current reality
This commit adds reusable capability contracts and small utilities. It is **not a trained AI model yet** and does not autonomously generate high-quality scripts or 3D assets by itself. A model runtime, training/fine-tuning setup, tool-calling loop, and 3D export adapters still need to be built.

## Safety in file operations
File writes are confined to the selected workspace. Project organization should be previewed and approved before moving or overwriting existing project assets.

## Quick smoke test
Run from the repository root:

```python
from purple_core.model3d import Scene, Primitive
scene = Scene("Demo", [Primitive("Block", shape="cube")])
scene.validate()
print(scene.to_json())
```
