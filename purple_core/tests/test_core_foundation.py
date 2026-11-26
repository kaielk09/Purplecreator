"""Regression tests for the core foundation helpers."""
import unittest
from purple_core.contracts import CoreRequest, Artifact
from purple_core.routing import route_request
from purple_core.artifact_pack import validate_artifact_manifest
from purple_core.primitives import make_uv_sphere, make_cylinder, make_cone
from purple_core.mesh_quality import bounds\nfrom purple_core.model3d import Scene, Primitive\nfrom purple_core.scene_builder import scene_to_mesh

class CoreFoundationTests(unittest.TestCase):
    def test_request_routes_code(self):
        req = CoreRequest(prompt="Generate a Luau script", task_kind="code", complexity="small")
        req.validate()
        self.assertEqual(route_request(req).kind, "code")

    def test_unsafe_artifact_path_detected(self):
        findings = validate_artifact_manifest([Artifact("../escape.txt", "text", "payload")])
        self.assertTrue(any("Unsafe" in item for item in findings))

    def test_scene_builds_combined_mesh(self):
        scene = Scene("test_scene", [
            Primitive("base", "cube", position=(0, 0, 0), scale=(2, 1, 2)),
            Primitive("top", "cone", position=(0, 1.5, 0), scale=(1, 1, 1)),
        ])
        mesh = scene_to_mesh(scene)
        self.assertEqual(mesh.validate(), [])
        self.assertGreater(len(mesh.faces), 0)

    def test_primitive_meshes_have_vertices_and_faces(self):
        for mesh in (make_uv_sphere(), make_cylinder(), make_cone()):
            self.assertEqual(mesh.validate(), [])
            self.assertGreater(len(mesh.vertices), 0)
            self.assertGreater(len(mesh.faces), 0)
            low, high = bounds(mesh)
            self.assertTrue(all(low[i] <= high[i] for i in range(3)))

if __name__ == "__main__":
    unittest.main()
