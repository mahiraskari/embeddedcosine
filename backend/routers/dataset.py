import os
import re
import json
import math
import uuid
import numpy as np
import pandas as pd
from datetime import datetime
from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from services.embedder import embed_texts, model as embedder_model
from services.indexer import build_index
from services.reducer import reduce
from auth import get_user_id, get_user_id_from_token_param

router = APIRouter(prefix="/dataset", tags=["dataset"])

PROJECTS_DIR     = "data/projects"
CONFIG_PATH      = "data/config.json"
MAX_UPLOAD_BYTES = 25 * 1024 * 1024  # 25 MB hard limit

# Regex to detect media URLs — anchored before an optional query string
_IMAGE_RE = re.compile(r'https?://.+\.(png|jpg|jpeg|gif|webp|svg)(\?.*)?$', re.IGNORECASE)
_AUDIO_RE = re.compile(r'https?://.+\.(mp3|wav|ogg|m4a|flac)(\?.*)?$', re.IGNORECASE)
_VIDEO_RE = re.compile(r'https?://.+\.(mp4|webm|mov|avi|mkv)(\?.*)?$', re.IGNORECASE)


def _detect_media_cols(df: pd.DataFrame) -> dict:
    """Return {col: 'image'|'audio'|'video'} for columns whose values look like media URLs."""
    media = {}
    for col in df.columns:
        sample = df[col].dropna().head(20).astype(str).tolist()
        hits = {"image": 0, "audio": 0, "video": 0}
        for val in sample:
            val = val.strip()
            if _IMAGE_RE.match(val):
                hits["image"] += 1
            elif _AUDIO_RE.match(val):
                hits["audio"] += 1
            elif _VIDEO_RE.match(val):
                hits["video"] += 1
        # Call it a media column if at least half the sampled values match
        threshold = max(1, len(sample) // 2)
        for kind, count in hits.items():
            if count >= threshold:
                media[col] = kind
                break
    return media


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


def _sanitize_record(record: dict) -> dict:
    return {k: _sanitize_val(v) for k, v in record.items()}


def _load_raw(path: str) -> pd.DataFrame:
    if path.endswith(".csv"):
        df = pd.read_csv(path, on_bad_lines="skip", encoding="utf-8-sig")
    else:
        try:
            df = pd.read_json(path, orient="records")
        except Exception:
            df = pd.read_json(path, orient="index")
            df = df.reset_index()
    df.columns = [str(c) for c in df.columns]
    return df


def _upload_path(user_id: str) -> str:
    return f"data/uploads/{user_id}"


def _find_uploaded(user_id: str) -> str | None:
    base = _upload_path(user_id)
    for ext in ("csv", "json"):
        p = f"{base}.{ext}"
        if os.path.exists(p):
            return p
    return None


@router.post("/upload")
async def upload_dataset(file: UploadFile = File(...), user_id: str = Depends(get_user_id)):
    ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext not in ("csv", "json"):
        raise HTTPException(status_code=400, detail="Only CSV or JSON files are supported")

    os.makedirs("data/uploads", exist_ok=True)

    base = _upload_path(user_id)
    for old_ext in ("csv", "json"):
        old = f"{base}.{old_ext}"
        if os.path.exists(old):
            os.remove(old)

    save_path = f"{base}.{ext}"
    written = 0
    with open(save_path, "wb") as f:
        while chunk := await file.read(65536):
            written += len(chunk)
            if written > MAX_UPLOAD_BYTES:
                f.close()
                os.remove(save_path)
                raise HTTPException(status_code=413, detail="File too large (25 MB max)")
            f.write(chunk)

    if save_path.endswith(".csv"):
        # Try UTF-8 first, fall back to latin-1 which accepts any byte sequence
        for enc in ("utf-8-sig", "latin-1"):
            try:
                preview_df = pd.read_csv(save_path, nrows=5, on_bad_lines="skip", encoding=enc)
                count_df   = pd.read_csv(save_path, on_bad_lines="skip", encoding=enc)
                break
            except UnicodeDecodeError:
                continue
        else:
            raise HTTPException(status_code=400, detail="Could not decode file — try saving it as UTF-8")

        total_rows = len(count_df)
    else:
        preview_df = _load_raw(save_path)
        total_rows = len(preview_df)

    preview_df.columns = [str(c) for c in preview_df.columns]
    media_cols = _detect_media_cols(preview_df)

    return {
        "filename": file.filename,
        "total_rows": max(total_rows, 0),
        "columns": [str(c) for c in preview_df.columns],
        "preview": preview_df.head(5).fillna("").to_dict(orient="records"),
        "media_cols": media_cols,
    }


class ConfigRequest(BaseModel):
    name_col: str
    embed_cols: list[str]
    project_name: str = "Untitled"


@router.post("/configure")
def configure_dataset(req: ConfigRequest, user_id: str = Depends(get_user_id)):
    path = _find_uploaded(user_id)
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

    user_dir = f"{PROJECTS_DIR}/{user_id}"
    if os.path.exists(user_dir):
        built = [d for d in os.listdir(user_dir)
                 if os.path.isdir(f"{user_dir}/{d}")
                 and os.path.exists(f"{user_dir}/{d}/coords_2d.npy")]
        if len(built) >= 4:
            raise HTTPException(status_code=400, detail="Project limit reached (4 max). Delete a project to create a new one.")

    pid = str(uuid.uuid4())[:8]
    project_dir = f"{user_dir}/{pid}"
    os.makedirs(project_dir, exist_ok=True)

    resolved_embed_cols = [("Name" if c == req.name_col else c) for c in req.embed_cols]

    meta = {
        "name": req.project_name.strip() or "Untitled",
        "created_at": datetime.utcnow().isoformat(),
        "point_count": 0,
        "embed_cols": resolved_embed_cols,
    }
    with open(f"{project_dir}/meta.json", "w") as f:
        json.dump(meta, f)

    # Store config keyed by user so concurrent users don't overwrite each other
    config = {
        "file_path":  path,
        "name_col":   req.name_col,
        "embed_cols": req.embed_cols,
        "columns":    cols,
        "project_id": pid,
        "user_id":    user_id,
    }
    config_path = f"data/config_{user_id}.json"
    with open(config_path, "w") as f:
        json.dump(config, f)

    return {"status": "configured", "project_id": pid, **config}


@router.get("/pipeline/stream")
def run_pipeline_stream(user_id: str = Depends(get_user_id_from_token_param)):
    """SSE endpoint — streams real progress while the pipeline runs."""

    def generate():
        import json as _json

        def event(stage, pct, label, **extra):
            return f"data: {_json.dumps({'stage': stage, 'pct': pct, 'label': label, **extra})}\n\n"

        config_path = f"data/config_{user_id}.json"
        if not os.path.exists(config_path):
            yield event("error", 0, "Configure dataset first")
            return

        yield event("loading", 1, "Loading dataset…")

        with open(config_path) as f:
            config = _json.load(f)

        pid = config["project_id"]
        project_dir = f"{PROJECTS_DIR}/{user_id}/{pid}"
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
        batch_size = 32
        batches = [texts[i:i + batch_size] for i in range(0, len(texts), batch_size)]
        n_batches = len(batches)
        all_embeddings = []

        for i, batch in enumerate(batches):
            batch_emb = embedder_model.encode(batch, show_progress_bar=False)
            all_embeddings.append(batch_emb)
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

        meta_path = f"{project_dir}/meta.json"
        if os.path.exists(meta_path):
            with open(meta_path) as f:
                meta = _json.load(f)
            meta["point_count"] = n_rows
            meta["embed_cols"] = embed_cols
            with open(meta_path, "w") as f:
                _json.dump(meta, f)

        yield event("done", 100, "Done!", project_id=pid)

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/status")
def dataset_status(user_id: str = Depends(get_user_id)):
    config_path = f"data/config_{user_id}.json"
    has_config = os.path.exists(config_path)
    config = {}
    if has_config:
        with open(config_path) as f:
            config = json.load(f)
    return {"has_config": has_config, "config": config}
