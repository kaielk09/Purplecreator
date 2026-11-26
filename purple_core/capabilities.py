"""Capability definitions for the Purple Creator AI model."""
from dataclasses import dataclass
from typing import Literal
Capability = Literal["web_search", "luau_generation", "file_creation", "model_3d_generation", "project_organization"]
@dataclass(frozen=True)
class CapabilityInfo:
    key: Capability
    description: str
    status: str
def capability_catalog() -> tuple[CapabilityInfo, ...]:
    return (
        CapabilityInfo("web_search", "Search the web and return relevant sources.", "adapter scaffold"),
        CapabilityInfo("luau_generation", "Generate Roblox Luau scripts and modules.", "core scaffold"),
        CapabilityInfo("file_creation", "Create project files from generated content.", "implemented utility"),
        CapabilityInfo("model_3d_generation", "Produce editable 3D scene descriptions and mesh data.", "core scaffold"),
        CapabilityInfo("project_organization", "Suggest and apply safe project folder/file organization.", "planned"),
    )
