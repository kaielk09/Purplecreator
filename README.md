# Purple Creator Studio

**Purple Creator is no longer an AI model project.** It is planned as a Windows desktop creator for Minecraft mods, with a visual workflow and no requirement to write code.

## Product direction
Create Minecraft mod projects using editors and guided forms:
- Mod project wizard: name, mod ID, author, Minecraft version, loader and project folder.
- Items and blocks: properties, textures, tabs, recipes and creative-group placement.
- GUI editor: visual screen layout, slots, buttons, labels and actions.
- Mobs: attributes, behavior presets, drops, sounds, spawn conditions and model/texture assignment.
- Visual logic: connect event/action blocks and configure them using menus rather than typing code.
- Structures: piece placement and block palette.
- Visuals: particles, effects, sounds, animations and model assets.
- Build/export: generate a project and produce a mod JAR through the chosen loader's build tooling.

## UX goal
An editor-first application. Users choose a tool, fill in settings, preview their changes, and use a visual logic graph to define interactions. Advanced code editing may be optional in a future feature, never required for basic mod creation.

## Windows desktop
The target is a Windows executable. The first prototype uses Python's built-in Tkinter UI so it can be run without a web server or AI. Packaging into a standalone EXE is planned via PyInstaller after the prototype is tested.

## Honest status
This repo contains the project direction and initial desktop prototype, not a finished all-featured mod maker. Loader-specific generators, preview rendering, visual logic, asset pipeline, and actual JAR build/export still need implementation and testing. It does not use or train an AI model.

## Run the prototype
On Windows with Python 3 installed:

    python desktop_app.py

The prototype is a UI/project shell. It currently saves a project configuration and is not yet a complete Minecraft mod compiler.