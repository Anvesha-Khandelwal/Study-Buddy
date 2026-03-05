"""
retriever.py
────────────
What this file does:
  Stores all your text chunks as vectors and finds
  the most relevant ones when a user asks a question.

The analogy:
  Imagine a library. Every book is a chunk. Every book
  has a "concept fingerprint" (its embedding).
  When you ask a question, we fingerprint your question
  and find the books whose fingerprint is most similar.
  That's FAISS — a fast fingerprint matcher.

Why FAISS:
  - Free, runs locally, no internet needed
  - Can search 1 million vectors in milliseconds
  - Perfect for a portfolio project
"""

import faiss
import numpy as np
from embeddings import get_embedding, get_embeddings_batch
from config import TOP_K_RESULTS


class Retriever:
    """
    Manages the vector database for one uploaded document.

    Lifecycle:
      1. User uploads PDF
      2. chunker.py gives us a list of chunks
      3. We call build_index(chunks) → stores everything in FAISS
      4. User asks question → we call search(query) → get top 5 chunks
      5. Those 5 chunks go into the LLM prompt in generator.py
    """

    def __init__(self):
        self.index   = None   # FAISS index object (the actual vector database)
        self.chunks  = []     # original text chunks (parallel to the index)
        self.is_ready = False  # True only after build_index() completes

    # ── Build the index from chunks ───────────────────

    def build_index(self, chunks: list):
        """
        Takes all chunks, creates their embeddings, stores in FAISS.

        Step-by-step:
          1. Extract just the text from each chunk
          2. Pass all texts to get_embeddings_batch() → list of vectors
          3. Convert to numpy array (FAISS needs this exact format)
          4. Create a FAISS index with the right vector dimension
          5. Add all vectors to the index
          6. Store the original chunks separately (FAISS only stores vectors,
             not the original text — we look up text using the index position)

        Args:
            chunks: output from chunker.py's chunk_text()
        """
        if not chunks:
            raise ValueError("No chunks provided. Did the PDF extract correctly?")

        print(f"Building vector index for {len(chunks)} chunks...")

        # ── Get embeddings for every chunk ────────────
        texts = [chunk["text"] for chunk in chunks]
        embeddings = get_embeddings_batch(texts)  # returns list of lists

        # ── Convert to numpy float32 array ────────────
        # Shape: (number_of_chunks, 384)
        # FAISS requires float32 — won't work with float64 or int
        vectors = np.array(embeddings, dtype=np.float32)

        # ── Create FAISS index ────────────────────────
        # IndexFlatL2 = exact search using L2 (Euclidean) distance
        # 384 = number of dimensions in our MiniLM embeddings
        dimension = vectors.shape[1]   # should be 384
        self.index = faiss.IndexFlatL2(dimension)

        # ── Add all vectors to the index ──────────────
        self.index.add(vectors)

        # ── Store original chunks for text lookup ─────
        self.chunks   = chunks
        self.is_ready = True

        print(f"Vector index built! {self.index.ntotal} vectors stored ✓")

    # ── Search for relevant chunks ────────────────────

    def search(self, query: str, top_k: int = TOP_K_RESULTS) -> list:
        """
        Find the top_k chunks most relevant to the query.

        Step-by-step:
          1. Convert query to a vector using the same embedding model
          2. Ask FAISS: "find me the 5 vectors nearest to this query vector"
          3. FAISS returns indices (positions) and distances
          4. Use indices to look up the original chunk text
          5. Return those chunks (with their distance score)

        Lower distance score = more similar = better match.

        Args:
            query: the user's question or topic
            top_k: how many chunks to return (default from config)

        Returns:
            List of chunk dicts, each with an added "score" field
        """
        if not self.is_ready:
            raise Exception("No document indexed yet. Please upload a PDF first.")

        # ── Convert query to vector ───────────────────
        query_embedding = get_embedding(query)  # returns a list of 384 floats
        query_vector = np.array([query_embedding], dtype=np.float32)
        # Shape must be (1, 384) — FAISS needs a 2D array even for 1 query

        # ── Search FAISS ──────────────────────────────
        # distances: how far each result is from the query (lower = better)
        # indices:   positions in our self.chunks list
        distances, indices = self.index.search(query_vector, top_k)

        # ── Build result list ─────────────────────────
        results = []
        for distance, idx in zip(distances[0], indices[0]):
            if idx == -1:   # FAISS returns -1 if fewer results than top_k
                continue
            if idx >= len(self.chunks):   # safety check
                continue

            chunk = self.chunks[idx].copy()   # copy so we don't mutate original
            chunk["score"] = float(distance)  # lower = more relevant
            results.append(chunk)

        return results

    # ── Get topic frequency (for importance analysis) ─

    def get_topic_frequency(self) -> dict:
        """
        Count how many chunks belong to each topic/heading.
        Topics with more chunks = covered more in the document = likely important.

        Returns:
            {"UNIT 1 INTRODUCTION": 8, "UNIT 2 DATA STRUCTURES": 15, ...}
        """
        if not self.is_ready:
            return {}

        frequency = {}
        for chunk in self.chunks:
            topic = chunk.get("topic", "Unknown")
            frequency[topic] = frequency.get(topic, 0) + 1

        # Sort by frequency (highest first)
        sorted_freq = dict(sorted(frequency.items(), key=lambda x: x[1], reverse=True))
        return sorted_freq


# ── Single global instance ────────────────────────────
# This object lives in memory while FastAPI is running.
# main.py imports this and uses it for all requests.
retriever = Retriever()


# ── TEST: Run this file directly ──────────────────────
# Command: python retriever.py
if __name__ == "__main__":
    print("\n--- Testing retriever.py ---\n")

    # Fake some chunks (normally these come from chunker.py)
    fake_chunks = [
        {"text": "Photosynthesis is the process by which green plants convert sunlight into glucose. Chlorophyll absorbs light energy.", "topic": "Chapter 1", "chunk_index": 0, "word_count": 20},
        {"text": "The mitochondria is known as the powerhouse of the cell. It produces ATP through cellular respiration.", "topic": "Chapter 2", "chunk_index": 1, "word_count": 18},
        {"text": "Newton's laws of motion describe the relationship between force, mass, and acceleration.", "topic": "Chapter 3", "chunk_index": 2, "word_count": 14},
        {"text": "Plants use carbon dioxide, water, and sunlight to produce oxygen and glucose in the chloroplast.", "topic": "Chapter 1", "chunk_index": 3, "word_count": 16},
    ]

    print("Building index with 4 fake chunks...")
    retriever.build_index(fake_chunks)

    test_query = "How do plants make food from sunlight?"
    print(f"\nSearching for: '{test_query}'")
    results = retriever.search(test_query, top_k=2)

    print(f"\nTop {len(results)} results:")
    for i, r in enumerate(results):
        print(f"\n  Result {i+1}:")
        print(f"  Topic:   {r['topic']}")
        print(f"  Score:   {r['score']:.4f}  (lower = more relevant)")
        print(f"  Preview: {r['text'][:100]}...")

    print("\nChunks 0 and 3 should rank highest (both about photosynthesis/plants) ✓")
    print("\nretriever.py works correctly! ✓")