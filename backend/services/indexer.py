import faiss
import numpy as np

EMBEDDINGS_PATH = "data/embeddings.npy"
INDEX_PATH = "data/index.faiss"


def build_index() -> faiss.Index:
    embeddings = np.load(EMBEDDINGS_PATH)

    # FAISS requires float32 — our embeddings might be float64
    embeddings = embeddings.astype(np.float32)

    # IndexFlatIP = flat index using inner product (dot product)
    # Since our vectors are normalised (length = 1), dot product == cosine similarity
    dimension = embeddings.shape[1]  # 384
    index = faiss.IndexFlatIP(dimension)

    # Add all vectors to the index
    index.add(embeddings)

    # Save to disk
    faiss.write_index(index, INDEX_PATH)

    return index


def load_index() -> faiss.Index:
    return faiss.read_index(INDEX_PATH)


def search(index: faiss.Index, query_vector: np.ndarray, k: int = 5): # returns top k scores and indices
    # query_vector needs to be 2D: shape (1, 384)
    query = query_vector.astype(np.float32).reshape(1, -1)

    # search returns two arrays: similarity scores and row indices
    scores, indices = index.search(query, k)

    return scores[0].tolist(), indices[0].tolist()
