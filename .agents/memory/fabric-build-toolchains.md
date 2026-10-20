---
name: Fabric build toolchains
description: External Fabric metadata and Gradle wrapper compatibility behavior for generated Minecraft mod builds.
---

Fabric's metadata can mark valid Yarn mappings for older Minecraft releases as unstable. Prefer stable mappings for the exact game version, but fall back to that version's published mappings if no stable mapping exists.

**Why:** Filtering only for `stable: true` made supported releases such as 1.20.1 impossible to build.

Generate a Gradle wrapper in a minimal isolated project instead of invoking the installed Gradle against the generated Fabric project. The installed Gradle can be older than the latest Loom plugin's minimum, and it will resolve that plugin before running the wrapper task.

**Why:** On this workspace, system Gradle was older than the current Fabric Loom requirement, so wrapper generation inside the project failed before the newer wrapper could run.

The newer `net.fabricmc.fabric-loom` plugin family uses `implementation` for Loader and Fabric API dependencies; the older remap plugin family uses `modImplementation`.

**Why:** Current Fabric example projects for Minecraft 26.x use the newer dependency configurations, and the old configuration name is not registered by that plugin.

**How to apply:** When adding Minecraft releases or updating Fabric Loom, check exact-version Yarn metadata, use the dependency configuration matching the plugin family, and keep wrapper generation independent of the project plugin classpath.
