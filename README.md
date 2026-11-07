# embeddedcosine (local)

**Find anything in your data just by describing it**, running entirely on your own machine.

embeddedcosine turns any spreadsheet (CSV or JSON) into a map you can search by meaning. Every row becomes a
point, similar rows end up next to each other, and you search by typing what you are looking for in your own
words, even when the data uses different ones.

This is the **local** version. It is the same app as [embeddedcosine.com](https://embeddedcosine.com), with:

- **No account or sign-in**, and no Supabase or `.env` setup
- **No file size limit, no row limit, no limit on how many datasets you keep**
- **No rate limits**
- **Everything stays on your computer.** Your datasets are saved in `backend/data/projects/`
- Usually **4–10x faster** than the hosted version, depending on your CPU

---

## What you need

- [Python 3.12](https://www.python.org/downloads/) (3.10 or newer works)
- [Node.js 20](https://nodejs.org/) or newer
- About 2 GB of free disk space and 4 GB of RAM

## Setup

### 1. Download it

```bash
git clone -b local https://github.com/mahiraskari/embeddedcosine.git
cd embeddedcosine
```

### 2. Start the backend (terminal 1)

```bash
cd backend
python -m venv venv
```

Activate it:

- **Windows:** `.\venv\Scripts\Activate.ps1`
- **macOS / Linux:** `source venv/bin/activate`

Then install and run:

```bash
pip install -r requirements.txt
uvicorn main:app --reload
```

The first start downloads the embedding model (about 90 MB, once). Leave this terminal running.

> No graphics card? On Linux you can install the much smaller CPU-only build of PyTorch first:
> `pip install torch==2.15.0 --index-url https://download.pytorch.org/whl/cpu`

### 3. Start the frontend (terminal 2)

```bash
cd frontend
npm install
npm run dev
```

### 4. Open it

Go to **http://localhost:5173**. The demo map loads on the home page. Click **my datasets** to map your own data.

---

## Using it

1. Click **my datasets**, then **new dataset**, and upload a CSV or JSON file of any size.
2. Pick the column to show as each point's name.
3. Pick one or more columns to embed: the text the model reads to understand each row.
4. Click **build map** and wait. Speed depends on your CPU and the number of rows.
5. Explore: pan, zoom, switch between 2D and 3D, search by meaning, click a point for its details, and click a second one to compare.

Good places to find datasets: [Kaggle](https://www.kaggle.com/datasets).

**Tip:** for long text columns, sentence search gives sharper results. To add it to a dataset you already built:

```bash
cd backend
python build_chunks.py data/projects/local_user/<dataset-id>
```

## Troubleshooting

- **"Can't reach the backend"**: the backend isn't running. Start it with `uvicorn main:app --reload` in `backend/`.
- **`python` not found on Windows**: use `py` instead (for example `py -m venv venv`).
- **Activate.ps1 is blocked on Windows**: run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once.
- **Building a big dataset is slow**: that's the embedding step on your CPU. It only runs once per dataset.

---

## Project layout

```
backend/    FastAPI app: upload, build pipeline (embeddings, FAISS, UMAP), search, maps
frontend/   React + Vite app
```

See the [main branch](https://github.com/mahiraskari/embeddedcosine) for how it works in detail and the hosted version.

## License

[MIT](LICENSE). Use it, fork it, change it, and build on it.
