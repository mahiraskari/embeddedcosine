import os
import json
import shutil
import pandas as pd
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from services.embedder import embed_texts
from services.indexer import build_index
from services.reducer import reduce

router = APIRouter(prefix="/dataset", tags=["dataset"])

UPLOAD_PATH = "data/uploaded_file"
CONFIG_PATH = "data/config.json"
USER_DIR    = "data/user"


def _load_raw(path: str) -> pd.DataFrame:
    if path.endswith(".csv"):
        return pd.read_csv(path, on_bad_lines="skip", encoding="utf-8-sig")
    else:
        try:
            df = pd.read_json(path, orient="records")
        except Exception:
            df = pd.read_json(path, orient="index")
            df = df.reset_index()
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
    text_col: str


@router.post("/configure")
def configure_dataset(req: ConfigRequest):
    path = _find_uploaded()
    if not path:
        raise HTTPException(status_code=404, detail="Upload a file first")

    df = _load_raw(path)
    cols = [str(c) for c in df.columns]
    if req.name_col not in cols:
        raise HTTPException(status_code=400, detail=f"Column '{req.name_col}' not found")
    if req.text_col not in cols:
        raise HTTPException(status_code=400, detail=f"Column '{req.text_col}' not found")

    config = {
        "file_path": path,
        "name_col":  req.name_col,
        "text_col":  req.text_col,
        "columns":   cols,
    }
    with open(CONFIG_PATH, "w") as f:
        json.dump(config, f)

    return {"status": "configured", **config}


@router.post("/pipeline")
def run_pipeline():
    if not os.path.exists(CONFIG_PATH):
        raise HTTPException(status_code=400, detail="Configure the dataset first")

    with open(CONFIG_PATH) as f:
        config = json.load(f)

    df = _load_raw(config["file_path"])
    df = df.dropna(subset=[config["text_col"], config["name_col"]])
    df = df[df[config["text_col"]].astype(str).str.strip() != ""]

    df = df.rename(columns={
        config["name_col"]: "Name",
        config["text_col"]: "description",
    })

    texts = df["description"].tolist()
    embeddings = embed_texts(texts)

    import numpy as np
    os.makedirs(USER_DIR, exist_ok=True)
    np.save(f"{USER_DIR}/embeddings.npy", embeddings)

    metadata = df.drop(columns=["description"]).to_dict(orient="records")
    np.save(f"{USER_DIR}/metadata.npy", metadata)

    build_index(data_dir=USER_DIR)
    reduce(n_components=2, data_dir=USER_DIR)
    reduce(n_components=3, data_dir=USER_DIR)

    return {
        "status": "done",
        "rows_embedded": len(texts),
        "embedding_shape": list(embeddings.shape),
    }


@router.get("/status")
def dataset_status():
    has_config = os.path.exists(CONFIG_PATH)
    has_map    = os.path.exists(f"{USER_DIR}/coords_2d.npy")
    has_upload = _find_uploaded() is not None

    config = {}
    if has_config:
        with open(CONFIG_PATH) as f:
            config = json.load(f)

    return {
        "has_upload": has_upload,
        "has_config": has_config,
        "has_map":    has_map,
        "config":     config,
    }
