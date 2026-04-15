import numpy as np
import umap

EMBEDDINGS_PATH = "data/embeddings.npy"
COORDS_2D_PATH = "data/coords_2d.npy"
COORDS_3D_PATH = "data/coords_3d.npy"


def reduce(n_components: int, data_dir: str = "data") -> np.ndarray:
    embeddings = np.load(f"{data_dir}/embeddings.npy").astype(np.float32)

    # UMAP projects high-dimensional embeddings down to 2D or 3D for visualisation.
    # n_neighbors controls how local vs global the structure is — 25 is a good middle ground.
    # min_dist controls how tightly clusters pack — lower = tighter clusters, position tracks similarity better.
    # cosine metric matches the similarity measure used in the FAISS index.
    # random_state=42 makes layouts reproducible across rebuilds.
    reducer = umap.UMAP(
        n_components=n_components,
        n_neighbors=25,
        min_dist=0.05,
        metric="cosine",
        random_state=42,
    )

    coords = reducer.fit_transform(embeddings)

    path = f"{data_dir}/coords_{n_components}d.npy"
    np.save(path, coords)

    return coords
