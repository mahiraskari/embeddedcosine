import os
import numpy as np
from fastapi import APIRouter
from services.loader import load_games
from services.embedder import embed_texts
from services.indexer import build_index
from services.reducer import reduce

router = APIRouter(prefix="/embeddings", tags=["embeddings"])

EMBEDDINGS_PATH = "data/embeddings.npy"
METADATA_PATH = "data/metadata.npy"


@router.post("/generate")
def generate():
    df = load_games()

    descriptions = df["description"].tolist()

    # embed_texts returns a numpy array of shape (6382, 384)
    embeddings = embed_texts(descriptions)

    # Save embeddings to disk so we don't re-run this on every server restart
    np.save(EMBEDDINGS_PATH, embeddings)

    # Save the metadata (everything except description) so we know which row is which game
    metadata = df.drop(columns=["description"]).to_dict(orient="records")
    np.save(METADATA_PATH, metadata)

    return {
        "status": "done",
        "games_embedded": len(descriptions),
        "embedding_shape": list(embeddings.shape),
    }


@router.post("/build-index")
def build_faiss_index():
    if not os.path.exists(EMBEDDINGS_PATH):
        return {"status": "error", "detail": "Run /embeddings/generate first"}

    index = build_index()
    return {"status": "done", "vectors_indexed": index.ntotal}


@router.post("/reduce")
def run_reduction():
    if not os.path.exists(EMBEDDINGS_PATH):
        return {"status": "error", "detail": "Run /embeddings/generate first"}

    coords_2d = reduce(n_components=2)
    coords_3d = reduce(n_components=3)

    return {
        "status": "done",
        "shape_2d": list(coords_2d.shape),
        "shape_3d": list(coords_3d.shape),
    }


@router.get("/status")
def status():
    exists = os.path.exists(EMBEDDINGS_PATH)
    if not exists:
        return {"status": "not generated"}

    embeddings = np.load(EMBEDDINGS_PATH)
    return {
        "status": "ready",
        "shape": list(embeddings.shape),
    }
