import os
import json
import shutil
import math
import numpy as np
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from auth import get_user_id

router = APIRouter(prefix="/projects", tags=["projects"])
PROJECTS_DIR = "data/projects"
MAX_PROJECTS = 10


def _user_dir(user_id: str) -> str:
    return f"{PROJECTS_DIR}/{user_id}"


def _meta_path(user_id: str, pid: str) -> str:
    return f"{_user_dir(user_id)}/{pid}/meta.json"


def _load_meta(user_id: str, pid: str) -> dict:
    p = _meta_path(user_id, pid)
    if not os.path.exists(p):
        raise HTTPException(status_code=404, detail="Project not found")
    with open(p) as f:
        return json.load(f)


@router.get("")
def list_projects(user_id: str = Depends(get_user_id)):
    user_dir = _user_dir(user_id)
    if not os.path.exists(user_dir):
        return {"projects": []}
    projects = []
    for pid in os.listdir(user_dir):
        mp = _meta_path(user_id, pid)
        if not os.path.exists(mp):
            continue
        with open(mp) as f:
            meta = json.load(f)
        meta["id"] = pid
        meta["has_map"] = os.path.exists(f"{user_dir}/{pid}/coords_2d.npy")
        projects.append(meta)
    projects.sort(key=lambda p: p.get("created_at", ""), reverse=True)
    return {"projects": projects}


class RenameRequest(BaseModel):
    name: str


@router.patch("/{pid}")
def rename_project(pid: str, req: RenameRequest, user_id: str = Depends(get_user_id)):
    meta = _load_meta(user_id, pid)
    meta["name"] = req.name.strip() or meta["name"]
    with open(_meta_path(user_id, pid), "w") as f:
        json.dump(meta, f)
    return {"id": pid, **meta}


@router.delete("/{pid}")
def delete_project(pid: str, user_id: str = Depends(get_user_id)):
    project_dir = f"{_user_dir(user_id)}/{pid}"
    if not os.path.exists(project_dir):
        raise HTTPException(status_code=404, detail="Project not found")
    shutil.rmtree(project_dir)
    return {"status": "deleted"}


@router.get("/{pid}/meta")
def get_project_meta(pid: str, user_id: str = Depends(get_user_id)):
    return _load_meta(user_id, pid)


@router.get("/{pid}/preview")
def project_preview(pid: str, user_id: str = Depends(get_user_id)):
    coords_path = f"{_user_dir(user_id)}/{pid}/coords_2d.npy"
    if not os.path.exists(coords_path):
        raise HTTPException(status_code=404, detail="No map yet")
    coords = np.load(coords_path)
    n = len(coords)
    if n > 400:
        idx = np.random.choice(n, 400, replace=False)
        coords = coords[idx]
    return {"points": [{"x": float(c[0]), "y": float(c[1])} for c in coords]}
