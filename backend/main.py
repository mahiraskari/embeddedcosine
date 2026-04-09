import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import dataset, demo, map, projects, search

app = FastAPI(
    title="embeddedcosine",
    description="Turn structured data into a navigable semantic map.",
    version="0.1.0",
)

# Allow the React frontend (port 5173) to talk to this backend (port 8000).
# Browsers block cross-origin requests by default — this lifts that restriction in dev.
ALLOWED_ORIGINS = os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(dataset.router)
app.include_router(demo.router)
app.include_router(map.router)
app.include_router(projects.router)
app.include_router(search.router)


@app.get("/")
def root():
    return {"status": "ok", "message": "embeddedcosine backend running"}
