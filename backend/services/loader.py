import pandas as pd

DATASET_PATH = "../data/games.json"


def load_games() -> pd.DataFrame:
    # orient="index" tells pandas the outer keys are row IDs (AppIDs)
    df = pd.read_json(DATASET_PATH, orient="index")

    # The AppIDs are now the index — move them into a regular column
    df.index.name = "AppID"
    df = df.reset_index()

    # Keep only the columns we need
    df = df[["AppID", "name", "about_the_game", "genres", "header_image",
             "release_date", "price", "positive", "negative", "developers"]]

    # Drop rows with no description or name
    df = df.dropna(subset=["about_the_game", "name"])
    df = df[df["about_the_game"].str.strip() != ""]

    # Only keep games with at least 1000 positive reviews — filters out low-quality entries
    df = df[df["positive"] >= 1000]

    # genres and developers are lists — join them into comma-separated strings
    df["genres"] = df["genres"].apply(lambda x: ", ".join(x) if isinstance(x, list) else "")
    df["developers"] = df["developers"].apply(lambda x: ", ".join(x) if isinstance(x, list) else "")

    # Rename to consistent names used across the codebase
    df = df.rename(columns={
        "name": "Name",
        "about_the_game": "description",
        "header_image": "image",
        "release_date": "Release date",
        "price": "Price",
        "positive": "Positive",
        "negative": "Negative",
        "developers": "Developers",
        "genres": "Genres",
    })

    df = df.fillna("")

    return df
