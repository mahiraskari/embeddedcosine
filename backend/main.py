from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import dataset, demo, embeddings, map, projects, search

app = FastAPI(
    title="embeddedcosine",
    description="Turn structured data into a navigable semantic map.",
    version="0.1.0",
)

# Allow the React frontend (port 5173) to talk to this backend (port 8000).
# Browsers block cross-origin requests by default — this lifts that restriction in dev.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dataset.router)
app.include_router(demo.router)
app.include_router(embeddings.router)
app.include_router(map.router)
app.include_router(projects.router)
app.include_router(search.router)


@app.get("/")
def root():
    return {"status": "ok", "message": "embeddedcosine backend running"}
