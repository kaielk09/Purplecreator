# Purple Creator project format (prototype)\nProjects are stored in a UTF-8 JSON file named `purple_project.json` inside the project directory.

Fields:
- name, mod_id, author
- minecraft_version, loader
- project_folder
- content arrays: blocks, items, mobs, guis, logic, structures, visuals

This schema is a starter format and may evolve. The first UI currently initializes empty arrays and saves project settings. Content editors and loader code generation are not yet connected.
