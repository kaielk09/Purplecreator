import unittest
from purple_core.task_planner import TaskPlan, PlanStep
from purple_core.project_graph import ProjectGraph, ProjectFile
from purple_core.quality_checks import check_python, check_generic
from purple_core.artifact_io import ArtifactEntry, validate_entries, validate_relative_path
from purple_core.model3d import Scene, Primitive
from purple_core.scene_builder import scene_to_mesh

class EngineAdditionsTests(unittest.TestCase):
    def test_dependency_plan_orders_steps(self):
        plan = TaskPlan("build", [
            PlanStep("compile", "Compile", ("prepare",)),
            PlanStep("prepare", "Prepare"),
        ])
        plan.validate()
        self.assertEqual([s.id for s in plan.ordered_steps()], ["prepare", "compile"])
        self.assertEqual(plan.critical_path_length(), 2)

    def test_plan_cycle_rejected(self):
        plan = TaskPlan("cycle", [
            PlanStep("a", "A", ("b",)),
            PlanStep("b", "B", ("a",)),
        ])
        with self.assertRaises(ValueError):
            plan.validate()

    def test_project_graph_order(self):
        graph = ProjectGraph([
            ProjectFile("main.py", imports=("lib.py",)),
            ProjectFile("lib.py"),
        ])
        self.assertEqual(graph.dependency_order(), ["lib.py", "main.py"])

    def test_python_syntax_checker(self):
        self.assertEqual(check_python("x = 2\n"), [])
        self.assertEqual(check_python("def broken(:\\n")[0].code, "PY_SYNTAX")

    def test_generic_bracket_check(self):
        issues = check_generic("if (x {")
        self.assertTrue(issues)

    def test_artifact_paths(self):
        self.assertEqual(validate_relative_path("src/main.py"), "src/main.py")
        with self.assertRaises(ValueError):
            validate_relative_path("../outside.txt")
        self.assertTrue(validate_entries([ArtifactEntry("same.txt", "a"), ArtifactEntry("same.txt", "b")]))

    def test_scene_mesh_export_schema(self):
        scene = Scene("demo", [Primitive("cube"), Primitive("roof", "cone", position=(0, 1, 0))])
        mesh = scene_to_mesh(scene)
        self.assertEqual(mesh.validate(), [])
        self.assertTrue(mesh.to_obj().startswith("o demo"))

if __name__ == "__main__":
    unittest.main()
