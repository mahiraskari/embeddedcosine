"""
Builds demo data from drugs_side_effects_drugs_com.csv and saves to data/demo/.
Embeds drug_name + side_effects + drug_classes so drugs with similar side effects cluster together.
Run from the backend/ directory: python seed_demo.py
"""
import os, sys, math, numpy as np, pandas as pd
sys.stdout.reconfigure(encoding="utf-8")

DEMO_DIR = "data/demo"
os.makedirs(DEMO_DIR, exist_ok=True)

print("Loading drugs_side_effects_drugs_com.csv...")
df = pd.read_csv("../data/drugs_side_effects_drugs_com.csv", on_bad_lines="skip", encoding="utf-8-sig")
df = df.rename(columns={"drug_name": "Name"})
df = df.dropna(subset=["Name", "side_effects"])
df = df[df["side_effects"].str.strip() != ""].reset_index(drop=True)
print(f"Using {len(df)} drugs. Sample: {df['Name'].head().tolist()}")

# Embed: side_effects only — pure side-effect clustering
texts = df["side_effects"].tolist()
print(f"Sample embed text: {texts[0][:120]}...")

# Embed
print("Embedding (side effects only)...")
from services.embedder import embed_texts
embeddings = embed_texts(texts)
np.save(f"{DEMO_DIR}/embeddings.npy", embeddings)
print(f"Embeddings done: {embeddings.shape}")

# Sanitise NaN, and drop verbose columns that bloat the payload without adding map value
drop_cols = ["medical_condition_description", "related_drugs"]
keep_df = df.drop(columns=[c for c in drop_cols if c in df.columns])

records = []
for row in keep_df.to_dict(orient="records"):
    clean = {}
    for k, v in row.items():
        # Convert numpy scalars and nulls to plain Python so the array is JSON-safe later
        if isinstance(v, np.generic):
            v = v.item()
        try:
            if pd.isna(v):
                clean[k] = None
                continue
        except (TypeError, ValueError):
            pass
        if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
            clean[k] = None
        else:
            clean[k] = v
    records.append(clean)
# Saved as an object array of dicts — load with allow_pickle=True
np.save(f"{DEMO_DIR}/metadata.npy", records)

# FAISS index
print("Building FAISS index...")
from services.indexer import build_index
build_index(data_dir=DEMO_DIR)

# UMAP 2D + 3D
print("Running UMAP 2D...")
from services.reducer import reduce
reduce(n_components=2, data_dir=DEMO_DIR)
print("Running UMAP 3D...")
reduce(n_components=3, data_dir=DEMO_DIR)

import json
with open(f"{DEMO_DIR}/meta.json", "w") as f:
    json.dump({"embed_cols": ["side_effects"]}, f)

print(f"\nDone! Demo data saved to {DEMO_DIR}/")
print(f"Files: {os.listdir(DEMO_DIR)}")
