"""
Builds demo data from titles.csv and saves to data/demo/.
Run from the backend/ directory: python seed_demo.py
"""
import os, sys, numpy as np, pandas as pd
sys.stdout.reconfigure(encoding="utf-8")

DEMO_DIR = "data/demo"
os.makedirs(DEMO_DIR, exist_ok=True)

print("Loading titles.csv...")
df = pd.read_csv("../data/titles.csv", on_bad_lines="skip", encoding="utf-8-sig")
df = df.rename(columns={"title": "Name"})
df = df.dropna(subset=["Name", "description"])
df = df[df["description"].str.strip() != ""].reset_index(drop=True)
print(f"Using {len(df)} titles. Sample: {df['Name'].head().tolist()}")

# Embed
print("Embedding descriptions...")
from services.embedder import embed_texts
embeddings = embed_texts(df["description"].tolist())
np.save(f"{DEMO_DIR}/embeddings.npy", embeddings)
print(f"Embeddings done: {embeddings.shape}")

# Metadata — exclude description to keep lean, sanitise NaN
import math
records = []
for row in df.drop(columns=["description"]).to_dict(orient="records"):
    clean = {}
    for k, v in row.items():
        if isinstance(v, float) and math.isnan(v):
            clean[k] = None
        else:
            clean[k] = v
    records.append(clean)
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

print(f"\nDone! Demo data saved to {DEMO_DIR}/")
print(f"Files: {os.listdir(DEMO_DIR)}")
