import os
import math
import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/demo", tags=["demo"])


def _sanitize_val(v):
    if isinstance(v, np.generic):
        v = v.item()
    try:
        if pd.isna(v):
            return None
    except (TypeError, ValueError):
        pass
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    return v

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
        point = {k: _sanitize_val(v) for k, v in dict(meta).items()}
        point["x"] = float(coords[i][0])
        point["y"] = float(coords[i][1])
        if dims == 3:
            point["z"] = float(coords[i][2])
        points.append(point)

    return {"dims": dims, "total": len(points), "points": points}
