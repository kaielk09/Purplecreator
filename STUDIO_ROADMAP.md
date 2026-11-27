# Purple Creator Studio roadmap

## Product principle
Windows desktop, offline-first editing, guided panels, preview-focused workflow, and no coding required for the basic user.

## Phase 1 — desktop shell (prototype)
- Dark purple workspace, navigation and project creation form
- Save project metadata to JSON
- Navigation shells for all creator areas

## Phase 2 — usable visual creators
- Block/item property forms with texture picker
- Crafting recipe grid and recipe output configuration
- Creative tab/category settings
- GUI canvas with drag/drop slots, labels, buttons, images, progress bars
- Mob/entity settings forms and preset behavior menus
- Structures palette and placement grid
- Particle/sound effect property panels

## Phase 3 — visual logic
- Node/event canvas: trigger, condition, action
- Connection validation and node properties
- Minecraft event palette
- Generate project source from graph data; keep the code hidden from beginner workflow

## Phase 4 — mod project generation
- Select target Minecraft version and loader
- Generate a complete project using a supported loader template
- Asset copying and resource metadata
- Gradle build integration with progress and clear errors
- Export the finished mod JAR; no success claim before a real build succeeds

## Phase 5 — previews and packaging
- Texture preview, model preview, entity animation preview
- Project validation and diagnostics
- EXE packaging and versioned updates

## Initial prototype limitations
The current desktop shell saves a JSON project file and shows placeholder editor forms. It does not yet create a compilable mod or JAR. The build_windows.bat packages the current UI into an EXE, not Minecraft mod output.
