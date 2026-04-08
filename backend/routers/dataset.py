import os
import json
import math
import shutil
import uuid
import numpy as np
import pandas as pd
from datetime import datetime
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from services.embedder import embed_texts, model as embedder_model
from services.indexer import build_index
from services.reducer import reduce

router = APIRouter(prefix="/dataset", tags=["dataset"])

UPLOAD_PATH  = "data/uploaded_file"
CONFIG_PATH  = "data/config.json"
PROJECTS_DIR = "data/projects"


def _sanitize_val(v):
    # np.generic covers numpy scalars (int64, float32, etc.) — not JSON-serialisable as-is
    if isinstance(v, np.generic):
        v = v.item()
    try:
        if pd.isna(v):
            return None
    except (TypeError, ValueError):
        # pd.isna raises on multi-element arrays — swallow it
        pass
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    return v


def _sanitize_record(record: dict) -> dict:
    return {k: _sanitize_val(v) for k, v in record.items()}


def _load_raw(path: str) -> pd.DataFrame:
    if path.endswith(".csv"):
        # utf-8-sig strips the BOM Excel sometimes adds
        df = pd.read_csv(path, on_bad_lines="skip", encoding="utf-8-sig")
    else:
        try:
            df = pd.read_json(path, orient="records")
        except Exception:
            # Fall back to object-keyed JSON (e.g. {"0": {...}, "1": {...}})
            df = pd.read_json(path, orient="index")
            df = df.reset_index()
    # Ensure all column names are plain strings — some JSON sources use integers
    df.columns = [str(c) for c in df.columns]
    return df


def _find_uploaded() -> str | None:
    for ext in ("csv", "json"):
        p = f"{UPLOAD_PATH}.{ext}"
        if os.path.exists(p):
            return p
    return None


