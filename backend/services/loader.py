import pandas as pd

JSON_PATH = "../data/games.json"
CSV_PATH = "../data/games.csv"

CSV_COLUMNS = [
    "AppID",
    "Name",
    "About the game",
    "Genres",
    "Tags",
    "Price",
    "Positive",
    "Negative",
    "Developers",
    "Release date",
    "Header image",
]


def load_from_csv() -> pd.DataFrame:
    # on_bad_lines='skip' drops any row where the column count doesn't match
    # instead of trying to parse it wrong
    df = pd.read_csv(
        CSV_PATH,
        usecols=CSV_COLUMNS,
        encoding="utf-8-sig",
        on_bad_lines="skip",
    )

    df["AppID"] = pd.to_numeric(df["AppID"], errors="coerce")
    df = df.dropna(subset=["AppID", "About the game", "Name"])
    df = df[df["AppID"].apply(lambda x: x == int(x))]
    df["AppID"] = df["AppID"].astype(int)
    df = df[df["About the game"].str.strip() != ""]
    df = df[df["Positive"] >= 1000]
    df = df.rename(columns={"About the game": "description", "Header image": "image"})
    df = df.fillna("")

    return df


def load_from_json() -> pd.DataFrame:
    df = pd.read_json(JSON_PATH, orient="index")
    df.index.name = "AppID"
    df = df.reset_index()

    df = df[["AppID", "name", "about_the_game", "genres", "tags", "header_image",
             "release_date", "price", "positive", "negative", "developers"]]

    df = df.dropna(subset=["about_the_game", "name"])
    df = df[df["about_the_game"].str.strip() != ""]
    df = df[df["positive"] >= 1000]

    df["genres"] = df["genres"].apply(lambda x: ", ".join(x) if isinstance(x, list) else "")
    df["developers"] = df["developers"].apply(lambda x: ", ".join(x) if isinstance(x, list) else "")
    # tags is a dict of {tag: vote_count} — we just want the tag names
    df["tags"] = df["tags"].apply(lambda x: ", ".join(x.keys()) if isinstance(x, dict) else "")

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
        "tags": "Tags",
    })

    df = df.fillna("")
    return df


def load_games() -> pd.DataFrame:
    try:
        return load_from_json()
    except FileNotFoundError:
        return load_from_csv()
