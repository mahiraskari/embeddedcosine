"""
Chunk-level search.

The embedding model only reads the first ~256 tokens of a text, and one vector for a long
text is a blurry average of everything in it. So for search we also split every row's text
into short chunks, embed each chunk, and rank a row by its best-matching chunk.

Files written to data_dir:
    chunk_vectors.npy float16 chunk vectors (half size on disk; the FAISS index is built in memory)
    chunk_owner.npy   int32 array, chunk i belongs to row chunk_owner[i]
    chunk_text.npy    object array, the text of each chunk (shown as "why it matched")

The map itself is unchanged: it still uses one vector per row (embeddings.npy).
"""
import os
import re
import faiss
import numpy as np

# In-process cache: data_dir -> (mtime, index, owners, texts)
_CACHE: dict = {}

MAX_CHUNK_CHARS = 280   # comfortably under the model's 256-token limit

_SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+")
_CLAUSE_SPLIT   = re.compile(r"(?<=[;:])\s+")


def _pieces(text: str) -> list[str]:
    """Split text into sentence-sized pieces, breaking long sentences on ; and : then on words."""
    out = []
    for sentence in _SENTENCE_SPLIT.split(text):
        sentence = sentence.strip()
        if not sentence:
            continue
        if len(sentence) <= MAX_CHUNK_CHARS:
            out.append(sentence)
            continue
        for clause in _CLAUSE_SPLIT.split(sentence):
            clause = clause.strip()
            while len(clause) > MAX_CHUNK_CHARS:
                cut = clause.rfind(" ", 0, MAX_CHUNK_CHARS)
                cut = cut if cut > 0 else MAX_CHUNK_CHARS
                out.append(clause[:cut].strip())
                clause = clause[cut:].strip()
            if clause:
                out.append(clause)
    return out


def split_into_chunks(text: str) -> list[str]:
    """Greedily merge consecutive pieces into chunks of at most MAX_CHUNK_CHARS."""
    if not text or not str(text).strip():
        return []
    chunks, current = [], ""
    for piece in _pieces(str(text)):
        if current and len(current) + 1 + len(piece) > MAX_CHUNK_CHARS:
            chunks.append(current)
            current = piece
        else:
            current = f"{current} {piece}".strip()
    if current:
        chunks.append(current)
    return chunks


def build_chunk_index(data_dir: str, texts: list[str], embed_fn) -> int:
    """Chunk every row's text, embed the chunks, and save the chunk index. Returns the chunk count."""
    chunk_texts, owners = [], []
    for row, text in enumerate(texts):
        for chunk in split_into_chunks(text):
            chunk_texts.append(chunk)
            owners.append(row)

    if not chunk_texts:
        return 0

    vectors = np.asarray(embed_fn(chunk_texts), dtype=np.float32)
    faiss.normalize_L2(vectors)                       # dot product == cosine similarity

    np.save(f"{data_dir}/chunk_vectors.npy", vectors.astype(np.float16))
    np.save(f"{data_dir}/chunk_owner.npy", np.asarray(owners, dtype=np.int32))
    np.save(f"{data_dir}/chunk_text.npy", np.asarray(chunk_texts, dtype=object))
    _CACHE.pop(data_dir, None)
    return len(chunk_texts)


def _load(data_dir: str):
    """Load the chunk files once and keep a FAISS index in memory; reload if the files change."""
    mtime = os.path.getmtime(f"{data_dir}/chunk_vectors.npy")
    cached = _CACHE.get(data_dir)
    if cached and cached[0] == mtime:
        return cached[1:]
    vectors = np.load(f"{data_dir}/chunk_vectors.npy").astype(np.float32)
    faiss.normalize_L2(vectors)
    index = faiss.IndexFlatIP(vectors.shape[1])
    index.add(vectors)
    owners = np.load(f"{data_dir}/chunk_owner.npy")
    texts  = np.load(f"{data_dir}/chunk_text.npy", allow_pickle=True)
    _CACHE[data_dir] = (mtime, index, owners, texts)
    return index, owners, texts


def search_chunks(data_dir: str, query_vector: np.ndarray, k: int):
    """
    Rank rows by their best-matching chunk.
    Returns a list of (row_index, score, chunk_text), best first, at most k rows.
    """
    index, owners, texts = _load(data_dir)

    query = np.asarray(query_vector, dtype=np.float32).reshape(1, -1)
    faiss.normalize_L2(query)

    # Pull plenty of chunks so that, after keeping only each row's best one, k rows remain.
    n = min(index.ntotal, max(k * 40, 1000))
    scores, idxs = index.search(query, n)

    seen, results = set(), []
    for score, ci in zip(scores[0], idxs[0]):
        if ci < 0:
            continue
        row = int(owners[ci])
        if row in seen:
            continue                                   # FAISS returns best first, so the first hit is the row's best chunk
        seen.add(row)
        results.append((row, float(score), str(texts[ci])))
        if len(results) >= k:
            break
    return results


def has_chunk_index(data_dir: str) -> bool:
    return all(os.path.exists(f"{data_dir}/{f}") for f in ("chunk_vectors.npy", "chunk_owner.npy", "chunk_text.npy"))
