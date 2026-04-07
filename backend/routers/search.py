import os
import math
import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.embedder import embed_texts
from services.indexer import load_index, search

router = APIRouter(prefix="/search", tags=["search"])

USER_DIR  = "data/user"
DEMO_DIR  = "data/demo"


class SearchRequest(BaseModel):
    query: str
    k: int = 10
    demo: bool = False


@router.post("")
def search_games(req: SearchRequest):
    data_dir = DEMO_DIR if req.demo else USER_DIR

    index_path = f"{data_dir}/index.faiss"
    meta_path  = f"{data_dir}/metadata.npy"

    if not os.path.exists(index_path) or not os.path.exists(meta_path):
        raise HTTPException(status_code=404, detail="No index found.")

    query_vector = embed_texts([req.query])[0]
    index        = load_index(data_dir)
    metadata     = np.load(meta_path, allow_pickle=True)

    # Fetch more candidates than needed, filter by score threshold
    candidates = min(req.k * 5, len(metadata))
    scores, indices = search(index, query_vector, k=candidates)

    MIN_SCORE = 0.05
    results = []
    for score, idx in zip(scores, indices):
        if idx < 0 or idx >= len(metadata):
            continue
        if float(score) < MIN_SCORE:
            break  # scores are sorted descending
        raw = dict(metadata[idx])
        item = {}
        for k, v in raw.items():
            if isinstance(v, np.generic):
                v = v.item()
            if isinstance(v, float) and math.isnan(v):
                v = None
            item[k] = v
        item["score"] = round(float(score), 4)
        results.append(item)
        if len(results) >= req.k:
            break

    return {"query": req.query, "results": results}
