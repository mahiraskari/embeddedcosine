import os
import numpy as np
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/map", tags=["map"])

COORDS_2D_PATH = "data/coords_2d.npy"
COORDS_3D_PATH = "data/coords_3d.npy"
METADATA_PATH = "data/metadata.npy"


@router.get("/points")
def get_points(dims: int = 2):
    if dims not in (2, 3):
        raise HTTPException(status_code=400, detail="dims must be 2 or 3")

    coords_path = COORDS_2D_PATH if dims == 2 else COORDS_3D_PATH

    if not os.path.exists(coords_path) or not os.path.exists(METADATA_PATH):
        raise HTTPException(status_code=404, detail="Run /embeddings/reduce first")

    coords = np.load(coords_path)
    metadata = np.load(METADATA_PATH, allow_pickle=True)

    points = []
    for i, meta in enumerate(metadata):
        point = dict(meta)
        point["x"] = float(coords[i][0])    
        point["y"] = float(coords[i][1])
        if dims == 3:
            point["z"] = float(coords[i][2])
        points.append(point)

    return {"dims": dims, "total": len(points), "points": points}
