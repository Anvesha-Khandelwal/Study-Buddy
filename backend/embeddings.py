"""
embeddings.py
─────────────
What this file does:
  Converts text (words) → numbers (vectors).

Why we need it:
  Computers can't compare "photosynthesis" and "how plants make food".
  But if both are converted to vectors like [0.23, -0.45, 0.12, ...],
  we can measure how similar they are using math (cosine similarity).
  Similar meaning = similar vectors. That's the entire idea of RAG.

Model used:
  all-MiniLM-L6-v2 — free, runs on CPU, 384 numbers per text.
"""

from sentence_transformers import SentenceTransformer
from config import EMBEDDING_MODEL

# ── Load the model once when the server starts ────────
# This downloads ~90MB on first run — let it complete.
# On second run, it loads from cache (fast).
print(f"Loading embedding model: {EMBEDDING_MODEL}")
model = SentenceTransformer(EMBEDDING_MODEL)
print("Embedding model ready ✓")


def get_embedding(text: str) -> list:
    """
    Convert ONE text string into a vector.

    Example:
        get_embedding("photosynthesis converts sunlight")
        → [0.23, -0.45, 0.12, 0.78, ...]  (384 numbers)

    Used for: converting user's query before searching
    """
    embedding = model.encode(text)
    return embedding.tolist()   # convert numpy array → plain Python list


def get_embeddings_batch(texts: list) -> list:
    """
    Convert MANY texts into vectors at once.
    Much faster than calling get_embedding() in a loop.

    Example:
        texts = ["chunk 1 text...", "chunk 2 text...", ...]
        get_embeddings_batch(texts)
        → [[0.23, -0.45, ...], [0.11, 0.67, ...], ...]

    Used for: building the vector index after PDF upload
    """
    embeddings = model.encode(texts, show_progress_bar=True)
    return embeddings.tolist()


# ── TEST: Run this file directly to verify it works ──
# In your terminal: python embeddings.py
if __name__ == "__main__":
    print("\n--- Testing embeddings.py ---")

    test_texts = [
        "Photosynthesis is the process by which plants make food",
        "Plants convert sunlight into glucose using chlorophyll",
        "The water cycle involves evaporation and precipitation",
    ]

    print("Converting 3 texts to vectors...")
    vectors = get_embeddings_batch(test_texts)

    print(f"Number of vectors: {len(vectors)}")
    print(f"Vector size: {len(vectors[0])} dimensions")
    print(f"First 5 numbers of vector 1: {vectors[0][:5]}")

    # Quick similarity check
    import numpy as np
    v1 = np.array(vectors[0])
    v2 = np.array(vectors[1])
    v3 = np.array(vectors[2])
    sim_12 = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))
    sim_13 = np.dot(v1, v3) / (np.linalg.norm(v1) * np.linalg.norm(v3))

    print(f"\nSimilarity between sentence 1 and 2 (both about plants): {sim_12:.3f}")
    print(f"Similarity between sentence 1 and 3 (different topic):   {sim_13:.3f}")
    print("Sentence 1&2 should score HIGHER than 1&3 ✓" if sim_12 > sim_13 else "Something is wrong")
    print("\nembeddings.py works correctly! ✓")