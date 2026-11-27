from __future__ import annotations
import json, re
from pathlib import Path
import tkinter as tk
from tkinter import ttk, filedialog, messagebox

BG="#100d16"; PANEL="#1b1524"; PANEL2="#251b32"; PURPLE="#9154e8"; TEXT="#eee8f7"; MUTED="#aa9db9"
CONTENT_KEYS=("blocks","items","mobs","recipes","guis","logic","structures","visuals")
DEFAULT_PROJECT={"format_version":1,"name":"New Mod","mod_id":"new_mod","author":"","minecraft_version":"1.21.1","loader":"Fabric","project_folder":"","content":{k:[] for k in CONTENT_KEYS}}

class Studio(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Purple Creator Studio")
        self.geometry("1180x760"); self.minsize(1000,650); self.configure(bg=BG)
        self.project=None; self.project_file=None; self.active="Dashboard"
        self._style(); self._layout(); self.show("Dashboard")
    def _style(self):
        s=ttk.Style(self); s.theme_use("clam")
        s.configure("Treeview",background=PANEL,foreground=TEXT,fieldbackground=PANEL,rowheight=29,borderwidth=0)
        s.configure("Treeview.Heading",background=PANEL2,foreground=TEXT,font=("Segoe UI",9,"bold"))
        s.map("Treeview",background=[("selected",PURPLE)],foreground=[("selected","white")])
        s.configure("TCombobox",fieldbackground=PANEL,background=PANEL,foreground=TEXT)
    def _layout(self):
        self.sidebar=tk.Frame(self,bg="#15101c",width=210);self.sidebar.pack(side="left",fill="y");self.sidebar.pack_propagate(False)
        tk.Label(self.sidebar,text="PURPLE",font=("Segoe UI",20,"bold"),bg="#15101c",fg=TEXT).pack(anchor="w",padx=18,pady=(22,0))
        tk.Label(self.sidebar,text="CREATOR STUDIO",font=("Segoe UI",9,"bold"),bg="#15101c",fg=PURPLE).pack(anchor="w",padx=18)
        tk.Label(self.sidebar,text="PROJECT TOOLS",font=("Segoe UI",8,"bold"),bg="#15101c",fg=MUTED).pack(anchor="w",padx=18,pady=(24,8))
        nav=[("Dashboard","⌂"),("Blocks","▦"),("Items","◇"),("Recipes","▤"),("Mobs","♟"),("GUI Screens","▣"),("Visual Logic","⌘"),("Structures","▧"),("Visuals & FX","✧"),("Settings","⚙")]
        for n,ico in nav:
            tk.Button(self.sidebar,text=f"  {ico}   {n}",anchor="w",command=lambda name=n:self.show(name),bg="#15101c",fg=TEXT,activebackground=PANEL2,activeforeground=TEXT,relief="flat",font=("Segoe UI",10),padx=12,pady=9).pack(fill="x",padx=8)
        tk.Label(self.sidebar,text="Offline project editor",bg="#15101c",fg="#81748f",font=("Segoe UI",8)).pack(side="bottom",anchor="w",padx=15,pady=18)
        main=tk.Frame(self,bg=BG);main.pack(side="left",fill="both",expand=True)
        bar=tk.Frame(main,bg=BG);bar.pack(fill="x",padx=20,pady=(15,10))
        self.projlabel=tk.Label(bar,text="No project loaded",bg=BG,fg=MUTED,font=("Segoe UI",9));self.projlabel.pack(side="left")
        for text,cmd in [("Open",self.open_project),("Save",self.save_project),("New project",self.new_project)]:
            tk.Button(bar,text=text,command=cmd,bg=PANEL2 if text!="New project" else PURPLE,fg=TEXT,relief="flat",padx=12,pady=7).pack(side="right",padx=(6,0))
        self.content=tk.Frame(main,bg=BG);self.content.pack(fill="both",expand=True,padx=22,pady=(4,20))
    def ensure_project(self):
        if self.project is None:
            messagebox.showinfo("Project required","Create a project first.");return False
        return True
    def show(self,section):
        self.active=section
        for w in self.content.winfo_children():w.destroy()
        if section=="Dashboard":return self.dashboard()
        if section in ("Blocks","Items","Recipes","Mobs"):return self.list_editor(section)
        self.placeholder(section)
    def header(self,title,subtitle):
        tk.Label(self.content,text=title,bg=BG,fg=TEXT,font=("Segoe UI",22,"bold")).pack(anchor="w")
        tk.Label(self.content,text=subtitle,bg=BG,fg=MUTED,font=("Segoe UI",10)).pack(anchor="w",pady=(3,14))
    def dashboard(self):
        name=self.project["name"] if self.project else "No project"
        self.header("Creator workspace",f"{name} — visual project editing without writing code.")
        if not self.project:
            self.card("Start a project","Set mod ID, Minecraft version, loader and project location.",self.new_project,"Create project")
            self.card("Open an existing project","Load a saved purple_project.json project file.",self.open_project,"Open project")
            return
        stats=tk.Frame(self.content,bg=BG);stats.pack(fill="x",pady=8)
        for key,label in [("blocks","Blocks"),("items","Items"),("recipes","Recipes"),("mobs","Mobs")]:
            box=tk.Frame(stats,bg=PANEL);box.pack(side="left",fill="x",expand=True,padx=4)
            count=len(self.project["content"].get(key,[]))
            tk.Label(box,text=str(count),bg=PANEL,fg=PURPLE,font=("Segoe UI",24,"bold")).pack(anchor="w",padx=12,pady=(10,0))
            tk.Label(box,text=label,bg=PANEL,fg=MUTED,font=("Segoe UI",9)).pack(anchor="w",padx=12,pady=(0,10))
        self.card("Blocks","Create block definitions with hardness, light, texture and tool properties.",lambda:self.show("Blocks"),"Manage blocks")
        self.card("Items","Create items with stack limit, durability, item category and tooltip.",lambda:self.show("Items"),"Manage items")
        self.card("Recipes","Create shaped or shapeless recipe records.",lambda:self.show("Recipes"),"Manage recipes")
        self.card("Mobs","Configure entity records, stats and behavior presets.",lambda:self.show("Mobs"),"Manage mobs")
        self.card("Project save","Save edits to your project JSON file.",self.save_project,"Save now")
    def card(self,title,desc,cmd,button):
        f=tk.Frame(self.content,bg=PANEL);f.pack(fill="x",pady=5)
        tk.Label(f,text=title,bg=PANEL,fg=TEXT,font=("Segoe UI",11,"bold")).pack(anchor="w",padx=14,pady=(12,3))
        tk.Label(f,text=desc,bg=PANEL,fg=MUTED,font=("Segoe UI",9),wraplength=700,justify="left").pack(anchor="w",padx=14)
        tk.Button(f,text=button,command=cmd,bg=PANEL2,fg=TEXT,relief="flat",padx=12,pady=6).pack(anchor="e",padx=12,pady=10)
    def list_editor(self,section):
        if not self.ensure_project():return
        key={"Blocks":"blocks","Items":"items","Recipes":"recipes","Mobs":"mobs"}[section]
        self.header(section+" editor","Create, edit and remove entries. Changes are stored in the project and can be saved.")
        wrap=tk.Frame(self.content,bg=BG);wrap.pack(fill="both",expand=True)
        tree=ttk.Treeview(wrap,columns=("id","name","details"),show="headings")
        for col,title,width in [("id","Internal ID",180),("name","Display name",210),("details","Properties",520)]:
            tree.heading(col,text=title);tree.column(col,width=width,anchor="w")
        tree.pack(fill="both",expand=True,pady=(0,10))
        def refresh():
            tree.delete(*tree.get_children())
            for i,obj in enumerate(self.project["content"].get(key,[])):
                details=", ".join(f"{k}: {v}" for k,v in obj.items() if k not in ("id","name"))
                tree.insert("", "end",iid=str(i),values=(obj.get("id",""),obj.get("name",""),details[:180]))
        refresh()
        buttons=tk.Frame(wrap,bg=BG);buttons.pack(fill="x")
        tk.Button(buttons,text="+ Add",command=lambda:self.entry_dialog(section,key,None,refresh),bg=PURPLE,fg="white",relief="flat",padx=16,pady=8).pack(side="left")
        def edit():
            selected=tree.selection()
            if not selected:return
            idx=int(selected[0]);self.entry_dialog(section,key,idx,refresh)
        def delete():
            selected=tree.selection()
            if selected and messagebox.askyesno("Delete entry","Remove selected entry?"):
                del self.project["content"][key][int(selected[0])];refresh()
        tk.Button(buttons,text="Edit selected",command=edit,bg=PANEL2,fg=TEXT,relief="flat",padx=14,pady=8).pack(side="left",padx=6)
        tk.Button(buttons,text="Delete",command=delete,bg=PANEL2,fg=TEXT,relief="flat",padx=14,pady=8).pack(side="left")
    def entry_dialog(self,section,key,index,refresh):
        old=dict(self.project["content"][key][index]) if index is not None else {}
        title=("Edit " if index is not None else "Add ")+section[:-1] if section.endswith("s") else section
        win=tk.Toplevel(self);win.title(title);win.configure(bg=BG);win.geometry("460x570");win.transient(self)
        fields=[("name","Display name",old.get("name","")),("id","Internal ID",old.get("id",""))]
        if key=="blocks":fields += [("hardness","Hardness",old.get("hardness","1.5")),("resistance","Blast resistance",old.get("resistance","6")),("light","Light level (0-15)",old.get("light","0")),("tool","Required tool",old.get("tool","")) ,("texture","Texture path",old.get("texture",""))]
        elif key=="items":fields += [("type","Item type",old.get("type","normal")),("max_stack","Max stack size",old.get("max_stack","64")),("durability","Durability",old.get("durability","0")),("texture","Texture path",old.get("texture",""))]
        elif key=="recipes":fields += [("recipe_type","Recipe type (shaped/shapeless)",old.get("recipe_type","shapeless")),("output","Output item ID",old.get("output","")),("count","Output count",old.get("count","1")),("ingredients","Ingredients (comma-separated IDs)",old.get("ingredients",""))]
        elif key=="mobs":fields += [("health","Health",old.get("health","20")),("damage","Attack damage",old.get("damage","3")),("speed","Movement speed",old.get("speed","0.25")),("behavior","Behavior preset",old.get("behavior","neutral")),("spawn","Spawn conditions",old.get("spawn",""))]
        vars={}
        tk.Label(win,text=section+" properties",bg=BG,fg=TEXT,font=("Segoe UI",16,"bold")).pack(anchor="w",padx=18,pady=(18,10))
        form=tk.Frame(win,bg=BG);form.pack(fill="both",expand=True,padx=18)
        for field,label,default in fields:
            tk.Label(form,text=label,bg=BG,fg=MUTED,font=("Segoe UI",9)).pack(anchor="w",pady=(7,2))
            v=tk.StringVar(value=str(default))
            ent=tk.Entry(form,textvariable=v,bg=PANEL,fg=TEXT,insertbackground=TEXT,relief="flat")
            ent.pack(fill="x",ipady=7);vars[field]=v
        def save():
            name=vars["name"].get().strip();ident=vars["id"].get().strip()
            if not name or not re.fullmatch(r"[a-z0-9_]+",ident):
                messagebox.showerror("Invalid entry","Name is required. ID must use lowercase letters, digits and underscore.",parent=win);return
            data={}
            for f,_,_ in fields:
                val=vars[f].get().strip()
                if f in ("hardness","resistance","light","max_stack","durability","count","health","damage","speed"):
                    try: data[f]=float(val) if f=="speed" else int(val)
                    except ValueError:messagebox.showerror("Invalid number",f"Enter a valid number for {f}.",parent=win);return
                else:data[f]=val
            if key=="recipes":data["ingredients"]=[x.strip() for x in data["ingredients"].split(",") if x.strip()]
            if key=="blocks" and not 0<=data["light"]<=15:
                messagebox.showerror("Light value","Light must be between 0 and 15.",parent=win);return
            if key=="items" and not 1<=data["max_stack"]<=99:
                messagebox.showerror("Stack size","Stack size must be from 1 to 99.",parent=win);return
            arr=self.project["content"][key]
            if index is None:arr.append(data)
            else:arr[index]=data
            win.destroy();refresh()
        tk.Button(win,text="Save entry",command=save,bg=PURPLE,fg="white",relief="flat",padx=15,pady=9).pack(fill="x",padx=18,pady=16)
    def placeholder(self,section):
        self.header(section,"This section is currently a design placeholder.")
        descriptions={
            "GUI Screens":"Planned screen layout editor: canvas, buttons, labels, inventory slots and click actions.",
            "Visual Logic":"Planned event → condition → action node editor. Logic is not compiled to mod source yet.",
            "Structures":"Planned grid/palette structure designer with rotate and mirror tools.",
            "Visuals & FX":"Planned texture/model browser, particles, sounds and animation timeline.",
            "Settings":"Project metadata and target-loader settings."
        }
        self.card("Feature panel",descriptions.get(section,"Planned editor area."),lambda:None,"Coming soon")
    def new_project(self):
        win=tk.Toplevel(self);win.title("New mod project");win.geometry("490x540");win.configure(bg=BG);win.transient(self)
        fields={}
        for key,label,default in [("name","Mod name","My Mod"),("mod_id","Mod ID","my_mod"),("author","Author","")]:
            tk.Label(win,text=label,bg=BG,fg=MUTED).pack(anchor="w",padx=20,pady=(12,3))
            v=tk.StringVar(value=default);tk.Entry(win,textvariable=v,bg=PANEL,fg=TEXT,insertbackground=TEXT,relief="flat").pack(fill="x",padx=20,ipady=8);fields[key]=v
        tk.Label(win,text="Minecraft version",bg=BG,fg=MUTED).pack(anchor="w",padx=20,pady=(12,3))
        version=tk.StringVar(value="1.21.1");ttk.Combobox(win,textvariable=version,values=["1.21.1","1.21.4","1.20.1","1.20.4"],state="readonly").pack(fill="x",padx=20)
        tk.Label(win,text="Mod loader",bg=BG,fg=MUTED).pack(anchor="w",padx=20,pady=(12,3))
        loader=tk.StringVar(value="Fabric");ttk.Combobox(win,textvariable=loader,values=["Fabric","Forge","NeoForge"],state="readonly").pack(fill="x",padx=20)
        tk.Label(win,text="Project folder",bg=BG,fg=MUTED).pack(anchor="w",padx=20,pady=(12,3))
        folder=tk.StringVar(value=str(Path.home()/"PurpleCreatorProjects"))
        line=tk.Frame(win,bg=BG);line.pack(fill="x",padx=20)
        tk.Entry(line,textvariable=folder,bg=PANEL,fg=TEXT,insertbackground=TEXT,relief="flat").pack(side="left",fill="x",expand=True,ipady=7)
        tk.Button(line,text="Browse",command=lambda:folder.set(filedialog.askdirectory() or folder.get()),bg=PANEL2,fg=TEXT,relief="flat").pack(side="left",padx=4)
        def create():
            if not fields["name"].get().strip() or not re.fullmatch("[a-z0-9_]+",fields["mod_id"].get().strip()):
                messagebox.showerror("Project details","Mod name is required and Mod ID must be lowercase with underscores.",parent=win);return
            p={**DEFAULT_PROJECT,"name":fields["name"].get().strip(),"mod_id":fields["mod_id"].get().strip(),"author":fields["author"].get().strip(),"minecraft_version":version.get(),"loader":loader.get(),"project_folder":folder.get(),"content":{k:[] for k in CONTENT_KEYS}}
            dest=Path(folder.get())/p["mod_id"]
            try:
                dest.mkdir(parents=True,exist_ok=True)
                file=dest/"purple_project.json";file.write_text(json.dumps(p,ensure_ascii=False,indent=2),encoding="utf-8")
            except Exception as e:messagebox.showerror("Create failed",str(e),parent=win);return
            self.project=p;self.project_file=file;self.update_label();win.destroy();self.show("Dashboard")
            messagebox.showinfo("Project created","Project file created. Content editors can now add definitions. JAR export is not yet available.")
        tk.Button(win,text="Create project",command=create,bg=PURPLE,fg="white",relief="flat",padx=18,pady=10).pack(fill="x",padx=20,pady=20)
    def open_project(self):
        path=filedialog.askopenfilename(title="Open Purple Creator project",filetypes=[("Purple project","purple_project.json"),("JSON","*.json")])
        if not path:return
        try:
            p=json.loads(Path(path).read_text(encoding="utf-8"))
            if not isinstance(p,dict) or "mod_id" not in p or "content" not in p:raise ValueError("This file is not a Purple Creator project.")
            for k in CONTENT_KEYS:p.setdefault("content",{}).setdefault(k,[])
            self.project=p;self.project_file=Path(path);self.update_label();self.show("Dashboard")
        except Exception as e:messagebox.showerror("Open failed",str(e))
    def update_label(self):
        if self.project:self.projlabel.config(text=f'{self.project["name"]} • {self.project["loader"]} {self.project["minecraft_version"]}')
    def save_project(self):
        if not self.project:return messagebox.showinfo("No project","Create or open a project first.")
        if not self.project_file:
            path=filedialog.asksaveasfilename(defaultextension=".json",filetypes=[("Purple project","*.json")])
            if not path:return
            self.project_file=Path(path)
        try:
            self.project_file.write_text(json.dumps(self.project,ensure_ascii=False,indent=2),encoding="utf-8")
            messagebox.showinfo("Saved","Project saved successfully.")
        except Exception as e:messagebox.showerror("Save failed",str(e))
if __name__=="__main__":
    Studio().mainloop()
