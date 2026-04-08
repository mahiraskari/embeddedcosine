import os
import json
import shutil
import math
import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/projects", tags=["projects"])
PROJECTS_DIR = "data/projects"
MAX_PROJECTS = 10


def _meta_path(pid: str) -> str:
    return f"{PROJECTS_DIR}/{pid}/meta.json"


def _load_meta(pid: str) -> dict:
    p = _meta_path(pid)
    if not os.path.exists(p):
        raise HTTPException(status_code=404, detail="Project not found")
    with open(p) as f:
        return json.load(f)


@router.get("")
def list_projects():
    if not os.path.exists(PROJECTS_DIR):
        return {"projects": []}
    projects = []
    for pid in os.listdir(PROJECTS_DIR):
        mp = _meta_path(pid)
        if not os.path.exists(mp):
            continue
        with open(mp) as f:
            meta = json.load(f)
        meta["id"] = pid
        meta["has_map"] = os.path.exists(f"{PROJECTS_DIR}/{pid}/coords_2d.npy")
        projects.append(meta)
    # Newest first — ISO timestamps sort correctly as strings
    projects.sort(key=lambda p: p.get("created_at", ""), reverse=True)
    return {"projects": projects}


class RenameRequest(BaseModel):
    name: str


@router.patch("/{pid}")
def rename_project(pid: str, req: RenameRequest):
    meta = _load_meta(pid)
    meta["name"] = req.name.strip() or meta["name"]
    with open(_meta_path(pid), "w") as f:
        json.dump(meta, f)
    return {"id": pid, **meta}


@router.delete("/{pid}")
def delete_project(pid: str):
    project_dir = f"{PROJECTS_DIR}/{pid}"
    if not os.path.exists(project_dir):
        raise HTTPException(status_code=404, detail="Project not found")
    shutil.rmtree(project_dir)
    return {"status": "deleted"}


@router.get("/{pid}/meta")
def get_project_meta(pid: str):
    return _load_meta(pid)


@router.get("/{pid}/preview")
def project_preview(pid: str):
    coords_path = f"{PROJECTS_DIR}/{pid}/coords_2d.npy"
    if not os.path.exists(coords_path):
        raise HTTPException(status_code=404, detail="No map yet")
    coords = np.load(coords_path)
    n = len(coords)
    # Cap at 400 points for the thumbnail — no need to ship the full dataset here
    if n > 400:
        idx = np.random.choice(n, 400, replace=False)
        coords = coords[idx]
    return {"points": [{"x": float(c[0]), "y": float(c[1])} for c in coords]}
