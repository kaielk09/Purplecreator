# Purple Creator procedural 3D quality goals

The 3D core is intended to move beyond text-only descriptions:

- Real editable vertex and face mesh data
- Mesh validation before export
- Wavefront OBJ export
- Deterministic primitive creation and geometry transforms
- Merge multiple validated meshes into one asset
- Future: subdivision/remeshing, UVs, materials, normals, rigging, animation, topology checks, Roblox-specific conversion

## Current implemented foundation
`mesh3d.py` provides mesh data, validation and OBJ export; `mesh_ops.py` supports translation, scaling, and mesh merging. This is a geometry toolkit, not yet a neural 3D generator: the AI model and asset-generation planner still need to learn to create complex geometry from natural-language prompts.
