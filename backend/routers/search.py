import os
import math
import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from services.embedder import embed_texts
from services.indexer import load_index, search
from auth import get_user_id_optional

router = APIRouter(prefix="/search", tags=["search"])

DEMO_DIR     = "data/demo"
PROJECTS_DIR = "data/projects"


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


class SearchRequest(BaseModel):
    query: str
    k: int = 10
    demo: bool = False
    project_id: str | None = None


class SimilarityRequest(BaseModel):
    name_a: str
    name_b: str
    demo: bool = False
    project_id: str | None = None


def _resolve_dir(demo: bool, project_id: str | None, user_id: str | None) -> str:
    if demo:
        return DEMO_DIR
    if project_id and user_id:
        return f"{PROJECTS_DIR}/{user_id}/{project_id}"
    raise HTTPException(status_code=400, detail="Provide demo=true or project_id")


@router.post("/similarity")
def compute_similarity(req: SimilarityRequest, user_id: str | None = Depends(get_user_id_optional)):
    if req.demo:
        data_dir = DEMO_DIR
    elif req.project_id and user_id:
        data_dir = f"{PROJECTS_DIR}/{user_id}/{req.project_id}"
    else:
        raise HTTPException(status_code=400, detail="Provide demo=true or project_id")

    meta_path = f"{data_dir}/metadata.npy"
    emb_path  = f"{data_dir}/embeddings.npy"
    if not os.path.exists(meta_path) or not os.path.exists(emb_path):
        raise HTTPException(status_code=404, detail="No data found")

    metadata   = np.load(meta_path, allow_pickle=True)
    embeddings = np.load(emb_path)

    idx_a = idx_b = None
    for i, m in enumerate(metadata):
        name = dict(m).get("Name", "")
        if name == req.name_a: idx_a = i
        if name == req.name_b: idx_b = i
        if idx_a is not None and idx_b is not None:
            break

    if idx_a is None or idx_b is None:
        return {"similarity": None}

    a   = embeddings[idx_a].astype(float)
    b   = embeddings[idx_b].astype(float)
    sim = float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-8))
    return {"similarity": round(sim, 4)}


@router.post("")
def search_games(req: SearchRequest, user_id: str | None = Depends(get_user_id_optional)):
    if req.demo:
        data_dir = DEMO_DIR
    elif req.project_id and user_id:
        data_dir = f"{PROJECTS_DIR}/{user_id}/{req.project_id}"
    else:
        raise HTTPException(status_code=400, detail="Provide demo=true or a project_id")

    index_path = f"{data_dir}/index.faiss"
    meta_path  = f"{data_dir}/metadata.npy"

    if not os.path.exists(index_path) or not os.path.exists(meta_path):
        raise HTTPException(status_code=404, detail="No index found.")

    query_vector = embed_texts([req.query])[0]
    index        = load_index(data_dir)
    metadata     = np.load(meta_path, allow_pickle=True)

    candidates = min(req.k * 30, len(metadata))
    scores, indices = search(index, query_vector, k=candidates)

    MIN_SCORE = 0.01
    results = []
    for score, idx in zip(scores, indices):
        if idx < 0 or idx >= len(metadata):
            continue
        if float(score) < MIN_SCORE:
            break
        item = {k: _sanitize_val(v) for k, v in dict(metadata[idx]).items()}
        item["score"] = round(float(score), 4)
        results.append(item)
        if len(results) >= req.k:
            break

    return {"query": req.query, "results": results}
