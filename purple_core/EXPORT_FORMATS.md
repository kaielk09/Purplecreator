# Export formats

The engine currently has an editable mesh structure and text-based OBJ export.
The scene builder converts the supported primitive scene schema into a merged mesh.

## Supported now
- OBJ: vertices and polygon faces
- JSON: format-neutral scene description

## Future
- normals and UV data
- MTL materials and texture references
- GLTF/GLB
- FBX (requires dedicated export implementation/dependency)
- rigging and animation

Export formats listed as future are not implemented. OBJ export has not yet been benchmarked with large meshes.
