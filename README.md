# embeddedcosine (local)

Turn any CSV or JSON dataset into a navigable semantic map. Similar things cluster together. You search by meaning, not keywords.

This is the local branch. No account needed, no file size limit, runs entirely on your machine.

---

## What you need

- Python 3.10 or newer
- Node.js 18 or newer

---

## Setup

### 1. Clone the repo

```bash
git clone -b local https://github.com/mahiraskari/embeddedcosine.git
cd embeddedcosine
```

### 2. Start the backend

Open a terminal in the project folder and run:

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

The first time you run this it will download the sentence-transformer model (around 90 MB). This only happens once.

Leave this terminal running.

### 3. Start the frontend

Open a second terminal in the project folder and run:

```bash
cd frontend
npm install
npm run dev
```

### 4. Open the app

Go to http://localhost:5173 in your browser.

Click "My datasets" in the navbar, then "New dataset" to upload a file.

---

## Using it

1. Upload a CSV or JSON file. Any size works.
2. Pick a display name column (the label shown on each point).
3. Pick one or more columns to embed (the content the AI reads to understand each row).
4. Click "Build map" and wait. Speed depends on your CPU and how many rows you have.
5. Once done, pan and zoom the point cloud, click any point to see details, and search by concept.

A good place to find datasets is https://kaggle.com.

---

## Notes

- All data stays on your machine. Nothing is sent anywhere.
- The backend keeps running while the map builds. You can cancel from the UI and come back later.
- If you close the backend and reopen it, your existing datasets are still there.
