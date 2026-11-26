"""Offline smoke tests: no model download and no training required."""
import tempfile
import unittest
from pathlib import Path

from purple_core.generator import build_3d_scene_from_prompt, generate_3d_files
from purple_core.scene_builder import scene_to_mesh


class ProceduralGenerationTests(unittest.TestCase):
    def test_house_prompt_builds_multiple_parts(self):
        scene = build_3d_scene_from_prompt("Stwórz dom z drzwiami i oknami")
        self.assertGreaterEqual(len(scene.primitives), 4)
        mesh = scene_to_mesh(scene)
        self.assertEqual(mesh.validate(), [])
        self.assertGreater(len(mesh.vertices), 8)
        self.assertGreater(len(mesh.faces), 6)

    def test_tree_prompt_builds_geometry(self):
        scene = build_3d_scene_from_prompt("Wygeneruj drzewo")
        mesh = scene_to_mesh(scene)
        self.assertEqual(mesh.validate(), [])

    def test_obj_and_scene_json_are_written(self):
        with tempfile.TemporaryDirectory() as temp:
            obj_path, scene_path, mesh = generate_3d_files(
                "Zbuduj wieżę",
                temp,
            )
            self.assertTrue(obj_path.exists())
            self.assertTrue(scene_path.exists())
            self.assertIn("\\no ", obj_path.read_text(encoding="utf-8"))
            self.assertIn('"primitives"', scene_path.read_text(encoding="utf-8"))
            self.assertEqual(mesh.validate(), [])


if __name__ == "__main__":
    unittest.main()
