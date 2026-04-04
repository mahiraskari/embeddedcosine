from fastapi import APIRouter, HTTPException
from services.loader import load_games

router = APIRouter(prefix="/dataset", tags=["dataset"])


@router.get("/preview")
def preview():
    try:
        df = load_games()
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Dataset not found in data/games.json")

    return {
        "total_rows": len(df),
        "columns": list(df.columns),
        "preview": df.head(10).to_dict(orient="records"),
    }
