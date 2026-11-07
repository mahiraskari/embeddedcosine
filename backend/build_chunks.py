"""
Build the chunk search index for an existing dataset folder, without touching its map.

Usage (from backend/, venv active):
    python build_chunks.py data/demo

Reads metadata.npy and meta.json (embed_cols) from the folder, joins the embedded columns
the same way the upload pipeline does, then writes chunk_vectors.npy / chunk_owner.npy / chunk_text.npy
(the FAISS index over the chunk vectors is built in memory at search time).
"""
import json
import sys
import time

import numpy as np

from services.chunker import build_chunk_index
from services.embedder import embed_texts

sys.stdout.reconfigure(encoding="utf-8")


def row_text(row: dict, cols: list[str]) -> str:
    parts = [str(row.get(c) or "").strip() for c in cols]
    return " | ".join(p for p in parts if p)


def main(data_dir: str) -> None:
    with open(f"{data_dir}/meta.json") as f:
        cols = json.load(f).get("embed_cols") or []
    if not cols:
        sys.exit(f"No embed_cols in {data_dir}/meta.json")

    metadata = np.load(f"{data_dir}/metadata.npy", allow_pickle=True)
    texts = [row_text(dict(m), cols) for m in metadata]
    print(f"{len(texts)} rows, embedding column(s): {', '.join(cols)}")

    start = time.time()
    n = build_chunk_index(data_dir, texts, embed_texts)
    print(f"Built {n} chunks ({n / max(len(texts), 1):.1f} per row) in {time.time() - start:.0f}s")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "data/demo")
