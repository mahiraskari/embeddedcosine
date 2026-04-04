# embeddedcosine

Turn structured data into a navigable semantic map.

Upload a dataset. Explore it by meaning, not by rows.

## What it does

- Upload a CSV (games, films, anime, papers — anything with text)
- Select which rows you want to embed
- Generate vector embeddings locally (no API key needed)
- Explore an interactive 2D map — zoom, pan, click
- Click any item to see its top 5 most similar neighbours
- Search semantically — your query becomes a point on the map
- Compare cosine similarity, dot product, and Euclidean distance

## Stack

| Layer | Tech |
|-------|------|
| Backend | FastAPI (Python) |
| Data | pandas + NumPy |
| Embeddings | sentence-transformers (local, no API key) |
| Vector search | FAISS |
| Dimensionality reduction | UMAP |
| Frontend | React + Plotly |

## Setup

See step-by-step setup instructions below as the project develops.

## Status

Work in progress — building step by step.
