# embeddedcosine — [embeddedcosine.com](https://embeddedcosine.com)

embeddedcosine turns any structured dataset into a navigable semantic map. Similar things cluster together. You search by meaning, not keywords.

It is a personal project built because I wanted to actually see what embedding models do to data, and thought others might too. Free to use at [embeddedcosine.com](https://embeddedcosine.com).

---

## How it works

1. Upload a CSV or JSON dataset
2. Pick a display name column and one or more columns to embed
3. The AI model reads each row and converts it into a vector that captures its meaning
4. FAISS builds a cosine similarity index and UMAP projects everything into 2D and 3D space
5. Pan, zoom, fly through the point cloud, search by concept, click any point for details

Steps 3 and 4 are where the name comes from. **embedded** + **cosine** = embeddedcosine.

---

## Stack

| Layer | Tech |
|-------|------|
| Embeddings | all-MiniLM-L6-v2 via sentence-transformers, 384-dimensional vectors |
| Vector index | FAISS IndexFlatIP, cosine similarity search |
| Dimensionality reduction | UMAP, projects down to 2D and 3D for visualisation |
| Backend | FastAPI + Python, streaming pipeline via SSE, JWT auth via Supabase |
| Frontend | React + Three.js, interactive 2D/3D point cloud renderer |

---

## Branches

### main
The hosted version at embeddedcosine.com. Requires an account, has a 25 MB file size limit, and runs on a shared server.

### local
A stripped down version made specifically to run on your own machine. No account, no file size limit, no rate limits. Everything runs on your CPU and is typically 4-10x faster than the hosted version depending on your specs.

To use it:

```bash
git clone -b local https://github.com/mahiraskari/embeddedcosine.git
cd embeddedcosine
```

Then follow the README in that branch for the full setup instructions.

---

## Support

If you find it useful or just think it is cool, consider supporting it at [embeddedcosine.com/support](https://embeddedcosine.com/support).
