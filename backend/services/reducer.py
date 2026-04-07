import numpy as np
import umap

EMBEDDINGS_PATH = "data/embeddings.npy"
COORDS_2D_PATH = "data/coords_2d.npy"
COORDS_3D_PATH = "data/coords_3d.npy"


def reduce(n_components: int) -> np.ndarray:
    embeddings = np.load(EMBEDDINGS_PATH).astype(np.float32)

    reducer = umap.UMAP(
        n_components=n_components,
        n_neighbors=25,
        min_dist=0.4,
        spread=1.5,
        metric="cosine",
        random_state=42,
    )

    coords = reducer.fit_transform(embeddings)

    path = COORDS_2D_PATH if n_components == 2 else COORDS_3D_PATH
    np.save(path, coords)

    return coords
