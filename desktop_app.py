"""Purple Creator Studio - visual Minecraft mod-maker prototype.
This UI is a working project shell; loader code generation is not implemented yet.
"""
from __future__ import annotations

import json
import re
import tkinter as tk
from tkinter import filedialog, messagebox
from pathlib import Path

BG = "#111019"
PANEL = "#1b1723"
PANEL2 = "#241d30"
PURPLE = "#9b5cff"
PURPLE2 = "#7138bd"
TEXT = "#f4efff"
MUTED = "#aaa0bd"
BORDER = "#342a45"

class PurpleCreatorApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Purple Creator Studio")
        self.geometry("1180x760")
        self.minsize(940, 620)
        self.configure(bg=BG)
        self.project = None
        self.active_section = "Home"
        self.sidebar_buttons = {}
        self._build_shell()
        self.show_section("Home")

    def _build_shell(self):
        sidebar = tk.Frame(self, bg="#15111d", width=218)
        sidebar.pack(side="left", fill="y")
        sidebar.pack_propagate(False)
        brand = tk.Frame(sidebar, bg="#15111d")
        brand.pack(fill="x", padx=18, pady=(22, 18))
        tk.Label(brand, text="PURPLE", bg="#15111d", fg=TEXT,
                 font=("Segoe UI", 19, "bold")).pack(anchor="w")
        tk.Label(brand, text="CREATOR STUDIO", bg="#15111d", fg=PURPLE,
                 font=("Segoe UI", 9, "bold")).pack(anchor="w")
        tk.Label(sidebar, text="WORKSPACE", bg="#15111d", fg=MUTED,
                font=("Segoe UI", 8, "bold")).pack(anchor="w", padx=18, pady=(12, 8))
        for name, icon in [("Home","⌂"),("Blocks & Items","▦"),("GUI Designer","▣"),
                            ("Mob Creator","♟"),("Visual Logic","◇"),("Structures","▤"),
                            ("Visuals & FX","✧"),("Project Settings","⚙")]:
            btn=tk.Button(sidebar, text=f"  {icon}   {name}", anchor="w",
                          command=lambda n=name:self.show_section(n),
                          bg="#15111d", fg=TEXT, activebackground=PANEL2,
                          activeforeground=TEXT, relief="flat", bd=0,
                          font=("Segoe UI",10), padx=14, pady=10, cursor="hand2")
            btn.pack(fill="x", padx=9, pady=2)
            self.sidebar_buttons[name]=btn
        footer=tk.Frame(sidebar,bg="#15111d")
        footer.pack(side="bottom",fill="x",padx=15,pady=15)
        tk.Label(footer,text="NO-CODE MOD WORKSHOP",bg="#15111d",fg=MUTED,
                font=("Segoe UI",8,"bold")).pack(anchor="w")
        tk.Label(footer,text="Prototype • Offline",bg="#15111d",fg="#7b718d",
                font=("Segoe UI",8)).pack(anchor="w",pady=(4,0))

        main=tk.Frame(self,bg=BG)
        main.pack(side="left",fill="both",expand=True)
        top=tk.Frame(main,bg=BG,height=62)
        top.pack(fill="x",padx=24,pady=(16,8))
        top.pack_propagate(False)
        self.project_label=tk.Label(top,text="No project open",bg=BG,fg=MUTED,font=("Segoe UI",10))
        self.project_label.pack(side="left",anchor="center")
        tk.Button(top,text="＋  New Mod Project",command=self.new_project,
                 bg=PURPLE2,fg="white",activebackground=PURPLE,relief="flat",
                 font=("Segoe UI",10,"bold"),padx=14,pady=9,cursor="hand2").pack(side="right")
        self.body=tk.Frame(main,bg=BG)
        self.body.pack(fill="both",expand=True,padx=24,pady=(8,24))

    def clear_body(self):
        for w in self.body.winfo_children(): w.destroy()

    def heading(self,title,subtitle):
        tk.Label(self.body,text=title,bg=BG,fg=TEXT,font=("Segoe UI",22,"bold")).pack(anchor="w")
        tk.Label(self.body,text=subtitle,bg=BG,fg=MUTED,font=("Segoe UI",10)).pack(anchor="w",pady=(4,18))

    def card(self,parent,title,desc,button_text=None,command=None):
        frame=tk.Frame(parent,bg=PANEL,highlightbackground=BORDER,highlightthickness=1)
        frame.pack(fill="x",pady=6)
        inner=tk.Frame(frame,bg=PANEL)
        inner.pack(fill="x",padx=16,pady=14)
        tk.Label(inner,text=title,bg=PANEL,fg=TEXT,font=("Segoe UI",12,"bold")).pack(anchor="w")
        tk.Label(inner,text=desc,bg=PANEL,fg=MUTED,font=("Segoe UI",9),
                wraplength=680,justify="left").pack(anchor="w",pady=(5,0))
        if button_text:
            tk.Button(inner,text=button_text,command=command,bg=PANEL2,fg=TEXT,
                    activebackground=PURPLE2,relief="flat",padx=12,pady=7,
                    cursor="hand2").pack(anchor="e",pady=(10,0))
        return frame

    def show_section(self,section):
        self.active_section=section
        self.clear_body()
        for name,btn in self.sidebar_buttons.items():
            btn.configure(bg=PANEL2 if name==section else "#15111d")
        if section=="Home":
            self.heading("Modding, without the code.","Visual tools to design your Minecraft mod and organize everything in one workspace.")
            self.card(self.body,"Create a new mod","Start with the loader, Minecraft version and mod identity.", "Create project",self.new_project)
            row=tk.Frame(self.body,bg=BG); row.pack(fill="x",pady=8)
            for title,desc in [("Blocks & Items","Custom blocks, tools, food, recipes"),
                               ("GUI Designer","Screens, buttons, panels, slots"),
                               ("Mob Creator","Entity settings, stats, spawn and drops")]:
                box=tk.Frame(row,bg=PANEL,highlightbackground=BORDER,highlightthickness=1)
                box.pack(side="left",fill="both",expand=True,padx=(0,8))
                tk.Label(box,text=title,bg=PANEL,fg=TEXT,font=("Segoe UI",11,"bold")).pack(anchor="w",padx=12,pady=(14,6))
                tk.Label(box,text=desc,bg=PANEL,fg=MUTED,wraplength=180,justify="left",font=("Segoe UI",9)).pack(anchor="w",padx=12,pady=(0,14))
            self.card(self.body,"Visual Logic","Build interactions with event → condition → action blocks, using menus and connectors instead of writing code.","Open logic",lambda:self.show_section("Visual Logic"))
            self.card(self.body,"Project status","The current prototype saves project metadata. Exporting a working mod JAR is a later milestone.","View settings",lambda:self.show_section("Project Settings"))
        elif section=="Blocks & Items":
            self.heading("Blocks & Items","Create custom Minecraft content using property panels.")
            for title,desc in [("Block Creator","Set hardness, resistance, sound, light, tool requirement and texture slots."),
                              ("Item Creator","Configure item type, durability, stack size, food values and effects."),
                              ("Recipe Builder","Visual crafting-grid editor and recipe output preview."),
                              ("Creative Tab Organizer","Choose where your custom content appears.")]:
                self.card(self.body,title,desc,"Open editor",lambda t=title:self.show_editor(t))
        elif section=="GUI Designer":
            self.heading("GUI Designer","Lay out a screen visually — arrange components and properties.")
            self.card(self.body,"Canvas & Components","Future canvas with draggable labels, buttons, slots, progress bars, images and panels.","Open canvas",lambda:self.show_editor("GUI Canvas"))
            self.card(self.body,"Button actions","Select a button and choose its action from an action menu.","Configure",lambda:self.show_editor("Button Action"))
        elif section=="Mob Creator":
            self.heading("Mob Creator","Configure your custom entity with guided settings.")
            for title,desc in [("Entity identity","Display name, entity ID, category and size."),
                              ("Attributes","Health, movement, attack, armor and knockback resistance."),
                              ("Behavior presets","Passive, neutral, hostile, wander, follow, flee and guard presets."),
                              ("Spawn & drops","Biome/time/conditions, spawn group and loot settings."),
                              ("Appearance","Model and texture assignment, animation slots.")]:
                self.card(self.body,title,desc,"Configure",lambda t=title:self.show_editor(t))
        elif section=="Visual Logic":
            self.heading("Visual Logic","A block-based event system. Connect event → optional conditions → actions.")
            self.card(self.body,"Event palette","Examples: player right-clicks item, entity takes damage, block broken, tick timer.","Choose event",lambda:self.show_editor("Logic Event"))
            self.card(self.body,"Conditions","Menus for checking player, item, world, distance, time, or entity state.","Add condition",lambda:self.show_editor("Logic Condition"))
            self.card(self.body,"Actions","Effects, messages, teleport, spawn, give item, play sound, set variables and cooldowns.","Add action",lambda:self.show_editor("Logic Action"))
            self.card(self.body,"Visual graph prototype","This first build is a navigation mockup; connected graph execution is not yet implemented.","Prototype info",lambda:messagebox.showinfo("Visual Logic","Graph execution is planned; no code is generated from logic yet."))
        elif section=="Structures":
            self.heading("Structure Studio","Plan structures from palettes and placement tools.")
            for title,desc in [("Structure canvas","Grid-based build area, selection, rotate and mirror."),
                              ("Block palette","Select blocks and create reusable palette sets."),
                              ("Placement rules","Configure biome, spawn frequency and placement conditions.")]:
                self.card(self.body,title,desc,"Open",lambda t=title:self.show_editor(t))
        elif section=="Visuals & FX":
            self.heading("Visuals & FX","Configure visual and audio effects in one place.")
            for title,desc in [("Particles","Particle type, color, size, lifetime and emission settings."),
                              ("Sounds","Sound event picker and playback conditions."),
                              ("Animations","Animation timeline and keyframe editor (planned)."),
                              ("Models & textures","Asset browser with previews (planned).")]:
                self.card(self.body,title,desc,"Open",lambda t=title:self.show_editor(t))
        elif section=="Project Settings":
            self.heading("Project Settings","Project identity, target version and mod-loader selection.")
            if not self.project:
                self.card(self.body,"No project open","Create or open a project first.","Create project",self.new_project)
            else:
                for k,v in self.project.items():
                    tk.Label(self.body,text=f"{k.replace('_',' ').title()}:  {v}",bg=BG,fg=TEXT,font=("Segoe UI",10)).pack(anchor="w",pady=3)
                self.card(self.body,"Save project","Save the project settings JSON.","Save",self.save_project)

    def show_editor(self,title):
        self.clear_body()
        self.heading(title,"Settings mockup. The visual editors and generator are under development.")
        fields=["Display name","Internal ID","Description","Texture / asset path","Category"]
        entries={}
        for label in fields:
            line=tk.Frame(self.body,bg=BG);line.pack(fill="x",pady=5)
            tk.Label(line,text=label,width=22,anchor="w",bg=BG,fg=MUTED,font=("Segoe UI",10)).pack(side="left")
            entry=tk.Entry(line,bg=PANEL,fg=TEXT,insertbackground=TEXT,relief="flat")
            entry.pack(side="left",fill="x",expand=True,ipady=8)
            entries[label]=entry
        self.card(self.body,"Properties","These form fields are UI scaffolding only; Minecraft code export is not connected yet.")
        tk.Button(self.body,text="← Back",command=lambda:self.show_section(self.active_section),bg=PANEL2,fg=TEXT,relief="flat",padx=14,pady=8).pack(anchor="w",pady=14)

    def new_project(self):
        win=tk.Toplevel(self);win.title("New Minecraft Mod");win.configure(bg=BG);win.geometry("460x520");win.resizable(False,False)
        tk.Label(win,text="Create your mod project",bg=BG,fg=TEXT,font=("Segoe UI",18,"bold")).pack(anchor="w",padx=22,pady=(22,5))
        tk.Label(win,text="Choose a few basics. No programming required.",bg=BG,fg=MUTED,font=("Segoe UI",9)).pack(anchor="w",padx=22,pady=(0,14))
        form=tk.Frame(win,bg=BG);form.pack(fill="x",padx=22)
        inputs={}
        def add_input(label,key,default=""):
            tk.Label(form,text=label,bg=BG,fg=MUTED,font=("Segoe UI",9)).pack(anchor="w",pady=(8,3))
            ent=tk.Entry(form,bg=PANEL,fg=TEXT,insertbackground=TEXT,relief="flat")
            ent.pack(fill="x",ipady=8);ent.insert(0,default);inputs[key]=ent
        add_input("Mod name","name","My Minecraft Mod")
        add_input("Mod ID (lowercase, no spaces)","mod_id","my_mod")
        add_input("Creator / author","author")
        tk.Label(form,text="Minecraft version",bg=BG,fg=MUTED,font=("Segoe UI",9)).pack(anchor="w",pady=(8,3))
        version=tk.StringVar(value="1.21.1")
        tk.OptionMenu(form,version,"1.21.1","1.21.4","1.20.1","1.20.4").pack(anchor="w")
        tk.Label(form,text="Mod loader",bg=BG,fg=MUTED,font=("Segoe UI",9)).pack(anchor="w",pady=(8,3))
        loader=tk.StringVar(value="Fabric")
        tk.OptionMenu(form,loader,"Fabric","Forge","NeoForge").pack(anchor="w")
        folder=tk.StringVar(value=str(Path.home()/"PurpleCreatorProjects"))
        tk.Label(form,text="Project folder",bg=BG,fg=MUTED,font=("Segoe UI",9)).pack(anchor="w",pady=(8,3))
        pathline=tk.Frame(form,bg=BG);pathline.pack(fill="x")
        tk.Entry(pathline,textvariable=folder,bg=PANEL,fg=TEXT,insertbackground=TEXT,relief="flat").pack(side="left",fill="x",expand=True,ipady=7)
        tk.Button(pathline,text="Browse",command=lambda:folder.set(filedialog.askdirectory() or folder.get()),bg=PANEL2,fg=TEXT,relief="flat").pack(side="left",padx=(5,0))
        def create():
            name=inputs["name"].get().strip()
            modid=inputs["mod_id"].get().strip()
            if not name or not re.fullmatch(r"[a-z0-9_]+",modid):
                messagebox.showerror("Check project details","Enter a name and a valid mod ID (lowercase letters, digits and underscores).",parent=win);return
            self.project={"name":name,"mod_id":modid,"author":inputs["author"].get().strip(),"minecraft_version":version.get(),"loader":loader.get(),"project_folder":folder.get(),"content":{"blocks":[],"items":[],"mobs":[],"guis":[],"logic":[],"structures":[],"visuals":[]}}
            base=Path(folder.get())/modid
            try:
                base.mkdir(parents=True,exist_ok=True)
                (base/"purple_project.json").write_text(json.dumps(self.project,indent=2,ensure_ascii=False),encoding="utf-8")
            except Exception as exc:
                messagebox.showerror("Could not save project",str(exc),parent=win);return
            self.project_label.configure(text=f"{name}  •  {loader.get()} {version.get()}")
            win.destroy();self.show_section("Home")
            messagebox.showinfo("Project created","Project settings saved. The mod build/export pipeline is not connected yet.")
        tk.Button(win,text="Create Project",command=create,bg=PURPLE2,fg="white",relief="flat",font=("Segoe UI",10,"bold"),padx=18,pady=10).pack(fill="x",padx=22,pady=20)

    def save_project(self):
        if not self.project:return
        target=Path(self.project["project_folder"])/self.project["mod_id"]/"purple_project.json"
        try:
            target.parent.mkdir(parents=True,exist_ok=True)
            target.write_text(json.dumps(self.project,indent=2,ensure_ascii=False),encoding="utf-8")
            messagebox.showinfo("Saved",f"Saved to:\n{target}")
        except Exception as exc:
            messagebox.showerror("Save failed",str(exc))

if __name__=="__main__":
    PurpleCreatorApp().mainloop()
