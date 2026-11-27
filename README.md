# Purple Creator Studio

**A Windows desktop no-code Minecraft mod creator. The AI/model/training concept has been removed from the product.**

## App concept
Build mods through guided visual editors rather than writing code:
- Mod project setup (Minecraft version, Fabric/Forge/NeoForge selection, mod ID)
- Blocks, items, crafting and creative tabs
- GUI screens and components
- Custom mob/entity settings and behavior presets
- Visual event/condition/action logic
- Structures, block palettes and placement
- Particle, sound, model and texture tools
- Build/export to a mod JAR once the loader generator is implemented

## Run desktop prototype
Requires Windows and Python 3 (Tkinter included in most standard Windows installs):

    python desktop_app.py

## Package as a Windows EXE
Run `build_windows.bat`. It installs PyInstaller and packages the current UI into `dist/PurpleCreatorStudio.exe`.

## Current prototype status
The GUI shell and project wizard are implemented. The project wizard saves a `purple_project.json` file. Creator panels are currently UI scaffolding/placeholders; they do not yet create Minecraft assets or compile/export a working mod JAR.

See `STUDIO_ROADMAP.md` for the planned milestones and `PROJECT_FORMAT.md` for the prototype project schema.