# embeddedcosine

**Find anything in your data just by describing it.** [embeddedcosine.com](https://embeddedcosine.com)

embeddedcosine turns any spreadsheet (CSV or JSON) into a map you can search by meaning. Every row becomes a
point, similar rows end up next to each other, and you search by typing what you are looking for in your own
words, even when the data uses different ones.

It started as a personal project to actually see what embedding models do to data. It is free to use and open source.

---

## How it works

1. Upload a CSV or JSON file
2. Pick a display-name column and one or more columns to embed
3. An embedding model turns each row into a vector of numbers that captures its meaning
4. FAISS builds a cosine-similarity index, and UMAP projects everything into 2D and 3D
5. Pan, zoom, and fly through the map, search by concept, and click points to see details or compare two

Steps 3 and 4 are where the name comes from: **embedded** + **cosine** = embeddedcosine.

**Search by sentence.** Long text is also split into sentence-sized chunks. A search is compared with every chunk,
and each row is ranked by its closest one, which is shown in the results so you can see why it matched. This keeps
long texts from being cut off by the model and makes short searches much sharper. Datasets without chunks fall
back to whole-row search.

## Stack

| Layer | Tech |
|-------|------|
| Embeddings | all-MiniLM-L6-v2 via sentence-transformers, 384-dimensional vectors |
| Vector index | FAISS (flat inner-product index, exact cosine similarity) |
| Dimensionality reduction | UMAP, 2D and 3D |
| Backend | FastAPI + Python, streaming build pipeline over SSE, JWT auth via Supabase |
| Frontend | React + Vite, Plotly (2D) and Three.js (3D) |
| Hosting | Vercel (frontend), a Linux VM (backend), Supabase (accounts) |

---

## Run it locally

You need **Python 3.12**, **Node 20+**, and a free [Supabase](https://supabase.com) project for sign-in.

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate            # Windows: .\venv\Scripts\Activate.ps1
pip install -r requirements.txt     # CPU-only server? install torch from the CPU index first (see the file)
cp .env.example .env                # set SUPABASE_URL
uvicorn main:app --reload           # http://localhost:8000
```

The first start downloads the embedding model (about 90 MB).

### Frontend

```bash
cd frontend
npm install
cp .env.example .env                # set the Supabase URL + public key and VITE_API_URL
npm run dev                         # http://localhost:5173
```

### Configuration

| File | Variable | What it is |
|---|---|---|
| `backend/.env` | `SUPABASE_URL` | Your Supabase project URL (used to verify sign-ins) |
| | `FRONTEND_ORIGIN` | Sites allowed to call the API, comma-separated |
| | `TRUST_PROXY` | `1` when running behind nginx or another proxy, so rate limits see real IPs |
| `frontend/.env` | `VITE_SUPABASE_URL` | Your Supabase project URL |
| | `VITE_SUPABASE_ANON_KEY` | The **public** anon / publishable key, never the secret key |
| | `VITE_API_URL` | Where the backend runs |

Real `.env` files are ignored by git. Copy the `.env.example` files instead.

## Project layout

```
backend/
  main.py             FastAPI app, CORS, routers
  auth.py             verifies Supabase JWTs (ES256, public JWKS)
  ratelimit.py        per-IP limits for search, uploads and builds
  routers/            dataset (upload, build), projects, map, search, demo
  services/           embedder, indexer (FAISS), reducer (UMAP), chunker (sentence search)
  seed_demo.py        rebuilds the demo map
  build_chunks.py     adds sentence search to an existing dataset
  data/demo/          the demo dataset's map, index and chunks
frontend/             React app (see frontend/README.md)
```

---

## Datasets used for testing

Most of the data used while building and testing came from [Kaggle](https://www.kaggle.com/datasets), a good place
to find datasets on almost any topic. None of these files are in the repo; download them yourself to reproduce anything.

| Dataset | File | Embedded column(s) | Used for |
|---------|------|--------------------|----------|
| Drug side effects (Kaggle) | `drugs_side_effects_drugs_com.csv` | `side_effects` | The current demo map, built with `backend/seed_demo.py` |
| Movies and TV shows (Kaggle) | `titles.csv` | `description` | The earlier demo map |
| Steam games (Kaggle) | `games.json` / `games.csv` | `about_the_game`, genres and user tags | The first dataset the pipeline was built on |
| Media test file (hand-made) | `backend/data/test_media.csv` | `Description` | Testing automatic detection of image URL columns |

To rebuild the demo, place the drug side effects CSV in `data/` and run `python seed_demo.py` from `backend/`.

## Branches

**main** is the hosted version at embeddedcosine.com: accounts, a 25 MB file limit, up to 4 datasets per account,
and a shared server.

**local** is a stripped-down version for running on your own machine: no account, no file size limit, no rate
limits, and typically 4–10x faster depending on your hardware.

```bash
git clone -b local https://github.com/mahiraskari/embeddedcosine.git
```

Then follow the README on that branch.

---

## Contributing

Issues and pull requests are welcome. Found a bug or have an idea? [Open an issue](https://github.com/mahiraskari/embeddedcosine/issues/new).
For code changes, fork the repo, make your change on a branch, and open a pull request with a short description.

## Security

Please do not open a public issue for security problems. Report them privately through
[GitHub's security advisories](https://github.com/mahiraskari/embeddedcosine/security/advisories/new) instead.

## Support

If you find it useful or just think it is cool, you can support it at [embeddedcosine.com/support](https://embeddedcosine.com/support).

## License

[MIT](LICENSE). Use it, fork it, change it, and build on it.
