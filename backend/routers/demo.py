import os
import math
import numpy as np
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/demo", tags=["demo"])

DEMO_DIR  = "data/demo"
COORDS_2D = f"{DEMO_DIR}/coords_2d.npy"
COORDS_3D = f"{DEMO_DIR}/coords_3d.npy"
METADATA  = f"{DEMO_DIR}/metadata.npy"


@router.get("/points")
def get_demo_points(dims: int = 2):
    if dims not in (2, 3):
        raise HTTPException(status_code=400, detail="dims must be 2 or 3")

    coords_path = COORDS_2D if dims == 2 else COORDS_3D

    if not os.path.exists(coords_path) or not os.path.exists(METADATA):
        raise HTTPException(status_code=404, detail="Demo data not seeded yet")

    coords   = np.load(coords_path)
    metadata = np.load(METADATA, allow_pickle=True)

    points = []
    for i, meta in enumerate(metadata):
        point = {}
        for k, v in dict(meta).items():
            if isinstance(v, float) and math.isnan(v):
                point[k] = None
            elif isinstance(v, np.generic):
                point[k] = v.item()
                if isinstance(point[k], float) and math.isnan(point[k]):
                    point[k] = None
            else:
                point[k] = v
        point["x"] = float(coords[i][0])
        point["y"] = float(coords[i][1])
        if dims == 3:
            point["z"] = float(coords[i][2])
        points.append(point)

    return {"dims": dims, "total": len(points), "points": points}
