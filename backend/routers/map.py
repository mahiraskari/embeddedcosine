import os
import numpy as np
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/map", tags=["map"])

USER_DIR = "data/user"


@router.get("/points")
def get_points(dims: int = 2):
    if dims not in (2, 3):
        raise HTTPException(status_code=400, detail="dims must be 2 or 3")

    coords_path = f"{USER_DIR}/coords_{dims}d.npy"
    meta_path   = f"{USER_DIR}/metadata.npy"

    if not os.path.exists(coords_path) or not os.path.exists(meta_path):
        raise HTTPException(status_code=404, detail="No user data found. Upload a dataset first.")

    coords   = np.load(coords_path)
    metadata = np.load(meta_path, allow_pickle=True)

    points = []
    for i, meta in enumerate(metadata):
        point = dict(meta)
        point["x"] = float(coords[i][0])
        point["y"] = float(coords[i][1])
        if dims == 3:
            point["z"] = float(coords[i][2])
        points.append(point)

    return {"dims": dims, "total": len(points), "points": points}
