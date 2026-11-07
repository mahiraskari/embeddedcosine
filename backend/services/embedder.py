from sentence_transformers import SentenceTransformer
import numpy as np

# This model is a good balance of speed and quality for sentence embeddings.
# It produces 384-dimensional vectors and runs fast on CPU.
MODEL_NAME = "all-MiniLM-L6-v2"

# Load the model once when this module is imported — not on every request.
# First run will download ~90MB from HuggingFace and cache it locally.
model = SentenceTransformer(MODEL_NAME)


def embed_texts(texts: list[str]) -> np.ndarray:
    # encode() takes a list of strings and returns a 2D numpy array
    # shape: (num_texts, 384) — one 384-dimensional vector per text
    embeddings = model.encode(texts, show_progress_bar=True)
    return embeddings