@router.post("/upload")
async def upload_dataset(file: UploadFile = File(...)):
    ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext not in ("csv", "json"):
        raise HTTPException(status_code=400, detail="Only CSV or JSON files are supported")

    os.makedirs("data", exist_ok=True)

    # Clear any previously uploaded file so stale data doesn't mix with the new one
    for old_ext in ("csv", "json"):
        old = f"{UPLOAD_PATH}.{old_ext}"
        if os.path.exists(old):
            os.remove(old)

    save_path = f"{UPLOAD_PATH}.{ext}"
    with open(save_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    df = _load_raw(save_path)

    return {
        "filename": file.filename,
        "total_rows": len(df),
        "columns": [str(c) for c in df.columns],
        "preview": df.head(5).fillna("").to_dict(orient="records"),
    }


class ConfigRequest(BaseModel):
    name_col: str
    embed_cols: list[str]
    project_name: str = "Untitled"


@router.post("/configure")
def configure_dataset(req: ConfigRequest):
    path = _find_uploaded()
    if not path:
        raise HTTPException(status_code=404, detail="Upload a file first")

    df = _load_raw(path)
    cols = [str(c) for c in df.columns]
    if req.name_col not in cols:
        raise HTTPException(status_code=400, detail=f"Column '{req.name_col}' not found")
    for ec in req.embed_cols:
        if ec not in cols:
            raise HTTPException(status_code=400, detail=f"Column '{ec}' not found")
    if not req.embed_cols:
        raise HTTPException(status_code=400, detail="Select at least one column to embed")

    # Enforce project cap
    MAX_PROJECTS = 10
    if os.path.exists(PROJECTS_DIR):
        existing = [d for d in os.listdir(PROJECTS_DIR) if os.path.isdir(f"{PROJECTS_DIR}/{d}")]
        if len(existing) >= MAX_PROJECTS:
            raise HTTPException(status_code=400, detail=f"Project limit reached ({MAX_PROJECTS} max). Delete a project to create a new one.")

    # Create a new project slot
    pid = str(uuid.uuid4())[:8]
    project_dir = f"{PROJECTS_DIR}/{pid}"
    os.makedirs(project_dir, exist_ok=True)

    # Resolve embed_cols — if name_col was selected, it becomes "Name" in the data
    resolved_embed_cols = [("Name" if c == req.name_col else c) for c in req.embed_cols]

    meta = {
        "name": req.project_name.strip() or "Untitled",
        "created_at": datetime.utcnow().isoformat(),
        "point_count": 0,
        "embed_cols": resolved_embed_cols,
    }
    with open(f"{project_dir}/meta.json", "w") as f:
        json.dump(meta, f)

    config = {
        "file_path":  path,
        "name_col":   req.name_col,
        "embed_cols": req.embed_cols,
        "columns":    cols,
        "project_id": pid,
    }
    with open(CONFIG_PATH, "w") as f:
        json.dump(config, f)

    return {"status": "configured", "project_id": pid, **config}


@router.get("/pipeline/stream")
def run_pipeline_stream():
    """SSE endpoint — streams real progress while running the pipeline."""

    def generate():
        import json as _json

        def event(stage, pct, label, **extra):
            return f"data: {_json.dumps({'stage': stage, 'pct': pct, 'label': label, **extra})}\n\n"

        if not os.path.exists(CONFIG_PATH):
            yield event("error", 0, "Configure dataset first")
            return

        yield event("loading", 1, "Loading dataset…")

        with open(CONFIG_PATH) as f:
            config = _json.load(f)

        if "project_id" not in config:
            yield event("error", 0, "Please re-configure your dataset before building")
            return

        pid = config["project_id"]
        project_dir = f"{PROJECTS_DIR}/{pid}"
        os.makedirs(project_dir, exist_ok=True)

        df = _load_raw(config["file_path"])
        df = df.dropna(subset=[config["name_col"]])
        df = df.rename(columns={config["name_col"]: "Name"})

        embed_cols = [("Name" if c == config["name_col"] else c) for c in config["embed_cols"]]

        def build_text(row):
            parts = []
            for col in embed_cols:
                val = row.get(col, "")
                if val is not None and str(val).strip() and str(val) != "nan":
                    parts.append(str(val))
            return " | ".join(parts)

        df["__embed_text__"] = df.apply(build_text, axis=1)
        df = df[df["__embed_text__"].str.strip() != ""].reset_index(drop=True)
        n_rows = len(df)

        yield event("loading", 3, f"Loaded {n_rows:,} rows…")

        texts = df["__embed_text__"].tolist()
        # Batch manually so we can yield progress events between batches
        batch_size = 32
        batches = [texts[i:i + batch_size] for i in range(0, len(texts), batch_size)]
        n_batches = len(batches)
        all_embeddings = []

        for i, batch in enumerate(batches):
            batch_emb = embedder_model.encode(batch, show_progress_bar=False)
            all_embeddings.append(batch_emb)
            # Map batch progress into the 3–75% band, leaving room for later stages
            pct = 3 + int((i + 1) / n_batches * 72)
            yield event("embedding", pct, f"Analysing {i + 1} / {n_batches}…")

        embeddings = np.vstack(all_embeddings)
        np.save(f"{project_dir}/embeddings.npy", embeddings)

        raw_meta = df.drop(columns=["__embed_text__"]).to_dict(orient="records")
        metadata = [_sanitize_record(r) for r in raw_meta]
        np.save(f"{project_dir}/metadata.npy", metadata)

        yield event("indexing", 77, "Building search index…")
        build_index(data_dir=project_dir)

        yield event("umap2d", 80, "Calculating map layout…")
        reduce(n_components=2, data_dir=project_dir)

        yield event("umap3d", 90, "Finalising 3D layout…")
        reduce(n_components=3, data_dir=project_dir)

        # Update project meta with final point count and resolved embed cols
        meta_path = f"{project_dir}/meta.json"
        if os.path.exists(meta_path):
            with open(meta_path) as f:
                meta = _json.load(f)
            meta["point_count"] = n_rows
            meta["embed_cols"] = embed_cols  # already resolved (name_col → "Name")
            with open(meta_path, "w") as f:
                _json.dump(meta, f)

        yield event("done", 100, "Done!", project_id=pid)

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        # X-Accel-Buffering: no tells nginx not to buffer SSE — without this
        # events arrive in one big batch at the end rather than incrementally.
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/status")
def dataset_status():
    has_config = os.path.exists(CONFIG_PATH)
    config = {}
    if has_config:
        with open(CONFIG_PATH) as f:
            config = json.load(f)
    return {"has_config": has_config, "config": config}
